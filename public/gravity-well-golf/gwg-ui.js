// Gravity Well Golf: input (pull back to putt, drag masses with springs), course and sandbox
// modes, the caveat card, predict-then-run and the fun layer. Physics: gwg-physics.js. View: gwg-scene.js.
import { forwardStudyQuery } from "../board-return.js?v=20261022a";
import {
  MODULE_ID, CAVEAT, MODEL_LABEL, CUP_LABEL, W, H, BALL_R, KINDS, TRAY_KINDS, P, COURSE, GOALS, FUN, SHARE_SCHEMA,
  step, puttVelocity, massRadius, canPlace, scoreName, judgePrediction, packMasses, unpackMasses
} from "./gwg-physics.js";
import { createScene } from "./gwg-scene.js";
import {
  initFun, pressFeedback, smoothTheme, prefers, challengeCard, disclosure, createChallenges, createStreak, createPrediction,
  TIERS, bottomSheet, springStep, rubberBand, encodeState, decodeState, sanitizeState, shareLink, celebrate, tick, buzz, sound
} from "../shared/fun/fun-ui.js";

const $ = (id) => document.getElementById(id);
const root = document.documentElement;
const THEME_KEY = "popboard.gravity-well-golf.theme", CAVEAT_KEY = "popboard.gravity-well-golf.caveatSeen", PAR_KEY = "popboard.fun.gravity-well-golf.parHoles";
initFun(); pressFeedback();
const reduced = () => prefers.reducedMotion;
const el = (tag, props = {}, ...kids) => { const n = Object.assign(document.createElement(tag), props); n.append(...kids); return n; };
const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };

// ---------- caveat card: first load and behind "?" ----------
$("caveatText").textContent = "\u201c" + CAVEAT + "\u201d";
$("caveatModel").textContent = `In this game: ${MODEL_LABEL.replace("Pull: ", "the pull is ")}. ${CUP_LABEL}`;
let lastFocus = null;
function openCaveat() { lastFocus = document.activeElement; $("caveat").hidden = false; $("caveatOk").focus(); }
function closeCaveat() { $("caveat").hidden = true; store.set(CAVEAT_KEY, "1"); (lastFocus || $("scene")).focus?.(); }
$("helpBtn").addEventListener("click", openCaveat);
$("caveatOk").addEventListener("click", closeCaveat);
$("caveat").addEventListener("keydown", (e) => { if (e.key === "Escape") closeCaveat(); if (e.key === "Tab") { e.preventDefault(); $("caveatOk").focus(); } });
$("modelLabel").textContent = MODEL_LABEL + ". The sheet is a model of curved spacetime.";

// ---------- theme, sound, back ----------
const scene = createScene($("scene"));
const css = (n) => getComputedStyle(root).getPropertyValue(n).trim();
function palette() {
  const light = root.getAttribute("data-theme") === "light";
  return light ? { light, sheet: "#efe9dc", grid: "#2a7d8a", gridOpacity: 0.5, ring: "#2a9d8f", aim: "#1d2633", tee: "#5a6474" }
    : { light, sheet: "#141b26", grid: "#3fc6dc", gridOpacity: 0.42, ring: "#45c9b5", aim: "#ffffff", tee: "#8fa3b8" };
}
function syncTheme() {
  const light = root.getAttribute("data-theme") === "light";
  $("themeLabel").textContent = light ? "Dark" : "Paper";
  $("themeBtn").setAttribute("aria-label", light ? "Switch to the dark theme" : "Switch to the Paper theme");
  scene.setPalette(palette());
}
$("themeBtn").addEventListener("click", () => {
  smoothTheme(); const t = root.getAttribute("data-theme") === "light" ? "dark" : "light";
  root.setAttribute("data-theme", t); store.set(THEME_KEY, t); syncTheme();
});
syncTheme();
function syncSound() { $("soundBtn").setAttribute("aria-pressed", String(sound.on)); $("soundBtn").setAttribute("aria-label", sound.on ? "Sound is on" : "Sound is off"); }
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
}
chipSync(); card.streak(0, streak.best);
const parHoles = () => { try { const v = JSON.parse(store.get(PAR_KEY) || "[]"); return Array.isArray(v) ? v : []; } catch (e) { return []; } };
function toast(msg) { const t = $("toast"); t.textContent = msg; t.hidden = false; clearTimeout(toast._t); toast._t = setTimeout(() => { t.hidden = true; }, 2200); }

