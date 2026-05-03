import { useState, useEffect, useCallback } from 'react';
import type React from 'react';
import { Icon }             from '../../components/ui/Icon';
import { atlas }            from '../../bridge/atlas';
import { useCampaignStore } from '../../store/campaign.store';
import { PrintSessionView } from './PrintSessionView';
import { getPrintableSession, renderPrintableSessionHtml } from '../../utils/printResolver';
import type { PrintableSession } from '../../types/print';
import type {
  Session, SessionStatus, SessionPrepItem, SessionNote, SessionScene,
  SceneMonsterEntry, SceneMiniEntry,
} from '../../types/session';
import styles from './SessionsView.module.css';

// ── Constants ──────────────────────────────────────────────────────────────────

const STATUS_COLOUR: Record<SessionStatus, string> = {
  planned: 'var(--ink-400)', in_progress: 'var(--gold-400)',
  completed: '#4caf85', cancelled: 'var(--crimson-400)',
};

const ENCOUNTER_TYPES = [
  { value: 'combat',      label: 'Combat',       icon: '⚔️' },
  { value: 'roleplay',    label: 'Roleplay',      icon: '💬' },
  { value: 'exploration', label: 'Exploration',   icon: '🗺️' },
  { value: 'puzzle',      label: 'Puzzle',        icon: '🧩' },
  { value: 'social',      label: 'Social',        icon: '🤝' },
  { value: 'rest',        label: 'Rest/Downtime', icon: '🏕️' },
  { value: 'revelation',  label: 'Revelation',    icon: '💡' },
  { value: 'travel',      label: 'Travel',        icon: '🛤️' },
  { value: 'other',       label: 'Other',         icon: '📌' },
];

const DETAIL_TABS = ['encounters', 'prep', 'notes'] as const;
type DetailTab = typeof DETAIL_TABS[number];
const ENC_TABS  = ['details', 'npcs', 'monsters', 'minis'] as const;
type EncTab     = typeof ENC_TABS[number];

interface TravelMontageDetails {
  route: string;
  travelGoal: string;
  montagePrompt: string;
  partyApproach: string;
  obstacle: string;
  complication: string;
  progress: string;
  consequence: string;
}

interface EncounterTypeDetails {
  travel?: TravelMontageDetails;
  [key: string]: TravelMontageDetails | Record<string, string> | undefined;
}

interface SceneFormState {
  title: string;
  encounterType: string;
  objective: string;
  setup: string;
  reward: string;
  typeDetails: EncounterTypeDetails;
}

const EMPTY_TRAVEL_MONTAGE: TravelMontageDetails = {
  route: '',
  travelGoal: '',
  montagePrompt: '',
  partyApproach: '',
  obstacle: '',
  complication: '',
  progress: '',
  consequence: '',
};

function emptyTypeDetails(): EncounterTypeDetails {
  return { travel: { ...EMPTY_TRAVEL_MONTAGE } };
}

function emptySceneForm(): SceneFormState {
  return { title: '', encounterType: 'combat', objective: '', setup: '', reward: '', typeDetails: emptyTypeDetails() };
}

const TYPE_SPECIFIC_FIELDS: Record<string, { title: string; hint: string; fields: { key: string; label: string; placeholder: string; multiline?: boolean }[] }> = {
  combat: {
    title: 'Combat Frame',
    hint: 'Define the fight beyond stat blocks: space, stakes, behavior, and escalation.',
    fields: [
      { key: 'battlefield', label: 'Battlefield', placeholder: 'Chokepoints, cover, hazards, verticality...' },
      { key: 'stakes', label: 'Stakes', placeholder: 'What changes if the enemies win?' },
      { key: 'tactics', label: 'Enemy Tactics', placeholder: 'Ambush, split the party, protect the leader...', multiline: true },
      { key: 'escalation', label: 'Escalation', placeholder: 'Reinforcements, collapsing bridge, ritual timer...' },
    ],
  },
  roleplay: {
    title: 'Roleplay Beat',
    hint: 'Anchor the conversation in motives, leverage, and what can be learned.',
    fields: [
      { key: 'speaker', label: 'Key Speaker', placeholder: 'Who drives this exchange?' },
      { key: 'agenda', label: 'Agenda', placeholder: 'What do they want from the party?' },
      { key: 'leverage', label: 'Leverage', placeholder: 'What makes them move, soften, or harden?' },
      { key: 'reveal', label: 'Possible Reveal', placeholder: 'Truth, clue, lie, or emotional turn...', multiline: true },
    ],
  },
  exploration: {
    title: 'Exploration Site',
    hint: 'Give the players something to notice, test, and choose around.',
    fields: [
      { key: 'feature', label: 'Signature Feature', placeholder: 'Ancient lift, glass bog, singing stones...' },
      { key: 'discovery', label: 'Discovery', placeholder: 'What can they find here?' },
      { key: 'hazard', label: 'Hazard', placeholder: 'What pressures careless movement?' },
      { key: 'clue', label: 'Clue / Lead', placeholder: 'What points to the next scene?', multiline: true },
    ],
  },
  puzzle: {
    title: 'Puzzle Structure',
    hint: 'Keep the mechanism, clues, and failure state visible at the table.',
    fields: [
      { key: 'mechanism', label: 'Mechanism', placeholder: 'Runes, weights, melody, mirrored rooms...' },
      { key: 'clue', label: 'Clue', placeholder: 'How can players infer the solution?' },
      { key: 'solution', label: 'Solution', placeholder: 'What works?' },
      { key: 'failure', label: 'Failure State', placeholder: 'What happens without blocking the session?', multiline: true },
    ],
  },
  social: {
    title: 'Social Scene',
    hint: 'Track the room, the ask, the mood, and the fallout.',
    fields: [
      { key: 'audience', label: 'Audience', placeholder: 'Court, guild hall, tavern crowd, war council...' },
      { key: 'mood', label: 'Mood', placeholder: 'Suspicious, celebratory, grieving, divided...' },
      { key: 'ask', label: 'Ask / Offer', placeholder: 'What is being requested or traded?' },
      { key: 'consequence', label: 'Consequence', placeholder: 'Reputation, alliance, insult, promise...', multiline: true },
    ],
  },
  rest: {
    title: 'Downtime Beat',
    hint: 'Make rest useful while preserving hooks, interruptions, and recovery.',
    fields: [
      { key: 'haven', label: 'Haven', placeholder: 'Camp, shrine, inn, safehouse...' },
      { key: 'options', label: 'Downtime Options', placeholder: 'Craft, train, research, carouse, recover...', multiline: true },
      { key: 'interruption', label: 'Interruption', placeholder: 'Dream, messenger, weather, rival...' },
      { key: 'benefit', label: 'Benefit', placeholder: 'What do they regain or learn?' },
    ],
  },
  revelation: {
    title: 'Revelation Beat',
    hint: 'Plan how the truth lands and what it changes.',
    fields: [
      { key: 'truth', label: 'Truth', placeholder: 'What is revealed?' },
      { key: 'delivery', label: 'Delivery', placeholder: 'Vision, confession, evidence, scene detail...' },
      { key: 'evidence', label: 'Evidence', placeholder: 'What makes it credible?' },
      { key: 'reaction', label: 'Expected Reaction', placeholder: 'Who is shaken, angry, relieved, exposed?', multiline: true },
    ],
  },
  other: {
    title: 'Custom Encounter Frame',
    hint: 'A flexible shape for scenes that do not fit the other buckets.',
    fields: [
      { key: 'focus', label: 'Focus', placeholder: 'What is this scene really about?' },
      { key: 'structure', label: 'Structure', placeholder: 'Opening, pressure, turn, exit...' },
      { key: 'twist', label: 'Twist', placeholder: 'What changes midway?' },
      { key: 'resolution', label: 'Resolution', placeholder: 'What closes the scene?', multiline: true },
    ],
  },
};

