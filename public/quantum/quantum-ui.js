// Quantum Physics: page wiring and the scenes for each mode.
// Physics and data: quantum-physics.js. Drawing helpers: quantum-render.js.

import { forwardStudyQuery } from "../board-return.js?v=20261022a";
import { loadImages, ready, readTokens, text, line, arrow, sprite, rgb, photon, electron, wave, spectrum } from "./quantum-render.js";
import {
  H, C, METALS, METAL_IDS, KE_FLOOR, cutoffFreq, cutoffLam, photonEV, freqOf, bandOf, colorName, levelEV, transitionNm, SERIES,
  BALMER, N_MAX, PARTICLES, PARTICLE_IDS, ME, ATOM_M, absorbedLine, ionizes, slitSetup, intensity, sampleHit,
  SLIDERS, SLIDER_KEY, fromSlider, toSlider, modeSliders, shown, MODES, parseQuery, sig, sci, len
} from "./quantum-physics.js";

const $ = (id) => document.getElementById(id);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const THEME_KEY = "popboard.quantum.theme";
let T = readTokens();
const q = parseQuery(location.search);
let dirty = true;
const img = loadImages(() => { dirty = true; });

const snap = (name, v) => fromSlider(name, toSlider(name, v));
const st = {
  mode: q.mode,
  photon: { lam: snap("lam", 500) },
  photoelectric: { lam: snap("lamPE", 400), inten: 50, metal: "Na" },
  hydrogen: { nUp: 3, nLow: 2 },
  debroglie: { particle: "electron", v: snap("vE", 2e6), vs: { electron: snap("vE", 2e6), proton: snap("vP", 2e3), baseball: snap("vB", 40) } },
  doubleslit: { source: "electron", lam: snap("lamDS", 550), keV: snap("keV", 50), watched: false, curve: false, hits: [], key: "" },
  sandbox: { source: "light", target: "metal", metal: "Zn", lam: snap("lamSB", 250), inten: 60, keV: snap("keV", 50), dL: snap("dL", 0.25), dE: snap("dE", 1), watched: false, curve: false, hits: [], key: "" }
};
let running = false;

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

// ---------- sliders ----------
const LABELS = {
  lam: "Wavelength \u03bb", lamPE: "Wavelength \u03bb", inten: "Light intensity", vE: "Speed v", vP: "Speed v", vB: "Speed v",
  lamDS: "Wavelength \u03bb", keV: "Electron energy", lamSB: "Wavelength \u03bb", dL: "Slit spacing d", dE: "Slit spacing d"
};
const cur = () => st[st.mode];
const fmtSlider = {
  lam: (v) => sig(v, 3) + " nm", lamPE: (v) => sig(v, 3) + " nm", lamDS: (v) => sig(v, 3) + " nm", lamSB: (v) => sig(v, 3) + " nm",
  inten: (v) => Math.round(v) + "%", vE: (v) => sci(v) + " m/s", vP: (v) => sci(v) + " m/s", vB: (v) => sig(v, 3) + " m/s",
  keV: (v) => sig(v, 3) + " keV", dL: (v) => sig(v, 2) + " mm", dE: (v) => sig(v, 2) + " \u00b5m"
};
function button(host, label, onClick) {
  const b = document.createElement("button"); b.type = "button"; b.textContent = label;
  b.addEventListener("click", onClick); host.appendChild(b); return b;
}
function buildControls() {
  const host = $$("[data-sliders]")[0];
  host.innerHTML = "";
  for (const k of modeSliders(st.mode, cur())) {
    const lab = document.createElement("label"); lab.className = "slider";
    const sp = document.createElement("span"); sp.textContent = LABELS[k];
    const out = document.createElement("output"); out.dataset.out = k;
    const inp = document.createElement("input"); inp.type = "range"; inp.min = "0"; inp.max = String(SLIDERS[k].steps); inp.step = "1"; inp.dataset.slider = k;
    inp.setAttribute("aria-label", LABELS[k]);
    inp.addEventListener("input", () => {
      const v = fromSlider(k, Number(inp.value)), s = cur();
      s[SLIDER_KEY[k]] = v;
      if (st.mode === "debroglie") s.vs[s.particle] = v;
      sync();
    });
    lab.append(sp, out, inp); host.appendChild(lab);
  }
  const rows = $$("[data-choices]")[0]; rows.innerHTML = "";
  const group = (label, items, isOn, pick, disabled = () => false) => {
    const g = document.createElement("div"); g.className = "group";
    const h = document.createElement("p"); h.className = "group-label"; h.textContent = label; g.appendChild(h);
    const r = document.createElement("div"); r.className = "row"; r.setAttribute("role", "group"); r.setAttribute("aria-label", label);
    for (const [val, t] of items) {
      const b = button(r, t, () => { pick(val); sync(); });
      b.dataset.choice = label; b._on = () => isOn(val); b._off = () => disabled(val);
    }
    g.appendChild(r); rows.appendChild(g);
  };
  const s = cur(), metals = METAL_IDS.map((id) => [id, METALS[id].name]);
  if (st.mode === "photoelectric") group("Metal", metals, (v) => s.metal === v, (v) => { s.metal = v; });
  else if (st.mode === "hydrogen") {
    const ns = (lo, hi) => Array.from({ length: hi - lo + 1 }, (_, i) => [lo + i, "n = " + (lo + i)]);
    group("Electron starts on (upper level)", ns(2, N_MAX), (v) => s.nUp === v, (v) => { s.nUp = v; if (s.nLow >= v) s.nLow = v - 1; });
    group("Electron drops to (lower level)", ns(1, N_MAX - 1), (v) => s.nLow === v, (v) => { s.nLow = v; if (s.nUp <= v) s.nUp = v + 1; });
  } else if (st.mode === "debroglie") {
    group("Particle", PARTICLE_IDS.map((id) => [id, PARTICLES[id].name]), (v) => s.particle === v, (v) => { s.particle = v; s.v = s.vs[v]; buildControls(); });
  } else if (st.mode === "doubleslit" || st.mode === "sandbox") {
    if (st.mode === "doubleslit") group("Source", [["light", "Light (photons)"], ["electron", "Electrons"]], (v) => s.source === v, (v) => { s.source = v; buildControls(); });
    else {
      group("Source", [["light", "Lamp"], ["electron", "Electron gun"]], (v) => s.source === v, (v) => { s.source = v; if (v === "electron") s.target = "slits"; buildControls(); });
      group("Target", [["metal", "Metal plate"], ["slits", "Double slit"], ["hydrogen", "Hydrogen gas"]], (v) => s.target === v, (v) => { s.target = v; buildControls(); },
        (v) => s.source === "electron" && v !== "slits");
      if (s.target === "metal") group("Metal", metals, (v) => s.metal === v, (v) => { s.metal = v; });
    }
    if (st.mode === "doubleslit" || s.target === "slits") {
      group("Which-slit detector", [[false, "Off"], [true, "On"]], (v) => s.watched === v, (v) => { s.watched = v; });
      group("Send particles", [["one", "Send 1"], ["many", "Send 100"], ["run", "Run"], ["clear", "Clear"]], (v) => v === "run" && running, (v) => {
        if (v === "one") addHits(1); else if (v === "many") addHits(100); else if (v === "run") running = !running; else { s.hits = []; running = false; }
      });
      group("Probability curve", [[false, "Hide"], [true, "Show"]], (v) => s.curve === v, (v) => { s.curve = v; });
    }
  }
}

