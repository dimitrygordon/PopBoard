import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import * as P from "../public/climate/climate-physics.js";

const close = (a, b, tol) => Math.abs(a - b) <= tol;
const pub = new URL("../public/", import.meta.url);
const read = (n) => readFileSync(new URL(n, pub), "utf8");
const steps = (name) => Array.from({ length: P.SLIDERS[name].steps + 1 }, (_, i) => P.fromSlider(name, i));

test("constants: Stefan-Boltzmann, solar irradiance, Wien", () => {
  assert.equal(P.SIGMA, 5.670374419e-8);
  assert.equal(P.S0, 1361.0);
  assert.equal(P.WIEN, 2898);
  assert.ok(close(P.peakUm(288), 10.06, 0.01), "Earth's glow peaks near 10 um");
});

test("energy balance: Earth is 255 K without a greenhouse and 288 K observed", () => {
  const E = P.PLANETS.earth;
  assert.ok(close(P.eqTemp(E.S, E.albedo), 255, 0.5));
  assert.ok(close(P.eqTemp(1361, 0.3), 254.6, 0.1), "textbook a = 0.30 gives 255 K");
  assert.ok(close(P.absorbed(1361, 0.3), 238.2, 0.1));
  for (const [S, a] of [[1361, 0.294], [2601.3, 0.77], [500, 0.1]]) {
    const T = P.eqTemp(S, a);
    assert.ok(close(P.SIGMA * T ** 4, P.absorbed(S, a), 1e-9), "sigma T^4 = S(1-a)/4");
    assert.ok(close(P.absorbed(S, a) + P.reflected(S, a), S / 4, 1e-9));
  }
  assert.ok(close(P.solarAt(1), 1361, 1e-9));
  assert.ok(close(P.solarAt(0.723), 2601.3, 3), "inverse square matches the Venus fact sheet");
  assert.ok(close(P.solarAt(1.524), 586.2, 1), "inverse square matches the Mars fact sheet");
  assert.ok(P.eqTemp(1361, 0.5) < P.eqTemp(1361, 0.2), "brighter planet is colder");
});

test("planets: NASA fact sheet values and black-body temperatures", () => {
  const V = P.PLANETS.venus, E = P.PLANETS.earth, M = P.PLANETS.mars;
  assert.deepEqual([V.albedo, E.albedo, M.albedo], [0.77, 0.294, 0.25]);
  assert.deepEqual([V.Tobs, E.Tobs, M.Tobs], [737, 288, 214]);
  assert.deepEqual([V.d, E.d, M.d], [0.723, 1.0, 1.524]);
  assert.ok(close(P.eqTemp(V.S, V.albedo), 226.6, 0.2), "Venus black-body 226.6 K");
  assert.ok(close(P.eqTemp(M.S, M.albedo), 209.8, 0.2), "Mars black-body 209.8 K");
  assert.ok(P.eqTemp(V.S, V.albedo) < P.eqTemp(E.S, E.albedo), "without greenhouse Venus would be colder than Earth");
  const warm = (p) => p.Tobs - P.eqTemp(p.S, p.albedo);
  assert.ok(warm(V) > 500 && close(warm(E), 33, 0.5) && warm(M) > 0 && warm(M) < 6);
});

test("greenhouse: one-layer model conserves energy and matches Earth at eps 0.77", () => {
  const Te = P.EARTH_TE;
  for (const eps of [0.05, 0.3, 0.77, 0.95]) {
    const g = P.oneLayer(Te, eps);
    assert.ok(close(g.passes + g.atmEach, P.SIGMA * Te ** 4, 1e-6), "top of atmosphere: out = absorbed sunlight");
    assert.ok(close(P.SIGMA * Te ** 4 + g.atmEach, g.surfUp, 1e-6), "surface: sun + back radiation = ground glow");
    assert.ok(close(g.absorbedIR, 2 * g.atmEach, 1e-6), "layer: absorbed = emitted up + down");
    assert.ok(g.Ts > Te);
  }
  const eps = P.epsFor(Te, 288);
  assert.ok(close(eps, 0.77, 0.01));
  assert.ok(close(P.oneLayer(Te, eps).Ts, 288, 1e-9));
  assert.ok(close(P.oneLayer(Te, 1).Ts, Te * 2 ** 0.25, 1e-9), "one opaque layer: 2^(1/4)");
  assert.ok(close(P.layersTemp(Te, 1), Te * 2 ** 0.25, 1e-9), "n-layer model agrees for n = 1");
  assert.ok(close(P.layersFor(P.eqTemp(P.PLANETS.venus.S, 0.77), 737), 110, 2), "Venus acts like about 110 layers");
  assert.ok(close(P.layersFor(Te, 288), 0.62, 0.02), "Earth acts like about 0.6 layers");
  assert.equal(P.GASES.n2o2.absorbs, false);
  assert.deepEqual(P.GASES.co2.bands, [4.3, 15]);
  assert.ok(P.WINDOW_UM[0] === 8 && P.WINDOW_UM[1] === 13);
});

