import type {
  CorridorEventPayload,
  DungeonModifier,
  DungeonTheme,
  EncounterContentPayload,
  EncounterTier,
  EnvironmentalFeaturePayload,
  LootFlavorPayload,
  LootKindPayload,
  LootTier,
  RoomPurposeMetadata,
  TrapComponentPayload,
  TrapSeverity,
} from './types';

export type TableCategory =
  | 'room_purpose'
  | 'encounter'
  | 'trap'
  | 'loot'
  | 'environment'
  | 'corridor'
  | 'modifier';

export type RollMode = 'weighted' | 'dice';

export interface DiceSpec {
  count: number;
  sides: number;
  modifier?: number;
}

export interface DiceRange {
  min: number;
  max: number;
}

export interface TableEntry<TPayload extends object> {
  id: string;
  weight?: number;
  range?: DiceRange;
  tags?: string[];
  result: TPayload;
  nextTableId?: string;
}

export interface RandomTable<TPayload extends object> {
  id: string;
  category: TableCategory;
  rollMode: RollMode;
  dice?: DiceSpec;
  tags?: string[];
  entries: Array<TableEntry<TPayload>>;
}

export interface TableRollResult<TPayload extends object = object> {
  tableId: string;
  entryId: string;
  rollMode: RollMode;
  rollValue: number;
  tags: string[];
  result: TPayload;
  next?: TableRollResult;
}

export interface TableRollContext {
  rand: () => number;
  theme: DungeonTheme;
  requiredTags?: string[];
  maxDepth?: number;
}

export interface TrapTemplateRoll {
  trapId: string;
  tier: EncounterTier;
  severity: TrapSeverity;
  tileImpact: 'trap' | 'hazard';
  tags: string[];
}

export interface LootTemplateRoll {
  lootId: string;
  tier: LootTier;
  quantity: {
    min: number;
    max: number;
  };
  tags: string[];
}

const DEFAULT_MAX_DEPTH = 8;

function randomInt(min: number, max: number, rand: () => number): number {
  return Math.floor(rand() * (max - min + 1)) + min;
}

function rollDice(dice: DiceSpec, rand: () => number): number {
  const safeCount = Math.max(1, Math.floor(dice.count));
  const safeSides = Math.max(2, Math.floor(dice.sides));
  let total = 0;
  for (let i = 0; i < safeCount; i++) {
    total += randomInt(1, safeSides, rand);
  }
  return total + (dice.modifier ?? 0);
}

function samePrefix(a: string, b: string): boolean {
  const ai = a.indexOf(':');
  const bi = b.indexOf(':');
  if (ai <= 0 || bi <= 0) return false;
  return a.slice(0, ai) === b.slice(0, bi);
}

function matchesEntryTags(
  entryTags: string[] | undefined,
  theme: DungeonTheme,
  requiredTags: string[],
): boolean {
  const tags = entryTags ?? [];
  const themeTag = `theme:${theme}`;
  const themeScoped = tags.filter((tag) => tag.startsWith('theme:'));
  if (themeScoped.length > 0 && !themeScoped.includes(themeTag)) {
    return false;
  }

  for (const required of requiredTags) {
    if (required.startsWith('theme:')) {
      continue;
    }
    const scoped = tags.filter((tag) => samePrefix(tag, required));
    if (scoped.length > 0 && !scoped.includes(required)) {
      return false;
    }
    if (scoped.length === 0 && required.includes(':') && !tags.includes(required)) {
      continue;
    }
    if (!required.includes(':') && !tags.includes(required)) {
      return false;
    }
  }

  return true;
}

function pickWeighted<TPayload extends object>(
  entries: Array<TableEntry<TPayload>>,
  rand: () => number,
): TableEntry<TPayload> | null {
  if (entries.length === 0) return null;
  const total = entries.reduce((sum, entry) => sum + Math.max(0, entry.weight ?? 1), 0);
  if (total <= 0) {
    return entries[0] ?? null;
  }

  let roll = rand() * total;
  for (const entry of entries) {
    roll -= Math.max(0, entry.weight ?? 1);
    if (roll <= 0) {
      return entry;
    }
  }

  return entries[entries.length - 1] ?? null;
}

function flattenTags(...groups: Array<string[] | undefined>): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const group of groups) {
    for (const tag of group ?? []) {
      if (seen.has(tag)) continue;
      seen.add(tag);
      out.push(tag);
    }
  }
  return out;
}

