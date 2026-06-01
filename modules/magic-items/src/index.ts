// modules/magic-items/src/index.ts - public API barrel

export { MagicItemsModule } from './module';
export { MagicItemsService } from './service';
export type {
  CreateMagicItemInput,
  UpdateMagicItemInput,
  MagicItemListQuery,
  MagicItem,
  MagicItemType,
  MagicItemRarity,
} from './types';
