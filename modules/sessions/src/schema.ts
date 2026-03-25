import type { SchemaRegistration } from '../../../core/database/src/types';

export const SESSIONS_SCHEMA: SchemaRegistration = {
  module: 'sessions',
  migrations: [
    {
      version: 5,
      module: 'sessions',
      description: 'Create sessions, session_notes, session_prep_items, session_scenes, session_quests, session_npcs tables',
      up: `
        CREATE TABLE IF NOT EXISTS sessions (
          id                  TEXT    PRIMARY KEY,
          campaign_id         TEXT    NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
          name                TEXT    NOT NULL,
          description         TEXT    NOT NULL DEFAULT '',
          session_number      INTEGER NOT NULL DEFAULT 0,
          status              TEXT    NOT NULL DEFAULT 'planned'
                                  CHECK (status IN ('planned','in_progress','completed','cancelled')),
          scheduled_at        TEXT,
          started_at          TEXT,
          ended_at            TEXT,
          duration_minutes    INTEGER,
          campaign_date_start TEXT,
          campaign_date_end   TEXT,
          rewards             TEXT,
          follow_up_hooks     TEXT,
          tags                TEXT    NOT NULL DEFAULT '[]',
          created_at          TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
          updated_at          TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
        );
        CREATE INDEX IF NOT EXISTS idx_sessions_campaign ON sessions (campaign_id);
        CREATE INDEX IF NOT EXISTS idx_sessions_number   ON sessions (campaign_id, session_number);

        CREATE TABLE IF NOT EXISTS session_notes (
          id          TEXT    PRIMARY KEY,
          session_id  TEXT    NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
          phase       TEXT    NOT NULL DEFAULT 'planning'
                          CHECK (phase IN ('planning','live','recap')),
          content     TEXT    NOT NULL DEFAULT '',
          created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
          updated_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
        );
        CREATE INDEX IF NOT EXISTS idx_session_notes_session ON session_notes (session_id);

        CREATE TABLE IF NOT EXISTS session_prep_items (
          id          TEXT    PRIMARY KEY,
          session_id  TEXT    NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
          description TEXT    NOT NULL DEFAULT '',
          done        INTEGER NOT NULL DEFAULT 0,
          sort_order  INTEGER NOT NULL DEFAULT 0
        );
        CREATE INDEX IF NOT EXISTS idx_session_prep_session ON session_prep_items (session_id);

        CREATE TABLE IF NOT EXISTS session_scenes (
          id          TEXT    PRIMARY KEY,
          session_id  TEXT    NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
          title       TEXT    NOT NULL DEFAULT '',
          content     TEXT    NOT NULL DEFAULT '',
          sort_order  INTEGER NOT NULL DEFAULT 0,
          location_id TEXT,
          played      INTEGER NOT NULL DEFAULT 0
        );
        CREATE INDEX IF NOT EXISTS idx_session_scenes_session ON session_scenes (session_id);

        CREATE TABLE IF NOT EXISTS session_quests (
          session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
          quest_id   TEXT NOT NULL REFERENCES quests(id)   ON DELETE CASCADE,
          outcome    TEXT NOT NULL DEFAULT 'advanced'
                       CHECK (outcome IN ('advanced','completed')),
          PRIMARY KEY (session_id, quest_id)
        );
        CREATE INDEX IF NOT EXISTS idx_session_quests_quest ON session_quests (quest_id);

        CREATE TABLE IF NOT EXISTS session_npcs (
          session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
          npc_id     TEXT NOT NULL REFERENCES npcs(id)     ON DELETE CASCADE,
          PRIMARY KEY (session_id, npc_id)
        );
        CREATE INDEX IF NOT EXISTS idx_session_npcs_npc ON session_npcs (npc_id);

        CREATE TRIGGER IF NOT EXISTS trg_sessions_updated_at
        AFTER UPDATE ON sessions FOR EACH ROW
        BEGIN
          UPDATE sessions SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = NEW.id;
        END;
      `,
      down: `
        DROP TRIGGER IF EXISTS trg_sessions_updated_at;
        DROP TABLE IF EXISTS session_npcs;
        DROP TABLE IF EXISTS session_quests;
        DROP TABLE IF EXISTS session_scenes;
        DROP TABLE IF EXISTS session_prep_items;
        DROP TABLE IF EXISTS session_notes;
        DROP TABLE IF EXISTS sessions;
      `,
    },
    {
      // IMPORTANT: This was previously version 6, which collided with the
      // timeline module's version 6 migration. Renumbered to 23 to ensure
      // this migration always runs. The migration runner skips any version
      // already recorded in _migrations, so existing DBs that already have
      // these tables (via a partial previous run or manual creation) will
      // handle this safely via CREATE TABLE IF NOT EXISTS.
      version: 23,
      module: 'sessions',
      description: 'Add per-scene encounter tables: session_scene_npcs, session_scene_monsters, session_scene_minis',
      up: `
        CREATE TABLE IF NOT EXISTS session_scene_npcs (
          scene_id   TEXT NOT NULL REFERENCES session_scenes(id) ON DELETE CASCADE,
          npc_id     TEXT NOT NULL REFERENCES npcs(id)           ON DELETE CASCADE,
          PRIMARY KEY (scene_id, npc_id)
        );
        CREATE INDEX IF NOT EXISTS idx_scene_npcs_scene   ON session_scene_npcs (scene_id);
        CREATE INDEX IF NOT EXISTS idx_scene_npcs_npc     ON session_scene_npcs (npc_id);

        CREATE TABLE IF NOT EXISTS session_scene_monsters (
          scene_id   TEXT    NOT NULL REFERENCES session_scenes(id) ON DELETE CASCADE,
          monster_id TEXT    NOT NULL,
          count      INTEGER NOT NULL DEFAULT 1,
          notes      TEXT,
          PRIMARY KEY (scene_id, monster_id)
        );
        CREATE INDEX IF NOT EXISTS idx_scene_monsters_scene ON session_scene_monsters (scene_id);

        CREATE TABLE IF NOT EXISTS session_scene_minis (
          scene_id TEXT    NOT NULL REFERENCES session_scenes(id) ON DELETE CASCADE,
          mini_id  TEXT    NOT NULL,
          count    INTEGER NOT NULL DEFAULT 1,
          PRIMARY KEY (scene_id, mini_id)
        );
        CREATE INDEX IF NOT EXISTS idx_scene_minis_scene ON session_scene_minis (scene_id);
      `,
      down: `
        DROP TABLE IF EXISTS session_scene_minis;
        DROP TABLE IF EXISTS session_scene_monsters;
        DROP TABLE IF EXISTS session_scene_npcs;
      `,
    },
  ],
};
