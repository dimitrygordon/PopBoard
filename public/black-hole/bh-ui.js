// Black Hole Explorer: page wiring. Physics: bh-physics.js. Drawing: bh-render.js.

import { forwardStudyQuery } from "../board-return.js?v=20261022a";
import { loadArt, readTokens, buildComposite, drawStage, drawDiagram } from "./bh-render.js";
import { MODES, SLIDERS, MASS_PRESETS, modeFromSearch, readouts, meterPerM, paramsFromSearch } from "./bh-physics.js";
import { fmtLen, fmtTime, fmtMass, fmtNum, fmtPct, fmtG, fmtAngle } from "./bh-format.js";

const $ = (id) => document.getElementById(id);
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let T = readTokens();
const THEME_KEY = "popboard.black-hole.theme";
const init = paramsFromSearch(location.search);

const st = {
  mode: modeFromSearch(location.search),
  massSun: init.massSun, a: init.a, r: init.r,
  lensOn: true, lensMix: 1, phase: 0.6, clockMinutes: 60,
  quality: 1, frameMs: 16, dirty: true, compositeDirty: true
};
let R = readouts(st);
const stage = { canvas: $("stageCanvas"), cache: document.createElement("canvas") };
stage.ctx = stage.canvas.getContext("2d");
const diag = { canvas: $("diagramCanvas") };
diag.ctx = diag.canvas.getContext("2d");
const art = loadArt(() => { st.compositeDirty = true; st.dirty = true; kick(); });

// ---------- theme ----------
function applyTheme(t, save) {
  document.documentElement.setAttribute("data-theme", t);
  if (save) { try { localStorage.setItem(THEME_KEY, t); } catch (e) {} }
  $("themeBtn").setAttribute("aria-pressed", String(t === "dark"));
  $("themeLabel").textContent = t === "dark" ? "Light" : "Dark";
  $("themeBtn").setAttribute("aria-label", t === "dark" ? "Switch to light mode" : "Switch to dark mode");
  T = readTokens(); st.compositeDirty = true; st.dirty = true; kick();
}
const isDark = () => document.documentElement.getAttribute("data-theme") === "dark";
$("themeBtn").addEventListener("click", () => applyTheme(isDark() ? "light" : "dark", true));
const darkMQ = window.matchMedia("(prefers-color-scheme: dark)");
darkMQ.addEventListener?.("change", (e) => {
  let saved = null; try { saved = localStorage.getItem(THEME_KEY); } catch (err) {}
  if (!saved) applyTheme(e.matches ? "dark" : "light", false);
});

// ---------- controls ----------

function setupRange(id, key, value) {
  const s = SLIDERS[key], el = $(id);
  el.min = s.min; el.max = s.max; el.step = s.step; el.value = value;
  return el;
}
const massIn = setupRange("massIn", "mass", Math.log10(st.massSun));
const spinIn = setupRange("spinIn", "spin", st.a);
const distIn = setupRange("distIn", "dist", Math.log10(st.r));

massIn.addEventListener("input", () => { st.massSun = Math.pow(10, +massIn.value); update(); });
spinIn.addEventListener("input", () => { st.a = +spinIn.value; st.compositeDirty = true; update(); });
distIn.addEventListener("input", () => { st.r = Math.pow(10, +distIn.value); update(); });

for (const p of MASS_PRESETS) {
  const b = document.createElement("button");
  b.type = "button"; b.textContent = p.label; b.dataset.mass = p.massSun; b.setAttribute("aria-pressed", "false");
  b.addEventListener("click", () => { st.massSun = p.massSun; massIn.value = Math.log10(p.massSun); update(); });
  $("presets").appendChild(b);
}

const tabs = $("modeTabs");
for (const m of MODES) {
  const b = document.createElement("button");
  b.type = "button"; b.setAttribute("role", "tab"); b.dataset.mode = m.id; b.textContent = m.label;
  b.addEventListener("click", () => { st.mode = m.id; st.compositeDirty = true; update(); });
  tabs.appendChild(b);
}

$("lensBtn").addEventListener("click", () => {
  st.lensOn = !st.lensOn;
  if (reducedMotion) { st.lensMix = st.lensOn ? 1 : 0; st.compositeDirty = true; }
  update();
});

