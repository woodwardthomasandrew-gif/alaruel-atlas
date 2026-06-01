// ui/src/views/magic-items/magicItemFields.ts
// Shared type-specific field definitions and helpers for magic item forms.

export const MAGIC_ITEM_TYPES = [
  'armor',
  'weapon',
  'potion',
  'ring',
  'rod',
  'scroll',
  'staff',
  'wand',
  'wondrous item',
  'other',
] as const;

export type MagicItemType = typeof MAGIC_ITEM_TYPES[number];

export const MAGIC_ITEM_RARITIES = [
  'common',
  'uncommon',
  'rare',
  'very rare',
  'legendary',
  'artifact',
  'varies',
] as const;

export type MagicItemRarity = typeof MAGIC_ITEM_RARITIES[number];

export type MagicItemFieldKind = 'text' | 'number' | 'textarea' | 'checkbox' | 'select';

export interface MagicItemFieldDefinition {
  key: string;
  label: string;
  kind: MagicItemFieldKind;
  placeholder?: string;
  help?: string;
  options?: readonly string[];
}

export type MagicItemData = Record<string, string | number | boolean | null | undefined>;

export interface MagicItemTypeConfig {
  title: string;
  summaryFields: readonly string[];
  defaults: MagicItemData;
  fields: readonly MagicItemFieldDefinition[];
}

