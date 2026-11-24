// Newton's Cannonball Fire: inverse-square flights, derivation numbers, and module scaffold.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  GM_E, R_E, G, M_MOON, R_MOON, H_MOON, H_DEFAULT, H_MIN, ISS_ALTITUDE, PLANET_X, V_STEP
} from "../public/newtons-cannonball-fire/ncf-config.js";
import {
  classify, samplePath, presetsAt, presetSpeed, practiceAnswers, applySandbox,
  vOrbit, vEscape, gEarth, period, formatKmS, outcomeLabel, CIRCULAR_TOL_MPS
} from "../public/newtons-cannonball-fire/ncf-physics.js";
import { PLACEHOLDER, TESLA_PENDING, STRINGS } from "../public/newtons-cannonball-fire/ncf-strings.js";
import { ART } from "../public/newtons-cannonball-fire/ncf-art.js";

const root = new URL("../", import.meta.url);
const PUB = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
const read = (p) => readFileSync(new URL(p, root), "utf8");
const close = (a, b, msg, tol = 1e-8) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b}`);

const orbits = JSON.parse(read("public/orbit-lab/assets/orbits.json"));

test("Earth constants match Tesla-verified Orbit Lab orbits.json and are not reinvented", () => {
  close(GM_E, orbits.constants.GM_E, "GM_E");
  close(R_E, orbits.constants.R_E, "R_E");
  assert.equal(GM_E, 398000000000000.0);
  assert.equal(R_E, 6380000.0);
  const src = read("public/newtons-cannonball-fire/ncf-physics.js");
  assert.match(src, /from "\.\.\/orbit-lab\/ol-model\.js"/);
  assert.match(src, /olFlight|flight/);
});

test("thresholds: falls, circular, ellipse, escape at the default mountain", () => {
  const h = H_DEFAULT;
  const r0 = R_E + h;
  const vc = vOrbit(r0);
  const vesc = vEscape(r0);
  close(vc, Math.sqrt(GM_E / r0), "v_orbit formula");
  close(vesc, Math.sqrt(2 * GM_E / r0), "v_esc formula");
  close(vesc / vc, Math.SQRT2, "v_esc = √2 v_orbit");
  assert.equal(classify(0, h).kind, "falls");
  assert.equal(classify(vc * 0.35, h).kind, "falls");
  assert.equal(classify(vc * 0.72, h).kind, "falls");
  assert.equal(classify(vc, h).kind, "circular");
  assert.equal(classify(vc * 1.22, h).kind, "ellipse");
  assert.equal(classify(vesc, h).kind, "escape");
  assert.equal(classify(vesc * 1.05, h).kind, "escape");
  // 1% below circular still hits Earth at 150 km (the miss-Earth window is about 45 m/s).
  assert.equal(classify(vc * 0.99, h).kind, "falls");
  const mid = classify(vc * 1.22, h);
  assert.ok(mid.bound && mid.period > 0, "wider ellipse is bound");
  const circ = classify(vc, h);
  close(circ.period, period(r0), "circular period", 1e-6);
});

test("circular band is ±V_STEP/2 and does not swallow falls or the 7.78 km/s smaller ellipse", () => {
  assert.equal(CIRCULAR_TOL_MPS, V_STEP / 2);
  const h = H_DEFAULT;
  const vc = vOrbit(R_E + h);
  // 0.5% of v_orbit would collide with falls at low peaks and with 7.78 km/s at 150 km.
  const halfPct = 0.005 * vc;
  assert.ok(halfPct > CIRCULAR_TOL_MPS, "0.5% is wider than the band we use");
  assert.equal(classify(vc, h).kind, "circular");
  assert.equal(classify(vc + CIRCULAR_TOL_MPS, h).kind, "circular");
  assert.equal(classify(vc - CIRCULAR_TOL_MPS, h).kind, "circular");
  assert.equal(classify(vc + CIRCULAR_TOL_MPS + 1, h).kind, "ellipse");
  // Nearest 10 m/s slider step above v_orbit still reads as circular.
  const stepAbove = Math.ceil(vc / V_STEP) * V_STEP;
  assert.ok(Math.abs(stepAbove - vc) <= CIRCULAR_TOL_MPS);
  assert.equal(classify(stepAbove, h).kind, "circular");
  // At 8 km the miss-Earth window is only ~2.5 m/s, so a 5 m/s deficit still falls.
  const vcMin = vOrbit(R_E + H_MIN);
  assert.equal(classify(vcMin, H_MIN).kind, "circular");
  assert.equal(classify(vcMin - CIRCULAR_TOL_MPS, H_MIN).kind, "falls");
  assert.equal(classify(vcMin + CIRCULAR_TOL_MPS, H_MIN).kind, "circular");
});

test("a miss below v_orbit is a smaller ellipse with launch at apoapsis", () => {
  const h = H_DEFAULT;
  const vc = vOrbit(R_E + h);
  const low = classify(7780, h); // 7.78 km/s, ~27 m/s below v_orbit, inside the 45 m/s window
  assert.equal(low.kind, "ellipseApo");
  assert.equal(outcomeLabel(low.kind), "Elliptical orbit (launch at its high point)");
  assert.ok(low.bound && low.period > 0);
  const path = samplePath(7780, h);
  const radii = path.points.map((pt) => Math.hypot(pt.x, pt.y));
  assert.ok(Math.min(...radii) >= R_E - 1, "smaller ellipse clears Earth");
  close(Math.max(...radii), R_E + h, "apoapsis is the launch radius", 1);
  const wide = classify(vc * 1.12, h);
  assert.equal(wide.kind, "ellipse");
  assert.equal(outcomeLabel(wide.kind), "Wider elliptical orbit.");
  const widePath = samplePath(vc * 1.12, h);
  const wideR = widePath.points.map((pt) => Math.hypot(pt.x, pt.y));
  close(Math.min(...wideR), R_E + h, "wider ellipse has periapsis at launch", 1);
  assert.ok(Math.max(...wideR) > R_E + h + 1000);
});

test("preset fractions match the sketch outcomes at the default height", () => {
  const presets = presetsAt(H_DEFAULT);
  const kinds = Object.fromEntries(presets.map((p) => [p.id, p.flight.kind]));
  assert.equal(kinds.blue, "falls");
  assert.equal(kinds.green, "falls");
  assert.equal(kinds.red, "circular");
  assert.equal(kinds.yellow, "ellipse");
  assert.equal(kinds.escape, "escape");
  const red = presets.find((p) => p.id === "red");
  close(red.v, vOrbit(R_E + H_DEFAULT), "red is v_orbit");
});

test("samplePath returns points for every outcome and does not go inside Earth on a circular shot", () => {
  for (const p of presetsAt(H_DEFAULT)) {
    const path = samplePath(p.v, H_DEFAULT);
    assert.ok(path.points.length > 8, `${p.id} has a path`);
    if (p.id === "red" || p.id === "yellow") {
      for (const pt of path.points) {
        const r = Math.hypot(pt.x, pt.y);
        assert.ok(r >= R_E - 1, `${p.id} stays at or above the surface (${r} vs ${R_E})`);
      }
    }
    if (p.id === "blue" || p.id === "green") {
      const last = path.points[path.points.length - 1];
      close(Math.hypot(last.x, last.y), R_E, `${p.id} lands on the surface`, 2);
    }
  }
});

test("practice answers are computed from the constants, not typed in", () => {
  const a = practiceAnswers();
  close(a.surface.vOrbit, Math.sqrt(GM_E / R_E), "surface v");
  close(a.surface.period, 2 * Math.PI * Math.sqrt((R_E ** 3) / GM_E), "surface T");
  close(a.surface.g, GM_E / (R_E * R_E), "surface g");
  close(a.surface.vEsc, Math.sqrt(2) * a.surface.vOrbit, "surface escape");
  close(a.iss.r, R_E + ISS_ALTITUDE, "ISS r");
  close(a.iss.vOrbit, Math.sqrt(GM_E / a.iss.r), "ISS v");
  close(a.iss.period, 2 * Math.PI * Math.sqrt((a.iss.r ** 3) / GM_E), "ISS T");
  close(a.moon.r, R_MOON + H_MOON, "Moon r");
  close(a.moon.r, 1.815e6, "Moon r matches the Study Question 1.815e6");
  close(a.moon.vOrbit, Math.sqrt((G * M_MOON) / a.moon.r), "Moon v");
  close(a.moon.period, 2 * Math.PI * a.moon.r / a.moon.vOrbit, "Moon T");
  close(a.planetX.vOrbit, Math.sqrt(PLANET_X.r * PLANET_X.g), "planetX from sqrt(rg)");
  close(a.planetX.period, 2 * Math.PI * PLANET_X.r / a.planetX.vOrbit, "planetX T");
  close(a.mountain.h, H_DEFAULT, "default mountain");
  close(a.mountain.vOrbit, Math.sqrt(GM_E / (R_E + H_DEFAULT)), "mountain v");

  // Approximate teaching values from the brief, as a sanity check, not as typed answers.
  close(a.surface.vOrbit / 1000, 7.90, "about 7.9 km/s", 0.05);
  close(a.surface.period / 60, 84.6, "about 84 min", 1);
  close(a.iss.vOrbit / 1000, 7.67, "about 7.67 km/s", 0.05);
  close(a.iss.period / 60, 92.7, "about 92 min", 1.5);
  close(a.escapeSurface.vEsc / 1000, 11.2, "about 11.2 km/s", 0.1);
  close(a.moon.vOrbit, 1.64e3, "Moon speed matches SQ ~1.64e3", 20);
  close(a.moon.period, 6.94e3, "Moon period matches SQ ~6.94e3 s", 30);

  const html = read("public/study-newtons-cannonball-fire.html");
  assert.doesNotMatch(html, /7\.9\d*\s*km\/s|11\.2\s*km\/s|84\s*min/);
  const strings = read("public/newtons-cannonball-fire/ncf-strings.js");
  assert.doesNotMatch(strings, /7898|7661|11169|5076/);
});

test("derivation identity: sqrt(r g) equals sqrt(GM/r), and T formulas agree", () => {
  const r = R_E + H_DEFAULT;
  const g = gEarth(r);
  close(Math.sqrt(r * g), vOrbit(r), "sqrt(rg) = sqrt(GM/r)");
  close(2 * Math.PI * r / Math.sqrt(r * g), period(r), "T from chalkboard form");
});

test("applySandbox points the Earth problems at the sandbox sliders with exact v", () => {
  const a = practiceAnswers();
  const s = applySandbox("surface");
  close(s.h, H_MIN, "surface uses the 8 km peak");
  close(s.v, vOrbit(R_E + H_MIN), "surface apply is exact v_orbit at 8 km, not slider-snapped");
  assert.equal(classify(s.v, s.h).kind, "circular");
  const esc = applySandbox("escapeSurface");
  close(esc.h, H_MIN, "escape uses the 8 km peak");
  close(esc.v, vEscape(R_E + H_MIN), "escape apply is exact v_esc at 8 km");
  assert.equal(classify(esc.v, esc.h).kind, "escape");
  const iss = applySandbox("iss");
  close(iss.h, a.iss.h, "ISS height");
  close(iss.v, a.iss.vOrbit, "ISS speed is exact");
  assert.equal(classify(iss.v, iss.h).kind, "circular");
  const m = applySandbox("mountain");
  close(m.h, H_DEFAULT, "mountain height");
  close(m.v, a.mountain.vOrbit, "mountain speed is exact");
  assert.equal(classify(m.v, m.h).kind, "circular");
  assert.equal(applySandbox("moon"), null);
});

test("Socrates wording is signed off, Tesla numbers are cleared, and practice steps fill in", () => {
  assert.equal(PLACEHOLDER, false);
  assert.equal(TESLA_PENDING, false);
  assert.ok(STRINGS.problems.length >= 6);
  assert.equal(STRINGS.problems[3].id, "moon");
  assert.match(STRINGS.problems[3].prompt, /7\.35|1\.74|75 km/);
  assert.doesNotMatch(JSON.stringify(STRINGS), /\u2014|\u2013/);
  assert.match(STRINGS.peakNote, /8 km peak/);
  assert.doesNotMatch(STRINGS.peakNote, /\u2014|\u2013/);
  for (const id of ["escapeSurface", "planetX", "mountain"]) {
    const p = STRINGS.problems.find((row) => row.id === id);
    assert.equal(p.steps.length, 4, `${id} has four steps`);
    assert.equal(p.steps[2].title, "Work");
    assert.equal(p.steps[3].title, "Solve");
  }
  const placeholders = new Set();
  JSON.stringify(STRINGS, (_, v) => {
    if (typeof v === "string") {
      for (const m of v.matchAll(/\{(\w+)\}/g)) placeholders.add(m[1]);
    }
    return v;
  });
  const expected = ["R", "GM", "v", "Tsec", "Tmin", "h", "r", "g", "vOrbit", "vEsc", "vSci"];
  for (const k of expected) assert.ok(placeholders.has(k), `keeps {${k}}`);
  const html = read("public/study-newtons-cannonball-fire.html");
  assert.match(html, /id="peakNote"/);
  const ui = read("public/newtons-cannonball-fire/ncf-ui.js");
  assert.match(ui, /marks\.hidden = !PLACEHOLDER && !TESLA_PENDING/);
  assert.match(ui, /setExactV\(next\.v\)/);
});

test("module is wired: page, library card, primary M7 L2 Try it card, thumbs exist", () => {
  assert.ok(existsSync(join(PUB, "study-newtons-cannonball-fire.html")));
  const html = read("public/study-newtons-cannonball-fire.html");
  assert.match(html, /data-study-back/);
  assert.match(html, /newtons-cannonball-fire\/ncf-ui\.js/);
  assert.doesNotMatch(html, /firebase|signInAnonymously|getAuth\(/);
  const study = read("public/study.html");
  assert.match(study, /id: "newtons-cannonball-fire"/);
  assert.match(study, /file: "study-newtons-cannonball-fire\.html"/);
  const tryit = read("public/physics101/tryit.js");
  assert.match(tryit, /"newtons-cannonball-fire": \["Newton's Cannonball Fire", "study-newtons-cannonball-fire\.html"/);
  const map = JSON.parse(read("public/physics101/tryit/map.json"));
  assert.equal(map["m07-l02"][0].id, "newtons-cannonball-fire");
  assert.ok(map["m07-l02"].some((r) => r.id === "3d-cannon"));
  assert.ok(map["m07-l02"].some((r) => r.id === "3d-cannonball"));
  assert.ok(!Object.entries(map).some(([slug, rows]) => slug !== "m07-l02" && (rows || []).some((r) => r.id === "newtons-cannonball-fire")));
  assert.ok(existsSync(join(PUB, "physics101/tryit/thumbs/study-newtons-cannonball-fire.svg")));
  assert.ok(existsSync(join(PUB, "physics101/tryit/thumbs/study-newtons-cannonball-fire-dark.svg")));
  assert.equal(Object.keys(ART).length, 5);
  assert.match(read("public/newtons-cannonball-fire/art/README.md"), /space\.webp/);
});

test("formatters do not invent values", () => {
  const v = practiceAnswers().surface.vOrbit;
  assert.equal(formatKmS(v), `${(v / 1000).toFixed(2)} km/s`);
});
