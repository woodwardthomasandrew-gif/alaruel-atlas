// ─────────────────────────────────────────────────────────────────────────────
// core/assets — AssetManager implementation
// ─────────────────────────────────────────────────────────────────────────────

import { createHash }                                  from 'node:crypto';
import { copyFileSync, mkdirSync, readFileSync,
         existsSync, unlinkSync }                      from 'node:fs';
import { extname, join, basename }                     from 'node:path';
import type {
  IAssetManager,
  AssetRecord,
  AssetLink,
  AssetCategory,
  AssetMimeType,
  RegisterAssetOptions,
} from './types';
import { createLogger }   from '../../logger/src/index';
import { databaseManager } from '../../database/src/index';

export type {
  IAssetManager,
  AssetRecord,
  AssetLink,
  AssetCategory,
  AssetMimeType,
  RegisterAssetOptions,
};

// ── MIME type resolution ──────────────────────────────────────────────────────

const EXT_TO_MIME: Record<string, AssetMimeType> = {
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif':  'image/gif',
  '.svg':  'image/svg+xml',
  '.mp3':  'audio/mpeg',
  '.ogg':  'audio/ogg',
  '.wav':  'audio/wav',
  '.pdf':  'application/pdf',
};

function resolveMime(filePath: string): AssetMimeType {
  const ext = extname(filePath).toLowerCase();
  return EXT_TO_MIME[ext] ?? 'application/octet-stream';
}

// ── ID generation (minimal, no external deps) ─────────────────────────────────

function generateId(): string {
  // Use the first 21 characters of a random hex string as a simple nanoid-like ID.
  return createHash('sha256')
    .update(`${Date.now()}-${Math.random()}`)
    .digest('hex')
    .slice(0, 21);
}

// ── Asset database schema ─────────────────────────────────────────────────────

