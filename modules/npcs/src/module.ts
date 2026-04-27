// modules/npcs/src/module.ts
// NPC module lifecycle owner.

import { BaseModule }                        from '../../_framework/src/index';
import type { ModuleManifest, ModuleContext } from '../../_framework/src/index';
import type { IDatabaseManager }              from '../../../core/database/src/types';
import { NpcsRepository }                    from './repository';
import { NpcsService }                       from './service';
import { NPCS_SCHEMA }                       from './schema';

export class NpcsModule extends BaseModule<NpcsRepository, NpcsService> {

  readonly manifest: ModuleManifest = Object.freeze({
    id:          'npcs',
    displayName: 'Characters',
    version:     '1.0.0',
    dependsOn:   [],
    required:    false,
    description: 'NPC lifecycle and notes',
  });

  protected createRepository(db: IDatabaseManager): NpcsRepository {
    return new NpcsRepository(db, this.log.child('repo'));
  }

  protected createService(repository: NpcsRepository): NpcsService {
    return new NpcsService(repository, this.log.child('service'), this._emit.bind(this));
  }

  protected async onInit(ctx: ModuleContext): Promise<void> {
    ctx.registerSchema(NPCS_SCHEMA);
    this.log.info('NPC module ready');
  }

  /** Expose the service for use by the IPC bridge. */
  getService(): NpcsService {
    return this.service;
  }
}
