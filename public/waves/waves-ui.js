// Waves & Interference: page wiring.
// Physics and data: waves-physics.js. Drawing: waves-render.js.

import { forwardStudyQuery } from "../board-return.js?v=20261022a";
import {
  loadImages, readTokens, drawBasics, drawReflect, drawSuperpose, drawStanding, drawRipple, drawSlit, drawBeats,
  drawDoppler, drawSandbox, rippleGeometry
} from "./waves-render.js";
import {
  MODES, MODE_SLIDERS, SLIDERS, STEPS, parseQuery, fromSlider, toSlider, defaults, readouts, fmtNum,
  SOUND_SPEED, RIPPLE_SPEED, STRING_MU, DOPPLER_F, overlapTime
} from "./waves-physics.js";

const $ = (id) => document.getElementById(id);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const THEME_KEY = "popboard.waves.theme";
const RIPPLE_SLOW = 4;     // the ripple tank is shown 4x slower than real time
const STANDING_SLOW = 0.6; // standing waves: shown at about 0.6 n cycles per second, far slower than real
let T = readTokens();
const q = parseQuery(location.search);
const canvas = $("waveCanvas"), ctx = canvas.getContext("2d");
let W = 0, H = 0, dpr = Math.min(2, window.devicePixelRatio || 1), dirty = true;
const img = loadImages(() => { dirty = true; });

const st = Object.assign(defaults(), { mode: q.mode, t: 0, running: !reducedMotion, source: "dippers", showLines: true });

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

// ---------- choices per mode ----------
const CHOICES = {
  basics: [["kind", "transverse", "Transverse"], ["kind", "longitudinal", "Longitudinal"]],
  reflect: [["end", "fixed", "Fixed end"], ["end", "free", "Free end"]],
  superpose: [["side", "same", "Same side"], ["side", "opposite", "Opposite sides"]],
  standing: [1, 2, 3, 4, 5, 6].map((n) => ["n", n, n === 1 ? "n = 1 (fundamental)" : `n = ${n}`]),
  ripple: [["source", "dippers", "Two dippers"], ["source", "barrier", "Double-slit barrier"], ["showLines", "toggle", "Antinodal lines"]],
  slit: [["slits", 2, "Double slit"], ["slits", 1, "Single slit"]],
  beats: [], doppler: [],
  sandbox: [["dir1", "toggle", "Wave 1 direction"], ["dir2", "toggle", "Wave 2 direction"], ["preset", "standing", "Make a standing wave"], ["preset", "beats", "Make beats"]]
};
function choiceLabel(key, val, label) {
  if (key === "dir1") return `Wave 1 moves ${st.dir1 > 0 ? "right \u2192" : "left \u2190"}`;
  if (key === "dir2") return `Wave 2 moves ${st.dir2 > 0 ? "right \u2192" : "left \u2190"}`;
  return label;
}
function buildChoices() {
  const host = $("choices"); host.innerHTML = "";
  for (const [key, val, label] of CHOICES[st.mode]) {
    const b = document.createElement("button");
    b.type = "button"; b.dataset.key = key; b.dataset.val = String(val);
    b.addEventListener("click", () => {
      if (key === "showLines") st.showLines = !st.showLines;
      else if (key === "dir1" || key === "dir2") st[key] = -st[key];
      else if (key === "preset") {
        if (val === "standing") Object.assign(st, { a1: 1, a2: 1, f1: 1, f2: 1, dir1: 1, dir2: -1 });
        else Object.assign(st, { a1: 1, a2: 1, f1: 1, f2: 1.2, dir1: 1, dir2: 1 });
        st.t = 0;
      } else { st[key] = typeof st[key] === "number" ? Number(val) : val; st.t = restT(); }
      sync();
    });
    host.appendChild(b);
  }
  host.hidden = !CHOICES[st.mode].length;
}
function buildSliders() {
  const host = $("sliders"); host.innerHTML = "";
  for (const k of MODE_SLIDERS[st.mode]) {
    const lab = document.createElement("label"); lab.className = "slider";
    lab.innerHTML = `<span data-lab="${k}"></span><output data-out="${k}"></output><input data-slider="${k}" type="range" min="0" max="${STEPS}" step="1">`;
    const input = lab.querySelector("input");
    input.addEventListener("input", () => { st[k] = fromSlider(k, Number(input.value)); sync(); });
    host.appendChild(lab);
  }
}

