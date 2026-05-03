// ui/src/utils/printResolver.ts
// Resolve canonical session data and render export-ready HTML.

import { atlas } from '../bridge/atlas';
import type {
  PrintableEntityRef,
  PrintableEncounterTypeDetails,
  PrintablePrepItem,
  PrintableScene,
  PrintableSession,
  PrintableSessionNote,
  PrintableTravelMontageDetails,
} from '../types/print';

interface SessionRow {
  id: string;
  name: string;
  description: string;
  status: string;
  scheduled_at: string | null;
}

interface SceneRow {
  id: string;
  title: string;
  content: string;
  sort_order: number;
  played: number;
}

interface NoteRow {
  id: string;
  phase: 'planning' | 'live' | 'recap';
  content: string;
  created_at: string;
}

interface PrepRow {
  id: string;
  description: string;
  done: number;
}

interface SceneNpcJoinRow {
  scene_id: string;
  npc_id: string;
  npc_name: string;
  alias: string | null;
  role: string;
  vital_status: string;
}

interface SceneMonsterJoinRow {
  scene_id: string;
  monster_id: string;
  monster_name: string | null;
  count: number;
  notes: string | null;
}

interface SceneMiniJoinRow {
  scene_id: string;
  mini_id: string;
  mini_name: string | null;
  count: number;
  base_size: string | null;
  mini_description: string;
}

interface SessionNpcRow {
  npc_id: string;
  npc_name: string;
  alias: string | null;
  role: string;
  vital_status: string;
}

interface EncounterContent {
  type?: string;
  objective?: string;
  setup?: string;
  reward?: string;
  typeDetails?: PrintableEncounterTypeDetails;
}

const EMPTY_TRAVEL_MONTAGE: PrintableTravelMontageDetails = {
  route: '',
  travelGoal: '',
  montagePrompt: '',
  partyApproach: '',
  obstacle: '',
  complication: '',
  progress: '',
  consequence: '',
};

const PRINT_TYPE_FIELDS: Record<string, { title: string; fields: { key: string; label: string }[] }> = {
  combat: { title: 'Combat Frame', fields: [
    { key: 'battlefield', label: 'Battlefield' }, { key: 'stakes', label: 'Stakes' }, { key: 'tactics', label: 'Enemy Tactics' }, { key: 'escalation', label: 'Escalation' },
  ] },
  roleplay: { title: 'Roleplay Beat', fields: [
    { key: 'speaker', label: 'Key Speaker' }, { key: 'agenda', label: 'Agenda' }, { key: 'leverage', label: 'Leverage' }, { key: 'reveal', label: 'Possible Reveal' },
  ] },
  exploration: { title: 'Exploration Site', fields: [
    { key: 'feature', label: 'Signature Feature' }, { key: 'discovery', label: 'Discovery' }, { key: 'hazard', label: 'Hazard' }, { key: 'clue', label: 'Clue / Lead' },
  ] },
  puzzle: { title: 'Puzzle Structure', fields: [
    { key: 'mechanism', label: 'Mechanism' }, { key: 'clue', label: 'Clue' }, { key: 'solution', label: 'Solution' }, { key: 'failure', label: 'Failure State' },
  ] },
  social: { title: 'Social Scene', fields: [
    { key: 'audience', label: 'Audience' }, { key: 'mood', label: 'Mood' }, { key: 'ask', label: 'Ask / Offer' }, { key: 'consequence', label: 'Consequence' },
  ] },
  rest: { title: 'Downtime Beat', fields: [
    { key: 'haven', label: 'Haven' }, { key: 'options', label: 'Downtime Options' }, { key: 'interruption', label: 'Interruption' }, { key: 'benefit', label: 'Benefit' },
  ] },
  revelation: { title: 'Revelation Beat', fields: [
    { key: 'truth', label: 'Truth' }, { key: 'delivery', label: 'Delivery' }, { key: 'evidence', label: 'Evidence' }, { key: 'reaction', label: 'Expected Reaction' },
  ] },
  other: { title: 'Custom Encounter Frame', fields: [
    { key: 'focus', label: 'Focus' }, { key: 'structure', label: 'Structure' }, { key: 'twist', label: 'Twist' }, { key: 'resolution', label: 'Resolution' },
  ] },
};

function parseEncounterContent(raw: string | null | undefined): EncounterContent {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as EncounterContent;
  } catch {
    return { setup: raw };
  }
}

function byScene<T extends { scene_id: string }>(rows: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const bucket = map.get(row.scene_id);
    if (bucket) bucket.push(row);
    else map.set(row.scene_id, [row]);
  }
  return map;
}