// ---------- double-slit hits ----------
let rng = Math.random;
const flying = [];
function slitKey(s) { const k = slitSetup(s); return [s.source, k.lamM, k.d, s.watched].join("|"); }
function addHits(n) {
  const s = cur(), k = slitSetup(s);
  for (let i = 0; i < n; i++) {
    const h = { u: sampleHit(k.lamM, k.d, k.L, k.half, s.watched, rng) / k.half, v: rng() * 2 - 1 };
    if (s.hits.length < 6000) s.hits.push(h);
    if (!reducedMotion && n < 5) flying.push({ t: 0, h });
  }
  dirty = true;
}

// ---------- readouts ----------
const TITLES = {
  photon: "Photon energy", photoelectric: "Photoelectric effect", hydrogen: "Hydrogen energy levels",
  debroglie: "de Broglie wavelength", doubleslit: "Double slit, one particle at a time", sandbox: "Sandbox"
};
const NOTES = {
  photon: "Light comes in packets of energy called photons. A photon's energy depends only on its frequency: E = hf. Shorter wavelength means higher frequency and more energy, so an ultraviolet photon carries more energy than a red one. Brighter light means more photons, not bigger ones. The wave is drawn to scale only relative to other wavelengths.",
  photoelectric: "Each photon gives all its energy to one electron in the metal. The electron needs at least the work function \u03c6 to escape, and keeps the rest as kinetic energy. Below the cut-off frequency no electrons come out however bright the light is. Brighter light above the cut-off frees more electrons per second, but each one leaves with the same maximum kinetic energy. The stopping voltage is the reverse voltage that just stops the fastest electrons.",
  hydrogen: "The electron in a hydrogen atom can only have certain energies, E\u2099 = \u221213.6 eV / n\u00b2. When it drops from a higher level to a lower one, the atom gives off one photon carrying exactly the energy difference. Drops to n = 2 (the Balmer series) give the four visible lines of hydrogen, at 656, 486, 434 and 410 nm, from red to violet. Drops to n = 1 give ultraviolet light. The rings in the picture show the order of the levels, not their true sizes.",
  debroglie: "Every moving particle has a wavelength, \u03bb = h/p, where p = mv is its momentum. Electrons are so light that their wavelength can be as large as an atom, which is why electrons diffract off crystals. A thrown baseball has a wavelength far too small to ever measure, so it acts only like a particle. The wave in the picture is not to scale; the ruler below is.",
  doubleslit: "Particles go through the slits one at a time, and each lands as a single dot. No single dot shows a pattern, but after many dots the bright and dark fringes of an interference pattern appear, just like a wave going through both slits. Turn on the which-slit detector: once we know which slit each particle used, the fringes disappear and only a broad spread is left. The electron setup is a model (slits 1 \u00b5m apart, screen 1 m away); real experiments use similar tiny slits or an electron biprism.",
  sandbox: "Free play. Pick a lamp or an electron gun, then aim it at a metal plate, a double slit or a tube of hydrogen gas. Change the wavelength, brightness and slit spacing and see what happens. Hydrogen gas at room temperature has its electrons on n = 1, so it only absorbs ultraviolet photons that match a jump up from n = 1 (the sandbox counts a match within 0.5%; real lines are much narrower)."
};
const hJs = "h = 6.626 \u00d7 10\u207b\u00b3\u2074 J\u00b7s, c = 3.00 \u00d7 10\u2078 m/s";
const where = (lam) => { const c = colorName(lam); return c ? `visible, ${c}` : bandOf(lam); };
function peLines(s, v) {
  const m = METALS[s.metal];
  const out = [`${m.name}: work function \u03c6 = ${m.phi.toFixed(2)} eV`,
    `Cut-off: f\u2080 = \u03c6/h = ${sci(cutoffFreq(m.phi))} Hz, \u03bb\u2080 = hc/\u03c6 = ${sig(cutoffLam(m.phi), 3)} nm`,
    `Photon: \u03bb = ${sig(v.lam, 3)} nm, f = ${sci(v.f)} Hz, E = hf = ${v.E.toFixed(2)} eV`];
  if (v.rate === null) out.push(`hf < \u03c6: no electrons escape, however bright the light.`);
  else {
    if (v.ke === null) out.push(`Just above the cut-off: K max is under ${KE_FLOOR} eV, so the electrons barely get out.`);
    else out.push(`K max = hf \u2212 \u03c6 = ${v.ke.toFixed(2)} eV`, `Stopping voltage V\u209b = K max/e = ${v.vStop.toFixed(2)} V`);
    out.push(`Electrons per second: ${Math.round(v.rate)}% of the most this lamp can free (proportional to intensity)`);
  }
  return out;
}
function slitLines(s, v) {
  const k = slitSetup(s), out = [];
  if (s.source === "electron") out.push(`Electrons at ${sig(s.keV, 3)} keV: \u03bb = h/p = ${len(v.lam)}`);
  else out.push(`Light: \u03bb = ${sig(s.lam, 3)} nm (${where(s.lam)})`);
  out.push(`Slits d = ${len(k.d, 2)} apart, screen L = ${sig(k.L, 3)} m away`);
  out.push(`Fringe spacing \u0394y = \u03bbL/d = ${len(v.dy)}`);
  out.push(`Particles on the screen: ${s.hits.length}`);
  out.push(s.watched ? "Detector on: we know which slit, so no fringes." : "Detector off: fringes build up.");
  return out;
}
function readout() {
  const m = st.mode, s = cur(), v = shown(m, s);
  if (m === "photon") return [`\u03bb = ${sig(v.lam, 3)} nm (${where(v.lam)})`, `f = c/\u03bb = ${sci(v.f)} Hz`, `E = hf = hc/\u03bb = ${v.eV.toFixed(2)} eV = ${sci(v.J)} J`, hJs, "1 eV = 1.602 \u00d7 10\u207b\u00b9\u2079 J"].join("\n");
  if (m === "photoelectric") return peLines(s, v).join("\n");
  if (m === "hydrogen") {
    const lam = v.lam;
    return [`E\u2099 = \u221213.6 eV / n\u00b2`, `E${sub(s.nUp)} = ${sig(v.eUp, 3)} eV, E${sub(s.nLow)} = ${sig(v.eLow, 3)} eV`,
      `Photon energy \u0394E = ${v.dE.toFixed(2)} eV`, `\u03bb = hc/\u0394E = ${sig(lam, 3)} nm (${where(lam)})`,
      `${SERIES[s.nLow]} series (ends on n = ${s.nLow})`].join("\n");
  }
  if (m === "debroglie") {
    const p = PARTICLES[s.particle], r = v.lam / ATOM_M;
    const cmp = r >= 1 ? `${sig(r, 2)} times the size of an atom (about 0.1 nm)` : `${sci(1 / r, 2)} times smaller than an atom (about 0.1 nm)`;
    const out = [`${p.name}, m = ${sci(p.m)} kg`, `v = ${p.m < 1 ? sci(v.v) : sig(v.v, 3)} m/s`, `p = mv = ${sci(v.p)} kg\u00b7m/s`, `\u03bb = h/p = ${len(v.lam)}`, `That is ${cmp}.`,
      `Kinetic energy \u00bdmv\u00b2 = ${sci(v.ke)} J${p.m === ME ? ` = ${sig(v.ke / 1.602176634e-19, 3)} eV` : ""}`];
    return out.join("\n");
  }
  if (m === "doubleslit") return slitLines(s, v).join("\n");
  if (s.source === "electron" || s.target === "slits") return slitLines(s, v).join("\n");
  if (s.target === "metal") return peLines(s, v).join("\n");
  const n = absorbedLine(s.lam), out = [`Photon: \u03bb = ${sig(s.lam, 3)} nm (${where(s.lam)}), E = ${v.E.toFixed(2)} eV`];
  if (ionizes(s.lam)) out.push("E \u2265 13.6 eV: the photon knocks the electron out of the atom (ionization).");
  else if (n) out.push(`Absorbed: matches n = 1 \u2192 n = ${n} (${sig(transitionNm(n, 1), 3)} nm, ${(-levelEV(1) + levelEV(n)).toFixed(2)} eV)`);
  else out.push("Not absorbed: no jump up from n = 1 has this energy. Lyman lines: 122, 103, 97.3, 95.0, 93.8 nm.");
  return out.join("\n");
}
const sub = (n) => String(n).split("").map((d) => "\u2080\u2081\u2082\u2083\u2084\u2085\u2086\u2087\u2088\u2089"[d]).join("");

