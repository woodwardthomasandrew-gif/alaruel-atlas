// modules/bestiary/src/schema.ts
// Database schema registration for the bestiary module.

import type { SchemaRegistration } from '../../../core/database/src/types';

export const BESTIARY_SCHEMA: SchemaRegistration = {
  module: 'bestiary',
  migrations: [
    {
      version:     10,
      module:      'bestiary',
      description: 'Create monsters table for the bestiary module',
      up: `
        CREATE TABLE IF NOT EXISTS monsters (
          id                      TEXT    PRIMARY KEY,
          campaign_id             TEXT    NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
          name                    TEXT    NOT NULL,
          description             TEXT    NOT NULL DEFAULT '',
          creature_type           TEXT    NOT NULL DEFAULT 'monstrosity'
                                      CHECK (creature_type IN (
                                        'aberration','beast','celestial','construct','dragon',
                                        'elemental','fey','fiend','giant','humanoid',
                                        'monstrosity','ooze','plant','undead','custom'
                                      )),
          subtype                 TEXT,
          size                    TEXT    NOT NULL DEFAULT 'medium'
                                      CHECK (size IN ('tiny','small','medium','large','huge','gargantuan')),
          alignment               TEXT    NOT NULL DEFAULT 'true neutral',
          armor_class             INTEGER NOT NULL DEFAULT 10,
          armor_type              TEXT,
          hit_points              INTEGER NOT NULL DEFAULT 1,
          hit_dice                TEXT,
          speed                   INTEGER NOT NULL DEFAULT 30,
          speed_other             TEXT    NOT NULL DEFAULT '{}',
          str                     INTEGER NOT NULL DEFAULT 10,
          dex                     INTEGER NOT NULL DEFAULT 10,
          con                     INTEGER NOT NULL DEFAULT 10,
          int                     INTEGER NOT NULL DEFAULT 10,
          wis                     INTEGER NOT NULL DEFAULT 10,
          cha                     INTEGER NOT NULL DEFAULT 10,
          proficiency_bonus       INTEGER NOT NULL DEFAULT 2,
          challenge_rating        TEXT    NOT NULL DEFAULT '0',
          xp_value                INTEGER NOT NULL DEFAULT 0,
          saving_throws           TEXT    NOT NULL DEFAULT '{}',
          skills                  TEXT    NOT NULL DEFAULT '{}',
          damage_vulnerabilities  TEXT    NOT NULL DEFAULT '[]',
          damage_resistances      TEXT    NOT NULL DEFAULT '[]',
          damage_immunities       TEXT    NOT NULL DEFAULT '[]',
          condition_immunities    TEXT    NOT NULL DEFAULT '[]',
          senses                  TEXT,
          languages               TEXT,
          traits                  TEXT    NOT NULL DEFAULT '[]',
          actions                 TEXT    NOT NULL DEFAULT '[]',
          reactions               TEXT    NOT NULL DEFAULT '[]',
          legendary_actions       TEXT    NOT NULL DEFAULT '[]',
          legendary_description   TEXT,
          bonus_actions           TEXT    NOT NULL DEFAULT '[]',
          lore                    TEXT,
          image_asset_id          TEXT,
          habitat_location_ids    TEXT    NOT NULL DEFAULT '[]',
          is_homebrew             INTEGER NOT NULL DEFAULT 1,
          tags                    TEXT    NOT NULL DEFAULT '[]',
          created_at              TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
          updated_at              TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
        );

        CREATE INDEX IF NOT EXISTS idx_monsters_campaign      ON monsters (campaign_id);
        CREATE INDEX IF NOT EXISTS idx_monsters_creature_type ON monsters (campaign_id, creature_type);
        CREATE INDEX IF NOT EXISTS idx_monsters_name          ON monsters (campaign_id, name);

        CREATE TRIGGER IF NOT EXISTS trg_monsters_updated_at
        AFTER UPDATE ON monsters FOR EACH ROW
        BEGIN
          UPDATE monsters SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = NEW.id;
        END;
      `,
      down: `
        DROP TRIGGER IF EXISTS trg_monsters_updated_at;
        DROP INDEX  IF EXISTS idx_monsters_name;
        DROP INDEX  IF EXISTS idx_monsters_creature_type;
        DROP INDEX  IF EXISTS idx_monsters_campaign;
        DROP TABLE  IF EXISTS monsters;
      `,
    },
  ],
};
