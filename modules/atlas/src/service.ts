import { BaseService }         from '../../_framework/src/index';
import type { EmitFn }         from '../../_framework/src/index';
import type { Logger }         from '../../../core/logger/src/types';
import type { Location, CampaignMap } from '../../../shared/src/types/location';
import type { AtlasRepository } from './repository';
import type { CreateLocationInput, CreateMapInput, PinRow } from './types';

export class AtlasService extends BaseService<AtlasRepository> {
  constructor(repo: AtlasRepository, log: Logger, emit: EmitFn) {
    super('atlas', repo, log, emit);
  }

  listLocations(): Location[] { this.assertInitialised(); return this.repository.findAllLocations(); }
  getLocation(id: string): Location | null { this.assertInitialised(); return this.repository.findLocationById(id); }

  createLocation(input: CreateLocationInput): Location {
    this.assertInitialised();
    this.requireString(input.name, 'name');
    const loc = this.repository.createLocation({ ...input, name: input.name.trim(), id: this.generateId(), createdAt: this.now(), updatedAt: this.now() });
    this.emit('atlas:map-loaded', { mapId: loc.id });
    return loc;
  }

  updateLocation(id: string, patch: Parameters<AtlasRepository['updateLocation']>[1]): Location {
    this.assertInitialised();
    const updated = this.repository.updateLocation(id, patch, this.now());
    if (!updated) throw new Error(`Location not found: ${id}`);
    return updated;
  }

  deleteLocation(id: string): void {
    this.assertInitialised();
    if (!this.repository.deleteLocation(id)) throw new Error(`Location not found: ${id}`);
  }

  listMaps(): CampaignMap[] { this.assertInitialised(); return this.repository.findAllMaps(); }
  getMap(id: string): CampaignMap | null { this.assertInitialised(); return this.repository.findMapById(id); }

  createMap(input: CreateMapInput): CampaignMap {
    this.assertInitialised();
    this.requireString(input.name, 'name');
    return this.repository.createMap({ ...input, id: this.generateId(), createdAt: this.now(), updatedAt: this.now() });
  }

  deleteMap(id: string): void {
    this.assertInitialised();
    if (!this.repository.deleteMap(id)) throw new Error(`Map not found: ${id}`);
  }

  getPinsForMap(mapId: string): PinRow[] { this.assertInitialised(); return this.repository.findPinsForMap(mapId); }

  placePin(mapId: string, locationId: string, x: number, y: number, label?: string): void {
    this.assertInitialised();
    this.repository.upsertPin(mapId, locationId, x, y, this.generateId(), label);
  }

  removePin(mapId: string, locationId: string): void {
    this.assertInitialised();
    this.repository.deletePin(mapId, locationId);
  }
}
