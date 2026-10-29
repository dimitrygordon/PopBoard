import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import * as P from "../public/quantum/quantum-physics.js";

const close = (a, b, tol) => Math.abs(a - b) <= tol;
const pub = new URL("../public/", import.meta.url);
const read = (n) => readFileSync(new URL(n, pub), "utf8");
const steps = (name) => Array.from({ length: P.SLIDERS[name].steps + 1 }, (_, i) => P.fromSlider(name, i));

test("constants: SI exact values and CODATA 2022", () => {
  assert.equal(P.H, 6.62607015e-34);
  assert.equal(P.C, 299792458);
  assert.equal(P.QE, 1.602176634e-19);
  assert.equal(P.ME, 9.1093837139e-31);
  assert.equal(P.MP, 1.67262192595e-27);
  assert.ok(close(P.HC_EV_NM, 1239.84198, 1e-5), "hc = 1240 eV nm");
  assert.ok(close(P.H_EV, 4.135667696e-15, 1e-23), "h = 4.136e-15 eV s");
  assert.ok(close(P.ME * P.C * P.C / P.QE, P.ME_C2_EV, 0.01), "electron rest energy agrees with its mass");
});

test("photon energy E = hf = hc/lambda (OpenStax examples)", () => {
  assert.ok(close(P.photonEV(430), 2.88, 0.005), "430 nm violet photon is 2.88 eV (OpenStax UP3 Example 6.6)");
  assert.ok(close(P.freqOf(500), 6.0e14, 0.01e14));
  assert.ok(close(P.photonJ(500), 3.97e-19, 0.01e-19));
  for (const l of [100, 300, 589, 1000]) assert.ok(close(P.photonJ(l), P.H * P.freqOf(l), 1e-30));
  assert.equal(P.colorName(650), "red"); assert.equal(P.colorName(520), "green"); assert.equal(P.colorName(420), "violet");
  assert.equal(P.bandOf(250), "ultraviolet"); assert.equal(P.bandOf(900), "infrared"); assert.equal(P.bandOf(550), "visible");
});

test("photoelectric: work functions, cut-offs and OpenStax worked examples", () => {
  const phi = Object.fromEntries(P.METAL_IDS.map((id) => [id, P.METALS[id].phi]));
  assert.deepEqual(phi, { Na: 2.46, Ca: 2.71, Al: 4.08, Zn: 4.31, Cu: 4.70, Ag: 4.73, Pt: 6.35 });
  assert.ok(close(P.cutoffLam(4.73), 262, 0.5), "silver cut-off 262 nm");
  assert.ok(close(P.cutoffLam(2.46), 504, 0.5), "sodium cut-off 504 nm");
  assert.ok(!P.emits(300, 4.73), "300 nm on silver: no photoelectrons");
  assert.ok(P.emits(300, 2.46));
  assert.ok(close(P.keMax(430, 2.71), 0.17, 0.005), "430 nm on calcium: K max 0.17 eV");
  assert.ok(close(P.HC_EV_NM / 180 - 0.80, 6.09, 0.01), "180 nm, 0.80 V stopping gives phi 6.09 eV");
  assert.ok(close(P.cutoffFreq(6.09), 1.47e15, 0.01e15));
  // intensity changes the rate, never K max
  const a = P.shown("photoelectric", { lam: 250, metal: "Zn", inten: 20 }), b = P.shown("photoelectric", { lam: 250, metal: "Zn", inten: 90 });
  assert.equal(a.ke, b.ke); assert.equal(a.vStop, b.vStop); assert.ok(b.rate > a.rate);
  const below = P.shown("photoelectric", { lam: 600, metal: "Na", inten: 100 });
  assert.equal(below.rate, null); assert.equal(below.ke, null);
  for (const id of P.METAL_IDS) assert.ok(P.cutoffLam(P.METALS[id].phi) > P.SLIDERS.lamPE.min, id + " cut-off is reachable on the slider");
});

test("hydrogen: E_n = -13.6/n^2 and Balmer lines match NIST to 0.1%", () => {
  assert.equal(P.levelEV(1), -13.6);
  assert.ok(close(P.levelEV(2), -3.4, 1e-12));
  assert.ok(close(P.transitionEV(3, 2), 1.889, 0.001));
  for (const b of P.BALMER) {
    const nist = P.BALMER_NIST_AIR[b.n];
    assert.ok(Math.abs(b.nm - nist) / nist < 0.001, `Balmer ${b.n}->2: ${b.nm} vs ${nist}`);
    assert.equal(P.colorName(b.nm) !== null, true, "Balmer lines 3..6 -> 2 are visible");
  }
  assert.ok(close(P.transitionNm(2, 1), 121.6, 0.1), "Lyman alpha 121.6 nm");
  assert.equal(P.bandOf(P.transitionNm(2, 1)), "ultraviolet");
  assert.equal(P.bandOf(P.transitionNm(4, 3)), "infrared", "Paschen lines are infrared");
  assert.equal(P.absorbedLine(121.6), 2); assert.equal(P.absorbedLine(500), null);
  assert.ok(P.ionizes(90)); assert.ok(!P.ionizes(95));
  assert.equal(P.SERIES[1], "Lyman"); assert.equal(P.SERIES[2], "Balmer"); assert.equal(P.SERIES[3], "Paschen");
});

