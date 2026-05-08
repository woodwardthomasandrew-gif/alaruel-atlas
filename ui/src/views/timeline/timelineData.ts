// ─────────────────────────────────────────────────────────────────────────────
// ui/src/views/timeline/timelineData.ts
//
// Data layer for the timeline. Fetches raw events from the DB,
// maps them to TimelineEvent objects, and provides lane / zoom config.
//
// The timeline is a PROJECTION of campaign_events. It does not own data.
// ─────────────────────────────────────────────────────────────────────────────

import { atlas } from '../../bridge/atlas';
import { parseFantasyDate } from './calendarUtils';
import type {
  TimelineEvent,
  TimelineLane,
  TimelineLaneId,
  ZoomConfig,
  ZoomLevel,
  TimelineEventCategory,
} from './timelineTypes';
import type { FantasyDate } from './calendarUtils';

// ── Category → Lane mapping ───────────────────────────────────────────────────

const CATEGORY_LANE: Record<string, TimelineLaneId> = {
  battle:     'wars',
  quest:      'main-story',
  faction:    'factions',
  political:  'factions',
  death:      'character-arcs',
  birth:      'character-arcs',
  discovery:  'main-story',
  natural:    'world',
  social:     'world',
  mystery:    'main-story',
  other:      'other',
};

// ── Category colours ──────────────────────────────────────────────────────────

export const CATEGORY_COLORS: Record<string, string> = {
  battle:     '#c44040',
  quest:      '#e0b060',
  faction:    '#7a6fae',
  political:  '#5a8fa0',
  death:      '#8b4040',
  birth:      '#6aaa6a',
  discovery:  '#60b0c4',
  natural:    '#6a9a6a',
  social:     '#c47a30',
  mystery:    '#8a5ab8',
  other:      '#6b5c40',
};

// ── Category icons ────────────────────────────────────────────────────────────

export const CATEGORY_ICONS: Record<string, string> = {
  battle:    '⚔',
  quest:     '◈',
  faction:   '⊕',
  political: '⚖',
  death:     '✦',
  birth:     '✧',
  discovery: '◉',
  natural:   '☁',
  social:    '♦',
  mystery:   '?',
  other:     '·',
};

// ── Lane definitions ──────────────────────────────────────────────────────────

export const DEFAULT_LANES: TimelineLane[] = [
  { id: 'main-story',    label: 'Main Chronicle',   icon: '📜', color: '#e0b060', collapsed: false, visible: true, order: 0 },
  { id: 'party',         label: 'Party',             icon: '⚔️', color: '#c0a060', collapsed: false, visible: true, order: 1 },
  { id: 'factions',      label: 'Factions & Powers', icon: '🏛', color: '#7a6fae', collapsed: false, visible: true, order: 2 },
  { id: 'wars',          label: 'Wars & Conflicts',  icon: '🔥', color: '#c44040', collapsed: false, visible: true, order: 3 },
  { id: 'character-arcs',label: 'Character Arcs',    icon: '👤', color: '#9a6040', collapsed: false, visible: true, order: 4 },
  { id: 'world',         label: 'World Events',      icon: '🌍', color: '#5a8f6a', collapsed: true,  visible: true, order: 5 },
  { id: 'divine',        label: 'Divine & Cosmic',   icon: '✨', color: '#9a70c8', collapsed: true,  visible: true, order: 6 },
  { id: 'cosmic',        label: 'Cosmic Events',     icon: '🌌', color: '#4a6a9a', collapsed: true,  visible: true, order: 7 },
  { id: 'other',         label: 'Other',             icon: '📌', color: '#6b5c40', collapsed: true,  visible: true, order: 8 },
];

// ── Zoom configurations ───────────────────────────────────────────────────────

export const ZOOM_CONFIGS: Record<ZoomLevel, ZoomConfig> = {
  era: {
    level: 'era',
    pixelsPerDay: 0.05,
    gridSpanDays: 3600,   // 10 years
    gridLabel: (d: FantasyDate) => `Year ${Math.floor(d.year / 10) * 10}s`,
  },
  year: {
    level: 'year',
    pixelsPerDay: 0.3,
    gridSpanDays: 360,    // 1 year
    gridLabel: (d: FantasyDate) => `Year ${d.year}`,
  },
  month: {
    level: 'month',
    pixelsPerDay: 4,
    gridSpanDays: 30,     // 1 month
    gridLabel: (d: FantasyDate) => `${d.monthName ?? `Month ${d.month}`} ${d.year}`,
  },
  week: {
    level: 'week',
    pixelsPerDay: 20,
    gridSpanDays: 7,
    gridLabel: (d: FantasyDate) => `Day ${d.day}, ${d.monthName ?? `M${d.month}`}`,
  },
  day: {
    level: 'day',
    pixelsPerDay: 80,
    gridSpanDays: 1,
    gridLabel: (d: FantasyDate) => `Day ${d.day}`,
  },
};

