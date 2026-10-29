import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import * as P from "../public/momentum-collisions/momentum-physics.js";

const close = (a, b, tol = 1e-9) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(b));
const pub = new URL("../public/", import.meta.url);
const read = (n) => readFileSync(new URL(n, pub), "utf8");

test("momentum is conserved for every e, masses and velocities", () => {
  for (const e of [0, 0.05, 0.3, 0.5, 0.8, 1]) for (const [m1, v1, m2, v2] of [[1, 2, 2, 0], [4, 1, 0.25, 0], [0.5, 3, 3, -1.2], [1, 1.5, 1, -1.5]]) {
    const a = P.collide1D(m1, v1, m2, v2, e);
    assert.ok(close(m1 * a.v1 + m2 * a.v2, m1 * v1 + m2 * v2, 1e-12));
    assert.ok(close(a.v2 - a.v1, -e * (v2 - v1), 1e-12), "restitution relation");
    const s = P.summary(m1, v1, m2, v2, e);
    assert.ok(close(s.keTotBefore - s.keTotAfter, s.keLost, 1e-12), "KE lost formula");
    assert.ok(s.keLost >= -1e-12);
    assert.ok(close(s.impulseOnA, -s.impulseOnB, 1e-12), "Newton's third law: equal and opposite impulses");
  }
});

test("textbook cases: elastic equal masses swap, sticky moves together, 1 kg at 2 m/s into 2 kg at rest", () => {
  const sw = P.collide1D(1, 2, 1, 0, 1);
  assert.ok(close(sw.v1, 0) && close(sw.v2, 2));
  const st = P.collide1D(1, 2, 2, 0, 0);
  assert.ok(close(st.v1, 2 / 3) && close(st.v2, 2 / 3));
  const el = P.collide1D(1, 2, 2, 0, 1);
  assert.ok(close(el.v1, -2 / 3) && close(el.v2, 4 / 3));
  assert.ok(close(P.summary(1, 2, 2, 0, 1).keTotAfter, 2), "elastic keeps 2 J");
  assert.ok(close(P.summary(1, 2, 2, 0, 0).keTotAfter, 2 / 3), "sticky keeps 1/3");
  const ho = P.collide1D(1, 1.5, 1, -1.5, 1);
  assert.ok(close(ho.v1, -1.5) && close(ho.v2, 1.5));
  assert.equal(P.collisionType(1), "elastic");
  assert.equal(P.collisionType(0), "perfectly inelastic");
  assert.equal(P.collisionType(0.5), "inelastic");
});

test("center-of-mass frame: total momentum zero, velocities reverse times e, only internal KE can be lost", () => {
  for (const e of [0, 0.5, 1]) {
    const [m1, v1, m2, v2] = [1, 2, 3, -0.5];
    const vcm = P.centerOfMassVelocity(m1, v1, m2, v2), a = P.collide1D(m1, v1, m2, v2, e);
    assert.ok(close(m1 * (v1 - vcm) + m2 * (v2 - vcm), 0, 1e-12));
    assert.ok(close(a.v1 - vcm, -e * (v1 - vcm), 1e-12));
    assert.ok(close(a.v2 - vcm, -e * (v2 - vcm), 1e-12));
    const s = P.summary(m1, v1, m2, v2, e);
    assert.ok(close(s.keTotBefore, 0.5 * (m1 + m2) * vcm * vcm + P.keInternal(m1, v1, m2, v2), 1e-12));
    assert.ok(close(s.keLost, (1 - e * e) * P.keInternal(m1, v1, m2, v2), 1e-12));
  }
});

