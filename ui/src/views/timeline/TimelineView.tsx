// ─────────────────────────────────────────────────────────────────────────────
// ui/src/views/timeline/TimelineView.tsx
//
// Alaruel Atlas — Campaign Chronology System
//
// A horizontal, multi-track fantasy timeline with:
//   • Fantasy calendar dates (no JS Date objects as truth)
//   • Drag-to-redate events
//   • Lane/track system (collapsible)
//   • Zoom levels (Era → Year → Month → Week → Day)
//   • Automatic sync from campaign_events
//   • GM / Player visibility modes
//   • Fantasy chronicle aesthetics (parchment, heraldic, arcane)
// ─────────────────────────────────────────────────────────────────────────────

import {
  useState, useEffect, useCallback, useRef, useMemo,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { atlas }            from '../../bridge/atlas';
import { useCampaignStore } from '../../store/campaign.store';
import { Icon }             from '../../components/ui/Icon';
import {
  parseFantasyDate,
  compareFantasyDates,
  toAbsoluteDays,
  fromAbsoluteDays,
  convertToDisplayString,
  toShortDisplay,
  addFantasyDays,
} from './calendarUtils';
import {
  fetchTimelineEvents,
  updateEventDate,
  createEventFromTimeline,
  deleteTimelineEvent,
  DEFAULT_LANES,
  ZOOM_CONFIGS,
  CATEGORY_COLORS,
  CATEGORY_ICONS,
} from './timelineData';
import type {
  TimelineEvent,
  TimelineLane,
  TimelineMode,
  ZoomLevel,
  TimelineEventCategory,
} from './timelineTypes';
import type { FantasyDate } from './calendarUtils';
import styles from './TimelineView.module.css';

// ── Constants ─────────────────────────────────────────────────────────────────

const LANE_HEADER_WIDTH = 180;
const LANE_HEIGHT       = 72;
const LANE_COLLAPSED_H  = 32;
const RULER_HEIGHT      = 48;
const EVENT_CARD_HEIGHT = 52;
const CARD_PADDING      = 8;

const ZOOM_LEVELS: ZoomLevel[] = ['era', 'year', 'month', 'week', 'day'];

const SIGNIFICANCE_WEIGHTS: Record<TimelineEvent['significance'], number> = {
  trivial: 0.6, minor: 0.8, moderate: 1.0, major: 1.3, critical: 1.6,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)); }

function dateToX(date: FantasyDate, originDay: number, pixelsPerDay: number): number {
  return (toAbsoluteDays(date) - originDay) * pixelsPerDay;
}

