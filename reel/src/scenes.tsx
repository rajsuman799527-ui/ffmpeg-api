import React from 'react';
import { Arrow, FONT, Icon, Pill, clamp01, enter, lerp, pop, useCard } from './ui';
import { useTheme } from './theme';
import { GLASS_TYPES, GlassBody } from './glass';

export type G = { text?: string; icons?: string[]; items?: string[]; number?: number | null; label?: string; prefix?: string; suffix?: string; image?: string  images?: string[]; image?: string };
type SP = { g: G; anim: string; frame: number; fps: number; dur: number };

const split = (s: string): [string, string] => {
  const i = String(s || '').indexOf('|');
  return i < 0 ? [String(s || '').trim(), ''] : [s.slice(0, i).trim(), s.slice(i + 1).trim()];
};
const col: React.CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22, width: '100%' };
const items = (g: G, fallback: string[], max = 5) => (g.items && g.items.length ? g.items : fallback).slice(0, max);

/* ---------- 1. Title pill ---------- */
const TitlePill: React.FC<SP> = ({ g, anim, frame, fps }) => {
  const T = useTheme();
  return (
    <div style={col}>
      <div style={enter(anim, frame, fps, 0)}>
        <Pill text={g.text || ''} size={40} style={{ maxWidth: 640, whiteSpace: 'normal', textAlign: 'center', borderRadius: 44, padding: '20px 40px' }} />
      </div>
      <div style={{ height: 8, width: 220 * clamp01(lerp(frame, 6, 22, 0, 1)), borderRadius: 8, background: T.accent, boxShadow: `0 0 18px ${T.accent}` }} />
      {g.label ? <div style={{ ...enter(anim, frame, fps, 10), fontFamily: FONT, fontWeight: 700, fontSize: 30, color: T.sub, textAlign: 'center' }}>{g.label}</div> : null}
    </div>
  );
};

/* ---------- 2. Icon flow ---------- */
const IconFlow: React.FC<SP> = ({ g, anim, frame, fps }) => {
  const T = useTheme();
  const icons = (g.icons && g.icons.length ? g.icons : ['play', 'rupee']).slice(0, 4);
  const labels = g.items || [];
  return (
    <div style={col}>
      {g.text ? <div style={enter(anim, frame, fps, 0)}><Pill text={g.text} size={34} /></div> : null}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
        {icons.map((ic, i) => {
          const dark = i % 2 === 0;
          return (
            <React.Fragment key={i}>
              {i > 0 ? <div style={{ display: 'flex', alignItems: 'center', height: 118 }}><Arrow color={T.ink} progress={clamp01(lerp(frame, 8 + i * 8, 20 + i * 8, 0, 1))} /></div> : null}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, width: 126 }}>
                <div style={{ ...enter(anim, frame, fps, 4 + i * 8), width: 118, height: 118, borderRadius: 30, background: dark ? T.pillBg : T.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: dark ? T.shadow : `0 12px 30px ${T.accent}66` }}>
                  <Icon name={ic} size={62} color={dark ? T.pillFg : T.onAccent} />
                </div>
                {labels[i] ? <div style={{ ...enter('slide_up', frame, fps, 10 + i * 8), fontFamily: FONT, fontWeight: 700, fontSize: 24, color: T.ink, textAlign: 'center', lineHeight: 1.1 }}>{labels[i]}</div> : null}
              </div>
            </React.Fragment>
          );
        })}
      </div>
      {g.label ? <div style={{ ...enter(anim, frame, fps, 24), fontFamily: FONT, fontWeight: 700, fontSize: 28, color: T.sub }}>{g.label}</div> : null}
    </div>
  );
};