/** Schema registration submitted by the asset manager at boot. */
export const ASSET_SCHEMA = {
  module: 'core_assets',
  migrations: [
    {
      version:     1,
      module:      'core_assets',
      description: 'Create assets and asset_links tables',
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
      `,
    },
  ],
};

// ── AssetManager ──────────────────────────────────────────────────────────────

/**
 * Manages all binary assets for a campaign.
 *
 * Assets are stored in a content-addressable way:
 *  - Stored filename: `<id><ext>` inside `storageDir/<category>/`
 *  - Addressed via virtual paths: `asset://<category>/<id><ext>`
 *  - Deduplicated by SHA-256 hash — importing the same file twice returns the
 *    existing record without copying.
 *
 * All metadata is persisted in the campaign SQLite database via
 * the DatabaseManager. The AssetManager registers its own schema on init().
 *
 * @example
 * ```ts
 * await assetManager.init('/path/to/data/assets');
 *
 * const record = await assetManager.registerAsset({
 *   name:       'Overworld Map',
 *   sourcePath: '/tmp/map.png',
 *   category:   'maps',
 *   tags:       ['region-north'],
 * });
 *
 * assetManager.linkAsset({
 *   assetId:      record.id,
 *   entityModule: 'atlas',
 *   entityId:     'loc-42',
 *   role:         'map',
 * });
 *
 * const loaded = assetManager.loadAsset(record.virtualPath);
 * ```
 */
export class AssetManager implements IAssetManager {
  private storageDir: string | null = null;
  private readonly log = createLogger('core:assets');

  // ── init ───────────────────────────────────────────────────────────────────

  /**
   * Initialise the asset manager with a storage root directory.
   * Creates the directory tree for each category if absent.
   * Registers the asset schema with the DatabaseManager.
   *
   * @param storageDir - Absolute path to the asset root (e.g. `data/assets`).
   */
  init(storageDir: string): void {
    this.storageDir = storageDir;

    // Ensure category sub-directories exist.
    const categories: AssetCategory[] = ['maps', 'portraits', 'audio', 'documents', 'misc'];
    for (const cat of categories) {
      mkdirSync(join(storageDir, cat), { recursive: true });
    }

    // Register DB schema (idempotent via CREATE TABLE IF NOT EXISTS).
    databaseManager.registerSchema(ASSET_SCHEMA);

    this.log.info('AssetManager initialised', { storageDir });
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
  async registerAsset(options: RegisterAssetOptions): Promise<AssetRecord> {
    this.assertInitialised('registerAsset');

    const { name, sourcePath, category, tags = [] } = options;

    if (!existsSync(sourcePath)) {
      throw new Error(`[core:assets] Source file not found: ${sourcePath}`);
    }

    // Compute hash for deduplication.
    const hash = this.hashFile(sourcePath);

    // Check for an existing asset with this hash.
    const existing = databaseManager.query<AssetRow>(
      'SELECT * FROM core_assets WHERE hash = ? LIMIT 1',
      [hash],
    );
    if (existing.length > 0 && existing[0]) {
      this.log.info('Asset already exists (dedup by hash)', { hash, id: existing[0].id });
      return rowToRecord(existing[0]);
    }

    // Prepare file metadata.
    const id         = generateId();
    const ext        = extname(basename(sourcePath)).toLowerCase();
    const mimeType   = resolveMime(sourcePath);
    const sizeBytes  = readFileSync(sourcePath).length;
    const destDir    = join(this.storageDir!, category);
    const destFile   = `${id}${ext}`;
    const diskPath   = join(destDir, destFile);
    const virtualPath = `asset://${category}/${id}${ext}`;
    const createdAt  = new Date().toISOString();

    // Copy the file into the managed store.
    copyFileSync(sourcePath, diskPath);

    const record: AssetRecord = {
      id, name, category, mimeType, hash, sizeBytes,
      virtualPath, diskPath, createdAt, tags,
    };

    // Persist to database.
    databaseManager.run(
      `INSERT INTO core_assets
         (id, name, category, mime_type, hash, size_bytes, virtual_path, disk_path, created_at, tags)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, name, category, mimeType, hash, sizeBytes, virtualPath, diskPath, createdAt, JSON.stringify(tags)],
    );

    this.log.info('Asset registered', { id, name, category, virtualPath });
    return record;
  }

  // ── loadAsset ──────────────────────────────────────────────────────────────

  /**
   * Look up an asset by its ID or virtual path.
   *
   * @param idOrVirtualPath - Asset ID (`abc123`) or virtual path (`asset://maps/abc123.png`).
   * @returns The AssetRecord or `null` if not found.
   */
  loadAsset(idOrVirtualPath: string): AssetRecord | null {
    this.assertInitialised('loadAsset');

    // Determine whether we received an ID or a virtual path.
    const isVirtualPath = idOrVirtualPath.startsWith('asset://');
    const rows = isVirtualPath
      ? databaseManager.query<AssetRow>('SELECT * FROM core_assets WHERE virtual_path = ? LIMIT 1', [idOrVirtualPath])
      : databaseManager.query<AssetRow>('SELECT * FROM core_assets WHERE id = ? LIMIT 1', [idOrVirtualPath]);

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
  tagAsset(
    assetId:     string,
    addTags:     string[] = [],
    removeTags:  string[] = [],
  ): AssetRecord {
    this.assertInitialised('tagAsset');

    const record = this.loadAsset(assetId);
    if (!record) {
      throw new Error(`[core:assets] Asset not found: ${assetId}`);
    }

    // Compute new tag set.
    const tagSet = new Set(record.tags);
    for (const t of addTags)    tagSet.add(t);
    for (const t of removeTags) tagSet.delete(t);
    const newTags = [...tagSet];

    databaseManager.run(
      'UPDATE core_assets SET tags = ? WHERE id = ?',
      [JSON.stringify(newTags), assetId],
    );

    this.log.debug('Asset tags updated', { assetId, addTags, removeTags, newTags });
    return { ...record, tags: newTags };
  }

  // ── linkAsset ──────────────────────────────────────────────────────────────

  /**
   * Associate an asset with a domain entity.
   * Idempotent: if the exact link already exists, does nothing.
   *
   * @param link - AssetLink describing the relationship.
   */
  linkAsset(link: AssetLink): void {
    this.assertInitialised('linkAsset');
    const { assetId, entityModule, entityId, role } = link;

    databaseManager.run(
      'INSERT OR IGNORE INTO core_asset_links (asset_id, entity_module, entity_id, role) VALUES (?, ?, ?, ?)',
      [assetId as string, entityModule as string, entityId as string, role as string],
    );

    this.log.debug('Asset linked', link as unknown as Record<string, unknown>);
  }

  // ── unlinkAsset ────────────────────────────────────────────────────────────

  /**
   * Remove a specific asset–entity link.
   * Silently does nothing if the link does not exist.
   */
  unlinkAsset(link: AssetLink): void {
    this.assertInitialised('unlinkAsset');
    const { assetId, entityModule, entityId, role } = link;

    databaseManager.run(
      'DELETE FROM core_asset_links WHERE asset_id = ? AND entity_module = ? AND entity_id = ? AND role = ?',
      [assetId as string, entityModule as string, entityId as string, role as string],
    );

    this.log.debug('Asset unlinked', link as unknown as Record<string, unknown>);
  }

  // ── getLinksForEntity ──────────────────────────────────────────────────────

  /**
   * Return all AssetRecords linked to a given entity.
   *
   * @param entityModule - Module namespace, e.g. `'npcs'`.
   * @param entityId     - The entity's ID.
   * @param role         - Optional filter by role.
   */
  getLinksForEntity(
    entityModule: string,
    entityId:     string,
    role?:        string,
  ): AssetRecord[] {
    this.assertInitialised('getLinksForEntity');

    const sql = role
      ? `SELECT a.* FROM core_assets a
           JOIN core_asset_links l ON l.asset_id = a.id
          WHERE l.entity_module = ? AND l.entity_id = ? AND l.role = ?`
      : `SELECT a.* FROM core_assets a
           JOIN core_asset_links l ON l.asset_id = a.id
          WHERE l.entity_module = ? AND l.entity_id = ?`;

    const params = role
      ? [entityModule, entityId, role]
      : [entityModule, entityId];

    return databaseManager
      .query<AssetRow>(sql, params)
      .map(rowToRecord);
  }

  // ── getLinksForAsset ───────────────────────────────────────────────────────

  /**
   * Return all AssetLinks pointing to a given asset.
   *
   * @param assetId - The asset's ID.
   */
  getLinksForAsset(assetId: string): AssetLink[] {
    this.assertInitialised('getLinksForAsset');

    return databaseManager.query<AssetLinkRow>(
      'SELECT * FROM core_asset_links WHERE asset_id = ?',
      [assetId],
    ).map(r => ({
      assetId:      r.asset_id,
      entityModule: r.entity_module,
      entityId:     r.entity_id,
      role:         r.role,
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
  deleteAsset(assetId: string): void {
    this.assertInitialised('deleteAsset');

    const record = this.loadAsset(assetId);
    if (!record) {
      throw new Error(`[core:assets] Cannot delete — asset not found: ${assetId}`);
    }

    // Remove from database (cascade deletes links).
    databaseManager.run('DELETE FROM core_assets WHERE id = ?', [assetId]);

    // Remove the file from disk.
    if (existsSync(record.diskPath)) {
      unlinkSync(record.diskPath);
    }

    this.log.info('Asset deleted', { assetId, diskPath: record.diskPath });
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private assertInitialised(method: string): void {
    if (!this.storageDir) {
      throw new Error(
        `[core:assets] Cannot call ${method}() — AssetManager not initialised. Call init() first.`,
      );
    }
  }

  private hashFile(filePath: string): string {
    const contents = readFileSync(filePath);
    return createHash('sha256').update(contents).digest('hex');
  }
}

// ── Row ↔ Record converters ───────────────────────────────────────────────────

/** Raw column names returned from SQLite. */
interface AssetRow {
  id:           string;
  name:         string;
  category:     AssetCategory;
  mime_type:    AssetMimeType;
  hash:         string;
  size_bytes:   number;
  virtual_path: string;
  disk_path:    string;
  created_at:   string;
  tags:         string; // JSON array string
}

interface AssetLinkRow {
  asset_id:      string;
  entity_module: string;
  entity_id:     string;
  role:          string;
}

function rowToRecord(row: AssetRow): AssetRecord {
  return {
    id:          row.id,
    name:        row.name,
    category:    row.category,
    mimeType:    row.mime_type,
    hash:        row.hash,
    sizeBytes:   row.size_bytes,
    virtualPath: row.virtual_path,
    diskPath:    row.disk_path,
    createdAt:   row.created_at,
    tags:        JSON.parse(row.tags) as string[],
  };
}

// ── Singleton ─────────────────────────────────────────────────────────────────

/**
 * Application-wide asset manager singleton.
 */
export const assetManager = new AssetManager();
