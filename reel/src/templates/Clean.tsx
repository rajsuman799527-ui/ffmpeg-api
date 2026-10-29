import React, { useMemo } from 'react';
import { AbsoluteFill, Audio, Easing, OffthreadVideo, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { ThemeCtx, getTheme, useTheme } from '../theme';
import { F } from '../fonts';
import { SceneBody } from '../scenes';
import { GLASS_TYPES } from '../glass';
import { EmojiPops, EndCard, HookIntro } from '../overlays';
import { prepare, type PScene, type PCaption, type Seg } from '../timeline';
import { MusicLayer, SfxLayer } from '../common';
import { KText, WordCaption } from '../ktext';

/**
 * "Clean": the editorial explainer look.
 * White page with soft warm glows, a small black title pill that stays for a whole idea,
 * a compact graphic that builds under it, and the speaker in a light card with a yellow circle.
 * Captions live inside the card, small and calm.
 */
type CleanPlan = {
  video: { width: number; height: number; fps: number };
  duration?: number;
  mode?: 'video' | 'voice';
  src?: { w: number; h: number };
  tracks?: { url: string; start: number }[];
  sfx?: boolean;
  hook?: string; cta?: string; pops?: { t: number; emoji: string }[];
  brand?: { logoText?: string };
  style?: { theme?: string; accent?: string; currency?: string; zoom?: number };
  music?: { track?: string; volume?: number } | null;
  cuts: { start: number; end: number; reason?: string }[];
  scenes: PScene[];
  captions: PCaption[];
};
export type CleanProps = { plan: CleanPlan; videoUrl: string; audioUrl?: string; cutoutUrl?: string };

const SANS = F.inter + ', ' + F.deva + ', sans-serif';
const CARD = { x: 48, y: 660, w: 624, h: 336, r: 26 };
const CIRCLE = 300;
/** The speaker box: 16:9 videos fill it exactly; taller videos make it taller (up to 560) and are shown whole, never cropped into a circle. */
const cardGeom = (src?: { w: number; h: number }) => {
  const aspect = src && src.w > 0 && src.h > 0 ? src.h / src.w : 0;
  const h = aspect ? Math.max(CARD.h, Math.min(560, Math.round(CARD.w * aspect))) : CARD.h;
  return { h, fit: (aspect ? 'contain' : 'cover') as 'contain' | 'cover' };
};
const BODY = { top: 262, h: 392 };
const EASE = Easing.bezier(0.22, 1, 0.36, 1);
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

const titleOf = (s: PScene): string => {
  const g = (s.graphic || {}) as any;
  return String(g.title || (s.scene_type === 'title_pill' ? g.text : '') || '').replace(/\s+/g, ' ').trim();
};

type Chapter = { title: string; start: number; end: number };
const chaptersOf = (scenes: PScene[]): Chapter[] => {
  const out: Chapter[] = [];
  for (const s of scenes) {
    const t = titleOf(s);
    if (!t) continue;
    const last = out[out.length - 1];
    if (last && last.title === t && Math.abs(last.end - s.start) < 0.06) last.end = s.end;
    else out.push({ title: t, start: s.start, end: s.end });
  }
  return out;
};

/* ---------- background: pure white, one warm glow top right, a faint peach one bottom left ---------- */
const Backdrop: React.FC = () => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const a = frame / 120;
  return (
    <AbsoluteFill style={{ background: T.bg, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: 250 + Math.sin(a) * 26, top: -250 + Math.cos(a * 0.8) * 20, width: 900, height: 900, borderRadius: '50%', background: 'radial-gradient(circle, ' + (T.dark ? T.glow : 'rgba(255,214,0,0.30)') + ', rgba(255,255,255,0) 62%)' }} />
      <div style={{ position: 'absolute', left: -330 + Math.cos(a * 0.7) * 22, top: 780 + Math.sin(a * 0.9) * 18, width: 820, height: 820, borderRadius: '50%', background: 'radial-gradient(circle, ' + (T.dark ? T.glow2 : 'rgba(255,170,80,0.15)') + ', rgba(255,255,255,0) 62%)' }} />
    </AbsoluteFill>
  );
};

