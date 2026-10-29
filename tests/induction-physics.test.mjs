import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import * as P from "../public/induction-motors/induction-physics.js";

const close = (a, b, rel = 1e-9) => Math.abs(a - b) <= rel * Math.max(1e-12, Math.abs(b));
const pub = new URL("../public/", import.meta.url);
const read = (n) => readFileSync(new URL(n, pub), "utf8");
const doc = () => readFileSync(new URL("../docs/induction-motors-science.md", import.meta.url), "utf8");

test("flux: Phi = B A cos(theta), largest facing the field, zero edge-on", () => {
  assert.equal(P.flux(0.5, 0.02, 0), 0.01);
  assert.ok(close(P.flux(0.5, 0.02, Math.PI / 3), 0.005));
  assert.ok(Math.abs(P.flux(1, 1, Math.PI / 2)) < 1e-15);
  const r = P.readouts("flux", P.defaults());
  assert.ok(close(r.phi_mWb, 0.5 * 0.02 * Math.cos(Math.PI / 6) * 1000));
  assert.ok(close(r.phiMax_mWb, 10));
  assert.ok(close(P.MU0, 1.2566370614e-6, 1e-9));
});

test("point dipole through a loop: on-axis formula, derivative, symmetry", () => {
  const m = 1, R = 0.02;
  assert.ok(close(P.dipoleLoopFlux(m, R, 0), (P.MU0 * m) / (2 * R)));
  for (const x of [-0.05, -0.01, 0.003, 0.04]) {
    const h = 1e-7, num = (P.dipoleLoopFlux(m, R, x + h) - P.dipoleLoopFlux(m, R, x - h)) / (2 * h);
    assert.ok(close(P.dDipoleLoopFlux(m, R, x), num, 1e-5), `dPhi/dx at ${x}`);
    assert.ok(close(P.dipoleLoopFlux(m, R, x), P.dipoleLoopFlux(m, R, -x)));
  }
  // far away it falls off like 1/x^3
  assert.ok(close(P.dipoleLoopFlux(m, R, 2) / P.dipoleLoopFlux(m, R, 4), 8, 1e-3));
});

test("Faraday: emf = -dLinkage/dt, zero when still, scales with N, m and v, flips on the way out", () => {
  assert.deepEqual(P.turnPositions(5).map((x) => +x.toFixed(4)), [-0.045, -0.0225, 0, 0.0225, 0.045]);
  const m = 2, N = 10, v = 1, x = -0.06, h = 1e-6;
  const dL = (P.linkage(m, N, x + v * h) - P.linkage(m, N, x - v * h)) / (2 * h);
  assert.ok(close(P.coilEmf(m, N, x, v), -dL, 1e-5));
  assert.equal(P.coilEmf(m, N, x, 0), -0);
  assert.ok(P.coilEmf(m, N, -0.06, v) < 0 && P.coilEmf(m, N, 0.06, v) > 0, "sign flips as the magnet leaves");
  assert.ok(Math.abs(P.coilEmf(m, N, 0, v)) < 1e-12, "no emf with the magnet at the center (flux at its peak)");
  assert.ok(close(P.peakEmf(4, N, v), 2 * P.peakEmf(2, N, v)));
  assert.ok(close(P.peakEmf(2, N, 2), 2 * P.peakEmf(2, N, 1)));
  assert.ok(P.peakEmf(2, 20, 1) > P.peakEmf(2, 10, 1) && P.peakEmf(2, 10, 1) > P.peakEmf(2, 5, 1));
  assert.ok(close(P.coilEmf(-m, N, x, v), -P.coilEmf(m, N, x, v)), "flipping the magnet flips the emf");
  // defaults give a few mV, on the +/- 20 mV galvanometer
  const r = P.readouts("faraday", P.defaults());
  assert.ok(r.peak_mV > 3 && r.peak_mV < 20, String(r.peak_mV));
  const run = P.magnetRun(0.05, 1);
  assert.ok(close(run.x, -0.07) && run.vx === 1);
  assert.equal(P.magnetRun(0.3, 1).vx, -1);
});

test("Lenz: approach repels with the same pole, leaving attracts; current sense by the right-hand rule", () => {
  assert.deepEqual(P.lenz("N", "toward"), { fluxChange: "increasing", face: "N", force: "repel", sense: "counterclockwise" });
  assert.deepEqual(P.lenz("N", "away"), { fluxChange: "decreasing", face: "S", force: "attract", sense: "clockwise" });
  assert.deepEqual(P.lenz("S", "toward"), { fluxChange: "increasing", face: "S", force: "repel", sense: "clockwise" });
  assert.deepEqual(P.lenz("S", "away"), { fluxChange: "decreasing", face: "N", force: "attract", sense: "counterclockwise" });
  // the emf sign agrees: N approaching from -x (field along +x growing) drives current whose field points -x
  assert.ok(P.coilEmf(1, 10, -0.06, 1) < 0);
  // energy: F v = emf I
  const s = P.defaults(), e = P.peakEmf(s.magM, s.turns, s.speed);
  assert.ok(close(P.peakForce(s.magM, s.turns, s.speed) * s.speed, e * P.peakCurrent(e)));
});

