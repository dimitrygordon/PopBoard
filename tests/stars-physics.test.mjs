import test from "node:test";
import assert from "node:assert/strict";
import * as S from "../public/stars/stars-physics.js";

const near = (a, b, tol) => Math.abs(a - b) <= tol * Math.abs(b);
const MASSES = [0.08, 0.1, 0.2, 0.35, 0.5, 0.8, 1, 1.3, 2, 3, 5, 8, 12, 15, 20, 25, 40, 60, 100];

test("the Sun calibrates to the textbook values", () => {
  const sun = S.mainSequence(1);
  assert.ok(near(sun.Tc, 15.7e6, 0.01), `Tc ${sun.Tc}`);
  assert.ok(near(sun.Pc, 2.5e16, 0.01), `Pc ${sun.Pc}`);
  assert.ok(near(sun.L, 1, 0.01), `L ${sun.L}`);
  assert.ok(near(sun.R, 1, 1e-9));
  assert.ok(near(sun.teff, 5772, 0.01), `Teff ${sun.teff}`);
  assert.ok(near(sun.lifetime, 10, 0.01), `lifetime ${sun.lifetime}`);
  assert.equal(sun.spectral, "G");
  assert.ok(sun.cno > 0.005 && sun.cno < 0.03, `solar CNO share ${sun.cno}`);
  assert.equal(sun.transport.kind, "radiative-core");
});

test("uncalibrated homology pressure lands within a factor of 30 of the solar value", () => {
  const raw = S.rawPressureScale(1);
  assert.ok(raw > 2.5e16 / 30 && raw < 2.5e16 * 30, `raw ${raw}`);
});

test("luminosity, core temperature and temperature rise with mass; lifetime falls", () => {
  let prev = null;
  for (const m of MASSES) {
    const s = S.mainSequence(m);
    if (prev) {
      assert.ok(s.L > prev.L, `L at ${m}`);
      assert.ok(s.Tc > prev.Tc, `Tc at ${m}`);
      if (m <= 60) assert.ok(s.teff > prev.teff, `Teff at ${m}`);
      assert.ok(s.R > prev.R, `R at ${m}`);
      assert.ok(s.lifetime < prev.lifetime || (prev.lifetime === S.VERY_LONG_GYR && s.lifetime <= prev.lifetime), `lifetime at ${m}`);
      assert.ok(s.cno >= prev.cno, `CNO share at ${m}`);
    }
    prev = s;
  }
});

test("lifetime follows the piecewise power laws", () => {
  for (const m of [0.5, 0.8]) assert.ok(near(S.mainSequence(m).lifetime, 10 * Math.pow(m, -2.5), 0.02), `m=${m}`);
  for (const m of [1.5, 3]) assert.ok(near(S.mainSequence(m).lifetime, 10 * Math.pow(m, -2.86), 0.02), `m=${m}`);
  for (const m of [8, 15, 30]) assert.ok(near(S.mainSequence(m).lifetime, 0.1 * Math.pow(m / 5, -1.5), 0.02), `m=${m}`);
  assert.ok(near(S.mainSequence(5).lifetime, 0.1, 0.02));
  assert.ok(near(S.mainSequence(40).lifetime, 0.0044, 0.02));
  assert.ok(near(S.mainSequence(100).lifetime, 0.0044 * Math.pow(2.5, -0.45), 0.02));
  for (const m of [0.999, 4.999, 39.99]) assert.ok(near(S.baseLifetime(m), S.baseLifetime(m + 0.002), 0.01), `continuous at ${m}`);
  assert.equal(S.lifetimeLabel(S.mainSequence(0.2)), "about 1 trillion years or more");
  assert.ok(S.mainSequence(0.2).lifetime >= 1000);
  assert.equal(S.lifetimeLabel(S.mainSequence(1)), "10 Gyr");
});

test("O stars land near the Mamajek table; low-mass radius and pressure match the corrections", () => {
  for (const m of [38, 43]) { const lg = Math.log10(S.mainSequence(m).L); assert.ok(lg > 5.42 && lg < 5.56, `log L ${lg} at ${m}`); }
  assert.ok(Math.abs(S.mainSequence(43).teff - 41400) < 1000, `Teff ${S.mainSequence(43).teff}`);
  assert.ok(near(S.mainSequence(0.2).R, 0.23, 0.02));
  assert.ok(near(S.mainSequence(0.2).Pc, 1.2e16, 0.05), `Pc ${S.mainSequence(0.2).Pc}`);
  for (const m of [0.35, 1, 2]) assert.ok(near(S.baseRadius(m - 1e-6), S.baseRadius(m), 0.01), `R continuous at ${m}`);
  assert.ok(near(S.baseRadius(5), 1.41 * Math.pow(5, 0.56), 1e-9));
});

