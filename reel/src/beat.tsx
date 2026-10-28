import React, { createContext, useContext } from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { useTheme } from './theme';

/** Tempo of every synthesized track (music.mjs and gen-audio.mjs). */
export const TRACK_BPM: Record<string, number> = {
  lofi: 80, epic: 90, trap: 140, uplift: 118, synthwave: 100, groove: 124,
  warm: 96, cinema: 72, neon: 108, pulse: 112,
};

export const BeatCtx = createContext<{ bpm: number; offset: number }>({ bpm: 0, offset: 0 });

/** Scenes live inside a Sequence, so their frame counter restarts. This gives them the real frame. */
export const BeatScope: React.FC<{ offset: number; children: React.ReactNode }> = ({ offset, children }) => {
  const c = useContext(BeatCtx);
  return <BeatCtx.Provider value={{ bpm: c.bpm, offset }}>{children}</BeatCtx.Provider>;
};

/** pulse is 1 on the beat and falls to 0 before the next one. */
export const useBeat = () => {
  const { bpm, offset } = useContext(BeatCtx);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (!bpm) return { pulse: 0, phase: 0, bpm: 0 };
  const phase = (((frame + offset) / fps) * (bpm / 60)) % 1;
  return { pulse: Math.exp(-phase * 6), phase, bpm };
};

/** Moves an effect onto the nearest beat if one is within about 90 ms, so sounds land in rhythm with the music. */
export const snapFrame = (f: number, bpm: number, fps: number) => {
  if (!bpm) return f;
  const beat = (60 / bpm) * fps;
  const near = Math.round(f / beat) * beat;
  return Math.abs(near - f) <= 0.09 * fps ? Math.max(0, Math.round(near)) : f;
};

/** A soft accent glow behind everything that breathes with the music. */
export const BeatGlow: React.FC = () => {
  const T = useTheme();
  const { pulse, bpm } = useBeat();
  if (!bpm) return null;
  return <div style={{ position: 'absolute', left: 0, right: 0, bottom: -120, height: 820, background: `radial-gradient(ellipse at 50% 70%, ${T.accent} 0%, rgba(0,0,0,0) 65%)`, opacity: 0.07 + 0.13 * pulse, pointerEvents: 'none' }} />;
};
