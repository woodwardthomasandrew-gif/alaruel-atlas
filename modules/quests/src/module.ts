import { BaseModule }                        from '../../_framework/src/index';
import type { ModuleManifest, ModuleContext } from '../../_framework/src/index';
import type { IDatabaseManager }              from '../../../core/database/src/types';
import { QuestsRepository }                  from './repository';
import { QuestsService }                     from './service';
import { QUESTS_SCHEMA }                     from './schema';

export class QuestsModule extends BaseModule<QuestsRepository, QuestsService> {
  readonly manifest: ModuleManifest = Object.freeze({
    id: 'quests', displayName: 'Quests', version: '1.0.0',
    dependsOn: ['npcs'], required: false,
    description: 'Quest and plot tracking',
  });

  protected createRepository(db: IDatabaseManager): QuestsRepository {
    return new QuestsRepository(db, this.log.child('repo'));
  }
  protected createService(repo: QuestsRepository): QuestsService {
    return new QuestsService(repo, this.log.child('service'), this._emit.bind(this));
  }
  protected async onInit(ctx: ModuleContext): Promise<void> {
    ctx.registerSchema(QUESTS_SCHEMA);
    this.log.info('Quests module ready');
  }
  getService(): QuestsService { return this.service; }
}
