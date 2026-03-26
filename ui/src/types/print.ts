// ui/src/types/print.ts
// Types for the printer-friendly session export system.

export interface PrintableMonster {
  name: string;
  quantity: number;
  statblock: string; // free-text block: HP, AC, attacks, abilities, etc.
}

export interface PrintableEncounter {
  id: string;
  title: string;
  encounterType: string;
  objective: string;
  setup: string;
  reward: string;
  played: boolean;
  order: number;
  monsters: PrintableMonster[];
}

export interface PrintableSession {
  id: string;
  title: string;
  summary: string;
  status: string;
  sessionDate: string | null;
  encounters: PrintableEncounter[];
  /** All unique monsters across all encounters, deduplicated by name */
  allMonsters: PrintableMonster[];
}
