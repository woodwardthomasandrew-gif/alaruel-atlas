// ui/src/router/routes.ts — Centralised route path constants.
// Components never hard-code "/npcs" — they use ROUTES.npcs.

export const ROUTES = {
  welcome:    '/',
  dashboard:  '/dashboard',
  atlas:      '/atlas',
  party:      '/party',
  npcs:       '/npcs',
  factions:   '/factions',
  quests:     '/quests',
  sessions:   '/sessions',
  timeline:   '/timeline',
  graph:      '/graph',
  assets:     '/assets',
  generators: '/generators',
  dungeons:   '/dungeons',
  bestiary:      '/bestiary',
  miniCatalogue: '/mini-catalogue',
} as const;

export type AppRoute = typeof ROUTES[keyof typeof ROUTES];
