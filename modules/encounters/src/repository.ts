import { BaseRepository }        from '../../_framework/src/index';
import type { IDatabaseManager } from '../../../core/database/src/types';
import type { Logger }           from '../../../core/logger/src/types';
import type {
  Encounter, EncounterMonsterEntry, EncounterMiniEntry, EncounterItemEntry,
} from '../../../shared/src/types/encounter';
import type {
  EncounterRow, EncounterMonsterRow, EncounterMiniRow, EncounterNpcAllyRow, EncounterItemRow,
  CreateEncounterInput, UpdateEncounterInput,
  AddEncounterMonsterInput, UpdateEncounterMonsterInput,
  AssignMiniInput, AddEncounterItemInput, UpdateEncounterItemInput,
} from './types';

function parseJsonArray(value: string | null | undefined): unknown[] {
  if (!value) return [];
  try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : []; }
  catch { return []; }
}

function rowToEncounter(row: EncounterRow): Encounter {
  return {
    id:               row.id,
    name:             row.name,
    description:      row.description,
    encounterType:    row.encounter_type,
    status:           row.status,
    sessionNumber:    row.session_number ?? undefined,
    sessionId:        row.session_id ?? undefined,
    dungeonRoomId:    row.dungeon_room_id ?? undefined,
    location:         row.location,
    difficulty:       row.difficulty,
    tags:             JSON.parse(row.tags) as string[],
    notes:            row.notes,

    partyId:          row.party_id ?? undefined,
    partyLevel:       row.party_level ?? undefined,
    partySize:        row.party_size ?? undefined,
    airshipPresent:   row.airship_present === 1,
    partyNotes:       row.party_notes,
    npcAllyIds:       [],

    monsters:         [],
    minis:            [],
    items:            [],

    battleMapAssetId: row.battle_map_asset_id ?? undefined,
    mapNotes:         row.map_notes,
    terrainNotes:     row.terrain_notes,
    terrainModifierIds: parseJsonArray(row.terrain_modifiers) as string[],

    initiativePresets:    parseJsonArray(row.initiative_presets),
    environmentalEffects: parseJsonArray(row.environmental_effects),
    legendaryActions:     parseJsonArray(row.legendary_actions),
    lairActions:          parseJsonArray(row.lair_actions),
    conditions:           parseJsonArray(row.conditions),

    loot:              row.loot,
    xpAward:           row.xp_award ?? undefined,
    storyRewards:      row.story_rewards,
    reputationRewards: row.reputation_rewards,
    rewardNotes:       row.reward_notes,

    createdAt:        row.created_at as Encounter['createdAt'],
    updatedAt:        row.updated_at as Encounter['updatedAt'],
  };
}

function rowToMonster(r: EncounterMonsterRow): EncounterMonsterEntry {
  return {
    id:              r.id,
    monsterId:       r.monster_id,
    customName:      r.custom_name ?? undefined,
    quantity:        r.quantity,
    groupLabel:      r.group_label ?? undefined,
    isEncounterCopy: r.is_encounter_copy === 1,
    statOverrides:   r.stat_overrides ? JSON.parse(r.stat_overrides) : undefined,
    order:           r.sort_order,
    notes:           r.notes ?? undefined,
  };
}

function rowToItem(r: EncounterItemRow): EncounterItemEntry {
  return {
    id:         r.id,
    itemId:     r.item_id,
    customName: r.custom_name ?? undefined,
    quantity:   r.quantity,
    notes:      r.notes ?? undefined,
    order:      r.sort_order,
  };
}

function rowToMini(r: EncounterMiniRow): EncounterMiniEntry {
  return {
    id:                  r.id,
    encounterMonsterId:  r.encounter_monster_id ?? undefined,
    miniId:              r.mini_id ?? undefined,
    quantity:            r.quantity,
    assignment:          r.assignment,
    proxyNotes:          r.proxy_notes ?? undefined,
  };
}

export class EncountersRepository extends BaseRepository {
  constructor(db: IDatabaseManager, log: Logger) {
    super('encounters', db, log);
  }

  // ── Encounters ─────────────────────────────────────────────────────────────

  findAll(): Encounter[] {
    return this.query<EncounterRow>(
      'SELECT * FROM encounters WHERE campaign_id = ? ORDER BY updated_at DESC',
      [this.campaignId],
    ).map(rowToEncounter);
  }

