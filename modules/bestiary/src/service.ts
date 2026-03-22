// modules/bestiary/src/service.ts
// Monster business logic — validates input, orchestrates writes, emits events.

import { BaseService }           from '../../_framework/src/index';
import type { EmitFn }           from '../../_framework/src/index';
import type { Logger }           from '../../../core/logger/src/types';
import type { Monster }          from '../../../shared/src/types/monster';
import type { BestiaryRepository } from './repository';
import type {
  CreateMonsterInput,
  UpdateMonsterInput,
  MonsterListQuery,
} from './types';

export class BestiaryService extends BaseService<BestiaryRepository> {
  constructor(repository: BestiaryRepository, log: Logger, emit: EmitFn) {
    super('bestiary', repository, log, emit);
  }

  // ── Reads ──────────────────────────────────────────────────────────────────

  getById(id: string): Monster | null {
    this.assertInitialised();
    return this.repository.findById(id);
  }

  list(query: MonsterListQuery = {}): Monster[] {
    this.assertInitialised();
    return this.repository.findAll(query);
  }

  count(query: MonsterListQuery = {}): number {
    this.assertInitialised();
    return this.repository.count(query);
  }

  // ── Writes ─────────────────────────────────────────────────────────────────

  create(input: CreateMonsterInput): Monster {
    this.assertInitialised();
    this.requireString(input.name, 'name');

    if (input.hitPoints !== undefined) {
      this.requireRange(input.hitPoints, 1, 999_999, 'hitPoints');
    }
    if (input.armorClass !== undefined) {
      this.requireRange(input.armorClass, 0, 99, 'armorClass');
    }

    const monster = this.repository.create({
      ...input,
      name:      input.name.trim(),
      id:        this.generateId(),
      createdAt: this.now(),
      updatedAt: this.now(),
    });

    this.emit('bestiary:created', { monsterId: monster.id });
    this.log.info('Monster created', { monsterId: monster.id, name: monster.name });
    return monster;
  }

  update(input: UpdateMonsterInput): Monster {
    this.assertInitialised();
    if (input.name !== undefined) this.requireString(input.name, 'name');
    if (input.hitPoints !== undefined) this.requireRange(input.hitPoints, 1, 999_999, 'hitPoints');
    if (input.armorClass !== undefined) this.requireRange(input.armorClass, 0, 99, 'armorClass');

    const existing = this.repository.findById(input.id);
    if (!existing) throw new Error(`Monster not found: ${input.id}`);

    const updated = this.repository.update({ ...input, updatedAt: this.now() });
    if (!updated) throw new Error(`Monster update failed: ${input.id}`);

    this.emit('bestiary:updated', { monsterId: updated.id });
    this.log.info('Monster updated', { monsterId: updated.id });
    return updated;
  }

  delete(id: string): void {
    this.assertInitialised();
    const existed = this.repository.delete(id);
    if (!existed) throw new Error(`Monster not found: ${id}`);
    this.log.info('Monster deleted', { monsterId: id });
  }
}
