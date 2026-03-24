// modules/mini-catalogue/src/module.ts
// Mini Catalogue module lifecycle owner.

import { BaseModule }                         from '../../_framework/src/index';
import type { ModuleManifest, ModuleContext }  from '../../_framework/src/index';
import type { IDatabaseManager }               from '../../../core/database/src/types';
import { MiniCatalogueRepository }            from './repository';
import { MiniCatalogueService }               from './service';
import { MINI_CATALOGUE_SCHEMA }              from './schema';

export class MiniCatalogueModule extends BaseModule<MiniCatalogueRepository, MiniCatalogueService> {

  readonly manifest: ModuleManifest = Object.freeze({
    id:          'mini-catalogue',
    displayName: 'Mini Catalogue',
    version:     '1.0.0',
    dependsOn:   ['bestiary'],
    required:    false,
    description: 'Track your physical miniature collection and link them to monsters.',
  });

  protected createRepository(db: IDatabaseManager): MiniCatalogueRepository {
    return new MiniCatalogueRepository(db, this.log.child('repo'));
  }

  protected createService(repository: MiniCatalogueRepository): MiniCatalogueService {
    return new MiniCatalogueService(repository, this.log.child('service'), this._emit.bind(this));
  }

  protected async onInit(ctx: ModuleContext): Promise<void> {
    ctx.registerSchema(MINI_CATALOGUE_SCHEMA);
    this.log.info('Mini Catalogue module ready');
  }

  getService(): MiniCatalogueService {
    return this.service;
  }
}