test("generator: emf = N B A w sin(wt) is -d(N Phi)/dt", () => {
  const N = 100, B = 0.2, A = 0.01, w = P.omega(10);
  assert.ok(close(w, 20 * Math.PI));
  assert.ok(close(P.genPeak(N, B, A, w), 4 * Math.PI));
  for (const t of [0.001, 0.013, 0.07]) {
    const h = 1e-7, d = (P.genLinkage(N, B, A, w, t + h) - P.genLinkage(N, B, A, w, t - h)) / (2 * h);
    assert.ok(close(P.genEmf(N, B, A, w, t), -d, 1e-5));
  }
  assert.ok(close(P.rms(10), 10 / Math.SQRT2));
  assert.ok(close(P.genEmf(N, B, A, w, Math.PI / 2 / w), P.genPeak(N, B, A, w)), "peak a quarter turn after facing the field");
});

test("DC motor: F = NILB, tau = NIAB sin(theta), commutator keeps the torque one way", () => {
  assert.ok(close(P.sideForce(50, 1, 0.05, 0.3), 0.75));
  assert.ok(close(P.maxTorque(50, 1, 0.0025, 0.3), 0.0375));
  // tau_max = F x (lever arms of the two sides: 2 x half the width)
  assert.ok(close(P.maxTorque(50, 1, 0.0025, 0.3), P.sideForce(50, 1, 0.05, 0.3) * 0.05));
  for (let i = 1; i < 36; i++) {
    const th = (i / 36) * 2 * Math.PI;
    assert.ok(P.motorTorque(1, 1, 1, 1, th, true) >= 0);
  }
  assert.ok(P.motorTorque(1, 1, 1, 1, 1.5 * Math.PI, false) < 0, "without a commutator it reverses");
  assert.equal(P.commutatedSign(4, true), -1);
  assert.equal(P.commutatedSign(4, false), 1);
});

test("transformer: Vs/Vp = Ns/Np and ideal power conservation", () => {
  const r = P.transformer(120, 8, 16, 100);
  assert.equal(r.Vs, 240);
  assert.ok(close(r.Is, 2.4));
  assert.ok(close(r.P, 576));
  assert.ok(close(r.Ip * 120, r.Vs * r.Is));
  const d = P.transformer(120, 8, 4, 100);
  assert.equal(d.Vs, 60);
  assert.ok(d.Ip < r.Ip);
  assert.ok(close(r.Ip / r.Is, 16 / 8), "current ratio is the inverse turns ratio");
});

test("sliders: round-trip, and no shown value jumps 2x or more, hits zero, or flips sign between adjacent steps", () => {
  for (const [k, s] of Object.entries(P.SLIDERS)) {
    assert.ok(s.min > 0 && s.max > s.min, k);
    for (const step of [0, 37, 100, 200]) assert.equal(P.toSlider(k, P.fromSlider(k, step)), step, k);
    assert.ok(s.def >= s.min && s.def <= s.max, `${k} default in range`);
  }
  const variants = {
    flux: [{}], faraday: P.COIL_TURNS.flatMap((turns) => [{ turns, pole: "N" }, { turns, pole: "S" }]),
    lenz: P.COIL_TURNS.flatMap((turns) => ["toward", "away"].map((motion) => ({ turns, motion }))),
    generator: P.GEN_TURNS.map((genN) => ({ genN })), motor: [{ commutator: true }, { commutator: false }],
    transformer: P.NS_CHOICES.map((ns) => ({ ns })), sandbox: P.COIL_TURNS.map((turns) => ({ turns }))
  };
  let checked = 0;
  for (const mode of P.MODES) for (const v of variants[mode]) for (const k of P.MODE_SLIDERS[mode]) {
    let prev = null;
    for (let step = 0; step <= P.STEPS; step++) {
      const s = { ...P.defaults(), ...v, [k]: P.fromSlider(k, step) };
      const r = P.readouts(mode, s);
      for (const [name, val] of Object.entries(r)) if (typeof val === "number") assert.ok(Number.isFinite(val) && val > 0, `${mode} ${k} ${name} = ${val}`);
      if (prev) for (const [name, val] of Object.entries(r)) {
        if (typeof val !== "number" || val === prev[name]) continue;
        assert.ok(Math.max(val, prev[name]) / Math.min(val, prev[name]) < 2, `${mode} ${k} step ${step} ${name}: ${prev[name]} -> ${val}`);
        checked++;
      }
      prev = r;
    }
  }
  assert.ok(checked > 3000, String(checked));
});

