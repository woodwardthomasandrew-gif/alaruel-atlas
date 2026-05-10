# modules/party

Party roster, gear, airship, and companion tracking.

## Responsibility

- Owns the `party_members`, `party_member_gear`, `party_airships`, `party_airship_cargo`, and `party_pets` tables
- Provides the party module lifecycle and service surface

## Key Files

- `src/module.ts`
- `src/schema.ts`
- `src/index.ts`

## Rules

- Do not import from other modules
- Use `@alaruel/core-events` for cross-module communication
- Use `@alaruel/core-database` for persistence
