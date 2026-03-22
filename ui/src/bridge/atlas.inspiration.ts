// ui/src/bridge/atlas.inspiration.ts
// Extends the atlas renderer bridge with the inspiration namespace.
// Import and spread into the atlas object in ui/src/bridge/atlas.ts.
//
// ── How to wire this in ──────────────────────────────────────────────────────
// In ui/src/bridge/atlas.ts, add:
//
//   import { inspirationBridge } from './atlas.inspiration';
//
//   export const atlas = {
//     db:         { ... },   // existing
//     assets:     { ... },   // existing
//     // … other existing namespaces …
//     inspiration: inspirationBridge,   // ← add this line
//   };
//
// That's the only change needed in atlas.ts.
// ─────────────────────────────────────────────────────────────────────────────

/** Shape returned by InspirationGenerator.generate() */
export interface InspirationResult {
  text:      string;
  category?: string;
  tags?:     string[];
}

export interface InspirationGenerateParams {
  campaignId: string;
  category?:  string;
  count?:     number;
}

export const inspirationBridge = {
  /**
   * Call the existing InspirationGenerator via IPC.
   * Maps to ipcMain.handle('inspiration:generate') in modules/inspiration/index.ts.
   */
  generate(params: InspirationGenerateParams): Promise<InspirationResult[]> {
    // window.electronAPI.invoke is the standard preload bridge used throughout
    // the project (see existing bridge implementations in ui/src/bridge/atlas.ts).
    return (window as any).electronAPI.invoke('inspiration:generate', params);
  },
};
