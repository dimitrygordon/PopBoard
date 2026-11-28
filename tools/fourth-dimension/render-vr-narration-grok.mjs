// Beyond 3D VR storybook narration in a Grok voice (xAI text-to-speech, POST /v1/tts).
// Placeholder until Dimitry records his own read. Speaks each caption in vr4d-book.js exactly as written
// and writes public/fourth-dimension/audio/vr4d/s<N>.mp3 plus s<N>.json word times (from the API's
// character timestamps), then audio/manifest.json. Needs XAI_API_KEY in the environment.
// Usage: node tools/fourth-dimension/render-vr-narration-grok.mjs [--voice leo] [--only 1,2,3]
// Default voice is leo. Recordings replace the same filenames. See public/fourth-dimension/audio/vr4d/README.md.
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PAGES } from "../../public/fourth-dimension/vr/vr4d-book.js";
import { wordsFromChars } from "./narration-words.mjs";

const DEFAULT_VOICE = "leo";
const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const outDir = join(root, "public/fourth-dimension/audio/vr4d");
const key = process.env.XAI_API_KEY;
if (!key) throw new Error("XAI_API_KEY is not set");
mkdirSync(outDir, { recursive: true });

function arg(flag, fallback) {
  const i = process.argv.indexOf(flag);
  return i > 0 ? process.argv[i + 1] : fallback;
}
const voice = (arg("--voice", DEFAULT_VOICE) || DEFAULT_VOICE).toLowerCase();
const onlyRaw = arg("--only", null);
const only = onlyRaw ? new Set(onlyRaw.split(",").map(Number)) : null;

export const DEFAULT_VOICE_ID = DEFAULT_VOICE;

async function speak(text) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    const res = await fetch("https://api.x.ai/v1/tts", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        text, voice_id: voice, language: "en", with_timestamps: true,
        output_format: { codec: "mp3", sample_rate: 24000, bit_rate: 64000 },
      }),
    });
    if (res.ok) return res.json();
    if (res.status < 500 && res.status !== 429) throw new Error(`TTS ${res.status}: ${await res.text()}`);
    await new Promise((r) => setTimeout(r, 1500 * attempt));
  }
  throw new Error("TTS failed after retries");
}

console.log("voice", voice);
for (const page of PAGES) {
  if (only && !only.has(page.n)) continue;
  const data = await speak(page.text);
  const { graph_chars: chars, graph_times: times } = data.audio_timestamps;
  const duration = data.duration ?? times[times.length - 1][1];
  const words = wordsFromChars(page.text, chars, times, duration);
  writeFileSync(join(outDir, `s${page.n}.mp3`), Buffer.from(data.audio, "base64"));
  writeFileSync(join(outDir, `s${page.n}.json`), JSON.stringify({ words, duration: Math.round(duration * 1000) / 1000 }));
  console.log("s" + page.n, duration.toFixed(2) + "s", words.length, "words");
}
writeFileSync(join(root, "public/fourth-dimension/audio/manifest.json"), JSON.stringify({ vr4d: PAGES.map((p) => p.n), score: null }));
console.log("wrote", only ? only.size : PAGES.length, "clips");
