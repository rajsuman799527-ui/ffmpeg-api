import React from 'react';
import { Arrow, C, FONT, Icon, Pill, clamp01, enter, lerp, pop } from './ui';

export type G = { text?: string; icons?: string[]; items?: string[]; number?: number | null; label?: string };
type SP = { g: G; anim: string; frame: number; fps: number; dur: number };

const split = (s: string): [string, string] => {
  const i = String(s || '').indexOf('|');
  return i < 0 ? [String(s || ''), ''] : [s.slice(0, i).trim(), s.slice(i + 1).trim()];
};
const col: React.CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22, width: '100%' };

const TitlePill: React.FC<SP> = ({ g, anim, frame, fps }) => (
  <div style={col}>
    <div style={enter(anim, frame, fps, 0)}><Pill text={g.text || ''} size={36} style={{ maxWidth: 640, whiteSpace: 'normal', textAlign: 'center', borderRadius: 40 }} /></div>
    {g.label ? <div style={{ ...enter(anim, frame, fps, 8), fontFamily: FONT, fontWeight: 700, fontSize: 30, color: C.ink, textAlign: 'center' }}>{g.label}</div> : null}
  </div>
);

const IconFlow: React.FC<SP> = ({ g, anim, frame, fps }) => {
  const icons = (g.icons && g.icons.length ? g.icons : ['play', 'rupee']).slice(0, 4);
  return (
    <div style={col}>
      {g.text ? <div style={enter(anim, frame, fps, 0)}><Pill text={g.text} size={32} /></div> : null}
      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
        {icons.map((ic, i) => {
          const dark = i % 2 === 0;
          return (
            <React.Fragment key={i}>
              {i > 0 ? <div style={{ ...enter('pop_in', frame, fps, 6 + i * 7), display: 'flex' }}><Arrow /></div> : null}
              <div style={{ ...enter(anim, frame, fps, 4 + i * 7), width: 112, height: 112, borderRadius: 26, background: dark ? C.ink : C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 24px rgba(0,0,0,0.12)' }}>
                <Icon name={ic} size={58} color={dark ? C.white : C.ink} />
              </div>
            </React.Fragment>
          );
        })}
      </div>
      {g.label ? <div style={{ ...enter(anim, frame, fps, 20), fontFamily: FONT, fontWeight: 700, fontSize: 28, color: C.ink }}>{g.label}</div> : null}
    </div>
  );
};

const Compare: React.FC<SP> = ({ g, anim, frame, fps, dur }) => {
  const items = (g.items && g.items.length ? g.items : ['A', 'B']).slice(0, 2);
  const hi = frame > dur * 0.42;
  return (
    <div style={col}>
      {g.text ? <div style={enter(anim, frame, fps, 0)}><Pill text={g.text} size={30} /></div> : null}
      <div style={{ display: 'flex', gap: 22, width: '100%' }}>
        {items.map((it, i) => {
          const [title, sub] = split(it);
          const on = i === 1 && hi;
          return (
            <div key={i} style={{ ...enter(anim, frame, fps, 4 + i * 8), flex: 1, background: C.white, border: '2px solid ' + C.line, borderRadius: 26, padding: '26px 24px', boxShadow: '0 12px 28px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', gap: 18, minHeight: 190 }}>
              <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 40, color: C.ink }}>{title}</div>
              <div style={{ alignSelf: 'flex-start', fontFamily: FONT, fontWeight: 700, fontSize: 24, padding: '9px 20px', borderRadius: 999, border: on ? '2px solid ' + C.accent : '2px solid ' + C.line, background: on ? C.accent : '#F6F6F6', color: C.ink, minWidth: 80, minHeight: 20 }}>{i === 1 && !hi ? '' : sub}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const Chips: React.FC<SP & { variant: 'tag' | 'list' }> = ({ g, anim, frame, fps, dur, variant }) => {
  const items = (g.items && g.items.length ? g.items : ['Idea', 'Script', 'Title']).slice(0, 8);
  const step = Math.max(6, (dur * 0.8) / (items.length + 1));
  return (
    <div style={col}>
      <div style={{ ...enter(anim, frame, fps, 0), fontFamily: FONT, fontWeight: 800, fontSize: 42, color: C.ink, textAlign: 'center' }}>{g.text || ''}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, justifyContent: 'center', maxWidth: 640 }}>
        {items.map((it, i) => {
          const on = frame >= 10 + i * step;
          const bg = on ? (variant === 'tag' ? C.accent : C.ink) : 'transparent';
          const fg = on ? (variant === 'tag' ? C.ink : C.white) : '#777';
          return (
            <div key={i} style={{ ...enter('pop_in', frame, fps, 3 + i * 4), fontFamily: FONT, fontWeight: 700, fontSize: 28, padding: '10px 26px', borderRadius: 999, border: '2px solid ' + (on ? bg : C.line), background: bg, color: fg }}>{it}</div>
          );
        })}
      </div>
    </div>
  );
};

const Counter: React.FC<SP> = ({ g, anim, frame, fps }) => {
  const n = typeof g.number === 'number' ? g.number : 0;
  const shown = Math.round(lerp(frame, 4, 26, 0, n));
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 26, justifyContent: 'center', width: '100%' }}>
      <div style={{ ...enter(anim, frame, fps, 0), width: 190, height: 190, borderRadius: 40, background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontWeight: 800, fontSize: 112, color: C.ink, boxShadow: '0 14px 30px rgba(255,214,0,0.45)' }}>{shown}</div>
      <div style={{ ...enter('slide_up', frame, fps, 8), fontFamily: FONT, fontWeight: 800, fontSize: 56, color: C.ink, maxWidth: 360, lineHeight: 1.05 }}>{g.label || g.text || ''}</div>
    </div>
  );
};

const Rows: React.FC<SP & { variant: 'numbered' | 'command' }> = ({ g, anim, frame, fps, dur, variant }) => {
  const items = (g.items && g.items.length ? g.items : ['One', 'Two', 'Three']).slice(0, 5);
  const rows = Math.max(3, items.length);
  const step = Math.max(8, (dur * 0.75) / (items.length + 0.5));
  const active = Math.min(items.length - 1, Math.max(-1, Math.floor((frame - 8) / step)));
  return (
    <div style={{ ...col, gap: 10 }}>
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 9 }}>
        {Array.from({ length: rows }).map((_, i) => {
          const it = items[i];
          const shown = it !== undefined && i <= active;
          const [left, right] = shown ? split(it) : ['', ''];
          const isActive = i === active;
          return (
            <div key={i} style={{ ...enter('slide_up', frame, fps, i * 3), display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56, padding: '0 20px', borderRadius: 12, border: '2px solid ' + (isActive ? C.accent : C.line), background: isActive ? 'linear-gradient(90deg,' + C.accent + ' 0%, #FFF4A8 100%)' : C.white, fontFamily: FONT, fontWeight: 800, fontSize: 26, color: C.ink }}>
              <span style={{ opacity: shown ? 1 : 0.35 }}>{shown ? left : String(i + 1)}</span>
              {right ? <span style={{ background: C.ink, color: C.white, fontSize: 21, padding: '6px 16px', borderRadius: 999 }}>{right}</span> : null}
            </div>
          );
        })}
      </div>
      {g.text ? <div style={{ ...enter('slide_up', frame, fps, 14), alignSelf: 'flex-start', fontFamily: FONT, fontWeight: 800, fontSize: 32, color: C.ink, marginTop: 6 }}>{g.text}</div> : null}
    </div>
  );
};

