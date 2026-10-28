// E&M Field Sandbox: page wiring.
// Physics and data: emfields-physics.js. Drawing: emfields-render.js.

import { forwardStudyQuery } from "../board-return.js?v=20261022a";
import {
  loadImages, readTokens, viewOf, drawCharges, drawWires, drawFieldLines, drawVectorGrid, drawEquipotentials,
  drawBLines, drawCompasses, drawTestCharge, drawParticle, drawUniformB, drawScaleBar, drawSelector
} from "./emfields-render.js";
import {
  NC, K, PARTICLES, PARTICLE_IDS, eField, eFieldFrom, potential, bField, bFieldFrom, wireForcePerLength,
  cyclotronRadius, cyclotronPeriod, cyclotronFrequency, selectorSpeed, kineticEnergyEV, advance, selectorPath,
  SELECTOR, CHARGE_R, VIEW, VIEW_H, PRESETS, WIRE_PRESETS, clonePreset, MODES, parseQuery, fromSlider, toSlider,
  fmt, fmtSpeed, fmtLength, angleDeg, sci, EQUIPOTENTIAL_STEP_V, lorentz
} from "./emfields-physics.js";

const $ = (id) => document.getElementById(id);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const THEME_KEY = "popboard.emfields.theme";
let T = readTokens();
const q = parseQuery(location.search);

const img = loadImages(["charge-positive", "charge-negative", "test-charge", "electron", "compass-housing", "compass-needle",
  "compass-needle-north-mask", "wire-segment-copper"], () => { dirty = true; });

const st = {
  mode: q.mode,
  charges: clonePreset(PRESETS[PRESETS[q.preset] ? q.preset : "dipole"]),
  test: { x: 0, y: 0.05, q: 1 * NC },
  sel: null,
  wires: clonePreset(WIRE_PRESETS[WIRE_PRESETS[q.preset] ? q.preset : "parallel"]),
  selWire: null,
  probe: { x: 0, y: 0.06 },
  show: { lines: true, vectors: false, parts: true, blines: true, compass: true, equip: false, potLines: false },
  cyc: { part: q.particle && q.particle !== "electron" ? q.particle : "proton", B: 0.05, v: 3e5, dir: -1, running: !reducedMotion, t: 0 },
  selr: { part: q.particle && q.particle !== "electron" ? q.particle : "proton", E: 2e4, B: 0.1, v: 1.5e5, t0: 0, path: null },
  box: {
    tool: "move", charges: [{ x: -0.08, y: 0.04, q: 2 * NC }, { x: 0.06, y: -0.03, q: -2 * NC }], wires: [{ x: 0.1, y: 0.07, I: 10 }],
    Eon: false, Edir: 270, E: 1e4, Bon: true, Bdir: -1, B: 0.02, part: q.particle || "proton", v: 2e5, vdir: 0,
    slowmo: 2e-7, launch: { x: -0.14, y: -0.06 }, p: null, trail: [], running: false, status: ""
  }
};
st.sel = st.charges[0];
st.selWire = st.wires[0];
let boxSel = st.box.charges[0], boxSelWire = st.box.wires[0];
let dirty = true;

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

// ---------- particles buttons ----------
for (const host of $$("[data-particles]")) {
  const which = host.dataset.particles;
  for (const id of PARTICLE_IDS) {
    if (which !== "box" && id === "electron") continue;   // electron circles are too small to see at these scales
    const b = document.createElement("button");
    b.type = "button"; b.dataset.part = id; b.textContent = PARTICLES[id].name; b.setAttribute("aria-pressed", "false");
    b.addEventListener("click", () => {
      if (which === "cyc") { st.cyc.part = id; restartCyc(); }
      else if (which === "sel") { st.selr.part = id; fireSel(); }
      else { st.box.part = id; resetBox(); }
      sync();
    });
    host.appendChild(b);
  }
}

// ---------- scene helpers ----------
const panel = () => $$(`[data-panel="${st.mode}"]`)[0];
const sceneCharges = () => (st.mode === "sandbox" ? st.box.charges : st.charges);
const sceneWires = () => (st.mode === "sandbox" ? st.box.wires : st.wires);
const selCharge = () => (st.mode === "sandbox" ? boxSel : st.sel);
const selWire = () => (st.mode === "sandbox" ? boxSelWire : st.selWire);
function setSelCharge(c) { if (st.mode === "sandbox") boxSel = c; else st.sel = c; }
function setSelWire(w) { if (st.mode === "sandbox") boxSelWire = w; else st.selWire = w; }

