// Powers of Ten: input (wheel, pinch, drag, slider, keys) with momentum and detents,
// modes (Zoom, Size Hunt, Predict, Sandbox), live captions and the fun layer.
// Data and math: p10-logic.js. Drawing: p10-render.js.
import { forwardStudyQuery } from "../board-return.js?v=20261022a";
import {
  MODULE_ID, PLATES, POWERS, Z_MIN, Z_MAX, GOALS, FUN, PREDICTIONS, SHARE_SCHEMA,
  clampZ, detentFor, crossed, formatPower, plainSize, dominantPlate, huntFound, nextHunt,
  choicesFor, judgePrediction, byId, powersBetween, loadStamps, addStamps
} from "./p10-logic.js";
import { loadPlates, createRenderer } from "./p10-render.js";
import {
  initFun, pressFeedback, smoothTheme, prefers, challengeCard, disclosure, createChallenges, createStreak, createPrediction,
  TIERS, bottomSheet, springStep, bindSlider, encodeState, decodeState, sanitizeState, shareLink, celebrate, tick, sound
} from "../shared/fun/fun-ui.js";

const $ = (id) => document.getElementById(id);
const root = document.documentElement;
const THEME_KEY = "popboard.powers-of-ten.theme";
initFun(); pressFeedback();
const reduced = () => prefers.reducedMotion;
const el = (tag, props = {}, ...kids) => { const n = Object.assign(document.createElement(tag), props); n.append(...kids); return n; };

// ---------- theme, sound, back ----------
function syncTheme() {
  const light = root.getAttribute("data-theme") === "light";
  $("themeLabel").textContent = light ? "Dark" : "Paper";
  $("themeBtn").setAttribute("aria-label", light ? "Switch to the dark theme" : "Switch to the Paper theme");
}
$("themeBtn").addEventListener("click", () => {
  smoothTheme();
  const t = root.getAttribute("data-theme") === "light" ? "dark" : "light";
  root.setAttribute("data-theme", t); try { localStorage.setItem(THEME_KEY, t); } catch (e) {}
  syncTheme(); dirty = true;
});
syncTheme();
function syncSound() { $("soundBtn").setAttribute("aria-pressed", String(sound.on)); $("soundBtn").textContent = sound.on ? "Sound on" : "Sound off"; }
$("soundBtn").addEventListener("click", () => { sound.on = !sound.on; syncSound(); if (sound.on) tick(660); });
syncSound();
$("studyBackBtn").addEventListener("click", (e) => {
  e.preventDefault();
  const qs = forwardStudyQuery(location.search).toString();
  history.replaceState(null, "", qs ? "?" + qs : location.pathname);
  location.href = "study.html" + location.search;
});

// ---------- fun layer ----------
const chip = el("button", { type: "button", className: "fun-chip", id: "funChip" });
const pop = el("section", { id: "funCard", className: "fun-pop" });
$("funBox").append(chip, pop);
const card = challengeCard(pop, GOALS);
const stampsEl = el("p", { className: "stamps-line" }); pop.appendChild(stampsEl);
disclosure(chip, pop, false);
const engine = createChallenges({ moduleId: MODULE_ID, goals: GOALS, onEarn: (g) => card.flash(g.tier) });
const streak = createStreak({ moduleId: MODULE_ID });
const prediction = createPrediction({ judge: judgePrediction, streak });
function chipSync() {
  const earned = engine.earned(), top = TIERS.filter((t) => earned.includes(t)).pop();
  chip.replaceChildren();
  if (top) chip.appendChild(el("span", { className: "fun-medal fun-badge " + top }));
  chip.append(`${top ? top[0].toUpperCase() + top.slice(1) : "Challenges"} ${earned.length}/${GOALS.length}`);
  chip.setAttribute("aria-label", `Challenges: ${earned.length} of ${GOALS.length} medals earned. Show list`);
  card.update(earned);
  stampsEl.textContent = `Stamps: ${loadStamps().length} of ${POWERS.length} powers visited`;
}
chipSync(); card.streak(0, streak.best);
const report = (e) => { if (engine.report(e).length) chipSync(); };

