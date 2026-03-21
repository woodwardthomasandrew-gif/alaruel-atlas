import { useState, useEffect, useCallback } from 'react';
import type React from 'react';
import { Icon }             from '../../components/ui/Icon';
import { atlas }            from '../../bridge/atlas';
import { useCampaignStore } from '../../store/campaign.store';
import type { Session, SessionStatus, SessionPrepItem, SessionNote, SessionScene } from '../../types/session';
import styles               from './SessionsView.module.css';

const STATUS_COLOUR: Record<SessionStatus,string> = {
  planned:'var(--ink-400)', in_progress:'var(--gold-400)',
  completed:'#4caf85', cancelled:'var(--crimson-400)',
};

const ENCOUNTER_TYPES = [
  { value: 'combat',       label: 'Combat',         icon: '⚔️' },
  { value: 'roleplay',     label: 'Roleplay',        icon: '💬' },
  { value: 'exploration',  label: 'Exploration',     icon: '🗺️' },
  { value: 'puzzle',       label: 'Puzzle',          icon: '🧩' },
  { value: 'social',       label: 'Social',          icon: '🤝' },
  { value: 'rest',         label: 'Rest / Downtime', icon: '🏕️' },
  { value: 'revelation',   label: 'Revelation',      icon: '💡' },
  { value: 'travel',       label: 'Travel',          icon: '🛤️' },
  { value: 'other',        label: 'Other',           icon: '📌' },
];

const DETAIL_TABS = ['encounters', 'prep', 'notes'] as const;
type DetailTab = typeof DETAIL_TABS[number];

// Extend SessionScene with encounter type stored in content as JSON prefix
interface Encounter extends SessionScene {
  encounterType: string;
  objective:     string;
  setup:         string;
  reward:        string;
}

function parseEncounter(scene: SessionScene): Encounter {
  try {
    const parsed = JSON.parse(scene.content);
    return {
      ...scene,
      encounterType: parsed.type    ?? 'other',
      objective:     parsed.objective ?? '',
      setup:         parsed.setup     ?? '',
      reward:        parsed.reward    ?? '',
    };
  } catch {
    return { ...scene, encounterType: 'other', objective: '', setup: scene.content, reward: '' };
  }
}

function encodeEncounter(e: { type: string; objective: string; setup: string; reward: string }): string {
  return JSON.stringify({ type: e.type, objective: e.objective, setup: e.setup, reward: e.reward });
}

// ── SceneFormPanel lives outside SessionsView so React never recreates its
// component identity on re-render — prevents autoFocus stealing focus on every keystroke.
interface SceneFormPanelProps {
  sceneForm:    { title: string; encounterType: string; objective: string; setup: string; reward: string };
  setSceneForm: React.Dispatch<React.SetStateAction<{ title: string; encounterType: string; objective: string; setup: string; reward: string }>>;
  editingId:    string | null;
  onSave:       () => void;
  onCancel:     () => void;
}

function SceneFormPanel({ sceneForm, setSceneForm, editingId, onSave, onCancel }: SceneFormPanelProps) {
  return (
    <div className={styles.sceneForm}>
      <div className={styles.sceneFormRow}>
        <div className={styles.sceneFormField} style={{flex:2}}>
          <label className={styles.sceneFormLabel}>Title <span className={styles.req}>*</span></label>
          <input className={styles.sceneFormInput} autoFocus placeholder="The Ambush at Thornwall…"
            value={sceneForm.title} onChange={e => setSceneForm(f => ({...f, title: e.target.value}))}/>
        </div>
        <div className={styles.sceneFormField} style={{flex:1}}>
          <label className={styles.sceneFormLabel}>Type</label>
          <select className={styles.sceneFormInput} value={sceneForm.encounterType}
            onChange={e => setSceneForm(f => ({...f, encounterType: e.target.value}))}>
            {ENCOUNTER_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
            ))}
          </select>
        </div>
      </div>
      <div className={styles.sceneFormField}>
        <label className={styles.sceneFormLabel}>Objective</label>
        <input className={styles.sceneFormInput} placeholder="What should the players accomplish or decide?"
          value={sceneForm.objective} onChange={e => setSceneForm(f => ({...f, objective: e.target.value}))}/>
      </div>
      <div className={styles.sceneFormField}>
        <label className={styles.sceneFormLabel}>Setup / Notes</label>
        <textarea className={`${styles.sceneFormInput} ${styles.sceneFormTextarea}`} rows={3}
          placeholder="Key details, enemy stats, read-aloud text, contingencies…"
          value={sceneForm.setup} onChange={e => setSceneForm(f => ({...f, setup: e.target.value}))}/>
      </div>
      <div className={styles.sceneFormField}>
        <label className={styles.sceneFormLabel}>Reward / Outcome</label>
        <input className={styles.sceneFormInput} placeholder="XP, loot, story consequence…"
          value={sceneForm.reward} onChange={e => setSceneForm(f => ({...f, reward: e.target.value}))}/>
      </div>
      <div className={styles.sceneFormActions}>
        <button className={styles.ghostBtn} onClick={onCancel}>Cancel</button>
        <button className={styles.saveSceneBtn} onClick={onSave} disabled={!sceneForm.title.trim()}>
          <Icon name="plus" size={14}/> {editingId ? 'Save Changes' : 'Add Encounter'}
        </button>
      </div>
    </div>
  );
}

