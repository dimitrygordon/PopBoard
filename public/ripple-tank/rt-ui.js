// Ripple Tank: free-form touch water. Guided scenes + Sandbox, the fun layer, the adaptive grid.
// Model and grid: rt-model.js. Drawing: rt-scene.js.
import { forwardStudyQuery } from "../board-return.js?v=20261022a";
import {
  MODULE_ID, TANK_CM, WAVE_SPEED, F_MIN, F_MAX, MAX_SOURCES, SLOW, COURANT, LEVELS, SLIT_A, SLIT_D, WALL_X, TANK_CAPTION, MODEL_NOTE, NODAL_NOTE, BLOCK_CM,
  wavelength, settleTime, sanitizeConfig, wallRects, blockRects, analyze, GOALS, PREDICT, trend, judgePrediction, SCENES,
  SHARE_SCHEMA, toShare, fromShare, createGrid, step, fillWalls, splash, createGovernor, clamp
} from "./rt-model.js";
import { createScene, CAPTION_GAP } from "./rt-scene.js";
import {
  initFun, pressFeedback, smoothTheme, prefers, challengeCard, disclosure, createChallenges, createStreak, createPrediction,
  TIERS, bottomSheet, encodeState, decodeState, sanitizeState, shareLink, celebrate, tick, buzz, sound
} from "../shared/fun/fun-ui.js";

const phone = matchMedia("(max-width: 600px)"), wide = matchMedia("(min-width: 900px)");
const $ = (id) => document.getElementById(id);
const root = document.documentElement;
const THEME_KEY = "popboard.ripple-tank.theme";
initFun(); pressFeedback();
const reduced = () => prefers.reducedMotion;
const el = (tag, props = {}, ...kids) => { const n = Object.assign(document.createElement(tag), props); n.append(...kids); return n; };
const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
const f1 = (x) => (Math.round(x * 10) / 10).toFixed(1);
$("tankCap").textContent = TANK_CAPTION;
$("aboutNote").textContent = MODEL_NOTE;
$("nodalNote").textContent = NODAL_NOTE;
$("wavesLink").href = "study-waves.html" + location.search;

