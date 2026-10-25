const express = require('express');
const { spawn } = require('child_process');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const { pipeline } = require('stream/promises');
const { Readable } = require('stream');

const app = express();
app.use(express.json({ limit: '2mb' }));

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY;
const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
const CF_API_TOKEN = process.env.CF_API_TOKEN;
const OUT_DIR = '/tmp/out';
const TMP_DIR = '/tmp/work';
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(TMP_DIR, { recursive: true });

// ---------- helpers ----------
const id = () => crypto.randomBytes(6).toString('hex');

function baseUrl(req) {
  return process.env.PUBLIC_URL || `https://${req.get('host')}`;
}

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args);
    let err = '';
    let out = '';
    p.stdout.on('data', (d) => (out += d));
    p.stderr.on('data', (d) => (err += d));
    p.on('error', reject);
    p.on('close', (code) =>
      code === 0 ? resolve({ out, err }) : reject(new Error(err.slice(-800) || 'ffmpeg failed'))
    );
  });
}

async function download(url) {
  const file = path.join(TMP_DIR, id() + '.bin');
  const res = await fetch(url);
  if (!res.ok) throw new Error('Download failed: ' + res.status);
  await pipeline(Readable.fromWeb(res.body), fs.createWriteStream(file));
  return file;
}

// one job at a time (free server is tiny)
let chain = Promise.resolve();
function queue(fn) {
  const next = chain.then(fn, fn);
  chain = next.catch(() => {});
  return next;
}

function handler(fn) {
  return (req, res) => {
    queue(() => fn(req))
      .then((data) => res.json({ ok: true, ...data }))
      .catch((e) => res.status(500).json({ ok: false, error: e.message }));
  };
}

async function cleanup(files) {
  for (const f of files) fsp.unlink(f).catch(() => {});
}

// delete old files every 15 min
setInterval(async () => {
  for (const dir of [OUT_DIR, TMP_DIR]) {
    try {
      for (const f of await fsp.readdir(dir)) {
        const p = path.join(dir, f);
        const st = await fsp.stat(p);
        if (Date.now() - st.mtimeMs > 60 * 60 * 1000) fsp.unlink(p).catch(() => {});
      }
    } catch (e) {}
  }
}, 15 * 60 * 1000);

// ---------- public routes ----------
app.get('/', (req, res) => res.send('ok'));
app.use('/files', express.static(OUT_DIR));

// ---------- auth ----------
app.use((req, res, next) => {
  if (!API_KEY || req.get('x-api-key') !== API_KEY) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }
  next();
});

