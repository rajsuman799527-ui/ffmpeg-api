import React from 'react';
import { Img, spring } from 'remotion';
import { FONT, Icon, clamp01 } from './ui';
import { useTheme, type Theme } from './theme';
import { useBeat } from './beat';
import { KText } from './ktext';
import type { G } from './scenes';

type SP = { g: G; anim: string; frame: number; fps: number; dur: number };

/** Glass animations run this much faster than the raw frame counter (1 = original). Sound cues in Studio use the same number. */
export const GLASS_SPEED = 1.4;

export const GLASS_TYPES = ['glass_stat', 'glass_list', 'glass_orbs', 'glass_quote', 'glass_compare', 'glass_steps', 'glass_chart', 'glass_icon', 'glass_tags', 'photo_3d', 'photo_stack', 'photo_wide', 'glass_price', 'glass_rating', 'glass_phone', 'glass_ring', 'glass_pin'];

const ease = (t: number) => 1 - Math.pow(1 - clamp01(t), 3);
const seg = (frame: number, a: number, b: number) => ease((frame - a) / (b - a));
const spr = (frame: number, fps: number, delay = 0, damping = 13, stiffness = 140) =>
  spring({ frame: frame - delay, fps, config: { damping, stiffness, mass: 0.7 } });
const split = (s: string): [string, string] => {
  const i = String(s || '').indexOf('|');
  return i < 0 ? [String(s || '').trim(), ''] : [s.slice(0, i).trim(), s.slice(i + 1).trim()];
};
const ICON_CYCLE = ['check', 'star', 'bolt', 'heart', 'fire', 'chart'];
const hasNum = (g: G) => g.number != null && !Number.isNaN(Number(g.number));

/** Frosted glass: blurred backdrop, bright edge, inner highlight, soft shadow. */
const glassStyle = (T: Theme, r = 36, blur = 26): React.CSSProperties => ({
  position: 'relative', borderRadius: r, overflow: 'hidden',
  background: T.dark
    ? 'linear-gradient(145deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.05) 46%, rgba(255,255,255,0.11) 100%)'
    : 'linear-gradient(145deg, rgba(255,255,255,0.80) 0%, rgba(255,255,255,0.44) 50%, rgba(255,255,255,0.68) 100%)',
  backdropFilter: `blur(${blur}px) saturate(1.7)`, WebkitBackdropFilter: `blur(${blur}px) saturate(1.7)`,
  border: `1.5px solid ${T.dark ? 'rgba(255,255,255,0.30)' : 'rgba(255,255,255,0.95)'}`,
  boxShadow: `0 26px 60px ${T.dark ? 'rgba(0,0,0,0.5)' : 'rgba(40,40,70,0.20)'}, inset 0 1.5px 0 rgba(255,255,255,${T.dark ? 0.45 : 0.95}), inset 0 -1px 0 rgba(255,255,255,0.14)`,
});

/** A bright band that sweeps across the glass once. */
const Sheen: React.FC<{ frame: number; start?: number; len?: number; strength?: number }> = ({ frame, start = 10, len = 40, strength = 0.38 }) => {
  const p = clamp01((frame - start) / len);
  return (
    <div style={{ position: 'absolute', top: -40, bottom: -40, width: '36%', left: `${-45 + p * 165}%`, transform: 'skewX(-18deg)', opacity: p > 0 && p < 1 ? 1 : 0, pointerEvents: 'none', background: `linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,${strength}), rgba(255,255,255,0))` }} />
  );
};

/** Coloured light behind the glass, so the frosting has something to blur. */
const Stage: React.FC<{ frame: number; children: React.ReactNode }> = ({ frame, children }) => {
  const T = useTheme();
  const b = useBeat();
  const second = T.dark ? '#7C4DFF' : '#FF8A00';
  const third = T.dark ? '#22D3EE' : '#FF4D6D';
  const orb = (i: number, size: number, x: number, y: number, c: string) => (
    <div key={i} style={{ position: 'absolute', left: `calc(50% + ${x + Math.sin((frame + i * 37) / 46) * 18}px)`, top: `calc(50% + ${y + Math.cos((frame + i * 23) / 52) * 16}px)`, width: size, height: size, marginLeft: -size / 2, marginTop: -size / 2, borderRadius: '50%', background: `radial-gradient(circle at 35% 30%, ${c}ff 0%, ${c}aa 45%, ${c}00 72%)`, opacity: 0.95, transform: `scale(${1 + 0.035 * b.pulse})` }} />
  );
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {orb(0, 250, -235, -120, T.accent)}{orb(1, 210, 250, 140, second)}{orb(2, 150, 215, -170, third)}
      {children}
    </div>
  );
};

