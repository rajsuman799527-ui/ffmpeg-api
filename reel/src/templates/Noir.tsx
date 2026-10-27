import React from 'react';
import { AbsoluteFill, interpolate, spring } from 'remotion';
import { Grain, TplProps, Vignette, capWords, hash, useCaps, wordSpring } from '../common';
import { Camera, LineChart, Particles, SlabWipe, StrokeIcon, clamp01, prog } from '../motion';
import { F } from '../fonts';

const CREAM = '#f4ede6';
const FAR = Array.from({ length: 16 }, (_, i) => ({ ch: ['?', ',', '•', '"', '○', '?'][i % 6], x: 20 + hash(i + 1) * 680, y: 40 + hash(i + 40) * 1200, s: 30 + hash(i + 9) * 40, sp: 0.25 + hash(i + 5) * 0.5 }));
const NEAR = Array.from({ length: 7 }, (_, i) => ({ ch: ['?', '“', '?', ',', '?', '●', '"'][i % 7], x: -40 + hash(i + 71) * 760, y: 60 + hash(i + 33) * 1160, s: 120 + hash(i + 19) * 150, sp: 0.5 + hash(i + 8) * 0.8 }));

/** Editorial Noir: maroon vignette, halftone disc with sticker icon, floating punctuation, serif caps, ink underline. */
export const Noir: React.FC<TplProps> = ({ plan, overVideo }) => {
  const { frame, fps, t, idx, cap, exit, local } = useCaps(plan);
  const words = cap ? capWords(cap) : [];
  const emphI = cap?.emphasis ?? -1;
  const big = emphI >= 0 ? words[emphI] : words[words.length - 1];
  const small = words.filter((w) => w !== big);
  const bigSize = big ? Math.max(70, Math.min(158, Math.floor(600 / (big.t.length * 0.6)))) : 120;
  const capF = cap ? Math.round(cap.start * fps) : 0;
  const since = frame - capF;
  const discIn = spring({ frame: since, fps, config: { damping: 14, stiffness: 90, mass: 0.9 } });
  const draw = prog(since, 6, 26);
  const vis = cap?.visual;
  const bigStart = big ? big.s : 0;
  const bigP = big ? spring({ frame: frame - Math.round(bigStart * fps), fps, config: { damping: 15, stiffness: 110, mass: 0.7 } }) : 0;
  const underline = big ? prog(frame - Math.round(bigStart * fps), 8, 22) : 0;

  return (
    <AbsoluteFill style={{ background: overVideo ? 'rgba(22,2,8,0.5)' : 'radial-gradient(circle at 50% 30%, #561224 0%, #1d060e 55%, #0a0206 100%)', fontFamily: F.playfair, overflow: 'hidden' }}>
      <Camera plan={plan} punch={0.03} drift={0.03}>
        {!overVideo && (
          <>
            <div style={{ position: 'absolute', inset: -40, backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.09) 1.3px, transparent 1.8px)`, backgroundSize: '9px 9px', transform: `translate(${Math.sin(t * 0.2) * 14}px, ${t * 6 % 9}px)` }} />
            {FAR.map((g, i) => (
              <div key={'f' + i} style={{ position: 'absolute', left: g.x, top: g.y + Math.sin(t * g.sp + i) * 26, fontSize: g.s, color: 'rgba(240,230,226,0.42)', filter: 'blur(1.6px)', transform: `rotate(${Math.sin(t * g.sp * 0.7 + i) * 28}deg)`, fontWeight: 900 }}>{g.ch}</div>
            ))}
            <Particles kind="dust" count={34} colors={['#f1d9d0']} seed={5} opacity={0.7} />
          </>
        )}

        {/* halftone disc + sticker visual */}
        {cap && (
          <div style={{ position: 'absolute', left: 360 - 250, top: 470 - 250, width: 500, height: 500, opacity: exit, transform: `scale(${0.4 + 0.6 * discIn}) rotate(${(1 - discIn) * -25}deg)`, filter: `blur(${(1 - clamp01(discIn)) * 10}px)` }}>
            <div style={{ position: 'absolute', inset: 30, borderRadius: '50%', background: 'radial-gradient(circle at 40% 35%, #7e1a2c, #3a0914 70%)', boxShadow: '0 0 90px rgba(190,40,60,0.45), inset 0 0 60px rgba(0,0,0,0.5)' }} />
            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', backgroundImage: 'radial-gradient(circle, rgba(244,237,230,0.95) 0 2.2px, transparent 2.8px)', backgroundSize: '15px 15px', WebkitMaskImage: 'radial-gradient(circle, transparent 38%, #000 62%, transparent 72%)', maskImage: 'radial-gradient(circle, transparent 38%, #000 62%, transparent 72%)', transform: `rotate(${t * 8}deg)` }} />
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {vis === 'chart_up' || vis === 'chart_down' ? (
                <LineChart w={300} h={190} progress={draw} color={CREAM} seed={idx + 4} down={vis === 'chart_down'} />
              ) : cap.number != null ? (
                <div style={{ fontSize: 190, fontWeight: 900, color: CREAM, textShadow: '6px 8px 0 rgba(10,0,4,0.7)' }}>{Math.round(interpolate(draw, [0, 1], [0, cap.number]))}</div>
              ) : vis ? (
                <div style={{ filter: 'drop-shadow(6px 9px 0 rgba(10,0,4,0.7))' }}><StrokeIcon id={vis} size={230} color={CREAM} width={1.9} progress={draw} /></div>
              ) : (
                <div style={{ fontSize: 420, lineHeight: 0.8, fontWeight: 900, color: CREAM, marginTop: 120, textShadow: '8px 10px 0 rgba(10,0,4,0.7)' }}>“</div>
              )}
            </div>
          </div>
        )}

        {/* red ribbon crossing behind the text */}
        {cap && idx % 2 === 1 && (
          <svg width="900" height="360" viewBox="0 0 900 360" style={{ position: 'absolute', left: -90 - (1 - prog(since, 0, 16)) * 700, top: 640 + Math.sin(t * 1.1) * 12, opacity: exit * 0.9 }}>
            <path d="M0 110 C 180 10, 340 200, 520 90 S 800 40, 900 120 L 900 270 C 720 360, 540 220, 340 300 S 100 330, 0 280 Z" fill="#8c1624" />
          </svg>
        )}

        {/* text */}
        {cap && (
          <div style={{ position: 'absolute', left: 58, right: 58, top: 770, opacity: exit, filter: `blur(${(1 - exit) * 8}px)` }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px', marginBottom: 6 }}>
              {small.map((w, i) => { const p = wordSpring(frame, fps, w.s); return (
                <span key={i} style={{ fontFamily: F.inter, fontWeight: 600, fontSize: 30, letterSpacing: 5, textTransform: 'uppercase', color: '#d9cdca', opacity: p, transform: `translateY(${(1 - p) * 22}px)` }}>{w.t}</span>
              ); })}
            </div>
            {big && (
              <div style={{ position: 'relative' }}>
                <div style={{ overflow: 'hidden', paddingBottom: 6 }}>
                  <div style={{ fontSize: bigSize, fontWeight: 900, lineHeight: 0.98, textTransform: 'uppercase', color: CREAM, letterSpacing: interpolate(bigP, [0, 1], [18, -1]), transform: `translateY(${(1 - bigP) * 105}%)`, textShadow: '0 10px 34px rgba(0,0,0,0.55)', whiteSpace: 'nowrap' }}>{big.t}</div>
                </div>
                <svg width="460" height="22" viewBox="0 0 460 22" style={{ display: 'block', marginTop: 4 }}>
                  <path d="M2 14 C 70 2, 150 22, 230 10 S 380 16, 458 6" stroke="#c8283c" strokeWidth="6" strokeLinecap="round" fill="none" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - underline} />
                </svg>
              </div>
            )}
          </div>
        )}

        {!overVideo && NEAR.map((g, i) => (
          <div key={'n' + i} style={{ position: 'absolute', left: g.x, top: g.y + Math.sin(t * g.sp + i * 2) * 60, fontSize: g.s, color: 'rgba(244,237,230,0.1)', transform: `rotate(${Math.sin(t * g.sp * 0.5 + i) * 35}deg)`, fontWeight: 900, filter: 'blur(5px)' }}>{g.ch}</div>
        ))}
      </Camera>
      <SlabWipe plan={plan} color="#5a0d1a" color2="#a3182b" />
      <Vignette strength={0.72} />
      <Grain opacity={0.11} />
    </AbsoluteFill>
  );
};
