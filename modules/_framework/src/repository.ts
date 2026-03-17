// =============================================================================
// modules/_framework/src/repository.ts
//
// BaseRepository — abstract base class for all module repositories.
//
// Provides:
//   - A pre-wired DatabaseManager reference
//   - A scoped Logger
//   - Typed query/run/transaction helpers that delegate to the core DB manager
//   - An assertInitialised() guard so subclasses fail fast and clearly
//
// What BaseRepository does NOT do:
//   - It holds no domain logic
//   - It emits no events
//   - It knows nothing about validation
//
// Every feature module creates one subclass, e.g.:
//
//   export class QuestRepository extends BaseRepository {
//     findById(id: string): Quest | null {
//       const rows = this.query<QuestRow>('SELECT * FROM quests WHERE id = ?', [id]);
//       return rows[0] ? rowToQuest(rows[0]) : null;
//     }
//   }
// =============================================================================

import type { IDatabaseManager, SqlParam, RunResult } from '../../../core/database/src/types';
import type { Logger }                                 from '../../../core/logger/src/types';
import type { IModuleRepository, ModuleId }            from './types';
import { ModuleNotInitialisedError }                   from './types';

/**
 * Abstract base class for all Alaruel Atlas module repositories.
 *
 * Subclasses receive a DatabaseManager and Logger via constructor injection
 * from their parent BaseModule.
 *
 * @example
 * ```ts
 * class NpcRepository extends BaseRepository {
 *   findById(id: string): NPC | null {
 *     const [row] = this.query<NpcRow>(
 *       'SELECT * FROM npcs WHERE id = ? AND campaign_id = ?',
 *       [id, this.campaignId],
 *     );
 *     return row ? rowToNpc(row) : null;
 *   }
 *
 *   create(data: CreateNpcInput): NPC {
 *     const id = generateId();
 *     this.run(
 *       'INSERT INTO npcs (id, name, campaign_id, ...) VALUES (?, ?, ?, ...)',
 *       [id, data.name, this.campaignId, ...],
 *     );
 *     return this.findById(id)!;
 *   }
 * }
 * ```
 */
export abstract class BaseRepository implements IModuleRepository {
  private _initialised = false;
  private _campaignId: string | null = null;

  constructor(
    /** Module ID used for scoped logging. */
    protected readonly moduleId: ModuleId,
    /** Injected DatabaseManager — never import the singleton directly. */
    protected readonly db: IDatabaseManager,
    /** Pre-scoped logger for this repository. */
    protected readonly log: Logger,
  ) {}

  // ── Lifecycle ───────────────────────────────────────────────────────────────

  /**
   * Called by the owning BaseModule during its init() phase, after the DB
   * schema has been registered.
   *
   * Subclasses should override this to prepare any reusable statements or
   * warm any in-memory caches — but must call `super.initialize()` first.
   */
  initialize(): void {
    this._initialised = true;
    this.log.debug('Repository initialised');
  }

  // ── Campaign scope ──────────────────────────────────────────────────────────

  /**
   * The active campaign ID. All queries must be scoped to this value so
   * that data from one campaign never leaks into another.
   *
   * Set automatically by the ModuleLoader when a campaign is opened via
   * the `app:campaign-opened` event. Cleared on `app:campaign-closed`.
   */
  get campaignId(): string {
    if (!this._campaignId) {
      throw new Error(
        `[${this.moduleId}] campaignId accessed before a campaign was opened.`,
      );
    }
    return this._campaignId;
  }

  /**
   * Set by the module framework when `app:campaign-opened` fires.
   * Not part of the public API — called internally by BaseModule.
   *
   * @internal
   */
  _setCampaignId(id: string | null): void {
    this._campaignId = id;
  }

  // ── Protected query helpers ─────────────────────────────────────────────────

  /**
   * Execute a SELECT and return typed rows.
   *
   * @param sql    - Parameterised SQL string with `?` placeholders.
   * @param params - Bind values in order.
   * @returns Array of rows typed as T. Empty array when no rows match.
   *
   * @throws ModuleNotInitialisedError if called before initialize().
   */
  protected query<T = Record<string, unknown>>(
    sql:    string,
    params: SqlParam[] = [],
  ): T[] {
    this.assertInitialised('query');
    return this.db.query<T>(sql, params);
  }

  /**
   * Execute a non-SELECT statement (INSERT / UPDATE / DELETE).
   *
   * @returns RunResult with `lastInsertRowid` and `changes`.
   * @throws ModuleNotInitialisedError if called before initialize().
   */
  protected run(sql: string, params: SqlParam[] = []): RunResult {
    this.assertInitialised('run');
    return this.db.run(sql, params);
  }

  /**
   * Wrap multiple read/write operations in a single atomic transaction.
   *
   * If `fn` throws, the transaction rolls back automatically.
   * Returns whatever `fn` returns.
   *
   * @example
   * ```ts
   * const quest = this.transaction(() => {
   *   const r = this.run('INSERT INTO quests ...', [...]);
   *   this.run('INSERT INTO quest_objectives ...', [...]);
   *   return this.findById(r.lastInsertRowid as string)!;
   * });
   * ```
   */
  protected transaction<T>(fn: () => T): T {
    this.assertInitialised('transaction');
    return this.db.transaction(fn);
  }

  /**
   * Return the first row of a query, or null if no rows match.
   * Convenience wrapper around `query()`.
   */
  protected queryOne<T = Record<string, unknown>>(
    sql:    string,
    params: SqlParam[] = [],
  ): T | null {
    const rows = this.query<T>(sql, params);
    return rows[0] ?? null;
  }

  /**
   * Return true if at least one row matches the query.
   */
  protected exists(sql: string, params: SqlParam[] = []): boolean {
    const rows = this.query<{ c: number }>(
      `SELECT EXISTS(${sql}) AS c`,
      params,
    );
    return (rows[0]?.c ?? 0) === 1;
  }

  // ── Guards ──────────────────────────────────────────────────────────────────

  /**
   * Throw a clear error if the repository is used before initialize() runs.
   * Subclasses call this at the top of every public method if they want to
   * guard themselves, or rely on the super-class guards in query/run.
   */
  protected assertInitialised(operation?: string): void {
    if (!this._initialised) {
      throw new ModuleNotInitialisedError(this.moduleId);
    }
  }
}
