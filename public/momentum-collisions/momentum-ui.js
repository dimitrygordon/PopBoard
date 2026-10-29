// Momentum & Collisions: page wiring.
// Physics and data: momentum-physics.js. Drawing: momentum-render.js.

import { forwardStudyQuery } from "../board-return.js?v=20261022a";
import {
  loadImages, readTokens, trackView, drawTrack, drawCart, drawBarrier, drawCM, drawScale, drawBars, drawForceTime,
  tableView, drawTable, drawPuck, drawTrail, drawVectorSum
} from "./momentum-render.js";
import {
  summary, newRun, stepRun, barrierPulse, glancing, centerOfMassVelocity, keInternal, collisionType,
  CART, CONTACT, TRACK, PUCK_R, PRESETS, MODES, parseQuery, fromSlider, toSlider, num, sig, fmtTime, G
} from "./momentum-physics.js";

const $ = (id) => document.getElementById(id);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const THEME_KEY = "popboard.momentum.theme";
let T = readTokens();
const q = parseQuery(location.search);
let dirty = true;
const img = loadImages(["cart-light", "cart-medium", "cart-heavy", "cart-body-mask", "crash-barrier", "crash-barrier-stripes-mask",
  "track-segment", "puck-red", "puck-blue"], () => { dirty = true; });

const pre = PRESETS[q.preset || "elastic"];
const st = {
  mode: q.mode,
  m1: pre.m1, v1: pre.v1, m2: pre.m2, v2: pre.v2, e: pre.e,
  bm: 1, bv: 2, dt: 0.1,
  impact: 0.5, frame: "lab", target: "cart",
  run: null,           // track run (carts, com, sandbox with cart B)
  wall: null,          // barrier run { x, v, phase, tc }
  puck: null           // glancing run
};
if (q.mode === "glancing") { st.m2 = st.m1; }

// ---------- theme ----------
function applyTheme(t, save) {
  document.documentElement.setAttribute("data-theme", t);
  if (save) { try { localStorage.setItem(THEME_KEY, t); } catch (e) {} }
  $("themeBtn").setAttribute("aria-pressed", String(t === "dark"));
  $("themeLabel").textContent = t === "dark" ? "Light" : "Dark";
  $("themeBtn").setAttribute("aria-label", t === "dark" ? "Switch to light mode" : "Switch to dark mode");
  T = readTokens(); dirty = true;
}
$("themeBtn").addEventListener("click", () => applyTheme(T.dark ? "light" : "dark", true));
const darkMQ = window.matchMedia("(prefers-color-scheme: dark)");
darkMQ.addEventListener?.("change", (e) => {
  let saved = null; try { saved = localStorage.getItem(THEME_KEY); } catch (err) {}
  if (!saved) applyTheme(e.matches ? "dark" : "light", false);
});
applyTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light", false);

// ---------- controls ----------
const panel = () => $$(`[data-panel="${st.mode}"]`)[0];
const barrierScene = () => st.mode === "impulse" || (st.mode === "sandbox" && st.target === "barrier");
function resetAll() { st.run = null; st.wall = null; st.puck = null; dirty = true; }

