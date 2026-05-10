# modules/graph

Narrative relationship graph.

## Responsibility

- Owns the `entity_relationships`, `graph_layout_state`, `graph_node_overlays`, and `graph_relationship_overlays` tables
- Exposes `GraphModule` and `GraphService`

## Key Files

- `src/module.ts`
- `src/service.ts`
- `src/repository.ts`
- `src/schema.ts`
- `src/types.ts`
- `src/views/GraphView.tsx`

## Rules

- Do not import from other modules
- Use `@alaruel/core-events` for cross-module communication
- Use `@alaruel/core-database` for persistence
