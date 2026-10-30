import React from 'react';
import { Img, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { emoji3dSrc } from './emoji3d';
import { FONT, Icon, clamp01 } from './ui';
import { useTheme } from './theme';
import { KText } from './ktext';

const EMOJI_FONT = '"Noto Color Emoji", "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
const CL = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

/** Big emoji that bounce in beside the speaker for a moment, on the words they belong to. */
export const EmojiPops: React.FC<{ pops: { f: number; emoji: string }[] }> = ({ pops }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <>
      {pops.map((p, i) => {
        const l = frame - p.f;
        if (l < 0 || l > 44) return null;
        const s = spring({ frame: l, fps, config: { damping: 9, stiffness: 170, mass: 0.6 } });
        const out = interpolate(l, [30, 44], [1, 0], CL);
        const left = i % 2 === 0;
        const src = emoji3dSrc(p.emoji);
        return (
          <div key={i} style={{ position: 'absolute', left: left ? 40 : 550, top: 690 - l * 1.8 + (i % 3) * 26, width: 130, textAlign: 'center', fontFamily: EMOJI_FONT, fontSize: 118, lineHeight: 1, opacity: out * clamp01(s * 2), transform: 'scale(' + (0.2 + 0.95 * s) + ') rotate(' + ((left ? -1 : 1) * (12 - 16 * (1 - s))) + 'deg)', filter: 'drop-shadow(0 14px 16px rgba(0,0,0,0.3))' }}>{src ? <Img src={src} style={{ width: 124, height: 124, objectFit: 'contain' }} /> : p.emoji}</div>
        );
      })}
    </>
  );
};

/** The first two seconds: the hook in big letters over a blurred picture, so people stop scrolling. */
export const HookIntro: React.FC<{ text: string }> = ({ text }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const total = 60;
  if (!text || frame >= total) return null;
  const inP = spring({ frame, fps, config: { damping: 14, stiffness: 140 } });
  const outP = interpolate(frame, [total - 12, total], [1, 0], CL);
  const blur = 18 * outP;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: outP, backdropFilter: 'blur(' + blur + 'px)', WebkitBackdropFilter: 'blur(' + blur + 'px)', background: T.dark ? 'rgba(5,5,12,0.55)' : 'rgba(255,255,255,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 54px' }}>
      <div style={{ position: 'absolute', left: '50%', top: '50%', width: 1500, height: 1500, marginLeft: -750, marginTop: -750, borderRadius: '50%', background: 'repeating-conic-gradient(from 0deg, ' + T.accent + '2e 0deg 8deg, rgba(255,255,255,0) 8deg 22deg)', transform: 'rotate(' + frame * 0.9 + 'deg)', WebkitMaskImage: 'radial-gradient(circle, #000 0%, transparent 60%)', maskImage: 'radial-gradient(circle, #000 0%, transparent 60%)' }} />
      <div style={{ textAlign: 'center', transform: 'scale(' + (0.8 + 0.2 * inP) + ') translateY(' + (1 - inP) * 40 + 'px)' }}>
        <KText text={text} size={text.length > 28 ? 80 : 100} weight={800} delay={3} step={4} />
        <div style={{ height: 14, width: clamp01((frame - 8) / 16) * 70 + '%', margin: '22px auto 0', borderRadius: 10, background: T.accent, boxShadow: '0 0 28px ' + T.accent }} />
      </div>
    </div>
  );
};

