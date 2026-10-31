// D03 scene physics: equal areas (p14), Venus phases per model (p18), the 7.9 km/s orbit (p21), retrograde 3 to 5 (p11).
import test from "node:test";
import assert from "node:assert/strict";
const D = "../public/js/astro-scenes/d03/";
const p11 = await import(D + "p11.js"), p14 = await import(D + "p14.js"), p18 = await import(D + "p18.js"), p21 = await import(D + "p21.js");

test("p14 sweeps equal areas in equal months at any eccentricity", () => {
  for (const e of [0, 0.3, 0.68, 0.8]) {
    const a = p14.sweptArea(0, 1, e), b = p14.sweptArea(5.5, 6.5, e), c = p14.sweptArea(3, 4, e);
    assert.ok(Math.abs(a - b) / a < 1e-3 && Math.abs(a - c) / a < 1e-3, `e=${e}: ${a} ${b} ${c}`);
  }
});
test("p18: Ptolemy's Venus stays a crescent, Galileo's runs new to full", () => {
  let maxP = 0, minG = 1, maxG = 0;
  for (let a = 0; a < 360; a += 5) { const v = p18.venusAt(a); maxP = Math.max(maxP, p18.litFraction(v.p, [699, 433], [137, 754])); const g = p18.litFraction(v.g, [1133, 583], [1133, 775]); minG = Math.min(minG, g); maxG = Math.max(maxG, g); }
  assert.ok(maxP < 0.5, `Ptolemy max lit ${maxP}`); assert.ok(minG < 0.01 && maxG > 0.99);
});
test("p21: 7.9 km/s orbits, slower lands farther the faster it goes", () => {
  assert.equal(p21.flight(7.9).landed, false);
  const land = (v) => { const f = p21.flight(v); assert.ok(f.landed); return f.path.at(-1)[2]; };
  assert.ok(land(3) < land(5) && land(5) < land(7));
});
test("p11: Mars slides backward on the star wall only while Earth passes it (3 to 5)", () => {
  const x = (k) => p11.positions(k / 6).sky[0];
  for (let k = 0; k < 6; k++) { const back = x(k + 1) > x(k); assert.equal(back, k === 2 || k === 3, `step ${k + 1} to ${k + 2}`); }
});
