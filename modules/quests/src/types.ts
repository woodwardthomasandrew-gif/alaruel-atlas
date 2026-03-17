import type { QuestStatus, QuestType } from '../../../shared/src/types/quest';

export interface QuestRow {
  id:                 string;
  campaign_id:        string;
  name:               string;
  description:        string;
  status:             QuestStatus;
  quest_type:         QuestType;
  priority:           number;
  start_date:         string | null;
  end_date:           string | null;
  reward:             string | null;
  quest_giver_npc_id: string | null;
  sponsor_faction_id: string | null;
  plot_thread_id:     string | null;
  tags:               string;
  created_at:         string;
  updated_at:         string;
}

export interface QuestObjectiveRow {
  id:          string;
  quest_id:    string;
  description: string;
  completed:   number;
  required:    number;
  sort_order:  number;
  deadline:    string | null;
}

export interface QuestNoteRow {
  id:                 string;
  quest_id:           string;
  content:            string;
  visible_to_players: number;
  created_at:         string;
}

export interface CreateQuestInput {
  name:             string;
  description?:     string;
  status?:          QuestStatus;
  questType?:       QuestType;
  priority?:        number;
  plotThreadId?:    string;
  reward?:          string;
  tags?:            string[];
}

export interface UpdateQuestInput {
  id:                string;
  name?:             string;
  description?:      string;
  status?:           QuestStatus;
  questType?:        QuestType;
  priority?:         number;
  questGiverNpcId?:  string | null;
  sponsorFactionId?: string | null;
  plotThreadId?:     string | null;
  reward?:           string;
  tags?:             string[];
}

export interface QuestListQuery {
  search?:    string;
  status?:    QuestStatus;
  questType?: QuestType;
  limit?:     number;
  offset?:    number;
}
