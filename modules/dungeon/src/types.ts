// modules/dungeon/src/types.ts
// Row types for DB access + input/output types for the service layer.

// ── DB Row types ──────────────────────────────────────────────────────────────

export interface DungeonRow {
  id:          string;
  campaign_id: string;
  name:        string;
  theme:       string;
  room_count:  number;
  created_at:  string;
}

export interface DungeonRoomRow {
  id:          string;
  dungeon_id:  string;
  type:        'room' | 'hallway';
  label:       string;
  size:        'small' | 'medium' | 'large';
  x:           number;
  y:           number;
  connections: string; // JSON: string[]
  is_boss:     number; // SQLite bool
  is_entrance: number;
}

export interface DungeonContentRow {
  id:           string;
  room_id:      string;
  content_type: 'monster' | 'trap' | 'loot' | 'empty';
  payload:      string; // JSON
}

// ── Domain types (used in the renderer) ──────────────────────────────────────

export type RoomType      = 'room' | 'hallway';
export type RoomSize      = 'small' | 'medium' | 'large';
export type ContentType   = 'monster' | 'trap' | 'loot' | 'empty';
export type DungeonTheme  = 'undead' | 'goblin' | 'arcane' | 'cult' | 'nature' | 'aberration';

export interface DungeonContent {
  id:          string;
  roomId:      string;
  contentType: ContentType;
  payload:     Record<string, unknown>;
}

export interface DungeonRoom {
  id:          string;
  dungeonId:   string;
  type:        RoomType;
  label:       string;
  size:        RoomSize;
  x:           number;
  y:           number;
  connections: string[];
  isBoss:      boolean;
  isEntrance:  boolean;
  contents:    DungeonContent[];
}

export interface Dungeon {
  id:        string;
  name:      string;
  theme:     DungeonTheme;
  roomCount: number;
  createdAt: string;
  rooms:     DungeonRoom[];
}

// ── Service input ─────────────────────────────────────────────────────────────

export interface GenerateDungeonInput {
  name?:      string;
  roomCount:  number;
  sizeRange:  [number, number]; // [min%, max%] maps to small/medium/large
  theme:      DungeonTheme;
}
