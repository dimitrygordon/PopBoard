import test from "node:test";
import assert from "node:assert/strict";
import * as X from "../public/exoplanets-physics.js";

const sun = { ...X.mainSequenceStar(1), mass: 1, radius: 1, lum: 1, teff: 5772, u1: 0, u2: 0 };
const jup = (over = {}) => X.prepareOrbit(sun, { radius: X.R_JUP, mass: X.M_JUP, period: 5, e: 0, omega: Math.PI / 2, inc: Math.PI / 2, t0: 1, ...over });

test("central transit depth matches (Rp/R*)^2 with no limb darkening", () => {
  for (const k of [0.01, 0.05, 0.1, 0.15]) {
    assert.ok(Math.abs(X.transitDeficit(0, k, 0, 0) - k * k) < 1e-15);
  }
  const o = jup();
  const target = { star: sun, orbits: [o] };
  const depth = 1 - X.modelFlux(target, o.t0);
  const k = X.R_JUP / X.R_SUN;
  assert.ok(Math.abs(depth - k * k) / (k * k) < 1e-6, `depth ${depth} vs ${k * k}`);
});

test("limb darkening deepens a central transit by I(0)/<I>", () => {
  const k = 0.1, u1 = 0.4, u2 = 0.25;
  const d = X.transitDeficit(0, k, u1, u2);
  assert.ok(Math.abs(d - k * k / (1 - u1 / 3 - u2 / 6)) < 1e-12);
  assert.ok(X.transitDeficit(0.95, k, u1, u2) < d);
});

test("no transit when b > 1 + Rp/R*, grazing when between 1-k and 1+k", () => {
  const k = X.R_JUP / X.R_SUN;
  const a = X.semiMajorAxis(5, X.M_SUN, X.M_JUP);
  const incFor = (b) => Math.acos(b * X.R_SUN / a);
  const miss = jup({ inc: incFor(1 + k + 0.02) });
  assert.ok(X.impactParameter(miss) > 1 + k);
  assert.equal(X.transits(miss), false);
  assert.equal(X.transitDuration(miss), 0);
  let minF = 1;
  for (let t = 0; t < 5; t += 0.001) minF = Math.min(minF, X.modelFlux({ star: sun, orbits: [miss] }, t));
  assert.equal(minF, 1);
  const graze = jup({ inc: incFor(1) });
  assert.equal(X.transits(graze), true);
  const gd = 1 - X.modelFlux({ star: sun, orbits: [graze] }, graze.t0);
  assert.ok(gd > 0 && gd < k * k * 0.6, `grazing depth ${gd}`);
});

test("transit duration matches the circular-orbit formula", () => {
  const o = jup();
  const k = o.radius / o.Rs, aR = o.a / o.Rs;
  const T = 5 / Math.PI * Math.asin((1 + k) / aR);
  assert.ok(Math.abs(X.transitDuration(o) - T) < 1e-9);
  // and the model is flat outside it
  const f = (t) => X.modelFlux({ star: sun, orbits: [o] }, t);
  assert.equal(f(o.t0 + T / 2 + 0.01), 1);
  assert.ok(f(o.t0 + T / 2 - 0.01) < 1);
});

test("RV amplitude matches the K formula, including eccentricity", () => {
  // Jupiter around the Sun: K about 12.5 m/s
  const Kj = X.rvSemiAmplitude(4332.59, X.M_SUN, X.M_JUP);
  assert.ok(Math.abs(Kj - 12.5) < 0.2, `K_J ${Kj}`);
  for (const e of [0, 0.3, 0.6]) {
    const o = jup({ e, omega: 1.1, inc: 1.3 });
    let lo = Infinity, hi = -Infinity;
    for (let t = 0; t < 5; t += 0.0005) { const v = X.orbitState(o, t).rv; lo = Math.min(lo, v); hi = Math.max(hi, v); }
    const K = Math.cbrt(2 * Math.PI * X.G / (5 * X.DAY)) * X.M_JUP * Math.sin(1.3) / Math.pow(X.M_SUN + X.M_JUP, 2 / 3) / Math.sqrt(1 - e * e);
    assert.ok(Math.abs((hi - lo) / 2 - K) / K < 1e-3, `e=${e}`);
    // RV equals minus dz/dt of the star? z away from observer => rv = +vz
    const s = X.orbitState(o, 2.2);
    assert.ok(Math.abs(s.rv - s.star.vz) < 1e-6 * K);
  }
});

