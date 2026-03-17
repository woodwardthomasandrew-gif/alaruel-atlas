import type { SchemaRegistration } from '../../../core/database/src/types';
export const ASSETS_UI_SCHEMA: SchemaRegistration = {
  module: 'assets-ui',
  migrations: [{
    version: 8, module: 'assets-ui',
    description: 'Create assets and asset_links tables',
    up: `
      CREATE TABLE IF NOT EXISTS assets (
        id           TEXT     PRIMARY KEY,
        campaign_id  TEXT     NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
        name         TEXT     NOT NULL,
        category     TEXT     NOT NULL DEFAULT 'misc'
                         CHECK (category IN ('maps','portraits','audio','documents','misc')),
        mime_type    TEXT     NOT NULL,
        hash         TEXT     NOT NULL,
        size_bytes   INTEGER  NOT NULL DEFAULT 0,
        virtual_path TEXT     NOT NULL,
        disk_path    TEXT     NOT NULL,
        width_px     INTEGER,
        height_px    INTEGER,
        duration_sec REAL,
        tags         TEXT     NOT NULL DEFAULT '[]',
        created_at   TEXT     NOT NULL DEFAULT (strftime(\'%Y-%m-%dT%H:%M:%fZ\','now')),
        updated_at   TEXT     NOT NULL DEFAULT (strftime(\'%Y-%m-%dT%H:%M:%fZ\','now')),
        UNIQUE (campaign_id, hash)
      );
      CREATE INDEX IF NOT EXISTS idx_assets_campaign  ON assets (campaign_id);
      CREATE INDEX IF NOT EXISTS idx_assets_category  ON assets (campaign_id, category);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_assets_virtual_path ON assets (virtual_path);

      CREATE TABLE IF NOT EXISTS asset_links (
        asset_id      TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
        entity_module TEXT NOT NULL,
        entity_id     TEXT NOT NULL,
        role          TEXT NOT NULL DEFAULT 'attachment',
        PRIMARY KEY (asset_id, entity_module, entity_id, role)
      );
      CREATE INDEX IF NOT EXISTS idx_asset_links_entity ON asset_links (entity_module, entity_id);
    `,
    down: `DROP TABLE IF EXISTS asset_links; DROP TABLE IF EXISTS assets;`,
  }],
};