test("de Broglie wavelength lambda = h/mv", () => {
  assert.ok(close(P.deBroglie(P.ME, 1e6), 7.27e-10, 0.01e-10), "electron at 1e6 m/s: 0.727 nm");
  assert.ok(close(P.deBroglie(0.145, 40), 1.14e-34, 0.01e-34), "baseball at 40 m/s");
  assert.ok(P.deBroglie(P.MP, 1e3) < P.deBroglie(P.ME, 1e3));
  // 50 keV electrons: relativistic lambda 5.36 pm, nonrelativistic would be 5.48 pm
  assert.ok(close(P.electronLamFromKeV(50) * 1e12, 5.36, 0.01));
  assert.ok(close(P.electronLamFromKeV(0.1) * 1e9, 1.226 / Math.sqrt(100), 0.001), "low energy: 1.226 nm / sqrt(V)");
  assert.ok(P.SLIDERS.vE.max / P.C < 0.034, "electron speeds stay nonrelativistic (< 0.1% error in lambda)");
});

test("double slit: fringe spacing, symmetric pattern and detector removes fringes", () => {
  const k = P.slitSetup({ source: "light", lam: 550 });
  assert.ok(close(P.fringeSpacing(k.lamM, k.d, k.L), 2.2e-3, 1e-9));
  const dy = P.fringeSpacing(k.lamM, k.d, k.L);
  assert.ok(P.intensity(dy / 2, k.lamM, k.d, k.L) < 1e-3, "dark fringe halfway between bright ones");
  assert.ok(P.intensity(dy, k.lamM, k.d, k.L) > 0.7, "next bright fringe at dy");
  assert.ok(P.intensity(dy / 2, k.lamM, k.d, k.L, true) > 0.7, "watched: no dark fringe there");
  const rng = P.mulberry32(7), hits = Array.from({ length: 4000 }, () => P.sampleHit(k.lamM, k.d, k.L, k.half, false, rng));
  const near = (c) => hits.filter((y) => Math.abs(y - c) < dy * 0.1).length;
  assert.ok(near(0) > 5 * near(dy / 2), "hits cluster on bright fringes");
  for (const y of hits) assert.ok(Math.abs(y) <= k.half);
});

// every shown number, for every slider of every mode, at several values of the other settings
function stateGrid(mode) {
  const out = [];
  if (mode === "photon") out.push({ lam: 500 });
  if (mode === "photoelectric") for (const metal of P.METAL_IDS) for (const inten of [10, 55, 100]) for (const lam of steps("lamPE").filter((_, i) => i % 25 === 0)) out.push({ metal, inten, lam });
  if (mode === "hydrogen") out.push({ nUp: 3, nLow: 2 });
  if (mode === "debroglie") for (const particle of P.PARTICLE_IDS) out.push({ particle, v: P.SLIDERS[P.PARTICLES[particle].slider].min });
  if (mode === "doubleslit") for (const source of ["light", "electron"]) out.push({ source, lam: 550, keV: 50 });
  if (mode === "sandbox") {
    for (const target of ["metal", "slits", "hydrogen"]) for (const metal of P.METAL_IDS) for (const lam of steps("lamSB").filter((_, i) => i % 60 === 0))
      out.push({ source: "light", target, metal, lam, inten: 50, dL: 0.25, dE: 1, keV: 50 });
    for (const dE of [0.2, 1, 5]) out.push({ source: "electron", target: "slits", metal: "Na", lam: 500, inten: 50, dL: 0.25, dE, keV: 50 });
  }
  return out;
}
test("sliders: every shown number moves less than 2x per step and never flips sign or hits zero", () => {
  let checked = 0;
  for (const mode of P.MODES) for (const base of stateGrid(mode)) for (const sl of P.modeSliders(mode, base)) {
    for (const v of steps(sl)) assert.equal(P.toSlider(sl, P.fromSlider(sl, P.toSlider(sl, v))), P.toSlider(sl, v));
    const vals = steps(sl).map((v) => P.shown(mode, { ...base, [P.SLIDER_KEY[sl]]: v }));
    for (let i = 1; i < vals.length; i++) for (const k of Object.keys(vals[i])) {
      const a = vals[i - 1][k], b = vals[i][k];
      if (a === null || b === null) continue;
      checked++;
      assert.ok(a !== 0 && b !== 0, `${mode} ${sl} ${k} is zero`);
      assert.ok(Math.sign(a) === Math.sign(b), `${mode} ${sl} ${k} flips sign: ${a} -> ${b}`);
      const r = Math.abs(b / a);
      assert.ok(r < 2 && r > 0.5, `${mode} ${JSON.stringify(base)} ${sl} step ${i} ${k}: ${a} -> ${b}`);
    }
  }
  assert.ok(checked > 20000, "swept " + checked);
});

