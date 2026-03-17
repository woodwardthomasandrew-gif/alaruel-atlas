import { BaseModule } from '../../_framework/src/index';
import type { ModuleManifest, ModuleContext } from '../../_framework/src/index';
import type { IDatabaseManager } from '../../../core/database/src/types';
import { AtlasRepository } from './repository';
import { AtlasService }    from './service';
import { ATLAS_SCHEMA }    from './schema';

export class AtlasModule extends BaseModule<AtlasRepository, AtlasService> {
  readonly manifest: ModuleManifest = Object.freeze({
    id: 'atlas', displayName: 'World Atlas', version: '1.0.0',
    dependsOn: [], required: false, description: 'Interactive world maps and location management',
  });
  protected createRepository(db: IDatabaseManager) { return new AtlasRepository(db, this.log.child('repo')); }
  protected createService(repo: AtlasRepository)   { return new AtlasService(repo, this.log.child('service'), this._emit.bind(this)); }
  protected async onInit(ctx: ModuleContext): Promise<void> {
    ctx.registerSchema(ATLAS_SCHEMA);
    this.log.info('Atlas module ready');
  }
  getService(): AtlasService { return this.service; }
}
