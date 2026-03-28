import type {
  CorridorEventPayload,
  Dungeon,
  DungeonContent,
  DungeonDoor,
  DungeonGrid,
  DungeonModifier,
  DungeonRoom,
  DungeonRoomContent,
  DungeonRoomMetadata,
  DungeonTheme,
  EncounterContentPayload,
  EncounterTier,
  EnvironmentalFeaturePayload,
  GenerateDungeonInput,
  LootContentPayload,
  LootFlavorPayload,
  LootKindPayload,
  LootTier,
  RoomShape,
  RoomPurposeMetadata,
  RoomSize,
  TrapComponentPayload,
  TrapContentPayload,
  TileType,
} from './types';
import {
  chainTags,
  extractFromChain,
  rollCorridorEvent,
  rollDungeonModifier,
  rollEncounterTier,
  rollEnvironmentalFeature,
  rollLootChain,
  rollRoomPurpose,
  rollTrapChain,
  type LootTemplateRoll,
  type TrapTemplateRoll,
} from './randomTables';

interface Point {
  x: number;
  y: number;
}

interface ThemeDef {
  roomShapeWeights: Record<RoomShape, number>;
  corridorWidthRange: [number, number];
  baseTrapChance: number;
  baseHazardChance: number;
}

const THEMES: Record<DungeonTheme, ThemeDef> = {
  crypt: {
    roomShapeWeights: { rectangle: 0.55, circle: 0.3, irregular: 0.15 },
    corridorWidthRange: [1, 2],
    baseTrapChance: 0.16,
    baseHazardChance: 0.06,
  },
  cave: {
    roomShapeWeights: { rectangle: 0.2, circle: 0.25, irregular: 0.55 },
    corridorWidthRange: [2, 3],
    baseTrapChance: 0.08,
    baseHazardChance: 0.14,
  },
  fortress: {
    roomShapeWeights: { rectangle: 0.75, circle: 0.15, irregular: 0.1 },
    corridorWidthRange: [1, 2],
    baseTrapChance: 0.12,
    baseHazardChance: 0.05,
  },
  sewer: {
    roomShapeWeights: { rectangle: 0.4, circle: 0.3, irregular: 0.3 },
    corridorWidthRange: [2, 3],
    baseTrapChance: 0.1,
    baseHazardChance: 0.18,
  },
  ruins: {
    roomShapeWeights: { rectangle: 0.45, circle: 0.25, irregular: 0.3 },
    corridorWidthRange: [1, 2],
    baseTrapChance: 0.14,
    baseHazardChance: 0.09,
  },
  arcane_lab: {
    roomShapeWeights: { rectangle: 0.5, circle: 0.35, irregular: 0.15 },
    corridorWidthRange: [1, 2],
    baseTrapChance: 0.18,
    baseHazardChance: 0.1,
  },
};

interface InternalRoom {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  shape: RoomShape;
  tags: string[];
  center: Point;
  connections: string[];
  isBoss: boolean;
  isEntrance: boolean;
}

interface Edge {
  a: string;
  b: string;
  weight: number;
}

