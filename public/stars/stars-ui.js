// Build a Star: page wiring.
// Physics: stars-physics.js (pure). Drawing: stars-render.js.

import { forwardStudyQuery } from "../board-return.js?v=20261022a";
import * as P from "./stars-physics.js";
import * as R from "./stars-render.js";

const $ = (id) => document.getElementById(id);
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const init = P.paramsFromSearch(location.search);

const st = {
  mass: init.mass, z: init.z, y: init.y, u: 0, mode: P.modeFromSearch(location.search),
  playing: false, squeezeT: -1, dprScale: 1, slowFrames: 0,
  sn: { from: 0, to: 0, mix: 1, t0: 0 }, snStart: 0
};
let model = null;

function rebuild() {
  const ms = P.mainSequence(st.mass, st.z, st.y);
  const stages = P.lifeStages(st.mass, st.z, st.y);
  const f = P.fate(ms.mass, st.z);
  const color = P.tintForTemperature(ms.teff);
  const msLine = [0.1, 0.3, 0.6, 1, 2, 5, 10, 20, 40, 80].map((m) => P.mainSequence(m, st.z, st.y));
  const track = stages.map((s) => P.stageState(st.mass, st.z, st.y, s.id, 0.5)).filter((s) => s.onHR);
  model = { ms, stages, fate: f, color, msLine, track };
}

function current() {
  const at = P.stageAt(model.stages, st.u);
  const ss = P.stageState(st.mass, st.z, st.y, at.stage.id, at.frac);
  const color = at.stage.id === "main-sequence" ? model.color : at.stage.id === "supernova" ? P.tintForTemperature(4400) : ss.teff > 0 ? P.tintForTemperature(ss.teff) : model.color;
  return { at, ss, color };
}

// ---------- canvases and adaptive resolution ----------
const canvases = { star: $("starCanvas"), reaction: $("reactionCanvas"), detail: $("detailCanvas") };
const ctx = Object.fromEntries(Object.entries(canvases).map(([k, c]) => [k, c.getContext("2d")]));
let dirty = true;
const mark = () => { dirty = true; schedule(); };
function size(c) {
  const r = c.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1) * st.dprScale;
  const w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr));
  if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
  const g = c.getContext("2d"); g.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { W: r.width, H: r.height, dpr };
}

// ---------- drawing ----------
function draw(now) {
  const { at, ss, color } = current();
  const id = at.stage.id;
  // Star stage.
  {
    const { W, dpr } = size(canvases.star);
    let squeeze = 0;
    if (st.squeezeT >= 0) squeeze = P.perturbationRadius((now - st.squeezeT) / 1000) * 0.6;
    if (id === "supernova") updateSupernova(at.frac, now);
    R.drawStage(ctx.star, W, { stageId: id, color, variant: model.ms.transport.cutaway, sn: st.sn, squeeze, dpr }, mark);
    canvases.star.setAttribute("aria-label", P.STAGE_INFO[id].name + (id === "main-sequence" ? ", cutaway showing the " + zoneWords() : ""));
  }
  {
    const { W, H, dpr } = size(canvases.reaction);
    R.drawReaction(ctx.reaction, W, H, ss.fusion, model.ms.cno, mark, dpr);
  }
  drawDetail(now, at, ss, color);
  $("stageName").textContent = P.STAGE_INFO[id].name;
  $("replayBtn").hidden = id !== "supernova";
}

function zoneWords() {
  const t = model.ms.transport;
  return t.kind === "fully-convective" ? "convection all the way through" : t.kind === "radiative-core" ? "radiative core and convective envelope" : "convective core and radiative envelope";
}

