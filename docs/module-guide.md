# Module Development Guide

## Creating a New Module

1. Create `modules/<name>/` with the standard scaffold:
   - `package.json` with the package name `@alaruel/module-<name>`
   - `src/index.ts` - public API barrel
   - `src/types.ts` - domain types
   - `src/schema.ts` - DB schema registration
   - `src/events.ts` - emitted and handled event constants
   - `src/views/` - React view components
   - `README.md`

2. Register the DB schema in `src/schema.ts`.
   - Current schemas follow the actual tables created by the package, not a forced naming convention.

3. Declare events in `src/events.ts`.
   - Add new events to `core/events/src/registry.ts` as part of the same change.

4. Export the module surface from `src/index.ts`.

5. Register the module in `ui/src/registry/module-registry.ts`.

## Rules

- Never import from another module's package
- Never import `better-sqlite3` directly
- Never use `console.log`; use `createLogger('<name>')`
