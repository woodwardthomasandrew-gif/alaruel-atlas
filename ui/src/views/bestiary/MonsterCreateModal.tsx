// ui/src/views/bestiary/MonsterCreateModal.tsx
// Minimal "new monster" form — only the fields needed to get started.
// All other fields are edited in the full detail panel.

import { useState } from 'react';
import { atlas }    from '../../bridge/atlas';
import styles       from './MonsterCreateModal.module.css';

const CREATURE_TYPES = [
  'aberration','beast','celestial','construct','dragon','elemental',
  'fey','fiend','giant','humanoid','monstrosity','ooze','plant','undead','custom',
] as const;

const SIZES = ['tiny','small','medium','large','huge','gargantuan'] as const;

const CR_OPTIONS = [
  '0','1/8','1/4','1/2',
  '1','2','3','4','5','6','7','8','9','10',
  '11','12','13','14','15','16','17','18','19','20',
  '21','22','23','24','25','26','27','28','29','30',
];

interface Props {
  campaignId: string;
  onCreated:  (id: string, name: string) => void;
  onClose:    () => void;
}

export function MonsterCreateModal({ campaignId, onCreated, onClose }: Props) {
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState<string | null>(null);
  const [form, setForm] = useState({
    name:           '',
    creatureType:   'monstrosity' as typeof CREATURE_TYPES[number],
    size:           'medium'      as typeof SIZES[number],
    challengeRating:'1',
    armorClass:     '10',
    hitPoints:      '10',
    isHomebrew:     true,
  });

  function set(field: string, value: string | boolean) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleCreate() {
    if (!form.name.trim()) { setError('Name is required.'); return; }
    const ac = parseInt(form.armorClass, 10);
    const hp = parseInt(form.hitPoints,  10);
    if (isNaN(ac) || ac < 0)   { setError('Armour Class must be a non-negative number.'); return; }
    if (isNaN(hp) || hp < 1)   { setError('Hit Points must be at least 1.'); return; }

    setSaving(true);
    setError(null);
    try {
      const id  = crypto.randomUUID();
      const now = new Date().toISOString();
      await atlas.db.run(
        `INSERT INTO monsters (
           id, campaign_id, name, description,
           creature_type, size, alignment,
           armor_class, hit_points, speed,
           str, dex, con, int, wis, cha,
           proficiency_bonus, challenge_rating, xp_value,
           saving_throws, skills,
           damage_vulnerabilities, damage_resistances, damage_immunities, condition_immunities,
           speed_other, traits, actions, reactions, legendary_actions, bonus_actions,
           habitat_location_ids, is_homebrew, tags,
           created_at, updated_at
         ) VALUES (
           ?,?,?,?,
           ?,?,?,
           ?,?,?,
           10,10,10,10,10,10,
           2,?,0,
           '{}','{}',
           '[]','[]','[]','[]',
           '{}','[]','[]','[]','[]','[]',
           '[]',?,?,
           ?,?
         )`,
        [
          id, campaignId, form.name.trim(), '',
          form.creatureType, form.size, 'true neutral',
          ac, hp, 30,
          form.challengeRating,
          form.isHomebrew ? 1 : 0,
          '[]',
          now, now,
        ],
      );
      onCreated(id, form.name.trim());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.modal}>
        <h2 className={styles.title}>New Monster</h2>

        <div className={styles.form}>
          <div className={styles.group}>
            <label className={styles.label}>Name *</label>
            <input
              className={styles.input}
              placeholder="e.g. Shadow Drake"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              autoFocus
              onKeyDown={e => { if (e.key === 'Enter') handleCreate(); }}
            />
          </div>

          <div className={styles.row}>
            <div className={styles.group}>
              <label className={styles.label}>Type</label>
              <select className={styles.select} value={form.creatureType}
                onChange={e => set('creatureType', e.target.value)}>
                {CREATURE_TYPES.map(t => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
            </div>
            <div className={styles.group}>
              <label className={styles.label}>Size</label>
              <select className={styles.select} value={form.size}
                onChange={e => set('size', e.target.value)}>
                {SIZES.map(s => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.group}>
              <label className={styles.label}>Challenge Rating</label>
              <select className={styles.select} value={form.challengeRating}
                onChange={e => set('challengeRating', e.target.value)}>
                {CR_OPTIONS.map(cr => <option key={cr} value={cr}>{cr}</option>)}
              </select>
            </div>
            <div className={styles.group}>
              <label className={styles.label}>Armour Class</label>
              <input className={styles.input} type="number" min={0} max={99}
                value={form.armorClass}
                onChange={e => set('armorClass', e.target.value)} />
            </div>
            <div className={styles.group}>
              <label className={styles.label}>Hit Points</label>
              <input className={styles.input} type="number" min={1} max={999999}
                value={form.hitPoints}
                onChange={e => set('hitPoints', e.target.value)} />
            </div>
          </div>

          <div className={styles.group}>
            <label className={styles.label} style={{ display:'flex', gap:'.5rem', cursor:'pointer' }}>
              <input type="checkbox" checked={form.isHomebrew}
                onChange={e => set('isHomebrew', e.target.checked)} />
              Homebrew monster
            </label>
          </div>

          {error && <div className={styles.error}>{error}</div>}
        </div>

        <div className={styles.footer}>
          <button className={styles.btnCancel} onClick={onClose} disabled={saving}>Cancel</button>
          <button className={styles.btnCreate} onClick={handleCreate} disabled={saving}>
            {saving ? 'Creating…' : 'Create Monster'}
          </button>
        </div>
      </div>
    </div>
  );
}
