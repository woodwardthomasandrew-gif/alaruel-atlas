// ─────────────────────────────────────────────────────────────────────────────
// core/database — DatabaseManager implementation
// ─────────────────────────────────────────────────────────────────────────────

import type {
  IDatabaseManager,
  SchemaRegistration,
  SqlParam,
  RunResult,
  ConnectionState,
  Migration,
} from './types';
import { bootstrapMigrationsTable, runMigrations } from './migrations';
import { createLogger } from '../../logger/src/index';

export type {
  IDatabaseManager,
  SchemaRegistration,
  SqlParam,
  RunResult,
  ConnectionState,
  Migration,
};

// ── Minimal better-sqlite3 shim (typed interface only) ───────────────────────
// We type-only import better-sqlite3 so that the core package compiles without
// it being installed in every workspace. The real dependency lives in
// apps/desktop. For unit tests, provide a mock via createDatabaseManager().

interface BetterSqlite3Statement {
  run(...params: SqlParam[]): { lastInsertRowid: number | bigint; changes: number };
  all(...params: SqlParam[]): unknown[];
}

interface BetterSqlite3Database {
  exec(sql: string): void;
  prepare(sql: string): BetterSqlite3Statement;
  transaction<T>(fn: () => T): () => T;
  close(): void;
}

/** Factory function type — matches better-sqlite3's default export shape. */
export type DatabaseFactory = (path: string) => BetterSqlite3Database;

// ── Required tables ───────────────────────────────────────────────────────────
// This list is used at connect() time to verify all expected tables exist after
// migrations run. Any missing tables are logged as warnings. No tables are
// dropped or recreated — this is informational only.

const REQUIRED_TABLES = [
  'campaigns',
  'entity_registry',
  'sessions',
  'session_notes',
  'session_prep_items',
  'session_scenes',
  'session_quests',
  'session_npcs',
  'session_scene_npcs',
  'session_scene_monsters',
  'session_scene_minis',
  'npcs',
  'quests',
  'campaign_events',
];

// ── DatabaseManager ───────────────────────────────────────────────────────────

/**
 * Owns the single SQLite connection for the active campaign.
 *
 * Lifecycle:
 *  1. Call `registerSchema()` for every module during app boot.
 *  2. Call `connect(path)` to open the file and run pending migrations.
 *  3. Use `query()`, `run()`, and `transaction()` freely.
 *  4. Call `disconnect()` before the process exits.
 *
 * Every module interacts with SQLite exclusively through this class —
 * no module ever imports better-sqlite3 directly.
 *
 * @example
 * ```ts
 * // Boot
 * db.registerSchema(questsSchema);
 * db.connect('/path/to/campaign.db');
 *
 * // Read
 * const quests = db.query<Quest>('SELECT * FROM quests_entries');
 *
 * // Write (transactional)
 * db.transaction(() => {
 *   db.run('INSERT INTO quests_entries (id, title) VALUES (?, ?)', [id, title]);
 *   db.run('INSERT INTO timeline_entries (ref_id) VALUES (?)', [id]);
 * });
 *
 * // Shutdown
 * db.disconnect();
 * ```
 */
export class DatabaseManager implements IDatabaseManager {
  private db:               BetterSqlite3Database | null = null;
  private state:            ConnectionState = 'disconnected';
  private readonly schemas: SchemaRegistration[] = [];
  private readonly log     = createLogger('core:database');
  private readonly factory: DatabaseFactory;

  /**
   * @param factory - Optional custom database factory (e.g. a mock for tests).
   *                  Defaults to requiring better-sqlite3 at runtime.
   */
  constructor(factory?: DatabaseFactory) {
    this.factory = factory ?? this.requireBetterSqlite3();
  }

  // ── connect ────────────────────────────────────────────────────────────────

