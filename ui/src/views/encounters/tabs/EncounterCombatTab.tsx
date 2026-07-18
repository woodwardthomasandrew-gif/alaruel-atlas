import { useState, useEffect } from 'react';
import { Icon }  from '../../../components/ui/Icon';
import { atlas } from '../../../bridge/atlas';
import type { Encounter } from '../../../types/encounter';
import styles from '../EncounterDetail.module.css';
import listStyles from './ListEditor.module.css';

interface Props { encounter: Encounter; onSaved: () => void; }

interface ListFieldProps { label: string; hint: string; items: string[]; onChange: (items: string[]) => void; }

function ListField({ label, hint, items, onChange }: ListFieldProps) {
  const [draft, setDraft] = useState('');
  function add() {
    if (!draft.trim()) return;
    onChange([...items, draft.trim()]);
    setDraft('');
  }
  return (
    <div className={styles.field}>
      <label className={styles.fieldLabel}>{label}</label>
      {items.length > 0 && (
        <ul className={listStyles.list}>
          {items.map((item, i) => (
            <li key={i} className={listStyles.item}>
              <span>{item}</span>
              <button className={listStyles.removeBtn} onClick={() => onChange(items.filter((_, x) => x !== i))}>
                <Icon name="x" size={12}/>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className={listStyles.addRow}>
        <input className={styles.input} placeholder={hint} value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} />
        <button className={listStyles.addBtn} onClick={add}><Icon name="plus" size={14}/></button>
      </div>
    </div>
  );
}

export function EncounterCombatTab({ encounter, onSaved }: Props) {
  const [form, setForm] = useState({
    environmentalEffects: encounter.environmentalEffects, legendaryActions: encounter.legendaryActions,
    lairActions: encounter.lairActions, conditions: encounter.conditions,
  });
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);

  useEffect(() => {
    setForm({
      environmentalEffects: encounter.environmentalEffects, legendaryActions: encounter.legendaryActions,
      lairActions: encounter.lairActions, conditions: encounter.conditions,
    });
    setSaved(false);
  }, [encounter.id]);

  async function handleSave() {
    setSaving(true); setSaved(false);
    const now = new Date().toISOString();
    await atlas.db.run(
      `UPDATE encounters SET environmental_effects=?, legendary_actions=?, lair_actions=?, conditions=?, updated_at=? WHERE id=?`,
      [JSON.stringify(form.environmentalEffects), JSON.stringify(form.legendaryActions),
       JSON.stringify(form.lairActions), JSON.stringify(form.conditions), now, encounter.id],
    );
    setSaving(false); setSaved(true);
    onSaved();
  }

  return (
    <div className={styles.form}>
      <p>
        Initiative order and live HP tracking belong to the Combat Tracker module; this tab holds the
        encounter-specific mechanics that feed it — environmental effects, legendary/lair actions, and
        starting conditions.
      </p>
      <ListField label="Environmental Effects" hint="e.g. Rising tide floods the room each round"
        items={form.environmentalEffects} onChange={v => setForm(f => ({ ...f, environmentalEffects: v }))} />
      <ListField label="Legendary Actions" hint="e.g. Detect — the boss senses invisible creatures"
        items={form.legendaryActions} onChange={v => setForm(f => ({ ...f, legendaryActions: v }))} />
      <ListField label="Lair Actions" hint="e.g. On initiative 20, spikes erupt from the floor"
        items={form.lairActions} onChange={v => setForm(f => ({ ...f, lairActions: v }))} />
      <ListField label="Starting Conditions" hint="e.g. Party is surprised"
        items={form.conditions} onChange={v => setForm(f => ({ ...f, conditions: v }))} />
      <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
        {saving ? 'Saving…' : 'Save Combat Tools'}
      </button>
      {saved && !saving && <span className={styles.savedHint}>✓ Saved</span>}
    </div>
  );
}
