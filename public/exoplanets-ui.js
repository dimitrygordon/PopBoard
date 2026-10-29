// Exoplanet Hunter: page wiring and direct manipulation.
// Physics and synthetic data: exoplanets-physics.js. Drawing: exoplanets-render.js.

import { forwardStudyQuery } from "./board-return.js?v=20261022a";
import { loadSprites, readTokens, fluxRange, drawLightCurve, drawFold, drawRV, drawOrbit, drawInclination } from "./exoplanets-render.js";
import {
  generateField, generateTarget, modeFromSearch, seedFromSearch, phaseFold, binPhase, bls, modelFlux,
  radiusFromDepth, massFromK, semiMajorAxis, habitableZone, scoreVerdict, truthSummary, bulkDensity, insolation,
  orbitState, BINARY_CAPTION, M_SUN, R_SUN, R_EARTH, M_EARTH, AU, DAY
} from "./exoplanets-physics.js";

const $ = (id) => document.getElementById(id);
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let T = readTokens();
const S = loadSprites(() => markAll());
const mode = modeFromSearch(location.search);
const FIELD_SEED = seedFromSearch(location.search) || 2026;
const field = generateField(FIELD_SEED, 12);
const done = new Map();

const st = {
  target: null, truth: null, pg: null, yRange: [0.99, 1.01],
  period: 10, t0: 0, depth: 0.001, K: 10, inc: Math.PI / 2,
  x0: 0, x1: 10, kind: null, edited: {}, revealed: false, showModel: false,
  active: "lightcurve", paused: reducedMotion, simT: 0, dpr: Math.min(2, window.devicePixelRatio || 1), slow: 0
};
const panels = {
  lightcurve: { canvas: $("lcCanvas") }, fold: { canvas: $("foldCanvas") }, rv: { canvas: $("rvCanvas") },
  orbit: { canvas: $("orbitCanvas") }, inclination: { canvas: $("incCanvas") }
};
for (const p of Object.values(panels)) { p.ctx = p.canvas.getContext("2d"); p.dirty = true; p.w = p.h = 0; }

// ---------- star field ----------

function buildField() {
  const box = $("fieldStars");
  box.textContent = "";
  field.forEach((s, i) => {
    // Cheap preview: the star class only (no data generated until picked).
    const tgt = generateTarget(s.seed);
    s.cls = tgt.star.spectral; s.name = tgt.name;
    const b = document.createElement("button");
    b.type = "button"; b.className = "field-star ex-marker"; b.setAttribute("role", "option");
    b.setAttribute("aria-selected", "false");
    b.setAttribute("aria-label", `${s.name}, ${s.cls}-type star${done.has(s.seed) ? ", solved" : ""}`);
    b.style.left = (s.x * 100) + "%"; b.style.top = (s.y * 100) + "%";
    b.style.color = T.star[s.cls];
    b.innerHTML = `<img alt="" src="exoplanets/assets/img/star_marker_idle.webp"><span class="core"></span><span class="lab">${s.name}${done.has(s.seed) ? " ✓ " + done.get(s.seed) : ""}</span>`;
    if (done.has(s.seed)) b.classList.add("done");
    b.addEventListener("pointerenter", () => { b.querySelector("img").src = "exoplanets/assets/img/star_marker_hover.webp"; });
    b.addEventListener("pointerleave", () => { b.querySelector("img").src = "exoplanets/assets/img/star_marker_idle.webp"; });
    b.addEventListener("click", () => { lastSeed = s.seed; openTarget(s.seed); });
    b.dataset.seed = s.seed;
    box.appendChild(b);
  });
  layoutField();
}

