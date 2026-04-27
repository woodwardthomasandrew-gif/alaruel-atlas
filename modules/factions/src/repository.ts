import { BaseRepository }        from '../../_framework/src/index';
import type { IDatabaseManager } from '../../../core/database/src/types';
import type { Logger }           from '../../../core/logger/src/types';
import type { Faction, OrgNode, FactionRelation } from '../../../shared/src/types/faction';
import type {
  FactionRow,
  OrgNodeRow,
  FactionMemberRow,
  FactionTerritoryRow,
  FactionRelationRow,
  FactionReputationRow,
  FactionResourceRow,
  SessionFactionRow,
  CreateFactionInput,
  UpdateFactionInput,
  FactionListQuery,
} from './types';

function mapOrgNode(row: OrgNodeRow): OrgNode {
  const node: OrgNode = {
    id: row.id,
    name: row.name,
    role: row.role,
  };
  if (row.npc_id) node.npcId = row.npc_id;
  if (row.parent_id) node.parentId = row.parent_id;
  if (row.notes !== null) node.notes = row.notes;
  return node;
}

function mapRelation(row: FactionRelationRow): FactionRelation {
  const relation: FactionRelation = {
    targetFactionId: row.target_faction_id,
    type: row.relation_type,
  };
  if (row.strength !== null) relation.strength = row.strength;
  if (row.notes !== null) relation.notes = row.notes;
  return relation;
}