function makePrng(seed: number) {
  let s = seed >>> 0;
  return function rand(): number {
    s += 0x6d2b79f5;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFromString(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function makeIdFactory(prefix: string, namespace: string): () => string {
  let n = 0;
  return () => `${namespace}_${prefix}_${(n++).toString(36).padStart(3, '0')}`;
}

function weightedPick<T extends string>(weights: Record<T, number>, rand: () => number): T {
  const entries = Object.entries(weights) as [T, number][];
  const total = entries.reduce((sum, [, w]) => sum + Math.max(0, w), 0);
  let roll = rand() * (total || 1);
  for (const [key, w] of entries) {
    roll -= Math.max(0, w);
    if (roll <= 0) return key;
  }
  const first = entries[0];
  if (!first) {
    throw new Error('Cannot pick from empty weights');
  }
  return first[0];
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function randomInt(min: number, max: number, rand: () => number): number {
  return Math.floor(rand() * (max - min + 1)) + min;
}

function sizeFromDimensions(width: number, height: number): RoomSize {
  const area = width * height;
  if (area <= 45) return 'small';
  if (area <= 90) return 'medium';
  return 'large';
}

function inBounds(grid: DungeonGrid, x: number, y: number): boolean {
  return y >= 0 && y < grid.height && x >= 0 && x < grid.width;
}

function setTile(grid: DungeonGrid, x: number, y: number, type: TileType): void {
  if (inBounds(grid, x, y)) {
    grid.tiles[y]![x] = type;
  }
}

function distance(a: Point, b: Point): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function roomOverlaps(candidate: InternalRoom, rooms: InternalRoom[], spacing: number): boolean {
  const left = candidate.x - spacing;
  const right = candidate.x + candidate.width + spacing;
  const top = candidate.y - spacing;
  const bottom = candidate.y + candidate.height + spacing;

  return rooms.some((room) => {
    const roomLeft = room.x;
    const roomRight = room.x + room.width;
    const roomTop = room.y;
    const roomBottom = room.y + room.height;
    return left < roomRight && right > roomLeft && top < roomBottom && bottom > roomTop;
  });
}

function roomContains(room: InternalRoom, x: number, y: number): boolean {
  if (x < room.x || y < room.y || x >= room.x + room.width || y >= room.y + room.height) {
    return false;
  }

  if (room.shape === 'rectangle') {
    return true;
  }

  const cx = room.x + (room.width - 1) / 2;
  const cy = room.y + (room.height - 1) / 2;
  const nx = room.width > 1 ? (x - cx) / (room.width / 2) : 0;
  const ny = room.height > 1 ? (y - cy) / (room.height / 2) : 0;

  if (room.shape === 'circle') {
    return (nx * nx) + (ny * ny) <= 1;
  }

  const jitter = (((x + 31) * 73856093) ^ ((y + 17) * 19349663)) & 3;
  const radiusBias = jitter === 0 ? 0.2 : jitter === 1 ? -0.2 : 0;
  return (nx * nx) + (ny * ny) <= 1 + radiusBias;
}

function carveRoom(grid: DungeonGrid, room: InternalRoom, roomMask: boolean[][]): void {
  for (let y = room.y; y < room.y + room.height; y++) {
    for (let x = room.x; x < room.x + room.width; x++) {
      if (roomContains(room, x, y)) {
        setTile(grid, x, y, 'floor');
        roomMask[y]![x] = true;
      }
    }
  }
}

function collectEdges(rooms: InternalRoom[]): Edge[] {
  const edges: Edge[] = [];
  for (let i = 0; i < rooms.length; i++) {
    for (let j = i + 1; j < rooms.length; j++) {
      const a = rooms[i];
      const b = rooms[j];
      if (!a || !b) continue;
      edges.push({
        a: a.id,
        b: b.id,
        weight: distance(a.center, b.center),
      });
    }
  }
  edges.sort((a, b) => a.weight - b.weight);
  return edges;
}

function buildMst(roomIds: string[], edges: Edge[]): Edge[] {
  const parent = new Map<string, string>();
  for (const id of roomIds) parent.set(id, id);

  function find(id: string): string {
    const p = parent.get(id);
    if (!p || p === id) return id;
    const root = find(p);
    parent.set(id, root);
    return root;
  }

  function union(a: string, b: string): void {
    parent.set(find(a), find(b));
  }

  const mst: Edge[] = [];
  for (const edge of edges) {
    if (find(edge.a) !== find(edge.b)) {
      union(edge.a, edge.b);
      mst.push(edge);
      if (mst.length === roomIds.length - 1) break;
    }
  }
  return mst;
}

function addExtraEdges(
  edges: Edge[],
  base: Edge[],
  roomCount: number,
  corridorDensity: number,
  allowLoops: boolean,
  rand: () => number,
): Edge[] {
  if (!allowLoops) return base;

  const selected = new Set(base.map((e) => `${e.a}:${e.b}`));
  const candidates = edges.filter((e) => !selected.has(`${e.a}:${e.b}`));
  const maxExtras = Math.max(0, Math.floor((roomCount * corridorDensity) / 3));
  const out = [...base];

  for (let i = 0; i < maxExtras && candidates.length > 0; i++) {
    const idx = randomInt(0, candidates.length - 1, rand);
    const [picked] = candidates.splice(idx, 1);
    if (!picked) continue;
    out.push(picked);
  }

  return out;
}

function carveCorridorLine(
  grid: DungeonGrid,
  corridorMask: boolean[][],
  roomMask: boolean[][],
  from: Point,
  to: Point,
  width: number,
): void {
  const dx = Math.sign(to.x - from.x);
  const dy = Math.sign(to.y - from.y);
  let x = from.x;
  let y = from.y;

  while (x !== to.x || y !== to.y) {
    for (let oy = -Math.floor(width / 2); oy <= Math.floor(width / 2); oy++) {
      for (let ox = -Math.floor(width / 2); ox <= Math.floor(width / 2); ox++) {
        const tx = x + ox;
        const ty = y + oy;
        if (!inBounds(grid, tx, ty)) continue;
        if (!roomMask[ty]![tx]) {
          corridorMask[ty]![tx] = true;
          setTile(grid, tx, ty, 'floor');
        }
      }
    }
    if (x !== to.x) x += dx;
    if (y !== to.y) y += dy;
  }
}

function carveCorridor(
  grid: DungeonGrid,
  corridorMask: boolean[][],
  roomMask: boolean[][],
  start: Point,
  end: Point,
  width: number,
  rand: () => number,
): void {
  const cornerFirst = rand() < 0.5;
  if (cornerFirst) {
    carveCorridorLine(grid, corridorMask, roomMask, start, { x: end.x, y: start.y }, width);
    carveCorridorLine(grid, corridorMask, roomMask, { x: end.x, y: start.y }, end, width);
  } else {
    carveCorridorLine(grid, corridorMask, roomMask, start, { x: start.x, y: end.y }, width);
    carveCorridorLine(grid, corridorMask, roomMask, { x: start.x, y: end.y }, end, width);
  }
}

function placeDoors(
  grid: DungeonGrid,
  rooms: InternalRoom[],
  roomMask: boolean[][],
  corridorMask: boolean[][],
  rand: () => number,
  nextId: () => string,
): DungeonDoor[] {
  const dirs: Point[] = [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
  ];

  const doors: DungeonDoor[] = [];
  const seen = new Set<string>();
  const roomById = new Map(rooms.map((r) => [r.id, r]));

  function isDoorCandidate(x: number, y: number): boolean {
    if (!inBounds(grid, x, y) || !roomMask[y]![x]) return false;
    return dirs.some(({ x: dx, y: dy }) => {
      const nx = x + dx;
      const ny = y + dy;
      const px = x - dx;
      const py = y - dy;
      return (
        inBounds(grid, nx, ny) &&
        corridorMask[ny]![nx] &&
        inBounds(grid, px, py) &&
        roomMask[py]![px]
      );
    });
  }

  function corridorDirectionAt(x: number, y: number): Point | null {
    for (const dir of dirs) {
      const nx = x + dir.x;
      const ny = y + dir.y;
      const px = x - dir.x;
      const py = y - dir.y;
      if (
        inBounds(grid, nx, ny) &&
        corridorMask[ny]![nx] &&
        inBounds(grid, px, py) &&
        roomMask[py]![px]
      ) {
        return dir;
      }
    }
    return null;
  }

  function findDoorPoint(room: InternalRoom, toward: Point): Point | null {
    const preferred = nearestEdgePoint(room, toward);
    if (isDoorCandidate(preferred.x, preferred.y)) {
      return preferred;
    }

    let best: Point | null = null;
    let bestDist = Number.POSITIVE_INFINITY;
    for (let y = room.y; y < room.y + room.height; y++) {
      for (let x = room.x; x < room.x + room.width; x++) {
        if (!isDoorCandidate(x, y)) continue;
        const d = Math.abs(x - preferred.x) + Math.abs(y - preferred.y);
        if (d < bestDist) {
          bestDist = d;
          best = { x, y };
        }
      }
    }
    return best;
  }

  for (const room of rooms) {
    for (const connId of room.connections) {
      if (room.id > connId) continue;
      const target = roomById.get(connId);
      if (!target) continue;

      const pair: Array<{ room: InternalRoom; toward: Point }> = [
        { room, toward: target.center },
        { room: target, toward: room.center },
      ];

      for (const endpoint of pair) {
        const point = findDoorPoint(endpoint.room, endpoint.toward);
        if (!point) continue;
        const dir = corridorDirectionAt(point.x, point.y);
        if (!dir) continue;
        const key = `${point.x}:${point.y}`;
        if (seen.has(key)) continue;
        seen.add(key);

        // Force wall supports on opposite sides of the door tile to avoid
        // floating/room-interior-looking doors.
        if (dir.x !== 0) {
          const up = { x: point.x, y: point.y - 1 };
          const down = { x: point.x, y: point.y + 1 };
          if (
            inBounds(grid, up.x, up.y) &&
            !corridorMask[up.y]![up.x] &&
            grid.tiles[up.y]![up.x] !== 'stairs_up' &&
            grid.tiles[up.y]![up.x] !== 'stairs_down'
          ) {
            setTile(grid, up.x, up.y, 'wall');
          }
          if (
            inBounds(grid, down.x, down.y) &&
            !corridorMask[down.y]![down.x] &&
            grid.tiles[down.y]![down.x] !== 'stairs_up' &&
            grid.tiles[down.y]![down.x] !== 'stairs_down'
          ) {
            setTile(grid, down.x, down.y, 'wall');
          }
        } else {
          const left = { x: point.x - 1, y: point.y };
          const right = { x: point.x + 1, y: point.y };
          if (
            inBounds(grid, left.x, left.y) &&
            !corridorMask[left.y]![left.x] &&
            grid.tiles[left.y]![left.x] !== 'stairs_up' &&
            grid.tiles[left.y]![left.x] !== 'stairs_down'
          ) {
            setTile(grid, left.x, left.y, 'wall');
          }
          if (
            inBounds(grid, right.x, right.y) &&
            !corridorMask[right.y]![right.x] &&
            grid.tiles[right.y]![right.x] !== 'stairs_up' &&
            grid.tiles[right.y]![right.x] !== 'stairs_down'
          ) {
            setTile(grid, right.x, right.y, 'wall');
          }
        }

        const hidden = rand() < 0.05;
        const locked = !hidden && rand() < 0.15;
        setTile(grid, point.x, point.y, hidden ? 'secret_door' : 'door');
        doors.push({
          id: nextId(),
          x: point.x,
          y: point.y,
          roomIds: [endpoint.room.id],
          hidden,
          locked,
        });
      }
    }
  }

  return doors;
}

function decorateCorridors(
  grid: DungeonGrid,
  corridorMask: boolean[][],
  theme: ThemeDef,
  dungeonTheme: DungeonTheme,
  modifier: DungeonModifier,
  rand: () => number,
): void {
  const trapChance = clamp(theme.baseTrapChance * modifier.trapMultiplier, 0, 0.95);
  const hazardChance = clamp(theme.baseHazardChance * modifier.hazardMultiplier, 0, 0.95);

  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      if (!corridorMask[y]![x]) continue;

      if (rand() > 0.28) continue;

      const eventRoll = rollCorridorEvent({
        rand,
        theme: dungeonTheme,
        requiredTags: modifier.corridorTagBias,
      });
      const event = eventRoll?.result as CorridorEventPayload | undefined;
      if (!event) continue;

      if (event.tileImpact === 'trap') {
        if (rand() < trapChance) {
          setTile(grid, x, y, 'trap');
        }
      } else if (event.tileImpact === 'hazard') {
        if (rand() < hazardChance) {
          setTile(grid, x, y, 'hazard');
        }
      }
    }
  }
}

function addWalls(grid: DungeonGrid): void {
  const walkable = new Set<TileType>([
    'floor',
    'door',
    'secret_door',
    'trap',
    'hazard',
    'stairs_up',
    'stairs_down',
  ]);

  const dirs: Point[] = [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
    { x: 1, y: 1 },
    { x: -1, y: -1 },
    { x: 1, y: -1 },
    { x: -1, y: 1 },
  ];

  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      if (grid.tiles[y]![x] !== 'empty') continue;
      if (dirs.some(({ x: dx, y: dy }) => {
        const nx = x + dx;
        const ny = y + dy;
        return inBounds(grid, nx, ny) && walkable.has(grid.tiles[ny]![nx]!);
      })) {
        grid.tiles[y]![x] = 'wall';
      }
    }
  }
}

