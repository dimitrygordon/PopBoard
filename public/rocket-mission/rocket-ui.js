// Rocket Science & Space Mission: page wiring and the scenes for each mode.
// Physics and data: rocket-physics.js. Drawing helpers: rocket-render.js.

import { forwardStudyQuery } from "../board-return.js?v=20261022a";
import {
  loadImages, readTokens, text, line, arrow, disc, stars, axes, drawRocket, drawPad, PAD, drawFlight, drawOrbitScene, drawHohmann
} from "./rocket-render.js";
import {
  G0, ENGINES, EQ_ENGINES, PLANETS, TARGETS, LEO_DV, LAUNCH_PRESET, KICKS, PARTS, R_EARTH, ORBIT_OK_KM, TARGET_KM, DROP_KM,
  SLIDERS, fromSlider, toSlider, shown, MODES, parseQuery, simulate, orbitShot, hohmannPlan, massRatioFor, veFromIsp, buildRocket,
  sig, kms, kmF, force, tonnes, days
} from "./rocket-physics.js";

const $ = (id) => document.getElementById(id);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const THEME_KEY = "popboard.rocket.theme";
let T = readTokens();
const q = parseQuery(location.search);
let dirty = true;
const img = loadImages(() => { dirty = true; });

const st = {
  mode: q.mode,
  thrust: { mdot: 300, ve: 3000, mass: 60 },
  equation: { engine: "f1", ratio: 8 },
  staging: { engine: "f1", payloadFrac: 0.02, struct: 0.1 },
  launch: { alt: 400, kick: "medium" },
  orbits: { alt: 400, speed: 7.7 },
  hohmann: { target: "mars", park: 300, t: 0, playing: false },
  sandbox: { top: "ogive", upper: false, tank: "medium", engine: "single", boosters: 0, fins: true, payload: 1, kick: "small", flying: false }
};
const snap = (name, v) => fromSlider(name, toSlider(name, v));
for (const [m, keys] of Object.entries({ thrust: ["mdot", "ve", "mass"], equation: ["ratio"], staging: ["payloadFrac", "struct"], sandbox: ["payload"] }))
  for (const k of keys) st[m][k] = snap(k, st[m][k]);
st.launch.alt = snap("altLaunch", st.launch.alt); st.orbits.alt = snap("altOrbit", st.orbits.alt); st.orbits.speed = snap("speed", st.orbits.speed);
st.hohmann.park = snap("park", st.hohmann.park);
const sandboxDefaults = () => Object.assign(st.sandbox, { top: "ogive", upper: false, tank: "medium", engine: "single", boosters: 0, fins: true, payload: snap("payload", 1), kick: "small", flying: false });

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

// ---------- flights (cached per build and pitch-over) ----------
const flights = new Map();
function flight(cfg, kick) {
  const key = JSON.stringify([cfg, kick]);
  if (!flights.has(key)) flights.set(key, simulate(cfg, KICKS[kick]));
  return flights.get(key);
}
const sandboxCfg = () => { const s = st.sandbox; return { top: s.top, upper: s.upper, tank: s.tank, engine: s.engine, boosters: s.boosters, fins: s.fins, payload: s.payload }; };
let play = { t: 0, last: 0 };     // flight playback clock (simulated seconds)
function restartFlight() { play = { t: reducedMotion ? 1e9 : 0, last: 0 }; dirty = true; }

// ---------- controls built per mode ----------
const SLIDER_UI = {
  thrust: [["mdot", "Mass flow rate \u1e41"], ["ve", "Exhaust speed v\u2091"], ["mass", "Rocket mass m"]],
  equation: [["ratio", "Mass ratio m\u2080/m_f"]],
  staging: [["payloadFrac", "Payload share of liftoff mass"], ["struct", "Structure share of each stage"]],
  launch: [["altLaunch", "Orbit altitude h"]],
  orbits: [["altOrbit", "Altitude h"], ["speed", "Sideways speed v"]],
  hohmann: [["park", "Parking orbit altitude"]],
  sandbox: [["payload", "Payload mass"]]
};
const KEY = { mdot: ["thrust", "mdot"], ve: ["thrust", "ve"], mass: ["thrust", "mass"], ratio: ["equation", "ratio"], payloadFrac: ["staging", "payloadFrac"],
  struct: ["staging", "struct"], altLaunch: ["launch", "alt"], altOrbit: ["orbits", "alt"], speed: ["orbits", "speed"], park: ["hohmann", "park"], payload: ["sandbox", "payload"] };
