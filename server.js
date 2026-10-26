"use strict";
// YouTube Studio AI - FFmpeg server (no npm packages needed, only Node 20 + ffmpeg)
//
// Endpoints (all POST, header x-api-key must equal the API_KEY env var):
//   /trim          {url, start, duration}                    -> {ok, url}
//   /concat        {urls:[...]}                              -> {ok, url}
//   /audio-extract {url}                                     -> {ok, url}
//   /frame         {url, time}                               -> {ok, url}
//   /silence-cut   {url, noise_db, min_silence, pad}         -> {ok, url, original_seconds, kept_segments}
//   /captions      {url, burn, language, prompt}             -> {ok, segments, text, srtUrl, videoUrl?}
// GET /            -> "ok"
// GET /files/<name> -> temporary result files (deleted after about 90 minutes)
//
// Optional env vars for /captions (Whisper on Cloudflare Workers AI):
//   CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN

const http = require("http");
const { spawn } = require("child_process");
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const os = require("os");
const crypto = require("crypto");
const { Readable, Transform } = require("stream");
const { pipeline } = require("stream/promises");

const PORT = Number(process.env.PORT) || 10000;
const API_KEY = process.env.API_KEY || "";
const CF_ACCOUNT = process.env.CLOUDFLARE_ACCOUNT_ID || "";
const CF_TOKEN = process.env.CLOUDFLARE_API_TOKEN || "";
const CF_BASE = (process.env.CF_API_BASE || "https://api.cloudflare.com/client/v4").replace(/\/$/, "");
const PUBLIC_URL = (process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || "").replace(/\/$/, "");

const MAX_DOWNLOAD = 600 * 1024 * 1024;
const KEEP_MS = 90 * 60 * 1000;
const CHUNK_SECONDS = 600;

const WORK = path.join(os.tmpdir(), "ysa-work");
const FILES = path.join(os.tmpdir(), "ysa-files");
fs.mkdirSync(WORK, { recursive: true });
fs.mkdirSync(FILES, { recursive: true });

class UserError extends Error {}

// ---------- small helpers ----------
function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { cwd: opts.cwd, stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    let err = "";
    p.stdout.on("data", (d) => (out += d));
    p.stderr.on("data", (d) => {
      err += d;
      if (!opts.keepAll && err.length > 100000) err = err.slice(-50000);
    });
    p.on("error", reject);
    p.on("close", (code) => {
      if (code === 0) return resolve({ out, err });
      const tail = err.trim().split("\n").slice(-4).join(" | ").slice(-400);
      reject(new Error(cmd + " failed: " + tail));
    });
  });
}

const ff = (args, opts) => run("ffmpeg", ["-y", "-nostdin", "-hide_banner", "-nostats", ...args], opts);

function num(v, name, { min = 0, max = 1e7, def, positive = false } = {}) {
  if (v === undefined || v === null || v === "") {
    if (def !== undefined) return def;
    throw new UserError(name + " is required");
  }
  const n = Number(v);
  if (!Number.isFinite(n) || n < min || n > max || (positive && n <= 0)) throw new UserError(name + " is not a valid number");
  return n;
}

function checkUrl(u) {
  let x;
  try { x = new URL(String(u)); } catch { throw new UserError("That clip link is not a valid URL."); }
  if (x.protocol !== "https:" && x.protocol !== "http:") throw new UserError("Clip links must start with http:// or https://");
  const h = x.hostname.toLowerCase();
  const privateHost = h === "localhost" || h.endsWith(".internal") || h.endsWith(".local") || h.startsWith("[") ||
    /^(127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.)/.test(h);
  if (privateHost && process.env.ALLOW_PRIVATE_URLS !== "1") // the switch is for local tests only
    throw new UserError("That link points to a private address, which is not allowed.");
  return x.toString();
}

async function download(url, dest) {
  const r = await fetch(checkUrl(url), { redirect: "follow", signal: AbortSignal.timeout(240000) });
  if (!r.ok || !r.body) throw new UserError("Could not download the clip (status " + r.status + "). The link may have expired.");
  let n = 0;
  const counter = new Transform({
    transform(chunk, _enc, cb) {
      n += chunk.length;
      n > MAX_DOWNLOAD ? cb(new UserError("This file is too big for the free server (limit 600 MB).")) : cb(null, chunk);
    },
  });
  await pipeline(Readable.fromWeb(r.body), counter, fs.createWriteStream(dest));
}

