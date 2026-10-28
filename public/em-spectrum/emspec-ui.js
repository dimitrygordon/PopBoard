// Electromagnetic Spectrum Explorer: page wiring.
// Physics and data: emspec-physics.js. Drawing: emspec-render.js.

import { forwardStudyQuery } from "../board-return.js?v=20261022a";
import { loadImages, readTokens, drawSpectrumBar, drawWave, drawEnergy, drawAtmosphere, drawOpacity, drawOptics, drawSky, posOf, lambdaAt } from "./emspec-render.js";
import {
  BANDS, bandById, bandOf, sliderToWavelength, wavelengthToSlider, sliderToFrequency, frequencyToSlider,
  frequencyFromWavelength, BAND_BOUNDARY_NOTE, photonEnergyEV, photonEnergyJ, energyFromWavelengthEV, isIonizing, nearestScale,
  ENERGY_MARKS, ATMOSPHERE, artRecenter, transmission, TELESCOPES, telescopeFor, diffractionLimitArcsec, OBJECTS, objectById,
  parseQuery, MODES, sci, formatLength, formatFrequency, formatEnergyEV
} from "./emspec-physics.js";

const $ = (id) => document.getElementById(id);
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let T = readTokens();
const q = parseQuery(location.search);

const st = {
  mode: q.mode,
  lambda: q.band ? bandById(q.band).center : 550e-9,
  lambdaB: 0.21,
  object: q.object || "crab",
  fade: null,            // { from: bandId, to: bandId, t0 }
  phase: 0,
  dpr: Math.min(2, window.devicePixelRatio || 1)
};
if (st.mode === "sky" && !q.band) st.lambda = bandById("xray").center;

// Art: only what the current view needs is drawn; all of it is small WebP.
const ART = ["atmosphere-cross-section", ...["building", "human", "bee", "pinhead", "cell", "molecule", "atom", "nucleus"].map((s) => "scale-" + s)];
const img = loadImages(ART, () => markAll());
const skyImg = {};
function skyArt(objectId, bandId) {
  const name = `${objectById(objectId).art}-${bandId}-mask`;
  if (!skyImg[name]) skyImg[name] = loadImages([name], () => { panels.sky.dirty = true; })[name];
  return skyImg[name];
}

const panels = {
  spec: { canvas: $("specCanvas") }, wave: { canvas: $("waveCanvas") }, energy: { canvas: $("energyCanvas") },
  atmo: { canvas: $("atmoCanvas") }, opacity: { canvas: $("opacityCanvas") }, optics: { canvas: $("opticsCanvas") }, sky: { canvas: $("skyCanvas") }
};
for (const p of Object.values(panels)) { p.ctx = p.canvas.getContext("2d"); p.dirty = true; p.w = p.h = 0; }
function markAll() { for (const p of Object.values(panels)) p.dirty = true; }

// ---------- band buttons, telescopes, objects ----------
const band = () => bandOf(st.lambda);
for (const b of BANDS) {
  const el = document.createElement("button");
  el.type = "button"; el.dataset.band = b.id; el.textContent = b.name;
  el.setAttribute("aria-pressed", "false");
  el.style.boxShadow = `inset 0 -4px 0 ${T.band[b.id]}`;
  el.addEventListener("click", () => setBand(b.id));
  $("bandButtons").appendChild(el);
}
for (const t of TELESCOPES) {
  const el = document.createElement("button");
  el.type = "button"; el.className = "scope-card"; el.dataset.band = t.band; el.setAttribute("aria-pressed", "false");
  el.setAttribute("aria-label", `${t.name}, ${bandById(t.band).name}`);
  el.innerHTML = `<img alt="" src="em-spectrum/assets/${t.art}.webp" style="transform:${artRecenter(t.art)}" loading="lazy" decoding="async"><span>${bandById(t.band).name}<br>${t.where === "space" ? "in space" : "on the ground"}</span>`;
  el.addEventListener("click", () => setBand(t.band));
  $("scopeCards").appendChild(el);
}
for (const o of OBJECTS) {
  const el = document.createElement("button");
  el.type = "button"; el.dataset.object = o.id; el.textContent = o.name; el.setAttribute("aria-pressed", "false");
  el.addEventListener("click", () => { st.object = o.id; st.fade = null; sync(); });
  $("objectButtons").appendChild(el);
}

