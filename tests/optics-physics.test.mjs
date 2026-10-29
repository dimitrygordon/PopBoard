import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import * as P from "../public/optics/optics-physics.js";

const close = (a, b, tol = 1e-9) => Math.abs(a - b) <= tol;
const pub = new URL("../public/", import.meta.url);
const read = (n) => readFileSync(new URL(n, pub), "utf8");
const steps = (name) => Array.from({ length: P.SLIDERS[name].steps + 1 }, (_, i) => P.fromSlider(name, i));

test("indices of refraction match OpenStax Tables 25.1 and 25.2", () => {
  assert.equal(P.N_AIR, 1.000293);
  assert.equal(P.MATERIALS.water.n, 1.333);
  assert.equal(P.MATERIALS.glass.n, 1.52);
  assert.equal(P.MATERIALS.flint.n, 1.66);
  assert.equal(P.MATERIALS.diamond.n, 2.419);
  assert.deepEqual([...P.MATERIALS.glass.bands], [1.512, 1.514, 1.518, 1.519, 1.524, 1.530]);
  assert.deepEqual([...P.MATERIALS.diamond.bands], [2.410, 2.415, 2.417, 2.426, 2.444, 2.458]);
  assert.deepEqual(P.BANDS.map((b) => b.nm), [660, 610, 580, 550, 470, 410]);
  for (const id of ["water", "glass", "flint", "diamond"]) {
    const b = P.MATERIALS[id].bands;
    for (let i = 1; i < b.length; i++) assert.ok(b[i] >= b[i - 1], id + " n grows toward violet");
  }
  assert.ok(close(P.speedIn(1.923), 1.559e8, 0.001e8), "zircon example, OpenStax 25.3");
});

test("Snell's law: OpenStax worked examples and reversibility", () => {
  assert.ok(close(P.snell(1.0, 2.419, 30), 11.93, 0.01), "air to diamond at 30 deg gives 11.9 deg");
  assert.ok(close(1 * Math.sin(P.rad(30)) / Math.sin(P.rad(22)), 1.33, 0.005), "30 deg to 22 deg is n = 1.33");
  for (const [a, b] of [["air", "water"], ["water", "glass"], ["glass", "diamond"]]) for (const t of [5, 30, 60]) {
    const n1 = P.indexOf(a), n2 = P.indexOf(b), t2 = P.snell(n1, n2, t);
    assert.ok(close(n1 * Math.sin(P.rad(t)), n2 * Math.sin(P.rad(t2)), 1e-12));
    assert.ok(close(P.snell(n2, n1, t2), t, 1e-9), "paths are reversible");
    assert.ok(t2 < t, "into a larger n the ray bends toward the normal");
  }
  assert.equal(P.snell(1.52, 1.0, 50), null, "past the critical angle there is no refracted ray");
});

test("critical angles: water 48.6, crown glass 41.2, diamond 24.4 degrees (into air)", () => {
  assert.ok(close(P.criticalAngle(1.333, P.N_AIR), 48.6, 0.05));
  assert.ok(close(P.criticalAngle(1.52, P.N_AIR), 41.2, 0.05));
  assert.ok(close(P.criticalAngle(2.419, P.N_AIR), 24.4, 0.05));
  assert.equal(P.criticalAngle(1, 1.5), null);
  const tc = P.criticalAngle(1.52, P.N_AIR);
  assert.ok(P.snell(1.52, P.N_AIR, tc - 0.01) !== null && P.snell(1.52, P.N_AIR, tc + 0.01) === null);
});

test("Fresnel reflectance: 4% for glass at normal incidence, 100% at TIR, zero p at Brewster", () => {
  assert.ok(close(P.fresnel(1, 1.5, 0), 0.04, 1e-12));
  assert.ok(close(P.fresnel(1, 1.333, 0), ((0.333) / (2.333)) ** 2, 1e-12));
  assert.equal(P.fresnel(1.52, 1, 60), 1);
  assert.ok(P.fresnel(1, 1.5, 85) > 0.5, "grazing light mostly reflects");
  // at Brewster's angle only the s part reflects: R = Rs / 2
  const b = P.deg(Math.atan(1.5)), ci = Math.cos(P.rad(b)), ct = Math.cos(P.rad(P.snell(1, 1.5, b)));
  const rs = ((ci - 1.5 * ct) / (ci + 1.5 * ct)) ** 2;
  assert.ok(close(P.fresnel(1, 1.5, b), rs / 2, 1e-12));
});

