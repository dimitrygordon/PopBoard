import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import * as P from "../public/gas-thermo/gas-physics.js";

const close = (a, b, rel = 1e-9) => Math.abs(a - b) <= rel * Math.abs(b);
const pub = new URL("../public/", import.meta.url);
const read = (n) => readFileSync(new URL(n, pub), "utf8");
const { GASES, L } = P;
const steps = (name) => Array.from({ length: P.STEPS + 1 }, (_, i) => P.fromSlider(name, i));
// no shown value may change by 2x or more between adjacent slider steps
function noJumps(values, what) {
  for (let i = 1; i < values.length; i++) {
    const a = Math.abs(values[i - 1]), b = Math.abs(values[i]);
    if (a === 0 && b === 0) continue;
    assert.ok(a > 0 && b > 0 && b / a < 2 && a / b < 2, `${what} step ${i}: ${values[i - 1]} -> ${values[i]}`);
  }
}

test("constants: SI 2019 exact kB and NA, R = kB NA, standard atmosphere", () => {
  assert.equal(P.KB, 1.380649e-23);
  assert.equal(P.NA, 6.02214076e23);
  assert.ok(close(P.R, 8.314462618, 1e-9));
  assert.equal(P.P_ATM, 101325);
  assert.equal(P.T_ICE, 273.15);
  assert.ok(close(P.moleculeMass(GASES.he), 6.6464731e-27, 1e-6), "helium atom mass");
});

test("heat capacities: Cv = (f/2)R, Cp = Cv + R, gamma 5/3 and 7/5", () => {
  assert.ok(close(P.cv(GASES.he), 1.5 * P.R));
  assert.ok(close(P.cp(GASES.n2), 3.5 * P.R));
  for (const id of ["he", "ne", "ar"]) assert.ok(close(P.gamma(GASES[id]), 5 / 3));
  for (const id of ["n2", "o2"]) assert.ok(close(P.gamma(GASES[id]), 7 / 5));
});

test("ideal gas law: PV = nRT and its rearrangements", () => {
  const n = 0.08, T = 300, V = 2 * L, Pr = P.pressure(n, T, V);
  assert.ok(close(Pr, 99773.55, 1e-6));
  assert.ok(close(P.volume(n, T, Pr), V));
  assert.ok(close(P.temperature(Pr, V, n), T));
  assert.ok(close(P.moles(Pr, V, T), n));
  // one mole at 0 C and 1 atm takes 22.414 L
  assert.ok(close(P.volume(1, 273.15, P.P_ATM) / L, 22.414, 1e-4));
});

test("gas laws: Boyle PV const, Charles V/T const, Gay-Lussac P/T const, Avogadro V/n const", () => {
  for (const x of steps("V")) { const s = P.lawState("boyle", x); assert.ok(close(s.P * s.V, P.pressure(0.08, 300, 1) * 1, 1e-9)); }
  for (const x of steps("T")) {
    const c = P.lawState("charles", x), g = P.lawState("gaylussac", x);
    assert.ok(close(c.V / c.T, (1 * L) / 150, 1e-9));
    assert.ok(close(g.P / g.T, P.pressure(0.08, 1, 2 * L), 1e-9));
  }
  for (const x of steps("n")) { const s = P.lawState("avogadro", x); assert.ok(close(s.V / s.n, P.volume(1, 300, P.P_BASE), 1e-9)); }
  // doubling kelvin temperature doubles V at fixed P: 150 K -> 1 L, 300 K -> 2 L
  assert.ok(close(P.lawState("charles", 150).V, 1 * L, 1e-9));
  assert.ok(close(P.lawState("charles", 300).V, 2 * L, 1e-9));
});

