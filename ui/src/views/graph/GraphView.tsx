import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../../components/ui/Icon';
import { atlas } from '../../bridge/atlas';
import { useCampaignStore } from '../../store/campaign.store';
import styles from './GraphView.module.css';

type GraphNodeType = 'npc' | 'faction' | 'location' | 'quest' | 'session' | 'event' | 'asset' | 'map' | 'plot_thread';
type GraphVisibilityState = 'public' | 'player-known' | 'secret';
type GraphTemporalState = 'active' | 'deteriorating' | 'former-ally' | 'historical';
type GraphStyleType = 'alliance' | 'rivalry' | 'blackmail' | 'espionage' | 'debt' | 'romance' | 'manipulation' | 'loyalty' | 'suspicion' | 'custom';
type ZoomDetailMode = 'minimal' | 'standard' | 'full';
type SemanticMode = 'adaptive' | 'conspiracy';
type LensMode = 'all' | 'political' | 'military' | 'religious' | 'criminal' | 'player' | 'secret';

interface LayoutPosition { x: number; y: number; vx: number; vy: number; pinned: boolean; }

interface EntitySummary {
  id: string;
  type: GraphNodeType;
  name: string;
  subtitle: string;
  status?: string;
  portraitAssetId?: string | null;
  factionId?: string | null;
  tags: string[];
  description?: string;
  raw: Record<string, unknown>;
}

interface NodeOverlay {
  title: string;
  subtitle: string;
  icon: string;
  portraitAssetId: string | null;
  factionId: string | null;
  tags: string[];
  notes: string;
  hiddenNotes: string;
  color: string;
  importance: number;
  visibilityState: GraphVisibilityState;
}

interface GraphNode extends LayoutPosition {
  id: string;
  type: GraphNodeType;
  summary: EntitySummary;
  overlay: NodeOverlay | null;
  displayName: string;
  displaySubtitle: string;
  displayColor: string;
  displayIcon: string;
  displayPortraitAssetId: string | null;
  displayFactionId: string | null;
  displayTags: string[];
  displayNotes: string;
  displayHiddenNotes: string;
  displayImportance: number;
  visibilityState: GraphVisibilityState;
  groupId: string;
}

interface EdgeOverlay {
  styleType: GraphStyleType;
  visibilityState: GraphVisibilityState;
  temporalState: GraphTemporalState;
  colorOverride: string;
  notes: string;
}

interface GraphEdge {
  id: string;
  sourceId: string;
  targetId: string;
  label: string;
  type: string;
  strength: number | null;
  directed: boolean;
  note: string;
  overlay: EdgeOverlay | null;
}

interface RelationshipRow extends Record<string, unknown> {
  id: string;
  source_id: string;
  source_type: GraphNodeType;
  target_id: string;
  target_type: GraphNodeType;
  relationship_type: string;
  label: string;
  strength: number | null;
  directed: number;
  note: string | null;
}

interface NodeOverlayRow extends Record<string, unknown> {
  entity_id: string;
  entity_type: GraphNodeType;
  title: string;
  subtitle: string;
  icon: string;
  portrait_asset_id: string | null;
  faction_id: string | null;
  tags_json: string;
  notes: string;
  hidden_notes: string;
  color: string;
  importance: number;
  visibility_state: GraphVisibilityState;
}

interface EdgeOverlayRow extends Record<string, unknown> {
  relationship_id: string;
  style_type: GraphStyleType;
  visibility_state: GraphVisibilityState;
  temporal_state: GraphTemporalState;
  color_override: string;
  notes: string;
}

interface AssetRow {
  id: string;
  virtual_path: string;
}

const ENTITY_TYPES: GraphNodeType[] = ['npc', 'faction', 'location', 'quest', 'session', 'event', 'asset', 'map', 'plot_thread'];
const ENTITY_TABLES: Record<GraphNodeType, string> = {
  npc: 'npcs',
  faction: 'factions',
  location: 'locations',
  quest: 'quests',
  session: 'sessions',
  event: 'campaign_events',
  asset: 'assets',
  map: 'maps',
  plot_thread: 'plot_threads',
};

const TYPE_COLORS: Record<GraphNodeType, string> = {
  npc: '#d9b15d',
  faction: '#d05a5a',
  location: '#70a8b4',
  quest: '#9f78df',
  session: '#72a26e',
  event: '#d18c54',
  asset: '#a7a0d8',
  map: '#86b8c9',
  plot_thread: '#9ac07b',
};

const TYPE_ICONS: Record<GraphNodeType, string> = {
  npc: 'N',
  faction: 'F',
  location: 'L',
  quest: 'Q',
  session: 'S',
  event: 'E',
  asset: 'A',
  map: 'M',
  plot_thread: 'P',
};

const STYLE_PALETTE: Record<GraphStyleType, { color: string; dash: string; glow: string }> = {
  alliance: { color: '#67c49b', dash: '', glow: '#91f0cb' },
  rivalry: { color: '#ef6f6f', dash: '', glow: '#ff9a9a' },
  blackmail: { color: '#b57cff', dash: '8 5', glow: '#d7b5ff' },
  espionage: { color: '#7d8cff', dash: '3 5', glow: '#a8b0ff' },
  debt: { color: '#ddb45f', dash: '', glow: '#ffdf92' },
  romance: { color: '#e27aa8', dash: '6 4', glow: '#ffadd0' },
  manipulation: { color: '#d98d49', dash: '10 4', glow: '#ffbf8a' },
  loyalty: { color: '#58b9ad', dash: '', glow: '#8beadf' },
  suspicion: { color: '#8e94a3', dash: '4 6', glow: '#c2c8d6' },
  custom: { color: '#c5b08a', dash: '', glow: '#efe0bd' },
};

const DIRECTIONAL_STYLES = new Set<GraphStyleType>(['manipulation', 'espionage', 'blackmail', 'debt', 'romance', 'suspicion']);

const VISIBILITY_ORDER: GraphVisibilityState[] = ['public', 'player-known', 'secret'];
const TEMPORAL_ORDER: GraphTemporalState[] = ['active', 'deteriorating', 'former-ally', 'historical'];
const DETAIL_ORDER: ZoomDetailMode[] = ['minimal', 'standard', 'full'];
const LENS_ORDER: LensMode[] = ['all', 'political', 'military', 'religious', 'criminal', 'player', 'secret'];

const REPULSION = 2900;
const ATTRACTION = 0.018;
const DAMPING = 0.83;
const MIN_DIST = 58;
const PADDING = 34;
const LAYOUT_PERSIST_DEBOUNCE_MS = 750;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function safeJsonArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((entry) => String(entry)).filter(Boolean);
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map((entry) => String(entry)).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function pickString(row: Record<string, unknown>, keys: string[], fallback = ''): string {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return fallback;
}

function pickNullableString(row: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

function normalizeImportance(row: Record<string, unknown>, fallback = 2): number {
  const raw = row.importance ?? row.weight ?? row.strength ?? row.priority;
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (Number.isFinite(n)) return clamp(Math.round(n), 0, 4);
  return fallback;
}

function defaultSubtitle(type: GraphNodeType, row: Record<string, unknown>): string {
  switch (type) {
    case 'npc':
      return [pickString(row, ['alias']), pickString(row, ['role'])].filter(Boolean).join(' • ');
    case 'faction':
      return [pickString(row, ['strength']), pickString(row, ['notes'])].filter(Boolean).join(' • ');
    case 'location':
      return [pickString(row, ['location_type', 'type']), pickString(row, ['region'])].filter(Boolean).join(' • ');
    case 'quest':
      return [pickString(row, ['status']), pickString(row, ['quest_type', 'type'])].filter(Boolean).join(' • ');
    case 'session':
      return [pickString(row, ['session_type', 'status']), pickString(row, ['campaign_date'])].filter(Boolean).join(' • ');
    case 'event':
      return [pickString(row, ['certainty']), pickString(row, ['significance'])].filter(Boolean).join(' • ');
    case 'asset':
      return pickString(row, ['category'], 'asset');
    case 'map':
      return pickString(row, ['description'], 'map');
    case 'plot_thread':
      return [pickString(row, ['status']), pickString(row, ['tag'])].filter(Boolean).join(' • ');
    default:
      return '';
  }
}

function normalizeEntitySummary(type: GraphNodeType, row: Record<string, unknown>): EntitySummary {
  const name = pickString(row, ['name', 'title', 'label'], row.id ? String(row.id).slice(0, 8) : 'Unknown');
  const subtitle = defaultSubtitle(type, row);
  return {
    id: String(row.id),
    type,
    name,
    subtitle,
    status: pickString(row, ['vital_status', 'status', 'active_status']),
    portraitAssetId: pickNullableString(row, ['portrait_asset_id', 'image_asset_id']),
    factionId: pickNullableString(row, ['primary_faction_id', 'faction_id']),
    tags: safeJsonArray(row.tags),
    description: pickString(row, ['description'], ''),
    raw: row,
  };
}

function normalizeNodeOverlay(row: NodeOverlayRow): NodeOverlay {
  return {
    title: row.title ?? '',
    subtitle: row.subtitle ?? '',
    icon: row.icon ?? '',
    portraitAssetId: row.portrait_asset_id ?? null,
    factionId: row.faction_id ?? null,
    tags: safeJsonArray(row.tags_json),
    notes: row.notes ?? '',
    hiddenNotes: row.hidden_notes ?? '',
    color: row.color ?? '',
    importance: clamp(Number(row.importance) || 0, 0, 4),
    visibilityState: row.visibility_state ?? 'public',
  };
}

function normalizeEdgeOverlay(row: EdgeOverlayRow): EdgeOverlay {
  return {
    styleType: row.style_type ?? 'alliance',
    visibilityState: row.visibility_state ?? 'public',
    temporalState: row.temporal_state ?? 'active',
    colorOverride: row.color_override ?? '',
    notes: row.notes ?? '',
  };
}

function styleFromRelationship(row: RelationshipRow): GraphStyleType {
  const type = row.relationship_type;
  if (type in STYLE_PALETTE) return type as GraphStyleType;
  if (type === 'membership' || type === 'leadership') return 'loyalty';
  if (type === 'disposition') {
    if (row.strength !== null && row.strength <= -50) return 'rivalry';
    if (row.strength !== null && row.strength >= 50) return 'alliance';
    return 'suspicion';
  }
  if (row.strength !== null) {
    if (row.strength >= 50) return 'alliance';
    if (row.strength <= -50) return 'rivalry';
    return 'suspicion';
  }
  return 'custom';
}

function relationshipPalette(edge: GraphEdge): { color: string; dash: string; glow: string } {
  const style = edge.overlay?.styleType ?? styleFromRelationship({
    id: edge.id,
    source_id: edge.sourceId,
    source_type: 'npc',
    target_id: edge.targetId,
    target_type: 'npc',
    relationship_type: edge.type,
    label: edge.label,
    strength: edge.strength,
    directed: edge.directed ? 1 : 0,
    note: edge.note,
  });
  const base = STYLE_PALETTE[style];
  if (edge.overlay?.colorOverride) return { ...base, color: edge.overlay.colorOverride };
  return base;
}

function isDirectionalEdge(edge: GraphEdge): boolean {
  const style = edge.overlay?.styleType ?? styleFromRelationship({
    id: edge.id,
    source_id: edge.sourceId,
    source_type: 'npc',
    target_id: edge.targetId,
    target_type: 'npc',
    relationship_type: edge.type,
    label: edge.label,
    strength: edge.strength,
    directed: edge.directed ? 1 : 0,
    note: edge.note,
  });
  return edge.directed || DIRECTIONAL_STYLES.has(style);
}

function formatRelationshipVerb(edge: GraphEdge): string {
  const style = edge.overlay?.styleType ?? styleFromRelationship({
    id: edge.id,
    source_id: edge.sourceId,
    source_type: 'npc',
    target_id: edge.targetId,
    target_type: 'npc',
    relationship_type: edge.type,
    label: edge.label,
    strength: edge.strength,
    directed: edge.directed ? 1 : 0,
    note: edge.note,
  });
  switch (style) {
    case 'manipulation': return 'manipulates';
    case 'espionage': return 'is spying on';
    case 'blackmail': return 'is blackmailing';
    case 'debt': return 'is owing';
    case 'romance': return 'is drawn to';
    case 'rivalry': return 'is opposed to';
    case 'loyalty': return 'is loyal to';
    case 'suspicion': return 'suspects';
    case 'alliance': return 'allies with';
    default:
      return edge.directed ? 'acts upon' : 'is connected to';
  }
}

function describeEdgeIntent(edge: GraphEdge, sourceName: string, targetName: string): string {
  const style = edge.overlay?.styleType ?? styleFromRelationship({
    id: edge.id,
    source_id: edge.sourceId,
    source_type: 'npc',
    target_id: edge.targetId,
    target_type: 'npc',
    relationship_type: edge.type,
    label: edge.label,
    strength: edge.strength,
    directed: edge.directed ? 1 : 0,
    note: edge.note,
  });
  const label = edge.overlay?.notes.trim() || edge.label.trim() || style;
  if (edge.directed || DIRECTIONAL_STYLES.has(style)) {
    return `${sourceName} ${formatRelationshipVerb(edge)} ${targetName}${label ? ` (${label})` : ''}`;
  }
  return `${sourceName} and ${targetName} are linked${label ? ` (${label})` : ''}`;
}

function parseTagsText(value: string): string[] {
  return value.split(',').map((entry) => entry.trim()).filter(Boolean);
}

function isMissingTableError(err: unknown, tableName: string): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return message.includes(`no such table: ${tableName}`);
}

