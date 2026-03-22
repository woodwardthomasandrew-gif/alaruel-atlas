// modules/bestiary/src/repository.ts
// Monster data-access layer. All SQL lives here.

import { BaseRepository }        from '../../_framework/src/index';
import type { IDatabaseManager } from '../../../core/database/src/types';
import type { Logger }           from '../../../core/logger/src/types';
import type { Monster }          from '../../../shared/src/types/monster';
import type {
  MonsterRow,
  CreateMonsterInput,
  UpdateMonsterInput,
  MonsterListQuery,
} from './types';

// ── Row → Domain mapper ───────────────────────────────────────────────────────

function rowToMonster(row: MonsterRow): Monster {
  return {
    id:            row.id,
    name:          row.name,
    description:   row.description,
    creatureType:  row.creature_type,
    subtype:       row.subtype ?? undefined,
    size:          row.size,
    alignment:     row.alignment,
    armorClass:    row.armor_class,
    armorType:     row.armor_type ?? undefined,
    hitPoints:     row.hit_points,
    hitDice:       row.hit_dice ?? undefined,
    speed:         row.speed,
    speedOther:    JSON.parse(row.speed_other) as Record<string, number>,
    abilityScores: {
      str: row.str, dex: row.dex, con: row.con,
      int: row.int, wis: row.wis, cha: row.cha,
    },
    proficiencyBonus:        row.proficiency_bonus,
    challengeRating:         row.challenge_rating,
    xpValue:                 row.xp_value,
    savingThrows:            JSON.parse(row.saving_throws),
    skills:                  JSON.parse(row.skills),
    damageVulnerabilities:   JSON.parse(row.damage_vulnerabilities),
    damageResistances:       JSON.parse(row.damage_resistances),
    damageImmunities:        JSON.parse(row.damage_immunities),
    conditionImmunities:     JSON.parse(row.condition_immunities),
    senses:                  row.senses    ?? undefined,
    languages:               row.languages ?? undefined,
    traits:                  JSON.parse(row.traits),
    actions:                 JSON.parse(row.actions),
    reactions:               JSON.parse(row.reactions),
    legendaryActions:        JSON.parse(row.legendary_actions),
    legendaryDescription:    row.legendary_description ?? undefined,
    bonusActions:            JSON.parse(row.bonus_actions),
    lore:                    row.lore ?? undefined,
    imageAssetId:            row.image_asset_id ?? undefined,
    habitatLocationIds:      JSON.parse(row.habitat_location_ids),
    isHomebrew:              row.is_homebrew === 1,
    tags:                    JSON.parse(row.tags),
    createdAt:               row.created_at as Monster['createdAt'],
    updatedAt:               row.updated_at as Monster['updatedAt'],
  };
}

// ── Repository ────────────────────────────────────────────────────────────────

export class BestiaryRepository extends BaseRepository {
  constructor(db: IDatabaseManager, log: Logger) {
    super('bestiary', db, log);
  }

  // ── Reads ──────────────────────────────────────────────────────────────────

  findById(id: string): Monster | null {
    const row = this.queryOne<MonsterRow>(
      'SELECT * FROM monsters WHERE id = ? AND campaign_id = ?',
      [id, this.campaignId],
    );
    return row ? rowToMonster(row) : null;
  }

