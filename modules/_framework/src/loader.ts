// =============================================================================
// modules/_framework/src/loader.ts
//
// ModuleLoader — discovers, registers, and manages module lifecycles.
//
// Responsibilities:
//   1. Maintain a registry of IModule instances
//   2. Topological sort: boot modules in dependency order
//   3. Build a ModuleContext per module (injecting all core handles)
//   4. Track subscription tokens and clean them up on destroy
//   5. Report init results (succeeded / failed / skipped)
//   6. Provide hot-reload for development
//
// The loader itself is the only place that imports core singletons.
// Modules never import singletons directly — they receive injected handles.
// =============================================================================

import type {
  IModule,
  IModuleLoader,
  ModuleContext,
  ModuleId,
  ModuleInitSummary,
  ModuleManifest,
  ModuleStatus,
}                                                   from './types';
import type { BaseModule }                          from './module';
import type { EventName, EventPayload,
              SubscriptionToken }                   from '../../../core/events/src/types';
import { eventBus }                                 from '../../../core/events/src/index';
import { databaseManager }                          from '../../../core/database/src/index';
import { configManager }                            from '../../../core/config/src/index';
import { createLogger }                             from '../../../core/logger/src/index';

const log = createLogger('core:module-loader');

// ── ModuleLoader ──────────────────────────────────────────────────────────────

/**
 * Application-level registry and lifecycle manager for all feature modules.
 *
 * Usage (in apps/desktop/src/main.ts):
 * ```ts
 * const loader = new ModuleLoader();
 *
 * loader.register(new NpcsModule());
 * loader.register(new QuestsModule());
 * loader.register(new SessionsModule());
 *
 * const summary = await loader.initAll();
 * log.info('Modules ready', summary);
 *
 * // On shutdown:
 * await loader.destroyAll();
 * ```
 */
export class ModuleLoader implements IModuleLoader {

  /** Registry: moduleId → module instance. Insertion order is preserved. */
  private readonly registry = new Map<ModuleId, IModule>();

  /**
   * Per-module subscription tokens collected during init().
   * Used for bulk-unsubscription on destroy.
   */
  private readonly tokenMap = new Map<ModuleId, SubscriptionToken[]>();

  // ── register ───────────────────────────────────────────────────────────────

  /**
   * Add a module instance to the registry.
   *
   * Must be called before `initAll()` or `initOne()`.
   * Throws if a module with the same ID is already registered.
   *
   * @param module - The module instance to register.
   */
  register(module: IModule): void {
    const { id } = module.manifest;

    if (this.registry.has(id)) {
      throw new Error(
        `[ModuleLoader] A module with id '${id}' is already registered. ` +
        'Module IDs must be unique.',
      );
    }

    this.registry.set(id, module);
    this.tokenMap.set(id, []);
    log.debug(`Registered module '${id}'`);
  }

  // ── initAll ────────────────────────────────────────────────────────────────

  /**
   * Initialise all registered modules in topologically sorted dependency order.
   *
   * For each module:
   *   - If a declared dependency is not registered, the module is skipped.
   *   - If a declared dependency failed, the module is skipped.
   *   - If init() throws, the module enters the `error` state. If the manifest
   *     marks `required: true`, the error is re-thrown to abort boot.
   *
   * @returns A summary of succeeded, failed, and skipped modules.
   */
  async initAll(): Promise<ModuleInitSummary> {
    const summary: ModuleInitSummary = { succeeded: [], failed: [], skipped: [] };

    const sorted = this.topologicalSort();

    for (const id of sorted) {
      const module = this.registry.get(id)!;

      // Check all dependencies are active before proceeding.
      const blockedBy = this.findBlockingDependency(module.manifest);
      if (blockedBy) {
        summary.skipped.push({ id, reason: `Dependency '${blockedBy}' is not active` });
        log.warn(`Skipping module '${id}' — dependency '${blockedBy}' is not active`);
        continue;
      }

      try {
        await this.initOne(id);
        summary.succeeded.push(id);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        summary.failed.push({ id, error: message });
        log.error(`Module '${id}' failed to initialise`, { error: message });

        if (module.manifest.required) {
          throw new Error(
            `[ModuleLoader] Required module '${id}' failed to initialise: ${message}`,
          );
        }
      }
    }

    log.info(
      `Module boot complete — ` +
      `${summary.succeeded.length} active, ` +
      `${summary.failed.length} failed, ` +
      `${summary.skipped.length} skipped`,
    );

    return summary;
  }

