// modules/magic-items/src/repository.ts
// Magic item data-access layer. All SQL lives here.

import { BaseRepository } from '../../_framework/src/index';
import type { IDatabaseManager } from '../../../core/database/src/types';
import type { Logger } from '../../../core/logger/src/types';
import type {
  CreateMagicItemInput,
  MagicItem,
  MagicItemListQuery,
  MagicItemRow,
  UpdateMagicItemInput,
} from './types';

function parseItemData(raw: string | null | undefined): Record<string, string | number | boolean | null | undefined> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function rowToMagicItem(row: MagicItemRow): MagicItem {
  return {
    id: row.id,
    name: row.name,
    itemType: row.item_type,
    rarity: row.rarity,
    requiresAttunement: row.requires_attunement === 1,
    attunementText: row.attunement_text ?? undefined,
    description: row.description,
    itemData: parseItemData(row.item_data),
    source: row.source ?? undefined,
    valueGp: row.value_gp ?? undefined,
    weightLb: row.weight_lb ?? undefined,
    charges: row.charges ?? undefined,
    recharge: row.recharge ?? undefined,
    lore: row.lore ?? undefined,
    imageAssetId: row.image_asset_id ?? undefined,
    tags: JSON.parse(row.tags) as string[],
    createdAt: row.created_at as MagicItem['createdAt'],
    updatedAt: row.updated_at as MagicItem['updatedAt'],
  };
}

export class MagicItemsRepository extends BaseRepository {
  private itemDataColumnReady = false;

  constructor(db: IDatabaseManager, log: Logger) {
    super('magic-items', db, log);
  }

  override initialize(): void {
    super.initialize();
    this.ensureItemDataColumn();
  }

  findById(id: string): MagicItem | null {
    this.ensureItemDataColumn();
    const row = this.queryOne<MagicItemRow>(
      'SELECT * FROM magic_items WHERE id = ? AND campaign_id = ?',
      [id, this.campaignId],
    );
    return row ? rowToMagicItem(row) : null;
  }

  findAll(query: MagicItemListQuery = {}): MagicItem[] {
    this.ensureItemDataColumn();
    const conditions: string[] = ['campaign_id = ?'];
    const params: (string | number)[] = [this.campaignId];

    if (query.itemType) {
      conditions.push('item_type = ?');
      params.push(query.itemType);
    }
    if (query.rarity) {
      conditions.push('rarity = ?');
      params.push(query.rarity);
    }
    if (query.requiresAttunement !== undefined) {
      conditions.push('requires_attunement = ?');
      params.push(query.requiresAttunement ? 1 : 0);
    }
    if (query.search) {
      conditions.push('(name LIKE ? OR description LIKE ? OR source LIKE ? OR lore LIKE ?)');
      const like = `%${query.search}%`;
      params.push(like, like, like, like);
    }

    const rows = this.query<MagicItemRow>(
      `SELECT * FROM magic_items
       WHERE ${conditions.join(' AND ')}
       ORDER BY
         CASE rarity
           WHEN 'common' THEN 0
           WHEN 'uncommon' THEN 1
           WHEN 'rare' THEN 2
           WHEN 'very rare' THEN 3
           WHEN 'legendary' THEN 4
           WHEN 'artifact' THEN 5
           ELSE 6
         END,
         name ASC
       LIMIT ? OFFSET ?`,
      [...params, query.limit ?? 250, query.offset ?? 0],
    );
    return rows.map(rowToMagicItem);
  }

  count(query: MagicItemListQuery = {}): number {
    const conditions: string[] = ['campaign_id = ?'];
    const params: (string | number)[] = [this.campaignId];

    if (query.itemType) {
      conditions.push('item_type = ?');
      params.push(query.itemType);
    }
    if (query.rarity) {
      conditions.push('rarity = ?');
      params.push(query.rarity);
    }
    if (query.requiresAttunement !== undefined) {
      conditions.push('requires_attunement = ?');
      params.push(query.requiresAttunement ? 1 : 0);
    }
    if (query.search) {
      conditions.push('(name LIKE ? OR description LIKE ? OR source LIKE ? OR lore LIKE ?)');
      const like = `%${query.search}%`;
      params.push(like, like, like, like);
    }

    const row = this.queryOne<{ c: number }>(
      `SELECT COUNT(*) AS c FROM magic_items WHERE ${conditions.join(' AND ')}`,
      params,
    );
    return row?.c ?? 0;
  }

