import { useState, useEffect, useCallback, useRef } from 'react';
import { Icon }             from '../../components/ui/Icon';
import { atlas }            from '../../bridge/atlas';
import { useCampaignStore } from '../../store/campaign.store';
import type { Location, CampaignMap, LocationPin } from '../../types/location';
import styles               from './AtlasView.module.css';

const TYPE_COLOUR: Record<string,string> = {
  city:'#e0b060', town:'#c49040', village:'#a07030', dungeon:'#c44040',
  nation:'#6090c0', region:'#5070a0', landmark:'#60a080', building:'#8080a0',
  default:'#888780',
};

type Tool = 'select' | 'pin';

interface Asset { id: string; name: string; virtualPath: string; widthPx: number|null; heightPx: number|null; }

export default function AtlasView() {
  const campaign = useCampaignStore(s => s.campaign);
  const [locations,    setLocations]    = useState<Location[]>([]);
  const [maps,         setMaps]         = useState<CampaignMap[]>([]);
  const [activeMap,    setActiveMap]    = useState<CampaignMap|null>(null);
  const [pins,         setPins]         = useState<LocationPin[]>([]);
  const [tool,         setTool]         = useState<Tool>('select');
  const [selected,     setSelected]     = useState<Location|null>(null);
  const [viewport,     setViewport]     = useState({zoom:1, px:0, py:0});
  const zoom = viewport.zoom;
  const pan  = {x: viewport.px, y: viewport.py};
  const [dragging,     setDragging]     = useState(false);
  const [dragStart,    setDragStart]    = useState({x:0,y:0,px:0,py:0});
  const [showSidebar,  setShowSidebar]  = useState(true);
  const [newLocName,   setNewLocName]   = useState('');
  const [newLocType,   setNewLocType]   = useState('city');
  const [error,        setError]        = useState<string|null>(null);

  // Create-map form state
  const [showCreateMap, setShowCreateMap] = useState(false);
  const [mapAssets,     setMapAssets]     = useState<Asset[]>([]);
  const [mapForm,       setMapForm]       = useState({ name: '', imageAssetId: '', widthPx: '1200', heightPx: '900', scale: '' });
  const [mapSaving,     setMapSaving]     = useState(false);

  // Edit-map form state (for changing the image attached to an existing map)
  const [showEditMap,   setShowEditMap]   = useState(false);
  const [editForm,      setEditForm]      = useState({ imageAssetId: '', widthPx: '1200', heightPx: '900', scale: '' });
  const [editSaving,    setEditSaving]    = useState(false);

  // Resolved image URLs for the SVG canvas and thumbnails (assetId → resolved URL)
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});

  const svgRef = useRef<SVGSVGElement>(null);
  const dragMoved = useRef(false);

  type RawLoc   = Record<string,unknown>;
  type RawMap   = Record<string,unknown>;
  type RawPin   = Record<string,unknown>;
  type RawAsset = Record<string,unknown>;

  const loadAll = useCallback(async () => {
    if (!campaign) return;
    try {
      const [lrows, mrows] = await Promise.all([
        atlas.db.query<RawLoc>('SELECT * FROM locations WHERE campaign_id=? ORDER BY name ASC', [campaign.id]),
        atlas.db.query<RawMap>('SELECT * FROM maps WHERE campaign_id=? ORDER BY name ASC', [campaign.id]),
      ]);
      setLocations(lrows.map(r => ({
        id:r['id'] as string, name:r['name'] as string,
        description:r['description'] as string ?? '',
        locationType: r['location_type'] as Location['locationType'],
        status: r['status'] as string ?? 'active',
        parentLocationId: r['parent_location_id'] as string|null,
        childLocationIds: [], controllingFactionId: r['controlling_faction_id'] as string|null,
        thumbnailAssetId: r['thumbnail_asset_id'] as string|null,
        tags: JSON.parse(r['tags'] as string ?? '[]') as string[],
        createdAt:r['created_at'] as string, updatedAt:r['updated_at'] as string,
      })));
      const newMaps = mrows.map(r => ({
        id:r['id'] as string, name:r['name'] as string,
        description:r['description'] as string ?? '',
        imageAssetId:r['image_asset_id'] as string|null,
        widthPx:r['width_px'] as number ?? 800,
        heightPx:r['height_px'] as number ?? 600,
        subjectLocationId: r['subject_location_id'] as string|null,
        scale: r['scale'] as string|null,
        tags: JSON.parse(r['tags'] as string ?? '[]') as string[],
        createdAt:r['created_at'] as string, updatedAt:r['updated_at'] as string,
      }));
      setMaps(newMaps);
      // Pre-resolve thumbnail URLs for all maps that have an image asset
      for (const m of newMaps) {
        if (m.imageAssetId) {
          resolveAssetUrl(m.imageAssetId);
        }
      }
    } catch(e) { setError(e instanceof Error ? e.message : String(e)); }
  }, [campaign]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadAll(); }, [loadAll]);

  // Load map-category assets for the asset picker
  async function loadMapAssets() {
    if (!campaign) return;
    try {
      const rows = await atlas.db.query<RawAsset>(
        "SELECT id, name, virtual_path, width_px, height_px FROM assets WHERE campaign_id=? AND category='maps' ORDER BY name ASC",
        [campaign.id],
      );
      setMapAssets(rows.map(r => ({
        id:          r['id']           as string,
        name:        r['name']         as string,
        virtualPath: r['virtual_path'] as string,
        widthPx:     r['width_px']     as number|null,
        heightPx:    r['height_px']    as number|null,
      })));
    } catch { /* ignore */ }
  }

  // Resolve a virtualPath to an atlas:// URL via the IPC bridge
  async function resolveImageUrl(virtualPath: string): Promise<string|null> {
    try {
      console.log('[DEBUG] resolveImageUrl called with:', virtualPath);
      const url = await atlas.assets.resolve(virtualPath);
      console.log('[DEBUG] resolveImageUrl got back:', url);
      return url ?? null;
    } catch (e) {
      console.error('[DEBUG] resolveImageUrl threw:', e);
      return null;
    }
  }

  // Resolve by asset ID (looks up virtual_path, then resolves to URL). Caches result.
  async function resolveAssetUrl(assetId: string): Promise<string|null> {
    if (imageUrls[assetId]) return imageUrls[assetId];
    try {
      const asset = await atlas.db.query<RawAsset>(
        'SELECT virtual_path FROM assets WHERE id=?', [assetId],
      );
      if (!asset[0]) return null;
      const vp = asset[0]['virtual_path'] as string;
      const url = await resolveImageUrl(vp);
      if (url) setImageUrls(prev => ({ ...prev, [assetId]: url }));
      return url;
    } catch { return null; }
  }

  async function loadPins(mapId: string) {
    const rows = await atlas.db.query<RawPin>(
      'SELECT * FROM location_pins WHERE map_id=?', [mapId],
    );
    setPins(rows.map(r => ({
      id:r['id'] as string, mapId:r['map_id'] as string,
      locationId:r['location_id'] as string,
      posX:r['pos_x'] as number, posY:r['pos_y'] as number,
      label:r['label'] as string|null,
    })));
  }

  async function selectMap(m: CampaignMap) {
    setActiveMap(m);
    await loadPins(m.id);
    setViewport({zoom:1, px:0, py:0});
    if (m.imageAssetId) await resolveAssetUrl(m.imageAssetId);
  }

  async function createLocation() {
    if (!newLocName.trim() || !campaign) return;
    const id = crypto.randomUUID(), now = new Date().toISOString();
    await atlas.db.run(
      `INSERT INTO locations (id,campaign_id,name,description,location_type,tags,created_at,updated_at)
       VALUES (?,?,?,?,?,'[]',?,?)`,
      [id, campaign.id, newLocName.trim(), '', newLocType, now, now],
    );
    setNewLocName('');
    await loadAll();
  }

  async function openCreateMap() {
    await loadMapAssets();
    setMapForm({ name: '', imageAssetId: '', widthPx: '1200', heightPx: '900', scale: '' });
    setShowCreateMap(true);
  }

  async function handleCreateMap() {
    if (!mapForm.name.trim() || !campaign) return;
    setMapSaving(true);
    setError(null);
    try {
      const id = crypto.randomUUID(), now = new Date().toISOString();
      let w = parseInt(mapForm.widthPx)  || 1200;
      let h = parseInt(mapForm.heightPx) || 900;
      if (mapForm.imageAssetId) {
        const chosen = mapAssets.find(a => a.id === mapForm.imageAssetId);
        if (chosen?.widthPx)  w = chosen.widthPx;
        if (chosen?.heightPx) h = chosen.heightPx;
      }
      await atlas.db.run(
        `INSERT INTO maps (id,campaign_id,name,description,image_asset_id,width_px,height_px,scale,tags,created_at,updated_at)
         VALUES (?,?,?,?,?,?,?,?,'[]',?,?)`,
        [id, campaign.id, mapForm.name.trim(), '',
         mapForm.imageAssetId || null,
         w, h,
         mapForm.scale.trim() || null,
         now, now],
      );
      setShowCreateMap(false);
      await loadAll();
    } catch(e) { setError(e instanceof Error ? e.message : String(e)); }
    finally    { setMapSaving(false); }
  }

  // ── Edit map (change image / scale) ────────────────────────────────────────
  async function openEditMap() {
    if (!activeMap) return;
    await loadMapAssets();
    setEditForm({
      imageAssetId: activeMap.imageAssetId ?? '',
      widthPx:      String(activeMap.widthPx),
      heightPx:     String(activeMap.heightPx),
      scale:        activeMap.scale ?? '',
    });
    setShowEditMap(true);
  }

  async function handleEditMap() {
    if (!activeMap) return;
    setEditSaving(true);
    setError(null);
    try {
      let w = parseInt(editForm.widthPx)  || activeMap.widthPx;
      let h = parseInt(editForm.heightPx) || activeMap.heightPx;
      if (editForm.imageAssetId) {
        const chosen = mapAssets.find(a => a.id === editForm.imageAssetId);
        if (chosen?.widthPx)  w = chosen.widthPx;
        if (chosen?.heightPx) h = chosen.heightPx;
      }
      await atlas.db.run(
        `UPDATE maps SET image_asset_id=?, width_px=?, height_px=?, scale=? WHERE id=?`,
        [editForm.imageAssetId || null, w, h, editForm.scale.trim() || null, activeMap.id],
      );
      setShowEditMap(false);
      // Flush cached URL for the old asset so the canvas re-fetches
      if (activeMap.imageAssetId && editForm.imageAssetId !== activeMap.imageAssetId) {
        setImageUrls(prev => {
          const next = { ...prev };
          if (activeMap.imageAssetId) delete next[activeMap.imageAssetId];
          return next;
        });
      }
      await loadAll();
      // Re-select the updated map so canvas refreshes
      const updated: CampaignMap = {
        ...activeMap,
        imageAssetId: editForm.imageAssetId || null,
        widthPx: w, heightPx: h,
        scale: editForm.scale.trim() || null,
      };
      await selectMap(updated);
    } catch(e) { setError(e instanceof Error ? e.message : String(e)); }
    finally    { setEditSaving(false); }
  }

  async function handleMapClick(e: React.MouseEvent<SVGSVGElement>) {
    if (dragMoved.current) return;
    if (!activeMap || tool !== 'pin' || !selected) return;
    const svg = svgRef.current!;
    const rect = svg.getBoundingClientRect();
    const x = (e.clientX - rect.left - pan.x) / zoom;
    const y = (e.clientY - rect.top  - pan.y) / zoom;
    const id = crypto.randomUUID();
    await atlas.db.run(
      `INSERT INTO location_pins (id,map_id,location_id,pos_x,pos_y) VALUES (?,?,?,?,?)
       ON CONFLICT(map_id,location_id) DO UPDATE SET pos_x=excluded.pos_x,pos_y=excluded.pos_y`,
      [id, activeMap.id, selected.id, Math.round(x), Math.round(y)],
    );
    await loadPins(activeMap.id);
    setTool('select');
  }

  function onMouseDown(e: React.MouseEvent<SVGSVGElement>) {
    dragMoved.current = false;
    if (tool !== 'select') return;
    setDragging(true);
    setDragStart({x:e.clientX, y:e.clientY, px:viewport.px, py:viewport.py});
  }
  function onMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    if (!dragging) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) dragMoved.current = true;
    setViewport(v => ({...v, px:dragStart.px+dx, py:dragStart.py+dy}));
  }
  function onMouseUp() { setDragging(false); }
  function onWheel(e: React.WheelEvent<SVGSVGElement>) {
    e.preventDefault();
    const svg = svgRef.current;
    if (!svg) return;
    const rect   = svg.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? 1.12 : 0.89;
    setViewport(v => {
      const newZoom = Math.min(4, Math.max(0.25, v.zoom * factor));
      return {
        zoom: newZoom,
        px: mouseX - (mouseX - v.px) * (newZoom / v.zoom),
        py: mouseY - (mouseY - v.py) * (newZoom / v.zoom),
      };
    });
  }

  const pinsByLocation = Object.fromEntries(pins.map(p => [p.locationId, p]));

  return (
    <div className={styles.root}>
      <header className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <h2 className={styles.title}>World Atlas</h2>
          <span className={styles.count}>{locations.length} locations · {maps.length} maps</span>
        </div>
        {activeMap && (
          <div className={styles.toolbarCenter}>
            <button className={`${styles.toolBtn} ${tool==='select'?styles.toolActive:''}`}
              onClick={() => setTool('select')} title="Pan / Select">
              <Icon name="home" size={14}/>
            </button>
            <button className={`${styles.toolBtn} ${tool==='pin'?styles.toolActive:''} ${!selected?styles.toolDisabled:''}`}
              onClick={() => selected && setTool('pin')} title={selected?"Place pin for selected location":"Select a location first"}>
              <Icon name="pin" size={14}/>
            </button>
            <span className={styles.zoomLabel}>{Math.round(zoom*100)}%</span>
            <button className={styles.toolBtn} onClick={() => setViewport({zoom:1, px:0, py:0})}>Reset</button>
            {/* Edit map image button */}
            <button className={styles.toolBtn} onClick={openEditMap} title="Change map image / settings">
              <Icon name="settings" size={14}/> Edit Map
            </button>
          </div>
        )}
        <button className={styles.sidebarToggle} onClick={() => setShowSidebar(v=>!v)}>
          <Icon name="chevron-right" size={16} style={{transform:showSidebar?'rotate(180deg)':undefined}}/>
        </button>
      </header>

      {error && <div className={styles.errorBar}><Icon name="alert" size={15}/> {error}</div>}

      <div className={styles.body}>
        {/* Map list / canvas */}
        <div className={styles.canvasArea}>
          {!activeMap ? (
            <div className={styles.mapPicker}>
              <Icon name="map" size={48} className={styles.emptyIcon}/>
              <h3>Select a map to explore</h3>
              <div className={styles.mapGrid}>
                {maps.map(m => {
                  const thumbUrl = m.imageAssetId ? imageUrls[m.imageAssetId] : null;
                  return (
                    <button key={m.id} className={styles.mapCard} onClick={() => selectMap(m)}>
                      {/* Thumbnail background */}
                      <div className={styles.mapCardThumb}>
                        {thumbUrl ? (
                          <img src={thumbUrl} className={styles.mapCardThumbImg} alt={m.name}/>
                        ) : (
                          <Icon name="map" size={28} className={styles.mapCardIcon}/>
                        )}
                      </div>
                      {/* Label overlay */}
                      <div className={styles.mapCardLabel}>
                        <span className={styles.mapCardName}>{m.name}</span>
                        <span className={styles.mapDims}>{m.widthPx}×{m.heightPx}px</span>
                      </div>
                    </button>
                  );
                })}
              </div>
              <button className={styles.createMapBtn} onClick={openCreateMap}>
                <Icon name="plus" size={15}/> Create Map
              </button>
            </div>
          ) : (
            <svg
              ref={svgRef}
              className={`${styles.canvas} ${tool==='pin'&&selected?styles.cursorPin:styles.cursorPan} ${dragging?styles.cursorGrab:''}`}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={onMouseUp}
              onClick={handleMapClick}
              onWheel={onWheel}
            >
              <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
                {/* Map background */}
                <rect x={0} y={0} width={activeMap.widthPx} height={activeMap.heightPx}
                  fill="var(--bg-raised)" stroke="var(--border)" strokeWidth={1}/>

                {/* Render map image if assigned */}
                {activeMap.imageAssetId && imageUrls[activeMap.imageAssetId] ? (
                  <image
                    href={imageUrls[activeMap.imageAssetId]}
                    x={0} y={0}
                    width={activeMap.widthPx}
                    height={activeMap.heightPx}
                    preserveAspectRatio="xMidYMid meet"
                  />
                ) : (
                  // Fallback grid when no image assigned
                  <>
                    <defs>
                      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                        <path d="M40 0H0V40" fill="none" stroke="var(--border-subtle)" strokeWidth="0.5"/>
                      </pattern>
                    </defs>
                    <rect width={activeMap.widthPx} height={activeMap.heightPx} fill="url(#grid)"/>
                    {!activeMap.imageAssetId && (
                      <text x={activeMap.widthPx/2} y={activeMap.heightPx/2}
                        fontSize="13" fill="var(--ink-600)" textAnchor="middle" dominantBaseline="middle">
                        No image assigned — click &quot;Edit Map&quot; in the toolbar to add one
                      </text>
                    )}
                  </>
                )}

                {/* Scale label */}
                {activeMap.scale && (
                  <text x={8} y={activeMap.heightPx-8} fontSize="10" fill="var(--ink-500)">{activeMap.scale}</text>
                )}

                {/* Pins */}
                {pins.map(pin => {
                  const loc = locations.find(l => l.id === pin.locationId);
                  const col = TYPE_COLOUR[loc?.locationType ?? 'default'] ?? TYPE_COLOUR['default'];
                  const label = pin.label ?? loc?.name ?? '';
                  return (
                    <g key={pin.id} style={{cursor:'pointer'}}
                      onClick={e => { e.stopPropagation(); if(loc) setSelected(loc); }}>
                      {/* Label backdrop pill */}
                      {zoom > 0.5 && label && (
                        <g style={{pointerEvents:'none'}}>
                          {/* Measure via approximate char width — SVG has no measureText easily,
                              so we use a fixed char-width estimate and clip generously */}
                          <rect
                            x={pin.posX - (label.length * 3.3 + 6) / zoom}
                            y={pin.posY - 26 / zoom}
                            width={(label.length * 6.6 + 12) / zoom}
                            height={14 / zoom}
                            rx={3 / zoom}
                            fill="var(--bg-base)"
                            fillOpacity={0.72}
                          />
                          <text
                            x={pin.posX}
                            y={pin.posY - 14 / zoom}
                            fontSize={11 / zoom}
                            fill="var(--text-primary)"
                            textAnchor="middle"
                            dominantBaseline="auto">
                            {label}
                          </text>
                        </g>
                      )}
                      <circle cx={pin.posX} cy={pin.posY} r={10/zoom+2}
                        fill={col} fillOpacity={0.9} stroke="var(--bg-base)" strokeWidth={1.5/zoom}/>
                      <circle cx={pin.posX} cy={pin.posY} r={4/zoom}
                        fill="var(--bg-base)" fillOpacity={0.8}/>
                    </g>
                  );
                })}

                {/* Ghost pin while placing */}
                {tool === 'pin' && selected && (
                  <circle cx={-100} cy={-100} r={12}
                    fill={(TYPE_COLOUR[selected.locationType] ?? TYPE_COLOUR['default'])}
                    fillOpacity={0.5} stroke="var(--gold-400)" strokeWidth={1.5}
                    strokeDasharray="4 2"/>
                )}
              </g>
            </svg>
          )}
        </div>

        {/* Sidebar */}
        {showSidebar && (
          <div className={styles.sidebar}>
            {/* Map selector */}
            <div className={styles.sideSection}>
              <div className={styles.sideSectionHeader}>
                <h3 className={styles.sideSectionTitle}>Maps</h3>
                <button className={styles.sideAddBtn} onClick={openCreateMap} title="Create map">
                  <Icon name="plus" size={12}/>
                </button>
              </div>
              {maps.map(m => (
                <button key={m.id}
                  className={`${styles.sideItem} ${activeMap?.id===m.id?styles.sideItemActive:''}`}
                  onClick={() => selectMap(m)}>
                  <Icon name="map" size={14}/>
                  <span>{m.name}</span>
                </button>
              ))}
              {maps.length === 0 && (
                <p className={styles.hint}>No maps yet.</p>
              )}
            </div>

            <div className={styles.sideDivider}/>

            {/* Locations list */}
            <div className={`${styles.sideSection} ${styles.locSection}`}>
              <h3 className={styles.sideSectionTitle}>Locations</h3>
              {/* Add location */}
              <div className={styles.addLocRow}>
                <input className={styles.sideInput} placeholder="New location…"
                  value={newLocName} onChange={e => setNewLocName(e.target.value)}
                  onKeyDown={e => e.key==='Enter' && createLocation()}/>
                <select className={styles.sideInput} value={newLocType}
                  onChange={e => setNewLocType(e.target.value)}>
                  {['world','continent','region','nation','city','town','village','district','building','dungeon','wilderness','landmark','other']
                    .map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <button className={styles.addBtn} onClick={createLocation} disabled={!newLocName.trim()}>
                  <Icon name="plus" size={14}/>
                </button>
              </div>
              <ul className={styles.locList}>
                {locations.map(loc => {
                  const isPinned = activeMap ? !!pinsByLocation[loc.id] : false;
                  const col = TYPE_COLOUR[loc.locationType] ?? TYPE_COLOUR['default'];
                  return (
                    <li key={loc.id}>
                      <button
                        className={`${styles.locItem} ${selected?.id===loc.id?styles.locActive:''}`}
                        onClick={() => setSelected(s => s?.id===loc.id ? null : loc)}>
                        <span className={styles.locDot} style={{background:col}}/>
                        <span className={styles.locName}>{loc.name}</span>
                        <span className={styles.locType}>{loc.locationType}</span>
                        {isPinned && <Icon name="pin" size={11} className={styles.pinIcon}/>}
                      </button>
                    </li>
                  );
                })}
                {locations.length === 0 && <p className={styles.hint}>No locations yet.</p>}
              </ul>
            </div>

            {/* Selected location detail */}
            {selected && (
              <div className={styles.locDetail}>
                <div className={styles.locDetailHeader}>
                  <span className={styles.locDetailName}>{selected.name}</span>
                  <span className={styles.locDetailType}>{selected.locationType}</span>
                </div>
                {activeMap && (
                  <div className={styles.locDetailActions}>
                    {!pinsByLocation[selected.id] ? (
                      <button className={styles.pinBtn} onClick={() => setTool('pin')}>
                        <Icon name="pin" size={13}/> Place on map
                      </button>
                    ) : (
                      <button className={`${styles.pinBtn} ${styles.pinBtnRemove}`}
                        onClick={async () => {
                          await atlas.db.run('DELETE FROM location_pins WHERE map_id=? AND location_id=?',
                            [activeMap.id, selected.id]);
                          await loadPins(activeMap.id);
                        }}>
                        <Icon name="x" size={13}/> Remove pin
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Create Map Modal ───────────────────────────────────────────────── */}
      {showCreateMap && (
        <div className={styles.modalBackdrop} onClick={e => e.target===e.currentTarget && setShowCreateMap(false)}>
          <div className={styles.modal}>
            <header className={styles.modalHeader}>
              <h3>Create Map</h3>
              <button className={styles.modalClose} onClick={() => setShowCreateMap(false)}>
                <Icon name="x" size={16}/>
              </button>
            </header>

            <div className={styles.modalBody}>
              <label className={styles.formLabel}>
                Name <span className={styles.required}>*</span>
                <input className={styles.formInput} autoFocus placeholder="World Map…"
                  value={mapForm.name} onChange={e => setMapForm(f => ({...f, name: e.target.value}))}/>
              </label>

              <label className={styles.formLabel}>
                Map Image <span className={styles.formHint}>(optional — can be changed later)</span>
                <select className={styles.formInput}
                  value={mapForm.imageAssetId}
                  onChange={e => setMapForm(f => ({...f, imageAssetId: e.target.value}))}>
                  <option value="">— No image —</option>
                  {mapAssets.map(a => (
                    <option key={a.id} value={a.id}>{a.name}
                      {a.widthPx && a.heightPx ? ` (${a.widthPx}×${a.heightPx})` : ''}
                    </option>
                  ))}
                </select>
                {mapAssets.length === 0 && (
                  <span className={styles.formHint}>No map images imported yet. Go to Assets → Import to add one.</span>
                )}
              </label>

              {!mapForm.imageAssetId && (
                <div className={styles.formRow}>
                  <label className={styles.formLabel}>
                    Width (px)
                    <input className={styles.formInput} type="number" min={100} max={8000}
                      value={mapForm.widthPx} onChange={e => setMapForm(f => ({...f, widthPx: e.target.value}))}/>
                  </label>
                  <label className={styles.formLabel}>
                    Height (px)
                    <input className={styles.formInput} type="number" min={100} max={8000}
                      value={mapForm.heightPx} onChange={e => setMapForm(f => ({...f, heightPx: e.target.value}))}/>
                  </label>
                </div>
              )}

              <label className={styles.formLabel}>
                Scale <span className={styles.formHint}>(optional, e.g. "1 hex = 6 miles")</span>
                <input className={styles.formInput} placeholder="1 hex = 6 miles"
                  value={mapForm.scale} onChange={e => setMapForm(f => ({...f, scale: e.target.value}))}/>
              </label>
            </div>

            <footer className={styles.modalFooter}>
              <button className={styles.cancelBtn} onClick={() => setShowCreateMap(false)}>Cancel</button>
              <button className={styles.submitBtn}
                onClick={handleCreateMap}
                disabled={mapSaving || !mapForm.name.trim()}>
                {mapSaving
                  ? <><Icon name="loader" size={14} className={styles.spin}/> Creating…</>
                  : <><Icon name="plus" size={14}/> Create Map</>}
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* ── Edit Map Modal (change image / scale on an existing map) ───────── */}
      {showEditMap && activeMap && (
        <div className={styles.modalBackdrop} onClick={e => e.target===e.currentTarget && setShowEditMap(false)}>
          <div className={styles.modal}>
            <header className={styles.modalHeader}>
              <h3>Edit Map — {activeMap.name}</h3>
              <button className={styles.modalClose} onClick={() => setShowEditMap(false)}>
                <Icon name="x" size={16}/>
              </button>
            </header>

            <div className={styles.modalBody}>
              <label className={styles.formLabel}>
                Map Image
                <select className={styles.formInput}
                  value={editForm.imageAssetId}
                  onChange={e => setEditForm(f => ({...f, imageAssetId: e.target.value}))}>
                  <option value="">— No image —</option>
                  {mapAssets.map(a => (
                    <option key={a.id} value={a.id}>{a.name}
                      {a.widthPx && a.heightPx ? ` (${a.widthPx}×${a.heightPx})` : ''}
                    </option>
                  ))}
                </select>
                {mapAssets.length === 0 && (
                  <span className={styles.formHint}>No map images imported yet. Go to Assets → Import to add one.</span>
                )}
              </label>

              {/* Preview of currently selected image */}
              {editForm.imageAssetId && imageUrls[editForm.imageAssetId] && (
                <div className={styles.editThumbPreview}>
                  <img src={imageUrls[editForm.imageAssetId]} className={styles.editThumbImg} alt="Preview"/>
                </div>
              )}

              {!editForm.imageAssetId && (
                <div className={styles.formRow}>
                  <label className={styles.formLabel}>
                    Width (px)
                    <input className={styles.formInput} type="number" min={100} max={8000}
                      value={editForm.widthPx} onChange={e => setEditForm(f => ({...f, widthPx: e.target.value}))}/>
                  </label>
                  <label className={styles.formLabel}>
                    Height (px)
                    <input className={styles.formInput} type="number" min={100} max={8000}
                      value={editForm.heightPx} onChange={e => setEditForm(f => ({...f, heightPx: e.target.value}))}/>
                  </label>
                </div>
              )}

              <label className={styles.formLabel}>
                Scale <span className={styles.formHint}>(e.g. "1 hex = 6 miles")</span>
                <input className={styles.formInput} placeholder="1 hex = 6 miles"
                  value={editForm.scale} onChange={e => setEditForm(f => ({...f, scale: e.target.value}))}/>
              </label>
            </div>

            <footer className={styles.modalFooter}>
              <button className={styles.cancelBtn} onClick={() => setShowEditMap(false)}>Cancel</button>
              <button className={styles.submitBtn}
                onClick={handleEditMap}
                disabled={editSaving}>
                {editSaving
                  ? <><Icon name="loader" size={14} className={styles.spin}/> Saving…</>
                  : <><Icon name="check" size={14}/> Save Changes</>}
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
