import React from 'react';
import { AbsoluteFill, interpolate } from 'remotion';
import { Blob, Grain, TplProps, capWords, useCaps, wordSpring } from '../common';
import { Camera, clamp01, prog } from '../motion';
import { F } from '../fonts';

const LIME = '#86d927', LIME_SOFT = '#c9f26b', INK = '#0f140c', DEEP = '#2f6b00';

/** Hand-drawn marker stroke that draws itself. */
const Stroke: React.FC<{ d: string; p: number; w?: number; style?: React.CSSProperties }> = ({ d, p, w = 9, style }) => (
  <svg width="140" height="120" viewBox="0 0 140 120" style={{ position: 'absolute', overflow: 'visible', pointerEvents: 'none', ...style }}>
    <path d={d} fill="none" stroke={LIME} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p} opacity={0.85} />
  </svg>
);

/** Lime Marker: soft green blobs on white, words that pop in, one word gets "selected" with a highlight box and marker squiggles. */
export const Lime: React.FC<TplProps> = ({ plan, overVideo }) => {
  const { frame, fps, t, cap, exit } = useCaps(plan);
  const words = cap ? capWords(cap) : [];
  const capF = cap ? Math.round(cap.start * fps) : 0;
  const since = frame - capF;
  const big = cap?.number != null;
  const numP = prog(since, 3, 26);
  const shown = big ? Math.round(interpolate(numP, [0, 1], [0, cap!.number as number])) : 0;

  return (
    <AbsoluteFill style={{ background: overVideo ? 'rgba(248,255,240,0.74)' : '#fbfff6', fontFamily: F.poppins, overflow: 'hidden' }}>
      <Camera plan={plan} punch={0.025} drift={0.012}>
        {!overVideo && (
          <>
            <Blob x={620 + Math.sin(t * 0.4) * 80} y={90 + Math.cos(t * 0.35) * 70} size={760} color={LIME} blur={70} opacity={0.75} />
            <Blob x={80 + Math.cos(t * 0.33) * 70} y={1230 + Math.sin(t * 0.4) * 60} size={860} color="#6fc21a" blur={80} opacity={0.7} />
            <Blob x={380 + Math.sin(t * 0.5) * 120} y={640} size={640} color={LIME_SOFT} blur={90} opacity={0.35} />
          </>
        )}

        {cap && big && (
          <div style={{ position: 'absolute', left: 0, right: 0, top: 250, textAlign: 'center', opacity: exit, transform: `scale(${0.8 + 0.2 * clamp01(numP * 2)})` }}>
            <span style={{ position: 'relative', display: 'inline-block', padding: '0 34px', fontSize: 210, fontWeight: 800, color: DEEP, lineHeight: 1.1 }}>
              <span style={{ position: 'absolute', inset: '12% 0 8% 0', background: `${LIME}55`, borderLeft: `6px solid ${LIME}`, borderRight: `6px solid ${LIME}`, borderRadius: 6, transform: `scaleX(${prog(since, 0, 14)})`, transformOrigin: 'left' }} />
              <span style={{ position: 'relative' }}>{shown.toLocaleString('en-IN')}</span>
            </span>
          </div>
        )}

        {cap && (
          <div style={{ position: 'absolute', left: 34, right: 34, top: big ? 560 : 430, minHeight: 360, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', alignContent: 'center', gap: '12px 20px', opacity: exit }}>
            {words.map((w, i) => {
              const p = wordSpring(frame, fps, w.s);
              const emph = cap.emphasis === i;
              const age = frame - Math.round(w.s * fps);
              const boxP = emph ? prog(age, 3, 15) : 0;
              const draw = emph ? prog(age, 6, 20) : 0;
              return (
                <span key={i} style={{ position: 'relative', display: 'inline-block', padding: emph ? '0 24px' : '0 2px', fontSize: emph ? 92 : 68, fontWeight: emph ? 800 : 700, lineHeight: 1.18, color: emph ? DEEP : INK, opacity: clamp01(p * 1.3), transform: `translateY(${(1 - p) * 30}px) scale(${0.9 + 0.1 * p})`, filter: `blur(${(1 - clamp01(p)) * 9}px)` }}>
                  {emph && (
                    <>
                      <span style={{ position: 'absolute', left: 0, top: '14%', bottom: '8%', width: `${boxP * 100}%`, background: `${LIME}59`, borderRadius: 6 }} />
                      <span style={{ position: 'absolute', left: 0, top: '8%', bottom: '2%', width: 6, background: LIME, opacity: boxP, borderRadius: 3 }} />
                      <span style={{ position: 'absolute', left: `calc(${boxP * 100}% - 6px)`, top: '8%', bottom: '2%', width: 6, background: LIME, opacity: boxP, borderRadius: 3 }} />
                      <Stroke d="M6 60 C 20 6, 70 -4, 120 30" p={draw} style={{ left: -54, top: -62, transform: 'rotate(-12deg) scale(0.8)' }} />
                      <Stroke d="M10 20 C 50 80, 100 90, 130 40" p={prog(age, 12, 20)} w={8} style={{ right: -50, bottom: -64, transform: 'rotate(8deg) scale(0.7)' }} />
                    </>
                  )}
                  <span style={{ position: 'relative' }}>{w.t}</span>
                </span>
              );
            })}
          </div>
        )}
      </Camera>
      <Grain opacity={0.035} />
    </AbsoluteFill>
  );
};
