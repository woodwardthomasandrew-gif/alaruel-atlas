import type { LocationType } from '../../../shared/src/types/location';

export interface LocationRow {
  id: string; campaign_id: string; name: string; description: string;
  location_type: LocationType; status: string;
  parent_location_id: string|null; controlling_faction_id: string|null;
  thumbnail_asset_id: string|null; tags: string;
  created_at: string; updated_at: string;
}

export interface MapRow {
  id: string; campaign_id: string; name: string; description: string;
  image_asset_id: string; width_px: number; height_px: number;
  subject_location_id: string|null; scale: string|null; tags: string;
  created_at: string; updated_at: string;
}

export interface PinRow {
  id: string; map_id: string; location_id: string;
  pos_x: number; pos_y: number; label: string|null;
}

export interface CreateLocationInput {
  name: string; description?: string; locationType?: LocationType;
  parentLocationId?: string; tags?: string[];
}

export interface CreateMapInput {
  name: string; imageAssetId: string; widthPx?: number; heightPx?: number;
  subjectLocationId?: string; scale?: string;
}