// ---------- phone field layout ----------
// Below 600px: stars are spread so no two crosshairs sit within 48px, only the last tapped star and its
// 3 nearest neighbors are labeled, and labels are clamped inside the stage with 8px padding.
const PHONE_FIELD = matchMedia("(max-width: 599.98px)");
const MIN_GAP = 48, LABEL_PAD = 8;
let lastSeed = null;
function spread(pts, w, h, pad) {
  const P = pts.map((p) => ({ x: pad + p.x * (w - 2 * pad), y: pad + p.y * (h - 2 * pad) }));
  for (let it = 0; it < 200; it++) {
    let moved = false;
    for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) {
      let dx = P[j].x - P[i].x, dy = P[j].y - P[i].y, d = Math.hypot(dx, dy);
      if (d >= MIN_GAP + 0.5) continue;
      if (d < 1e-3) { dx = 1; dy = 0; d = 1; }
      const push = (MIN_GAP + 1 - d) / 2, ux = dx / d, uy = dy / d;
      P[i].x -= ux * push; P[i].y -= uy * push; P[j].x += ux * push; P[j].y += uy * push; moved = true;
    }
    for (const q of P) { q.x = Math.max(pad, Math.min(w - pad, q.x)); q.y = Math.max(pad, Math.min(h - pad, q.y)); }
    if (!moved) break;
  }
  return P;
}
function layoutField() {
  const box = $("fieldStars"), view = $("fieldView"); if (!box || view.hidden) return;
  const btns = [...box.querySelectorAll(".field-star")]; if (!btns.length) return;
  const r = box.getBoundingClientRect();
  const phone = PHONE_FIELD.matches;
  const pos = phone ? spread(field, r.width, r.height, 28) : field.map((s) => ({ x: s.x * r.width, y: s.y * r.height }));
  btns.forEach((b, i) => { b.style.left = pos[i].x + "px"; b.style.top = pos[i].y + "px"; });
  // Which stars get a label.
  let show = null;
  if (phone) {
    let a = field.findIndex((s) => s.seed === lastSeed);
    if (a < 0) { let best = Infinity; pos.forEach((p, i) => { const d = Math.hypot(p.x - r.width / 2, p.y - r.height / 2); if (d < best) { best = d; a = i; } }); }
    const near = pos.map((p, i) => [Math.hypot(p.x - pos[a].x, p.y - pos[a].y), i]).sort((x, y) => x[0] - y[0]).slice(0, 4).map((x) => x[1]);
    show = new Set(near);
  }
  const vr = view.getBoundingClientRect(), placed = [];
  const hit = (a) => placed.some((b) => a.left < b.right + 4 && a.right > b.left - 4 && a.top < b.bottom + 2 && a.bottom > b.top - 2);
  btns.forEach((b, i) => {
    const lab = b.querySelector(".lab"); if (!lab) return;
    lab.hidden = !!show && !show.has(i);
    lab.style.marginLeft = "0px"; lab.style.top = "";
    if (lab.hidden) return;
    // Try below the marker, then above, then further down, so labels never sit on each other.
    const tops = [58, -18, 76, -36, 94];
    let lr = null;
    for (const t of tops) {
      lab.style.top = t + "px"; lab.style.marginLeft = "0px";
      lr = lab.getBoundingClientRect();
      let dx = 0;
      if (lr.left < vr.left + LABEL_PAD) dx = vr.left + LABEL_PAD - lr.left;
      else if (lr.right > vr.right - LABEL_PAD) dx = vr.right - LABEL_PAD - lr.right;
      lab.style.marginLeft = dx + "px";
      lr = { left: lr.left + dx, right: lr.right + dx, top: lr.top, bottom: lr.bottom };
      if (!hit(lr)) break;
    }
    placed.push(lr);
  });
}
addEventListener("resize", () => requestAnimationFrame(layoutField));
PHONE_FIELD.addEventListener?.("change", layoutField);
document.fonts?.ready?.then(() => layoutField());

function showField() {
  $("fieldView").hidden = false; $("analysis").hidden = true; $("toolbar").hidden = true; $("verdict").hidden = true;
  $("fieldBtn").hidden = true; $("noiseBtn").hidden = true;
  $("targetTitle").textContent = "Pick a star";
  buildField();
}

