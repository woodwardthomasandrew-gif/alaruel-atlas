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

    // Execute the migration SQL one statement at a time so we can skip
    // already-applied ADD COLUMN steps without aborting the rest.
    executeSqlStatements(db, migration.up, log, migration);

    // Record it as applied.
    db.prepare(
      'INSERT INTO _migrations (version, module, description) VALUES (?, ?, ?)',
    ).run(migration.version, migration.module, migration.description);

    log.info(`Migration v${migration.version} applied successfully`);
  }
}

function executeSqlStatements(db: MigrationDb, sql: string, log: Logger, migration: Migration): void {
  for (const statement of splitSqlStatements(sql)) {
    if (shouldSkipAlreadyAppliedColumnStatement(db, statement)) {
      log.debug(
        `Skipping already-applied column during migration v${migration.version}`,
        {
          version: migration.version,
          module:  migration.module,
          statement,
        },
      );
      continue;
    }

    try {
      db.exec(statement);
    } catch (err) {
      if (isDuplicateColumnError(err) && isAlterTableAddColumnStatement(statement)) {
        log.warn(
          `Skipping already-applied column during migration v${migration.version}`,
          {
            version: migration.version,
            module:  migration.module,
            statement,
            error:    err instanceof Error ? err.message : String(err),
          },
        );
        continue;
      }

      throw err;
    }
  }
}

function splitSqlStatements(sql: string): string[] {
  const parts: string[] = [];
  let current = '';
  let inSingleQuote = false;
  let inDoubleQuote = false;

  for (let index = 0; index < sql.length; index += 1) {
    const char = sql[index];
    const next = sql[index + 1];

    current += char;

    if (char === "'" && !inDoubleQuote) {
      if (inSingleQuote && next === "'") {
        current += next;
        index += 1;
        continue;
      }

      inSingleQuote = !inSingleQuote;
      continue;
    }

    if (char === '"' && !inSingleQuote) {
      if (inDoubleQuote && next === '"') {
        current += next;
        index += 1;
        continue;
      }

      inDoubleQuote = !inDoubleQuote;
      continue;
    }

    if (char === ';' && !inSingleQuote && !inDoubleQuote) {
      const statement = current.slice(0, -1).trim();
      if (statement) {
        parts.push(statement);
      }
      current = '';
    }
  }

  const tail = current.trim();
  if (tail) {
    parts.push(tail);
  }

  return reassembleTriggerBodies(parts);
}

function reassembleTriggerBodies(parts: string[]): string[] {
  const statements: string[] = [];
  let buffer = '';
  let inTrigger = false;

  for (const part of parts) {
    if (!inTrigger) {
      if (/^\s*CREATE\s+TRIGGER\b/i.test(part)) {
        buffer = part;
        inTrigger = true;
        continue;
      }

      statements.push(part);
      continue;
    }

    buffer += `;${part}`;

    if (/\bEND\s*$/i.test(part.trim())) {
      statements.push(buffer);
      buffer = '';
      inTrigger = false;
    }
  }

  if (buffer.trim()) {
    statements.push(buffer);
  }

  return statements;
}

function shouldSkipAlreadyAppliedColumnStatement(db: MigrationDb, statement: string): boolean {
  const match = statement.match(ALTER_TABLE_ADD_COLUMN_REGEX);
  if (!match) {
    return false;
  }

  const tableName = match[1] ?? match[2] ?? match[3] ?? match[4] ?? match[5];
  const columnName = match[6] ?? match[7] ?? match[8] ?? match[9];

  if (!tableName || !columnName) {
    return false;
  }

  return hasColumn(db, tableName, columnName);
}

function isAlterTableAddColumnStatement(statement: string): boolean {
  return ALTER_TABLE_ADD_COLUMN_REGEX.test(statement);
}

const ALTER_TABLE_ADD_COLUMN_REGEX =
  /^\s*ALTER\s+TABLE\s+(?:"([^"]+)"|'([^']+)'|`([^`]+)`|\[([^\]]+)\]|([^\s(]+))\s+ADD\s+COLUMN\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:"([^"]+)"|'([^']+)'|`([^`]+)`|\[([^\]]+)\]|([^\s(]+))/i;

function hasColumn(db: MigrationDb, tableName: string, columnName: string): boolean {
  const escapedTableName = tableName.replace(/'/g, "''");
  const escapedColumnName = columnName.replace(/'/g, "''");
  const row = db.prepare(
    `SELECT name FROM pragma_table_info('${escapedTableName}') WHERE name = '${escapedColumnName}' LIMIT 1`,
  ).all() as unknown as Array<{ present: number }>;

  return row.length > 0;
}

function isDuplicateColumnError(err: unknown): boolean {
  return err instanceof Error && /duplicate column name/i.test(err.message);
}
