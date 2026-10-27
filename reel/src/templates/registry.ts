import type React from 'react';
import type { SfxCfg } from '../common';
import { Crimson } from './Crimson';
import { Noir } from './Noir';
import { Neon } from './Neon';
import { Mono } from './Mono';
import { Lime } from './Lime';
import { Finance } from './Finance';
import { Hud } from './Hud';
import { Money } from './Money';

export type TemplateDef = { id: string; component: React.FC<any>; music: string; sfx: SfxCfg };
export const TEMPLATES: Record<string, TemplateDef> = {
  crimson: { id: 'crimson', component: Crimson, music: 'cinema', sfx: { phrase: 'swish', emphasis: 'ding', gap: 'whoosh', vol: 0.5 } },
  noir: { id: 'noir', component: Noir, music: 'cinema', sfx: { phrase: 'swish', emphasis: 'hit', gap: 'whoosh', vol: 0.5 } },
  neon: { id: 'neon', component: Neon, music: 'neon', sfx: { phrase: 'tick', emphasis: 'ding', gap: 'whoosh', vol: 0.45 } },
  mono: { id: 'mono', component: Mono, music: 'warm', sfx: { phrase: 'pop', emphasis: 'hit', gap: 'swish', vol: 0.5 } },
  lime: { id: 'lime', component: Lime, music: 'warm', sfx: { phrase: 'pop', emphasis: 'ding', gap: 'swish', vol: 0.5 } },
  finance: { id: 'finance', component: Finance, music: 'neon', sfx: { phrase: 'tick', emphasis: 'ding', gap: 'whoosh', vol: 0.45 } },
  hud: { id: 'hud', component: Hud, music: 'cinema', sfx: { phrase: 'swish', emphasis: 'hit', gap: 'whoosh', vol: 0.5 } },
  money: { id: 'money', component: Money, music: 'cinema', sfx: { phrase: 'tick', emphasis: 'hit', gap: 'whoosh', vol: 0.5 } },
};