function hasOpposingWallSupports(grid: DungeonGrid, x: number, y: number): boolean {
  const left = inBounds(grid, x - 1, y) ? grid.tiles[y]![x - 1] : 'empty';
  const right = inBounds(grid, x + 1, y) ? grid.tiles[y]![x + 1] : 'empty';
  const up = inBounds(grid, x, y - 1) ? grid.tiles[y - 1]![x] : 'empty';
  const down = inBounds(grid, x, y + 1) ? grid.tiles[y + 1]![x] : 'empty';
  return (left === 'wall' && right === 'wall') || (up === 'wall' && down === 'wall');
}

function pruneFloatingDoors(grid: DungeonGrid, doors: DungeonDoor[]): DungeonDoor[] {
  const kept: DungeonDoor[] = [];
  for (const door of doors) {
    if (hasOpposingWallSupports(grid, door.x, door.y)) {
      kept.push(door);
      continue;
    }
    if (inBounds(grid, door.x, door.y)) {
      grid.tiles[door.y]![door.x] = 'floor';
    }
  }
  return kept;
}

function uniqueTags(...groups: string[][]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const group of groups) {
    for (const tag of group) {
      if (seen.has(tag)) continue;
      seen.add(tag);
      out.push(tag);
    }
  }
  return out;
}

