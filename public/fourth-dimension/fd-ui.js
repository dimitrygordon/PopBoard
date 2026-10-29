// Beyond 3D: page book, input (drag 1:1 with momentum, swipe, keys), controls and fun layer.
// Narration: pages.js. Math: fd-math.js. Drawing: fd-scene.js.
import { forwardStudyQuery } from "../board-return.js?v=20261022a";
import { PAGES, CHAPTERS } from "./pages.js";
import { createStage, SCENES, turn3, turn4, newView } from "./fd-scene.js";
import * as M from "./fd-math.js";
import { MODULE_ID, GOALS, SHARE_SCHEMA, loadStamps, earnStamp, lastPageOfChapter } from "./fd-fun.js";
import {
  initFun, pressFeedback, smoothTheme, prefers, challengeCard, disclosure, createChallenges, TIERS,
  bottomSheet, springStep, project, encodeState, decodeState, sanitizeState, shareLink, celebrate
} from "../shared/fun/fun-ui.js";

const $ = (id) => document.getElementById(id);
const root = document.documentElement;
const THEME_KEY = "popboard.fourth-dimension.theme", CONTRAST_KEY = "popboard.fourth-dimension.contrast";
initFun(); pressFeedback();
const reduced = () => prefers.reducedMotion;

// ---------- stage ----------
const canvas = $("scene");
const lowEnd = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
const stage = createStage(canvas, { lowEnd });
const css = (n) => getComputedStyle(root).getPropertyValue(n).trim();
const palette = () => ({
  bg: css("--fd-bg"), floor: css("--fd-floor"), wall: css("--fd-wall"), grid: css("--fd-grid"), gridOpacity: Number(css("--fd-grid-opacity")) || 0.2,
  edge: css("--fd-edge"), glass: css("--fd-glass"), glassOpacity: Number(css("--fd-glass-opacity")) || 0.14, gold: css("--fd-gold"),
  shadow: css("--fd-shadow"), light: root.getAttribute("data-theme") === "light", ink: css("--fd-ink"), paper: css("--fd-paper")
});
stage.setPalette(palette()); stage.resize();
new ResizeObserver(() => stage.resize()).observe(canvas);

// ---------- theme + contrast ----------
function syncThemeButtons() {
  const light = root.getAttribute("data-theme") === "light";
  $("themeLabel").textContent = light ? "Dark" : "Paper";
  $("themeBtn").setAttribute("aria-label", light ? "Switch to the dark blueprint room" : "Switch to the light paper room");
  $("contrastBtn").setAttribute("aria-pressed", String(root.getAttribute("data-contrast") === "more"));
}
$("themeBtn").addEventListener("click", () => {
  smoothTheme();
  const t = root.getAttribute("data-theme") === "light" ? "dark" : "light";
  root.setAttribute("data-theme", t); try { localStorage.setItem(THEME_KEY, t); } catch (e) {}
  syncThemeButtons(); rebuild();
});
$("contrastBtn").addEventListener("click", () => {
  const on = root.getAttribute("data-contrast") !== "more";
  if (on) root.setAttribute("data-contrast", "more"); else root.removeAttribute("data-contrast");
  try { localStorage.setItem(CONTRAST_KEY, on ? "more" : "normal"); } catch (e) {}
  syncThemeButtons(); rebuild();
});
syncThemeButtons();
$("studyBackBtn").addEventListener("click", (e) => {
  e.preventDefault();
  const qs = forwardStudyQuery(location.search).toString();
  history.replaceState(null, "", qs ? "?" + qs : location.pathname);
  location.href = "study.html" + location.search;
});

