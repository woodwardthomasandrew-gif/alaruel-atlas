// ─────────────────────────────────────────────────────────────────────────────
// core/plugins — PluginAPI builder
// ─────────────────────────────────────────────────────────────────────────────

import type {
  PluginAPI,
  PluginPermission,
  PluginContext,
} from './types';
import type { EventName, EventPayload, EventHandler, SubscriptionToken } from '../../events/src/index';
import { eventBus }       from '../../events/src/index';
import { databaseManager } from '../../database/src/index';
import { configManager }   from '../../config/src/index';
import { createLogger }    from '../../logger/src/index';

/**
 * Build the restricted PluginAPI object for a given plugin context.
 *
 * Each method checks whether the required permission was granted before
 * delegating to the real system. Ungrantend calls throw a descriptive error
 * rather than silently failing.
 *
 * All event subscription tokens are pushed onto `ctx.tokens` so the
 * PluginLoader can bulk-unsubscribe on plugin unload.
 */
export function buildPluginAPI(
  ctx:         Pick<PluginContext, 'manifest' | 'tokens'>,
  permissions: Set<PluginPermission>,
): PluginAPI {
  const log = createLogger(`plugin:${ctx.manifest.id}`);

  function requirePermission(perm: PluginPermission, method: string): void {
    if (!permissions.has(perm)) {
      throw new Error(
        `[plugin:${ctx.manifest.id}] "${method}" requires the "${perm}" permission, ` +
        `but it was not declared in plugin.json.`,
      );
    }
  }

  return {
    pluginId: ctx.manifest.id,

    subscribe<K extends EventName>(event: K, handler: EventHandler<K>): SubscriptionToken {
      requirePermission('events:subscribe', 'subscribe');
      const token = eventBus.subscribe(event, handler);
      ctx.tokens.push(token);
      log.debug(`subscribed to "${event}"`);
      return token;
    },

    emit<K extends EventName>(event: K, payload: EventPayload<K>): void {
      requirePermission('events:emit', 'emit');
      log.debug(`emitting "${event}"`);
      eventBus.emit(event, payload);
    },

    dbQuery<T = Record<string, unknown>>(
      sql:    string,
      params: (string | number | null)[] = [],
    ): T[] {
      requirePermission('db:read', 'dbQuery');
      // Only allow SELECT statements through the plugin API.
      if (!/^\s*SELECT\b/i.test(sql)) {
        throw new Error(
          `[plugin:${ctx.manifest.id}] dbQuery() only accepts SELECT statements. ` +
          'Use dbRun() for write operations.',
        );
      }
      return databaseManager.query<T>(sql, params);
    },

    dbRun(
      sql:    string,
      params: (string | number | null)[] = [],
    ): { changes: number } {
      requirePermission('db:write', 'dbRun');
      const result = databaseManager.run(sql, params);
      return { changes: result.changes };
    },

    getConfig<T = unknown>(key: string): T | undefined {
      requirePermission('config:read', 'getConfig');
      const cfg = configManager.getModuleConfig(ctx.manifest.id);
      return cfg[key] as T;
    },

    setConfig(key: string, value: unknown): void {
      requirePermission('config:write', 'setConfig');
      // Config values for plugins are stored under the plugin's ID namespace.
      configManager.setModuleConfig(ctx.manifest.id, key, value as string | number | boolean | null);
    },
  };
}