// ---------- target ----------

function openTarget(seed) {
  const t = generateTarget(seed);
  st.target = t; st.truth = truthSummary(t);
  st.revealed = false; st.kind = null; st.edited = {}; st.showModel = false;
  const lc = t.lightCurve;
  st.yRange = fluxRange(lc.f);
  st.x0 = 0; st.x1 = t.baseline;
  const r = bls(lc.t, lc.f, { pMin: 0.8, pMax: t.baseline / 2, nPeriods: 1500, nBins: 200 });
  let max = 0; for (const v of r.power) max = Math.max(max, v);
  // Periodogram in increasing period order for the strip.
  const idx = Array.from(r.periods.keys()).sort((a, b) => r.periods[a] - r.periods[b]);
  st.pg = { periods: idx.map((i) => r.periods[i]), power: idx.map((i) => r.power[i]), max: max || 1, pMin: 0.8, pMax: t.baseline / 2, label: "BLS power" };
  st.period = Math.min(10, t.baseline / 3);
  st.depth = Math.max(1e-4, (st.yRange[1] - st.yRange[0]) * 0.1);
  st.K = Math.max(...Array.from(t.rv.v, Math.abs)) * 0.5;
  st.inc = Math.PI / 2 - 0.02;
  refold();
  $("fieldView").hidden = true; $("analysis").hidden = false; $("toolbar").hidden = false;
  $("fieldBtn").hidden = false; $("noiseBtn").hidden = false; $("noiseBtn").setAttribute("aria-pressed", "false");
  $("verdict").hidden = mode !== "verdict"; $("verdictBtn").setAttribute("aria-pressed", String(mode === "verdict"));
  for (const b of document.querySelectorAll(".ex-verdict")) b.setAttribute("aria-pressed", "false");
  $("result").textContent = "";
  const s = t.star;
  $("targetTitle").textContent = `${t.name} · ${s.spectral} star · ${s.mass.toFixed(2)} M☉ · ${s.radius.toFixed(2)} R☉ · ${Math.round(s.teff)} K`;
  syncEstimates(); markAll(); requestAnimationFrame(resize);
  toast("Drag the fold sideways or tap a periodogram peak to line up the dips");
}

// Pick the epoch that puts the deepest binned point at phase 0.
function refold() {
  const lc = st.target.lightCurve;
  const ph = phaseFold(lc.t, st.period, 0);
  const bins = binPhase(ph, lc.f, 80);
  let best = 0; for (let i = 1; i < bins.length; i++) if (bins[i].value < bins[best].value) best = i;
  st.t0 = bins[best].phase * st.period;
  st.foldPhase = phaseFold(lc.t, st.period, st.t0);
  st.foldBins = binPhase(st.foldPhase, lc.f, 120);
  st.rvPhase = phaseFold(st.target.rv.t, st.period, st.t0);
  syncEstimates(); markAll();
}

// ---------- estimates ----------

