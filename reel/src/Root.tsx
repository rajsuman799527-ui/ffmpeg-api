import React from 'react';
import { Composition } from 'remotion';
import { Reel } from './Reel';
import type { ReelProps } from './common';

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
      const p = (props as unknown as ReelProps).plan;
      const last = Math.max(1, ...p.captions.map((c) => c.end), ...p.scenes.map((s: any) => s.end));
      return { durationInFrames: Math.ceil((last + (p.mode === 'voice' ? 1.2 : 0)) * FPS) };
    }}
  />
);
