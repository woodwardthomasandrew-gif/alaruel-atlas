# core/database

SQLite database manager.

## Responsibilities
- Manages a single `.db` campaign file (offline-first)
- Runs ordered migrations on open
- Accepts schema registrations from modules
- Provides a typed query/mutation API
- All writes are transactional

## Key exports
- `DatabaseManager` (class/interface)
- `registerSchema(registration: SchemaRegistration): void`
- `query<T>(sql, params): T[]`
- `run(sql, params): RunResult`

## Rules
- No module imports `better-sqlite3` directly
- All table names are namespaced: `module_tablename` (e.g. `quests_entries`)
