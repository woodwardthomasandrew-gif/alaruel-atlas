# Plugin Development Guide

## Plugin structure
```
my-plugin/
  plugin.json    — manifest
  index.js       — compiled entry point
  README.md
```

## Manifest (plugin.json)
```json
{
  "id": "my-plugin",
  "name": "My Plugin",
  "version": "1.0.0",
  "entry": "index.js",
  "permissions": ["events:subscribe", "db:read"]
}
```

## Available permissions
- `events:subscribe` — listen to app events
- `events:emit`      — emit custom events
- `db:read`          — read from campaign database
- `db:write`         — write to campaign database (restricted tables only)
- `ui:extend`        — register UI extension points

## Plugin API
Plugins receive a `PluginAPI` object in their `init(api)` function.
See `shared/src/types/plugin.ts` for the full API surface.

## Rules
- Plugins run in a sandboxed context
- No direct filesystem access outside `data/plugins/<id>/`
- No direct imports of core packages
