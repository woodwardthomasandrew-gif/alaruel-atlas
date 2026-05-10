// ─────────────────────────────────────────────────────────────────────────────
// shared/types/monster.ts
//
// Monster / Bestiary entity types.
// Managed by the `bestiary` module.
// ─────────────────────────────────────────────────────────────────────────────

import type { EntityBase, WithDescription, WithTags } from './common';
import type { MovementSpeeds } from '../utils/movement';

// ── Supporting value types ────────────────────────────────────────────────────

/**
 * Broad creature category — used for filtering and statblock display.
 */
export type CreatureType =
  | 'aberration'
  | 'beast'
  | 'celestial'
  | 'construct'
  | 'dragon'
  | 'elemental'
  | 'fey'
  | 'fiend'
  | 'giant'
  | 'humanoid'
  | 'monstrosity'
  | 'ooze'
  | 'plant'
  | 'undead'
  | 'custom';

/**
 * Monster size category (5e/OSR convention).
 */
export type CreatureSize =
  | 'tiny'
  | 'small'
  | 'medium'
  | 'large'
  | 'huge'
  | 'gargantuan';

/**
 * Alignment expressed as a two-axis string.
 */
export type Alignment =
  | 'lawful good'
  | 'neutral good'
  | 'chaotic good'
  | 'lawful neutral'
  | 'true neutral'
  | 'chaotic neutral'
  | 'lawful evil'
  | 'neutral evil'
  | 'chaotic evil'
  | 'unaligned'
  | 'any';

// ── Ability scores ────────────────────────────────────────────────────────────

export interface AbilityScores {
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
}

// ── Skill / spellcasting support ─────────────────────────────────────────────

export interface SkillConfig {
  proficient?: boolean;
  expertise?: boolean;
  override?: number;
}

export type SkillConfigs = Partial<Record<string, number | SkillConfig>>;

export type SpellcastingModuleKind =
  | 'spellcasting'
  | 'innate_spellcasting'
  | 'psionics'
  | 'ritual_casting';

export interface SpellcastingModule {
  kind: SpellcastingModuleKind;
  spellcastingAbility: 'int' | 'wis' | 'cha';
  spellSaveDcOverride?: number;
  spellAttackBonusOverride?: number;
  spellSlots?: string;
  preparedSpells?: string;
  atWillSpells?: string;
  dailySpells?: string;
  ritualTags?: string;
  notes?: string;
}

// ── Statblock sub-records ─────────────────────────────────────────────────────

export interface MonsterAction {
  name:        string;
  description: string;
  /** Optional attack bonus, e.g. "+5 to hit" */
  attackBonus?: number;
  /** Damage expression, e.g. "2d6 + 3 piercing" */
  damage?:     string;
  /** Recharge expression, e.g. "Recharge 5–6" */
  recharge?:   string;
  /** Optional spellcasting module payload stored alongside traits. */
  spellcasting?: SpellcastingModule;
}

export interface MonsterLegendaryAction extends MonsterAction {
  /** How many legendary action points this costs (default 1). */
  cost: number;
}

export interface MonsterReaction extends MonsterAction {}

// ── Monster (full statblock) ──────────────────────────────────────────────────

/**
 * A complete monster statblock entry in the Bestiary.
 *
 * Designed to cover 5e-style stat blocks while remaining flexible
 * enough for OSR, Pathfinder, or homebrew systems.
 */
export interface Monster extends EntityBase, WithDescription, WithTags {

  // ── Classification ─────────────────────────────────────────────────────────

  /** Broad creature category. */
  creatureType:  CreatureType;

  /** Body size. */
  size:          CreatureSize;

  /** Moral/ethical alignment. */
  alignment:     Alignment;

  /** Optional subtype, e.g. "goblinoid", "shapechanger" */
  subtype?:      string;

  // ── Core statistics ────────────────────────────────────────────────────────

  /** Armour Class value. */
  armorClass:    number;

  /** Armour type description, e.g. "natural armor", "chain mail". */
  armorType?:    string;

  /** Hit point maximum. */
  hitPoints:     number;

  /** Hit dice expression, e.g. "3d8 + 6" */
  hitDice?:      string;

  /** Speed in feet (walking). */
  speed:         number;

  /** Additional movement types, e.g. { fly: { speed: 60, hover: true }, swim: { speed: 30 } } */
  speedOther?:   MovementSpeeds;

  // ── Ability scores ─────────────────────────────────────────────────────────

  abilityScores: AbilityScores;

  // ── Derived / bonus statistics ─────────────────────────────────────────────

  /** Proficiency bonus. */
  proficiencyBonus: number;

  /** Challenge rating string, e.g. "1/4", "5", "23" */
  challengeRating:  string;

  /** XP award for defeating this monster. */
  xpValue:          number;

  // ── Saving throws (proficient only) ───────────────────────────────────────

  /** Saving throw modifiers for each stat the monster is proficient in. */
  savingThrows?:    Partial<AbilityScores>;

  // ── Skills ─────────────────────────────────────────────────────────────────

  /** Skill bonuses, e.g. { perception: 5, stealth: 3 } */
  skills?:          SkillConfigs;

  // ── Resistances / immunities ───────────────────────────────────────────────

  damageVulnerabilities?: string[];
  damageResistances?:     string[];
  damageImmunities?:      string[];
  conditionImmunities?:   string[];

  // ── Senses & languages ─────────────────────────────────────────────────────

  /** Senses string, e.g. "darkvision 60 ft., passive Perception 12" */
  senses?:          string;

  /** Languages string, e.g. "Common, Goblin" */
  languages?:       string;

  // ── Special traits ─────────────────────────────────────────────────────────

  /** Passive abilities, e.g. Pack Tactics, Keen Senses. */
  traits?:          MonsterAction[];

  // ── Actions ────────────────────────────────────────────────────────────────

  actions:          MonsterAction[];

  reactions?:       MonsterReaction[];

  legendaryActions?: MonsterLegendaryAction[];

  /** Description of legendary action preamble (how many/when). */
  legendaryDescription?: string;

  bonusActions?:    MonsterAction[];

  // ── Lore / campaign notes ──────────────────────────────────────────────────

  /** GM-facing lore notes (Markdown). Not shown on statblock printout. */
  lore?:            string;

  /** Asset ID for a creature illustration. */
  imageAssetId?:    string;

  /** IDs of campaign locations this creature inhabits. */
  habitatLocationIds: string[];

  /** Whether this is a custom/homebrew monster (vs a reference entry). */
  isHomebrew:       boolean;
}
