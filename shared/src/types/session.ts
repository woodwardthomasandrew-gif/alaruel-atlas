export type SessionStatus = 'planned'|'in_progress'|'completed'|'cancelled';
export interface SessionNote     { id:string; phase:'planning'|'live'|'recap'; content:string; createdAt:string; updatedAt:string; }
export interface SessionPrepItem { id:string; description:string; done:boolean; }
export interface SceneMonsterEntry { monsterId:string; count:number; notes?:string; }
export interface SceneMiniEntry    { miniId:string; count:number; }
export interface SessionScene  { id:string; title:string; content:string; order:number; locationId:string|null; npcIds:string[]; monsters:SceneMonsterEntry[]; minis:SceneMiniEntry[]; played:boolean; }
export interface Session {
  id:string; name:string; description:string; sessionNumber:number; status:SessionStatus;
  scheduledAt?:string; startedAt?:string; endedAt?:string; durationMinutes?:number;
  campaignDateStart?:string; campaignDateEnd?:string; rewards?:string; followUpHooks?:string;
  scenes:SessionScene[]; prepItems:SessionPrepItem[]; notes:SessionNote[];
  advancedQuestIds:string[]; completedQuestIds:string[]; plotThreadIds:string[];
  featuredNpcIds:string[]; visitedLocationIds:string[]; eventIds:string[]; assetIds:string[];
  tags:string[]; createdAt:string; updatedAt:string;
}