const positionCache = new Map<string, LayoutPosition>();

const GRAPH_NODE_OVERLAY_SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS graph_node_overlays (
    campaign_id       TEXT    NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    entity_id         TEXT    NOT NULL,
    entity_type       TEXT    NOT NULL CHECK (entity_type IN ('npc','faction','location','quest','session','event','plot_thread','asset','map')),
    title             TEXT    NOT NULL DEFAULT '',
    subtitle          TEXT    NOT NULL DEFAULT '',
    icon              TEXT    NOT NULL DEFAULT '',
    portrait_asset_id TEXT    REFERENCES assets(id) ON DELETE SET NULL,
    faction_id        TEXT,
    tags_json         TEXT    NOT NULL DEFAULT '[]',
    notes             TEXT    NOT NULL DEFAULT '',
    hidden_notes      TEXT    NOT NULL DEFAULT '',
    color             TEXT    NOT NULL DEFAULT '',
    importance        INTEGER NOT NULL DEFAULT 2 CHECK (importance >= 0 AND importance <= 4),
    visibility_state  TEXT    NOT NULL DEFAULT 'public' CHECK (visibility_state IN ('public','player-known','secret')),
    created_at        TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at        TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    PRIMARY KEY (campaign_id, entity_id, entity_type)
  );
`;

const GRAPH_RELATIONSHIP_OVERLAY_SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS graph_relationship_overlays (
    campaign_id       TEXT    NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    relationship_id   TEXT    NOT NULL,
    style_type        TEXT    NOT NULL DEFAULT 'alliance'
                           CHECK (style_type IN ('alliance','rivalry','blackmail','espionage','debt','romance','manipulation','loyalty','suspicion','custom')),
    visibility_state  TEXT    NOT NULL DEFAULT 'public'
                           CHECK (visibility_state IN ('public','player-known','secret')),
    temporal_state    TEXT    NOT NULL DEFAULT 'active'
                           CHECK (temporal_state IN ('active','deteriorating','former-ally','historical')),
    color_override    TEXT    NOT NULL DEFAULT '',
    notes             TEXT    NOT NULL DEFAULT '',
    created_at        TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at        TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    PRIMARY KEY (campaign_id, relationship_id)
  );
`;

const GRAPH_NODE_OVERLAY_INDEX_SQL = `
  CREATE INDEX IF NOT EXISTS idx_graph_node_overlays_campaign
    ON graph_node_overlays (campaign_id, entity_type);
`;

const GRAPH_RELATIONSHIP_OVERLAY_INDEX_SQL = `
  CREATE INDEX IF NOT EXISTS idx_graph_relationship_overlays_campaign
    ON graph_relationship_overlays (campaign_id, style_type);
`;

const GRAPH_OVERLAY_SCHEMA_STMTS = [
  GRAPH_NODE_OVERLAY_SCHEMA_SQL,
  GRAPH_RELATIONSHIP_OVERLAY_SCHEMA_SQL,
  GRAPH_NODE_OVERLAY_INDEX_SQL,
  GRAPH_RELATIONSHIP_OVERLAY_INDEX_SQL,
];

function positionCacheKey(campaignId: string, nodeId: string): string {
  return `${campaignId}:${nodeId}`;
}

function getCachedPosition(campaignId: string, nodeId: string): LayoutPosition | undefined {
  return positionCache.get(positionCacheKey(campaignId, nodeId));
}

function setCachedPosition(campaignId: string, nodeId: string, value: LayoutPosition): void {
  positionCache.set(positionCacheKey(campaignId, nodeId), value);
}

function getGroupId(node: GraphNode): string {
  return node.displayFactionId ? `faction:${node.displayFactionId}` : `type:${node.type}`;
}