function rollInternal(
  tables: Record<string, RandomTable<object>>,
  tableId: string,
  context: TableRollContext,
  requiredTags: string[],
  depth: number,
  visited: Set<string>,
): TableRollResult | null {
  if (depth > (context.maxDepth ?? DEFAULT_MAX_DEPTH)) return null;
  if (visited.has(tableId)) return null;
  const table = tables[tableId];
  if (!table) return null;

  const candidates = table.entries.filter((entry) => matchesEntryTags(entry.tags, context.theme, requiredTags));
  const fallback = table.entries.filter((entry) => matchesEntryTags(entry.tags, context.theme, []));
  const pool = candidates.length > 0 ? candidates : fallback;
  if (pool.length === 0) return null;

  let rollValue = Math.floor(context.rand() * 100) + 1;
  let picked: TableEntry<object> | null = null;

  if (table.rollMode === 'dice') {
    const dice = table.dice ?? { count: 1, sides: 20 };
    rollValue = rollDice(dice, context.rand);
    picked =
      pool.find((entry) => entry.range && rollValue >= entry.range.min && rollValue <= entry.range.max) ?? null;
  }

  if (!picked) {
    picked = pickWeighted(pool, context.rand);
  }
  if (!picked) return null;

  const mergedTags = flattenTags(requiredTags, table.tags, picked.tags);
  const result: TableRollResult = {
    tableId: table.id,
    entryId: picked.id,
    rollMode: table.rollMode,
    rollValue,
    tags: mergedTags,
    result: picked.result,
  };

  if (picked.nextTableId) {
    const nextVisited = new Set(visited);
    nextVisited.add(tableId);
    const next = rollInternal(tables, picked.nextTableId, context, mergedTags, depth + 1, nextVisited);
    if (next) {
      result.next = next;
    }
  }

  return result;
}

export function rollTable(
  tables: Record<string, RandomTable<object>>,
  tableId: string,
  context: TableRollContext,
): TableRollResult | null {
  const required = flattenTags([`theme:${context.theme}`], context.requiredTags);
  return rollInternal(tables, tableId, context, required, 0, new Set());
}

export function flattenRollChain(root: TableRollResult | null): TableRollResult[] {
  const out: TableRollResult[] = [];
  let current = root;
  while (current) {
    out.push(current);
    current = current.next ?? null;
  }
  return out;
}

function encounter(
  encounterId: string,
  tier: EncounterTier,
  stance: EncounterContentPayload['stance'],
  units: EncounterContentPayload['units'],
  tags: string[] = [],
): EncounterContentPayload {
  return { encounterId, tier, stance, units, tags };
}

function trapComponent(
  componentId: string,
  kind: TrapComponentPayload['kind'],
  code: string,
  tags: string[] = [],
): TrapComponentPayload {
  return { componentId, kind, code, tags };
}

function lootKind(
  kindId: string,
  category: LootKindPayload['category'],
  tags: string[] = [],
): LootKindPayload {
  return { kindId, category, tags };
}

function lootFlavor(flavorId: string, descriptor: string, tags: string[] = []): LootFlavorPayload {
  return { flavorId, descriptor, tags };
}

function roomPurpose(
  purposeId: string,
  label: string,
  role: RoomPurposeMetadata['role'],
  encounterTierBias: EncounterTier,
  lootTierBias: LootTier,
  tags: string[] = [],
): RoomPurposeMetadata {
  return { purposeId, label, role, encounterTierBias, lootTierBias, tags };
}

function envFeature(
  featureId: string,
  category: EnvironmentalFeaturePayload['category'],
  intensity: EnvironmentalFeaturePayload['intensity'],
  tileImpact: EnvironmentalFeaturePayload['tileImpact'],
  tags: string[] = [],
): EnvironmentalFeaturePayload {
  return { featureId, category, intensity, tileImpact, tags };
}

function corridorEvent(
  eventId: string,
  eventType: CorridorEventPayload['eventType'],
  tileImpact: CorridorEventPayload['tileImpact'],
  tags: string[] = [],
): CorridorEventPayload {
  return { eventId, eventType, tileImpact, tags };
}

function dungeonModifier(
  modifierId: string,
  label: string,
  trapMultiplier: number,
  hazardMultiplier: number,
  encounterTierShift: DungeonModifier['encounterTierShift'],
  corridorTagBias: string[],
  roomTagBias: string[],
  tags: string[] = [],
): DungeonModifier {
  return {
    modifierId,
    label,
    trapMultiplier,
    hazardMultiplier,
    encounterTierShift,
    corridorTagBias,
    roomTagBias,
    tags,
  };
}

