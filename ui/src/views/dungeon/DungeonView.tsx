import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { atlas } from '../../bridge/atlas';
import { useCampaignStore } from '../../store/campaign.store';
import styles from './DungeonView.module.css';

type TileType = 'empty' | 'floor' | 'wall' | 'door' | 'secret_door' | 'trap' | 'hazard' | 'stairs_up' | 'stairs_down';
type PaletteTile = TileType | 'door_toggle';
type ContentType = 'monster' | 'trap' | 'loot' | 'empty';
type DungeonTheme = 'crypt' | 'cave' | 'fortress' | 'sewer' | 'ruins' | 'arcane_lab';
type RoomShape = 'rectangle' | 'circle' | 'irregular';

interface DungeonGrid { width: number; height: number; tiles: TileType[][]; }
interface DungeonDoor { id: string; x: number; y: number; roomIds: string[]; locked: boolean; hidden: boolean; }
interface DungeonContent { id: string; roomId: string; contentType: ContentType; payload: Record<string, unknown>; }
interface DungeonRoom {
  id: string; dungeonId: string; type: 'room' | 'hallway'; label: string; size: 'small' | 'medium' | 'large';
  x: number; y: number; width: number; height: number; shape: RoomShape; tags: string[]; connections: string[];
  isBoss: boolean; isEntrance: boolean; contents: DungeonContent[];
}
interface Dungeon {
  id: string; name: string; theme: DungeonTheme; roomCount: number; createdAt: string; seed: string;
  grid: DungeonGrid; rooms: DungeonRoom[]; doors: DungeonDoor[];
  generationConfig: {
    seed?: string; theme: DungeonTheme; roomCount: number; width: number; height: number; roomSizeRange: [number, number];
    corridorDensity: number; allowLoops: boolean; spacing: number;
  };
}
interface DungeonEditSnapshot {
  grid: DungeonGrid;
  doors: DungeonDoor[];
}
interface GenerateDungeonInput {
  name?: string; seed?: string; theme: DungeonTheme; roomCount: number; width: number; height: number; roomSizeRange: [number, number];
  corridorDensity: number; allowLoops: boolean; spacing: number;
}
interface RawRow extends Record<string, unknown> {}
interface InternalRoom {
  id: string; x: number; y: number; width: number; height: number; shape: RoomShape; tags: string[]; center: { x: number; y: number };
  connections: string[]; isBoss: boolean; isEntrance: boolean;
}

const THEME_MONSTERS: Record<DungeonTheme, string[]> = {
  crypt: ['Skeletons', 'Ghouls', 'Wights'],
  cave: ['Bats', 'Spiders', 'Troglodytes'],
  fortress: ['Guards', 'Veterans', 'Mages'],
  sewer: ['Swarms', 'Cultists', 'Otyugh'],
  ruins: ['Bandits', 'Undead', 'Cultists'],
  arcane_lab: ['Constructs', 'Elementals', 'Living spells'],
};
const THEME_LOOT: Record<DungeonTheme, string[]> = {
  crypt: ['Reliquary', 'Ancient coins', 'Cursed ring'],
  cave: ['Crystals', 'Ore cache', 'Map fragment'],
  fortress: ['War chest', 'Armory key', 'Commander seal'],
  sewer: ['Smuggler satchel', 'Lockbox', 'Secret ledger'],
  ruins: ['Relic idol', 'Old crowns', 'Rune tablet'],
  arcane_lab: ['Spell focus', 'Research codex', 'Mana crystal'],
};
const THEME_TRAPS: Record<DungeonTheme, string[]> = {
  crypt: ['Necrotic glyph', 'Dart slit', 'False tomb'],
  cave: ['Rockfall', 'Sinkhole', 'Spore cloud'],
  fortress: ['Alarm wire', 'Arrow slit', 'Murder hole'],
  sewer: ['Flood gate', 'Gas pocket', 'Rust snare'],
  ruins: ['Blade sweep', 'Rune burst', 'Falling stones'],
  arcane_lab: ['Arc surge', 'Force lock', 'Teleport snare'],
};

function clamp(value: number, min: number, max: number): number { return Math.max(min, Math.min(max, value)); }
function pick<T>(arr: T[], rand: () => number): T { return arr[Math.floor(rand() * arr.length)]; }
function randomInt(min: number, max: number, rand: () => number): number { return Math.floor(rand() * (max - min + 1)) + min; }
function makePrng(seed: number) { let s = seed >>> 0; return () => { s += 0x6d2b79f5; let t = Math.imul(s ^ (s >>> 15), 1 | s); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function seedFromString(str: string): number { let h = 0x811c9dc5; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); } return h >>> 0; }
function newIdFactory(prefix: string, namespace: string): () => string { let i = 0; return () => `${namespace}_${prefix}_${(i++).toString(36).padStart(3, '0')}`; }
function dist(a: { x: number; y: number }, b: { x: number; y: number }): number { return Math.abs(a.x - b.x) + Math.abs(a.y - b.y); }

function roomShape(rand: () => number): RoomShape { const r = rand(); return r < 0.55 ? 'rectangle' : r < 0.82 ? 'circle' : 'irregular'; }
function roomContains(room: InternalRoom, x: number, y: number): boolean {
  if (x < room.x || y < room.y || x >= room.x + room.width || y >= room.y + room.height) return false;
  if (room.shape === 'rectangle') return true;
  const cx = room.x + (room.width - 1) / 2;
  const cy = room.y + (room.height - 1) / 2;
  const nx = room.width > 1 ? (x - cx) / (room.width / 2) : 0;
  const ny = room.height > 1 ? (y - cy) / (room.height / 2) : 0;
  if (room.shape === 'circle') return (nx * nx) + (ny * ny) <= 1;
  const j = (((x + 7) * 73856093) ^ ((y + 13) * 19349663)) & 3;
  return (nx * nx) + (ny * ny) <= 1 + (j === 0 ? 0.2 : j === 1 ? -0.2 : 0);
}
function overlap(a: InternalRoom, b: InternalRoom, spacing: number): boolean {
  const l1 = a.x - spacing; const r1 = a.x + a.width + spacing;
  const t1 = a.y - spacing; const b1 = a.y + a.height + spacing;
  const l2 = b.x; const r2 = b.x + b.width;
  const t2 = b.y; const b2 = b.y + b.height;
  return l1 < r2 && r1 > l2 && t1 < b2 && b1 > t2;
}

