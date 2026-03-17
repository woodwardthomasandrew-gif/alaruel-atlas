import { BaseService }              from '../../_framework/src/index';
import type { EmitFn }              from '../../_framework/src/index';
import type { Logger }              from '../../../core/logger/src/types';
import type { CampaignEvent }       from '../../../shared/src/types/event';
import type { TimelineRepository }  from './repository';
import type { CreateEventInput, UpdateEventInput } from './types';

export class TimelineService extends BaseService<TimelineRepository> {
  constructor(repository: TimelineRepository, log: Logger, emit: EmitFn) {
    super('timeline', repository, log, emit);
  }
  list(limit?: number): CampaignEvent[] {
    this.assertInitialised();
    return this.repository.findAll(limit);
  }
  getById(id: string): CampaignEvent | null {
    this.assertInitialised();
    return this.repository.findById(id);
  }
  create(input: CreateEventInput): CampaignEvent {
    this.assertInitialised();
    this.requireString(input.name, 'name');
    const event = this.repository.create({ ...input, name: input.name.trim(), id: this.generateId(), createdAt: this.now(), updatedAt: this.now() });
    this.emit('timeline:entry-added', { entryId: event.id });
    return event;
  }
  update(input: UpdateEventInput): CampaignEvent {
    this.assertInitialised();
    if (input.name !== undefined) this.requireString(input.name, 'name');
    const updated = this.repository.update({ ...input, updatedAt: this.now() });
    if (!updated) throw new Error(`Event not found: ${input.id}`);
    return updated;
  }
  delete(id: string): void {
    this.assertInitialised();
    if (!this.repository.delete(id)) throw new Error(`Event not found: ${id}`);
  }
}