test("CO2: logarithmic forcing, doubling, AR6 sensitivity, Keeling curve", () => {
  assert.ok(close(P.forcing(560), 3.71, 0.005));
  assert.ok(close(P.F2X, 3.708, 0.001));
  assert.ok(close(P.forcing(1120) - P.forcing(560), P.forcing(560), 1e-9), "every doubling adds the same forcing");
  assert.equal(P.forcing(P.C0), 0);
  assert.deepEqual(P.ECS, { low: 2.5, best: 3, high: 4, vlow: 2, vhigh: 5 });
  assert.equal(P.F2X_AR6, 3.93);
  assert.ok(close(P.warmingFor(560, 3), 3, 1e-9));
  assert.ok(close(P.forcing(427.35), 2.26, 0.01), "2025 forcing from CO2 alone");
  const K = P.KEELING;
  assert.deepEqual(K[0], [1959, 315.98]);
  assert.deepEqual(K[K.length - 1], [2025, 427.35]);
  for (let i = 1; i < K.length; i++) assert.ok(K[i][0] > K[i - 1][0] && K[i][1] > K[i - 1][1], "rising every listed year");
});

test("feedbacks: AR6 Table 7.10 central values", () => {
  assert.equal(P.FEEDBACKS.planck.value, -3.22);
  assert.equal(P.FEEDBACKS.wvlr.value, 1.3);
  assert.equal(P.FEEDBACKS.albedo.value, 0.35);
  assert.equal(P.FEEDBACKS.cloud.value, 0.42);
  const all = P.feedbackSum({ wvlr: true, albedo: true, cloud: true });
  assert.ok(close(all, P.AR6_NET, 0.011), "sum is AR6 net -1.16 minus the -0.01 biogeophysical term");
  assert.ok(close(P.responseTo(3.93, -3.22), 1.22, 0.01), "Planck-only warming for doubled CO2");
  const ecs = P.responseTo(3.93, all);
  assert.ok(ecs >= P.ECS.low && ecs <= P.ECS.high, "feedback-based sensitivity is in the AR6 likely range");
});

const sandboxBase = (o) => ({ dAU: 1, albedo: 0.3, layers: 0.6, atmosphere: true, look: "earth", ...o });
function stateGrid(mode) {
  const out = [];
  if (mode === "energy") for (const a of [0.05, 0.3, 0.9]) for (const S of [401, 1361, 2801]) out.push({ S, albedo: a });
  if (mode === "greenhouse") out.push({ eps: 0.5, gas: "co2" });
  if (mode === "co2") out.push({ ppm: 400 });
  if (mode === "feedbacks") for (const w of [false, true]) for (const a of [false, true]) for (const c of [false, true]) out.push({ dF: 3.93, on: { wvlr: w, albedo: a, cloud: c } });
  if (mode === "sandbox") for (const atmosphere of [false, true]) for (const d of [0.3, 1, 3]) for (const a of [0.05, 0.5, 0.9]) for (const n of [0.02, 1, 150])
    out.push(sandboxBase({ dAU: d, albedo: a, layers: n, atmosphere }));
  return out;
}
test("sliders: every shown number moves less than 2x per step and never flips sign or hits zero", () => {
  let checked = 0;
  for (const mode of P.MODES) for (const base of stateGrid(mode)) for (const sl of P.modeSliders(mode, base)) {
    for (const v of steps(sl)) assert.equal(P.toSlider(sl, P.fromSlider(sl, P.toSlider(sl, v))), P.toSlider(sl, v));
    const vals = steps(sl).map((v) => P.shown(mode, { ...base, [P.SLIDER_KEY[sl]]: v }));
    for (let i = 1; i < vals.length; i++) for (const k of Object.keys(vals[i])) {
      const a = vals[i - 1][k], b = vals[i][k];
      if (typeof a !== "number") continue;
      checked++;
      assert.ok(a !== 0 && b !== 0, `${mode} ${sl} ${k} is zero`);
      assert.ok(Math.sign(a) === Math.sign(b), `${mode} ${sl} ${k} flips sign: ${a} -> ${b}`);
      const r = Math.abs(b / a);
      assert.ok(r < 2 && r > 0.5, `${mode} ${JSON.stringify(base)} ${sl} step ${i} ${k}: ${a} -> ${b}`);
    }
  }
  for (const p of P.PLANET_IDS) for (const v of Object.values(P.shown("compare", { planet: p }))) assert.ok(v > 0);
  assert.ok(checked > 10000, "swept " + checked);
});
test("presets: real planets land on reachable slider values", () => {
  for (const S of [1361, 2601]) assert.equal(P.fromSlider("S", P.toSlider("S", S)), S);
  assert.equal(P.fromSlider("ppm", P.toSlider("ppm", 560)), 560);
  assert.ok(P.SLIDERS.layers.max > P.layersFor(P.eqTemp(P.solarAt(0.723), 0.77), 737), "Venus fits on the thickness slider");
});

