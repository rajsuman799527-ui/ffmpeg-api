import React from 'react';
import { interpolate, spring } from 'remotion';
import { loadFont } from '@remotion/google-fonts/Inter';

export const FONT = loadFont('normal', { weights: ['500', '700', '800'], subsets: ['latin'] }).fontFamily;
export const C = { accent: '#FFD600', ink: '#111111', card: '#EFEFEF', white: '#FFFFFF', mute: '#9A9A9A', line: '#E4E4E4' };

export const pop = (frame: number, fps: number, delay = 0) =>
  spring({ frame: frame - delay, fps, config: { damping: 13, stiffness: 170, mass: 0.7 } });

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** Entry animation for a block. */
export function enter(anim: string, frame: number, fps: number, delay = 0): React.CSSProperties {
  const s = pop(frame, fps, delay);
  if (anim === 'slide_up') return { opacity: clamp01(s * 1.4), transform: 'translateY(' + (1 - s) * 40 + 'px)' };
  if (anim === 'tick') return { opacity: clamp01(s * 2), transform: 'scale(' + (0.6 + 0.4 * s) + ')' };
  return { opacity: clamp01(s * 1.6), transform: 'scale(' + (0.82 + 0.18 * s) + ')' };
}

export const Pill: React.FC<{ text: string; bg?: string; color?: string; size?: number; style?: React.CSSProperties }> = ({ text, bg = C.ink, color = C.white, size = 30, style }) => (
  <div style={{ background: bg, color, fontFamily: FONT, fontWeight: 800, fontSize: size, padding: '12px 28px', borderRadius: 999, whiteSpace: 'nowrap', lineHeight: 1.1, ...style }}>{text}</div>
);

const P: Record<string, string> = {
  rupee: 'M7 5h10M7 9h10M10 5c4 0 6 1.5 6 4s-2 4-6 4H7l8 7',
  chat: 'M4 5h16v11H9l-5 4z',
  mic: 'M12 3a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zM6 11a6 6 0 0 0 12 0M12 17v4',
  camera: 'M3 8h4l2-3h6l2 3h4v11H3zM12 10.5a3.5 3.5 0 1 0 .01 0',
  video: 'M3 8h4l2-3h6l2 3h4v11H3zM12 10.5a3.5 3.5 0 1 0 .01 0',
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z',
  heart: 'M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z',
  bolt: 'M13 2L5 13h6l-1 9 8-11h-6z',
  check: 'M5 12.5l4.5 4.5L19 7',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 4-6 8-6s8 2 8 6',
  bot: 'M5 8h14v10H5zM12 4v4M9 13h.01M15 13h.01',
  doc: 'M6 3h9l4 4v14H6zM9 12h7M9 16h7',
  chart: 'M4 20V4M4 20h16M8 16v-4M12 16V8M16 16v-6',
  bell: 'M6 17V11a6 6 0 0 1 12 0v6l2 2H4zM10 21h4',
  globe: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18',
  lock: 'M6 11h12v9H6zM8 11V8a4 4 0 0 1 8 0v3',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM16 16l5 5',
  mail: 'M3 6h18v13H3zM3 7l9 7 9-7',
  gift: 'M4 10h16v10H4zM3 7h18v3H3zM12 7v13M12 7c-3-4-6-1-4 0M12 7c3-4 6-1 4 0',
  fire: 'M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z',
  clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2',
  youtube: 'M3 7a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3zM10 9l5 3-5 3z',
  music: 'M9 18V5l11-2v13M9 18a3 3 0 1 1-3-3 3 3 0 0 1 3 3zM20 16a3 3 0 1 1-3-3 3 3 0 0 1 3 3z',
};

export const Icon: React.FC<{ name: string; size?: number; color?: string }> = ({ name, size = 56, color = C.white }) => {
  const key = String(name || '').toLowerCase().trim();
  if (key === 'play') {
    return <svg width={size} height={size} viewBox="0 0 24 24"><polygon points="7,4 20,12 7,20" fill={color} /></svg>;
  }
  if (key === 'dollar' || key === '$') {
    return <svg width={size} height={size} viewBox="0 0 24 24"><text x="12" y="19" textAnchor="middle" fontSize="20" fontWeight="800" fill={color} fontFamily={FONT}>$</text></svg>;
  }
  const d = P[key];
  if (!d) {
    return <svg width={size} height={size} viewBox="0 0 24 24"><text x="12" y="18" textAnchor="middle" fontSize="16" fontWeight="800" fill={color} fontFamily={FONT}>{(key[0] || '*').toUpperCase()}</text></svg>;
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
};

export const Arrow: React.FC<{ color?: string }> = ({ color = C.ink }) => (
  <svg width="44" height="24" viewBox="0 0 44 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h36M31 4l8 8-8 8" /></svg>
);

export const lerp = (f: number, a: number, b: number, from: number, to: number) => interpolate(f, [a, b], [from, to], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
