# core/

Contains the six foundational systems that every module and plugin depends on.
Modules MUST NOT import from each other — all shared functionality routes
through these systems.

| Package              | Responsibility                                   |
|----------------------|--------------------------------------------------|
| `core/database`      | SQLite connection, migrations, typed query API   |
| `core/events`        | Typed pub/sub event bus                         |
| `core/assets`        | Binary asset storage and virtual path resolution |
| `core/plugins`       | Plugin discovery, sandboxing, lifecycle          |
| `core/config`        | Typed configuration with per-campaign overrides  |
| `core/logger`        | Structured, leveled, tagged logging              |

## Boot order
1. logger  →  2. config  →  3. database  →  4. assets  →  5. events  →  6. plugins
