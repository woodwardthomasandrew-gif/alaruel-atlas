# Modules Overview

This document inventories first-party repository modules and what each supports.

## Top-Level Workspace Areas

| Path | Purpose | Features Supported |
|---|---|---|
| `core/` | Foundational runtime systems (DB, events, assets, plugins, config, logger). | Every feature module; boot, persistence, IPC, logging. |
| `modules/` | Domain feature modules, each packaged and lifecycle-managed. | Atlas, NPCs, Quests, Sessions, Timeline, Graph, Bestiary, Mini Catalogue, Dungeon, Inspiration. |
| `ui/` | React renderer app and feature views. | All end-user UI, print/export views, workflow screens. |
| `shared/` | Shared domain types/utilities/components for cross-module consistency. | Canonical entity/type contracts. |
| `apps/desktop/` | Electron main/preload layer, IPC bridge, desktop packaging. | Campaign open/create, DB IPC, file dialogs, asset import, inspiration IPC. |
| `assets/` | Bundled static resources (icons, fonts, themes). | UI branding/theming. |
| `data/` | Runtime filesystem roots (campaign dbs, assets, logs, config, plugins). | Offline storage and user data. |

## Core Packages (`core/*`)

| Module | Purpose | Key Exports / Responsibilities |
|---|---|---|
| `core/database` | SQLite connection + migration orchestration. | `IDatabaseManager`, `SchemaRegistration`, `Migration`, typed `query/run/transaction`. |
| `core/events` | Typed event bus contract for cross-module communication. | `IEventBus`, `AppEventMap`, typed payload inference. |
| `core/assets` | Binary asset storage, dedupe, linking. | `IAssetManager`, `AssetRecord`, `AssetLink`. |
| `core/plugins` | Plugin manifest/API contracts + loader lifecycle. | `PluginManifest`, `PluginAPI`, `IPluginLoader`. |
| `core/config` | App + campaign + module-scoped config composition. | `IConfigManager`, `AppConfig`, `CampaignConfig`. |
| `core/logger` | Structured leveled logging primitives. | `Logger`, `LogEntry`, `LogLevel`. |

## Feature Modules (`modules/*`)

| Module | Purpose | Main Entities / Tables |
|---|---|---|
| `modules/atlas` | World atlas: locations, maps, pins. | `locations`, `maps`, `location_pins`. |
| `modules/npcs` | NPC lifecycle and notes. | `npcs`, `npc_notes` (+ faction/location links in shared schema). |
| `modules/quests` | Quests, objectives, notes, plot threads. | `quests`, `quest_objectives`, `quest_notes`, `plot_threads`, quest link tables. |
| `modules/sessions` | Session planning/execution records and scene encounters. | `sessions`, `session_notes`, `session_prep_items`, `session_scenes`, scene encounter tables. |
| `modules/timeline` | Campaign events and causality chains. | `campaign_events`, `event_causality`, `campaign_event_npcs`. |
| `modules/graph` | Cross-entity relationship graph storage/query. | `entity_relationships`. |
| `modules/assets-ui` | Asset browser/importer module-level repository/schema. | `assets`, `asset_links`. |
| `modules/bestiary` | Monster statblocks and homebrew entries. | `monsters`. |
| `modules/mini-catalogue` | Physical mini inventory + monster links. | `minis`, `mini_monsters`. |
| `modules/dungeon` | Procedural dungeon generation and persistence. | `dungeons`, `dungeon_rooms`, `dungeon_contents`. |
| `modules/inspiration` | Offline random-table inspiration generation. | In-memory generator tables (no dedicated DB tables). |
| `modules/_framework` | Module lifecycle abstraction layer. | `IModule`, `IModuleLoader`, `ModuleManifest`, base errors. |

## Desktop and UI Runtime

| Module | Purpose | Supports |
|---|---|---|
| `apps/desktop/src/main.ts` + `ipc.ts` | App lifecycle + IPC registration. | Campaign open/create/close, SQL bridge, filesystem operations. |
| `apps/desktop/src/preload.ts` | Secure `window.atlas` bridge. | Renderer-safe API surface. |
| `ui/src/views/*` | User workflows. | Session Planner, Mini Catalogue, Dungeon Generator, Statblock view/print, Inspiration view, Graph view, etc. |

## Assets and Data Directories

| Path | Notes |
|---|---|
| `assets/fonts`, `assets/icons`, `assets/themes` | Bundled static artifacts committed with source. |
| `data/campaigns` | Campaign `.db` files. |
| `data/assets` | Imported binary assets backing `assets` table records. |
| `data/config` | App/user config files. |
| `data/logs` | Runtime logs. |
| `data/plugins` | Plugin install root. |
