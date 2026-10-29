// Orbits "Solar System" mode: fling Leo's planets around a star and keep the system stable.
// Loaded by study-orbits.html when ?mode=solar-system. The playground (orbits-ui.js) is untouched.
// Model: so-model.js. Drawing: so-scene.js.
import { forwardStudyQuery, moduleOpenHref } from "../../board-return.js?v=20261022a";
import {
  MODULE_ID, PLANETS, ORDER, SUN, MOON, STAR_MASS, SPEEDS, DEFAULT_SPEED, MAX_PLANETS, NOT_TO_SCALE, MODEL_NOTE, GOALS,
  createSystem, realSystem, addPlanet, removePlanet, flingVelocity, step, stableYears, elements, predictPath, touch,
  SHARE_SCHEMA, toShare, fromShare, clamp
} from "./so-model.js";
import { createScene, CAPTION_GAP } from "./so-scene.js";
import {
  initFun, pressFeedback, smoothTheme, prefers, challengeCard, disclosure, createChallenges, createStreak,
  TIERS, bottomSheet, encodeState, decodeState, sanitizeState, shareLink, celebrate, tick, sound
} from "../../shared/fun/fun-ui.js";

const THEME_KEY = "popboard.orbits.solar.theme";
const root = document.documentElement;
const phone = matchMedia("(max-width: 600px)"), wide = matchMedia("(min-width: 900px)");
const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
const el = (tag, props = {}, ...kids) => { const n = Object.assign(document.createElement(tag), props); n.append(...kids); return n; };
const fmtYr = (y) => (y >= 100 ? Math.round(y).toLocaleString("en-US") : y >= 10 ? y.toFixed(0) : y.toFixed(1));
initFun(); pressFeedback();

// ---------- DOM (the playground's own nodes stay in the page, hidden by solar-theme.css) ----------
const shell = el("div", { className: "ss-root" });
shell.innerHTML = `
<h1 class="sr-only">Build a Solar System</h1>
<p class="sr-only">Pick a planet, then tap near the Sun for a round orbit, or pull back and let go to fling it. Keep every planet going around without crashes or escapes and the stability timer keeps counting.</p>
<header class="ss-hud">
  <button id="ssBack" class="ss-back" type="button" aria-label="Back to Study library">
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>
    <span class="back-label">Back</span>
  </button>
  <p class="ss-title">Solar System</p>
  <button id="ssHelp" type="button" class="fun-help" aria-label="About this model" aria-haspopup="dialog">?</button>
  <button id="ssSound" type="button" aria-pressed="false" aria-label="Sound is off">Sound</button>
  <button id="ssTheme" type="button"><span id="ssThemeLabel">Paper</span></button>
</header>
<section class="ss-status" id="ssStatus" aria-live="polite">
  <p class="ss-big" id="ssBig"></p>
  <p class="ss-readout" id="ssReadout"></p>
</section>
<main class="ss-stage" id="ssStage">
  <canvas id="ssScene" role="img" tabindex="0" aria-label="Solar system"></canvas>
  <p class="ss-cap" id="ssCap" hidden></p>
  <p class="ss-scale" id="ssScale"></p>
</main>
<div class="ss-funbox" id="ssFunBox"></div>
<section class="ss-controls" id="ssControls" aria-label="Solar system controls">
  <button type="button" class="fun-handle" id="ssHandle" aria-label="Resize controls"></button>
  <p class="ss-toast" id="ssToast" role="status" aria-live="polite" hidden></p>
  <div class="ss-tabs" role="tablist" aria-label="Mode">
    <button type="button" role="tab" data-mode="build" aria-selected="true">Build</button>
    <button type="button" role="tab" data-mode="sandbox" aria-selected="false">Sandbox</button>
  </div>
  <div id="ssBody" class="ss-body"></div>
  <p class="ss-link-row"><a id="ssPlayLink" href="study-orbits.html">Orbits playground</a> has stars, Lagrange points and resonances.</p>
</section>
<div class="ss-about-wrap" id="ssAbout" hidden>
  <section class="ss-about" role="dialog" aria-modal="true" aria-labelledby="ssAboutTitle">
    <p class="ss-about-title" id="ssAboutTitle">About this solar system</p>
    <p>Pick a planet below, then tap near the Sun for a round orbit, or pull back and let go to fling it. Tap a planet to see its name and orbit; drag it to move it.</p>
    <p class="ss-small" id="ssAboutNote"></p>
    <p class="ss-small">The stability timer counts simulated years with no crashes, no planet falling into the Sun and none thrown out. Medals count in Build mode.</p>
    <button type="button" id="ssAboutOk" class="primary">Got it</button>
  </section>
</div>`;
document.body.append(shell);
const $ = (id) => document.getElementById(id);
$("ssScale").textContent = NOT_TO_SCALE;
$("ssAboutNote").textContent = MODEL_NOTE;
$("ssPlayLink").href = moduleOpenHref("study-orbits.html", location.search);

