import type { SchemaRegistration } from '../../../core/database/src/types';

export const FACTIONS_SCHEMA: SchemaRegistration = {
  module: 'factions',
  migrations: [
    {
      version: 26,
      module: 'factions',
      description: 'Create factions manager tables',
      up: `
        CREATE TABLE IF NOT EXISTS factions (
          id                     TEXT    PRIMARY KEY,
          campaign_id            TEXT    NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
          name                   TEXT    NOT NULL,
          description            TEXT    NOT NULL DEFAULT '',
          strength               INTEGER NOT NULL DEFAULT 0,
          notes                  TEXT    NOT NULL DEFAULT '',
          leader_npc_id          TEXT    REFERENCES npcs(id) ON DELETE SET NULL,
          tags                   TEXT    NOT NULL DEFAULT '[]',
          created_at             TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
          updated_at             TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
        );
        CREATE INDEX IF NOT EXISTS idx_factions_campaign ON factions (campaign_id);
        CREATE INDEX IF NOT EXISTS idx_factions_leader   ON factions (leader_npc_id);

        CREATE TABLE IF NOT EXISTS faction_org_nodes (
          id         TEXT    PRIMARY KEY,
          faction_id TEXT    NOT NULL REFERENCES factions(id) ON DELETE CASCADE,
          campaign_id TEXT   NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
          name       TEXT    NOT NULL,
          role       TEXT    NOT NULL,
          npc_id     TEXT    REFERENCES npcs(id) ON DELETE SET NULL,
          parent_id  TEXT,
          notes      TEXT,
          sort_order INTEGER NOT NULL DEFAULT 0
        );
        CREATE INDEX IF NOT EXISTS idx_faction_org_nodes_faction ON faction_org_nodes (faction_id, sort_order);
        CREATE INDEX IF NOT EXISTS idx_faction_org_nodes_npc     ON faction_org_nodes (npc_id);

        CREATE TABLE IF NOT EXISTS faction_members (
          faction_id TEXT NOT NULL REFERENCES factions(id) ON DELETE CASCADE,
          npc_id     TEXT NOT NULL REFERENCES npcs(id) ON DELETE CASCADE,
          PRIMARY KEY (faction_id, npc_id)
        );
        CREATE INDEX IF NOT EXISTS idx_faction_members_npc ON faction_members (npc_id);

        CREATE TABLE IF NOT EXISTS faction_relations (
          faction_id         TEXT NOT NULL REFERENCES factions(id) ON DELETE CASCADE,
          target_faction_id  TEXT NOT NULL REFERENCES factions(id) ON DELETE CASCADE,
          relation_type      TEXT NOT NULL CHECK (relation_type IN ('allied','hostile','neutral','vassal','trade')),
          strength           INTEGER,
          notes              TEXT,
          PRIMARY KEY (faction_id, target_faction_id)
        );
        CREATE INDEX IF NOT EXISTS idx_faction_relations_target ON faction_relations (target_faction_id);

        CREATE TABLE IF NOT EXISTS faction_territory (
          faction_id   TEXT NOT NULL REFERENCES factions(id) ON DELETE CASCADE,
          location_id  TEXT NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
          influence    INTEGER NOT NULL DEFAULT 0 CHECK (influence >= 0 AND influence <= 100),
          PRIMARY KEY (faction_id, location_id)
        );
        CREATE INDEX IF NOT EXISTS idx_faction_territory_location ON faction_territory (location_id);

        CREATE TABLE IF NOT EXISTS faction_reputation (
          faction_id TEXT NOT NULL REFERENCES factions(id) ON DELETE CASCADE,
          group_key  TEXT NOT NULL,
          score      INTEGER NOT NULL DEFAULT 0,
          PRIMARY KEY (faction_id, group_key)
        );

        CREATE TABLE IF NOT EXISTS faction_resources (
          faction_id    TEXT NOT NULL REFERENCES factions(id) ON DELETE CASCADE,
          resource_key  TEXT NOT NULL,
          amount        REAL NOT NULL DEFAULT 0,
          PRIMARY KEY (faction_id, resource_key)
        );

        CREATE TABLE IF NOT EXISTS session_factions (
          session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
          faction_id TEXT NOT NULL REFERENCES factions(id) ON DELETE CASCADE,
          PRIMARY KEY (session_id, faction_id)
        );
        CREATE INDEX IF NOT EXISTS idx_session_factions_faction ON session_factions (faction_id);

        CREATE TRIGGER IF NOT EXISTS trg_factions_updated_at
        AFTER UPDATE ON factions FOR EACH ROW
        BEGIN
          UPDATE factions SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = NEW.id;
        END;
      `,
      down: `
        DROP TRIGGER IF EXISTS trg_factions_updated_at;
        DROP TABLE IF EXISTS session_factions;
        DROP TABLE IF EXISTS faction_resources;
        DROP TABLE IF EXISTS faction_reputation;
        DROP TABLE IF EXISTS faction_territory;
        DROP TABLE IF EXISTS faction_relations;
        DROP TABLE IF EXISTS faction_members;
        DROP TABLE IF EXISTS faction_org_nodes;
        DROP TABLE IF EXISTS factions;
      `,
    },
  ],
};
