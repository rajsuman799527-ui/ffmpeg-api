import React from 'react';
import { AbsoluteFill, Audio, Easing, OffthreadVideo, Sequence, interpolate, random, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { FONT, clamp01 } from './ui';
import { useTheme } from './theme';
import { BIG_SPEAKER } from './scenes';
import type { PCaption, PScene, Seg } from './timeline';

/* ---------- Animated background: soft moving glows, dot grid, floating sparkles ---------- */
export const Background: React.FC = () => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const a = frame / 80;
  return (
    <AbsoluteFill style={{ background: T.bg, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: -60 + Math.sin(a) * 70, top: -90 + Math.cos(a * 0.8) * 60, width: 840, height: 840, borderRadius: '50%', background: `radial-gradient(circle, ${T.glow}, rgba(0,0,0,0) 64%)` }} />
      <div style={{ position: 'absolute', left: 120 + Math.cos(a * 0.7) * 80, top: 620 + Math.sin(a * 0.9) * 70, width: 760, height: 760, borderRadius: '50%', background: `radial-gradient(circle, ${T.glow2}, rgba(0,0,0,0) 64%)` }} />
      <div style={{ position: 'absolute', inset: 0, opacity: T.dark ? 0.07 : 0.05, backgroundImage: `radial-gradient(${T.ink} 1.4px, transparent 1.6px)`, backgroundSize: '38px 38px', backgroundPosition: `0 ${(frame * 0.4) % 38}px` }} />
      {Array.from({ length: 14 }).map((_, i) => {
        const speed = 0.35 + random(`v${i}`) * 0.6;
        const y = 1300 - ((frame * speed + random(`y${i}`) * 1300) % 1300);
        const x = random(`x${i}`) * 720 + Math.sin((frame + i * 20) / 40) * 12;
        const size = 4 + random(`s${i}`) * 7;
        const fade = Math.min(1, y / 200, (1300 - y) / 200);
        return <div key={i} style={{ position: 'absolute', left: x, top: y, width: size, height: size, borderRadius: '50%', background: T.accent, opacity: 0.1 + 0.3 * clamp01(fade) }} />;
      })}
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.10) 100%)' }} />
    </AbsoluteFill>
  );
};

/* ---------- Speaker: the real video, cut into segments, inside a frame ---------- */
export type FrameKind = 'circle' | 'squircle' | 'card';

const geom = (kind: FrameKind, big: boolean) => {
  if (kind === 'squircle') return big ? { w: 560, h: 720, y: 520, r: 76 } : { w: 300, h: 380, y: 790, r: 52 };
  if (kind === 'card') return big ? { w: 620, h: 620, y: 480, r: 300 } : { w: 330, h: 330, y: 780, r: 165 };
  return big ? { w: 600, h: 600, y: 480, r: 300 } : { w: 340, h: 340, y: 785, r: 170 };
};

export const Speaker: React.FC<{ videoUrl: string; cutoutUrl?: string; segs: Seg[]; scenes: PScene[]; kind: FrameKind }> = ({ videoUrl, cutoutUrl, segs, scenes, kind }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const idx = Math.max(0, scenes.findIndex((s) => t >= s.start && t < s.end));
  const cur = scenes[idx];
  const prev = idx > 0 ? scenes[idx - 1] : cur;
  const gc = geom(kind, !cur || BIG_SPEAKER.has(cur.scene_type));
  const gp = geom(kind, !prev || BIG_SPEAKER.has(prev.scene_type));
  const local = frame - Math.round((cur?.start ?? 0) * fps);
  const k = interpolate(local, [0, 16], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.22, 1, 0.36, 1) });
  const w = gp.w + (gc.w - gp.w) * k;
  const h = gp.h + (gc.h - gp.h) * k;
  const y = gp.y + (gc.y - gp.y) * k + Math.sin(frame / 24) * 5;
  const r = gp.r + (gc.r - gp.r) * k;
  const pulse = (frame % 60) / 60;
  const inner = kind === 'card' ? Math.min(w, h) - 70 : 0;
  if (cutoutUrl) {
    // Background removed: the speaker stands on the theme background (no frame). Sound still comes from the original clip, with the same jump cuts.
    const cw = w * 1.18, ch = h * 1.18;
    const bottom = y + h / 2;
    return (
      <>
        {segs.map((s, i) => (
          <Sequence key={'a' + i} from={s.outFrame} durationInFrames={s.frames}>
            <Audio src={videoUrl} startFrom={Math.round(s.start * fps)} />
          </Sequence>
        ))}
        <div style={{ position: 'absolute', left: 360 - (w * 0.92) / 2, top: y - h * 0.05 - (w * 0.92) / 2, width: w * 0.92, height: w * 0.92, borderRadius: '50%', background: T.accent, boxShadow: `0 12px 44px ${T.accent}77`, opacity: 0.95 }} />
        <div style={{ position: 'absolute', left: 360 - cw / 2, top: bottom - ch, width: cw, height: ch, filter: 'drop-shadow(0 18px 30px rgba(0,0,0,0.35))' }}>
          {segs.map((s, i) => (
            <Sequence key={'v' + i} from={s.outFrame} durationInFrames={s.frames}>
              <OffthreadVideo src={cutoutUrl} transparent muted startFrom={Math.round(s.start * fps)} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 30%' }} />
            </Sequence>
          ))}
        </div>
      </>
    );
  }
  const media = (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: '#000', borderRadius: kind === 'card' ? '50%' : r }}>
      {segs.map((s, i) => (
        <Sequence key={i} from={s.outFrame} durationInFrames={s.frames}>
          <OffthreadVideo src={videoUrl} startFrom={Math.round(s.start * fps)} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 30%' }} />
        </Sequence>
      ))}
    </div>
  );
  return (
    <div style={{ position: 'absolute', left: 360 - w / 2, top: y - h / 2, width: w, height: h }}>
      {/* pulsing halo */}
      <div style={{ position: 'absolute', inset: -14, borderRadius: kind === 'circle' ? '50%' : r + 14, border: `3px solid ${T.accent}`, opacity: 0.5 * (1 - pulse), transform: `scale(${1 + pulse * 0.1})` }} />
      {kind === 'card' ? (
        <>
          <div style={{ position: 'absolute', inset: 0, borderRadius: 64, background: T.dark ? '#1E1E2B' : '#EDEDED', boxShadow: T.shadow }} />
          <div style={{ position: 'absolute', left: (w - inner) / 2, top: (h - inner) / 2, width: inner, height: inner }}>
            <div style={{ position: 'absolute', inset: -12, borderRadius: '50%', background: T.accent, boxShadow: `0 10px 40px ${T.accent}77` }} />
            {media}
          </div>
        </>
      ) : (
        <>
          <div style={{ position: 'absolute', inset: -12, borderRadius: kind === 'circle' ? '50%' : r + 12, background: T.accent, boxShadow: `0 12px 44px ${T.accent}77` }} />
          {media}
        </>
      )}
    </div>
  );
};

