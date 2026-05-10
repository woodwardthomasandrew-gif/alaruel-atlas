// ui/src/views/bestiary/monsterCalc.ts
//
// ── Monster Statblock Calculation Utilities ───────────────────────────────────
//
// All derived-stat logic lives here and NOWHERE ELSE.
// Components import these functions; they never inline the math themselves.
//
// Rules:
//   - Pure functions only (no side effects, no imports from React or atlas)
//   - Every function is independently unit-testable
//   - Backward-compatible: all inputs are optional / have sensible defaults
// ─────────────────────────────────────────────────────────────────────────────

// ── Ability score keys ────────────────────────────────────────────────────────

import type { SpellcastingModule, SpellcastingModuleKind } from '../../../../shared/src/types/monster';

export type AbilityKey = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';

export const ABILITY_KEYS: AbilityKey[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

export const ABILITY_LABELS: Record<AbilityKey, string> = {
  str: 'STR', dex: 'DEX', con: 'CON',
  int: 'INT', wis: 'WIS', cha: 'CHA',
};

// ── CR → XP table (5e SRD) ───────────────────────────────────────────────────

const CR_XP: Record<string, number> = {
  '0': 10,   '1/8': 25,  '1/4': 50,  '1/2': 100,
  '1': 200,  '2': 450,   '3': 700,   '4': 1100,
  '5': 1800, '6': 2300,  '7': 2900,  '8': 3900,
  '9': 5000, '10': 5900, '11': 7200, '12': 8400,
  '13': 10000,'14': 11500,'15': 13000,'16': 15000,
  '17': 18000,'18': 20000,'19': 22000,'20': 25000,
  '21': 33000,'22': 41000,'23': 50000,'24': 62000,
  '25': 75000,'26': 90000,'27': 105000,'28': 120000,
  '29': 135000,'30': 155000,
};

// ── CR → Proficiency Bonus table (5e SRD) ─────────────────────────────────────
//
// CR  0–4  → +2
// CR  5–8  → +3
// CR  9–12 → +4
// CR 13–16 → +5
// CR 17–20 → +6
// CR 21–24 → +7
// CR 25–28 → +8
// CR 29–30 → +9

const CR_PB: Record<string, number> = {
  '0': 2, '1/8': 2, '1/4': 2, '1/2': 2,
  '1': 2, '2': 2, '3': 2, '4': 2,
  '5': 3, '6': 3, '7': 3, '8': 3,
  '9': 4, '10': 4, '11': 4, '12': 4,
  '13': 5, '14': 5, '15': 5, '16': 5,
  '17': 6, '18': 6, '19': 6, '20': 6,
  '21': 7, '22': 7, '23': 7, '24': 7,
  '25': 8, '26': 8, '27': 8, '28': 8,
  '29': 9, '30': 9,
};

// ── Core derivation functions ─────────────────────────────────────────────────

/**
 * Derive proficiency bonus from challenge rating string.
 * Returns the SRD value, or 2 as a safe fallback for unknown CRs.
 */
export function proficiencyFromCR(cr: string): number {
  return CR_PB[cr] ?? 2;
}

/**
 * Derive XP award from challenge rating string.
 * Returns 0 for unknown CRs.
 */
export function xpFromCR(cr: string): number {
  return CR_XP[cr] ?? 0;
}

/**
 * Compute the ability score modifier (floor((score - 10) / 2)).
 * Returns an integer; format with formatMod() for display.
 */
export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

/**
 * Format a signed modifier for display: "+2", "-1", "+0".
 */
export function formatMod(mod: number): string {
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

/**
 * Convenience: get a formatted modifier string directly from an ability score.
 */
export function formatAbilityMod(score: number): string {
  return formatMod(abilityModifier(score));
}

// ── Saving throw calculation ───────────────────────────────────────────────────

/**
 * Compute a saving throw total.
 *
 * @param abilityScore  - The raw ability score (e.g. STR 16)
 * @param proficient    - Whether the creature has saving throw proficiency
 * @param profBonus     - Proficiency bonus (from proficiencyFromCR or manual)
 * @param override      - If provided, bypass calculation and use this value
 */
export function calcSavingThrow(
  abilityScore: number,
  proficient:   boolean,
  profBonus:    number,
  override?:    number,
): number {
  if (override !== undefined) return override;
  const mod = abilityModifier(abilityScore);
  return proficient ? mod + profBonus : mod;
}

/**
 * Saving throw configuration for the form — one entry per ability.
 * Stored as form state; serialised to the DB `saving_throws` column
 * as computed final values (Partial<AbilityScores> of numbers).
 */
export interface SaveThrowConfig {
  proficient: boolean;
  /** When set, overrides the computed value entirely. */
  override?: number;
}

export type SaveThrowConfigs = Partial<Record<AbilityKey, SaveThrowConfig>>;

/**
 * Compute all saving throw final values from config + ability scores.
 * Returns only entries where the creature has proficiency OR an override.
 * Output is ready to JSON.stringify into the `saving_throws` DB column.
 */
export function computeSavingThrows(
  abilityScores: Record<AbilityKey, number>,
  configs:       SaveThrowConfigs,
  profBonus:     number,
): Partial<Record<AbilityKey, number>> {
  const result: Partial<Record<AbilityKey, number>> = {};
  for (const key of ABILITY_KEYS) {
    const cfg = configs[key];
    if (!cfg) continue;
    if (!cfg.proficient && cfg.override === undefined) continue;
    result[key] = calcSavingThrow(abilityScores[key], cfg.proficient, profBonus, cfg.override);
  }
  return result;
}

/**
 * Reconstruct SaveThrowConfigs from stored DB values.
 * Since the DB only stores final numbers (not the proficient flag),
 * we infer proficiency by checking whether the stored value equals
 * the expected proficient value. This is a best-effort reconstruction
 * for existing records; new records store configs directly in form state.
 */
export function inferSaveConfigs(
  storedThrows:  Partial<Record<AbilityKey, number>>,
  abilityScores: Record<AbilityKey, number>,
  profBonus:     number,
): SaveThrowConfigs {
  const configs: SaveThrowConfigs = {};
  for (const key of ABILITY_KEYS) {
    const stored = storedThrows[key];
    if (stored === undefined) continue;
    const modOnly  = abilityModifier(abilityScores[key]);
    const withProf = modOnly + profBonus;
    // If stored value == modifier + profBonus → assume proficient, no override
    if (stored === withProf) {
      configs[key] = { proficient: true };
    } else {
      // Otherwise treat as manual override (proficient flag doesn't matter for display)
      configs[key] = { proficient: false, override: stored };
    }
  }
  return configs;
}

// ── Attack bonus calculation ───────────────────────────────────────────────────

/**
 * Compute an attack bonus for an action.
 *
 * @param abilityScore - Ability score used for the attack (STR or DEX typically)
 * @param proficient   - Whether proficiency applies to this attack
 * @param profBonus    - Proficiency bonus
 * @param override     - Manual override; bypasses calculation when set
 */
export function calcAttackBonus(
  abilityScore: number,
  proficient:   boolean,
  profBonus:    number,
  override?:    number,
): number {
  if (override !== undefined) return override;
  const mod = abilityModifier(abilityScore);
  return proficient ? mod + profBonus : mod;
}

// ── Damage bonus calculation ───────────────────────────────────────────────────

/**
 * Compute the bonus portion of a damage roll (not the dice part).
 *
 * @param abilityScore - Ability score driving the damage bonus
 * @param override     - Manual override
 */
export function calcDamageBonus(
  abilityScore: number,
  override?:    number,
): number {
  if (override !== undefined) return override;
  return abilityModifier(abilityScore);
}

// ── Spell save DC ─────────────────────────────────────────────────────────────

/**
 * Compute spell save DC: 8 + proficiency bonus + spellcasting ability modifier.
 *
 * @param spellcastingAbility - Ability score used for spellcasting (INT/WIS/CHA)
 * @param profBonus           - Proficiency bonus
 * @param override            - Manual override
 */
export function calcSpellSaveDC(
  spellcastingAbility: number,
  profBonus:           number,
  override?:           number,
): number {
  if (override !== undefined) return override;
  return 8 + profBonus + abilityModifier(spellcastingAbility);
}

/**
 * Compute spell attack bonus: proficiency bonus + spellcasting ability modifier.
 */
export function calcSpellAttackBonus(
  spellcastingAbility: number,
  profBonus:           number,
  override?:           number,
): number {
  if (override !== undefined) return override;
  return profBonus + abilityModifier(spellcastingAbility);
}

// ── Extended action type ───────────────────────────────────────────────────────
//
// Extends the existing ActionRow (stored as JSON in the DB) with optional
// automation fields. All new fields are optional so existing stored JSON
// remains valid without migration.

export interface ActionCalcFields {
  /** Which ability score drives the attack/damage bonus. Default: 'str' */
  abilityKey?: AbilityKey;
  /** Whether proficiency applies to the attack bonus. Default: true */
  proficient?: boolean;
  /**
   * When set, overrides the calculated attackBonus entirely.
   * This is already present as `attackBonus` in the existing ActionRow —
   * we treat the existing field as the override when present.
   */
  attackBonusOverride?: number;
  /**
   * When set, overrides the calculated damage bonus portion.
   * The dice string (e.g. "2d6") stays in `damage`; this overrides the +N part.
   */
  damageBonusOverride?: number;
}

// ── Passive Perception ────────────────────────────────────────────────────────

/**
 * Compute passive Perception: 10 + perception skill bonus.
 * If the creature has Perception proficiency, that's already in skillBonus.
 */
export function calcPassivePerception(
  wisScore:     number,
  perceptionBonus?: number,
): number {
  if (perceptionBonus !== undefined) return 10 + perceptionBonus;
  return 10 + abilityModifier(wisScore);
}

// ── Skill helpers ────────────────────────────────────────────────────────────

export interface SkillDefinition {
  key: SkillKey;
  label: string;
  abilityKey: AbilityKey;
}

export type SkillKey =
  | 'acrobatics'
  | 'animal_handling'
  | 'arcana'
  | 'athletics'
  | 'deception'
  | 'history'
  | 'insight'
  | 'intimidation'
  | 'investigation'
  | 'medicine'
  | 'nature'
  | 'perception'
  | 'performance'
  | 'persuasion'
  | 'religion'
  | 'sleight_of_hand'
  | 'stealth'
  | 'survival';

export const SKILL_DEFS: SkillDefinition[] = [
  { key: 'acrobatics',      label: 'Acrobatics',      abilityKey: 'dex' },
  { key: 'animal_handling',  label: 'Animal Handling', abilityKey: 'wis' },
  { key: 'arcana',          label: 'Arcana',          abilityKey: 'int' },
  { key: 'athletics',       label: 'Athletics',       abilityKey: 'str' },
  { key: 'deception',       label: 'Deception',       abilityKey: 'cha' },
  { key: 'history',         label: 'History',         abilityKey: 'int' },
  { key: 'insight',         label: 'Insight',         abilityKey: 'wis' },
  { key: 'intimidation',    label: 'Intimidation',    abilityKey: 'cha' },
  { key: 'investigation',   label: 'Investigation',   abilityKey: 'int' },
  { key: 'medicine',        label: 'Medicine',        abilityKey: 'wis' },
  { key: 'nature',          label: 'Nature',          abilityKey: 'int' },
  { key: 'perception',      label: 'Perception',      abilityKey: 'wis' },
  { key: 'performance',     label: 'Performance',     abilityKey: 'cha' },
  { key: 'persuasion',      label: 'Persuasion',      abilityKey: 'cha' },
  { key: 'religion',        label: 'Religion',        abilityKey: 'int' },
  { key: 'sleight_of_hand',  label: 'Sleight of Hand', abilityKey: 'dex' },
  { key: 'stealth',         label: 'Stealth',         abilityKey: 'dex' },
  { key: 'survival',        label: 'Survival',        abilityKey: 'wis' },
];

export const SKILL_KEYS: SkillKey[] = SKILL_DEFS.map(def => def.key);

export const SKILL_LABELS: Record<SkillKey, string> = Object.fromEntries(
  SKILL_DEFS.map(def => [def.key, def.label]),
) as Record<SkillKey, string>;

export const SKILL_ABILITIES: Record<SkillKey, AbilityKey> = Object.fromEntries(
  SKILL_DEFS.map(def => [def.key, def.abilityKey]),
) as Record<SkillKey, AbilityKey>;

export const SKILL_OPTIONS = SKILL_DEFS.map(def => ({
  key: def.key,
  label: def.label,
  abilityKey: def.abilityKey,
}));

export interface SkillConfig {
  proficient?: boolean;
  expertise?: boolean;
  override?: number;
}

export type SkillConfigs = Partial<Record<SkillKey, number | SkillConfig>>;

export function inferSkillConfigs(
  storedSkills: Partial<Record<string, number | SkillConfig>>,
  abilityScores: Record<AbilityKey, number>,
  profBonus: number,
): SkillConfigs {
  const configs: SkillConfigs = {};
  for (const key of SKILL_KEYS) {
    const stored = storedSkills[key];
    if (stored === undefined) continue;

    if (typeof stored === 'number') {
      const ability = abilityModifier(abilityScores[SKILL_ABILITIES[key]]);
      const proficientTotal = ability + profBonus;
      const expertiseTotal = ability + profBonus * 2;
      if (stored === expertiseTotal) configs[key] = { proficient: true, expertise: true };
      else if (stored === proficientTotal) configs[key] = { proficient: true };
      else configs[key] = { proficient: false, override: stored };
      continue;
    }

    configs[key] = {
      proficient: Boolean(stored.proficient),
      expertise: Boolean(stored.expertise),
      override: stored.override,
    };
  }
  return configs;
}

export function skillBonus(
  _skillKey: SkillKey,
  abilityScore: number,
  profBonus: number,
  config?: number | SkillConfig,
): number {
  if (typeof config === 'number') return config;
  if (config?.override !== undefined) return config.override;
  const base = abilityModifier(abilityScore);
  if (!config?.proficient) return base;
  return base + profBonus * (config.expertise ? 2 : 1);
}

export function formatSkillBonus(value: number): string {
  return formatMod(value);
}

// ── Spellcasting module helpers ───────────────────────────────────────────────

export const SPELLCASTING_MODULE_KINDS: SpellcastingModuleKind[] = [
  'spellcasting',
  'innate_spellcasting',
  'psionics',
  'ritual_casting',
];

export const SPELLCASTING_MODULE_LABELS: Record<SpellcastingModuleKind, string> = {
  spellcasting: 'Spellcasting',
  innate_spellcasting: 'Innate Spellcasting',
  psionics: 'Psionics',
  ritual_casting: 'Ritual Casting',
};

export function createSpellcastingModule(kind: SpellcastingModuleKind): SpellcastingModule {
  return {
    kind,
    spellcastingAbility: 'int',
    spellSlots: '',
    preparedSpells: '',
    atWillSpells: '',
    dailySpells: '',
    ritualTags: '',
    notes: '',
  };
}

export function splitListInput(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(/[\n,;]+/)
    .map(item => item.trim())
    .filter(Boolean);
}

export function formatListSummary(raw: string | null | undefined): string {
  const values = splitListInput(raw);
  return values.length ? values.join(', ') : '';
}

export function getSpellcastingAbilityLabel(ability: AbilityKey): string {
  return ABILITY_FULL_NAMES[ability];
}

// ── Spellcasting ability options ──────────────────────────────────────────────

export const SPELLCASTING_ABILITIES: AbilityKey[] = ['int', 'wis', 'cha'];

export const ABILITY_FULL_NAMES: Record<AbilityKey, string> = {
  str: 'Strength', dex: 'Dexterity', con: 'Constitution',
  int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma',
};

// ── Hit dice by creature size (5e SRD) ────────────────────────────────────────

/**
 * Maps creature size to the hit die value used in that size category.
 * Tiny: d4 | Small: d6 | Medium: d8 | Large: d10 | Huge: d12 | Gargantuan: d20
 */
export const HIT_DIE_BY_SIZE: Record<string, number> = {
  tiny:       4,
  small:      6,
  medium:     8,
  large:      10,
  huge:       12,
  gargantuan: 20,
};

/**
 * Return the hit die sides for a given creature size string.
 * Defaults to d8 (Medium) for unknown sizes.
 */
export function hitDieForSize(size: string): number {
  return HIT_DIE_BY_SIZE[size.toLowerCase()] ?? 8;
}

/**
 * Compute average HP from dice count, die sides, and CON score.
 *
 * Formula: diceCount × ((dieSides + 1) / 2) + diceCount × conMod
 *
 * The average of a dN is (N+1)/2. The CON modifier is applied once per
 * hit die (not once total).
 *
 * @param diceCount - Number of hit dice (e.g. 5 for "5d8")
 * @param dieSides  - Die value (4, 6, 8, 10, 12, or 20)
 * @param conScore  - Constitution ability score (not the modifier)
 * @returns Average HP rounded down to nearest integer
 */
export function calcAverageHp(
  diceCount: number,
  dieSides:  number,
  conScore:  number,
): number {
  const dieAvg = (dieSides + 1) / 2;
  const conMod = abilityModifier(conScore);
  return Math.floor(diceCount * dieAvg + diceCount * conMod);
}

/**
 * Build the hit dice notation string, e.g. "5d8+10" or "3d6-3".
 * The CON bonus term is omitted when the modifier is 0.
 */
export function buildHitDiceString(
  diceCount: number,
  dieSides:  number,
  conScore:  number,
): string {
  const conMod   = abilityModifier(conScore);
  const conTotal = diceCount * conMod;
  if (conTotal === 0) return `${diceCount}d${dieSides}`;
  if (conTotal > 0)   return `${diceCount}d${dieSides}+${conTotal}`;
  return `${diceCount}d${dieSides}${conTotal}`; // conTotal is negative, sign already present
}

// ── Action / trait presets ────────────────────────────────────────────────────

export interface ActionPreset {
  /** Category for grouping in the dropdown */
  category:     ActionPresetCategory;
  /** Display name for the preset in the dropdown */
  label:        string;
  /** Pre-filled name field */
  name:         string;
  /** Description template. Use {atkBonus}, {dmgDice}, {dmgBonus}, {dc} as placeholders */
  description:  string;
  /** Which ability to default to for attack/damage bonus calculation */
  abilityKey:   AbilityKey;
  /** Whether this attack uses proficiency bonus */
  proficient:   boolean;
  /** Damage dice string (without the +modifier, e.g. "2d6") */
  damageDice?:  string;
  /** Damage type */
  damageType?:  string;
  /** Recharge expression if applicable */
  recharge?:    string;
}

export type ActionPresetCategory =
  | 'melee'
  | 'ranged'
  | 'special'
  | 'trait'
  | 'bonus'
  | 'reaction'
  | 'legendary'
  | 'spellcasting';

export const ACTION_PRESETS: ActionPreset[] = [
  // ── Melee attacks ──────────────────────────────────────────────────────────
  {
    category: 'melee', label: 'Claws', name: 'Claws',
    description: 'Melee Weapon Attack: {atkBonus} to hit, reach 5 ft., one target. Hit: {dmgDice}{dmgBonus} slashing damage.',
    abilityKey: 'str', proficient: true, damageDice: '2d6', damageType: 'slashing',
  },
  {
    category: 'melee', label: 'Bite', name: 'Bite',
    description: 'Melee Weapon Attack: {atkBonus} to hit, reach 5 ft., one target. Hit: {dmgDice}{dmgBonus} piercing damage.',
    abilityKey: 'str', proficient: true, damageDice: '1d10', damageType: 'piercing',
  },
  {
    category: 'melee', label: 'Slam', name: 'Slam',
    description: 'Melee Weapon Attack: {atkBonus} to hit, reach 5 ft., one target. Hit: {dmgDice}{dmgBonus} bludgeoning damage.',
    abilityKey: 'str', proficient: true, damageDice: '2d6', damageType: 'bludgeoning',
  },
  {
    category: 'melee', label: 'Longsword', name: 'Longsword',
    description: 'Melee Weapon Attack: {atkBonus} to hit, reach 5 ft., one target. Hit: {dmgDice}{dmgBonus} slashing damage, or {dmgDice}{dmgBonus} slashing damage if used with two hands.',
    abilityKey: 'str', proficient: true, damageDice: '1d8', damageType: 'slashing',
  },
  {
    category: 'melee', label: 'Shortsword', name: 'Shortsword',
    description: 'Melee Weapon Attack: {atkBonus} to hit, reach 5 ft., one target. Hit: {dmgDice}{dmgBonus} piercing damage.',
    abilityKey: 'dex', proficient: true, damageDice: '1d6', damageType: 'piercing',
  },
  {
    category: 'melee', label: 'Greataxe', name: 'Greataxe',
    description: 'Melee Weapon Attack: {atkBonus} to hit, reach 5 ft., one target. Hit: {dmgDice}{dmgBonus} slashing damage.',
    abilityKey: 'str', proficient: true, damageDice: '1d12', damageType: 'slashing',
  },
  {
    category: 'melee', label: 'Tail', name: 'Tail',
    description: 'Melee Weapon Attack: {atkBonus} to hit, reach 10 ft., one target. Hit: {dmgDice}{dmgBonus} bludgeoning damage.',
    abilityKey: 'str', proficient: true, damageDice: '2d8', damageType: 'bludgeoning',
  },
  {
    category: 'melee', label: 'Tentacle', name: 'Tentacle',
    description: 'Melee Weapon Attack: {atkBonus} to hit, reach 10 ft., one target. Hit: {dmgDice}{dmgBonus} bludgeoning damage. If the target is Medium or smaller, it is grappled (escape DC {dc}).',
    abilityKey: 'str', proficient: true, damageDice: '2d6', damageType: 'bludgeoning',
  },
  {
    category: 'melee', label: 'Dagger', name: 'Dagger',
    description: 'Melee or Ranged Weapon Attack: {atkBonus} to hit, reach 5 ft. or range 20/60 ft., one target. Hit: {dmgDice}{dmgBonus} piercing damage.',
    abilityKey: 'dex', proficient: true, damageDice: '1d4', damageType: 'piercing',
  },
  {
    category: 'melee', label: 'Spear', name: 'Spear',
    description: 'Melee or Ranged Weapon Attack: {atkBonus} to hit, reach 5 ft. or range 20/60 ft., one target. Hit: {dmgDice}{dmgBonus} piercing damage, or {dmgDice}{dmgBonus} piercing damage if used with two hands to make a melee attack.',
    abilityKey: 'str', proficient: true, damageDice: '1d6', damageType: 'piercing',
  },
  {
    category: 'melee', label: 'Scimitar', name: 'Scimitar',
    description: 'Melee Weapon Attack: {atkBonus} to hit, reach 5 ft., one target. Hit: {dmgDice}{dmgBonus} slashing damage.',
    abilityKey: 'dex', proficient: true, damageDice: '1d6', damageType: 'slashing',
  },
  {
    category: 'melee', label: 'Gore', name: 'Gore',
    description: 'Melee Weapon Attack: {atkBonus} to hit, reach 5 ft., one target. Hit: {dmgDice}{dmgBonus} piercing damage.',
    abilityKey: 'str', proficient: true, damageDice: '2d8', damageType: 'piercing',
  },
  {
    category: 'melee', label: 'Stinger', name: 'Stinger',
    description: 'Melee Weapon Attack: {atkBonus} to hit, reach 5 ft., one target. Hit: {dmgDice}{dmgBonus} piercing damage, and the target must succeed on a DC {dc} Constitution saving throw or take poison damage.',
    abilityKey: 'dex', proficient: true, damageDice: '1d8', damageType: 'piercing',
  },
  {
    category: 'melee', label: 'Hooves', name: 'Hooves',
    description: 'Melee Weapon Attack: {atkBonus} to hit, reach 5 ft., one prone target. Hit: {dmgDice}{dmgBonus} bludgeoning damage.',
    abilityKey: 'str', proficient: true, damageDice: '2d6', damageType: 'bludgeoning',
  },
  // ── Ranged attacks ─────────────────────────────────────────────────────────
  {
    category: 'ranged', label: 'Shortbow', name: 'Shortbow',
    description: 'Ranged Weapon Attack: {atkBonus} to hit, range 80/320 ft., one target. Hit: {dmgDice}{dmgBonus} piercing damage.',
    abilityKey: 'dex', proficient: true, damageDice: '1d6', damageType: 'piercing',
  },
  {
    category: 'ranged', label: 'Longbow', name: 'Longbow',
    description: 'Ranged Weapon Attack: {atkBonus} to hit, range 150/600 ft., one target. Hit: {dmgDice}{dmgBonus} piercing damage.',
    abilityKey: 'dex', proficient: true, damageDice: '1d8', damageType: 'piercing',
  },
  {
    category: 'ranged', label: 'Spit / Acid Spray', name: 'Acid Spit',
    description: 'Ranged Weapon Attack: {atkBonus} to hit, range 30/60 ft., one target. Hit: {dmgDice}{dmgBonus} acid damage.',
    abilityKey: 'dex', proficient: true, damageDice: '2d8', damageType: 'acid',
  },
  {
    category: 'ranged', label: 'Light Crossbow', name: 'Light Crossbow',
    description: 'Ranged Weapon Attack: {atkBonus} to hit, range 80/320 ft., one target. Hit: {dmgDice}{dmgBonus} piercing damage.',
    abilityKey: 'dex', proficient: true, damageDice: '1d8', damageType: 'piercing',
  },
  {
    category: 'ranged', label: 'Javelin', name: 'Javelin',
    description: 'Melee or Ranged Weapon Attack: {atkBonus} to hit, reach 5 ft. or range 30/120 ft., one target. Hit: {dmgDice}{dmgBonus} piercing damage.',
    abilityKey: 'str', proficient: true, damageDice: '1d6', damageType: 'piercing',
  },
  {
    category: 'ranged', label: 'Rock', name: 'Rock',
    description: 'Ranged Weapon Attack: {atkBonus} to hit, range 60/240 ft., one target. Hit: {dmgDice}{dmgBonus} bludgeoning damage.',
    abilityKey: 'str', proficient: true, damageDice: '3d10', damageType: 'bludgeoning',
  },
  {
    category: 'ranged', label: 'Fire Ray', name: 'Fire Ray',
    description: 'Ranged Spell Attack: {atkBonus} to hit, range 120 ft., one target. Hit: {dmgDice}{dmgBonus} fire damage.',
    abilityKey: 'cha', proficient: true, damageDice: '3d6', damageType: 'fire',
  },
  // ── Special / area ─────────────────────────────────────────────────────────
  {
    category: 'special', label: 'Breath Weapon (Fire)', name: 'Fire Breath',
    description: 'The creature exhales fire in a 30-foot cone. Each creature in that area must make a DC {dc} Dexterity saving throw, taking {dmgDice} fire damage on a failed save, or half as much on a successful one.',
    abilityKey: 'con', proficient: false, damageDice: '8d6', recharge: '5–6',
  },
  {
    category: 'special', label: 'Breath Weapon (Cold)', name: 'Cold Breath',
    description: 'The creature exhales an icy blast in a 30-foot cone. Each creature in that area must make a DC {dc} Constitution saving throw, taking {dmgDice} cold damage on a failed save, or half as much on a successful one.',
    abilityKey: 'con', proficient: false, damageDice: '8d8', recharge: '5–6',
  },
  {
    category: 'special', label: 'Frightful Presence', name: 'Frightful Presence',
    description: 'Each creature of the creature\'s choice that is within 120 feet and aware of it must succeed on a DC {dc} Wisdom saving throw or become frightened for 1 minute. A creature can repeat the saving throw at the end of each of its turns.',
    abilityKey: 'cha', proficient: false,
  },
  {
    category: 'special', label: 'Multiattack (2)', name: 'Multiattack',
    description: 'The creature makes two attacks.',
    abilityKey: 'str', proficient: false,
  },
  {
    category: 'special', label: 'Multiattack (3)', name: 'Multiattack',
    description: 'The creature makes three attacks.',
    abilityKey: 'str', proficient: false,
  },
  {
    category: 'special', label: 'Poison Breath', name: 'Poison Breath',
    description: 'The creature exhales poisonous gas in a 30-foot cone. Each creature in that area must make a DC {dc} Constitution saving throw, taking {dmgDice} poison damage on a failed save, or half as much on a successful one.',
    abilityKey: 'con', proficient: false, damageDice: '6d6', recharge: '5-6',
  },
  {
    category: 'special', label: 'Lightning Line', name: 'Lightning Line',
    description: 'The creature exhales lightning in a 60-foot line that is 5 feet wide. Each creature in that line must make a DC {dc} Dexterity saving throw, taking {dmgDice} lightning damage on a failed save, or half as much on a successful one.',
    abilityKey: 'con', proficient: false, damageDice: '8d6', recharge: '5-6',
  },
  {
    category: 'special', label: 'Web', name: 'Web',
    description: 'Ranged Weapon Attack: {atkBonus} to hit, range 30/60 ft., one creature. Hit: The target is restrained by webbing. As an action, the restrained target can make a DC {dc} Strength check, escaping on a success.',
    abilityKey: 'dex', proficient: true, recharge: '5-6',
  },
  {
    category: 'special', label: 'Swallow', name: 'Swallow',
    description: 'The creature makes one bite attack against a grappled target. If the attack hits, the target is swallowed, blinded and restrained, and has total cover against attacks and other effects outside the creature.',
    abilityKey: 'str', proficient: false,
  },
  {
    category: 'special', label: 'Terrifying Roar', name: 'Terrifying Roar',
    description: 'Each enemy within 30 feet that can hear the creature must succeed on a DC {dc} Wisdom saving throw or become frightened until the end of the creature\'s next turn.',
    abilityKey: 'cha', proficient: false, recharge: '5-6',
  },
  // ── Traits ─────────────────────────────────────────────────────────────────
  {
    category: 'trait', label: 'Pack Tactics', name: 'Pack Tactics',
    description: 'The creature has advantage on an attack roll against a creature if at least one of its allies is adjacent to the creature and the ally isn\'t incapacitated.',
    abilityKey: 'str', proficient: false,
  },
  {
    category: 'trait', label: 'Keen Senses', name: 'Keen Senses',
    description: 'The creature has advantage on Wisdom (Perception) checks.',
    abilityKey: 'wis', proficient: false,
  },
  {
    category: 'trait', label: 'Magic Resistance', name: 'Magic Resistance',
    description: 'The creature has advantage on saving throws against spells and other magical effects.',
    abilityKey: 'wis', proficient: false,
  },
  {
    category: 'trait', label: 'Undead Fortitude', name: 'Undead Fortitude',
    description: 'If damage reduces the creature to 0 hit points, it must make a Constitution saving throw with a DC of 5 + the damage taken, unless the damage is radiant or from a critical hit. On a success, the creature drops to 1 hit point instead.',
    abilityKey: 'con', proficient: false,
  },
  {
    category: 'trait', label: 'Regeneration', name: 'Regeneration',
    description: 'The creature regains 10 hit points at the start of its turn. If the creature takes acid or fire damage, this trait doesn\'t function at the start of its next turn.',
    abilityKey: 'con', proficient: false,
  },
  {
    category: 'trait', label: 'Spider Climb', name: 'Spider Climb',
    description: 'The creature can climb difficult surfaces, including upside down on ceilings, without needing to make an ability check.',
    abilityKey: 'str', proficient: false,
  },
  {
    category: 'trait', label: 'Sunlight Sensitivity', name: 'Sunlight Sensitivity',
    description: 'While in sunlight, the creature has disadvantage on attack rolls, as well as on Wisdom (Perception) checks that rely on sight.',
    abilityKey: 'wis', proficient: false,
  },
  {
    category: 'trait', label: 'Amphibious', name: 'Amphibious',
    description: 'The creature can breathe air and water.',
    abilityKey: 'con', proficient: false,
  },
  {
    category: 'trait', label: 'Charge', name: 'Charge',
    description: 'If the creature moves at least 20 feet straight toward a target and then hits it with a melee attack on the same turn, the target takes extra damage and must succeed on a DC {dc} Strength saving throw or be knocked prone.',
    abilityKey: 'str', proficient: false,
  },
  {
    category: 'trait', label: 'Pounce', name: 'Pounce',
    description: 'If the creature moves at least 20 feet straight toward a creature and hits it with a claw attack on the same turn, that target must succeed on a DC {dc} Strength saving throw or be knocked prone.',
    abilityKey: 'str', proficient: false,
  },
  {
    category: 'trait', label: 'Flyby', name: 'Flyby',
    description: 'The creature doesn\'t provoke opportunity attacks when it flies out of an enemy\'s reach.',
    abilityKey: 'dex', proficient: false,
  },
  {
    category: 'trait', label: 'False Appearance', name: 'False Appearance',
    description: 'While the creature remains motionless, it is indistinguishable from a natural or crafted feature of its surroundings.',
    abilityKey: 'dex', proficient: false,
  },
  {
    category: 'trait', label: 'Legendary Resistance', name: 'Legendary Resistance',
    description: 'If the creature fails a saving throw, it can choose to succeed instead.',
    abilityKey: 'cha', proficient: false,
  },
  {
    category: 'trait', label: 'Magic Weapons', name: 'Magic Weapons',
    description: 'The creature\'s weapon attacks are magical.',
    abilityKey: 'str', proficient: false,
  },
  {
    category: 'trait', label: 'Siege Monster', name: 'Siege Monster',
    description: 'The creature deals double damage to objects and structures.',
    abilityKey: 'str', proficient: false,
  },
  {
    category: 'trait', label: 'Incorporeal Movement', name: 'Incorporeal Movement',
    description: 'The creature can move through other creatures and objects as if they were difficult terrain. It takes force damage if it ends its turn inside an object.',
    abilityKey: 'dex', proficient: false,
  },
  {
    category: 'trait', label: 'Immutable Form', name: 'Immutable Form',
    description: 'The creature is immune to any spell or effect that would alter its form.',
    abilityKey: 'con', proficient: false,
  },
  {
    category: 'trait', label: 'Heated Body', name: 'Heated Body',
    description: 'A creature that touches the creature or hits it with a melee attack while within 5 feet takes fire damage.',
    abilityKey: 'con', proficient: false,
  },
  {
    category: 'trait', label: 'Blood Frenzy', name: 'Blood Frenzy',
    description: 'The creature has advantage on melee attack rolls against any creature that doesn\'t have all its hit points.',
    abilityKey: 'str', proficient: false,
  },
  {
    category: 'trait', label: 'Web Walker', name: 'Web Walker',
    description: 'The creature ignores movement restrictions caused by webbing.',
    abilityKey: 'dex', proficient: false,
  },
  // Bonus actions
  {
    category: 'bonus', label: 'Aggressive', name: 'Aggressive',
    description: 'The creature moves up to its speed toward an enemy it can see.',
    abilityKey: 'str', proficient: false,
  },
  {
    category: 'bonus', label: 'Nimble Escape', name: 'Nimble Escape',
    description: 'The creature takes the Disengage or Hide action.',
    abilityKey: 'dex', proficient: false,
  },
  {
    category: 'bonus', label: 'Cunning Action', name: 'Cunning Action',
    description: 'The creature takes the Dash, Disengage, or Hide action.',
    abilityKey: 'dex', proficient: false,
  },
  {
    category: 'bonus', label: 'Rampage', name: 'Rampage',
    description: 'When the creature reduces a creature to 0 hit points with a melee attack on its turn, it can move up to half its speed and make a bite attack.',
    abilityKey: 'str', proficient: false,
  },
  {
    category: 'bonus', label: 'Shadow Step', name: 'Shadow Step',
    description: 'While in dim light or darkness, the creature teleports up to 60 feet to an unoccupied space it can see that is also in dim light or darkness.',
    abilityKey: 'dex', proficient: false,
  },
  {
    category: 'bonus', label: 'Misty Step', name: 'Misty Step',
    description: 'The creature magically teleports up to 30 feet to an unoccupied space it can see.',
    abilityKey: 'cha', proficient: false,
  },
  {
    category: 'bonus', label: 'Second Wind', name: 'Second Wind',
    description: 'The creature regains hit points equal to {dmgDice} plus its challenge rating or level.',
    abilityKey: 'con', proficient: false, damageDice: '1d10',
  },
  {
    category: 'bonus', label: 'Command Ally', name: 'Command Ally',
    description: 'One ally the creature can see within 30 feet can use its reaction to make one weapon attack or move up to half its speed.',
    abilityKey: 'cha', proficient: false,
  },
  // Reactions
  {
    category: 'reaction', label: 'Parry', name: 'Parry',
    description: 'The creature adds 2 to its AC against one melee attack that would hit it. To do so, the creature must see the attacker and be wielding a melee weapon.',
    abilityKey: 'dex', proficient: false,
  },
  {
    category: 'reaction', label: 'Shield', name: 'Shield',
    description: 'When the creature is hit by an attack or targeted by magic missile, it gains a +5 bonus to AC until the start of its next turn, including against the triggering attack.',
    abilityKey: 'int', proficient: false,
  },
  {
    category: 'reaction', label: 'Uncanny Dodge', name: 'Uncanny Dodge',
    description: 'The creature halves the damage that it takes from an attack that hits it. The creature must be able to see the attacker.',
    abilityKey: 'dex', proficient: false,
  },
  {
    category: 'reaction', label: 'Deflect Missile', name: 'Deflect Missile',
    description: 'When the creature is hit by a ranged weapon attack, it reduces the damage by {dmgDice} plus its Dexterity modifier. If this reduces the damage to 0, the creature can catch the missile.',
    abilityKey: 'dex', proficient: false, damageDice: '1d10',
  },
  {
    category: 'reaction', label: 'Retaliating Strike', name: 'Retaliating Strike',
    description: 'When a creature within 5 feet hits the creature with a melee attack, the creature makes one melee weapon attack against that attacker.',
    abilityKey: 'str', proficient: true,
  },
  {
    category: 'reaction', label: 'Tail Swipe', name: 'Tail Swipe',
    description: 'When a creature the creature can see moves within 10 feet of it, the creature makes one tail attack against that creature.',
    abilityKey: 'str', proficient: true, damageDice: '2d8', damageType: 'bludgeoning',
  },
  {
    category: 'reaction', label: 'Absorb Elements', name: 'Absorb Elements',
    description: 'When the creature takes acid, cold, fire, lightning, or thunder damage, it gains resistance to that damage type until the start of its next turn.',
    abilityKey: 'con', proficient: false,
  },
  {
    category: 'reaction', label: 'Reactive Teleport', name: 'Reactive Teleport',
    description: 'When the creature takes damage, it teleports up to 30 feet to an unoccupied space it can see.',
    abilityKey: 'cha', proficient: false,
  },
  // Legendary actions
  {
    category: 'legendary', label: 'Detect', name: 'Detect',
    description: 'The creature makes a Wisdom (Perception) check.',
    abilityKey: 'wis', proficient: false,
  },
  {
    category: 'legendary', label: 'Tail Attack', name: 'Tail Attack',
    description: 'The creature makes a tail attack.',
    abilityKey: 'str', proficient: true, damageDice: '2d8', damageType: 'bludgeoning',
  },
  {
    category: 'legendary', label: 'Wing Attack (Costs 2)', name: 'Wing Attack',
    description: 'The creature beats its wings. Each creature within 10 feet must succeed on a DC {dc} Dexterity saving throw or take {dmgDice}{dmgBonus} bludgeoning damage and be knocked prone.',
    abilityKey: 'str', proficient: false, damageDice: '2d6', damageType: 'bludgeoning',
  },
];

/** Group presets by category for the dropdown */
export function groupPresets(categories?: ActionPresetCategory[]): Map<string, ActionPreset[]> {
  const groups = new Map<string, ActionPreset[]>();
  const order: ActionPresetCategory[] = ['melee','ranged','special','trait','bonus','reaction','legendary','spellcasting'];
  const allowed = categories ? new Set(categories) : null;
  for (const cat of order) {
    if (allowed && !allowed.has(cat)) continue;
    const items = ACTION_PRESETS.filter(p => p.category === cat);
    if (items.length) groups.set(cat, items);
  }
  return groups;
}

/**
 * Fill a description template with computed values.
 * Replaces {atkBonus}, {dmgBonus}, {dmgDice}, {dc} with real numbers.
 */
export function fillPresetDescription(
  template:    string,
  atkBonus:    number,
  dmgBonus:    number,
  dmgDice:     string,
  spellDc:     number,
): string {
  return template
    .replace(/\{atkBonus\}/g, formatMod(atkBonus))
    .replace(/\{dmgBonus\}/g, dmgBonus !== 0 ? formatMod(dmgBonus) : '')
    .replace(/\{dmgDice\}/g,  dmgDice)
    .replace(/\{dc\}/g,       String(spellDc));
}
