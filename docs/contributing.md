# Contributing

## Commit Convention

`<type>(<scope>): <description>`

Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`
Scope: module or package name, e.g. `quests`, `core-events`, `ui`

Example: `feat(quests): add quest completion event`

## Branch Naming

`feature/<description>`, `fix/<description>`, `docs/<description>`

## Pull Request Checklist

- [ ] TypeScript compiles with no errors (`pnpm typecheck`)
- [ ] No new cross-module imports
- [ ] New events added to `core/events/src/registry.ts`
- [ ] New tables added to the module's `schema.ts`
- [ ] README updated if the public API changed

## Code Style

- Strict TypeScript - no `any`, no `!` non-null assertions without comment
- No `console.log` - use `createLogger()`
- All domain IDs are `string` (nanoid), never `number`
