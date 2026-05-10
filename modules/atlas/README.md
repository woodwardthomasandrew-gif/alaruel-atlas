# modules/atlas

Interactive world maps and location management.

## Responsibility

- Owns the `locations`, `maps`, and `location_pins` tables
- Emits `atlas:map-loaded`
- Exposes `AtlasModule` and `AtlasService`

## Key Files

- `src/module.ts`
- `src/service.ts`
- `src/repository.ts`
- `src/schema.ts`
- `src/types.ts`
- `src/views/AtlasView.tsx`

## Rules

- Do not import from other modules
- Use `@alaruel/core-events` for cross-module communication
- Use `@alaruel/core-database` for persistence
