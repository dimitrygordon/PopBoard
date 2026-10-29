// Plate Tectonics: input (drag the right plate with springs), guided / sandbox / fossil match modes,
// the time scrubber, predict-then-run and the fun layer. Model: pt-model.js. View: pt-scene.js.
import { forwardStudyQuery } from "../board-return.js?v=20261022a";
import {
  MODULE_ID, RIDGE_CAPTION, MANTLE_LABEL, MANTLE_INFO, SCALE_LABEL, MAX_RATE, MAX_TIME, BOUNDARY, T, FUN, GOALS, PREDICT, SCENES, SHARE_SCHEMA, FOSSILS,
  classify, outcome, stepFault, judgePrediction, isIceland, fossilFit
} from "./pt-model.js";
import { createScene, loadArt, FX_MS } from "./pt-scene.js";
import {
  initFun, pressFeedback, smoothTheme, prefers, challengeCard, disclosure, createChallenges, createStreak, createPrediction,
  TIERS, bottomSheet, springStep, rubberBand, encodeState, decodeState, sanitizeState, shareLink, celebrate, tick, buzz, sound
} from "../shared/fun/fun-ui.js";

const phone = matchMedia("(max-width: 600px)"), wide = matchMedia("(min-width: 900px)");
const $ = (id) => document.getElementById(id);
const root = document.documentElement;
const THEME_KEY = "popboard.plate-tectonics.theme", FOSSIL_KEY = "popboard.fun.plate-tectonics.pangaea";
initFun(); pressFeedback();
const reduced = () => prefers.reducedMotion;
const el = (tag, props = {}, ...kids) => { const n = Object.assign(document.createElement(tag), props); n.append(...kids); return n; };
const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
const fmt = (v) => (Math.abs(v) < 0.05 ? "0" : v.toFixed(1));

// ---------- about card ("?") ----------
$("aboutMantle").textContent = MANTLE_INFO;
$("aboutScale").textContent = SCALE_LABEL + " Plates move a few centimeters a year, so time here runs in millions of years.";
const syncLabel = () => { $("modelLabel").textContent = phone.matches ? "Mantle: solid rock that flows slowly. Not to scale." : MANTLE_LABEL + " " + SCALE_LABEL; };
let lastFocus = null;
function openAbout() { lastFocus = document.activeElement; $("about").hidden = false; $("aboutOk").focus(); }
function closeAbout() { $("about").hidden = true; (lastFocus || $("scene")).focus?.(); }
$("helpBtn").addEventListener("click", openAbout);
$("aboutOk").addEventListener("click", closeAbout);
$("about").addEventListener("keydown", (e) => { if (e.key === "Escape") closeAbout(); if (e.key === "Tab") { e.preventDefault(); $("aboutOk").focus(); } });