// ---------- fun layer ----------
const funBox = $("funBox");
const chip = document.createElement("button"); chip.type = "button"; chip.className = "fun-chip"; chip.id = "funChip";
const pop = document.createElement("section"); pop.id = "funCard"; pop.className = "fun-pop";
funBox.append(chip, pop);
const card = challengeCard(pop, GOALS);
const stampsEl = document.createElement("div"); stampsEl.className = "stamps"; pop.appendChild(stampsEl);
const shareBtn = document.createElement("button"); shareBtn.type = "button"; shareBtn.textContent = "Share my view"; shareBtn.style.marginTop = "8px"; pop.appendChild(shareBtn);
disclosure(chip, pop, false);
const engine = createChallenges({ moduleId: MODULE_ID, goals: GOALS, onEarn: (g) => card.flash(g.tier) });
function chipSync() {
  const earned = engine.earned(), top = TIERS.filter((t) => earned.includes(t)).pop();
  chip.replaceChildren();
  if (top) { const m = document.createElement("span"); m.className = "fun-medal fun-badge " + top; chip.appendChild(m); }
  chip.append(`${top ? top[0].toUpperCase() + top.slice(1) : "Challenges"} ${earned.length}/${GOALS.length}`);
  chip.setAttribute("aria-label", `Challenges: ${earned.length} of ${GOALS.length} medals earned. Show list`);
  card.update(earned);
  const got = new Set(loadStamps());
  stampsEl.replaceChildren(...CHAPTERS.map((c) => { const s = document.createElement("span"); s.textContent = c.stamp; s.className = got.has(c.n) ? "got" : ""; s.title = `Chapter ${c.n}: ${c.title}`; return s; }));
}
chipSync();
const report = (e) => { if (engine.report(e).length) chipSync(); };

// ---------- pages ----------
const memory = new Map(); // page id -> saved scene state
let index = 0, scene = null, page = null, dragMode = "3d", plane4 = "YW";
const startHash = location.hash;
const params = new URLSearchParams(location.search);
const want = params.get("page");
if (want) { const i = PAGES.findIndex((p, k) => p.id === want || String(k + 1) === want); if (i >= 0) index = i; }
const shared = sanitizeState(decodeState(startHash), SHARE_SCHEMA);
if (Object.keys(shared).length) { index = PAGES.findIndex((p) => p.id === "sandbox"); memory.set("sandbox", { ...shared }); }

const ctx = { reduced: false, time: 0, dragging: false, userMoved: false,
  readout: (t) => { if ($("readout").textContent !== t) $("readout").textContent = t; },
  report: (e) => report(e), sync: (k, v) => { const el = document.querySelector(`[data-key="${k}"]`); if (el) el.value = v; } };

function buildControls() {
  const body = $("controlsBody"); body.replaceChildren();
  const c = scene.controls || {};
  for (const s of c.sliders || []) {
    const lab = document.createElement("label"); lab.textContent = s.label;
    const inp = document.createElement("input"); inp.type = "range"; inp.min = s.min; inp.max = s.max; inp.step = s.step; inp.value = s.value; inp.dataset.key = s.key;
    inp.setAttribute("aria-label", s.label);
    inp.addEventListener("input", () => { scene.set(s.key, Number(inp.value)); ctx.userMoved = true; });
    lab.appendChild(inp); body.appendChild(lab);
  }
  const row = document.createElement("div"); row.className = "row";
  for (const ch of c.choices || []) for (const o of ch.options) {
    const b = document.createElement("button"); b.type = "button"; b.textContent = o; b.setAttribute("aria-pressed", String(o === ch.value));
    b.addEventListener("click", () => { scene.set(ch.key, o); for (const x of row.querySelectorAll("[data-choice]")) x.setAttribute("aria-pressed", String(x === b)); });
    b.dataset.choice = ch.key; row.appendChild(b);
  }
  for (const tg of c.toggles || []) {
    const b = document.createElement("button"); b.type = "button"; b.textContent = tg.label; let v = tg.value; b.setAttribute("aria-pressed", String(v));
    b.addEventListener("click", () => { v = !v; scene.set(tg.key, v); b.setAttribute("aria-pressed", String(v)); }); row.appendChild(b);
  }
  for (const bt of c.buttons || []) { const b = document.createElement("button"); b.type = "button"; b.textContent = bt.label; b.addEventListener("click", () => scene.set(bt.key)); row.appendChild(b); }
  if (row.children.length) body.appendChild(row);
  $("controls").classList.toggle("blank", !body.children.length);
}
function countTable(recap) {
  const t = document.createElement("table"); t.className = "count-table";
  t.innerHTML = "<thead><tr><th>Shape</th><th>Dim</th><th>Corners</th><th>Edges</th><th>Squares</th><th>Cubes</th></tr></thead>";
  const tb = document.createElement("tbody");
  for (let n = 0; n <= 4; n++) {
    const tr = document.createElement("tr"); if (n === 4 && !recap) tr.className = "next";
    const cells = [M.NAMES[n], n, M.vertices(n), M.edges(n), M.squares(n), M.cubes(n)];
    tr.innerHTML = cells.map((v) => `<td>${v}</td>`).join("");
    if (n === 4 && !recap) { tr.title = "Tap to reveal"; tr.querySelectorAll("td").forEach((td, i) => { if (i > 1) td.textContent = "?"; }); tr.addEventListener("click", () => tr.querySelectorAll("td").forEach((td, i) => { td.textContent = cells[i]; })); tr.tabIndex = 0; tr.addEventListener("keydown", (e) => { if (e.key === "Enter") tr.click(); }); }
    tb.appendChild(tr);
  }
  t.appendChild(tb); return t;
}

