import { useState, useEffect } from 'react';
import { Icon }  from '../../../components/ui/Icon';
import { atlas } from '../../../bridge/atlas';
import type { Encounter, EncounterItem } from '../../../types/encounter';
import styles from '../EncounterDetail.module.css';
import rosterStyles from './EncounterRosterTab.module.css';

interface Props {
  encounter:  Encounter;
  items:      EncounterItem[];
  campaignId: string;
  onSaved:    () => void;
}

interface MagicItemHit { id: string; name: string; item_type: string; rarity: string; }

export function EncounterRewardsTab({ encounter, items, campaignId, onSaved }: Props) {
  const [form, setForm] = useState({
    loot: encounter.loot, xpAward: encounter.xpAward ?? '', storyRewards: encounter.storyRewards,
    reputationRewards: encounter.reputationRewards, rewardNotes: encounter.rewardNotes,
  });
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);

  const [search,  setSearch]  = useState('');
  const [results, setResults] = useState<MagicItemHit[]>([]);
  const [itemError, setItemError] = useState<string | null>(null);

  useEffect(() => {
    setForm({
      loot: encounter.loot, xpAward: encounter.xpAward ?? '', storyRewards: encounter.storyRewards,
      reputationRewards: encounter.reputationRewards, rewardNotes: encounter.rewardNotes,
    });
    setSaved(false);
  }, [encounter.id]);

  useEffect(() => {
    let cancelled = false;
    if (!search.trim()) { setResults([]); return; }
    (async () => {
      try {
        const rows = await atlas.db.query<MagicItemHit>(
          `SELECT id, name, item_type, rarity FROM magic_items
            WHERE campaign_id = ? AND name LIKE ? ORDER BY name ASC LIMIT 12`,
          [campaignId, `%${search.trim()}%`],
        );
        if (!cancelled) setResults(rows);
      } catch (e) { if (!cancelled) setItemError(e instanceof Error ? e.message : String(e)); }
    })();
    return () => { cancelled = true; };
  }, [search, campaignId]);

  async function handleSave() {
    setSaving(true); setSaved(false);
    const now = new Date().toISOString();
    await atlas.db.run(
      `UPDATE encounters SET loot=?, xp_award=?, story_rewards=?, reputation_rewards=?, reward_notes=?, updated_at=? WHERE id=?`,
      [form.loot, form.xpAward === '' ? null : Number(form.xpAward), form.storyRewards,
       form.reputationRewards, form.rewardNotes, now, encounter.id],
    );
    setSaving(false); setSaved(true);
    onSaved();
  }

  async function addItem(hit: MagicItemHit) {
    setItemError(null);
    try {
      const id = crypto.randomUUID();
      const sortOrder = items.length;
      await atlas.db.run(
        `INSERT INTO encounter_items (id, encounter_id, item_id, quantity, sort_order)
         VALUES (?, ?, ?, 1, ?)`,
        [id, encounter.id, hit.id, sortOrder],
      );
      setSearch(''); setResults([]);
      onSaved();
    } catch (e) { setItemError(e instanceof Error ? e.message : String(e)); }
  }

  async function updateItemEntry(id: string, patch: Partial<Pick<EncounterItem, 'quantity' | 'customName' | 'notes'>>) {
    const sets: string[] = []; const params: (string | number | null)[] = [];
    if (patch.quantity   !== undefined) { sets.push('quantity = ?');    params.push(patch.quantity); }
    if (patch.customName !== undefined) { sets.push('custom_name = ?'); params.push(patch.customName || null); }
    if (patch.notes      !== undefined) { sets.push('notes = ?');       params.push(patch.notes || null); }
    if (sets.length === 0) return;
    params.push(id);
    await atlas.db.run(`UPDATE encounter_items SET ${sets.join(', ')} WHERE id = ?`, params);
    onSaved();
  }

  async function removeItemEntry(id: string) {
    await atlas.db.run('DELETE FROM encounter_items WHERE id = ?', [id]);
    onSaved();
  }

  const field = (label: string, el: React.ReactNode) => (
    <div className={styles.field}><label className={styles.fieldLabel}>{label}</label>{el}</div>
  );

  return (
    <div className={styles.form}>
      {field('XP Award', <input className={styles.input} type="number" value={form.xpAward}
        onChange={e => setForm(f => ({ ...f, xpAward: e.target.value }))} />)}
      {field('Loot', <textarea className={`${styles.input} ${styles.textarea}`} rows={3} value={form.loot}
        placeholder="Gold, items, and treasure dropped by this encounter…"
        onChange={e => setForm(f => ({ ...f, loot: e.target.value }))} />)}
      {field('Story Rewards', <textarea className={`${styles.input} ${styles.textarea}`} rows={3} value={form.storyRewards}
        placeholder="Plot advancement, revelations, quest unlocks…"
        onChange={e => setForm(f => ({ ...f, storyRewards: e.target.value }))} />)}
      {field('Reputation Rewards', <textarea className={`${styles.input} ${styles.textarea}`} rows={2} value={form.reputationRewards}
        placeholder="Faction standing changes…"
        onChange={e => setForm(f => ({ ...f, reputationRewards: e.target.value }))} />)}
      {field('Notes', <textarea className={`${styles.input} ${styles.textarea}`} rows={2} value={form.rewardNotes}
        onChange={e => setForm(f => ({ ...f, rewardNotes: e.target.value }))} />)}
      <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
        {saving ? 'Saving…' : 'Save Rewards'}
      </button>
      {saved && !saving && <span className={styles.savedHint}>✓ Saved</span>}

      <div className={rosterStyles.wrap} style={{ marginTop: '.5rem' }}>
        <div className={styles.section}>
          <span className={styles.sectionTitle}>Add Reward Item Card</span>
          <input className={styles.input} placeholder="Search magic items…" value={search}
            onChange={e => setSearch(e.target.value)} />
          {itemError && <div className={styles.errorBar}>{itemError}</div>}
          {results.length > 0 && (
            <ul className={rosterStyles.searchResults}>
              {results.map(r => (
                <li key={r.id}>
                  <button className={rosterStyles.searchItem} onClick={() => addItem(r)}>
                    <span>{r.name}</span>
                    <span className={rosterStyles.searchMeta}>{r.item_type} · {r.rarity}</span>
                    <Icon name="plus" size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={styles.section}>
          <span className={styles.sectionTitle}>Item Cards ({items.length})</span>
          {items.length === 0 ? (
            <p>No reward items added yet. Search the magic item collection above — items appear as
              printable cards alongside the monster cards.</p>
          ) : (
            <ul className={rosterStyles.list}>
              {items.map(it => (
                <li key={it.id} className={rosterStyles.row}>
                  <div className={rosterStyles.rowMain}>
                    <span className={rosterStyles.rowName}>{it.customName || it.itemName || it.itemId}</span>
                    <span className={rosterStyles.rowMeta}>{it.itemType} · {it.rarity}{it.requiresAttunement ? ' · attunement' : ''}</span>
                  </div>
                  <input className={rosterStyles.qtyInput} type="number" min={1} value={it.quantity}
                    onChange={e => updateItemEntry(it.id, { quantity: Math.max(1, Number(e.target.value)) })} />
                  <input className={rosterStyles.groupInput} placeholder="Notes (who gets it, etc.)" value={it.notes ?? ''}
                    onChange={e => updateItemEntry(it.id, { notes: e.target.value })} />
                  <button className={styles.iconBtn} onClick={() => removeItemEntry(it.id)} title="Remove">
                    <Icon name="trash" size={14}/>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
