import React, { useMemo } from 'react';
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { ThemeCtx, getTheme } from '../theme';
import { FONT } from '../ui';
import { SceneBody, zoneFor } from '../scenes';
import { Background, Brand, Captions, Speaker, type CapStyle, type FrameKind } from '../chrome';
import { prepare, type PScene } from '../timeline';
import { MusicLayer, SfxLayer } from '../common';

type StudioPlan = {
  video: { width: number; height: number; fps: number };
  duration?: number;
  brand?: { logoText?: string };
  style?: { theme?: string; accent?: string; frame?: string; captions?: string };
  music?: { track?: string; volume?: number } | null;
  cuts: { start: number; end: number; reason?: string }[];
  scenes: PScene[];
  captions: { text: string; start: number; end: number }[];
};
export type StudioProps = { plan: StudioPlan; videoUrl: string };

const EDGE = 8;

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

export const Studio: React.FC<StudioProps> = ({ plan, videoUrl }) => {
  const { fps } = useVideoConfig();
  const prep = useMemo(() => prepare(plan, fps), [plan, fps]);
  const theme = useMemo(() => getTheme(plan.style?.theme, plan.style?.accent), [plan]);
  const kind = (['circle', 'squircle', 'card'].includes(String(plan.style?.frame)) ? plan.style?.frame : 'circle') as FrameKind;
  const capStyle = (plan.style?.captions === 'pop' ? 'pop' : 'strip') as CapStyle;
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
        <Speaker videoUrl={videoUrl} segs={prep.tl.segs} scenes={prep.scenes} kind={kind} />
        <Captions captions={prep.captions} style={capStyle} />
        <SfxLayer plan={{ ...(plan as any), captions: prep.captions }} cfg={{ phrase: 'tick', vol: 0.28 }} />
        {plan.music === null ? null : <MusicLayer track={plan.music?.track ?? 'warm'} volume={plan.music?.volume ?? 0.1} totalFrames={prep.tl.totalFrames} />}
        <Brand text={plan.brand?.logoText ?? ''} totalFrames={prep.tl.totalFrames} />
      </AbsoluteFill>
    </ThemeCtx.Provider>
  );
};
