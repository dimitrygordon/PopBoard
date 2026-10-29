import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import * as P from "../public/projectile/projectile-physics.js";

const close = (a, b, rel = 1e-9) => Math.abs(a - b) <= rel * Math.abs(b);
const pub = new URL("../public/", import.meta.url);
const read = (n) => readFileSync(new URL(n, pub), "utf8");
const G = P.G_STANDARD;

test("constants and world gravity match the sources", () => {
  assert.equal(G, 9.80665);
  assert.equal(P.RHO_SEA_LEVEL, 1.225);
  assert.equal(P.CD_SPHERE, 0.47);
  const nasa = { moon: 1.6, mars: 3.7, mercury: 3.7, venus: 8.9, jupiter: 23.1, saturn: 9.0, uranus: 8.7, neptune: 11.0, pluto: 0.7 };
  for (const [k, g] of Object.entries(nasa)) assert.equal(P.WORLDS[k].g, g, k);
  assert.equal(P.WORLDS.earth.g, G);
  // 6 lb iron shot is about 8.7 cm across
  assert.ok(Math.abs(P.BALLS.cannonball.d - 0.0871) < 0.0005);
});

test("components: vx = v cos theta, vy = v sin theta", () => {
  const c = P.components(20, 30);
  assert.ok(close(c.vx, 20 * Math.sqrt(3) / 2, 1e-12));
  assert.ok(close(c.vy, 10, 1e-12));
  assert.ok(close(Math.hypot(c.vx, c.vy), 20, 1e-12));
});

test("level ground: range, peak and flight time formulas", () => {
  const r = P.ideal({ v: 20, angle: 45, h: 0, g: G });
  assert.ok(close(r.range, 400 / G, 1e-12));
  assert.ok(close(r.range, P.levelRange(20, 45, G), 1e-12));
  assert.ok(close(r.maxHeight, 100 / G, 1e-12));
  assert.ok(close(r.tFlight, 2 * 20 * Math.SQRT1_2 / G, 1e-12));
  assert.ok(close(r.tApex, r.tFlight / 2, 1e-12), "symmetric flight");
  assert.ok(close(r.vLand, 20, 1e-9), "lands at launch speed");
  assert.ok(close(r.landAngle, 45, 1e-9));
  assert.ok(Math.abs(r.range - 40.77) < 0.01);
});

test("complementary angles land at the same spot and 45 degrees is best on level ground", () => {
  for (const a of [15, 30, 40]) assert.ok(close(P.ideal({ v: 25, angle: a }).range, P.ideal({ v: 25, angle: 90 - a }).range, 1e-9));
  assert.equal(P.bestAngle({ v: 25, h: 0, g: G, drag: false }).angle, 45);
});

test("launching from a height: longer flight, best angle below 45 degrees", () => {
  const r = P.ideal({ v: 20, angle: 30, h: 20, g: G });
  const end = P.idealAt({ v: 20, angle: 30, h: 20, g: G }, r.tFlight);
  assert.ok(Math.abs(end.y) < 1e-9, "y = 0 at T");
  assert.ok(close(r.maxHeight, 20 + 100 / (2 * G), 1e-12));
  assert.ok(P.bestAngle({ v: 20, h: 20, g: G, drag: false }).angle < 45);
  // energy: landing speed^2 = v^2 + 2 g h
  assert.ok(close(r.vLand ** 2, 400 + 2 * G * 20, 1e-9));
});

test("range, peak and time all scale as 1/g across worlds", () => {
  const e = P.ideal({ v: 20, angle: 45, g: G }), m = P.ideal({ v: 20, angle: 45, g: P.WORLDS.moon.g });
  assert.ok(close(m.range / e.range, G / 1.6, 1e-12));
  assert.ok(close(m.tFlight / e.tFlight, G / 1.6, 1e-12));
  assert.ok(close(m.maxHeight / e.maxHeight, G / 1.6, 1e-12));
  assert.ok(Math.abs(e.range / P.ideal({ v: 20, angle: 45, g: 23.1 }).range - 23.1 / G) < 1e-12);
});

test("integrator with no drag matches the closed form", () => {
  const p = { v: 30, angle: 35, h: 12, g: G, drag: false };
  const s = P.simulate(p), r = P.ideal(p);
  assert.ok(close(s.range, r.range, 1e-4));
  assert.ok(close(s.tFlight, r.tFlight, 1e-4));
  assert.ok(close(s.maxHeight, r.maxHeight, 1e-4));
});

