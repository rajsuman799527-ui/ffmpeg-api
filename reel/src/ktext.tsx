import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { FONT } from './ui';
import { useTheme } from './theme';
import type { PCaption } from './timeline';

const CL = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

/**
 * Premium kinetic text.
 * Every word rises out of its own mask with a springy overshoot while a blur clears, the key word
 * gets a sweeping light, a glow and a highlighter stroke that draws itself.
 */
export const KText: React.FC<{
  text: string; size: number; weight?: number; color?: string; align?: 'center' | 'left';
  hi?: 'last' | 'none' | number; delay?: number; step?: number; speed?: number;
  lineHeight?: number; tracking?: number; family?: string; style?: React.CSSProperties;
}> = ({ text, size, weight = 800, color, align = 'center', hi = 'last', delay = 4, step = 3.2, speed = 1, lineHeight = 1.08, tracking = -0.02, family = FONT, style }) => {
  const T = useTheme();
  const raw = useCurrentFrame();
  const { fps } = useVideoConfig();
  const frame = raw * speed;
  const words = String(text || '').split(/\s+/).filter(Boolean);
  if (!words.length) return null;
  const hiIdx = hi === 'none' ? -1 : typeof hi === 'number' ? hi : words.length > 1 ? words.length - 1 : 0;
  const ink = color ?? T.ink;
  const pad = Math.round(size * 0.16);
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: align === 'center' ? 'center' : 'flex-start', columnGap: Math.round(size * 0.26), rowGap: Math.round(size * 0.02), fontFamily: family, fontWeight: weight, fontSize: size, lineHeight, letterSpacing: tracking + 'em', color: ink, ...style }}>
      {words.map((w, i) => {
        const f = frame - delay - i * step;
        const p = spring({ frame: f, fps, config: { damping: 13, stiffness: 190, mass: 0.62 } });
        const o = interpolate(f, [0, 7], [0, 1], CL);
        const blur = (1 - Math.min(1, o)) * 10;
        const isHi = i === hiIdx;
        const sweep = ((frame - delay - i * step - 6) % 70) / 70;
        const bar = spring({ frame: f - 8, fps, config: { damping: 16, stiffness: 120 } });
        return (
          <span key={i} style={{ position: 'relative', display: 'inline-block', overflow: 'hidden', padding: `${pad}px ${Math.round(pad * 0.5)}px`, margin: `-${pad}px -${Math.round(pad * 0.5)}px` }}>
            {isHi ? <span style={{ position: 'absolute', left: Math.round(pad * 0.3), right: Math.round(pad * 0.3), bottom: pad + Math.round(size * 0.04), height: Math.round(size * 0.3), borderRadius: 6, background: T.accent, opacity: T.dark ? 0.32 : 0.55, transform: `scaleX(${Math.max(0, bar)})`, transformOrigin: 'left center' }} /> : null}
            <span style={{
              position: 'relative', display: 'inline-block', opacity: o,
              transform: `translateY(${(1 - p) * 105}%) rotate(${(1 - p) * 4}deg) scale(${0.92 + 0.08 * Math.min(1.1, p)})`, transformOrigin: 'left bottom', filter: blur > 0.3 ? `blur(${blur}px)` : undefined,
              ...(isHi && T.dark ? { backgroundImage: `linear-gradient(100deg, ${ink} 0%, ${ink} 30%, ${T.accent} 46%, #fff 52%, ${T.accent} 58%, ${ink} 74%, ${ink} 100%)`, backgroundSize: '260% 100%', backgroundPosition: `${100 - Math.max(0, Math.min(1, sweep)) * 100}% 0`, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', WebkitTextFillColor: 'transparent', filter: `drop-shadow(0 0 ${Math.round(size * 0.16)}px ${T.accent}77)${blur > 0.3 ? ` blur(${blur}px)` : ''}` } : {}),
            }}>{w}</span>
          </span>
        );
      })}
    </div>
  );
};

/** Caption with each word popping on its own spoken time; the key word is lit with a highlighter chip. */
export const WordCaption: React.FC<{ cap: PCaption; size: number; color?: string; fontFamily?: string; offset?: number }> = ({ cap, size, color = '#fff', fontFamily = FONT, offset = 0 }) => {
  const T = useTheme();
  const frame = useCurrentFrame() + offset;
  const { fps } = useVideoConfig();
  const words = cap.words && cap.words.length ? cap.words.map((w) => ({ t: w.t, s: w.s })) : cap.text.split(/\s+/).filter(Boolean).map((t, i, a) => ({ t, s: cap.start + ((cap.end - cap.start) * i) / Math.max(1, a.length) * 0.8 }));
  const emph = typeof cap.emphasis === 'number' && cap.emphasis >= 0 && cap.emphasis < words.length ? cap.emphasis : -1;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', columnGap: Math.round(size * 0.24), rowGap: 2, fontFamily, fontWeight: 600, fontSize: size, lineHeight: 1.2, color, textShadow: '0 2px 12px rgba(0,0,0,0.45)' }}>
      {words.map((w, i) => {
        const f = frame - Math.round(w.s * fps) + 2;
        if (f < -3) return null;
        const p = spring({ frame: f, fps, config: { damping: 12, stiffness: 220, mass: 0.5 } });
        const o = interpolate(f, [-2, 3], [0, 1], CL);
        const on = i === emph;
        return (
          <span key={i} style={{ display: 'inline-block', opacity: o, transform: `translateY(${(1 - p) * 16}px) scale(${0.82 + 0.18 * Math.min(1.12, p)})`, fontWeight: on ? 800 : 600, color: on ? T.onAccent : color, background: on ? T.accent : 'transparent', borderRadius: on ? 10 : 0, padding: on ? '0 10px' : 0, textShadow: on ? 'none' : undefined, boxShadow: on ? `0 6px 22px ${T.accent}88` : undefined }}>{w.t}</span>
        );
      })}
    </div>
  );
};
