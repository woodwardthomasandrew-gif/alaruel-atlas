import { useState, useEffect, useCallback, useRef } from 'react';
import { Icon }             from '../../components/ui/Icon';
import { atlas }            from '../../bridge/atlas';
import { useCampaignStore } from '../../store/campaign.store';
import styles               from './GraphView.module.css';

interface Node { id:string; type:string; name:string; x:number; y:number; vx:number; vy:number; pinned:boolean; }
interface Edge { id:string; sourceId:string; targetId:string; label:string; type:string; strength:number|null; }

const TYPE_COLOUR: Record<string,string> = {
  npc:'#e0b060', faction:'#c44040', location:'#4c8fa0',
  quest:'#9060c0', session:'#4c8050', event:'#c08040',
  default:'#888780',
};
const REPULSION  = 2800;
const ATTRACTION = 0.03;
const DAMPING    = 0.82;
const MIN_DIST   = 60;

const ENTITY_TYPES = ['npc', 'faction', 'location', 'quest', 'session', 'event'] as const;
type EntityType = typeof ENTITY_TYPES[number];
const TABLE_FOR_TYPE: Record<EntityType, string> = {
  npc: 'npcs', faction: 'factions', location: 'locations',
  quest: 'quests', session: 'sessions', event: 'campaign_events',
};

// ── Module-level position cache ───────────────────────────────────────────────
// Lives outside the component so it survives navigation (unmount/remount).
// Keyed by node ID → {x, y, vx, vy, pinned}.
// The simulation writes here every tick; loadGraph reads here to restore positions.
const positionCache = new Map<string, {x:number;y:number;vx:number;vy:number;pinned:boolean}>();

