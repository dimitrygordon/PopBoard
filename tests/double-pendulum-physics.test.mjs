import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as P from "../public/double-pendulum-physics.js";

const pub = new URL("../public/", import.meta.url);
const read = (n) => readFileSync(new URL(n, pub), "utf8");
const D = P.DEG;

function pair(start, offDeg, T, every = 20) {
  const a = P.createDouble(start), b = P.createDouble({ ...start, theta1: start.theta1 + offDeg * D });
  const ts = [], ds = [];
  for (let i = 1; i <= Math.round(T / P.H); i++) {
    P.rk4Step(a); P.rk4Step(b);
    if (i % every === 0) { ts.push(a.t); ds.push(P.separation(a, b)); }
  }
  return { a, b, ts, ds };
}

test("hanging at rest stays at rest with zero energy", () => {
  const s = P.createDouble({ theta1: 0, theta2: 0 });
  assert.equal(P.totalEnergy(s), 0);
  P.stepN(s, 2000);
  assert.equal(s.theta1, 0); assert.equal(s.theta2, 0);
});

test("energy formula: rods raised to horizontal at rest", () => {
  const s = P.createDouble({ theta1: Math.PI / 2, theta2: Math.PI / 2, m1: 2, m2: 1 });
  assert.ok(Math.abs(P.totalEnergy(s) - (3 * 9.81 * 1 + 1 * 9.81 * 1)) < 1e-9);
});

test("RK4 at 0.5 ms keeps energy drift below 1e-9 of scale over 30 s of chaos", () => {
  const s = P.createDouble();
  P.stepN(s, Math.round(30 / P.H));
  assert.ok(Math.abs(P.energyDrift(s)) < 1e-9, String(P.energyDrift(s)));
});

test("determinism: identical starts give bit-identical states", () => {
  const { a, b } = pair(P.DEFAULTS, 0, 20);
  assert.equal(a.theta1, b.theta1); assert.equal(a.omega2, b.omega2);
});

test("small-angle regime matches linear normal-mode frequencies", () => {
  const p = { m1: 1, m2: 1, L1: 1, L2: 1, g: 9.81 };
  const [w1, w2] = P.normalModeFrequencies(p);
  assert.ok(Math.abs(w1 - Math.sqrt(9.81 * (2 - Math.SQRT2))) < 1e-12);
  assert.ok(Math.abs(w2 - Math.sqrt(9.81 * (2 + Math.SQRT2))) < 1e-12);
  // Start in the slow mode (theta2 = sqrt2 theta1) and time zero crossings.
  const s = P.createDouble({ ...p, theta1: 0.01, theta2: 0.01 * Math.SQRT2 });
  let prev = s.theta1, cross = [];
  while (cross.length < 3) { P.rk4Step(s); if (prev > 0 && s.theta1 <= 0) cross.push(s.t); prev = s.theta1; }
  const T = cross[2] - cross[1];
  assert.ok(Math.abs(T - 2 * Math.PI / w1) / T < 1e-3);
});

test("small swing: separation does not grow exponentially", () => {
  const { ts, ds } = pair({ theta1: 10 * D, theta2: 10 * D }, 0.001, 20);
  const fit = P.lyapunovFit(ts, ds);
  assert.ok(fit && !fit.saturated && Math.abs(fit.lambda) < 0.1, JSON.stringify(fit));
});

test("big swing: Lyapunov-style estimate is clearly positive and the gap saturates", () => {
  const { ts, ds } = pair({ theta1: 120 * D, theta2: -10 * D }, 0.001, 20);
  const fit = P.lyapunovFit(ts, ds);
  assert.ok(fit.saturated && fit.lambda > 0.6 && fit.lambda < 1.3, JSON.stringify(fit));
});

test("prediction horizon grows only by a roughly fixed time per 10x better start", () => {
  const start = { theta1: 120 * D, theta2: -10 * D };
  const h = [1e-2, 1e-4, 1e-6].map((o) => P.predictionHorizon(start, o, { tMax: 30 }));
  assert.ok(h.every((x) => x != null) && h[0] < h[1] && h[1] < h[2]);
  const g1 = h[1] - h[0], g2 = h[2] - h[1];
  assert.ok(g1 > 2 && g1 < 6 && g2 > 2 && g2 < 6, String(h));
  assert.ok(h[2] < 3 * h[0]);
});

