# Alaruel Atlas

A modular offline campaign management system for tabletop RPGs.

## Features (planned)
- Interactive world atlas (maps)
- NPC and faction management
- Quest and plot tracking
- Session planning
- Campaign timeline
- Narrative relationship graph
- Asset management

## Tech Stack
- **Desktop**: Electron
- **Frontend**: React + TypeScript
- **Backend**: Node.js
- **Database**: SQLite (via better-sqlite3)

## Architecture
See `docs/architecture.md` for the full design.

## Workspace layout
| Directory      | Purpose                                         |
|----------------|-------------------------------------------------|
| `core/`        | Core systems: DB, events, plugins, config, logs |
| `modules/`     | Feature modules (atlas, npcs, quests, …)        |
| `ui/`          | React renderer app                              |
| `shared/`      | Shared TypeScript types, utils, components      |
| `apps/desktop` | Electron main process                           |
| `assets/`      | Static bundled assets (icons, fonts, themes)    |
| `data/`        | Runtime data (gitignored except structure)      |
| `docs/`        | Architecture and developer documentation        |

## Getting started
```bash
pnpm install
pnpm dev
```