/* ---------- title pill: appears once per idea and stays while the graphic builds under it ---------- */
const TitlePill: React.FC<{ title: string; dur: number }> = ({ title, dur }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame, fps, config: { damping: 15, stiffness: 150, mass: 0.7 } });
  const out = interpolate(dur - frame, [0, 8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const size = title.length > 40 ? 24 : title.length > 26 ? 28 : 32;
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: 168, display: 'flex', justifyContent: 'center', opacity: clamp01(p * 1.5) * out, transform: 'translateY(' + (1 - p) * 14 + 'px) scale(' + (0.9 + 0.1 * p) * (0.97 + 0.03 * out) + ')' }}>
      <div style={{ background: T.pillBg, color: T.pillFg, fontFamily: SANS, fontWeight: 700, fontSize: size, lineHeight: 1.1, padding: '15px 34px', borderRadius: 999, maxWidth: 640, textAlign: 'center', boxShadow: '0 12px 28px rgba(0,0,0,0.16)' }}><KText text={title} size={size} weight={700} color={T.pillFg} hi="none" step={2.5} delay={2} family={SANS} tracking={0} lineHeight={1.1} /></div>
    </div>
  );
};

/* ---------- one scene body (the graphic that builds under the title) ---------- */
const BODY_TYPES_WITH_OWN_HEADING = ['icon_flow', 'compare_cards', 'tag_highlight', 'chip_list'];
const SceneShell: React.FC<{ scene: PScene; dur: number; hasTitle: boolean }> = ({ scene, dur, hasTitle }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const type = scene.scene_type;
  if (type === 'title_pill' || type === 'speaker_only' || type === 'lower_third' || GLASS_TYPES.includes(type)) return null;
  const g: any = { ...((scene.graphic || {}) as any) };
  if (hasTitle && BODY_TYPES_WITH_OWN_HEADING.includes(type)) g.text = '';
  const isGlass = GLASS_TYPES.includes(type);
  const out = scene.transition_out || 'blur_fade';
  const inP = interpolate(frame, [0, 7], [0, 1], { extrapolateRight: 'clamp', easing: EASE });
  const outP = out === 'cut' ? 1 : interpolate(dur - frame, [0, 8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const blur = out === 'blur_fade' ? (1 - outP) * 6 : 0;
  return (
    <div style={{ position: 'absolute', left: 40, right: 40, top: isGlass ? 190 : BODY.top, height: isGlass ? 470 : BODY.h, display: 'flex', alignItems: isGlass ? 'center' : 'flex-start', justifyContent: 'center', paddingTop: isGlass ? 0 : hasTitle ? 14 : 70, opacity: out === 'cut' ? inP : inP * outP, transform: isGlass ? 'scale(0.8)' : 'scale(0.95)', transformOrigin: isGlass ? '50% 50%' : '50% 0%', filter: blur > 0.4 ? 'blur(' + blur + 'px)' : 'none' }}>
      <SceneBody type={type} g={g} anim={scene.animation || 'pop_in'} frame={frame} fps={fps} dur={dur} />
    </div>
  );
};

/* ---------- speaker card ---------- */
const WaveOrb: React.FC = () => {
  const T = useTheme();
  const frame = useCurrentFrame();
  return (
    <div style={{ position: 'absolute', left: (CARD.w - CIRCLE) / 2, top: 30, width: CIRCLE, height: CIRCLE, borderRadius: '50%', background: T.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
      {Array.from({ length: 11 }).map((_, i) => {
        const h = (0.22 + 0.78 * Math.abs(Math.sin(frame / 6 + i * 1.2) * Math.cos(frame / 13 + i * 0.7))) * 150;
        return <div key={i} style={{ width: 11, height: h, borderRadius: 99, background: T.onAccent }} />;
      })}
    </div>
  );
};

const CleanCaption: React.FC<{ captions: PCaption[]; offset?: number; card?: boolean; big?: boolean }> = ({ captions, offset = 0, card = false, big = false }) => {
  const T = useTheme();
  const frame = useCurrentFrame() + offset;
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const idx = captions.findIndex((c) => t >= c.start && t < c.end + 0.08);
  const cap = idx >= 0 ? captions[idx] : undefined;
  const p = cap ? spring({ frame: frame - Math.round(cap.start * fps), fps, config: { damping: 18, stiffness: 190 } }) : 0;
  const out = cap ? interpolate(t, [cap.end - 0.05, cap.end + 0.08], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 0;
  const words = cap ? cap.text.split(/\s+/).filter(Boolean) : [];
  const emph = cap && typeof cap.emphasis === 'number' && cap.emphasis >= 0 && cap.emphasis < words.length ? cap.emphasis : -1;
  const len = cap ? cap.text.length : 0;
  const size = big ? (len <= 20 ? 60 : len <= 30 ? 52 : len <= 44 ? 44 : 38) : len <= 26 ? 31 : len <= 38 ? 28 : 24;
  return (
    <>
      {card ? null : <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 118, background: 'linear-gradient(to top, rgba(42,42,46,0.94) 8%, rgba(42,42,46,0))' }} />}
      {cap ? (
        <div style={{ position: 'absolute', left: 28, right: 28, ...(card ? { top: 0, bottom: 0, alignItems: 'center' } : { bottom: 22 }), display: 'flex', justifyContent: 'center', opacity: clamp01(p * 1.6) * out, transform: 'translateY(' + (1 - clamp01(p)) * 10 + 'px)' }}>
          <WordCaption cap={cap} size={card && !big ? size + 6 : size} fontFamily={SANS} offset={offset} />
        </div>
      ) : null}
    </>
  );
};

/** Voice-only reels have no speaker, so there is no box: big captions on a dark panel, with the graphics above. */
const VoicePanel: React.FC<{ captions: PCaption[] }> = ({ captions }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 18, stiffness: 110, mass: 0.9 } });
  return (
    <div style={{ position: 'absolute', left: CARD.x, top: 690, width: CARD.w, height: 400, borderRadius: 30, background: 'linear-gradient(160deg, rgba(36,36,44,0.97), rgba(20,20,26,0.97))', boxShadow: '0 30px 64px rgba(20,20,30,0.30)', overflow: 'hidden', opacity: clamp01(enter * 1.6), transform: 'translateY(' + (1 - enter) * 40 + 'px)' }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 6, background: T.accent }} />
      <CleanCaption captions={captions} card big />
    </div>
  );
};

