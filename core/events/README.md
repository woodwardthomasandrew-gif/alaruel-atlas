# core/events

Typed publish/subscribe event bus.

## Responsibilities

- Provides `emit`, `subscribe`, `unsubscribe`, `once`, `clear`, and `listenerCount`
- Enforces payload types via the `AppEventMap` registry
- Is the sole legal channel for cross-module communication

## Rules

- Modules NEVER call each other directly
- All cross-module side-effects are triggered by events
- New events must be added to `registry.ts` before use

## Registry Snapshot

Current registry groups include quests, NPCs, factions, sessions, timeline, atlas, plugins, dungeon, bestiary, mini-catalogue, and app lifecycle events.