function xToDate(x: number, originDay: number, pixelsPerDay: number): FantasyDate {
  return fromAbsoluteDays(originDay + Math.round(x / pixelsPerDay));
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface EventCardProps {
  event: TimelineEvent;
  x: number;
  width: number;
  laneY: number;
  selected: boolean;
  onSelect: (id: string) => void;
  onDragStart: (id: string, startX: number) => void;
  onDelete: (id: string) => void;
}

function EventCard({ event, x, width, laneY, selected, onSelect, onDragStart, onDelete }: EventCardProps) {
  const w = SIGNIFICANCE_WEIGHTS[event.significance] ?? 1;
  const cardW = Math.max(width, 80);

  function handleMouseDown(e: ReactMouseEvent) {
    e.stopPropagation();
    onDragStart(event.id, e.clientX);
    onSelect(event.id);
  }

  function handleDelete(e: ReactMouseEvent) {
    e.stopPropagation();
    onDelete(event.id);
  }

  return (
    <g
      className={`${styles.eventCardGroup} ${selected ? styles.eventCardSelected : ''}`}
      transform={`translate(${x}, ${laneY + CARD_PADDING})`}
      onMouseDown={handleMouseDown}
      style={{ cursor: 'grab' }}
    >
      {/* Drop shadow */}
      <rect
        x={2} y={3}
        width={cardW} height={EVENT_CARD_HEIGHT * w}
        rx={4}
        fill="rgba(0,0,0,0.5)"
      />
      {/* Card body */}
      <rect
        x={0} y={0}
        width={cardW} height={EVENT_CARD_HEIGHT * w}
        rx={4}
        fill={event.color ?? '#3c3224'}
        fillOpacity={0.88}
        stroke={selected ? '#f0cc8a' : event.color ?? '#6b5c40'}
        strokeWidth={selected ? 2 : 1}
        strokeOpacity={0.9}
      />
      {/* Heraldic left accent bar */}
      <rect
        x={0} y={0}
        width={4} height={EVENT_CARD_HEIGHT * w}
        rx={2}
        fill={event.color ?? '#e0b060'}
        fillOpacity={0.95}
      />
      {/* Icon */}
      <text
        x={14} y={20}
        fontSize={14}
        textAnchor="middle"
        dominantBaseline="central"
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        {event.icon ?? '·'}
      </text>
      {/* Title */}
      <foreignObject x={26} y={4} width={cardW - 50} height={EVENT_CARD_HEIGHT * w - 8}>
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '11px',
            color: '#f0e8d8',
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            lineHeight: '1.3',
            letterSpacing: '0.03em',
          }}
        >
          {event.title}
        </div>
      </foreignObject>
      {/* GM badge */}
      {!event.isPlayerFacing && (
        <rect x={cardW - 22} y={4} width={18} height={10} rx={2} fill="#7a1f1f" fillOpacity={0.8} />
      )}
      {!event.isPlayerFacing && (
        <text x={cardW - 13} y={10} fontSize={7} fill="#f0a0a0" textAnchor="middle" dominantBaseline="central"
          style={{ fontFamily: 'var(--font-mono)', pointerEvents: 'none' }}>GM</text>
      )}
      {/* Delete button (shown on selection) */}
      {selected && (
        <g onClick={handleDelete} style={{ cursor: 'pointer' }}>
          <circle cx={cardW - 6} cy={-6} r={9} fill="#7a1f1f" stroke="#c44040" strokeWidth={1} />
          <text x={cardW - 6} y={-6} fontSize={10} fill="#f0c0c0" textAnchor="middle" dominantBaseline="central"
            style={{ pointerEvents: 'none' }}>×</text>
        </g>
      )}
    </g>
  );
}

// ── Main View ─────────────────────────────────────────────────────────────────

