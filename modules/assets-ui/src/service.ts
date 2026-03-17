import { BaseService }           from '../../_framework/src/index';
import type { EmitFn }           from '../../_framework/src/index';
import type { Logger }           from '../../../core/logger/src/types';
import type { AssetsUiRepository } from './repository';
import type { AssetRow, AssetCategory } from './types';

export class AssetsUiService extends BaseService<AssetsUiRepository> {
  constructor(repo: AssetsUiRepository, log: Logger, emit: EmitFn) { super('assets-ui', repo, log, emit); }
  list(category?: AssetCategory): AssetRow[] { this.assertInitialised(); return this.repository.findAll(category); }
  getById(id: string): AssetRow|null { this.assertInitialised(); return this.repository.findById(id); }
  counts(): Record<string,number> { this.assertInitialised(); return this.repository.countByCategory(); }
  delete(id: string): void { this.assertInitialised(); this.repository.delete(id); }
  updateTags(id: string, tags: string[]): void { this.assertInitialised(); this.repository.updateTags(id, tags); }
}