function freeSpot(list) {
  for (const [x, y] of [[0, 0], [0.08, 0.06], [-0.08, 0.06], [0.08, -0.06], [-0.08, -0.06], [0, 0.08], [0, -0.08], [0.13, 0], [-0.13, 0]]) {
    if (!list.some((o) => Math.hypot(o.x - x, o.y - y) < 0.03)) return { x, y };
  }
  return { x: (Math.random() - 0.5) * 0.2, y: (Math.random() - 0.5) * 0.14 };
}

for (const b of $$("[data-preset]")) b.addEventListener("click", () => { st.charges = clonePreset(PRESETS[b.dataset.preset]); st.sel = st.charges[0]; sync(); });
for (const b of $$("[data-wpreset]")) b.addEventListener("click", () => { st.wires = clonePreset(WIRE_PRESETS[b.dataset.wpreset]); st.selWire = st.wires[0]; sync(); });
for (const b of $$("[data-add]")) b.addEventListener("click", () => {
  const list = sceneCharges(); if (list.length >= 8) return;
  const c = { ...freeSpot(list), q: Number(b.dataset.add) * 2 * NC }; list.push(c); setSelCharge(c); sync();
});
for (const b of $$("[data-flip]")) b.addEventListener("click", () => { const c = selCharge(); if (c) c.q = -c.q; sync(); });
for (const b of $$("[data-remove]")) b.addEventListener("click", () => {
  const list = sceneCharges(), c = selCharge(); if (!c) return;
  list.splice(list.indexOf(c), 1); setSelCharge(list[0] || null); sync();
});
for (const b of $$("[data-addwire]")) b.addEventListener("click", () => {
  const list = sceneWires(); if (list.length >= 6) return;
  const w = { ...freeSpot(list), I: Number(b.dataset.addwire) * 10 }; list.push(w); setSelWire(w); sync();
});
for (const b of $$("[data-flipwire]")) b.addEventListener("click", () => { const w = selWire(); if (w) w.I = -w.I; sync(); });
for (const b of $$("[data-removewire]")) b.addEventListener("click", () => {
  const list = sceneWires(), w = selWire(); if (!w) return;
  list.splice(list.indexOf(w), 1); setSelWire(list[0] || null); sync();
});
for (const b of $$("[data-toggle]")) b.addEventListener("click", () => {
  const k = b.dataset.toggle;
  if (k === "boxEOn") { st.box.Eon = !st.box.Eon; resetBox(); }
  else if (k === "boxBOn") { st.box.Bon = !st.box.Bon; resetBox(); }
  else if (k === "lines" && st.mode === "potential") st.show.potLines = !st.show.potLines;
  else st.show[k] = !st.show[k];
  sync();
});
for (const b of $$("[data-bdir]")) b.addEventListener("click", () => { st.cyc.dir = Number(b.dataset.bdir); restartCyc(); sync(); });
for (const b of $$("[data-edir]")) b.addEventListener("click", () => { st.box.Edir = Number(b.dataset.edir); st.box.Eon = true; resetBox(); sync(); });
for (const b of $$("[data-boxbdir]")) b.addEventListener("click", () => { st.box.Bdir = Number(b.dataset.boxbdir); st.box.Bon = true; resetBox(); sync(); });
for (const b of $$("[data-vdir]")) b.addEventListener("click", () => { st.box.vdir = Number(b.dataset.vdir); resetBox(); sync(); });
for (const b of $$("[data-tool]")) b.addEventListener("click", () => { st.box.tool = b.dataset.tool; sync(); });
for (const b of $$("[data-run]")) b.addEventListener("click", () => {
  if (st.mode === "cyclotron") st.cyc.running = !st.cyc.running;
  else if (st.mode === "sandbox") {
    if (!st.box.p || st.box.status) resetBox();
    st.box.running = !st.box.running;
  }
  sync();
});
for (const b of $$("[data-reset]")) b.addEventListener("click", () => {
  if (st.mode === "cyclotron") restartCyc(); else if (st.mode === "selector") fireSel(); else resetBox();
  sync();
});
for (const b of $$("[data-clear]")) b.addEventListener("click", () => {
  st.box.charges = []; st.box.wires = []; boxSel = boxSelWire = null; st.box.Eon = false; st.box.Bon = false; resetBox(); sync();
});
for (const b of $$("[data-match]")) b.addEventListener("click", () => {
  const v = selectorSpeed(st.selr.E, st.selr.B);
  st.selr.v = Math.min(fromSlider("selV", 200), Math.max(fromSlider("selV", 0), v));
  fireSel(); sync();
});