async function probe(file, entries) {
  const { out } = await run("ffprobe", ["-v", "error", ...entries, "-of", "csv=p=0", file]);
  return out.trim();
}

async function duration(file) {
  const d = parseFloat(await probe(file, ["-show_entries", "format=duration"]));
  if (!Number.isFinite(d)) throw new UserError("Could not read this file. Is it a valid video?");
  return d;
}

async function hasAudio(file) {
  return (await probe(file, ["-select_streams", "a", "-show_entries", "stream=index"])).length > 0;
}

// Saves a finished file where /files can serve it and returns its public link.
async function publish(file, ext, ctx) {
  const name = crypto.randomUUID() + "." + ext;
  await fsp.copyFile(file, path.join(FILES, name));
  const base = PUBLIC_URL || ctx.origin;
  return base + "/files/" + name;
}

const VIDEO_OUT = ["-c:v", "libx264", "-preset", "ultrafast", "-crf", "26", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart"];
const EVEN = "scale=trunc(iw/2)*2:trunc(ih/2)*2";

// ---------- tools ----------
const tools = {};

tools["/trim"] = async (b, dir, ctx) => {
  const start = num(b.start, "start", { def: 0 });
  const dur = num(b.duration, "duration", { positive: true });
  const input = path.join(dir, "in.mp4");
  const output = path.join(dir, "out.mp4");
  await download(b.url, input);
  await ff(["-ss", String(start), "-i", input, "-t", String(dur), "-vf", EVEN, ...VIDEO_OUT, output]);
  return { url: await publish(output, "mp4", ctx) };
};

tools["/concat"] = async (b, dir, ctx) => {
  if (!Array.isArray(b.urls) || b.urls.length < 2 || b.urls.length > 10) throw new UserError("Pick 2 to 10 clips to join.");
  const parts = [];
  for (let i = 0; i < b.urls.length; i++) {
    const raw = path.join(dir, "raw" + i + ".mp4");
    const norm = path.join(dir, "norm" + i + ".mp4");
    await download(b.urls[i], raw);
    const vf = "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30";
    const audio = await hasAudio(raw);
    const args = audio
      ? ["-i", raw, "-vf", vf, "-c:v", "libx264", "-preset", "ultrafast", "-crf", "26", "-pix_fmt", "yuv420p", "-c:a", "aac", "-ar", "44100", "-ac", "2", norm]
      : ["-i", raw, "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo", "-map", "0:v:0", "-map", "1:a:0", "-shortest", "-vf", vf, "-c:v", "libx264", "-preset", "ultrafast", "-crf", "26", "-pix_fmt", "yuv420p", "-c:a", "aac", norm];
    await ff(args);
    await fsp.rm(raw, { force: true });
    parts.push(norm);
  }
  const list = path.join(dir, "list.txt");
  await fsp.writeFile(list, parts.map((p) => "file '" + p.replace(/'/g, "'\\''") + "'").join("\n"));
  const output = path.join(dir, "joined.mp4");
  await ff(["-f", "concat", "-safe", "0", "-i", list, "-c", "copy", "-movflags", "+faststart", output]);
  return { url: await publish(output, "mp4", ctx) };
};

tools["/audio-extract"] = async (b, dir, ctx) => {
  const input = path.join(dir, "in.mp4");
  const output = path.join(dir, "audio.mp3");
  await download(b.url, input);
  if (!(await hasAudio(input))) throw new UserError("This clip has no audio track.");
  await ff(["-i", input, "-vn", "-c:a", "libmp3lame", "-b:a", "128k", output]);
  return { url: await publish(output, "mp3", ctx) };
};

tools["/frame"] = async (b, dir, ctx) => {
  const t = num(b.time, "time", { def: 1 });
  const input = path.join(dir, "in.mp4");
  const output = path.join(dir, "frame.jpg");
  await download(b.url, input);
  await ff(["-ss", String(t), "-i", input, "-frames:v", "1", "-q:v", "2", output]);
  if (!fs.existsSync(output)) throw new UserError("That time is past the end of the video.");
  return { url: await publish(output, "jpg", ctx) };
};

tools["/silence-cut"] = async (b, dir, ctx) => {
  const db = num(b.noise_db ?? b.threshold_db, "noise_db", { min: -90, max: 0, def: -35 });
  const minSil = num(b.min_silence, "min_silence", { min: 0.1, max: 30, def: 0.6 });
  const pad = num(b.pad, "pad", { min: 0, max: 1, def: 0.1 });
  const input = path.join(dir, "in.mp4");
  const output = path.join(dir, "cut.mp4");
  await download(b.url, input);
  if (!(await hasAudio(input))) throw new UserError("This clip has no audio, so there are no silences to cut.");
  const dur = await duration(input);

  const { err } = await ff(["-i", input, "-af", "silencedetect=noise=" + db + "dB:d=" + minSil, "-vn", "-f", "null", "-"], { keepAll: true });
  const silences = [];
  for (const line of err.split("\n")) {
    let m = line.match(/silence_start:\s*(-?[0-9.]+)/);
    if (m) silences.push({ s: Math.max(0, parseFloat(m[1])), e: dur });
    m = line.match(/silence_end:\s*(-?[0-9.]+)/);
    if (m && silences.length) silences[silences.length - 1].e = Math.min(dur, parseFloat(m[1]));
  }
  if (!silences.length) {
    const url = await publish(input, "mp4", ctx);
    return { url, original_seconds: round(dur), new_seconds: round(dur), kept_segments: [[0, round(dur)]], note: "No silence found." };
  }

  // speech = everything that is not silence, widened by the padding, then merged
  let raw = [];
  let cur = 0;
  for (const sl of silences) {
    if (sl.s - cur > 0.05) raw.push([cur, sl.s]);
    cur = Math.max(cur, sl.e);
  }
  if (dur - cur > 0.05) raw.push([cur, dur]);
  const keeps = [];
  for (const [a, e] of raw) {
    const s = Math.max(0, a - pad);
    const f = Math.min(dur, e + pad);
    if (keeps.length && s <= keeps[keeps.length - 1][1]) keeps[keeps.length - 1][1] = f;
    else keeps.push([s, f]);
  }
  const final = keeps.filter(([a, e]) => e - a >= 0.15);
  if (!final.length) throw new UserError("Everything was detected as silence. Lower the sensitivity (for example -45 dB) and try again.");

  const withVideo = (await probe(input, ["-select_streams", "v", "-show_entries", "stream=index"])).length > 0;
  const lines = [];
  final.forEach(([a, e], i) => {
    if (withVideo) lines.push("[0:v]trim=start=" + a.toFixed(3) + ":end=" + e.toFixed(3) + ",setpts=PTS-STARTPTS[v" + i + "]");
    lines.push("[0:a]atrim=start=" + a.toFixed(3) + ":end=" + e.toFixed(3) + ",asetpts=PTS-STARTPTS[a" + i + "]");
  });
  const joins = final.map((_, i) => (withVideo ? "[v" + i + "]" : "") + "[a" + i + "]").join("");
  lines.push(joins + "concat=n=" + final.length + ":v=" + (withVideo ? 1 : 0) + ":a=1" + (withVideo ? "[v][a]" : "[a]"));
  const script = path.join(dir, "filter.txt");
  await fsp.writeFile(script, lines.join(";\n"));
  const maps = withVideo ? ["-map", "[v]", "-map", "[a]"] : ["-map", "[a]"];
  await ff(["-i", input, "-filter_complex_script", script, ...maps, ...(withVideo ? ["-c:v", "libx264", "-preset", "ultrafast", "-crf", "26", "-pix_fmt", "yuv420p"] : []), "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", output]);

  const kept = final.reduce((n, [a, e]) => n + (e - a), 0);
  return {
    url: await publish(output, "mp4", ctx),
    original_seconds: round(dur),
    new_seconds: round(kept),
    kept_segments: final.map(([a, e]) => [round(a), round(e)]),
  };
};

// ---------- captions (Whisper on Cloudflare Workers AI) ----------
function round(n) { return Math.round(n * 1000) / 1000; }

function srtTime(sec) {
  const ms = Math.max(0, Math.round(sec * 1000));
  const p = (n, l = 2) => String(n).padStart(l, "0");
  return p(Math.floor(ms / 3600000)) + ":" + p(Math.floor(ms / 60000) % 60) + ":" + p(Math.floor(ms / 1000) % 60) + "," + p(ms % 1000, 3);
}

function toSrt(segments) {
  return segments.map((g, i) => i + 1 + "\n" + srtTime(g.start) + " --> " + srtTime(g.end) + "\n" + g.text + "\n").join("\n");
}

async function whisper(file, language, prompt, chunkLen) {
  const buf = await fsp.readFile(file);
  const body = { audio: buf.toString("base64") };
  if (language) body.language = String(language);
  if (prompt) body.initial_prompt = String(prompt).slice(0, 500);
  const url = CF_BASE + "/accounts/" + CF_ACCOUNT + "/ai/run/@cf/openai/whisper-large-v3-turbo";
  let res, json = {};
  for (let attempt = 0; attempt < 2; attempt++) {
    res = await fetch(url, {
      method: "POST",
      headers: { Authorization: "Bearer " + CF_TOKEN, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120000),
    }).catch(() => null);
    if (res) json = await res.json().catch(() => ({}));
    if (res && res.status < 500) break;
  }
  if (!res) throw new Error("Could not reach Cloudflare Whisper.");
  if (!res.ok || json.success === false) {
    const msg = JSON.stringify(json.errors || json).slice(0, 300);
    if (res.status === 429 || /4006|daily free allocation|neurons/i.test(msg))
      throw new UserError("Today's free Whisper limit is used up. It resets at 5:30 AM IST.");
    if (res.status === 401 || res.status === 403) throw new UserError("Cloudflare rejected the token on the video server. Check CLOUDFLARE_API_TOKEN in Render > Environment.");
    throw new Error("Whisper failed: " + msg);
  }
  const r = json.result || {};
  let segs = Array.isArray(r.segments) ? r.segments.map((s) => ({ start: Number(s.start) || 0, end: Number(s.end) || 0, text: String(s.text || "").trim() })).filter((s) => s.text) : [];
  if (!segs.length && r.text && String(r.text).trim()) segs = [{ start: 0, end: chunkLen, text: String(r.text).trim() }];
  return segs;
}

tools["/captions"] = async (b, dir, ctx) => {
  if (!CF_ACCOUNT || !CF_TOKEN) throw new UserError("Captions are not set up on the video server yet. Add CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN in Render > Environment.");
  const input = path.join(dir, "in.mp4");
  await download(b.url, input);
  if (!(await hasAudio(input))) throw new UserError("This clip has no audio to caption.");
  await ff(["-i", input, "-vn", "-ac", "1", "-ar", "16000", "-c:a", "libmp3lame", "-b:a", "32k", "-f", "segment", "-segment_time", String(CHUNK_SECONDS), "-reset_timestamps", "1", path.join(dir, "chunk%03d.mp3")]);
  const chunks = (await fsp.readdir(dir)).filter((n) => /^chunk\d+\.mp3$/.test(n)).sort();
  const segments = [];
  let offset = 0;
  for (const name of chunks) {
    const file = path.join(dir, name);
    const len = await duration(file);
    const segs = await whisper(file, b.language, b.prompt, len);
    for (const s of segs) segments.push({ start: round(s.start + offset), end: round(Math.max(s.end, s.start) + offset), text: s.text });
    offset += len;
  }
  if (!segments.length) throw new UserError("No speech was found in this clip.");
  const srt = toSrt(segments);
  const srtFile = path.join(dir, "captions.srt");
  await fsp.writeFile(srtFile, srt);
  const out = { segments, text: segments.map((s) => s.text).join(" "), srtUrl: await publish(srtFile, "srt", ctx) };

  if (b.burn === true) {
    try {
      await fsp.writeFile(path.join(dir, "subs.srt"), srt);
      await ff(["-i", "in.mp4", "-vf", "subtitles=subs.srt:force_style='FontName=DejaVu Sans,FontSize=18,Outline=2,Alignment=2'", "-c:v", "libx264", "-preset", "ultrafast", "-crf", "26", "-pix_fmt", "yuv420p", "-c:a", "copy", "-movflags", "+faststart", "burned.mp4"], { cwd: dir });
      out.videoUrl = await publish(path.join(dir, "burned.mp4"), "mp4", ctx);
    } catch (e) {
      out.burn_error = String(e.message || e).slice(0, 200); // the SRT is still returned
    }
  }
  return out;
};

// ---------- one job at a time (the free server is small) ----------
let chain = Promise.resolve();
function enqueue(fn) {
  const p = chain.then(fn);
  chain = p.catch(() => {});
  return p;
}

// ---------- HTTP ----------
const TYPES = { mp4: "video/mp4", mp3: "audio/mpeg", jpg: "image/jpeg", srt: "text/plain; charset=utf-8" };

function send(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) });
  res.end(body);
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const parts = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > 1024 * 1024) { reject(new UserError("Request too large")); req.destroy(); return; }
      parts.push(c);
    });
    req.on("end", () => {
      try { resolve(parts.length ? JSON.parse(Buffer.concat(parts).toString("utf8")) : {}); }
      catch { reject(new UserError("Body must be valid JSON")); }
    });
    req.on("error", reject);
  });
}

