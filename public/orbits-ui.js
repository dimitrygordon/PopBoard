// Orbital Mechanics & Gravity Playground: page wiring.
// Physics lives in orbits-physics.js, drawing in orbits-render.js.
// Direct manipulation only: tap to place, pull back to sling, drag bodies,
// pinch or scroll to zoom. No sliders.

import { forwardStudyQuery } from "./board-return.js?v=20261022a";
import { createRenderer, drawRadius } from "./orbits-render.js";
import {
  buildPreset, PRESETS, modeFromSearch, step, predict, makeBody, MAX_BODIES,
  circularVelocity, escapeVelocity, lagrangePoints, orbitalElements, detectResonance,
  dominantBody, createStabilityTracker, specificEnergy
} from "./orbits-physics.js";

const canvas = document.getElementById("orbitsCanvas");
const readout = document.getElementById("readout");
const statusLine = document.getElementById("statusLine");
const stableBadge = document.getElementById("stableBadge");
const deleteBtn = document.getElementById("deleteBtn");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const renderer = createRenderer(canvas, { reducedMotion });

const MASSES = {
  planet: [{ label: "S", name: "small", m: 3e-6 }, { label: "M", name: "medium", m: 1e-4 }, { label: "L", name: "large", m: 1e-3 }],
  star: [{ label: "S", name: "small", m: 0.1 }, { label: "M", name: "medium", m: 0.5 }, { label: "L", name: "large", m: 1 }]
};
const WARPS = [1, 4, 16, 0.25];
const BASE_RATE = 1.0;           // simulation time units per real second at 1x
const TRAIL_POINTS = reducedMotion ? 120 : (parseInt(getComputedStyle(document.documentElement).getPropertyValue("--ob-trail-length"), 10) || 240);
const TAP_PX = 8;

const state = {
  mode: modeFromSearch(location.search),
  sys: null,
  tool: "planet",
  massIdx: 1,
  warpIdx: 0,
  paused: reducedMotion,
  showLagrange: false,
  showEscape: false,
  selectedId: null,
  trails: new Map(),
  ghost: null,
  ghostAge: 0,
  pointer: null,
  tracker: null,
  cam: { x: 0, y: 0, scale: 150 },
  view: { w: 0, h: 0, dpr: 1 }
};

// ---------- scene ----------

function loadScene(mode) {
  state.mode = PRESETS[mode] ? mode : "sandbox";
  state.sys = buildPreset(state.mode);
  state.trails.clear();
  state.selectedId = null;
  state.ghost = null;
  state.tracker = null;
  if (state.mode === "trojans") state.showLagrange = true;
  syncToggles();
  fitCamera();
  renderPresetMenu();
  const url = new URL(location.href);
  if (state.mode === "sandbox") url.searchParams.delete("mode"); else url.searchParams.set("mode", state.mode);
  history.replaceState(null, "", url);
  toast(PRESETS[state.mode].label + (state.mode === "challenge" ? ": drop a planet and keep it stable for 10 orbits" : ""));
}

function fitCamera() {
  const bs = state.sys.bodies;
  let ext = 1.5;
  for (const b of bs) ext = Math.max(ext, Math.hypot(b.x, b.y) * 1.25);
  const { w, h } = state.view;
  state.cam.x = 0; state.cam.y = 0;
  state.cam.scale = Math.max(4, Math.min(w, h - 140) / (2 * ext));
}

// ---------- coordinates ----------

const toWorld = (px, py) => ({
  x: (px - state.view.w / 2) / state.cam.scale + state.cam.x,
  y: -(py - state.view.h / 2) / state.cam.scale + state.cam.y
});

function hitBody(px, py) {
  let best = null, bestD = Infinity;
  for (const b of state.sys.bodies) {
    const sx = (b.x - state.cam.x) * state.cam.scale + state.view.w / 2;
    const sy = -(b.y - state.cam.y) * state.cam.scale + state.view.h / 2;
    const d = Math.hypot(sx - px, sy - py);
    // At least a 44px target: radius 22.
    if (d <= Math.max(22, drawRadius(b, state.cam.scale) + 6) && d < bestD) { best = b; bestD = d; }
  }
  return best;
}

const selected = () => state.sys.bodies.find((b) => b.id === state.selectedId) || null;

// ---------- input ----------

const pointers = new Map();
let gesture = null;