// ---------- theme, sound, back, about ----------
const canvas = $("ssScene"), scene = createScene(canvas);
function syncTheme() {
  const light = root.getAttribute("data-theme") === "light";
  $("ssThemeLabel").textContent = light ? "Dark" : "Paper";
  $("ssTheme").setAttribute("aria-label", light ? "Switch to the dark theme" : "Switch to the Paper theme");
  document.querySelector('meta[name="color-scheme"]')?.setAttribute("content", light ? "light" : "dark");
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", light ? "#f3efe4" : "#0f1418");
  scene.setTheme(light ? "light" : "dark");
}
function setTheme(t) { root.setAttribute("data-theme", t === "light" ? "light" : "dark"); store.set(THEME_KEY, root.getAttribute("data-theme")); syncTheme(); }
$("ssTheme").addEventListener("click", () => { smoothTheme(); setTheme(root.getAttribute("data-theme") === "light" ? "dark" : "light"); });
syncTheme();
function syncSound() { $("ssSound").setAttribute("aria-pressed", String(sound.on)); $("ssSound").setAttribute("aria-label", sound.on ? "Sound is on" : "Sound is off"); }
$("ssSound").addEventListener("click", () => { sound.on = !sound.on; syncSound(); if (sound.on) tick(660); });
syncSound();
$("ssBack").addEventListener("click", (e) => {
  e.preventDefault();
  const qs = forwardStudyQuery(location.search).toString();
  history.replaceState(null, "", qs ? "?" + qs : location.pathname);
  location.href = "study.html" + location.search;
});
const openAbout = () => { $("ssAbout").hidden = false; $("ssAboutOk").focus(); };
const closeAbout = () => { $("ssAbout").hidden = true; $("ssHelp").focus(); };
$("ssHelp").addEventListener("click", openAbout);
$("ssAboutOk").addEventListener("click", closeAbout);
addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("ssAbout").hidden) closeAbout(); });

// ---------- fun layer ----------
const chip = el("button", { type: "button", className: "fun-chip", id: "ssChip" });
const pop = el("section", { id: "ssCard", className: "fun-pop" });
$("ssFunBox").append(chip, pop);
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
function toast(msg) { const t = $("ssToast"); t.textContent = msg; t.hidden = false; clearTimeout(toast._t); toast._t = setTimeout(() => { t.hidden = true; sheet?.layout(); requestFit(); }, 2600); sheet?.layout(); requestFit(); }

// ---------- state ----------
let sys = createSystem(), mode = "build", armed = "mercury", selected = null, speed = DEFAULT_SPEED, paused = prefers.reducedMotion;
let showTrails = true;
const trails = new Map();
const placedKeys = () => new Set(sys.bodies.map((b) => b.key));
const nextUnplaced = () => ORDER.find((k) => !placedKeys().has(k)) || null;
const selBody = () => (selected === "sun" ? null : sys.bodies.find((b) => b.id === selected) || null);
function resetTrails() { trails.clear(); }
function loadSystem(s, sp = speed) { sys = s; speed = sp; selected = null; resetTrails(); armed = mode === "build" ? nextUnplaced() : armed || "earth"; sync(); }