function derived() {
  const s = st.target.star;
  const rEarth = radiusFromDepth(st.depth, s.radius) / R_EARTH;
  const mEarth = massFromK(st.K, st.period, s.mass) / M_EARTH;
  return { rEarth, mEarth };
}
function syncEstimates() {
  if (!st.target) return;
  const d = derived();
  if (!st.edited.period) $("estPeriod").value = st.period.toFixed(3);
  if (!st.edited.radius) $("estRadius").value = d.rEarth.toFixed(2);
  if (!st.edited.mass) $("estMass").value = d.mEarth.toFixed(1);
  $("foldReadout").textContent = `P ${st.period.toFixed(3)} d · Rp ${d.rEarth.toFixed(1)} R⊕`;
  $("rvReadout").textContent = `K ${st.K >= 1000 ? (st.K / 1000).toFixed(2) + " km/s" : st.K.toFixed(1) + " m/s"} · ${d.mEarth.toFixed(0)} M⊕`;
}
const val = (id) => parseFloat($(id).value);
for (const [id, key] of [["estPeriod", "period"], ["estRadius", "radius"], ["estMass", "mass"]]) {
  $(id).addEventListener("input", () => { st.edited[key] = true; });
}
for (const b of document.querySelectorAll(".est button")) {
  b.addEventListener("click", (e) => {
    e.preventDefault();
    const key = b.dataset.step, dir = +b.dataset.dir;
    const id = { period: "estPeriod", radius: "estRadius", mass: "estMass" }[key];
    const v = val(id) || 1;
    const nv = v * (dir > 0 ? 1.05 : 1 / 1.05);
    $(id).value = nv.toFixed(key === "period" ? 3 : key === "radius" ? 2 : 1);
    st.edited[key] = true;
    if (key === "period") { st.period = nv; refold(); }
  });
}
for (const b of document.querySelectorAll(".ex-verdict")) {
  b.addEventListener("click", () => {
    st.kind = b.dataset.kind;
    for (const o of document.querySelectorAll(".ex-verdict")) o.setAttribute("aria-pressed", String(o === b));
  });
}
$("submitBtn").addEventListener("click", () => {
  if (!st.kind) { toast("Pick planet, no planet or binary first"); return; }
  const res = scoreVerdict(st.target, { kind: st.kind, period: val("estPeriod"), radiusEarth: val("estRadius"), massEarth: val("estMass") });
  st.revealed = true; st.showModel = true; $("noiseBtn").setAttribute("aria-pressed", "true");
  const tr = res.truth, names = { planet: "a planet", none: "no planet", binary: "an eclipsing binary" };
  let msg = `${res.classCorrect ? "Correct" : "Not quite"}: it was ${names[tr.kind]}${tr.multi ? ` (${tr.planets.length} planets)` : ""}.  Score ${res.score}/100`;
  if (tr.kind === "planet") {
    const p0 = tr.planets[0];
    const rho = bulkDensity(p0.massEarth * M_EARTH, p0.radiusEarth * R_EARTH) / 1000;
    msg += `\nTruth: P ${p0.period.toFixed(3)} d · Rp ${p0.radiusEarth.toFixed(2)} R⊕ · Mp ${p0.massEarth.toFixed(1)} M⊕ · ρ ${rho.toFixed(2)} g/cm³`;
    msg += `\na ${p0.aAU.toFixed(3)} AU · S ${insolation(st.target.star.lum, p0.aAU).toFixed(1)} S⊕ · ${p0.aAU >= tr.hz.inner && p0.aAU <= tr.hz.outer ? "inside" : "outside"} the habitable zone`;
    if (!p0.transits) msg += "\nIt does not transit, so RV gives only Mp sin i.";
  } else if (tr.kind === "binary") msg += `\n${tr.eclipse === "full" ? "Full eclipse (flat-bottomed)" : "Grazing eclipse (V-shaped)"}, P ${tr.period.toFixed(3)} d, K in km/s.\n${BINARY_CAPTION}`;
  $("result").textContent = msg;
  done.set(st.target.seed, res.score);
  markAll();
});

// ---------- panels: sizing and drawing ----------

function resize() {
  for (const p of Object.values(panels)) {
    const r = p.canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
    p.w = w; p.h = h;
    p.canvas.width = Math.round(w * st.dpr); p.canvas.height = Math.round(h * st.dpr);
    p.dirty = true;
  }
}
function markAll() { for (const p of Object.values(panels)) p.dirty = true; }
const visible = (p) => p.canvas.offsetParent !== null && p.w > 1;