const sliderGet = {
  m1: () => st.m1, m2: () => st.m2, v1: () => Math.abs(st.v1) || 1, v2: () => Math.abs(st.v2) || 1,
  e: () => Math.max(0.05, st.e), dt: () => st.dt, bm: () => st.bm, bv: () => st.bv, impact: () => Math.max(0.05, st.impact)
};
const sliderSet = {
  m1: (v) => { st.m1 = v; }, m2: (v) => { st.m2 = v; },
  v1: (v) => { st.v1 = (Math.sign(st.v1) || 1) * v; },
  v2: (v) => { st.v2 = (Math.sign(st.v2) || -1) * v; },
  e: (v) => { st.e = v; }, dt: (v) => { st.dt = v; }, bm: (v) => { st.bm = v; }, bv: (v) => { st.bv = v; },
  impact: (v) => { st.impact = v; }
};
const sliderFmt = {
  m1: (v) => `${num(v)} kg`, m2: (v) => `${num(v)} kg`, bm: (v) => `${num(v)} kg`,
  v1: (v) => `${num(v)} m/s`, v2: (v) => `${num(v)} m/s`, bv: (v) => `${num(v)} m/s`,
  e: (v) => num(v), dt: fmtTime, impact: (v) => num(v)
};
for (const el of $$("[data-slider]")) {
  const k = el.dataset.slider;
  el.addEventListener("input", () => { sliderSet[k](fromSlider(k, Number(el.value))); resetAll(); sync(); });
}
for (const b of $$("[data-dir]")) b.addEventListener("click", () => {
  const k = b.dataset.dir === "1" ? "v1" : "v2", d = Number(b.dataset.val);
  const mag = Math.abs(st[k]) || fromSlider(k, Number($$(`[data-slider="${k}"]`)[0].value));
  st[k] = d * mag; resetAll(); sync();
});
for (const b of $$("[data-etype]")) b.addEventListener("click", () => { st.e = Number(b.dataset.etype); resetAll(); sync(); });
for (const b of $$("[data-preset]")) b.addEventListener("click", () => {
  const p = PRESETS[b.dataset.preset]; Object.assign(st, { m1: p.m1, v1: p.v1, m2: p.m2, v2: p.v2, e: p.e });
  if (st.mode === "sandbox") st.target = "cart";
  resetAll(); sync();
});
for (const b of $$("[data-dtpreset]")) b.addEventListener("click", () => { st.dt = Number(b.dataset.dtpreset); resetAll(); sync(); });
for (const b of $$("[data-frame]")) b.addEventListener("click", () => { st.frame = b.dataset.frame; dirty = true; sync(); });
for (const b of $$("[data-target]")) b.addEventListener("click", () => {
  st.target = b.dataset.target; if (st.target === "barrier" && st.v1 <= 0) st.v1 = Math.abs(st.v1) || 1;
  resetAll(); sync();
});
for (const b of $$("[data-headon]")) b.addEventListener("click", () => { st.impact = 0; resetAll(); sync(); });
for (const b of $$("[data-run]")) b.addEventListener("click", () => { start(); sync(); });
for (const b of $$("[data-reset]")) b.addEventListener("click", () => { resetAll(); sync(); });
for (const b of $$("[data-show]")) b.addEventListener("click", () => setMode(b.dataset.show));

function setMode(m) {
  st.mode = MODES.includes(m) ? m : "carts";
  if (st.mode === "impulse" && st.e > 0.99) st.e = 0.2;
  if (st.mode === "com") st.frame = "cm";
  if (st.mode === "glancing" && st.v1 <= 0) st.v1 = Math.abs(st.v1) || 2;
  for (const p of $$("[data-panel]")) p.hidden = p.dataset.panel !== st.mode;
  for (const b of $$("[data-show]")) b.setAttribute("aria-pressed", String(b.dataset.show === st.mode));
  const u = new URL(location.href); u.searchParams.set("mode", st.mode); history.replaceState(null, "", u);
  resetAll(); sync();
}

