// modules/npcs/src/repository.ts
// NPC data-access layer. All SQL lives here.

import { BaseRepository }           from '../../_framework/src/index';
import type { IDatabaseManager }    from '../../../core/database/src/types';
import type { Logger }              from '../../../core/logger/src/types';
import type { NPC, NpcNote }        from '../../../shared/src/types/npc';
import type {
  NpcRow, NpcNoteRow,
  CreateNpcInput, UpdateNpcInput, CreateNpcNoteInput,
  NpcListQuery,
} from './types';

// ── Row → Domain mappers ──────────────────────────────────────────────────────

function rowToNpc(row: NpcRow): NPC {
  return {
    id:                        row.id,
    name:                      row.name,
    alias:                     row.alias ?? undefined,
    description:               row.description,
    role:                      row.role,
    vitalStatus:               row.vital_status,
    dispositionTowardsPlayers: row.disposition_towards_players,
    currentLocationId:         row.current_location_id,
    locationIds:               [],
    primaryFactionId:          row.primary_faction_id,
    factionIds:                [],
    relationships:             [],
    questIds:                  [],
    sessionIds:                [],
    plotThreadIds:             [],
    notes:                     [],
    portraitAssetId:           row.portrait_asset_id,
    tags:                      JSON.parse(row.tags) as string[],
    createdAt:                 row.created_at as NPC['createdAt'],
    updatedAt:                 row.updated_at as NPC['updatedAt'],
  };
}

function rowToNote(row: NpcNoteRow): NpcNote {
  return {
    id:           row.id,
    content:      row.content,
    campaignDate: row.campaign_date as NpcNote['campaignDate'] ?? undefined,
    createdAt:    row.created_at as NpcNote['createdAt'],
  };
}

// ── Repository ────────────────────────────────────────────────────────────────

export class NpcsRepository extends BaseRepository {
  constructor(db: IDatabaseManager, log: Logger) {
    super('npcs', db, log);
  }

  // ── Reads ──────────────────────────────────────────────────────────────────

  findById(id: string): NPC | null {
    const row = this.queryOne<NpcRow>(
      'SELECT * FROM npcs WHERE id = ? AND campaign_id = ?',
      [id, this.campaignId],
    );
    if (!row) return null;
    const npc   = rowToNpc(row);
    npc.notes   = this.findNotesByNpcId(id);
    return npc;
  }

  findAll(query: NpcListQuery = {}): NPC[] {
    const conditions: string[] = ['campaign_id = ?'];
    const params: (string | number)[] = [this.campaignId];

    if (query.role)        { conditions.push('role = ?');         params.push(query.role); }
    if (query.vitalStatus) { conditions.push('vital_status = ?'); params.push(query.vitalStatus); }
    if (query.search) {
      conditions.push('(name LIKE ? OR alias LIKE ?)');
      const like = `%${query.search}%`;
      params.push(like, like);
    }

    const where  = conditions.join(' AND ');
    const limit  = query.limit  ?? 100;
    const offset = query.offset ?? 0;

    const rows = this.query<NpcRow>(
      `SELECT * FROM npcs WHERE ${where} ORDER BY name ASC LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    return rows.map(rowToNpc);
  }

  count(query: NpcListQuery = {}): number {
    const conditions: string[] = ['campaign_id = ?'];
    const params: (string | number)[] = [this.campaignId];
    if (query.role)        { conditions.push('role = ?');         params.push(query.role); }
    if (query.vitalStatus) { conditions.push('vital_status = ?'); params.push(query.vitalStatus); }
    if (query.search) {
      conditions.push('(name LIKE ? OR alias LIKE ?)');
      const like = `%${query.search}%`;
      params.push(like, like);
    }
    const where = conditions.join(' AND ');
    const row   = this.queryOne<{ c: number }>(
      `SELECT COUNT(*) AS c FROM npcs WHERE ${where}`,
      params,
    );
    return row?.c ?? 0;
  }

  findNotesByNpcId(npcId: string): NpcNote[] {
    return this.query<NpcNoteRow>(
      'SELECT * FROM npc_notes WHERE npc_id = ? ORDER BY created_at ASC',
      [npcId],
    ).map(rowToNote);
  }

  // ── Writes ─────────────────────────────────────────────────────────────────

  create(input: CreateNpcInput & { id: string; createdAt: string; updatedAt: string }): NPC {
    this.run(
      `INSERT INTO npcs
         (id, campaign_id, name, alias, description, role, vital_status,
          disposition_towards_players, tags, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.id,
        this.campaignId,
        input.name,
        input.alias ?? null,
        input.description ?? '',
        input.role ?? 'neutral',
        input.vitalStatus ?? 'alive',
        input.dispositionTowardsPlayers ?? 'neutral',
        JSON.stringify(input.tags ?? []),
        input.createdAt,
        input.updatedAt,
      ],
    );
    return this.findById(input.id)!;
  }

  update(input: UpdateNpcInput & { updatedAt: string }): NPC | null {
    const sets: string[] = ['updated_at = ?'];
    const params: (string | number | null)[] = [input.updatedAt];

    if (input.name        !== undefined) { sets.push('name = ?');                         params.push(input.name); }
    if (input.alias       !== undefined) { sets.push('alias = ?');                        params.push(input.alias ?? null); }
    if (input.description !== undefined) { sets.push('description = ?');                  params.push(input.description); }
    if (input.role        !== undefined) { sets.push('role = ?');                         params.push(input.role); }
    if (input.vitalStatus !== undefined) { sets.push('vital_status = ?');                 params.push(input.vitalStatus); }
    if (input.dispositionTowardsPlayers !== undefined) {
      sets.push('disposition_towards_players = ?');
      params.push(input.dispositionTowardsPlayers);
    }
    if (input.currentLocationId !== undefined) { sets.push('current_location_id = ?');    params.push(input.currentLocationId); }
    if (input.primaryFactionId  !== undefined) { sets.push('primary_faction_id = ?');     params.push(input.primaryFactionId); }
    if (input.portraitAssetId   !== undefined) { sets.push('portrait_asset_id = ?');      params.push(input.portraitAssetId); }
    if (input.tags              !== undefined) { sets.push('tags = ?');                   params.push(JSON.stringify(input.tags)); }

    params.push(input.id, this.campaignId);
    this.run(
      `UPDATE npcs SET ${sets.join(', ')} WHERE id = ? AND campaign_id = ?`,
      params,
    );
    return this.findById(input.id);
  }

  delete(id: string): boolean {
    const result = this.run(
      'DELETE FROM npcs WHERE id = ? AND campaign_id = ?',
      [id, this.campaignId],
    );
    return result.changes > 0;
  }

  addNote(input: CreateNpcNoteInput & { id: string; createdAt: string }): NpcNote {
    this.run(
      `INSERT INTO npc_notes (id, npc_id, campaign_id, content, campaign_date, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [input.id, input.npcId, this.campaignId, input.content, input.campaignDate ?? null, input.createdAt],
    );
    const row = this.queryOne<NpcNoteRow>('SELECT * FROM npc_notes WHERE id = ?', [input.id]);
    return rowToNote(row!);
  }

  deleteNote(noteId: string): boolean {
    const result = this.run('DELETE FROM npc_notes WHERE id = ?', [noteId]);
    return result.changes > 0;
  }
}
