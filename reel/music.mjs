// Pure-JS music synthesizer: six different royalty-free tracks (drums, bass, chords, leads, reverb, delay, sidechain). No downloads, no licences.
import { writeFileSync } from 'node:fs';
const SR = 44100;
const mtof = (m) => 440 * 2 ** ((m - 69) / 12);
const rng = (seed) => { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };
const lpCoef = (hz) => 1 - Math.exp((-2 * Math.PI * Math.min(hz, 18000)) / SR);

class Bus { constructor(n) { this.l = new Float32Array(n); this.r = new Float32Array(n); this.n = n; } }

/** Adds a mono signal into a bus at a start time with a pan (-1..1). */
function put(bus, startSec, buf, gain = 1, pan = 0, sends) {
  const s0 = Math.floor(startSec * SR);
  const gl = gain * Math.cos(((pan + 1) * Math.PI) / 4), gr = gain * Math.sin(((pan + 1) * Math.PI) / 4);
  for (let i = 0; i < buf.length; i++) {
    const k = s0 + i; if (k < 0 || k >= bus.n) continue;
    bus.l[k] += buf[i] * gl; bus.r[k] += buf[i] * gr;
    if (sends) for (const [b, g] of sends) { b.l[k] += buf[i] * gl * g; b.r[k] += buf[i] * gr * g; }
  }
}

const saw = (ph, dt) => { let x = 2 * ph - 1; if (ph < dt) { const t = ph / dt; x -= t + t - t * t - 1; } else if (ph > 1 - dt) { const t = (ph - 1) / dt; x -= t * t + t + t + 1; } return x; };
const tri = (ph) => 4 * Math.abs(ph - 0.5) - 1;

/** One synth voice. Oscillators are summed, passed through a two-pole low-pass with an envelope, and shaped by an amplitude envelope. */
function voice({ freq, len, type = 'saw', det = [0], atk = 0.01, dec = 0.3, sus = 1, rel = 0.1, lp = 4000, lpEnv = 0, lpDec = 0.15, vib = 0, drive = 0 }) {
  const total = Math.ceil((len + rel) * SR), out = new Float32Array(total);
  const phs = det.map((_, i) => (i * 0.37) % 1);
  let y1 = 0, y2 = 0;
  for (let i = 0; i < total; i++) {
    const t = i / SR;
    let amp = Math.min(1, t / Math.max(atk, 1e-4)) * (sus + (1 - sus) * Math.exp(-t / dec));
    if (t > len) amp *= Math.max(0, 1 - (t - len) / rel);
    const f = freq * (1 + (vib ? Math.sin(2 * Math.PI * 5.2 * t) * vib : 0));
    let x = 0;
    for (let k = 0; k < det.length; k++) {
      const fk = f * 2 ** (det[k] / 1200), dt = fk / SR;
      phs[k] = (phs[k] + dt) % 1;
      x += type === 'saw' ? saw(phs[k], dt) : type === 'sq' ? saw(phs[k], dt) - saw((phs[k] + 0.5) % 1, dt) : type === 'tri' ? tri(phs[k]) : Math.sin(2 * Math.PI * phs[k]);
    }
    x /= det.length;
    const c = lpCoef(lp * (1 + lpEnv * Math.exp(-t / lpDec)));
    y1 += c * (x - y1); y2 += c * (y1 - y2);
    let o = y2 * amp;
    if (drive) o = Math.tanh(o * drive) / Math.tanh(drive);
    out[i] = o;
  }
  return out;
}

/** Rhodes-like electric piano: sine partials with a bell-ish attack and tremolo. */
function epiano(freq, len, rel = 0.6) {
  const total = Math.ceil((len + rel) * SR), out = new Float32Array(total);
  for (let i = 0; i < total; i++) {
    const t = i / SR;
    let amp = (1 - Math.exp(-t / 0.004)) * Math.exp(-t / 1.6);
    if (t > len) amp *= Math.max(0, 1 - (t - len) / rel);
    const trem = 0.85 + 0.15 * Math.sin(2 * Math.PI * 4.6 * t);
    const w = 2 * Math.PI * freq * t;
    out[i] = (Math.sin(w) + 0.35 * Math.sin(2 * w) * Math.exp(-t / 0.5) + 0.18 * Math.sin(3 * w + 0.5) * Math.exp(-t / 0.25) + 0.5 * Math.sin(w * 7.01) * Math.exp(-t / 0.05) * 0.4) * amp * trem;
  }
  return out;
}
const bell = (freq, len) => {
  const total = Math.ceil((len + 0.5) * SR), out = new Float32Array(total);
  for (let i = 0; i < total; i++) { const t = i / SR; const idx = 2.2 * Math.exp(-t / 0.25); out[i] = Math.sin(2 * Math.PI * freq * t + idx * Math.sin(2 * Math.PI * freq * 3.5 * t)) * Math.exp(-t / 0.7) * (1 - Math.exp(-t / 0.003)); }
  return out;
};

