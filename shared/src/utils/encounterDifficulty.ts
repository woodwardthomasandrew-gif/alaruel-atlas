// shared/src/utils/encounterDifficulty.ts
//
// ── Encounter Difficulty Estimation ────────────────────────────────────────
//
// Pure, side-effect-free helpers for estimating how tough an encounter is,
// combining the 5e-style CR/XP budget math with a predetermined catalogue of
// terrain modifiers. Used by both the Encounters module (server-side
// estimate, given a caller-supplied CR/XP lookup) and the Encounter
// Workspace UI (live preview while planning).
//
// Nothing in this file talks to the database or the bestiary module — the
// caller always passes in the monster roster already resolved to
// {challengeRating, quantity} or {xp, quantity} pairs, keeping this module
// dependency-free and independently testable.
// ─────────────────────────────────────────────────────────────────────────

import type { EncounterDifficulty } from '../types/encounter';

// ── CR → XP table (5e SRD) ──────────────────────────────────────────────────

export const CR_TO_XP: Record<string, number> = {
  '0': 10,     '1/8': 25,   '1/4': 50,   '1/2': 100,
  '1': 200,    '2': 450,    '3': 700,    '4': 1100,
  '5': 1800,   '6': 2300,   '7': 2900,   '8': 3900,
  '9': 5000,   '10': 5900,  '11': 7200,  '12': 8400,
  '13': 10000, '14': 11500, '15': 13000, '16': 15000,
  '17': 18000, '18': 20000, '19': 22000, '20': 25000,
  '21': 33000, '22': 41000, '23': 50000, '24': 62000,
  '25': 75000, '26': 90000, '27': 105000,'28': 120000,
  '29': 135000,'30': 155000,
};

export function xpFromChallengeRating(cr: string | null | undefined): number {
  if (!cr) return 0;
  return CR_TO_XP[cr.trim()] ?? 0;
}

// ── Per-character XP thresholds by level (5e SRD "Encounter Difficulty" table) ──

interface LevelThresholds { easy: number; medium: number; hard: number; deadly: number; }

const XP_THRESHOLDS_BY_LEVEL: Record<number, LevelThresholds> = {
  1:  { easy: 25,   medium: 50,   hard: 75,   deadly: 100   },
  2:  { easy: 50,   medium: 100,  hard: 150,  deadly: 200   },
  3:  { easy: 75,   medium: 150,  hard: 225,  deadly: 400   },
  4:  { easy: 125,  medium: 250,  hard: 375,  deadly: 500   },
  5:  { easy: 250,  medium: 500,  hard: 750,  deadly: 1100  },
  6:  { easy: 300,  medium: 600,  hard: 900,  deadly: 1400  },
  7:  { easy: 350,  medium: 750,  hard: 1100, deadly: 1700  },
  8:  { easy: 450,  medium: 900,  hard: 1400, deadly: 2100  },
  9:  { easy: 550,  medium: 1100, hard: 1600, deadly: 2400  },
  10: { easy: 600,  medium: 1200, hard: 1900, deadly: 2800  },
  11: { easy: 800,  medium: 1600, hard: 2400, deadly: 3600  },
  12: { easy: 1000, medium: 2000, hard: 3000, deadly: 4500  },
  13: { easy: 1100, medium: 2200, hard: 3400, deadly: 5100  },
  14: { easy: 1250, medium: 2500, hard: 3800, deadly: 5700  },
  15: { easy: 1400, medium: 2800, hard: 4300, deadly: 6400  },
  16: { easy: 1600, medium: 3200, hard: 4800, deadly: 7200  },
  17: { easy: 2000, medium: 3900, hard: 5900, deadly: 8800  },
  18: { easy: 2100, medium: 4200, hard: 6300, deadly: 9500  },
  19: { easy: 2400, medium: 4900, hard: 7300, deadly: 10900 },
  20: { easy: 2800, medium: 5700, hard: 8500, deadly: 12700 },
};

function thresholdsForLevel(level: number): LevelThresholds {
  const clamped = Math.min(20, Math.max(1, Math.round(level) || 1));
  return XP_THRESHOLDS_BY_LEVEL[clamped]!;
}