// ---------- runs ----------
const WALL_FACE = TRACK.x1 - 0.25;          // barrier face, m
const WALL_START = TRACK.x0 + 0.4;
const CONTACT_SHOWN = 1.5;                  // the contact is replayed over 1.5 s on screen
function start() {
  if (st.mode === "glancing") {
    const g = glancing(st.m1, st.m2, Math.abs(st.v1), st.impact, st.e);
    st.puck = { t: 0, g, p1: { x: -0.42, y: 2 * PUCK_R * st.impact }, p2: { x: 0, y: 0 }, hit: false, trail1: [], trail2: [], done: false };
    st.puck.trail1.push({ ...st.puck.p1 });
  } else if (barrierScene()) {
    const m = st.mode === "impulse" ? st.bm : st.m1, v = st.mode === "impulse" ? st.bv : Math.abs(st.v1);
    st.wall = { m, v, x: WALL_START, vel: v, phase: "approach", tc: 0, pulse: barrierPulse(m, v, st.e, st.dt), done: false };
  } else {
    st.run = newRun({ m1: st.m1, v1: st.v1, m2: st.m2, v2: st.v2, e: st.e });
  }
  if (reducedMotion) { for (let i = 0; i < 3000 && !finished(); i++) advance(1 / 30); }
  dirty = true;
}
function finished() {
  return (st.run && st.run.ended) || (st.wall && st.wall.done) || (st.puck && st.puck.done) || (!st.run && !st.wall && !st.puck);
}
function advance(dt) {
  if (st.run && !st.run.ended) stepRun(st.run, dt);
  if (st.wall && !st.wall.done) {
    const w = st.wall, frontGap = () => WALL_FACE - (w.x + CART.half + CART.bumper);
    if (w.phase === "approach") {
      w.x += w.v * dt;
      if (frontGap() <= 0) { w.x = WALL_FACE - CART.half - CART.bumper; w.x0 = w.x; w.phase = "contact"; }
    } else if (w.phase === "contact") {
      w.tc += dt * (w.pulse.dt / CONTACT_SHOWN);
      // position during contact from the velocity profile (crush shown up to the bumper length)
      const n = 40; let x = 0;
      for (let i = 0; i < n; i++) x += w.pulse.vt(((i + 0.5) / n) * Math.min(w.tc, w.pulse.dt)) * Math.min(w.tc, w.pulse.dt) / n;
      w.crushNow = Math.max(0, x);
      w.x = w.x0 + Math.min(CART.bumper * 0.7, w.crushNow);
      w.vel = w.pulse.vt(w.tc);
      if (w.tc >= w.pulse.dt) { w.phase = "rebound"; w.vel = w.pulse.vAfter; w.tc = w.pulse.dt; }
    } else {
      w.x += w.vel * dt;
      if (w.x < TRACK.x0 + CART.half || Math.abs(w.vel) < 1e-6) w.done = true;
    }
  }
  if (st.puck && !st.puck.done) {
    const P = st.puck, slow = 0.25, d = dt * slow, v = Math.abs(st.v1);
    if (!P.hit) {
      P.p1.x += v * d;
      const cx = -P.g.contact.x;   // puck 1 x at contact (puck 2 at origin)
      if (P.p1.x >= cx) { P.p1.x = cx; P.hit = true; }
    } else {
      P.p1.x += P.g.v1.x * d; P.p1.y += P.g.v1.y * d; P.p2.x += P.g.v2.x * d; P.p2.y += P.g.v2.y * d;
      P.t += d;
      if (P.t > 1.2 || Math.max(Math.abs(P.p1.x), Math.abs(P.p2.x)) > 0.5 || Math.max(Math.abs(P.p1.y), Math.abs(P.p2.y)) > 0.25 - PUCK_R) P.done = true;
    }
    P.trail1.push({ ...P.p1 }); if (P.hit) P.trail2.push({ ...P.p2 });
  }
}