/* ---------- 3. Compare cards ---------- */
const Compare: React.FC<SP> = ({ g, anim, frame, fps, dur }) => {
  const T = useTheme();
  const its = items(g, ['A', 'B'], 2);
  const hi = frame > dur * 0.42;
  const card = useCard();
  return (
    <div style={col}>
      {g.text ? <div style={enter(anim, frame, fps, 0)}><Pill text={g.text} size={32} /></div> : null}
      <div style={{ display: 'flex', gap: 22, width: '100%', position: 'relative' }}>
        {its.map((it, i) => {
          const [title, sub] = split(it);
          const on = i === 1 && hi;
          return (
            <div key={i} style={{ ...card, ...enter(anim, frame, fps, 4 + i * 8), flex: 1, padding: '26px 24px', display: 'flex', flexDirection: 'column', gap: 18, minHeight: 200, borderColor: on ? T.accent : T.line, borderWidth: on ? 3 : 2 }}>
              <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 40, color: T.ink, lineHeight: 1.05 }}>{title}</div>
              <div style={{ alignSelf: 'flex-start', fontFamily: FONT, fontWeight: 700, fontSize: 24, padding: '9px 20px', borderRadius: 999, background: on ? T.accent : T.dark ? '#262636' : '#F3F3F3', color: on ? T.onAccent : T.sub, minWidth: 80, minHeight: 20, opacity: i === 1 && !hi ? 0.35 : 1 }}>{sub || ' '}</div>
            </div>
          );
        })}
        <div style={{ position: 'absolute', left: '50%', top: '50%', transform: `translate(-50%,-50%) scale(${pop(frame, fps, 14)})`, width: 64, height: 64, borderRadius: 32, background: T.pillBg, color: T.pillFg, fontFamily: FONT, fontWeight: 800, fontSize: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: T.shadow }}>VS</div>
      </div>
    </div>
  );
};

/* ---------- 4/5. Tag highlight / chip list ---------- */
const Chips: React.FC<SP & { variant: 'tag' | 'list' }> = ({ g, anim, frame, fps, dur, variant }) => {
  const T = useTheme();
  const its = items(g, ['Idea', 'Script', 'Title'], 8);
  const step = Math.max(6, (dur * 0.8) / (its.length + 1));
  return (
    <div style={col}>
      {g.text ? <div style={{ ...enter(anim, frame, fps, 0), fontFamily: FONT, fontWeight: 800, fontSize: 46, color: T.ink, textAlign: 'center', lineHeight: 1.1 }}>{g.text}</div> : null}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, justifyContent: 'center', maxWidth: 640 }}>
        {its.map((it, i) => {
          const on = frame >= 10 + i * step;
          const bg = on ? (variant === 'tag' ? T.accent : T.pillBg) : 'transparent';
          const fg = on ? (variant === 'tag' ? T.onAccent : T.pillFg) : T.sub;
          return <div key={i} style={{ ...enter('pop_in', frame, fps, 3 + i * 4), fontFamily: FONT, fontWeight: 700, fontSize: 30, padding: '11px 28px', borderRadius: 999, border: `2px solid ${on ? bg : T.line}`, background: bg, color: fg, boxShadow: on ? T.shadow : 'none' }}>{it}</div>;
        })}
      </div>
    </div>
  );
};

