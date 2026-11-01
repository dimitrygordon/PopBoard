// Leo's drag specs (decks/<slug>/v2/drag.json, compiled by tools/physics101/build-drag.py) point at real cutouts,
// and the one shared engine (scenes/drag.js) covers pointer, keyboard, ARIA, snap, reduce motion and 44 px targets.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const P = join(dirname(fileURLToPath(import.meta.url)), "../public/physics101");
const json = (f) => JSON.parse(readFileSync(f, "utf8"));
test("every drag spec names cutouts the page's art has, with sane snap and key steps", () => {
  let n = 0;
  for (const slug of readdirSync(join(P, "decks"))) {
    const f = join(P, "decks", slug, "v2/drag.json"); if (!existsSync(f)) continue;
    const drag = json(f), art = json(join(P, "decks", slug, "v2/art.json")), story = json(join(P, "decks", slug, "v2/story.json"));
    for (const [pn, sp] of Object.entries(drag)) {
      n++; const cuts = new Set(art[pn].filter((l) => l.cut).map((l) => l.id.slice(4)));
      assert.ok(story.slides[String(+pn.slice(1))].testIt, `${slug} ${pn} has a Test it scene`);
      assert.ok(sp.items.length > 0, `${slug} ${pn}`);
      for (const x of [...sp.items, ...sp.targets]) assert.ok(cuts.has(x.id), `${slug} ${pn} ${x.id}`);
      assert.ok(sp.snap > 0 && sp.step > 0 && sp.bigStep >= sp.step, `${slug} ${pn}`);
    }
  }
  assert.ok(n >= 1);
});
test("the shared drag engine: pointer events, keys, ARIA live region, reduce motion, 44 px", () => {
  const s = readFileSync(join(P, "scenes/drag.js"), "utf8");
  for (const re of [/pointerdown/, /pointermove/, /pointercancel/, /setPointerCapture/, /ArrowLeft/, /"Escape"/, /"Enter"/, /aria-live/, /aria-label/, /reduce/, /44px/]) assert.match(s, re);
  for (const m of s.matchAll(/^import .* from "(.+)";$/gm)) assert.equal(m[1], "./kit.js");
});
