export const FACTIONS_EMITTED_EVENTS = [
  'faction:created',
  'faction:updated',
  'faction:deleted',
  'faction:organization_updated',
  'faction:territory_updated',
  'faction:relation_updated',
  'faction:reputation_updated',
] as const;

export const FACTIONS_HANDLED_EVENTS = [
  'npc:updated',
  'location:deleted',
  'quest:updated',
] as const;
