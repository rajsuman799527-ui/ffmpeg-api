const express = require('express');
const { execFile } = require('child_process');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
app.set('trust proxy', true);
app.use(express.json());

const OUT = '/tmp/out';
fs.mkdirSync(OUT, { recursive: true });
app.use('/files', express.static(OUT));

const id = () => crypto.randomBytes(6).toString('hex');
const base = (req) => `${req.protocol}://${req.get('host')}`;

function auth(req, res, next) {
  if (process.env.API_KEY && req.headers['x-api-key'] !== process.env.API_KEY)
    return res.status(401).json({ error: 'unauthorized' });
  next();
}

function run(args) {
  return new Promise((ok, fail) =>
    execFile('ffmpeg', args, { maxBuffer: 1024 * 1024 * 20 }, (e, so, se) =>
      e ? fail(new Error(String(se).slice(-500))) : ok()
    )
  );
}

async function download(url, dest) {
  const r = await fetch(url);
  if (!r.ok) throw new Error('download failed: ' + url);
  fs.writeFileSync(dest, Buffer.from(await r.arrayBuffer()));
}

app.get('/', (q, r) => r.send('ok'));

// body: { url, start, duration }
app.post('/trim', auth, async (req, res) => {
  try {
    const { url, start = 0, duration } = req.body;
    const n = id();
    const inp = `/tmp/${n}-in.mp4`;
    const out = `${OUT}/${n}.mp4`;
    await download(url, inp);
    const args = ['-y', '-ss', String(start), '-i', inp];
    if (duration) args.push('-t', String(duration));
    args.push('-c:v', 'libx264', '-preset', 'veryfast', '-c:a', 'aac', out);
    await run(args);
    fs.unlinkSync(inp);
    res.json({ url: `${base(req)}/files/${n}.mp4` });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// body: { urls: [..] }
app.post('/concat', auth, async (req, res) => {
  try {
    const { urls } = req.body;
    const n = id();
    const files = [];
    for (let i = 0; i < urls.length; i++) {
      const f = `/tmp/${n}-${i}.mp4`;
      await download(urls[i], f);
      files.push(f);
    }
    const list = `/tmp/${n}.txt`;
    fs.writeFileSync(list, files.map((f) => `file '${f}'`).join('\n'));
    const out = `${OUT}/${n}.mp4`;
    await run(['-y', '-f', 'concat', '-safe', '0', '-i', list,
      '-c:v', 'libx264', '-preset', 'veryfast', '-c:a', 'aac', out]);
    [...files, list].forEach((f) => fs.unlinkSync(f));
    res.json({ url: `${base(req)}/files/${n}.mp4` });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(process.env.PORT || 10000);
