# core/database

SQLite database manager and migration runner.

## Responsibilities

- Manages a single campaign `.db` file
- Runs ordered migrations on open
- Accepts schema registrations from modules before connect time
- Provides typed query, mutation, and transaction helpers
- Enforces the core bootstrap tables and validates required tables after migration

## Key Exports

- `databaseManager` (singleton)
- `DatabaseManager`
- `IDatabaseManager`
- `registerSchema(registration: SchemaRegistration): void`
- `query<T>(sql, params): T[]`
- `run(sql, params): RunResult`
- `transaction(fn): T`

## Rules

- No module imports `better-sqlite3` directly
- The runtime bootstrap tables are `campaigns` and `entity_registry`
- Module schemas define the rest of the campaign tables
