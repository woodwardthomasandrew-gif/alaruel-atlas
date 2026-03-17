// ui/src/types/npc.ts
// Minimal NPC types for the renderer. In the monorepo, import from @alaruel/shared.
// This file exists for standalone Vite builds; Electron uses workspace resolution.

export type ISOTimestamp = string & { readonly __brand: 'ISOTimestamp' };
export type CampaignDate  = string & { readonly __brand: 'CampaignDate' };

export type DispositionLevel = 'hostile' | 'unfriendly' | 'neutral' | 'friendly' | 'allied';
export type NpcRole = 'ally' | 'antagonist' | 'neutral' | 'informant' | 'questgiver' | 'merchant' | 'recurring' | 'minor';
export type VitalStatus = 'alive' | 'dead' | 'missing' | 'unknown';

export interface NpcNote {
  id:            string;
  content:       string;
  campaignDate?: CampaignDate;
  createdAt:     ISOTimestamp;
}

export interface NpcRelationship {
  targetId:   string;
  targetType: 'npc' | 'faction';
  label:      string;
  strength:   number;
  note?:      string;
}

export interface NPC {
  id:                        string;
  name:                      string;
  alias?:                    string;
  description:               string;
  role:                      NpcRole;
  vitalStatus:               VitalStatus;
  dispositionTowardsPlayers: DispositionLevel;
  currentLocationId:         string | null;
  locationIds:               string[];
  primaryFactionId:          string | null;
  factionIds:                string[];
  relationships:             NpcRelationship[];
  questIds:                  string[];
  sessionIds:                string[];
  plotThreadIds:             string[];
  notes:                     NpcNote[];
  portraitAssetId:           string | null;
  tags:                      string[];
  createdAt:                 ISOTimestamp;
  updatedAt:                 ISOTimestamp;
}
