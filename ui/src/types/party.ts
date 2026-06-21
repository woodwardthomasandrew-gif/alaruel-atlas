export interface PartyMember {
  id: string;
  name: string;
  playerName: string;
  role: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface PartyGearItem {
  id: string;
  partyMemberId: string;
  name: string;
  quantity: number;
  notes: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface PartyPet {
  id: string;
  name: string;
  species: string;
  bondedTo: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface PartyAirshipCrewMember {
  id: string;
  name: string;
  role: string;
  duty: string;
  notes: string;
}

export interface PartyAirshipSystem {
  id: string;
  name: string;
  status: string;
  notes: string;
  effects: string;
}

export interface PartyAirshipCargoItem {
  id: string;
  airshipId: string;
  name: string;
  quantity: number;
  weight: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export type PartyAirshipCrewQuality = 'green' | 'trained' | 'veteran' | 'elite';
export type PartyAirshipRangeBand = 'close' | 'near' | 'far' | 'extreme';
export type PartyAirshipCaptainOrder = 'none' | 'focus_fire' | 'brace' | 'full_ahead' | 'damage_control' | 'pin_them';
export type PartyAirshipSystemStatus = 'healthy' | 'damaged' | 'disabled' | 'destroyed';
export type PartyAirshipAttachmentSlotType = 'weapon' | 'hull' | 'engine' | 'utility' | 'special';
export type PartyAirshipWeaponStatus = 'ready' | 'damaged' | 'disabled';

export interface PartyAirshipAttachmentSlot {
  id: string;
  type: PartyAirshipAttachmentSlotType;
  name: string;
  status: string;
  description: string;
  effects: string;
  notes: string;
  icon?: string;
  attachmentId?: string;
}

export interface PartyAirshipWeapon {
  id: string;
  name: string;
  range: string;
  damage: string;
  assignedGunner: string;
  status: PartyAirshipWeaponStatus | string;
  notes: string;
  slotId?: string;
}

export interface PartyAirship {
  id: string;
  name: string;
  shipClass: string;
  shipArmorClass: number;
  speedRating: number;
  hullCurrent: number;
  hullMaximum: number;
  strainCurrent: number;
  crewRequired: number;
  crewCurrent: number;
  crewQuality: PartyAirshipCrewQuality;
  crewLosses: number;
  progressCurrent: number;
  currentRangeBand: PartyAirshipRangeBand;
  currentCaptainOrder: PartyAirshipCaptainOrder;
  weaponSlotCount: number;
  hullSlotCount: number;
  engineSlotCount: number;
  utilitySlotCount: number;
  specialSlotCount: number;
  crew: PartyAirshipCrewMember[];
  systems: PartyAirshipSystem[];
  attachmentSlots: PartyAirshipAttachmentSlot[];
  weapons: PartyAirshipWeapon[];
  notes: string;
  createdAt: string;
  updatedAt: string;
}