function draw(name) {
  const p = panels[name];
  if (!visible(p) || !st.target) return;
  const { ctx, w, h } = p;
  ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
  const t = st.target;
  if (name === "lightcurve") {
    const marks = [];
    if (st.showModel) for (let m = st.t0; m < t.baseline; m += st.period) if (m >= 0) marks.push(m);
    p.geo = drawLightCurve(ctx, w, h, T, {
      lc: t.lightCurve, x0: st.x0, x1: st.x1, yRange: st.yRange, marks,
      model: st.revealed && st.showModel ? (tt) => modelFlux(t, tt) : null
    });
    $("lcStretch").hidden = (st.yRange[1] - st.yRange[0]) > 0.2;
  } else if (name === "fold") {
    const d = { phase: st.foldPhase, flux: t.lightCurve.f, bins: st.foldBins, yRange: st.yRange, depth: st.depth, period: st.period, periodogram: st.pg };
    p.geo = drawFold(ctx, w, h, T, S, d); p.geo.strip = d.stripRect;
  } else if (name === "rv") {
    const vmax = Math.max(st.K, ...Array.from(t.rv.v, Math.abs)) * 1.25 + t.rvNoise;
    p.vmax = vmax;
    p.geo = drawRV(ctx, w, h, T, S, { phase: st.rvPhase, v: t.rv.v, sigma: t.rvNoise, K: st.K, vmax, model: (ph) => -st.K * Math.sin(2 * Math.PI * ph) });
  } else if (name === "orbit") {
    drawOrbit(ctx, w, h, T, S, orbitScene(w, h));
  } else if (name === "inclination") {
    const s = t.star;
    const a = semiMajorAxis(st.period, s.mass * M_SUN, 0);
    const b = a * Math.cos(st.inc) / (s.radius * R_SUN);
    const k = Math.sqrt(Math.max(st.depth, 0));
    const transits = Math.abs(b) < 1 + k;
    const win = Math.asin(Math.min(1, s.radius * R_SUN / a)) * 180 / Math.PI;
    const twin = Math.asin(R_SUN / AU) * 180 / Math.PI;
    drawInclination(ctx, w, h, T, S, { inc: st.inc, b, k, transits, starClass: s.spectral });
    $("incReadout").textContent = `b ${b.toFixed(2)}`;
    $("incCaption").textContent = `Transits need cos i < R*/a: here within ${win.toFixed(2)}° of edge-on. For an Earth–Sun twin the window is only about ${twin.toFixed(2)}°, so most orbits never transit.`;
  }
}

// Orbit scene: the student's estimate before the verdict, the truth after.
function orbitScene(w, h) {
  const t = st.target, s = t.star;
  const hz = habitableZone(s.lum, s.teff).conservative;
  let planets;
  if (st.revealed && t.orbits.length) {
    planets = t.orbits.map((o) => ({ aAU: o.a / AU, e: o.e, omega: o.omega, period: o.period, tp: o.tp, o, rEarth: o.radius / R_EARTH, mass: o.mass, stellar: o.stellar }));
  } else if (st.revealed) planets = [];
  else {
    const mp = Math.max(0, val("estMass") || 0) * M_EARTH;
    planets = [{ aAU: semiMajorAxis(st.period, s.mass * M_SUN, mp) / AU, e: 0, omega: 0, period: st.period, tp: st.t0, rEarth: val("estRadius") || 1, mass: mp }];
  }
  const maxA = Math.max(hz.outer, ...planets.map((p) => p.aAU * (1 + p.e)), 0.05);
  const auPx = (Math.min(w, h) / 2 - 16) / (maxA * 1.08);
  // star reflex about the barycentre, from momentum balance (a* = a Mp / (M* + Mp))
  let wx = 0, wy = 0, aStarMax = 0;
  const sprites = ["planet_lava", "planet_desert", "planet_rocky_rust", "planet_teal_ocean", "planet_ice", "planet_gas_giant_banded"];
  for (const p of planets) {
    let f;
    if (p.o) { const os = orbitState(p.o, st.simT); f = os.f; } else f = 2 * Math.PI * (st.simT - p.tp) / p.period;
    p.f = f;
    const frac = p.mass / (p.mass + s.mass * M_SUN);
    const r = p.aAU * (1 - p.e * p.e) / (1 + p.e * Math.cos(f));
    wx -= frac * r * Math.cos(p.omega + f); wy -= frac * r * Math.sin(p.omega + f);
    aStarMax += frac * p.aAU;
    p.sprite = p.stellar ? "star_M" : p.rEarth > 6 ? "planet_gas_giant_banded" : p.rEarth > 2.5 ? "planet_ice" : sprites[Math.min(3, Math.floor(p.aAU / Math.max(hz.inner, 1e-3) * 2))];
  }
  const ex = aStarMax > 0 ? Math.max(1, 10 / (aStarMax * auPx)) : 1;
  const starPx = s.radius * R_SUN / AU * auPx * 2;
  return {
    starClass: s.spectral, binary: st.revealed && t.kind === "binary", planets, hz, auPx, starPx,
    wobble: { x: wx * ex, y: wy * ex }, pulse: reducedMotion ? 1 : 0.5 + 0.5 * Math.sin(performance.now() / 600),
    caption: ex > 1.5 ? `wobble ×${ex >= 100 ? Math.round(ex).toLocaleString() : ex.toFixed(0)} · ${st.revealed ? "true orbits" : "your estimate"}` : (st.revealed ? "true orbits" : "your estimate"),
    scaleBarAU: niceAU(maxA / 3)
  };
}
function niceAU(x) { const p = Math.pow(10, Math.floor(Math.log10(x))); for (const m of [1, 2, 5, 10]) if (m * p >= x) return m * p; return 10 * p; }