function generateDungeon(dungeonId: string, input: GenerateDungeonInput): Dungeon {
  const width = clamp(Math.floor(input.width), 20, 220);
  const height = clamp(Math.floor(input.height), 20, 220);
  const seed = (input.seed ?? `${dungeonId}:${input.theme}:${input.roomCount}`).toString();
  const rand = makePrng(seedFromString(seed));
  const nextRoom = newIdFactory('room', dungeonId);
  const nextContent = newIdFactory('content', dungeonId);
  const nextDoor = newIdFactory('door', dungeonId);
  const minSize = clamp(Math.floor(input.roomSizeRange[0]), 4, 30);
  const maxSize = clamp(Math.floor(input.roomSizeRange[1]), minSize + 1, 40);
  const spacing = clamp(Math.floor(input.spacing), 1, 3);
  const target = clamp(Math.floor(input.roomCount), 3, 80);

  const rooms: InternalRoom[] = [];
  let attempts = 0;
  while (rooms.length < target && attempts < target * 130) {
    attempts += 1;
    const rw = randomInt(minSize, maxSize, rand);
    const rh = randomInt(minSize, maxSize, rand);
    if (rw >= width - 6 || rh >= height - 6) continue;
    const room: InternalRoom = {
      id: nextRoom(), x: randomInt(2, width - rw - 3, rand), y: randomInt(2, height - rh - 3, rand), width: rw, height: rh,
      shape: roomShape(rand), tags: [], center: { x: 0, y: 0 }, connections: [], isBoss: false, isEntrance: false,
    };
    room.center = { x: Math.floor(room.x + rw / 2), y: Math.floor(room.y + rh / 2) };
    if (!rooms.some((r) => overlap(room, r, spacing))) rooms.push(room);
  }
  if (rooms.length < 3) throw new Error('Unable to place enough rooms. Increase map size or reduce room count.');

  rooms.sort((a, b) => (a.center.x + a.center.y) - (b.center.x + b.center.y));
  const entrance = rooms[0]; entrance.isEntrance = true; entrance.tags.push('entrance');
  let boss = rooms[rooms.length - 1]; let far = -1;
  for (const r of rooms) { const d = dist(entrance.center, r.center); if (d > far) { far = d; boss = r; } }
  boss.isBoss = true; boss.tags.push('boss');

  const grid: DungeonGrid = { width, height, tiles: Array.from({ length: height }, () => Array.from({ length: width }, () => 'empty' as TileType)) };
  const roomMask = Array.from({ length: height }, () => Array.from({ length: width }, () => false));
  const corridorMask = Array.from({ length: height }, () => Array.from({ length: width }, () => false));
  const inBounds = (x: number, y: number) => x >= 0 && x < width && y >= 0 && y < height;
  const set = (x: number, y: number, t: TileType) => { if (inBounds(x, y)) grid.tiles[y][x] = t; };

  for (const room of rooms) {
    for (let y = room.y; y < room.y + room.height; y++) {
      for (let x = room.x; x < room.x + room.width; x++) {
        if (roomContains(room, x, y)) { set(x, y, 'floor'); roomMask[y][x] = true; }
      }
    }
  }

  const edges: { a: string; b: string; w: number }[] = [];
  for (let i = 0; i < rooms.length; i++) for (let j = i + 1; j < rooms.length; j++) edges.push({ a: rooms[i].id, b: rooms[j].id, w: dist(rooms[i].center, rooms[j].center) });
  edges.sort((a, b) => a.w - b.w);
  const parent = new Map(rooms.map((r) => [r.id, r.id]));
  const find = (id: string): string => { const p = parent.get(id) ?? id; if (p === id) return id; const root = find(p); parent.set(id, root); return root; };
  const union = (a: string, b: string) => parent.set(find(a), find(b));
  const graph: { a: string; b: string }[] = [];
  for (const e of edges) if (find(e.a) !== find(e.b)) { union(e.a, e.b); graph.push({ a: e.a, b: e.b }); }
  if (input.allowLoops) {
    const extra = Math.floor(clamp(input.corridorDensity, 0, 1) * rooms.length * 0.35);
    const candidates = edges.filter((e) => !graph.some((g) => (g.a === e.a && g.b === e.b) || (g.a === e.b && g.b === e.a)));
    for (let i = 0; i < extra && candidates.length > 0; i++) {
      const picked = candidates.splice(randomInt(0, candidates.length - 1, rand), 1)[0];
      if (picked) graph.push(picked);
    }
  }

  const byId = new Map(rooms.map((r) => [r.id, r]));
  const tunnel = (a: { x: number; y: number }, b: { x: number; y: number }, w: number) => {
    const dig = (sx: number, sy: number, ex: number, ey: number) => {
      let x = sx; let y = sy;
      while (x !== ex || y !== ey) {
        for (let oy = -Math.floor(w / 2); oy <= Math.floor(w / 2); oy++) for (let ox = -Math.floor(w / 2); ox <= Math.floor(w / 2); ox++) {
          const tx = x + ox; const ty = y + oy; if (!inBounds(tx, ty)) continue; if (!roomMask[ty][tx]) { corridorMask[ty][tx] = true; set(tx, ty, 'floor'); }
        }
        if (x !== ex) x += Math.sign(ex - x);
        if (y !== ey) y += Math.sign(ey - y);
      }
    };
    if (rand() < 0.5) { dig(a.x, a.y, b.x, a.y); dig(b.x, a.y, b.x, b.y); } else { dig(a.x, a.y, a.x, b.y); dig(a.x, b.y, b.x, b.y); }
  };
  const edgePoint = (room: InternalRoom, toward: { x: number; y: number }) => {
    const clampY = clamp(toward.y, room.y, room.y + room.height - 1);
    const clampX = clamp(toward.x, room.x, room.x + room.width - 1);
    const candidates = [{ x: room.x, y: clampY }, { x: room.x + room.width - 1, y: clampY }, { x: clampX, y: room.y }, { x: clampX, y: room.y + room.height - 1 }];
    candidates.sort((a, b) => dist(a, toward) - dist(b, toward));
    return candidates[0];
  };
  for (const edge of graph) {
    const a = byId.get(edge.a); const b = byId.get(edge.b); if (!a || !b) continue;
    if (!a.connections.includes(b.id)) a.connections.push(b.id);
    if (!b.connections.includes(a.id)) b.connections.push(a.id);
    tunnel(edgePoint(a, b.center), edgePoint(b, a.center), randomInt(1, 3, rand));
  }

  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (corridorMask[y][x]) {
    const r = rand();
    if (r < 0.02) set(x, y, 'trap');
    else if (r < 0.03) set(x, y, 'hazard');
  }
  set(entrance.center.x, entrance.center.y, 'stairs_up');
  set(boss.center.x, boss.center.y, 'stairs_down');

  const doors: DungeonDoor[] = [];
  const usedDoors = new Set<string>();
  const dirs = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];
  const roomById = new Map(rooms.map((r) => [r.id, r]));
  const isDoorCandidate = (x: number, y: number): boolean => {
    if (!inBounds(x, y) || !roomMask[y][x]) return false;
    return dirs.some((d) => {
      const nx = x + d.x;
      const ny = y + d.y;
      const px = x - d.x;
      const py = y - d.y;
      return inBounds(nx, ny) && corridorMask[ny][nx] && inBounds(px, py) && roomMask[py][px];
    });
  };
  const corridorDirectionAt = (x: number, y: number): { x: number; y: number } | null => {
    for (const d of dirs) {
      const nx = x + d.x;
      const ny = y + d.y;
      const px = x - d.x;
      const py = y - d.y;
      if (inBounds(nx, ny) && corridorMask[ny][nx] && inBounds(px, py) && roomMask[py][px]) {
        return d;
      }
    }
    return null;
  };
  const findDoorPoint = (room: InternalRoom, toward: { x: number; y: number }): { x: number; y: number } | null => {
    const preferred = edgePoint(room, toward);
    if (isDoorCandidate(preferred.x, preferred.y)) return preferred;
    let best: { x: number; y: number } | null = null;
    let bestDist = Number.POSITIVE_INFINITY;
    for (let y = room.y; y < room.y + room.height; y++) {
      for (let x = room.x; x < room.x + room.width; x++) {
        if (!isDoorCandidate(x, y)) continue;
        const d = Math.abs(x - preferred.x) + Math.abs(y - preferred.y);
        if (d < bestDist) { bestDist = d; best = { x, y }; }
      }
    }
    return best;
  };

  for (const room of rooms) {
    for (const connId of room.connections) {
      if (room.id > connId) continue;
      const target = roomById.get(connId);
      if (!target) continue;

      const endpoints = [
        { room, toward: target.center },
        { room: target, toward: room.center },
      ];

      for (const endpoint of endpoints) {
        const p = findDoorPoint(endpoint.room, endpoint.toward);
        if (!p) continue;
        const dir = corridorDirectionAt(p.x, p.y);
        if (!dir) continue;
        const key = `${p.x}:${p.y}`;
        if (usedDoors.has(key)) continue;
        usedDoors.add(key);

        // Build opposite-side wall supports for cleaner, non-floating doors.
        if (dir.x !== 0) {
          const up = { x: p.x, y: p.y - 1 };
          const down = { x: p.x, y: p.y + 1 };
          if (inBounds(up.x, up.y) && !corridorMask[up.y][up.x] && grid.tiles[up.y][up.x] !== 'stairs_up' && grid.tiles[up.y][up.x] !== 'stairs_down') {
            set(up.x, up.y, 'wall');
          }
          if (inBounds(down.x, down.y) && !corridorMask[down.y][down.x] && grid.tiles[down.y][down.x] !== 'stairs_up' && grid.tiles[down.y][down.x] !== 'stairs_down') {
            set(down.x, down.y, 'wall');
          }
        } else {
          const left = { x: p.x - 1, y: p.y };
          const right = { x: p.x + 1, y: p.y };
          if (inBounds(left.x, left.y) && !corridorMask[left.y][left.x] && grid.tiles[left.y][left.x] !== 'stairs_up' && grid.tiles[left.y][left.x] !== 'stairs_down') {
            set(left.x, left.y, 'wall');
          }
          if (inBounds(right.x, right.y) && !corridorMask[right.y][right.x] && grid.tiles[right.y][right.x] !== 'stairs_up' && grid.tiles[right.y][right.x] !== 'stairs_down') {
            set(right.x, right.y, 'wall');
          }
        }

        const hidden = rand() < 0.05;
        const locked = !hidden && rand() < 0.15;
        set(p.x, p.y, hidden ? 'secret_door' : 'door');
        doors.push({ id: nextDoor(), x: p.x, y: p.y, roomIds: [endpoint.room.id], hidden, locked });
      }
    }
  }

  const walkable = new Set<TileType>(['floor', 'door', 'secret_door', 'trap', 'hazard', 'stairs_up', 'stairs_down']);
  const neighbors = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }, { x: 1, y: 1 }, { x: -1, y: -1 }, { x: -1, y: 1 }, { x: 1, y: -1 }];
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (grid.tiles[y][x] === 'empty') {
    if (neighbors.some((n) => inBounds(x + n.x, y + n.y) && walkable.has(grid.tiles[y + n.y][x + n.x]))) set(x, y, 'wall');
  }

  const hasOpposingWallSupports = (x: number, y: number): boolean => {
    const left = inBounds(x - 1, y) ? grid.tiles[y][x - 1] : 'empty';
    const right = inBounds(x + 1, y) ? grid.tiles[y][x + 1] : 'empty';
    const up = inBounds(x, y - 1) ? grid.tiles[y - 1][x] : 'empty';
    const down = inBounds(x, y + 1) ? grid.tiles[y + 1][x] : 'empty';
    return (left === 'wall' && right === 'wall') || (up === 'wall' && down === 'wall');
  };
  const anchoredDoors: DungeonDoor[] = [];
  for (const door of doors) {
    if (hasOpposingWallSupports(door.x, door.y)) {
      anchoredDoors.push(door);
    } else if (inBounds(door.x, door.y)) {
      set(door.x, door.y, 'floor');
    }
  }

  const roomRows: DungeonRoom[] = rooms.map((room, idx) => {
    const isDeadEnd = room.connections.length <= 1 && !room.isBoss && !room.isEntrance;
    const content: DungeonContent[] = [];
    if (room.isBoss) {
      content.push({ id: nextContent(), roomId: room.id, contentType: 'monster', payload: { name: pick(THEME_MONSTERS[input.theme], rand), elite: true } });
      content.push({ id: nextContent(), roomId: room.id, contentType: 'monster', payload: { name: pick(THEME_MONSTERS[input.theme], rand), elite: true } });
      content.push({ id: nextContent(), roomId: room.id, contentType: 'loot', payload: { item: pick(THEME_LOOT[input.theme], rand) } });
    } else if (room.isEntrance) {
      content.push({ id: nextContent(), roomId: room.id, contentType: 'empty', payload: { note: 'Entrance staging room.' } });
    } else {
      if (rand() < 0.66) content.push({ id: nextContent(), roomId: room.id, contentType: 'monster', payload: { name: pick(THEME_MONSTERS[input.theme], rand) } });
      if (rand() < (isDeadEnd ? 0.7 : 0.28)) content.push({ id: nextContent(), roomId: room.id, contentType: 'loot', payload: { item: pick(THEME_LOOT[input.theme], rand) } });
      if (rand() < 0.2) content.push({ id: nextContent(), roomId: room.id, contentType: 'trap', payload: { trap: pick(THEME_TRAPS[input.theme], rand) } });
      if (!content.length) content.push({ id: nextContent(), roomId: room.id, contentType: 'empty', payload: { note: 'Quiet chamber.' } });
    }
    const area = room.width * room.height;
    return {
      id: room.id, dungeonId, type: 'room', label: `Room ${idx + 1}`,
      size: area <= 45 ? 'small' : area <= 90 ? 'medium' : 'large',
      x: room.x, y: room.y, width: room.width, height: room.height, shape: room.shape,
      tags: room.tags.concat(isDeadEnd ? ['dead_end', 'treasure'] : []), connections: room.connections, isBoss: room.isBoss, isEntrance: room.isEntrance, contents: content,
    };
  });

  return {
    id: dungeonId,
    name: input.name?.trim() || `${input.theme.replace('_', ' ')} dungeon`,
    theme: input.theme,
    roomCount: roomRows.length,
    createdAt: new Date().toISOString(),
    seed,
    grid,
    rooms: roomRows,
    doors: anchoredDoors,
    generationConfig: { seed, theme: input.theme, roomCount: input.roomCount, width, height, roomSizeRange: [minSize, maxSize], corridorDensity: input.corridorDensity, allowLoops: input.allowLoops, spacing },
  };
}

