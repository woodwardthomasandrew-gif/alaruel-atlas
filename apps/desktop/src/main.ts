// =============================================================================
// apps/desktop/src/main.ts
//
// Electron main process entry point.
//
// This file owns the application lifecycle and the boot sequence.
// It is the only file in the codebase that:
//   - Imports Electron's app/BrowserWindow APIs
//   - Calls core system singletons in boot order
//   - Creates the main window
//   - Registers all modules with the module loader
//
// Boot sequence:
//   1. Logger       — configure log level and sinks
//   2. Config       — load user.json config file
//   3. Asset Manager — initialise storage directories
//   4. Modules      — register and initialise feature modules
//   5. IPC          — register all renderer ↔ main handlers
//   6. Window       — create and show the BrowserWindow
//   7. Plugins      — discover and load third-party plugins
//
// Note: the DatabaseManager is NOT connected at boot. It is connected on
// demand when the user opens or creates a campaign (via the campaign:open
// and campaign:create IPC handlers). Schema registrations happen during
// module init(); migrations run when the DB is first connected.
// =============================================================================

import { app, Menu, protocol, net } from 'electron';
import * as path              from 'node:path';
import * as fs                from 'node:fs';

// ── Core systems ──────────────────────────────────────────────────────────────
import { configureLogger, createLogger } from '../../../core/logger/src/index';
import { configManager }                 from '../../../core/config/src/index';
import { assetManager }                  from '../../../core/assets/src/index';
import { pluginLoader }                  from '../../../core/plugins/src/index';
import { databaseManager }               from '../../../core/database/src/index';

// ── Module framework ──────────────────────────────────────────────────────────
import { moduleLoader }  from '../../../modules/_framework/src/index';

// ── Feature modules ───────────────────────────────────────────────────────────
import { AtlasModule }    from '../../../modules/atlas/src/index';
import { NpcsModule }     from '../../../modules/npcs/src/index';
import { QuestsModule }   from '../../../modules/quests/src/index';
import { SessionsModule } from '../../../modules/sessions/src/index';
import { TimelineModule } from '../../../modules/timeline/src/index';
import { GraphModule }    from '../../../modules/graph/src/index';
import { AssetsUiModule } from '../../../modules/assets-ui/src/index';
import { DungeonModule }   from '../../../modules/dungeon/src/index';
import { BestiaryModule }        from '../../../modules/bestiary/src/index';
import { MiniCatalogueModule }   from '../../../modules/mini-catalogue/src/index';

// ── Desktop-local modules ─────────────────────────────────────────────────────
import { createMainWindow, isWindowAvailable, focusWindow } from './window';
import { registerIpcHandlers, registerEventForwards }       from './ipc';
import type { AppPaths }                                    from './ipc';

// ── Logger ────────────────────────────────────────────────────────────────────

const isDev = process.env['NODE_ENV'] === 'development';

configureLogger({ minLevel: isDev ? 'debug' : 'info' });
const log = createLogger('desktop:main');

// ── Application state ─────────────────────────────────────────────────────────

let mainWindow:  Electron.BrowserWindow | null = null;
let appPaths:    AppPaths;
let isQuitting = false;

// ── Data directory resolution ─────────────────────────────────────────────────

/**
 * Resolve all runtime data directories.
 * Creates them if they don't exist.
 */
