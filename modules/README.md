# modules/

Feature modules. Each module is a self-contained package.

## Rules
- Modules MUST NOT import from each other
- All cross-module communication goes through `@alaruel/core-events`
- All persistence goes through `@alaruel/core-database`
- Each module registers its DB schema at boot via the database manager
- Each module's public API is exported only from its `src/index.ts`

## Modules
| Module          | Responsibility                          |
|-----------------|-----------------------------------------|
| `atlas`         | Interactive world maps                  |
| `npcs`          | NPC lifecycle and notes                 |
| `factions`      | GM faction manager                      |
| `quests`        | Quest and plot tracking                 |
| `sessions`      | Session planning and notes              |
| `timeline`      | Campaign timeline and chronology        |
| `graph`         | Narrative relationship graph            |
| `assets-ui`     | Asset browser and importer UI           |
