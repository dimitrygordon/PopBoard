/**
 * Pendulum sandbox UI.
 *
 * Designer hook (read this, not the internals):
 *   pendulum.state = {
 *     angle, angularVelocity, angularAcceleration,  // rad, rad/s, rad/s²
 *     time, period,                                 // s; period is null until one cycle
 *     mode, isPaused, dragging
 *   }
 *   pendulum.history  — the one time buffer (t, angle, angularVelocity,
 *                        angularAcceleration, ghostAngle, playhead)
 *   pendulum.addEventListener("dragstart", ...)
 *   pendulum.addEventListener("released", ...)
 *
 * Later modes are tabs in MODES. Replace the placeholder section; keep the id.
 */
import {
  G_PRESETS, DEFAULTS, MODES, MODE_ALIASES,
  createPendulum, integrate, angularAccel, bobPosition, mechanicalEnergy,
  smallAnglePeriod, smallAngleSolution, dragToAngularRate,
  createCycleCounter, createTimeBuffer, measurePeriod, linearFit
} from "./pendulum-physics.js";

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const SAMPLE = 1 / 60;
const FONT = "JetBrains Mono, ui-monospace, monospace";

const $ = (id) => document.getElementById(id);

const color = {};
function readColors() {
  const cs = getComputedStyle(document.documentElement);
  const get = (name, fb) => cs.getPropertyValue(name).trim() || fb;
  color.bob = get("--bob", "#5FD3C4");
  color.ghost = get("--ghost", "#FFB300");
  color.rod = get("--rod", "#E9E6DE");
  color.pairA = get("--pair-a", "#5FD3C4");
  color.pairB = get("--pair-b", "#FFB300");
  color.student = get("--student", "#B07CFF");
  color.playhead = get("--playhead", "#FFB300");
  color.canvas = get("--canvas", "#0b0e13");
  color.text = get("--text", "#E9E6DE");
  color.textDim = get("--text-dim", "#93A0AC");
  color.border = get("--border", "#2C3742");
  color.amber = get("--amber", "#FFB300");
}

const pendulum = new EventTarget();
pendulum.state = {
  angle: 0,
  angularVelocity: 0,
  angularAcceleration: 0,
  time: 0,
  period: null,
  mode: "sandbox",
  isPaused: true,
  dragging: false
};
pendulum.history = createTimeBuffer(SAMPLE, 30 * 60);
window.pendulum = pendulum;

const state = createPendulum();
const meter = createCycleCounter();
const ghost = { theta0: state.theta, omega0: 0, t0: 0, L: state.L, g: state.g };

const pair = {
  a: createPendulum({ L: 1, m: 0.5, theta: 35 * Math.PI / 180, g: state.g, b: 0, omega: 0 }),
  b: createPendulum({ L: 1, m: 4, theta: 35 * Math.PI / 180, g: state.g, b: 0, omega: 0 })
};
const pairMeterA = createCycleCounter();
const pairMeterB = createCycleCounter();
const doub = {
  a: createPendulum({ L: 0.8, theta: 10 * Math.PI / 180, g: 9.81, m: 1, b: 0 }),
  b: createPendulum({ L: 1.6, theta: 10 * Math.PI / 180, g: 9.81, m: 1, b: 0 })
};
const doubMeterA = createCycleCounter();
const doubMeterB = createCycleCounter();

let mode = "sandbox";
let playing = !reduceMotion;
let timeScale = 1;
let dampingMode = "angular";
let dragC = 0;
let holding = false;
let dragSource = null;
let dragCanvas = null;
let sampleAcc = 0;
let varyKey = "L";
let pairMode = "none";
let swRunning = false;
let swStart = 0;
let swBase = 0;
let marks = [];
let trials = [];
let studentFit = null;
let studentWarn = "";
let sweepL = [];
let sweepG = [];
let sweepFit = null;
let sweepMeta = null;
let sweepKey = "";
let doubling = null;

function detail() {
  const s = pendulum.state;
  return {
    angle: s.angle,
    angularVelocity: s.angularVelocity,
    angularAcceleration: s.angularAcceleration,
    time: s.time,
    period: s.period,
    mode: s.mode,
    isPaused: s.isPaused,
    dragging: s.dragging
  };
}

function isScrubbing() {
  const h = pendulum.history;
  return !playing && !holding && h.length > 0 && h.playhead >= 0 && h.playhead < h.length - 1;
}

function leaveScrub() {
  const h = pendulum.history;
  if (h.length) h.playhead = h.length - 1;
}

function ghostAngleAt(t) {
  return smallAngleSolution(ghost.theta0, ghost.omega0, ghost.L, ghost.g, t - ghost.t0);
}

function anchorGhost(theta, omega) {
  ghost.theta0 = theta;
  ghost.omega0 = omega;
  ghost.t0 = state.t;
  ghost.L = state.L;
  ghost.g = state.g;
}

function publish() {
  const s = pendulum.state;
  const h = pendulum.history;
  if (isScrubbing()) {
    const i = h.playhead;
    s.angle = h.angle[i];
    s.angularVelocity = h.angularVelocity[i];
    s.angularAcceleration = h.angularAcceleration[i];
    s.time = h.t[i];
  } else {
    s.angle = state.theta;
    s.angularVelocity = state.omega;
    s.angularAcceleration = angularAccel(state.theta, state.omega, state.L, state.g, state.b);
    s.time = state.t;
  }
  s.period = meter.mean(5);
  s.mode = mode;
  s.isPaused = !playing;
  s.dragging = holding;
}

function sampleNow() {
  publish();
  return {
    t: state.t,
    angle: state.theta,
    angularVelocity: state.omega,
    angularAcceleration: pendulum.state.angularAcceleration,
    ghostAngle: ghostAngleAt(state.t)
  };
}

function reanchorForParams() {
  leaveScrub();
  anchorGhost(state.theta, state.omega);
  meter.reset();
  meter.push(state.theta, state.t);
}

function holdAngle(theta) {
  leaveScrub();
  state.theta = theta;
  state.omega = 0;
  anchorGhost(state.theta, 0);
  meter.reset();
  meter.push(state.theta, state.t);
}

function setMass(m) {
  leaveScrub();
  state.m = m;
  if (dampingMode === "drag") {
    state.b = dragToAngularRate(dragC, state.m);
    meter.reset();
    meter.push(state.theta, state.t);
  }
}

const VARYS = {
  L: {
    label: "Length L", unit: "m", min: 0.25, max: 3.5, step: 0.01, digits: 2,
    get: () => state.L,
    set: (v) => { state.L = v; reanchorForParams(); }
  },
  g: {
    label: "Gravity g", unit: "m/s²", min: 0.5, max: 28, step: 0.01, digits: 2,
    get: () => state.g,
    set: (v) => { state.g = v; reanchorForParams(); resetPairMeters(); }
  },
  m: {
    label: "Mass m", unit: "kg", min: 0.1, max: 8, step: 0.01, digits: 2,
    get: () => state.m,
    set: (v) => setMass(v)
  },
  theta: {
    label: "Release angle θ₀", unit: "°", min: -170, max: 170, step: 0.5, digits: 1,
    get: () => state.theta * 180 / Math.PI,
    set: (deg) => holdAngle(deg * Math.PI / 180)
  },
  b: {
    label: "Angular damping b", unit: "s⁻¹", min: 0, max: 1.5, step: 0.01, digits: 3,
    get: () => state.b,
    set: (v) => {
      leaveScrub();
      dampingMode = "angular";
      state.b = v;
      dragC = v * state.m;
      meter.reset();
      meter.push(state.theta, state.t);
    }
  }
};

