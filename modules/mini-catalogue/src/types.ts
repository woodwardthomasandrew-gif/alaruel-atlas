// modules/mini-catalogue/src/types.ts
// Internal types for the mini-catalogue module only.

import type { MiniBaseSize } from '../../../shared/src/types/mini';

// ── Raw DB row shapes ─────────────────────────────────────────────────────────

export interface MiniRow {
  id:          string;
  campaign_id: string;
  name:        string;
  description: string;
  base_size:   MiniBaseSize | null;
  quantity:    number;
  tags:        string; // JSON: string[]
  created_at:  string;
  updated_at:  string;
}

export interface MiniMonsterRow {
  mini_id:     string;
  monster_id:  string;
}

// ── Service input types ───────────────────────────────────────────────────────

export interface CreateMiniInput {
  name:         string;
  description?: string;
  baseSize?:    MiniBaseSize;
  quantity?:    number;
  tags?:        string[];
}

export interface UpdateMiniInput extends Partial<CreateMiniInput> {
  id: string;
}

export interface MiniListQuery {
  search?:   string;
  baseSize?: MiniBaseSize;
  tags?:     string[];
  limit?:    number;
  offset?:   number;
}
