import { useState, useEffect } from 'react';
import { atlas } from '../../../bridge/atlas';
import type { Encounter } from '../../../types/encounter';
import styles from '../EncounterDetail.module.css';

interface Props { encounter: Encounter; onSaved: () => void; }

export function EncounterNotesTab({ encounter, onSaved }: Props) {
  const [notes,  setNotes]  = useState(encounter.notes);
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);

  useEffect(() => { setNotes(encounter.notes); setSaved(false); }, [encounter.id]);

  async function handleSave() {
    setSaving(true); setSaved(false);
    const now = new Date().toISOString();
    await atlas.db.run('UPDATE encounters SET notes=?, updated_at=? WHERE id=?', [notes, now, encounter.id]);
    setSaving(false); setSaved(true);
    onSaved();
  }

  return (
    <div className={styles.form}>
      <div className={styles.field}>
        <label className={styles.fieldLabel}>GM Notes</label>
        <textarea className={`${styles.input} ${styles.textarea}`} rows={12} value={notes}
          placeholder="Free-form running notes — tactics, contingencies, reminders for the table…"
          onChange={e => setNotes(e.target.value)} />
      </div>
      <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
        {saving ? 'Saving…' : 'Save Notes'}
      </button>
      {saved && !saving && <span className={styles.savedHint}>✓ Saved</span>}
    </div>
  );
}