function show(i, dir = 0) {
  if (scene) memory.set(page.id, scene.save());
  index = Math.max(0, Math.min(PAGES.length - 1, i)); page = PAGES[index];
  page.opts = page.opts || {};
  scene = SCENES[page.scene](stage, page, memory.get(page.id));
  stage.setScene(scene);
  ctx.userMoved = false; vel.a = 0; vel.b = 0;
  dragMode = scene.drag === "4d" ? "4d" : "3d";
  const chap = CHAPTERS.find((c) => c.n === page.chapter);
  $("chapterLabel").textContent = `Chapter ${chap.n} \u00b7 ${chap.title}`;
  $("narration").textContent = page.text;
  $("hint").textContent = page.hint || ""; $("hint").hidden = !page.hint;
  $("readout").textContent = "";
  $("tableHost").replaceChildren(...(scene.table ? [countTable(page.opts.recap)] : []));
  $("pageCount").textContent = `${index + 1} / ${PAGES.length}`;
  $("prevBtn").disabled = index === 0; $("nextBtn").disabled = index === PAGES.length - 1;
  const stamp = $("stampLabel");
  if (index === lastPageOfChapter(PAGES, page.chapter)) { const fresh = earnStamp(page.chapter); stamp.hidden = false; stamp.textContent = `Stamp: ${chap.stamp}`; if (fresh) { if (dir) celebrate(); chipSync(); } }
  else stamp.hidden = true;
  const rot = scene.drag === "3d" || scene.drag === "4d";
  $("railLeft").hidden = !(rot && scene.has4d);
  $("railRight").hidden = !rot;
  $("planeBtn").hidden = !scene.has4d; $("projBtn").hidden = !scene.hasProj;
  syncRail(); buildControls(); turnAnim(dir);
  history.replaceState(null, "", location.pathname + "?" + new URLSearchParams({ ...Object.fromEntries(params), page: page.id }).toString());
  sheet?.layout();
  canvas.setAttribute("aria-label", `Page ${index + 1}: ${page.text}`);
}
function rebuild() { stage.setPalette(palette()); show(index, 0); }
function syncRail() {
  $("mode3d").setAttribute("aria-pressed", String(dragMode === "3d"));
  $("mode4d").setAttribute("aria-pressed", String(dragMode === "4d"));
  $("planeBtn").textContent = `\u2195 ${plane4}`; $("planeBtn").setAttribute("aria-label", `Vertical drag in 4D turns the ${plane4} plane. Tap to switch`);
  if (scene?.view) $("projBtn").setAttribute("aria-pressed", String(scene.view.proj === "ortho"));
}
$("mode3d").addEventListener("click", () => { dragMode = "3d"; syncRail(); });
$("mode4d").addEventListener("click", () => { dragMode = "4d"; syncRail(); });
$("planeBtn").addEventListener("click", () => { plane4 = plane4 === "YW" ? "ZW" : "YW"; syncRail(); });
$("projBtn").addEventListener("click", () => { if (!scene.view) return; scene.view.proj = scene.view.proj === "ortho" ? "perspective" : "ortho"; ctx.userMoved = true; syncRail(); });
$("resetBtn").addEventListener("click", () => { memory.delete(page.id); scene.dispose(); scene = null; show(index, 0); });
$("prevBtn").addEventListener("click", () => show(index - 1, -1));
$("nextBtn").addEventListener("click", () => show(index + 1, 1));

