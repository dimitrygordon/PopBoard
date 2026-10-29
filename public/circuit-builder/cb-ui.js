// Circuit Builder: drag parts, snap wires lead to lead, read live currents and voltages.
// Model and solver: cb-model.js. Drawing: cb-scene.js.
import { forwardStudyQuery } from "../board-return.js?v=20261022a";
import {
  MODULE_ID, clipAcross, BOARD_W, BOARD_H, PART_U, MAX_PARTS, MAX_WIRES, KINDS, NAMES, BATTERY_V, RESISTOR_R, FUN, LIT, BOARD_CAPTION, MODEL_NOTE,
  terminal, makePart, sanitizeCircuit, removePart, solve, bulbPair, describe, GOALS, PREDICT, glowTrend, judgePrediction, SCENES,
  SHARE_SCHEMA, toShare, fromShare, clamp
} from "./cb-model.js";
import { createScene, loadArt, circuitExtent, CAPTION_GAP, FULL_SCALE, fmtA, fmtV } from "./cb-scene.js";
import {
  initFun, pressFeedback, smoothTheme, prefers, springStep, challengeCard, disclosure, createChallenges, createStreak, createPrediction,
  TIERS, bottomSheet, encodeState, decodeState, sanitizeState, shareLink, celebrate, tick, buzz, sound
} from "../shared/fun/fun-ui.js";

const phone = matchMedia("(max-width: 600px)"), wide = matchMedia("(min-width: 900px)");
const $ = (id) => document.getElementById(id);
const root = document.documentElement;
const THEME_KEY = "popboard.circuit-builder.theme";
initFun(); pressFeedback();
const reduced = () => prefers.reducedMotion;
const el = (tag, props = {}, ...kids) => { const n = Object.assign(document.createElement(tag), props); n.append(...kids); return n; };
const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
$("boardCap").textContent = BOARD_CAPTION;
$("aboutNote").textContent = MODEL_NOTE;

const canvas = $("scene"), imgs = await loadArt(), scene = createScene(canvas, imgs);
const PALETTES = {
  dark: { board: "#e6e8e5", board_ink: "#1f262e", wire: "#2b323a", needle: "#1f262e", frame: "#5b6874", accent: "#1f9e93" },
  light: { board: "#eceeea", board_ink: "#1f262e", wire: "#2b323a", needle: "#1f262e", frame: "#8f9893", accent: "#157a71" }
};
// ---------- theme, sound, back, about ----------
function syncTheme() {
  const light = root.getAttribute("data-theme") === "light";
  $("themeLabel").textContent = light ? "Dark" : "Paper";
  $("themeBtn").setAttribute("aria-label", light ? "Switch to the dark theme" : "Switch to the Paper theme");
  scene.setPalette(PALETTES[light ? "light" : "dark"]);
}
$("themeBtn").addEventListener("click", () => { smoothTheme(); const t = root.getAttribute("data-theme") === "light" ? "dark" : "light"; root.setAttribute("data-theme", t); store.set(THEME_KEY, t); syncTheme(); });
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
const openAbout = () => { $("about").hidden = false; $("aboutOk").focus(); };
$("helpBtn").addEventListener("click", openAbout);
$("aboutOk").addEventListener("click", () => { $("about").hidden = true; $("helpBtn").focus(); });
addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("about").hidden) $("about").hidden = true; });

// ---------- fun layer ----------
const chip = el("button", { type: "button", className: "fun-chip", id: "funChip" });
const pop = el("section", { id: "funCard", className: "fun-pop" });
$("funBox").append(chip, pop);
const card = challengeCard(pop, GOALS);
disclosure(chip, pop, false);
const engine = createChallenges({ moduleId: MODULE_ID, goals: GOALS, onEarn: (g) => { card.flash(g.tier); toast(`${g.tier[0].toUpperCase() + g.tier.slice(1)} medal: ${g.title}`); } });
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
// Toasts live in the control panel, never on top of the board.
function toast(msg) { const t = $("toast"); t.textContent = msg; t.hidden = false; clearTimeout(toast._t); toast._t = setTimeout(() => { t.hidden = true; sheet?.layout(); }, 2600); sheet?.layout(); }

