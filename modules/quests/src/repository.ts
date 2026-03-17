import { BaseRepository }        from '../../_framework/src/index';
import type { IDatabaseManager } from '../../../core/database/src/types';
import type { Logger }           from '../../../core/logger/src/types';
import type { Quest, QuestObjective, QuestNote } from '../../../shared/src/types/quest';
import type {
  QuestRow, QuestObjectiveRow, QuestNoteRow,
  CreateQuestInput, UpdateQuestInput, QuestListQuery,
} from './types';

function rowToQuest(row: QuestRow, objectives: QuestObjective[], notes: QuestNote[]): Quest {
  return {
    id:               row.id,
    name:             row.name,
    description:      row.description,
    status:           row.status,
    questType:        row.quest_type,
    priority:         row.priority,
    startDate:        row.start_date as Quest['startDate'] ?? undefined,
    endDate:          row.end_date   as Quest['endDate']   ?? undefined,
    reward:           row.reward     ?? undefined,
    questGiverNpcId:  row.quest_giver_npc_id,
    involvedNpcIds:   [],
    sponsorFactionId: row.sponsor_faction_id,
    locationIds:      [],
    plotThreadId:     row.plot_thread_id,
    prerequisiteQuestIds: [],
    unlocksQuestIds:  [],
    sessionIds:       [],
    objectives,
    notes,
    tags:             JSON.parse(row.tags) as string[],
    createdAt:        row.created_at as Quest['createdAt'],
    updatedAt:        row.updated_at as Quest['updatedAt'],
  };
}

function rowToObjective(row: QuestObjectiveRow): QuestObjective {
  return {
    id:          row.id,
    description: row.description,
    completed:   row.completed === 1,
    required:    row.required  === 1,
    deadline:    row.deadline  as QuestObjective['deadline'] ?? undefined,
  };
}

function rowToNote(row: QuestNoteRow): QuestNote {
  return {
    id:               row.id,
    content:          row.content,
    visibleToPlayers: row.visible_to_players === 1,
    createdAt:        row.created_at as QuestNote['createdAt'],
  };
}

export class QuestsRepository extends BaseRepository {
  constructor(db: IDatabaseManager, log: Logger) {
    super('quests', db, log);
  }

  findById(id: string): Quest | null {
    const row = this.queryOne<QuestRow>(
      'SELECT * FROM quests WHERE id = ? AND campaign_id = ?',
      [id, this.campaignId],
    );
    if (!row) return null;
    const objectives = this.query<QuestObjectiveRow>(
      'SELECT * FROM quest_objectives WHERE quest_id = ? ORDER BY sort_order ASC',
      [id],
    ).map(rowToObjective);
    const notes = this.query<QuestNoteRow>(
      'SELECT * FROM quest_notes WHERE quest_id = ? ORDER BY created_at ASC',
      [id],
    ).map(rowToNote);
    return rowToQuest(row, objectives, notes);
  }

  findAll(query: QuestListQuery = {}): Quest[] {
    const conditions: string[] = ['campaign_id = ?'];
    const params: (string | number)[] = [this.campaignId];
    if (query.status)    { conditions.push('status = ?');     params.push(query.status); }
    if (query.questType) { conditions.push('quest_type = ?'); params.push(query.questType); }
    if (query.search) {
      conditions.push('name LIKE ?');
      params.push(`%${query.search}%`);
    }
    const where  = conditions.join(' AND ');
    const limit  = query.limit  ?? 200;
    const offset = query.offset ?? 0;
    const rows = this.query<QuestRow>(
      `SELECT * FROM quests WHERE ${where} ORDER BY priority DESC, name ASC LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    return rows.map(r => rowToQuest(r, [], []));
  }

  create(input: CreateQuestInput & { id: string; createdAt: string; updatedAt: string }): Quest {
    this.run(
      `INSERT INTO quests
         (id, campaign_id, name, description, status, quest_type, priority,
          plot_thread_id, reward, tags, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.id, this.campaignId, input.name, input.description ?? '',
        input.status ?? 'hidden', input.questType ?? 'side', input.priority ?? 0,
        input.plotThreadId ?? null, input.reward ?? null,
        JSON.stringify(input.tags ?? []), input.createdAt, input.updatedAt,
      ],
    );
    return this.findById(input.id)!;
  }

  update(input: UpdateQuestInput & { updatedAt: string }): Quest | null {
    const sets: string[] = ['updated_at = ?'];
    const params: (string | number | null)[] = [input.updatedAt];
    if (input.name        !== undefined) { sets.push('name = ?');              params.push(input.name); }
    if (input.description !== undefined) { sets.push('description = ?');       params.push(input.description); }
    if (input.status      !== undefined) { sets.push('status = ?');            params.push(input.status); }
    if (input.questType   !== undefined) { sets.push('quest_type = ?');        params.push(input.questType); }
    if (input.priority    !== undefined) { sets.push('priority = ?');          params.push(input.priority); }
    if (input.questGiverNpcId  !== undefined) { sets.push('quest_giver_npc_id = ?'); params.push(input.questGiverNpcId); }
    if (input.sponsorFactionId !== undefined) { sets.push('sponsor_faction_id = ?'); params.push(input.sponsorFactionId); }
    if (input.plotThreadId     !== undefined) { sets.push('plot_thread_id = ?');      params.push(input.plotThreadId); }
    if (input.reward      !== undefined) { sets.push('reward = ?');            params.push(input.reward); }
    if (input.tags        !== undefined) { sets.push('tags = ?');              params.push(JSON.stringify(input.tags)); }
    params.push(input.id, this.campaignId);
    this.run(`UPDATE quests SET ${sets.join(', ')} WHERE id = ? AND campaign_id = ?`, params);
    return this.findById(input.id);
  }

  delete(id: string): boolean {
    return this.run('DELETE FROM quests WHERE id = ? AND campaign_id = ?', [id, this.campaignId]).changes > 0;
  }

  toggleObjective(objectiveId: string, completed: boolean): void {
    this.run('UPDATE quest_objectives SET completed = ? WHERE id = ?', [completed ? 1 : 0, objectiveId]);
  }

  addObjective(questId: string, description: string, required: boolean, id: string): QuestObjective {
    const sortOrder = (this.queryOne<{c:number}>('SELECT COUNT(*) AS c FROM quest_objectives WHERE quest_id = ?', [questId])?.c ?? 0);
    this.run(
      'INSERT INTO quest_objectives (id, quest_id, description, completed, required, sort_order) VALUES (?, ?, ?, 0, ?, ?)',
      [id, questId, description, required ? 1 : 0, sortOrder],
    );
    return rowToObjective(this.queryOne<QuestObjectiveRow>('SELECT * FROM quest_objectives WHERE id = ?', [id])!);
  }

  deleteObjective(id: string): boolean {
    return this.run('DELETE FROM quest_objectives WHERE id = ?', [id]).changes > 0;
  }
}
