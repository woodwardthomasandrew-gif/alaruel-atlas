// modules/mini-catalogue/src/service.ts
// Mini business logic — validates input, orchestrates writes, emits events.

import { BaseService }              from '../../_framework/src/index';
import type { EmitFn }              from '../../_framework/src/index';
import type { Logger }              from '../../../core/logger/src/types';
import type { Mini }                from '../../../shared/src/types/mini';
import type { MiniCatalogueRepository } from './repository';
import type { CreateMiniInput, UpdateMiniInput, MiniListQuery } from './types';

export class MiniCatalogueService extends BaseService<MiniCatalogueRepository> {
  constructor(repository: MiniCatalogueRepository, log: Logger, emit: EmitFn) {
    super('mini-catalogue', repository, log, emit);
  }

  // ── Reads ──────────────────────────────────────────────────────────────────

  getById(id: string): Mini | null {
    this.assertInitialised();
    return this.repository.findById(id);
  }

  list(query: MiniListQuery = {}): Mini[] {
    this.assertInitialised();
    return this.repository.findAll(query);
  }

  listByMonsterId(monsterId: string): Mini[] {
    this.assertInitialised();
    return this.repository.findByMonsterId(monsterId);
  }

  // ── Writes ─────────────────────────────────────────────────────────────────

  create(input: CreateMiniInput): Mini {
    this.assertInitialised();
    this.requireString(input.name, 'name');

    const mini = this.repository.create({
      ...input,
      name:      input.name.trim(),
      id:        this.generateId(),
      createdAt: this.now(),
      updatedAt: this.now(),
    });

    this.emit('mini-catalogue:created', { miniId: mini.id });
    this.log.info('Mini created', { miniId: mini.id, name: mini.name });
    return mini;
  }

  update(input: UpdateMiniInput): Mini {
    this.assertInitialised();
    if (input.name !== undefined) this.requireString(input.name, 'name');

    const existing = this.repository.findById(input.id);
    if (!existing) throw new Error(`Mini not found: ${input.id}`);

    const updated = this.repository.update({ ...input, updatedAt: this.now() });
    if (!updated) throw new Error(`Mini update failed: ${input.id}`);

    this.emit('mini-catalogue:updated', { miniId: updated.id });
    this.log.info('Mini updated', { miniId: updated.id });
    return updated;
  }

  delete(id: string): void {
    this.assertInitialised();
    const existed = this.repository.delete(id);
    if (!existed) throw new Error(`Mini not found: ${id}`);
    this.log.info('Mini deleted', { miniId: id });
  }

  // ── Monster linking ────────────────────────────────────────────────────────

  linkMonster(miniId: string, monsterId: string): void {
    this.assertInitialised();
    this.repository.linkMonster(miniId, monsterId);
    this.log.info('Mini linked to monster', { miniId, monsterId });
  }

  unlinkMonster(miniId: string, monsterId: string): void {
    this.assertInitialised();
    this.repository.unlinkMonster(miniId, monsterId);
    this.log.info('Mini unlinked from monster', { miniId, monsterId });
  }
}
