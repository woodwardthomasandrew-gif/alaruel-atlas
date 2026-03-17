// modules/npcs/src/service.ts
// NPC business logic. Validates, orchestrates, emits events.

import { BaseService }           from '../../_framework/src/index';
import type { EmitFn }           from '../../_framework/src/index';
import type { Logger }           from '../../../core/logger/src/types';
import type { NPC, NpcNote }     from '../../../shared/src/types/npc';
import type { NpcsRepository }   from './repository';
import type {
  CreateNpcInput,
  UpdateNpcInput,
  CreateNpcNoteInput,
  NpcListQuery,
} from './types';

export class NpcsService extends BaseService<NpcsRepository> {
  constructor(repository: NpcsRepository, log: Logger, emit: EmitFn) {
    super('npcs', repository, log, emit);
  }

  // ── Reads ──────────────────────────────────────────────────────────────────

  getById(id: string): NPC | null {
    this.assertInitialised();
    return this.repository.findById(id);
  }

  list(query: NpcListQuery = {}): NPC[] {
    this.assertInitialised();
    return this.repository.findAll(query);
  }

  count(query: NpcListQuery = {}): number {
    this.assertInitialised();
    return this.repository.count(query);
  }

  // ── Writes ─────────────────────────────────────────────────────────────────

  create(input: CreateNpcInput): NPC {
    this.assertInitialised();
    this.requireString(input.name, 'name');

    const npc = this.repository.create({
      ...input,
      name:       input.name.trim(),
      id:         this.generateId(),
      createdAt:  this.now(),
      updatedAt:  this.now(),
    });

    this.emit('npc:created', { npcId: npc.id });
    this.log.info('NPC created', { npcId: npc.id, name: npc.name });
    return npc;
  }

  update(input: UpdateNpcInput): NPC {
    this.assertInitialised();
    if (input.name !== undefined) this.requireString(input.name, 'name');

    const existing = this.repository.findById(input.id);
    if (!existing) {
      throw new Error(`NPC not found: ${input.id}`);
    }

    const updated = this.repository.update({ ...input, updatedAt: this.now() });
    if (!updated) throw new Error(`NPC update failed: ${input.id}`);

    this.emit('npc:updated', { npcId: updated.id });
    this.log.info('NPC updated', { npcId: updated.id });
    return updated;
  }

  delete(id: string): void {
    this.assertInitialised();
    const existed = this.repository.delete(id);
    if (!existed) throw new Error(`NPC not found: ${id}`);
    this.log.info('NPC deleted', { npcId: id });
  }

  addNote(input: CreateNpcNoteInput): NpcNote {
    this.assertInitialised();
    this.requireString(input.content, 'content');

    return this.repository.addNote({
      ...input,
      id:        this.generateId(),
      createdAt: this.now(),
    });
  }

  deleteNote(noteId: string): void {
    this.assertInitialised();
    this.repository.deleteNote(noteId);
  }
}
