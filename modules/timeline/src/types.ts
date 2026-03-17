import type { CampaignEventType, EventCertainty, EventSignificance } from '../../../shared/src/types/event';
export interface EventRow {
  id: string; campaign_id: string; name: string; description: string;
  event_type: CampaignEventType; significance: EventSignificance;
  campaign_date: string|null; campaign_date_end: string|null;
  certainty: EventCertainty; is_player_facing: number;
  location_id: string|null; quest_id: string|null;
  plot_thread_id: string|null; session_id: string|null;
  tags: string; created_at: string; updated_at: string;
}
export interface CreateEventInput {
  name: string; description?: string;
  eventType?: CampaignEventType; significance?: EventSignificance;
  campaignDate?: string; certainty?: EventCertainty;
  isPlayerFacing?: boolean; sessionId?: string; questId?: string; tags?: string[];
}
export interface UpdateEventInput {
  id: string; name?: string; description?: string;
  eventType?: CampaignEventType; significance?: EventSignificance;
  campaignDate?: string|null; certainty?: EventCertainty;
  isPlayerFacing?: boolean; sessionId?: string|null; questId?: string|null;
  plotThreadId?: string|null; tags?: string[];
}
