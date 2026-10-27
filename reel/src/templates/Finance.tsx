import React from 'react';
import { AbsoluteFill, interpolate, spring } from 'remotion';
import { Grain, TplProps, Vignette, capWords, hash, useCaps, wordSpring } from '../common';
import { Camera, LineChart, Particles, clamp01, prog } from '../motion';
import { F } from '../fonts';

const B = '#3b5bff', B2 = '#7a93ff', DEEP = '#050826';

/** Glowing little AI head with shoulders. */
const Avatar: React.FC<{ t: number; p: number; y: number; scale: number }> = ({ t, p, y, scale }) => (
  <div style={{ position: 'absolute', left: 360 - 170, top: y - 120, width: 340, height: 300, opacity: p, transform: `translateY(${Math.sin(t * 1.6) * 6}px) scale(${scale * (0.8 + 0.2 * p)})`, transformOrigin: '50% 40%' }}>
    <div style={{ position: 'absolute', left: 10, right: 10, top: 150, height: 190, borderRadius: '170px 170px 0 0', background: `radial-gradient(ellipse at 50% 0%, ${B}cc, ${DEEP} 70%)`, boxShadow: `0 0 60px ${B}99, inset 0 0 30px ${B2}66`, border: `1.5px solid ${B2}88` }} />
    <div style={{ position: 'absolute', left: 110, top: 20, width: 120, height: 120, borderRadius: '50%', background: `radial-gradient(circle at 50% 35%, #0b1240, #02030c 75%)`, border: `2px solid ${B2}`, boxShadow: `0 0 36px ${B}, inset 0 0 22px ${B}66` }}>
      <div style={{ position: 'absolute', left: 36, top: 50, width: 6, height: 6, borderRadius: 3, background: '#fff', opacity: Math.sin(t * 2.2) > 0.96 ? 0.1 : 1 }} />
      <div style={{ position: 'absolute', left: 78, top: 50, width: 6, height: 6, borderRadius: 3, background: '#fff', opacity: Math.sin(t * 2.2) > 0.96 ? 0.1 : 1 }} />
      <div style={{ position: 'absolute', left: 48, top: 66, width: 24, height: 12, borderBottom: '2.5px solid #fff', borderRadius: '0 0 24px 24px' }} />
    </div>
  </div>
);

/** Equalizer "skyline" made of lit window cells. */
const Skyline: React.FC<{ t: number; side: 'l' | 'r'; level: number }> = ({ t, side, level }) => (
  <div style={{ position: 'absolute', bottom: 150, [side === 'l' ? 'left' : 'right']: -10, width: 230, display: 'flex', gap: 14, alignItems: 'flex-end', opacity: 0.9 }}>
    {Array.from({ length: 4 }, (_, c) => {
      const h = Math.round(2 + 9 * level * (0.45 + 0.55 * hash(c + (side === 'l' ? 1 : 9))) + Math.sin(t * 2 + c * 1.7) * 0.9);
      return (
        <div key={c} style={{ display: 'flex', flexDirection: 'column-reverse', gap: 8 }}>
          {Array.from({ length: Math.max(1, h) }, (_, r) => <div key={r} style={{ width: 38, height: 16, borderRadius: 3, background: `linear-gradient(90deg, ${B}, ${B2})`, opacity: 0.35 + 0.65 * hash(r * 5 + c + Math.floor(t * 2)), boxShadow: `0 0 10px ${B}66` }} />)}
        </div>
      );
    })}
  </div>
);