  // ── initOne ────────────────────────────────────────────────────────────────

  /**
   * Initialise a single registered module by ID.
   *
   * Builds the ModuleContext for this module, calls init(context), and tracks
   * all subscription tokens for later cleanup.
   *
   * @param moduleId - Must be a registered module ID.
   * @throws If the module is not registered or init() throws.
   */
  async initOne(moduleId: ModuleId): Promise<void> {
    const module = this.requireModule(moduleId);

    if (module.status === 'active') {
      log.warn(`initOne('${moduleId}') called on an already-active module — ignoring`);
      return;
    }

    const context = this.buildContext(moduleId);

    try {
      await module.init(context);
      // If the module is a BaseModule subclass, harvest its internally-tracked tokens too.
      this.harvestBaseModuleTokens(moduleId, module);
    } catch (err) {
      (module as { status: ModuleStatus }).status = 'error';
      throw err;
    }
  }

  // ── destroyAll ─────────────────────────────────────────────────────────────

  /**
   * Destroy all active modules in reverse dependency order.
   * Unsubscribes all event tokens before calling each module's destroy().
   */
  async destroyAll(): Promise<void> {
    const sorted = this.topologicalSort().reverse();

    for (const id of sorted) {
      const module = this.registry.get(id);
      if (!module || module.status !== 'active') continue;

      await this.destroyOne(id);
    }

    log.info('All modules destroyed');
  }

  // ── reload ─────────────────────────────────────────────────────────────────

  /**
   * Destroy and re-initialise a single module.
   * Useful during development for hot-reload.
   *
   * @param moduleId - Must be a registered module ID.
   */
  async reload(moduleId: ModuleId): Promise<void> {
    log.info(`Reloading module '${moduleId}'`);
    await this.destroyOne(moduleId);
    await this.initOne(moduleId);
    log.info(`Module '${moduleId}' reloaded`);
  }

  // ── Queries ────────────────────────────────────────────────────────────────

  /** Return the current status of a module. */
  getStatus(moduleId: ModuleId): ModuleStatus | undefined {
    return this.registry.get(moduleId)?.status;
  }

  /** Return the manifest of a registered module. */
  getManifest(moduleId: ModuleId): ModuleManifest | undefined {
    return this.registry.get(moduleId)?.manifest;
  }

  /** Return IDs of all registered modules, in registration order. */
  registeredIds(): ModuleId[] {
    return [...this.registry.keys()];
  }

  /** Return IDs of all modules with status `'active'`. */
  activeIds(): ModuleId[] {
    return [...this.registry.entries()]
      .filter(([, m]) => m.status === 'active')
      .map(([id]) => id);
  }

  // ── Private: context builder ───────────────────────────────────────────────

  /**
   * Build the ModuleContext that is injected into each module's init().
   * This is the only place in the framework that touches core singletons.
   */
  private buildContext(moduleId: ModuleId): ModuleContext {
    const moduleLog    = createLogger(`module:${moduleId}`);
    const tokenBucket  = this.tokenMap.get(moduleId)!;

    return {
      logger: moduleLog,

      subscribe: <K extends EventName>(
        event:   K,
        handler: (payload: EventPayload<K>) => void,
      ): void => {
        const token = eventBus.subscribe(event, handler);
        tokenBucket.push(token);
        moduleLog.debug(`Subscribed to '${event}'`);
      },

      emit: <K extends EventName>(event: K, payload: EventPayload<K>): void => {
        moduleLog.debug(`Emitting '${event}'`);
        eventBus.emit(event, payload);
      },

      registerSchema: (registration) => {
        moduleLog.debug('Registering schema', { module: registration.module });
        databaseManager.registerSchema(registration);
      },

      getConfig: <T = unknown>(key: string): T | undefined => {
        const cfg = configManager.getModuleConfig(moduleId);
        return cfg[key] as T;
      },

      setConfig: (key: string, value: unknown) => {
        configManager.setModuleConfig(moduleId, key, value as never);
      },
    };
  }

