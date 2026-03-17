// ─────────────────────────────────────────────────────────────────────────────
// shared/types/plugin.ts
//
// Plugin-facing public types.
// Plugins import from @alaruel/shared only — never from core packages.
// This file re-exports the subset of core types that plugins need.
// ─────────────────────────────────────────────────────────────────────────────

// ── Permissions ───────────────────────────────────────────────────────────────

/**
 * All permissions a plugin can request in its plugin.json manifest.
 */
export type PluginPermission =
  | 'events:subscribe'
  | 'events:emit'
  | 'db:read'
  | 'db:write'
  | 'ui:extend'
  | 'config:read'
  | 'config:write';

// ── Manifest ──────────────────────────────────────────────────────────────────

/**
 * The shape of a plugin's `plugin.json` manifest file.
 * Validated by the PluginLoader before the plugin is loaded.
 */
export interface PluginManifest {
  id:              string;
  name:            string;
  version:         string;
  entry:           string;
  permissions:     PluginPermission[];
  description?:    string;
  minAppVersion?:  string;
}

// ── Plugin API surface (subset safe for shared/ re-export) ────────────────────

/**
 * The read-only context provided to a plugin's `init()` function.
 * Describes which permissions were granted by the host.
 */
export interface PluginContext {
  /** The plugin's own ID. */
  readonly pluginId:   string;
  /** The permissions that were granted (may be a subset of what was requested). */
  readonly permissions: ReadonlySet<PluginPermission>;
  /** ISO-8601 timestamp when the plugin was loaded. */
  readonly loadedAt:   string;
}

// ── UI extension points ───────────────────────────────────────────────────────

/**
 * A contribution a plugin makes to the application's navigation sidebar.
 * Requires the `'ui:extend'` permission.
 */
export interface PluginSidebarEntry {
  /** Unique identifier for this entry within the plugin's namespace. */
  id:          string;
  /** Display label shown in the sidebar. */
  label:       string;
  /**
   * Icon identifier from the shared icon set.
   * The UI falls back to a default plugin icon if unrecognised.
   */
  icon?:       string;
  /**
   * Route path to navigate to when the entry is clicked.
   * Must be unique across all plugins.
   */
  routePath:   string;
  /** Display order weight. Lower values appear higher in the sidebar. */
  order?:      number;
}