// ---------- readouts ----------
const sum = () => summary(st.m1, st.v1, st.m2, st.v2, st.e);
const typeName = (e) => collisionType(e);
function readCarts() {
  const s = sum();
  const lines = [
    `Type: ${typeName(st.e)} (e = ${num(st.e)})`,
    `Before: p = ${num(s.pBefore[0])} + ${num(s.pBefore[1])} = ${num(s.pTotBefore)} kg\u00b7m/s`,
    s.willCollide ? `After:  v_A' = ${num(s.after.v1)} m/s, v_B' = ${num(s.after.v2)} m/s` : "These carts never meet: B moves away at least as fast as A.",
  ];
  if (s.willCollide) {
    lines.push(`After:  p = ${num(s.pAfter[0])} + ${num(s.pAfter[1])} = ${num(s.pTotAfter)} kg\u00b7m/s`);
    lines.push(`KE: ${num(s.keTotBefore)} J before, ${num(s.keTotAfter)} J after, ${num(s.keLost)} J lost`);
    lines.push(`Impulse on B: J = m_B\u0394v_B = ${num(s.impulseOnB)} N\u00b7s (on A: ${num(s.impulseOnA)})`);
  }
  return lines.join("\n");
}
function wallPulse() {
  const m = st.mode === "impulse" ? st.bm : st.m1, v = st.mode === "impulse" ? st.bv : Math.abs(st.v1);
  return { m, v, p: barrierPulse(m, v, st.e, st.dt) };
}
function readImpulse() {
  const { m, v, p } = wallPulse();
  return [
    `p before = mv = ${num(m * v)} kg\u00b7m/s, after = ${num(-st.e * m * v)} kg\u00b7m/s`,
    `Impulse J = \u0394p = m(1 + e)v = ${num(p.J)} N\u00b7s`,
    `Contact time \u0394t = ${fmtTime(st.dt)}`,
    `Average force = J/\u0394t = ${sig(p.Favg, "N")} (${sig(p.Favg / (m * G), "\u00d7 the cart's weight")})`,
    `Peak force = (\u03c0/2) J/\u0394t = ${sig(p.Fpk, "N")}`,
    `Front pushed in by ${sig(p.crush * 100, "cm")} at most`
  ].join("\n");
}
function readCom() {
  const s = sum(), vcm = s.vcm, M = st.m1 + st.m2;
  const u1 = st.v1 - vcm, u2 = st.v2 - vcm;
  const lines = [
    `v_cm = (m_A v_A + m_B v_B)/(m_A + m_B) = ${num(vcm)} m/s`,
    `In the CM frame: u_A = ${num(u1)} m/s, u_B = ${num(u2)} m/s`,
    `Total momentum in the CM frame: ${num(st.m1 * u1 + st.m2 * u2)} kg\u00b7m/s`,
  ];
  if (s.willCollide) {
    lines.push(`After: u_A' = ${num(s.after.v1 - vcm)} m/s, u_B' = ${num(s.after.v2 - vcm)} m/s (each \u00d7 \u2212e)`);
    lines.push(`KE = KE of the CM ${num(0.5 * M * vcm * vcm)} J + KE in the CM frame ${num(keInternal(st.m1, st.v1, st.m2, st.v2))} J`);
    lines.push(`Lost: (1 \u2212 e\u00b2) \u00d7 ${num(keInternal(st.m1, st.v1, st.m2, st.v2))} = ${num(s.keLost)} J`);
  } else lines.push("These carts never meet.");
  return lines.join("\n");
}
function readGlancing() {
  const g = glancing(st.m1, st.m2, Math.abs(st.v1), st.impact, st.e);
  const ang = (a) => `${Math.round(Math.abs(a))}\u00b0 ${a > 0.5 ? "above" : a < -0.5 ? "below" : "along"} the x axis`;
  return [
    `Offset b = ${num(st.impact)} \u00d7 2R; line of centers at ${Math.round(g.phi * 180 / Math.PI)}\u00b0`,
    `Red after: ${num(g.speed1)} m/s, ${g.speed1 < 0.005 ? "stopped" : ang(g.angle1)}`,
    `Blue after: ${num(g.speed2)} m/s, ${ang(g.angle2)}`,
    `p_x: ${num(g.p0)} before, ${num(g.p.x)} after; p_y: 0 before, ${num(g.p.y)} after`,
    `KE: ${num(g.keBefore)} J before, ${num(g.keAfter)} J after`,
    g.speed1 > 0.005 && g.speed2 > 0.005 ? `Angle between the paths: ${Math.round(Math.abs(g.angle1 - g.angle2))}\u00b0` : ""
  ].filter(Boolean).join("\n");
}
const NOTES = {
  carts: "Momentum p = mv is a vector: on a track its sign says which way. With no outside push along the track, the total momentum is the same before and after every collision. Kinetic energy is kept only when e = 1; otherwise some becomes heat, sound and bent metal.",
  impulse: "Impulse is force times time, the area under the force-time curve, and it equals the change in momentum. The same impulse spread over a longer time needs a smaller force: that is what crumple zones, airbags and padding do.",
  com: "The center of mass moves at a steady v_cm before, during and after the collision. Riding along with it, the two carts have equal and opposite momenta, and each one's velocity just reverses and shrinks by the factor e.",
  glancing: "Momentum is conserved in x and in y separately. Pucks push only along the line joining their centers. For equal masses in an elastic glancing collision, the two paths leave at 90\u00b0 to each other.",
  sandbox: "Free play: pick a target, masses, speeds, e and contact time, switch frames, and test your predictions."
};
function hint() {
  if (st.mode === "glancing") return "Top view, shown at 1/4 speed.";
  if (barrierScene()) return `The contact is replayed ${Math.round(CONTACT_SHOWN / st.dt)}\u00d7 slower than real time.`;
  if (st.frame === "cm" && (st.mode === "com" || st.mode === "sandbox")) return "Camera moving with the center of mass.";
  return "Lab frame: the camera stands still.";
}

