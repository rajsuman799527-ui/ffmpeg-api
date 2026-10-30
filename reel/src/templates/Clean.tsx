import React, { useMemo } from 'react';
import { AbsoluteFill, Audio, Easing, Img, OffthreadVideo, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { ThemeCtx, getTheme, useTheme } from '../theme';
import { F } from '../fonts';
import { SceneBody } from '../scenes';
import { GLASS_TYPES } from '../glass';
import { Ambient, Burst, EmojiPops, EndCard, HookIntro, ReelProgress, Ripples, SceneWipe, Streaks, WaveBars } from '../overlays';
import { prepare, type PScene, type PCaption, type Seg } from '../timeline';
import { MusicLayer, SfxLayer } from '../common';
import { KText, WordCaption } from '../ktext';
import { emoji3dSrc } from '../emoji3d';

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

/* ---------- art fill: when a scene has no graphic of its own, a floating picture keeps the top of the screen alive ---------- */
const ArtFill: React.FC<{ src?: string; emoji?: string; dur: number }> = ({ src, emoji, dur }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame, fps, config: { damping: 14, stiffness: 110, mass: 0.9 } });
  const out = interpolate(dur - frame, [0, 6], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const fl = Math.sin(frame / 22) * 9;
  const tilt = Math.sin(frame / 40) * 4;
  const em = emoji ? emoji3dSrc(emoji) : '';
  const W = src ? 340 : 280;
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: BODY.top + 8, height: BODY.h - 20, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: clamp01(p * 1.4) * out }}>
      <div style={{ position: 'absolute', width: 380, height: 380, borderRadius: '50%', border: '2px solid ' + T.accent, opacity: 0.35, transform: 'scale(' + (0.9 + 0.1 * Math.sin(frame / 30)) + ')' }} />
      <div style={{ position: 'absolute', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, ' + T.accent + '55, rgba(255,255,255,0) 70%)' }} />
      {src ? (
        <div style={{ width: W, height: W * 1.1, borderRadius: 34, overflow: 'hidden', boxShadow: '0 30px 60px rgba(30,30,40,0.28), 0 0 0 6px rgba(255,255,255,0.8)', transform: 'translateY(' + (fl + (1 - p) * 40) + 'px) rotate(' + tilt + 'deg) scale(' + (0.85 + 0.15 * p + frame * 0.0006) + ')' }}>
          <Img src={src} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scale(' + (1.04 + frame * 0.0012) + ')' }} />
        </div>
      ) : em ? (
        <Img src={em} style={{ width: W, height: W, objectFit: 'contain', filter: 'drop-shadow(0 26px 30px rgba(0,0,0,0.25))', transform: 'translateY(' + (fl + (1 - p) * 40) + 'px) rotate(' + tilt * 2 + 'deg) scale(' + (0.7 + 0.3 * p) + ')' }} />
      ) : null}
    </div>
  );
};