// ---------- state ----------
let circ = { parts: [], wires: [] }, sol = solve(circ);
let mode = "guided", sceneId = "pair", layout = "series", sel = -1, guess = null, glowBefore = 0;
let sawSeries = false, sawParallel = false;
let glow = [], needle = [], needleV = [], dots = [];
function changed({ structural = true } = {}) {
  circ = sanitizeCircuit(circ);
  if (sel >= circ.parts.length) sel = -1;
  sol = solve(circ);
  const pair = bulbPair(circ, sol); if (pair === "series") sawSeries = true; if (pair === "parallel") sawParallel = true;
  if (dots.length !== circ.wires.length) dots = circ.wires.map((_, k) => dots[k] || 0);
  readout(); report();
  if (structural) renderMode();
  if (typeof requestFit === "function") requestFit();
}
function applyScene(id, lay = "series") {
  sceneId = id; layout = lay; sel = -1; circ = SCENES.find((s) => s.id === id).build(lay);
  if (id === "target") sel = 1;
  glow = []; needle = []; needleV = []; dots = [];
  changed();
}

// ---------- readout + challenges ----------
const focusIndex = () => (sel >= 0 ? sel : circ.parts.findIndex((p) => p.kind === "bulb" || p.kind === "resistor"));
function readout() {
  const i = focusIndex(), p = circ.parts[i], r = sol.parts[i], d = describe(circ, sol);
  let big = "No parts yet", line = "Add a battery and a bulb, then wire them in a loop.";
  if (p) {
    const I = Math.abs(r.I), V = Math.abs(r.V);
    big = `${NAMES[p.kind]}: I = ${fmtA(r.I)}`;
    if (p.kind === "battery") { big = `Battery: ${p.v.toFixed(1)} V`; line = `Pushing ${fmtA(r.I)} round the circuit`; }
    else if (p.kind === "voltmeter") { big = `Voltmeter: ${fmtV(r.reading)}`; line = "Reads the voltage across what its two leads touch"; }
    else if (p.kind === "ammeter") { big = `Ammeter: ${fmtA(r.reading)}`; line = "Reads the current flowing through it"; }
    else if (p.kind === "switch") line = p.closed ? "Switch on: current can pass" : `Switch off: ${fmtV(r.V)} across the gap, no current`;
    else { const R = p.kind === "bulb" ? 10 : p.v; line = `V = IR: ${fmtV(V)} = ${fmtA(I)} \u00d7 ${R} \u03a9`; }
  }
  $("big").textContent = big; $("readout").textContent = line;
  $("state").textContent = d.text; $("state").dataset.kind = d.kind;
  canvas.setAttribute("aria-label", `Circuit board with ${circ.parts.length} parts and ${circ.wires.length} wires. ${big}. ${line}. ${d.text}`);
}
function report() {
  const ammeters = circ.parts.map((p, i) => (p.kind === "ammeter" ? sol.parts[i].reading : null)).filter((x) => x !== null);
  const maxGlow = circ.parts.reduce((m, p, i) => (p.kind === "bulb" ? Math.max(m, sol.parts[i].glow) : m), 0);
  if (engine.report({ type: "circuit", scene: mode === "guided" ? sceneId : "sandbox", short: sol.short, ammeters, maxGlow, sawSeries, sawParallel }).length) { chipSync(); celebrate(); }
}
const firstBulbGlow = () => { const i = circ.parts.findIndex((p) => p.kind === "bulb"); return i >= 0 ? sol.parts[i].glow : 0; };
function resolvePrediction() {
  if (!prediction.pending) return;
  const now = firstBulbGlow(), r = prediction.resolve(glowTrend(glowBefore, now)); guess = null; card.streak(r.streak.count, r.streak.best);
  toast(r.correct ? "You called it" : `Not quite: bulb 1 got ${r.actual === "same" ? "no brighter or dimmer" : r.actual}`); renderMode();
}