function drawDetail(now, at, ss, color) {
  const { W, H, dpr } = size(canvases.detail);
  const g = ctx.detail, ms = model.ms, mode = st.mode;
  $("squeezeBtn").hidden = mode !== "equilibrium" || at.stage.id !== "main-sequence";
  $("hrLink").hidden = mode !== "build";
  let cap = "";
  if (mode === "build") {
    R.drawHR(g, W, H, { msLine: model.msLine, track: model.track, here: ss.onHR ? { L: ss.L, teff: ss.teff } : null, color });
    cap = ss.onHR ? `${P.STAGE_INFO[at.stage.id].name}: about ${fmtL(ss.L)} L\u2609 at ${Math.round(ss.teff).toLocaleString("en-US")} K${at.stage.id === "main-sequence" ? `, spectral class ${ms.spectral}, radius ${fmtR(ms.R)} R\u2609` : ""}. The dashed line is this star's path through its life.`
      : "This stage has no ordinary surface to place on the H-R diagram.";
  } else if (mode === "equilibrium") {
    let x = 0;
    if (st.squeezeT >= 0) x = P.perturbationRadius((now - st.squeezeT) / 1000);
    const f = P.perturbedForces(x);
    const scale = 0.55 + 0.45 * P.clamp((Math.log10(ms.Pc) - 15.5) / 2.5, 0, 1);
    R.drawEquilibrium(g, W, H, { x, gravity: f.gravity, pressure: f.pressure, scale, color });
    cap = `At the center, gas pressure of about ${sci(ms.Pc)} Pa holds up the weight of the star above it. Squeeze the star and pressure rises faster than gravity (P \u221d R\u207b\u2075 versus R\u207b\u2074), so it springs back. It settles within a few dynamical times (dynamical time about ${fmtMin(P.dynamicalTimeMinutes(ms.mass, ms.R))}).` +
      (at.stage.id === "main-sequence" ? "" : " (Squeeze demo works on the main sequence.)");
  } else if (mode === "fusion") {
    R.drawFusion(g, W, H, { fusion: ss.fusion, where: ss.where, cno: ms.cno, color }, mark, dpr);
    cap = at.stage.id === "main-sequence"
      ? `Core temperature ${mk(ms.Tc)}. Below about 17 MK (about 1.3 M\u2609) the proton-proton chain makes most of the energy; above it the CNO cycle takes over because its rate climbs much faster with temperature.`
      : P.STAGE_INFO[at.stage.id].core;
  } else if (mode === "transport") {
    R.drawTransport(g, W, H, { zones: zonesFor(ms.transport.kind) }, mark, dpr);
    cap = ms.transport.kind === "fully-convective" ? "Below about 0.35 M\u2609 the whole star convects, so all its hydrogen eventually reaches the core."
      : ms.transport.kind === "radiative-core" ? "Sun-like stars carry energy by radiation in the core and by convection in the outer envelope."
      : "Above about 1.3 M\u2609 the CNO cycle concentrates energy release so strongly that the core convects; the envelope is radiative.";
    cap += " (Main-sequence structure.)";
  } else if (mode === "lifetime") {
    const msLeft = at.stage.id === "main-sequence" ? 1 - at.frac : 0;
    R.drawHourglass(g, W, H, {
      sand: msLeft, flowing: st.playing && at.stage.id === "main-sequence", color: model.color, index: at.index,
      title: `Main sequence: ${P.lifetimeLabel(ms)}`,
      sub: `Lifetime \u221d fuel / burn rate, and luminosity climbs much faster than mass: about 10 Gyr \u00d7 (M/M\u2609)\u207b\u00b2\u00b7\u2075 for Sun-like stars, flattening for the heaviest.${ms.lifetime > P.AGE_UNIVERSE ? " Longer than the universe has existed (13.8 Gyr)." : ""}`,
      stages: model.stages.map((s, i) => ({ name: P.STAGE_INFO[s.id].name, dur: i === 0 ? P.lifetimeLabel(ms).replace("about 1 trillion years or more", "\u2265 1 trillion yr") : Number.isFinite(s.dur) ? P.formatYears(s.dur) : "end" }))
    });
    cap = "Press play: the hourglass drains faster for heavier stars.";
  } else if (mode === "fate") {
    const f = model.fate;
    const bands = [
      { from: 0.08, to: P.LOW_MASS_GIANT_MIN, label: "helium white dwarf" },
      { from: P.LOW_MASS_GIANT_MIN, to: P.SUPERNOVA_MIN, label: "planetary nebula + white dwarf" },
      { from: P.SUPERNOVA_MIN, to: P.BLACK_HOLE_MIN, label: "supernova + neutron star" },
      { from: P.BLACK_HOLE_MIN, to: 100, label: "black hole" }
    ];
    R.drawFateMap(g, W, H, { bands, ticks: [0.1, 0.5, 1, 8, 20, 100], mass: ms.mass, color: model.color, summary: fateSummary(f, ms) });
    cap = "Thresholds are approximate and shift with composition, rotation and binary companions. At low metallicity, 25 to 40 M\u2609 makes a black hole by fallback; direct collapse needs about 40 M\u2609 or more.";
  }
  canvases.detail.setAttribute("aria-label", cap);
  $("detailCaption").textContent = cap;
}

