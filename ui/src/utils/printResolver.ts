// ui/src/utils/printResolver.ts
// Resolves a full PrintableSession from raw DB data.
// No new dependencies — uses only the existing atlas IPC bridge.

import { atlas } from '../bridge/atlas';
import type { PrintableEncounter, PrintableMonster, PrintableSession } from '../types/print';

// ── Raw row shapes ──────────────────────────────────────────────────────────

type RawSession = Record<string, unknown>;
type RawScene   = Record<string, unknown>;

// ── Encounter JSON content shape ────────────────────────────────────────────
// Stored in session_scenes.content as JSON.
// Extended to support an optional monsters array alongside existing fields.

interface EncounterContent {
  type?: string;
  objective?: string;
  setup?: string;
  reward?: string;
  monsters?: Array<{
    name: string;
    quantity?: number;
    statblock?: string;
  }>;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function parseContent(raw: string | null | undefined): EncounterContent {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as EncounterContent;
  } catch {
    // Legacy plain-text fallback — treat whole string as setup notes
    return { setup: raw };
  }
}

function resolveMonsters(content: EncounterContent): PrintableMonster[] {
  if (!content.monsters || !Array.isArray(content.monsters)) return [];
  return content.monsters.map(m => ({
    name:      m.name      ?? 'Unknown',
    quantity:  m.quantity  ?? 1,
    statblock: m.statblock ?? '',
  }));
}

// ── Main resolver ────────────────────────────────────────────────────────────

export async function getPrintableSession(sessionId: string): Promise<PrintableSession> {
  // 1. Load the session row
  const sessions = await atlas.db.query<RawSession>(
    'SELECT * FROM sessions WHERE id = ?',
    [sessionId],
  );
  if (!sessions.length) throw new Error(`Session not found: ${sessionId}`);
  const s = sessions[0];

  // 2. Load all scenes (encounters) ordered by sort_order
  const scenes = await atlas.db.query<RawScene>(
    'SELECT * FROM session_scenes WHERE session_id = ? ORDER BY sort_order ASC',
    [sessionId],
  );

  // 3. Resolve each encounter — parse content JSON, attach monsters
  const encounters: PrintableEncounter[] = scenes.map(row => {
    const content = parseContent(row['content'] as string | null);
    return {
      id:            row['id']           as string,
      title:         row['title']        as string  ?? 'Untitled',
      encounterType: content.type        ?? 'other',
      objective:     content.objective   ?? '',
      setup:         content.setup       ?? '',
      reward:        content.reward      ?? '',
      played:        (row['played']      as number) === 1,
      order:         (row['sort_order']  as number) ?? 0,
      monsters:      resolveMonsters(content),
    };
  });

  // 4. Deduplicate monsters across all encounters by name (case-insensitive).
  //    Quantities are summed for monsters that share a name.
  const monsterMap = new Map<string, PrintableMonster>();
  for (const enc of encounters) {
    for (const m of enc.monsters) {
      const key = m.name.toLowerCase();
      const existing = monsterMap.get(key);
      if (existing) {
        monsterMap.set(key, { ...existing, quantity: existing.quantity + m.quantity });
      } else {
        monsterMap.set(key, { ...m });
      }
    }
  }
  const allMonsters = Array.from(monsterMap.values());

  return {
    id:          s['id']          as string,
    title:       s['name']        as string  ?? 'Unnamed Session',
    summary:     s['summary']     as string  ?? '',
    status:      s['status']      as string  ?? 'draft',
    sessionDate: s['session_date'] as string | null ?? null,
    encounters,
    allMonsters,
  };
}