// ---------- interaction ----------

function attachDrag(name, handlers) {
  const c = panels[name].canvas;
  const ptrs = new Map();
  c.addEventListener("pointerdown", (e) => {
    c.setPointerCapture(e.pointerId);
    ptrs.set(e.pointerId, { x: e.offsetX, y: e.offsetY, x0: e.offsetX, y0: e.offsetY });
    setActive(name);
    if (ptrs.size === 1 && handlers.down) handlers.down(e.offsetX, e.offsetY);
  });
  c.addEventListener("pointermove", (e) => {
    const p = ptrs.get(e.pointerId); if (!p) return;
    if (ptrs.size === 2 && handlers.pinch) {
      const [a, b] = [...ptrs.values()];
      const d0 = Math.abs(a.x - b.x) || 1;
      p.x = e.offsetX; p.y = e.offsetY;
      const d1 = Math.abs(a.x - b.x) || 1;
      handlers.pinch(d0 / d1, (a.x + b.x) / 2);
    } else if (ptrs.size === 1 && handlers.move) {
      handlers.move(e.offsetX - p.x, e.offsetY - p.y, e.offsetX, e.offsetY);
      p.x = e.offsetX; p.y = e.offsetY;
    }
    panels[name].dirty = true;
  });
  const up = (e) => { const p = ptrs.get(e.pointerId); ptrs.delete(e.pointerId); if (p && handlers.up) handlers.up(e.offsetX, e.offsetY, Math.hypot(e.offsetX - p.x0, e.offsetY - p.y0) < 6); };
  c.addEventListener("pointerup", up); c.addEventListener("pointercancel", up);
  if (handlers.wheel) c.addEventListener("wheel", (e) => { e.preventDefault(); handlers.wheel(e); panels[name].dirty = true; }, { passive: false });
}

