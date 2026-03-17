// =============================================================================
// modules/_framework/src/types.ts
//
// Core type contracts for the Alaruel Atlas module system.
//
// Every module is built from four layered abstractions:
//
//   IModuleRepository  — raw database access (SQL ↔ domain types)
//   IModuleService     — business logic, validation, cross-concern orchestration
//   IModule            — lifecycle owner: init, destroy, event wiring
//   ModuleManifest     — static metadata declared at registration time
//
// The module loader discovers modules by their manifest, boots them in
// dependency order, and routes lifecycle events through the core EventBus.
//
// Isolation rules (enforced by convention and linting):
//   ✓  Modules import from core/* and @alaruel/shared
//   ✓  Modules import from their own files only
//   ✗  Modules never import from other modules
//   ✗  Modules never use raw better-sqlite3
//   ✗  Cross-module data exchange goes through the EventBus only
// =============================================================================

import type { SchemaRegistration }      from '../../../core/database/src/types';
import type { EventName, EventPayload } from '../../../core/events/src/types';
import type { Logger }                  from '../../../core/logger/src/types';

// ── Module identity ───────────────────────────────────────────────────────────

/**
 * Unique string identifier for a module.
 * Kebab-case, e.g. `'npcs'`, `'quests'`, `'atlas'`.
 * Used as a key in the registry, as a DB table prefix, and in log output.
 */
export type ModuleId = string;

/**
 * Semantic version string, e.g. `'1.0.0'`.
 */
export type SemVer = string;

// ── Module manifest ───────────────────────────────────────────────────────────

/**
 * Static metadata every module must declare.
 * Read by the ModuleLoader before the module class is instantiated.
 * Think of this as the module's package.json equivalent.
 */
export interface ModuleManifest {
  /** Unique module identifier. Must be stable across releases. */
  readonly id: ModuleId;

  /** Human-readable display name shown in the UI and logs. */
  readonly displayName: string;

  /** Semantic version of this module. */
  readonly version: SemVer;

  /**
   * IDs of other modules that must be fully initialised before this one.
   * The ModuleLoader topologically sorts the registry using this list.
   * Leave empty if the module has no dependencies.
   */
  readonly dependsOn: ReadonlyArray<ModuleId>;

  /**
   * Whether this module is required for the application to function.
   * A required module failure aborts boot. An optional module failure is
   * logged and skipped.
   * @default false
   */
  readonly required?: boolean;

  /**
   * Human-readable description of what this module does.
   * Displayed in a future module manager UI.
   */
  readonly description?: string;
}

// ── Module lifecycle states ───────────────────────────────────────────────────

/**
 * All possible states a module instance can be in.
 *
 * Transitions:
 *   unregistered → registered → initialising → active → destroying → destroyed
 *                                             ↓
 *                                           error  (from initialising or active)
 */
export type ModuleStatus =
  | 'unregistered'  // Not yet added to the loader
  | 'registered'    // Added to loader, not yet initialised
  | 'initialising'  // init() is running
  | 'active'        // Fully operational
  | 'destroying'    // destroy() is running
  | 'destroyed'     // Cleanly shut down
  | 'error';        // init() or destroy() threw

// ── Module context (injected at init) ─────────────────────────────────────────

/**
 * The context object injected into every module's `init()` call.
 *
 * Contains pre-wired handles to every core system the module is allowed to
 * use. Modules must not bypass these handles by importing singletons directly
 * from core — that would make testing and mocking impossible.
 */
export interface ModuleContext {
  /** Pre-scoped logger: output is automatically tagged with the module ID. */
  readonly logger: Logger;

  /**
   * Register an event subscription that is automatically cleaned up when
   * the module is destroyed. Use this instead of calling `eventBus.subscribe`
   * directly so the loader can manage the subscription lifetime.
   */
  readonly subscribe: <K extends EventName>(
    event:   K,
    handler: (payload: EventPayload<K>) => void,
  ) => void;

  /**
   * Emit an event onto the application event bus.
   * The module ID is available via closure for logging purposes.
   */
  readonly emit: <K extends EventName>(
    event:   K,
    payload: EventPayload<K>,
  ) => void;

  /**
   * Register the module's database schema (migrations) with the
   * DatabaseManager. Must be called during init() before the first query.
   */
  readonly registerSchema: (registration: SchemaRegistration) => void;

  /**
   * Read a typed config value from the module's own config namespace.
   * Equivalent to `configManager.getModuleConfig(moduleId)[key]`.
   */
  readonly getConfig: <T = unknown>(key: string) => T | undefined;

  /**
   * Write a config value to the module's own namespace.
   */
  readonly setConfig: (key: string, value: unknown) => void;
}

// ── Repository base interface ─────────────────────────────────────────────────

/**
 * The data-access layer for a module.
 *
 * Repositories translate between the relational database (SQLite rows) and
 * the strongly-typed domain objects defined in `@alaruel/shared`.
 *
 * Rules:
 *   - All SQL lives here. Services never write SQL.
 *   - No business logic. Repositories do not validate, transform, or decide.
 *   - Return domain types or null/arrays. Never raw row objects.
 *   - Use parameterised queries. Never concatenate user input into SQL.
 */