export default function GraphView() {
  const campaign = useCampaignStore((s) => s.campaign);
  const svgRef = useRef<SVGSVGElement>(null);
  const animRef = useRef<number>(0);
  const simNodes = useRef<GraphNode[]>([]);
  const simEdges = useRef<GraphEdge[]>([]);
  const isPaused = useRef(false);
  const isPanning = useRef(false);
  const dragNodeId = useRef<string | null>(null);
  const panStart = useRef({ x: 0, y: 0, px: 0, py: 0 });
  const persistTimerRef = useRef<number | null>(null);
  const nodeSaveTimerRef = useRef<number | null>(null);
  const edgeSaveTimerRef = useRef<number | null>(null);
  const lastSavedLayoutRef = useRef<string>('');
  const lastSavedNodeProfilesRef = useRef<string>('');
  const lastSavedEdgeProfilesRef = useRef<string>('');

  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [inspectorMode, setInspectorMode] = useState<'node' | 'edges'>('node');
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  const [selectedEdgeLabelDraft, setSelectedEdgeLabelDraft] = useState('');
  const [showLabels, setShowLabels] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [semanticMode, setSemanticMode] = useState<SemanticMode>('adaptive');
  const [detailMode, setDetailMode] = useState<ZoomDetailMode>('standard');
  const [lensMode, setLensMode] = useState<LensMode>('all');
  const [focusMode, setFocusMode] = useState(true);
  const [showSecret, setShowSecret] = useState(true);
  const [showPlayerKnown, setShowPlayerKnown] = useState(true);
  const [showHistorical, setShowHistorical] = useState(true);
  const [showDead, setShowDead] = useState(true);
  const [showInactive, setShowInactive] = useState(true);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [entityLists, setEntityLists] = useState<Record<string, Array<{ id: string; name: string }>>>({});
  const [portraitAssets, setPortraitAssets] = useState<Array<{ id: string; name: string; virtualPath: string }>>([]);
  const [portraitUrls, setPortraitUrls] = useState<Record<string, string>>({});
  const [newSrcType, setNewSrcType] = useState<GraphNodeType>('npc');
  const [newTgtType, setNewTgtType] = useState<GraphNodeType>('npc');
  const [newSrcId, setNewSrcId] = useState('');
  const [newTgtId, setNewTgtId] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newRelationshipStyle, setNewRelationshipStyle] = useState<GraphStyleType>('alliance');
  const [newRelationshipVisibility, setNewRelationshipVisibility] = useState<GraphVisibilityState>('public');
  const [newRelationshipTemporal, setNewRelationshipTemporal] = useState<GraphTemporalState>('active');
  const [newRelationshipStrength, setNewRelationshipStrength] = useState('25');
  const [newRelationshipDirected, setNewRelationshipDirected] = useState(false);
  const [newRelationshipNote, setNewRelationshipNote] = useState('');
  const [selectedNodeDraft, setSelectedNodeDraft] = useState<NodeOverlay>({
    title: '',
    subtitle: '',
    icon: '',
    portraitAssetId: null,
    factionId: null,
    tags: [],
    notes: '',
    hiddenNotes: '',
    color: '',
    importance: 2,
    visibilityState: 'public',
  });
  const [selectedEdgeDraft, setSelectedEdgeDraft] = useState<EdgeOverlay>({
    styleType: 'alliance',
    visibilityState: 'public',
    temporalState: 'active',
    colorOverride: '',
    notes: '',
  });

  const selectedNode = useMemo(() => nodes.find((node) => node.id === selectedNodeId) ?? null, [nodes, selectedNodeId]);
  const selectedEdge = useMemo(() => edges.find((edge) => edge.id === selectedEdgeId) ?? null, [edges, selectedEdgeId]);
  const hoveredEdge = useMemo(() => edges.find((edge) => edge.id === hoveredEdgeId) ?? null, [edges, hoveredEdgeId]);

  useEffect(() => {
    if (DIRECTIONAL_STYLES.has(newRelationshipStyle)) setNewRelationshipDirected(true);
  }, [newRelationshipStyle]);

  const ensureOverlayTables = useCallback(async () => {
    if (!campaign) return;
    try {
      for (const stmt of GRAPH_OVERLAY_SCHEMA_STMTS) {
        await atlas.db.run(stmt);
      }
    } catch {
      // If the database connection is unavailable, the graph should still render read-only.
    }
  }, [campaign]);

  const persistGraphLayout = useCallback(async (force = false) => {
    if (!campaign) return;
    const positions: Record<string, LayoutPosition> = {};
    simNodes.current.forEach((node) => {
      positions[node.id] = { x: node.x, y: node.y, vx: node.vx, vy: node.vy, pinned: node.pinned };
    });
    const layoutJson = JSON.stringify(positions);
    if (!force && layoutJson === lastSavedLayoutRef.current) return;
    const now = new Date().toISOString();
    try {
      await atlas.db.run(
        `INSERT INTO graph_layout_state (campaign_id, positions_json, updated_at)
         VALUES (?, ?, ?)
         ON CONFLICT(campaign_id) DO UPDATE SET
           positions_json = excluded.positions_json,
           updated_at = excluded.updated_at`,
        [campaign.id, layoutJson, now],
      );
      lastSavedLayoutRef.current = layoutJson;
    } catch {
      // Keep the graph usable even if the overlay table has not been created yet.
    }
  }, [campaign]);

  const persistNodeProfiles = useCallback(async (force = false) => {
    if (!campaign) return;
    await ensureOverlayTables();
    const payload = JSON.stringify(nodes.map((node) => ({
      entity_id: node.id,
      entity_type: node.type,
      title: node.overlay?.title ?? '',
      subtitle: node.overlay?.subtitle ?? '',
      icon: node.overlay?.icon ?? '',
      portrait_asset_id: node.overlay?.portraitAssetId ?? null,
      faction_id: node.overlay?.factionId ?? null,
      tags_json: JSON.stringify(node.overlay?.tags ?? []),
      notes: node.overlay?.notes ?? '',
      hidden_notes: node.overlay?.hiddenNotes ?? '',
      color: node.overlay?.color ?? '',
      importance: node.overlay?.importance ?? 2,
      visibility_state: node.overlay?.visibilityState ?? 'public',
    })));
    if (!force && payload === lastSavedNodeProfilesRef.current) return;
    const now = new Date().toISOString();
    try {
      for (const node of nodes) {
        if (!node.overlay) continue;
        await atlas.db.run(
          `INSERT INTO graph_node_overlays
             (campaign_id, entity_id, entity_type, title, subtitle, icon, portrait_asset_id, faction_id, tags_json, notes, hidden_notes, color, importance, visibility_state, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(campaign_id, entity_id, entity_type) DO UPDATE SET
             title = excluded.title,
             subtitle = excluded.subtitle,
             icon = excluded.icon,
             portrait_asset_id = excluded.portrait_asset_id,
             faction_id = excluded.faction_id,
             tags_json = excluded.tags_json,
             notes = excluded.notes,
             hidden_notes = excluded.hidden_notes,
             color = excluded.color,
             importance = excluded.importance,
             visibility_state = excluded.visibility_state,
             updated_at = excluded.updated_at`,
          [
            campaign.id,
            node.id,
            node.type,
            node.overlay.title,
            node.overlay.subtitle,
            node.overlay.icon,
            node.overlay.portraitAssetId,
            node.overlay.factionId,
            JSON.stringify(node.overlay.tags ?? []),
            node.overlay.notes,
            node.overlay.hiddenNotes,
            node.overlay.color,
            node.overlay.importance,
            node.overlay.visibilityState,
            now,
            now,
          ],
        );
      }
      lastSavedNodeProfilesRef.current = payload;
    } catch {
      // Overlay persistence is best-effort.
    }
  }, [campaign, ensureOverlayTables, nodes]);

  const persistEdgeProfiles = useCallback(async (force = false) => {
    if (!campaign) return;
    await ensureOverlayTables();
    const payload = JSON.stringify(edges.map((edge) => ({
      relationship_id: edge.id,
      style_type: edge.overlay?.styleType ?? 'alliance',
      visibility_state: edge.overlay?.visibilityState ?? 'public',
      temporal_state: edge.overlay?.temporalState ?? 'active',
      color_override: edge.overlay?.colorOverride ?? '',
      notes: edge.overlay?.notes ?? '',
    })));
    if (!force && payload === lastSavedEdgeProfilesRef.current) return;
    const now = new Date().toISOString();
    try {
      for (const edge of edges) {
        if (!edge.overlay) continue;
        await atlas.db.run(
          `INSERT INTO graph_relationship_overlays
             (campaign_id, relationship_id, style_type, visibility_state, temporal_state, color_override, notes, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(campaign_id, relationship_id) DO UPDATE SET
             style_type = excluded.style_type,
             visibility_state = excluded.visibility_state,
             temporal_state = excluded.temporal_state,
             color_override = excluded.color_override,
             notes = excluded.notes,
             updated_at = excluded.updated_at`,
          [
            campaign.id,
            edge.id,
            edge.overlay.styleType,
            edge.overlay.visibilityState,
            edge.overlay.temporalState,
            edge.overlay.colorOverride,
            edge.overlay.notes,
            now,
            now,
          ],
        );
      }
      lastSavedEdgeProfilesRef.current = payload;
    } catch {
      // Overlay persistence is best-effort.
    }
  }, [campaign, ensureOverlayTables, edges]);

  const schedulePersistLayout = useCallback(() => {
    if (!campaign || persistTimerRef.current !== null) return;
    persistTimerRef.current = window.setTimeout(() => {
      persistTimerRef.current = null;
      void persistGraphLayout();
    }, LAYOUT_PERSIST_DEBOUNCE_MS);
  }, [campaign, persistGraphLayout]);

  const schedulePersistNodeProfiles = useCallback(() => {
    if (!campaign || nodeSaveTimerRef.current !== null) return;
    nodeSaveTimerRef.current = window.setTimeout(() => {
      nodeSaveTimerRef.current = null;
      void persistNodeProfiles();
    }, 350);
  }, [campaign, persistNodeProfiles]);

  const schedulePersistEdgeProfiles = useCallback(() => {
    if (!campaign || edgeSaveTimerRef.current !== null) return;
    edgeSaveTimerRef.current = window.setTimeout(() => {
      edgeSaveTimerRef.current = null;
      void persistEdgeProfiles();
    }, 350);
  }, [campaign, persistEdgeProfiles]);

  useEffect(() => {
    return () => {
      if (persistTimerRef.current !== null) window.clearTimeout(persistTimerRef.current);
      if (nodeSaveTimerRef.current !== null) window.clearTimeout(nodeSaveTimerRef.current);
      if (edgeSaveTimerRef.current !== null) window.clearTimeout(edgeSaveTimerRef.current);
      void persistGraphLayout(true);
      void persistNodeProfiles(true);
      void persistEdgeProfiles(true);
    };
  }, [persistGraphLayout, persistNodeProfiles, persistEdgeProfiles]);

  const loadEntityList = useCallback(async (type: GraphNodeType) => {
    if (!campaign || entityLists[type]) return;
    try {
      const rows = await atlas.db.query<{ id: string; name: string }>(
        `SELECT id, name FROM ${ENTITY_TABLES[type]} WHERE campaign_id = ? ORDER BY name ASC`,
        [campaign.id],
      );
      setEntityLists((prev) => ({ ...prev, [type]: rows }));
    } catch {
      // Ignore lookup errors for optional editor dropdowns.
    }
  }, [campaign, entityLists]);

  useEffect(() => { void loadEntityList(newSrcType); }, [loadEntityList, newSrcType]);
  useEffect(() => { void loadEntityList(newTgtType); }, [loadEntityList, newTgtType]);

  useEffect(() => {
    if (!campaign) return;
    void (async () => {
      try {
        const rows = await atlas.db.query<{ id: string; name: string; virtual_path: string }>(
          `SELECT id, name, virtual_path FROM assets WHERE campaign_id = ? AND category = 'portraits' ORDER BY name ASC`,
          [campaign.id],
        );
        setPortraitAssets(rows.map((row) => ({ id: row.id, name: row.name, virtualPath: row.virtual_path })));
      } catch {
        setPortraitAssets([]);
      }
    })();
  }, [campaign]);

  const resolvePortraitUrl = useCallback(async (assetId: string | null | undefined) => {
    if (!assetId || portraitUrls[assetId]) return;
    try {
      const rows = await atlas.db.query<AssetRow>('SELECT id, virtual_path FROM assets WHERE id = ?', [assetId]);
      if (!rows[0]) return;
      const url = await atlas.assets.resolve(rows[0].virtual_path);
      if (url) setPortraitUrls((prev) => ({ ...prev, [assetId]: url }));
    } catch {
      // Ignore resolve failures.
    }
  }, [portraitUrls]);

  const loadGraph = useCallback(async () => {
    if (!campaign) return;
    setLoading(true);
    setError(null);
    try {
      await ensureOverlayTables();
      let persistedPositions: Record<string, LayoutPosition> = {};
      try {
        const rows = await atlas.db.query<{ positions_json: string }>(
          'SELECT positions_json FROM graph_layout_state WHERE campaign_id = ? LIMIT 1',
          [campaign.id],
        );
        if (rows[0]?.positions_json) {
          const parsed = JSON.parse(rows[0].positions_json) as Record<string, LayoutPosition>;
          if (parsed && typeof parsed === 'object') persistedPositions = parsed;
        }
      } catch {
        // Layout overlay is optional.
      }

      const relRows = await atlas.db.query<RelationshipRow>(
        'SELECT * FROM entity_relationships WHERE campaign_id = ? ORDER BY created_at DESC LIMIT 1000',
        [campaign.id],
      );
      if (relRows.length === 0) {
        simNodes.current = [];
        simEdges.current = [];
        setNodes([]);
        setEdges([]);
        setLoading(false);
        return;
      }

      const entityMap = new Map<string, { id: string; type: GraphNodeType }>();
      relRows.forEach((row) => {
        entityMap.set(row.source_id, { id: row.source_id, type: row.source_type });
        entityMap.set(row.target_id, { id: row.target_id, type: row.target_type });
      });

      const byType = new Map<GraphNodeType, string[]>();
      entityMap.forEach((entity) => {
        const list = byType.get(entity.type) ?? [];
        list.push(entity.id);
        byType.set(entity.type, list);
      });

      const summaries = new Map<string, EntitySummary>();
      await Promise.all([...byType.entries()].map(async ([type, ids]) => {
        const table = ENTITY_TABLES[type];
        const uniqueIds = [...new Set(ids)];
        if (uniqueIds.length === 0) return;
        try {
          const placeholders = uniqueIds.map(() => '?').join(',');
          const rows = await atlas.db.query<Record<string, unknown>>(
            `SELECT * FROM ${table} WHERE id IN (${placeholders})`,
            uniqueIds,
          );
          rows.forEach((row) => {
            const summary = normalizeEntitySummary(type, row);
            summaries.set(summary.id, summary);
          });
        } catch {
          uniqueIds.forEach((id) => {
            summaries.set(id, {
              id,
              type,
              name: id.slice(0, 8),
              subtitle: '',
              tags: [],
              raw: { id },
            });
          });
        }
      }));

      let overlayRows: NodeOverlayRow[] = [];
      try {
        overlayRows = await atlas.db.query<NodeOverlayRow>(
          'SELECT * FROM graph_node_overlays WHERE campaign_id = ?',
          [campaign.id],
        );
      } catch {
        overlayRows = [];
      }
      const overlayByNode = new Map<string, NodeOverlay>();
      overlayRows.forEach((row) => {
        overlayByNode.set(`${row.entity_type}:${row.entity_id}`, normalizeNodeOverlay(row));
      });

      let edgeOverlayRows: EdgeOverlayRow[] = [];
      try {
        edgeOverlayRows = await atlas.db.query<EdgeOverlayRow>(
          'SELECT * FROM graph_relationship_overlays WHERE campaign_id = ?',
          [campaign.id],
        );
      } catch {
        edgeOverlayRows = [];
      }
      const edgeOverlayById = new Map<string, EdgeOverlay>();
      edgeOverlayRows.forEach((row) => edgeOverlayById.set(row.relationship_id, normalizeEdgeOverlay(row)));

      const orderedEntities = [...entityMap.values()].sort((a, b) => {
        const left = summaries.get(a.id)?.name ?? a.id;
        const right = summaries.get(b.id)?.name ?? b.id;
        return left.localeCompare(right);
      });

      const width = 900;
      const height = 680;
      const count = Math.max(1, orderedEntities.length);

      const newNodes: GraphNode[] = orderedEntities.map((entity, index) => {
        const summary = summaries.get(entity.id) ?? {
          id: entity.id,
          type: entity.type,
          name: entity.id.slice(0, 8),
          subtitle: '',
          tags: [],
          raw: { id: entity.id },
        };
        const overlay = overlayByNode.get(`${entity.type}:${entity.id}`) ?? null;
        const cached = getCachedPosition(campaign.id, entity.id) ?? persistedPositions[entity.id];
        const baseX = width / 2 + Math.cos(index * ((Math.PI * 2) / count)) * 250;
        const baseY = height / 2 + Math.sin(index * ((Math.PI * 2) / count)) * 170;
        const displayName = overlay?.title.trim() || summary.name;
        const displaySubtitle = overlay?.subtitle.trim() || summary.subtitle || '';
        const displayColor = overlay?.color.trim() || TYPE_COLORS[entity.type];
        const displayIcon = overlay?.icon.trim() || TYPE_ICONS[entity.type];
        const displayPortraitAssetId = overlay?.portraitAssetId ?? summary.portraitAssetId ?? null;
        const displayFactionId = overlay?.factionId ?? summary.factionId ?? null;
        const displayTags = [...new Set([...(summary.tags ?? []), ...(overlay?.tags ?? [])])];
        return {
          id: entity.id,
          type: entity.type,
          summary,
          overlay,
          x: cached?.x ?? baseX,
          y: cached?.y ?? baseY,
          vx: cached?.vx ?? 0,
          vy: cached?.vy ?? 0,
          pinned: cached?.pinned ?? false,
          displayName,
          displaySubtitle,
          displayColor,
          displayIcon,
          displayPortraitAssetId,
          displayFactionId,
          displayTags,
          displayNotes: overlay?.notes ?? '',
          displayHiddenNotes: overlay?.hiddenNotes ?? '',
          displayImportance: overlay?.importance ?? normalizeImportance(summary.raw, entity.type === 'faction' ? 3 : entity.type === 'npc' ? 2 : 1),
          visibilityState: overlay?.visibilityState ?? 'public',
          groupId: displayFactionId ? `faction:${displayFactionId}` : `type:${entity.type}`,
        };
      });

      const newEdges: GraphEdge[] = relRows.map((row) => ({
        id: row.id,
        sourceId: row.source_id,
        targetId: row.target_id,
        label: row.label ?? '',
        type: row.relationship_type,
        strength: row.strength,
        directed: row.directed === 1,
        note: row.note ?? '',
        overlay: edgeOverlayById.get(row.id) ?? null,
      }));

      simNodes.current = newNodes;
      simEdges.current = newEdges;
      newNodes.forEach((node) => {
        setCachedPosition(campaign.id, node.id, { x: node.x, y: node.y, vx: node.vx, vy: node.vy, pinned: node.pinned });
      });
      lastSavedLayoutRef.current = JSON.stringify(Object.fromEntries(newNodes.map((node) => [node.id, {
        x: node.x, y: node.y, vx: node.vx, vy: node.vy, pinned: node.pinned,
      }])));
      lastSavedNodeProfilesRef.current = JSON.stringify(newNodes.map((node) => node.overlay ?? null));
      lastSavedEdgeProfilesRef.current = JSON.stringify(newEdges.map((edge) => edge.overlay ?? null));
      setNodes(newNodes);
      setEdges(newEdges);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setNodes([]);
      setEdges([]);
    } finally {
      setLoading(false);
    }
  }, [campaign]);

  useEffect(() => { void loadGraph(); }, [loadGraph]);

  useEffect(() => {
    if (!selectedNode) return;
    setInspectorMode((current) => (current === 'edges' ? current : 'node'));
    setSelectedNodeDraft({
      title: selectedNode.overlay?.title ?? '',
      subtitle: selectedNode.overlay?.subtitle ?? '',
      icon: selectedNode.overlay?.icon ?? '',
      portraitAssetId: selectedNode.overlay?.portraitAssetId ?? null,
      factionId: selectedNode.overlay?.factionId ?? null,
      tags: selectedNode.overlay?.tags ?? [],
      notes: selectedNode.overlay?.notes ?? '',
      hiddenNotes: selectedNode.overlay?.hiddenNotes ?? '',
      color: selectedNode.overlay?.color ?? '',
      importance: selectedNode.overlay?.importance ?? 2,
      visibilityState: selectedNode.overlay?.visibilityState ?? 'public',
    });
    void resolvePortraitUrl(selectedNode.overlay?.portraitAssetId ?? selectedNode.summary.portraitAssetId ?? null);
  }, [selectedNode?.id, resolvePortraitUrl]);

  useEffect(() => {
    if (!selectedEdge) return;
    setInspectorMode('edges');
    setSelectedEdgeLabelDraft(selectedEdge.label ?? '');
    setSelectedEdgeDraft(selectedEdge.overlay ?? {
      styleType: styleFromRelationship({
        id: selectedEdge.id,
        source_id: selectedEdge.sourceId,
        source_type: 'npc',
        target_id: selectedEdge.targetId,
        target_type: 'npc',
        relationship_type: selectedEdge.type,
        label: selectedEdge.label,
        strength: selectedEdge.strength,
        directed: selectedEdge.directed ? 1 : 0,
        note: selectedEdge.note,
      }),
      visibilityState: 'public',
      temporalState: 'active',
      colorOverride: '',
      notes: '',
      });
    }, [selectedEdge?.id]);

  const commitSelectedEdgeLabel = useCallback(async (nextLabel: string) => {
    if (!campaign || !selectedEdge) return;
    const label = nextLabel.trim();
    const updatedEdges = simEdges.current.map((edge) => edge.id === selectedEdge.id ? { ...edge, label } : edge);
    simEdges.current = updatedEdges;
    setEdges(updatedEdges);
    try {
      await atlas.db.run(
        'UPDATE entity_relationships SET label = ?, updated_at = ? WHERE id = ? AND campaign_id = ?',
        [label, new Date().toISOString(), selectedEdge.id, campaign.id],
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [campaign, selectedEdge]);

  useEffect(() => {
    if (simNodes.current.length === 0) return;
    cancelAnimationFrame(animRef.current);
    function tick() {
      if (isPaused.current) {
        animRef.current = requestAnimationFrame(tick);
        return;
      }

      const ns = simNodes.current.map((node) => ({ ...node }));
      const edgeList = simEdges.current;
      const nodeById = new Map(ns.map((node) => [node.id, node]));

      for (let i = 0; i < ns.length; i += 1) {
        for (let j = i + 1; j < ns.length; j += 1) {
          const a = ns[i]!;
          const b = ns[j]!;
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.max(MIN_DIST, Math.sqrt(dx * dx + dy * dy));
          const force = REPULSION / (dist * dist);
          const fx = force * dx / dist;
          const fy = force * dy / dist;
          if (!a.pinned) { a.vx += fx; a.vy += fy; }
          if (!b.pinned) { b.vx -= fx; b.vy -= fy; }
        }
      }

      edgeList.forEach((edge) => {
        const a = nodeById.get(edge.sourceId);
        const b = nodeById.get(edge.targetId);
        if (!a || !b) return;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
        const force = ATTRACTION * dist;
        const fx = force * dx / dist;
        const fy = force * dy / dist;
        if (!a.pinned) { a.vx += fx; a.vy += fy; }
        if (!b.pinned) { b.vx -= fx; b.vy -= fy; }
      });

      ns.forEach((node) => {
        if (!node.pinned) {
          node.vx += (450 - node.x) * 0.0018;
          node.vy += (340 - node.y) * 0.0018;
        }
      });

      ns.forEach((node) => {
        if (!node.pinned) {
          node.vx *= DAMPING;
          node.vy *= DAMPING;
          node.x += node.vx;
          node.y += node.vy;
          node.x = clamp(node.x, PADDING, 900 - PADDING);
          node.y = clamp(node.y, PADDING, 680 - PADDING);
        }
      });

      simNodes.current = ns;
      if (campaign) {
        ns.forEach((node) => {
          setCachedPosition(campaign.id, node.id, { x: node.x, y: node.y, vx: node.vx, vy: node.vy, pinned: node.pinned });
        });
      }
      schedulePersistLayout();
      setNodes(ns);
      animRef.current = requestAnimationFrame(tick);
    }

    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [campaign, edges.length, nodes.length, schedulePersistLayout]);

  const nodeById = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  const relatedIds = useMemo(() => {
    const ids = new Set<string>();
    if (selectedNodeId) {
      ids.add(selectedNodeId);
      edges.forEach((edge) => {
        if (edge.sourceId === selectedNodeId) ids.add(edge.targetId);
        if (edge.targetId === selectedNodeId) ids.add(edge.sourceId);
      });
    } else if (selectedEdge) {
      ids.add(selectedEdge.sourceId);
      ids.add(selectedEdge.targetId);
    }
    return ids;
  }, [edges, selectedEdge, selectedNodeId]);

  const groups = useMemo(() => {
    const grouped = new Map<string, GraphNode[]>();
    nodes.forEach((node) => {
      const groupId = getGroupId(node);
      const list = grouped.get(groupId) ?? [];
      list.push(node);
      grouped.set(groupId, list);
    });
    return [...grouped.entries()].map(([groupId, members]) => {
      const factionId = groupId.startsWith('faction:') ? groupId.slice(8) : null;
      const label = factionId ? (nodeById.get(factionId)?.displayName ?? factionId) : groupId.replace(/^type:/, '');
      return { groupId, label, members, factionId };
    });
  }, [nodeById, nodes]);

  const groupCenters = useMemo(() => {
    const centers = new Map<string, { x: number; y: number }>();
    groups.forEach((group) => {
      const members = group.members.filter((node) => !collapsedGroups.has(group.groupId) || node.id === selectedNodeId);
      if (members.length === 0) return;
      const sum = members.reduce((acc, node) => ({ x: acc.x + node.x, y: acc.y + node.y }), { x: 0, y: 0 });
      centers.set(group.groupId, { x: sum.x / members.length, y: sum.y / members.length });
    });
    return centers;
  }, [collapsedGroups, groups, selectedNodeId]);

  const selectedNodeGroupId = selectedNode ? getGroupId(selectedNode) : null;
  const effectiveCollapsedGroups = useMemo(() => {
    const next = new Set(collapsedGroups);
    if (selectedNodeGroupId && next.has(selectedNodeGroupId)) next.delete(selectedNodeGroupId);
    return next;
  }, [collapsedGroups, selectedNodeGroupId]);

  const visibleNodeIds = useMemo(() => {
    const ids = new Set<string>();
    const zoomDetail = detailMode === 'minimal' ? 0.65 : detailMode === 'standard' ? 0.45 : 0.15;
    const importanceGate = detailMode === 'minimal' ? 3 : detailMode === 'standard' ? 2 : 0;
    nodes.forEach((node) => {
      const groupId = getGroupId(node);
      const visibilityBlocked =
        (node.visibilityState === 'secret' && !showSecret) ||
        (node.visibilityState === 'player-known' && !showPlayerKnown) ||
        (node.type === 'npc' && node.summary.status === 'dead' && !showDead) ||
        (node.type === 'faction' && !showInactive && Number(node.summary.raw.strength ?? 0) <= 0);
      const lensBlocked =
        lensMode === 'secret' ? node.visibilityState === 'public' :
        lensMode === 'player' ? node.visibilityState === 'secret' :
        lensMode === 'political' ? !(node.type === 'faction' || node.displayFactionId || node.summary.raw.role) :
        lensMode === 'military' ? !(node.summary.raw.role || node.summary.raw.disposition_towards_players) :
        lensMode === 'religious' ? !String(node.summary.raw.tags ?? '').includes('faith') :
        lensMode === 'criminal' ? !String(node.summary.raw.tags ?? '').includes('crime') :
        false;
      const detailBlocked = semanticMode === 'adaptive' && zoom < zoomDetail && node.displayImportance < importanceGate;
      const collapsed = effectiveCollapsedGroups.has(groupId) && node.id !== selectedNodeId;
      if (!visibilityBlocked && !lensBlocked && !detailBlocked && !collapsed) ids.add(node.id);
    });
    if (selectedNodeId) ids.add(selectedNodeId);
    if (selectedEdge) {
      ids.add(selectedEdge.sourceId);
      ids.add(selectedEdge.targetId);
    }
    return ids;
  }, [detailMode, effectiveCollapsedGroups, lensMode, nodes, selectedEdge, selectedNodeId, semanticMode, showDead, showInactive, showPlayerKnown, showSecret, zoom]);

  const visibleEdgeIds = useMemo(() => {
    const ids = new Set<string>();
    edges.forEach((edge) => {
      const src = nodeById.get(edge.sourceId);
      const tgt = nodeById.get(edge.targetId);
      if (!src || !tgt) return;
      const blocked =
        (!showSecret && (edge.overlay?.visibilityState === 'secret')) ||
        (!showPlayerKnown && edge.overlay?.visibilityState === 'player-known') ||
        (!showHistorical && edge.overlay?.temporalState === 'historical');
      const lensBlocked =
        lensMode === 'secret' ? edge.overlay?.visibilityState !== 'secret' :
        lensMode === 'player' ? edge.overlay?.visibilityState === 'secret' :
        lensMode === 'political' ? !['alliance', 'rivalry', 'debt', 'manipulation', 'loyalty', 'suspicion'].includes(edge.overlay?.styleType ?? styleFromRelationship({
          id: edge.id,
          source_id: edge.sourceId,
          source_type: 'npc',
          target_id: edge.targetId,
          target_type: 'npc',
          relationship_type: edge.type,
          label: edge.label,
          strength: edge.strength,
          directed: edge.directed ? 1 : 0,
          note: edge.note,
        })) :
        lensMode === 'criminal' ? !['blackmail', 'manipulation', 'suspicion', 'debt'].includes(edge.overlay?.styleType ?? 'custom') :
        false;
      const focusBlocked = focusMode && relatedIds.size > 0 && !relatedIds.has(edge.sourceId) && !relatedIds.has(edge.targetId);
      if (!blocked && !lensBlocked && !focusBlocked) ids.add(edge.id);
    });
    if (selectedEdgeId) ids.add(selectedEdgeId);
    return ids;
  }, [edges, focusMode, lensMode, nodeById, relatedIds, selectedEdgeId, showHistorical, showPlayerKnown, showSecret]);

  const hitZoneTransform = useMemo(() => ({ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: 'top left' }), [pan, zoom]);

  const selectedNodePortraitUrl = selectedNode?.displayPortraitAssetId ? portraitUrls[selectedNode.displayPortraitAssetId] ?? null : null;

  const createRelationship = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    if (!campaign || !newSrcId || !newTgtId) return;
    try {
      await ensureOverlayTables();
      const now = new Date().toISOString();
      const id = crypto.randomUUID();
      await atlas.db.run(
        `INSERT OR IGNORE INTO entity_relationships
           (id, campaign_id, source_id, source_type, target_id, target_type, relationship_type, label, strength, directed, note, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 'custom', ?, ?, ?, ?, ?, ?)`,
        [
          id,
          campaign.id,
          newSrcId,
          newSrcType,
          newTgtId,
          newTgtType,
          newLabel.trim() || 'related',
          Number.isFinite(Number(newRelationshipStrength)) ? clamp(Number(newRelationshipStrength), -100, 100) : null,
          newRelationshipDirected ? 1 : 0,
          newRelationshipNote.trim(),
          now,
          now,
        ],
      );
      await atlas.db.run(
        `INSERT INTO graph_relationship_overlays
           (campaign_id, relationship_id, style_type, visibility_state, temporal_state, color_override, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(campaign_id, relationship_id) DO UPDATE SET
           style_type = excluded.style_type,
           visibility_state = excluded.visibility_state,
           temporal_state = excluded.temporal_state,
           color_override = excluded.color_override,
           notes = excluded.notes,
           updated_at = excluded.updated_at`,
        [campaign.id, id, newRelationshipStyle, newRelationshipVisibility, newRelationshipTemporal, '', '', now, now],
      );
      setShowCreate(false);
      setNewLabel('');
      setNewRelationshipNote('');
      await loadGraph();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [campaign, ensureOverlayTables, loadGraph, newLabel, newRelationshipDirected, newRelationshipNote, newRelationshipStyle, newRelationshipStrength, newRelationshipTemporal, newRelationshipVisibility, newSrcId, newSrcType, newTgtId, newTgtType]);

  const deleteRelationship = useCallback(async (edge: GraphEdge) => {
    if (!campaign) return;
    const sourceName = nodeById.get(edge.sourceId)?.displayName ?? edge.sourceId;
    const targetName = nodeById.get(edge.targetId)?.displayName ?? edge.targetId;
    const label = edge.overlay?.notes.trim() || edge.label.trim() || edge.overlay?.styleType || edge.type;
    if (!window.confirm(`Delete relationship "${label}" between ${sourceName} and ${targetName}? This cannot be undone.`)) return;
    try {
      await ensureOverlayTables();
      const now = new Date().toISOString();
      await atlas.db.run('DELETE FROM entity_relationships WHERE id = ? AND campaign_id = ?', [edge.id, campaign.id]);
      try {
        await atlas.db.run('DELETE FROM graph_relationship_overlays WHERE campaign_id = ? AND relationship_id = ?', [campaign.id, edge.id]);
      } catch (overlayErr) {
        if (!isMissingTableError(overlayErr, 'graph_relationship_overlays')) throw overlayErr;
      }
      const updatedEdges = simEdges.current.filter((item) => item.id !== edge.id);
      simEdges.current = updatedEdges;
      setEdges(updatedEdges);
      setSelectedEdgeId(null);
      setInspectorMode('node');
      void persistEdgeProfiles(true);
      void atlas.db.run('UPDATE graph_layout_state SET updated_at = ? WHERE campaign_id = ?', [now, campaign.id]).catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [campaign, ensureOverlayTables, nodeById, persistEdgeProfiles]);

  function updateNodeDraft(next: Partial<NodeOverlay>): void {
    if (!selectedNode) return;
    setSelectedNodeDraft((prev) => {
      const updated = { ...prev, ...next };
      const mergedNodes = simNodes.current.map((node) => node.id === selectedNode.id ? {
        ...node,
        overlay: updated,
        displayName: updated.title.trim() || node.summary.name,
        displaySubtitle: updated.subtitle.trim() || node.summary.subtitle || '',
        displayColor: updated.color.trim() || TYPE_COLORS[node.type],
        displayIcon: updated.icon.trim() || TYPE_ICONS[node.type],
        displayPortraitAssetId: updated.portraitAssetId ?? node.summary.portraitAssetId ?? null,
        displayFactionId: updated.factionId ?? node.summary.factionId ?? null,
        displayTags: [...new Set([...(node.summary.tags ?? []), ...(updated.tags ?? [])])],
        displayNotes: updated.notes,
        displayHiddenNotes: updated.hiddenNotes,
        displayImportance: updated.importance,
        visibilityState: updated.visibilityState,
        groupId: updated.factionId ? `faction:${updated.factionId}` : `type:${node.type}`,
      } : node);
      simNodes.current = mergedNodes;
      setNodes(mergedNodes);
      schedulePersistNodeProfiles();
      return updated;
    });
  }

  function updateEdgeDraft(next: Partial<EdgeOverlay>): void {
    if (!selectedEdge) return;
    setSelectedEdgeDraft((prev) => {
      const updated = { ...prev, ...next };
      const mergedEdges = simEdges.current.map((edge) => edge.id === selectedEdge.id ? { ...edge, overlay: updated } : edge);
      simEdges.current = mergedEdges;
      setEdges(mergedEdges);
      schedulePersistEdgeProfiles();
      return updated;
    });
  }

  function startNodeDrag(event: React.PointerEvent, nodeId: string): void {
    event.stopPropagation();
    dragNodeId.current = nodeId;
    isPaused.current = true;
    const nextNodes = simNodes.current.map((node) => (node.id === nodeId ? { ...node, pinned: true } : node));
    simNodes.current = nextNodes;
    setNodes(nextNodes);
  }

  function onSvgPointerDown(event: React.PointerEvent<SVGSVGElement>): void {
    if (event.button !== 0 || dragNodeId.current) return;
    if ((event.target as SVGElement).closest('g[data-node], g[data-edge]')) return;
    isPanning.current = true;
    panStart.current = { x: event.clientX, y: event.clientY, px: pan.x, py: pan.y };
  }

  function onSvgPointerMove(event: React.PointerEvent<SVGSVGElement>): void {
    if (dragNodeId.current && svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      const x = (event.clientX - rect.left - pan.x) / zoom;
      const y = (event.clientY - rect.top - pan.y) / zoom;
      const updated = simNodes.current.map((node) => node.id === dragNodeId.current ? { ...node, x, y, vx: 0, vy: 0 } : node);
      simNodes.current = updated;
      setNodes(updated);
      schedulePersistLayout();
    } else if (isPanning.current) {
      setPan({
        x: panStart.current.px + (event.clientX - panStart.current.x),
        y: panStart.current.py + (event.clientY - panStart.current.y),
      });
    }
  }

  function onSvgPointerUp(): void {
    if (dragNodeId.current) {
      const nodeId = dragNodeId.current;
      dragNodeId.current = null;
      simNodes.current = simNodes.current.map((node) => node.id === nodeId ? { ...node, pinned: true } : node);
      setNodes(simNodes.current);
    }
    isPanning.current = false;
    isPaused.current = false;
    void persistGraphLayout(true);
  }

  function onSvgWheel(event: React.WheelEvent<SVGSVGElement>): void {
    event.preventDefault();
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    const factor = event.deltaY < 0 ? 1.08 : 0.92;
    setZoom((current) => {
      const next = clamp(current * factor, 0.18, 4.5);
      setPan((currentPan) => ({
        x: mouseX - (mouseX - currentPan.x) * (next / current),
        y: mouseY - (mouseY - currentPan.y) * (next / current),
      }));
      return next;
    });
  }

  function resetView(): void {
    setPan({ x: 0, y: 0 });
    setZoom(1);
  }

  function focusNode(nodeId: string): void {
    setSelectedNodeId(nodeId);
    setSelectedEdgeId(null);
  }

  function focusEdge(edgeId: string): void {
    setSelectedEdgeId(edgeId);
    setSelectedNodeId(null);
  }

  const visibleNodeList = nodes.filter((node) => visibleNodeIds.has(node.id));
  const visibleEdgeList = edges.filter((edge) => visibleEdgeIds.has(edge.id));

  return (
    <div className={styles.root}>
      <header className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <div>
            <h2 className={styles.title}>Campaign Intelligence Board</h2>
            <div className={styles.countRow}>
              <span className={styles.count}>{nodes.length} entities</span>
              <span className={styles.dot}>•</span>
              <span className={styles.count}>{edges.length} relationships</span>
              <span className={styles.dot}>•</span>
              <span className={styles.count}>{Math.round(zoom * 100)}%</span>
            </div>
          </div>
        </div>
        <div className={styles.toolbarRight}>
          <button className={`${styles.toolBtn} ${semanticMode === 'adaptive' ? styles.toolActive : ''}`} onClick={() => setSemanticMode('adaptive')}>
            Adaptive
          </button>
          <button className={`${styles.toolBtn} ${semanticMode === 'conspiracy' ? styles.toolActive : ''}`} onClick={() => setSemanticMode('conspiracy')}>
            Conspiracy
          </button>
          <select className={styles.inlineSelect} value={detailMode} onChange={(e) => setDetailMode(e.target.value as ZoomDetailMode)}>
            {DETAIL_ORDER.map((mode) => <option key={mode} value={mode}>{mode}</option>)}
          </select>
          <select className={styles.inlineSelect} value={lensMode} onChange={(e) => setLensMode(e.target.value as LensMode)}>
            {LENS_ORDER.map((mode) => <option key={mode} value={mode}>{mode}</option>)}
          </select>
          <button className={`${styles.toolBtn} ${focusMode ? styles.toolActive : ''}`} onClick={() => setFocusMode((v) => !v)}>
            Focus
          </button>
          <button className={`${styles.toolBtn} ${showLabels ? styles.toolActive : ''}`} onClick={() => setShowLabels((v) => !v)}>
            Labels
          </button>
          <button className={`${styles.toolBtn} ${showCreate ? styles.toolActive : ''}`} onClick={() => setShowCreate((v) => !v)}>
            Add Relation
          </button>
          <button className={styles.toolBtn} onClick={resetView}>
            <Icon name="home" size={14} /> Reset
          </button>
          <button className={styles.toolBtn} onClick={() => void loadGraph()}>
            <Icon name="loader" size={14} /> Reload
          </button>
        </div>
      </header>

      <div className={styles.filterBar}>
        {[
          { label: 'Secret', checked: showSecret, onChange: setShowSecret },
          { label: 'Player-known', checked: showPlayerKnown, onChange: setShowPlayerKnown },
          { label: 'Historical', checked: showHistorical, onChange: setShowHistorical },
          { label: 'Dead NPCs', checked: showDead, onChange: setShowDead },
          { label: 'Inactive factions', checked: showInactive, onChange: setShowInactive },
        ].map((item) => (
          <label key={item.label} className={styles.toggleChip}>
            <input type="checkbox" checked={item.checked} onChange={(e) => item.onChange(e.target.checked)} />
            <span>{item.label}</span>
          </label>
        ))}
      </div>

      {error && (
        <div className={styles.errorBar}>
          <Icon name="alert" size={15} /> {error}
        </div>
      )}

      {showCreate && (
        <form className={styles.createForm} onSubmit={createRelationship}>
          <select className={styles.createInput} value={newSrcType} onChange={(e) => { setNewSrcType(e.target.value as GraphNodeType); setNewSrcId(''); }}>
            {ENTITY_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
          <select className={styles.createInput} value={newSrcId} onChange={(e) => setNewSrcId(e.target.value)} required>
            <option value="">From...</option>
            {(entityLists[newSrcType] ?? []).map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
          </select>
          <input className={styles.createInput} placeholder="Relationship label" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} />
          <select className={styles.createInput} value={newTgtType} onChange={(e) => { setNewTgtType(e.target.value as GraphNodeType); setNewTgtId(''); }}>
            {ENTITY_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
          <select className={styles.createInput} value={newTgtId} onChange={(e) => setNewTgtId(e.target.value)} required>
            <option value="">To...</option>
            {(entityLists[newTgtType] ?? []).map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
          </select>
          <select className={styles.createInput} value={newRelationshipStyle} onChange={(e) => setNewRelationshipStyle(e.target.value as GraphStyleType)}>
            {Object.keys(STYLE_PALETTE).map((style) => <option key={style} value={style}>{style}</option>)}
          </select>
          <select className={styles.createInput} value={newRelationshipVisibility} onChange={(e) => setNewRelationshipVisibility(e.target.value as GraphVisibilityState)}>
            {VISIBILITY_ORDER.map((mode) => <option key={mode} value={mode}>{mode}</option>)}
          </select>
          <select className={styles.createInput} value={newRelationshipTemporal} onChange={(e) => setNewRelationshipTemporal(e.target.value as GraphTemporalState)}>
            {TEMPORAL_ORDER.map((mode) => <option key={mode} value={mode}>{mode}</option>)}
          </select>
          <input className={styles.createInput} type="number" min={-100} max={100} value={newRelationshipStrength} onChange={(e) => setNewRelationshipStrength(e.target.value)} />
          <label className={styles.createCheck}>
            <input type="checkbox" checked={newRelationshipDirected} onChange={(e) => setNewRelationshipDirected(e.target.checked)} />
            Directed
          </label>
          <input className={styles.createInputWide} placeholder="Private note" value={newRelationshipNote} onChange={(e) => setNewRelationshipNote(e.target.value)} />
          <button type="submit" className={styles.createBtn}>Add</button>
          <button type="button" className={styles.toolBtn} onClick={() => setShowCreate(false)}>Cancel</button>
        </form>
      )}

      <div className={styles.body}>
        {loading ? (
          <div className={styles.empty}><Icon name="loader" size={36} className={styles.spin} /></div>
        ) : nodes.length === 0 ? (
          <div className={styles.empty}>
            <Icon name="network" size={48} className={styles.emptyIcon} />
            <h3>No relationships yet</h3>
            <p>Add a relation to start building the board, or let campaign data populate it naturally.</p>
          </div>
        ) : (
          <svg
            ref={svgRef}
            className={styles.graph}
            onPointerDown={onSvgPointerDown}
            onPointerMove={onSvgPointerMove}
            onPointerUp={onSvgPointerUp}
            onPointerLeave={onSvgPointerUp}
            onWheel={onSvgWheel}
          >
            <defs>
              <marker id="edgeArrow" viewBox="0 0 10 10" refX="8.8" refY="5" markerWidth="7.5" markerHeight="7.5" orient="auto" markerUnits="strokeWidth">
                <path d="M2 1L8 5L2 9Z" fill="context-stroke" stroke="context-stroke" strokeWidth="0.9" strokeLinejoin="round" />
              </marker>
              <filter id="nodeGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feColorMatrix in="blur" type="matrix" values="1 0 0 0 0.8 0 1 0 0 0.65 0 0 1 0 0.3 0 0 0 0.55 0" />
              </filter>
              <filter id="edgeGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feColorMatrix in="blur" type="matrix" values="1 0 0 0 0.85 0 1 0 0 0.65 0 0 1 0 0.35 0 0 0 0.45 0" />
              </filter>
            </defs>

            <g style={hitZoneTransform}>
              {groups.map((group) => {
                const collapsed = effectiveCollapsedGroups.has(group.groupId);
                if (!collapsed || group.members.length === 0) return null;
                const center = groupCenters.get(group.groupId);
                if (!center) return null;
                const count = group.members.length;
                const radius = 24 + Math.min(50, count * 2.5);
                const label = group.label;
                return (
                  <g key={group.groupId} data-node="1" transform={`translate(${center.x}, ${center.y})`} onClick={() => {
                    setCollapsedGroups((prev) => {
                      const next = new Set(prev);
                      next.delete(group.groupId);
                      return next;
                    });
                  }}>
                    <ellipse rx={radius * 1.55} ry={radius} fill="rgba(170,140,80,0.14)" stroke="rgba(220,180,110,0.5)" strokeWidth={1.3} />
                    <circle r={radius} fill="rgba(42,34,20,0.76)" stroke="rgba(220,180,110,0.72)" strokeWidth={1.5} />
                    <text x={0} y={-4} textAnchor="middle" fill="var(--gold-300)" fontSize={13} style={{ pointerEvents: 'none', fontWeight: 700 }}>
                      {count}
                    </text>
                    <text x={0} y={13} textAnchor="middle" fill="var(--text-secondary)" fontSize={10} style={{ pointerEvents: 'none' }}>
                      {label}
                    </text>
                  </g>
                );
              })}

              {visibleEdgeList.map((edge) => {
                const src = nodeById.get(edge.sourceId);
                const tgt = nodeById.get(edge.targetId);
                if (!src || !tgt) return null;
                const srcCollapsed = effectiveCollapsedGroups.has(src.groupId);
                const tgtCollapsed = effectiveCollapsedGroups.has(tgt.groupId);
                const srcPoint = srcCollapsed ? groupCenters.get(src.groupId) ?? { x: src.x, y: src.y } : { x: src.x, y: src.y };
                const tgtPoint = tgtCollapsed ? groupCenters.get(tgt.groupId) ?? { x: tgt.x, y: tgt.y } : { x: tgt.x, y: tgt.y };
                if (srcCollapsed && tgtCollapsed && src.groupId === tgt.groupId) return null;
                const palette = relationshipPalette(edge);
                const mx = (srcPoint.x + tgtPoint.x) / 2;
                const my = (srcPoint.y + tgtPoint.y) / 2;
                const dx = tgtPoint.x - srcPoint.x;
                const dy = tgtPoint.y - srcPoint.y;
                const length = Math.max(1, Math.sqrt(dx * dx + dy * dy));
                const ux = dx / length;
                const uy = dy / length;
                const selected = edge.id === selectedEdgeId;
                const dimmed = focusMode && relatedIds.size > 0 && !(relatedIds.has(edge.sourceId) || relatedIds.has(edge.targetId));
                const opacity = selected ? 1 : dimmed ? 0.2 : edge.overlay?.visibilityState === 'secret' ? 0.35 : edge.overlay?.visibilityState === 'player-known' ? 0.6 : 0.86;
                const dash = palette.dash;
                const directional = isDirectionalEdge(edge);
                const edgeLabel = edge.overlay?.notes.trim() || edge.label || edge.overlay?.styleType || edge.type;
                const hoverText = describeEdgeIntent(edge, src.displayName, tgt.displayName);
                const tickMid = 0.56;
                const tickLength = Math.min(14, Math.max(8, length * 0.08));
                const tickX = srcPoint.x + dx * tickMid;
                const tickY = srcPoint.y + dy * tickMid;
                const tickX1 = tickX - ux * (tickLength * 0.55);
                const tickY1 = tickY - uy * (tickLength * 0.55);
                const tickX2 = tickX + ux * (tickLength * 0.45);
                const tickY2 = tickY + uy * (tickLength * 0.45);
                return (
                  <g key={edge.id} data-edge="1">
                    <line
                      x1={srcPoint.x}
                      y1={srcPoint.y}
                      x2={tgtPoint.x}
                      y2={tgtPoint.y}
                      stroke={palette.color}
                      strokeOpacity={opacity}
                      strokeWidth={selected ? 3.4 : 2.1}
                      strokeDasharray={dash}
                      markerEnd={directional ? 'url(#edgeArrow)' : undefined}
                      filter="url(#edgeGlow)"
                    />
                    {directional && (
                      <line
                        x1={tickX1}
                        y1={tickY1}
                        x2={tickX2}
                        y2={tickY2}
                        stroke={palette.color}
                        strokeOpacity={Math.min(1, opacity + 0.12)}
                        strokeWidth={selected ? 4 : 3}
                        strokeLinecap="round"
                        filter="url(#edgeGlow)"
                        pointerEvents="none"
                      />
                    )}
                    <line
                      x1={srcPoint.x}
                      y1={srcPoint.y}
                      x2={tgtPoint.x}
                      y2={tgtPoint.y}
                      stroke="transparent"
                      strokeWidth={12}
                      onClick={() => focusEdge(edge.id)}
                      onPointerDown={(event) => event.stopPropagation()}
                      onPointerEnter={() => setHoveredEdgeId(edge.id)}
                      onPointerLeave={() => setHoveredEdgeId((current) => (current === edge.id ? null : current))}
                      style={{ cursor: 'pointer', pointerEvents: 'stroke' }}
                    />
                    <title>{hoverText}</title>
                    {showLabels && zoom > 0.4 && edgeLabel && (
                      <text
                        x={mx}
                        y={my - 10}
                        textAnchor="middle"
                        fill={palette.color}
                        fontSize={11}
                        opacity={opacity}
                        style={{ pointerEvents: 'none', fontWeight: selected ? 700 : 500 }}
                      >
                        {edgeLabel.length > 34 ? `${edgeLabel.slice(0, 33)}...` : edgeLabel}
                      </text>
                    )}
                  </g>
                );
              })}

              {visibleNodeList.map((node) => {
                const selected = node.id === selectedNodeId;
                const related = relatedIds.has(node.id);
                const dimmed = focusMode && relatedIds.size > 0 && !related;
                const zoomFade = semanticMode === 'adaptive'
                  ? clamp((zoom - (detailMode === 'minimal' ? 0.35 : detailMode === 'standard' ? 0.28 : 0.22)) / 0.55, 0.1, 1)
                  : 1;
                const opacity = selected ? 1 : dimmed ? 0.15 : zoomFade;
                const radius = 18 + node.displayImportance * 2.5;
                const labelOpacity = semanticMode === 'conspiracy'
                  ? clamp((zoom - 0.32) / 0.7, 0.15, 1)
                  : detailMode === 'minimal'
                    ? clamp((zoom - 0.6) / 0.8, 0.05, 1)
                    : clamp((zoom - 0.42) / 0.7, 0.1, 1);
                const groupId = getGroupId(node);
                const collapseChip = collapsedGroups.has(groupId) ? 'Expand group' : 'Collapse group';
                return (
                  <g
                    key={node.id}
                    data-node="1"
                    transform={`translate(${node.x}, ${node.y})`}
                    style={{ cursor: 'grab', opacity }}
                    onPointerDown={(event) => startNodeDrag(event, node.id)}
                    onClick={() => {
                      setSelectedEdgeId(null);
                      setSelectedNodeId(node.id);
                    }}
                    onDoubleClick={() => {
                      setCollapsedGroups((prev) => {
                        const next = new Set(prev);
                        if (next.has(groupId)) next.delete(groupId);
                        else next.add(groupId);
                        return next;
                      });
                    }}
                  >
                    <circle r={radius + 6} fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.03)" />
                    <circle r={radius} fill={node.displayColor} fillOpacity={0.88} stroke={selected ? 'var(--gold-300)' : 'rgba(20,16,10,0.75)'} strokeWidth={selected ? 2.5 : 1.4} filter={selected ? 'url(#nodeGlow)' : undefined} />
                    <text x={0} y={2} textAnchor="middle" fill="var(--ink-950)" fontSize={10} style={{ pointerEvents: 'none', fontWeight: 800 }}>
                      {node.displayIcon || TYPE_ICONS[node.type]}
                    </text>
                    {showLabels && labelOpacity > 0.08 && (
                      <>
                        <text x={0} y={radius + 16} textAnchor="middle" fill="var(--text-primary)" fontSize={11} opacity={labelOpacity} style={{ pointerEvents: 'none', fontWeight: 600 }}>
                          {node.displayName.length > 18 ? `${node.displayName.slice(0, 17)}...` : node.displayName}
                        </text>
                        {node.displaySubtitle && zoom > 0.75 && (
                          <text x={0} y={radius + 29} textAnchor="middle" fill="var(--text-secondary)" fontSize={9} opacity={labelOpacity * 0.9} style={{ pointerEvents: 'none' }}>
                            {node.displaySubtitle.length > 20 ? `${node.displaySubtitle.slice(0, 19)}...` : node.displaySubtitle}
                          </text>
                        )}
                      </>
                    )}
                    <title>{collapseChip}</title>
                  </g>
                );
              })}
            </g>
          </svg>
        )}

        {nodes.length > 0 && (
          <div className={styles.legend}>
            {groups.slice(0, 10).map((group) => (
              <button
                key={group.groupId}
                type="button"
                className={`${styles.legendItem} ${collapsedGroups.has(group.groupId) ? styles.legendItemActive : ''}`}
                onClick={() => setCollapsedGroups((prev) => {
                  const next = new Set(prev);
                  if (next.has(group.groupId)) next.delete(group.groupId);
                  else next.add(group.groupId);
                  return next;
                })}
              >
                <span className={styles.legendDot} style={{ background: group.factionId ? 'var(--gold-500)' : TYPE_COLORS[group.members[0]?.type ?? 'npc'] }} />
                <span>{group.label}</span>
                <small>{group.members.length}</small>
              </button>
            ))}
          </div>
        )}

        {nodes.length > 0 && (
          <div className={styles.zoomLabel}>{Math.round(zoom * 100)}%</div>
        )}

        {selectedNode && (
          <aside className={styles.inspector}>
            <div className={styles.inspectorHeader}>
              <div className={styles.inspectorType}>{selectedNode.type}</div>
              <div className={styles.inspectorTitleRow}>
                <div className={styles.avatar}>
                  {selectedNodePortraitUrl ? <img src={selectedNodePortraitUrl} alt={selectedNode.displayName} /> : selectedNode.displayIcon || TYPE_ICONS[selectedNode.type]}
                </div>
                <div className={styles.inspectorTitleWrap}>
                  <h3>{selectedNode.displayName}</h3>
                  {selectedNode.displaySubtitle && <p>{selectedNode.displaySubtitle}</p>}
                </div>
              </div>
            </div>

            <div className={styles.inspectorBody}>
              <div className={styles.inspectorTabs}>
                <button
                  className={`${styles.tabBtn} ${inspectorMode === 'node' ? styles.tabActive : ''}`}
                  onClick={() => {
                    setSelectedEdgeId(null);
                    setInspectorMode('node');
                    setSelectedNodeId(selectedNode.id);
                  }}
                >
                  Node
                </button>
                <button
                  className={`${styles.tabBtn} ${inspectorMode === 'edges' ? styles.tabActive : ''}`}
                  onClick={() => setInspectorMode('edges')}
                >
                  Edges
                </button>
              </div>
              {inspectorMode === 'node' ? (
                <>
                  <label className={styles.field}>Title<input value={selectedNodeDraft.title} onChange={(e) => updateNodeDraft({ title: e.target.value })} /></label>
                  <label className={styles.field}>Subtitle<input value={selectedNodeDraft.subtitle} onChange={(e) => updateNodeDraft({ subtitle: e.target.value })} /></label>
                  <label className={styles.field}>Icon<input value={selectedNodeDraft.icon} onChange={(e) => updateNodeDraft({ icon: e.target.value })} placeholder="N, F, icon name, or glyph" /></label>
                  <label className={styles.field}>
                    Portrait / Avatar
                    <select value={selectedNodeDraft.portraitAssetId ?? ''} onChange={(e) => updateNodeDraft({ portraitAssetId: e.target.value || null })}>
                      <option value="">None</option>
                      {portraitAssets.map((asset) => <option key={asset.id} value={asset.id}>{asset.name}</option>)}
                    </select>
                  </label>
                  <label className={styles.field}>
                    Faction / Group
                    <select value={selectedNodeDraft.factionId ?? ''} onChange={(e) => updateNodeDraft({ factionId: e.target.value || null })}>
                      <option value="">Unassigned</option>
                      {nodes.filter((node) => node.type === 'faction').map((faction) => <option key={faction.id} value={faction.id}>{faction.displayName}</option>)}
                    </select>
                  </label>
                  <label className={styles.field}>Tags<input value={selectedNodeDraft.tags.join(', ')} onChange={(e) => updateNodeDraft({ tags: parseTagsText(e.target.value) })} placeholder="politics, leverage, secret" /></label>
                  <label className={styles.field}>Color<input value={selectedNodeDraft.color} onChange={(e) => updateNodeDraft({ color: e.target.value })} placeholder="#c49c4a" /></label>
                  <label className={styles.field}>
                    Importance
                    <input type="range" min={0} max={4} value={selectedNodeDraft.importance} onChange={(e) => updateNodeDraft({ importance: Number(e.target.value) })} />
                  </label>
                  <label className={styles.field}>
                    Visibility
                    <select value={selectedNodeDraft.visibilityState} onChange={(e) => updateNodeDraft({ visibilityState: e.target.value as GraphVisibilityState })}>
                      {VISIBILITY_ORDER.map((mode) => <option key={mode} value={mode}>{mode}</option>)}
                    </select>
                  </label>
                  <label className={styles.field}>Notes<textarea value={selectedNodeDraft.notes} onChange={(e) => updateNodeDraft({ notes: e.target.value })} rows={4} /></label>
                  <label className={styles.field}>Hidden Info<textarea value={selectedNodeDraft.hiddenNotes} onChange={(e) => updateNodeDraft({ hiddenNotes: e.target.value })} rows={4} /></label>
                </>
              ) : (
                <>
                  <div className={styles.sectionHeader}>Linked Entities</div>
                  <div className={styles.linkList}>
                    {edges.filter((edge) => edge.sourceId === selectedNode.id || edge.targetId === selectedNode.id).map((edge) => {
                      const other = nodeById.get(edge.sourceId === selectedNode.id ? edge.targetId : edge.sourceId);
                      const palette = relationshipPalette(edge);
                      const directional = isDirectionalEdge(edge);
                      const verb = formatRelationshipVerb(edge);
                      return (
                        <button
                          key={edge.id}
                          type="button"
                          className={styles.linkItem}
                          onClick={() => other && focusEdge(edge.id)}
                        >
                          <span className={styles.edgeSwatch} style={{ background: palette.color }} />
                          <span>{edge.overlay?.styleType ?? edge.type}</span>
                          <small>{other?.displayName ?? '?'}</small>
                          {directional && <b className={styles.linkVerb}>{verb}</b>}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </aside>
        )}

        {selectedEdge && (
          <aside className={styles.edgeInspector}>
            <div className={styles.inspectorHeader}>
              <div className={styles.inspectorType}>relationship</div>
              <div className={styles.inspectorTitleRow}>
                <div className={styles.edgeBanner} />
                <div className={styles.inspectorTitleWrap}>
                  <h3>{selectedEdge.label || selectedEdge.overlay?.styleType || selectedEdge.type}</h3>
                  <p>{nodeById.get(selectedEdge.sourceId)?.displayName ?? selectedEdge.sourceId} to {nodeById.get(selectedEdge.targetId)?.displayName ?? selectedEdge.targetId}</p>
                </div>
              </div>
            </div>
            <div className={styles.inspectorBody}>
              <label className={styles.field}>
                Label
                <input
                  value={selectedEdgeLabelDraft}
                  onChange={(e) => setSelectedEdgeLabelDraft(e.target.value)}
                  onBlur={() => {
                    void commitSelectedEdgeLabel(selectedEdgeLabelDraft);
                  }}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter') return;
                    e.preventDefault();
                    void commitSelectedEdgeLabel(selectedEdgeLabelDraft);
                    (e.currentTarget as HTMLInputElement).blur();
                  }}
                />
              </label>
              <label className={styles.field}>
                Type
                <select value={selectedEdgeDraft.styleType} onChange={(e) => updateEdgeDraft({ styleType: e.target.value as GraphStyleType })}>
                  {Object.keys(STYLE_PALETTE).map((style) => <option key={style} value={style}>{style}</option>)}
                </select>
              </label>
              <label className={styles.field}>Strength<input type="range" min={-100} max={100} value={selectedEdge.strength ?? 0} onChange={(e) => {
                const strength = Number(e.target.value);
                const updatedEdges = simEdges.current.map((edge) => edge.id === selectedEdge.id ? { ...edge, strength } : edge);
                simEdges.current = updatedEdges;
                setEdges(updatedEdges);
                void atlas.db.run('UPDATE entity_relationships SET strength = ?, updated_at = ? WHERE id = ? AND campaign_id = ?', [strength, new Date().toISOString(), selectedEdge.id, campaign?.id ?? '']);
              }} /></label>
              <label className={styles.field}>
                Visibility
                <select value={selectedEdgeDraft.visibilityState} onChange={(e) => updateEdgeDraft({ visibilityState: e.target.value as GraphVisibilityState })}>
                  {VISIBILITY_ORDER.map((mode) => <option key={mode} value={mode}>{mode}</option>)}
                </select>
              </label>
              <label className={styles.field}>
                Temporal
                <select value={selectedEdgeDraft.temporalState} onChange={(e) => updateEdgeDraft({ temporalState: e.target.value as GraphTemporalState })}>
                  {TEMPORAL_ORDER.map((mode) => <option key={mode} value={mode}>{mode}</option>)}
                </select>
              </label>
              <label className={styles.field}>Color override<input value={selectedEdgeDraft.colorOverride} onChange={(e) => updateEdgeDraft({ colorOverride: e.target.value })} placeholder="#c49c4a" /></label>
              <label className={styles.field}>Private notes<textarea value={selectedEdgeDraft.notes} onChange={(e) => updateEdgeDraft({ notes: e.target.value })} rows={4} /></label>
              <label className={styles.field}>
                Directed
                <input
                  type="checkbox"
                  checked={selectedEdge.directed}
                  onChange={(e) => {
                    const updatedEdges = simEdges.current.map((edge) => edge.id === selectedEdge.id ? { ...edge, directed: e.target.checked } : edge);
                    simEdges.current = updatedEdges;
                    setEdges(updatedEdges);
                    void atlas.db.run('UPDATE entity_relationships SET directed = ?, updated_at = ? WHERE id = ? AND campaign_id = ?', [e.target.checked ? 1 : 0, new Date().toISOString(), selectedEdge.id, campaign?.id ?? '']);
                  }}
                />
              </label>
              <div className={styles.sectionHeader}>Path State</div>
              <p className={styles.helperText}>{selectedEdge.note || 'No public note saved on this edge yet.'}</p>
              <div className={styles.buttonRow}>
                <button type="button" className={styles.toolBtn} onClick={() => focusNode(selectedEdge.sourceId)}>Source</button>
                <button type="button" className={styles.toolBtn} onClick={() => focusNode(selectedEdge.targetId)}>Target</button>
                <button type="button" className={`${styles.toolBtn} ${styles.dangerBtn}`} onClick={() => void deleteRelationship(selectedEdge)}>Delete</button>
                <button type="button" className={styles.toolBtn} onClick={() => setSelectedEdgeId(null)}>Close</button>
              </div>
            </div>
          </aside>
        )}

        {hoveredEdge && (
          <div
            className={styles.edgeTooltip}
            style={{
              left: `${Math.max(16, Math.min(window.innerWidth - 240, pan.x + ((nodeById.get(hoveredEdge.sourceId)?.x ?? 0) + (nodeById.get(hoveredEdge.targetId)?.x ?? 0)) * 0.5 * zoom))}px`,
              top: `${Math.max(16, Math.min(window.innerHeight - 90, pan.y + ((nodeById.get(hoveredEdge.sourceId)?.y ?? 0) + (nodeById.get(hoveredEdge.targetId)?.y ?? 0)) * 0.5 * zoom - 22))}px`,
            }}
          >
            <strong>{nodeById.get(hoveredEdge.sourceId)?.displayName ?? hoveredEdge.sourceId}</strong>
            <span>{formatRelationshipVerb(hoveredEdge)}</span>
            <strong>{nodeById.get(hoveredEdge.targetId)?.displayName ?? hoveredEdge.targetId}</strong>
            <small>{describeEdgeIntent(hoveredEdge, nodeById.get(hoveredEdge.sourceId)?.displayName ?? hoveredEdge.sourceId, nodeById.get(hoveredEdge.targetId)?.displayName ?? hoveredEdge.targetId)}</small>
          </div>
        )}

        <div className={styles.groupRail}>
          {groups.map((group) => (
            <button
              key={group.groupId}
              type="button"
              className={`${styles.groupChip} ${collapsedGroups.has(group.groupId) ? styles.groupChipActive : ''}`}
              onClick={() => setCollapsedGroups((prev) => {
                const next = new Set(prev);
                if (next.has(group.groupId)) next.delete(group.groupId);
                else next.add(group.groupId);
                return next;
              })}
            >
              <span className={styles.groupSwatch} style={{ background: group.factionId ? 'var(--gold-500)' : TYPE_COLORS[group.members[0]?.type ?? 'npc'] }} />
              <span>{group.label}</span>
              <small>{group.members.length}</small>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
