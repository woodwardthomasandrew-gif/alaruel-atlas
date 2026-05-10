# TypeScript Types and Interfaces

This reference focuses on the canonical data contracts used across modules (`shared/src/types/*`, `modules/*/src/types.ts`, `ui/src/types/*`, `core/*/src/types.ts`).

For a raw declaration inventory across repo TS files, see `types-index.md`.

## Canonical Type Families

- `shared/src/types/*` contains the cross-cutting domain contracts.
- `modules/*/src/types.ts` contains module-local row, input, and query DTOs.
- `ui/src/types/*` contains renderer-only transport and print types.
- `core/*/src/types.ts` contains infrastructure contracts such as database, event, config, asset, plugin, and logger interfaces.

## Practical Reading Order

If you need the exact shape of a value, check the source file that owns it first. The most common entrypoints are:

- `shared/src/types/session.ts`
- `shared/src/types/quest.ts`
- `shared/src/types/npc.ts`
- `shared/src/types/faction.ts`
- `shared/src/types/location.ts`
- `shared/src/types/monster.ts`
- `shared/src/types/asset.ts`
- `shared/src/types/plugin.ts`
- `modules/*/src/types.ts`
- `ui/src/types/*`

## Complete Declaration Inventory

Generated from repository scan: [`types-index.md`](./types-index.md)
