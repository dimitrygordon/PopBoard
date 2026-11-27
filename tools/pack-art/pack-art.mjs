#!/usr/bin/env node
// Packs storybook deck art so public/ stays far under Cloudflare Pages' 20,000-files-per-deploy cap.
//
//   node tools/pack-art/pack-art.mjs              pack every deck (idempotent; only decks with loose files are rewritten)
//   node tools/pack-art/pack-art.mjs <slug> ...   only these decks (d02, m22-l01, ...)
//   node tools/pack-art/pack-art.mjs --unpack     turn every pack back into loose .webp files (for editing art)
//   node tools/pack-art/pack-art.mjs --check      verify every pack; exit 1 on any problem
//
// Deck art: public/{astro-course,physics101}/decks/<slug>/**/*.webp. Every .webp under a deck folder merges into
//   decks/<slug>/art-pack/<NN>.bin   one file per page: the page's webp files back to back
//   decks/<slug>/art-pack.json       {"v":2,"pages":[0,1,2,...]}  which page packs exist
// and the loose files are removed. A loose file that also exists in a pack replaces it, so the workflow is
// "build art with the lesson tools, run this, commit". Page = the number in p01-*, L01-*, s01-* names; page 0 holds
// deck-wide files (paper texture, hatch tile). public/shared/pack/pack.js fetches a page pack when the page is shown.
//
// Page pack bytes: "PBAP" | u32 LE header length | header JSON {"files": [[path, byteLength], ...]} | file bytes.
// Narration (audio/<slug>/s<N>.mp3 + .json) is not packed: tools/render-narration.mjs and sync-narration.mjs build their
// manifest from those loose files.
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, unlinkSync, rmdirSync, rmSync, mkdirSync } from "node:fs";
import { join, dirname, relative, basename } from "node:path";
import { fileURLToPath } from "node:url";

const PUB = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "public");
const COURSES = ["astro-course", "physics101"];
const MAGIC = "PBAP", DIR = "art-pack", IDX = "art-pack.json";
const pageFile = (deck, g) => join(deck, DIR, String(g).padStart(2, "0") + ".bin");

const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]);
const pageOf = (path) => { const m = /^(?:p|L|s)(\d+)[-_.]/.exec(basename(path)); return m ? +m[1] : 0; };
const prune = (dir, stop) => { for (let d = dir; d !== stop && existsSync(d) && readdirSync(d).length === 0; d = dirname(d)) rmdirSync(d); };

function encode(entries) { // entries: [[path, Buffer], ...]
  const head = Buffer.from(JSON.stringify({ files: entries.map(([p, b]) => [p, b.length]) }));
  const len = Buffer.alloc(4); len.writeUInt32LE(head.length);
  return Buffer.concat([Buffer.from(MAGIC), len, head, ...entries.map(([, b]) => b)]);
}
function decode(buf, where) {
  if (buf.toString("latin1", 0, 4) !== MAGIC) throw new Error(`${where}: not a page pack`);
  const hl = buf.readUInt32LE(4), head = JSON.parse(buf.toString("utf8", 8, 8 + hl));
  let off = 8 + hl; const out = [];
  for (const [p, l] of head.files) { out.push([p, buf.subarray(off, off + l)]); off += l; }
  if (off !== buf.length) throw new Error(`${where}: header says ${off} bytes, file has ${buf.length}`);
  return out;
}
const packedPages = (deck) => existsSync(join(deck, IDX)) ? JSON.parse(readFileSync(join(deck, IDX), "utf8")).pages : [];

function readPack(deck) {
  const files = new Map();
  for (const g of packedPages(deck)) for (const [p, b] of decode(readFileSync(pageFile(deck, g)), pageFile(deck, g))) files.set(p, b);
  return files;
}

function packDeck(deck) {
  const loose = walk(deck).filter((f) => f.endsWith(".webp"));
  if (!loose.length) return null;
  const files = readPack(deck);
  for (const f of loose) files.set(relative(deck, f).split("\\").join("/"), readFileSync(f));
  const byPage = new Map();
  for (const p of [...files.keys()].sort()) { const g = pageOf(p); if (!byPage.has(g)) byPage.set(g, []); byPage.get(g).push([p, files.get(p)]); }
  rmSync(join(deck, DIR), { recursive: true, force: true }); mkdirSync(join(deck, DIR), { recursive: true });
  let bytes = 0;
  for (const [g, entries] of byPage) { const b = encode(entries); bytes += b.length; writeFileSync(pageFile(deck, g), b); }
  writeFileSync(join(deck, IDX), JSON.stringify({ v: 2, pages: [...byPage.keys()].sort((a, b) => a - b) }));
  for (const f of loose) { unlinkSync(f); prune(dirname(f), deck); }
  return { files: files.size, loose: loose.length, pages: byPage.size, bytes };
}

function unpackDeck(deck) {
  if (!existsSync(join(deck, IDX))) return null;
  const files = readPack(deck);
  for (const [p, b] of files) { const f = join(deck, p); mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, b); }
  rmSync(join(deck, DIR), { recursive: true, force: true }); unlinkSync(join(deck, IDX));
  return { files: files.size };
}

function checkDeck(deck) {
  const bad = [];
  const loose = walk(deck).filter((f) => f.endsWith(".webp"));
  if (loose.length) bad.push(`${loose.length} loose .webp files (run pack-art.mjs)`);
  if (!existsSync(join(deck, IDX))) return bad;
  const pages = packedPages(deck), onDisk = existsSync(join(deck, DIR)) ? readdirSync(join(deck, DIR)).sort() : [];
  if (JSON.stringify(onDisk) !== JSON.stringify(pages.map((g) => String(g).padStart(2, "0") + ".bin"))) bad.push(`${IDX} lists ${pages.length} pages, ${onDisk.length} page packs on disk`);
  for (const g of pages) {
    if (!existsSync(pageFile(deck, g))) continue;
    try {
      for (const [p, b] of decode(readFileSync(pageFile(deck, g)), `page ${g}`)) {
        if (b.toString("latin1", 0, 4) !== "RIFF" || b.toString("latin1", 8, 12) !== "WEBP") bad.push(`${p} is not a webp`);
        if (pageOf(p) !== g) bad.push(`${p} is in page pack ${g}`);
      }
    } catch (e) { bad.push(e.message); }
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
    if (mode === "pack") { const r = packDeck(dir); if (r) { n++; console.log(`${c}/decks/${slug}: ${r.loose} loose, ${r.files} in ${r.pages} page packs, ${(r.bytes / 1048576).toFixed(1)} MiB`); } }
    else if (mode === "unpack") { const r = unpackDeck(dir); if (r) { n++; console.log(`${c}/decks/${slug}: ${r.files} files unpacked`); } }
    else for (const b of checkDeck(dir)) { problems++; console.log(`${c}/decks/${slug}: ${b}`); }
  }
}
if (mode === "check") { console.log(problems ? `${problems} problem(s)` : "packs ok"); process.exit(problems ? 1 : 0); }
console.log(`${mode}: ${n} folder(s) changed`);
