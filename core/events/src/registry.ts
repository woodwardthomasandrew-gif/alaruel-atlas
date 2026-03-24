/**
 * Central event registry.
 *
 * Every event that crosses a module boundary MUST be declared here.
 * This file is the contract document for the entire system.
 *
 * Convention: '<module>:<verb>'  e.g. 'quest:completed', 'npc:created'
 *
 * TODO: populate as modules are built
 */
export type AppEventMap = {
  // -- Quests --
  'quest:created':   { questId: string };
  'quest:updated':   { questId: string };
  'quest:completed': { questId: string; npcIds: string[] };

  // -- NPCs --
  'npc:created':     { npcId: string };
  'npc:updated':     { npcId: string };

  // -- Sessions --
  'session:started': { sessionId: string };
  'session:ended':   { sessionId: string };

  // -- Timeline --
  'timeline:entry-added': { entryId: string };

  // -- Atlas --
  'atlas:map-loaded': { mapId: string };

  // -- Plugins --
  'plugin:loaded':    { pluginId: string };
  'plugin:unloaded':  { pluginId: string };

  // -- Dungeon --
  'dungeon:generated': { dungeonId: string };

  // -- Bestiary --
  'bestiary:created': { monsterId: string };
  'bestiary:updated': { monsterId: string };

  // -- Mini Catalogue --
  'mini-catalogue:created': { miniId: string };
  'mini-catalogue:updated': { miniId: string };

  // -- App lifecycle --
  'app:campaign-opened': { campaignId: string };
  'app:campaign-closed': { campaignId: string };
};