// ── Raw DB row type ───────────────────────────────────────────────────────────

interface RawEventRow {
  id: string;
  name: string;
  description: string;
  event_type: string;
  significance: string;
  campaign_date: string | null;
  campaign_date_end: string | null;
  certainty: string;
  is_player_facing: number;
  tags: string;
  quest_id: string | null;
  session_id: string | null;
  plot_thread_id: string | null;
}

// ── Mapping ───────────────────────────────────────────────────────────────────

function rowToTimelineEvent(row: RawEventRow): TimelineEvent | null {
  const startDate = row.campaign_date
    ? parseFantasyDate(row.campaign_date)
    : null;

  // Events without a parseable date are placed at a synthetic position (year 0)
  // so they still appear on the timeline — just at the very start.
  const resolvedStart: FantasyDate = startDate ?? {
    year: 0, month: 1, day: 1, raw: row.campaign_date ?? 'Unknown',
  };

  const endDate = row.campaign_date_end
    ? parseFantasyDate(row.campaign_date_end) ?? undefined
    : undefined;

  const category = (row.event_type as TimelineEventCategory) ?? 'other';

  return {
    id:            row.id,
    title:         row.name,
    description:   row.description ?? '',
    startDate:     resolvedStart,
    endDate,
    lane:          CATEGORY_LANE[category] ?? 'other',
    category,
    sourceType:    'campaign_events',
    sourceId:      row.id,
    autogenerated: false,
    tags:          JSON.parse(row.tags ?? '[]') as string[],
    icon:          CATEGORY_ICONS[category] ?? '·',
    color:         CATEGORY_COLORS[category] ?? '#6b5c40',
    isPlayerFacing: row.is_player_facing === 1,
    significance:   (row.significance as TimelineEvent['significance']) ?? 'minor',
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Fetch all campaign events and return them as TimelineEvents.
 * This is the primary data source for the timeline.
 */
export async function fetchTimelineEvents(campaignId: string): Promise<TimelineEvent[]> {
  type R = Record<string, unknown>;
  const rows = await atlas.db.query<R>(
    `SELECT id, name, description, event_type, significance,
            campaign_date, campaign_date_end, certainty,
            is_player_facing, tags, quest_id, session_id, plot_thread_id
     FROM campaign_events
     WHERE campaign_id = ?
     ORDER BY campaign_date ASC, created_at ASC
     LIMIT 500`,
    [campaignId],
  );

  return rows
    .map(r => rowToTimelineEvent(r as unknown as RawEventRow))
    .filter((e): e is TimelineEvent => e !== null);
}

/**
 * Update a campaign event's date (called after drag/drop).
 */
export async function updateEventDate(
  eventId: string,
  campaignId: string,
  newDateRaw: string,
): Promise<void> {
  const now = new Date().toISOString();
  await atlas.db.run(
    `UPDATE campaign_events
     SET campaign_date = ?, updated_at = ?
     WHERE id = ? AND campaign_id = ?`,
    [newDateRaw, now, eventId, campaignId],
  );
}

/**
 * Create a new campaign event from the timeline UI.
 */
export async function createEventFromTimeline(
  campaignId: string,
  input: {
    name: string;
    description?: string;
    eventType: string;
    significance: string;
    campaignDate?: string;
    isPlayerFacing?: boolean;
  },
): Promise<string> {
  const id  = crypto.randomUUID();
  const now = new Date().toISOString();
  await atlas.db.run(
    `INSERT INTO campaign_events
       (id, campaign_id, name, description, event_type, significance,
        campaign_date, certainty, is_player_facing, tags, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'exact', ?, '[]', ?, ?)`,
    [
      id, campaignId,
      input.name.trim(),
      input.description ?? '',
      input.eventType ?? 'other',
      input.significance ?? 'minor',
      input.campaignDate ?? null,
      input.isPlayerFacing !== false ? 1 : 0,
      now, now,
    ],
  );
  return id;
}

/**
 * Delete a campaign event.
 */
export async function deleteTimelineEvent(eventId: string, campaignId: string): Promise<void> {
  await atlas.db.run(
    'DELETE FROM campaign_events WHERE id = ? AND campaign_id = ?',
    [eventId, campaignId],
  );
}
