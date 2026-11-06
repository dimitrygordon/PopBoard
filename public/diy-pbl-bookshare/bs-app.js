// Presenter shell for DIY PBL Bookshare: Friction Lesson pattern with NO audio.
// Script text stays in the side column as Dimitry's teleprompter. Hide text / Full screen
// collapses the side so only the looping storyboard art remains.
import { timeline, fx } from "./bs-engine.js";
import { PAGES } from "./bs-pages.js";
import {
  THEME_BAND, HANDOFFS, handoffKey, captureMagic, runFlip, clearFlipClones,
  fadeScript, restoreScript, resolvePrimary
} from "./bs-transitions.js";

const $ = (id) => document.getElementById(id);
const scene = $("flScene"), side = $("flSide");
const reducedQ = matchMedia("(prefers-reduced-motion: reduce)");
const state = { i: 0, T: null, playing: true, auto: false, prog: null, autoTimer: 0, navBusy: false, flipToken: 0 };
try { state.auto = localStorage.getItem("popboard.diy-pbl.auto") === "1"; } catch (e) {}

$("studyBackBtn").href = "study.html" + location.search;

function stopPage() {
  clearTimeout(state.autoTimer);
  if (state.T) state.T.anims.forEach((a) => a.cancel());
  if (state.prog) state.prog.cancel();
  state.animDone = false;
  clearFlipClones();
  scene.querySelectorAll(".bs-scene").forEach((n) => n.classList.remove("is-settled", "is-leaving"));
  scene.replaceChildren(); scene.classList.remove("staged"); side.replaceChildren();
  scene.style.opacity = "";
  scene.style.transition = "";
}

function render(i) {
  stopPage();
  state.i = Math.max(0, Math.min(PAGES.length - 1, i));
  const p = PAGES[state.i], n = state.i + 1;
  document.body.dataset.page = String(n);
  if (p.idea) document.body.dataset.idea = String(p.idea); else delete document.body.dataset.idea;
  if (p.kind) document.body.dataset.kind = p.kind; else delete document.body.dataset.kind;
  const band = THEME_BAND[n] || "cream";
  document.body.dataset.themeBand = band;

  // Side: kicker + title + bullets/script. Do NOT inject .guide here (A3: no duplicate caption).
  side.innerHTML = `<p class="kicker">${fx(p.kicker)}</p><h2>${fx(p.title)}</h2>` + (p.side || "");
  // Full-screen caption: guide only (no title duplicate with on-art headings)
  $("flCapT").innerHTML = "";
  $("flCapQ").innerHTML = fx(p.cap || p.guide || "");
  $("flGuide").innerHTML = "";
  $("flCount").textContent = `Page ${n} of ${PAGES.length}`;
  const params = new URLSearchParams(location.search);
  params.set("page", String(n));
  history.replaceState(null, "", "?" + params.toString());
  const T = timeline(scene, { reduced: reducedQ.matches });
  state.T = T;
  const extra = p.build(scene, T) || {};
  state.holdAfter = extra.hold_after || p.hold_after || 0;
  const root = scene.querySelector(".bs-scene");
  if (root) requestAnimationFrame(() => root.classList.add("is-settled"));
  startClock(T);
}

function startClock(T) {
  const end = Math.max(0.5, T.end() + (state.holdAfter || 0));
  state.prog = $("flProg").animate([{ width: "0%" }, { width: "100%" }], { duration: end * 1000, fill: "forwards" });
  state.animDone = false;
  state.prog.onfinish = () => { state.animDone = true; maybeAdvance(); };
  if (T.reduced) { T.finishAll(); state.prog.finish(); }
  else if (!state.playing) setPlaying(false);
}

function maybeAdvance() {
  clearTimeout(state.autoTimer);
  if (!state.auto || !state.animDone || state.i >= PAGES.length - 1) return;
  state.autoTimer = setTimeout(() => { if (state.playing) go(1); }, 4000);
}