// ---------- controls ----------
const body = $("modeBody");
for (const t of document.querySelectorAll(".tabs [role=tab]")) t.addEventListener("click", () => setMode(t.dataset.mode));
function setMode(m) {
  mode = m; for (const t of document.querySelectorAll(".tabs [role=tab]")) t.setAttribute("aria-selected", String(t.dataset.mode === m));
  if (m === "guided") applyScene(sceneId); else { sel = -1; changed(); } layoutUI();
}
const btn = (label, on, cls = "", aria) => { const b = el("button", { type: "button", textContent: label, className: cls }); if (aria) b.setAttribute("aria-label", aria); b.addEventListener("click", on); return b; };
const pressed = (b, v) => { b.setAttribute("aria-pressed", String(!!v)); return b; };
function slider(id, label, rng, get, set, fmt) {
  const out = el("output", { id: id + "Out", textContent: fmt(get()) });
  const input = el("input", { type: "range", id, min: rng.min, max: rng.max, step: rng.step, value: get() }); input.setAttribute("aria-label", label);
  input.addEventListener("input", () => { set(+input.value); out.textContent = fmt(get()); changed({ structural: false }); });
  input.addEventListener("change", resolvePrediction);
  return el("label", { className: "row slider-row" }, el("span", { className: "dim", textContent: label }), input, out);
}
function valueRow(i) {
  const p = circ.parts[i]; if (!p) return [];
  if (p.kind === "battery") return [slider("battV", "Battery", BATTERY_V, () => circ.parts[i].v, (v) => { circ.parts[i].v = v; }, (v) => `${v.toFixed(1)} V`)];
  if (p.kind === "resistor") return [slider("resR", "Resistor", RESISTOR_R, () => circ.parts[i].v, (v) => { circ.parts[i].v = v; }, (v) => `${v} \u03a9`)];
  if (p.kind === "switch") return [el("div", { className: "row" }, pressed(btn(p.closed ? "Switch on" : "Switch off", () => flip(i)), p.closed))];
  return [];
}
function flip(i) { circ.parts[i].closed = !circ.parts[i].closed; tick(circ.parts[i].closed ? 760 : 520); buzz(6); changed(); resolvePrediction(); }
function renderMode() {
  body.replaceChildren();
  if (mode === "guided") {
    const s = SCENES.find((x) => x.id === sceneId);
    body.append(el("div", { className: "row" }, ...SCENES.map((x) => pressed(btn(x.name, () => applyScene(x.id)), x.id === sceneId))), el("p", { className: "dim", textContent: s.hint }));
    if (sceneId === "pair") {
      body.append(el("div", { className: "row" }, ...[["series", "Wire in series"], ["parallel", "Wire in parallel"]].map(([id, label]) =>
        pressed(btn(label, () => { applyScene("pair", id); resolvePrediction(); }), layout === id))));
      const row = el("div", { className: "row fun-predict" }, el("span", { className: "dim", textContent: `Switch to ${layout === "series" ? "parallel" : "series"}: will bulb 1 get` }));
      for (const p of PREDICT) row.appendChild(pressed(btn(p.label, () => { guess = guess === p.id ? null : p.id; glowBefore = firstBulbGlow(); prediction.predict(guess); renderMode(); }), guess === p.id));
      body.append(row);
    } else if (sceneId === "target") {
      const ri = circ.parts.findIndex((p) => p.kind === "resistor"), bi = circ.parts.findIndex((p) => p.kind === "battery");
      if (ri >= 0) body.append(...valueRow(ri)); if (bi >= 0) body.append(...valueRow(bi));
      const ai = circ.parts.findIndex((p) => p.kind === "ammeter");
      if (ai >= 0) body.append(el("p", { className: "dim", id: "targetNote", textContent: `Target: ${FUN.targetA.toFixed(2)} A. Try I = V / R.` }));
    } else body.append(el("div", { className: "row" }, btn("Reset puzzle", () => applyScene("fix"))));
  } else {
    const adds = el("div", { className: "row", role: "group", ariaLabel: "Add a part" });
    for (const k of KINDS) {
      const b = btn("", () => addPart(k), "part-btn", `Add a ${NAMES[k].toLowerCase()}`);
      b.append(el("img", { src: `circuit-builder/art/${k === "bulb" ? "bulb-off" : k === "switch" ? "switch-open" : k}.webp`, alt: "" }), NAMES[k]);
      adds.append(b);
    }
    body.append(adds);
    if (sel >= 0) {
      const p = circ.parts[sel];
      body.append(el("p", { className: "dim", textContent: `Selected: ${NAMES[p.kind].toLowerCase()}` }), ...valueRow(sel));
      const row = el("div", { className: "row" });
      if (p.kind !== "voltmeter") row.append(btn("Clip voltmeter across", () => clipVoltmeter(sel)));
      row.append(btn("Remove part", () => { const k = sel; sel = -1; circ = removePart(circ, k); toast(`${NAMES[p.kind]} removed`); changed(); }));
      body.append(row);
    } else body.append(el("p", { className: "dim", textContent: "Drag from one lead to another to add a wire. Tap a part to select it." }));
    const sh = btn("Share my circuit", async () => { const r = await shareLink(encodeState(sanitizeState(toShare(circ), SHARE_SCHEMA))); sh.textContent = r.copied ? "Link copied" : "Link in address bar"; setTimeout(() => { sh.textContent = "Share my circuit"; }, 1600); });
    body.append(el("div", { className: "row" }, btn("Clear board", () => { circ = { parts: [], wires: [] }; sel = -1; changed(); }), sh));
  }
  sheet?.layout();
}
// A free spot for a new part: scan rows, leave a part's width between neighbours.
function freeSpot(prefer) {
  const ok = (x, y) => x >= PART_U / 2 && x <= BOARD_W - PART_U / 2 && y >= 2 && y <= BOARD_H - 2 && circ.parts.every((q) => Math.abs(q.x - x) >= PART_U + 1 || Math.abs(q.y - y) >= PART_U + 1);
  if (prefer) for (const q of prefer) if (ok(q.x, q.y)) return q;
  for (const y of [3, 8, 13]) for (let x = 4; x <= 20; x += 1) if (ok(x, y)) return { x, y };
  return null;
}
function addPart(kind) {
  if (circ.parts.length >= MAX_PARTS) { toast(`Up to ${MAX_PARTS} parts`); return; }
  const q = freeSpot(); if (!q) { toast("The board is full: move or remove a part first"); return; }
  circ.parts.push(makePart(kind, q.x, q.y)); sel = circ.parts.length - 1; tick(700); changed();
}
// Clip a voltmeter's two leads across a part: the parallel connection, done for you.
function clipVoltmeter(i) {
  const p = circ.parts[i]; if (!p) return;
  let vi = circ.parts.findIndex((q, k) => q.kind === "voltmeter" && !circ.wires.some((w) => w.a >> 1 === k || w.b >> 1 === k));
  if (vi < 0) {
    if (circ.parts.length >= MAX_PARTS) { toast(`Up to ${MAX_PARTS} parts`); return; }
    const q = freeSpot([{ x: p.x, y: p.y - 5 }, { x: p.x, y: p.y + 5 }, { x: p.x + 5, y: p.y - 5 }, { x: p.x - 5, y: p.y - 5 }]); if (!q) { toast("No room for a voltmeter"); return; }
    circ.parts.push(makePart("voltmeter", q.x, q.y)); vi = circ.parts.length - 1;
  }
  if (circ.wires.length + 2 > MAX_WIRES) { toast(`Up to ${MAX_WIRES} wires`); return; }
  circ = clipAcross(circ, vi, i); sel = vi; tick(880); toast("Voltmeter clipped across the part, in parallel"); changed();
}