  // ── Private: destroy one ───────────────────────────────────────────────────

  private async destroyOne(moduleId: ModuleId): Promise<void> {
    const module = this.registry.get(moduleId);
    if (!module) return;

    // Unsubscribe all tracked tokens before calling destroy().
    const tokens = this.tokenMap.get(moduleId) ?? [];
    for (const token of tokens) {
      eventBus.unsubscribe(token);
    }
    this.tokenMap.set(moduleId, []);

    await module.destroy();
    log.debug(`Module '${moduleId}' destroyed and unsubscribed (${tokens.length} tokens freed)`);
  }

  // ── Private: topological sort ──────────────────────────────────────────────

  /**
   * Kahn's algorithm — returns module IDs in a valid boot order where each
   * module's declared dependencies appear before it in the list.
   *
   * Throws if the dependency graph contains a cycle.
   */
  private topologicalSort(): ModuleId[] {
    const inDegree = new Map<ModuleId, number>();
    const adj      = new Map<ModuleId, ModuleId[]>();

    for (const id of this.registry.keys()) {
      inDegree.set(id, 0);
      adj.set(id, []);
    }

    // Build the adjacency list: dep → [modules that depend on dep]
    for (const [id, module] of this.registry) {
      for (const dep of module.manifest.dependsOn) {
        if (!this.registry.has(dep)) {
          log.warn(`Module '${id}' declares dependency '${dep}' which is not registered`);
          continue;
        }
        adj.get(dep)!.push(id);
        inDegree.set(id, (inDegree.get(id) ?? 0) + 1);
      }
    }

    // Start with all nodes that have no unresolved dependencies.
    const queue:  ModuleId[] = [];
    const result: ModuleId[] = [];

    for (const [id, degree] of inDegree) {
      if (degree === 0) queue.push(id);
    }

    while (queue.length > 0) {
      const id = queue.shift()!;
      result.push(id);
      for (const dependent of adj.get(id) ?? []) {
        const newDegree = (inDegree.get(dependent) ?? 1) - 1;
        inDegree.set(dependent, newDegree);
        if (newDegree === 0) queue.push(dependent);
      }
    }

    if (result.length !== this.registry.size) {
      const unresolved = [...this.registry.keys()].filter(id => !result.includes(id));
      throw new Error(
        `[ModuleLoader] Circular dependency detected among modules: ${unresolved.join(', ')}`,
      );
    }

    return result;
  }

  // ── Private: dependency check ─────────────────────────────────────────────

  /**
   * Return the ID of the first dependency that is not currently active,
   * or null if all dependencies are satisfied.
   */
  private findBlockingDependency(manifest: ModuleManifest): ModuleId | null {
    for (const dep of manifest.dependsOn) {
      const depModule = this.registry.get(dep);
      if (!depModule || depModule.status !== 'active') return dep;
    }
    return null;
  }

  // ── Private: harvest BaseModule tokens ────────────────────────────────────

  /**
   * If the module is a BaseModule subclass, it internally tracks subscription
   * tokens for subscriptions made inside onInit() via context.subscribe.
   * The loader's own tokenBucket already captures those (because the context's
   * subscribe() pushes into tokenBucket). This method additionally collects
   * any tokens that a subclass pushed directly via _trackToken().
   */
  private harvestBaseModuleTokens(moduleId: ModuleId, module: IModule): void {
    const base = module as Partial<BaseModule<never, never>>;
    if (typeof base._getTokens === 'function') {
      const extra = base._getTokens();
      const bucket = this.tokenMap.get(moduleId)!;
      for (const t of extra) {
        if (!bucket.includes(t)) bucket.push(t);
      }
    }
  }

  // ── Private: guard ────────────────────────────────────────────────────────

  private requireModule(moduleId: ModuleId): IModule {
    const module = this.registry.get(moduleId);
    if (!module) {
      throw new Error(
        `[ModuleLoader] Module '${moduleId}' is not registered. ` +
        'Call register() before init().',
      );
    }
    return module;
  }
}

// ── Singleton ─────────────────────────────────────────────────────────────────

/**
 * Application-wide module loader singleton.
 * Import and use directly in the desktop main process.
 */
export const moduleLoader = new ModuleLoader();