function neutralModifier(): DungeonModifier {
  return {
    modifierId: 'none',
    label: 'Baseline Conditions',
    trapMultiplier: 1,
    hazardMultiplier: 1,
    encounterTierShift: 0,
    corridorTagBias: [],
    roomTagBias: [],
    tags: ['modifier:none'],
  };
}

function shiftEncounterTier(tier: EncounterTier, shift: -1 | 0 | 1): EncounterTier {
  if (shift === 0) return tier;
  if (tier === 'tier_1') return shift > 0 ? 'tier_2' : 'tier_1';
  if (tier === 'tier_3') return shift < 0 ? 'tier_2' : 'tier_3';
  return shift > 0 ? 'tier_3' : 'tier_1';
}

function encounterTierFromRoom(room: InternalRoom, degree: number, modifier: DungeonModifier): EncounterTier {
  if (room.isBoss) return 'tier_3';
  if (room.isEntrance) return 'tier_1';

  let base: EncounterTier = degree <= 1 ? 'tier_1' : degree >= 3 ? 'tier_2' : 'tier_2';
  if (room.tags.includes('treasure')) {
    base = 'tier_2';
  }
  return shiftEncounterTier(base, modifier.encounterTierShift);
}

function lootTierFromEncounterTier(tier: EncounterTier): LootTier {
  if (tier === 'tier_1') return 'tier_1';
  if (tier === 'tier_2') return 'tier_2';
  return 'tier_3';
}