// ---------- zoom state ----------
// z = log10(view height in m). Motion is one of: free (momentum), snap (spring to a detent), run (scripted).
const share = sanitizeState(decodeState(location.hash), SHARE_SCHEMA);
const Z = { z: typeof share.z === "number" ? share.z : 0.45, v: 0, target: null, run: null };
let anchor = null, dirty = true, idleT = 0;
const canvas = $("scene");
const imgs = loadPlates();
imgs.forEach((im) => im.addEventListener("load", () => { dirty = true; }));
const R = createRenderer(canvas, imgs);
R.resize(); new ResizeObserver(() => { R.resize(); dirty = true; }).observe(canvas);

function setZ(nz, { fromSlider = false } = {}) {
  nz = clampZ(nz);
  const hit = crossed(Z.z, nz);
  if (hit.length) {
    tick(520 + 10 * hit[hit.length - 1]); // soft detent tick; silent unless Sound is on
    const r = addStamps(hit); if (r.fresh) { chipSync(); report({ type: "stamps", count: r.count }); }
  }
  Z.z = nz; dirty = true;
  if (!fromSlider) $("zoom").value = String(Math.round(nz * 100) / 100);
}
function snapTo(n) { Z.run = null; Z.target = clampZ(n); if (reduced()) { setZ(Z.target); Z.target = null; Z.v = 0; settled(); } }
function scheduleSnap(ms = 140) { clearTimeout(idleT); idleT = setTimeout(() => { if (!drag && Z.run === null) snapTo(detentFor(Z.z, Z.v)); }, ms); }

// ---------- input ----------
canvas.addEventListener("wheel", (e) => {
  e.preventDefault();
  const r = canvas.getBoundingClientRect(); anchor = { x: e.clientX - r.left, y: e.clientY - r.top };
  const d = (e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY) * 0.0025;
  Z.target = null; Z.run = null; setZ(Z.z + d); Z.v = 0; scheduleSnap(160); // wheel already carries OS momentum; settle on the nearest power
}, { passive: false });
const ptrs = new Map(); let drag = null;
canvas.addEventListener("pointerdown", (e) => {
  canvas.setPointerCapture?.(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  Z.target = null; Z.run = null; Z.v = 0; clearTimeout(idleT);
  drag = { z0: Z.z, lt: performance.now(), lz: Z.z, d0: pinchDist(), y0: e.clientY };
});
function pinchDist() { const p = [...ptrs.values()]; return p.length >= 2 ? Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y) : 0; }
canvas.addEventListener("pointermove", (e) => {
  if (!drag || !ptrs.has(e.pointerId)) return;
  ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  const r = canvas.getBoundingClientRect(), p = [...ptrs.values()];
  let nz;
  if (p.length >= 2) {
    if (!drag.d0) { drag.d0 = pinchDist(); drag.z0 = Z.z; }
    anchor = { x: (p[0].x + p[1].x) / 2 - r.left, y: (p[0].y + p[1].y) / 2 - r.top };
    nz = drag.z0 - Math.log10(Math.max(1, pinchDist()) / Math.max(1, drag.d0)) * 2; // spread fingers = zoom in
  } else {
    anchor = { x: e.clientX - r.left, y: e.clientY - r.top };
    nz = drag.z0 + (e.clientY - drag.y0) / 120; // drag down = bigger view
  }
  const now = performance.now(), dt = Math.max(1, now - drag.lt);
  Z.v = 0.8 * ((nz - drag.lz) / dt * 1000) + 0.2 * Z.v; drag.lz = nz; drag.lt = now;
  setZ(nz);
});
const endPtr = (e) => {
  ptrs.delete(e.pointerId);
  if (ptrs.size) { drag.d0 = 0; drag.y0 = [...ptrs.values()][0].y; drag.z0 = Z.z; return; }
  if (!drag) return; drag = null;
  // Velocity hand-off: momentum projection picks the detent, the spring carries the speed.
  snapTo(detentFor(Z.z, Math.max(-12, Math.min(12, Z.v))));
};
canvas.addEventListener("pointerup", endPtr); canvas.addEventListener("pointercancel", endPtr);
canvas.addEventListener("keydown", (e) => {
  const k = e.key;
  if (k === "+" || k === "=" || k === "ArrowUp" || k === "ArrowRight") { e.preventDefault(); snapTo(Math.round(Z.target ?? Z.z) + 1); }
  if (k === "-" || k === "_" || k === "ArrowDown" || k === "ArrowLeft") { e.preventDefault(); snapTo(Math.round(Z.target ?? Z.z) - 1); }
});
bindSlider($("zoom"), (v) => { Z.target = null; Z.run = null; anchor = null; setZ(v, { fromSlider: true }); });
$("zoom").addEventListener("change", () => snapTo(Math.round(Z.z)));
$("zoomIn").addEventListener("click", () => snapTo(Math.round(Z.target ?? Z.z) - 1));
$("zoomOut").addEventListener("click", () => snapTo(Math.round(Z.target ?? Z.z) + 1));