function resetPairMeters() {
  pairMeterA.reset();
  pairMeterB.reset();
  pairMeterA.push(pair.a.theta, pair.a.t);
  pairMeterB.push(pair.b.theta, pair.b.t);
}

function applyPairDamping() {
  if (pairMode === "none") {
    pair.a.b = 0;
    pair.b.b = 0;
  } else if (pairMode === "angular") {
    const b = Number($("pairB").value);
    pair.a.b = b;
    pair.b.b = b;
  } else {
    const c = Number($("pairC").value);
    pair.a.b = dragToAngularRate(c, pair.a.m);
    pair.b.b = dragToAngularRate(c, pair.b.m);
  }
}

function releasePair() {
  pair.a.L = pair.b.L = Number($("pairL").value);
  pair.a.m = Number($("pairMA").value);
  pair.b.m = Number($("pairMB").value);
  pair.a.g = pair.b.g = state.g;
  applyPairDamping();
  const ang = Number($("pairAng").value) * Math.PI / 180;
  pair.a.theta = pair.b.theta = ang;
  pair.a.omega = pair.b.omega = 0;
  resetPairMeters();
}

function setPairMode(next) {
  pairMode = next;
  applyPairDamping();
  resetPairMeters();
  $("pairBRow").classList.toggle("hidden", next !== "angular");
  $("pairCRow").classList.toggle("hidden", next !== "drag");
  $("pairNone").classList.toggle("active", next === "none");
  $("pairAngular").classList.toggle("active", next === "angular");
  $("pairDrag").classList.toggle("active", next === "drag");
}

function advance(simDt) {
  if (holding || !(simDt > 0)) return;
  pair.a.g = state.g;
  pair.b.g = state.g;
  let left = simDt;
  while (left > 1e-8) {
    const h = Math.min(SAMPLE - sampleAcc, left);
    integrate(state, h);
    integrate(pair.a, h);
    integrate(pair.b, h);
    integrate(doub.a, h);
    integrate(doub.b, h);
    sampleAcc += h;
    left -= h;
    if (sampleAcc >= SAMPLE - 1e-6) {
      sampleAcc = 0;
      meter.push(state.theta, state.t);
      pairMeterA.push(pair.a.theta, pair.a.t);
      pairMeterB.push(pair.b.theta, pair.b.t);
      doubMeterA.push(doub.a.theta, doub.a.t);
      doubMeterB.push(doub.b.theta, doub.b.t);
      pendulum.history.push(sampleNow(), true);
    }
  }
}

function commitScrubIfNeeded() {
  const h = pendulum.history;
  if (!(h.playhead >= 0 && h.playhead < h.length - 1)) return;
  const sample = h.truncateToPlayhead();
  if (!sample) return;
  state.theta = sample.angle;
  state.omega = sample.angularVelocity;
  state.t = sample.t;
  meter.reset();
  meter.push(state.theta, state.t);
  sampleAcc = 0;
  if (state.t + 1e-9 < ghost.t0) anchorGhost(state.theta, state.omega);
  swReset();
}

function play() {
  commitScrubIfNeeded();
  playing = true;
  syncPauseBtn();
}
function pause() {
  playing = false;
  syncPauseBtn();
}
function togglePlay() { if (playing) pause(); else play(); }
function syncPauseBtn() { $("pauseBtn").textContent = playing ? "Pause" : "Play"; }

function stepOnce() {
  if (dragSource) return;
  commitScrubIfNeeded();
  playing = false;
  advance(1 / 60);
  publish();
  syncPauseBtn();
}

function endDrag() {
  if (!dragSource) return;
  dragSource = null;
  dragCanvas = null;
  holding = false;
  state.omega = 0;
  anchorGhost(state.theta, 0);
  meter.reset();
  meter.push(state.theta, state.t);
  sampleAcc = 0;
  leaveScrub();
  if (!reduceMotion) playing = true;
  pendulum.history.push(sampleNow(), true);
  pendulum.dispatchEvent(new CustomEvent("released", { detail: detail() }));
  syncPauseBtn();
}

function releaseNow() {
  if (dragSource) return;
  state.omega = 0;
  anchorGhost(state.theta, 0);
  meter.reset();
  meter.push(state.theta, state.t);
  sampleAcc = 0;
  leaveScrub();
  if (!reduceMotion) playing = true;
  pendulum.history.push(sampleNow(), true);
  pendulum.dispatchEvent(new CustomEvent("released", { detail: detail() }));
  syncPauseBtn();
}

function swNow() {
  if (!swRunning) return swBase;
  return swBase + (state.t - swStart);
}
function swReset() {
  swRunning = false;
  swBase = 0;
  swStart = 0;
  marks = [];
}
function manualPeriod() {
  if (marks.length < 2) return null;
  let sum = 0;
  for (let i = 1; i < marks.length; i++) sum += marks[i] - marks[i - 1];
  return sum / (marks.length - 1);
}
function formatClock(sec) {
  const s = Math.max(0, sec);
  const m = Math.floor(s / 60);
  const rem = s - m * 60;
  return String(m).padStart(2, "0") + ":" + rem.toFixed(1).padStart(4, "0");
}

function resetAll() {
  dragSource = null;
  dragCanvas = null;
  holding = false;
  state.theta = DEFAULTS.theta;
  state.omega = 0;
  state.t = 0;
  state.L = DEFAULTS.L;
  state.m = DEFAULTS.m;
  state.g = DEFAULTS.g;
  state.b = 0;
  dampingMode = "angular";
  dragC = 0;
  timeScale = 1;
  meter.reset();
  anchorGhost(state.theta, 0);
  meter.push(state.theta, state.t);
  pendulum.history.clear();
  sampleAcc = 0;
  publish();
  pendulum.history.push(sampleNow(), true);
  playing = !reduceMotion;
  swReset();
  releasePair();
  if (doubling) runDoublingCheck();
  syncPauseBtn();
}

function variedText(row) {
  if (row.vary === "L") return row.L.toFixed(2) + " m";
  if (row.vary === "g") return row.g.toFixed(2) + " m/s²";
  if (row.vary === "m") return row.m.toFixed(2) + " kg";
  if (row.vary === "theta") return (row.theta * 180 / Math.PI).toFixed(1) + "°";
  return row.b.toFixed(3) + " s⁻¹";
}
function varyName(key) {
  return { L: "L", g: "g", m: "m", theta: "θ₀", b: "b" }[key] || key;
}
function fmtT(v) { return v == null || !Number.isFinite(v) ? "—" : v.toFixed(4); }

function recomputeStudentFit() {
  studentFit = null;
  studentWarn = "";
  const rows = trials.filter((r) => r.vary === "L" && r.autoT != null);
  if (rows.length < 2) return;
  const g0 = rows[0].g;
  const th0 = rows[0].theta;
  const clean = rows.every((r) => Math.abs(r.g - g0) < 0.05 && Math.abs(r.theta - th0) < 2 * Math.PI / 180 && r.b < 0.02);
  if (!clean) {
    studentWarn = " Length trials are plotted, but they don't share one g, angle, and undamped setup, so they are not fitted.";
    return;
  }
  studentFit = linearFit(rows.map((r) => r.L), rows.map((r) => r.autoT ** 2));
}

function renderTable() {
  const tb = $("trialBody");
  tb.replaceChildren();
  if (!trials.length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 6;
    td.textContent = "No trials yet. Release the bob, then record a row.";
    tr.append(td);
    tb.append(tr);
    return;
  }
  trials.forEach((row, i) => {
    const tr = document.createElement("tr");
    const cells = [
      String(i + 1),
      varyName(row.vary),
      variedText(row),
      fmtT(row.autoT),
      fmtT(row.manualT),
      fmtT(row.theory)
    ];
    for (const text of cells) {
      const td = document.createElement("td");
      td.textContent = text;
      tr.append(td);
    }
    tb.append(tr);
  });
}

