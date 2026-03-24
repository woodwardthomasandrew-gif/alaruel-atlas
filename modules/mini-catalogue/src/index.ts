// modules/mini-catalogue/src/index.ts — public API barrel

export { MiniCatalogueModule }  from './module';
export { MiniCatalogueService } from './service';
export type {
  CreateMiniInput,
  UpdateMiniInput,
  MiniListQuery,
} from './types';
