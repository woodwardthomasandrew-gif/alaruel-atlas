// modules/magic-items/src/module.ts
// Magic items module lifecycle owner.

import { BaseModule } from '../../_framework/src/index';
import type { ModuleManifest, ModuleContext } from '../../_framework/src/index';
import type { IDatabaseManager } from '../../../core/database/src/types';
import { MagicItemsRepository } from './repository';
import { MagicItemsService } from './service';
import { MAGIC_ITEMS_SCHEMA } from './schema';

export class MagicItemsModule extends BaseModule<MagicItemsRepository, MagicItemsService> {

  readonly manifest: ModuleManifest = Object.freeze({
    id:          'magic-items',
    displayName: 'Magic Items',
    version:     '1.0.0',
    dependsOn:   [],
    required:    false,
    description: 'Magic item card creator and collection manager',
  });

  protected createRepository(db: IDatabaseManager): MagicItemsRepository {
    return new MagicItemsRepository(db, this.log.child('repo'));
  }

  protected createService(repository: MagicItemsRepository): MagicItemsService {
    return new MagicItemsService(repository, this.log.child('service'), this._emit.bind(this));
  }

  protected async onInit(ctx: ModuleContext): Promise<void> {
    ctx.registerSchema(MAGIC_ITEMS_SCHEMA);
    this.log.info('Magic Items module ready');
  }

  getService(): MagicItemsService {
    return this.service;
  }
}