// ---------- readouts and notes ----------
const f3 = (x) => fmtNum(x, 3);
function readText() {
  const r = readouts(st.mode, st);
  switch (st.mode) {
    case "basics": return `Period T = 1/f = ${f3(r.T_s)} s\nWavelength \u03bb = v/f = ${f3(r.lambda_m)} m\nCheck: v = f\u03bb = ${f3(r.f_Hz)} \u00d7 ${f3(r.lambda_m)} = ${f3(r.f_Hz * r.lambda_m)} m/s`;
    case "reflect": return `Reflected pulse: ${r.sign < 0 ? "upside down (inverted)" : "right side up (not inverted)"}\nTime to the end (1 m) and back = 2 \u00d7 1 m / v = ${f3(r.back_s)} s`;
    case "superpose": return `Pulse 1: ${f3(r.A1_cm)} cm   Pulse 2: ${r.A2_cm < 0 ? "\u2212" : "+"}${f3(Math.abs(r.A2_cm))} cm\nWhen they overlap: ${f3(r.A1_cm)} ${r.A2_cm < 0 ? "\u2212" : "+"} ${f3(Math.abs(r.A2_cm))} = ${f3(r.peak_cm)} cm (${r.A2_cm < 0 ? "destructive" : "constructive"})\nAfter they pass, each pulse keeps its own shape.`;
    case "standing": return `String: \u03bc = ${STRING_MU * 1000} g/m, v = \u221a(T/\u03bc) = ${f3(r.v_ms)} m/s\nHarmonic n = ${st.n}: \u03bb = 2L/n = ${f3(r.lambda_m)} m\nf = nv/(2L) = ${f3(r.f_Hz)} Hz   (fundamental f\u2081 = ${f3(r.f1_Hz)} Hz)\nNodes: ${r.nodes}   Antinodes: ${r.antinodes}`;
    case "ripple": return `Wave speed ${RIPPLE_SPEED} m/s, \u03bb = v/f = ${f3(r.lambda_cm)} cm\nProbe: r\u2081 = ${f3(r.r1_cm)} cm, r\u2082 = ${f3(r.r2_cm)} cm\nPath difference |r\u2081 \u2212 r\u2082| = ${f3(r.delta_cm)} cm = ${f3(r.ratio)} \u03bb\nAt the probe: ${r.kind}`;
    case "slit": return st.slits === 1
      ? `First dark fringe: a sin\u03b8 = \u03bb, \u03b8 = ${f3(r.theta1_deg)}\u00b0\nWidth of the central bright band = ${f3(r.central_mm)} mm`
      : `First bright fringe: d sin\u03b8 = 1\u03bb, \u03b8 = ${f3(r.theta1_deg)}\u00b0, y\u2081 = ${f3(r.y1_mm)} mm\nFringe spacing \u0394y \u2248 \u03bbL/d = ${f3(r.spacing_mm)} mm`;
    case "beats": return `Fork 1: ${f3(r.f1_Hz)} Hz   Fork 2: ${f3(r.f2_Hz)} Hz\nBeat frequency |f\u2081 \u2212 f\u2082| = ${f3(r.beat_Hz)} Hz\nOne loud-soft cycle every ${f3(r.beatPeriod_s)} s`;
    case "doppler": return `Source: ${DOPPLER_F} Hz moving at ${f3(r.vs_ms)} m/s (${f3(r.mach)} of the ${SOUND_SPEED} m/s sound speed)\nAhead: f = f\u2080v/(v \u2212 v\u209b) = ${f3(r.ahead_Hz)} Hz, \u03bb = ${f3(r.lamAhead_m)} m\nBehind: f = f\u2080v/(v + v\u209b) = ${f3(r.behind_Hz)} Hz, \u03bb = ${f3(r.lamBehind_m)} m`;
    case "sandbox": return `Wave 1: \u03bb = ${f3(r.lambda1_m)} m, T = ${f3(r.T1_s)} s\nWave 2: \u03bb = ${f3(r.lambda2_m)} m, T = ${f3(r.T2_s)} s\nBoth travel at v = ${f3(r.v_ms)} m/s; the sum is point-by-point addition.`;
    default: return "";
  }
}
const NOTES = {
  basics: "A wave carries energy from place to place without carrying the material along. Amplitude A is the biggest displacement from rest. Wavelength \u03bb is the distance between neighboring crests. Frequency f is how many waves pass each second, and the period T = 1/f is the time for one. The speed is v = f\u03bb. Changing f at a fixed speed changes \u03bb, not v: the speed is set by the medium. Sound in air is longitudinal; waves on a rope and light are transverse.",
  reflect: "When a pulse reaches a fixed end, the end pulls back on the rope, so the pulse comes back upside down. At a free end the rope is free to swing, so the pulse comes back right side up. Either way the speed and width stay the same.",
  superpose: "When two waves meet, the rope's displacement is the sum of the two (superposition). Crests on the same side add to a bigger pulse (constructive interference). A crest meeting a trough partly or fully cancels (destructive interference). The pulses pass through each other unchanged.",
  standing: "Two equal waves moving opposite ways on a string fixed at both ends make a standing wave. Only whole numbers of half wavelengths fit: \u03bb = 2L/n, so f = nv/(2L). Nodes never move; antinodes swing the most. More tension makes the wave faster and every harmonic higher. Motion is shown slowed down: with these settings the string really vibrates from about 8 to over 1,000 times a second.",
  ripple: "Two dippers tap the water in step. Where the path difference is a whole number of wavelengths, crests meet crests (constructive, antinodal lines). Where it is a half number, crests meet troughs and the water stays nearly still (destructive, nodal lines). Drag the probe. A plane wave through two gaps does the same thing, because each gap acts as a new source. Shown 4 times slower than real time; the dashed lines follow d sin\u03b8 = m\u03bb, which is exact far from the sources.",
  slit: "Light through two narrow slits spreads out and overlaps. Bright fringes appear where the path difference is a whole number of wavelengths: d sin\u03b8 = m\u03bb. Longer wavelength or closer slits spread the fringes apart. Each slit here is 0.02 mm wide, so the fringes fade out in a single-slit envelope. A single slit gives a wide central band with dark fringes at a sin\u03b8 = m\u03bb. The screen is 12 cm wide.",
  beats: "Two tones with slightly different frequencies drift in and out of step. In step they add (loud); out of step they cancel (soft). The loudness rises and falls at the beat frequency |f\u2081 \u2212 f\u2082|. Musicians tune by turning a string until the beats slow down and stop.",
  doppler: "A moving source sends out each wavefront from a new spot, so fronts crowd together ahead of it and spread out behind it. The listener ahead hears a higher frequency and the listener behind a lower one. The air and the listeners are still; the wave still travels at the speed of sound (343 m/s in air at 20 \u00b0C). Not to scale in time.",
  sandbox: "Free play. Set two waves on the same rope, pick each one's direction, and watch their sum. Equal waves moving opposite ways make a standing wave. Slightly different frequencies moving the same way make beats in space."
};
const HINTS = { ripple: "Drag the probe (dashed ring).", standing: "", basics: "", reflect: "", superpose: "", slit: "", beats: "", doppler: "", sandbox: "" };