function resolveAppPaths(): AppPaths {
  const userData = app.getPath('userData');
  const paths: AppPaths = {
    userData,
    campaigns: path.join(userData, 'campaigns'),
    assets:    path.join(userData, 'assets'),
    logs:      path.join(userData, 'logs'),
    plugins:   path.join(userData, 'plugins'),
    config:    path.join(userData, 'config'),
  };
  for (const dir of Object.values(paths)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return paths;
}

// ── Boot sequence ─────────────────────────────────────────────────────────────

/**
 * Full application boot.
 * Called once from app.whenReady().
 */
async function boot(): Promise<void> {
  log.info('Alaruel Atlas starting', {
    version:  app.getVersion(),
    electron: process.versions['electron'],
    node:     process.versions.node,
    platform: process.platform,
    isDev,
  });

  // ── Step 1: Paths ──────────────────────────────────────────────────────────
  appPaths = resolveAppPaths();
  log.debug('Data paths resolved', appPaths);

  // ── Step 2: Config ─────────────────────────────────────────────────────────
  const configPath = path.join(appPaths.config, 'user.json');
  configManager.load(configPath);
  log.info('Config loaded', { configPath });

  // Apply saved log level from config.
  const { logLevel } = configManager.getAppConfig();
  configureLogger({ minLevel: logLevel });

  // ── Step 3: Asset Manager ──────────────────────────────────────────────────
  // Initialises storage directories.
  // Schema registration happens inside the module, which is booted in step 5.
  assetManager.init(appPaths.assets);
  log.info('Asset manager initialised');

  // ── Step 4: Application menu ───────────────────────────────────────────────
  buildApplicationMenu();

  // ── Step 5: Modules ────────────────────────────────────────────────────────
  // Register all modules. The loader will boot them in dependency order.
  // Each module's onInit() calls ctx.registerSchema() — migrations are stored
  // and will run when a campaign is opened.
  log.info('Registering feature modules');
  moduleLoader.register(new AtlasModule());
  moduleLoader.register(new NpcsModule());
  moduleLoader.register(new QuestsModule());
  moduleLoader.register(new SessionsModule());
  moduleLoader.register(new TimelineModule());
  moduleLoader.register(new GraphModule());
  moduleLoader.register(new AssetsUiModule());
  moduleLoader.register(new DungeonModule());
  moduleLoader.register(new BestiaryModule());
  moduleLoader.register(new MiniCatalogueModule());

  const summary = await moduleLoader.initAll();
  log.info('Module boot complete', {
    active:  summary.succeeded,
    failed:  summary.failed.map((f: { id: string; error: string }) => `${f.id}: ${f.error}`),
    skipped: summary.skipped.map((s: { id: string; reason: string }) => `${s.id}: ${s.reason}`),
  });

  if (summary.failed.length > 0) {
    log.warn(`${summary.failed.length} module(s) failed to initialise — continuing without them`);
  }

  // ── Step 6: BrowserWindow ─────────────────────────────────────────────────

  // Register atlas:// protocol so the renderer can load asset images directly
  // from disk without routing large files through IPC.
  // URL format: atlas://asset/<assetId>
  // Looks up disk_path in the campaign 'assets' table by asset ID.
  protocol.handle('atlas', (request) => {
    try {
      log.info('[DEBUG] atlas:// request', { url: request.url });
      const url     = new URL(request.url);
      const assetId = url.pathname.replace(/^\//, '');
      log.info('[DEBUG] atlas:// assetId extracted', { assetId });
      const rows    = databaseManager.query<{ disk_path: string }>(
        'SELECT disk_path FROM assets WHERE id = ? LIMIT 1',
        [assetId],
      );
      log.info('[DEBUG] atlas:// db result', { found: rows.length, disk_path: rows[0]?.disk_path });
      if (!rows[0]) return new Response('Asset not found', { status: 404 });
      const diskUrl = 'file://' + rows[0].disk_path.replace(/\\/g, '/');
      log.info('[DEBUG] atlas:// fetching', { diskUrl });
      return net.fetch(diskUrl);
    } catch (err) {
      log.error('atlas:// protocol error', { error: err instanceof Error ? err.message : String(err) });
      return new Response('Internal error', { status: 500 });
    }
  });

  const preloadPath = path.join(__dirname, 'preload.js');
  const rendererUrl = isDev ? 'http://localhost:5173' : undefined;

  mainWindow = createMainWindow(preloadPath, rendererUrl);
  log.info('BrowserWindow created');

  // ── Step 7: IPC handlers ───────────────────────────────────────────────────
  registerIpcHandlers(mainWindow, appPaths);
  registerEventForwards(mainWindow);
  log.info('IPC handlers registered');

  // ── Step 8: Plugins ────────────────────────────────────────────────────────
  // Loaded last so all modules are active before plugins can subscribe to events.
  await pluginLoader.loadAll(appPaths.plugins);
  log.info('Plugin loading complete', { loaded: pluginLoader.loadedPluginIds() });

  log.info('Boot complete — application ready');
}

// ── Application menu ──────────────────────────────────────────────────────────

function buildApplicationMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        { label: 'New Campaign…',  accelerator: 'CmdOrCtrl+N', click: () => sendToRenderer('menu:newCampaign') },
        { label: 'Open Campaign…', accelerator: 'CmdOrCtrl+O', click: () => sendToRenderer('menu:openCampaign') },
        { type: 'separator' },
        { label: 'Close Campaign', click: () => sendToRenderer('menu:closeCampaign') },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        ...(isDev ? [{ role: 'toggleDevTools' as const }] : []),
        { type: 'separator' as const },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' as const },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        { label: `Alaruel Atlas v${app.getVersion()}`, enabled: false },
        { type: 'separator' },
        {
          label: 'Open Log File',
          click: () => {
            const logFile = path.join(appPaths.logs, 'app.log');
            if (fs.existsSync(logFile)) require('electron').shell.openPath(logFile);
          },
        },
      ],
    },
  ];

  // macOS: add standard app menu as first item
  if (process.platform === 'darwin') {
    template.unshift({
      label: app.getName(),
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    });
  }

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ── Push to renderer ──────────────────────────────────────────────────────────