const get = (k) => st[KEY[k][0]][KEY[k][1]];
const set = (k, v) => { st[KEY[k][0]][KEY[k][1]] = v; if (k === "payload") st.sandbox.flying = false; };
const sliderText = {
  mdot: (v) => sig(v) + " kg/s", ve: (v) => sig(v, 4) + " m/s", mass: tonnes, ratio: (v) => sig(v),
  payloadFrac: (v) => sig(100 * v, 2) + "%", struct: (v) => sig(100 * v, 2) + "%", altLaunch: (v) => kmF(v),
  altOrbit: (v) => kmF(v), speed: (v) => v.toFixed(2) + " km/s", park: (v) => kmF(v), payload: tonnes
};
function button(host, label, onClick, cls = "") {
  const b = document.createElement("button"); b.type = "button"; b.textContent = label; if (cls) b.className = cls;
  b.addEventListener("click", onClick); host.appendChild(b); return b;
}
function buildControls() {
  const host = $$("[data-sliders]")[0];
  host.innerHTML = "";
  for (const [k, label] of SLIDER_UI[st.mode]) {
    const lab = document.createElement("label"); lab.className = "slider"; lab.dataset.wrap = k;
    const sp = document.createElement("span"); sp.textContent = label;
    const out = document.createElement("output"); out.dataset.out = k;
    const inp = document.createElement("input"); inp.type = "range"; inp.min = "0"; inp.max = String(SLIDERS[k].steps); inp.step = "1"; inp.dataset.slider = k;
    inp.setAttribute("aria-label", label);
    inp.addEventListener("input", () => { set(k, fromSlider(k, Number(inp.value))); sync(); });
    lab.append(sp, out, inp); host.appendChild(lab);
  }
  const rows = $$("[data-choices]")[0]; rows.innerHTML = "";
  const group = (label, items, isOn, pick) => {
    const g = document.createElement("div"); g.className = "group";
    const h = document.createElement("p"); h.className = "group-label"; h.textContent = label; g.appendChild(h);
    const r = document.createElement("div"); r.className = "row"; r.setAttribute("role", "group"); r.setAttribute("aria-label", label);
    for (const [val, txt] of items) { const b = button(r, txt, () => { pick(val); sync(); }); b.dataset.choice = label; b.dataset.val = String(val); b._on = () => isOn(val); }
    g.appendChild(r); rows.appendChild(g);
  };
  const engs = (ids) => ids.map((id) => [id, ENGINES[id].short]);
  const kicks = [["small", "Small tip (0.4\u00b0)"], ["medium", "Medium tip (2\u00b0)"], ["big", "Big tip (5\u00b0)"]];
  const m = st.mode;
  if (m === "thrust") {
    group("Load a real engine", [["f1", "F-1 (Saturn V)"], ["rs25", "RS-25 (Shuttle)"]], () => false, (id) => {
      const e = ENGINES[id], ve = veFromIsp(e.ispSl);
      st.thrust.ve = snap("ve", ve); st.thrust.mdot = snap("mdot", e.thrustSl / ve);
    });
  } else if (m === "equation") {
    group("Engine (vacuum Isp)", engs(EQ_ENGINES), (v) => st.equation.engine === v, (v) => { st.equation.engine = v; });
  } else if (m === "staging") {
    group("Engine (vacuum Isp)", engs(EQ_ENGINES), (v) => st.staging.engine === v, (v) => { st.staging.engine = v; });
  } else if (m === "launch") {
    group("Pitch-over (gravity turn)", kicks, (v) => st.launch.kick === v, (v) => { st.launch.kick = v; restartFlight(); });
    group("Flight", [["replay", "Replay"]], () => false, () => restartFlight());
  } else if (m === "orbits") {
    group("Try", [["7.7", "ISS speed"], ["9", "Faster"], ["11.1", "Escape"], ["6.5", "Too slow"]], () => false, (v) => { st.orbits.speed = snap("speed", Number(v)); st.orbits.alt = snap("altOrbit", 400); });
  } else if (m === "hohmann") {
    group("Destination", TARGETS.map((id) => [id, PLANETS[id].name]), (v) => st.hohmann.target === v, (v) => { st.hohmann.target = v; st.hohmann.t = 0; st.hohmann.playing = false; });
    group("Trip", [["play", "Play"], ["start", "Departure"], ["end", "Arrival"]], () => false, (v) => {
      const P = hohmannPlan(st.hohmann.target, st.hohmann.park);
      if (v === "play") { if (st.hohmann.t >= P.tTransfer) st.hohmann.t = 0; st.hohmann.playing = !reducedMotion; if (reducedMotion) st.hohmann.t = P.tTransfer; }
      else { st.hohmann.playing = false; st.hohmann.t = v === "start" ? 0 : P.tTransfer; }
    });
  } else if (m === "sandbox") {
    const s = st.sandbox, change = (f) => (v) => { f(v); s.flying = false; };
    group("Top", Object.entries(PARTS.top).map(([id, p]) => [id, p.name]), (v) => s.top === v, change((v) => { s.top = v; }));
    group("Upper stage", [["no", "None"], ["yes", "Upper stage"]], (v) => (v === "yes") === s.upper, change((v) => { s.upper = v === "yes"; }));
    group("First-stage tank", Object.entries(PARTS.tank).map(([id, p]) => [id, p.name]), (v) => s.tank === v, change((v) => { s.tank = v; }));
    group("Engines", Object.entries(PARTS.engine).map(([id, p]) => [id, p.name]), (v) => s.engine === v, change((v) => { s.engine = v; }));
    group("Strap-on boosters", [["0", "None"], ["2", "Two solid boosters"]], (v) => String(s.boosters) === v, change((v) => { s.boosters = Number(v); }));
    group("Fins", [["yes", "Fins"], ["no", "No fins"]], (v) => (v === "yes") === s.fins, change((v) => { s.fins = v === "yes"; }));
    group("Pitch-over", kicks, (v) => s.kick === v, change((v) => { s.kick = v; }));
    group("Fly", [["launch", "Launch"], ["pad", "Back to pad"], ["reset", "Reset"]], () => false, (v) => {
      if (v === "launch") { s.flying = true; restartFlight(); } else if (v === "pad") s.flying = false; else { sandboxDefaults(); buildControls(); }
    });
    const lb = $$('[data-val="launch"]')[0]; if (lb) lb.classList.add("go");
  }
}

