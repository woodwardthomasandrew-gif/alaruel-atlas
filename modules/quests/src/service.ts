import { BaseService }           from '../../_framework/src/index';
import type { EmitFn }           from '../../_framework/src/index';
import type { Logger }           from '../../../core/logger/src/types';
import type { Quest, QuestObjective } from '../../../shared/src/types/quest';
import type { QuestsRepository } from './repository';
import type { CreateQuestInput, UpdateQuestInput, QuestListQuery } from './types';

const VALID_STATUSES = ['rumour','active','on_hold','completed','failed','abandoned','hidden'] as const;

export class QuestsService extends BaseService<QuestsRepository> {
  constructor(repository: QuestsRepository, log: Logger, emit: EmitFn) {
    super('quests', repository, log, emit);
  }

  getById(id: string): Quest | null {
    this.assertInitialised();
    return this.repository.findById(id);
  }

  list(query: QuestListQuery = {}): Quest[] {
    this.assertInitialised();
    return this.repository.findAll(query);
  }

  create(input: CreateQuestInput): Quest {
    this.assertInitialised();
    this.requireString(input.name, 'name');
    const quest = this.repository.create({
      ...input,
      name:      input.name.trim(),
      id:        this.generateId(),
      createdAt: this.now(),
      updatedAt: this.now(),
    });
    this.emit('quest:created', { questId: quest.id });
    this.log.info('Quest created', { questId: quest.id });
    return quest;
  }

  update(input: UpdateQuestInput): Quest {
    this.assertInitialised();
    if (input.name !== undefined) this.requireString(input.name, 'name');
    if (input.status !== undefined) this.requireOneOf(input.status, VALID_STATUSES, 'status');
    if (!this.repository.findById(input.id)) throw new Error(`Quest not found: ${input.id}`);
    const updated = this.repository.update({ ...input, updatedAt: this.now() });
    if (!updated) throw new Error(`Quest update failed: ${input.id}`);
    this.emit('quest:updated', { questId: updated.id });
    if (input.status === 'completed') {
      this.emit('quest:completed', { questId: updated.id, npcIds: [] });
    }
    return updated;
  }

  delete(id: string): void {
    this.assertInitialised();
    if (!this.repository.delete(id)) throw new Error(`Quest not found: ${id}`);
  }

  toggleObjective(questId: string, objectiveId: string, completed: boolean): Quest {
    this.assertInitialised();
    this.repository.toggleObjective(objectiveId, completed);
    const quest = this.repository.findById(questId);
    if (!quest) throw new Error(`Quest not found: ${questId}`);
    const allRequired = quest.objectives.filter(o => o.required);
    if (allRequired.length > 0 && allRequired.every(o => o.completed)) {
      this.log.info('All required objectives complete', { questId });
    }
    return quest;
  }

  addObjective(questId: string, description: string, required = true): QuestObjective {
    this.assertInitialised();
    this.requireString(description, 'description');
    return this.repository.addObjective(questId, description.trim(), required, this.generateId());
  }

  deleteObjective(questId: string, objectiveId: string): Quest {
    this.assertInitialised();
    this.repository.deleteObjective(objectiveId);
    return this.repository.findById(questId) ?? (() => { throw new Error(`Quest not found: ${questId}`); })();
  }
}
