import { useState, useEffect, useCallback } from 'react';
import { Icon }  from '../../../components/ui/Icon';
import { atlas } from '../../../bridge/atlas';
import type { Encounter, EncounterMonster, EncounterMini, OwnedMini, MiniMatchSuggestion } from '../../../types/encounter';
import styles from '../EncounterDetail.module.css';
import miniStyles from './EncounterMinisTab.module.css';

interface Props {
  encounter:  Encounter;
  monsters:   EncounterMonster[];
  minis:      EncounterMini[];
  campaignId: string;
  onChanged:  () => void;
}

/**
 * Client-side mirror of EncountersService.suggestMiniMatches — the renderer
 * talks to the database directly (see ui/src/bridge/atlas.ts), so this
 * reproduces the same priority order documented in modules/encounters:
 *   1. Exact miniature matches (mini linked to this monsterId via mini_monsters)
 *   2. Same creature type (mini tagged with the monster's creature_type)
 *   3. Tagged proxies (mini tagged "proxy")
 *   4. Missing — left for manual assignment
 */
function buildSuggestions(monsters: EncounterMonster[], owned: OwnedMini[]): MiniMatchSuggestion[] {
  return monsters.map(m => {
    const exactMatches = owned
      .filter(o => o.monsterIds.includes(m.monsterId) && o.quantity > 0)
      .map(o => ({ miniId: o.miniId, name: o.name, available: o.quantity }));
    const exactIds = new Set(exactMatches.map(o => o.miniId));

    const typeMatches = owned
      .filter(o => !exactIds.has(o.miniId) && o.quantity > 0 &&
        !!m.creatureType && o.tags.some(t => t.toLowerCase() === m.creatureType!.toLowerCase()))
      .map(o => ({ miniId: o.miniId, name: o.name, available: o.quantity }));
    const matchedIds = new Set([...exactIds, ...typeMatches.map(o => o.miniId)]);

    const taggedProxies = owned
      .filter(o => !matchedIds.has(o.miniId) && o.quantity > 0 && o.tags.some(t => t.toLowerCase() === 'proxy'))
      .map(o => ({ miniId: o.miniId, name: o.name, available: o.quantity }));

    const totalAvailable = exactMatches.reduce((n, x) => n + x.available, 0) + typeMatches.reduce((n, x) => n + x.available, 0);
    const missingCount = Math.max(0, m.quantity - totalAvailable);

    return {
      encounterMonsterId: m.id, monsterId: m.monsterId, monsterName: m.customName || m.monsterName || m.monsterId,
      quantityNeeded: m.quantity, exactMatches, taggedProxies, fullySupported: missingCount === 0, missingCount,
    };
  });
}

