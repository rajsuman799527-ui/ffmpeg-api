import React from 'react';
import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { Plan, hash, useCaps } from './common';

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const easeOut = Easing.out(Easing.cubic);
export const easeInOut = Easing.inOut(Easing.cubic);
/** 0→1 progress of frame between from and from+dur */
export const prog = (frame: number, from: number, dur: number, easing: (x: number) => number = easeOut) =>
  interpolate(frame, [from, from + dur], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing });

/* ───────────────────────── Icons (stroke-drawn) ───────────────────────── */
export const ICONS: Record<string, string[]> = {
  rocket: ['M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z', 'm12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z', 'M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0', 'M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5'],
  trend: ['M22 7 13.5 15.5 8.5 10.5 2 17', 'M16 7h6v6'],
  coin: ['M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z', 'M12 6v12', 'M15 9.5c0-1.4-1.3-2.5-3-2.5s-3 1.1-3 2.5 1.3 2.5 3 2.5 3 1.1 3 2.5-1.3 2.5-3 2.5-3-1.1-3-2.5'],
  rupee: ['M6 3h12', 'M6 8h12', 'M6 13l8.5 8', 'M6 13h3', 'M9 13c6.667 0 6.667-10 0-10'],
  zap: ['M13 2 3 14h9l-1 8 10-12h-9l1-8z'],
  play: ['M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z', 'm10 8 6 4-6 4z'],
  clock: ['M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z', 'M12 6v6l4 2'],
  target: ['M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z', 'M12 6a6 6 0 1 0 0 12 6 6 0 0 0 0-12z', 'M12 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4z'],
  bulb: ['M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5', 'M9 18h6', 'M10 22h4'],
  heart: ['M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z'],
  star: ['M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z'],
  check: ['M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z', 'm9 12 2 2 4-4'],
  calendar: ['M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z', 'M8 2v4', 'M16 2v4', 'M3 10h18'],
  phone: ['M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z', 'M12 18h.01'],
  bell: ['M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9', 'M10.3 21a1.94 1.94 0 0 0 3.4 0'],
  globe: ['M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z', 'M2 12h20', 'M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z'],
  shield: ['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', 'm9 12 2 2 4-4'],
  flame: ['M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z'],
  lock: ['M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2z', 'M7 11V7a5 5 0 0 1 10 0v4'],
  mic: ['M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z', 'M19 10v2a7 7 0 0 1-14 0v-2', 'M12 19v3'],
  message: ['M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z'],
  video: ['m22 8-6 4 6 4V8z', 'M14 6H4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2z'],
  sparkles: ['M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z', 'M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z'],
  arrow: ['M5 12h14', 'm12 5 7 7-7 7'],
  eye: ['M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z', 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z'],
  users: ['M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2', 'M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z', 'M22 21v-2a4 4 0 0 0-3-3.87', 'M16 3.13a4 4 0 0 1 0 7.75'],
};
export const ICON_IDS = Object.keys(ICONS);

export const StrokeIcon: React.FC<{ id: string; size: number; color?: string; width?: number; progress?: number; glow?: string }> = ({ id, size, color = '#fff', width = 1.6, progress = 1, glow }) => {
  const paths = ICONS[id] ?? ICONS.sparkles;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ overflow: 'visible', filter: glow ? `drop-shadow(0 0 ${size * 0.08}px ${glow}) drop-shadow(0 0 ${size * 0.22}px ${glow})` : undefined }}>
      {paths.map((d, i) => {
        const local = clamp01(progress * (paths.length > 1 ? 1.35 : 1) - (i / paths.length) * 0.35);
        return <path key={i} d={d} stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - local} />;
      })}
    </svg>
  );
};

