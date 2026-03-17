// ─────────────────────────────────────────────────────────────────────────────
// shared/types/npc.ts
//
// NPC (Non-Player Character) and Faction entity types.
// Both are managed by the `npcs` module.
// ─────────────────────────────────────────────────────────────────────────────

import type { EntityBase, WithDescription, WithTags, ActiveStatus, ISOTimestamp, CampaignDate } from './common';

// ── Supporting value types ────────────────────────────────────────────────────

/**
 * The degree to which an NPC trusts or opposes the player characters.
 * Used by the relationship graph and session planning modules.
 */
export type DispositionLevel =
  | 'hostile'
  | 'unfriendly'
  | 'neutral'
  | 'friendly'
  | 'allied';

/**
 * Broad role an NPC plays in the narrative.
 * Does not map to game-system mechanics — purely narrative categorisation.
 */
export type NpcRole =
  | 'ally'
  | 'antagonist'
  | 'neutral'
  | 'informant'
  | 'questgiver'
  | 'merchant'
  | 'recurring'
  | 'minor';

/**
 * Current vital status of an NPC.
 */
export type VitalStatus = 'alive' | 'dead' | 'missing' | 'unknown';

/**
 * A single entry in an NPC's relationship list.
 * Describes how this NPC relates to another NPC or to a Faction.
 */
export interface NpcRelationship {
  /**
   * The related entity.
   * Use `targetType` to determine whether to look up an NPC or a Faction.
   */
  targetId:    string;
  targetType:  'npc' | 'faction';
  /** Short label describing the nature of the relationship. */
  label:       string;
  /** Numeric strength: -100 (sworn enemies) to +100 (deeply bonded). */
  strength:    number;
  /** Optional narrative note about how this relationship came to be. */
  note?:       string;
}

/**
 * A single note attached to an NPC, recorded at a specific in-world or
 * real-world point in time.
 */
export interface NpcNote {
  id:           string;
  /** The note body (Markdown). */
  content:      string;
  /** Optional campaign date when this note was recorded in-world. */
  campaignDate?: CampaignDate;
  /** Real-world ISO timestamp. */
  createdAt:    ISOTimestamp;
}

// ── NPC ───────────────────────────────────────────────────────────────────────

/**
 * A Non-Player Character in the campaign world.
 *
 * NPCs are the most cross-referenced entity in the system: quests reference
 * them as quest-givers and targets, sessions reference them as participants,
 * the relationship graph displays their connections, and assets link portraits
 * to them.
 *
 * All cross-module references use `id` strings — never imported NPC objects.
 */
export interface NPC extends EntityBase, WithDescription, WithTags {
  // ── Identity ───────────────────────────────────────────────────────────────

  /** Full name or title used in the UI. (Inherited from EntityBase as `name`.) */

  /** Optional shorter alias, nickname, or title. */
  alias?:          string;

  /** Narrative role this NPC plays in the story. */
  role:            NpcRole;

  /** Current vital status. */
  vitalStatus:     VitalStatus;

  // ── World placement ────────────────────────────────────────────────────────

  /**
   * ID of the Location where this NPC is currently based.
   * Null if location is unknown or the NPC is itinerant.
   */
  currentLocationId: string | null;

  /**
   * IDs of Locations this NPC is associated with (home, workplace, etc.).
   * Order is meaningful — first entry is considered the primary location.
   */
  locationIds:     string[];

  /**
   * ID of the Faction this NPC primarily belongs to.
   * Null if unaffiliated.
   */
  primaryFactionId: string | null;

  /** IDs of all Factions this NPC is a member of (including primary). */
  factionIds:      string[];

  // ── Player relationship ────────────────────────────────────────────────────

  /** How this NPC feels about the player characters as a whole. */
  dispositionTowardsPlayers: DispositionLevel;

  // ── Relationships ──────────────────────────────────────────────────────────

  /** This NPC's known relationships with other NPCs and Factions. */
  relationships:   NpcRelationship[];

  // ── Narrative cross-references ─────────────────────────────────────────────

  /** IDs of Quests this NPC is directly involved in (as giver, target, etc.). */
  questIds:        string[];

  /** IDs of Sessions in which this NPC appeared. */
  sessionIds:      string[];

  /** IDs of PlotThreads this NPC is a participant in. */
  plotThreadIds:   string[];

  // ── Notes ─────────────────────────────────────────────────────────────────

  /** Session and GM notes attached to this NPC, in chronological order. */
  notes:           NpcNote[];

  // ── Asset reference ────────────────────────────────────────────────────────

  /**
   * Virtual path of the portrait asset, e.g. `asset://portraits/abc123.webp`.
   * Resolved at runtime by the AssetManager. Null if no portrait is set.
   */
  portraitAssetId: string | null;
}

// ── Faction ───────────────────────────────────────────────────────────────────

/**
 * An organisation, guild, government, cult, or other group in the campaign.
 *
 * Factions can have members (NPCs), control Locations, pursue Goals, and
 * oppose other Factions. The relationship graph module renders Faction nodes
 * alongside NPC nodes.
 */
export interface Faction extends EntityBase, WithDescription, WithTags {
  // ── Identity ───────────────────────────────────────────────────────────────

  /** Short acronym or abbreviation, e.g. `'ZE'` for "Zhentarim Enclave". */
  abbreviation?:    string;

  /** Current operational status. */
  status:           ActiveStatus;

  // ── Membership ─────────────────────────────────────────────────────────────

  /**
   * ID of the NPC who leads this Faction.
   * Null if leadership is collective, unknown, or vacant.
   */
  leaderNpcId:      string | null;

  /** IDs of all NPC members. Includes the leader. */
  memberNpcIds:     string[];

  // ── Geography ─────────────────────────────────────────────────────────────

  /**
   * ID of the Location that serves as this Faction's headquarters.
   * Null if nomadic or HQ is unknown.
   */
  headquartersLocationId: string | null;

  /** IDs of all Locations this Faction controls or has a strong presence in. */
  controlledLocationIds:  string[];

  // ── Relationships with other factions ─────────────────────────────────────

  /**
   * Standing relationships with other Factions.
   * Each entry uses the same `NpcRelationship` shape for consistency —
   * both `targetId` and `targetType` are set to `'faction'` here.
   */
  factionRelationships: NpcRelationship[];

  // ── Narrative cross-references ─────────────────────────────────────────────

  /** IDs of Quests in which this Faction plays a role. */
  questIds:          string[];

  /** IDs of PlotThreads this Faction is involved in. */
  plotThreadIds:     string[];

  // ── Assets ────────────────────────────────────────────────────────────────

  /**
   * Virtual path to this Faction's heraldry or logo asset.
   * Null if no symbol is set.
   */
  symbolAssetId:    string | null;
}
