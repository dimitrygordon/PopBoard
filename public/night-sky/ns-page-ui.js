// Night Sky page: boots the scene, the HTML panel (desktop and phone), the tap card, Enter VR, copy link, theme.
import { boot } from "./ns-main.js";
import { panelModel, renderDom } from "./ns-ui.js";
import { attachDesktop } from "./ns-input.js";
import { offerLookAround } from "./ns-orient.js";
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
  renderDom($("panel"), panelModel(app.state, { simMs: app.frame.simMs, artStatus: app.artStatus ? app.artStatus() : "", vr: false, arSupported: app.arSupported, seeRoom: app.seeRoom }), tab, (a) => app.dispatch(a), (t) => { tab = t; render(); });
}

const card = $("card");
let cardInfo = null;
function showCard(info) {
  cardInfo = info;
  if (!info) { card.hidden = true; return; }
  $("cardTitle").textContent = info.title;
  const common = $("cardCommon");
  if (info.common) { common.textContent = info.common; common.hidden = false; }
  else { common.textContent = ""; common.hidden = true; }
  $("cardBody").replaceChildren(...info.lines.map((l) => { const p = document.createElement("p"); p.textContent = l; return p; }));
  card.hidden = false; placeCard();
}
function applySelection(info) {
  showCard(app.select(info));
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
$("cardClose").addEventListener("click", () => applySelection(null));

let lastRender = 0;
(async function main() {
  try {
    app = await boot({
      canvas: $("sky"),
      onStatus: (t) => { $("status").textContent = t; },
      onState: () => { render(); },
      onXr: ({ supported, presenting, arSupported, mode, seeRoom }) => {
        const canEnter = !!(supported || arSupported);
        $("vrBtn").hidden = !canEnter;
        $("vrNote").hidden = canEnter;
        const ar = (presenting && mode === "immersive-ar") || (!presenting && seeRoom && arSupported);
        $("vrLabel").textContent = presenting ? (mode === "immersive-ar" ? "In AR" : "In VR") : (ar ? "Enter AR" : "Enter VR");
        $("arBtn").hidden = !arSupported;
        $("arBtn").classList.toggle("is-on", !!seeRoom);
        $("arBtn").setAttribute("aria-pressed", seeRoom ? "true" : "false");
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
  window.__nsSelectAt = (x, y) => applySelection(app.pickAt(x, y));
  attachDesktop({
    canvas: $("sky"), getView: () => app.getView(), setView: (v) => { app.setView(v); placeCard(); },
    onTap: (x, y) => applySelection(app.pickAt(x, y)),
    onKey: (e) => {
      const H = 3600e3, D = 86400e3;
      if (e.key === " ") { e.preventDefault(); app.dispatch({ type: "togglePlay" }); }
      else if (e.key === "ArrowRight" || e.key === "ArrowLeft") { e.preventDefault(); app.dispatch({ type: "jump", deltaMs: (e.key === "ArrowRight" ? 1 : -1) * (e.shiftKey ? D : H) }); }
      else if (/^[lL]$/.test(e.key)) app.dispatch({ type: "toggle", key: "lines" });
      else if (/^[aA]$/.test(e.key)) app.dispatch({ type: "toggle", key: "art" });
      else if (/^[nN]$/.test(e.key)) app.dispatch({ type: "toggle", key: "names" });
      else if (e.key === "Escape") applySelection(null);
    },
  });
  $("vrBtn").addEventListener("click", async () => {
    try { await app.startXR(); } catch (err) {
      $("vrNote").hidden = false;
      const ar = app.seeRoom && app.arSupported;
      $("vrNote").textContent = (ar ? "Could not start AR: " : "Could not start VR: ") + (err && err.message ? err.message : err);
    }
  });
  $("arBtn").addEventListener("click", async () => {
    try { await app.setSeeRoom(!app.seeRoom); } catch (err) {
      $("vrNote").hidden = false;
      $("vrNote").textContent = "Could not switch mode: " + (err && err.message ? err.message : err);
    }
  });
  $("arBtn").hidden = !app.arSupported;

  const lookOk = offerLookAround({
    hasDeviceOrientation: typeof DeviceOrientationEvent !== "undefined",
    hasRequestPermission: typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function",
    touchPoints: navigator.maxTouchPoints || 0,
    pointerCoarse: !!(window.matchMedia && window.matchMedia("(pointer: coarse)").matches),
  });
  $("lookBtn").hidden = !lookOk;
  let oriListening = false;
  function onOriAbs(e) { app.ingestOrientation({ alpha: e.alpha, beta: e.beta, gamma: e.gamma, absolute: true, webkitCompassHeading: e.webkitCompassHeading, source: "absolute" }); syncLookUi(); }
  function onOri(e) { app.ingestOrientation({ alpha: e.alpha, beta: e.beta, gamma: e.gamma, absolute: !!e.absolute, webkitCompassHeading: e.webkitCompassHeading }); syncLookUi(); }
  function syncLookUi() {
    const st = app.getLookAround();
    $("lookBtn").classList.toggle("is-on", st.active);
    $("lookBtn").setAttribute("aria-pressed", st.active ? "true" : "false");
    $("lookLabel").textContent = st.active ? "Stop looking" : "Look around";
    $("crosshair").hidden = !st.active;
    const hot = st.active && app.getHover();
    $("crosshair").classList.toggle("is-hot", !!hot);
    const note = !st.active ? "" : st.note;
    $("lookNote").hidden = !note;
    $("lookNote").textContent = note;
    $("lookHint").textContent = st.active ? "Point the phone. Drag to adjust. Tap to identify." : "Drag to look. Tap a star or a constellation.";
  }
  function stopOri() {
    if (!oriListening) return;
    window.removeEventListener("deviceorientationabsolute", onOriAbs);
    window.removeEventListener("deviceorientation", onOri);
    oriListening = false;
  }
  $("lookBtn").addEventListener("click", async () => {
    if (app.getLookAround().active) { stopOri(); app.setLookAround(false); syncLookUi(); return; }
    if (typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function") {
      try {
        const r = await DeviceOrientationEvent.requestPermission();
        if (r !== "granted") { $("lookNote").hidden = false; $("lookNote").textContent = "Motion permission was not granted."; return; }
      } catch (err) { $("lookNote").hidden = false; $("lookNote").textContent = "Motion permission was not granted."; return; }
    }
    app.setLookAround(true);
    if (!oriListening) {
      window.addEventListener("deviceorientationabsolute", onOriAbs);
      window.addEventListener("deviceorientation", onOri);
      oriListening = true;
    }
    syncLookUi();
  });

  (function tick() {
    placeCard();
    if (app.getLookAround().active) {
      $("crosshair").classList.toggle("is-hot", !!app.getHover());
      const note = app.getLookAround().note || "";
      $("lookNote").hidden = !note; $("lookNote").textContent = note;
    }
    requestAnimationFrame(tick);
  })();
  render();
})();
