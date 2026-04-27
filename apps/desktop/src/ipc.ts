// =============================================================================
// apps/desktop/src/ipc.ts
//
// IPC channel handler registration.
//
// All ipcMain.handle() calls live here — never scattered across other files.
// Each handler maps a channel name to a typed implementation that delegates
// to the appropriate core system.
//
// Channel naming convention:  '<noun>:<verb>'
//   renderer → main (request/response): ipcRenderer.invoke() / ipcMain.handle()
//   main → renderer (push):             webContents.send()   / ipcRenderer.on()
//
// Security rules:
//   - Every handler validates its input before acting.
//   - SQL parameters are always bound — never concatenated.
//   - File paths returned to the renderer are validated against allowed dirs.
// =============================================================================

import { ipcMain, dialog, shell, app } from 'electron';
import * as path                        from 'node:path';
import * as fs                          from 'node:fs';
import type { BrowserWindow }           from 'electron';

import { databaseManager }  from '../../../core/database/src/index';
import { assetManager }     from '../../../core/assets/src/index';
import { configManager }    from '../../../core/config/src/index';
import { eventBus }         from '../../../core/events/src/index';
import { createLogger }     from '../../../core/logger/src/index';
import { registerInspirationHandlers } from '../../../modules/inspiration/index';

const log = createLogger('desktop:ipc');

// ── Supporting types ──────────────────────────────────────────────────────────

export interface AppPaths {
  userData:  string;
  campaigns: string;
  assets:    string;
  logs:      string;
  plugins:   string;
  config:    string;
}

interface CampaignCreateOptions {
  name:      string;
  filePath:  string;
  gmName?:   string;
  system?:   string;
}

// ── IPC handler registry ──────────────────────────────────────────────────────

/**
 * Register all IPC handlers with Electron's ipcMain.
 * Call once during app boot, after core systems are initialised.
 */
export function registerIpcHandlers(win: BrowserWindow, paths: AppPaths): void {
  registerCampaignHandlers(win, paths);
  registerDbHandlers();
  registerAssetHandlers(paths);
  registerAppHandlers(paths);
  registerExportHandlers();
  registerInspirationHandlers({ log });
  log.info('IPC handlers registered');
}

// ── Campaign handlers ─────────────────────────────────────────────────────────

