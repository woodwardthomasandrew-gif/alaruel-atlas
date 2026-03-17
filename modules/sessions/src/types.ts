import type { SessionStatus } from '../../../shared/src/types/session';

export interface SessionRow {
  id:                  string;
  campaign_id:         string;
  name:                string;
  description:         string;
  session_number:      number;
  status:              SessionStatus;
  scheduled_at:        string | null;
  started_at:          string | null;
  ended_at:            string | null;
  duration_minutes:    number | null;
  campaign_date_start: string | null;
  campaign_date_end:   string | null;
  rewards:             string | null;
  follow_up_hooks:     string | null;
  tags:                string;
  created_at:          string;
  updated_at:          string;
}

export interface SessionNoteRow {
  id:         string;
  session_id: string;
  phase:      'planning' | 'live' | 'recap';
  content:    string;
  created_at: string;
  updated_at: string;
}

export interface SessionPrepItemRow {
  id:          string;
  session_id:  string;
  description: string;
  done:        number;
  sort_order:  number;
}

export interface SessionSceneRow {
  id:          string;
  session_id:  string;
  title:       string;
  content:     string;
  sort_order:  number;
  location_id: string | null;
  played:      number;
}

export interface CreateSessionInput {
  name:           string;
  description?:   string;
  sessionNumber?: number;
  scheduledAt?:   string;
  tags?:          string[];
}

export interface UpdateSessionInput {
  id:                  string;
  name?:               string;
  description?:        string;
  status?:             SessionStatus;
  scheduledAt?:        string | null;
  campaignDateStart?:  string | null;
  campaignDateEnd?:    string | null;
  rewards?:            string;
  followUpHooks?:      string;
  tags?:               string[];
}
