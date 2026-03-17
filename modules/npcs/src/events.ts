// modules/npcs/src/events.ts
// Event declarations for the npcs module.

export const NPCS_EMITTED_EVENTS = [
  'npc:created',
  'npc:updated',
] as const;

export const NPCS_HANDLED_EVENTS = [
  // 'app:campaign-opened' handled automatically by BaseModule
] as const;