// ---------- input ----------
let drag = null, hot = -1;
const local = (e) => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
const termR = () => Math.max(18, scene.view.u * 0.9);
function termAt(pt, skip = -1) {
  let best = -1, bd = termR();
  circ.parts.forEach((p, i) => [0, 1].forEach((side) => { const t = 2 * i + side; if (t === skip) return; const q = scene.toScreen(terminal(p, side).x, p.y), d = Math.hypot(q.x - pt.x, q.y - pt.y); if (d < bd) { bd = d; best = t; } }));
  return best;
}
function partAt(pt) {
  for (let i = circ.parts.length - 1; i >= 0; i--) { const g = scene.geo(circ.parts[i]); if (pt.x >= g.left + g.s * 0.12 && pt.x <= g.right - g.s * 0.12 && pt.y >= g.top - 4 && pt.y <= g.bottom + 4) return i; }
  return -1;
}
function segDist(p, a, b) { const dx = b.x - a.x, dy = b.y - a.y, L = dx * dx + dy * dy || 1, k = clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / L, 0, 1); return Math.hypot(p.x - a.x - k * dx, p.y - a.y - k * dy); }
function wireAt(pt) { for (let k = circ.wires.length - 1; k >= 0; k--) { const pts = scene.wirePts(circ, circ.wires[k]); for (let i = 1; i < pts.length; i++) if (segDist(pt, pts[i - 1], pts[i]) < 10) return k; } return -1; }
canvas.addEventListener("pointerdown", (e) => {
  const pt = local(e), t = termAt(pt);
  canvas.setPointerCapture?.(e.pointerId);
  if (t >= 0) { const p = circ.parts[t >> 1]; drag = { kind: "wire", from: t, a: scene.toScreen(terminal(p, t & 1).x, p.y), b: pt }; tick(600); return; }
  const i = partAt(pt);
  if (i >= 0) { const p = circ.parts[i], b = scene.toBoard(pt.x, pt.y); drag = { kind: "part", i, dx: p.x - b.X, dy: p.y - b.Y, x0: p.x, y0: p.y, moved: false, start: pt }; return; }
  const w = wireAt(pt); if (w >= 0) { drag = { kind: "wire-tap", w }; return; }
  if (sel >= 0) { sel = -1; readout(); renderMode(); }
});
canvas.addEventListener("pointermove", (e) => {
  const pt = local(e);
  if (!drag) { const h = termAt(pt); if (h !== hot) hot = h; return; }
  if (drag.kind === "wire") { drag.b = pt; hot = termAt(pt, drag.from); }
  else if (drag.kind === "part") {
    if (!drag.moved && Math.hypot(pt.x - drag.start.x, pt.y - drag.start.y) < 6) return;
    drag.moved = true; const b = scene.toBoard(pt.x, pt.y), p = circ.parts[drag.i];
    const nx = Math.round(b.X + drag.dx), ny = Math.round(b.Y + drag.dy); if (nx !== p.x || ny !== p.y) { p.x = nx; p.y = ny; tick(1200); }
  }
});
function endDrag() {
  const d = drag; drag = null; if (!d) return;
  if (d.kind === "wire") {
    const t = hot; hot = -1;
    if (t >= 0 && t !== d.from) {
      if (circ.wires.length >= MAX_WIRES) toast(`Up to ${MAX_WIRES} wires`);
      else if (circ.wires.some((w) => (w.a === d.from && w.b === t) || (w.b === d.from && w.a === t))) toast("Those leads are already joined");
      else { circ.wires.push({ a: d.from, b: t }); tick(980); buzz(8); changed(); resolvePrediction(); }
    }
  } else if (d.kind === "part") {
    const p = circ.parts[d.i];
    if (!d.moved) { if (p.kind === "switch") flip(d.i); sel = d.i; readout(); renderMode(); return; }
    const sp = scene.toScreen(p.x, p.y);
    if (p.x < 0 || p.y < 0 || p.x > BOARD_W || p.y > BOARD_H || !scene.onBoard(sp.x, sp.y)) { sel = -1; circ = removePart(circ, d.i); toast(`${NAMES[p.kind]} removed`); }
    else { sel = d.i; p.x = clamp(p.x, PART_U / 2, BOARD_W - PART_U / 2); p.y = clamp(p.y, 2, BOARD_H - 2); }
    changed(); resolvePrediction();
  } else if (d.kind === "wire-tap") { circ.wires.splice(d.w, 1); toast("Wire removed"); tick(420); changed(); resolvePrediction(); }
}
canvas.addEventListener("pointerup", endDrag); canvas.addEventListener("pointercancel", () => { drag = null; hot = -1; });
canvas.addEventListener("keydown", (e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); const i = circ.parts.findIndex((p) => p.kind === "switch"); if (i >= 0) flip(i); } });

