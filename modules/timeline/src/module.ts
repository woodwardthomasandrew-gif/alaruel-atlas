import { BaseModule }                        from '../../_framework/src/index';
import type { ModuleManifest, ModuleContext } from '../../_framework/src/index';
import type { IDatabaseManager }              from '../../../core/database/src/types';
import { TimelineRepository }                from './repository';
import { TimelineService }                   from './service';
import { TIMELINE_SCHEMA }                   from './schema';

export class TimelineModule extends BaseModule<TimelineRepository, TimelineService> {
  readonly manifest: ModuleManifest = Object.freeze({
    id: 'timeline', displayName: 'Timeline', version: '1.0.0',
    dependsOn: ['npcs', 'quests', 'sessions'], required: false,
    description: 'Campaign chronology and event timeline',
  });
  protected createRepository(db: IDatabaseManager): TimelineRepository {
    return new TimelineRepository(db, this.log.child('repo'));
  }
  protected createService(repo: TimelineRepository): TimelineService {
    return new TimelineService(repo, this.log.child('service'), this._emit.bind(this));
  }
  protected async onInit(ctx: ModuleContext): Promise<void> {
    ctx.registerSchema(TIMELINE_SCHEMA);
    // Auto-log an event when a quest is completed
    ctx.subscribe('quest:completed', ({ questId }) => {
      try {
        this.service.create({ name: `Quest completed`, description: `Quest ${questId} was completed.`,
          eventType: 'quest', significance: 'minor', questId, isPlayerFacing: true });
      } catch { /* non-critical */ }
    });
    this.log.info('Timeline module ready');
  }
  getService(): TimelineService { return this.service; }
}