async function go(d) {
  const next = state.i + d;
  if (next < 0 || next >= PAGES.length) return;
  if (state.navBusy) {
    // Rapid click: cancel clones and jump cleanly (no stacked sprites)
    state.flipToken++;
    clearFlipClones();
    state.navBusy = false;
    render(next);
    return;
  }
  const reduced = reducedQ.matches;
  const from1 = state.i + 1;
  const to1 = next + 1;
  const key = handoffKey(from1, to1);
  const plan = HANDOFFS[key] || HANDOFFS[handoffKey(to1, from1)];
  const token = ++state.flipToken;
  state.navBusy = true;

  const fromRoot = scene.querySelector(".bs-scene");
  if (fromRoot) fromRoot.classList.add("is-leaving");
  const fromCapture = captureMagic(scene);
  const fromBgRoot = fromRoot; // keep ref for bg src before destroy

  // Quiet script fade (never FLIP script between slides)
  if (!document.body.classList.contains("fl-full")) await fadeScript(side, reduced ? 120 : 180);
  if (token !== state.flipToken) { state.navBusy = false; return; }

  if (reduced) {
    scene.style.transition = "opacity 0.22s ease";
    scene.style.opacity = "0";
    await new Promise((r) => setTimeout(r, 220));
    if (token !== state.flipToken) { state.navBusy = false; return; }
    render(next);
    scene.style.opacity = "0";
    requestAnimationFrame(() => {
      scene.style.transition = "opacity 0.22s ease";
      scene.style.opacity = "1";
    });
    await new Promise((r) => setTimeout(r, 220));
    await restoreScript(side, 120);
    state.navBusy = false;
    return;
  }

  // Snapshot FROM bg src before render destroys it
  const fromBg = fromBgRoot && fromBgRoot.querySelector(".bs-bg");
  const fromBgSrc = fromBg ? (fromBg.currentSrc || fromBg.src) : null;

  render(next);
  if (token !== state.flipToken) { state.navBusy = false; return; }

  const toRoot = scene.querySelector(".bs-scene");
  if (fromBgSrc && toRoot) {
    const ghost = document.createElement("img");
    ghost.className = "bs-bg-xfade show";
    ghost.src = fromBgSrc;
    ghost.alt = "";
    toRoot.insertBefore(ghost, toRoot.firstChild);
    requestAnimationFrame(() => ghost.classList.remove("show"));
    setTimeout(() => ghost.remove(), 340);
  }

  const primary = resolvePrimary(plan, fromCapture);
  try {
    await runFlip(fromCapture, scene, primary, { duration: 560, reduced: false });
  } catch (e) {
    clearFlipClones();
  }
  if (token !== state.flipToken) { state.navBusy = false; return; }
  if (toRoot) {
    // Staggered caption reveals after the motif lands
    requestAnimationFrame(() => toRoot.classList.add("is-settled"));
  }
  await restoreScript(side, 180);
  state.navBusy = false;
}

function setPlaying(on) {
  state.playing = on;
  const all = [...(state.T ? state.T.anims : []), state.prog].filter(Boolean);
  all.forEach((a) => { if (a.playState === "finished" || a.playState === "idle") return; on ? a.play() : a.pause(); });
  if (!on) clearTimeout(state.autoTimer); else maybeAdvance();
  const b = $("playBtn"); b.setAttribute("aria-pressed", String(on));
  b.textContent = on ? "❚❚ Pause" : "▶ Play"; b.setAttribute("aria-label", on ? "Pause" : "Play");
}

function setCollapsed(on) {
  document.body.classList.toggle("fl-full", on);
  $("textBtn").setAttribute("aria-pressed", String(on));
  $("textBtn").textContent = on ? "Show text" : "Hide text";
  const fs = $("fsBtn");
  if (!document.fullscreenElement) fs.textContent = on ? "⛶ Exit full view" : "⛶ Full screen (hide text)";
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
autoBtn.onclick = () => {
  state.auto = !state.auto;
  try { localStorage.setItem("popboard.diy-pbl.auto", state.auto ? "1" : "0"); } catch (e) {}
  syncAuto();
  if (state.prog && state.prog.playState === "finished") state.animDone = true;
  maybeAdvance();
};
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

const startPage = parseInt(new URLSearchParams(location.search).get("page"), 10);
const wantFull = new URLSearchParams(location.search).get("full") === "1";
if (wantFull) {
  document.body.classList.add("fl-full");
  setCollapsed(true);
}
render(Number.isFinite(startPage) ? startPage - 1 : 0);
window.__bs = { go, render, state, PAGES, setCollapsed, setPlaying, HANDOFFS, clearFlipClones, captureMagic, resolvePrimary, THEME_BAND };