function recordTrial() {
  const autoT = meter.mean();
  const manualT = manualPeriod();
  if (autoT == null && manualT == null) {
    $("recordFeedback").textContent = "No period yet. Let the bob finish a cycle, or mark the stopwatch twice.";
    $("recordFeedback").className = "feedback bad";
    return;
  }
  trials.push({
    vary: varyKey,
    L: state.L,
    m: state.m,
    g: state.g,
    theta: state.theta,
    b: state.b,
    autoT,
    manualT,
    theory: smallAnglePeriod(state.L, state.g)
  });
  if (trials.length > 40) trials.shift();
  recomputeStudentFit();
  renderTable();
  $("recordFeedback").textContent = "Recorded.";
  $("recordFeedback").className = "feedback good";
}

function runDoublingCheck() {
  const g = state.g;
  const theta = 10 * Math.PI / 180;
  const L1 = 0.8;
  const L2 = 1.6;
  const t1 = measurePeriod({ theta, L: L1, g, m: 1, b: 0, cycles: 4 }).period;
  const t2 = measurePeriod({ theta, L: L2, g, m: 1, b: 0, cycles: 4 }).period;
  const note = $("doubNote");
  if (!(t1 > 0) || !(t2 > 0)) {
    note.textContent = "Could not measure those two periods.";
    note.classList.remove("good");
    return;
  }
  doubling = { t1, t2, ratio: t2 / t1, g, theta, L1, L2 };
  doub.a.L = L1;
  doub.b.L = L2;
  doub.a.g = g;
  doub.b.g = g;
  doub.a.m = 1;
  doub.b.m = 1;
  doub.a.b = 0;
  doub.b.b = 0;
  doub.a.theta = theta;
  doub.b.theta = theta;
  doub.a.omega = 0;
  doub.b.omega = 0;
  doub.a.t = 0;
  doub.b.t = 0;
  doubMeterA.reset();
  doubMeterB.reset();
  doubMeterA.push(theta, 0);
  doubMeterB.push(theta, 0);
  note.classList.add("good");
  note.textContent =
    `T(${L1.toFixed(2)} m) = ${t1.toFixed(3)} s and T(${L2.toFixed(2)} m) = ${t2.toFixed(3)} s ` +
    `at 10° and g = ${g.toFixed(2)} m/s². Ratio = ${(t2 / t1).toFixed(3)}. √2 = ${Math.SQRT2.toFixed(3)}. ` +
    `Doubling the length multiplies the period by √2, not by 2. ` +
    `The large-angle factor depends on the release angle, not on L, so the ratio stays √2 at any shared angle.`;
}

function ensureSweep(force) {
  try {
    const g = state.g;
    const Lfix = state.L;
    const key = g.toFixed(4) + "|" + Lfix.toFixed(4);
    if (!force && sweepKey === key && sweepL.length) return;
    const theta = 5 * Math.PI / 180;
    const lengths = [0.4, 0.6, 0.8, 1, 1.3, 1.6, 2, 2.5, 3];
    const gs = [1.62, 3.71, 6, 9.81, 12, 16, 20, 24.79];
    sweepL = lengths.map((len) => {
      const period = measurePeriod({ theta, L: len, g, m: 1, b: 0, cycles: 4 }).period;
      return period > 0 ? { L: len, T: period, T2: period * period } : null;
    }).filter(Boolean);
    sweepG = gs.map((gv) => {
      const period = measurePeriod({ theta, L: Lfix, g: gv, m: 1, b: 0, cycles: 4 }).period;
      return period > 0 ? { g: gv, T: period } : null;
    }).filter(Boolean);
    sweepFit = sweepL.length >= 2 ? linearFit(sweepL.map((p) => p.L), sweepL.map((p) => p.T2)) : null;
    sweepMeta = { g, L: Lfix };
    sweepKey = key;
    runDoublingCheck();
    document.body.dataset.sweep = "ready";
  } catch (err) {
    $("fitNote").textContent = "Sweep failed: " + err.message;
    document.body.dataset.sweep = "error";
  }
}

function fitCaption() {
  if (!sweepFit || !sweepMeta) return "Measuring the small-angle sweep…";
  const expected = 4 * Math.PI * Math.PI / sweepMeta.g;
  const err = (sweepFit.slope - expected) / expected * 100;
  let text =
    `Small-angle sweep at 5° and g = ${sweepMeta.g.toFixed(2)} m/s² (L fixed at ${sweepMeta.L.toFixed(2)} m for the g graph). ` +
    `Slope of T² vs L is ${sweepFit.slope.toFixed(4)} s²/m. Theory 4π²/g = ${expected.toFixed(4)} s²/m ` +
    `(${err >= 0 ? "+" : ""}${err.toFixed(2)}%). Intercept ${sweepFit.intercept.toExponential(2)}. ` +
    `A few hundredths of a percent high is the 5° release, which is a hair slower than the zero-angle law.`;
  if (Math.abs(state.g - sweepMeta.g) > 0.03) {
    text += " Sandbox g has changed — remeasure to update the sweep.";
  }
  if (studentFit) {
    text += ` Your length trials fit a slope of ${studentFit.slope.toFixed(3)} s²/m.`;
  }
  if (studentWarn) text += studentWarn;
  return text;
}

function dampExplain() {
  if (dampingMode === "drag") {
    const b = dragToAngularRate(dragC, state.m);
    return `Linear drag: F = −c v with c = ${dragC.toFixed(3)} N·s/m. Then b = c/m = ${b.toFixed(3)} s⁻¹. Double the mass and b halves, so a heavier bob coasts longer.`;
  }
  if (state.b > 0) {
    return `b = ${state.b.toFixed(3)} s⁻¹ is the rate in θ″ = −(g/L) sin θ − b θ′. It is not a force, and mass does not enter. Choose linear drag to put mass into the decay.`;
  }
  return "Damping is off. b = 0, so mass cannot affect the motion. Mechanical energy stays constant.";
}

function equationText() {
  const b = dampingMode === "drag" ? dragToAngularRate(dragC, state.m) : state.b;
  return `θ″ = −(g/L) sin θ − b θ′\ng = ${state.g.toFixed(2)} m/s² · L = ${state.L.toFixed(2)} m · m = ${state.m.toFixed(2)} kg · b = ${b.toFixed(3)} s⁻¹\n${dampExplain()}`;
}