$("studyBackBtn").addEventListener("click", (e) => {
  e.preventDefault();
  forwardStudyQuery(location.search);
  location.href = "study.html" + location.search;
});

// ---------- text ----------

const CAPTIONS = {
  horizon: "The event horizon r+ is the point of no return. At zero spin its shadow is about 2.6 times the horizon radius, because light bends around it: light that passes inside the photon orbit is captured, so the dark patch is the capture zone seen through bent light. With spin, light moving with the rotation (left) can orbit closer, which flattens that side. The spinning shadow edges (2.11 and 7 GM/c\u00b2 at a* = 0.998) apply only seen edge-on, meaning for a viewer in the plane of the disk. Radii are in units of GM/c\u00b2 (half the Schwarzschild radius). Simplification: the shadow's left and right edges are the exact equatorial values; its top and bottom are Leo's art, not ray traced.",
  lensing: "Gravity bends starlight around the hole, so background stars crowd into a ring. Each star shows two main images, plus fainter ones ever closer to the shadow edge. The bending angle is exact for a non-spinning hole. Far away it falls to the Einstein value 4GM/(c\u00b2b). Rays with b below 3\u221a3 GM/c\u00b2 are captured (b in units of GM/c\u00b2). Simplification: the lensed star field uses a fixed, illustrative Einstein radius.",
  disk: "Gas spirals in through a thin disk until the innermost stable circular orbit (ISCO), then plunges. A prograde disk around a fast spinner reaches far closer, so each kilogram releases more of its rest energy as light. Simplification: the disk art is not to scale and Doppler beaming is not drawn. The dashed ISCO rings are to scale but drawn without lensing.",
  orbits: "A circular orbit is stable only at or outside the ISCO, the bottom of the energy curve. Between the photon orbit and the ISCO a circular orbit exists but any nudge sends the probe in or out. Inside the photon orbit no circular orbit exists. The probe's animation speed is slowed for viewing.",
  time: "Clocks near the hole tick slower than clocks far away. A hovering clock runs at \u221a(1 \u2212 2GM/(rc\u00b2)). An orbiting clock also loses time to its speed. The ratio depends only on r in units of GM/c\u00b2, so it is the same for every mass at the same scaled distance. Example: at r = 2.5 the rate is \u221a(1 \u2212 2/2.5) = 0.447, so 60 min hovering = 134 min (2 h 14 min) far away.",
  sandbox: "Free play: every control is open at once. Change mass, spin and the probe distance in any order, turn lensing on or off, and read every number from the other views together. The probe orbits when a stable circular orbit exists at its distance and hovers otherwise. The same simplifications as in the other views apply.",
  tides: "The pull on your feet is stronger than on your head. For a 2 m body the stretch is 2GML/r\u00b3, so at the horizon it falls as 1/M\u00b2: small holes spaghettify you far outside the horizon, while above about 1e8 Msun (the Hills mass for a Sun-like star and a non-spinning hole; rapid spin raises it) a Sun-like star crosses the horizon before it is torn apart. The disruption radius shown is for a Sun-like star; in general it is R_star (M_bh/M_star)^(1/3). Simplification: Newtonian tidal formula; astronaut frames are illustrative bins (under 1 g, 1 to 10 g, 10 to 100 g, over 100 g)."
};

