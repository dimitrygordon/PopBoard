// Rocket & Mission "Mars Lander" mode: fly Leo's lander down to the pad.
// Loaded by study-rocket-mission.html when ?mode=mars-lander. The other modes (rocket-ui.js) are untouched.
// Model: ml-model.js. Drawing: ml-scene.js.
import { forwardStudyQuery, moduleOpenHref } from "../../board-return.js?v=20261022a";
import {
  MODULE_ID, BODIES, LANDER, LIMITS, FUN, SANDBOX, NOT_TO_SCALE, MODEL_NOTE, GOALS, PAD,
  missionConfig, sandboxConfig, createLander, stepOnce, fly, altitude, groundAt, fuelFrac, mass, twr, headline, clamp, DT
} from "./ml-model.js";
import { createScene, CAPTION_GAP } from "./ml-scene.js";
import {
  initFun, pressFeedback, smoothTheme, prefers, challengeCard, disclosure, createChallenges, createStreak,
  TIERS, bottomSheet, celebrate, tick, sound, buzz
} from "../../shared/fun/fun-ui.js";

const THEME_KEY = "popboard.rocket.lander.theme";
const root = document.documentElement;
const phone = matchMedia("(max-width: 600px)"), wide = matchMedia("(min-width: 900px)");
const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
const el = (tag, props = {}, ...kids) => { const n = Object.assign(document.createElement(tag), props); n.append(...kids); return n; };
const f1 = (v) => (Math.abs(v) < 0.05 ? "0.0" : v.toFixed(1));
initFun(); pressFeedback();

// ---------- DOM (the other modes' nodes stay in the page, hidden by lander-theme.css) ----------
const shell = el("div", { className: "ml-root" });
shell.innerHTML = `
<h1 class="sr-only">Mars Lander</h1>
<p class="sr-only">Fly a lander down to a pad on Mars. Press and hold to fire the engine, drag sideways to tilt. Touch down slowly and upright on the pad.</p>
<header class="ml-hud">
  <button id="mlBack" class="ml-back" type="button" aria-label="Back to Study library">
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>
    <span class="back-label">Back</span>
  </button>
  <p class="ml-title">Mars Lander</p>
  <button id="mlHelp" type="button" class="fun-help" aria-label="About this model" aria-haspopup="dialog">?</button>
  <button id="mlSound" type="button" aria-pressed="false" aria-label="Sound is off">Sound</button>
  <button id="mlTheme" type="button"><span id="mlThemeLabel">Paper</span></button>
</header>
<section class="ml-status" id="mlStatus" aria-live="polite">
  <p class="ml-big" id="mlBig"></p>
  <dl class="ml-gauges">
    <div><dt>Altitude</dt><dd id="mlAlt"></dd></div>
    <div><dt>Down</dt><dd id="mlVy"></dd></div>
    <div><dt>Sideways</dt><dd id="mlVx"></dd></div>
    <div class="ml-fuel"><dt>Fuel</dt><dd><span class="ml-bar"><span id="mlFuelBar"></span></span><span id="mlFuel"></span></dd></div>
  </dl>
</section>
<main class="ml-stage" id="mlStage">
  <canvas id="mlScene" role="img" tabindex="0" aria-label="Mars lander"></canvas>
  <p class="ml-cap" id="mlCapLander" hidden><b>Lander</b><br>Four legs with wide footpads, engine underneath.</p>
  <p class="ml-cap" id="mlCapPad" hidden><b>Landing pad</b><br>Put both footpads on the slab.</p>
  <p class="ml-scale" id="mlScale"></p>
</main>
<div class="ml-funbox" id="mlFunBox"></div>
<section class="ml-controls" id="mlControls" aria-label="Lander controls">
  <button type="button" class="fun-handle" id="mlHandle" aria-label="Resize controls"></button>
  <p class="ml-toast" id="mlToast" role="status" aria-live="polite" hidden></p>
  <div class="ml-tabs" role="tablist" aria-label="Mode">
    <button type="button" role="tab" data-mode="mission" aria-selected="true">Mission</button>
    <button type="button" role="tab" data-mode="sandbox" aria-selected="false">Sandbox</button>
  </div>
  <div id="mlBody" class="ml-body"></div>
  <p class="ml-link-row"><a id="mlRocketLink" href="study-rocket-mission.html">Rocket Science</a> has thrust, staging and the trip to Mars.</p>
</section>
<div class="ml-about-wrap" id="mlAbout" hidden>
  <section class="ml-about" role="dialog" aria-modal="true" aria-labelledby="mlAboutTitle">
    <p class="ml-about-title" id="mlAboutTitle">About Mars Lander</p>
    <p>Press and hold the scene or Fire to run the engine. Drag sideways while you hold to tilt, or use the arrow keys and Space.</p>
    <p class="ml-small" id="mlAboutNote"></p>
    <p class="ml-small" id="mlAboutRules"></p>
    <button type="button" id="mlAboutOk" class="primary">Got it</button>
  </section>
</div>`;
document.body.append(shell);
const $ = (id) => document.getElementById(id);
$("mlScale").textContent = NOT_TO_SCALE;
$("mlAboutNote").textContent = MODEL_NOTE;
$("mlAboutRules").textContent = `A safe touchdown is ${LIMITS.safeV} m/s or slower going down, ${LIMITS.sideV} m/s or slower sideways and within ${LIMITS.tilt}\u00b0 of upright. Gold: ${LIMITS.softV} m/s or slower on the pad with 60% of the fuel left. Medals count in Mission mode.`;
$("mlRocketLink").href = moduleOpenHref("study-rocket-mission.html", location.search);