const CleanSpeaker: React.FC<{ videoUrl: string; cutoutUrl?: string; segs: Seg[]; captions: PCaption[]; zoom: number; src?: { w: number; h: number } }> = ({ videoUrl, cutoutUrl, segs, captions, zoom, src }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 18, stiffness: 110, mass: 0.9 } });
  const float = Math.sin(frame / 38) * 3;
  const pulse = (frame % 90) / 90;
  const cw = Math.round(400 * zoom);
  const geo = cardGeom(src);
  return (
    <>
      {cutoutUrl ? segs.map((s, i) => (
        <Sequence key={'a' + i} from={s.outFrame} durationInFrames={s.frames}><Audio src={videoUrl} startFrom={Math.round(s.start * fps)} /></Sequence>
      )) : null}
      <div style={{ position: 'absolute', left: CARD.x, top: CARD.y, width: CARD.w, height: geo.h, borderRadius: CARD.r, background: T.dark ? '#1B1B26' : '#F2F2F3', overflow: 'hidden', boxShadow: '0 28px 60px rgba(20,20,24,0.09), 0 2px 8px rgba(20,20,24,0.05)', opacity: clamp01(enter * 1.6), transform: 'translateY(' + ((1 - enter) * 40 + float) + 'px)' }}>
        {cutoutUrl ? (
          <>
            <div style={{ position: 'absolute', left: (CARD.w - CIRCLE) / 2 - 16, top: 14, width: CIRCLE + 32, height: CIRCLE + 32, borderRadius: '50%', border: '2px solid ' + T.accent, opacity: 0.5 * (1 - pulse), transform: 'scale(' + (1 + pulse * 0.08) + ')' }} />
            <div style={{ position: 'absolute', left: (CARD.w - CIRCLE) / 2, top: 30, width: CIRCLE, height: CIRCLE, borderRadius: '50%', background: T.accent }} />
            <div style={{ position: 'absolute', left: (CARD.w - cw) / 2, bottom: 0, width: cw, height: cw }}>
              {segs.map((s, i) => (
                <Sequence key={'v' + i} from={s.outFrame} durationInFrames={s.frames}>
                  <OffthreadVideo src={cutoutUrl} transparent muted startFrom={Math.round(s.start * fps)} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 24%' }} />
                </Sequence>
              ))}
            </div>
          </>
        ) : (
          segs.map((s, i) => (
            <Sequence key={'f' + i} from={s.outFrame} durationInFrames={s.frames}>
              <OffthreadVideo src={videoUrl} startFrom={Math.round(s.start * fps)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: geo.fit, objectPosition: '50% 30%' }} />
            </Sequence>
          ))
        )}
        <CleanCaption captions={captions} />
      </div>
    </>
  );
};

