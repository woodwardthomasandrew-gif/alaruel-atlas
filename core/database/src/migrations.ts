// ─────────────────────────────────────────────────────────────────────────────
// core/database — migration runner
// ─────────────────────────────────────────────────────────────────────────────

import type { Migration } from './types';
import type { Logger } from '../../logger/src/index';

/**
 * Interface representing the minimal SQLite API that the runner needs.
 * Matches the better-sqlite3 Database surface we use.
 */
export interface MigrationDb {
  exec(sql: string): void;
  prepare(sql: string): { run(...args: unknown[]): void; all(): Array<{ version: number }> };
}

// ── Bootstrap the migrations meta-table ──────────────────────────────────────

/**
 * Ensure the `_migrations` tracking table exists.
 * This table records which migrations have been applied.
 */
export function bootstrapMigrationsTable(db: MigrationDb): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      version     INTEGER PRIMARY KEY,
      module      TEXT    NOT NULL,
      description TEXT    NOT NULL,
      applied_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

// ── Run pending migrations ────────────────────────────────────────────────────

/**
 * Apply all migrations that have not yet been recorded in `_migrations`.
 *
 * Steps:
 *  1. Sort all registered migrations by version ascending.
 *  2. Query `_migrations` for already-applied versions.
 *  3. For each pending migration, exec `up` SQL, then record in `_migrations`.
 *
 * Each migration runs inside its own implicit transaction (SQLite auto-commit).
 * If a migration fails, it throws and the database is left at the last
 * successfully applied version.
 *
 * @param db         - The open SQLite database handle.
 * @param migrations - Flat list of all registered migrations.
 * @param log        - Logger for progress reporting.
 */
export function runMigrations(
  db:         MigrationDb,
  migrations: Migration[],
  log:        Logger,
): void {
  // Load the set of already-applied version numbers.
  const applied = new Set(
    db.prepare('SELECT version FROM _migrations ORDER BY version ASC')
      .all()
      .map(r => r.version),
  );

  // Sort by version to guarantee order regardless of registration sequence.
  const pending = migrations
    .filter(m => !applied.has(m.version))
    .sort((a, b) => a.version - b.version);

  if (pending.length === 0) {
    log.debug('No pending migrations');
    return;
  }

  log.info(`Running ${pending.length} pending migration(s)`);

  for (const migration of pending) {
    log.info(`Applying migration v${migration.version}: ${migration.description}`, {
      version: migration.version,
      module:  migration.module,
    });

    // Execute the migration SQL.
    db.exec(migration.up);

    // Record it as applied.
    db.prepare(
      'INSERT INTO _migrations (version, module, description) VALUES (?, ?, ?)',
    ).run(migration.version, migration.module, migration.description);

    log.info(`Migration v${migration.version} applied successfully`);
  }
}