function setMode(m) {
  st.mode = m; running = false; flying.length = 0;
  for (const b of $$(".toolbar .tool")) b.setAttribute("aria-pressed", String(b.dataset.show === m));
  buildControls(); sync();
}
function writeUrl() {
  const p = new URLSearchParams(location.search);
  p.set("mode", st.mode);
  history.replaceState(null, "", "?" + p.toString());
}
for (const b of $$(".toolbar .tool")) b.addEventListener("click", () => setMode(b.dataset.show));
function sync() {
  const s = cur();
  if (s.hits) { const k = slitKey(s); if (k !== s.key) { s.key = k; s.hits = []; flying.length = 0; } }
  $("panelTitle").textContent = TITLES[st.mode];
  for (const el of $$("[data-slider]")) {
    const k = el.dataset.slider, v = s[SLIDER_KEY[k]];
    el.value = String(toSlider(k, v));
    const out = $$(`[data-out="${k}"]`)[0]; if (out) out.textContent = fmtSlider[k](v);
  }
  for (const b of $$("[data-choice]")) {
    if (b._on) b.setAttribute("aria-pressed", String(b._on()));
    if (b._off) b.disabled = b._off();
    if (b.textContent === "Run" || b.textContent === "Pause") b.textContent = running ? "Pause" : "Run";
  }
  $("readout").textContent = readout();
  $("note").textContent = NOTES[st.mode];
  sc.setAttribute("aria-label", TITLES[st.mode] + ". " + readout().replace(/\n/g, ". "));
  writeUrl();
  dirty = true;
}