// ---------- theme, sound, back, about ----------
const canvas = $("scene"), scene = createScene(canvas);
function syncTheme() {
  const light = root.getAttribute("data-theme") === "light";
  $("themeLabel").textContent = light ? "Dark" : "Paper";
  $("themeBtn").setAttribute("aria-label", light ? "Switch to the dark theme" : "Switch to the Paper theme");
  scene.setTheme(light ? "light" : "dark");
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
// Toasts live in the control panel, never on top of the tank.
function toast(msg) { const t = $("toast"); t.textContent = msg; t.hidden = false; clearTimeout(toast._t); toast._t = setTimeout(() => { t.hidden = true; sheet?.layout(); }, 2600); sheet?.layout(); }

// ---------- state ----------
let st = sanitizeConfig({ slow: reduced() });
let mode = "guided", sceneId = "two", tool = "source", guess = null, guessBefore = 0;
let simT = 0, cfgT = 0, acc = 0;
const gov = createGovernor();
let g = null, cell = 0.2, dtStep = 0.004, lastGood = "";
const H = () => scene.view.H;
function rebuild(keep = false) {
  const nx = LEVELS[gov.level], ny = Math.max(16, Math.round(nx * H() / TANK_CM));
  if (keep && g && g.nx === nx && g.ny === ny) return;
  g = createGrid(nx, ny); cell = TANK_CM / nx; dtStep = (COURANT * cell) / WAVE_SPEED; walls();
}
function walls() { if (g) fillWalls(g, [...wallRects(st, H()), ...blockRects(st)], cell); }
function configChanged() { cfgT = simT; walls(); readout(); }
function applyScene(id) {
  sceneId = id; const s = SCENES.find((x) => x.id === id);
  st = sanitizeConfig({ ...s.cfg(H()), slow: st.slow }, TANK_CM, H());
  if (g) { g.u.fill(0); g.prev.fill(0); g.avg.fill(0); }
  guess = null; prediction.predict(null); configChanged(); renderMode();
}

// ---------- readout + challenges ----------
function readout() {
  const a = analyze(st);
  $("lambda").textContent = `\u03bb = ${f1(a.lambda)} cm`;
  const lines = [`f = ${f1(st.f)} Hz, v = ${WAVE_SPEED} cm/s, \u03bb = v/f`];
  if (a.kind === "two-source") lines.push(`Dippers ${f1(a.d)} cm apart = ${f1(a.ratio)} \u03bb: ${a.nodal} dark line${a.nodal === 1 ? "" : "s"}`);
  else if (a.kind === "one-slit") lines.push(`Slit ${f1(st.a)} cm = ${f1(a.ratio)} \u03bb: ${a.ratio <= 1 ? "waves spread out widely" : "waves mostly go straight through"}`);
  else if (a.kind === "two-slit") lines.push(`Slits ${f1(st.a)} cm wide, ${f1(st.d)} cm apart = ${f1(a.dRatio)} \u03bb`);
  else lines.push(st.sources.length ? `${st.sources.length} dipper${st.sources.length > 1 ? "s" : ""} in step` : "Tap the water to add a dipper.");
  $("readout").textContent = lines.join("\n");
  canvas.setAttribute("aria-label", `Ripple tank. ${$("lambda").textContent}. ${lines.join(". ")}`);
  return a;
}
function report() {
  const a = analyze(st), settled = simT - cfgT >= settleTime();
  if (engine.report({ type: "tank", kind: a.kind, settled, nodal: a.nodal, ratio: a.ratio, dRatio: a.dRatio }).length) { chipSync(); celebrate(); }
}
function resolvePrediction() {
  if (!prediction.pending) return;
  const a = analyze(st); if (a.kind !== "two-source") return;
  const r = prediction.resolve(trend(guessBefore, a.nodal)); guess = null; card.streak(r.streak.count, r.streak.best);
  toast(r.correct ? "You called it" : `Not quite: now ${a.nodal} dark lines, was ${guessBefore}`); renderMode();
}

// ---------- controls ----------
const body = $("modeBody");
for (const t of document.querySelectorAll(".tabs [role=tab]")) t.addEventListener("click", () => setMode(t.dataset.mode));
function setMode(m) { mode = m; for (const t of document.querySelectorAll(".tabs [role=tab]")) t.setAttribute("aria-selected", String(t.dataset.mode === m)); if (m === "guided") applyScene(sceneId); else renderMode(); layoutUI(); }
const btn = (label, on, cls = "", aria) => { const b = el("button", { type: "button", textContent: label, className: cls }); if (aria) b.setAttribute("aria-label", aria); b.addEventListener("click", on); return b; };
const pressed = (b, v) => { b.setAttribute("aria-pressed", String(!!v)); return b; };
function slider(id, label, min, max, stepv, get, set, fmt) {
  const out = el("output", { id: id + "Out", textContent: fmt(get()) });
  const input = el("input", { type: "range", id, min, max, step: stepv, value: get() }); input.setAttribute("aria-label", label);
  input.addEventListener("input", () => { set(+input.value); out.textContent = fmt(get()); configChanged(); });
  input.addEventListener("change", resolvePrediction);
  return el("label", { className: "row slider-row" }, el("span", { className: "dim", textContent: label }), input, out);
}
function common() {
  const rows = [slider("freq", "Frequency", F_MIN, F_MAX, 0.5, () => st.f, (v) => { st.f = v; }, (v) => `${f1(v)} Hz`)];
  if (st.barrier !== "none") rows.push(slider("slitA", "Slit width", SLIT_A.min, SLIT_A.max, 0.5, () => st.a, (v) => { st.a = v; }, (v) => `${f1(v)} cm`));
  if (st.barrier === "two") rows.push(slider("slitD", "Slit spacing", SLIT_D.min, SLIT_D.max, 0.5, () => st.d, (v) => { st.d = v; }, (v) => `${f1(v)} cm`));
  rows.push(el("div", { className: "row" },
    pressed(btn("Nodal lines", () => { st.nodal = !st.nodal; renderMode(); }), st.nodal),
    pressed(btn("Slow motion", () => { st.slow = !st.slow; renderMode(); }), st.slow)));
  if (st.nodal) rows.push(el("p", { className: "dim nodal-note", textContent: NODAL_NOTE }));
  if (analyze(st).kind === "two-source") {
    const row = el("div", { className: "row fun-predict" }, el("span", { className: "dim", textContent: "Next change: more or fewer dark lines?" }));
    for (const p of PREDICT) row.appendChild(pressed(btn(p.label, () => { guess = guess === p.id ? null : p.id; guessBefore = analyze(st).nodal; prediction.predict(guess); renderMode(); }), guess === p.id));
    rows.push(row);
  }
  return rows;
}
function renderMode() {
  body.replaceChildren();
  if (mode === "guided") {
    const s = SCENES.find((x) => x.id === sceneId);
    body.append(el("div", { className: "row" }, ...SCENES.map((x) => pressed(btn(x.name, () => applyScene(x.id)), x.id === sceneId))),
      el("p", { className: "dim", textContent: s.hint }), ...common());
  } else {
    body.append(el("div", { className: "row", role: "group", ariaLabel: "Tap the water to" },
      el("span", { className: "dim", textContent: "Tap adds:" }),
      ...[["source", "Dipper"], ["splash", "Splash"], ["block", "Block"]].map(([id, label]) => pressed(btn(label, () => { tool = id; renderMode(); }), tool === id))),
      el("div", { className: "row" },
        pressed(btn("Straight dipper", () => { st.line = !st.line; configChanged(); renderMode(); }), st.line),
        ...[["none", "No wall"], ["one", "One slit"], ["two", "Two slits"]].map(([id, label]) => pressed(btn(label, () => { st.barrier = id; configChanged(); renderMode(); }), st.barrier === id))),
      ...common());
    const sh = btn("Share my tank", async () => { const r = await shareLink(encodeState(sanitizeState(toShare(st), SHARE_SCHEMA))); sh.textContent = r.copied ? "Link copied" : "Link in address bar"; setTimeout(() => { sh.textContent = "Share my tank"; }, 1600); });
    body.append(el("div", { className: "row" },
      btn("Clear tank", () => { st.sources = []; st.blocks = []; st.line = false; st.barrier = "none"; g.u.fill(0); g.prev.fill(0); g.avg.fill(0); configChanged(); renderMode(); }), sh));
  }
  readout(); sheet?.layout();
}

// ---------- input ----------
let drag = null, lastSplash = null;
const simAt = (e) => { const r = canvas.getBoundingClientRect(); return scene.toSim(e.clientX - r.left, e.clientY - r.top); };
const inTank = (p, pad = 0) => p.X >= -pad && p.Y >= -pad && p.X <= TANK_CM + pad && p.Y <= H() + pad;
const cellOf = (p) => [Math.round(p.X / cell), Math.round(p.Y / cell)];
function doSplash(p) { const [i, j] = cellOf(p); splash(g, i, j, 0.9 / cell); buzz(4); }
canvas.addEventListener("pointerdown", (e) => {
  const p = simAt(e); if (!inTank(p)) return;
  const hitR = Math.max(1.2, 18 / scene.view.scale);
  const hit = st.sources.findIndex((s) => Math.hypot(s.x - p.X, s.y - p.Y) < hitR);
  canvas.setPointerCapture?.(e.pointerId);
  if (hit >= 0) { drag = { kind: "source", i: hit, moved: false }; tick(500); return; }
  const t = mode === "guided" ? "splash" : tool;
  if (t === "source") {
    if (st.sources.length >= MAX_SOURCES) { toast(`Up to ${MAX_SOURCES} dippers`); return; }
    st.sources.push({ x: p.X, y: p.Y }); drag = { kind: "source", i: st.sources.length - 1, moved: true }; configChanged(); renderMode(); tick(700);
  } else if (t === "splash") { doSplash(p); lastSplash = p; drag = { kind: "splash" }; }
  else { st.blocks.push({ x: p.X, y: p.Y }); lastSplash = p; drag = { kind: "block" }; configChanged(); }
});
canvas.addEventListener("pointermove", (e) => {
  if (!drag) return; const p = simAt(e);
  if (drag.kind === "source") { st.sources[drag.i] = { x: p.X, y: p.Y }; drag.moved = true; readout(); }
  else if (inTank(p) && Math.hypot(p.X - lastSplash.X, p.Y - lastSplash.Y) > (drag.kind === "block" ? BLOCK_CM * 0.9 : 1.2)) {
    lastSplash = p; if (drag.kind === "splash") doSplash(p); else if (st.blocks.length < 200) { st.blocks.push({ x: p.X, y: p.Y }); walls(); }
  }
});
const endDrag = () => {
  if (!drag) return; const d = drag; drag = null;
  if (d.kind === "source") {
    const s = st.sources[d.i];
    if (!inTank({ X: s.x, Y: s.y })) { st.sources.splice(d.i, 1); toast("Dipper removed"); renderMode(); }
    else st.sources[d.i] = { x: clamp(s.x, 0.5, TANK_CM - 0.5), y: clamp(s.y, 0.5, H() - 0.5) };
    configChanged(); resolvePrediction();
  } else if (d.kind === "block") configChanged();
};
canvas.addEventListener("pointerup", endDrag); canvas.addEventListener("pointercancel", endDrag);
canvas.addEventListener("keydown", (e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); doSplash({ X: TANK_CM * 0.6, Y: H() / 2 }); } });

