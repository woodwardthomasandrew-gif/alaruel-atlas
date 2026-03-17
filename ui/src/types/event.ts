export type CampaignEventType = 'battle'|'political'|'discovery'|'death'|'birth'|'quest'|'faction'|'natural'|'social'|'mystery'|'other';
export type EventCertainty   = 'exact'|'approximate'|'unknown'|'legendary';
export type EventSignificance = 'trivial'|'minor'|'moderate'|'major'|'critical';
export interface CampaignEvent {
  id:string; name:string; description:string;
  eventType:CampaignEventType; significance:EventSignificance;
  campaignDate:string|null; campaignDateEnd?:string; certainty:EventCertainty;
  isPlayerFacing:boolean; locationId:string|null; questId:string|null;
  plotThreadId:string|null; sessionId:string|null;
  npcIds:string[]; factionIds:string[]; causedByEventIds:string[]; consequenceEventIds:string[]; assetIds:string[];
  tags:string[]; createdAt:string; updatedAt:string;
}
