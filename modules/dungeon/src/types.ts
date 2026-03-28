export type TileType =
  | 'empty'
  | 'floor'
  | 'wall'
  | 'door'
  | 'secret_door'
  | 'trap'
  | 'hazard'
  | 'stairs_up'
  | 'stairs_down';

export type RoomType = 'room' | 'hallway';
export type RoomSize = 'small' | 'medium' | 'large';
export type ContentType =
  | 'monster'
  | 'encounter'
  | 'trap'
  | 'loot'
  | 'feature'
  | 'modifier'
  | 'empty';
export type DungeonTheme =
  | 'crypt'
  | 'cave'
  | 'fortress'
  | 'sewer'
  | 'ruins'
  | 'arcane_lab';

export type RoomShape = 'rectangle' | 'circle' | 'irregular';
export type EncounterTier = 'tier_1' | 'tier_2' | 'tier_3';
export type LootTier = 'tier_1' | 'tier_2' | 'tier_3';
export type TrapSeverity = 'low' | 'moderate' | 'high';
export type RoomPurposeRole =
  | 'entrance'
  | 'boss'
  | 'objective'
  | 'utility'
  | 'transit'
  | 'treasure';

export interface EncounterUnit {
  creatureId: string;
  count: number;
  rank: 'minion' | 'standard' | 'elite' | 'boss';
}

export interface EncounterContentPayload {
  encounterId: string;
  tier: EncounterTier;
  stance: 'patrol' | 'guard' | 'ambush' | 'ritual' | 'nest' | 'siege';
  units: EncounterUnit[];
  tags: string[];
}

export interface TrapComponentPayload {
  componentId: string;
  kind: 'trigger' | 'effect' | 'delivery';
  code: string;
  tags: string[];
}

export interface TrapContentPayload {
  trapId: string;
  tier: EncounterTier;
  severity: TrapSeverity;
  trigger: TrapComponentPayload;
  effect: TrapComponentPayload;
  delivery: TrapComponentPayload;
  tileImpact: 'trap' | 'hazard';
  tags: string[];
}

export interface LootKindPayload {
  kindId: string;
  category: 'currency' | 'gear' | 'consumable' | 'relic';
  tags: string[];
}

export interface LootFlavorPayload {
  flavorId: string;
  descriptor: string;
  tags: string[];
}

export interface LootContentPayload {
  lootId: string;
  tier: LootTier;
  kind: LootKindPayload;
  flavor: LootFlavorPayload;
  quantity: {
    min: number;
    max: number;
  };
  tags: string[];
}

export interface EnvironmentalFeaturePayload {
  featureId: string;
  category: 'terrain' | 'atmosphere' | 'hazard' | 'arcane';
  intensity: 'low' | 'moderate' | 'high';
  tileImpact: 'none' | 'hazard';
  tags: string[];
}

export interface CorridorEventPayload {
  eventId: string;
  eventType: 'quiet' | 'patrol' | 'hazard' | 'trap' | 'discovery';
  tileImpact: 'none' | 'hazard' | 'trap';
  tags: string[];
}

export interface DungeonModifier {
  modifierId: string;
  label: string;
  trapMultiplier: number;
  hazardMultiplier: number;
  encounterTierShift: -1 | 0 | 1;
  corridorTagBias: string[];
  roomTagBias: string[];
  tags: string[];
}

export interface RoomPurposeMetadata {
  purposeId: string;
  label: string;
  role: RoomPurposeRole;
  encounterTierBias: EncounterTier;
  lootTierBias: LootTier;
  tags: string[];
}

export interface DungeonRoomMetadata {
  purpose: RoomPurposeMetadata;
  encounterTier: EncounterTier;
  lootTier: LootTier;
  environmentalFeature?: EnvironmentalFeaturePayload;
}

export interface DungeonRoomNote {
  code: string;
  tags: string[];
}

export interface DungeonGrid {
  width: number;
  height: number;
  tiles: TileType[][];
}

export interface DungeonDoor {
  id: string;
  x: number;
  y: number;
  roomIds: string[];
  locked: boolean;
  hidden: boolean;
}

export interface DungeonRoomContent {
  roomId: string;
  encounters?: EncounterContentPayload[];
  loot?: LootContentPayload[];
  traps?: TrapContentPayload[];
  features?: EnvironmentalFeaturePayload[];
  modifiers?: DungeonModifier[];
  notes?: DungeonRoomNote[];
}

export interface DungeonContent {
  id: string;
  roomId: string;
  contentType: ContentType;
  payload: Record<string, unknown>;
}

export interface DungeonRoom {
  id: string;
  dungeonId: string;
  type: RoomType;
  label: string;
  size: RoomSize;
  x: number;
  y: number;
  width: number;
  height: number;
  shape: RoomShape;
  tags: string[];
  connections: string[];
  isBoss: boolean;
  isEntrance: boolean;
  metadata: DungeonRoomMetadata;
  contents: DungeonContent[];
  roomContent?: DungeonRoomContent;
}

export interface Dungeon {
  id: string;
  name: string;
  theme: DungeonTheme;
  roomCount: number;
  createdAt: string;
  seed: string;
  grid: DungeonGrid;
  rooms: DungeonRoom[];
  doors: DungeonDoor[];
  modifiers: DungeonModifier[];
  generationConfig: Omit<GenerateDungeonInput, 'name'>;
}

export interface DungeonRow {
  id: string;
  campaign_id: string;
  name: string;
  theme: string;
  room_count: number;
  grid_width: number | null;
  grid_height: number | null;
  grid_json: string | null;
  generation_seed: string | null;
  generation_config: string | null;
  created_at: string;
}

export interface DungeonRoomRow {
  id: string;
  dungeon_id: string;
  type: RoomType;
  label: string;
  size: RoomSize;
  x: number;
  y: number;
  width: number;
  height: number;
  shape: RoomShape;
  tags: string;
  connections: string;
  metadata: string | null;
  is_boss: number;
  is_entrance: number;
}

export interface DungeonContentRow {
  id: string;
  room_id: string;
  content_type: ContentType;
  payload: string;
}

export interface GenerateDungeonInput {
  name?: string;
  seed?: string;
  theme: DungeonTheme;
  roomCount: number;
  width: number;
  height: number;
  roomSizeRange: [number, number];
  corridorDensity: number;
  allowLoops: boolean;
  spacing: number;
  shapeWeights?: Partial<Record<RoomShape, number>>;
}
