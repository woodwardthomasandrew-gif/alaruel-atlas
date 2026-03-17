export type LocationType = 'world'|'continent'|'region'|'nation'|'city'|'town'|'village'|'district'|'building'|'dungeon'|'wilderness'|'landmark'|'other';
export interface Location {
  id:string; name:string; description:string; locationType:LocationType; status:string;
  parentLocationId:string|null; childLocationIds:string[];
  controllingFactionId:string|null; thumbnailAssetId:string|null;
  tags:string[]; createdAt:string; updatedAt:string;
}
export interface LocationPin { id:string; mapId:string; locationId:string; posX:number; posY:number; label:string|null; }
export interface CampaignMap {
  id:string; name:string; description:string; imageAssetId:string;
  widthPx:number; heightPx:number; subjectLocationId:string|null;
  scale:string|null; tags:string[]; createdAt:string; updatedAt:string;
}