/** A glass graphic takes the whole screen: the speaker card steps aside, the picture stays big and readable. */
const FullGraphic: React.FC<{ scene: PScene; dur: number; captions: PCaption[]; from: number }> = ({ scene, dur, captions, from }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const T = useTheme();
  const inP = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: 'clamp', easing: EASE });
  const outP = interpolate(dur - frame, [0, 8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const o = Math.min(inP, outP);
  const g: any = { ...((scene.graphic || {}) as any) };
  return (
    <div style={{ position: 'absolute', inset: 0, background: T.bg, opacity: o }}>
      <div style={{ position: 'absolute', left: 40, right: 40, top: 150, height: 760, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: 'scale(' + (1.12 + 0.03 * (1 - inP)) + ')' }}>
        <SceneBody type={scene.scene_type} g={g} anim={scene.animation || 'pop_in'} frame={frame} fps={fps} dur={dur} />
      </div>
      <div style={{ position: 'absolute', left: 48, top: 880, width: 624, height: 150, borderRadius: 28, background: 'rgba(30,30,36,0.94)', boxShadow: '0 24px 50px rgba(20,20,30,0.28)', overflow: 'hidden' }}><CleanCaption captions={captions} offset={from} card /></div>
    </div>
  );
};

export const Clean: React.FC<CleanProps> = ({ plan, videoUrl, audioUrl, cutoutUrl }) => {
  const { fps } = useVideoConfig();
  const voice = plan.mode === 'voice' || !videoUrl;
  const prep = useMemo(() => prepare(voice ? { ...plan, cuts: [], duration: plan.duration || Math.max(1, ...plan.captions.map((c) => c.end), ...plan.scenes.map((s) => s.end)) } : plan, fps), [plan, fps, voice]);
  const theme = useMemo(() => getTheme('sunny', plan.style?.accent), [plan]);
  const chapters = useMemo(() => chaptersOf(prep.scenes), [prep]);
  const zoom = Math.max(0.7, Math.min(1.5, Number(plan.style?.zoom) || 1));
  const handle = String(plan.brand?.logoText ?? '').trim();
  const showHandle = handle && handle.toLowerCase() !== 'studio';
  return (
    <ThemeCtx.Provider value={theme}>
      <AbsoluteFill style={{ fontFamily: SANS, background: theme.bg }}>
        <Backdrop />
        {chapters.map((c, i) => {
          const from = Math.round(c.start * fps);
          const to = Math.round(c.end * fps);
          return <Sequence key={'t' + i} from={from} durationInFrames={Math.max(1, to - from)}><TitlePill title={c.title} dur={Math.max(1, to - from)} /></Sequence>;
        })}
        {prep.scenes.map((s, i) => {
          const from = Math.round(s.start * fps);
          const to = i === prep.scenes.length - 1 ? prep.tl.totalFrames : Math.round(s.end * fps);
          const dur = Math.max(1, to - from);
          return <Sequence key={s.id + '-' + i} from={from} durationInFrames={dur}><SceneShell scene={s} dur={dur} hasTitle={!!titleOf(s)} /></Sequence>;
        })}
        {plan.sfx === false ? null : prep.scenes.slice(1).map((s, i) => (
          <Sequence key={'sw' + i} from={Math.max(0, Math.round(s.start * fps) - 3)} durationInFrames={30}><Audio src={staticFile('sfx/swish.wav')} volume={0.2} /></Sequence>
        ))}
        {voice ? (plan.tracks && plan.tracks.length
          ? plan.tracks.map((t, i) => <Sequence key={'tr' + i} from={Math.max(0, Math.round(t.start * fps))}><Audio src={t.url} /></Sequence>)
          : audioUrl ? <Audio src={audioUrl} /> : null) : null}
        {voice ? <VoicePanel captions={prep.captions} /> : <CleanSpeaker videoUrl={videoUrl} cutoutUrl={cutoutUrl} segs={prep.tl.segs} captions={prep.captions} zoom={zoom} src={plan.src} />}
        {showHandle ? <div style={{ position: 'absolute', left: 0, right: 0, top: (voice ? 690 + 400 : CARD.y + cardGeom(plan.src).h) + 28, textAlign: 'center', fontFamily: SANS, fontWeight: 600, fontSize: 24, color: '#9A9AA2', letterSpacing: 0.3 }}>{handle}</div> : null}
        {plan.sfx === false ? null : <SfxLayer plan={{ ...(plan as any), captions: prep.captions }} cfg={{ phrase: 'tick', emphasis: 'pop', vol: 0.2 }} />}
        {plan.music === null ? null : <MusicLayer track={plan.music?.track ?? 'warm'} volume={plan.music?.volume ?? (voice ? 0.14 : 0.1)} totalFrames={prep.tl.totalFrames} />}
        {prep.scenes.map((s, i) => {
          if (!GLASS_TYPES.includes(s.scene_type)) return null;
          const from = Math.round(s.start * fps);
          const to = i === prep.scenes.length - 1 ? prep.tl.totalFrames : Math.round(s.end * fps);
          return <Sequence key={'fg' + i} from={from} durationInFrames={Math.max(1, to - from)}><FullGraphic scene={s} dur={Math.max(1, to - from)} captions={prep.captions} from={from} /></Sequence>;
        })}
        <EmojiPops pops={(plan.pops ?? []).map((q) => ({ f: Math.round(prep.tl.mapT(q.t) * fps), emoji: q.emoji }))} />
        {plan.hook ? <HookIntro text={plan.hook} /> : null}
        <EndCard text={plan.cta ?? ''} brand={plan.brand?.logoText ?? ''} totalFrames={prep.tl.totalFrames} />
        {plan.sfx === false ? null : plan.hook ? <Sequence from={0} durationInFrames={50}><Audio src={staticFile('sfx/whoosh.wav')} volume={0.12} /></Sequence> : null}
        {plan.sfx === false || !plan.cta ? null : <Sequence from={Math.max(0, prep.tl.totalFrames - 72)} durationInFrames={60}><Audio src={staticFile('sfx/ding.wav')} volume={0.12} /></Sequence>}
      </AbsoluteFill>
    </ThemeCtx.Provider>
  );
};
