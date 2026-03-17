import { useState, useEffect, useCallback } from 'react';
import { Icon }             from '../../components/ui/Icon';
import { atlas }            from '../../bridge/atlas';
import { useCampaignStore } from '../../store/campaign.store';
import type { Session, SessionStatus, SessionPrepItem, SessionNote } from '../../types/session';
import styles               from './SessionsView.module.css';

const STATUS_COLOUR: Record<SessionStatus,string> = {
  planned:'var(--ink-400)', in_progress:'var(--gold-400)',
  completed:'#4caf85', cancelled:'var(--crimson-400)',
};

export default function SessionsView() {
  const campaign = useCampaignStore(s => s.campaign);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selected, setSelected] = useState<Session|null>(null);
  const [loading,  setLoading]  = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName,  setNewName]  = useState('');
  const [error,    setError]    = useState<string|null>(null);
  const [notePhase,setNotePhase]= useState<'planning'|'live'|'recap'>('planning');
  const [noteText, setNoteText] = useState('');
  const [prepText, setPrepText] = useState('');

  type RawSession = Record<string,unknown>;

  const load = useCallback(async () => {
    if (!campaign) return;
    setLoading(true);
    try {
      const rows = await atlas.db.query<RawSession>(
        'SELECT * FROM sessions WHERE campaign_id = ? ORDER BY session_number DESC',
        [campaign.id],
      );
      setSessions(rows.map(r => ({
        id: r['id'] as string, name: r['name'] as string,
        description: r['description'] as string ?? '',
        sessionNumber: r['session_number'] as number ?? 0,
        status: r['status'] as SessionStatus,
        scheduledAt: r['scheduled_at'] as string|undefined,
        campaignDateStart: r['campaign_date_start'] as string|undefined,
        campaignDateEnd:   r['campaign_date_end']   as string|undefined,
        rewards: r['rewards'] as string|undefined,
        followUpHooks: r['follow_up_hooks'] as string|undefined,
        tags: JSON.parse(r['tags'] as string ?? '[]') as string[],
        createdAt: r['created_at'] as string, updatedAt: r['updated_at'] as string,
        scenes:[], prepItems:[], notes:[], advancedQuestIds:[], completedQuestIds:[],
        plotThreadIds:[], featuredNpcIds:[], visitedLocationIds:[], eventIds:[], assetIds:[],
      })));
    } catch(e) { setError(e instanceof Error ? e.message : String(e)); }
    finally    { setLoading(false); }
  }, [campaign]);

  useEffect(() => { load(); }, [load]);

  async function loadDetail(id: string) {
    type NoteRow = {id:string;phase:'planning'|'live'|'recap';content:string;created_at:string;updated_at:string};
    type PrepRow = {id:string;description:string;done:number;sort_order:number};
    const [notes, preps] = await Promise.all([
      atlas.db.query<NoteRow>('SELECT * FROM session_notes WHERE session_id = ? ORDER BY created_at ASC', [id]),
      atlas.db.query<PrepRow>('SELECT * FROM session_prep_items WHERE session_id = ? ORDER BY sort_order ASC', [id]),
    ]);
    const mappedNotes: SessionNote[]    = notes.map(n => ({ id:n.id, phase:n.phase, content:n.content, createdAt:n.created_at, updatedAt:n.updated_at }));
    const mappedPreps: SessionPrepItem[] = preps.map(p => ({ id:p.id, description:p.description, done:p.done===1 }));
    setSessions(prev => prev.map(s => s.id === id ? { ...s, notes:mappedNotes, prepItems:mappedPreps } : s));
    setSelected(prev => prev?.id === id ? { ...prev, notes:mappedNotes, prepItems:mappedPreps } : prev);
  }

  async function handleSelect(s: Session) {
    setSelected(s);
    await loadDetail(s.id);
  }

  async function createSession() {
    if (!newName.trim() || !campaign) return;
    const id  = crypto.randomUUID();
    const now = new Date().toISOString();
    const num = (sessions[0]?.sessionNumber ?? 0) + 1;
    await atlas.db.run(
      `INSERT INTO sessions (id,campaign_id,name,description,session_number,status,tags,created_at,updated_at)
       VALUES (?,?,?,?,?,'planned','[]',?,?)`,
      [id, campaign.id, newName.trim(), '', num, now, now],
    );
    const newSess: Session = {
      id, name:newName.trim(), description:'', sessionNumber:num, status:'planned',
      tags:[], scenes:[], prepItems:[], notes:[], advancedQuestIds:[], completedQuestIds:[],
      plotThreadIds:[], featuredNpcIds:[], visitedLocationIds:[], eventIds:[], assetIds:[],
      createdAt:now, updatedAt:now,
    };
    setSessions(prev => [newSess, ...prev]);
    setNewName(''); setCreating(false); setSelected(newSess);
  }

  async function updateStatus(id: string, status: SessionStatus) {
    const now = new Date().toISOString();
    await atlas.db.run('UPDATE sessions SET status=?,updated_at=? WHERE id=?', [status, now, id]);
    setSessions(prev => prev.map(s => s.id===id ? {...s,status,updatedAt:now} : s));
    setSelected(prev => prev?.id===id ? {...prev,status,updatedAt:now} : prev);
  }

  async function addNote() {
    if (!selected || !noteText.trim()) return;
    const id = crypto.randomUUID(), now = new Date().toISOString();
    await atlas.db.run(
      'INSERT INTO session_notes (id,session_id,phase,content,created_at,updated_at) VALUES (?,?,?,?,?,?)',
      [id, selected.id, notePhase, noteText.trim(), now, now],
    );
    setNoteText('');
    await loadDetail(selected.id);
  }

  async function togglePrep(item: SessionPrepItem) {
    if (!selected) return;
    await atlas.db.run('UPDATE session_prep_items SET done=? WHERE id=?', [item.done?0:1, item.id]);
    await loadDetail(selected.id);
  }

  async function addPrep() {
    if (!selected || !prepText.trim()) return;
    const id = crypto.randomUUID();
    const ord = selected.prepItems.length;
    await atlas.db.run(
      'INSERT INTO session_prep_items (id,session_id,description,done,sort_order) VALUES (?,?,?,0,?)',
      [id, selected.id, prepText.trim(), ord],
    );
    setPrepText('');
    await loadDetail(selected.id);
  }

  return (
    <div className={styles.root}>
      <header className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <h2 className={styles.title}>Sessions</h2>
          <span className={styles.count}>{sessions.length}</span>
        </div>
        <button className={styles.createBtn} onClick={() => setCreating(v => !v)}>
          <Icon name="plus" size={16}/> New Session
        </button>
      </header>

      {creating && (
        <div className={styles.createBar}>
          <input className={styles.input} autoFocus placeholder="Session name…"
            value={newName} onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key==='Enter' && createSession()} />
          <button className={styles.createBtn} onClick={createSession} disabled={!newName.trim()}>Create</button>
          <button className={styles.ghostBtn} onClick={() => setCreating(false)}>Cancel</button>
        </div>
      )}

      {error && <div className={styles.errorBar}><Icon name="alert" size={15}/> {error}</div>}

      <div className={styles.body}>
        {/* Session list */}
        <div className={styles.list}>
          {loading ? (
            <div className={styles.empty}><Icon name="loader" size={22} className={styles.spin}/></div>
          ) : sessions.length === 0 ? (
            <div className={styles.empty}>
              <Icon name="calendar" size={32} className={styles.emptyIcon}/>
              <p>No sessions yet.</p>
            </div>
          ) : sessions.map(s => (
            <button key={s.id}
              className={`${styles.sessionItem} ${selected?.id===s.id ? styles.active : ''}`}
              onClick={() => handleSelect(s)}>
              <div className={styles.sessionNum}>#{s.sessionNumber}</div>
              <div className={styles.sessionInfo}>
                <span className={styles.sessionName}>{s.name}</span>
                <span className={styles.sessionStatus} style={{color:STATUS_COLOUR[s.status]}}>
                  {s.status.replace('_',' ')}
                </span>
              </div>
              {s.scheduledAt && (
                <span className={styles.sessionDate}>
                  {new Date(s.scheduledAt).toLocaleDateString()}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Detail panel */}
        {selected ? (
          <div className={styles.detail}>
            <div className={styles.detailHeader}>
              <div>
                <h2 className={styles.detailTitle}>
                  <span className={styles.detailNum}>#{selected.sessionNumber}</span> {selected.name}
                </h2>
                <div className={styles.statusRow}>
                  {(['planned','in_progress','completed','cancelled'] as SessionStatus[]).map(st => (
                    <button key={st}
                      className={`${styles.statusBtn} ${selected.status===st ? styles.statusActive : ''}`}
                      style={selected.status===st ? {borderColor:STATUS_COLOUR[st],color:STATUS_COLOUR[st]} : {}}
                      onClick={() => updateStatus(selected.id, st)}>
                      {st.replace('_',' ')}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className={styles.detailBody}>
              {/* Prep checklist */}
              <section className={styles.section}>
                <h3 className={styles.sectionTitle}>Prep Checklist</h3>
                <ul className={styles.prepList}>
                  {selected.prepItems.map(item => (
                    <li key={item.id} className={styles.prepItem}>
                      <button
                        className={`${styles.checkbox} ${item.done ? styles.checked : ''}`}
                        onClick={() => togglePrep(item)}>
                        {item.done && '✓'}
                      </button>
                      <span className={item.done ? styles.prepDone : ''}>{item.description}</span>
                    </li>
                  ))}
                </ul>
                <div className={styles.addRow}>
                  <input className={styles.input} placeholder="Add prep item…"
                    value={prepText} onChange={e => setPrepText(e.target.value)}
                    onKeyDown={e => e.key==='Enter' && addPrep()} />
                  <button className={styles.addBtn} onClick={addPrep} disabled={!prepText.trim()}>Add</button>
                </div>
              </section>

              {/* Notes */}
              <section className={styles.section}>
                <h3 className={styles.sectionTitle}>Notes</h3>
                <div className={styles.phaseTabs}>
                  {(['planning','live','recap'] as const).map(p => (
                    <button key={p} className={`${styles.phaseTab} ${notePhase===p ? styles.phaseActive : ''}`}
                      onClick={() => setNotePhase(p)}>{p}</button>
                  ))}
                </div>
                <div className={styles.notesList}>
                  {selected.notes.filter(n => n.phase===notePhase).map(n => (
                    <div key={n.id} className={styles.note}>
                      <p>{n.content}</p>
                      <span className={styles.noteMeta}>{new Date(n.createdAt).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
                <div className={styles.addRow}>
                  <textarea className={`${styles.input} ${styles.textarea}`}
                    placeholder={`Add ${notePhase} note…`} value={noteText} rows={3}
                    onChange={e => setNoteText(e.target.value)} />
                  <button className={styles.addBtn} onClick={addNote} disabled={!noteText.trim()}>Add</button>
                </div>
              </section>
            </div>
          </div>
        ) : (
          <div className={styles.detailEmpty}>
            <Icon name="calendar" size={40} className={styles.emptyIcon}/>
            <p>Select a session to view details.</p>
          </div>
        )}
      </div>
    </div>
  );
}