export default function TimelineView() {
  const campaign = useCampaignStore(s => s.campaign);

  // Data state
  const [events,   setEvents]   = useState<TimelineEvent[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [lanes,    setLanes]    = useState<TimelineLane[]>(DEFAULT_LANES);

  // Viewport state
  const [scrollLeft, setScrollLeft] = useState(0);
  const [zoomLevel,  setZoomLevel]  = useState<ZoomLevel>('year');
  const [mode,       setMode]       = useState<TimelineMode>('historical');

  // Interaction state
  const [selectedId,  setSelectedId]  = useState<string | null>(null);
  const [dragging,    setDragging]    = useState<{ id: string; startX: number; origDay: number } | null>(null);
  const [dragDeltaX,  setDragDeltaX]  = useState(0);
  const [creating,    setCreating]    = useState(false);
  const [newEvent,    setNewEvent]    = useState({
    name: '', eventType: 'other' as TimelineEventCategory,
    significance: 'minor' as TimelineEvent['significance'],
    campaignDate: '', isPlayerFacing: true,
  });
  const [saving,      setSaving]      = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCats,  setFilterCats]  = useState<Set<TimelineEventCategory>>(new Set());

  // Refs
  const svgRef      = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasW, setCanvasW] = useState(1200);

  // Derived config
  const zoomConfig = ZOOM_CONFIGS[zoomLevel];
  const pixelsPerDay = zoomConfig.pixelsPerDay;

  // ── Data loading ────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    if (!campaign) return;
    setLoading(true);
    setError(null);
    try {
      const evs = await fetchTimelineEvents(campaign.id);
      setEvents(evs);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [campaign]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    return atlas.on.moduleEvent(({ event }: { event: string }) => {
      if (event === 'timeline:entry-added' ||
          event === 'quest:completed'      ||
          event === 'session:ended') {
        load();
      }
    });
  }, [load]);

  // ── Canvas sizing ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(entries => {
      setCanvasW(entries[0].contentRect.width);
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // ── Derived timeline geometry ───────────────────────────────────────────────

  const { originDay, totalDays } = useMemo(() => {
    const sorted = [...events]
      .filter(e => e.startDate.year > 0)
      .sort((a, b) => compareFantasyDates(a.startDate, b.startDate));

    if (sorted.length === 0) {
      return { originDay: 0, totalDays: 3600 };
    }

    const first = toAbsoluteDays(sorted[0].startDate);
    const last  = toAbsoluteDays(sorted[sorted.length - 1].startDate);
    const pad   = 360; // 1 year padding on each side
    return {
      originDay: first - pad,
      totalDays: (last - first) + pad * 2,
    };
  }, [events]);

  const totalWidth = Math.max(totalDays * pixelsPerDay, canvasW - LANE_HEADER_WIDTH) + 200;

  // ── Filtered events ─────────────────────────────────────────────────────────

  const visibleEvents = useMemo(() => {
    return events.filter(ev => {
      if (mode === 'player-safe' && !ev.isPlayerFacing) return false;
      if (searchQuery && !ev.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (filterCats.size > 0 && !filterCats.has(ev.category)) return false;
      return true;
    });
  }, [events, mode, searchQuery, filterCats]);

  // ── Lane layout ─────────────────────────────────────────────────────────────

  const visibleLanes = useMemo(
    () => lanes.filter(l => l.visible).sort((a, b) => a.order - b.order),
    [lanes],
  );

  const laneYOffsets = useMemo(() => {
    const offsets: Record<string, number> = {};
    let y = RULER_HEIGHT;
    for (const lane of visibleLanes) {
      offsets[lane.id] = y;
      y += lane.collapsed ? LANE_COLLAPSED_H : LANE_HEIGHT;
    }
    return offsets;
  }, [visibleLanes]);

  const totalLaneHeight = useMemo(() => {
    return visibleLanes.reduce((sum, l) => sum + (l.collapsed ? LANE_COLLAPSED_H : LANE_HEIGHT), 0) + RULER_HEIGHT;
  }, [visibleLanes]);

  // ── Ruler grid marks ────────────────────────────────────────────────────────

  const gridMarks = useMemo(() => {
    const marks: Array<{ x: number; label: string; major: boolean }> = [];
    const spanDays = zoomConfig.gridSpanDays;
    const startAbsDay = originDay;
    const endAbsDay   = originDay + totalDays + 360;

    // Snap to grid
    let cursor = Math.floor(startAbsDay / spanDays) * spanDays;
    let count = 0;
    while (cursor <= endAbsDay && count < 500) {
      const date = fromAbsoluteDays(cursor);
      const x    = (cursor - originDay) * pixelsPerDay;
      marks.push({
        x,
        label: zoomConfig.gridLabel(date),
        major: count % 4 === 0,
      });
      cursor += spanDays;
      count++;
    }
    return marks;
  }, [originDay, totalDays, pixelsPerDay, zoomConfig]);

  // ── Dragging ────────────────────────────────────────────────────────────────

  function handleDragStart(id: string, startX: number) {
    const ev = events.find(e => e.id === id);
    if (!ev) return;
    setDragging({ id, startX, origDay: toAbsoluteDays(ev.startDate) });
    setDragDeltaX(0);
  }

  function handleMouseMove(e: ReactMouseEvent<SVGSVGElement>) {
    if (!dragging) return;
    setDragDeltaX(e.clientX - dragging.startX);
  }

  async function handleMouseUp() {
    // Guard: only act when actually dragging — prevents spurious re-renders
    // that can steal focus from form inputs when the mouse drifts over the SVG.
    if (!dragging) return;
    if (!campaign) { setDragging(null); setDragDeltaX(0); return; }
    const deltaDays = Math.round(dragDeltaX / pixelsPerDay);
    if (deltaDays !== 0) {
      const newAbsDay = dragging.origDay + deltaDays;
      const newDate   = fromAbsoluteDays(newAbsDay);
      const raw       = convertToDisplayString(newDate);
      try {
        await updateEventDate(dragging.id, campaign.id, raw);
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    }
    setDragging(null);
    setDragDeltaX(0);
  }

  // ── Zoom + scroll ───────────────────────────────────────────────────────────
  // Use a native non-passive wheel listener — React synthetic onWheel is passive
  // in React 17+ so preventDefault() throws a warning and doesn't work there.

  const zoomLevelRef = useRef(zoomLevel);
  zoomLevelRef.current = zoomLevel;
  const totalWidthRef = useRef(totalWidth);
  totalWidthRef.current = totalWidth;
  const canvasWRef = useRef(canvasW);
  canvasWRef.current = canvasW;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    function onWheel(e: WheelEvent) {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const idx = ZOOM_LEVELS.indexOf(zoomLevelRef.current);
        if (e.deltaY < 0 && idx < ZOOM_LEVELS.length - 1) setZoomLevel(ZOOM_LEVELS[idx + 1]);
        if (e.deltaY > 0 && idx > 0)                       setZoomLevel(ZOOM_LEVELS[idx - 1]);
      } else {
        setScrollLeft(v => clamp(
          v + e.deltaX + e.deltaY * 0.5,
          0,
          Math.max(0, totalWidthRef.current - canvasWRef.current + LANE_HEADER_WIDTH),
        ));
      }
    }
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  function jumpToFirst() {
    setScrollLeft(0);
  }

  function jumpToLatest() {
    setScrollLeft(Math.max(0, totalWidth - canvasW + LANE_HEADER_WIDTH));
  }

  // ── Lane controls ───────────────────────────────────────────────────────────

  function toggleLaneCollapse(id: string) {
    setLanes(ls => ls.map(l => l.id === id ? { ...l, collapsed: !l.collapsed } : l));
  }

  // ── Create event ────────────────────────────────────────────────────────────

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newEvent.name.trim() || !campaign) return;
    setSaving(true); setError(null);
    try {
      await createEventFromTimeline(campaign.id, {
        name: newEvent.name,
        eventType: newEvent.eventType,
        significance: newEvent.significance,
        campaignDate: newEvent.campaignDate || undefined,
        isPlayerFacing: newEvent.isPlayerFacing,
      });
      await load();
      setCreating(false);
      setNewEvent(n => ({ ...n, name: '', campaignDate: '' }));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  // ── Delete ──────────────────────────────────────────────────────────────────

  async function handleDelete(id: string) {
    if (!campaign) return;
    if (!window.confirm('Remove this event from the chronicle? This cannot be undone.')) return;
    try {
      await deleteTimelineEvent(id, campaign.id);
      setSelectedId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  // ── Selected event detail ───────────────────────────────────────────────────

  const selectedEvent = selectedId ? events.find(e => e.id === selectedId) ?? null : null;

  // ── Filter toggles ──────────────────────────────────────────────────────────

  function toggleCategory(cat: TimelineEventCategory) {
    setFilterCats(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  }

  // ── SVG event position with drag offset ────────────────────────────────────

  function getEventX(ev: TimelineEvent): number {
    const baseX = dateToX(ev.startDate, originDay, pixelsPerDay);
    if (dragging && dragging.id === ev.id) return baseX + dragDeltaX;
    return baseX;
  }

  const EVENT_TYPES: TimelineEventCategory[] = [
    'battle','quest','faction','political','death','birth',
    'discovery','natural','social','mystery','other',
  ];

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className={styles.root}>

      {/* ── TOOLBAR ────────────────────────────────────────────────────────── */}
      <header className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <h2 className={styles.title}>Chronicle</h2>
          <span className={styles.count}>{events.length}</span>
        </div>

        <div className={styles.toolbarCenter}>
          {/* Zoom controls */}
          <div className={styles.zoomGroup}>
            <button className={styles.zoomBtn} onClick={() => {
              const i = ZOOM_LEVELS.indexOf(zoomLevel);
              if (i > 0) setZoomLevel(ZOOM_LEVELS[i - 1]);
            }} title="Zoom out">−</button>
            <span className={styles.zoomLabel}>{zoomLevel.toUpperCase()}</span>
            <button className={styles.zoomBtn} onClick={() => {
              const i = ZOOM_LEVELS.indexOf(zoomLevel);
              if (i < ZOOM_LEVELS.length - 1) setZoomLevel(ZOOM_LEVELS[i + 1]);
            }} title="Zoom in">+</button>
          </div>

          {/* Navigation */}
          <div className={styles.navGroup}>
            <button className={styles.navBtn} onClick={jumpToFirst} title="Jump to beginning">⟪</button>
            <button className={styles.navBtn} onClick={jumpToLatest} title="Jump to latest">⟫</button>
          </div>

          {/* Mode */}
          <div className={styles.modeGroup}>
            {(['historical','gm-future','player-safe'] as TimelineMode[]).map(m => (
              <button
                key={m}
                className={`${styles.modeBtn} ${mode === m ? styles.modeBtnActive : ''}`}
                onClick={() => setMode(m)}
                title={m}
              >
                {m === 'historical' ? '📜' : m === 'gm-future' ? '🔮' : '🎭'}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.toolbarRight}>
          <input
            className={styles.search}
            placeholder="Search chronicle…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          <button className={styles.createBtn} onClick={() => setCreating(v => !v)}>
            <Icon name="plus" size={14} /> New Event
          </button>
        </div>
      </header>

      {/* ── CATEGORY FILTER BAR ─────────────────────────────────────────────── */}
      <div className={styles.filterBar}>
        <span className={styles.filterLabel}>Filter:</span>
        {EVENT_TYPES.map(cat => (
          <button
            key={cat}
            className={`${styles.filterChip} ${filterCats.has(cat) ? styles.filterChipActive : ''}`}
            onClick={() => toggleCategory(cat)}
            style={filterCats.has(cat) ? { borderColor: CATEGORY_COLORS[cat], color: CATEGORY_COLORS[cat] } : {}}
            title={cat}
          >
            {CATEGORY_ICONS[cat]} <span>{cat}</span>
          </button>
        ))}
        {filterCats.size > 0 && (
          <button className={styles.clearFilter} onClick={() => setFilterCats(new Set())}>
            Clear ×
          </button>
        )}
      </div>

      {/* ── CREATE FORM ─────────────────────────────────────────────────────── */}
      {creating && (
        <form className={styles.createBar} onSubmit={handleCreate}>
          <input
            className={styles.input} autoFocus placeholder="Event name…"
            value={newEvent.name}
            onChange={e => setNewEvent(n => ({ ...n, name: e.target.value }))}
            required
          />
          <select className={styles.input} value={newEvent.eventType}
            onChange={e => setNewEvent(n => ({ ...n, eventType: e.target.value as TimelineEventCategory }))}>
            {EVENT_TYPES.map(t => <option key={t} value={t}>{CATEGORY_ICONS[t]} {t}</option>)}
          </select>
          <select className={styles.input} value={newEvent.significance}
            onChange={e => setNewEvent(n => ({ ...n, significance: e.target.value as TimelineEvent['significance'] }))}>
            {(['trivial','minor','moderate','major','critical'] as const).map(s =>
              <option key={s} value={s}>{s}</option>)}
          </select>
          <input
            className={styles.input} placeholder="In-world date (e.g. 15 Hammer, Year 1492)"
            value={newEvent.campaignDate}
            onChange={e => setNewEvent(n => ({ ...n, campaignDate: e.target.value }))}
          />
          <label className={styles.checkLabel}>
            <input type="checkbox" checked={newEvent.isPlayerFacing}
              onChange={e => setNewEvent(n => ({ ...n, isPlayerFacing: e.target.checked }))} />
            Player-facing
          </label>
          <button type="submit" className={styles.createBtn} disabled={saving || !newEvent.name.trim()}>
            {saving ? <Icon name="loader" size={14} className={styles.spin} /> : null} Add to Chronicle
          </button>
          <button type="button" className={styles.ghostBtn} onClick={() => setCreating(false)}>Cancel</button>
        </form>
      )}

      {error && (
        <div className={styles.errorBar}>
          <Icon name="alert" size={15} /> {error}
        </div>
      )}

      {/* ── MAIN TIMELINE AREA ───────────────────────────────────────────────── */}
      <div className={styles.body}>

        {/* Left: Lane headers */}
        <div className={styles.laneHeaders} style={{ height: totalLaneHeight }}>
          <div className={styles.laneHeaderRuler} style={{ height: RULER_HEIGHT }}>
            <span className={styles.rulerLabel}>Lanes</span>
          </div>
          {visibleLanes.map(lane => (
            <div
              key={lane.id}
              className={styles.laneHeader}
              style={{
                height: lane.collapsed ? LANE_COLLAPSED_H : LANE_HEIGHT,
                borderLeft: `3px solid ${lane.color}`,
              }}
              onClick={() => toggleLaneCollapse(lane.id)}
            >
              <span className={styles.laneIcon}>{lane.icon}</span>
              {!lane.collapsed && <span className={styles.laneLabel}>{lane.label}</span>}
              <span className={styles.laneChevron}>{lane.collapsed ? '▸' : '▾'}</span>
            </div>
          ))}
        </div>

        {/* Right: Scrollable canvas */}
        <div
          className={styles.canvasWrapper}
          ref={containerRef}
          style={{ cursor: dragging ? 'grabbing' : 'default' }}
        >
          {loading ? (
            <div className={styles.loadingOverlay}>
              <Icon name="loader" size={32} className={styles.spin} />
              <span>Reading the chronicle…</span>
            </div>
          ) : (
            <svg
              ref={svgRef}
              className={styles.svg}
              width={totalWidth}
              height={totalLaneHeight}
              style={{ transform: `translateX(${-scrollLeft}px)` }}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              {/* ── Background lane alternating bands ── */}
              {visibleLanes.map(lane => {
                const y = (laneYOffsets[lane.id] ?? 0) - RULER_HEIGHT;
                const h = lane.collapsed ? LANE_COLLAPSED_H : LANE_HEIGHT;
                return (
                  <rect
                    key={lane.id}
                    x={0} y={y + RULER_HEIGHT}
                    width={totalWidth} height={h}
                    fill={lane.color}
                    fillOpacity={0.03}
                  />
                );
              })}

              {/* ── Grid lines ── */}
              {gridMarks.map((mark, i) => (
                <g key={i}>
                  <line
                    x1={mark.x} y1={0}
                    x2={mark.x} y2={totalLaneHeight}
                    stroke={mark.major ? 'rgba(196,144,64,0.2)' : 'rgba(196,144,64,0.07)'}
                    strokeWidth={mark.major ? 1 : 0.5}
                    strokeDasharray={mark.major ? 'none' : '3,5'}
                  />
                </g>
              ))}

              {/* ── Time ruler ── */}
              <rect x={0} y={0} width={totalWidth} height={RULER_HEIGHT}
                fill="rgba(14,12,10,0.9)" />
              <line x1={0} y1={RULER_HEIGHT} x2={totalWidth} y2={RULER_HEIGHT}
                stroke="rgba(196,144,64,0.3)" strokeWidth={1} />

              {gridMarks.filter(m => m.major).map((mark, i) => (
                <g key={i}>
                  <line
                    x1={mark.x} y1={RULER_HEIGHT - 10} x2={mark.x} y2={RULER_HEIGHT}
                    stroke="rgba(196,144,64,0.5)" strokeWidth={1}
                  />
                  <text
                    x={mark.x + 4} y={RULER_HEIGHT / 2}
                    fontSize={10}
                    fill="rgba(224,176,96,0.8)"
                    dominantBaseline="central"
                    style={{ fontFamily: 'var(--font-mono)', userSelect: 'none' }}
                  >
                    {mark.label}
                  </text>
                </g>
              ))}

              {/* ── Lane dividers ── */}
              {visibleLanes.map(lane => {
                const y = laneYOffsets[lane.id] ?? 0;
                return (
                  <line
                    key={lane.id}
                    x1={0} y1={y}
                    x2={totalWidth} y2={y}
                    stroke="rgba(196,144,64,0.12)"
                    strokeWidth={1}
                  />
                );
              })}

              {/* ── Events ── */}
              {visibleLanes.map(lane => {
                if (lane.collapsed) return null;
                const laneY = laneYOffsets[lane.id] ?? 0;
                const laneEvents = visibleEvents.filter(e => e.lane === lane.id);

                return laneEvents.map(ev => {
                  const x = getEventX(ev);
                  const dateW = ev.endDate
                    ? Math.max(80, (toAbsoluteDays(ev.endDate) - toAbsoluteDays(ev.startDate)) * pixelsPerDay)
                    : 120;

                  return (
                    <EventCard
                      key={ev.id}
                      event={ev}
                      x={x}
                      width={dateW}
                      laneY={laneY}
                      selected={selectedId === ev.id}
                      onSelect={setSelectedId}
                      onDragStart={handleDragStart}
                      onDelete={handleDelete}
                    />
                  );
                });
              })}

              {/* ── Drag ghost line ── */}
              {dragging && (
                <line
                  x1={(() => {
                    const ev = events.find(e => e.id === dragging.id);
                    return ev ? dateToX(ev.startDate, originDay, pixelsPerDay) + dragDeltaX : 0;
                  })()}
                  y1={RULER_HEIGHT}
                  x2={(() => {
                    const ev = events.find(e => e.id === dragging.id);
                    return ev ? dateToX(ev.startDate, originDay, pixelsPerDay) + dragDeltaX : 0;
                  })()}
                  y2={totalLaneHeight}
                  stroke="#f0cc8a"
                  strokeWidth={1.5}
                  strokeDasharray="4,4"
                  opacity={0.7}
                />
              )}

              {/* Click to deselect */}
              <rect
                x={0} y={0}
                width={totalWidth} height={totalLaneHeight}
                fill="transparent"
                onClick={() => setSelectedId(null)}
                style={{ pointerEvents: selectedId ? 'all' : 'none' }}
              />
            </svg>
          )}
        </div>
      </div>

      {/* ── EVENT DETAIL PANEL ───────────────────────────────────────────────── */}
      {selectedEvent && (
        <div
          className={styles.detailPanel}
          style={{ borderTop: `2px solid ${selectedEvent.color ?? '#e0b060'}` }}
        >
          <div className={styles.detailHeader}>
            <span className={styles.detailIcon}>{selectedEvent.icon}</span>
            <div className={styles.detailTitle}>
              <strong>{selectedEvent.title}</strong>
              <span className={styles.detailMeta}>
                {selectedEvent.category} · {selectedEvent.significance}
                {selectedEvent.startDate.year > 0 && (
                  <> · {toShortDisplay(selectedEvent.startDate)}</>
                )}
                {!selectedEvent.isPlayerFacing && <span className={styles.gmBadge}>GM Only</span>}
              </span>
            </div>
            <button
              className={styles.removeBtn}
              onClick={() => handleDelete(selectedEvent.id)}
              title="Remove from chronicle"
            >
              Remove from Timeline
            </button>
            <button className={styles.closeDetail} onClick={() => setSelectedId(null)}>×</button>
          </div>
          {selectedEvent.description && (
            <p className={styles.detailDesc}>{selectedEvent.description}</p>
          )}
          {(selectedEvent.tags?.length ?? 0) > 0 && (
            <div className={styles.detailTags}>
              {selectedEvent.tags!.map(t => (
                <span key={t} className={styles.tag}>{t}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── EMPTY STATE ─────────────────────────────────────────────────────── */}
      {!loading && events.length === 0 && (
        <div className={styles.emptyChronicle}>
          <div className={styles.emptyGlyph}>📜</div>
          <h3>The Chronicle Awaits</h3>
          <p>No events have been inscribed yet.</p>
          <p className={styles.emptyHint}>
            Events auto-appear when quests complete, or add them manually above.
          </p>
          <button className={styles.createBtn} onClick={() => setCreating(true)}>
            Inscribe First Event
          </button>
        </div>
      )}
    </div>
  );
}
