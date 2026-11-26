#!/usr/bin/env node
// Packs storybook deck art so public/ stays far under Cloudflare Pages' 20,000-files-per-deploy cap.
//
//   node tools/pack-art/pack-art.mjs              pack every deck (idempotent; only decks with loose files are rewritten)
//   node tools/pack-art/pack-art.mjs <slug> ...   only these decks (d02, m22-l01, ...)
//   node tools/pack-art/pack-art.mjs --unpack     turn every pack back into loose .webp files (for editing art)
//   node tools/pack-art/pack-art.mjs --check      verify every pack against its index; exit 1 on any problem
//
// Deck art: public/{astro-course,physics101}/decks/<slug>/**/*.webp. Every .webp under a deck folder merges into
//   decks/<slug>/art-pack.bin    the webp bytes, back to back, grouped by page
//   decks/<slug>/art-pack.json   {v, size, files: {"v2/art/p01-bg.webp": [offset, length, page]}, groups: {"1": [offset, length]}}
// and the loose files are removed. A loose file that also exists in the pack replaces it, so the workflow is
// "build art with the lesson tools, run this, commit". Page = the number in p01-*, L01-*, s01-* names, else 0
// (deck-wide files). public/shared/pack/pack.js reads a page's byte range with one HTTP Range request.
//
// Narration (audio/<slug>/s<N>.mp3 + .json) is not packed: tools/render-narration.mjs and sync-narration.mjs build their
// manifest from those loose files.
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, unlinkSync, rmdirSync, mkdirSync } from "node:fs";
import { join, dirname, relative, basename } from "node:path";
import { fileURLToPath } from "node:url";

const PUB = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "public");
const COURSES = ["astro-course", "physics101"];
const MAX_PACK = 24 * 1024 * 1024; // Cloudflare Pages: 25 MiB per file
const BIN = "art-pack.bin", IDX = "art-pack.json";

const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]);
const pageOf = (path) => { const m = /^(?:p|L|s)(\d+)[-_.]/.exec(basename(path)); return m ? +m[1] : 0; };
const prune = (dir, stop) => { for (let d = dir; d !== stop && existsSync(d) && readdirSync(d).length === 0; d = dirname(d)) rmdirSync(d); };

function readPack(deck) {
  const idxF = join(deck, IDX), binF = join(deck, BIN);
  if (!existsSync(idxF)) return new Map();
  const idx = JSON.parse(readFileSync(idxF, "utf8")), bin = readFileSync(binF);
  if (bin.length !== idx.size) throw new Error(`${binF}: ${bin.length} bytes on disk, index says ${idx.size}`);
  return new Map(Object.entries(idx.files).map(([p, [o, l]]) => [p, bin.subarray(o, o + l)]));
}

function packDeck(deck) {
  const loose = walk(deck).filter((f) => f.endsWith(".webp"));
  if (!loose.length) return null;
  const files = readPack(deck);
  for (const f of loose) files.set(relative(deck, f).split("\\").join("/"), readFileSync(f));
  const order = [...files.keys()].sort((a, b) => pageOf(a) - pageOf(b) || (a < b ? -1 : 1));
  const chunks = [], idx = { v: 1, size: 0, files: {}, groups: {} };
  let off = 0;
  for (const p of order) {
    const b = files.get(p), g = pageOf(p);
    idx.files[p] = [off, b.length, g];
    const gr = idx.groups[g]; if (gr) gr[1] += b.length; else idx.groups[g] = [off, b.length];
    chunks.push(b); off += b.length;
  }
  if (off > MAX_PACK) throw new Error(`${deck}: pack is ${off} bytes, over the 24 MiB budget (Pages caps a file at 25 MiB)`);
  idx.size = off;
  writeFileSync(join(deck, BIN), Buffer.concat(chunks));
  writeFileSync(join(deck, IDX), JSON.stringify(idx));
  for (const f of loose) { unlinkSync(f); prune(dirname(f), deck); }
  return { files: files.size, loose: loose.length, bytes: off };
}

function unpackDeck(deck) {
  if (!existsSync(join(deck, IDX))) return null;
  const files = readPack(deck);
  for (const [p, b] of files) { const f = join(deck, p); mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, b); }
  unlinkSync(join(deck, BIN)); unlinkSync(join(deck, IDX));
  return { files: files.size };
}

function checkDeck(deck) {
  const bad = [];
  const loose = walk(deck).filter((f) => f.endsWith(".webp"));
  if (loose.length) bad.push(`${loose.length} loose .webp files (run pack-art.mjs)`);
  if (!existsSync(join(deck, IDX))) return loose.length ? bad : [];
  const idx = JSON.parse(readFileSync(join(deck, IDX), "utf8")), size = statSync(join(deck, BIN)).size;
  if (size !== idx.size) bad.push(`pack is ${size} bytes, index says ${idx.size}`);
  const bin = readFileSync(join(deck, BIN));
  for (const [p, [o, l, g]] of Object.entries(idx.files)) {
    if (o + l > size) bad.push(`${p} runs past the pack`);
    else if (bin.toString("latin1", o, o + 4) !== "RIFF" || bin.toString("latin1", o + 8, o + 12) !== "WEBP") bad.push(`${p} is not a webp`);
    const gr = idx.groups[g]; if (!gr || o < gr[0] || o + l > gr[0] + gr[1]) bad.push(`${p} outside its page range`);
  }
  return bad;
}

const args = process.argv.slice(2), flag = (f) => args.includes(f), only = args.filter((a) => !a.startsWith("--"));
const mode = flag("--unpack") ? "unpack" : flag("--check") ? "check" : "pack";
let n = 0, problems = 0;
for (const c of COURSES) {
  const root = join(PUB, c, "decks");
  if (!existsSync(root)) continue;
  for (const slug of readdirSync(root).sort()) {
    const dir = join(root, slug);
    if (!statSync(dir).isDirectory() || (only.length && !only.includes(slug))) continue;
    if (mode === "pack") { const r = packDeck(dir); if (r) { n++; console.log(`${c}/decks/${slug}: ${r.loose} loose, ${r.files} in pack, ${(r.bytes / 1048576).toFixed(1)} MiB`); } }
    else if (mode === "unpack") { const r = unpackDeck(dir); if (r) { n++; console.log(`${c}/decks/${slug}: ${r.files} files unpacked`); } }
    else for (const b of checkDeck(dir)) { problems++; console.log(`${c}/decks/${slug}: ${b}`); }
  }
}
if (mode === "check") { console.log(problems ? `${problems} problem(s)` : "packs ok"); process.exit(problems ? 1 : 0); }
console.log(`${mode}: ${n} folder(s) changed`);
