import { useState } from 'react';
import { Icon }     from '../../components/ui/Icon';
import { atlas }    from '../../bridge/atlas';
import type { Quest, QuestStatus, QuestType } from '../../types/quest';
import styles       from './QuestCreateModal.module.css';

interface Props { campaignId: string; onCreated: (q: Quest) => void; onClose: () => void; }

export function QuestCreateModal({ campaignId, onCreated, onClose }: Props) {
  const [name,   setName]   = useState('');
  const [type,   setType]   = useState<QuestType>('side');
  const [status, setStatus] = useState<QuestStatus>('hidden');
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true); setError(null);
    try {
      const id  = crypto.randomUUID();
      const now = new Date().toISOString();
      await atlas.db.run(
        `INSERT INTO quests (id,campaign_id,name,description,status,quest_type,priority,tags,created_at,updated_at)
         VALUES (?,?,?,?,?,?,0,'[]',?,?)`,
        [id, campaignId, name.trim(), '', status, type, now, now],
      );
      onCreated({ id, name: name.trim(), description: '', status, questType: type, priority: 0,
        questGiverNpcId: null, involvedNpcIds: [], sponsorFactionId: null, locationIds: [],
        plotThreadId: null, prerequisiteQuestIds: [], unlocksQuestIds: [], sessionIds: [],
        objectives: [], notes: [], tags: [], createdAt: now, updatedAt: now });
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); setSaving(false); }
  }

  return (
    <div className={styles.backdrop} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <header className={styles.header}>
          <h3>New Quest</h3>
          <button className={styles.closeBtn} onClick={onClose}><Icon name="x" size={18}/></button>
        </header>
        {error && <div className={styles.errorBar}><Icon name="alert" size={14}/> {error}</div>}
        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.label}>
            Name <span className={styles.required}>*</span>
            <input className={styles.input} autoFocus placeholder="The Missing Merchant…" value={name}
              onChange={e => setName(e.target.value)} required />
          </label>
          <div className={styles.row}>
            <label className={styles.label}>
              Type
              <select className={styles.input} value={type} onChange={e => setType(e.target.value as QuestType)}>
                {(['main','side','personal','faction','exploration','fetch','escort','eliminate','mystery'] as QuestType[])
                  .map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <label className={styles.label}>
              Status
              <select className={styles.input} value={status} onChange={e => setStatus(e.target.value as QuestStatus)}>
                {(['hidden','rumour','active','on_hold','completed','failed','abandoned'] as QuestStatus[])
                  .map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
              </select>
            </label>
          </div>
          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>Cancel</button>
            <button type="submit" className={styles.submitBtn} disabled={saving || !name.trim()}>
              {saving ? <Icon name="loader" size={15} className={styles.spin}/> : <Icon name="plus" size={15}/>}
              Create Quest
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