// ---------- readouts ----------
const TITLES = {
  thrust: "Thrust: Newton's third law", equation: "The rocket equation", staging: "Why rockets have stages", launch: "Launch to orbit",
  orbits: "Orbits and escape speed", hohmann: "Hohmann transfer: Earth to another planet", sandbox: "Sandbox: build and fly"
};
const NOTES = {
  thrust: "A rocket throws mass out of its nozzle very fast. By Newton's third law the exhaust pushes back on the rocket just as hard: thrust F = \u1e41v\u2091, the mass thrown out each second times its speed. The rocket lifts off only if the thrust is more than its weight (thrust-to-weight ratio above 1). It does not push on the ground or the air, which is why rockets work in space. Real engines (sea level): F-1 at sea level: about 6.7 MN (the real engine made 6.77 MN; the slider rounds it). RS-25 at sea level: about 3,590 m/s exhaust speed (Isp about 366 s), about 1.86 MN of thrust. RS-25: about 1.86 MN at sea level and about 2.28 MN in space, at 109% power.",
  equation: "As a rocket burns fuel it gets lighter, so each kilogram of exhaust speeds it up more than the last. Tsiolkovsky's rocket equation adds this up: \u0394v = v\u2091 ln(m\u2080/m_f), where m\u2080 is the full mass and m_f the mass when the fuel is gone. Specific impulse Isp measures how good an engine is: v\u2091 = g\u2080\u00b7Isp. Because of the logarithm, doubling the mass ratio adds only a fixed amount of speed.",
  staging: "A rocket carries empty tanks and engines it no longer needs. Staging throws them away partway up, so the rest of the fuel only has to push what is left. Here the same liftoff mass, payload and engine are compared as one big stage or two equal stages. Every stage's structure (tanks, engines) is the set share of that stage's mass.",
  launch: "A two-stage rocket (rounded, Falcon-9-like numbers) climbs straight up to 60 m/s, tips over by a small angle, then lets gravity bend its path toward horizontal: a gravity turn. Tip too little and it climbs too steeply and wastes fuel fighting gravity; tip too much and it stays low in thick air and falls back. Climbing fights gravity (gravity loss) and the thick lower air pushes back (drag loss). Orbit is about going sideways fast enough: at orbital speed v = \u221a(GM/r) the ground curves away as fast as you fall. Simplified: a 2D flight over a round Earth that does not spin, with engines at full thrust.",
  orbits: "Newton's cannonball: fire something sideways from above the air. Too slow and it falls back to Earth. At circular speed v = \u221a(GM/r) it falls around Earth forever. Faster gives a stretched ellipse, and at escape speed \u221a(2GM/r) (about 1.41 times circular speed) it never comes back. The craft moves fastest closest to Earth (Kepler's second law).",
  hohmann: "The cheapest common way between two circular orbits: one burn to stretch your orbit around the Sun until it touches the target's orbit, and one burn there to match its speed. The trip is half an ellipse, so you must leave when the planet will be at the meeting point on arrival. That lining-up repeats once per synodic period: the launch window. Orbits drawn as circles in one plane; real orbits are slightly tilted ellipses.",
  sandbox: "Stack your own rocket and fly it. Bigger tanks carry more fuel but weigh more; more engines give more thrust; boosters help at liftoff; an upper stage lets you drop the heavy first stage. Can you reach orbit (lowest point above 120 km)? This is a simplified 2D flight: in it, fins only add mass and drag. Real rockets mostly steer by swiveling their engines."
};
const EVENT_WORDS = {
  pad: "Thrust is less than weight: the rocket stays on the pad.",
  orbit: "In orbit!",
  low: `Orbit too low: its lowest point is under ${ORBIT_OK_KM} km, so air drag would soon bring it down.`,
  suborbital: "Not fast enough sideways: it falls back to Earth.",
  escape: "Escaped Earth's gravity!"
};
function flightLines(sim) {
  const r = sim.result, out = [EVENT_WORDS[r.kind]];
  if (r.kind === "pad") return out;
  if (r.kind === "orbit" || r.kind === "low") out.push(`Orbit: ${kmF(Math.max(0, r.periKm))} \u00d7 ${kmF(r.apoKm)} (lowest \u00d7 highest)`);
  else if (r.kind === "suborbital") out.push(`Highest point: ${kmF(r.maxKm)}`);
  out.push(`Top speed: ${kms(r.vMax)}`);
  out.push(`Lost to gravity: ${kms(r.gravLoss, 2)}, to drag: ${kms(r.dragLoss, 2)}`);
  out.push("Real rockets lose about 0.1 to 0.15 km/s to drag; this model is simplified.");
  out.push(`Ideal \u0394v (no gravity, no air, vacuum Isp): ${kms(r.ideal)}`);
  return out;
}
function readout() {
  const m = st.mode, v = shown(m, m === "sandbox" ? sandboxCfg() : st[m]);
  if (m === "thrust") {
    const lines = [`F = \u1e41v\u2091 = ${sig(v.mdot)} kg/s \u00d7 ${sig(v.ve, 4)} m/s = ${force(v.F)}`, `Weight W = mg = ${force(v.W)}`, `Thrust-to-weight F/W = ${sig(v.twr)}`];
    lines.push(v.accel !== null ? `Lifts off, starting acceleration (F \u2212 W)/m = ${sig(v.accel, 2)} m/s\u00b2` : v.twr > 1 ? "F is just above W: it creeps off the pad" : "F < W: stays on the pad");
    lines.push(`Isp = v\u2091/g\u2080 = ${sig(v.isp)} s`);
    return lines.join("\n");
  }
  if (m === "equation") {
    const e = ENGINES[st.equation.engine];
    return [`${e.name}: Isp = ${e.ispVac} s (vacuum)`, `v\u2091 = g\u2080\u00b7Isp = ${sig(v.ve, 4)} m/s`, `\u0394v = v\u2091 ln(m\u2080/m_f) = ${kms(v.dv)}`,
      `Fuel is ${sig(v.propPct)}% of the liftoff mass`, `Low Earth orbit needs about ${LEO_DV / 1000} km/s: mass ratio ${sig(massRatioFor(LEO_DV, v.ve))} with this engine`].join("\n");
  }
  if (m === "staging") {
    return [`One stage: mass ratio ${sig(v.r1)}, \u0394v = ${kms(v.dv1)}`, `Two stages: mass ratio ${sig(v.r2)} each, \u0394v = ${kms(v.dv2)}`,
      `Staging adds ${kms(v.gain)} (${sig(v.gainPct, 2)}% more)`,
      `Orbit needs about ${LEO_DV / 1000} km/s: one stage ${v.dv1 >= LEO_DV ? "makes it" : "falls short"}, two stages ${v.dv2 >= LEO_DV ? "make it" : "fall short"}`].join("\n");
  }
  if (m === "launch") {
    const sim = flight(LAUNCH_PRESET, st.launch.kick);
    return [...flightLines(sim), "", `At h = ${kmF(v.alt)}: v = \u221a(GM/r) = ${kms(v.vOrb)}`, `One orbit takes ${sig(v.periodMin)} min, gravity there is ${sig(v.g)} m/s\u00b2`].join("\n");
  }
  if (m === "orbits") {
    const k = orbitShot(st.orbits.alt, st.orbits.speed);
    const lines = [`v = ${kms(v.v)}`, `Circular speed \u221a(GM/r) = ${kms(v.vc)}`, `Escape speed \u221a(2GM/r) = ${kms(v.ve)}`];
    if (k.kind === "escape") lines.push("v \u2265 escape speed: it leaves Earth for good");
    else if (k.kind === "falls") lines.push("Too slow: it falls back and hits Earth");
    else if (k.kind === "orbit" && k.far) lines.push("Nearly escape speed: a huge ellipse, highest point very far away");
    else if (k.kind === "orbit") lines.push(`Orbit: highest point ${kmF(v.apoKm)}, one lap ${sig(v.periodMin)} min`);
    else lines.push(v.periKm !== null ? `Slower than circular: ellipse dips to ${kmF(v.periKm)}, one lap ${sig(v.periodMin)} min` : "Slower than circular: it dips into the air and comes down");
    return lines.join("\n");
  }
  if (m === "hohmann") {
    const P = hohmannPlan(st.hohmann.target, st.hohmann.park), name = PLANETS[st.hohmann.target].name;
    return [`Trip time: ${days(v.days)} (${sig(v.days / 30.44, 2)} months)`, `Burn 1 (leave Earth's orbit around the Sun): ${kms(v.dv1)}`,
      `Burn 1 from a ${kmF(v.park)} parking orbit: ${kms(v.dvDepart)}`, `Burn 2 (match ${name}'s orbit): ${kms(v.dv2)}`,
      `At launch ${name} must be ${sig(v.phase)}\u00b0 ${P.phaseDeg >= 0 ? "ahead of" : "behind"} Earth`,
      `Launch windows repeat every ${days(v.synodicDays)} (${sig(v.synodicDays / 365.25, 3)} years)`].join("\n");
  }
  const s = st.sandbox, b = buildRocket(sandboxCfg());
  const lines = [`Liftoff mass: ${tonnes(v.m0)}`, `Thrust at liftoff: ${force(b.F0)}`, `Thrust-to-weight: ${sig(v.twr0)}`, `Ideal \u0394v: ${kms(v.ideal)}`];
  if (s.flying) lines.push("", ...flightLines(flight(sandboxCfg(), s.kick)));
  else lines.push("", "Press Launch to fly.");
  return lines.join("\n");
}

