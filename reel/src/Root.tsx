import React from 'react';
import { Composition } from 'remotion';
import { Reel, type ReelProps } from './Reel';
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
    defaultProps={{ plan: { video: { width: 720, height: 1280, fps: 30 }, style: {}, cuts: [], scenes: [], captions: [] }, videoUrl: '', cutoutUrl: '' } as unknown as Record<string, unknown>}
    calculateMetadata={({ props }) => {
      const p = (props as unknown as ReelProps).plan;
      const lastEnd = Math.max(0, ...p.scenes.map((s) => Number(s.end) || 0), ...p.captions.map((c) => Number(c.end) || 0));
      const plan = { ...p, duration: Number(p.duration) || lastEnd || 1 };
      const tl = buildTimeline(plan, FPS);
      return { durationInFrames: Math.max(30, tl.totalFrames) };
    }}
  />
);
