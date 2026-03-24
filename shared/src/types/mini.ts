// ─────────────────────────────────────────────────────────────────────────────
// shared/types/mini.ts
//
// Mini Catalogue entity types.
// Managed by the `mini-catalogue` module.
// ─────────────────────────────────────────────────────────────────────────────

import type { EntityBase, WithDescription, WithTags } from './common';

/**
 * Physical base size categories for miniatures.
 * Mirrors the creature size scale used by monsters.
 */
export type MiniBaseSize =
  | 'tiny'
  | 'small'
  | 'medium'
  | 'large'
  | 'huge'
  | 'gargantuan';

/**
 * A physical miniature in the user's collection.
 */
export interface Mini extends EntityBase, WithDescription, WithTags {
  /** Optional physical base size. */
  baseSize?: MiniBaseSize;
  /** How many of this mini the user owns. Defaults to 1. */
  quantity: number;
  /** IDs of monsters this mini can represent. */
  monsterIds: string[];
}

/**
 * Minimal monster reference attached to a mini (for display only).
 * Populated by a join query — not stored on the mini row.
 */
export interface MiniMonsterRef {
  monsterId: string;
  monsterName: string;
}