// Reduced motion: no autoplay, show a frame where the idea is visible.
function restT() {
  if (st.mode === "ripple") return 8;              // start with the tank already full of ripples
  if (!reducedMotion) return 0;
  switch (st.mode) {
    case "reflect": return 1.5 / st.pulseSpeed;  // after the bounce
    case "superpose": return overlapTime(1, st.pulseSpeed); // pulses overlapping
    case "doppler": return 1.4;
    default: return 0.1;
  }
}

// ---------- sync ----------
function setMode(m) {
  st.mode = m; st.t = restT();
  for (const b of $$(".toolbar .tool")) b.setAttribute("aria-pressed", String(b.dataset.show === m));
  buildChoices(); buildSliders(); sync();
}
for (const b of $$(".toolbar .tool")) b.addEventListener("click", () => setMode(b.dataset.show));
function writeUrl() {
  const p = new URLSearchParams(location.search);
  p.set("mode", st.mode);
  history.replaceState(null, "", "?" + p.toString());
}
function sync() {
  for (const el of $$("[data-slider]")) {
    const k = el.dataset.slider;
    el.value = String(toSlider(k, st[k]));
    const label = k === "slitD" && st.slits === 1 ? "Slit width a" : SLIDERS[k].label;
    $$(`[data-lab="${k}"]`)[0].textContent = label;
    $$(`[data-out="${k}"]`)[0].textContent = `${fmtNum(st[k], 3)} ${SLIDERS[k].unit}`;
    el.setAttribute("aria-label", label);
  }
  for (const b of $$("#choices button")) {
    const k = b.dataset.key, v = b.dataset.val;
    b.textContent = choiceLabel(k, v, CHOICES[st.mode].find((c) => c[0] === k && String(c[1]) === v)[2]);
    const on = k === "showLines" ? st.showLines : k === "preset" || k === "dir1" || k === "dir2" ? null : String(st[k]) === v;
    if (on === null) b.removeAttribute("aria-pressed"); else b.setAttribute("aria-pressed", String(on));
  }
  $("runBtn").textContent = st.running ? "Pause" : "Play";
  $("readout").textContent = readText();
  $("note").textContent = NOTES[st.mode];
  $("canvasHint").textContent = HINTS[st.mode];
  canvas.setAttribute("aria-label", `${st.mode} view. ${readText().split("\n")[0]}`);
  writeUrl();
  dirty = true;
}
$("runBtn").addEventListener("click", () => { st.running = !st.running; sync(); });
$("restartBtn").addEventListener("click", () => { st.t = restT(); sync(); });

