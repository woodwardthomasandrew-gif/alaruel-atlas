import { BaseModule } from '../../_framework/src/index';
import type { ModuleManifest, ModuleContext } from '../../_framework/src/index';
import type { IDatabaseManager } from '../../../core/database/src/types';
import { AssetsUiRepository } from './repository';
import { AssetsUiService }    from './service';
import { ASSETS_UI_SCHEMA }   from './schema';

export class AssetsUiModule extends BaseModule<AssetsUiRepository, AssetsUiService> {
  readonly manifest: ModuleManifest = Object.freeze({
    id: 'assets-ui', displayName: 'Assets', version: '1.0.0',
    dependsOn: [], required: false, description: 'Asset browser and import UI',
  });
  protected createRepository(db: IDatabaseManager) { return new AssetsUiRepository(db, this.log.child('repo')); }
  protected createService(repo: AssetsUiRepository) { return new AssetsUiService(repo, this.log.child('service'), this._emit.bind(this)); }
  protected async onInit(ctx: ModuleContext): Promise<void> {
    ctx.registerSchema(ASSETS_UI_SCHEMA);
    this.log.info('Assets module ready');
  }
  getService(): AssetsUiService { return this.service; }
}
