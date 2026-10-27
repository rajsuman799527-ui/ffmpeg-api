// Usage: node render.mjs <plan_url> <video_url> [cutout_url]
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';

const [planUrl, videoUrl, cutoutUrl] = process.argv.slice(2);
if (!planUrl || !videoUrl) { console.error('need plan_url and video_url'); process.exit(1); }
const here = path.dirname(fileURLToPath(import.meta.url));

const res = await fetch(planUrl);
if (!res.ok) { console.error('plan download failed', res.status); process.exit(1); }
const plan = await res.json();
const last = Math.max(...plan.scenes.map((s) => s.end), ...plan.captions.map((c) => c.end));
console.log('plan ok: scenes', plan.scenes.length, 'captions', plan.captions.length, 'seconds', last);

const serveUrl = await bundle({ entryPoint: path.join(here, 'src/index.ts') });
const inputProps = { plan, videoUrl, cutoutUrl: cutoutUrl || '' };
const composition = await selectComposition({ serveUrl, id: 'Reel', inputProps });
await renderMedia({
  composition,
  serveUrl,
  codec: 'h264',
  outputLocation: path.join(here, '..', 'out.mp4'),
  inputProps,
  crf: 22,
  concurrency: 2,
  onProgress: ({ progress }) => { if (Math.round(progress * 100) % 10 === 0) console.log('progress', Math.round(progress * 100)); },
});
console.log('done');