function parseTags(raw: string): string[] {
  try {
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

export class FactionsRepository extends BaseRepository {
  constructor(db: IDatabaseManager, log: Logger) {
    super('factions', db, log);
  }

  findById(id: string): Faction | null {
    const row = this.queryOne<FactionRow>(
      'SELECT * FROM factions WHERE id = ? AND campaign_id = ?',
      [id, this.campaignId],
    );
    return row ? this.hydrateFaction(row) : null;
  }

  findAll(query: FactionListQuery = {}): Faction[] {
    const conditions: string[] = ['campaign_id = ?'];
    const params: (string | number)[] = [this.campaignId];

    if (query.search) {
      conditions.push('(name LIKE ? OR description LIKE ?)');
      const like = `%${query.search}%`;
      params.push(like, like);
    }
    if (query.tag) {
      conditions.push('tags LIKE ?');
      params.push(`%"${query.tag}"%`);
    }
    if (query.npcId) {
      conditions.push(`(
        leader_npc_id = ?
        OR EXISTS (
          SELECT 1 FROM faction_members fm WHERE fm.faction_id = factions.id AND fm.npc_id = ?
        )
      )`);
      params.push(query.npcId, query.npcId);
    }
    if (query.locationId) {
      conditions.push(`EXISTS (
        SELECT 1 FROM faction_territory ft
        WHERE ft.faction_id = factions.id AND ft.location_id = ?
      )`);
      params.push(query.locationId);
    }

    const where = conditions.join(' AND ');
    const limit = query.limit ?? 200;
    const offset = query.offset ?? 0;

    const rows = this.query<FactionRow>(
      `SELECT * FROM factions WHERE ${where} ORDER BY name ASC LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    return rows.map((row) => this.hydrateFaction(row));
  }

  findByNpcId(npcId: string): Faction[] {
    const rows = this.query<FactionRow>(
      `SELECT DISTINCT f.*
       FROM factions f
       LEFT JOIN faction_members fm ON fm.faction_id = f.id
       LEFT JOIN faction_org_nodes fon ON fon.faction_id = f.id
       WHERE f.campaign_id = ?
         AND (f.leader_npc_id = ? OR fm.npc_id = ? OR fon.npc_id = ?)
       ORDER BY f.name ASC`,
      [this.campaignId, npcId, npcId, npcId],
    );
    return rows.map((row) => this.hydrateFaction(row));
  }

  findByLocationId(locationId: string): Faction[] {
    const rows = this.query<FactionRow>(
      `SELECT DISTINCT f.*
       FROM factions f
       INNER JOIN faction_territory ft ON ft.faction_id = f.id
       WHERE f.campaign_id = ? AND ft.location_id = ?
       ORDER BY f.name ASC`,
      [this.campaignId, locationId],
    );
    return rows.map((row) => this.hydrateFaction(row));
  }

  findBySessionId(sessionId: string): Faction[] {
    const rows = this.query<FactionRow>(
      `SELECT DISTINCT f.*
       FROM factions f
       INNER JOIN session_factions sf ON sf.faction_id = f.id
       WHERE f.campaign_id = ? AND sf.session_id = ?
       ORDER BY f.name ASC`,
      [this.campaignId, sessionId],
    );
    return rows.map((row) => this.hydrateFaction(row));
  }

  create(input: CreateFactionInput & { id: string; createdAt: string; updatedAt: string }): Faction {
    this.transaction(() => {
      this.run(
        `INSERT INTO factions
          (id, campaign_id, name, description, strength, notes, leader_npc_id, tags, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          input.id,
          this.campaignId,
          input.name,
          input.description ?? '',
          input.strength ?? 0,
          input.notes ?? '',
          input.leaderNpcId ?? null,
          JSON.stringify(input.tags ?? []),
          input.createdAt,
          input.updatedAt,
        ],
      );

      this.replaceMembers(input.id, input.memberNpcIds ?? []);
      this.replaceOrganization(input.id, input.organization ?? []);
      this.replaceTerritory(input.id, input.controlledLocationIds ?? [], input.influence ?? {});
      this.replaceRelations(input.id, input.relations ?? []);
      this.replaceReputation(input.id, input.reputation ?? {});
      this.replaceResources(input.id, input.resources ?? {});
      this.replaceSessionLinks(input.id, input.sessionIds ?? []);
    });

    return this.findById(input.id)!;
  }

  update(input: UpdateFactionInput & { updatedAt: string }): Faction | null {
    this.transaction(() => {
      const sets: string[] = ['updated_at = ?'];
      const params: (string | number | null)[] = [input.updatedAt];

      if (input.name !== undefined) {
        sets.push('name = ?');
        params.push(input.name);
      }
      if (input.description !== undefined) {
        sets.push('description = ?');
        params.push(input.description);
      }
      if (input.strength !== undefined) {
        sets.push('strength = ?');
        params.push(input.strength);
      }
      if (input.notes !== undefined) {
        sets.push('notes = ?');
        params.push(input.notes);
      }
      if (input.leaderNpcId !== undefined) {
        sets.push('leader_npc_id = ?');
        params.push(input.leaderNpcId);
      }
      if (input.tags !== undefined) {
        sets.push('tags = ?');
        params.push(JSON.stringify(input.tags));
      }

      params.push(input.id, this.campaignId);
      this.run(
        `UPDATE factions SET ${sets.join(', ')} WHERE id = ? AND campaign_id = ?`,
        params,
      );

      if (input.memberNpcIds !== undefined) this.replaceMembers(input.id, input.memberNpcIds);
      if (input.organization !== undefined) this.replaceOrganization(input.id, input.organization);
      if (input.controlledLocationIds !== undefined || input.influence !== undefined) {
        const existing = this.findById(input.id);
        this.replaceTerritory(
          input.id,
          input.controlledLocationIds ?? existing?.controlledLocationIds ?? [],
          input.influence ?? existing?.influence ?? {},
        );
      }
      if (input.relations !== undefined) this.replaceRelations(input.id, input.relations);
      if (input.reputation !== undefined) this.replaceReputation(input.id, input.reputation);
      if (input.resources !== undefined) this.replaceResources(input.id, input.resources);
      if (input.sessionIds !== undefined) this.replaceSessionLinks(input.id, input.sessionIds);
    });

    return this.findById(input.id);
  }

  delete(id: string): boolean {
    const result = this.run(
      'DELETE FROM factions WHERE id = ? AND campaign_id = ?',
      [id, this.campaignId],
    );
    return result.changes > 0;
  }

  removeNpcReferences(npcId: string): void {
    this.run(
      'UPDATE factions SET leader_npc_id = NULL WHERE campaign_id = ? AND leader_npc_id = ?',
      [this.campaignId, npcId],
    );
    this.run(
      `DELETE FROM faction_members
       WHERE faction_id IN (SELECT id FROM factions WHERE campaign_id = ?)
         AND npc_id = ?`,
      [this.campaignId, npcId],
    );
    this.run(
      `UPDATE faction_org_nodes
       SET npc_id = NULL
       WHERE campaign_id = ? AND npc_id = ?`,
      [this.campaignId, npcId],
    );
  }

  removeLocationReferences(locationId: string): void {
    this.run(
      `DELETE FROM faction_territory
       WHERE location_id = ?
         AND faction_id IN (SELECT id FROM factions WHERE campaign_id = ?)`,
      [locationId, this.campaignId],
    );
  }

  clearQuestSponsorsForFaction(factionId: string): number {
    return this.run(
      `UPDATE quests
       SET sponsor_faction_id = NULL
       WHERE campaign_id = ? AND sponsor_faction_id = ?`,
      [this.campaignId, factionId],
    ).changes;
  }

  clearDanglingQuestSponsors(): number {
    return this.run(
      `UPDATE quests
       SET sponsor_faction_id = NULL
       WHERE campaign_id = ?
         AND sponsor_faction_id IS NOT NULL
         AND NOT EXISTS (
           SELECT 1 FROM factions f
           WHERE f.id = quests.sponsor_faction_id
             AND f.campaign_id = quests.campaign_id
         )`,
      [this.campaignId],
    ).changes;
  }

  private hydrateFaction(row: FactionRow): Faction {
    const members = this.query<FactionMemberRow>(
      'SELECT faction_id, npc_id FROM faction_members WHERE faction_id = ? ORDER BY npc_id ASC',
      [row.id],
    ).map((r) => r.npc_id);

    const orgNodes = this.query<OrgNodeRow>(
      `SELECT * FROM faction_org_nodes
       WHERE faction_id = ?
       ORDER BY sort_order ASC`,
      [row.id],
    ).map(mapOrgNode);

    const territoryRows = this.query<FactionTerritoryRow>(
      `SELECT faction_id, location_id, influence
       FROM faction_territory
       WHERE faction_id = ?
       ORDER BY influence DESC, location_id ASC`,
      [row.id],
    );
    const controlledLocationIds = territoryRows.map((r) => r.location_id);
    const influence = territoryRows.reduce<Record<string, number>>((acc, t) => {
      acc[t.location_id] = t.influence;
      return acc;
    }, {});

    const relations = this.query<FactionRelationRow>(
      `SELECT faction_id, target_faction_id, relation_type, strength, notes
       FROM faction_relations
       WHERE faction_id = ?
       ORDER BY target_faction_id ASC`,
      [row.id],
    ).map(mapRelation);

    const reputation = this.query<FactionReputationRow>(
      `SELECT faction_id, group_key, score
       FROM faction_reputation
       WHERE faction_id = ?
       ORDER BY group_key ASC`,
      [row.id],
    ).reduce<Record<string, number>>((acc, r) => {
      acc[r.group_key] = r.score;
      return acc;
    }, {});

    const resources = this.query<FactionResourceRow>(
      `SELECT faction_id, resource_key, amount
       FROM faction_resources
       WHERE faction_id = ?
       ORDER BY resource_key ASC`,
      [row.id],
    ).reduce<Record<string, number>>((acc, r) => {
      acc[r.resource_key] = r.amount;
      return acc;
    }, {});

    return {
      id: row.id,
      name: row.name,
      description: row.description,
      strength: row.strength,
      notes: row.notes,
      organization: orgNodes,
      leaderNpcId: row.leader_npc_id,
      memberNpcIds: members,
      controlledLocationIds,
      influence,
      relations,
      reputation,
      resources,
      tags: parseTags(row.tags),
      createdAt: row.created_at as Faction['createdAt'],
      updatedAt: row.updated_at as Faction['updatedAt'],
    };
  }

  private replaceMembers(factionId: string, npcIds: string[]): void {
    this.run('DELETE FROM faction_members WHERE faction_id = ?', [factionId]);
    for (const npcId of npcIds) {
      this.run(
        'INSERT OR IGNORE INTO faction_members (faction_id, npc_id) VALUES (?, ?)',
        [factionId, npcId],
      );
    }
  }

  private replaceOrganization(factionId: string, nodes: OrgNode[]): void {
    this.run('DELETE FROM faction_org_nodes WHERE faction_id = ?', [factionId]);
    nodes.forEach((node, index) => {
      this.run(
        `INSERT INTO faction_org_nodes
          (id, faction_id, campaign_id, name, role, npc_id, parent_id, notes, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          node.id,
          factionId,
          this.campaignId,
          node.name,
          node.role,
          node.npcId ?? null,
          node.parentId ?? null,
          node.notes ?? null,
          index,
        ],
      );
    });
  }

  private replaceTerritory(
    factionId: string,
    controlledLocationIds: string[],
    influence: Record<string, number>,
  ): void {
    this.run('DELETE FROM faction_territory WHERE faction_id = ?', [factionId]);

    const ids = new Set<string>([
      ...controlledLocationIds,
      ...Object.keys(influence),
    ]);

    for (const locationId of ids) {
      this.run(
        'INSERT INTO faction_territory (faction_id, location_id, influence) VALUES (?, ?, ?)',
        [factionId, locationId, influence[locationId] ?? 0],
      );
    }
  }

  private replaceRelations(factionId: string, relations: FactionRelation[]): void {
    this.run('DELETE FROM faction_relations WHERE faction_id = ?', [factionId]);
    for (const relation of relations) {
      this.run(
        `INSERT INTO faction_relations
          (faction_id, target_faction_id, relation_type, strength, notes)
         VALUES (?, ?, ?, ?, ?)`,
        [
          factionId,
          relation.targetFactionId,
          relation.type,
          relation.strength ?? null,
          relation.notes ?? null,
        ],
      );
    }
  }

  private replaceReputation(factionId: string, reputation: Record<string, number>): void {
    this.run('DELETE FROM faction_reputation WHERE faction_id = ?', [factionId]);
    for (const [groupKey, score] of Object.entries(reputation)) {
      this.run(
        'INSERT INTO faction_reputation (faction_id, group_key, score) VALUES (?, ?, ?)',
        [factionId, groupKey, score],
      );
    }
  }

  private replaceResources(factionId: string, resources: Record<string, number>): void {
    this.run('DELETE FROM faction_resources WHERE faction_id = ?', [factionId]);
    for (const [resourceKey, amount] of Object.entries(resources)) {
      this.run(
        'INSERT INTO faction_resources (faction_id, resource_key, amount) VALUES (?, ?, ?)',
        [factionId, resourceKey, amount],
      );
    }
  }

  private replaceSessionLinks(factionId: string, sessionIds: string[]): void {
    this.run('DELETE FROM session_factions WHERE faction_id = ?', [factionId]);
    for (const sessionId of sessionIds) {
      this.run(
        'INSERT OR IGNORE INTO session_factions (session_id, faction_id) VALUES (?, ?)',
        [sessionId, factionId],
      );
    }
  }
}
