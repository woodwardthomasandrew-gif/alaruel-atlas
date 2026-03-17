# core/plugins

Plugin loader and lifecycle manager.

## Responsibilities
- Discover plugins in `data/plugins/`
- Validate `plugin.json` manifests
- Sandbox each plugin (restricted API surface)
- Manage load / unload lifecycle
- Emit `plugin:loaded` / `plugin:unloaded` events

## Plugin manifest shape (plugin.json)
```json
{
  "id": "my-plugin",
  "name": "My Plugin",
  "version": "1.0.0",
  "entry": "index.js",
  "permissions": ["events:subscribe", "db:read"]
}
```
