// modules/timeline/src/events.ts
//
// Event bus constants for the timeline module.
//
// EMITTED  — events this module broadcasts to other modules.
// HANDLED  — events from other modules this module reacts to.

export const TIMELINE_EMITTED_EVENTS = [
  'timeline:entry-added',
] as const;

export const TIMELINE_HANDLED_EVENTS = [
  // Quest lifecycle
  'quest:created',
  'quest:completed',
  'quest:failed',
  // Session lifecycle
  'session:ended',
  // Faction lifecycle (reserved — future)
  // 'faction:war-declared',
  // 'faction:alliance-formed',
  // NPC lifecycle (reserved — future)
  // 'npc:died',
] as const;
