# ui/

React renderer application for the Electron window content.

## Responsibilities

- Application shell, navigation, and title bar
- Module view routing
- Module registry mapping module IDs to view components
- Global UI state for open campaign, active view, and theme

## Key Files

| File | Purpose |
|---|---|
| `src/main.tsx` | Renderer entry point |
| `src/App.tsx` | Root component and providers |
| `src/router/routes.ts` | Route definitions |
| `src/registry/module-registry.ts` | Module to view mapping |
| `src/layouts/AppShell.tsx` | Persistent chrome |
| `src/store/campaign.store.ts` | Active campaign global state |

## Rules

- UI never imports module internals; it only imports from module `index.ts`
- New modules add themselves to the registry, not the router directly

## Current Views

- Party, Sessions, Quests, Characters, Factions, World Atlas, Timeline, Relations, Bestiary, Dungeons, Assets, Mini Catalogue, Generators, and Inspiration
