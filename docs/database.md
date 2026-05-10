# Database Schema

Schema sources:
- `core/database/src/index.ts`
- `modules/*/src/schema.ts`
- `core/assets/src/index.ts` for the `core_assets` tables
- `core/database/schema/*.sql` as historical references

## Current Table Inventory

| Area | Tables |
|---|---|
| Core bootstrap | `campaigns`, `entity_registry` |
| Core asset manager | `core_assets`, `core_asset_links` |
| Atlas | `locations`, `maps`, `location_pins` |
| Party | `party_members`, `party_member_gear`, `party_airships`, `party_airship_cargo`, `party_pets` |
| NPCs and factions | `npcs`, `npc_notes`, `factions`, `faction_org_nodes`, `faction_members`, `faction_relations`, `faction_territory`, `faction_reputation`, `faction_resources`, `session_factions` |
| Quests and plot threads | `plot_threads`, `quests`, `quest_objectives`, `quest_notes`, `quest_npcs` |
| Sessions and scenes | `sessions`, `session_notes`, `session_prep_items`, `session_scenes`, `session_quests`, `session_npcs`, `session_scene_npcs`, `session_scene_monsters`, `session_scene_minis` |
| Timeline | `campaign_events`, `campaign_event_npcs`, `event_causality` |
| Graph | `entity_relationships`, `graph_layout_state`, `graph_node_overlays`, `graph_relationship_overlays` |
| Assets UI | `assets`, `asset_links` |
| Bestiary | `monsters` |
| Mini catalogue | `minis`, `mini_monsters` |
| Dungeon | `dungeons`, `dungeon_rooms`, `dungeon_contents` |

## Type to Table Notes

- The repository currently contains both `assets`/`asset_links` and `core_assets`/`core_asset_links`.
- The renderer and asset-browser UI use `assets` and `asset_links`.
- The core asset manager registers `core_assets` and `core_asset_links`.
- The raw type declarations live in `shared/src/types`, `modules/*/src/types.ts`, `ui/src/types`, and `core/*/src/types.ts`.

## Core Keys and Relationships

### Primary Keys

- Most entity tables use `id TEXT PRIMARY KEY`.
- Junction tables use composite keys such as:
  - `asset_links(asset_id, entity_module, entity_id, role)`
  - `core_asset_links(asset_id, entity_module, entity_id, role)`
  - `quest_npcs(quest_id, npc_id)`
  - `session_quests(session_id, quest_id)`
  - `session_npcs(session_id, npc_id)`
  - `session_scene_npcs(scene_id, npc_id)`
  - `session_scene_monsters(scene_id, monster_id)`
  - `session_scene_minis(scene_id, mini_id)`
  - `mini_monsters(mini_id, monster_id)`
  - `faction_members(faction_id, npc_id)`
  - `faction_relations(faction_id, target_faction_id)`
  - `campaign_event_npcs(event_id, npc_id)`
  - `event_causality(cause_event_id, effect_event_id)`

### Foreign Keys (Representative)

- `campaign_id` in most domain tables references `campaigns(id)` with `ON DELETE CASCADE`.
- `quests.plot_thread_id -> plot_threads.id` (`SET NULL`).
- `session_scenes.session_id -> sessions.id` (`CASCADE`).
- `session_scenes.location_id -> locations.id` (`SET NULL`).
- `session_scene_npcs.npc_id -> npcs.id` (`CASCADE`).
- `session_scene_monsters.monster_id` references monster IDs from the bestiary.
- `mini_monsters.monster_id -> monsters.id` (`CASCADE`).
- `campaign_events.quest_id -> quests.id`, `campaign_events.session_id -> sessions.id`, and similar optional links (`SET NULL`).
- `entity_relationships.campaign_id -> campaigns.id` (`CASCADE`).

## Table/Column Notes (Feature-Critical)

### `sessions`
- Scheduling/status: `scheduled_at`, `status`, `started_at`, `ended_at`, `duration_minutes`.
- Campaign-time fields: `campaign_date_start`, `campaign_date_end`.
- Narrative output: `rewards`, `follow_up_hooks`.

### `session_scenes`
- Scene ordering: `sort_order`.
- Encounter context: `location_id`, `played`.

### `session_scene_monsters` / `session_scene_minis`
- Encounter resource tracking:
  - monsters: `count`, optional `notes`
  - minis: `count`

### `quests` / `quest_objectives`
- Lifecycle and taxonomy: `status`, `quest_type`, `priority`.
- Story links: `quest_giver_npc_id`, `sponsor_faction_id`, `plot_thread_id`.
- Objectives: completion state + ordering + optional deadline.

### `campaign_events`
- Timeline semantics: `event_type`, `significance`, `certainty`, `campaign_date(_end)`.
- Entity links: location/quest/thread/session foreign references.

### `monsters`
- Full statblock decomposition into columns and JSON blobs (`actions`, `traits`, `saving_throws`, etc.).

### `assets` / `asset_links`
- Content-addressed metadata (`hash` uniqueness per campaign).
- Generic polymorphic linking via `entity_module` + `entity_id` + `role`.

### `core_assets` / `core_asset_links`
- Content-addressed store used by `core/assets`.
- File categories are `maps`, `portraits`, `audio`, `documents`, and `misc`.

## Relationship Cardinality Summary

- Campaign `1 -> many` NPCs, Quests, Sessions, Events, Locations, Maps, Assets, Monsters, Minis, Dungeons.
- Session `1 -> many` Scenes, Notes, Prep items.
- Scene `many <-> many` NPCs/Monsters/Minis via scene join tables.
- Quest `1 -> many` Objectives/Notes.
- Quest `many <-> many` NPCs/Locations.
- Plot Thread `1 -> many` Quests; also `many <-> many` NPCs/Factions/Locations.
- Event `many <-> many` NPCs/Factions; Event causal graph via `event_causality` self-link table.
