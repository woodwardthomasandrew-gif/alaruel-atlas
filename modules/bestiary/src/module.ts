// modules/bestiary/src/module.ts
// Bestiary module lifecycle owner.

import { BaseModule }                         from '../../_framework/src/index';
import type { ModuleManifest, ModuleContext }  from '../../_framework/src/index';
import type { IDatabaseManager }               from '../../../core/database/src/types';
import { BestiaryRepository }                 from './repository';
import { BestiaryService }                    from './service';
import { BESTIARY_SCHEMA }                    from './schema';

export class BestiaryModule extends BaseModule<BestiaryRepository, BestiaryService> {

  readonly manifest: ModuleManifest = Object.freeze({
    id:          'bestiary',
    displayName: 'Bestiary',
    version:     '1.0.0',
    dependsOn:   [],
    required:    false,
    description: 'Monster statblock creator and bestiary manager',
  });

  protected createRepository(db: IDatabaseManager): BestiaryRepository {
    return new BestiaryRepository(db, this.log.child('repo'));
  }

  protected createService(repository: BestiaryRepository): BestiaryService {
    return new BestiaryService(repository, this.log.child('service'), this._emit.bind(this));
  }

  protected async onInit(ctx: ModuleContext): Promise<void> {
    ctx.registerSchema(BESTIARY_SCHEMA);
    this.log.info('Bestiary module ready');
  }

  /** Expose the service for use by the IPC bridge. */
  getService(): BestiaryService {
    return this.service;
  }
}