// ---------- /trim ----------
app.post('/trim', handler(async (req) => {
  const { url, start = 0, duration } = req.body;
  if (!url || !duration) throw new Error('url and duration required');
  const input = await download(url);
  const name = id() + '.mp4';
  const out = path.join(OUT_DIR, name);
  try {
    await run('ffmpeg', ['-y', '-ss', String(start), '-i', input, '-t', String(duration),
      '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '28', '-c:a', 'aac', out]);
  } finally { cleanup([input]); }
  return { url: `${baseUrl(req)}/files/${name}` };
}));

// ---------- /concat ----------
app.post('/concat', handler(async (req) => {
  const { urls } = req.body;
  if (!Array.isArray(urls) || urls.length < 2) throw new Error('urls (2 or more) required');
  const inputs = [];
  for (const u of urls) inputs.push(await download(u));
  const name = id() + '.mp4';
  const out = path.join(OUT_DIR, name);
  const args = ['-y'];
  inputs.forEach((f) => args.push('-i', f));
  let filter = '';
  inputs.forEach((_, i) => {
    filter += `[${i}:v]scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30[v${i}];`;
    filter += `[${i}:a]aresample=44100[a${i}];`;
  });
  filter += inputs.map((_, i) => `[v${i}][a${i}]`).join('') + `concat=n=${inputs.length}:v=1:a=1[v][a]`;
  args.push('-filter_complex', filter, '-map', '[v]', '-map', '[a]',
    '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '28', '-c:a', 'aac', out);
  try { await run('ffmpeg', args); } finally { cleanup(inputs); }
  return { url: `${baseUrl(req)}/files/${name}` };
}));

// ---------- /audio-extract ----------
async function extractAudio(input, outName) {
  const out = path.join(OUT_DIR, outName);
  await run('ffmpeg', ['-y', '-i', input, '-vn', '-ac', '1', '-ar', '16000', '-b:a', '32k', out]);
  return out;
}

app.post('/audio-extract', handler(async (req) => {
  const { url } = req.body;
  if (!url) throw new Error('url required');
  const input = await download(url);
  const name = id() + '.mp3';
  try { await extractAudio(input, name); } finally { cleanup([input]); }
  return { url: `${baseUrl(req)}/files/${name}` };
}));

// ---------- /captions ----------
function toSrtTime(s) {
  const ms = Math.round(s * 1000);
  const h = String(Math.floor(ms / 3600000)).padStart(2, '0');
  const m = String(Math.floor((ms % 3600000) / 60000)).padStart(2, '0');
  const sec = String(Math.floor((ms % 60000) / 1000)).padStart(2, '0');
  const mm = String(ms % 1000).padStart(3, '0');
  return `${h}:${m}:${sec},${mm}`;
}

app.post('/captions', handler(async (req) => {
  const { url, burn = false } = req.body;
  if (!url) throw new Error('url required');
  if (!CF_ACCOUNT_ID || !CF_API_TOKEN) throw new Error('CF_ACCOUNT_ID / CF_API_TOKEN not set on Render');
  const input = await download(url);
  const audioName = id() + '.mp3';
  let audioPath;
  try {
    audioPath = await extractAudio(input, audioName);
    const b64 = (await fsp.readFile(audioPath)).toString('base64');
    const r = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/run/@cf/openai/whisper-large-v3-turbo`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${CF_API_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ audio: b64 }),
      }
    );
    const j = await r.json();
    if (!j.success) throw new Error('Whisper error: ' + JSON.stringify(j.errors || j).slice(0, 400));
    const result = j.result || {};
    const segments = result.segments || [];
    const srt = segments
      .map((s, i) => `${i + 1}\n${toSrtTime(s.start)} --> ${toSrtTime(s.end)}\n${(s.text || '').trim()}\n`)
      .join('\n');
    const srtName = id() + '.srt';
    const srtPath = path.join(OUT_DIR, srtName);
    await fsp.writeFile(srtPath, srt);
    const resp = { text: result.text || '', segments, srtUrl: `${baseUrl(req)}/files/${srtName}` };
    if (burn && srt) {
      const vName = id() + '.mp4';
      await run('ffmpeg', ['-y', '-i', input, '-vf',
        `subtitles=${srtPath}:force_style='FontSize=22,Outline=2'`,
        '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '28', '-c:a', 'copy',
        path.join(OUT_DIR, vName)]);
      resp.videoUrl = `${baseUrl(req)}/files/${vName}`;
    }
    return resp;
  } finally { cleanup([input, audioPath].filter(Boolean)); }
}));

// ---------- /silence-cut ----------
app.post('/silence-cut', handler(async (req) => {
  const { url, noise_db = -35, min_silence = 0.6, pad = 0.1 } = req.body;
  if (!url) throw new Error('url required');
  const input = await download(url);
  const scripts = [];
  try {
    const probe = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration',
      '-of', 'default=nw=1:nk=1', input]);
    const total = parseFloat(probe.out);
    const det = await run('ffmpeg', ['-i', input, '-af',
      `silencedetect=noise=${noise_db}dB:d=${min_silence}`, '-f', 'null', '-']);
    const starts = [...det.err.matchAll(/silence_start: ([\d.]+)/g)].map((m) => parseFloat(m[1]));
    const ends = [...det.err.matchAll(/silence_end: ([\d.]+)/g)].map((m) => parseFloat(m[1]));
    // speech segments = gaps between silences
    const segs = [];
    let cursor = 0;
    for (let i = 0; i < starts.length; i++) {
      const s = Math.max(0, starts[i] + pad);
      if (s - cursor > 0.15) segs.push([cursor, s]);
      cursor = ends[i] !== undefined ? Math.max(0, ends[i] - pad) : total;
    }
    if (total - cursor > 0.15) segs.push([cursor, total]);
    if (!segs.length) throw new Error('No speech detected');
    const expr = segs.map(([a, b]) => `between(t,${a.toFixed(3)},${b.toFixed(3)})`).join('+');
    const vf = path.join(TMP_DIR, id() + '.vf');
    const af = path.join(TMP_DIR, id() + '.af');
    scripts.push(vf, af);
    await fsp.writeFile(vf, `select='${expr}',setpts=N/FRAME_RATE/TB`);
    await fsp.writeFile(af, `aselect='${expr}',asetpts=N/SR/TB`);
    const name = id() + '.mp4';
        await run('ffmpeg', ['-y', '-i', input, '-filter_script:v', vf, '-filter_script:a', af,
      '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '28', '-c:a', 'aac',
      path.join(OUT_DIR, name)]);
    return { url: `${baseUrl(req)}/files/${name}`, original_seconds: total, kept_segments: segs.length };
  } finally { cleanup([input, ...scripts]); }
}));

// ---------- /frame ----------
app.post('/frame', handler(async (req) => {
  const { url, time = 0 } = req.body;
  if (!url) throw new Error('url required');
  const input = await download(url);
  const name = id() + '.jpg';
  try {
    await run('ffmpeg', ['-y', '-ss', String(time), '-i', input, '-frames:v', '1', '-q:v', '2',
      path.join(OUT_DIR, name)]);
  } finally { cleanup([input]); }
  return { url: `${baseUrl(req)}/files/${name}` };
}));

// ---------- /tts (free Edge voices) ----------
app.post('/tts', handler(async (req) => {
  const { text, voice = 'hi-IN-SwaraNeural' } = req.body;
  if (!text || !text.trim()) throw new Error('text required');
  if (text.length > 5000) throw new Error('text too long (max 5000 characters)');
  if (!/^[a-z]{2,3}-[A-Z]{2}-[A-Za-z]+Neural$/.test(voice)) throw new Error('invalid voice');
  const safe = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const { MsEdgeTTS, OUTPUT_FORMAT } = await import('msedge-tts');
  const tts = new MsEdgeTTS();
  await tts.setMetadata(voice, OUTPUT_FORMAT.WEBM_24KHZ_16BIT_MONO_OPUS);
  const { audioStream } = tts.toStream(safe);
  const chunks = [];
  await new Promise((resolve, reject) => {
    audioStream.on('data', (d) => chunks.push(d));
    audioStream.on('error', reject);
    audioStream.on('close', resolve);
  });
  if (!chunks.length) throw new Error('Voice generation failed, try again');
  const raw = path.join(TMP_DIR, id() + '.webm');
  await fsp.writeFile(raw, Buffer.concat(chunks));
  const name = id() + '.mp3';
  try {
    await run('ffmpeg', ['-y', '-i', raw, '-ac', '1', '-b:a', '96k', path.join(OUT_DIR, name)]);
  } finally { cleanup([raw]); }
  return { url: `${baseUrl(req)}/files/${name}` };
}));

app.listen(PORT, () => console.log('FFmpeg API running on', PORT));