/** The last 2.5 seconds: a glass card that asks people to follow. */
export const EndCard: React.FC<{ text: string; brand: string; totalFrames: number }> = ({ text, brand, totalFrames }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const l = frame - (totalFrames - 78);
  if (!text || l < 0) return null;
  const e = spring({ frame: l, fps, config: { damping: 14, stiffness: 120 } });
  const shake = Math.sin(l / 2.2) * 10 * Math.max(0, 1 - l / 40);
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: clamp01(l / 8), backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', background: T.dark ? 'rgba(5,5,12,0.5)' : 'rgba(255,255,255,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 560, padding: '44px 36px 38px', borderRadius: 52, textAlign: 'center', background: T.dark ? 'linear-gradient(145deg, rgba(255,255,255,0.18), rgba(255,255,255,0.06))' : 'linear-gradient(145deg, rgba(255,255,255,0.9), rgba(255,255,255,0.55))', border: '1.5px solid ' + (T.dark ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.95)'), boxShadow: '0 30px 70px rgba(0,0,0,0.28), inset 0 1.5px 0 rgba(255,255,255,0.9)', transform: 'translateY(' + (1 - e) * 60 + 'px) scale(' + (0.9 + 0.1 * e) + ')', opacity: clamp01(e * 1.4) }}>
        <div style={{ width: 128, height: 128, margin: '0 auto 22px', borderRadius: 40, background: 'linear-gradient(145deg, ' + T.accent + ', ' + T.accent + 'aa)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 16px 40px ' + T.accent + '88', transform: 'rotate(' + shake + 'deg)' }}>
          <Icon name="bell" size={72} color={T.onAccent} stroke={2.2} />
        </div>
        <KText text={text} size={64} weight={800} delay={6} step={4} />
        {brand && brand !== 'Studio' ? <div style={{ display: 'inline-block', marginTop: 22, fontFamily: FONT, fontWeight: 800, fontSize: 32, padding: '10px 30px', borderRadius: 999, background: T.pillBg, color: T.pillFg }}>{brand}</div> : null}
      </div>
    </div>
  );
};

/** A quick glass sweep across the screen where one scene hands over to the next. */
export const SceneWipe: React.FC<{ starts: number[] }> = ({ starts }) => {
  const frame = useCurrentFrame();
  const s = starts.find((f) => frame >= f && frame < f + 11);
  if (s === undefined) return null;
  const k = (frame - s) / 11;
  const x = interpolate(k, [0, 1], [-70, 170]);
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', top: -120, bottom: -120, width: '42%', left: x + '%', transform: 'skewX(-16deg)', background: 'linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.5), rgba(255,255,255,0))', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', opacity: 0.75 }} />
    </div>
  );
};

/** Soft glass orbs and sparkles that drift behind everything, so the page never feels static. */
export const Ambient: React.FC = () => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const orbs = [
    { x: 40, y: 250, r: 64, a: '#C4B5FD', b: '#7C3AED', s: 1 },
    { x: 590, y: 170, r: 44, a: '#FDBA74', b: '#FB7185', s: 1.3 },
    { x: 610, y: 1000, r: 84, a: '#FCD34D', b: '#FB923C', s: 0.8 },
    { x: 20, y: 1080, r: 52, a: '#A5F3FC', b: '#38BDF8', s: 1.1 },
    { x: 330, y: 80, r: 26, a: '#FBCFE8', b: '#EC4899', s: 1.6 },
  ];
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {orbs.map((q, i) => (
        <div key={i} style={{ position: 'absolute', left: q.x + Math.sin(frame / (46 / q.s) + i * 1.3) * 22, top: q.y + Math.cos(frame / (58 / q.s) + i) * 26, width: q.r * 2, height: q.r * 2, borderRadius: '50%', background: 'radial-gradient(circle at 30% 26%, ' + q.a + ', ' + q.b + ' 72%)', opacity: T.dark ? 0.5 : 0.42, boxShadow: '0 18px 40px ' + q.b + '44, inset 0 -8px 18px rgba(0,0,0,0.12)' }} />
      ))}
      {Array.from({ length: 16 }).map((_, i) => {
        const tw = 0.5 + 0.5 * Math.sin(frame / 12 + i * 1.9);
        const sz = 5 + (i % 3) * 3;
        return <div key={'s' + i} style={{ position: 'absolute', left: (i * 157 + 40) % 700, top: (i * 281 + 90) % 1200 - ((frame * (0.25 + (i % 4) * 0.1)) % 60), width: sz, height: sz, borderRadius: '50%', background: T.accent, opacity: tw * 0.55, boxShadow: '0 0 ' + sz * 2 + 'px ' + T.accent }} />;
      })}
    </div>
  );
};