const IconTile: React.FC<{ name: string; size?: number }> = ({ name, size = 54 }) => {
  const T = useTheme();
  return (
    <div style={{ width: size, height: size, flex: '0 0 auto', borderRadius: size * 0.34, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(145deg, ${T.accent}, ${T.accent}aa)`, boxShadow: `0 8px 22px ${T.accent}77, inset 0 1.5px 0 rgba(255,255,255,0.55)` }}>
      <Icon name={name} size={size * 0.56} color={T.onAccent} />
    </div>
  );
};

/* ---------- 1. Stat card: number counts up, line draws ---------- */
const GlassStat: React.FC<SP> = ({ g, frame, fps }) => {
  const T = useTheme(); const b = useBeat();
  const target = Number(g.number ?? 0);
  const val = target * seg(frame, 6, 46);
  const dec = Math.abs(target) < 10 && !Number.isInteger(target);
  const shown = dec ? val.toFixed(1) : Math.round(val).toLocaleString('en-IN');
  const e = spr(frame, fps, 0);
  const pts = [0.15, 0.3, 0.22, 0.45, 0.4, 0.62, 0.55, 0.85];
  const path = pts.map((y, i) => `${i ? 'L' : 'M'}${(i / (pts.length - 1)) * 520},${96 - y * 88}`).join(' ');
  return (
    <Stage frame={frame}>
      <div style={{ ...glassStyle(T, 40), width: 590, padding: '32px 40px 26px', opacity: clamp01(e * 1.4), transform: `translateY(${(1 - e) * 50}px) scale(${(0.92 + 0.08 * e) * (1 + 0.007 * b.pulse)})` }}>
        <Sheen frame={frame} start={14} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <IconTile name={(g.icons && g.icons[0]) || 'chart'} size={62} />
          <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 32, color: T.sub }}>{g.label || (hasNum(g) ? g.text : '') || ''}</div>
        </div>
        {hasNum(g) ? (
          <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: (g.prefix || '').length + Math.round(Math.abs(target)).toLocaleString('en-IN').length > 7 ? 92 : (g.prefix || '').length + Math.round(Math.abs(target)).toLocaleString('en-IN').length > 5 ? 112 : 142, lineHeight: 1.05, color: T.ink, letterSpacing: -3, marginTop: 8 }}>
            {g.prefix || ''}{shown}<span style={{ fontSize: 68, color: T.dark ? T.accent : T.ink }}>{g.suffix || ''}</span>
          </div>
        ) : (
          <KText text={g.text || ''} size={62} weight={800} speed={GLASS_SPEED} delay={8} style={{marginTop: 14}} />
        )}
        <svg width="520" height="100" viewBox="0 0 520 100" style={{ display: 'block', marginTop: 6 }}>
          <path d={path} fill="none" stroke={T.accent} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={700} strokeDashoffset={700 * (1 - seg(frame, 10, 52))} style={{ filter: `drop-shadow(0 0 10px ${T.accent})` }} />
        </svg>
      </div>
    </Stage>
  );
};

/* ---------- 2. List: frosted rows slide in one by one ---------- */
const GlassList: React.FC<SP> = ({ g, frame, fps }) => {
  const T = useTheme();
  const rows = (g.items && g.items.length ? g.items : ['First point', 'Second point', 'Third point']).slice(0, 4);
  const icons = g.icons && g.icons.length ? g.icons : ICON_CYCLE;
  return (
    <Stage frame={frame}>
      <div style={{ width: 600, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {g.text ? <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 38, color: T.ink, textAlign: 'center', marginBottom: 4, opacity: clamp01(spr(frame, fps, 0) * 1.4) }}>{g.text}</div> : null}
        {rows.map((t, i) => {
          const p = spr(frame, fps, 8 + i * 9);
          const [a, d] = split(t);
          return (
            <div key={i} style={{ ...glassStyle(T, 28, 22), padding: '15px 22px', display: 'flex', alignItems: 'center', gap: 18, opacity: clamp01(p * 1.5), transform: `translateX(${(1 - p) * (i % 2 ? 70 : -70)}px)` }}>
              <Sheen frame={frame} start={16 + i * 9} len={30} strength={0.26} />
              <IconTile name={icons[i % icons.length]} size={52} />
              <div>
                <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 32, color: T.ink, lineHeight: 1.15 }}>{a}</div>
                {d ? <div style={{ fontFamily: FONT, fontWeight: 500, fontSize: 22, color: T.sub, marginTop: 2 }}>{d}</div> : null}
              </div>
            </div>
          );
        })}
      </div>
    </Stage>
  );
};

/* ---------- 3. Orbs: floating glass spheres around a headline ---------- */
const Sphere: React.FC<{ size: number; x: number; y: number; frame: number; fps: number; seed: number; color: string; delay: number }> = ({ size, x, y, frame, fps, seed, color, delay }) => {
  const p = spr(frame, fps, delay, 11, 120);
  return (
    <div style={{ position: 'absolute', left: `calc(50% + ${x + Math.sin((frame + seed * 30) / 40) * 14}px)`, top: `calc(50% + ${y + Math.cos((frame + seed * 20) / 48) * 18}px)`, width: size, height: size, marginLeft: -size / 2, marginTop: -size / 2, borderRadius: '50%', transform: `scale(${p})`, background: `radial-gradient(circle at 30% 25%, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.38) 18%, ${color}cc 46%, ${color}66 72%, rgba(255,255,255,0.12) 100%)`, border: '1px solid rgba(255,255,255,0.55)', boxShadow: `inset -${size * 0.08}px -${size * 0.12}px ${size * 0.2}px rgba(0,0,0,0.25), inset ${size * 0.06}px ${size * 0.08}px ${size * 0.14}px rgba(255,255,255,0.5), 0 ${size * 0.18}px ${size * 0.3}px rgba(0,0,0,0.25)` }} />
  );
};
const GlassOrbs: React.FC<SP> = ({ g, frame, fps }) => {
  const T = useTheme(); const b = useBeat();
  const e = spr(frame, fps, 6);
  return (
    <Stage frame={frame}>
      <Sphere size={190} x={-215} y={-90} frame={frame} fps={fps} seed={1} color={T.accent} delay={0} />
      <Sphere size={120} x={225} y={-150} frame={frame} fps={fps} seed={2} color={T.dark ? '#7C4DFF' : '#FF8A00'} delay={5} />
      <Sphere size={88} x={200} y={140} frame={frame} fps={fps} seed={3} color={T.dark ? '#22D3EE' : '#FF4D6D'} delay={9} />
      <div style={{ ...glassStyle(T, 44), padding: '34px 44px', maxWidth: 520, textAlign: 'center', opacity: clamp01(e * 1.4), transform: `scale(${(0.9 + 0.1 * e) * (1 + 0.008 * b.pulse)})` }}>
        <Sheen frame={frame} start={16} />
        <KText text={g.text || ''} size={62} weight={800} speed={GLASS_SPEED} delay={8} />
        {g.label ? <div style={{ fontFamily: FONT, fontWeight: 600, fontSize: 28, color: T.sub, marginTop: 12 }}>{g.label}</div> : null}
      </div>
    </Stage>
  );
};

/* ---------- 4. Quote ---------- */
const GlassQuote: React.FC<SP> = ({ g, frame, fps }) => {
  const T = useTheme(); const b = useBeat();
  const e = spr(frame, fps, 0);
  return (
    <Stage frame={frame}>
      <div style={{ ...glassStyle(T, 44), width: 580, padding: '108px 46px 44px', opacity: clamp01(e * 1.4), transform: `translateY(${(1 - e) * 44}px) scale(${1 + 0.006 * b.pulse})` }}>
        <Sheen frame={frame} start={12} len={46} />
        <div style={{ position: 'absolute', top: 2, left: 34, fontFamily: 'Georgia, serif', fontWeight: 800, fontSize: 130, lineHeight: 1, color: T.accent, textShadow: `0 6px 24px ${T.accent}88` }}>“</div>
        <KText text={g.text || ''} size={46} weight={700} speed={GLASS_SPEED} delay={8} align="left" hi="none" />
        {g.label ? <div style={{ fontFamily: FONT, fontWeight: 600, fontSize: 26, color: T.sub, marginTop: 22 }}>{g.label}</div> : null}
      </div>
    </Stage>
  );
};

/* ---------- 5. Compare ---------- */
const GlassCompare: React.FC<SP> = ({ g, frame, fps }) => {
  const T = useTheme();
  const it = g.items && g.items.length ? g.items : ['Before', 'After'];
  const sides = [split(it[0] || 'Before'), split(it[1] || 'After')];
  const ps = [spr(frame, fps, 4), spr(frame, fps, 10)];
  const vs = spr(frame, fps, 20, 9, 160);
  return (
    <Stage frame={frame}>
      <div style={{ display: 'flex', gap: 28, width: 620, justifyContent: 'center', position: 'relative' }}>
        {sides.map(([a, d], i) => (
          <div key={i} style={{ ...glassStyle(T, 34), flex: 1, minHeight: 250, padding: '30px 22px', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 10, opacity: clamp01(ps[i] * 1.4), transform: `translateX(${(1 - ps[i]) * (i ? 90 : -90)}px)` }}>
            <Sheen frame={frame} start={18 + i * 8} len={34} strength={0.28} />
            <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 40, color: i ? T.ink : T.sub, lineHeight: 1.15 }}>{a}</div>
            {d ? <div style={{ fontFamily: FONT, fontWeight: 500, fontSize: 26, color: T.sub }}>{d}</div> : null}
          </div>
        ))}
        <div style={{ position: 'absolute', left: '50%', top: '50%', width: 84, height: 84, marginLeft: -42, marginTop: -42, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${vs})`, background: `linear-gradient(145deg, ${T.accent}, ${T.accent}bb)`, boxShadow: `0 10px 30px ${T.accent}88, inset 0 2px 0 rgba(255,255,255,0.6)`, fontFamily: FONT, fontWeight: 800, fontSize: 34, color: T.onAccent }}>VS</div>
      </div>
    </Stage>
  );
};

