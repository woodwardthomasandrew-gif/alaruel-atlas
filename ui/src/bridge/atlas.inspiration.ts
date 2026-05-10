// ui/src/bridge/atlas.inspiration.ts
// Extends the atlas renderer bridge with the inspiration namespace.
// ─────────────────────────────────────────────────────────────────────────────

/** Shape returned by InspirationGenerator.generate() */
export interface InspirationResult {
  text:        string;
  category?:   string;
  tags?:       string[];
  imageUrl?:   string;
  imageFilter?: string;
}

export interface InspirationGenerateParams {
  campaignId: string;
  category?:  string;
  count?:     number;
}

/** Shape returned by inspiration:listImages */
export interface InspirationImageAsset {
  id:          string;
  name:        string;
  virtualPath: string;
  category:    string;
  imageUrl:    string;
  imageFilter: string;
  filterName:  string;
}

export const inspirationBridge = {
  /**
   * Call the existing InspirationGenerator via IPC.
   * Maps to ipcMain.handle('inspiration:generate') in modules/inspiration/index.ts.
   */
  generate(params: InspirationGenerateParams): Promise<InspirationResult[]> {
    return (window as any).electronAPI.invoke('inspiration:generate', params);
  },

  /**
   * Fetch all image assets (maps, portraits) for the campaign.
   * Each result includes a random CSS filter pre-assigned by the main process.
   * Maps to ipcMain.handle('inspiration:listImages') in modules/inspiration/index.ts.
   */
  listImages(params: { campaignId: string }): Promise<InspirationImageAsset[]> {
    return (window as any).electronAPI.invoke('inspiration:listImages', params);
  },
};
