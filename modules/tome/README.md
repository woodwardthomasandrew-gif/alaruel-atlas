# modules/tome

The Tome is Atlas 3.0's lightweight campaign reference notebook.

## Responsibility

- Owns the `tome_folders`, `tome_documents`, and `tome_document_links` tables
- Emits document lifecycle events for future integrations
- Exposes `TomeModule` and `TomeService`

## Key Files

- `src/module.ts`
- `src/service.ts`
- `src/repository.ts`
- `src/schema.ts`
- `src/types.ts`
- `src/views/TomeView.tsx`

## Rules

- Do not import from other modules
- Use `@alaruel/core-events` for cross-module communication
- Use `@alaruel/core-database` for persistence