test("star-planet momentum balance in the wobble", () => {
  const o = jup({ e: 0.4, omega: 0.7, inc: 1.2 });
  for (let t = 0; t < 5; t += 0.37) {
    const s = X.orbitState(o, t);
    for (const c of ["x", "y", "z"]) {
      assert.ok(Math.abs(o.Ms * s.star[c] + o.Mp * s.planet[c]) < 1e-9 * o.Ms * Math.abs(s.star[c] || 1) + 1e10);
      const v = "v" + c;
      assert.ok(Math.abs(o.Ms * s.star[v] + o.Mp * s.planet[v]) <= 1e-12 * o.Ms * (Math.abs(s.star[v]) + 1));
    }
    const rs = Math.hypot(s.star.x, s.star.y, s.star.z), rp = Math.hypot(s.planet.x, s.planet.y, s.planet.z);
    assert.ok(Math.abs(rs / rp - o.Mp / o.Ms) < 1e-12);
  }
  // velocities agree with numerical derivative of positions
  const dt = 1e-4, a = X.orbitState(o, 1), b = X.orbitState(o, 1 + dt);
  const num = (b.star.z - a.star.z) / (dt * X.DAY);
  assert.ok(Math.abs(num - a.star.vz) / Math.abs(a.star.vz) < 1e-3);
});

test("Kepler solver accuracy across eccentricities", () => {
  for (const e of [0, 0.1, 0.5, 0.9, 0.99]) {
    for (let M = -10; M <= 10; M += 0.173) {
      const E = X.solveKepler(M, e);
      assert.ok(Math.abs(E - e * Math.sin(E) - M) < 1e-12, `e=${e} M=${M}`);
    }
  }
});

test("BLS and Lomb-Scargle recover known periods from noisy data", () => {
  const t = X.generateTarget(1234, { kind: "planet", noise: 8e-4 });
  const P = t.planets[0].period;
  if (X.transits(t.orbits[0])) {
    const r = X.bls(t.lightCurve.t, t.lightCurve.f, { nPeriods: 2000 });
    assert.ok(Math.abs(r.period - P) / P < 0.01, `bls ${r.period} vs ${P}`);
  }
  // synthetic sine with uneven sampling
  const rng = X.createRng(9);
  const times = [], v = [];
  for (let i = 0; i < 30; i++) { const ti = rng.uniform(0, 80); times.push(ti); v.push(40 * Math.sin(2 * Math.PI * ti / 7.3) + rng.gauss(0, 4)); }
  times.sort((a, b) => a - b);
  const vv = times.map((ti) => 40 * Math.sin(2 * Math.PI * ti / 7.3) + rng.gauss(0, 4));
  const ls = X.lombScargle(Float64Array.from(times), Float64Array.from(vv));
  assert.ok(Math.abs(ls.period - 7.3) / 7.3 < 0.01, `ls ${ls.period}`);
  assert.ok(Math.abs(ls.K - 40) < 6);
});

test("inference round trip: depth -> radius, K -> mass, density", () => {
  const k = 0.1;
  assert.ok(Math.abs(X.radiusFromDepth(k * k, 1) - 0.1 * X.R_SUN) < 1);
  const K = X.rvSemiAmplitude(10, X.M_SUN, 5 * X.M_EARTH, 1.0);
  const m = X.massFromK(K, 10, 1, 0, 1.0);
  assert.ok(Math.abs(m / (5 * X.M_EARTH) - 1) < 1e-9);
  const rhoE = X.bulkDensity(X.M_EARTH, X.R_EARTH);
  assert.ok(Math.abs(rhoE - 5500) < 100, `rho ${rhoE}`);
});

test("habitable zone for the Sun (Kopparapu 2013 conservative; 0.95-1.67 AU Kasting 1993 water-loss to maximum-greenhouse limits)", () => {
  const hz = X.habitableZone(1, 5780);
  assert.ok(Math.abs(hz.conservative.inner - 0.99) < 0.01);
  assert.ok(Math.abs(hz.conservative.outer - 1.70) < 0.01);
  assert.ok(Math.abs(hz.optimistic.inner - 0.75) < 0.01);
  assert.ok(Math.abs(hz.optimistic.outer - 1.77) < 0.01);
  assert.equal(hz.simple.inner, 0.95);
  assert.equal(hz.simple.outer, 1.67);
  assert.match(hz.simple.label, /water-loss to maximum-greenhouse/);
  // matches the art pack's F-star caption (1.9 Lsun, 6500 K -> 1.3 to 2.2 AU)
  const f = X.habitableZone(1.9, 6500).conservative;
  assert.ok(Math.abs(f.inner - 1.3) < 0.05 && Math.abs(f.outer - 2.2) < 0.05);
});

