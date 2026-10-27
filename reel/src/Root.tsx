import React from 'react';
import { Composition } from 'remotion';
import { Reel } from './Reel';
import type { ReelProps } from './common';
import { TEMPLATES } from './templates/registry';
import { buildTimeline } from './timeline';

const FPS = 30;
export const Root: React.FC = () => (
  <Composition
    id="Reel"
    component={Reel as unknown as React.FC<Record<string, unknown>>}
    width={720}
    height={1280}
    fps={FPS}
    durationInFrames={FPS * 10}
    defaultProps={{ plan: { video: { width: 720, height: 1280, fps: 30 }, style: {}, cuts: [], scenes: [], captions: [] }, videoUrl: '', audioUrl: '', cutoutUrl: '' } as unknown as Record<string, unknown>}
    calculateMetadata={({ props }) => {
      const p = (props as unknown as ReelProps).plan as any;
      const last = Math.max(1, ...p.captions.map((c: any) => Number(c.end) || 0), ...p.scenes.map((s: any) => Number(s.end) || 0));
      const studio = !(p.template && TEMPLATES[p.template]);
      if (studio) {
        const tl = buildTimeline({ ...p, duration: Number(p.duration) || last }, FPS);
        return { durationInFrames: Math.max(30, tl.totalFrames) };
      }
      return { durationInFrames: Math.ceil((last + (p.mode === 'voice' ? 1.2 : 0)) * FPS) };
    }}
  />
);
