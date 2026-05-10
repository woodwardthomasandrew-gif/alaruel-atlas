// ─────────────────────────────────────────────────────────────────────────────
// shared/types/relationships.ts
//
// Cross-entity relationship types used by the graph module and the UI.
//
// Every entity-to-entity reference in the system uses string IDs, not
// embedded objects. This file provides typed structures for working with
// those references at the graph/display layer — without coupling modules.
// ─────────────────────────────────────────────────────────────────────────────

// ── Entity discriminator ──────────────────────────────────────────────────────

/**
 * All entity types that can appear as nodes in the relationship graph.
 * Must be kept in sync with the entity types defined across this directory.
 */
export type EntityType =
  | 'npc'
  | 'faction'
  | 'location'
  | 'quest'
  | 'session'
  | 'event'
  | 'asset'
  | 'map'
  | 'plot_thread';

// ── Entity reference ──────────────────────────────────────────────────────────

/**
 * A typed reference to any entity in the system.
 * Used wherever a pointer to "some entity" is needed without knowing its type
 * at compile time.
 *
 * @example
 * // NPC's involvement in a quest
 * const ref: EntityRef = { id: 'npc-42', type: 'npc', name: 'Elara' };
 */
export interface EntityRef {
  id:   string;
  type: EntityType;
  /** Cached display name. Avoids a DB lookup just to render a label. */
  name: string;
}

// ── Graph node ────────────────────────────────────────────────────────────────

/**
 * A node in the narrative relationship graph.
 * Wraps an EntityRef with layout and display metadata.
 */
export interface GraphNode {
  /** The underlying entity. */
  entity:    EntityRef;
  /**
   * Visual group for clustering.
   * The graph module assigns this based on the entity type and plot thread.
   */
  group?:    string;
  /**
   * Relative visual weight (controls node size in force-directed layouts).
   * Derived from the number of connections.
   */
  weight:    number;
  /**
   * Whether this node is pinned (does not move during graph layout).
   */
  pinned:    boolean;
}

// ── Graph edge ────────────────────────────────────────────────────────────────

/**
 * An edge between two nodes in the relationship graph.
 */
export interface GraphEdge {
  id:          string;
  sourceId:    string;
  targetId:    string;
  /**
   * Human-readable label describing the relationship.
   * e.g. `'quest giver'`, `'allied with'`, `'located in'`, `'participated in'`
   */
  label:       string;
  /**
   * The kind of relationship this edge represents.
   * Used to colour and filter edges in the graph view.
   */
  edgeType:    EdgeType;
  /**
   * Numeric strength: -100 (hostile) to +100 (strongly allied).
   * Null for non-disposition edges (e.g. location links).
   */
  strength?:   number;
  /** Whether the relationship is bidirectional or one-directional. */
  directed:    boolean;
  /** Optional UI overlay values used by the graph intelligence board. */
  styleType?:       GraphRelationshipStyle;
  visibilityState?: GraphVisibilityState;
  temporalState?:   GraphTemporalState;
  colorOverride?:   string;
  note?:            string;
}

export type GraphRelationshipStyle =
  | 'alliance'
  | 'rivalry'
  | 'blackmail'
  | 'espionage'
  | 'debt'
  | 'romance'
  | 'manipulation'
  | 'loyalty'
  | 'suspicion'
  | 'custom';

export type GraphVisibilityState = 'public' | 'player-known' | 'secret';
export type GraphTemporalState = 'active' | 'deteriorating' | 'former-ally' | 'historical';

/**
 * Semantic categories for graph edges.
 * The graph module uses this for colour-coding and filtering.
 */
export type EdgeType =
  | 'disposition'    // NPC ↔ NPC or NPC ↔ Faction relationship
  | 'membership'     // NPC → Faction
  | 'leadership'     // NPC → Faction (leads)
  | 'location_link'  // Entity → Location
  | 'quest_link'     // Entity → Quest
  | 'plot_link'      // Entity → PlotThread
  | 'causality'      // CampaignEvent → CampaignEvent
  | 'asset_link'     // Asset → Entity
  | 'session_link'   // Entity → Session
  | 'custom';        // User-defined

// ── Relationship query helpers ────────────────────────────────────────────────

/**
 * The complete graph data for a single entity: its direct neighbours and the
 * edges connecting them. Used to render the neighbourhood view.
 */
export interface EntityNeighbourhood {
  /** The focal entity. */
  focus:     EntityRef;
  /** Direct neighbours reachable by one edge. */
  nodes:     GraphNode[];
  /** All edges between focus and its neighbours. */
  edges:     GraphEdge[];
}

/**
 * Parameters for querying the relationship graph.
 * Used by the graph module to build filtered graph views.
 */
export interface GraphQuery {
  /** Only include nodes of these entity types. */
  entityTypes?:  EntityType[];
  /** Only include edges of these types. */
  edgeTypes?:    EdgeType[];
  /**
   * Maximum number of hops from a focal node.
   * 1 = direct neighbours only, 2 = neighbours of neighbours, etc.
   * @default 1
   */
  depth?:        number;
  /** Filter to entities within a specific PlotThread. */
  plotThreadId?: string;
  /** Filter to entities relevant to a specific Session. */
  sessionId?:    string;
}
