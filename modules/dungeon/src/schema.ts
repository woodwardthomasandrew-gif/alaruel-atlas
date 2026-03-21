// modules/dungeon/src/schema.ts
import type { SchemaRegistration } from '../../../core/database/src/types';

export const DUNGEON_SCHEMA: SchemaRegistration = {
  module: 'dungeon',
  migrations: [
    {
      version:     20,
      module:      'dungeon',
      description: 'Create dungeons, dungeon_rooms, and dungeon_contents tables',
      up: `
        CREATE TABLE IF NOT EXISTS dungeons (
          id          TEXT    PRIMARY KEY,
          campaign_id TEXT    NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
          name        TEXT    NOT NULL,
          theme       TEXT    NOT NULL DEFAULT 'undead',
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
  ],
};