// ---------- modes ----------
let mode = "zoom";
const hunt = { target: null, finds: 0 };
const pred = { i: 0, state: "ask", result: null };
const sandbox = { a: share.a || "person", b: share.b || "earth", ruler: share.ruler ?? true };
const body = $("modeBody");
for (const t of document.querySelectorAll(".tabs [role=tab]")) t.addEventListener("click", () => setMode(t.dataset.mode));
function setMode(m) {
  mode = m;
  for (const t of document.querySelectorAll(".tabs [role=tab]")) t.setAttribute("aria-selected", String(t.dataset.mode === m));
  if (m === "hunt" && !hunt.target) hunt.target = nextHunt(null);
  renderMode(); dirty = true; sheet?.layout(); syncPeek();
}
function jumpButtons() {
  const i = dominantPlate(Z.target ?? Z.z);
  const prev = el("button", { type: "button", textContent: "Smaller object" }), next = el("button", { type: "button", textContent: "Bigger object" });
  prev.disabled = i === 0; next.disabled = i === PLATES.length - 1;
  prev.addEventListener("click", () => goPlate(Math.max(0, i - 1))); next.addEventListener("click", () => goPlate(Math.min(PLATES.length - 1, i + 1)));
  return el("div", { className: "row" }, prev, next);
}
function goPlate(i) { anchor = null; snapTo(Math.round(PLATES[i].focus)); }
function renderMode() {
  body.replaceChildren();
  if (mode === "zoom") {
    body.append(el("p", { className: "dim", textContent: "Scroll, pinch or drag to zoom. Each whole power of ten is a stop." }), jumpButtons());
  } else if (mode === "hunt") {
    const skip = el("button", { type: "button", textContent: "New card" });
    skip.addEventListener("click", () => { hunt.target = nextHunt(hunt.target.id); renderMode(); });
    body.append(el("p", { className: "big", textContent: `Find: ${hunt.target.name}` }),
      el("div", { className: "row" }, el("span", { className: "dim", textContent: `Zoom until it fills the view. Found: ${hunt.finds}` }), skip));
  } else if (mode === "predict") {
    const p = PREDICTIONS[pred.i % PREDICTIONS.length];
    body.append(el("p", { className: "big", textContent: p.q }));
    if (pred.state === "ask") {
      const row = el("div", { className: "row fun-predict" });
      for (const c of choicesFor(p)) { const b = el("button", { type: "button", textContent: String(c) }); b.addEventListener("click", () => runPrediction(p, c)); row.appendChild(b); }
      body.append(row);
    } else if (pred.state === "run") {
      body.append(el("p", { className: "dim", id: "runCount", textContent: "Zooming..." }));
    } else {
      const r = pred.result, next = el("button", { type: "button", textContent: "Next question", className: "fun-primary" });
      next.addEventListener("click", () => { pred.i++; pred.state = "ask"; renderMode(); });
      body.append(el("p", { textContent: r.correct ? `Yes: ${r.actual} powers of ten.` : `It was ${r.actual}. You said ${r.guess}.` }), el("div", { className: "row" }, next));
    }
  } else if (mode === "sandbox") {
    const sel = (key) => { const s = el("select", { "aria-label": key === "a" ? "First object" : "Second object" });
      s.setAttribute("aria-label", key === "a" ? "First object" : "Second object");
      for (const p of PLATES) s.appendChild(el("option", { value: p.id, textContent: p.name, selected: sandbox[key] === p.id }));
      s.addEventListener("change", () => { sandbox[key] = s.value; renderMode(); }); return s; };
    const A = byId(sandbox.a), B = byId(sandbox.b), k = powersBetween(A, B);
    const cmp = k === 0 ? `${A.name} and ${B.name} are within a power of ten of each other.` : k > 0 ? `${B.name} is about ${formatPower(k).replace(" m", "")} times bigger than ${A.name.toLowerCase()}.` : `${B.name} is about ${formatPower(-k).replace(" m", "")} times smaller than ${A.name.toLowerCase()}.`;
    const ja = el("button", { type: "button", textContent: "Go to first" }), jb = el("button", { type: "button", textContent: "Go to second" });
    ja.addEventListener("click", () => goPlate(PLATES.indexOf(A))); jb.addEventListener("click", () => goPlate(PLATES.indexOf(B)));
    const ruler = el("button", { type: "button", textContent: "Scale bar" }); ruler.setAttribute("aria-pressed", String(sandbox.ruler));
    ruler.addEventListener("click", () => { sandbox.ruler = !sandbox.ruler; ruler.setAttribute("aria-pressed", String(sandbox.ruler)); dirty = true; });
    const sh = el("button", { type: "button", textContent: "Share my setup" });
    sh.addEventListener("click", async () => { const r = await shareLink(encodeState(sanitizeState({ z: Math.round(Z.z * 100) / 100, ...sandbox }, SHARE_SCHEMA))); sh.textContent = r.copied ? "Link copied" : "Link in address bar"; setTimeout(() => { sh.textContent = "Share my setup"; }, 1600); });
    body.append(el("div", { className: "row" }, sel("a"), sel("b")), el("p", { textContent: cmp }), el("div", { className: "row" }, ja, jb, ruler, sh));
  }
}

