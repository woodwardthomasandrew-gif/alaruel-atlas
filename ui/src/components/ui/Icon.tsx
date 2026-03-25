// ui/src/components/ui/Icon.tsx — Minimal inline SVG icon set
import type { CSSProperties } from 'react';

type IconName =
  | 'map' | 'users' | 'scroll' | 'calendar' | 'clock'
  | 'network' | 'folder' | 'home' | 'plus' | 'open'
  | 'chevron-right' | 'x' | 'alert' | 'loader' | 'sword'
  | 'image' | 'pin' | 'link' | 'trash' | 'eye' | 'upload'
  | 'skull' | 'edit' | 'check' | 'chevron-down' | 'sparkles' | 'box' | 'bookmark';

const PATHS: Record<IconName, string> = {
  'map':           'M9 4L3 7v13l6-3 6 3 6-3V4l-6 3-6-3zm6 3v10M9 4v10',
  'users':         'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm9 1a3 3 0 1 0 0-6M23 21v-2a4 4 0 0 0-3-3.87',
  'scroll':        'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM14 2v6h6M16 13H8M16 17H8M10 9H8',
  'calendar':      'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
  'clock':         'M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm0 5v5l3 3',
  'network':       'M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4m0 0h18',
  'folder':        'M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z',
  'home':          'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 22V12h6v10',
  'plus':          'M12 5v14M5 12h14',
  'open':          'M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v3m-4 12h10a2 2 0 0 0 2-2v-5a2 2 0 0 0-2-2H13a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2z',
  'chevron-right': 'M9 18l6-6-6-6',
  'x':             'M18 6L6 18M6 6l12 12',
  'alert':         'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01',
  'loader':        'M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83',
  'sword':         'M14.5 17.5L3 6V3h3l11.5 11.5M13 19l6-6 1.5 1.5L14.5 20M7 7l3 3',
  'image':         'M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2zM8.5 13.5l2.5 3 3.5-4.5 4.5 6H5l3.5-4.5z',
  'pin':           'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0zM12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  'link':          'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71',
  'trash':         'M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6',
  'eye':           'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  'upload':        'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12',
  'skull':         'M12 2a9 9 0 0 0-9 9c0 3.18 1.66 5.97 4.15 7.59L7 20h2v2h2v-2h2v2h2v-2h2l-.15-1.41A9 9 0 0 0 12 2zM9 13a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm6 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z',
  'edit':          'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z',
  'check':         'M20 6L9 17l-5-5',
  'chevron-down':  'M6 9l6 6 6-6',
  // ── Added icons ────────────────────────────────────────────────────────────
  'sparkles':      'M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3zM5 17l.75 2.25L8 20l-2.25.75L5 23l-.75-2.25L2 20l2.25-.75L5 17zM19 3l.75 2.25L22 6l-2.25.75L19 9l-.75-2.25L16 6l2.25-.75L19 3z',
  'box':           'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16zM3.27 6.96L12 12.01l8.73-5.05M12 22.08V12',
  'bookmark':      'M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z',
};

interface IconProps {
  name:      IconName;
  size?:     number;
  className?: string;
  style?:    CSSProperties;
}

export function Icon({ name, size = 18, className, style }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden
    >
      <path d={PATHS[name] ?? ''} />
    </svg>
  );
}
