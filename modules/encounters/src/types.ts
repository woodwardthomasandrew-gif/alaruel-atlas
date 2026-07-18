import type {
  EncounterType, EncounterStatus, EncounterDifficulty, MiniAssignment,
} from '../../../shared/src/types/encounter';

// ── Raw DB row shapes ───────────────────────────────────────────────────────

export interface EncounterRow {
  id:                     string;
  campaign_id:            string;
  name:                   string;
  description:            string;
  encounter_type:         EncounterType;
  status:                 EncounterStatus;
  session_number:         number | null;
  session_id:             string | null;
  dungeon_room_id:        string | null;
  location:               string;
  difficulty:             EncounterDifficulty;
  tags:                   string;
  notes:                  string;

  party_id:               string | null;
  party_level:            number | null;
  airship_present:        number;
  party_notes:            string;

  battle_map_asset_id:    string | null;
  map_notes:              string;
  terrain_notes:          string;

  initiative_presets:     string;
  environmental_effects:  string;
  legendary_actions:      string;
  lair_actions:           string;
  conditions:             string;

  loot:                   string;
  xp_award:               number | null;
  story_rewards:          string;
  reputation_rewards:     string;
  reward_notes:           string;

  created_at:             string;
  updated_at:             string;
}

export interface EncounterMonsterRow {
  id:                 string;
  encounter_id:       string;
  monster_id:         string;
  custom_name:        string | null;
  quantity:           number;
  group_label:        string | null;
  is_encounter_copy:  number;
  stat_overrides:     string | null;
  sort_order:         number;
  notes:              string | null;
}

export interface EncounterMiniRow {
  id:                     string;
  encounter_id:           string;
  encounter_monster_id:   string | null;
  mini_id:                string | null;
  quantity:               number;
  assignment:             MiniAssignment;
  proxy_notes:            string | null;
}

export interface EncounterNpcAllyRow {
  encounter_id: string;
  npc_id:       string;
}

// ── Service input DTOs ───────────────────────────────────────────────────────

export interface CreateEncounterInput {
  name:            string;
  description?:    string;
  encounterType?:  EncounterType;
  location?:       string;
  difficulty?:     EncounterDifficulty;
  tags?:           string[];
  notes?:          string;
  sessionId?:      string;
  sessionNumber?:  number;
  dungeonRoomId?:  string;
  partyId?:        string;
  partyLevel?:     number;
}

export interface UpdateEncounterInput {
  id:                 string;
  name?:              string;
  description?:       string;
  encounterType?:     EncounterType;
  status?:            EncounterStatus;
  location?:          string;
  difficulty?:        EncounterDifficulty;
  tags?:              string[];
  notes?:             string;
  sessionId?:         string | null;
  sessionNumber?:     number | null;
  dungeonRoomId?:     string | null;

  partyId?:           string | null;
  partyLevel?:        number | null;
  airshipPresent?:    boolean;
  partyNotes?:        string;

  battleMapAssetId?:  string | null;
  mapNotes?:          string;
  terrainNotes?:      string;

  initiativePresets?:    unknown[];
  environmentalEffects?: unknown[];
  legendaryActions?:     unknown[];
  lairActions?:          unknown[];
  conditions?:           unknown[];

  loot?:               string;
  xpAward?:            number | null;
  storyRewards?:       string;
  reputationRewards?:  string;
  rewardNotes?:        string;
}

export interface AddEncounterMonsterInput {
  encounterId:      string;
  monsterId:        string;
  customName?:      string;
  quantity?:        number;
  groupLabel?:      string;
  isEncounterCopy?: boolean;
  notes?:           string;
}

export interface UpdateEncounterMonsterInput {
  id:               string;
  customName?:      string | null;
  quantity?:        number;
  groupLabel?:      string | null;
  notes?:           string | null;
  statOverrides?:   Record<string, unknown> | null;
  sortOrder?:       number;
}

export interface AssignMiniInput {
  encounterId:          string;
  encounterMonsterId?:  string;
  miniId?:              string;
  quantity?:            number;
  assignment?:          MiniAssignment;
  proxyNotes?:          string;
}
