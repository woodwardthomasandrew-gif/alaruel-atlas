# Feature Reference

This section summarizes feature behavior and data flow across UI -> bridge -> modules -> DB.

## 1. Campaign Boot and Shell

- UI: `ui/src/App.tsx`, `ui/src/layouts/AppShell.tsx`, `ui/src/registry/module-registry.ts`
- Desktop: `apps/desktop/src/main.ts`, `apps/desktop/src/preload.ts`, `apps/desktop/src/ipc.ts`
- Flow:
  1. Desktop resolves runtime paths and loads user config.
  2. Core asset manager and module loader initialize before the window opens.
  3. The preload script exposes `window.atlas`.
  4. Renderer routes to the active module view based on the module registry.

## 2. World Atlas

- UI: `ui/src/views/atlas/AtlasView.tsx`
- Module: `modules/atlas`
- Data tables: `locations`, `maps`, `location_pins`
- Flow:
  1. Locations and maps are stored through the atlas module schema.
  2. The module emits `atlas:map-loaded` when a map is loaded.
  3. The renderer uses the atlas bridge and `atlas://asset/<id>` protocol to resolve images.

## 3. Party, NPCs, and Factions

- UI: `ui/src/views/party/PartyView.tsx`, `ui/src/views/npcs/NpcsView.tsx`, `ui/src/views/factions/FactionsView.tsx`
- Modules: `modules/party`, `modules/npcs`, `modules/factions`
- Data tables: `party_members`, `party_member_gear`, `party_airships`, `party_airship_cargo`, `party_pets`, `npcs`, `npc_notes`, `factions`, `faction_org_nodes`, `faction_members`, `faction_relations`, `faction_territory`, `faction_reputation`, `faction_resources`, `session_factions`
- Flow:
  1. NPC and faction changes are written through their respective module services.
  2. The factions module listens for `npc:updated`, `location:deleted`, and `quest:updated`.
  3. Factions emits organization, territory, relation, reputation, create, update, and delete events.

## 4. Quests and Plot Threads

- UI: `ui/src/views/quests/QuestsView.tsx`
- Module: `modules/quests`
- Data tables: `plot_threads`, `quests`, `quest_objectives`, `quest_notes`, `quest_npcs`
- Flow:
  1. Quests and plot threads are stored independently but linked through `plot_thread_id` and join tables.
  2. The quest module emits `quest:created`, `quest:updated`, and `quest:completed`.
  3. `quest:failed` is consumed by the timeline module, but it is not yet declared in `core/events/src/registry.ts`.

## 5. Sessions and Encounter Scenes

- UI: `ui/src/views/sessions/SessionsView.tsx`
- Module: `modules/sessions`
- Data tables: `sessions`, `session_notes`, `session_prep_items`, `session_scenes`, `session_quests`, `session_npcs`, `session_scene_npcs`, `session_scene_monsters`, `session_scene_minis`
- Flow:
  1. Sessions store planning data, recap notes, and ordered scenes.
  2. Scene encounters can reference NPCs, monsters, and minis.
  3. The module emits `session:started`, `session:ended`, and `session:encounter-updated`.
  4. `session:encounter-updated` is used by code, but it is not yet present in the shared event registry.

## 6. Timeline

- UI: `ui/src/views/timeline/TimelineView.tsx`
- Module: `modules/timeline`
- Data tables: `campaign_events`, `campaign_event_npcs`, `event_causality`
- Flow:
  1. Timeline auto-creates entries from quest and session lifecycle events.
  2. The module currently subscribes to `quest:created`, `quest:completed`, `quest:failed`, and `session:ended`.
  3. It emits `timeline:entry-added` for renderer updates and other consumers.

## 7. Bestiary, Mini Catalogue, and Dungeon Generation

- Bestiary UI: `ui/src/views/bestiary/*`
- Mini catalogue UI: `ui/src/views/mini-catalogue/*`
- Dungeon UI: `ui/src/views/dungeon/DungeonView.tsx`
- Modules: `modules/bestiary`, `modules/mini-catalogue`, `modules/dungeon`
- Data tables: `monsters`, `minis`, `mini_monsters`, `dungeons`, `dungeon_rooms`, `dungeon_contents`
- Events: `bestiary:created`, `bestiary:updated`, `mini-catalogue:created`, `mini-catalogue:updated`, `dungeon:generated`

## 8. Inspiration and Export

- UI: `ui/src/views/inspiration/*` and `ui/src/views/sessions/PrintSessionView.tsx`
- IPC utility: `modules/inspiration/index.ts`
- Flow:
  1. Inspiration generation is offline and table-driven.
  2. Image inspiration uses campaign assets and random CSS filters.
  3. Session export writes HTML into the campaign `exports/` directory.
