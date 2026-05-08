// ─────────────────────────────────────────────────────────────────────────────
// ui/src/views/timeline/calendarUtils.ts
//
// Fantasy calendar utilities for the Alaruel Atlas timeline system.
//
// CampaignDate is stored as a free-form string (e.g. "15 Hammer, 1492 DR").
// This module provides best-effort parsing + comparison utilities so the
// timeline can sort and position events without requiring a fixed calendar
// schema.
//
// The design intentionally avoids JavaScript Date objects as authoritative
// sources of truth. All logic operates on FantasyDate structures.
// ─────────────────────────────────────────────────────────────────────────────

export interface FantasyDate {
  era?: string;
  year: number;
  month: number;   // 1-indexed numeric month (parsed or inferred)
  monthName?: string;
  day: number;
  raw: string;     // Original string preserved for display
}

// ── Well-known month orderings ────────────────────────────────────────────────
// Campaigns can use any calendar. We attempt to detect known month names and
// map them to a numeric index for sorting. Unknown months default to 0 so they
// sort before all named months.

const MONTH_ORDERINGS: Record<string, number> = {
  // Forgotten Realms / Harptos
  hammer: 1, alturiak: 2, ches: 3, tarsakh: 4, mirtul: 5, kythorn: 6,
  flamerule: 7, eleasis: 8, eleint: 9, marpenoth: 10, uktar: 11, nightal: 12,

  // Common fantasy month names
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,

  // Generic ordinals
  first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6,
  seventh: 7, eighth: 8, ninth: 9, tenth: 10, eleventh: 11, twelfth: 12,

  // Seasonal / atmospheric names often used in homebrew
  frost: 1, thaw: 2, bloom: 3, rain: 4, seed: 5, sun: 6,
  heat: 7, harvest: 8, leaf: 9, storm: 10, dark: 11, ice: 12,
};

function resolveMonthName(token: string): number {
  return MONTH_ORDERINGS[token.toLowerCase()] ?? 0;
}

// ── Parsing ───────────────────────────────────────────────────────────────────

/**
 * Attempt to parse an arbitrary CampaignDate string into a FantasyDate.
 * Returns null if the string is clearly unparseable.
 *
 * Supported formats (all fuzzy):
 *   "15 Hammer, 1492 DR"
 *   "Year 312, Month of Storms, Day 7"
 *   "Day 3, Month 2, Year 400"
 *   "1492-06-15"
 *   "3rd of Flamerule, Year 1350"
 *   "circa Year 200"
 */
export function parseFantasyDate(raw: string): FantasyDate | null {
  if (!raw || raw.trim() === '') return null;

  const s = raw.trim();

  // ── ISO-ish: YYYY-MM-DD ───────────────────────────────────────────────────
  const isoMatch = s.match(/^(\d{3,6})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    return {
      year: parseInt(isoMatch[1], 10),
      month: parseInt(isoMatch[2], 10),
      day: parseInt(isoMatch[3], 10),
      raw,
    };
  }

  // Extract all numeric tokens
  const numbers = [...s.matchAll(/\d+/g)].map(m => parseInt(m[0], 10));
  // Extract all word tokens
  const words   = [...s.matchAll(/[a-zA-Z]+/g)].map(m => m[0]);

  let year  = 0;
  let month = 0;
  let day   = 0;
  let era: string | undefined;
  let monthName: string | undefined;

  // Try to find "Year NNNN" or "NNNN DR/AE/etc"
  const yearMatch = s.match(/\b(?:year|yr)[\s.]*(\d+)/i)
                 ?? s.match(/(\d{3,6})\s+(?:DR|AE|BG|AR|YE|YoC|YoW)/i);
  if (yearMatch) year = parseInt(yearMatch[1], 10);

  // Era suffix
  const eraMatch = s.match(/\d\s+([A-Z]{1,4})(?:\b|$)/);
  if (eraMatch) era = eraMatch[1];

  // Try to find month by name
  for (const w of words) {
    const idx = resolveMonthName(w);
    if (idx > 0) { month = idx; monthName = w; break; }
  }

  // Try "Month N" or "Month of X"
  if (month === 0) {
    const monthNumMatch = s.match(/\bmonth[\s.of]*(\d+)/i);
    if (monthNumMatch) month = parseInt(monthNumMatch[1], 10);
  }

  // Day: "Day N" or "Nth of" or "Nd|st|rd|th"
  const dayMatch = s.match(/\bday[\s.]*(\d+)/i)
                ?? s.match(/\b(\d{1,2})(?:st|nd|rd|th)\b/i)
                ?? s.match(/\b(\d{1,2})\s+(?:of\s+)?[a-zA-Z]/i);
  if (dayMatch) day = parseInt(dayMatch[1], 10);

  // Fallback: assign numbers in order if not yet resolved
  if (year === 0 && numbers.length > 0) {
    // Largest number is likely the year
    const sorted = [...numbers].sort((a, b) => b - a);
    year = sorted[0];
    if (day === 0 && sorted.length > 1 && sorted[sorted.length - 1] <= 31) {
      day = sorted[sorted.length - 1];
    }
    if (month === 0 && numbers.length > 2) {
      // Middle value
      month = numbers.find(n => n !== year && n !== day && n >= 1 && n <= 12) ?? 0;
    }
  }

  if (year === 0 && month === 0 && day === 0) return null;

  return { era, year, month, day, monthName, raw };
}

