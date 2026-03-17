import type { SchemaRegistration } from '../../../core/database/src/types';

export const QUESTS_SCHEMA: SchemaRegistration = {
  module: 'quests',
  migrations: [
    {
      version: 4,
      module: 'quests',
      description: 'Create plot_threads, quests, quest_objectives, quest_notes, quest_npcs tables',
      up: `
        CREATE TABLE IF NOT EXISTS plot_threads (
          id          TEXT    PRIMARY KEY,
          campaign_id TEXT    NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
          name        TEXT    NOT NULL,
          description TEXT    NOT NULL DEFAULT '',
          status      TEXT    NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active','resolved','dormant','abandoned')),
          priority    INTEGER NOT NULL DEFAULT 0,
          start_date  TEXT,
          end_date    TEXT,
          tags        TEXT    NOT NULL DEFAULT '[]',
          created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
          updated_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
        );
        CREATE INDEX IF NOT EXISTS idx_plot_threads_campaign ON plot_threads (campaign_id);

        CREATE TABLE IF NOT EXISTS quests (
          id                 TEXT    PRIMARY KEY,
          campaign_id        TEXT    NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
          name               TEXT    NOT NULL,
          description        TEXT    NOT NULL DEFAULT '',
          status             TEXT    NOT NULL DEFAULT 'hidden'
                                 CHECK (status IN ('rumour','active','on_hold','completed','failed','abandoned','hidden')),
          quest_type         TEXT    NOT NULL DEFAULT 'side'
                                 CHECK (quest_type IN ('main','side','personal','faction','exploration','fetch','escort','eliminate','mystery')),
          priority           INTEGER NOT NULL DEFAULT 0,
          start_date         TEXT,
          end_date           TEXT,
          reward             TEXT,
          quest_giver_npc_id TEXT,
          sponsor_faction_id TEXT,
          plot_thread_id     TEXT REFERENCES plot_threads(id) ON DELETE SET NULL,
          tags               TEXT    NOT NULL DEFAULT '[]',
          created_at         TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
          updated_at         TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
        );
        CREATE INDEX IF NOT EXISTS idx_quests_campaign    ON quests (campaign_id);
        CREATE INDEX IF NOT EXISTS idx_quests_status      ON quests (status);
        CREATE INDEX IF NOT EXISTS idx_quests_plot_thread ON quests (plot_thread_id);

        CREATE TABLE IF NOT EXISTS quest_objectives (
          id          TEXT    PRIMARY KEY,
          quest_id    TEXT    NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
          description TEXT    NOT NULL DEFAULT '',
          completed   INTEGER NOT NULL DEFAULT 0,
          required    INTEGER NOT NULL DEFAULT 1,
          sort_order  INTEGER NOT NULL DEFAULT 0,
          deadline    TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_quest_objectives_quest ON quest_objectives (quest_id);

        CREATE TABLE IF NOT EXISTS quest_notes (
          id                 TEXT    PRIMARY KEY,
          quest_id           TEXT    NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
          content            TEXT    NOT NULL DEFAULT '',
          visible_to_players INTEGER NOT NULL DEFAULT 0,
          created_at         TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
        );
        CREATE INDEX IF NOT EXISTS idx_quest_notes_quest ON quest_notes (quest_id);

        CREATE TABLE IF NOT EXISTS quest_npcs (
          quest_id   TEXT NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
          npc_id     TEXT NOT NULL REFERENCES npcs(id)   ON DELETE CASCADE,
          role_label TEXT,
          PRIMARY KEY (quest_id, npc_id)
        );
        CREATE INDEX IF NOT EXISTS idx_quest_npcs_npc ON quest_npcs (npc_id);

        CREATE TRIGGER IF NOT EXISTS trg_quests_updated_at
        AFTER UPDATE ON quests FOR EACH ROW
        BEGIN
          UPDATE quests SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = NEW.id;
        END;

        CREATE TRIGGER IF NOT EXISTS trg_plot_threads_updated_at
        AFTER UPDATE ON plot_threads FOR EACH ROW
        BEGIN
          UPDATE plot_threads SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = NEW.id;
        END;
      `,
      down: `
        DROP TRIGGER IF EXISTS trg_plot_threads_updated_at;
        DROP TRIGGER IF EXISTS trg_quests_updated_at;
        DROP TABLE IF EXISTS quest_npcs;
        DROP TABLE IF EXISTS quest_notes;
        DROP TABLE IF EXISTS quest_objectives;
        DROP TABLE IF EXISTS quests;
        DROP TABLE IF EXISTS plot_threads;
      `,
    },
  ],
};