test("deep links parse modes with aliases and fall back to flux", () => {
  assert.equal(P.parseQuery("?mode=sandbox").mode, "sandbox");
  assert.equal(P.parseQuery("?mode=free").mode, "sandbox");
  assert.equal(P.parseQuery("?mode=DC-Motor").mode, "motor");
  assert.equal(P.parseQuery("?mode=dynamo").mode, "generator");
  assert.equal(P.parseQuery("?mode=nope").mode, "flux");
  assert.equal(P.parseQuery("").mode, "flux");
  for (const m of P.MODES) assert.equal(P.parseQuery(`?mode=${m}&board=b1`).mode, m);
});

test("page, gallery card, theme and module files follow the study pattern", () => {
  const html = read("study-induction-motors.html");
  assert.match(html, /data-study-back/);
  assert.match(html, /induction-motors\/induction-ui\.js/);
  assert.doesNotMatch(html, /firebase|getAuth|signIn/i);
  assert.match(html, /prefers-color-scheme: dark/);
  assert.match(html, /popboard\.induction\.theme/);
  assert.match(html, /id="themeBtn"/);
  for (const m of P.MODES) assert.match(html, new RegExp(`data-show="${m}"`), m);
  const ui = read("induction-motors/induction-ui.js"), render = read("induction-motors/induction-render.js");
  assert.doesNotMatch(ui + render, /firebase|getAuth|signIn/i);
  assert.match(ui, /forwardStudyQuery/);
  assert.match(ui, /location\.href = "study\.html" \+ location\.search/);
  assert.match(ui, /prefers-reduced-motion/);
  assert.match(ui, /prefers-color-scheme: dark/);
  assert.match(ui, /localStorage\.setItem\(THEME_KEY/);
  const phys = read("induction-motors/induction-physics.js");
  assert.doesNotMatch(phys, /\bdocument\b|\bwindow\b|getContext|localStorage|\bImage\(/);
  const gallery = read("study.html");
  assert.match(gallery, /id: "induction-motors"/);
  assert.match(gallery, /file: "study-induction-motors\.html"/);
  assert.match(gallery.match(/id: "induction-motors"[\s\S]*?icon: '([^']+)'/)[1], /^<svg viewBox="0 0 24 24"/);
  const css = read("induction-motors/induction-theme.css");
  assert.match(css, /--im-hit: 44px/);
  assert.match(css, /min-height: var\(--im-hit\)/);
  assert.match(css, /:root\[data-theme="dark"\]/);
  assert.match(css, /prefers-reduced-motion/);
});

test("WebP only, every asset the renderer asks for ships, the magnet drops its halo over the coil", () => {
  const shipped = readdirSync(new URL("induction-motors/assets/", pub));
  for (const n of shipped) assert.match(n, /\.webp$/);
  const render = read("induction-motors/induction-render.js");
  const used = render.match(/ART_NAMES = \[([^\]]+)\]/)[1].match(/"([a-z0-9-]+)"/g).map((n) => n.slice(1, -1));
  assert.equal(used.length, 13);
  for (const n of used) assert.ok(shipped.includes(n + ".webp"), n);
  assert.equal(shipped.length, used.length, "no unused art shipped");
  const stacked = render.match(/STACKED = \[([^\]]+)\]/)[1];
  assert.match(stacked, /"bar-magnet"/);
  assert.match(render, /bar-magnetBare/);
});

test("art anchors match the manifest", () => {
  assert.deepEqual(P.ART.coil, { w: 1024, h: 512, x0: 212, x1: 812, axisY: 256, r: 130 });
  assert.deepEqual(P.ART.magnet.body, [112, 88, 912, 168]);
  assert.deepEqual(P.ART.transformer.win, [312, 332, 712, 692]);
  assert.equal(P.NP, 8);
  assert.deepEqual([...P.NS_CHOICES], [4, 16]);
});

test("no em-dashes in the new files", () => {
  const files = ["study-induction-motors.html", ...readdirSync(new URL("induction-motors/", pub)).filter((n) => /\.(js|css)$/.test(n)).map((n) => "induction-motors/" + n)];
  for (const f of files) assert.doesNotMatch(read(f), /\u2014/, f);
  assert.doesNotMatch(doc(), /\u2014/);
  assert.doesNotMatch(readFileSync(new URL("./induction-physics.test.mjs", import.meta.url), "utf8"), /\u2014/);
  const card = read("study.html").match(/id: "induction-motors"[\s\S]*?icon:/)[0];
  assert.doesNotMatch(card, /\u2014/);
});

test("science doc covers every equation and constant shown", () => {
  const d = doc();
  for (const s of ["B A cos", "1 Wb = 1 T", "-N dPhi/dt", "mu0 m R^2", "4 pi x 10^-7", "2 cm", "9 cm", "24 cm", "5 ohm", "20 mV",
    "N B A omega sin", "peak/sqrt(2)", "100 cm^2", "60 Hz", "F = N I L B", "N I A B sin", "50 turns", "5 cm", "Vs/Vp = Ns/Np", "Vp Ip = Vs Is", "8 turns", "Sources"])
    assert.ok(d.includes(s), s);
});