test("thin lens and mirror equation: 1/f = 1/do + 1/di, m = -di/do", () => {
  const cases = [[10, 30, 15, -0.5], [10, 20, 20, -1], [10, 15, 30, -2], [10, 5, -10, 2], [-10, 30, -7.5, 0.25], [-10, 10, -5, 0.5]];
  for (const [f, d, di, m] of cases) {
    assert.ok(close(P.imageDistance(f, d), di, 1e-9), `f ${f} do ${d}`);
    assert.ok(close(P.magnification(d, di), m, 1e-12));
    assert.ok(close(1 / f, 1 / d + 1 / P.imageDistance(f, d), 1e-12));
  }
  assert.equal(P.imageDistance(10, 10), Infinity, "object at F: image at infinity");
  assert.equal(P.mirrorFocal(24), 12);
  const im = P.imageInfo(-10, 30, 6);
  assert.ok(!im.real && im.upright && im.size === "smaller", "a diverging lens always makes a smaller upright virtual image");
  const cv = P.imageInfo(10, 5, 6);
  assert.ok(!cv.real && cv.upright && cv.size === "larger", "inside F a converging lens magnifies");
  const r = P.imageInfo(10, 30, 6);
  assert.ok(r.real && !r.upright && r.size === "smaller");
});

test("principal rays all pass through the image point", () => {
  for (const f of [8, 15, -8, -15]) for (const d of [5, 12, 30, 60]) {
    if (Math.abs(f - d) < 1e-9) continue;
    const di = P.imageDistance(f, d), hi = 6 * P.magnification(d, di);
    const rays = P.principalRays(f, d, 6);
    assert.equal(rays.length, 3);
    for (const r of rays) assert.ok(close(r.y + r.t2 * di, hi, 1e-9), `f ${f} do ${d}`);
    assert.ok(close(rays[0].t2, -6 / f, 1e-12), "parallel ray heads for F");
    assert.ok(close(rays[2].t2, 0, 1e-12), "the F ray leaves parallel");
  }
});

test("ray tracer: ideal lens focuses parallel rays at F, mirror obeys the law of reflection", () => {
  const f = 12, els = [{ type: "lens", c: [0, 0], ang: 0, half: 8, f }];
  const rays = [-5, -2, 2, 5].map((y) => ({ p: [-20, y], d: [1, 0], band: null }));
  const segs = P.trace(els, rays, [-30, -30, 30, 30]);
  for (const s of segs.filter((g) => g.a[0] === 0)) {
    const t = (f - s.a[0]) / (s.b[0] - s.a[0]);
    assert.ok(close(s.a[1] + t * (s.b[1] - s.a[1]), 0, 1e-9));
  }
  for (const th of [5, 30, 60, 85]) {
    const sc = P.reflectionScene(th), out = P.trace(sc.els, sc.rays, sc.bounds);
    const r = out[1], ang = P.deg(Math.atan2(r.b[0] - r.a[0], r.b[1] - r.a[1]));
    assert.ok(close(ang, th, 1e-6), "reflected at the incidence angle");
  }
  // a concave mirror sends parallel rays back through F
  const m = [{ type: "mirror", c: [0, 0], ang: Math.PI, half: 8, f: 10 }];
  for (const s of P.trace(m, [{ p: [-20, 4], d: [1, 0] }], [-30, -30, 30, 30]).slice(1)) {
    const t = (-10 - s.a[0]) / (s.b[0] - s.a[0]);
    assert.ok(close(s.a[1] + t * (s.b[1] - s.a[1]), 0, 1e-9));
  }
});

