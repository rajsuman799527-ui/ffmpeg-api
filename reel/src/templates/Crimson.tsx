import React from 'react';
import { AbsoluteFill, interpolate, useVideoConfig } from 'remotion';
import { Blob, Grain, TplProps, Vignette, capWords, useCaps, wordSpring } from '../common';
import { F } from '../fonts';

/** Crimson Brand: red/black fluid gradient, soft blur-in words, italic accents, glass pill + cursor click. */
export const Crimson: React.FC<TplProps> = ({ plan, overVideo }) => {
  const { frame, fps, t, idx, cap, exit, local } = useCaps(plan);
  const { durationInFrames } = useVideoConfig();
  const words = cap ? capWords(cap) : [];
  const d = (a: number, p: number) => Math.sin(t * a + p);
  const zoom = 1 + Math.min(1, local / 3) * 0.05;
  const progress = frame / Math.max(1, durationInFrames);

  return (
    <AbsoluteFill style={{ background: overVideo ? 'rgba(24,0,2,0.42)' : '#060000', fontFamily: F.poppins, overflow: 'hidden' }}>
      {!overVideo && (
        <>
          <AbsoluteFill style={{ transform: `rotate(${t * 3}deg) scale(1.5)`, background: 'conic-gradient(from 90deg at 50% 50%, #3a0000, #b00000, #1a0000, #d20a0a, #3a0000)', opacity: 0.55, filter: 'blur(70px)' }} />
          <Blob x={170 + d(0.5, 0) * 190} y={230 + d(0.4, 1) * 140} size={1000} color="#e00000" blur={55} />
          <Blob x={590 + d(0.45, 2) * 160} y={770 + d(0.35, 0) * 170} size={920} color="#a80000" blur={55} />
          <Blob x={250 + d(0.3, 3) * 170} y={1170 + d(0.5, 1) * 90} size={840} color="#ec1414" blur={60} />
          <Blob x={430 + d(0.6, 1) * 210} y={560 + d(0.5, 2) * 210} size={640} color="#000" blur={70} opacity={0.9} />
          <Blob x={120 + d(0.35, 4) * 90} y={760 + d(0.3, 2) * 90} size={420} color="#000" blur={60} opacity={0.7} />
          {/* soft diagonal light sweep */}
          <div style={{ position: 'absolute', inset: -200, background: 'linear-gradient(115deg, transparent 42%, rgba(255,120,120,0.13) 50%, transparent 58%)', transform: `translateX(${((t * 90) % 1400) - 500}px)` }} />
          <Grain opacity={0.075} />
        </>
      )}

      {cap && (
        <div style={{ position: 'absolute', left: 54, right: 54, top: 420, transform: `scale(${zoom})`, transformOrigin: '30% 50%', opacity: exit, filter: `blur(${(1 - exit) * 12}px)` }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 24px', justifyContent: idx % 2 ? 'flex-end' : 'flex-start', alignItems: 'center' }}>
            {words.map((w, i) => {
              const p = wordSpring(frame, fps, w.s);
              const emph = cap.emphasis === i;
              const odd = i % 2 === 1;
              if (emph) {
                const click = interpolate(frame - Math.round((w.s + 0.45) * fps), [0, 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
                const press = click > 0 && click < 0.5 ? 0.96 : 1;
                return (
                  <div key={i} style={{ position: 'relative', opacity: p, transform: `scale(${(0.72 + 0.28 * p) * press}) translateY(${(1 - p) * 30}px)` }}>
                    <div style={{ position: 'relative', overflow: 'hidden', background: 'linear-gradient(180deg,#ffffff 0%,#f1d3d5 55%,#d9a9ad 100%)', color: '#220608', borderRadius: 24, padding: '10px 36px 12px', fontSize: 60, fontWeight: 700, boxShadow: '0 18px 46px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.5), inset 0 -5px 12px rgba(150,0,20,0.28)' }}>
                      {w.t}
                      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: '46%', background: 'linear-gradient(180deg, rgba(255,255,255,0.7), rgba(255,255,255,0))', borderRadius: '24px 24px 0 0' }} />
                    </div>
                    {click > 0 && click < 1 && <div style={{ position: 'absolute', right: 6, bottom: -26, width: 70 * click, height: 70 * click, marginRight: -35 * click, marginBottom: -35 * click, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.8)', opacity: 1 - click }} />}
                    <svg width="52" height="52" viewBox="0 0 24 24" style={{ position: 'absolute', right: -18 + (1 - p) * 40, bottom: -34 + (1 - p) * 40, filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.5))' }}><path d="M4 2 L4 19 L8.5 15 L11.5 22 L14 21 L11 14 L17 14 Z" fill="#fff" stroke="#000" strokeWidth="1" /></svg>
                  </div>
                );
              }
              return (
                <span key={i} style={{ display: 'inline-block', fontSize: 74, lineHeight: 1.1, fontWeight: 600, fontStyle: odd ? 'italic' : 'normal', fontFamily: odd ? F.poppinsItalic : F.poppins, color: '#fff', opacity: p, transform: `translateY(${(1 - p) * 46 + (odd ? 34 : 0)}px)`, filter: `blur(${(1 - p) * 10}px)`, textShadow: '0 4px 26px rgba(0,0,0,0.5)' }}>
                  {w.t}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* thin progress line */}
      <div style={{ position: 'absolute', left: 54, right: 54, bottom: 70, height: 3, borderRadius: 3, background: 'rgba(255,255,255,0.16)' }}>
        <div style={{ width: `${progress * 100}%`, height: '100%', borderRadius: 3, background: 'rgba(255,255,255,0.85)' }} />
      </div>
      <Vignette strength={0.4} />
    </AbsoluteFill>
  );
};