export const DUNGEON_TABLES: Record<string, RandomTable<object>> = {
  room_purpose: {
    id: 'room_purpose',
    category: 'room_purpose',
    rollMode: 'weighted',
    entries: [
      { id: 'purpose_entrance_gate', weight: 10, tags: ['role:entrance'], result: roomPurpose('entrance_gate', 'Entry Hall', 'entrance', 'tier_1', 'tier_1', ['role:entrance']) },
      { id: 'purpose_boss_dais', weight: 10, tags: ['role:boss'], result: roomPurpose('boss_dais', 'Command Dais', 'boss', 'tier_3', 'tier_3', ['role:boss']) },
      { id: 'purpose_guard_post', weight: 8, result: roomPurpose('guard_post', 'Guard Post', 'transit', 'tier_1', 'tier_1') },
      { id: 'purpose_supply_cache', weight: 8, tags: ['room:dead_end'], result: roomPurpose('supply_cache', 'Supply Cache', 'treasure', 'tier_1', 'tier_2', ['room:dead_end']) },
      { id: 'purpose_ritual_focus', weight: 6, result: roomPurpose('ritual_focus', 'Ritual Focus', 'objective', 'tier_2', 'tier_2') },
      { id: 'purpose_maintenance', weight: 6, result: roomPurpose('maintenance', 'Maintenance Node', 'utility', 'tier_1', 'tier_1') },
      { id: 'purpose_crypt_ossuary', weight: 7, tags: ['theme:crypt'], result: roomPurpose('crypt_ossuary', 'Ossuary Vault', 'objective', 'tier_2', 'tier_2', ['theme:crypt']) },
      { id: 'purpose_cave_nest', weight: 7, tags: ['theme:cave'], result: roomPurpose('cave_nest', 'Brood Nest', 'objective', 'tier_2', 'tier_1', ['theme:cave']) },
      { id: 'purpose_fortress_barracks', weight: 7, tags: ['theme:fortress'], result: roomPurpose('fortress_barracks', 'Barracks Wing', 'utility', 'tier_2', 'tier_1', ['theme:fortress']) },
      { id: 'purpose_sewer_valve', weight: 7, tags: ['theme:sewer'], result: roomPurpose('sewer_valve', 'Valve Control', 'objective', 'tier_2', 'tier_1', ['theme:sewer']) },
      { id: 'purpose_ruins_shrine', weight: 7, tags: ['theme:ruins'], result: roomPurpose('ruins_shrine', 'Collapsed Shrine', 'objective', 'tier_2', 'tier_2', ['theme:ruins']) },
      { id: 'purpose_lab_reactor', weight: 7, tags: ['theme:arcane_lab'], result: roomPurpose('lab_reactor', 'Reactor Annex', 'utility', 'tier_2', 'tier_2', ['theme:arcane_lab']) },
    ],
  },
  encounter_tier_1: {
    id: 'encounter_tier_1',
    category: 'encounter',
    rollMode: 'weighted',
    entries: [
      { id: 'enc_t1_scouts', weight: 8, result: encounter('scout_screen', 'tier_1', 'patrol', [{ creatureId: 'scout', count: 3, rank: 'standard' }]) },
      { id: 'enc_t1_wary_watch', weight: 7, result: encounter('wary_watch', 'tier_1', 'guard', [{ creatureId: 'guard', count: 2, rank: 'standard' }]) },
      { id: 'enc_t1_crypt_skeletons', weight: 8, tags: ['theme:crypt'], result: encounter('crypt_skeleton_watch', 'tier_1', 'guard', [{ creatureId: 'skeleton', count: 4, rank: 'minion' }], ['theme:crypt']) },
      { id: 'enc_t1_cave_bats', weight: 8, tags: ['theme:cave'], result: encounter('cave_bat_cloud', 'tier_1', 'nest', [{ creatureId: 'bat_swarm', count: 2, rank: 'minion' }], ['theme:cave']) },
      { id: 'enc_t1_fortress_recruits', weight: 8, tags: ['theme:fortress'], result: encounter('fortress_recruits', 'tier_1', 'patrol', [{ creatureId: 'recruit_guard', count: 3, rank: 'standard' }], ['theme:fortress']) },
      { id: 'enc_t1_sewer_swarms', weight: 8, tags: ['theme:sewer'], result: encounter('sewer_swarm', 'tier_1', 'nest', [{ creatureId: 'rat_swarm', count: 2, rank: 'minion' }], ['theme:sewer']) },
      { id: 'enc_t1_ruins_raiders', weight: 8, tags: ['theme:ruins'], result: encounter('ruins_raiders', 'tier_1', 'ambush', [{ creatureId: 'raider', count: 3, rank: 'standard' }], ['theme:ruins']) },
      { id: 'enc_t1_lab_servitors', weight: 8, tags: ['theme:arcane_lab'], result: encounter('lab_servitors', 'tier_1', 'guard', [{ creatureId: 'servitor', count: 3, rank: 'standard' }], ['theme:arcane_lab']) },
    ],
  },
  encounter_tier_2: {
    id: 'encounter_tier_2',
    category: 'encounter',
    rollMode: 'weighted',
    entries: [
      { id: 'enc_t2_patrol_unit', weight: 8, result: encounter('patrol_unit', 'tier_2', 'patrol', [{ creatureId: 'veteran', count: 2, rank: 'standard' }, { creatureId: 'hound', count: 1, rank: 'minion' }]) },
      { id: 'enc_t2_ritual_cell', weight: 7, result: encounter('ritual_cell', 'tier_2', 'ritual', [{ creatureId: 'acolyte', count: 3, rank: 'standard' }, { creatureId: 'channeler', count: 1, rank: 'elite' }]) },
      { id: 'enc_t2_crypt_wights', weight: 8, tags: ['theme:crypt'], result: encounter('crypt_wight_cell', 'tier_2', 'guard', [{ creatureId: 'wight', count: 1, rank: 'elite' }, { creatureId: 'skeleton', count: 3, rank: 'minion' }], ['theme:crypt']) },
      { id: 'enc_t2_cave_spiders', weight: 8, tags: ['theme:cave'], result: encounter('cave_spider_den', 'tier_2', 'nest', [{ creatureId: 'giant_spider', count: 2, rank: 'standard' }, { creatureId: 'spiderling', count: 4, rank: 'minion' }], ['theme:cave']) },
      { id: 'enc_t2_fortress_veterans', weight: 8, tags: ['theme:fortress'], result: encounter('fortress_veteran_squad', 'tier_2', 'guard', [{ creatureId: 'veteran_guard', count: 3, rank: 'standard' }, { creatureId: 'captain', count: 1, rank: 'elite' }], ['theme:fortress']) },
      { id: 'enc_t2_sewer_cult_cell', weight: 8, tags: ['theme:sewer'], result: encounter('sewer_cult_cell', 'tier_2', 'ambush', [{ creatureId: 'cultist', count: 4, rank: 'standard' }, { creatureId: 'sewer_beast', count: 1, rank: 'elite' }], ['theme:sewer']) },
      { id: 'enc_t2_ruins_animated_guard', weight: 8, tags: ['theme:ruins'], result: encounter('ruins_animated_guard', 'tier_2', 'guard', [{ creatureId: 'animated_armor', count: 2, rank: 'standard' }, { creatureId: 'specter', count: 1, rank: 'elite' }], ['theme:ruins']) },
      { id: 'enc_t2_lab_constructs', weight: 8, tags: ['theme:arcane_lab'], result: encounter('lab_construct_detail', 'tier_2', 'patrol', [{ creatureId: 'arcane_construct', count: 2, rank: 'standard' }, { creatureId: 'homunculus', count: 2, rank: 'minion' }], ['theme:arcane_lab']) },
    ],
  },
  encounter_tier_3: {
    id: 'encounter_tier_3',
    category: 'encounter',
    rollMode: 'weighted',
    entries: [
      { id: 'enc_t3_champion_hold', weight: 8, result: encounter('champion_hold', 'tier_3', 'guard', [{ creatureId: 'champion', count: 1, rank: 'boss' }, { creatureId: 'veteran', count: 2, rank: 'elite' }]) },
      { id: 'enc_t3_war_ritual', weight: 7, result: encounter('war_ritual_circle', 'tier_3', 'ritual', [{ creatureId: 'war_mage', count: 1, rank: 'boss' }, { creatureId: 'acolyte', count: 4, rank: 'standard' }]) },
      { id: 'enc_t3_crypt_lord', weight: 8, tags: ['theme:crypt'], result: encounter('crypt_death_lord', 'tier_3', 'guard', [{ creatureId: 'death_lord', count: 1, rank: 'boss' }, { creatureId: 'wight', count: 2, rank: 'elite' }], ['theme:crypt']) },
      { id: 'enc_t3_cave_apex', weight: 8, tags: ['theme:cave'], result: encounter('cave_apex_predator', 'tier_3', 'nest', [{ creatureId: 'apex_roper', count: 1, rank: 'boss' }, { creatureId: 'troglodyte', count: 3, rank: 'standard' }], ['theme:cave']) },
      { id: 'enc_t3_fortress_warlord', weight: 8, tags: ['theme:fortress'], result: encounter('fortress_warlord', 'tier_3', 'siege', [{ creatureId: 'warlord', count: 1, rank: 'boss' }, { creatureId: 'elite_guard', count: 3, rank: 'elite' }], ['theme:fortress']) },
      { id: 'enc_t3_sewer_tyrant', weight: 8, tags: ['theme:sewer'], result: encounter('sewer_tyrant', 'tier_3', 'ambush', [{ creatureId: 'sewer_tyrant', count: 1, rank: 'boss' }, { creatureId: 'cult_adept', count: 2, rank: 'elite' }], ['theme:sewer']) },
      { id: 'enc_t3_ruins_sentinel', weight: 8, tags: ['theme:ruins'], result: encounter('ruins_sentinel', 'tier_3', 'guard', [{ creatureId: 'rune_sentinel', count: 1, rank: 'boss' }, { creatureId: 'animated_armor', count: 3, rank: 'standard' }], ['theme:ruins']) },
      { id: 'enc_t3_lab_archmage', weight: 8, tags: ['theme:arcane_lab'], result: encounter('lab_archmage_guard', 'tier_3', 'ritual', [{ creatureId: 'archmage', count: 1, rank: 'boss' }, { creatureId: 'shield_construct', count: 2, rank: 'elite' }], ['theme:arcane_lab']) },
    ],
  },
  trap_template_tier_1: {
    id: 'trap_template_tier_1',
    category: 'trap',
    rollMode: 'weighted',
    entries: [
      { id: 'trap_t1_snare', weight: 9, result: { trapId: 'snare_grid', tier: 'tier_1', severity: 'low', tileImpact: 'trap', tags: ['tier:tier_1'] } as TrapTemplateRoll, nextTableId: 'trap_trigger' },
      { id: 'trap_t1_warning', weight: 6, result: { trapId: 'warning_rune', tier: 'tier_1', severity: 'low', tileImpact: 'hazard', tags: ['tier:tier_1'] } as TrapTemplateRoll, nextTableId: 'trap_trigger' },
    ],
  },
  trap_template_tier_2: {
    id: 'trap_template_tier_2',
    category: 'trap',
    rollMode: 'weighted',
    entries: [
      { id: 'trap_t2_lockdown', weight: 8, result: { trapId: 'lockdown_matrix', tier: 'tier_2', severity: 'moderate', tileImpact: 'trap', tags: ['tier:tier_2'] } as TrapTemplateRoll, nextTableId: 'trap_trigger' },
      { id: 'trap_t2_corrosive', weight: 7, result: { trapId: 'corrosive_release', tier: 'tier_2', severity: 'moderate', tileImpact: 'hazard', tags: ['tier:tier_2'] } as TrapTemplateRoll, nextTableId: 'trap_trigger' },
    ],
  },
  trap_template_tier_3: {
    id: 'trap_template_tier_3',
    category: 'trap',
    rollMode: 'weighted',
    entries: [
      { id: 'trap_t3_annihilation', weight: 7, result: { trapId: 'annihilation_lattice', tier: 'tier_3', severity: 'high', tileImpact: 'trap', tags: ['tier:tier_3'] } as TrapTemplateRoll, nextTableId: 'trap_trigger' },
      { id: 'trap_t3_planar', weight: 6, result: { trapId: 'planar_breach', tier: 'tier_3', severity: 'high', tileImpact: 'hazard', tags: ['tier:tier_3'] } as TrapTemplateRoll, nextTableId: 'trap_trigger' },
    ],
  },
  trap_trigger: {
    id: 'trap_trigger',
    category: 'trap',
    rollMode: 'weighted',
    entries: [
      { id: 'trigger_pressure', weight: 10, result: trapComponent('trigger_pressure', 'trigger', 'pressure_plate'), nextTableId: 'trap_effect' },
      { id: 'trigger_tripwire', weight: 9, result: trapComponent('trigger_tripwire', 'trigger', 'tripwire'), nextTableId: 'trap_effect' },
      { id: 'trigger_proximity', weight: 6, tags: ['theme:arcane_lab'], result: trapComponent('trigger_proximity', 'trigger', 'arcane_proximity'), nextTableId: 'trap_effect' },
      { id: 'trigger_disturbed_bones', weight: 7, tags: ['theme:crypt'], result: trapComponent('trigger_disturbed_bones', 'trigger', 'disturbed_bones'), nextTableId: 'trap_effect' },
    ],
  },
  trap_effect: {
    id: 'trap_effect',
    category: 'trap',
    rollMode: 'weighted',
    entries: [
      { id: 'effect_piercing', weight: 10, result: trapComponent('effect_piercing', 'effect', 'piercing_volley'), nextTableId: 'trap_delivery' },
      { id: 'effect_restraining', weight: 8, result: trapComponent('effect_restraining', 'effect', 'restraining_web'), nextTableId: 'trap_delivery' },
      { id: 'effect_necrotic', weight: 6, tags: ['theme:crypt'], result: trapComponent('effect_necrotic', 'effect', 'necrotic_burst'), nextTableId: 'trap_delivery' },
      { id: 'effect_corrosive', weight: 7, tags: ['theme:sewer'], result: trapComponent('effect_corrosive', 'effect', 'corrosive_spray'), nextTableId: 'trap_delivery' },
      { id: 'effect_arc_discharge', weight: 7, tags: ['theme:arcane_lab'], result: trapComponent('effect_arc_discharge', 'effect', 'arc_discharge'), nextTableId: 'trap_delivery' },
    ],
  },
  trap_delivery: {
    id: 'trap_delivery',
    category: 'trap',
    rollMode: 'weighted',
    entries: [
      { id: 'delivery_line', weight: 10, result: trapComponent('delivery_line', 'delivery', 'line_projection') },
      { id: 'delivery_cone', weight: 8, result: trapComponent('delivery_cone', 'delivery', 'cone_burst') },
      { id: 'delivery_burst', weight: 7, result: trapComponent('delivery_burst', 'delivery', 'radial_burst') },
      { id: 'delivery_zone', weight: 6, result: trapComponent('delivery_zone', 'delivery', 'persistent_zone') },
    ],
  },
  loot_tier_1: {
    id: 'loot_tier_1',
    category: 'loot',
    rollMode: 'weighted',
    entries: [
      { id: 'loot_t1_minor_cache', weight: 10, result: { lootId: 'minor_cache', tier: 'tier_1', quantity: { min: 1, max: 2 }, tags: ['tier:tier_1'] } as LootTemplateRoll, nextTableId: 'loot_type' },
      { id: 'loot_t1_scrap_bundle', weight: 6, result: { lootId: 'scrap_bundle', tier: 'tier_1', quantity: { min: 2, max: 4 }, tags: ['tier:tier_1'] } as LootTemplateRoll, nextTableId: 'loot_type' },
    ],
  },
  loot_tier_2: {
    id: 'loot_tier_2',
    category: 'loot',
    rollMode: 'weighted',
    entries: [
      { id: 'loot_t2_guarded_stash', weight: 9, result: { lootId: 'guarded_stash', tier: 'tier_2', quantity: { min: 2, max: 5 }, tags: ['tier:tier_2'] } as LootTemplateRoll, nextTableId: 'loot_type' },
      { id: 'loot_t2_sealed_crate', weight: 7, result: { lootId: 'sealed_crate', tier: 'tier_2', quantity: { min: 1, max: 3 }, tags: ['tier:tier_2'] } as LootTemplateRoll, nextTableId: 'loot_type' },
    ],
  },
  loot_tier_3: {
    id: 'loot_tier_3',
    category: 'loot',
    rollMode: 'weighted',
    entries: [
      { id: 'loot_t3_relic_cache', weight: 8, result: { lootId: 'relic_cache', tier: 'tier_3', quantity: { min: 1, max: 2 }, tags: ['tier:tier_3'] } as LootTemplateRoll, nextTableId: 'loot_type' },
      { id: 'loot_t3_master_vault', weight: 6, result: { lootId: 'master_vault', tier: 'tier_3', quantity: { min: 2, max: 4 }, tags: ['tier:tier_3'] } as LootTemplateRoll, nextTableId: 'loot_type' },
    ],
  },
  loot_type: {
    id: 'loot_type',
    category: 'loot',
    rollMode: 'weighted',
    entries: [
      { id: 'loot_type_currency', weight: 10, result: lootKind('currency_bundle', 'currency'), nextTableId: 'loot_flavor' },
      { id: 'loot_type_gear', weight: 8, result: lootKind('battle_gear', 'gear'), nextTableId: 'loot_flavor' },
      { id: 'loot_type_consumable', weight: 8, result: lootKind('consumables', 'consumable'), nextTableId: 'loot_flavor' },
      { id: 'loot_type_relic', weight: 6, result: lootKind('relic_fragment', 'relic'), nextTableId: 'loot_flavor' },
    ],
  },
  loot_flavor: {
    id: 'loot_flavor',
    category: 'loot',
    rollMode: 'weighted',
    entries: [
      { id: 'loot_flavor_stamped', weight: 8, result: lootFlavor('stamped', 'officially_stamped') },
      { id: 'loot_flavor_weathered', weight: 8, result: lootFlavor('weathered', 'weathered_and_old') },
      { id: 'loot_flavor_crypt', weight: 7, tags: ['theme:crypt'], result: lootFlavor('cryptic', 'funerary_motif', ['theme:crypt']) },
      { id: 'loot_flavor_cave', weight: 7, tags: ['theme:cave'], result: lootFlavor('mineral', 'mineral_encrusted', ['theme:cave']) },
      { id: 'loot_flavor_fortress', weight: 7, tags: ['theme:fortress'], result: lootFlavor('military', 'military_issue', ['theme:fortress']) },
      { id: 'loot_flavor_sewer', weight: 7, tags: ['theme:sewer'], result: lootFlavor('smuggled', 'smuggler_marked', ['theme:sewer']) },
      { id: 'loot_flavor_ruins', weight: 7, tags: ['theme:ruins'], result: lootFlavor('antique', 'antique_patina', ['theme:ruins']) },
      { id: 'loot_flavor_lab', weight: 7, tags: ['theme:arcane_lab'], result: lootFlavor('attuned', 'arcane_attuned', ['theme:arcane_lab']) },
    ],
  },
  environmental_feature: {
    id: 'environmental_feature',
    category: 'environment',
    rollMode: 'weighted',
    entries: [
      { id: 'env_drafts', weight: 9, result: envFeature('drafts', 'atmosphere', 'low', 'none') },
      { id: 'env_rubble', weight: 8, result: envFeature('rubble', 'terrain', 'moderate', 'none') },
      { id: 'env_spores', weight: 7, tags: ['theme:cave'], result: envFeature('spore_cloud', 'hazard', 'moderate', 'hazard', ['theme:cave']) },
      { id: 'env_ooze_runoff', weight: 7, tags: ['theme:sewer'], result: envFeature('ooze_runoff', 'hazard', 'high', 'hazard', ['theme:sewer']) },
      { id: 'env_death_chill', weight: 7, tags: ['theme:crypt'], result: envFeature('death_chill', 'atmosphere', 'moderate', 'none', ['theme:crypt']) },
      { id: 'env_arc_flux', weight: 7, tags: ['theme:arcane_lab'], result: envFeature('arcane_flux', 'arcane', 'high', 'hazard', ['theme:arcane_lab']) },
      { id: 'env_banner_hall', weight: 6, tags: ['theme:fortress'], result: envFeature('banner_hall', 'atmosphere', 'low', 'none', ['theme:fortress']) },
      { id: 'env_fallen_pillars', weight: 6, tags: ['theme:ruins'], result: envFeature('fallen_pillars', 'terrain', 'moderate', 'none', ['theme:ruins']) },
    ],
  },
  corridor_event: {
    id: 'corridor_event',
    category: 'corridor',
    rollMode: 'weighted',
    entries: [
      { id: 'corridor_quiet', weight: 18, result: corridorEvent('quiet_passage', 'quiet', 'none') },
      { id: 'corridor_patrol', weight: 8, result: corridorEvent('patrol_route', 'patrol', 'none') },
      { id: 'corridor_discovery', weight: 6, result: corridorEvent('discovery_marker', 'discovery', 'none') },
      { id: 'corridor_hazard', weight: 5, result: corridorEvent('hazard_patch', 'hazard', 'hazard') },
      { id: 'corridor_trap', weight: 4, result: corridorEvent('trip_trap', 'trap', 'trap') },
      { id: 'corridor_crypt_warning', weight: 4, tags: ['theme:crypt'], result: corridorEvent('grave_whisper', 'hazard', 'hazard', ['theme:crypt']) },
      { id: 'corridor_sewer_flood', weight: 4, tags: ['theme:sewer'], result: corridorEvent('flood_surge', 'hazard', 'hazard', ['theme:sewer']) },
      { id: 'corridor_lab_arc', weight: 4, tags: ['theme:arcane_lab'], result: corridorEvent('arc_flash', 'trap', 'trap', ['theme:arcane_lab']) },
    ],
  },
  dungeon_modifier: {
    id: 'dungeon_modifier',
    category: 'modifier',
    rollMode: 'dice',
    dice: { count: 1, sides: 12 },
    entries: [
      { id: 'mod_ashen_air', range: { min: 1, max: 2 }, result: dungeonModifier('ashen_air', 'Ashen Airflow', 1.1, 1.2, 0, ['bias:hazard'], ['room:utility']) },
      { id: 'mod_predator_routes', range: { min: 3, max: 4 }, result: dungeonModifier('predator_routes', 'Predator Routes', 1.0, 0.9, 1, ['bias:encounter'], ['room:transit']) },
      { id: 'mod_collapsing_works', range: { min: 5, max: 6 }, result: dungeonModifier('collapsing_works', 'Collapsing Works', 0.9, 1.3, 0, ['bias:hazard'], ['room:objective']) },
      { id: 'mod_hunters_lock', range: { min: 7, max: 8 }, result: dungeonModifier('hunters_lock', 'Hunter Lockdown', 1.3, 1.0, 0, ['bias:trap'], ['room:transit']) },
      { id: 'mod_trophy_traffic', range: { min: 9, max: 10 }, result: dungeonModifier('trophy_traffic', 'Trophy Traffic', 1.0, 1.0, 0, ['bias:quiet'], ['room:treasure']) },
      { id: 'mod_war_protocol', range: { min: 11, max: 12 }, result: dungeonModifier('war_protocol', 'War Protocol', 1.1, 1.0, 1, ['bias:encounter', 'bias:trap'], ['room:boss']) },
    ],
  },
};