test("air drag: shorter, lower, steeper landing, best angle below 45, terminal speed", () => {
  const b = P.BALLS.basketball;
  const p = { v: 20, angle: 45, h: 0, g: G, drag: true, m: b.m, d: b.d };
  const s = P.simulate(p), r = P.ideal(p);
  assert.ok(s.range < r.range && s.maxHeight < r.maxHeight);
  assert.ok(s.landAngle > 45, "comes down steeper than it went up");
  assert.ok(s.tFlight - s.tApex > s.tApex, "falls for longer than it rises");
  assert.ok(P.bestAngle(p).angle < 45);
  const k = P.dragK(b);
  assert.ok(close(k, 0.5 * 1.225 * 0.47 * Math.PI * b.d ** 2 / 4 / b.m, 1e-12));
  assert.ok(close(P.terminalSpeed(b), Math.sqrt(G / k), 1e-12));
  assert.ok(P.terminalSpeed(b) > 18 && P.terminalSpeed(b) < 25);
  // the heavy cannonball barely notices
  const c = P.BALLS.cannonball, sc = P.simulate({ ...p, m: c.m, d: c.d });
  assert.ok(sc.range / r.range > 0.97);
});

test("target scoring: rings, misses and the cart", () => {
  const p = { v: 20, angle: 45, h: 0, g: G };
  const path = P.idealPath(p, 400);
  const yAt20 = P.idealAt(p, 20 / P.components(20, 45).vx).y;
  assert.equal(P.scoreBullseye(path, 20, yAt20).points, 10);
  assert.equal(P.scoreBullseye(path, 20, yAt20 + 0.9 * P.BULLSEYE_R).points, 1);
  assert.equal(P.scoreBullseye(path, 20, yAt20 + 1.1 * P.BULLSEYE_R).points, 0);
  assert.equal(P.scoreBullseye(path, 60, 2).y, null);
  const R = P.ideal(p).range;
  assert.ok(P.scoreCart(R, R + 1).caught && !P.scoreCart(R, R + 2).caught);
  for (const u of [0, 0.3, 0.999]) { const t = P.newTarget(u, "bullseye"); assert.ok(t.x >= 12 && t.x <= 60 && t.y >= 1.5 && t.y <= 7.5); }
});

test("sliders: no shown value jumps by 2x or more between adjacent steps", () => {
  const base = { v: 20, angle: 45, h: 10, g: G, drag: true, m: 0.62, d: 0.239, cd: 0.47, rho: 1.225 };
  const key = { angle: "angle", speed: "v", height: "h", g: "g", cd: "cd", rho: "rho", mass: "m", diameter: "d" };
  for (const name of Object.keys(P.SLIDERS)) {
    const n = P.sliderSteps(name);
    let prev = null;
    for (let i = 0; i <= n; i++) {
      const val = P.fromSlider(name, i);
      assert.equal(P.toSlider(name, val), i, `${name} round trip ${i}`);
      const p = { ...base, [key[name]]: val };
      const r = P.ideal(p), s = name === "angle" || name === "speed" || name === "height" || name === "g" ? null : P.simulate(p);
      const shown = [val, r.vx, r.vy, r.range, r.maxHeight, r.tFlight, r.tApex, r.vLand, ...(s ? [s.range, s.maxHeight, s.tFlight] : [])];
      if (prev) shown.forEach((x, j) => { const ratio = Math.max(x / prev[j], prev[j] / x); assert.ok(ratio < 2, `${name} step ${i} value ${j}: ratio ${ratio}`); });
      prev = shown;
    }
  }
});

test("deep links parse modes, worlds and balls with aliases and fallbacks", () => {
  assert.deepEqual(P.parseQuery("?mode=sandbox"), { mode: "sandbox", world: null, ball: null });
  assert.equal(P.parseQuery("?mode=free").mode, "sandbox");
  assert.equal(P.parseQuery("?mode=bullseye").mode, "target");
  assert.equal(P.parseQuery("?mode=air-drag").mode, "drag");
  assert.equal(P.parseQuery("?mode=Gravity").mode, "planets");
  assert.equal(P.parseQuery("?mode=bogus").mode, "launch");
  assert.equal(P.parseQuery("").mode, "launch");
  assert.equal(P.parseQuery("?planet=moon&ball=soccer").world, "moon");
  assert.equal(P.parseQuery("?ball=soccer").ball, "soccer");
  assert.equal(P.parseQuery("?world=vulcan").world, null);
  for (const m of P.MODES) assert.equal(P.parseQuery("?mode=" + m).mode, m);
});

test("formatting", () => {
  assert.equal(P.fmtM(40.788), "40.8 m");
  assert.equal(P.fmtG(9.80665), "9.81 m/s\u00b2");
  assert.equal(P.fmtKg(0.43), "430 g");
  assert.equal(P.fmtD(0.239), "23.9 cm");
  assert.equal(P.fmtNum(1234.5), "1235");
});

