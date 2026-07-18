export type EncounterType =
  | 'combat' | 'social' | 'exploration' | 'skill_challenge' | 'boss' | 'airship';

export type EncounterStatus  = 'planned' | 'ready' | 'run' | 'archived';
export type EncounterDifficulty = 'trivial' | 'easy' | 'moderate' | 'hard' | 'deadly';
export type MiniAssignment = 'exact' | 'proxy' | 'missing' | 'unassigned';

export interface EncounterMonsterEntry {
  id:              string;
  monsterId:       string;
  customName?:     string | undefined;
  quantity:        number;
  groupLabel?:     string | undefined;
  isEncounterCopy: boolean;
  statOverrides?:  Record<string, unknown> | undefined;
  order:           number;
  notes?:          string | undefined;
}

export interface EncounterMiniEntry {
  id:                  string;
  encounterMonsterId?: string | undefined;
  miniId?:             string | undefined;
  quantity:            number;
  assignment:          MiniAssignment;
  proxyNotes?:         string | undefined;
}

export interface Encounter {
  id:               string;
  name:             string;
  description:      string;
  encounterType:    EncounterType;
  status:           EncounterStatus;
  sessionNumber?:   number | undefined;
  sessionId?:       string | undefined;
  dungeonRoomId?:   string | undefined;
  location:         string;
  difficulty:       EncounterDifficulty;
  tags:             string[];
  notes:            string;

  // Party information
  partyId?:         string | undefined;
  partyLevel?:       number | undefined;
  airshipPresent:   boolean;
  partyNotes:       string;
  npcAllyIds:       string[];

  // Enemy roster
  monsters:         EncounterMonsterEntry[];

  // Miniature assignments
  minis:            EncounterMiniEntry[];

  // Map information
  battleMapAssetId?: string | undefined;
  mapNotes:         string;
  terrainNotes:     string;

  // Combat information
  initiativePresets:     unknown[];
  environmentalEffects:  unknown[];
  legendaryActions:      unknown[];
  lairActions:           unknown[];
  conditions:            unknown[];

  // Rewards
  loot:              string;
  xpAward?:          number | undefined;
  storyRewards:      string;
  reputationRewards: string;
  rewardNotes:       string;

  createdAt:         string;
  updatedAt:         string;
}

/** Result of matching an encounter's roster against owned miniatures. */
export interface MiniMatchSuggestion {
  encounterMonsterId: string;
  monsterId:          string;
  quantityNeeded:     number;
  exactMatches:       { miniId: string; name: string; available: number }[];
  typeMatches:        { miniId: string; name: string; available: number }[];
  taggedProxies:      { miniId: string; name: string; available: number }[];
  fullySupported:     boolean;
  missingCount:       number;
}

/** Input describing a mini the Encounter Workspace can consider when matching. */
export interface OwnedMiniForMatching {
  miniId:      string;
  name:        string;
  quantity:    number;
  painted?:    boolean | undefined;
  tags:        string[];
  monsterIds:  string[];
}