test("track run: carts meet at CONTACT and leave with the collision velocities", () => {
  const r = P.newRun({ m1: 1, v1: 2, m2: 2, v2: 0, e: 1 });
  for (let i = 0; i < 600 && !r.ended; i++) P.stepRun(r, 1 / 60);
  assert.ok(r.hit);
  assert.ok(close(r.v1, -2 / 3) && close(r.v2, 4 / 3));
  assert.ok(close(r.tHit, (1.2 - P.CONTACT) / 2, 1e-9));
  const apart = P.newRun({ m1: 1, v1: -1, m2: 1, v2: 1, e: 1 });
  for (let i = 0; i < 600 && !apart.ended; i++) P.stepRun(apart, 1 / 60);
  assert.ok(!apart.hit && apart.ended);
});

test("barrier pulse: area under F(t) equals the impulse m(1 + e)v; longer contact lowers the force", () => {
  for (const [m, v, e, dt] of [[1, 2, 0.2, 0.1], [2, 3, 0, 0.005], [0.5, 1, 1, 0.3]]) {
    const p = P.barrierPulse(m, v, e, dt);
    let area = 0; const n = 4000;
    for (let i = 0; i < n; i++) area += p.force(((i + 0.5) / n) * dt) * dt / n;
    assert.ok(close(area, m * (1 + e) * v, 1e-6));
    assert.ok(close(p.Favg, p.J / dt) && close(p.Fpk, (Math.PI / 2) * p.Favg));
    assert.ok(close(p.vt(dt), -e * v, 1e-12) && close(p.vt(0), v));
    assert.ok(close(p.vt(p.tStop), 0, 1e-9), "crush peaks when the cart stops");
    let x = 0; for (let i = 0; i < n; i++) x += p.vt(((i + 0.5) / n) * p.tStop) * p.tStop / n;
    assert.ok(close(p.crush, x, 1e-5));
  }
  const rigid = P.barrierPulse(1, 2, 0.2, 0.005), crumple = P.barrierPulse(1, 2, 0.2, 0.1);
  assert.ok(close(rigid.J, crumple.J) && close(rigid.Favg / crumple.Favg, 20));
  assert.ok(close(P.barrierPulse(1, 2, 0, 0.1).crush, 0.1, 1e-9), "e = 0: crush = v dt / 2");
  assert.equal(P.G, 9.80665);
});

test("2D glancing: px and py conserved, elastic equal masses leave at 90 degrees, head-on reduces to 1D", () => {
  for (const b of [0.05, 0.3, 0.5, 0.9]) for (const [m1, m2, e] of [[1, 1, 1], [1, 2, 0.5], [3, 1, 0]]) {
    const g = P.glancing(m1, m2, 2, b, e);
    assert.ok(close(g.p.x, m1 * 2, 1e-12) && close(g.p.y, 0, 1e-12));
    if (m1 === m2 && e === 1) {
      assert.ok(close(Math.abs(g.angle1 - g.angle2), 90, 1e-9));
      assert.ok(close(g.keAfter, g.keBefore, 1e-12));
    }
    assert.ok(close(g.angle2, -Math.asin(b) * 180 / Math.PI, 1e-9), "target leaves along the line of centers");
  }
  const h = P.glancing(1, 2, 2, 0, 1), d = P.collide1D(1, 2, 2, 0, 1);
  assert.ok(close(h.v1.x, d.v1) && close(h.v2.x, d.v2) && close(h.v1.y, 0));
});