test("ray tracer agrees with Snell, TIR and the prism formula", () => {
  for (const th of [10, 40, 70]) {
    const sc = P.refractionScene("air", "glass", th), segs = P.trace(sc.els, sc.rays, sc.bounds);
    const t = segs.find((s) => Math.abs(s.a[1]) < 1e-9 && s.b[1] < 0 && s.w < 1);
    assert.ok(close(P.deg(Math.atan2(t.b[0] - t.a[0], -(t.b[1] - t.a[1]))), P.snell(P.N_AIR, 1.52, th), 1e-6));
  }
  const sc = P.tirScene("glass", 50), segs = P.trace(sc.els, sc.rays, sc.bounds);
  assert.ok(!segs.some((s) => Math.abs(s.a[1]) < 1e-9 && s.b[1] > 1e-6), "past the critical angle no light gets out of the flat face");
  for (const mat of ["glass", "water"]) for (const i of [40, 50, 60]) for (const band of [0, 5]) {
    const n = P.indexOf(mat, band), p = P.prismPath(n, 60, i);
    const s = P.prismScene(mat, i, true), out = P.trace(s.els, [s.rays[band]], s.bounds, { minW: 2 });
    const last = out[out.length - 1], d = [last.b[0] - last.a[0], last.b[1] - last.a[1]];
    const dev = P.deg(Math.atan2(s.rays[0].d[1], s.rays[0].d[0]) - Math.atan2(d[1], d[0]));
    assert.ok(close(dev, p.dev, 1e-6), `${mat} ${i} ${band}`);
  }
  assert.ok(close(P.minDeviation(1.5 * P.N_AIR, 60), 37.18, 0.01));
  for (const i of [20, 50, 85]) assert.equal(P.prismPath(P.indexOf("diamond", 2), 60, i).dev, null, "a 60 degree diamond prism traps the light");
});

