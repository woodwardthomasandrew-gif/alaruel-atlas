export type AssetCategory = 'maps'|'portraits'|'audio'|'documents'|'misc';
export interface AssetRow {
  id: string; campaign_id: string; name: string; category: AssetCategory;
  mime_type: string; hash: string; size_bytes: number;
  virtual_path: string; disk_path: string;
  width_px: number|null; height_px: number|null; duration_sec: number|null;
  tags: string; created_at: string; updated_at: string;
}