function zoomLC(f, cx) {
  const p = panels.lightcurve, pad = p.geo ? p.geo.pad : { l: 46, r: 8 };
  const tc = st.x0 + (cx - pad.l) / (p.w - pad.l - pad.r) * (st.x1 - st.x0);
  let span = Math.min(st.target.baseline, Math.max(0.3, (st.x1 - st.x0) * f));
  st.x0 = tc - (tc - st.x0) * span / (st.x1 - st.x0); st.x1 = st.x0 + span; clampLC();
}
function clampLC() {
  const span = st.x1 - st.x0, B = st.target.baseline;
  if (st.x0 < 0) { st.x0 = 0; st.x1 = span; }
  if (st.x1 > B) { st.x1 = B; st.x0 = B - span; }
}
attachDrag("lightcurve", {
  move(dx) { const p = panels.lightcurve; const dt = -dx / (p.w - 54) * (st.x1 - st.x0); st.x0 += dt; st.x1 += dt; clampLC(); },
  pinch: zoomLC,
  wheel(e) { zoomLC(Math.exp(e.deltaY * 0.0015), e.offsetX); }
});

let foldDrag = null;
attachDrag("fold", {
  down(x, y) {
    const g = panels.fold.geo; if (!g) return;
    if (g.strip && y >= g.strip.y - 4) { foldDrag = "strip"; return; }
    foldDrag = Math.abs(y - g.Y(1 - st.depth)) < 22 ? "depth" : "period";
  },
  move(dx, dy, x, y) {
    const g = panels.fold.geo; if (!g) return;
    if (foldDrag === "depth") {
      const f = st.yRange[1] - (y - g.pad.t) / (panels.fold.h - g.pad.t - g.pad.b) * (st.yRange[1] - st.yRange[0]);
      st.depth = Math.max(1e-5, Math.min(0.5, 1 - f)); syncEstimates(); markAll();
    } else if (foldDrag === "period") {
      // A full-width drag changes the period by about 2%, fine enough to align dips.
      st.period = Math.max(0.5, st.period * Math.exp(dx / (panels.fold.w) * 0.02)); refold();
    } else if (foldDrag === "strip") pickStrip(x);
  },
  up(x, y, tap) { if (foldDrag === "strip" && tap) pickStrip(x, true); foldDrag = null; },
  wheel(e) { st.period *= Math.exp(-e.deltaY * 0.00005); refold(); }
});
function pickStrip(x, snap) {
  const s = panels.fold.geo.strip; if (!s) return;
  let P = Math.exp(s.lp0 + (x - s.x) / s.w * (s.lp1 - s.lp0));
  if (snap) {   // snap to the strongest peak within ±2% in log period
    let best = -1, bp = P;
    st.pg.periods.forEach((p, i) => { if (Math.abs(Math.log(p / P)) < 0.02 && st.pg.power[i] > best) { best = st.pg.power[i]; bp = p; } });
    P = bp;
  }
  st.period = Math.max(0.5, Math.min(st.pg.pMax, P)); refold();
}
$("pDown").addEventListener("click", () => { st.period /= 1.002; refold(); });
$("pUp").addEventListener("click", () => { st.period *= 1.002; refold(); });

attachDrag("rv", {
  move(dx, dy, x, y) {
    const p = panels.rv, g = p.geo; if (!g) return;
    const v = p.vmax - (y - g.pad.t) / (p.h - g.pad.t - g.pad.b) * 2 * p.vmax;
    st.K = Math.max(0.1, Math.abs(v)); syncEstimates(); markAll();
  }
});
attachDrag("inclination", {
  move(dx, dy) { st.inc = Math.max(Math.PI / 2 - 0.5, Math.min(Math.PI / 2, st.inc + dy * 0.0006 * (1 + Math.abs(Math.PI / 2 - st.inc) * 20))); panels.inclination.dirty = true; },
  wheel(e) { st.inc = Math.max(Math.PI / 2 - 0.5, Math.min(Math.PI / 2, st.inc + e.deltaY * 0.00005)); }
});

