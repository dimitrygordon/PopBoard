import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import * as P from "../public/rocket-mission/rocket-physics.js";

const close = (a, b, tol) => Math.abs(a - b) <= tol;
const pub = new URL("../public/", import.meta.url);
const read = (n) => readFileSync(new URL(n, pub), "utf8");
const steps = (name) => Array.from({ length: P.SLIDERS[name].steps + 1 }, (_, i) => P.fromSlider(name, i));

test("constants match NASA fact sheets and SI", () => {
  assert.equal(P.G0, 9.80665);
  assert.equal(P.MU_EARTH, 3.986004418e14);
  assert.equal(P.R_EARTH, 6.371e6);
  assert.equal(P.AU, 1.495978707e11);
  assert.ok(close(P.MU_SUN, 1.32712e20, 1e15));
  assert.deepEqual([P.ENGINES.f1.ispSl, P.ENGINES.f1.ispVac], [263, 304]);
  assert.deepEqual([P.ENGINES.rs25.ispSl, P.ENGINES.rs25.ispVac], [366, 452]);
  assert.deepEqual([P.ENGINES.srb.ispSl, P.ENGINES.srb.ispVac], [242, 268]);
  assert.deepEqual([P.ENGINES.merlin.ispSl, P.ENGINES.merlin.ispVac], [282, 311]);
});

test("thrust F = mdot ve, Isp = ve/g0, thrust-to-weight", () => {
  assert.equal(P.thrust(100, 3000), 3e5);
  assert.ok(close(P.veFromIsp(452), 4432.6, 0.1));
  assert.ok(close(P.ispFromVe(P.veFromIsp(311)), 311, 1e-9));
  assert.ok(close(P.twr(P.thrust(1000, 3000), 100e3), 3e6 / (100e3 * 9.80665), 1e-12));
  // F-1: 6.77 MN at sea level and Isp 263 s means about 2.6 t of propellant a second
  const mdot = P.ENGINES.f1.thrustSl / P.veFromIsp(263);
  assert.ok(mdot > 2500 && mdot < 2700, String(mdot));
});

test("rocket equation: dv = ve ln(m0/mf)", () => {
  assert.ok(close(P.deltaV(3000, Math.E, 1), 3000, 1e-9));
  assert.ok(close(P.deltaV(1000, 2, 1) * 2, P.deltaV(1000, 4, 1), 1e-9), "squaring the mass ratio doubles dv");
  assert.ok(close(P.massRatioFor(P.deltaV(2500, 7, 1), 2500), 7, 1e-12));
  assert.ok(close(P.propFraction(10), 0.9, 1e-12));
  // OpenStax-style check: mass ratio ~ 23 for 9.4 km/s with Isp 304 s
  assert.ok(close(P.massRatioFor(9400, P.veFromIsp(304)), 23.4, 0.1));
});

test("staging: two stages always beat one when structure has mass, and tie when it has none", () => {
  for (const p of [0.005, 0.02, 0.1]) for (const e of [0.04, 0.1, 0.2]) {
    const S = P.staging(3000, p, e);
    assert.ok(S.gain > 0, `${p} ${e}`);
  }
  const S0 = P.staging(3000, 0.02, 0);
  assert.ok(close(S0.gain, 0, 1e-9));
  const S = P.staging(P.veFromIsp(304), 0.02, 0.1);
  assert.ok(close(S.dv1, 6370, 10) && close(S.dv2, 8834, 10));
});

test("orbits: ISS speed and period, escape speed, g at altitude", () => {
  const r = P.R_EARTH + 400e3;
  assert.ok(close(P.vCirc(r), 7670, 10));
  assert.ok(close(P.period(r) / 60, 92.41, 0.01), "92.4 min at 400 km");
  assert.ok(close(P.vEsc(P.R_EARTH), 11186, 5), "11.19 km/s at the surface");
  assert.ok(close(P.vEsc(r) / P.vCirc(r), Math.SQRT2, 1e-12));
  assert.ok(close(P.gAt(P.R_EARTH), 9.82, 0.01));
  const circ = P.horizontalShot(r, P.vCirc(r));
  assert.ok(circ.e < 1e-6 && circ.bound);
  const fall = P.orbitShot(400, 6.5);
  assert.equal(fall.kind, "falls");
  assert.equal(P.orbitShot(400, 11.1).kind, "escape");
  const ell = P.horizontalShot(r, 8500);
  assert.ok(close(ell.rp, r, 1) && ell.ra > r);
  const vp = 8500, va = vp * ell.rp / ell.ra;
  assert.ok(close(va * va / 2 - P.MU_EARTH / ell.ra, vp * vp / 2 - P.MU_EARTH / r, 1e-3), "energy is conserved");
});