function updateLabels() {
  $("lenLabel").textContent = `Length L = ${state.L.toFixed(2)} m`;
  $("massLabel").textContent = `Bob mass m = ${state.m.toFixed(2)} kg — undamped motion ignores this`;
  $("gLabel").textContent = `Gravity g = ${state.g.toFixed(2)} m/s²`;
  $("angLabel").textContent = `Release angle = ${(state.theta * 180 / Math.PI).toFixed(1)}° — drag the bob to set this`;
  $("dampLabel").textContent = `Angular damping b = ${state.b.toFixed(3)} s⁻¹`;
  $("dragLabel").textContent = `Drag coefficient c = ${dragC.toFixed(3)} N·s/m`;
  $("dampExplain").textContent = dampExplain();
  $("eqBox").textContent = equationText();
  $("simClock").textContent = `Sim time ${state.t.toFixed(2)} s · ${timeScale}×. Pause and Step are in the top bar. Step moves 1/60 s. Space pauses when you are not on a control.`;
  $("lockedLine").textContent =
    `Locked: L = ${state.L.toFixed(2)} m · m = ${state.m.toFixed(2)} kg · g = ${state.g.toFixed(2)} m/s² · θ₀ = ${(state.theta * 180 / Math.PI).toFixed(1)}° · b = ${state.b.toFixed(3)} s⁻¹`;
  const spec = VARYS[varyKey];
  $("varyLabel").textContent = `${spec.label} = ${spec.get().toFixed(spec.digits)} ${spec.unit}`;
  document.querySelectorAll("#rates .chip").forEach((c) => {
    c.classList.toggle("active", Number(c.dataset.rate) === timeScale);
  });
  document.querySelectorAll("#gChips .chip").forEach((c) => {
    c.classList.toggle("active", Math.abs(Number(c.dataset.g) - state.g) < 0.004);
  });
  $("dampAngular").classList.toggle("active", dampingMode === "angular");
  $("dampDrag").classList.toggle("active", dampingMode === "drag");
  $("dampRow").classList.toggle("hidden", dampingMode !== "angular");
  $("dragRow").classList.toggle("hidden", dampingMode !== "drag");
  const active = document.activeElement;
  const setRange = (el, value) => {
    if (!el || active === el) return;
    const current = Number(el.value);
    if (Number.isFinite(current) && Math.abs(current - value) < 1e-6) return;
    el.value = String(value);
  };
  setRange($("lenRange"), state.L);
  setRange($("massRange"), state.m);
  setRange($("gRange"), state.g);
  if (dragSource !== "slider") setRange($("angRange"), state.theta * 180 / Math.PI);
  setRange($("dampRange"), state.b);
  setRange($("dragRange"), dragC);
  setRange($("varyRange"), spec.get());
  syncPauseBtn();
}

function updateReadouts() {
  const s = pendulum.state;
  const pos = bobPosition(s.angle, state.L);
  $("posX").textContent = pos.x.toFixed(3) + " m";
  $("posY").textContent = pos.y.toFixed(3) + " m";
  $("angDeg").textContent = (s.angle * 180 / Math.PI).toFixed(2) + "°";
  $("angRad").textContent = s.angle.toFixed(3) + " rad";
  $("angVel").textContent = s.angularVelocity.toFixed(3) + " rad/s";
  $("angAcc").textContent = s.angularAcceleration.toFixed(3) + " rad/s²";
  $("periodMeas").textContent = s.period ? s.period.toFixed(4) + " s" : "—";
  $("periodTheory").textContent = smallAnglePeriod(state.L, state.g).toFixed(4) + " s";
  const energy = mechanicalEnergy(s.angle, s.angularVelocity, state.m, state.L, state.g);
  $("energyVal").textContent = energy.toFixed(3) + " J";
  $("cycleLine").textContent = s.period
    ? `Automatic cycles: ${meter.cycles}. Mean of the latest periods ${s.period.toFixed(4)} s. Crossings are θ = 0 going positive only.`
    : "Automatic cycle counter: waiting for two bottom crossings in the same direction.";
}

function updateStopwatch() {
  $("stopwatch").textContent = formatClock(swNow());
  $("swToggle").textContent = swRunning ? "Stop" : "Start";
  const manual = manualPeriod();
  if (!marks.length) {
    $("marksLine").textContent = "No marks yet. Start the watch, then mark each time the bob passes the bottom.";
  } else {
    $("marksLine").textContent = `${marks.length} mark${marks.length === 1 ? "" : "s"}` +
      (manual ? ` · mean interval ${manual.toFixed(3)} s` : " · mark once more for an interval");
  }
}

function updatePairReadout() {
  $("pairLLabel").textContent = `Shared length L = ${Number($("pairL").value).toFixed(2)} m`;
  $("pairMALabel").textContent = `Mass A = ${Number($("pairMA").value).toFixed(2)} kg`;
  $("pairMBLabel").textContent = `Mass B = ${Number($("pairMB").value).toFixed(2)} kg`;
  $("pairAngLabel").textContent = `Shared release = ${Number($("pairAng").value).toFixed(1)}°`;
  $("pairBLabel").textContent = `Shared angular damping b = ${Number($("pairB").value).toFixed(2)} s⁻¹ — not a force`;
  const c = Number($("pairC").value);
  $("pairCLabel").textContent = `Drag c = ${c.toFixed(2)} N·s/m · bA = ${(c / pair.a.m).toFixed(3)} s⁻¹ · bB = ${(c / pair.b.m).toFixed(3)} s⁻¹`;
  const ta = pairMeterA.mean(3);
  const tb = pairMeterB.mean(3);
  let dTheta = pair.a.theta - pair.b.theta;
  while (dTheta > Math.PI) dTheta -= 2 * Math.PI;
  while (dTheta < -Math.PI) dTheta += 2 * Math.PI;
  let damp = `Damping is off, so b = 0 on both. Mass is not in the equation. Both use sandbox g = ${state.g.toFixed(2)} m/s².`;
  if (pairMode === "angular") {
    damp = `Same angular rate b = ${Number($("pairB").value).toFixed(2)} s⁻¹. That rate is not a force, so the two masses still match.`;
  } else if (pairMode === "drag") {
    damp = `Linear drag F = −c v, c = ${c.toFixed(2)} N·s/m. b = c/m, so the lighter bob has the larger b and decays first.`;
  }
  const sync = Math.abs(dTheta) < 0.04 && Math.abs(pair.a.b - pair.b.b) < 1e-9;
  $("pairReadout").textContent =
    `${damp} Angle difference ${(dTheta * 180 / Math.PI).toFixed(2)}°. ` +
    `Auto periods ${ta ? ta.toFixed(3) + " s" : "…"} and ${tb ? tb.toFixed(3) + " s" : "…"}. ` +
    (sync ? "They are swinging in sync." : "They are not in sync.");
}

function updateDoubLive() {
  const a = doubMeterA.mean(3);
  const b = doubMeterB.mean(3);
  if (!a || !b) {
    $("doubLive").textContent = "Live cycle counter: still timing the first swings of the picture.";
    return;
  }
  $("doubLive").textContent = `Live on the picture: T = ${a.toFixed(3)} s and ${b.toFixed(3)} s, ratio ${(b / a).toFixed(3)} (√2 = ${Math.SQRT2.toFixed(3)}).`;
}

function updateStatus() {
  const s = pendulum.state;
  if (isScrubbing()) {
    $("statusType").textContent = "Playhead";
    $("statusReason").textContent = `The bob is showing the stored sample at t = ${s.time.toFixed(3)} s. Press Play to continue from here, or Step for one frame.`;
    return;
  }
  if (mode === "sandbox") {
    const theory = smallAnglePeriod(state.L, state.g);
    $("statusType").textContent = holding ? "Dragging the bob" : (playing ? "Sandbox running" : "Sandbox paused");
    $("statusReason").textContent =
      `θ = ${(s.angle * 180 / Math.PI).toFixed(1)}° · ω = ${s.angularVelocity.toFixed(2)} rad/s · α = ${s.angularAcceleration.toFixed(2)} rad/s² · ` +
      `measured T ${s.period ? s.period.toFixed(3) + " s" : "—"} · small-angle theory ${theory.toFixed(3)} s. ` +
      (reduceMotion && !playing ? "Reduced motion is on, so this started paused. " : "") +
      "The dashed ghost is the exact small-angle solution from this release.";
  } else if (mode === "period") {
    $("statusType").textContent = "Period lab — one variable at a time";
    $("statusReason").textContent = `Varying ${VARYS[varyKey].label}. The others stay locked. The stopwatch counts simulation seconds. The cycle counter watches θ = 0 in one direction.`;
  } else {
    const titles = { forces: "Forces & Energy", amplitude: "Amplitude, nonlinear, driven", foucault: "Comparison & Foucault" };
    $("statusType").textContent = (titles[mode] || mode) + " — later phase";
    $("statusReason").textContent = `The sandbox engine keeps integrating. pendulum.state.mode is "${mode}".`;
  }
}

