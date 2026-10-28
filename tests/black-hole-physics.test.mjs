import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import * as P from "../public/black-hole/bh-physics.js";
import * as F from "../public/black-hole/bh-format.js";
import * as Rel from "../public/relativity-physics.js";

const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg || ""} ${a} vs ${b}`);
const rel = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol * Math.abs(b), `${msg || ""} ${a} vs ${b}`);

test("a = 0 reduces to the Relativity Sandbox's Schwarzschild values", () => {
  const m = P.meterPerM(10);
  const rs = Rel.schwarzschildRadius(10 * Rel.M_SUN);
  rel(P.horizonRadius(0) * m, rs, 1e-12, "horizon");
  rel(P.photonOrbitRadius(0, 1) * m, Rel.photonSphereRadius(10 * Rel.M_SUN), 1e-12, "photon pro");
  rel(P.photonOrbitRadius(0, -1) * m, Rel.photonSphereRadius(10 * Rel.M_SUN), 1e-12, "photon retro");
  rel(P.iscoRadius(0, 1) * m, Rel.iscoRadius(10 * Rel.M_SUN), 1e-12, "isco pro");
  rel(P.iscoRadius(0, -1) * m, Rel.iscoRadius(10 * Rel.M_SUN), 1e-12, "isco retro");
  rel(P.photonImpactParameter(0, 1), P.B_CRIT, 1e-12);
  rel(P.B_CRIT * m, Rel.criticalImpactParameter(rs), 1e-12, "capture b");
  for (const r of [2.5, 4, 6, 12, 100]) {
    rel(P.hoverClockRate(r), Rel.staticClockRate(r * m, rs), 1e-12, "hover");
    rel(P.orbitClockRate(r, 0), Rel.circularOrbitClockRate(r * m, rs), 1e-12, "orbit");
    rel(P.orbitClockRate(r, 1e-9), Rel.circularOrbitClockRate(r * m, rs), 1e-8, "Kerr branch at tiny spin");
  }
  near(P.meterPerM(1), 1476.6, 0.5, "GM_sun/c^2 in m");
});

test("Kerr values match Bardeen, Press and Teukolsky (1972)", () => {
  near(P.horizonRadius(0.998), 1.0632, 1e-4);
  near(P.iscoRadius(0.5, 1), 4.233, 1e-3);
  near(P.iscoRadius(0.5, -1), 7.555, 1e-3);
  near(P.iscoRadius(0.998, 1), 1.237, 1e-3);
  near(P.iscoRadius(0.999999, -1), 9, 1e-3);
  near(P.iscoRadius(0.999999, 1), 1, 0.02);
  near(P.photonOrbitRadius(0.999999, 1), 1, 0.01);
  near(P.photonOrbitRadius(0.999999, -1), 4, 1e-4);
  near(P.marginallyBoundRadius(0, 1), 4, 1e-12);
  near(P.marginallyBoundRadius(0.999999, -1), 2 + 1 + 2 * Math.SQRT2, 1e-4);
  const e = P.shadowEdges(0.999999);
  near(e.pro, 2, 0.01); near(e.retro, 7, 1e-4);
  near(P.diskEfficiency(0, 1), 1 - Math.sqrt(8 / 9), 1e-12);
  near(P.diskEfficiency(0.998, 1), 0.321, 1e-3);
  near(P.diskEfficiency(0.999999, -1), 1 - Math.sqrt(25 / 27), 1e-4);
});

test("the ISCO is the minimum of circular-orbit energy and the photon orbit is where circular orbits end", () => {
  for (const a of [0, 0.3, 0.7, 0.95, 0.998]) for (const dir of [1, -1]) {
    const ri = P.iscoRadius(a, dir);
    const E = (r) => P.circularEnergy(r, a, dir);
    assert.ok(E(ri) < E(ri * 0.98) && E(ri) < E(ri * 1.02), `min at ${a} ${dir}`);
    const rp = P.photonOrbitRadius(a, dir);
    assert.equal(P.circularEnergy(rp * 0.999, a, dir), null);
    assert.ok(P.circularEnergy(rp * 1.001, a, dir) > 2, "E grows without bound at the photon orbit");
    near(P.circularEnergy(P.marginallyBoundRadius(a, dir), a, dir), 1, 1e-9, "E = 1 at r_mb");
    assert.ok(P.horizonRadius(a) <= rp && rp < P.marginallyBoundRadius(a, dir) && P.marginallyBoundRadius(a, dir) < ri + 1e-12);
  }
});

test("orbit status bands", () => {
  assert.equal(P.orbitStatus(2.5, 0), "none");
  assert.equal(P.orbitStatus(4, 0), "unstable");
  assert.equal(P.orbitStatus(6, 0), "stable");
  assert.equal(P.orbitStatus(4, 0.9), "stable");
  assert.equal(P.orbitStatus(1.5, 0), "inside");
});

test("bending angle: exact quadrature agrees with the sandbox tracer and the Einstein limit", () => {
  for (const b of [5.25, 6, 8, 12, 30]) {
    const traced = P.tracedClosestApproach(b), exact = P.closestApproach(b);
    rel(exact, traced, 1e-6, "closest approach b=" + b);
  }
  near(P.bendingAngle(200), 4 / 200 + (15 * Math.PI) / 4 / 200 ** 2 + (401 / 12) / 200 ** 3, 2e-6, "third-order weak field");
  rel(P.weakBendingAngle(200), 0.02, 1e-12);
  assert.equal(P.bendingAngle(5.19), null);
  assert.ok(P.bendingAngle(5.2) > 2 * Math.PI, "near capture light can loop");
  const sun = Rel.solarLimbDeflection().arcsec;
  near(sun, 1.75, 0.01, "solar limb");
});

test("ray paths: captured below 3 sqrt 3 and scattered above", () => {
  assert.equal(P.rayPath(4).captured, true);
  assert.equal(P.rayPath(6).captured, false);
  assert.ok(P.rayPath(6).points.length > 10);
});

test("tides scale as M^-2 at the horizon and the Hills mass is about 1e8 Msun", () => {
  rel(P.tidalAtHorizon(10, 0) / P.tidalAtHorizon(100, 0), 100, 1e-12);
  // c^6 L / (4 G^2 M^2) at a = 0
  const M = 10 * Rel.M_SUN;
  rel(P.tidalAtHorizon(10, 0), (Rel.C ** 6 * 2) / (4 * Rel.G ** 2 * M * M), 1e-9);
  near(P.hillsMass(0) / 1e8, 1.14, 0.01);
  assert.ok(P.hillsMass(0.998) > P.hillsMass(0));
  near(P.disruptionRadius(P.hillsMass(0)), P.horizonRadius(0), 1e-9);
  assert.equal(P.readouts({ massSun: 1e9, a: 0, r: 3 }).swallowedWhole, true);
  assert.equal(P.readouts({ massSun: 4.3e6, a: 0, r: 3 }).swallowedWhole, false);
  assert.deepEqual([0.5, 5, 50, 500].map(P.astronautFrame), [1, 2, 3, 4]);
});

test("orbital period at the a = 0 ISCO scales with mass", () => {
  const T10 = P.orbitalPeriodSeconds(6, 0, 10);
  near(T10 * 1000, 4.55, 0.01, "ms for 10 Msun");
  rel(P.orbitalPeriodSeconds(6, 0, 4.3e6) / T10, 4.3e5, 1e-12);
  assert.equal(P.orbitalPeriodSeconds(2.5, 0, 10), null);
});

test("modes and deep links", () => {
  assert.equal(P.modeFromSearch(""), "horizon");
  assert.equal(P.modeFromSearch("?mode=isco"), "disk");
  assert.equal(P.modeFromSearch("?mode=SPAGHETTI"), "tides");
  assert.equal(P.modeFromSearch("?mode=nope"), "horizon");
  for (const m of P.MODES) assert.equal(P.modeFromSearch("?mode=" + m.id), m.id);
  const p = P.paramsFromSearch("?mass=1e20&spin=2&r=1");
  near(Math.log10(p.massSun), 10, 1e-12); near(p.a, P.SPIN_MAX, 0); near(p.r, 2.1, 1e-9);
  const d = P.paramsFromSearch("");
  near(d.massSun, 10, 1e-9); near(d.a, 0, 0); near(d.r, 12, 1e-9);
});

// Every number on screen, swept across each slider with the others held at
// several settings. Adjacent slider steps must not change a value by more
// than 2x unless the physics itself does (a value appearing or vanishing:
// capture, no stable orbit).
test("no displayed value jumps more than 2x between adjacent slider steps", () => {
  const keys = ["rPlusKm", "rsKm", "photonPro", "photonRetro", "shadowPro", "shadowRetro", "shadowWidthKm", "iscoPro", "iscoRetro",
    "iscoProKm", "iscoRetroKm", "etaPro", "etaRetro", "iscoPeriod", "rKm", "period", "energy", "hover", "hoverFactor", "orbit", "orbitFactor",
    "bend", "weakBend", "stretchG", "horizonStretchG", "rtOverRp", "hills", "rPlus"];
  const masses = P.sliderSteps("mass"), spins = P.sliderSteps("spin"), dists = P.sliderSteps("dist");
  const fixedM = [0.5, 1, 6.63, 10], fixedA = [0, 0.5, 0.9, 0.998], fixedR = [Math.log10(2.1), Math.log10(5.3), Math.log10(12), 2];
  const sweeps = [];
  for (const a of fixedA) for (const r of fixedR) sweeps.push(masses.map((lm) => ({ massSun: 10 ** lm, a, r: 10 ** r })));
  for (const lm of fixedM) for (const r of fixedR) sweeps.push(spins.map((a) => ({ massSun: 10 ** lm, a, r: 10 ** r })));
  for (const lm of fixedM) for (const a of fixedA) sweeps.push(dists.map((r) => ({ massSun: 10 ** lm, a, r: 10 ** r })));
  let checked = 0;
  for (const sweep of sweeps) {
    let prev = null;
    for (const s of sweep) {
      const cur = P.readouts(s);
      if (prev) for (const k of keys) {
        const x = prev[k], y = cur[k];
        if (x == null || y == null || x === 0 || y === 0) continue; // appears or vanishes: physical threshold
        const ratio = Math.max(x / y, y / x);
        assert.ok(ratio <= 2, `${k} jumps ${ratio.toFixed(2)}x at ${JSON.stringify(s)}`);
        checked++;
      }
      prev = cur;
    }
  }
  assert.ok(checked > 100000);
});

test("formatting keeps three significant figures and switches units cleanly", () => {
  assert.equal(F.fmtLen(29533), "29.5 km");
  assert.equal(F.fmtLen(500), "500 m");
  assert.match(F.fmtLen(2e13), /AU$/);
  assert.equal(F.fmtMass(4.3e6), "4.3 million Msun");
  assert.equal(F.fmtMass(6.5e9), "6.5 billion Msun");
  assert.equal(F.fmtTime(0.00455), "4.55 ms");
  assert.equal(F.fmtPct(0.0572), "5.72%");
  assert.match(F.fmtNum(2.1e7), /2\.1 \u00d7 10\u2077/);
  assert.equal(F.fmtAngle(Math.PI / 2), "90\u00b0");
});

test("physics is DOM-free and the module has no em-dashes", () => {
  const phys = readFileSync(new URL("../public/black-hole/bh-physics.js", import.meta.url), "utf8");
  assert.doesNotMatch(phys, /\b(document|window|navigator|localStorage)\b/);
  assert.match(phys, /from "\.\.\/relativity-physics\.js"/);
  const dir = new URL("../public/black-hole/", import.meta.url);
  const files = readdirSync(dir).filter((f) => /\.(js|css)$/.test(f)).map((f) => new URL(f, dir));
  files.push(new URL("../public/study-black-hole.html", import.meta.url), new URL("../docs/black-hole-science.md", import.meta.url));
  for (const f of files) assert.doesNotMatch(readFileSync(f, "utf8"), /\u2014/, String(f));
});

test("page wiring: guest page, shared Back pattern, gallery card", () => {
  const html = readFileSync(new URL("../public/study-black-hole.html", import.meta.url), "utf8");
  const ui = readFileSync(new URL("../public/black-hole/bh-ui.js", import.meta.url), "utf8");
  const study = readFileSync(new URL("../public/study.html", import.meta.url), "utf8");
  assert.match(html, /data-study-back/);
  assert.match(ui, /"study\.html" \+ location\.search/);
  assert.doesNotMatch(html + ui, /firebase|getAuth|signIn/);
  assert.match(study, /file: "study-black-hole\.html"/);
  assert.match(ui, /prefers-reduced-motion/);
});
