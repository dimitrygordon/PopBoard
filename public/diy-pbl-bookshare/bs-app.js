// Presenter shell for DIY PBL Bookshare: Friction Lesson pattern with NO audio.
// Script text stays in the side column as Dimitry's teleprompter. Hide text / Full screen
// collapses the side so only the looping storyboard art remains.
import { timeline, fx } from "./bs-engine.js";
import { PAGES } from "./bs-pages.js";
import {
  THEME_BAND, clearFlipClones, fadeScript, restoreScript
} from "./bs-transitions.js";
import { startDrawIn } from "./bs-drawin.js";
import { loadLayouts } from "./bs-layouts.js";
import { ART } from "./bs-engine.js";

const $ = (id) => document.getElementById(id);
const scene = $("flScene"), side = $("flSide");
const reducedQ = matchMedia("(prefers-reduced-motion: reduce)");
const state = { i: 0, T: null, playing: true, auto: false, prog: null, autoTimer: 0, navBusy: false, flipToken: 0, drawIn: null };
try { state.auto = localStorage.getItem("popboard.diy-pbl.auto") === "1"; } catch (e) {}

async function probeArtBgs() {
  // Prefer Leo redraw filenames when they exist (s08 / s16 hooks and any slide).
  // Cloudflare Pages SPA catch-all returns 200 text/html for missing paths, so
  // res.ok alone is not enough  -  require a real image Content-Type (or decode).
  const ids = [];
  for (let n = 1; n <= 40; n++) ids.push(`s${String(n).padStart(2, "0")}`);
  ids.push("keyterms", "discussion", "resources", "conclude", "r6a", "r6b", "r6c", "r6d", "r6e", "r6f", "r6h", "r6i", "r6j");
  const prefer = ["bg_v6.webp", "bg_next.webp"];
  const map = {};
  async function isRealImage(url) {
    try {
      // Prefer HEAD: SPA soft-404s advertise text/html even when status is 200.
      const head = await fetch(url, { method: "HEAD", cache: "no-cache" });
      if (!head.ok) return false;
      const headCt = (head.headers.get("content-type") || "").toLowerCase();
      if (headCt.startsWith("image/")) return true;
      if (headCt.includes("text/html") || headCt.includes("application/json")) return false;
      // Ambiguous type: GET and sniff RIFF/WEBP magic.
      const res = await fetch(url, { method: "GET", cache: "no-cache" });
      if (!res.ok) return false;
      const ct = (res.headers.get("content-type") || "").toLowerCase();
      if (ct.startsWith("image/")) return true;
      const buf = new Uint8Array(await res.arrayBuffer());
      return buf.length >= 12 && buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46
        && buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50;
    } catch (e) {
      return false;
    }
  }
  await Promise.all(ids.map(async (id) => {
    for (const name of prefer) {
      if (await isRealImage(`${ART}${id}/${name}`)) { map[id] = name; return; }
    }
  }));
  window.__bsArtBg = map;
}



$("studyBackBtn").href = "study.html" + location.search;

function stopPage() {
  clearTimeout(state.autoTimer);
  if (state.drawIn) { try { state.drawIn.cancel(); } catch (e) {} state.drawIn = null; }
  if (state.T) state.T.anims.forEach((a) => a.cancel());
  if (state.prog) state.prog.cancel();
  state.animDone = false;
  clearFlipClones();
  scene.querySelectorAll(".bs-scene").forEach((n) => n.classList.remove("is-settled", "is-leaving", "is-drawing", "is-drawn"));
  scene.replaceChildren(); scene.classList.remove("staged"); side.replaceChildren();
  scene.style.opacity = "";
  scene.style.transition = "";
}


function afterRenderDrawIn() {
  const root = scene.querySelector(".bs-scene");
  return runDrawIn(root);
}

async function runDrawIn(root) {
  if (!root) return;
  const artId = root.dataset.art;
  if (!artId) { root.classList.add("is-drawn", "is-settled"); return; }
  const handle = startDrawIn(root, artId, { reduced: reducedQ.matches });
  state.drawIn = handle;
  try { await handle.promise; } catch (e) {}
  if (state.drawIn === handle) state.drawIn = null;
  root.classList.add("is-settled");
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
  startClock(T);
  // Hide sprites/text until draw-in settles (go/boot call runDrawIn next)
  const root = scene.querySelector(".bs-scene");
  if (root) {
    root.classList.add("is-drawing");
    root.classList.remove("is-drawn", "is-settled");
    const bg = root.querySelector(".bs-bg");
    if (bg) bg.style.visibility = "hidden";
  }
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
    state.flipToken++;
    clearFlipClones();
    if (state.drawIn) { try { state.drawIn.cancel(); } catch (e) {} state.drawIn = null; }
    state.navBusy = false;
    render(next);
    afterRenderDrawIn();
    return;
  }
  const reduced = reducedQ.matches;
  const token = ++state.flipToken;
  state.navBusy = true;

  if (!document.body.classList.contains("fl-full")) await fadeScript(side, reduced ? 120 : 160);
  if (token !== state.flipToken) { state.navBusy = false; return; }

  const fadeMs = reduced ? 220 : 280;
  scene.style.transition = `opacity ${fadeMs}ms ease`;
  scene.style.opacity = "0";
  await new Promise((r) => setTimeout(r, fadeMs));
  if (token !== state.flipToken) { state.navBusy = false; return; }

  render(next);
  scene.style.opacity = "0";
  requestAnimationFrame(() => {
    scene.style.transition = `opacity ${fadeMs}ms ease`;
    scene.style.opacity = "1";
  });
  await new Promise((r) => setTimeout(r, fadeMs));
  if (token !== state.flipToken) { state.navBusy = false; return; }

  const toR = scene.querySelector(".bs-scene");
  if (toR) await runDrawIn(toR);
  if (token !== state.flipToken) { state.navBusy = false; return; }
  await restoreScript(side, reduced ? 120 : 160);
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
$("replayBtn").onclick = () => { render(state.i); afterRenderDrawIn(); };
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
  else if (e.key === "r" || e.key === "R") { render(state.i); afterRenderDrawIn(); }
  else if (e.key === "t" || e.key === "T") setCollapsed(!document.body.classList.contains("fl-full"));
});

const startPage = parseInt(new URLSearchParams(location.search).get("page"), 10);
const wantFull = new URLSearchParams(location.search).get("full") === "1";
if (wantFull) {
  document.body.classList.add("fl-full");
  setCollapsed(true);
}

(async function boot() {
  await Promise.all([loadLayouts(), probeArtBgs()]);
  render(Number.isFinite(startPage) ? startPage - 1 : 0);
  afterRenderDrawIn();
})();

window.__bs = { go, render, state, PAGES, setCollapsed, setPlaying, clearFlipClones, THEME_BAND, startDrawIn, runDrawIn, loadLayouts };

/* Landscape phone: Controls toggle for tucked toolbar */
(function wireBarToggle() {
  const btn = document.getElementById("bsBarToggle");
  if (!btn) return;
  const sync = () => {
    const landscapePhone = window.matchMedia("(max-width: 950px) and (orientation: landscape)").matches;
    btn.hidden = !landscapePhone;
    if (!landscapePhone) document.body.classList.remove("bs-bar-open");
    btn.setAttribute("aria-expanded", document.body.classList.contains("bs-bar-open") ? "true" : "false");
  };
  btn.addEventListener("click", () => {
    document.body.classList.toggle("bs-bar-open");
    sync();
  });
  window.addEventListener("resize", sync);
  window.addEventListener("orientationchange", sync);
  sync();
})();

