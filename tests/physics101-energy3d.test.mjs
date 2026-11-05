import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const P = "../public/physics101/";
const ph = await import(P + "scenes/energy3d/physics.js");
const near = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} vs ${b}`);

test("bounceHeights scales by e^2", () => {
  const h = ph.bounceHeights(2, 0.8, 3);
  assert.equal(h.length, 4); near(h[1], 1.28); near(h[3], 2 * 0.8 ** 6);
});
test("energyAt and lossPerBounce", () => {
  const E = ph.energyAt(2, 1, 3); near(E.gpe, 19.6); near(E.ke, 9); near(E.total, 28.6);
  near(ph.lossPerBounce(1, 1, 0.5), 9.8 * 0.75);
});
test("Tesla presets: rebound/drop is close to e^2", () => {
  for (const [k, b] of Object.entries(ph.BALLS)) assert.ok(Math.abs(b.rebound / b.drop - b.e ** 2) < 0.02, k);
  assert.equal(ph.BALLS.tennis.e, 0.745); assert.equal(ph.BALLS.basketball.e, 0.767); assert.equal(ph.BALLS.tableTennis.e, 0.876);
});
test("ballState falls, bounces lower, then rests", () => {
  const s = ph.ballState(1, 0.8, 0); near(s.y, 1);
  const tf = Math.sqrt(2 / 9.8); assert.equal(ph.ballState(1, 0.8, tf + 0.01).bounces, 1);
  assert.ok(ph.ballState(1, 0.8, 100).rest);
});
test("bounce.js and p08 wrapper import; sceneText is present", async () => {
  const b = await import(P + "scenes/energy3d/bounce.js"); assert.equal(typeof b.mountBounce, "function");
  const w = await import(P + "scenes/m10-l03/p08.js"); assert.equal(typeof w.default, "function");
  const s = JSON.parse(readFileSync(new URL(P + "decks/m10-l03/v2/story.json", import.meta.url))).slides["8"];
  assert.ok(s.testIt && s.sceneText.explain.includes("mechanical-energy decrease = thermal-energy increase + sound energy carried away"));
  assert.doesNotMatch(JSON.stringify(s.sceneText), /\d+(\.\d+)?\s*%/);
});

test("grid: stage outputs plus losses sum to input, each stage once, no 0.99", () => {
  for (const k of Object.keys(ph.SOURCES)) {
    const c = ph.gridChain(k, 100);
    near(c.delivered + c.losses, 100, 1e-9);
    near(c.stages.reduce((a, s) => a * s.eff, 1), c.overall, 1e-12);
    for (let i = 1; i < c.stages.length; i++) near(c.stages[i].in, c.stages[i - 1].out);
    assert.equal(c.stages.filter((s) => s.name === "grid").length, 1, k);
    assert.ok(!c.stages.some((s) => s.eff === 0.99 || /transformer/.test(s.name)), k);
  }
});
test("grid: Tesla W1 corrected overall and 7 W inputs", () => {
  const want = { gas: [0.437624, 16.0], coal: [0.315885, 22.16], nuclear: [0.357377, 19.59], hydro: [0.820717, 8.53], wind: [0.449114, 15.59], solar: [0.207003, 33.82] };
  for (const [k, [o, w]] of Object.entries(want)) { near(ph.overallEfficiency(k), o, 1e-6); near(ph.sourceInputFor(k), w, 0.005); }
  near(ph.GRID_RETAINED, 0.911907553, 1e-9);
  assert.equal(ph.SOURCES.solar.badge, "incomplete");
});
test("grid.js and m21-l02 p11 wrapper import; badge and O3 text present", async () => {
  assert.equal(typeof (await import(P + "scenes/energy3d/grid.js")).mountGrid, "function");
  assert.equal(typeof (await import(P + "scenes/m21-l02/p11.js")).default, "function");
  const s = JSON.parse(readFileSync(new URL(P + "decks/m21-l02/v2/story.json", import.meta.url))).slides["11"];
  assert.equal(s.sceneText.badge_incomplete, "INCOMPLETE CHAIN");
  assert.ok(s.sceneText.scenario.startsWith("This mixed-year illustrative scenario"));
});
