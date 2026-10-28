import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import * as P from "../public/em-fields/emfields-physics.js";

const close = (a, b, rel = 1e-9) => Math.abs(a - b) <= rel * Math.abs(b);
const pub = new URL("../public/", import.meta.url);
const read = (n) => readFileSync(new URL(n, pub), "utf8");
const NC = P.NC;

test("constants: e exact, k from epsilon0, mu0 CODATA 2018", () => {
  assert.equal(P.E_CHARGE, 1.602176634e-19);
  assert.ok(close(P.K, 8.9875517923e9, 1e-9));
  assert.ok(close(P.MU0, 4 * Math.PI * 1e-7, 1e-9));
  assert.ok(close(1 / Math.sqrt(P.MU0 * P.EPS0), 299792458, 1e-9), "c = 1/sqrt(mu0 eps0)");
  assert.ok(close(P.PARTICLES.proton.m / P.PARTICLES.electron.m, 1836.15267, 1e-8));
});

test("Coulomb field: inverse square, direction away from + and toward -", () => {
  const c = { x: 0, y: 0, q: 1 * NC };
  const e1 = P.eField([c], 0.1, 0), e2 = P.eField([c], 0.2, 0);
  assert.ok(close(e1.x, P.K * 1e-9 / 0.01, 1e-12));
  assert.ok(close(e1.x / e2.x, 4, 1e-12));
  assert.ok(e1.x > 0 && P.eField([{ ...c, q: -NC }], 0.1, 0).x < 0);
  assert.ok(close(P.coulombMagnitude(NC, NC, 0.1), 8.98755e-7, 1e-5));
});

test("superposition: the net field is the vector sum; dipole midpoint field points from + to -", () => {
  const cs = P.PRESETS.three;
  const parts = cs.map((c) => P.eFieldFrom(c, 0.03, 0.01));
  const net = P.eField(cs, 0.03, 0.01);
  assert.ok(close(net.x, parts.reduce((s, e) => s + e.x, 0), 1e-12));
  assert.ok(close(net.y, parts.reduce((s, e) => s + e.y, 0), 1e-12));
  const d = P.eField(P.PRESETS.dipole, 0, 0);
  assert.ok(d.x > 0 && Math.abs(d.y) < 1e-6 * d.x);
  const like = P.eField(P.PRESETS.like, 0, 0);
  assert.ok(Math.hypot(like.x, like.y) < 1e-6, "like pair: zero field midway");
});

test("potential is a scalar sum and E = -grad V", () => {
  const cs = P.PRESETS.three, h = 1e-6, x = 0.02, y = -0.01;
  const ex = -(P.potential(cs, x + h, y) - P.potential(cs, x - h, y)) / (2 * h);
  const ey = -(P.potential(cs, x, y + h) - P.potential(cs, x, y - h)) / (2 * h);
  const e = P.eField(cs, x, y);
  assert.ok(close(ex, e.x, 1e-5) && close(ey, e.y, 1e-5));
  assert.ok(Math.abs(P.potential(P.PRESETS.dipole, 0, 0.05)) < 1e-9, "dipole bisector is at 0 V");
  assert.ok(close(P.potential([{ x: 0, y: 0, q: NC }], 0.05, 0), 179.751, 1e-5));
});

test("straight wire: B = mu0 I / (2 pi r), right-hand rule, B = curl of A_z", () => {
  const w = { x: 0, y: 0, I: 10 };
  const b = P.bField([w], 0.05, 0);
  assert.ok(close(b.y, 4e-5, 1e-9) && Math.abs(b.x) < 1e-20, "out-of-page current: B counterclockwise");
  assert.ok(P.bField([{ ...w, I: -10 }], 0.05, 0).y < 0);
  assert.ok(close(P.wireBMagnitude(10, 0.05), 4e-5, 1e-9));
  const ws = P.WIRE_PRESETS.opposite, h = 1e-7, x = 0.01, y = 0.03;
  const bx = (P.vectorPotentialZ(ws, x, y + h) - P.vectorPotentialZ(ws, x, y - h)) / (2 * h);
  const by = -(P.vectorPotentialZ(ws, x + h, y) - P.vectorPotentialZ(ws, x - h, y)) / (2 * h);
  const B = P.bField(ws, x, y);
  assert.ok(close(bx, B.x, 1e-5) && close(by, B.y, 1e-5));
});

