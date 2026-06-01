# modules/magic-items

Magic item card creator and collection manager.

## Responsibility

- Owns the `magic_items` table
- Emits `magic-items:created`, `magic-items:updated`, and `magic-items:deleted`
- Exposes `MagicItemsModule` and `MagicItemsService`

## Key Files

- `src/module.ts`
- `src/service.ts`
- `src/repository.ts`
- `src/schema.ts`
- `src/types.ts`

## Rules

- Do not import from other modules
- Use `@alaruel/core-events` for cross-module communication
- Use `@alaruel/core-database` for persistence
