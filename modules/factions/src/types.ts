import type {
  FactionRelationType,
  FactionRelation,
  OrgNode,
} from '../../../shared/src/types/faction';

export interface FactionRow {
  id: string;
  campaign_id: string;
  name: string;
  description: string;
  strength: number;
  notes: string;
  leader_npc_id: string | null;
  tags: string;
  created_at: string;
  updated_at: string;
}

export interface OrgNodeRow {
  id: string;
  faction_id: string;
  campaign_id: string;
  name: string;
  role: string;
  npc_id: string | null;
  parent_id: string | null;
  notes: string | null;
  sort_order: number;
}

export interface FactionMemberRow {
  faction_id: string;
  npc_id: string;
}

export interface FactionTerritoryRow {
  faction_id: string;
  location_id: string;
  influence: number;
}

export interface FactionRelationRow {
  faction_id: string;
  target_faction_id: string;
  relation_type: FactionRelationType;
  strength: number | null;
  notes: string | null;
}

export interface FactionReputationRow {
  faction_id: string;
  group_key: string;
  score: number;
}

export interface FactionResourceRow {
  faction_id: string;
  resource_key: string;
  amount: number;
}

export interface SessionFactionRow {
  session_id: string;
  faction_id: string;
}

export interface FactionListQuery {
  search?: string;
  tag?: string;
  npcId?: string;
  locationId?: string;
  limit?: number;
  offset?: number;
}

export interface CreateFactionInput {
  name: string;
  description?: string;
  strength?: number;
  notes?: string;
  organization?: OrgNode[];
  leaderNpcId?: string | null;
  memberNpcIds?: string[];
  controlledLocationIds?: string[];
  influence?: Record<string, number>;
  relations?: FactionRelation[];
  reputation?: Record<string, number>;
  resources?: Record<string, number>;
  tags?: string[];
  sessionIds?: string[];
}

export interface UpdateFactionInput {
  id: string;
  name?: string;
  description?: string;
  strength?: number;
  notes?: string;
  organization?: OrgNode[];
  leaderNpcId?: string | null;
  memberNpcIds?: string[];
  controlledLocationIds?: string[];
  influence?: Record<string, number>;
  relations?: FactionRelation[];
  reputation?: Record<string, number>;
  resources?: Record<string, number>;
  tags?: string[];
  sessionIds?: string[];
}