/* ───────────────────────── Particles ───────────────────────── */
export type PKind = 'embers' | 'sparkle' | 'dust' | 'confetti';
export const Particles: React.FC<{ kind?: PKind; count?: number; colors?: string[]; seed?: number; speed?: number; opacity?: number }> = ({ kind = 'embers', count = 36, colors = ['#ff6a3d', '#ffb347'], seed = 1, speed = 1, opacity = 1 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', opacity, pointerEvents: 'none' }}>
      {Array.from({ length: count }, (_, i) => {
        const r1 = hash(i + seed), r2 = hash(i * 3 + seed + 7), r3 = hash(i * 5 + seed + 13), r4 = hash(i * 7 + seed + 21);
        const color = colors[i % colors.length];
        if (kind === 'sparkle') {
          const sc = 0.35 + 0.65 * Math.max(0, Math.sin(t * (1.5 + r3 * 2.5) + r2 * 6.28));
          const s = 14 + r4 * 26;
          return (
            <svg key={i} width={s} height={s} viewBox="0 0 24 24" style={{ position: 'absolute', left: r1 * 720 - s / 2, top: r2 * 1280 - s / 2, transform: `scale(${sc}) rotate(${t * 20 * (r3 - 0.5)}deg)`, opacity: sc, filter: `drop-shadow(0 0 6px ${color})` }}>
              <path d="M12 0 C13 8 16 11 24 12 C16 13 13 16 12 24 C11 16 8 13 0 12 C8 11 11 8 12 0Z" fill={color} />
            </svg>
          );
        }
        if (kind === 'confetti') {
          const y = ((t * speed * (160 + r3 * 220) + r2 * 1500) % 1500) - 110;
          return <div key={i} style={{ position: 'absolute', left: r1 * 720 + Math.sin(t * 2 + r4 * 9) * 30, top: y, width: 10 + r4 * 10, height: 16 + r3 * 12, background: color, transform: `rotate(${t * 240 * (r3 - 0.5) + r2 * 360}deg) rotateX(${t * 300}deg)`, opacity: 0.9, borderRadius: 2 }} />;
        }
        const drift = kind === 'dust' ? 0.25 : 1;
        const y = 1360 - ((t * speed * drift * (30 + r3 * 90) + r2 * 1400) % 1500);
        const x = r1 * 720 + Math.sin(t * (0.4 + r3) + r2 * 9) * (kind === 'dust' ? 40 : 26);
        const s = kind === 'dust' ? 2 + r4 * 4 : 3 + r4 * 6;
        const tw = 0.45 + 0.55 * Math.abs(Math.sin(t * (1 + r3 * 3) + r4 * 6));
        return <div key={i} style={{ position: 'absolute', left: x, top: y, width: s, height: s, borderRadius: '50%', background: color, opacity: tw * (kind === 'dust' ? 0.5 : 0.9), boxShadow: kind === 'dust' ? 'none' : `0 0 ${s * 3}px ${color}` }} />;
      })}
    </div>
  );
};

