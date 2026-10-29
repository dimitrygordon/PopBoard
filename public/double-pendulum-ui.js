/**
 * Chaos and the Double Pendulum: page wiring. Physics lives in
 * double-pendulum-physics.js, drawing in double-pendulum-render.js.
 */
"use strict";

import { forwardStudyQuery } from "./board-return.js?v=20261022a";
import * as P from "./double-pendulum-physics.js";
import * as R from "./double-pendulum-render.js";

const $ = (id) => document.getElementById(id);
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const SAMPLE_STEPS = 20;            // one history sample every 20 steps = 10 ms
const MAX_SAMPLES = 12000;          // 120 s of history
const TRAIL_SAMPLES = 150;          // 1.5 s trail
const PHASE_SAMPLES = 3000;         // 30 s of phase points
const PALETTES = {
  light: {
    a: "#2563eb", b: "#d97706", small: "#15803d", big: "#dc2626",
    stage: "#f0f0eb", stageText: "#2b2f3c", divider: "#cfcfc8",
    graphBg: "#ffffff", axis: "#9ca0b0", grid: "rgba(0,0,0,0.08)", text: "#3a3d48", sat: "#6b7080", fit: "#111827"
  },
  dark: {
    a: "#60a5fa", b: "#fbbf24", small: "#4ade80", big: "#f87171",
    stage: "#1b1e29", stageText: "#e7e8ee", divider: "#3a3e52",
    graphBg: "#1d2030", axis: "#4b5068", grid: "rgba(255,255,255,0.07)", text: "#c9cbd6", sat: "#8b8fa3", fit: "#e5e7eb"
  }
};
let COLORS = PALETTES.dark, THEME = PALETTES.dark;
function applyTheme(t) {
  document.documentElement.dataset.theme = t;
  COLORS = THEME = PALETTES[t];
  const btn = $("themeBtn");
  btn.setAttribute("aria-pressed", String(t === "dark"));
  btn.textContent = t === "dark" ? "Light mode" : "Dark mode";
  btn.setAttribute("aria-label", t === "dark" ? "Switch to light mode" : "Switch to dark mode");
  st.dirty = true;
}
function storedTheme() { try { return localStorage.getItem(P.THEME_KEY); } catch (e) { return null; } }

const st = {
  mode: P.modeFromSearch(location.search),
  th1: 120, th2: 10, side: -1, m1: 2, m2: 1, offStep: P.stepFromOffset(0.001),
  L1: 1, L2: 1, g: 9.81, speed: 1, twin: true,
  playing: false, trails: true, acc: 0, steps: 0,
  runs: [], prev: null, horizonRows: [], horizonFit: null, horizonJob: 0,
  dirty: true
};

// ---------- simulation ----------
function startConfig() {
  const c = { theta1: st.th1 * P.DEG, theta2: st.side * st.th2 * P.DEG, m1: st.m1, m2: st.m2 };
  if (st.mode === "sandbox") Object.assign(c, { L1: st.L1, L2: st.L2, g: st.g });
  return c;
}

function makeRun(start, offsetDeg) {
  const a = P.createDouble(start);
  const b = P.createDouble({ ...start, theta1: start.theta1 + offsetDeg * P.DEG });
  return { a, b, t: [], d: [], gap: [], trailA: [], trailB: [], ghosts: [],
    ph: { a: { th1: [], om1: [], th2: [], om2: [] }, b: { th1: [], om1: [], th2: [], om2: [] } },
    fit: null, rec: [] };
}

function offsetDeg() { return P.offsetFromStep(st.offStep); }