// ---------- canvas ----------
const sc = $("scene"), ctx = sc.getContext("2d");
let dpr = Math.min(2, window.devicePixelRatio || 1);
const size = { w: 1, h: 1 };
function resize() {
  const a = sc.getBoundingClientRect();
  const w = Math.max(1, Math.round(a.width)), h = Math.max(1, Math.round(a.height));
  if (w !== size.w || h !== size.h) { size.w = w; size.h = h; sc.width = Math.round(w * dpr); sc.height = Math.round(h * dpr); dirty = true; }
}
let t = 0; // seconds of animation (frozen when reduced motion)
function draw() {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = T.paper; ctx.fillRect(0, 0, size.w, size.h);
  const m = st.mode, s = cur();
  if (m === "photon") drawPhoton(s);
  else if (m === "photoelectric") drawPhotoelectric(s, { x: 0, y: 0, w: size.w, h: size.h });
  else if (m === "hydrogen") drawHydrogen(s);
  else if (m === "debroglie") drawDeBroglie(s);
  else if (m === "doubleslit") drawSlits(s, { x: 0, y: 0, w: size.w, h: size.h });
  else drawSandbox(s);
}
// Lamp art: 1024 px, mouth at about (800, 250), base bottom at 972.
function lamp(x, y, hPx) { const k = hPx / 920; sprite(ctx, img["light-source-lamp"], 800, 250, k, x, y); return k; }
const lampColor = (lam, a) => (lam >= 380 && lam <= 750 ? rgb(lam, a) : T.dark ? `rgba(190,170,255,${a})` : `rgba(110,60,200,${a})`);
const wavePx = (lam, w) => Math.max(14, Math.min(w * 0.3, lam * 0.17));

function drawPhoton(s) {
  const { w, h } = size, mob = w < 600;
  const ly = h * 0.3, lh = Math.min(h * 0.36, w * 0.3), lx = 12 + 0.66 * lh;
  lamp(lx, ly, lh);
  const dk = Math.min(lh * 0.8, w * 0.22) / 920, dx = w - 12 - (973 - 228) * dk;
  const x0 = lx + 6, x1 = dx - 10;
  const col = lampColor(s.lam, 1), lp = wavePx(s.lam, w);
  wave(ctx, x0, x1, ly, lp, Math.min(26, h * 0.06), col, reducedMotion ? 0 : t * 6);
  sprite(ctx, img.detector, 228, 420, dk, dx, ly);
  const span = x1 - x0, n = 3;
  for (let i = 0; i < n; i++) {
    const f = reducedMotion ? (i + 0.5) / n : ((t * 0.25 + i / n) % 1);
    photon(ctx, img, s.lam, x0 + f * span, ly, mob ? 44 : 60);
  }
  text(ctx, "photon detector", dx + 120 * dk, ly + 420 * dk + 16, T.dim, "center", 12);
  text(ctx, `wave drawn with \u03bb on a relative scale`, 12, 16, T.dim, "left", 12);
  const sx = 24, sw = w - 48, sy = h - 64;
  const X = spectrum(ctx, T, sx, sy, sw, 18, 100, 1000, [{ nm: s.lam, color: T.ink, width: 3 }], true);
  text(ctx, "ultraviolet", (sx + X(400)) / 2, sy - 12, T.dim, "center", 12);
  text(ctx, "visible", (X(400) + X(700)) / 2, sy - 12, T.dim, "center", 12);
  text(ctx, "infrared", (X(700) + sx + sw) / 2, sy - 12, T.dim, "center", 12);
  for (const nm of mob ? [100, 400, 1000] : [100, 200, 400, 700, 1000]) text(ctx, nm + " nm", Math.min(sx + sw - 20, Math.max(sx + 20, X(nm))), sy + 34, T.dim, "center", 12);
  // energy bar
  const bx = 24, bw = Math.min(w - 48, 420), by = Math.max(ly + 0.78 * lh + 34, h * 0.6), e = photonEV(s.lam);
  ctx.save(); ctx.strokeStyle = T.ink; ctx.lineWidth = 1; ctx.strokeRect(bx, by, bw, 14);
  ctx.fillStyle = col; ctx.fillRect(bx, by, (bw * e) / 12.4, 14); ctx.restore();
  text(ctx, `photon energy ${e.toFixed(2)} eV (bar: 0 to 12.4 eV)`, bx, by - 12, T.ink, "left", 13, 600);
}

