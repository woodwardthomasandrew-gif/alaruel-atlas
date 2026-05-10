# modules/assets-ui

Asset browser and import UI.

## Responsibility

- Owns the `assets` and `asset_links` tables used by the renderer and desktop IPC
- Exposes `AssetsUiModule` and `AssetsUiService`

## Key Files

- `src/module.ts`
- `src/service.ts`
- `src/repository.ts`
- `src/schema.ts`
- `src/types.ts`
- `src/views/AssetsUiView.tsx`

## Rules

- Do not import from other modules
- Use `@alaruel/core-events` for cross-module communication
- Use `@alaruel/core-database` for persistence
