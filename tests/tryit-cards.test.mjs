// Try it scaffold: no mappings or links until Leo's match list is approved; never on Read this page.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const PUB = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
const read = (p) => readFileSync(join(PUB, p), "utf8");

test("try it map uses Leo's pairs: real lessons, known targets, no stretch fits", async () => {
  const map = JSON.parse(read("physics101/tryit/map.json"));
  const { DECKS } = await import("../public/physics101/p101-catalog.js");
  const slugs = new Set(DECKS.map((d) => d.slug));
  assert.equal(Object.keys(map).length, 47);
  assert.equal(Object.values(map).flat().length, 81);
  for (const [slug, rows] of Object.entries(map)) {
    assert.ok(slugs.has(slug), slug);
    for (const r of rows) { assert.match(r.caption, /\S/); assert.doesNotMatch(r.caption, /stretch|\u2014/); }
  }
});

test("try it hosts sit only in the Study Questions tab and Test it, never in Read this page", () => {
  const h = read("study-physics101-story.html");
  const pane = h.slice(h.indexOf('id="sqPane"'));
  assert.ok(pane.indexOf('id="sqTry"') > 0);
  const rb = h.indexOf('id="readBox"'), readPane = h.slice(rb, h.indexOf("</section>", rb));
  assert.doesNotMatch(readPane, /tryit/);
  const tab = read("physics101/sq-tab.js");
  assert.match(tab, /querySelector\("\.test-it"\)/);
  assert.match(read("physics101/tryit.js"), /closest\("#readBox"\)/);
});

test("every mapped card points at an existing original page", () => {
  const map = JSON.parse(read("physics101/tryit/map.json"));
  const src = read("physics101/tryit.js");
  for (const rows of Object.values(map)) for (const r of rows) {
    const m = src.match(new RegExp(`"?${r.id}"?:\\s*\\[.+?,\\s*"([^"]+)"\\]`));
    assert.ok(m, `target ${r.id} missing`);
    assert.ok(existsSync(join(PUB, m[1].split(/[?#]/)[0])), m[1]);
  }
});
