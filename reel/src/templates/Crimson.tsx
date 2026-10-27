import React from 'react';
import { AbsoluteFill, interpolate, spring, useVideoConfig } from 'remotion';
import { Blob, Grain, TplProps, Vignette, capWords, useCaps, wordSpring } from '../common';
import { BarChart, Camera, Glass3D, LineChart, Letters, OrbitRings, Particles, SlabWipe, StrokeIcon, clamp01, prog } from '../motion';
import { F } from '../fonts';

const GOO = 'goo-crimson';

/** Crimson Brand: liquid red gradient, 3D glass card with animated icon/chart, letter-level text, glass pill + cursor. */
export const Crimson: React.FC<TplProps> = ({ plan, overVideo }) => {
  const { frame, fps, t, idx, cap, exit, local } = useCaps(plan);
  const { durationInFrames } = useVideoConfig();
  const words = cap ? capWords(cap) : [];
  const d = (a: number, p: number) => Math.sin(t * a + p);
  const progress = frame / Math.max(1, durationInFrames);
  const capF = cap ? Math.round(cap.start * fps) : 0;
  const since = frame - capF;
  const cardIn = spring({ frame: since, fps, config: { damping: 13, stiffness: 100, mass: 0.8 } });
  const draw = prog(since, 4, 26);
  const vis = cap?.visual;
  const emphWord = cap && cap.emphasis != null ? words[cap.emphasis]?.t ?? '' : '';

  return (
    <AbsoluteFill style={{ background: overVideo ? 'rgba(24,0,2,0.45)' : '#050000', fontFamily: F.poppins, overflow: 'hidden' }}>
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <filter id={GOO}>
            <feGaussianBlur in="SourceGraphic" stdDeviation="34" result="b" />
            <feColorMatrix in="b" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 26 -11" />
          </filter>
        </defs>
      </svg>

      <Camera plan={plan} punch={0.04}>
        {!overVideo && (
          <>
            <AbsoluteFill style={{ transform: `rotate(${t * 4}deg) scale(1.6)`, background: 'conic-gradient(from 90deg at 50% 50%, #2a0000, #a40000, #120000, #d40a0a, #2a0000)', opacity: 0.6, filter: 'blur(80px)' }} />
            <div style={{ position: 'absolute', inset: 0, filter: `url(#${GOO}) blur(14px)`, opacity: 0.95 }}>
              {[0, 1, 2, 3, 4, 5].map((k) => (
                <div key={k} style={{ position: 'absolute', left: 360 + Math.sin(t * (0.35 + k * 0.09) + k * 1.7) * (230 + k * 30) - 190, top: 640 + Math.cos(t * (0.3 + k * 0.07) + k * 2.3) * (480 - k * 20) - 190, width: 380 + (k % 3) * 70, height: 380 + (k % 3) * 70, borderRadius: '50%', background: k % 2 ? 'radial-gradient(circle,#ff2a1a,#b00000)' : 'radial-gradient(circle,#c40000,#600000)' }} />
              ))}
            </div>
            <Blob x={430 + d(0.6, 1) * 210} y={620 + d(0.5, 2) * 260} size={700} color="#000" blur={70} opacity={0.85} />
            <div style={{ position: 'absolute', inset: -200, background: 'linear-gradient(115deg, transparent 42%, rgba(255,140,140,0.16) 50%, transparent 58%)', transform: `translateX(${((t * 110) % 1500) - 520}px)` }} />
            <Particles kind="embers" count={30} colors={['#ff7a4d', '#ffc27a', '#ff4d4d']} seed={3} speed={0.9} opacity={0.8} />
            <Particles kind="dust" count={26} colors={['#ffd0d0']} seed={9} opacity={0.6} />
            <Grain opacity={0.075} />
          </>
        )}

        {/* ghost outline word */}
        {cap && emphWord && (
          <div style={{ position: 'absolute', left: -120 - t * 18, top: 560, fontSize: 330, fontWeight: 800, whiteSpace: 'nowrap', color: 'transparent', WebkitTextStroke: '2px rgba(255,255,255,0.14)', transform: 'rotate(-7deg)', opacity: exit, textTransform: 'uppercase' }}>{emphWord} {emphWord}</div>
        )}

        {/* 3D glass card with the visual */}
        {cap && (
          <div style={{ position: 'absolute', inset: 0, opacity: exit, transform: `scale(${0.6 + 0.4 * cardIn})`, transformOrigin: '50% 37%', filter: `blur(${(1 - clamp01(cardIn)) * 12}px)` }}>
            {vis === 'chart_up' || vis === 'chart_down' ? (
              <Glass3D x={360} y={470} w={540} h={420} radius={56} rot={[-10, 6]} tint="rgba(255,255,255,0.18)">
                <div style={{ position: 'absolute', left: 30, top: 24, color: '#fff', fontSize: 24, fontWeight: 600, opacity: 0.85 }}>{vis === 'chart_up' ? 'Growth' : 'Drop'}</div>
                <div style={{ position: 'absolute', left: 30, right: 30, top: 80, bottom: 30 }}><LineChart w={460} h={280} progress={draw} color={vis === 'chart_up' ? '#ffffff' : '#ffb4b4'} seed={idx + 2} down={vis === 'chart_down'} /></div>
              </Glass3D>
            ) : cap.number != null ? (
              <Glass3D x={360} y={470} w={500} h={360} radius={56} rot={[-8, 5]} tint="rgba(255,255,255,0.18)">
                <div style={{ color: '#fff', fontSize: 150, fontWeight: 800, textShadow: '0 0 40px rgba(255,255,255,0.4)' }}>{Math.round(interpolate(draw, [0, 1], [0, cap.number])).toLocaleString('en-IN')}</div>
              </Glass3D>
            ) : vis ? (
              <Glass3D x={360} y={470} w={420} h={420} radius={100} rot={[-12, 8]} tint="rgba(255,255,255,0.2)">
                <StrokeIcon id={vis} size={230} color="#fff" width={1.5} progress={draw} glow="rgba(255,255,255,0.8)" />
              </Glass3D>
            ) : (
              <OrbitRings x={360} y={470} size={460} color="rgba(255,255,255,0.55)" accent="#fff" />
            )}
          </div>
        )}

        {/* kinetic text */}
        {cap && (
          <div style={{ position: 'absolute', left: 54, top: 758, display: 'flex', alignItems: 'center', gap: 14, opacity: exit * 0.85, color: '#fff', fontSize: 22, fontWeight: 600, letterSpacing: 4 }}>
            <span>{String(idx + 1).padStart(2, '0')}</span><span style={{ width: 70 * prog(since, 0, 14), height: 2, background: 'rgba(255,255,255,0.8)' }} />
          </div>
        )}
        {cap && (
          <div style={{ position: 'absolute', left: 54, right: 54, top: 800, opacity: exit, filter: `blur(${(1 - exit) * 12}px)` }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 22px', justifyContent: 'center', alignItems: 'center' }}>
              {words.map((w, i) => {
                const emph = cap.emphasis === i;
                const odd = i % 2 === 1;
                if (emph) {
                  const p = wordSpring(frame, fps, w.s);
                  const click = interpolate(frame - Math.round((w.s + 0.45) * fps), [0, 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
                  return (
                    <div key={i} style={{ position: 'relative', opacity: p, transform: `scale(${(0.72 + 0.28 * p) * (click > 0 && click < 0.5 ? 0.96 : 1)}) translateY(${(1 - p) * 30}px)` }}>
                      <div style={{ position: 'relative', overflow: 'hidden', background: 'linear-gradient(180deg,#fff 0%,#f1d3d5 55%,#d9a9ad 100%)', color: '#220608', borderRadius: 26, padding: '8px 34px 12px', fontSize: 72, fontWeight: 700, boxShadow: '0 18px 46px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.5), inset 0 -5px 12px rgba(150,0,20,0.28)' }}>
                        {w.t}
                        <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: '46%', background: 'linear-gradient(180deg, rgba(255,255,255,0.7), rgba(255,255,255,0))' }} />
                      </div>
                      {click > 0 && click < 1 && <div style={{ position: 'absolute', right: 6, bottom: -26, width: 70 * click, height: 70 * click, marginRight: -35 * click, marginBottom: -35 * click, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.8)', opacity: 1 - click }} />}
                      <svg width="52" height="52" viewBox="0 0 24 24" style={{ position: 'absolute', right: -18 + (1 - p) * 40, bottom: -34 + (1 - p) * 40, filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.5))' }}><path d="M4 2 L4 19 L8.5 15 L11.5 22 L14 21 L11 14 L17 14 Z" fill="#fff" stroke="#000" strokeWidth="1" /></svg>
                    </div>
                  );
                }
                return (
                  <span key={i} style={{ display: 'inline-block', fontSize: 80, lineHeight: 1.12, fontWeight: 600, fontStyle: odd ? 'italic' : 'normal', fontFamily: odd ? F.poppinsItalic : F.poppins, color: '#fff', textShadow: '0 4px 26px rgba(0,0,0,0.5)', transform: 'none' }}>
                    <Letters text={w.t} start={w.s - 0.04} frame={frame} fps={fps} fx="blur" stagger={1.4} />
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </Camera>

      <SlabWipe plan={plan} color="#7a0000" color2="#ff3b2f" />
      <div style={{ position: 'absolute', left: 54, right: 54, bottom: 70, height: 3, borderRadius: 3, background: 'rgba(255,255,255,0.16)' }}>
        <div style={{ width: `${progress * 100}%`, height: '100%', borderRadius: 3, background: 'rgba(255,255,255,0.9)', boxShadow: '0 0 12px #fff' }} />
      </div>
      <Vignette strength={0.42} />
    </AbsoluteFill>
  );
};
