# modules/factions

Manual-first faction manager.

## Responsibility

- Owns the `factions`, `faction_org_nodes`, `faction_members`, `faction_relations`, `faction_territory`, `faction_reputation`, `faction_resources`, and `session_factions` tables
- Emits the faction lifecycle and update events
- Listens for `npc:updated`, `location:deleted`, and `quest:updated`
- Exposes `FactionsModule` and `FactionsService`

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
