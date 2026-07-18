import { useState, useEffect } from 'react';
import { atlas } from '../../../bridge/atlas';
import type { Encounter } from '../../../types/encounter';
import styles from '../EncounterDetail.module.css';

interface Props { encounter: Encounter; onSaved: () => void; }

export function EncounterRewardsTab({ encounter, onSaved }: Props) {
  const [form, setForm] = useState({
    loot: encounter.loot, xpAward: encounter.xpAward ?? '', storyRewards: encounter.storyRewards,
    reputationRewards: encounter.reputationRewards, rewardNotes: encounter.rewardNotes,
  });
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);

  useEffect(() => {
    setForm({
      loot: encounter.loot, xpAward: encounter.xpAward ?? '', storyRewards: encounter.storyRewards,
      reputationRewards: encounter.reputationRewards, rewardNotes: encounter.rewardNotes,
    });
    setSaved(false);
  }, [encounter.id]);

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
    </div>
  );
}
