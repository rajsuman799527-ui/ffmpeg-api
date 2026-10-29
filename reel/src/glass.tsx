import React from 'react';
import { Img, spring } from 'remotion';
import { FONT, Icon, clamp01 } from './ui';
import { useTheme, type Theme } from './theme';
import { useBeat } from './beat';
import type { G } from './scenes';

type SP = { g: G; anim: string; frame: number; fps: number; dur: number };

export const GLASS_TYPES = ['glass_stat', 'glass_list', 'glass_orbs', 'glass_quote', 'glass_compare', 'glass_steps', 'glass_chart', 'glass_icon', 'glass_tags', 'photo_3d', 'photo_stack', 'photo_wide'];

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
          <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 62, lineHeight: 1.1, color: T.ink, marginTop: 14 }}>{g.text || ''}</div>
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
        <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 62, lineHeight: 1.1, color: T.ink }}>{g.text || ''}</div>
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
      <div style={{ ...glassStyle(T, 44), width: 580, padding: '60px 46px 40px', opacity: clamp01(e * 1.4), transform: `translateY(${(1 - e) * 44}px) scale(${1 + 0.006 * b.pulse})` }}>
        <Sheen frame={frame} start={12} len={46} />
        <div style={{ position: 'absolute', top: 6, left: 30, fontFamily: 'Georgia, serif', fontWeight: 800, fontSize: 150, lineHeight: 1, color: T.accent, textShadow: `0 6px 24px ${T.accent}88` }}>“</div>
        <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 46, lineHeight: 1.22, color: T.ink }}>{g.text || ''}</div>
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
          <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 52, color: T.ink, lineHeight: 1.1, maxWidth: 560 }}>{g.text || ''}</div>
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
      <div style={{ perspective: 1500, position: 'relative', width: 620, height: 470 }}>
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
      <div style={{ position: 'relative', width: 620, height: 430, opacity: clamp01(e * 1.4), transform: 'translateY(' + (1 - e) * 50 + 'px) scale(' + (0.92 + 0.08 * e) + ') rotateZ(' + Math.sin(frame / 70) * 0.6 + 'deg)' }}>
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

export const GlassBody: React.FC<SP & { type: string }> = (p) => {
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
    default: return null;
  }
};
