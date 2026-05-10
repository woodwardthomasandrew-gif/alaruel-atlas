// ui/src/views/inspiration/VisionItem.tsx
// Renders a single vision inside the crystal ball — either text or an image asset.
// Position supplied by CrystalBallView grid logic (left/top props).
// Fade uses a CSS keyframe animation so the browser handles easing smoothly.

import { useEffect, useRef, useState, useMemo } from 'react';
import styles from './VisionItem.module.css';

export interface VisionItemProps {
  text: string;
  /** ms before this item starts appearing (stagger offset) */
  delayMs: number;
  /** how long the vision stays fully visible — controlled by speed slider */
  holdMs?: number;
  /** position within the orb supplied by CrystalBallView — avoids overlap */
  left?: number;
  top?: number;
  /** called once the full fade-out completes */
  onDone?: () => void;
  /** called when the user clicks to capture this vision */
  onCapture?: (text: string) => void;
  // ── Image support ──────────────────────────────────────────────────────────
  /** If provided, render an image rather than text */
  imageUrl?: string;
  /** CSS filter string to apply to the image */
  imageFilter?: string;
  /** Human-readable filter name (shown as tooltip) */
  filterName?: string;
}

type Phase = 'waiting' | 'in' | 'hold' | 'out' | 'done';

const FADE_IN_MS      = 1400;
const FADE_OUT_MS     = 1600;
const DEFAULT_HOLD_MS = 3400;

function seededRand(seed: number, offset: number): number {
  const x = Math.sin(seed + offset) * 10000;
  return x - Math.floor(x);
}

export function VisionItem({
  text,
  delayMs,
  holdMs = DEFAULT_HOLD_MS,
  left,
  top,
  onDone,
  onCapture,
  imageUrl,
  imageFilter,
  filterName,
}: VisionItemProps) {
  const [phase,    setPhase]    = useState<Phase>('waiting');
  const [hovered,  setHovered]  = useState(false);
  const [captured, setCaptured] = useState(false);
  const phaseRef   = useRef<Phase>('waiting');
  const timersRef  = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Stable per-text random values for size, opacity, float behaviour
  const seed = useMemo(() => {
    let h = 0;
    for (let i = 0; i < text.length; i++) h = (Math.imul(31, h) + text.charCodeAt(i)) | 0;
    return Math.abs(h);
  }, [text]);

  const rng = (offset: number) => seededRand(seed, offset);

  const fontSize    = 0.80 + rng(3) * 0.30;   // 0.80rem–1.10rem
  const baseOpacity = 0.78 + rng(4) * 0.22;   // 0.78–1.0
  const floatDur    = 6   + rng(5) * 5;        // 6s–11s
  const floatDx     = (rng(6) - 0.5) * 14;    // ±7px horizontal
  const floatDy     = 7   + rng(7) * 9;        // 7px–16px vertical

  const posLeft = left ?? 50;
  const posTop  = top  ?? 50;

  const cssVars = {
    '--v-left':      `${posLeft}%`,
    '--v-top':       `${posTop}%`,
    '--v-font-size': `${fontSize}rem`,
    '--v-opacity':   `${baseOpacity}`,
    '--v-float-dur': `${floatDur}s`,
    '--v-float-dx':  `${floatDx}px`,
    '--v-float-dy':  `${floatDy}px`,
    '--v-fade-in':   `${FADE_IN_MS}ms`,
    '--v-fade-out':  `${FADE_OUT_MS}ms`,
  } as React.CSSProperties;

  function clearAll() {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }

  function schedulePhase(p: Phase, ms: number) {
    const t = setTimeout(() => {
      setPhase(p);
      phaseRef.current = p;
      if (p === 'done') onDone?.();
    }, ms);
    timersRef.current.push(t);
  }

  useEffect(() => {
    setPhase('waiting');
    phaseRef.current = 'waiting';
    setCaptured(false);
    clearAll();

    schedulePhase('in',   delayMs);
    schedulePhase('hold', delayMs + FADE_IN_MS);
    schedulePhase('out',  delayMs + FADE_IN_MS + holdMs);
    schedulePhase('done', delayMs + FADE_IN_MS + holdMs + FADE_OUT_MS);

    return clearAll;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, delayMs, holdMs]);

  // Hover: cancel fade-out timers while hovered, reschedule on leave
  useEffect(() => {
    const cur = phaseRef.current;
    if (cur !== 'hold' && cur !== 'out') return;
    if (hovered) {
      clearAll();
    } else {
      schedulePhase('out',  200);
      schedulePhase('done', 200 + FADE_OUT_MS);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hovered]);

  function handleCapture() {
    if (captured) return;
    setCaptured(true);
    onCapture?.(text);
    clearAll();
    schedulePhase('out',  400);
    schedulePhase('done', 400 + FADE_OUT_MS);
  }

  if (phase === 'waiting' || phase === 'done') return null;

  const classNames = [
    styles.vision,
    imageUrl ? styles.visionImage : styles.visionText,
    styles[phase],
    hovered  ? styles.hovered  : '',
    captured ? styles.captured : '',
  ].filter(Boolean).join(' ');

  // ── Image vision ────────────────────────────────────────────────────────────
  if (imageUrl) {
    return (
      <div
        className={classNames}
        style={cssVars}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={handleCapture}
        title={filterName ? `${text} · ${filterName} filter — click to capture` : `${text} — click to capture`}
      >
        <img
          src={imageUrl}
          alt={text}
          className={styles.visionImg}
          style={{ filter: imageFilter || undefined }}
          draggable={false}
        />
        <span className={styles.visionImgLabel}>{text}</span>
      </div>
    );
  }

  // ── Text vision ─────────────────────────────────────────────────────────────
  return (
    <span
      className={classNames}
      style={cssVars}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={handleCapture}
      title="Click to capture"
    >
      {text}
    </span>
  );
}
