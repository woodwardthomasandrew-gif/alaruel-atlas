# modules/

Feature modules and module-adjacent packages. Each runtime feature is isolated in its own package.

## Rules

- Modules MUST NOT import from each other
- All cross-module communication goes through `@alaruel/core-events`
- All persistence goes through `@alaruel/core-database`
- Each module registers its DB schema at boot via the database manager
- Each module's public API is exported only from its `src/index.ts`

## Modules

| Module | Responsibility |
|---|---|
| `atlas` | Interactive world maps and location management |
| `party` | Party roster, gear, airship, and companion tracking |
| `npcs` | NPC lifecycle and notes |
| `factions` | Manual-first faction manager |
| `quests` | Quest and plot tracking |
| `sessions` | Session planning, notes, recaps, and encounter management |
| `timeline` | Campaign chronology and auto-generated timeline entries |
| `graph` | Narrative relationship graph |
| `assets-ui` | Asset browser and import UI |
| `bestiary` | Monster statblock creator and bestiary manager |
| `mini-catalogue` | Physical miniature collection tracking |
| `dungeon` | Procedural dungeon generation |

## Module-Adjacent Utilities

- `modules/_framework` is the shared module lifecycle abstraction.
- `modules/inspiration` is an IPC-backed generator utility rather than a registered module package.