/* ---------- 6. Counter ---------- */
const Counter: React.FC<SP> = ({ g, anim, frame, fps }) => {
  const T = useTheme();
  const n = typeof g.number === 'number' ? g.number : 0;
  const shown = lerp(frame, 4, 28, 0, n);
  const txt = Number.isInteger(n) ? Math.round(shown).toLocaleString('en-IN') : shown.toFixed(1);
  const long = (g.prefix || '').length + txt.length + (g.suffix || '').length > 6;
  return (
    <div style={col}>
      <div style={{ ...enter(anim, frame, fps, 0), display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 44px', borderRadius: 48, background: T.accent, boxShadow: `0 18px 44px ${T.accent}66`, fontFamily: FONT, fontWeight: 800, fontSize: long ? 100 : 140, color: T.onAccent, lineHeight: 1.1 }}>
        {g.prefix || ''}{txt}{g.suffix || ''}
      </div>
      {g.label || g.text ? <div style={{ ...enter('slide_up', frame, fps, 10), fontFamily: FONT, fontWeight: 800, fontSize: 46, color: T.ink, textAlign: 'center', maxWidth: 600, lineHeight: 1.1 }}>{g.label || g.text}</div> : null}
    </div>
  );
};

/* ---------- 7/8. Numbered list / command row ---------- */
const Rows: React.FC<SP & { variant: 'numbered' | 'command' }> = ({ g, anim, frame, fps, dur, variant }) => {
  const T = useTheme();
  const its = items(g, ['One', 'Two', 'Three'], 5);
  const step = Math.max(8, (dur * 0.75) / (its.length + 0.5));
  const active = Math.min(its.length - 1, Math.max(-1, Math.floor((frame - 8) / step)));
  return (
    <div style={{ ...col, gap: 10 }}>
      {g.text ? <div style={{ ...enter('slide_up', frame, fps, 0), alignSelf: 'flex-start', fontFamily: FONT, fontWeight: 800, fontSize: 36, color: T.ink, marginBottom: 4 }}>{g.text}</div> : null}
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 11 }}>
        {its.map((it, i) => {
          const shown = i <= active;
          const [left, right] = split(it);
          const isActive = i === active;
          return (
            <div key={i} style={{ ...enter('slide_up', frame, fps, i * 3), display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 66, padding: '0 22px', borderRadius: 18, border: `2px solid ${isActive ? T.accent : T.line}`, background: isActive ? T.accent : T.card, boxShadow: isActive ? `0 10px 26px ${T.accent}55` : 'none', fontFamily: variant === 'command' ? 'ui-monospace, Menlo, monospace' : FONT, fontWeight: 800, fontSize: 30, color: isActive ? T.onAccent : T.ink, transition: 'none' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 14, opacity: shown ? 1 : 0.4 }}>
                <span style={{ width: 38, height: 38, borderRadius: 19, background: isActive ? T.onAccent : T.pillBg, color: isActive ? T.accent : T.pillFg, fontSize: 21, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT }}>{i + 1}</span>
                {left}
              </span>
              {right && shown ? <span style={{ background: isActive ? T.onAccent : T.pillBg, color: isActive ? T.accent : T.pillFg, fontSize: 22, padding: '6px 16px', borderRadius: 999, fontFamily: FONT }}>{right}</span> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ---------- 9. Thumbnail card ---------- */
const ThumbCard: React.FC<SP> = ({ g, anim, frame, fps }) => {
  const T = useTheme();
  const card = useCard({ borderRadius: 26 });
  const [big, small] = split(g.text || '');
  return (
    <div style={col}>
      <div style={{ ...card, ...enter(anim, frame, fps, 0), display: 'flex', gap: 18, alignItems: 'center', padding: 14, width: '100%' }}>
        <div style={{ width: 260, height: 150, borderRadius: 18, background: T.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', padding: '0 16px', fontFamily: FONT, fontWeight: 800, fontSize: 42, lineHeight: 1, color: T.onAccent, textAlign: 'center' }}>
          {big}
          <div style={{ position: 'absolute', right: 8, bottom: 8, background: 'rgba(0,0,0,0.8)', color: '#fff', fontSize: 16, padding: '2px 7px', borderRadius: 5 }}>10:24</div>
        </div>
        <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 28, color: T.ink, lineHeight: 1.15, flex: 1 }}>{small}</div>
      </div>
      {g.label ? <div style={enter('pop_in', frame, fps, 14)}><Pill text={g.label} bg={T.accent} color={T.onAccent} size={28} /></div> : null}
    </div>
  );
};

/* ---------- 10. Chat bubble ---------- */
const Chat: React.FC<SP> = ({ g, anim, frame, fps }) => {
  const T = useTheme();
  const card = useCard({ borderRadius: 30 });
  const typing = frame > 14 && frame < 30;
  return (
    <div style={{ ...col, alignItems: 'flex-start' }}>
      <div style={{ ...card, ...enter(anim, frame, fps, 0), display: 'flex', alignItems: 'center', gap: 16, padding: '18px 26px' }}>
        <div style={{ width: 50, height: 50, borderRadius: 25, background: T.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontWeight: 800, fontSize: 28, color: T.onAccent }}>{(g.text || 'A')[0].toUpperCase()}</div>
        <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 32, color: T.ink, maxWidth: 440, lineHeight: 1.15 }}>{g.text || ''}</div>
      </div>
      {typing ? (
        <div style={{ alignSelf: 'flex-end', display: 'flex', gap: 8, background: T.accent, borderRadius: 24, padding: '16px 22px' }}>
          {[0, 1, 2].map((i) => <div key={i} style={{ width: 12, height: 12, borderRadius: 6, background: T.onAccent, opacity: 0.4 + 0.6 * Math.abs(Math.sin((frame + i * 4) / 4)) }} />)}
        </div>
      ) : null}
      {g.label && frame >= 30 ? (
        <div style={{ ...enter('slide_up', frame, fps, 30), alignSelf: 'flex-end', display: 'flex', alignItems: 'center', gap: 12, background: T.accent, borderRadius: 24, padding: '16px 28px', fontFamily: FONT, fontWeight: 800, fontSize: 32, color: T.onAccent, boxShadow: `0 12px 28px ${T.accent}66` }}>
          <Icon name="check" size={30} color={T.onAccent} />{g.label}
        </div>
      ) : null}
    </div>
  );
};

/* ---------- 11. Big text ---------- */
const BigText: React.FC<SP> = ({ g, anim, frame, fps }) => {
  const T = useTheme();
  const words = String(g.text || '').split(/\s+/).filter(Boolean);
  const hiSet = new Set((g.items || []).map((x) => x.toLowerCase()));
  const hiFrom = hiSet.size ? -1 : Math.max(0, words.length - 2);
  return (
    <div style={{ ...enter(anim, frame, fps, 0), fontFamily: FONT, fontWeight: 800, fontSize: words.length > 7 ? 60 : 78, lineHeight: 1.15, color: T.ink, textAlign: 'center', maxWidth: 640 }}>
      {words.map((w, i) => {
        const hi = hiSet.size ? hiSet.has(w.toLowerCase().replace(/[^a-z0-9]/g, '')) || hiSet.has(w.toLowerCase()) : i >= hiFrom;
        const f = clamp01(lerp(frame, 4 + i * 2, 14 + i * 2, 0, 1));
        const sweep = hi ? clamp01(lerp(frame, 14 + i * 2, 28 + i * 2, 0, 1)) : 0;
        return <span key={i} style={{ backgroundImage: hi ? `linear-gradient(${T.accent}, ${T.accent})` : 'none', backgroundRepeat: 'no-repeat', backgroundPosition: '0 88%', backgroundSize: `${sweep * 100}% 38%`, color: T.ink, padding: '0 4px', opacity: Math.max(0.12, f), display: 'inline-block', transform: `translateY(${(1 - f) * 14}px)` }}>{w}&nbsp;</span>;
      })}
    </div>
  );
};

/* ---------- 12. Quote card ---------- */
const Quote: React.FC<SP> = ({ g, anim, frame, fps }) => {
  const T = useTheme();
  const card = useCard({ borderRadius: 36 });
  return (
    <div style={{ ...card, ...enter(anim, frame, fps, 0), width: '100%', padding: '26px 38px 34px', position: 'relative' }}>
      <div style={{ fontFamily: 'Georgia, serif', fontSize: 170, lineHeight: 0.8, color: T.accent, height: 80, transform: `scale(${pop(frame, fps, 6)})`, transformOrigin: 'left top' }}>“</div>
      <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: (g.text || '').length > 70 ? 38 : 46, lineHeight: 1.18, color: T.ink, opacity: clamp01(lerp(frame, 8, 20, 0, 1)) }}>{g.text}</div>
      {g.label ? <div style={{ ...enter('slide_up', frame, fps, 20), marginTop: 22, display: 'flex', alignItems: 'center', gap: 14, fontFamily: FONT, fontWeight: 700, fontSize: 28, color: T.sub }}><div style={{ width: 46, height: 6, borderRadius: 3, background: T.accent }} />{g.label}</div> : null}
    </div>
  );
};

/* ---------- 13. Progress bars ---------- */
const Bars: React.FC<SP> = ({ g, anim, frame, fps }) => {
  const T = useTheme();
  const card = useCard();
  const its = items(g, ['Reach|72', 'Watch time|55', 'Subs|38'], 4);
  return (
    <div style={{ ...card, ...enter(anim, frame, fps, 0), width: '100%', padding: '26px 30px', display: 'flex', flexDirection: 'column', gap: 22 }}>
      {g.text ? <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 36, color: T.ink }}>{g.text}</div> : null}
      {its.map((it, i) => {
        const [name, v] = split(it);
        const val = Math.max(0, Math.min(100, parseFloat(v) || 0));
        const p = clamp01(lerp(frame, 8 + i * 6, 34 + i * 6, 0, 1));
        const e = 1 - Math.pow(1 - p, 3);
        return (
          <div key={i}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: FONT, fontWeight: 700, fontSize: 28, color: T.ink, marginBottom: 8 }}><span>{name}</span><span>{Math.round(val * e)}%</span></div>
            <div style={{ height: 22, borderRadius: 11, background: T.dark ? '#262636' : '#EFEFEF', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${val * e}%`, borderRadius: 11, background: T.accent, boxShadow: `0 0 16px ${T.accent}88` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* ---------- 14. Steps timeline ---------- */
const Steps: React.FC<SP> = ({ g, anim, frame, fps, dur }) => {
  const T = useTheme();
  const its = items(g, ['Plan|Idea first', 'Record|Talk once', 'Post|Done'], 4);
  const rowH = 104;
  const line = clamp01(lerp(frame, 6, dur * 0.8, 0, 1));
  return (
    <div style={{ width: '100%', position: 'relative', paddingLeft: 12 }}>
      {g.text ? <div style={{ ...enter('slide_up', frame, fps, 0), fontFamily: FONT, fontWeight: 800, fontSize: 36, color: T.ink, marginBottom: 14 }}>{g.text}</div> : null}
      <div style={{ position: 'relative' }}>
        <div style={{ position: 'absolute', left: 29, top: 30, width: 5, height: (its.length - 1) * rowH * line, background: T.accent, borderRadius: 3, boxShadow: `0 0 14px ${T.accent}` }} />
        {its.map((it, i) => {
          const [t, d] = split(it);
          const on = line * (its.length - 1) >= i - 0.05;
          return (
            <div key={i} style={{ ...enter(anim, frame, fps, 4 + i * 8), height: rowH, display: 'flex', alignItems: 'flex-start', gap: 22 }}>
              <div style={{ width: 62, height: 62, borderRadius: 31, background: on ? T.accent : T.card, color: on ? T.onAccent : T.sub, border: `3px solid ${on ? T.accent : T.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontWeight: 800, fontSize: 30, flexShrink: 0, boxShadow: on ? `0 8px 22px ${T.accent}66` : 'none' }}>{i + 1}</div>
              <div style={{ paddingTop: 4 }}>
                <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 36, color: T.ink, lineHeight: 1.1 }}>{t}</div>
                {d ? <div style={{ fontFamily: FONT, fontWeight: 500, fontSize: 26, color: T.sub, marginTop: 4 }}>{d}</div> : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ---------- 15. Pros / cons ---------- */
const ProsCons: React.FC<SP> = ({ g, anim, frame, fps }) => {
  const T = useTheme();
  const card = useCard({ borderRadius: 26 });
  const all = items(g, ['Fast', 'Cheap', '-Slow'], 6);
  const cons = all.filter((x) => x.trim().startsWith('-')).map((x) => x.replace(/^\s*-\s*/, ''));
  let pros = all.filter((x) => !x.trim().startsWith('-'));
  let c = cons;
  if (!cons.length) { const h = Math.ceil(all.length / 2); pros = all.slice(0, h); c = all.slice(h); }
  const colm = (title: string, list: string[], good: boolean, delay: number) => (
    <div style={{ ...card, ...enter(anim, frame, fps, delay), flex: 1, padding: '20px 20px 24px', minHeight: 250, borderColor: good ? T.good : T.bad }}>
      <div style={{ display: 'inline-block', fontFamily: FONT, fontWeight: 800, fontSize: 24, padding: '6px 18px', borderRadius: 999, background: good ? T.good : T.bad, color: '#fff', marginBottom: 14 }}>{title}</div>
      {list.slice(0, 3).map((x, i) => (
        <div key={i} style={{ ...enter('slide_up', frame, fps, delay + 8 + i * 6), display: 'flex', alignItems: 'center', gap: 12, fontFamily: FONT, fontWeight: 700, fontSize: 28, color: T.ink, margin: '12px 0', lineHeight: 1.1 }}>
          <Icon name={good ? 'check' : 'x'} size={30} color={good ? T.good : T.bad} stroke={3.2} />{x}
        </div>
      ))}
    </div>
  );
  return (
    <div style={col}>
      {g.text ? <div style={enter(anim, frame, fps, 0)}><Pill text={g.text} size={32} /></div> : null}
      <div style={{ display: 'flex', gap: 18, width: '100%' }}>{colm('PROS', pros, true, 4)}{colm('CONS', c, false, 12)}</div>
    </div>
  );
};

/* ---------- 16. Before / after ---------- */
const BeforeAfter: React.FC<SP> = ({ g, anim, frame, fps, dur }) => {
  const T = useTheme();
  const card = useCard();
  const its = items(g, ['Before|Slow', 'After|Fast'], 2);
  const after = frame > dur * 0.4;
  return (
    <div style={col}>
      {g.text ? <div style={enter(anim, frame, fps, 0)}><Pill text={g.text} size={32} /></div> : null}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%' }}>
        {its.map((it, i) => {
          const [t, d] = split(it);
          const isAfter = i === 1;
          const bump = isAfter && after ? pop(frame, fps, dur * 0.4) : 0;
          return (
            <React.Fragment key={i}>
              {i === 1 ? <Arrow color={T.ink} progress={clamp01(lerp(frame, dur * 0.3, dur * 0.4, 0, 1))} /> : null}
              <div style={{ ...card, ...enter(anim, frame, fps, 4 + i * 6), flex: 1, padding: '24px 20px', textAlign: 'center', borderColor: isAfter && after ? T.accent : T.line, borderWidth: isAfter && after ? 3 : 2, opacity: isAfter && !after ? 0.3 : 1, filter: !isAfter && after ? 'grayscale(0.8)' : 'none', transform: `scale(${1 + 0.05 * bump})` }}>
                <div style={{ display: 'inline-block', fontFamily: FONT, fontWeight: 800, fontSize: 22, padding: '5px 16px', borderRadius: 999, background: isAfter ? T.accent : T.pillBg, color: isAfter ? T.onAccent : T.pillFg, marginBottom: 12 }}>{t.toUpperCase()}</div>
                <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 36, color: T.ink, lineHeight: 1.1 }}>{d || ' '}</div>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

/* ---------- 17. Kinetic text ---------- */
const Kinetic: React.FC<SP> = ({ g, frame, dur }) => {
  const T = useTheme();
  const words = String(g.text || '').split(/\s+/).filter(Boolean).slice(0, 14);
  const per = Math.max(3, (dur * 0.7) / Math.max(1, words.length));
  const shown = Math.min(words.length, Math.floor((frame - 3) / per) + 1);
  const size = words.length <= 5 ? 96 : words.length <= 9 ? 74 : 58;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '6px 16px', maxWidth: 640, fontFamily: FONT, fontWeight: 800, fontSize: size, lineHeight: 1.12 }}>
      {words.map((w, i) => {
        if (i >= shown) return null;
        const cur = i === shown - 1;
        const p = clamp01(lerp(frame, 3 + i * per, 3 + i * per + 8, 0, 1));
        return <span key={i} style={{ display: 'inline-block', color: cur ? T.onAccent : T.ink, background: cur ? T.accent : 'transparent', padding: '0 12px', borderRadius: 16, transform: `scale(${0.7 + 0.3 * p}) rotate(${cur ? -2 : 0}deg)`, opacity: p, boxShadow: cur ? `0 10px 24px ${T.accent}66` : 'none' }}>{w}</span>;
      })}
    </div>
  );
};

/* ---------- 18. Notification ---------- */
const Notification: React.FC<SP> = ({ g, anim, frame, fps }) => {
  const T = useTheme();
  const card = useCard({ borderRadius: 34 });
  const s = pop(frame, fps, 0);
  const badge = pop(frame, fps, 16);
  return (
    <div style={{ ...card, width: '100%', padding: '24px 26px', display: 'flex', alignItems: 'center', gap: 22, opacity: clamp01(s * 1.5), transform: `translateY(${(1 - s) * -70}px) scale(${0.96 + 0.04 * s})` }}>
      <div style={{ width: 96, height: 96, borderRadius: 26, background: T.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', flexShrink: 0 }}>
        <Icon name={g.icons?.[0] || 'bell'} size={52} color={T.onAccent} />
        <div style={{ position: 'absolute', top: -10, right: -10, width: 34, height: 34, borderRadius: 17, background: T.bad, color: '#fff', fontFamily: FONT, fontWeight: 800, fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${badge})` }}>1</div>
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 36, color: T.ink, lineHeight: 1.1 }}>{g.text}</div>
        {g.label ? <div style={{ ...enter('slide_up', frame, fps, 10), fontFamily: FONT, fontWeight: 500, fontSize: 27, color: T.sub, marginTop: 6, lineHeight: 1.15 }}>{g.label}</div> : null}
      </div>
    </div>
  );
};

/* ---------- 19. Checklist ---------- */
const Checklist: React.FC<SP> = ({ g, anim, frame, fps, dur }) => {
  const T = useTheme();
  const card = useCard();
  const its = items(g, ['Hook', 'Value', 'CTA'], 5);
  const step = Math.max(8, (dur * 0.7) / (its.length + 0.5));
  return (
    <div style={{ ...card, ...enter(anim, frame, fps, 0), width: '100%', padding: '24px 30px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {g.text ? <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 36, color: T.ink }}>{g.text}</div> : null}
      {its.map((it, i) => {
        const p = clamp01(lerp(frame, 8 + i * step, 8 + i * step + 10, 0, 1));
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 18, opacity: 0.35 + 0.65 * p }}>
            <div style={{ width: 52, height: 52, borderRadius: 16, border: `3px solid ${p > 0.5 ? T.accent : T.line}`, background: p > 0.5 ? T.accent : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${1 + 0.15 * Math.sin(p * Math.PI)})` }}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={T.onAccent} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7" strokeDasharray="24" strokeDashoffset={24 * (1 - p)} /></svg>
            </div>
            <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 36, color: T.ink }}>{it}</div>
          </div>
        );
      })}
    </div>
  );
};

/* ---------- 20. Myth / fact ---------- */
const MythFact: React.FC<SP> = ({ g, anim, frame, fps, dur }) => {
  const T = useTheme();
  const card = useCard({ borderRadius: 28 });
  const [myth, fact] = [g.items?.[0] || g.text || '', g.items?.[1] || g.label || ''];
  const showFact = frame > dur * 0.45;
  const strike = clamp01(lerp(frame, 14, 28, 0, 1));
  return (
    <div style={col}>
      <div style={{ ...card, ...enter(anim, frame, fps, 0), width: '100%', padding: '22px 28px', borderColor: T.bad }}>
        <div style={{ display: 'inline-block', fontFamily: FONT, fontWeight: 800, fontSize: 22, padding: '5px 16px', borderRadius: 999, background: T.bad, color: '#fff', marginBottom: 10 }}>MYTH</div>
        <div style={{ position: 'relative', fontFamily: FONT, fontWeight: 800, fontSize: 38, color: T.ink, lineHeight: 1.12 }}>
          {myth}
          <div style={{ position: 'absolute', left: 0, top: '52%', height: 5, width: `${strike * 100}%`, background: T.bad, borderRadius: 3 }} />
        </div>
      </div>
      {showFact ? (
        <div style={{ ...card, ...enter('slide_up', frame, fps, dur * 0.45), width: '100%', padding: '22px 28px', borderColor: T.good, boxShadow: `0 14px 34px ${T.good}44` }}>
          <div style={{ display: 'inline-block', fontFamily: FONT, fontWeight: 800, fontSize: 22, padding: '5px 16px', borderRadius: 999, background: T.good, color: '#fff', marginBottom: 10 }}>FACT</div>
          <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 38, color: T.ink, lineHeight: 1.12 }}>{fact}</div>
        </div>
      ) : null}
    </div>
  );
};