function serveFile(req, res, name) {
  const m = name.match(/^[a-f0-9-]{36}\.(mp4|mp3|jpg|srt)$/);
  if (!m) { res.writeHead(404); return res.end("not found"); }
  const file = path.join(FILES, name);
  fs.stat(file, (e, st) => {
    if (e || !st.isFile()) { res.writeHead(404); return res.end("expired or not found"); }
    const headers = { "Content-Type": TYPES[m[1]], "Accept-Ranges": "bytes", "Access-Control-Allow-Origin": "*", "Cache-Control": "private, max-age=3600" };
    const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || "");
    if (range && (range[1] || range[2])) {
      let start = range[1] ? parseInt(range[1], 10) : st.size - parseInt(range[2], 10);
      let end = range[1] && range[2] ? parseInt(range[2], 10) : st.size - 1;
      start = Math.max(0, start); end = Math.min(st.size - 1, end);
      if (start > end) { res.writeHead(416, { "Content-Range": "bytes */" + st.size }); return res.end(); }
      res.writeHead(206, { ...headers, "Content-Range": "bytes " + start + "-" + end + "/" + st.size, "Content-Length": end - start + 1 });
      return req.method === "HEAD" ? res.end() : fs.createReadStream(file, { start, end }).pipe(res);
    }
    res.writeHead(200, { ...headers, "Content-Length": st.size });
    return req.method === "HEAD" ? res.end() : fs.createReadStream(file).pipe(res);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://x");
    if ((req.method === "GET" || req.method === "HEAD") && url.pathname === "/") { res.writeHead(200, { "Content-Type": "text/plain" }); return res.end("ok"); }
    if ((req.method === "GET" || req.method === "HEAD") && url.pathname.startsWith("/files/")) return serveFile(req, res, url.pathname.slice(7));
    if (req.method !== "POST" || !tools[url.pathname]) return send(res, 404, { ok: false, error: "not found" });

    if (!API_KEY) return send(res, 500, { ok: false, error: "API_KEY is not set on the server (Render > Environment)." });
    if (!safeEqual(req.headers["x-api-key"] || "", API_KEY)) return send(res, 401, { ok: false, error: "invalid api key" });

    const body = await readJson(req);
    const proto = String(req.headers["x-forwarded-proto"] || "http").split(",")[0];
    const ctx = { origin: proto + "://" + (req.headers["x-forwarded-host"] || req.headers.host) };
    const result = await enqueue(async () => {
      const dir = await fsp.mkdtemp(path.join(WORK, "j-"));
      try { return await tools[url.pathname](body, dir, ctx); }
      finally { fsp.rm(dir, { recursive: true, force: true }).catch(() => {}); }
    });
    send(res, 200, { ok: true, ...result });
  } catch (e) {
    const user = e instanceof UserError;
    if (!user) console.error("job failed:", e && e.message);
    if (!res.headersSent) send(res, user ? 400 : 500, { ok: false, error: String((e && e.message) || e).slice(0, 400) });
  }
});

setInterval(() => {
  const cutoff = Date.now() - KEEP_MS;
  for (const dirPath of [FILES, WORK]) {
    fsp.readdir(dirPath).then((n