canvas.addEventListener("pointerdown", (e) => {
  canvas.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, { x: e.offsetX, y: e.offsetY });
  closePresetMenu();
  if (pointers.size === 2) { startPinch(); return; }
  if (pointers.size > 2) return;
  const hit = hitBody(e.offsetX, e.offsetY);
  const panButton = e.button === 1 || e.button === 2;
  if (hit && !panButton) {
    state.selectedId = hit.id;
    gesture = { type: "drag", id: hit.id, sx: e.offsetX, sy: e.offsetY, moved: false, last: toWorld(e.offsetX, e.offsetY), lastT: performance.now(), vx: 0, vy: 0 };
  } else if (state.tool === "pan" || panButton) {
    gesture = { type: "pan", sx: e.offsetX, sy: e.offsetY, cx: state.cam.x, cy: state.cam.y };
  } else {
    if (state.sys.bodies.length >= MAX_BODIES) { toast("That's a full sky. Remove something first."); return; }
    const w = toWorld(e.offsetX, e.offsetY);
    gesture = { type: "place", wx: w.x, wy: w.y, sx: e.offsetX, sy: e.offsetY, px: e.offsetX, py: e.offsetY };
    updateSlingGhost();
  }
});

canvas.addEventListener("pointermove", (e) => {
  state.pointer = { x: e.offsetX, y: e.offsetY };
  if (!pointers.has(e.pointerId)) return;
  pointers.set(e.pointerId, { x: e.offsetX, y: e.offsetY });
  if (gesture && gesture.type === "pinch") { movePinch(); return; }
  if (!gesture) return;
  if (gesture.type === "pan") {
    state.cam.x = gesture.cx - (e.offsetX - gesture.sx) / state.cam.scale;
    state.cam.y = gesture.cy + (e.offsetY - gesture.sy) / state.cam.scale;
  } else if (gesture.type === "drag") {
    const b = state.sys.bodies.find((x) => x.id === gesture.id);
    if (!b) { gesture = null; return; }
    if (Math.hypot(e.offsetX - gesture.sx, e.offsetY - gesture.sy) > TAP_PX) gesture.moved = true;
    if (!gesture.moved) return;
    const w = toWorld(e.offsetX, e.offsetY), now = performance.now();
    const dt = Math.max(1, now - gesture.lastT) / 1000;
    // Track hand velocity so a flick throws the body (scaled to sim time).
    gesture.vx = 0.7 * gesture.vx + 0.3 * (w.x - gesture.last.x) / dt / (BASE_RATE * 4);
    gesture.vy = 0.7 * gesture.vy + 0.3 * (w.y - gesture.last.y) / dt / (BASE_RATE * 4);
    gesture.last = w; gesture.lastT = now;
    b.x = w.x; b.y = w.y;
    state.trails.delete(b.id);
  } else if (gesture.type === "place") {
    gesture.px = e.offsetX; gesture.py = e.offsetY;
    updateSlingGhost();
  }
});

function endPointer(e) {
  pointers.delete(e.pointerId);
  if (gesture && gesture.type === "pinch") { if (pointers.size < 2) gesture = null; return; }
  if (!gesture) return;
  if (gesture.type === "place") {
    const pull = Math.hypot(gesture.px - gesture.sx, gesture.py - gesture.sy);
    addBody(gesture, pull <= TAP_PX);
  } else if (gesture.type === "drag") {
    const b = state.sys.bodies.find((x) => x.id === gesture.id);
    if (b && gesture.moved) {
      // A slow drop keeps a circular orbit around whatever dominates there.
      const fling = Math.hypot(gesture.vx, gesture.vy);
      if (performance.now() - gesture.lastT > 120 || fling < 0.05) {
        if (b.kind === "star") { b.vx = 0; b.vy = 0; } else { const v = circularVelocity(state.sys, b.x, b.y, dominantBody(state.sys, b.x, b.y, b)); b.vx = v.vx; b.vy = v.vy; }
      } else { b.vx = gesture.vx; b.vy = gesture.vy; }
    }
    state.ghostAge = 999;
  }
  gesture = null;
  state.ghost = null;
}
canvas.addEventListener("pointerup", endPointer);
canvas.addEventListener("pointercancel", endPointer);
canvas.addEventListener("pointerleave", () => { if (!gesture) state.pointer = null; });
canvas.addEventListener("contextmenu", (e) => e.preventDefault());

canvas.addEventListener("wheel", (e) => {
  e.preventDefault();
  zoomAt(e.offsetX, e.offsetY, Math.exp(-e.deltaY * 0.0015));
}, { passive: false });

function zoomAt(px, py, f) {
  const before = toWorld(px, py);
  state.cam.scale = Math.min(4000, Math.max(2, state.cam.scale * f));
  const after = toWorld(px, py);
  state.cam.x += before.x - after.x; state.cam.y += before.y - after.y;
}

