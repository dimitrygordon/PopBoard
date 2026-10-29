// Projectile Motion: page wiring.
// Physics and data: projectile-physics.js. Drawing: projectile-render.js.

import { forwardStudyQuery } from "../board-return.js?v=20261022a";
import {
  loadImages, readTokens, viewOf, niceCeil, drawArt, tinted, groundLayers, cannonLayers, siteLayers, ballLayer,
  bullseyeLayers, cartLayer, polyline, arrow, label, ruler, heightBar, angleArc
} from "./projectile-render.js";
import {
  G_STANDARD, RHO_SEA_LEVEL, CD_SPHERE, WORLDS, WORLD_IDS, BALLS, BALL_IDS, ideal, idealAt, idealPath, simulate, sampleAt,
  bestAngle, terminalSpeed, dragK, BULLSEYE_R, CART_HALF, scoreBullseye, scoreCart, newTarget, SLIDERS, sliderSteps,
  fromSlider, toSlider, MODES, parseQuery, fmtNum, fmtM, fmtS, fmtV, fmtG, fmtDeg, fmtKg, fmtD, fmtRho
} from "./projectile-physics.js";

const $ = (id) => document.getElementById(id);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const THEME_KEY = "popboard.projectile.theme";
let T = readTokens();
const q = parseQuery(location.search);
let dirty = true;
const img = loadImages(["cannon-barrel", "cannon-base", "cannonball", "basketball", "soccer-ball", "cliff", "launch-tower",
  "ground-strip", "target-bullseye", "target-bullseye-red-mask", "target-cart"], (n) => { if (n === "target-bullseye-red-mask") maskTint = null; dirty = true; });
let maskTint = null;

const startBall = q.ball || "cannonball";
const S = {   // shared by the guided modes
  angle: 45, speed: 20, h: 20, ground: true, site: "cliff", ball: startBall,
  worlds: q.world && q.world !== "earth" ? ["earth", q.world] : ["earth", "moon", "mars", "jupiter"],
  keep: false, strobe: true, parts: true, ideal: true
};
const B = {   // sandbox: every parameter open
  angle: 40, speed: 25, h: 15, ground: false, site: "cliff", ball: startBall, world: q.world || "earth", g: WORLDS[q.world || "earth"].g,
  drag: true, m: BALLS[startBall].m, d: BALLS[startBall].d, cd: CD_SPHERE, rho: RHO_SEA_LEVEL, ideal: true, keep: false, target: false
};
const st = {
  mode: MODES.includes(q.mode) ? q.mode : "launch",
  shots: [], fired: false, anim: { t: 0, T: 0, rate: 1, running: false },
  comp: { t: 0, running: !reducedMotion },
  target: { ...newTarget(Math.random(), "bullseye") }, targetKind: "bullseye", score: 0, tries: 0, hits: 0, result: "",
  boxTarget: newTarget(Math.random(), "bullseye")
};
const P = () => (st.mode === "sandbox" ? B : S);

// ---------- theme ----------
function applyTheme(t, save) {
  document.documentElement.setAttribute("data-theme", t);
  if (save) { try { localStorage.setItem(THEME_KEY, t); } catch (e) {} }
  $("themeBtn").setAttribute("aria-pressed", String(t === "dark"));
  $("themeLabel").textContent = t === "dark" ? "Light" : "Dark";
  $("themeBtn").setAttribute("aria-label", t === "dark" ? "Switch to light mode" : "Switch to dark mode");
  T = readTokens(); maskTint = null; dirty = true;
}
$("themeBtn").addEventListener("click", () => { window.PopBoardFunTheme?.(); applyTheme(T.dark ? "light" : "dark", true); });
const darkMQ = window.matchMedia("(prefers-color-scheme: dark)");
darkMQ.addEventListener?.("change", (e) => {
  let saved = null; try { saved = localStorage.getItem(THEME_KEY); } catch (err) {}
  if (!saved) applyTheme(e.matches ? "dark" : "light", false);
});
applyTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light", false);