function reset(keepPrev = false) {
  st.acc = 0; st.steps = 0; st.prevMaxGap = 0;
  if (st.mode === "regimes") {
    st.runs = [
      makeRun({ theta1: 10 * P.DEG, theta2: 10 * P.DEG, m1: 2, m2: 1 }, 0.001),
      makeRun({ theta1: 120 * P.DEG, theta2: -10 * P.DEG, m1: 2, m2: 1 }, 0.001)
    ];
  } else if (st.mode === "determinism") {
    if (!keepPrev) st.prev = null;
    st.runs = [makeRun(startConfig(), 0)];
  } else {
    st.runs = [makeRun(startConfig(), offsetDeg())];
  }
  for (const r of st.runs) sample(r);
  if (st.mode === "prediction") scheduleHorizon();
  st.dirty = true;
  sync();
}

function sample(r) {
  r.t.push(r.a.t);
  r.d.push(P.separation(r.a, r.b));
  r.gap.push(P.angleGapDeg(r.a, r.b));
  if (r.t.length > MAX_SAMPLES) { r.t.shift(); r.d.shift(); r.gap.shift(); }
  const pa = P.positions(r.a), pb = P.positions(r.b);
  r.trailA.push({ x: pa.x2, y: pa.y2 }); r.trailB.push({ x: pb.x2, y: pb.y2 });
  if (r.trailA.length > TRAIL_SAMPLES) { r.trailA.shift(); r.trailB.shift(); }
  for (const k of ["a", "b"]) {
    const s = r[k], p = r.ph[k];
    p.th1.push(s.theta1); p.om1.push(s.omega1); p.th2.push(s.theta2); p.om2.push(s.omega2);
    if (p.th1.length > PHASE_SAMPLES) { p.th1.shift(); p.om1.shift(); p.th2.shift(); p.om2.shift(); }
  }
  if (st.mode === "determinism") {
    r.rec.push(pa);
    const q = st.prev && st.prev[r.rec.length - 1];
    if (q) st.prevMaxGap = Math.max(st.prevMaxGap, Math.hypot(q.x1 - pa.x1, q.y1 - pa.y1), Math.hypot(q.x2 - pa.x2, q.y2 - pa.y2));
  }
  if (r.t.length % 10 === 0) r.fit = P.lyapunovFit(r.t, r.d);
}

function advance(dt) {
  st.acc += dt;
  let n = Math.min(400, Math.floor(st.acc / P.H));
  st.acc -= n * P.H;
  if (st.acc > P.H * 400) st.acc = 0;   // tab was hidden: drop the backlog rather than freeze
  while (n-- > 0) {
    for (const r of st.runs) { P.rk4Step(r.a); P.rk4Step(r.b); }
    st.steps++;
    if (st.steps % SAMPLE_STEPS === 0) for (const r of st.runs) sample(r);
  }
  st.dirty = true;
}

// ---------- prediction horizon table (computed in chunks so the page stays responsive) ----------
const HORIZON_OFFSETS = [1e-1, 1e-2, 1e-3, 1e-4, 1e-5, 1e-6, 1e-7, 1e-8];
function scheduleHorizon() {
  const job = ++st.horizonJob;
  st.horizonRows = []; st.horizonFit = null;
  const start = startConfig();
  let i = 0;
  const next = () => {
    if (job !== st.horizonJob || st.mode !== "prediction") return;
    if (i >= HORIZON_OFFSETS.length) {
      const pts = st.horizonRows.filter((r) => r.horizon != null);
      st.horizonFit = pts.length >= 3 ? P.linearFit(pts.map((r) => Math.log10(r.offsetDeg)), pts.map((r) => r.horizon)) : null;
      st.dirty = true; sync(); return;
    }
    const o = HORIZON_OFFSETS[i++];
    st.horizonRows.push({ offsetDeg: o, horizon: P.predictionHorizon(start, o, { tMax: 30 }) });
    st.dirty = true; sync();
    setTimeout(next, 0);
  };
  setTimeout(next, 120);
}

// ---------- canvases ----------
const stage = $("stage"), graph = $("graph");
const sctx = stage.getContext("2d"), gctx = graph.getContext("2d");
let sprites = R.loadSprites(() => { st.dirty = true; });
let dims = { sw: 0, sh: 0, gw: 0, gh: 0 };

