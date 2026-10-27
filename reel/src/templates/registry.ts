import type React from 'react';
import type { SfxCfg } from '../common';
import { Crimson } from './Crimson';

export type TemplateDef = { id: string; component: React.FC<any>; music: string; sfx: SfxCfg };
export const TEMPLATES: Record<string, TemplateDef> = {
  crimson: { id: 'crimson', component: Crimson, music: 'cinema', sfx: { phrase: 'swish', emphasis: 'ding', gap: 'whoosh', vol: 0.5 } },
};