test("lower metallicity makes a star brighter and shorter-lived; more helium does too", () => {
  for (const m of [0.5, 1, 5, 20]) {
    const lo = S.mainSequence(m, 0.001), hi = S.mainSequence(m, 0.03), sun = S.mainSequence(m);
    assert.ok(lo.L > sun.L && sun.L > hi.L, `L vs Z at ${m}`);
    assert.ok(lo.lifetime < sun.lifetime && sun.lifetime < hi.lifetime, `lifetime vs Z at ${m}`);
    const he = S.mainSequence(m, S.Z_SUN, 0.35);
    assert.ok(he.L > sun.L && he.lifetime < sun.lifetime, `helium at ${m}`);
  }
});

test("CNO cycle takes over above about 1.3 solar masses and 17 MK", () => {
  assert.ok(near(S.cnoFraction(17e6), 0.5, 0.02));
  assert.ok(S.mainSequence(1).cno < 0.1);
  assert.ok(S.mainSequence(1.1).cno < 0.5);
  assert.ok(S.mainSequence(1.5).cno > 0.5);
  assert.ok(S.mainSequence(5).cno > 0.99);
  assert.ok(Math.abs(S.mainSequence(1.3).Tc - 17e6) < 0.5e6);
});

test("convection zones by mass", () => {
  assert.equal(S.mainSequence(0.1).transport.kind, "fully-convective");
  assert.equal(S.mainSequence(0.2).transport.kind, "fully-convective");
  assert.equal(S.mainSequence(0.34).transport.kind, "fully-convective");
  assert.equal(S.mainSequence(0.4).transport.cutaway, "sun-like");
  assert.equal(S.mainSequence(1).transport.envelope, "convective");
  assert.equal(S.mainSequence(1).transport.core, "radiative");
  assert.equal(S.mainSequence(1.5).transport.kind, "convective-core");
  assert.equal(S.mainSequence(15).transport.envelope, "radiative");
  assert.ok(S.CONVECTIVE_CORE_MIN >= 1.2 && S.CONVECTIVE_CORE_MIN <= 1.5);
});

test("fate thresholds", () => {
  assert.equal(S.fate(0.2).remnant, "white-dwarf");
  assert.equal(S.fate(0.2).nebula, false);
  assert.equal(S.fate(1).remnant, "white-dwarf");
  assert.equal(S.fate(1).nebula, true);
  assert.equal(S.fate(7.9).remnant, "white-dwarf");
  assert.equal(S.fate(8).remnant, "neutron-star");
  assert.equal(S.fate(8).supernova, true);
  assert.equal(S.fate(15).remnant, "neutron-star");
  assert.equal(S.fate(19.9).remnant, "neutron-star");
  assert.equal(S.fate(20).remnant, "black-hole");
  assert.equal(S.fate(40).supernova, true);
  assert.equal(S.fate(40, 0.0005).direct, true);
  assert.equal(S.fate(40, 0.0005).supernova, false);
  assert.equal(S.fate(30, 0.0005).direct, false);
  assert.equal(S.fate(30, 0.0005).fallback, true);
  assert.equal(S.fate(22, 0.0005).supernova, true);
  assert.equal(S.fate(0.8).hypothetical, true);
  assert.equal(S.fate(1).hypothetical, false);
  assert.equal(S.fate(6.5).wdKind, "carbon-oxygen");
  assert.equal(S.fate(7.5).wdKind, "oxygen-neon");
  assert.equal(S.CHANDRASEKHAR, 1.44);
});

test("white dwarfs stay below the Chandrasekhar mass", () => {
  for (const m of MASSES.filter((x) => x < 8)) assert.ok(S.whiteDwarfMass(m) < S.CHANDRASEKHAR);
  assert.ok(near(S.whiteDwarfMass(1), 0.503, 0.01));
});

test("life stages: order, start times and the scrubber", () => {
  const ids = (m, z) => S.lifeStages(m, z).map((s) => s.id).join(",");
  assert.equal(ids(0.2), "main-sequence,white-dwarf");
  assert.equal(ids(1), "main-sequence,red-giant,helium-burning,agb,planetary-nebula,white-dwarf");
  assert.equal(ids(15), "main-sequence,red-supergiant,supernova,neutron-star");
  assert.equal(ids(40), "main-sequence,red-supergiant,supernova,black-hole");
  assert.equal(ids(40, 0.0005), "main-sequence,red-supergiant,black-hole");
  assert.equal(ids(30, 0.0005), "main-sequence,red-supergiant,supernova,black-hole");
  assert.ok(near(S.lifeStages(1)[2].dur, 0.11, 1e-9));
  assert.ok(near(S.lifeStages(15)[1].dur, 0.15 * S.mainSequence(15).lifetime, 1e-9));
  const wd0 = S.stageState(1, S.Z_SUN, null, "white-dwarf", 0), wd1 = S.stageState(1, S.Z_SUN, null, "white-dwarf", 1);
  assert.equal(wd0.teff, 100000); assert.ok(wd1.teff < wd0.teff && wd1.L < wd0.L);
  const st = S.lifeStages(1);
  assert.equal(S.stageAt(st, 0).stage.id, "main-sequence");
  assert.equal(S.stageAt(st, 1).stage.id, "white-dwarf");
  assert.ok(near(S.stageAt(st, 0.25).age, st[0].dur / 2, 1e-9));
  let lastAge = -1;
  for (let u = 0; u <= 1; u += 0.01) { const a = S.stageAt(st, u).age; assert.ok(a >= lastAge); lastAge = a; }
  for (let i = 0; i < st.length; i++) assert.equal(S.stageAt(st, S.stageStartU(st, i) + 1e-6).index, i);
});

