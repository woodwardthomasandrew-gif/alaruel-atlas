# Generated Developer Documentation

These pages are derived from the current codebase. If they disagree with the source, the source wins.

## Sections

- [Modules Overview](./modules.md)
- [TypeScript Types and Interfaces](./types.md)
- [Types Declaration Index](./types-index.md)
- [Database Schema](./database.md)
- [Feature Reference](./features.md)
- [Entity Relationships](./relationships.md)
- [Event Reference](./event-reference.md)

## Scope Notes

- Module inventories follow `package.json` and each package `src/index.ts`.
- Database references follow the runtime schema registrations in `modules/*/src/schema.ts` and `core/database/src/index.ts`.
- Event references follow `core/events/src/registry.ts`, plus the direct event forwarding in `apps/desktop/src/ipc.ts`.
- `types-index.md` is the raw declaration scan for the repository and is useful as a completeness check.
