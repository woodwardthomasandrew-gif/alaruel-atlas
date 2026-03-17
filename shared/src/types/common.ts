// ─────────────────────────────────────────────────────────────────────────────
// shared/types/common.ts
//
// Foundational primitives used by every entity type and module.
// No domain knowledge lives here — only structural building blocks.
// ─────────────────────────────────────────────────────────────────────────────

// ── Branded primitives ────────────────────────────────────────────────────────

/**
 * Opaque string ID.
 * Using a branded type prevents accidentally passing a plain string where
 * a typed ID is expected, and prevents mixing IDs of different entity types.
 *
 * @example
 * const npcId: ID<'NPC'>      = 'abc123' as ID<'NPC'>;
 * const questId: ID<'Quest'>  = 'xyz456' as ID<'Quest'>;
 * // questId = npcId  →  TypeScript error ✓
 */
export type ID<TEntity extends string = string> = string & { readonly __entity: TEntity };

/**
 * ISO-8601 datetime string, e.g. `'2024-06-01T14:30:00.000Z'`.
 * Branded to distinguish from arbitrary strings.
 */
export type ISOTimestamp = string & { readonly __brand: 'ISOTimestamp' };

/**
 * In-world campaign date, stored as a plain string so each game system can
 * use its own calendar notation (e.g. `'15 Hammer, 1492 DR'` for Forgotten
 * Realms, or `'Year 312, Month of Storms'` for a homebrew calendar).
 */
export type CampaignDate = string & { readonly __brand: 'CampaignDate' };

// ── EntityBase ────────────────────────────────────────────────────────────────

/**
 * The base interface every domain entity extends.
 *
 * Rules:
 *  - `id` is always a nanoid-generated string, stored as TEXT in SQLite.
 *  - `createdAt` / `updatedAt` are ISO-8601 UTC strings — no Date objects
 *    cross the module boundary (they don't serialise cleanly to/from SQLite).
 *  - `name` is the human-facing label shown in all list and detail views.
 */
export interface EntityBase {
  /** Unique entity identifier. Immutable after creation. */
  readonly id: string;
  /** Human-readable display name. */
  name: string;
  /** ISO-8601 UTC timestamp of creation. Set once, never mutated. */
  readonly createdAt: ISOTimestamp;
  /** ISO-8601 UTC timestamp of last modification. Updated on every write. */
  updatedAt: ISOTimestamp;
}

// ── Optional rich-text description ───────────────────────────────────────────

/**
 * Mixin for entities that carry a freeform description field.
 * Stored as Markdown. Rendered by the UI — never interpreted by business logic.
 */
export interface WithDescription {
  /** Freeform Markdown description. Empty string when not set. */
  description: string;
}

// ── Tagging ───────────────────────────────────────────────────────────────────

/**
 * Mixin for entities that support user-defined tags.
 * Tags are lowercase, hyphen-separated strings, e.g. `'region-north'`.
 */
export interface WithTags {
  /** User-assigned tags for filtering and cross-referencing. */
  tags: string[];
}

// ── Status enums ──────────────────────────────────────────────────────────────

/**
 * General-purpose active/inactive flag used by several entity types.
 * Modules may define their own more specific status types as needed.
 */
export type ActiveStatus = 'active' | 'inactive' | 'archived';

// ── Generic utility types ─────────────────────────────────────────────────────

/**
 * A discriminated union result type.
 * Prefer returning `Result<T>` from repository and service functions instead
 * of throwing, so callers handle both branches explicitly.
 *
 * @example
 * function findQuest(id: string): Result<Quest> { ... }
 * const result = findQuest(id);
 * if (result.ok) { use(result.value); } else { log(result.error); }
 */
export type Result<T, E = string> =
  | { readonly ok: true;  readonly value: T }
  | { readonly ok: false; readonly error: E };

/** Convenience constructor for a successful Result. */
export const Ok  = <T>(value: T): Result<T, never> => ({ ok: true,  value });
/** Convenience constructor for a failed Result. */
export const Err = <E>(error: E): Result<never, E>  => ({ ok: false, error });

/**
 * A page of results from a list query.
 * Modules use this for any list that may grow unbounded.
 */
export interface Paginated<T> {
  /** The items on this page. */
  items:      T[];
  /** Total number of items across all pages. */
  total:      number;
  /** Zero-based page index. */
  page:       number;
  /** Number of items per page. */
  pageSize:   number;
  /** Whether there is a next page. */
  hasNext:    boolean;
}

/**
 * Sort direction for list queries.
 */
export type SortDirection = 'asc' | 'desc';

/**
 * A generic list query parameter bag.
 * Modules extend this with entity-specific filter fields.
 */
export interface ListQuery {
  page?:          number;
  pageSize?:      number;
  sortDirection?: SortDirection;
  /** Free-text search string applied to `name` and `description` fields. */
  search?:        string;
  /** Filter by tags (AND semantics — entity must have all listed tags). */
  tags?:          string[];
}
