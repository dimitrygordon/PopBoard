// Atom Builder: drag particles from trays (springs), Build / Sandbox / Table modes, the live
// element readout, predict-then-run and the fun layer. Model: ab-model.js. View: ab-scene.js.
import { forwardStudyQuery } from "../board-return.js?v=20261022a";
import {
  MODULE_ID, SCALE_CAPTION, MAX_Z, MAX_N, MAX_E, SHELLS, ELEMENTS, TABLE_POS, GOALS, FUN, TARGETS, SHARE_SCHEMA,
  sanitizeAtom, describe, shellCounts, isStable, judgePrediction, collect, sanitizeTable, nucleonSize, nucleusRadius, electronBand
} from "./ab-model.js";
import { createScene, loadArt, KINDS } from "./ab-scene.js";
import {
  initFun, pressFeedback, smoothTheme, prefers, challengeCard, disclosure, createChallenges, createStreak, createPrediction,
  TIERS, bottomSheet, springStep, encodeState, decodeState, sanitizeState, shareLink, celebrate, tick, buzz, sound
} from "../shared/fun/fun-ui.js";

const phone = matchMedia("(max-width: 600px)"), wide = matchMedia("(min-width: 900px), (min-width: 700px) and (max-height: 500px)");
const $ = (id) => document.getElementById(id);
const root = document.documentElement;
const THEME_KEY = "popboard.atom-builder.theme", TABLE_KEY = "popboard.fun.atom-builder.table";
export const CAPTION_GAP = 12; // captions sit 12px below their art (Leo)
initFun(); pressFeedback();
const reduced = () => prefers.reducedMotion;
const el = (tag, props = {}, ...kids) => { const n = Object.assign(document.createElement(tag), props); n.append(...kids); return n; };
const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
$("scaleCap").textContent = SCALE_CAPTION;

