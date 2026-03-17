// ─────────────────────────────────────────────────────────────────────────────
// core/plugins — types
// ─────────────────────────────────────────────────────────────────────────────

import type { EventName, EventPayload, EventHandler, SubscriptionToken } from '../../events/src/index';

// ── Manifest ──────────────────────────────────────────────────────────────────

/**
 * Permissions a plugin may request.
 * The PluginLoader checks these before constructing the PluginAPI for the plugin.
 */
export type PluginPermission =
  | 'events:subscribe'   // Listen to app events via the event bus
  | 'events:emit'        // Emit app events via the event bus
  | 'db:read'            // Query the campaign database (SELECT)
  | 'db:write'           // Write to permitted campaign database tables
  | 'ui:extend'          // Register UI extension points (sidebar items, panels)
  | 'config:read'        // Read module configuration
  | 'config:write';      // Write module configuration

/**
 * The `plugin.json` manifest every plugin must provide.
 * Validated by the PluginLoader before the plugin is loaded.
 */
export interface PluginManifest {
  /** Unique plugin identifier, e.g. `'my-org.random-encounter-gen'`. */
  id: string;
  /** Human-readable display name. */
  name: string;
  /** SemVer string, e.g. `'1.2.3'`. */
  version: string;
  /** Relative path to the compiled JS entry point, e.g. `'dist/index.js'`. */
  entry: string;
  /** Minimum app version required, e.g. `'0.5.0'` (optional). */
  minAppVersion?: string;
  /** Permissions this plugin needs. Only granted permissions are surfaced. */
  permissions: PluginPermission[];
  /** Optional human-readable description. */
  description?: string;
}

// ── Plugin API surface ────────────────────────────────────────────────────────

/**
 * The API object injected into a plugin's `init(api)` function.
 * Plugins interact with the host application exclusively through this object.
 * They never import core packages directly.
 *
 * Methods available depend on the permissions declared in plugin.json.
 * Attempting to call a method for an ungrantend permission throws.
 */
export interface PluginAPI {
  /**
   * Subscribe to an app event.
   * Requires `'events:subscribe'` permission.
   */
  subscribe<K extends EventName>(event: K, handler: EventHandler<K>): SubscriptionToken;

  /**
   * Emit an app event.
   * Requires `'events:emit'` permission.
   */
  emit<K extends EventName>(event: K, payload: EventPayload<K>): void;

  /**
   * Execute a read-only SQL SELECT against the campaign database.
   * Requires `'db:read'` permission.
   */
  dbQuery<T = Record<string, unknown>>(sql: string, params?: (string | number | null)[]): T[];

  /**
   * Execute a write SQL statement against permitted tables.
   * Requires `'db:write'` permission.
   */
  dbRun(sql: string, params?: (string | number | null)[]): { changes: number };

  /**
   * Read a config value for the plugin's own namespace.
   * Requires `'config:read'` permission.
   */
  getConfig<T = unknown>(key: string): T | undefined;

  /**
   * Write a config value for the plugin's own namespace.
   * Requires `'config:write'` permission.
   */
  setConfig(key: string, value: unknown): void;

  /** The plugin's unique ID — provided for self-reference. */
  readonly pluginId: string;
}

// ── Plugin lifecycle ──────────────────────────────────────────────────────────

/**
 * The shape that a plugin entry module must export.
 * The `init` function is called once when the plugin is loaded.
 * The optional `destroy` function is called when the plugin is unloaded.
 */
export interface PluginModule {
  /**
   * Called by the PluginLoader after the module is imported.
   * Plugins should register event subscriptions and any setup here.
   */
  init(api: PluginAPI): void | Promise<void>;
  /**
   * Called by the PluginLoader when the plugin is unloaded.
   * Plugins should clean up subscriptions and resources here.
   */
  destroy?(): void | Promise<void>;
}

// ── Runtime context ───────────────────────────────────────────────────────────

/**
 * Internal runtime record kept by the PluginLoader for each loaded plugin.
 */
export interface PluginContext {
  manifest:     PluginManifest;
  /** Active subscription tokens created by this plugin (for cleanup). */
  tokens:       SubscriptionToken[];
  /** The loaded module (used to call destroy on unload). */
  module:       PluginModule;
  /** Absolute path to the plugin's directory. */
  directory:    string;
  /** ISO-8601 timestamp when the plugin was loaded. */
  loadedAt:     string;
}

// ── PluginLoader interface ────────────────────────────────────────────────────

export interface IPluginLoader {
  /**
   * Scan `pluginsDir` for installed plugins and load each valid one.
   * @param pluginsDir - Absolute path to the plugins root directory.
   */
  loadAll(pluginsDir: string): Promise<void>;

  /**
   * Load a single plugin from a directory.
   * @param pluginDir - Absolute path to the plugin's directory.
   */
  load(pluginDir: string): Promise<void>;

  /**
   * Unload a plugin by ID. Calls destroy() and removes all subscriptions.
   * @param pluginId - The ID from the plugin's manifest.
   */
  unload(pluginId: string): Promise<void>;

  /**
   * Return the runtime context for a loaded plugin, or undefined.
   */
  getContext(pluginId: string): PluginContext | undefined;

  /** Return IDs of all currently loaded plugins. */
  loadedPluginIds(): string[];
}