test("parallel wires: 2e-7 N/m at 1 A and 1 m; same direction attracts", () => {
  const f = P.wireForcePerLength(1, 1, 1);
  assert.ok(close(f.perMeter, 2e-7, 1e-9) && f.attract);
  assert.equal(P.wireForcePerLength(10, -10, 0.1).attract, false);
  assert.ok(close(P.wireForcePerLength(10, 10, 0.1).perMeter, 2e-4, 1e-9));
});

test("cyclotron: r = mv/(qB), T independent of v, and the Boris pusher reproduces both", () => {
  const p = P.PARTICLES.proton;
  assert.ok(close(P.cyclotronRadius(p.m, p.q, 2e5, 0.2), 0.0104397, 1e-5));
  const T = P.cyclotronPeriod(p.m, p.q, 0.2);
  assert.ok(close(T, 3.2796e-7, 1e-4));
  assert.ok(close(P.cyclotronFrequency(p.m, p.q, 1), 15.2451e6, 1e-4), "15.2 MHz per tesla");
  const fields = () => ({ Ex: 0, Ey: 0, Bz: -0.2 });
  let s = { x: 0, y: 0, vx: 2e5, vy: 0 }, maxY = 0;
  const n = 2000;
  for (let i = 0; i < n; i++) { s = P.borisStep(s, p.q, p.m, T / n, fields); maxY = Math.max(maxY, s.y); }
  assert.ok(close(Math.hypot(s.vx, s.vy), 2e5, 1e-12), "magnetic force does no work");
  assert.ok(Math.hypot(s.x, s.y) < 1e-4, "back to the start after one period");
  assert.ok(close(maxY, 2 * P.cyclotronRadius(p.m, p.q, 2e5, 0.2), 1e-3), "positive charge, B into page: curves up");
});

test("velocity selector: v = E/B passes for protons and alphas; too fast or too slow does not", () => {
  for (const id of ["proton", "alpha"]) {
    const part = P.PARTICLES[id];
    assert.ok(P.selectorPath(part, 2e5, 2e4, 0.1).passes, id);
    assert.ok(!P.selectorPath(part, 1e5, 2e4, 0.1).passes, id + " slow");
    assert.ok(!P.selectorPath(part, 4e5, 2e4, 0.1).passes, id + " fast");
  }
  assert.equal(P.selectorSpeed(2e4, 0.1), 2e5);
  // proton too slow: electric force (down) wins
  const slow = P.selectorPath(P.PARTICLES.proton, 5e4, 2e4, 0.1);
  assert.ok(Math.min(...slow.pts.map((q) => q.y)) < -0.001);
});

test("energy: in a static E field, kinetic plus potential energy is conserved", () => {
  const part = P.PARTICLES.proton, cs = [{ x: 0, y: 0.02, q: 2 * NC }];
  const fields = (x, y) => { const e = P.eField(cs, x, y); return { Ex: e.x, Ey: e.y, Bz: -0.02 }; };
  const E0 = P.kineticEnergyJ(part.m, 2e5) + part.q * P.potential(cs, -0.1, 0);
  const r = P.advance({ x: -0.1, y: 0, vx: 2e5, vy: 0 }, part, 1e-6, fields, { near: (x, y) => Math.hypot(x, y - 0.02), maxSteps: 100000 });
  const E1 = P.kineticEnergyJ(part.m, Math.hypot(r.p.vx, r.p.vy)) + part.q * P.potential(cs, r.p.x, r.p.y);
  assert.ok(r.done);
  assert.ok(close(E1, E0, 2e-3));
});

