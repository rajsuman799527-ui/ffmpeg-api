import React from 'react';
import { interpolate, spring } from 'remotion';
import { loadFont } from '@remotion/google-fonts/Inter';
import { useTheme } from './theme';
import { F } from './fonts';

// Hindi text needs the Devanagari font too, otherwise it turns into black boxes
export const FONT = loadFont('normal', { weights: ['500', '700', '800'], subsets: ['latin'] }).fontFamily + ', ' + F.deva + ', sans-serif';

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export const lerp = (f: number, a: number, b: number, from: number, to: number) =>
  interpolate(f, [a, b], [from, to], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

export const pop = (frame: number, fps: number, delay = 0) =>
  spring({ frame: frame - delay, fps, config: { damping: 13, stiffness: 170, mass: 0.7 } });

/** Entry animation for a block. The same block never jumps: it starts invisible and ends at rest. */
export function enter(anim: string, frame: number, fps: number, delay = 0): React.CSSProperties {
  const s = pop(frame, fps, delay);
  if (anim === 'slide_up') return { opacity: clamp01(s * 1.4), transform: `translateY(${(1 - s) * 44}px)` };
  if (anim === 'tick') return { opacity: clamp01(s * 2), transform: `scale(${0.7 + 0.3 * s})` };
  return { opacity: clamp01(s * 1.6), transform: `scale(${0.8 + 0.2 * s})` };
}

export const Pill: React.FC<{ text: string; bg?: string; color?: string; size?: number; style?: React.CSSProperties }> = ({ text, bg, color, size = 30, style }) => {
  const T = useTheme();
  return <div style={{ background: bg ?? T.pillBg, color: color ?? T.pillFg, fontFamily: FONT, fontWeight: 800, fontSize: size, padding: '12px 28px', borderRadius: 999, whiteSpace: 'nowrap', lineHeight: 1.1, boxShadow: T.shadow, ...style }}>{text}</div>;
};

export const useCard = (extra?: React.CSSProperties): React.CSSProperties => {
  const T = useTheme();
  return { background: T.card, border: `2px solid ${T.line}`, borderRadius: 28, boxShadow: T.shadow, ...extra };
};

const P: Record<string, string> = {
  rupee: 'M6 3h12M6 8h12M6 13l8.5 8M6 13h3M9 13c6.667 0 6.667-10 0-10',
  chat: 'M4 5h16v11H9l-5 4z',
  mic: 'M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3zM19 10v2a7 7 0 0 1-14 0v-2M12 19v3',
  camera: 'M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  video: 'M3 5h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM23 7l-6 5 6 5z',
  star: 'M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z',
  heart: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21.2l7.8-7.7 1-1.1a5.5 5.5 0 0 0 0-7.8z',
  bolt: 'M13 2L5 13h6l-1 9 8-11h-6z',
  check: 'M5 12.5l4.5 4.5L19 7',
  x: 'M18 6L6 18M6 6l12 12',
  user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  bot: 'M12 8V4H8M4 8h16v12H4zM2 14h2M20 14h2M9 13v2M15 13v2',
  doc: 'M6 3h9l4 4v14H6zM9 12h7M9 16h7',
  chart: 'M3 3v18h18M7 15l4-4 3 3 5-6',
  bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0',
  globe: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM2 12h20M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20',
  lock: 'M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3',
  mail: 'M3 6h18v13H3zM3 7l9 7 9-7',
  gift: 'M20 12v10H4V12M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z',
  fire: 'M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.4-.5-2-1-3-1.1-2.1-.2-4.1 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.2.4-2.4 1-3 0 1.7 1.1 2.5 2.5 2.5z',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2',
  youtube: 'M2.5 17a24.1 24.1 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.6 49.6 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.1 24.1 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.6 49.6 0 0 1-16.2 0A2 2 0 0 1 2.5 17zM10 15l5-3-5-3z',
  music: 'M9 18V5l12-2v13M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 19a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  idea: 'M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.3h6c0-1 .4-1.8 1-2.3A7 7 0 0 0 12 2z',
};

export const Icon: React.FC<{ name: string; size?: number; color?: string; stroke?: number }> = ({ name, size = 56, color = '#fff', stroke = 2.2 }) => {
  const key = String(name || '').toLowerCase().trim();
  if (key === 'play') return <svg width={size} height={size} viewBox="0 0 24 24"><polygon points="7,4 20,12 7,20" fill={color} /></svg>;
  const d = P[key];
  if (!d) return <svg width={size} height={size} viewBox="0 0 24 24"><text x="12" y="18" textAnchor="middle" fontSize="16" fontWeight="800" fill={color} fontFamily={FONT}>{(key[0] || '*').toUpperCase()}</text></svg>;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
};

export const Arrow: React.FC<{ color?: string; progress?: number }> = ({ color = '#111', progress = 1 }) => (
  <svg width="44" height="24" viewBox="0 0 44 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: progress }}>
    <path d="M3 12h36M31 4l8 8-8 8" strokeDasharray="60" strokeDashoffset={60 * (1 - progress)} />
  </svg>
);