// ---------- sliders (all log, 200 steps) ----------
const sliderGet = {
  charge: () => Math.abs(selCharge()?.q || 2 * NC), testCharge: () => st.test.q, current: () => Math.abs(selWire()?.I || 10),
  cycB: () => st.cyc.B, cycV: () => st.cyc.v, selE: () => st.selr.E, selB: () => st.selr.B, selV: () => st.selr.v,
  boxE: () => st.box.E, boxB: () => st.box.B, boxV: () => st.box.v, slowmo: () => st.box.slowmo
};
const sliderSet = {
  charge: (v) => { const c = selCharge(); if (c) c.q = Math.sign(c.q) * v; },
  testCharge: (v) => { st.test.q = v; },
  current: (v) => { const w = selWire(); if (w) w.I = Math.sign(w.I) * v; },
  cycB: (v) => { st.cyc.B = v; restartCyc(); }, cycV: (v) => { st.cyc.v = v; restartCyc(); },
  selE: (v) => { st.selr.E = v; fireSel(); }, selB: (v) => { st.selr.B = v; fireSel(); }, selV: (v) => { st.selr.v = v; fireSel(); },
  boxE: (v) => { st.box.E = v; st.box.Eon = true; resetBox(); }, boxB: (v) => { st.box.B = v; st.box.Bon = true; resetBox(); },
  boxV: (v) => { st.box.v = v; resetBox(); }, slowmo: (v) => { st.box.slowmo = v; }
};
const sliderFmt = {
  charge: (v) => fmt(v, "C"), testCharge: (v) => fmt(v, "C"), current: (v) => fmt(v, "A"),
  cycB: (v) => fmt(v, "T"), cycV: fmtSpeed, selE: (v) => fmt(v, "V/m"), selB: (v) => fmt(v, "T"), selV: fmtSpeed,
  boxE: (v) => fmt(v, "V/m"), boxB: (v) => fmt(v, "T"), boxV: fmtSpeed,
  slowmo: (v) => `1 s on screen = ${fmt(v, "s")}`
};
for (const el of $$("[data-slider]")) {
  el.addEventListener("input", () => { sliderSet[el.dataset.slider](fromSlider(el.dataset.slider, Number(el.value))); sync(); });
}

// ---------- motion ----------
function restartCyc() { st.cyc.t = 0; st.cyc.trail = []; }
function cycState() {
  const P = PARTICLES[st.cyc.part], c = st.cyc;
  const r = cyclotronRadius(P.m, P.q, c.v, c.B);
  // start below (B into page) or above (B out of page) the center so the circle sits at the origin
  const sgn = Math.sign(P.q) * (c.dir < 0 ? 1 : -1);  // +1 means counterclockwise
  const w = sgn * 2 * Math.PI / cyclotronPeriod(P.m, P.q, c.B);
  const a = -Math.PI / 2 * sgn + w * c.t;
  return { P, r, x: r * Math.cos(a), y: r * Math.sin(a), vx: -r * w * Math.sin(a), vy: r * w * Math.cos(a) };
}
const CYC_SLOWMO = 1e-6;   // 1 s on screen = 1 microsecond
const SEL_SLOWMO = 1e-5;   // 1 s on screen = 10 microseconds
function fireSel() { const s = st.selr; s.path = selectorPath(PARTICLES[s.part], s.v, s.E, s.B); s.t0 = performance.now(); }
function boxFields() {
  const b = st.box, rad = b.Edir * Math.PI / 180;
  const Eu = b.Eon ? { x: b.E * Math.cos(rad), y: b.E * Math.sin(rad) } : { x: 0, y: 0 };
  const Bz = b.Bon ? b.Bdir * b.B : 0;
  return (x, y) => { const e = eField(b.charges, x, y); return { Ex: e.x + Eu.x, Ey: e.y + Eu.y, Bz }; };
}
function resetBox() {
  const b = st.box, rad = b.vdir * Math.PI / 180;
  b.p = { x: b.launch.x, y: b.launch.y, vx: b.v * Math.cos(rad), vy: b.v * Math.sin(rad) };
  b.trail = [{ x: b.p.x, y: b.p.y }]; b.running = false; b.status = "";
}
function stepBox(dtReal) {
  const b = st.box, P = PARTICLES[b.part];
  const near = (x, y) => Math.min(Infinity, ...b.charges.map((c) => Math.hypot(x - c.x, y - c.y)));
  const res = advance(b.p, P, dtReal * b.slowmo, boxFields(), { near, maxSteps: 6000 });
  b.p = res.p;
  b.trail.push({ x: b.p.x, y: b.p.y });
  if (b.trail.length > 4000) b.trail.splice(0, b.trail.length - 4000);
  if (near(b.p.x, b.p.y) < CHARGE_R) { b.status = "The particle reached a charge."; b.running = false; }
  else if (Math.abs(b.p.x) > VIEW || Math.abs(b.p.y) > VIEW) { b.status = "The particle left the view."; b.running = false; }
}
// Reduced motion: compute the whole run at once and draw it as a still path.
function precomputeBox() {
  resetBox();
  for (let i = 0; i < 600 && !st.box.status; i++) stepBox(1 / 30);
  st.box.running = false;
}