function zonesFor(kind) {
  if (kind === "fully-convective") return [{ from: 0, to: 0.2, kind: "core", label: "core" }, { from: 0.2, to: 1, kind: "convective", label: "convective" }];
  if (kind === "radiative-core") return [{ from: 0, to: 0.25, kind: "core", label: "core" }, { from: 0.25, to: 0.7, kind: "radiative", label: "radiative" }, { from: 0.7, to: 1, kind: "convective", label: "convective" }];
  return [{ from: 0, to: 0.34, kind: "convective", label: "convective core" }, { from: 0.34, to: 1, kind: "radiative", label: "radiative envelope" }];
}

function fateSummary(f, ms) {
  const hypo = f.hypothetical ? "Hypothetical: no star this small has died yet. " : "";
  if (f.remnant === "white-dwarf" && !f.nebula) return `${hypo}A ${fmtM(ms.mass)} M\u2609 star never becomes a red giant. Over about a trillion years or more it slowly turns into a helium white dwarf; the universe is only 13.8 Gyr old.`;
  if (f.remnant === "white-dwarf") return `${hypo}A ${fmtM(ms.mass)} M\u2609 star swells into a red giant, puffs off a planetary nebula, and leaves a ${f.wdKind} white dwarf of about ${P.whiteDwarfMass(ms.mass).toFixed(2)} M\u2609 (always below the 1.44 M\u2609 Chandrasekhar limit).`;
  if (f.remnant === "neutron-star") return `A ${fmtM(ms.mass)} M\u2609 star builds an iron core that collapses: a core-collapse supernova, leaving a neutron star of about 1.4 M\u2609, about 24 km across (radius 11 to 13 km).`;
  return f.direct ? `A ${fmtM(ms.mass)} M\u2609 star with so few metals keeps most of its mass and collapses almost directly into a black hole, with a faint or no supernova.`
    : `A ${fmtM(ms.mass)} M\u2609 star explodes as a core-collapse supernova, but so much material falls back onto the core that it becomes a black hole.`;
}

// Supernova: frame index follows the scrubber; changing frames crossfades over 300 ms.
const FADE_MS = 300;
function updateSupernova(frac, now) {
  const target = Math.min(4, Math.floor(frac * 5));
  const sn = st.sn;
  if (target !== sn.to) { sn.from = reducedMotion ? target : sn.to; sn.to = target; sn.t0 = now; sn.mix = reducedMotion ? 1 : 0; }
  if (sn.mix < 1) { sn.mix = Math.min(1, (now - sn.t0) / FADE_MS); if (sn.mix < 1) schedule(); }
}

