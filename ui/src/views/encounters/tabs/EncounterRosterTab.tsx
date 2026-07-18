import { useState, useEffect } from 'react';
import { Icon }  from '../../../components/ui/Icon';
import { atlas } from '../../../bridge/atlas';
import type { Encounter, EncounterMonster } from '../../../types/encounter';
import styles from '../EncounterDetail.module.css';
import rosterStyles from './EncounterRosterTab.module.css';

interface Props {
  encounter:  Encounter;
  monsters:   EncounterMonster[];
  campaignId: string;
  onChanged:  () => void;
}

interface BestiaryHit { id: string; name: string; creature_type: string; challenge_rating: string; }

export function EncounterRosterTab({ encounter, monsters, campaignId, onChanged }: Props) {
  const [search,  setSearch]  = useState('');
  const [results, setResults] = useState<BestiaryHit[]>([]);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!search.trim()) { setResults([]); return; }
    (async () => {
      try {
        const rows = await atlas.db.query<BestiaryHit>(
          `SELECT id, name, creature_type, challenge_rating FROM monsters
            WHERE campaign_id = ? AND name LIKE ? ORDER BY name ASC LIMIT 12`,
          [campaignId, `%${search.trim()}%`],
        );
        if (!cancelled) setResults(rows);
      } catch (e) { if (!cancelled) setError(e instanceof Error ? e.message : String(e)); }
    })();
    return () => { cancelled = true; };
  }, [search, campaignId]);

  async function addMonster(hit: BestiaryHit) {
    setError(null);
    try {
      const id = crypto.randomUUID();
      const sortOrder = monsters.length;
      await atlas.db.run(
        `INSERT INTO encounter_monsters (id, encounter_id, monster_id, quantity, sort_order)
         VALUES (?, ?, ?, 1, ?)`,
        [id, encounter.id, hit.id, sortOrder],
      );
      setSearch(''); setResults([]);
      onChanged();
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
  }

  async function updateEntry(id: string, patch: Partial<Pick<EncounterMonster, 'quantity' | 'customName' | 'groupLabel' | 'notes'>>) {
    const sets: string[] = []; const params: (string | number | null)[] = [];
    if (patch.quantity   !== undefined) { sets.push('quantity = ?');    params.push(patch.quantity); }
    if (patch.customName !== undefined) { sets.push('custom_name = ?'); params.push(patch.customName || null); }
    if (patch.groupLabel !== undefined) { sets.push('group_label = ?'); params.push(patch.groupLabel || null); }
    if (patch.notes      !== undefined) { sets.push('notes = ?');       params.push(patch.notes || null); }
    if (sets.length === 0) return;
    params.push(id);
    await atlas.db.run(`UPDATE encounter_monsters SET ${sets.join(', ')} WHERE id = ?`, params);
    onChanged();
  }

  async function removeEntry(id: string) {
    await atlas.db.run('DELETE FROM encounter_monsters WHERE id = ?', [id]);
    // Any minis assigned to this roster line become orphaned assignments; clear them.
    await atlas.db.run('DELETE FROM encounter_minis WHERE encounter_monster_id = ?', [id]);
    onChanged();
  }

  const totalCreatures = monsters.reduce((n, m) => n + m.quantity, 0);

  return (
    <div className={rosterStyles.wrap}>
      <div className={styles.section}>
        <span className={styles.sectionTitle}>Add Creature</span>
        <input className={styles.input} placeholder="Search the bestiary…" value={search}
          onChange={e => setSearch(e.target.value)} />
        {error && <div className={styles.errorBar}>{error}</div>}
        {results.length > 0 && (
          <ul className={rosterStyles.searchResults}>
            {results.map(r => (
              <li key={r.id}>
                <button className={rosterStyles.searchItem} onClick={() => addMonster(r)}>
                  <span>{r.name}</span>
                  <span className={rosterStyles.searchMeta}>{r.creature_type} · CR {r.challenge_rating}</span>
                  <Icon name="plus" size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={styles.section}>
        <span className={styles.sectionTitle}>Roster ({monsters.length} entries · {totalCreatures} creatures)</span>
        {monsters.length === 0 ? (
          <p>No creatures added yet. Search the bestiary above to build the roster.</p>
        ) : (
          <ul className={rosterStyles.list}>
            {monsters.map(m => (
              <li key={m.id} className={rosterStyles.row}>
                <div className={rosterStyles.rowMain}>
                  <span className={rosterStyles.rowName}>{m.customName || m.monsterName || m.monsterId}</span>
                  <span className={rosterStyles.rowMeta}>{m.creatureType} · CR {m.challengeRating}</span>
                </div>
                <input className={rosterStyles.qtyInput} type="number" min={1} value={m.quantity}
                  onChange={e => updateEntry(m.id, { quantity: Math.max(1, Number(e.target.value)) })} />
                <input className={rosterStyles.groupInput} placeholder="Group label" value={m.groupLabel ?? ''}
                  onChange={e => updateEntry(m.id, { groupLabel: e.target.value })} />
                <button className={styles.iconBtn} onClick={() => removeEntry(m.id)} title="Remove">
                  <Icon name="trash" size={14}/>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