// ---------- theme, sound, back ----------
const canvas = $("scene");
const imgs = await loadArt();
const scene = createScene(canvas, imgs);
function palette() {
  const light = root.getAttribute("data-theme") === "light";
  return light ? { charge: "#1a2028", dim: "#4c5864", border: "#9aa4ab", cloud: 1 } : { charge: "#121820", dim: "#a7b4be", border: "#3a4a58", cloud: 0.9 };
}
function syncTheme() {
  const light = root.getAttribute("data-theme") === "light";
  $("themeLabel").textContent = light ? "Dark" : "Paper";
  $("themeBtn").setAttribute("aria-label", light ? "Switch to the dark theme" : "Switch to the Paper theme");
  scene.setPalette(palette());
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
// Toasts live in the header band, in the title's slot between Back and Sound, so they never cover the atom.
function toast(msg) {
  const t = $("toast"), title = document.querySelector(".hud .title"), hud = document.querySelector(".hud").getBoundingClientRect();
  const left = $("studyBackBtn").getBoundingClientRect().right + 8, right = $("soundBtn").getBoundingClientRect().left - 8;
  if (t.parentElement !== document.body) document.body.appendChild(t); // fixed to the viewport, not a transformed box
  t.textContent = msg; t.hidden = false;
  Object.assign(t.style, { left: (left + right) / 2 + "px", transform: "translateX(-50%)", maxWidth: Math.max(80, right - left) + "px", top: hud.top + "px", minHeight: hud.height + "px" });
  title.style.visibility = "hidden";
  clearTimeout(toast._t); toast._t = setTimeout(() => { t.hidden = true; title.style.visibility = ""; }, 2200);
}
let table = (() => { try { return sanitizeTable(JSON.parse(store.get(TABLE_KEY) || "{}")); } catch (e) { return {}; } })();

// ---------- particles ----------
// Nucleons: offsets from the atom centre with springs. Electrons: a sampled spot in their cloud.
const nuc = [], els = [];
let mode = "build", targetIdx = 0, guess = null;
const counts = () => ({ p: nuc.filter((t) => t.kind === "proton").length, n: nuc.filter((t) => t.kind === "neutron").length, e: els.length });
const nS = () => nucleonSize(nuc.length, scene.geo.S, scene.geo.R);
function nucSlot(i, S) { if (i === 0) return { x: 0, y: 0 }; const r = S * 0.36 * Math.sqrt(i + 0.3), a = i * 2.39996; return { x: r * Math.cos(a), y: r * Math.sin(a) }; }
function electronSpot(shell, j, cap) {
  const g = scene.geo, [rIn, rOut] = electronBand(shell, nucleusRadius(nuc.length, nS()), g.radii, g.S);
  const a = (j / cap) * Math.PI * 2 + shell * 0.7 + (Math.random() - 0.5) * (Math.PI / cap);
  const r = rIn + (rOut - rIn) * (0.2 + 0.7 * Math.random());
  return { x: r * Math.cos(a), y: r * Math.sin(a) };
}
function retarget() {
  const S = scene.geo.S;
  const s = nucleonSize(nuc.length, S, scene.geo.R); nuc.forEach((t, i) => { t.slot = nucSlot(i, s); });
  const per = shellCounts(els.length); let k = 0;
  per.forEach((c, shell) => { for (let j = 0; j < c; j++, k++) { const e = els[k]; if (e.shell !== shell || !e.spot) { e.shell = shell; e.spot = electronSpot(shell, j, SHELLS[shell]); } } });
}
function add(kind, from) {
  const c = counts();
  if ((kind === "proton" && c.p >= MAX_Z) || (kind === "neutron" && c.n >= MAX_N) || (kind === "electron" && c.e >= MAX_E)) { toast(`That's the most ${kind}s here`); return false; }
  const g = scene.geo, start = from ? { x: from.x - g.cx, y: from.y - g.cy } : { x: 0, y: g.R * 1.4 };
  const t = { kind, x: start.x, y: start.y, vx: 0, vy: 0 };
  if (kind === "electron") { t.alpha = 1; t.next = performance.now() + 1500 + Math.random() * 1500; els.push(t); } else nuc.push(t);
  retarget(); changed(kind !== "electron"); tick(kind === "electron" ? 880 : 520); buzz(8);
  return true;
}
function remove(kind) {
  const list = kind === "electron" ? els : nuc, i = list.map((t) => t.kind).lastIndexOf(kind);
  if (i < 0) return; list.splice(i, 1); retarget(); changed(kind !== "electron");
}
function clearAll() { nuc.length = 0; els.length = 0; retarget(); changed(true); }
function setAtom(a) { clearAll(); const s = sanitizeAtom(a); const g = scene.geo; for (let i = 0; i < s.p; i++) nuc.push({ kind: "proton", x: 0, y: 0, vx: 0, vy: 0 }); for (let i = 0; i < s.n; i++) nuc.splice(Math.min(nuc.length, i * 2 + 1), 0, { kind: "neutron", x: 0, y: 0, vx: 0, vy: 0 }); for (let i = 0; i < s.e; i++) els.push({ kind: "electron", x: 0, y: g.R * 0.5, vx: 0, vy: 0, alpha: 1, next: performance.now() + 1500 * Math.random() }); retarget(); changed(true); }

// ---------- readout, challenges, table ----------
function changed(nucleusChanged) {
  const a = counts(), d = describe(a);
  $("symbol").textContent = d.el ? d.el.symbol : "?";
  $("name").textContent = d.el ? `${d.nuclide}` : d.kind;
  $("facts").textContent = `Protons ${a.p}, neutrons ${a.n}, electrons ${a.e}. Mass number ${d.A}, charge ${d.chargeText}.`;
  $("stab").textContent = d.el ? `${d.kind}. ${d.stability.replace(/\.$/, "")}.` : d.kind === "Empty" && !a.e ? "Drag a proton onto the atom to start." : "Add a proton to make an element.";
  $("stab").dataset.stable = String(d.stable);
  canvas.setAttribute("aria-label", `Atom: ${$("name").textContent}. ${$("facts").textContent} ${$("stab").textContent}`);
  for (const k of KINDS) $("cap-" + k).textContent = `${k[0].toUpperCase() + k.slice(1)}s ${a[k[0]]}`;
  if (nucleusChanged && prediction.pending && a.p > 0) {
    const r = prediction.resolve(d.stable); guess = null; card.streak(r.streak.count, r.streak.best);
    toast(r.correct ? "You called it" : d.stable ? "It is stable after all" : "That one is unstable");
  }
  if (a.e === a.p) { const c = collect(table, a); if (c.fresh) { table = c.table; store.set(TABLE_KEY, JSON.stringify(table)); toast(`${d.nuclide} added to your table`); celebrate(); } }
  if (engine.report({ type: "atom", atom: a, isotopesOfThis: (table[a.p] || []).length }).length) { chipSync(); celebrate(); }
  if (mode === "build" && TARGETS[targetIdx].check(a) && !changed.done?.[targetIdx]) { (changed.done ||= {})[targetIdx] = true; toast("Target built"); celebrate(); }
  renderMode(true);
}

// ---------- modes / controls ----------
const body = $("modeBody");
for (const t of document.querySelectorAll(".tabs [role=tab]")) t.addEventListener("click", () => setMode(t.dataset.mode));
function setMode(m) { mode = m; for (const t of document.querySelectorAll(".tabs [role=tab]")) t.setAttribute("aria-selected", String(t.dataset.mode === m)); renderMode(); layoutUI(); }
const btn = (label, on, cls = "", aria) => { const b = el("button", { type: "button", textContent: label, className: cls }); if (aria) b.setAttribute("aria-label", aria); b.addEventListener("click", on); return b; };
const pressed = (b, v) => { b.setAttribute("aria-pressed", String(!!v)); return b; };
function steppers() {
  const a = counts();
  return KINDS.map((k) => el("div", { className: "row stepper" }, el("span", { className: "dim", textContent: k[0].toUpperCase() + k.slice(1) + "s" }),
    btn("\u2212", () => remove(k), "", `Remove a ${k}`), btn("+", () => add(k), "", `Add a ${k}`), el("output", { textContent: String(a[k[0]]) })));
}
function predictRow() {
  const row = el("div", { className: "row fun-predict" }, el("span", { className: "dim", textContent: "Next particle: will the nucleus be stable?" }));
  for (const [label, v] of [["Stable", true], ["Unstable", false]]) row.appendChild(pressed(btn(label, () => { guess = guess === v ? null : v; prediction.predict(guess); renderMode(); }), guess === v));
  return row;
}
function periodicTable() {
  const grid = el("div", { className: "ptable", role: "list", ariaLabel: "Collected elements" });
  for (let z = 1; z <= MAX_Z; z++) {
    const [r, c] = TABLE_POS[z], got = table[z];
    const cell = el("div", { className: "cell" + (got ? " got" : ""), role: "listitem" }, ELEMENTS[z][0]);
    if (got) cell.append(el("small", { textContent: got.join(",") }));
    cell.setAttribute("aria-label", got ? `${ELEMENTS[z][1]}: built ${got.map((A) => ELEMENTS[z][1] + "-" + A).join(", ")}` : `${ELEMENTS[z][1]}: not built yet`);
    cell.style.gridRow = r; cell.style.gridColumn = c; grid.appendChild(cell);
  }
  return grid;
}
function renderMode(soft) {
  body.replaceChildren();
  const a = counts();
  if (mode === "build") {
    const t = TARGETS[targetIdx], ok = t.check(a);
    body.append(el("p", { textContent: `Target ${targetIdx + 1} of ${TARGETS.length}: ${t.label}${ok ? " (built)" : ""}` }), el("p", { className: "dim", textContent: t.hint }),
      ...steppers(), predictRow(),
      el("div", { className: "row" }, btn("Previous", () => { targetIdx = Math.max(0, targetIdx - 1); renderMode(); }), btn("Clear atom", clearAll), btn(ok ? "Next target" : "Skip", () => { targetIdx = (targetIdx + 1) % TARGETS.length; renderMode(); }, ok ? "primary" : "")));
  } else if (mode === "sandbox") {
    const sh = btn("Share my atom", async () => { const r = await shareLink(encodeState(sanitizeState(counts(), SHARE_SCHEMA))); sh.textContent = r.copied ? "Link copied" : "Link in address bar"; setTimeout(() => { sh.textContent = "Share my atom"; }, 1600); });
    body.append(el("p", { className: "dim", textContent: "Drag particles on and off the atom, or use the buttons." }), ...steppers(), predictRow(), el("div", { className: "row" }, btn("Clear atom", clearAll), sh));
  } else {
    const n = Object.keys(table).length, iso = Object.values(table).reduce((s, l) => s + l.length, 0);
    body.append(el("p", { textContent: `${n} of ${MAX_Z} elements collected, ${iso} stable isotopes.` }), periodicTable(),
      el("p", { className: "dim", textContent: "Build a neutral atom with a stable nucleus to add it. Each new mass number is a new isotope." }));
  }
  if (!soft) { sheet?.layout(); requestFit(); } else sheet?.layout();
}

// ---------- input: drag from trays, drag particles off the atom ----------
let held = null, drag = null;
const local = (e) => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
canvas.addEventListener("pointerdown", (e) => {
  const p = local(e), g = scene.geo;
  const tr = g.trays.find((t) => p.x >= t.x && p.x <= t.x + t.w && p.y >= t.y && p.y <= t.y + t.h);
  if (tr) { held = { kind: tr.kind, x: p.x, y: p.y, gx: 0, gy: 0 }; canvas.setPointerCapture?.(e.pointerId); tick(400); return; }
  // Pick up the nearest particle on the atom (electrons first: they sit on top).
  let best = null, bd = g.S * 0.55;
  for (const list of [els, nuc]) for (const t of list) { const d = Math.hypot(g.cx + t.x - p.x, g.cy + t.y - p.y); if (d < bd) { bd = d; best = t; } }
  if (best) { const list = best.kind === "electron" ? els : nuc; list.splice(list.indexOf(best), 1); held = { kind: best.kind, x: p.x, y: p.y, gx: g.cx + best.x - p.x, gy: g.cy + best.y - p.y, from: best }; retarget(); canvas.setPointerCapture?.(e.pointerId); }
});
canvas.addEventListener("pointermove", (e) => { if (!held) return; const p = local(e); held.x = p.x + held.gx; held.y = p.y + held.gy; }); // 1:1 with the grab offset
const endDrag = () => {
  if (!held) return;
  const h = held, g = scene.geo; held = null;
  const inAtom = Math.hypot(h.x - g.cx, h.y - g.cy) < g.R;
  if (h.from) { if (inAtom) { (h.kind === "electron" ? els : nuc).push(Object.assign(h.from, { x: h.x - g.cx, y: h.y - g.cy })); retarget(); } else { changed(h.kind !== "electron"); toast(`Took a ${h.kind} off`); } return; }
  if (inAtom) add(h.kind, h); else buzz(5);
};
canvas.addEventListener("pointerup", endDrag); canvas.addEventListener("pointercancel", endDrag);
canvas.addEventListener("keydown", (e) => { const k = { p: "proton", n: "neutron", e: "electron" }[e.key.toLowerCase()]; if (k) { e.preventDefault(); e.shiftKey ? remove(k) : add(k); } });

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
  const ctl = $("controls").getBoundingClientRect(), st = $("status").getBoundingClientRect();
  if (wide.matches) { const x = Math.max(st.right + 16, innerWidth >= 900 ? 300 : 0), w = ctl.left - 12 - x; scene.setBox({ x, y: 64, w, h: innerHeight - 64 - 12 }); }
  else { const top = st.bottom + 8, bottom = Math.min(innerHeight, ctl.top) - 8; scene.setBox({ x: 12, y: top, w: innerWidth - 24, h: Math.max(200, bottom - top) }); }
  retarget();
}
function layoutUI() { phoneSync(); sheet?.layout(); requestFit(); }
phone.addEventListener?.("change", layoutUI); wide.addEventListener?.("change", layoutUI);
addEventListener("resize", () => { scene.resize(); layoutUI(); });
const place = (node, x, y) => { node.style.left = Math.round(x) + "px"; node.style.top = Math.round(y) + "px"; };

