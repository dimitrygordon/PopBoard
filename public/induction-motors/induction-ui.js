// Induction & Motors: page wiring.
// Physics and data: induction-physics.js. Drawing: induction-render.js.

import { forwardStudyQuery } from "../board-return.js?v=20261022a";
import {
  loadImages, readTokens, drawFlux, drawFaraday, drawLenz, drawGenerator, drawMotor, drawTransformer, coilGeometry
} from "./induction-render.js";
import {
  MODES, MODE_SLIDERS, SLIDERS, STEPS, parseQuery, fromSlider, toSlider, defaults, readouts, fmtNum,
  TAU, TRAVEL, NP, GEN_AREA, MOTOR_N, MOTOR_SIDE, CIRCUIT_R, magnetRun, coilEmf, linkage, maxGrad, lenz
} from "./induction-physics.js";

const $ = (id) => document.getElementById(id);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const THEME_KEY = "popboard.induction.theme";
const FARADAY_SLOW = 4;   // the magnet is shown 4 times slower than real time
const LENZ_SLOW = 20;     // the short Lenz approach is shown 20 times slower
const LENZ_NEAR = -0.08;  // m, in Lenz mode the magnet's center stops 8 cm left of the coil center
const VIS_TURN = 0.5;     // generator: shown at half a turn per second
let T = readTokens();
const q = parseQuery(location.search);
const canvas = $("imCanvas"), ctx = canvas.getContext("2d");
let W = 0, H = 0, dpr = Math.min(2, window.devicePixelRatio || 1), dirty = true;
const img = loadImages(() => { dirty = true; });