// ---------- pointer ----------
const canvas = $("fieldCanvas"), ctx = canvas.getContext("2d");
let W = 0, H = 0, dpr = Math.min(2, window.devicePixelRatio || 1);
function view() {
  if (st.mode === "cyclotron") return viewOf(W, H, 0.6, 0.48);
  if (st.mode === "selector") return viewOf(W, H, 0.48, 0.16, SELECTOR.L / 2 + 0.01, 0);
  return viewOf(W, H, VIEW, VIEW_H);
}
let drag = null;
function pick(px, py) {
  const V = view(), hit = (o, r = 26) => Math.hypot(V.toX(o.x) - px, V.toY(o.y) - py) <= r;
  if (st.mode === "field" || st.mode === "potential") {
    if (hit(st.test)) return { o: st.test };
    const c = [...st.charges].reverse().find((c) => hit(c, Math.max(26, CHARGE_R * V.s)));
    if (c) { st.sel = c; return { o: c }; }
  } else if (st.mode === "magnetic") {
    if (hit(st.probe)) return { o: st.probe };
    const w = [...st.wires].reverse().find((w) => hit(w)); if (w) { st.selWire = w; return { o: w }; }
  } else if (st.mode === "sandbox") {
    const b = st.box;
    const c = [...b.charges].reverse().find((c) => hit(c, Math.max(26, CHARGE_R * V.s)));
    const w = [...b.wires].reverse().find((w) => hit(w));
    if (b.tool === "erase") {
      if (c) { b.charges.splice(b.charges.indexOf(c), 1); if (boxSel === c) boxSel = b.charges[0] || null; }
      else if (w) { b.wires.splice(b.wires.indexOf(w), 1); if (boxSelWire === w) boxSelWire = b.wires[0] || null; }
      return null;
    }
    if (b.tool === "move") {
      if (hit(b.launch)) return { o: b.launch, launch: true };
      if (c) { boxSel = c; return { o: c }; }
      if (w) { boxSelWire = w; return { o: w }; }
      return null;
    }
    const x = V.fromX(px), y = V.fromY(py);
    if (b.tool === "launch") { b.launch.x = x; b.launch.y = y; resetBox(); return { o: b.launch, launch: true }; }
    if ((b.tool === "plus" || b.tool === "minus") && b.charges.length < 8) {
      const n = { x, y, q: (b.tool === "plus" ? 1 : -1) * 2 * NC }; b.charges.push(n); boxSel = n; resetBox(); return { o: n };
    }
    if ((b.tool === "out" || b.tool === "in") && b.wires.length < 6) {
      const n = { x, y, I: (b.tool === "out" ? 1 : -1) * 10 }; b.wires.push(n); boxSelWire = n; return { o: n };
    }
  }
  return null;
}
canvas.addEventListener("pointerdown", (e) => {
  const r = canvas.getBoundingClientRect();
  drag = pick(e.clientX - r.left, e.clientY - r.top);
  if (drag) canvas.setPointerCapture(e.pointerId);
  sync();
});
canvas.addEventListener("pointermove", (e) => {
  if (!drag) return;
  const r = canvas.getBoundingClientRect(), V = view();
  const b = V.bounds, m = 0.01;
  drag.o.x = Math.min(b.x1 - m, Math.max(b.x0 + m, V.fromX(e.clientX - r.left)));
  drag.o.y = Math.min(b.y1 - m, Math.max(b.y0 + m, V.fromY(e.clientY - r.top)));
  if (st.mode === "sandbox" && !st.box.running) resetBox();
  sync();
});
const endDrag = () => { drag = null; };
canvas.addEventListener("pointerup", endDrag);
canvas.addEventListener("pointercancel", endDrag);
canvas.addEventListener("keydown", (e) => {
  const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[e.key];
  if (!d) return;
  const o = st.mode === "magnetic" ? st.probe : st.mode === "sandbox" ? st.box.launch : st.test;
  if (st.mode === "cyclotron" || st.mode === "selector") return;
  e.preventDefault();
  o.x += d[0] * 0.005; o.y += d[1] * 0.005;
  if (st.mode === "sandbox") resetBox();
  sync();
});

