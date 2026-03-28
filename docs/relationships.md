# Entity Relationships

## Core Domain Relationship Diagram (ASCII)

```text
Campaign (1)
  |
  +--< Sessions (many) >--+--< SessionScenes (many)
  |                       |      |
  |                       |      +--< Scene NPCs (many-to-many via session_scene_npcs) >-- NPCs
  |                       |      +--< Scene Monsters (many-to-many via session_scene_monsters) >-- Monsters
  |                       |      +--< Scene Minis (many-to-many via session_scene_minis) >-- Minis
  |                       |
  |                       +--< Session Notes / Prep Items (1-to-many)
  |
  +--< Quests (many) >--< QuestObjectives (1-to-many)
  |         |
  |         +--< QuestNotes (1-to-many)
  |         +--< Quest NPCs (many-to-many) >-- NPCs
  |         +--< Quest Locations (many-to-many) >-- Locations
  |         +--(many-to-one optional)--> PlotThreads
  |
  +--< PlotThreads (many)
  |       +--< PlotThread NPCs/Factions/Locations (many-to-many)
  |
  +--< NPCs (many)
  |       +--< NPC Notes (1-to-many)
  |       +--< NPC Factions (many-to-many) >-- Factions
  |
  +--< Locations (many)
  |       +--(self hierarchy) parent_location_id
  |       +--< Maps (1-to-many optional subject)
  |
  +--< CampaignEvents (many)
  |       +--< Event causality (many-to-many self-link)
  |       +--< Event NPC/Faction links (many-to-many)
  |       +--(optional) -> Session / Quest / Location / PlotThread
  |
  +--< EntityRelationships (many generic graph edges)
  |
  +--< Assets (many) >--< AssetLinks (many-to-many polymorphic) >-- Any entity
  |
  +--< Monsters (many)
  +--< Minis (many) >--< MiniMonsters (many-to-many) >-- Monsters
  +--< Dungeons (many) >--< DungeonRooms (1-to-many) >--< DungeonContents (1-to-many)
```

## Requested Entity Focus

### Sessions, Scenes, NPCs, Monsters, Minis, Quests, Locations, Plot Threads

- `Session 1 -> many SessionScene`.
- `SessionScene many <-> many NPC` via `session_scene_npcs`.
- `SessionScene many <-> many Monster` via `session_scene_monsters`.
- `SessionScene many <-> many Mini` via `session_scene_minis`.
- `Session many <-> many Quest` via `session_quests` (advanced/completed outcome).
- `Session many <-> many NPC` via `session_npcs` (featured participants).
- `Session many <-> many Location` via `session_locations`.
- `Session many <-> many PlotThread` via `session_plot_threads`.
- `Quest many <-> many NPC` via `quest_npcs`.
- `Quest many <-> many Location` via `quest_locations`.
- `Quest many -> one PlotThread` via `plot_thread_id` (nullable).
- `PlotThread many <-> many NPC/Location/Faction` via join tables.

## Graph Layer Representation

`entity_relationships` encodes generic edges with:
- `source_id`, `source_type`
- `target_id`, `target_type`
- `relationship_type`, `label`, optional `strength`, `directed`

This allows graph cardinality to model both symmetric and directed links without schema changes.
