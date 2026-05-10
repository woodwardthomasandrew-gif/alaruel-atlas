# Plugin Development Guide

## Plugin Structure

```text
my-plugin/
  plugin.json
  index.js
  README.md
```

## Manifest (`plugin.json`)

```json
{
  "id": "my-plugin",
  "name": "My Plugin",
  "version": "1.0.0",
  "entry": "index.js",
  "permissions": ["events:subscribe", "db:read"]
}
```

## Available Permissions

- `events:subscribe`
- `events:emit`
- `db:read`
- `db:write`
- `ui:extend`
- `config:read`
- `config:write`

## Plugin API

Plugins receive a `PluginAPI` object in their `init(api)` function.
See `core/plugins/src/types.ts` for the full API surface.

## Rules

- Plugins run in a sandboxed context
- No direct filesystem access outside `data/plugins/<id>/`
- No direct imports of core packages
