import { createContext, useContext } from 'react';

export type Theme = {
  name: string; dark: boolean;
  bg: string; glow: string; glow2: string;
  ink: string; sub: string; card: string; line: string;
  accent: string; onAccent: string; pillBg: string; pillFg: string; shadow: string;
  good: string; bad: string;
};

export const THEMES: Record<string, Theme> = {
  sunny: {
    name: 'sunny', dark: false, bg: '#FFFFFF', glow: 'rgba(255,214,0,0.42)', glow2: 'rgba(255,160,0,0.16)',
    ink: '#111111', sub: '#5C5C5C', card: '#FFFFFF', line: '#E6E6E6', accent: '#FFD600', onAccent: '#111111',
    pillBg: '#111111', pillFg: '#FFFFFF', shadow: '0 14px 34px rgba(0,0,0,0.10)', good: '#16A34A', bad: '#E5484D',
  },
  midnight: {
    name: 'midnight', dark: true, bg: '#0A0A0F', glow: 'rgba(255,214,0,0.20)', glow2: 'rgba(124,77,255,0.26)',
    ink: '#FFFFFF', sub: '#B7B7C6', card: '#171720', line: '#2B2B3A', accent: '#FFD600', onAccent: '#111111',
    pillBg: '#FFFFFF', pillFg: '#111111', shadow: '0 16px 40px rgba(0,0,0,0.45)', good: '#34D399', bad: '#FB7185',
  },
  aurora: {
    name: 'aurora', dark: true, bg: '#0E0924', glow: 'rgba(255,64,129,0.30)', glow2: 'rgba(56,189,248,0.28)',
    ink: '#FFFFFF', sub: '#CFC8F0', card: '#1A1336', line: '#372C66', accent: '#FF4D94', onAccent: '#FFFFFF',
    pillBg: '#FFFFFF', pillFg: '#1A1336', shadow: '0 16px 40px rgba(10,0,40,0.5)', good: '#34D399', bad: '#FB7185',
  },
  mint: {
    name: 'mint', dark: false, bg: '#F3FFF9', glow: 'rgba(0,200,150,0.30)', glow2: 'rgba(0,150,255,0.12)',
    ink: '#07281F', sub: '#3E6B5C', card: '#FFFFFF', line: '#CDEBDD', accent: '#00C896', onAccent: '#04281D',
    pillBg: '#0B3D2E', pillFg: '#FFFFFF', shadow: '0 14px 34px rgba(0,70,50,0.12)', good: '#059669', bad: '#E5484D',
  },
};

const lum = (hex: string) => {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
};

export function getTheme(name?: string, accent?: string): Theme {
  const base = THEMES[String(name || 'sunny')] || THEMES.sunny;
  if (accent && /^#[0-9a-fA-F]{6}$/.test(accent) && accent.toLowerCase() !== base.accent.toLowerCase()) {
    return { ...base, accent, onAccent: lum(accent) > 0.6 ? '#111111' : '#FFFFFF' };
  }
  return base;
}

export const ThemeCtx = createContext<Theme>(THEMES.sunny);
export const useTheme = () => useContext(ThemeCtx);