function energyBars(s, v, x, y, w, h) {
  const phi = METALS[s.metal].phi, max = 9, E = v.E, k = (h - 30) / max, base = y + h - 14, bw = Math.min(70, w * 0.28);
  const bar = (bx, val, color, label) => {
    ctx.save(); ctx.fillStyle = color; ctx.fillRect(bx, base - Math.min(val, max) * k, bw, Math.min(val, max) * k); ctx.strokeStyle = T.ink; ctx.lineWidth = 1;
    ctx.strokeRect(bx, base - Math.min(val, max) * k, bw, Math.min(val, max) * k); ctx.restore();
    text(ctx, label, bx + bw / 2, base + 12, T.ink, "center", 12, 600);
  };
  bar(x + 8, E, lampColor(v.lam, 0.85), "photon hf");
  bar(x + 16 + bw, phi, T.dark ? "#555a6a" : "#b9b7ae", "\u03c6");
  if (E > phi) {
    const keH = (E - phi) * k;
    ctx.save(); ctx.fillStyle = T.dark ? "rgba(138,184,255,0.55)" : "rgba(31,95,174,0.45)";
    ctx.fillRect(x + 16 + bw, base - phi * k - keH, bw, keH); ctx.restore();
    text(ctx, "K max", x + 16 + 1.5 * bw, base - phi * k - keH / 2, T.ink, "center", 12, 600);
  }
  line(ctx, x + 4, base - phi * k, x + 20 + 2 * bw, base - phi * k, T.ink, 1, [4, 4]);
  text(ctx, "energy (eV)", x + 8, y + 6, T.dim, "left", 12);
}
function keGraph(s, v, x, y, w, h) {
  const phi = METALS[s.metal].phi, fMax = 2.2e15, kMax = 6;
  const X = (f) => x + 36 + ((w - 46) * f) / fMax, Y = (ke) => y + h - 26 - ((h - 40) * ke) / kMax;
  line(ctx, X(0), Y(0), X(fMax), Y(0), T.ink, 1.5); line(ctx, X(0), Y(0), X(0), Y(kMax), T.ink, 1.5);
  const f0 = cutoffFreq(phi);
  const hev = H / 1.602176634e-19, fEnd = Math.min(fMax, (kMax + phi) / hev);
  if (f0 < fMax) line(ctx, X(f0), Y(0), X(fEnd), Y(hev * fEnd - phi), T.accent, 2.5);
  ctx.save(); ctx.fillStyle = T.ink; ctx.beginPath(); ctx.arc(X(f0), Y(0), 4, 0, 7); ctx.fill(); ctx.restore();
  text(ctx, "f\u2080", X(f0), Y(0) + 12, T.ink, "center", 12, 600);
  if (v.f < fMax && v.E - phi <= kMax) {
    const ke = Math.max(0, v.E - phi);
    ctx.save(); ctx.fillStyle = T.warn; ctx.beginPath(); ctx.arc(X(v.f), Y(ke), 6, 0, 7); ctx.fill(); ctx.restore();
  }
  text(ctx, "K max (eV)", x + 4, y + 6, T.dim, "left", 12);
  text(ctx, "frequency f", x + w - 6, Y(0) + 12, T.dim, "right", 12);
  if (f0 < fMax) { const fl = (f0 + fEnd) / 2; text(ctx, "slope = h", X(fl) - 8, Y(hev * fl - phi) - 6, T.accent, "right", 12, 600); }
}
function drawPhotoelectric(s, R) {
  const { x, y, w } = R, h = R.h, v = shown("photoelectric", s), mob = w < 600;
  const topH = h * 0.56, ly = y + topH * 0.42, lh = Math.min(topH * 0.75, w * 0.26);
  const lx = x + 12 + 0.66 * lh;
  lamp(lx, ly, lh);
  const pk = Math.min(topH * 0.85, w * 0.3) / 920, px = x + w - 16 - (812 - 330) * pk, py = ly;
  sprite(ctx, img["metal-plate"], 330, 300, pk, px, py);
  const x0 = lx + 4, x1 = px - 120 * pk;
  ctx.save(); ctx.fillStyle = lampColor(s.lam, 0.12 + 0.25 * s.inten / 100); ctx.beginPath();
  ctx.moveTo(x0, ly - lh * 0.12); ctx.lineTo(x1, ly - 120 * pk); ctx.lineTo(x1, ly + 120 * pk); ctx.lineTo(x0, ly + lh * 0.12); ctx.closePath(); ctx.fill(); ctx.restore();
  const nPh = Math.max(1, Math.round(s.inten / 20)), span = x1 - x0;
  for (let i = 0; i < nPh; i++) {
    const f = reducedMotion ? (i + 0.5) / nPh : ((t * 0.35 + i / nPh) % 1);
    photon(ctx, img, s.lam, x0 + f * span, ly + Math.sin(i * 2.1) * lh * 0.06, mob ? 30 : 40);
  }
  text(ctx, METALS[s.metal].name + " plate", px, Math.min(y + topH - 2, py + (969 - 300) * pk + 4), T.ink, "center", 13, 600, "top");
  if (v.rate !== null) {
    const speed = Math.sqrt(Math.max(0.02, v.E - METALS[s.metal].phi)), nE = Math.max(1, Math.round(s.inten / 20));
    for (let i = 0; i < nE; i++) {
      const ang = -2.4 + (i / Math.max(1, nE - 1) - 0.5) * 0.9;
      const f = reducedMotion ? 0.5 : ((t * 0.3 * speed + i / nE) % 1);
      const r = 30 + f * Math.min(w * 0.3, 160) * Math.min(1, speed / 2);
      const ex = px - 60 * pk + Math.cos(ang) * r, ey = py - 60 * pk + Math.sin(ang) * r;
      electron(ctx, img, ex, ey, mob ? 18 : 24);
    }
    text(ctx, "photoelectrons", px - 60 * pk - 60, py - topH * 0.36, T.accent, "center", 13, 600);
  } else text(ctx, "no electrons", px - 70 * pk - 50, py - topH * 0.33, T.warn, "center", 13, 600);
  const by = y + topH + 6, bh = h - topH - 10;
  energyBars(s, v, x + 6, by, Math.min(w * 0.4, 200), bh);
  keGraph(s, v, x + Math.min(w * 0.4, 200) + 12, by, w - Math.min(w * 0.4, 200) - 20, bh);
}

