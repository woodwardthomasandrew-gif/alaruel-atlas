// ui/src/views/inspiration/CrystalBallView.tsx
// Enhanced: supports text visions and image asset visions side-by-side.
// Image visions include a random CSS filter applied per-asset.
// Added: swirling smoke tendrils that rise, curl, and fade inside the orb.

import styles from './CrystalBallView.module.css';
import { VisionItem } from './VisionItem';

// ── Vision union type ─────────────────────────────────────────────────────────

export interface TextVision {
  kind: 'text';
  text: string;
}

export interface ImageVision {
  kind:        'image';
  text:        string;   // asset name — shown as label and used as capture key
  imageUrl:    string;
  imageFilter: string;
  filterName:  string;
}

export type Vision = TextVision | ImageVision;

// ── Props ─────────────────────────────────────────────────────────────────────

export interface CrystalBallViewProps {
  visions:      Vision[];
  isGenerating: boolean;
  onCapture?:   (text: string) => void;
  holdMs?:      number;
}

// ── Grid placement ─────────────────────────────────────────────────────────────
// Divide the orb interior into a 3×3 grid of cells (ignoring the 4 corners
// which are outside the circle). Each vision is assigned a cell in sequence
// so simultaneous visions never overlap. Small jitter keeps it organic.

const GRID_CELLS: [number, number][] = [
  [50, 28],   // top-centre
  [30, 50],   // mid-left
  [50, 50],   // mid-centre
  [70, 50],   // mid-right
  [50, 72],   // bottom-centre
  [34, 36],   // upper-left inner
  [66, 36],   // upper-right inner
  [34, 64],   // lower-left inner
  [66, 64],   // lower-right inner
];

function jitter(base: number, range: number, seed: number): number {
  const x = Math.sin(seed) * 10000;
  const r = x - Math.floor(x);
  return base + (r - 0.5) * range;
}

const STAGGER_MS = 1600;

// ─────────────────────────────────────────────────────────────────────────────

export function CrystalBallView({ visions, isGenerating, onCapture, holdMs }: CrystalBallViewProps) {
  return (
    <div className={`${styles.orb} ${isGenerating ? styles.orbActive : ''}`}>
      {/* Glow ring */}
      <div className={styles.glowRing} />

      {/* Four mist layers */}
      <div className={styles.mist} />
      <div className={`${styles.mist} ${styles.mistSlow}`} />
      <div className={`${styles.mist} ${styles.mistGold}`} />
      <div className={`${styles.mist} ${styles.mistDeep}`} />

      {/* Swirling smoke tendrils */}
      <div className={styles.smokeContainer}>
        <div className={`${styles.smoke} ${styles.smoke1}`} />
        <div className={`${styles.smoke} ${styles.smoke2}`} />
        <div className={`${styles.smoke} ${styles.smoke3}`} />
        <div className={`${styles.smoke} ${styles.smoke4}`} />
        <div className={`${styles.smoke} ${styles.smoke5}`} />
        <div className={`${styles.smoke} ${styles.smoke6}`} />
      </div>

      {/* Vignette */}
      <div className={styles.vignette} />

      {/* Vision area */}
      <div className={styles.visionArea}>
        {visions.length === 0 && !isGenerating && (
          <span className={styles.idleHint}>Gaze into the orb…</span>
        )}
        {isGenerating && visions.length === 0 && (
          <span className={styles.summoning}>Summoning visions…</span>
        )}

        {visions.slice(0, 1).map((vision, idx) => {
          const cell = GRID_CELLS[idx % GRID_CELLS.length];
          const seed = idx * 137.5 + vision.text.length;
          const left = jitter(cell[0], 6, seed);
          const top  = jitter(cell[1], 5, seed + 1);

          if (vision.kind === 'image') {
            return (
              <VisionItem
                key={`img-${vision.text}-${idx}`}
                text={vision.text}
                delayMs={idx * STAGGER_MS}
                holdMs={holdMs}
                left={left}
                top={top}
                onCapture={onCapture}
                imageUrl={vision.imageUrl}
                imageFilter={vision.imageFilter}
                filterName={vision.filterName}
              />
            );
          }

          return (
            <VisionItem
              key={`txt-${vision.text}-${idx}`}
              text={vision.text}
              delayMs={idx * STAGGER_MS}
              holdMs={holdMs}
              left={left}
              top={top}
              onCapture={onCapture}
            />
          );
        })}
      </div>

      {/* Shine arcs */}
      <div className={styles.shine} />
      <div className={styles.shineInner} />
    </div>
  );
}