/* ───────────────────────── Glass 3D card ───────────────────────── */
export const Glass3D: React.FC<{ w: number; h: number; x: number; y: number; radius?: number; tint?: string; rot?: [number, number]; scale?: number; children?: React.ReactNode; border?: string }> = ({ w, h, x, y, radius = 44, tint = 'rgba(255,255,255,0.14)', rot = [0, 0], scale = 1, children, border = 'rgba(255,255,255,0.38)' }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const sweep = ((t * 0.55) % 1.6) - 0.3;
  return (
    <div style={{ position: 'absolute', left: x - w / 2, top: y - h / 2, width: w, height: h, perspective: 1400 }}>
      <div style={{ width: '100%', height: '100%', transform: `rotateY(${rot[0] + Math.sin(t * 0.9) * 7}deg) rotateX(${rot[1] + Math.cos(t * 0.7) * 5}deg) scale(${scale})`, transformStyle: 'preserve-3d', borderRadius: radius, background: `linear-gradient(145deg, ${tint}, rgba(255,255,255,0.03))`, border: `1.5px solid ${border}`, backdropFilter: 'blur(22px)', boxShadow: '0 50px 90px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,0,0,0.15), inset 0 1.5px 0 rgba(255,255,255,0.55), inset 0 -20px 40px rgba(0,0,0,0.15)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ position: 'absolute', top: -40, bottom: -40, width: '36%', left: `${sweep * 100}%`, background: 'linear-gradient(100deg, rgba(255,255,255,0), rgba(255,255,255,0.28), rgba(255,255,255,0))', transform: 'skewX(-18deg)' }} />
        {children}
      </div>
    </div>
  );
};

/* ───────────────────────── Orbit rings (default graphic) ───────────────────────── */
export const OrbitRings: React.FC<{ x: number; y: number; size: number; color: string; accent?: string }> = ({ x, y, size, color, accent = '#fff' }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  return (
    <div style={{ position: 'absolute', left: x - size / 2, top: y - size / 2, width: size, height: size }}>
      {[1, 0.74, 0.5].map((k, i) => (
        <div key={i} style={{ position: 'absolute', inset: (size * (1 - k)) / 2, borderRadius: '50%', border: `${i === 0 ? 1.5 : 2}px solid ${color}`, transform: `rotateX(${68}deg) rotateZ(${t * (30 + i * 22) * (i % 2 ? -1 : 1)}deg)`, opacity: 0.8 - i * 0.15 }}>
          <div style={{ position: 'absolute', left: '50%', top: -6, width: 12, height: 12, marginLeft: -6, borderRadius: '50%', background: accent, boxShadow: `0 0 18px ${accent}` }} />
        </div>
      ))}
      <div style={{ position: 'absolute', left: '50%', top: '50%', width: size * 0.16, height: size * 0.16, marginLeft: -size * 0.08, marginTop: -size * 0.08, borderRadius: '50%', background: accent, boxShadow: `0 0 40px ${accent}, 0 0 90px ${color}` }} />
    </div>
  );
};

/* ───────────────────────── Letter-level text ───────────────────────── */
export type LetterFx = 'rise' | 'flip' | 'slam' | 'drop' | 'blur';
export const Letters: React.FC<{ text: string; start: number; frame: number; fps: number; fx?: LetterFx; stagger?: number }> = ({ text, start, frame, fps, fx = 'rise', stagger = 1.1 }) => {
  const chars = Array.from(text);
  return (
    <span style={{ display: 'inline-block', whiteSpace: 'pre', perspective: 600 }}>
      {chars.map((ch, i) => {
        const p = spring({ frame: frame - Math.round(start * fps) - Math.round(i * stagger), fps, config: { damping: 13, stiffness: 190, mass: 0.55 } });
        let style: React.CSSProperties = { opacity: clamp01(p * 1.4) };
        if (fx === 'rise') style = { ...style, transform: `translateY(${(1 - p) * 60}px)`, filter: `blur(${(1 - p) * 8}px)` };
        if (fx === 'flip') style = { ...style, transform: `rotateX(${(1 - p) * -95}deg) translateY(${(1 - p) * 20}px)`, transformOrigin: '50% 100%' };
        if (fx === 'slam') style = { ...style, transform: `scale(${1 + (1 - p) * 1.8})`, filter: `blur(${(1 - p) * 10}px)` };
        if (fx === 'drop') style = { ...style, transform: `translateY(${(1 - p) * -90}px) rotate(${(1 - p) * (i % 2 ? 14 : -14)}deg)` };
        if (fx === 'blur') style = { ...style, filter: `blur(${(1 - p) * 14}px)`, transform: `scale(${0.9 + 0.1 * p})` };
        return <span key={i} style={{ display: 'inline-block', ...style }}>{ch}</span>;
      })}
    </span>
  );
};

/* ───────────────────────── Charts ───────────────────────── */
export const LineChart: React.FC<{ w: number; h: number; progress: number; color: string; seed?: number; down?: boolean; fill?: boolean }> = ({ w, h, progress, color, seed = 1, down = false, fill = true }) => {
  const N = 9;
  const pts = Array.from({ length: N }, (_, i) => {
    const base = down ? 1 - i / (N - 1) : i / (N - 1);
    const y = clamp01(base * 0.8 + (hash(i + seed) - 0.5) * 0.28 + 0.1);
    return [(i / (N - 1)) * w, h - y * h];
  });
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const area = `${d} L${w} ${h} L0 ${h} Z`;
  const id = `lc${seed}`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: 'visible' }}>
      <defs><linearGradient id={id} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={color} stopOpacity="0.35" /><stop offset="1" stopColor={color} stopOpacity="0" /></linearGradient><clipPath id={id + 'c'}><rect x="0" y="-20" width={w * progress} height={h + 40} /></clipPath></defs>
      {[0.25, 0.5, 0.75].map((k) => <line key={k} x1="0" x2={w} y1={h * k} y2={h * k} stroke="rgba(255,255,255,0.14)" strokeWidth="1" />)}
      {fill && <path d={area} fill={`url(#${id})`} clipPath={`url(#${id}c)`} />}
      <path d={d} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - progress} style={{ filter: `drop-shadow(0 0 8px ${color})` }} />
    </svg>
  );
};

