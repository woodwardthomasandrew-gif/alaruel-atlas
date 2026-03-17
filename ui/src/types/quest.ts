// ui/src/types/quest.ts — Quest types for the renderer.

export type QuestStatus = 'rumour'|'active'|'on_hold'|'completed'|'failed'|'abandoned'|'hidden';
export type QuestType   = 'main'|'side'|'personal'|'faction'|'exploration'|'fetch'|'escort'|'eliminate'|'mystery';

export interface QuestObjective {
  id:          string;
  description: string;
  completed:   boolean;
  required:    boolean;
  deadline?:   string;
}

export interface QuestNote {
  id:               string;
  content:          string;
  visibleToPlayers: boolean;
  createdAt:        string;
}

export interface Quest {
  id:                   string;
  name:                 string;
  description:          string;
  status:               QuestStatus;
  questType:            QuestType;
  priority:             number;
  startDate?:           string;
  endDate?:             string;
  reward?:              string;
  questGiverNpcId:      string | null;
  involvedNpcIds:       string[];
  sponsorFactionId:     string | null;
  locationIds:          string[];
  plotThreadId:         string | null;
  prerequisiteQuestIds: string[];
  unlocksQuestIds:      string[];
  sessionIds:           string[];
  objectives:           QuestObjective[];
  notes:                QuestNote[];
  tags:                 string[];
  createdAt:            string;
  updatedAt:            string;
}