  create(
    input: CreateMagicItemInput & { id: string; createdAt: string; updatedAt: string },
  ): MagicItem {
    this.ensureItemDataColumn();
    const columns = [
      'id', 'campaign_id', 'name', 'item_type', 'rarity', 'requires_attunement', 'attunement_text',
      'description',
    ];
    const values: (string | number | null)[] = [
      input.id,
      this.campaignId,
      input.name,
      input.itemType ?? 'wondrous item',
      input.rarity ?? 'common',
      input.requiresAttunement ? 1 : 0,
      input.attunementText ?? null,
      input.description ?? '',
    ];

    if (this.hasItemDataColumn()) {
      columns.push('item_data');
      values.push(JSON.stringify(input.itemData ?? {}));
    }

    columns.push('source', 'value_gp', 'weight_lb', 'charges', 'recharge', 'lore', 'image_asset_id', 'tags', 'created_at', 'updated_at');
    values.push(
      input.source ?? null,
      input.valueGp ?? null,
      input.weightLb ?? null,
      input.charges ?? null,
      input.recharge ?? null,
      input.lore ?? null,
      input.imageAssetId ?? null,
      JSON.stringify(input.tags ?? []),
      input.createdAt,
      input.updatedAt,
    );

    const placeholders = columns.map(() => '?').join(',');
    this.run(
      `INSERT INTO magic_items (${columns.join(', ')}) VALUES (${placeholders})`,
      values,
    );
    return this.findById(input.id)!;
  }

  update(input: UpdateMagicItemInput & { updatedAt: string }): MagicItem | null {
    this.ensureItemDataColumn();
    const sets: string[] = ['updated_at = ?'];
    const params: (string | number | null)[] = [input.updatedAt];

    const push = (column: string, value: string | number | null) => {
      sets.push(`${column} = ?`);
      params.push(value);
    };
    const pushJson = (column: string, value: unknown) => push(column, JSON.stringify(value));

    if (input.name !== undefined) push('name', input.name);
    if (input.itemType !== undefined) push('item_type', input.itemType);
    if (input.rarity !== undefined) push('rarity', input.rarity);
    if (input.requiresAttunement !== undefined) push('requires_attunement', input.requiresAttunement ? 1 : 0);
    if (input.attunementText !== undefined) push('attunement_text', input.attunementText ?? null);
    if (input.description !== undefined) push('description', input.description ?? '');
    if (input.itemData !== undefined && this.hasItemDataColumn()) push('item_data', JSON.stringify(input.itemData ?? {}));
    if (input.source !== undefined) push('source', input.source ?? null);
    if (input.valueGp !== undefined) push('value_gp', input.valueGp ?? null);
    if (input.weightLb !== undefined) push('weight_lb', input.weightLb ?? null);
    if (input.charges !== undefined) push('charges', input.charges ?? null);
    if (input.recharge !== undefined) push('recharge', input.recharge ?? null);
    if (input.lore !== undefined) push('lore', input.lore ?? null);
    if (input.imageAssetId !== undefined) push('image_asset_id', input.imageAssetId ?? null);
    if (input.tags !== undefined) pushJson('tags', input.tags);

    params.push(input.id, this.campaignId);
    this.run(
      `UPDATE magic_items SET ${sets.join(', ')} WHERE id = ? AND campaign_id = ?`,
      params,
    );
    return this.findById(input.id);
  }

  delete(id: string): boolean {
    return this.run(
      'DELETE FROM magic_items WHERE id = ? AND campaign_id = ?',
      [id, this.campaignId],
    ).changes > 0;
  }

  private hasItemDataColumn(): boolean {
    if (!this.itemDataColumnReady) {
      const row = this.queryOne<{ name: string }>(
        `SELECT name FROM pragma_table_info('magic_items') WHERE name = 'item_data' LIMIT 1`,
      );
      this.itemDataColumnReady = Boolean(row);
    }
    return this.itemDataColumnReady;
  }

  private ensureItemDataColumn(): void {
    if (this.hasItemDataColumn()) return;

    this.run(`ALTER TABLE magic_items ADD COLUMN item_data TEXT NOT NULL DEFAULT '{}'`);
    this.run(`UPDATE magic_items SET item_data = '{}' WHERE item_data IS NULL OR trim(item_data) = ''`);
    this.itemDataColumnReady = true;
  }
}