function fit(canvas, ctx) {
  const r = canvas.getBoundingClientRect();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return [w, h];
}
function resize() {
  [dims.sw, dims.sh] = fit(stage, sctx);
  [dims.gw, dims.gh] = fit(graph, gctx);
  st.dirty = true;
}
new ResizeObserver(resize).observe(stage);
new ResizeObserver(resize).observe(graph);

function drawStagePanel(r, x0, w, h, label) {
  const reach = r.a.L1 + r.a.L2;
  const scale = Math.min(w / (2.25 * reach), h / (2.2 * reach));
  const px = x0 + w / 2, py = h / 2;
  if (st.trails) {
    if (st.mode !== "sandbox" || st.twin) R.drawTrail(sctx, r.trailB, COLORS.b, px, py, scale);
    R.drawTrail(sctx, r.trailA, COLORS.a, px, py, scale);
  }
  if (st.mode === "determinism" && st.prev) {
    const p = st.prev[r.rec.length - 1];
    if (p) {
      R.drawOutline(sctx, sprites, px + p.x1 * scale, py + p.y1 * scale, R.bobRadius(r.a.m1, scale));
      R.drawOutline(sctx, sprites, px + p.x2 * scale, py + p.y2 * scale, R.bobRadius(r.a.m2, scale));
    }
  }
  const showB = st.mode !== "determinism" && (st.mode !== "sandbox" || st.twin);
  if (showB) R.drawPendulum(sctx, sprites, r.b, px, py, scale, "b", { tint: COLORS.b });
  if (st.trails && !reduceMotion.matches) {
    const n = r.trailA.length, pts = [];
    for (const k of [8, 16, 24]) if (n - 1 - k >= 0) pts.push({ x: px + r.trailA[n - 1 - k].x * scale, y: py + r.trailA[n - 1 - k].y * scale });
    R.drawGhosts(sctx, sprites, pts, R.bobRadius(r.a.m2, scale));
  }
  R.drawPendulum(sctx, sprites, r.a, px, py, scale, "a", { mount: () => R.drawMount(sctx, sprites, px, py, Math.min(w, h) / 4.4) });
  if (label) {
    sctx.fillStyle = THEME.stageText; sctx.font = `600 ${w < 300 ? 12 : 14}px Inter, system-ui, sans-serif`;
    sctx.textAlign = "center"; sctx.textBaseline = "top";
    sctx.fillText(label, px, 10);
  }
}

function drawStage() {
  const { sw: w, sh: h } = dims;
  sctx.clearRect(0, 0, w, h);
  sctx.fillStyle = THEME.stage; sctx.fillRect(0, 0, w, h);
  if (st.mode === "regimes") {
    drawStagePanel(st.runs[0], 0, w / 2, h, "Small swing: 10 deg");
    drawStagePanel(st.runs[1], w / 2, w / 2, h, "Big swing: 120 deg");
    sctx.strokeStyle = THEME.divider; sctx.beginPath(); sctx.moveTo(w / 2, 8); sctx.lineTo(w / 2, h - 8); sctx.stroke();
    return;
  }
  if (w > 640 && w / h > 1.25) R.drawStand(sctx, sprites, w * 0.05, h - 16, h * 0.42);
  drawStagePanel(st.runs[0], 0, w, h, "");
  sctx.fillStyle = THEME.stageText; sctx.font = "500 13px JetBrains Mono, monospace";
  sctx.textAlign = "right"; sctx.textBaseline = "top";
  sctx.fillText("t = " + st.runs[0].a.t.toFixed(2) + " s", w - 12, 10);
}