// Page turn: caption springs in from the side it came from (same path in and out). Reduced motion: fade only.
let turnRaf = 0;
function turnAnim(dir) {
  const cap = $("caption"); cancelAnimationFrame(turnRaf);
  canvas.classList.add("fading"); requestAnimationFrame(() => canvas.classList.remove("fading"));
  if (!dir || reduced()) { cap.style.transform = ""; cap.style.opacity = ""; if (dir) { cap.style.opacity = "0"; requestAnimationFrame(() => { cap.style.transition = "opacity 200ms"; cap.style.opacity = "1"; }); } return; }
  let s = { x: dir * 60, v: 0 }, prev = performance.now();
  const step = (now) => {
    const dt = Math.min(0.032, (now - prev) / 1000); prev = now;
    s = springStep(s, 0, dt);
    cap.style.transform = `translate3d(${s.x.toFixed(1)}px,0,0)`; cap.style.opacity = String(1 - Math.min(1, Math.abs(s.x) / 80));
    if (Math.abs(s.x) > 0.3 || Math.abs(s.v) > 5) turnRaf = requestAnimationFrame(step); else { cap.style.transform = ""; cap.style.opacity = ""; }
  };
  turnRaf = requestAnimationFrame(step);
}

// ---------- input ----------
// Drag: 1:1 (a drag across the shorter side of the canvas = half a turn). Release: momentum that
// decays like UIScrollView (0.998 per ms). Reduced motion: no momentum.
const vel = { a: 0, b: 0 };
let drag = null;
const radPerPx = () => Math.PI / Math.min(canvas.clientWidth, canvas.clientHeight);
function applyTurn(da, db) {
  if (!scene.view) return;
  if (dragMode === "4d" && scene.has4d) { turn4(scene.view, "XW", da); turn4(scene.view, plane4, db); }
  else turn3(scene.view, da, db);
}
canvas.addEventListener("pointerdown", (e) => {
  canvas.setPointerCapture?.(e.pointerId);
  drag = { x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, t: performance.now(), moved: 0 };
  vel.a = vel.b = 0; ctx.dragging = true;
});
canvas.addEventListener("pointermove", (e) => {
  if (!drag) return;
  const now = performance.now(), dt = Math.max(1, now - drag.t);
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
  drag.moved += Math.abs(dx) + Math.abs(dy);
  const k = radPerPx();
  if (scene.drag === "extrude") {
    scene.extrude(dx / (canvas.clientWidth * 0.35));
    const el = document.querySelector('[data-key="t"]'); if (el) el.value = scene.save().t;
    if (page.opts.n >= 3) applyTurn(0, dy * k);
  } else if (scene.drag === "3d" || scene.drag === "4d") {
    applyTurn(dx * k, dy * k); ctx.userMoved = true;
    vel.a = 0.8 * (dx * k / dt * 1000) + 0.2 * vel.a; vel.b = 0.8 * (dy * k / dt * 1000) + 0.2 * vel.b;
  }
  drag.x = e.clientX; drag.y = e.clientY; drag.t = now;
});
const endDrag = () => {
  if (!drag) return;
  const dx = drag.x - drag.x0, dy = drag.y - drag.y0;
  if (drag.moved < 6) scene.tap?.();
  if (scene.drag === "extrude") scene.release();
  if (scene.drag === "none" && Math.abs(dx) > 50 && Math.abs(dx) > 1.5 * Math.abs(dy)) show(index + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
  if (reduced() || performance.now() - drag.t > 80) vel.a = vel.b = 0;
  drag = null; ctx.dragging = false;
};
canvas.addEventListener("pointerup", endDrag); canvas.addEventListener("pointercancel", endDrag);
// Swipe on the caption or the page counter area turns pages on every page.
for (const el of [$("caption"), document.querySelector(".nav")]) {
  let s = null;
  el.addEventListener("pointerdown", (e) => { if (e.target.closest("button, input, tr")) return; s = { x: e.clientX, y: e.clientY }; });
  el.addEventListener("pointerup", (e) => { if (!s) return; const dx = e.clientX - s.x, dy = e.clientY - s.y; s = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > 1.5 * Math.abs(dy)) show(index + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1); });
}
addEventListener("keydown", (e) => {
  if (e.target.matches?.("input")) return;
  if (e.key === "ArrowRight" || e.key === "PageDown") { e.preventDefault(); show(index + 1, 1); }
  if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); show(index - 1, -1); }
  if (e.key === "Home") show(0, -1); if (e.key === "End") show(PAGES.length - 1, 1);
});
shareBtn.addEventListener("click", async () => {
  const st = (scene.share || scene.save)();
  const r = await shareLink(encodeState(sanitizeState({ shape: "tesseract", ...st }, SHARE_SCHEMA)));
  shareBtn.textContent = r.copied ? "Link copied" : "Link in address bar";
  setTimeout(() => { shareBtn.textContent = "Share my view"; }, 1600);
});