function defaultPurpose(room: InternalRoom): RoomPurposeMetadata {
  if (room.isEntrance) {
    return {
      purposeId: 'entrance_fallback',
      label: 'Entrance Hall',
      role: 'entrance',
      encounterTierBias: 'tier_1',
      lootTierBias: 'tier_1',
      tags: ['role:entrance'],
    };
  }
  if (room.isBoss) {
    return {
      purposeId: 'boss_fallback',
      label: 'Boss Chamber',
      role: 'boss',
      encounterTierBias: 'tier_3',
      lootTierBias: 'tier_3',
      tags: ['role:boss'],
    };
  }
  return {
    purposeId: 'holding_chamber',
    label: 'Holding Chamber',
    role: 'transit',
    encounterTierBias: 'tier_2',
    lootTierBias: 'tier_2',
    tags: ['role:transit'],
  };
}

function rollPurpose(
  room: InternalRoom,
  degree: number,
  theme: DungeonTheme,
  modifier: DungeonModifier,
  rand: () => number,
): RoomPurposeMetadata {
  const requiredTags: string[] = [];
  if (room.isEntrance) requiredTags.push('role:entrance');
  if (room.isBoss) requiredTags.push('role:boss');
  if (degree <= 1 && !room.isEntrance && !room.isBoss) requiredTags.push('room:dead_end');
  requiredTags.push(...modifier.roomTagBias);

  const roll = rollRoomPurpose({
    rand,
    theme,
    requiredTags,
  });
  return (roll?.result as RoomPurposeMetadata | undefined) ?? defaultPurpose(room);
}

function rollEncounter(
  tier: EncounterTier,
  theme: DungeonTheme,
  rand: () => number,
  requiredTags: string[] = [],
): EncounterContentPayload | null {
  const roll = rollEncounterTier(tier, {
    rand,
    theme,
    requiredTags,
  });
  return (roll?.result as EncounterContentPayload | undefined) ?? null;
}

function rollTrap(
  tier: EncounterTier,
  theme: DungeonTheme,
  rand: () => number,
  requiredTags: string[] = [],
): TrapContentPayload | null {
  const root = rollTrapChain(tier, {
    rand,
    theme,
    requiredTags,
  });
  const template = root?.result as TrapTemplateRoll | undefined;
  if (!template) return null;

  const trigger = extractFromChain<TrapComponentPayload>(root, 'trap_trigger');
  const effect = extractFromChain<TrapComponentPayload>(root, 'trap_effect');
  const delivery = extractFromChain<TrapComponentPayload>(root, 'trap_delivery');
  if (!trigger || !effect || !delivery) return null;

  return {
    trapId: template.trapId,
    tier: template.tier,
    severity: template.severity,
    trigger,
    effect,
    delivery,
    tileImpact: template.tileImpact,
    tags: chainTags(root),
  };
}

function rollLoot(
  tier: LootTier,
  theme: DungeonTheme,
  rand: () => number,
  requiredTags: string[] = [],
): LootContentPayload | null {
  const root = rollLootChain(tier, {
    rand,
    theme,
    requiredTags,
  });
  const template = root?.result as LootTemplateRoll | undefined;
  if (!template) return null;

  const kind = extractFromChain<LootKindPayload>(root, 'loot_type');
  const flavor = extractFromChain<LootFlavorPayload>(root, 'loot_flavor');
  if (!kind || !flavor) return null;

  return {
    lootId: template.lootId,
    tier: template.tier,
    kind,
    flavor,
    quantity: template.quantity,
    tags: chainTags(root),
  };
}

