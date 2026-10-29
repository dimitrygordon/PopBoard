// Relativity "Lightspeed Ride" mode: fly toward c and watch the sky bunch forward and change color.
// Loaded by study-relativity.html when ?mode=lightspeed-ride. The Relativity Sandbox
// (relativity-ui.js) is untouched and never runs on the same page load.
// Model: ls-model.js. Drawing: ls-scene.js.
import { forwardStudyQuery, moduleOpenHref } from "../../board-return.js?v=20261022a";
import {
  MODULE_ID, BETA_MAX, CONE_DEG, PRESETS, FUN, GOALS, makeSky, gamma, sliderToBeta, betaToSlider,
  coneFraction, fractionInCone, sideStarDeg, clamp
} from "./ls-model.js";
import { createScene, CAPTION_GAP } from "./ls-scene.js";
import {
  initFun, pressFeedback, smoothTheme, prefers, challengeCard, disclosure, createChallenges, createStreak,
  TIERS, bottomSheet, springStep, celebrate, tick, sound
} from "../../shared/fun/fun-ui.js";

const THEME_KEY = "popboard.relativity.lightspeed.theme";
const root = document.documentElement;
const phone = matchMedia("(max-width: 600px)"), wide = matchMedia("(min-width: 900px)");
const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
const el = (tag, props = {}, ...kids) => { const n = Object.assign(document.createElement(tag), props); n.append(...kids); return n; };
const fmtB = (b) => (b >= 0.99 ? b.toFixed(4) : b.toFixed(3));
const pct = (f) => `${Math.round(f * 100)}%`;
initFun(); pressFeedback();

// ---------- DOM (the sandbox's own nodes stay in the page, hidden by lightspeed-theme.css) ----------
const shell = el("div", { className: "ls-root" });
shell.innerHTML = `
<h1 class="sr-only">Lightspeed Ride</h1>
<p class="sr-only">Push the throttle toward the speed of light. Stars crowd toward the front of the window and change color as the ship speeds up.</p>
<header class="ls-hud">
  <button id="lsBack" class="ls-back" type="button" aria-label="Back to Study library">
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>
    <span class="back-label">Back</span>
  </button>
  <p class="ls-title">Lightspeed Ride</p>
  <button id="lsHelp" type="button" class="fun-help" aria-label="About this model" aria-haspopup="dialog">?</button>
  <button id="lsSound" type="button" aria-pressed="false" aria-label="Sound is off">Sound</button>
  <button id="lsTheme" type="button"><span id="lsThemeLabel">Paper</span></button>
</header>
<section class="ls-status" id="lsStatus" aria-live="polite">
  <p class="ls-big" id="lsBig"></p>
  <div class="ls-meter" aria-hidden="true"><i id="lsMeterFill"></i></div>
  <p class="ls-readout" id="lsReadout"></p>
</section>
<main class="ls-stage" id="lsStage">
  <canvas id="lsScene" role="img" tabindex="0" aria-label="Cockpit view"></canvas>
  <p class="ls-cap" id="lsCap"></p>
</main>
<div class="ls-funbox" id="lsFunBox"></div>
<section class="ls-controls" id="lsControls" aria-label="Lightspeed Ride controls">
  <button type="button" class="fun-handle" id="lsHandle" aria-label="Resize controls"></button>
  <p class="ls-toast" id="lsToast" role="status" aria-live="polite" hidden></p>
  <div class="ls-tabs" role="tablist" aria-label="Mode">
    <button type="button" role="tab" data-mode="ride" aria-selected="true">Ride</button>
    <button type="button" role="tab" data-mode="sandbox" aria-selected="false">Sandbox</button>
  </div>
  <div id="lsBody" class="ls-body"></div>
  <p class="ls-link-row"><a id="lsSandboxLink" href="study-relativity.html">Relativity Sandbox</a> has clocks, the light clock and spacetime diagrams.</p>
</section>
<div class="ls-about-wrap" id="lsAbout" hidden>
  <section class="ls-about" role="dialog" aria-modal="true" aria-labelledby="lsAboutTitle">
    <p class="ls-about-title" id="lsAboutTitle">About the Lightspeed Ride</p>
    <p>Push the throttle and watch out the window. Light from every star reaches you at c, but because you are moving into it, it seems to come from farther ahead. The stars crowd toward the front (aberration). Light from ahead is squeezed to higher frequencies and looks bluer and brighter; light from behind is stretched, redder and dimmer (Doppler shift).</p>
    <p class="ls-small">The throttle adds the same rapidity for each push, so it slows down near c and stops at 0.999 c. Stars are an even, made-up sky. Colors treat each star as a glowing body shifted to a new temperature, and brightness grows as the Doppler factor to the fourth power, capped so the picture stays readable. The speed dust is only a picture of motion, not something you would see.</p>
    <p class="ls-small">Medals count in Ride mode. Reduced motion shows still before and after views.</p>
    <button type="button" id="lsAboutOk" class="primary">Got it</button>
  </section>
</div>`;
document.body.append(shell);
const $ = (id) => document.getElementById(id);
$("lsSandboxLink").href = moduleOpenHref("study-relativity.html", location.search);

