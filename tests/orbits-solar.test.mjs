import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import * as M from "../public/orbits/solar/so-model.js";

const pub = new URL("../public/", import.meta.url);
const read = (n) => readFileSync(new URL(n, pub), "utf8");
const FILES = ["study-orbits.html", "orbits/solar/so-ui.js", "orbits/solar/so-model.js", "orbits/solar/so-scene.js", "orbits/solar/solar-theme.css"];
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ""} ${a} vs ${b}`);

test("units: G = 4 pi^2, so 1 AU around 1 Msun is a 1 year, 2 pi AU/yr orbit", () => {
  near(M.periodYears(1), 1, 1e-12); near(M.circularSpeed(1), 2 * Math.PI, 1e-12); near(M.escapeSpeed(1), Math.SQRT2 * 2 * Math.PI, 1e-12);
  near(M.periodYears(M.PLANETS.jupiter.a), 11.87, 0.02); near(M.periodYears(M.PLANETS.neptune.a), 164.9, 0.3);
});
test("a circular planet comes back to its start after one period (Kepler's third law)", () => {
  for (const k of ["mercury", "earth", "jupiter"]) {
    const sys = M.createSystem(), a = M.PLANETS[k].a, b = M.addPlanet(sys, k, a, 0);
    M.step(sys, M.periodYears(a), 1e7);
    near(Math.hypot(b.x - a, b.y), 0, 5e-3 * a, k); // leapfrog at 150 steps per orbit: phase drift well under 1%
  }
  const heavy = M.createSystem(2), b = M.addPlanet(heavy, "earth", 1, 0); M.step(heavy, M.periodYears(1, 2), 1e7); near(Math.hypot(b.x - 1, b.y), 0, 5e-3, "2 Msun");
});
test("the real eight run 1,000 years: energy holds, nothing collides, Gold is reachable", () => {
  const sys = M.realSystem(), e0 = M.totalEnergy(sys);
  while (sys.t < 1000) M.step(sys, 10, 1e7);
  assert.equal(sys.bodies.length, 8); assert.equal(sys.events.length, 0);
  assert.ok(Math.abs(M.totalEnergy(sys) / e0 - 1) < 1e-6);
  const ev = { type: "solar", n: 8, stable: M.stableYears(sys) };
  assert.ok(M.GOALS.every((g) => g.check(ev)));
});
test("fling: a tap is circular, a 70 px pull is circular speed, aimed opposite the pull and capped at 2x", () => {
  const sys = M.createSystem();
  const tap = M.flingVelocity(sys, 1, 0, 3, 2); near(tap.vy, 2 * Math.PI, 1e-9); near(tap.vx, 0, 1e-9);
  const pull = M.flingVelocity(sys, 1, 0, 0, M.PULL_PX); near(pull.vy, 2 * Math.PI, 1e-9); // pull down on screen: launch up (+y)
  const big = M.flingVelocity(sys, 1, 0, -10 * M.PULL_PX, 0); near(big.vx, 4 * Math.PI, 1e-9);
});
test("merges conserve mass and momentum, falls and ejections are caught, each resets the timer", () => {
  const sys = M.createSystem(); M.addPlanet(sys, "jupiter", 5.2, 0); M.addPlanet(sys, "saturn", 5.21, 0.01);
  const m = M.PLANETS.jupiter.m + M.PLANETS.saturn.m, px = sys.bodies.reduce((s, b) => s + b.m * b.vx, 0), py = sys.bodies.reduce((s, b) => s + b.m * b.vy, 0);
  sys.t = 50; M.resolve(sys);
  assert.equal(sys.bodies.length, 1); assert.equal(sys.events[0].type, "merge"); near(sys.bodies[0].m, m, 1e-15);
  near(sys.bodies[0].m * sys.bodies[0].vy, py, 1e-12); near(sys.bodies[0].m * sys.bodies[0].vx, px, 1e-12); assert.equal(sys.stableSince, 50);
  const fall = M.createSystem(); M.addPlanet(fall, "earth", 1, 0, 0, 0.5); M.step(fall, 1, 1e6); assert.equal(fall.events[0]?.type, "star");
  const out = M.createSystem(); M.addPlanet(out, "earth", 1, 0, 0, 12); M.step(out, 40, 1e6); assert.equal(out.events[0]?.type, "eject");
  assert.equal(M.stableYears(out), 0);
});
test("empty sky does not run the clock; edits restart the stability timer", () => {
  const sys = M.createSystem(); M.step(sys, 5); assert.equal(sys.t, 0);
  const b = M.addPlanet(sys, "earth", 1, 0); M.step(sys, 3, 1e6); near(M.stableYears(sys), 3, 1e-9);
  M.addPlanet(sys, "mars", 1.524, 0); assert.equal(M.stableYears(sys), 0); M.removePlanet(sys, b.id); assert.equal(sys.bodies.length, 1);
});
test("challenges: 2 for 10 yr, 4 for 100 yr, 4 for 1,000 years", () => {
  const [b, s, g] = M.GOALS, ev = (n, stable) => ({ type: "solar", n, stable });
  assert.ok(b.check(ev(2, 10)) && !b.check(ev(1, 999)) && !b.check(ev(2, 9.9)));
  assert.ok(s.check(ev(4, 100)) && !s.check(ev(3, 500)));
  assert.ok(g.check(ev(4, 1000)) && !g.check(ev(4, 999)) && !g.check(ev(3, 1000)));
});
test("display mapping round-trips and keeps Neptune inside the view", () => {
  for (const [x, y] of [[0.387, 0], [-3, 4], [30.07, 0.5]]) { const s = M.toScreen(x, y, 50), w = M.toWorld(s.x, s.y, 50); near(w.x, x, 1e-9); near(w.y, y, 1e-9); }
  assert.ok(M.squash(30.07, 1) / M.squash(0.387, 1) < 6);
});
test("share link round-trips a sandbox system and drops bad entries", () => {
  const sys = M.realSystem(1.4), { sys: back, speed } = M.fromShare(M.toShare(sys, 3));
  assert.equal(back.bodies.length, 8); near(back.M, 1.4, 1e-12); assert.equal(speed, 3); near(back.bodies[4].x, sys.bodies[4].x, 1e-4);
  const bad = M.fromShare({ sm: 9, p0k: "pluto", p0x: 1, p0y: 0, p0u: 0, p0v: 6, p1k: "earth", p1x: 0, p1y: 0, p1u: 0, p1v: 0 });
  assert.equal(bad.sys.bodies.length, 0); assert.equal(bad.sys.M, M.STAR_MASS.max);
});
test("captions and labels from Leo's notes", () => {
  assert.equal(M.PLANETS.neptune.caption, "Dark spot as seen by Voyager 2 in 1989.");
  assert.equal(M.NOT_TO_SCALE, "Not to scale.");
  for (const k of [...M.ORDER, "sun", "moon", "uranus-rings"]) assert.ok(existsSync(new URL(`orbits/assets/solar/${k === "uranus" ? "uranus-disk" : k}.webp`, pub)), k);
  const scene = read("orbits/solar/so-scene.js");
  assert.match(scene, /uranus-disk/); assert.match(scene, /uranus-rings/); assert.ok(!/solar\/uranus\.webp/.test(scene + read("orbits/solar/so-ui.js")));
});
test("house rules: caption 12px, toast in the panel, sheet built at half after the controls fill, themes, sandbox", () => {
  const ui = read("orbits/solar/so-ui.js"), css = read("orbits/solar/solar-theme.css");
  assert.match(read("orbits/solar/so-scene.js"), /CAPTION_GAP = 12/); assert.match(ui, /artHalfH\(key\) \+ CAPTION_GAP/);
  assert.match(ui, /<section class="ss-controls"[^]*id="ssToast"[^]*<\/section>/); assert.ok(!/position: fixed/.test(css.match(/\.ss-toast \{[^}]*\}/)[0]));
  assert.match(ui, /start: 1/); assert.match(ui, /dataset\.snap = "half"/);
  assert.ok(ui.indexOf("renderMode(); readout();\nphoneSync()") > 0, "controls are filled before the sheet is created");
  for (const m of ["build", "sandbox"]) assert.match(ui, new RegExp(`data-mode="${m}"`));
  assert.match(read("study-orbits.html"), /popboard\.orbits\.solar\.theme/); assert.match(css, /\[data-theme="light"\]/);
  assert.match(ui, /window\.__solar/);
});
test("the playground is untouched: same presets, aliases, and still loads by default", () => {
  const html = read("study-orbits.html");
  assert.match(html, /import\("\.\/orbits-ui\.js"\)/); assert.match(html, /get\("mode"\) !== "solar-system"/);
  assert.equal(new URLSearchParams("?mode=solar").get("mode"), "solar"); // ?mode=solar still means the playground's inner-planets preset
  assert.match(read("orbits-ui.js"), /mode=solar-system/);
});
test("docs and study card", () => {
  assert.ok(existsSync(new URL("../docs/orbits-science.md", import.meta.url)));
  assert.match(readFileSync(new URL("../docs/fun-challenges.md", import.meta.url), "utf8"), /## Orbits: Solar System/);
  assert.match(read("study.html").split('id: "orbits"')[1].split("}")[0], /Solar System mode/);
});
test("no em-dashes and no Jasper in module copy", () => {
  const card = read("study.html").split('id: "orbits"')[1].split("}")[0];
  for (const t of [...FILES.map(read), card, readFileSync(new URL("../docs/orbits-science.md", import.meta.url), "utf8")]) { assert.ok(!t.includes("\u2014")); assert.ok(!/jasper/i.test(t)); }
});
