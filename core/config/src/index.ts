// ─────────────────────────────────────────────────────────────────────────────
// core/config — ConfigManager implementation
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import type {
  IConfigManager,
  AppConfig,
  CampaignConfig,
  ConfigValue,
  ModuleConfigRegistration,
} from './schema';
import { APP_CONFIG_DEFAULTS } from './schema';
import { createLogger } from '../../logger/src/index';

export type {
  IConfigManager,
  AppConfig,
  CampaignConfig,
  ConfigValue,
  ModuleConfigRegistration,
};
export { APP_CONFIG_DEFAULTS };

// ── ConfigManager ─────────────────────────────────────────────────────────────

/**
 * Three-layer typed configuration manager.
 *
 * Priority (highest wins): campaign config > user config > built-in defaults.
 *
 * Layers:
 *  1. **Defaults** — hardcoded in APP_CONFIG_DEFAULTS and module registrations.
 *  2. **User**     — persisted in `data/config/user.json` on disk.
 *  3. **Campaign** — embedded in the active campaign's SQLite file.
 *
 * Modules call `registerModule()` at boot to declare their config keys and
 * defaults. They then call `getModuleConfig()` to read merged values.
 *
 * @example
 * ```ts
 * // Module registration (at boot, before load())
 * configManager.registerModule({
 *   module: 'quests',
 *   defaults: { showCompletedQuests: true, maxDisplayed: 50 },
 * });
 *
 * // After load()
 * const cfg = configManager.getModuleConfig<QuestsConfig>('quests');
 * cfg.showCompletedQuests; // true (or user/campaign override)
 *
 * // Write a user preference
 * configManager.setModuleConfig('quests', 'maxDisplayed', 25);
 * ```
 */
export class ConfigManager implements IConfigManager {
  private configPath:   string | null = null;
  private appConfig:    AppConfig     = { ...APP_CONFIG_DEFAULTS };
  private campaignConfig: CampaignConfig | null = null;

  /** Module defaults keyed by module ID. */
  private readonly moduleDefaults = new Map<string, Record<string, ConfigValue>>();

  /** User-layer module overrides keyed by module ID. */
  private userModuleOverrides: Record<string, Record<string, ConfigValue>> = {};

  private readonly log = createLogger('core:config');

  // ── load ───────────────────────────────────────────────────────────────────

  /**
   * Load the user config file from disk and merge it with built-in defaults.
   * If the file does not exist, it is created with default values.
   *
   * @param configPath - Absolute path to the user config JSON file.
   */
  load(configPath: string): void {
    this.configPath = configPath;
    this.log.info('Loading config', { configPath });

    if (!existsSync(configPath)) {
      this.log.info('Config file not found — creating with defaults', { configPath });
      this.save();
      return;
    }

    try {
      const raw  = readFileSync(configPath, 'utf-8');
      const disk = JSON.parse(raw) as Partial<{
        app:     Partial<AppConfig>;
        modules: Record<string, Record<string, ConfigValue>>;
      }>;

      // Merge app-level config: defaults ← user file.
      this.appConfig = { ...APP_CONFIG_DEFAULTS, ...(disk.app ?? {}) };

      // Store user module overrides for later merging.
      this.userModuleOverrides = disk.modules ?? {};

      this.log.info('Config loaded');
    } catch (err) {
      this.log.error('Failed to parse config file — using defaults', {
        configPath,
        error: err instanceof Error ? err.message : String(err),
      });
      this.appConfig = { ...APP_CONFIG_DEFAULTS };
    }
  }

  // ── save ───────────────────────────────────────────────────────────────────

  /**
   * Persist the current user-layer config to disk.
   * Does nothing if load() has not been called yet.
   */
  save(): void {
    if (!this.configPath) {
      this.log.warn('save() called before load() — no path known');
      return;
    }

    const payload = {
      _comment: 'Managed by Alaruel Atlas — do not edit manually.',
      app:      this.appConfig,
      modules:  this.userModuleOverrides,
    };

    try {
      writeFileSync(this.configPath, JSON.stringify(payload, null, 2), 'utf-8');
      this.log.debug('Config saved', { configPath: this.configPath });
    } catch (err) {
      this.log.error('Failed to save config', {
        configPath: this.configPath,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // ── registerModule ─────────────────────────────────────────────────────────

  /**
   * Register a module's config defaults.
   * Should be called by every module during the boot sequence, before load().
   */
  registerModule<T extends Record<string, ConfigValue>>(
    registration: ModuleConfigRegistration<T>,
  ): void {
    this.log.debug(`Module config registered: "${registration.module}"`, {
      module: registration.module,
      keys:   Object.keys(registration.defaults),
    });
    this.moduleDefaults.set(registration.module, registration.defaults as Record<string, ConfigValue>);
  }

  // ── getAppConfig ───────────────────────────────────────────────────────────

  /** Return the merged application-level configuration. */
  getAppConfig(): Readonly<AppConfig> {
    return this.appConfig;
  }

  // ── setAppConfig ───────────────────────────────────────────────────────────

  /**
   * Update one or more application-level config keys and save to disk.
   */
  setAppConfig(patch: Partial<AppConfig>): void {
    this.appConfig = { ...this.appConfig, ...patch };
    this.log.debug('App config updated', { patch });
    this.save();
  }

  // ── getModuleConfig ────────────────────────────────────────────────────────

  /**
   * Return the merged config for a module.
   *
   * Merge order (highest priority last):
   *  moduleDefaults → userModuleOverrides → campaignConfig.modules
   *
   * @param moduleId - The module ID used during registerModule().
   */
  getModuleConfig<T extends Record<string, ConfigValue>>(moduleId: string): Readonly<T> {
    const defaults   = this.moduleDefaults.get(moduleId)         ?? {};
    const userLayer  = this.userModuleOverrides[moduleId]         ?? {};
    const campaignLayer = this.campaignConfig?.modules[moduleId]  ?? {};

    return { ...defaults, ...userLayer, ...campaignLayer } as T;
  }

  // ── setModuleConfig ────────────────────────────────────────────────────────

  /**
   * Write a module config value to the user layer and save to disk.
   * Campaign-layer values are not affected.
   */
  setModuleConfig(moduleId: string, key: string, value: ConfigValue): void {
    if (!this.userModuleOverrides[moduleId]) {
      this.userModuleOverrides[moduleId] = {};
    }
    // Non-null assertion is safe — we just assigned it above.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    this.userModuleOverrides[moduleId]![key] = value;
    this.log.debug('Module config updated', { moduleId, key, value });
    this.save();
  }

  // ── applyCampaignConfig ────────────────────────────────────────────────────

  /**
   * Apply a campaign config object (loaded from the campaign's SQLite file).
   * Campaign values override both defaults and user config.
   *
   * Called when the user opens a campaign.
   */
  applyCampaignConfig(campaignConfig: CampaignConfig): void {
    this.campaignConfig = campaignConfig;
    this.log.info('Campaign config applied', { campaign: campaignConfig.name });
  }

  // ── clearCampaignConfig ────────────────────────────────────────────────────

  /**
   * Remove the active campaign config layer.
   * Called when the user closes a campaign.
   */
  clearCampaignConfig(): void {
    this.campaignConfig = null;
    this.log.info('Campaign config cleared');
  }
}

// ── Singleton ─────────────────────────────────────────────────────────────────

/**
 * Application-wide config manager singleton.
 */
export const configManager = new ConfigManager();