test("field lines leave + charges and end on - charges; contours trace a circle", () => {
  const b = { x0: -0.2, x1: 0.2, y0: -0.15, y1: 0.15 };
  const lines = P.traceFieldLines(P.PRESETS.dipole, b);
  assert.equal(lines.length, 12, "6 lines per nC on the 2 nC charge");
  const ends = lines.filter((l) => { const [x, y] = l[l.length - 1]; return Math.hypot(x - 0.06, y) < 0.015; });
  assert.ok(ends.length >= 6);
  assert.ok(P.traceFieldLines([{ x: 0, y: 0, q: -NC }], b).length === 6);
  const n = 41, g = new Float64Array(n * n);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) g[j * n + i] = Math.hypot(i - 20, j - 20);
  const segs = P.contourSegments(g, n, n, -20, -20, 1, 1, 10);
  for (const s of segs) for (const [x, y] of s) assert.ok(Math.abs(Math.hypot(x, y) - 10) < 0.3);
  assert.ok(P.equipotentialLevels().every((v) => v % 50 === 0 && v !== 0));
});

test("sliders: log, round-trip, and no shown value jumps 2x between adjacent steps", () => {
  for (const name of Object.keys(P.SLIDERS)) {
    const s = P.SLIDERS[name];
    assert.ok(close(P.fromSlider(name, 0), s.min) && close(P.fromSlider(name, P.STEPS), s.max), name);
    for (let i = 0; i < P.STEPS; i++) {
      const a = P.fromSlider(name, i), b = P.fromSlider(name, i + 1);
      // the slider value itself and anything up to its square (kinetic energy ~ v^2)
      assert.ok(b / a < 1.2 && (b / a) ** 2 < 2, `${name} step ${i}`);
      assert.equal(P.toSlider(name, a), i);
    }
  }
  // derived readouts in the motion modes
  const p = P.PARTICLES.alpha;
  for (let i = 0; i < P.STEPS; i++) {
    const r0 = P.cyclotronRadius(p.m, p.q, P.fromSlider("cycV", i), 0.2), r1 = P.cyclotronRadius(p.m, p.q, P.fromSlider("cycV", i + 1), 0.2);
    const t0 = P.cyclotronPeriod(p.m, p.q, P.fromSlider("cycB", i)), t1 = P.cyclotronPeriod(p.m, p.q, P.fromSlider("cycB", i + 1));
    const v0 = P.selectorSpeed(P.fromSlider("selE", i), 0.1), v1 = P.selectorSpeed(P.fromSlider("selE", i + 1), 0.1);
    for (const ratio of [r1 / r0, t0 / t1, v1 / v0]) assert.ok(ratio < 2 && ratio > 0.5);
  }
});

test("cyclotron mode fits in its view at every slider setting", () => {
  for (const id of ["proton", "alpha"]) {
    const part = P.PARTICLES[id];
    const r = P.cyclotronRadius(part.m, part.q, P.SLIDERS.cycV.max, P.SLIDERS.cycB.min);
    assert.ok(2 * r < 0.48, id);
  }
});

test("deep links parse modes, presets and particles with aliases and fallbacks", () => {
  assert.deepEqual(P.parseQuery("?mode=sandbox"), { mode: "sandbox", preset: null, particle: null });
  assert.equal(P.parseQuery("?mode=free").mode, "sandbox");
  assert.equal(P.parseQuery("?mode=Equipotentials").mode, "potential");
  assert.equal(P.parseQuery("?mode=velocity-selector").mode, "selector");
  assert.equal(P.parseQuery("?mode=wires").mode, "magnetic");
  assert.equal(P.parseQuery("?mode=bogus").mode, "field");
  assert.equal(P.parseQuery("").mode, "field");
  assert.equal(P.parseQuery("?preset=like&particle=alpha").preset, "like");
  assert.equal(P.parseQuery("?particle=muon").particle, null);
  for (const m of P.MODES) assert.equal(P.parseQuery("?mode=" + m).mode, m);
});

test("formatting picks sensible units", () => {
  assert.equal(P.fmt(1.2e-6, "N"), "1.2 \u00b5N");
  assert.equal(P.fmt(2950, "N/C"), "2.95 kN/C");
  assert.equal(P.fmt(4e-5, "T"), "40 \u00b5T");
  assert.equal(P.fmtLength(0.0104), "1.04 cm");
  assert.equal(P.fmtSpeed(2e5), "2 \u00d7 10\u2075 m/s");
  assert.equal(P.angleDeg(0, -1), 270);
});