test("Maxwell-Boltzmann: normalized, and its mean, rms and peak match the closed forms", () => {
  for (const id of P.GAS_IDS) for (const T of [150, 300, 600]) {
    const g = GASES[id], vmax = 8 * P.vProbable(g, T), k = 6000, h = vmax / k;
    let s0 = 0, s1 = 0, s2 = 0;
    for (let i = 1; i < k; i++) { const v = i * h, f = P.mbPdf(g, T, v); s0 += f * h; s1 += f * v * h; s2 += f * v * v * h; }
    assert.ok(close(s0, 1, 1e-6), "area");
    assert.ok(close(s1, P.vMean(g, T), 1e-6), "mean");
    assert.ok(close(Math.sqrt(s2), P.vRms(g, T), 1e-6), "rms");
    const vp = P.vProbable(g, T);
    assert.ok(P.mbPdf(g, T, vp) > P.mbPdf(g, T, vp * 1.01) && P.mbPdf(g, T, vp) > P.mbPdf(g, T, vp * 0.99), "peak");
    assert.ok(vp < P.vMean(g, T) && P.vMean(g, T) < P.vRms(g, T));
  }
  // textbook values: N2 at 300 K v_rms about 517 m/s; He at 300 K about 1368 m/s
  assert.ok(Math.abs(P.vRms(GASES.n2, 300) - 517) < 1);
  assert.ok(Math.abs(P.vRms(GASES.he, 300) - 1368) < 1);
  // fraction above v: 1 at v = 0, matches numeric integration
  const g = GASES.n2; assert.ok(close(P.mbFractionAbove(g, 300, 0), 1, 1e-6));
  let tail = 0; for (let v = 1000; v < 5000; v += 0.5) tail += P.mbPdf(g, 300, v + 0.25) * 0.5;
  assert.ok(Math.abs(P.mbFractionAbove(g, 300, 1000) - tail) < 1e-5);
  assert.ok(Math.abs(P.erf(1) - 0.8427007929) < 2e-7);
});

test("average kinetic energy is (3/2)kT for every gas, so it doubles when T doubles", () => {
  for (const id of P.GAS_IDS) {
    const g = GASES[id], m = P.moleculeMass(g);
    assert.ok(close(0.5 * m * P.vRms(g, 300) ** 2, P.meanKE(300), 1e-12));
  }
  assert.ok(close(P.meanKE(600) / P.meanKE(300), 2));
  assert.ok(close(P.meanKE(300), 6.2129e-21, 1e-4));
  assert.ok(close(P.vRms(GASES.he, 300) / P.vRms(GASES.ar, 300), Math.sqrt(39.948 / 4.002602)));
});

test("sampled velocities follow Maxwell-Boltzmann and kinetic pressure equals nRT/V", () => {
  const rand = P.rng(7), g = GASES.ar, T = 400, N = 40000;
  const parts = []; for (let i = 0; i < N; i++) parts.push(P.sampleVelocity(g, T, rand));
  const ms = P.meanSquare(parts);
  assert.ok(Math.abs(ms / P.vRms(g, T) ** 2 - 1) < 0.02, "mean square speed");
  const n = 0.1, V = 2 * L;
  assert.ok(Math.abs(P.kineticPressure(n * P.NA, P.moleculeMass(g), P.vRms(g, T) ** 2, V) / P.pressure(n, T, V) - 1) < 1e-12);
  // rescaling to a new temperature keeps the ratio exact
  const copy = parts.slice(0, 100).map((p) => ({ ...p })), before = P.meanSquare(copy);
  P.rescale(copy, T, 2 * T);
  assert.ok(close(P.meanSquare(copy) / before, 2, 1e-12));
  // repeatable seed
  assert.equal(P.rng(3)(), P.rng(3)());
});

test("particle box: elastic walls keep speeds, keep dots inside, and report hits", () => {
  const rand = P.rng(11), box = { x0: 340, x1: 684, y0: 600, y1: 880 };
  const parts = P.makeParticles(GASES.he, 300, 50, box, rand, 6);
  const sp = parts.map(P.speedOf);
  let hits = 0;
  for (let i = 0; i < 300; i++) hits += P.stepParticles(parts, box, 1 / 60, 6).events.length;
  parts.forEach((p, i) => {
    assert.ok(close(P.speedOf(p), sp[i], 1e-12));
    assert.ok(p.x >= box.x0 + 6 && p.x <= box.x1 - 6 && p.y >= box.y0 + 6 && p.y <= box.y1 - 6);
  });
  assert.ok(hits > 50);
  assert.equal(P.dotCount(0.08), 40);
});