// ---------- readout ----------
function readout() {
  const n = sys.bodies.length, st = stableYears(sys);
  $("ssBig").textContent = n ? `Stable ${fmtYr(st)} yr` : "Add a planet";
  const lines = [`${n} planet${n === 1 ? "" : "s"}, ${fmtYr(sys.t)} yr simulated${paused ? ", paused" : ""}`];
  const b = selBody();
  if (b) { const e = elements(sys, b); lines.push(`${b.name}: ${e.r.toFixed(2)} AU, ${e.bound ? `orbit ${e.period < 2 ? (e.period * 365.25).toFixed(0) + " days" : e.period.toFixed(1) + " yr"}, e ${e.e.toFixed(2)}` : "escaping"}`); }
  else if (selected === "sun") lines.push(`Sun: ${sys.M.toFixed(2)} times the Sun's mass`);
  else if (mode === "build" && !armed) lines.push("All eight placed. Keep them going.");
  $("ssReadout").textContent = lines.join("\n");
  canvas.setAttribute("aria-label", `Solar system. ${$("ssBig").textContent}. ${lines.join(". ")}`);
}
function report() {
  if (mode !== "build") return;
  if (engine.report({ type: "solar", n: sys.bodies.length, stable: stableYears(sys) }).length) { chipSync(); celebrate(); }
}

// ---------- controls ----------
const body = $("ssBody");
for (const t of document.querySelectorAll(".ss-tabs [role=tab]")) t.addEventListener("click", () => setMode(t.dataset.mode));
function setMode(m) {
  if (m === mode) return;
  mode = m === "sandbox" ? "sandbox" : "build";
  for (const t of document.querySelectorAll(".ss-tabs [role=tab]")) t.setAttribute("aria-selected", String(t.dataset.mode === mode));
  // Each mode starts from its own blank sky, so Build medals are only for systems built by hand.
  loadSystem(createSystem(), speed);
  toast(mode === "build" ? "Build: place the planets one by one" : "Sandbox: any planets, any star");
}
const btn = (label, on, cls = "", aria) => { const b = el("button", { type: "button", textContent: label, className: cls }); if (aria) b.setAttribute("aria-label", aria); b.addEventListener("click", on); return b; };
const pressed = (b, v) => { b.setAttribute("aria-pressed", String(!!v)); return b; };
function slider(id, label, min, max, stepv, get, set, fmt) {
  const out = el("output", { id: id + "Out", textContent: fmt(get()) });
  const input = el("input", { type: "range", id, min, max, step: stepv, value: get() }); input.setAttribute("aria-label", label);
  input.addEventListener("input", () => { set(+input.value); out.textContent = fmt(get()); readout(); });
  return el("label", { className: "ss-row ss-slider" }, el("span", { className: "dim", textContent: label }), input, out);
}
function tray() {
  const used = placedKeys();
  return el("div", { className: "ss-tray", role: "group", ariaLabel: "Planet to place" }, ...ORDER.map((k) => {
    const b = pressed(btn("", () => { armed = k; selected = null; renderMode(); readout(); }, "ss-tray-btn", `Place ${PLANETS[k].name}`), armed === k);
    b.append(el("img", { src: `orbits/assets/solar/${k === "uranus" ? "uranus-disk" : k}.webp`, alt: "", width: 28, height: 28 }), el("span", { textContent: PLANETS[k].name }));
    b.disabled = (mode === "build" && used.has(k)) || sys.bodies.length >= MAX_PLANETS;
    return b;
  }));
}
function common() {
  return [
    slider("ssSpeed", "Speed", 0, SPEEDS.length - 1, 1, () => speed, (v) => { speed = v; }, (v) => `${SPEEDS[v]} yr/s`),
    el("div", { className: "ss-row" },
      pressed(btn(paused ? "Play" : "Pause", () => { paused = !paused; renderMode(); readout(); }, "", paused ? "Play" : "Pause"), false),
      pressed(btn("Trails", () => { showTrails = !showTrails; if (!showTrails) resetTrails(); renderMode(); }), showTrails),
      btn("Remove planet", () => { const b = selBody(); if (b) { removePlanet(sys, b.id); trails.delete(b.id); toast(`${b.name} removed`); selected = null; if (mode === "build") armed = nextUnplaced(); sync(); } }, "", "Remove the selected planet"))
  ];
}
function renderMode() {
  body.replaceChildren();
  if (mode === "build") {
    body.append(el("p", { className: "dim", textContent: armed ? `Pick a planet, then tap near the Sun or pull back and let go. Next: ${PLANETS[armed].name}.` : "Every planet is out. Keep them all going for 1,000 years for Gold." }), tray(), ...common(),
      el("div", { className: "ss-row" }, btn("Start over", () => { loadSystem(createSystem(sys.M)); toast("Fresh sky"); })));
  } else {
    body.append(el("p", { className: "dim", textContent: "Any planet, as many as 12, around a lighter or heavier star." }), tray(),
      slider("ssStar", "Star mass", STAR_MASS.min, STAR_MASS.max, 0.1, () => sys.M, (v) => { sys.M = v; touch(sys); resetTrails(); }, (v) => `${(+v).toFixed(1)} Suns`),
      ...common());
    const sh = btn("Share my system", async () => { const r = await shareLink(encodeState(sanitizeState(toShare(sys, speed), SHARE_SCHEMA))); sh.textContent = r.copied ? "Link copied" : "Link in address bar"; setTimeout(() => { sh.textContent = "Share my system"; }, 1600); });
    body.append(el("div", { className: "ss-row" },
      btn("Real solar system", () => { loadSystem(realSystem(sys.M)); toast("The eight planets at their real distances"); }),
      btn("Clear", () => { loadSystem(createSystem(sys.M)); }), sh));
  }
  sheet?.layout(); requestFit();
}