// Atom art: 1024 px centered (512, 512); ring radii 140, 230, 320, 410 for n = 1 to 4.
const RING = [0, 140, 230, 320, 410, 480, 540];
function atom(cx, cy, k, nOn, ang, fuzzy = false) {
  ctx.save(); ctx.strokeStyle = T.level; ctx.lineWidth = 1.5; ctx.setLineDash([4, 5]);
  for (const n of [5, 6]) { ctx.beginPath(); ctx.arc(cx, cy, RING[n] * k, 0, 7); ctx.stroke(); }
  ctx.restore();
  sprite(ctx, img["atom-energy-rings"], 512, 512, k, cx, cy);
  sprite(ctx, img["atom-nucleus"], 512, 512, k, cx, cy);
  if (nOn) electron(ctx, img, cx + Math.cos(ang) * RING[nOn] * k, cy + Math.sin(ang) * RING[nOn] * k, Math.max(22, 90 * k), fuzzy);
}
function drawHydrogen(s) {
  const { w, h } = size, mob = w < 600, v = shown("hydrogen", s);
  const aw = mob ? w * 0.56 : Math.min(w * 0.42, h * 0.72), k = aw / (2 * RING[6] + 40), cx = 12 + aw / 2, cy = mob ? h * 0.38 : h * 0.42;
  const ph = reducedMotion ? 0.6 : (t * 0.4) % 1.6, ang = -0.6;
  const onUp = ph < 0.6;
  atom(cx, cy, k, onUp ? s.nUp : s.nLow, ang);
  if (!onUp || reducedMotion) {
    const a0 = [cx + Math.cos(ang) * RING[s.nUp] * k, cy + Math.sin(ang) * RING[s.nUp] * k], a1 = [cx + Math.cos(ang) * RING[s.nLow] * k, cy + Math.sin(ang) * RING[s.nLow] * k];
    arrow(ctx, a0[0], a0[1], a1[0] + 6, a1[1] - 4, T.warn, 2);
    const f = reducedMotion ? 0.5 : Math.min(1, (ph - 0.6) / 1.0), d = RING[6] * k + 10 + f * Math.min(80, w * 0.1);
    photon(ctx, img, v.lam, cx + Math.cos(-1.2) * d, cy + Math.sin(-1.2) * d, mob ? 34 : 46);
  }
  text(ctx, mob ? "rings: order of levels, not sizes" : "rings show the order of levels, not true sizes", 12, 16, T.dim, "left", 12);
  // level diagram
  const dx0 = mob ? w * 0.6 : cx + aw / 2 + 30, dx1 = w - (mob ? 58 : 90), y0 = 26, y1 = mob ? h * 0.72 : h - 110;
  const Y = (e) => y0 + ((y1 - y0) * e) / -13.6;
  for (let n = 1; n <= N_MAX; n++) {
    const yy = Y(levelEV(n)), on = n === s.nUp || n === s.nLow;
    line(ctx, dx0, yy, dx1, yy, on ? T.ink : T.level, on ? 2.5 : 1.2);
    if (n <= 3 || on) text(ctx, `n=${n}`, dx1 + 4, yy, T.ink, "left", 12, on ? 700 : 500);
    else if (n === 5 && s.nUp < 4 && s.nLow < 4) text(ctx, "n=4 to 6", dx1 + 4, yy, T.dim, "left", 11);
    if (n <= 3 && !mob) text(ctx, `${sig(levelEV(n), 3)} eV`, dx0 - 4, yy, T.dim, "right", 12);
  }
  if (!mob) text(ctx, "0 eV", dx0 - 4, y0 - 10, T.dim, "right", 12);
  line(ctx, dx0, y0 - 10, dx1, y0 - 10, T.level, 1, [3, 4]);
  const ax = (dx0 + dx1) / 2;
  arrow(ctx, ax, Y(v.eUp), ax, Y(v.eLow) - 2, T.warn, 2.5);
  text(ctx, `${v.dE.toFixed(2)} eV`, ax + 8, (Y(v.eUp) + Y(v.eLow)) / 2, T.warn, "left", 13, 700);
  // visible spectrum with Balmer lines
  const sx = 24, sw = w - 48, sy = h - 46;
  const marks = BALMER.map((b) => ({ nm: b.nm, color: T.dark ? "#ffffff" : "#000000", width: s.nLow === 2 && b.n === s.nUp ? 4 : 1.5, label: s.nLow === 2 && b.n === s.nUp ? sig(b.nm, 3) + " nm" : "" }));
  spectrum(ctx, T, sx, sy, sw, 14, 380, 750, marks);
  text(ctx, mob ? "visible light with Balmer lines" : "visible spectrum, 380 to 750 nm, with hydrogen's Balmer lines", sx, sy - 10, T.dim, "left", 12);
}