function setBand(id) { setLambda(bandById(id).center); }
function setLambda(l) {
  const before = band().id;
  st.lambda = Math.min(sliderToWavelength(1), Math.max(sliderToWavelength(0), l));
  const after = band().id;
  if (before !== after && st.mode === "sky" && !reducedMotion) st.fade = { from: before, to: after, t0: performance.now() };
  sync();
}

// ---------- sliders ----------
const S = (v) => Math.round(v * 1000);
$("lambdaSlider").addEventListener("input", (e) => setLambda(sliderToWavelength(e.target.value / 1000)));
$("freqSlider").addEventListener("input", (e) => setLambda(frequencyToLambda(sliderToFrequency(e.target.value / 1000))));
$("lambdaSliderA").addEventListener("input", (e) => setLambda(sliderToWavelength(e.target.value / 1000)));
$("lambdaSliderB").addEventListener("input", (e) => { st.lambdaB = sliderToWavelength(e.target.value / 1000); sync(); });
const frequencyToLambda = (f) => 299792458 / f;

// spectrum bar: tap or drag; arrow keys step a twentieth of a decade
let dragging = false;
const specPick = (e) => { const r = panels.spec.canvas.getBoundingClientRect(); setLambda(lambdaAt((e.clientX - r.left) / r.width)); };
panels.spec.canvas.addEventListener("pointerdown", (e) => { dragging = true; panels.spec.canvas.setPointerCapture(e.pointerId); specPick(e); });
panels.spec.canvas.addEventListener("pointermove", (e) => { if (dragging) specPick(e); });
panels.spec.canvas.addEventListener("pointerup", () => { dragging = false; });
panels.spec.canvas.addEventListener("pointercancel", () => { dragging = false; });
panels.spec.canvas.addEventListener("keydown", (e) => {
  const step = { ArrowRight: -0.05, ArrowUp: -0.05, ArrowLeft: 0.05, ArrowDown: 0.05 }[e.key];
  if (step) { e.preventDefault(); setLambda(st.lambda * 10 ** step); }
});

// ---------- modes ----------
function setMode(m) {
  st.mode = m; st.fade = null;
  for (const s of document.querySelectorAll(".mode")) s.hidden = s.dataset.mode !== m;
  for (const b of document.querySelectorAll(".tool[data-show]")) b.setAttribute("aria-pressed", String(b.dataset.show === m));
  sync(); requestAnimationFrame(resize);
}
for (const b of document.querySelectorAll(".tool[data-show]")) b.addEventListener("click", () => setMode(b.dataset.show));

// Keep the URL a shareable deep link: return keys plus mode, band, object.
function writeUrl() {
  const p = forwardStudyQuery(location.search);
  p.set("mode", st.mode); p.set("band", band().id);
  if (st.mode === "sky") p.set("object", st.object);
  history.replaceState(null, "", "?" + p.toString());
}