export function rollRoomPurpose(context: TableRollContext): TableRollResult<RoomPurposeMetadata> | null {
  const rolled = rollTable(DUNGEON_TABLES, 'room_purpose', context);
  return rolled as TableRollResult<RoomPurposeMetadata> | null;
}

export function rollEncounterTier(
  tier: EncounterTier,
  context: TableRollContext,
): TableRollResult<EncounterContentPayload> | null {
  const tableId = `encounter_${tier}` as const;
  const rolled = rollTable(DUNGEON_TABLES, tableId, context);
  return rolled as TableRollResult<EncounterContentPayload> | null;
}

export function rollTrapChain(
  tier: EncounterTier,
  context: TableRollContext,
): TableRollResult<TrapTemplateRoll> | null {
  const tableId = `trap_template_${tier}` as const;
  const rolled = rollTable(DUNGEON_TABLES, tableId, context);
  return rolled as TableRollResult<TrapTemplateRoll> | null;
}

export function rollLootChain(
  tier: LootTier,
  context: TableRollContext,
): TableRollResult<LootTemplateRoll> | null {
  const tableId = `loot_${tier}` as const;
  const rolled = rollTable(DUNGEON_TABLES, tableId, context);
  return rolled as TableRollResult<LootTemplateRoll> | null;
}