test("helium burning runs at about 100 MK, hotter than any main-sequence core", () => {
  const he = S.stageState(1, S.Z_SUN, null, "helium-burning");
  assert.equal(he.fusion, "helium");
  assert.ok(he.Tc >= 1e8);
  assert.ok(S.mainSequence(100).Tc < he.Tc);
  assert.equal(S.stageState(1, S.Z_SUN, null, "red-giant").where, "shell");
});

test("a squeezed star pushes back: pressure beats gravity when compressed", () => {
  const sq = S.perturbedForces(-0.1), puff = S.perturbedForces(0.1), eq = S.perturbedForces(0);
  assert.ok(sq.pressure > sq.gravity);
  assert.ok(puff.pressure < puff.gravity);
  assert.equal(eq.pressure, eq.gravity);
  assert.ok(Math.abs(S.perturbationRadius(20)) < Math.abs(S.perturbationRadius(0)) / 100);
  const td = S.dynamicalTimeMinutes(1, 1);
  assert.ok(td > 24 && td < 30, `solar dynamical time ${td} min`);
});

test("tint runs red to blue with temperature", () => {
  const red = S.tintForTemperature(3000), gold = S.tintForTemperature(5772), blue = S.tintForTemperature(30000);
  assert.ok(red[0] > red[2] && gold[0] > gold[2] && blue[2] > blue[0]);
  assert.deepEqual(gold, [237, 188, 88]);
});

test("deep links and sliders", () => {
  assert.equal(S.modeFromSearch("?mode=fusion"), "fusion");
  assert.equal(S.modeFromSearch("?mode=supernova"), "fate");
  assert.equal(S.modeFromSearch("?mode=nope"), "build");
  assert.equal(S.modeFromSearch(""), "build");
  const p = S.paramsFromSearch("?mass=500&z=0.5");
  assert.equal(p.mass, 100); assert.equal(p.z, S.Z_MAX);
  assert.equal(S.paramsFromSearch("").mass, 1);
  for (const m of [0.08, 1, 40, 100]) assert.ok(near(S.sliderToMass(S.massToSlider(m)), m, 1e-9));
  for (const z of [0.0001, 0.014]) assert.ok(near(S.sliderToZ(S.zToSlider(z)), z, 1e-9));
});

test("composition: X + Y + Z = 1 and solar mu is about 0.61", () => {
  const c = S.composition();
  assert.ok(Math.abs(c.X + c.Y + c.Z - 1) < 1e-12);
  assert.ok(c.mu > 0.6 && c.mu < 0.63, `mu ${c.mu}`);
});

test("year formatting", () => {
  assert.equal(S.formatYears(10), "10 Gyr");
  assert.equal(S.formatYears(0.179), "179 Myr");
  assert.equal(S.formatYears(559), "559 Gyr");
  assert.equal(S.formatYears(5520), "5.5 trillion yr");
  assert.equal(S.formatYears(0.0069), "6.9 Myr");
});

test("slider sweep: no jump larger than 2x between neighboring mass steps", () => {
  for (const z of [S.Z_SUN, 0.0005, 0.03]) {
    let prev = null;
    for (let i = 0; i <= 1000; i++) {
      const m = S.sliderToMass(i / 1000);
      const s = S.mainSequence(m, z);
      const v = { Pc: s.Pc, teff: s.teff, Tc: s.Tc, lifetime: s.lifetime };
      if (prev) for (const k of Object.keys(v)) {
        const r = v[k] / prev[k];
        assert.ok(r < 2 && r > 0.5, `${k} jumps ${r.toFixed(2)}x at ${m.toFixed(3)} Msun, Z=${z}`);
      }
      prev = v;
    }
  }
});

test("pressure coefficient blends smoothly from 0.3 to 0.8 Msun", () => {
  assert.equal(S.pressureCoefficient(0.2), 8.7e14);
  assert.equal(S.pressureCoefficient(0.3), 8.7e14);
  assert.equal(S.pressureCoefficient(0.8), 2.5e16);
  assert.ok(Math.abs(S.corePressure(0.2) / 1.2e16 - 1) < 0.05);
  assert.ok(Math.abs(S.corePressure(1) / 2.5e16 - 1) < 1e-9);
});