// Shown values across every slider: no adjacent-step jump of 2x or more.
// Values that pass through zero (a cart reversing) are exempt only within
// the display resolution (|x| < 0.05) or at a sign change: the physics
// itself, not the slider, crosses zero there.
test("sliders: log, round-trip, and no shown value jumps 2x between adjacent steps", () => {
  for (const k of Object.keys(P.SLIDERS)) {
    const s = P.SLIDERS[k];
    assert.ok(close(P.fromSlider(k, 0), s.min) && close(P.fromSlider(k, P.STEPS), s.max));
    assert.ok((s.max / s.min) ** (1 / P.STEPS) < 1.05, k);
    for (let i = 0; i <= P.STEPS; i += 7) assert.equal(P.toSlider(k, P.fromSlider(k, i)), i);
  }
  const shown = (c) => {
    const s = P.summary(c.m1, c.v1, c.m2, c.v2, c.e), w = P.barrierPulse(c.bm, c.bv, c.e, c.dt), g = P.glancing(c.m1, c.m2, Math.abs(c.v1), c.impact, c.e);
    return [c.m1, c.m2, c.v1, c.v2, c.e, c.dt, c.bm, c.bv, c.impact, ...s.pBefore, ...s.pAfter, s.pTotBefore, s.after.v1, s.after.v2,
      ...s.keBefore, ...s.keAfter, s.keTotBefore, s.keTotAfter, s.keLost, s.impulseOnB, s.vcm, w.J, w.Fpk, w.Favg, w.crush,
      g.speed1, g.speed2, g.angle1, g.angle2, g.phi, g.keAfter];
  };
  const base = { m1: 1, v1: 2, m2: 2, v2: -0.5, e: 0.5, dt: 0.1, bm: 1, bv: 2, impact: 0.5 };
  let checked = 0;
  for (const k of Object.keys(P.SLIDERS)) for (const e of [0.05, 0.5, 1]) {
    let prev = null;
    for (let i = 0; i <= P.STEPS; i++) {
      const c = { ...base, e, [k]: P.fromSlider(k, i) };
      if (k === "v2") c.v2 = -c.v2;
      const cur = shown(c);
      if (prev) cur.forEach((x, j) => {
        const y = prev[j];
        if (Math.abs(x) < 0.05 || Math.abs(y) < 0.05 || Math.sign(x) !== Math.sign(y)) return;
        const r = Math.max(x / y, y / x); checked++;
        assert.ok(r < 2, `${k} step ${i} value ${j}: ${y} -> ${x}`);
      });
      prev = cur;
    }
  }
  assert.ok(checked > 10000);
});

test("deep links: every mode and its aliases, presets, and a safe default", () => {
  for (const m of P.MODES) assert.equal(P.parseQuery("?mode=" + m).mode, m);
  assert.equal(P.parseQuery("?mode=free").mode, "sandbox");
  assert.equal(P.parseQuery("?mode=crumple").mode, "impulse");
  assert.equal(P.parseQuery("?mode=2d").mode, "glancing");
  assert.equal(P.parseQuery("?mode=bogus").mode, "carts");
  assert.equal(P.parseQuery("").mode, "carts");
  assert.equal(P.parseQuery("?preset=sticky").preset, "sticky");
  assert.equal(P.parseQuery("?type=perfectly-inelastic").preset, "sticky");
  assert.equal(P.parseQuery("?preset=<script>").preset, null);
  assert.ok(P.MODES.includes("sandbox"));
});

test("formatting", () => {
  assert.equal(P.num(-0.6666), "\u22120.67");
  assert.equal(P.num(-0.001), "0.00");
  assert.equal(P.sig(37.699, "N"), "37.7 N");
  assert.equal(P.sig(1508, "N"), "1508 N");
  assert.equal(P.fmtTime(0.005), "5 ms");
  assert.equal(P.cartSprite(0.5), "cart-light");
  assert.equal(P.cartSprite(1), "cart-medium");
  assert.equal(P.cartSprite(2), "cart-heavy");
});

test("art anchors match MANIFEST", () => {
  assert.deepEqual(P.ART.cart.bodyX, [112, 912]);
  assert.equal(P.ART.cart.mountY, 300);
  assert.equal(P.ART.cart.contactY, 490);
  assert.equal(P.ART.track.railTop, 40);
  assert.equal(P.ART.barrier.face, 60);
  assert.equal(P.ART.barrier.base, 1000);
  assert.equal(P.ART.puck.r, 118);
});