function normalizeNpcRow(row: {
  npc_id: string;
  npc_name: string;
  alias: string | null;
  role: string;
  vital_status: string;
}): PrintableEntityRef {
  const details: string[] = [];
  if (row.alias) details.push(`Alias: ${row.alias}`);
  if (row.role) details.push(`Role: ${row.role}`);
  if (row.vital_status) details.push(`Status: ${row.vital_status}`);
  return {
    id: row.npc_id,
    name: row.npc_name,
    count: 1,
    notes: details.join(' | '),
  };
}

function normalizeMonsterRow(row: SceneMonsterJoinRow): PrintableEntityRef {
  return {
    id: row.monster_id,
    name: row.monster_name ?? row.monster_id,
    count: row.count ?? 1,
    notes: row.notes?.trim() ?? '',
  };
}

function normalizeMiniRow(row: SceneMiniJoinRow): PrintableEntityRef {
  const details: string[] = [];
  if (row.base_size) details.push(`Base: ${row.base_size}`);
  if (row.mini_description?.trim()) details.push(row.mini_description.trim());
  return {
    id: row.mini_id,
    name: row.mini_name ?? row.mini_id,
    count: row.count ?? 1,
    notes: details.join(' | '),
  };
}

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderEntityTable(title: string, items: PrintableEntityRef[]): string {
  if (items.length === 0) return `<div class="entity-block"><h4>${title}</h4><p class="muted">None</p></div>`;
  return `
    <div class="entity-block">
      <h4>${title}</h4>
      <table class="entity-table">
        <thead>
          <tr><th>Name</th><th>Count</th><th>Notes</th></tr>
        </thead>
        <tbody>
          ${items.map((item) => `
            <tr>
              <td>${escapeHtml(item.name)}</td>
              <td>${item.count}</td>
              <td>${escapeHtml(item.notes || '-')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function normalizeTypeDetails(content: EncounterContent): PrintableEncounterTypeDetails {
  return {
    ...(content.typeDetails ?? {}),
    travel: { ...EMPTY_TRAVEL_MONTAGE, ...(content.typeDetails?.travel ?? {}) },
  };
}

function renderTravelMontageHtml(details?: PrintableTravelMontageDetails): string {
  if (!details) return '';
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

  if (rows.length === 0) return '';
  return `
    <div class="type-detail">
      <h4>Travel Montage</h4>
      ${rows.map(([label, value]) => `<p><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</p>`).join('')}
    </div>
  `;
}

function renderEncounterTypeDetailsHtml(scene: PrintableScene): string {
  if (scene.encounterType === 'travel') return renderTravelMontageHtml(scene.typeDetails.travel);
  const config = PRINT_TYPE_FIELDS[scene.encounterType];
  const values = scene.typeDetails[scene.encounterType] as Record<string, string> | undefined;
  if (!config || !values) return '';
  const rows = config.fields
    .map(field => [field.label, values[field.key] ?? ''] as const)
    .filter(([, value]) => value.trim());
  if (rows.length === 0) return '';
  return `
    <div class="type-detail">
      <h4>${escapeHtml(config.title)}</h4>
      ${rows.map(([label, value]) => `<p><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</p>`).join('')}
    </div>
  `;
}

export async function getPrintableSession(sessionId: string): Promise<PrintableSession> {
  const sessions = await atlas.db.query<SessionRow>(
    'SELECT id,name,description,status,scheduled_at FROM sessions WHERE id = ?',
    [sessionId],
  );
  const session = sessions[0];
  if (!session) throw new Error(`Session not found: ${sessionId}`);

  const [scenes, notes, prepItems, sceneNpcs, sceneMonsters, sceneMinis, featuredNpcs] = await Promise.all([
    atlas.db.query<SceneRow>(
      'SELECT id,title,content,sort_order,played FROM session_scenes WHERE session_id = ? ORDER BY sort_order ASC',
      [sessionId],
    ),
    atlas.db.query<NoteRow>(
      'SELECT id,phase,content,created_at FROM session_notes WHERE session_id = ? ORDER BY created_at ASC',
      [sessionId],
    ),
    atlas.db.query<PrepRow>(
      'SELECT id,description,done FROM session_prep_items WHERE session_id = ? ORDER BY sort_order ASC',
      [sessionId],
    ),
    atlas.db.query<SceneNpcJoinRow>(
      `SELECT ssn.scene_id, ssn.npc_id, n.name AS npc_name, n.alias, n.role, n.vital_status
       FROM session_scene_npcs ssn
       JOIN npcs n ON n.id = ssn.npc_id
       JOIN session_scenes ss ON ss.id = ssn.scene_id
       WHERE ss.session_id = ?`,
      [sessionId],
    ),
    atlas.db.query<SceneMonsterJoinRow>(
      `SELECT ssm.scene_id, ssm.monster_id, m.name AS monster_name, ssm.count, ssm.notes
       FROM session_scene_monsters ssm
       LEFT JOIN monsters m ON m.id = ssm.monster_id
       JOIN session_scenes ss ON ss.id = ssm.scene_id
       WHERE ss.session_id = ?`,
      [sessionId],
    ),
    atlas.db.query<SceneMiniJoinRow>(
      `SELECT ssi.scene_id, ssi.mini_id, mi.name AS mini_name, ssi.count, mi.base_size, mi.description AS mini_description
       FROM session_scene_minis ssi
       LEFT JOIN minis mi ON mi.id = ssi.mini_id
       JOIN session_scenes ss ON ss.id = ssi.scene_id
       WHERE ss.session_id = ?`,
      [sessionId],
    ),
    atlas.db.query<SessionNpcRow>(
      `SELECT sn.npc_id, n.name AS npc_name, n.alias, n.role, n.vital_status
       FROM session_npcs sn
       JOIN npcs n ON n.id = sn.npc_id
       WHERE sn.session_id = ?
       ORDER BY n.name ASC`,
      [sessionId],
    ),
  ]);

  const npcsByScene = byScene(sceneNpcs);
  const monstersByScene = byScene(sceneMonsters);
  const minisByScene = byScene(sceneMinis);

  const printableScenes: PrintableScene[] = scenes.map((scene) => {
    const content = parseEncounterContent(scene.content);
    return {
      id: scene.id,
      title: scene.title || 'Untitled Scene',
      encounterType: content.type ?? 'other',
      objective: content.objective ?? '',
      setup: content.setup ?? '',
      reward: content.reward ?? '',
      typeDetails: normalizeTypeDetails(content),
      played: scene.played === 1,
      order: scene.sort_order ?? 0,
      npcs: (npcsByScene.get(scene.id) ?? []).map(normalizeNpcRow),
      monsters: (monstersByScene.get(scene.id) ?? []).map(normalizeMonsterRow),
      minis: (minisByScene.get(scene.id) ?? []).map(normalizeMiniRow),
    };
  });

  const printableNotes: PrintableSessionNote[] = notes.map((note) => ({
    id: note.id,
    phase: note.phase,
    content: note.content,
    createdAt: note.created_at,
  }));

  const printablePrep: PrintablePrepItem[] = prepItems.map((item) => ({
    id: item.id,
    description: item.description,
    done: item.done === 1,
  }));

  return {
    id: session.id,
    title: session.name,
    description: session.description ?? '',
    status: session.status,
    scheduledAt: session.scheduled_at ?? null,
    scenes: printableScenes,
    prepItems: printablePrep,
    notes: printableNotes,
    featuredNpcs: featuredNpcs.map(normalizeNpcRow),
  };
}

export function renderPrintableSessionHtml(session: PrintableSession): string {
  const dateLabel = session.scheduledAt ? new Date(session.scheduledAt).toLocaleString() : 'Unscheduled';
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(session.title)} - Session Export</title>
  <style>
    :root { color-scheme: light; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: "Georgia", serif; color: #1d1a17; background: #fff; }
    .doc { max-width: 980px; margin: 0 auto; padding: 1.25rem 1rem 2rem; }
    .page-header, .page-footer { display: none; }
    h1, h2, h3, h4 { margin: 0; color: #2a2018; }
    h1 { font-size: 1.8rem; margin-bottom: .35rem; }
    h2 { font-size: 1.15rem; margin-bottom: .6rem; text-transform: uppercase; letter-spacing: .04em; }
    h3 { font-size: 1rem; margin-bottom: .35rem; }
    h4 { font-size: .85rem; margin-bottom: .35rem; text-transform: uppercase; letter-spacing: .06em; color: #5a4632; }
    p { margin: .25rem 0 .6rem; line-height: 1.45; }
    .muted { color: #6e6256; font-style: italic; }
    .meta { display: flex; gap: .9rem; font-size: .9rem; color: #5f5142; margin-bottom: .8rem; }
    .chip { border: 1px solid #b9a996; border-radius: 999px; padding: .1rem .55rem; text-transform: capitalize; font-size: .78rem; }
    .section { margin-top: 1rem; border: 1px solid #d8ccbf; border-radius: 8px; padding: .8rem; }
    .scene { margin-top: .8rem; border-top: 1px solid #e3d8cc; padding-top: .8rem; }
    .scene:first-of-type { margin-top: 0; border-top: none; padding-top: 0; }
    .entity-grid { display: grid; grid-template-columns: repeat(1, minmax(0, 1fr)); gap: .65rem; }
    .type-detail { margin: .65rem 0; padding: .55rem .65rem; border: 1px solid #e3d8cc; background: #fbf7f1; border-radius: 6px; }
    .type-detail p { margin: .18rem 0 .35rem; }
    .entity-table { width: 100%; border-collapse: collapse; font-size: .86rem; }
    .entity-table th, .entity-table td { border: 1px solid #decebd; padding: .35rem .45rem; text-align: left; vertical-align: top; }
    .entity-table th { background: #f4ede5; font-size: .78rem; letter-spacing: .03em; text-transform: uppercase; color: #5d4b38; }
    .notes-list, .prep-list { margin: 0; padding-left: 1.15rem; }
    .notes-list li, .prep-list li { margin: .2rem 0; }
    @media print {
      @page { size: A4 portrait; margin: 16mm 12mm 16mm; }
      body { background: #fff; }
      .doc { max-width: none; margin: 0; padding: 0; }
      .doc, .section, .scene, .entity-grid, .entity-block, .entity-table, .notes-list, .prep-list { break-inside: auto; page-break-inside: auto; }
      .section > h2, .scene > h3, .entity-block > h4 { break-after: avoid-page; page-break-after: avoid; }
      .entity-table thead { display: table-header-group; }
      .page-header, .page-footer { display: block; position: fixed; left: 0; right: 0; color: #6b5a46; font-size: 10px; }
      .page-header { top: -10mm; border-bottom: 1px solid #d8ccbf; padding: 1mm 2mm; }
      .page-footer { bottom: -10mm; border-top: 1px solid #d8ccbf; padding: 1mm 2mm; text-align: right; }
      .page-number::after { content: counter(page); }
      .page-total::after { content: counter(pages); }
    }
  </style>
</head>
<body>
  <div class="page-header">${escapeHtml(session.title)} | ${escapeHtml(dateLabel)}</div>
  <div class="page-footer">Page <span class="page-number"></span> / <span class="page-total"></span></div>
  <main class="doc">
    <header>
      <h1>${escapeHtml(session.title)}</h1>
      <div class="meta">
        <span>${escapeHtml(dateLabel)}</span>
        <span class="chip">${escapeHtml(session.status)}</span>
      </div>
      ${session.description ? `<p>${escapeHtml(session.description)}</p>` : '<p class="muted">No session summary provided.</p>'}
    </header>

    <section class="section">
      <h2>Scenes</h2>
      ${session.scenes.length === 0 ? '<p class="muted">No scenes added.</p>' : session.scenes.map((scene, index) => `
        <article class="scene">
          <h3>${index + 1}. ${escapeHtml(scene.title)}</h3>
          <div class="meta">
            <span class="chip">${escapeHtml(scene.encounterType)}</span>
            <span>${scene.played ? 'Played' : 'Planned'}</span>
          </div>
          ${scene.objective ? `<p><strong>Objective:</strong> ${escapeHtml(scene.objective)}</p>` : ''}
          ${scene.setup ? `<p><strong>Setup:</strong> ${escapeHtml(scene.setup)}</p>` : ''}
          ${scene.reward ? `<p><strong>Reward:</strong> ${escapeHtml(scene.reward)}</p>` : ''}
          ${renderEncounterTypeDetailsHtml(scene)}
          <div class="entity-grid">
            ${renderEntityTable('NPCs', scene.npcs)}
            ${renderEntityTable('Monsters', scene.monsters)}
            ${renderEntityTable('Minis', scene.minis)}
          </div>
        </article>
      `).join('')}
    </section>

    <section class="section">
      <h2>Featured NPCs</h2>
      ${renderEntityTable('Session NPCs', session.featuredNpcs)}
    </section>

    <section class="section">
      <h2>Prep Items</h2>
      ${session.prepItems.length === 0 ? '<p class="muted">No prep items.</p>' : `
        <ul class="prep-list">
          ${session.prepItems.map((item) => `<li>${item.done ? '[x]' : '[ ]'} ${escapeHtml(item.description)}</li>`).join('')}
        </ul>
      `}
    </section>

    <section class="section">
      <h2>Session Notes</h2>
      ${session.notes.length === 0 ? '<p class="muted">No notes.</p>' : `
        <ul class="notes-list">
          ${session.notes.map((note) => `<li><strong>${escapeHtml(note.phase)}:</strong> ${escapeHtml(note.content)}</li>`).join('')}
        </ul>
      `}
    </section>
  </main>
</body>
</html>`;
}
