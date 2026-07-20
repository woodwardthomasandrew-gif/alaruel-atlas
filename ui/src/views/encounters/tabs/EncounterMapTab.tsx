import { useState, useEffect } from 'react';
import { atlas } from '../../../bridge/atlas';
import type { Encounter } from '../../../types/encounter';
import { TERRAIN_MODIFIERS } from '../../../../../shared/src/utils/encounterDifficulty';
import styles from '../EncounterDetail.module.css';

interface Props { encounter: Encounter; onSaved: () => void; }

export function EncounterMapTab({ encounter, onSaved }: Props) {
  const [form, setForm] = useState({
    mapNotes: encounter.mapNotes,
    terrainNotes: encounter.terrainNotes,
    terrainModifierIds: encounter.terrainModifierIds,
  });
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);

  useEffect(() => {
    setForm({
      mapNotes: encounter.mapNotes,
      terrainNotes: encounter.terrainNotes,
      terrainModifierIds: encounter.terrainModifierIds,
    });
    setSaved(false);
  }, [encounter.id]);

  function toggleModifier(id: string) {
    setForm(f => ({
      ...f,
      terrainModifierIds: f.terrainModifierIds.includes(id)
        ? f.terrainModifierIds.filter(m => m !== id)
        : [...f.terrainModifierIds, id],
    }));
  }

  async function handleSave() {
    setSaving(true); setSaved(false);
    const now = new Date().toISOString();
    await atlas.db.run(
      'UPDATE encounters SET map_notes=?, terrain_notes=?, terrain_modifiers=?, updated_at=? WHERE id=?',
      [form.mapNotes, form.terrainNotes, JSON.stringify(form.terrainModifierIds), now, encounter.id],
    );
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

      <div className={styles.section}>
        <span className={styles.sectionTitle}>Terrain Modifiers (feeds the Difficulty Estimate)</span>
        <div className={styles.terrainGrid}>
          {TERRAIN_MODIFIERS.map(mod => {
            const active = form.terrainModifierIds.includes(mod.id);
            return (
              <div key={mod.id}
                className={`${styles.terrainChip} ${active ? styles.terrainChipActive : ''}`}
                onClick={() => toggleModifier(mod.id)}>
                <span className={styles.terrainChipLabel}>
                  <input type="checkbox" checked={active} onChange={() => toggleModifier(mod.id)}
                    onClick={e => e.stopPropagation()} />
                  {mod.label}
                </span>
                <span className={styles.terrainChipDesc}>{mod.description}</span>
                <span className={styles.terrainChipPercent}>
                  {mod.percent > 0 ? '+' : ''}{mod.percent}% monster effective XP
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
        {saving ? 'Saving…' : 'Save Map & Terrain'}
      </button>
      {saved && !saving && <span className={styles.savedHint}>✓ Saved</span>}
    </div>
  );
}