export interface IModuleRepository {
  /**
   * Called by the module during init() after the schema has been registered.
   * Gives the repository a chance to prepare any statements it will reuse.
   */
  readonly initialize: () => void;
}

// ── Service base interface ────────────────────────────────────────────────────

/**
 * The business-logic layer for a module.
 *
 * Services sit between the module's public API and its repository:
 *   - Validate input before writing
 *   - Orchestrate multi-step operations (reads + writes + events)
 *   - Enforce domain invariants
 *   - Never import from other modules (use events for side-effects)
 *
 * Services receive their repository via constructor injection.
 */
export interface IModuleService {
  /**
   * Called during module init() after the repository is ready.
   * Services use this to set up any in-memory caches or computed state.
   */
  readonly initialize: () => void | Promise<void>;
}

// ── Module base interface ─────────────────────────────────────────────────────

/**
 * The top-level contract every module must implement.
 *
 * The ModuleLoader calls these methods in order:
 *   1. register()     — add to registry (synchronous)
 *   2. init(context)  — boot the module (async, can be long-running)
 *   3. destroy()      — clean shutdown (async)
 */
export interface IModule {
  /** The module's static metadata. Must be a frozen object. */
  readonly manifest: ModuleManifest;

  /** Current lifecycle state. Set by the module itself during transitions. */
  readonly status: ModuleStatus;

  /**
   * Boot the module.
   *
   * Called by the ModuleLoader after all declared dependencies are active.
   * The implementation must:
   *   1. Call `context.registerSchema(...)` if the module owns DB tables.
   *   2. Set up event subscriptions via `context.subscribe(...)`.
   *   3. Initialise the repository and service.
   *   4. Set `this.status = 'active'` on success.
   *
   * If this method throws, the module status is set to `'error'` and
   * (unless `manifest.required` is true) the app continues without it.
   */
  readonly init: (context: ModuleContext) => Promise<void>;

  /**
   * Shut down the module cleanly.
   *
   * Called by the ModuleLoader on app exit or when a module is disabled.
   * The loader automatically unsubscribes all events registered via
   * `context.subscribe` — the module only needs to clean up resources it
   * created outside of that mechanism (timers, open file handles, etc.).
   */
  readonly destroy: () => Promise<void>;
}

// ── Module loader interface ───────────────────────────────────────────────────

/**
 * The application-level registry and lifecycle manager for all modules.
 */
export interface IModuleLoader {
  /**
   * Add a module to the registry.
   * Must be called before `initAll()`. Throws if a module with the same ID
   * is already registered.
   */
  register(module: IModule): void;

  /**
   * Initialise all registered modules in dependency order.
   * Returns a summary of which modules started successfully and which failed.
   */
  initAll(): Promise<ModuleInitSummary>;

  /**
   * Initialise a single module by ID.
   * Its dependencies must already be active.
   */
  initOne(moduleId: ModuleId): Promise<void>;

  /**
   * Destroy all active modules in reverse dependency order.
   */
  destroyAll(): Promise<void>;

  /**
   * Destroy and re-initialise a single module.
   * Useful for hot-reload during development.
   */
  reload(moduleId: ModuleId): Promise<void>;

  /** Return the current status of a module. */
  getStatus(moduleId: ModuleId): ModuleStatus | undefined;

  /** Return the manifest of a registered module. */
  getManifest(moduleId: ModuleId): ModuleManifest | undefined;

  /** Return IDs of all registered modules, in registration order. */
  registeredIds(): ModuleId[];

  /** Return IDs of all currently active modules. */
  activeIds(): ModuleId[];
}

/**
 * Summary returned by `initAll()`.
 */
export interface ModuleInitSummary {
  /** Modules that reached `active` status. */
  succeeded: ModuleId[];
  /** Modules that entered `error` status, with their error messages. */
  failed:    Array<{ id: ModuleId; error: string }>;
  /** Modules skipped because a dependency failed. */
  skipped:   Array<{ id: ModuleId; reason: string }>;
}

// ── Validation helpers ────────────────────────────────────────────────────────

/**
 * A validation error thrown by a Service when input is invalid.
 * Distinguishable from unexpected runtime errors by `instanceof` check.
 */
export class ModuleValidationError extends Error {
  constructor(
    /** Human-readable message for display. */
    message: string,
    /** Machine-readable error code, e.g. `'NAME_REQUIRED'`. */
    public readonly code: string,
    /** Optional field name that failed validation, e.g. `'name'`. */
    public readonly field?: string,
  ) {
    super(message);
    this.name = 'ModuleValidationError';
  }
}

/**
 * Thrown when a repository lookup finds no matching row.
 */
export class NotFoundError extends Error {
  constructor(
    /** The entity type being looked up, e.g. `'Quest'`. */
    public readonly entityType: string,
    /** The ID that was not found. */
    public readonly id: string,
  ) {
    super(`${entityType} not found: ${id}`);
    this.name = 'NotFoundError';
  }
}

/**
 * Thrown when a module tries to operate before it has been initialised.
 */
export class ModuleNotInitialisedError extends Error {
  constructor(moduleId: ModuleId) {
    super(`Module '${moduleId}' is not initialised. Call init() first.`);
    this.name = 'ModuleNotInitialisedError';
  }
}