// ---------- theme, sound, back, about ----------
const canvas = $("mlScene"), scene = createScene(canvas);
function syncTheme() {
  const light = root.getAttribute("data-theme") === "light";
  $("mlThemeLabel").textContent = light ? "Dark" : "Paper";
  $("mlTheme").setAttribute("aria-label", light ? "Switch to the dark theme" : "Switch to the Paper theme");
  document.querySelector('meta[name="color-scheme"]')?.setAttribute("content", light ? "light" : "dark");
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", light ? "#f3efe4" : "#14100f");
  scene.setTheme(light ? "light" : "dark");
}
function setTheme(t) { root.setAttribute("data-theme", t === "light" ? "light" : "dark"); store.set(THEME_KEY, root.getAttribute("data-theme")); syncTheme(); }
$("mlTheme").addEventListener("click", () => { smoothTheme(); setTheme(root.getAttribute("data-theme") === "light" ? "dark" : "light"); });
syncTheme();
function syncSound() { $("mlSound").setAttribute("aria-pressed", String(sound.on)); $("mlSound").setAttribute("aria-label", sound.on ? "Sound is on" : "Sound is off"); }
$("mlSound").addEventListener("click", () => { sound.on = !sound.on; syncSound(); if (sound.on) tick(660); });
syncSound();
$("mlBack").addEventListener("click", (e) => {
  e.preventDefault();
  const qs = forwardStudyQuery(location.search).toString();
  history.replaceState(null, "", qs ? "?" + qs : location.pathname);
  location.href = "study.html" + location.search;
});
const openAbout = () => { $("mlAbout").hidden = false; $("mlAboutOk").focus(); };
const closeAbout = () => { $("mlAbout").hidden = true; $("mlHelp").focus(); };
$("mlHelp").addEventListener("click", openAbout);
$("mlAboutOk").addEventListener("click", closeAbout);

// ---------- fun layer ----------
const chip = el("button", { type: "button", className: "fun-chip", id: "mlChip" });
const pop = el("section", { id: "mlCard", className: "fun-pop" });
$("mlFunBox").append(chip, pop);
const card = challengeCard(pop, GOALS);
disclosure(chip, pop, false);
const engine = createChallenges({ moduleId: MODULE_ID, goals: GOALS, onEarn: (g) => { card.flash(g.tier); toast(`${g.tier[0].toUpperCase() + g.tier.slice(1)} medal: ${g.title}`); } });
const streak = createStreak({ moduleId: MODULE_ID });
function chipSync() {
  const earned = engine.earned(), top = TIERS.filter((t) => earned.includes(t)).pop();
  chip.replaceChildren();
  if (top) chip.appendChild(el("span", { className: "fun-medal fun-badge " + top }));
  chip.append(`${top ? top[0].toUpperCase() + top.slice(1) : "Challenges"} ${earned.length}/${GOALS.length}`);
  chip.setAttribute("aria-label", `Challenges: ${earned.length} of ${GOALS.length} medals earned. Show list`);
  card.update(earned);
}
chipSync(); card.streak(0, streak.best);
// Toasts live in the control panel, never on top of the stage.
function toast(msg) { const t = $("mlToast"); t.textContent = msg; t.hidden = false; clearTimeout(toast._t); toast._t = setTimeout(() => { t.hidden = true; sheet?.layout(); requestFit(); }, 2600); sheet?.layout(); requestFit(); }

