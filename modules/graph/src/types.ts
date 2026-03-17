import type { EntityType, EdgeType } from '../../../shared/src/types/relationships';
export interface RelationshipRow {
  id: string; campaign_id: string;
  source_id: string; source_type: EntityType;
  target_id: string; target_type: EntityType;
  relationship_type: EdgeType; label: string;
  strength: number|null; directed: number; note: string|null;
  created_at: string; updated_at: string;
}
export interface CreateRelationshipInput {
  sourceId: string; sourceType: EntityType;
  targetId: string; targetType: EntityType;
  relationshipType?: EdgeType; label?: string;
  strength?: number; directed?: boolean; note?: string;
}
