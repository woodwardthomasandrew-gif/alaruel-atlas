import { useState, useEffect } from 'react';
import { Icon }      from '../../components/ui/Icon';
import { atlas }     from '../../bridge/atlas';
import type { Quest, QuestStatus, QuestType } from '../../types/quest';
import styles        from './QuestDetail.module.css';

const STATUSES: QuestStatus[] = ['rumour','active','on_hold','completed','failed','abandoned','hidden'];
const TYPES:    QuestType[]   = ['main','side','personal','faction','exploration','fetch','escort','eliminate','mystery'];

interface Props { quest: Quest | null; onUpdated: (q: Quest) => void; onDeleted: (id: string) => void; }

export function QuestDetail({ quest, onUpdated, onDeleted }: Props) {
  const [editing, setEditing]   = useState(false);
  const [saving,  setSaving]    = useState(false);
  const [error,   setError]     = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', description: '', status: 'hidden' as QuestStatus,
    questType: 'side' as QuestType, priority: 0, reward: '' });

  useEffect(() => {
    if (!quest) return;
    setForm({ name: quest.name, description: quest.description, status: quest.status,
      questType: quest.questType, priority: quest.priority, reward: quest.reward ?? '' });
    setEditing(false); setError(null);
  }, [quest?.id]);

  if (!quest) return (
    <div className={styles.panel}>
      <div className={styles.empty}>
        <Icon name="scroll" size={36} className={styles.emptyIcon}/>
        <p>Select a quest to view details.</p>
      </div>
    </div>
  );

  async function handleSave() {
    if (!quest) return;
    setSaving(true); setError(null);
    try {
      const now = new Date().toISOString();
      await atlas.db.run(
        `UPDATE quests SET name=?,description=?,status=?,quest_type=?,priority=?,reward=?,updated_at=? WHERE id=?`,
        [form.name.trim(), form.description, form.status, form.questType,
         form.priority, form.reward || null, now, quest.id],
      );
      onUpdated({ ...quest, ...form, name: form.name.trim(),
        reward: form.reward || undefined, updatedAt: now });
      setEditing(false);
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally     { setSaving(false); }
  }

  async function handleDelete() {
    if (!quest || !window.confirm(`Delete "${quest.name}"?`)) return;
    await atlas.db.run('DELETE FROM quests WHERE id = ?', [quest.id]);
    onDeleted(quest.id);
  }

  async function toggleObjective(objId: string, completed: boolean) {
    await atlas.db.run('UPDATE quest_objectives SET completed = ? WHERE id = ?', [completed ? 1 : 0, objId]);
    if (quest) onUpdated({ ...quest, objectives: quest.objectives.map(o => o.id === objId ? { ...o, completed } : o) } as Quest);
  }

  const field = (label: string, el: React.ReactNode) => (
    <div className={styles.field}><label className={styles.fieldLabel}>{label}</label>{el}</div>
  );

  return (
    <div className={styles.panel}>
      <header className={styles.header}>
        <div className={styles.headerInfo}>
          <h2 className={styles.headerName}>{quest.name}</h2>
          <div className={styles.headerMeta}>
            <span className={`${styles.badge} ${styles[`status_${quest.status}`]}`}>{quest.status.replace('_',' ')}</span>
            <span className={styles.badge}>{quest.questType}</span>
            {quest.priority > 0 && <span className={styles.badge}>priority {quest.priority}</span>}
          </div>
        </div>
        <div className={styles.headerActions}>
          {!editing ? (
            <>
              <button className={styles.iconBtn} onClick={() => setEditing(true)} title="Edit"><Icon name="scroll" size={16}/></button>
              <button className={`${styles.iconBtn} ${styles.danger}`} onClick={handleDelete} title="Delete"><Icon name="x" size={16}/></button>
            </>
          ) : (
            <>
              <button className={`${styles.iconBtn} ${styles.primary}`} onClick={handleSave} disabled={saving}>
                {saving ? <Icon name="loader" size={16} className={styles.spin}/> : <Icon name="chevron-right" size={16}/>}
              </button>
              <button className={styles.iconBtn} onClick={() => setEditing(false)}><Icon name="x" size={16}/></button>
            </>
          )}
        </div>
      </header>

      {error && <div className={styles.errorBar}><Icon name="alert" size={14}/> {error}</div>}

      <div className={styles.body}>
        {editing ? (
          <div className={styles.form}>
            {field('Name', <input className={styles.input} value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))}/>)}
            {field('Status',
              <select className={styles.input} value={form.status} onChange={e => setForm(f=>({...f,status:e.target.value as QuestStatus}))}>
                {STATUSES.map(s=><option key={s} value={s}>{s.replace('_',' ')}</option>)}
              </select>
            )}
            {field('Type',
              <select className={styles.input} value={form.questType} onChange={e => setForm(f=>({...f,questType:e.target.value as QuestType}))}>
                {TYPES.map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            )}
            {field('Priority', <input className={styles.input} type="number" value={form.priority} onChange={e => setForm(f=>({...f,priority:+e.target.value}))}/>)}
            {field('Reward', <input className={styles.input} value={form.reward} placeholder="Optional" onChange={e => setForm(f=>({...f,reward:e.target.value}))}/>)}
            {field('Description',
              <textarea className={`${styles.input} ${styles.textarea}`} value={form.description} rows={5}
                onChange={e => setForm(f=>({...f,description:e.target.value}))}/>
            )}
          </div>
        ) : (
          <div className={styles.readView}>
            {quest.description && <p className={styles.description}>{quest.description}</p>}
            {quest.reward && (
              <div className={styles.rewardBox}>
                <span className={styles.rewardLabel}>Reward</span>
                <span>{quest.reward}</span>
              </div>
            )}
            {quest.objectives.length > 0 && (
              <section className={styles.section}>
                <h3 className={styles.sectionTitle}>Objectives</h3>
                <ul className={styles.objectives}>
                  {quest.objectives.map(obj => (
                    <li key={obj.id} className={styles.objective}>
                      <button className={`${styles.checkbox} ${obj.completed ? styles.checked : ''}`}
                        onClick={() => toggleObjective(obj.id, !obj.completed)} aria-label="Toggle">
                        {obj.completed && '✓'}
                      </button>
                      <span className={`${styles.objText} ${obj.completed ? styles.objDone : ''}`}>{obj.description}</span>
                      {!obj.required && <span className={styles.optional}>optional</span>}
                    </li>
                  ))}
                </ul>
              </section>
            )}
            <div className={styles.meta}>
              <span>Created {new Date(quest.createdAt).toLocaleDateString()}</span>
              <span>Updated {new Date(quest.updatedAt).toLocaleDateString()}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