// ---------- layout: board box and bottom sheet (opens at the half stop on phones) ----------
let sheet = null;
const snaps = () => { const tabs = $("controls").querySelector(".tabs"); const peek = Math.ceil(tabs.offsetHeight + 56); const full = Math.max(peek + 40, Math.ceil(tabs.offsetHeight + body.scrollHeight + ($("toast").hidden ? 0 : $("toast").offsetHeight + 8) + 64)); return [peek, Math.max(peek + 1, Math.round((peek + full) / 2)), full]; };
function phoneSync() {
  if (phone.matches && !sheet) { $("controls").classList.add("fun-sheet-on", "fun-sheet"); sheet = bottomSheet($("controls"), $("sheetHandle"), { getSnaps: snaps, start: 1, onSnap: () => setTimeout(requestFit, 350) }); $("controls").dataset.snap = "half"; }
  else if (!phone.matches && sheet) { sheet.destroy(); sheet = null; $("controls").classList.remove("fun-sheet-on", "fun-sheet"); }
}
let fitQueued = false;
function requestFit() { if (fitQueued) return; fitQueued = true; requestAnimationFrame(() => { fitQueued = false; fit(); }); }
function fit() {
  const ctl = $("controls").getBoundingClientRect(), stt = $("status").getBoundingClientRect(), capH = $("boardCap").offsetHeight || 20;
  const top = stt.bottom + 10;
  const box = wide.matches ? { x: 16, y: top, w: innerWidth - 404 - 16, h: innerHeight - top - 12 } : { x: 12, y: top, w: innerWidth - 24, h: Math.max(160, Math.min(innerHeight, ctl.top) - 10 - top) };
  // Phones: the board fills the box and the circuit is scaled to fit it (16 px padding).
  const v = scene.setBox(box, capH, wide.matches ? null : circuitExtent(circ));
  $("boardCap").style.left = Math.round(v.x + v.w / 2) + "px"; $("boardCap").style.top = Math.round(v.y + v.h + CAPTION_GAP) + "px";
  $("boardCap").style.maxWidth = Math.round(Math.max(200, v.w)) + "px";
}
function layoutUI() { phoneSync(); sheet?.layout(); requestFit(); }
phone.addEventListener?.("change", layoutUI); wide.addEventListener?.("change", layoutUI);
addEventListener("resize", () => { scene.resize(); layoutUI(); });
if (typeof ResizeObserver === "function") { const ro = new ResizeObserver(() => requestFit()); ro.observe($("status")); ro.observe($("controls")); }

