// modules/mini-catalogue/src/events.ts
// Event declarations for the mini-catalogue module.

export const MINI_CATALOGUE_EMITTED_EVENTS = [
  'mini-catalogue:created',
  'mini-catalogue:updated',
] as const;

export const MINI_CATALOGUE_HANDLED_EVENTS = [
  // 'app:campaign-opened' handled automatically by BaseModule
] as const;