// ---------- loop ----------
let last = performance.now();
function frame(now) {
  const real = Math.min(0.05, (now - last) / 1000); last = now;
  const a = counts(), unstable = a.p > 0 && !isStable(a), g = scene.geo;
  // Predict, then run: while a guess waits, particles land in slow motion (the key moment).
  const opt = prediction.pending && !reduced() ? { response: 0.9, damping: 1 } : { response: 0.35, damping: 1 };
  nuc.forEach((t, i) => {
    if (reduced()) { t.x = t.slot.x; t.y = t.slot.y; } else { const sx = springStep({ x: t.x, v: t.vx }, t.slot.x, real, opt), sy = springStep({ x: t.y, v: t.vy }, t.slot.y, real, opt); t.x = sx.x; t.vx = sx.v; t.y = sy.x; t.vy = sy.v; }
    // Unstable nuclei wobble gently (no scare effects).
    const w = unstable && !reduced() ? g.S * 0.05 : 0; t.wx = w * Math.sin(now / 260 + i * 1.7); t.wy = w * Math.cos(now / 310 + i * 2.3);
  });
  for (const e of els) {
    if (!e.spot) continue;
    // An electron is somewhere in its cloud: now and then it shows up at another likely spot (fade, never a path).
    if (!reduced() && now > e.next) { e.fade = now; e.next = now + 1800 + Math.random() * 2200; }
    if (e.fade) { const k = (now - e.fade) / 300; if (k < 0.5) e.alpha = 1 - 2 * k; else { if (!e.moved) { const j = Math.random() * SHELLS[e.shell]; e.spot = electronSpot(e.shell, j, SHELLS[e.shell]); e.x = e.spot.x; e.y = e.spot.y; e.moved = true; } e.alpha = Math.min(1, 2 * k - 1); if (k >= 1) { e.fade = 0; e.moved = false; e.alpha = 1; } } }
    else if (reduced()) { e.x = e.spot.x; e.y = e.spot.y; } else { const sx = springStep({ x: e.x, v: e.vx }, e.spot.x, real, opt), sy = springStep({ x: e.y, v: e.vy }, e.spot.y, real, opt); e.x = sx.x; e.vx = sx.v; e.y = sy.x; e.vy = sy.v; }
  }
  const geo = scene.draw({ nucleons: nuc, nS: nS(), electrons: els, shells: shellCounts(els.length), held }, now);
  // Live captions, each 12px below its art.
  place($("scaleCap"), geo.cx, geo.artBottom + CAPTION_GAP);
  for (const t of geo.trays) place($("cap-" + t.kind), t.x + t.w / 2, t.y + t.h + CAPTION_GAP);
  requestAnimationFrame(frame);
}
scene.resize(); layoutUI(); fit();
const share = sanitizeState(decodeState(location.hash), SHARE_SCHEMA);
renderMode();
if (Object.keys(share).length) { setMode("sandbox"); setAtom(share); } else changed(false);
requestAnimationFrame(frame);
window.__ab = { counts, setAtom, setTarget(i) { targetIdx = i; renderMode(); }, get target() { return TARGETS[targetIdx].id; }, add, remove, setMode, get geo() { return scene.geo; }, get table() { return table; }, CAPTION_GAP, get mode() { return mode; } };
// Re-fit the stage whenever the readout or the sheet changes height.
if (typeof ResizeObserver === "function") { const ro = new ResizeObserver(() => requestFit()); ro.observe($("status")); ro.observe($("controls")); }
