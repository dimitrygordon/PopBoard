import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import * as M from "../public/ripple-tank/rt-model.js";

const pub = new URL("../public/", import.meta.url);
const read = (n) => readFileSync(new URL(n, pub), "utf8");
const FILES = ["study-ripple-tank.html", "ripple-tank/rt-ui.js", "ripple-tank/rt-model.js", "ripple-tank/rt-scene.js", "ripple-tank/ripple-tank-theme.css"];

test("wavelength = v / f over the slider range", () => {
  assert.equal(M.wavelength(6), 4); assert.equal(M.wavelength(M.F_MIN), 8); assert.ok(Math.abs(M.wavelength(M.F_MAX) - 2.4) < 1e-9);
});
test("dark and bright line counts for two in-phase dippers", () => {
  assert.equal(M.nodalLines(1, 4), 0); assert.equal(M.nodalLines(2, 4), 2); assert.equal(M.nodalLines(5.9, 4), 2); assert.equal(M.nodalLines(6, 4), 4); assert.equal(M.nodalLines(0, 4), 0);
  assert.equal(M.antinodalLines(3, 4), 1); assert.equal(M.antinodalLines(4, 4), 1); assert.equal(M.antinodalLines(4.1, 4), 3);
});
test("walls: one or two gaps of the right size, centred", () => {
  const H = 24, one = M.wallRects({ barrier: "one", a: 2, d: 8 }, H), two = M.wallRects({ barrier: "two", a: 2, d: 8 }, H);
  assert.equal(one.length, 2); assert.equal(one[1].y0 - one[0].y1, 2);
  assert.equal(two.length, 3); assert.equal(two[1].y0 - two[0].y1, 2); assert.equal(((two[1].y1 + two[2].y0) / 2) - ((two[0].y1 + two[1].y0) / 2), 8);
  assert.deepEqual(M.wallRects({ barrier: "none" }, H), []);
});
test("sanitizing clamps numbers, sources and enums", () => {
  const s = M.sanitizeConfig({ f: 99, a: -1, barrier: "three", sources: [{ x: -5, y: 3 }, { x: 1 }, 7, { x: 2, y: 2 }, { x: 3, y: 3 }, { x: 4, y: 4 }, { x: 5, y: 5 }] }, 40, 24);
  assert.equal(s.f, M.F_MAX); assert.equal(s.a, M.SLIT_A.min); assert.equal(s.barrier, "none"); assert.equal(s.sources.length, M.MAX_SOURCES); assert.deepEqual(s.sources[0], { x: 0, y: 3 });
  const back = M.sanitizeConfig(M.fromShare(M.toShare({ ...s, sources: [{ x: 3, y: 4 }] })), 40, 24); assert.deepEqual(back.sources, [{ x: 3, y: 4 }]);
});
test("analysis drives the challenges", () => {
  const two = M.analyze(M.sanitizeConfig({ f: 6, sources: [{ x: 8, y: 10 }, { x: 8, y: 14 }] }));
  assert.equal(two.kind, "two-source"); assert.equal(two.nodal, 2);
  const [b, s, g] = M.GOALS, ev = (a) => ({ type: "tank", settled: true, ...a });
  assert.ok(b.check(ev(two))); assert.ok(!b.check({ ...ev(two), settled: false }));
  const one = M.analyze(M.sanitizeConfig({ f: 6, line: true, barrier: "one", a: 3 })); assert.ok(s.check(ev(one)));
  assert.ok(!s.check(ev(M.analyze(M.sanitizeConfig({ f: 6, line: true, barrier: "one", a: 6 })))));
  assert.ok(g.check(ev(M.analyze(M.sanitizeConfig({ f: 6, line: true, barrier: "two", a: 3, d: 8 })))));
  assert.ok(!g.check(ev(M.analyze(M.sanitizeConfig({ f: 6, line: true, barrier: "two", a: 3, d: 6 })))));
  assert.equal(M.trend(2, 4), "more"); assert.equal(M.trend(4, 2), "fewer"); assert.equal(M.trend(2, 2), "same");
});
test("guided scenes are solvable inside the slider ranges", () => {
  for (const sc of M.SCENES) { const c = M.sanitizeConfig(sc.cfg(24), 40, 24); assert.ok(c.f >= M.F_MIN && c.f <= M.F_MAX, sc.id); }
  assert.equal(M.nodalLines(6, M.wavelength(4)), 2); // two: drop f to 4 Hz
  assert.ok(M.SLIT_A.min <= M.wavelength(6)); // one: a slit narrower than lambda exists
  assert.ok(M.SLIT_D.max >= 2 * M.wavelength(5) && M.SLIT_A.min <= M.wavelength(5)); // double
});
test("grid: stable, absorbing border, walls stay still", () => {
  const g = M.createGrid(120, 80); M.fillWalls(g, [{ x0: 10, y0: 0, x1: 11, y1: 26 }], 40 / 120);
  M.splash(g, 60, 40, 3, 1); let e0 = 0; for (const v of g.u) e0 += v * v;
  for (let i = 0; i < 1500; i++) M.step(g);
  let e = 0, wall = 0; for (let k = 0; k < g.u.length; k++) { e += g.u[k] ** 2; if (g.wall[k]) wall += Math.abs(g.u[k]); }
  assert.ok(Number.isFinite(e) && e < e0 * 0.05, `energy ${e} of ${e0}`); assert.equal(wall, 0);
});
test("two dippers: the simulated dark line sits where theory says", () => {
  const nx = 200, ny = 140, cell = 40 / nx, dt = M.COURANT * cell / M.WAVE_SPEED, g = M.createGrid(nx, ny), avg = new Float64Array(nx * ny);
  let t = 0; for (let s = 0; s < 2500; s++) { t += dt; const d = Math.sin(2 * Math.PI * 8 * t); for (const y of [11, 17]) g.u[Math.round(y / cell) * nx + 40] = d; M.step(g); if (s > 2100) for (let k = 0; k < avg.length; k++) avg[k] += g.u[k] ** 2; }
  const at = (deg) => { const r = 18, x = 8 + r * Math.cos(deg * Math.PI / 180), y = 14 + r * Math.sin(deg * Math.PI / 180); return avg[Math.round(y / cell) * nx + Math.round(x / cell)]; };
  const theory = Math.asin(0.5 * 3 / 6) * 180 / Math.PI; // (m + 1/2) lambda = d sin(theta), lambda 3 cm, d 6 cm: 14.5 deg
  assert.ok(at(theory) < 0.25 * at(0), `node ${at(theory)} vs centre ${at(0)}`); assert.ok(at(-theory) < 0.25 * at(0));
});
test("governor drops resolution when frames stay slow, never below the last level", () => {
  const gov = M.createGovernor(); let downs = 0;
  for (let i = 0; i < 2000; i++) if (gov.sample(40) === "down") downs++;
  assert.equal(gov.level, M.LEVELS.length - 1); assert.equal(downs, M.LEVELS.length - 1);
  const ok = M.createGovernor(); for (let i = 0; i < 500; i++) ok.sample(16); assert.equal(ok.level, 0);
});
test("house rules: caption 12px, toast in the panel, sheet at half, no shell art needed", () => {
  const ui = read("ripple-tank/rt-ui.js"), html = read("study-ripple-tank.html");
  assert.match(read("ripple-tank/rt-scene.js"), /CAPTION_GAP = 12/); assert.match(ui, /v\.y \+ v\.h \+ CAPTION_GAP/);
  assert.match(html, /<section class="controls"[^]*id="toast"[^]*<\/section>/); assert.ok(!/position: fixed[^}]*\}\s*$/.test(read("ripple-tank/ripple-tank-theme.css").match(/\.toast \{[^}]*\}/)[0]));
  assert.match(ui, /start: 1/); assert.match(ui, /dataset\.snap = "half"/);
  for (const m of ["guided", "sandbox"]) assert.match(html, new RegExp(`data-mode="${m}"`));
  assert.match(html, /popboard\.ripple-tank\.theme/); assert.match(read("ripple-tank/ripple-tank-theme.css"), /\[data-theme="light"\]/);
});
test("links both ways with Waves & Interference, study card, docs", () => {
  assert.match(read("study-ripple-tank.html"), /href="study-waves.html"/); assert.match(read("study-waves.html"), /href="study-ripple-tank.html"/);
  const study = read("study.html"); assert.match(study, /id: "ripple-tank"/); assert.match(study, /file: "study-ripple-tank.html"/);
  assert.ok(existsSync(new URL("../docs/ripple-tank-science.md", import.meta.url)));
  assert.match(readFileSync(new URL("../docs/fun-challenges.md", import.meta.url), "utf8"), /## Ripple Tank/);
});
test("no em-dashes and no Jasper in module copy", () => {
  const card = read("study.html").split('id: "ripple-tank"')[1].split("}")[0];
  for (const t of [...FILES.map(read), card]) { assert.ok(!t.includes("\u2014")); assert.ok(!/jasper/i.test(t)); }
});

test("slit barriers reflect waves; only the outer sponge border absorbs", () => {
  const nx = 220, ny = 160, cm = 0.2, C = M.COURANT, W = 140;
  const energy = (g, i0, i1) => { let e = 0; for (let j = 0; j < g.ny; j++) for (let i = i0; i < i1; i++) { const k = j * g.nx + i; e += g.u[k] * g.u[k]; } return e; };
  // A plane pulse that travels right (u(x - ct)), started at i = 90, toward a solid wall at i = W.
  const run = (withWall, steps) => {
    const g = M.createGrid(nx, ny);
    if (withWall) M.fillWalls(g, [{ x0: W * cm, y0: 0, x1: (W + 2) * cm, y1: ny * cm }], cm);
    for (let j = 1; j < ny - 1; j++) for (let i = 70; i < 110; i++) { g.u[j * nx + i] = Math.exp(-((i - 90) ** 2) / 12); g.prev[j * nx + i] = Math.exp(-((i - 90 + C) ** 2) / 12); }
    for (let s = 0; s < steps; s++) M.step(g);
    return g;
  };
  const T = Math.round((2 * (W - 90) - 30) / C); // long enough to reach the wall and travel most of the way back
  const wall = run(true, T), open = run(false, T);
  const back = energy(wall, 40, W - 2), none = energy(open, 40, W - 2);
  assert.ok(back > 5 * none + 1, `reflected ${back} vs open ${none}`); // energy returns from the barrier
  assert.ok(energy(wall, W + 3, nx) < 1e-6 * back); // nothing leaks through a solid wall
  // The outer sponge border absorbs: in the open tank the pulse runs into the edge and does not come back.
  // Measured as motion, (u - prev)^2: the sponge damps velocity, so a flat leftover level is not a wave.
  const kin = (g) => { let e = 0; for (let k = 0; k < g.u.length; k++) e += (g.u[k] - g.prev[k]) ** 2; return e; };
  const g = run(false, T), e0 = kin(g); for (let s = 0; s < Math.round(3 * nx / C); s++) M.step(g);
  const e1 = kin(g); assert.ok(e1 < 0.05 * e0, `sponge left ${e1} of ${e0}`);
});

test("dark-line wording and 5% display threshold", () => {
  assert.equal(M.NODAL_NOTE, "Dark lines: here a crest from one dipper always meets a trough from the other, so the water stays almost still.");
  assert.equal(M.NODAL_THRESHOLD, 0.05);
});

test("science doc is cleared by Tesla", () => {
  const doc = readFileSync(new URL("../docs/ripple-tank-science.md", import.meta.url), "utf8");
  assert.ok(doc.includes("Cleared by Tesla 2026-10-29") && !doc.includes("TODO-TESLA") && doc.includes("Lighthill, Waves in Fluids"));
});
