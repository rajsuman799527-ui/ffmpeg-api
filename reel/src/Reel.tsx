import React from 'react';
import { AbsoluteFill, OffthreadVideo, Audio, useVideoConfig } from 'remotion';
import { MusicLayer, ReelProps, SfxLayer, SfxCfg, TplProps } from './common';
import { YellowPop } from './templates/YellowPop';
import { TEMPLATES } from './templates/registry';

export const Reel: React.FC<ReelProps> = ({ plan, videoUrl, audioUrl }) => {
  const { durationInFrames } = useVideoConfig();
  const id = plan.template || 'yellow_pop';
  const voice = plan.mode === 'voice' || !videoUrl;
  const def = TEMPLATES[id];

  if (!def) {
    // original yellow talking-head layout
    return (
      <AbsoluteFill>
        {videoUrl ? <YellowPop plan={plan as any} videoUrl={videoUrl} /> : null}
        <SfxLayer plan={plan} cfg={{ phrase: 'tick', vol: 0.3 }} />
        <MusicLayer track={plan.music?.track ?? 'warm'} volume={plan.music?.volume ?? 0.1} totalFrames={durationInFrames} />
      </AbsoluteFill>
    );
  }
  const C = def.component as React.FC<TplProps>;
  const sfx: SfxCfg = def.sfx;
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      {!voice && videoUrl ? (
        <AbsoluteFill>
          <OffthreadVideo src={videoUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </AbsoluteFill>
      ) : null}
      <C plan={plan} overVideo={!voice} />
      {voice && audioUrl ? <Audio src={audioUrl} /> : null}
      <SfxLayer plan={plan} cfg={sfx} />
      <MusicLayer track={plan.music?.track ?? def.music} volume={plan.music?.volume ?? (voice ? 0.2 : 0.1)} totalFrames={durationInFrames} />
    </AbsoluteFill>
  );
};