  /**
   * Open (or create) the SQLite file at `dbPath` and run all pending
   * migrations from registered schemas.
   *
   * Idempotent: calling connect() on an already-connected manager is a no-op
   * with a warning log.
   *
   * @param dbPath - Absolute path to the `.db` campaign file.
   */
  connect(dbPath: string): void {
    if (this.state === 'connected') {
      this.log.warn('connect() called while already connected — ignoring', { dbPath });
      return;
    }

    this.log.info('Opening database', { dbPath });

    try {
      this.db    = this.factory(dbPath);
      this.state = 'connected';
    } catch (err) {
      this.state = 'error';
      this.log.error('Failed to open database', {
        dbPath,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }

    // Enable WAL mode for better concurrent read performance.
    this.db.exec('PRAGMA journal_mode = WAL;');
    // Enforce foreign key constraints.
    this.db.exec('PRAGMA foreign_keys = ON;');

    // Bootstrap the core tables that all modules depend on.
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS campaigns (
        id          TEXT     PRIMARY KEY,
        name        TEXT     NOT NULL,
        gm_name     TEXT     NOT NULL DEFAULT '',
        system      TEXT     NOT NULL DEFAULT '',
        status      TEXT     NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active','on_hiatus','completed','archived')),
        description TEXT     NOT NULL DEFAULT '',
        created_at  TEXT     NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
        updated_at  TEXT     NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
      );
      CREATE TABLE IF NOT EXISTS entity_registry (
        id          TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
        module      TEXT NOT NULL,
        created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
        PRIMARY KEY (id, entity_type)
      );
    `);

    // Collect all migrations from all registered schemas and run them.
    const allMigrations: Migration[] = this.schemas.flatMap(s => s.migrations);

    // Validate for duplicate version numbers before running — this is the
    // most common source of missing tables and silent migration skips.
    this.checkForDuplicateMigrationVersions(allMigrations);

    bootstrapMigrationsTable(this.db as unknown as import("./migrations.js").MigrationDb);
    runMigrations(this.db as unknown as import("./migrations.js").MigrationDb, allMigrations, this.log);

    // After migrations complete, verify required tables exist and log any gaps.
    this.validateRequiredTables();

    this.log.info('Database ready', { dbPath });
  }

  // ── disconnect ─────────────────────────────────────────────────────────────

  /**
   * Flush WAL and close the database connection.
   * Call this during app shutdown to prevent data loss.
   */
  disconnect(): void {
    if (!this.db || this.state !== 'connected') return;
    this.log.info('Closing database');
    try {
      this.db.exec('PRAGMA wal_checkpoint(TRUNCATE);');
      this.db.close();
    } finally {
      this.db    = null;
      this.state = 'disconnected';
    }
  }

  // ── query ──────────────────────────────────────────────────────────────────

  /**
   * Execute a SELECT statement and return the result rows as typed objects.
   *
   * @param sql    - SQL string with `?` placeholders.
   * @param params - Values to bind in order.
   * @returns Array of rows. Empty array when no rows match.
   *
   * @throws If the database is not connected.
   */
  query<T = Record<string, unknown>>(sql: string, params: SqlParam[] = []): T[] {
    const db = this.assertConnected('query');
    this.log.debug('query', { sql });
    const stmt = db.prepare(sql);
    return stmt.all(...params) as T[];
  }

  // ── run ────────────────────────────────────────────────────────────────────

  /**
   * Execute a non-SELECT statement (INSERT, UPDATE, DELETE, DDL).
   *
   * @returns `{ lastInsertRowid, changes }` describing the operation.
   * @throws If the database is not connected.
   */
  run(sql: string, params: SqlParam[] = []): RunResult {
    const db = this.assertConnected('run');
    this.log.debug('run', { sql });
    const stmt   = db.prepare(sql);
    const result = stmt.run(...params);
    return {
      lastInsertRowid: result.lastInsertRowid,
      changes:         result.changes,
    };
  }

  // ── transaction ────────────────────────────────────────────────────────────

  /**
   * Execute `fn` inside a single SQLite transaction.
   *
   * - If `fn` returns normally → COMMIT.
   * - If `fn` throws → ROLLBACK, then re-throws.
   *
   * Transactions can be nested: SQLite will use savepoints automatically.
   *
   * @param fn - Synchronous work to perform.
   * @returns The return value of `fn`.
   */
  transaction<T>(fn: () => T): T {
    const db = this.assertConnected('transaction');
    this.log.debug('transaction begin');
    // better-sqlite3's transaction() returns a wrapped function — call it.
    const txFn = db.transaction<T>(fn);
    return txFn();
  }

  // ── registerSchema ─────────────────────────────────────────────────────────

  /**
   * Register a module's migrations.
   * Must be called before `connect()` — registrations after connect() are
   * rejected with an error.
   *
   * @param registration - Module ID + array of Migration objects.
   */
  registerSchema(registration: SchemaRegistration): void {
    if (this.state === 'connected') {
      throw new Error(
        `[core:database] registerSchema() called after connect() for module "${registration.module}". ` +
        'All schema registrations must happen before opening the database.',
      );
    }
    this.log.debug(`Schema registered for module "${registration.module}"`, {
      module:         registration.module,
      migrationCount: registration.migrations.length,
    });
    this.schemas.push(registration);
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private assertConnected(operation: string): BetterSqlite3Database {
    if (!this.db || this.state !== 'connected') {
      throw new Error(
        `[core:database] Cannot call ${operation}() — database is not connected. ` +
        'Call connect() first.',
      );
    }
    return this.db;
  }

  /**
   * Check all registered migrations for duplicate version numbers across
   * modules. Duplicate versions cause silent skips — whichever module's
   * migration runs first gets recorded, and the other is never applied.
   *
   * Logs an error for each collision found. Does not throw, so the app can
   * still start, but the log entry will make the problem immediately visible.
   */
  private checkForDuplicateMigrationVersions(migrations: Migration[]): void {
    const seen = new Map<number, string>();
    for (const m of migrations) {
      if (seen.has(m.version)) {
        this.log.error(
          `[core:database] DUPLICATE migration version ${m.version} detected! ` +
          `Module "${m.module}" conflicts with module "${seen.get(m.version)}". ` +
          'One of these migrations will be silently skipped. Renumber to fix.',
          { version: m.version, module: m.module, conflictsWith: seen.get(m.version) },
        );
      } else {
        seen.set(m.version, m.module);
      }
    }
  }

  /**
   * After migrations run, query sqlite_master to verify that all expected
   * tables exist. Any missing tables are logged as errors so they are
   * immediately visible in the log. No tables are created or dropped here —
   * this is a read-only diagnostic pass.
   */
  private validateRequiredTables(): void {
    const db = this.db!;
    const existing = new Set(
      (db.prepare(
        `SELECT name FROM sqlite_master WHERE type='table'`,
      ).all() as Array<{ name: string }>).map(r => r.name),
    );

    const missing: string[] = [];
    for (const table of REQUIRED_TABLES) {
      if (!existing.has(table)) {
        missing.push(table);
      }
    }

    if (missing.length > 0) {
      this.log.error(
        `[core:database] Schema validation: ${missing.length} required table(s) are missing after migrations ran.`,
        { missingTables: missing },
      );
    } else {
      this.log.info('[core:database] Schema validation passed — all required tables present.');
    }
  }

  /**
   * Lazily require better-sqlite3 at runtime.
   * This keeps the package compilable without better-sqlite3 in dev workspaces.
   */
  private requireBetterSqlite3(): DatabaseFactory {
    return (path: string) => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Database = require('better-sqlite3') as (path: string) => BetterSqlite3Database;
      return Database(path);
    };
  }
}

// ── Singleton ─────────────────────────────────────────────────────────────────

/**
 * Application-wide database manager singleton.
 * Import and use directly — do not create additional instances.
 */
export const databaseManager = new DatabaseManager();