// ---------- physics parameters for the current mode ----------
const heightOf = (p) => (p.ground ? 0 : p.h);
function params(world) {
  const p = P();
  if (st.mode === "sandbox") return { v: B.speed, angle: B.angle, h: heightOf(B), g: B.g, drag: B.drag, m: B.m, d: B.d, cd: B.cd, rho: B.rho };
  const ball = BALLS[S.ball];
  const base = { v: S.speed, angle: S.angle, h: st.mode === "drag" || st.mode === "planets" ? 0 : heightOf(S), g: G_STANDARD, drag: false, m: ball.m, d: ball.d, cd: CD_SPHERE, rho: RHO_SEA_LEVEL };
  if (st.mode === "drag") base.drag = true;
  if (st.mode === "planets") base.g = WORLDS[world || "earth"].g;
  return base;
}
const ballArt = () => BALLS[P().ball]?.art || "cannonball";

// The paths for one shot in this mode.
function computeShots() {
  const out = [];
  if (st.mode === "planets") {
    S.worlds.forEach((w, i) => { const p = params(w); out.push({ path: idealPath(p, 200), sum: ideal(p), color: T.worlds[i % 5], name: WORLDS[w].name, world: w }); });
  } else if (st.mode === "drag" || (st.mode === "sandbox" && B.drag)) {
    const p = params();
    if (P().ideal) out.push({ path: idealPath({ ...p }, 200), sum: ideal(p), color: T.ideal, dash: [7, 6], name: "No air", ghost: true });
    const s = simulate(p); out.push({ path: s.path, sum: s, color: T.drag, name: "With air" });
  } else {
    const p = params(); out.push({ path: idealPath(p, 200), sum: ideal(p), color: T.path, name: "Path" });
  }
  return out;
}
function fire(animate = true) {
  if (P().keep && st.shots.length) st.history = [...(st.history || []), ...st.shots.filter((s) => !s.ghost).map((s) => ({ ...s, old: true }))].slice(-6);
  st.shots = computeShots(); st.fired = true; st.scored = false;
  const Tm = Math.max(...st.shots.map((s) => s.sum.tFlight));
  st.anim = { t: animate && !reducedMotion ? 0 : Tm, T: Tm, rate: Math.max(1, Tm / 5), running: animate && !reducedMotion };
  if (!st.anim.running) scoreShot();
  dirty = true;
}
function clearShots() { st.shots = []; st.history = []; st.fired = false; st.result = ""; st.anim.running = false; }
function scoreShot() {
  if (st.scored) return; st.scored = true;
  const hit = scoreShotCore();
  const shot = st.shots[st.shots.length - 1];
  // Shared fun layer hook (projectile-fun.js): one event per finished shot.
  if (shot) window.dispatchEvent(new CustomEvent("projectile:shot", { detail: {
    mode: st.mode, angle: P().angle, speed: P().speed, h: params().h, g: params().g, drag: !!params().drag,
    range: shot.sum.range, hit: hit.hit, points: hit.points, targetKind: hit.kind } }));
}
function scoreShotCore() {
  const none = { hit: false, points: 0, kind: null };
  const shot = st.shots[st.shots.length - 1]; if (!shot) return none;
  const tgt = st.mode === "target" ? st.target : st.mode === "sandbox" && B.target ? st.boxTarget : null;
  if (!tgt) return none;
  if (st.mode === "target") st.tries++;
  if (tgt.kind === "cart") {
    const r = scoreCart(shot.sum.range, tgt.x);
    if (r.caught) { st.result = "Caught! The ball landed in the cart."; if (st.mode === "target") { st.hits++; st.score += 10; } }
    else st.result = `Missed: landed ${fmtM(Math.abs(r.off))} ${r.off < 0 ? "short of" : "past"} the cart.`;
    return { hit: r.caught, points: r.caught ? 10 : 0, kind: "cart" };
  } else {
    const r = scoreBullseye(shot.path, tgt.x, tgt.y);
    if (r.y == null) st.result = `Missed: landed ${fmtM(r.miss)} short of the target.`;
    else if (r.points) { st.result = `Hit! ${r.points} point${r.points > 1 ? "s" : ""} (${fmtM(r.off)} from the center).`; if (st.mode === "target") { st.hits++; st.score += r.points; } }
    else st.result = `Missed: passed ${fmtM(Math.abs(r.y - tgt.y))} ${r.y > tgt.y ? "above" : "below"} the center.`;
    return { hit: !!(r.y != null && r.points), points: (r.y != null && r.points) || 0, kind: "bullseye" };
  }
}

