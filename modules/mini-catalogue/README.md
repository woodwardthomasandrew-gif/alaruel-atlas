# modules/mini-catalogue

Physical miniature collection tracking linked to monsters.

## Responsibility

- Owns the `minis` and `mini_monsters` tables
- Emits `mini-catalogue:created` and `mini-catalogue:updated`
- Depends on the bestiary module for monster linkage

## Key Files

- `src/module.ts`
- `src/service.ts`
- `src/repository.ts`
- `src/schema.ts`
- `src/types.ts`
- `src/views/MiniCatalogueView.tsx`

## Rules

- Do not import from other modules
- Use `@alaruel/core-events` for cross-module communication
- Use `@alaruel/core-database` for persistence
