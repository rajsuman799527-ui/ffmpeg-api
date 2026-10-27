import React from 'react';
import { Composition } from 'remotion';
import { Reel, ReelProps } from './Reel';
import { buildTimeline } from './timeline';

const samplePlan = { video: { width: 720, height: 1280, fps: 30 }, duration: 5, brand: {}, cuts: [], scenes: [], captions: [] };

export const Root: React.FC = () => (
  <Composition
    id="Reel"
    component={Reel as any}
    width={720}
    height={1280}
    fps={30}
    durationInFrames={150}
    defaultProps={{ plan: samplePlan, videoFile: 'source.mp4', cutoutFile: '', hasSfx: false } as ReelProps}
    calculateMetadata={({ props }: any) => {
      const tl = buildTimeline(props.plan);
      return { durationInFrames: Math.max(30, Math.round(tl.total * 30)), fps: 30, width: 720, height: 1280 };
    }}
  />
);