  findBySession(sessionId: string): Encounter[] {
    return this.query<EncounterRow>(
      'SELECT * FROM encounters WHERE session_id = ? AND campaign_id = ? ORDER BY created_at ASC',
      [sessionId, this.campaignId],
    ).map(rowToEncounter);
  }

  findByDungeonRoom(dungeonRoomId: string): Encounter | null {
    const row = this.queryOne<EncounterRow>(
      'SELECT * FROM encounters WHERE dungeon_room_id = ? AND campaign_id = ?',
      [dungeonRoomId, this.campaignId],
    );
    return row ? this.hydrate(row) : null;
  }

  findById(id: string): Encounter | null {
    const row = this.queryOne<EncounterRow>(
      'SELECT * FROM encounters WHERE id = ? AND campaign_id = ?',
      [id, this.campaignId],
    );
    return row ? this.hydrate(row) : null;
  }

  private hydrate(row: EncounterRow): Encounter {
    const e = rowToEncounter(row);
    e.monsters = this.query<EncounterMonsterRow>(
      'SELECT * FROM encounter_monsters WHERE encounter_id = ? ORDER BY sort_order ASC',
      [e.id],
    ).map(rowToMonster);
    e.minis = this.query<EncounterMiniRow>(
      'SELECT * FROM encounter_minis WHERE encounter_id = ?',
      [e.id],
    ).map(rowToMini);
    e.items = this.query<EncounterItemRow>(
      'SELECT * FROM encounter_items WHERE encounter_id = ? ORDER BY sort_order ASC',
      [e.id],
    ).map(rowToItem);
    e.npcAllyIds = this.query<EncounterNpcAllyRow>(
      'SELECT npc_id FROM encounter_npc_allies WHERE encounter_id = ?',
      [e.id],
    ).map(r => r.npc_id);
    return e;
  }

