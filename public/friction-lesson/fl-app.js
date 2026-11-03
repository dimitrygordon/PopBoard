// Presenter shell: page turns, play/pause, replay, auto-advance, side-text collapse, Fullscreen API,
// light/dark (shared with the PopBoard toggle), and the per-page narration player.
import { timeline, fx, h } from "./fl-engine.js";
import { PAGES } from "./fl-pages.js";

const $ = (id) => document.getElementById(id);
const scene = $("flScene"), side = $("flSide");
const reducedQ = matchMedia("(prefers-reduced-motion: reduce)");
const state = { i: 0, T: null, extra: null, steps: [], playing: true, auto: false, prog: null, autoTimer: 0, narration: null };
try { state.auto = localStorage.getItem("popboard.friction.auto") === "1"; } catch (e) {}

// Back to the Study library, keeping the board query (same pattern as the other study pages).
$("studyBackBtn").href = "study.html" + location.search;

/* narration: friction-lesson/narration/manifest.json maps page -> { text, audio }. No audio, no player. */
const manifest = fetch("friction-lesson/narration/manifest.json").then((r) => (r.ok ? r.json() : null)).catch(() => null);
function narrationSlot(n) {
  const box = h("div", "narr"); box.hidden = true;
  manifest.then((m) => {
    const entry = m && m.pages && m.pages[String(n)];
    if (!entry || !entry.audio) return;
    const a = new Audio(); a.preload = "metadata";
    const btn = h("button", "pencil-btn", "▶ Narration"); btn.type = "button";
    btn.onclick = () => { if (a.paused) { a.play().catch(() => {}); } else a.pause(); };
    a.onplay = () => { btn.textContent = "❚❚ Narration"; }; a.onpause = a.onended = () => { btn.textContent = "▶ Narration"; };
    a.onerror = () => { box.hidden = true; };
    a.onloadedmetadata = () => { if (state.i === n - 1) box.hidden = false; };
    a.src = "friction-lesson/narration/" + entry.audio;
    box.appendChild(btn);
    state.narration = a;
  });
  return box;
}

function stopPage() {
  clearTimeout(state.autoTimer);
  if (state.T) state.T.anims.forEach((a) => a.cancel());
  if (state.prog) state.prog.cancel();
  if (state.narration) { state.narration.pause(); state.narration = null; }
  scene.querySelectorAll("video").forEach((v) => v.pause());
  scene.replaceChildren(); side.replaceChildren();
}

function render(i) {
  stopPage();
  state.i = Math.max(0, Math.min(PAGES.length - 1, i));
  const p = PAGES[state.i], n = state.i + 1;
  document.body.dataset.page = String(n);
  if (p.centered) document.body.dataset.centered = ""; else delete document.body.dataset.centered;
  side.innerHTML = (p.noKicker ? "" : `<p class="kicker">${fx(p.kicker)}</p><h2>${fx(p.title)}</h2>`) + fx(p.side || "");
  side.appendChild(narrationSlot(n));
  $("flCapT").innerHTML = fx(p.title);
  $("flCapQ").innerHTML = fx(p.cap || "");
  $("flCount").textContent = `Page ${n} of ${PAGES.length}`;
  history.replaceState(null, "", "?" + new URLSearchParams({ ...Object.fromEntries(new URLSearchParams(location.search)), page: n }));
  const T = timeline(scene, { reduced: reducedQ.matches });
  state.T = T;
  state.extra = p.build(scene, T) || {};
  state.steps = [...(state.extra.steps || [])];
  startClock(T);
}

function startClock(T) {
  const end = Math.max(0.5, T.end());
  state.prog = $("flProg").animate([{ width: "0%" }, { width: "100%" }], { duration: end * 1000, fill: "forwards" });
  state.prog.onfinish = () => {
    if (state.auto && !state.steps.length && state.i < PAGES.length - 1) {
      state.autoTimer = setTimeout(() => { if (state.playing) go(1); }, 4000);
    }
  };
  if (T.reduced) { T.finishAll(); state.prog.finish(); }
  else if (!state.playing) setPlaying(false);
}

function runStep() {
  const step = state.steps.shift();
  const T2 = timeline(scene, { reduced: reducedQ.matches });
  step(T2);
  state.T.anims.push(...T2.anims);
  if (state.prog) state.prog.cancel();
  startClock(T2);
}

