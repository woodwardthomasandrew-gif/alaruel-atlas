# Architecture

## Overview

Alaruel Atlas is a monorepo of isolated packages centered on core runtime systems, feature modules, and a React/Electron desktop shell. Modules never import each other; coordination flows through the event bus, the database manager, or shared types.

## Layers

1. Desktop (`apps/desktop`) - Electron main process, OS bridge, IPC
2. Renderer (`ui/`) - React app, module view registry, routing
3. Modules (`modules/`) - Feature packages such as atlas, party, npcs, factions, quests, sessions, timeline, graph, assets-ui, bestiary, mini-catalogue, and dungeon
4. Core (`core/`) - Shared infrastructure systems
5. Data - SQLite campaign file plus filesystem roots

## Core Systems Boot Order

logger -> config -> assets -> modules -> window -> IPC -> plugins

## Cross-Module Communication

Modules communicate through the typed event bus. For example, quests emits `quest:completed`, and timeline subscribes independently.

## Data Persistence

Each campaign is a single SQLite `.db` file. Every module registers its schema at boot via the database manager.

## Plugin System

Plugins are loaded from `data/plugins/` at startup. They receive a restricted PluginAPI and cannot access core internals directly.

## Key Rules

- Modules MUST NOT import from each other
- All cross-module effects are event-driven
- All persistence uses the database manager API
- All asset access uses virtual `asset://` paths