// ── DB row shapes (renderer-local) ─────────────────────────────────────────────

interface MonsterRow { id: string; name: string; creature_type: string; size: string; challenge_rating: string; is_homebrew: number; }
interface NpcRow     { id: string; name: string; alias: string | null; role: string; vital_status: string; }
interface MiniRow    { id: string; name: string; base_size: string | null; quantity: number; }
interface SceneMonsterRow { scene_id: string; monster_id: string; count: number; notes: string | null; }
interface SceneMiniRow    { scene_id: string; mini_id: string;    count: number; }
interface SceneNpcRow     { scene_id: string; npc_id: string; }

// ── Encounter ──────────────────────────────────────────────────────────────────

interface Encounter extends SessionScene {
  encounterType: string;
  objective:     string;
  setup:         string;
  reward:        string;
  typeDetails:   EncounterTypeDetails;
}

function parseEncounter(scene: SessionScene): Encounter {
  try {
    const p = JSON.parse(scene.content);
    return {
      ...scene,
      encounterType: p.type ?? 'other',
      objective: p.objective ?? '',
      setup: p.setup ?? '',
      reward: p.reward ?? '',
      typeDetails: {
        ...emptyTypeDetails(),
        ...(p.typeDetails ?? {}),
        travel: { ...EMPTY_TRAVEL_MONTAGE, ...(p.typeDetails?.travel ?? {}) },
      },
    };
  } catch {
    return { ...scene, encounterType: 'other', objective: '', setup: scene.content, reward: '', typeDetails: emptyTypeDetails() };
  }
}

function encodeEncounter(e: { type: string; objective: string; setup: string; reward: string; typeDetails: EncounterTypeDetails }): string {
  return JSON.stringify({ type: e.type, objective: e.objective, setup: e.setup, reward: e.reward, typeDetails: e.typeDetails });
}

// ── SceneFormPanel ─────────────────────────────────────────────────────────────

interface SceneFormPanelProps {
  sceneForm:    SceneFormState;
  setSceneForm: React.Dispatch<React.SetStateAction<SceneFormState>>;
  editingId:    string | null;
  onSave:       () => void;
  onCancel:     () => void;
}

function TravelMontageForm({ sceneForm, setSceneForm }: Pick<SceneFormPanelProps, 'sceneForm' | 'setSceneForm'>) {
  const montage = sceneForm.typeDetails.travel ?? EMPTY_TRAVEL_MONTAGE;
  const updateMontage = (field: keyof TravelMontageDetails, value: string) => {
    setSceneForm(f => ({
      ...f,
      typeDetails: {
        ...f.typeDetails,
        travel: { ...EMPTY_TRAVEL_MONTAGE, ...(f.typeDetails.travel ?? {}), [field]: value },
      },
    }));
  };

  return (
    <div className={styles.typeForm}>
      <div className={styles.typeFormHeader}>
        <span className={styles.typeFormTitle}>Travel Montage</span>
        <span className={styles.typeFormHint}>Frame the journey as fast scenes, player spotlights, pressure, and fallout.</span>
      </div>
      <div className={styles.sceneFormRow}>
        <div className={styles.sceneFormField}>
          <label className={styles.sceneFormLabel}>Route / Region</label>
          <input className={styles.sceneFormInput} placeholder="Old road through the Glassfen"
            value={montage.route} onChange={e => updateMontage('route', e.target.value)} />
        </div>
        <div className={styles.sceneFormField}>
          <label className={styles.sceneFormLabel}>Travel Goal</label>
          <input className={styles.sceneFormInput} placeholder="Reach the watchtower before sunset"
            value={montage.travelGoal} onChange={e => updateMontage('travelGoal', e.target.value)} />
        </div>
      </div>
      <div className={styles.sceneFormField}>
        <label className={styles.sceneFormLabel}>Montage Prompt</label>
        <textarea className={`${styles.sceneFormInput} ${styles.sceneFormTextarea}`} rows={2}
          placeholder="Ask each player how they help the group cross, hide, endure, navigate, or keep spirits up."
          value={montage.montagePrompt} onChange={e => updateMontage('montagePrompt', e.target.value)} />
      </div>
      <div className={styles.sceneFormRow}>
        <div className={styles.sceneFormField}>
          <label className={styles.sceneFormLabel}>Party Approach</label>
          <input className={styles.sceneFormInput} placeholder="Stealth, speed, caution, charm, survival..."
            value={montage.partyApproach} onChange={e => updateMontage('partyApproach', e.target.value)} />
        </div>
        <div className={styles.sceneFormField}>
          <label className={styles.sceneFormLabel}>Main Obstacle</label>
          <input className={styles.sceneFormInput} placeholder="Flooded ford, patrols, cursed weather..."
            value={montage.obstacle} onChange={e => updateMontage('obstacle', e.target.value)} />
        </div>
      </div>
      <div className={styles.sceneFormRow}>
        <div className={styles.sceneFormField}>
          <label className={styles.sceneFormLabel}>Complication</label>
          <textarea className={`${styles.sceneFormInput} ${styles.sceneFormTextarea}`} rows={2}
            placeholder="What goes wrong if the montage turns against them?"
            value={montage.complication} onChange={e => updateMontage('complication', e.target.value)} />
        </div>
        <div className={styles.sceneFormField}>
          <label className={styles.sceneFormLabel}>Progress / Win State</label>
          <textarea className={`${styles.sceneFormInput} ${styles.sceneFormTextarea}`} rows={2}
            placeholder="What success earns: time saved, clue found, ally impressed..."
            value={montage.progress} onChange={e => updateMontage('progress', e.target.value)} />
        </div>
      </div>
      <div className={styles.sceneFormField}>
        <label className={styles.sceneFormLabel}>Cost / Consequence</label>
        <input className={styles.sceneFormInput} placeholder="Lost supplies, fatigue, enemy warning, changed route..."
          value={montage.consequence} onChange={e => updateMontage('consequence', e.target.value)} />
      </div>
    </div>
  );
}

function GenericTypeForm({ sceneForm, setSceneForm }: Pick<SceneFormPanelProps, 'sceneForm' | 'setSceneForm'>) {
  const config = TYPE_SPECIFIC_FIELDS[sceneForm.encounterType];
  if (!config) return null;
  const values = sceneForm.typeDetails[sceneForm.encounterType] as Record<string, string> | undefined ?? {};
  const updateField = (field: string, value: string) => {
    setSceneForm(f => ({
      ...f,
      typeDetails: {
        ...f.typeDetails,
        [f.encounterType]: { ...((f.typeDetails[f.encounterType] as Record<string, string> | undefined) ?? {}), [field]: value },
      },
    }));
  };

  return (
    <div className={styles.typeForm}>
      <div className={styles.typeFormHeader}>
        <span className={styles.typeFormTitle}>{config.title}</span>
        <span className={styles.typeFormHint}>{config.hint}</span>
      </div>
      {config.fields.map((field) => (
        <div key={field.key} className={styles.sceneFormField}>
          <label className={styles.sceneFormLabel}>{field.label}</label>
          {field.multiline ? (
            <textarea className={`${styles.sceneFormInput} ${styles.sceneFormTextarea}`} rows={2}
              placeholder={field.placeholder}
              value={values[field.key] ?? ''} onChange={e => updateField(field.key, e.target.value)} />
          ) : (
            <input className={styles.sceneFormInput} placeholder={field.placeholder}
              value={values[field.key] ?? ''} onChange={e => updateField(field.key, e.target.value)} />
          )}
        </div>
      ))}
    </div>
  );
}

