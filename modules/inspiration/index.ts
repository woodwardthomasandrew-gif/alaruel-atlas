// modules/inspiration/index.ts
// Registers IPC handlers for the inspiration generator and image asset listing.
// ─────────────────────────────────────────────────────────────────────────────

import { ipcMain } from 'electron';
import type { DatabaseManager } from '../../core/database/DatabaseManager';
import type { Logger } from '../../core/logging/Logger';
import { InspirationGenerator, pickRandomFilter } from './InspirationGenerator';

export interface InspirationModuleOptions {
  db?:  DatabaseManager;
  log:  Logger;
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

  // inspiration:listImages
  // Params: { campaignId: string }
  // Returns: Array<{ id: string; name: string; virtualPath: string; category: string;
  //                  imageUrl: string; imageFilter: string; filterName: string }>
  //
  // Queries the assets table for image-type assets (maps and portraits),
  // resolves each to an atlas:// URL, and attaches a random CSS filter.
  ipcMain.handle('inspiration:listImages', async (_event, params: {
    campaignId: string;
  }) => {
    try {
      if (!db) {
        log.warn('inspiration:listImages — no db instance available');
        return [];
      }
      const rows = (db as any).query<{
        id:           string;
        name:         string;
        virtual_path: string;
        category:     string;
      }>(
        `SELECT id, name, virtual_path, category
           FROM assets
          WHERE campaign_id = ?
            AND category IN ('maps', 'portraits', 'misc')
            AND (
              mime_type LIKE 'image/%'
              OR virtual_path LIKE '%.png'
              OR virtual_path LIKE '%.jpg'
              OR virtual_path LIKE '%.jpeg'
              OR virtual_path LIKE '%.webp'
              OR virtual_path LIKE '%.gif'
            )
          ORDER BY name ASC`,
        [params.campaignId],
      );

      return rows.map((row) => {
        const filter = pickRandomFilter();
        return {
          id:           row.id,
          name:         row.name,
          virtualPath:  row.virtual_path,
          category:     row.category,
          imageUrl:     `atlas://asset/${row.id}`,
          imageFilter:  filter.css,
          filterName:   filter.name,
        };
      });
    } catch (err) {
      log.error('inspiration:listImages failed', {
        error: err instanceof Error ? err.message : String(err),
      });
      return [];
    }
  });
}
