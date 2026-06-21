import { useCallback, useEffect, useMemo, useState } from 'react';
import { Icon } from '../../components/ui/Icon';
import { atlas } from '../../bridge/atlas';
import { useCampaignStore } from '../../store/campaign.store';
import type {
  PartyAirship,
  PartyAirshipAttachmentSlot,
  PartyAirshipAttachmentSlotType,
  PartyAirshipCaptainOrder,
  PartyAirshipCargoItem,
  PartyAirshipCrewMember,
  PartyAirshipCrewQuality,
  PartyAirshipRangeBand,
  PartyAirshipSystem,
  PartyAirshipSystemStatus,
  PartyAirshipWeapon,
  PartyAirshipWeaponStatus,
} from '../../types/party';
import styles from './PartyView.module.css';

interface AirshipRow {
  id: string;
  name: string;
  ship_class: string;
  ship_armor_class: number | null;
  ship_speed_rating: number | null;
  ship_hull_current: number | null;
  ship_hull_maximum: number | null;
  ship_strain_current: number | null;
  ship_crew_required: number | null;
  ship_crew_current: number | null;
  ship_crew_quality: string | null;
  ship_crew_losses: number | null;
  ship_progress_current: number | null;
  ship_current_range_band: string | null;
  ship_current_captain_order: string | null;
  ship_weapon_slot_count: number | null;
  ship_hull_slot_count: number | null;
  ship_engine_slot_count: number | null;
  ship_utility_slot_count: number | null;
  ship_special_slot_count: number | null;
  ship_crew_json: string | null;
  ship_systems_json: string | null;
  ship_attachment_slots_json: string | null;
  ship_weapons_json: string | null;
  armor_class: number | null;
  speed_rating: number | null;
  hull_current: number | null;
  hull_maximum: number | null;
  strain_current: number | null;
  crew_required: number | null;
  crew_current: number | null;
  crew_quality: string | null;
  crew_losses: number | null;
  progress_current: number | null;
  current_range_band: string | null;
  current_captain_order: string | null;
  weapon_slot_count: number | null;
  hull_slot_count: number | null;
  engine_slot_count: number | null;
  utility_slot_count: number | null;
  special_slot_count: number | null;
  crew_json: string | null;
  systems_json: string | null;
  attachment_slots_json: string | null;
  weapons_json: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

interface AirshipCargoRow {
  id: string;
  airship_id: string;
  name: string;
  quantity: number;
  weight: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface AirshipCrewRow {
  id: string;
  name: string;
  role: string;
  duty: string;
  notes: string;
}

interface AirshipSystemRow {
  id: string;
  name: string;
  status: string;
  notes: string;
  effects: string;
}

interface AirshipAttachmentSlotRow {
  id: string;
  type: string;
  name: string;
  status: string;
  description: string;
  effects: string;
  notes: string;
  icon?: string;
  attachmentId?: string;
}

interface AirshipWeaponRow {
  id: string;
  name: string;
  range: string;
  damage: string;
  assignedGunner: string;
  status: string;
  notes: string;
  slotId?: string;
}

interface SlotCountState {
  weapon: number;
  hull: number;
  engine: number;
  utility: number;
  special: number;
}

const CREW_QUALITY_OPTIONS: Array<{ value: PartyAirshipCrewQuality; label: string; modifier: string }> = [
  { value: 'green', label: 'Green', modifier: '-1' },
  { value: 'trained', label: 'Trained', modifier: '0' },
  { value: 'veteran', label: 'Veteran', modifier: '+1' },
  { value: 'elite', label: 'Elite', modifier: '+2' },
];

const RANGE_BANDS: Array<{ value: PartyAirshipRangeBand; label: string }> = [
  { value: 'close', label: 'Close' },
  { value: 'near', label: 'Near' },
  { value: 'far', label: 'Far' },
  { value: 'extreme', label: 'Extreme' },
];

const CAPTAIN_ORDERS: Array<{ value: PartyAirshipCaptainOrder; label: string; effect: string }> = [
  { value: 'none', label: 'No Order', effect: 'No active captain order.' },
  { value: 'focus_fire', label: 'Focus Fire', effect: 'Advantage on one weapon.' },
  { value: 'brace', label: 'Brace', effect: 'Reduce incoming damage.' },
  { value: 'full_ahead', label: 'Full Ahead', effect: '+1 Progress this round.' },
  { value: 'damage_control', label: 'Damage Control', effect: 'Repair or stabilize a system.' },
  { value: 'pin_them', label: 'Pin Them', effect: 'Pressure range changes and lock maneuvering.' },
];

const SYSTEM_STATUS_OPTIONS: Array<{ value: PartyAirshipSystemStatus; label: string }> = [
  { value: 'healthy', label: 'Healthy' },
  { value: 'damaged', label: 'Damaged' },
  { value: 'disabled', label: 'Disabled' },
  { value: 'destroyed', label: 'Destroyed' },
];

const WEAPON_STATUS_OPTIONS: Array<{ value: PartyAirshipWeaponStatus; label: string }> = [
  { value: 'ready', label: 'Ready' },
  { value: 'damaged', label: 'Damaged' },
  { value: 'disabled', label: 'Disabled' },
];

const ATTACHMENT_TYPES: Array<{ value: PartyAirshipAttachmentSlotType; label: string }> = [
  { value: 'weapon', label: 'Weapon' },
  { value: 'hull', label: 'Hull' },
  { value: 'engine', label: 'Engine' },
  { value: 'utility', label: 'Utility' },
  { value: 'special', label: 'Special' },
];

const DEFAULT_SYSTEMS: Array<Pick<PartyAirshipSystem, 'name' | 'status' | 'notes' | 'effects'>> = [
  { name: 'Engines', status: 'healthy', notes: '', effects: '' },
  { name: 'Steering', status: 'healthy', notes: '', effects: '' },
  { name: 'Port Weapons', status: 'healthy', notes: '', effects: '' },
  { name: 'Starboard Weapons', status: 'healthy', notes: '', effects: '' },
  { name: 'Rigging', status: 'healthy', notes: '', effects: '' },
  { name: 'Arcane Core', status: 'healthy', notes: '', effects: '' },
  { name: 'Ballast', status: 'healthy', notes: '', effects: '' },
];

const AIRSHIP_SCHEMA_COLUMNS: Array<{ name: string; alterSql: string }> = [
  { name: 'ship_armor_class', alterSql: "ALTER TABLE party_airships ADD COLUMN ship_armor_class INTEGER NOT NULL DEFAULT 0;" },
  { name: 'ship_speed_rating', alterSql: "ALTER TABLE party_airships ADD COLUMN ship_speed_rating INTEGER NOT NULL DEFAULT 0;" },
  { name: 'ship_hull_current', alterSql: "ALTER TABLE party_airships ADD COLUMN ship_hull_current INTEGER NOT NULL DEFAULT 0;" },
  { name: 'ship_hull_maximum', alterSql: "ALTER TABLE party_airships ADD COLUMN ship_hull_maximum INTEGER NOT NULL DEFAULT 0;" },
  { name: 'ship_strain_current', alterSql: "ALTER TABLE party_airships ADD COLUMN ship_strain_current INTEGER NOT NULL DEFAULT 0;" },
  { name: 'ship_crew_required', alterSql: "ALTER TABLE party_airships ADD COLUMN ship_crew_required INTEGER NOT NULL DEFAULT 0;" },
  { name: 'ship_crew_current', alterSql: "ALTER TABLE party_airships ADD COLUMN ship_crew_current INTEGER NOT NULL DEFAULT 0;" },
  { name: 'ship_crew_quality', alterSql: "ALTER TABLE party_airships ADD COLUMN ship_crew_quality TEXT NOT NULL DEFAULT 'trained';" },
  { name: 'ship_crew_losses', alterSql: "ALTER TABLE party_airships ADD COLUMN ship_crew_losses INTEGER NOT NULL DEFAULT 0;" },
  { name: 'ship_progress_current', alterSql: "ALTER TABLE party_airships ADD COLUMN ship_progress_current INTEGER NOT NULL DEFAULT 0;" },
  { name: 'ship_current_range_band', alterSql: "ALTER TABLE party_airships ADD COLUMN ship_current_range_band TEXT NOT NULL DEFAULT 'near';" },
  { name: 'ship_current_captain_order', alterSql: "ALTER TABLE party_airships ADD COLUMN ship_current_captain_order TEXT NOT NULL DEFAULT 'none';" },
  { name: 'ship_weapon_slot_count', alterSql: "ALTER TABLE party_airships ADD COLUMN ship_weapon_slot_count INTEGER NOT NULL DEFAULT 0;" },
  { name: 'ship_hull_slot_count', alterSql: "ALTER TABLE party_airships ADD COLUMN ship_hull_slot_count INTEGER NOT NULL DEFAULT 0;" },
  { name: 'ship_engine_slot_count', alterSql: "ALTER TABLE party_airships ADD COLUMN ship_engine_slot_count INTEGER NOT NULL DEFAULT 0;" },
  { name: 'ship_utility_slot_count', alterSql: "ALTER TABLE party_airships ADD COLUMN ship_utility_slot_count INTEGER NOT NULL DEFAULT 0;" },
  { name: 'ship_special_slot_count', alterSql: "ALTER TABLE party_airships ADD COLUMN ship_special_slot_count INTEGER NOT NULL DEFAULT 0;" },
  { name: 'ship_attachment_slots_json', alterSql: "ALTER TABLE party_airships ADD COLUMN ship_attachment_slots_json TEXT NOT NULL DEFAULT '[]';" },
  { name: 'ship_weapons_json', alterSql: "ALTER TABLE party_airships ADD COLUMN ship_weapons_json TEXT NOT NULL DEFAULT '[]';" },
  { name: 'ship_crew_json', alterSql: "ALTER TABLE party_airships ADD COLUMN ship_crew_json TEXT NOT NULL DEFAULT '[]';" },
  { name: 'ship_systems_json', alterSql: "ALTER TABLE party_airships ADD COLUMN ship_systems_json TEXT NOT NULL DEFAULT '[]';" },
];

function safeJsonArray<T>(raw: string | null | undefined): T[] {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function clampInt(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

function createId(prefix: string, index: number): string {
  return `${prefix}-${index + 1}`;
}

function mapCrewMember(row: Partial<AirshipCrewRow> | null | undefined, index: number): PartyAirshipCrewMember {
  return {
    id: row?.id?.trim() || createId('crew', index),
    name: row?.name ?? '',
    role: row?.role ?? '',
    duty: row?.duty ?? '',
    notes: row?.notes ?? '',
  };
}

function mapSystem(row: Partial<AirshipSystemRow> | null | undefined, index: number): PartyAirshipSystem {
  return {
    id: row?.id?.trim() || createId('system', index),
    name: row?.name ?? '',
    status: row?.status ?? 'healthy',
    notes: row?.notes ?? '',
    effects: row?.effects ?? '',
  };
}

function mapAttachmentSlot(
  row: Partial<AirshipAttachmentSlotRow> | null | undefined,
  index: number,
): PartyAirshipAttachmentSlot {
  return {
    id: row?.id?.trim() || createId('slot', index),
    type: ATTACHMENT_TYPES.some(option => option.value === row?.type)
      ? (row?.type as PartyAirshipAttachmentSlotType)
      : 'utility',
    name: row?.name ?? '',
    status: row?.status ?? 'Empty',
    description: row?.description ?? '',
    effects: row?.effects ?? '',
    notes: row?.notes ?? '',
    icon: row?.icon ?? '',
    attachmentId: row?.attachmentId ?? '',
  };
}

function mapWeapon(row: Partial<AirshipWeaponRow> | null | undefined, index: number): PartyAirshipWeapon {
  return {
    id: row?.id?.trim() || createId('weapon', index),
    name: row?.name ?? '',
    range: row?.range ?? '',
    damage: row?.damage ?? '',
    assignedGunner: row?.assignedGunner ?? '',
    status: row?.status ?? 'ready',
    notes: row?.notes ?? '',
    slotId: row?.slotId ?? '',
  };
}

function createSlotForType(type: PartyAirshipAttachmentSlotType, index: number): PartyAirshipAttachmentSlot {
  const label = ATTACHMENT_TYPES.find(option => option.value === type)?.label ?? type;
  return {
    id: `${type}-slot-${index + 1}`,
    type,
    name: `${label} Slot ${index + 1}`,
    status: 'Empty',
    description: '',
    effects: '',
    notes: '',
    icon: '',
    attachmentId: '',
  };
}

function reconcileSlots(previous: PartyAirshipAttachmentSlot[], counts: SlotCountState): PartyAirshipAttachmentSlot[] {
  const nextSlots: PartyAirshipAttachmentSlot[] = [];

  for (const type of ATTACHMENT_TYPES) {
    const targetCount = counts[type.value] ?? 0;
    const priorForType = previous.filter(slot => slot.type === type.value);

    for (let index = 0; index < targetCount; index += 1) {
      nextSlots.push(priorForType[index] ?? createSlotForType(type.value, index));
    }
  }

  return nextSlots;
}

function createDefaultSystems(): PartyAirshipSystem[] {
  return DEFAULT_SYSTEMS.map((system, index) => ({
    id: createId('system', index),
    ...system,
  }));
}

function getCrewQualityLabel(value: PartyAirshipCrewQuality): string {
  return CREW_QUALITY_OPTIONS.find(option => option.value === value)?.label ?? 'Trained';
}

function getRangeIndex(value: PartyAirshipRangeBand): number {
  return RANGE_BANDS.findIndex(option => option.value === value);
}

function getCaptainOrderEffect(value: PartyAirshipCaptainOrder): string {
  return CAPTAIN_ORDERS.find(option => option.value === value)?.effect ?? 'No active captain order.';
}

function getCaptainOrderLabel(value: PartyAirshipCaptainOrder): string {
  return CAPTAIN_ORDERS.find(option => option.value === value)?.label ?? 'No Order';
}

function getHullState(current: number, maximum: number): { label: string; note: string; tone: string } {
  if (maximum <= 0 || current <= 0) return { label: 'Disabled', note: 'Hull at zero.', tone: 'bad' };

  const ratio = (current / maximum) * 100;
  if (ratio >= 51) return { label: 'Normal', note: 'Operating normally.', tone: 'good' };
  if (ratio >= 26) return { label: 'Damaged', note: '-1 checks.', tone: 'warn' };
  return { label: 'Critical', note: 'System damage each round.', tone: 'bad' };
}

function getStrainEffect(strain: number): { label: string; note: string } {
  if (strain <= 1) return { label: 'Stable', note: 'No effect.' };
  if (strain === 2) return { label: 'Tense', note: '-1 Helm actions, -1 Engineer actions.' };
  if (strain === 3) return { label: 'Overloaded', note: 'Speed Rating +1.' };
  if (strain === 4) return { label: 'Critical', note: 'System damage each round.' };
  return { label: 'Critical Failure', note: 'Major system failure or engine shutdown. Reset strain to 2.' };
}

function getCrewPenalties(airship: PartyAirship): string[] {
  const penalties: string[] = [];

  if (airship.crewCurrent < airship.crewRequired) {
    penalties.push('Understaffed: -1 to all roles.');
    penalties.push('Understaffed: lose 1 role action.');
  } else if (airship.crewCurrent > airship.crewRequired) {
    penalties.push('Overstaffed: crew bonus available.');
  }

  if (airship.crewLosses >= 5) {
    penalties.push('Crew broken.');
  } else if (airship.crewLosses >= 3) {
    penalties.push('Crew losses: lose 1 role action.');
  }

  if (airship.crewLosses >= 1) {
    penalties.push(`Crew losses: -${airship.crewLosses} cumulative penalty.`);
  }

  if (airship.crewQuality === 'green') penalties.push('Crew quality: -1 checks.');
  if (airship.crewQuality === 'veteran') penalties.push('Crew quality: +1 checks.');
  if (airship.crewQuality === 'elite') penalties.push('Crew quality: +2 checks.');

  return penalties;
}

function getSystemStatusLabel(status: string): string {
  return SYSTEM_STATUS_OPTIONS.find(option => option.value === status)?.label ?? 'Healthy';
}

function getWeightedCargo(cargo: PartyAirshipCargoItem[]): number {
  return cargo.reduce((total, item) => total + item.quantity * item.weight, 0);
}

async function ensureAirshipSchema(): Promise<void> {
  const existingColumns = new Set(
    (await atlas.db.query<{ name: string }>(
      `SELECT name
         FROM pragma_table_info('party_airships')`,
    )).map(row => row.name),
  );

  for (const column of AIRSHIP_SCHEMA_COLUMNS) {
    if (!existingColumns.has(column.name)) {
      await atlas.db.run(column.alterSql);
    }
  }
}

export default function AirshipManagement() {
  const campaign = useCampaignStore(state => state.campaign);
  const [airship, setAirship] = useState<PartyAirship | null>(null);
  const [cargo, setCargo] = useState<PartyAirshipCargoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!campaign) {
      setAirship(null);
      setCargo([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await ensureAirshipSchema();
      const [airshipRows, cargoRows] = await Promise.all([
        atlas.db.query<AirshipRow>('SELECT * FROM party_airships WHERE campaign_id = ? LIMIT 1', [campaign.id]),
        atlas.db.query<AirshipCargoRow>(
          `SELECT * FROM party_airship_cargo
           WHERE campaign_id = ?
           ORDER BY sort_order ASC, created_at ASC, name ASC`,
          [campaign.id],
        ),
      ]);

      setCargo(cargoRows.map(row => ({
        id: row.id,
        airshipId: row.airship_id,
        name: row.name,
        quantity: row.quantity,
        weight: row.weight,
        sortOrder: row.sort_order,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })));

      setAirship(airshipRows[0] ? mapAirship(airshipRows[0]) : null);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : String(loadError);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [campaign]);

  useEffect(() => {
    void load();
  }, [load]);

  const sortedCargo = useMemo(() => {
    if (!airship) return [];
    return cargo.filter(item => item.airshipId === airship.id);
  }, [airship, cargo]);

  const cargoWeight = useMemo(() => getWeightedCargo(sortedCargo), [sortedCargo]);
  const attachmentCounts = useMemo<SlotCountState>(
    () => ({
      weapon: airship?.weaponSlotCount ?? 0,
      hull: airship?.hullSlotCount ?? 0,
      engine: airship?.engineSlotCount ?? 0,
      utility: airship?.utilitySlotCount ?? 0,
      special: airship?.specialSlotCount ?? 0,
    }),
    [airship],
  );

  const hullState = useMemo(
    () => getHullState(airship?.hullCurrent ?? 0, airship?.hullMaximum ?? 0),
    [airship?.hullCurrent, airship?.hullMaximum],
  );
  const strainEffect = useMemo(() => getStrainEffect(airship?.strainCurrent ?? 0), [airship?.strainCurrent]);
  const crewPenalties = useMemo(() => (airship ? getCrewPenalties(airship) : []), [airship]);
  const activeSystemEffects = useMemo(() => {
    if (!airship) return [];
    return airship.systems.filter(system => system.status !== 'healthy' || system.effects.trim().length > 0);
  }, [airship]);
  const attachmentSlotsByType = useMemo(() => {
    if (!airship) return {} as Record<PartyAirshipAttachmentSlotType, PartyAirshipAttachmentSlot[]>;

    return ATTACHMENT_TYPES.reduce((groups, type) => {
      groups[type.value] = airship.attachmentSlots.filter(slot => slot.type === type.value);
      return groups;
    }, {} as Record<PartyAirshipAttachmentSlotType, PartyAirshipAttachmentSlot[]>);
  }, [airship]);

  function reportError(message: string | null) {
    setError(message);
  }

  async function persistAirship(nextAirship: PartyAirship) {
    const now = new Date().toISOString();
    setAirship({ ...nextAirship, updatedAt: now });
    reportError(null);

    try {
      await atlas.db.run(
        `UPDATE party_airships
         SET name = ?, ship_class = ?, ship_armor_class = ?, ship_speed_rating = ?, ship_hull_current = ?, ship_hull_maximum = ?,
             ship_strain_current = ?, ship_crew_required = ?, ship_crew_current = ?, ship_crew_quality = ?, ship_crew_losses = ?,
             ship_progress_current = ?, ship_current_range_band = ?, ship_current_captain_order = ?, ship_weapon_slot_count = ?,
             ship_hull_slot_count = ?, ship_engine_slot_count = ?, ship_utility_slot_count = ?, ship_special_slot_count = ?,
             ship_crew_json = ?, ship_systems_json = ?, ship_attachment_slots_json = ?, ship_weapons_json = ?, notes = ?, updated_at = ?
         WHERE id = ?`,
        [
          nextAirship.name.trim() || 'Unnamed airship',
          nextAirship.shipClass,
          nextAirship.shipArmorClass,
          nextAirship.speedRating,
          Math.max(0, Number(nextAirship.hullCurrent) || 0),
          Math.max(0, Number(nextAirship.hullMaximum) || 0),
          clampInt(Number(nextAirship.strainCurrent) || 0, 0, 5),
          Math.max(0, Number(nextAirship.crewRequired) || 0),
          Math.max(0, Number(nextAirship.crewCurrent) || 0),
          nextAirship.crewQuality,
          Math.max(0, Number(nextAirship.crewLosses) || 0),
          Math.max(0, Number(nextAirship.progressCurrent) || 0),
          nextAirship.currentRangeBand,
          nextAirship.currentCaptainOrder,
          Math.max(0, Number(nextAirship.weaponSlotCount) || 0),
          Math.max(0, Number(nextAirship.hullSlotCount) || 0),
          Math.max(0, Number(nextAirship.engineSlotCount) || 0),
          Math.max(0, Number(nextAirship.utilitySlotCount) || 0),
          Math.max(0, Number(nextAirship.specialSlotCount) || 0),
          JSON.stringify(nextAirship.crew),
          JSON.stringify(nextAirship.systems),
          JSON.stringify(nextAirship.attachmentSlots),
          JSON.stringify(nextAirship.weapons),
          nextAirship.notes,
          now,
          nextAirship.id,
        ],
      );
    } catch (saveError) {
      await load();
      reportError(saveError instanceof Error ? saveError.message : String(saveError));
    }
  }

  async function ensureAirship() {
    if (!campaign) return;

    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const initialAttachmentSlots = reconcileSlots([], {
      weapon: 1,
      hull: 1,
      engine: 1,
      utility: 1,
      special: 0,
    });
    const initialAirship: PartyAirship = {
      id,
      name: 'New Airship',
      shipClass: '',
      shipArmorClass: 0,
      speedRating: 0,
      hullCurrent: 0,
      hullMaximum: 0,
      strainCurrent: 0,
      crewRequired: 0,
      crewCurrent: 0,
      crewQuality: 'trained',
      crewLosses: 0,
      progressCurrent: 0,
      currentRangeBand: 'near',
      currentCaptainOrder: 'none',
      weaponSlotCount: 1,
      hullSlotCount: 1,
      engineSlotCount: 1,
      utilitySlotCount: 1,
      specialSlotCount: 0,
      crew: [],
      systems: createDefaultSystems(),
      attachmentSlots: initialAttachmentSlots,
      weapons: [],
      notes: '',
      createdAt: now,
      updatedAt: now,
    };

    try {
      await atlas.db.run(
        `INSERT INTO party_airships
           (id, campaign_id, name, ship_class, ship_armor_class, ship_speed_rating, ship_hull_current, ship_hull_maximum,
            ship_strain_current, ship_crew_required, ship_crew_current, ship_crew_quality, ship_crew_losses, ship_progress_current,
            ship_current_range_band, ship_current_captain_order, ship_weapon_slot_count, ship_hull_slot_count, ship_engine_slot_count,
            ship_utility_slot_count, ship_special_slot_count, ship_crew_json, ship_systems_json, ship_attachment_slots_json, ship_weapons_json,
            notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          campaign.id,
          initialAirship.name,
          initialAirship.shipClass,
          initialAirship.shipArmorClass,
          initialAirship.speedRating,
          initialAirship.hullCurrent,
          initialAirship.hullMaximum,
          initialAirship.strainCurrent,
          initialAirship.crewRequired,
          initialAirship.crewCurrent,
          initialAirship.crewQuality,
          initialAirship.crewLosses,
          initialAirship.progressCurrent,
          initialAirship.currentRangeBand,
          initialAirship.currentCaptainOrder,
          initialAirship.weaponSlotCount,
          initialAirship.hullSlotCount,
          initialAirship.engineSlotCount,
          initialAirship.utilitySlotCount,
          initialAirship.specialSlotCount,
          JSON.stringify(initialAirship.crew),
          JSON.stringify(initialAirship.systems),
          JSON.stringify(initialAirship.attachmentSlots),
          JSON.stringify(initialAirship.weapons),
          initialAirship.notes,
          now,
          now,
        ],
      );
      await load();
    } catch (createError) {
      reportError(createError instanceof Error ? createError.message : String(createError));
    }
  }

  async function updateAirship(patch: Partial<PartyAirship>) {
    if (!airship) return;
    await persistAirship({ ...airship, ...patch });
  }

  async function moveRange(direction: -1 | 1) {
    if (!airship) return;

    const nextIndex = clampInt(getRangeIndex(airship.currentRangeBand) + direction, 0, RANGE_BANDS.length - 1);
    await updateAirship({
      currentRangeBand: RANGE_BANDS[nextIndex].value,
      progressCurrent: 0,
    });
  }

  async function updateSlotCounts(nextCounts: SlotCountState) {
    if (!airship) return;

    await updateAirship({
      weaponSlotCount: nextCounts.weapon,
      hullSlotCount: nextCounts.hull,
      engineSlotCount: nextCounts.engine,
      utilitySlotCount: nextCounts.utility,
      specialSlotCount: nextCounts.special,
      attachmentSlots: reconcileSlots(airship.attachmentSlots, nextCounts),
    });
  }

  async function addCrewMember() {
    if (!airship) return;

    await updateAirship({
      crew: [
        ...airship.crew,
        {
          id: crypto.randomUUID(),
          name: 'New crew member',
          role: '',
          duty: '',
          notes: '',
        },
      ],
    });
  }

  async function updateCrewMember(memberId: string, patch: Partial<PartyAirshipCrewMember>) {
    if (!airship) return;
    await updateAirship({
      crew: airship.crew.map(member => (member.id === memberId ? { ...member, ...patch } : member)),
    });
  }

  async function removeCrewMember(memberId: string) {
    if (!airship) return;
    await updateAirship({
      crew: airship.crew.filter(member => member.id !== memberId),
    });
  }

  async function addSystem() {
    if (!airship) return;

    await updateAirship({
      systems: [
        ...airship.systems,
        {
          id: crypto.randomUUID(),
          name: 'New system',
          status: 'healthy',
          notes: '',
          effects: '',
        },
      ],
    });
  }

  async function updateSystem(systemId: string, patch: Partial<PartyAirshipSystem>) {
    if (!airship) return;

    await updateAirship({
      systems: airship.systems.map(system => (system.id === systemId ? { ...system, ...patch } : system)),
    });
  }

  async function removeSystem(systemId: string) {
    if (!airship) return;

    await updateAirship({
      systems: airship.systems.filter(system => system.id !== systemId),
    });
  }

  async function seedDefaultSystems() {
    if (!airship) return;
    await updateAirship({ systems: createDefaultSystems() });
  }

  async function addAttachmentSlot(type: PartyAirshipAttachmentSlotType) {
    if (!airship) return;

    const nextCounts = { ...attachmentCounts, [type]: attachmentCounts[type] + 1 } satisfies SlotCountState;
    await updateSlotCounts(nextCounts);
  }

  async function removeAttachmentSlot(type: PartyAirshipAttachmentSlotType) {
    if (!airship) return;

    const counts = { ...attachmentCounts, [type]: Math.max(0, attachmentCounts[type] - 1) } satisfies SlotCountState;

    await updateSlotCounts(counts);
  }

  async function updateAttachmentSlot(slotId: string, patch: Partial<PartyAirshipAttachmentSlot>) {
    if (!airship) return;

    await updateAirship({
      attachmentSlots: airship.attachmentSlots.map(slot => (slot.id === slotId ? { ...slot, ...patch } : slot)),
    });
  }

  async function addWeapon() {
    if (!airship) return;

    await updateAirship({
      weapons: [
        ...airship.weapons,
        {
          id: crypto.randomUUID(),
          name: 'New weapon',
          range: '',
          damage: '',
          assignedGunner: '',
          status: 'ready',
          notes: '',
          slotId: '',
        },
      ],
    });
  }

  async function updateWeapon(weaponId: string, patch: Partial<PartyAirshipWeapon>) {
    if (!airship) return;

    await updateAirship({
      weapons: airship.weapons.map(weapon => (weapon.id === weaponId ? { ...weapon, ...patch } : weapon)),
    });
  }

  async function removeWeapon(weaponId: string) {
    if (!airship) return;

    await updateAirship({
      weapons: airship.weapons.filter(weapon => weapon.id !== weaponId),
    });
  }

  async function addCargoItem() {
    if (!campaign || !airship) return;

    const nextSortOrder = sortedCargo.reduce((max, item) => Math.max(max, item.sortOrder), -1) + 1;
    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    try {
      await atlas.db.run(
        `INSERT INTO party_airship_cargo
           (id, airship_id, campaign_id, name, quantity, weight, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, airship.id, campaign.id, 'New cargo', 1, 0, nextSortOrder, now, now],
      );
      await load();
    } catch (cargoError) {
      reportError(cargoError instanceof Error ? cargoError.message : String(cargoError));
    }
  }

  async function updateCargoItem(cargoId: string, patch: Partial<PartyAirshipCargoItem>) {
    const item = cargo.find(entry => entry.id === cargoId);
    if (!item) return;

    const nextItem = { ...item, ...patch };
    const now = new Date().toISOString();

    setCargo(prev => prev.map(entry => (entry.id === cargoId ? { ...nextItem, updatedAt: now } : entry)));

    try {
      await atlas.db.run(
        `UPDATE party_airship_cargo
         SET name = ?, quantity = ?, weight = ?, updated_at = ?
         WHERE id = ?`,
        [
          nextItem.name.trim() || 'Unnamed cargo',
          Math.max(1, Number(nextItem.quantity) || 1),
          Math.max(0, Number(nextItem.weight) || 0),
          now,
          cargoId,
        ],
      );
    } catch (saveError) {
      reportError(saveError instanceof Error ? saveError.message : String(saveError));
      await load();
    }
  }

  async function removeCargoItem(cargoId: string) {
    try {
      await atlas.db.run('DELETE FROM party_airship_cargo WHERE id = ?', [cargoId]);
      await load();
    } catch (deleteError) {
      reportError(deleteError instanceof Error ? deleteError.message : String(deleteError));
    }
  }

  if (loading) {
    return (
      <div className={styles.singlePane}>
        <div className={styles.emptyState}>
          <Icon name="loader" size={24} className={styles.spin} />
          <p>Loading airship command console...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.singlePane}>
      {error && (
        <div className={styles.errorBar}>
          <Icon name="alert" size={15} />
          {error}
        </div>
      )}

      {!airship ? (
        <div className={styles.emptyState}>
          <Icon name="network" size={28} />
          <p>No airship tracked for this campaign yet.</p>
          <button className={styles.primaryBtn} onClick={ensureAirship}>
            <Icon name="plus" size={16} />
            Create Airship
          </button>
        </div>
      ) : (
        <div className={styles.airshipPage}>
          <section className={styles.airshipHero}>
            <div className={styles.airshipHeroTop}>
              <div>
                <p className={styles.sectionKicker}>Airship Command</p>
                <h3 className={styles.airshipTitle}>{airship.name}</h3>
                <p className={styles.detailSubtitle}>Combat console, ship systems, and crew operations</p>
              </div>
              <div className={styles.heroActions}>
                <span className={`${styles.badge} ${styles.badgeMuted}`}>{getHullState(airship.hullCurrent, airship.hullMaximum).label}</span>
                <span className={`${styles.badge} ${styles.badgeMuted}`}>{getCrewQualityLabel(airship.crewQuality)}</span>
                <span className={`${styles.badge} ${styles.badgeMuted}`}>{getCaptainOrderLabel(airship.currentCaptainOrder)}</span>
              </div>
            </div>

            <div className={styles.formGrid}>
              <label className={styles.field}>
                <span>Name</span>
                <input className={styles.input} value={airship.name} onChange={event => void updateAirship({ name: event.target.value })} />
              </label>
              <label className={styles.field}>
                <span>Ship Class</span>
                <input className={styles.input} value={airship.shipClass} onChange={event => void updateAirship({ shipClass: event.target.value })} />
              </label>
              <label className={styles.field}>
                <span>Ship Armor Class</span>
                <input
                  className={styles.input}
                  type="number"
                  min={0}
                  value={airship.shipArmorClass}
                  onChange={event => void updateAirship({ shipArmorClass: Number(event.target.value) || 0 })}
                />
              </label>
              <label className={styles.field}>
                <span>Speed Rating</span>
                <input
                  className={styles.input}
                  type="number"
                  min={0}
                  value={airship.speedRating}
                  onChange={event => void updateAirship({ speedRating: Number(event.target.value) || 0 })}
                />
              </label>
            </div>
          </section>

          <section className={styles.combatDashboard}>
            <div className={styles.dashboardHeader}>
              <div>
                <p className={styles.sectionKicker}>Combat Dashboard</p>
                <h4 className={styles.sectionTitle}>Run the encounter from here</h4>
              </div>
              <div className={styles.dashboardRangeControls}>
                <button className={styles.secondaryBtn} onClick={() => void moveRange(-1)}>
                  <Icon name="chevron-right" size={14} style={{ transform: 'rotate(180deg)' }} />
                  Move Inward
                </button>
                <button className={styles.secondaryBtn} onClick={() => void moveRange(1)}>
                  Move Outward
                  <Icon name="chevron-right" size={14} />
                </button>
              </div>
            </div>

            <div className={styles.dashboardGrid}>
              <article className={styles.statCard}>
                <div className={styles.cardHeaderRow}>
                  <span className={styles.cardLabel}>Hull</span>
                  <span className={`${styles.badge} ${hullState.tone === 'good' ? styles.badgeGood : hullState.tone === 'warn' ? styles.badgeWarn : styles.badgeBad}`}>{hullState.label}</span>
                </div>
                <div className={styles.segmentedTrack} aria-label="Hull condition">
                  {Array.from({ length: Math.max(10, Math.ceil((airship.hullMaximum || 100) / 10)) }).map((_, index) => {
                    const filled = airship.hullMaximum > 0 && index < Math.ceil((airship.hullCurrent / airship.hullMaximum) * 10);
                    return <span key={index} className={`${styles.segment} ${filled ? styles.segmentFilled : ''}`} />;
                  })}
                </div>
                <div className={styles.metricRow}>
                  <strong>{airship.hullCurrent}</strong>
                  <span>/ {airship.hullMaximum}</span>
                </div>
                <p className={styles.cardCopy}>{hullState.note}</p>
                <div className={styles.compactInputs}>
                  <label className={styles.field}>
                    <span>Current</span>
                    <input
                      className={styles.input}
                      type="number"
                      min={0}
                      value={airship.hullCurrent}
                      onChange={event => void updateAirship({ hullCurrent: Number(event.target.value) || 0 })}
                    />
                  </label>
                  <label className={styles.field}>
                    <span>Maximum</span>
                    <input
                      className={styles.input}
                      type="number"
                      min={0}
                      value={airship.hullMaximum}
                      onChange={event => void updateAirship({ hullMaximum: Number(event.target.value) || 0 })}
                    />
                  </label>
                </div>
              </article>

              <article className={styles.statCard}>
                <div className={styles.cardHeaderRow}>
                  <span className={styles.cardLabel}>Strain</span>
                  <span className={`${styles.badge} ${strainEffect.label === 'Critical Failure' ? styles.badgeBad : strainEffect.label === 'Critical' || strainEffect.label === 'Overloaded' ? styles.badgeWarn : styles.badgeGood}`}>
                    {strainEffect.label}
                  </span>
                </div>
                <div className={styles.dotTrack} aria-label="Strain tracker">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <span key={index} className={`${styles.dot} ${index < airship.strainCurrent ? styles.dotFilled : ''}`} />
                  ))}
                </div>
                <div className={styles.metricRow}>
                  <strong>{airship.strainCurrent}</strong>
                  <span>/ 5</span>
                </div>
                <p className={styles.cardCopy}>{strainEffect.note}</p>
                <div className={styles.compactInputs}>
                  <label className={styles.field}>
                    <span>Current</span>
                    <input
                      className={styles.input}
                      type="number"
                      min={0}
                      max={5}
                      value={airship.strainCurrent}
                      onChange={event => void updateAirship({ strainCurrent: clampInt(Number(event.target.value) || 0, 0, 5) })}
                    />
                  </label>
                  <label className={styles.field}>
                    <span>Reset</span>
                    <button className={styles.secondaryBtn} onClick={() => void updateAirship({ strainCurrent: 2 })}>
                      Reset to 2
                    </button>
                  </label>
                </div>
              </article>

              <article className={styles.statCard}>
                <div className={styles.cardHeaderRow}>
                  <span className={styles.cardLabel}>Progress</span>
                  <span className={`${styles.badge} ${airship.speedRating > 0 && airship.progressCurrent >= airship.speedRating ? styles.badgeGood : styles.badgeMuted}`}>
                    {airship.speedRating > 0 && airship.progressCurrent >= airship.speedRating ? 'READY TO SHIFT RANGE BAND' : 'Advancing'}
                  </span>
                </div>
                <div className={styles.segmentedTrack} aria-label="Range progress">
                  {Array.from({ length: Math.max(1, airship.speedRating || 1) }).map((_, index) => (
                    <span key={index} className={`${styles.segment} ${index < airship.progressCurrent ? styles.segmentFilled : ''}`} />
                  ))}
                </div>
                <div className={styles.metricRow}>
                  <strong>{airship.progressCurrent}</strong>
                  <span>/ {airship.speedRating || 0}</span>
                </div>
                <p className={styles.cardCopy}>Progress reaches readiness when it meets the Speed Rating.</p>
                <label className={styles.field}>
                  <span>Current Progress</span>
                  <input
                    className={styles.input}
                    type="number"
                    min={0}
                    value={airship.progressCurrent}
                    onChange={event => void updateAirship({ progressCurrent: Math.max(0, Number(event.target.value) || 0) })}
                  />
                </label>
              </article>

              <article className={styles.statCard}>
                <div className={styles.cardHeaderRow}>
                  <span className={styles.cardLabel}>Captain Order</span>
                  <span className={styles.badge}>{getCaptainOrderLabel(airship.currentCaptainOrder)}</span>
                </div>
                <p className={styles.cardCopy}>{getCaptainOrderEffect(airship.currentCaptainOrder)}</p>
                <label className={styles.field}>
                  <span>Round Order</span>
                  <select
                    className={styles.input}
                    value={airship.currentCaptainOrder}
                    onChange={event => void updateAirship({ currentCaptainOrder: event.target.value as PartyAirshipCaptainOrder })}
                  >
                    {CAPTAIN_ORDERS.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </article>

              <article className={styles.statCard}>
                <div className={styles.cardHeaderRow}>
                  <span className={styles.cardLabel}>Crew Status</span>
                  <span className={`${styles.badge} ${airship.crewCurrent < airship.crewRequired ? styles.badgeWarn : airship.crewCurrent > airship.crewRequired ? styles.badgeGood : styles.badgeMuted}`}>
                    {airship.crewCurrent < airship.crewRequired ? 'Understaffed' : airship.crewCurrent > airship.crewRequired ? 'Overstaffed' : 'Balanced'}
                  </span>
                </div>
                <div className={styles.metricRow}>
                  <strong>{airship.crewCurrent}</strong>
                  <span>/ {airship.crewRequired} required</span>
                </div>
                <div className={styles.pillList}>
                  {crewPenalties.length === 0 ? (
                    <span className={styles.cardCopy}>No active crew penalties.</span>
                  ) : (
                    crewPenalties.map(penalty => (
                      <span key={penalty} className={`${styles.badge} ${styles.badgeMuted}`}>{penalty}</span>
                    ))
                  )}
                </div>
                <div className={styles.compactInputs}>
                  <label className={styles.field}>
                    <span>Required</span>
                    <input
                      className={styles.input}
                      type="number"
                      min={0}
                      value={airship.crewRequired}
                      onChange={event => void updateAirship({ crewRequired: Math.max(0, Number(event.target.value) || 0) })}
                    />
                  </label>
                  <label className={styles.field}>
                    <span>Current</span>
                    <input
                      className={styles.input}
                      type="number"
                      min={0}
                      value={airship.crewCurrent}
                      onChange={event => void updateAirship({ crewCurrent: Math.max(0, Number(event.target.value) || 0) })}
                    />
                  </label>
                  <label className={styles.field}>
                    <span>Crew Quality</span>
                    <select
                      className={styles.input}
                      value={airship.crewQuality}
                      onChange={event => void updateAirship({ crewQuality: event.target.value as PartyAirshipCrewQuality })}
                    >
                      {CREW_QUALITY_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label} ({option.modifier})
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className={styles.field}>
                    <span>Losses</span>
                    <input
                      className={styles.input}
                      type="number"
                      min={0}
                      value={airship.crewLosses}
                      onChange={event => void updateAirship({ crewLosses: Math.max(0, Number(event.target.value) || 0) })}
                    />
                  </label>
                </div>
              </article>
            </div>

            <article className={styles.statCardWide}>
              <div className={styles.cardHeaderRow}>
                <span className={styles.cardLabel}>Range Band</span>
                <span className={styles.badge}>{RANGE_BANDS.find(option => option.value === airship.currentRangeBand)?.label ?? 'Near'}</span>
              </div>
              <div className={styles.rangeBandRow}>
                {RANGE_BANDS.map(option => (
                  <span
                    key={option.value}
                    className={`${styles.rangeBandPill} ${option.value === airship.currentRangeBand ? styles.rangeBandActive : ''}`}
                  >
                    {option.label}
                  </span>
                ))}
              </div>
            </article>
          </section>

          <div className={styles.airshipGrid}>
            <section className={styles.airshipSection}>
              <div className={styles.sectionHeader}>
                <div>
                  <h4 className={styles.sectionTitle}>Systems</h4>
                  <p className={styles.sectionCopy}>Dynamic ship systems with editable effects and condition.</p>
                </div>
                <div className={styles.sectionActions}>
                  <button className={styles.secondaryBtn} onClick={addSystem}>
                    <Icon name="plus" size={15} />
                    Add System
                  </button>
                  <button className={styles.secondaryBtn} onClick={seedDefaultSystems}>
                    <Icon name="sparkles" size={15} />
                    Seed Defaults
                  </button>
                </div>
              </div>

              <div className={styles.cardStack}>
                {airship.systems.length === 0 ? (
                  <div className={styles.emptyList}>
                    <p>No ship systems recorded yet.</p>
                  </div>
                ) : (
                  airship.systems.map(system => (
                    <article key={system.id} className={styles.recordCard}>
                      <div className={styles.recordHeader}>
                        <input
                          className={styles.input}
                          value={system.name}
                          onChange={event => void updateSystem(system.id, { name: event.target.value })}
                          placeholder="System name"
                        />
                        <button className={styles.iconBtn} onClick={() => void removeSystem(system.id)} title="Delete system">
                          <Icon name="trash" size={14} />
                        </button>
                      </div>
                      <div className={styles.compactInputs}>
                        <label className={styles.field}>
                          <span>Status</span>
                          <select
                            className={styles.input}
                            value={system.status}
                            onChange={event => void updateSystem(system.id, { status: event.target.value })}
                          >
                            {SYSTEM_STATUS_OPTIONS.map(option => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className={styles.field}>
                          <span>Effects</span>
                          <input
                            className={styles.input}
                            value={system.effects}
                            onChange={event => void updateSystem(system.id, { effects: event.target.value })}
                            placeholder="Damaged Engines: SR +1"
                          />
                        </label>
                      </div>
                      <label className={styles.field}>
                        <span>Notes</span>
                        <textarea
                          className={`${styles.input} ${styles.textareaCompact}`}
                          value={system.notes}
                          onChange={event => void updateSystem(system.id, { notes: event.target.value })}
                        />
                      </label>
                      <div className={styles.badgeRow}>
                        <span className={styles.badge}>{getSystemStatusLabel(system.status)}</span>
                        {system.effects.trim().length > 0 && <span className={`${styles.badge} ${styles.badgeMuted}`}>{system.effects}</span>}
                      </div>
                    </article>
                  ))
                )}
              </div>

              {activeSystemEffects.length > 0 && (
                <div className={styles.effectPanel}>
                  <h5 className={styles.effectTitle}>Active System Effects</h5>
                  <div className={styles.pillList}>
                    {activeSystemEffects.map(system => (
                      <span key={system.id} className={`${styles.badge} ${styles.badgeMuted}`}>
                        {system.name}: {system.status}
                        {system.effects ? ` · ${system.effects}` : ''}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>

            <section className={styles.airshipSection}>
              <div className={styles.sectionHeader}>
                <div>
                  <h4 className={styles.sectionTitle}>Attachment Slots</h4>
                  <p className={styles.sectionCopy}>Configure slot counts and expand the ship without schema churn.</p>
                </div>
              </div>

              <div className={styles.compactInputs}>
                {ATTACHMENT_TYPES.map(type => (
                  <label key={type.value} className={styles.field}>
                    <span>{type.label} Slots</span>
                    <input
                      className={styles.input}
                      type="number"
                      min={0}
                      value={attachmentCounts[type.value]}
                      onChange={event =>
                        void updateSlotCounts({
                          ...attachmentCounts,
                          [type.value]: Math.max(0, Number(event.target.value) || 0),
                        })
                      }
                    />
                  </label>
                ))}
              </div>

              <div className={styles.sectionDivider} />

              {ATTACHMENT_TYPES.map(type => {
                const slots = attachmentSlotsByType[type.value] ?? [];
                return (
                  <div key={type.value} className={styles.slotGroup}>
                    <div className={styles.recordHeader}>
                      <div>
                        <h5 className={styles.groupTitle}>{type.label}</h5>
                        <p className={styles.sectionCopy}>{slots.length} configured slot(s).</p>
                      </div>
                      <button className={styles.secondaryBtn} onClick={() => void addAttachmentSlot(type.value)}>
                        <Icon name="plus" size={14} />
                        Add Slot
                      </button>
                    </div>

                    <div className={styles.cardStack}>
                      {slots.map((slot, index) => (
                        <article key={slot.id} className={styles.recordCard}>
                          <div className={styles.recordHeader}>
                            <input
                              className={styles.input}
                              value={slot.name}
                              onChange={event => void updateAttachmentSlot(slot.id, { name: event.target.value })}
                              placeholder={`${type.label} slot ${index + 1}`}
                            />
                            <button
                              className={styles.iconBtn}
                              onClick={() => void removeAttachmentSlot(type.value)}
                              title="Remove slot"
                            >
                              <Icon name="trash" size={14} />
                            </button>
                          </div>
                          <div className={styles.compactInputs}>
                            <label className={styles.field}>
                              <span>Status</span>
                              <input
                                className={styles.input}
                                value={slot.status}
                                onChange={event => void updateAttachmentSlot(slot.id, { status: event.target.value })}
                              />
                            </label>
                            <label className={styles.field}>
                              <span>Icon / Artwork</span>
                              <input
                                className={styles.input}
                                value={slot.icon ?? ''}
                                onChange={event => void updateAttachmentSlot(slot.id, { icon: event.target.value })}
                              />
                            </label>
                          </div>
                          <label className={styles.field}>
                            <span>Description</span>
                            <textarea
                              className={`${styles.input} ${styles.textareaCompact}`}
                              value={slot.description}
                              onChange={event => void updateAttachmentSlot(slot.id, { description: event.target.value })}
                            />
                          </label>
                          <label className={styles.field}>
                            <span>Effects</span>
                            <textarea
                              className={`${styles.input} ${styles.textareaCompact}`}
                              value={slot.effects}
                              onChange={event => void updateAttachmentSlot(slot.id, { effects: event.target.value })}
                            />
                          </label>
                          <label className={styles.field}>
                            <span>Notes</span>
                            <textarea
                              className={`${styles.input} ${styles.textareaCompact}`}
                              value={slot.notes}
                              onChange={event => void updateAttachmentSlot(slot.id, { notes: event.target.value })}
                            />
                          </label>
                          <div className={styles.badgeRow}>
                            <span className={styles.badge}>{type.label}</span>
                            <span className={`${styles.badge} ${styles.badgeMuted}`}>{slot.status}</span>
                          </div>
                        </article>
                      ))}
                      {slots.length === 0 && <div className={styles.emptyInline}>No {type.label.toLowerCase()} slots configured.</div>}
                    </div>
                  </div>
                );
              })}
            </section>

            <section className={styles.airshipSection}>
              <div className={styles.sectionHeader}>
                <div>
                  <h4 className={styles.sectionTitle}>Weapons</h4>
                  <p className={styles.sectionCopy}>Dedicated weapon cards with optional slot linking.</p>
                </div>
                <button className={styles.secondaryBtn} onClick={addWeapon}>
                  <Icon name="plus" size={15} />
                  Add Weapon
                </button>
              </div>

              <div className={styles.cardStack}>
                {airship.weapons.length === 0 ? (
                  <div className={styles.emptyList}>
                    <p>No weapons recorded yet.</p>
                  </div>
                ) : (
                  airship.weapons.map(weapon => (
                    <article key={weapon.id} className={styles.recordCard}>
                      <div className={styles.recordHeader}>
                        <input
                          className={styles.input}
                          value={weapon.name}
                          onChange={event => void updateWeapon(weapon.id, { name: event.target.value })}
                          placeholder="Weapon name"
                        />
                        <button className={styles.iconBtn} onClick={() => void removeWeapon(weapon.id)} title="Delete weapon">
                          <Icon name="trash" size={14} />
                        </button>
                      </div>
                      <div className={styles.compactInputs}>
                        <label className={styles.field}>
                          <span>Range</span>
                          <input
                            className={styles.input}
                            value={weapon.range}
                            onChange={event => void updateWeapon(weapon.id, { range: event.target.value })}
                          />
                        </label>
                        <label className={styles.field}>
                          <span>Damage</span>
                          <input
                            className={styles.input}
                            value={weapon.damage}
                            onChange={event => void updateWeapon(weapon.id, { damage: event.target.value })}
                          />
                        </label>
                        <label className={styles.field}>
                          <span>Assigned Gunner</span>
                          <input
                            className={styles.input}
                            value={weapon.assignedGunner}
                            onChange={event => void updateWeapon(weapon.id, { assignedGunner: event.target.value })}
                          />
                        </label>
                        <label className={styles.field}>
                          <span>Status</span>
                          <select
                            className={styles.input}
                            value={weapon.status}
                            onChange={event => void updateWeapon(weapon.id, { status: event.target.value })}
                          >
                            {WEAPON_STATUS_OPTIONS.map(option => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                      <label className={styles.field}>
                        <span>Slot Link</span>
                        <select
                          className={styles.input}
                          value={weapon.slotId ?? ''}
                          onChange={event => void updateWeapon(weapon.id, { slotId: event.target.value })}
                        >
                          <option value="">No linked slot</option>
                          {airship.attachmentSlots.map(slot => (
                            <option key={slot.id} value={slot.id}>
                              {slot.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className={styles.field}>
                        <span>Notes</span>
                        <textarea
                          className={`${styles.input} ${styles.textareaCompact}`}
                          value={weapon.notes}
                          onChange={event => void updateWeapon(weapon.id, { notes: event.target.value })}
                        />
                      </label>
                    </article>
                  ))
                )}
              </div>
            </section>

            <section className={styles.airshipSection}>
              <div className={styles.sectionHeader}>
                <div>
                  <h4 className={styles.sectionTitle}>Crew Roster</h4>
                  <p className={styles.sectionCopy}>Individual crew entries stay available for future character-style expansion.</p>
                </div>
                <button className={styles.secondaryBtn} onClick={addCrewMember}>
                  <Icon name="plus" size={15} />
                  Add Crew
                </button>
              </div>

              <div className={styles.cardStack}>
                {airship.crew.length === 0 ? (
                  <div className={styles.emptyList}>
                    <p>No crew recorded yet.</p>
                  </div>
                ) : (
                  airship.crew.map(member => (
                    <article key={member.id} className={styles.recordCard}>
                      <div className={styles.recordHeader}>
                        <input
                          className={styles.input}
                          value={member.name}
                          onChange={event => void updateCrewMember(member.id, { name: event.target.value })}
                          placeholder="Crew name"
                        />
                        <button className={styles.iconBtn} onClick={() => void removeCrewMember(member.id)} title="Delete crew member">
                          <Icon name="trash" size={14} />
                        </button>
                      </div>
                      <div className={styles.compactInputs}>
                        <label className={styles.field}>
                          <span>Role</span>
                          <input
                            className={styles.input}
                            value={member.role}
                            onChange={event => void updateCrewMember(member.id, { role: event.target.value })}
                            placeholder="Role"
                          />
                        </label>
                        <label className={styles.field}>
                          <span>Duty</span>
                          <input
                            className={styles.input}
                            value={member.duty}
                            onChange={event => void updateCrewMember(member.id, { duty: event.target.value })}
                            placeholder="Station or duty"
                          />
                        </label>
                      </div>
                      <label className={styles.field}>
                        <span>Notes</span>
                        <textarea
                          className={`${styles.input} ${styles.textareaCompact}`}
                          value={member.notes}
                          onChange={event => void updateCrewMember(member.id, { notes: event.target.value })}
                        />
                      </label>
                    </article>
                  ))
                )}
              </div>
            </section>

            <section className={styles.airshipSection}>
              <div className={styles.sectionHeader}>
                <div>
                  <h4 className={styles.sectionTitle}>Cargo</h4>
                  <p className={styles.sectionCopy}>Cargo stays available for travel and boarding scenarios.</p>
                </div>
                <div className={styles.airshipCargoHeaderActions}>
                  <span className={styles.cargoSummary}>
                    {sortedCargo.length} items · {cargoWeight.toFixed(1)} total weight
                  </span>
                  <button className={styles.secondaryBtn} onClick={addCargoItem}>
                    <Icon name="plus" size={15} />
                    Add Cargo
                  </button>
                </div>
              </div>

              <div className={styles.cardStack}>
                {sortedCargo.length === 0 ? (
                  <div className={styles.emptyList}>
                    <p>No cargo tracked for this airship yet.</p>
                  </div>
                ) : (
                  sortedCargo.map(item => (
                    <article key={item.id} className={styles.recordCard}>
                      <div className={styles.recordHeader}>
                        <input
                          className={styles.input}
                          value={item.name}
                          onChange={event => void updateCargoItem(item.id, { name: event.target.value })}
                          placeholder="Cargo item"
                        />
                        <button className={styles.iconBtn} onClick={() => void removeCargoItem(item.id)} title="Delete cargo item">
                          <Icon name="trash" size={14} />
                        </button>
                      </div>
                      <div className={styles.compactInputs}>
                        <label className={styles.field}>
                          <span>Quantity</span>
                          <input
                            className={styles.input}
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={event => void updateCargoItem(item.id, { quantity: Number(event.target.value) || 1 })}
                          />
                        </label>
                        <label className={styles.field}>
                          <span>Weight</span>
                          <input
                            className={styles.input}
                            type="number"
                            min={0}
                            step="0.1"
                            value={item.weight}
                            onChange={event => void updateCargoItem(item.id, { weight: Number(event.target.value) || 0 })}
                          />
                        </label>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>
          </div>

          <section className={styles.airshipSection}>
            <div className={styles.sectionHeader}>
              <div>
                <h4 className={styles.sectionTitle}>Notes</h4>
                <p className={styles.sectionCopy}>Battle notes, route notes, and campaign context all live here.</p>
              </div>
            </div>
            <label className={styles.field}>
              <span>Airship Notes</span>
              <textarea
                className={`${styles.input} ${styles.textareaTall}`}
                value={airship.notes}
                onChange={event => void updateAirship({ notes: event.target.value })}
              />
            </label>
          </section>
        </div>
      )}
    </div>
  );
}

function mapAirship(row: AirshipRow): PartyAirship {
  const crew = safeJsonArray<Partial<AirshipCrewRow>>(row.ship_crew_json ?? row.crew_json).map((entry, index) => mapCrewMember(entry, index));
  const systems = safeJsonArray<Partial<AirshipSystemRow>>(row.ship_systems_json ?? row.systems_json).map((entry, index) => mapSystem(entry, index));
  const attachmentSlots = safeJsonArray<Partial<AirshipAttachmentSlotRow>>(row.ship_attachment_slots_json ?? row.attachment_slots_json).map((entry, index) =>
    mapAttachmentSlot(entry, index),
  );
  const weapons = safeJsonArray<Partial<AirshipWeaponRow>>(row.ship_weapons_json ?? row.weapons_json).map((entry, index) => mapWeapon(entry, index));

  return {
    id: row.id,
    name: row.name,
    shipClass: row.ship_class,
    shipArmorClass: row.ship_armor_class ?? row.armor_class ?? 0,
    speedRating: row.ship_speed_rating ?? row.speed_rating ?? 0,
    hullCurrent: row.ship_hull_current ?? row.hull_current ?? 0,
    hullMaximum: row.ship_hull_maximum ?? row.hull_maximum ?? 0,
    strainCurrent: clampInt(row.ship_strain_current ?? row.strain_current ?? 0, 0, 5),
    crewRequired: row.ship_crew_required ?? row.crew_required ?? crew.length,
    crewCurrent: row.ship_crew_current ?? row.crew_current ?? crew.length,
    crewQuality: ((row.ship_crew_quality ?? row.crew_quality) as PartyAirshipCrewQuality) ?? 'trained',
    crewLosses: row.ship_crew_losses ?? row.crew_losses ?? 0,
    progressCurrent: row.ship_progress_current ?? row.progress_current ?? 0,
    currentRangeBand: ((row.ship_current_range_band ?? row.current_range_band) as PartyAirshipRangeBand) ?? 'near',
    currentCaptainOrder: ((row.ship_current_captain_order ?? row.current_captain_order) as PartyAirshipCaptainOrder) ?? 'none',
    weaponSlotCount: row.ship_weapon_slot_count ?? row.weapon_slot_count ?? attachmentSlots.filter(slot => slot.type === 'weapon').length,
    hullSlotCount: row.ship_hull_slot_count ?? row.hull_slot_count ?? attachmentSlots.filter(slot => slot.type === 'hull').length,
    engineSlotCount: row.ship_engine_slot_count ?? row.engine_slot_count ?? attachmentSlots.filter(slot => slot.type === 'engine').length,
    utilitySlotCount: row.ship_utility_slot_count ?? row.utility_slot_count ?? attachmentSlots.filter(slot => slot.type === 'utility').length,
    specialSlotCount: row.ship_special_slot_count ?? row.special_slot_count ?? attachmentSlots.filter(slot => slot.type === 'special').length,
    crew,
    systems,
    attachmentSlots,
    weapons,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