// ---------- readouts ----------
const qLabel = (c) => `${c.q > 0 ? "+" : "\u2212"}${+(Math.abs(c.q) / NC).toPrecision(2)} nC`;
function readField() {
  const t = st.test, lines = [];
  for (const c of st.charges.slice(0, 5)) {
    const e = eFieldFrom(c, t.x, t.y);
    lines.push(`E from ${qLabel(c)}: ${fmt(Math.hypot(e.x, e.y), "N/C")} at ${angleDeg(e.x, e.y)}\u00b0`);
  }
  if (st.charges.length > 5) lines.push(`(+${st.charges.length - 5} more charges)`);
  const E = eField(st.charges, t.x, t.y), m = Math.hypot(E.x, E.y);
  lines.push(`Net E (sum of vectors): ${fmt(m, "N/C")} at ${angleDeg(E.x, E.y)}\u00b0`);
  lines.push(`F = q\u2080E = ${fmt(t.q * m, "N")} at ${angleDeg(E.x, E.y)}\u00b0`);
  return lines.join("\n");
}
function readPotential() {
  const t = st.test, V = potential(st.charges, t.x, t.y);
  return [
    `V at test charge: ${fmt(V, "V")}`,
    `U = q\u2080V = ${fmt(t.q * V, "J")}`,
    `Drawn lines: every ${EQUIPOTENTIAL_STEP_V} V`
  ].join("\n");
}
function readMagnetic() {
  const p = st.probe, lines = [];
  for (const w of st.wires) {
    const b = bFieldFrom(w, p.x, p.y);
    lines.push(`B from ${+Math.abs(w.I).toPrecision(2)} A ${w.I > 0 ? "out" : "in"}: ${fmt(Math.hypot(b.x, b.y), "T")}`);
  }
  const B = bField(st.wires, p.x, p.y);
  lines.push(`Net B at probe: ${fmt(Math.hypot(B.x, B.y), "T")} at ${angleDeg(B.x, B.y)}\u00b0`);
  if (st.wires.length === 2) {
    const [a, b] = st.wires, d = Math.hypot(a.x - b.x, a.y - b.y);
    const f = wireForcePerLength(a.I, b.I, d);
    lines.push(`Wires ${fmtLength(d)} apart: ${fmt(f.perMeter, "N")} per meter, ${f.attract ? "attract" : "repel"}`);
  }
  return lines.join("\n");
}
function readCyc() {
  const P = PARTICLES[st.cyc.part], c = st.cyc;
  const T0 = cyclotronPeriod(P.m, P.q, c.B);
  return [
    `r = mv/(|q|B) = ${fmtLength(cyclotronRadius(P.m, P.q, c.v, c.B))}`,
    `T = 2\u03c0m/(|q|B) = ${fmt(T0, "s")}`,
    `f = 1/T = ${fmt(cyclotronFrequency(P.m, P.q, c.B), "Hz")}`,
    `Kinetic energy: ${fmt(kineticEnergyEV(P.m, c.v), "eV")} (stays constant)`,
    `Slow motion: 1 s on screen = ${fmt(CYC_SLOWMO, "s")}`
  ].join("\n");
}
function readSel() {
  const P = PARTICLES[st.selr.part], s = st.selr, path = s.path;
  const fe = Math.abs(P.q) * s.E, fb = Math.abs(P.q) * s.v * s.B;
  return [
    `Electric force |q|E = ${fmt(fe, "N")}`,
    `Magnetic force |q|vB = ${fmt(fb, "N")}`,
    `Balanced speed v = E/B = ${fmtSpeed(selectorSpeed(s.E, s.B))}`,
    path ? (path.passes ? "Result: passes through the slit" : path.hit ? "Result: hits a plate" : "Result: misses the slit") : "",
    `Slow motion: 1 s on screen = ${fmt(SEL_SLOWMO, "s")}`
  ].join("\n");
}
function readBox() {
  const b = st.box, P = PARTICLES[b.part], p = b.p;
  if (!p) return "";
  const f = boxFields()(p.x, p.y), v = Math.hypot(p.vx, p.vy);
  const F = lorentz(P.q, p.vx, p.vy, f.Ex, f.Ey, f.Bz);
  const out = [
    `${P.name}: speed ${fmtSpeed(v)}`,
    `Kinetic energy: ${fmt(kineticEnergyEV(P.m, v), "eV")}`,
    `Net force: ${fmt(Math.hypot(F.x, F.y), "N")}`
  ];
  if (b.Bon) out.push(`Circle radius in uniform B (no E): ${fmtLength(cyclotronRadius(P.m, P.q, v, b.B))}`);
  if (b.status) out.push(b.status);
  return out.join("\n");
}
const NOTES = {
  field: "Drag the charges or the test charge. Each charge makes its own field E = kq/r\u00b2, pointing away from + and toward \u2212. The net field is the vector sum (superposition). Dashed arrows: each charge's part; solid arrow: the net field. Field lines start on + charges and end on \u2212 charges; where they crowd together the field is stronger.",
  potential: "Potential adds as plain numbers, V = \u03a3 kq/r, with no directions. Red lines are positive potential, blue lines negative. The field points from high to low potential and crosses every equipotential at a right angle. Moving a charge along an equipotential takes no work.",
  magnetic: "Each long straight wire runs into or out of the page. Its field circles the wire (right-hand rule: thumb along the current, fingers curl along B) with B = \u03bc\u2080I/(2\u03c0r). Compass needles line up with the net field; their red end points along B. These compasses feel only the wires; Earth's own field (roughly 25 to 65 \u00b5T) is left out. Parallel currents attract; opposite currents repel.",
  cyclotron: "A magnetic force is always at right angles to the motion, so it bends the path into a circle but never changes the speed. Faster particles make bigger circles, but the time for one lap does not depend on speed. That is the idea behind the cyclotron.",
  selector: "Between the plates, the electric force pushes one way and the magnetic force the other. They cancel only when v = E/B, so only particles at that speed go straight through the slit. The answer does not depend on the particle's charge or mass.",
  sandbox: "Free play. Pick a tool and tap the field to place charges or wires, set uniform fields, then Run. Wire fields lie in the page, so for a particle moving in the page they push straight into or out of the page; this flat view follows motion in the page only, so wires do not steer the particle here. Only the uniform B (into or out of the page) bends it."
};