const imagesOf = (s: PScene): string[] => {
  const g = (s.graphic || {}) as any;
  return [g.image, ...(Array.isArray(g.images) ? g.images : [])].filter((x) => typeof x === 'string' && x);
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
const VoicePanel: React.FC<{ captions: PCaption[]; glass: { from: number; to: number }[]; hook: boolean }> = ({ captions, glass, hook }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 18, stiffness: 110, mass: 0.9 } });
  const tt = frame / fps;
  const gap = Math.min(99, ...captions.map((c) => (tt < c.start ? c.start - tt : tt > c.end ? tt - c.end : 0)));
  let vis = clamp01(1 - gap / 0.4);
  for (const r of glass) { const d = frame < r.from ? r.from - frame : frame > r.to ? frame - r.to : -1; vis *= d < 0 ? 0 : clamp01(d / 8); }
  if (hook) vis *= clamp01((frame - 56) / 8);
  return (
    <div style={{ position: 'absolute', left: CARD.x, top: 690, width: CARD.w, height: 400, borderRadius: 30, background: 'linear-gradient(160deg, rgba(36,36,44,0.97), rgba(20,20,26,0.97))', boxShadow: '0 30px 64px rgba(20,20,30,0.30)', overflow: 'hidden', opacity: clamp01(enter * 1.6) * vis, transform: 'translateY(' + ((1 - enter) * 40 + (1 - vis) * 24) + 'px)' }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 6, background: T.accent }} />
      <CleanCaption captions={captions} card big />
      <WaveBars />
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
  const cw = Math.round(470 * zoom);
  const geo = cardGeom(src);
  return (
    <>
      {cutoutUrl ? segs.map((s, i) => (
        <Sequence key={'a' + i} from={s.outFrame} durationInFrames={s.frames}><Audio src={videoUrl} startFrom={Math.round(s.start * fps)} /></Sequence>
      )) : null}
      <div style={{ position: 'absolute', left: CARD.x, top: CARD.y - 36, width: CARD.w, height: geo.h, borderRadius: CARD.r, background: T.dark ? '#1B1B26' : '#F2F2F3', overflow: 'hidden', boxShadow: '0 28px 60px rgba(20,20,24,0.09), 0 2px 8px rgba(20,20,24,0.05)', opacity: clamp01(enter * 1.6), transform: 'translateY(' + ((1 - enter) * 40 + float) + 'px)' }}>
        {cutoutUrl ? (
          <>
            <div style={{ position: 'absolute', left: (CARD.w - CIRCLE) / 2 - 16, top: 14, width: CIRCLE + 32, height: CIRCLE + 32, borderRadius: '50%', border: '2px solid ' + T.accent, opacity: 0.5 * (1 - pulse), transform: 'scale(' + (1 + pulse * 0.08) + ')' }} />
            <div style={{ position: 'absolute', left: (CARD.w - CIRCLE) / 2, top: 30, width: CIRCLE, height: CIRCLE, borderRadius: '50%', background: T.accent }} />
            <div style={{ position: 'absolute', left: (CARD.w - cw) / 2, bottom: 0, width: cw, height: cw }}>
              {segs.map((s, i) => (
                <Sequence key={'v' + i} from={s.outFrame} durationInFrames={s.frames}>
                  <OffthreadVideo src={cutoutUrl} transparent muted startFrom={Math.round(s.start * fps)} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 40%' }} />
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
        </div>
        <div style={{ position: 'absolute', left: CARD.x, top: CARD.y - 36 + geo.h + 10, width: CARD.w, height: 124, borderRadius: 28, background: 'linear-gradient(160deg, rgba(36,36,44,0.97), rgba(20,20,26,0.97))', boxShadow: '0 24px 54px rgba(20,20,30,0.26)', overflow: 'hidden', opacity: clamp01(enter * 1.6), transform: 'translateY(' + ((1 - enter) * 40 + float) + 'px)' }}>
          <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 5, background: T.accent }} />
          <CleanCaption captions={captions} card />
        </div>
    </>
  );
};

/** Voice reels have no speaker, so the top of the screen shows the key word of what is being said, big and moving. */
const KeywordHero: React.FC<{ captions: PCaption[]; from: number; dur: number }> = ({ captions, from, dur }) => {
  const T = useTheme();
  const raw = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = (raw + from) / fps;
  const cap = captions.find((c) => t >= c.start && t < c.end + 0.1);
  if (!cap) return null;
  const words = cap.text.split(/\s+/).filter(Boolean);
  if (!words.length) return null;
  const ei = typeof cap.emphasis === 'number' && cap.emphasis >= 0 && cap.emphasis < words.length ? cap.emphasis : words.reduce((b, w, i) => (w.length > words[b].length ? i : b), 0);
  const word = words[ei].replace(/[.,!?;:]+$/g, '');
  const l = raw + from - Math.round(cap.start * fps);
  const p = spring({ frame: l, fps, config: { damping: 11, stiffness: 140, mass: 0.7 } });
  const lim = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
  const out = interpolate(t, [cap.end - 0.08, cap.end + 0.1], [1, 0], lim) * interpolate(dur - raw, [0, 8], [0, 1], lim);
  const size = word.length > 9 ? 108 : word.length > 6 ? 138 : 176;
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: 230, height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: clamp01(p * 1.5) * out, transform: 'translateY(' + Math.sin(raw / 20) * 8 + 'px) scale(' + (0.7 + 0.3 * p) + ') rotate(' + (1 - p) * -6 + 'deg)' }}>
      <div style={{ position: 'absolute', width: 420, height: 420, borderRadius: '50%', background: 'radial-gradient(circle, ' + T.accent + '44, rgba(255,255,255,0) 68%)' }} />
      <div style={{ position: 'relative', fontFamily: SANS, fontWeight: 900, fontSize: size, letterSpacing: '-0.03em', lineHeight: 1, backgroundImage: 'linear-gradient(120deg, ' + T.ink + ' 20%, ' + T.accent + ' 90%)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', WebkitTextFillColor: 'transparent', filter: 'drop-shadow(0 14px 26px ' + T.accent + '44)' }}>{word}</div>
    </div>
  );
};

