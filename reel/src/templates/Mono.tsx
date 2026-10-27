import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { Blob, Cap, Grain, TplProps, capWords, hash, useCaps, wordSpring } from '../common';
import { LineChart, Letters, StrokeIcon, clamp01, easeInOut, prog } from '../motion';
import { F } from '../fonts';

const MAROON = '#a23f4d';
const STAR = 'M50 0 C54 34 66 46 100 50 C66 54 54 66 50 100 C46 66 34 54 0 50 C34 46 46 34 50 0 Z';
const STAR_URI = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><path d='${STAR}' fill='black'/></svg>")`;

const Barcode: React.FC<{ p: number; seed: number }> = ({ p, seed }) => (
  <div style={{ display: 'flex', gap: 3, height: 54, alignItems: 'stretch' }}>
    {Array.from({ length: 34 }, (_, i) => <div key={i} style={{ width: 2 + Math.floor(hash(i + seed) * 5), background: '#111', opacity: clamp01(p * 40 - i) }} />)}
  </div>
);

const Page: React.FC<{ cap: Cap; idx: number; exit: number; overVideo: boolean }> = ({ cap, idx, exit, overVideo }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const white = idx % 2 === 0 && !overVideo;
  const words = capWords(cap);
  const emphI = cap.emphasis ?? words.length - 1;
  const big = words[emphI];
  const small = words.filter((_, i) => i !== emphI);
  const since = frame - Math.round(cap.start * fps);
  const vis = cap.visual;
  const draw = prog(since, 6, 28);
  const objIn = spring({ frame: since - 4, fps, config: { damping: 12, stiffness: 90, mass: 0.9 } });
  const bigP = spring({ frame: frame - Math.round((big?.s ?? cap.start) * fps), fps, config: { damping: 14, stiffness: 120, mass: 0.7 } });
  const size = big ? Math.max(90, Math.min(220, Math.floor(640 / (big.t.length * 0.5)))) : 150;
  const bob = Math.sin(t * 1.6) * 10;

  return (
    <AbsoluteFill style={{ background: overVideo ? 'rgba(0,0,0,0.42)' : white ? '#fff' : '#000', fontFamily: F.poppins, overflow: 'hidden', opacity: exit }}>
      {white && (
        <>
          <svg width="560" height="560" viewBox="0 0 100 100" style={{ position: 'absolute', right: -190, top: -170, transform: `rotate(${t * 16}deg) scale(${0.9 + 0.1 * Math.sin(t * 1.3)})` }}><path d={STAR} fill="#0a0a0a" /></svg>
          <svg width="460" height="460" viewBox="0 0 100 100" style={{ position: 'absolute', left: -170, bottom: -140, transform: `rotate(${-t * 12}deg) scale(${0.95 + 0.08 * Math.sin(t * 1.1 + 1)})` }}><path d={STAR} fill="#0a0a0a" /></svg>
          <div style={{ position: 'absolute', left: 0, right: 0, top: 380, textAlign: 'center', fontStyle: 'italic', fontFamily: F.poppinsItalic, fontWeight: 500, fontSize: 34, color: '#1b1b1b' }}>
            {small.map((w, i) => <span key={i} style={{ display: 'inline-block', marginRight: 10 }}><Letters text={w.t} start={w.s - 0.03} frame={frame} fps={fps} fx="rise" stagger={0.9} /></span>)}
          </div>
          {big && (
            <div style={{ position: 'absolute', left: 0, right: 0, top: 430, textAlign: 'center' }}>
              <div style={{ overflow: 'hidden', height: size * 1.12 }}>
                <div style={{ fontFamily: F.anton, fontSize: size, lineHeight: 1.08, textTransform: 'uppercase', color: MAROON, transform: `translateY(${(1 - bigP) * 112}%) skewY(${(1 - bigP) * 6}deg)`, letterSpacing: interpolate(bigP, [0, 1], [14, 0]) }}>{big.t}</div>
              </div>
            </div>
          )}
          {/* object on a studio floor */}
          <div style={{ position: 'absolute', left: 0, right: 0, top: 690, height: 340, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${0.5 + 0.5 * objIn})`, opacity: clamp01(objIn * 1.3) }}>
            <div style={{ position: 'absolute', bottom: 18, width: 280 - bob * 3, height: 36, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(0,0,0,0.38), rgba(0,0,0,0) 70%)' }} />
            <div style={{ transform: `translateY(${bob}px) rotate(${Math.sin(t * 1.1) * 4}deg)`, filter: 'drop-shadow(14px 22px 12px rgba(0,0,0,0.25))' }}>
              {vis === 'chart_up' || vis === 'chart_down' ? <LineChart w={380} h={220} progress={draw} color="#111" seed={idx + 6} down={vis === 'chart_down'} fill={false} />
                : cap.number != null ? <div style={{ fontFamily: F.anton, fontSize: 230, color: '#111' }}>{Math.round(interpolate(draw, [0, 1], [0, cap.number]))}</div>
                : <StrokeIcon id={vis ?? 'sparkles'} size={250} color="#0b0b0b" width={1.7} progress={draw} />}
            </div>
          </div>
          <div style={{ position: 'absolute', right: 56, bottom: 90 }}><Barcode p={prog(since, 4, 22)} seed={idx * 7} /></div>
        </>
      )}

      {!white && (
        <>
          {!overVideo && (
            <>
              <Blob x={690 + Math.sin(t * 0.6) * 30} y={80} size={640} color={MAROON} blur={70} opacity={0.95} />
              <Blob x={30} y={1230 + Math.cos(t * 0.5) * 30} size={680} color={MAROON} blur={80} opacity={0.8} />
            </>
          )}
          <div style={{ position: 'absolute', left: 0, right: 0, top: 330, display: 'flex', justifyContent: 'center', opacity: clamp01(objIn * 1.3), transform: `scale(${0.6 + 0.4 * objIn}) translateY(${bob}px)` }}>
            {vis === 'chart_up' || vis === 'chart_down' ? <LineChart w={360} h={200} progress={draw} color="#ff6a7e" seed={idx + 6} down={vis === 'chart_down'} />
              : cap.number != null ? <div style={{ fontFamily: F.anton, fontSize: 200, color: '#fff', textShadow: '0 0 30px #ff2d55' }}>{Math.round(interpolate(draw, [0, 1], [0, cap.number]))}</div>
              : <StrokeIcon id={vis ?? 'sparkles'} size={230} color="#fff" width={1.4} progress={draw} glow="#ff2d55" />}
          </div>
          <div style={{ position: 'absolute', left: 50, right: 50, top: 700, textAlign: 'center', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '6px 16px' }}>
            {words.map((w, i) => { const p = wordSpring(frame, fps, w.s); const e = i === emphI; return (
              <span key={i} style={{ fontSize: e ? 84 : 52, fontWeight: e ? 800 : 600, color: e ? '#ff6a7e' : '#fff', opacity: p, transform: `translateY(${(1 - p) * 26}px) scale(${0.9 + 0.1 * p})`, textShadow: e ? '0 0 20px #ff2d55, 0 0 50px #a23f4d' : '0 0 14px rgba(255,80,110,0.7)' }}>{w.t}</span>
            ); })}
          </div>
        </>
      )}
      <Grain opacity={white ? 0.035 : 0.05} />
    </AbsoluteFill>
  );
};

/** Mono Editorial: white/black pages, giant rotating stars, maroon Anton type, studio-floor objects, star-iris page transitions. */
export const Mono: React.FC<TplProps> = ({ plan, overVideo }) => {
  const { frame, fps, idx, cap, exit } = useCaps(plan);
  if (!cap) return <AbsoluteFill style={{ background: overVideo ? 'transparent' : '#fff' }} />;
  const since = frame - Math.round(cap.start * fps);
  const prevCap = idx > 0 ? plan.captions[idx - 1] : undefined;
  const iris = prevCap && since < 22 && !overVideo;
  const size = interpolate(since, [0, 20], [0, 2600], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: easeInOut });
  return (
    <AbsoluteFill>
      {iris && prevCap && <Page cap={prevCap} idx={idx - 1} exit={1} overVideo={overVideo} />}
      <div style={iris ? { position: 'absolute', inset: 0, WebkitMaskImage: STAR_URI, maskImage: STAR_URI, WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat', WebkitMaskPosition: 'center', maskPosition: 'center', WebkitMaskSize: `${size}px ${size}px`, maskSize: `${size}px ${size}px` } : { position: 'absolute', inset: 0 }}>
        <Page cap={cap} idx={idx} exit={exit} overVideo={overVideo} />
      </div>
    </AbsoluteFill>
  );
};
