import { BaseModule }                        from '../../_framework/src/index';
import type { ModuleManifest, ModuleContext } from '../../_framework/src/index';
import type { IDatabaseManager }              from '../../../core/database/src/types';
import { SessionsRepository }                from './repository';
import { SessionsService }                   from './service';
import { SESSIONS_SCHEMA }                   from './schema';

export class SessionsModule extends BaseModule<SessionsRepository, SessionsService> {
  readonly manifest: ModuleManifest = Object.freeze({
    id: 'sessions', displayName: 'Sessions', version: '1.0.0',
    dependsOn: ['npcs', 'quests'], required: false,
    description: 'Session planning, notes, and recaps',
  });
  protected createRepository(db: IDatabaseManager): SessionsRepository {
    return new SessionsRepository(db, this.log.child('repo'));
  }
  protected createService(repo: SessionsRepository): SessionsService {
    return new SessionsService(repo, this.log.child('service'), this._emit.bind(this));
  }
  protected async onInit(ctx: ModuleContext): Promise<void> {
    ctx.registerSchema(SESSIONS_SCHEMA);
    this.log.info('Sessions module ready');
  }
  getService(): SessionsService { return this.service; }
}
