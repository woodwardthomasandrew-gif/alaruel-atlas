import { BaseService }             from '../../_framework/src/index';
import type { EmitFn }             from '../../_framework/src/index';
import type { Logger }             from '../../../core/logger/src/types';
import type {
  Encounter, EncounterMonsterEntry, MiniMatchSuggestion, OwnedMiniForMatching,
} from '../../../shared/src/types/encounter';
import type { EncountersRepository } from './repository';
import type {
  CreateEncounterInput, UpdateEncounterInput,
  AddEncounterMonsterInput, UpdateEncounterMonsterInput,
  AssignMiniInput,
} from './types';

export class EncountersService extends BaseService<EncountersRepository> {
  constructor(repository: EncountersRepository, log: Logger, emit: EmitFn) {
    super('encounters', repository, log, emit);
  }

  // ── Core CRUD ────────────────────────────────────────────────────────────

  list(): Encounter[] {
    this.assertInitialised();
    return this.repository.findAll();
  }

  listBySession(sessionId: string): Encounter[] {
    this.assertInitialised();
    this.requireString(sessionId, 'sessionId');
    return this.repository.findBySession(sessionId);
  }

  getByDungeonRoom(dungeonRoomId: string): Encounter | null {
    this.assertInitialised();
    this.requireString(dungeonRoomId, 'dungeonRoomId');
    return this.repository.findByDungeonRoom(dungeonRoomId);
  }

  getById(id: string): Encounter | null {
    this.assertInitialised();
    return this.repository.findById(id);
  }

  create(input: CreateEncounterInput): Encounter {
    this.assertInitialised();
    this.requireString(input.name, 'name');
    const encounter = this.repository.create({
      ...input, name: input.name.trim(),
      id: this.generateId(), createdAt: this.now(), updatedAt: this.now(),
    });
    this.emit('encounter:created', { encounterId: encounter.id });
    this.log.info('Encounter created', { encounterId: encounter.id, name: encounter.name });
    return encounter;
  }

  /** Create an encounter pre-populated from an already-generated dungeon room. */
  createFromDungeonRoom(
    dungeonRoomId: string,
    input: Omit<CreateEncounterInput, 'dungeonRoomId'>,
  ): Encounter {
    this.assertInitialised();
    if (this.repository.findByDungeonRoom(dungeonRoomId)) {
      throw new Error(`An encounter already exists for dungeon room: ${dungeonRoomId}`);
    }
    return this.create({ ...input, dungeonRoomId });
  }

  update(input: UpdateEncounterInput): Encounter {
    this.assertInitialised();
    if (input.name !== undefined) this.requireString(input.name, 'name');
    if (!this.repository.findById(input.id)) throw new Error(`Encounter not found: ${input.id}`);
    const updated = this.repository.update({ ...input, updatedAt: this.now() });
    if (!updated) throw new Error(`Encounter update failed: ${input.id}`);
    this.emit('encounter:updated', { encounterId: updated.id });
    if (input.status === 'run') this.emit('encounter:run', { encounterId: updated.id });
    return updated;
  }

  delete(id: string): void {
    this.assertInitialised();
    if (!this.repository.delete(id)) throw new Error(`Encounter not found: ${id}`);
    this.emit('encounter:deleted', { encounterId: id });
  }

  // ── Enemy roster ─────────────────────────────────────────────────────────

  addMonster(input: AddEncounterMonsterInput): EncounterMonsterEntry {
    this.assertInitialised();
    this.requireString(input.monsterId, 'monsterId');
    if (!this.repository.findById(input.encounterId)) {
      throw new Error(`Encounter not found: ${input.encounterId}`);
    }
    const sortOrder = this.repository.nextMonsterSortOrder(input.encounterId);
    const entry = this.repository.addMonster(input, this.generateId(), sortOrder);
    this.emit('encounter:roster-updated', { encounterId: input.encounterId });
    return entry;
  }

  updateMonster(input: UpdateEncounterMonsterInput, encounterId: string): EncounterMonsterEntry {
    this.assertInitialised();
    const updated = this.repository.updateMonster(input);
    if (!updated) throw new Error(`Encounter monster not found: ${input.id}`);
    this.emit('encounter:roster-updated', { encounterId });
    return updated;
  }

  removeMonster(id: string, encounterId: string): void {
    this.assertInitialised();
    if (!this.repository.removeMonster(id)) throw new Error(`Encounter monster not found: ${id}`);
    this.emit('encounter:roster-updated', { encounterId });
  }

  // ── NPC allies ───────────────────────────────────────────────────────────

  addNpcAlly(encounterId: string, npcId: string): void {
    this.assertInitialised();
    this.repository.addNpcAlly(encounterId, npcId);
    this.emit('encounter:updated', { encounterId });
  }

  removeNpcAlly(encounterId: string, npcId: string): void {
    this.assertInitialised();
    this.repository.removeNpcAlly(encounterId, npcId);
    this.emit('encounter:updated', { encounterId });
  }

  // ── Miniature assignments ───────────────────────────────────────────────

  assignMini(input: AssignMiniInput) {
    this.assertInitialised();
    const entry = this.repository.assignMini(input, this.generateId());
    this.emit('encounter:minis-updated', { encounterId: input.encounterId });
    return entry;
  }

  unassignMini(id: string, encounterId: string): void {
    this.assertInitialised();
    if (!this.repository.removeMiniAssignment(id)) {
      throw new Error(`Mini assignment not found: ${id}`);
    }
    this.emit('encounter:minis-updated', { encounterId });
  }

