// ui/src/registry/module-registry.ts
//
// Maps module IDs to their route path, display name, icon name, and
// the React component to render. New modules add an entry here only —
// the sidebar and router read from this registry automatically.
import type { ComponentType } from 'react';
import NpcsView          from '../views/npcs/NpcsView';
import QuestsView        from '../views/quests/QuestsView';
import SessionsView      from '../views/sessions/SessionsView';
import TimelineView      from '../views/timeline/TimelineView';
import AtlasView         from '../views/atlas/AtlasView';
import GraphView         from '../views/graph/GraphView';
import AssetsView        from '../views/assets/AssetsView';
import GeneratorsView    from '../views/generators/GeneratorsView';
import DungeonView       from '../views/dungeon/DungeonView';
import BestiaryView      from '../views/bestiary/BestiaryView';
import InspirationView   from '../views/inspiration/InspirationView';

export interface ModuleRegistryEntry {
  id:          string;
  displayName: string;
  icon:        string;          // Name matching the Icon component
  route:       string;          // Must start with /
  component:   ComponentType;
  /** Whether this module requires an open campaign to function. */
  requiresCampaign: boolean;
}
export const MODULE_REGISTRY: ModuleRegistryEntry[] = [
  {
    id:               'atlas',
    displayName:      'World Atlas',
    icon:             'map',
    route:            '/atlas',
    component:        AtlasView,
    requiresCampaign: true,
  },
  {
    id:               'npcs',
    displayName:      'Characters',
    icon:             'users',
    route:            '/npcs',
    component:        NpcsView,
    requiresCampaign: true,
  },
  {
    id:               'quests',
    displayName:      'Quests',
    icon:             'scroll',
    route:            '/quests',
    component:        QuestsView,
    requiresCampaign: true,
  },
  {
    id:               'sessions',
    displayName:      'Sessions',
    icon:             'calendar',
    route:            '/sessions',
    component:        SessionsView,
    requiresCampaign: true,
  },
  {
    id:               'timeline',
    displayName:      'Timeline',
    icon:             'clock',
    route:            '/timeline',
    component:        TimelineView,
    requiresCampaign: true,
  },
  {
    id:               'graph',
    displayName:      'Relations',
    icon:             'network',
    route:            '/graph',
    component:        GraphView,
    requiresCampaign: true,
  },
  {
    id:               'assets',
    displayName:      'Assets',
    icon:             'folder',
    route:            '/assets',
    component:        AssetsView,
    requiresCampaign: true,
  },
  {
    id:               'generators',
    displayName:      'Generators',
    icon:             'scroll',
    route:            '/generators',
    component:        GeneratorsView,
    requiresCampaign: true,
  },
  {
    id:               'dungeon',
    displayName:      'Dungeons',
    icon:             'network',
    route:            '/dungeons',
    component:        DungeonView,
    requiresCampaign: true,
  },
  {
    id:               'bestiary',
    displayName:      'Bestiary',
    icon:             'skull',
    route:            '/bestiary',
    component:        BestiaryView,
    requiresCampaign: true,
  },
  {
    id:               'inspiration',
    displayName:      'Inspiration',
    icon:             'sparkles',
    route:            '/inspiration',
    component:        InspirationView,
    requiresCampaign: true,
  },
];
export function getModuleById(id: string): ModuleRegistryEntry | undefined {
  return MODULE_REGISTRY.find(m => m.id === id);
}
