// ui/src/views/inspiration/CrystalBallView.tsx
// Enhanced: 4 mist layers, vignette ring, onCapture wired to VisionItem,
// items now overlap freely (absolute positioned) instead of stacking in a list.

import styles from './CrystalBallView.module.css';
import { VisionItem } from './VisionItem';

export interface CrystalBallViewProps {
  /** Inspiration strings produced by the existing generator */
  visions: string[];
  /** True while the generator is running — orb glows brighter */
  isGenerating: boolean;
  /** Called when a vision is clicked to capture */
  onCapture?: (text: string) => void;
  /** How long each vision lingers — driven by speed slider */
  holdMs?: number;
}

// Stagger so items don't all appear simultaneously
const STAGGER_MS = 1600;

export function CrystalBallView({ visions, isGenerating, onCapture, holdMs }: CrystalBallViewProps) {
  return (
    <div className={`${styles.orb} ${isGenerating ? styles.orbActive : ''}`}>
      {/* Glow ring */}
      <div className={styles.glowRing} />

      {/* Four mist layers — each with different speed, color, position */}
      <div className={styles.mist} />
      <div className={`${styles.mist} ${styles.mistSlow}`} />
      <div className={`${styles.mist} ${styles.mistGold}`} />
      <div className={`${styles.mist} ${styles.mistDeep}`} />

      {/* Vignette — darkens the edges for depth */}
      <div className={styles.vignette} />

      {/* Vision text area — items are absolute positioned inside here */}
      <div className={styles.visionArea}>
        {visions.length === 0 && !isGenerating && (
          <span className={styles.idleHint}>Gaze into the orb…</span>
        )}
        {isGenerating && visions.length === 0 && (
          <span className={styles.summoning}>Summoning visions…</span>
        )}
        {visions.map((text, idx) => (
          <VisionItem
            key={`${text}-${idx}`}
            text={text}
            delayMs={idx * STAGGER_MS}
            holdMs={holdMs}
            onCapture={onCapture}
          />
        ))}
      </div>

      {/* Inner shine arc */}
      <div className={styles.shine} />
      {/* Second smaller shine for extra depth */}
      <div className={styles.shineInner} />
    </div>
  );
}
