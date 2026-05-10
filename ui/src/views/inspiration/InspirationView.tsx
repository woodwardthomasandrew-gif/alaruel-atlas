// ui/src/views/inspiration/InspirationView.tsx
// Auto-generating: fetches visions on mount and on a repeating interval.
// Speed slider controls how quickly visions cycle.
// Image assets from the campaign are blended into the vision pool;
// each image gets a random CSS filter applied when displayed.

import { useState, useCallback, useEffect, useRef } from 'react';
import { atlas } from '../../bridge/atlas';
import { useCampaignStore } from '../../store/campaign.store';
import { Icon } from '../../components/ui/Icon';
import { CrystalBallView } from './CrystalBallView';
import type { Vision, ImageVision } from './CrystalBallView';
import styles from './InspirationView.module.css';

// ── Types ──────────────────────────────────────────────────────────────────────

interface InspirationResult {
  text:        string;
  category?:   string;
  tags?:       string[];
  imageUrl?:   string;
  imageFilter?: string;
}

interface ImageAsset {
  id:          string;
  name:        string;
  virtualPath: string;
  category:    string;
  imageUrl:    string;
  imageFilter: string;
  filterName:  string;
}

interface CapturedVision {
  id:       number;
  text:     string;
  imageUrl?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

type MaterializationMode = 'text' | 'pictogram' | 'image';

const CATEGORY_PICTOGRAMS: Record<string, string[]> = {
  any:       ['✦', '✧', '☽', '☼', '✶', '⚝', '◈'],
  plot:      ['📜', '🕯️', '🗝️', '⚖️', '⏳', '🔮', '🜂'],
  npc:       ['🜁', '👁️', '🧿', '🗡️', '🫀', '☗', '♜'],
  location:  ['🏰', '🗺️', '🜃', '⛰️', '🌫️', '🛖', '🜄'],
  encounter: ['⚔️', '🛡️', '🩸', '🕸️', '🐺', '☠️', '♞'],
  item:      ['💎', '📿', '🔑', '🧭', '📖', '🧪', '🜍'],
  name:      ['✶', '✺', '☾', '✹', '♕', '☉', '⚜'],
};

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function mapPictogram(result: InspirationResult): string {
  const source = CATEGORY_PICTOGRAMS[result.category ?? 'any'] ?? CATEGORY_PICTOGRAMS.any;
  const seed   = hashString(`${result.text}-${result.category ?? 'any'}`);
  const first  = source[seed % source.length];
  const second = source[(seed >> 3) % source.length];
  return `${first}${second}`;
}

/** Pick a random element from an array */
function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Convert raw InspirationResult[] + optional image pool into Vision[].
 * In 'image' mode each vision is randomly drawn from the image asset pool
 * (falling back to text if no images exist). In other modes images are never shown.
 */
function buildVisions(
  raw:       InspirationResult[],
  mode:      MaterializationMode,
  imagePool: ImageAsset[],
): Vision[] {
  if (mode === 'image' && imagePool.length > 0) {
    // Pick one random image from the pool
    const asset = pickRandom(imagePool);
    const vision: ImageVision = {
      kind:        'image',
      text:        asset.name,
      imageUrl:    asset.imageUrl,
      imageFilter: asset.imageFilter,
      filterName:  asset.filterName,
    };
    return [vision];
  }

  if (mode === 'pictogram') {
    return raw.map(r => ({ kind: 'text' as const, text: mapPictogram(r) }));
  }

  // 'text' (default)
  return raw
    .map(r => r.text)
    .filter(Boolean)
    .map(t => ({ kind: 'text' as const, text: t }));
}

// ── Speed settings ─────────────────────────────────────────────────────────────

const SPEED_LEVELS = [
  { label: 'Slow',    intervalMs: 18000, holdMs: 6000 },  // 1
  { label: 'Gentle',  intervalMs: 12000, holdMs: 4500 },  // 2
  { label: 'Steady',  intervalMs:  8000, holdMs: 3400 },  // 3 — default
  { label: 'Brisk',   intervalMs:  5000, holdMs: 2200 },  // 4
  { label: 'Rapid',   intervalMs:  3000, holdMs: 1400 },  // 5
];

// ── Category options ───────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: 'any',       label: 'Any',          icon: '✨' },
  { value: 'plot',      label: 'Plot Hook',    icon: '📜' },
  { value: 'npc',       label: 'NPC Trait',    icon: '🧙' },
  { value: 'location',  label: 'Location',     icon: '🗺️' },
  { value: 'encounter', label: 'Encounter',    icon: '⚔️' },
  { value: 'item',      label: 'Magic Item',   icon: '💎' },
  { value: 'name',      label: 'Fantasy Name', icon: '✶' },
];

// ── Component ──────────────────────────────────────────────────────────────────

