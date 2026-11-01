// Leo's six cleaned cutouts: the Test it scenes move the real cutout layers, with no SVG stand-ins.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
const src = (l, p) => readFileSync(new URL(`../public/physics101/scenes/${l}/${p}.js`, import.meta.url), "utf8");
const MOVED = [["m01-l02", "p01", "penny"], ["m01-l03", "p02", "samples"], ["m01-l03", "p06", "dropper"], ["m01-l03", "p09", "standard-mass"], ["m01-l04", "p01", "spring"], ["m01-l04", "p10", "ball"]];
test("the six cleaned cutouts are moved by their scenes", () => {
  for (const [l, p, id] of MOVED) {
    // Leo split the sample tray into one cutout per sample with a drag spec: the shared drag engine moves them
    const dj = new URL(`../public/physics101/decks/${l}/v2/drag.json`, import.meta.url), dg = existsSync(dj) ? JSON.parse(readFileSync(dj, "utf8"))[p] : null;
    if (id === "samples" && dg) { assert.ok(dg.items.some((i) => i.id === "sample-cube"), `${l} ${p} drags the samples`); continue; }
    assert.match(src(l, p), new RegExp(`art\\.set\\("${id}"`), `${l} ${p} moves ${id}`);
  }
});
test("no SVG coin (L2 p01) or SVG ball (L4 p10) workarounds remain", () => {
  assert.doesNotMatch(src("m01-l02", "p01"), /svg\(|coin/);
  assert.doesNotMatch(src("m01-l04", "p10"), /#B5893A|const ball/);
});
test("L4 p01 renders Table 3 as live text from the spring rule, with no cover-up cells", () => {
  const s = src("m01-l04", "p01");
  // Table 3 lengths 13.7, 14.1 ... 16.4 cm come from L = 13.7 + 0.08 m (Leo's drag spec)
  assert.match(s, /L0 = 13\.7/); assert.match(s, /k = 0\.08/);
  assert.match(s, /\[0, 5, 10, 15, 20, 25, 30, 35\]/);
  assert.doesNotMatch(s, /"cap", \[1135/);
});