test("offset slider is log spaced: neighbours differ by less than 2x", () => {
  assert.equal(P.offsetFromStep(0), 1e-6);
  assert.ok(Math.abs(P.offsetFromStep(P.OFFSET_STEPS) - 1) < 1e-12);
  for (let i = 1; i <= P.OFFSET_STEPS; i++) assert.ok(P.offsetFromStep(i) / P.offsetFromStep(i - 1) < 2);
  assert.equal(P.stepFromOffset(0.001), 60);
});

test("sandbox ranges never jump 2x between neighbouring steps", () => {
  for (const r of Object.values(P.SANDBOX_RANGES)) assert.ok((r.min + r.step) / r.min < 2);
});

test("wrapAngle and modes", () => {
  assert.ok(Math.abs(P.wrapAngle(3 * Math.PI / 2) + Math.PI / 2) < 1e-12);
  assert.equal(P.modeFromSearch("?mode=sandbox"), "sandbox");
  assert.equal(P.modeFromSearch("?mode=horizon"), "prediction");
  assert.equal(P.modeFromSearch("?mode=bogus"), "sensitivity");
  for (const m of P.MODES) assert.equal(P.MODE_ALIASES[m.id], m.id);
});

test("theme: stored choice wins, otherwise system preference", () => {
  assert.equal(P.resolveTheme("light", true), "light");
  assert.equal(P.resolveTheme("dark", false), "dark");
  assert.equal(P.resolveTheme(null, true), "dark");
  assert.equal(P.resolveTheme("junk", false), "light");
});

function lum(hex) {
  const c = hex.match(/[0-9a-f]{2}/gi).map((x) => parseInt(x, 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

test("theme CSS: text contrast at least 4.5:1 in light and dark", () => {
  const css = read("double-pendulum-theme.css");
  for (const sel of [/:root, :root\[data-theme="dark"\] \{([^}]*)\}/, /:root\[data-theme="light"\] \{([^}]*)\}/]) {
    const block = css.match(sel)[1];
    const v = (n) => block.match(new RegExp(`--dp-${n}:\\s*(#[0-9a-f]{6})`, "i"))[1];
    for (const fg of ["text", "dim"]) for (const bg of ["bg", "panel", "btn", "bar"]) {
      assert.ok(contrast(v(fg), v(bg)) >= 4.5, `${fg} on ${bg}: ${contrast(v(fg), v(bg)).toFixed(2)}`);
    }
    assert.ok(contrast(v("pressed"), v("btn")) >= 4.5);
  }
});

test("physics file is pure: no DOM", () => {
  const src = read("double-pendulum-physics.js");
  assert.ok(!/\bdocument\.|\bwindow\.|localStorage/.test(src));
});

test("page: guest access, back pattern, mode tabs, assets exist, no em-dashes", () => {
  const html = read("study-double-pendulum.html");
  const ui = read("double-pendulum-ui.js");
  assert.ok(!/signInAnonymously|firebase-auth|getAuth/.test(html + ui));
  assert.ok(/study\.html"\s*\+\s*location\.search/.test(ui));
  assert.ok(html.includes('data-study-back') && html.includes('src="double-pendulum-ui.js"'));
  assert.ok(ui.includes("popboard-dp-theme") || ui.includes("THEME_KEY"));
  const render = read("double-pendulum-render.js");
  for (const n of render.match(/const NAMES = \[([^\]]*)\]/)[1].match(/"[^"]+"/g)) {
    readFileSync(new URL(`double-pendulum/assets/${n.slice(1, -1)}.webp`, pub));
  }
  for (const f of ["study-double-pendulum.html", "double-pendulum-ui.js", "double-pendulum-render.js", "double-pendulum-physics.js", "double-pendulum-theme.css"]) {
    assert.ok(!read(f).includes("\u2014"), f);
  }
  assert.ok(/file: "study-double-pendulum.html"/.test(read("study.html")));
});