function rows(mode = st.mode) {
  const L = (x) => fmtLen(x * meterPerM(st.massSun));
  switch (mode) {
    case "horizon": return [
      ["Event horizon r+, in units of GM/c\u00b2", fmtNum(R.rPlus) + " GM/c\u00b2 = " + fmtLen(R.rPlusKm * 1000)],
      ["Schwarzschild radius 2GM/c\u00b2", fmtLen(R.rsKm * 1000)],
      ["Ergosphere (equator), in units of GM/c\u00b2", "2 GM/c\u00b2 = " + L(2)],
      ["Photon orbit, prograde, in units of GM/c\u00b2", fmtNum(R.photonPro) + " GM/c\u00b2"],
      ["Photon orbit, retrograde, in units of GM/c\u00b2", fmtNum(R.photonRetro) + " GM/c\u00b2"],
      ["Shadow edges seen edge-on (pro | retro), in units of GM/c\u00b2", fmtNum(R.shadowPro) + " | " + fmtNum(R.shadowRetro) + " GM/c\u00b2"],
      ["Shadow width", fmtLen(R.shadowWidthKm * 1000)]];
    case "lensing": return [
      ["Impact parameter b, in units of GM/c\u00b2", fmtNum(R.r) + " GM/c\u00b2 = " + fmtLen(R.rKm * 1000)],
      ["Bending angle (exact, a = 0)", R.bend == null ? "captured" : fmtAngle(R.bend)],
      ["Einstein formula 4GM/(c\u00b2b)", fmtAngle(R.weakBend)],
      ["Capture limit 3\u221a3 GM/c\u00b2", L(5.196152422706632)]];
    case "disk": return [
      ["ISCO, prograde, in units of GM/c\u00b2", fmtNum(R.iscoPro) + " GM/c\u00b2 = " + fmtLen(R.iscoProKm * 1000)],
      ["ISCO, retrograde, in units of GM/c\u00b2", fmtNum(R.iscoRetro) + " GM/c\u00b2 = " + fmtLen(R.iscoRetroKm * 1000)],
      ["Efficiency, prograde disk", fmtPct(R.etaPro)],
      ["Efficiency, retrograde disk", fmtPct(R.etaRetro)],
      ["Orbit period at prograde ISCO", fmtTime(R.iscoPeriod)]];
    case "orbits": return [
      ["Probe distance r, in units of GM/c\u00b2", fmtNum(R.r) + " GM/c\u00b2 = " + fmtLen(R.rKm * 1000)],
      ["Prograde circular orbit", { stable: "stable", unstable: "unstable (inside ISCO)", none: "impossible (inside photon orbit)", inside: "inside horizon" }[R.status]],
      ["Orbit period (far clock)", R.period == null ? "none" : fmtTime(R.period)],
      ["Orbit energy E", R.energy == null ? "none" : R.energy.toFixed(4)],
      ["Prograde ISCO, in units of GM/c\u00b2", fmtNum(R.iscoPro) + " GM/c\u00b2"]];
    case "time": return [
      ["Probe distance r, in units of GM/c\u00b2", fmtNum(R.r) + " GM/c\u00b2 = " + fmtLen(R.rKm * 1000)],
      ["Hovering clock rate", fmtNum(R.hover, 4) + " (60 min hovering = " + fmtNum(60 * R.hoverFactor, 3) + " min far away)"],
      ["Orbiting clock rate", R.orbit ? fmtNum(R.orbit, 4) + " (60 min orbiting = " + fmtNum(60 * R.orbitFactor, 3) + " min far away)" : "no stable orbit here"]];
    case "tides": return [
      ["Probe distance r, in units of GM/c\u00b2", fmtNum(R.r) + " GM/c\u00b2 = " + fmtLen(R.rKm * 1000)],
      ["Stretch on 2 m astronaut here", fmtG(R.stretchG)],
      ["Stretch at the horizon", fmtG(R.horizonStretchG)],
      ["Sun-like star torn apart at (r_t = R_star (M_bh/M_star)^(1/3))", fmtNum(R.rtOverRp) + " \u00d7 r+"],
      ["Hills mass, Sun-like star (rises with spin)", fmtMass(R.hills)]];
    case "sandbox": {
      // Every row from every other view, each shown once.
      const seen = new Set(), out = [];
      for (const m of ["horizon", "disk", "orbits", "lensing", "time", "tides"]) {
        for (const row of rows(m)) if (!seen.has(row[0])) { seen.add(row[0]); out.push(row); }
      }
      return out;
    }
  }
  return [];
}