function pinchInfo() {
  const [a, b] = [...pointers.values()];
  return { cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, d: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)) };
}
function startPinch() { gesture = { type: "pinch", ...pinchInfo() }; state.ghost = null; }
function movePinch() {
  const p = pinchInfo();
  zoomAt(p.cx, p.cy, p.d / gesture.d);
  state.cam.x -= (p.cx - gesture.cx) / state.cam.scale;
  state.cam.y += (p.cy - gesture.cy) / state.cam.scale;
  Object.assign(gesture, p);
}

// Slingshot: velocity points from the drag point back through the anchor.
function slingVelocity(g) {
  const dxPx = g.sx - g.px, dyPx = g.sy - g.py;
  return { vx: dxPx / state.cam.scale, vy: -dyPx / state.cam.scale };
}

function newBodySpec(g, tap) {
  const kind = state.tool === "star" ? "star" : "planet";
  const m = MASSES[kind][state.massIdx].m;
  let v = slingVelocity(g);
  if (tap) {
    if (kind === "star") v = { vx: 0, vy: 0 };
    else { const c = circularVelocity(state.sys, g.wx, g.wy); v = { vx: c.vx, vy: c.vy }; }
  }
  return { kind, m, x: g.wx, y: g.wy, vx: v.vx, vy: v.vy };
}

function updateSlingGhost() {
  const g = gesture;
  const pull = Math.hypot(g.px - g.sx, g.py - g.sy);
  const spec = { id: "__ghost", ...newBodySpec(g, pull <= TAP_PX) };
  const res = predict(state.sys, { extra: spec, steps: 260, dt: 0.025 });
  const path = res.paths.__ghost || [];
  const gone = res.events.find((ev) => ev.id === "__ghost" || ev.absorbed === "__ghost");
  state.ghost = { paths: [path], end: gone && path.length >= 2 ? { x: path[path.length - 2], y: path[path.length - 1] } : null, spec };
}

function addBody(g, tap) {
  const spec = newBodySpec(g, tap);
  const b = makeBody(spec);
  b.name = spec.kind === "star" ? "Star" : "Planet";
  state.sys.bodies.push(b);
  state.selectedId = b.id;
  state.ghostAge = 999;
  if (state.mode === "challenge" && b.kind !== "star") {
    const c = dominantBody(state.sys, b.x, b.y, b);
    state.tracker = c ? createStabilityTracker(state.sys, b.id, c.id, { orbits: 10 }) : null;
    if (state.tracker && state.tracker.status === "failed") toast("Not bound. Try a gentler pull.");
  }
}

// ---------- toolbar ----------

const $ = (id) => document.getElementById(id);
document.querySelectorAll("[data-tool]").forEach((btn) => btn.addEventListener("click", () => {
  state.tool = btn.dataset.tool;
  document.querySelectorAll("[data-tool]").forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
  canvas.style.cursor = state.tool === "pan" ? "grab" : "crosshair";
  syncMass();
}));
$("massBtn").addEventListener("click", () => { state.massIdx = (state.massIdx + 1) % 3; syncMass(); });
function syncMass() {
  const kind = state.tool === "star" ? "star" : "planet";
  const m = MASSES[kind][state.massIdx];
  $("massBadge").textContent = m.label;
  $("massBtn").setAttribute("aria-label", `Mass: ${m.name} ${kind}`);
}
$("playBtn").addEventListener("click", () => { state.paused = !state.paused; syncPlay(); });
function syncPlay() {
  $("playBtn").classList.toggle("paused", state.paused);
  $("playBtn").setAttribute("aria-label", state.paused ? "Play" : "Pause");
}
$("warpBtn").addEventListener("click", () => {
  state.warpIdx = (state.warpIdx + 1) % WARPS.length;
  const w = WARPS[state.warpIdx], label = (w < 1 ? "¼" : w) + "×";
  $("warpBadge").textContent = label;
  $("warpBtn").setAttribute("aria-label", "Time warp " + label);
});
$("lagrangeBtn").addEventListener("click", () => { state.showLagrange = !state.showLagrange; syncToggles(); });
$("escapeBtn").addEventListener("click", () => { state.showEscape = !state.showEscape; syncToggles(); });
function syncToggles() {
  $("lagrangeBtn").setAttribute("aria-pressed", String(state.showLagrange));
  $("escapeBtn").setAttribute("aria-pressed", String(state.showEscape));
}
function deleteSelected() {
  const id = state.selectedId;
  if (!id) return;
  const gone = state.sys.bodies.find((b) => b.id === id);
  state.sys.bodies = state.sys.bodies.filter((b) => b.id !== id);
  state.trails.delete(id); state.selectedId = null; state.ghost = null;
  if (state.tracker && gone) state.tracker = null;
  toast((gone && gone.name ? gone.name : "Body") + " deleted");
}
$("deleteBtn").addEventListener("click", deleteSelected);
$("resetBtn").addEventListener("click", () => loadScene(state.mode));