// ---------- theme, sound, back ----------
const canvas = $("scene");
const imgs = await loadArt();
const scene = createScene(canvas, imgs);
function palette() {
  const light = root.getAttribute("data-theme") === "light";
  return light
    ? { ink: "#231c17", inkOn: "#231c17", dim: "#5a4c40", accent: "#a4492a", handle: "#fbf6ee", sky: "#efe6d8", sea: "rgba(80, 88, 96, 0.22)", flow: "rgba(35, 28, 23, 0.55)", plume: "rgba(164, 73, 42, 0.16)", fossil: ["rgba(35,28,23,0.30)", "rgba(35,28,23,0.18)", "rgba(164,73,42,0.30)"] }
    : { ink: "#14100d", inkOn: "#1b1714", dim: "#c2b5a6", accent: "#c0623d", handle: "#f3ece4", sky: "#1b1714", sea: "rgba(150, 160, 170, 0.4)", flow: "rgba(20, 16, 13, 0.6)", plume: "rgba(192, 98, 61, 0.18)", fossil: ["rgba(20,16,13,0.34)", "rgba(20,16,13,0.2)", "rgba(192,98,61,0.38)"] };
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
function toast(msg) { const t = $("toast"); t.textContent = msg; t.hidden = false; clearTimeout(toast._t); toast._t = setTimeout(() => { t.hidden = true; }, 2400); }
function report(e) { if (engine.report(e).length) { chipSync(); celebrate(); } }

// ---------- state ----------
const share = sanitizeState(decodeState(location.hash), SHARE_SCHEMA);
const st = { left: share.left || "oceanic", right: share.right || "oceanic", vx: share.vx ?? 0, vy: share.vy ?? 0, t: share.t ?? 0, hotspot: share.hotspot ?? false };
let mode = "guided", sceneId = SCENES[0].id, playing = false, fault = { stress: 0, quakes: 0 }, guess = null, lastType = null, lastPuff = 0;
const fx = { puffs: [], shake: 0, reduced: false };
const piece = { x: 30, y: 12, solved: store.get(FOSSIL_KEY) === "1" };
const pieceStart = () => { piece.x = 30; piece.y = 12; };

function applyScene(id) { const s = SCENES.find((x) => x.id === id); sceneId = id; Object.assign(st, { left: s.left, right: s.right, hotspot: s.hotspot, vx: 0, vy: 0, t: 0 }); resetRun(); }
function resetRun() { st.t = 0; playing = false; fault = { stress: 0, quakes: 0 }; fx.puffs.length = 0; renderMode(); }

// ---------- modes / controls ----------
const body = $("modeBody");
for (const t of document.querySelectorAll(".tabs [role=tab]")) t.addEventListener("click", () => setMode(t.dataset.mode));
function setMode(m) {
  mode = m; playing = false;
  for (const t of document.querySelectorAll(".tabs [role=tab]")) t.setAttribute("aria-selected", String(t.dataset.mode === m));
  if (m === "guided") applyScene(sceneId); else renderMode();
  $("status").hidden = m === "fossils"; $("modelLabel").hidden = m === "fossils";
  layoutUI();
}
const btn = (label, on, cls = "") => { const b = el("button", { type: "button", textContent: label, className: cls }); b.addEventListener("click", on); return b; };
const pressed = (b, v) => { b.setAttribute("aria-pressed", String(!!v)); return b; };
let timeOut = null, timeIn = null, playBtn = null, meter = null;
function timeRow() {
  playBtn = btn(playing ? "Pause" : "Run time", () => { if (st.t >= MAX_TIME) resetRun(); playing = !playing; syncTime(); }, "primary");
  timeIn = el("input", { type: "range", min: 0, max: MAX_TIME, step: 0.1, value: st.t }); timeIn.setAttribute("aria-label", "Time in millions of years");
  timeIn.addEventListener("input", () => { advance(Number(timeIn.value) - st.t); playing = false; syncTime(); });
  timeOut = el("output"); syncTime();
  return el("div", { className: "row time-row" }, playBtn, timeIn, timeOut);
}
function syncTime() { if (!timeIn) return; timeIn.value = st.t; timeOut.textContent = `${st.t.toFixed(1)} million yr`; playBtn.textContent = playing ? "Pause" : st.t >= MAX_TIME ? "Run again" : "Run time"; }
function predictRow() {
  const row = el("div", { className: "row fun-predict" }, el("span", { className: "dim", textContent: "What will form?" }));
  for (const p of PREDICT) row.appendChild(pressed(btn(p.label, () => { guess = guess === p.id ? null : p.id; prediction.predict(guess); renderMode(); }), guess === p.id));
  return row;
}
// The crust buttons always reflect st, even when st changes outside the buttons (share links, scenes, hooks).
let shownCrust = "";
function crustPick(side) {
  shownCrust = st.left + "/" + st.right;
  const row = el("div", { className: "row" }, el("span", { className: "dim", textContent: side === "left" ? "Left plate" : "Right plate" }));
  for (const [v, label] of [["oceanic", "Oceanic"], ["continental", "Continental"]]) { const b = pressed(btn(label, () => { st[side] = v; resetRun(); }), st[side] === v); b.dataset.crust = side; row.appendChild(b); }
  return row;
}
function renderMode() {
  body.replaceChildren(); timeIn = null; meter = null;
  if (mode === "fossils") {
    body.append(el("p", { className: "dim", textContent: piece.solved ? "Pangaea back together: the same fossils sit on both sides." : "Drag Africa until the coasts and the fossil bands line up with South America." }),
      el("p", { className: "dim", textContent: FOSSILS.map((f) => `${f.name}, ${f.note}`).join(". ") + "." }),
      el("div", { className: "row" }, btn("Pull them apart", () => { piece.solved = false; pieceStart(); renderMode(); })));
  } else {
    if (mode === "guided") {
      const s = SCENES.find((x) => x.id === sceneId);
      body.append(el("div", { className: "row" }, ...SCENES.map((x) => pressed(btn(x.name, () => applyScene(x.id)), x.id === sceneId))), el("p", { className: "dim", textContent: s.hint }));
    } else {
      const hs = pressed(btn("Hotspot", () => { st.hotspot = !st.hotspot; pressed(hs, st.hotspot); }), st.hotspot);
      const sh = btn("Share my setup", async () => { const r = await shareLink(encodeState(sanitizeState({ ...st }, SHARE_SCHEMA))); sh.textContent = r.copied ? "Link copied" : "Link in address bar"; setTimeout(() => { sh.textContent = "Share my setup"; }, 1600); });
      body.append(crustPick("left"), crustPick("right"), el("div", { className: "row" }, hs, sh));
    }
    meter = el("span"); 
    body.append(timeRow(), predictRow(), el("div", { className: "row" }, el("span", { className: "dim", textContent: "Fault stress" }), el("div", { className: "meter", role: "presentation" }, meter), btn("Stop plates", () => { st.vx = 0; st.vy = 0; resetRun(); })));
  }
  sheet?.layout(); requestFit();
}

// ---------- time ----------
function advance(dMyr) {
  if (shownCrust && shownCrust !== st.left + "/" + st.right && body.querySelector("[data-crust]")) renderMode();
  const before = st.t; st.t = Math.min(MAX_TIME, Math.max(0, st.t + dMyr)); const d = st.t - before;
  if (d > 0 && classify(st.vx, st.vy) === "transform") {
    fault = stepFault(fault, st.vy, d);
    if (fault.quake) { fx.puffs.push({ kind: "quake", t: performance.now() }); fx.shake = performance.now(); buzz(20); tick(180); toast("Quake! The stuck fault slipped"); report({ type: "quake" }); }
  }
  if (d < 0) fault.stress = 0;
}
function checkState(o) {
  report({ type: "state", iceland: isIceland(st, o), mountainKm: o.mountainKm });
  if (prediction.pending && o.feature !== "none" && st.t > 0) {
    const r = prediction.resolve(o.feature); guess = null; card.streak(r.streak.count, r.streak.best);
    toast(r.correct ? "You called it" : `It made ${o.feature === "subduction" ? "a trench and volcano" : o.feature === "quakes" ? "earthquakes" : o.feature === "rift" ? "a rift valley" : o.feature}`);
    renderMode();
  }
}
function syncStatus(o) {
  const type = o.type;
  if (type !== lastType) {
    $("boundary").textContent = BOUNDARY[type].name + (type === "none" ? "" : " boundary");
    if (lastType !== null && type !== "none") { tick(520); buzz(10); snap.s = { x: 0.82, v: 0 }; }
    lastType = type;
  }
  const rate = type === "transform" ? `${fmt(Math.abs(st.vy))} cm/yr sideways` : type === "none" ? "" : `${fmt(Math.abs(st.vx))} cm/yr ${st.vx > 0 ? "apart" : "together"}`;
  const extra = o.feature === "mountains" ? `, mountains ${o.mountainKm.toFixed(1)} km` : o.openKm > 0 ? `, ${Math.round(o.openKm)} km of new crust` : o.feature === "quakes" ? `, ${fault.quakes} quakes` : "";
  const text = type === "none" ? BOUNDARY.none.blurb : `${BOUNDARY[type].blurb} ${rate}${extra}.`;
  if ($("readout").textContent !== text) { const h = $("status").offsetHeight; $("readout").textContent = text; if ($("status").offsetHeight !== h) requestFit(); }
  canvas.setAttribute("aria-label", `Cross-section: ${st.left} plate on the left, ${st.right} plate on the right. ${$("readout").textContent}`);
}
const snap = { s: { x: 1, v: 0 } };

// ---------- input: drag the right plate or the fossil piece ----------
let drag = null, back = { x: { x: 0, v: 0 }, y: { x: 0, v: 0 } };
const local = (e) => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
canvas.addEventListener("pointerdown", (e) => {
  const p = local(e);
  if (mode === "fossils") { const u = scene.puzzleToUnits(p.x, p.y); if (u.x > 45 + piece.x - 12) { drag = { kind: "piece", u, x0: piece.x, y0: piece.y }; canvas.setPointerCapture?.(e.pointerId); } return; }
  if (!scene.hitRight(p.x, p.y)) return;
  const g = scene.geo;
  drag = { kind: "plate", p, vx0: st.vx, vy0: st.vy, inMap: p.y < g.y + g.mapH, dx: 0, dy: 0 };
  canvas.setPointerCapture?.(e.pointerId);
});
canvas.addEventListener("pointermove", (e) => {
  if (!drag) return;
  const p = local(e);
  if (drag.kind === "piece") { const u = scene.puzzleToUnits(p.x, p.y); piece.x = rubberBand(drag.x0 + u.x - drag.u.x, -20, 40, 6); piece.y = rubberBand(drag.y0 + u.y - drag.u.y, -20, 20, 6); return; }
  const g = scene.geo, per = g.w * 0.035, ddx = p.x - drag.p.x, ddy = drag.inMap ? p.y - drag.p.y : 0;
  drag.dx = rubberBand(ddx, -g.w * 0.3, g.w * 0.3, 30); drag.dy = rubberBand(ddy, -g.mapH * 0.4, g.mapH * 0.4, 20);
  st.vx = rubberBand(drag.vx0 + ddx / per, -MAX_RATE, MAX_RATE, 1); st.vy = rubberBand(drag.vy0 + ddy / per, -MAX_RATE, MAX_RATE, 1);
});
const endDrag = () => {
  if (!drag) return;
  const d = drag; drag = null;
  if (d.kind === "piece") {
    if (fossilFit(piece.x, piece.y)) { piece.springing = true; if (!piece.solved) { piece.solved = true; store.set(FOSSIL_KEY, "1"); celebrate(); toast("Fossils line up: these continents were once joined"); renderMode(); } }
    return;
  }
  st.vx = Math.max(-MAX_RATE, Math.min(MAX_RATE, Math.round(st.vx * 2) / 2)); st.vy = Math.max(-MAX_RATE, Math.min(MAX_RATE, Math.round(st.vy * 2) / 2));
  back = { x: { x: d.dx, v: 0 }, y: { x: d.dy, v: 0 } };
  if (classify(st.vx, st.vy) !== "none" && !playing) { if (st.t >= MAX_TIME) resetRun(); playing = true; syncTime(); }
};
canvas.addEventListener("pointerup", endDrag); canvas.addEventListener("pointercancel", endDrag);
canvas.addEventListener("keydown", (e) => {
  const k = { ArrowLeft: [-0.5, 0], ArrowRight: [0.5, 0], ArrowUp: [0, -0.5], ArrowDown: [0, 0.5] }[e.key];
  if (k && mode !== "fossils") { e.preventDefault(); st.vx = Math.max(-MAX_RATE, Math.min(MAX_RATE, st.vx + k[0])); st.vy = Math.max(-MAX_RATE, Math.min(MAX_RATE, st.vy + k[1])); }
  if (e.key === " " && mode !== "fossils") { e.preventDefault(); playing = !playing; syncTime(); }
});

// ---------- layout: stage box and bottom sheet (opens at the half stop on phones) ----------
let sheet = null;
const snaps = () => { const tabs = $("controls").querySelector(".tabs"); const peek = Math.ceil(tabs.offsetHeight + 56); const full = Math.max(peek + 40, Math.ceil(tabs.offsetHeight + body.scrollHeight + 64)); return [peek, Math.max(peek + 1, Math.round((peek + full) / 2)), full]; };
function phoneSync() {
  if (phone.matches && !sheet) { $("controls").classList.add("fun-sheet-on", "fun-sheet"); sheet = bottomSheet($("controls"), $("sheetHandle"), { getSnaps: snaps, start: 1, onSnap: () => setTimeout(requestFit, 350) }); $("controls").dataset.snap = "half"; }
  else if (!phone.matches && sheet) { sheet.destroy(); sheet = null; $("controls").classList.remove("fun-sheet-on", "fun-sheet"); }
}
let fitQueued = false;
function requestFit() { if (fitQueued) return; fitQueued = true; requestAnimationFrame(() => { fitQueued = false; fit(); }); }
function fit() {
  const ctl = $("controls").getBoundingClientRect();
  root.style.setProperty("--pt-ctl", Math.max(0, innerHeight - ctl.top) + "px");
  const top = (mode === "fossils" ? 64 : $("readout").getBoundingClientRect().bottom) + 12;
  if (wide.matches) {
    const w = Math.min(innerWidth - 416, 1100), bottom = innerHeight - (mode === "fossils" ? 16 : 40);
    scene.setBox({ x: 12 + (innerWidth - 416 - w) / 2, y: top, w, h: Math.max(160, bottom - top) }); return;
  }
  const bottom = Math.min(innerHeight, ctl.top) - (mode === "fossils" ? 12 : phone.matches ? 44 : 36);
  const w = Math.min(innerWidth - 24, 1100);
  scene.setBox({ x: (innerWidth - w) / 2, y: top, w, h: Math.max(160, bottom - top) });
}
function layoutUI() { syncLabel(); phoneSync(); sheet?.layout(); requestFit(); }
phone.addEventListener?.("change", layoutUI); wide.addEventListener?.("change", layoutUI);
addEventListener("resize", () => { scene.resize(); layoutUI(); });

// ---------- loop ----------
const place = (node, a) => { if (!a) { node.hidden = true; return; } node.hidden = false; node.style.left = Math.round(a.x) + "px"; node.style.top = Math.round(a.y) + "px"; };
let last = performance.now();
function frame(now) {
  const real = Math.min(0.05, (now - last) / 1000); last = now; fx.reduced = reduced();
  if (mode === "fossils") {
    if (piece.springing) { back.x = springStep({ x: piece.x, v: back.x.v || 0 }, 0, real); back.y = springStep({ x: piece.y, v: back.y.v || 0 }, 0, real); piece.x = back.x.x; piece.y = back.y.x; if (reduced() || Math.hypot(piece.x, piece.y) < 0.02) { piece.x = piece.y = 0; piece.springing = false; } }
    scene.drawPuzzle(piece, piece.solved && !drag);
    $("ridgeCaption").hidden = true; $("featureTag").hidden = true;
  } else {
    if (playing) {
      // Predict, then run: time runs slow until the key moment while a guess is waiting.
      const rate = prediction.pending && !reduced() ? 1.5 : 6;
      advance(real * rate); if (st.t >= MAX_TIME) playing = false; syncTime();
    }
    if (!drag) for (const k of ["x", "y"]) { back[k] = springStep(back[k], 0, real); if (reduced() || Math.abs(back[k].x) < 0.3) back[k] = { x: 0, v: 0 }; }
    const off = drag ? { dx: drag.dx, dy: drag.dy } : { dx: back.x.x, dy: back.y.x };
    const { o, anchors } = scene.draw(st, now, fx, off);
    if (o.volcano && playing && now - lastPuff > 1300) { fx.puffs.push({ kind: "plume", t: now }); lastPuff = now; }
    fx.puffs = fx.puffs.filter((p) => now - p.t < FX_MS[p.kind]);
    syncStatus(o); checkState(o);
    // Live text over the art: the ridge caption (Leo) and one tag for the main feature.
    $("ridgeCaption").textContent = RIDGE_CAPTION; place($("ridgeCaption"), o.feature === "ridge" ? anchors.ridge : null);
    const tag = o.feature === "mountains" ? ["Fold mountains", anchors.mountains] : o.feature === "subduction" ? [o.volcano ? "Volcano" : "Trench", o.volcano ? anchors.volcano : anchors.trench]
      : o.feature === "rift" ? ["Rift valley", anchors.rift] : o.feature === "quakes" ? ["Transform fault", anchors.fault] : null;
    $("featureTag").textContent = tag ? tag[0] : ""; place($("featureTag"), tag && tag[1]);
    if (meter) meter.style.width = Math.round((classify(st.vx, st.vy) === "transform" ? fault.stress : 0) * 100) + "%";
    snap.s = reduced() ? { x: 1, v: 0 } : springStep(snap.s, 1, real); $("boundary").style.transform = `scale(${snap.s.x.toFixed(3)})`;
  }
  requestAnimationFrame(frame);
}
scene.resize();
if (Object.keys(share).length) { mode = "sandbox"; setMode("sandbox"); } else setMode("guided");
requestAnimationFrame(frame);
window.__pt = { st, piece, setMode, applyScene, openAbout, closeAbout, advance, get playing() { return playing; }, set playing(v) { playing = v; }, T, FUN, outcome: () => outcome(st), get fault() { return fault; } };
