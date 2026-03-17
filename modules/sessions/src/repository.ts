import { BaseRepository }        from '../../_framework/src/index';
import type { IDatabaseManager } from '../../../core/database/src/types';
import type { Logger }           from '../../../core/logger/src/types';
import type { Session, SessionNote, SessionPrepItem, SessionScene } from '../../../shared/src/types/session';
import type { SessionRow, SessionNoteRow, SessionPrepItemRow, SessionSceneRow,
              CreateSessionInput, UpdateSessionInput } from './types';

function rowToSession(row: SessionRow): Session {
  return {
    id:               row.id,
    name:             row.name,
    description:      row.description,
    sessionNumber:    row.session_number,
    status:           row.status,
    scheduledAt:      row.scheduled_at   as Session['scheduledAt']   ?? undefined,
    startedAt:        row.started_at     as Session['startedAt']     ?? undefined,
    endedAt:          row.ended_at       as Session['endedAt']       ?? undefined,
    durationMinutes:  row.duration_minutes ?? undefined,
    campaignDateStart:row.campaign_date_start as Session['campaignDateStart'] ?? undefined,
    campaignDateEnd:  row.campaign_date_end   as Session['campaignDateEnd']   ?? undefined,
    rewards:          row.rewards         ?? undefined,
    followUpHooks:    row.follow_up_hooks ?? undefined,
    tags:             JSON.parse(row.tags) as string[],
    scenes:           [],
    prepItems:        [],
    notes:            [],
    advancedQuestIds:   [],
    completedQuestIds:  [],
    plotThreadIds:      [],
    featuredNpcIds:     [],
    visitedLocationIds: [],
    eventIds:           [],
    assetIds:           [],
    createdAt:        row.created_at as Session['createdAt'],
    updatedAt:        row.updated_at as Session['updatedAt'],
  };
}

function rowToNote(r: SessionNoteRow): SessionNote {
  return { id: r.id, phase: r.phase, content: r.content,
    createdAt: r.created_at as SessionNote['createdAt'],
    updatedAt: r.updated_at as SessionNote['updatedAt'] };
}

function rowToPrep(r: SessionPrepItemRow): SessionPrepItem {
  return { id: r.id, description: r.description, done: r.done === 1 };
}

function rowToScene(r: SessionSceneRow): SessionScene {
  return { id: r.id, title: r.title, content: r.content,
    order: r.sort_order, locationId: r.location_id, npcIds: [], played: r.played === 1 };
}

export class SessionsRepository extends BaseRepository {
  constructor(db: IDatabaseManager, log: Logger) {
    super('sessions', db, log);
  }

  findAll(): Session[] {
    return this.query<SessionRow>(
      'SELECT * FROM sessions WHERE campaign_id = ? ORDER BY session_number DESC',
      [this.campaignId],
    ).map(rowToSession);
  }

  findById(id: string): Session | null {
    const row = this.queryOne<SessionRow>(
      'SELECT * FROM sessions WHERE id = ? AND campaign_id = ?',
      [id, this.campaignId],
    );
    if (!row) return null;
    const s = rowToSession(row);
    s.notes     = this.query<SessionNoteRow>('SELECT * FROM session_notes WHERE session_id = ? ORDER BY created_at ASC', [id]).map(rowToNote);
    s.prepItems = this.query<SessionPrepItemRow>('SELECT * FROM session_prep_items WHERE session_id = ? ORDER BY sort_order ASC', [id]).map(rowToPrep);
    s.scenes    = this.query<SessionSceneRow>('SELECT * FROM session_scenes WHERE session_id = ? ORDER BY sort_order ASC', [id]).map(rowToScene);
    const qRows = this.query<{quest_id:string;outcome:string}>('SELECT quest_id, outcome FROM session_quests WHERE session_id = ?', [id]);
    s.advancedQuestIds  = qRows.filter(r => r.outcome === 'advanced').map(r => r.quest_id);
    s.completedQuestIds = qRows.filter(r => r.outcome === 'completed').map(r => r.quest_id);
    s.featuredNpcIds = this.query<{npc_id:string}>('SELECT npc_id FROM session_npcs WHERE session_id = ?', [id]).map(r => r.npc_id);
    return s;
  }

