import { BaseRepository } from '../../_framework/src/index';
import type { IDatabaseManager } from '../../../core/database/src/types';
import type { Logger } from '../../../core/logger/src/types';
import type {
  ContentType,
  Dungeon,
  DungeonContent,
  DungeonContentRow,
  DungeonGrid,
  DungeonRoom,
  DungeonRoomContent,
  DungeonRoomMetadata,
  DungeonRoomRow,
  DungeonRow,
} from './types';

const VALID_CONTENT_TYPES: ContentType[] = [
  'monster',
  'encounter',
  'trap',
  'loot',
  'feature',
  'modifier',
  'empty',
];

interface StoredGenerationData {
  config?: Dungeon['generationConfig'];
  doors?: Dungeon['doors'];
  modifiers?: Dungeon['modifiers'];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseJsonOr<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function toContentType(value: string): ContentType {
  return VALID_CONTENT_TYPES.includes(value as ContentType) ? (value as ContentType) : 'empty';
}

function defaultRoomMetadata(row: DungeonRoomRow): DungeonRoomMetadata {
  const role = row.is_entrance === 1 ? 'entrance' : row.is_boss === 1 ? 'boss' : 'transit';
  return {
    purpose: {
      purposeId: row.is_entrance === 1 ? 'entrance_fallback' : row.is_boss === 1 ? 'boss_fallback' : 'room_fallback',
      label: row.label || 'Room',
      role,
      encounterTierBias: row.is_boss === 1 ? 'tier_3' : 'tier_1',
      lootTierBias: row.is_boss === 1 ? 'tier_3' : 'tier_1',
      tags: role === 'transit' ? [] : [role],
    },
    encounterTier: row.is_boss === 1 ? 'tier_3' : 'tier_1',
    lootTier: row.is_boss === 1 ? 'tier_3' : 'tier_1',
  };
}

function rowToContent(r: DungeonContentRow): DungeonContent {
  return {
    id: r.id,
    roomId: r.room_id,
    contentType: toContentType(r.content_type),
    payload: parseJsonOr<Record<string, unknown>>(r.payload, {}),
  };
}

function aggregateRoomContent(roomId: string, contents: DungeonContent[]): DungeonRoomContent {
  const roomContent: DungeonRoomContent = { roomId };

  for (const content of contents) {
    const payload = isRecord(content.payload) ? content.payload : {};

    if (content.contentType === 'monster' || content.contentType === 'encounter') {
      roomContent.encounters = [
        ...(roomContent.encounters ?? []),
        payload as unknown as NonNullable<DungeonRoomContent['encounters']>[number],
      ];
    } else if (content.contentType === 'loot') {
      roomContent.loot = [
        ...(roomContent.loot ?? []),
        payload as unknown as NonNullable<DungeonRoomContent['loot']>[number],
      ];
    } else if (content.contentType === 'trap') {
      roomContent.traps = [
        ...(roomContent.traps ?? []),
        payload as unknown as NonNullable<DungeonRoomContent['traps']>[number],
      ];
    } else if (content.contentType === 'feature') {
      roomContent.features = [
        ...(roomContent.features ?? []),
        payload as unknown as NonNullable<DungeonRoomContent['features']>[number],
      ];
    } else if (content.contentType === 'modifier') {
      roomContent.modifiers = [
        ...(roomContent.modifiers ?? []),
        payload as unknown as NonNullable<DungeonRoomContent['modifiers']>[number],
      ];
    } else if (content.contentType === 'empty') {
      roomContent.notes = [
        ...(roomContent.notes ?? []),
        payload as unknown as NonNullable<DungeonRoomContent['notes']>[number],
      ];
    }
  }

  return roomContent;
}

function rowToRoom(r: DungeonRoomRow, contents: DungeonContent[]): DungeonRoom {
  const metadata = parseJsonOr<DungeonRoomMetadata | null>(r.metadata, null) ?? defaultRoomMetadata(r);
  return {
    id: r.id,
    dungeonId: r.dungeon_id,
    type: r.type,
    label: r.label,
    size: r.size,
    x: r.x,
    y: r.y,
    width: r.width,
    height: r.height,
    shape: r.shape,
    tags: parseJsonOr<string[]>(r.tags, []),
    connections: parseJsonOr<string[]>(r.connections, []),
    isBoss: r.is_boss === 1,
    isEntrance: r.is_entrance === 1,
    metadata,
    contents,
    roomContent: aggregateRoomContent(r.id, contents),
  };
}

function emptyGrid(): DungeonGrid {
  return { width: 0, height: 0, tiles: [] };
}

function rowToDungeon(row: DungeonRow, rooms: DungeonRoom[]): Dungeon {
  const generation = parseJsonOr<StoredGenerationData>(row.generation_config, {});
  return {
    id: row.id,
    name: row.name,
    theme: row.theme as Dungeon['theme'],
    roomCount: row.room_count,
    createdAt: row.created_at,
    seed: row.generation_seed ?? row.id,
    grid: row.grid_json ? parseJsonOr<DungeonGrid>(row.grid_json, emptyGrid()) : emptyGrid(),
    doors: generation.doors ?? [],
    modifiers: generation.modifiers ?? [],
    generationConfig: generation.config ?? {
      seed: row.generation_seed ?? row.id,
      theme: row.theme as Dungeon['theme'],
      roomCount: row.room_count,
      width: row.grid_width ?? 0,
      height: row.grid_height ?? 0,
      roomSizeRange: [6, 12],
      corridorDensity: 0.25,
      allowLoops: true,
      spacing: 1,
    },
    rooms,
  };
}

export class DungeonRepository extends BaseRepository {
  constructor(db: IDatabaseManager, log: Logger) {
    super('dungeon', db, log);
  }

  findAll(): Dungeon[] {
    const rows = this.query<DungeonRow>(
      'SELECT * FROM dungeons WHERE campaign_id = ? ORDER BY created_at DESC',
      [this.campaignId],
    );
    return rows.map((r) => rowToDungeon(r, []));
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

    const rooms = roomRows.map((rr) => rowToRoom(rr, contentsByRoom.get(rr.id) ?? []));
    return rowToDungeon(row, rooms);
  }

  save(dungeon: Dungeon): void {
    this.transaction(() => {
      this.run(
        `INSERT INTO dungeons
          (id, campaign_id, name, theme, room_count, grid_width, grid_height, grid_json, generation_seed, generation_config, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          dungeon.id,
          this.campaignId,
          dungeon.name,
          dungeon.theme,
          dungeon.roomCount,
          dungeon.grid.width,
          dungeon.grid.height,
          JSON.stringify(dungeon.grid),
          dungeon.seed,
          JSON.stringify({ config: dungeon.generationConfig, doors: dungeon.doors, modifiers: dungeon.modifiers }),
          dungeon.createdAt,
        ],
      );

      for (const room of dungeon.rooms) {
        this.run(
          `INSERT INTO dungeon_rooms
             (id, dungeon_id, type, label, size, x, y, width, height, shape, tags, connections, metadata, is_boss, is_entrance)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            room.id,
            dungeon.id,
            room.type,
            room.label,
            room.size,
            room.x,
            room.y,
            room.width,
            room.height,
            room.shape,
            JSON.stringify(room.tags),
            JSON.stringify(room.connections),
            JSON.stringify(room.metadata),
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
    return (
      this.run('DELETE FROM dungeons WHERE id = ? AND campaign_id = ?', [id, this.campaignId]).changes > 0
    );
  }
}