const presetMenu = $("presetMenu");
$("presetBtn").addEventListener("click", () => {
  const open = presetMenu.hidden;
  presetMenu.hidden = !open;
  $("presetBtn").setAttribute("aria-expanded", String(open));
});
function closePresetMenu() { presetMenu.hidden = true; $("presetBtn").setAttribute("aria-expanded", "false"); }
function renderPresetMenu() {
  presetMenu.replaceChildren(...Object.entries(PRESETS).map(([k, p]) => {
    const b = document.createElement("button");
    b.type = "button"; b.setAttribute("role", "menuitem"); b.textContent = p.label;
    if (k === state.mode) b.setAttribute("aria-current", "true");
    b.addEventListener("click", () => { closePresetMenu(); loadScene(k); });
    return b;
  }));
}

document.addEventListener("keydown", (e) => {
  if (e.target.closest && e.target.closest("button") && (e.key === " " || e.key === "Enter")) return;
  if (e.key === " ") { e.preventDefault(); state.paused = !state.paused; syncPlay(); }
  else if ((e.key === "Delete" || e.key === "Backspace") && state.selectedId) deleteSelected(); else if (e.key === "Escape") { closePresetMenu(); state.selectedId = null; }
});

// Back: same contract as the Mechanics Playground.
document.addEventListener("click", (event) => {
  const back = event.target.closest && event.target.closest("[data-study-back]");
  if (!back) return;
  event.preventDefault();
  forwardStudyQuery(location.search);
  location.href = "study.html" + location.search;
});

// ---------- events and readout ----------

let toastTimer = 0;
function toast(msg) {
  statusLine.textContent = msg;
  statusLine.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => statusLine.classList.remove("show"), 2600);
}

function handleEvents() {
  const evs = state.sys.events.splice(0);
  for (const ev of evs) {
    const at = state.sys.bodies.find((b) => b.id === ev.id) || ev.at;
    if (at) renderer.burst(at.x, at.y, ev.type);
    state.trails.delete(ev.absorbed); state.trails.delete(ev.id);
    if (ev.absorbed === state.selectedId) state.selectedId = ev.id;
    if (ev.type === "star-fall") toast("Swallowed by the star");
    else if (ev.type === "merge") toast("Collision! The bodies merged");
    else if (ev.type === "star-merge") toast("Two stars merged");
    else if (ev.type === "ejected") { toast("Ejected from the system"); if (ev.id === state.selectedId) state.selectedId = null; }
  }
}

function lagrangeTargets() {
  const bs = [...state.sys.bodies].sort((a, b) => b.m - a.m);
  if (bs.length < 2) return null;
  const sel = selected();
  const primary = bs[0];
  const secondary = sel && sel !== primary ? sel : bs[1];
  return lagrangePoints(primary, secondary);
}

const fmt = (v, d = 2) => (Number.isFinite(v) ? v.toFixed(d) : "∞");

function updateReadout() {
  const lines = [`t ${fmt(state.sys.t / (2 * Math.PI), 1)} yr · ${state.sys.bodies.length} bodies${state.paused ? " · paused" : ""}`];
  const sel = selected();
  if (sel) {
    const c = dominantBody(state.sys, sel.x, sel.y, sel);
    lines.push(`${sel.name || sel.kind} · m ${sel.m.toPrecision(2)}`);
    if (c) {
      const el = orbitalElements(sel, c);
      const v = Math.hypot(sel.vx - c.vx, sel.vy - c.vy);
      lines.push(`v ${fmt(v)} · a ${fmt(el.a)} · e ${fmt(el.e)} · P ${fmt(el.period / (2 * Math.PI))} yr`);
      if (state.showEscape) {
        const ve = escapeVelocity(state.sys, sel.x, sel.y);
        const bound = specificEnergy(state.sys, sel).energy < 0;
        lines.push(`v_esc ${fmt(ve)} · v_circ ${fmt(circularVelocity(state.sys, sel.x, sel.y, c).speed)} · ${bound ? "bound" : "escaping"}`);
      }
    }
  } else if (state.showEscape && state.pointer) {
    const w = toWorld(state.pointer.x, state.pointer.y);
    lines.push(`here: v_esc ${fmt(escapeVelocity(state.sys, w.x, w.y))} · v_circ ${fmt(circularVelocity(state.sys, w.x, w.y).speed)}`);
  }
  const res = findResonance();
  if (res) lines.push(`resonance ${res.label} (${res.names})`);
  stableBadge.hidden = !(state.tracker && state.tracker.status === "passed");
  if (state.tracker) {
    const t = state.tracker;
    lines.push(t.status === "passed" ? "Challenge: stable for 10 orbits ✓" : t.status === "failed" ? `Challenge failed: ${t.reason}` : `Challenge: ${t.orbits.toFixed(1)} / 10 orbits`);
  }
  if (state.ghost && state.ghost.spec) {
    const s = state.ghost.spec;
    lines.push(`launch ${fmt(Math.hypot(s.vx, s.vy))}`);
  }
  readout.textContent = lines.join("\n");
}

