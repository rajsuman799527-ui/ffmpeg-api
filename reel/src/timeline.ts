// Jump cuts: removes pauses from the source video and re-times scenes and captions to the cut video.
export type Cut = { start: number; end: number };
export type Seg = { start: number; end: number; outFrame: number; frames: number };

export function buildTimeline(plan: any, fps: number) {
  const duration = Math.max(0.1, Number(plan.duration) || 1);
  const raw: Cut[] = (plan.cuts || [])
    .map((c: any) => ({ start: Math.max(0, Number(c.start) || 0), end: Math.min(duration, Number(c.end) || 0) }))
    .filter((c: Cut) => c.end - c.start > 0.05)
    .sort((a: Cut, b: Cut) => a.start - b.start);
  const cuts: Cut[] = [];
  for (const c of raw) {
    const last = cuts[cuts.length - 1];
    if (last && c.start <= last.end) last.end = Math.max(last.end, c.end);
    else cuts.push({ ...c });
  }
  const spans: Cut[] = [];
  let cursor = 0;
  for (const c of cuts) {
    if (c.start - cursor > 0.08) spans.push({ start: cursor, end: c.start });
    cursor = Math.max(cursor, c.end);
  }
  if (duration - cursor > 0.08) spans.push({ start: cursor, end: duration });
  if (!spans.length) spans.push({ start: 0, end: duration });

  const segs: Seg[] = [];
  let cum = 0;
  for (const s of spans) {
    const frames = Math.max(1, Math.round((s.end - s.start) * fps));
    segs.push({ start: s.start, end: s.end, outFrame: cum, frames });
    cum += frames;
  }
  const mapT = (t: number) => {
    for (const s of segs) {
      if (t <= s.end) return t >= s.start ? (s.outFrame + (t - s.start) * fps) / fps : s.outFrame / fps;
    }
    return cum / fps;
  };
  return { segs, totalFrames: cum, total: cum / fps, mapT };
}

export type PScene = { id: string; start: number; end: number; scene_type: string; graphic?: any; animation?: string; transition_out?: string };
export type PWord = { t: string; s: number; e: number };
export type PCaption = { text: string; start: number; end: number; words?: PWord[]; emphasis?: number; number?: number; visual?: string };

export function prepare(plan: any, fps: number) {
  const tl = buildTimeline(plan, fps);
  let scenes: PScene[] = (plan.scenes || [])
    .map((s: any) => ({ ...s, start: tl.mapT(Number(s.start) || 0), end: tl.mapT(Number(s.end) || 0) }))
    .filter((s: PScene) => s.end - s.start > 0.12)
    .sort((a: PScene, b: PScene) => a.start - b.start);
  if (!scenes.length) scenes = [{ id: '1', start: 0, end: tl.total, scene_type: 'speaker_only', graphic: {} }];
  scenes = scenes.map((s, i) => ({ ...s, start: i === 0 ? 0 : scenes[i - 1].end }));
  scenes[scenes.length - 1].end = Math.max(tl.total, scenes[scenes.length - 1].start + 0.1);
  scenes = scenes.map((s) => ({ ...s, end: Math.max(s.end, s.start + 0.1) }));
  const captions: PCaption[] = (plan.captions || [])
    .map((c: any) => ({
      text: String(c.text || ''), start: tl.mapT(Number(c.start) || 0), end: tl.mapT(Number(c.end) || 0),
      words: Array.isArray(c.words) && c.words.length ? c.words.map((w: any) => ({ t: String(w.t), s: tl.mapT(Number(w.s) || 0), e: tl.mapT(Number(w.e) || 0) })) : undefined,
      emphasis: typeof c.emphasis === 'number' ? c.emphasis : undefined,
      number: typeof c.number === 'number' ? c.number : undefined,
      visual: typeof c.visual === 'string' ? c.visual : undefined,
    }))
    .filter((c: PCaption) => c.text && c.end - c.start > 0.05)
    .sort((a: PCaption, b: PCaption) => a.start - b.start);
  return { tl, scenes, captions };
}