function sync() {
  const p = panel(); if (!p) return;
  for (const el of $$("[data-slider]", p)) {
    const k = el.dataset.slider, v = sliderGet[k]();
    el.value = String(toSlider(k, v));
    const out = $$(`[data-out="${k}"]`, p)[0];
    if (out) {
      out.textContent = k === "e" && st.e < 0.05 ? "0 (stick together)" : k === "impact" && st.impact < 0.05 ? "0 (head-on)"
        : k === "v2" && st.v2 === 0 && st.mode !== "glancing" ? "0 (at rest)" : k === "v1" && st.v1 === 0 ? "0 (at rest)" : sliderFmt[k](v);
    }
  }
  for (const b of $$("[data-dir]", p)) {
    const v = b.dataset.dir === "1" ? st.v1 : st.v2;
    b.setAttribute("aria-pressed", String(Math.sign(v) === Number(b.dataset.val)));
  }
  for (const b of $$("[data-etype]", p)) b.setAttribute("aria-pressed", String(Math.abs(st.e - Number(b.dataset.etype)) < 1e-9));
  for (const b of $$("[data-frame]", p)) b.setAttribute("aria-pressed", String(b.dataset.frame === st.frame));
  for (const b of $$("[data-target]", p)) b.setAttribute("aria-pressed", String(b.dataset.target === st.target));
  for (const b of $$("[data-dtpreset]", p)) b.setAttribute("aria-pressed", String(Math.abs(st.dt - Number(b.dataset.dtpreset)) < 1e-9));
  // In the barrier scene cart A only moves right.
  for (const b of $$("[data-dir]", p)) b.disabled = barrierScene() && (b.dataset.dir === "2" || b.dataset.val !== "1");
  for (const s of $$('[data-slider="m2"], [data-slider="v2"]', p)) s.disabled = barrierScene() && st.mode === "sandbox";
  const read = $$("[data-read]", p)[0];
  if (read) {
    read.textContent = st.mode === "impulse" ? readImpulse() : st.mode === "com" ? readCom() : st.mode === "glancing" ? readGlancing()
      : st.mode === "sandbox" ? (st.target === "barrier" ? readImpulse() : st.frame === "cm" ? readCom() : readCarts()) : readCarts();
  }
  const note = $$("[data-note]", p)[0]; if (note) note.textContent = NOTES[st.mode];
  $("canvasHint").textContent = hint();
  const runBtn = $$("[data-run]", p)[0]; if (runBtn) runBtn.textContent = st.run || st.wall || st.puck ? "Run again" : "Run";
  dirty = true;
}