/* ---------- 21. Lower third (name tag over the speaker) ---------- */
const LowerThird: React.FC<SP> = ({ g, frame, fps }) => {
  const T = useTheme();
  const s = pop(frame, fps, 4);
  return (
    <div style={{ width: '100%', display: 'flex', justifyContent: 'center', opacity: clamp01(s * 1.5), transform: `translateX(${(1 - s) * -120}px)` }}>
      <div style={{ display: 'flex', alignItems: 'stretch', borderRadius: 22, overflow: 'hidden', boxShadow: T.shadow }}>
        <div style={{ width: 14, background: T.accent }} />
        <div style={{ background: T.pillBg, color: T.pillFg, padding: '16px 34px 16px 26px' }}>
          <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 44, lineHeight: 1.05 }}>{g.text}</div>
          {g.label ? <div style={{ fontFamily: FONT, fontWeight: 500, fontSize: 26, opacity: 0.8, marginTop: 4 }}>{g.label}</div> : null}
        </div>
      </div>
    </div>
  );
};

export const BIG_SPEAKER = new Set(['speaker_only', 'lower_third']);
export const zoneFor = (type: string) => (type === 'lower_third' ? { top: 800, h: 150 } : { top: 130, h: 490 });

export const SceneBody: React.FC<SP & { type: string }> = (p) => {
  switch (p.type) {
    case 'title_pill': return <TitlePill {...p} />;
    case 'icon_flow': return <IconFlow {...p} />;
    case 'compare_cards': return <Compare {...p} />;
    case 'tag_highlight': return <Chips {...p} variant="tag" />;
    case 'chip_list': return <Chips {...p} variant="list" />;
    case 'counter': return <Counter {...p} />;
    case 'numbered_list': return <Rows {...p} variant="numbered" />;
    case 'command_row': return <Rows {...p} variant="command" />;
    case 'thumbnail_card': return <ThumbCard {...p} />;
    case 'chat_bubble': return <Chat {...p} />;
    case 'big_text': return <BigText {...p} />;
    case 'quote_card': return <Quote {...p} />;
    case 'progress_bars': return <Bars {...p} />;
    case 'steps_timeline': return <Steps {...p} />;
    case 'pros_cons': return <ProsCons {...p} />;
    case 'before_after': return <BeforeAfter {...p} />;
    case 'kinetic_text': return <Kinetic {...p} />;
    case 'notification': return <Notification {...p} />;
    case 'checklist': return <Checklist {...p} />;
    case 'myth_fact': return <MythFact {...p} />;
    case 'lower_third': return <LowerThird {...p} />;
    default: return GLASS_TYPES.includes(p.type) ? <GlassBody {...p} /> : null; // glass_* and photo_3d; speaker_only draws nothing
  }
};
