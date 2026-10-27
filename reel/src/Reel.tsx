import React from 'react';
import { AbsoluteFill, Audio, Img, OffthreadVideo, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { buildTimeline } from './timeline';
import { SceneBody } from './scenes';
import { C, FONT, lerp } from './ui';

export type ReelProps = { plan: any; videoFile: string; cutoutFile: string; hasSfx?: boolean };

const CARD_X = 30;
const CARD_W = 660;
const TRANS = 9;

const layoutFor = (type: string) => (type === 'speaker_only' ? { top: 150, h: 990 } : { top: 610, h: 530 });

const Caption: React.FC<{ text: string; dur: number }> = ({ text, dur }) => {
  const frame = useCurrentFrame();
  const words = text.split(/\s+/).filter(Boolean);
  const total = words.join('').length || 1;
  let acc = 0;
  const times = words.map((w) => { const t = acc / total; acc += w.length; return t * dur * 0.9; });
  let active = 0;
  times.forEach((t, i) => { if (frame >= t) active = i; });
  const o = interpolate(frame, [0, 4], [0, 1], { extrapolateRight: 'clamp' });
  const y = interpolate(frame, [0, 6], [10, 0], { extrapolateRight: 'clamp' });
  return (
    <div style={{ opacity: o, transform: 'translateY(' + y + 'px)', fontFamily: FONT, fontWeight: 800, fontSize: 38, lineHeight: 1.1, color: C.white, textAlign: 'center', textShadow: '0 2px 10px rgba(0,0,0,0.55)', padding: '0 26px' }}>
      {words.map((w, i) => <span key={i} style={{ color: i === active ? C.accent : C.white }}>{w + (i < words.length - 1 ? ' ' : '')}</span>)}
    </div>
  );
};

export const Reel: React.FC<ReelProps> = ({ plan, videoFile, cutoutFile, hasSfx }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const tl = React.useMemo(() => buildTimeline(plan), [plan]);
  const brand = plan.brand || {};

  // scenes in output time, contiguous, covering the whole video
  const scenes = React.useMemo(() => {
    const list = (plan.scenes || []).map((s: any) => ({ ...s, s: tl.mapT(Number(s.start) || 0), e: tl.mapT(Number(s.end) || 0) }))
      .filter((s: any) => s.e - s.s > 0.25).sort((a: any, b: any) => a.s - b.s);
    if (!list.length) return [{ id: 0, scene_type: 'speaker_only', graphic: {}, animation: 'pop_in', transition_out: 'cut', s: 0, e: tl.total }];
    list[0].s = 0;
    for (let i = 0; i < list.length - 1; i++) list[i].e = list[i + 1].s;
    list[list.length - 1].e = tl.total;
    return list;
  }, [plan, tl]);

  const captions = React.useMemo(() => (plan.captions || [])
    .map((c: any) => ({ text: String(c.text || ''), s: tl.mapT(Number(c.start) || 0), e: tl.mapT(Number(c.end) || 0) }))
    .filter((c: any) => c.text && c.e - c.s > 0.12), [plan, tl]);

  const nowT = frame / fps;
  let idx = scenes.findIndex((s: any) => nowT >= s.s && nowT < s.e);
  if (idx < 0) idx = scenes.length - 1;
  const cur = scenes[idx];
  const prev = scenes[idx - 1];
  const k = interpolate(frame - Math.round(cur.s * fps), [0, 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const ease = k * k * (3 - 2 * k);
  const a = prev ? layoutFor(prev.scene_type) : layoutFor(cur.scene_type);
  const b = layoutFor(cur.scene_type);
  const cardTop = a.top + (b.top - a.top) * ease;
  const cardH = a.h + (b.h - a.h) * ease;
  const circle = Math.min(CARD_W * 0.8, cardH * 0.98);
  const useCut = !!cutoutFile;

  const vStyle: React.CSSProperties = { width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 24%' };

  return (
    <AbsoluteFill style={{ background: C.white, fontFamily: FONT, overflow: 'hidden' }}>
      <AbsoluteFill style={{ background: 'radial-gradient(circle at 88% 6%, rgba(255,214,0,0.38), transparent 46%), radial-gradient(circle at 8% 94%, rgba(255,214,0,0.28), transparent 42%)' }} />

      {/* graphics zone */}
      <div style={{ position: 'absolute', left: CARD_X, top: 60, width: CARD_W, height: 500 }}>
        {scenes.map((s: any, i: number) => {
          const from = Math.round(s.s * fps);
          const end = Math.round(s.e * fps);
          const tail = i < scenes.length - 1 && s.transition_out !== 'cut' ? TRANS : 0;
          const head = i > 0 && scenes[i - 1].transition_out !== 'cut' ? TRANS : 0;
          const f = frame - from;
          const total = end - from;
          const r0 = 0, r1 = Math.max(1, head), r2 = Math.max(r1 + 1, total - tail), r3 = Math.max(r2 + 1, total); // strictly increasing input range
          const op = interpolate(f, [r0, r1, r2, r3], [head ? 0 : 1, 1, 1, tail ? 0 : 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          const blur = interpolate(f, [r0, r1, r2, r3], [head ? 10 : 0, 0, 0, tail ? 10 : 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          const zoom = s.transition_out === 'zoom' && tail > 0 ? interpolate(f, [r2, r3], [1, 1.08], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 1;
          return (
            <Sequence key={i} from={from} durationInFrames={Math.max(1, end - from + tail)} layout="none">
              {frame >= from && frame < end + tail ? (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: op, filter: blur > 0.2 ? 'blur(' + blur + 'px)' : 'none', transform: 'scale(' + zoom + ')' }}>
                  <SceneBody type={s.scene_type} g={s.graphic || {}} anim={s.animation || 'pop_in'} frame={Math.max(0, f)} fps={fps} dur={Math.max(1, total)} />
                </div>
              ) : null}
            </Sequence>
          );
        })}
      </div>

      {/* speaker card */}
      <div style={{ position: 'absolute', left: CARD_X, top: cardTop, width: CARD_W, height: cardH, borderRadius: 34, background: C.card, overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.06)' }}>
        <div style={{ position: 'absolute', left: (CARD_W - circle) / 2, bottom: 0, width: circle, height: circle, borderRadius: '50%', background: C.accent }} />
        {useCut ? (
          <AbsoluteFill>
            {tl.keep.map((seg, i) => (
              <Sequence key={i} from={Math.round(seg.out * fps)} durationInFrames={Math.max(1, Math.round((seg.end - seg.start) * fps))} layout="none">
                <AbsoluteFill><OffthreadVideo src={staticFile(cutoutFile)} startFrom={Math.round(seg.start * fps)} muted transparent style={vStyle} /></AbsoluteFill>
              </Sequence>
            ))}
          </AbsoluteFill>
        ) : (
          <div style={{ position: 'absolute', left: (CARD_W - circle * 0.94) / 2, bottom: circle * 0.03, width: circle * 0.94, height: circle * 0.94, borderRadius: '50%', overflow: 'hidden', border: '6px solid ' + C.white, boxShadow: '0 8px 24px rgba(0,0,0,0.18)' }}>
            {tl.keep.map((seg, i) => (
              <Sequence key={i} from={Math.round(seg.out * fps)} durationInFrames={Math.max(1, Math.round((seg.end - seg.start) * fps))} layout="none">
                <AbsoluteFill><OffthreadVideo src={staticFile(videoFile)} startFrom={Math.round(seg.start * fps)} muted style={vStyle} /></AbsoluteFill>
              </Sequence>
            ))}
          </div>
        )}
        {/* caption strip */}
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 170, background: 'linear-gradient(to top, rgba(0,0,0,0.92), rgba(0,0,0,0.55) 55%, rgba(0,0,0,0))', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 30 }}>
          {captions.map((c: any, i: number) => {
            const from = Math.round(c.s * fps);
            const d = Math.max(2, Math.round(c.e * fps) - from);
            return (
              <Sequence key={i} from={from} durationInFrames={d} layout="none">
                <div style={{ position: 'absolute', left: 0, right: 0, bottom: 30 }}><Caption text={c.text} dur={d} /></div>
              </Sequence>
            );
          })}
        </div>
      </div>

      {/* original audio, jump cuts applied */}
      {tl.keep.map((seg, i) => (
        <Sequence key={'a' + i} from={Math.round(seg.out * fps)} durationInFrames={Math.max(1, Math.round((seg.end - seg.start) * fps))} layout="none">
          <Audio src={staticFile(videoFile)} startFrom={Math.round(seg.start * fps)} />
        </Sequence>
      ))}

      {/* sound effects */}
      {hasSfx ? scenes.map((s: any, i: number) => (i === 0 || s.scene_type === 'speaker_only' ? null : (
        <Sequence key={'s' + i} from={Math.round(s.s * fps)} durationInFrames={Math.round(0.5 * fps)} layout="none">
          <Audio src={staticFile(s.transition_out === 'blur_fade' || s.transition_out === 'zoom' ? 'whoosh.wav' : 'pop.wav')} volume={0.28} />
        </Sequence>
      ))) : null}

      {/* logo */}
      {brand.logoUrl ? (
        <Img src={brand.logoUrl} style={{ position: 'absolute', right: 36, bottom: 56, height: 46, opacity: 0.75 }} />
      ) : brand.logoText ? (
        <div style={{ position: 'absolute', right: 40, bottom: 60, fontFamily: FONT, fontWeight: 800, fontSize: 24, color: '#B5B5B5', letterSpacing: 0.4 }}>{brand.logoText}</div>
      ) : null}
    </AbsoluteFill>
  );
};
