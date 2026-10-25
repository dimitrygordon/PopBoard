// Orbital Mechanics & Gravity Playground physics checks. No browser.
//   node --test tests/orbits-physics.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import {
  createSystem, buildPreset, step, totalEnergy, totalAngularMomentum, totalMomentum, totalMass,
  orbitalElements, circularPeriod, circularVelocity, escapeVelocity, lagrangePoints,
  detectResonance, predict, checkStability, createStabilityTracker, modeFromSearch, PRESETS,
  resolveCollisions, isEjected, cloneSystem
} from "../public/orbits-physics.js";

const byId = (sys, id) => sys.bodies.find((b) => b.id === id);

test("energy and angular momentum stay bounded over 200 eccentric orbits", () => {
  const sys = createSystem([
    { id: "sun", kind: "star", m: 1, x: 0, y: 0 },
    { id: "p", m: 1e-3, x: 1, y: 0, vx: 0, vy: 1.2 } // e ~ 0.44
  ]);
  const E0 = totalEnergy(sys), L0 = totalAngularMomentum(sys);
  const P = orbitalElements(byId(sys, "p"), byId(sys, "sun")).period;
  let maxDE = 0;
  while (sys.t < 200 * P) {
    step(sys, 0.02);
    maxDE = Math.max(maxDE, Math.abs((totalEnergy(sys) - E0) / E0));
  }
  assert.equal(sys.bodies.length, 2);
  assert.ok(maxDE < 1e-4, "energy drift " + maxDE);
  assert.ok(Math.abs((totalAngularMomentum(sys) - L0) / L0) < 1e-9);
});

test("inner solar system conserves energy over 100 Earth years", () => {
  const sys = buildPreset("inner");
  const E0 = totalEnergy(sys), L0 = totalAngularMomentum(sys);
  while (sys.t < 200 * Math.PI) step(sys, 0.01);
  assert.equal(sys.bodies.length, 5);
  assert.ok(Math.abs((totalEnergy(sys) - E0) / E0) < 1e-5);
  assert.ok(Math.abs((totalAngularMomentum(sys) - L0) / L0) < 1e-8);
});

test("circular orbit period matches 2*pi*sqrt(r^3/GM)", () => {
  const r = 2;
  const sys = createSystem([{ id: "s", kind: "star", m: 1, x: 0, y: 0 }, { id: "p", m: 1e-9, x: r, y: 0 }]);
  const v = circularVelocity(sys, r, 0);
  Object.assign(byId(sys, "p"), { vx: v.vx, vy: v.vy });
  const expected = circularPeriod(r, 1);
  // Time the first upward crossing of y = 0 after one lap.
  let prevY = 0, t = 0, crossings = 0, hit = null;
  const dt = 0.005;
  while (!hit && t < 2 * expected) {
    step(sys, dt); t += dt;
    const y = byId(sys, "p").y;
    if (prevY < 0 && y >= 0) { crossings++; hit = t - dt * y / (y - prevY); }
    prevY = y;
  }
  assert.ok(hit, "completed a lap");
  assert.ok(Math.abs(hit - expected) / expected < 1e-4, `period ${hit} vs ${expected}`);
  const el = orbitalElements(byId(sys, "p"), byId(sys, "s"));
  assert.ok(el.e < 1e-3);
  assert.ok(Math.abs(el.a - r) < 1e-3);
});

test("merges conserve mass and momentum, and falling into the star is flagged", () => {
  const sys = createSystem([
    { id: "a", m: 0.002, x: -0.5, y: 0, vx: 0.8, vy: 0.002, r: 0.02 },
    { id: "b", m: 0.001, x: 0.5, y: 0.01, vx: -0.6, vy: 0, r: 0.02 }
  ], { softening: 1e-3 });
  const p0 = totalMomentum(sys), m0 = totalMass(sys);
  for (let i = 0; i < 200 && sys.bodies.length > 1; i++) step(sys, 0.01);
  assert.equal(sys.bodies.length, 1);
  assert.equal(sys.events[0].type, "merge");
  const p1 = totalMomentum(sys);
  assert.ok(Math.abs(p1.px - p0.px) < 1e-12 && Math.abs(p1.py - p0.py) < 1e-12);
  assert.ok(Math.abs(totalMass(sys) - m0) < 1e-15);

  const fall = createSystem([
    { id: "sun", kind: "star", m: 1, x: 0, y: 0 },
    { id: "rock", m: 1e-4, x: 1, y: 0, vx: 0, vy: 0.05 }
  ]);
  const fp0 = totalMomentum(fall);
  for (let i = 0; i < 500 && fall.bodies.length > 1; i++) step(fall, 0.01);
  assert.equal(fall.bodies.length, 1);
  assert.equal(fall.bodies[0].kind, "star");
  assert.ok(fall.events.some((e) => e.type === "star-fall"));
  const fp1 = totalMomentum(fall);
  assert.ok(Math.abs(fp1.px - fp0.px) < 1e-12 && Math.abs(fp1.py - fp0.py) < 1e-12);
});

