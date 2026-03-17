// ─────────────────────────────────────────────────────────────────────────────
// shared/types/location.ts
//
// Location and Map entity types.
// Locations are the geographical backbone of the campaign world.
// Maps are visual assets that represent one or more Locations.
// Both are managed by the `atlas` module.
// ─────────────────────────────────────────────────────────────────────────────

import type { EntityBase, WithDescription, WithTags, ActiveStatus } from './common';

// ── Supporting value types ────────────────────────────────────────────────────

/**
 * Broad category of a Location.
 * Used for filtering and for choosing default icons in the atlas view.
 */
export type LocationType =
  | 'world'       // Top-level world or plane
  | 'continent'
  | 'region'
  | 'nation'
  | 'city'
  | 'town'
  | 'village'
  | 'district'    // A neighbourhood within a city
  | 'building'
  | 'dungeon'
  | 'wilderness'
  | 'landmark'
  | 'other';

/**
 * A 2D point on a map canvas, in map-local pixel coordinates.
 * The origin (0, 0) is the top-left corner of the map image.
 */
export interface MapPoint {
  x: number;
  y: number;
}

/**
 * A pinned marker placing a Location on a specific Map.
 * One Location can be pinned on multiple Maps (e.g. a city on both the
 * world map and a regional map).
 */
export interface LocationPin {
  /** ID of the Map this pin belongs to. */
  mapId:    string;
  /** Position of the pin on the map canvas. */
  position: MapPoint;
  /** Optional display label override. Defaults to the Location's `name`. */
  label?:   string;
}

// ── Location ──────────────────────────────────────────────────────────────────

/**
 * A named place in the campaign world — from a continent down to a single room.
 *
 * Locations form a hierarchy via `parentLocationId`. The root of the tree is
 * a Location with `type: 'world'` and `parentLocationId: null`.
 *
 * The atlas module renders Locations on Maps using `pins`.
 */
export interface Location extends EntityBase, WithDescription, WithTags {
  // ── Classification ─────────────────────────────────────────────────────────

  /** Broad category, used for icon selection and filtering. */
  locationType:       LocationType;

  /** Current status of this location in the narrative. */
  status:             ActiveStatus;

  // ── Hierarchy ─────────────────────────────────────────────────────────────

  /**
   * ID of the parent Location.
   * Null only for the root world Location.
   * Example hierarchy: World → Continent → Nation → City → District → Building
   */
  parentLocationId:   string | null;

  /**
   * IDs of direct child Locations.
   * Kept denormalised here for fast tree traversal without recursive queries.
   */
  childLocationIds:   string[];

  // ── Map pins ───────────────────────────────────────────────────────────────

  /**
   * Zero or more positions on Maps where this Location is pinned.
   * The atlas module reads these to render markers.
   */
  pins:               LocationPin[];

  // ── Inhabitants & control ─────────────────────────────────────────────────

  /**
   * IDs of NPCs who are currently based at this Location.
   * Synced from NPC.currentLocationId by the npcs module.
   */
  residentNpcIds:     string[];

  /**
   * ID of the Faction that controls this Location.
   * Null if uncontrolled, contested, or unknown.
   */
  controllingFactionId: string | null;

  /**
   * IDs of all Factions with a notable presence here (includes the controller).
   */
  presentFactionIds:  string[];

  // ── Narrative cross-references ─────────────────────────────────────────────

  /** IDs of Quests that take place at, or are tied to, this Location. */
  questIds:           string[];

  /** IDs of Events that occurred at this Location. */
  eventIds:           string[];

  /** IDs of Sessions that included a scene set here. */
  sessionIds:         string[];

  // ── Asset references ───────────────────────────────────────────────────────

  /**
   * IDs of Map assets that cover this Location.
   * e.g. a city might appear on both a regional map and its own district map.
   */
  mapIds:             string[];

  /**
   * Virtual path to a thumbnail or establishing-shot image.
   * Null if no image is set.
   */
  thumbnailAssetId:   string | null;
}

// ── Map ───────────────────────────────────────────────────────────────────────

/**
 * A map asset displayed in the atlas module.
 *
 * A Map is a visual canvas (image file) with zero or more Location pins placed
 * on it. It belongs to a specific Location in the world hierarchy
 * (e.g. the "Sword Coast" map belongs to the "Faerûn" continent Location).
 */
export interface CampaignMap extends EntityBase, WithDescription, WithTags {
  // ── Canvas source ──────────────────────────────────────────────────────────

  /**
   * Virtual path to the underlying image asset, e.g. `asset://maps/abc123.webp`.
   * Resolved at runtime by the AssetManager.
   */
  imageAssetId:     string;

  /**
   * Natural width of the map image in pixels.
   * Stored so the atlas can calculate pin positions before the image loads.
   */
  widthPx:          number;

  /** Natural height of the map image in pixels. */
  heightPx:         number;

  // ── World placement ────────────────────────────────────────────────────────

  /**
   * ID of the Location this map primarily depicts.
   * e.g. a city map's `subjectLocationId` is the city's Location ID.
   */
  subjectLocationId: string | null;

  /**
   * Map scale descriptor — free text, e.g. `'1 hex = 6 miles'`.
   * No enforced format; displayed as a label in the atlas view.
   */
  scale?:            string;

  // ── Pins ───────────────────────────────────────────────────────────────────

  /**
   * IDs of Locations that have a pin on this map.
   * The pin positions are stored on the Location side (Location.pins),
   * this array is the reverse index for querying "what locations are on map X?".
   */
  pinnedLocationIds: string[];
}
