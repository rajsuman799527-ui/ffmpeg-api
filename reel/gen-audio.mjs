// Synthesizes royalty-free background music + sound effects with ffmpeg (no downloads, no licences).
// Usage: node gen-audio.mjs <outDir> <musicSeconds> [mood|all]
import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { MOODS, renderTrack, writeWav } from './music.mjs';

const out = process.argv[2] || 'public';
const SECS = Number(process.argv[3] || 130);
const ONLY = process.argv[4] || 'all';
mkdirSync(join(out, 'sfx'), { recursive: true });
mkdirSync(join(out, 'music'), { recursive: true });
const run = (args) => {
  const r = spawnSync('ffmpeg', ['-y', '-v', 'error', '-nostdin', ...args], { encoding: 'utf8' });
  if (r.status !== 0) { console.error('ffmpeg failed:', r.stderr?.slice(0, 600)); process.exit(1); }
};
const hz = (m) => (440 * Math.pow(2, (m - 69) / 12)).toFixed(3);
const f2 = (n) => n.toFixed(4);
const FMT = 'aformat=sample_fmts=s16:channel_layouts=stereo,alimiter=limit=0.9';

const sfx = {
  whoosh: { src: `anoisesrc=d=0.8:c=pink:r=44100:a=0.9`, af: `bandpass=f=1400:w=1.6,afade=t=in:d=0.4,afade=t=out:st=0.4:d=0.4,volume=7,aecho=0.7:0.5:40:0.3` },
  swish: { src: `anoisesrc=d=0.45:c=white:r=44100:a=0.6`, af: `bandpass=f=3200:w=1.2,afade=t=in:d=0.18,afade=t=out:st=0.18:d=0.27,volume=2.2` },
  pop: { src: `aevalsrc='sin(2*PI*(900*exp(-t*20)+260)*t)*exp(-t*26)':d=0.2:s=44100`, af: `volume=0.9` },
  tick: { src: `aevalsrc='(0.6*random(0)+0.4*sin(2*PI*2200*t))*exp(-t*220)':d=0.06:s=44100`, af: `highpass=f=1500,volume=0.9` },
  type: { src: `aevalsrc='random(0)*exp(-t*400)':d=0.04:s=44100`, af: `lowpass=f=4500,highpass=f=800,volume=1.2` },
  ding: { src: `aevalsrc='(sin(2*PI*1318.5*t)*exp(-t*4.5)+0.5*sin(2*PI*2637*t)*exp(-t*7)+0.25*sin(2*PI*3951*t)*exp(-t*10))*0.5':d=1.4:s=44100`, af: `volume=3,aecho=0.6:0.5:90|180:0.35|0.2` },
  hit: { src: `aevalsrc='sin(2*PI*(48+90*exp(-t*14))*t)*exp(-t*5.5)+0.5*random(0)*exp(-t*30)':d=1.0:s=44100`, af: `lowpass=f=2400,volume=1.1,aecho=0.6:0.5:70:0.3` },
  riser: { src: `aevalsrc='random(0)*pow(t/2.2,2.2)*0.8':d=2.2:s=44100`, af: `bandpass=f=2500:w=3,afade=t=out:st=2.0:d=0.2,volume=3` },
  coin: { src: `aevalsrc='sin(2*PI*1568*t)*exp(-t*14)*lt(t,0.09)+sin(2*PI*2093*t)*exp(-t*8)*gte(t,0.09)':d=0.9:s=44100`, af: `volume=2,aecho=0.6:0.4:60:0.25` },
  swell: { src: `aevalsrc='(sin(2*PI*220*t)+sin(2*PI*277.2*t)+sin(2*PI*329.6*t))*0.25*sin(PI*t/1.6)':d=1.6:s=44100`, af: `volume=2.5,aecho=0.6:0.5:80|160:0.3|0.2` },
};
for (const [name, s] of Object.entries(sfx)) run(['-f', 'lavfi', '-i', s.src, '-af', `${s.af},${FMT}`, '-ar', '44100', join(out, 'sfx', `${name}.wav`)]);

