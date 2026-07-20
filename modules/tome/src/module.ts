import { BaseModule } from '../../_framework/src/index';
import type { ModuleContext, ModuleManifest } from '../../_framework/src/index';
import type { IDatabaseManager } from '../../../core/database/src/types';
import { TomeRepository } from './repository';
import { TomeService } from './service';
import { TOME_SCHEMA } from './schema';

export class TomeModule extends BaseModule<TomeRepository, TomeService> {
  readonly manifest: ModuleManifest = Object.freeze({
    id: 'tome',
    displayName: 'The Tome',
    version: '1.0.0',
    dependsOn: [],
    required: false,
    description: 'Campaign reference notebook for lore, rules, plans, and handouts',
  });

  protected createRepository(db: IDatabaseManager): TomeRepository {
    return new TomeRepository(db, this.log.child('repo'));
  }

  protected createService(repo: TomeRepository): TomeService {
    return new TomeService(repo, this.log.child('service'), this._emit.bind(this));
  }

  protected async onInit(ctx: ModuleContext): Promise<void> {
    ctx.registerSchema(TOME_SCHEMA);
    this.log.info('Tome module ready');
  }

  getService(): TomeService {
    return this.service;
  }
}
