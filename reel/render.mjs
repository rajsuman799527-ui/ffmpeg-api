// env: PLAN_URL, VIDEO_URL (optional), AUDIO_URL (optional), CUTOUT_URL (optional)
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { bundle } from '@remotion/bundler';
import { renderMedia, renderStill, selectComposition } from '@remotion/renderer';
import { mkdirSync } from 'node:fs';

const { PLAN_URL, VIDEO_URL = '', AUDIO_URL = '', CUTOUT_URL = '', STILLS = '' } = process.env;
if (!PLAN_URL) { console.error('need PLAN_URL'); process.exit(1); }
const here = path.dirname(fileURLToPath(import.meta.url));

const res = await fetch(PLAN_URL);
if (!res.ok) { console.error('plan download failed', res.status); process.exit(1); }
const plan = await res.json();
const last = Math.max(1, ...plan.scenes.map((s) => s.end), ...plan.captions.map((c) => c.end));
console.log('plan ok: template', plan.template || 'yellow_pop', 'mode', plan.mode || 'video', 'captions', plan.captions.length, 'seconds', last);

// music + sound effects (synthesized, royalty free)
const track = (plan.music && plan.music.track) || '';
const g = spawnSync('node', ['gen-audio.mjs', 'public', String(Math.ceil(last + 4)), track || 'none'], { cwd: here, stdio: 'inherit' });
if (g.status !== 0) { console.error('audio generation failed'); process.exit(1); }

const serveUrl = await bundle({ entryPoint: path.join(here, 'src/index.ts'), publicDir: path.join(here, 'public') });
const inputProps = { plan, videoUrl: VIDEO_URL, audioUrl: AUDIO_URL, cutoutUrl: CUTOUT_URL };
const composition = await selectComposition({ serveUrl, id: 'Reel', inputProps });
if (STILLS) {
  // quick preview: PNG frames at the given seconds (comma separated)
  mkdirSync(path.join(here, '..', 'stills'), { recursive: true });
  for (const sec of STILLS.split(',').map(Number).filter((n) => !Number.isNaN(n))) {
    const frame = Math.min(composition.durationInFrames - 1, Math.round(sec * 30));
    await renderStill({ composition, serveUrl, output: path.join(here, '..', 'stills', `f${String(Math.round(sec * 100)).padStart(5, '0')}.png`), frame, inputProps });
  }
  console.log('stills done');
  process.exit(0);
}
await renderMedia({
  composition, serveUrl, codec: 'h264',
  outputLocation: path.join(here, '..', 'out.mp4'),
  inputProps, crf: 22, concurrency: 2,
  onProgress: ({ progress }) => { const p = Math.round(progress * 100); if (p % 10 === 0) console.log('progress', p); },
});
console.log('done');