function setMode(m) {
  st.mode = m;
  for (const b of $$(".toolbar .tool")) b.setAttribute("aria-pressed", String(b.dataset.show === m));
  if (m === "launch") restartFlight();
  buildControls(); sync();
}
function writeUrl() {
  const p = new URLSearchParams(location.search);
  p.set("mode", st.mode);
  history.replaceState(null, "", "?" + p.toString());
}
for (const b of $$(".toolbar .tool")) b.addEventListener("click", () => setMode(b.dataset.show));
function sync() {
  $("panelTitle").textContent = TITLES[st.mode];
  for (const el of $$("[data-slider]")) {
    const k = el.dataset.slider, v = get(k);
    el.value = String(toSlider(k, v));
    const out = $$(`[data-out="${k}"]`)[0]; if (out) out.textContent = sliderText[k](v);
  }
  for (const b of $$("[data-choice]")) if (b._on) b.setAttribute("aria-pressed", String(b._on()));
  const r = readout();
  $("readout").textContent = r;
  $("note").textContent = NOTES[st.mode];
  sc.setAttribute("aria-label", TITLES[st.mode] + ". " + r.replace(/\n+/g, ". "));
  writeUrl();
  dirty = true;
}

// ---------- drawing ----------
const sc = $("scene"), ctx = sc.getContext("2d");
let dpr = Math.min(2, window.devicePixelRatio || 1);
const size = { w: 1, h: 1 };
function resize() {
  const a = sc.getBoundingClientRect();
  const w = Math.max(1, Math.round(a.width)), h = Math.max(1, Math.round(a.height));
  if (w !== size.w || h !== size.h) { size.w = w; size.h = h; sc.width = Math.round(w * dpr); sc.height = Math.round(h * dpr); dirty = true; }
}
let clock = 0;
function draw() {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = T.sky; ctx.fillRect(0, 0, size.w, size.h);
  const m = st.mode;
  if (m === "thrust") drawThrust();
  else if (m === "equation") drawEquation();
  else if (m === "staging") drawStaging();
  else if (m === "launch") { stars(ctx, size.w, size.h, T); drawFlight(ctx, size.w, size.h, T, img, LAUNCH_PRESET, flight(LAUNCH_PRESET, st.launch.kick), play.t); }
  else if (m === "orbits") { stars(ctx, size.w, size.h, T); drawOrbitScene(ctx, size.w, size.h, T, img, orbitShot(st.orbits.alt, st.orbits.speed), reducedMotion ? null : (clock / 8) % 1); }
  else if (m === "hohmann") { stars(ctx, size.w, size.h, T); const P = hohmannPlan(st.hohmann.target, st.hohmann.park); drawHohmann(ctx, size.w, size.h, T, img, P, st.hohmann.target, st.hohmann.t, P.phaseDeg * Math.PI / 180); }
  else drawSandbox();
}
/** Rocket on the pad. Returns where it stands. */
function padScene(cfg, lift, flame, maxH) {
  const W = size.w, H = size.h, deck = H * 0.86;
  const R0 = 1100 + (cfg.upper ? 440 : 0) + (cfg.tank === "large" ? 240 : cfg.tank === "small" ? -220 : 0);
  const s = Math.min((W * 0.95) / 1024, (deck - 16) / Math.max(PAD.deckY - PAD.towerTop, R0 * 0.85) * (maxH || 1));
  const cx = W * 0.5;
  drawPad(ctx, img, cx, deck, s);
  const y = deck - lift;
  drawRocket(ctx, img, T, cfg, cx, y, s * 0.85, { flame });
  return { cx, y, s: s * 0.85, deck };
}
const THRUST_ROCKET = { top: "ogive", upper: false, tank: "medium", engine: "single", boosters: 0, fins: true, payload: 1 };
function drawThrust() {
  const v = shown("thrust", st.thrust), H = size.h;
  let lift = 0;
  if (v.twr > 1) {
    const a = (v.twr - 1) * G0, cyc = reducedMotion ? 1.5 : clock % 4;
    lift = Math.min(H * 0.35, 0.5 * a * cyc * cyc * 2.5);
  }
  const flame = Math.max(0.15, Math.min(1, 0.25 + 0.75 * Math.log10(v.F / 1e4) / 3.5));
  const P = padScene(THRUST_ROCKET, lift, flame, 0.8);
  const big = Math.max(v.F, v.W), L = H * 0.3;
  const midY = P.y - 600 * P.s, ax = P.cx + 240 * P.s * 0.5 + 34;
  arrow(ctx, ax, midY, ax, midY - L * v.F / big, T.thrust, 4, 12);
  arrow(ctx, ax + 18, midY, ax + 18, midY + L * v.W / big, T.weight, 4, 12);
  text(ctx, T, `thrust ${force(v.F)}`, ax + 30, midY - L * v.F / big + 12, "left", T.thrust, 13, true);
  text(ctx, T, `weight ${force(v.W)}`, ax + 30, midY + L * v.W / big, "left", T.weight, 13, true);
  // third law pair: the rocket pushes the exhaust down, the exhaust pushes the rocket up
  arrow(ctx, P.cx, P.y + 8, P.cx, P.y + 8 + Math.min(70, L * 0.45), T.weight, 3, 10);
  text(ctx, T, "rocket pushes exhaust down; exhaust pushes rocket up", 12, 44, "left", T.ink, 12);
  text(ctx, T, v.twr > 1 ? "Lifts off" : "Stays on the pad", 12, 24, "left", T.ink, 15, true);
}
function drawEquation() {
  const v = shown("equation", st.equation), W = size.w, H = size.h, narrow = W < 560;
  // mass bar: fuel vs everything else
  const bx = 24, by = 50, bw = narrow ? 44 : 64, bh = H - 120, fuel = v.propPct / 100;
  ctx.fillStyle = T.thrust; ctx.globalAlpha = 0.35; ctx.fillRect(bx, by, bw, bh * fuel); ctx.globalAlpha = 1;
  ctx.fillStyle = T.grid; ctx.fillRect(bx, by + bh * fuel, bw, bh * (1 - fuel));
  ctx.strokeStyle = T.ink; ctx.lineWidth = 1.5; ctx.strokeRect(bx, by, bw, bh);
  text(ctx, T, "liftoff mass", bx, by - 24, "left", T.ink, 12, true);
  text(ctx, T, `fuel ${sig(v.propPct, 2)}%`, bx, by - 8, "left", T.thrust, 12, true);
  text(ctx, T, "rest", bx + 4, by + bh - 6, "left", T.ink, 12);
  // graph of delta-v against mass ratio
  const gx = bx + bw + 64, gy = 40, gw = W - gx - 18, gh = H - 110;
  const ve = v.ve, ymax = 14;
  const A = axes(ctx, T, gx, gy, gw, gh, { min: 1.1, max: 20, log: true, ticks: [2, 5, 10, 20] }, { min: 0, max: ymax, ticks: [0, 2, 4, 6, 8, 10, 12, 14] },
    { x: "mass ratio m\u2080/m_f (log scale)", y: "\u0394v (km/s)" });
  for (const id of EQ_ENGINES) {
    const e = ENGINES[id], vv = veFromIsp(e.ispVac), pts = [];
    for (let i = 0; i <= 200; i++) { const R = 1.1 * (20 / 1.1) ** (i / 200), dv = vv * Math.log(R) / 1000; if (dv <= ymax) pts.push([A.fx(R), A.fy(dv)]); }
    const on = id === st.equation.engine;
    line(ctx, pts, on ? T.thrust : T.dim, on ? 3 : 1.5, on ? null : [5, 4]);
    const last = pts[pts.length - 1];
    text(ctx, T, `Isp ${e.ispVac} s`, last[0] - 4, last[1] - 6, "right", on ? T.thrust : T.dim, 12, on);
  }
  line(ctx, [[gx, A.fy(LEO_DV / 1000)], [gx + gw, A.fy(LEO_DV / 1000)]], T.weight, 1.5, [6, 4]);
  text(ctx, T, "about what orbit needs", gx + 6, A.fy(LEO_DV / 1000) - 6, "left", T.weight, 12, true);
  const dvk = Math.min(ymax, v.dv / 1000);
  disc(ctx, A.fx(v.ratio), A.fy(dvk), 6, T.thrust, T.ink);
}
function drawStaging() {
  const v = shown("staging", st.staging), W = size.w, H = size.h;
  const top = 64, bh = H - 170, colW = Math.min(90, W * 0.14);
  const draw1 = (x, label, segs) => {
    let y = top;
    for (const sgm of segs) {
      const h = bh * sgm.f;
      ctx.fillStyle = sgm.c; ctx.globalAlpha = sgm.a ?? 1; ctx.fillRect(x, y, colW, h); ctx.globalAlpha = 1;
      ctx.strokeStyle = T.ink; ctx.lineWidth = 1; ctx.strokeRect(x, y, colW, h);
      y += h;
    }
    text(ctx, T, label, x + colW / 2, top - 12, "center", T.ink, 13, true);
  };
  const p = v.payloadPct / 100, e = v.structPct / 100;
  // one stage: payload, structure, fuel (top to bottom)
  const st1 = e * (1 - p);
  draw1(20, "1 stage", [{ f: p, c: T.weight }, { f: st1, c: T.dim, a: 0.6 }, { f: 1 - p - st1, c: T.thrust, a: 0.35 }]);
  const pi = Math.sqrt(p), m2 = pi, s2 = e * (m2 - p), f2 = m2 - p - s2, s1 = e * (1 - m2), f1 = 1 - m2 - s1;
  draw1(40 + colW, "2 stages", [{ f: p, c: T.weight }, { f: s2, c: T.dim, a: 0.6 }, { f: f2, c: T.thrust, a: 0.35 }, { f: s1, c: T.dim, a: 0.6 }, { f: f1, c: T.thrust, a: 0.35 }]);
  const lx = 20, ly = top + bh + 22;
  for (const [i, [c, a, t]] of [[T.weight, 1, "payload"], [T.dim, 0.6, "structure"], [T.thrust, 0.35, "fuel"]].entries()) {
    ctx.fillStyle = c; ctx.globalAlpha = a; ctx.fillRect(lx + i * 100, ly - 10, 14, 14); ctx.globalAlpha = 1;
    text(ctx, T, t, lx + i * 100 + 20, ly + 2, "left", T.ink, 12);
  }
  // delta-v bars
  const gx = 60 + 2 * colW + 50, gw = W - gx - 20, gy = top, gh = bh;
  if (gw > 80) {
    const vmax = Math.max(14, v.dv2 / 1000 * 1.1);
    const A = axes(ctx, T, gx, gy, gw, gh, { min: 0, max: 1 }, { min: 0, max: vmax, ticks: [0, 4, 8, 12, 16, 20].filter((t) => t <= vmax) }, { y: "\u0394v (km/s)" });
    const bw = gw * 0.28;
    for (const [i, dv, lab] of [[0, v.dv1, "1 stage"], [1, v.dv2, "2 stages"]]) {
      const x = gx + gw * (0.12 + i * 0.48), y = A.fy(dv / 1000);
      ctx.fillStyle = T.thrust; ctx.globalAlpha = i ? 0.9 : 0.5; ctx.fillRect(x, y, bw, gy + gh - y); ctx.globalAlpha = 1;
      text(ctx, T, kms(dv), x + bw / 2, y - 6, "center", T.ink, 13, true);
      text(ctx, T, lab, x + bw / 2, gy + gh + 16, "center", T.ink, 12);
    }
    line(ctx, [[gx, A.fy(LEO_DV / 1000)], [gx + gw, A.fy(LEO_DV / 1000)]], T.weight, 1.5, [6, 4]);
    text(ctx, T, "orbit", gx + gw - 4, A.fy(LEO_DV / 1000) - 6, "right", T.weight, 12, true);
  }
}
function drawSandbox() {
  const s = st.sandbox, cfg = sandboxCfg();
  if (s.flying) {
    stars(ctx, size.w, size.h, T);
    const sim = flight(cfg, s.kick);
    if (sim.result.kind === "pad") { padScene(cfg, 0, 0.5, 1); text(ctx, T, "Thrust < weight: no liftoff", 12, 24, "left", T.ink, 15, true); return; }
    drawFlight(ctx, size.w, size.h, T, img, cfg, sim, play.t);
    return;
  }
  const P = padScene(cfg, 0, 0, 1);
  text(ctx, T, "On the pad", 12, 24, "left", T.ink, 15, true);
  const b = buildRocket(cfg);
  text(ctx, T, `thrust/weight ${sig(b.twr0)}`, 12, 44, "left", b.twr0 > 1 ? T.ink : T.thrust, 13);
  void P;
}

