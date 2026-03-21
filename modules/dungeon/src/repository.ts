// modules/dungeon/src/repository.ts
import { BaseRepository }        from '../../_framework/src/index';
import type { IDatabaseManager } from '../../../core/database/src/types';
import type { Logger }           from '../../../core/logger/src/types';
import type {
  DungeonRow, DungeonRoomRow, DungeonContentRow,
  Dungeon, DungeonRoom, DungeonContent,
} from './types';

// ── Row mappers ───────────────────────────────────────────────────────────────

function rowToContent(r: DungeonContentRow): DungeonContent {
  return {
    id:          r.id,
    roomId:      r.room_id,
    contentType: r.content_type,
    payload:     JSON.parse(r.payload) as Record<string, unknown>,
  };
}

function rowToRoom(r: DungeonRoomRow, contents: DungeonContent[]): DungeonRoom {
  return {
    id:          r.id,
    dungeonId:   r.dungeon_id,
    type:        r.type,
    label:       r.label,
    size:        r.size,
    x:           r.x,
    y:           r.y,
    connections: JSON.parse(r.connections) as string[],
    isBoss:      r.is_boss === 1,
    isEntrance:  r.is_entrance === 1,
    contents,
  };
}

function rowToDungeon(row: DungeonRow, rooms: DungeonRoom[]): Dungeon {
  return {
    id:        row.id,
    name:      row.name,
    theme:     row.theme as Dungeon['theme'],
    roomCount: row.room_count,
    createdAt: row.created_at,
    rooms,
  };
}

// ── Repository ────────────────────────────────────────────────────────────────

export class DungeonRepository extends BaseRepository {
  constructor(db: IDatabaseManager, log: Logger) {
    super('dungeon', db, log);
  }

  findAll(): Dungeon[] {
    const rows = this.query<DungeonRow>(
      'SELECT * FROM dungeons WHERE campaign_id = ? ORDER BY created_at DESC',
      [this.campaignId],
    );
    return rows.map(r => rowToDungeon(r, [])); // Rooms loaded on demand
  }

  findById(id: string): Dungeon | null {
    const row = this.queryOne<DungeonRow>(
      'SELECT * FROM dungeons WHERE id = ? AND campaign_id = ?',
      [id, this.campaignId],
    );
    if (!row) return null;

    const roomRows = this.query<DungeonRoomRow>(
      'SELECT * FROM dungeon_rooms WHERE dungeon_id = ?',
      [id],
    );
    const contentRows = this.query<DungeonContentRow>(
      `SELECT dc.* FROM dungeon_contents dc
       JOIN dungeon_rooms dr ON dc.room_id = dr.id
       WHERE dr.dungeon_id = ?`,
      [id],
    );

    const contentsByRoom = new Map<string, DungeonContent[]>();
    for (const cr of contentRows) {
      const list = contentsByRoom.get(cr.room_id) ?? [];
      list.push(rowToContent(cr));
      contentsByRoom.set(cr.room_id, list);
    }

    const rooms = roomRows.map(rr =>
      rowToRoom(rr, contentsByRoom.get(rr.id) ?? []),
    );
    return rowToDungeon(row, rooms);
  }

  save(dungeon: Dungeon): void {
    this.transaction(() => {
      // Insert dungeon header
      this.run(
        `INSERT INTO dungeons (id, campaign_id, name, theme, room_count, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [dungeon.id, this.campaignId, dungeon.name, dungeon.theme,
         dungeon.roomCount, dungeon.createdAt],
      );

      // Insert rooms + hallways
      for (const room of dungeon.rooms) {
        this.run(
          `INSERT INTO dungeon_rooms
             (id, dungeon_id, type, label, size, x, y, connections, is_boss, is_entrance)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            room.id, dungeon.id, room.type, room.label, room.size,
            room.x, room.y,
            JSON.stringify(room.connections),
            room.isBoss ? 1 : 0,
            room.isEntrance ? 1 : 0,
          ],
        );

        for (const content of room.contents) {
          this.run(
            `INSERT INTO dungeon_contents (id, room_id, content_type, payload)
             VALUES (?, ?, ?, ?)`,
            [content.id, room.id, content.contentType, JSON.stringify(content.payload)],
          );
        }
      }
    });
  }

  delete(id: string): boolean {
    return this.run(
      'DELETE FROM dungeons WHERE id = ? AND campaign_id = ?',
      [id, this.campaignId],
    ).changes > 0;
  }
}