export const BarChart: React.FC<{ w: number; h: number; progress: number; color: string; seed?: number; bars?: number }> = ({ w, h, progress, color, seed = 1, bars = 6 }) => (
  <div style={{ width: w, height: h, display: 'flex', alignItems: 'flex-end', gap: w * 0.04 }}>
    {Array.from({ length: bars }, (_, i) => {
      const target = 0.25 + 0.75 * (i / (bars - 1)) * (0.7 + hash(i + seed) * 0.3);
      const p = clamp01(progress * 1.4 - i * 0.1);
      return <div key={i} style={{ flex: 1, height: `${target * p * 100}%`, borderRadius: 10, background: `linear-gradient(180deg, ${color}, rgba(255,255,255,0.15))`, boxShadow: `0 0 18px ${color}66` }} />;
    })}
  </div>
);

/* ───────────────────────── Camera + transitions ───────────────────────── */
/** Slow drift plus a springy "punch-in" every time a new phrase starts. */
export const Camera: React.FC<{ plan: Plan; children: React.ReactNode; punch?: number; drift?: number }> = ({ plan, children, punch = 0.045, drift = 0.02 }) => {
  const { frame, fps, t, cap } = useCaps(plan);
  const startF = cap ? Math.round(cap.start * fps) : 0;
  const k = spring({ frame: frame - startF, fps, config: { damping: 11, stiffness: 110, mass: 0.7 } });
  const scale = 1 + (1 - k) * punch + drift * (0.5 + 0.5 * Math.sin(t * 0.35));
  return <div style={{ position: 'absolute', inset: 0, transform: `scale(${scale}) rotate(${Math.sin(t * 0.25) * 0.5}deg) translate(${Math.sin(t * 0.3) * 6}px, ${Math.cos(t * 0.22) * 5}px)`, transformOrigin: '50% 45%' }}>{children}</div>;
};

/** Quick diagonal slab that sweeps across the screen at each phrase change. */
export const SlabWipe: React.FC<{ plan: Plan; color: string; color2?: string }> = ({ plan, color, color2 }) => {
  const { frame, fps, idx } = useCaps(plan);
  if (idx <= 0) return null;
  const since = frame - Math.round(plan.captions[idx].start * fps) + 4;
  if (since < 0 || since > 12) return null;
  const k = since / 12;
  const x = interpolate(k, [0, 1], [-130, 130], { easing: Easing.inOut(Easing.cubic) });
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', top: -300, bottom: -300, width: '42%', left: '29%', transform: `translateX(${x}%) skewX(-16deg)`, background: `linear-gradient(90deg, ${color2 ?? color}, ${color}, ${color2 ?? color})`, opacity: 0.5, filter: 'blur(3px)' }} />
    </div>
  );
};