// ---------- fate strip ----------
const SLOTS = [
  { id: "ms", name: "Main sequence", art: "star-body-mask", stage: "main-sequence", path: "both" },
  { id: "rg", name: "Red giant", art: "red-giant-body-mask", stage: "red-giant", path: "low", tint: 3800 },
  { id: "pn", name: "Planetary nebula", art: "remnant-planetary-nebula", stage: "planetary-nebula", path: "low" },
  { id: "wd", name: "White dwarf", art: "remnant-white-dwarf", stage: "white-dwarf", path: "low" },
  { div: true },
  { id: "rsg", name: "Red supergiant", art: "red-supergiant-body-mask", stage: "red-supergiant", path: "high", tint: 3600 },
  { id: "sn", name: "Supernova", art: "supernova-frame-3-explosion", stage: "supernova", path: "high", tint: 4400 },
  { id: "ns", name: "Neutron star", art: "remnant-neutron-star", stage: "neutron-star", path: "high" },
  { id: "bh", name: "Black hole", art: "remnant-black-hole", stage: "black-hole", path: "high" }
];
const strip = $("fateStrip");
for (const s of SLOTS) {
  if (s.div) { const d = document.createElement("span"); d.className = "div"; d.setAttribute("aria-hidden", "true"); strip.append(d); continue; }
  const b = document.createElement("button");
  b.type = "button"; b.className = "fate-slot"; b.dataset.slot = s.id;
  b.innerHTML = `<canvas aria-hidden="true"></canvas><span>${s.name}</span>`;
  b.addEventListener("click", () => {
    const i = model.stages.findIndex((x) => x.id === s.stage);
    if (i < 0) { toastCaption(`A ${fmtM(st.mass)} M\u2609 star never becomes a ${s.name.toLowerCase()}.`); return; }
    stop(); setU(P.stageStartU(model.stages, i) + 1e-4);
  });
  s.el = b; strip.append(b);
}
function drawStrip() {
  const ids = new Set(model.stages.map((x) => x.id));
  const cur = current().at.stage.id;
  for (const s of SLOTS) {
    if (s.div) continue;
    const c = s.el.querySelector("canvas"), r = c.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
    const px = Math.max(1, Math.round(r.width * dpr));
    if (c.width !== px) { c.width = c.height = px; }
    const g = c.getContext("2d"); g.clearRect(0, 0, px, px);
    const tint = s.id === "ms" ? model.color : s.tint ? P.tintForTemperature(s.tint) : null;
    const img = R.tinted(s.art, tint, px * (s.id === "sn" ? 1 : 1), drawStrip);
    if (img) { const k = s.id === "sn" ? 1.0 : s.id === "ms" || s.id === "wd" ? 0.9 : 1; const w = px * k; g.drawImage(img, (px - w) / 2, (px - w) / 2, w, w); }
    const on = ids.has(s.stage);
    s.el.classList.toggle("on", on);
    s.el.classList.toggle("now", s.stage === cur);
    s.el.classList.toggle("end", s.stage === model.fate.remnant);
    s.el.setAttribute("aria-label", s.name + (on ? (s.stage === model.fate.remnant ? ", this star's final fate" : ", on this star's path") : ", not on this star's path") + (s.stage === cur ? ", now" : ""));
    s.el.setAttribute("aria-current", s.stage === cur ? "step" : "false");
  }
}