export default function SessionsView() {
  const campaign = useCampaignStore(s => s.campaign);
  const [sessions,    setSessions]    = useState<Session[]>([]);
  const [selected,    setSelected]    = useState<Session|null>(null);
  const [loading,     setLoading]     = useState(true);
  const [creating,    setCreating]    = useState(false);
  const [newName,     setNewName]     = useState('');
  const [error,       setError]       = useState<string|null>(null);
  const [activeTab,   setActiveTab]   = useState<DetailTab>('encounters');
  const [notePhase,   setNotePhase]   = useState<'planning'|'live'|'recap'>('planning');
  const [noteText,    setNoteText]    = useState('');
  const [prepText,    setPrepText]    = useState('');

  // Encounter state
  const [encounters,     setEncounters]     = useState<Encounter[]>([]);
  const [expandedId,     setExpandedId]     = useState<string|null>(null);
  const [addingScene,    setAddingScene]    = useState(false);
  const [editingId,      setEditingId]      = useState<string|null>(null);
  const [sceneForm,      setSceneForm]      = useState({
    title: '', encounterType: 'combat', objective: '', setup: '', reward: '',
  });

  type RawSession  = Record<string,unknown>;
  type RawScene    = Record<string,unknown>;
  type NoteRow     = {id:string;phase:'planning'|'live'|'recap';content:string;created_at:string;updated_at:string};
  type PrepRow     = {id:string;description:string;done:number;sort_order:number};

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

  async function loadScenes(sessionId: string) {
    const rows = await atlas.db.query<RawScene>(
      'SELECT * FROM session_scenes WHERE session_id = ? ORDER BY sort_order ASC',
      [sessionId],
    );
    const mapped: Encounter[] = rows.map(r => parseEncounter({
      id:         r['id']         as string,
      title:      r['title']      as string,
      content:    r['content']    as string ?? '',
      order:      r['sort_order'] as number,
      locationId: r['location_id'] as string|null,
      npcIds:     [],
      played:     (r['played'] as number) === 1,
    }));
    setEncounters(mapped);
  }

  async function loadDetail(id: string) {
    const [notes, preps] = await Promise.all([
      atlas.db.query<NoteRow>('SELECT * FROM session_notes WHERE session_id = ? ORDER BY created_at ASC', [id]),
      atlas.db.query<PrepRow>('SELECT * FROM session_prep_items WHERE session_id = ? ORDER BY sort_order ASC', [id]),
    ]);
    const mappedNotes: SessionNote[]     = notes.map(n => ({ id:n.id, phase:n.phase, content:n.content, createdAt:n.created_at, updatedAt:n.updated_at }));
    const mappedPreps: SessionPrepItem[] = preps.map(p => ({ id:p.id, description:p.description, done:p.done===1 }));
    setSessions(prev => prev.map(s => s.id === id ? { ...s, notes:mappedNotes, prepItems:mappedPreps } : s));
    setSelected(prev => prev?.id === id ? { ...prev, notes:mappedNotes, prepItems:mappedPreps } : prev);
  }

  async function handleSelect(s: Session) {
    setSelected(s);
    setActiveTab('encounters');
    setExpandedId(null);
    setAddingScene(false);
    setEditingId(null);
    await Promise.all([loadDetail(s.id), loadScenes(s.id)]);
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
    setNewName(''); setCreating(false);
    setSelected(newSess); setEncounters([]);
    setActiveTab('encounters');
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

  // ── Encounter CRUD ────────────────────────────────────────────────────────

  function openAddScene() {
    setSceneForm({ title: '', encounterType: 'combat', objective: '', setup: '', reward: '' });
    setEditingId(null);
    setAddingScene(true);
  }

  function openEditScene(enc: Encounter) {
    setSceneForm({
      title:         enc.title,
      encounterType: enc.encounterType,
      objective:     enc.objective,
      setup:         enc.setup,
      reward:        enc.reward,
    });
    setEditingId(enc.id);
    setAddingScene(false);
  }

  async function saveScene() {
    if (!selected || !sceneForm.title.trim()) return;
    const content = encodeEncounter({
      type:      sceneForm.encounterType,
      objective: sceneForm.objective,
      setup:     sceneForm.setup,
      reward:    sceneForm.reward,
    });
    if (editingId) {
      await atlas.db.run(
        'UPDATE session_scenes SET title=?,content=?,updated_at=? WHERE id=?',
        [sceneForm.title.trim(), content, new Date().toISOString(), editingId],
      );
      setEditingId(null);
    } else {
      const id  = crypto.randomUUID();
      const ord = encounters.length;
      await atlas.db.run(
        'INSERT INTO session_scenes (id,session_id,title,content,sort_order,played) VALUES (?,?,?,?,?,0)',
        [id, selected.id, sceneForm.title.trim(), content, ord],
      );
      setAddingScene(false);
    }
    await loadScenes(selected.id);
    setSceneForm({ title: '', encounterType: 'combat', objective: '', setup: '', reward: '' });
  }

  async function togglePlayed(enc: Encounter) {
    await atlas.db.run('UPDATE session_scenes SET played=? WHERE id=?', [enc.played?0:1, enc.id]);
    await loadScenes(selected!.id);
  }

  async function deleteScene(id: string) {
    if (!window.confirm('Remove this encounter?')) return;
    await atlas.db.run('DELETE FROM session_scenes WHERE id=?', [id]);
    await loadScenes(selected!.id);
    if (expandedId === id) setExpandedId(null);
    if (editingId  === id) setEditingId(null);
  }

  async function moveScene(enc: Encounter, dir: -1|1) {
    const idx     = encounters.findIndex(e => e.id === enc.id);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= encounters.length) return;
    const swap = encounters[swapIdx];
    await Promise.all([
      atlas.db.run('UPDATE session_scenes SET sort_order=? WHERE id=?', [swap.order, enc.id]),
      atlas.db.run('UPDATE session_scenes SET sort_order=? WHERE id=?', [enc.order, swap.id]),
    ]);
    await loadScenes(selected!.id);
  }

  const typeInfo = (val: string) => ENCOUNTER_TYPES.find(t => t.value === val) ?? ENCOUNTER_TYPES[ENCOUNTER_TYPES.length-1];

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

            {/* Tab bar */}
            <div className={styles.tabBar}>
              {DETAIL_TABS.map(tab => (
                <button key={tab}
                  className={`${styles.tab} ${activeTab===tab ? styles.tabActive : ''}`}
                  onClick={() => setActiveTab(tab)}>
                  {tab === 'encounters' && <Icon name="map" size={13}/>}
                  {tab === 'prep'       && <Icon name="scroll" size={13}/>}
                  {tab === 'notes'      && <Icon name="scroll" size={13}/>}
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  {tab === 'encounters' && encounters.length > 0 && (
                    <span className={styles.tabBadge}>{encounters.length}</span>
                  )}
                  {tab === 'prep' && selected.prepItems.length > 0 && (
                    <span className={styles.tabBadge}>
                      {selected.prepItems.filter(p => p.done).length}/{selected.prepItems.length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className={styles.detailBody}>

              {/* ── ENCOUNTERS TAB ── */}
              {activeTab === 'encounters' && (
                <div className={styles.encounterSection}>
                  <div className={styles.encounterHeader}>
                    <span className={styles.encounterSummary}>
                      {encounters.length === 0
                        ? 'No encounters planned yet'
                        : `${encounters.filter(e=>e.played).length} / ${encounters.length} completed`}
                    </span>
                    {!addingScene && editingId === null && (
                      <button className={styles.addEncounterBtn} onClick={openAddScene}>
                        <Icon name="plus" size={13}/> Add Encounter
                      </button>
                    )}
                  </div>

                  {/* Add form */}
                  {addingScene && (
                    <SceneFormPanel
                      sceneForm={sceneForm}
                      setSceneForm={setSceneForm}
                      editingId={editingId}
                      onSave={saveScene}
                      onCancel={() => { setAddingScene(false); setSceneForm({ title:'', encounterType:'combat', objective:'', setup:'', reward:'' }); }}/>
                  )}

                  {/* Encounter cards */}
                  <div className={styles.encounterList}>
                    {encounters.length === 0 && !addingScene && (
                      <div className={styles.encounterEmpty}>
                        <p>Plan your session by adding encounters below.</p>
                        <button className={styles.addEncounterBtn} onClick={openAddScene}>
                          <Icon name="plus" size={13}/> Add First Encounter
                        </button>
                      </div>
                    )}

                    {encounters.map((enc, idx) => {
                      const info      = typeInfo(enc.encounterType);
                      const isExpanded = expandedId === enc.id;
                      const isEditing  = editingId  === enc.id;

                      return (
                        <div key={enc.id}
                          className={`${styles.encounterCard} ${enc.played ? styles.encounterPlayed : ''}`}>
                          {/* Card header */}
                          <div className={styles.encounterCardHeader}>
                            <button className={`${styles.playedToggle} ${enc.played ? styles.playedDone : ''}`}
                              onClick={() => togglePlayed(enc)} title={enc.played ? 'Mark unplayed' : 'Mark played'}>
                              {enc.played ? '✓' : idx + 1}
                            </button>
                            <span className={styles.encounterTypePill}>
                              {info.icon} {info.label}
                            </span>
                            <span className={styles.encounterTitle}>{enc.title}</span>
                            <div className={styles.encounterCardActions}>
                              <button className={styles.encIconBtn}
                                onClick={() => moveScene(enc, -1)} disabled={idx===0} title="Move up">
                                <Icon name="chevron-right" size={12} style={{transform:'rotate(-90deg)'}}/>
                              </button>
                              <button className={styles.encIconBtn}
                                onClick={() => moveScene(enc, 1)} disabled={idx===encounters.length-1} title="Move down">
                                <Icon name="chevron-right" size={12} style={{transform:'rotate(90deg)'}}/>
                              </button>
                              <button className={styles.encIconBtn}
                                onClick={() => { openEditScene(enc); setExpandedId(enc.id); }} title="Edit">
                                <Icon name="scroll" size={12}/>
                              </button>
                              <button className={`${styles.encIconBtn} ${styles.encDanger}`}
                                onClick={() => deleteScene(enc.id)} title="Delete">
                                <Icon name="x" size={12}/>
                              </button>
                              <button className={styles.encIconBtn}
                                onClick={() => setExpandedId(isExpanded ? null : enc.id)} title="Expand">
                                <Icon name="chevron-right" size={12}
                                  style={{transform: isExpanded ? 'rotate(-90deg)' : 'rotate(90deg)', transition:'transform .15s'}}/>
                              </button>
                            </div>
                          </div>

                          {/* Expanded detail / edit form */}
                          {isExpanded && (
                            <div className={styles.encounterCardBody}>
                              {isEditing ? (
                                <SceneFormPanel
                                  sceneForm={sceneForm}
                                  setSceneForm={setSceneForm}
                                  editingId={editingId}
                                  onSave={saveScene}
                                  onCancel={() => { setEditingId(null); setExpandedId(enc.id); }}/>
                              ) : (
                                <div className={styles.encounterDetail}>
                                  {enc.objective && (
                                    <div className={styles.encDetailRow}>
                                      <span className={styles.encDetailLabel}>Objective</span>
                                      <span className={styles.encDetailValue}>{enc.objective}</span>
                                    </div>
                                  )}
                                  {enc.setup && (
                                    <div className={styles.encDetailRow}>
                                      <span className={styles.encDetailLabel}>Setup / Notes</span>
                                      <span className={`${styles.encDetailValue} ${styles.encDetailPre}`}>{enc.setup}</span>
                                    </div>
                                  )}
                                  {enc.reward && (
                                    <div className={styles.encDetailRow}>
                                      <span className={styles.encDetailLabel}>Reward / Outcome</span>
                                      <span className={styles.encDetailValue}>{enc.reward}</span>
                                    </div>
                                  )}
                                  {!enc.objective && !enc.setup && !enc.reward && (
                                    <p className={styles.encDetailEmpty}>No details yet. Click edit to add some.</p>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── PREP TAB ── */}
              {activeTab === 'prep' && (
                <section className={styles.section}>
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
                    {selected.prepItems.length === 0 && (
                      <p className={styles.hint}>No prep items yet.</p>
                    )}
                  </ul>
                  <div className={styles.addRow}>
                    <input className={styles.input} placeholder="Add prep item…"
                      value={prepText} onChange={e => setPrepText(e.target.value)}
                      onKeyDown={e => e.key==='Enter' && addPrep()} />
                    <button className={styles.addBtn} onClick={addPrep} disabled={!prepText.trim()}>Add</button>
                  </div>
                </section>
              )}

              {/* ── NOTES TAB ── */}
              {activeTab === 'notes' && (
                <section className={styles.section}>
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
                    {selected.notes.filter(n => n.phase===notePhase).length === 0 && (
                      <p className={styles.hint}>No {notePhase} notes yet.</p>
                    )}
                  </div>
                  <div className={styles.addRow}>
                    <textarea className={`${styles.input} ${styles.textarea}`}
                      placeholder={`Add ${notePhase} note…`} value={noteText} rows={3}
                      onChange={e => setNoteText(e.target.value)} />
                    <button className={styles.addBtn} onClick={addNote} disabled={!noteText.trim()}>Add</button>
                  </div>
                </section>
              )}

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
