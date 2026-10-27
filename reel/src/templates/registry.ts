import type React from 'react';
import type { SfxCfg } from '../common';
import { Crimson } from './Crimson';
import { Noir } from './Noir';
import { Neon } from './Neon';

export type TemplateDef = { id: string; component: React.FC<any>; music: string; sfx: SfxCfg };
export const TEMPLATES: Record<string, TemplateDef> = {
  crimson: { id: 'crimson', component: Crimson, music: 'cinema', sfx: { phrase: 'swish', emphasis: 'ding', gap: 'whoosh', vol: 0.5 } },
  noir: { id: 'noir', component: Noir, music: 'cinema', sfx: { phrase: 'swish', emphasis: 'hit', gap: 'whoosh', vol: 0.5 } },
  neon: { id: 'neon', component: Neon, music: 'neon', sfx: { phrase: 'tick', emphasis: 'ding', gap: 'whoosh', vol: 0.45 } },
};