function drawDeBroglie(s) {
  const { w, h } = size, mob = w < 600, v = shown("debroglie", s), p = PARTICLES[s.particle];
  const y = h * 0.3, x0 = 24, x1 = w - 24;
  // stylized wave packet around a moving particle (not to scale)
  const f = reducedMotion ? 0.5 : (t * 0.12) % 1, px = x0 + 60 + f * (x1 - x0 - 120);
  const lp = 10 + 60 * Math.max(0, Math.min(1, (Math.log10(v.lam) + 12) / 4));
  ctx.save(); ctx.beginPath(); ctx.rect(px - 110, y - 40, 220, 80); ctx.clip();
  ctx.strokeStyle = T.accent; ctx.lineWidth = 2; ctx.beginPath();
  for (let xx = px - 110; xx <= px + 110; xx++) {
    const env = Math.exp(-(((xx - px) / 60) ** 2)), yy = y - 26 * env * Math.sin((2 * Math.PI * (xx - px)) / lp);
    if (xx === px - 110) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
  }
  ctx.stroke(); ctx.restore();
  if (s.particle === "electron") electron(ctx, img, px, y, 30);
  else if (s.particle === "proton") { ctx.save(); ctx.fillStyle = "#c8402f"; ctx.strokeStyle = T.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(px, y, 13, 0, 7); ctx.fill(); ctx.stroke(); ctx.restore(); text(ctx, "+", px, y, "#ffffff", "center", 14, 700); }
  else { ctx.save(); ctx.fillStyle = "#f4f1e6"; ctx.strokeStyle = "#1c1c1c"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(px, y, 15, 0, 7); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = "#c8402f"; ctx.beginPath(); ctx.arc(px - 16, y, 11, -0.9, 0.9); ctx.stroke(); ctx.beginPath(); ctx.arc(px + 16, y, 11, Math.PI - 0.9, Math.PI + 0.9); ctx.stroke(); ctx.restore(); }
  text(ctx, `${p.name.toLowerCase()} moving at ${p.m < 1 ? sci(v.v) : sig(v.v, 3)} m/s (wave not to scale)`, x0, 18, T.dim, "left", 12);
  // log ruler of lengths
  const ry = h * 0.52, lo = -36, hi = -5, X = (m) => x0 + ((x1 - x0) * (Math.log10(m) - lo)) / (hi - lo);
  line(ctx, x0, ry, x1, ry, T.ink, 2);
  const step = mob ? 10 : 5;
  for (let e = lo + 1; e <= hi; e += 1) {
    const major = e % step === 0;
    line(ctx, X(10 ** e), ry - (major ? 7 : 3), X(10 ** e), ry + (major ? 7 : 3), T.ink, 1);
    if (major) text(ctx, `10${String(e).split("").map((ch) => ({ "-": "\u207b", 0: "\u2070", 1: "\u00b9", 2: "\u00b2", 3: "\u00b3", 4: "\u2074", 5: "\u2075", 6: "\u2076", 7: "\u2077", 8: "\u2078", 9: "\u2079" })[ch]).join("")} m`, X(10 ** e), ry - 18, T.dim, "center", 12);
  }
  const refs = [[1e-15, "proton size", 34], [1e-10, "atom", 60], [5e-7, "visible light", 86]];
  for (const [m, lab, dy] of refs) {
    line(ctx, X(m), ry, X(m), ry + dy - 8, T.level, 1, [3, 3]);
    text(ctx, lab, Math.min(x1 - 40, X(m)), ry + dy, T.ink, "center", 12, 600);
  }
  arrow(ctx, X(v.lam), ry - 76, X(v.lam), ry - 4, T.warn, 2.5);
  text(ctx, `\u03bb = ${len(v.lam)}`, Math.max(x0 + 50, Math.min(x1 - 50, X(v.lam))), ry - 86, T.warn, "center", 13, 700);
  text(ctx, "lengths on a log scale: each tick is 10 times the last", x0, h - 16, T.dim, "left", 12);
}