// ---------- controls ----------
const massRange = $("massRange"), zRange = $("zRange"), yRange = $("yRange"), timeRange = $("timeRange");
function fill(el) { el.style.setProperty("--fill", ((el.value - el.min) / (el.max - el.min) * 100).toFixed(1) + "%"); }
function syncControls() {
  massRange.value = Math.round(P.massToSlider(st.mass) * 1000); fill(massRange);
  zRange.value = Math.round(P.zToSlider(st.z) * 1000); fill(zRange);
  const comp = model.ms.comp;
  yRange.value = comp.Y.toFixed(3); fill(yRange);
  $("massOut").textContent = fmtM(st.mass);
  $("zOut").textContent = `${st.z < 0.001 ? st.z.toExponential(1) : st.z.toFixed(st.z < 0.01 ? 4 : 3)} (${(st.z / P.Z_SUN).toPrecision(2)} \u00d7 Sun)`;
  $("yOut").textContent = comp.Y.toFixed(3);
  for (const b of document.querySelectorAll("[data-mass]")) b.setAttribute("aria-pressed", String(Math.abs(+b.dataset.mass - st.mass) / st.mass < 0.01));
}
function syncTime() {
  timeRange.value = Math.round(st.u * 1000); fill(timeRange);
  const { at, ss } = current();
  $("ageOut").textContent = `${at.age <= 0 ? "Age 0" : P.formatYears(at.age)} \u00b7 ${P.STAGE_INFO[at.stage.id].name}`;
  timeRange.setAttribute("aria-valuetext", $("ageOut").textContent);
  const ms = model.ms;
  $("rTc").textContent = ss.Tc > 0 ? mk(ss.Tc) : "n/a";
  $("rPc").textContent = at.stage.id === "main-sequence" ? sci(ms.Pc) + " Pa" : "n/a";
  $("rL").textContent = ss.onHR ? fmtL(ss.L) + " L\u2609" : "n/a";
  $("rTeff").textContent = ss.onHR ? Math.round(ss.teff).toLocaleString("en-US") + " K" : "n/a";
  $("rLife").textContent = P.lifetimeLabel(ms);
  drawStrip();
  mark();
}
function setStar(changes) {
  Object.assign(st, changes);
  rebuild(); syncControls(); syncTime(); writeUrl();
  R.preload("cut-" + model.ms.transport.cutaway, mark);
}
function setU(u) { st.u = P.clamp(u, 0, 1); syncTime(); }
function writeUrl() {
  const p = new URLSearchParams(location.search);
  p.set("mass", +st.mass.toPrecision(3)); if (Math.abs(st.z - P.Z_SUN) > 1e-9) p.set("z", +st.z.toPrecision(3)); else p.delete("z");
  if (st.y != null) p.set("y", st.y); else p.delete("y");
  if (st.mode !== "build") p.set("mode", st.mode); else p.delete("mode");
  history.replaceState(null, "", location.pathname + "?" + p.toString());
  $("hrLink").href = "study-hrdiagram.html" + returnQuery();
}
function returnQuery() { const q = forwardStudyQuery(location.search).toString(); return q ? "?" + q : ""; }

massRange.addEventListener("input", () => setStar({ mass: P.sliderToMass(massRange.value / 1000) }));
zRange.addEventListener("input", () => setStar({ z: P.sliderToZ(zRange.value / 1000) }));
yRange.addEventListener("input", () => setStar({ y: +yRange.value }));
$("yReset").addEventListener("click", () => setStar({ y: null }));
timeRange.addEventListener("input", () => { stop(); setU(timeRange.value / 1000); });
for (const b of document.querySelectorAll("[data-mass]")) b.addEventListener("click", () => setStar({ mass: +b.dataset.mass }));

function setMode(m) {
  st.mode = m;
  for (const b of document.querySelectorAll(".tabs [data-mode]")) b.setAttribute("aria-selected", String(b.dataset.mode === m));
  if (m === "fate" && !st.playing) {
    // Jump to the supernova (or the end of life) so the fate is on screen.
    const i = model.stages.findIndex((x) => x.id === "supernova");
    if (i >= 0) setU(P.stageStartU(model.stages, i) + (reducedMotion ? 0.12 : 1e-4));
    else setU(1);
    if (i >= 0 && !reducedMotion) playSupernova();
  }
  writeUrl(); mark();
}
for (const b of document.querySelectorAll(".tabs [data-mode]")) b.addEventListener("click", () => setMode(b.dataset.mode));

// Play: the main sequence takes longer for long-lived stars (and drains faster for heavy ones).
let lastNow = 0;
function msPlaySeconds() { return P.clamp(7.5 * Math.pow(model.ms.lifetime / 10, 0.25), 1.5, 20); }
function play() {
  if (st.u >= 0.999) setU(0);
  st.playing = true; lastNow = 0; $("playBtn").classList.add("playing"); $("playBtn").setAttribute("aria-label", "Pause"); schedule();
}
function stop() { st.playing = false; $("playBtn").classList.remove("playing"); $("playBtn").setAttribute("aria-label", "Play the star's life"); st.snPlay = false; }
$("playBtn").addEventListener("click", () => (st.playing ? stop() : play()));
function playSupernova() {
  const i = model.stages.findIndex((x) => x.id === "supernova");
  if (i < 0) return;
  st.snPlay = true; st.snFrom = P.stageStartU(model.stages, i); st.snTo = i + 1 < model.stages.length ? P.stageStartU(model.stages, i + 1) - 1e-4 : 1;
  st.snStart = 0; setU(st.snFrom); schedule();
}
$("replayBtn").addEventListener("click", () => { stop(); if (reducedMotion) { st.sn.to = -1; mark(); return; } playSupernova(); });
$("squeezeBtn").addEventListener("click", () => { st.squeezeT = performance.now(); if (reducedMotion) st.squeezeT = performance.now() - 300; schedule(); });

