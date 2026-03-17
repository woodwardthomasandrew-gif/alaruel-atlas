import type { SchemaRegistration } from '../../../core/database/src/types';

export const ATLAS_SCHEMA: SchemaRegistration = {
  module: 'atlas',
  migrations: [
    {
      version: 3,
      module: 'atlas',
      description: 'Create locations, maps, location_pins tables',
      up: `
        CREATE TABLE IF NOT EXISTS locations (
          id                     TEXT    PRIMARY KEY,
          campaign_id            TEXT    NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
          name                   TEXT    NOT NULL,
          description            TEXT    NOT NULL DEFAULT '',
          location_type          TEXT    NOT NULL DEFAULT 'other'
                                     CHECK (location_type IN ('world','continent','region','nation','city','town','village','district','building','dungeon','wilderness','landmark','other')),
          status                 TEXT    NOT NULL DEFAULT 'active'
                                     CHECK (status IN ('active','inactive','archived')),
          parent_location_id     TEXT    REFERENCES locations(id) ON DELETE SET NULL,
          controlling_faction_id TEXT,
          thumbnail_asset_id     TEXT,
          tags                   TEXT    NOT NULL DEFAULT '[]',
          created_at             TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
          updated_at             TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
        );
        CREATE INDEX IF NOT EXISTS idx_locations_campaign ON locations (campaign_id);
        CREATE INDEX IF NOT EXISTS idx_locations_parent   ON locations (parent_location_id);

        CREATE TABLE IF NOT EXISTS maps (
          id                  TEXT     PRIMARY KEY,
          campaign_id         TEXT     NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
          name                TEXT     NOT NULL,
          description         TEXT     NOT NULL DEFAULT '',
          image_asset_id      TEXT     NOT NULL,
          width_px            INTEGER  NOT NULL DEFAULT 800,
          height_px           INTEGER  NOT NULL DEFAULT 600,
          subject_location_id TEXT     REFERENCES locations(id) ON DELETE SET NULL,
          scale               TEXT,
          tags                TEXT     NOT NULL DEFAULT '[]',
          created_at          TEXT     NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
          updated_at          TEXT     NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
        );
        CREATE INDEX IF NOT EXISTS idx_maps_campaign ON maps (campaign_id);

        CREATE TABLE IF NOT EXISTS location_pins (
          id          TEXT  PRIMARY KEY,
          map_id      TEXT  NOT NULL REFERENCES maps(id)      ON DELETE CASCADE,
          location_id TEXT  NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
          pos_x       REAL  NOT NULL DEFAULT 0,
          pos_y       REAL  NOT NULL DEFAULT 0,
          label       TEXT,
          UNIQUE (map_id, location_id)
        );
        CREATE INDEX IF NOT EXISTS idx_pins_map ON location_pins (map_id);

        CREATE TRIGGER IF NOT EXISTS trg_locations_updated_at
        AFTER UPDATE ON locations FOR EACH ROW
        BEGIN
          UPDATE locations SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = NEW.id;
        END;

        CREATE TRIGGER IF NOT EXISTS trg_maps_updated_at
        AFTER UPDATE ON maps FOR EACH ROW
        BEGIN
          UPDATE maps SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = NEW.id;
        END;
      `,
      down: `
        DROP TRIGGER IF EXISTS trg_maps_updated_at;
        DROP TRIGGER IF EXISTS trg_locations_updated_at;
        DROP TABLE IF EXISTS location_pins;
        DROP TABLE IF EXISTS maps;
        DROP TABLE IF EXISTS locations;
      `,
    },
  ],
};