// Slit plate art: plate x 362 to 662, y 112 to 912; slits at x 472 and 552.
// Screen art: face x 272 to 752, y 122 to 902.
function drawSlits(s, R) {
  const { x, y, w, h } = R, mob = w < 600, k = slitSetup(s), cy = y + h * 0.45;
  const sh = Math.min(h * 0.78, w * 0.62), sk = sh / 846, scx = x + w - 12 - (786 - 512) * sk;
  const pk = Math.min(h * 0.5, w * 0.4) / 800, pcx = x + w * (mob ? 0.42 : 0.47);
  const srcX = x + 10;
  if (s.source === "electron") {
    const gk = Math.min(w * 0.3, 260) / 916;
    sprite(ctx, img["electron-gun"], 54, 512, gk, srcX, cy);
  } else {
    const lh = Math.min(h * 0.35, w * 0.2), lk = lh / 920;
    sprite(ctx, img["light-source-lamp"], 200, 250, lk, srcX, cy);
  }
  sprite(ctx, img["double-slit-plate"], 512, 512, pk, pcx, cy);
  sprite(ctx, img["detector-screen-front"], 512, 512, sk, scx, cy);
  if (s.watched) sprite(ctx, img["measurement-eye-icon-small"], 130, 128, Math.max(0.2, pk * 2.4), pcx, cy - 400 * pk - 30);
  // face rect
  const fx0 = scx + (272 - 512) * sk, fx1 = scx + (752 - 512) * sk, fy0 = cy + (122 - 512) * sk, fy1 = cy + (902 - 512) * sk;
  const fcx = (fx0 + fx1) / 2, fhw = (fx1 - fx0) / 2 - 4, fhh = (fy1 - fy0) / 2 - 4, fcy = (fy0 + fy1) / 2;
  const dotR = s.hits.length > 2000 ? 1.2 : s.hits.length > 400 ? 1.6 : 2.2;
  ctx.save(); ctx.fillStyle = s.source === "electron" ? T.hit : lampColor(s.lam, 1);
  for (const hh of s.hits) { ctx.beginPath(); ctx.arc(fcx + hh.u * fhw, fcy + hh.v * fhh, dotR, 0, 7); ctx.fill(); }
  ctx.restore();
  if (s.curve) {
    ctx.save(); ctx.strokeStyle = T.warn; ctx.lineWidth = 2.5; ctx.beginPath();
    for (let i = 0; i <= 200; i++) {
      const u = -1 + (2 * i) / 200, I = intensity(u * k.half, k.lamM, k.d, k.L, s.watched);
      const xx = fcx + u * fhw, yy = fy1 + 40 - I * 34;
      if (i === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
    }
    ctx.stroke(); ctx.restore();
    text(ctx, "probability", fx0, fy1 + 50, T.warn, "left", 12, 600);
  }
  // particles in flight
  const sY = [cy + (472 - 512) * pk, cy + (552 - 512) * pk];
  void sY;
  for (const f of flying) {
    const p = Math.min(1, f.t), xA = srcX + (s.source === "electron" ? 240 : 80), half = 0.45;
    let fx, fy;
    if (p < half) { fx = xA + (pcx - xA) * (p / half); fy = cy; }
    else { const q2 = (p - half) / (1 - half); fx = pcx + (fcx + f.h.u * fhw - pcx) * q2; fy = cy + (fcy + f.h.v * fhh - cy) * q2; }
    if (s.source === "electron") electron(ctx, img, fx, fy, 20, p >= half && !s.watched);
    else photon(ctx, img, s.lam, fx, fy, 26);
  }
  text(ctx, "screen, front view", fcx, fy0 - 30 * sk - 10, T.dim, "center", 12);
  text(ctx, "slits", pcx, cy + 400 * pk + 14, T.dim, "center", 12);
  text(ctx, `screen width ${len(2 * k.half, 2)}`, x + 12, y + h - 14, T.dim, "left", 12);
}

function drawSandbox(s) {
  const R = { x: 0, y: 0, w: size.w, h: size.h };
  if (s.source === "electron" || s.target === "slits") return drawSlits(s, R);
  if (s.target === "metal") return drawPhotoelectric(s, R);
  const { w, h } = size, mob = w < 600, ly = h * 0.3, lh = Math.min(h * 0.4, w * 0.24), lx = 12 + 0.66 * lh;
  lamp(lx, ly, lh);
  const tx0 = lx + 20, tx1 = w - 20, th = 46;
  ctx.save(); ctx.fillStyle = T.dark ? "rgba(140,170,220,0.12)" : "rgba(31,95,174,0.08)"; ctx.strokeStyle = T.ink; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect ? ctx.roundRect(tx0, ly - th / 2, tx1 - tx0, th, 20) : ctx.rect(tx0, ly - th / 2, tx1 - tx0, th); ctx.fill(); ctx.stroke(); ctx.restore();
  text(ctx, "hydrogen gas", (tx0 + tx1) / 2, ly + th / 2 + 14, T.dim, "center", 12);
  const n = absorbedLine(s.lam), ion = ionizes(s.lam), absorbed = n || ion;
  const span = tx1 - tx0;
  for (let i = 0; i < 3; i++) {
    let f = reducedMotion ? (i + 0.5) / 3 : ((t * 0.3 + i / 3) % 1);
    if (absorbed && f > 0.5) continue;
    photon(ctx, img, s.lam, tx0 + f * span, ly, mob ? 30 : 40);
  }
  const ak = Math.min(h * 0.5, w * 0.45) / (2 * RING[6] + 40), acx = w / 2, acy = h * 0.72;
  if (ion) { atom(acx, acy, ak, 0, 0); electron(ctx, img, acx + (RING[6] + 70) * ak, acy - 80 * ak, 26); text(ctx, "electron freed (ion)", acx, acy - RING[6] * ak - 14, T.ink, "center", 13, 600); }
  else atom(acx, acy, ak, n || 1, -0.6);
  if (n) text(ctx, `absorbed: electron jumps n = 1 \u2192 ${n}`, acx, acy - RING[6] * ak - 14, T.ink, "center", 13, 600);
  if (!absorbed) text(ctx, "passes through: no matching jump", acx, acy - RING[6] * ak - 14, T.ink, "center", 13, 600);
}

let last = 0, hitAcc = 0;
function frame(now) {
  const dt = Math.min(0.1, (now - (last || now)) / 1000); last = now;
  const animated = !reducedMotion && st.mode !== "sandbox" ? true : !reducedMotion;
  if (animated) { t += dt; dirty = true; }
  const s = cur();
  if (running && s.hits) {
    hitAcc += dt * 40;
    const n = Math.floor(hitAcc); hitAcc -= n;
    if (n) { addHits(n); if (!reducedMotion) for (let i = 0; i < Math.min(n, 2); i++) flying.push({ t: 0, h: s.hits[s.hits.length - 1 - i] || { u: 0, v: 0 } }); $("readout").textContent = readout(); }
    if (s.hits.length >= 6000) { running = false; sync(); }
  }
  for (const f of flying) f.t += dt * 1.2;
  while (flying.length && flying[0].t > 1) flying.shift();
  if (flying.length > 40) flying.splice(0, flying.length - 40);
  if (dirty) { dirty = false; resize(); draw(); }
  requestAnimationFrame(frame);
}
$("studyBackBtn").addEventListener("click", (e) => {
  e.preventDefault();
  const qs = forwardStudyQuery(location.search).toString();
  history.replaceState(null, "", qs ? "?" + qs : location.pathname);
  location.href = "study.html" + location.search;
});
if (reducedMotion) document.documentElement.classList.add("reduced-motion");
window.addEventListener("resize", () => { dpr = Math.min(2, window.devicePixelRatio || 1); size.w = 0; resize(); dirty = true; });
new ResizeObserver(() => { resize(); dirty = true; }).observe(sc);
setMode(MODES.includes(st.mode) ? st.mode : "photon");
requestAnimationFrame(frame);
window.__quantum = { state: st, shown: () => shown(st.mode, st[st.mode]), addHits: (n) => { addHits(n); sync(); } };