function syncPlayheads() {
  const h = pendulum.history;
  const max = Math.max(0, h.length - 1);
  const value = Math.max(0, h.playhead);
  document.querySelectorAll(".playhead").forEach((el) => {
    el.max = String(max);
    if (document.activeElement === el) return;
    el.value = String(Math.min(max, value));
  });
}

function setMode(id, writeUrl) {
  if (!MODES.some((m) => m.id === id)) id = "sandbox";
  mode = id;
  pendulum.state.mode = id;
  document.querySelectorAll("[data-mode]").forEach((btn) => {
    const on = btn.dataset.mode === id;
    btn.classList.toggle("active", on);
    btn.setAttribute("aria-selected", on ? "true" : "false");
    btn.tabIndex = on ? 0 : -1;
  });
  document.querySelectorAll(".mode").forEach((panel) => {
    panel.hidden = panel.id !== "mode-" + id;
  });
  document.body.dataset.mode = id;
  if (id === "period") ensureSweep(false);
  if (writeUrl) {
    const url = new URL(location.href);
    url.searchParams.set("mode", id);
    history.replaceState(null, "", url);
  }
  updateStatus();
}

function modeFromUrl() {
  const raw = (new URLSearchParams(location.search).get("mode") || "").toLowerCase();
  const id = MODE_ALIASES[raw];
  return id && MODES.some((m) => m.id === id) ? id : "sandbox";
}

function buildTabs() {
  const tabs = $("tabs");
  for (const def of MODES) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tab" + (def.phase > 1 ? " later" : "");
    btn.dataset.mode = def.id;
    btn.id = "tab-" + def.id;
    btn.setAttribute("role", "tab");
    btn.setAttribute("aria-controls", "mode-" + def.id);
    btn.append(document.createTextNode(def.label));
    if (def.phase > 1) {
      const badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent = "Later";
      btn.append(badge);
    }
    btn.addEventListener("click", () => setMode(def.id, true));
    tabs.append(btn);
    const panel = $("mode-" + def.id);
    if (panel) {
      panel.setAttribute("role", "tabpanel");
      panel.setAttribute("aria-labelledby", btn.id);
    }
  }
  tabs.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const btns = [...tabs.querySelectorAll("[data-mode]")];
    const i = Math.max(0, btns.findIndex((b) => b.dataset.mode === mode));
    const d = e.key === "ArrowRight" ? 1 : -1;
    const next = btns[(i + d + btns.length) % btns.length];
    next.focus();
    setMode(next.dataset.mode, true);
    e.preventDefault();
  });
}

function buildPresets() {
  const box = $("gChips");
  for (const preset of G_PRESETS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip";
    btn.dataset.g = String(preset.g);
    btn.textContent = preset.name + " " + preset.g;
    btn.addEventListener("click", () => {
      state.g = preset.g;
      reanchorForParams();
      resetPairMeters();
    });
    box.append(btn);
  }
}

