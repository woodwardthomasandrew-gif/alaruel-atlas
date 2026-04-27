export type FactionRelationType = 'allied' | 'hostile' | 'neutral' | 'vassal' | 'trade';

export interface OrgNode {
  id: string;
  name: string;
  role: string;
  npcId?: string;
  parentId?: string;
  notes?: string;
}

export interface FactionRelation {
  targetFactionId: string;
  type: FactionRelationType;
  strength?: number;
  notes?: string;
}

export interface Faction {
  id: string;
  name: string;
  description: string;
  strength: number;
  notes: string;
  organization: OrgNode[];
  leaderNpcId: string | null;
  memberNpcIds: string[];
  controlledLocationIds: string[];
  influence: Record<string, number>;
  relations: FactionRelation[];
  reputation: Record<string, number>;
  resources: Record<string, number>;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}
