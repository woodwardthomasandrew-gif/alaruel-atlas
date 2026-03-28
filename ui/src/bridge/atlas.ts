// ui/src/bridge/atlas.ts
//
// Typed accessor for window.atlas (the contextBridge API).
// Provides a dev-mode mock so the renderer runs in a browser without Electron.
export interface CampaignOpenResult {
  ok: boolean;
  campaignId?: string;
  error?: string;
}
export interface CampaignCreateOptions {
  name: string;
  filePath: string;
  gmName?: string;
  system?: string;
}
export interface RecentCampaign {
  filePath: string;
}
export interface AssetImportOptions {
  sourcePath: string;
  name: string;
  category: string;
  tags?: string[];
}
export interface AppPaths {
  userData: string;
  campaigns: string;
  assets: string;
  logs: string;
  plugins: string;
  config: string;
}
export interface AtlasBridge {
  campaign: {
    open(dbPath: string): Promise<CampaignOpenResult>;
    create(options: CampaignCreateOptions): Promise<CampaignOpenResult>;
    close(): Promise<void>;
    listRecent(): Promise<RecentCampaign[]>;
    pickFile(): Promise<string | null>;
    saveFile(name: string): Promise<string | null>;
  };
  db: {
    query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
    run(sql: string, params?: unknown[]): Promise<{ lastInsertRowid: number; changes: number }>;
  };
  assets: {
    resolve(virtualPath: string): Promise<string | null>;
    import(options: AssetImportOptions): Promise<{ ok: boolean; assetId?: string; error?: string }>;
    pickFile(category?: string): Promise<string | null>;
  };
  inspiration: {
    generate(params: {
      campaignId: string;
      category?: string;
      count?: number;
    }): Promise<Array<{ text: string; category: string; tags: string[] }>>;
  };
  app: {
    getVersion(): Promise<string>;
    getPaths(): Promise<AppPaths>;
    showInFolder(filePath: string): Promise<void>;
  };
  exports: {
    saveSessionHtml(fileName: string, html: string): Promise<{ ok: boolean; path?: string; error?: string }>;
  };
  on: {
    campaignOpened(handler: (id: string) => void): () => void;
    campaignClosed(handler: () => void): () => void;
    moduleEvent(handler: (payload: { event: string; payload: Record<string, unknown> }) => void): () => void;
  };
}
// ── Dev mock ──────────────────────────────────────────────────────────────────
const devMock: AtlasBridge = {
  campaign: {
    open:       async () => ({ ok: false, error: 'Running in browser — no Electron' }),
    create:     async () => ({ ok: false, error: 'Running in browser — no Electron' }),
    close:      async () => {},
    listRecent: async () => [],
    pickFile:   async () => null,
    saveFile:   async () => null,
  },
  db: {
    query: async () => [],
    run:   async () => ({ lastInsertRowid: 0, changes: 0 }),
  },
  assets: {
    resolve:  async () => null,
    import:   async () => ({ ok: false, error: 'Running in browser' }),
    pickFile: async () => null,
  },
  inspiration: {
    generate: async () => [],
  },
  app: {
    getVersion:   async () => '0.1.0-dev',
    getPaths:     async () => ({ userData: '', campaigns: '', assets: '', logs: '', plugins: '', config: '' }),
    showInFolder: async () => {},
  },
  exports: {
    saveSessionHtml: async () => ({ ok: false, error: 'Running in browser' }),
  },
  on: {
    campaignOpened: () => () => {},
    campaignClosed: () => () => {},
    moduleEvent:    () => () => {},
  },
};
declare global {
  interface Window { atlas?: AtlasBridge; }
}
/**
 * The single accessor for the IPC bridge throughout the renderer.
 * Uses the real Electron bridge when running in Electron, falls back to a
 * no-op mock when opened in a regular browser (dev / Storybook).
 */
export const atlas: AtlasBridge = window.atlas ?? devMock;