// ---------- sync ----------
function setMode(m) {
  st.mode = m;
  for (const s of $$("[data-panel]")) s.hidden = s.dataset.panel !== m;
  for (const b of $$(".toolbar .tool")) b.setAttribute("aria-pressed", String(b.dataset.show === m));
  if (m === "selector") fireSel();
  if (m === "sandbox" && !st.box.p) { resetBox(); if (reducedMotion) precomputeBox(); }
  sync();
}
for (const b of $$(".toolbar .tool")) b.addEventListener("click", () => setMode(b.dataset.show));

function writeUrl() {
  const p = new URLSearchParams(location.search);
  p.set("mode", st.mode);
  history.replaceState(null, "", "?" + p.toString());
}
function sync() {
  const P = panel(); if (!P) return;
  for (const el of $$("[data-slider]", P)) {
    const k = el.dataset.slider, v = sliderGet[k]();
    el.value = String(toSlider(k, v));
    const out = $$(`[data-out="${k}"]`, P)[0]; if (out) out.textContent = sliderFmt[k](v);
    el.disabled = (k === "charge" && !selCharge()) || (k === "current" && !selWire());
  }
  for (const b of $$("[data-toggle]", P)) {
    const k = b.dataset.toggle;
    const on = k === "boxEOn" ? st.box.Eon : k === "boxBOn" ? st.box.Bon : k === "lines" && st.mode === "potential" ? st.show.potLines : st.show[k];
    b.setAttribute("aria-pressed", String(!!on));
  }
  for (const b of $$("[data-tool]", P)) b.setAttribute("aria-pressed", String(b.dataset.tool === st.box.tool));
  for (const b of $$("[data-bdir]", P)) b.setAttribute("aria-pressed", String(Number(b.dataset.bdir) === st.cyc.dir));
  for (const b of $$("[data-edir]", P)) b.setAttribute("aria-pressed", String(st.box.Eon && Number(b.dataset.edir) === st.box.Edir));
  for (const b of $$("[data-boxbdir]", P)) b.setAttribute("aria-pressed", String(st.box.Bon && Number(b.dataset.boxbdir) === st.box.Bdir));
  for (const b of $$("[data-vdir]", P)) b.setAttribute("aria-pressed", String(Number(b.dataset.vdir) === st.box.vdir));
  const partOf = { cyclotron: st.cyc.part, selector: st.selr.part, sandbox: st.box.part }[st.mode];
  for (const b of $$("[data-part]", P)) b.setAttribute("aria-pressed", String(b.dataset.part === partOf));
  for (const b of $$("[data-flip], [data-remove]", P)) b.disabled = !selCharge();
  for (const b of $$("[data-flipwire], [data-removewire]", P)) b.disabled = !selWire();
  for (const b of $$("[data-run]", P)) b.textContent = st.mode === "cyclotron" ? (st.cyc.running ? "Pause" : "Play") : (st.box.running ? "Pause" : "Run");
  const read = { field: readField, potential: readPotential, magnetic: readMagnetic, cyclotron: readCyc, selector: readSel, sandbox: readBox }[st.mode];
  $$("[data-read]", P)[0].textContent = read();
  $$("[data-note]", P)[0].textContent = NOTES[st.mode];
  $("canvasHint").textContent = {
    field: "Drag a charge or the test charge (dashed ring).", potential: "Drag a charge or the test charge (dashed ring).",
    magnetic: "Drag a wire or the probe (dashed ring).", cyclotron: "", selector: "Top plate +, bottom plate \u2212. B points into the page.",
    sandbox: st.box.tool === "move" ? "Drag charges, wires or the launch point (dashed ring)." : "Tap the field to use the selected tool."
  }[st.mode];
  writeUrl();
  dirty = true;
}

