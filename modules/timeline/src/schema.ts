import type { SchemaRegistration } from '../../../core/database/src/types';

export const TIMELINE_SCHEMA: SchemaRegistration = {
  module: 'timeline',
  migrations: [
    {
      version: 6,
      module: 'timeline',
      description: 'Create campaign_events and event_causality tables',
      up: `
        CREATE TABLE IF NOT EXISTS campaign_events (
          id               TEXT    PRIMARY KEY,
          campaign_id      TEXT    NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
          name             TEXT    NOT NULL,
          description      TEXT    NOT NULL DEFAULT \'\',
          event_type       TEXT    NOT NULL DEFAULT \'other\'
                               CHECK (event_type IN (\'battle\',\'political\',\'discovery\',\'death\',\'birth\',\'quest\',\'faction\',\'natural\',\'social\',\'mystery\',\'other\')),
          significance     TEXT    NOT NULL DEFAULT \'minor\'
                               CHECK (significance IN (\'trivial\',\'minor\',\'moderate\',\'major\',\'critical\')),
          campaign_date    TEXT,
          campaign_date_end TEXT,
          certainty        TEXT    NOT NULL DEFAULT \'exact\'
                               CHECK (certainty IN (\'exact\',\'approximate\',\'unknown\',\'legendary\')),
          is_player_facing INTEGER NOT NULL DEFAULT 1,
          location_id      TEXT,
          quest_id         TEXT,
          plot_thread_id   TEXT,
          session_id       TEXT,
          tags             TEXT    NOT NULL DEFAULT \'[]\'  ,
          created_at       TEXT    NOT NULL DEFAULT (strftime(\'%Y-%m-%dT%H:%M:%fZ\',\'now\')),
          updated_at       TEXT    NOT NULL DEFAULT (strftime(\'%Y-%m-%dT%H:%M:%fZ\',\'now\'))
        );
        CREATE INDEX IF NOT EXISTS idx_campaign_events_campaign ON campaign_events (campaign_id);
        CREATE INDEX IF NOT EXISTS idx_campaign_events_type     ON campaign_events (event_type);

        CREATE TABLE IF NOT EXISTS campaign_event_npcs (
          event_id   TEXT NOT NULL REFERENCES campaign_events(id) ON DELETE CASCADE,
          npc_id     TEXT NOT NULL REFERENCES npcs(id)            ON DELETE CASCADE,
          role_label TEXT,
          PRIMARY KEY (event_id, npc_id)
        );

        CREATE TABLE IF NOT EXISTS event_causality (
          cause_event_id  TEXT NOT NULL REFERENCES campaign_events(id) ON DELETE CASCADE,
          effect_event_id TEXT NOT NULL REFERENCES campaign_events(id) ON DELETE CASCADE,
          PRIMARY KEY (cause_event_id, effect_event_id),
          CHECK (cause_event_id != effect_event_id)
        );

        CREATE TRIGGER IF NOT EXISTS trg_campaign_events_updated_at
        AFTER UPDATE ON campaign_events FOR EACH ROW
        BEGIN
          UPDATE campaign_events SET updated_at = strftime(\'%Y-%m-%dT%H:%M:%fZ\',\'now\') WHERE id = NEW.id;
        END;
      `,
      down: `
        DROP TRIGGER IF EXISTS trg_campaign_events_updated_at;
        DROP TABLE IF EXISTS event_causality;
        DROP TABLE IF EXISTS campaign_event_npcs;
        DROP TABLE IF EXISTS campaign_events;
      `,
    },
  ],
};
