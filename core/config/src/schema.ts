// ─────────────────────────────────────────────────────────────────────────────
// core/config — schema & types
// ─────────────────────────────────────────────────────────────────────────────

// ── Primitive config value types ──────────────────────────────────────────────

export type ConfigPrimitive = string | number | boolean | null;
export type ConfigValue     = ConfigPrimitive | ConfigPrimitive[] | Record<string, ConfigPrimitive>;

// ── Application-level config ──────────────────────────────────────────────────

/** Top-level application configuration shape. */
export interface AppConfig {
  /** Active UI theme identifier. */
  theme: 'default-dark' | 'default-light' | string;
  /** BCP-47 locale code, e.g. `'en'`. */
  locale: string;
  /** Absolute paths to recently opened campaign files (most recent first). */
  recentCampaigns: string[];
  /** Minimum log level to output. */
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

/** Campaign-scoped configuration (embedded in the campaign .db). */
export interface CampaignConfig {
  /** Campaign display name. */
  name: string;
  /** Optional game system identifier, e.g. `'dnd5e'`. */
  system?: string;
  /** Per-module config overrides keyed by module ID. */
  modules: Record<string, Record<string, ConfigValue>>;
}

/** Built-in defaults for AppConfig. */
export const APP_CONFIG_DEFAULTS: Readonly<AppConfig> = {
  theme:           'default-dark',
  locale:          'en',
  recentCampaigns: [],
  logLevel:        'info',
};

// ── Module config registration ────────────────────────────────────────────────

/**
 * A module submits this at boot to declare its config keys and defaults.
 * ConfigManager stores these and merges them with user/campaign overrides.
 */
export interface ModuleConfigRegistration<T extends Record<string, ConfigValue>> {
  /** Module identifier, e.g. `'quests'`. */
  module: string;
  /** Default values for every config key this module uses. */
  defaults: T;
}

// ── ConfigManager interface ───────────────────────────────────────────────────

export interface IConfigManager {
  /**
   * Load configuration from the user config file on disk.
   * Merges with built-in defaults (file values win on conflict).
   *
   * @param configPath - Absolute path to `user.json`.
   */
  load(configPath: string): void;

  /**
   * Persist the current in-memory config back to the user config file.
   */
  save(): void;

  /**
   * Register a module's config schema and defaults.
   * Must be called before load() so defaults are available immediately.
   */
  registerModule<T extends Record<string, ConfigValue>>(
    registration: ModuleConfigRegistration<T>,
  ): void;

  /**
   * Read the application-level config.
   */
  getAppConfig(): Readonly<AppConfig>;

  /**
   * Update one or more application-level config keys.
   * Triggers an immediate save.
   */
  setAppConfig(patch: Partial<AppConfig>): void;

  /**
   * Read a module's merged config (defaults + user overrides + campaign overrides).
   *
   * @param moduleId - The module identifier used during registerModule().
   * @returns The module config object, or an empty object if not registered.
   */
  getModuleConfig<T extends Record<string, ConfigValue>>(moduleId: string): Readonly<T>;

  /**
   * Override a module config value (written to the user config layer).
   *
   * @param moduleId - The module identifier.
   * @param key      - Config key to set.
   * @param value    - New value.
   */
  setModuleConfig(moduleId: string, key: string, value: ConfigValue): void;

  /**
   * Apply a campaign config blob (read from the campaign .db on open).
   * Campaign values take the highest priority.
   */
  applyCampaignConfig(campaignConfig: CampaignConfig): void;

  /**
   * Clear the active campaign config (called when a campaign is closed).
   */
  clearCampaignConfig(): void;
}