// ---------- state ----------
const share = sanitizeState(decodeState(location.hash), SHARE_SCHEMA);
const sharedMasses = (() => { const m = /[#&]m=([^&]*)/.exec(location.hash); return m ? unpackMasses(decodeURIComponent(m[1])) : []; })();
let mode = "course", holeIdx = 0, strokes = 0, sunk = false;
let layout = null;          // { tee, cup, masses:[{kind,x,y,movable}] }
const ball = { x: 0, y: 0, vx: 0, vy: 0, moving: false, hidden: false, t: 0 };
const sandbox = {
  tee: { x: share.tx ?? -6, y: share.ty ?? 0 }, cup: { x: share.cx ?? 6, y: share.cy ?? 0 },
  masses: sharedMasses.length ? sharedMasses.map((m) => ({ ...m, movable: true })) : [{ kind: "planet", x: 0, y: 0.8, movable: true }],
  friction: share.friction ?? true, trail: share.trail ?? true
};
let trayLeft = [];
const isSandbox = () => mode === "sandbox";
const frictionOn = () => (isSandbox() ? sandbox.friction : true);

function loadHole() {
  const h = COURSE[holeIdx];
  layout = { tee: { ...h.tee }, cup: { ...h.cup }, masses: h.masses.map((m) => ({ ...m, movable: false })) };
  trayLeft = [...h.tray]; strokes = 0; sunk = false; resetBall(); applyLayout();
}
function loadSandbox() { layout = sandbox; resetBall(); applyLayout(); }
function applyLayout() { scene.setLayout(layout, layout.masses); scene.setBall(ball); scene.showTrail(isSandbox() ? sandbox.trail : true); syncScore(); renderMode(); }
function resetBall() { Object.assign(ball, { x: layout.tee.x, y: layout.tee.y, vx: 0, vy: 0, moving: false, hidden: false, t: 0 }); scene.clearTrail(); scene.setBall?.(ball); }
function syncScore() {
  if (isSandbox()) { $("holeName").textContent = "Sandbox"; $("holeStats").textContent = `Strokes ${strokes}`; return; }
  const h = COURSE[holeIdx];
  $("holeName").textContent = `Hole ${h.n}: ${h.name}`;
  $("holeStats").textContent = `Par ${h.par}  |  Strokes ${strokes}`;
}

// ---------- modes / controls ----------
const body = $("modeBody");
for (const t of document.querySelectorAll(".tabs [role=tab]")) t.addEventListener("click", () => setMode(t.dataset.mode));
function setMode(m) {
  mode = m; strokes = 0;
  for (const t of document.querySelectorAll(".tabs [role=tab]")) t.setAttribute("aria-selected", String(t.dataset.mode === m));
  if (m === "course") loadHole(); else loadSandbox();
  layoutUI();
}
let guess = null;
function predictRow() {
  const row = el("div", { className: "row fun-predict" }, el("span", { className: "dim", textContent: "Will the next putt go in?" }));
  for (const [label, v] of [["Yes", true], ["No", false]]) {
    const b = el("button", { type: "button", textContent: label }); b.setAttribute("aria-pressed", String(guess === v));
    b.addEventListener("click", () => { guess = guess === v ? null : v; if (guess === null) prediction.predict(null); else prediction.predict(guess); renderMode(); });
    row.appendChild(b);
  }
  return row;
}
function trayButton(kind, onAdd) {
  const b = el("button", { type: "button", className: "tray-btn" }, el("img", { src: `gravity-well-golf/sprites/${KINDS[kind].sprite}`, alt: "" }), `Add ${KINDS[kind].name.toLowerCase()}`);
  b.addEventListener("click", () => onAdd(kind)); return b;
}
function addMass(kind) {
  for (let i = 0; i < 400; i++) {
    const x = (Math.random() - 0.5) * (W - 3), y = (Math.random() - 0.5) * (H - 3);
    const others = { tee: layout.tee, cup: layout.cup, masses: layout.masses };
    if (canPlace(kind, x, y, others) && Math.hypot(x - ball.x, y - ball.y) > massRadius(kind) + 0.6) { layout.masses.push({ kind, x, y, movable: true }); scene.setLayout(layout, layout.masses); return true; }
  }
  toast("No room for that one"); return false;
}
function renderMode() {
  body.replaceChildren();
  const reset = el("button", { type: "button", textContent: "Ball to tee" }); reset.addEventListener("click", () => { if (!sunk) resetBall(); });
  if (!isSandbox()) {
    const h = COURSE[holeIdx];
    const prev = el("button", { type: "button", textContent: "Previous hole", disabled: holeIdx === 0 }), next = el("button", { type: "button", textContent: sunk ? "Next hole" : "Skip hole", disabled: holeIdx === COURSE.length - 1, className: sunk ? "primary" : "" });
    prev.addEventListener("click", () => { holeIdx--; loadHole(); layoutUI(); }); next.addEventListener("click", () => { holeIdx++; loadHole(); layoutUI(); });
    body.append(el("p", { className: "dim", textContent: sunk ? `${scoreName(strokes, h.par)} in ${strokes}.` : "Pull back from the ball and let go to putt." }), predictRow());
    if (trayLeft.length) body.append(el("div", { className: "row" }, ...trayLeft.map((k, i) => trayButton(k, (kind) => { if (addMass(kind)) { trayLeft.splice(i, 1); renderMode(); toast("Drag it where you want it"); } }))));
    body.append(el("div", { className: "row" }, prev, reset, next));
  } else {
    const tog = (label, key, after) => { const b = el("button", { type: "button", textContent: label }); b.setAttribute("aria-pressed", String(sandbox[key])); b.addEventListener("click", () => { sandbox[key] = !sandbox[key]; b.setAttribute("aria-pressed", String(sandbox[key])); after?.(); }); return b; };
    const clear = el("button", { type: "button", textContent: "Clear masses" }); clear.addEventListener("click", () => { sandbox.masses.length = 0; scene.setLayout(layout, layout.masses); });
    const sh = el("button", { type: "button", textContent: "Share my hole" });
    sh.addEventListener("click", async () => {
      const st = sanitizeState({ tx: sandbox.tee.x, ty: sandbox.tee.y, cx: sandbox.cup.x, cy: sandbox.cup.y, friction: sandbox.friction, trail: sandbox.trail }, SHARE_SCHEMA);
      const r = await shareLink(encodeState(st) + "&m=" + encodeURIComponent(packMasses(sandbox.masses)));
      sh.textContent = r.copied ? "Link copied" : "Link in address bar"; setTimeout(() => { sh.textContent = "Share my hole"; }, 1600);
    });
    body.append(el("p", { className: "dim", textContent: "Drag masses, the tee and the cup. Pull back from the ball to putt." }),
      el("div", { className: "row" }, ...TRAY_KINDS.map((k) => trayButton(k, addMass))),
      el("div", { className: "row" }, tog("Friction", "friction"), tog("Trail", "trail", () => scene.showTrail(sandbox.trail)), reset),
      el("div", { className: "row" }, clear, sh), predictRow());
  }
  sheet?.layout(); requestFit();
}

// ---------- input: putt, drag masses / tee / cup ----------
const canvas = $("scene");
let drag = null;   // {type:"aim"} | {type:"mass", m, dx, dy, home, vx, vy, lt, lx, ly} | {type:"tee"|"cup", ...}
const springs = []; // masses springing back to a legal spot
function pick(p) {
  if (!ball.moving && !sunk && Math.hypot(p.x - ball.x, p.y - ball.y) < 0.9) return { type: "aim" };
  for (let i = layout.masses.length - 1; i >= 0; i--) { const m = layout.masses[i]; if (m.movable && Math.hypot(p.x - m.x, p.y - m.y) < massRadius(m.kind) + 0.2) return { type: "mass", m }; }
  if (isSandbox() && !ball.moving) {
    if (Math.hypot(p.x - layout.cup.x, p.y - layout.cup.y) < 0.6) return { type: "cup", m: layout.cup };
    if (Math.hypot(p.x - layout.tee.x, p.y - layout.tee.y) < 0.6) return { type: "tee", m: layout.tee };
  }
  return null;
}
canvas.addEventListener("pointerdown", (e) => {
  const p = scene.toWorld(e.clientX, e.clientY); if (!p) return;
  const d = pick(p); if (!d) return;
  canvas.setPointerCapture?.(e.pointerId);
  if (d.type === "aim") { drag = { type: "aim", p }; return; }
  const i = springs.findIndex((s) => s.m === d.m); if (i >= 0) springs.splice(i, 1);
  drag = { ...d, dx: p.x - d.m.x, dy: p.y - d.m.y, home: { x: d.m.x, y: d.m.y }, vx: 0, vy: 0, lt: performance.now(), lx: d.m.x, ly: d.m.y };
});
canvas.addEventListener("pointermove", (e) => {
  if (!drag) return;
  const p = scene.toWorld(e.clientX, e.clientY); if (!p) return;
  if (drag.type === "aim") { drag.p = p; const v = puttVelocity(p.x - ball.x, p.y - ball.y), k = 0.35; scene.setAim({ x0: ball.x, y0: ball.y, x1: ball.x + v.vx * k, y1: ball.y + v.vy * k }); return; }
  const m = drag.m, r = drag.type === "mass" ? massRadius(m.kind) : 0.3;
  // 1:1 with the grab offset; rubber-banded past the field edges.
  m.x = rubberBand(p.x - drag.dx, -W / 2 + r, W / 2 - r, 1.2); m.y = rubberBand(p.y - drag.dy, -H / 2 + r, H / 2 - r, 1.2);
  const now = performance.now(), dt = Math.max(1, now - drag.lt) / 1000;
  drag.vx = 0.8 * (m.x - drag.lx) / dt + 0.2 * drag.vx; drag.vy = 0.8 * (m.y - drag.ly) / dt + 0.2 * drag.vy; drag.lx = m.x; drag.ly = m.y; drag.lt = now;
  if (drag.type === "mass") scene.moveMasses(layout.masses); else scene.setLayout(layout, layout.masses);
  if (drag.type === "tee" && !ball.moving) resetBall();
});
const endDrag = () => {
  if (!drag) return;
  const d = drag; drag = null;
  if (d.type === "aim") {
    scene.setAim(null);
    const pull = { x: d.p.x - ball.x, y: d.p.y - ball.y };
    if (Math.hypot(pull.x, pull.y) < 0.15) return;
    const v = puttVelocity(pull.x, pull.y);
    Object.assign(ball, { vx: v.vx, vy: v.vy, moving: true, t: 0 }); strokes++; syncScore(); scene.clearTrail(); tick(440);
    return;
  }
  const m = d.m;
  let target = null;
  if (d.type === "mass") {
    const others = { tee: layout.tee, cup: layout.cup, masses: layout.masses.filter((x) => x !== m) };
    const legal = canPlace(m.kind, m.x, m.y, others) && Math.hypot(m.x - ball.x, m.y - ball.y) > massRadius(m.kind) + BALL_R;
    if (!legal) target = d.home;
  } else {
    const clampTo = (v, lim) => Math.max(-lim, Math.min(lim, v));
    target = { x: clampTo(m.x, W / 2 - 0.5), y: clampTo(m.y, H / 2 - 0.5) };
    if (target.x === m.x && target.y === m.y) target = null;
  }
  if (target) springs.push({ m, sx: { x: m.x, v: d.vx }, sy: { x: m.y, v: d.vy }, target, kind: d.type });
  else if (d.type === "mass") { tick(700); buzz(10); }
};
canvas.addEventListener("pointerup", endDrag); canvas.addEventListener("pointercancel", endDrag);
canvas.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (!ball.moving && !sunk) { const dx = layout.cup.x - ball.x, dy = layout.cup.y - ball.y, d = Math.hypot(dx, dy); const v = puttVelocity(-dx / d * 1.2, -dy / d * 1.2); Object.assign(ball, { vx: v.vx, vy: v.vy, moving: true, t: 0 }); strokes++; syncScore(); } } });

