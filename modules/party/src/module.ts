import { BaseModule } from '../../_framework/src/index';
import type { EmitFn, ModuleContext, ModuleManifest } from '../../_framework/src/index';
import { BaseRepository } from '../../_framework/src/repository';
import { BaseService } from '../../_framework/src/service';
import type { IDatabaseManager } from '../../../core/database/src/types';
import type { Logger } from '../../../core/logger/src/types';
import { PARTY_SCHEMA } from './schema';

class PartyRepository extends BaseRepository {
  constructor(db: IDatabaseManager, log: Logger) {
    super('party', db, log);
  }
}

class PartyService extends BaseService<PartyRepository> {
  constructor(repo: PartyRepository, log: Logger, emit: EmitFn) {
    super('party', repo, log, emit);
  }
}

export class PartyModule extends BaseModule<PartyRepository, PartyService> {
  readonly manifest: ModuleManifest = Object.freeze({
    id: 'party',
    displayName: 'Party',
    version: '1.0.0',
    dependsOn: [],
    required: false,
    description: 'Party roster, gear, airship, and companion tracking',
  });

  protected createRepository(db: IDatabaseManager): PartyRepository {
    return new PartyRepository(db, this.log.child('repo'));
  }

  protected createService(repo: PartyRepository): PartyService {
    return new PartyService(repo, this.log.child('service'), this._emit.bind(this));
  }

  protected async onInit(ctx: ModuleContext): Promise<void> {
    ctx.registerSchema(PARTY_SCHEMA);
    this.log.info('Party module ready');
  }

  getService(): PartyService {
    return this.service;
  }
}