// ---------- layout: stage box and bottom sheet (opens at the half stop on phones) ----------
let sheet = null;
const snaps = () => { const tabs = $("controls").querySelector(".tabs"); const peek = Math.ceil(tabs.offsetHeight + 56); const full = Math.max(peek + 40, Math.ceil(tabs.offsetHeight + body.scrollHeight + ($("toast").hidden ? 0 : $("toast").offsetHeight + 8) + 64)); // The half stop rises to just under the tank caption, so no empty band is left between them.
  const capB = $("tankCap").getBoundingClientRect().bottom, room = capB > 0 ? Math.floor(innerHeight - capB - 12) : 0;
  const half = Math.min(full, Math.max(Math.round((peek + full) / 2), room));
  return [peek, Math.max(peek + 1, half), Math.max(full, half + 1)]; };
function phoneSync() {
  if (phone.matches && !sheet) { $("controls").classList.add("fun-sheet-on", "fun-sheet"); sheet = bottomSheet($("controls"), $("sheetHandle"), { getSnaps: snaps, start: 1, onSnap: () => setTimeout(requestFit, 350) }); $("controls").dataset.snap = "half"; }
  else if (!phone.matches && sheet) { sheet.destroy(); sheet = null; $("controls").classList.remove("fun-sheet-on", "fun-sheet"); }
}
let fitQueued = false;
function requestFit() { if (fitQueued) return; fitQueued = true; requestAnimationFrame(() => { fitQueued = false; fit(); }); }
function fit() {
  const ctl = $("controls").getBoundingClientRect(), stt = $("status").getBoundingClientRect(), capH = $("tankCap").offsetHeight || 20;
  const top = stt.bottom + 10;
  const box = wide.matches ? { x: 16, y: top, w: innerWidth - 404 - 16, h: innerHeight - top - 12 } : { x: 12, y: top, w: innerWidth - 24, h: Math.max(160, Math.min(innerHeight, ctl.top) - 10 - top) };
  const oldH = scene.view.H, v = scene.setBox(box, TANK_CM, capH, !wide.matches); // phones and tablets: the tank sits right under the readout, so the sheet can sit higher
  $("tankCap").style.left = Math.round(v.x + v.w / 2) + "px"; $("tankCap").style.top = Math.round(v.y + v.h + CAPTION_GAP) + "px";
  $("tankCap").style.maxWidth = Math.round(Math.max(200, v.w)) + "px";
  if (Math.abs(oldH - v.H) > 0.05 || !g) { st = sanitizeConfig(st, TANK_CM, v.H); rebuild(); configChanged(); }
}
function layoutUI() { phoneSync(); sheet?.layout(); requestFit(); }
phone.addEventListener?.("change", layoutUI); wide.addEventListener?.("change", layoutUI);
addEventListener("resize", () => { scene.resize(); layoutUI(); });
if (typeof ResizeObserver === "function") { const ro = new ResizeObserver(() => requestFit()); ro.observe($("status")); ro.observe($("controls")); }