// ---------- draw ----------
function resize() {
  const r = canvas.getBoundingClientRect();
  const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
  if (w === W && h === H) return;
  W = w; H = h; canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); dirty = true;
}
function draw(now) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = T.paper; ctx.fillRect(0, 0, W, H);
  const V = view();
  if (st.mode === "field" || st.mode === "potential") {
    if (st.mode === "potential") drawEquipotentials(ctx, V, T, st.charges);
    if (st.mode === "field" ? st.show.lines : st.show.potLines) drawFieldLines(ctx, V, T, st.charges);
    if (st.mode === "field" && st.show.vectors) drawVectorGrid(ctx, V, T, (x, y) => eField(st.charges, x, y), T.efield, 300);
    drawCharges(ctx, V, T, img, st.charges, st.sel);
    let parts = null;
    if (st.mode === "field") {
      const list = st.show.parts && st.charges.length > 1 ? st.charges.map((c) => ({ ...eFieldFrom(c, st.test.x, st.test.y), color: c.q > 0 ? T.pos : T.neg })) : [];
      parts = { list, net: eField(st.charges, st.test.x, st.test.y), ref: 300 };
    }
    drawTestCharge(ctx, V, T, img, st.test, parts);
    drawScaleBar(ctx, V, T, 0.05, "5 cm");
  } else if (st.mode === "magnetic") {
    if (st.show.blines) drawBLines(ctx, V, T, st.wires);
    if (st.show.compass) drawCompasses(ctx, V, T, img, st.wires);
    drawWires(ctx, V, T, st.wires, st.selWire);
    const B = bField(st.wires, st.probe.x, st.probe.y);
    drawTestCharge(ctx, V, T, {}, st.probe, { list: [], net: B, ref: 3e-6 });
    drawScaleBar(ctx, V, T, 0.05, "5 cm");
  } else if (st.mode === "cyclotron") {
    drawUniformB(ctx, V, T, st.cyc.dir);
    const c = cycState();
    ctx.strokeStyle = T.path; ctx.globalAlpha = 0.35; ctx.lineWidth = 1.5; ctx.setLineDash([5, 5]);
    ctx.beginPath(); ctx.arc(V.toX(0), V.toY(0), c.r * V.s, 0, 7); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
    drawParticle(ctx, V, T, img, c, null, c.P);
    drawScaleBar(ctx, V, T, 0.1, "10 cm");
  } else if (st.mode === "selector") {
    const s = st.selr, P = PARTICLES[s.part];
    if (!s.path) s.path = selectorPath(P, s.v, s.E, s.B);
    drawSelector(ctx, V, T, img, s);
    const pts = s.path.pts;
    const tNow = reducedMotion ? Infinity : (now - s.t0) / 1000 * SEL_SLOWMO;
    const shown = pts.filter((p) => p.t <= tNow);
    const last = shown[shown.length - 1] || pts[0];
    let vx = s.v, vy = 0;
    const k = shown.length;
    if (k > 1) { vx = (last.x - shown[k - 2].x); vy = (last.y - shown[k - 2].y); }
    drawParticle(ctx, V, T, img, { x: last.x, y: last.y, vx, vy }, shown, P);
    if (shown.length < pts.length) dirty = true;
    drawScaleBar(ctx, V, T, 0.05, "5 cm");
  } else {
    const b = st.box;
    drawUniformB(ctx, V, T, b.Bon ? b.Bdir : 0);
    if (st.show.equip) drawEquipotentials(ctx, V, T, b.charges, false);
    if (st.show.blines) drawBLines(ctx, V, T, b.wires);
    if (st.show.lines) drawFieldLines(ctx, V, T, b.charges);
    if (st.show.vectors) { const f = boxFields(); drawVectorGrid(ctx, V, T, (x, y) => { const e = f(x, y); return { x: e.Ex, y: e.Ey }; }, T.efield, 300); }
    drawCharges(ctx, V, T, img, b.charges, boxSel);
    drawWires(ctx, V, T, b.wires, boxSelWire);
    ctx.strokeStyle = T.gold; ctx.lineWidth = 2; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.arc(V.toX(b.launch.x), V.toY(b.launch.y), 22, 0, 7); ctx.stroke(); ctx.setLineDash([]);
    if (b.Eon) {
      const rad = b.Edir * Math.PI / 180;
      ctx.fillStyle = T.ink; ctx.font = "12px ui-monospace, Menlo, monospace"; ctx.textAlign = "right";
      ctx.fillText(`uniform E ${fmt(b.E, "V/m")}`, W - 40, 22);
      drawArrowSmall(W - 22, 18, Math.cos(rad), -Math.sin(rad));
    }
    drawParticle(ctx, V, T, img, b.p, b.trail, PARTICLES[b.part]);
    drawScaleBar(ctx, V, T, 0.05, "5 cm");
  }
}
function drawArrowSmall(x, y, ux, uy) {
  ctx.strokeStyle = T.ink; ctx.fillStyle = T.ink; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x - ux * 12, y - uy * 12); ctx.lineTo(x + ux * 8, y + uy * 8); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + ux * 14, y + uy * 14); ctx.lineTo(x + ux * 6 - uy * 5, y + uy * 6 + ux * 5); ctx.lineTo(x + ux * 6 + uy * 5, y + uy * 6 - ux * 5); ctx.fill();
}

