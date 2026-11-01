// Leo's six cleaned cutouts: the Test it scenes move the real cutout layers, with no SVG stand-ins.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const src = (l, p) => readFileSync(new URL(`../public/physics101/scenes/${l}/${p}.js`, import.meta.url), "utf8");
const MOVED = [["m01-l02", "p01", "penny"], ["m01-l03", "p02", "samples"], ["m01-l03", "p06", "dropper"], ["m01-l03", "p09", "standard-mass"], ["m01-l04", "p01", "mass-set"], ["m01-l04", "p10", "ball"]];
test("the six cleaned cutouts are moved by their scenes", () => {
  for (const [l, p, id] of MOVED) assert.match(src(l, p), new RegExp(`art\\.set\\("${id}"`), `${l} ${p} moves ${id}`);
});
test("no SVG coin (L2 p01) or SVG ball (L4 p10) workarounds remain", () => {
  assert.doesNotMatch(src("m01-l02", "p01"), /svg\(|coin/);
  assert.doesNotMatch(src("m01-l04", "p10"), /#B5893A|const ball/);
});
test("L4 p01 renders Table 3 as live text from the page's labels, with no cover-up cells", () => {
  const s = src("m01-l04", "p01");
  assert.match(s, /\[13\.7, 14\.1, 14\.5, 14\.9, 15\.3, 15\.7, 16\.0, 16\.4\]/);
  assert.match(s, /\[0, 5, 10, 15, 20, 25, 30, 35\]/);
  assert.doesNotMatch(s, /"cap", \[1135/);
});