  create(input: CreateEncounterInput & { id: string; createdAt: string; updatedAt: string }): Encounter {
    this.run(
      `INSERT INTO encounters (
         id, campaign_id, name, description, encounter_type, location, difficulty,
         tags, notes, session_id, session_number, dungeon_room_id,
         party_id, party_level, party_size, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.id, this.campaignId, input.name, input.description ?? '',
        input.encounterType ?? 'combat', input.location ?? '', input.difficulty ?? 'moderate',
        JSON.stringify(input.tags ?? []), input.notes ?? '',
        input.sessionId ?? null, input.sessionNumber ?? null, input.dungeonRoomId ?? null,
        input.partyId ?? null, input.partyLevel ?? null, input.partySize ?? null,
        input.createdAt, input.updatedAt,
      ],
    );
    return this.findById(input.id)!;
  }

  update(input: UpdateEncounterInput & { updatedAt: string }): Encounter | null {
    const sets: string[] = ['updated_at = ?'];
    const params: (string | number | null)[] = [input.updatedAt];

    const setIf = (cond: boolean, col: string, value: string | number | null | undefined) => {
      if (cond) { sets.push(`${col} = ?`); params.push(value ?? null); }
    };

    setIf(input.name              !== undefined, 'name', input.name ?? null);
    setIf(input.description       !== undefined, 'description', input.description ?? null);
    setIf(input.encounterType     !== undefined, 'encounter_type', input.encounterType ?? null);
    setIf(input.status            !== undefined, 'status', input.status ?? null);
    setIf(input.location          !== undefined, 'location', input.location ?? null);
    setIf(input.difficulty        !== undefined, 'difficulty', input.difficulty ?? null);
    setIf(input.tags              !== undefined, 'tags', JSON.stringify(input.tags ?? []));
    setIf(input.notes             !== undefined, 'notes', input.notes ?? null);
    setIf(input.sessionId         !== undefined, 'session_id', input.sessionId);
    setIf(input.sessionNumber     !== undefined, 'session_number', input.sessionNumber);
    setIf(input.dungeonRoomId     !== undefined, 'dungeon_room_id', input.dungeonRoomId);

    setIf(input.partyId           !== undefined, 'party_id', input.partyId);
    setIf(input.partyLevel        !== undefined, 'party_level', input.partyLevel);
    setIf(input.partySize         !== undefined, 'party_size', input.partySize);
    setIf(input.airshipPresent    !== undefined, 'airship_present', input.airshipPresent ? 1 : 0);
    setIf(input.partyNotes        !== undefined, 'party_notes', input.partyNotes ?? null);

    setIf(input.battleMapAssetId  !== undefined, 'battle_map_asset_id', input.battleMapAssetId);
    setIf(input.mapNotes          !== undefined, 'map_notes', input.mapNotes ?? null);
    setIf(input.terrainNotes      !== undefined, 'terrain_notes', input.terrainNotes ?? null);
    setIf(input.terrainModifierIds !== undefined, 'terrain_modifiers', JSON.stringify(input.terrainModifierIds ?? []));

    setIf(input.initiativePresets    !== undefined, 'initiative_presets', JSON.stringify(input.initiativePresets ?? []));
    setIf(input.environmentalEffects !== undefined, 'environmental_effects', JSON.stringify(input.environmentalEffects ?? []));
    setIf(input.legendaryActions     !== undefined, 'legendary_actions', JSON.stringify(input.legendaryActions ?? []));
    setIf(input.lairActions          !== undefined, 'lair_actions', JSON.stringify(input.lairActions ?? []));
    setIf(input.conditions           !== undefined, 'conditions', JSON.stringify(input.conditions ?? []));

    setIf(input.loot              !== undefined, 'loot', input.loot ?? null);
    setIf(input.xpAward           !== undefined, 'xp_award', input.xpAward);
    setIf(input.storyRewards      !== undefined, 'story_rewards', input.storyRewards ?? null);
    setIf(input.reputationRewards !== undefined, 'reputation_rewards', input.reputationRewards ?? null);
    setIf(input.rewardNotes       !== undefined, 'reward_notes', input.rewardNotes ?? null);

    params.push(input.id, this.campaignId);
    this.run(`UPDATE encounters SET ${sets.join(', ')} WHERE id = ? AND campaign_id = ?`, params);
    return this.findById(input.id);
  }

  delete(id: string): boolean {
    return this.run('DELETE FROM encounters WHERE id = ? AND campaign_id = ?', [id, this.campaignId]).changes > 0;
  }

  // ── Enemy roster ──────────────────────────────────────────────────────────

  addMonster(input: AddEncounterMonsterInput, id: string, sortOrder: number): EncounterMonsterEntry {
    this.run(
      `INSERT INTO encounter_monsters
         (id, encounter_id, monster_id, custom_name, quantity, group_label, is_encounter_copy, sort_order, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, input.encounterId, input.monsterId, input.customName ?? null,
        input.quantity ?? 1, input.groupLabel ?? null,
        input.isEncounterCopy ? 1 : 0, sortOrder, input.notes ?? null,
      ],
    );
    return rowToMonster(this.queryOne<EncounterMonsterRow>('SELECT * FROM encounter_monsters WHERE id = ?', [id])!);
  }

  nextMonsterSortOrder(encounterId: string): number {
    const row = this.queryOne<{ mx: number | null }>(
      'SELECT MAX(sort_order) AS mx FROM encounter_monsters WHERE encounter_id = ?', [encounterId],
    );
    return (row?.mx ?? -1) + 1;
  }

  updateMonster(input: UpdateEncounterMonsterInput): EncounterMonsterEntry | null {
    const sets: string[] = [];
    const params: (string | number | null)[] = [];
    const setIf = (cond: boolean, col: string, value: string | number | null | undefined) => {
      if (cond) { sets.push(`${col} = ?`); params.push(value ?? null); }
    };
    setIf(input.customName    !== undefined, 'custom_name', input.customName);
    setIf(input.quantity      !== undefined, 'quantity', input.quantity ?? 1);
    setIf(input.groupLabel    !== undefined, 'group_label', input.groupLabel);
    setIf(input.notes         !== undefined, 'notes', input.notes);
    setIf(input.statOverrides !== undefined, 'stat_overrides', input.statOverrides ? JSON.stringify(input.statOverrides) : null);
    setIf(input.sortOrder     !== undefined, 'sort_order', input.sortOrder ?? 0);
    if (sets.length === 0) return rowToMonster(this.queryOne<EncounterMonsterRow>('SELECT * FROM encounter_monsters WHERE id = ?', [input.id])!);
    params.push(input.id);
    this.run(`UPDATE encounter_monsters SET ${sets.join(', ')} WHERE id = ?`, params);
    const row = this.queryOne<EncounterMonsterRow>('SELECT * FROM encounter_monsters WHERE id = ?', [input.id]);
    return row ? rowToMonster(row) : null;
  }

