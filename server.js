// FFmpeg API (no npm packages needed, Node 18+ and ffmpeg only)
const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const { pipeline } = require('stream/promises');
const { Readable } = require('stream');

const VERSION = 'v2-no-deps';
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY;
const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || process.env.CF_ACCOUNT_ID;
const CF_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN || process.env.CF_API_TOKEN;
const OUT_DIR = '/tmp/out';
const TMP_DIR = '/tmp/work';
const KEEP_MS = 90 * 60 * 1000; // output files live about 90 minutes
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(TMP_DIR, { recursive: true });

// ---------- helpers ----------
const id = () => crypto.randomBytes(6).toString('hex');

function baseUrl(req) {
  return process.env.PUBLIC_URL || `https://${req.headers.host}`;
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

function cleanup(files) {
  for (const f of files) if (f) fsp.unlink(f).catch(() => {});
}

// one job at a time (free server is tiny)
let chain = Promise.resolve();
function queue(fn) {
  const next = chain.then(fn, fn);
  chain = next.catch(() => {});
  return next;
}

// delete old files every 10 min
setInterval(async () => {
  for (const dir of [OUT_DIR, TMP_DIR]) {
    try {
      for (const f of await fsp.readdir(dir)) {
        const p = path.join(dir, f);
        const st = await fsp.stat(p);
        if (Date.now() - st.mtimeMs > KEEP_MS) fsp.unlink(p).catch(() => {});
      }
    } catch (e) {}
  }
}, 10 * 60 * 1000);

// ---------- routes ----------
const routes = {};

routes['/trim'] = async (body, req) => {
  const { url, start = 0, duration } = body;
  if (!url || !duration) throw new Error('url and duration required');
  const input = await download(url);
  const name = id() + '.mp4';
  try {
    await run('ffmpeg', ['-y', '-ss', String(start), '-i', input, '-t', String(duration),
      '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '28', '-c:a', 'aac',
      path.join(OUT_DIR, name)]);
  } finally { cleanup([input]); }
  return { url: `${baseUrl(req)}/files/${name}` };
};

routes['/concat'] = async (body, req) => {
  const { urls } = body;
  if (!Array.isArray(urls) || urls.length < 2) throw new Error('urls (2 or more) required');
  const inputs = [];
  try {
    for (const u of urls) inputs.push(await download(u));
    const name = id() + '.mp4';
    const args = ['-y'];
    inputs.forEach((f) => args.push('-i', f));
    let filter = '';
    inputs.forEach((_, i) => {
      filter += `[${i}:v]scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30[v${i}];`;
      filter += `[${i}:a]aresample=44100[a${i}];`;
    });
    filter += inputs.map((_, i) => `[v${i}][a${i}]`).join('') + `concat=n=${inputs.length}:v=1:a=1[v][a]`;
    args.push('-filter_complex', filter, '-map', '[v]', '-map', '[a]',
      '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '28', '-c:a', 'aac',
      path.join(OUT_DIR, name));
    await run('ffmpeg', args);
    return { url: `${baseUrl(req)}/files/${name}` };
  } finally { cleanup(inputs); }
};

async function extractAudio(input, outName) {
  const out = path.join(OUT_DIR, outName);
  await run('ffmpeg', ['-y', '-i', input, '-vn', '-ac', '1', '-ar', '16000', '-b:a', '32k', out]);
  return out;
}

routes['/audio-extract'] = async (body, req) => {
  const { url } = body;
  if (!url) throw new Error('url required');
  const input = await download(url);
  const name = id() + '.mp3';
  try { await extractAudio(input, name); } finally { cleanup([input]); }
  return { url: `${baseUrl(req)}/files/${name}` };
};

function toSrtTime(s) {
  const ms = Math.round(s * 1000);
  const h = String(Math.floor(ms / 3600000)).padStart(2, '0');
  const m = String(Math.floor((ms % 3600000) / 60000)).padStart(2, '0');
  const sec = String(Math.floor((ms % 60000) / 1000)).padStart(2, '0');
  const mm = String(ms % 1000).padStart(3, '0');
  return `${h}:${m}:${sec},${mm}`;
}

routes['/captions'] = async (body, req) => {
  const { url, burn = false, language, prompt } = body;
  if (!url) throw new Error('url required');
  if (!CF_ACCOUNT_ID || !CF_API_TOKEN) {
    throw new Error('CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN not set on Render');
  }
  const input = await download(url);
  const audioName = id() + '.mp3';
  let audioPath;
  try {
    audioPath = await extractAudio(input, audioName);
    const b64 = (await fsp.readFile(audioPath)).toString('base64');
    const payload = { audio: b64 };
    if (language) payload.language = language;
    if (prompt) payload.initial_prompt = prompt;
    const r = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/run/@cf/openai/whisper-large-v3-turbo`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${CF_API_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );
    const j = await r.json();
    if (!j.success) throw new Error('Whisper error: ' + JSON.stringify(j.errors || j).slice(0, 400));
    const result = j.result || {};
    const segments = (result.segments || []).map((s) => ({
      start: s.start, end: s.end, text: (s.text || '').trim(),
    }));
    const srt = segments
      .map((s, i) => `${i + 1}\n${toSrtTime(s.start)} --> ${toSrtTime(s.end)}\n${s.text}\n`)
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
  } finally { cleanup([input, audioPath]); }
};

routes['/silence-cut'] = async (body, req) => {
  const { url, noise_db = -35, min_silence = 0.6, pad = 0.1 } = body;
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
    const kept = segs.reduce((sum, [a, b]) => sum + (b - a), 0);
    return {
      url: `${baseUrl(req)}/files/${name}`,
      original_seconds: total,
      new_seconds: Math.round(kept * 100) / 100,
      kept_segments: segs.map(([a, b]) => [Math.round(a * 1000) / 1000, Math.round(b * 1000) / 1000]),
    };
  } finally { cleanup([input, ...scripts]); }
};

routes['/frame'] = async (body, req) => {
  const { url, time = 0 } = body;
  if (!url) throw new Error('url required');
  const input = await download(url);
  const name = id() + '.jpg';
  try {
    await run('ffmpeg', ['-y', '-ss', String(time), '-i', input, '-frames:v', '1', '-q:v', '2',
      path.join(OUT_DIR, name)]);
  } finally { cleanup([input]); }
  return { url: `${baseUrl(req)}/files/${name}` };
};

// ---------- http server ----------
function send(res, code, obj, extra) {
  const data = typeof obj === 'string' ? obj : JSON.stringify(obj);
  res.writeHead(code, Object.assign({
    'Content-Type': typeof obj === 'string' ? 'text/plain' : 'application/json',
    'Access-Control-Allow-Origin': '*',
  }, extra || {}));
  res.end(data);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (c) => {
      raw += c;
      if (raw.length > 2 * 1024 * 1024) { reject(new Error('Body too large')); req.destroy(); }
    });
    req.on('end', () => {
      try { resolve(raw ? JSON.parse(raw) : {}); } catch (e) { reject(new Error('Invalid JSON')); }
    });
    req.on('error', reject);
  });
}

const MIME = { '.mp4': 'video/mp4', '.mp3': 'audio/mpeg', '.jpg': 'image/jpeg', '.srt': 'text/plain; charset=utf-8' };

const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, 'http://localhost');
    const pathname = u.pathname;

    if (req.method === 'OPTIONS') {
      return send(res, 204, '', {
        'Access-Control-Allow-Headers': 'content-type, x-api-key',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      });
    }
    if (req.method === 'GET' && pathname === '/') return send(res, 200, 'ok');
    if (req.method === 'GET' && pathname === '/version') {
      return send(res, 200, { ok: true, version: VERSION });
    }
    if (req.method === 'GET' && pathname.startsWith('/files/')) {
      const name = path.basename(pathname);
      const file = path.join(OUT_DIR, name);
      if (!fs.existsSync(file)) return send(res, 404, { ok: false, error: 'File not found or expired' });
      res.writeHead(200, {
        'Content-Type': MIME[path.extname(name)] || 'application/octet-stream',
        'Access-Control-Allow-Origin': '*',
      });
      return fs.createReadStream(file).pipe(res);
    }

    // everything below needs the key
    if (!API_KEY || req.headers['x-api-key'] !== API_KEY) {
      return send(res, 401, { ok: false, error: 'Unauthorized' });
    }
    const fn = req.method === 'POST' ? routes[pathname] : null;
    if (!fn) return send(res, 404, { ok: false, error: 'No such route: ' + pathname });

    const body = await readBody(req);
    try {
      const data = await queue(() => fn(body, req));
      send(res, 200, Object.assign({ ok: true }, data));
    } catch (e) {
      send(res, 500, { ok: false, error: e.message });
    }
  } catch (e) {
    send(res, 400, { ok: false, error: e.message });
  }
});

server.listen(PORT, () => console.log('FFmpeg API running on', PORT, VERSION));
    
