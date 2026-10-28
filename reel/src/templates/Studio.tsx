import React, { useMemo } from 'react';
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { ThemeCtx, getTheme } from '../theme';
import { FONT } from '../ui';
import { SceneBody, zoneFor } from '../scenes';
import { Background, Brand, CapGraphics, Captions, Speaker, VoiceOrb, type CapStyle, type FrameKind } from '../chrome';
import { prepare, type PScene, type PCaption } from '../timeline';
import { MusicLayer, SfxLayer } from '../common';

type StudioPlan = {
  video: { width: number; height: number; fps: number };
  duration?: number;
  mode?: 'video' | 'voice';
  sfx?: boolean;
  brand?: { logoText?: string };
  style?: { theme?: string; accent?: string; frame?: string; captions?: string; currency?: string };
  music?: { track?: string; volume?: number } | null;
  cuts: { start: number; end: number; reason?: string }[];
  scenes: PScene[];
  captions: PCaption[];
};
export type StudioProps = { plan: StudioPlan; videoUrl: string; audioUrl?: string; cutoutUrl?: string };

const EDGE = 8;
const CAP_STYLES = ['strip', 'pop', 'bold', 'highlight', 'clean'];

/** One scene: soft entrance and a clean exit. No scene ever jumps. */
const SceneShell: React.FC<{ scene: PScene; dur: number }> = ({ scene, dur }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const out = scene.transition_out || 'blur_fade';
  const zone = zoneFor(scene.scene_type);
  const inP = interpolate(frame, [0, 6], [0, 1], { extrapolateRight: 'clamp' });
  const left = dur - frame;
  const outP = out === 'cut' ? 1 : interpolate(left, [0, EDGE], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const opacity = out === 'cut' ? 1 : inP * outP;
  const blur = out === 'blur_fade' ? (1 - outP) * 9 + (1 - inP) * 7 : 0;
  const scale = out === 'zoom' ? 1 + (1 - outP) * 0.07 : 1;
  return (
    <div style={{ position: 'absolute', left: 40, right: 40, top: zone.top, height: zone.h, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity, transform: `scale(${scale})`, filter: blur > 0.4 ? `blur(${blur}px)` : 'none' }}>
      <SceneBody type={scene.scene_type} g={scene.graphic ?? {}} anim={scene.animation || 'pop_in'} frame={frame} fps={fps} dur={dur} />
    </div>
  );
};

export const Studio: React.FC<StudioProps> = ({ plan, videoUrl, audioUrl, cutoutUrl }) => {
  const { fps } = useVideoConfig();
  const voice = plan.mode === 'voice' || !videoUrl;
  const prep = useMemo(() => prepare(voice ? { ...plan, cuts: [], duration: plan.duration || Math.max(1, ...plan.captions.map((c) => c.end), ...plan.scenes.map((s) => s.end)) } : plan, fps), [plan, fps, voice]);
  const theme = useMemo(() => getTheme(plan.style?.theme, plan.style?.accent), [plan]);
  const kind = (['circle', 'squircle', 'card'].includes(String(plan.style?.frame)) ? plan.style?.frame : 'circle') as FrameKind;
  const capStyle = (CAP_STYLES.includes(String(plan.style?.captions)) ? plan.style?.captions : 'strip') as CapStyle;
  return (
    <ThemeCtx.Provider value={theme}>
      <AbsoluteFill style={{ fontFamily: FONT, background: theme.bg }}>
        <Background />
        {prep.scenes.map((s, i) => {
          const from = Math.round(s.start * fps);
          const to = i === prep.scenes.length - 1 ? prep.tl.totalFrames : Math.round(s.end * fps);
          const dur = Math.max(1, to - from);
          return (
            <Sequence key={`${s.id}-${i}`} from={from} durationInFrames={dur}>
              <SceneShell scene={s} dur={dur} />
            </Sequence>
          );
        })}
        {plan.sfx === false ? null : prep.scenes.slice(1).map((s, i) => (
          <Sequence key={`sw${i}`} from={Math.max(0, Math.round(s.start * fps) - 3)} durationInFrames={30}><Audio src={staticFile('sfx/swish.wav')} volume={0.22} /></Sequence>
        ))}
        {voice ? (
          <>
            <VoiceOrb scenes={prep.scenes} />
            {audioUrl ? <Audio src={audioUrl} /> : null}
          </>
        ) : (
          <Speaker videoUrl={videoUrl} cutoutUrl={cutoutUrl} segs={prep.tl.segs} scenes={prep.scenes} kind={kind} />
        )}
        <CapGraphics captions={prep.captions} currency={plan.style?.currency ?? ''} />
        <Captions captions={prep.captions} style={capStyle} />
        {plan.sfx === false ? null : <SfxLayer plan={{ ...(plan as any), captions: prep.captions }} cfg={{ phrase: 'tick', emphasis: 'pop', vol: 0.24 }} />}
        {plan.music === null ? null : <MusicLayer track={plan.music?.track ?? 'warm'} volume={plan.music?.volume ?? (voice ? 0.14 : 0.1)} totalFrames={prep.tl.totalFrames} />}
        <Brand text={plan.brand?.logoText ?? ''} totalFrames={prep.tl.totalFrames} />
      </AbsoluteFill>
    </ThemeCtx.Provider>
  );
};
