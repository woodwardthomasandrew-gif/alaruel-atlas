# modules/quests

Quest and plot tracking.

## Responsibility

- Owns the `plot_threads`, `quests`, `quest_objectives`, `quest_notes`, and `quest_npcs` tables
- Emits `quest:created`, `quest:updated`, and `quest:completed`
- Exposes `QuestsModule` and `QuestsService`

## Key Files

- `src/module.ts`
- `src/service.ts`
- `src/repository.ts`
- `src/schema.ts`
- `src/types.ts`
- `src/views/QuestsView.tsx`

## Rules

- Do not import from other modules
- Use `@alaruel/core-events` for cross-module communication
- Use `@alaruel/core-database` for persistence
