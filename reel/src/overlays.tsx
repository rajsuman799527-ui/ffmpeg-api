import React from 'react';
import { Img, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { emoji3dSrc } from './emoji3d';
import { FONT, Icon, clamp01 } from './ui';
import { useTheme } from './theme';

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
      <div style={{ textAlign: 'center', transform: 'scale(' + (0.8 + 0.2 * inP) + ') translateY(' + (1 - inP) * 40 + 'px)' }}>
        <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: text.length > 28 ? 78 : 96, lineHeight: 1.05, color: T.ink, letterSpacing: -1.5 }}>{text}</div>
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
        <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 64, lineHeight: 1.08, color: T.ink }}>{text}</div>
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
