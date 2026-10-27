// Maps source-video time to output time after jump cuts (pauses / fillers) are removed.
export type Cut = { start: number; end: number };
export type Seg = { start: number; end: number; out: number };

export function buildTimeline(plan: any) {
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
  const keep: Seg[] = [];
  let cursor = 0;
  let out = 0;
  for (const c of cuts) {
    if (c.start - cursor > 0.08) { keep.push({ start: cursor, end: c.start, out }); out += c.start - cursor; }
    cursor = Math.max(cursor, c.end);
  }
  if (duration - cursor > 0.08) { keep.push({ start: cursor, end: duration, out }); out += duration - cursor; }
  if (!keep.length) { keep.push({ start: 0, end: duration, out: 0 }); out = duration; }
  const mapT = (t: number) => {
    let removed = 0;
    for (const c of cuts) {
      if (t >= c.end) removed += c.end - c.start;
      else if (t > c.start) removed += t - c.start;
    }
    return Math.max(0, t - removed);
  };
  return { keep, cuts, total: out, mapT };
}