// ---------- readouts ----------
function sync() {
  const b = band(), l = st.lambda, f = frequencyFromWavelength(l);
  const eV = photonEnergyEV(f), J = photonEnergyJ(f);
  for (const el of document.querySelectorAll("#bandButtons button")) el.setAttribute("aria-pressed", String(el.dataset.band === b.id));
  for (const el of document.querySelectorAll(".scope-card")) el.setAttribute("aria-pressed", String(el.dataset.band === b.id));
  for (const el of document.querySelectorAll("#objectButtons button")) el.setAttribute("aria-pressed", String(el.dataset.object === st.object));
  const spec = panels.spec.canvas;
  spec.setAttribute("aria-valuenow", String(S(posOf(l)))); spec.setAttribute("aria-valuetext", `${formatLength(l)}, ${b.name}`);

  $("lambdaSlider").value = S(wavelengthToSlider(l));
  $("freqSlider").value = S(frequencyToSlider(f));
  $("lambdaOut").textContent = `${formatLength(l)}  (${sci(l)} m)`;
  $("freqOut").textContent = `${formatFrequency(f)}  (${sci(f)} Hz)`;
  $("waveFormula").textContent = `c = \u03bb f\n${sci(l)} m \u00d7 ${sci(f)} Hz = ${sci(l * f)} m/s`;
  $("waveEnergy").textContent = `E = h f = ${formatEnergyEV(eV)} = ${sci(J)} J`;
  const n = nearestScale(l);
  $("bandNote").textContent = BAND_BOUNDARY_NOTE;
  $("waveScale").textContent = `${b.name}. One wavelength is about the size of a ${n.label}. Longer wavelength means lower frequency: the two sliders move in opposite directions because their product is always the speed of light.`;

  const lB = st.lambdaB, eA = eV, eB = energyFromWavelengthEV(lB);
  $("lambdaSliderA").value = S(wavelengthToSlider(l)); $("lambdaSliderB").value = S(wavelengthToSlider(lB));
  $("aOut").textContent = `${formatLength(l)}: ${formatEnergyEV(eA)} = ${sci(eA * 1.602176634e-19)} J (${b.name})`;
  $("bOut").textContent = `${formatLength(lB)}: ${formatEnergyEV(eB)} = ${sci(eB * 1.602176634e-19)} J (${bandOf(lB).name})`;
  const ratio = eA / eB;
  $("energyRatio").textContent = ratio >= 1 ? `E_A / E_B = ${sci(ratio)}\nOne photon A carries ${sci(ratio)} times the energy of photon B.` : `E_B / E_A = ${sci(1 / ratio)}\nOne photon B carries ${sci(1 / ratio)} times the energy of photon A.`;
  $("energyNote").textContent = `${isIonizing(eA) ? "Photon A is ionizing (above about 10 eV). Far UV, X-rays and gamma rays ionize atoms. UVB (280 to 315 nm) can still damage DNA without ionizing." : "Photon A is not ionizing: below about 10 eV a single photon cannot knock electrons off most atoms, however bright the light."} 1 eV = 1.602 \u00d7 10\u207b\u00b9\u2079 J.`;

  const tr = transmission(l), a = ATMOSPHERE[b.id];
  $("atmoReadout").textContent = `${formatLength(l)} (${b.name})\nAbout ${Math.round(tr * 100)}% reaches sea level, ${Math.round((1 - tr) * 100)}% is absorbed or reflected.`;
  $("atmoNote").textContent = a.by + " The curve is a simplified average for clear, dry air.";

  const t = telescopeFor(b.id);
  $("scopeTitle").textContent = `${t.name} (${t.where === "space" ? "in space" : "on the ground"})`;
  $("scopeHow").textContent = t.how;
  $("scopeRes").textContent = t.D ? `Sharpest detail: \u03b8 = 1.22 \u03bb / D\n= 1.22 \u00d7 ${formatLength(t.lambda)} / ${t.D} m = ${fmtArc(diffractionLimitArcsec(t.lambda, t.D))}` +
    (t.optics === "grazing" ? "\nReal X-ray mirrors are limited by surface shape, not by this number (about 0.5 arcsec for the best)." : "")
    : "No mirror or lens: direction comes from particle tracks. Fermi-LAT (68% containment): about 5 deg at 100 MeV, about 0.8 deg at 1 GeV, about 0.15 deg at 10 GeV and about 0.1 deg above 30 GeV.";

  const o = objectById(st.object);
  $("skyTitle").textContent = `${o.name} seen in ${{ radio: "radio waves", infrared: "infrared", visible: "visible light", ultraviolet: "ultraviolet", xray: "X-rays", gamma: "gamma rays" }[b.id]}`;
  $("skyCaption").textContent = o.views[b.id] + " Colors are false: each band is tinted with its color from the bar so you can tell them apart.";
  $("skyScope").src = `em-spectrum/assets/${t.art}.webp`;
  $("skyScope").style.transform = artRecenter(t.art);
  $("skyScopeCap").textContent = `Seen with: ${t.name.toLowerCase()}, ${t.where === "space" ? "in space" : "on the ground"}.`;
  $("skyLabel").textContent = `${b.name} view`;
  writeUrl();
  markAll();
}
const fmtArc = (a) => a >= 60 ? `${(a / 60).toPrecision(3)} arcmin` : a >= 0.01 ? `${a.toPrecision(2)} arcsec` : `${sci(a, 2)} arcsec`;