// Predict, then run: guess first, then the view zooms from A to B, slowing near the end.
function runPrediction(p, guess) {
  prediction.predict(guess); pred.state = "run"; renderMode();
  const a = byId(p.a), b = byId(p.b);
  anchor = null; Z.target = null; setZ(a.focus);
  Z.run = { from: a.focus, to: b.focus, t: 0, dur: reduced() ? 0.01 : 1.2 + 0.35 * Math.abs(b.focus - a.focus), done: () => {
    const r = prediction.resolve(p.answer); pred.result = r; pred.state = "done";
    card.streak(r.streak.count, r.streak.best);
    if (r.correct) celebrate();
    report({ type: "predict", streak: r.streak.count });
    renderMode(); sheet?.layout();
  } };
}

// Called when a snap comes to rest on a detent.
function settled() {
  if (mode === "hunt" && hunt.target && huntFound(hunt.target, Z.z)) {
    hunt.finds++; celebrate(); report({ type: "hunt", finds: hunt.finds });
    const found = hunt.target.name; hunt.target = nextHunt(hunt.target.id); renderMode();
    body.prepend(el("p", { textContent: `Found the ${found.toLowerCase()}!` }));
  }
  if (mode === "zoom") renderMode();
}

// ---------- caption + readout ----------
let lastMain = -1, capH = 72;
const CAP_GAP = 12;
function syncText(main) {
  const n = Math.round(Z.z);
  $("power").textContent = formatPower(n);
  $("zoom").setAttribute("aria-valuetext", `10 to the ${n} meters`);
  const cap = $("plateCaption");
  if (!main || main.alpha < 0.5) { cap.hidden = true; return; }
  const p = PLATES[main.i];
  if (main.i !== lastMain) {
    lastMain = main.i;
    $("pcName").textContent = p.name; $("pcSize").textContent = `About ${plainSize(p.size)}`; $("pcNote").textContent = p.caption;
    $("about").textContent = `View: about ${plainSize(10 ** n)} tall`;
    canvas.setAttribute("aria-label", `${p.alt}. ${p.caption}`);
  }
  $("about").textContent = `View: about ${plainSize(10 ** n)} tall`;
  cap.hidden = false;
  const box = freeBox(), h = cap.offsetHeight, W = canvas.clientWidth;
  const x = Math.min(W - 12 - cap.offsetWidth / 2, Math.max(12 + cap.offsetWidth / 2, main.x + main.s / 2));
  // Caption sits CAP_GAP px under the plate's drawn box, never below the top of the controls.
  const y = Math.min(box.bottom - h, Math.max(box.top, main.y + main.s + CAP_GAP));
  if (h > capH) { capH = h; dirty = true; } // taller caption: redraw with more room under the plate
  cap.style.left = x + "px"; cap.style.top = y + "px";
}
// Area between the readout and the controls, where plates are drawn.
function freeBox() {
  const top = $("scaleNote").getBoundingClientRect().bottom + 12;
  const cb = $("controls").getBoundingClientRect();
  const bottom = Math.min(window.innerHeight, cb.top) - 8;
  return { top, bottom };
}

