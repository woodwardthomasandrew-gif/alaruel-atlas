// ─────────────────────────────────────────────────────────────────────────────
// shared/types/campaign.ts
//
// Campaign — the top-level container that owns all other entities.
// A Campaign maps 1:1 to a single SQLite `.db` file on disk.
// ─────────────────────────────────────────────────────────────────────────────

import type { EntityBase, WithDescription, WithTags, ISOTimestamp } from './common';

// ── Campaign settings ─────────────────────────────────────────────────────────

/**
 * GM-configurable settings scoped to a single campaign.
 * Stored in the campaign database and surfaced via the ConfigManager's
 * campaign config layer.
 */
export interface CampaignSettings {
  /**
   * Name of the game system, e.g. `'D&D 5e'`, `'Pathfinder 2e'`, `'Homebrew'`.
   * Purely informational — Atlas is system-agnostic.
   */
  system:             string;

  /**
   * Name of the calendar system used for in-world dates.
   * e.g. `'Harptos'`, `'Gregorian'`, `'Custom'`.
   */
  calendarSystem:     string;

  /**
   * Whether to show real-world session dates alongside in-world dates in the UI.
   * @default true
   */
  showRealDates:      boolean;

  /**
   * Whether new Quests default to visible to players or GM-only.
   * @default false (GM-only by default)
   */
  questsDefaultPublic: boolean;

  /**
   * Whether to auto-populate Session.featuredNpcIds when NPCs are added
   * to scene lists.
   * @default true
   */
  autoLinkSessionNpcs: boolean;

  /** Any additional per-module settings stored as a key-value bag. */
  moduleSettings:     Record<string, Record<string, unknown>>;
}

// ── Campaign statistics (computed, never stored) ───────────────────────────────

/**
 * Lightweight summary counts for the campaign dashboard.
 * Computed on demand — never persisted.
 */
export interface CampaignStats {
  npcCount:          number;
  factionCount:      number;
  locationCount:     number;
  questCount:        number;
  activeQuestCount:  number;
  sessionCount:      number;
  eventCount:        number;
  assetCount:        number;
  plotThreadCount:   number;
}

// ── Campaign ──────────────────────────────────────────────────────────────────

/**
 * The root entity that owns every other entity in the system.
 *
 * One Campaign corresponds to one SQLite `.db` file. Opening a file creates
 * this record; all subsequent entities reference `campaignId` in their tables.
 *
 * The Campaign entity is read by the UI shell to populate the title bar,
 * recent campaigns list, and dashboard.
 */
export interface Campaign extends EntityBase, WithDescription, WithTags {
  // ── Identity ───────────────────────────────────────────────────────────────

  /** Campaign subtitle or tagline displayed under the title in the dashboard. */
  subtitle?:         string;

  // ── GM metadata ───────────────────────────────────────────────────────────

  /**
   * Name of the GM running this campaign.
   * Optional — displayed in the campaign card.
   */
  gmName?:           string;

  /**
   * Names of the players in this campaign, comma-separated or as an array.
   * Stored as a string array for display.
   */
  playerNames:       string[];

  // ── Temporal record ────────────────────────────────────────────────────────

  /**
   * Real-world date when the campaign started (first session played).
   * Distinct from `createdAt` which is when the file was created.
   */
  startedAt?:        ISOTimestamp;

  /**
   * Real-world date when the campaign concluded.
   * Null for active campaigns.
   */
  concludedAt?:      ISOTimestamp;

  // ── Status ─────────────────────────────────────────────────────────────────

  /** Whether this campaign is actively being played. */
  status:            'active' | 'hiatus' | 'concluded' | 'abandoned';

  // ── Settings ──────────────────────────────────────────────────────────────

  settings:          CampaignSettings;

  // ── Cover art ─────────────────────────────────────────────────────────────

  /**
   * Virtual path to the campaign cover image shown in the dashboard.
   * Null if no cover is set.
   */
  coverAssetId:      string | null;
}

// ── CampaignSummary ───────────────────────────────────────────────────────────

/**
 * A trimmed-down Campaign used in the recent campaigns list and file picker.
 * Contains enough information to display a card without opening the database.
 */
export interface CampaignSummary {
  id:             string;
  name:           string;
  subtitle?:      string;
  system:         string;
  status:         Campaign['status'];
  coverAssetId:   string | null;
  sessionCount:   number;
  /** Absolute path to the `.db` file on disk. */
  filePath:       string;
  /** ISO-8601 timestamp of the last time this campaign was opened. */
  lastOpenedAt:   ISOTimestamp;
  createdAt:      ISOTimestamp;
}