function drawGraph() {
  const { gw: w, gh: h } = dims;
  gctx.clearRect(0, 0, w, h);
  const r0 = st.runs[0];
  if (st.mode === "phase" || st.mode === "sandbox") {
    R.drawPhase(gctx, w, h, (st.mode === "sandbox" && !st.twin ? [] : [{ ...r0.ph.b, color: COLORS.b }]).concat([{ ...r0.ph.a, color: COLORS.a }]), THEME);
  } else if (st.mode === "regimes") {
    R.drawDivergence(gctx, w, h, [
      { t: st.runs[0].t, d: st.runs[0].d, color: COLORS.small, fit: null },
      { t: st.runs[1].t, d: st.runs[1].d, color: COLORS.big, fit: st.runs[1].fit }
    ], THEME);
  } else if (st.mode === "prediction") {
    R.drawHorizon(gctx, w, h, st.horizonRows, { offsetDeg: offsetDeg(), horizon: currentHorizon() }, st.horizonFit, THEME);
  } else if (st.mode === "determinism") {
    R.drawDivergence(gctx, w, h, [{ t: r0.t, d: r0.d.map(() => 0), color: COLORS.a }], THEME);
  } else {
    R.drawDivergence(gctx, w, h, [{ t: r0.t, d: r0.d, color: COLORS.b, fit: r0.fit }], THEME);
  }
}

function currentHorizon() {
  const r = st.runs[0];
  for (let i = 0; i < r.gap.length; i++) if (r.gap[i] > 10) return r.t[i];
  return null;
}

// ---------- text ----------
const LEDE = {
  sensitivity: "Two pendulums start almost together: the orange one is tilted by a tiny extra angle. Watch the gap between them grow. On a log scale, steady exponential growth is a straight line.",
  phase: "This plot is a picture of the motion: each rod's angle against its angular speed, traced as the pendulum swings. Regular motion traces neat loops; chaotic motion scribbles across the plot.",
  determinism: "Chaos is not randomness. Two runs started from exactly the same numbers stay together, and a replay matches the previous run exactly, because the computer repeats the same arithmetic exactly. A real pendulum can't be restarted that precisely.",
  regimes: "Same tiny 0.001 deg nudge, two different swings. Small swings stay regular and predictable. Big swings are usually chaotic, and then the gap explodes.",
  sandbox: "Free play. Set any angles, masses, rod lengths and gravity, then let it run as long as you like. Turn on the nudged twin to see whether your setup is chaotic.",
  prediction: "Forecasts fail when the gap passes 10 deg. Measuring the start 10 times more precisely only buys a fixed extra slice of time, not 10 times longer. The gap grows faster later in the motion than at the start, so the rate implied here is higher than the Butterfly effect estimate."
};
const CAPTION = {
  sensitivity: "Orange line: separation between the runs in phase space (angles plus scaled angular velocities). Dashed: straight-line fit over the growth stretch; its slope is the Lyapunov-style estimate. Grey dashed: where the gap saturates.",
  phase: "Angle (across) against angular speed (up) for each rod. Blue: main run. Orange: nudged run. Angles wrap at plus or minus 180 deg.",
  determinism: "Separation between the two identical runs: exactly zero, so the curve sits on the floor of the plot.",
  regimes: "Green: small swing. Red: big swing. Both start 0.001 deg apart.",
  sandbox: "Phase space of your run (blue) and its nudged twin (orange). Angles wrap at plus or minus 180 deg.",
  prediction: "Dots: time until the two runs differ by more than 10 deg, simulated for each starting error. Dashed: straight-line fit. Ringed: the run on the stage."
};

function fmtSci(x) {
  if (x === 0) return "0";
  const e = Math.floor(Math.log10(Math.abs(x)));
  if (e >= -2 && e < 3) return x.toPrecision(2);
  const m = x / 10 ** e;
  const sup = String(e).replace(/-/g, "\u207b").replace(/\d/g, (c) => "\u2070\u00b9\u00b2\u00b3\u2074\u2075\u2076\u2077\u2078\u2079"[c]);
  return `${m.toFixed(1)} \u00d7 10${sup}`;
}
function fmtDeg(d) {
  if (d >= 0.1) return d.toFixed(d >= 10 ? 0 : 2) + " deg";
  return fmtSci(d) + " deg";
}
function tile(label, value, sub = "") {
  return `<div class="dp-tile"><div class="l">${label}</div><div class="v">${value}</div><div class="s">${sub}</div></div>`;
}