test("deep links: modes and aliases", () => {
  assert.deepEqual(P.MODES, ["energy", "greenhouse", "compare", "co2", "feedbacks", "sandbox"]);
  for (const m of P.MODES) assert.equal(P.parseQuery("?mode=" + m).mode, m);
  assert.equal(P.parseQuery("?mode=energy-balance").mode, "energy");
  assert.equal(P.parseQuery("?mode=keeling").mode, "co2");
  assert.equal(P.parseQuery("?mode=ice-albedo").mode, "feedbacks");
  assert.equal(P.parseQuery("?mode=planets").mode, "compare");
  assert.equal(P.parseQuery("?mode=nope").mode, "energy");
  assert.equal(P.parseQuery("").mode, "energy");
});

test("formatting", () => {
  assert.equal(P.degC(288), "15 \u00b0C");
  assert.equal(P.degC(255.12), "\u221218 \u00b0C");
  assert.equal(P.degC(273.4), "0 \u00b0C");
  assert.equal(P.sig(2601.3, 5), "2601.3");
});

test("page, gallery card, theme and module files follow the study pattern", () => {
  const html = read("study-climate.html");
  assert.match(html, /data-study-back/);
  assert.match(html, /climate\/climate-ui\.js/);
  assert.doesNotMatch(html, /firebase|getAuth|signIn/);
  assert.match(html, /prefers-color-scheme: dark/);
  assert.match(html, /popboard\.climate\.theme/);
  assert.match(html, /id="themeBtn"/);
  for (const m of P.MODES) assert.match(html, new RegExp(`data-show="${m}"`), m);
  const ui = read("climate/climate-ui.js");
  assert.match(ui, /forwardStudyQuery/);
  assert.match(ui, /study\.html"\s*\+\s*location\.search/);
  assert.match(ui, /prefers-reduced-motion/);
  assert.match(ui, /prefers-color-scheme: dark/);
  assert.match(ui, /localStorage\.setItem\(THEME_KEY/);
  const phys = read("climate/climate-physics.js");
  assert.doesNotMatch(phys, /\bdocument\.|\bwindow\.|getContext|localStorage|\bimport\b/);
  const gallery = read("study.html");
  assert.match(gallery, /id: "climate"/);
  assert.match(gallery, /file: "study-climate\.html"/);
  const css = read("climate/climate-theme.css");
  assert.match(css, /--cl-hit: 44px/);
  assert.match(css, /:root\[data-theme="dark"\]/);
  assert.match(css, /prefers-reduced-motion/);
  const files = ["study-climate.html", ...readdirSync(new URL("climate/", pub)).filter((n) => /\.(js|css)$/.test(n)).map((n) => "climate/" + n)];
  for (const f of files) assert.doesNotMatch(read(f), /\u2014/, f);
  assert.doesNotMatch(readFileSync(new URL("../docs/climate-science.md", import.meta.url), "utf8"), /\u2014/);
  assert.doesNotMatch(readFileSync(new URL("./climate-physics.test.mjs", import.meta.url), "utf8"), /\u2014/);
  const shipped = readdirSync(new URL("climate/assets/", pub));
  for (const n of shipped) assert.match(n, /\.webp$/);
  const render = read("climate/climate-render.js");
  const used = render.match(/IMAGES = \[([^\]]+)\]/)[1].match(/"([a-z0-9-]+)"/g).map((n) => n.slice(1, -1));
  for (const n of used) assert.ok(shipped.includes(n + ".webp"), n);
  for (const n of shipped) assert.ok(used.includes(n.replace(/\.webp$/, "")), "unused asset " + n);
});

test("theme tokens keep text and lines readable in both themes (WCAG AA 4.5:1)", () => {
  const css = read("climate/climate-theme.css");
  const block = (sel) => css.slice(css.indexOf(sel), css.indexOf("}", css.indexOf(sel)));
  const light = block(":root {"), dark = block(':root[data-theme="dark"]');
  const tok = (b, name) => (b.match(new RegExp(`--cl-${name}:\\s*(#[0-9a-f]{6})`)) || light.match(new RegExp(`--cl-${name}:\\s*(#[0-9a-f]{6})`)))[1];
  const lum = (hex) => {
    const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  for (const b of [light, dark]) {
    for (const fg of ["ink", "ink-dim", "accent", "warn", "sun", "ir", "cool"]) {
      assert.ok(ratio(tok(b, fg), tok(b, "paper")) >= 4.5, fg + " on paper");
    }
    for (const fg of ["ink", "ink-dim", "sun", "ir"]) assert.ok(ratio(tok(b, fg), tok(b, "sky")) >= 4.5, fg + " on sky");
    assert.ok(ratio(tok(b, "ink"), tok(b, "chip")) >= 4.5, "chip text");
    assert.ok(ratio(tok(b, "paper"), tok(b, "ink")) >= 4.5, "pressed chip text");
  }
  assert.ok(ratio(tok(light, "text"), tok(light, "chrome")) >= 4.5, "header text");
  assert.ok(ratio(tok(light, "text"), tok(light, "btn")) >= 4.5, "toolbar text");
  assert.ok(ratio("#1c1c1c", tok(light, "gold")) >= 4.5, "pressed toolbar");
  // label text drawn on the Planck (cool) bar
  assert.ok(ratio("#ffffff", tok(light, "cool")) >= 4.5 && ratio("#16181f", tok(dark, "cool")) >= 4.5, "text on cool bars");
});