test("page, gallery card, theme and module files follow the study pattern", () => {
  const html = read("study-projectile.html");
  assert.match(html, /data-study-back/);
  assert.match(html, /projectile\/projectile-ui\.js/);
  assert.doesNotMatch(html, /firebase|getAuth|signIn/);
  assert.match(html, /prefers-color-scheme: dark/);
  assert.match(html, /popboard\.projectile\.theme/);
  assert.match(html, /id="themeBtn"/);
  for (const m of P.MODES) assert.match(html, new RegExp(`data-show="${m}"`), m);
  const ui = read("projectile/projectile-ui.js");
  assert.match(ui, /forwardStudyQuery/);
  assert.match(ui, /study\.html"\s*\+\s*location\.search/);
  assert.match(ui, /prefers-reduced-motion/);
  assert.match(ui, /prefers-color-scheme: dark/);
  assert.match(ui, /localStorage\.setItem\(THEME_KEY/);
  const phys = read("projectile/projectile-physics.js");
  assert.doesNotMatch(phys, /\bdocument\.|\bwindow\.|getContext|localStorage/);
  const gallery = read("study.html");
  assert.match(gallery, /id: "projectile"/);
  assert.match(gallery, /file: "study-projectile\.html"/);
  const css = read("projectile/projectile-theme.css");
  assert.match(css, /--pj-hit: 44px/);
  assert.match(css, /:root\[data-theme="dark"\]/);
  assert.match(css, /prefers-reduced-motion/);
  const files = ["study-projectile.html", ...readdirSync(new URL("projectile/", pub)).filter((n) => /\.(js|css)$/.test(n)).map((n) => "projectile/" + n)];
  for (const f of files) assert.doesNotMatch(read(f), /\u2014/, f);
  assert.doesNotMatch(readFileSync(new URL("../docs/projectile-science.md", import.meta.url), "utf8"), /\u2014/);
  assert.doesNotMatch(readFileSync(new URL("./projectile-physics.test.mjs", import.meta.url), "utf8"), /\u2014/);
  const shipped = readdirSync(new URL("projectile/assets/", pub));
  for (const n of shipped) assert.match(n, /\.webp$/);
  const used = ui.match(/loadImages\(\[([^\]]+)\]/)[1].match(/"([a-z-]+)"/g).map((n) => n.slice(1, -1));
  assert.ok(used.length >= 10);
  for (const n of used) assert.ok(shipped.includes(n + ".webp"), n);
  for (const n of shipped) assert.ok(used.includes(n.replace(/\.webp$/, "")), "unused asset " + n);
});

test("theme tokens keep text readable (WCAG AA 4.5:1) in both themes", () => {
  const css = read("projectile/projectile-theme.css");
  const block = (sel) => { const i = css.indexOf(sel); return css.slice(i, css.indexOf("}", i)); };
  const light = block(":root {"), dark = block(':root[data-theme="dark"]');
  const tok = (b, name) => (b.match(new RegExp(`--pj-${name}:\\s*(#[0-9a-f]{6})`)) || light.match(new RegExp(`--pj-${name}:\\s*(#[0-9a-f]{6})`)))[1];
  const lum = (hex) => {
    const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  for (const b of [light, dark]) {
    for (const fg of ["ink", "ink-dim"]) assert.ok(ratio(tok(b, fg), tok(b, "paper")) >= 4.5, fg + " on paper");
    assert.ok(ratio(tok(b, "ink"), tok(b, "chip")) >= 4.5, "chip text");
    // canvas labels are drawn on chips in these colors
    for (const fg of ["ink", "path", "drag", "vx", "vy", "w0", "w1", "w2", "w3", "w4"]) assert.ok(ratio(tok(b, fg), tok(b, "chip")) >= 4.5, fg + " on chip");
    // dim text and lines also sit straight on the sky
    for (const fg of ["ink", "ink-dim", "path"]) assert.ok(ratio(tok(b, fg), tok(b, "sky")) >= 4.5, fg + " on sky");
  }
  assert.ok(ratio("#1c1c1c", "#ffc43c") >= 4.5, "active tool text");
  assert.ok(ratio("#e8e8ea", "#2d303e") >= 4.5, "chrome buttons");
});

test("art anchors match MANIFEST", () => {
  assert.deepEqual(P.ART.barrel.pivot, [300, 128]);
  assert.deepEqual(P.ART.barrel.muzzle, [980, 128]);
  assert.deepEqual(P.ART.base.socket, [420, 170]);
  assert.equal(P.ART.base.ground, 500);
  assert.equal(P.ART.ball.r, 90);
  assert.deepEqual(P.ART.bullseye.center, [512, 512]);
  assert.equal(P.ART.bullseye.r, 440);
  assert.deepEqual(P.RING_FRACTIONS.map((f) => Math.round(f * 440)), [440, 360, 280, 200, 120, 50]);
  assert.equal(P.ART.cliff.ledgeY, 53);
  assert.equal(P.ART.cliff.edgeX, 378);
  assert.equal(P.ART.tower.topY, 31);
  assert.equal(P.ART.tower.feetY, 992);
  assert.equal(P.ART.ground.surfaceY, 24);
});