function setActive(name) {
  st.active = name;
  for (const s of document.querySelectorAll(".panel")) s.classList.toggle("active", s.dataset.panel === name);
  for (const b of document.querySelectorAll(".tool[data-show]")) b.setAttribute("aria-pressed", String(b.dataset.show === name));
}
for (const b of document.querySelectorAll(".tool[data-show]")) b.addEventListener("click", () => { setActive(b.dataset.show); requestAnimationFrame(resize); });
$("verdictBtn").addEventListener("click", () => {
  const open = $("verdict").hidden; $("verdict").hidden = !open; $("verdictBtn").setAttribute("aria-pressed", String(open));
  if (open) syncEstimates();
});
$("playBtn").addEventListener("click", () => { st.paused = !st.paused; syncPlay(); });
function syncPlay() { $("playBtn").classList.toggle("paused", st.paused); $("playBtn").setAttribute("aria-label", st.paused ? "Play orbit" : "Pause orbit"); }
$("noiseBtn").addEventListener("click", () => {
  st.showModel = !st.showModel; $("noiseBtn").setAttribute("aria-pressed", String(st.showModel));
  toast(st.showModel ? (st.revealed ? "Showing the noise-free model and your transit times" : "Showing transit times predicted by your period") : "Model hidden");
  markAll();
});
$("fieldBtn").addEventListener("click", showField);
$("studyBackBtn").addEventListener("click", (e) => {
  e.preventDefault();
  forwardStudyQuery(location.search);
  location.href = "study.html" + location.search;
});

let toastTimer = 0;
// The toast takes the title's slot in the top bar (as in Atom Builder), never over the star field or plots.
function toast(msg) {
  const el = $("statusLine"), title = $("targetTitle"), hud = document.querySelector(".hud");
  const hr = hud.getBoundingClientRect(), tr = title.getBoundingClientRect();
  const leftEdge = $("studyBackBtn").getBoundingClientRect().right + 8;
  const rightBtns = [...hud.querySelectorAll(".hud-right button")].filter((b) => !b.hidden);
  const rightEdge = rightBtns.length ? Math.min(...rightBtns.map((b) => b.getBoundingClientRect().left)) - 8 : hr.right - 10;
  el.textContent = msg; el.classList.add("show", "in-bar");
  Object.assign(el.style, { left: (leftEdge + rightEdge) / 2 + "px", top: tr.top + tr.height / 2 + "px", maxWidth: Math.max(80, rightEdge - leftEdge) + "px" });
  title.style.visibility = "hidden";
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { el.classList.remove("show"); title.style.visibility = ""; }, 3200);
}

// ---------- loop ----------

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  // Adaptive DPR: drop to 1 if frames stay slow (headless or low-end phones).
  st.slow = st.slow * 0.95 + (dt > 0.034 ? 1 : 0) * 0.05;
  if (st.slow > 0.6 && st.dpr > 1) { st.dpr = 1; st.slow = 0; resize(); }
  if (st.target && !st.paused) {
    const P = st.revealed && st.target.orbits.length ? Math.min(...st.target.orbits.map((o) => o.period)) : st.period;
    st.simT += dt * P / 6;     // innermost orbit every 6 s
    panels.orbit.dirty = true;
  }
  for (const [n, p] of Object.entries(panels)) if (p.dirty) { p.dirty = false; draw(n); }
  requestAnimationFrame(frame);
// Read-only hook for the Playwright checks (no globals are read by the app).
window.__exoplanets = { state: st, panels };
}

window.addEventListener("resize", () => { T = readTokens(); resize(); });
new ResizeObserver(() => resize()).observe($("analysis"));
syncPlay();
const PANEL_FOR_MODE = { transit: "lightcurve", rv: "rv", fold: "fold", orbit: "orbit", inclination: "inclination", verdict: "lightcurve" };
if (mode === "field") showField();
else { const demo = field.find((f) => ["planet", "multi"].includes(generateTarget(f.seed).kind)) || field[0]; openTarget(demo.seed); setActive(PANEL_FOR_MODE[mode]); }
if (mode === "field") setActive("lightcurve");
requestAnimationFrame(frame);
// Read-only hook for the Playwright checks (no globals are read by the app).
window.__exoplanets = { state: st, panels };
