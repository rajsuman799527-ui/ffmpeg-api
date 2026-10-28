import React from 'react';
import type { ReelProps } from './common';
import { Studio } from './templates/Studio';
import { Clean } from './templates/Clean';

/** One engine for everything: talking-head video (with optional background removal) or a voice-only reel. */
export const Reel: React.FC<ReelProps> = ({ plan, videoUrl, audioUrl, cutoutUrl }) => {
  const style = ((plan as any).style ?? {}) as Record<string, string>;
  const tpl = String(style.template || (plan as any).template || 'clean');
  const P = { plan: plan as any, videoUrl: videoUrl || '', audioUrl: audioUrl || undefined, cutoutUrl: cutoutUrl || undefined };
  return tpl === 'studio' ? <Studio {...P} /> : <Clean {...P} />;
};
