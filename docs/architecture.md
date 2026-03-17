# Architecture

## Overview
Alaruel Atlas is a monorepo of isolated packages centred on six core systems
and seven feature modules. Modules never import each other — all coordination
flows through the event bus or through shared database reads.

## Layers
1. **Desktop** (`apps/desktop`) — Electron main process, OS bridge, IPC
2. **Renderer** (`ui/`) — React app, module view registry, routing
3. **Modules** (`modules/`) — Feature islands (atlas, npcs, quests, …)
4. **Core** (`core/`) — Shared infrastructure systems
5. **Data** — SQLite campaign file + filesystem

## Core systems boot order
logger → config → database → assets → events → plugins

## Cross-module communication
Modules communicate exclusively via the typed event bus.
Example: Quests emits `quest:completed` → Timeline and NPCs subscribe independently.

## Data persistence
Each campaign is a single SQLite `.db` file.
Every module registers its table schemas at boot via the database manager.

## Plugin system
Plugins are loaded from `data/plugins/` at startup.
They receive a restricted PluginAPI and cannot access core internals directly.

## Key rules
- Modules MUST NOT import from each other
- All cross-module effects are event-driven
- All persistence uses the database manager API
- All asset access uses virtual `asset://` paths

## Folder structure
See project root README.md.
