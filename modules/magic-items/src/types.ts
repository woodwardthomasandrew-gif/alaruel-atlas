// modules/magic-items/src/types.ts
// Internal types for the magic items module.

export type MagicItemRarity =
  | 'common'
  | 'uncommon'
  | 'rare'
  | 'very rare'
  | 'legendary'
  | 'artifact'
  | 'varies';

export type MagicItemType =
  | 'armor'
  | 'weapon'
  | 'potion'
  | 'ring'
  | 'rod'
  | 'scroll'
  | 'staff'
  | 'wand'
  | 'wondrous item'
  | 'other';

export interface MagicItemRow {
  id: string;
  campaign_id: string;
  name: string;
  item_type: string;
  rarity: MagicItemRarity;
  requires_attunement: number;
  attunement_text: string | null;
  description: string;
  item_data: string;
  source: string | null;
  value_gp: number | null;
  weight_lb: number | null;
  charges: number | null;
  recharge: string | null;
  lore: string | null;
  image_asset_id: string | null;
  tags: string;
  created_at: string;
  updated_at: string;
}

export interface MagicItem {
  id: string;
  name: string;
  itemType: MagicItemType | string;
  rarity: MagicItemRarity | string;
  requiresAttunement: boolean;
  attunementText?: string;
  description: string;
  itemData: Record<string, string | number | boolean | null | undefined>;
  source?: string;
  valueGp?: number;
  weightLb?: number;
  charges?: number;
  recharge?: string;
  lore?: string;
  imageAssetId?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateMagicItemInput {
  name: string;
  itemType?: MagicItemType | string;
  rarity?: MagicItemRarity | string;
  requiresAttunement?: boolean;
  attunementText?: string;
  description?: string;
  itemData?: Record<string, string | number | boolean | null | undefined>;
  source?: string;
  valueGp?: number;
  weightLb?: number;
  charges?: number;
  recharge?: string;
  lore?: string;
  imageAssetId?: string;
  tags?: string[];
}

export interface UpdateMagicItemInput extends Partial<CreateMagicItemInput> {
  id: string;
}

export interface MagicItemListQuery {
  search?: string;
  itemType?: string;
  rarity?: string;
  requiresAttunement?: boolean;
  limit?: number;
  offset?: number;
}
