export type Cue = { f: number; sfx: string; vol: number };

/** Sound moments of each glass graphic. The frame numbers match the animation timings in glass.tsx. */
export const cuesFor = (type: string, items: string[] = []): Cue[] => {
  const n = Math.min(items.length || 3, 4);
  switch (type) {
    case 'glass_stat': return [{ f: 6, sfx: 'count', vol: 0.2 }, { f: 46, sfx: 'ding', vol: 0.26 }];
    case 'glass_chart': return [...Array.from({ length: 6 }, (_, i) => ({ f: 8 + i * 5, sfx: 'tick', vol: 0.16 })), { f: 44, sfx: 'ding', vol: 0.24 }];
    case 'glass_list': return Array.from({ length: n }, (_, i) => ({ f: 8 + i * 9, sfx: 'glass', vol: 0.2 }));
    case 'glass_steps': return Array.from({ length: n }, (_, i) => ({ f: 8 + i * 12, sfx: 'glass', vol: 0.2 }));
    case 'glass_tags': return Array.from({ length: Math.min(items.length || 4, 6) }, (_, i) => ({ f: 6 + i * 6, sfx: 'pop', vol: 0.2 }));
    case 'glass_orbs': return [{ f: 0, sfx: 'swell', vol: 0.2 }];
    case 'glass_quote': return [{ f: 12, sfx: 'glass', vol: 0.22 }];
    case 'glass_compare': return [{ f: 6, sfx: 'pop', vol: 0.2 }, { f: 14, sfx: 'pop', vol: 0.2 }, { f: 24, sfx: 'hit', vol: 0.2 }];
    case 'glass_icon': return [{ f: 8, sfx: 'pop', vol: 0.22 }, { f: 16, sfx: 'glass', vol: 0.18 }];
    case 'photo_3d': return [{ f: 0, sfx: 'whoosh', vol: 0.16 }];
    default: return [];
  }
};
