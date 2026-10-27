import React from 'react';
import { AbsoluteFill, OffthreadVideo, Audio, Sequence, useVideoConfig } from 'remotion';
import { MusicLayer, ReelProps, SfxLayer, SfxCfg, TplProps } from './common';
import { Studio } from './templates/Studio';
import { TEMPLATES } from './templates/registry';

/** "studio" (default) is the talking-head layout with real jump cuts. Every other template is caption-driven and plays over the full video (or alone, in voice mode). */
export const Reel: React.FC<ReelProps> = ({ plan, videoUrl, audioUrl }) => {
  const { durationInFrames, fps } = useVideoConfig();
  const tracks: { url: string; start: number }[] = (plan as any).tracks ?? [];
  const def = plan.template ? TEMPLATES[plan.template] : undefined;
  const voice = plan.mode === 'voice' || !videoUrl;

  if (!def) {
    return <Studio plan={plan as any} videoUrl={videoUrl || ''} />;
  }
  const C = def.component as React.FC<TplProps>;
  const sfx: SfxCfg = def.sfx;
  const music = plan.music === null ? undefined : (plan.music?.track ?? def.music);
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      {!voice && videoUrl ? (
        <AbsoluteFill>
          <OffthreadVideo src={videoUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </AbsoluteFill>
      ) : null}
      <C plan={plan} overVideo={!voice} />
      {voice && tracks.length
        ? tracks.map((t, i) => <Sequence key={i} from={Math.max(0, Math.round(t.start * fps))}><Audio src={t.url} /></Sequence>)
        : voice && audioUrl ? <Audio src={audioUrl} /> : null}
      <SfxLayer plan={plan} cfg={sfx} />
      <MusicLayer track={music} volume={plan.music?.volume ?? (voice ? 0.14 : 0.1)} totalFrames={durationInFrames} />
    </AbsoluteFill>
  );
};
