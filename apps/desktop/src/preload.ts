// =============================================================================
// apps/desktop/src/preload.ts
//
// Electron preload script.
//
// Runs in a special isolated context that has access to both the DOM (renderer)
// and a limited Node.js/Electron API surface. Its sole job is to expose a
// typed, minimal API to the renderer via contextBridge.
//
// Security contract:
//   - The renderer NEVER gets a reference to `ipcRenderer` directly.
//   - Every exposed function is a named wrapper that only forwards known
//     channels — no wildcard channel forwarding.
//   - The exposed surface (`window.atlas`) is the complete and exclusive
//     bridge between the renderer and the main process.
//
// Renderer usage (after contextBridge exposure):
//   const result = await window.atlas.campaign.open('/path/to/campaign.db');
//   const npc    = await window.atlas.db.query('SELECT * FROM npcs WHERE id = ?', [id]);
// =============================================================================

import { contextBridge, ipcRenderer } from 'electron';

// ── Type-safe channel wrappers ────────────────────────────────────────────────

/**
 * Invoke a main-process handler and return its result.
 * Typed to catch mismatches between channel name and payload/return type.
 */
function invoke<TPayload, TReturn>(
  channel: string,
  payload?: TPayload,
): Promise<TReturn> {
  return ipcRenderer.invoke(channel, payload) as Promise<TReturn>;
}

/**
 * Subscribe to a main-process event pushed to the renderer.
 * Returns a cleanup function — call it to unsubscribe.
 */
function onEvent<TPayload>(
  channel: string,
  handler: (payload: TPayload) => void,
): () => void {
  const listener = (_event: Electron.IpcRendererEvent, payload: TPayload) => {
    handler(payload);
  };
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

// ── Exposed API shape ─────────────────────────────────────────────────────────

/**
 * The complete type of `window.atlas` as seen by the renderer.
 * Kept in this file so the preload and renderer stay in sync.
 * Import this type in the renderer: `import type { AtlasBridge } from '...'`
 */
export interface AtlasBridge {
  // ── Campaign ──────────────────────────────────────────────────────────────
  campaign: {
    /** Open an existing campaign .db file. */
    open:         (dbPath: string)           => Promise<CampaignOpenResult>;
    /** Create a new campaign .db file at the given path. */
    create:       (options: CampaignCreateOptions) => Promise<CampaignOpenResult>;
    /** Close the active campaign. */
    close:        ()                         => Promise<void>;
    /** Return metadata for all recently opened campaigns. */
    listRecent:   ()                         => Promise<CampaignSummary[]>;
    /** Show the OS file-open dialog and return the selected path. */
    pickFile:     ()                         => Promise<string | null>;
    saveFile:     (name: string)             => Promise<string | null>;
  };

  // ── Database ──────────────────────────────────────────────────────────────
  db: {
    /** Execute a SELECT and return typed rows. */
    query:        <T = Record<string, unknown>>(
                    sql:    string,
                    params?: SqlParam[],
                  ) => Promise<T[]>;
    /** Execute INSERT / UPDATE / DELETE. */
    run:          (
                    sql:    string,
                    params?: SqlParam[],
                  ) => Promise<RunResult>;
  };

  // ── Assets ────────────────────────────────────────────────────────────────
  assets: {
    /** Resolve an `asset://` virtual path to a file:// URL the renderer can load. */
    resolve:      (virtualPath: string)      => Promise<string | null>;
    /** Import a file from the OS filesystem into the asset store. */
    import:       (options: AssetImportOptions) => Promise<AssetImportResult>;
    /** Show the OS file-open dialog filtered by asset category. */
    pickFile:     (category?: string)        => Promise<string | null>;
  };

  // ── App ───────────────────────────────────────────────────────────────────
  app: {
    /** Return the current app version string. */
    getVersion:   ()                         => Promise<string>;
    /** Return OS-resolved paths for data directories. */
    getPaths:     ()                         => Promise<AppPaths>;
    /** Open the OS file-manager at the given path. */
    showInFolder: (filePath: string)         => Promise<void>;
  };

  // ── Events (main → renderer pushes) ──────────────────────────────────────
  on: {
    /** Fired when a campaign is successfully opened. */
    campaignOpened:  (handler: (id: string) => void) => () => void;
    /** Fired when the active campaign is closed. */
    campaignClosed:  (handler: () => void)           => () => void;
    /** Fired when any module emits an event the renderer needs. */
    moduleEvent:     (handler: (payload: ModuleEventPayload) => void) => () => void;
  };
}

// ── Supporting types ──────────────────────────────────────────────────────────

type SqlParam = string | number | boolean | null;

interface RunResult {
  lastInsertRowid: number;
  changes:         number;
}

interface CampaignOpenResult {
  ok:          boolean;
  campaignId?: string;
  error?:      string;
}

interface CampaignCreateOptions {
  name:       string;
  filePath:   string;
  gmName?:    string;
  system?:    string;
}

interface CampaignSummary {
  id:           string;
  name:         string;
  filePath:     string;
  lastOpenedAt: string;
}

interface AssetImportOptions {
  sourcePath: string;
  name:       string;
  category:   string;
  tags?:      string[];
}

interface AssetImportResult {
  ok:       boolean;
  assetId?: string;
  error?:   string;
}

interface AppPaths {
  userData:   string;
  campaigns:  string;
  assets:     string;
  logs:       string;
  plugins:    string;
  config:     string;
}

interface ModuleEventPayload {
  event:   string;
  payload: Record<string, unknown>;
}

// ── contextBridge exposure ────────────────────────────────────────────────────

const bridge: AtlasBridge = {
  campaign: {
    open:       (dbPath)  => invoke('campaign:open',    { dbPath }),
    create:     (options) => invoke('campaign:create',  options),
    close:      ()        => invoke('campaign:close'),
    listRecent: ()        => invoke('campaign:listRecent'),
    pickFile:   ()             => invoke('campaign:pickFile'),
    saveFile:   (name: string) => invoke('campaign:saveFile', { name }),
  },

  db: {
    query: async <T = Record<string, unknown>>(sql: string, params: SqlParam[] = []) => {
      const r = await invoke<unknown, { ok: boolean; rows: unknown[]; error?: string }>('db:query', { sql, params });
      if (!r.ok) throw new Error(r.error ?? 'db:query failed');
      return r.rows as T[];
    },
    run: async (sql, params = []) => {
      const r = await invoke<unknown, { ok: boolean; lastInsertRowid: number; changes: number; error?: string }>('db:run', { sql, params });
      if (!r.ok) throw new Error(r.error ?? 'db:run failed');
      return { lastInsertRowid: r.lastInsertRowid, changes: r.changes };
    },
  },

  assets: {
    resolve:  (virtualPath)     => invoke('assets:resolve',  { virtualPath }),
    import:   (options)         => invoke('assets:import',   options),
    pickFile: (category)        => invoke('assets:pickFile', { category }),
  },

  app: {
    getVersion:   ()           => invoke('app:getVersion'),
    getPaths:     ()           => invoke('app:getPaths'),
    showInFolder: (filePath)   => invoke('app:showInFolder', { filePath }),
  },

  on: {
    campaignOpened: (handler) => onEvent<string>('push:campaignOpened', handler),
    campaignClosed: (handler) => onEvent<void>('push:campaignClosed',   handler),
    moduleEvent:    (handler) => onEvent<ModuleEventPayload>('push:moduleEvent', handler),
  },
};

contextBridge.exposeInMainWorld('atlas', bridge);
