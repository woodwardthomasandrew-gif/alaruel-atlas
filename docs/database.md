# Database Schema

Schema sources:
- `core/database/schema/full.sql`
- module schema registrations in `modules/*/src/schema.ts`

## TypeScript to Table Mapping

| TS Interface / Type | Table(s) |
|---|---|
| `Campaign` | `campaigns` |
| `AssetRecord` / `Asset` | `assets` |
| `AssetLink` | `asset_links` |
| `NpcRow` / `NPC` | `npcs` |
| `NpcNoteRow` / `NpcNote` | `npc_notes` |
| `Faction` | `factions`, `npc_factions`, `faction_locations` |
| `LocationRow` / `Location` | `locations` |
| `MapRow` / `CampaignMap` | `maps` |
| `PinRow` / `LocationPin` | `location_pins` |
| `QuestRow` / `Quest` | `quests` |
| `QuestObjectiveRow` / `QuestObjective` | `quest_objectives` |
| `QuestNoteRow` / `QuestNote` | `quest_notes` |
| `PlotThread` | `plot_threads`, `plot_thread_*` link tables |
| `SessionRow` / `Session` | `sessions` |
| `SessionNoteRow` / `SessionNote` | `session_notes` |
| `SessionPrepItemRow` / `SessionPrepItem` | `session_prep_items` |
| `SessionSceneRow` / `SessionScene` | `session_scenes` |
| `SessionSceneMonsterRow` / `SceneMonsterEntry` | `session_scene_monsters` |
| `SessionSceneMiniRow` / `SceneMiniEntry` | `session_scene_minis` |
| `SessionSceneNpcRow` | `session_scene_npcs` |
| `EventRow` / `CampaignEvent` | `campaign_events`, `event_causality`, `campaign_event_npcs`, `campaign_event_factions` |
| `RelationshipRow` / `GraphEdge` | `entity_relationships` |
| `MonsterRow` / `Monster` | `monsters` |
| `MiniRow` / `Mini` | `minis` |
| `MiniMonsterRow` / `MiniMonsterRef` | `mini_monsters` |
| `DungeonRow` / `Dungeon` | `dungeons` |
| `DungeonRoomRow` / `DungeonRoom` | `dungeon_rooms` |
| `DungeonContentRow` / `DungeonContent` | `dungeon_contents` |

## Core Keys and Relationships

### Primary Keys

- Most entity tables use `id TEXT PRIMARY KEY` (`campaigns`, `npcs`, `quests`, `sessions`, `campaign_events`, etc.).
- Junction tables use composite keys:
  - `asset_links(asset_id, entity_module, entity_id, role)`
  - `npc_factions(npc_id, faction_id)`
  - `quest_npcs(quest_id, npc_id)`
  - `session_scene_npcs(scene_id, npc_id)`
  - `session_scene_monsters(scene_id, monster_id)`
  - `session_scene_minis(scene_id, mini_id)`
  - `mini_monsters(mini_id, monster_id)`
  - plus similar `*_locations`, `*_plot_threads`, `event_causality` composites.

### Foreign Keys (Representative)

- `campaign_id` in most domain tables references `campaigns(id)` with `ON DELETE CASCADE`.
- `quests.plot_thread_id -> plot_threads.id` (`SET NULL`).
- `session_scenes.session_id -> sessions.id` (`CASCADE`).
- `session_scenes.location_id -> locations.id` (`SET NULL`).
- `session_scene_npcs.npc_id -> npcs.id` (`CASCADE`).
- `session_scene_monsters.monster_id` links to monster IDs (module schema + full schema align with bestiary usage).
- `mini_monsters.monster_id -> monsters.id` (`CASCADE`).
- `campaign_events.quest_id -> quests.id`, `campaign_events.session_id -> sessions.id`, etc. (`SET NULL`).
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

## Relationship Cardinality Summary

- Campaign `1 -> many` NPCs, Quests, Sessions, Events, Locations, Maps, Assets, Monsters, Minis, Dungeons.
- Session `1 -> many` Scenes, Notes, Prep items.
- Scene `many <-> many` NPCs/Monsters/Minis via scene join tables.
- Quest `1 -> many` Objectives/Notes.
- Quest `many <-> many` NPCs/Locations.
- Plot Thread `1 -> many` Quests; also `many <-> many` NPCs/Factions/Locations.
- Event `many <-> many` NPCs/Factions; Event causal graph via `event_causality` self-link table.