function playerMap(d: Dungeon): Dungeon {
  return {
    ...d,
    grid: { ...d.grid, tiles: d.grid.tiles.map((row) => row.map((tile) => (tile === 'secret_door' ? 'wall' : tile === 'trap' ? 'floor' : tile))) },
    doors: d.doors.filter((door) => !door.hidden).map((door) => ({ ...door, hidden: false })),
  };
}

const TILE_RENDER_ORDER: TileType[] = [
  'floor',
  'wall',
  'door',
  'secret_door',
  'trap',
  'hazard',
  'stairs_up',
  'stairs_down',
];

function createPathBuckets(): Record<TileType, string[]> {
  return {
    empty: [],
    floor: [],
    wall: [],
    door: [],
    secret_door: [],
    trap: [],
    hazard: [],
    stairs_up: [],
    stairs_down: [],
  };
}

function buildTilePaths(grid: DungeonGrid, tileSize: number): Record<TileType, string> {
  const buckets = createPathBuckets();
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      const tile = grid.tiles[y]?.[x] ?? 'empty';
      if (tile === 'empty') continue;
      const px = x * tileSize;
      const py = y * tileSize;
      buckets[tile].push(`M${px} ${py}h${tileSize}v${tileSize}h-${tileSize}z`);
    }
  }
  return {
    empty: '',
    floor: buckets.floor.join(''),
    wall: buckets.wall.join(''),
    door: buckets.door.join(''),
    secret_door: buckets.secret_door.join(''),
    trap: buckets.trap.join(''),
    hazard: buckets.hazard.join(''),
    stairs_up: buckets.stairs_up.join(''),
    stairs_down: buckets.stairs_down.join(''),
  };
}

function buildGridPath(widthTiles: number, heightTiles: number, tileSize: number): string {
  const widthPx = widthTiles * tileSize;
  const heightPx = heightTiles * tileSize;
  const parts: string[] = [];
  for (let x = 0; x <= widthTiles; x++) {
    const px = x * tileSize;
    parts.push(`M${px} 0V${heightPx}`);
  }
  for (let y = 0; y <= heightTiles; y++) {
    const py = y * tileSize;
    parts.push(`M0 ${py}H${widthPx}`);
  }
  return parts.join('');
}