/** Send a menu-triggered action to the renderer. */
function sendToRenderer(channel: string): void {
  if (isWindowAvailable(mainWindow)) {
    mainWindow.webContents.send(channel);
  }
}

// ── Window lifecycle ──────────────────────────────────────────────────────────

/** macOS: re-create the window if the app icon is clicked with no open windows. */
app.on('activate', () => {
  if (!isWindowAvailable(mainWindow)) {
    if (mainWindow?.isDestroyed()) {
      const preloadPath = path.join(__dirname, 'preload.js');
      const rendererUrl = isDev ? 'http://localhost:5173' : undefined;
      mainWindow = createMainWindow(preloadPath, rendererUrl);
      registerIpcHandlers(mainWindow, appPaths);
      registerEventForwards(mainWindow);
    } else {
      app.whenReady().then(() => boot());
    }
  } else {
    focusWindow(mainWindow);
  }
});

/**
 * macOS: keep the process alive when all windows are closed.
 * Other platforms: quit when all windows are closed.
 */
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// ── Shutdown ──────────────────────────────────────────────────────────────────

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('will-quit', async (event: Electron.Event) => {
  // Give async cleanup one chance to run.
  if (!isQuitting) return;
  event.preventDefault();
  isQuitting = false; // prevent infinite loop

  log.info('Application shutting down');

  try {
    await moduleLoader.destroyAll();
    log.info('Modules destroyed');
  } catch (err) {
    log.error('Module teardown error', { error: err instanceof Error ? err.message : String(err) });
  }

  app.quit();
});

// ── Custom protocol registration ───────────────────────────────────────────────
// Must be called before app.whenReady().
// atlas://asset/<virtualPath> → serves the asset file directly from disk,
// bypassing the sandbox restriction on file:// URLs in the renderer.
protocol.registerSchemesAsPrivileged([
  { scheme: 'atlas', privileges: { secure: true, standard: true, supportFetchAPI: true, stream: true } },
]);

const gotLock = app.requestSingleInstanceLock();

if (!gotLock) {
  // Another instance is already running — quit and let it handle the request.
  log.warn('Another instance is already running — quitting');
  app.quit();
} else {
  app.on('second-instance', () => {
    // Second launch attempt: focus the existing window instead of opening a new one.
    if (isWindowAvailable(mainWindow)) {
      focusWindow(mainWindow);
    }
  });

  // ── Entry point ────────────────────────────────────────────────────────────
  app.whenReady().then(boot).catch((err: unknown) => {
    log.error('Fatal boot error', { error: err instanceof Error ? err.message : String(err) });
    app.exit(1);
  });
}
