// ─────────────────────────────────────────────────────────────────────────────
// core/plugins — PluginLoader implementation
// ─────────────────────────────────────────────────────────────────────────────

import { readdirSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type {
  IPluginLoader,
  PluginManifest,
  PluginContext,
  PluginModule,
  PluginAPI,
  PluginPermission,
} from './types';
import { buildPluginAPI } from './api';
import { eventBus }       from '../../events/src/index';
import { createLogger }   from '../../logger/src/index';

export type {
  IPluginLoader,
  PluginManifest,
  PluginContext,
  PluginModule,
  PluginAPI,
  PluginPermission,
};

// ── PluginLoader ──────────────────────────────────────────────────────────────

/**
 * Discovers, validates, and manages the lifecycle of Alaruel Atlas plugins.
 *
 * Each plugin lives in its own subdirectory under `data/plugins/` and must
 * include a `plugin.json` manifest. The entry file is dynamically imported.
 *
 * Security model:
 *  - Plugins receive a restricted PluginAPI; they cannot import core packages.
 *  - Permissions are checked at call time — ungrantend calls throw.
 *  - All event subscriptions are tracked and bulk-cleaned on unload.
 *
 * Lifecycle:
 *  1. `loadAll(pluginsDir)` — called at app boot.
 *  2. Each plugin's `init(api)` is awaited.
 *  3. `unload(id)` — called on user request or app shutdown.
 *  4. Plugin's `destroy()` is awaited and subscriptions are removed.
 *
 * @example
 * ```ts
 * await pluginLoader.loadAll('/path/to/data/plugins');
 * pluginLoader.loadedPluginIds(); // ['my-org.my-plugin', ...]
 * await pluginLoader.unload('my-org.my-plugin');
 * ```
 */
export class PluginLoader implements IPluginLoader {
  private readonly contexts = new Map<string, PluginContext>();
  private readonly log      = createLogger('core:plugins');

  // ── loadAll ────────────────────────────────────────────────────────────────

  /**
   * Scan the plugins directory and load every valid plugin found.
   *
   * Skips entries that are not directories, have no `plugin.json`, or fail
   * manifest validation. A single plugin failing to load does not abort the
   * process — the error is logged and other plugins continue loading.
   *
   * @param pluginsDir - Absolute path to the plugins root.
   */
  async loadAll(pluginsDir: string): Promise<void> {
    if (!existsSync(pluginsDir)) {
      this.log.info('Plugins directory not found — no plugins loaded', { pluginsDir });
      return;
    }

    const entries = readdirSync(pluginsDir, { withFileTypes: true });
    const dirs    = entries.filter(e => e.isDirectory());

    this.log.info(`Found ${dirs.length} plugin candidate(s)`, { pluginsDir });

    for (const dir of dirs) {
      const pluginDir = join(pluginsDir, dir.name);
      try {
        await this.load(pluginDir);
      } catch (err) {
        this.log.error(`Failed to load plugin from "${pluginDir}"`, {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    this.log.info(`${this.contexts.size} plugin(s) loaded`);
  }

  // ── load ───────────────────────────────────────────────────────────────────

  /**
   * Load a single plugin from its directory.
   *
   * Steps:
   *  1. Read and validate `plugin.json`.
   *  2. Reject if a plugin with the same ID is already loaded.
   *  3. Build the restricted PluginAPI for the declared permissions.
   *  4. Dynamically import the plugin's entry file.
   *  5. Call `init(api)` and store the context.
   *  6. Emit `plugin:loaded`.
   *
   * @param pluginDir - Absolute path to the plugin directory.
   * @throws On manifest validation failure or entry import error.
   */
  async load(pluginDir: string): Promise<void> {
    const manifest = this.readManifest(pluginDir);

    if (this.contexts.has(manifest.id)) {
      this.log.warn(`Plugin "${manifest.id}" is already loaded — skipping`, {
        pluginId: manifest.id,
      });
      return;
    }

    this.log.info(`Loading plugin "${manifest.id}" v${manifest.version}`, {
      pluginId: manifest.id,
    });

    const ctx: PluginContext = {
      manifest,
      tokens:    [],
      module:    null as unknown as PluginModule, // filled below
      directory: pluginDir,
      loadedAt:  new Date().toISOString(),
    };

    const permissions = new Set<PluginPermission>(manifest.permissions);
    const api         = buildPluginAPI(ctx, permissions);

    // Dynamically import the entry file.
    const entryPath  = join(pluginDir, manifest.entry);
    const pluginMod  = await import(entryPath) as { default?: PluginModule } & PluginModule;
    const pluginModule: PluginModule = pluginMod.default ?? pluginMod;

    if (typeof pluginModule.init !== 'function') {
      throw new Error(
        `[core:plugins] Plugin "${manifest.id}" entry does not export an init() function.`,
      );
    }

    ctx.module = pluginModule;
    await pluginModule.init(api);

    this.contexts.set(manifest.id, ctx);

    eventBus.emit('plugin:loaded', { pluginId: manifest.id });
    this.log.info(`Plugin "${manifest.id}" loaded`, { pluginId: manifest.id });
  }

  // ── unload ─────────────────────────────────────────────────────────────────

  /**
   * Unload a plugin by ID.
   *
   * Steps:
   *  1. Look up the plugin context.
   *  2. Call `destroy()` if implemented.
   *  3. Unsubscribe all event tokens registered by the plugin.
   *  4. Remove the context.
   *  5. Emit `plugin:unloaded`.
   *
   * @param pluginId - The ID from the plugin manifest.
   */
  async unload(pluginId: string): Promise<void> {
    const ctx = this.contexts.get(pluginId);
    if (!ctx) {
      this.log.warn(`Cannot unload "${pluginId}" — not loaded`, { pluginId });
      return;
    }

    this.log.info(`Unloading plugin "${pluginId}"`, { pluginId });

    // Call the plugin's own cleanup function.
    if (typeof ctx.module.destroy === 'function') {
      try {
        await ctx.module.destroy();
      } catch (err) {
        this.log.error(`Plugin "${pluginId}" destroy() threw`, {
          pluginId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    // Remove all event subscriptions the plugin registered.
    for (const token of ctx.tokens) {
      eventBus.unsubscribe(token);
    }

    this.contexts.delete(pluginId);

    eventBus.emit('plugin:unloaded', { pluginId });
    this.log.info(`Plugin "${pluginId}" unloaded`, { pluginId });
  }

  // ── getContext ─────────────────────────────────────────────────────────────

  /** Return the runtime context for a loaded plugin, or undefined. */
  getContext(pluginId: string): PluginContext | undefined {
    return this.contexts.get(pluginId);
  }

  // ── loadedPluginIds ────────────────────────────────────────────────────────

  /** Return the IDs of all currently loaded plugins. */
  loadedPluginIds(): string[] {
    return [...this.contexts.keys()];
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private readManifest(pluginDir: string): PluginManifest {
    const manifestPath = join(pluginDir, 'plugin.json');

    if (!existsSync(manifestPath)) {
      throw new Error(`[core:plugins] No plugin.json found in "${pluginDir}"`);
    }

    let raw: unknown;
    try {
      raw = JSON.parse(readFileSync(manifestPath, 'utf-8'));
    } catch {
      throw new Error(`[core:plugins] Failed to parse plugin.json in "${pluginDir}"`);
    }

    this.validateManifest(raw, pluginDir);
    return raw as PluginManifest;
  }

  private validateManifest(raw: unknown, pluginDir: string): asserts raw is PluginManifest {
    const m = raw as Record<string, unknown>;
    const required = ['id', 'name', 'version', 'entry', 'permissions'] as const;

    for (const field of required) {
      if (m[field] === undefined || m[field] === null) {
        throw new Error(
          `[core:plugins] plugin.json in "${pluginDir}" is missing required field "${field}".`,
        );
      }
    }

    if (!Array.isArray(m['permissions'])) {
      throw new Error(
        `[core:plugins] plugin.json in "${pluginDir}": "permissions" must be an array.`,
      );
    }
  }
}

// ── Singleton ─────────────────────────────────────────────────────────────────

/**
 * Application-wide plugin loader singleton.
 */
export const pluginLoader = new PluginLoader();