// ---------- controls ----------
const SLIDER_LABEL = { angle: "Launch angle \u03b8", speed: "Launch speed v", height: "Launch height h", g: "Gravity g", cd: "Drag coefficient C\u1d05",
  rho: "Air density \u03c1", mass: "Mass m", diameter: "Diameter d" };
const SLIDER_FMT = { angle: fmtDeg, speed: fmtV, height: fmtM, g: fmtG, cd: (v) => fmtNum(v), rho: fmtRho, mass: fmtKg, diameter: fmtD };
const getS = { angle: (p) => p.angle, speed: (p) => p.speed, height: (p) => p.h, g: (p) => p.g, cd: (p) => p.cd, rho: (p) => p.rho, mass: (p) => p.m, diameter: (p) => p.d };
const setS = { angle: (p, v) => { p.angle = v; }, speed: (p, v) => { p.speed = v; }, height: (p, v) => { p.h = v; p.ground = false; },
  g: (p, v) => { p.g = v; p.world = null; }, cd: (p, v) => { p.cd = v; }, rho: (p, v) => { p.rho = v; p.drag = true; },
  mass: (p, v) => { p.m = v; p.ball = null; }, diameter: (p, v) => { p.d = v; p.ball = null; } };
const CFG = {
  launch: { sliders: ["angle", "speed", "height"], site: true, actions: ["fire", "clear"], toggles: ["keep"] },
  components: { sliders: ["angle", "speed", "height"], site: true, actions: ["play", "step", "restart"], toggles: ["strobe", "parts"] },
  drag: { sliders: ["angle", "speed"], ball: true, actions: ["fire"], toggles: ["ideal"] },
  target: { sliders: ["angle", "speed", "height"], site: true, targetKind: true, actions: ["fire", "newTarget"], toggles: [] },
  planets: { sliders: ["angle", "speed"], world: "multi", actions: ["fire"], toggles: [] },
  sandbox: { sliders: ["angle", "speed", "height", "g", "mass", "diameter", "cd", "rho"], site: true, world: "one", ball: true,
    actions: ["fire", "clear"], toggles: ["drag", "ideal", "keep", "target"] }
};
const ACTION = { fire: "Fire", clear: "Clear paths", play: "Pause", step: "Step", restart: "Restart", newTarget: "New target" };
const TOGGLE = { keep: "Keep old paths", strobe: "Strobe", parts: "Components", ideal: "No-air path", drag: "Air drag", target: "Target" };