export function rollEnvironmentalFeature(
  context: TableRollContext,
): TableRollResult<EnvironmentalFeaturePayload> | null {
  const rolled = rollTable(DUNGEON_TABLES, 'environmental_feature', context);
  return rolled as TableRollResult<EnvironmentalFeaturePayload> | null;
}

export function rollCorridorEvent(context: TableRollContext): TableRollResult<CorridorEventPayload> | null {
  const rolled = rollTable(DUNGEON_TABLES, 'corridor_event', context);
  return rolled as TableRollResult<CorridorEventPayload> | null;
}

export function rollDungeonModifier(context: TableRollContext): TableRollResult<DungeonModifier> | null {
  const rolled = rollTable(DUNGEON_TABLES, 'dungeon_modifier', context);
  return rolled as TableRollResult<DungeonModifier> | null;
}

export function extractFromChain<TPayload extends object>(
  root: TableRollResult | null,
  tableId: string,
): TPayload | null {
  const chain = flattenRollChain(root);
  const found = chain.find((node) => node.tableId === tableId);
  return (found?.result as TPayload | undefined) ?? null;
}

export function chainTags(root: TableRollResult | null): string[] {
  const chain = flattenRollChain(root);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const node of chain) {
    for (const tag of node.tags) {
      if (seen.has(tag)) continue;
      seen.add(tag);
      out.push(tag);
    }
  }
  return out;
}
