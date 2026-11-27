// Packed deck art: every deck's art lives in art-pack.bin + art-pack.json, and the page loader hands it back as blob URLs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { artExists, artFiles } from "./art-pack.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PUB = join(ROOT, "public");
const decks = ["astro-course", "physics101"].flatMap((c) => readdirSync(join(PUB, c, "decks")).map((s) => join(PUB, c, "decks", s)));

test("every deck is packed: no loose .webp, indexes match the bytes (tools/pack-art/pack-art.mjs --check)", () => {
  const r = spawnSync("node", [join(ROOT, "tools/pack-art/pack-art.mjs"), "--check"], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.equal(decks.length, 100);
  for (const d of decks) assert.ok(existsSync(join(d, "art-pack.json")), d);
});

test("each page pack holds only that page's art, and no pack nears Pages' 25 MiB file limit", () => {
  let packs = 0;
  for (const d of decks) {
    for (const g of JSON.parse(readFileSync(join(d, "art-pack.json"), "utf8")).pages) {
      const f = join(d, "art-pack", String(g).padStart(2, "0") + ".bin"); packs++;
      assert.ok(statSync(f).size < 8 * 1048576, f);
    }
    for (const p of artFiles(d)) assert.ok(artExists(d, p), p);
  }
  assert.ok(packs > 1500 && packs < 2500, `${packs} page packs`);
});

test("every file a storybook asks for is in its deck's pack", () => {
  for (const d of decks) {
    const idx = Object.fromEntries(artFiles(d).map((p) => [p, 1]));
    const st = join(d, "v2/story.json");
    if (existsSync(st)) for (const s of Object.values(JSON.parse(readFileSync(st, "utf8")).slides)) for (const l of s.layers || []) assert.ok(idx[l.src], `${d} ${l.src}`);
    const ar = join(d, "v2/art.json");
    if (existsSync(ar)) for (const ls of Object.values(JSON.parse(readFileSync(ar, "utf8")))) for (const l of ls) { assert.ok(idx["v2/art/" + l.src], `${d} ${l.src}`); if (l.hint) assert.ok(idx["v2/art/" + l.hint], `${d} ${l.hint}`); }
    const dk = JSON.parse(readFileSync(join(d, "deck.json"), "utf8"));
    for (const s of dk.slides) { if (s.bg) assert.ok(idx[s.bg], `${d} ${s.bg}`); for (const it of s.items) if (it.t === "img") assert.ok(idx[it.src], `${d} ${it.src}`); }
  }
});

const blobs = new Map();
const realCreate = URL.createObjectURL.bind(URL);
URL.createObjectURL = (b) => { const u = realCreate(b); blobs.set(u, b); return u; };

// A fake static host for one deck: plain GETs of art-pack.json and art-pack/<NN>.bin (no Range anywhere).
function host(deck) {
  const calls = [];
  globalThis.fetch = async (url) => {
    const rel = String(url).replace(/^.*decks\/[^/]+\//, ""), f = join(deck, rel);
    calls.push(rel);
    return existsSync(f) ? new Response(readFileSync(f), { status: 200 }) : new Response("", { status: 404 });
  };
  return calls;
}

test("loader: warm(page) fetches one page pack with a plain GET; artUrl returns identical bytes as a blob URL", async () => {
  const deck = join(PUB, "physics101/decks/m22-l01"), base = "physics101/decks/m22-l01/";
  const calls = host(deck);
  const { openArtPack, artUrl } = await import("../public/shared/pack/pack.js?x=packed");
  const pack = await openArtPack(base);
  assert.equal(pack.packed, true);
  assert.equal(pack.ready(3), false);
  assert.equal(artUrl(base + "v2/art/p03-bg.webp"), base + "v2/art/p03-bg.webp"); // not warmed yet: untouched
  await pack.warm(3);
  assert.equal(pack.ready(3), true); assert.equal(pack.ready(4), false);
  assert.deepEqual(calls, ["art-pack.json", "art-pack/03.bin"]); // this deck has no deck-wide page 0
  const url = artUrl(base + "v2/art/p03-bg.webp");
  assert.match(url, /^blob:/);
  const want = readFileSync(join(deck, "art-pack/03.bin"));
  const got = Buffer.from(await blobs.get(url).arrayBuffer());
  assert.ok(want.includes(got), "the blob's bytes are the pack's bytes");
  assert.equal(got.toString("latin1", 0, 4), "RIFF"); assert.equal(got.toString("latin1", 8, 12), "WEBP");
  assert.equal(artUrl("somewhere/else.webp"), "somewhere/else.webp");
  await pack.warm(3); assert.equal(calls.length, 2); // a warmed page is not fetched again
});

test("loader: a deck with deck-wide files (page 0) pulls them with the first page", async () => {
  const deck = join(PUB, "astro-course/decks/d02"), base = "astro-course/decks/d02/";
  const calls = host(deck);
  const { openArtPack, artUrl } = await import("../public/shared/pack/pack.js?x=astro");
  const pack = await openArtPack(base);
  await pack.warm(1);
  assert.deepEqual(calls.sort(), ["art-pack.json", "art-pack/00.bin", "art-pack/01.bin"]);
  assert.match(artUrl(base + "v2/L01-1.webp"), /^blob:/);
  assert.match(artUrl(base + artFiles(deck).find((p) => /^paper-/.test(p))), /^blob:/);
});

test("loader: a missing page pack degrades to the loose path instead of throwing", async () => {
  const deck = join(PUB, "physics101/decks/m22-l01"), base = "physics101/decks/m22-l01/";
  host(deck);
  const real = globalThis.fetch;
  globalThis.fetch = (u) => (String(u).includes("art-pack/") ? Promise.resolve(new Response("", { status: 404 })) : real(u));
  const warn = console.warn; console.warn = () => {};
  const { openArtPack, artUrl } = await import("../public/shared/pack/pack.js?x=missing");
  const pack = await openArtPack(base);
  await pack.warm(2); console.warn = warn;
  assert.equal(artUrl(base + "v2/art/p02-bg.webp"), base + "v2/art/p02-bg.webp");
});

test("loader: a deck with no pack passes loose paths through and is always ready", async () => {
  globalThis.fetch = async () => new Response("<html>spa fallback</html>", { status: 200 });
  const { openArtPack, artUrl } = await import("../public/shared/pack/pack.js?x=loose");
  const pack = await openArtPack("decks/x/");
  assert.equal(pack.packed, false); assert.equal(pack.ready(9), true);
  await pack.warm(9);
  assert.equal(artUrl("decks/x/v2/a.webp"), "decks/x/v2/a.webp");
});