function go(d) {
  if (d > 0 && state.steps.length) { runStep(); return; }
  if (state.i + d < 0 || state.i + d >= PAGES.length) return;
  render(state.i + d);
}

function setPlaying(on) {
  state.playing = on;
  const all = [...(state.T ? state.T.anims : []), state.prog].filter(Boolean);
  all.forEach((a) => { if (a.playState === "finished" || a.playState === "idle") return; on ? a.play() : a.pause(); });
  scene.querySelectorAll("video").forEach((v) => { if (on) v.play().catch(() => {}); else v.pause(); });
  if (!on) clearTimeout(state.autoTimer);
  const b = $("playBtn"); b.setAttribute("aria-pressed", String(on));
  b.textContent = on ? "❚❚ Pause" : "▶ Play"; b.setAttribute("aria-label", on ? "Pause" : "Play");
}

/* layout and theme */
function setCollapsed(on) {
  document.body.classList.toggle("fl-full", on);
  $("textBtn").setAttribute("aria-pressed", String(on));
  $("textBtn").textContent = on ? "Show text" : "Hide text";
}
async function toggleFullscreen() {
  const el = document.documentElement;
  if (document.fullscreenElement) { await document.exitFullscreen().catch(() => {}); return; }
  setCollapsed(true);
  if (el.requestFullscreen) await el.requestFullscreen({ navigationUI: "hide" }).catch(() => {});
  $("fsBtn").setAttribute("aria-pressed", "true");
}
document.addEventListener("fullscreenchange", () => {
  const on = !!document.fullscreenElement;
  $("fsBtn").setAttribute("aria-pressed", String(on));
  if (!on) setCollapsed(false);
});
function applyTheme(t) {
  document.documentElement.setAttribute("data-theme", t);
  $("themeBtn").textContent = t === "dark" ? "☀ Light" : "☾ Dark";
}
$("themeBtn").onclick = () => {
  const t = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
  try { localStorage.setItem("theme", t); } catch (e) {}
  applyTheme(t);
};
addEventListener("storage", (e) => { if (e.key === "theme") applyTheme(e.newValue === "dark" ? "dark" : "light"); });
applyTheme(document.documentElement.getAttribute("data-theme"));

$("prevBtn").onclick = () => go(-1);
$("nextBtn").onclick = () => go(1);
$("playBtn").onclick = () => setPlaying(!state.playing);
$("replayBtn").onclick = () => render(state.i);
$("textBtn").onclick = () => setCollapsed(!document.body.classList.contains("fl-full"));
$("fsBtn").onclick = toggleFullscreen;
const autoBtn = $("autoBtn");
const syncAuto = () => autoBtn.setAttribute("aria-pressed", String(state.auto));
autoBtn.onclick = () => { state.auto = !state.auto; try { localStorage.setItem("popboard.friction.auto", state.auto ? "1" : "0"); } catch (e) {} syncAuto(); if (state.auto && state.prog && state.prog.playState === "finished") state.prog.onfinish(); };
syncAuto();
addEventListener("keydown", (e) => {
  if (e.target.closest && e.target.closest("input, textarea")) return;
  if (e.key === "ArrowRight" || e.key === "PageDown") { e.preventDefault(); go(1); }
  else if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); go(-1); }
  else if (e.key === " " && !(e.target.closest && e.target.closest("button, a"))) { e.preventDefault(); setPlaying(!state.playing); }
  else if (e.key === "f" || e.key === "F") toggleFullscreen();
  else if (e.key === "r" || e.key === "R") render(state.i);
  else if (e.key === "t" || e.key === "T") setCollapsed(!document.body.classList.contains("fl-full"));
});
// replay the current page when the layout mode changes, so the art re-flows cleanly
document.body.addEventListener("transitionend", () => {}, { passive: true });

const startPage = parseInt(new URLSearchParams(location.search).get("page"), 10);
if (new URLSearchParams(location.search).get("full") === "1") setCollapsed(true);
render(Number.isFinite(startPage) ? startPage - 1 : 0);
window.__fl = { go, render, state, PAGES, setCollapsed, setPlaying };
