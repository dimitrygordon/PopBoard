#!/usr/bin/env node
// Copy pre-rendered narration (dNN/sN.mp3 + sN.json) into public/astro-course/audio/ and write
// manifest.json, which the player reads so it never probes for missing pages.
//   node tools/sync-narration.mjs [/workspace/astro-course/audio]
import { readdirSync, mkdirSync, copyFileSync, existsSync, writeFileSync, renameSync, statSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = process.argv[2] || "/workspace/astro-course/audio";
const OUT = join(ROOT, "public/astro-course/audio");
const decks = new Set(readdirSync(join(ROOT, "public/astro-course/decks")));
// source folders may use d17_5 / d24.5 for the d17-5 / d24-5 decks
const deckOf = (d) => [d, d.replace(/[_.]/g, "-")].find((x) => decks.has(x));
const man = {};
let copied = 0;
for (const d of existsSync(SRC) ? readdirSync(SRC) : []) {
  const slug = deckOf(d); if (!slug || !statSync(join(SRC, d)).isDirectory()) continue;
  mkdirSync(join(OUT, slug), { recursive: true });
  for (const f of readdirSync(join(SRC, d))) {
    const m = /^s(\d+)\.json$/.exec(f); if (!m || !existsSync(join(SRC, d, `s${m[1]}.mp3`))) continue;
    try { JSON.parse(readFileSync(join(SRC, d, f), "utf8")); } catch (e) { continue; } // still being written
    for (const ext of ["mp3", "json"]) {
      const a = join(SRC, d, `s${m[1]}.${ext}`), b = join(OUT, slug, `s${m[1]}.${ext}`);
      if (!existsSync(b) || statSync(b).size !== statSync(a).size) { copyFileSync(a, b); copied++; }
    }
  }
}
for (const slug of existsSync(OUT) ? readdirSync(OUT) : []) {
  if (!decks.has(slug)) continue;
  const ps = readdirSync(join(OUT, slug)).map((f) => /^s(\d+)\.json$/.exec(f)).filter(Boolean).map((x) => +x[1])
    .filter((n) => existsSync(join(OUT, slug, `s${n}.mp3`))).sort((a, b) => a - b);
  if (ps.length) man[slug] = ps;
}
writeFileSync(join(OUT, "manifest.json.tmp"), JSON.stringify(man)); renameSync(join(OUT, "manifest.json.tmp"), join(OUT, "manifest.json"));
console.log(`copied ${copied} files; ${Object.keys(man).length} decks, ${Object.values(man).reduce((a, v) => a + v.length, 0)} pages with narration`);