// ---------- probe drag (ripple tank) ----------
let dragging = false;
function probeAt(e) {
  const r = canvas.getBoundingClientRect(), G = rippleGeometry(W, H);
  const w = G.toWorld(e.clientX - r.left, e.clientY - r.top);
  return { x: Math.min(0.41, Math.max(0.01, w.x)), y: Math.min(0.16, Math.max(-0.16, w.y)) };
}
canvas.addEventListener("pointerdown", (e) => {
  if (st.mode !== "ripple") return;
  dragging = true; canvas.setPointerCapture(e.pointerId); st.probe = probeAt(e); sync();
});
canvas.addEventListener("pointermove", (e) => { if (dragging) { st.probe = probeAt(e); sync(); } });
canvas.addEventListener("pointerup", () => { dragging = false; });
canvas.addEventListener("keydown", (e) => {
  if (st.mode !== "ripple") return;
  const d = { ArrowLeft: [-0.005, 0], ArrowRight: [0.005, 0], ArrowUp: [0, 0.005], ArrowDown: [0, -0.005] }[e.key];
  if (!d) return;
  e.preventDefault();
  st.probe = { x: Math.min(0.41, Math.max(0.01, st.probe.x + d[0])), y: Math.min(0.16, Math.max(-0.16, st.probe.y + d[1])) }; sync();
});

// ---------- draw ----------
function resize() {
  const r = canvas.getBoundingClientRect();
  const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
  if (w === W && h === H) return;
  W = w; H = h; canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); dirty = true;
}
function draw() {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = T.paper; ctx.fillRect(0, 0, W, H);
  const t = st.t;
  switch (st.mode) {
    case "basics": drawBasics(ctx, W, H, T, img, st, t); break;
    case "reflect": drawReflect(ctx, W, H, T, img, st, t % ((2.2 + st.pulseWidth / 50) / st.pulseSpeed)); break;
    case "superpose": drawSuperpose(ctx, W, H, T, img, st, t % (1.0 / st.pulseSpeed)); break;
    case "standing": drawStanding(ctx, W, H, T, img, st, t, STANDING_SLOW); break;
    case "ripple": drawRipple(ctx, W, H, T, img, st, t / RIPPLE_SLOW); break;
    case "slit": drawSlit(ctx, W, H, T, img, st); break;
    case "beats": drawBeats(ctx, W, H, T, img, st, t); break;
    case "doppler": drawDoppler(ctx, W, H, T, img, st, t); break;
    default: drawSandbox(ctx, W, H, T, img, st, t);
  }
}
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (st.running && !document.hidden && st.mode !== "slit") { st.t += dt; dirty = true; }
  if (dirty) { dirty = false; resize(); draw(); }
  requestAnimationFrame(frame);
}

$("studyBackBtn").addEventListener("click", (e) => {
  e.preventDefault();
  // Back to the Study library with the board return keys only: drop this
  // module's mode from the URL, then hand over the query.
  const qs = forwardStudyQuery(location.search).toString();
  history.replaceState(null, "", qs ? "?" + qs : location.pathname);
  location.href = "study.html" + location.search;
});

window.addEventListener("resize", () => { resize(); dirty = true; });
new ResizeObserver(() => { resize(); dirty = true; }).observe(canvas);
setMode(MODES.includes(st.mode) ? st.mode : "basics");
requestAnimationFrame(frame);
// Read-only hook for the browser checks.
window.__waves = { state: st };