test("Hohmann Earth to Mars: 2.94 + 2.65 km/s, 259 days, Mars 44 deg ahead, windows every 780 days", () => {
  const H = P.hohmannPlan("mars", 300);
  assert.ok(close(H.dv1, 2945, 10));
  assert.ok(close(H.dv2, 2650, 10));
  assert.ok(close(H.days, 259, 1));
  assert.ok(close(H.phaseDeg, 44.4, 0.3));
  assert.ok(close(H.synodicDays, 780, 1));
  assert.ok(close(H.dvDepart, 3590, 20), "from a 300 km parking orbit");
  const V = P.hohmannPlan("venus", 300);
  assert.ok(V.phaseDeg < 0, "Venus must be behind Earth");
  assert.ok(close(V.days, 146, 1));
  const end = P.transferPos(H.r1, H.r2, H.tTransfer);
  assert.ok(close(end.r, H.r2, 1e3) && close(end.swept, Math.PI, 1e-6));
});

test("launch: the preset reaches a near-circular orbit with the medium tip, and fails with a big tip", () => {
  const good = P.simulate(P.LAUNCH_PRESET, P.KICKS.medium).result;
  assert.equal(good.kind, "orbit");
  assert.ok(good.periKm > 150 && good.apoKm < 300, JSON.stringify(good));
  assert.ok(good.gravLoss > 1000 && good.gravLoss < 2500);
  assert.ok(good.vMax > 7700 && good.vMax < 8000);
  const big = P.simulate(P.LAUNCH_PRESET, P.KICKS.big).result;
  assert.notEqual(big.kind, "orbit");
  const pad = P.simulate({ ...P.LAUNCH_PRESET, engine: "single" }, 2).result;
  assert.equal(pad.kind, "pad", "thrust-to-weight under 1 stays on the pad");
  assert.ok(P.buildRocket(P.LAUNCH_PRESET).twr0 > 1.3);
});

const MODE_SLIDERS = { thrust: ["mdot", "ve", "mass"], equation: ["ratio"], staging: ["payloadFrac", "struct"], launch: ["altLaunch"], orbits: ["altOrbit", "speed"], hohmann: ["park"], sandbox: ["payload"] };
const KEY = { mdot: "mdot", ve: "ve", mass: "mass", ratio: "ratio", payloadFrac: "payloadFrac", struct: "struct", altLaunch: "alt", altOrbit: "alt", speed: "speed", park: "park", payload: "payload" };
function stateGrid(mode) {
  const pick = (n, k = 5) => Array.from({ length: k }, (_, i) => P.fromSlider(n, Math.round((i * P.SLIDERS[n].steps) / (k - 1))));
  if (mode === "thrust") return pick("mdot").flatMap((mdot) => pick("ve").flatMap((ve) => pick("mass").map((mass) => ({ mdot, ve, mass }))));
  if (mode === "equation") return P.EQ_ENGINES.map((engine) => ({ engine, ratio: 5 }));
  if (mode === "staging") return P.EQ_ENGINES.flatMap((engine) => pick("payloadFrac").flatMap((payloadFrac) => pick("struct").map((struct) => ({ engine, payloadFrac, struct }))));
  if (mode === "launch") return [{ alt: 400 }];
  if (mode === "orbits") return pick("altOrbit", 10).flatMap((alt) => pick("speed", 31).map((speed) => ({ alt, speed })));
  if (mode === "hohmann") return P.TARGETS.map((target) => ({ target, park: 300 }));
  const out = [];
  for (const top of Object.keys(P.PARTS.top)) for (const tank of Object.keys(P.PARTS.tank)) for (const engine of Object.keys(P.PARTS.engine))
    for (const upper of [false, true]) for (const boosters of [0, 2]) for (const fins of [false, true]) out.push({ top, tank, engine, upper, boosters, fins, payload: 1 });
  return out;
}
test("presets: RS-25 snaps to 3590 m/s (Isp 366 s, 1.86 MN), F-1 about 6.7 MN, launch default 400 km gives 92.4 min", () => {
  const sn = (k, v) => P.fromSlider(k, P.toSlider(k, v));
  const ve = sn("ve", P.veFromIsp(P.ENGINES.rs25.ispSl));
  assert.equal(ve, 3590);
  assert.equal(Math.round(P.ispFromVe(ve)), 366);
  assert.ok(close(ve * sn("mdot", P.ENGINES.rs25.thrustSl / ve) / 1e6, 1.86, 0.006));
  const vf = sn("ve", P.veFromIsp(P.ENGINES.f1.ispSl));
  assert.ok(close(vf * sn("mdot", P.ENGINES.f1.thrustSl / vf) / 1e6, 6.7, 0.05));
  assert.equal(sn("altLaunch", 400), 400);
  assert.equal(P.shown("launch", { alt: 400, kick: "medium" }).periodMin.toFixed(1), "92.4");
});

