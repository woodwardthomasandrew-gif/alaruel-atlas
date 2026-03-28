import type { SchemaRegistration } from '../../../core/database/src/types';

export const DUNGEON_SCHEMA: SchemaRegistration = {
  module: 'dungeon',
  migrations: [
    {
      version: 20,
      module: 'dungeon',
      description: 'Create dungeons, dungeon_rooms, and dungeon_contents tables',
      up: `
        CREATE TABLE IF NOT EXISTS dungeons (
          id          TEXT    PRIMARY KEY,
          campaign_id TEXT    NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
          name        TEXT    NOT NULL,
          theme       TEXT    NOT NULL DEFAULT 'crypt',
          room_count  INTEGER NOT NULL DEFAULT 5,
          created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
        );
        CREATE INDEX IF NOT EXISTS idx_dungeons_campaign ON dungeons (campaign_id);

        CREATE TABLE IF NOT EXISTS dungeon_rooms (
          id          TEXT    PRIMARY KEY,
          dungeon_id  TEXT    NOT NULL REFERENCES dungeons(id) ON DELETE CASCADE,
          type        TEXT    NOT NULL DEFAULT 'room'
                          CHECK (type IN ('room','hallway')),
          label       TEXT    NOT NULL DEFAULT '',
          size        TEXT    NOT NULL DEFAULT 'medium'
                          CHECK (size IN ('small','medium','large')),
          x           REAL    NOT NULL DEFAULT 0,
          y           REAL    NOT NULL DEFAULT 0,
          connections TEXT    NOT NULL DEFAULT '[]',
          is_boss     INTEGER NOT NULL DEFAULT 0,
          is_entrance INTEGER NOT NULL DEFAULT 0
        );
        CREATE INDEX IF NOT EXISTS idx_dungeon_rooms_dungeon ON dungeon_rooms (dungeon_id);

        CREATE TABLE IF NOT EXISTS dungeon_contents (
          id           TEXT PRIMARY KEY,
          room_id      TEXT NOT NULL REFERENCES dungeon_rooms(id) ON DELETE CASCADE,
          content_type TEXT NOT NULL DEFAULT 'empty'
                           CHECK (content_type IN ('monster','trap','loot','empty')),
          payload      TEXT NOT NULL DEFAULT '{}'
        );
        CREATE INDEX IF NOT EXISTS idx_dungeon_contents_room ON dungeon_contents (room_id);
      `,
      down: `
        DROP TABLE IF EXISTS dungeon_contents;
        DROP TABLE IF EXISTS dungeon_rooms;
        DROP TABLE IF EXISTS dungeons;
      `,
    },
    {
      version: 21,
      module: 'dungeon',
      description: 'Add grid persistence and spatial room metadata',
      up: `
        ALTER TABLE dungeons ADD COLUMN grid_width INTEGER;
        ALTER TABLE dungeons ADD COLUMN grid_height INTEGER;
        ALTER TABLE dungeons ADD COLUMN grid_json TEXT;
        ALTER TABLE dungeons ADD COLUMN generation_seed TEXT;
        ALTER TABLE dungeons ADD COLUMN generation_config TEXT;

        ALTER TABLE dungeon_rooms ADD COLUMN width INTEGER NOT NULL DEFAULT 0;
        ALTER TABLE dungeon_rooms ADD COLUMN height INTEGER NOT NULL DEFAULT 0;
        ALTER TABLE dungeon_rooms ADD COLUMN shape TEXT NOT NULL DEFAULT 'rectangle'
          CHECK (shape IN ('rectangle','circle','irregular'));
        ALTER TABLE dungeon_rooms ADD COLUMN tags TEXT NOT NULL DEFAULT '[]';
      `,
      down: `
        -- SQLite does not support dropping columns in place.
      `,
    },
    {
      version: 25,
      module: 'dungeon',
      description: 'Add structured room metadata and expanded dungeon content types',
      up: `
        ALTER TABLE dungeon_rooms ADD COLUMN metadata TEXT NOT NULL DEFAULT '{}';

        CREATE TABLE IF NOT EXISTS dungeon_contents_v25 (
          id           TEXT PRIMARY KEY,
          room_id      TEXT NOT NULL REFERENCES dungeon_rooms(id) ON DELETE CASCADE,
          content_type TEXT NOT NULL DEFAULT 'empty'
                           CHECK (content_type IN ('monster','encounter','trap','loot','feature','modifier','empty')),
          payload      TEXT NOT NULL DEFAULT '{}'
        );

        INSERT INTO dungeon_contents_v25 (id, room_id, content_type, payload)
        SELECT id, room_id, content_type, payload
        FROM dungeon_contents;

        DROP TABLE dungeon_contents;
        ALTER TABLE dungeon_contents_v25 RENAME TO dungeon_contents;
        CREATE INDEX IF NOT EXISTS idx_dungeon_contents_room ON dungeon_contents (room_id);
      `,
      down: `
        -- SQLite down migration omitted (table rebuild required).
      `,
    },
  ],
};