// ---------- drawing ----------
const scene = $("sceneCanvas"), sctx = scene.getContext("2d");
const graph = $("graphCanvas"), gctx = graph.getContext("2d");
let dpr = Math.min(2, window.devicePixelRatio || 1);
function fit(c, x) {
  const r = c.getBoundingClientRect(), w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
  if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
  x.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { w, h };
}
function drawScene() {
  const { w, h } = fit(scene, sctx);
  sctx.clearRect(0, 0, w, h);
  if (st.mode === "glancing") return drawGlancingScene(w, h);
  const V = trackView(w, h);
  drawTrack(sctx, V, img);
  const bump = st.e < 0.05 ? "velcro" : "spring";
  if (barrierScene()) {
    const wl = st.wall, m = st.mode === "impulse" ? st.bm : st.m1, v = st.mode === "impulse" ? st.bv : Math.abs(st.v1);
    drawBarrier(sctx, V, T, img, WALL_FACE);
    const x = wl ? wl.x : WALL_START, vel = wl ? wl.vel : v;
    const squeeze = wl && wl.phase !== "approach" ? Math.min(1, (wl.crushNow || 0) / CART.bumper) * (wl.phase === "contact" ? 1 : 0) : 0;
    drawCart(sctx, V, T, img, { x, m, v: vel, tint: T.a, label: "Cart", bumperSide: 1, bumper: "crumple", squeeze });
    drawScale(sctx, V, T);
    return;
  }
  const r = st.run;
  const x1 = r ? r.x1 : -0.9, x2 = r ? r.x2 : 0.3, v1 = r ? r.v1 : st.v1, v2 = r ? r.v2 : st.v2, t = r ? r.t : 0;
  const cmFrame = st.frame === "cm" && (st.mode === "com" || st.mode === "sandbox");
  const vcm = centerOfMassVelocity(st.m1, st.v1, st.m2, st.v2);
  const xcm0 = (st.m1 * -0.9 + st.m2 * 0.3) / (st.m1 + st.m2);
  const shift = cmFrame ? -(vcm * t) - xcm0 : 0;   // CM frame: hold the CM fixed at the middle of the track
  const near = r && r.hit && r.x2 - r.x1 - CONTACT < 0.02;
  drawCart(sctx, V, T, img, { x: x1 + shift, m: st.m1, v: cmFrame ? v1 - vcm : v1, tint: T.a, label: "A", bumperSide: 1, bumper: bump, squeeze: near && st.e >= 0.05 ? 0.5 : 0 });
  drawCart(sctx, V, T, img, { x: x2 + shift, m: st.m2, v: cmFrame ? v2 - vcm : v2, tint: T.b, label: "B", bumperSide: -1, bumper: bump, squeeze: near && st.e >= 0.05 ? 0.5 : 0 });
  if (st.mode === "com" || st.mode === "sandbox") {
    const xcm = (st.m1 * x1 + st.m2 * x2) / (st.m1 + st.m2) + shift;
    drawCM(sctx, V, T, xcm, cmFrame ? "CM (at rest here)" : `CM, ${num(vcm)} m/s`);
  }
  drawScale(sctx, V, T);
}
function drawGlancingScene(w, h) {
  const V = tableView(w, h);
  drawTable(sctx, V, T);
  const P = st.puck;
  const p1 = P ? P.p1 : { x: -0.42, y: 2 * PUCK_R * st.impact }, p2 = P ? P.p2 : { x: 0, y: 0 };
  if (P) { drawTrail(sctx, V, P.trail1, T.b); drawTrail(sctx, V, P.trail2, T.a); }
  else {
    sctx.strokeStyle = T.dim; sctx.setLineDash([3, 5]); sctx.lineWidth = 1.5; sctx.beginPath();
    sctx.moveTo(V.toX(p1.x), V.toY(p1.y)); sctx.lineTo(V.toX(0.45), V.toY(p1.y)); sctx.stroke(); sctx.setLineDash([]);
  }
  drawPuck(sctx, V, T, img, p1, "puck-red", `${num(st.m1)} kg`, T.b);
  drawPuck(sctx, V, T, img, p2, "puck-blue", `${num(st.m2)} kg`, T.a);
}
function drawGraph() {
  const { w, h } = fit(graph, gctx);
  gctx.clearRect(0, 0, w, h);
  if (st.mode === "glancing") {
    const g = glancing(st.m1, st.m2, Math.abs(st.v1), st.impact, st.e);
    drawVectorSum(gctx, w, h, T, g, st.m1, st.m2);
    graph.setAttribute("aria-label", `Momentum vectors. Before ${num(g.p0)} along x. After, the two puck momenta add to ${num(g.p.x)} along x and ${num(g.p.y)} along y.`);
    return;
  }
  if (barrierScene()) {
    const { p } = wallPulse();
    const tNow = st.wall && st.wall.phase !== "approach" ? st.wall.tc : null;
    drawForceTime(gctx, w, h, T, p, tNow, null);
    graph.setAttribute("aria-label", `Force-time graph: a pulse lasting ${fmtTime(st.dt)} with peak ${sig(p.Fpk, "N")}. Its area is the impulse, ${num(p.J)} newton seconds.`);
    return;
  }
  const s = sum();
  const src = s.willCollide ? s : { ...s, pAfter: s.pBefore, pTotAfter: s.pTotBefore, keAfter: s.keBefore, keTotAfter: s.keTotBefore };
  if (st.frame === "cm" && (st.mode === "com" || st.mode === "sandbox")) {
    const vcm = s.vcm, u = (m, v) => m * (v - vcm), k = (m, v) => 0.5 * m * (v - vcm) ** 2;
    const a = s.willCollide ? s.after : { v1: st.v1, v2: st.v2 };
    const cm = {
      pBefore: [u(st.m1, st.v1), u(st.m2, st.v2)], pAfter: [u(st.m1, a.v1), u(st.m2, a.v2)],
      keBefore: [k(st.m1, st.v1), k(st.m2, st.v2)], keAfter: [k(st.m1, a.v1), k(st.m2, a.v2)]
    };
    cm.pTotBefore = cm.pBefore[0] + cm.pBefore[1]; cm.pTotAfter = cm.pAfter[0] + cm.pAfter[1];
    cm.keTotBefore = cm.keBefore[0] + cm.keBefore[1]; cm.keTotAfter = cm.keAfter[0] + cm.keAfter[1];
    drawBars(gctx, w, h, T, cm);
  } else drawBars(gctx, w, h, T, src);
  graph.setAttribute("aria-label", `Bar charts. Total momentum ${num(src.pTotBefore)} before and ${num(src.pTotAfter)} after. Total kinetic energy ${num(src.keTotBefore)} joules before and ${num(src.keTotAfter)} after.`);
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (!document.hidden && !reducedMotion && !finished()) { advance(dt); dirty = true; if (finished()) sync(); }
  if (dirty) { dirty = false; drawScene(); drawGraph(); }
  requestAnimationFrame(frame);
}

$("studyBackBtn").addEventListener("click", (e) => {
  e.preventDefault();
  // Back to the Study library with the board return keys only: drop this
  // module's mode and preset from the URL, then hand over the query.
  const qs = forwardStudyQuery(location.search).toString();
  history.replaceState(null, "", qs ? "?" + qs : location.pathname);
  location.href = "study.html" + location.search;
});

window.addEventListener("resize", () => { dirty = true; });
new ResizeObserver(() => { dirty = true; }).observe(scene);
setMode(st.mode);
requestAnimationFrame(frame);
// Read-only hook for the browser checks.
window.__momentum = { state: st, start, advance };
