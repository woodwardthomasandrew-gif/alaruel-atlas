// modules/magic-items/src/service.ts
// Magic item business logic - validates input, orchestrates writes, emits events.

import { BaseService } from '../../_framework/src/index';
import type { EmitFn } from '../../_framework/src/index';
import type { Logger } from '../../../core/logger/src/types';
import type { MagicItem } from './types';
import type { MagicItemsRepository } from './repository';
import type {
  CreateMagicItemInput,
  UpdateMagicItemInput,
  MagicItemListQuery,
} from './types';

export class MagicItemsService extends BaseService<MagicItemsRepository> {
  constructor(repository: MagicItemsRepository, log: Logger, emit: EmitFn) {
    super('magic-items', repository, log, emit);
  }

  getById(id: string): MagicItem | null {
    this.assertInitialised();
    return this.repository.findById(id);
  }

  list(query: MagicItemListQuery = {}): MagicItem[] {
    this.assertInitialised();
    return this.repository.findAll(query);
  }

  count(query: MagicItemListQuery = {}): number {
    this.assertInitialised();
    return this.repository.count(query);
  }

  create(input: CreateMagicItemInput): MagicItem {
    this.assertInitialised();
    this.requireString(input.name, 'name');
    if (input.valueGp !== undefined) this.requireRange(input.valueGp, 0, 9_999_999, 'valueGp');
    if (input.weightLb !== undefined) this.requireRange(input.weightLb, 0, 9_999, 'weightLb');
    if (input.charges !== undefined) this.requireRange(input.charges, 0, 9999, 'charges');

    const item = this.repository.create({
      ...input,
      name: input.name.trim(),
      id: this.generateId(),
      createdAt: this.now(),
      updatedAt: this.now(),
      attunementText: input.requiresAttunement ? input.attunementText?.trim() || undefined : input.attunementText,
    });

    this.emit('magic-items:created', { magicItemId: item.id });
    this.log.info('Magic item created', { magicItemId: item.id, name: item.name });
    return item;
  }

  update(input: UpdateMagicItemInput): MagicItem {
    this.assertInitialised();
    if (input.name !== undefined) this.requireString(input.name, 'name');
    if (input.valueGp !== undefined) this.requireRange(input.valueGp, 0, 9_999_999, 'valueGp');
    if (input.weightLb !== undefined) this.requireRange(input.weightLb, 0, 9_999, 'weightLb');
    if (input.charges !== undefined) this.requireRange(input.charges, 0, 9999, 'charges');

    const existing = this.repository.findById(input.id);
    if (!existing) throw new Error(`Magic item not found: ${input.id}`);

    const updated = this.repository.update({
      ...input,
      updatedAt: this.now(),
      attunementText: input.requiresAttunement ? input.attunementText?.trim() || undefined : input.attunementText,
    });
    if (!updated) throw new Error(`Magic item update failed: ${input.id}`);

    this.emit('magic-items:updated', { magicItemId: updated.id });
    this.log.info('Magic item updated', { magicItemId: updated.id });
    return updated;
  }

  delete(id: string): void {
    this.assertInitialised();
    const existed = this.repository.delete(id);
    if (!existed) throw new Error(`Magic item not found: ${id}`);
    this.emit('magic-items:deleted', { magicItemId: id });
    this.log.info('Magic item deleted', { magicItemId: id });
  }
}