const moods = {
  warm: { bpm: 96, prog: [[57, 60, 64, 69], [53, 57, 60, 65], [48, 52, 55, 60], [55, 59, 62, 67]], pad: 0.5, pluck: 0.35, kick: 0, hat: 0, lp: 3800 },
  cinema: { bpm: 72, prog: [[45, 52, 57, 60], [41, 48, 53, 57], [43, 50, 55, 59], [40, 47, 52, 55]], pad: 0.6, pluck: 0.12, kick: 0.35, hat: 0, lp: 2600 },
  neon: { bpm: 108, prog: [[57, 60, 64, 67], [53, 57, 60, 64], [55, 59, 62, 66], [52, 56, 59, 64]], pad: 0.4, pluck: 0.4, kick: 0.5, hat: 0.25, lp: 5200 },
  pulse: { bpm: 112, prog: [[50, 57, 62, 65], [46, 53, 58, 62], [48, 55, 60, 64], [45, 52, 57, 61]], pad: 0.3, pluck: 0.3, kick: 0.55, hat: 0.3, lp: 4600 },
  fresh: { bpm: 104, prog: [[60, 64, 67, 72], [57, 60, 64, 69], [53, 57, 60, 65], [55, 59, 62, 67]], pad: 0.3, pluck: 0.5, kick: 0.3, hat: 0.18, lp: 5000 },
  vintage: { bpm: 80, prog: [[55, 58, 62, 67], [51, 55, 58, 63], [53, 57, 60, 65], [50, 53, 57, 62]], pad: 0.35, pluck: 0.45, kick: 0, hat: 0, lp: 2200 },
};
for (const name of MOODS) {
  if (ONLY !== 'all' && ONLY !== name) continue;
  writeWav(join(out, 'music', `${name}.wav`), renderTrack(name, SECS));
  console.log('music', name);
}
for (const [name, m] of Object.entries(moods)) {
  if (ONLY !== 'all' && ONLY !== name) continue;
  const beat = 60 / m.bpm, L = beat * 8, P = L * 4, step = beat / 2;
  const gate = (i) => `between(mod(t,${f2(P)}),${f2(i * L)},${f2((i + 1) * L - 0.0001)})`;
  const env = `min(1,mod(t,${f2(L)})/1.2)*min(1,(${f2(L)}-mod(t,${f2(L)}))/1.2)`;
  const pad = m.prog.map((c, i) => `${gate(i)}*(${c.map((n, k) => `${k === 3 ? '0.5*' : ''}sin(2*PI*${hz(n)}*t+${k})`).join('+')})`).join('+');
  const idx = `mod(floor(t/${f2(step)}),4)`;
  const arp = (c) => `if(eq(${idx},0),${hz(c[0] + 12)},if(eq(${idx},1),${hz(c[1] + 12)},if(eq(${idx},2),${hz(c[2] + 12)},${hz(c[1] + 12)})))`;
  const pluck = m.prog.map((c, i) => `${gate(i)}*sin(2*PI*${arp(c)}*t)`).join('+');
  const tb = `mod(t,${f2(beat)})`, ts = `mod(t,${f2(step)})`;
  const expr = `${m.pad}*(${pad})*(${env})*0.22+${m.pluck}*(${pluck})*exp(-${ts}*7)*0.35+${m.kick}*(sin(2*PI*(46+110*exp(-${tb}*34))*t)*exp(-${tb}*9))*0.55+${m.hat}*(random(0)*exp(-${ts}*70))*0.12`;
  run(['-f', 'lavfi', '-i', `aevalsrc='${expr}':d=${SECS}:s=44100`, '-af', `lowpass=f=${m.lp},aecho=0.8:0.6:120|240:0.28|0.18,volume=0.9,afade=t=in:d=1.5,afade=t=out:st=${Math.max(1, SECS - 3)}:d=3,${FMT}`, '-ar', '44100', join(out, 'music', `${name}.wav`)]);
  console.log('music', name);
}
console.log('audio ready');