test("page, gallery card, theme and module files follow the study pattern", () => {
  const html = read("study-momentum-collisions.html");
  assert.match(html, /data-study-back/);
  assert.match(html, /momentum-collisions\/momentum-ui\.js/);
  assert.doesNotMatch(html, /firebase|getAuth|signIn/);
  assert.match(html, /prefers-color-scheme: dark/);
  assert.match(html, /popboard\.momentum\.theme/);
  assert.match(html, /id="themeBtn"/);
  for (const m of P.MODES) assert.match(html, new RegExp(`data-show="${m}"`), m);
  for (const m of P.MODES) assert.match(html, new RegExp(`data-panel="${m}"`), m);
  const ui = read("momentum-collisions/momentum-ui.js");
  assert.match(ui, /forwardStudyQuery/);
  assert.match(ui, /study\.html"\s*\+\s*location\.search/);
  assert.match(ui, /prefers-reduced-motion/);
  assert.match(ui, /prefers-color-scheme: dark/);
  assert.match(ui, /localStorage\.setItem\(THEME_KEY/);
  for (const f of ["momentum-physics.js"]) assert.doesNotMatch(read("momentum-collisions/" + f), /\bdocument\.|\bwindow\.|getContext|localStorage|\bnavigator\./);
  const gallery = read("study.html");
  assert.match(gallery, /id: "momentum-collisions"/);
  assert.match(gallery, /file: "study-momentum-collisions\.html"/);
  const css = read("momentum-collisions/momentum-theme.css");
  assert.match(css, /--mc-hit: 44px/);
  assert.match(css, /min-height: var\(--mc-hit\)/);
  assert.match(css, /:root\[data-theme="dark"\]/);
  assert.match(css, /prefers-reduced-motion/);
  const files = ["study-momentum-collisions.html", ...readdirSync(new URL("momentum-collisions/", pub)).filter((n) => /\.(js|css)$/.test(n)).map((n) => "momentum-collisions/" + n)];
  for (const f of files) assert.doesNotMatch(read(f), /\u2014/, f);
  assert.doesNotMatch(readFileSync(new URL("../docs/momentum-collisions-science.md", import.meta.url), "utf8"), /\u2014/);
  assert.doesNotMatch(readFileSync(new URL("./momentum-physics.test.mjs", import.meta.url), "utf8"), /\u2014/);
  const shipped = readdirSync(new URL("momentum-collisions/assets/", pub));
  for (const n of shipped) assert.match(n, /\.webp$/);
  const used = ui.match(/loadImages\(\[([^\]]+)\]/)[1].match(/"([a-z-]+)"/g).map((n) => n.slice(1, -1));
  for (const n of used) assert.ok(shipped.includes(n + ".webp"), n);
  for (const n of shipped) assert.ok(used.includes(n.replace(/\.webp$/, "")), "unused asset " + n);
});

test("theme tokens keep text readable (WCAG AA 4.5:1) in light and dark", () => {
  const css = read("momentum-collisions/momentum-theme.css");
  const block = (sel) => { const i = css.indexOf(sel); return css.slice(i, css.indexOf("}", i)); };
  const light = block(":root {"), dark = block(':root[data-theme="dark"]');
  const tok = (b, name, fb) => (b.match(new RegExp(`--mc-${name}:\\s*(#[0-9a-f]{6})`)) || fb.match(new RegExp(`--mc-${name}:\\s*(#[0-9a-f]{6})`)))[1];
  const lum = (hex) => {
    const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  for (const b of [light, dark]) {
    for (const fg of ["ink", "ink-dim"]) {
      assert.ok(ratio(tok(b, fg, light), tok(b, "paper", light)) >= 4.5, fg + " on paper");
      assert.ok(ratio(tok(b, fg, light), tok(b, "table", light)) >= 4.5, fg + " on the puck table");
    }
    assert.ok(ratio(tok(b, "ink", light), tok(b, "chip", light)) >= 4.5, "chip text");
    assert.ok(ratio(tok(b, "text", light), tok(b, "chrome", light)) >= 4.5, "header text");
    assert.ok(ratio(tok(b, "text", light), tok(b, "btn", light)) >= 4.5, "header buttons");
  }
});