export const MAGIC_ITEM_TYPE_CONFIGS: Record<MagicItemType, MagicItemTypeConfig> = {
  weapon: {
    title: 'Weapon Profile',
    summaryFields: ['attackBonus', 'damage', 'range', 'properties'],
    defaults: {
      attackBonus: '',
      damage: '',
      range: '5 ft.',
      properties: '',
      damageType: 'slashing',
    },
    fields: [
      { key: 'attackBonus', label: 'Bonus to Hit', kind: 'number', help: 'The attack modifier granted by the item.' },
      { key: 'damage', label: 'Damage', kind: 'text', placeholder: '1d8 + 1', help: 'Write the damage dice and flat bonus.' },
      { key: 'damageType', label: 'Damage Type', kind: 'select', options: ['slashing', 'piercing', 'bludgeoning', 'force', 'fire', 'cold', 'lightning', 'acid', 'poison', 'necrotic', 'radiant', 'thunder'] },
      { key: 'range', label: 'Range', kind: 'text', placeholder: '5 ft. or 20/60 ft.' },
      { key: 'properties', label: 'Properties', kind: 'text', placeholder: 'finesse, light, thrown' },
    ],
  },
  armor: {
    title: 'Armor Profile',
    summaryFields: ['armorBonus', 'armorType', 'stealthDisadvantage'],
    defaults: {
      armorBonus: '',
      armorType: 'light armor',
      stealthDisadvantage: false,
      notes: '',
    },
    fields: [
      { key: 'armorBonus', label: 'Armor Bonus', kind: 'number', help: 'AC bonus or bonus to the base armor.' },
      { key: 'armorType', label: 'Armor Type', kind: 'select', options: ['light armor', 'medium armor', 'heavy armor', 'shield', 'bracers', 'boots', 'cloak', 'other'] },
      { key: 'stealthDisadvantage', label: 'Stealth Disadvantage', kind: 'checkbox', help: 'Check if the item imposes stealth disadvantage.' },
      { key: 'notes', label: 'Notes', kind: 'textarea', placeholder: 'Special armor properties or restrictions.' },
    ],
  },
  potion: {
    title: 'Potion Formula',
    summaryFields: ['effect', 'duration', 'uses'],
    defaults: {
      effect: '',
      duration: '',
      uses: '',
    },
    fields: [
      { key: 'effect', label: 'Effect', kind: 'textarea', placeholder: 'What happens when it is drunk or applied?' },
      { key: 'duration', label: 'Duration', kind: 'text', placeholder: 'Instant, 1 hour, until dawn, etc.' },
      { key: 'uses', label: 'Uses', kind: 'number', help: 'Optional uses or doses in the container.' },
    ],
  },
  ring: {
    title: 'Ring Traits',
    summaryFields: ['effect', 'charges', 'recharge'],
    defaults: {
      effect: '',
      charges: '',
      recharge: '',
    },
    fields: [
      { key: 'effect', label: 'Effect', kind: 'textarea', placeholder: 'Passive effect or activated ability.' },
      { key: 'charges', label: 'Charges', kind: 'number', help: 'Leave blank if the ring has no charges.' },
      { key: 'recharge', label: 'Recharge', kind: 'text', placeholder: 'Dawn, 1d4 days, etc.' },
    ],
  },
  rod: {
    title: 'Rod Traits',
    summaryFields: ['effect', 'charges', 'recharge'],
    defaults: {
      effect: '',
      charges: '',
      recharge: '',
    },
    fields: [
      { key: 'effect', label: 'Effect', kind: 'textarea', placeholder: 'What the rod does when held or activated.' },
      { key: 'charges', label: 'Charges', kind: 'number' },
      { key: 'recharge', label: 'Recharge', kind: 'text', placeholder: 'Dawn, 1d6 days, etc.' },
    ],
  },
  scroll: {
    title: 'Scroll Script',
    summaryFields: ['spellName', 'spellLevel', 'consumed'],
    defaults: {
      spellName: '',
      spellLevel: '',
      consumed: true,
    },
    fields: [
      { key: 'spellName', label: 'Spell Name', kind: 'text', placeholder: 'Fireball, Identify, etc.' },
      { key: 'spellLevel', label: 'Spell Level', kind: 'number', help: 'Use 0 for cantrips or leave blank.' },
      { key: 'consumed', label: 'Consumed on Use', kind: 'checkbox', help: 'Scroll is destroyed after use.' },
    ],
  },
  staff: {
    title: 'Staff Properties',
    summaryFields: ['charges', 'recharge', 'effect'],
    defaults: {
      charges: '',
      recharge: '',
      effect: '',
    },
    fields: [
      { key: 'charges', label: 'Charges', kind: 'number' },
      { key: 'recharge', label: 'Recharge', kind: 'text', placeholder: 'Dawn, 1d6 charges at dawn, etc.' },
      { key: 'effect', label: 'Effect', kind: 'textarea', placeholder: 'What the staff can cast, store, or amplify.' },
    ],
  },
  wand: {
    title: 'Wand Properties',
    summaryFields: ['charges', 'recharge', 'effect'],
    defaults: {
      charges: '',
      recharge: '',
      effect: '',
    },
    fields: [
      { key: 'charges', label: 'Charges', kind: 'number' },
      { key: 'recharge', label: 'Recharge', kind: 'text', placeholder: 'Dawn, 1d6 charges at dawn, etc.' },
      { key: 'effect', label: 'Effect', kind: 'textarea', placeholder: 'What the wand casts or enhances.' },
    ],
  },
  'wondrous item': {
    title: 'Wondrous Item Traits',
    summaryFields: ['effect', 'charges', 'recharge'],
    defaults: {
      effect: '',
      charges: '',
      recharge: '',
    },
    fields: [
      { key: 'effect', label: 'Effect', kind: 'textarea', placeholder: 'Describe the magical effect.' },
      { key: 'charges', label: 'Charges', kind: 'number' },
      { key: 'recharge', label: 'Recharge', kind: 'text', placeholder: 'Dawn, 1d4 days, etc.' },
    ],
  },
  other: {
    title: 'Item Details',
    summaryFields: ['effect', 'notes'],
    defaults: {
      effect: '',
      notes: '',
    },
    fields: [
      { key: 'effect', label: 'Effect', kind: 'textarea', placeholder: 'Primary magical effect or description.' },
      { key: 'notes', label: 'Notes', kind: 'textarea', placeholder: 'Any extra rules, quirks, or GM notes.' },
    ],
  },
};

export function titleCase(value: string): string {
  return value
    .split(' ')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function parseMagicItemData(raw: string | null | undefined): MagicItemData {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as MagicItemData : {};
  } catch {
    return {};
  }
}

export function getMagicItemConfig(itemType: string): MagicItemTypeConfig {
  const key = itemType as MagicItemType;
  return MAGIC_ITEM_TYPE_CONFIGS[key] ?? MAGIC_ITEM_TYPE_CONFIGS.other;
}

export function getMagicItemDefaults(itemType: string): MagicItemData {
  return { ...getMagicItemConfig(itemType).defaults };
}

export function normalizeMagicItemData(itemType: string, raw: string | null | undefined): MagicItemData {
  return {
    ...getMagicItemDefaults(itemType),
    ...parseMagicItemData(raw),
  };
}

export function serializeMagicItemData(data: MagicItemData): string {
  return JSON.stringify(data);
}

export function formatMagicItemDataValue(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '—';
  return String(value);
}