// ---------- caption (12px under the selected body's art) ----------
function placeCaption() {
  const cap = $("ssCap"), b = selBody();
  const key = selected === "sun" ? "sun" : b?.key;
  if (!key) { cap.hidden = true; return; }
  const info = key === "sun" ? SUN : PLANETS[key];
  const p = key === "sun" ? { x: scene.view.cx, y: scene.view.cy } : scene.scr(b.x, b.y);
  const text = key === "earth" ? `${info.caption} ${MOON.caption}` : info.caption;
  if (cap.dataset.key !== key) { cap.replaceChildren(el("b", { textContent: info.name }), el("br"), text); cap.dataset.key = key; }
  cap.hidden = false;
  const w = cap.offsetWidth, x = clamp(p.x, 8 + w / 2, innerWidth - 8 - w / 2);
  cap.style.left = Math.round(x) + "px"; cap.style.top = Math.round(p.y + scene.artHalfH(key) + CAPTION_GAP) + "px";
}

// ---------- input: tap or fling to place, tap to select, drag to move ----------
let gesture = null;
const local = (e) => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
function hit(p) {
  let best = null, bd = Infinity;
  for (const b of sys.bodies) { const s = scene.scr(b.x, b.y), d = Math.hypot(s.x - p.x, s.y - p.y); if (d < Math.max(22, scene.radius(b.key) + 6) && d < bd) { best = b; bd = d; } }
  if (best) return best;
  return Math.hypot(p.x - scene.view.cx, p.y - scene.view.cy) < Math.max(22, scene.radius("sun")) ? "sun" : null;
}
canvas.addEventListener("pointerdown", (e) => {
  const p = local(e), h = hit(p);
  canvas.setPointerCapture?.(e.pointerId); pop.hidden = true; chip.setAttribute("aria-expanded", "false");
  if (h === "sun") { selected = "sun"; readout(); return; }
  if (h) { selected = h.id; gesture = { type: "drag", id: h.id, sx: p.x, sy: p.y, moved: false }; tick(500); readout(); return; }
  if (!armed || sys.bodies.length >= MAX_PLANETS) { selected = null; readout(); if (!armed && mode === "build") toast("All eight are out. Tap one to see it."); return; }
  gesture = { type: "place", key: armed, x: p.x, y: p.y, px: p.x, py: p.y };
});
canvas.addEventListener("pointermove", (e) => {
  if (!gesture) return; const p = local(e);
  if (gesture.type === "place") { gesture.px = p.x; gesture.py = p.y; }
  else if (gesture.type === "drag") {
    if (Math.hypot(p.x - gesture.sx, p.y - gesture.sy) > 8) gesture.moved = true;
    const b = sys.bodies.find((x) => x.id === gesture.id); if (!b || !gesture.moved) return;
    const w = scene.world(p.x, p.y); b.x = w.x; b.y = w.y; trails.delete(b.id);
  }
});
function endGesture() {
  const g = gesture; gesture = null; if (!g) return;
  if (g.type === "place") {
    const w = scene.world(g.x, g.y), r = Math.hypot(w.x, w.y);
    if (r < 0.2) { toast("Too close to the Sun. Try a little farther out."); return; }
    const v = flingVelocity(sys, w.x, w.y, g.px - g.x, g.py - g.y);
    const b = addPlanet(sys, g.key, w.x, w.y, v.vx, v.vy); if (!b) return;
    selected = b.id; tick(700);
    if (mode === "build") armed = nextUnplaced();
    sync();
  } else if (g.type === "drag" && g.moved) {
    const b = sys.bodies.find((x) => x.id === g.id);
    if (b) { const r = Math.hypot(b.x, b.y); if (r < 0.2) { const s = 0.2 / r; b.x *= s; b.y *= s; } const v = flingVelocity(sys, b.x, b.y, 0, 0); b.vx = v.vx; b.vy = v.vy; touch(sys); }
    readout();
  }
}
canvas.addEventListener("pointerup", endGesture); canvas.addEventListener("pointercancel", endGesture);
canvas.addEventListener("keydown", (e) => { if (e.key === " ") { e.preventDefault(); paused = !paused; renderMode(); readout(); } });