function btn(text, attrs, onClick) {
  const b = document.createElement("button"); b.type = "button"; b.textContent = text;
  for (const [k, v] of Object.entries(attrs)) b.setAttribute(k, v);
  b.addEventListener("click", () => { onClick(); sync(); dirty = true; });
  return b;
}
function afterChange() {
  if (st.mode === "target") { st.shots = []; st.fired = false; }
  else if (st.mode !== "components" && st.fired) fire(false);
  if (st.mode === "components") st.comp.t = Math.min(st.comp.t, ideal(params()).tFlight);
}
function build() {
  const cfg = CFG[st.mode], p = P(), panel = $("panel");
  const grp = (n) => panel.querySelector(`[data-group="${n}"]`);
  for (const g of $$("[data-group]", panel)) { g.replaceChildren(); g.hidden = true; }
  const sl = panel.querySelector("[data-sliders]"); sl.replaceChildren();
  if (cfg.world) {
    const g = grp("world"); g.hidden = false;
    for (const w of WORLD_IDS) g.appendChild(btn(WORLDS[w].name, { "data-world": w, "aria-pressed": "false" }, () => {
      if (cfg.world === "multi") {
        const i = S.worlds.indexOf(w);
        if (i >= 0) { if (S.worlds.length > 1) S.worlds.splice(i, 1); } else { S.worlds.push(w); if (S.worlds.length > 5) S.worlds.shift(); }
      } else { B.world = w; B.g = WORLDS[w].g; if (w !== "earth" && w !== "venus" && w !== "mars") B.drag = false; }
      afterChange();
    }));
  }
  if (cfg.ball) {
    const g = grp("ball"); g.hidden = false;
    for (const b of BALL_IDS) g.appendChild(btn(BALLS[b].name, { "data-ball": b, "aria-pressed": "false" }, () => {
      p.ball = b; if (st.mode === "sandbox") { B.m = BALLS[b].m; B.d = BALLS[b].d; } afterChange();
    }));
  }
  if (cfg.targetKind) {
    const g = grp("targetKind"); g.hidden = false;
    for (const [k, name] of [["bullseye", "Bullseye"], ["cart", "Cart"]]) g.appendChild(btn(name, { "data-tkind": k, "aria-pressed": "false" }, () => {
      st.targetKind = k; st.target = newTarget(Math.random(), k); st.result = ""; st.shots = []; st.fired = false;
    }));
  }
  for (const k of cfg.sliders) {
    const lab = document.createElement("label"); lab.className = "slider";
    const span = document.createElement("span"); span.textContent = SLIDER_LABEL[k];
    const inp = document.createElement("input"); inp.type = "range"; inp.min = "0"; inp.max = String(sliderSteps(k)); inp.step = "1"; inp.dataset.slider = k;
    const out = document.createElement("output"); out.dataset.out = k;
    inp.addEventListener("input", () => { setS[k](P(), fromSlider(k, Number(inp.value))); afterChange(); sync(); dirty = true; });
    lab.append(span, inp, out); sl.appendChild(lab);
  }
  if (cfg.site) {
    const g = grp("site"); g.hidden = false;
    for (const [k, name] of [["ground", "Ground"], ["cliff", "Cliff"], ["tower", "Tower"]]) g.appendChild(btn(name, { "data-site": k, "aria-pressed": "false" }, () => {
      if (k === "ground") p.ground = true; else { p.ground = false; p.site = k; } afterChange();
    }));
  }
  const ga = grp("actions"); ga.hidden = false;
  for (const a of cfg.actions) ga.appendChild(btn(ACTION[a], { "data-action": a }, () => doAction(a)));
  if (cfg.toggles.length) {
    const g = grp("toggles"); g.hidden = false;
    for (const t of cfg.toggles) g.appendChild(btn(TOGGLE[t], { "data-toggle": t, "aria-pressed": "false" }, () => {
      p[t] = !p[t];
      if (t === "target") st.result = "";
      if (t === "keep" && !p.keep) st.history = [];
      afterChange();
    }));
  }
}
function doAction(a) {
  if (a === "fire") fire(true);
  else if (a === "clear") clearShots();
  else if (a === "newTarget") { st.target = newTarget(Math.random(), st.targetKind); st.shots = []; st.fired = false; st.result = ""; }
  else if (a === "play") st.comp.running = !st.comp.running;
  else if (a === "step") { st.comp.running = false; const tf = ideal(params()).tFlight; st.comp.t = st.comp.t >= tf - 1e-9 ? 0 : Math.min(tf, st.comp.t + tf / 10); }
  else if (a === "restart") { st.comp.t = 0; st.comp.running = !reducedMotion; }
  if (st.mode === "sandbox" && a === "fire" && B.target && !st.boxTarget) st.boxTarget = newTarget(Math.random(), "bullseye");
}

