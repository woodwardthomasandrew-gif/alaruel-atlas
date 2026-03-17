// ─────────────────────────────────────────────────────────────────────────────
// core/assets — types
// ─────────────────────────────────────────────────────────────────────────────

/** Broad category groupings for assets. */
export type AssetCategory = 'maps' | 'portraits' | 'audio' | 'documents' | 'misc';

/** All MIME types the asset manager will accept. */
export type AssetMimeType =
  | 'image/png'
  | 'image/jpeg'
  | 'image/webp'
  | 'image/gif'
  | 'image/svg+xml'
  | 'audio/mpeg'
  | 'audio/ogg'
  | 'audio/wav'
  | 'application/pdf'
  | 'application/octet-stream';

/**
 * Metadata record stored in the campaign database for each managed asset.
 * The actual file lives on disk; this record describes and locates it.
 */
export interface AssetRecord {
  /** Unique asset ID (nanoid). */
  id: string;
  /** Display name shown in the UI. */
  name: string;
  /** Asset category used for browsing and filtering. */
  category: AssetCategory;
  /** MIME type of the file. */
  mimeType: AssetMimeType;
  /** SHA-256 hex digest of the file contents. Used for deduplication. */
  hash: string;
  /** File size in bytes. */
  sizeBytes: number;
  /** Virtual asset URL: `asset://<category>/<id>.<ext>` */
  virtualPath: string;
  /** Absolute OS path to the file on disk. */
  diskPath: string;
  /** ISO-8601 creation timestamp. */
  createdAt: string;
  /** User-supplied tags for filtering, e.g. `['region-north', 'npc-elara']`. */
  tags: string[];
}

/**
 * A link associates an asset with a domain entity (NPC, quest, location, etc.).
 * Links are stored separately from the asset record so they can be queried
 * in both directions: "all assets for entity X" and "all entities for asset Y".
 */
export interface AssetLink {
  /** The asset being linked. */
  assetId: string;
  /**
   * The owning module of the target entity, e.g. `'npcs'` or `'atlas'`.
   * Used to namespace entity IDs across modules.
   */
  entityModule: string;
  /** The entity's ID within its module. */
  entityId: string;
  /**
   * Semantic role of the link, e.g. `'portrait'`, `'map'`, `'attachment'`.
   * Allows modules to distinguish between different asset relationships.
   */
  role: string;
}

/** Options for registering a new asset. */
export interface RegisterAssetOptions {
  /** Display name for the asset. */
  name: string;
  /** Source file path on the OS filesystem to import from. */
  sourcePath: string;
  /** Category to assign. */
  category: AssetCategory;
  /** Optional initial tags. */
  tags?: string[];
}

/** The public interface of the AssetManager. */
export interface IAssetManager {
  /**
   * Initialise the asset manager, pointing it at the storage directory.
   * Creates the directory structure if it doesn't exist.
   *
   * @param storageDir - Absolute path to the asset storage root.
   */
  init(storageDir: string): void;

  /**
   * Import a file into the managed asset store.
   *
   * Steps:
   *  1. Compute SHA-256 hash of the source file.
   *  2. If an asset with the same hash already exists, return the existing record.
   *  3. Copy the file into the storage directory under a stable filename.
   *  4. Persist the AssetRecord to the campaign database.
   *  5. Return the new AssetRecord.
   *
   * @param options - Name, source path, category, and optional tags.
   */
  registerAsset(options: RegisterAssetOptions): Promise<AssetRecord>;

  /**
   * Resolve a virtual asset path or asset ID to its AssetRecord.
   *
   * @param idOrVirtualPath - Either an asset ID or `asset://<category>/<id>.<ext>`.
   * @returns The AssetRecord, or `null` if not found.
   */
  loadAsset(idOrVirtualPath: string): AssetRecord | null;

  /**
   * Add or remove tags on an asset.
   *
   * @param assetId   - The target asset's ID.
   * @param addTags   - Tags to add (duplicates are ignored).
   * @param removeTags - Tags to remove.
   */
  tagAsset(assetId: string, addTags?: string[], removeTags?: string[]): AssetRecord;

  /**
   * Create a link between an asset and a domain entity.
   * If the link already exists (same assetId + entityModule + entityId + role),
   * the call is idempotent and returns quietly.
   *
   * @param link - The AssetLink to create.
   */
  linkAsset(link: AssetLink): void;

  /**
   * Remove a link between an asset and a domain entity.
   *
   * @param link - Must match exactly on all four fields.
   */
  unlinkAsset(link: AssetLink): void;

  /**
   * Return all assets linked to a specific entity.
   *
   * @param entityModule - Module owning the entity.
   * @param entityId     - The entity's ID.
   * @param role         - Optional role filter.
   */
  getLinksForEntity(entityModule: string, entityId: string, role?: string): AssetRecord[];

  /**
   * Return all AssetLinks pointing to a given asset.
   *
   * @param assetId - The asset's ID.
   */
  getLinksForAsset(assetId: string): AssetLink[];

  /**
   * Permanently delete an asset record, its file on disk, and all its links.
   *
   * @param assetId - The asset to delete.
   */
  deleteAsset(assetId: string): void;
}
