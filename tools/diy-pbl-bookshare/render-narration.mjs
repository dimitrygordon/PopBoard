#!/usr/bin/env node
// Render Bookshare read-aloud audio with xAI TTS (voice "altair"): one mp3 per slide.
//   XAI_API_KEY=... node tools/diy-pbl-bookshare/render-narration.mjs [--force]
// Offline only; the browser never calls TTS. Text = SLIDES[n].narration from bs-data.js.
import { writeFileSync, existsSync, renameSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const DIR = join(ROOT, "public/diy-pbl-bookshare/narration");
const VOICE = "altair";
const KEY = process.env.XAI_API_KEY;
if (!KEY) { console.error("XAI_API_KEY is not set."); process.exit(1); }
const force = process.argv.includes("--force");
const { SLIDES } = await import(pathToFileURL(join(ROOT, "public/diy-pbl-bookshare/bs-data.js")).href);
async function tts(text) {
  for (let attempt = 1; ; attempt++) {
    const r = await fetch("https://api.x.ai/v1/tts", { method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ text, voice_id: VOICE, language: "en" }) });
    if (r.ok) return Buffer.from(await r.arrayBuffer());
    if (attempt >= 4 || (r.status < 500 && r.status !== 429)) throw new Error(`TTS ${r.status}: ${await r.text()}`);
    await new Promise((res) => setTimeout(res, 2000 * attempt));
  }
}
const pages = {};
async function one(s) {
  const n = String(s.n), text = String(s.narration || "").trim();
  if (!text) { pages[n] = { text: "" }; return; }
  const name = `p${n}.mp3`, ap = join(DIR, name);
  if (force || !existsSync(ap)) {
    writeFileSync(ap + ".raw", await tts(text));
    const enc = spawnSync("ffmpeg", ["-loglevel", "error", "-y", "-i", ap + ".raw", "-ac", "1", "-b:a", "48k", "-f", "mp3", ap + ".tmp"]);
    renameSync(enc.status === 0 ? ap + ".tmp" : ap + ".raw", ap); rmSync(ap + ".raw", { force: true });
    console.log(`slide ${n}: rendered`);
  }
  pages[n] = { text, audio: name };
}
const q = [...SLIDES];
await Promise.all(Array.from({ length: 6 }, async () => { while (q.length) await one(q.shift()); }));
const sorted = Object.fromEntries(Object.entries(pages).sort((a, b) => a[0] - b[0]));
const MAN = join(DIR, "manifest.json");
writeFileSync(MAN + ".tmp", JSON.stringify({ voice: VOICE, note: "Read-aloud audio, xAI TTS voice Altair. Dimitry can still narrate live.", pages: sorted }, null, 2) + "\n");
renameSync(MAN + ".tmp", MAN);
console.log("done");