/* ---------- drums ---------- */
const kick = (low = 46, hi = 150, dec = 0.32, click = 0.5) => { const n = Math.floor(0.6 * SR), o = new Float32Array(n); let ph = 0; for (let i = 0; i < n; i++) { const t = i / SR; const f = low + (hi - low) * Math.exp(-t / 0.03); ph += (2 * Math.PI * f) / SR; o[i] = (Math.sin(ph) * Math.exp(-t / dec) + click * Math.exp(-t / 0.004) * (Math.random() - 0.5)) * 0.95; } return o; };
const noiseHit = (len, hp, lpHz, dec, r) => { const n = Math.floor(len * SR), o = new Float32Array(n); let a = 0, b = 0, c = 0; const ch = lpCoef(hp), cl = lpCoef(lpHz); for (let i = 0; i < n; i++) { const t = i / SR; const x = r() * 2 - 1; a += ch * (x - a); const hpv = x - a; b += cl * (hpv - b); c += cl * (b - c); o[i] = c * Math.exp(-t / dec); } return o; };
const snare = (r, body = 190, dec = 0.14, snap = 0.9) => { const nz = noiseHit(0.35, 1200, 9000, dec, r); const o = new Float32Array(nz.length); for (let i = 0; i < o.length; i++) { const t = i / SR; o[i] = nz[i] * snap + Math.sin(2 * Math.PI * (body + 60 * Math.exp(-t / 0.02)) * t) * Math.exp(-t / 0.09) * 0.7; } return o; };
const clap = (r) => { const n = Math.floor(0.4 * SR), o = new Float32Array(n); let a = 0, b = 0; const ch = lpCoef(900), cl = lpCoef(6500); for (let i = 0; i < n; i++) { const t = i / SR; const burst = [0, 0.011, 0.023].reduce((s, d) => s + (t >= d ? Math.exp(-(t - d) / 0.006) : 0), 0) + Math.exp(-Math.max(0, t - 0.03) / 0.09) * (t > 0.03 ? 1 : 0); const x = r() * 2 - 1; a += ch * (x - a); b += cl * (x - a - b); o[i] = b * burst * 0.8; } return o; };
const hat = (r, dec = 0.03, bright = 7000) => noiseHit(Math.max(0.06, dec * 5), bright, 16000, dec, r);

/* ---------- effects ---------- */
function reverb(inp, size = 1, fb = 0.84, mix = 1) {
  const n = inp.n, wl = new Float32Array(n), wr = new Float32Array(n);
  const mk = (d) => ({ b: new Float32Array(Math.floor(d * size)), i: 0, s: 0 });
  const combsL = [1116, 1188, 1277, 1356].map(mk), combsR = [1139, 1211, 1300, 1379].map(mk);
  const apL = [556, 441].map(mk), apR = [579, 464].map(mk);
  const run = (src, combs, aps, dst) => {
    for (let i = 0; i < n; i++) {
      const x = src[i] * 0.25; let y = 0;
      for (const c of combs) { const o = c.b[c.i]; c.s = o * 0.7 + c.s * 0.3; c.b[c.i] = x + c.s * fb; c.i = (c.i + 1) % c.b.length; y += o; }
      for (const a of aps) { const o = a.b[a.i]; a.b[a.i] = y + o * 0.5; a.i = (a.i + 1) % a.b.length; y = o - y * 0.5; }
      dst[i] = y * mix;
    }
  };
  run(inp.l, combsL, apL, wl); run(inp.r, combsR, apR, wr);
  return { l: wl, r: wr };
}
function pingPong(inp, beatSec, fb = 0.42, mix = 1, frac = 0.75) {
  const n = inp.n, d = Math.floor(beatSec * frac * SR), l = new Float32Array(n), r = new Float32Array(n);
  let sl = 0, sr = 0; const c = lpCoef(3800);
  for (let i = 0; i < n; i++) {
    const xl = inp.l[i], xr = inp.r[i];
    const dl = i >= d ? r[i - d] : 0, dr = i >= d ? l[i - d] : 0;
    sl += c * (dl - sl); sr += c * (dr - sr);
    l[i] = xl * 0.5 + sl * fb; r[i] = xr * 0.5 + sr * fb;
  }
  for (let i = 0; i < n; i++) { l[i] *= mix; r[i] *= mix; }
  return { l, r };
}

