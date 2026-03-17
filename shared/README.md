# shared/

Shared TypeScript types, React components, hooks, and utilities.
Importable by any package in the monorepo.

## Contents
| Path                  | Purpose                                       |
|-----------------------|-----------------------------------------------|
| `types/campaign.ts`   | Campaign domain types                         |
| `types/common.ts`     | Utility types (Result, ID, Timestamp, …)      |
| `types/plugin.ts`     | Plugin-facing public types                    |
| `components/`         | Reusable React UI primitives                  |
| `hooks/`              | Shared React hooks                            |
| `utils/`              | Pure utility functions (no side effects)      |

## Rules
- No business logic here — only primitives and types
- No imports from `core/` or `modules/` — this package is a leaf node
