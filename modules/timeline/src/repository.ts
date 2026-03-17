import { BaseRepository }        from '../../_framework/src/index';
import type { IDatabaseManager } from '../../../core/database/src/types';
import type { Logger }           from '../../../core/logger/src/types';
import type { CampaignEvent }    from '../../../shared/src/types/event';
import type { EventRow, CreateEventInput, UpdateEventInput } from './types';

function rowToEvent(row: EventRow): CampaignEvent {
  return {
    id: row.id, name: row.name, description: row.description,
    eventType: row.event_type, significance: row.significance,
    campaignDate: row.campaign_date as CampaignEvent['campaignDate'],
    campaignDateEnd: row.campaign_date_end as CampaignEvent['campaignDateEnd'] ?? undefined,
    certainty: row.certainty, isPlayerFacing: row.is_player_facing === 1,
    locationId: row.location_id, questId: row.quest_id,
    plotThreadId: row.plot_thread_id, sessionId: row.session_id,
    npcIds: [], factionIds: [], causedByEventIds: [], consequenceEventIds: [], assetIds: [],
    tags: JSON.parse(row.tags) as string[],
    createdAt: row.created_at as CampaignEvent['createdAt'],
    updatedAt: row.updated_at as CampaignEvent['updatedAt'],
  };
}

export class TimelineRepository extends BaseRepository {
  constructor(db: IDatabaseManager, log: Logger) { super('timeline', db, log); }

  findAll(limit = 200): CampaignEvent[] {
    return this.query<EventRow>(
      'SELECT * FROM campaign_events WHERE campaign_id = ? ORDER BY campaign_date DESC, created_at DESC LIMIT ?',
      [this.campaignId, limit],
    ).map(rowToEvent);
  }

  findById(id: string): CampaignEvent | null {
    const row = this.queryOne<EventRow>('SELECT * FROM campaign_events WHERE id = ? AND campaign_id = ?', [id, this.campaignId]);
    return row ? rowToEvent(row) : null;
  }

  create(input: CreateEventInput & { id: string; createdAt: string; updatedAt: string }): CampaignEvent {
    this.run(
      `INSERT INTO campaign_events
         (id,campaign_id,name,description,event_type,significance,campaign_date,certainty,
          is_player_facing,session_id,quest_id,tags,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [input.id, this.campaignId, input.name, input.description ?? '',
       input.eventType ?? 'other', input.significance ?? 'minor',
       input.campaignDate ?? null, input.certainty ?? 'exact',
       input.isPlayerFacing !== false ? 1 : 0,
       input.sessionId ?? null, input.questId ?? null,
       JSON.stringify(input.tags ?? []), input.createdAt, input.updatedAt],
    );
    return this.findById(input.id)!;
  }

  update(input: UpdateEventInput & { updatedAt: string }): CampaignEvent | null {
    const sets: string[] = ['updated_at = ?'];
    const params: (string|number|null)[] = [input.updatedAt];
    if (input.name        !== undefined) { sets.push('name = ?');             params.push(input.name); }
    if (input.description !== undefined) { sets.push('description = ?');      params.push(input.description); }
    if (input.eventType   !== undefined) { sets.push('event_type = ?');       params.push(input.eventType); }
    if (input.significance!== undefined) { sets.push('significance = ?');     params.push(input.significance); }
    if (input.campaignDate!== undefined) { sets.push('campaign_date = ?');    params.push(input.campaignDate); }
    if (input.certainty   !== undefined) { sets.push('certainty = ?');        params.push(input.certainty); }
    if (input.isPlayerFacing!==undefined){ sets.push('is_player_facing = ?'); params.push(input.isPlayerFacing?1:0); }
    if (input.sessionId   !== undefined) { sets.push('session_id = ?');       params.push(input.sessionId); }
    if (input.questId     !== undefined) { sets.push('quest_id = ?');         params.push(input.questId); }
    if (input.plotThreadId!== undefined) { sets.push('plot_thread_id = ?');   params.push(input.plotThreadId); }
    if (input.tags        !== undefined) { sets.push('tags = ?');             params.push(JSON.stringify(input.tags)); }
    params.push(input.id, this.campaignId);
    this.run(`UPDATE campaign_events SET ${sets.join(', ')} WHERE id = ? AND campaign_id = ?`, params);
    return this.findById(input.id);
  }

  delete(id: string): boolean {
    return this.run('DELETE FROM campaign_events WHERE id = ? AND campaign_id = ?', [id, this.campaignId]).changes > 0;
  }
}
