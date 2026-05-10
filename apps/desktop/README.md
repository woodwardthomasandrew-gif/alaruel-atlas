# apps/desktop/

Electron main process and native desktop wrapper.

## Responsibilities

- Window creation and management
- Boot sequence for logger, config, assets, modules, IPC, window, and plugins
- IPC bridge between renderer and main process
- OS integration for dialogs, menu actions, protocol handling, and file reveal

## Boot Sequence

```text
main.ts
  -> configureLogger()
  -> configManager.load()
  -> assetManager.init()
  -> moduleLoader.register()/initAll()
  -> createMainWindow()
  -> registerIpcHandlers()/registerEventForwards()
  -> pluginLoader.loadAll()
```

## IPC Channels

- `campaign:open`
- `campaign:create`
- `campaign:close`
- `campaign:listRecent`
- `campaign:pickFile`
- `campaign:saveFile`
- `db:query`
- `db:run`
- `assets:resolve`
- `assets:import`
- `assets:pickFile`
- `app:getVersion`
- `app:getPaths`
- `app:showInFolder`
- `export:saveSessionHtml`
- `inspiration:generate`
- `inspiration:listImages`

## Protocols

- `atlas://asset/<id>` resolves campaign asset files for the renderer.