// ---------- layout: stage box and bottom sheet (opens at the half stop on phones) ----------
let sheet = null;
const snaps = () => {
  const tabs = $("ssControls").querySelector(".ss-tabs"), peek = Math.ceil(tabs.offsetHeight + 56);
  const full = Math.max(peek + 40, Math.ceil(tabs.offsetHeight + body.scrollHeight + ($("ssToast").hidden ? 0 : $("ssToast").offsetHeight + 8) + 64));
  const half = Math.min(full, Math.max(peek + 1, Math.round(innerHeight * 0.4)));
  return [peek, Math.max(peek + 1, half), Math.max(full, half + 1)];
};
// The shared bottomSheet measures its stops when it is created, so this only runs after
// renderMode() has filled the controls.
function phoneSync() {
  if (phone.matches && !sheet) { $("ssControls").classList.add("fun-sheet-on", "fun-sheet"); sheet = bottomSheet($("ssControls"), $("ssHandle"), { getSnaps: snaps, start: 1, onSnap: () => setTimeout(requestFit, 350) }); $("ssControls").dataset.snap = "half"; }
  else if (!phone.matches && sheet) { sheet.destroy(); sheet = null; $("ssControls").classList.remove("fun-sheet-on", "fun-sheet"); }
}
let fitQueued = false;
function requestFit() { if (fitQueued) return; fitQueued = true; requestAnimationFrame(() => { fitQueued = false; fit(); }); }
function fit() {
  const ctl = $("ssControls").getBoundingClientRect(), stt = $("ssStatus").getBoundingClientRect(), top = stt.bottom + 8;
  const capRoom = CAPTION_GAP + 46;
  const box = wide.matches ? { x: 16, y: top, w: innerWidth - 404 - 16, h: innerHeight - top - 36 }
    : { x: 12, y: top, w: innerWidth - 24, h: Math.max(160, Math.min(innerHeight, ctl.top) - 30 - top) };
  scene.setBox(box, viewRadius(), capRoom, wide.matches);
  const sc = $("ssScale"); sc.style.left = box.x + "px"; sc.style.top = Math.round(box.y + box.h + 6) + "px";
}
// Zoom to the farthest orbit on screen (its far point) or the planet about to be placed,
// so an inner system fills the view and Neptune still fits once it is armed.
function viewRadius() {
  let r = Math.max(1.7, armed ? PLANETS[armed].a * 1.15 : 0);
  for (const b of sys.bodies) { const e = elements(sys, b); r = Math.max(r, (e.bound ? e.a * (1 + e.e) : e.r) * 1.1); }
  return Math.min(60, r);
}
function layoutUI() { phoneSync(); sheet?.layout(); requestFit(); }
phone.addEventListener?.("change", layoutUI); wide.addEventListener?.("change", layoutUI);
addEventListener("resize", () => { scene.resize(); layoutUI(); });
if (typeof ResizeObserver === "function") { const ro = new ResizeObserver(() => requestFit()); ro.observe($("ssStatus")); ro.observe($("ssControls")); }
// One call that brings every piece of UI in line with the scene.
function sync() { renderMode(); readout(); requestFit(); placeCaption(); }