test("seeded reproducibility and target mix", () => {
  const a = X.generateTarget(777), b = X.generateTarget(777);
  assert.deepEqual(Array.from(a.lightCurve.f.slice(0, 50)), Array.from(b.lightCurve.f.slice(0, 50)));
  assert.deepEqual(Array.from(a.rv.v), Array.from(b.rv.v));
  assert.notDeepEqual(Array.from(X.generateTarget(778).lightCurve.f.slice(0, 50)), Array.from(a.lightCurve.f.slice(0, 50)));
  const kinds = new Set(X.generateField(5, 40).map((s) => X.generateTarget(s.seed).kind));
  for (const k of X.KINDS) assert.ok(kinds.has(k), k);
});

test("eclipsing binary shows unequal primary and secondary eclipses and km/s RV", () => {
  const t = X.generateTarget(31, { kind: "binary", noise: 0 });
  const o = t.orbits[0];
  const prim = 1 - X.modelFlux({ ...t, variability: null }, o.t0);
  const sec = 1 - X.modelFlux({ ...t, variability: null }, o.t0 + o.period / 2);
  assert.ok(prim > 0 && sec > 0 && sec < prim, `prim ${prim} sec ${sec}`);
  assert.ok(o.K > 1000);
});

test("verdict scoring", () => {
  const t = X.generateTarget(99, { kind: "planet" });
  const tr = X.truthSummary(t);
  const perfect = X.scoreVerdict(t, { kind: "planet", period: tr.period, radiusEarth: tr.planets[0].transits ? tr.radiusEarth : 0, massEarth: tr.planets[0].transits ? tr.massEarth : tr.msiniEarth });
  assert.equal(perfect.score, 100);
  assert.equal(X.scoreVerdict(t, { kind: "none" }).score, 0);
  assert.equal(X.scoreVerdict(X.generateTarget(5, { kind: "none" }), { kind: "none" }).score, 100);
  assert.equal(X.modeFromSearch("?mode=RV"), "rv");
  assert.equal(X.modeFromSearch("?mode=bogus"), "field");
});

test("limb darkening coefficients follow the reviewed Kepler-band law", () => {
  const sunLike = X.generateTarget(1, { kind: "planet" }).star;
  assert.equal(sunLike.u2, 0.25);
  assert.ok(Math.abs(sunLike.u1 - Math.max(0, 0.65 - 0.25 * (sunLike.teff - 4000) / 2000)) < 1e-12);
  assert.ok(Math.abs((0.65 - 0.25 * 1800 / 2000) - 0.425) < 1e-12);  // ~0.43 at 5800 K
});

test("about a third of binaries are full eclipses with flat bottoms", () => {
  let full = 0, n = 0;
  for (let seed = 1; seed <= 90; seed++) {
    const t = X.generateTarget(seed, { kind: "binary", noise: 0 });
    const o = t.orbits[0], k = o.radius / o.Rs, b = X.impactParameter(o);
    n++;
    if (o.eclipse !== "full") { assert.ok(b >= 0.95 - 1e-9); continue; }
    full++;
    assert.ok(b < 1 - k, `seed ${seed} b ${b} k ${k}`);
    const sys = { ...t, variability: null };
    // totality: sample around the secondary eclipse where the companion is fully hidden
    const tot = [];
    for (let dt = -0.3; dt <= 0.3; dt += 0.002) {
      const tt = o.t0 + o.period / 2 + dt;
      if (X.orbitState(o, tt).sep <= 1 - k) tot.push(X.modelFlux(sys, tt));
    }
    assert.ok(tot.length >= 5, "secondary totality is resolved");
    assert.ok(Math.max(...tot) - Math.min(...tot) < 1e-12, "flat secondary bottom");
    const prim = 1 - X.modelFlux(sys, o.t0), sec = 1 - tot[0];
    assert.ok(sec > 0 && sec < prim, "deep primary, shallow secondary");
    assert.ok(o.K > 1000, "K in km/s");
  }
  const frac = full / n;
  assert.ok(frac > 0.2 && frac < 0.47, `full fraction ${frac}`);
});
