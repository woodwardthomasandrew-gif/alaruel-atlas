import { BaseModule } from '../../_framework/src/index';
import type { ModuleManifest, ModuleContext } from '../../_framework/src/index';
import type { IDatabaseManager } from '../../../core/database/src/types';
import { GraphRepository } from './repository';
import { GraphService }    from './service';
import { GRAPH_SCHEMA }    from './schema';

export class GraphModule extends BaseModule<GraphRepository, GraphService> {
  readonly manifest: ModuleManifest = Object.freeze({
    id: 'graph', displayName: 'Relations', version: '1.0.0',
    dependsOn: ['npcs', 'quests', 'sessions'], required: false,
    description: 'Narrative relationship graph',
  });
  protected createRepository(db: IDatabaseManager) { return new GraphRepository(db, this.log.child('repo')); }
  protected createService(repo: GraphRepository)   { return new GraphService(repo, this.log.child('service'), this._emit.bind(this)); }
  protected async onInit(ctx: ModuleContext): Promise<void> {
    ctx.registerSchema(GRAPH_SCHEMA);
    this.log.info('Graph module ready');
  }
  getService(): GraphService { return this.service; }
}