/* ---------- track definitions ---------- */
const hexSteps = (s) => [...s].map((c) => (c === 'x' ? 1 : c === 'o' ? 0.55 : 0));

const TRACKS = {
  // Lo-fi chill: electric piano, dusty swung beat, soft bells
  lofi: { bpm: 80, swing: 0.1, gain: 0.9, chords: [[38, [53, 57, 60, 64]], [43, [53, 59, 62, 64]], [36, [52, 55, 59, 62]], [45, [55, 59, 60, 64]]], scale: [62, 64, 65, 67, 69, 71, 72], kick: 'x..x....x.x.....', snare: '....x.......x...', hat: 'x.o.x.o.x.o.x.oo', verb: 0.35, dly: 0.18, lp: 4200 },
  // Cinematic epic: strings, taiko, rising swells
  epic: { bpm: 90, swing: 0, gain: 1.0, chords: [[33, [57, 60, 64, 69]], [29, [57, 60, 65, 69]], [36, [55, 60, 64, 72]], [31, [55, 59, 62, 67]]], kick: 'x.......x.......', snare: '........x.......', hat: '................', verb: 0.9, dly: 0.1, lp: 9000 },
  // Dark trap: 808, rolling hats, bell melody
  trap: { bpm: 140, swing: 0, gain: 0.95, chords: [[29, [56, 60, 65]], [25, [56, 61, 65]], [32, [56, 60, 67]], [27, [55, 58, 63]]], kick: 'x.....x...x.....', snare: '........x.......', hat: 'xoxoxoxoxoxoxoxo', verb: 0.3, dly: 0.3, lp: 12000 },
  // Bright pop uplift: claps, plucks, four on the floor
  uplift: { bpm: 118, swing: 0, gain: 0.95, chords: [[36, [60, 64, 67, 72]], [43, [59, 62, 67, 71]], [45, [60, 64, 69, 72]], [41, [60, 65, 69, 72]]], kick: 'x...x...x...x...', snare: '....x.......x...', hat: '..o...o...o...o.', verb: 0.3, dly: 0.2 },
  // Synthwave: gated pads, pulsing bass, ping-pong arps
  synthwave: { bpm: 100, swing: 0, gain: 0.95, chords: [[33, [57, 60, 64]], [29, [57, 60, 65]], [36, [55, 60, 64]], [31, [55, 59, 62]]], kick: 'x.......x.......', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', verb: 0.7, dly: 0.35, lp: 9000 },
  // Groove house: funky bass, stabs, offbeat hats
  groove: { bpm: 124, swing: 0, gain: 0.95, chords: [[31, [55, 58, 62, 65]], [36, [52, 58, 62, 67]], [31, [55, 58, 62, 65]], [38, [54, 57, 60, 62]]], kick: 'x...x...x...x...', snare: '....x.......x...', hat: '..x...x...x...x.', verb: 0.25, dly: 0.15 },
};
export const MOODS = Object.keys(TRACKS);

export function renderTrack(name, secs) {
  const T = TRACKS[name]; if (!T) throw new Error('unknown track ' + name);
  const n = Math.ceil(secs * SR), r = rng(name.length * 97 + 11);
  const beat = 60 / T.bpm, step = beat / 4, bar = beat * 4, bars = Math.ceil(secs / bar) + 1;
  const drums = new Bus(n), harm = new Bus(n), bass = new Bus(n), lead = new Bus(n), verbIn = new Bus(n), dlyIn = new Bus(n);
  const sv = [[verbIn, T.verb]], sd = [[dlyIn, T.dly]], sb = [[verbIn, T.verb], [dlyIn, T.dly]];
  const kickTimes = [];
  const swingOff = (s) => (s % 2 === 1 ? step * (T.swing || 0) : 0);
  const kd = hexSteps(T.kick), sn = hexSteps(T.snare), ht = hexSteps(T.hat);

  for (let b = 0; b < bars; b++) {
    const t0 = b * bar, [root, ch] = T.chords[b % T.chords.length];
    const intro = b < 2, phraseEnd = b % 8 === 7, brk = b % 16 === 15;
    // ---- drums (skipped in the intro and in breaks so the track breathes)
    if (!intro && !brk) {
      for (let s = 0; s < 16; s++) {
        const ts = t0 + s * step + swingOff(s);
        if (kd[s]) { put(drums, ts, kick(name === 'epic' ? 38 : name === 'trap' ? 45 : 48, name === 'epic' ? 110 : 150, name === 'epic' ? 0.55 : name === 'trap' ? 0.3 : 0.28), name === 'epic' ? 1.1 : 0.9, 0, name === 'epic' ? sv : undefined); kickTimes.push(ts); }
        if (sn[s]) put(drums, ts, name === 'uplift' || name === 'groove' ? clap(r) : snare(r, name === 'epic' ? 120 : 190, name === 'synthwave' ? 0.28 : 0.14), name === 'epic' ? 1.0 : 0.62, 0, name === 'synthwave' || name === 'epic' ? sv : undefined);
        if (ht[s]) put(drums, ts, hat(r, name === 'groove' && s % 4 === 2 ? 0.09 : 0.028, 7500), 0.2 * ht[s] * (0.7 + r() * 0.5), (r() - 0.5) * 0.5);
      }
      if (name === 'trap') { // hat rolls at the end of every 4th bar
        if (b % 4 === 3) for (let k = 0; k < 6; k++) put(drums, t0 + 14 * step + (k * step * 2) / 6, hat(r, 0.02, 8000), 0.18 + k * 0.03, 0);
      }
      if (name === 'uplift' || name === 'synthwave') for (let s = 0; s < 16; s++) if (s % 2 === 1 && name === 'uplift') put(drums, t0 + s * step, hat(r, 0.015, 9000), 0.07, 0.3);
      if (name === 'lofi') for (let s = 0; s < 16; s += 2) put(drums, t0 + s * step + swingOff(s), hat(r, 0.02, 6000), 0.07, 0.2);
    } else if (name === 'epic' && b === 0) put(drums, 0, kick(38, 110, 0.6), 0.9, 0, sv);
    if (phraseEnd && name !== 'lofi') { const sw = noiseHit(bar, 2500, 14000, 3, r); for (let i = 0; i < sw.length; i++) sw[i] *= (i / sw.length) ** 2; put(drums, t0, sw, 0.18, 0, sv); }
    if (b > 0 && b % 8 === 0 && (name === 'epic' || name === 'synthwave' || name === 'uplift')) put(drums, t0, noiseHit(1.6, 5000, 15000, 0.5, r), 0.16, 0, sv);

    // ---- harmony + bass + lead per track
    if (name === 'lofi') {
      ch.forEach((m, i) => put(harm, t0 + i * 0.018 + (r() - 0.5) * 0.01, epiano(mtof(m), bar * 0.95), 0.2, -0.3 + i * 0.2, sv));
      put(bass, t0, voice({ freq: mtof(root), len: beat * 1.6, type: 'sin', det: [0], atk: 0.01, dec: 0.5, sus: 0.5, rel: 0.2, lp: 400 }), 0.55, 0);
      put(bass, t0 + beat * 2.5, voice({ freq: mtof(root + (b % 2 ? 7 : 12)), len: beat * 0.9, type: 'sin', det: [0], atk: 0.01, dec: 0.4, sus: 0.4, rel: 0.15, lp: 400 }), 0.4, 0);
      if (b >= 2) for (let s = 0; s < 16; s += 2) if (r() < 0.32) { const m = T.scale[Math.floor(r() * T.scale.length)] + 12; put(lead, t0 + s * step + swingOff(s), bell(mtof(m), 0.4), 0.13, (r() - 0.5) * 0.8, [[verbIn, 0.5], [dlyIn, 0.4]]); }
    } else if (name === 'epic') {
      for (const m of ch) put(harm, t0, voice({ freq: mtof(m), len: bar * 1.02, type: 'saw', det: [-14, -5, 6, 15], atk: 0.7, dec: 1, sus: 1, rel: 0.9, lp: 1500 + (b % 8) * 140 }), 0.12, (m % 5 - 2) * 0.2, sv);
      put(bass, t0, voice({ freq: mtof(root), len: bar * 0.98, type: 'saw', det: [-6, 6], atk: 0.04, dec: 1, sus: 0.9, rel: 0.4, lp: 320 }), 0.5, 0);
      put(bass, t0, voice({ freq: mtof(root), len: bar, type: 'sin', det: [0], atk: 0.05, dec: 1, sus: 1, rel: 0.4, lp: 200 }), 0.45, 0);
      if (b >= 2) for (let s = 0; s < 16; s += 2) put(lead, t0 + s * step, voice({ freq: mtof(ch[(s / 2) % 2 === 0 ? 0 : 2] - 12 + (s % 8 === 6 ? 12 : 0)), len: step * 1.5, type: 'saw', det: [-8, 8], atk: 0.005, dec: 0.12, sus: 0, rel: 0.05, lp: 2400, lpEnv: 1 }), 0.15 + (s === 0 ? 0.05 : 0), (s % 4 - 1.5) * 0.15, sv);
      if (b >= 4 && b % 4 === 0) for (let k = 0; k < ch.length; k++) put(lead, t0 + bar * 2 * 0, voice({ freq: mtof(ch[k] + 12), len: bar * 2, type: 'saw', det: [-10, 10], atk: 1.2, dec: 1, sus: 1, rel: 1, lp: 2600 }), 0.05, (k - 1.5) * 0.4, sv);
    } else if (name === 'trap') {
      for (const [s, len] of [[0, 5], [6, 3], [10, 5]]) { const f = mtof(root + 12); const v = voice({ freq: f, len: step * len, type: 'sin', det: [0], atk: 0.004, dec: 0.5, sus: 0.7, rel: 0.12, lp: 600, drive: 3 }); put(bass, t0 + s * step, v, 0.7, 0); }
      ch.forEach((m, i) => put(harm, t0, voice({ freq: mtof(m), len: bar, type: 'saw', det: [-9, 9], atk: 0.3, dec: 1, sus: 1, rel: 0.5, lp: 900 }), 0.1, (i - 1) * 0.3, sv));
      if (b >= 2) for (let s = 0; s < 16; s += 2) { const note = ch[(s / 2 + (b % 2)) % ch.length] + 24 - (s % 8 === 0 ? 12 : 0); if (r() < 0.75) put(lead, t0 + s * step, bell(mtof(note), 0.3), 0.2, (r() - 0.5) * 0.9, [[verbIn, 0.4], [dlyIn, 0.45]]); }
    } else if (name === 'uplift') {
      for (const s of [0, 3, 6, 10, 12]) for (const m of ch) put(harm, t0 + s * step, voice({ freq: mtof(m), len: step * 1.6, type: 'saw', det: [-10, 0, 10], atk: 0.004, dec: 0.1, sus: 0.15, rel: 0.05, lp: 3200, lpEnv: 1.5 }), 0.07, (m % 7 - 3) * 0.12, sv);
      for (let s = 0; s < 16; s += 2) put(bass, t0 + s * step, voice({ freq: mtof(root + (s % 4 === 0 ? 0 : 12)), len: step * 1.5, type: 'saw', det: [0], atk: 0.004, dec: 0.2, sus: 0.3, rel: 0.05, lp: 500, lpEnv: 1.5 }), 0.4, 0);
      if (b >= 2) for (let s = 0; s < 16; s++) if (s % 2 === 0 || r() < 0.3) put(lead, t0 + s * step, voice({ freq: mtof(ch[(s >> 1) % ch.length] + 12), len: step * 0.9, type: 'tri', det: [0], atk: 0.003, dec: 0.1, sus: 0, rel: 0.05, lp: 5000 }), 0.14, (s % 8 - 3.5) * 0.12, [[dlyIn, 0.5], [verbIn, 0.2]]);
    } else if (name === 'synthwave') {
      for (let s = 0; s < 16; s++) for (const m of ch) put(harm, t0 + s * step, voice({ freq: mtof(m), len: step * 0.8, type: 'saw', det: [-12, 0, 12], atk: 0.01, dec: 0.2, sus: 0.7, rel: 0.05, lp: 1800 }), 0.04 + (s % 2 === 0 ? 0.02 : 0), (m % 5 - 2) * 0.2, sv);
      for (let s = 0; s < 16; s += 2) put(bass, t0 + s * step, voice({ freq: mtof(root + 12), len: step * 1.7, type: 'saw', det: [-5, 5], atk: 0.004, dec: 0.2, sus: 0.6, rel: 0.05, lp: 700, lpEnv: 1.2 }), 0.42, 0);
      if (b >= 2) for (let s = 0; s < 16; s++) put(lead, t0 + s * step, voice({ freq: mtof(ch[[0, 1, 2, 1][s % 4]] + 12), len: step * 0.9, type: 'sq', det: [-6, 6], atk: 0.003, dec: 0.12, sus: 0.05, rel: 0.05, lp: 3600, lpEnv: 1 }), 0.1, (s % 2 ? 0.4 : -0.4), [[dlyIn, 0.6], [verbIn, 0.3]]);
      if (b >= 4 && b % 4 === 1) put(lead, t0, voice({ freq: mtof(ch[2] + 24), len: bar * 1.5, type: 'saw', det: [-8, 8], atk: 0.05, dec: 1, sus: 0.8, rel: 0.6, lp: 3000, vib: 0.004 }), 0.1, 0, [[dlyIn, 0.6], [verbIn, 0.5]]);
    } else if (name === 'groove') {
      for (const s of [2, 5, 9, 13]) for (const m of ch) put(harm, t0 + s * step, voice({ freq: mtof(m), len: step * 1.1, type: 'saw', det: [-8, 8], atk: 0.003, dec: 0.08, sus: 0.1, rel: 0.04, lp: 2600, lpEnv: 1.2 }), 0.08, (m % 5 - 2) * 0.15, sv);
      const pat = [[0, 0], [3, 12], [6, 0], [7, 7], [10, 0], [12, 12], [15, 7]];
      for (const [s, o] of pat) put(bass, t0 + s * step, voice({ freq: mtof(root + o), len: step * 0.85, type: 'saw', det: [0], atk: 0.003, dec: 0.12, sus: 0.2, rel: 0.03, lp: 450, lpEnv: 3.5, lpDec: 0.09 }), 0.5, 0);
      if (b >= 2) for (const s of [4, 7, 12, 14]) put(lead, t0 + s * step, voice({ freq: mtof(ch[(s >> 2) % ch.length] + 12), len: step * 0.7, type: 'sq', det: [0], atk: 0.003, dec: 0.1, sus: 0.1, rel: 0.04, lp: 3000, lpEnv: 2 }), 0.09, (s % 3 - 1) * 0.4, [[dlyIn, 0.4], [verbIn, 0.2]]);
    }
  }

  // sidechain pump on chords and bass
  const duck = new Float32Array(n).fill(1);
  const depth = name === 'epic' ? 0.25 : name === 'lofi' ? 0.15 : 0.55;
  for (const kt of kickTimes) { const s0 = Math.floor(kt * SR); for (let i = 0; i < 0.25 * SR && s0 + i < n; i++) duck[s0 + i] = Math.min(duck[s0 + i], 1 - depth * Math.exp(-i / (0.07 * SR))); }
  const rv = reverb(verbIn, 1, T.verb > 0.6 ? 0.9 : 0.82, 0.9), dl = pingPong(dlyIn, beat, 0.42, 1);
  const L = new Float32Array(n), R = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    L[i] = drums.l[i] + (harm.l[i] + bass.l[i]) * duck[i] + lead.l[i] + rv.l[i] + dl.l[i];
    R[i] = drums.r[i] + (harm.r[i] + bass.r[i]) * duck[i] + lead.r[i] + rv.r[i] + dl.r[i];
  }
  if (T.lp) for (const ch of [L, R]) { let a = 0, b2 = 0; const c = lpCoef(T.lp); for (let i = 0; i < n; i++) { a += c * (ch[i] - a); b2 += c * (a - b2); ch[i] = b2; } }
  // master: match loudness across tracks (RMS), soft limit, fades
  let sum = 0; for (let i = 0; i < n; i++) sum += L[i] * L[i] + R[i] * R[i];
  const rms = Math.sqrt(sum / (2 * n)) || 1, g = (0.2 * T.gain) / rms, fi = SR * 1.5, fo = SR * 3;
  for (let i = 0; i < n; i++) { const f = Math.min(1, i / fi, (n - i) / fo); L[i] = Math.tanh(L[i] * g) * 0.95 * f; R[i] = Math.tanh(R[i] * g) * 0.95 * f; }
  return { L, R };
}

export function writeWav(path, { L, R }) {
  const n = L.length, buf = Buffer.alloc(44 + n * 4);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) { buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(L[i] * 32767))), 44 + i * 4); buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(R[i] * 32767))), 46 + i * 4); }
  writeFileSync(path, buf);
}
