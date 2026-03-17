# Module Development Guide

## Creating a new module

1. Create `modules/<name>/` with the standard scaffold:
   - `package.json` (name: `@alaruel/module-<name>`)
   - `src/index.ts`     — public API barrel
   - `src/types.ts`     — domain types
   - `src/schema.ts`    — DB schema registration
   - `src/events.ts`    — event subscriptions and emissions
   - `src/views/`       — React view components
   - `src/components/`  — module-local UI components
   - `src/hooks/`       — module-local React hooks
   - `README.md`

2. Register the DB schema in `src/schema.ts`.
   Table names must be prefixed: `<modulename>_<table>`.

3. Declare events in `src/events.ts`.
   Add new events to `core/events/src/registry.ts` first.

4. Export the root view from `src/index.ts`.

5. Register the module in `ui/src/registry/module-registry.ts`.

## Rules
- Never import from another module's package
- Never import `better-sqlite3` directly
- Never use `console.log` — use `createLogger('<name>')`