function rollFeature(
  theme: DungeonTheme,
  rand: () => number,
  requiredTags: string[] = [],
): EnvironmentalFeaturePayload | null {
  const roll = rollEnvironmentalFeature({
    rand,
    theme,
    requiredTags,
  });
  return (roll?.result as EnvironmentalFeaturePayload | undefined) ?? null;
}

function createEmptyGrid(width: number, height: number): DungeonGrid {
  return {
    width,
    height,
    tiles: Array.from({ length: height }, () => Array.from({ length: width }, () => 'empty' as TileType)),
  };
}

function nearestEdgePoint(room: InternalRoom, target: Point): Point {
  const left = { x: room.x, y: clamp(target.y, room.y, room.y + room.height - 1) };
  const right = { x: room.x + room.width - 1, y: clamp(target.y, room.y, room.y + room.height - 1) };
  const top = { x: clamp(target.x, room.x, room.x + room.width - 1), y: room.y };
  const bottom = { x: clamp(target.x, room.x, room.x + room.width - 1), y: room.y + room.height - 1 };

  const candidates = [left, right, top, bottom];
  candidates.sort((a, b) => distance(a, target) - distance(b, target));
  const first = candidates[0];
  if (!first) {
    return { x: room.center.x, y: room.center.y };
  }
  return first;
}

