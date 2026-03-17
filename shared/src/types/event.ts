// ─────────────────────────────────────────────────────────────────────────────
// shared/types/event.ts
//
// CampaignEvent entity type.
//
// NOTE: "Event" is a heavily overloaded term in this codebase.
//   - `AppEvent`      — a system message on the EventBus (core/events)
//   - `CampaignEvent` — a narrative occurrence in the campaign world (this file)
//
// This file defines CampaignEvent only.
// Managed by the `timeline` module.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  EntityBase,
  WithDescription,
  WithTags,
  CampaignDate,
} from './common';

// ── Supporting value types ────────────────────────────────────────────────────

/**
 * Broad category of a campaign event.
 * Used for timeline filtering and colour-coding.
 */
export type CampaignEventType =
  | 'battle'         // Military conflict or combat encounter
  | 'political'      // Regime change, treaty, proclamation
  | 'discovery'      // Finding a location, artefact, or secret
  | 'death'          // Death of an NPC or player character
  | 'birth'          // Birth or creation of a significant being
  | 'quest'          // A quest started, advanced, or completed
  | 'faction'        // A faction action: founding, dissolving, coup
  | 'natural'        // Natural disaster, celestial event, magical phenomenon
  | 'social'         // Festival, meeting, negotiation, public spectacle
  | 'mystery'        // Unexplained occurrence
  | 'other';

/**
 * Temporal certainty of an event's placement on the timeline.
 * Allows the GM to record events even when exact dates are uncertain.
 */
export type EventCertainty =
  | 'exact'      // Precise date is known
  | 'approximate'// Date is roughly known (e.g. "around mid-harvest")
  | 'unknown'    // Occurred but date is not established
  | 'legendary'; // Mythological or pre-history — date is symbolic

/**
 * Consequence or outcome magnitude of an event.
 * Used to visually weight events on the timeline.
 */
export type EventSignificance =
  | 'trivial'    // Minor, local impact
  | 'minor'
  | 'moderate'
  | 'major'
  | 'critical';  // World-shaking, campaign-defining

// ── CampaignEvent ─────────────────────────────────────────────────────────────

/**
 * A discrete narrative occurrence placed on the campaign timeline.
 *
 * CampaignEvents are the atoms of the timeline module. They range from
 * off-screen historical facts ("The fall of the old empire, 300 years ago")
 * to granular play-session beats ("Players discovered the traitor's identity").
 *
 * Events reference other entities by ID — they never contain the full entity,
 * so they remain lightweight and serialisable.
 */
export interface CampaignEvent extends EntityBase, WithDescription, WithTags {
  // ── Classification ─────────────────────────────────────────────────────────

  /** Narrative category for filtering and visual coding. */
  eventType:           CampaignEventType;

  /**
   * How significant this event is in the campaign's history.
   * Timeline views use this to scale event markers and control detail level.
   */
  significance:        EventSignificance;

  // ── Temporal placement ─────────────────────────────────────────────────────

  /**
   * The in-world date of this event.
   * May be null when `certainty` is `'unknown'` or `'legendary'`.
   */
  campaignDate:        CampaignDate | null;

  /**
   * How confident the GM is in the placement of this event on the timeline.
   */
  certainty:           EventCertainty;

  /**
   * For events with a duration, the in-world end date.
   * Null for instantaneous events.
   * Examples: a siege (starts → ends), a festival (day 1 → day 3).
   */
  campaignDateEnd?:    CampaignDate;

  /**
   * Whether this event was visible to or experienced by the player characters.
   * False for off-screen world history that only the GM knows.
   */
  isPlayerFacing:      boolean;

  // ── Location ───────────────────────────────────────────────────────────────

  /**
   * ID of the primary Location where this event occurred.
   * Null for events with no fixed location (e.g. a widespread plague).
   */
  locationId:          string | null;

  // ── Participants ──────────────────────────────────────────────────────────

  /** IDs of NPCs who were directly involved in this event. */
  npcIds:              string[];

  /** IDs of Factions that played a role in this event. */
  factionIds:          string[];

  // ── Narrative structure ────────────────────────────────────────────────────

  /**
   * ID of the Quest that this event is tied to.
   * Null for events not associated with a specific quest.
   */
  questId:             string | null;

  /**
   * ID of the PlotThread this event belongs to.
   * Null for standalone events or historical background.
   */
  plotThreadId:        string | null;

  /**
   * ID of the Session in which this event was played out.
   * Null for off-screen events that happened between sessions or in the past.
   */
  sessionId:           string | null;

  // ── Causal links ──────────────────────────────────────────────────────────

  /**
   * IDs of CampaignEvents that directly caused or triggered this event.
   * Used by the timeline module to draw causal arrows.
   */
  causedByEventIds:    string[];

  /**
   * IDs of CampaignEvents that this event directly caused.
   * Populated when the consequence event is created.
   */
  consequenceEventIds: string[];

  // ── Assets ────────────────────────────────────────────────────────────────

  /** IDs of asset records illustrating or documenting this event. */
  assetIds:            string[];
}
