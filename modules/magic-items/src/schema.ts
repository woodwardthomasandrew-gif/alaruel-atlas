// modules/magic-items/src/schema.ts
// Database schema registration for the magic items module.

import type { SchemaRegistration } from '../../../core/database/src/types';

export const MAGIC_ITEMS_SCHEMA: SchemaRegistration = {
  module: 'magic-items',
  migrations: [
    {
      version:     29,
      module:      'magic-items',
      description: 'Create magic_items table for the magic items module',
      up: `
        CREATE TABLE IF NOT EXISTS magic_items (
          id                   TEXT    PRIMARY KEY,
          campaign_id          TEXT    NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
          name                 TEXT    NOT NULL,
          item_type            TEXT    NOT NULL DEFAULT 'wondrous item',
          rarity               TEXT    NOT NULL DEFAULT 'common'
                                     CHECK (rarity IN ('common','uncommon','rare','very rare','legendary','artifact','varies')),
          requires_attunement  INTEGER NOT NULL DEFAULT 0,
          attunement_text      TEXT,
          description          TEXT    NOT NULL DEFAULT '',
          source               TEXT,
          value_gp             INTEGER,
          weight_lb            REAL,
          charges              INTEGER,
          recharge             TEXT,
          lore                 TEXT,
          image_asset_id       TEXT,
          tags                 TEXT    NOT NULL DEFAULT '[]',
          created_at           TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
          updated_at           TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
        );

        CREATE INDEX IF NOT EXISTS idx_magic_items_campaign ON magic_items (campaign_id);
        CREATE INDEX IF NOT EXISTS idx_magic_items_rarity   ON magic_items (campaign_id, rarity);
        CREATE INDEX IF NOT EXISTS idx_magic_items_type     ON magic_items (campaign_id, item_type);
        CREATE INDEX IF NOT EXISTS idx_magic_items_name     ON magic_items (campaign_id, name);

        CREATE TRIGGER IF NOT EXISTS trg_magic_items_updated_at
        AFTER UPDATE ON magic_items FOR EACH ROW
        BEGIN
          UPDATE magic_items SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = NEW.id;
        END;
      `,
      down: `
        DROP TRIGGER IF EXISTS trg_magic_items_updated_at;
        DROP INDEX  IF EXISTS idx_magic_items_name;
        DROP INDEX  IF EXISTS idx_magic_items_type;
        DROP INDEX  IF EXISTS idx_magic_items_rarity;
        DROP INDEX  IF EXISTS idx_magic_items_campaign;
        DROP TABLE  IF EXISTS magic_items;
      `,
    },
    {
      version:     30,
      module:      'magic-items',
      description: 'Add structured item_data fields to magic_items',
      up: `
        ALTER TABLE magic_items ADD COLUMN item_data TEXT NOT NULL DEFAULT '{}';
        UPDATE magic_items SET item_data = '{}' WHERE item_data IS NULL OR trim(item_data) = '';
      `,
      down: `
        -- Intentionally left blank; SQLite cannot drop columns without table rebuilds.
      `,
    },
  ],
};