// ── Monster-count encounter multiplier (DMG "Encounter Multipliers" table) ──
// Applied to the sum of monster XP based on how many creatures are in the
// fight (more targets = more action economy against the party = harder).

export function monsterCountMultiplier(monsterCount: number): number {
  if (monsterCount <= 1) return 1;
  if (monsterCount === 2) return 1.5;
  if (monsterCount <= 6)  return 2;
  if (monsterCount <= 10) return 2.5;
  if (monsterCount <= 14) return 3;
  return 4;
}

// ── Terrain modifier catalogue ──────────────────────────────────────────────
//
// Each modifier nudges the *effective* monster XP up or down by a fixed
// percentage. Multiple selected modifiers stack additively on the percentage
// (e.g. two +10% modifiers become +20%, not +21%) before being applied as a
// single multiplier — this keeps combinations predictable instead of
// compounding into absurd swings.

export type TerrainModifierAxis = 'favors_party' | 'favors_monsters' | 'neutral';

export interface TerrainModifier {
  id:          string;
  label:       string;
  description: string;
  /** Percentage adjustment to effective monster XP. Positive = harder fight. */
  percent:     number;
  axis:        TerrainModifierAxis;
}

export const TERRAIN_MODIFIERS: TerrainModifier[] = [
  {
    id: 'chokepoint', label: 'Chokepoint / Narrow Corridor',
    description: 'Enemies can only engage one or two PCs at a time — the party controls the fight.',
    percent: -15, axis: 'favors_party',
  },
  {
    id: 'high_ground_party', label: 'High Ground (Party)',
    description: 'The party holds an elevated, defensible position.',
    percent: -10, axis: 'favors_party',
  },
  {
    id: 'ample_cover', label: 'Ample Cover',
    description: 'Pillars, rubble, or foliage give the party plenty of places to break line of sight.',
    percent: -10, axis: 'favors_party',
  },
  {
    id: 'prepared_ambush', label: 'Party Has the Drop',
    description: 'The party is set up for a surprise round or ambush against the enemy.',
    percent: -15, axis: 'favors_party',
  },
  {
    id: 'open_field', label: 'Open Field / No Cover',
    description: 'Wide-open terrain lets every enemy engage freely and lets ranged/flying foes kite.',
    percent: 10, axis: 'favors_monsters',
  },
  {
    id: 'high_ground_monsters', label: 'High Ground (Monsters)',
    description: 'The enemy holds an elevated or otherwise advantageous position.',
    percent: 15, axis: 'favors_monsters',
  },
  {
    id: 'difficult_terrain', label: 'Widespread Difficult Terrain',
    description: 'Mud, rubble, or dense growth slows movement and complicates positioning.',
    percent: 10, axis: 'favors_monsters',
  },
  {
    id: 'low_visibility', label: 'Low Visibility / Darkness',
    description: 'Fog, smoke, or darkness hampers the party more than creatures with darkvision.',
    percent: 15, axis: 'favors_monsters',
  },
  {
    id: 'hazardous_environment', label: 'Hazardous Environment',
    description: 'Lava, deep water, cliffside footing, or similar environmental hazards add extra danger.',
    percent: 15, axis: 'favors_monsters',
  },
  {
    id: 'monster_ambush', label: 'Monsters Have the Drop',
    description: 'The enemy is set up for a surprise round or ambush against the party.',
    percent: 20, axis: 'favors_monsters',
  },
  {
    id: 'reinforcements', label: 'Reinforcements Nearby',
    description: 'Additional enemies can be summoned or can join partway through the fight.',
    percent: 15, axis: 'favors_monsters',
  },
  {
    id: 'confined_space', label: 'Confined / Cramped Space',
    description: 'Tight quarters limit the party\u2019s formation options and area-effect spacing.',
    percent: 5, axis: 'favors_monsters',
  },
];

const TERRAIN_MODIFIER_BY_ID = new Map(TERRAIN_MODIFIERS.map(m => [m.id, m]));

