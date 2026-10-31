#!/usr/bin/env node
// Render storybook narration with xAI TTS: one mp3 plus a word-timestamp JSON per page.
//   XAI_API_KEY=... node tools/render-narration.mjs [d01 d02 ...] [--voice name] [--force]
// Offline only: the browser never calls TTS; the output is committed as static files.
//   node tools/render-narration.mjs --voices        (lists voices from GET /v1/tts/voices)
// Output: public/astro-course/audio/<deck>/s<N>.mp3 and s<N>.json ({ voice, textHash, words:[{w,start,end}] }).
// Idempotent and resumable: audio is rendered once; a page that already has its mp3 and JSON is skipped;
// files are written to .tmp and renamed, so an interrupted run never leaves a half file behind.
import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync, readdirSync, rmSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const TEXT_DIR = process.env.NARRATION_TEXT_DIR || "/workspace/astro-course/text";
const OUT = join(ROOT, "public/astro-course/audio");
const API = "https://api.x.ai/v1";
const args = process.argv.slice(2);
const flag = (k) => args.includes(k);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
// The one voice setting lives in tools/narration.config.json; --voice overrides it for a single run.
const VOICE = opt("--voice", JSON.parse(readFileSync(join(ROOT, "tools/narration.config.json"), "utf8")).voice);
const KEY = process.env.XAI_API_KEY;
const auth = { Authorization: `Bearer ${KEY}` };
const MAIN = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (MAIN && !KEY) { console.error("XAI_API_KEY is not set."); process.exit(1); }

if (MAIN && flag("--voices")) {
  const r = await fetch(`${API}/tts/voices`, { headers: auth });
  console.log(JSON.stringify(await r.json(), null, 2));
  process.exit(0);
}

// Deck slug -> text file (d17-5 -> d17_5.md; D01 uses d01_wendell.md).
function textFile(slug) {
  const alt = slug.replace(/[-.]/g, "_");
  for (const n of [`${slug}_wendell.md`, `${slug}.md`, `${alt}_wendell.md`, `${alt}.md`]) if (existsSync(join(TEXT_DIR, n))) return join(TEXT_DIR, n);
  return null;
}
// Spoken text per page: headings and paragraphs, markdown stripped, [brackets] become (parentheses)
// because xAI reads square brackets as speech tags.
export function pages(md) {
  const out = {}; let cur = null;
  for (const line of md.split("\n")) {
    const m = /^## Slide (\d+)/.exec(line);
    if (m) { cur = m[1]; out[cur] = []; continue; }
    if (cur == null || /^# /.test(line)) continue;
    const t = line.replace(/^#+\s*/, "").replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1")
      .replace(/\^\(?(-?\d+)\)?/g, " to the $1").replace(/\[/g, "(").replace(/\]/g, ")").trim();
    if (t) out[cur].push(t);
  }
  return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v.join("\n\n")]));
}
// Words from xAI's parallel graph_chars / graph_times ([start,end] per char), split on whitespace.
export function wordsFrom(ts) {
  const chars = ts.graph_chars || [], times = ts.graph_times || [], words = [];
  let w = "", start = null, end = null;
  const flush = () => { if (w) words.push({ w, start, end }); w = ""; start = end = null; };
  chars.forEach((c, i) => {
    if (/^\s+$/.test(c)) { flush(); return; }
    const [s, e] = times[i] || [end ?? 0, end ?? 0];
    if (start == null) start = s; end = e; w += c;
  });
  flush();
  return words;
}

async function tts(text) {
  for (let attempt = 1; ; attempt++) {
    const r = await fetch(`${API}/tts`, { method: "POST", headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({ text, voice_id: VOICE, language: "en", with_timestamps: true }) });
    if (r.ok) return r.json();
    if (attempt >= 4 || (r.status < 500 && r.status !== 429)) throw new Error(`TTS ${r.status}: ${await r.text()}`);
    await new Promise((res) => setTimeout(res, 2000 * attempt));
  }
}

if (MAIN) await main();
async function main() {
const decks = args.filter((a) => /^d\d/.test(a));
const all = decks.length ? decks : readdirSync(join(ROOT, "public/astro-course/decks")).filter((d) => /^d\d/.test(d));
let made = 0, skipped = 0;
for (const slug of all) {
  const f = textFile(slug);
  if (!f) { console.warn(`${slug}: no text file, skipped`); continue; }
  const dir = join(OUT, slug); mkdirSync(dir, { recursive: true });
  for (const [n, text] of Object.entries(pages(readFileSync(f, "utf8")))) {
    const hash = createHash("sha256").update(VOICE + "\n" + text).digest("hex").slice(0, 16);
    const jp = join(dir, `s${n}.json`), ap = join(dir, `s${n}.mp3`);
    if (!flag("--force") && existsSync(ap) && existsSync(jp)) {
      // rendered once: an existing, readable pair is never re-rendered (use --force to redo)
      try { JSON.parse(readFileSync(jp, "utf8")); skipped++; continue; } catch (e) { /* broken JSON: re-render */ }
    }
    const res = await tts(text);
    const b64 = res.audio || res.audio_base64 || res.data;
    if (!b64) throw new Error(`${slug} s${n}: no audio in response`);
    writeFileSync(ap + ".raw", Buffer.from(b64, "base64"));
    // Speech at 48 kbps mono keeps the committed audio small; falls back to the raw file without ffmpeg.
    const enc = spawnSync("ffmpeg", ["-loglevel", "error", "-y", "-i", ap + ".raw", "-ac", "1", "-b:a", "48k", "-f", "mp3", ap + ".tmp"]);
    renameSync(enc.status === 0 ? ap + ".tmp" : ap + ".raw", ap);
    if (enc.status === 0) rmSync(ap + ".raw", { force: true });
    const words = wordsFrom(res.audio_timestamps || {});
    writeFileSync(jp + ".tmp", JSON.stringify({ voice: VOICE, textHash: hash, words })); renameSync(jp + ".tmp", jp);
    made++; console.log(`${slug} s${n}: ${words.length} words`);
  }
}
// manifest of pages that have narration, read by the player (atomic write)
const man = {};
for (const d of readdirSync(OUT, { withFileTypes: true })) if (d.isDirectory()) {
  const ps = readdirSync(join(OUT, d.name)).map((f) => /^s(\d+)\.json$/.exec(f)).filter(Boolean).map((m) => +m[1])
    .filter((n) => existsSync(join(OUT, d.name, `s${n}.mp3`))).sort((a, b) => a - b);
  if (ps.length) man[d.name] = ps;
}
writeFileSync(join(OUT, "manifest.json.tmp"), JSON.stringify(man)); renameSync(join(OUT, "manifest.json.tmp"), join(OUT, "manifest.json"));
console.log(`done: ${made} rendered, ${skipped} already up to date`);
}
