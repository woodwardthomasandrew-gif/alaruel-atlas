// ─────────────────────────────────────────────────────────────────────────────
// core — root barrel
// Re-exports every core system singleton and its key types.
// Import from here for convenience; import from individual packages for
// tree-shaking in tests.
// ─────────────────────────────────────────────────────────────────────────────

export { createLogger, configureLogger }  from './logger/src/index';
export type { Logger, LogLevel, LogEntry, LogSink, LoggerOptions } from './logger/src/index';

export { eventBus, EventBus }             from './events/src/index';
export type { IEventBus, EventName, EventPayload, EventHandler, SubscriptionToken } from './events/src/index';
export type { AppEventMap }               from './events/src/registry';

export { databaseManager, DatabaseManager } from './database/src/index';
export type { IDatabaseManager, Migration, SchemaRegistration, SqlParam, RunResult } from './database/src/index';

export { assetManager, AssetManager }     from './assets/src/index';
export type { IAssetManager, AssetRecord, AssetLink, AssetCategory, RegisterAssetOptions } from './assets/src/index';

export { configManager, ConfigManager }   from './config/src/index';
export type { IConfigManager, AppConfig, CampaignConfig, ConfigValue } from './config/src/index';

export { pluginLoader, PluginLoader }     from './plugins/src/index';
export type { IPluginLoader, PluginManifest, PluginContext, PluginAPI, PluginPermission } from './plugins/src/index';