$("studyBackBtn").addEventListener("click", (e) => {
  e.preventDefault();
  forwardStudyQuery(location.search);
  location.href = "study.html" + location.search;
});

let capTimer = 0;
function toastCaption(msg) { const el = $("detailCaption"); el.textContent = msg; clearTimeout(capTimer); capTimer = setTimeout(mark, 3000); }

// ---------- frame loop (runs only while something moves) ----------
let raf = 0;
function schedule() { if (!raf) raf = requestAnimationFrame(frame); }
function frame(now) {
  raf = 0;
  let again = false;
  if (st.playing) {
    const dt = lastNow ? Math.min(0.05, (now - lastNow) / 1000) : 0; lastNow = now;
    const { at } = current();
    const seg = at.index === 0 ? 0.5 : 0.5 / (model.stages.length - 1);
    const secs = at.index === 0 ? msPlaySeconds() : at.stage.id === "supernova" ? 1.6 : 1.4;
    const u = st.u + dt * seg / secs;
    if (u >= 1) { setU(1); stop(); } else setU(u);
    again = st.playing;
  }
  if (st.snPlay) {
    if (!st.snStart) st.snStart = now;
    const k = (now - st.snStart) / 1600;
    setU(st.snFrom + Math.min(1, k) * (st.snTo - st.snFrom));
    if (k >= 1) st.snPlay = false; else again = true;
  }
  if (st.squeezeT >= 0) {
    const t = (now - st.squeezeT) / 1000;
    if (t > 12 || reducedMotion) { if (!reducedMotion) st.squeezeT = -1; } else again = true;
    dirty = true;
  }
  if (st.sn.mix < 1) again = true;
  if (dirty) {
    const t0 = performance.now();
    dirty = false; draw(now);
    // Adaptive resolution: drop canvas resolution if frames get slow, restore when idle.
    const ms = performance.now() - t0;
    if (ms > 22) { if (++st.slowFrames > 4 && st.dprScale > 0.5) { st.dprScale = Math.max(0.5, st.dprScale - 0.25); st.slowFrames = 0; } } else st.slowFrames = 0;
  }
  if (again) schedule();
  else if (st.dprScale < 1) { st.dprScale = 1; dirty = true; schedule(); }
}

// ---------- formatting ----------
function fmtM(m) { return m < 1 ? m.toFixed(2) : m < 10 ? m.toFixed(1) : Math.round(m).toString(); }
function fmtR(r) { return r < 10 ? r.toFixed(2) : Math.round(r).toString(); }
function fmtL(l) { return l >= 1000 ? Math.round(l).toLocaleString("en-US") : l >= 10 ? l.toFixed(0) : l >= 0.1 ? l.toFixed(2) : l.toPrecision(2); }
function mk(t) { return t >= 1e9 ? (t / 1e9).toPrecision(2) + " billion K" : (t / 1e6).toFixed(t < 1e8 ? 1 : 0) + " MK"; }
function sci(x) { const e = Math.floor(Math.log10(x)); return (x / Math.pow(10, e)).toFixed(1) + " \u00d7 10" + R.sup(e); }
function fmtMin(m) { return m < 120 ? Math.round(m) + " minutes" : (m / 60).toFixed(m < 600 ? 1 : 0) + " hours"; }

// ---------- start ----------
rebuild();
if (init.stage) { const i = model.stages.findIndex((x) => x.id === init.stage); if (i >= 0) st.u = P.stageStartU(model.stages, i) + 0.02; }
syncControls();
setMode(st.mode);
syncTime();
writeUrl();
R.preload("cut-" + model.ms.transport.cutaway, mark);
new ResizeObserver(() => { drawStrip(); mark(); }).observe(document.body);
document.fonts && document.fonts.ready.then(mark);
