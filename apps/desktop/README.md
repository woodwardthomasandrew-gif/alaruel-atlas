# apps/desktop/

Electron main process — the native desktop wrapper.

## Responsibilities
- Window creation and management
- Boot sequence: initialises all core systems before the renderer loads
- IPC bridge: typed channels between renderer (React) and main (Node.js)
- OS integration: file open/save dialogs, menu bar, system tray

## Boot sequence
```
main.ts
  └─ 1. createLogger()
  └─ 2. loadConfig()
  └─ 3. openDatabase(campaignPath)
  └─ 4. initAssetManager()
  └─ 5. initEventBus()
  └─ 6. loadPlugins()
  └─ 7. createMainWindow()  →  loads renderer
```

## IPC channels (planned)
| Channel                  | Direction       | Purpose                  |
|--------------------------|-----------------|--------------------------|
| `campaign:open`          | renderer → main | Open a campaign file     |
| `campaign:create`        | renderer → main | Create a new campaign    |
| `db:query`               | renderer → main | Read data                |
| `db:run`                 | renderer → main | Write data               |
| `assets:resolve`         | renderer → main | Resolve asset:// URL     |