export default function InspirationView() {
  const campaign = useCampaignStore(s => s.campaign);

  const [visions,          setVisions]         = useState<Vision[]>([]);
  const [category,         setCategory]        = useState('any');
  const [materialization,  setMaterialization] = useState<MaterializationMode>('text');
  const [error,            setError]           = useState<string | null>(null);
  const [speed,            setSpeed]           = useState(3);
  const [capturedVisions,  setCapturedVisions] = useState<CapturedVision[]>([]);
  const [captureSeq,       setCaptureSeq]      = useState(0);
  const [imagePool,        setImagePool]       = useState<ImageAsset[]>([]);
  const [imagePoolLoaded,  setImagePoolLoaded] = useState(false);

  const speedCfg    = SPEED_LEVELS[speed - 1];
  const fetchingRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const speedCfgRef = useRef(speedCfg);
  useEffect(() => { speedCfgRef.current = speedCfg; }, [speedCfg]);

  // Keep latest values accessible in the cycle closure without restarting it
  const materializationRef = useRef(materialization);
  useEffect(() => { materializationRef.current = materialization; }, [materialization]);
  const imagePoolRef = useRef<ImageAsset[]>([]);
  useEffect(() => { imagePoolRef.current = imagePool; }, [imagePool]);

  // ── Load image pool once per campaign ───────────────────────────────────────
  useEffect(() => {
    if (!campaign) { setImagePool([]); setImagePoolLoaded(false); return; }
    setImagePoolLoaded(false);
    const listImages = atlas.inspiration.listImages;
    if (typeof listImages !== 'function') {
      setImagePool([]);
      setImagePoolLoaded(true);
      return;
    }
    listImages({ campaignId: campaign.id })
      .then((assets) => {
        setImagePool(assets as ImageAsset[]);
        setImagePoolLoaded(true);
      })
      .catch((err) => {
        // Non-fatal — fall back to text-only mode
        console.warn('inspiration: could not load image pool', err);
        setImagePool([]);
        setImagePoolLoaded(true);
      });
  }, [campaign?.id]);

  // ── Fetch one batch ──────────────────────────────────────────────────────────
  const fetchBatch = useCallback(async () => {
    if (!campaign || fetchingRef.current) return;
    fetchingRef.current = true;
    setError(null);
    try {
      const mode = materializationRef.current;
      const pool = imagePoolRef.current;

      // Image mode: no need to hit the generator — just pick from the pool
      if (mode === 'image' && pool.length > 0) {
        const asset = pickRandom(pool);
        const vision: Vision = {
          kind:        'image',
          text:        asset.name,
          imageUrl:    asset.imageUrl,
          imageFilter: asset.imageFilter,
          filterName:  asset.filterName,
        };
        setVisions([vision]);
        return;
      }

      // Text / pictogram mode: call the generator
      const raw = await atlas.inspiration.generate({
        campaignId: campaign.id,
        category:   category === 'any' ? undefined : category,
        count:      1,
      }) as InspirationResult[];

      setVisions(buildVisions(raw, mode, pool));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      fetchingRef.current = false;
    }
  }, [campaign, category]); // materializationRef & imagePoolRef are stable refs — no need in deps

  // ── Auto-cycle ───────────────────────────────────────────────────────────────
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
  }, [campaign?.id, category, speed, materialization]);

  // ── Capture ──────────────────────────────────────────────────────────────────
  const handleCapture = useCallback((text: string) => {
    // Find the current vision's image URL if it's an image vision
    const currentVision = visions.find(v => v.text === text);
    const imageUrl = currentVision?.kind === 'image' ? currentVision.imageUrl : undefined;

    setCapturedVisions(prev => {
      if (prev.some(v => v.text === text)) return prev;
      const id = captureSeq;
      setCaptureSeq(s => s + 1);
      return [{ id, text, imageUrl }, ...prev];
    });
  }, [captureSeq, visions]);

  const removeCapture = (id: number) => {
    setCapturedVisions(prev => prev.filter(v => v.id !== id));
  };

  const hasImages = imagePool.length > 0;

  // ── Render ───────────────────────────────────────────────────────────────────
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
              disabled={materialization === 'image'}
            >
              {CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>
                  {c.icon} {c.label}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.controlLabel}>
            Materialization
            <select
              className={styles.select}
              value={materialization}
              onChange={e => setMaterialization(e.target.value as MaterializationMode)}
            >
              <option value="text">Text Visions</option>
              <option value="pictogram">Pictograms</option>
              <option value="image" disabled={!hasImages}>
                {hasImages
                  ? `🖼 Asset Images (${imagePool.length})`
                  : '🖼 Asset Images (none imported)'}
              </option>
            </select>
          </label>

          {materialization === 'image' && hasImages && (
            <p className={styles.imageHint}>
              Showing {imagePool.length} image{imagePool.length !== 1 ? 's' : ''} from your asset
              library — each with a random mystical filter.
            </p>
          )}

          {materialization === 'image' && !hasImages && imagePoolLoaded && (
            <p className={styles.hint}>
              No image assets found. Import maps or portraits in the Assets panel first.
            </p>
          )}

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
                {cv.imageUrl && (
                  <img
                    src={cv.imageUrl}
                    alt={cv.text}
                    className={styles.capturedThumb}
                  />
                )}
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