// ---------- sizing and drawing ----------
function resize() {
  for (const p of Object.values(panels)) {
    const r = p.canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
    if (w === p.w && h === p.h && p.canvas.width === Math.round(w * st.dpr)) continue;
    p.w = w; p.h = h; p.canvas.width = Math.round(w * st.dpr); p.canvas.height = Math.round(h * st.dpr); p.dirty = true;
  }
}
const visible = (p) => p.canvas.offsetParent !== null && p.w > 1;
const GLOW = { gamma: 0.12 };

function draw(name, now) {
  const p = panels[name];
  if (!visible(p)) return;
  const { ctx, w, h } = p;
  ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
  const b = band();
  if (name === "spec") drawSpectrumBar(ctx, w, h, T, { lambda: st.lambda });
  else if (name === "wave") drawWave(ctx, w, h, T, { lambda: st.lambda, phase: st.phase, icons: img });
  else if (name === "energy") drawEnergy(ctx, w, h, T, { eA: energyFromWavelengthEV(st.lambda), eB: energyFromWavelengthEV(st.lambdaB), marks: ENERGY_MARKS });
  else if (name === "atmo") drawAtmosphere(ctx, w, h, T, { img: img["atmosphere-cross-section"], bandId: b.id });
  else if (name === "opacity") drawOpacity(ctx, w, h, T, { lambda: st.lambda });
  else if (name === "optics") drawOptics(ctx, w, h, T, { optics: telescopeFor(b.id).optics, color: b.id === "visible" ? "#d9a400" : T.band[b.id] });
  else if (name === "sky") {
    const layer = (bid, alpha) => ({ img: skyArt(st.object, bid), color: T.band[bid], alpha, glow: st.object !== "sun" && GLOW[bid] });
    let layers = [layer(b.id, 1)];
    if (st.fade) {
      const k = Math.min(1, (now - st.fade.t0) / 450);
      layers = [layer(st.fade.from, 1 - k), layer(st.fade.to, k)];
      if (k >= 1) st.fade = null; else p.dirty = true;
    }
    drawSky(ctx, w, h, T, { layers });
  }
}

function frame(now) {
  if (st.mode === "wave" && !reducedMotion && !document.hidden) { st.phase = (st.phase - 0.03) % (Math.PI * 2); panels.wave.dirty = true; }
  for (const [n, p] of Object.entries(panels)) if (p.dirty) { p.dirty = false; draw(n, now); }
  requestAnimationFrame(frame);
}

$("studyBackBtn").addEventListener("click", (e) => {
  e.preventDefault();
  // Back to the Study library with the board return keys only: drop this
  // module's mode/band/object from the URL first, then hand over the query.
  const qs = forwardStudyQuery(location.search).toString();
  history.replaceState(null, "", qs ? "?" + qs : location.pathname);
  location.href = "study.html" + location.search;
});

window.addEventListener("resize", () => { T = readTokens(); resize(); });
new ResizeObserver(() => resize()).observe($("stage"));
setMode(MODES.includes(st.mode) ? st.mode : "wave");
requestAnimationFrame(frame);
// Read-only hook for the Playwright checks.
window.__emspec = { state: st, panels };