// ---------- loop ----------
let last = 0;
function animating() {
  const m = st.mode;
  if (reducedMotion) return false;
  if (m === "thrust") return shown("thrust", st.thrust).twr > 1;
  if (m === "orbits") return true;
  if (m === "hohmann") return st.hohmann.playing;
  if (m === "launch" || (m === "sandbox" && st.sandbox.flying)) return play.t < 4000;
  return false;
}
function frame(now) {
  const dt = last ? Math.min(0.1, (now - last) / 1000) : 0; last = now;
  if (animating()) {
    clock += dt; dirty = true;
    if (st.mode === "launch" || st.mode === "sandbox") play.t += dt * 90;
    if (st.mode === "hohmann") {
      const P = hohmannPlan(st.hohmann.target, st.hohmann.park);
      st.hohmann.t = Math.min(P.tTransfer, st.hohmann.t + dt * P.tTransfer / 8);
      if (st.hohmann.t >= P.tTransfer) st.hohmann.playing = false;
    }
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
if (reducedMotion) document.documentElement.classList.add("reduced-motion");
window.addEventListener("resize", () => { dpr = Math.min(2, window.devicePixelRatio || 1); size.w = 0; resize(); dirty = true; });
new ResizeObserver(() => { resize(); dirty = true; }).observe(sc);
setMode(MODES.includes(st.mode) ? st.mode : "thrust");
requestAnimationFrame(frame);
// Read-only hook for the browser checks.
window.__rocket = { state: st, shown: () => shown(st.mode, st.mode === "sandbox" ? sandboxCfg() : st[st.mode]), finish: () => { play.t = 1e9; dirty = true; } };
void R_EARTH; void TARGET_KM; void DROP_KM;