/* ---------- Captions: word-by-word highlight, timed by word length ---------- */
export type CapStyle = 'strip' | 'pop';

export const Captions: React.FC<{ captions: PCaption[]; style: CapStyle }> = ({ captions, style }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const cap = captions.find((c) => t >= c.start && t < c.end + 0.06);
  if (!cap) return null;
  const words = cap.text.split(/\s+/).filter(Boolean);
  const weights = words.map((w) => Math.max(2, w.replace(/[^\p{L}\p{N}]/gu, '').length));
  const total = weights.reduce((a, b) => a + b, 0);
  const span = Math.max(0.2, cap.end - cap.start);
  let acc = 0;
  const starts = weights.map((w) => { const s = cap.start + (acc / total) * span; acc += w; return s; });
  let active = 0;
  starts.forEach((s, i) => { if (t >= s) active = i; });
  const enterP = spring({ frame: frame - Math.round(cap.start * fps), fps, config: { damping: 15, stiffness: 180 } });
  const size = words.length > 5 || cap.text.length > 28 ? 56 : 64;
  return (
    <>
      {style === 'strip' ? <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 420, background: 'linear-gradient(to top, rgba(8,8,10,0.92) 18%, rgba(8,8,10,0))' }} /> : null}
      <div style={{ position: 'absolute', left: 36, right: 36, bottom: 200, display: 'flex', justifyContent: 'center' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px 14px', transform: `translateY(${(1 - clamp01(enterP)) * 26}px) scale(${0.94 + 0.06 * clamp01(enterP)})`, opacity: clamp01(enterP * 1.4) }}>
          {words.map((w, i) => {
            const on = i === active;
            const wp = on ? spring({ frame: frame - Math.round(starts[i] * fps), fps, config: { damping: 11, stiffness: 220 } }) : 1;
            const scale = on ? 1 + 0.1 * clamp01(wp) : 1;
            return (
              <span key={i} style={{ fontFamily: FONT, fontWeight: 800, fontSize: size, lineHeight: 1.1, display: 'inline-block', padding: style === 'pop' ? '2px 14px' : '0 2px', borderRadius: 18, transform: `scale(${scale})`, color: on ? (style === 'pop' ? T.onAccent : T.accent) : '#fff', background: style === 'pop' && on ? T.accent : 'transparent', textShadow: style === 'pop' && on ? 'none' : '0 4px 14px rgba(0,0,0,0.75), 0 1px 3px rgba(0,0,0,0.9)', boxShadow: style === 'pop' && on ? `0 8px 24px ${T.accent}77` : 'none', WebkitTextStroke: style === 'pop' && !on ? '0px' : undefined }}>{w}</span>
            );
          })}
        </div>
      </div>
    </>
  );
};

/* ---------- Brand + progress ---------- */
export const Brand: React.FC<{ text: string; totalFrames: number }> = ({ text, totalFrames }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  return (
    <>
      <div style={{ position: 'absolute', top: 0, left: 0, height: 7, width: `${(frame / Math.max(1, totalFrames)) * 100}%`, background: T.accent, boxShadow: `0 0 14px ${T.accent}` }} />
      {text ? <div style={{ position: 'absolute', top: 44, right: 36, background: T.pillBg, color: T.pillFg, fontFamily: FONT, fontWeight: 800, fontSize: 24, borderRadius: 999, padding: '8px 22px', boxShadow: T.shadow }}>{text}</div> : null}
    </>
  );
};
