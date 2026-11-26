// Packed deck art: every deck's art lives in art-pack.bin + art-pack.json, and the page loader hands it back as blob URLs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PUB = join(ROOT, "public");
const decks = ["astro-course", "physics101"].flatMap((c) => readdirSync(join(PUB, c, "decks")).map((s) => join(PUB, c, "decks", s)));

test("every deck is packed: no loose .webp, indexes match the bytes (tools/pack-art/pack-art.mjs --check)", () => {
  const r = spawnSync("node", [join(ROOT, "tools/pack-art/pack-art.mjs"), "--check"], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.equal(decks.length, 100);
  for (const d of decks) { assert.ok(existsSync(join(d, "art-pack.bin")), d); assert.ok(existsSync(join(d, "art-pack.json")), d); }
});

test("each pack stays under Pages' 25 MiB file limit, with a page's art in one contiguous byte range", () => {
  for (const d of decks) {
    assert.ok(statSync(join(d, "art-pack.bin")).size < 24 * 1048576, d);
    const idx = JSON.parse(readFileSync(join(d, "art-pack.json"), "utf8"));
    for (const [g, [o, l]] of Object.entries(idx.groups)) {
      const members = Object.entries(idx.files).filter(([, f]) => String(f[2]) === g);
      assert.equal(members.reduce((n, [, f]) => n + f[1], 0), l, `${d} page ${g} is contiguous`);
      assert.ok(members.every(([, f]) => f[0] >= o && f[0] + f[1] <= o + l), `${d} page ${g} range`);
    }
  }
});

test("every file a storybook asks for is in its deck's pack", () => {
  for (const d of decks) {
    const idx = JSON.parse(readFileSync(join(d, "art-pack.json"), "utf8")).files;
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

// A fake static host for one deck: serves art-pack.json and art-pack.bin, with or without honoring Range.
async function host(deck, { range }) {
  const files = { "art-pack.json": readFileSync(join(deck, "art-pack.json")), "art-pack.bin": readFileSync(join(deck, "art-pack.bin")) };
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    const name = String(url).replace(/^.*\//, ""), body = files[name];
    calls.push({ name, range: init.headers && init.headers.Range });
    if (!body) return new Response("", { status: 404 });
    const m = range && init.headers && /^bytes=(\d+)-(\d+)$/.exec(init.headers.Range);
    return m ? new Response(body.subarray(+m[1], +m[2] + 1), { status: 206 }) : new Response(body, { status: 200 });
  };
  return calls;
}

for (const range of [true, false]) {
  test(`loader: warm(page) pulls one page, artUrl returns identical bytes as a blob URL (server ${range ? "honors" : "ignores"} Range)`, async () => {
    const deck = join(PUB, "physics101/decks/m22-l01"), base = "physics101/decks/m22-l01/";
    const calls = await host(deck, { range });
    const { openArtPack, artUrl } = await import("../public/shared/pack/pack.js?x=" + range);
    const pack = await openArtPack(base);
    assert.equal(pack.packed, true);
    assert.equal(pack.ready(3), false);
    assert.equal(artUrl(base + "v2/art/p03-bg.webp"), base + "v2/art/p03-bg.webp"); // not warmed yet: untouched
    await pack.warm(3);
    assert.equal(pack.ready(3), true); assert.equal(pack.ready(4), false);
    if (range) assert.deepEqual(calls.filter((c) => c.name === "art-pack.bin").map((c) => /^bytes=\d+-\d+$/.test(c.range)), [true]); // one ranged request; this deck has no deck-wide files
    const url = artUrl(base + "v2/art/p03-bg.webp");
    assert.match(url, /^blob:/);
    const [o, l] = JSON.parse(readFileSync(join(deck, "art-pack.json"), "utf8")).files["v2/art/p03-bg.webp"];
    const got = Buffer.from(await blobs.get(url).arrayBuffer());
    assert.deepEqual(got, readFileSync(join(deck, "art-pack.bin")).subarray(o, o + l));
    assert.equal(artUrl("somewhere/else.webp"), "somewhere/else.webp");
  });
}

test("loader: a deck with no pack passes loose paths through and is always ready", async () => {
  globalThis.fetch = async () => new Response("", { status: 404 });
  const { openArtPack, artUrl } = await import("../public/shared/pack/pack.js?x=loose");
  const pack = await openArtPack("decks/x/");
  assert.equal(pack.packed, false); assert.equal(pack.ready(9), true);
  await pack.warm(9);
  assert.equal(artUrl("decks/x/v2/a.webp"), "decks/x/v2/a.webp");
});
