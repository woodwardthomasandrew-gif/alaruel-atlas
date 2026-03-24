// modules/mini-catalogue/src/repository.ts
// Mini data-access layer. All SQL lives here.

import { BaseRepository }        from '../../_framework/src/index';
import type { IDatabaseManager } from '../../../core/database/src/types';
import type { Logger }           from '../../../core/logger/src/types';
import type { Mini }             from '../../../shared/src/types/mini';
import type {
  MiniRow,
  CreateMiniInput,
  UpdateMiniInput,
  MiniListQuery,
} from './types';

// ── Row → Domain mapper ───────────────────────────────────────────────────────

function rowToMini(row: MiniRow, monsterIds: string[] = []): Mini {
  return {
    id:          row.id,
    name:        row.name,
    description: row.description,
    baseSize:    row.base_size ?? undefined,
    quantity:    row.quantity ?? 1,
    tags:        JSON.parse(row.tags) as string[],
    monsterIds,
    createdAt:   row.created_at as Mini['createdAt'],
    updatedAt:   row.updated_at as Mini['updatedAt'],
  };
}

// ── Repository ────────────────────────────────────────────────────────────────

export class MiniCatalogueRepository extends BaseRepository {
  constructor(db: IDatabaseManager, log: Logger) {
    super('mini-catalogue', db, log);
  }

  // ── Reads ──────────────────────────────────────────────────────────────────

  findById(id: string): Mini | null {
    const row = this.queryOne<MiniRow>(
      'SELECT * FROM minis WHERE id = ? AND campaign_id = ?',
      [id, this.campaignId],
    );
    if (!row) return null;
    const monsterIds = this.query<{ monster_id: string }>(
      'SELECT monster_id FROM mini_monsters WHERE mini_id = ?', [id],
    ).map(r => r.monster_id);
    return rowToMini(row, monsterIds);
  }

  findAll(query: MiniListQuery = {}): Mini[] {
    const conditions = ['campaign_id = ?'];
    const params: (string | number)[] = [this.campaignId];

    if (query.baseSize) { conditions.push('base_size = ?'); params.push(query.baseSize); }
    if (query.search) {
      conditions.push('(name LIKE ? OR description LIKE ?)');
      params.push(`%${query.search}%`, `%${query.search}%`);
    }

    const rows = this.query<MiniRow>(
      `SELECT * FROM minis WHERE ${conditions.join(' AND ')} ORDER BY name ASC LIMIT ? OFFSET ?`,
      [...params, query.limit ?? 500, query.offset ?? 0],
    );

    const ids = rows.map(r => r.id);
    const linkMap: Record<string, string[]> = {};
    if (ids.length > 0) {
      const links = this.query<{ mini_id: string; monster_id: string }>(
        `SELECT mini_id, monster_id FROM mini_monsters WHERE mini_id IN (${ids.map(() => '?').join(',')})`,
        ids,
      );
      for (const l of links) { (linkMap[l.mini_id] ??= []).push(l.monster_id); }
    }
    return rows.map(r => rowToMini(r, linkMap[r.id] ?? []));
  }

  findByMonsterId(monsterId: string): Mini[] {
    const rows = this.query<MiniRow>(
      `SELECT m.* FROM minis m JOIN mini_monsters mm ON mm.mini_id = m.id
       WHERE mm.monster_id = ? AND m.campaign_id = ? ORDER BY m.name ASC`,
      [monsterId, this.campaignId],
    );
    return rows.map(r => rowToMini(r, [monsterId]));
  }

  // ── Writes ─────────────────────────────────────────────────────────────────

  create(
    input: CreateMiniInput & { id: string; createdAt: string; updatedAt: string },
  ): Mini {
    this.run(
      `INSERT INTO minis (id, campaign_id, name, description, base_size, quantity, tags, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.id,
        this.campaignId,
        input.name,
        input.description ?? '',
        input.baseSize    ?? null,
        input.quantity    ?? 1,
        JSON.stringify(input.tags ?? []),
        input.createdAt,
        input.updatedAt,
      ],
    );
    return this.findById(input.id)!;
  }

  update(input: UpdateMiniInput & { updatedAt: string }): Mini | null {
    const sets: string[]                     = ['updated_at = ?'];
    const params: (string | number | null)[] = [input.updatedAt];

    if (input.name        !== undefined) { sets.push('name = ?');        params.push(input.name); }
    if (input.description !== undefined) { sets.push('description = ?'); params.push(input.description ?? ''); }
    if (input.baseSize    !== undefined) { sets.push('base_size = ?');   params.push(input.baseSize ?? null); }
    if (input.quantity    !== undefined) { sets.push('quantity = ?');    params.push(Math.max(1, input.quantity)); }
    if (input.tags        !== undefined) { sets.push('tags = ?');        params.push(JSON.stringify(input.tags)); }

    params.push(input.id, this.campaignId);
    this.run(
      `UPDATE minis SET ${sets.join(', ')} WHERE id = ? AND campaign_id = ?`,
      params,
    );
    return this.findById(input.id);
  }

  delete(id: string): boolean {
    return this.run(
      'DELETE FROM minis WHERE id = ? AND campaign_id = ?',
      [id, this.campaignId],
    ).changes > 0;
  }

  // ── Monster links ──────────────────────────────────────────────────────────

  linkMonster(miniId: string, monsterId: string): void {
    this.run(
      'INSERT OR IGNORE INTO mini_monsters (mini_id, monster_id) VALUES (?, ?)',
      [miniId, monsterId],
    );
  }

  unlinkMonster(miniId: string, monsterId: string): void {
    this.run(
      'DELETE FROM mini_monsters WHERE mini_id = ? AND monster_id = ?',
      [miniId, monsterId],
    );
  }
}
