// ui/src/views/inspiration/InspirationView.tsx
// Auto-generating: fetches visions on mount and on a repeating interval.
// Speed slider controls how quickly visions cycle.
// Capture functionality unchanged.

import { useState, useCallback, useEffect, useRef } from 'react';
import { atlas } from '../../bridge/atlas';
import { useCampaignStore } from '../../store/campaign.store';
import { Icon } from '../../components/ui/Icon';
import { CrystalBallView } from './CrystalBallView';
import styles from './InspirationView.module.css';

// ── Types ─────────────────────────────────────────────────────────────────────

interface InspirationResult {
  text: string;
  category?: string;
}

interface CapturedVision {
  id:   number;
  text: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function mapResults(raw: InspirationResult[]): string[] {
  return raw.map(r => r.text).filter(Boolean);
}

// ── Speed settings ────────────────────────────────────────────────────────────
// Slider goes 1–5. Each level defines:
//   intervalMs — how long between fetching a new batch
//   holdMs     — how long each vision lingers (passed down to VisionItem)

const SPEED_LEVELS = [
  { label: 'Slow',    intervalMs: 18000, holdMs: 6000 },  // 1
  { label: 'Gentle',  intervalMs: 12000, holdMs: 4500 },  // 2
  { label: 'Steady',  intervalMs:  8000, holdMs: 3400 },  // 3 — default
  { label: 'Brisk',   intervalMs:  5000, holdMs: 2200 },  // 4
  { label: 'Rapid',   intervalMs:  3000, holdMs: 1400 },  // 5
];

// ── Category options ──────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: 'any',       label: 'Any',         icon: '✨' },
  { value: 'plot',      label: 'Plot Hook',   icon: '📜' },
  { value: 'npc',       label: 'NPC Trait',   icon: '🧙' },
  { value: 'location',  label: 'Location',    icon: '🗺️' },
  { value: 'encounter', label: 'Encounter',   icon: '⚔️' },
  { value: 'item',      label: 'Magic Item',  icon: '💎' },
  { value: 'event',     label: 'World Event', icon: '🌩️' },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function InspirationView() {
  const campaign = useCampaignStore(s => s.campaign);

  const [visions,         setVisions]        = useState<string[]>([]);
  const [category,        setCategory]       = useState('any');
  const [error,           setError]          = useState<string | null>(null);
  const [speed,           setSpeed]          = useState(3);           // 1–5
  const [capturedVisions, setCapturedVisions] = useState<CapturedVision[]>([]);
  const [captureSeq,      setCaptureSeq]     = useState(0);

  const speedCfg    = SPEED_LEVELS[speed - 1];
  const fetchingRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Keep a ref so the interval callback always reads the latest intervalMs
  // without needing to be recreated on every speed change.
  const speedCfgRef = useRef(speedCfg);
  useEffect(() => { speedCfgRef.current = speedCfg; }, [speedCfg]);

  // ── Fetch one batch ────────────────────────────────────────────────────────
  const fetchBatch = useCallback(async () => {
    if (!campaign || fetchingRef.current) return;
    fetchingRef.current = true;
    setError(null);
    try {
      const raw = await atlas.inspiration.generate({
        campaignId: campaign.id,
        category:   category === 'any' ? undefined : category,
        count:      3,
      }) as InspirationResult[];
      setVisions(mapResults(raw));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      fetchingRef.current = false;
    }
  }, [campaign, category]);

  // ── Auto-cycle ─────────────────────────────────────────────────────────────
  // Fetch immediately on mount/category/speed change, then repeat at interval.
  // Using a self-scheduling setTimeout (instead of setInterval) means each new
  // cycle reads the *current* intervalMs from the ref, so speed changes take
  // effect on the very next cycle rather than waiting for the old interval to fire.
  useEffect(() => {
    if (!campaign) return;

    let cancelled = false;

    async function cycle() {
      await fetchBatch();
      if (cancelled) return;
      const delay = speedCfgRef.current.intervalMs;
      intervalRef.current = setTimeout(() => { if (!cancelled) cycle(); }, delay);
    }

    cycle();

    return () => {
      cancelled = true;
      if (intervalRef.current) clearTimeout(intervalRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaign?.id, category, speed]);

  // ── Capture ────────────────────────────────────────────────────────────────
  const handleCapture = useCallback((text: string) => {
    setCapturedVisions(prev => {
      if (prev.some(v => v.text === text)) return prev;
      const id = captureSeq;
      setCaptureSeq(s => s + 1);
      return [{ id, text }, ...prev];
    });
  }, [captureSeq]);

  const removeCapture = (id: number) => {
    setCapturedVisions(prev => prev.filter(v => v.id !== id));
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className={styles.root}>
      <header className={styles.toolbar}>
        <h1 className={styles.title}>
          <Icon name="sparkles" size={18} />
          Inspiration
        </h1>
        {campaign && (
          <span className={styles.campaignBadge}>{campaign.name}</span>
        )}
      </header>

      <div className={styles.body}>
        {/* ── Controls sidebar ── */}
        <aside className={styles.controls}>

          <label className={styles.controlLabel}>
            Category
            <select
              className={styles.select}
              value={category}
              onChange={e => setCategory(e.target.value)}
            >
              {CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>
                  {c.icon} {c.label}
                </option>
              ))}
            </select>
          </label>

          {/* ── Speed slider ── */}
          <label className={styles.controlLabel}>
            Vision Speed
            <div className={styles.sliderRow}>
              <span className={styles.sliderMin}>🐢</span>
              <input
                type="range"
                min={1}
                max={5}
                step={1}
                value={speed}
                onChange={e => setSpeed(Number(e.target.value))}
                className={styles.slider}
              />
              <span className={styles.sliderMax}>⚡</span>
            </div>
            <span className={styles.sliderLabel}>{speedCfg.label}</span>
          </label>

          {!campaign && <p className={styles.hint}>Open a campaign to begin.</p>}
          {error      && <p className={styles.error}>{error}</p>}

          {/* ── Captured Visions Panel ── */}
          <div className={styles.capturedPanel}>
            <h3 className={styles.capturedTitle}>
              <Icon name="bookmark" size={13} />
              Captured
              {capturedVisions.length > 0 && (
                <span className={styles.capturedCount}>{capturedVisions.length}</span>
              )}
            </h3>
            {capturedVisions.length === 0 && (
              <p className={styles.capturedEmpty}>Click a vision in the orb to save it here.</p>
            )}
            {capturedVisions.map(cv => (
              <div key={cv.id} className={styles.capturedItem}>
                <span className={styles.capturedText}>{cv.text}</span>
                <button
                  className={styles.capturedRemove}
                  onClick={() => removeCapture(cv.id)}
                  title="Remove"
                >
                  <Icon name="x" size={11} />
                </button>
              </div>
            ))}
            {capturedVisions.length > 0 && (
              <button
                className={styles.capturedClearAll}
                onClick={() => setCapturedVisions([])}
              >
                Clear all
              </button>
            )}
          </div>
        </aside>

        {/* ── Crystal Ball ── */}
        <div className={styles.orbWrapper}>
          <CrystalBallView
            visions={visions}
            isGenerating={false}
            onCapture={handleCapture}
            holdMs={speedCfg.holdMs}
          />
          <p className={styles.orbCaption}>
            {campaign ? 'Click a vision to capture it' : 'Open a campaign to begin'}
          </p>
        </div>
      </div>
    </div>
  );
}
