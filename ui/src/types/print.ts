// ui/src/types/print.ts
// Printer-friendly session DTOs.

export interface PrintableEntityRef {
  id: string;
  name: string;
  count: number;
  notes: string;
}

export interface PrintableSessionNote {
  id: string;
  phase: 'planning' | 'live' | 'recap';
  content: string;
  createdAt: string;
}

export interface PrintablePrepItem {
  id: string;
  description: string;
  done: boolean;
}

export interface PrintableTravelMontageDetails {
  route: string;
  travelGoal: string;
  montagePrompt: string;
  partyApproach: string;
  obstacle: string;
  complication: string;
  progress: string;
  consequence: string;
}

export interface PrintableEncounterTypeDetails {
  travel?: PrintableTravelMontageDetails;
  [key: string]: PrintableTravelMontageDetails | Record<string, string> | undefined;
}

export interface PrintableScene {
  id: string;
  title: string;
  encounterType: string;
  objective: string;
  setup: string;
  reward: string;
  typeDetails: PrintableEncounterTypeDetails;
  played: boolean;
  order: number;
  npcs: PrintableEntityRef[];
  monsters: PrintableEntityRef[];
  minis: PrintableEntityRef[];
}

export interface PrintableSession {
  id: string;
  title: string;
  description: string;
  status: string;
  scheduledAt: string | null;
  scenes: PrintableScene[];
  prepItems: PrintablePrepItem[];
  notes: PrintableSessionNote[];
  featuredNpcs: PrintableEntityRef[];
}
