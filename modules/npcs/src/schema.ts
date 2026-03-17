// modules/npcs/src/schema.ts
// Database schema registration for the npcs module.

import type { SchemaRegistration } from '../../../core/database/src/types';

export const NPCS_SCHEMA: SchemaRegistration = {
  module: 'npcs',
  migrations: [
    {
      version:     2,
      module:      'npcs',
      description: 'Create npcs, npc_notes, and npc_factions tables',
      up: `
        CREATE TABLE IF NOT EXISTS npcs (
          id                          TEXT    PRIMARY KEY,
          campaign_id                 TEXT    NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
          name                        TEXT    NOT NULL,
          alias                       TEXT,
          description                 TEXT    NOT NULL DEFAULT '',
          role                        TEXT    NOT NULL DEFAULT 'neutral'
                                          CHECK (role IN ('ally','antagonist','neutral','informant','questgiver','merchant','recurring','minor')),
          vital_status                TEXT    NOT NULL DEFAULT 'alive'
                                          CHECK (vital_status IN ('alive','dead','missing','unknown')),
          disposition_towards_players TEXT    NOT NULL DEFAULT 'neutral'
                                          CHECK (disposition_towards_players IN ('hostile','unfriendly','neutral','friendly','allied')),
          current_location_id         TEXT,
          primary_faction_id          TEXT,
          portrait_asset_id           TEXT,
          tags                        TEXT    NOT NULL DEFAULT '[]',
          created_at                  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
          updated_at                  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
        );

        CREATE INDEX IF NOT EXISTS idx_npcs_campaign ON npcs (campaign_id);

        CREATE TABLE IF NOT EXISTS npc_notes (
          id            TEXT    PRIMARY KEY,
          npc_id        TEXT    NOT NULL REFERENCES npcs(id) ON DELETE CASCADE,
          campaign_id   TEXT    NOT NULL,
          content       TEXT    NOT NULL DEFAULT '',
          campaign_date TEXT,
          created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
        );

        CREATE INDEX IF NOT EXISTS idx_npc_notes_npc ON npc_notes (npc_id);

        CREATE TRIGGER IF NOT EXISTS trg_npcs_updated_at
        AFTER UPDATE ON npcs FOR EACH ROW
        BEGIN
          UPDATE npcs SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = NEW.id;
        END;
      `,
      down: `
        DROP TRIGGER IF EXISTS trg_npcs_updated_at;
        DROP TABLE IF EXISTS npc_notes;
        DROP TABLE IF EXISTS npcs;
      `,
    },
  ],
};
