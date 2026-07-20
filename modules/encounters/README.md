# modules/encounters

The Encounter Workspace — the central hub for planning, running, and printing
tabletop encounters. Acts as connective tissue between the Bestiary, Mini
Vault (mini-catalogue), Party Tracker, Session Planner, Dungeon Generator,
Combat Tracker, and Print System.

## Responsibility

- Owns the `encounters`, `encounter_monsters`, `encounter_minis`, and
  `encounter_npc_allies` tables.
- Emits `encounter:created`, `encounter:updated`, `encounter:deleted`,
  `encounter:roster-updated`, `encounter:minis-updated`, `encounter:run`.
- Exposes `EncountersModule` and `EncountersService`.
- Owns the mini-matching algorithm (`suggestMiniMatches` / `autoAssignMinis`)
  that backs the "Auto Assign Minis" workspace action. This module does not
  reach into other modules' repositories directly — callers (typically the
  UI layer) compose an `OwnedMiniForMatching[]` snapshot from the
  mini-catalogue module and pass it in, keeping modules loosely coupled.

## Key Files

- `src/module.ts` — module manifest, dependsOn `bestiary`, `mini-catalogue`,
  `party`, `npcs`, `sessions`.
- `src/service.ts` — CRUD, roster management, mini-matching/auto-assign,
  print-list builder.
- `src/repository.ts`
- `src/schema.ts` — migration `version: 32`.
- `src/types.ts` — internal row shapes and input DTOs.

## Data Model

An `Encounter` is a first-class, permanent entity (see
`shared/src/types/encounter.ts`). It can be created manually, generated from
a dungeon room (`createFromDungeonRoom`), or referenced by a session
(`session_id`). Enemy roster entries reference bestiary `monster_id` values
rather than duplicating statblocks; `is_encounter_copy` flags an
encounter-specific override so DMs can choose between "link to original
statblock" and "create encounter-specific copy" per the design spec.

## Status / Follow-up Phases

**Phase 1 (backend core), Phase 2 (UI), and Phase 3 (difficulty estimator +
tiled monster/item cards) are complete.** The Encounter Workspace is
reachable from the sidebar (`ui/src/views/encounters/`) with a list +
tabbed detail view: Overview (incl. live Difficulty Estimate), Enemy Roster
(bestiary search/add), Miniatures (owned-mini matching + Auto Assign Minis),
Map & Terrain (incl. terrain modifier toggles), Combat Tools, Rewards (incl.
magic-item reward cards), Notes, and Printing (Encounter Sheet + Miniature
Pull List + tiled Monster Cards + tiled Reward Item Cards).

**Difficulty estimation** (`shared/src/utils/encounterDifficulty.ts`) combines
a standard CR/XP budget (party level × size vs. monster XP, adjusted by the
DMG monster-count multiplier) with a predetermined terrain-modifier catalogue
(chokepoints, high ground, low visibility, hazards, etc.), each nudging
effective monster XP by a fixed percentage that stacks additively before
being applied as a single multiplier. The result reuses the encounter's own
`EncounterDifficulty` tiers (trivial/easy/moderate/hard/deadly) so the
estimate and the manual override live on the same scale.

**Monster/item cards** reuse the full-detail print renderers from the
Bestiary and Magic Items modules (`StatblockPrintView`, `MagicItemPrintView`)
rather than a separate simplified renderer, so large statblocks (multiple
legendary actions, spellcasting, etc.) print in full. Cards are wrapped in
`.ep-card-tile` and tiled via a two-column CSS multi-column layout
(`.ep-card-grid` in `encounter-print.css`) — short cards pack tightly, tall
cards simply take more vertical space in their column, and duplicate roster
entries collapse into one card with a ×N badge.

Note on architecture: the renderer talks to the database directly via
`window.atlas.db.query`/`db.run` (see `apps/desktop/src/preload.ts`), the
same pattern every other view in this app uses — it does not call into
`EncountersService` over IPC. As a result, `ui/src/views/encounters/tabs/EncounterMinisTab.tsx`
contains its own client-side copy of the mini-matching priority algorithm
documented in `service.ts`. If the two ever need to be kept byte-identical,
consider exposing `EncountersService.suggestMiniMatches`/`autoAssignMinis`
over a dedicated IPC channel (mirroring `registerInspirationHandlers` in
`modules/inspiration`) instead of duplicating the logic.

Still left for follow-up phases:

- **Phase 4 — Deeper integrations**: Session Planner scene → Encounter
  linking UI, Dungeon Generator auto-creating Encounter objects per
  populated room, Combat Tracker consuming `conditions`/`legendaryActions`/
  `lairActions` for live initiative tracking, a real battle-map picker for
  `battle_map_asset_id` (currently a notes field only), drag-and-drop
  roster reordering, "Build Encounter From Miniatures" reverse workflow.
- **Phase 5 — Dedicated Initiative Cards**: compact per-creature HP/AC/
  initiative tracker cards, separate from the full statblock cards added in
  Phase 3, for use at the table during a running encounter.
- Party size is currently a manual per-encounter override (`party_size`);
  wiring it to sum `party_members` for a linked `party_id` would remove the
  need to re-enter it per encounter.

## Rules

- All queries are scoped to `campaignId` (see `BaseRepository.campaignId`).
- JSON columns (`tags`, `initiative_presets`, etc.) are always written via
  `JSON.stringify` and parsed defensively on read.
- Cross-module reads (mini ownership, statblock details) are never queried
  directly from this repository — pass pre-fetched data into the service.
