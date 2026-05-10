# shared/

Shared TypeScript types, React components, hooks, and utilities.
Importable by any package in the monorepo.

## Contents

| Path | Purpose |
|---|---|
| `src/types/` | Canonical domain contracts shared across core, modules, and UI |
| `src/components/` | Reusable React UI primitives |
| `src/hooks/` | Shared React hooks |
| `src/utils/` | Pure utility functions |

## Rules

- No business logic here - only primitives and types
- No imports from `core/` or `modules/`; this package is a leaf node