// ---------- state ----------
let mode = "mission", paused = false;
const sand = { body: "mars", thrust: LANDER.thrust, fuel: LANDER.fuel, alt: 170, infinite: false, air: true };
const cfg = () => (mode === "sandbox" ? sandboxConfig(sand) : missionConfig());
let L = createLander(cfg());
function reset() { L = createLander(cfg()); scene.panTo(false, true); sync(); }
function start() { if (L.state !== "ready") reset(); L.state = "flying"; tick(520); sync(); }
function setFiring(v) {
  if (v && L.state === "ready") start();
  L.firing = !!v && L.state === "flying";
}

// ---------- readout and gauges ----------
function readout() {
  const alt = Math.max(0, altitude(L)), down = -L.vy, ff = fuelFrac(L);
  $("mlBig").textContent = headline(L) + (paused && L.state === "flying" ? ", paused" : "");
  $("mlAlt").textContent = `${alt.toFixed(0)} m`;
  $("mlVy").textContent = `${f1(down)} m/s`;
  $("mlVx").textContent = `${f1(Math.abs(L.vx))} m/s ${L.vx > 0.05 ? "right" : L.vx < -0.05 ? "left" : ""}`.trim();
  const fast = L.state === "flying" && down > LIMITS.safeV, slide = L.state === "flying" && Math.abs(L.vx) > LIMITS.sideV;
  $("mlVy").classList.toggle("warn", fast); $("mlVx").classList.toggle("warn", slide);
  $("mlFuel").textContent = L.cfg.infinite ? "Endless" : `${Math.round(ff * 100)}%`;
  $("mlFuelBar").style.width = `${Math.round(ff * 100)}%`;
  $("mlFuelBar").classList.toggle("low", ff < 0.2);
  canvas.setAttribute("aria-label", `Mars lander. ${headline(L)}. Altitude ${alt.toFixed(0)} metres, falling ${f1(down)} metres per second, fuel ${Math.round(ff * 100)} percent.`);
}
function finish() {
  const r = L.result;
  // Pan down so the terrain fills the lower third of the stage (snap with reduced motion).
  scene.panTo(true, prefers.reducedMotion, groundAt(L.x));
  if (L.state === "landed") {
    tick(880); celebrate();
    toast(r.onPad ? `Touchdown at ${r.down.toFixed(1)} m/s on the pad` : `Safe, but ${Math.abs(L.x - PAD.x).toFixed(0)} m from the pad`);
  } else {
    scene.puff(L.x, L.y - LANDER.h * 0.3, true); buzz(40); tick(160);
    toast(r.why === "fast" ? `Hit at ${r.down.toFixed(1)} m/s. Safe is ${LIMITS.safeV} m/s or less.` : r.why === "sideways" ? `Sliding ${Math.abs(r.side).toFixed(1)} m/s sideways. Safe is ${LIMITS.sideV} m/s or less.` : `Tilted ${Math.abs(r.tilt).toFixed(0)}\u00b0. Stay within ${LIMITS.tilt}\u00b0 of upright.`);
  }
  if (mode === "mission" && engine.report({ type: "landing", ...r }).length) { chipSync(); celebrate(); }
  renderMode();
}