  /**
   * Compares this encounter's enemy roster against a caller-supplied snapshot
   * of owned miniatures (the caller composes this from the Mini Vault /
   * mini-catalogue module and, where relevant, its links to bestiary entries)
   * and returns match suggestions per roster entry.
   *
   * Priority order, per the design spec:
   *   1. Exact miniature matches (mini explicitly linked to this monsterId)
   *   2. Same creature type (mini tagged with a matching creature-type tag)
   *   3. Tagged proxies (mini tagged "proxy" or sharing any roster tag)
   *   4. Manual assignment (left for the user; reported as missing)
   */
  suggestMiniMatches(encounterId: string, ownedMinis: OwnedMiniForMatching[]): MiniMatchSuggestion[] {
    this.assertInitialised();
    const encounter = this.repository.findById(encounterId);
    if (!encounter) throw new Error(`Encounter not found: ${encounterId}`);

    return encounter.monsters.map((entry) => {
      const exactMatches = ownedMinis
        .filter(m => m.monsterIds.includes(entry.monsterId) && m.quantity > 0)
        .map(m => ({ miniId: m.miniId, name: m.name, available: m.quantity }));

      const alreadyMatchedIds = new Set(exactMatches.map(m => m.miniId));
      const typeMatches = ownedMinis
        .filter(m =>
          !alreadyMatchedIds.has(m.miniId) &&
          m.quantity > 0 &&
          m.tags.some(t => entry.groupLabel && t.toLowerCase() === entry.groupLabel.toLowerCase()))
        .map(m => ({ miniId: m.miniId, name: m.name, available: m.quantity }));

      const typeMatchedIds = new Set([...alreadyMatchedIds, ...typeMatches.map(m => m.miniId)]);
      const taggedProxies = ownedMinis
        .filter(m =>
          !typeMatchedIds.has(m.miniId) &&
          m.quantity > 0 &&
          m.tags.some(t => t.toLowerCase() === 'proxy'))
        .map(m => ({ miniId: m.miniId, name: m.name, available: m.quantity }));

      const totalAvailable =
        exactMatches.reduce((n, m) => n + m.available, 0) +
        typeMatches.reduce((n, m) => n + m.available, 0);
      const missingCount = Math.max(0, entry.quantity - totalAvailable);

      return {
        encounterMonsterId: entry.id,
        monsterId:          entry.monsterId,
        quantityNeeded:     entry.quantity,
        exactMatches,
        typeMatches,
        taggedProxies,
        fullySupported:     missingCount === 0,
        missingCount,
      } satisfies MiniMatchSuggestion;
    });
  }

  /**
   * Applies the highest-priority available match for every roster entry,
   * consuming owned-mini quantities as it goes so the same physical mini
   * isn't double-assigned across creatures. Backs the "Auto Assign Minis"
   * workspace action.
   */
  autoAssignMinis(encounterId: string, ownedMinis: OwnedMiniForMatching[]): void {
    this.assertInitialised();
    const suggestions = this.suggestMiniMatches(encounterId, ownedMinis);
    const remaining = new Map(ownedMinis.map(m => [m.miniId, m.quantity]));

    this.repository.clearMiniAssignmentsForEncounter(encounterId);

    for (const suggestion of suggestions) {
      let needed = suggestion.quantityNeeded;
      const pools: Array<{ pool: MiniMatchSuggestion['exactMatches']; assignment: 'exact' | 'proxy' }> = [
        { pool: suggestion.exactMatches, assignment: 'exact' },
        { pool: suggestion.typeMatches,  assignment: 'exact' },
        { pool: suggestion.taggedProxies, assignment: 'proxy' },
      ];

      for (const { pool, assignment } of pools) {
        for (const candidate of pool) {
          if (needed <= 0) break;
          const available = remaining.get(candidate.miniId) ?? 0;
          if (available <= 0) continue;
          const take = Math.min(available, needed);
          this.repository.assignMini({
            encounterId,
            encounterMonsterId: suggestion.encounterMonsterId,
            miniId: candidate.miniId,
            quantity: take,
            assignment,
          }, this.generateId());
          remaining.set(candidate.miniId, available - take);
          needed -= take;
        }
      }

      if (needed > 0) {
        this.repository.assignMini({
          encounterId,
          encounterMonsterId: suggestion.encounterMonsterId,
          quantity: needed,
          assignment: 'missing',
        }, this.generateId());
      }
    }

    this.emit('encounter:minis-updated', { encounterId });
    this.log.info('Auto-assigned minis', { encounterId });
  }

  /** Flattened miniature pull list for the print system: name, qty, proxy note. */
  buildMiniPullList(encounterId: string, ownedMinis: OwnedMiniForMatching[]): Array<{
    miniId?: string | undefined; name: string; quantity: number; isProxy: boolean; notes?: string | undefined;
  }> {
    this.assertInitialised();
    const encounter = this.repository.findById(encounterId);
    if (!encounter) throw new Error(`Encounter not found: ${encounterId}`);
    const byId = new Map(ownedMinis.map(m => [m.miniId, m]));

    return encounter.minis
      .filter(m => m.assignment !== 'missing' && m.miniId)
      .map(m => {
        const mini = byId.get(m.miniId!);
        return {
          miniId:   m.miniId,
          name:     mini?.name ?? m.miniId!,
          quantity: m.quantity,
          isProxy:  m.assignment === 'proxy',
          notes:    m.proxyNotes,
        };
      });
  }
}
