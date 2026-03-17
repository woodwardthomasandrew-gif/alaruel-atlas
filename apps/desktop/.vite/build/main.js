"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/main.ts
var import_electron3 = require("electron");
var path3 = __toESM(require("node:path"));
var fs2 = __toESM(require("node:fs"));

// ../../core/logger/src/types.ts
var LOG_LEVEL_WEIGHT = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

// ../../core/logger/src/index.ts
var LEVEL_COLOURS = {
  debug: "\x1B[36m",
  // cyan
  info: "\x1B[32m",
  // green
  warn: "\x1B[33m",
  // yellow
  error: "\x1B[31m"
  // red
};
var RESET = "\x1B[0m";
var consoleSink = (entry) => {
  const colour = LEVEL_COLOURS[entry.level];
  const level = entry.level.toUpperCase().padEnd(5);
  const line = `${colour}[${level}]${RESET} ${entry.timestamp} [${entry.source}] ${entry.message}`;
  const output = entry.level === "error" ? console.error : console.log;
  if (entry.context && Object.keys(entry.context).length > 0) {
    output(line, entry.context);
  } else {
    output(line);
  }
};
var LoggerImpl = class _LoggerImpl {
  source;
  minLevelWeight;
  sinks;
  constructor(source, options) {
    this.source = source;
    this.minLevelWeight = LOG_LEVEL_WEIGHT[options.minLevel];
    this.sinks = options.sinks;
  }
  // ── Public API ─────────────────────────────────────────────────────────────
  debug(message, context) {
    this.write("debug", message, context);
  }
  info(message, context) {
    this.write("info", message, context);
  }
  warn(message, context) {
    this.write("warn", message, context);
  }
  error(message, context) {
    this.write("error", message, context);
  }
  /**
   * Create a child logger whose source tag is `parentSource:subSource`.
   * The child inherits the parent's min-level and sinks.
   */
  child(subSource) {
    return new _LoggerImpl(`${this.source}:${subSource}`, {
      minLevel: levelFromWeight(this.minLevelWeight),
      sinks: [...this.sinks]
    });
  }
  // ── Private helpers ────────────────────────────────────────────────────────
  write(level, message, context) {
    if (LOG_LEVEL_WEIGHT[level] < this.minLevelWeight) return;
    const entry = {
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      level,
      source: this.source,
      message,
      ...context !== void 0 ? { context } : {}
    };
    for (const sink of this.sinks) {
      try {
        sink(entry);
      } catch {
      }
    }
  }
};
var globalMinLevel = typeof process !== "undefined" && process.env["NODE_ENV"] === "production" ? "info" : "debug";
var globalSinks = [consoleSink];
function createLogger(source, options) {
  return new LoggerImpl(source, {
    minLevel: options?.minLevel ?? globalMinLevel,
    sinks: options?.sinks ?? globalSinks
  });
}
function configureLogger(options) {
  if (options.minLevel !== void 0) globalMinLevel = options.minLevel;
  if (options.addSink !== void 0) globalSinks.push(options.addSink);
  if (options.replaceSinks !== void 0) {
    globalSinks.length = 0;
    globalSinks.push(...options.replaceSinks);
  }
}
function levelFromWeight(weight) {
  for (const [k, v] of Object.entries(LOG_LEVEL_WEIGHT)) {
    if (v === weight) return k;
  }
  return "debug";
}

// ../../core/config/src/index.ts
var import_node_fs = require("node:fs");

// ../../core/config/src/schema.ts
var APP_CONFIG_DEFAULTS = {
  theme: "default-dark",
  locale: "en",
  recentCampaigns: [],
  logLevel: "info"
};

// ../../core/config/src/index.ts
var ConfigManager = class {
  configPath = null;
  appConfig = { ...APP_CONFIG_DEFAULTS };
  campaignConfig = null;
  /** Module defaults keyed by module ID. */
  moduleDefaults = /* @__PURE__ */ new Map();
  /** User-layer module overrides keyed by module ID. */
  userModuleOverrides = {};
  log = createLogger("core:config");
  // ── load ───────────────────────────────────────────────────────────────────
  /**
   * Load the user config file from disk and merge it with built-in defaults.
   * If the file does not exist, it is created with default values.
   *
   * @param configPath - Absolute path to the user config JSON file.
   */
  load(configPath) {
    this.configPath = configPath;
    this.log.info("Loading config", { configPath });
    if (!(0, import_node_fs.existsSync)(configPath)) {
      this.log.info("Config file not found \u2014 creating with defaults", { configPath });
      this.save();
      return;
    }
    try {
      const raw = (0, import_node_fs.readFileSync)(configPath, "utf-8");
      const disk = JSON.parse(raw);
      this.appConfig = { ...APP_CONFIG_DEFAULTS, ...disk.app ?? {} };
      this.userModuleOverrides = disk.modules ?? {};
      this.log.info("Config loaded");
    } catch (err) {
      this.log.error("Failed to parse config file \u2014 using defaults", {
        configPath,
        error: err instanceof Error ? err.message : String(err)
      });
      this.appConfig = { ...APP_CONFIG_DEFAULTS };
    }
  }
  // ── save ───────────────────────────────────────────────────────────────────
  /**
   * Persist the current user-layer config to disk.
   * Does nothing if load() has not been called yet.
   */
  save() {
    if (!this.configPath) {
      this.log.warn("save() called before load() \u2014 no path known");
      return;
    }
    const payload = {
      _comment: "Managed by Alaruel Atlas \u2014 do not edit manually.",
      app: this.appConfig,
      modules: this.userModuleOverrides
    };
    try {
      (0, import_node_fs.writeFileSync)(this.configPath, JSON.stringify(payload, null, 2), "utf-8");
      this.log.debug("Config saved", { configPath: this.configPath });
    } catch (err) {
      this.log.error("Failed to save config", {
        configPath: this.configPath,
        error: err instanceof Error ? err.message : String(err)
      });
    }
  }
  // ── registerModule ─────────────────────────────────────────────────────────
  /**
   * Register a module's config defaults.
   * Should be called by every module during the boot sequence, before load().
   */
  registerModule(registration) {
    this.log.debug(`Module config registered: "${registration.module}"`, {
      module: registration.module,
      keys: Object.keys(registration.defaults)
    });
    this.moduleDefaults.set(registration.module, registration.defaults);
  }
  // ── getAppConfig ───────────────────────────────────────────────────────────
  /** Return the merged application-level configuration. */
  getAppConfig() {
    return this.appConfig;
  }
  // ── setAppConfig ───────────────────────────────────────────────────────────
  /**
   * Update one or more application-level config keys and save to disk.
   */
  setAppConfig(patch) {
    this.appConfig = { ...this.appConfig, ...patch };
    this.log.debug("App config updated", { patch });
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
  getModuleConfig(moduleId) {
    const defaults = this.moduleDefaults.get(moduleId) ?? {};
    const userLayer = this.userModuleOverrides[moduleId] ?? {};
    const campaignLayer = this.campaignConfig?.modules[moduleId] ?? {};
    return { ...defaults, ...userLayer, ...campaignLayer };
  }
  // ── setModuleConfig ────────────────────────────────────────────────────────
  /**
   * Write a module config value to the user layer and save to disk.
   * Campaign-layer values are not affected.
   */
  setModuleConfig(moduleId, key, value) {
    if (!this.userModuleOverrides[moduleId]) {
      this.userModuleOverrides[moduleId] = {};
    }
    this.userModuleOverrides[moduleId][key] = value;
    this.log.debug("Module config updated", { moduleId, key, value });
    this.save();
  }
  // ── applyCampaignConfig ────────────────────────────────────────────────────
  /**
   * Apply a campaign config object (loaded from the campaign's SQLite file).
   * Campaign values override both defaults and user config.
   *
   * Called when the user opens a campaign.
   */
  applyCampaignConfig(campaignConfig) {
    this.campaignConfig = campaignConfig;
    this.log.info("Campaign config applied", { campaign: campaignConfig.name });
  }
  // ── clearCampaignConfig ────────────────────────────────────────────────────
  /**
   * Remove the active campaign config layer.
   * Called when the user closes a campaign.
   */
  clearCampaignConfig() {
    this.campaignConfig = null;
    this.log.info("Campaign config cleared");
  }
};
var configManager = new ConfigManager();

// ../../core/assets/src/index.ts
var import_node_crypto = require("node:crypto");
var import_node_fs2 = require("node:fs");
var import_node_path = require("node:path");

// ../../core/database/src/migrations.ts
function bootstrapMigrationsTable(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      version     INTEGER PRIMARY KEY,
      module      TEXT    NOT NULL,
      description TEXT    NOT NULL,
      applied_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );
  `);
}
function runMigrations(db, migrations, log4) {
  const applied = new Set(
    db.prepare("SELECT version FROM _migrations ORDER BY version ASC").all().map((r) => r.version)
  );
  const pending = migrations.filter((m) => !applied.has(m.version)).sort((a, b) => a.version - b.version);
  if (pending.length === 0) {
    log4.debug("No pending migrations");
    return;
  }
  log4.info(`Running ${pending.length} pending migration(s)`);
  for (const migration of pending) {
    log4.info(`Applying migration v${migration.version}: ${migration.description}`, {
      version: migration.version,
      module: migration.module
    });
    db.exec(migration.up);
    db.prepare(
      "INSERT INTO _migrations (version, module, description) VALUES (?, ?, ?)"
    ).run(migration.version, migration.module, migration.description);
    log4.info(`Migration v${migration.version} applied successfully`);
  }
}

// ../../core/database/src/index.ts
var DatabaseManager = class {
  db = null;
  state = "disconnected";
  schemas = [];
  log = createLogger("core:database");
  factory;
  /**
   * @param factory - Optional custom database factory (e.g. a mock for tests).
   *                  Defaults to requiring better-sqlite3 at runtime.
   */
  constructor(factory) {
    this.factory = factory ?? this.requireBetterSqlite3();
  }
  // ── connect ────────────────────────────────────────────────────────────────
  /**
   * Open (or create) the SQLite file at `dbPath` and run all pending
   * migrations from registered schemas.
   *
   * Idempotent: calling connect() on an already-connected manager is a no-op
   * with a warning log.
   *
   * @param dbPath - Absolute path to the `.db` campaign file.
   */
  connect(dbPath) {
    if (this.state === "connected") {
      this.log.warn("connect() called while already connected \u2014 ignoring", { dbPath });
      return;
    }
    this.log.info("Opening database", { dbPath });
    try {
      this.db = this.factory(dbPath);
      this.state = "connected";
    } catch (err) {
      this.state = "error";
      this.log.error("Failed to open database", {
        dbPath,
        error: err instanceof Error ? err.message : String(err)
      });
      throw err;
    }
    this.db.exec("PRAGMA journal_mode = WAL;");
    this.db.exec("PRAGMA foreign_keys = ON;");
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS campaigns (
        id          TEXT     PRIMARY KEY,
        name        TEXT     NOT NULL,
        gm_name     TEXT     NOT NULL DEFAULT '',
        system      TEXT     NOT NULL DEFAULT '',
        status      TEXT     NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active','on_hiatus','completed','archived')),
        description TEXT     NOT NULL DEFAULT '',
        created_at  TEXT     NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
        updated_at  TEXT     NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
      );
      CREATE TABLE IF NOT EXISTS entity_registry (
        id          TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
        module      TEXT NOT NULL,
        created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
        PRIMARY KEY (id, entity_type)
      );
    `);
    const allMigrations = this.schemas.flatMap((s) => s.migrations);
    bootstrapMigrationsTable(this.db);
    runMigrations(this.db, allMigrations, this.log);
    this.log.info("Database ready", { dbPath });
  }
  // ── disconnect ─────────────────────────────────────────────────────────────
  /**
   * Flush WAL and close the database connection.
   * Call this during app shutdown to prevent data loss.
   */
  disconnect() {
    if (!this.db || this.state !== "connected") return;
    this.log.info("Closing database");
    try {
      this.db.exec("PRAGMA wal_checkpoint(TRUNCATE);");
      this.db.close();
    } finally {
      this.db = null;
      this.state = "disconnected";
    }
  }
  // ── query ──────────────────────────────────────────────────────────────────
  /**
   * Execute a SELECT statement and return the result rows as typed objects.
   *
   * @param sql    - SQL string with `?` placeholders.
   * @param params - Values to bind in order.
   * @returns Array of rows. Empty array when no rows match.
   *
   * @throws If the database is not connected.
   */
  query(sql, params = []) {
    const db = this.assertConnected("query");
    this.log.debug("query", { sql });
    const stmt = db.prepare(sql);
    return stmt.all(...params);
  }
  // ── run ────────────────────────────────────────────────────────────────────
  /**
   * Execute a non-SELECT statement (INSERT, UPDATE, DELETE, DDL).
   *
   * @returns `{ lastInsertRowid, changes }` describing the operation.
   * @throws If the database is not connected.
   */
  run(sql, params = []) {
    const db = this.assertConnected("run");
    this.log.debug("run", { sql });
    const stmt = db.prepare(sql);
    const result = stmt.run(...params);
    return {
      lastInsertRowid: result.lastInsertRowid,
      changes: result.changes
    };
  }
  // ── transaction ────────────────────────────────────────────────────────────
  /**
   * Execute `fn` inside a single SQLite transaction.
   *
   * - If `fn` returns normally → COMMIT.
   * - If `fn` throws → ROLLBACK, then re-throws.
   *
   * Transactions can be nested: SQLite will use savepoints automatically.
   *
   * @param fn - Synchronous work to perform.
   * @returns The return value of `fn`.
   */
  transaction(fn) {
    const db = this.assertConnected("transaction");
    this.log.debug("transaction begin");
    const txFn = db.transaction(fn);
    return txFn();
  }
  // ── registerSchema ─────────────────────────────────────────────────────────
  /**
   * Register a module's migrations.
   * Must be called before `connect()` — registrations after connect() are
   * rejected with an error.
   *
   * @param registration - Module ID + array of Migration objects.
   */
  registerSchema(registration) {
    if (this.state === "connected") {
      throw new Error(
        `[core:database] registerSchema() called after connect() for module "${registration.module}". All schema registrations must happen before opening the database.`
      );
    }
    this.log.debug(`Schema registered for module "${registration.module}"`, {
      module: registration.module,
      migrationCount: registration.migrations.length
    });
    this.schemas.push(registration);
  }
  // ── Private helpers ────────────────────────────────────────────────────────
  assertConnected(operation) {
    if (!this.db || this.state !== "connected") {
      throw new Error(
        `[core:database] Cannot call ${operation}() \u2014 database is not connected. Call connect() first.`
      );
    }
    return this.db;
  }
  /**
   * Lazily require better-sqlite3 at runtime.
   * This keeps the package compilable without better-sqlite3 in dev workspaces.
   */
  requireBetterSqlite3() {
    return (path4) => {
      const Database = require("better-sqlite3");
      return Database(path4);
    };
  }
};
var databaseManager = new DatabaseManager();

