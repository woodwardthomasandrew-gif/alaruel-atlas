# modules/dungeon

Procedural dungeon generation and saved dungeon layouts.

## Responsibility

- Owns the `dungeons`, `dungeon_rooms`, and `dungeon_contents` tables
- Emits `dungeon:generated`
- Provides generator utilities and saved dungeon persistence

## Key Files

- `src/module.ts`
- `src/service.ts`
- `src/repository.ts`
- `src/schema.ts`
- `src/generator.ts`
- `src/randomTables.ts`
- `src/types.ts`
- `src/views/DungeonView.tsx`

## Rules

- Do not import from other modules
- Use `@alaruel/core-events` for cross-module communication
- Use `@alaruel/core-database` for persistence
