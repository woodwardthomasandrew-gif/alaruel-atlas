// ─────────────────────────────────────────────────────────────────────────────
// shared/types/quest.ts
//
// Quest and PlotThread entity types.
// Quests are discrete player-facing tasks. PlotThreads are the narrative
// threads that weave quests, NPCs, and events into a larger story arc.
// Both are managed by the `quests` module.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  EntityBase,
  WithDescription,
  WithTags,
  CampaignDate,
  ISOTimestamp,
} from './common';

// ── Supporting value types ────────────────────────────────────────────────────

/**
 * Lifecycle stage of a Quest.
 */
export type QuestStatus =
  | 'rumour'      // Players have heard of it but haven't taken it on
  | 'active'      // Currently being pursued
  | 'on_hold'     // Accepted but paused
  | 'completed'   // Successfully resolved
  | 'failed'      // Unrecoverably failed
  | 'abandoned'   // Players chose not to continue
  | 'hidden';     // GM-only; not yet visible to players

/**
 * Narrative scope of a Quest.
 * Helps the GM prioritise and organise the quest log.
 */
export type QuestType =
  | 'main'        // Central campaign storyline
  | 'side'        // Optional tangent
  | 'personal'    // Tied to a specific player character's backstory
  | 'faction'     // Issued by or for a Faction
  | 'exploration' // Discover a Location
  | 'fetch'       // Obtain an item or piece of information
  | 'escort'      // Protect or guide someone
  | 'eliminate'   // Defeat a target
  | 'mystery';    // Investigation arc

/**
 * A single step or sub-task within a Quest.
 * Objectives are ordered — their array index implies sequence, though the GM
 * may mark them out of order.
 */
export interface QuestObjective {
  id:          string;
  /** Short description of what must be accomplished. */
  description: string;
  /** Whether this step has been completed. */
  completed:   boolean;
  /** Whether this objective is required or merely optional bonus content. */
  required:    boolean;
  /** Optional in-world deadline for this objective. */
  deadline?:   CampaignDate;
}

/**
 * A GM-facing note attached to a Quest.
 * Notes are private by default — the `visibleToPlayers` flag unlocks sharing.
 */
export interface QuestNote {
  id:                string;
  content:           string;
  createdAt:         ISOTimestamp;
  visibleToPlayers:  boolean;
}

// ── Quest ─────────────────────────────────────────────────────────────────────

/**
 * A discrete task or storyline that the player characters can pursue.
 *
 * A Quest composes objectives, references the NPCs involved, links to the
 * Locations where it unfolds, and records which Sessions advanced it.
 * Multiple Quests can belong to a single PlotThread.
 */
export interface Quest extends EntityBase, WithDescription, WithTags {
  // ── Classification ─────────────────────────────────────────────────────────

  /** Current lifecycle stage. */
  status:              QuestStatus;

  /** Narrative scope. */
  questType:           QuestType;

  /**
   * Relative importance for display ordering in the quest log.
   * Higher values surface the quest to the top of lists.
   * @default 0
   */
  priority:            number;

  // ── Objectives ─────────────────────────────────────────────────────────────

  /**
   * Ordered list of sub-tasks.
   * A Quest with no objectives is valid — it represents a pure narrative beat.
   */
  objectives:          QuestObjective[];

  // ── Temporal context ───────────────────────────────────────────────────────

  /** In-world date when the quest was received or first encountered. */
  startDate?:          CampaignDate;

  /** In-world date of completion, failure, or abandonment. */
  endDate?:            CampaignDate;

  // ── People & places ────────────────────────────────────────────────────────

  /**
   * ID of the NPC who issued this quest.
   * Null for self-directed quests or quests with no clear giver.
   */
  questGiverNpcId:     string | null;

  /**
   * IDs of NPCs who are targets, key contacts, or otherwise directly involved.
   * Does not include the quest giver (use `questGiverNpcId` for that).
   */
  involvedNpcIds:      string[];

  /**
   * ID of the Faction that issued or sponsored this quest.
   * Null for independent or player-initiated quests.
   */
  sponsorFactionId:    string | null;

  /**
   * IDs of Locations where this quest takes place.
   * First entry is treated as the primary location for map display.
   */
  locationIds:         string[];

  // ── Narrative structure ────────────────────────────────────────────────────

  /**
   * ID of the PlotThread this quest belongs to.
   * Null for quests not yet assigned to a plot thread.
   */
  plotThreadId:        string | null;

  /**
   * IDs of other Quests that must be completed before this one becomes
   * available. Empty array means no prerequisites.
   */
  prerequisiteQuestIds: string[];

  /**
   * IDs of Quests that are unlocked when this quest is completed.
   * Populated automatically by the quests module on completion.
   */
  unlocksQuestIds:     string[];

  // ── Session tracking ───────────────────────────────────────────────────────

  /** IDs of Sessions in which this Quest was advanced. */
  sessionIds:          string[];

  // ── Notes ─────────────────────────────────────────────────────────────────

  /** GM and player notes attached to this Quest. */
  notes:               QuestNote[];

  // ── Reward ────────────────────────────────────────────────────────────────

  /**
   * Freeform reward description, e.g. `'500 gp + title of Baron'`.
   * Not parsed or enforced — purely descriptive.
   */
  reward?:             string;
}

// ── PlotThread ────────────────────────────────────────────────────────────────

/**
 * A narrative arc that groups related Quests, Events, and NPCs into a
 * coherent storyline.
 *
 * Examples:
 *  - "The Cult of the Dragon" (main campaign arc)
 *  - "Torm's Revenge" (personal arc for one player character)
 *  - "The Trade War" (faction conflict spanning several quests)
 *
 * PlotThreads are the highest-level narrative organiser. The relationship
 * graph module renders threads as clusters.
 */
export interface PlotThread extends EntityBase, WithDescription, WithTags {
  // ── Classification ─────────────────────────────────────────────────────────

  /** Current narrative status. */
  status:              'active' | 'resolved' | 'dormant' | 'abandoned';

  /**
   * Relative importance for display ordering.
   * @default 0
   */
  priority:            number;

  // ── Constituent quests ─────────────────────────────────────────────────────

  /**
   * IDs of all Quests that belong to this PlotThread.
   * Order reflects narrative sequence, not necessarily the order they appear
   * in the campaign.
   */
  questIds:            string[];

  // ── Key actors ────────────────────────────────────────────────────────────

  /**
   * IDs of NPCs who are central to this arc.
   * These are surfaced prominently in the relationship graph.
   */
  keyNpcIds:           string[];

  /**
   * IDs of Factions that drive or are significantly affected by this arc.
   */
  keyFactionIds:       string[];

  // ── Geography ─────────────────────────────────────────────────────────────

  /**
   * IDs of Locations that are significant to this arc.
   * Used by the atlas module to highlight related locations.
   */
  locationIds:         string[];

  // ── Temporal context ───────────────────────────────────────────────────────

  /** In-world date when this arc began. */
  startDate?:          CampaignDate;

  /** In-world date when this arc concluded. */
  endDate?:            CampaignDate;

  // ── Timeline ──────────────────────────────────────────────────────────────

  /** IDs of CampaignEvents that are part of this plot thread's story. */
  eventIds:            string[];

  // ── Session record ─────────────────────────────────────────────────────────

  /** IDs of Sessions that advanced this PlotThread. */
  sessionIds:          string[];
}
