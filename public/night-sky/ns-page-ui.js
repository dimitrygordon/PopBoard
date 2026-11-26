// Night Sky page: boots the scene, the HTML panel (desktop and phone), the tap card, Enter VR, copy link, theme.
import { boot } from "./ns-main.js";
import { panelModel, renderDom } from "./ns-ui.js";
import { attachDesktop } from "./ns-input.js";
import { forwardStudyQuery } from "../board-return.js?v=20261022a";

const $ = (id) => document.getElementById(id);
const THEME_KEY = "popboard.night-sky.theme";
let tab = "time", app = null;

function setTheme(t) {
  document.documentElement.setAttribute("data-theme", t);
  try { localStorage.setItem(THEME_KEY, t); } catch {}
  $("themeBtn").setAttribute("aria-pressed", t === "dark" ? "true" : "false");
  $("themeLabel").textContent = t === "dark" ? "Light" : "Dark";
}
$("themeBtn").addEventListener("click", () => setTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark"));
setTheme(document.documentElement.getAttribute("data-theme") || "light");

$("studyBackBtn").addEventListener("click", (e) => {
  e.preventDefault();
  forwardStudyQuery(location.search);
  location.href = "study.html" + location.search; // same as every study page: the gallery reads its own params
});

$("copyBtn").addEventListener("click", async () => {
  const url = location.origin + location.pathname + "?" + app.serialize();
  try { await navigator.clipboard.writeText(url); $("copyLabel").textContent = "Copied"; }
  catch { window.prompt("Copy this link", url); }
  setTimeout(() => { $("copyLabel").textContent = "Copy link"; }, 1600);
});

function render() {
  if (!app) return;
  renderDom($("panel"), panelModel(app.state, { simMs: app.frame.simMs, artStatus: app.artStatus ? app.artStatus() : "", vr: false }), tab, (a) => app.dispatch(a), (t) => { tab = t; render(); });
}

const card = $("card");
let cardInfo = null;
function showCard(info) {
  cardInfo = info;
  if (!info) { card.hidden = true; return; }
  $("cardTitle").textContent = info.title;
  $("cardBody").replaceChildren(...info.lines.map((l) => { const p = document.createElement("p"); p.textContent = l; return p; }));
  card.hidden = false; placeCard();
}
function placeCard() {
  if (!cardInfo || card.hidden) return;
  const p = app.project(cardInfo.dir), stage = $("stage").getBoundingClientRect();
  if (!p.visible) { card.style.visibility = "hidden"; return; }
  card.style.visibility = "visible";
  const w = card.offsetWidth, h = card.offsetHeight;
  card.style.left = Math.max(6, Math.min(stage.width - w - 6, p.x + 14)) + "px";
  card.style.top = Math.max(6, Math.min(stage.height - h - 6, p.y - h / 2)) + "px";
}
$("cardClose").addEventListener("click", () => showCard(null));

let lastRender = 0;
(async function main() {
  try {
    app = await boot({
      canvas: $("sky"),
      onStatus: (t) => { $("status").textContent = t; },
      onState: () => { render(); },
      onXr: ({ supported, presenting }) => {
        $("vrBtn").hidden = !supported;
        $("vrNote").hidden = supported;
        $("vrLabel").textContent = presenting ? "In VR" : "Enter VR";
      },
      onFrameStats: (s) => {
        if (app && app.state.debug) { $("hud").hidden = false; const d = app.debugInfo(); $("hud").textContent = `${s.text}\nLST ${d.lstDeg.toFixed(3)} deg  T ${d.T.toFixed(6)}`; }
        else $("hud").hidden = true;
        const now = performance.now(); if (app && app.state.clock.speed !== 0 && now - lastRender > 900) { lastRender = now; render(); } // keep the clock readout moving
      },
    });
  } catch (err) {
    $("status").textContent = "Could not start the sky: " + (err && err.message ? err.message : err);
    console.error(err); return;
  }
  window.__nightSky = app; // for tests and the debug HUD
  attachDesktop({
    canvas: $("sky"), getView: () => app.getView(), setView: (v) => { app.setView(v); placeCard(); },
    onTap: (x, y) => showCard(app.pickAt(x, y)),
    onKey: (e) => {
      const H = 3600e3, D = 86400e3;
      if (e.key === " ") { e.preventDefault(); app.dispatch({ type: "togglePlay" }); }
      else if (e.key === "ArrowRight" || e.key === "ArrowLeft") { e.preventDefault(); app.dispatch({ type: "jump", deltaMs: (e.key === "ArrowRight" ? 1 : -1) * (e.shiftKey ? D : H) }); }
      else if (/^[lL]$/.test(e.key)) app.dispatch({ type: "toggle", key: "lines" });
      else if (/^[aA]$/.test(e.key)) app.dispatch({ type: "toggle", key: "art" });
      else if (/^[nN]$/.test(e.key)) app.dispatch({ type: "toggle", key: "names" });
      else if (e.key === "Escape") showCard(null);
    },
  });
  $("vrBtn").addEventListener("click", async () => {
    try { await app.enterVR(); } catch (err) { $("vrNote").hidden = false; $("vrNote").textContent = "Could not start VR: " + (err && err.message ? err.message : err); }
  });
  (function tick() { placeCard(); requestAnimationFrame(tick); })();
  render();
})();
