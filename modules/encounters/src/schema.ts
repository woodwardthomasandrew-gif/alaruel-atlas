import type { SchemaRegistration } from '../../../core/database/src/types';

export const ENCOUNTERS_SCHEMA: SchemaRegistration = {
  module: 'encounters',
  migrations: [
    {
      version: 32,
      module: 'encounters',
      description:
        'Create encounters, encounter_monsters, encounter_minis, encounter_npc_allies tables',
      up: `
        CREATE TABLE IF NOT EXISTS encounters (
          id                 TEXT    PRIMARY KEY,
          campaign_id        TEXT    NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
          name               TEXT    NOT NULL,
          description        TEXT    NOT NULL DEFAULT '',
          encounter_type     TEXT    NOT NULL DEFAULT 'combat'
                                  CHECK (encounter_type IN (
                                    'combat','social','exploration','skill_challenge',
                                    'boss','airship'
                                  )),
          status             TEXT    NOT NULL DEFAULT 'planned'
                                  CHECK (status IN ('planned','ready','run','archived')),
          session_number     INTEGER,
          session_id         TEXT    REFERENCES sessions(id) ON DELETE SET NULL,
          dungeon_room_id    TEXT,
          location           TEXT    NOT NULL DEFAULT '',
          difficulty         TEXT    NOT NULL DEFAULT 'moderate'
                                  CHECK (difficulty IN ('trivial','easy','moderate','hard','deadly')),
          tags               TEXT    NOT NULL DEFAULT '[]',
          notes              TEXT    NOT NULL DEFAULT '',

          -- Party information
          party_id           TEXT,
          party_level        INTEGER,
          airship_present    INTEGER NOT NULL DEFAULT 0,
          party_notes        TEXT    NOT NULL DEFAULT '',

          -- Map information
          battle_map_asset_id TEXT,
          map_notes          TEXT    NOT NULL DEFAULT '',
          terrain_notes      TEXT    NOT NULL DEFAULT '',

          -- Combat information (stored as JSON blobs, structure owned by shared types)
          initiative_presets  TEXT   NOT NULL DEFAULT '[]',
          environmental_effects TEXT NOT NULL DEFAULT '[]',
          legendary_actions   TEXT   NOT NULL DEFAULT '[]',
          lair_actions        TEXT   NOT NULL DEFAULT '[]',
          conditions          TEXT   NOT NULL DEFAULT '[]',

          -- Rewards
          loot               TEXT    NOT NULL DEFAULT '',
          xp_award           INTEGER,
          story_rewards      TEXT    NOT NULL DEFAULT '',
          reputation_rewards TEXT    NOT NULL DEFAULT '',
          reward_notes       TEXT    NOT NULL DEFAULT '',

          created_at         TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
          updated_at         TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
        );
        CREATE INDEX IF NOT EXISTS idx_encounters_campaign ON encounters (campaign_id);
        CREATE INDEX IF NOT EXISTS idx_encounters_session  ON encounters (session_id);
        CREATE INDEX IF NOT EXISTS idx_encounters_dungeon_room ON encounters (dungeon_room_id);
        CREATE INDEX IF NOT EXISTS idx_encounters_status   ON encounters (campaign_id, status);

        CREATE TABLE IF NOT EXISTS encounter_monsters (
          id              TEXT    PRIMARY KEY,
          encounter_id    TEXT    NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
          monster_id      TEXT    NOT NULL,
          custom_name     TEXT,
          quantity        INTEGER NOT NULL DEFAULT 1,
          group_label     TEXT,
          is_encounter_copy INTEGER NOT NULL DEFAULT 0,
          stat_overrides  TEXT,
          sort_order      INTEGER NOT NULL DEFAULT 0,
          notes           TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_encounter_monsters_encounter ON encounter_monsters (encounter_id);
        CREATE INDEX IF NOT EXISTS idx_encounter_monsters_monster   ON encounter_monsters (monster_id);

        CREATE TABLE IF NOT EXISTS encounter_minis (
          id                  TEXT    PRIMARY KEY,
          encounter_id        TEXT    NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
          encounter_monster_id TEXT   REFERENCES encounter_monsters(id) ON DELETE CASCADE,
          mini_id             TEXT,
          quantity            INTEGER NOT NULL DEFAULT 1,
          assignment          TEXT    NOT NULL DEFAULT 'unassigned'
                                  CHECK (assignment IN ('exact','proxy','missing','unassigned')),
          proxy_notes         TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_encounter_minis_encounter ON encounter_minis (encounter_id);
        CREATE INDEX IF NOT EXISTS idx_encounter_minis_monster   ON encounter_minis (encounter_monster_id);

        CREATE TABLE IF NOT EXISTS encounter_npc_allies (
          encounter_id TEXT NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
          npc_id       TEXT NOT NULL REFERENCES npcs(id)       ON DELETE CASCADE,
          PRIMARY KEY (encounter_id, npc_id)
        );
        CREATE INDEX IF NOT EXISTS idx_encounter_npc_allies_npc ON encounter_npc_allies (npc_id);

        CREATE TRIGGER IF NOT EXISTS trg_encounters_updated_at
        AFTER UPDATE ON encounters FOR EACH ROW
        BEGIN
          UPDATE encounters SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = NEW.id;
        END;
      `,
      down: `
        DROP TRIGGER IF EXISTS trg_encounters_updated_at;
        DROP TABLE IF EXISTS encounter_npc_allies;
        DROP TABLE IF EXISTS encounter_minis;
        DROP TABLE IF EXISTS encounter_monsters;
        DROP TABLE IF EXISTS encounters;
      `,
    },
    {
      version: 33,
      module: 'encounters',
      description:
        'Repair encounters.party_id — remove invalid REFERENCES parties(id) ' +
        '(the Party module has no such table, which made every INSERT fail ' +
        'with "no such table: main.parties" once foreign_keys enforcement is on)',
      up: `
        PRAGMA foreign_keys = OFF;

        CREATE TABLE encounters_v33 (
          id                 TEXT    PRIMARY KEY,
          campaign_id        TEXT    NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
          name               TEXT    NOT NULL,
          description        TEXT    NOT NULL DEFAULT '',
          encounter_type     TEXT    NOT NULL DEFAULT 'combat'
                                  CHECK (encounter_type IN (
                                    'combat','social','exploration','skill_challenge',
                                    'boss','airship'
                                  )),
          status             TEXT    NOT NULL DEFAULT 'planned'
                                  CHECK (status IN ('planned','ready','run','archived')),
          session_number     INTEGER,
          session_id         TEXT    REFERENCES sessions(id) ON DELETE SET NULL,
          dungeon_room_id    TEXT,
          location           TEXT    NOT NULL DEFAULT '',
          difficulty         TEXT    NOT NULL DEFAULT 'moderate'
                                  CHECK (difficulty IN ('trivial','easy','moderate','hard','deadly')),
          tags               TEXT    NOT NULL DEFAULT '[]',
          notes              TEXT    NOT NULL DEFAULT '',

          party_id           TEXT,
          party_level        INTEGER,
          airship_present    INTEGER NOT NULL DEFAULT 0,
          party_notes        TEXT    NOT NULL DEFAULT '',

          battle_map_asset_id TEXT,
          map_notes          TEXT    NOT NULL DEFAULT '',
          terrain_notes      TEXT    NOT NULL DEFAULT '',

          initiative_presets  TEXT   NOT NULL DEFAULT '[]',
          environmental_effects TEXT NOT NULL DEFAULT '[]',
          legendary_actions   TEXT   NOT NULL DEFAULT '[]',
          lair_actions        TEXT   NOT NULL DEFAULT '[]',
          conditions          TEXT   NOT NULL DEFAULT '[]',

          loot               TEXT    NOT NULL DEFAULT '',
          xp_award           INTEGER,
          story_rewards      TEXT    NOT NULL DEFAULT '',
          reputation_rewards TEXT    NOT NULL DEFAULT '',
          reward_notes       TEXT    NOT NULL DEFAULT '',

          created_at         TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
          updated_at         TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
        );

        INSERT INTO encounters_v33 SELECT
          id, campaign_id, name, description, encounter_type, status, session_number,
          session_id, dungeon_room_id, location, difficulty, tags, notes,
          party_id, party_level, airship_present, party_notes,
          battle_map_asset_id, map_notes, terrain_notes,
          initiative_presets, environmental_effects, legendary_actions, lair_actions, conditions,
          loot, xp_award, story_rewards, reputation_rewards, reward_notes,
          created_at, updated_at
        FROM encounters;

        DROP TRIGGER IF EXISTS trg_encounters_updated_at;
        DROP TABLE encounters;
        ALTER TABLE encounters_v33 RENAME TO encounters;

        CREATE INDEX IF NOT EXISTS idx_encounters_campaign ON encounters (campaign_id);
        CREATE INDEX IF NOT EXISTS idx_encounters_session  ON encounters (session_id);
        CREATE INDEX IF NOT EXISTS idx_encounters_dungeon_room ON encounters (dungeon_room_id);
        CREATE INDEX IF NOT EXISTS idx_encounters_status   ON encounters (campaign_id, status);

        CREATE TRIGGER IF NOT EXISTS trg_encounters_updated_at
        AFTER UPDATE ON encounters FOR EACH ROW
        BEGIN
          UPDATE encounters SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = NEW.id;
        END;

        PRAGMA foreign_keys = ON;
      `,
      down: `
        -- Irreversible: the point of this migration is to drop the invalid
        -- parties FK. Re-adding it would reintroduce the bug it fixes.
      `,
    },
    {
      version: 34,
      module: 'encounters',
      description:
        'Phase 3: encounter_items table for reward item cards, plus ' +
        'party_size and terrain_modifiers columns on encounters for the ' +
        'CR/terrain difficulty estimator',
      up: `
        ALTER TABLE encounters ADD COLUMN party_size INTEGER;
        ALTER TABLE encounters ADD COLUMN terrain_modifiers TEXT NOT NULL DEFAULT '[]';

        CREATE TABLE IF NOT EXISTS encounter_items (
          id              TEXT    PRIMARY KEY,
          encounter_id    TEXT    NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
          item_id         TEXT    NOT NULL,
          custom_name     TEXT,
          quantity        INTEGER NOT NULL DEFAULT 1,
          notes           TEXT,
          sort_order      INTEGER NOT NULL DEFAULT 0
        );
        CREATE INDEX IF NOT EXISTS idx_encounter_items_encounter ON encounter_items (encounter_id);
        CREATE INDEX IF NOT EXISTS idx_encounter_items_item      ON encounter_items (item_id);
      `,
      down: `
        DROP INDEX IF EXISTS idx_encounter_items_item;
        DROP INDEX IF EXISTS idx_encounter_items_encounter;
        DROP TABLE IF EXISTS encounter_items;

        -- SQLite can't drop columns pre-3.35 without a table rebuild; since
        -- these are additive nullable/defaulted columns, leaving them in
        -- place on downgrade is harmless and avoids a risky rebuild here.
      `,
    },
  ],
};
