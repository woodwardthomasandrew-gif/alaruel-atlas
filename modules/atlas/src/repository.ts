import { BaseRepository }        from '../../_framework/src/index';
import type { IDatabaseManager } from '../../../core/database/src/types';
import type { Logger }           from '../../../core/logger/src/types';
import type { Location, CampaignMap } from '../../../shared/src/types/location';
import type { LocationRow, MapRow, PinRow, CreateLocationInput, CreateMapInput } from './types';

function rowToLocation(r: LocationRow): Location {
  return {
    id: r.id, name: r.name, description: r.description,
    locationType: r.location_type, status: r.status as Location['status'],
    parentLocationId: r.parent_location_id, childLocationIds: [],
    controllingFactionId: r.controlling_faction_id, presentFactionIds: [],
    thumbnailAssetId: r.thumbnail_asset_id, residentNpcIds: [],
    questIds: [], eventIds: [], sessionIds: [], mapIds: [], pins: [],
    tags: JSON.parse(r.tags) as string[],
    createdAt: r.created_at as Location['createdAt'],
    updatedAt: r.updated_at as Location['updatedAt'],
  };
}

function rowToMap(r: MapRow): CampaignMap {
  return {
    id: r.id, name: r.name, description: r.description,
    imageAssetId: r.image_asset_id, widthPx: r.width_px, heightPx: r.height_px,
    subjectLocationId: r.subject_location_id, scale: r.scale ?? undefined,
    pinnedLocationIds: [],
    tags: JSON.parse(r.tags) as string[],
    createdAt: r.created_at as CampaignMap['createdAt'],
    updatedAt: r.updated_at as CampaignMap['updatedAt'],
  };
}

export class AtlasRepository extends BaseRepository {
  constructor(db: IDatabaseManager, log: Logger) { super('atlas', db, log); }

  findAllLocations(): Location[] {
    return this.query<LocationRow>(
      'SELECT * FROM locations WHERE campaign_id = ? ORDER BY name ASC',
      [this.campaignId],
    ).map(rowToLocation);
  }

  findLocationById(id: string): Location | null {
    const r = this.queryOne<LocationRow>('SELECT * FROM locations WHERE id = ? AND campaign_id = ?', [id, this.campaignId]);
    return r ? rowToLocation(r) : null;
  }

  createLocation(input: CreateLocationInput & { id: string; createdAt: string; updatedAt: string }): Location {
    this.run(
      `INSERT INTO locations (id,campaign_id,name,description,location_type,parent_location_id,tags,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [input.id, this.campaignId, input.name, input.description ?? '',
       input.locationType ?? 'other', input.parentLocationId ?? null,
       JSON.stringify(input.tags ?? []), input.createdAt, input.updatedAt],
    );
    return this.findLocationById(input.id)!;
  }

  updateLocation(id: string, patch: Partial<{name:string;description:string;locationType:string;parentLocationId:string|null}>, updatedAt: string): Location | null {
    const sets = ['updated_at = ?'];
    const params: (string|null)[] = [updatedAt];
    if (patch.name        !== undefined) { sets.push('name = ?');          params.push(patch.name); }
    if (patch.description !== undefined) { sets.push('description = ?');   params.push(patch.description); }
    if (patch.locationType!== undefined) { sets.push('location_type = ?'); params.push(patch.locationType); }
    if (patch.parentLocationId !== undefined) { sets.push('parent_location_id = ?'); params.push(patch.parentLocationId); }
    params.push(id, this.campaignId);
    this.run(`UPDATE locations SET ${sets.join(', ')} WHERE id = ? AND campaign_id = ?`, params);
    return this.findLocationById(id);
  }

  deleteLocation(id: string): boolean {
    return this.run('DELETE FROM locations WHERE id = ? AND campaign_id = ?', [id, this.campaignId]).changes > 0;
  }

  findAllMaps(): CampaignMap[] {
    return this.query<MapRow>('SELECT * FROM maps WHERE campaign_id = ? ORDER BY name ASC', [this.campaignId]).map(rowToMap);
  }

  findMapById(id: string): CampaignMap | null {
    const r = this.queryOne<MapRow>('SELECT * FROM maps WHERE id = ? AND campaign_id = ?', [id, this.campaignId]);
    return r ? rowToMap(r) : null;
  }

  createMap(input: CreateMapInput & { id: string; createdAt: string; updatedAt: string }): CampaignMap {
    this.run(
      `INSERT INTO maps (id,campaign_id,name,description,image_asset_id,width_px,height_px,subject_location_id,scale,tags,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [input.id, this.campaignId, input.name, '', input.imageAssetId,
       input.widthPx ?? 800, input.heightPx ?? 600, input.subjectLocationId ?? null,
       input.scale ?? null, '[]', input.createdAt, input.updatedAt],
    );
    return this.findMapById(input.id)!;
  }

  deleteMap(id: string): boolean {
    return this.run('DELETE FROM maps WHERE id = ? AND campaign_id = ?', [id, this.campaignId]).changes > 0;
  }

  findPinsForMap(mapId: string): PinRow[] {
    return this.query<PinRow>('SELECT * FROM location_pins WHERE map_id = ?', [mapId]);
  }

  upsertPin(mapId: string, locationId: string, x: number, y: number, id: string, label?: string): void {
    this.run(
      `INSERT INTO location_pins (id,map_id,location_id,pos_x,pos_y,label) VALUES (?,?,?,?,?,?)
       ON CONFLICT(map_id,location_id) DO UPDATE SET pos_x=excluded.pos_x,pos_y=excluded.pos_y,label=excluded.label`,
      [id, mapId, locationId, x, y, label ?? null],
    );
  }

  deletePin(mapId: string, locationId: string): boolean {
    return this.run('DELETE FROM location_pins WHERE map_id=? AND location_id=?', [mapId, locationId]).changes > 0;
  }
}