function lyapText(fit, t) {
  if (!fit) return t < 1.6 ? ["measuring...", "needs about 2 s of data"] : ["no growth", "gap is not growing exponentially"];
  if (fit.lambda < 0.15 && !fit.saturated) return ["about 0 /s", "no steady exponential growth"];
  return [fit.lambda.toFixed(2) + " /s", `gap doubles every ${(Math.LN2 / fit.lambda).toFixed(2)} s${fit.saturated ? "" : " (so far)"}`];
}

function readouts() {
  const r = st.runs[0];
  const drift = P.energyDrift(r.a);
  const driftTile = tile("Energy drift", fmtSci(drift), "change in total energy / energy scale; exact physics gives 0");
  let html = "";
  if (st.mode === "sensitivity") {
    const [lv, ls] = lyapText(r.fit, r.a.t);
    html = tile("Gap in angle", fmtDeg(r.gap[r.gap.length - 1]), "largest rod angle difference")
      + tile("Lyapunov-style estimate", lv, ls)
      + tile("Starting offset", fmtDeg(offsetDeg()), "upper rod of the orange run") + driftTile;
  } else if (st.mode === "phase") {
    const a = r.a;
    html = tile("Upper rod", `${(P.wrapAngle(a.theta1) / P.DEG).toFixed(0)} deg`, `${a.omega1.toFixed(2)} rad/s`)
      + tile("Lower rod", `${(P.wrapAngle(a.theta2) / P.DEG).toFixed(0)} deg`, `${a.omega2.toFixed(2)} rad/s`)
      + tile("Gap in angle", fmtDeg(r.gap[r.gap.length - 1]), "blue vs orange") + driftTile;
  } else if (st.mode === "determinism") {
    let prevGap = "no previous run yet", prevSub = "press Replay from start";
    if (st.prev) {
      const endT = ((st.prev.length - 1) * SAMPLE_STEPS * P.H).toFixed(1);
      prevGap = st.prevMaxGap === 0 ? "0 m, exactly" : fmtSci(st.prevMaxGap) + " m";
      prevSub = r.rec.length <= st.prev.length ? "largest bob gap so far" : `largest bob gap over the whole recorded ${endT} s`;
    }
    html = tile("Twin runs differ by", r.d[r.d.length - 1] === 0 ? "0, exactly" : fmtSci(r.d[r.d.length - 1]), "same start, same steps")
      + tile("Gap from previous run", prevGap, prevSub)
      + tile("Time", r.a.t.toFixed(2) + " s", "") + driftTile;
  } else if (st.mode === "regimes") {
    const [l0, s0] = lyapText(st.runs[0].fit, st.runs[0].a.t);
    const [l1, s1] = lyapText(st.runs[1].fit, st.runs[1].a.t);
    html = tile("Small swing gap", fmtDeg(st.runs[0].gap.at(-1)), `estimate ${l0}`)
      + tile("Big swing gap", fmtDeg(st.runs[1].gap.at(-1)), `estimate ${l1}`)
      + tile("Small swing", s0, "") + tile("Big swing", s1, "");
  } else if (st.mode === "sandbox") {
    const a = r.a;
    html = tile("Time", a.t.toFixed(2) + " s", st.speed === 1 ? "real time" : `${st.speed}x speed`)
      + tile("Total energy", P.totalEnergy(a).toFixed(2) + " J", "kinetic + potential, zero hanging straight down")
      + tile("Gap to twin", st.twin ? fmtDeg(r.gap[r.gap.length - 1]) : "twin off", "largest rod angle difference")
      + driftTile;
  } else {
    const hz = currentHorizon();
    const per = st.horizonFit ? (-st.horizonFit.slope).toFixed(1) + " s" : "computing...";
    const rate = st.horizonFit ? P.impliedRate(st.horizonFit.slope).toFixed(2) + " /s" : "computing...";
    html = tile("Starting error", fmtDeg(offsetDeg()), "")
      + tile("Forecast holds for", hz == null ? (r.a.t.toFixed(1) + " s so far") : hz.toFixed(1) + " s", "until the gap passes 10 deg")
      + tile("Each 10x better start buys", per, "slope of the dashed fit")
      + tile("Growth rate this implies", rate, "ln(10) / time per 10x; growth speeds up later in the motion")
      + driftTile;
  }
  $("readouts").innerHTML = html;
}

