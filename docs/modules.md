# Modules Overview

This document inventories the runtime packages in the repository and what each supports.

## Top-Level Workspace Areas

| Path | Purpose | Features Supported |
|---|---|---|
| `core/` | Foundational runtime systems. | Database, events, assets, plugins, config, logger. |
| `modules/` | Domain feature packages. | Atlas, party, NPCs, factions, quests, sessions, timeline, graph, assets UI, bestiary, mini catalogue, dungeon. |
| `ui/` | React renderer app. | End-user workflows and print/export views. |
| `shared/` | Shared domain types, components, hooks, and utilities. | Canonical contracts and UI primitives. |
| `apps/desktop/` | Electron main/preload layer. | Campaign open/create, DB IPC, asset import, protocol handling, plugin loading. |
| `assets/` | Bundled static resources. | Icons, fonts, themes. |
| `data/` | Runtime filesystem roots. | Campaign databases, imported assets, logs, config, plugins. |

## Core Packages (`core/*`)

| Module | Purpose | Key Exports / Responsibilities |
|---|---|---|
| `core/database` | SQLite connection and migration orchestration. | `databaseManager`, `DatabaseManager`, `IDatabaseManager`, `SchemaRegistration`, `Migration`. |
| `core/events` | Typed event bus contract. | `eventBus`, `AppEventMap`, `EventName`, `EventPayload`. |
| `core/assets` | Binary asset storage and linking. | `assetManager`, `AssetManager`, `AssetRecord`, `AssetLink`. |
| `core/plugins` | Plugin manifest, API, and loader lifecycle. | `pluginLoader`, `PluginLoader`, `PluginManifest`, `PluginAPI`. |
| `core/config` | App and campaign config composition. | `configManager`, `ConfigManager`, `AppConfig`, `CampaignConfig`. |
| `core/logger` | Structured logging primitives. | `createLogger`, `configureLogger`, `Logger`, `LogEntry`, `LogLevel`. |

## Feature Modules (`modules/*`)

| Module | Purpose | Main Entities / Tables |
|---|---|---|
| `modules/atlas` | World atlas and location management. | `locations`, `maps`, `location_pins`. |
| `modules/party` | Party roster and vessel/companion tracking. | `party_members`, `party_member_gear`, `party_airships`, `party_airship_cargo`, `party_pets`. |
| `modules/npcs` | NPC lifecycle and notes. | `npcs`, `npc_notes`. |
| `modules/factions` | Faction manager and faction relationships. | `factions`, `faction_org_nodes`, `faction_members`, `faction_relations`, `faction_territory`, `faction_reputation`, `faction_resources`, `session_factions`. |
| `modules/quests` | Quests and plot threads. | `plot_threads`, `quests`, `quest_objectives`, `quest_notes`, `quest_npcs`. |
| `modules/sessions` | Session planning, notes, and encounter scenes. | `sessions`, `session_notes`, `session_prep_items`, `session_scenes`, `session_quests`, `session_npcs`, `session_scene_npcs`, `session_scene_monsters`, `session_scene_minis`. |
| `modules/timeline` | Campaign chronology and auto-generated entries. | `campaign_events`, `campaign_event_npcs`, `event_causality`. |
| `modules/graph` | Generic relationship graph and overlays. | `entity_relationships`, `graph_layout_state`, `graph_node_overlays`, `graph_relationship_overlays`. |
| `modules/assets-ui` | Asset browser and importer UI. | `assets`, `asset_links`. |
| `modules/bestiary` | Monster statblocks and bestiary records. | `monsters`. |
| `modules/mini-catalogue` | Physical mini inventory linked to monsters. | `minis`, `mini_monsters`. |
| `modules/dungeon` | Procedural dungeon generation and saved layouts. | `dungeons`, `dungeon_rooms`, `dungeon_contents`. |
| `modules/_framework` | Shared module lifecycle abstraction layer. | `IModule`, `IModuleLoader`, `BaseModule`, `BaseService`, `BaseRepository`. |
| `modules/inspiration` | IPC-only inspiration generator utility. | No dedicated tables. |

## Desktop and UI Runtime

| Module | Purpose | Supports |
|---|---|---|
| `apps/desktop/src/main.ts` + `ipc.ts` | App lifecycle and IPC registration. | Campaign open/create/close, SQL bridge, filesystem operations, inspiration IPC, export helpers. |
| `apps/desktop/src/preload.ts` | Secure `window.atlas` bridge. | Renderer-safe API surface. |
| `ui/src/views/*` | User workflows. | Party, sessions, quests, NPCs, factions, atlas, timeline, graph, bestiary, dungeon, assets, mini catalogue, generators, inspiration. |

## Assets and Data Directories

| Path | Notes |
|---|---|
| `assets/icons`, `assets/fonts`, `assets/themes` | Bundled static artifacts committed with source. |
| `data/campaigns` | Campaign `.db` files. |
| `data/assets` | Imported binary assets. |
| `data/config` | App/user config files. |
| `data/logs` | Runtime logs. |
| `data/plugins` | Plugin install root. |
