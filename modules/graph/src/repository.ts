import { BaseRepository }        from '../../_framework/src/index';
import type { IDatabaseManager } from '../../../core/database/src/types';
import type { Logger }           from '../../../core/logger/src/types';
import type { GraphEdge }        from '../../../shared/src/types/relationships';
import type { RelationshipRow, CreateRelationshipInput } from './types';

function rowToEdge(r: RelationshipRow): GraphEdge {
  return {
    id: r.id, sourceId: r.source_id, targetId: r.target_id,
    label: r.label, edgeType: r.relationship_type,
    strength: r.strength ?? undefined, directed: r.directed === 1,
  };
}

export class GraphRepository extends BaseRepository {
  constructor(db: IDatabaseManager, log: Logger) { super('graph', db, log); }

  findAll(): GraphEdge[] {
    return this.query<RelationshipRow>(
      'SELECT * FROM entity_relationships WHERE campaign_id = ? ORDER BY created_at DESC',
      [this.campaignId],
    ).map(rowToEdge);
  }

  findForEntity(entityId: string): GraphEdge[] {
    return this.query<RelationshipRow>(
      'SELECT * FROM entity_relationships WHERE campaign_id = ? AND (source_id = ? OR target_id = ?)',
      [this.campaignId, entityId, entityId],
    ).map(rowToEdge);
  }

  create(input: CreateRelationshipInput & { id: string; createdAt: string; updatedAt: string }): GraphEdge {
    this.run(
      `INSERT OR IGNORE INTO entity_relationships
         (id,campaign_id,source_id,source_type,target_id,target_type,relationship_type,label,strength,directed,note,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [input.id, this.campaignId, input.sourceId, input.sourceType, input.targetId, input.targetType,
       input.relationshipType ?? 'custom', input.label ?? '', input.strength ?? null,
       input.directed ? 1 : 0, input.note ?? null, input.createdAt, input.updatedAt],
    );
    return rowToEdge(this.queryOne<RelationshipRow>('SELECT * FROM entity_relationships WHERE id = ?', [input.id])!);
  }

  delete(id: string): boolean {
    return this.run('DELETE FROM entity_relationships WHERE id = ? AND campaign_id = ?', [id, this.campaignId]).changes > 0;
  }

  // Returns all unique entity IDs referenced in the graph
  entityIds(): Array<{id:string;type:string}> {
    const rows = this.query<{id:string;type:string}>(
      `SELECT source_id AS id, source_type AS type FROM entity_relationships WHERE campaign_id = ?
       UNION SELECT target_id, target_type FROM entity_relationships WHERE campaign_id = ?`,
      [this.campaignId, this.campaignId],
    );
    return rows;
  }
}