// ---------- readouts ----------
const NOTES = {
  launch: "With no air, gravity only pulls down, so the horizontal speed never changes and the vertical speed drops by g every second. The path is a parabola. From level ground, 45\u00b0 gives the longest range, and angles that add to 90\u00b0 (like 30\u00b0 and 60\u00b0) land at the same spot. Launching from a height makes the best angle a little lower than 45\u00b0. The art is not to scale: h is the height of the muzzle above the ground where the ball lands, so from the ground the cannon sits in a pit.",
  components: "Split the velocity into a horizontal part v\u2093 = v cos \u03b8 and a vertical part v\u1d67 = v sin \u03b8. The strobe dots are equal times apart: they stay equally spaced across (constant v\u2093) but bunch up near the top, where v\u1d67 passes through zero. At the peak the velocity is purely horizontal, not zero.",
  drag: "Real air pushes back with a force that grows with the square of speed: F = \u00bd\u03c1C\u1d05Av\u00b2. The path is no longer a parabola: it comes down steeper than it went up, lands short, and the best angle drops below 45\u00b0. Light, large balls feel it most. A 6 lb iron cannonball barely notices at these speeds.",
  target: "Hit the target. The range readout is hidden, so predict it from the angle and speed, then fire. Bullseye rings score 1, 2, 3, 5, 8 and 10. The cart catches a ball that lands within 1.5 m of its center. No air drag in this mode.",
  planets: "The same launch on different worlds. Range, peak height and flight time all scale as 1/g, so the Moon (g = 1.6 m/s\u00b2) gives about 6 times Earth's range and Jupiter about 0.42 times. The shape is the same parabola, only stretched. Gas giants have no solid surface; their g is measured at the 1 bar level. No air drag here.",
  sandbox: "Free play: every parameter is open. Pick a world to set g, or drag the g slider. Air drag uses the density, drag coefficient, mass and diameter you set (Earth's sea-level air is 1.225 kg/m\u00b3, Mars about 0.016 (roughly 1/75 of Earth's) and Venus about 65). Turn on Target to aim at a bullseye."
};
function rows(list) { const dl = $("readout"); dl.replaceChildren(); for (const [k, v] of list) { const dt = document.createElement("dt"); dt.textContent = k; const dd = document.createElement("dd"); dd.textContent = v; dl.append(dt, dd); } }
function readout() {
  const p = params(), r = ideal(p), m = st.mode;
  let f = "", res = "";
  if (m === "launch" || (m === "sandbox" && !B.drag)) {
    rows([...(m === "sandbox" ? [["g", fmtG(B.g)]] : []), ["v\u2093", fmtV(r.vx)], ["v\u1d67 at launch", fmtV(r.vy)], ["Time to peak", fmtS(r.tApex)], ["Time of flight", fmtS(r.tFlight)],
      ["Peak height", `${fmtM(r.maxHeight)} above the ground`], ["Range", fmtM(r.range)], ["Landing speed", fmtV(r.vLand)]]);
    f = "v\u2093 = v cos \u03b8, v\u1d67 = v sin \u03b8\nt_peak = v\u1d67 / g\nH = h + v\u1d67\u00b2 / (2g)\nT = (v\u1d67 + \u221a(v\u1d67\u00b2 + 2gh)) / g\nR = v\u2093 T" + (p.h === 0 ? "  (level ground: R = v\u00b2 sin 2\u03b8 / g)" : "");
  } else if (m === "components") {
    const t = st.comp.t, s = idealAt(p, t), sp = Math.hypot(s.vx, s.vy);
    rows([["Time t", fmtS(t)], ["x", fmtM(s.x)], ["y", fmtM(Math.max(0, s.y))], ["v\u2093", `${fmtV(s.vx)} (constant)`], ["v\u1d67", fmtV(s.vy)], ["Speed", fmtV(sp)]]);
    f = "x = v\u2093 t\ny = h + v\u1d67\u2080 t \u2212 \u00bd g t\u00b2\nv\u1d67 = v\u1d67\u2080 \u2212 g t\nspeed = \u221a(v\u2093\u00b2 + v\u1d67\u00b2)";
  } else if (m === "drag" || m === "sandbox") {
    const s = simulate(p), best = bestAngle({ ...p }), bestIdeal = bestAngle({ ...p, drag: false });
    const list = [];
    if (m === "sandbox") list.push(["g", fmtG(B.g)], ["Mass, diameter", `${fmtKg(p.m)}, ${fmtD(p.d)}`]);
    list.push(["Range, no air", fmtM(r.range)], ["Range with air", fmtM(s.range)], ["Shorter by", `${fmtNum(100 * (1 - s.range / r.range), 2)}%`],
      ["Peak height", `${fmtM(r.maxHeight)} \u2192 ${fmtM(s.maxHeight)}`], ["Time of flight", `${fmtS(r.tFlight)} \u2192 ${fmtS(s.tFlight)}`],
      ["Landing angle", `${fmtDeg(r.landAngle)} \u2192 ${fmtDeg(s.landAngle)}`], ["Best angle", `${bestIdeal.angle}\u00b0 no air, ${best.angle}\u00b0 with air`],
      ["Terminal speed", fmtV(terminalSpeed({ ...p }))]);
    rows(list);
    f = "F_drag = \u00bd \u03c1 C\u1d05 A v\u00b2, A = \u03c0d\u00b2/4\na = \u2212g \u0177 \u2212 (k/m) |v| v, k = \u00bd \u03c1 C\u1d05 A\nv_terminal = \u221a(m g / k)";
  } else if (m === "target") {
    const t = st.target;
    rows([["Target distance", fmtM(t.x)], ...(t.kind === "bullseye" ? [["Center height", fmtM(t.y)]] : [["Cart catch zone", `\u00b1${fmtM(CART_HALF)}`]]),
      ["Launch height", fmtM(p.h)], ["Shots", String(st.tries)], ["Hits", String(st.hits)], ["Score", String(st.score)]]);
    f = "Hint: on level ground R = v\u00b2 sin 2\u03b8 / g with g = 9.81 m/s\u00b2.";
    res = st.result;
  } else if (m === "planets") {
    rows(S.worlds.map((w) => { const x = ideal(params(w)); return [WORLDS[w].name, `g ${fmtG(WORLDS[w].g)}: R ${fmtM(x.range)}, H ${fmtM(x.maxHeight)}, T ${fmtS(x.tFlight)}`]; }));
    f = "R = v\u00b2 sin 2\u03b8 / g, H = v\u00b2 sin\u00b2\u03b8 / (2g), T = 2 v sin \u03b8 / g";
  }
  if (m === "sandbox" && B.target) res = st.result || `Target at ${fmtM(st.boxTarget.x)}, center ${fmtM(st.boxTarget.y)} up.`;
  if (st.fired && st.anim.rate > 1 && m !== "components") res = (res ? res + " " : "") + `Playback sped up ${fmtNum(st.anim.rate, 2)}x.`;
  $("formula").textContent = f; $("result").textContent = res; $("note").textContent = NOTES[m];
}

