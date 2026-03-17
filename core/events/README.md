# core/events

Typed publish/subscribe event bus.

## Responsibilities
- Provides `emit`, `on`, `off`, `once` API
- Enforces payload types via `AppEventMap` registry
- Is the sole legal channel for cross-module communication

## Rules
- Modules NEVER call each other directly
- All cross-module side-effects are triggered by events
- New events must be added to `registry.ts` before use