function eventPoint(canvas, e) {
  const rect = canvas.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

function singleLayout(w, h, L) {
  const pivotX = w / 2;
  const pivotY = Math.max(40, h * 0.36);
  const reach = Math.max(L, 0.25);
  const ppm = Math.max(8, Math.min((pivotY - 18) / reach, (h - pivotY - 28) / reach, (w * 0.46) / reach));
  return { pivotX, pivotY, ppm, w, h };
}

function columnLayout(w, h, Lmax, frac) {
  const pivotX = w * frac;
  const pivotY = Math.max(36, h * 0.30);
  const reach = Math.max(Lmax, 0.25);
  const half = w * Math.min(frac, 1 - frac);
  const ppm = Math.max(8, Math.min((pivotY - 14) / reach, (h - pivotY - 42) / reach, (half - 20) / reach));
  return { pivotX, pivotY, ppm, w, h };
}

function bobRadius(m) {
  return Math.max(11, Math.min(26, 10 + 8 * Math.cbrt(Math.max(m, 0.05))));
}

function tipOf(layout, theta, L) {
  return {
    x: layout.pivotX + Math.sin(theta) * L * layout.ppm,
    y: layout.pivotY + Math.cos(theta) * L * layout.ppm
  };
}

function hitBob(canvas, pt) {
  const layout = canvas._layout || singleLayout(canvas.getBoundingClientRect().width, canvas.getBoundingClientRect().height, state.L);
  const tip = tipOf(layout, pendulum.state.angle, state.L);
  const r = Math.max(36, bobRadius(state.m) + 16);
  const dx = pt.x - tip.x;
  const dy = pt.y - tip.y;
  return dx * dx + dy * dy <= r * r;
}

function setFromPoint(canvas, pt) {
  const layout = canvas._layout;
  if (!layout) return;
  const dx = pt.x - layout.pivotX;
  const dy = pt.y - layout.pivotY;
  let theta = Math.atan2(dx, dy);
  const max = Math.PI * 0.995;
  if (theta > max) theta = max;
  if (theta < -max) theta = -max;
  state.theta = theta;
  state.omega = 0;
}

function drawOne(ctx, layout, opts) {
  const { pivotX, pivotY } = layout;
  ctx.save();
  ctx.strokeStyle = color.border;
  ctx.setLineDash([3, 6]);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pivotX, pivotY);
  ctx.lineTo(pivotX, pivotY + opts.L * layout.ppm);
  ctx.stroke();
  ctx.setLineDash([]);

  if (opts.trail && opts.trail.length) {
    for (let i = 0; i < opts.trail.length; i++) {
      const p = tipOf(layout, opts.trail[i], opts.L);
      ctx.globalAlpha = ((i + 1) / opts.trail.length) * 0.45;
      ctx.fillStyle = opts.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  if (opts.showGhost && opts.ghostTheta != null) {
    const g = tipOf(layout, opts.ghostTheta, opts.L);
    ctx.setLineDash([6, 5]);
    ctx.strokeStyle = color.ghost;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(pivotX, pivotY);
    ctx.lineTo(g.x, g.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(g.x, g.y, bobRadius(opts.mass) * 0.82, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  if (Math.abs(opts.theta) > 0.03) {
    ctx.beginPath();
    ctx.strokeStyle = color.amber;
    ctx.lineWidth = 1.5;
    ctx.arc(pivotX, pivotY, 34, Math.PI / 2, Math.PI / 2 - opts.theta, opts.theta > 0);
    ctx.stroke();
    const mid = opts.theta / 2;
    const lx = Math.max(18, Math.min(layout.w - 18, pivotX + Math.sin(mid) * 52));
    const ly = Math.max(16, Math.min(layout.h - 16, pivotY + Math.cos(mid) * 52));
    ctx.fillStyle = color.text;
    ctx.font = "12px " + FONT;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(Math.abs(opts.theta * 180 / Math.PI).toFixed(0) + "°", lx, ly);
  }

  const tip = tipOf(layout, opts.theta, opts.L);
  ctx.strokeStyle = color.rod;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(pivotX, pivotY);
  ctx.lineTo(tip.x, tip.y);
  ctx.stroke();

  const r = bobRadius(opts.mass);
  const grad = ctx.createRadialGradient(tip.x - r * 0.35, tip.y - r * 0.35, r * 0.15, tip.x, tip.y, r);
  grad.addColorStop(0, "#f7f4ea");
  grad.addColorStop(0.45, opts.color);
  grad.addColorStop(1, "#12161c");
  ctx.beginPath();
  ctx.arc(tip.x, tip.y, r, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = opts.color;
  ctx.stroke();

  ctx.strokeStyle = color.rod;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(pivotX - 16, pivotY);
  ctx.lineTo(pivotX + 16, pivotY);
  ctx.moveTo(pivotX - 16, pivotY);
  ctx.lineTo(pivotX - 16, pivotY - 8);
  ctx.moveTo(pivotX + 16, pivotY);
  ctx.lineTo(pivotX + 16, pivotY - 8);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(pivotX, pivotY, 3.2, 0, Math.PI * 2);
  ctx.fillStyle = color.rod;
  ctx.fill();

  if (opts.label) {
    ctx.fillStyle = color.textDim;
    ctx.font = "12px " + FONT;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText(opts.label, pivotX, layout.h - 6);
  }
  ctx.restore();
}

function trailAngles() {
  if (!$("showTrail").checked) return null;
  const h = pendulum.history;
  const end = isScrubbing() ? h.playhead : h.length - 1;
  if (end < 1) return null;
  const start = Math.max(0, end - 48);
  const out = [];
  for (let i = start; i <= end; i++) out.push(h.angle[i]);
  return out;
}

function displayGhost() {
  if (!$("showGhost").checked) return null;
  if (isScrubbing()) return pendulum.history.ghostAngle[pendulum.history.playhead];
  return ghostAngleAt(state.t);
}

function fitCanvas(canvas) {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.max(1, rect.width);
  const h = Math.max(1, rect.height);
  const bw = Math.max(1, Math.round(w * dpr));
  const bh = Math.max(1, Math.round(h * dpr));
  if (canvas.width !== bw || canvas.height !== bh) {
    canvas.width = bw;
    canvas.height = bh;
  }
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h };
}

function drawIf(canvas, fn) {
  if (!canvas) return;
  const panel = canvas.closest(".mode");
  if (!panel || panel.hidden) return;
  const box = fitCanvas(canvas);
  if (box.w < 2 || box.h < 2) return;
  fn(box);
}

function drawMain(canvas) {
  drawIf(canvas, ({ ctx, w, h }) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = color.canvas;
    ctx.fillRect(0, 0, w, h);
    const layout = singleLayout(w, h, state.L);
    canvas._layout = layout;
    drawOne(ctx, layout, {
      theta: pendulum.state.angle,
      L: state.L,
      mass: state.m,
      color: color.bob,
      ghostTheta: displayGhost(),
      showGhost: $("showGhost").checked,
      trail: trailAngles(),
      label: ""
    });
  });
}

function drawColumns(canvas, left, right, labelFor) {
  drawIf(canvas, ({ ctx, w, h }) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = color.canvas;
    ctx.fillRect(0, 0, w, h);
    const Lmax = Math.max(left.L, right.L);
    drawOne(ctx, columnLayout(w, h, Lmax, 0.28), {
      theta: left.theta, L: left.L, mass: left.m, color: color.pairA,
      showGhost: false, label: labelFor(left)
    });
    drawOne(ctx, columnLayout(w, h, Lmax, 0.72), {
      theta: right.theta, L: right.L, mass: right.m, color: color.pairB,
      showGhost: false, label: labelFor(right)
    });
  });
}

function mapRange(v, a, b, c, d) {
  if (b === a) return (c + d) / 2;
  return c + ((v - a) / (b - a)) * (d - c);
}
function compact(v) {
  if (!Number.isFinite(v)) return "—";
  const a = Math.abs(v);
  if (a >= 100) return v.toFixed(0);
  if (a >= 10) return v.toFixed(1);
  return v.toFixed(2);
}
function yExtent(groups, minSpan) {
  let lo = Infinity;
  let hi = -Infinity;
  for (const pts of groups) {
    for (const p of pts) {
      if (!Number.isFinite(p.y)) continue;
      if (p.y < lo) lo = p.y;
      if (p.y > hi) hi = p.y;
    }
  }
  if (!Number.isFinite(lo)) return { lo: -minSpan, hi: minSpan };
  if (hi - lo < minSpan) {
    const mid = (lo + hi) / 2;
    lo = mid - minSpan / 2;
    hi = mid + minSpan / 2;
  }
  const pad = (hi - lo) * 0.12;
  return { lo: lo - pad, hi: hi + pad };
}
function seriesOf(read, live) {
  const h = pendulum.history;
  const scrub = isScrubbing();
  const n = scrub ? h.playhead + 1 : h.length;
  const pts = [];
  for (let i = 0; i < n; i++) pts.push({ x: h.t[i], y: read(i) });
  if (!scrub) {
    const y = live();
    const last = pts[pts.length - 1];
    if (!last || Math.abs(last.x - state.t) > 1e-4 || Math.abs(last.y - y) > 1e-3) pts.push({ x: state.t, y });
  }
  return pts;
}
function timeWindow() {
  const span = 8;
  const h = pendulum.history;
  const tEnd = h.length ? h.t[h.length - 1] : 0;
  const tPlay = isScrubbing() ? h.t[h.playhead] : state.t;
  if (!isScrubbing()) {
    const t1 = Math.max(span, Math.max(tEnd, tPlay));
    return { t0: t1 - span, t1, playT: tPlay };
  }
  let t0 = tPlay - span * 0.62;
  if (t0 < 0) t0 = 0;
  return { t0, t1: t0 + span, playT: tPlay };
}

function plotFrame(ctx, w, h, xLabel, yLabel) {
  const rect = { l: 58, t: 12, r: w - 12, b: h - 34 };
  rect.w = Math.max(10, rect.r - rect.l);
  rect.h = Math.max(10, rect.b - rect.t);
  ctx.fillStyle = color.canvas;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = color.border;
  ctx.lineWidth = 1;
  ctx.setLineDash([]);
  ctx.strokeRect(rect.l, rect.t, rect.w, rect.h);
  ctx.fillStyle = color.textDim;
  ctx.font = "11px " + FONT;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(xLabel, rect.l + rect.w / 2, h - 6);
  ctx.save();
  ctx.translate(14, rect.t + rect.h / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textBaseline = "middle";
  ctx.fillText(yLabel, 0, 0);
  ctx.restore();
  return rect;
}

function drawChart(canvas, cfg) {
  drawIf(canvas, ({ ctx, w, h }) => {
    const rect = plotFrame(ctx, w, h, cfg.xLabel, cfg.yLabel);
    ctx.font = "10px " + FONT;
    ctx.fillStyle = color.textDim;
    for (let i = 0; i <= 4; i++) {
      const yv = cfg.y0 + (cfg.y1 - cfg.y0) * i / 4;
      const y = mapRange(yv, cfg.y0, cfg.y1, rect.t + rect.h, rect.t);
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillText(compact(yv), rect.l - 4, y);
    }
    for (let i = 0; i <= 4; i++) {
      const xv = cfg.x0 + (cfg.x1 - cfg.x0) * i / 4;
      const x = mapRange(xv, cfg.x0, cfg.x1, rect.l, rect.l + rect.w);
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(compact(xv), x, rect.b + 3);
    }
    if (cfg.y0 < 0 && cfg.y1 > 0) {
      const y = mapRange(0, cfg.y0, cfg.y1, rect.t + rect.h, rect.t);
      ctx.save();
      ctx.strokeStyle = color.border;
      ctx.setLineDash([2, 4]);
      ctx.beginPath();
      ctx.moveTo(rect.l, y);
      ctx.lineTo(rect.l + rect.w, y);
      ctx.stroke();
      ctx.restore();
    }
    const strokeSeries = (pts, stroke, dash) => {
      if (!pts || pts.length < 2) return;
      ctx.save();
      ctx.beginPath();
      ctx.rect(rect.l, rect.t, rect.w, rect.h);
      ctx.clip();
      ctx.beginPath();
      pts.forEach((p, i) => {
        const x = mapRange(p.x, cfg.x0, cfg.x1, rect.l, rect.l + rect.w);
        const y = mapRange(p.y, cfg.y0, cfg.y1, rect.t + rect.h, rect.t);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1.8;
      ctx.setLineDash(dash || []);
      ctx.stroke();
      ctx.restore();
    };
    const dots = (pts, fill) => {
      if (!pts || !pts.length) return;
      ctx.save();
      ctx.beginPath();
      ctx.rect(rect.l, rect.t, rect.w, rect.h);
      ctx.clip();
      ctx.fillStyle = fill;
      for (const p of pts) {
        const x = mapRange(p.x, cfg.x0, cfg.x1, rect.l, rect.l + rect.w);
        const y = mapRange(p.y, cfg.y0, cfg.y1, rect.t + rect.h, rect.t);
        ctx.beginPath();
        ctx.arc(x, y, 3.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    };
    for (const line of cfg.lines || []) strokeSeries(line.pts, line.color, line.dash);
    for (const dot of cfg.dots || []) dots(dot.pts, dot.color);
    if (cfg.playT != null && cfg.playT >= cfg.x0 && cfg.playT <= cfg.x1) {
      const x = mapRange(cfg.playT, cfg.x0, cfg.x1, rect.l, rect.l + rect.w);
      ctx.save();
      ctx.strokeStyle = color.playhead;
      ctx.setLineDash([4, 3]);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(x, rect.t);
      ctx.lineTo(x, rect.t + rect.h);
      ctx.stroke();
      ctx.restore();
    }
  });
}

function drawAngleGraph(canvas, win) {
  const real = seriesOf(
    (i) => pendulum.history.angle[i] * 180 / Math.PI,
    () => pendulum.state.angle * 180 / Math.PI
  );
  const lines = [{ pts: real, color: color.bob, dash: [] }];
  const groups = [real];
  if ($("showGhost").checked) {
    const ghostPts = seriesOf(
      (i) => pendulum.history.ghostAngle[i] * 180 / Math.PI,
      () => ghostAngleAt(state.t) * 180 / Math.PI
    );
    lines.push({ pts: ghostPts, color: color.ghost, dash: [6, 4] });
    groups.push(ghostPts);
  }
  const y = yExtent(groups, 24);
  drawChart(canvas, {
    xLabel: "time (s)", yLabel: "angle (°)",
    x0: win.t0, x1: win.t1, y0: y.lo, y1: y.hi,
    lines, playT: win.playT
  });
}

function drawOmegaGraph(canvas, win) {
  const pts = seriesOf(
    (i) => pendulum.history.angularVelocity[i],
    () => pendulum.state.angularVelocity
  );
  const y = yExtent([pts], 0.6);
  drawChart(canvas, {
    xLabel: "time (s)", yLabel: "ω (rad/s)",
    x0: win.t0, x1: win.t1, y0: y.lo, y1: y.hi,
    lines: [{ pts, color: color.bob, dash: [] }],
    playT: win.playT
  });
}

function drawScatterGraphs() {
  const g = sweepMeta ? sweepMeta.g : state.g;
  const Lfix = sweepMeta ? sweepMeta.L : state.L;
  const theoryL = [];
  for (let L = 0.15; L <= 3.5; L += 0.08) theoryL.push({ x: L, y: smallAnglePeriod(L, g) });
  const sweepPts = sweepL.map((p) => ({ x: p.L, y: p.T }));
  const mineL = trials.filter((r) => r.vary === "L" && r.autoT != null).map((r) => ({ x: r.L, y: r.autoT }));
  let ymax = 0.4;
  for (const p of theoryL.concat(sweepPts, mineL)) ymax = Math.max(ymax, p.y);
  drawChart($("graphTL"), {
    xLabel: "L (m)", yLabel: "T (s)",
    x0: 0, x1: 3.5, y0: 0, y1: ymax * 1.12,
    lines: [{ pts: theoryL, color: color.ghost, dash: [6, 4] }],
    dots: [{ pts: sweepPts, color: color.bob }, { pts: mineL, color: color.student }]
  });

  const theoryG = [];
  for (let gv = 1; gv <= 27.5; gv += 0.35) theoryG.push({ x: gv, y: smallAnglePeriod(Lfix, gv) });
  const sweepGv = sweepG.map((p) => ({ x: p.g, y: p.T }));
  const mineG = trials.filter((r) => r.vary === "g" && r.autoT != null).map((r) => ({ x: r.g, y: r.autoT }));
  let yg = smallAnglePeriod(Lfix, 1.62);
  for (const p of sweepGv.concat(mineG)) yg = Math.max(yg, p.y);
  drawChart($("graphTG"), {
    xLabel: "g (m/s²)", yLabel: "T (s)",
    x0: 0, x1: 28, y0: 0, y1: yg * 1.18,
    lines: [{ pts: theoryG, color: color.ghost, dash: [6, 4] }],
    dots: [{ pts: sweepGv, color: color.bob }, { pts: mineG, color: color.student }]
  });

  const slope = 4 * Math.PI * Math.PI / g;
  const lines = [];
  if (sweepFit) {
    lines.push({
      pts: [{ x: 0, y: sweepFit.intercept }, { x: 3.5, y: sweepFit.slope * 3.5 + sweepFit.intercept }],
      color: color.bob, dash: []
    });
  }
  lines.push({ pts: [{ x: 0, y: 0 }, { x: 3.5, y: slope * 3.5 }], color: color.ghost, dash: [6, 4] });
  if (studentFit) {
    lines.push({
      pts: [{ x: 0, y: studentFit.intercept }, { x: 3.5, y: studentFit.slope * 3.5 + studentFit.intercept }],
      color: color.student, dash: [2, 3]
    });
  }
  const t2pts = sweepL.map((p) => ({ x: p.L, y: p.T2 }));
  const mineT2 = trials.filter((r) => r.vary === "L" && r.autoT != null).map((r) => ({ x: r.L, y: r.autoT ** 2 }));
  let y2 = slope * 3.5;
  for (const p of t2pts.concat(mineT2)) y2 = Math.max(y2, p.y);
  drawChart($("graphT2"), {
    xLabel: "L (m)", yLabel: "T² (s²)",
    x0: 0, x1: 3.5, y0: 0, y1: Math.max(y2, 0.5) * 1.12,
    lines,
    dots: [{ pts: t2pts, color: color.bob }, { pts: mineT2, color: color.student }]
  });
}

function drawAll() {
  drawMain($("sandboxCanvas"));
  drawMain($("labCanvas"));
  const win = timeWindow();
  drawAngleGraph($("angleGraph"), win);
  drawOmegaGraph($("omegaGraph"), win);
  drawAngleGraph($("labTime"), win);
  drawColumns($("pairCanvas"), pair.a, pair.b, (p) => p.m.toFixed(2) + " kg");
  drawColumns($("doubCanvas"), doub.a, doub.b, (p) => p.L.toFixed(2) + " m");
  drawScatterGraphs();
}

function bindBob(canvas) {
  canvas.addEventListener("pointerdown", (e) => {
    if (e.button != null && e.button !== 0) return;
    const pt = eventPoint(canvas, e);
    if (!hitBob(canvas, pt)) return;
    e.preventDefault();
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* pointer already gone */ }
    dragSource = "bob";
    dragCanvas = canvas;
    holding = true;
    playing = false;
    leaveScrub();
    setFromPoint(canvas, pt);
    anchorGhost(state.theta, 0);
    meter.reset();
    meter.push(state.theta, state.t);
    publish();
    pendulum.dispatchEvent(new CustomEvent("dragstart", { detail: detail() }));
    syncPauseBtn();
  }, { passive: false });
  canvas.addEventListener("pointermove", (e) => {
    if (dragSource !== "bob" || dragCanvas !== canvas) return;
    setFromPoint(canvas, eventPoint(canvas, e));
    anchorGhost(state.theta, 0);
    publish();
  });
  const finish = () => { if (dragSource === "bob" && dragCanvas === canvas) endDrag(); };
  canvas.addEventListener("pointerup", finish);
  canvas.addEventListener("pointercancel", finish);
}

function bindHoldSlider(el, active) {
  el.addEventListener("pointerdown", () => {
    if (!active() || dragSource) return;
    dragSource = "slider";
    holding = true;
    playing = false;
    leaveScrub();
    state.omega = 0;
    publish();
    pendulum.dispatchEvent(new CustomEvent("dragstart", { detail: detail() }));
    syncPauseBtn();
  });
}

function bindControls() {
  $("lenRange").addEventListener("input", () => { state.L = Number($("lenRange").value); reanchorForParams(); });
  $("massRange").addEventListener("input", () => setMass(Number($("massRange").value)));
  $("gRange").addEventListener("input", () => { state.g = Number($("gRange").value); reanchorForParams(); resetPairMeters(); });
  $("angRange").addEventListener("input", () => holdAngle(Number($("angRange").value) * Math.PI / 180));
  $("dampRange").addEventListener("input", () => {
    leaveScrub();
    dampingMode = "angular";
    state.b = Number($("dampRange").value);
    dragC = state.b * state.m;
    meter.reset();
    meter.push(state.theta, state.t);
  });
  $("dragRange").addEventListener("input", () => {
    leaveScrub();
    dampingMode = "drag";
    dragC = Number($("dragRange").value);
    state.b = dragToAngularRate(dragC, state.m);
    meter.reset();
    meter.push(state.theta, state.t);
  });
  $("dampAngular").addEventListener("click", () => {
    if (dampingMode === "drag") state.b = dragToAngularRate(dragC, state.m);
    dampingMode = "angular";
  });
  $("dampDrag").addEventListener("click", () => {
    dragC = Math.min(8, state.b * state.m);
    dampingMode = "drag";
    state.b = dragToAngularRate(dragC, state.m);
  });
  document.querySelectorAll("#rates [data-rate]").forEach((btn) => {
    btn.addEventListener("click", () => { timeScale = Number(btn.dataset.rate); });
  });
  $("releaseBtn").addEventListener("click", releaseNow);
  $("labRelease").addEventListener("click", releaseNow);
  $("pauseBtn").addEventListener("click", togglePlay);
  $("stepBtn").addEventListener("click", stepOnce);
  $("resetBtn").addEventListener("click", resetAll);
  $("controlsJumpBtn").addEventListener("click", () => {
    const root = document.querySelector(".mode:not([hidden])");
    const el = root && root.querySelector(".controls");
    if (el) el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  });
  bindHoldSlider($("angRange"), () => true);
  bindHoldSlider($("varyRange"), () => varyKey === "theta");
  $("varyRange").addEventListener("input", () => VARYS[varyKey].set(Number($("varyRange").value)));
  document.querySelectorAll("#varyChips [data-vary]").forEach((btn) => {
    btn.addEventListener("click", () => {
      varyKey = btn.dataset.vary;
      document.querySelectorAll("#varyChips [data-vary]").forEach((chip) => {
        chip.classList.toggle("active", chip === btn);
      });
      const spec = VARYS[varyKey];
      const range = $("varyRange");
      range.min = String(spec.min);
      range.max = String(spec.max);
      range.step = String(spec.step);
      range.value = String(spec.get());
    });
  });
  $("swToggle").addEventListener("click", () => {
    if (swRunning) {
      swBase = swNow();
      swRunning = false;
    } else {
      swStart = state.t;
      swRunning = true;
    }
  });
  $("swMark").addEventListener("click", () => { if (swRunning) marks.push(swNow()); });
  $("swReset").addEventListener("click", swReset);
  $("recordBtn").addEventListener("click", recordTrial);
  $("clearBtn").addEventListener("click", () => {
    trials = [];
    studentFit = null;
    studentWarn = "";
    renderTable();
    $("recordFeedback").textContent = "Table cleared.";
    $("recordFeedback").className = "feedback";
  });
  $("remeasureBtn").addEventListener("click", () => ensureSweep(true));
  $("doubRecheck").addEventListener("click", () => runDoublingCheck());
  $("pairL").addEventListener("input", releasePair);
  $("pairAng").addEventListener("input", releasePair);
  $("pairMA").addEventListener("input", () => {
    pair.a.m = Number($("pairMA").value);
    applyPairDamping();
    resetPairMeters();
  });
  $("pairMB").addEventListener("input", () => {
    pair.b.m = Number($("pairMB").value);
    applyPairDamping();
    resetPairMeters();
  });
  $("pairB").addEventListener("input", () => { applyPairDamping(); resetPairMeters(); });
  $("pairC").addEventListener("input", () => { applyPairDamping(); resetPairMeters(); });
  $("pairNone").addEventListener("click", () => setPairMode("none"));
  $("pairAngular").addEventListener("click", () => setPairMode("angular"));
  $("pairDrag").addEventListener("click", () => setPairMode("drag"));
  $("pairRelease").addEventListener("click", releasePair);
  document.querySelectorAll(".playhead").forEach((el) => {
    el.addEventListener("input", () => {
      playing = false;
      holding = false;
      pendulum.history.playhead = Number(el.value);
      publish();
      syncPauseBtn();
    });
  });
  document.addEventListener("pointerup", () => { if (dragSource === "slider") endDrag(); });
  document.addEventListener("pointercancel", () => { if (dragSource === "slider") endDrag(); });
  document.addEventListener("keydown", (e) => {
    if (e.code !== "Space") return;
    if (e.target && e.target.closest && e.target.closest("input, textarea, select, button, a")) return;
    e.preventDefault();
    togglePlay();
  });
  document.addEventListener("click", (e) => {
    const back = e.target.closest && e.target.closest("[data-study-back]");
    if (!back) return;
    e.preventDefault();
    location.href = "study.html" + location.search;
  });
  bindBob($("sandboxCanvas"));
  bindBob($("labCanvas"));
}

function seed() {
  meter.reset();
  anchorGhost(state.theta, 0);
  meter.push(state.theta, state.t);
  pendulum.history.clear();
  publish();
  pendulum.history.push(sampleNow(), true);
  pairMeterA.push(pair.a.theta, pair.a.t);
  pairMeterB.push(pair.b.theta, pair.b.t);
  doubMeterA.push(doub.a.theta, doub.a.t);
  doubMeterB.push(doub.b.theta, doub.b.t);
}

let lastFrame = 0;
function frame(now) {
  if (!lastFrame) lastFrame = now;
  const dt = Math.min(0.05, (now - lastFrame) / 1000);
  lastFrame = now;
  if (playing && !holding) advance(dt * timeScale);
  publish();
  updateReadouts();
  updateLabels();
  updateStopwatch();
  updatePairReadout();
  updateDoubLive();
  updateStatus();
  syncPlayheads();
  $("fitNote").textContent = fitCaption();
  drawAll();
  requestAnimationFrame(frame);
}

readColors();
buildTabs();
buildPresets();
bindControls();
renderTable();
seed();
setMode(modeFromUrl(), false);
document.body.dataset.pendulum = "ready";
requestAnimationFrame(frame);

window.matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change", (e) => {
  if (e.matches) {
    playing = false;
    syncPauseBtn();
  }
});