// ---------- controls ----------
const body = $("mlBody");
for (const t of document.querySelectorAll(".ml-tabs [role=tab]")) t.addEventListener("click", () => setMode(t.dataset.mode));
function setMode(m) {
  m = m === "sandbox" ? "sandbox" : "mission";
  if (m === mode) return;
  mode = m;
  for (const t of document.querySelectorAll(".ml-tabs [role=tab]")) t.setAttribute("aria-selected", String(t.dataset.mode === mode));
  L = createLander(cfg()); scene.panTo(false, true);
  toast(mode === "mission" ? "Mission: land on the pad" : "Sandbox: change the world and the lander");
  sync();
}
const btn = (label, on, cls = "", aria) => { const b = el("button", { type: "button", textContent: label, className: cls }); if (aria) b.setAttribute("aria-label", aria); b.addEventListener("click", on); return b; };
const pressed = (b, v) => { b.setAttribute("aria-pressed", String(!!v)); return b; };
function slider(id, label, spec, get, set, fmt) {
  const out = el("output", { id: id + "Out", textContent: fmt(get()) });
  const input = el("input", { type: "range", id, min: spec.min, max: spec.max, step: spec.step, value: get() }); input.setAttribute("aria-label", label);
  input.addEventListener("input", () => { set(+input.value); out.textContent = fmt(get()); reset(); });
  return el("label", { className: "ml-row ml-slider" }, el("span", { className: "dim", textContent: label }), input, out);
}
function fireButton() {
  const b = el("button", { type: "button", className: "ml-fire", id: "mlFire", textContent: "Hold to fire" });
  b.setAttribute("aria-label", "Fire the engine while held");
  const off = () => { setFiring(false); b.classList.remove("on"); };
  b.addEventListener("pointerdown", (e) => { e.preventDefault(); b.setPointerCapture?.(e.pointerId); setFiring(true); b.classList.add("on"); });
  b.addEventListener("pointerup", off); b.addEventListener("pointercancel", off); b.addEventListener("lostpointercapture", off);
  b.addEventListener("keydown", (e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); setFiring(true); } });
  b.addEventListener("keyup", (e) => { if (e.key === " " || e.key === "Enter") off(); });
  return b;
}
function tiltRow() {
  return el("div", { className: "ml-row ml-tilt", role: "group", ariaLabel: "Tilt" },
    btn("Tilt left", () => { L.tiltTarget = clamp(L.tiltTarget - 10, -LANDER.maxTilt, LANDER.maxTilt); }, "", "Tilt 10 degrees left"),
    btn("Upright", () => { L.tiltTarget = 0; }, "", "Back to upright"),
    btn("Tilt right", () => { L.tiltTarget = clamp(L.tiltTarget + 10, -LANDER.maxTilt, LANDER.maxTilt); }, "", "Tilt 10 degrees right"));
}
function flightRow() {
  const done = L.state === "landed" || L.state === "crashed";
  return el("div", { className: "ml-row" },
    btn(L.state === "ready" ? "Start descent" : done ? "Try again" : "Restart", () => (L.state === "ready" ? start() : reset()), L.state === "flying" ? "" : "primary"),
    pressed(btn(paused ? "Play" : "Pause", () => { paused = !paused; renderMode(); readout(); }, "", paused ? "Play" : "Pause"), false));
}
function renderMode() {
  body.replaceChildren();
  if (mode === "mission") {
    const done = L.state === "landed" || L.state === "crashed";
    const msg = done ? resultText() : L.state === "ready"
      ? "Hold to fire and slow your fall. Drag sideways while you hold to tilt toward the pad."
      : `Get below ${LIMITS.safeV} m/s going down before you touch the ground.`;
    body.append(el("p", { className: done ? "ml-result" : "dim", textContent: msg }), fireButton(), tiltRow(), flightRow());
  } else {
    const world = el("div", { className: "ml-row ml-worlds", role: "group", ariaLabel: "World" }, ...Object.keys(BODIES).map((k) =>
      pressed(btn(BODIES[k].name, () => { sand.body = k; reset(); }, "", `Land on ${BODIES[k].name}`), sand.body === k)));
    const c = cfg(), w = twr(c, BODIES[c.body].g);
    body.append(
      el("p", { className: "dim", textContent: `Any world, any engine. Thrust to weight ${w.toFixed(2)}: ${w > 1 ? "the engine can stop your fall." : "too weak to stop the fall here."}` }),
      world,
      slider("mlThrust", "Thrust", SANDBOX.thrust, () => sand.thrust, (v) => { sand.thrust = v; }, (v) => `${(v / 1000).toFixed(1)} kN`),
      slider("mlFuelS", "Fuel", SANDBOX.fuel, () => sand.fuel, (v) => { sand.fuel = v; }, (v) => `${v} kg`),
      slider("mlStart", "Start height", SANDBOX.alt, () => sand.alt, (v) => { sand.alt = v; }, (v) => `${v} m`),
      el("div", { className: "ml-row" },
        pressed(btn("Endless fuel", () => { sand.infinite = !sand.infinite; reset(); }), sand.infinite),
        pressed(btn("Air", () => { sand.air = !sand.air; reset(); }, "", "Air drag"), sand.air)),
      fireButton(), tiltRow(), flightRow());
    if (L.state === "landed" || L.state === "crashed") body.insertBefore(el("p", { className: "ml-result", textContent: resultText() }), body.firstChild);
  }
  sheet?.layout(); requestFit();
}
function resultText() {
  const r = L.result;
  const speeds = `${r.down.toFixed(1)} m/s down, ${Math.abs(r.side).toFixed(1)} m/s sideways, ${Math.round(r.fuelFrac * 100)}% fuel left.`;
  if (L.state === "crashed") return `${headline(L)}. ${speeds}`;
  return `${headline(L)}. ${speeds}${mode === "mission" && r.onPad && !(r.soft && r.fuelFrac >= FUN.goldFuel) ? " Gold needs a softer touchdown with more fuel left." : ""}`;
}

