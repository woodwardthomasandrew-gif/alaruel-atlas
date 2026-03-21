// modules/dungeon/src/module.ts
import { BaseModule }                         from '../../_framework/src/index';
import type { ModuleManifest, ModuleContext }  from '../../_framework/src/index';
import type { IDatabaseManager }               from '../../../core/database/src/types';
import { DungeonRepository }                  from './repository';
import { DungeonService }                     from './service';
import { DUNGEON_SCHEMA }                     from './schema';

export class DungeonModule extends BaseModule<DungeonRepository, DungeonService> {
  readonly manifest: ModuleManifest = Object.freeze({
    id:          'dungeon',
    displayName: 'Dungeon Generator',
    version:     '1.0.0',
    dependsOn:   [],
    required:    false,
    description: 'Procedural dungeon generation with themed rooms, traps, and encounters',
  });

  protected createRepository(db: IDatabaseManager): DungeonRepository {
    return new DungeonRepository(db, this.log.child('repo'));
  }

  protected createService(repo: DungeonRepository): DungeonService {
    return new DungeonService(repo, this.log.child('service'), this._emit.bind(this));
  }

  protected async onInit(ctx: ModuleContext): Promise<void> {
    ctx.registerSchema(DUNGEON_SCHEMA);
    this.log.info('Dungeon module ready');
  }

  getService(): DungeonService { return this.service; }
}