// ---------- theme, sound, back, about ----------
const canvas = $("lsScene"), scene = createScene(canvas);
function syncTheme() {
  const light = root.getAttribute("data-theme") === "light";
  $("lsThemeLabel").textContent = light ? "Dark" : "Paper";
  $("lsTheme").setAttribute("aria-label", light ? "Switch to the dark theme" : "Switch to the Paper theme");
  document.querySelector('meta[name="color-scheme"]')?.setAttribute("content", light ? "light" : "dark");
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", light ? "#f3efe4" : "#0b0f17");
  scene.setTheme(light ? "light" : "dark");
}
function setTheme(t) { root.setAttribute("data-theme", t === "light" ? "light" : "dark"); store.set(THEME_KEY, root.getAttribute("data-theme")); syncTheme(); }
$("lsTheme").addEventListener("click", () => { smoothTheme(); setTheme(root.getAttribute("data-theme") === "light" ? "dark" : "light"); });
syncTheme();
function syncSound() { $("lsSound").setAttribute("aria-pressed", String(sound.on)); $("lsSound").setAttribute("aria-label", sound.on ? "Sound is on" : "Sound is off"); }
$("lsSound").addEventListener("click", () => { sound.on = !sound.on; syncSound(); if (sound.on) tick(660); });
syncSound();
$("lsBack").addEventListener("click", (e) => {
  e.preventDefault();
  const qs = forwardStudyQuery(location.search).toString();
  history.replaceState(null, "", qs ? "?" + qs : location.pathname);
  location.href = "study.html" + location.search;
});
const openAbout = () => { $("lsAbout").hidden = false; $("lsAboutOk").focus(); };
const closeAbout = () => { $("lsAbout").hidden = true; $("lsHelp").focus(); };
$("lsHelp").addEventListener("click", openAbout);
$("lsAboutOk").addEventListener("click", closeAbout);
addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("lsAbout").hidden) closeAbout(); });

// ---------- fun layer ----------
const chip = el("button", { type: "button", className: "fun-chip", id: "lsChip" });
const pop = el("section", { id: "lsCard", className: "fun-pop" });
$("lsFunBox").append(chip, pop);
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
function toast(msg) { const t = $("lsToast"); t.textContent = msg; t.hidden = false; clearTimeout(toast._t); toast._t = setTimeout(() => { t.hidden = true; sheet?.layout(); requestFit(); }, 2600); sheet?.layout(); requestFit(); }

// ---------- state ----------
const stars = makeSky();
let mode = "ride", target = 0, shown = { x: 0, v: 0 }, compare = prefers.reducedMotion, hold = 0, fraction = coneFraction(0);
const fx = { aberration: true, dopplerOn: true, cone: true, dust: !prefers.reducedMotion };
const beta = () => Math.tanh(shown.x); // shown.x is rapidity, so the spring eases in rapidity
function setTarget(b, instant = compare || prefers.reducedMotion) {
  target = clamp(b, 0, BETA_MAX);
  if (instant) shown = { x: Math.atanh(target), v: 0 };
}

// ---------- readout ----------
function readout() {
  const b = beta(), g = gamma(b);
  $("lsBig").textContent = `${fmtB(b)} c`;
  $("lsMeterFill").style.width = (b * 100).toFixed(2) + "%";
  const lines = [`gamma ${g < 10 ? g.toFixed(2) : g.toFixed(1)}. ${pct(fraction)} of stars inside the forward ${CONE_DEG} degree cone.`];
  if (fx.aberration) lines.push(`A star straight off to the side now looks ${sideStarDeg(b).toFixed(0)} degrees from straight ahead.`);
  if (mode === "ride" && hold > 0) lines.push(`Holding gamma 10: ${hold.toFixed(1)} of ${FUN.goldHoldS} s`);
  $("lsReadout").textContent = lines.join("\n");
  canvas.setAttribute("aria-label", `Cockpit view at ${$("lsBig").textContent}. ${lines.join(" ")}`);
  const out = $("lsThrottleOut"); if (out) out.textContent = `${fmtB(target)} c`;
  const input = $("lsThrottle"); if (input && document.activeElement !== input) input.value = betaToSlider(target).toFixed(3);
}
function report() {
  if (mode !== "ride") return;
  if (engine.report({ type: "ride", beta: beta(), fraction, holdGold: hold }).length) { chipSync(); celebrate(); }
}

