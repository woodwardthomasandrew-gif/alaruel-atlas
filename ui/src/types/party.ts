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

export interface PartyAirship {
  id: string;
  name: string;
  shipClass: string;
  status: string;
  currentLocation: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}
