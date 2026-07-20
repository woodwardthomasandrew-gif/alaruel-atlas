import { useState, useEffect, useMemo } from 'react';
import { atlas } from '../../../bridge/atlas';
import type { Encounter, EncounterType, EncounterDifficulty, EncounterStatus, EncounterMonster } from '../../../types/encounter';
import { calculateEncounterDifficulty } from '../../../../../shared/src/utils/encounterDifficulty';
import styles from '../EncounterDetail.module.css';

const TYPES: EncounterType[] = ['combat', 'social', 'exploration', 'skill_challenge', 'boss', 'airship'];
const DIFFICULTIES: EncounterDifficulty[] = ['trivial', 'easy', 'moderate', 'hard', 'deadly'];
const STATUSES: EncounterStatus[] = ['planned', 'ready', 'run', 'archived'];

interface Props { encounter: Encounter; monsters: EncounterMonster[]; campaignId: string; onSaved: () => void; }

export function EncounterOverviewTab({ encounter, monsters, onSaved }: Props) {
  const [form, setForm] = useState({
    name: encounter.name, description: encounter.description, encounterType: encounter.encounterType,
    status: encounter.status, difficulty: encounter.difficulty, location: encounter.location,
    sessionNumber: encounter.sessionNumber ?? '', tags: encounter.tags.join(', '),
    partyLevel: encounter.partyLevel ?? '', partySize: encounter.partySize ?? '',
    airshipPresent: encounter.airshipPresent,
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
      partyLevel: encounter.partyLevel ?? '', partySize: encounter.partySize ?? '',
      airshipPresent: encounter.airshipPresent,
      partyNotes: encounter.partyNotes,
    });
    setSaved(false);
  }, [encounter.id]);

  const estimate = useMemo(() => calculateEncounterDifficulty({
    partyLevel: Number(form.partyLevel) || 1,
    partySize: Number(form.partySize) || 4,
    monsters: monsters.map(m => ({ challengeRating: m.challengeRating, quantity: m.quantity })),
    terrainModifierIds: encounter.terrainModifierIds,
  }), [form.partyLevel, form.partySize, monsters, encounter.terrainModifierIds]);

  async function handleSave() {
    setSaving(true); setError(null); setSaved(false);
    try {
      const now = new Date().toISOString();
      const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean);
      await atlas.db.run(
        `UPDATE encounters SET
           name=?, description=?, encounter_type=?, status=?, difficulty=?, location=?,
           session_number=?, tags=?, party_level=?, party_size=?, airship_present=?, party_notes=?, updated_at=?
         WHERE id=?`,
        [
          form.name.trim(), form.description, form.encounterType, form.status, form.difficulty,
          form.location.trim(), form.sessionNumber === '' ? null : Number(form.sessionNumber),
          JSON.stringify(tags), form.partyLevel === '' ? null : Number(form.partyLevel),
          form.partySize === '' ? null : Number(form.partySize),
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
          {field('Party Level', <input className={styles.input} type="number" min={1} max={20} value={form.partyLevel}
            onChange={e => setForm(f => ({ ...f, partyLevel: e.target.value }))} />)}
          {field('Party Size', <input className={styles.input} type="number" min={1} value={form.partySize}
            onChange={e => setForm(f => ({ ...f, partySize: e.target.value }))} />)}
          <label className={styles.checkboxRow} style={{ marginTop: '1.4rem' }}>
            <input type="checkbox" checked={form.airshipPresent}
              onChange={e => setForm(f => ({ ...f, airshipPresent: e.target.checked }))} />
            Airship present
          </label>
        </div>
        {field('Party Notes', <textarea className={`${styles.input} ${styles.textarea}`} rows={3}
          value={form.partyNotes} onChange={e => setForm(f => ({ ...f, partyNotes: e.target.value }))} />)}
      </div>

      <div className={styles.section}>
        <span className={styles.sectionTitle}>Difficulty Estimate</span>
        <div className={styles.diffEstimateBox}>
          <div className={styles.diffEstimateHeader}>
            <span className={`${styles.diffTierBadge} ${styles[`tier_${estimate.tier}`]}`}>{estimate.tier}</span>
            <span className={styles.diffEstimateXp}>{estimate.adjustedXp.toLocaleString()} adjusted XP</span>
          </div>
          <div className={styles.diffEstimateBreakdown}>
            <span>{estimate.monsterCount} creature{estimate.monsterCount === 1 ? '' : 's'} · {estimate.baseMonsterXp.toLocaleString()} base XP</span>
            <span>× {estimate.countMultiplier} count multiplier</span>
            <span>× {estimate.terrainMultiplier.toFixed(2)} terrain multiplier{estimate.appliedTerrainModifiers.length > 0 ? ` (${estimate.appliedTerrainModifiers.map(m => m.label).join(', ')})` : ''}</span>
          </div>
          <div className={styles.diffEstimateThresholds}>
            <span>Easy {estimate.thresholds.easy.toLocaleString()}</span>
            <span>Moderate {estimate.thresholds.medium.toLocaleString()}</span>
            <span>Hard {estimate.thresholds.hard.toLocaleString()}</span>
            <span>Deadly {estimate.thresholds.deadly.toLocaleString()}</span>
          </div>
          {estimate.tier !== form.difficulty && (
            <button type="button" className={styles.diffApplyBtn}
              onClick={() => setForm(f => ({ ...f, difficulty: estimate.tier }))}>
              Use estimate ({estimate.tier}) as difficulty
            </button>
          )}
        </div>
        <p className={styles.diffEstimateHint}>
          Terrain modifiers are set on the Map &amp; Terrain tab. Combining a CR/XP budget with the
          selected terrain gives an estimate — always sanity-check against your table.
        </p>
      </div>

      <button className={styles.saveBtn} onClick={handleSave} disabled={saving || !form.name.trim()}>
        {saving ? 'Saving…' : 'Save Overview'}
      </button>
      {saved && !saving && <span className={styles.savedHint}>✓ Saved</span>}
    </div>
  );
}