// ---------- controls ----------
const body = $("lsBody");
for (const t of document.querySelectorAll(".ls-tabs [role=tab]")) t.addEventListener("click", () => setMode(t.dataset.mode));
function setMode(m) {
  m = m === "sandbox" ? "sandbox" : "ride";
  if (m === mode) return;
  mode = m;
  for (const t of document.querySelectorAll(".ls-tabs [role=tab]")) t.setAttribute("aria-selected", String(t.dataset.mode === mode));
  // Ride always flies with every effect on, so medals mean the real picture.
  if (mode === "ride") Object.assign(fx, { aberration: true, dopplerOn: true, cone: true });
  hold = 0; sync();
  toast(mode === "ride" ? "Ride: throttle up and earn medals" : "Sandbox: switch each effect on or off");
}
const btn = (label, on, cls = "", aria) => { const b = el("button", { type: "button", textContent: label, className: cls }); if (aria) b.setAttribute("aria-label", aria); b.addEventListener("click", on); return b; };
const pressed = (b, v) => { b.setAttribute("aria-pressed", String(!!v)); return b; };
function throttle() {
  const out = el("output", { id: "lsThrottleOut", textContent: `${fmtB(target)} c` });
  const input = el("input", { type: "range", id: "lsThrottle", min: 0, max: 1, step: 0.001, value: betaToSlider(target).toFixed(3) });
  input.setAttribute("aria-label", "Throttle. Speed as a fraction of the speed of light");
  input.addEventListener("input", () => { setTarget(sliderToBeta(+input.value)); readout(); });
  return el("label", { className: "ls-row ls-slider" }, el("span", { className: "dim", textContent: "Throttle" }), input, out);
}
function toggle(label, key, aria) {
  return pressed(btn(label, () => { fx[key] = !fx[key]; sync(); }, "", aria), fx[key]);
}
function renderMode() {
  body.replaceChildren();
  const view = pressed(btn(compare ? "Before and after" : "Live view", () => { compare = !compare; if (compare) setTarget(target, true); sync(); }, "", compare ? "Showing still before and after views. Switch to the live view" : "Showing the live view. Switch to still before and after views"), compare);
  if (mode === "ride") {
    body.append(el("p", { className: "dim", textContent: "Push the throttle. It gets harder near c: each push adds less speed." }), throttle(),
      el("div", { className: "ls-row" }, view, btn("Stop", () => { setTarget(0); hold = 0; sync(); }, "", "Slow down to rest")));
  } else {
    body.append(el("p", { className: "dim", textContent: "Pick a speed and switch each effect on or off to see what it does." }), throttle(),
      el("div", { className: "ls-row ls-presets", role: "group", ariaLabel: "Speed presets" }, ...PRESETS.map((p) => pressed(btn(p ? `${p} c` : "Rest", () => { setTarget(p); sync(); }, "", p ? `Set speed to ${p} c` : "Set speed to rest"), Math.abs(target - p) < 1e-6))),
      el("div", { className: "ls-row" }, toggle("Bunching", "aberration", "Aberration: stars bunch forward"), toggle("Color", "dopplerOn", "Doppler color and brightness"), toggle("Cone", "cone", `Show the forward ${CONE_DEG} degree cone`), toggle("Dust", "dust", "Speed dust (illustrative)")),
      el("div", { className: "ls-row" }, view));
  }
  sheet?.layout(); requestFit();
}

// ---------- caption (12px under the cockpit art) ----------
function placeCaption() {
  const cap = $("lsCap"), a = scene.art;
  const text = compare ? "Left: the sky at rest. Right: the same sky at your speed."
    : !fx.aberration && !fx.dopplerOn ? "Both effects off: the sky looks the same at any speed."
    : "Stars ahead crowd together and turn bluer and brighter. Stars at the edges slide forward, redden and dim.";
  if (cap.textContent !== text) cap.textContent = text;
  cap.style.left = Math.round(a.x + a.w / 2) + "px"; cap.style.top = Math.round(a.y + a.h + CAPTION_GAP) + "px";
  cap.style.maxWidth = Math.round(Math.max(200, a.w)) + "px";
}