function sync() {
  for (const el of document.querySelectorAll("[data-modes]")) el.hidden = !el.dataset.modes.split(" ").includes(st.mode);
  for (const b of document.querySelectorAll("#tabs button")) b.setAttribute("aria-pressed", String(b.dataset.mode === st.mode));
  $("th1").value = st.th1; $("th1Val").textContent = st.th1 + " deg";
  $("th2").value = st.th2; $("th2Val").textContent = (st.side < 0 ? "-" : "") + st.th2 + " deg";
  for (const b of document.querySelectorAll("[data-side]")) b.setAttribute("aria-pressed", String(Number(b.dataset.side) === st.side));
  $("m1").value = st.m1; $("m1Val").textContent = st.m1.toFixed(1) + " kg";
  $("m2").value = st.m2; $("m2Val").textContent = st.m2.toFixed(1) + " kg";
  $("off").value = st.offStep; $("offVal").textContent = fmtDeg(offsetDeg());
  $("off").setAttribute("aria-valuetext", fmtDeg(offsetDeg()));
  $("L1").value = st.L1; $("L1Val").textContent = st.L1.toFixed(2) + " m";
  $("L2").value = st.L2; $("L2Val").textContent = st.L2.toFixed(2) + " m";
  $("g").value = st.g; $("gVal").textContent = st.g.toFixed(1) + " m/s\u00b2";
  $("speed").value = st.speed; $("speedVal").textContent = st.speed + "x";
  $("twinBtn").setAttribute("aria-pressed", String(st.twin));
  $("twinBtn").textContent = "Nudged twin: " + (st.twin ? "on" : "off");
  $("foot").textContent = st.mode === "sandbox"
    ? `RK4 integrator, fixed step 0.5 ms. Rods ${st.L1.toFixed(2)} m and ${st.L2.toFixed(2)} m, g = ${st.g.toFixed(1)} m/s\u00b2, no friction.`
    : "RK4 integrator, fixed step 0.5 ms. Rods 1 m each, g = 9.81 m/s\u00b2, no friction.";
  $("playBtn").textContent = st.playing ? "Pause" : (st.runs[0] && st.runs[0].a.t > 0 ? "Resume" : "Release");
  $("trailBtn").setAttribute("aria-pressed", String(st.trails));
  $("lede").textContent = LEDE[st.mode];
  $("caption").textContent = CAPTION[st.mode];
  const legend = st.mode === "regimes"
    ? `<span><i style="background:${COLORS.small}"></i>small swing gap</span><span><i style="background:${COLORS.big}"></i>big swing gap</span><span><i style="background:${COLORS.b}"></i>nudged run</span>`
    : st.mode === "determinism"
      ? `<span><i style="background:${COLORS.a}"></i>live run (twin hidden underneath)</span><span><i class="ring"></i>previous run</span>`
      : `<span><i style="background:${COLORS.a}"></i>main run</span><span><i style="background:${COLORS.b}"></i>nudged by ${fmtDeg(offsetDeg())}</span>`;
  $("legend").innerHTML = legend;
  graph.setAttribute("aria-label", CAPTION[st.mode]);
  readouts();
}

// ---------- modes and URL ----------
function writeUrl() {
  const p = forwardStudyQuery(location.search);
  p.set("mode", st.mode);
  history.replaceState(null, "", "?" + p.toString());
}
function setMode(m) {
  st.mode = m; st.prev = null;
  st.playing = !reduceMotion.matches;
  writeUrl(); reset(); requestAnimationFrame(resize);
}
for (const m of P.MODES) {
  const b = document.createElement("button");
  b.type = "button"; b.className = "dp-tab"; b.dataset.mode = m.id; b.textContent = m.label;
  b.addEventListener("click", () => setMode(m.id));
  $("tabs").appendChild(b);
}

