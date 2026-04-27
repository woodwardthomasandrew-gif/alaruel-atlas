import { BaseService } from '../../_framework/src/index';
import type { EmitFn } from '../../_framework/src/index';
import type { Logger } from '../../../core/logger/src/types';
import type { Faction, FactionRelation, OrgNode, FactionRelationType } from '../../../shared/src/types/faction';
import type { FactionsRepository } from './repository';
import type { CreateFactionInput, UpdateFactionInput, FactionListQuery } from './types';

const RELATION_TYPES: readonly FactionRelationType[] = ['allied', 'hostile', 'neutral', 'vassal', 'trade'] as const;

export class FactionsService extends BaseService<FactionsRepository> {
  constructor(repository: FactionsRepository, log: Logger, emit: EmitFn) {
    super('factions', repository, log, emit);
  }

  getById(id: string): Faction | null {
    this.assertInitialised();
    return this.repository.findById(id);
  }

  list(query: FactionListQuery = {}): Faction[] {
    this.assertInitialised();
    return this.repository.findAll(query);
  }

  getByNpcId(npcId: string): Faction[] {
    this.assertInitialised();
    return this.repository.findByNpcId(npcId);
  }

  getByLocationId(locationId: string): Faction[] {
    this.assertInitialised();
    return this.repository.findByLocationId(locationId);
  }

  getBySessionId(sessionId: string): Faction[] {
    this.assertInitialised();
    return this.repository.findBySessionId(sessionId);
  }

  create(input: CreateFactionInput): Faction {
    this.assertInitialised();
    this.requireString(input.name, 'name');
    this.validateNumber(input.strength ?? 0, 'strength');
    this.validateOrganization(input.organization ?? []);
    this.validateInfluence(input.influence ?? {});
    this.validateRelations(input.relations ?? []);
    this.validateNumberMap(input.reputation ?? {}, 'reputation');
    this.validateNumberMap(input.resources ?? {}, 'resources');

    const faction = this.repository.create({
      ...input,
      id: this.generateId(),
      name: input.name.trim(),
      createdAt: this.now(),
      updatedAt: this.now(),
    });

    this.emit('faction:created', { factionId: faction.id });
    this.log.info('Faction created', { factionId: faction.id, name: faction.name });
    return faction;
  }

  update(input: UpdateFactionInput): Faction {
    this.assertInitialised();
    if (input.name !== undefined) this.requireString(input.name, 'name');
    if (input.strength !== undefined) this.validateNumber(input.strength, 'strength');
    if (input.organization !== undefined) this.validateOrganization(input.organization);
    if (input.influence !== undefined) this.validateInfluence(input.influence);
    if (input.relations !== undefined) this.validateRelations(input.relations);
    if (input.reputation !== undefined) this.validateNumberMap(input.reputation, 'reputation');
    if (input.resources !== undefined) this.validateNumberMap(input.resources, 'resources');

    if (!this.repository.findById(input.id)) {
      throw new Error(`Faction not found: ${input.id}`);
    }

    const updated = this.repository.update({
      ...input,
      name: input.name?.trim(),
      updatedAt: this.now(),
    });
    if (!updated) throw new Error(`Faction update failed: ${input.id}`);

    this.emit('faction:updated', { factionId: updated.id });
    if (input.organization !== undefined) this.emit('faction:organization_updated', { factionId: updated.id });
    if (input.controlledLocationIds !== undefined || input.influence !== undefined) {
      this.emit('faction:territory_updated', { factionId: updated.id });
    }
    if (input.relations !== undefined) this.emit('faction:relation_updated', { factionId: updated.id });
    if (input.reputation !== undefined) this.emit('faction:reputation_updated', { factionId: updated.id });

    return updated;
  }

  delete(id: string): void {
    this.assertInitialised();
    const existed = this.repository.delete(id);
    if (!existed) throw new Error(`Faction not found: ${id}`);
    this.repository.clearQuestSponsorsForFaction(id);
    this.emit('faction:deleted', { factionId: id });
    this.log.info('Faction deleted', { factionId: id });
  }

  handleNpcUpdated(npcId: string): void {
    this.assertInitialised();
    this.repository.removeNpcReferences(npcId);
  }

  handleLocationDeleted(locationId: string): void {
    this.assertInitialised();
    this.repository.removeLocationReferences(locationId);
  }

  handleQuestUpdated(): void {
    this.assertInitialised();
    this.repository.clearDanglingQuestSponsors();
  }

  private validateOrganization(nodes: OrgNode[]): void {
    const seen = new Set<string>();
    for (const node of nodes) {
      this.requireString(node.id, 'organization.id');
      this.requireString(node.name, 'organization.name');
      this.requireString(node.role, 'organization.role');
      if (seen.has(node.id)) {
        throw new Error(`organization contains duplicate node id: ${node.id}`);
      }
      seen.add(node.id);
    }
    for (const node of nodes) {
      if (!node.parentId) continue;
      if (!seen.has(node.parentId)) {
        throw new Error(`organization parentId not found: ${node.parentId}`);
      }
      if (node.parentId === node.id) {
        throw new Error(`organization node cannot parent itself: ${node.id}`);
      }
    }
  }

  private validateInfluence(influence: Record<string, number>): void {
    for (const [locationId, score] of Object.entries(influence)) {
      this.requireString(locationId, 'influence.locationId');
      this.validateNumber(score, `influence.${locationId}`);
      this.requireRange(score, 0, 100, `influence.${locationId}`);
    }
  }

  private validateRelations(relations: FactionRelation[]): void {
    for (const relation of relations) {
      this.requireString(relation.targetFactionId, 'relations.targetFactionId');
      this.requireOneOf(relation.type, RELATION_TYPES, 'relations.type');
      if (relation.strength !== undefined) this.validateNumber(relation.strength, 'relations.strength');
    }
  }

  private validateNumberMap(values: Record<string, number>, field: string): void {
    for (const [key, value] of Object.entries(values)) {
      this.requireString(key, `${field}.key`);
      this.validateNumber(value, `${field}.${key}`);
    }
  }

  private validateNumber(value: number, fieldName: string): void {
    this.validate(
      Number.isFinite(value),
      `${fieldName} must be a finite number.`,
      `${fieldName.toUpperCase().replace(/\./g, '_')}_INVALID`,
      fieldName,
    );
  }
}