// ---------- phones: controls as a bottom sheet ----------
const phone = matchMedia("(max-width: 600px)");
let sheet = null;
const snaps = () => {
  const body = $("controlsBody"), first = body.firstElementChild;
  const peek = first ? Math.ceil(first.getBoundingClientRect().height + 44) : 40;
  const full = Math.max(peek + 40, Math.ceil(body.scrollHeight + 52));
  return [peek, Math.max(peek + 1, Math.round((peek + full) / 2)), full];
};
function phoneSync() {
  if (phone.matches && !sheet) {
    $("controls").classList.add("fun-sheet-on");
    sheet = bottomSheet($("controls"), $("sheetHandle"), { getSnaps: snaps, start: 0, onSnap: () => {} });
  } else if (!phone.matches && sheet) { sheet.destroy(); sheet = null; $("controls").classList.remove("fun-sheet-on"); }
  const peek = phone.matches && !$("controls").classList.contains("blank") ? snaps()[0] : 0;
  root.style.setProperty("--fd-sheet-peek", peek + "px");
}
phone.addEventListener?.("change", () => { phoneSync(); sheet?.layout(); });
const _layout = () => { if (sheet) { sheet.layout(); } phoneSync(); };

// ---------- loop ----------
let last = performance.now(), frames = 0, fpsT = last, slow = 0;
const fps = { value: 0, samples: [], workMs: 0 };
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  ctx.time = now / 1000; ctx.reduced = reduced();
  if (!drag && (vel.a || vel.b)) {
    const decay = Math.pow(0.998, dt * 1000);
    applyTurn(vel.a * dt, vel.b * dt); vel.a *= decay; vel.b *= decay;
    if (Math.abs(vel.a) + Math.abs(vel.b) < 0.02) vel.a = vel.b = 0;
  }
  if (!document.hidden) { const w0 = performance.now(); scene.update(dt, ctx); stage.render(); fps.workMs = 0.95 * fps.workMs + 0.05 * (performance.now() - w0); }
  frames++;
  if (now - fpsT >= 1000) {
    fps.value = frames * 1000 / (now - fpsT); fps.samples.push(fps.value); if (fps.samples.length > 30) fps.samples.shift();
    frames = 0; fpsT = now;
    // Adaptive quality: two slow seconds in a row drop the pixel ratio a step.
    slow = fps.value < 50 ? slow + 1 : 0; if (slow >= 2) { stage.lowerDpr(); slow = 0; }
  }
  requestAnimationFrame(frame);
}
show(index, 0);
phoneSync(); _layout();
addEventListener("resize", _layout);
requestAnimationFrame(frame);
window.__fd = { pages: PAGES, go: (id) => show(PAGES.findIndex((p) => p.id === id), 0), fps, stage, get scene() { return scene; }, get index() { return index; }, project };
