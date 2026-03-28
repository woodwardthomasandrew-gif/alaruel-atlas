# Feature Reference

This section summarizes feature behavior and data flow across UI -> bridge -> modules -> DB.

## 1. Orb of Inspiration

- UI: `ui/src/views/inspiration/*` (`InspirationView`, `CrystalBallView`, `VisionItem`).
- Engine: `modules/inspiration/InspirationGenerator.ts`.
- Flow:
  1. Renderer calls `atlas.inspiration.generate(...)` through bridge.
  2. Desktop IPC forwards to inspiration module.
  3. `InspirationGenerator.generate()` returns offline random-table results (`plot`, `npc`, `location`, `encounter`, `item`).
  4. UI renders generated visions and optional capture state.
- Persistence: no dedicated table; generated text is transient unless user stores it elsewhere.

## 2. Mini Catalogue

- UI: `ui/src/views/mini-catalogue/*`.
- Module: `modules/mini-catalogue` (`service.ts`, `repository.ts`, `schema.ts`).
- Data tables: `minis`, `mini_monsters`.
- Flow:
  1. UI queries minis via bridge SQL/module APIs.
  2. `MiniCatalogueService` validates and writes (`create`, `update`, `delete`, `linkMonster`).
  3. Repository maps `MiniRow` <-> `Mini` DTO.
  4. Events emitted: `mini-catalogue:created`, `mini-catalogue:updated`.

## 3. Dungeon Generator

- UI: `ui/src/views/dungeon/DungeonView.tsx`.
- Module: `modules/dungeon/src/generator.ts` + `service/repository`.
- Data tables: `dungeons`, `dungeon_rooms`, `dungeon_contents`.
- Flow:
  1. User requests generation with theme/size/room count.
  2. `generateDungeon()` creates reproducible layout from seeded PRNG.
  3. Generator classifies rooms (combat/trap/treasure/boss/etc.) and populates themed content payloads.
  4. Persisted in dungeon tables; UI reads back and renders map/summary.

## 4. Statblock Maker (Bestiary)

- UI: `ui/src/views/bestiary/*` (`MonsterCreateModal`, `MonsterDetail`, `StatblockRenderer`, `StatblockPrintView`).
- Module: `modules/bestiary`.
- Data table: `monsters`.
- Flow:
  1. Monster CRUD through module/repository using `CreateMonsterInput` / `UpdateMonsterInput`.
  2. Statblock fields are stored in structured columns + JSON blobs (`actions`, `traits`, saves, skills).
  3. UI composes printable renderers from stored data.
  4. Events: `bestiary:created`, `bestiary:updated`.

## 5. Session Planner

- UI: `ui/src/views/sessions/SessionsView.tsx`.
- Module: `modules/sessions`.
- Data tables: `sessions`, `session_notes`, `session_prep_items`, `session_scenes`, `session_scene_*` joins.
- Flow:
  1. Session creation/update via `SessionsService`.
  2. Scene-level encounter composition (NPCs/monsters/minis) persisted in dedicated join tables.
  3. Session emits lifecycle + encounter events (`session:started`, `session:ended`, `session:encounter-updated`).
  4. UI can print via `PrintSessionView` + print resolver.

## 6. Relations Graph

- UI: `ui/src/views/graph/GraphView.tsx`.
- Module: `modules/graph`.
- Data table: `entity_relationships`.
- Flow:
  1. Relationship records created from entities (`source_id/type`, `target_id/type`, edge metadata).
  2. Graph query layer maps rows into `GraphNode`/`GraphEdge` views.
  3. UI applies force-layout + filtering by entity/edge types.

## 7. Export / Print

- Session print: `ui/src/views/sessions/PrintSessionView.tsx`, `ui/src/types/print.ts`, `ui/src/utils/printResolver.ts`.
- Bestiary print: `StatblockPrintModal`, `StatblockPrintView`, `StatblockRenderer`.
- Flow:
  1. UI resolves canonical entity data into print DTOs (`PrintableSession`, `PrintableEncounter`, `PrintableMonster`).
  2. Renderers normalize and format content for print-safe layout.
  3. Browser/Electron print pipeline handles final output.
