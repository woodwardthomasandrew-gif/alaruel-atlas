// modules/mini-catalogue/src/schema.ts
// Database schema registration for the mini-catalogue module.

import type { SchemaRegistration } from '../../../core/database/src/types';

export const MINI_CATALOGUE_SCHEMA: SchemaRegistration = {
  module: 'mini-catalogue',
  migrations: [
    {
      version:     21,
      module:      'mini-catalogue',
      description: 'Create minis table and mini_monster join table',
      up: `
        CREATE TABLE IF NOT EXISTS minis (
          id          TEXT    PRIMARY KEY,
          campaign_id TEXT    NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
          name        TEXT    NOT NULL,
          description TEXT    NOT NULL DEFAULT '',
          base_size   TEXT    CHECK (base_size IN ('tiny','small','medium','large','huge','gargantuan')),
          quantity    INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 1),
          tags        TEXT    NOT NULL DEFAULT '[]',
          created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
          updated_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
        );

        CREATE INDEX IF NOT EXISTS idx_minis_campaign ON minis (campaign_id);
        CREATE INDEX IF NOT EXISTS idx_minis_name     ON minis (campaign_id, name);

        CREATE TRIGGER IF NOT EXISTS trg_minis_updated_at
        AFTER UPDATE ON minis FOR EACH ROW
        BEGIN
          UPDATE minis SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = NEW.id;
        END;

        CREATE TABLE IF NOT EXISTS mini_monsters (
          mini_id    TEXT NOT NULL REFERENCES minis(id)    ON DELETE CASCADE,
          monster_id TEXT NOT NULL REFERENCES monsters(id) ON DELETE CASCADE,
          PRIMARY KEY (mini_id, monster_id)
        );

        CREATE INDEX IF NOT EXISTS idx_mini_monsters_mini    ON mini_monsters (mini_id);
        CREATE INDEX IF NOT EXISTS idx_mini_monsters_monster ON mini_monsters (monster_id);
      `,
      down: `
        DROP INDEX  IF EXISTS idx_mini_monsters_monster;
        DROP INDEX  IF EXISTS idx_mini_monsters_mini;
        DROP TABLE  IF EXISTS mini_monsters;
        DROP TRIGGER IF EXISTS trg_minis_updated_at;
        DROP INDEX  IF EXISTS idx_minis_name;
        DROP INDEX  IF EXISTS idx_minis_campaign;
        DROP TABLE  IF EXISTS minis;
      `,
    },
    {
      version:     22,
      module:      'mini-catalogue',
      description: 'Add quantity column to minis table',
      up: `
        ALTER TABLE minis ADD COLUMN quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 1);
      `,
      down: `
        -- SQLite does not support DROP COLUMN on older versions; leave as-is on rollback
      `,
    },
  ],
};