function sync() {
  const p = P(), panel = $("panel");
  for (const el of $$("[data-slider]", panel)) {
    const k = el.dataset.slider, v = getS[k](p);
    el.value = String(toSlider(k, v));
    const out = panel.querySelector(`[data-out="${k}"]`);
    let txt = SLIDER_FMT[k](v);
    if (k === "height" && p.ground) txt = "0 m (ground)";
    if (k === "rho" && !p.drag) txt = "off (no air)";
    out.textContent = txt; el.setAttribute("aria-valuetext", txt);
  }
  for (const b of $$("[data-world]", panel)) b.setAttribute("aria-pressed", String(st.mode === "planets" ? S.worlds.includes(b.dataset.world) : B.world === b.dataset.world));
  for (const b of $$("[data-ball]", panel)) b.setAttribute("aria-pressed", String(p.ball === b.dataset.ball));
  for (const b of $$("[data-tkind]", panel)) b.setAttribute("aria-pressed", String(st.targetKind === b.dataset.tkind));
  for (const b of $$("[data-site]", panel)) b.setAttribute("aria-pressed", String(b.dataset.site === "ground" ? p.ground : !p.ground && p.site === b.dataset.site));
  for (const b of $$("[data-toggle]", panel)) b.setAttribute("aria-pressed", String(!!p[b.dataset.toggle]));
  for (const b of $$('[data-action="play"]', panel)) b.textContent = st.comp.running ? "Pause" : "Play";
  readout();
}

function setMode(m) {
  st.mode = m; clearShots();
  for (const b of $$(".toolbar .tool")) b.setAttribute("aria-pressed", String(b.dataset.show === m));
  build();
  if (m === "components") { st.comp.t = reducedMotion ? ideal(params()).tApex : 0; st.comp.running = !reducedMotion; }
  const u = new URLSearchParams(location.search); u.set("mode", m); history.replaceState(null, "", "?" + u.toString());
  sync(); dirty = true;
}
for (const b of $$(".toolbar .tool")) b.addEventListener("click", () => setMode(b.dataset.show));