test("page, gallery card, theme and module files follow the study pattern", () => {
  const html = read("study-em-fields.html");
  assert.match(html, /data-study-back/);
  assert.match(html, /em-fields\/emfields-ui\.js/);
  assert.doesNotMatch(html, /firebase|getAuth|signIn/);
  assert.match(html, /prefers-color-scheme: dark/);
  assert.match(html, /popboard\.emfields\.theme/);
  assert.match(html, /id="themeBtn"/);
  for (const m of P.MODES) assert.match(html, new RegExp(`data-show="${m}"`), m);
  const ui = read("em-fields/emfields-ui.js");
  assert.match(ui, /forwardStudyQuery/);
  assert.match(ui, /study\.html"\s*\+\s*location\.search/);
  assert.match(ui, /prefers-reduced-motion/);
  assert.match(ui, /prefers-color-scheme: dark/);
  assert.match(ui, /localStorage\.setItem\(THEME_KEY/);
  const phys = read("em-fields/emfields-physics.js");
  assert.doesNotMatch(phys, /\bdocument\.|\bwindow\.|getContext|localStorage/);
  const gallery = read("study.html");
  assert.match(gallery, /id: "em-fields"/);
  assert.match(gallery, /file: "study-em-fields\.html"/);
  const css = read("em-fields/emfields-theme.css");
  assert.match(css, /--ef-hit: 44px/);
  assert.match(css, /:root\[data-theme="dark"\]/);
  assert.match(css, /prefers-reduced-motion/);
  const files = ["study-em-fields.html", ...readdirSync(new URL("em-fields/", pub)).filter((n) => /\.(js|css)$/.test(n)).map((n) => "em-fields/" + n)];
  for (const f of files) assert.doesNotMatch(read(f), /\u2014/, f);
  assert.doesNotMatch(readFileSync(new URL("../docs/em-fields-science.md", import.meta.url), "utf8"), /\u2014/);
  assert.doesNotMatch(readFileSync(new URL("./emfields-physics.test.mjs", import.meta.url), "utf8"), /\u2014/);
  for (const n of readdirSync(new URL("em-fields/assets/", pub))) assert.match(n, /\.webp$/);
  // every asset the UI asks for ships
  const shipped = readdirSync(new URL("em-fields/assets/", pub));
  const used = ui.match(/loadImages\(\[([^\]]+)\]/)[1].match(/"([a-z-]+)"/g).map((n) => n.slice(1, -1));
  assert.ok(used.length >= 8);
  for (const n of used) assert.ok(shipped.includes(n + ".webp"), n);
});

test("dark theme tokens keep text readable (WCAG AA 4.5:1)", () => {
  const css = read("em-fields/emfields-theme.css");
  const tok = (block, name) => block.match(new RegExp(`--ef-${name}:\\s*(#[0-9a-f]{6})`))[1];
  const light = css.slice(css.indexOf(":root {"), css.indexOf("}", css.indexOf(":root {")));
  const dark = css.slice(css.indexOf(':root[data-theme="dark"]'), css.indexOf("}", css.indexOf(':root[data-theme="dark"]')));
  const lum = (hex) => {
    const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  for (const block of [light, dark]) {
    for (const fg of ["ink", "ink-dim"]) assert.ok(ratio(tok(block, fg), tok(block, "paper")) >= 4.5, fg);
    assert.ok(ratio(tok(block, "ink"), tok(block, "chip")) >= 4.5, "chip text");
  }
});

test("art anchors match MANIFEST", () => {
  assert.deepEqual(P.ART.charge, { size: 256, center: [128, 128], r: 96 });
  assert.equal(P.ART.testCharge.r, 50);
  assert.equal(P.ART.electron.r, 40);
  assert.deepEqual(P.ART.compass.pivot, [128, 128]);
  assert.equal(P.ART.wire.centerY, 32);
  assert.equal(P.ART.wire.thick, 22);
});
