import { useState, useEffect } from 'react';
import { atlas } from '../../../bridge/atlas';
import type { Encounter } from '../../../types/encounter';
import styles from '../EncounterDetail.module.css';

interface Props { encounter: Encounter; onSaved: () => void; }

export function EncounterMapTab({ encounter, onSaved }: Props) {
  const [form, setForm] = useState({ mapNotes: encounter.mapNotes, terrainNotes: encounter.terrainNotes });
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);

  useEffect(() => {
    setForm({ mapNotes: encounter.mapNotes, terrainNotes: encounter.terrainNotes });
    setSaved(false);
  }, [encounter.id]);

  async function handleSave() {
    setSaving(true); setSaved(false);
    const now = new Date().toISOString();
    await atlas.db.run('UPDATE encounters SET map_notes=?, terrain_notes=?, updated_at=? WHERE id=?',
      [form.mapNotes, form.terrainNotes, now, encounter.id]);
    setSaving(false); setSaved(true);
    onSaved();
  }

  return (
    <div className={styles.form}>
      <div className={styles.field}>
        <label className={styles.fieldLabel}>Linked Battle Map</label>
        <p>
          Battle map assets are managed from the Assets module; this tab notes the encounter&rsquo;s
          layout while a dedicated map picker is being built.
        </p>
      </div>
      <div className={styles.field}>
        <label className={styles.fieldLabel}>Encounter Layout Notes</label>
        <textarea className={`${styles.input} ${styles.textarea}`} rows={5} value={form.mapNotes}
          placeholder="Room dimensions, chokepoints, cover, elevation…"
          onChange={e => setForm(f => ({ ...f, mapNotes: e.target.value }))} />
      </div>
      <div className={styles.field}>
        <label className={styles.fieldLabel}>Terrain Notes</label>
        <textarea className={`${styles.input} ${styles.textarea}`} rows={5} value={form.terrainNotes}
          placeholder="Difficult terrain, hazards, lighting…"
          onChange={e => setForm(f => ({ ...f, terrainNotes: e.target.value }))} />
      </div>
      <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
        {saving ? 'Saving…' : 'Save Map & Terrain'}
      </button>
      {saved && !saving && <span className={styles.savedHint}>✓ Saved</span>}
    </div>
  );
}
