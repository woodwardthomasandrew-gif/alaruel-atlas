// =============================================================================
// modules/_framework/src/module.ts
//
// BaseModule — abstract base class every feature module extends.
//
// BaseModule handles the module lifecycle mechanics so that concrete modules
// only need to implement:
//   - createRepository() — return the module's repository instance
//   - createService()    — return the module's service instance
//   - onInit()           — register schema, subscribe to events, extra setup
//   - onDestroy()        — optional cleanup beyond event unsubscription
//
// The framework takes care of:
//   - Status transitions and error isolation
//   - Context wiring (logger, emit, subscribe, config)
//   - Subscription token tracking and bulk-unsubscription on destroy
//   - Campaign open/close lifecycle (setting campaignId on the repository)
// =============================================================================

import type { IModule, IModuleService, ModuleContext,
              ModuleManifest, ModuleStatus }          from './types';
import { ModuleNotInitialisedError }                  from './types';
import type { BaseRepository }                        from './repository';
import type { BaseService }                           from './service';
import type { IDatabaseManager }                      from '../../../core/database/src/types';
import type { IEventBus, SubscriptionToken,
              EventName, EventPayload }               from '../../../core/events/src/types';
import type { IConfigManager }                        from '../../../core/config/src/schema';
import { createLogger }                               from '../../../core/logger/src/index';
import { databaseManager }                            from '../../../core/database/src/index';

// ── BaseModule ────────────────────────────────────────────────────────────────

/**
 * Abstract base class for all Alaruel Atlas feature modules.
 *
 * Subclasses declare their manifest as a static property and implement the
 * three abstract factory/lifecycle methods. The framework handles everything
 * else.
 *
 * @example
 * ```ts
 * export class QuestsModule extends BaseModule<QuestRepository, QuestService> {
 *   readonly manifest: ModuleManifest = {
 *     id: 'quests', displayName: 'Quests', version: '1.0.0',
 *     dependsOn: [], required: false,
 *   };
 *
 *   protected createRepository(db: IDatabaseManager): QuestRepository {
 *     return new QuestRepository('quests', db, this.log.child('repo'));
 *   }
 *
 *   protected createService(repo: QuestRepository): QuestService {
 *     return new QuestService('quests', repo, this.log.child('service'), this._emit.bind(this));
 *   }
 *
 *   protected async onInit(ctx: ModuleContext): Promise<void> {
 *     ctx.registerSchema(QUESTS_SCHEMA);
 *
 *     ctx.subscribe('app:campaign-opened', ({ campaignId }) => {
 *       this.service.loadForCampaign(campaignId);
 *     });
 *   }
 * }
 * ```
 *
 * @typeParam TRepo    - The concrete repository type.
 * @typeParam TService - The concrete service type.
 */
export abstract class BaseModule<
  TRepo    extends BaseRepository,
  TService extends BaseService<TRepo>,
