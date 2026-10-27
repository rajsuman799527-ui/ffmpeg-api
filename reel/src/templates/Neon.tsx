import React from 'react';
import { AbsoluteFill, interpolate, spring } from 'remotion';
import { Blob, Grain, TplProps, Vignette, capWords, hash, useCaps, wordSpring } from '../common';
import { Camera, LineChart, Particles, SlabWipe, StrokeIcon, clamp01, prog } from '../motion';
import { F } from '../fonts';

const V = '#a64dff', P = '#ff3fd0', C = '#3fe0ff';

const GridFloor: React.FC<{ t: number }> = ({ t }) => (
  <div style={{ position: 'absolute', left: -300, right: -300, bottom: -40, height: 640, perspective: 520, WebkitMaskImage: 'linear-gradient(to top, #000 30%, transparent 95%)', maskImage: 'linear-gradient(to top, #000 30%, transparent 95%)' }}>
    <div style={{ position: 'absolute', inset: 0, transform: 'rotateX(68deg)', transformOrigin: '50% 100%', backgroundImage: `linear-gradient(${V} 2px, transparent 2px), linear-gradient(90deg, ${V} 2px, transparent 2px)`, backgroundSize: '90px 90px', backgroundPosition: `0 ${(t * 70) % 90}px`, opacity: 0.55, filter: `drop-shadow(0 0 6px ${V})` }} />
  </div>
);

const NeonClock: React.FC<{ t: number; p: number }> = ({ t, p }) => (
  <svg width="340" height="340" viewBox="0 0 100 100" style={{ filter: `drop-shadow(0 0 10px ${P}) drop-shadow(0 0 26px ${V})`, opacity: p, transform: `scale(${0.6 + 0.4 * p})` }}>
    <circle cx="50" cy="50" r="44" fill="rgba(20,0,40,0.55)" stroke={P} strokeWidth="2.2" />
    <circle cx="50" cy="50" r="38" fill="none" stroke={V} strokeWidth="0.8" strokeDasharray="1 3.2" />
    {Array.from({ length: 12 }, (_, i) => <line key={i} x1="50" y1="9" x2="50" y2={i % 3 === 0 ? 16 : 13} stroke="#fff" strokeWidth={i % 3 === 0 ? 2 : 1} transform={`rotate(${i * 30} 50 50)`} />)}
    <line x1="50" y1="50" x2="50" y2="24" stroke={C} strokeWidth="3" strokeLinecap="round" transform={`rotate(${t * 40} 50 50)`} />
    <line x1="50" y1="50" x2="50" y2="14" stroke="#fff" strokeWidth="2" strokeLinecap="round" transform={`rotate(${t * 240} 50 50)`} />
    <circle cx="50" cy="50" r="3" fill="#fff" />
  </svg>
);

const NeonCalendar: React.FC<{ t: number; p: number; local: number }> = ({ t, p, local }) => {
  const hi = 14 + Math.floor(local * 6);
  return (
    <div style={{ width: 420, height: 340, borderRadius: 34, background: 'linear-gradient(160deg, rgba(60,0,110,0.6), rgba(15,0,35,0.8))', border: `1.5px solid ${V}`, boxShadow: `0 0 40px ${V}88, inset 0 0 40px rgba(166,77,255,0.25)`, padding: '22px 26px', opacity: p, transform: `scale(${0.7 + 0.3 * p}) rotateX(${(1 - p) * 40}deg)`, fontFamily: F.poppins }}>
      <div style={{ color: '#fff', fontSize: 26, fontWeight: 700, marginBottom: 12, textShadow: `0 0 12px ${V}` }}>October</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '10px 4px', textAlign: 'center' }}>
        {Array.from({ length: 28 }, (_, i) => {
          const d = i + 1; const on = d === hi;
          return <div key={i} style={{ position: 'relative', height: 38, lineHeight: '38px', fontSize: 22, fontWeight: 600, color: on ? '#fff' : 'rgba(255,255,255,0.55)' }}>
            {on && <div style={{ position: 'absolute', inset: 0, margin: 'auto', width: 40, height: 40, borderRadius: '50%', background: P, boxShadow: `0 0 20px ${P}`, transform: `scale(${1 + 0.08 * Math.sin(t * 8)})` }} />}
            <span style={{ position: 'relative' }}>{d}</span>
          </div>;
        })}
      </div>
    </div>
  );
};

const Rings3D: React.FC<{ t: number; p: number; children?: React.ReactNode }> = ({ t, p, children }) => (
  <div style={{ position: 'relative', width: 440, height: 440, perspective: 900, opacity: p, transform: `scale(${0.6 + 0.4 * p})` }}>
    <div style={{ position: 'absolute', inset: 0, transformStyle: 'preserve-3d' }}>
      {[0, 1, 2].map((k) => (
        <div key={k} style={{ position: 'absolute', inset: k * 26, borderRadius: '50%', border: `${3 - k * 0.6}px solid ${[P, V, C][k]}`, boxShadow: `0 0 18px ${[P, V, C][k]}, inset 0 0 18px ${[P, V, C][k]}55`, transform: `rotateX(${60 + Math.sin(t * 0.8 + k) * 20}deg) rotateY(${t * (50 + k * 25) * (k % 2 ? -1 : 1)}deg) rotateZ(${k * 40}deg)` }} />
      ))}
    </div>
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{children}</div>
  </div>
);