export default function GraphView() {
  const campaign = useCampaignStore(s => s.campaign);

  // Render state
  const [nodes,      setNodes]      = useState<Node[]>([]);
  const [edges,      setEdges]      = useState<Edge[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [selected,   setSelected]   = useState<Node|null>(null);
  const [showLabels, setShowLabels] = useState(true);
  const [error,      setError]      = useState<string|null>(null);

  // Pan / zoom
  const [pan,  setPan]  = useState({x:0, y:0});
  const [zoom, setZoom] = useState(1);
  const isPanning  = useRef(false);
  const panStart   = useRef({x:0, y:0, px:0, py:0});

  // Create-relation form
  const [showCreate,  setShowCreate]  = useState(false);
  const [newSrcType,  setNewSrcType]  = useState<EntityType>('npc');
  const [newTgtType,  setNewTgtType]  = useState<EntityType>('npc');
  const [newSrcId,    setNewSrcId]    = useState('');
  const [newTgtId,    setNewTgtId]    = useState('');
  const [newLabel,    setNewLabel]    = useState('');
  const [entityLists, setEntityLists] = useState<Record<string, Array<{id:string;name:string}>>>({});

  // Simulation refs — never read back from React state
  const simNodes = useRef<Node[]>([]);
  const simEdges = useRef<Edge[]>([]);
  const animRef  = useRef<number>(0);
  const svgRef   = useRef<SVGSVGElement>(null);
  const dragNode       = useRef<string|null>(null);
  const isDraggingNode = useRef(false);
  const isPaused       = useRef(false);

  // ── Entity list loader ────────────────────────────────────────────────────
  async function loadEntityList(type: EntityType) {
    if (!campaign || entityLists[type]) return;
    try {
      const rows = await atlas.db.query<{id:string;name:string}>(
        `SELECT id, name FROM ${TABLE_FOR_TYPE[type]} WHERE campaign_id=? ORDER BY name ASC`,
        [campaign.id],
      );
      setEntityLists(prev => ({...prev, [type]: rows}));
    } catch { /* ignore */ }
  }
  useEffect(() => { loadEntityList(newSrcType); }, [newSrcType, campaign]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { loadEntityList(newTgtType); }, [newTgtType, campaign]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Create relationship ───────────────────────────────────────────────────
  async function createRelationship(e: React.FormEvent) {
    e.preventDefault();
    if (!newSrcId || !newTgtId || !campaign) return;
    const id = crypto.randomUUID(), now = new Date().toISOString();
    try {
      await atlas.db.run(
        `INSERT OR IGNORE INTO entity_relationships
           (id,campaign_id,source_id,source_type,target_id,target_type,
            relationship_type,label,directed,created_at,updated_at)
         VALUES (?,?,?,?,?,?,'custom',?,0,?,?)`,
        [id, campaign.id, newSrcId, newSrcType, newTgtId, newTgtType,
         newLabel.trim() || 'related', now, now],
      );
      setNewSrcId(''); setNewTgtId(''); setNewLabel('');
      setShowCreate(false);
      await loadGraph();
    } catch(err) { setError(err instanceof Error ? err.message : String(err)); }
  }

  // ── Load graph ────────────────────────────────────────────────────────────
  const loadGraph = useCallback(async () => {
    if (!campaign) return;
    setLoading(true);
    try {
      type RelRow = Record<string,unknown>;
      const rels = await atlas.db.query<RelRow>(
        'SELECT * FROM entity_relationships WHERE campaign_id=? LIMIT 200',
        [campaign.id],
      );
      if (rels.length === 0) {
        simNodes.current = [];
        simEdges.current = [];
        setNodes([]); setEdges([]); setLoading(false); return;
      }

      const entityMap = new Map<string,{id:string;type:string}>();
      rels.forEach(r => {
        entityMap.set(r['source_id'] as string, {id:r['source_id'] as string, type:r['source_type'] as string});
        entityMap.set(r['target_id'] as string, {id:r['target_id'] as string, type:r['target_type'] as string});
      });

      const nameMap = new Map<string,string>();
      const byType  = new Map<string,string[]>();
      entityMap.forEach(e => { const a = byType.get(e.type) ?? []; a.push(e.id); byType.set(e.type, a); });
      const tableForType: Record<string,string> = {
        npc:'npcs', faction:'factions', location:'locations',
        quest:'quests', session:'sessions', event:'campaign_events',
      };
      await Promise.all([...byType.entries()].map(async ([type, ids]) => {
        const table = tableForType[type];
        if (!table) return;
        const ph   = ids.map(() => '?').join(',');
        const rows = await atlas.db.query<{id:string;name:string}>(
          `SELECT id, name FROM ${table} WHERE id IN (${ph})`, ids,
        );
        rows.forEach(r => nameMap.set(r.id, r.name));
      }));

      const W = 700, H = 500;

      // Restore positions from the module-level cache (survives unmount/remount)
      const newNodes: Node[] = [...entityMap.values()].map((e, i) => {
        const cached = positionCache.get(e.id);
        return {
          id: e.id, type: e.type,
          name: nameMap.get(e.id) ?? e.id.slice(0,8),
          x:      cached ? cached.x      : W/2 + Math.cos(i * 2*Math.PI/entityMap.size) * 180,
          y:      cached ? cached.y      : H/2 + Math.sin(i * 2*Math.PI/entityMap.size) * 140,
          vx:     cached ? cached.vx     : 0,
          vy:     cached ? cached.vy     : 0,
          pinned: cached ? cached.pinned : false,
        };
      });

      const newEdges: Edge[] = rels.map(r => ({
        id:       r['id']                as string,
        sourceId: r['source_id']         as string,
        targetId: r['target_id']         as string,
        label:    (r['label'] ?? '')     as string,
        type:     r['relationship_type'] as string,
        strength: r['strength']          as number|null,
      }));

      // Write into sim ref and position cache before setting React state
      simNodes.current = newNodes;
      simEdges.current = newEdges;
      newNodes.forEach(n => positionCache.set(n.id, {x:n.x, y:n.y, vx:n.vx, vy:n.vy, pinned:n.pinned}));

      setEdges(newEdges);
      setNodes(newNodes);
    } catch(e) { setError(e instanceof Error ? e.message : String(e)); }
    finally    { setLoading(false); }
  }, [campaign]);

  useEffect(() => { loadGraph(); }, [loadGraph]);

  // ── Force simulation ──────────────────────────────────────────────────────
  useEffect(() => {
    if (simNodes.current.length === 0) return;

    cancelAnimationFrame(animRef.current);

    function tick() {
      if (isPaused.current) { animRef.current = requestAnimationFrame(tick); return; }

      const ns       = simNodes.current.map(n => ({...n}));
      const edgeList = simEdges.current;
      const nodeById = new Map(ns.map(n => [n.id, n]));

      // Repulsion
      for (let i = 0; i < ns.length; i++) {
        for (let j = i+1; j < ns.length; j++) {
          const a = ns[i]!, b = ns[j]!;
          const dx = a.x-b.x, dy = a.y-b.y;
          const dist = Math.max(MIN_DIST, Math.sqrt(dx*dx+dy*dy));
          const f = REPULSION/(dist*dist);
          const fx = f*dx/dist, fy = f*dy/dist;
          if (!a.pinned) { a.vx += fx; a.vy += fy; }
          if (!b.pinned) { b.vx -= fx; b.vy -= fy; }
        }
      }
      // Attraction
      edgeList.forEach(e => {
        const a = nodeById.get(e.sourceId), b = nodeById.get(e.targetId);
        if (!a || !b) return;
        const dx = b.x-a.x, dy = b.y-a.y;
        const dist = Math.sqrt(dx*dx+dy*dy);
        if (dist === 0) return;
        const f = ATTRACTION * dist;
        const fx = f*dx/dist, fy = f*dy/dist;
        if (!a.pinned) { a.vx += fx; a.vy += fy; }
        if (!b.pinned) { b.vx -= fx; b.vy -= fy; }
      });
      // Center gravity
      ns.forEach(n => {
        if (!n.pinned) { n.vx += (350-n.x)*0.004; n.vy += (260-n.y)*0.004; }
      });
      // Integrate
      ns.forEach(n => {
        if (!n.pinned) {
          n.vx *= DAMPING; n.vy *= DAMPING;
          n.x += n.vx;    n.y += n.vy;
          n.x = Math.max(30, Math.min(670, n.x));
          n.y = Math.max(30, Math.min(490, n.y));
        }
      });

      // Write back to sim ref AND module-level cache
      simNodes.current = ns;
      ns.forEach(n => positionCache.set(n.id, {x:n.x, y:n.y, vx:n.vx, vy:n.vy, pinned:n.pinned}));

      setNodes([...ns]);
      animRef.current = requestAnimationFrame(tick);
    }

    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [edges.length, nodes.length]);

  // ── Node drag ─────────────────────────────────────────────────────────────
  function startDrag(e: React.MouseEvent, nodeId: string) {
    e.stopPropagation();
    dragNode.current       = nodeId;
    isDraggingNode.current = true;
    isPaused.current       = true;
    simNodes.current = simNodes.current.map(n => n.id===nodeId ? {...n, pinned:true} : n);
    setNodes([...simNodes.current]);
  }

  // ── SVG pan ───────────────────────────────────────────────────────────────
  function onSvgMouseDown(e: React.MouseEvent<SVGSVGElement>) {
    if (e.button !== 0 || isDraggingNode.current) return;
    if ((e.target as SVGElement).closest('g[data-node]')) return;
    isPanning.current = true;
    panStart.current  = {x: e.clientX, y: e.clientY, px: pan.x, py: pan.y};
  }

  function onSvgMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    if (dragNode.current && svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left - pan.x) / zoom;
      const y = (e.clientY - rect.top  - pan.y) / zoom;
      simNodes.current = simNodes.current.map(n =>
        n.id===dragNode.current ? {...n, x, y, vx:0, vy:0} : n,
      );
      setNodes([...simNodes.current]);
    } else if (isPanning.current) {
      setPan({
        x: panStart.current.px + (e.clientX - panStart.current.x),
        y: panStart.current.py + (e.clientY - panStart.current.y),
      });
    }
  }

  function onSvgMouseUp() {
    dragNode.current       = null;
    isDraggingNode.current = false;
    isPanning.current      = false;
    isPaused.current       = false;
  }

  function onSvgWheel(e: React.WheelEvent<SVGSVGElement>) {
    e.preventDefault();
    const svg = svgRef.current;
    if (!svg) return;
    const rect   = svg.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? 1.12 : 0.89;
    setZoom(z => {
      const nz = Math.min(4, Math.max(0.2, z * factor));
      setPan(p => ({
        x: mouseX - (mouseX - p.x) * (nz / z),
        y: mouseY - (mouseY - p.y) * (nz / z),
      }));
      return nz;
    });
  }

  const nodeById = new Map(nodes.map(n => [n.id, n]));

  return (
    <div className={styles.root}>
      <header className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <h2 className={styles.title}>Relationship Graph</h2>
          <span className={styles.count}>{nodes.length} entities · {edges.length} relations</span>
        </div>
        <div className={styles.toolbarRight}>
          <button className={`${styles.toolBtn} ${showLabels?styles.toolActive:''}`}
            onClick={() => setShowLabels(v=>!v)}>
            <Icon name="eye" size={14}/> Labels
          </button>
          <button className={`${styles.toolBtn} ${showCreate?styles.toolActive:''}`}
            onClick={() => setShowCreate(v=>!v)}>
            <Icon name="plus" size={14}/> Add Relation
          </button>
          <button className={styles.toolBtn}
            onClick={() => { setPan({x:0,y:0}); setZoom(1); }}
            title="Reset view">
            <Icon name="home" size={14}/> Reset View
          </button>
          <button className={styles.toolBtn} onClick={loadGraph}>
            <Icon name="loader" size={14}/> Reload
          </button>
        </div>
      </header>

      {error && <div className={styles.errorBar}><Icon name="alert" size={15}/> {error}</div>}

      {showCreate && (
        <form className={styles.createForm} onSubmit={createRelationship}>
          <select className={styles.createInput} value={newSrcType}
            onChange={e => { setNewSrcType(e.target.value as EntityType); setNewSrcId(''); }}>
            {ENTITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select className={styles.createInput} value={newSrcId}
            onChange={e => setNewSrcId(e.target.value)} required>
            <option value="">From…</option>
            {(entityLists[newSrcType] ?? []).map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
          </select>

          <input className={styles.createInput} placeholder="Relationship label…"
            value={newLabel} onChange={e => setNewLabel(e.target.value)}/>

          <select className={styles.createInput} value={newTgtType}
            onChange={e => { setNewTgtType(e.target.value as EntityType); setNewTgtId(''); }}>
            {ENTITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select className={styles.createInput} value={newTgtId}
            onChange={e => setNewTgtId(e.target.value)} required>
            <option value="">To…</option>
            {(entityLists[newTgtType] ?? []).map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
          </select>

          <button type="submit" className={styles.createBtn}>Add</button>
          <button type="button" className={styles.toolBtn}
            onClick={() => setShowCreate(false)}>Cancel</button>
        </form>
      )}

      <div className={styles.body}>
        {loading ? (
          <div className={styles.empty}><Icon name="loader" size={32} className={styles.spin}/></div>
        ) : nodes.length === 0 ? (
          <div className={styles.empty}>
            <Icon name="network" size={48} className={styles.emptyIcon}/>
            <h3>No relationships yet</h3>
            <p>Use <strong>Add Relation</strong> to link NPCs, factions, locations, quests, sessions, or events.</p>
            <p className={styles.hint}>Relationships also appear automatically as the campaign develops.</p>
          </div>
        ) : (
          <svg ref={svgRef} className={styles.graph}
            onMouseDown={onSvgMouseDown}
            onMouseMove={onSvgMouseMove}
            onMouseUp={onSvgMouseUp}
            onMouseLeave={onSvgMouseUp}
            onWheel={onSvgWheel}
            style={{cursor: isPanning.current ? 'grabbing' : 'grab'}}
          >
            <defs>
              <marker id="arr" viewBox="0 0 10 10" refX="18" refY="5"
                markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M2 1L8 5L2 9" fill="none" stroke="var(--ink-600)" strokeWidth="1.5"
                  strokeLinecap="round" strokeLinejoin="round"/>
              </marker>
            </defs>

            <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
              {edges.map(e => {
                const src = nodeById.get(e.sourceId), tgt = nodeById.get(e.targetId);
                if (!src || !tgt) return null;
                const mx = (src.x+tgt.x)/2, my = (src.y+tgt.y)/2;
                return (
                  <g key={e.id}>
                    <line x1={src.x} y1={src.y} x2={tgt.x} y2={tgt.y}
                      stroke="var(--ink-700)" strokeWidth={1.5/zoom}
                      markerEnd="url(#arr)" opacity={0.7}/>
                    {showLabels && e.label && (
                      <text x={mx} y={my-5/zoom} fontSize={9/zoom} fill="var(--ink-500)"
                        textAnchor="middle" dominantBaseline="auto"
                        style={{pointerEvents:'none'}}>
                        {e.label}
                      </text>
                    )}
                  </g>
                );
              })}

              {nodes.map(n => {
                const col = TYPE_COLOUR[n.type] ?? TYPE_COLOUR['default'];
                const isSelected = selected?.id === n.id;
                return (
                  <g key={n.id} data-node="1" style={{cursor:'grab'}}
                    onMouseDown={e => startDrag(e, n.id)}
                    onClick={() => setSelected(s => s?.id===n.id ? null : n)}>
                    <circle cx={n.x} cy={n.y} r={(isSelected?18:14)/zoom}
                      fill={col} fillOpacity={0.85}
                      stroke={isSelected?'var(--gold-300)':'var(--bg-base)'}
                      strokeWidth={(isSelected?2.5:1.5)/zoom}/>
                    <text x={n.x} y={n.y} fontSize={8/zoom} fill="var(--bg-base)"
                      textAnchor="middle" dominantBaseline="central"
                      style={{pointerEvents:'none',fontWeight:600}}>
                      {n.type.slice(0,1).toUpperCase()}
                    </text>
                    {showLabels && (
                      <text x={n.x} y={n.y+22/zoom} fontSize={10/zoom} fill="var(--text-secondary)"
                        textAnchor="middle" dominantBaseline="hanging"
                        style={{pointerEvents:'none'}}>
                        {n.name.length > 14 ? n.name.slice(0,13)+'…' : n.name}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          </svg>
        )}

        {nodes.length > 0 && (
          <div className={styles.zoomLabel}>{Math.round(zoom*100)}%</div>
        )}

        {nodes.length > 0 && (
          <div className={styles.legend}>
            {Object.entries(TYPE_COLOUR).filter(([k]) => k!=='default').map(([type,col]) => (
              <div key={type} className={styles.legendItem}>
                <span className={styles.legendDot} style={{background:col}}/>
                <span>{type}</span>
              </div>
            ))}
          </div>
        )}

        {selected && (
          <div className={styles.selectedPanel}>
            <div className={styles.selectedType}>{selected.type}</div>
            <div className={styles.selectedName}>{selected.name}</div>
            <div className={styles.selectedEdges}>
              {edges.filter(e => e.sourceId===selected.id || e.targetId===selected.id).map(e => {
                const other = nodeById.get(e.sourceId===selected.id ? e.targetId : e.sourceId);
                const dir   = e.sourceId===selected.id ? '→' : '←';
                return (
                  <div key={e.id} className={styles.edgeRow}>
                    <span className={styles.edgeDir}>{dir}</span>
                    <span className={styles.edgeLabel}>{e.label || e.type}</span>
                    <span className={styles.edgeName}>{other?.name ?? '?'}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