test("sliders: every shown number moves less than 2x per step and never flips sign or hits zero", () => {
  let checked = 0;
  for (const mode of P.MODES) for (const base of stateGrid(mode)) for (const sl of MODE_SLIDERS[mode]) {
    for (const v of steps(sl)) assert.equal(P.fromSlider(sl, P.toSlider(sl, v)), v);
    const vals = steps(sl).map((v) => P.shown(mode, { ...base, [KEY[sl]]: v }));
    for (let i = 1; i < vals.length; i++) for (const k of Object.keys(vals[i])) {
      const a = vals[i - 1][k], b = vals[i][k];
      if (a === null || b === null || typeof a !== "number") continue;
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
  assert.deepEqual(P.MODES, ["thrust", "equation", "staging", "launch", "orbits", "hohmann", "sandbox"]);
  for (const m of P.MODES) assert.equal(P.parseQuery("?mode=" + m).mode, m);
  assert.equal(P.parseQuery("?mode=tsiolkovsky").mode, "equation");
  assert.equal(P.parseQuery("?mode=mars").mode, "hohmann");
  assert.equal(P.parseQuery("?mode=escape").mode, "orbits");
  assert.equal(P.parseQuery("?mode=nope").mode, "thrust");
  assert.equal(P.parseQuery("").mode, "thrust");
});

test("page, gallery card, theme and module files follow the study pattern", () => {
  const html = read("study-rocket-mission.html");
  assert.match(html, /data-study-back/);
  assert.match(html, /rocket-mission\/rocket-ui\.js/);
  assert.doesNotMatch(html, /firebase|getAuth|signIn/);
  assert.match(html, /prefers-color-scheme: dark/);
  assert.match(html, /popboard\.rocket\.theme/);
  assert.match(html, /id="themeBtn"/);
  for (const m of P.MODES) assert.match(html, new RegExp(`data-show="${m}"`), m);
  const ui = read("rocket-mission/rocket-ui.js");
  assert.match(ui, /forwardStudyQuery/);
  assert.match(ui, /study\.html"\s*\+\s*location\.search/);
  assert.match(ui, /prefers-reduced-motion/);
  assert.match(ui, /prefers-color-scheme: dark/);
  assert.match(ui, /localStorage\.setItem\(THEME_KEY/);
  const phys = read("rocket-mission/rocket-physics.js");
  assert.doesNotMatch(phys, /\bdocument\.|\bwindow\.|getContext|localStorage|\bimport\b/);
  const gallery = read("study.html");
  assert.match(gallery, /id: "rocket-mission"/);
  assert.match(gallery, /file: "study-rocket-mission\.html"/);
  const css = read("rocket-mission/rocket-theme.css");
  assert.match(css, /--rm-hit: 44px/);
  assert.match(css, /:root\[data-theme="dark"\]/);
  assert.match(css, /prefers-reduced-motion/);
  const files = ["study-rocket-mission.html", ...readdirSync(new URL("rocket-mission/", pub)).filter((n) => /\.(js|css)$/.test(n)).map((n) => "rocket-mission/" + n)];
  for (const f of files) assert.doesNotMatch(read(f), /\u2014/, f);
  assert.doesNotMatch(readFileSync(new URL("../docs/rocket-mission-science.md", import.meta.url), "utf8"), /\u2014/);
  assert.doesNotMatch(readFileSync(new URL("./rocket-physics.test.mjs", import.meta.url), "utf8"), /\u2014/);
  const shipped = readdirSync(new URL("rocket-mission/assets/", pub));
  for (const n of shipped) assert.match(n, /\.webp$/);
  const render = read("rocket-mission/rocket-render.js");
  const used = render.match(/IMAGES = \[([^\]]+)\]/)[1].match(/"([a-z-]+)"/g).map((n) => n.slice(1, -1));
  for (const n of used) assert.ok(shipped.includes(n + ".webp"), n);
  for (const n of shipped) assert.ok(used.includes(n.replace(/\.webp$/, "")), "unused asset " + n);
});

test("theme tokens keep text and lines readable in both themes (WCAG AA 4.5:1)", () => {
  const css = read("rocket-mission/rocket-theme.css");
  const block = (sel) => css.slice(css.indexOf(sel), css.indexOf("}", css.indexOf(sel)));
  const light = block(":root {"), dark = block(':root[data-theme="dark"]');
  const tok = (b, name) => (b.match(new RegExp(`--rm-${name}:\\s*(#[0-9a-f]{6})`)) || light.match(new RegExp(`--rm-${name}:\\s*(#[0-9a-f]{6})`)))[1];
  const lum = (hex) => {
    const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  for (const b of [light, dark]) {
    for (const fg of ["ink", "ink-dim"]) assert.ok(ratio(tok(b, fg), tok(b, "paper")) >= 4.5, fg + " on paper");
    for (const fg of ["ink", "ink-dim", "thrust", "weight", "path"]) assert.ok(ratio(tok(b, fg), tok(b, "sky")) >= 4.5, fg + " on sky");
    assert.ok(ratio(tok(b, "ink"), tok(b, "chip")) >= 4.5, "chip text");
    assert.ok(ratio(tok(b, "paper"), tok(b, "ink")) >= 4.5, "pressed chip text");
  }
  assert.ok(ratio(tok(light, "text"), tok(light, "chrome")) >= 4.5, "header text");
  assert.ok(ratio(tok(light, "text"), tok(light, "btn")) >= 4.5, "toolbar text");
  assert.ok(ratio("#1c1c1c", tok(light, "gold")) >= 4.5, "pressed toolbar");
});