const st = Object.assign(defaults(), { mode: q.mode, t: 0, running: !reducedMotion, auto: true });
const live = { x: -TRAVEL, vx: 0, emf: 0, hist: [] };
const motor = { theta: Math.PI / 2, w: 0 };

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
const turnsChoices = [5, 10, 20].map((n) => ["turns", n, `${n} turns`]);
const poleChoices = [["pole", "N", "N pole first"], ["pole", "S", "S pole first"]];
const CHOICES = {
  flux: [],
  faraday: [...turnsChoices, ...poleChoices],
  lenz: [["pole", "N", "N pole faces coil"], ["pole", "S", "S pole faces coil"], ["motion", "toward", "Push toward"], ["motion", "away", "Pull away"], ...turnsChoices],
  generator: [50, 100, 200].map((n) => ["genN", n, `${n} turns`]),
  motor: [["commutator", true, "Commutator on"], ["commutator", false, "Commutator off"]],
  transformer: [["ns", 4, "Step-down (4 turns)"], ["ns", 16, "Step-up (16 turns)"]],
  sandbox: [...turnsChoices, ...poleChoices, ["auto", "toggle", "Auto run"]]
};
function buildChoices() {
  const host = $("choices"); host.innerHTML = "";
  for (const [key, val, label] of CHOICES[st.mode]) {
    const b = document.createElement("button");
    b.type = "button"; b.dataset.key = key; b.dataset.val = String(val); b.textContent = label;
    b.addEventListener("click", () => {
      if (key === "auto") st.auto = !st.auto; else st[key] = val;
      restart(); sync();
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
    input.addEventListener("input", () => { st[k] = fromSlider(k, Number(input.value)); step(0); sync(); });
    host.appendChild(lab);
  }
}

// ---------- readouts and notes ----------
const f3 = (x) => fmtNum(x, 3);
const signed = (x) => (Math.abs(x) < 5e-4 ? "0" : (x < 0 ? "\u2212" : "+") + f3(Math.abs(x)));
function readText() {
  const r = readouts(st.mode, st);
  switch (st.mode) {
    case "flux": return `\u03a6 = B A cos\u03b8 = ${f3(r.B_T)} T \u00d7 ${f3(r.A_m2)} m\u00b2 \u00d7 cos ${f3(r.theta_deg)}\u00b0\n\u03a6 = ${f3(r.phi_mWb)} mWb  (cos\u03b8 = ${f3(r.cos)})\nFacing the field (\u03b8 = 0) it would be B A = ${f3(r.phiMax_mWb)} mWb\n1 Wb = 1 T\u00b7m\u00b2, 1 mWb = 0.001 Wb`;
    case "faraday": return `emf = \u2212N \u0394\u03a6/\u0394t\nFlux through one turn, magnet centered in it: ${f3(r.center_uWb)} \u03bcWb\nPeak emf, ${st.turns} turns at ${f3(st.speed)} m/s: ${f3(r.peak_mV)} mV\nEach 24 cm pass takes ${f3(r.pass_s)} s (shown 4 times slower)\nemf now: ${signed(live.emf * 1000)} mV`;
    case "lenz": {
      const L = lenz(st.pole, st.motion);
      return `Flux through the coil: ${L.fluxChange}\nNear face of the coil: ${L.face} pole, so they ${L.force}\nCurrent seen from the magnet: ${L.sense}\nPeak emf ${f3(r.peak_mV)} mV, peak current emf/R = ${f3(r.I_mA)} mA (R = ${CIRCUIT_R} \u03a9)\nPeak opposing force F = emf \u00d7 I / v = ${f3(r.F_uN)} \u03bcN`;
    }
    case "generator": return `\u03c9 = 2\u03c0f = ${f3(r.omega)} rad/s, period ${f3(r.T_ms)} ms\nemf = N B A \u03c9 sin(\u03c9t), coil area A = ${GEN_AREA * 1e4} cm\u00b2\nPeak emf = ${st.genN} \u00d7 ${f3(st.genB)} T \u00d7 ${GEN_AREA} m\u00b2 \u00d7 ${f3(r.omega)} rad/s = ${f3(r.peak_V)} V\nrms emf = peak/\u221a2 = ${f3(r.rms_V)} V\nPeak flux linkage N B A = ${f3(r.linkage_Wb)} Wb`;
    case "motor": return `Force on each side F = N I L B\n= ${MOTOR_N} \u00d7 ${f3(st.motorI)} A \u00d7 ${MOTOR_SIDE} m \u00d7 ${f3(st.motorB)} T = ${f3(r.F_N)} N\nTorque \u03c4 = N I A B sin\u03b8, largest when the coil is level with the field\n\u03c4 max = ${f3(r.tau_Nm)} N\u00b7m  (${MOTOR_N} turns, ${MOTOR_SIDE * 100} cm \u00d7 ${MOTOR_SIDE * 100} cm coil)`;
    case "transformer": return `V\u209b/V\u209a = N\u209b/N\u209a = ${st.ns}/${NP}\nV\u209b = ${f3(r.Vp_V)} V \u00d7 ${st.ns}/${NP} = ${f3(r.Vs_V)} V\nSecondary current I\u209b = V\u209b/R = ${f3(r.Is_A)} A\nIdeal: power in = power out = V\u209bI\u209b = ${f3(r.P_W)} W\nPrimary current I\u209a = P/V\u209a = ${f3(r.Ip_A)} A`;
    case "sandbox": {
      const m = (st.pole === "N" ? 1 : -1) * st.magM;
      return `Magnet center at x = ${signed(live.x * 100)} cm (coil center at 0)\nFlux linkage N\u03a6 = ${signed(linkage(m, st.turns, live.x) * 1e6)} \u03bcWb\nemf now: ${signed(live.emf * 1000)} mV\nPeak emf on an auto run at ${f3(st.speed)} m/s: ${f3(r.peak_mV)} mV`;
    }
    default: return "";
  }
}
const NOTES = {
  flux: "Magnetic flux \u03a6 measures how much magnetic field passes through a loop: \u03a6 = B A cos\u03b8, where \u03b8 is the angle between the field and the loop's normal (the line perpendicular to the loop). Flux is largest when the loop faces the field (\u03b8 = 0) and zero when the field runs along the loop (\u03b8 = 90\u00b0). The unit is the weber: 1 Wb = 1 T\u00b7m\u00b2.",
  faraday: "Faraday's law: a changing magnetic flux through a coil induces an emf, emf = \u2212N \u0394\u03a6/\u0394t. A magnet held still gives no emf, however strong it is. A faster move, a stronger magnet, or more turns gives a bigger emf. The emf changes sign as the magnet leaves, because the flux is then decreasing. The magnet is modeled as a point dipole; the coil is 9 cm long with a 2 cm radius.",
  lenz: "Lenz's law: the induced current flows in the direction that opposes the change in flux that caused it. Push a north pole in and the coil's near face becomes a north pole, which pushes back. Pull it out and the near face becomes a south pole, which pulls back. You always have to do work to move the magnet, and that work becomes the electrical energy in the circuit. Shown 20 times slower than real time.",
  generator: "A generator turns a coil in a magnetic field. The flux through it is N B A cos(\u03c9t), so the emf is N B A \u03c9 sin(\u03c9t): an alternating voltage. The emf is largest when the coil is level with the field (flux changing fastest) and zero when the coil faces the field (flux largest). Turning faster raises both the peak emf and the frequency. Shown slowed to half a turn per second. Power grids in North America run at 60 Hz.",
  motor: "A motor is a generator run backwards. A current in a magnetic field feels a force F = I L B, at right angles to both. The two sides of the coil are pushed opposite ways, which makes a torque \u03c4 = N I A B sin\u03b8. Without a commutator the torque reverses every half turn, so the coil rocks and settles facing the field. The commutator reverses the current every half turn, so the torque always turns the coil the same way. Motion is not to scale.",
  transformer: "A transformer has two coils on one iron core. Alternating current in the primary makes a changing flux in the core, and that changing flux induces an emf in the secondary. The voltages are in the ratio of the turns: V\u209b/V\u209a = N\u209b/N\u209a. An ideal transformer loses no energy, so V\u209aI\u209a = V\u209bI\u209b: stepping the voltage up steps the current down. Steady DC makes no changing flux, so no output. Real transformers have many more turns and lose a little energy as heat.",
  sandbox: "Free play. Drag the magnet through the coil (or focus the picture and use the arrow keys) and watch the galvanometer. Try holding it still inside the coil, moving it fast or slow, flipping the magnet, and changing the number of turns. Auto run moves it back and forth at the set speed."
};
const HINTS = { sandbox: "Drag the magnet, or use the arrow keys." };

function restart() {
  st.t = 0; live.hist = []; live.emf = 0; live.vx = 0;
  motor.theta = Math.PI / 2; motor.w = 0;
  if (reducedMotion) {
    // No autoplay: start on a frame where the idea is visible.
    if (st.mode === "faraday") st.t = ((-Math.abs(maxGrad(st.turns).x) + TRAVEL) / st.speed) * FARADAY_SLOW;
    if (st.mode === "lenz") st.t = 0.6 * ((TRAVEL + LENZ_NEAR) / st.speed) * LENZ_SLOW;
    if (st.mode === "generator") st.t = 0.5;
    if (st.mode === "motor") motor.theta = Math.PI / 3;
  }
  if (st.mode === "sandbox" && !st.auto) live.x = -0.07;
  step(0);
}

// ---------- simulation step ----------
function step(dt) {
  const m = (st.pole === "N" ? 1 : -1) * st.magM;
  if (st.mode === "faraday" || (st.mode === "sandbox" && st.auto)) {
    const r = magnetRun(st.t / FARADAY_SLOW, st.speed);
    live.x = r.x; live.vx = r.vx; live.emf = coilEmf(m, st.turns, r.x, r.vx);
  } else if (st.mode === "sandbox") {
    if (!dragging) live.vx *= Math.exp(-dt * 14);
    live.emf = coilEmf(m, st.turns, live.x, live.vx);
  } else if (st.mode === "lenz") {
    const span = TRAVEL + LENZ_NEAR, leg = span / st.speed, tr = (st.t / LENZ_SLOW) % (leg * 1.6), u = Math.min(1, tr / leg);
    live.x = st.motion === "toward" ? -TRAVEL + span * u : LENZ_NEAR - span * u;
    live.vx = u < 1 ? (st.motion === "toward" ? st.speed : -st.speed) : 0;
    live.emf = coilEmf(m, st.turns, live.x, live.vx);
  } else if (st.mode === "motor" && dt > 0) {
    // Visual dynamics only: angular acceleration follows the torque, with friction.
    const k = 6 * readouts("motor", st).tau_Nm / readouts("motor", defaults()).tau_Nm;
    for (let i = 0; i < 4; i++) {
      const h = dt / 4, s = st.commutator ? (Math.sin(motor.theta) >= 0 ? 1 : -1) : 1;
      motor.w = Math.max(-14, Math.min(14, motor.w + (-k * s * Math.sin(motor.theta) - 1.2 * motor.w) * h));
      motor.theta += motor.w * h;
    }
  }
  if (dt > 0 && (st.mode === "faraday" || st.mode === "sandbox")) {
    live.hist.push(live.emf); if (live.hist.length > 360) live.hist.shift();
  }
}

// ---------- sync ----------
function setMode(m) {
  st.mode = m;
  for (const b of $$(".toolbar .tool")) b.setAttribute("aria-pressed", String(b.dataset.show === m));
  buildChoices(); buildSliders(); restart(); sync();
}
for (const b of $$(".toolbar .tool")) b.addEventListener("click", () => setMode(b.dataset.show));
function writeUrl() {
  const p = new URLSearchParams(location.search);
  p.set("mode", st.mode);
  history.replaceState(null, "", "?" + p.toString());
}
function syncText() {
  const s = readText();
  $("readout").textContent = s;
  canvas.setAttribute("aria-label", `${st.mode} view. ${s.split("\n")[0]}`);
}
const isStatic = () => st.mode === "flux" || st.mode === "transformer";
function sync() {
  for (const el of $$("[data-slider]")) {
    const k = el.dataset.slider;
    el.value = String(toSlider(k, st[k]));
    $$(`[data-lab="${k}"]`)[0].textContent = SLIDERS[k].label;
    $$(`[data-out="${k}"]`)[0].textContent = `${fmtNum(st[k], 3)} ${SLIDERS[k].unit}`;
    el.setAttribute("aria-label", SLIDERS[k].label);
  }
  for (const b of $$("#choices button")) {
    const k = b.dataset.key, v = b.dataset.val;
    b.setAttribute("aria-pressed", String(k === "auto" ? st.auto : String(st[k]) === v));
  }
  $("runBtn").hidden = isStatic() || (st.mode === "sandbox" && !st.auto);
  $("restartBtn").hidden = isStatic();
  $("runBtn").textContent = st.running ? "Pause" : "Play";
  syncText();
  $("note").textContent = NOTES[st.mode];
  $("canvasHint").textContent = HINTS[st.mode] || "";
  writeUrl();
  dirty = true;
}
$("runBtn").addEventListener("click", () => { st.running = !st.running; sync(); });
$("restartBtn").addEventListener("click", () => { restart(); sync(); });

// ---------- sandbox drag ----------
let dragging = false, lastDrag = null;
const clampX = (x) => Math.min(TRAVEL, Math.max(-TRAVEL, x));
function dragTo(e) {
  const r = canvas.getBoundingClientRect(), G = coilGeometry(W, H);
  const x = clampX(G.toWorld(e.clientX - r.left)), now = performance.now() / 1000;
  if (lastDrag) {
    // the drag counts as 4 times slower than real, like the auto run
    const dt = Math.max(1e-3, now - lastDrag.t);
    live.vx = 0.5 * live.vx + 0.5 * ((x - lastDrag.x) / dt) * FARADAY_SLOW;
  }
  live.x = x; lastDrag = { x, t: now };
}
canvas.addEventListener("pointerdown", (e) => {
  if (st.mode !== "sandbox") return;
  if (st.auto) { st.auto = false; sync(); }
  dragging = true; lastDrag = null; canvas.setPointerCapture(e.pointerId); dragTo(e); dirty = true;
});
canvas.addEventListener("pointermove", (e) => { if (dragging) { dragTo(e); dirty = true; } });
canvas.addEventListener("pointerup", () => { dragging = false; lastDrag = null; });
canvas.addEventListener("keydown", (e) => {
  if (st.mode !== "sandbox") return;
  const d = { ArrowLeft: -0.005, ArrowRight: 0.005 }[e.key];
  if (!d) return;
  e.preventDefault();
  if (st.auto) { st.auto = false; sync(); }
  live.x = clampX(live.x + d); live.vx = Math.sign(d) * 0.5; dirty = true;
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
  switch (st.mode) {
    case "flux": drawFlux(ctx, W, H, T, img, st); break;
    case "faraday": case "sandbox": drawFaraday(ctx, W, H, T, img, st, live); break;
    case "lenz": drawLenz(ctx, W, H, T, img, st, live); break;
    case "generator": drawGenerator(ctx, W, H, T, img, st, (TAU * VIS_TURN * st.t) % TAU + 1e-6); break;
    case "motor": drawMotor(ctx, W, H, T, img, st, motor.theta); break;
    default: drawTransformer(ctx, W, H, T, img, st);
  }
}
let last = performance.now(), textClock = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  const manual = st.mode === "sandbox" && !st.auto;
  if (!isStatic() && !document.hidden && (st.running || manual)) {
    if (!manual) st.t += dt;
    step(dt); dirty = true;
    textClock += dt; if (textClock > 0.15) { textClock = 0; syncText(); }
  }
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
setMode(MODES.includes(st.mode) ? st.mode : "flux");
requestAnimationFrame(frame);
// Read-only hook for the browser checks.
window.__induction = { state: st, live, motor };
