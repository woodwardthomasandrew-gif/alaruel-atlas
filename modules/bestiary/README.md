# modules/bestiary

Monster statblock creator and bestiary manager.

## Responsibility

- Owns the `monsters` table
- Emits `bestiary:created` and `bestiary:updated`
- Exposes `BestiaryModule` and `BestiaryService`

## Key Files

- `src/module.ts`
- `src/service.ts`
- `src/repository.ts`
- `src/schema.ts`
- `src/types.ts`
- `src/views/BestiaryView.tsx`

## Rules

- Do not import from other modules
- Use `@alaruel/core-events` for cross-module communication
- Use `@alaruel/core-database` for persistence