// ---------- layout: stage box and bottom sheet (opens at the half stop on phones) ----------
let sheet = null;
const snaps = () => {
  const tabs = $("lsControls").querySelector(".ls-tabs"), peek = Math.ceil(tabs.offsetHeight + 56);
  const full = Math.max(peek + 40, Math.ceil(tabs.offsetHeight + body.scrollHeight + ($("lsToast").hidden ? 0 : $("lsToast").offsetHeight + 8) + 64));
  const half = Math.min(full, Math.max(peek + 1, Math.round(innerHeight * 0.4)));
  return [peek, Math.max(peek + 1, half), Math.max(full, half + 1)];
};
// The shared bottomSheet measures its stops when it is created, so this only runs after
// renderMode() has filled the controls.
function phoneSync() {
  if (phone.matches && !sheet) { $("lsControls").classList.add("fun-sheet-on", "fun-sheet"); sheet = bottomSheet($("lsControls"), $("lsHandle"), { getSnaps: snaps, start: 1, onSnap: () => setTimeout(requestFit, 350) }); $("lsControls").dataset.snap = "half"; }
  else if (!phone.matches && sheet) { sheet.destroy?.(); sheet = null; $("lsControls").classList.remove("fun-sheet-on", "fun-sheet"); $("lsControls").style.transform = ""; $("lsControls").style.height = ""; }
}
let fitQueued = false;
function requestFit() { if (fitQueued) return; fitQueued = true; requestAnimationFrame(() => { fitQueued = false; fit(); }); }
function sheetTop() {
  const c = $("lsControls"); if (!sheet) return c.getBoundingClientRect().top;
  const s = c.dataset.snap === "full" ? 2 : c.dataset.snap === "peek" ? 0 : 1;
  return innerHeight - snaps()[s];
}
function fit() {
  const stt = $("lsStatus").getBoundingClientRect(), top = stt.bottom + 10;
  const capRoom = CAPTION_GAP + $("lsCap").offsetHeight + 8;
  const box = wide.matches ? { x: 16, y: top, w: innerWidth - 404 - 16, h: innerHeight - top - 16 }
    : { x: 12, y: top, w: innerWidth - 24, h: Math.max(140, Math.min(innerHeight, sheetTop()) - 12 - top) };
  scene.setBox(box, capRoom);
  placeCaption();
}
function layoutUI() { phoneSync(); sheet?.layout(); requestFit(); }
phone.addEventListener?.("change", layoutUI); wide.addEventListener?.("change", layoutUI);
addEventListener("resize", () => { scene.resize(); layoutUI(); });
if (typeof ResizeObserver === "function") { const ro = new ResizeObserver(() => requestFit()); ro.observe($("lsStatus")); ro.observe($("lsControls")); }
// One call that brings every piece of UI in line with the scene.
function sync() { renderMode(); readout(); requestFit(); placeCaption(); }

// ---------- loop ----------
let last = performance.now(), frames = 0, lastSeen = null;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now; frames++;
  if (compare || prefers.reducedMotion) shown = { x: Math.atanh(target), v: 0 };
  else shown = springStep(shown, Math.atanh(target), dt, { response: 0.6, damping: 1.0 });
  shown.x = Math.max(0, shown.x);
  const b = beta(), g = gamma(b);
  hold = mode === "ride" && Math.abs(g - FUN.goldGamma) <= FUN.goldTol ? hold + dt : 0;
  lastSeen = scene.draw(stars, { beta: b, ...fx, dust: fx.dust && !prefers.reducedMotion, rapidity: shown.x, dt, compare });
  fraction = fractionInCone(lastSeen);
  if (frames % 6 === 0) { readout(); report(); }
  requestAnimationFrame(frame);
}

// ---------- start: fill the controls first, then build the sheet so it measures its half stop ----------
scene.resize();
renderMode(); readout();
phoneSync(); fit();
layoutUI();
if (prefers.reducedMotion) toast("Reduced motion: still before and after views.");
scene.ready.then(() => requestAnimationFrame(frame));

// Debug and screenshot hooks. Every setter goes through sync() so the panel, readout,
// caption and stage always match the scene.
function settle() { shown = { x: Math.atanh(target), v: 0 }; lastSeen = scene.draw(stars, { beta: beta(), ...fx, dust: false, rapidity: 0, dt: 0, compare }); fraction = fractionInCone(lastSeen); }
window.__lightspeed = {
  get mode() { return mode; }, get beta() { return beta(); }, get target() { return target; }, get fraction() { return fraction; }, get fx() { return { ...fx }; },
  get compare() { return compare; }, get art() { return { ...scene.art }; }, get hold() { return hold; }, CAPTION_GAP,
  get sheet() { return sheet ? { snap: $("lsControls").dataset.snap } : null; },
  setMode(m) { setMode(m); }, setTheme(t) { setTheme(t); },
  setBeta(b) { setTarget(b, true); settle(); sync(); }, setSlider(s) { setTarget(sliderToBeta(s), true); settle(); sync(); },
  setEffect(key, v) { if (key in fx) { fx[key] = !!v; settle(); sync(); } },
  setCompare(v) { compare = !!v; settle(); sync(); },
  ride(seconds) { const n = Math.round(seconds * 60); for (let i = 0; i < n; i++) { const g = gamma(beta()); hold = mode === "ride" && Math.abs(g - FUN.goldGamma) <= FUN.goldTol ? hold + 1 / 60 : 0; } settle(); report(); chipSync(); sync(); },
  openAbout, closeAbout, toast, layout: layoutUI
};
