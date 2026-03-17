import { BaseRepository }        from '../../_framework/src/index';
import type { IDatabaseManager } from '../../../core/database/src/types';
import type { Logger }           from '../../../core/logger/src/types';
import type { AssetRow, AssetCategory } from './types';

export class AssetsUiRepository extends BaseRepository {
  constructor(db: IDatabaseManager, log: Logger) { super('assets-ui', db, log); }

  findAll(category?: AssetCategory): AssetRow[] {
    if (category) {
      return this.query<AssetRow>('SELECT * FROM assets WHERE campaign_id=? AND category=? ORDER BY name ASC', [this.campaignId, category]);
    }
    return this.query<AssetRow>('SELECT * FROM assets WHERE campaign_id=? ORDER BY name ASC', [this.campaignId]);
  }

  findById(id: string): AssetRow | null {
    return this.queryOne<AssetRow>('SELECT * FROM assets WHERE id=? AND campaign_id=?', [id, this.campaignId]);
  }

  countByCategory(): Record<string, number> {
    const rows = this.query<{category:string;c:number}>(
      'SELECT category, COUNT(*) AS c FROM assets WHERE campaign_id=? GROUP BY category',
      [this.campaignId],
    );
    return Object.fromEntries(rows.map(r => [r.category, r.c]));
  }

  delete(id: string): boolean {
    return this.run('DELETE FROM assets WHERE id=? AND campaign_id=?', [id, this.campaignId]).changes > 0;
  }

  updateTags(id: string, tags: string[]): boolean {
    return this.run('UPDATE assets SET tags=? WHERE id=? AND campaign_id=?',
      [JSON.stringify(tags), id, this.campaignId]).changes > 0;
  }
}