// ---------- loop ----------
const TRAIL = prefers.reducedMotion ? 60 : 160;
let last = performance.now(), frames = 0, moonAngle = 0;
function advance(years) {
  const before = sys.bodies.length; step(sys, years);
  for (const ev of sys.events.splice(0)) {
    scene.puff(ev.x, ev.y); trails.delete(ev.gone); trails.delete(ev.id);
    if (ev.type === "merge") { toast(`${ev.other} hit ${ev.name}. They merged.`); if (selected === ev.gone) selected = ev.id; }
    else { toast(ev.type === "star" ? `${ev.name} fell into the Sun` : `${ev.name} was thrown out of the system`); if (selected === ev.id) selected = null; }
  }
  if (sys.bodies.length !== before) { if (mode === "build") armed = armed || nextUnplaced(); renderMode(); }
}
function frame(now) {
  const real = Math.min(0.05, (now - last) / 1000); last = now; frames++;
  if (!paused && !(gesture && gesture.type === "drag" && gesture.moved)) {
    advance(real * SPEEDS[speed]);
    if (showTrails) for (const b of sys.bodies) { let t = trails.get(b.id); if (!t) trails.set(b.id, (t = [])); t.push(b.x, b.y); if (t.length > TRAIL * 2) t.splice(0, t.length - TRAIL * 2); }
    moonAngle += real * 1.5;
  }
  let ghost = null, sling = null;
  if (gesture && gesture.type === "place") {
    const w = scene.world(gesture.x, gesture.y);
    if (Math.hypot(w.x, w.y) >= 0.2) { const v = flingVelocity(sys, w.x, w.y, gesture.px - gesture.x, gesture.py - gesture.y); ghost = predictPath(sys, w.x, w.y, v.vx, v.vy, Math.min(200, 1.2 * Math.pow(Math.hypot(w.x, w.y), 1.5))); }
    sling = { key: gesture.key, ...gesture };
  }
  scene.draw(sys, { trails: showTrails ? trails : new Map(), selected, ghost, sling, dt: real, moonAngle });
  placeCaption();
  if (frames % 10 === 0) { readout(); report(); }
  requestAnimationFrame(frame);
}

// ---------- start: fill the controls first, then build the sheet so it measures its half stop ----------
const shared = sanitizeState(decodeState(location.hash), SHARE_SCHEMA);
if (Object.keys(shared).length) { mode = "sandbox"; for (const t of document.querySelectorAll(".ss-tabs [role=tab]")) t.setAttribute("aria-selected", String(t.dataset.mode === "sandbox")); const r = fromShare(shared); sys = r.sys; speed = r.speed; armed = "earth"; }
scene.resize();
renderMode(); readout();
phoneSync(); fit();
layoutUI();
if (paused) toast("Reduced motion: paused. Press Play to run.");
scene.ready.then(() => requestAnimationFrame(frame));

// Debug and screenshot hooks. Every setter goes through sync() so the panel, readout,
// caption and stage always match the scene.
window.__solar = {
  get sys() { return sys; }, get mode() { return mode; }, get armed() { return armed; }, get selected() { return selected; }, get view() { return scene.view; },
  get sheet() { return sheet ? { index: sheet.index, snap: $("ssControls").dataset.snap } : null; }, CAPTION_GAP,
  setMode(m) { setMode(m); }, setTheme(t) { setTheme(t); },
  loadReal(M = 1) { loadSystem(realSystem(M)); }, clear() { loadSystem(createSystem(sys.M)); },
  place(key, x, y, vx, vy) { const b = addPlanet(sys, key, x, y, vx, vy); if (b && mode === "build") armed = nextUnplaced(); sync(); return b?.id ?? null; },
  select(which) { selected = which === "sun" ? "sun" : (sys.bodies.find((b) => b.key === which || b.id === which)?.id ?? null); sync(); },
  arm(key) { armed = PLANETS[key] ? key : null; sync(); },
  advance(years) { const end = sys.t + years; while (sys.t < end - 1e-9) advance(Math.min(5, end - sys.t)); sync(); report(); chipSync(); },
  pause(v = true) { paused = !!v; sync(); }, setSpeed(i) { speed = clamp(Math.round(i), 0, SPEEDS.length - 1); sync(); },
  openAbout, closeAbout, toast, layout: layoutUI
};