test("an escaping body is ejected; a bound one far out is not", () => {
  const vesc = Math.sqrt(2);
  const sys = createSystem([
    { id: "sun", kind: "star", m: 1, x: 0, y: 0 },
    { id: "fast", m: 1e-6, x: 1, y: 0, vx: 1.2 * vesc, vy: 0 }
  ], { ejectDistance: 10 });
  assert.ok(Math.abs(escapeVelocity(sys, 1, 0) - vesc) < 1e-3);
  for (let i = 0; i < 3000 && sys.bodies.length > 1; i++) step(sys, 0.02);
  assert.ok(sys.events.some((e) => e.type === "ejected" && e.id === "fast"));

  const bound = createSystem([
    { id: "sun", kind: "star", m: 1, x: 0, y: 0 },
    { id: "slow", m: 1e-6, x: 12, y: 0, vx: 0, vy: 0.1 }
  ], { ejectDistance: 10 });
  assert.equal(isEjected(bound, byId(bound, "slow")), false);
});

test("Lagrange points: L4/L5 equilateral, L1 near the Hill radius", () => {
  const sys = buildPreset("trojans");
  const L = lagrangePoints(byId(sys, "sun"), byId(sys, "jupiter"));
  const s = byId(sys, "sun"), j = byId(sys, "jupiter");
  const R = Math.hypot(j.x - s.x, j.y - s.y);
  for (const k of ["L4", "L5"]) {
    assert.ok(Math.abs(Math.hypot(L[k].x - s.x, L[k].y - s.y) - R) < 1e-9);
    assert.ok(Math.abs(Math.hypot(L[k].x - j.x, L[k].y - j.y) - R) < 1e-9);
  }
  const hill = R * Math.cbrt(0.001 / 3);
  assert.ok(Math.abs(Math.hypot(L.L1.x - j.x, L.L1.y - j.y) - hill) / hill < 0.1);
  // L4 leads Jupiter in a counter-clockwise orbit.
  const angJ = Math.atan2(j.y, j.x), ang4 = Math.atan2(L.L4.y, L.L4.x);
  assert.ok(Math.sin(ang4 - angJ) > 0.8);
});

test("a Trojan at L4 librates around L4 for 50 Jupiter orbits", () => {
  const sys = buildPreset("trojans");
  let maxDev = 0;
  while (sys.t < 50 * 2 * Math.PI) {
    step(sys, 0.02);
    const s = byId(sys, "sun"), j = byId(sys, "jupiter"), t = byId(sys, "t4a");
    assert.ok(t, "trojan survived");
    let d = Math.atan2(t.y - s.y, t.x - s.x) - Math.atan2(j.y - s.y, j.x - s.x);
    d = Math.atan2(Math.sin(d), Math.cos(d)) * 180 / Math.PI;
    maxDev = Math.max(maxDev, Math.abs(d - 60));
  }
  assert.ok(maxDev < 15, "libration amplitude " + maxDev);
});

test("resonance detector finds 2:1 in the preset and ignores non-resonant pairs", () => {
  const sys = buildPreset("resonance");
  const s = byId(sys, "sun");
  const P1 = orbitalElements(byId(sys, "inner"), s).period;
  const P2 = orbitalElements(byId(sys, "outer"), s).period;
  const r = detectResonance(P1, P2);
  assert.equal(r.label, "2:1");
  assert.equal(detectResonance(1, 1.5).label, "3:2");
  assert.equal(detectResonance(1, Math.SQRT2 * 1.1, { tol: 0.005 }), null);
});

test("prediction leaves the live system untouched and matches stepping", () => {
  const sys = buildPreset("sun-earth");
  const before = JSON.stringify(sys.bodies);
  const g = predict(sys, { steps: 50, dt: 0.02 });
  assert.equal(JSON.stringify(sys.bodies), before);
  assert.equal(g.paths.earth.length, 102);
  const copy = cloneSystem(sys);
  for (let i = 0; i < 50; i++) step(copy, 0.02);
  const e = byId(copy, "earth");
  assert.ok(Math.abs(g.paths.earth[100] - e.x) < 1e-12);
});

test("stability checker passes a calm orbit and fails the chaos preset", () => {
  const calm = buildPreset("sun-earth");
  const ok = checkStability(calm, "earth", "sun", { orbits: 5, dt: 0.02 });
  assert.equal(ok.status, "passed");
  const wild = buildPreset("chaos");
  const bad = checkStability(wild, "p1", "s1", { orbits: 20, dt: 0.01, maxTime: 400 });
  assert.equal(bad.status, "failed");
  assert.equal(createStabilityTracker(calm, "nope", "sun").status, "failed");
});

test("every preset builds, and ?mode= deep links resolve", () => {
  for (const k of Object.keys(PRESETS)) assert.ok(buildPreset(k).bodies.length >= 1, k);
  assert.equal(modeFromSearch("?mode=trojans"), "trojans");
  assert.equal(modeFromSearch("?mode=L4".replace("L4", "lagrange")), "trojans");
  assert.equal(modeFromSearch("?mode=bogus"), "sandbox");
  assert.equal(modeFromSearch(""), "sandbox");
});

test("collisions resolve in a pile-up without losing mass", () => {
  const sys = createSystem([
    { id: "a", m: 1e-3, x: 0, y: 0, r: 0.1 }, { id: "b", m: 2e-3, x: 0.05, y: 0, r: 0.1 },
    { id: "c", m: 3e-3, x: 0.1, y: 0, r: 0.1 }
  ]);
  resolveCollisions(sys);
  assert.equal(sys.bodies.length, 1);
  assert.ok(Math.abs(sys.bodies[0].m - 6e-3) < 1e-15);
});