test("deep links: modes and aliases", () => {
  assert.deepEqual(P.MODES, ["photon", "photoelectric", "hydrogen", "debroglie", "doubleslit", "sandbox"]);
  for (const m of P.MODES) assert.equal(P.parseQuery("?mode=" + m).mode, m);
  assert.equal(P.parseQuery("?mode=double-slit").mode, "doubleslit");
  assert.equal(P.parseQuery("?mode=balmer").mode, "hydrogen");
  assert.equal(P.parseQuery("?mode=de-broglie").mode, "debroglie");
  assert.equal(P.parseQuery("?mode=nope").mode, "photon");
  assert.equal(P.parseQuery("").mode, "photon");
});

test("formatting: scientific notation and lengths", () => {
  assert.equal(P.sci(6.0e14), "6.00 \u00d7 10\u00b9\u2074");
  assert.equal(P.sci(3.97e-19), "3.97 \u00d7 10\u207b\u00b9\u2079");
  assert.equal(P.sci(9.996e14), "1.00 \u00d7 10\u00b9\u2075");
  assert.equal(P.len(2.2e-3), "2.2 mm");
  assert.equal(P.len(5.36e-12), "5.36 pm");
});

test("page, gallery card, theme and module files follow the study pattern", () => {
  const html = read("study-quantum.html");
  assert.match(html, /data-study-back/);
  assert.match(html, /quantum\/quantum-ui\.js/);
  assert.doesNotMatch(html, /firebase|getAuth|signIn/);
  assert.match(html, /prefers-color-scheme: dark/);
  assert.match(html, /popboard\.quantum\.theme/);
  assert.match(html, /id="themeBtn"/);
  for (const m of P.MODES) assert.match(html, new RegExp(`data-show="${m}"`), m);
  const ui = read("quantum/quantum-ui.js");
  assert.match(ui, /forwardStudyQuery/);
  assert.match(ui, /study\.html"\s*\+\s*location\.search/);
  assert.match(ui, /prefers-reduced-motion/);
  assert.match(ui, /prefers-color-scheme: dark/);
  assert.match(ui, /localStorage\.setItem\(THEME_KEY/);
  const phys = read("quantum/quantum-physics.js");
  assert.doesNotMatch(phys, /\bdocument\.|\bwindow\.|getContext|localStorage|\bimport\b/);
  const gallery = read("study.html");
  assert.match(gallery, /id: "quantum"/);
  assert.match(gallery, /file: "study-quantum\.html"/);
  const css = read("quantum/quantum-theme.css");
  assert.match(css, /--qu-hit: 44px/);
  assert.match(css, /:root\[data-theme="dark"\]/);
  assert.match(css, /prefers-reduced-motion/);
  const files = ["study-quantum.html", ...readdirSync(new URL("quantum/", pub)).filter((n) => /\.(js|css)$/.test(n)).map((n) => "quantum/" + n)];
  for (const f of files) assert.doesNotMatch(read(f), /\u2014/, f);
  assert.doesNotMatch(readFileSync(new URL("../docs/quantum-science.md", import.meta.url), "utf8"), /\u2014/);
  assert.doesNotMatch(readFileSync(new URL("./quantum-physics.test.mjs", import.meta.url), "utf8"), /\u2014/);
  const shipped = readdirSync(new URL("quantum/assets/", pub));
  for (const n of shipped) assert.match(n, /\.webp$/);
  const render = read("quantum/quantum-render.js");
  const used = render.match(/IMAGES = \[([^\]]+)\]/)[1].match(/"([a-z-]+)"/g).map((n) => n.slice(1, -1));
  for (const n of used) assert.ok(shipped.includes(n + ".webp"), n);
  for (const n of shipped) assert.ok(used.includes(n.replace(/\.webp$/, "")), "unused asset " + n);
});

test("theme tokens keep text and lines readable in both themes (WCAG AA 4.5:1)", () => {
  const css = read("quantum/quantum-theme.css");
  const block = (sel) => css.slice(css.indexOf(sel), css.indexOf("}", css.indexOf(sel)));
  const light = block(":root {"), dark = block(':root[data-theme="dark"]');
  const tok = (b, name) => (b.match(new RegExp(`--qu-${name}:\\s*(#[0-9a-f]{6})`)) || light.match(new RegExp(`--qu-${name}:\\s*(#[0-9a-f]{6})`)))[1];
  const lum = (hex) => {
    const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  for (const b of [light, dark]) {
    for (const fg of ["ink", "ink-dim", "accent", "warn", "level"]) assert.ok(ratio(tok(b, fg), tok(b, "paper")) >= 4.5, fg);
    assert.ok(ratio(tok(b, "ink"), tok(b, "chip")) >= 4.5, "chip text");
    assert.ok(ratio(tok(b, "paper"), tok(b, "ink")) >= 4.5, "pressed chip text");
  }
  assert.ok(ratio(tok(light, "text"), tok(light, "chrome")) >= 4.5, "header text");
  assert.ok(ratio(tok(light, "text"), tok(light, "btn")) >= 4.5, "toolbar text");
  assert.ok(ratio("#1c1c1c", tok(light, "gold")) >= 4.5, "pressed toolbar");
});
