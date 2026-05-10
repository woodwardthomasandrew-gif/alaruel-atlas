# core/

Contains the foundational runtime systems that every module and plugin depends on.
Modules MUST NOT import from each other; shared functionality routes through these packages.

| Package | Responsibility |
|---|---|
| `core/database` | SQLite connection, migrations, typed query API, and schema registration |
| `core/events` | Typed publish/subscribe event bus |
| `core/assets` | Binary asset storage, deduplication, and virtual path resolution |
| `core/plugins` | Plugin discovery, permission gating, and lifecycle |
| `core/config` | Typed configuration with app and campaign overrides |
| `core/logger` | Structured, leveled, tagged logging |

## Boot order

1. logger -> 2. config -> 3. assets -> 4. modules -> 5. window -> 6. IPC -> 7. plugins

## Notes

- `modules/_framework` owns the shared module base classes and loader.
- `core/database` bootstraps `campaigns` and `entity_registry`, then runs registered migrations from module schemas.