// ---------- phones: controls as a bottom sheet ----------
const phone = matchMedia("(max-width: 600px)");
let sheet = null;
const snaps = () => {
  const c = $("controls"), tabs = c.querySelector(".tabs"), zr = c.querySelector(".zoom-row");
  const peek = Math.ceil(tabs.offsetHeight + zr.offsetHeight + 60);
  const full = Math.max(peek + 40, Math.ceil(tabs.offsetHeight + zr.offsetHeight + body.scrollHeight + 76));
  return [peek, Math.max(peek + 1, Math.round((peek + full) / 2)), full];
};
function syncPeek() { dirty = true; }
function phoneSync() {
  if (phone.matches && !sheet) { $("controls").classList.add("fun-sheet-on", "fun-sheet"); sheet = bottomSheet($("controls"), $("sheetHandle"), { getSnaps: snaps, start: 2 }); }
  else if (!phone.matches && sheet) { sheet.destroy(); sheet = null; $("controls").classList.remove("fun-sheet-on", "fun-sheet"); }
}
phone.addEventListener?.("change", phoneSync);
addEventListener("resize", () => { phoneSync(); sheet?.layout(); dirty = true; });

// ---------- loop ----------
const palette = () => ({ ink: getComputedStyle(root).getPropertyValue("--pt-ink").trim() });
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (Z.run) {
    const r = Z.run; r.t = Math.min(1, r.t + dt / r.dur);
    const e = 1 - Math.pow(1 - r.t, 3); // eases out: the last powers go by in slow motion
    setZ(r.from + (r.to - r.from) * e);
    const c = $("runCount"); if (c) c.textContent = `Powers so far: ${Math.max(0, Math.round(Z.z - r.from))}`;
    if (r.t >= 1) { Z.run = null; r.done(); }
  } else if (Z.target !== null && !drag) {
    const s = springStep({ x: Z.z, v: Z.v }, Z.target, dt, { response: 0.35, damping: 1.0 });
    Z.v = s.v; setZ(s.x);
    if (Math.abs(Z.z - Z.target) < 0.002 && Math.abs(Z.v) < 0.02) { setZ(Z.target); Z.target = null; Z.v = 0; settled(); }
  }
  if (dirty) {
    dirty = false;
    const box = freeBox();
    const main = R.draw({ z: Z.z, anchor, box, reserve: capH + CAP_GAP, palette: palette(), ruler: mode === "sandbox" ? sandbox.ruler : false });
    syncText(main);
  }
  requestAnimationFrame(frame);
}
renderMode(); phoneSync();
if (Object.keys(share).length) setMode("sandbox");
$("zoom").value = String(Z.z); setZ(Z.z);
requestAnimationFrame(frame);
window.__p10 = { get z() { return Z.z; }, setZ: (z) => { Z.target = null; Z.run = null; setZ(z); }, snapTo, setMode, plates: PLATES, Z_MIN, Z_MAX, FUN };
