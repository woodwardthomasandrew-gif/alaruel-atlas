import { useState, useEffect } from 'react';
import { atlas } from '../../../bridge/atlas';
import type { Encounter, EncounterType, EncounterDifficulty, EncounterStatus } from '../../../types/encounter';
import styles from '../EncounterDetail.module.css';

const TYPES: EncounterType[] = ['combat', 'social', 'exploration', 'skill_challenge', 'boss', 'airship'];
const DIFFICULTIES: EncounterDifficulty[] = ['trivial', 'easy', 'moderate', 'hard', 'deadly'];
const STATUSES: EncounterStatus[] = ['planned', 'ready', 'run', 'archived'];

interface Props { encounter: Encounter; campaignId: string; onSaved: () => void; }

export function EncounterOverviewTab({ encounter, onSaved }: Props) {
  const [form, setForm] = useState({
    name: encounter.name, description: encounter.description, encounterType: encounter.encounterType,
    status: encounter.status, difficulty: encounter.difficulty, location: encounter.location,
    sessionNumber: encounter.sessionNumber ?? '', tags: encounter.tags.join(', '),
    partyLevel: encounter.partyLevel ?? '', airshipPresent: encounter.airshipPresent,
    partyNotes: encounter.partyNotes,
  });
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [error,  setError]  = useState<string | null>(null);

  useEffect(() => {
    setForm({
      name: encounter.name, description: encounter.description, encounterType: encounter.encounterType,
      status: encounter.status, difficulty: encounter.difficulty, location: encounter.location,
      sessionNumber: encounter.sessionNumber ?? '', tags: encounter.tags.join(', '),
      partyLevel: encounter.partyLevel ?? '', airshipPresent: encounter.airshipPresent,
      partyNotes: encounter.partyNotes,
    });
    setSaved(false);
  }, [encounter.id]);

  async function handleSave() {
    setSaving(true); setError(null); setSaved(false);
    try {
      const now = new Date().toISOString();
      const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean);
      await atlas.db.run(
        `UPDATE encounters SET
           name=?, description=?, encounter_type=?, status=?, difficulty=?, location=?,
           session_number=?, tags=?, party_level=?, airship_present=?, party_notes=?, updated_at=?
         WHERE id=?`,
        [
          form.name.trim(), form.description, form.encounterType, form.status, form.difficulty,
          form.location.trim(), form.sessionNumber === '' ? null : Number(form.sessionNumber),
          JSON.stringify(tags), form.partyLevel === '' ? null : Number(form.partyLevel),
          form.airshipPresent ? 1 : 0, form.partyNotes, now, encounter.id,
        ],
      );
      setSaved(true);
      onSaved();
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally     { setSaving(false); }
  }

  const field = (label: string, el: React.ReactNode) => (
    <div className={styles.field}><label className={styles.fieldLabel}>{label}</label>{el}</div>
  );

  return (
    <div className={styles.form}>
      {error && <div className={styles.errorBar}>{error}</div>}

      {field('Name', <input className={styles.input} value={form.name}
        onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />)}

      <div className={styles.row}>
        {field('Type',
          <select className={styles.input} value={form.encounterType}
            onChange={e => setForm(f => ({ ...f, encounterType: e.target.value as EncounterType }))}>
            {TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
          </select>)}
        {field('Status',
          <select className={styles.input} value={form.status}
            onChange={e => setForm(f => ({ ...f, status: e.target.value as EncounterStatus }))}>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>)}
        {field('Difficulty',
          <select className={styles.input} value={form.difficulty}
            onChange={e => setForm(f => ({ ...f, difficulty: e.target.value as EncounterDifficulty }))}>
            {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
          </select>)}
      </div>

      <div className={styles.row}>
        {field('Location', <input className={styles.input} value={form.location}
          onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />)}
        {field('Session #', <input className={styles.input} type="number" value={form.sessionNumber}
          onChange={e => setForm(f => ({ ...f, sessionNumber: e.target.value }))} />)}
      </div>

      {field('Tags (comma separated)', <input className={styles.input} value={form.tags}
        placeholder="ambush, river-crossing…" onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} />)}

      {field('Description', <textarea className={`${styles.input} ${styles.textarea}`} rows={4}
        value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />)}

      <div className={styles.section}>
        <span className={styles.sectionTitle}>Party</span>
        <div className={styles.row}>
          {field('Party Level', <input className={styles.input} type="number" value={form.partyLevel}
            onChange={e => setForm(f => ({ ...f, partyLevel: e.target.value }))} />)}
          <label className={styles.checkboxRow} style={{ marginTop: '1.4rem' }}>
            <input type="checkbox" checked={form.airshipPresent}
              onChange={e => setForm(f => ({ ...f, airshipPresent: e.target.checked }))} />
            Airship present
          </label>
        </div>
        {field('Party Notes', <textarea className={`${styles.input} ${styles.textarea}`} rows={3}
          value={form.partyNotes} onChange={e => setForm(f => ({ ...f, partyNotes: e.target.value }))} />)}
      </div>

      <button className={styles.saveBtn} onClick={handleSave} disabled={saving || !form.name.trim()}>
        {saving ? 'Saving…' : 'Save Overview'}
      </button>
      {saved && !saving && <span className={styles.savedHint}>✓ Saved</span>}
    </div>
  );
}