test("first law: dU = Q - W for every process, with the expected splits", () => {
  for (const id of P.GAS_IDS) for (const Q of [-150, -5, 5, 60, 150]) {
    const g = GASES[id];
    for (const r of [P.isochoricHeat(g, 0.08, 300, 2 * L, Q), P.isobaricHeat(g, 0.08, 300, 2 * L, Q), P.isothermalHeat(g, 0.08, 300, 2 * L, Q)]) {
      assert.ok(Math.abs(r.dU - (r.Q - r.W)) < 1e-9 * 150, id);
      assert.ok(Math.abs(r.dU - P.cv(g) * 0.08 * (r.T2 - 300)) < 1e-9 * 150);
    }
    const iv = P.isochoricHeat(g, 0.08, 300, 2 * L, Q), ip = P.isobaricHeat(g, 0.08, 300, 2 * L, Q);
    assert.equal(iv.W, 0);
    assert.ok(close(ip.W / ip.Q, P.R / P.cp(g), 1e-9), "isobaric: W/Q = R/Cp");
    assert.ok(Math.abs(ip.T2 - 300) < Math.abs(iv.T2 - 300), "less temperature change at fixed P");
  }
});

test("adiabatic: PV^gamma and TV^(gamma-1) constant, W = -dU; isothermal W = nRT ln(V2/V1)", () => {
  for (const id of P.GAS_IDS) for (const r of [0.5, 0.8, 1.25, 2]) {
    const g = GASES[id], V2 = 2 * L * r, a = P.adiabaticTo(g, 0.08, 300, 2 * L, V2), gm = P.gamma(g);
    assert.ok(close(a.P1 * (2 * L) ** gm, a.P2 * V2 ** gm, 1e-9));
    assert.ok(close(300 * (2 * L) ** (gm - 1), a.T2 * V2 ** (gm - 1), 1e-9));
    assert.ok(close(a.W, -a.dU, 1e-9));
    assert.equal(a.Q, 0);
    const it = P.isothermalTo(g, 0.08, 300, 2 * L, V2);
    assert.ok(close(it.W, 0.08 * P.R * 300 * Math.log(r), 1e-9));
    // the work is the area under the curve (numeric trapezoid)
    for (const [curve, W] of [[P.isothermCurve(0.08, 300, 2 * L, V2, 4000), it.W], [P.adiabatCurve(g, 0.08, 300, 2 * L, 2 * L, V2, 4000), a.W]]) {
      let area = 0; for (let i = 1; i < curve.length; i++) area += (curve[i].V - curve[i - 1].V) * (curve[i].P + curve[i - 1].P) / 2;
      assert.ok(close(area, W, 1e-5));
    }
    // compressing: the adiabat ends at higher P and T than the isotherm
    if (r < 1) { assert.ok(a.P2 > it.P2 && a.T2 > 300); } else { assert.ok(a.P2 < it.P2 && a.T2 < 300); }
  }
});

test("Carnot cycle: efficiency equals 1 - Tc/Th, W equals the enclosed area, states close the loop", () => {
  const g = GASES.he;
  for (const Th of steps("Th").filter((_, i) => i % 20 === 0)) for (const Tc of steps("Tc").filter((_, i) => i % 20 === 0)) {
    const c = P.carnotCycle(g, 0.08, Th, Tc, 1 * L, 1.5 * L);
    assert.ok(close(c.eff, 1 - Tc / Th, 1e-9));
    assert.ok(Math.abs(P.carnotState(g, 0.08, c, 4 - 1e-9).V - c.A.V) < 1e-9);
    const legs = [P.isothermCurve(0.08, Th, c.A.V, c.B.V, 3000), P.adiabatCurve(g, 0.08, Th, c.B.V, c.B.V, c.C.V, 3000),
      P.isothermCurve(0.08, Tc, c.C.V, c.D.V, 3000), P.adiabatCurve(g, 0.08, Tc, c.D.V, c.D.V, c.A.V, 3000)];
    let area = 0;
    for (const pts of legs) for (let i = 1; i < pts.length; i++) area += (pts[i].V - pts[i - 1].V) * (pts[i].P + pts[i - 1].P) / 2;
    assert.ok(close(area, c.W, 1e-4));
    // fits the cylinder and the 400 kPa gauge
    assert.ok(c.C.V <= P.V_MAX && c.A.P <= 400e3);
    for (let u = 0; u < 4; u += 0.05) {
      const s = P.carnotState(g, 0.08, c, u);
      assert.ok(s.T >= Tc - 1e-9 && s.T <= Th + 1e-9);
    }
  }
});