function TypeSpecificForm(props: Pick<SceneFormPanelProps, 'sceneForm' | 'setSceneForm'>) {
  if (props.sceneForm.encounterType === 'travel') return <TravelMontageForm {...props} />;
  return <GenericTypeForm {...props} />;
}

function SceneFormPanel({ sceneForm, setSceneForm, editingId, onSave, onCancel }: SceneFormPanelProps) {
  return (
    <div className={styles.sceneForm}>
      <div className={styles.sceneFormRow}>
        <div className={styles.sceneFormField} style={{ flex: 2 }}>
          <label className={styles.sceneFormLabel}>Title <span className={styles.req}>*</span></label>
          <input className={styles.sceneFormInput} autoFocus placeholder="The Ambush at Thornwall…"
            value={sceneForm.title} onChange={e => setSceneForm(f => ({ ...f, title: e.target.value }))} />
        </div>
        <div className={styles.sceneFormField} style={{ flex: 1 }}>
          <label className={styles.sceneFormLabel}>Type</label>
          <select className={styles.sceneFormInput} value={sceneForm.encounterType}
            onChange={e => setSceneForm(f => ({ ...f, encounterType: e.target.value }))}>
            {ENCOUNTER_TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
          </select>
        </div>
      </div>
      <div className={styles.sceneFormField}>
        <label className={styles.sceneFormLabel}>Objective</label>
        <input className={styles.sceneFormInput} placeholder="What should players accomplish or decide?"
          value={sceneForm.objective} onChange={e => setSceneForm(f => ({ ...f, objective: e.target.value }))} />
      </div>
      <div className={styles.sceneFormField}>
        <label className={styles.sceneFormLabel}>Setup / Notes</label>
        <textarea className={`${styles.sceneFormInput} ${styles.sceneFormTextarea}`} rows={3}
          placeholder="Key details, read-aloud text, contingencies…"
          value={sceneForm.setup} onChange={e => setSceneForm(f => ({ ...f, setup: e.target.value }))} />
      </div>
      <div className={styles.sceneFormField}>
        <label className={styles.sceneFormLabel}>Reward / Outcome</label>
        <input className={styles.sceneFormInput} placeholder="XP, loot, story consequence…"
          value={sceneForm.reward} onChange={e => setSceneForm(f => ({ ...f, reward: e.target.value }))} />
      </div>
      <TypeSpecificForm sceneForm={sceneForm} setSceneForm={setSceneForm} />
      <div className={styles.sceneFormActions}>
        <button className={styles.ghostBtn} onClick={onCancel}>Cancel</button>
        <button className={styles.saveSceneBtn} onClick={onSave} disabled={!sceneForm.title.trim()}>
          <Icon name="plus" size={14} /> {editingId ? 'Save Changes' : 'Add Encounter'}
        </button>
      </div>
    </div>
  );
}

// ── EncounterImportPanel ───────────────────────────────────────────────────────

function TravelMontageDetail({ details }: { details: TravelMontageDetails }) {
  const rows = [
    ['Route / Region', details.route],
    ['Travel Goal', details.travelGoal],
    ['Montage Prompt', details.montagePrompt],
    ['Party Approach', details.partyApproach],
    ['Main Obstacle', details.obstacle],
    ['Complication', details.complication],
    ['Progress / Win State', details.progress],
    ['Cost / Consequence', details.consequence],
  ].filter(([, value]) => value.trim());

  if (rows.length === 0) return <p className={styles.encDetailEmpty}>No travel montage details yet. Click edit to add them.</p>;
  return (
    <div className={styles.typeDetail}>
      <span className={styles.typeFormTitle}>Travel Montage</span>
      {rows.map(([label, value]) => (
        <div key={label} className={styles.encDetailRow}>
          <span className={styles.encDetailLabel}>{label}</span>
          <span className={`${styles.encDetailValue} ${styles.encDetailPre}`}>{value}</span>
        </div>
      ))}
    </div>
  );
}

function GenericTypeDetail({ enc }: { enc: Encounter }) {
  const config = TYPE_SPECIFIC_FIELDS[enc.encounterType];
  if (!config) return null;
  const values = enc.typeDetails[enc.encounterType] as Record<string, string> | undefined ?? {};
  const rows = config.fields
    .map(field => [field.label, values[field.key] ?? ''] as const)
    .filter(([, value]) => value.trim());

  if (rows.length === 0) return <p className={styles.encDetailEmpty}>No {config.title.toLowerCase()} details yet. Click edit to add them.</p>;
  return (
    <div className={styles.typeDetail}>
      <span className={styles.typeFormTitle}>{config.title}</span>
      {rows.map(([label, value]) => (
        <div key={label} className={styles.encDetailRow}>
          <span className={styles.encDetailLabel}>{label}</span>
          <span className={`${styles.encDetailValue} ${styles.encDetailPre}`}>{value}</span>
        </div>
      ))}
    </div>
  );
}

function EncounterTypeDetail({ enc }: { enc: Encounter }) {
  if (enc.encounterType === 'travel') return <TravelMontageDetail details={enc.typeDetails.travel ?? EMPTY_TRAVEL_MONTAGE} />;
  return <GenericTypeDetail enc={enc} />;
}

interface ImportPanelProps {
  encTab:      EncTab;
  enc:         Encounter;
  sessionId:   string;
  allNpcs:     NpcRow[];
  allMonsters: MonsterRow[];
  allMinis:    MiniRow[];
  onUpdated:   (u: Encounter) => void;
}

function EncounterImportPanel({ encTab, enc, sessionId, allNpcs, allMonsters, allMinis, onUpdated }: ImportPanelProps) {
  const [search,        setSearch]        = useState('');
  const [monsterCounts, setMonsterCounts] = useState<Record<string, number>>({});
  const [monsterNotes,  setMonsterNotes]  = useState<Record<string, string>>({});
  const [miniCounts,    setMiniCounts]    = useState<Record<string, number>>({});

  async function addNpc(npcId: string) {
    await atlas.db.run('INSERT OR IGNORE INTO session_scene_npcs (scene_id,npc_id) VALUES (?,?)', [enc.id, npcId]);
    await atlas.db.run('INSERT OR IGNORE INTO session_npcs (session_id,npc_id) VALUES (?,?)', [sessionId, npcId]);
    onUpdated({ ...enc, npcIds: [...enc.npcIds, npcId] });
  }
  async function removeNpc(npcId: string) {
    await atlas.db.run('DELETE FROM session_scene_npcs WHERE scene_id=? AND npc_id=?', [enc.id, npcId]);
    onUpdated({ ...enc, npcIds: enc.npcIds.filter(id => id !== npcId) });
  }

  async function addMonster(monsterId: string) {
    const count = monsterCounts[monsterId] ?? 1;
    const notes = monsterNotes[monsterId]  ?? null;
    await atlas.db.run(
      `INSERT INTO session_scene_monsters (scene_id,monster_id,count,notes) VALUES (?,?,?,?)
       ON CONFLICT(scene_id,monster_id) DO UPDATE SET count=excluded.count,notes=excluded.notes`,
      [enc.id, monsterId, count, notes],
    );
    const existing = enc.monsters.find(m => m.monsterId === monsterId);
    const updated: SceneMonsterEntry[] = existing
      ? enc.monsters.map(m => m.monsterId === monsterId ? { ...m, count, notes: notes ?? undefined } : m)
      : [...enc.monsters, { monsterId, count, notes: notes ?? undefined }];
    onUpdated({ ...enc, monsters: updated });
  }
  async function updateMonsterCount(entry: SceneMonsterEntry, count: number) {
    if (count < 1) return;
    await atlas.db.run('UPDATE session_scene_monsters SET count=? WHERE scene_id=? AND monster_id=?', [count, enc.id, entry.monsterId]);
    onUpdated({ ...enc, monsters: enc.monsters.map(m => m.monsterId === entry.monsterId ? { ...m, count } : m) });
  }
  async function removeMonster(monsterId: string) {
    await atlas.db.run('DELETE FROM session_scene_monsters WHERE scene_id=? AND monster_id=?', [enc.id, monsterId]);
    onUpdated({ ...enc, monsters: enc.monsters.filter(m => m.monsterId !== monsterId) });
  }

  async function addMini(miniId: string) {
    const count = miniCounts[miniId] ?? 1;
    await atlas.db.run(
      `INSERT INTO session_scene_minis (scene_id,mini_id,count) VALUES (?,?,?)
       ON CONFLICT(scene_id,mini_id) DO UPDATE SET count=excluded.count`,
      [enc.id, miniId, count],
    );
    const existing = enc.minis.find(m => m.miniId === miniId);
    const updated: SceneMiniEntry[] = existing
      ? enc.minis.map(m => m.miniId === miniId ? { ...m, count } : m)
      : [...enc.minis, { miniId, count }];
    onUpdated({ ...enc, minis: updated });
  }
  async function updateMiniCount(entry: SceneMiniEntry, count: number) {
    if (count < 1) return;
    await atlas.db.run('UPDATE session_scene_minis SET count=? WHERE scene_id=? AND mini_id=?', [count, enc.id, entry.miniId]);
    onUpdated({ ...enc, minis: enc.minis.map(m => m.miniId === entry.miniId ? { ...m, count } : m) });
  }
  async function removeMini(miniId: string) {
    await atlas.db.run('DELETE FROM session_scene_minis WHERE scene_id=? AND mini_id=?', [enc.id, miniId]);
    onUpdated({ ...enc, minis: enc.minis.filter(m => m.miniId !== miniId) });
  }

  if (encTab === 'npcs') {
    const linked   = enc.npcIds;
    const filtered = allNpcs.filter(n => !search || n.name.toLowerCase().includes(search.toLowerCase()));
    return (
      <div className={styles.importPanel}>
        {linked.length > 0 && (
          <div className={styles.linkedSection}>
            <span className={styles.linkedLabel}>Linked NPCs</span>
            <div className={styles.linkedChips}>
              {linked.map(id => {
                const npc = allNpcs.find(n => n.id === id);
                return (
                  <span key={id} className={styles.linkedChip}>
                    {npc?.name ?? id}
                    <button className={styles.chipRemove} onClick={() => removeNpc(id)}>×</button>
                  </span>
                );
              })}
            </div>
          </div>
        )}
        <input className={styles.importSearch} placeholder="Search NPCs…" value={search} onChange={e => setSearch(e.target.value)} />
        <div className={styles.importList}>
          {filtered.length === 0 && <p className={styles.importEmpty}>No NPCs found.</p>}
          {filtered.map(n => {
            const isLinked = linked.includes(n.id);
            return (
              <div key={n.id} className={`${styles.importRow} ${isLinked ? styles.importRowLinked : ''}`}>
                <div className={styles.importRowInfo}>
                  <span className={styles.importRowName}>{n.name}</span>
                  {n.alias && <span className={styles.importRowMeta}>"{n.alias}"</span>}
                  <span className={styles.importRowMeta}>{n.role} · {n.vital_status}</span>
                </div>
                <button className={isLinked ? styles.importBtnLinked : styles.importBtn}
                  onClick={() => isLinked ? removeNpc(n.id) : addNpc(n.id)}>
                  {isLinked ? '✓ Linked' : '+ Add'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (encTab === 'monsters') {
    const linked   = enc.monsters;
    const filtered = allMonsters.filter(m => !search || m.name.toLowerCase().includes(search.toLowerCase()));
    return (
      <div className={styles.importPanel}>
        {linked.length > 0 && (
          <div className={styles.linkedSection}>
            <span className={styles.linkedLabel}>Encounter Monsters</span>
            <div className={styles.monsterTable}>
              {linked.map(entry => {
                const m = allMonsters.find(x => x.id === entry.monsterId);
                return (
                  <div key={entry.monsterId} className={styles.monsterTableRow}>
                    <div className={styles.monsterTableInfo}>
                      <span className={styles.monsterTableName}>{m?.name ?? entry.monsterId}</span>
                      {m && <span className={styles.monsterTableMeta}>CR {m.challenge_rating} · {m.size} {m.creature_type}</span>}
                      {entry.notes && <span className={styles.monsterTableNotes}>{entry.notes}</span>}
                    </div>
                    <div className={styles.monsterTableControls}>
                      <button className={styles.countBtn} onClick={() => updateMonsterCount(entry, entry.count - 1)} disabled={entry.count <= 1}>−</button>
                      <span className={styles.countVal}>{entry.count}</span>
                      <button className={styles.countBtn} onClick={() => updateMonsterCount(entry, entry.count + 1)}>+</button>
                      <button className={`${styles.encIconBtn} ${styles.encDanger}`} onClick={() => removeMonster(entry.monsterId)}><Icon name="x" size={11} /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <input className={styles.importSearch} placeholder="Search bestiary…" value={search} onChange={e => setSearch(e.target.value)} />
        <div className={styles.importList}>
          {filtered.length === 0 && <p className={styles.importEmpty}>No monsters in bestiary yet.</p>}
          {filtered.map(m => {
            const isLinked = linked.some(e => e.monsterId === m.id);
            return (
              <div key={m.id} className={`${styles.importRow} ${isLinked ? styles.importRowLinked : ''}`}>
                <div className={styles.importRowInfo}>
                  <span className={styles.importRowName}>{m.name}</span>
                  <span className={styles.importRowMeta}>CR {m.challenge_rating} · {m.size} {m.creature_type}{m.is_homebrew === 1 ? ' · Homebrew' : ''}</span>
                </div>
                <div className={styles.importRowActions}>
                  {!isLinked && (
                    <>
                      <div className={styles.countInline}>
                        <button className={styles.countBtn} onClick={() => setMonsterCounts(c => ({ ...c, [m.id]: Math.max(1, (c[m.id] ?? 1) - 1) }))} disabled={(monsterCounts[m.id] ?? 1) <= 1}>−</button>
                        <span className={styles.countVal}>{monsterCounts[m.id] ?? 1}</span>
                        <button className={styles.countBtn} onClick={() => setMonsterCounts(c => ({ ...c, [m.id]: (c[m.id] ?? 1) + 1 }))}>+</button>
                      </div>
                      <input className={styles.notesInline} placeholder="Tactics/notes…"
                        value={monsterNotes[m.id] ?? ''} onChange={e => setMonsterNotes(n => ({ ...n, [m.id]: e.target.value }))} />
                    </>
                  )}
                  <button className={isLinked ? styles.importBtnLinked : styles.importBtn}
                    onClick={() => isLinked ? removeMonster(m.id) : addMonster(m.id)}>
                    {isLinked ? '✓ Added' : '+ Add'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (encTab === 'minis') {
    const linked   = enc.minis;
    const filtered = allMinis.filter(m => !search || m.name.toLowerCase().includes(search.toLowerCase()));
    return (
      <div className={styles.importPanel}>
        {linked.length > 0 && (
          <div className={styles.linkedSection}>
            <span className={styles.linkedLabel}>Mini List</span>
            <div className={styles.monsterTable}>
              {linked.map(entry => {
                const mini = allMinis.find(x => x.id === entry.miniId);
                return (
                  <div key={entry.miniId} className={styles.monsterTableRow}>
                    <div className={styles.monsterTableInfo}>
                      <span className={styles.monsterTableName}>{mini?.name ?? entry.miniId}</span>
                      {mini?.base_size && <span className={styles.monsterTableMeta}>{mini.base_size} base</span>}
                    </div>
                    <div className={styles.monsterTableControls}>
                      <button className={styles.countBtn} onClick={() => updateMiniCount(entry, entry.count - 1)} disabled={entry.count <= 1}>−</button>
                      <span className={styles.countVal}>{entry.count}</span>
                      <button className={styles.countBtn} onClick={() => updateMiniCount(entry, entry.count + 1)}>+</button>
                      <button className={`${styles.encIconBtn} ${styles.encDanger}`} onClick={() => removeMini(entry.miniId)}><Icon name="x" size={11} /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <input className={styles.importSearch} placeholder="Search mini catalogue…" value={search} onChange={e => setSearch(e.target.value)} />
        <div className={styles.importList}>
          {filtered.length === 0 && <p className={styles.importEmpty}>No minis in catalogue yet.</p>}
          {filtered.map(m => {
            const isLinked = linked.some(e => e.miniId === m.id);
            return (
              <div key={m.id} className={`${styles.importRow} ${isLinked ? styles.importRowLinked : ''}`}>
                <div className={styles.importRowInfo}>
                  <span className={styles.importRowName}>{m.name}</span>
                  <span className={styles.importRowMeta}>{m.base_size ?? 'medium'} base · qty {m.quantity}</span>
                </div>
                <div className={styles.importRowActions}>
                  {!isLinked && (
                    <div className={styles.countInline}>
                      <button className={styles.countBtn} onClick={() => setMiniCounts(c => ({ ...c, [m.id]: Math.max(1, (c[m.id] ?? 1) - 1) }))} disabled={(miniCounts[m.id] ?? 1) <= 1}>−</button>
                      <span className={styles.countVal}>{miniCounts[m.id] ?? 1}</span>
                      <button className={styles.countBtn} onClick={() => setMiniCounts(c => ({ ...c, [m.id]: (c[m.id] ?? 1) + 1 }))}>+</button>
                    </div>
                  )}
                  <button className={isLinked ? styles.importBtnLinked : styles.importBtn}
                    onClick={() => isLinked ? removeMini(m.id) : addMini(m.id)}>
                    {isLinked ? '✓ Added' : '+ Add'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return null;
}

// ── Main SessionsView ─────────────────────────────────────────────────────────

export default function SessionsView() {
  const campaign = useCampaignStore(s => s.campaign);
  const [sessions,    setSessions]    = useState<Session[]>([]);
  const [selected,    setSelected]    = useState<Session | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [creating,    setCreating]    = useState(false);
  const [newName,     setNewName]     = useState('');
  const [error,       setError]       = useState<string | null>(null);
  const [activeTab,   setActiveTab]   = useState<DetailTab>('encounters');
  const [notePhase,   setNotePhase]   = useState<'planning' | 'live' | 'recap'>('planning');
  const [noteText,    setNoteText]    = useState('');
  const [prepText,    setPrepText]    = useState('');

  const [encounters,  setEncounters]  = useState<Encounter[]>([]);
  const [expandedId,  setExpandedId]  = useState<string | null>(null);
  const [encTab,      setEncTab]      = useState<EncTab>('details');
  const [addingScene, setAddingScene] = useState(false);
  const [editingId,   setEditingId]   = useState<string | null>(null);
  const [sceneForm,   setSceneForm]   = useState<SceneFormState>(emptySceneForm);

  const [allNpcs,     setAllNpcs]     = useState<NpcRow[]>([]);
  const [allMonsters, setAllMonsters] = useState<MonsterRow[]>([]);
  const [allMinis,    setAllMinis]    = useState<MiniRow[]>([]);
  const [printSession, setPrintSession] = useState<PrintableSession | null>(null);
  const [printBusy, setPrintBusy] = useState(false);

  type RawSession = Record<string, unknown>;
  type RawScene   = Record<string, unknown>;
  type NoteRow    = { id: string; phase: 'planning' | 'live' | 'recap'; content: string; created_at: string; updated_at: string };
  type PrepRow    = { id: string; description: string; done: number; sort_order: number };

  // ── Load sessions ─────────────────────────────────────────────────────────

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
        scheduledAt: r['scheduled_at'] as string | undefined,
        campaignDateStart: r['campaign_date_start'] as string | undefined,
        campaignDateEnd: r['campaign_date_end'] as string | undefined,
        rewards: r['rewards'] as string | undefined,
        followUpHooks: r['follow_up_hooks'] as string | undefined,
        tags: JSON.parse(r['tags'] as string ?? '[]') as string[],
        createdAt: r['created_at'] as string, updatedAt: r['updated_at'] as string,
        scenes: [], prepItems: [], notes: [],
        advancedQuestIds: [], completedQuestIds: [], plotThreadIds: [],
        featuredNpcIds: [], visitedLocationIds: [], eventIds: [], assetIds: [],
      })));
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally     { setLoading(false); }
  }, [campaign]);

  useEffect(() => { load(); }, [load]);

  // ── Load lookup data (npcs / monsters / minis) ────────────────────────────

  const loadLookups = useCallback(async () => {
    if (!campaign) return;
    const [npcs, monsters, minis] = await Promise.all([
      atlas.db.query<NpcRow>('SELECT id,name,alias,role,vital_status FROM npcs WHERE campaign_id=? ORDER BY name ASC', [campaign.id]),
      atlas.db.query<MonsterRow>('SELECT id,name,creature_type,size,challenge_rating,is_homebrew FROM monsters WHERE campaign_id=? ORDER BY name ASC', [campaign.id]),
      atlas.db.query<MiniRow>('SELECT id,name,base_size,quantity FROM minis WHERE campaign_id=? ORDER BY name ASC', [campaign.id]),
    ]);
    setAllNpcs(npcs); setAllMonsters(monsters); setAllMinis(minis);
  }, [campaign]);

  useEffect(() => { loadLookups(); }, [loadLookups]);

  useEffect(() => atlas.on.moduleEvent(({ event }) => {
    if (['npc:created', 'npc:updated', 'bestiary:created', 'bestiary:updated',
         'mini-catalogue:created', 'mini-catalogue:updated'].includes(event)) {
      void loadLookups();
    }
  }), [loadLookups]);

  // ── Load scenes with encounter data ───────────────────────────────────────

  async function loadScenes(sessionId: string) {
    // Always load the core scenes table first — this must never fail.
    const sceneRows = await atlas.db.query<RawScene>(
      'SELECT * FROM session_scenes WHERE session_id=? ORDER BY sort_order ASC',
      [sessionId],
    );

    // The encounter junction tables (session_scene_monsters etc.) only exist after
    // migration v6 runs. Guard each query individually so a missing table never
    // kills the scene list.
    const safeQuery = async <T,>(sql: string): Promise<T[]> => {
      try { return await atlas.db.query<T>(sql, [sessionId]); }
      catch { return []; }
    };

    const [monsterRows, miniRows, npcRows] = await Promise.all([
      safeQuery<SceneMonsterRow>(`SELECT ssm.* FROM session_scene_monsters ssm JOIN session_scenes ss ON ss.id=ssm.scene_id WHERE ss.session_id=?`),
      safeQuery<SceneMiniRow>(`SELECT ssmi.* FROM session_scene_minis ssmi JOIN session_scenes ss ON ss.id=ssmi.scene_id WHERE ss.session_id=?`),
      safeQuery<SceneNpcRow>(`SELECT ssn.* FROM session_scene_npcs ssn JOIN session_scenes ss ON ss.id=ssn.scene_id WHERE ss.session_id=?`),
    ]);

    setEncounters(sceneRows.map(r => {
      const sid = r['id'] as string;
      return parseEncounter({
        id: sid, title: r['title'] as string, content: r['content'] as string ?? '',
        order: r['sort_order'] as number, locationId: r['location_id'] as string | null,
        npcIds:   npcRows.filter(n => n.scene_id === sid).map(n => n.npc_id),
        monsters: monsterRows.filter(m => m.scene_id === sid).map(m => ({ monsterId: m.monster_id, count: m.count, notes: m.notes ?? undefined })),
        minis:    miniRows.filter(m => m.scene_id === sid).map(m => ({ miniId: m.mini_id, count: m.count })),
        played: (r['played'] as number) === 1,
      });
    }));
  }

  // ── Load notes + prep ─────────────────────────────────────────────────────

  async function loadDetail(id: string) {
    const [notes, preps] = await Promise.all([
      atlas.db.query<NoteRow>('SELECT * FROM session_notes WHERE session_id=? ORDER BY created_at ASC', [id]),
      atlas.db.query<PrepRow>('SELECT * FROM session_prep_items WHERE session_id=? ORDER BY sort_order ASC', [id]),
    ]);
    const mappedNotes: SessionNote[]     = notes.map(n => ({ id: n.id, phase: n.phase, content: n.content, createdAt: n.created_at, updatedAt: n.updated_at }));
    const mappedPreps: SessionPrepItem[] = preps.map(p => ({ id: p.id, description: p.description, done: p.done === 1 }));
    setSessions(prev => prev.map(s => s.id === id ? { ...s, notes: mappedNotes, prepItems: mappedPreps } : s));
    setSelected(prev => prev?.id === id ? { ...prev, notes: mappedNotes, prepItems: mappedPreps } : prev);
  }

  async function handleSelect(s: Session) {
    setSelected(s); setActiveTab('encounters'); setExpandedId(null);
    setEncTab('details'); setAddingScene(false); setEditingId(null);
    await Promise.all([loadDetail(s.id), loadScenes(s.id)]);
  }

  // ── Session CRUD ──────────────────────────────────────────────────────────

  async function createSession() {
    if (!newName.trim() || !campaign) return;
    const id = crypto.randomUUID(), now = new Date().toISOString(), num = (sessions[0]?.sessionNumber ?? 0) + 1;
    await atlas.db.run(
      `INSERT INTO sessions (id,campaign_id,name,description,session_number,status,tags,created_at,updated_at) VALUES (?,?,?,?,?,'planned','[]',?,?)`,
      [id, campaign.id, newName.trim(), '', num, now, now],
    );
    const s: Session = {
      id, name: newName.trim(), description: '', sessionNumber: num, status: 'planned',
      tags: [], scenes: [], prepItems: [], notes: [],
      advancedQuestIds: [], completedQuestIds: [], plotThreadIds: [],
      featuredNpcIds: [], visitedLocationIds: [], eventIds: [], assetIds: [],
      createdAt: now, updatedAt: now,
    };
    setSessions(prev => [s, ...prev]); setNewName(''); setCreating(false);
    setSelected(s); setEncounters([]); setActiveTab('encounters');
  }

  async function updateStatus(id: string, status: SessionStatus) {
    const now = new Date().toISOString();
    await atlas.db.run('UPDATE sessions SET status=?,updated_at=? WHERE id=?', [status, now, id]);
    setSessions(prev => prev.map(s => s.id === id ? { ...s, status, updatedAt: now } : s));
    setSelected(prev => prev?.id === id ? { ...prev, status, updatedAt: now } : prev);
  }

  async function addNote() {
    if (!selected || !noteText.trim()) return;
    const id = crypto.randomUUID(), now = new Date().toISOString();
    await atlas.db.run('INSERT INTO session_notes (id,session_id,phase,content,created_at,updated_at) VALUES (?,?,?,?,?,?)', [id, selected.id, notePhase, noteText.trim(), now, now]);
    setNoteText(''); await loadDetail(selected.id);
  }

  async function togglePrep(item: SessionPrepItem) {
    if (!selected) return;
    await atlas.db.run('UPDATE session_prep_items SET done=? WHERE id=?', [item.done ? 0 : 1, item.id]);
    await loadDetail(selected.id);
  }

  async function addPrep() {
    if (!selected || !prepText.trim()) return;
    const id = crypto.randomUUID(), ord = selected.prepItems.length;
    await atlas.db.run('INSERT INTO session_prep_items (id,session_id,description,done,sort_order) VALUES (?,?,?,0,?)', [id, selected.id, prepText.trim(), ord]);
    setPrepText(''); await loadDetail(selected.id);
  }

  // ── Encounter CRUD ────────────────────────────────────────────────────────

  function openAddScene() {
    setSceneForm(emptySceneForm());
    setEditingId(null); setAddingScene(true);
  }

  function openEditScene(enc: Encounter) {
    setSceneForm({ title: enc.title, encounterType: enc.encounterType, objective: enc.objective, setup: enc.setup, reward: enc.reward, typeDetails: enc.typeDetails });
    setEditingId(enc.id); setAddingScene(false);
  }

  async function saveScene() {
    if (!selected || !sceneForm.title.trim()) return;
    const content = encodeEncounter({ type: sceneForm.encounterType, objective: sceneForm.objective, setup: sceneForm.setup, reward: sceneForm.reward, typeDetails: sceneForm.typeDetails });
    if (editingId) {
      await atlas.db.run('UPDATE session_scenes SET title=?,content=?,updated_at=? WHERE id=?', [sceneForm.title.trim(), content, new Date().toISOString(), editingId]);
      setEditingId(null);
    } else {
      const id = crypto.randomUUID(), ord = encounters.length;
      await atlas.db.run('INSERT INTO session_scenes (id,session_id,title,content,sort_order,played) VALUES (?,?,?,?,?,0)', [id, selected.id, sceneForm.title.trim(), content, ord]);
      setAddingScene(false);
    }
    await loadScenes(selected.id);
    setSceneForm(emptySceneForm());
  }

  async function togglePlayed(enc: Encounter) {
    await atlas.db.run('UPDATE session_scenes SET played=? WHERE id=?', [enc.played ? 0 : 1, enc.id]);
    await loadScenes(selected!.id);
  }

  async function deleteScene(id: string) {
    if (!window.confirm('Remove this encounter?')) return;
    await atlas.db.run('DELETE FROM session_scenes WHERE id=?', [id]);
    await loadScenes(selected!.id);
    if (expandedId === id) setExpandedId(null);
    if (editingId  === id) setEditingId(null);
  }

  async function moveScene(enc: Encounter, dir: -1 | 1) {
    const idx = encounters.findIndex(e => e.id === enc.id), swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= encounters.length) return;
    const swap = encounters[swapIdx]!;
    await Promise.all([
      atlas.db.run('UPDATE session_scenes SET sort_order=? WHERE id=?', [swap.order, enc.id]),
      atlas.db.run('UPDATE session_scenes SET sort_order=? WHERE id=?', [enc.order, swap.id]),
    ]);
    await loadScenes(selected!.id);
  }

  function handleEncounterUpdated(updated: Encounter) {
    setEncounters(prev => prev.map(e => e.id === updated.id ? updated : e));
  }

  const typeInfo = (val: string) => ENCOUNTER_TYPES.find(t => t.value === val) ?? ENCOUNTER_TYPES[ENCOUNTER_TYPES.length - 1]!;

  function encTabBadge(enc: Encounter, tab: EncTab): number | null {
    if (tab === 'npcs')     return enc.npcIds.length   || null;
    if (tab === 'monsters') return enc.monsters.length || null;
    if (tab === 'minis')    return enc.minis.length    || null;
    return null;
  }

  async function openPrintPreview() {
    if (!selected) return;
    setPrintBusy(true);
    try {
      const dto = await getPrintableSession(selected.id);
      setPrintSession(dto);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setPrintBusy(false);
    }
  }

  async function exportSessionHtml() {
    if (!selected) return;
    setPrintBusy(true);
    try {
      const dto = await getPrintableSession(selected.id);
      const html = renderPrintableSessionHtml(dto);
      const stamp = new Date().toISOString().slice(0, 10);
      const fileName = `session-${selected.sessionNumber}-${selected.name}-${stamp}.html`
        .toLowerCase()
        .replace(/[^a-z0-9._-]+/g, '-')
        .replace(/-+/g, '-');
      const result = await atlas.exports.saveSessionHtml(fileName, html);
      if (!result.ok || !result.path) throw new Error(result.error ?? 'Failed to export session document');
      await atlas.app.showInFolder(result.path);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setPrintBusy(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className={styles.root}>
      <header className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <h2 className={styles.title}>Sessions</h2>
          <span className={styles.count}>{sessions.length}</span>
        </div>
        <button className={styles.createBtn} onClick={() => setCreating(v => !v)}>
          <Icon name="plus" size={16} /> New Session
        </button>
      </header>

      {creating && (
        <div className={styles.createBar}>
          <input className={styles.input} autoFocus placeholder="Session name…"
            value={newName} onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && createSession()} />
          <button className={styles.createBtn} onClick={createSession} disabled={!newName.trim()}>Create</button>
          <button className={styles.ghostBtn} onClick={() => setCreating(false)}>Cancel</button>
        </div>
      )}
      {error && <div className={styles.errorBar}><Icon name="alert" size={15} /> {error}</div>}

      <div className={styles.body}>
        {/* Session list */}
        <div className={styles.list}>
          {loading ? (
            <div className={styles.empty}><Icon name="loader" size={22} className={styles.spin} /></div>
          ) : sessions.length === 0 ? (
            <div className={styles.empty}><Icon name="calendar" size={32} className={styles.emptyIcon} /><p>No sessions yet.</p></div>
          ) : sessions.map(s => (
            <button key={s.id} className={`${styles.sessionItem} ${selected?.id === s.id ? styles.active : ''}`} onClick={() => handleSelect(s)}>
              <div className={styles.sessionNum}>#{s.sessionNumber}</div>
              <div className={styles.sessionInfo}>
                <span className={styles.sessionName}>{s.name}</span>
                <span className={styles.sessionStatus} style={{ color: STATUS_COLOUR[s.status] }}>{s.status.replace('_', ' ')}</span>
              </div>
              {s.scheduledAt && <span className={styles.sessionDate}>{new Date(s.scheduledAt).toLocaleDateString()}</span>}
            </button>
          ))}
        </div>

        {/* Detail panel */}
        {selected ? (
          <div className={styles.detail}>
            <div className={styles.detailHeader}>
              <div className={styles.detailHeaderInner}>
                <div>
                  <h2 className={styles.detailTitle}><span className={styles.detailNum}>#{selected.sessionNumber}</span> {selected.name}</h2>
                  <div className={styles.statusRow}>
                    {(['planned', 'in_progress', 'completed', 'cancelled'] as SessionStatus[]).map(st => (
                      <button key={st} className={`${styles.statusBtn} ${selected.status === st ? styles.statusActive : ''}`}
                        style={selected.status === st ? { borderColor: STATUS_COLOUR[st], color: STATUS_COLOUR[st] } : {}}
                        onClick={() => updateStatus(selected.id, st)}>{st.replace('_', ' ')}</button>
                    ))}
                  </div>
                </div>
                <div className={styles.headerActions}>
                  <button className={styles.ghostBtn} onClick={openPrintPreview} disabled={printBusy}>
                    {printBusy ? 'Loading...' : 'Print Preview'}
                  </button>
                  <button className={styles.ghostBtn} onClick={exportSessionHtml} disabled={printBusy}>
                    {printBusy ? 'Working...' : 'Export HTML'}
                  </button>
                </div>
              </div>
            </div>

            <div className={styles.tabBar}>
              {DETAIL_TABS.map(tab => (
                <button key={tab} className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ''}`} onClick={() => setActiveTab(tab)}>
                  {tab === 'encounters' && <Icon name="map" size={13} />}
                  {tab === 'prep'       && <Icon name="scroll" size={13} />}
                  {tab === 'notes'      && <Icon name="scroll" size={13} />}
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  {tab === 'encounters' && encounters.length > 0 && <span className={styles.tabBadge}>{encounters.length}</span>}
                  {tab === 'prep' && selected.prepItems.length > 0 && <span className={styles.tabBadge}>{selected.prepItems.filter(p => p.done).length}/{selected.prepItems.length}</span>}
                </button>
              ))}
            </div>

            <div className={styles.detailBody}>

              {/* ── ENCOUNTERS TAB ── */}
              {activeTab === 'encounters' && (
                <div className={styles.encounterSection}>
                  <div className={styles.encounterHeader}>
                    <span className={styles.encounterSummary}>
                      {encounters.length === 0 ? 'No encounters planned yet' : `${encounters.filter(e => e.played).length} / ${encounters.length} completed`}
                    </span>
                    {!addingScene && editingId === null && (
                      <button className={styles.addEncounterBtn} onClick={openAddScene}><Icon name="plus" size={13} /> Add Encounter</button>
                    )}
                  </div>

                  {addingScene && (
                    <SceneFormPanel sceneForm={sceneForm} setSceneForm={setSceneForm} editingId={editingId}
                      onSave={saveScene} onCancel={() => { setAddingScene(false); setSceneForm(emptySceneForm()); }} />
                  )}

                  <div className={styles.encounterList}>
                    {encounters.length === 0 && !addingScene && (
                      <div className={styles.encounterEmpty}>
                        <p>Plan your session by adding encounters below.</p>
                        <button className={styles.addEncounterBtn} onClick={openAddScene}><Icon name="plus" size={13} /> Add First Encounter</button>
                      </div>
                    )}

                    {encounters.map((enc, idx) => {
                      const info       = typeInfo(enc.encounterType);
                      const isExpanded = expandedId === enc.id;
                      const isEditing  = editingId  === enc.id;

                      return (
                        <div key={enc.id} className={`${styles.encounterCard} ${enc.played ? styles.encounterPlayed : ''}`}>

                          {/* Card header */}
                          <div className={styles.encounterCardHeader}>
                            <button className={`${styles.playedToggle} ${enc.played ? styles.playedDone : ''}`}
                              onClick={() => togglePlayed(enc)} title={enc.played ? 'Mark unplayed' : 'Mark played'}>
                              {enc.played ? '✓' : idx + 1}
                            </button>
                            <span className={styles.encounterTypePill}>{info!.icon} {info!.label}</span>
                            <span className={styles.encounterTitle}>{enc.title}</span>

                            {/* Import summary badges */}
                            <div className={styles.encBadges}>
                              {enc.npcIds.length > 0   && <span className={styles.encBadge} title="NPCs linked">👤 {enc.npcIds.length}</span>}
                              {enc.monsters.length > 0 && <span className={styles.encBadge} title="Monsters">{enc.monsters.reduce((s, m) => s + m.count, 0)}× 💀</span>}
                              {enc.minis.length > 0    && <span className={styles.encBadge} title="Minis needed">{enc.minis.reduce((s, m) => s + m.count, 0)}× 🎲</span>}
                            </div>

                            <div className={styles.encounterCardActions}>
                              <button className={styles.encIconBtn} onClick={() => moveScene(enc, -1)} disabled={idx === 0} title="Move up">
                                <Icon name="chevron-right" size={12} style={{ transform: 'rotate(-90deg)' }} />
                              </button>
                              <button className={styles.encIconBtn} onClick={() => moveScene(enc, 1)} disabled={idx === encounters.length - 1} title="Move down">
                                <Icon name="chevron-right" size={12} style={{ transform: 'rotate(90deg)' }} />
                              </button>
                              <button className={styles.encIconBtn} onClick={() => { openEditScene(enc); setExpandedId(enc.id); setEncTab('details'); }} title="Edit">
                                <Icon name="scroll" size={12} />
                              </button>
                              <button className={`${styles.encIconBtn} ${styles.encDanger}`} onClick={() => deleteScene(enc.id)} title="Delete">
                                <Icon name="x" size={12} />
                              </button>
                              <button className={styles.encIconBtn} onClick={() => { const next = isExpanded ? null : enc.id; setExpandedId(next); if (next) setEncTab('details'); }} title="Expand">
                                <Icon name="chevron-right" size={12} style={{ transform: isExpanded ? 'rotate(-90deg)' : 'rotate(90deg)', transition: 'transform .15s' }} />
                              </button>
                            </div>
                          </div>

                          {/* Expanded body */}
                          {isExpanded && (
                            <div className={styles.encounterCardBody}>

                              {/* Sub-tab bar */}
                              <div className={styles.encSubTabBar}>
                                {ENC_TABS.map(t => {
                                  const badge = encTabBadge(enc, t);
                                  return (
                                    <button key={t}
                                      className={`${styles.encSubTab} ${encTab === t ? styles.encSubTabActive : ''}`}
                                      onClick={() => { setEncTab(t); if (isEditing && t !== 'details') setEditingId(null); }}>
                                      {t === 'details'  && '📋 '}
                                      {t === 'npcs'     && '👤 '}
                                      {t === 'monsters' && '💀 '}
                                      {t === 'minis'    && '🎲 '}
                                      {t.charAt(0).toUpperCase() + t.slice(1)}
                                      {badge !== null && <span className={styles.encSubTabBadge}>{badge}</span>}
                                    </button>
                                  );
                                })}
                              </div>

                              {/* Details sub-tab */}
                              {encTab === 'details' && (
                                isEditing ? (
                                  <SceneFormPanel sceneForm={sceneForm} setSceneForm={setSceneForm} editingId={editingId}
                                    onSave={saveScene} onCancel={() => setEditingId(null)} />
                                ) : (
                                  <div className={styles.encounterDetail}>
                                    {enc.objective && <div className={styles.encDetailRow}><span className={styles.encDetailLabel}>Objective</span><span className={styles.encDetailValue}>{enc.objective}</span></div>}
                                    {enc.setup     && <div className={styles.encDetailRow}><span className={styles.encDetailLabel}>Setup / Notes</span><span className={`${styles.encDetailValue} ${styles.encDetailPre}`}>{enc.setup}</span></div>}
                                    {enc.reward    && <div className={styles.encDetailRow}><span className={styles.encDetailLabel}>Reward / Outcome</span><span className={styles.encDetailValue}>{enc.reward}</span></div>}
                                    <EncounterTypeDetail enc={enc} />
                                  </div>
                                )
                              )}

                              {/* NPC / Monster / Mini import sub-tabs */}
                              {(encTab === 'npcs' || encTab === 'monsters' || encTab === 'minis') && (
                                <EncounterImportPanel
                                  encTab={encTab} enc={enc} sessionId={selected.id}
                                  allNpcs={allNpcs} allMonsters={allMonsters} allMinis={allMinis}
                                  onUpdated={handleEncounterUpdated} />
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
                        <button className={`${styles.checkbox} ${item.done ? styles.checked : ''}`} onClick={() => togglePrep(item)}>{item.done && '✓'}</button>
                        <span className={item.done ? styles.prepDone : ''}>{item.description}</span>
                      </li>
                    ))}
                    {selected.prepItems.length === 0 && <p className={styles.hint}>No prep items yet.</p>}
                  </ul>
                  <div className={styles.addRow}>
                    <input className={styles.input} placeholder="Add prep item…" value={prepText}
                      onChange={e => setPrepText(e.target.value)} onKeyDown={e => e.key === 'Enter' && addPrep()} />
                    <button className={styles.addBtn} onClick={addPrep} disabled={!prepText.trim()}>Add</button>
                  </div>
                </section>
              )}

              {/* ── NOTES TAB ── */}
              {activeTab === 'notes' && (
                <section className={styles.section}>
                  <div className={styles.phaseTabs}>
                    {(['planning', 'live', 'recap'] as const).map(p => (
                      <button key={p} className={`${styles.phaseTab} ${notePhase === p ? styles.phaseActive : ''}`} onClick={() => setNotePhase(p)}>{p}</button>
                    ))}
                  </div>
                  <div className={styles.notesList}>
                    {selected.notes.filter(n => n.phase === notePhase).map(n => (
                      <div key={n.id} className={styles.note}><p>{n.content}</p><span className={styles.noteMeta}>{new Date(n.createdAt).toLocaleString()}</span></div>
                    ))}
                    {selected.notes.filter(n => n.phase === notePhase).length === 0 && <p className={styles.hint}>No {notePhase} notes yet.</p>}
                  </div>
                  <div className={styles.addRow}>
                    <textarea className={`${styles.input} ${styles.textarea}`} placeholder={`Add ${notePhase} note…`} value={noteText} rows={3} onChange={e => setNoteText(e.target.value)} />
                    <button className={styles.addBtn} onClick={addNote} disabled={!noteText.trim()}>Add</button>
                  </div>
                </section>
              )}

            </div>
          </div>
        ) : (
          <div className={styles.detailEmpty}>
            <Icon name="calendar" size={40} className={styles.emptyIcon} />
            <p>Select a session to view details.</p>
          </div>
        )}
      </div>
      {printSession && (
        <PrintSessionView
          session={printSession}
          onClose={() => setPrintSession(null)}
        />
      )}
    </div>
  );
}