const ThumbCard: React.FC<SP> = ({ g, anim, frame, fps }) => {
  const [big, small] = split(g.text || '');
  return (
    <div style={col}>
      <div style={{ ...enter(anim, frame, fps, 0), display: 'flex', gap: 18, alignItems: 'center', background: C.white, border: '2px solid ' + C.line, borderRadius: 24, padding: 14, boxShadow: '0 12px 28px rgba(0,0,0,0.08)', width: '100%' }}>
        <div style={{ width: 250, height: 140, borderRadius: 16, background: C.accent, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 16px', fontFamily: FONT, fontWeight: 800, fontSize: 40, lineHeight: 1, color: C.ink }}>{big}</div>
        <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 26, color: C.ink, lineHeight: 1.15, flex: 1 }}>{small}</div>
      </div>
      {g.label ? <div style={enter('pop_in', frame, fps, 14)}><Pill text={g.label} bg={C.accent} color={C.ink} size={26} /></div> : null}
    </div>
  );
};

const Chat: React.FC<SP> = ({ g, anim, frame, fps }) => (
  <div style={{ ...col, alignItems: 'flex-start' }}>
    <div style={{ ...enter(anim, frame, fps, 0), display: 'flex', alignItems: 'center', gap: 16, background: C.white, borderRadius: 26, padding: '18px 24px', boxShadow: '0 12px 28px rgba(0,0,0,0.1)', border: '2px solid ' + C.line }}>
      <div style={{ width: 46, height: 46, borderRadius: 23, background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontWeight: 800, fontSize: 26, color: C.ink }}>{(g.text || 'A')[0].toUpperCase()}</div>
      <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 28, color: C.ink, maxWidth: 440 }}>{g.text || ''}</div>
    </div>
    {g.label ? (
      <div style={{ ...enter('slide_up', frame, fps, 18), alignSelf: 'flex-end', display: 'flex', alignItems: 'center', gap: 10, background: C.accent, borderRadius: 18, padding: '14px 26px', fontFamily: FONT, fontWeight: 800, fontSize: 28, color: C.ink, boxShadow: '0 10px 24px rgba(255,214,0,0.45)' }}>
        <Icon name="check" size={28} color={C.ink} />{g.label}
      </div>
    ) : null}
  </div>
);

const BigText: React.FC<SP> = ({ g, anim, frame, fps }) => {
  const words = String(g.text || '').split(/\s+/).filter(Boolean);
  const hiSet = new Set((g.items || []).map((x) => x.toLowerCase()));
  const hiFrom = hiSet.size ? -1 : Math.max(0, words.length - 2);
  return (
    <div style={{ ...enter(anim, frame, fps, 0), fontFamily: FONT, fontWeight: 800, fontSize: words.length > 7 ? 54 : 70, lineHeight: 1.12, color: C.ink, textAlign: 'center', maxWidth: 640 }}>
      {words.map((w, i) => {
        const hi = hiSet.size ? hiSet.has(w.toLowerCase().replace(/[^a-z0-9]/g, '')) || hiSet.has(w.toLowerCase()) : i >= hiFrom;
        const f = clamp01(lerp(frame, 6 + i * 2, 18 + i * 2, 0, 1));
        return <span key={i} style={{ background: hi ? 'linear-gradient(transparent 60%, ' + C.accent + ' 60%)' : 'none', padding: '0 4px', opacity: Math.max(0.15, f) }}>{w + ' '}</span>;
      })}
    </div>
  );
};

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
    default: return null; // speaker_only
  }
};