function buildMapSvgMarkup(
  dungeon: Dungeon,
  options: {
    playerVersion: boolean;
    showGrid: boolean;
    showRoomNumbers: boolean;
    printerFriendly?: boolean;
    tileSize?: number;
    tileSizeMm?: number;
    cncLayers?: boolean;
  },
): string {
  const map = options.playerVersion ? playerMap(dungeon) : dungeon;
  const printerFriendly = options.printerFriendly ?? true;
  const tile = options.tileSize ?? TILE_SIZE;
  const widthPx = map.grid.width * tile;
  const heightPx = map.grid.height * tile;
  const widthMm = options.tileSizeMm ? ` width="${(map.grid.width * options.tileSizeMm).toFixed(3)}mm"` : '';
  const heightMm = options.tileSizeMm ? ` height="${(map.grid.height * options.tileSizeMm).toFixed(3)}mm"` : '';
  const tilePaths = buildTilePaths(map.grid, tile);
  const gridPath = options.showGrid ? buildGridPath(map.grid.width, map.grid.height, tile) : '';
  const bg = printerFriendly ? '#ffffff' : '#11171f';
  const gridStroke = printerFriendly ? 'rgba(80,80,80,0.28)' : 'rgba(35,42,49,0.55)';
  const textBg = printerFriendly ? 'rgba(255,255,255,0.95)' : 'rgba(9, 12, 16, 0.86)';
  const textStroke = printerFriendly ? 'rgba(70,70,70,0.9)' : 'rgba(220, 230, 240, 0.7)';
  const textColor = printerFriendly ? '#202020' : '#f2f6fb';

  const layers: string[] = [];
  for (const tileType of TILE_RENDER_ORDER) {
    const d = tilePaths[tileType];
    if (!d) continue;
    const layerBody = `<path d="${d}" fill="${printerFriendly ? exportTileColor(tileType, options.playerVersion) : tileColor(tileType, options.playerVersion)}" shape-rendering="crispEdges" />`;
    if (options.cncLayers) {
      layers.push(`<g id="layer_${tileType}" data-tile-type="${tileType}">${layerBody}</g>`);
    } else {
      layers.push(layerBody);
    }
  }

  const labels = options.showRoomNumbers
    ? map.rooms.map((room, idx) => {
      const cx = ((room.x + (room.width / 2)) * tile).toFixed(3);
      const cy = ((room.y + (room.height / 2)) * tile).toFixed(3);
      const badge = Math.max(16, Math.floor(tile * 1.2));
      const half = badge / 2;
      const fontSize = Math.max(10, Math.floor(tile * 0.75));
      return [
        `<rect x="${(Number(cx) - half).toFixed(3)}" y="${(Number(cy) - half).toFixed(3)}" width="${badge}" height="${badge}" fill="${textBg}" stroke="${textStroke}" />`,
        `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle" fill="${textColor}" font-family="monospace" font-size="${fontSize}">${idx + 1}</text>`,
      ].join('');
    }).join('')
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg"${widthMm}${heightMm} viewBox="0 0 ${widthPx} ${heightPx}" role="img" aria-label="Dungeon Map">
  <rect x="0" y="0" width="${widthPx}" height="${heightPx}" fill="${bg}" />
  ${layers.join('\n  ')}
  ${gridPath ? `<path d="${gridPath}" fill="none" stroke="${gridStroke}" stroke-width="1" shape-rendering="crispEdges" />` : ''}
  ${labels}
</svg>`;
}

function exportSvg(name: string, svgMarkup: string): void {
  const blob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function exportCanvasPng(name: string, canvas: HTMLCanvasElement): void {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }, 'image/png');
}

function buildMapCanvas(
  dungeon: Dungeon,
  options: { playerVersion: boolean; showGrid: boolean; showRoomNumbers: boolean; printerFriendly?: boolean },
): HTMLCanvasElement {
  const map = options.playerVersion ? playerMap(dungeon) : dungeon;
  const printerFriendly = options.printerFriendly ?? true;
  const maxDim = Math.max(map.grid.width, map.grid.height);
  const tile = clamp(Math.floor(1200 / Math.max(1, maxDim)), 4, 18);
  const canvas = document.createElement('canvas');
  canvas.width = map.grid.width * tile;
  canvas.height = map.grid.height * tile;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.fillStyle = printerFriendly ? '#ffffff' : '#11171f';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < map.grid.height; y++) {
    for (let x = 0; x < map.grid.width; x++) {
      const tileType = map.grid.tiles[y]?.[x] ?? 'empty';
      ctx.fillStyle = printerFriendly
        ? exportTileColor(tileType, options.playerVersion)
        : tileColor(tileType, options.playerVersion);
      ctx.fillRect(x * tile, y * tile, tile, tile);
      if (options.showGrid) {
        ctx.strokeStyle = printerFriendly ? 'rgba(80,80,80,0.28)' : 'rgba(35,42,49,0.55)';
        ctx.strokeRect(x * tile, y * tile, tile, tile);
      }
    }
  }

  if (options.showRoomNumbers) {
    ctx.font = `${Math.max(10, Math.floor(tile * 0.75))}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    map.rooms.forEach((room, idx) => {
      const cx = (room.x + room.width / 2) * tile;
      const cy = (room.y + room.height / 2) * tile;
      const badgeSize = Math.max(16, Math.floor(tile * 1.2));
      ctx.fillStyle = printerFriendly ? 'rgba(255,255,255,0.95)' : 'rgba(9, 12, 16, 0.86)';
      ctx.fillRect(cx - badgeSize / 2, cy - badgeSize / 2, badgeSize, badgeSize);
      ctx.strokeStyle = printerFriendly ? 'rgba(70,70,70,0.9)' : 'rgba(220, 230, 240, 0.7)';
      ctx.strokeRect(cx - badgeSize / 2, cy - badgeSize / 2, badgeSize, badgeSize);
      ctx.fillStyle = printerFriendly ? '#202020' : '#f2f6fb';
      ctx.fillText(String(idx + 1), cx, cy);
    });
  }

  return canvas;
}

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function buildGmBreakdownHtml(dungeon: Dungeon): string {
  const blocks: string[] = [];

  dungeon.rooms.forEach((room, idx) => {
    const monsters = room.contents
      .filter((c) => c.contentType === 'monster')
      .map((c) => (typeof c.payload.name === 'string' ? c.payload.name : 'Unknown monster'));
    const loot = room.contents
      .filter((c) => c.contentType === 'loot')
      .map((c) => (typeof c.payload.item === 'string' ? c.payload.item : 'Unknown loot'));
    const traps = room.contents
      .filter((c) => c.contentType === 'trap')
      .map((c) => (typeof c.payload.trap === 'string' ? c.payload.trap : 'Unknown trap'));
    const notes = room.contents
      .filter((c) => c.contentType === 'empty')
      .map((c) => (typeof c.payload.note === 'string' ? c.payload.note : ''))
      .filter(Boolean);
    const puzzleHints = notes.filter((n) => /\bpuzzle|riddle|mechanism|lever|switch\b/i.test(n));
    let roomHazards = 0;
    for (let y = room.y; y < room.y + room.height; y++) {
      for (let x = room.x; x < room.x + room.width; x++) {
        const tile = dungeon.grid.tiles[y]?.[x];
        if (tile === 'hazard' || tile === 'trap') roomHazards += 1;
      }
    }

    const role = room.isEntrance ? 'Entrance' : room.isBoss ? 'Boss' : 'Standard';
    blocks.push(`
      <section class="room">
        <h3>Room ${idx + 1}</h3>
        <div class="meta">Role: ${role}</div>
        <div class="meta">Tags: ${escapeHtml(room.tags.length ? room.tags.join(', ') : 'none')}</div>
        <div class="row"><strong>Monsters:</strong> ${escapeHtml(monsters.length ? monsters.join(', ') : 'none')}</div>
        <div class="row"><strong>Loot:</strong> ${escapeHtml(loot.length ? loot.join(', ') : 'none')}</div>
        <div class="row"><strong>Puzzles:</strong> ${escapeHtml(puzzleHints.length ? puzzleHints.join(' | ') : 'none')}</div>
        <div class="row"><strong>Hazards:</strong> ${escapeHtml(traps.length ? traps.join(', ') : 'none')}${roomHazards ? ` <span class="muted">(hazard tiles in room: ${roomHazards})</span>` : ''}</div>
        <div class="row"><strong>Notes:</strong> ${escapeHtml(notes.length ? notes.join(' | ') : 'none')}</div>
      </section>
    `);
  });

  return blocks.join('\n');
}