export function EncounterMinisTab({ encounter, monsters, minis, campaignId, onChanged }: Props) {
  const [owned,   setOwned]   = useState<OwnedMini[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy,    setBusy]    = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const loadOwned = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [miniRows, linkRows] = await Promise.all([
        atlas.db.query<Record<string, unknown>>(
          'SELECT id, name, quantity, tags FROM minis WHERE campaign_id = ? ORDER BY name ASC',
          [campaignId],
        ),
        atlas.db.query<{ mini_id: string; monster_id: string }>(
          `SELECT mm.mini_id, mm.monster_id FROM mini_monsters mm
             JOIN minis mn ON mn.id = mm.mini_id WHERE mn.campaign_id = ?`,
          [campaignId],
        ),
      ]);
      const monstersByMini = new Map<string, string[]>();
      for (const link of linkRows) {
        const list = monstersByMini.get(link.mini_id) ?? [];
        list.push(link.monster_id);
        monstersByMini.set(link.mini_id, list);
      }
      setOwned(miniRows.map(r => ({
        miniId: r['id'] as string, name: r['name'] as string, quantity: r['quantity'] as number,
        tags: JSON.parse(r['tags'] as string ?? '[]'), monsterIds: monstersByMini.get(r['id'] as string) ?? [],
      })));
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally     { setLoading(false); }
  }, [campaignId]);

  useEffect(() => { loadOwned(); }, [loadOwned]);

  const suggestions = buildSuggestions(monsters, owned);

  async function autoAssign() {
    setBusy(true); setError(null);
    try {
      // Clear existing assignments for this encounter, then re-derive them
      // following the priority order, consuming owned quantities as we go
      // so the same physical mini isn't double-booked across creatures.
      await atlas.db.run('DELETE FROM encounter_minis WHERE encounter_id = ?', [encounter.id]);
      const remaining = new Map(owned.map(o => [o.miniId, o.quantity]));

      for (const s of suggestions) {
        let needed = s.quantityNeeded;
        for (const pool of [s.exactMatches, s.taggedProxies]) {
          for (const candidate of pool) {
            if (needed <= 0) break;
            const available = remaining.get(candidate.miniId) ?? 0;
            if (available <= 0) continue;
            const take = Math.min(available, needed);
            const assignment = pool === s.exactMatches ? 'exact' : 'proxy';
            await atlas.db.run(
              `INSERT INTO encounter_minis (id, encounter_id, encounter_monster_id, mini_id, quantity, assignment)
               VALUES (?, ?, ?, ?, ?, ?)`,
              [crypto.randomUUID(), encounter.id, s.encounterMonsterId, candidate.miniId, take, assignment],
            );
            remaining.set(candidate.miniId, available - take);
            needed -= take;
          }
        }
        if (needed > 0) {
          await atlas.db.run(
            `INSERT INTO encounter_minis (id, encounter_id, encounter_monster_id, quantity, assignment)
             VALUES (?, ?, ?, ?, 'missing')`,
            [crypto.randomUUID(), encounter.id, s.encounterMonsterId, needed],
          );
        }
      }
      onChanged();
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally     { setBusy(false); }
  }

  async function clearAssignments() {
    await atlas.db.run('DELETE FROM encounter_minis WHERE encounter_id = ?', [encounter.id]);
    onChanged();
  }

  const minisFor = (encounterMonsterId: string) => minis.filter(m => m.encounterMonsterId === encounterMonsterId);

  if (monsters.length === 0) return (
    <div className={styles.section}>
      <p>Add creatures to the Enemy Roster tab first — miniature matching works from the roster.</p>
    </div>
  );

  return (
    <div className={miniStyles.wrap}>
      {error && <div className={styles.errorBar}>{error}</div>}
      <div className={miniStyles.toolbar}>
        <button className={styles.saveBtn} onClick={autoAssign} disabled={busy || loading}>
          <Icon name="sparkles" size={14}/> {busy ? 'Assigning…' : 'Auto Assign Minis'}
        </button>
        <button className={miniStyles.clearBtn} onClick={clearAssignments} disabled={busy}>Clear Assignments</button>
      </div>

      <ul className={miniStyles.list}>
        {suggestions.map(s => {
          const assigned = minisFor(s.encounterMonsterId);
          return (
            <li key={s.encounterMonsterId} className={miniStyles.row}>
              <div className={miniStyles.rowHead}>
                <span className={miniStyles.rowName}>{s.monsterName}</span>
                <span className={`${miniStyles.status} ${s.fullySupported ? miniStyles.ok : miniStyles.warn}`}>
                  {s.fullySupported ? '✓ Fully supported' : `${s.missingCount} missing`}
                </span>
              </div>
              {assigned.length > 0 ? (
                <div className={miniStyles.assignedList}>
                  {assigned.map(a => (
                    <span key={a.id} className={`${miniStyles.chip} ${miniStyles[`chip_${a.assignment}`]}`}>
                      {a.assignment === 'missing' ? `${a.quantity}× missing` : `${a.quantity}× ${a.miniName ?? a.miniId} (${a.assignment})`}
                    </span>
                  ))}
                </div>
              ) : (
                <p className={miniStyles.hint}>
                  {s.exactMatches.length + s.taggedProxies.length > 0
                    ? 'Suggestions available — run Auto Assign Minis to apply them.'
                    : 'No owned minis match this creature yet.'}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