export function generateDungeon(dungeonId: string, input: GenerateDungeonInput): Omit<Dungeon, 'createdAt'> {
  const safeWidth = clamp(Math.floor(input.width), 20, 220);
  const safeHeight = clamp(Math.floor(input.height), 20, 220);
  const seed = (input.seed ?? `${dungeonId}:${input.theme}:${input.roomCount}`).toString();
  const rand = makePrng(seedFromString(seed));
  const theme = THEMES[input.theme];

  const nextRoomId = makeIdFactory('room', dungeonId);
  const nextContentId = makeIdFactory('content', dungeonId);
  const nextDoorId = makeIdFactory('door', dungeonId);

  const roomSizeMin = clamp(Math.floor(input.roomSizeRange[0]), 4, 30);
  const roomSizeMax = clamp(Math.floor(input.roomSizeRange[1]), roomSizeMin + 1, 40);
  const spacing = clamp(Math.floor(input.spacing), 1, 3);
  const targetRooms = clamp(Math.floor(input.roomCount), 3, 80);

  const rooms: InternalRoom[] = [];
  let attempts = 0;
  const maxAttempts = targetRooms * 120;

  while (rooms.length < targetRooms && attempts < maxAttempts) {
    attempts += 1;

    const width = randomInt(roomSizeMin, roomSizeMax, rand);
    const height = randomInt(roomSizeMin, roomSizeMax, rand);
    if (width >= safeWidth - 6 || height >= safeHeight - 6) continue;

    const x = randomInt(2, safeWidth - width - 3, rand);
    const y = randomInt(2, safeHeight - height - 3, rand);

    const shapeWeights = input.shapeWeights
      ? {
          rectangle: input.shapeWeights.rectangle ?? theme.roomShapeWeights.rectangle,
          circle: input.shapeWeights.circle ?? theme.roomShapeWeights.circle,
          irregular: input.shapeWeights.irregular ?? theme.roomShapeWeights.irregular,
        }
      : theme.roomShapeWeights;

    const shape = weightedPick(shapeWeights, rand);

    const room: InternalRoom = {
      id: nextRoomId(),
      x,
      y,
      width,
      height,
      shape,
      tags: [],
      center: { x: Math.floor(x + width / 2), y: Math.floor(y + height / 2) },
      connections: [],
      isBoss: false,
      isEntrance: false,
    };

    if (!roomOverlaps(room, rooms, spacing)) {
      rooms.push(room);
    }
  }

  if (rooms.length < 3) {
    throw new Error('Unable to place enough rooms for requested dungeon layout.');
  }

  rooms.sort((a, b) => (a.center.x + a.center.y) - (b.center.x + b.center.y));
  const entrance = rooms[0]!;
  entrance.isEntrance = true;
  entrance.tags.push('entrance');

  let boss = rooms[rooms.length - 1]!;
  let farthest = -1;
  for (const room of rooms) {
    const d = distance(room.center, entrance.center);
    if (d > farthest) {
      farthest = d;
      boss = room;
    }
  }
  boss.isBoss = true;
  boss.tags.push('boss');

  const grid = createEmptyGrid(safeWidth, safeHeight);
  const roomMask = Array.from({ length: safeHeight }, () => Array.from({ length: safeWidth }, () => false));
  const corridorMask = Array.from({ length: safeHeight }, () => Array.from({ length: safeWidth }, () => false));

  for (const room of rooms) {
    carveRoom(grid, room, roomMask);
  }

  const ids = rooms.map((r) => r.id);
  const edges = collectEdges(rooms);
  const mst = buildMst(ids, edges);
  const graphEdges = addExtraEdges(edges, mst, rooms.length, clamp(input.corridorDensity, 0, 1), input.allowLoops, rand);

  const roomById = new Map(rooms.map((r) => [r.id, r]));

  for (const edge of graphEdges) {
    const a = roomById.get(edge.a);
    const b = roomById.get(edge.b);
    if (!a || !b) continue;

    if (!a.connections.includes(b.id)) a.connections.push(b.id);
    if (!b.connections.includes(a.id)) b.connections.push(a.id);

    const width = randomInt(theme.corridorWidthRange[0], theme.corridorWidthRange[1], rand);
    const start = nearestEdgePoint(a, b.center);
    const end = nearestEdgePoint(b, a.center);
    carveCorridor(grid, corridorMask, roomMask, start, end, width, rand);
  }

  const modifierRoll = rollDungeonModifier({ rand, theme: input.theme });
  const modifier = (modifierRoll?.result as DungeonModifier | undefined) ?? neutralModifier();

  decorateCorridors(grid, corridorMask, theme, input.theme, modifier, rand);

  setTile(grid, entrance.center.x, entrance.center.y, 'stairs_up');
  setTile(grid, boss.center.x, boss.center.y, 'stairs_down');

  const doors = placeDoors(grid, rooms, roomMask, corridorMask, rand, nextDoorId);

  addWalls(grid);
  const anchoredDoors = pruneFloatingDoors(grid, doors);

  const dungeonRooms: DungeonRoom[] = rooms.map((room) => {
    const degree = room.connections.length;
    const baseTags = [...room.tags];
    const isDeadEnd = degree <= 1 && !room.isEntrance && !room.isBoss;
    if (isDeadEnd) {
      baseTags.push('dead_end');
      baseTags.push('room:dead_end');
    }

    const purpose = rollPurpose(room, degree, input.theme, modifier, rand);
    const purposeEncounterTier = room.isBoss
      ? 'tier_3'
      : room.isEntrance
      ? 'tier_1'
      : purpose.encounterTierBias;
    const encounterTier = shiftEncounterTier(purposeEncounterTier, modifier.encounterTierShift);

    let lootTier = room.isBoss ? 'tier_3' : purpose.lootTierBias;
    if (isDeadEnd && lootTier === 'tier_1') {
      lootTier = 'tier_2';
    }

    const feature =
      rand() < (room.isEntrance ? 0.35 : 0.55)
        ? rollFeature(input.theme, rand, uniqueTags(baseTags, purpose.tags))
        : null;

    const metadata: DungeonRoomMetadata = feature
      ? {
          purpose,
          encounterTier,
          lootTier,
          environmentalFeature: feature,
        }
      : {
          purpose,
          encounterTier,
          lootTier,
        };

    const roomContent: DungeonRoomContent = { roomId: room.id };
    const contents: DungeonContent[] = [];

    const encounterChance = room.isBoss ? 1 : room.isEntrance ? 0.2 : 0.66;
    if (rand() < encounterChance) {
      const encounter = rollEncounter(encounterTier, input.theme, rand, uniqueTags(baseTags, purpose.tags));
      if (encounter) {
        roomContent.encounters = [encounter];
        contents.push({
          id: nextContentId(),
          roomId: room.id,
          contentType: 'encounter',
          payload: encounter as unknown as Record<string, unknown>,
        });
      }
    }

    const lootChance = room.isBoss ? 1 : isDeadEnd ? 0.62 : 0.3;
    if (rand() < lootChance) {
      const loot = rollLoot(lootTier, input.theme, rand, uniqueTags(baseTags, purpose.tags));
      if (loot) {
        roomContent.loot = [loot];
        contents.push({
          id: nextContentId(),
          roomId: room.id,
          contentType: 'loot',
          payload: loot as unknown as Record<string, unknown>,
        });
        baseTags.push('treasure');
        baseTags.push('room:treasure');
      }
    }

    const trapChance = room.isEntrance
      ? theme.baseTrapChance * 0.2
      : room.isBoss
      ? theme.baseTrapChance * 0.8
      : theme.baseTrapChance * 0.65;
    if (rand() < clamp(trapChance * modifier.trapMultiplier, 0, 0.95)) {
      const trap = rollTrap(encounterTier, input.theme, rand, uniqueTags(baseTags, purpose.tags));
      if (trap) {
        roomContent.traps = [trap];
        contents.push({
          id: nextContentId(),
          roomId: room.id,
          contentType: 'trap',
          payload: trap as unknown as Record<string, unknown>,
        });
        if (!room.isEntrance && !room.isBoss) {
          const centerTile = grid.tiles[room.center.y]?.[room.center.x];
          if (centerTile === 'floor') {
            setTile(grid, room.center.x, room.center.y, trap.tileImpact === 'trap' ? 'trap' : 'hazard');
          }
        }
      }
    }

    if (feature) {
      roomContent.features = [feature];
      contents.push({
        id: nextContentId(),
        roomId: room.id,
        contentType: 'feature',
        payload: feature as unknown as Record<string, unknown>,
      });
      if (!room.isEntrance && !room.isBoss && feature.tileImpact === 'hazard') {
        const centerTile = grid.tiles[room.center.y]?.[room.center.x];
        if (centerTile === 'floor' && rand() < clamp(theme.baseHazardChance * modifier.hazardMultiplier, 0, 0.95)) {
          setTile(grid, room.center.x, room.center.y, 'hazard');
        }
      }
    }

    if (room.isEntrance) {
      roomContent.modifiers = [modifier];
      contents.push({
        id: nextContentId(),
        roomId: room.id,
        contentType: 'modifier',
        payload: modifier as unknown as Record<string, unknown>,
      });
    }

    const nonMetaContent = contents.filter((item) => item.contentType !== 'modifier');
    if (nonMetaContent.length === 0) {
      const note = { code: room.isEntrance ? 'entry_staging' : 'quiet_chamber', tags: ['content:empty'] };
      roomContent.notes = [note];
      contents.push({
        id: nextContentId(),
        roomId: room.id,
        contentType: 'empty',
        payload: note as Record<string, unknown>,
      });
    }

    const tags = uniqueTags(
      baseTags,
      purpose.tags,
      feature?.tags ?? [],
      isDeadEnd ? ['dead_end'] : [],
      room.isEntrance ? ['entrance'] : [],
      room.isBoss ? ['boss'] : [],
    );

    return {
      id: room.id,
      dungeonId,
      type: 'room',
      label: purpose.label,
      size: sizeFromDimensions(room.width, room.height),
      x: room.x,
      y: room.y,
      width: room.width,
      height: room.height,
      shape: room.shape,
      tags,
      connections: room.connections,
      isBoss: room.isBoss,
      isEntrance: room.isEntrance,
      metadata,
      roomContent: roomContent,
      contents,
    };
  });

  const name = input.name?.trim() || `${input.theme.replace('_', ' ')} dungeon`;

  return {
    id: dungeonId,
    name,
    theme: input.theme,
    roomCount: dungeonRooms.length,
    seed,
    grid,
    rooms: dungeonRooms,
    doors: anchoredDoors,
    modifiers: [modifier],
    generationConfig: {
      seed,
      theme: input.theme,
      roomCount: input.roomCount,
      width: safeWidth,
      height: safeHeight,
      roomSizeRange: [roomSizeMin, roomSizeMax],
      corridorDensity: clamp(input.corridorDensity, 0, 1),
      allowLoops: input.allowLoops,
      spacing,
      ...(input.shapeWeights ? { shapeWeights: input.shapeWeights } : {}),
    },
  };
}