> implements IModule {

  // ── Abstract members ────────────────────────────────────────────────────────

  /** Module metadata. Freeze this object — it must not change at runtime. */
  abstract readonly manifest: ModuleManifest;

  /**
   * Factory: construct the module's repository instance.
   * Called once during init(), after core systems are ready.
   */
  protected abstract createRepository(db: IDatabaseManager): TRepo;

  /**
   * Factory: construct the module's service instance.
   * Called once during init(), after the repository is created.
   *
   * The service must receive the bound `this._contextEmit` function so it
   * can emit events without importing the global eventBus singleton.
   */
  protected abstract createService(repository: TRepo): TService;

  /**
   * Module-specific initialisation logic.
   *
   * Typical responsibilities:
   *   1. `ctx.registerSchema(MY_SCHEMA)`
   *   2. `ctx.subscribe('some:event', this.handleEvent.bind(this))`
   *   3. Any module-local setup not covered by the framework.
   *
   * Called after `repository.initialize()` and `service.initialize()`.
   */
  protected abstract onInit(context: ModuleContext): Promise<void>;

  /**
   * Module-specific cleanup.
   * Called before the framework unsubscribes events and clears context.
   * Override when the module owns resources outside the event system.
   */
  protected async onDestroy(): Promise<void> {
    // Default: nothing to do. Override in subclasses if needed.
  }

  // ── Concrete state ──────────────────────────────────────────────────────────

  status: ModuleStatus = 'unregistered';

  /** The module's repository — available after init(). */
  protected repository!: TRepo;

  /** The module's service — available after init(). */
  protected service!: TService;

  /** Scoped logger. Resolved lazily so it uses the subclass manifest.id. */
  private _log?: ReturnType<typeof createLogger>;
  protected get log() {
    if (!this._log) this._log = createLogger(`module:${this.manifest?.id ?? 'unknown'}`);
    return this._log;
  }

  /** Tracks subscription tokens for bulk-cleanup on destroy. */
  private readonly _tokens: SubscriptionToken[] = [];

  /** Wired during init(). Stored so subclasses can call this._contextEmit. */
  private _contextEmit!: <K extends EventName>(e: K, p: EventPayload<K>) => void;

  // ── IModule implementation ──────────────────────────────────────────────────

  /**
   * Boot the module.
   * Called by the ModuleLoader after all declared dependencies are active.
   *
   * Sequence:
   *   1. Transition status → initialising
   *   2. Build the ModuleContext from the injected core systems
   *   3. createRepository() + repository.initialize()
   *   4. createService()    + service.initialize()
   *   5. onInit(context)    — module-specific setup
   *   6. Wire campaign lifecycle (app:campaign-opened / app:campaign-closed)
   *   7. Transition status → active
   */
  async init(context: ModuleContext): Promise<void> {
    this.status = 'initialising';
    this.log.info(`Initialising module '${this.manifest.id}'`);

    // Stash the emit function so subclasses and services can use it.
    this._contextEmit = context.emit;

    // Build the repository.
    const db = this._resolveDb();
    this.repository = this.createRepository(db);
    this.repository.initialize();

    // Build the service.
    this.service = this.createService(this.repository);
    await this.service.initialize();

    // Module-specific setup (schema registration, event subscriptions, etc.)
    await this.onInit(context);

    // Automatically wire campaign lifecycle so the repository's campaignId
    // stays in sync without every module having to do this manually.
    context.subscribe('app:campaign-opened', ({ campaignId }) => {
      this.repository._setCampaignId(campaignId);
      this.log.debug('Campaign opened — campaignId set', { campaignId });
    });

    context.subscribe('app:campaign-closed', () => {
      this.repository._setCampaignId(null);
      this.log.debug('Campaign closed — campaignId cleared');
    });

    this.status = 'active';
    this.log.info(`Module '${this.manifest.id}' active`);
  }

  /**
   * Shut down the module.
   * Called by the ModuleLoader on app exit or when the module is disabled.
   *
   * Sequence:
   *   1. Transition status → destroying
   *   2. onDestroy()       — module-specific teardown
   *   3. All subscription tokens are removed by the ModuleLoader
   *   4. Transition status → destroyed
   */
  async destroy(): Promise<void> {
    if (this.status === 'destroyed' || this.status === 'unregistered') return;

    this.status = 'destroying';
    this.log.info(`Destroying module '${this.manifest.id}'`);

    try {
      await this.onDestroy();
    } catch (err) {
      this.log.error('onDestroy() threw', {
        error: err instanceof Error ? err.message : String(err),
      });
    }

    this.status = 'destroyed';
    this.log.info(`Module '${this.manifest.id}' destroyed`);
  }

  // ── Protected emit ──────────────────────────────────────────────────────────

  /**
   * Emit an event onto the application event bus.
   * Available to subclasses without importing the global eventBus singleton.
   * Will throw if called before init().
   */
  protected _emit<K extends EventName>(event: K, payload: EventPayload<K>): void {
    if (!this._contextEmit) throw new ModuleNotInitialisedError(this.manifest.id);
    this._contextEmit(event, payload);
  }

  // ── Subscription token management ──────────────────────────────────────────

  /**
   * Store a subscription token so it can be cleaned up on destroy().
   * Called internally by the ModuleContext's subscribe wrapper.
   * @internal
   */
  _trackToken(token: SubscriptionToken): void {
    this._tokens.push(token);
  }

  /**
   * Return all accumulated subscription tokens.
   * Called by the ModuleLoader to bulk-unsubscribe on destroy.
   * @internal
   */
  _getTokens(): ReadonlyArray<SubscriptionToken> {
    return this._tokens;
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  /**
   * Resolve the DatabaseManager singleton.
   * Imported lazily here rather than injected so that modules don't need to
   * receive it as a constructor argument — keeping module construction simple.
   *
   * In tests, override createRepository() to inject a mock DB instead.
   */
  private _resolveDb(): IDatabaseManager {
    return databaseManager;
  }
}
