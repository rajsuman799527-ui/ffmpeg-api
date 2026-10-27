import React from 'react';
import { Audio, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';

export type W = { t: string; s: number; e: number };
export type Cap = { text: string; start: number; end: number; words?: W[]; emphasis?: number; number?: number; visual?: string };
export type Plan = {
  video: { width: number; height: number; fps: number };
  style: Record<string, string>;
  template?: string; mode?: 'video' | 'voice';
  music?: { track?: string; volume?: number } | null;
  cuts: { start: number; end: number; reason: string }[];
  scenes: any[];
  captions: Cap[];
};
export type ReelProps = { plan: Plan; videoUrl?: string; audioUrl?: string; cutoutUrl?: string };
export type TplProps = { plan: Plan; overVideo: boolean };

export const capWords = (c: Cap): W[] => {
  if (c.words && c.words.length) return c.words;
  const parts = c.text.split(/\s+/).filter(Boolean);
  const per = (c.end - c.start) / Math.max(1, parts.length);
  return parts.map((t, i) => ({ t, s: c.start + per * i, e: c.start + per * (i + 1) }));
};

/** Caption on screen now (held until the next one starts), with enter/exit progress. */
export const useCaps = (plan: Plan) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const caps = plan.captions;
  let idx = -1;
  for (let i = 0; i < caps.length; i++) if (t >= caps[i].start - 0.05) idx = i;
  const cap = idx >= 0 ? caps[idx] : undefined;
  const next = caps[idx + 1];
  const holdEnd = cap ? Math.min(cap.end + 0.6, next ? next.start - 0.02 : Infinity) : 0;
  const visible = !!cap && t < holdEnd + 0.05;
  const local = cap ? t - cap.start : 0;
  const exit = cap && visible ? interpolate(t, [holdEnd - 0.22, holdEnd], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 0;
  return { frame, fps, t, idx, cap: visible ? cap : undefined, next, local, exit, holdEnd };
};

export const wordSpring = (frame: number, fps: number, startSec: number, stiff = 170, damp = 14) =>
  spring({ frame: frame - Math.round(startSec * fps), fps, config: { damping: damp, stiffness: stiff, mass: 0.6 } });

export const hash = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

const NOISE = "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.9 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";
export const Grain: React.FC<{ opacity?: number }> = ({ opacity = 0.08 }) => {
  const frame = useCurrentFrame();
  const x = Math.floor(hash(frame) * 240), y = Math.floor(hash(frame + 99) * 240);
  return <div style={{ position: 'absolute', inset: -240, backgroundImage: NOISE, opacity, transform: `translate(${x}px,${y}px)`, mixBlendMode: 'overlay', pointerEvents: 'none' }} />;
};
export const Vignette: React.FC<{ strength?: number }> = ({ strength = 0.55 }) => (
  <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 45%, rgba(0,0,0,${strength}) 100%)`, pointerEvents: 'none' }} />
);
export const Blob: React.FC<{ x: number; y: number; size: number; color: string; blur?: number; opacity?: number }> = ({ x, y, size, color, blur = 60, opacity = 1 }) => (
  <div style={{ position: 'absolute', left: x - size / 2, top: y - size / 2, width: size, height: size, borderRadius: '50%', background: `radial-gradient(circle, ${color} 0%, rgba(0,0,0,0) 68%)`, filter: `blur(${blur}px)`, opacity }} />
);

export type SfxCfg = { phrase?: string; emphasis?: string; gap?: string; vol?: number };
export const SfxLayer: React.FC<{ plan: Plan; cfg: SfxCfg }> = ({ plan, cfg }) => {
  const { fps } = useVideoConfig();
  const vol = cfg.vol ?? 0.5;
  const out: React.ReactNode[] = [];
  plan.captions.forEach((c, i) => {
    const prevEnd = i ? plan.captions[i - 1].end : -9;
    const f = Math.max(0, Math.round(c.start * fps));
    if (cfg.gap && c.start - prevEnd > 0.55) out.push(<Sequence key={'g' + i} from={Math.max(0, f - 6)} durationInFrames={50}><Audio src={staticFile(`sfx/${cfg.gap}.wav`)} volume={vol} /></Sequence>);
    else if (cfg.phrase) out.push(<Sequence key={'p' + i} from={f} durationInFrames={50}><Audio src={staticFile(`sfx/${cfg.phrase}.wav`)} volume={vol * 0.8} /></Sequence>);
    if (cfg.emphasis && c.emphasis != null) {
      const w = capWords(c)[c.emphasis];
      if (w) out.push(<Sequence key={'e' + i} from={Math.max(0, Math.round(w.s * fps))} durationInFrames={90}><Audio src={staticFile(`sfx/${cfg.emphasis}.wav`)} volume={vol * 0.9} /></Sequence>);
    }
  });
  return <>{out}</>;
};
export const MusicLayer: React.FC<{ track?: string; volume: number; totalFrames: number }> = ({ track, volume, totalFrames }) => {
  const { fps } = useVideoConfig();
  if (!track) return null;
  return <Audio src={staticFile(`music/${track}.wav`)} loop volume={(f) => volume * interpolate(f, [0, fps * 1.2, totalFrames - fps * 1.6, totalFrames], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })} />;
};