  nextSessionNumber(): number {
    const row = this.queryOne<{mx:number|null}>('SELECT MAX(session_number) AS mx FROM sessions WHERE campaign_id = ?', [this.campaignId]);
    return (row?.mx ?? 0) + 1;
  }

  create(input: CreateSessionInput & { id: string; sessionNumber: number; createdAt: string; updatedAt: string }): Session {
    this.run(
      `INSERT INTO sessions (id, campaign_id, name, description, session_number, status, scheduled_at, tags, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'planned', ?, ?, ?, ?)`,
      [input.id, this.campaignId, input.name, input.description ?? '',
       input.sessionNumber, input.scheduledAt ?? null,
       JSON.stringify(input.tags ?? []), input.createdAt, input.updatedAt],
    );
    return this.findById(input.id)!;
  }

  update(input: UpdateSessionInput & { updatedAt: string }): Session | null {
    const sets: string[] = ['updated_at = ?'];
    const params: (string | number | null)[] = [input.updatedAt];
    if (input.name              !== undefined) { sets.push('name = ?');                params.push(input.name); }
    if (input.description       !== undefined) { sets.push('description = ?');         params.push(input.description); }
    if (input.status            !== undefined) { sets.push('status = ?');              params.push(input.status); }
    if (input.scheduledAt       !== undefined) { sets.push('scheduled_at = ?');        params.push(input.scheduledAt); }
    if (input.campaignDateStart !== undefined) { sets.push('campaign_date_start = ?'); params.push(input.campaignDateStart); }
    if (input.campaignDateEnd   !== undefined) { sets.push('campaign_date_end = ?');   params.push(input.campaignDateEnd); }
    if (input.rewards           !== undefined) { sets.push('rewards = ?');             params.push(input.rewards); }
    if (input.followUpHooks     !== undefined) { sets.push('follow_up_hooks = ?');     params.push(input.followUpHooks); }
    if (input.tags              !== undefined) { sets.push('tags = ?');                params.push(JSON.stringify(input.tags)); }
    params.push(input.id, this.campaignId);
    this.run(`UPDATE sessions SET ${sets.join(', ')} WHERE id = ? AND campaign_id = ?`, params);
    return this.findById(input.id);
  }

  delete(id: string): boolean {
    return this.run('DELETE FROM sessions WHERE id = ? AND campaign_id = ?', [id, this.campaignId]).changes > 0;
  }

  addNote(sessionId: string, phase: 'planning'|'live'|'recap', content: string, id: string, now: string): SessionNote {
    this.run('INSERT INTO session_notes (id, session_id, phase, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      [id, sessionId, phase, content, now, now]);
    return rowToNote(this.queryOne<SessionNoteRow>('SELECT * FROM session_notes WHERE id = ?', [id])!);
  }

  togglePrepItem(id: string, done: boolean): void {
    this.run('UPDATE session_prep_items SET done = ? WHERE id = ?', [done ? 1 : 0, id]);
  }

  addPrepItem(sessionId: string, description: string, id: string, sortOrder: number): SessionPrepItem {
    this.run('INSERT INTO session_prep_items (id, session_id, description, done, sort_order) VALUES (?, ?, ?, 0, ?)',
      [id, sessionId, description, sortOrder]);
    return rowToPrep(this.queryOne<SessionPrepItemRow>('SELECT * FROM session_prep_items WHERE id = ?', [id])!);
  }

  deletePrepItem(id: string): boolean {
    return this.run('DELETE FROM session_prep_items WHERE id = ?', [id]).changes > 0;
  }

  linkQuest(sessionId: string, questId: string, outcome: 'advanced'|'completed'): void {
    this.run('INSERT OR REPLACE INTO session_quests (session_id, quest_id, outcome) VALUES (?, ?, ?)',
      [sessionId, questId, outcome]);
  }

  linkNpc(sessionId: string, npcId: string): void {
    this.run('INSERT OR IGNORE INTO session_npcs (session_id, npc_id) VALUES (?, ?)', [sessionId, npcId]);
  }
}