  findAll(query: MonsterListQuery = {}): Monster[] {
    const conditions: string[] = ['campaign_id = ?'];
    const params: (string | number)[] = [this.campaignId];

    if (query.creatureType) {
      conditions.push('creature_type = ?');
      params.push(query.creatureType);
    }
    if (query.size) {
      conditions.push('size = ?');
      params.push(query.size);
    }
    if (query.isHomebrew !== undefined) {
      conditions.push('is_homebrew = ?');
      params.push(query.isHomebrew ? 1 : 0);
    }
    if (query.search) {
      conditions.push('(name LIKE ? OR description LIKE ?)');
      const like = `%${query.search}%`;
      params.push(like, like);
    }

    const where  = conditions.join(' AND ');
    const limit  = query.limit  ?? 200;
    const offset = query.offset ?? 0;

    const rows = this.query<MonsterRow>(
      `SELECT * FROM monsters WHERE ${where} ORDER BY name ASC LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    return rows.map(rowToMonster);
  }

  count(query: MonsterListQuery = {}): number {
    const conditions: string[] = ['campaign_id = ?'];
    const params: (string | number)[] = [this.campaignId];
    if (query.creatureType) { conditions.push('creature_type = ?'); params.push(query.creatureType); }
    if (query.size)         { conditions.push('size = ?');          params.push(query.size); }
    if (query.isHomebrew !== undefined) {
      conditions.push('is_homebrew = ?');
      params.push(query.isHomebrew ? 1 : 0);
    }
    if (query.search) {
      conditions.push('(name LIKE ? OR description LIKE ?)');
      const like = `%${query.search}%`;
      params.push(like, like);
    }
    const where = conditions.join(' AND ');
    const row   = this.queryOne<{ c: number }>(
      `SELECT COUNT(*) AS c FROM monsters WHERE ${where}`,
      params,
    );
    return row?.c ?? 0;
  }

  // ── Writes ─────────────────────────────────────────────────────────────────

  create(
    input: CreateMonsterInput & { id: string; createdAt: string; updatedAt: string },
  ): Monster {
    const ab = input.abilityScores ?? { str:10, dex:10, con:10, int:10, wis:10, cha:10 };
    this.run(
      `INSERT INTO monsters (
         id, campaign_id, name, description, creature_type, subtype, size, alignment,
         armor_class, armor_type, hit_points, hit_dice, speed, speed_other,
         str, dex, con, int, wis, cha,
         proficiency_bonus, challenge_rating, xp_value,
         saving_throws, skills,
         damage_vulnerabilities, damage_resistances, damage_immunities, condition_immunities,
         senses, languages,
         traits, actions, reactions, legendary_actions, legendary_description, bonus_actions,
         lore, image_asset_id, habitat_location_ids, is_homebrew, tags,
         created_at, updated_at
       ) VALUES (
         ?,?,?,?,?,?,?,?,
         ?,?,?,?,?,?,
         ?,?,?,?,?,?,
         ?,?,?,
         ?,?,
         ?,?,?,?,
         ?,?,
         ?,?,?,?,?,?,
         ?,?,?,?,?,
         ?,?
       )`,
      [
        input.id, this.campaignId,
        input.name,
        input.description          ?? '',
        input.creatureType         ?? 'monstrosity',
        input.subtype              ?? null,
        input.size                 ?? 'medium',
        input.alignment            ?? 'true neutral',
        input.armorClass           ?? 10,
        input.armorType            ?? null,
        input.hitPoints            ?? 1,
        input.hitDice              ?? null,
        input.speed                ?? 30,
        JSON.stringify(input.speedOther ?? {}),
        ab.str, ab.dex, ab.con, ab.int, ab.wis, ab.cha,
        input.proficiencyBonus     ?? 2,
        input.challengeRating      ?? '0',
        input.xpValue              ?? 0,
        JSON.stringify(input.savingThrows          ?? {}),
        JSON.stringify(input.skills               ?? {}),
        JSON.stringify(input.damageVulnerabilities ?? []),
        JSON.stringify(input.damageResistances     ?? []),
        JSON.stringify(input.damageImmunities      ?? []),
        JSON.stringify(input.conditionImmunities   ?? []),
        input.senses               ?? null,
        input.languages            ?? null,
        JSON.stringify(input.traits              ?? []),
        JSON.stringify(input.actions             ?? []),
        JSON.stringify(input.reactions           ?? []),
        JSON.stringify(input.legendaryActions    ?? []),
        input.legendaryDescription ?? null,
        JSON.stringify(input.bonusActions        ?? []),
        input.lore                 ?? null,
        input.imageAssetId         ?? null,
        JSON.stringify(input.habitatLocationIds  ?? []),
        input.isHomebrew === false ? 0 : 1,
        JSON.stringify(input.tags ?? []),
        input.createdAt,
        input.updatedAt,
      ],
    );
    return this.findById(input.id)!;
  }

  update(input: UpdateMonsterInput & { updatedAt: string }): Monster | null {
    const sets: string[]                        = ['updated_at = ?'];
    const params: (string | number | null)[]    = [input.updatedAt];

    const push = (col: string, val: string | number | null) => {
      sets.push(`${col} = ?`);
      params.push(val);
    };
    const pushJson = (col: string, val: unknown) => push(col, JSON.stringify(val));

    if (input.name              !== undefined) push('name',                  input.name);
    if (input.description       !== undefined) push('description',           input.description);
    if (input.creatureType      !== undefined) push('creature_type',         input.creatureType);
    if (input.subtype           !== undefined) push('subtype',               input.subtype ?? null);
    if (input.size              !== undefined) push('size',                  input.size);
    if (input.alignment         !== undefined) push('alignment',             input.alignment);
    if (input.armorClass        !== undefined) push('armor_class',           input.armorClass);
    if (input.armorType         !== undefined) push('armor_type',            input.armorType ?? null);
    if (input.hitPoints         !== undefined) push('hit_points',            input.hitPoints);
    if (input.hitDice           !== undefined) push('hit_dice',              input.hitDice ?? null);
    if (input.speed             !== undefined) push('speed',                 input.speed);
    if (input.speedOther        !== undefined) pushJson('speed_other',       input.speedOther);
    if (input.abilityScores     !== undefined) {
      const ab = input.abilityScores;
      push('str', ab.str); push('dex', ab.dex); push('con', ab.con);
      push('int', ab.int); push('wis', ab.wis); push('cha', ab.cha);
    }
    if (input.proficiencyBonus      !== undefined) push('proficiency_bonus',     input.proficiencyBonus);
    if (input.challengeRating       !== undefined) push('challenge_rating',      input.challengeRating);
    if (input.xpValue               !== undefined) push('xp_value',              input.xpValue);
    if (input.savingThrows          !== undefined) pushJson('saving_throws',      input.savingThrows);
    if (input.skills                !== undefined) pushJson('skills',             input.skills);
    if (input.damageVulnerabilities !== undefined) pushJson('damage_vulnerabilities', input.damageVulnerabilities);
    if (input.damageResistances     !== undefined) pushJson('damage_resistances', input.damageResistances);
    if (input.damageImmunities      !== undefined) pushJson('damage_immunities',  input.damageImmunities);
    if (input.conditionImmunities   !== undefined) pushJson('condition_immunities', input.conditionImmunities);
    if (input.senses                !== undefined) push('senses',                input.senses ?? null);
    if (input.languages             !== undefined) push('languages',             input.languages ?? null);
    if (input.traits                !== undefined) pushJson('traits',            input.traits);
    if (input.actions               !== undefined) pushJson('actions',           input.actions);
    if (input.reactions             !== undefined) pushJson('reactions',         input.reactions);
    if (input.legendaryActions      !== undefined) pushJson('legendary_actions', input.legendaryActions);
    if (input.legendaryDescription  !== undefined) push('legendary_description', input.legendaryDescription ?? null);
    if (input.bonusActions          !== undefined) pushJson('bonus_actions',     input.bonusActions);
    if (input.lore                  !== undefined) push('lore',                 input.lore ?? null);
    if (input.imageAssetId          !== undefined) push('image_asset_id',       input.imageAssetId ?? null);
    if (input.habitatLocationIds    !== undefined) pushJson('habitat_location_ids', input.habitatLocationIds);
    if (input.isHomebrew            !== undefined) push('is_homebrew',          input.isHomebrew ? 1 : 0);
    if (input.tags                  !== undefined) pushJson('tags',             input.tags);

    params.push(input.id, this.campaignId);
    this.run(
      `UPDATE monsters SET ${sets.join(', ')} WHERE id = ? AND campaign_id = ?`,
      params,
    );
    return this.findById(input.id);
  }

  delete(id: string): boolean {
    const result = this.run(
      'DELETE FROM monsters WHERE id = ? AND campaign_id = ?',
      [id, this.campaignId],
    );
    return result.changes > 0;
  }
}