// ---------- loop ----------
// Bulbs ease toward their brightness; meter needles ride critically damped springs; dots move
// along wires at a speed that follows the current (capped, so a short looks calm, not frantic).
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  circ.parts.forEach((p, i) => {
    const r = sol.parts[i]; if (!r) return;
    if (p.kind === "bulb") { const g = r.glow || 0; glow[i] = reduced() ? g : (glow[i] ?? 0) + (g - (glow[i] ?? 0)) * Math.min(1, dt * 6); }
    if (p.kind === "voltmeter" || p.kind === "ammeter") {
      const target = -1 + 2 * clamp(Math.abs(r.reading) / FULL_SCALE[p.kind], 0, 1.04);
      if (reduced()) needle[i] = target; else { const s = springStep({ x: needle[i] ?? -1, v: needleV[i] || 0 }, target, dt, { response: 0.5, damping: 1 }); needle[i] = s.x; needleV[i] = s.v; }
    }
  });
  if (!reduced()) circ.wires.forEach((w, k) => { const I = sol.wires[k]?.I || 0; const sp = Math.sign(I) * Math.min(150, 70 * Math.sqrt(Math.abs(I) / 0.3)) * (scene.view.u / 30); dots[k] = (dots[k] || 0) + sp * dt; });
  const wd = drag?.kind === "wire" ? { from: drag.from, b: hot >= 0 ? scene.toScreen(terminal(circ.parts[hot >> 1], hot & 1).x, circ.parts[hot >> 1].y) : drag.b } : null;
  scene.draw({ c: circ, s: sol, glow, needle: needle.map((a) => (a ?? -1) * (Math.PI / 3)), dots, sel, wireDrag: wd, hot, shorted: sol.shorted });
  requestAnimationFrame(frame);
}

// ---------- start ----------
// Render the controls before the sheet is built, so its half stop is measured on real content.
scene.resize();
const shared = sanitizeState(decodeState(location.hash), SHARE_SCHEMA);
if (Object.keys(shared).length && shared.n) { mode = "sandbox"; circ = fromShare(shared); for (const t of document.querySelectorAll(".tabs [role=tab]")) t.setAttribute("aria-selected", String(t.dataset.mode === "sandbox")); changed(); }
else applyScene("pair");
layoutUI(); fit();
requestAnimationFrame(frame);
window.__cb = {
  get c() { return circ; }, set c(v) { circ = sanitizeCircuit(v); changed(); }, get sol() { return sol; }, applyScene, setMode, flip, addPart, clipVoltmeter, removePart: (i) => { circ = removePart(circ, i); sel = -1; changed(); },
  select(i) { sel = i; readout(); renderMode(); }, get view() { return scene.view; }, labels: () => { const m = canvas.getContext("2d"); m.font = `700 ${scene.view.u * PART_U < 70 ? 11 : 13}px system-ui, sans-serif`; return circ.parts.map((p) => { const l = scene.labelGeo(p, circ), g = scene.geo(p); return { ...l, bottom: g.bottom, art: { left: g.left + g.s * 0.12, right: g.right - g.s * 0.12, top: g.top, bottom: g.bottom } }; }); },
  wireSegs: () => scene.wireSegs(circ), termScreen: (t) => { const p = circ.parts[t >> 1]; const q = terminal(p, t & 1); return scene.toScreen(q.x, q.y); }, partScreen: (i) => scene.toScreen(circ.parts[i].x, circ.parts[i].y),
  CAPTION_GAP, snaps: () => (sheet ? snaps() : null), get mode() { return mode; }, get scene() { return sceneId; }, get layout() { return layout; }, openAbout, get glow() { return glow; }
};
