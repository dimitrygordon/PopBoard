#!/usr/bin/env node
// Render Friction Lesson narration with xAI TTS: one mp3 per page, listed in the manifest.
//   XAI_API_KEY=... node tools/friction-lesson/render-narration.mjs [1 2 ...] [--force]
// Offline only: the browser never calls TTS. Text comes from public/friction-lesson/narration/manifest.json
// (pages.N.text); the voice comes from tools/narration.config.json. Pages with empty text are skipped.
// Each page writes pN.mp3 (via .tmp + rename) and sets pages.N.audio; the manifest is rewritten atomically.
import { readFileSync, writeFileSync, existsSync, renameSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const DIR = join(ROOT, "public/friction-lesson/narration");
const MAN = join(DIR, "manifest.json");
const VOICE = JSON.parse(readFileSync(join(ROOT, "tools/narration.config.json"), "utf8")).voice;
const KEY = process.env.XAI_API_KEY;
if (!KEY) { console.error("XAI_API_KEY is not set."); process.exit(1); }
const args = process.argv.slice(2), force = args.includes("--force");
const only = args.filter((a) => /^\d+$/.test(a));

async function tts(text) {
  for (let attempt = 1; ; attempt++) {
    const r = await fetch("https://api.x.ai/v1/tts", { method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ text, voice_id: VOICE, language: "en" }) });
    if (r.ok) return r.json();
    if (attempt >= 4 || (r.status < 500 && r.status !== 429)) throw new Error(`TTS ${r.status}: ${await r.text()}`);
    await new Promise((res) => setTimeout(res, 2000 * attempt));
  }
}

const man = JSON.parse(readFileSync(MAN, "utf8"));
let made = 0;
for (const [n, entry] of Object.entries(man.pages)) {
  if (only.length && !only.includes(n)) continue;
  const text = (entry.text || "").replace(/\[/g, "(").replace(/\]/g, ")").trim();
  if (!text) continue;
  const name = `p${n}.mp3`, ap = join(DIR, name);
  if (!force && existsSync(ap)) { entry.audio = name; continue; }
  const res = await tts(text);
  const b64 = res.audio || res.audio_base64 || res.data;
  if (!b64) throw new Error(`page ${n}: no audio in response`);
  writeFileSync(ap + ".raw", Buffer.from(b64, "base64"));
  const enc = spawnSync("ffmpeg", ["-loglevel", "error", "-y", "-i", ap + ".raw", "-ac", "1", "-b:a", "48k", "-f", "mp3", ap + ".tmp"]);
  renameSync(enc.status === 0 ? ap + ".tmp" : ap + ".raw", ap);
  rmSync(ap + ".raw", { force: true });
  entry.audio = name; made++; console.log(`page ${n}: rendered`);
}
man.voice = VOICE;
if (Object.values(man.pages).every((p) => p.audio)) delete man.status;
writeFileSync(MAN + ".tmp", JSON.stringify(man, null, 2) + "\n"); renameSync(MAN + ".tmp", MAN);
console.log(`done: ${made} rendered`);
