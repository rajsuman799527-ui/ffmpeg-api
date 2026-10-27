import React from 'react';
import { AbsoluteFill, interpolate, spring } from 'remotion';
import { Grain, TplProps, Vignette, capWords, hash, useCaps, wordSpring } from '../common';
import { Camera, LineChart, clamp01, prog } from '../motion';
import { F } from '../fonts';

const RED = '#e1060f', RED_D = '#8a0006';

/** A banknote made of CSS: green-grey paper, border, oval, corner numerals. */
const Note: React.FC<{ i: number; t: number; tint: number }> = ({ i, t, tint }) => {
  const r1 = hash(i * 3 + 1), r2 = hash(i * 5 + 2), r3 = hash(i * 7 + 3);
  const speed = 60 + r3 * 90;
  const y = ((t * speed + r2 * 1700) % 1700) - 220;
  const x = r1 * 760 - 80 + Math.sin(t * 0.6 + i) * 24;
  const rot = (r2 - 0.5) * 120 + t * (r3 - 0.5) * 40;
  const s = 0.55 + r3 * 0.7;
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: 280, height: 128, transform: `rotate(${rot}deg) scale(${s})`, borderRadius: 10, background: tint ? `linear-gradient(135deg, ${RED}, ${RED_D})` : 'linear-gradient(135deg, #9fb09a, #5d6e5a)', border: '3px solid rgba(255,255,255,0.45)', opacity: tint ? 0.28 : 0.5, filter: `blur(${(1 - r3) * 3}px)`, boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
      <div style={{ position: 'absolute', left: 90, top: 14, width: 100, height: 100, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.5)' }} />
      <div style={{ position: 'absolute', left: 14, top: 8, fontFamily: F.anton, fontSize: 34, color: 'rgba(255,255,255,0.8)' }}>1</div>
      <div style={{ position: 'absolute', right: 14, bottom: 6, fontFamily: F.anton, fontSize: 34, color: 'rgba(255,255,255,0.8)' }}>1</div>
    </div>
  );
};

const Arcs: React.FC<{ t: number }> = ({ t }) => (
  <svg width="720" height="1280" viewBox="0 0 720 1280" style={{ position: 'absolute', inset: 0, opacity: 0.5 }}>
    {[330, 470, 620, 780].map((r, i) => (
      <circle key={i} cx={760} cy={260} r={r + Math.sin(t * 0.4 + i) * 10} fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1.2" strokeDasharray={i % 2 ? '2 0' : '1200 400'} transform={`rotate(${t * (6 + i * 3) * (i % 2 ? -1 : 1)} 760 260)`} />
    ))}
  </svg>
);

/** Money Red: charcoal stage, falling banknotes, thin arcs, red highlight box on the key word, red chart card with a counting figure. */
export const Money: React.FC<TplProps> = ({ plan, overVideo }) => {
  const { frame, fps, t, idx, cap, exit } = useCaps(plan);
  const words = cap ? capWords(cap) : [];
  const capF = cap ? Math.round(cap.start * fps) : 0;
  const since = frame - capF;
  const hasNum = cap?.number != null;
  const hasChart = !!cap?.visual && /chart|trend/.test(cap.visual);
  const card = hasNum || hasChart;
  const cardP = spring({ frame: since - 3, fps, config: { damping: 13, stiffness: 120, mass: 0.8 } });
  const draw = prog(since, 6, 30);
  const cur = (plan.style && plan.style.currency) || '';
  const down = cap?.visual !== 'chart_up' && cap?.visual !== 'trend';

  return (
    <AbsoluteFill style={{ background: overVideo ? 'rgba(12,12,12,0.68)' : '#121212', fontFamily: F.poppins, overflow: 'hidden' }}>
      <Camera plan={plan} punch={0.03} drift={0.012}>
        {!overVideo && (
          <>
            <Arcs t={t} />
            {Array.from({ length: 8 }, (_, i) => <Note key={i} i={i} t={t} tint={i % 2} />)}
          </>
        )}

        {cap && card && (
          <>
            {hasNum && (
              <div style={{ position: 'absolute', left: 0, right: 0, top: 170, textAlign: 'center', fontWeight: 800, fontSize: 118, color: '#fff', textShadow: `0 0 30px ${RED}`, opacity: clamp01(cardP * 1.5) * exit, transform: `scale(${0.85 + 0.15 * cardP})` }}>
                {cur}{Math.round(interpolate(draw, [0, 1], [0, cap.number as number])).toLocaleString('en-IN')}
              </div>
            )}
            <div style={{ position: 'absolute', left: 360 - 230, top: hasNum ? 350 : 300, width: 460, height: 460, borderRadius: 64, background: `linear-gradient(160deg, ${RED}, ${RED_D})`, border: '4px solid rgba(255,255,255,0.92)', boxShadow: `0 30px 80px ${RED}66, inset 0 2px 0 rgba(255,255,255,0.4)`, opacity: clamp01(cardP * 1.4) * exit, transform: `translateY(${(1 - cardP) * 80}px) scale(${0.9 + 0.1 * cardP}) rotate(${(1 - cardP) * -6}deg)` }}>
              <div style={{ position: 'absolute', left: 36, top: 70 }}><LineChart w={388} h={300} progress={draw} color="#fff" seed={idx + 2} down={down} fill={false} /></div>
            </div>
          </>
        )}

        {cap && (
          <div style={{ position: 'absolute', left: 40, right: 40, top: card ? 880 : 470, minHeight: 240, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: '8px 16px', opacity: exit }}>
            {words.map((w, i) => {
              const p = wordSpring(frame, fps, w.s);
              const emph = cap.emphasis === i;
              const boxP = emph ? prog(frame - Math.round(w.s * fps), 0, 12) : 0;
              return (
                <span key={i} style={{ position: 'relative', display: 'inline-block', padding: emph ? '2px 22px' : '0 2px', fontSize: card ? (emph ? 52 : 38) : emph ? 84 : 52, fontWeight: emph ? 800 : 400, color: '#fff', lineHeight: 1.2, opacity: clamp01(p * 1.4), transform: `translateY(${(1 - p) * 22}px)`, filter: `blur(${(1 - clamp01(p)) * 7}px)` }}>
                  {emph && <span style={{ position: 'absolute', inset: 0, borderRadius: 8, background: `linear-gradient(180deg, #ff2a31, ${RED})`, boxShadow: `0 0 34px ${RED}aa`, transform: `scaleX(${boxP})`, transformOrigin: 'left' }} />}
                  <span style={{ position: 'relative' }}>{w.t}</span>
                </span>
              );
            })}
          </div>
        )}
      </Camera>
      <Vignette strength={0.55} />
      <Grain opacity={0.07} />
    </AbsoluteFill>
  );
};