// ---------- putt resolution ----------
function finishPutt(inCup) {
  ball.moving = false;
  const r = prediction.pending ? prediction.resolve(inCup) : null;
  if (r) { card.streak(r.streak.count, r.streak.best); guess = null; toast(r.correct ? "You called it" : inCup ? "It went in after all" : "Not this time"); }
  if (inCup) {
    sunk = true; ball.hidden = true; scene.setBall(ball); celebrate();
    let ph = parHoles();
    if (!isSandbox()) {
      const h = COURSE[holeIdx];
      if (strokes <= h.par && !ph.includes(h.n)) { ph = [...ph, h.n]; store.set(PAR_KEY, JSON.stringify(ph)); }
      toast(scoreName(strokes, h.par));
    } else toast("In the cup");
    if (engine.report({ type: "sunk", mode, hole: isSandbox() ? 0 : COURSE[holeIdx].n, strokes, parHoles: ph.length }).length) chipSync();
    if (isSandbox()) setTimeout(() => { sunk = false; resetBall(); }, 1200);
  }
  renderMode();
}

// ---------- layout: camera fit and bottom sheet ----------
const phone = matchMedia("(max-width: 600px)");
let sheet = null;
const snaps = () => { const tabs = $("controls").querySelector(".tabs"); const peek = Math.ceil(tabs.offsetHeight + 56); const full = Math.max(peek + 40, Math.ceil(tabs.offsetHeight + body.scrollHeight + 64)); return [peek, Math.max(peek + 1, Math.round((peek + full) / 2)), full]; };
function phoneSync() {
  if (phone.matches && !sheet) { $("controls").classList.add("fun-sheet-on", "fun-sheet"); sheet = bottomSheet($("controls"), $("sheetHandle"), { getSnaps: snaps, start: 1, onSnap: () => setTimeout(requestFit, 350) }); }
  else if (!phone.matches && sheet) { sheet.destroy(); sheet = null; $("controls").classList.remove("fun-sheet-on", "fun-sheet"); }
}
let fitQueued = false;
function requestFit() { if (fitQueued) return; fitQueued = true; requestAnimationFrame(() => { fitQueued = false; fit(); }); }
// Fit the field into the space between the scorecard and the controls.
function fit() {
  scene.setFit(1, 0);
  const top = $("holeStats").getBoundingClientRect().bottom + 12, ctl = $("controls").getBoundingClientRect();
  const bottom = Math.min(innerHeight, ctl.top) - (phone.matches ? 30 : 42); // desktop: room for the caption 12px below the board
  root.style.setProperty("--gw-ctl", Math.max(0, innerHeight - ctl.top) + "px");
  let pad = 1, shift = 0;
  const box = () => { const pts = [[-W / 2, -H / 2], [W / 2, -H / 2], [W / 2, H / 2], [-W / 2, H / 2]].map(([x, y]) => scene.toScreen(x, y));
    return { minY: Math.min(...pts.map((p) => p.y)), maxY: Math.max(...pts.map((p) => p.y)), minX: Math.min(...pts.map((p) => p.x)), maxX: Math.max(...pts.map((p) => p.x)) }; };
  for (let k = 0; k < 8; k++) {
    scene.setFit(pad, shift);
    const b = box();
    const need = Math.max((b.maxY - b.minY) / Math.max(60, bottom - top), (b.maxX - b.minX) / (innerWidth - 16));
    pad *= Math.min(2, Math.max(0.5, need));
    scene.setFit(pad, shift);
    const c = box(), wpp = (scene.portrait ? H : W) / Math.max(1, c.maxX - c.minX);
    shift -= ((c.minY + c.maxY) / 2 - (top + bottom) / 2) * wpp;
  }
  scene.setFit(pad, shift);
  // Desktop: anchor the model caption 12px below the board's bounding box so it never touches the sheet.
  const lbl = $("modelLabel");
  if (phone.matches) { lbl.style.top = ""; lbl.style.bottom = ""; }
  else { lbl.style.top = Math.round(box().maxY + 12) + "px"; lbl.style.bottom = "auto"; }
}
function layoutUI() { phoneSync(); sheet?.layout(); requestFit(); }
phone.addEventListener?.("change", layoutUI);
addEventListener("resize", () => { scene.resize(); layoutUI(); });