function findResonance() {
  const bs = state.sys.bodies;
  const star = [...bs].sort((a, b) => b.m - a.m)[0];
  if (!star) return null;
  const planets = bs.filter((b) => b !== star && b.m > 1e-8 && b.m < star.m * 0.05)
    .map((b) => ({ b, el: orbitalElements(b, star) })).filter((p) => p.el.bound && p.el.e < 0.5);
  for (let i = 0; i < planets.length; i++) for (let j = i + 1; j < planets.length; j++) {
    const r = detectResonance(planets[i].el.period, planets[j].el.period, { maxInt: 4, tol: 0.015 });
    if (r && r.p !== r.q) return { ...r, names: `${planets[i].b.name || "planet"} / ${planets[j].b.name || "planet"}` };
  }
  return null;
}

// ---------- loop ----------

// Render scale: device pixels capped at 2, dropped toward 1 when frames run long.
let dprCap = 2, slowFrames = 0;
function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, dprCap);
  const w = window.innerWidth, h = window.innerHeight;
  const first = state.view.w === 0;
  state.view = { w, h, dpr };
  canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
  renderer.refreshTokens();
  if (first && state.sys) fitCamera();
}

let last = performance.now();
let readoutTick = 0;
function frame(now) {
  const real = Math.min(0.05, (now - last) / 1000);
  if (real > 0.028) slowFrames++; else slowFrames = Math.max(0, slowFrames - 1);
  if (slowFrames > 30 && dprCap > 1) { dprCap = Math.max(1, dprCap - 0.5); slowFrames = 0; resize(); }
  last = now;
  const dragging = gesture && gesture.type === "drag" && gesture.moved;
  if (!state.paused && !dragging) {
    step(state.sys, real * BASE_RATE * 4 * WARPS[state.warpIdx]);
    handleEvents();
    if (state.tracker) state.tracker.update(state.sys);
    for (const b of state.sys.bodies) {
      let t = state.trails.get(b.id);
      if (!t) state.trails.set(b.id, (t = []));
      t.push(b.x, b.y);
      if (t.length > TRAIL_POINTS * 2) t.splice(0, t.length - TRAIL_POINTS * 2);
    }
  }
  // Ghost path for the selected body, refreshed a few times a second.
  if (!gesture || gesture.type !== "place") {
    const sel = selected();
    state.ghostAge++;
    if (sel && state.ghostAge > 15) {
      const res = predict(state.sys, { steps: 220, dt: 0.03 });
      state.ghost = { paths: [res.paths[sel.id] || []] };
      state.ghostAge = 0;
    } else if (!sel) state.ghost = null;
  }
  renderer.draw({
    ...state.view,
    cam: state.cam,
    time: now / 1000,
    now,
    bodies: state.sys.bodies,
    selectedId: state.selectedId,
    trails: [...state.trails.values()],
    ghost: state.ghost,
    lagrange: state.showLagrange ? lagrangeTargets() : null,
    sling: gesture && gesture.type === "place" ? { x: gesture.wx, y: gesture.wy, px: gesture.px, py: gesture.py, kind: state.tool === "star" ? "star" : "planet", m: 0 } : null,
    escape: state.showEscape && state.pointer && !selected() ? toWorld(state.pointer.x, state.pointer.y) : null
  });
  const delHidden = !selected();
  if (deleteBtn.hidden !== delHidden) deleteBtn.hidden = delHidden;
  if (++readoutTick % 6 === 0) updateReadout();
  requestAnimationFrame(frame);
}

window.addEventListener("resize", resize);
if (window.visualViewport) window.visualViewport.addEventListener("resize", resize);
resize();
loadScene(state.mode);
syncMass(); syncPlay(); syncToggles();
if (reducedMotion) toast("Reduced motion: paused. Press play to run.");
updateReadout();
requestAnimationFrame(frame);