// ---------- drawing ----------
const canvas = $("pjCanvas"), ctx = canvas.getContext("2d");
function resize() {
  const r = canvas.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr));
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { W: r.width, H: r.height };
}
function extents() {
  const p = params();
  let xMax = 10, yMax = Math.max(6, p.h * 1.1);
  const grow = (s) => { xMax = Math.max(xMax, s.range * 1.06); yMax = Math.max(yMax, s.maxHeight * 1.12); };
  if (st.mode === "target") { xMax = st.target.x + 8; yMax = Math.max(yMax, st.target.y + 3); for (const s of st.shots) grow(s.sum); }
  else if (st.mode === "planets") for (const w of S.worlds) grow(ideal(params(w)));
  else { grow(ideal(p)); for (const s of [...st.shots, ...(st.history || [])]) grow(s.sum); }
  if (st.mode === "sandbox" && B.target) xMax = Math.max(xMax, st.boxTarget.x + 6);
  return { xMax: niceCeil(xMax), yMax };
}
function draw() {
  const { W, H } = resize();
  ctx.fillStyle = T.sky; ctx.fillRect(0, 0, W, H);
  const { xMax, yMax } = extents();
  const V = viewOf(W, H, xMax, yMax, W < 500 ? 76 : 110);
  const p = params(), mode = st.mode;
  const tNow = st.anim.t;
  // paths (under the art)
  for (const s of st.history || []) polyline(ctx, V, s.path, T.ideal, 1.5, [3, 5]);
  for (const s of st.shots) polyline(ctx, V, s.path, s.color, s.ghost ? 2 : 2.5, s.dash, tNow);
  let ballsAt = [];
  if (mode === "components") {
    const r = ideal(p), full = idealPath(p, 200);
    polyline(ctx, V, full, T.ideal, 1.5, [5, 6]);
    if (S.strobe) {
      const n = 10;
      for (let i = 0; i <= n; i++) {
        const s = idealAt(p, r.tFlight * i / n), X = V.toX(s.x), Y = V.toY(Math.max(0, s.y));
        ctx.fillStyle = T.dim; ctx.beginPath(); ctx.arc(X, Y, 3.5, 0, 7); ctx.fill();
        ctx.strokeStyle = T.vx; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X, V.toY(0) + 4); ctx.lineTo(X, V.toY(0) + 14); ctx.stroke();
        const XR = V.toX(r.range) + 16;
        ctx.strokeStyle = T.vy; ctx.beginPath(); ctx.moveTo(XR, Y); ctx.lineTo(XR + 10, Y); ctx.stroke();
      }
    }
    const s = idealAt(p, st.comp.t);
    ballsAt.push({ x: s.x, y: Math.max(0, s.y), vx: s.vx, vy: s.vy });
  } else {
    for (const s of st.shots) {
      if (s.ghost && mode !== "drag" && mode !== "sandbox") continue;
      const b = sampleAt(s.path, Math.min(tNow, s.sum.tFlight)); ballsAt.push({ x: b.x, y: b.y, color: s.color, name: s.name, done: tNow >= s.sum.tFlight, sum: s.sum });
    }
  }
  // art
  const muzzleX = V.toX(0), muzzleY = V.toY(p.h);
  const maxBarrel = W < 500 ? 54 : 74;
  // On a cliff or tower the cannon shrinks with a low ledge so the ledge still shows.
  const can = cannonLayers(img, muzzleX, muzzleY, p.angle, p.h > 0 ? Math.min(maxBarrel, Math.max(26, p.h * V.s * 0.4)) : maxBarrel * 0.75);
  // From the ground the cannon sits in a pit with its muzzle at ground level (y = 0).
  const layers = [...groundLayers(img, V, W < 500 ? 32 : 40)];
  const pp = P();
  if (p.h > 0) layers.push(...siteLayers(img, pp.site, can.pivot[0] + can.width * 0.32, can.groundY, V.toY(0)));
  // targets
  const tgt = mode === "target" ? st.target : mode === "sandbox" && B.target ? st.boxTarget : null;
  if (tgt) {
    if (tgt.kind === "cart") layers.push(cartLayer(img, V.toX(tgt.x), V.toY(0) + 2, 2 * CART_HALF * V.s));
    else {
      const R = BULLSEYE_R * V.s, X = V.toX(tgt.x), Y = V.toY(tgt.y);
      ctx.strokeStyle = T.ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(X, V.toY(0)); ctx.stroke();
      if (!maskTint && img["target-bullseye-red-mask"]) maskTint = tinted(img["target-bullseye-red-mask"], T.red);
      layers.push(...bullseyeLayers(img, maskTint, X, Y, R));
    }
  }
  layers.push(...can.layers);
  const br = W < 500 ? 7 : 9;
  for (const b of ballsAt) layers.push(ballLayer(img, ballArt(), V.toX(b.x), V.toY(b.y) - (b.y <= 0.001 ? br : 0), br, b.x / 1.5));
  drawArt(ctx, layers);
  // overlays
  angleArc(ctx, T, muzzleX, muzzleY, p.angle);
  label(ctx, T, `${fmtDeg(p.angle)}, ${fmtV(p.v)}`, 12, 20, "left");
  ruler(ctx, V, T, xMax);
  if (p.h > 0) heightBar(ctx, V, T, -0.0001, 0, p.h, `h = ${fmtM(p.h)}`);
  if (mode === "components") {
    const b = ballsAt[0], X = V.toX(b.x), Y = V.toY(b.y), k = 80 / p.v;
    if (S.parts) { arrow(ctx, X, Y, b.vx * k, 0, T.vx); arrow(ctx, X, Y, 0, -b.vy * k, T.vy); }
    arrow(ctx, X, Y, b.vx * k, -b.vy * k, T.v, 2);
    if (S.parts) { label(ctx, T, "v\u2093", X + b.vx * k + 14, Y, "left", T.vx); label(ctx, T, "v\u1d67", X, Y - b.vy * k + (b.vy > 0 ? -14 : 14), "center", T.vy); }
  }
  if (mode === "planets" && st.fired) {
    // stagger the landing labels by rank of range so neighbors never share a row
    const order = [...st.shots].sort((a, b) => a.sum.range - b.sum.range);
    order.forEach((s, i) => { if (tNow >= s.sum.tFlight) label(ctx, T, `${s.name} ${fmtM(s.sum.range)}`, Math.max(V.padL, Math.min(W - 60, V.toX(s.sum.range))), V.toY(0) - 26 - 24 * (i % 4), "center", s.color); });
  } else if ((mode === "drag" || mode === "sandbox" || mode === "launch") && st.fired) {
    st.shots.forEach((s, i) => {
      if (tNow < s.sum.tFlight) return;
      const txt = st.shots.length > 1 ? `${s.name}: ${fmtM(s.sum.range)}` : `R = ${fmtM(s.sum.range)}`;
      label(ctx, T, txt, Math.min(W - 70, V.toX(s.sum.range)), V.toY(0) - 26 - 24 * i, "center", s.color);
      if (!s.ghost && i === st.shots.length - 1) {
        const apexT = s.sum.tApex; const a = sampleAt(s.path, apexT);
        if (a.y > p.h + 0.01) heightBar(ctx, V, T, a.x, 0, a.y, `H = ${fmtM(s.sum.maxHeight)}`);
      }
    });
  } else if (mode === "target" && st.fired && st.scored && st.result) {
    label(ctx, T, st.result.split(":")[0], W - 12, 20, "right");
  }
  if (mode === "target" && !st.fired) label(ctx, T, `Target: ${fmtM(st.target.x)}`, V.toX(st.target.x), V.toY(0) - 14 - (st.target.kind === "bullseye" ? 0 : 40), "center");
}