// ── Comparison ────────────────────────────────────────────────────────────────

/**
 * Compare two FantasyDate values.
 * Returns negative if a < b, 0 if equal, positive if a > b.
 */
export function compareFantasyDates(a: FantasyDate, b: FantasyDate): number {
  if (a.year !== b.year)   return a.year  - b.year;
  if (a.month !== b.month) return a.month - b.month;
  return a.day - b.day;
}

// ── Arithmetic ────────────────────────────────────────────────────────────────

const DAYS_PER_MONTH = 30; // Standard fantasy approximation

/**
 * Convert a FantasyDate to a plain integer (day-count from year 0) for
 * arithmetic and positioning calculations.
 */
export function toAbsoluteDays(d: FantasyDate): number {
  return d.year * 360 + (d.month - 1) * DAYS_PER_MONTH + d.day;
}

/**
 * Create a FantasyDate from an absolute day count.
 */
export function fromAbsoluteDays(days: number, raw = ''): FantasyDate {
  const year  = Math.floor(days / 360);
  const rem   = days % 360;
  const month = Math.floor(rem / DAYS_PER_MONTH) + 1;
  const day   = (rem % DAYS_PER_MONTH) + 1;
  return { year, month, day, raw };
}

/**
 * Add a number of days to a FantasyDate.
 */
export function addFantasyDays(d: FantasyDate, days: number): FantasyDate {
  return fromAbsoluteDays(toAbsoluteDays(d) + days, d.raw);
}

/**
 * Difference between two FantasyDates in days (b - a).
 */
export function dateDifference(a: FantasyDate, b: FantasyDate): number {
  return toAbsoluteDays(b) - toAbsoluteDays(a);
}

// ── Normalisation ─────────────────────────────────────────────────────────────

/**
 * Ensure day and month are within plausible ranges.
 */
export function normalizeDate(d: FantasyDate): FantasyDate {
  let { year, month, day } = d;
  day   = Math.max(1, day);
  month = Math.max(1, month);
  if (day > DAYS_PER_MONTH) {
    month += Math.floor((day - 1) / DAYS_PER_MONTH);
    day    = ((day - 1) % DAYS_PER_MONTH) + 1;
  }
  if (month > 12) {
    year  += Math.floor((month - 1) / 12);
    month  = ((month - 1) % 12) + 1;
  }
  return { ...d, year, month, day };
}

// ── Display ───────────────────────────────────────────────────────────────────

/**
 * Convert a FantasyDate to a human-readable display string.
 * Preserves the original raw string when available.
 */
export function convertToDisplayString(d: FantasyDate): string {
  if (d.raw) return d.raw;
  const monthStr = d.monthName ?? `Month ${d.month}`;
  const eraStr   = d.era ? ` ${d.era}` : '';
  return `${d.day} ${monthStr}, Year ${d.year}${eraStr}`;
}

/**
 * Short display string for compact timeline labels.
 */
export function toShortDisplay(d: FantasyDate): string {
  const m = d.monthName ? d.monthName.slice(0, 3) : `M${d.month}`;
  return `${d.day} ${m} ${d.year}`;
}
