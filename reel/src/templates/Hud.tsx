import React from 'react';
import { AbsoluteFill, interpolate } from 'remotion';
import { Grain, TplProps, Vignette, capWords, hash, useCaps, wordSpring } from '../common';
import { Camera, clamp01, prog } from '../motion';
import { F } from '../fonts';

const L = '#d6f23a';

/** Glowing swoosh with a pen nib that draws under the caption. */
const Swoosh: React.FC<{ p: number }> = ({ p }) => (
  <svg width="640" height="90" viewBox="0 0 640 90" style={{ position: 'absolute', left: 40, right: 40, overflow: 'visible', pointerEvents: 'none' }}>
    <path d="M10 60 C 120 8, 220 90, 340 40 S 520 14, 628 46" fill="none" stroke={L} strokeWidth="3.5" strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p} style={{ filter: `drop-shadow(0 0 8px ${L})` }} />
    <g transform={`translate(${10 + p * 618} ${60 - Math.sin(p * Math.PI) * 6}) rotate(-35)`} opacity={p > 0.02 && p < 0.99 ? 1 : 0}>
      <path d="M0 0 L10 -22 L22 -10 Z M6 -16 L16 -6" fill={L} stroke="#0a0d00" strokeWidth="1.5" strokeLinejoin="round" />
    </g>
  </svg>
);

/** A glowing ring with a counting number inside (timer / counter look). */
const Ring: React.FC<{ p: number; value: number; pop: number }> = ({ p, value, pop }) => {
  const r = 78, c = 2 * Math.PI * r;
  return (
    <div style={{ position: 'relative', width: 200, height: 200, opacity: clamp01(pop * 1.4), transform: `scale(${0.7 + 0.3 * pop})` }}>
      <svg width="200" height="200" viewBox="0 0 200 200">
        <circle cx="100" cy="100" r={r} fill="rgba(10,12,6,0.55)" stroke="rgba(214,242,58,0.25)" strokeWidth="8" />
        <circle cx="100" cy="100" r={r} fill="none" stroke={L} strokeWidth="8" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - p)} transform="rotate(-90 100 100)" style={{ filter: `drop-shadow(0 0 10px ${L}) drop-shadow(0 0 26px ${L})` }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F.poppins, fontWeight: 800, fontSize: 70, color: '#fff', textShadow: '0 2px 12px rgba(0,0,0,0.6)' }}>{value.toLocaleString('en-IN')}</div>
    </div>
  );
};

/** HUD Speaker: full-screen speaker, big italic caps with lime key words, glowing swoosh + pen, ring counter. */
export const Hud: React.FC<TplProps> = ({ plan, overVideo }) => {
  const { frame, fps, cap, exit } = useCaps(plan);
  const words = cap ? capWords(cap) : [];
  const capF = cap ? Math.round(cap.start * fps) : 0;
  const since = frame - capF;
  const num = cap?.number != null;
  const ringP = prog(since, 2, 30);
  const popP = clamp01(prog(since, 0, 10));
  const swoosh = prog(since, 3, 22);
  const total = words.length;

  return (
    <AbsoluteFill style={{ background: overVideo ? 'transparent' : 'radial-gradient(circle at 50% 35%, #1b1f10 0%, #07090a 70%)', fontFamily: F.poppinsItalic, overflow: 'hidden' }}>
      {overVideo && <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.30) 0%, rgba(0,0,0,0) 28%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55) 100%)' }} />}
      <Camera plan={plan} punch={0.02} drift={0.01}>
        {num && cap && (
          <div style={{ position: 'absolute', left: 0, right: 0, top: 380, display: 'flex', justifyContent: 'center', opacity: exit }}>
            <Ring p={ringP} pop={popP} value={Math.round(interpolate(ringP, [0, 1], [0, cap.number as number]))} />
          </div>
        )}
        {cap && (
          <div style={{ position: 'absolute', left: 36, right: 36, top: num ? 640 : 560, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'baseline', gap: '0 18px', opacity: exit }}>
            {words.map((w, i) => {
              const p = wordSpring(frame, fps, w.s, 190, 13);
              const emph = cap.emphasis === i || (cap.emphasis == null && total > 0 && i === total - 1);
              const jit = p < 0.8 ? (hash(frame + i * 11) - 0.5) * 6 : 0;
              return (
                <span key={i} style={{ display: 'inline-block', fontStyle: 'italic', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, fontSize: emph ? 84 : 66, lineHeight: 1.12, color: emph ? L : '#fff', opacity: clamp01(p * 1.5), transform: `translate(${jit}px, ${(1 - p) * 26}px) skewX(${(1 - p) * -10}deg) scale(${0.9 + 0.1 * p})`, textShadow: emph ? `0 0 18px ${L}aa, 0 4px 14px rgba(0,0,0,0.7)` : '0 4px 16px rgba(0,0,0,0.85), 0 1px 3px rgba(0,0,0,0.95)', WebkitTextStroke: emph ? '0px' : '0px' }}>{w.t}</span>
              );
            })}
          </div>
        )}
        {cap && !num && (
          <div style={{ position: 'absolute', left: 0, right: 0, top: 560 - 6, height: 90, opacity: exit * 0.95 }}><Swoosh p={swoosh} /></div>
        )}
      </Camera>
      <Vignette strength={0.35} />
      <Grain opacity={0.035} />
    </AbsoluteFill>
  );
};