test("sandbox: heat flows toward the source, the piston floats or rests on a stop", () => {
  const g = GASES.n2;
  let s = P.settle({ n: 0.08, T: 300, V: 2 * L, locked: false, weights: [], Pext: P.P_ATM });
  assert.ok(close(s.P, P.P_ATM, 1e-9), "free piston balances the atmosphere");
  for (let i = 0; i < 4000; i++) s = P.sandboxStep(g, s, "ice", 0.05);
  assert.ok(Math.abs(s.T - P.T_ICE) < 0.5);
  for (let i = 0; i < 4000; i++) s = P.sandboxStep(g, s, "burner", 0.05);
  assert.ok(s.T <= P.T_MAX && s.T > 590);
  const t0 = s.T; s = P.sandboxStep(g, s, "none", 10); assert.equal(s.T, t0, "insulated");
  const big = P.settle({ n: 0.16, T: 600, V: 2 * L, locked: false, Pext: P.P_ATM });
  assert.equal(big.V, P.V_MAX); assert.ok(big.P > P.P_ATM);
  const locked = P.settle({ n: 0.08, T: 600, V: 2 * L, locked: true, Pext: P.P_ATM });
  assert.ok(close(locked.P, P.pressure(0.08, 600, 2 * L)));
  assert.ok(close(P.weightPressure([P.WEIGHTS.small]), 10003, 1e-3));
  // the 800 kPa gauge covers the locked sandbox
  assert.ok(P.pressure(P.SLIDERS.n.max, P.T_MAX, P.SLIDERS.V.min) <= 800e3);
});

test("sliders: log, round-trip, and no shown value jumps 2x between adjacent steps", () => {
  for (const name of Object.keys(P.SLIDERS)) {
    const s = P.SLIDERS[name];
    assert.ok(close(P.fromSlider(name, 0), s.min) && close(P.fromSlider(name, P.STEPS), s.max), name);
    for (let i = 0; i < P.STEPS; i++) {
      const a = P.fromSlider(name, i), b = P.fromSlider(name, i + 1);
      assert.ok(b / a < 1.05, `${name} step ${i}`);
      assert.equal(P.toSlider(name, a), i);
    }
  }
  const g = GASES, n = 0.08;
  // molecules mode: P across each slider with the others at their ends
  for (const [Tk, V, nn] of [[150, 1 * L, 0.02], [600, 4 * L, 0.16]]) {
    noJumps(steps("T").map((x) => P.pressure(nn, x, V)), "kinetic P(T)");
    noJumps(steps("V").map((x) => P.pressure(nn, Tk, x)), "kinetic P(V)");
    noJumps(steps("n").map((x) => P.pressure(x, Tk, V)), "kinetic P(n)");
    noJumps(steps("n").map(P.dotCount), "dot count");
  }
  for (const law of P.LAW_IDS) {
    const k = { boyle: "V", charles: "T", gaylussac: "T", avogadro: "n" }[law];
    const st = steps(k).map((x) => P.lawState(law, x));
    for (const q of ["P", "V", "T", "n"]) noJumps(st.map((s) => s[q]), `${law} ${q}`);
  }
  for (const id of P.GAS_IDS) {
    noJumps(steps("T").map((x) => P.vRms(g[id], x)), "vrms");
    noJumps(steps("T").map((x) => P.meanKE(x)), "KE");
    noJumps(steps("T").map((x) => P.internalEnergy(g[id], 0.16, x)), "U");
    noJumps(steps("T").map((x) => P.mbFractionAbove(g[id], x, 1000)), "fraction above 1000 m/s");
    for (const sign of [1, -1]) for (const f of [P.isochoricHeat, P.isobaricHeat, P.isothermalHeat]) {
      const rs = steps("Q").map((Q) => f(g[id], n, 300, 2 * L, sign * Q));
      for (const q of ["Q", "W", "dU", "P2", "V2", "T2"]) if (rs[0][q] !== 0) noJumps(rs.map((r) => r[q]), `${f.name} ${q}`);
      noJumps(rs.map((r) => r.T2 - 300), `${f.name} dT`);
      for (const r of rs) {
        assert.ok(r.T2 >= P.T_MIN && r.T2 <= P.T_MAX && r.V2 >= P.V_MIN && r.V2 <= P.V_MAX && r.P2 <= 400e3, `${f.name} fits`);
      }
    }
    for (const dir of [1, -1]) for (const f of [P.isothermalTo, P.adiabaticTo]) {
      const rs = steps("ratio").map((x) => f(g[id], n, 300, 2 * L, 2 * L * x ** dir));
      for (const q of ["W", "P2", "V2", "T2"]) noJumps(rs.map((r) => r[q]), `${f.name} ${q}`);
      if (f === P.adiabaticTo) noJumps(rs.map((r) => r.T2 - 300), "adiabatic dT");
      for (const r of rs) assert.ok(r.P2 <= 400e3 && r.V2 <= P.V_MAX && r.T2 >= P.T_MIN && r.T2 <= P.T_MAX);
    }
  }
  for (const Tc of [300, 400]) {
    const cs = steps("Th").map((Th) => P.carnotCycle(g.he, n, Th, Tc, 1 * L, 1.5 * L));
    for (const q of ["Qh", "Qc", "W", "eff"]) noJumps(cs.map((c) => c[q]), `carnot ${q}`);
  }
  for (const Th of [450, 600]) {
    const cs = steps("Tc").map((Tc) => P.carnotCycle(g.he, n, Th, Tc, 1 * L, 1.5 * L));
    for (const q of ["Qh", "Qc", "W", "eff"]) noJumps(cs.map((c) => c[q]), `carnot ${q}`);
  }
});

