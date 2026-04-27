import { BaseModule } from '../../_framework/src/index';
import type { ModuleManifest, ModuleContext } from '../../_framework/src/index';
import type { IDatabaseManager } from '../../../core/database/src/types';
import { FactionsRepository } from './repository';
import { FactionsService } from './service';
import { FACTIONS_SCHEMA } from './schema';

export class FactionsModule extends BaseModule<FactionsRepository, FactionsService> {
  readonly manifest: ModuleManifest = Object.freeze({
    id: 'factions',
    displayName: 'Factions',
    version: '1.0.0',
    dependsOn: [],
    required: false,
    description: 'Manual-first faction manager',
  });

  protected createRepository(db: IDatabaseManager): FactionsRepository {
    return new FactionsRepository(db, this.log.child('repo'));
  }

  protected createService(repository: FactionsRepository): FactionsService {
    return new FactionsService(repository, this.log.child('service'), this._emit.bind(this));
  }

  protected async onInit(ctx: ModuleContext): Promise<void> {
    ctx.registerSchema(FACTIONS_SCHEMA);

    ctx.subscribe('npc:updated', ({ npcId }) => {
      this.service.handleNpcUpdated(npcId);
    });
    ctx.subscribe('location:deleted', ({ locationId }) => {
      this.service.handleLocationDeleted(locationId);
    });
    ctx.subscribe('quest:updated', () => {
      this.service.handleQuestUpdated();
    });

    this.log.info('Factions module ready');
  }

  getService(): FactionsService {
    return this.service;
  }
}
