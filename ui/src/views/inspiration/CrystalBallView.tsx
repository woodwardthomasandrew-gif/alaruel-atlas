// ui/src/views/inspiration/CrystalBallView.tsx
// Enhanced: larger orb, grid-cell placement to prevent text overlap,
// onCapture and holdMs wired through to VisionItem.

import styles from './CrystalBallView.module.css';
import { VisionItem } from './VisionItem';

export interface CrystalBallViewProps {
  visions: string[];
  isGenerating: boolean;
  onCapture?: (text: string) => void;
  holdMs?: number;
}

const STAGGER_MS = 1600;

// ── Overlap prevention ────────────────────────────────────────────────────────
// Divide the orb interior into a 3×3 grid of cells (ignoring the 4 corners
// which are outside the circle). That leaves 7 usable cells. Each vision is
// assigned a cell in sequence, so up to 7 simultaneous visions never overlap.
// Within each cell the position is slightly randomised for a natural look.

// Centre points of each cell as % of the orb area (left%, top%)
// Skip corners (0,0), (2,0), (0,2), (2,2) — they fall outside the circle.
const GRID_CELLS: [number, number][] = [
  // row 0
  [50, 22],   // top-centre
  // row 1
  [22, 50],   // mid-left
  [50, 50],   // mid-centre
  [78, 50],   // mid-right
  // row 2
  [50, 78],   // bottom-centre
  // extra cells at diagonals inside the circle
  [30, 32],   // upper-left inner
  [70, 32],   // upper-right inner
  [30, 68],   // lower-left inner
  [70, 68],   // lower-right inner
];

// Small random jitter within a cell so items don't always sit dead-centre
function jitter(base: number, range: number, seed: number): number {
  const x = Math.sin(seed) * 10000;
  const r = x - Math.floor(x); // 0–1
  return base + (r - 0.5) * range;
}

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

      {/* Vignette */}
      <div className={styles.vignette} />

      {/* Vision text area */}
      <div className={styles.visionArea}>
        {visions.length === 0 && !isGenerating && (
          <span className={styles.idleHint}>Gaze into the orb…</span>
        )}
        {isGenerating && visions.length === 0 && (
          <span className={styles.summoning}>Summoning visions…</span>
        )}

        {visions.map((text, idx) => {
          // Assign a grid cell by index, cycling if there are more visions than cells
          const cell = GRID_CELLS[idx % GRID_CELLS.length];
          // Jitter seed unique per text+index so same text in different slots moves
          const seed = idx * 137.5 + text.length;
          const left = jitter(cell[0], 10, seed);
          const top  = jitter(cell[1],  8, seed + 1);

          return (
            <VisionItem
              key={`${text}-${idx}`}
              text={text}
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