function exportGmPdf(dungeon: Dungeon): void {
  const mapSvg = buildMapSvgMarkup(dungeon, {
    playerVersion: false,
    showGrid: true,
    showRoomNumbers: true,
    printerFriendly: true,
    tileSize: DND_TILE_MM,
    tileSizeMm: DND_TILE_MM,
  });
  const title = escapeHtml(dungeon.name);

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title} - GM Export</title>
  <style>
    :root { color-scheme: light; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Georgia, "Times New Roman", serif; color: #1a1816; background: #fff; }
    .doc { max-width: 980px; margin: 0 auto; padding: 16px 18px 28px; }
    h1,h2,h3 { margin: 0; color: #2a2018; }
    h1 { font-size: 1.75rem; margin-bottom: 8px; }
    h2 { font-size: 1.08rem; margin: 16px 0 10px; text-transform: uppercase; letter-spacing: .04em; }
    h3 { font-size: .98rem; margin-bottom: 6px; }
    .meta { color: #5f5247; font-size: .88rem; margin-bottom: 6px; }
    .map-wrap { border: 1px solid #d9ccbf; border-radius: 8px; padding: 8px; background: #f6f0e9; }
    .map-wrap svg { display: block; width: auto; height: auto; max-width: none; }
    .room { border: 1px solid #ded2c6; border-radius: 8px; padding: 10px 12px; margin: 8px 0; break-inside: avoid; page-break-inside: avoid; }
    .row { margin: 3px 0; line-height: 1.35; }
    .muted { color: #6b5e52; font-style: italic; }
    @media print {
      @page { size: A4 portrait; margin: 14mm 12mm; }
      .doc { max-width: none; margin: 0; padding: 0; }
      .map-wrap { break-inside: avoid; page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <main class="doc">
    <h1>${title} (GM Reference)</h1>
    <div class="meta">Theme: ${escapeHtml(dungeon.theme)} | Seed: ${escapeHtml(dungeon.seed)} | Grid: ${dungeon.grid.width} x ${dungeon.grid.height} | Rooms: ${dungeon.rooms.length}</div>
    <h2>Map</h2>
    <div class="map-wrap">${mapSvg}</div>
    <h2>Room Breakdown</h2>
    ${buildGmBreakdownHtml(dungeon)}
  </main>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const printWindow = window.open(url, '_blank');

  if (printWindow) {
    let printed = false;
    const triggerPrint = () => {
      if (printed) return;
      printed = true;
      try {
        printWindow.focus();
        printWindow.print();
      } catch {
        // ignore and rely on manual print in opened window
      }
    };
    printWindow.onload = triggerPrint;
    setTimeout(triggerPrint, 700);
    setTimeout(() => URL.revokeObjectURL(url), 15000);
    return;
  }

  // Popup blocked fallback: print from hidden iframe.
  const frame = document.createElement('iframe');
  frame.style.position = 'fixed';
  frame.style.width = '0';
  frame.style.height = '0';
  frame.style.opacity = '0';
  frame.style.pointerEvents = 'none';
  document.body.appendChild(frame);
  frame.src = url;
  frame.onload = () => {
    try {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
    } finally {
      setTimeout(() => {
        frame.remove();
        URL.revokeObjectURL(url);
      }, 15000);
    }
  };
}

function tileColor(tile: TileType, playerVersion: boolean): string {
  if (tile === 'empty') return '#11171f';
  if (tile === 'wall') return '#2a323d';
  if (tile === 'floor') return '#aab4be';
  if (tile === 'door') return '#b8873d';
  if (tile === 'secret_door') return playerVersion ? '#2a323d' : '#8b59d3';
  if (tile === 'trap') return playerVersion ? '#aab4be' : '#c94d4d';
  if (tile === 'hazard') return '#69894f';
  if (tile === 'stairs_up') return '#52ab72';
  return '#4f8fd1';
}

function exportTileColor(tile: TileType, playerVersion: boolean): string {
  if (tile === 'empty') return '#ffffff';
  if (tile === 'wall') return '#4a4a4a';
  if (tile === 'floor') return '#f6f6f4';
  if (tile === 'door') return '#7b5b2a';
  if (tile === 'secret_door') return playerVersion ? '#4a4a4a' : '#6d52a8';
  if (tile === 'trap') return playerVersion ? '#f6f6f4' : '#b74747';
  if (tile === 'hazard') return '#8a8f57';
  if (tile === 'stairs_up') return '#3f8a60';
  return '#3e73ad';
}

const TILE_LEGEND: { tile: TileType; label: string }[] = [
  { tile: 'floor', label: 'Floor' },
  { tile: 'wall', label: 'Wall' },
  { tile: 'door', label: 'Door' },
  { tile: 'secret_door', label: 'Secret Door' },
  { tile: 'trap', label: 'Trap' },
  { tile: 'hazard', label: 'Hazard' },
  { tile: 'stairs_up', label: 'Stairs Up' },
  { tile: 'stairs_down', label: 'Stairs Down' },
];
const TILE_PALETTE: { value: PaletteTile; label: string; previewTile?: TileType }[] = [
  { value: 'door_toggle', label: 'Door Toggle', previewTile: 'door' },
  { value: 'floor', label: 'Floor' },
  { value: 'wall', label: 'Wall' },
  { value: 'door', label: 'Door' },
  { value: 'secret_door', label: 'Secret Door' },
  { value: 'trap', label: 'Trap' },
  { value: 'hazard', label: 'Hazard' },
  { value: 'stairs_up', label: 'Stairs Up' },
  { value: 'stairs_down', label: 'Stairs Down' },
  { value: 'empty', label: 'Empty' },
];
const TILE_SIZE = 14;
const DND_TILE_MM = 25.4;

async function ensureDungeonSchemaColumns(): Promise<void> {
  const dungeonCols = await atlas.db.query<RawRow>('PRAGMA table_info(dungeons)');
  const roomCols = await atlas.db.query<RawRow>('PRAGMA table_info(dungeon_rooms)');
  const dungeonNames = new Set(dungeonCols.map((c) => String(c.name)));
  const roomNames = new Set(roomCols.map((c) => String(c.name)));

  if (!dungeonNames.has('grid_width')) {
    await atlas.db.run('ALTER TABLE dungeons ADD COLUMN grid_width INTEGER');
  }
  if (!dungeonNames.has('grid_height')) {
    await atlas.db.run('ALTER TABLE dungeons ADD COLUMN grid_height INTEGER');
  }
  if (!dungeonNames.has('grid_json')) {
    await atlas.db.run('ALTER TABLE dungeons ADD COLUMN grid_json TEXT');
  }
  if (!dungeonNames.has('generation_seed')) {
    await atlas.db.run('ALTER TABLE dungeons ADD COLUMN generation_seed TEXT');
  }
  if (!dungeonNames.has('generation_config')) {
    await atlas.db.run('ALTER TABLE dungeons ADD COLUMN generation_config TEXT');
  }

  if (!roomNames.has('width')) {
    await atlas.db.run('ALTER TABLE dungeon_rooms ADD COLUMN width INTEGER NOT NULL DEFAULT 0');
  }
  if (!roomNames.has('height')) {
    await atlas.db.run('ALTER TABLE dungeon_rooms ADD COLUMN height INTEGER NOT NULL DEFAULT 0');
  }
  if (!roomNames.has('shape')) {
    await atlas.db.run("ALTER TABLE dungeon_rooms ADD COLUMN shape TEXT NOT NULL DEFAULT 'rectangle'");
  }
  if (!roomNames.has('tags')) {
    await atlas.db.run("ALTER TABLE dungeon_rooms ADD COLUMN tags TEXT NOT NULL DEFAULT '[]'");
  }
}

function GridCanvas({
  dungeon,
  showGrid,
  showLabels,
  playerVersion,
  editable,
  onTileEdit,
  onAreaEdit,
}: {
  dungeon: Dungeon;
  showGrid: boolean;
  showLabels: boolean;
  playerVersion: boolean;
  editable: boolean;
  onTileEdit: (x: number, y: number, modifiers: { shift: boolean; ctrl: boolean }) => void;
  onAreaEdit: (
    start: { x: number; y: number },
    end: { x: number; y: number },
    modifiers: { shift: boolean; ctrl: boolean },
  ) => void;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 10, y: 10 });
  const zoomRef = useRef(zoom);
  const panRef = useRef(pan);
  const [previewRect, setPreviewRect] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const drag = useRef({ active: false, moved: false, x: 0, y: 0 });
  const draw = useRef<{ active: boolean; start: { x: number; y: number } | null; current: { x: number; y: number } | null }>({
    active: false,
    start: null,
    current: null,
  });

  const screenToTile = useCallback((clientX: number, clientY: number): { x: number; y: number } | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const currentZoom = zoomRef.current;
    const worldX = (clientX - rect.left) / currentZoom;
    const worldY = (clientY - rect.top) / currentZoom;
    const tx = Math.floor(worldX / TILE_SIZE);
    const ty = Math.floor(worldY / TILE_SIZE);
    if (tx < 0 || ty < 0 || tx >= dungeon.grid.width || ty >= dungeon.grid.height) return null;
    return { x: tx, y: ty };
  }, [dungeon.grid.height, dungeon.grid.width]);

  useEffect(() => {
    zoomRef.current = zoom;
    panRef.current = pan;
  }, [zoom, pan]);

  const mapWidth = dungeon.grid.width * TILE_SIZE;
  const mapHeight = dungeon.grid.height * TILE_SIZE;
  const tilePaths = useMemo(() => buildTilePaths(dungeon.grid, TILE_SIZE), [dungeon.grid]);
  const gridPath = useMemo(
    () => (showGrid ? buildGridPath(dungeon.grid.width, dungeon.grid.height, TILE_SIZE) : ''),
    [dungeon.grid.width, dungeon.grid.height, showGrid],
  );
  const previewMetrics = useMemo(() => {
    if (!previewRect) return null;
    const minX = Math.min(previewRect.x1, previewRect.x2);
    const minY = Math.min(previewRect.y1, previewRect.y2);
    const widthTiles = Math.abs(previewRect.x2 - previewRect.x1) + 1;
    const heightTiles = Math.abs(previewRect.y2 - previewRect.y1) + 1;
    return {
      x: minX * TILE_SIZE,
      y: minY * TILE_SIZE,
      width: widthTiles * TILE_SIZE,
      height: heightTiles * TILE_SIZE,
    };
  }, [previewRect]);

  const onWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const wrap = wrapRef.current;
    const svg = svgRef.current;
    if (!wrap || !svg) {
      const next = clamp(zoomRef.current + (e.deltaY < 0 ? 0.1 : -0.1), 0.3, 3);
      zoomRef.current = next;
      setZoom(next);
      return;
    }

    const wrapRect = wrap.getBoundingClientRect();
    const svgRect = svg.getBoundingClientRect();
    const currentZoom = zoomRef.current;
    const nextZoom = clamp(currentZoom + (e.deltaY < 0 ? 0.1 : -0.1), 0.3, 3);

    // Compute world point under cursor using actual transformed svg bounds.
    const worldX = (e.clientX - svgRect.left) / currentZoom;
    const worldY = (e.clientY - svgRect.top) / currentZoom;

    // Re-anchor transformed svg so the same world point stays under cursor.
    const nextSvgLeft = e.clientX - (worldX * nextZoom);
    const nextSvgTop = e.clientY - (worldY * nextZoom);
    const nextPanX = nextSvgLeft - wrapRect.left;
    const nextPanY = nextSvgTop - wrapRect.top;

    zoomRef.current = nextZoom;
    panRef.current = { x: nextPanX, y: nextPanY };
    setZoom(nextZoom);
    setPan({ x: nextPanX, y: nextPanY });
  }, []);
  const onDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (editable && e.button === 0) {
      const tile = screenToTile(e.clientX, e.clientY);
      draw.current = { active: true, start: tile, current: tile };
      if (tile) setPreviewRect({ x1: tile.x, y1: tile.y, x2: tile.x, y2: tile.y });
      return;
    }
    drag.current = { active: true, moved: false, x: e.clientX, y: e.clientY };
  }, [editable, screenToTile]);
  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (draw.current.active) {
      e.preventDefault();
      const tile = screenToTile(e.clientX, e.clientY);
      if (tile) {
        draw.current.current = tile;
        const start = draw.current.start;
        if (start) setPreviewRect({ x1: start.x, y1: start.y, x2: tile.x, y2: tile.y });
      }
      return;
    }
    if (!drag.current.active) return;
    const dx = e.clientX - drag.current.x; const dy = e.clientY - drag.current.y;
    if (Math.abs(dx) > 1 || Math.abs(dy) > 1) drag.current.moved = true;
    drag.current = { active: true, moved: drag.current.moved, x: e.clientX, y: e.clientY };
    setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
  }, [screenToTile]);
  const onUp = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (draw.current.active) {
      const start = draw.current.start;
      const end = draw.current.current ?? screenToTile(e.clientX, e.clientY);
      draw.current = { active: false, start: null, current: null };
      setPreviewRect(null);
      if (start && end) {
        if (start.x === end.x && start.y === end.y) {
          onTileEdit(start.x, start.y, { shift: e.shiftKey, ctrl: e.ctrlKey || e.metaKey });
        } else {
          onAreaEdit(start, end, { shift: e.shiftKey, ctrl: e.ctrlKey || e.metaKey });
        }
      }
      return;
    }
    drag.current.active = false;
  }, [onAreaEdit, onTileEdit, screenToTile]);

  return (
    <div
      ref={wrapRef}
      className={styles.canvasWrap}
      onWheel={onWheel}
      onMouseDown={onDown}
      onMouseMove={onMove}
      onMouseUp={onUp}
      onMouseLeave={onUp}
      onContextMenu={(e) => { if (editable) e.preventDefault(); }}
    >
      <svg
        ref={svgRef}
        className={styles.canvasSvg}
        width={mapWidth}
        height={mapHeight}
        viewBox={`0 0 ${mapWidth} ${mapHeight}`}
        style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: 'top left' }}
      >
        <rect x={0} y={0} width={mapWidth} height={mapHeight} fill="#11171f" />
        {TILE_RENDER_ORDER.map((tileType) => {
          const d = tilePaths[tileType];
          if (!d) return null;
          return (
            <path
              key={tileType}
              d={d}
              fill={tileColor(tileType, playerVersion)}
              shapeRendering="crispEdges"
            />
          );
        })}
        {showGrid && (
          <path d={gridPath} fill="none" stroke="rgba(35,42,49,0.5)" strokeWidth={1} shapeRendering="crispEdges" />
        )}
        {showLabels && dungeon.rooms.map((room) => {
          const cx = (room.x + (room.width / 2)) * TILE_SIZE;
          const cy = (room.y + (room.height / 2)) * TILE_SIZE;
          return (
            <g key={room.id}>
              <rect x={cx - 45} y={cy - 8} width={90} height={16} fill="rgba(10, 12, 14, 0.7)" />
              <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fill="#dce2e8" fontFamily="monospace" fontSize={11}>{room.label}</text>
            </g>
          );
        })}
        {previewMetrics && (
          <rect
            x={previewMetrics.x + 1}
            y={previewMetrics.y + 1}
            width={Math.max(0, previewMetrics.width - 2)}
            height={Math.max(0, previewMetrics.height - 2)}
            fill="rgba(255, 214, 128, 0.15)"
            stroke="rgba(255, 214, 128, 0.96)"
            strokeWidth={2}
            strokeDasharray="6 4"
          />
        )}
      </svg>
    </div>
  );
}

