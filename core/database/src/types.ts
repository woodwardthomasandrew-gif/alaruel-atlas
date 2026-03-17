// ─────────────────────────────────────────────────────────────────────────────
// core/database — types
// ─────────────────────────────────────────────────────────────────────────────

// ── Migration ─────────────────────────────────────────────────────────────────

/**
 * A single versioned schema change.
 *
 * Migrations are applied in ascending `version` order. Once applied, a
 * migration is recorded in the `_migrations` meta-table and never re-run.
 *
 * Convention: version numbers are sequential integers starting at 1.
 * Each migration belongs to exactly one module (identified by `module`).
 */
export interface Migration {
  /** Sequential integer. Must be unique across all registered migrations. */
  version: number;
  /** Name of the module that owns this migration, e.g. `'quests'`. */
  module: string;
  /** Short description for the migration log, e.g. `'create quests_entries'`. */
  description: string;
  /**
   * The SQL to execute when applying this migration.
   * Must be idempotent where possible (use IF NOT EXISTS, etc.).
   * May contain multiple statements separated by semicolons.
   */
  up: string;
  /**
   * The SQL to execute when rolling back this migration (optional).
   * Down migrations are not run automatically but are available for tooling.
   */
  down?: string;
}

// ── Schema registration ───────────────────────────────────────────────────────

/**
 * What a module submits to the DatabaseManager during app boot.
 * Migrations are stored centrally and run once on database open.
 */
export interface SchemaRegistration {
  /** Module identifier — used in logs. */
  module: string;
  /** All migrations this module needs, in version order. */
  migrations: Migration[];
}

// ── Query helpers ─────────────────────────────────────────────────────────────

/**
 * Accepted parameter types for SQL bind values.
 * Matches the types accepted by better-sqlite3.
 */
export type SqlParam = string | number | bigint | boolean | null | Buffer;

/** Result of a non-SELECT statement (INSERT, UPDATE, DELETE, etc.). */
export interface RunResult {
  /** Row ID of the last inserted row (for INSERT statements). */
  lastInsertRowid: number | bigint;
  /** Number of rows changed by the statement. */
  changes: number;
}

// ── DatabaseManager interface ─────────────────────────────────────────────────

/** Public API surface of the DatabaseManager. */
export interface IDatabaseManager {
  /**
   * Open a SQLite database file and run any pending migrations.
   *
   * @param dbPath - Absolute path to the `.db` file. Created if absent.
   */
  connect(dbPath: string): void;

  /**
   * Close the active database connection.
   * Must be called before the process exits.
   */
  disconnect(): void;

  /**
   * Execute a SELECT statement and return typed rows.
   *
   * @param sql    - Parameterised SQL string.
   * @param params - Bind values matching `?` placeholders.
   * @returns Array of rows cast to `T`. Never throws on empty result.
   *
   * @example
   * ```ts
   * const rows = db.query<Quest>('SELECT * FROM quests_entries WHERE id = ?', [id]);
   * ```
   */
  query<T = Record<string, unknown>>(sql: string, params?: SqlParam[]): T[];

  /**
   * Execute a non-SELECT statement (INSERT, UPDATE, DELETE, DDL).
   *
   * @returns Metadata about the operation (lastInsertRowid, changes).
   */
  run(sql: string, params?: SqlParam[]): RunResult;

  /**
   * Execute a function inside a single SQLite transaction.
   *
   * If `fn` throws, the transaction is automatically rolled back.
   * If `fn` returns normally, the transaction is committed.
   *
   * @param fn - Work to perform inside the transaction. Receives the manager
   *             so callers can chain query/run calls.
   * @returns Whatever `fn` returns.
   *
   * @example
   * ```ts
   * const quest = db.transaction(() => {
   *   const result = db.run('INSERT INTO quests_entries ...', [...]);
   *   db.run('INSERT INTO timeline_entries ...', [...]);
   *   return result;
   * });
   * ```
   */
  transaction<T>(fn: () => T): T;

  /**
   * Register a module's schema (migrations) before connect() is called.
   * All registrations must be completed before any migrations are run.
   */
  registerSchema(registration: SchemaRegistration): void;
}

// ── Connection state ──────────────────────────────────────────────────────────

export type ConnectionState = 'disconnected' | 'connected' | 'error';