// ---------- captions (12px under each piece of art) ----------
function placeCaptions() {
  const show = L.state === "ready";
  const lc = $("mlCapLander"), pc = $("mlCapPad");
  lc.hidden = pc.hidden = !show;
  if (!show) return;
  const lr = scene.landerRect(L), pr = scene.padRect();
  for (const [cap, r] of [[lc, lr], [pc, pr]]) {
    const w = cap.offsetWidth, x = clamp(r.x, 8 + w / 2, innerWidth - 8 - w / 2);
    cap.style.left = Math.round(x) + "px"; cap.style.top = Math.round(r.bottom + CAPTION_GAP) + "px";
  }
}

// ---------- input: hold the scene to fire, drag sideways to tilt ----------
let gesture = null;
canvas.addEventListener("pointerdown", (e) => {
  canvas.setPointerCapture?.(e.pointerId); pop.hidden = true; chip.setAttribute("aria-expanded", "false");
  if (L.state === "landed" || L.state === "crashed") return;
  gesture = { x0: e.clientX, t0: L.tiltTarget }; setFiring(true);
});
canvas.addEventListener("pointermove", (e) => { if (gesture) L.tiltTarget = clamp(gesture.t0 + (e.clientX - gesture.x0) * 0.4, -LANDER.maxTilt, LANDER.maxTilt); });
const endGesture = () => { gesture = null; setFiring(false); };
canvas.addEventListener("pointerup", endGesture); canvas.addEventListener("pointercancel", endGesture);
addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !$("mlAbout").hidden) { closeAbout(); return; }
  if (!$("mlAbout").hidden || /INPUT|BUTTON/.test(e.target.tagName)) return;
  if (e.key === " " || e.key === "ArrowUp") { e.preventDefault(); setFiring(true); }
  if (e.key === "ArrowLeft") { e.preventDefault(); L.tiltTarget = clamp(L.tiltTarget - 10, -LANDER.maxTilt, LANDER.maxTilt); }
  if (e.key === "ArrowRight") { e.preventDefault(); L.tiltTarget = clamp(L.tiltTarget + 10, -LANDER.maxTilt, LANDER.maxTilt); }
});
addEventListener("keyup", (e) => { if (e.key === " " || e.key === "ArrowUp") setFiring(false); });

// ---------- layout: stage box and bottom sheet (opens at the half stop on phones) ----------
let sheet = null;
const snaps = () => {
  const tabs = $("mlControls").querySelector(".ml-tabs"), peek = Math.ceil(tabs.offsetHeight + 56);
  const full = Math.max(peek + 40, Math.ceil(tabs.offsetHeight + body.scrollHeight + ($("mlToast").hidden ? 0 : $("mlToast").offsetHeight + 8) + 64));
  const half = Math.min(full, Math.max(peek + 1, Math.round(innerHeight * 0.4)));
  return [peek, Math.max(peek + 1, half), Math.max(full, half + 1)];
};
// The shared bottomSheet measures its stops when it is created, so this only runs after
// renderMode() has filled the controls.
function phoneSync() {
  if (phone.matches && !sheet) { $("mlControls").classList.add("fun-sheet-on", "fun-sheet"); sheet = bottomSheet($("mlControls"), $("mlHandle"), { getSnaps: snaps, start: 1, onSnap: () => setTimeout(requestFit, 350) }); $("mlControls").dataset.snap = "half"; }
  else if (!phone.matches && sheet) { sheet.destroy(); sheet = null; $("mlControls").classList.remove("fun-sheet-on", "fun-sheet"); }
}
let fitQueued = false;
function requestFit() { if (fitQueued) return; fitQueued = true; requestAnimationFrame(() => { fitQueued = false; fit(); }); }
function fit() {
  const ctl = $("mlControls").getBoundingClientRect(), stt = $("mlStatus").getBoundingClientRect(), top = stt.bottom + 8;
  const sheetTop = phone.matches && sheet ? innerHeight - snaps()[sheet.index] : ctl.top;
  const box = wide.matches ? { x: 16, y: top, w: innerWidth - 404 - 16, h: innerHeight - top - 30 }
    : { x: 12, y: top, w: innerWidth - 24, h: Math.max(140, Math.min(innerHeight, sheetTop) - 30 - top) };
  scene.setBox(box);
  const sc = $("mlScale"); sc.style.left = box.x + "px"; sc.style.top = Math.round(box.y + box.h + 6) + "px";
  placeCaptions();
}
function layoutUI() { phoneSync(); sheet?.layout(); requestFit(); }
phone.addEventListener?.("change", layoutUI); wide.addEventListener?.("change", layoutUI);
addEventListener("resize", () => { scene.resize(); layoutUI(); });
if (typeof ResizeObserver === "function") { const ro = new ResizeObserver(() => requestFit()); ro.observe($("mlStatus")); ro.observe($("mlControls")); }
// One call that brings every piece of UI in line with the scene.
function sync() { renderMode(); readout(); requestFit(); placeCaptions(); }