// ../../core/assets/src/index.ts
var EXT_TO_MIME = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
  ".wav": "audio/wav",
  ".pdf": "application/pdf"
};
function resolveMime(filePath) {
  const ext = (0, import_node_path.extname)(filePath).toLowerCase();
  return EXT_TO_MIME[ext] ?? "application/octet-stream";
}
function generateId() {
  return (0, import_node_crypto.createHash)("sha256").update(`${Date.now()}-${Math.random()}`).digest("hex").slice(0, 21);
}
var ASSET_SCHEMA = {
  module: "core_assets",
  migrations: [
    {
      version: 1,
      module: "core_assets",
      description: "Create assets and asset_links tables",
      up: `
        CREATE TABLE IF NOT EXISTS core_assets (
          id           TEXT PRIMARY KEY,
          name         TEXT NOT NULL,
          category     TEXT NOT NULL,
          mime_type    TEXT NOT NULL,
          hash         TEXT NOT NULL UNIQUE,
          size_bytes   INTEGER NOT NULL,
          virtual_path TEXT NOT NULL UNIQUE,
          disk_path    TEXT NOT NULL,
          created_at   TEXT NOT NULL,
          tags         TEXT NOT NULL DEFAULT '[]'
        );

        CREATE TABLE IF NOT EXISTS core_asset_links (
          asset_id      TEXT NOT NULL REFERENCES core_assets(id) ON DELETE CASCADE,
          entity_module TEXT NOT NULL,
          entity_id     TEXT NOT NULL,
          role          TEXT NOT NULL,
          PRIMARY KEY (asset_id, entity_module, entity_id, role)
        );

        CREATE INDEX IF NOT EXISTS idx_asset_links_entity
          ON core_asset_links (entity_module, entity_id);
      `
    }
  ]
};
var AssetManager = class {
  storageDir = null;
  log = createLogger("core:assets");
  // ── init ───────────────────────────────────────────────────────────────────
  /**
   * Initialise the asset manager with a storage root directory.
   * Creates the directory tree for each category if absent.
   * Registers the asset schema with the DatabaseManager.
   *
   * @param storageDir - Absolute path to the asset root (e.g. `data/assets`).
   */
  init(storageDir) {
    this.storageDir = storageDir;
    const categories = ["maps", "portraits", "audio", "documents", "misc"];
    for (const cat of categories) {
      (0, import_node_fs2.mkdirSync)((0, import_node_path.join)(storageDir, cat), { recursive: true });
    }
    databaseManager.registerSchema(ASSET_SCHEMA);
    this.log.info("AssetManager initialised", { storageDir });
  }
  // ── registerAsset ──────────────────────────────────────────────────────────
  /**
   * Import a file from `sourcePath` into the managed store.
   *
   * If a file with the same SHA-256 hash is already registered, returns the
   * existing AssetRecord without copying or writing to the database again.
   *
   * @param options - Import options (name, sourcePath, category, tags).
   * @returns The AssetRecord for the imported (or existing) asset.
   */
  async registerAsset(options) {
    this.assertInitialised("registerAsset");
    const { name, sourcePath, category, tags = [] } = options;
    if (!(0, import_node_fs2.existsSync)(sourcePath)) {
      throw new Error(`[core:assets] Source file not found: ${sourcePath}`);
    }
    const hash = this.hashFile(sourcePath);
    const existing = databaseManager.query(
      "SELECT * FROM core_assets WHERE hash = ? LIMIT 1",
      [hash]
    );
    if (existing.length > 0 && existing[0]) {
      this.log.info("Asset already exists (dedup by hash)", { hash, id: existing[0].id });
      return rowToRecord(existing[0]);
    }
    const id = generateId();
    const ext = (0, import_node_path.extname)((0, import_node_path.basename)(sourcePath)).toLowerCase();
    const mimeType = resolveMime(sourcePath);
    const sizeBytes = (0, import_node_fs2.readFileSync)(sourcePath).length;
    const destDir = (0, import_node_path.join)(this.storageDir, category);
    const destFile = `${id}${ext}`;
    const diskPath = (0, import_node_path.join)(destDir, destFile);
    const virtualPath = `asset://${category}/${id}${ext}`;
    const createdAt = (/* @__PURE__ */ new Date()).toISOString();
    (0, import_node_fs2.copyFileSync)(sourcePath, diskPath);
    const record = {
      id,
      name,
      category,
      mimeType,
      hash,
      sizeBytes,
      virtualPath,
      diskPath,
      createdAt,
      tags
    };
    databaseManager.run(
      `INSERT INTO core_assets
         (id, name, category, mime_type, hash, size_bytes, virtual_path, disk_path, created_at, tags)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, name, category, mimeType, hash, sizeBytes, virtualPath, diskPath, createdAt, JSON.stringify(tags)]
    );
    this.log.info("Asset registered", { id, name, category, virtualPath });
    return record;
  }
  // ── loadAsset ──────────────────────────────────────────────────────────────
  /**
   * Look up an asset by its ID or virtual path.
   *
   * @param idOrVirtualPath - Asset ID (`abc123`) or virtual path (`asset://maps/abc123.png`).
   * @returns The AssetRecord or `null` if not found.
   */
  loadAsset(idOrVirtualPath) {
    this.assertInitialised("loadAsset");
    const isVirtualPath = idOrVirtualPath.startsWith("asset://");
    const rows = isVirtualPath ? databaseManager.query("SELECT * FROM core_assets WHERE virtual_path = ? LIMIT 1", [idOrVirtualPath]) : databaseManager.query("SELECT * FROM core_assets WHERE id = ? LIMIT 1", [idOrVirtualPath]);
    if (rows.length === 0 || !rows[0]) return null;
    return rowToRecord(rows[0]);
  }
  // ── tagAsset ───────────────────────────────────────────────────────────────
  /**
   * Add and/or remove tags on an asset. Returns the updated AssetRecord.
   *
   * Adding a tag that already exists is a no-op.
   * Removing a tag that doesn't exist is a no-op.
   *
   * @param assetId    - Target asset ID.
   * @param addTags    - Tags to add.
   * @param removeTags - Tags to remove.
   */
  tagAsset(assetId, addTags = [], removeTags = []) {
    this.assertInitialised("tagAsset");
    const record = this.loadAsset(assetId);
    if (!record) {
      throw new Error(`[core:assets] Asset not found: ${assetId}`);
    }
    const tagSet = new Set(record.tags);
    for (const t of addTags) tagSet.add(t);
    for (const t of removeTags) tagSet.delete(t);
    const newTags = [...tagSet];
    databaseManager.run(
      "UPDATE core_assets SET tags = ? WHERE id = ?",
      [JSON.stringify(newTags), assetId]
    );
    this.log.debug("Asset tags updated", { assetId, addTags, removeTags, newTags });
    return { ...record, tags: newTags };
  }
  // ── linkAsset ──────────────────────────────────────────────────────────────
  /**
   * Associate an asset with a domain entity.
   * Idempotent: if the exact link already exists, does nothing.
   *
   * @param link - AssetLink describing the relationship.
   */
  linkAsset(link) {
    this.assertInitialised("linkAsset");
    const { assetId, entityModule, entityId, role } = link;
    databaseManager.run(
      "INSERT OR IGNORE INTO core_asset_links (asset_id, entity_module, entity_id, role) VALUES (?, ?, ?, ?)",
      [assetId, entityModule, entityId, role]
    );
    this.log.debug("Asset linked", link);
  }
  // ── unlinkAsset ────────────────────────────────────────────────────────────
  /**
   * Remove a specific asset–entity link.
   * Silently does nothing if the link does not exist.
   */
  unlinkAsset(link) {
    this.assertInitialised("unlinkAsset");
    const { assetId, entityModule, entityId, role } = link;
    databaseManager.run(
      "DELETE FROM core_asset_links WHERE asset_id = ? AND entity_module = ? AND entity_id = ? AND role = ?",
      [assetId, entityModule, entityId, role]
    );
    this.log.debug("Asset unlinked", link);
  }
  // ── getLinksForEntity ──────────────────────────────────────────────────────
  /**
   * Return all AssetRecords linked to a given entity.
   *
   * @param entityModule - Module namespace, e.g. `'npcs'`.
   * @param entityId     - The entity's ID.
   * @param role         - Optional filter by role.
   */
  getLinksForEntity(entityModule, entityId, role) {
    this.assertInitialised("getLinksForEntity");
    const sql = role ? `SELECT a.* FROM core_assets a
           JOIN core_asset_links l ON l.asset_id = a.id
          WHERE l.entity_module = ? AND l.entity_id = ? AND l.role = ?` : `SELECT a.* FROM core_assets a
           JOIN core_asset_links l ON l.asset_id = a.id
          WHERE l.entity_module = ? AND l.entity_id = ?`;
    const params = role ? [entityModule, entityId, role] : [entityModule, entityId];
    return databaseManager.query(sql, params).map(rowToRecord);
  }
  // ── getLinksForAsset ───────────────────────────────────────────────────────
  /**
   * Return all AssetLinks pointing to a given asset.
   *
   * @param assetId - The asset's ID.
   */
  getLinksForAsset(assetId) {
    this.assertInitialised("getLinksForAsset");
    return databaseManager.query(
      "SELECT * FROM core_asset_links WHERE asset_id = ?",
      [assetId]
    ).map((r) => ({
      assetId: r.asset_id,
      entityModule: r.entity_module,
      entityId: r.entity_id,
      role: r.role
    }));
  }
  // ── deleteAsset ────────────────────────────────────────────────────────────
  /**
   * Permanently remove an asset: delete its database record (cascade-deletes
   * links), and delete the file from disk.
   *
   * @param assetId - The asset to delete.
   * @throws If the asset is not found.
   */
  deleteAsset(assetId) {
    this.assertInitialised("deleteAsset");
    const record = this.loadAsset(assetId);
    if (!record) {
      throw new Error(`[core:assets] Cannot delete \u2014 asset not found: ${assetId}`);
    }
    databaseManager.run("DELETE FROM core_assets WHERE id = ?", [assetId]);
    if ((0, import_node_fs2.existsSync)(record.diskPath)) {
      (0, import_node_fs2.unlinkSync)(record.diskPath);
    }
    this.log.info("Asset deleted", { assetId, diskPath: record.diskPath });
  }
  // ── Private helpers ────────────────────────────────────────────────────────
  assertInitialised(method) {
    if (!this.storageDir) {
      throw new Error(
        `[core:assets] Cannot call ${method}() \u2014 AssetManager not initialised. Call init() first.`
      );
    }
  }
  hashFile(filePath) {
    const contents = (0, import_node_fs2.readFileSync)(filePath);
    return (0, import_node_crypto.createHash)("sha256").update(contents).digest("hex");
  }
};
function rowToRecord(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    mimeType: row.mime_type,
    hash: row.hash,
    sizeBytes: row.size_bytes,
    virtualPath: row.virtual_path,
    diskPath: row.disk_path,
    createdAt: row.created_at,
    tags: JSON.parse(row.tags)
  };
}
var assetManager = new AssetManager();

// ../../core/plugins/src/index.ts
var import_node_fs3 = require("node:fs");
var import_node_path2 = require("node:path");

// ../../core/events/src/index.ts
var EventBus = class {
  /**
   * Map from event name → array of active subscriptions.
   * Using `unknown` internally and casting at call sites for type safety.
   */
  listeners = /* @__PURE__ */ new Map();
  /** Reverse index: token → event name, for O(1) unsubscribe. */
  tokenIndex = /* @__PURE__ */ new Map();
  log = createLogger("core:events");
  // ── emit ───────────────────────────────────────────────────────────────────
  /**
   * Synchronously dispatch an event to all registered handlers.
   *
   * Handlers are invoked in the order they were subscribed.
   * A handler that throws will not prevent subsequent handlers from running —
   * the error is caught, logged, and execution continues.
   *
   * @param event   - Must be a key of AppEventMap.
   * @param payload - Typed payload matching AppEventMap[event].
   */
  emit(event, payload) {
    const subs = this.listeners.get(event);
    if (!subs || subs.length === 0) {
      this.log.debug(`emit "${event}" \u2014 no listeners`, { event });
      return;
    }
    this.log.debug(`emit "${event}"`, { event, listenerCount: subs.length });
    const snapshot = [...subs];
    const onceCandidates = [];
    for (const sub of snapshot) {
      try {
        sub.handler(payload);
      } catch (err) {
        this.log.error(`Handler threw for event "${event}"`, {
          event,
          error: err instanceof Error ? err.message : String(err)
        });
      }
      if (sub.once) onceCandidates.push(sub.token);
    }
    for (const token of onceCandidates) {
      this.unsubscribe(token);
    }
  }
  // ── subscribe ──────────────────────────────────────────────────────────────
  /**
   * Register a persistent handler for an event.
   *
   * @returns An opaque SubscriptionToken — store it to unsubscribe later.
   */
  subscribe(event, handler) {
    return this.addSubscription(event, handler, false);
  }
  // ── unsubscribe ────────────────────────────────────────────────────────────
  /**
   * Remove a handler by its token.
   * Silently does nothing if the token is unknown or already removed.
   */
  unsubscribe(token) {
    const event = this.tokenIndex.get(token);
    if (event === void 0) return;
    const subs = this.listeners.get(event);
    if (subs) {
      const idx = subs.findIndex((s) => s.token === token);
      if (idx !== -1) subs.splice(idx, 1);
      if (subs.length === 0) this.listeners.delete(event);
    }
    this.tokenIndex.delete(token);
  }
  // ── once ───────────────────────────────────────────────────────────────────
  /**
   * Subscribe to an event for exactly one emission.
   * The handler is automatically unsubscribed after the first call.
   */
  once(event, handler) {
    return this.addSubscription(event, handler, true);
  }
  // ── clear ──────────────────────────────────────────────────────────────────
  /**
   * Remove all subscriptions for a specific event, or all subscriptions
   * when called without arguments.
   *
   * @param event - If omitted, clears every event.
   */
  clear(event) {
    if (event !== void 0) {
      const subs = this.listeners.get(event) ?? [];
      for (const sub of subs) this.tokenIndex.delete(sub.token);
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
      this.tokenIndex.clear();
    }
  }
  // ── listenerCount ──────────────────────────────────────────────────────────
  /** Return the number of active subscribers for a given event. */
  listenerCount(event) {
    return this.listeners.get(event)?.length ?? 0;
  }
  // ── Private helpers ────────────────────────────────────────────────────────
  addSubscription(event, handler, once) {
    const token = Symbol(event);
    const sub = { event, token, handler, once };
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(sub);
    this.tokenIndex.set(token, event);
    this.log.debug(`subscribed to "${event}"`, { event, once });
    return token;
  }
};
var eventBus = new EventBus();

// ../../core/plugins/src/api.ts
function buildPluginAPI(ctx, permissions) {
  const log4 = createLogger(`plugin:${ctx.manifest.id}`);
  function requirePermission(perm, method) {
    if (!permissions.has(perm)) {
      throw new Error(
        `[plugin:${ctx.manifest.id}] "${method}" requires the "${perm}" permission, but it was not declared in plugin.json.`
      );
    }
  }
  return {
    pluginId: ctx.manifest.id,
    subscribe(event, handler) {
      requirePermission("events:subscribe", "subscribe");
      const token = eventBus.subscribe(event, handler);
      ctx.tokens.push(token);
      log4.debug(`subscribed to "${event}"`);
      return token;
    },
    emit(event, payload) {
      requirePermission("events:emit", "emit");
      log4.debug(`emitting "${event}"`);
      eventBus.emit(event, payload);
    },
    dbQuery(sql, params = []) {
      requirePermission("db:read", "dbQuery");
      if (!/^\s*SELECT\b/i.test(sql)) {
        throw new Error(
          `[plugin:${ctx.manifest.id}] dbQuery() only accepts SELECT statements. Use dbRun() for write operations.`
        );
      }
      return databaseManager.query(sql, params);
    },
    dbRun(sql, params = []) {
      requirePermission("db:write", "dbRun");
      const result = databaseManager.run(sql, params);
      return { changes: result.changes };
    },
    getConfig(key) {
      requirePermission("config:read", "getConfig");
      const cfg = configManager.getModuleConfig(ctx.manifest.id);
      return cfg[key];
    },
    setConfig(key, value) {
      requirePermission("config:write", "setConfig");
      configManager.setModuleConfig(ctx.manifest.id, key, value);
    }
  };
}

// ../../core/plugins/src/index.ts
var PluginLoader = class {
  contexts = /* @__PURE__ */ new Map();
  log = createLogger("core:plugins");
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
  async loadAll(pluginsDir) {
    if (!(0, import_node_fs3.existsSync)(pluginsDir)) {
      this.log.info("Plugins directory not found \u2014 no plugins loaded", { pluginsDir });
      return;
    }
    const entries = (0, import_node_fs3.readdirSync)(pluginsDir, { withFileTypes: true });
    const dirs = entries.filter((e) => e.isDirectory());
    this.log.info(`Found ${dirs.length} plugin candidate(s)`, { pluginsDir });
    for (const dir of dirs) {
      const pluginDir = (0, import_node_path2.join)(pluginsDir, dir.name);
      try {
        await this.load(pluginDir);
      } catch (err) {
        this.log.error(`Failed to load plugin from "${pluginDir}"`, {
          error: err instanceof Error ? err.message : String(err)
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
  async load(pluginDir) {
    const manifest = this.readManifest(pluginDir);
    if (this.contexts.has(manifest.id)) {
      this.log.warn(`Plugin "${manifest.id}" is already loaded \u2014 skipping`, {
        pluginId: manifest.id
      });
      return;
    }
    this.log.info(`Loading plugin "${manifest.id}" v${manifest.version}`, {
      pluginId: manifest.id
    });
    const ctx = {
      manifest,
      tokens: [],
      module: null,
      // filled below
      directory: pluginDir,
      loadedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    const permissions = new Set(manifest.permissions);
    const api = buildPluginAPI(ctx, permissions);
    const entryPath = (0, import_node_path2.join)(pluginDir, manifest.entry);
    const pluginMod = await import(entryPath);
    const pluginModule = pluginMod.default ?? pluginMod;
    if (typeof pluginModule.init !== "function") {
      throw new Error(
        `[core:plugins] Plugin "${manifest.id}" entry does not export an init() function.`
      );
    }
    ctx.module = pluginModule;
    await pluginModule.init(api);
    this.contexts.set(manifest.id, ctx);
    eventBus.emit("plugin:loaded", { pluginId: manifest.id });
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
  async unload(pluginId) {
    const ctx = this.contexts.get(pluginId);
    if (!ctx) {
      this.log.warn(`Cannot unload "${pluginId}" \u2014 not loaded`, { pluginId });
      return;
    }
    this.log.info(`Unloading plugin "${pluginId}"`, { pluginId });
    if (typeof ctx.module.destroy === "function") {
      try {
        await ctx.module.destroy();
      } catch (err) {
        this.log.error(`Plugin "${pluginId}" destroy() threw`, {
          pluginId,
          error: err instanceof Error ? err.message : String(err)
        });
      }
    }
    for (const token of ctx.tokens) {
      eventBus.unsubscribe(token);
    }
    this.contexts.delete(pluginId);
    eventBus.emit("plugin:unloaded", { pluginId });
    this.log.info(`Plugin "${pluginId}" unloaded`, { pluginId });
  }
  // ── getContext ─────────────────────────────────────────────────────────────
  /** Return the runtime context for a loaded plugin, or undefined. */
  getContext(pluginId) {
    return this.contexts.get(pluginId);
  }
  // ── loadedPluginIds ────────────────────────────────────────────────────────
  /** Return the IDs of all currently loaded plugins. */
  loadedPluginIds() {
    return [...this.contexts.keys()];
  }
  // ── Private helpers ────────────────────────────────────────────────────────
  readManifest(pluginDir) {
    const manifestPath = (0, import_node_path2.join)(pluginDir, "plugin.json");
    if (!(0, import_node_fs3.existsSync)(manifestPath)) {
      throw new Error(`[core:plugins] No plugin.json found in "${pluginDir}"`);
    }
    let raw;
    try {
      raw = JSON.parse((0, import_node_fs3.readFileSync)(manifestPath, "utf-8"));
    } catch {
      throw new Error(`[core:plugins] Failed to parse plugin.json in "${pluginDir}"`);
    }
    this.validateManifest(raw, pluginDir);
    return raw;
  }
  validateManifest(raw, pluginDir) {
    const m = raw;
    const required = ["id", "name", "version", "entry", "permissions"];
    for (const field of required) {
      if (m[field] === void 0 || m[field] === null) {
        throw new Error(
          `[core:plugins] plugin.json in "${pluginDir}" is missing required field "${field}".`
        );
      }
    }
    if (!Array.isArray(m["permissions"])) {
      throw new Error(
        `[core:plugins] plugin.json in "${pluginDir}": "permissions" must be an array.`
      );
    }
  }
};
var pluginLoader = new PluginLoader();

// ../../modules/_framework/src/types.ts
var ModuleValidationError = class extends Error {
  constructor(message, code, field) {
    super(message);
    this.code = code;
    this.field = field;
    this.name = "ModuleValidationError";
  }
};
var ModuleNotInitialisedError = class extends Error {
  constructor(moduleId) {
    super(`Module '${moduleId}' is not initialised. Call init() first.`);
    this.name = "ModuleNotInitialisedError";
  }
};

// ../../modules/_framework/src/repository.ts
var BaseRepository = class {
  constructor(moduleId, db, log4) {
    this.moduleId = moduleId;
    this.db = db;
    this.log = log4;
  }
  _initialised = false;
  _campaignId = null;
  // ── Lifecycle ───────────────────────────────────────────────────────────────
  /**
   * Called by the owning BaseModule during its init() phase, after the DB
   * schema has been registered.
   *
   * Subclasses should override this to prepare any reusable statements or
   * warm any in-memory caches — but must call `super.initialize()` first.
   */
  initialize() {
    this._initialised = true;
    this.log.debug("Repository initialised");
  }
  // ── Campaign scope ──────────────────────────────────────────────────────────
  /**
   * The active campaign ID. All queries must be scoped to this value so
   * that data from one campaign never leaks into another.
   *
   * Set automatically by the ModuleLoader when a campaign is opened via
   * the `app:campaign-opened` event. Cleared on `app:campaign-closed`.
   */
  get campaignId() {
    if (!this._campaignId) {
      throw new Error(
        `[${this.moduleId}] campaignId accessed before a campaign was opened.`
      );
    }
    return this._campaignId;
  }
  /**
   * Set by the module framework when `app:campaign-opened` fires.
   * Not part of the public API — called internally by BaseModule.
   *
   * @internal
   */
  _setCampaignId(id) {
    this._campaignId = id;
  }
  // ── Protected query helpers ─────────────────────────────────────────────────
  /**
   * Execute a SELECT and return typed rows.
   *
   * @param sql    - Parameterised SQL string with `?` placeholders.
   * @param params - Bind values in order.
   * @returns Array of rows typed as T. Empty array when no rows match.
   *
   * @throws ModuleNotInitialisedError if called before initialize().
   */
  query(sql, params = []) {
    this.assertInitialised("query");
    return this.db.query(sql, params);
  }
  /**
   * Execute a non-SELECT statement (INSERT / UPDATE / DELETE).
   *
   * @returns RunResult with `lastInsertRowid` and `changes`.
   * @throws ModuleNotInitialisedError if called before initialize().
   */
  run(sql, params = []) {
    this.assertInitialised("run");
    return this.db.run(sql, params);
  }
  /**
   * Wrap multiple read/write operations in a single atomic transaction.
   *
   * If `fn` throws, the transaction rolls back automatically.
   * Returns whatever `fn` returns.
   *
   * @example
   * ```ts
   * const quest = this.transaction(() => {
   *   const r = this.run('INSERT INTO quests ...', [...]);
   *   this.run('INSERT INTO quest_objectives ...', [...]);
   *   return this.findById(r.lastInsertRowid as string)!;
   * });
   * ```
   */
  transaction(fn) {
    this.assertInitialised("transaction");
    return this.db.transaction(fn);
  }
  /**
   * Return the first row of a query, or null if no rows match.
   * Convenience wrapper around `query()`.
   */
  queryOne(sql, params = []) {
    const rows = this.query(sql, params);
    return rows[0] ?? null;
  }
  /**
   * Return true if at least one row matches the query.
   */
  exists(sql, params = []) {
    const rows = this.query(
      `SELECT EXISTS(${sql}) AS c`,
      params
    );
    return (rows[0]?.c ?? 0) === 1;
  }
  // ── Guards ──────────────────────────────────────────────────────────────────
  /**
   * Throw a clear error if the repository is used before initialize() runs.
   * Subclasses call this at the top of every public method if they want to
   * guard themselves, or rely on the super-class guards in query/run.
   */
  assertInitialised(operation) {
    if (!this._initialised) {
      throw new ModuleNotInitialisedError(this.moduleId);
    }
  }
};

// ../../modules/_framework/src/service.ts
var BaseService = class {
  constructor(moduleId, repository, log4, _emit) {
    this.moduleId = moduleId;
    this.repository = repository;
    this.log = log4;
    this._emit = _emit;
  }
  _initialised = false;
  // ── Lifecycle ───────────────────────────────────────────────────────────────
  /**
   * Called during the module's init() phase after the repository is ready.
   * Subclasses should override to set up caches or computed state,
   * always calling `super.initialize()` first.
   */
  initialize() {
    this._initialised = true;
    this.log.debug("Service initialised");
  }
  // ── Protected helpers ───────────────────────────────────────────────────────
  /**
   * Emit an event onto the application event bus.
   * Wraps the context's emit function with error isolation so a failing
   * subscriber never bubbles back into the service call stack.
   */
  emit(event, payload) {
    try {
      this._emit(event, payload);
    } catch (err) {
      this.log.error(`emit('${event}') threw \u2014 subscriber error isolated`, {
        event,
        error: err instanceof Error ? err.message : String(err)
      });
    }
  }
  /**
   * Generate a new unique entity ID.
   * Uses `crypto.randomUUID()` for UUID v4 compliance.
   * Consistent across the whole codebase — no external nanoid dependency.
   */
  generateId() {
    return (globalThis.crypto ?? require("node:crypto")).randomUUID();
  }
  /**
   * Assert a validation condition. Throws ModuleValidationError on failure.
   *
   * @param condition - The condition that must be true.
   * @param message   - Human-readable error shown in the UI.
   * @param code      - Machine-readable code for programmatic handling.
   * @param field     - Optional field name that failed (for form error display).
   *
   * @example
   * this.validate(name.length > 0, 'Name is required', 'NAME_REQUIRED', 'name');
   */
  validate(condition, message, code, field) {
    if (!condition) throw new ModuleValidationError(message, code, field);
  }
  /**
   * Validate that a string field is non-empty after trimming.
   * Convenience wrapper around validate() for the most common check.
   */
  requireString(value, fieldName) {
    this.validate(
      typeof value === "string" && value.trim().length > 0,
      `${fieldName} is required and must be a non-empty string.`,
      `${fieldName.toUpperCase().replace(/\s+/g, "_")}_REQUIRED`,
      fieldName
    );
  }
  /**
   * Validate that a numeric value falls within an inclusive range.
   */
  requireRange(value, min, max, fieldName) {
    this.validate(
      value >= min && value <= max,
      `${fieldName} must be between ${min} and ${max}. Got ${value}.`,
      `${fieldName.toUpperCase().replace(/\s+/g, "_")}_OUT_OF_RANGE`,
      fieldName
    );
  }
  /**
   * Validate that a value is one of a fixed set of allowed values.
   */
  requireOneOf(value, allowed, fieldName) {
    this.validate(
      allowed.includes(value),
      `${fieldName} must be one of: ${allowed.join(", ")}. Got '${String(value)}'.`,
      `${fieldName.toUpperCase().replace(/\s+/g, "_")}_INVALID`,
      fieldName
    );
  }
  /**
   * Throw a descriptive error if the service is used before initialize() runs.
   * Call at the top of every public method.
   */
  assertInitialised() {
    if (!this._initialised) throw new ModuleNotInitialisedError(this.moduleId);
  }
  /**
   * Build a current ISO-8601 UTC timestamp string.
   * Centralised so all entities use an identical format.
   */
  now() {
    return (/* @__PURE__ */ new Date()).toISOString();
  }
};

// ../../modules/_framework/src/module.ts
var BaseModule = class {
  /**
   * Module-specific cleanup.
   * Called before the framework unsubscribes events and clears context.
   * Override when the module owns resources outside the event system.
   */
  async onDestroy() {
  }
  // ── Concrete state ──────────────────────────────────────────────────────────
  status = "unregistered";
  /** The module's repository — available after init(). */
  repository;
  /** The module's service — available after init(). */
  service;
  /** Scoped logger. Resolved lazily so it uses the subclass manifest.id. */
  _log;
  get log() {
    if (!this._log) this._log = createLogger(`module:${this.manifest?.id ?? "unknown"}`);
    return this._log;
  }
  /** Tracks subscription tokens for bulk-cleanup on destroy. */
  _tokens = [];
  /** Wired during init(). Stored so subclasses can call this._contextEmit. */
  _contextEmit;
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
  async init(context) {
    this.status = "initialising";
    this.log.info(`Initialising module '${this.manifest.id}'`);
    this._contextEmit = context.emit;
    const db = this._resolveDb();
    this.repository = this.createRepository(db);
    this.repository.initialize();
    this.service = this.createService(this.repository);
    await this.service.initialize();
    await this.onInit(context);
    context.subscribe("app:campaign-opened", ({ campaignId }) => {
      this.repository._setCampaignId(campaignId);
      this.log.debug("Campaign opened \u2014 campaignId set", { campaignId });
    });
    context.subscribe("app:campaign-closed", () => {
      this.repository._setCampaignId(null);
      this.log.debug("Campaign closed \u2014 campaignId cleared");
    });
    this.status = "active";
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
  async destroy() {
    if (this.status === "destroyed" || this.status === "unregistered") return;
    this.status = "destroying";
    this.log.info(`Destroying module '${this.manifest.id}'`);
    try {
      await this.onDestroy();
    } catch (err) {
      this.log.error("onDestroy() threw", {
        error: err instanceof Error ? err.message : String(err)
      });
    }
    this.status = "destroyed";
    this.log.info(`Module '${this.manifest.id}' destroyed`);
  }
  // ── Protected emit ──────────────────────────────────────────────────────────
  /**
   * Emit an event onto the application event bus.
   * Available to subclasses without importing the global eventBus singleton.
   * Will throw if called before init().
   */
  _emit(event, payload) {
    if (!this._contextEmit) throw new ModuleNotInitialisedError(this.manifest.id);
    this._contextEmit(event, payload);
  }
  // ── Subscription token management ──────────────────────────────────────────
  /**
   * Store a subscription token so it can be cleaned up on destroy().
   * Called internally by the ModuleContext's subscribe wrapper.
   * @internal
   */
  _trackToken(token) {
    this._tokens.push(token);
  }
  /**
   * Return all accumulated subscription tokens.
   * Called by the ModuleLoader to bulk-unsubscribe on destroy.
   * @internal
   */
  _getTokens() {
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
  _resolveDb() {
    return databaseManager;
  }
};

// ../../modules/_framework/src/loader.ts
var log = createLogger("core:module-loader");
var ModuleLoader = class {
  /** Registry: moduleId → module instance. Insertion order is preserved. */
  registry = /* @__PURE__ */ new Map();
  /**
   * Per-module subscription tokens collected during init().
   * Used for bulk-unsubscription on destroy.
   */
  tokenMap = /* @__PURE__ */ new Map();
  // ── register ───────────────────────────────────────────────────────────────
  /**
   * Add a module instance to the registry.
   *
   * Must be called before `initAll()` or `initOne()`.
   * Throws if a module with the same ID is already registered.
   *
   * @param module - The module instance to register.
   */
  register(module2) {
    const { id } = module2.manifest;
    if (this.registry.has(id)) {
      throw new Error(
        `[ModuleLoader] A module with id '${id}' is already registered. Module IDs must be unique.`
      );
    }
    this.registry.set(id, module2);
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
  async initAll() {
    const summary = { succeeded: [], failed: [], skipped: [] };
    const sorted = this.topologicalSort();
    for (const id of sorted) {
      const module2 = this.registry.get(id);
      const blockedBy = this.findBlockingDependency(module2.manifest);
      if (blockedBy) {
        summary.skipped.push({ id, reason: `Dependency '${blockedBy}' is not active` });
        log.warn(`Skipping module '${id}' \u2014 dependency '${blockedBy}' is not active`);
        continue;
      }
      try {
        await this.initOne(id);
        summary.succeeded.push(id);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        summary.failed.push({ id, error: message });
        log.error(`Module '${id}' failed to initialise`, { error: message });
        if (module2.manifest.required) {
          throw new Error(
            `[ModuleLoader] Required module '${id}' failed to initialise: ${message}`
          );
        }
      }
    }
    log.info(
      `Module boot complete \u2014 ${summary.succeeded.length} active, ${summary.failed.length} failed, ${summary.skipped.length} skipped`
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
  async initOne(moduleId) {
    const module2 = this.requireModule(moduleId);
    if (module2.status === "active") {
      log.warn(`initOne('${moduleId}') called on an already-active module \u2014 ignoring`);
      return;
    }
    const context = this.buildContext(moduleId);
    try {
      await module2.init(context);
      this.harvestBaseModuleTokens(moduleId, module2);
    } catch (err) {
      module2.status = "error";
      throw err;
    }
  }
  // ── destroyAll ─────────────────────────────────────────────────────────────
  /**
   * Destroy all active modules in reverse dependency order.
   * Unsubscribes all event tokens before calling each module's destroy().
   */
  async destroyAll() {
    const sorted = this.topologicalSort().reverse();
    for (const id of sorted) {
      const module2 = this.registry.get(id);
      if (!module2 || module2.status !== "active") continue;
      await this.destroyOne(id);
    }
    log.info("All modules destroyed");
  }
  // ── reload ─────────────────────────────────────────────────────────────────
  /**
   * Destroy and re-initialise a single module.
   * Useful during development for hot-reload.
   *
   * @param moduleId - Must be a registered module ID.
   */
  async reload(moduleId) {
    log.info(`Reloading module '${moduleId}'`);
    await this.destroyOne(moduleId);
    await this.initOne(moduleId);
    log.info(`Module '${moduleId}' reloaded`);
  }
  // ── Queries ────────────────────────────────────────────────────────────────
  /** Return the current status of a module. */
  getStatus(moduleId) {
    return this.registry.get(moduleId)?.status;
  }
  /** Return the manifest of a registered module. */
  getManifest(moduleId) {
    return this.registry.get(moduleId)?.manifest;
  }
  /** Return IDs of all registered modules, in registration order. */
  registeredIds() {
    return [...this.registry.keys()];
  }
  /** Return IDs of all modules with status `'active'`. */
  activeIds() {
    return [...this.registry.entries()].filter(([, m]) => m.status === "active").map(([id]) => id);
  }
  // ── Private: context builder ───────────────────────────────────────────────
  /**
   * Build the ModuleContext that is injected into each module's init().
   * This is the only place in the framework that touches core singletons.
   */
  buildContext(moduleId) {
    const moduleLog = createLogger(`module:${moduleId}`);
    const tokenBucket = this.tokenMap.get(moduleId);
    return {
      logger: moduleLog,
      subscribe: (event, handler) => {
        const token = eventBus.subscribe(event, handler);
        tokenBucket.push(token);
        moduleLog.debug(`Subscribed to '${event}'`);
      },
      emit: (event, payload) => {
        moduleLog.debug(`Emitting '${event}'`);
        eventBus.emit(event, payload);
      },
      registerSchema: (registration) => {
        moduleLog.debug("Registering schema", { module: registration.module });
        databaseManager.registerSchema(registration);
      },
      getConfig: (key) => {
        const cfg = configManager.getModuleConfig(moduleId);
        return cfg[key];
      },
      setConfig: (key, value) => {
        configManager.setModuleConfig(moduleId, key, value);
      }
    };
  }
  // ── Private: destroy one ───────────────────────────────────────────────────
  async destroyOne(moduleId) {
    const module2 = this.registry.get(moduleId);
    if (!module2) return;
    const tokens = this.tokenMap.get(moduleId) ?? [];
    for (const token of tokens) {
      eventBus.unsubscribe(token);
    }
    this.tokenMap.set(moduleId, []);
    await module2.destroy();
    log.debug(`Module '${moduleId}' destroyed and unsubscribed (${tokens.length} tokens freed)`);
  }
  // ── Private: topological sort ──────────────────────────────────────────────
  /**
   * Kahn's algorithm — returns module IDs in a valid boot order where each
   * module's declared dependencies appear before it in the list.
   *
   * Throws if the dependency graph contains a cycle.
   */
  topologicalSort() {
    const inDegree = /* @__PURE__ */ new Map();
    const adj = /* @__PURE__ */ new Map();
    for (const id of this.registry.keys()) {
      inDegree.set(id, 0);
      adj.set(id, []);
    }
    for (const [id, module2] of this.registry) {
      for (const dep of module2.manifest.dependsOn) {
        if (!this.registry.has(dep)) {
          log.warn(`Module '${id}' declares dependency '${dep}' which is not registered`);
          continue;
        }
        adj.get(dep).push(id);
        inDegree.set(id, (inDegree.get(id) ?? 0) + 1);
      }
    }
    const queue = [];
    const result = [];
    for (const [id, degree] of inDegree) {
      if (degree === 0) queue.push(id);
    }
    while (queue.length > 0) {
      const id = queue.shift();
      result.push(id);
      for (const dependent of adj.get(id) ?? []) {
        const newDegree = (inDegree.get(dependent) ?? 1) - 1;
        inDegree.set(dependent, newDegree);
        if (newDegree === 0) queue.push(dependent);
      }
    }
    if (result.length !== this.registry.size) {
      const unresolved = [...this.registry.keys()].filter((id) => !result.includes(id));
      throw new Error(
        `[ModuleLoader] Circular dependency detected among modules: ${unresolved.join(", ")}`
      );
    }
    return result;
  }
  // ── Private: dependency check ─────────────────────────────────────────────
  /**
   * Return the ID of the first dependency that is not currently active,
   * or null if all dependencies are satisfied.
   */
  findBlockingDependency(manifest) {
    for (const dep of manifest.dependsOn) {
      const depModule = this.registry.get(dep);
      if (!depModule || depModule.status !== "active") return dep;
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
  harvestBaseModuleTokens(moduleId, module2) {
    const base = module2;
    if (typeof base._getTokens === "function") {
      const extra = base._getTokens();
      const bucket = this.tokenMap.get(moduleId);
      for (const t of extra) {
        if (!bucket.includes(t)) bucket.push(t);
      }
    }
  }
  // ── Private: guard ────────────────────────────────────────────────────────
  requireModule(moduleId) {
    const module2 = this.registry.get(moduleId);
    if (!module2) {
      throw new Error(
        `[ModuleLoader] Module '${moduleId}' is not registered. Call register() before init().`
      );
    }
    return module2;
  }
};
var moduleLoader = new ModuleLoader();

// ../../modules/atlas/src/repository.ts
function rowToLocation(r) {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    locationType: r.location_type,
    status: r.status,
    parentLocationId: r.parent_location_id,
    childLocationIds: [],
    controllingFactionId: r.controlling_faction_id,
    presentFactionIds: [],
    thumbnailAssetId: r.thumbnail_asset_id,
    residentNpcIds: [],
    questIds: [],
    eventIds: [],
    sessionIds: [],
    mapIds: [],
    pins: [],
    tags: JSON.parse(r.tags),
    createdAt: r.created_at,
    updatedAt: r.updated_at
  };
}
function rowToMap(r) {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    imageAssetId: r.image_asset_id,
    widthPx: r.width_px,
    heightPx: r.height_px,
    subjectLocationId: r.subject_location_id,
    scale: r.scale ?? void 0,
    pinnedLocationIds: [],
    tags: JSON.parse(r.tags),
    createdAt: r.created_at,
    updatedAt: r.updated_at
  };
}
var AtlasRepository = class extends BaseRepository {
  constructor(db, log4) {
    super("atlas", db, log4);
  }
  findAllLocations() {
    return this.query(
      "SELECT * FROM locations WHERE campaign_id = ? ORDER BY name ASC",
      [this.campaignId]
    ).map(rowToLocation);
  }
  findLocationById(id) {
    const r = this.queryOne("SELECT * FROM locations WHERE id = ? AND campaign_id = ?", [id, this.campaignId]);
    return r ? rowToLocation(r) : null;
  }
  createLocation(input) {
    this.run(
      `INSERT INTO locations (id,campaign_id,name,description,location_type,parent_location_id,tags,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [
        input.id,
        this.campaignId,
        input.name,
        input.description ?? "",
        input.locationType ?? "other",
        input.parentLocationId ?? null,
        JSON.stringify(input.tags ?? []),
        input.createdAt,
        input.updatedAt
      ]
    );
    return this.findLocationById(input.id);
  }
  updateLocation(id, patch, updatedAt) {
    const sets = ["updated_at = ?"];
    const params = [updatedAt];
    if (patch.name !== void 0) {
      sets.push("name = ?");
      params.push(patch.name);
    }
    if (patch.description !== void 0) {
      sets.push("description = ?");
      params.push(patch.description);
    }
    if (patch.locationType !== void 0) {
      sets.push("location_type = ?");
      params.push(patch.locationType);
    }
    if (patch.parentLocationId !== void 0) {
      sets.push("parent_location_id = ?");
      params.push(patch.parentLocationId);
    }
    params.push(id, this.campaignId);
    this.run(`UPDATE locations SET ${sets.join(", ")} WHERE id = ? AND campaign_id = ?`, params);
    return this.findLocationById(id);
  }
  deleteLocation(id) {
    return this.run("DELETE FROM locations WHERE id = ? AND campaign_id = ?", [id, this.campaignId]).changes > 0;
  }
  findAllMaps() {
    return this.query("SELECT * FROM maps WHERE campaign_id = ? ORDER BY name ASC", [this.campaignId]).map(rowToMap);
  }
  findMapById(id) {
    const r = this.queryOne("SELECT * FROM maps WHERE id = ? AND campaign_id = ?", [id, this.campaignId]);
    return r ? rowToMap(r) : null;
  }
  createMap(input) {
    this.run(
      `INSERT INTO maps (id,campaign_id,name,description,image_asset_id,width_px,height_px,subject_location_id,scale,tags,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        input.id,
        this.campaignId,
        input.name,
        "",
        input.imageAssetId,
        input.widthPx ?? 800,
        input.heightPx ?? 600,
        input.subjectLocationId ?? null,
        input.scale ?? null,
        "[]",
        input.createdAt,
        input.updatedAt
      ]
    );
    return this.findMapById(input.id);
  }
  deleteMap(id) {
    return this.run("DELETE FROM maps WHERE id = ? AND campaign_id = ?", [id, this.campaignId]).changes > 0;
  }
  findPinsForMap(mapId) {
    return this.query("SELECT * FROM location_pins WHERE map_id = ?", [mapId]);
  }
  upsertPin(mapId, locationId, x, y, id, label) {
    this.run(
      `INSERT INTO location_pins (id,map_id,location_id,pos_x,pos_y,label) VALUES (?,?,?,?,?,?)
       ON CONFLICT(map_id,location_id) DO UPDATE SET pos_x=excluded.pos_x,pos_y=excluded.pos_y,label=excluded.label`,
      [id, mapId, locationId, x, y, label ?? null]
    );
  }
  deletePin(mapId, locationId) {
    return this.run("DELETE FROM location_pins WHERE map_id=? AND location_id=?", [mapId, locationId]).changes > 0;
  }
};

// ../../modules/atlas/src/service.ts
var AtlasService = class extends BaseService {
  constructor(repo, log4, emit) {
    super("atlas", repo, log4, emit);
  }
  listLocations() {
    this.assertInitialised();
    return this.repository.findAllLocations();
  }
  getLocation(id) {
    this.assertInitialised();
    return this.repository.findLocationById(id);
  }
  createLocation(input) {
    this.assertInitialised();
    this.requireString(input.name, "name");
    const loc = this.repository.createLocation({ ...input, name: input.name.trim(), id: this.generateId(), createdAt: this.now(), updatedAt: this.now() });
    this.emit("atlas:map-loaded", { mapId: loc.id });
    return loc;
  }
  updateLocation(id, patch) {
    this.assertInitialised();
    const updated = this.repository.updateLocation(id, patch, this.now());
    if (!updated) throw new Error(`Location not found: ${id}`);
    return updated;
  }
  deleteLocation(id) {
    this.assertInitialised();
    if (!this.repository.deleteLocation(id)) throw new Error(`Location not found: ${id}`);
  }
  listMaps() {
    this.assertInitialised();
    return this.repository.findAllMaps();
  }
  getMap(id) {
    this.assertInitialised();
    return this.repository.findMapById(id);
  }
  createMap(input) {
    this.assertInitialised();
    this.requireString(input.name, "name");
    return this.repository.createMap({ ...input, id: this.generateId(), createdAt: this.now(), updatedAt: this.now() });
  }
  deleteMap(id) {
    this.assertInitialised();
    if (!this.repository.deleteMap(id)) throw new Error(`Map not found: ${id}`);
  }
  getPinsForMap(mapId) {
    this.assertInitialised();
    return this.repository.findPinsForMap(mapId);
  }
  placePin(mapId, locationId, x, y, label) {
    this.assertInitialised();
    this.repository.upsertPin(mapId, locationId, x, y, this.generateId(), label);
  }
  removePin(mapId, locationId) {
    this.assertInitialised();
    this.repository.deletePin(mapId, locationId);
  }
};

// ../../modules/atlas/src/schema.ts
var ATLAS_SCHEMA = {
  module: "atlas",
  migrations: [
    {
      version: 3,
      module: "atlas",
      description: "Create locations, maps, location_pins tables",
      up: `
        CREATE TABLE IF NOT EXISTS locations (
          id                     TEXT    PRIMARY KEY,
          campaign_id            TEXT    NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
          name                   TEXT    NOT NULL,
          description            TEXT    NOT NULL DEFAULT '',
          location_type          TEXT    NOT NULL DEFAULT 'other'
                                     CHECK (location_type IN ('world','continent','region','nation','city','town','village','district','building','dungeon','wilderness','landmark','other')),
          status                 TEXT    NOT NULL DEFAULT 'active'
                                     CHECK (status IN ('active','inactive','archived')),
          parent_location_id     TEXT    REFERENCES locations(id) ON DELETE SET NULL,
          controlling_faction_id TEXT,
          thumbnail_asset_id     TEXT,
          tags                   TEXT    NOT NULL DEFAULT '[]',
          created_at             TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
          updated_at             TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
        );
        CREATE INDEX IF NOT EXISTS idx_locations_campaign ON locations (campaign_id);
        CREATE INDEX IF NOT EXISTS idx_locations_parent   ON locations (parent_location_id);

        CREATE TABLE IF NOT EXISTS maps (
          id                  TEXT     PRIMARY KEY,
          campaign_id         TEXT     NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
          name                TEXT     NOT NULL,
          description         TEXT     NOT NULL DEFAULT '',
          image_asset_id      TEXT     NOT NULL,
          width_px            INTEGER  NOT NULL DEFAULT 800,
          height_px           INTEGER  NOT NULL DEFAULT 600,
          subject_location_id TEXT     REFERENCES locations(id) ON DELETE SET NULL,
          scale               TEXT,
          tags                TEXT     NOT NULL DEFAULT '[]',
          created_at          TEXT     NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
          updated_at          TEXT     NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
        );
        CREATE INDEX IF NOT EXISTS idx_maps_campaign ON maps (campaign_id);

        CREATE TABLE IF NOT EXISTS location_pins (
          id          TEXT  PRIMARY KEY,
          map_id      TEXT  NOT NULL REFERENCES maps(id)      ON DELETE CASCADE,
          location_id TEXT  NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
          pos_x       REAL  NOT NULL DEFAULT 0,
          pos_y       REAL  NOT NULL DEFAULT 0,
          label       TEXT,
          UNIQUE (map_id, location_id)
        );
        CREATE INDEX IF NOT EXISTS idx_pins_map ON location_pins (map_id);

        CREATE TRIGGER IF NOT EXISTS trg_locations_updated_at
        AFTER UPDATE ON locations FOR EACH ROW
        BEGIN
          UPDATE locations SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = NEW.id;
        END;

        CREATE TRIGGER IF NOT EXISTS trg_maps_updated_at
        AFTER UPDATE ON maps FOR EACH ROW
        BEGIN
          UPDATE maps SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = NEW.id;
        END;
      `,
      down: `
        DROP TRIGGER IF EXISTS trg_maps_updated_at;
        DROP TRIGGER IF EXISTS trg_locations_updated_at;
        DROP TABLE IF EXISTS location_pins;
        DROP TABLE IF EXISTS maps;
        DROP TABLE IF EXISTS locations;
      `
    }
  ]
};

// ../../modules/atlas/src/module.ts
var AtlasModule = class extends BaseModule {
  manifest = Object.freeze({
    id: "atlas",
    displayName: "World Atlas",
    version: "1.0.0",
    dependsOn: [],
    required: false,
    description: "Interactive world maps and location management"
  });
  createRepository(db) {
    return new AtlasRepository(db, this.log.child("repo"));
  }
  createService(repo) {
    return new AtlasService(repo, this.log.child("service"), this._emit.bind(this));
  }
  async onInit(ctx) {
    ctx.registerSchema(ATLAS_SCHEMA);
    this.log.info("Atlas module ready");
  }
  getService() {
    return this.service;
  }
};

// ../../modules/npcs/src/repository.ts
function rowToNpc(row) {
  return {
    id: row.id,
    name: row.name,
    alias: row.alias ?? void 0,
    description: row.description,
    role: row.role,
    vitalStatus: row.vital_status,
    dispositionTowardsPlayers: row.disposition_towards_players,
    currentLocationId: row.current_location_id,
    locationIds: [],
    primaryFactionId: row.primary_faction_id,
    factionIds: [],
    relationships: [],
    questIds: [],
    sessionIds: [],
    plotThreadIds: [],
    notes: [],
    portraitAssetId: row.portrait_asset_id,
    tags: JSON.parse(row.tags),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
function rowToNote(row) {
  return {
    id: row.id,
    content: row.content,
    campaignDate: row.campaign_date ?? void 0,
    createdAt: row.created_at
  };
}
var NpcsRepository = class extends BaseRepository {
  constructor(db, log4) {
    super("npcs", db, log4);
  }
  // ── Reads ──────────────────────────────────────────────────────────────────
  findById(id) {
    const row = this.queryOne(
      "SELECT * FROM npcs WHERE id = ? AND campaign_id = ?",
      [id, this.campaignId]
    );
    if (!row) return null;
    const npc = rowToNpc(row);
    npc.notes = this.findNotesByNpcId(id);
    return npc;
  }
  findAll(query = {}) {
    const conditions = ["campaign_id = ?"];
    const params = [this.campaignId];
    if (query.role) {
      conditions.push("role = ?");
      params.push(query.role);
    }
    if (query.vitalStatus) {
      conditions.push("vital_status = ?");
      params.push(query.vitalStatus);
    }
    if (query.search) {
      conditions.push("(name LIKE ? OR alias LIKE ?)");
      const like = `%${query.search}%`;
      params.push(like, like);
    }
    const where = conditions.join(" AND ");
    const limit = query.limit ?? 100;
    const offset = query.offset ?? 0;
    const rows = this.query(
      `SELECT * FROM npcs WHERE ${where} ORDER BY name ASC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    return rows.map(rowToNpc);
  }
  count(query = {}) {
    const conditions = ["campaign_id = ?"];
    const params = [this.campaignId];
    if (query.role) {
      conditions.push("role = ?");
      params.push(query.role);
    }
    if (query.vitalStatus) {
      conditions.push("vital_status = ?");
      params.push(query.vitalStatus);
    }
    if (query.search) {
      conditions.push("(name LIKE ? OR alias LIKE ?)");
      const like = `%${query.search}%`;
      params.push(like, like);
    }
    const where = conditions.join(" AND ");
    const row = this.queryOne(
      `SELECT COUNT(*) AS c FROM npcs WHERE ${where}`,
      params
    );
    return row?.c ?? 0;
  }
  findNotesByNpcId(npcId) {
    return this.query(
      "SELECT * FROM npc_notes WHERE npc_id = ? ORDER BY created_at ASC",
      [npcId]
    ).map(rowToNote);
  }
  // ── Writes ─────────────────────────────────────────────────────────────────
  create(input) {
    this.run(
      `INSERT INTO npcs
         (id, campaign_id, name, alias, description, role, vital_status,
          disposition_towards_players, tags, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.id,
        this.campaignId,
        input.name,
        input.alias ?? null,
        input.description ?? "",
        input.role ?? "neutral",
        input.vitalStatus ?? "alive",
        input.dispositionTowardsPlayers ?? "neutral",
        JSON.stringify(input.tags ?? []),
        input.createdAt,
        input.updatedAt
      ]
    );
    return this.findById(input.id);
  }
  update(input) {
    const sets = ["updated_at = ?"];
    const params = [input.updatedAt];
    if (input.name !== void 0) {
      sets.push("name = ?");
      params.push(input.name);
    }
    if (input.alias !== void 0) {
      sets.push("alias = ?");
      params.push(input.alias ?? null);
    }
    if (input.description !== void 0) {
      sets.push("description = ?");
      params.push(input.description);
    }
    if (input.role !== void 0) {
      sets.push("role = ?");
      params.push(input.role);
    }
    if (input.vitalStatus !== void 0) {
      sets.push("vital_status = ?");
      params.push(input.vitalStatus);
    }
    if (input.dispositionTowardsPlayers !== void 0) {
      sets.push("disposition_towards_players = ?");
      params.push(input.dispositionTowardsPlayers);
    }
    if (input.currentLocationId !== void 0) {
      sets.push("current_location_id = ?");
      params.push(input.currentLocationId);
    }
    if (input.primaryFactionId !== void 0) {
      sets.push("primary_faction_id = ?");
      params.push(input.primaryFactionId);
    }
    if (input.portraitAssetId !== void 0) {
      sets.push("portrait_asset_id = ?");
      params.push(input.portraitAssetId);
    }
    if (input.tags !== void 0) {
      sets.push("tags = ?");
      params.push(JSON.stringify(input.tags));
    }
    params.push(input.id, this.campaignId);
    this.run(
      `UPDATE npcs SET ${sets.join(", ")} WHERE id = ? AND campaign_id = ?`,
      params
    );
    return this.findById(input.id);
  }
  delete(id) {
    const result = this.run(
      "DELETE FROM npcs WHERE id = ? AND campaign_id = ?",
      [id, this.campaignId]
    );
    return result.changes > 0;
  }
  addNote(input) {
    this.run(
      `INSERT INTO npc_notes (id, npc_id, campaign_id, content, campaign_date, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [input.id, input.npcId, this.campaignId, input.content, input.campaignDate ?? null, input.createdAt]
    );
    const row = this.queryOne("SELECT * FROM npc_notes WHERE id = ?", [input.id]);
    return rowToNote(row);
  }
  deleteNote(noteId) {
    const result = this.run("DELETE FROM npc_notes WHERE id = ?", [noteId]);
    return result.changes > 0;
  }
};

// ../../modules/npcs/src/service.ts
var NpcsService = class extends BaseService {
  constructor(repository, log4, emit) {
    super("npcs", repository, log4, emit);
  }
  // ── Reads ──────────────────────────────────────────────────────────────────
  getById(id) {
    this.assertInitialised();
    return this.repository.findById(id);
  }
  list(query = {}) {
    this.assertInitialised();
    return this.repository.findAll(query);
  }
  count(query = {}) {
    this.assertInitialised();
    return this.repository.count(query);
  }
  // ── Writes ─────────────────────────────────────────────────────────────────
  create(input) {
    this.assertInitialised();
    this.requireString(input.name, "name");
    const npc = this.repository.create({
      ...input,
      name: input.name.trim(),
      id: this.generateId(),
      createdAt: this.now(),
      updatedAt: this.now()
    });
    this.emit("npc:created", { npcId: npc.id });
    this.log.info("NPC created", { npcId: npc.id, name: npc.name });
    return npc;
  }
  update(input) {
    this.assertInitialised();
    if (input.name !== void 0) this.requireString(input.name, "name");
    const existing = this.repository.findById(input.id);
    if (!existing) {
      throw new Error(`NPC not found: ${input.id}`);
    }
    const updated = this.repository.update({ ...input, updatedAt: this.now() });
    if (!updated) throw new Error(`NPC update failed: ${input.id}`);
    this.emit("npc:updated", { npcId: updated.id });
    this.log.info("NPC updated", { npcId: updated.id });
    return updated;
  }
  delete(id) {
    this.assertInitialised();
    const existed = this.repository.delete(id);
    if (!existed) throw new Error(`NPC not found: ${id}`);
    this.log.info("NPC deleted", { npcId: id });
  }
  addNote(input) {
    this.assertInitialised();
    this.requireString(input.content, "content");
    return this.repository.addNote({
      ...input,
      id: this.generateId(),
      createdAt: this.now()
    });
  }
  deleteNote(noteId) {
    this.assertInitialised();
    this.repository.deleteNote(noteId);
  }
};

// ../../modules/npcs/src/schema.ts
var NPCS_SCHEMA = {
  module: "npcs",
  migrations: [
    {
      version: 2,
      module: "npcs",
      description: "Create npcs, npc_notes, and npc_factions tables",
      up: `
        CREATE TABLE IF NOT EXISTS npcs (
          id                          TEXT    PRIMARY KEY,
          campaign_id                 TEXT    NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
          name                        TEXT    NOT NULL,
          alias                       TEXT,
          description                 TEXT    NOT NULL DEFAULT '',
          role                        TEXT    NOT NULL DEFAULT 'neutral'
                                          CHECK (role IN ('ally','antagonist','neutral','informant','questgiver','merchant','recurring','minor')),
          vital_status                TEXT    NOT NULL DEFAULT 'alive'
                                          CHECK (vital_status IN ('alive','dead','missing','unknown')),
          disposition_towards_players TEXT    NOT NULL DEFAULT 'neutral'
                                          CHECK (disposition_towards_players IN ('hostile','unfriendly','neutral','friendly','allied')),
          current_location_id         TEXT,
          primary_faction_id          TEXT,
          portrait_asset_id           TEXT,
          tags                        TEXT    NOT NULL DEFAULT '[]',
          created_at                  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
          updated_at                  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
        );

        CREATE INDEX IF NOT EXISTS idx_npcs_campaign ON npcs (campaign_id);

        CREATE TABLE IF NOT EXISTS npc_notes (
          id            TEXT    PRIMARY KEY,
          npc_id        TEXT    NOT NULL REFERENCES npcs(id) ON DELETE CASCADE,
          campaign_id   TEXT    NOT NULL,
          content       TEXT    NOT NULL DEFAULT '',
          campaign_date TEXT,
          created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
        );

        CREATE INDEX IF NOT EXISTS idx_npc_notes_npc ON npc_notes (npc_id);

        CREATE TRIGGER IF NOT EXISTS trg_npcs_updated_at
        AFTER UPDATE ON npcs FOR EACH ROW
        BEGIN
          UPDATE npcs SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = NEW.id;
        END;
      `,
      down: `
        DROP TRIGGER IF EXISTS trg_npcs_updated_at;
        DROP TABLE IF EXISTS npc_notes;
        DROP TABLE IF EXISTS npcs;
      `
    }
  ]
};

// ../../modules/npcs/src/module.ts
var NpcsModule = class extends BaseModule {
  manifest = Object.freeze({
    id: "npcs",
    displayName: "Characters",
    version: "1.0.0",
    dependsOn: [],
    required: false,
    description: "NPC and faction management"
  });
  createRepository(db) {
    return new NpcsRepository(db, this.log.child("repo"));
  }
  createService(repository) {
    return new NpcsService(repository, this.log.child("service"), this._emit.bind(this));
  }
  async onInit(ctx) {
    ctx.registerSchema(NPCS_SCHEMA);
    this.log.info("NPC module ready");
  }
  /** Expose the service for use by the IPC bridge. */
  getService() {
    return this.service;
  }
};

// ../../modules/quests/src/repository.ts
function rowToQuest(row, objectives, notes) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    status: row.status,
    questType: row.quest_type,
    priority: row.priority,
    startDate: row.start_date ?? void 0,
    endDate: row.end_date ?? void 0,
    reward: row.reward ?? void 0,
    questGiverNpcId: row.quest_giver_npc_id,
    involvedNpcIds: [],
    sponsorFactionId: row.sponsor_faction_id,
    locationIds: [],
    plotThreadId: row.plot_thread_id,
    prerequisiteQuestIds: [],
    unlocksQuestIds: [],
    sessionIds: [],
    objectives,
    notes,
    tags: JSON.parse(row.tags),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
function rowToObjective(row) {
  return {
    id: row.id,
    description: row.description,
    completed: row.completed === 1,
    required: row.required === 1,
    deadline: row.deadline ?? void 0
  };
}
function rowToNote2(row) {
  return {
    id: row.id,
    content: row.content,
    visibleToPlayers: row.visible_to_players === 1,
    createdAt: row.created_at
  };
}
var QuestsRepository = class extends BaseRepository {
  constructor(db, log4) {
    super("quests", db, log4);
  }
  findById(id) {
    const row = this.queryOne(
      "SELECT * FROM quests WHERE id = ? AND campaign_id = ?",
      [id, this.campaignId]
    );
    if (!row) return null;
    const objectives = this.query(
      "SELECT * FROM quest_objectives WHERE quest_id = ? ORDER BY sort_order ASC",
      [id]
    ).map(rowToObjective);
    const notes = this.query(
      "SELECT * FROM quest_notes WHERE quest_id = ? ORDER BY created_at ASC",
      [id]
    ).map(rowToNote2);
    return rowToQuest(row, objectives, notes);
  }
  findAll(query = {}) {
    const conditions = ["campaign_id = ?"];
    const params = [this.campaignId];
    if (query.status) {
      conditions.push("status = ?");
      params.push(query.status);
    }
    if (query.questType) {
      conditions.push("quest_type = ?");
      params.push(query.questType);
    }
    if (query.search) {
      conditions.push("name LIKE ?");
      params.push(`%${query.search}%`);
    }
    const where = conditions.join(" AND ");
    const limit = query.limit ?? 200;
    const offset = query.offset ?? 0;
    const rows = this.query(
      `SELECT * FROM quests WHERE ${where} ORDER BY priority DESC, name ASC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    return rows.map((r) => rowToQuest(r, [], []));
  }
  create(input) {
    this.run(
      `INSERT INTO quests
         (id, campaign_id, name, description, status, quest_type, priority,
          plot_thread_id, reward, tags, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.id,
        this.campaignId,
        input.name,
        input.description ?? "",
        input.status ?? "hidden",
        input.questType ?? "side",
        input.priority ?? 0,
        input.plotThreadId ?? null,
        input.reward ?? null,
        JSON.stringify(input.tags ?? []),
        input.createdAt,
        input.updatedAt
      ]
    );
    return this.findById(input.id);
  }
  update(input) {
    const sets = ["updated_at = ?"];
    const params = [input.updatedAt];
    if (input.name !== void 0) {
      sets.push("name = ?");
      params.push(input.name);
    }
    if (input.description !== void 0) {
      sets.push("description = ?");
      params.push(input.description);
    }
    if (input.status !== void 0) {
      sets.push("status = ?");
      params.push(input.status);
    }
    if (input.questType !== void 0) {
      sets.push("quest_type = ?");
      params.push(input.questType);
    }
    if (input.priority !== void 0) {
      sets.push("priority = ?");
      params.push(input.priority);
    }
    if (input.questGiverNpcId !== void 0) {
      sets.push("quest_giver_npc_id = ?");
      params.push(input.questGiverNpcId);
    }
    if (input.sponsorFactionId !== void 0) {
      sets.push("sponsor_faction_id = ?");
      params.push(input.sponsorFactionId);
    }
    if (input.plotThreadId !== void 0) {
      sets.push("plot_thread_id = ?");
      params.push(input.plotThreadId);
    }
    if (input.reward !== void 0) {
      sets.push("reward = ?");
      params.push(input.reward);
    }
    if (input.tags !== void 0) {
      sets.push("tags = ?");
      params.push(JSON.stringify(input.tags));
    }
    params.push(input.id, this.campaignId);
    this.run(`UPDATE quests SET ${sets.join(", ")} WHERE id = ? AND campaign_id = ?`, params);
    return this.findById(input.id);
  }
  delete(id) {
    return this.run("DELETE FROM quests WHERE id = ? AND campaign_id = ?", [id, this.campaignId]).changes > 0;
  }
  toggleObjective(objectiveId, completed) {
    this.run("UPDATE quest_objectives SET completed = ? WHERE id = ?", [completed ? 1 : 0, objectiveId]);
  }
  addObjective(questId, description, required, id) {
    const sortOrder = this.queryOne("SELECT COUNT(*) AS c FROM quest_objectives WHERE quest_id = ?", [questId])?.c ?? 0;
    this.run(
      "INSERT INTO quest_objectives (id, quest_id, description, completed, required, sort_order) VALUES (?, ?, ?, 0, ?, ?)",
      [id, questId, description, required ? 1 : 0, sortOrder]
    );
    return rowToObjective(this.queryOne("SELECT * FROM quest_objectives WHERE id = ?", [id]));
  }
  deleteObjective(id) {
    return this.run("DELETE FROM quest_objectives WHERE id = ?", [id]).changes > 0;
  }
};

// ../../modules/quests/src/service.ts
var VALID_STATUSES = ["rumour", "active", "on_hold", "completed", "failed", "abandoned", "hidden"];
var QuestsService = class extends BaseService {
  constructor(repository, log4, emit) {
    super("quests", repository, log4, emit);
  }
  getById(id) {
    this.assertInitialised();
    return this.repository.findById(id);
  }
  list(query = {}) {
    this.assertInitialised();
    return this.repository.findAll(query);
  }
  create(input) {
    this.assertInitialised();
    this.requireString(input.name, "name");
    const quest = this.repository.create({
      ...input,
      name: input.name.trim(),
      id: this.generateId(),
      createdAt: this.now(),
      updatedAt: this.now()
    });
    this.emit("quest:created", { questId: quest.id });
    this.log.info("Quest created", { questId: quest.id });
    return quest;
  }
  update(input) {
    this.assertInitialised();
    if (input.name !== void 0) this.requireString(input.name, "name");
    if (input.status !== void 0) this.requireOneOf(input.status, VALID_STATUSES, "status");
    if (!this.repository.findById(input.id)) throw new Error(`Quest not found: ${input.id}`);
    const updated = this.repository.update({ ...input, updatedAt: this.now() });
    if (!updated) throw new Error(`Quest update failed: ${input.id}`);
    this.emit("quest:updated", { questId: updated.id });
    if (input.status === "completed") {
      this.emit("quest:completed", { questId: updated.id, npcIds: [] });
    }
    return updated;
  }
  delete(id) {
    this.assertInitialised();
    if (!this.repository.delete(id)) throw new Error(`Quest not found: ${id}`);
  }
  toggleObjective(questId, objectiveId, completed) {
    this.assertInitialised();
    this.repository.toggleObjective(objectiveId, completed);
    const quest = this.repository.findById(questId);
    if (!quest) throw new Error(`Quest not found: ${questId}`);
    const allRequired = quest.objectives.filter((o) => o.required);
    if (allRequired.length > 0 && allRequired.every((o) => o.completed)) {
      this.log.info("All required objectives complete", { questId });
    }
    return quest;
  }
  addObjective(questId, description, required = true) {
    this.assertInitialised();
    this.requireString(description, "description");
    return this.repository.addObjective(questId, description.trim(), required, this.generateId());
  }
  deleteObjective(questId, objectiveId) {
    this.assertInitialised();
    this.repository.deleteObjective(objectiveId);
    return this.repository.findById(questId) ?? (() => {
      throw new Error(`Quest not found: ${questId}`);
    })();
  }
};

// ../../modules/quests/src/schema.ts
var QUESTS_SCHEMA = {
  module: "quests",
  migrations: [
    {
      version: 4,
      module: "quests",
      description: "Create plot_threads, quests, quest_objectives, quest_notes, quest_npcs tables",
      up: `
        CREATE TABLE IF NOT EXISTS plot_threads (
          id          TEXT    PRIMARY KEY,
          campaign_id TEXT    NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
          name        TEXT    NOT NULL,
          description TEXT    NOT NULL DEFAULT '',
          status      TEXT    NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active','resolved','dormant','abandoned')),
          priority    INTEGER NOT NULL DEFAULT 0,
          start_date  TEXT,
          end_date    TEXT,
          tags        TEXT    NOT NULL DEFAULT '[]',
          created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
          updated_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
        );
        CREATE INDEX IF NOT EXISTS idx_plot_threads_campaign ON plot_threads (campaign_id);

        CREATE TABLE IF NOT EXISTS quests (
          id                 TEXT    PRIMARY KEY,
          campaign_id        TEXT    NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
          name               TEXT    NOT NULL,
          description        TEXT    NOT NULL DEFAULT '',
          status             TEXT    NOT NULL DEFAULT 'hidden'
                                 CHECK (status IN ('rumour','active','on_hold','completed','failed','abandoned','hidden')),
          quest_type         TEXT    NOT NULL DEFAULT 'side'
                                 CHECK (quest_type IN ('main','side','personal','faction','exploration','fetch','escort','eliminate','mystery')),
          priority           INTEGER NOT NULL DEFAULT 0,
          start_date         TEXT,
          end_date           TEXT,
          reward             TEXT,
          quest_giver_npc_id TEXT,
          sponsor_faction_id TEXT,
          plot_thread_id     TEXT REFERENCES plot_threads(id) ON DELETE SET NULL,
          tags               TEXT    NOT NULL DEFAULT '[]',
          created_at         TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
          updated_at         TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
        );
        CREATE INDEX IF NOT EXISTS idx_quests_campaign    ON quests (campaign_id);
        CREATE INDEX IF NOT EXISTS idx_quests_status      ON quests (status);
        CREATE INDEX IF NOT EXISTS idx_quests_plot_thread ON quests (plot_thread_id);

        CREATE TABLE IF NOT EXISTS quest_objectives (
          id          TEXT    PRIMARY KEY,
          quest_id    TEXT    NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
          description TEXT    NOT NULL DEFAULT '',
          completed   INTEGER NOT NULL DEFAULT 0,
          required    INTEGER NOT NULL DEFAULT 1,
          sort_order  INTEGER NOT NULL DEFAULT 0,
          deadline    TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_quest_objectives_quest ON quest_objectives (quest_id);

        CREATE TABLE IF NOT EXISTS quest_notes (
          id                 TEXT    PRIMARY KEY,
          quest_id           TEXT    NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
          content            TEXT    NOT NULL DEFAULT '',
          visible_to_players INTEGER NOT NULL DEFAULT 0,
          created_at         TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
        );
        CREATE INDEX IF NOT EXISTS idx_quest_notes_quest ON quest_notes (quest_id);

        CREATE TABLE IF NOT EXISTS quest_npcs (
          quest_id   TEXT NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
          npc_id     TEXT NOT NULL REFERENCES npcs(id)   ON DELETE CASCADE,
          role_label TEXT,
          PRIMARY KEY (quest_id, npc_id)
        );
        CREATE INDEX IF NOT EXISTS idx_quest_npcs_npc ON quest_npcs (npc_id);

        CREATE TRIGGER IF NOT EXISTS trg_quests_updated_at
        AFTER UPDATE ON quests FOR EACH ROW
        BEGIN
          UPDATE quests SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = NEW.id;
        END;

        CREATE TRIGGER IF NOT EXISTS trg_plot_threads_updated_at
        AFTER UPDATE ON plot_threads FOR EACH ROW
        BEGIN
          UPDATE plot_threads SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = NEW.id;
        END;
      `,
      down: `
        DROP TRIGGER IF EXISTS trg_plot_threads_updated_at;
        DROP TRIGGER IF EXISTS trg_quests_updated_at;
        DROP TABLE IF EXISTS quest_npcs;
        DROP TABLE IF EXISTS quest_notes;
        DROP TABLE IF EXISTS quest_objectives;
        DROP TABLE IF EXISTS quests;
        DROP TABLE IF EXISTS plot_threads;
      `
    }
  ]
};

// ../../modules/quests/src/module.ts
var QuestsModule = class extends BaseModule {
  manifest = Object.freeze({
    id: "quests",
    displayName: "Quests",
    version: "1.0.0",
    dependsOn: ["npcs"],
    required: false,
    description: "Quest and plot tracking"
  });
  createRepository(db) {
    return new QuestsRepository(db, this.log.child("repo"));
  }
  createService(repo) {
    return new QuestsService(repo, this.log.child("service"), this._emit.bind(this));
  }
  async onInit(ctx) {
    ctx.registerSchema(QUESTS_SCHEMA);
    this.log.info("Quests module ready");
  }
  getService() {
    return this.service;
  }
};

// ../../modules/sessions/src/repository.ts
function rowToSession(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    sessionNumber: row.session_number,
    status: row.status,
    scheduledAt: row.scheduled_at ?? void 0,
    startedAt: row.started_at ?? void 0,
    endedAt: row.ended_at ?? void 0,
    durationMinutes: row.duration_minutes ?? void 0,
    campaignDateStart: row.campaign_date_start ?? void 0,
    campaignDateEnd: row.campaign_date_end ?? void 0,
    rewards: row.rewards ?? void 0,
    followUpHooks: row.follow_up_hooks ?? void 0,
    tags: JSON.parse(row.tags),
    scenes: [],
    prepItems: [],
    notes: [],
    advancedQuestIds: [],
    completedQuestIds: [],
    plotThreadIds: [],
    featuredNpcIds: [],
    visitedLocationIds: [],
    eventIds: [],
    assetIds: [],
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
function rowToNote3(r) {
  return {
    id: r.id,
    phase: r.phase,
    content: r.content,
    createdAt: r.created_at,
    updatedAt: r.updated_at
  };
}
function rowToPrep(r) {
  return { id: r.id, description: r.description, done: r.done === 1 };
}
function rowToScene(r) {
  return {
    id: r.id,
    title: r.title,
    content: r.content,
    order: r.sort_order,
    locationId: r.location_id,
    npcIds: [],
    played: r.played === 1
  };
}
var SessionsRepository = class extends BaseRepository {
  constructor(db, log4) {
    super("sessions", db, log4);
  }
  findAll() {
    return this.query(
      "SELECT * FROM sessions WHERE campaign_id = ? ORDER BY session_number DESC",
      [this.campaignId]
    ).map(rowToSession);
  }
  findById(id) {
    const row = this.queryOne(
      "SELECT * FROM sessions WHERE id = ? AND campaign_id = ?",
      [id, this.campaignId]
    );
    if (!row) return null;
    const s = rowToSession(row);
    s.notes = this.query("SELECT * FROM session_notes WHERE session_id = ? ORDER BY created_at ASC", [id]).map(rowToNote3);
    s.prepItems = this.query("SELECT * FROM session_prep_items WHERE session_id = ? ORDER BY sort_order ASC", [id]).map(rowToPrep);
    s.scenes = this.query("SELECT * FROM session_scenes WHERE session_id = ? ORDER BY sort_order ASC", [id]).map(rowToScene);
    const qRows = this.query("SELECT quest_id, outcome FROM session_quests WHERE session_id = ?", [id]);
    s.advancedQuestIds = qRows.filter((r) => r.outcome === "advanced").map((r) => r.quest_id);
    s.completedQuestIds = qRows.filter((r) => r.outcome === "completed").map((r) => r.quest_id);
    s.featuredNpcIds = this.query("SELECT npc_id FROM session_npcs WHERE session_id = ?", [id]).map((r) => r.npc_id);
    return s;
  }
  nextSessionNumber() {
    const row = this.queryOne("SELECT MAX(session_number) AS mx FROM sessions WHERE campaign_id = ?", [this.campaignId]);
    return (row?.mx ?? 0) + 1;
  }
  create(input) {
    this.run(
      `INSERT INTO sessions (id, campaign_id, name, description, session_number, status, scheduled_at, tags, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'planned', ?, ?, ?, ?)`,
      [
        input.id,
        this.campaignId,
        input.name,
        input.description ?? "",
        input.sessionNumber,
        input.scheduledAt ?? null,
        JSON.stringify(input.tags ?? []),
        input.createdAt,
        input.updatedAt
      ]
    );
    return this.findById(input.id);
  }
  update(input) {
    const sets = ["updated_at = ?"];
    const params = [input.updatedAt];
    if (input.name !== void 0) {
      sets.push("name = ?");
      params.push(input.name);
    }
    if (input.description !== void 0) {
      sets.push("description = ?");
      params.push(input.description);
    }
    if (input.status !== void 0) {
      sets.push("status = ?");
      params.push(input.status);
    }
    if (input.scheduledAt !== void 0) {
      sets.push("scheduled_at = ?");
      params.push(input.scheduledAt);
    }
    if (input.campaignDateStart !== void 0) {
      sets.push("campaign_date_start = ?");
      params.push(input.campaignDateStart);
    }
    if (input.campaignDateEnd !== void 0) {
      sets.push("campaign_date_end = ?");
      params.push(input.campaignDateEnd);
    }
    if (input.rewards !== void 0) {
      sets.push("rewards = ?");
      params.push(input.rewards);
    }
    if (input.followUpHooks !== void 0) {
      sets.push("follow_up_hooks = ?");
      params.push(input.followUpHooks);
    }
    if (input.tags !== void 0) {
      sets.push("tags = ?");
      params.push(JSON.stringify(input.tags));
    }
    params.push(input.id, this.campaignId);
    this.run(`UPDATE sessions SET ${sets.join(", ")} WHERE id = ? AND campaign_id = ?`, params);
    return this.findById(input.id);
  }
  delete(id) {
    return this.run("DELETE FROM sessions WHERE id = ? AND campaign_id = ?", [id, this.campaignId]).changes > 0;
  }
  addNote(sessionId, phase, content, id, now) {
    this.run(
      "INSERT INTO session_notes (id, session_id, phase, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
      [id, sessionId, phase, content, now, now]
    );
    return rowToNote3(this.queryOne("SELECT * FROM session_notes WHERE id = ?", [id]));
  }
  togglePrepItem(id, done) {
    this.run("UPDATE session_prep_items SET done = ? WHERE id = ?", [done ? 1 : 0, id]);
  }
  addPrepItem(sessionId, description, id, sortOrder) {
    this.run(
      "INSERT INTO session_prep_items (id, session_id, description, done, sort_order) VALUES (?, ?, ?, 0, ?)",
      [id, sessionId, description, sortOrder]
    );
    return rowToPrep(this.queryOne("SELECT * FROM session_prep_items WHERE id = ?", [id]));
  }
  deletePrepItem(id) {
    return this.run("DELETE FROM session_prep_items WHERE id = ?", [id]).changes > 0;
  }
  linkQuest(sessionId, questId, outcome) {
    this.run(
      "INSERT OR REPLACE INTO session_quests (session_id, quest_id, outcome) VALUES (?, ?, ?)",
      [sessionId, questId, outcome]
    );
  }
  linkNpc(sessionId, npcId) {
    this.run("INSERT OR IGNORE INTO session_npcs (session_id, npc_id) VALUES (?, ?)", [sessionId, npcId]);
  }
};

// ../../modules/sessions/src/service.ts
var SessionsService = class extends BaseService {
  constructor(repository, log4, emit) {
    super("sessions", repository, log4, emit);
  }
  list() {
    this.assertInitialised();
    return this.repository.findAll();
  }
  getById(id) {
    this.assertInitialised();
    return this.repository.findById(id);
  }
  create(input) {
    this.assertInitialised();
    this.requireString(input.name, "name");
    const sessionNumber = this.repository.nextSessionNumber();
    const session = this.repository.create({
      ...input,
      name: input.name.trim(),
      id: this.generateId(),
      sessionNumber,
      createdAt: this.now(),
      updatedAt: this.now()
    });
    this.emit("session:started", { sessionId: session.id });
    this.log.info("Session created", { sessionId: session.id, number: sessionNumber });
    return session;
  }
  update(input) {
    this.assertInitialised();
    if (input.name !== void 0) this.requireString(input.name, "name");
    if (!this.repository.findById(input.id)) throw new Error(`Session not found: ${input.id}`);
    const updated = this.repository.update({ ...input, updatedAt: this.now() });
    if (!updated) throw new Error(`Session update failed: ${input.id}`);
    if (input.status === "completed") this.emit("session:ended", { sessionId: updated.id });
    return updated;
  }
  delete(id) {
    this.assertInitialised();
    if (!this.repository.delete(id)) throw new Error(`Session not found: ${id}`);
  }
  addNote(sessionId, phase, content) {
    this.assertInitialised();
    this.requireString(content, "content");
    return this.repository.addNote(sessionId, phase, content.trim(), this.generateId(), this.now());
  }
  addPrepItem(sessionId, description) {
    this.assertInitialised();
    this.requireString(description, "description");
    const count = this.repository.findById(sessionId)?.prepItems.length ?? 0;
    return this.repository.addPrepItem(sessionId, description.trim(), this.generateId(), count);
  }
  togglePrepItem(sessionId, itemId, done) {
    this.assertInitialised();
    this.repository.togglePrepItem(itemId, done);
    return this.repository.findById(sessionId) ?? (() => {
      throw new Error(`Session not found: ${sessionId}`);
    })();
  }
};

// ../../modules/sessions/src/schema.ts
var SESSIONS_SCHEMA = {
  module: "sessions",
  migrations: [
    {
      version: 5,
      module: "sessions",
      description: "Create sessions, session_notes, session_prep_items, session_scenes, session_quests, session_npcs tables",
      up: `
        CREATE TABLE IF NOT EXISTS sessions (
          id                  TEXT    PRIMARY KEY,
          campaign_id         TEXT    NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
          name                TEXT    NOT NULL,
          description         TEXT    NOT NULL DEFAULT '',
          session_number      INTEGER NOT NULL DEFAULT 0,
          status              TEXT    NOT NULL DEFAULT 'planned'
                                  CHECK (status IN ('planned','in_progress','completed','cancelled')),
          scheduled_at        TEXT,
          started_at          TEXT,
          ended_at            TEXT,
          duration_minutes    INTEGER,
          campaign_date_start TEXT,
          campaign_date_end   TEXT,
          rewards             TEXT,
          follow_up_hooks     TEXT,
          tags                TEXT    NOT NULL DEFAULT '[]',
          created_at          TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
          updated_at          TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
        );
        CREATE INDEX IF NOT EXISTS idx_sessions_campaign ON sessions (campaign_id);
        CREATE INDEX IF NOT EXISTS idx_sessions_number   ON sessions (campaign_id, session_number);

        CREATE TABLE IF NOT EXISTS session_notes (
          id          TEXT    PRIMARY KEY,
          session_id  TEXT    NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
          phase       TEXT    NOT NULL DEFAULT 'planning'
                          CHECK (phase IN ('planning','live','recap')),
          content     TEXT    NOT NULL DEFAULT '',
          created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
          updated_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
        );
        CREATE INDEX IF NOT EXISTS idx_session_notes_session ON session_notes (session_id);

        CREATE TABLE IF NOT EXISTS session_prep_items (
          id          TEXT    PRIMARY KEY,
          session_id  TEXT    NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
          description TEXT    NOT NULL DEFAULT '',
          done        INTEGER NOT NULL DEFAULT 0,
          sort_order  INTEGER NOT NULL DEFAULT 0
        );
        CREATE INDEX IF NOT EXISTS idx_session_prep_session ON session_prep_items (session_id);

        CREATE TABLE IF NOT EXISTS session_scenes (
          id          TEXT    PRIMARY KEY,
          session_id  TEXT    NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
          title       TEXT    NOT NULL DEFAULT '',
          content     TEXT    NOT NULL DEFAULT '',
          sort_order  INTEGER NOT NULL DEFAULT 0,
          location_id TEXT,
          played      INTEGER NOT NULL DEFAULT 0
        );
        CREATE INDEX IF NOT EXISTS idx_session_scenes_session ON session_scenes (session_id);

        CREATE TABLE IF NOT EXISTS session_quests (
          session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
          quest_id   TEXT NOT NULL REFERENCES quests(id)   ON DELETE CASCADE,
          outcome    TEXT NOT NULL DEFAULT 'advanced'
                       CHECK (outcome IN ('advanced','completed')),
          PRIMARY KEY (session_id, quest_id)
        );
        CREATE INDEX IF NOT EXISTS idx_session_quests_quest ON session_quests (quest_id);

        CREATE TABLE IF NOT EXISTS session_npcs (
          session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
          npc_id     TEXT NOT NULL REFERENCES npcs(id)     ON DELETE CASCADE,
          PRIMARY KEY (session_id, npc_id)
        );
        CREATE INDEX IF NOT EXISTS idx_session_npcs_npc ON session_npcs (npc_id);

        CREATE TRIGGER IF NOT EXISTS trg_sessions_updated_at
        AFTER UPDATE ON sessions FOR EACH ROW
        BEGIN
          UPDATE sessions SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = NEW.id;
        END;
      `,
      down: `
        DROP TRIGGER IF EXISTS trg_sessions_updated_at;
        DROP TABLE IF EXISTS session_npcs;
        DROP TABLE IF EXISTS session_quests;
        DROP TABLE IF EXISTS session_scenes;
        DROP TABLE IF EXISTS session_prep_items;
        DROP TABLE IF EXISTS session_notes;
        DROP TABLE IF EXISTS sessions;
      `
    }
  ]
};

// ../../modules/sessions/src/module.ts
var SessionsModule = class extends BaseModule {
  manifest = Object.freeze({
    id: "sessions",
    displayName: "Sessions",
    version: "1.0.0",
    dependsOn: ["npcs", "quests"],
    required: false,
    description: "Session planning, notes, and recaps"
  });
  createRepository(db) {
    return new SessionsRepository(db, this.log.child("repo"));
  }
  createService(repo) {
    return new SessionsService(repo, this.log.child("service"), this._emit.bind(this));
  }
  async onInit(ctx) {
    ctx.registerSchema(SESSIONS_SCHEMA);
    this.log.info("Sessions module ready");
  }
  getService() {
    return this.service;
  }
};

// ../../modules/timeline/src/repository.ts
function rowToEvent(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    eventType: row.event_type,
    significance: row.significance,
    campaignDate: row.campaign_date,
    campaignDateEnd: row.campaign_date_end ?? void 0,
    certainty: row.certainty,
    isPlayerFacing: row.is_player_facing === 1,
    locationId: row.location_id,
    questId: row.quest_id,
    plotThreadId: row.plot_thread_id,
    sessionId: row.session_id,
    npcIds: [],
    factionIds: [],
    causedByEventIds: [],
    consequenceEventIds: [],
    assetIds: [],
    tags: JSON.parse(row.tags),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
var TimelineRepository = class extends BaseRepository {
  constructor(db, log4) {
    super("timeline", db, log4);
  }
  findAll(limit = 200) {
    return this.query(
      "SELECT * FROM campaign_events WHERE campaign_id = ? ORDER BY campaign_date DESC, created_at DESC LIMIT ?",
      [this.campaignId, limit]
    ).map(rowToEvent);
  }
  findById(id) {
    const row = this.queryOne("SELECT * FROM campaign_events WHERE id = ? AND campaign_id = ?", [id, this.campaignId]);
    return row ? rowToEvent(row) : null;
  }
  create(input) {
    this.run(
      `INSERT INTO campaign_events
         (id,campaign_id,name,description,event_type,significance,campaign_date,certainty,
          is_player_facing,session_id,quest_id,tags,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        input.id,
        this.campaignId,
        input.name,
        input.description ?? "",
        input.eventType ?? "other",
        input.significance ?? "minor",
        input.campaignDate ?? null,
        input.certainty ?? "exact",
        input.isPlayerFacing !== false ? 1 : 0,
        input.sessionId ?? null,
        input.questId ?? null,
        JSON.stringify(input.tags ?? []),
        input.createdAt,
        input.updatedAt
      ]
    );
    return this.findById(input.id);
  }
  update(input) {
    const sets = ["updated_at = ?"];
    const params = [input.updatedAt];
    if (input.name !== void 0) {
      sets.push("name = ?");
      params.push(input.name);
    }
    if (input.description !== void 0) {
      sets.push("description = ?");
      params.push(input.description);
    }
    if (input.eventType !== void 0) {
      sets.push("event_type = ?");
      params.push(input.eventType);
    }
    if (input.significance !== void 0) {
      sets.push("significance = ?");
      params.push(input.significance);
    }
    if (input.campaignDate !== void 0) {
      sets.push("campaign_date = ?");
      params.push(input.campaignDate);
    }
    if (input.certainty !== void 0) {
      sets.push("certainty = ?");
      params.push(input.certainty);
    }
    if (input.isPlayerFacing !== void 0) {
      sets.push("is_player_facing = ?");
      params.push(input.isPlayerFacing ? 1 : 0);
    }
    if (input.sessionId !== void 0) {
      sets.push("session_id = ?");
      params.push(input.sessionId);
    }
    if (input.questId !== void 0) {
      sets.push("quest_id = ?");
      params.push(input.questId);
    }
    if (input.plotThreadId !== void 0) {
      sets.push("plot_thread_id = ?");
      params.push(input.plotThreadId);
    }
    if (input.tags !== void 0) {
      sets.push("tags = ?");
      params.push(JSON.stringify(input.tags));
    }
    params.push(input.id, this.campaignId);
    this.run(`UPDATE campaign_events SET ${sets.join(", ")} WHERE id = ? AND campaign_id = ?`, params);
    return this.findById(input.id);
  }
  delete(id) {
    return this.run("DELETE FROM campaign_events WHERE id = ? AND campaign_id = ?", [id, this.campaignId]).changes > 0;
  }
};

// ../../modules/timeline/src/service.ts
var TimelineService = class extends BaseService {
  constructor(repository, log4, emit) {
    super("timeline", repository, log4, emit);
  }
  list(limit) {
    this.assertInitialised();
    return this.repository.findAll(limit);
  }
  getById(id) {
    this.assertInitialised();
    return this.repository.findById(id);
  }
  create(input) {
    this.assertInitialised();
    this.requireString(input.name, "name");
    const event = this.repository.create({ ...input, name: input.name.trim(), id: this.generateId(), createdAt: this.now(), updatedAt: this.now() });
    this.emit("timeline:entry-added", { entryId: event.id });
    return event;
  }
  update(input) {
    this.assertInitialised();
    if (input.name !== void 0) this.requireString(input.name, "name");
    const updated = this.repository.update({ ...input, updatedAt: this.now() });
    if (!updated) throw new Error(`Event not found: ${input.id}`);
    return updated;
  }
  delete(id) {
    this.assertInitialised();
    if (!this.repository.delete(id)) throw new Error(`Event not found: ${id}`);
  }
};

// ../../modules/timeline/src/schema.ts
var TIMELINE_SCHEMA = {
  module: "timeline",
  migrations: [
    {
      version: 6,
      module: "timeline",
      description: "Create campaign_events and event_causality tables",
      up: `
        CREATE TABLE IF NOT EXISTS campaign_events (
          id               TEXT    PRIMARY KEY,
          campaign_id      TEXT    NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
          name             TEXT    NOT NULL,
          description      TEXT    NOT NULL DEFAULT '',
          event_type       TEXT    NOT NULL DEFAULT 'other'
                               CHECK (event_type IN ('battle','political','discovery','death','birth','quest','faction','natural','social','mystery','other')),
          significance     TEXT    NOT NULL DEFAULT 'minor'
                               CHECK (significance IN ('trivial','minor','moderate','major','critical')),
          campaign_date    TEXT,
          campaign_date_end TEXT,
          certainty        TEXT    NOT NULL DEFAULT 'exact'
                               CHECK (certainty IN ('exact','approximate','unknown','legendary')),
          is_player_facing INTEGER NOT NULL DEFAULT 1,
          location_id      TEXT,
          quest_id         TEXT,
          plot_thread_id   TEXT,
          session_id       TEXT,
          tags             TEXT    NOT NULL DEFAULT '[]'  ,
          created_at       TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
          updated_at       TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
        );
        CREATE INDEX IF NOT EXISTS idx_campaign_events_campaign ON campaign_events (campaign_id);
        CREATE INDEX IF NOT EXISTS idx_campaign_events_type     ON campaign_events (event_type);

        CREATE TABLE IF NOT EXISTS campaign_event_npcs (
          event_id   TEXT NOT NULL REFERENCES campaign_events(id) ON DELETE CASCADE,
          npc_id     TEXT NOT NULL REFERENCES npcs(id)            ON DELETE CASCADE,
          role_label TEXT,
          PRIMARY KEY (event_id, npc_id)
        );

        CREATE TABLE IF NOT EXISTS event_causality (
          cause_event_id  TEXT NOT NULL REFERENCES campaign_events(id) ON DELETE CASCADE,
          effect_event_id TEXT NOT NULL REFERENCES campaign_events(id) ON DELETE CASCADE,
          PRIMARY KEY (cause_event_id, effect_event_id),
          CHECK (cause_event_id != effect_event_id)
        );

        CREATE TRIGGER IF NOT EXISTS trg_campaign_events_updated_at
        AFTER UPDATE ON campaign_events FOR EACH ROW
        BEGIN
          UPDATE campaign_events SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = NEW.id;
        END;
      `,
      down: `
        DROP TRIGGER IF EXISTS trg_campaign_events_updated_at;
        DROP TABLE IF EXISTS event_causality;
        DROP TABLE IF EXISTS campaign_event_npcs;
        DROP TABLE IF EXISTS campaign_events;
      `
    }
  ]
};

// ../../modules/timeline/src/module.ts
var TimelineModule = class extends BaseModule {
  manifest = Object.freeze({
    id: "timeline",
    displayName: "Timeline",
    version: "1.0.0",
    dependsOn: ["npcs", "quests", "sessions"],
    required: false,
    description: "Campaign chronology and event timeline"
  });
  createRepository(db) {
    return new TimelineRepository(db, this.log.child("repo"));
  }
  createService(repo) {
    return new TimelineService(repo, this.log.child("service"), this._emit.bind(this));
  }
  async onInit(ctx) {
    ctx.registerSchema(TIMELINE_SCHEMA);
    ctx.subscribe("quest:completed", ({ questId }) => {
      try {
        this.service.create({
          name: `Quest completed`,
          description: `Quest ${questId} was completed.`,
          eventType: "quest",
          significance: "minor",
          questId,
          isPlayerFacing: true
        });
      } catch {
      }
    });
    this.log.info("Timeline module ready");
  }
  getService() {
    return this.service;
  }
};

// ../../modules/graph/src/repository.ts
function rowToEdge(r) {
  return {
    id: r.id,
    sourceId: r.source_id,
    targetId: r.target_id,
    label: r.label,
    edgeType: r.relationship_type,
    strength: r.strength ?? void 0,
    directed: r.directed === 1
  };
}
var GraphRepository = class extends BaseRepository {
  constructor(db, log4) {
    super("graph", db, log4);
  }
  findAll() {
    return this.query(
      "SELECT * FROM entity_relationships WHERE campaign_id = ? ORDER BY created_at DESC",
      [this.campaignId]
    ).map(rowToEdge);
  }
  findForEntity(entityId) {
    return this.query(
      "SELECT * FROM entity_relationships WHERE campaign_id = ? AND (source_id = ? OR target_id = ?)",
      [this.campaignId, entityId, entityId]
    ).map(rowToEdge);
  }
  create(input) {
    this.run(
      `INSERT OR IGNORE INTO entity_relationships
         (id,campaign_id,source_id,source_type,target_id,target_type,relationship_type,label,strength,directed,note,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        input.id,
        this.campaignId,
        input.sourceId,
        input.sourceType,
        input.targetId,
        input.targetType,
        input.relationshipType ?? "custom",
        input.label ?? "",
        input.strength ?? null,
        input.directed ? 1 : 0,
        input.note ?? null,
        input.createdAt,
        input.updatedAt
      ]
    );
    return rowToEdge(this.queryOne("SELECT * FROM entity_relationships WHERE id = ?", [input.id]));
  }
  delete(id) {
    return this.run("DELETE FROM entity_relationships WHERE id = ? AND campaign_id = ?", [id, this.campaignId]).changes > 0;
  }
  // Returns all unique entity IDs referenced in the graph
  entityIds() {
    const rows = this.query(
      `SELECT source_id AS id, source_type AS type FROM entity_relationships WHERE campaign_id = ?
       UNION SELECT target_id, target_type FROM entity_relationships WHERE campaign_id = ?`,
      [this.campaignId, this.campaignId]
    );
    return rows;
  }
};

// ../../modules/graph/src/service.ts
var GraphService = class extends BaseService {
  constructor(repo, log4, emit) {
    super("graph", repo, log4, emit);
  }
  listAll() {
    this.assertInitialised();
    return this.repository.findAll();
  }
  forEntity(entityId) {
    this.assertInitialised();
    return this.repository.findForEntity(entityId);
  }
  create(input) {
    this.assertInitialised();
    return this.repository.create({ ...input, id: this.generateId(), createdAt: this.now(), updatedAt: this.now() });
  }
  delete(id) {
    this.assertInitialised();
    if (!this.repository.delete(id)) throw new Error(`Relationship not found: ${id}`);
  }
  entityIds() {
    this.assertInitialised();
    return this.repository.entityIds();
  }
};

// ../../modules/graph/src/schema.ts
var GRAPH_SCHEMA = {
  module: "graph",
  migrations: [{
    version: 7,
    module: "graph",
    description: "Create entity_relationships and entity_notes tables",
    up: `
      CREATE TABLE IF NOT EXISTS entity_relationships (
        id                TEXT    PRIMARY KEY,
        campaign_id       TEXT    NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
        source_id         TEXT    NOT NULL,
        source_type       TEXT    NOT NULL CHECK (source_type IN ('npc','faction','location','quest','session','event','plot_thread','asset','map')),
        target_id         TEXT    NOT NULL,
        target_type       TEXT    NOT NULL CHECK (target_type IN ('npc','faction','location','quest','session','event','plot_thread','asset','map')),
        relationship_type TEXT    NOT NULL DEFAULT 'custom'
                              CHECK (relationship_type IN ('disposition','membership','leadership','location_link','quest_link','plot_link','causality','asset_link','session_link','custom')),
        label             TEXT    NOT NULL DEFAULT '',
        strength          INTEGER CHECK (strength IS NULL OR (strength >= -100 AND strength <= 100)),
        directed          INTEGER NOT NULL DEFAULT 0,
        note              TEXT,
        created_at        TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
        updated_at        TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
        UNIQUE (campaign_id,source_id,source_type,target_id,target_type,relationship_type)
      );
      CREATE INDEX IF NOT EXISTS idx_entity_rel_source ON entity_relationships (campaign_id,source_type,source_id);
      CREATE INDEX IF NOT EXISTS idx_entity_rel_target ON entity_relationships (campaign_id,target_type,target_id);
    `,
    down: `DROP TABLE IF EXISTS entity_relationships;`
  }]
};

// ../../modules/graph/src/module.ts
var GraphModule = class extends BaseModule {
  manifest = Object.freeze({
    id: "graph",
    displayName: "Relations",
    version: "1.0.0",
    dependsOn: ["npcs", "quests", "sessions"],
    required: false,
    description: "Narrative relationship graph"
  });
  createRepository(db) {
    return new GraphRepository(db, this.log.child("repo"));
  }
  createService(repo) {
    return new GraphService(repo, this.log.child("service"), this._emit.bind(this));
  }
  async onInit(ctx) {
    ctx.registerSchema(GRAPH_SCHEMA);
    this.log.info("Graph module ready");
  }
  getService() {
    return this.service;
  }
};

// ../../modules/assets-ui/src/repository.ts
var AssetsUiRepository = class extends BaseRepository {
  constructor(db, log4) {
    super("assets-ui", db, log4);
  }
  findAll(category) {
    if (category) {
      return this.query("SELECT * FROM assets WHERE campaign_id=? AND category=? ORDER BY name ASC", [this.campaignId, category]);
    }
    return this.query("SELECT * FROM assets WHERE campaign_id=? ORDER BY name ASC", [this.campaignId]);
  }
  findById(id) {
    return this.queryOne("SELECT * FROM assets WHERE id=? AND campaign_id=?", [id, this.campaignId]);
  }
  countByCategory() {
    const rows = this.query(
      "SELECT category, COUNT(*) AS c FROM assets WHERE campaign_id=? GROUP BY category",
      [this.campaignId]
    );
    return Object.fromEntries(rows.map((r) => [r.category, r.c]));
  }
  delete(id) {
    return this.run("DELETE FROM assets WHERE id=? AND campaign_id=?", [id, this.campaignId]).changes > 0;
  }
  updateTags(id, tags) {
    return this.run(
      "UPDATE assets SET tags=? WHERE id=? AND campaign_id=?",
      [JSON.stringify(tags), id, this.campaignId]
    ).changes > 0;
  }
};

// ../../modules/assets-ui/src/service.ts
var AssetsUiService = class extends BaseService {
  constructor(repo, log4, emit) {
    super("assets-ui", repo, log4, emit);
  }
  list(category) {
    this.assertInitialised();
    return this.repository.findAll(category);
  }
  getById(id) {
    this.assertInitialised();
    return this.repository.findById(id);
  }
  counts() {
    this.assertInitialised();
    return this.repository.countByCategory();
  }
  delete(id) {
    this.assertInitialised();
    this.repository.delete(id);
  }
  updateTags(id, tags) {
    this.assertInitialised();
    this.repository.updateTags(id, tags);
  }
};

// ../../modules/assets-ui/src/schema.ts
var ASSETS_UI_SCHEMA = {
  module: "assets-ui",
  migrations: [{
    version: 8,
    module: "assets-ui",
    description: "Create assets and asset_links tables",
    up: `
      CREATE TABLE IF NOT EXISTS assets (
        id           TEXT     PRIMARY KEY,
        campaign_id  TEXT     NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
        name         TEXT     NOT NULL,
        category     TEXT     NOT NULL DEFAULT 'misc'
                         CHECK (category IN ('maps','portraits','audio','documents','misc')),
        mime_type    TEXT     NOT NULL,
        hash         TEXT     NOT NULL,
        size_bytes   INTEGER  NOT NULL DEFAULT 0,
        virtual_path TEXT     NOT NULL,
        disk_path    TEXT     NOT NULL,
        width_px     INTEGER,
        height_px    INTEGER,
        duration_sec REAL,
        tags         TEXT     NOT NULL DEFAULT '[]',
        created_at   TEXT     NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
        updated_at   TEXT     NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
        UNIQUE (campaign_id, hash)
      );
      CREATE INDEX IF NOT EXISTS idx_assets_campaign  ON assets (campaign_id);
      CREATE INDEX IF NOT EXISTS idx_assets_category  ON assets (campaign_id, category);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_assets_virtual_path ON assets (virtual_path);

      CREATE TABLE IF NOT EXISTS asset_links (
        asset_id      TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
        entity_module TEXT NOT NULL,
        entity_id     TEXT NOT NULL,
        role          TEXT NOT NULL DEFAULT 'attachment',
        PRIMARY KEY (asset_id, entity_module, entity_id, role)
      );
      CREATE INDEX IF NOT EXISTS idx_asset_links_entity ON asset_links (entity_module, entity_id);
    `,
    down: `DROP TABLE IF EXISTS asset_links; DROP TABLE IF EXISTS assets;`
  }]
};

// ../../modules/assets-ui/src/module.ts
var AssetsUiModule = class extends BaseModule {
  manifest = Object.freeze({
    id: "assets-ui",
    displayName: "Assets",
    version: "1.0.0",
    dependsOn: [],
    required: false,
    description: "Asset browser and import UI"
  });
  createRepository(db) {
    return new AssetsUiRepository(db, this.log.child("repo"));
  }
  createService(repo) {
    return new AssetsUiService(repo, this.log.child("service"), this._emit.bind(this));
  }
  async onInit(ctx) {
    ctx.registerSchema(ASSETS_UI_SCHEMA);
    this.log.info("Assets module ready");
  }
  getService() {
    return this.service;
  }
};

// src/window.ts
var import_electron = require("electron");
var path = __toESM(require("node:path"));
var MIN_WIDTH = 1024;
var MIN_HEIGHT = 768;
var DEFAULT_WIDTH = 1440;
var DEFAULT_HEIGHT = 900;
function createMainWindow(preloadPath, rendererUrl) {
  const win = new import_electron.BrowserWindow({
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
    minWidth: MIN_WIDTH,
    minHeight: MIN_HEIGHT,
    // Start hidden — show in the 'ready-to-show' handler below.
    show: false,
    // Native title bar on all platforms.
    titleBarStyle: "default",
    title: "Alaruel Atlas",
    // Application icon (resolved relative to the compiled output directory).
    icon: path.join(__dirname, "../../assets/icons/icon.png"),
    webPreferences: {
      // Security: no Node.js in the renderer process.
      nodeIntegration: false,
      // Security: renderer runs in isolated context.
      contextIsolation: true,
      // Security: OS-level sandbox.
      sandbox: true,
      // The only bridge between renderer and main: the preload script.
      preload: preloadPath,
      // Disable experimental features not needed by the application.
      experimentalFeatures: false
    }
  });
  if (rendererUrl) {
    win.loadURL(rendererUrl);
  } else {
    win.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
  win.once("ready-to-show", () => {
    win.show();
  });
  if (process.env["NODE_ENV"] === "development") {
    win.webContents.openDevTools({ mode: "detach" });
  }
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://") || url.startsWith("http://")) {
      import_electron.shell.openExternal(url);
      return { action: "deny" };
    }
    return { action: "allow" };
  });
  win.webContents.on("will-navigate", (event, url) => {
    const appUrl = rendererUrl ?? `file://${path.join(__dirname, "../renderer/")}`;
    if (!url.startsWith(appUrl)) {
      event.preventDefault();
      import_electron.shell.openExternal(url);
    }
  });
  return win;
}
function isWindowAvailable(win) {
  return win !== null && !win.isDestroyed();
}
function focusWindow(win) {
  if (win.isMinimized()) win.restore();
  win.focus();
}

// src/ipc.ts
var import_electron2 = require("electron");
var path2 = __toESM(require("node:path"));
var fs = __toESM(require("node:fs"));
var log2 = createLogger("desktop:ipc");
function registerIpcHandlers(win, paths) {
  registerCampaignHandlers(win, paths);
  registerDbHandlers();
  registerAssetHandlers(paths);
  registerAppHandlers(paths);
  log2.info("IPC handlers registered");
}
function registerCampaignHandlers(win, paths) {
  import_electron2.ipcMain.handle("campaign:open", async (_event, { dbPath }) => {
    log2.info("campaign:open", { dbPath });
    if (!fs.existsSync(dbPath)) return { ok: false, error: `File not found: ${dbPath}` };
    try {
      try {
        databaseManager.disconnect();
      } catch {
      }
      eventBus.emit("app:campaign-closed", { campaignId: "" });
      win.webContents.send("push:campaignClosed");
      databaseManager.connect(dbPath);
      const rows = databaseManager.query("SELECT id FROM campaigns LIMIT 1");
      const campaignId = rows[0]?.id ?? crypto.randomUUID();
      const cfg = configManager.getAppConfig();
      const recent = [dbPath, ...cfg.recentCampaigns.filter((p) => p !== dbPath)].slice(0, 10);
      configManager.setAppConfig({ recentCampaigns: recent });
      eventBus.emit("app:campaign-opened", { campaignId });
      setCampaignId(campaignId);
      win.webContents.send("push:campaignOpened", campaignId);
      log2.info("Campaign opened", { campaignId, dbPath });
      return { ok: true, campaignId };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      log2.error("campaign:open failed", { error, dbPath });
      return { ok: false, error };
    }
  });
  import_electron2.ipcMain.handle("campaign:create", async (_event, options) => {
    log2.info("campaign:create", { name: options.name });
    const filePath = options.filePath.endsWith(".db") ? options.filePath : `${options.filePath}.db`;
    if (fs.existsSync(filePath)) return { ok: false, error: `File already exists: ${filePath}` };
    fs.mkdirSync(path2.dirname(filePath), { recursive: true });
    try {
      databaseManager.connect(filePath);
      const campaignId = crypto.randomUUID();
      const now = (/* @__PURE__ */ new Date()).toISOString();
      databaseManager.run(
        `INSERT INTO campaigns (id, name, gm_name, system, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'active', ?, ?)`,
        [campaignId, options.name, options.gmName ?? "", options.system ?? "", now, now]
      );
      const cfg = configManager.getAppConfig();
      const recent = [filePath, ...cfg.recentCampaigns].slice(0, 10);
      configManager.setAppConfig({ recentCampaigns: recent });
      setCampaignId(campaignId);
      eventBus.emit("app:campaign-opened", { campaignId });
      win.webContents.send("push:campaignOpened", campaignId);
      log2.info("Campaign created", { campaignId, filePath });
      return { ok: true, campaignId };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      log2.error("campaign:create failed", { error });
      return { ok: false, error };
    }
  });
  import_electron2.ipcMain.handle("campaign:close", async () => {
    log2.info("campaign:close");
    try {
      eventBus.emit("app:campaign-closed", { campaignId: "" });
      win.webContents.send("push:campaignClosed");
      databaseManager.disconnect();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  });
  import_electron2.ipcMain.handle("campaign:listRecent", () => {
    const { recentCampaigns } = configManager.getAppConfig();
    const existing = recentCampaigns.filter((p) => fs.existsSync(p));
    if (existing.length !== recentCampaigns.length) configManager.setAppConfig({ recentCampaigns: existing });
    return existing.map((filePath) => ({ filePath }));
  });
  import_electron2.ipcMain.handle("campaign:pickFile", async () => {
    const result = await import_electron2.dialog.showOpenDialog(win, {
      title: "Open Campaign",
      defaultPath: paths.campaigns,
      filters: [{ name: "Alaruel Atlas Campaigns", extensions: ["db"] }],
      properties: ["openFile"]
    });
    return result.canceled ? null : result.filePaths[0] ?? null;
  });
  import_electron2.ipcMain.handle("campaign:saveFile", async (_event, { name }) => {
    const result = await import_electron2.dialog.showSaveDialog(win, {
      title: "Save New Campaign",
      defaultPath: require("node:path").join(paths.campaigns, `${name.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.db`),
      filters: [{ name: "Alaruel Atlas Campaigns", extensions: ["db"] }]
    });
    return result.canceled ? null : result.filePath ?? null;
  });
}
function registerDbHandlers() {
  import_electron2.ipcMain.handle("db:query", (_event, { sql, params = [] }) => {
    try {
      return { ok: true, rows: databaseManager.query(sql, params) };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      log2.error("db:query failed", { error, sql });
      return { ok: false, error, rows: [] };
    }
  });
  import_electron2.ipcMain.handle("db:run", (_event, { sql, params = [] }) => {
    try {
      const r = databaseManager.run(sql, params);
      return { ok: true, lastInsertRowid: Number(r.lastInsertRowid), changes: r.changes };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      log2.error("db:run failed", { error, sql });
      return { ok: false, error };
    }
  });
}
var _currentCampaignId = null;
function getCampaignId() {
  return _currentCampaignId;
}
function setCampaignId(id) {
  _currentCampaignId = id;
}
function getMimeType(filePath) {
  const ext = path2.extname(filePath).toLowerCase();
  const mimeMap = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".ogg": "audio/ogg",
    ".pdf": "application/pdf",
    ".txt": "text/plain",
    ".md": "text/markdown"
  };
  return mimeMap[ext] ?? "application/octet-stream";
}
function registerAssetHandlers(paths) {
  import_electron2.ipcMain.handle("assets:resolve", (_event, { virtualPath }) => {
    const record = assetManager.loadAsset(virtualPath);
    if (!record) return null;
    return `file://${record.diskPath.replace(/\\/g, "/")}`;
  });
  import_electron2.ipcMain.handle("assets:import", async (_event, options) => {
    try {
      const sourcePath = options.sourcePath;
      if (!fs.existsSync(sourcePath)) {
        return { ok: false, error: `File not found: ${sourcePath}` };
      }
      const id = crypto.randomUUID();
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const ext = path2.extname(path2.basename(sourcePath)).toLowerCase();
      const mimeType = getMimeType(sourcePath);
      const sizeBytes = fs.statSync(sourcePath).size;
      const category = options.category || "misc";
      const name = options.name || path2.basename(sourcePath);
      const destDir = path2.join(paths.assets, category);
      fs.mkdirSync(destDir, { recursive: true });
      const destFile = path2.join(destDir, `${id}${ext}`);
      fs.copyFileSync(sourcePath, destFile);
      const virtualPath = `asset://${category}/${id}${ext}`;
      const campaignId = options.campaignId ?? getCampaignId();
      if (!campaignId) {
        return { ok: false, error: "No campaign open. Open a campaign before importing assets." };
      }
      const hashBuf = require("node:crypto").createHash("sha256").update(fs.readFileSync(sourcePath)).digest("hex");
      databaseManager.run(
        `INSERT OR IGNORE INTO assets
           (id, campaign_id, name, category, mime_type, hash, size_bytes,
            virtual_path, disk_path, tags, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          campaignId,
          name,
          category,
          mimeType,
          hashBuf,
          sizeBytes,
          virtualPath,
          destFile,
          JSON.stringify(options.tags ?? []),
          now,
          now
        ]
      );
      log2.info("Asset imported", { id, name, category, virtualPath });
      return { ok: true, assetId: id };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      log2.error("assets:import failed", { error });
      return { ok: false, error };
    }
  });
  import_electron2.ipcMain.handle("assets:pickFile", async (_event, { category }) => {
    const result = await import_electron2.dialog.showOpenDialog({
      title: `Import Asset${category ? ` (${category})` : ""}`,
      defaultPath: paths.assets,
      filters: buildAssetFilters(category),
      properties: ["openFile"]
    });
    return result.canceled ? null : result.filePaths[0] ?? null;
  });
}
function registerAppHandlers(paths) {
  import_electron2.ipcMain.handle("app:getVersion", () => import_electron2.app.getVersion());
  import_electron2.ipcMain.handle("app:getPaths", () => paths);
  import_electron2.ipcMain.handle("app:showInFolder", (_event, { filePath }) => {
    import_electron2.shell.showItemInFolder(filePath);
  });
}
function registerEventForwards(win) {
  const forwarded = [
    "quest:created",
    "quest:updated",
    "quest:completed",
    "npc:created",
    "npc:updated",
    "session:started",
    "session:ended",
    "timeline:entry-added",
    "atlas:map-loaded"
  ];
  for (const eventName of forwarded) {
    eventBus.subscribe(eventName, (payload) => {
      if (!win.isDestroyed()) win.webContents.send("push:moduleEvent", { event: eventName, payload });
    });
  }
  log2.debug(`Forwarding ${forwarded.length} module events to renderer`);
}
function buildAssetFilters(category) {
  const all = { name: "All Files", extensions: ["*"] };
  switch (category) {
    case "maps":
    case "portraits":
      return [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp", "gif", "svg"] }, all];
    case "audio":
      return [{ name: "Audio", extensions: ["mp3", "ogg", "wav"] }, all];
    case "documents":
      return [{ name: "Documents", extensions: ["pdf"] }, all];
    default:
      return [all];
  }
}

// src/main.ts
var isDev = process.env["NODE_ENV"] === "development";
configureLogger({ minLevel: isDev ? "debug" : "info" });
var log3 = createLogger("desktop:main");
var mainWindow = null;
var appPaths;
var isQuitting = false;
function resolveAppPaths() {
  const userData = import_electron3.app.getPath("userData");
  const paths = {
    userData,
    campaigns: path3.join(userData, "campaigns"),
    assets: path3.join(userData, "assets"),
    logs: path3.join(userData, "logs"),
    plugins: path3.join(userData, "plugins"),
    config: path3.join(userData, "config")
  };
  for (const dir of Object.values(paths)) {
    fs2.mkdirSync(dir, { recursive: true });
  }
  return paths;
}
async function boot() {
  log3.info("Alaruel Atlas starting", {
    version: import_electron3.app.getVersion(),
    electron: process.versions["electron"],
    node: process.versions.node,
    platform: process.platform,
    isDev
  });
  appPaths = resolveAppPaths();
  log3.debug("Data paths resolved", appPaths);
  const configPath = path3.join(appPaths.config, "user.json");
  configManager.load(configPath);
  log3.info("Config loaded", { configPath });
  const { logLevel } = configManager.getAppConfig();
  configureLogger({ minLevel: logLevel });
  assetManager.init(appPaths.assets);
  log3.info("Asset manager initialised");
  buildApplicationMenu();
  log3.info("Registering feature modules");
  moduleLoader.register(new AtlasModule());
  moduleLoader.register(new NpcsModule());
  moduleLoader.register(new QuestsModule());
  moduleLoader.register(new SessionsModule());
  moduleLoader.register(new TimelineModule());
  moduleLoader.register(new GraphModule());
  moduleLoader.register(new AssetsUiModule());
  const summary = await moduleLoader.initAll();
  log3.info("Module boot complete", {
    active: summary.succeeded,
    failed: summary.failed.map((f) => `${f.id}: ${f.error}`),
    skipped: summary.skipped.map((s) => `${s.id}: ${s.reason}`)
  });
  if (summary.failed.length > 0) {
    log3.warn(`${summary.failed.length} module(s) failed to initialise \u2014 continuing without them`);
  }
  const preloadPath = path3.join(__dirname, "preload.js");
  const rendererUrl = isDev ? "http://localhost:5173" : void 0;
  mainWindow = createMainWindow(preloadPath, rendererUrl);
  log3.info("BrowserWindow created");
  registerIpcHandlers(mainWindow, appPaths);
  registerEventForwards(mainWindow);
  log3.info("IPC handlers registered");
  await pluginLoader.loadAll(appPaths.plugins);
  log3.info("Plugin loading complete", { loaded: pluginLoader.loadedPluginIds() });
  log3.info("Boot complete \u2014 application ready");
}
function buildApplicationMenu() {
  const template = [
    {
      label: "File",
      submenu: [
        { label: "New Campaign\u2026", accelerator: "CmdOrCtrl+N", click: () => sendToRenderer("menu:newCampaign") },
        { label: "Open Campaign\u2026", accelerator: "CmdOrCtrl+O", click: () => sendToRenderer("menu:openCampaign") },
        { type: "separator" },
        { label: "Close Campaign", click: () => sendToRenderer("menu:closeCampaign") },
        { type: "separator" },
        { role: "quit" }
      ]
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" }
      ]
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        ...isDev ? [{ role: "toggleDevTools" }] : [],
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" }
      ]
    },
    {
      label: "Help",
      submenu: [
        { label: `Alaruel Atlas v${import_electron3.app.getVersion()}`, enabled: false },
        { type: "separator" },
        {
          label: "Open Log File",
          click: () => {
            const logFile = path3.join(appPaths.logs, "app.log");
            if (fs2.existsSync(logFile)) require("electron").shell.openPath(logFile);
          }
        }
      ]
    }
  ];
  if (process.platform === "darwin") {
    template.unshift({
      label: import_electron3.app.getName(),
      submenu: [
        { role: "about" },
        { type: "separator" },
        { role: "services" },
        { type: "separator" },
        { role: "hide" },
        { role: "hideOthers" },
        { role: "unhide" },
        { type: "separator" },
        { role: "quit" }
      ]
    });
  }
  import_electron3.Menu.setApplicationMenu(import_electron3.Menu.buildFromTemplate(template));
}
function sendToRenderer(channel) {
  if (isWindowAvailable(mainWindow)) {
    mainWindow.webContents.send(channel);
  }
}
import_electron3.app.on("activate", () => {
  if (!isWindowAvailable(mainWindow)) {
    if (mainWindow?.isDestroyed()) {
      const preloadPath = path3.join(__dirname, "preload.js");
      const rendererUrl = isDev ? "http://localhost:5173" : void 0;
      mainWindow = createMainWindow(preloadPath, rendererUrl);
      registerIpcHandlers(mainWindow, appPaths);
      registerEventForwards(mainWindow);
    } else {
      import_electron3.app.whenReady().then(() => boot());
    }
  } else {
    focusWindow(mainWindow);
  }
});
import_electron3.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    import_electron3.app.quit();
  }
});
import_electron3.app.on("before-quit", () => {
  isQuitting = true;
});
import_electron3.app.on("will-quit", async (event) => {
  if (!isQuitting) return;
  event.preventDefault();
  isQuitting = false;
  log3.info("Application shutting down");
  try {
    await moduleLoader.destroyAll();
    log3.info("Modules destroyed");
  } catch (err) {
    log3.error("Module teardown error", { error: err instanceof Error ? err.message : String(err) });
  }
  import_electron3.app.quit();
});
var gotLock = import_electron3.app.requestSingleInstanceLock();
if (!gotLock) {
  log3.warn("Another instance is already running \u2014 quitting");
  import_electron3.app.quit();
} else {
  import_electron3.app.on("second-instance", () => {
    if (isWindowAvailable(mainWindow)) {
      focusWindow(mainWindow);
    }
  });
  import_electron3.app.whenReady().then(boot).catch((err) => {
    log3.error("Fatal boot error", { error: err instanceof Error ? err.message : String(err) });
    import_electron3.app.exit(1);
  });
}
//# sourceMappingURL=main.js.map
