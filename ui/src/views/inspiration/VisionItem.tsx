// ui/src/views/inspiration/VisionItem.tsx
// Enhanced: floating position within the orb, hover pause, click-to-capture,
// randomised size/opacity/animation timing. holdMs driven by speed slider.

import { useEffect, useRef, useState, useMemo } from 'react';
import styles from './VisionItem.module.css';

export interface VisionItemProps {
  text: string;
  /** ms before this item starts appearing (stagger offset) */
  delayMs: number;
  /** how long the vision stays fully visible — controlled by speed slider */
  holdMs?: number;
  /** called once the full fade-out completes */
  onDone?: () => void;
  /** called when the user clicks to capture this vision */
  onCapture?: (text: string) => void;
}

type Phase = 'waiting' | 'in' | 'hold' | 'out' | 'done';

const FADE_IN_MS  = 900;
const FADE_OUT_MS = 1200;
const DEFAULT_HOLD_MS = 3400;

// Deterministic pseudo-random from text seed so values are stable across re-renders
function seededRand(seed: number, offset: number): number {
  const x = Math.sin(seed + offset) * 10000;
  return x - Math.floor(x);
}

export function VisionItem({ text, delayMs, holdMs = DEFAULT_HOLD_MS, onDone, onCapture }: VisionItemProps) {
  const [phase,    setPhase]    = useState<Phase>('waiting');
  const [hovered,  setHovered]  = useState(false);
  const [captured, setCaptured] = useState(false);
  const phaseRef   = useRef<Phase>('waiting');
  const timersRef  = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Stable random seed derived from text content
  const seed = useMemo(() => {
    let h = 0;
    for (let i = 0; i < text.length; i++) h = (Math.imul(31, h) + text.charCodeAt(i)) | 0;
    return Math.abs(h);
  }, [text]);

  const rng = (offset: number) => seededRand(seed, offset);

  // Randomised position + style — constrained to inner 55% of orb
  const left        = 22  + rng(1) * 56;
  const top         = 20  + rng(2) * 60;
  const fontSize    = 0.78 + rng(3) * 0.38;
  const baseOpacity = 0.72 + rng(4) * 0.28;
  const floatDur    = 5   + rng(5) * 5;
  const floatDx     = (rng(6) - 0.5) * 18;
  const floatDy     = 8   + rng(7) * 10;

  const cssVars = {
    '--v-left':      `${left}%`,
    '--v-top':       `${top}%`,
    '--v-font-size': `${fontSize}rem`,
    '--v-opacity':   `${baseOpacity}`,
    '--v-float-dur': `${floatDur}s`,
    '--v-float-dx':  `${floatDx}px`,
    '--v-float-dy':  `${floatDy}px`,
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

  // Initial lifecycle — uses holdMs from prop so speed slider takes effect
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

  // Hover: pause fade-out while mouse is over, resume on leave
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
    schedulePhase('out',  500);
    schedulePhase('done', 500 + FADE_OUT_MS);
  }

  if (phase === 'waiting' || phase === 'done') return null;

  return (
    <span
      className={[
        styles.vision,
        styles[phase],
        hovered  ? styles.hovered  : '',
        captured ? styles.captured : '',
      ].filter(Boolean).join(' ')}
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