  removeMonster(id: string): boolean {
    return this.run('DELETE FROM encounter_monsters WHERE id = ?', [id]).changes > 0;
  }

  // ── Reward item cards ─────────────────────────────────────────────────────

  addItem(input: AddEncounterItemInput, id: string, sortOrder: number): EncounterItemEntry {
    this.run(
      `INSERT INTO encounter_items (id, encounter_id, item_id, custom_name, quantity, notes, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id, input.encounterId, input.itemId, input.customName ?? null,
        input.quantity ?? 1, input.notes ?? null, sortOrder,
      ],
    );
    return rowToItem(this.queryOne<EncounterItemRow>('SELECT * FROM encounter_items WHERE id = ?', [id])!);
  }

  nextItemSortOrder(encounterId: string): number {
    const row = this.queryOne<{ mx: number | null }>(
      'SELECT MAX(sort_order) AS mx FROM encounter_items WHERE encounter_id = ?', [encounterId],
    );
    return (row?.mx ?? -1) + 1;
  }

  updateItem(input: UpdateEncounterItemInput): EncounterItemEntry | null {
    const sets: string[] = [];
    const params: (string | number | null)[] = [];
    const setIf = (cond: boolean, col: string, value: string | number | null | undefined) => {
      if (cond) { sets.push(`${col} = ?`); params.push(value ?? null); }
    };
    setIf(input.customName !== undefined, 'custom_name', input.customName);
    setIf(input.quantity   !== undefined, 'quantity', input.quantity ?? 1);
    setIf(input.notes      !== undefined, 'notes', input.notes);
    setIf(input.sortOrder  !== undefined, 'sort_order', input.sortOrder ?? 0);
    if (sets.length === 0) return rowToItem(this.queryOne<EncounterItemRow>('SELECT * FROM encounter_items WHERE id = ?', [input.id])!);
    params.push(input.id);
    this.run(`UPDATE encounter_items SET ${sets.join(', ')} WHERE id = ?`, params);
    const row = this.queryOne<EncounterItemRow>('SELECT * FROM encounter_items WHERE id = ?', [input.id]);
    return row ? rowToItem(row) : null;
  }

  removeItem(id: string): boolean {
    return this.run('DELETE FROM encounter_items WHERE id = ?', [id]).changes > 0;
  }

  // ── Miniature assignments ────────────────────────────────────────────────

  assignMini(input: AssignMiniInput, id: string): EncounterMiniEntry {
    this.run(
      `INSERT INTO encounter_minis (id, encounter_id, encounter_monster_id, mini_id, quantity, assignment, proxy_notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id, input.encounterId, input.encounterMonsterId ?? null, input.miniId ?? null,
        input.quantity ?? 1, input.assignment ?? 'unassigned', input.proxyNotes ?? null,
      ],
    );
    return rowToMini(this.queryOne<EncounterMiniRow>('SELECT * FROM encounter_minis WHERE id = ?', [id])!);
  }

  removeMiniAssignment(id: string): boolean {
    return this.run('DELETE FROM encounter_minis WHERE id = ?', [id]).changes > 0;
  }

  clearMiniAssignmentsForEncounter(encounterId: string): void {
    this.run('DELETE FROM encounter_minis WHERE encounter_id = ?', [encounterId]);
  }

  // ── NPC allies ────────────────────────────────────────────────────────────

  addNpcAlly(encounterId: string, npcId: string): void {
    this.run('INSERT OR IGNORE INTO encounter_npc_allies (encounter_id, npc_id) VALUES (?, ?)', [encounterId, npcId]);
  }

  removeNpcAlly(encounterId: string, npcId: string): boolean {
    return this.run('DELETE FROM encounter_npc_allies WHERE encounter_id = ? AND npc_id = ?', [encounterId, npcId]).changes > 0;
  }
}