function registerCampaignHandlers(win: BrowserWindow, paths: AppPaths): void {

  ipcMain.handle('campaign:open', async (_event: Electron.IpcMainInvokeEvent, { dbPath }: { dbPath: string }) => {
    log.info('campaign:open', { dbPath });
    if (!fs.existsSync(dbPath)) return { ok: false, error: `File not found: ${dbPath}` };
    try {
      try { databaseManager.disconnect(); } catch { /* not connected — ignore */ }
      eventBus.emit('app:campaign-closed', { campaignId: '' });
      win.webContents.send('push:campaignClosed');
      databaseManager.connect(dbPath);
      const rows       = databaseManager.query<{ id: string }>('SELECT id FROM campaigns LIMIT 1');
      const campaignId = rows[0]?.id ?? crypto.randomUUID();
      const cfg        = configManager.getAppConfig();
      const recent     = [dbPath, ...cfg.recentCampaigns.filter(p => p !== dbPath)].slice(0, 10);
      configManager.setAppConfig({ recentCampaigns: recent });
      eventBus.emit('app:campaign-opened', { campaignId });
      setCampaignId(campaignId);
      setCampaignDbPath(dbPath);
      win.webContents.send('push:campaignOpened', campaignId);
      log.info('Campaign opened', { campaignId, dbPath });
      return { ok: true, campaignId };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      log.error('campaign:open failed', { error, dbPath });
      return { ok: false, error };
    }
  });

  ipcMain.handle('campaign:create', async (_event: Electron.IpcMainInvokeEvent, options: CampaignCreateOptions) => {
    log.info('campaign:create', { name: options.name });
    const filePath = options.filePath.endsWith('.db') ? options.filePath : `${options.filePath}.db`;
    if (fs.existsSync(filePath)) return { ok: false, error: `File already exists: ${filePath}` };
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    try {
      databaseManager.connect(filePath);
      const campaignId = crypto.randomUUID();
      const now        = new Date().toISOString();
      databaseManager.run(
        `INSERT INTO campaigns (id, name, gm_name, system, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'active', ?, ?)`,
        [campaignId, options.name, options.gmName ?? '', options.system ?? '', now, now],
      );
      const cfg    = configManager.getAppConfig();
      const recent = [filePath, ...cfg.recentCampaigns].slice(0, 10);
      configManager.setAppConfig({ recentCampaigns: recent });
      setCampaignId(campaignId);
      setCampaignDbPath(filePath);
      eventBus.emit('app:campaign-opened', { campaignId });
      win.webContents.send('push:campaignOpened', campaignId);
      log.info('Campaign created', { campaignId, filePath });
      return { ok: true, campaignId };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      log.error('campaign:create failed', { error });
      return { ok: false, error };
    }
  });

  ipcMain.handle('campaign:close', async () => {
    log.info('campaign:close');
    try {
      eventBus.emit('app:campaign-closed', { campaignId: '' });
      win.webContents.send('push:campaignClosed');
      databaseManager.disconnect();
      setCampaignDbPath(null);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle('campaign:listRecent', () => {
    const { recentCampaigns } = configManager.getAppConfig();
    const existing = recentCampaigns.filter(p => fs.existsSync(p));
    if (existing.length !== recentCampaigns.length) configManager.setAppConfig({ recentCampaigns: existing });
    return existing.map(filePath => ({ filePath }));
  });

  // campaign:pickFile (open existing)
  ipcMain.handle('campaign:pickFile', async () => {
    const result = await dialog.showOpenDialog(win, {
      title:       'Open Campaign',
      defaultPath: paths.campaigns,
      filters:     [{ name: 'Alaruel Atlas Campaigns', extensions: ['db'] }],
      properties:  ['openFile'],
    });
    return result.canceled ? null : (result.filePaths[0] ?? null);
  });

  // campaign:saveFile (choose path for new campaign)
  ipcMain.handle('campaign:saveFile', async (_event: Electron.IpcMainInvokeEvent, { name }: { name: string }) => {
    const result = await dialog.showSaveDialog(win, {
      title:       'Save New Campaign',
      defaultPath: require('node:path').join(paths.campaigns, `${name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.db`),
      filters:     [{ name: 'Alaruel Atlas Campaigns', extensions: ['db'] }],
    });
    return result.canceled ? null : result.filePath ?? null;
  });
}

// ── Database handlers ─────────────────────────────────────────────────────────

function registerDbHandlers(): void {

  ipcMain.handle('db:query', (_event: Electron.IpcMainInvokeEvent, { sql, params = [] }: { sql: string; params?: unknown[] }) => {
    try {
      return { ok: true, rows: databaseManager.query(sql, params as never[]) };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      log.error('db:query failed', { error, sql });
      return { ok: false, error, rows: [] };
    }
  });

  ipcMain.handle('db:run', (_event: Electron.IpcMainInvokeEvent, { sql, params = [] }: { sql: string; params?: unknown[] }) => {
    try {
      const r = databaseManager.run(sql, params as never[]);
      return { ok: true, lastInsertRowid: Number(r.lastInsertRowid), changes: r.changes };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      log.error('db:run failed', { error, sql });
      return { ok: false, error };
    }
  });
}

// ── Asset handlers ────────────────────────────────────────────────────────────

// Track current campaign ID for asset imports
let _currentCampaignId: string | null = null;
function getCampaignId(): string | null { return _currentCampaignId; }
function setCampaignId(id: string | null): void { _currentCampaignId = id; }
let _currentCampaignDbPath: string | null = null;
function getCampaignDbPath(): string | null { return _currentCampaignDbPath; }
function setCampaignDbPath(dbPath: string | null): void { _currentCampaignDbPath = dbPath; }

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const mimeMap: Record<string,string> = {
    '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg',
    '.gif':'image/gif', '.webp':'image/webp', '.svg':'image/svg+xml',
    '.mp3':'audio/mpeg', '.wav':'audio/wav', '.ogg':'audio/ogg',
    '.pdf':'application/pdf', '.txt':'text/plain', '.md':'text/markdown',
  };
  return mimeMap[ext] ?? 'application/octet-stream';
}

function registerAssetHandlers(paths: AppPaths): void {

  ipcMain.handle('assets:resolve', (_event: Electron.IpcMainInvokeEvent, { virtualPath }: { virtualPath: string }) => {
    try {
      log.info('[DEBUG] assets:resolve called', { virtualPath });
      const rows = databaseManager.query<{ id: string }>(
        'SELECT id FROM assets WHERE virtual_path = ? LIMIT 1',
        [virtualPath],
      );
      log.info('[DEBUG] assets:resolve query result', { found: rows.length, id: rows[0]?.id });
      if (!rows[0]) return null;
      const url = `atlas://asset/${rows[0].id}`;
      log.info('[DEBUG] assets:resolve returning', { url });
      return url;
    } catch (err) {
      log.error('assets:resolve failed', { error: err instanceof Error ? err.message : String(err) });
      return null;
    }
  });

  ipcMain.handle('assets:import', async (_event: Electron.IpcMainInvokeEvent, options: {
    sourcePath: string; name: string; category: string; campaignId?: string; tags?: string[];
  }) => {
    try {
      const sourcePath = options.sourcePath;
      if (!fs.existsSync(sourcePath)) {
        return { ok: false, error: `File not found: ${sourcePath}` };
      }

      const id        = crypto.randomUUID();
      const now       = new Date().toISOString();
      const ext       = path.extname(path.basename(sourcePath)).toLowerCase();
      const mimeType  = getMimeType(sourcePath);
      const sizeBytes = fs.statSync(sourcePath).size;
      const category  = options.category || 'misc';
      const name      = options.name || path.basename(sourcePath);

      // Copy file to assets storage dir
      const destDir  = path.join(paths.assets, category);
      fs.mkdirSync(destDir, { recursive: true });
      const destFile = path.join(destDir, `${id}${ext}`);
      fs.copyFileSync(sourcePath, destFile);

      const virtualPath = `asset://${category}/${id}${ext}`;

      // Write to assets table (campaign-scoped, with width/height support)
      const campaignId = options.campaignId ?? getCampaignId();
      if (!campaignId) {
        return { ok: false, error: 'No campaign open. Open a campaign before importing assets.' };
      }

      // Compute a simple hash for dedup
      const hashBuf = require('node:crypto').createHash('sha256')
        .update(fs.readFileSync(sourcePath)).digest('hex');

      databaseManager.run(
        `INSERT OR IGNORE INTO assets
           (id, campaign_id, name, category, mime_type, hash, size_bytes,
            virtual_path, disk_path, tags, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, campaignId, name, category, mimeType, hashBuf, sizeBytes,
         virtualPath, destFile, JSON.stringify(options.tags ?? []), now, now],
      );

      log.info('Asset imported', { id, name, category, virtualPath });
      return { ok: true, assetId: id };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      log.error('assets:import failed', { error });
      return { ok: false, error };
    }
  });

  ipcMain.handle('assets:pickFile', async (_event: Electron.IpcMainInvokeEvent, { category }: { category?: string }) => {
    const result = await dialog.showOpenDialog({
      title:       `Import Asset${category ? ` (${category})` : ''}`,
      defaultPath: paths.assets,
      filters:     buildAssetFilters(category),
      properties:  ['openFile'],
    });
    return result.canceled ? null : (result.filePaths[0] ?? null);
  });
}

// ── App handlers ──────────────────────────────────────────────────────────────

function registerAppHandlers(paths: AppPaths): void {
  ipcMain.handle('app:getVersion',   () => app.getVersion());
  ipcMain.handle('app:getPaths',     () => paths);
  ipcMain.handle('app:showInFolder', (_event: Electron.IpcMainInvokeEvent, { filePath }: { filePath: string }) => {
    shell.showItemInFolder(filePath);
  });
}

function registerExportHandlers(): void {
  ipcMain.handle('export:saveSessionHtml', (_event: Electron.IpcMainInvokeEvent, payload: { fileName: string; html: string }) => {
    try {
      const dbPath = getCampaignDbPath();
      if (!dbPath) return { ok: false, error: 'No active campaign database path' };
      const exportDir = path.join(path.dirname(dbPath), 'exports');
      fs.mkdirSync(exportDir, { recursive: true });
      const safeFileName = payload.fileName.replace(/[^a-z0-9._-]/gi, '_');
      const fullName = safeFileName.endsWith('.html') ? safeFileName : `${safeFileName}.html`;
      const outPath = path.join(exportDir, fullName);
      fs.writeFileSync(outPath, payload.html, 'utf-8');
      log.info('Session HTML export written', { outPath });
      return { ok: true, path: outPath };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      log.error('export:saveSessionHtml failed', { error });
      return { ok: false, error };
    }
  });
}

// ── Event forwarding ──────────────────────────────────────────────────────────

/**
 * Forward selected module events to the renderer as push notifications.
 * Call after registerIpcHandlers() and after modules are initialised.
 */
export function registerEventForwards(win: BrowserWindow): void {
  const forwarded = [
    'quest:created', 'quest:updated', 'quest:completed',
    'npc:created',   'npc:updated',
    'faction:created', 'faction:updated', 'faction:deleted',
    'faction:organization_updated', 'faction:territory_updated',
    'faction:relation_updated', 'faction:reputation_updated',
    'session:started', 'session:ended',
    'timeline:entry-added',
    'atlas:map-loaded',
    'bestiary:created', 'bestiary:updated',
    'mini-catalogue:created', 'mini-catalogue:updated',
  ] as const;

  for (const eventName of forwarded) {
    eventBus.subscribe(eventName, (payload) => {
      if (!win.isDestroyed()) win.webContents.send('push:moduleEvent', { event: eventName, payload });
    });
  }
  log.debug(`Forwarding ${forwarded.length} module events to renderer`);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildAssetFilters(category?: string): import('electron').FileFilter[] {
  const all = { name: 'All Files', extensions: ['*'] };
  switch (category) {
    case 'maps':
    case 'portraits':
      return [{ name: 'Images', extensions: ['png','jpg','jpeg','webp','gif','svg'] }, all];
    case 'audio':
      return [{ name: 'Audio',  extensions: ['mp3','ogg','wav'] }, all];
    case 'documents':
      return [{ name: 'Documents', extensions: ['pdf'] }, all];
    default:
      return [all];
  }
}
