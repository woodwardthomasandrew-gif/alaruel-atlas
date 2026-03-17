// modules/npcs/src/types.ts
// Internal types for the npcs module only.

import type { NpcRole, VitalStatus, DispositionLevel } from '../../../shared/src/types/npc';

// ── Raw DB row shapes ─────────────────────────────────────────────────────────

export interface NpcRow {
  id:                          string;
  campaign_id:                 string;
  name:                        string;
  alias:                       string | null;
  description:                 string;
  role:                        NpcRole;
  vital_status:                VitalStatus;
  disposition_towards_players: DispositionLevel;
  current_location_id:         string | null;
  primary_faction_id:          string | null;
  portrait_asset_id:           string | null;
  tags:                        string;    // JSON
  created_at:                  string;
  updated_at:                  string;
}

export interface NpcNoteRow {
  id:            string;
  npc_id:        string;
  campaign_id:   string;
  content:       string;
  campaign_date: string | null;
  created_at:    string;
}

// ── Service input types ───────────────────────────────────────────────────────

export interface CreateNpcInput {
  name:                       string;
  alias?:                     string;
  description?:               string;
  role?:                      NpcRole;
  vitalStatus?:               VitalStatus;
  dispositionTowardsPlayers?: DispositionLevel;
  tags?:                      string[];
}

export interface UpdateNpcInput {
  id:                          string;
  name?:                       string;
  alias?:                      string;
  description?:                string;
  role?:                       NpcRole;
  vitalStatus?:                VitalStatus;
  dispositionTowardsPlayers?:  DispositionLevel;
  currentLocationId?:          string | null;
  primaryFactionId?:           string | null;
  portraitAssetId?:            string | null;
  tags?:                       string[];
}

export interface CreateNpcNoteInput {
  npcId:         string;
  content:       string;
  campaignDate?: string;
}

export interface NpcListQuery {
  search?:         string;
  role?:           NpcRole;
  vitalStatus?:    VitalStatus;
  tags?:           string[];
  limit?:          number;
  offset?:         number;
}