let last = performance.now(), readTick = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (!document.hidden && !reducedMotion) {
    if (st.anim.running) {
      st.anim.t += dt * st.anim.rate;
      if (st.anim.t >= st.anim.T) { st.anim.t = st.anim.T; st.anim.running = false; scoreShot(); sync(); }
      dirty = true;
    }
    if (st.mode === "components" && st.comp.running) {
      const tf = ideal(params()).tFlight;
      st.comp.t += dt * Math.max(1, tf / 5) * 0.5;
      if (st.comp.t > tf) st.comp.t = 0;
      dirty = true;
      if (now - readTick > 150) { readTick = now; readout(); }
    }
  }
  if (dirty) { dirty = false; draw(); }
  requestAnimationFrame(frame);
}

$("studyBackBtn").addEventListener("click", (e) => {
  e.preventDefault();
  // Back to the Study library with the board return keys only: drop this
  // module's mode, world and ball from the URL, then hand over the query.
  const qs = forwardStudyQuery(location.search).toString();
  history.replaceState(null, "", qs ? "?" + qs : location.pathname);
  location.href = "study.html" + location.search;
});

window.addEventListener("resize", () => { dirty = true; });
new ResizeObserver(() => { dirty = true; }).observe(canvas);
setMode(st.mode);
if (st.mode !== "components" && st.mode !== "target") fire(false);
sync();
requestAnimationFrame(frame);
// Read-only hook for the browser checks.
window.__projectile = { state: st, shared: S, sandbox: B };
// Hook for the shared fun layer (projectile-fun.js): sandbox share links.
window.__projectileFun = {
  mode: () => st.mode, sandbox: B,
  applySandbox(v) { Object.assign(B, v); if (v.world && WORLDS[v.world] && v.g == null) B.g = WORLDS[v.world].g; setMode("sandbox"); fire(false); sync(); dirty = true; }
};
window.dispatchEvent(new Event("projectile:ready"));