/** Finance Glow: black stage, blue light rays, glowing AI head, glass stat card with a counting number or live chart. */
export const Finance: React.FC<TplProps> = ({ plan, overVideo }) => {
  const { frame, fps, t, idx, cap, exit } = useCaps(plan);
  const words = cap ? capWords(cap) : [];
  const capF = cap ? Math.round(cap.start * fps) : 0;
  const since = frame - capF;
  const hasNum = cap?.number != null;
  const hasChart = !!cap?.visual && /chart|trend/.test(cap.visual);
  const card = hasNum || hasChart;
  const cardP = spring({ frame: since - 4, fps, config: { damping: 14, stiffness: 120, mass: 0.8 } });
  const draw = prog(since, 6, 28);
  const label = (cap && cap.emphasis != null ? words[cap.emphasis]?.t : '') || (hasNum ? 'Total' : 'Growth');
  const cur = (plan.style && plan.style.currency) || '';
  const level = card ? clamp01(0.35 + 0.65 * draw) : 0.25;
  const heroP = spring({ frame: frame - 2, fps, config: { damping: 16, stiffness: 90 } });

  return (
    <AbsoluteFill style={{ background: overVideo ? 'rgba(1,3,16,0.66)' : '#02030b', fontFamily: F.poppins, overflow: 'hidden' }}>
      <Camera plan={plan} punch={0.03} drift={0.015}>
        {!overVideo && (
          <>
            <div style={{ position: 'absolute', top: -200, right: -260, width: 900, height: 1700, transform: 'rotate(18deg)', background: `linear-gradient(180deg, ${B}55, transparent 70%)`, opacity: 0.55 + 0.15 * Math.sin(t * 0.8), filter: 'blur(26px)' }} />
            <div style={{ position: 'absolute', top: -200, right: 40, width: 420, height: 1500, transform: 'rotate(18deg)', background: `linear-gradient(180deg, ${B2}33, transparent 60%)`, filter: 'blur(40px)' }} />
            <Particles kind="dust" count={26} colors={[B2, '#ffffff']} seed={4} opacity={0.7} />
            <Skyline t={t} side="l" level={level} />
            <Skyline t={t} side="r" level={level} />
          </>
        )}

        <Avatar t={t} p={heroP} y={card ? 250 : 400} scale={card ? 0.9 : 1.1} />

        {cap && (
          <div style={{ position: 'absolute', left: 40, right: 40, top: card ? 120 : 690, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'baseline', gap: '6px 14px', opacity: exit }}>
            {words.map((w, i) => {
              const p = wordSpring(frame, fps, w.s);
              const emph = cap.emphasis === i;
              return <span key={i} style={{ display: 'inline-block', fontSize: card ? (emph ? 44 : 34) : emph ? 84 : 56, fontWeight: emph ? 800 : 500, color: emph ? B2 : '#fff', textShadow: emph ? `0 0 26px ${B}` : '0 2px 10px rgba(0,0,0,0.6)', opacity: clamp01(p * 1.4), transform: `translateY(${(1 - p) * 20}px)`, filter: `blur(${(1 - clamp01(p)) * 6}px)` }}>{w.t}</span>;
            })}
          </div>
        )}

        {cap && card && (
          <div style={{ position: 'absolute', left: 360 - 280, top: 540, width: 560, height: 300, opacity: clamp01(cardP * 1.3) * exit, transform: `translateY(${(1 - cardP) * 60}px) scale(${0.9 + 0.1 * cardP})` }}>
            <div style={{ position: 'absolute', inset: 0, borderRadius: 30, background: `linear-gradient(135deg, #141c66dd, #070a2fdd)`, border: `1.5px solid ${B2}88`, boxShadow: `0 0 50px ${B}66, inset 0 1px 0 rgba(255,255,255,0.25)`, backdropFilter: 'blur(14px)' }} />
            <div style={{ position: 'absolute', left: 28, top: 22, padding: '4px 16px', borderRadius: 8, background: `${B}`, color: '#fff', fontSize: 22, fontWeight: 600, textTransform: 'capitalize' }}>{label}</div>
            {hasNum ? (
              <div style={{ position: 'absolute', left: 28, right: 28, top: 84, fontSize: 112, fontWeight: 800, color: '#fff', textShadow: `0 0 30px ${B}`, lineHeight: 1.1 }}>
                {cur}{Math.round(interpolate(draw, [0, 1], [0, cap.number as number])).toLocaleString('en-IN')}
              </div>
            ) : (
              <div style={{ position: 'absolute', left: 36, top: 84 }}><LineChart w={488} h={170} progress={draw} color={B2} seed={idx + 5} down={cap.visual === 'chart_down'} /></div>
            )}
          </div>
        )}
      </Camera>
      <Vignette strength={0.6} />
      <Grain opacity={0.05} />
    </AbsoluteFill>
  );
};