let last = performance.now(), readTick = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (!document.hidden && !reducedMotion) {
    if (st.mode === "cyclotron" && st.cyc.running) { st.cyc.t += dt * CYC_SLOWMO; dirty = true; }
    if (st.mode === "sandbox" && st.box.running) {
      stepBox(dt); dirty = true;
      if (now - readTick > 200 || !st.box.running) { readTick = now; sync(); }
    }
  } else if (reducedMotion && st.mode === "sandbox" && st.box.running) { precomputeBox(); sync(); }
  if (dirty) { dirty = false; resize(); draw(now); }
  requestAnimationFrame(frame);
}

$("studyBackBtn").addEventListener("click", (e) => {
  e.preventDefault();
  // Back to the Study library with the board return keys only: drop this
  // module's mode, preset and particle from the URL, then hand over the query.
  const qs = forwardStudyQuery(location.search).toString();
  history.replaceState(null, "", qs ? "?" + qs : location.pathname);
  location.href = "study.html" + location.search;
});

window.addEventListener("resize", () => { resize(); dirty = true; });
new ResizeObserver(() => { resize(); dirty = true; }).observe(canvas);
if (reducedMotion) st.cyc.running = false;
setMode(MODES.includes(st.mode) ? st.mode : "field");
requestAnimationFrame(frame);
// Read-only hook for the browser checks.
window.__emfields = { state: st };