// ---------- loop ----------
// Each frame: advance the grid by real time (or a quarter of it in slow motion), capped so a slow
// Chromebook falls behind gracefully instead of spiralling. The governor drops grid resolution
// when frames stay slow.
let last = performance.now(), frames = 0, forceMs = 0, avgRef = 0, gain = 1.6;
function frame(now) {
  const ms = now - last, real = Math.min(1 / 20, ms / 1000); last = now; frames++;
  const change = gov.sample(forceMs || ms);
  if (change) { rebuild(); toast(change === "down" ? "Smoother waves: using a coarser grid" : "Sharper waves: grid detail back up"); }
  const simDt = real / (st.slow ? SLOW : 1);
  acc += simDt; let n = Math.min(8, Math.floor(acc / dtStep)); acc = Math.min(acc - n * dtStep, dtStep);
  const w = 2 * Math.PI * st.f, li = Math.max(1, Math.round(1.5 / cell));
  for (let s = 0; s < n; s++) {
    simT += dtStep; const drive = Math.sin(w * simT);
    for (const p of st.sources) { const i = clamp(Math.round(p.x / cell), 1, g.nx - 2), j = clamp(Math.round(p.y / cell), 1, g.ny - 2); g.u[j * g.nx + i] = drive; }
    if (st.line) for (let j = 1; j < g.ny - 1; j++) { const k = j * g.nx + li; if (!g.wall[k]) g.u[k] = 0.35 * drive; }
    step(g);
  }
  // Time-averaged energy per cell (for the nodal lines) and an auto gain for the shading.
  // With a slit wall, the water past it is scaled on its own, so the weaker diffracted ripples
  // keep their contrast and the nodal tint is judged against that side's own energy.
  const { u, avg } = g, N = u.length, split = st.barrier !== "none" ? Math.min(g.nx - 1, Math.ceil((WALL_X + 0.8) / cell)) : g.nx;
  let s0 = 0, c0 = 0, s1 = 0, c1 = 0;
  for (let k = 0; k < N; k++) { avg[k] += (u[k] * u[k] - avg[k]) * 0.04; }
  for (let k = 0; k < N; k += 7) { if (g.wall[k] || g.sponge[k] < 0.97) continue; if (k % g.nx >= split) { s1 += avg[k]; c1++; } else { s0 += avg[k]; c0++; } }
  const ref = (s, c) => (c ? (s / c) * 2.4 : 0), gn = (s, c) => clamp(0.75 / Math.sqrt(s / Math.max(1, c) + 1e-6), 0.8, 6);
  avgRef = ref(s0, c0); gain = gn(s0, c0);
  const behind = split < g.nx && c1 ? { split, gain: gn(s1, c1), avgRef: ref(s1, c1) } : null;
  scene.draw(g, st, { gain, avgRef, behind, walls: [...wallRects(st, H()), ...blockRects(st)], drag: drag?.kind === "source" ? drag.i : null });
  if (frames % 20 === 0) report();
  requestAnimationFrame(frame);
}

// ---------- start ----------
scene.resize(); phoneSync(); fit();
const shared = sanitizeState(decodeState(location.hash), SHARE_SCHEMA);
if (Object.keys(shared).length) { mode = "sandbox"; st = sanitizeConfig(fromShare(shared), TANK_CM, H()); for (const t of document.querySelectorAll(".tabs [role=tab]")) t.setAttribute("aria-selected", String(t.dataset.mode === "sandbox")); configChanged(); renderMode(); }
else applyScene("two");
layoutUI();
requestAnimationFrame(frame);
window.__rt = {
  get st() { return st; }, set st(v) { st = sanitizeConfig(v, TANK_CM, H()); configChanged(); renderMode(); }, applyScene, setMode, get gov() { return gov; }, get grid() { return g; },
  get view() { return scene.view; }, CAPTION_GAP, forceFrameMs(ms) { forceMs = ms; }, settle() { simT += settleTime() + 0.1; report(); }, get mode() { return mode; }, openAbout
};
