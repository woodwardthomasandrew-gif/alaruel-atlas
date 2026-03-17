// ─────────────────────────────────────────────────────────────────────────────
// shared/types/index.ts — barrel export
//
// Single entry point for all shared domain types.
// Consumers: import from '@alaruel/shared' (the package barrel) or from
// '@alaruel/shared/types' (this file directly).
//
// File layout:
//   common.ts        — primitives: EntityBase, ID, Timestamp, Result, Paginated
//   campaign.ts      — Campaign, CampaignSettings, CampaignSummary
//   npc.ts           — NPC, Faction, NpcRelationship, NpcNote
//   location.ts      — Location, CampaignMap, LocationPin
//   quest.ts         — Quest, PlotThread, QuestObjective
//   session.ts       — Session, SessionScene, SessionNote
//   event.ts         — CampaignEvent
//   asset.ts         — Asset, AssetLink, AssetReference, AssetImportRequest
//   relationships.ts — GraphNode, GraphEdge, EntityRef, EntityType
//   plugin.ts        — PluginManifest, PluginPermission, PluginContext
// ─────────────────────────────────────────────────────────────────────────────

// ── Primitives & utilities ────────────────────────────────────────────────────
export type {
  ID,
  ISOTimestamp,
  CampaignDate,
  EntityBase,
  WithDescription,
  WithTags,
  ActiveStatus,
  Result,
  Paginated,
  SortDirection,
  ListQuery,
} from './common';

export { Ok, Err } from './common';

// ── Campaign ──────────────────────────────────────────────────────────────────
export type {
  Campaign,
  CampaignSettings,
  CampaignStats,
  CampaignSummary,
} from './campaign';

// ── NPCs & Factions ───────────────────────────────────────────────────────────
export type {
  NPC,
  Faction,
  NpcRelationship,
  NpcNote,
  DispositionLevel,
  NpcRole,
  VitalStatus,
} from './npc';

// ── Locations & Maps ──────────────────────────────────────────────────────────
export type {
  Location,
  CampaignMap,
  LocationPin,
  MapPoint,
  LocationType,
} from './location';

// ── Quests & Plot threads ─────────────────────────────────────────────────────
export type {
  Quest,
  PlotThread,
  QuestObjective,
  QuestNote,
  QuestStatus,
  QuestType,
} from './quest';

// ── Sessions ──────────────────────────────────────────────────────────────────
export type {
  Session,
  SessionNote,
  SessionScene,
  SessionPrepItem,
  SessionStatus,
} from './session';

// ── Campaign events ───────────────────────────────────────────────────────────
export type {
  CampaignEvent,
  CampaignEventType,
  EventCertainty,
  EventSignificance,
} from './event';

// ── Assets ────────────────────────────────────────────────────────────────────
export type {
  Asset,
  AssetLink,
  AssetReference,
  AssetImportRequest,
  AssetCategory,
  AssetMimeType,
} from './asset';

// ── Relationship graph ────────────────────────────────────────────────────────
export type {
  EntityType,
  EntityRef,
  GraphNode,
  GraphEdge,
  EdgeType,
  EntityNeighbourhood,
  GraphQuery,
} from './relationships';

// ── Plugin system ─────────────────────────────────────────────────────────────
export type {
  PluginManifest,
  PluginPermission,
  PluginContext,
  PluginSidebarEntry,
} from './plugin';
