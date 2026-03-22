// modules/inspiration/index.ts
// Registers the IPC handler for the inspiration generator.
// ─────────────────────────────────────────────────────────────────────────────
// This file ONLY adds the IPC surface. The generator logic lives in
// InspirationGenerator.ts and is not modified.
// ─────────────────────────────────────────────────────────────────────────────

import { ipcMain } from 'electron';
import type { DatabaseManager } from '../../core/database/DatabaseManager';
import type { Logger } from '../../core/logging/Logger';
import { InspirationGenerator } from './InspirationGenerator';

export interface InspirationModuleOptions {
  db:  DatabaseManager;
  log: Logger;
}

export function registerInspirationHandlers({ db, log }: InspirationModuleOptions): void {
  const generator = new InspirationGenerator({ db, log });

  // inspiration:generate
  // Params: { campaignId: string; category?: string; count?: number }
  // Returns: InspirationResult[]  — see InspirationGenerator.ts for the type
  ipcMain.handle('inspiration:generate', async (_event, params: {
    campaignId: string;
    category?:  string;
    count?:     number;
  }) => {
    try {
      return await generator.generate(params);
    } catch (err) {
      log.error('inspiration:generate failed', {
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  });
}
