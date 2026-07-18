import { BaseModule }                        from '../../_framework/src/index';
import type { ModuleManifest, ModuleContext } from '../../_framework/src/index';
import type { IDatabaseManager }              from '../../../core/database/src/types';
import { EncountersRepository }               from './repository';
import { EncountersService }                  from './service';
import { ENCOUNTERS_SCHEMA }                  from './schema';

export class EncountersModule extends BaseModule<EncountersRepository, EncountersService> {
  readonly manifest: ModuleManifest = Object.freeze({
    id: 'encounters', displayName: 'Encounter Workspace', version: '1.0.0',
    dependsOn: ['bestiary', 'mini-catalogue', 'party', 'npcs', 'sessions'], required: false,
    description:
      'Central hub for planning, running, and printing tabletop encounters — ' +
      'links the bestiary, mini vault, party tracker, session planner, dungeon ' +
      'generator, combat tracker, and print system.',
  });

  protected createRepository(db: IDatabaseManager): EncountersRepository {
    return new EncountersRepository(db, this.log.child('repo'));
  }

  protected createService(repo: EncountersRepository): EncountersService {
    return new EncountersService(repo, this.log.child('service'), this._emit.bind(this));
  }

  protected async onInit(ctx: ModuleContext): Promise<void> {
    ctx.registerSchema(ENCOUNTERS_SCHEMA);
    this.log.info('Encounter Workspace module ready');
  }

  getService(): EncountersService { return this.service; }
}
