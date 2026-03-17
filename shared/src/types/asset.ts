// ─────────────────────────────────────────────────────────────────────────────
// shared/types/asset.ts
//
// Asset entity type — the module-facing view of a managed binary asset.
//
// The canonical storage implementation lives in core/assets. This file
// defines the shape that modules and the UI consume after the asset has been
// registered and tagged. It re-exports a subset of the core types so that
// modules can import from @alaruel/shared only and never from core directly.
// ─────────────────────────────────────────────────────────────────────────────

import type { EntityBase, WithTags, ISOTimestamp } from './common';

// ── Re-export core asset category and MIME types ──────────────────────────────

/**
 * Broad groupings for assets. Mirrors core/assets AssetCategory.
 * Duplicated here so modules import from @alaruel/shared, not from core.
 */
export type AssetCategory =
  | 'maps'
  | 'portraits'
  | 'audio'
  | 'documents'
  | 'misc';

/**
 * MIME types accepted by the asset manager.
 */
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

// ── AssetLink ─────────────────────────────────────────────────────────────────

/**
 * A directional association between an Asset and a domain entity.
 *
 * Links are stored in the `core_asset_links` table and queried from both
 * directions:
 *   - "all assets for NPC X"  → getLinksForEntity('npcs', npcId)
 *   - "all entities for asset Y" → getLinksForAsset(assetId)
 */
export interface AssetLink {
  /** The asset being linked. */
  assetId:      string;
  /**
   * Module that owns the target entity, e.g. `'npcs'`, `'atlas'`, `'quests'`.
   * Namespaces entity IDs across modules.
   */
  entityModule: string;
  /** The entity's ID within its module. */
  entityId:     string;
  /**
   * Semantic role of the link.
   * Conventions per module:
   *   npcs   → 'portrait'
   *   atlas  → 'map', 'thumbnail'
   *   quests → 'handout', 'attachment'
   *   sessions → 'handout', 'map', 'attachment'
   */
  role:         string;
}

// ── Asset ─────────────────────────────────────────────────────────────────────

/**
 * A managed binary asset (image, audio file, PDF, etc.).
 *
 * This is the module-facing representation. The underlying file lives on disk
 * at `diskPath`; modules should access it only via `virtualPath` through the
 * AssetManager — never by reading `diskPath` directly.
 *
 * Assets are content-addressed: the `hash` field (SHA-256) uniquely identifies
 * the file contents. Importing the same file twice returns the same Asset.
 *
 * Assets are linked to domain entities via `AssetLink` records rather than
 * embedding entity IDs directly — this allows an asset (e.g. a map image)
 * to be shared across multiple entities.
 */
export interface Asset extends EntityBase, WithTags {
  // ── Identity ───────────────────────────────────────────────────────────────

  /** Broad category for browsing and icon selection. */
  category:     AssetCategory;

  /** MIME type of the stored file. */
  mimeType:     AssetMimeType;

  // ── File metadata ─────────────────────────────────────────────────────────

  /** SHA-256 hex digest of the file contents. Guarantees deduplication. */
  hash:         string;

  /** Size of the stored file in bytes. */
  sizeBytes:    number;

  // ── Addressing ────────────────────────────────────────────────────────────

  /**
   * Virtual asset URL used everywhere in the UI and modules.
   * Format: `asset://<category>/<id>.<ext>`
   * Example: `asset://portraits/abc123.webp`
   *
   * Resolved to an OS path at runtime by the AssetManager.
   * Never construct or parse this string manually — use AssetManager.loadAsset().
   */
  virtualPath:  string;

  /**
   * Absolute OS filesystem path where the file is stored.
   * PRIVATE — read by the AssetManager only. Modules must not use this field.
   * Exposed here so the type is complete; UI and module code should use
   * `virtualPath`.
   */
  readonly diskPath: string;

  // ── Timestamps ────────────────────────────────────────────────────────────

  /**
   * Real-world timestamp of when this asset was first imported.
   * (Inherited `createdAt` from EntityBase.)
   */

  /**
   * Real-world timestamp of when tags or metadata were last changed.
   * (Inherited `updatedAt` from EntityBase.)
   */

  // ── Dimensions (image assets only) ────────────────────────────────────────

  /**
   * Natural pixel width of image assets.
   * Null for non-image assets (audio, PDF, etc.).
   */
  widthPx?:     number;

  /** Natural pixel height of image assets. */
  heightPx?:    number;

  // ── Duration (audio assets only) ──────────────────────────────────────────

  /**
   * Duration in seconds for audio assets.
   * Null for non-audio assets.
   */
  durationSeconds?: number;
}

// ── AssetReference ────────────────────────────────────────────────────────────

/**
 * A lightweight reference to an asset, used inside other entity types
 * where the full Asset record is not needed — only enough to render a
 * thumbnail or play a preview.
 *
 * Used instead of embedding the full Asset to keep entity records lean.
 */
export interface AssetReference {
  assetId:     string;
  virtualPath: string;
  category:    AssetCategory;
  mimeType:    AssetMimeType;
  /** Display name of the asset (copied at link time for offline display). */
  name:        string;
}

// ── ImportRequest ─────────────────────────────────────────────────────────────

/**
 * Payload shape for requesting a new asset import through the UI.
 * Submitted by the assets-ui module to the AssetManager.
 */
export interface AssetImportRequest {
  /** Absolute OS path to the source file. */
  sourcePath:   string;
  /** Display name for the new asset. */
  name:         string;
  /** Category to assign. */
  category:     AssetCategory;
  /** Optional initial tags. */
  tags?:        string[];
  /** Optional entity to immediately link the asset to after import. */
  linkTo?: {
    entityModule: string;
    entityId:     string;
    role:         string;
  };
}