/* ---------- 6. Steps: numbered glass cards on a glowing line ---------- */
const GlassSteps: React.FC<SP> = ({ g, frame, fps }) => {
  const T = useTheme();
  const rows = (g.items && g.items.length ? g.items : ['Step one', 'Step two', 'Step three']).slice(0, 4);
  const lineP = seg(frame, 8, 8 + rows.length * 12);
  return (
    <Stage frame={frame}>
      <div style={{ position: 'relative', width: 600, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ position: 'absolute', left: 51, top: 40, bottom: 40, width: 5, borderRadius: 5, background: 'rgba(255,255,255,0.18)' }}>
          <div style={{ width: '100%', height: `${lineP * 100}%`, borderRadius: 5, background: T.accent, boxShadow: `0 0 16px ${T.accent}` }} />
        </div>
        {rows.map((t, i) => {
          const p = spr(frame, fps, 8 + i * 12);
          const [a, d] = split(t);
          return (
            <div key={i} style={{ ...glassStyle(T, 30, 22), padding: '16px 22px', display: 'flex', alignItems: 'center', gap: 20, opacity: clamp01(p * 1.5), transform: `translateX(${(1 - p) * 60}px)` }}>
              <div style={{ width: 58, height: 58, flex: '0 0 auto', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(145deg, ${T.accent}, ${T.accent}aa)`, boxShadow: `0 8px 20px ${T.accent}77, inset 0 1.5px 0 rgba(255,255,255,0.55)`, fontFamily: FONT, fontWeight: 800, fontSize: 30, color: T.onAccent }}>{i + 1}</div>
              <div>
                <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 32, color: T.ink, lineHeight: 1.15 }}>{a}</div>
                {d ? <div style={{ fontFamily: FONT, fontWeight: 500, fontSize: 22, color: T.sub }}>{d}</div> : null}
              </div>
            </div>
          );
        })}
      </div>
    </Stage>
  );
};

/* ---------- 7. Chart: bars grow one after another ---------- */
const GlassChart: React.FC<SP> = ({ g, frame, fps }) => {
  const T = useTheme();
  const down = hasNum(g) && Number(g.number) < 0;
  const up = [0.34, 0.5, 0.44, 0.7, 0.86, 1];
  const hs = down ? [...up].reverse() : up;
  const e = spr(frame, fps, 0);
  const shown = hasNum(g) ? `${g.prefix || ''}${Math.round(Math.abs(Number(g.number)) * seg(frame, 6, 46)).toLocaleString('en-IN')}${g.suffix || ''}` : '';
  return (
    <Stage frame={frame}>
      <div style={{ ...glassStyle(T, 40), width: 590, padding: '30px 36px 30px', opacity: clamp01(e * 1.4), transform: `translateY(${(1 - e) * 46}px)` }}>
        <Sheen frame={frame} start={16} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
          <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 32, color: T.sub }}>{g.label || g.text || ''}</div>
          {shown ? <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 58, color: down ? T.bad : T.good }}>{down ? '▼ ' : '▲ '}{shown}</div> : null}
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: 230, marginTop: 22, borderBottom: `2px solid ${T.dark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.12)'}` }}>
          {hs.map((h, i) => {
            const p = spr(frame, fps, 8 + i * 5, 14, 120);
            const last = i === hs.length - 1;
            return <div key={i} style={{ width: 66, height: 230 * h * clamp01(p), borderRadius: '16px 16px 6px 6px', background: last ? `linear-gradient(180deg, ${down ? T.bad : T.accent}, ${down ? T.bad : T.accent}88)` : `linear-gradient(180deg, ${T.accent}aa, ${T.accent}33)`, boxShadow: last ? `0 0 24px ${down ? T.bad : T.accent}99, inset 0 1.5px 0 rgba(255,255,255,0.6)` : 'inset 0 1.5px 0 rgba(255,255,255,0.45)' }} />;
          })}
        </div>
      </div>
    </Stage>
  );
};

/* ---------- 8. Icon: a big glass tile that tilts in 3D ---------- */
const GlassIcon: React.FC<SP> = ({ g, frame, fps }) => {
  const T = useTheme(); const b = useBeat();
  const p = spr(frame, fps, 6, 11, 130);
  const t = spr(frame, fps, 14);
  return (
    <Stage frame={frame}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 30 }}>
        <div style={{ perspective: 900 }}>
          <div style={{ width: 250, height: 250, borderRadius: 68, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', transform: `scale(${p * (1 + 0.025 * b.pulse)}) rotateY(${Math.sin(frame / 28) * 15}deg) rotateX(${Math.cos(frame / 34) * 9}deg)`, background: `linear-gradient(145deg, ${T.accent}ee, ${T.accent}55)`, border: '1.5px solid rgba(255,255,255,0.7)', boxShadow: `0 34px 60px ${T.accent}66, inset 0 3px 0 rgba(255,255,255,0.6), inset 0 -10px 24px rgba(0,0,0,0.12)` }}>
            <Sheen frame={frame} start={18} len={40} strength={0.5} />
            <Icon name={(g.icons && g.icons[0]) || 'star'} size={130} color={T.onAccent} stroke={2.4} />
          </div>
        </div>
        <div style={{ textAlign: 'center', opacity: clamp01(t * 1.4), transform: `translateY(${(1 - t) * 24}px)` }}>
          <KText text={g.text || ''} size={52} weight={800} speed={GLASS_SPEED} delay={8} style={{lineHeight: 1.1, maxWidth: 560}} />
          {g.label ? <div style={{ fontFamily: FONT, fontWeight: 600, fontSize: 28, color: T.sub, marginTop: 8 }}>{g.label}</div> : null}
        </div>
      </div>
    </Stage>
  );
};

/* ---------- 9. Tags: floating glass pills ---------- */
const GlassTags: React.FC<SP> = ({ g, frame, fps }) => {
  const T = useTheme();
  const tags = (g.items && g.items.length ? g.items : ['Idea', 'Plan', 'Launch', 'Grow']).slice(0, 6);
  return (
    <Stage frame={frame}>
      <div style={{ width: 620, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '22px 18px' }}>
        {tags.map((t, i) => {
          const p = spr(frame, fps, 6 + i * 6, 10, 150);
          return (
            <div key={i} style={{ ...glassStyle(T, 44, 20), padding: '16px 30px', display: 'flex', alignItems: 'center', gap: 12, transform: `translateY(${Math.sin((frame + i * 20) / 30) * 9 + (1 - p) * 40}px) scale(${p})`, opacity: clamp01(p * 1.5), marginLeft: i % 2 ? 24 : 0 }}>
              <div style={{ width: 16, height: 16, borderRadius: '50%', background: T.accent, boxShadow: `0 0 12px ${T.accent}` }} />
              <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 34, color: T.ink }}>{t}</div>
            </div>
          );
        })}
      </div>
    </Stage>
  );
};

/* ---------- 10. Photo in 3D: AI picture in a tilted glass frame with depth drift ---------- */
const Photo3D: React.FC<SP> = (p) => {
  const { g, frame, fps } = p;
  const T = useTheme();
  if (!g.image) return <GlassIcon {...p} />;
  const e = spr(frame, fps, 0, 16, 110);
  const rotY = -15 + Math.sin(frame / 40) * 5 + (1 - e) * 32;
  const rotX = 5 + Math.cos(frame / 46) * 2.5;
  const cap = spr(frame, fps, 14);
  return (
    <Stage frame={frame}>
      <div style={{ perspective: 1400 }}>
        <div style={{ position: 'relative', width: 360, height: 450, transformStyle: 'preserve-3d', opacity: clamp01(e * 1.4), transform: `rotateY(${rotY}deg) rotateX(${rotX}deg) translateY(${(1 - e) * 40}px) scale(${0.9 + 0.1 * e})` }}>
          <div style={{ position: 'absolute', inset: 0, borderRadius: 44, overflow: 'hidden', border: '2px solid rgba(255,255,255,0.6)', boxShadow: `0 44px 70px rgba(0,0,0,0.45), 0 0 0 9px rgba(255,255,255,0.10), 0 0 70px ${T.accent}55` }}>
            <Img src={g.image} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${1.12 + frame * 0.0016}) translate(${Math.sin(frame / 60) * 6}px, ${-frame * 0.05}px)` }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, rgba(255,255,255,0.32) 0%, rgba(255,255,255,0) 38%, rgba(0,0,0,0.28) 100%)' }} />
            <Sheen frame={frame} start={10} len={46} strength={0.36} />
          </div>
          {g.text ? (
            <div style={{ ...glassStyle(T, 30, 18), position: 'absolute', left: 24, right: 24, bottom: 26, padding: '14px 20px', textAlign: 'center', transform: `translateZ(70px) translateY(${(1 - cap) * 30}px)`, opacity: clamp01(cap * 1.4) }}>
              <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 34, color: T.ink, lineHeight: 1.15 }}>{g.text}</div>
            </div>
          ) : null}
        </div>
      </div>
    </Stage>
  );
};

/* ---------- 11. Photo stack: three AI pictures fanned in 3D, drifting and breathing ---------- */
const PhotoStack: React.FC<SP> = (p) => {
  const { g, frame, fps } = p;
  const T = useTheme();
  const imgs = ((g as any).images && (g as any).images.length ? (g as any).images : g.image ? [g.image] : []).slice(0, 3) as string[];
  if (!imgs.length) return <GlassIcon {...p} />;
  const slots = [{ x: -150, r: -13, z: 0, y: 24 }, { x: 150, r: 13, z: 0, y: 24 }, { x: 0, r: 0, z: 70, y: -8 }];
  const spin = Math.sin(frame / 50) * 9;
  const cap = spr(frame, fps, 18);
  return (
    <Stage frame={frame}>
      <div style={{ perspective: 1500, position: 'relative', width: 620, height: 470, transform: 'translateY(-34px) scale(0.78)' }}>
        {imgs.map((src, i) => {
          const order = imgs.length === 1 ? 2 : imgs.length === 2 ? (i === 0 ? 0 : 2) : i;
          const s = slots[order];
          const d = spr(frame, fps, i * 7, 15, 120);
          return (
            <div key={i} style={{ position: 'absolute', left: '50%', top: '50%', width: 290, height: 390, marginLeft: -145, marginTop: -205, zIndex: order, opacity: clamp01(d * 1.4), transformStyle: 'preserve-3d', transform: 'translateX(' + s.x * d + 'px) translateY(' + (s.y + (1 - d) * 70 + Math.sin(frame / 38 + i * 2) * 9) + 'px) translateZ(' + s.z + 'px) rotateY(' + (-s.r * 1.4 + spin * (order - 1) * 0.5) + 'deg) rotateZ(' + s.r * d + 'deg) scale(' + (0.85 + 0.15 * d) + ')', borderRadius: 36, overflow: 'hidden', border: '2px solid rgba(255,255,255,0.65)', boxShadow: '0 36px 60px rgba(0,0,0,0.4), 0 0 50px ' + T.accent + '44' }}>
              <Img src={src} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scale(' + (1.1 + frame * 0.0012) + ') translateX(' + Math.sin(frame / 55 + i) * 8 + 'px)' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0) 40%, rgba(0,0,0,0.25) 100%)' }} />
              <Sheen frame={frame} start={12 + i * 6} len={40} strength={0.3} />
            </div>
          );
        })}
        {g.text ? (
          <div style={{ ...glassStyle(T, 28, 18), position: 'absolute', left: 90, right: 90, bottom: -6, zIndex: 9, padding: '12px 18px', textAlign: 'center', opacity: clamp01(cap * 1.4), transform: 'translateY(' + (1 - cap) * 30 + 'px)' }}>
            <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 32, color: T.ink, lineHeight: 1.15 }}>{g.text}</div>
          </div>
        ) : null}
      </div>
    </Stage>
  );
};

/* ---------- 12. Photo wide: a cinematic picture with a slow camera pan, floating glass chips and a caption ---------- */
const PhotoWide: React.FC<SP> = (p) => {
  const { g, frame, fps } = p;
  const T = useTheme();
  if (!g.image) return <GlassIcon {...p} />;
  const e = spr(frame, fps, 0, 16, 110);
  const cap = spr(frame, fps, 12);
  const chips = (g.items || []).slice(0, 3);
  return (
    <Stage frame={frame}>
      <div style={{ position: 'relative', width: 620, height: 430, opacity: clamp01(e * 1.4), transform: 'translateY(' + ((1 - e) * 50 - 24) + 'px) scale(' + (0.86 * (0.92 + 0.08 * e)) + ') rotateZ(' + Math.sin(frame / 70) * 0.6 + 'deg)' }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: 46, overflow: 'hidden', border: '2px solid rgba(255,255,255,0.65)', boxShadow: '0 40px 70px rgba(0,0,0,0.4), 0 0 60px ' + T.accent + '55' }}>
          <Img src={g.image} style={{ width: '112%', height: '112%', objectFit: 'cover', transform: 'translate(' + (-frame * 0.11) + 'px, ' + (-frame * 0.05) + 'px) scale(' + (1.06 + frame * 0.0015) + ')' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0) 35%, rgba(0,0,0,0.42) 100%)' }} />
          <Sheen frame={frame} start={10} len={46} strength={0.34} />
        </div>
        {chips.map((c, i) => {
          const d = spr(frame, fps, 14 + i * 7);
          return <div key={i} style={{ ...glassStyle(T, 999, 14), position: 'absolute', top: 24 + i * 58, left: i % 2 ? undefined : 22, right: i % 2 ? 22 : undefined, padding: '8px 22px', fontFamily: FONT, fontWeight: 800, fontSize: 26, color: T.ink, opacity: clamp01(d * 1.4), transform: 'translateY(' + ((1 - d) * 24 + Math.sin(frame / 30 + i * 2) * 5) + 'px)' }}>{c}</div>;
        })}
        {g.text ? (
          <div style={{ ...glassStyle(T, 30, 18), position: 'absolute', left: 26, right: 26, bottom: 24, padding: '14px 22px', textAlign: 'center', opacity: clamp01(cap * 1.4), transform: 'translateY(' + (1 - cap) * 28 + 'px)' }}>
            <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 36, color: T.ink, lineHeight: 1.15 }}>{g.text}</div>
          </div>
        ) : null}
      </div>
    </Stage>
  );
};

/* ---------- 13. Price / discount badge ---------- */
const GlassPrice: React.FC<SP> = ({ g, frame, fps }) => {
  const T = useTheme(); const b = useBeat();
  const p = spr(frame, fps, 4, 9, 120);
  const t = spr(frame, fps, 16);
  const n = hasNum(g) ? Number(g.number) : 0;
  const shown = Math.round(n * ease((frame - 8) / 30));
  const burst = Array.from({ length: 12 });
  return (
    <Stage frame={frame}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 26 }}>
        <div style={{ position: 'relative', width: 330, height: 330, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: 'scale(' + p * (1 + 0.03 * b.pulse) + ') rotate(' + (-8 + (1 - p) * 40) + 'deg)' }}>
          {burst.map((_, i) => (
            <div key={i} style={{ position: 'absolute', width: 40, height: 330, borderRadius: 20, transform: 'rotate(' + i * 30 + 'deg)', background: 'linear-gradient(180deg, ' + T.accent + 'ee 0 22%, transparent 22%)' }} />
          ))}
          <div style={{ ...glassStyle(T, 999, 10), width: 270, height: 270, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(145deg, ' + T.accent + ', ' + T.accent + 'bb)', border: '2px solid rgba(255,255,255,0.7)' }}>
            <Sheen frame={frame} start={16} len={36} strength={0.5} />
            <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: String(shown).length > 3 ? 84 : 112, lineHeight: 1, color: T.onAccent, letterSpacing: -2 }}>{g.prefix || ''}{shown}{g.suffix || ''}</div>
            {g.label ? <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 34, color: T.onAccent, opacity: 0.9, marginTop: 6 }}>{g.label}</div> : null}
          </div>
        </div>
        <div style={{ ...glassStyle(T, 40, 20), padding: '16px 34px', opacity: clamp01(t * 1.4), transform: 'translateY(' + (1 - t) * 30 + 'px)' }}>
          <KText text={g.text || ''} size={42} weight={800} speed={GLASS_SPEED} delay={8} style={{textAlign: 'center', maxWidth: 520}} />
        </div>
      </div>
    </Stage>
  );
};

/* ---------- 14. Rating: stars fill one by one, review card ---------- */
const GlassRating: React.FC<SP> = ({ g, frame, fps }) => {
  const T = useTheme(); const b = useBeat();
  const score = hasNum(g) ? Math.min(5, Number(g.number)) : 5;
  const card = spr(frame, fps, 2, 12, 130);
  const shown = (score * ease((frame - 6) / 30)).toFixed(1);
  const star = 'M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z';
  return (
    <Stage frame={frame}>
      <div style={{ ...glassStyle(T, 52, 26), width: 590, padding: '40px 40px 36px', textAlign: 'center', transform: 'translateY(' + (1 - card) * 60 + 'px) scale(' + (0.9 + 0.1 * card) * (1 + 0.015 * b.pulse) + ')', opacity: clamp01(card * 1.5) }}>
        <Sheen frame={frame} start={20} len={40} />
        <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 120, lineHeight: 1, color: T.ink, letterSpacing: -3 }}>{shown}</div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, margin: '16px 0 22px' }}>
          {[0, 1, 2, 3, 4].map((i) => {
            const k = spr(frame, fps, 8 + i * 5, 7, 200);
            const on = i < Math.round(score);
            return (
              <svg key={i} width={74} height={74} viewBox="0 0 24 24" style={{ transform: 'scale(' + (0.4 + 0.6 * k) + ') rotate(' + (1 - k) * -40 + 'deg)', filter: on ? 'drop-shadow(0 6px 10px ' + T.accent + '88)' : 'none' }}>
                <path d={star} fill={on ? T.accent : 'rgba(150,150,170,0.35)'} stroke={on ? 'rgba(255,255,255,0.8)' : 'none'} strokeWidth={0.6} strokeLinejoin="round" />
              </svg>
            );
          })}
        </div>
        <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 38, lineHeight: 1.2, color: T.ink, opacity: clamp01((frame - 30) / 10) }}>{g.text ? '“' + g.text + '”' : ''}</div>
        {g.label ? <div style={{ fontFamily: FONT, fontWeight: 600, fontSize: 28, color: T.sub, marginTop: 12, opacity: clamp01((frame - 36) / 10) }}>{g.label}</div> : null}
      </div>
    </Stage>
  );
};

/* ---------- 15. Phone mockup: screen shows the AI photo or app rows ---------- */
const GlassPhone: React.FC<SP> = ({ g, frame, fps }) => {
  const T = useTheme(); const b = useBeat();
  const p = spr(frame, fps, 2, 12, 110);
  const rows = (g.items && g.items.length ? g.items : ['New idea', 'Script ready', 'Posted']).slice(0, 4);
  const icons = g.icons && g.icons.length ? g.icons : ['bolt', 'check', 'star', 'heart'];
  const tb = spr(frame, fps, 18, 10, 150);
  return (
    <Stage frame={frame}>
      <div style={{ perspective: 1100 }}>
        <div style={{ width: 300, height: 540, borderRadius: 54, padding: 11, background: T.dark ? 'linear-gradient(145deg,#4a4a5a,#15151d)' : 'linear-gradient(145deg,#ffffff,#b9bccb)', boxShadow: '0 40px 70px rgba(0,0,0,0.38), inset 0 2px 0 rgba(255,255,255,0.7)', transform: 'translateY(' + ((1 - p) * 90 + Math.sin(frame / 30) * 8) + 'px) rotateY(' + (-16 + Math.sin(frame / 36) * 7) + 'deg) rotateX(' + (6 + Math.cos(frame / 40) * 3) + 'deg) scale(' + p * (1 + 0.015 * b.pulse) + ')', opacity: clamp01(p * 1.6) }}>
          <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: 44, overflow: 'hidden', background: T.dark ? '#0b0b14' : '#f4f5fb' }}>
            {g.image ? <Img src={g.image} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transform: 'scale(' + (1.05 + frame * 0.0007) + ')' }} /> : (
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, ' + T.accent + '55, transparent 60%)', padding: '70px 18px 0' }}>
                {rows.map((r, i) => {
                  const k = spr(frame, fps, 12 + i * 8, 11, 150);
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', marginBottom: 14, borderRadius: 22, background: T.dark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.9)', boxShadow: '0 8px 18px rgba(0,0,0,0.12)', transform: 'translateX(' + (1 - k) * 80 + 'px)', opacity: clamp01(k * 1.5) }}>
                      <IconTile name={icons[i % icons.length]} size={44} />
                      <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 25, color: T.ink, lineHeight: 1.1 }}>{r}</div>
                    </div>
                  );
                })}
              </div>
            )}
            <div style={{ position: 'absolute', top: 12, left: '50%', width: 92, height: 26, marginLeft: -46, borderRadius: 20, background: '#05050a' }} />
            <Sheen frame={frame} start={22} len={36} strength={0.28} />
          </div>
        </div>
      </div>
      {g.text ? (
        <div style={{ ...glassStyle(T, 34, 18), position: 'absolute', right: -6, top: 400, maxWidth: 250, padding: '16px 22px', transform: 'translateX(' + (1 - tb) * 120 + 'px) scale(' + (0.85 + 0.15 * tb) + ')', opacity: clamp01(tb * 1.5) }}>
          <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 32, lineHeight: 1.1, color: T.ink }}>{g.text}</div>
        </div>
      ) : null}
    </Stage>
  );
};

/* ---------- 16. Progress ring ---------- */
const GlassRing: React.FC<SP> = ({ g, frame, fps }) => {
  const T = useTheme(); const b = useBeat();
  const pct = hasNum(g) ? Math.max(0, Math.min(100, Number(g.number))) : 75;
  const k = ease((frame - 6) / 42);
  const R = 150; const C = 2 * Math.PI * R;
  const p = spr(frame, fps, 2, 12, 120);
  const t = spr(frame, fps, 16);
  return (
    <Stage frame={frame}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 26 }}>
        <div style={{ ...glassStyle(T, 999, 20), width: 400, height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: 'scale(' + p * (1 + 0.02 * b.pulse) + ')' }}>
          <svg width={400} height={400} viewBox="0 0 400 400" style={{ position: 'absolute', transform: 'rotate(-90deg)' }}>
            <circle cx={200} cy={200} r={R} fill="none" stroke="rgba(150,150,170,0.25)" strokeWidth={28} />
            <circle cx={200} cy={200} r={R} fill="none" stroke={T.accent} strokeWidth={28} strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - (pct / 100) * k)} style={{ filter: 'drop-shadow(0 0 14px ' + T.accent + ')' }} />
          </svg>
          <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 118, color: T.ink, letterSpacing: -3 }}>{Math.round(pct * k)}<span style={{ fontSize: 56 }}>{g.suffix ?? '%'}</span></div>
        </div>
        <div style={{ textAlign: 'center', opacity: clamp01(t * 1.4), transform: 'translateY(' + (1 - t) * 24 + 'px)' }}>
          <KText text={g.text || ''} size={48} weight={800} speed={GLASS_SPEED} delay={8} style={{maxWidth: 560, lineHeight: 1.1}} />
          {g.label ? <div style={{ fontFamily: FONT, fontWeight: 600, fontSize: 28, color: T.sub, marginTop: 8 }}>{g.label}</div> : null}
        </div>
      </div>
    </Stage>
  );
};

/* ---------- 17. Map pin: pin drops onto a glass map, ripples, label card ---------- */
const GlassPin: React.FC<SP> = ({ g, frame, fps }) => {
  const T = useTheme();
  const map = spr(frame, fps, 0, 14, 120);
  const drop = spr(frame, fps, 10, 7, 170);
  const t = spr(frame, fps, 24);
  const rip = (d: number) => { const q = ((frame - 20 - d) % 46) / 46; return frame > 20 + d ? q : -1; };
  const line = T.dark ? 'rgba(255,255,255,0.10)' : 'rgba(40,40,70,0.10)';
  return (
    <Stage frame={frame}>
      <div style={{ ...glassStyle(T, 46, 22), width: 600, height: 400, transform: 'scale(' + (0.9 + 0.1 * map) + ') rotateX(' + (14 - 8 * map) + 'deg)', opacity: clamp01(map * 1.5) }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(' + line + ' 2px, transparent 2px), linear-gradient(90deg, ' + line + ' 2px, transparent 2px)', backgroundSize: '60px 60px', backgroundPosition: -frame * 0.4 + 'px 0' }} />
        <svg width={600} height={400} style={{ position: 'absolute', inset: 0 }}><path d="M-10 290 C 120 220, 200 330, 320 250 S 520 150, 620 190" fill="none" stroke={T.accent} strokeWidth={9} strokeLinecap="round" opacity={0.55} strokeDasharray="22 16" /></svg>
        {[0, 14].map((d) => { const q = rip(d); return q < 0 ? null : <div key={d} style={{ position: 'absolute', left: 210, top: 160, width: 180, height: 180, borderRadius: '50%', border: '4px solid ' + T.accent, opacity: 1 - q, transform: 'scale(' + (0.2 + q * 1.1) + ')' }} />; })}
        <div style={{ position: 'absolute', left: 254, top: 120 - (1 - drop) * 220, width: 92, height: 130, opacity: clamp01(drop * 3), filter: 'drop-shadow(0 14px 14px ' + T.accent + '88)' }}>
          <svg width={92} height={130} viewBox="0 0 24 34"><path d="M12 1C6 1 1.5 5.4 1.5 11c0 7.5 10.5 21 10.5 21s10.5-13.5 10.5-21C22.5 5.4 18 1 12 1z" fill={T.accent} stroke="rgba(255,255,255,0.85)" strokeWidth={1} /><circle cx={12} cy={11} r={4.3} fill={T.onAccent} /></svg>
        </div>
      </div>
      <div style={{ ...glassStyle(T, 38, 20), position: 'absolute', bottom: 22, padding: '16px 34px', transform: 'translateY(' + (1 - t) * 40 + 'px)', opacity: clamp01(t * 1.5) }}>
        <KText text={g.text || ''} size={44} weight={800} speed={GLASS_SPEED} delay={8} style={{textAlign: 'center'}} />
        {g.label ? <div style={{ fontFamily: FONT, fontWeight: 600, fontSize: 26, color: T.sub, textAlign: 'center' }}>{g.label}</div> : null}
      </div>
    </Stage>
  );
};

export const GlassBody: React.FC<SP & { type: string }> = (p0) => {
  const p = { ...p0, frame: p0.frame * GLASS_SPEED, dur: p0.dur * GLASS_SPEED };
  switch (p.type) {
    case 'glass_stat': return <GlassStat {...p} />;
    case 'glass_list': return <GlassList {...p} />;
    case 'glass_orbs': return <GlassOrbs {...p} />;
    case 'glass_quote': return <GlassQuote {...p} />;
    case 'glass_compare': return <GlassCompare {...p} />;
    case 'glass_steps': return <GlassSteps {...p} />;
    case 'glass_chart': return <GlassChart {...p} />;
    case 'glass_icon': return <GlassIcon {...p} />;
    case 'glass_tags': return <GlassTags {...p} />;
    case 'photo_3d': return <Photo3D {...p} />;
    case 'photo_stack': return <PhotoStack {...p} />;
    case 'photo_wide': return <PhotoWide {...p} />;
    case 'glass_price': return <GlassPrice {...p} />;
    case 'glass_rating': return <GlassRating {...p} />;
    case 'glass_phone': return <GlassPhone {...p} />;
    case 'glass_ring': return <GlassRing {...p} />;
    case 'glass_pin': return <GlassPin {...p} />;
    default: return null;
  }
};