// every shown number, for every slider of every mode, with the other settings at several values
function stateGrid(mode) {
  const out = [];
  if (mode === "reflection") out.push({ angle: 30 });
  if (mode === "refraction") for (const top of P.MEDIA_IDS) for (const bottom of P.MEDIA_IDS) out.push({ top, bottom, angle: 30 });
  if (mode === "tir") for (const mat of P.SOLID_IDS) out.push({ mat, angle: 30 });
  if (mode === "lenses" || mode === "mirrors") {
    const kinds = mode === "lenses" ? ["converging", "diverging"] : ["concave", "convex"];
    for (const kind of kinds) for (const dObj of steps("dObj").filter((_, i) => i % 6 === 0)) for (const f of steps("f").filter((_, i) => i % 4 === 0)) out.push({ kind, dObj, f });
  }
  if (mode === "dispersion") for (const mat of P.PRISM_IDS) out.push({ mat, angle: 50 });
  if (mode === "sandbox") out.push({ f: 12 });
  return out;
}
const MODE_SLIDERS = { reflection: ["angle"], refraction: ["angle"], tir: ["angle"], lenses: ["dObj", "f"], mirrors: ["dObj", "f"], dispersion: ["prism"], sandbox: ["f"] };
const KEY = { angle: "angle", prism: "angle", dObj: "dObj", f: "f" };
test("sliders: every shown number moves less than 2x per step and never flips sign or hits zero", () => {
  let checked = 0;
  for (const mode of P.MODES) for (const base of stateGrid(mode)) for (const sl of MODE_SLIDERS[mode]) {
    const vals = steps(sl).map((v) => P.shown(mode, { ...base, [KEY[sl]]: v }));
    for (const v of steps(sl)) assert.equal(P.fromSlider(sl, P.toSlider(sl, v)), v);
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
  assert.ok(checked > 100000, "swept " + checked);
});

test("deep links: modes and aliases", () => {
  assert.deepEqual(P.MODES, ["reflection", "refraction", "tir", "lenses", "mirrors", "dispersion", "sandbox"]);
  for (const m of P.MODES) assert.equal(P.parseQuery("?mode=" + m).mode, m);
  assert.equal(P.parseQuery("?mode=snell").mode, "refraction");
  assert.equal(P.parseQuery("?mode=prism").mode, "dispersion");
  assert.deepEqual(P.parseQuery("?mode=diverging"), { mode: "lenses", kind: "diverging" });
  assert.deepEqual(P.parseQuery("?mode=convex"), { mode: "mirrors", kind: "convex" });
  assert.equal(P.parseQuery("?mode=nope").mode, "reflection");
  assert.equal(P.parseQuery("").mode, "reflection");
});

test("page, gallery card, theme and module files follow the study pattern", () => {
  const html = read("study-optics.html");
  assert.match(html, /data-study-back/);
  assert.match(html, /optics\/optics-ui\.js/);
  assert.doesNotMatch(html, /firebase|getAuth|signIn/);
  assert.match(html, /prefers-color-scheme: dark/);
  assert.match(html, /popboard\.optics\.theme/);
  assert.match(html, /id="themeBtn"/);
  for (const m of P.MODES) assert.match(html, new RegExp(`data-show="${m}"`), m);
  const ui = read("optics/optics-ui.js");
  assert.match(ui, /forwardStudyQuery/);
  assert.match(ui, /study\.html"\s*\+\s*location\.search/);
  assert.match(ui, /prefers-reduced-motion/);
  assert.match(ui, /prefers-color-scheme: dark/);
  assert.match(ui, /localStorage\.setItem\(THEME_KEY/);
  const phys = read("optics/optics-physics.js");
  assert.doesNotMatch(phys, /\bdocument\.|\bwindow\.|getContext|localStorage|\bimport\b/);
  const gallery = read("study.html");
  assert.match(gallery, /id: "optics"/);
  assert.match(gallery, /file: "study-optics\.html"/);
  const css = read("optics/optics-theme.css");
  assert.match(css, /--op-hit: 44px/);
  assert.match(css, /:root\[data-theme="dark"\]/);
  assert.match(css, /prefers-reduced-motion/);
  const files = ["study-optics.html", ...readdirSync(new URL("optics/", pub)).filter((n) => /\.(js|css)$/.test(n)).map((n) => "optics/" + n)];
  for (const f of files) assert.doesNotMatch(read(f), /\u2014/, f);
  assert.doesNotMatch(readFileSync(new URL("../docs/optics-science.md", import.meta.url), "utf8"), /\u2014/);
  assert.doesNotMatch(readFileSync(new URL("./optics-physics.test.mjs", import.meta.url), "utf8"), /\u2014/);
  const shipped = readdirSync(new URL("optics/assets/", pub));
  for (const n of shipped) assert.match(n, /\.webp$/);
  const render = read("optics/optics-render.js");
  const used = render.match(/IMAGES = \[([^\]]+)\]/)[1].match(/"([a-z-]+)"/g).map((n) => n.slice(1, -1));
  for (const n of used) assert.ok(shipped.includes(n + ".webp"), n);
  for (const n of shipped) assert.ok(used.includes(n.replace(/\.webp$/, "")), "unused asset " + n);
});

test("theme tokens keep text and lines readable in both themes (WCAG AA 4.5:1)", () => {
  const css = read("optics/optics-theme.css");
  const block = (sel) => css.slice(css.indexOf(sel), css.indexOf("}", css.indexOf(sel)));
  const light = block(":root {"), dark = block(':root[data-theme="dark"]');
  const tok = (b, name) => (b.match(new RegExp(`--op-${name}:\\s*(#[0-9a-f]{6})`)) || light.match(new RegExp(`--op-${name}:\\s*(#[0-9a-f]{6})`)))[1];
  const lum = (hex) => {
    const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  for (const b of [light, dark]) {
    for (const fg of ["ink", "ink-dim", "ray", "accent", "normal"]) assert.ok(ratio(tok(b, fg), tok(b, "paper")) >= 4.5, fg);
    assert.ok(ratio(tok(b, "ink"), tok(b, "chip")) >= 4.5, "chip text");
    assert.ok(ratio(tok(b, "paper"), tok(b, "ink")) >= 4.5, "pressed chip text");
  }
  assert.ok(ratio(tok(light, "text"), tok(light, "chrome")) >= 4.5, "header text");
  assert.ok(ratio(tok(light, "text"), tok(light, "btn")) >= 4.5, "toolbar text");
  assert.ok(ratio("#1c1c1c", tok(light, "gold")) >= 4.5, "pressed toolbar");
});