/** A thin progress line across the top: it makes the reel feel finished and keeps people watching. */
export const ReelProgress: React.FC<{ totalFrames: number }> = ({ totalFrames }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const w = clamp01(frame / Math.max(1, totalFrames - 1)) * 100;
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, right: 0, height: 8, background: 'rgba(120,120,130,0.16)' }}>
      <div style={{ width: w + '%', height: '100%', background: T.accent, borderRadius: 8, boxShadow: '0 0 14px ' + T.accent }} />
    </div>
  );
};

/** Slow diagonal light bands that glide across the page. */
export const Streaks: React.FC = () => {
  const T = useTheme();
  const frame = useCurrentFrame();
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {[0, 1, 2].map((i) => {
        const x = ((frame * (0.7 + i * 0.25) + i * 330) % 1100) - 240;
        return <div key={i} style={{ position: 'absolute', top: -200, bottom: -200, left: x, width: 150 + i * 60, transform: 'rotate(-18deg)', background: 'linear-gradient(90deg, rgba(255,255,255,0), ' + (T.dark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.75)') + ', rgba(255,255,255,0))', opacity: 0.8 }} />;
      })}
    </div>
  );
};

/** Two soft rings that spread out from the middle each time a new idea starts. */
export const Ripples: React.FC<{ starts: number[] }> = ({ starts }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const s = starts.find((f) => frame >= f && frame < f + 30);
  if (s === undefined) return null;
  const k = (frame - s) / 30;
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {[0, 0.22].map((d, i) => {
        const kk = Math.max(0, k - d) / (1 - d);
        const size = 140 + kk * 980;
        return <div key={i} style={{ position: 'absolute', left: 360 - size / 2, top: 480 - size / 2, width: size, height: size, borderRadius: '50%', border: (4 - i * 1.5) + 'px solid ' + T.accent, opacity: (1 - kk) * 0.45 * (k > d ? 1 : 0) }} />;
      })}
    </div>
  );
};

/** A small sparkle burst on the key word of a caption. */
export const Burst: React.FC<{ at: number[]; y: number }> = ({ at, y }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  return (
    <>
      {at.map((a, n) => {
        const l = frame - a;
        if (l < 0 || l > 28) return null;
        const k = l / 28;
        return (
          <div key={n} style={{ position: 'absolute', left: 360, top: y, pointerEvents: 'none' }}>
            {Array.from({ length: 16 }).map((_, i) => {
              const ang = (i / 16) * Math.PI * 2 + (a % 7);
              const dist = (30 + l * 6.5) * (0.65 + (i % 3) * 0.3);
              const sz = (i % 2 ? 9 : 6) * (1 - k * 0.8);
              return <div key={i} style={{ position: 'absolute', left: Math.cos(ang) * dist - sz / 2, top: Math.sin(ang) * dist * 0.7 - sz / 2, width: sz, height: sz, borderRadius: i % 3 === 0 ? 2 : '50%', background: i % 2 ? T.accent : '#fff', opacity: 1 - k, boxShadow: '0 0 10px ' + T.accent, transform: 'rotate(' + l * 12 + 'deg)' }} />;
            })}
          </div>
        );
      })}
    </>
  );
};

/** Little sound-wave bars for the corner of the caption panel. */
export const WaveBars: React.FC = () => {
  const T = useTheme();
  const frame = useCurrentFrame();
  return (
    <div style={{ position: 'absolute', right: 26, top: 20, display: 'flex', alignItems: 'center', gap: 4, height: 26 }}>
      {Array.from({ length: 6 }).map((_, i) => {
        const h = 5 + 21 * Math.abs(Math.sin(frame / 5 + i * 1.3) * Math.cos(frame / 11 + i * 0.6));
        return <div key={i} style={{ width: 4, height: h, borderRadius: 4, background: T.accent, opacity: 0.9 }} />;
      })}
    </div>
  );
};
