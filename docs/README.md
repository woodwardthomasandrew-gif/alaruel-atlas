# Generated Developer Documentation

This folder contains generated documentation for the Alaruel Atlas repository.

## Sections

- [Modules Overview](./modules.md)
- [TypeScript Types and Interfaces](./types.md)
- [Types Declaration Index](./types-index.md)
- [Database Schema](./database.md)
- [Feature Reference](./features.md)
- [Entity Relationships](./relationships.md)

## Scope Notes

- Type references prioritize canonical contracts in `shared/`, `core/*/src/types.ts`, `modules/*/src/types.ts`, `ui/src/types/`, and desktop bridge interfaces.
- `types-index.md` is the complete declaration scan (`type` + `interface`) across first-party TS/TSX files for cross-checking completeness.
- DB mapping is sourced from `core/database/schema/full.sql` plus module schema registrations.
