# modules/sessions

Session planning, notes, recaps, and encounter management.

## Responsibility

- Owns the `sessions`, `session_notes`, `session_prep_items`, `session_scenes`, `session_quests`, `session_npcs`, `session_scene_npcs`, `session_scene_monsters`, and `session_scene_minis` tables
- Emits `session:started`, `session:ended`, and `session:encounter-updated`
- Exposes `SessionsModule` and `SessionsService`

## Key Files

- `src/module.ts`
- `src/service.ts`
- `src/repository.ts`
- `src/schema.ts`
- `src/types.ts`
- `src/views/SessionsView.tsx`

## Rules

- Do not import from other modules
- Use `@alaruel/core-events` for cross-module communication
- Use `@alaruel/core-database` for persistence