// ---------- controls ----------
function onSlider(id, key, parse) {
  $(id).addEventListener("input", () => { st[key] = parse($(id).value); st.prev = null; reset(); });
}
onSlider("th1", "th1", Number); onSlider("th2", "th2", Number);
onSlider("L1", "L1", Number); onSlider("L2", "L2", Number); onSlider("g", "g", Number);
$("speed").addEventListener("input", () => { st.speed = Number($("speed").value); sync(); });
$("twinBtn").addEventListener("click", () => { st.twin = !st.twin; st.dirty = true; sync(); });
$("themeBtn").addEventListener("click", () => {
  const t = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  try { localStorage.setItem(P.THEME_KEY, t); } catch (e) {}
  applyTheme(t); sync();
});
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
  if (!storedTheme()) { applyTheme(P.resolveTheme(null, e.matches)); sync(); }
});
onSlider("m1", "m1", Number); onSlider("m2", "m2", Number); onSlider("off", "offStep", Number);
for (const b of document.querySelectorAll("[data-side]")) b.addEventListener("click", () => { st.side = Number(b.dataset.side); reset(); });
for (const b of document.querySelectorAll("[data-preset]")) b.addEventListener("click", () => {
  if (b.dataset.preset === "calm") { st.th1 = 10; st.th2 = 10; st.side = 1; } else { st.th1 = 120; st.th2 = 10; st.side = -1; }
  st.m1 = 2; st.m2 = 1; reset();
});
$("playBtn").addEventListener("click", () => { st.playing = !st.playing; sync(); });
$("resetBtn").addEventListener("click", () => { st.playing = false; reset(); });
$("trailBtn").addEventListener("click", () => { st.trails = !st.trails; st.dirty = true; sync(); });
$("replayBtn").addEventListener("click", () => {
  st.prev = st.runs[0].rec.slice();
  reset(true); st.playing = true; sync();
});
document.addEventListener("keydown", (e) => {
  if (e.code !== "Space" || (e.target.closest && e.target.closest("input, button, a, textarea, select"))) return;
  e.preventDefault(); st.playing = !st.playing; sync();
});
document.addEventListener("click", (e) => {
  const back = e.target.closest && e.target.closest("[data-study-back]");
  if (!back) return;
  e.preventDefault();
  const qs = forwardStudyQuery(location.search).toString();
  history.replaceState(null, "", qs ? "?" + qs : location.pathname);
  location.href = "study.html" + location.search;
});
reduceMotion.addEventListener("change", (e) => { if (e.matches) { st.playing = false; sync(); } });

// ---------- loop ----------
let last = 0, lastText = 0;
function loop(now) {
  const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
  last = now;
  if (st.playing) advance(dt * (st.mode === "sandbox" ? st.speed : 1));
  if (st.dirty) {
    drawStage(); drawGraph(); st.dirty = false;
    if (now - lastText > 150) { lastText = now; sync(); }
  }
  requestAnimationFrame(loop);
}

window.__dp = Object.freeze({
  get mode() { return st.mode; },
  get theme() { return document.documentElement.dataset.theme; },
  get time() { return st.runs[0].a.t; },
  get separation() { return st.runs[0].d.at(-1); },
  get lambda() { return st.runs[0].fit && st.runs[0].fit.lambda; },
  get energyDrift() { return P.energyDrift(st.runs[0].a); },
  get playing() { return st.playing; },
  get horizonRows() { return st.horizonRows.slice(); }
});

applyTheme(P.resolveTheme(storedTheme(), window.matchMedia("(prefers-color-scheme: dark)").matches));
st.playing = !reduceMotion.matches;
writeUrl();
reset();
resize();
document.body.dataset.dp = "ready";
requestAnimationFrame(loop);