test("deep links parse modes, laws and gases with aliases and fallbacks", () => {
  assert.deepEqual(P.parseQuery("?mode=sandbox"), { mode: "sandbox", law: null, gas: null });
  assert.equal(P.parseQuery("?mode=free").mode, "sandbox");
  assert.equal(P.parseQuery("?mode=maxwell-boltzmann").mode, "speeds");
  assert.equal(P.parseQuery("?mode=carnot").mode, "engine");
  assert.equal(P.parseQuery("?mode=adiabatic").mode, "pv");
  assert.equal(P.parseQuery("?mode=first-law").mode, "firstlaw");
  assert.deepEqual(P.parseQuery("?mode=charles"), { mode: "laws", law: "charles", gas: null });
  assert.equal(P.parseQuery("?mode=laws&law=gay-lussac").law, "gaylussac");
  assert.equal(P.parseQuery("?mode=bogus").mode, "kinetic");
  assert.equal(P.parseQuery("").mode, "kinetic");
  assert.equal(P.parseQuery("?gas=He").gas, "he");
  assert.equal(P.parseQuery("?gas=xenon").gas, null);
  for (const m of P.MODES) assert.equal(P.parseQuery("?mode=" + m).mode, m);
});

test("formatting", () => {
  assert.equal(P.kPa(99773.55), "99.8 kPa");
  assert.equal(P.litres(2 * L), "2 L");
  assert.equal(P.celsius(300), "27 \u00b0C");
  assert.equal(P.celsius(150), "\u2212123 \u00b0C");
  assert.equal(P.fmtSigned(-12.345, "J"), "\u221212.3 J");
  assert.equal(P.sci(6.2129e-21), "6.21 \u00d7 10\u207b\u00b2\u00b9");
});

test("art anchors match MANIFEST and the scale maps fit the art", () => {
  assert.deepEqual({ ...P.ART.bore }, { x0: 340, x1: 684, top: 110, floor: 880, wall: 22 });
  assert.equal(P.ART.piston.top, 420); assert.equal(P.ART.piston.height, 62);
  assert.equal(P.ART.thermo.boreX0, 504); assert.equal(P.ART.thermo.boreX1, 513);
  assert.equal(P.ART.thermo.boreTop, 263); assert.equal(P.ART.thermo.boreBottom, 842);
  assert.deepEqual(P.ART.particleR, { "particle-xs": 34, "particle-s": 52, "particle-m": 74, "particle-l": 100 });
  assert.equal(P.thermoY(P.T_MIN), 842);
  assert.ok(P.thermoY(P.T_MAX) > 263 && P.thermoY(P.T_MAX) < 300);
  assert.ok(P.pistonTopFor(P.V_MAX) >= P.ART.bore.top, "piston stays in the bore at the top stop");
  assert.ok(P.pistonTopFor(P.V_MIN) + 62 < P.ART.bore.floor);
  assert.ok(close(P.gaugeAngle(0, 1), 0.75 * Math.PI) && close(P.gaugeAngle(1, 1), 2.25 * Math.PI) && close(P.gaugeAngle(5, 1), 2.25 * Math.PI));
});