export default function DungeonView() {
  const campaign = useCampaignStore((s) => s.campaign);
  const [name, setName] = useState(''); const [seed, setSeed] = useState('');
  const [theme, setTheme] = useState<DungeonTheme>('crypt');
  const [gridW, setGridW] = useState(80); const [gridH, setGridH] = useState(80);
  const [roomCount, setRoomCount] = useState(16); const [minRoom, setMinRoom] = useState(6); const [maxRoom, setMaxRoom] = useState(12);
  const [density, setDensity] = useState(0.35); const [spacing, setSpacing] = useState(1); const [allowLoops, setAllowLoops] = useState(true);
  const [showGrid, setShowGrid] = useState(true); const [showLabels, setShowLabels] = useState(true); const [playerVersion, setPlayerVersion] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [paletteTile, setPaletteTile] = useState<PaletteTile>('door_toggle');
  const [list, setList] = useState<Dungeon[]>([]); const [active, setActive] = useState<Dungeon | null>(null);
  const [error, setError] = useState<string | null>(null); const [loading, setLoading] = useState(false);
  const persistTimerRef = useRef<number | null>(null);
  const pendingPersistRef = useRef<Dungeon | null>(null);
  const undoStackRef = useRef<DungeonEditSnapshot[]>([]);
  const isUndoingRef = useRef(false);

  const loadList = useCallback(async () => {
    if (!campaign) return;
    const rows = await atlas.db.query<RawRow>('SELECT * FROM dungeons WHERE campaign_id = ? ORDER BY created_at DESC', [campaign.id]);
    setList(rows.map((r) => ({
      id: r.id as string, name: r.name as string, theme: (r.theme as DungeonTheme) ?? 'crypt', roomCount: (r.room_count as number) ?? 0, createdAt: r.created_at as string,
      seed: (r.generation_seed as string) ?? '', grid: r.grid_json ? (JSON.parse(r.grid_json as string) as DungeonGrid) : { width: 0, height: 0, tiles: [] }, rooms: [], doors: [],
      generationConfig: r.generation_config ? ((JSON.parse(r.generation_config as string) as { config: Dungeon['generationConfig'] }).config) : { theme: (r.theme as DungeonTheme) ?? 'crypt', roomCount: (r.room_count as number) ?? 0, width: 80, height: 80, roomSizeRange: [6, 12], corridorDensity: 0.35, allowLoops: true, spacing: 1 },
    })));
  }, [campaign]);
  useEffect(() => { loadList().catch((e) => setError(e instanceof Error ? e.message : String(e))); }, [loadList]);

  const loadDungeon = useCallback(async (id: string): Promise<Dungeon | null> => {
    const [row] = await atlas.db.query<RawRow>('SELECT * FROM dungeons WHERE id = ?', [id]);
    if (!row) return null;
    const roomRows = await atlas.db.query<RawRow>('SELECT * FROM dungeon_rooms WHERE dungeon_id = ?', [id]);
    const contentRows = await atlas.db.query<RawRow>(`SELECT dc.* FROM dungeon_contents dc JOIN dungeon_rooms dr ON dr.id = dc.room_id WHERE dr.dungeon_id = ?`, [id]);
    const byRoom = new Map<string, DungeonContent[]>();
    for (const c of contentRows) {
      const roomId = c.room_id as string;
      const bucket = byRoom.get(roomId) ?? [];
      bucket.push({ id: c.id as string, roomId, contentType: c.content_type as ContentType, payload: JSON.parse(c.payload as string) as Record<string, unknown> });
      byRoom.set(roomId, bucket);
    }
    const cfg = row.generation_config ? (JSON.parse(row.generation_config as string) as { config?: Dungeon['generationConfig']; doors?: DungeonDoor[] }) : {};
    return {
      id: row.id as string, name: row.name as string, theme: (row.theme as DungeonTheme) ?? 'crypt', roomCount: (row.room_count as number) ?? roomRows.length, createdAt: row.created_at as string,
      seed: (row.generation_seed as string) ?? (row.id as string), grid: row.grid_json ? (JSON.parse(row.grid_json as string) as DungeonGrid) : { width: 0, height: 0, tiles: [] },
      doors: cfg.doors ?? [],
      generationConfig: cfg.config ?? { theme: (row.theme as DungeonTheme) ?? 'crypt', roomCount: 12, width: 80, height: 80, roomSizeRange: [6, 12], corridorDensity: 0.35, allowLoops: true, spacing: 1 },
      rooms: roomRows.map((rr) => ({
        id: rr.id as string, dungeonId: rr.dungeon_id as string, type: (rr.type as 'room' | 'hallway') ?? 'room', label: (rr.label as string) ?? 'Room', size: (rr.size as 'small' | 'medium' | 'large') ?? 'medium',
        x: (rr.x as number) ?? 0, y: (rr.y as number) ?? 0, width: (rr.width as number) ?? 8, height: (rr.height as number) ?? 8, shape: (rr.shape as RoomShape) ?? 'rectangle',
        tags: rr.tags ? (JSON.parse(rr.tags as string) as string[]) : [], connections: JSON.parse((rr.connections as string) ?? '[]') as string[],
        isBoss: (rr.is_boss as number) === 1, isEntrance: (rr.is_entrance as number) === 1, contents: byRoom.get(rr.id as string) ?? [],
      })),
    };
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!campaign) return;
    setLoading(true); setError(null);
    try {
      await ensureDungeonSchemaColumns();
      const id = crypto.randomUUID();
      const d = generateDungeon(id, { name, seed: seed || undefined, theme, roomCount, width: gridW, height: gridH, roomSizeRange: [minRoom, maxRoom], corridorDensity: density, allowLoops, spacing });
      await atlas.db.run(
        `INSERT INTO dungeons (id, campaign_id, name, theme, room_count, grid_width, grid_height, grid_json, generation_seed, generation_config, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [d.id, campaign.id, d.name, d.theme, d.roomCount, d.grid.width, d.grid.height, JSON.stringify(d.grid), d.seed, JSON.stringify({ config: d.generationConfig, doors: d.doors }), d.createdAt],
      );
      for (const room of d.rooms) {
        await atlas.db.run(
          `INSERT INTO dungeon_rooms (id, dungeon_id, type, label, size, x, y, width, height, shape, tags, connections, is_boss, is_entrance)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [room.id, d.id, room.type, room.label, room.size, room.x, room.y, room.width, room.height, room.shape, JSON.stringify(room.tags), JSON.stringify(room.connections), room.isBoss ? 1 : 0, room.isEntrance ? 1 : 0],
        );
        for (const content of room.contents) {
          await atlas.db.run('INSERT INTO dungeon_contents (id, room_id, content_type, payload) VALUES (?, ?, ?, ?)', [content.id, room.id, content.contentType, JSON.stringify(content.payload)]);
        }
      }
      setActive(d); setSeed(d.seed); await loadList();
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); } finally { setLoading(false); }
  }, [allowLoops, campaign, density, gridH, gridW, loadList, maxRoom, minRoom, name, roomCount, seed, spacing, theme]);

  const persistDungeonEdits = useCallback(async (dungeon: Dungeon) => {
    if (!campaign) return;
    await atlas.db.run(
      `UPDATE dungeons
       SET grid_width = ?, grid_height = ?, grid_json = ?, generation_config = ?
       WHERE id = ? AND campaign_id = ?`,
      [
        dungeon.grid.width,
        dungeon.grid.height,
        JSON.stringify(dungeon.grid),
        JSON.stringify({ config: dungeon.generationConfig, doors: dungeon.doors }),
        dungeon.id,
        campaign.id,
      ],
    );
  }, [campaign]);

  const schedulePersistDungeonEdits = useCallback((dungeon: Dungeon) => {
    pendingPersistRef.current = dungeon;
    if (persistTimerRef.current !== null) {
      window.clearTimeout(persistTimerRef.current);
    }
    persistTimerRef.current = window.setTimeout(() => {
      const next = pendingPersistRef.current;
      if (!next) return;
      void persistDungeonEdits(next).catch((e) => {
        setError(e instanceof Error ? e.message : String(e));
      });
      pendingPersistRef.current = null;
      persistTimerRef.current = null;
    }, 180);
  }, [persistDungeonEdits]);

  useEffect(() => () => {
    if (persistTimerRef.current !== null) {
      window.clearTimeout(persistTimerRef.current);
      persistTimerRef.current = null;
    }
  }, []);

  const applyTileChanges = useCallback((prev: Dungeon, changes: Array<{ x: number; y: number; tile: TileType }>): Dungeon => {
    if (!changes.length) return prev;
    const tiles = prev.grid.tiles.map((row) => row.slice());
    let doors = [...prev.doors];

    for (const change of changes) {
      if (change.x < 0 || change.y < 0 || change.x >= prev.grid.width || change.y >= prev.grid.height) continue;
      tiles[change.y][change.x] = change.tile;
      doors = doors.filter((door) => !(door.x === change.x && door.y === change.y));
    }

    let seq = 0;
    for (const change of changes) {
      if (change.tile !== 'door' && change.tile !== 'secret_door') continue;
      doors.push({
        id: `manual_${change.x}_${change.y}_${Date.now()}_${seq++}`,
        x: change.x,
        y: change.y,
        roomIds: [],
        locked: false,
        hidden: change.tile === 'secret_door',
      });
    }

    return { ...prev, grid: { ...prev.grid, tiles }, doors };
  }, []);

  const handleTileEdit = useCallback((x: number, y: number, modifiers: { shift: boolean; ctrl: boolean }) => {
    setActive((prev) => {
      if (!prev) return prev;
      const current = prev.grid.tiles[y]?.[x];
      if (!current) return prev;

      let next: TileType = current;
      if (modifiers.ctrl) {
        next = 'wall';
      } else if (modifiers.shift) {
        next = 'secret_door';
      } else {
        next = paletteTile === 'door_toggle'
          ? (current === 'door' || current === 'secret_door' ? 'floor' : 'door')
          : paletteTile;
      }

      if (next === current) return prev;
      if (!isUndoingRef.current) {
        undoStackRef.current.push({
          grid: {
            width: prev.grid.width,
            height: prev.grid.height,
            tiles: prev.grid.tiles.map((row) => row.slice()),
          },
          doors: prev.doors.map((door) => ({ ...door })),
        });
        if (undoStackRef.current.length > 80) {
          undoStackRef.current.shift();
        }
      }
      const updated = applyTileChanges(prev, [{ x, y, tile: next }]);

      schedulePersistDungeonEdits(updated);

      return updated;
    });
  }, [applyTileChanges, paletteTile, schedulePersistDungeonEdits]);

  const handleAreaEdit = useCallback((
    start: { x: number; y: number },
    end: { x: number; y: number },
    modifiers: { shift: boolean; ctrl: boolean },
  ) => {
    setActive((prev) => {
      if (!prev) return prev;
      const minX = Math.min(start.x, end.x);
      const maxX = Math.max(start.x, end.x);
      const minY = Math.min(start.y, end.y);
      const maxY = Math.max(start.y, end.y);
      const changes: Array<{ x: number; y: number; tile: TileType }> = [];

      // Ctrl-drag paints walls. Shift-drag paints secret doors.
      if (modifiers.ctrl || modifiers.shift) {
        const tile = modifiers.ctrl ? 'wall' : 'secret_door';
        for (let y = minY; y <= maxY; y++) {
          for (let x = minX; x <= maxX; x++) {
            changes.push({ x, y, tile });
          }
        }
      } else if (paletteTile === 'floor' || paletteTile === 'door_toggle') {
        // Room draw: perimeter wall, interior floor.
        for (let y = minY; y <= maxY; y++) {
          for (let x = minX; x <= maxX; x++) {
            const edge = x === minX || x === maxX || y === minY || y === maxY;
            changes.push({ x, y, tile: edge ? 'wall' : 'floor' });
          }
        }
      } else {
        const fillTile = paletteTile as TileType;
        for (let y = minY; y <= maxY; y++) {
          for (let x = minX; x <= maxX; x++) {
            changes.push({ x, y, tile: fillTile });
          }
        }
      }

      const updated = applyTileChanges(prev, changes);
      if (!isUndoingRef.current) {
        undoStackRef.current.push({
          grid: {
            width: prev.grid.width,
            height: prev.grid.height,
            tiles: prev.grid.tiles.map((row) => row.slice()),
          },
          doors: prev.doors.map((door) => ({ ...door })),
        });
        if (undoStackRef.current.length > 80) {
          undoStackRef.current.shift();
        }
      }
      schedulePersistDungeonEdits(updated);
      return updated;
    });
  }, [applyTileChanges, paletteTile, schedulePersistDungeonEdits]);

  const handleUndo = useCallback(() => {
    setActive((prev) => {
      if (!prev) return prev;
      const snapshot = undoStackRef.current.pop();
      if (!snapshot) return prev;
      isUndoingRef.current = true;
      const restored: Dungeon = {
        ...prev,
        grid: {
          width: snapshot.grid.width,
          height: snapshot.grid.height,
          tiles: snapshot.grid.tiles.map((row) => row.slice()),
        },
        doors: snapshot.doors.map((door) => ({ ...door })),
      };
      schedulePersistDungeonEdits(restored);
      isUndoingRef.current = false;
      return restored;
    });
  }, [schedulePersistDungeonEdits]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!editMode || playerVersion) return;
      const key = event.key.toLowerCase();
      if ((event.ctrlKey || event.metaKey) && key === 'z') {
        event.preventDefault();
        handleUndo();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [editMode, handleUndo, playerVersion]);

  const activeView = useMemo(() => (active ? (playerVersion ? playerMap(active) : active) : null), [active, playerVersion]);
  useEffect(() => {
    undoStackRef.current = [];
  }, [active?.id]);
  const summary = useMemo(() => {
    if (!activeView) return null;
    const traps = activeView.rooms.flatMap((r) => r.contents).filter((c) => c.contentType === 'trap').length;
    const loot = activeView.rooms.flatMap((r) => r.contents).filter((c) => c.contentType === 'loot').length;
    return { rooms: activeView.rooms.length, doors: activeView.doors.length, traps, loot, boss: activeView.rooms.find((r) => r.isBoss)?.label ?? 'None' };
  }, [activeView]);

  return (
    <div className={styles.root}>
      <aside className={styles.sidebar}>
        <h2>Dungeon</h2>
        <label>Name</label><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Optional" />
        <label>Seed</label>
        <div className={styles.seedRow}>
          <input value={seed} onChange={(e) => setSeed(e.target.value)} placeholder="Deterministic seed" />
          <button type="button" onClick={() => setSeed(crypto.randomUUID().slice(0, 12))}>Randomize</button>
        </div>
        <label>Theme</label>
        <select value={theme} onChange={(e) => setTheme(e.target.value as DungeonTheme)}>
          <option value="crypt">Crypt</option><option value="cave">Cave</option><option value="fortress">Fortress</option>
          <option value="sewer">Sewer</option><option value="ruins">Ruins</option><option value="arcane_lab">Arcane Lab</option>
        </select>
        <label>Grid Width {gridW}</label><input type="range" min={20} max={220} value={gridW} onChange={(e) => setGridW(Number(e.target.value))} />
        <label>Grid Height {gridH}</label><input type="range" min={20} max={220} value={gridH} onChange={(e) => setGridH(Number(e.target.value))} />
        <label>Room Count {roomCount}</label><input type="range" min={3} max={80} value={roomCount} onChange={(e) => setRoomCount(Number(e.target.value))} />
        <label>Min Room {minRoom}</label><input type="range" min={4} max={20} value={minRoom} onChange={(e) => setMinRoom(Number(e.target.value))} />
        <label>Max Room {maxRoom}</label><input type="range" min={6} max={40} value={maxRoom} onChange={(e) => setMaxRoom(Number(e.target.value))} />
        <label>Corridor Density {density.toFixed(2)}</label><input type="range" min={0} max={1} step={0.01} value={density} onChange={(e) => setDensity(Number(e.target.value))} />
        <label>Spacing {spacing}</label><input type="range" min={1} max={3} value={spacing} onChange={(e) => setSpacing(Number(e.target.value))} />
        <label className={styles.checkboxRow}><input type="checkbox" checked={allowLoops} onChange={(e) => setAllowLoops(e.target.checked)} />Allow loops</label>
        <button disabled={loading || !campaign} onClick={handleGenerate}>{loading ? 'Generating...' : 'Generate Dungeon'}</button>
        {active && <button className={styles.deleteButton} onClick={async () => { if (!campaign) return; await atlas.db.run('DELETE FROM dungeons WHERE id = ? AND campaign_id = ?', [active.id, campaign.id]); setActive(null); await loadList(); }}>Delete Active</button>}
        <div className={styles.savedList}>
          <h3>Saved</h3>
          {list.map((d) => <button key={d.id} className={active?.id === d.id ? styles.savedActive : ''} onClick={() => loadDungeon(d.id).then((x) => x && setActive(x)).catch((e) => setError(e instanceof Error ? e.message : String(e)))}>{d.name}</button>)}
        </div>
      </aside>

      <main className={styles.main}>
        <div className={styles.topBar}>
          <label className={styles.checkboxRow}><input type="checkbox" checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} />Grid</label>
          <label className={styles.checkboxRow}><input type="checkbox" checked={showLabels} onChange={(e) => setShowLabels(e.target.checked)} />Labels</label>
          <label className={styles.checkboxRow}><input type="checkbox" checked={playerVersion} onChange={(e) => setPlayerVersion(e.target.checked)} />Player Version</label>
          <label className={styles.checkboxRow}><input type="checkbox" checked={editMode} onChange={(e) => setEditMode(e.target.checked)} />Edit Tiles</label>
          {active && <>
            <button
              onClick={() => {
                exportGmPdf(active);
              }}
            >
              Export GM PDF
            </button>
            <button
              onClick={() => {
                const playerCanvas = buildMapCanvas(active, { playerVersion: true, showGrid: true, showRoomNumbers: false, printerFriendly: true });
                exportCanvasPng(`${active.name.replace(/\s+/g, '_')}_Player_Map.png`, playerCanvas);
              }}
            >
              Export Player Map
            </button>
            <button
              onClick={() => {
                const gmSvg = buildMapSvgMarkup(active, {
                  playerVersion: false,
                  showGrid: true,
                  showRoomNumbers: true,
                  printerFriendly: true,
                  tileSize: DND_TILE_MM,
                  tileSizeMm: DND_TILE_MM,
                });
                exportSvg(`${active.name.replace(/\s+/g, '_')}_GM_Map.svg`, gmSvg);
              }}
            >
              Export GM SVG
            </button>
            <button
              onClick={() => {
                const cncSvg = buildMapSvgMarkup(active, {
                  playerVersion: false,
                  showGrid: true,
                  showRoomNumbers: false,
                  printerFriendly: true,
                  tileSize: DND_TILE_MM,
                  tileSizeMm: DND_TILE_MM,
                  cncLayers: true,
                });
                exportSvg(`${active.name.replace(/\s+/g, '_')}_CNC_1in.svg`, cncSvg);
              }}
            >
              Export CNC SVG
            </button>
          </>}
        </div>
        {editMode && !playerVersion && (
          <div className={styles.paletteBar}>
            {TILE_PALETTE.map((item) => (
              <button
                key={item.value}
                type="button"
                className={`${styles.paletteBtn} ${paletteTile === item.value ? styles.paletteBtnActive : ''}`}
                onClick={() => setPaletteTile(item.value)}
              >
                <span className={styles.paletteSwatch} style={{ background: tileColor(item.previewTile ?? (item.value === 'door_toggle' ? 'door' : item.value), false) }} />
                {item.label}
              </button>
            ))}
          </div>
        )}
        {editMode && !playerVersion && <div className={styles.editHint}>Edit mode: click paints selected tile. Drag draws an area (floor/door-toggle draws a room with wall perimeter). Shift+click/drag sets secret door. Ctrl+click/drag sets wall. Ctrl+Z undoes the last edit.</div>}
        {editMode && playerVersion && <div className={styles.editHint}>Disable Player Version to edit hidden/door tiles accurately.</div>}
        {error && <div className={styles.error}>{error}</div>}
        {!activeView ? <div className={styles.empty}>Generate or load a dungeon.</div> : <GridCanvas dungeon={activeView} showGrid={showGrid} showLabels={showLabels} playerVersion={playerVersion} editable={editMode && !playerVersion} onTileEdit={handleTileEdit} onAreaEdit={handleAreaEdit} />}
      </main>

      <aside className={styles.details}>
        <h3>Summary</h3>
        {!summary ? <p>No dungeon selected.</p> : <>
          <p>Rooms: {summary.rooms}</p><p>Doors: {summary.doors}</p><p>Trap entries: {summary.traps}</p><p>Loot entries: {summary.loot}</p><p>Boss: {summary.boss}</p>
          {activeView && <><h4>Generation</h4><p>Seed: {activeView.seed}</p><p>Grid: {activeView.grid.width} x {activeView.grid.height}</p><p>Loops: {activeView.generationConfig.allowLoops ? 'enabled' : 'disabled'}</p></>}
        </>}
        <h4>Tile Legend</h4>
        <div className={styles.legendList}>
          {TILE_LEGEND.map((item) => (
            <div key={item.tile} className={styles.legendItem}>
              <span className={styles.legendSwatch} style={{ background: tileColor(item.tile, playerVersion) }} />
              <span>{item.label}</span>
            </div>
          ))}
        </div>
        {playerVersion && <p className={styles.legendNote}>Player view hides secret doors and trap coloring.</p>}
      </aside>
    </div>
  );
}