// ---------- loop ----------
let last = performance.now();
function frame(now) {
  const real = Math.min(0.05, (now - last) / 1000); last = now;
  for (let i = springs.length - 1; i >= 0; i--) {
    const s = springs[i]; s.sx = springStep(s.sx, s.target.x, real); s.sy = springStep(s.sy, s.target.y, real);
    s.m.x = s.sx.x; s.m.y = s.sy.x;
    const done = reduced() || (Math.abs(s.m.x - s.target.x) + Math.abs(s.m.y - s.target.y) < 0.004 && Math.abs(s.sx.v) + Math.abs(s.sy.v) < 0.02);
    if (done) { s.m.x = s.target.x; s.m.y = s.target.y; springs.splice(i, 1); }
    if (s.kind === "mass") scene.moveMasses(layout.masses); else { scene.setLayout(layout, layout.masses); if (s.kind === "tee" && !ball.moving) resetBall(); }
  }
  if (ball.moving) {
    // Predict, then run: slow motion near the cup while a guess is waiting (the key moment).
    const near = Math.hypot(ball.x - layout.cup.x, ball.y - layout.cup.y) < 1.4;
    const scale = prediction.pending && near && !reduced() ? 0.35 : 1;
    let left = real * scale, done = null;
    while (left > 1e-9 && !done) {
      const dt = Math.min(P.dt, left); left -= dt; ball.t += dt;
      for (const ev of step(ball, layout.cup, { masses: layout.masses, friction: frictionOn(), dt })) {
        if (ev.type === "hit" && ev.speed > 0.4) { scene.puff(ev.x, ev.y, layout.masses, now); tick(300); buzz(10); }
        if (ev.type === "cup") done = "cup"; else if (ev.type === "stop") done = "stop";
      }
      if (ball.t > P.maxTime) done = "stop";
    }
    scene.setBall(ball); scene.addTrail(ball.x, ball.y);
    if (done) {
      if (done === "cup") { ball.x = layout.cup.x; ball.y = layout.cup.y; }
      finishPutt(done === "cup");
    }
  }
  scene.render(now, reduced());
  requestAnimationFrame(frame);
}
scene.resize();
if (Object.keys(share).length || sharedMasses.length) setMode("sandbox"); else setMode("course");
if (!store.get(CAVEAT_KEY)) openCaveat();
requestAnimationFrame(frame);
window.__gwg = { ball, get layout() { return layout; }, setMode, goHole: (i) => { holeIdx = i; loadHole(); layoutUI(); }, scene, P, FUN, openCaveat, closeCaveat,
  putt: (vx, vy) => { Object.assign(ball, { vx, vy, moving: true, t: 0 }); strokes++; syncScore(); } };
