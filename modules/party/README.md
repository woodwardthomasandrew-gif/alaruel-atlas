# modules/party

Party roster, gear, combat airship operations, cargo, and companion tracking.

## Responsibility

- Owns the `party_members`, `party_member_gear`, `party_airships`, `party_airship_cargo`, and `party_pets` tables
- Persists airship combat state, crew roster JSON, ship systems JSON, attachment slots JSON, and weapon JSON inside `party_airships`
- Provides the party module lifecycle and service surface

## Key Files

- `src/module.ts`
- `src/schema.ts`
- `src/index.ts`

## Rules

- Do not import from other modules
- Use `@alaruel/core-events` for cross-module communication
- Use `@alaruel/core-database` for persistence