function renderText() {
  $("massOut").textContent = fmtMass(st.massSun);
  $("spinOut").textContent = st.a.toFixed(3);
  $("distOut").textContent = fmtNum(st.r) + " GM/c\u00b2";
  for (const id of ["distIn", "distLabel"]) (id === "distIn" ? $(id) : $(id).parentElement).hidden = st.mode === "horizon";
  $("distLabel").textContent = st.mode === "sandbox" ? "Slider (in units of GM/c\u00b2): the probe's distance r, or the light ray's impact parameter b, its sideways aim offset" : st.mode === "lensing" ? "Light ray impact parameter b (GM/c\u00b2)" : "Probe distance r (GM/c\u00b2)";
  const dl = $("readouts"); dl.textContent = "";
  for (const [k, v] of rows()) {
    const dt = document.createElement("dt"), dd = document.createElement("dd");
    dt.textContent = k; dd.textContent = v; dl.append(dt, dd);
  }
  $("caption").textContent = CAPTIONS[st.mode];
  $("lensBtn").hidden = st.mode !== "lensing" && st.mode !== "sandbox";
  $("lensBtn").setAttribute("aria-pressed", String(st.lensOn));
  $("lensBtn").textContent = st.lensOn ? "Lensing on" : "Lensing off";
  $("stageNote").textContent = "The picture is the same for every mass: only the km scale changes. Disk art is not to scale.";
  for (const b of tabs.children) b.setAttribute("aria-selected", String(b.dataset.mode === st.mode));
  for (const b of $("presets").children) b.setAttribute("aria-pressed", String(Math.abs(Math.log10(+b.dataset.mass / st.massSun)) < 0.006));
}

function update() {
  R = readouts(st);
  renderText();
  st.dirty = true;
  kick();
}

// ---------- canvases (adaptive resolution, cached composite) ----------

function sizeCanvas(c, q) {
  const dpr = Math.min(2, window.devicePixelRatio || 1) * q;
  const w = Math.max(1, Math.round(c.clientWidth * dpr)), h = Math.max(1, Math.round(c.clientHeight * dpr));
  if (c.width !== w || c.height !== h) { c.width = w; c.height = h; return true; }
  return false;
}

function draw() {
  const q = st.quality;
  if (sizeCanvas(stage.canvas, q)) st.compositeDirty = true;
  sizeCanvas(diag.canvas, Math.min(1, q + 0.25));
  const sc = stage.canvas, dc = diag.canvas;
  const dprS = sc.width / Math.max(1, sc.clientWidth), dprD = dc.width / Math.max(1, dc.clientWidth);
  const W = sc.clientWidth, H = sc.clientHeight;
  const side = Math.round(Math.min(W, H * 1.08) * dprS);
  if (st.compositeDirty || stage.cache.width !== side) {
    st.compositeDirty = !buildComposite(stage.cache, art, { a: st.a, lensMix: st.lensMix, px: side, ringColor: T.accent });
  }
  drawStage(stage.ctx, W, H, dprS, stage.cache, art, T, { ...st, readouts: R, mPerM: meterPerM(st.massSun), fmtLen });
  drawDiagram(diag.ctx, dc.clientWidth, dc.clientHeight, dprD, T, { ...st, readouts: R }, art);
}

let raf = 0, last = 0;
function animating() {
  if (reducedMotion || document.hidden) return false;
  if (Math.abs(st.lensMix - (st.lensOn ? 1 : 0)) > 0.001) return true;
  return st.mode === "orbits" || st.mode === "time" || st.mode === "disk" || st.mode === "sandbox";
}
function frame(now) {
  raf = 0;
  const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
  last = now;
  const target = st.lensOn ? 1 : 0;
  if (st.lensMix !== target) {
    st.lensMix = Math.abs(target - st.lensMix) < 0.04 ? target : st.lensMix + Math.sign(target - st.lensMix) * dt * 1.6;
    st.compositeDirty = true;
  }
  if (R.status === "stable") st.phase += dt * (2 * Math.PI) / (2.5 * Math.pow(Math.max(R.r, 1) / 6, 1.5)); // viewing speed, not real
  st.clockMinutes = (st.clockMinutes + dt * 6) % 600; // hovering-probe minutes
  const t0 = performance.now();
  draw();
  const cost = performance.now() - t0;
  st.frameMs = st.frameMs * 0.9 + cost * 0.1;
  if (st.frameMs > 14 && st.quality > 0.55) { st.quality = Math.max(0.55, st.quality - 0.15); st.frameMs = 8; }
  else if (st.frameMs < 4 && st.quality < 1) { st.quality = Math.min(1, st.quality + 0.05); st.frameMs = 8; }
  st.dirty = false;
  if (animating()) raf = requestAnimationFrame(frame); else last = 0;
}
function kick() { if (!raf) raf = requestAnimationFrame(frame); }

new ResizeObserver(() => { st.dirty = true; kick(); }).observe(stage.canvas);
document.addEventListener("visibilitychange", () => { if (!document.hidden) kick(); });
applyTheme(isDark() ? "dark" : "light", false);
renderText();
kick();
