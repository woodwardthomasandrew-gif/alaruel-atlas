import { useState } from 'react';
import { Icon }     from '../../components/ui/Icon';
import { atlas }    from '../../bridge/atlas';
import type { Encounter, EncounterType, EncounterDifficulty } from '../../types/encounter';
import styles        from './EncounterCreateModal.module.css';

interface Props { campaignId: string; onCreated: (e: Encounter) => void; onClose: () => void; }

const TYPES: EncounterType[] = ['combat', 'social', 'exploration', 'skill_challenge', 'boss', 'airship'];
const DIFFICULTIES: EncounterDifficulty[] = ['trivial', 'easy', 'moderate', 'hard', 'deadly'];

export function EncounterCreateModal({ campaignId, onCreated, onClose }: Props) {
  const [name,        setName]       = useState('');
  const [type,        setType]       = useState<EncounterType>('combat');
  const [difficulty,  setDifficulty] = useState<EncounterDifficulty>('moderate');
  const [location,    setLocation]   = useState('');
  const [saving,      setSaving]     = useState(false);
  const [error,       setError]      = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true); setError(null);
    try {
      const id  = crypto.randomUUID();
      const now = new Date().toISOString();
      await atlas.db.run(
        `INSERT INTO encounters
           (id, campaign_id, name, description, encounter_type, status, location, difficulty,
            tags, notes, created_at, updated_at)
         VALUES (?, ?, ?, '', ?, 'planned', ?, ?, '[]', '', ?, ?)`,
        [id, campaignId, name.trim(), type, location.trim(), difficulty, now, now],
      );
      onCreated({
        id, name: name.trim(), description: '', encounterType: type, status: 'planned',
        location: location.trim(), difficulty, tags: [], notes: '',
        airshipPresent: false, partyNotes: '', mapNotes: '', terrainNotes: '',
        environmentalEffects: [], legendaryActions: [], lairActions: [], conditions: [],
        loot: '', storyRewards: '', reputationRewards: '', rewardNotes: '',
        createdAt: now, updatedAt: now,
      });
    } catch (err) { setError(err instanceof Error ? err.message : String(err)); setSaving(false); }
  }

  return (
    <div className={styles.backdrop} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <header className={styles.header}>
          <h3>New Encounter</h3>
          <button className={styles.closeBtn} onClick={onClose}><Icon name="x" size={18}/></button>
        </header>
        {error && <div className={styles.errorBar}><Icon name="alert" size={14}/> {error}</div>}
        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.label}>
            Name <span className={styles.required}>*</span>
            <input className={styles.input} autoFocus placeholder="Goblin Ambush at the Ford…" value={name}
              onChange={e => setName(e.target.value)} required />
          </label>
          <div className={styles.row}>
            <label className={styles.label}>
              Type
              <select className={styles.input} value={type} onChange={e => setType(e.target.value as EncounterType)}>
                {TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
              </select>
            </label>
            <label className={styles.label}>
              Difficulty
              <select className={styles.input} value={difficulty} onChange={e => setDifficulty(e.target.value as EncounterDifficulty)}>
                {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </label>
          </div>
          <label className={styles.label}>
            Location
            <input className={styles.input} placeholder="Optional" value={location}
              onChange={e => setLocation(e.target.value)} />
          </label>
          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>Cancel</button>
            <button type="submit" className={styles.submitBtn} disabled={saving || !name.trim()}>
              {saving ? <Icon name="loader" size={15} className={styles.spin}/> : <Icon name="plus" size={15}/>}
              Create Encounter
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