export function getTerrainModifier(id: string): TerrainModifier | undefined {
  return TERRAIN_MODIFIER_BY_ID.get(id);
}

/** Combined multiplier for a set of terrain modifier ids (unknown ids are ignored). */
export function combinedTerrainMultiplier(terrainModifierIds: readonly string[]): number {
  const totalPercent = terrainModifierIds.reduce((sum, id) => {
    const mod = TERRAIN_MODIFIER_BY_ID.get(id);
    return sum + (mod ? mod.percent : 0);
  }, 0);
  return Math.max(0, 1 + totalPercent / 100);
}

// ── Difficulty estimate ─────────────────────────────────────────────────────

export interface DifficultyMonsterInput {
  /** Either challengeRating or xp may be supplied; xp takes priority if both are given. */
  challengeRating?: string | undefined;
  xp?:              number | undefined;
  quantity:         number;
}

export interface EncounterDifficultyEstimate {
  /** Raw sum of monster XP (quantity-weighted), before any multiplier. */
  baseMonsterXp:        number;
  /** Total creature count across the roster. */
  monsterCount:         number;
  /** DMG action-economy multiplier for the monster count. */
  countMultiplier:      number;
  /** Combined terrain multiplier from the selected modifiers. */
  terrainMultiplier:    number;
  /** baseMonsterXp * countMultiplier * terrainMultiplier */
  adjustedXp:           number;
  /** Party XP thresholds (sum across all party members) for this party level/size. */
  thresholds:           LevelThresholds;
  /** Resulting difficulty tier, reusing the encounter's own difficulty enum. */
  tier:                 EncounterDifficulty;
  partyLevel:           number;
  partySize:             number;
  appliedTerrainModifiers: TerrainModifier[];
}

export interface DifficultyEstimateInput {
  partyLevel:          number;
  partySize:           number;
  monsters:            DifficultyMonsterInput[];
  terrainModifierIds?: readonly string[];
}

function tierFromXp(adjustedXp: number, thresholds: LevelThresholds): EncounterDifficulty {
  if (adjustedXp <= 0)               return 'trivial';
  if (adjustedXp < thresholds.easy)  return 'trivial';
  if (adjustedXp < thresholds.medium) return 'easy';
  if (adjustedXp < thresholds.hard)  return 'moderate';
  if (adjustedXp < thresholds.deadly) return 'hard';
  return 'deadly';
}

export function calculateEncounterDifficulty(input: DifficultyEstimateInput): EncounterDifficultyEstimate {
  const partyLevel = Math.max(1, Math.round(input.partyLevel) || 1);
  const partySize  = Math.max(1, Math.round(input.partySize) || 1);
  const terrainIds = input.terrainModifierIds ?? [];

  const baseMonsterXp = input.monsters.reduce((sum, m) => {
    const perCreature = m.xp !== undefined ? m.xp : xpFromChallengeRating(m.challengeRating);
    return sum + perCreature * Math.max(0, m.quantity);
  }, 0);
  const monsterCount = input.monsters.reduce((n, m) => n + Math.max(0, m.quantity), 0);

  const countMultiplier   = monsterCountMultiplier(monsterCount);
  const terrainMultiplier = combinedTerrainMultiplier(terrainIds);
  const adjustedXp        = Math.round(baseMonsterXp * countMultiplier * terrainMultiplier);

  const perCharacter = thresholdsForLevel(partyLevel);
  const thresholds: LevelThresholds = {
    easy:   perCharacter.easy   * partySize,
    medium: perCharacter.medium * partySize,
    hard:   perCharacter.hard   * partySize,
    deadly: perCharacter.deadly * partySize,
  };

  return {
    baseMonsterXp,
    monsterCount,
    countMultiplier,
    terrainMultiplier,
    adjustedXp,
    thresholds,
    tier: tierFromXp(adjustedXp, thresholds),
    partyLevel,
    partySize,
    appliedTerrainModifiers: terrainIds
      .map(id => TERRAIN_MODIFIER_BY_ID.get(id))
      .filter((m): m is TerrainModifier => Boolean(m)),
  };
}