/** A glass graphic takes the whole screen: the speaker card steps aside, the picture stays big and readable. */
const FullGraphic: React.FC<{ scene: PScene; dur: number; captions: PCaption[]; from: number; hold: number }> = ({ scene, dur, captions, from, hold }) => {
  const raw = useCurrentFrame();
  const { fps } = useVideoConfig();
  const T = useTheme();
  if (hold >= dur - 6) return null;
  const frame = Math.max(0, raw - hold);
  const inP = interpolate(frame, [0, 9], [0, 1], { extrapolateRight: 'clamp', easing: EASE });
  const outP = interpolate(dur - raw, [0, 8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const dock = spring({ frame: frame - 3, fps, config: { damping: 16, stiffness: 120, mass: 0.8 } });
  const g: any = { ...((scene.graphic || {}) as any) };
  return (
    <div style={{ position: 'absolute', inset: 0, background: T.bg, opacity: outP }}>
      <Ambient />
      <div style={{ position: 'absolute', left: 40, right: 40, top: 130, height: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: inP, transform: 'scale(' + (1.1 + 0.05 * (1 - inP) + frame * 0.0005) + ')' }}>
        <SceneBody type={scene.scene_type} g={g} anim={scene.animation || 'pop_in'} frame={frame} fps={fps} dur={dur} />
      </div>
      <div style={{ position: 'absolute', left: CARD.x, top: 850, width: CARD.w, height: 214, borderRadius: 30, background: 'linear-gradient(160deg, rgba(36,36,44,0.97), rgba(20,20,26,0.97))', boxShadow: '0 30px 64px rgba(20,20,30,0.30)', overflow: 'hidden', opacity: clamp01(dock * 1.6), transform: 'translateY(' + (1 - dock) * 40 + 'px)' }}>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 6, background: T.accent }} />
        <CleanCaption captions={captions} offset={from} card big />
        <WaveBars />
      </div>
    </div>
  );
};

