// ─────────────────────────────────────────────────────────────────────────────
// shared/types/session.ts
//
// Session entity type.
// A Session is a single real-world play session. It is the central
// cross-referencing hub — almost every other entity type links to Sessions.
// Managed by the `sessions` module.
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
 * Lifecycle stage of a Session.
 */
export type SessionStatus =
  | 'planned'    // Scheduled but not yet played
  | 'in_progress'// Currently being played (live session)
  | 'completed'  // Played and recap written
  | 'cancelled'; // Never played

/**
 * A recap or note block attached to a Session.
 * Sessions accumulate notes before (planning), during (live), and after (recap).
 */
export interface SessionNote {
  id:         string;
  /** Semantic phase this note belongs to. */
  phase:      'planning' | 'live' | 'recap';
  /** Markdown body. */
  content:    string;
  createdAt:  ISOTimestamp;
  updatedAt:  ISOTimestamp;
}

/**
 * A preparation checklist item for a session.
 * Used by the GM to track what needs to be ready before the session starts.
 */
export interface SessionPrepItem {
  id:          string;
  description: string;
  done:        boolean;
}

/**
 * A scene block within a session — a discrete encounter, roleplay moment,
 * or exploration beat that the GM plans or records in retrospect.
 */
export interface SessionScene {
  id:           string;
  /** Short title for the scene, e.g. `'Ambush at the crossroads'`. */
  title:        string;
  /** Markdown description or GM notes for this scene. */
  content:      string;
  /** Ordering index within the session. */
  order:        number;
  /**
   * ID of the Location where this scene takes place.
   * Null if the scene has no fixed location.
   */
  locationId:   string | null;
  /** IDs of NPCs who appear in this scene. */
  npcIds:       string[];
  /** Whether this scene has been played out (retrospective marker). */
  played:       boolean;
}

// ── Session ───────────────────────────────────────────────────────────────────

/**
 * A single real-world play session.
 *
 * Sessions are the temporal spine of the campaign record:
 *  - Before: planning notes, prep checklist, scene outlines.
 *  - During: live notes captured mid-session.
 *  - After:  recap, XP, loot, follow-up hooks.
 *
 * Every major narrative event cross-references one or more Sessions.
 */
export interface Session extends EntityBase, WithDescription, WithTags {
  // ── Lifecycle ──────────────────────────────────────────────────────────────

  status:                SessionStatus;

  /** Zero-based session number within the campaign. @default 0 */
  sessionNumber:         number;

  // ── Real-world scheduling ──────────────────────────────────────────────────

  /**
   * Real-world date and time of the session.
   * ISO-8601 string. May be in the future for planned sessions.
   */
  scheduledAt?:          ISOTimestamp;

  /**
   * Actual start time (set when status transitions to `in_progress`).
   */
  startedAt?:            ISOTimestamp;

  /**
   * Actual end time (set when session is marked completed).
   */
  endedAt?:              ISOTimestamp;

  /**
   * Duration in minutes. Computed from startedAt/endedAt or set manually.
   */
  durationMinutes?:      number;

  // ── In-world time ─────────────────────────────────────────────────────────

  /**
   * In-world campaign date at the start of this session.
   */
  campaignDateStart?:    CampaignDate;

  /**
   * In-world campaign date at the end of this session.
   */
  campaignDateEnd?:      CampaignDate;

  // ── Planning ───────────────────────────────────────────────────────────────

  /**
   * Ordered scenes planned (or recorded) for this session.
   * Each scene is a discrete encounter or narrative beat.
   */
  scenes:                SessionScene[];

  /** GM prep checklist — things to prepare before the session. */
  prepItems:             SessionPrepItem[];

  // ── Narrative cross-references ─────────────────────────────────────────────

  /** IDs of Quests that were advanced during this session. */
  advancedQuestIds:      string[];

  /** IDs of Quests that were completed during this session. */
  completedQuestIds:     string[];

  /** IDs of PlotThreads that were advanced during this session. */
  plotThreadIds:         string[];

  /** IDs of NPCs who appeared in this session. */
  featuredNpcIds:        string[];

  /** IDs of Locations visited during this session. */
  visitedLocationIds:    string[];

  /** IDs of CampaignEvents that occurred during this session. */
  eventIds:              string[];

  // ── Notes ─────────────────────────────────────────────────────────────────

  /**
   * All notes for this session, across all phases.
   * Filter by `phase` to get planning vs. live vs. recap notes.
   */
  notes:                 SessionNote[];

  // ── Outcome ────────────────────────────────────────────────────────────────

  /**
   * XP or advancement rewards given at the end of this session.
   * Freeform string — no enforcement of format.
   */
  rewards?:              string;

  /**
   * Loose threads and follow-up hooks surfaced for the next session.
   * Free Markdown text — not linked to Quest objects (use `advancedQuestIds`
   * for those). Useful for quick GM reminders.
   */
  followUpHooks?:        string;

  // ── Assets ────────────────────────────────────────────────────────────────

  /** IDs of asset records attached to this session (handouts, maps, etc.). */
  assetIds:              string[];
}
