# core/plugins

Plugin loader and lifecycle manager.

## Responsibilities

- Discover plugins in `data/plugins/`
- Validate `plugin.json` manifests
- Build a permission-gated plugin API surface
- Manage load and unload lifecycle
- Emit `plugin:loaded` and `plugin:unloaded`

## Plugin Manifest Shape

```json
{
  "id": "my-plugin",
  "name": "My Plugin",
  "version": "1.0.0",
  "entry": "index.js",
  "permissions": ["events:subscribe", "db:read"]
}
```

## Permissions

- `events:subscribe`
- `events:emit`
- `db:read`
- `db:write`
- `ui:extend`
- `config:read`
- `config:write`
