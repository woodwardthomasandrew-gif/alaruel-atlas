import { BaseService }         from '../../_framework/src/index';
import type { EmitFn }         from '../../_framework/src/index';
import type { Logger }         from '../../../core/logger/src/types';
import type { GraphEdge }      from '../../../shared/src/types/relationships';
import type { GraphRepository } from './repository';
import type { CreateRelationshipInput } from './types';

export class GraphService extends BaseService<GraphRepository> {
  constructor(repo: GraphRepository, log: Logger, emit: EmitFn) { super('graph', repo, log, emit); }

  listAll(): GraphEdge[] { this.assertInitialised(); return this.repository.findAll(); }

  forEntity(entityId: string): GraphEdge[] {
    this.assertInitialised(); return this.repository.findForEntity(entityId);
  }

  create(input: CreateRelationshipInput): GraphEdge {
    this.assertInitialised();
    return this.repository.create({ ...input, id: this.generateId(), createdAt: this.now(), updatedAt: this.now() });
  }

  delete(id: string): void {
    this.assertInitialised();
    if (!this.repository.delete(id)) throw new Error(`Relationship not found: ${id}`);
  }

  entityIds() { this.assertInitialised(); return this.repository.entityIds(); }
}