export function buildSummary(dungeon: Dungeon): string {
  const roomCount = dungeon.rooms.length;
  const doorCount = dungeon.doors.length;
  const trapTiles = dungeon.grid.tiles.flat().filter((tile) => tile === 'trap').length;
  const hazardTiles = dungeon.grid.tiles.flat().filter((tile) => tile === 'hazard').length;
  const secretDoors = dungeon.doors.filter((door) => door.hidden).length;
  const lootRooms = dungeon.rooms.filter((room) => room.contents.some((c) => c.contentType === 'loot')).length;
  const encounterRooms = dungeon.rooms.filter((room) =>
    room.contents.some((c) => c.contentType === 'encounter' || c.contentType === 'monster'),
  ).length;
  const bossRoom = dungeon.rooms.find((room) => room.isBoss);
  const modifier = dungeon.modifiers[0];

  return [
    `# ${dungeon.name}`,
    `Theme: ${dungeon.theme}`,
    `Grid: ${dungeon.grid.width}x${dungeon.grid.height}`,
    `Rooms: ${roomCount} | Doors: ${doorCount} | Secret Doors: ${secretDoors}`,
    `Trap Tiles: ${trapTiles} | Hazard Tiles: ${hazardTiles}`,
    `Encounter Rooms: ${encounterRooms} | Loot Rooms: ${lootRooms}`,
    modifier ? `Dungeon Modifier: ${modifier.label}` : 'Dungeon Modifier: none',
    bossRoom ? `Boss Room: ${bossRoom.label}` : 'Boss Room: none',
  ].join('\n');
}
