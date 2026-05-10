// modules/bestiary/src/types.ts
// Internal types for the bestiary module only.

import type {
  CreatureType,
  CreatureSize,
  Alignment,
  AbilityScores,
  MonsterAction,
  MonsterLegendaryAction,
  MonsterReaction,
  SkillConfigs,
} from '../../../shared/src/types/monster';
import type { MovementSpeeds } from '../../../shared/src/utils/movement';

// ── Raw DB row shape ──────────────────────────────────────────────────────────

export interface MonsterRow {
  id:                       string;
  campaign_id:              string;
  name:                     string;
  description:              string;
  creature_type:            CreatureType;
  subtype:                  string | null;
  size:                     CreatureSize;
  alignment:                Alignment;
  armor_class:              number;
  armor_type:               string | null;
  hit_points:               number;
  hit_dice:                 string | null;
  speed:                    number;
  speed_other:              string;   // JSON: MovementSpeeds
  str:                      number;
  dex:                      number;
  con:                      number;
  int:                      number;
  wis:                      number;
  cha:                      number;
  proficiency_bonus:        number;
  challenge_rating:         string;
  xp_value:                 number;
  saving_throws:            string;   // JSON: Partial<AbilityScores>
  skills:                   string;   // JSON: SkillConfigs
  damage_vulnerabilities:   string;   // JSON: string[]
  damage_resistances:       string;   // JSON: string[]
  damage_immunities:        string;   // JSON: string[]
  condition_immunities:     string;   // JSON: string[]
  senses:                   string | null;
  languages:                string | null;
  traits:                   string;   // JSON: MonsterAction[]
  actions:                  string;   // JSON: MonsterAction[]
  reactions:                string;   // JSON: MonsterReaction[]
  legendary_actions:        string;   // JSON: MonsterLegendaryAction[]
  legendary_description:    string | null;
  bonus_actions:            string;   // JSON: MonsterAction[]
  lore:                     string | null;
  image_asset_id:           string | null;
  habitat_location_ids:     string;   // JSON: string[]
  is_homebrew:              number;   // SQLite boolean (0/1)
  tags:                     string;   // JSON: string[]
  created_at:               string;
  updated_at:               string;
}

// ── Service input types ───────────────────────────────────────────────────────

export interface CreateMonsterInput {
  name:                     string;
  description?:             string;
  creatureType?:            CreatureType;
  subtype?:                 string;
  size?:                    CreatureSize;
  alignment?:               Alignment;
  armorClass?:              number;
  armorType?:               string;
  hitPoints?:               number;
  hitDice?:                 string;
  speed?:                   number;
  speedOther?:              MovementSpeeds;
  abilityScores?:           AbilityScores;
  proficiencyBonus?:        number;
  challengeRating?:         string;
  xpValue?:                 number;
  savingThrows?:            Partial<AbilityScores>;
  skills?:                  SkillConfigs;
  damageVulnerabilities?:   string[];
  damageResistances?:       string[];
  damageImmunities?:        string[];
  conditionImmunities?:     string[];
  senses?:                  string;
  languages?:               string;
  traits?:                  MonsterAction[];
  actions?:                 MonsterAction[];
  reactions?:               MonsterReaction[];
  legendaryActions?:        MonsterLegendaryAction[];
  legendaryDescription?:    string;
  bonusActions?:            MonsterAction[];
  lore?:                    string;
  imageAssetId?:            string;
  habitatLocationIds?:      string[];
  isHomebrew?:              boolean;
  tags?:                    string[];
}

export interface UpdateMonsterInput extends Partial<CreateMonsterInput> {
  id: string;
}

export interface MonsterListQuery {
  search?:          string;
  creatureType?:    CreatureType;
  size?:            CreatureSize;
  isHomebrew?:      boolean;
  tags?:            string[];
  limit?:           number;
  offset?:          number;
}
