export type EncounterType =
  'combat' | 'social' | 'exploration' | 'skill_challenge' | 'boss' | 'airship';
export type EncounterStatus = 'planned' | 'ready' | 'run' | 'archived';
export type EncounterDifficulty = 'trivial' | 'easy' | 'moderate' | 'hard' | 'deadly';
export type MiniAssignment = 'exact' | 'proxy' | 'missing' | 'unassigned';

export interface EncounterMonster {
  id:              string;
  monsterId:       string;
  monsterName?:    string;   // joined in from bestiary for display
  creatureType?:   string;
  challengeRating?: string;
  customName?:     string;
  quantity:        number;
  groupLabel?:     string;
  notes?:          string;
  sortOrder:       number;
}

export interface EncounterMini {
  id:                  string;
  encounterMonsterId?: string;
  miniId?:             string;
  miniName?:           string; // joined in from mini-catalogue for display
  quantity:            number;
  assignment:          MiniAssignment;
  proxyNotes?:         string;
}

export interface EncounterItem {
  id:          string;
  itemId:      string;
  itemName?:   string;   // joined in from magic_items for display
  itemType?:   string;
  rarity?:     string;
  requiresAttunement?: boolean;
  customName?: string;
  quantity:    number;
  notes?:      string;
  sortOrder:   number;
}

export interface Encounter {
  id:               string;
  name:             string;
  description:      string;
  encounterType:    EncounterType;
  status:           EncounterStatus;
  sessionNumber?:   number;
  sessionId?:       string | null;
  dungeonRoomId?:   string | null;
  location:         string;
  difficulty:       EncounterDifficulty;
  tags:             string[];
  notes:            string;

  partyId?:         string | null;
  partyLevel?:      number | null;
  partySize?:       number | null;
  airshipPresent:   boolean;
  partyNotes:       string;

  battleMapAssetId?: string | null;
  mapNotes:         string;
  terrainNotes:     string;
  terrainModifierIds: string[];

  environmentalEffects: string[];
  legendaryActions:     string[];
  lairActions:          string[];
  conditions:           string[];

  loot:              string;
  xpAward?:          number | null;
  storyRewards:      string;
  reputationRewards: string;
  rewardNotes:       string;

  createdAt:        string;
  updatedAt:        string;
}

export interface OwnedMini {
  miniId:     string;
  name:       string;
  quantity:   number;
  tags:       string[];
  monsterIds: string[]; // from mini_monsters join
}

export interface MiniMatchSuggestion {
  encounterMonsterId: string;
  monsterId:          string;
  monsterName:        string;
  quantityNeeded:     number;
  exactMatches:       { miniId: string; name: string; available: number }[];
  taggedProxies:      { miniId: string; name: string; available: number }[];
  fullySupported:     boolean;
  missingCount:       number;
}
