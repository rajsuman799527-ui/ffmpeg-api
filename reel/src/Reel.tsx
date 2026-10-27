import React from 'react';
import { AbsoluteFill, Easing, OffthreadVideo, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { loadFont } from '@remotion/google-fonts/Poppins';

const { fontFamily } = loadFont('normal', { weights: ['600', '800'], subsets: ['latin'] });

export type Scene = {
  id: string; start: number; end: number; scene_type: string;
  graphic?: { text?: string; icons?: string[]; items?: string[]; number?: number; label?: string };
  animation?: string; transition_out?: string;
};
export type Plan = {
  video: { width: number; height: number; fps: number };
  style: { accent?: string; text?: string };
  cuts: { start: number; end: number; reason: string }[];
  scenes: Scene[];
  captions: { text: string; start: number; end: number }[];
};
export type ReelProps = { plan: Plan; videoUrl: string; cutoutUrl?: string };

const ACCENT = '#FFD600';
const INK = '#111111';
const TRANS = 8; // frames for soft transitions

/* speaker circle: big when only the speaker is on screen, smaller when a graphic is shown */
const circleFor = (s?: Scene) => (!s || s.scene_type === 'speaker_only' ? { size: 600, y: 470 } : { size: 340, y: 800 });

const Speaker: React.FC<{ videoUrl: string; plan: Plan }> = ({ videoUrl, plan }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const idx = Math.max(0, plan.scenes.findIndex((s) => t >= s.start && t < s.end));
  const cur = circleFor(plan.scenes[idx]);
  const prev = idx > 0 ? circleFor(plan.scenes[idx - 1]) : cur;
  const local = frame - Math.round((plan.scenes[idx]?.start ?? 0) * fps);
  const k = interpolate(local, [0, 12], [0, 1], { extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
  const size = prev.size + (cur.size - prev.size) * k;
  const y = prev.y + (cur.y - prev.y) * k;
  return (
    <div style={{ position: 'absolute', left: 360 - size / 2, top: y - size / 2, width: size, height: size }}>
      <div style={{ position: 'absolute', inset: -14, borderRadius: '50%', background: ACCENT, boxShadow: '0 10px 40px rgba(255,214,0,0.45)' }} />
      <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', overflow: 'hidden', background: '#000' }}>
        <OffthreadVideo src={videoUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
    </div>
  );
};

const pop = (frame: number, fps: number, anim?: string, delay = 0) => {
  const f = Math.max(0, frame - delay);
  if (anim === 'slide_up') {
    const p = spring({ frame: f, fps, config: { damping: 18 } });
    return { opacity: p, transform: `translateY(${(1 - p) * 60}px)` };
  }
  const p = spring({ frame: f, fps, config: { damping: 12, stiffness: 140 } });
  return { opacity: Math.min(1, p * 1.5), transform: `scale(${0.6 + 0.4 * p})` };
};

const Pill: React.FC<{ children: React.ReactNode; dark?: boolean; style?: React.CSSProperties }> = ({ children, dark, style }) => (
  <div style={{ background: dark ? INK : ACCENT, color: dark ? ACCENT : INK, borderRadius: 999, padding: '14px 34px', fontWeight: 800, fontSize: 46, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', ...style }}>{children}</div>
);

const Graphic: React.FC<{ scene: Scene; frame: number }> = ({ scene, frame }) => {
  const { fps } = useVideoConfig();
  const g = scene.graphic ?? {};
  const a = scene.animation;
  const text = g.text || g.label || '';
  const wrap: React.CSSProperties = { position: 'absolute', left: 40, right: 40, top: 120, height: 560, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 22, textAlign: 'center' };
  const st = (i: number) => pop(frame, fps, a, i * 5);

  switch (scene.scene_type) {
    case 'speaker_only':
      return null;
    case 'title_pill':
      return <div style={wrap}><div style={st(0)}><Pill>{text}</Pill></div></div>;
    case 'chip_list':
    case 'tag_highlight': {
      const items = g.items?.length ? g.items : text ? [text] : [];
      return <div style={{ ...wrap, flexDirection: 'row', flexWrap: 'wrap' }}>{items.slice(0, 6).map((it, i) => <div key={i} style={st(i)}><Pill dark={i % 2 === 1} style={{ fontSize: 40 }}>{it}</Pill></div>)}</div>;
    }
    case 'numbered_list':
    case 'icon_flow':
    case 'command_row': {
      const items = g.items?.length ? g.items : [];
      return (
        <div style={wrap}>
          {text ? <div style={st(0)}><Pill>{text}</Pill></div> : null}
          {items.slice(0, 5).map((it, i) => (
            <div key={i} style={{ ...st(i + 1), display: 'flex', alignItems: 'center', gap: 18, background: '#fff', borderRadius: 28, padding: '16px 30px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontSize: 40, fontWeight: 800 }}>
              <span style={{ background: ACCENT, borderRadius: '50%', width: 56, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</span>
              <span style={scene.scene_type === 'command_row' ? { fontFamily: 'monospace' } : undefined}>{it}</span>
            </div>
          ))}
        </div>
      );
    }
    case 'counter': {
      const target = g.number ?? 0;
      const v = Math.round(interpolate(frame, [0, 30], [0, target], { extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) }));
      return <div style={wrap}><div style={{ ...st(0), fontSize: 190, fontWeight: 800, lineHeight: 1 }}>{v.toLocaleString('en-IN')}</div>{g.label || text ? <Pill>{g.label || text}</Pill> : null}</div>;
    }
    case 'compare_cards': {
      const items = (g.items ?? []).slice(0, 2);
      return <div style={{ ...wrap, flexDirection: 'row' }}>{items.map((it, i) => <div key={i} style={{ ...st(i), flex: 1, background: i ? ACCENT : '#fff', borderRadius: 32, padding: 28, fontSize: 38, fontWeight: 800, boxShadow: '0 10px 30px rgba(0,0,0,0.12)' }}>{it}</div>)}</div>;
    }
    case 'chat_bubble':
      return <div style={wrap}><div style={{ ...st(0), background: '#fff', borderRadius: '36px 36px 36px 8px', padding: '26px 34px', fontSize: 44, fontWeight: 600, boxShadow: '0 10px 30px rgba(0,0,0,0.12)' }}>{text}</div></div>;
    case 'thumbnail_card':
      return <div style={wrap}><div style={{ ...st(0), background: '#fff', border: `8px solid ${ACCENT}`, borderRadius: 32, padding: '60px 40px', fontSize: 52, fontWeight: 800, boxShadow: '0 14px 36px rgba(0,0,0,0.15)' }}>{text}</div></div>;
    case 'big_text':
    default:
      return <div style={wrap}><div style={{ ...st(0), fontSize: 84, fontWeight: 800, lineHeight: 1.1, color: INK }}>{text}</div></div>;
  }
};

const Captions: React.FC<{ plan: Plan }> = ({ plan }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const cap = plan.captions.find((c) => t >= c.start && t < c.end + 0.08);
  if (!cap) return null;
  const words = cap.text.split(/\s+/).filter(Boolean);
  const per = (cap.end - cap.start) / Math.max(1, words.length);
  const activeIdx = Math.min(words.length - 1, Math.floor((t - cap.start) / Math.max(0.05, per)));
  const enter = spring({ frame: frame - Math.round(cap.start * fps), fps, config: { damping: 14 } });
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 300, background: 'linear-gradient(to top, rgba(10,10,10,0.92) 20%, rgba(10,10,10,0))', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0 40px 90px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '6px 16px', transform: `translateY(${(1 - enter) * 24}px)`, opacity: enter }}>
        {words.map((w, i) => (
          <span key={i} style={{ fontSize: 60, fontWeight: 800, color: i === activeIdx ? ACCENT : '#fff', textShadow: '0 3px 10px rgba(0,0,0,0.6)', transform: i === activeIdx ? 'scale(1.08)' : 'none' }}>{w}</span>
        ))}
      </div>
    </div>
  );
};

export const Reel: React.FC<ReelProps> = ({ plan, videoUrl }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const scene = plan.scenes.find((s) => t >= s.start && t < s.end) ?? plan.scenes[plan.scenes.length - 1];
  const sf = Math.round((scene?.start ?? 0) * fps);
  const ef = Math.round((scene?.end ?? 0) * fps);
  // soft blur-fade at the start and end of every scene
  const edge = Math.min(frame - sf, ef - frame);
  const soft = scene?.transition_out === 'cut' ? 1 : interpolate(edge, [0, TRANS], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ fontFamily, background: '#fff' }}>
      <AbsoluteFill style={{ background: 'radial-gradient(circle at 50% 38%, rgba(255,214,0,0.42), rgba(255,255,255,0) 62%)' }} />
      <div style={{ position: 'absolute', inset: 0, filter: `blur(${(1 - soft) * 14}px)`, opacity: 0.35 + 0.65 * soft }}>
        {scene ? <Graphic key={scene.id} scene={scene} frame={frame - sf} /> : null}
      </div>
      <Speaker videoUrl={videoUrl} plan={plan} />
      <Captions plan={plan} />
      <div style={{ position: 'absolute', top: 40, right: 40, background: INK, color: ACCENT, fontWeight: 800, fontSize: 26, borderRadius: 999, padding: '8px 22px' }}>YouTube Studio AI</div>
    </AbsoluteFill>
  );
};