/** Neon Violet: synthwave grid, 3D neon rings, glowing clock/calendar/icons, flickering neon words with chromatic edges. */
export const Neon: React.FC<TplProps> = ({ plan, overVideo }) => {
  const { frame, fps, t, idx, cap, exit, local } = useCaps(plan);
  const words = cap ? capWords(cap) : [];
  const capF = cap ? Math.round(cap.start * fps) : 0;
  const since = frame - capF;
  const heroIn = spring({ frame: since, fps, config: { damping: 14, stiffness: 100, mass: 0.8 } });
  const draw = prog(since, 4, 26);
  const vis = cap?.visual;
  const pulse = 0.8 + 0.2 * Math.sin(t * 4);

  return (
    <AbsoluteFill style={{ background: overVideo ? 'rgba(10,0,28,0.55)' : '#05010d', fontFamily: F.poppins, overflow: 'hidden' }}>
      <Camera plan={plan} punch={0.035}>
        {!overVideo && (
          <>
            <Blob x={160 + Math.sin(t * 0.5) * 130} y={300 + Math.cos(t * 0.4) * 110} size={880} color="#7a1cff" blur={95} opacity={0.62} />
            <Blob x={580 + Math.cos(t * 0.45) * 110} y={960 + Math.sin(t * 0.35) * 150} size={800} color="#ff2fb4" blur={95} opacity={0.4} />
            <Blob x={380} y={560 + Math.sin(t * 0.6) * 80} size={520} color="#2a5bff" blur={90} opacity={0.28} />
            <GridFloor t={t} />
            <Particles kind="sparkle" count={22} colors={['#e9c9ff', '#ff9af0', '#9fe8ff']} seed={11} opacity={0.9} />
            <div style={{ position: 'absolute', left: 0, right: 0, top: ((t * 260) % 1500) - 100, height: 3, background: `linear-gradient(90deg, transparent, ${C}, transparent)`, opacity: 0.35, filter: `blur(1px)` }} />
          </>
        )}

        {cap && (
          <div style={{ position: 'absolute', left: 0, right: 0, top: 230, height: 460, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: exit, filter: `blur(${(1 - clamp01(heroIn)) * 10}px)` }}>
            {vis === 'clock' ? <NeonClock t={t} p={heroIn} />
              : vis === 'calendar' ? <NeonCalendar t={t} p={heroIn} local={local} />
              : vis === 'chart_up' || vis === 'chart_down' ? (
                <Rings3D t={t} p={heroIn}><LineChart w={250} h={160} progress={draw} color="#fff" seed={idx + 3} down={vis === 'chart_down'} /></Rings3D>
              ) : cap.number != null ? (
                <Rings3D t={t} p={heroIn}><div style={{ fontSize: 150, fontWeight: 800, color: '#fff', textShadow: `0 0 20px ${P}, 0 0 60px ${V}` }}>{Math.round(interpolate(draw, [0, 1], [0, cap.number]))}</div></Rings3D>
              ) : (
                <Rings3D t={t} p={heroIn}>{vis ? <StrokeIcon id={vis} size={170} color="#fff" width={1.5} progress={draw} glow={P} /> : <div style={{ width: 90, height: 90, borderRadius: '50%', background: '#fff', boxShadow: `0 0 50px ${P}, 0 0 110px ${V}` }} />}</Rings3D>
              )}
          </div>
        )}

        {cap && (
          <div style={{ position: 'absolute', left: 36, right: 36, top: 760, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'baseline', gap: '2px 18px', opacity: exit }}>
            {words.map((w, i) => {
              const p = wordSpring(frame, fps, w.s);
              const emph = cap.emphasis === i;
              const age = frame - Math.round(w.s * fps);
              const flick = age < 9 ? (hash(frame * 7 + i) > 0.45 ? 1 : 0.25) : 1;
              const jit = p < 0.7 ? (hash(frame * 3 + i) - 0.5) * 14 : 0;
              const glow = emph ? `0 0 14px ${P}, 0 0 42px ${V}, 0 0 90px ${V}` : `0 0 10px ${V}, 0 0 30px ${V}`;
              return (
                <span key={i} style={{ display: 'inline-block', fontWeight: emph ? 800 : 700, fontSize: emph ? 124 : 72, color: '#fff', opacity: p * flick, transform: `translate(${jit}px, ${(1 - p) * 34}px) scale(${0.85 + 0.15 * p})`, textShadow: `${glow}, 4px 0 0 rgba(255,0,90,${0.55 * pulse}), -4px 0 0 rgba(0,210,255,${0.5 * pulse})`, background: emph ? 'linear-gradient(180deg,#fff 25%,#ff9af5 100%)' : undefined, WebkitBackgroundClip: emph ? 'text' : undefined, WebkitTextFillColor: emph ? 'transparent' : undefined, filter: emph ? `drop-shadow(0 0 18px ${V})` : undefined }}>{w.t}</span>
              );
            })}
          </div>
        )}
      </Camera>
      <SlabWipe plan={plan} color="#4a0fb0" color2="#ff3fd0" />
      <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.03) 0 1px, transparent 1px 4px)' }} />
      <Vignette strength={0.55} />
      <Grain opacity={0.06} />
    </AbsoluteFill>
  );
};