// ---------- loop ----------
let last = performance.now(), acc = 0, flicker = 1;
function frame(now) {
  const real = Math.min(0.05, (now - last) / 1000); last = now;
  if (!paused && L.state === "flying") {
    acc += real;
    while (acc >= DT && L.state === "flying") { stepOnce(L); acc -= DT; }
    if (L.state !== "flying") finish();
    flicker = prefers.reducedMotion ? 1 : 0.75 + 0.25 * Math.sin(now / 37) * Math.sin(now / 53);
  }
  draw(real);
  readout();
  requestAnimationFrame(frame);
}
function draw(dt = 0) {
  const firing = L.firing && L.state === "flying" && (L.cfg.infinite || L.fuel > 0);
  scene.draw(L, { firing, flicker, alt: altitude(L), dt, guide: L.state === "ready" || L.state === "flying", lights: true });
}

// ---------- start: fill the controls first, then build the sheet so it measures its half stop ----------
scene.resize();
renderMode(); readout();
phoneSync(); fit();
layoutUI();
if (prefers.reducedMotion) toast("Reduced motion: the plume holds still.");
scene.ready.then(() => { requestFit(); requestAnimationFrame(frame); });

// Debug and screenshot hooks. Every setter goes through sync() so the panel, gauges,
// captions and stage always match the scene.
window.__lander = {
  get lander() { return L; }, get mode() { return mode; }, get view() { return scene.view; }, get sand() { return { ...sand }; },
  get sheet() { return sheet ? { index: sheet.index, snap: $("mlControls").dataset.snap } : null; }, CAPTION_GAP,
  get rects() { return { lander: scene.landerRect(L), pad: scene.padRect(), box: { ...scene.view.box }, groundY: scene.scr(L.x, groundAt(L.x)).y, pan: scene.view.pan }; },
  setMode(m) { setMode(m); }, setTheme(t) { setTheme(t); },
  setSandbox(o) { Object.assign(sand, o); if (mode !== "sandbox") setMode("sandbox"); reset(); },
  reset, start() { start(); },
  // Put the lander anywhere mid-flight (altitude above the ground under it).
  place({ x = L.x, alt, vx = L.vx, vy = L.vy, tilt = 0, fuel = L.fuel, firing = false } = {}) {
    if (L.state !== "flying") { reset(); L.state = "flying"; }
    Object.assign(L, { x, vx, vy, tilt, tiltTarget: tilt, fuel, firing });
    if (alt != null) L.y += alt - altitude(L);
    sync();
  },
  // Fly with the built-in autopilot (a clean landing) or with the engine off (a crash).
  autoland(seconds = 120) { if (L.state !== "flying") start(); fly(L, seconds); L.firing = false; if (L.state !== "flying") finish(); sync(); return L.result; },
  freefall(seconds = 60) { if (L.state !== "flying") start(); fly(L, seconds, (x) => { x.firing = false; }); if (L.state !== "flying") finish(); sync(); return L.result; },
  advance(seconds, firing = false) { if (L.state === "ready") start(); L.firing = firing; fly(L, seconds, () => {}); if (L.state !== "flying") finish(); sync(); },
  pause(v = true) { paused = !!v; sync(); }, openAbout, closeAbout, toast, layout: layoutUI, mass: () => mass(L)
};
