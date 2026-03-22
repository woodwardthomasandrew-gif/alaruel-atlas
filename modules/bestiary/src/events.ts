// modules/bestiary/src/events.ts
// Event declarations for the bestiary module.

export const BESTIARY_EMITTED_EVENTS = [
  'bestiary:created',
  'bestiary:updated',
] as const;

export const BESTIARY_HANDLED_EVENTS = [
  // 'app:campaign-opened' handled automatically by BaseModule
] as const;