export const Clean: React.FC<CleanProps> = ({ plan, videoUrl, audioUrl, cutoutUrl }) => {
  const { fps } = useVideoConfig();
  const voice = plan.mode === 'voice' || !videoUrl;
  const prep = useMemo(() => prepare(voice ? { ...plan, cuts: [], duration: plan.duration || Math.max(1, ...plan.captions.map((c) => c.end), ...plan.scenes.map((s) => s.end)) } : plan, fps), [plan, fps, voice]);
  const theme = useMemo(() => getTheme('sunny', plan.style?.accent), [plan]);
  const chapters = useMemo(() => chaptersOf(prep.scenes), [prep]);
  const pool = useMemo(() => prep.scenes.flatMap(imagesOf), [prep]);
  const zoom = Math.max(0.7, Math.min(1.5, Number(plan.style?.zoom) || 1));
  const handle = String(plan.brand?.logoText ?? '').trim();
  const showHandle = handle && handle.toLowerCase() !== 'studio';
  const frameNow = useCurrentFrame();
  const starts = prep.scenes.slice(1).map((s) => Math.round(s.start * fps));
  const lastStart = starts.filter((f) => f <= frameNow).pop();
  const pl = lastStart === undefined ? 99 : frameNow - lastStart;
  const punch = pl < 12 ? 0.04 * Math.pow(1 - pl / 12, 2) : 0;
  const bursts = prep.captions.filter((c) => typeof c.emphasis === 'number' && c.emphasis >= 0 && c.words && c.words[c.emphasis]).map((c) => Math.round((c.words as any)[c.emphasis as number].s * fps));
  return (
    <ThemeCtx.Provider value={theme}>
      <AbsoluteFill style={{ fontFamily: SANS, background: theme.bg, transform: 'scale(' + (1 + punch) + ')' }}>
        <Backdrop />
        <Streaks />
        <Ambient />
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
        {prep.scenes.map((s, i) => {
          const bodyless = s.scene_type === 'title_pill' || s.scene_type === 'lower_third' || (!voice && s.scene_type === 'speaker_only');
          if (!bodyless) return null;
          const from = Math.round(s.start * fps);
          const to = i === prep.scenes.length - 1 ? prep.tl.totalFrames : Math.round(s.end * fps);
          const mid = (s.start + s.end) / 2;
          const emoji = (plan.pops ?? []).reduce((best: any, q) => (!best || Math.abs(q.t - mid) < Math.abs(best.t - mid) ? q : best), null)?.emoji || '✨';
          const src = pool.length ? pool[i % pool.length] : undefined;
          return <Sequence key={'art' + i} from={from} durationInFrames={Math.max(1, to - from)}><ArtFill src={src} emoji={emoji} dur={Math.max(1, to - from)} /></Sequence>;
        })}
        {voice ? prep.scenes.map((s, i) => {
          if (s.scene_type !== 'speaker_only') return null;
          const from = Math.round(s.start * fps);
          const to = i === prep.scenes.length - 1 ? prep.tl.totalFrames : Math.round(s.end * fps);
          const dur = Math.max(1, to - from);
          return <Sequence key={'kh' + i} from={from} durationInFrames={dur}><KeywordHero captions={prep.captions} from={from} dur={dur} /></Sequence>;
        }) : null}
        {plan.sfx === false ? null : prep.scenes.slice(1).map((s, i) => (
          <Sequence key={'sw' + i} from={Math.max(0, Math.round(s.start * fps) - 3)} durationInFrames={30}><Audio src={staticFile('sfx/swish.wav')} volume={0.2} /></Sequence>
        ))}
        {voice ? (plan.tracks && plan.tracks.length
          ? plan.tracks.map((t, i) => <Sequence key={'tr' + i} from={Math.max(0, Math.round(t.start * fps))}><Audio src={t.url} /></Sequence>)
          : audioUrl ? <Audio src={audioUrl} /> : null) : null}
        {voice ? <VoicePanel captions={prep.captions} hook={!!plan.hook} glass={prep.scenes.filter((s) => GLASS_TYPES.includes(s.scene_type)).map((s, _i, _a) => ({ from: Math.round(s.start * fps) - 4, to: Math.round(s.end * fps) + 2 }))} /> : <CleanSpeaker videoUrl={videoUrl} cutoutUrl={cutoutUrl} segs={prep.tl.segs} captions={prep.captions} zoom={zoom} src={plan.src} />}
        {showHandle ? <div style={{ position: 'absolute', left: 0, right: 0, top: (voice ? 690 + 400 : CARD.y + cardGeom(plan.src).h) + (voice ? 28 : 112), textAlign: 'center', fontFamily: SANS, fontWeight: 600, fontSize: 24, color: '#9A9AA2', letterSpacing: 0.3 }}>{handle}</div> : null}
        {plan.sfx === false ? null : <SfxLayer plan={{ ...(plan as any), captions: prep.captions }} cfg={{ phrase: 'tick', emphasis: 'pop', vol: 0.2 }} />}
        {plan.music === null ? null : <MusicLayer track={plan.music?.track ?? 'warm'} volume={plan.music?.volume ?? (voice ? 0.14 : 0.1)} totalFrames={prep.tl.totalFrames} />}
        {prep.scenes.map((s, i) => {
          if (!GLASS_TYPES.includes(s.scene_type)) return null;
          const from = Math.round(s.start * fps);
          const to = i === prep.scenes.length - 1 ? prep.tl.totalFrames : Math.round(s.end * fps);
          return <Sequence key={'fg' + i} from={from} durationInFrames={Math.max(1, to - from)}><FullGraphic scene={s} dur={Math.max(1, to - from)} captions={prep.captions} from={from} hold={plan.hook ? Math.max(0, 58 - from) : 0} /></Sequence>;
        })}
        <Ripples starts={starts} />
        <Burst at={bursts} y={voice ? 890 : 930} />
        <SceneWipe starts={prep.scenes.slice(1).map((s) => Math.round(s.start * fps))} />
        <ReelProgress totalFrames={prep.tl.totalFrames} />
        <EmojiPops pops={(plan.pops ?? []).map((q) => ({ f: Math.round(prep.tl.mapT(q.t) * fps), emoji: q.emoji }))} />
        {plan.hook ? <HookIntro text={plan.hook} /> : null}
        <EndCard text={plan.cta ?? ''} brand={plan.brand?.logoText ?? ''} totalFrames={prep.tl.totalFrames} />
        {plan.sfx === false ? null : plan.hook ? <Sequence from={0} durationInFrames={50}><Audio src={staticFile('sfx/whoosh.wav')} volume={0.12} /></Sequence> : null}
        {plan.sfx === false || !plan.cta ? null : <Sequence from={Math.max(0, prep.tl.totalFrames - 72)} durationInFrames={60}><Audio src={staticFile('sfx/ding.wav')} volume={0.12} /></Sequence>}
      </AbsoluteFill>
    </ThemeCtx.Provider>
  );
};