test("page, gallery card, theme and module files follow the study pattern", () => {
  const html = read("study-gas-thermo.html");
  assert.match(html, /data-study-back/);
  assert.match(html, /gas-thermo\/gas-ui\.js/);
  assert.doesNotMatch(html, /firebase|getAuth|signIn/);
  assert.match(html, /prefers-color-scheme: dark/);
  assert.match(html, /popboard\.gasthermo\.theme/);
  assert.match(html, /id="themeBtn"/);
  for (const m of P.MODES) assert.match(html, new RegExp(`data-show="${m}"`), m);
  const ui = read("gas-thermo/gas-ui.js");
  assert.match(ui, /forwardStudyQuery/);
  assert.match(ui, /study\.html"\s*\+\s*location\.search/);
  assert.match(ui, /prefers-reduced-motion/);
  assert.match(ui, /prefers-color-scheme: dark/);
  assert.match(ui, /localStorage\.setItem\(THEME_KEY/);
  const phys = read("gas-thermo/gas-physics.js");
  assert.doesNotMatch(phys, /\bdocument\.|\bwindow\.|getContext|localStorage|\bimport\b/);
  const gallery = read("study.html");
  assert.match(gallery, /id: "gas-thermo"/);
  assert.match(gallery, /file: "study-gas-thermo\.html"/);
  const css = read("gas-thermo/gas-theme.css");
  assert.match(css, /--gt-hit: 44px/);
  assert.match(css, /:root\[data-theme="dark"\]/);
  assert.match(css, /prefers-reduced-motion/);
  const files = ["study-gas-thermo.html", ...readdirSync(new URL("gas-thermo/", pub)).filter((n) => /\.(js|css)$/.test(n)).map((n) => "gas-thermo/" + n)];
  for (const f of files) assert.doesNotMatch(read(f), /\u2014/, f);
  assert.doesNotMatch(readFileSync(new URL("../docs/gas-thermo-science.md", import.meta.url), "utf8"), /\u2014/);
  assert.doesNotMatch(readFileSync(new URL("./gas-thermo-physics.test.mjs", import.meta.url), "utf8"), /\u2014/);
  const shipped = readdirSync(new URL("gas-thermo/assets/", pub));
  for (const n of shipped) assert.match(n, /\.webp$/);
  const render = read("gas-thermo/gas-render.js");
  const used = render.match(/IMAGES = \[([^\]]+)\]/)[1].match(/"([a-z-]+)"/g).map((n) => n.slice(1, -1));
  assert.ok(used.length >= 16);
  for (const n of used) assert.ok(shipped.includes(n + ".webp"), n);
  for (const n of shipped) assert.ok(used.includes(n.replace(/\.webp$/, "")), "unused asset " + n);
});

test("theme tokens keep text and lines readable in both themes (WCAG AA 4.5:1)", () => {
  const css = read("gas-thermo/gas-theme.css");
  const block = (sel) => css.slice(css.indexOf(sel), css.indexOf("}", css.indexOf(sel)));
  const light = block(":root {"), dark = block(':root[data-theme="dark"]');
  const tok = (b, name) => (b.match(new RegExp(`--gt-${name}:\\s*(#[0-9a-f]{6})`)) || light.match(new RegExp(`--gt-${name}:\\s*(#[0-9a-f]{6})`)))[1];
  const lum = (hex) => {
    const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  for (const b of [light, dark]) {
    for (const fg of ["ink", "ink-dim", "hot", "cold", "iso", "adia", "work", "accent"]) assert.ok(ratio(tok(b, fg), tok(b, "paper")) >= 4.5, fg);
    assert.ok(ratio(tok(b, "ink"), tok(b, "chip")) >= 4.5, "chip text");
    assert.ok(ratio(tok(b, "paper"), tok(b, "ink")) >= 4.5, "pressed chip text");
  }
  assert.ok(ratio(tok(light, "text"), tok(light, "chrome")) >= 4.5, "header text");
  assert.ok(ratio(tok(light, "text"), tok(light, "btn")) >= 4.5, "toolbar text");
  assert.ok(ratio("#1c1c1c", tok(light, "gold")) >= 4.5, "pressed toolbar");
  assert.ok(ratio("#1c1c1c", "#ffffff") >= 4.5, "gauge face numbers");
});
