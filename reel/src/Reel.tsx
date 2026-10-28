import React from 'react';
import type { ReelProps } from './common';
import { Studio } from './templates/Studio';

/** One engine for everything: talking-head video (with optional background removal) or a voice-only reel. */
export const Reel: React.FC<ReelProps> = ({ plan, videoUrl, audioUrl, cutoutUrl }) => (
  <Studio plan={plan as any} videoUrl={videoUrl || ''} audioUrl={audioUrl || undefined} cutoutUrl={cutoutUrl || undefined} />
);
