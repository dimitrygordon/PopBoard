// Newton's Mountain page: boots the scene, the HTML control panel (desktop and phone), the shot card, Enter VR, copy link, theme.
// Same page pattern as night-sky/ns-page-ui.js.
import { boot } from "./nm-main.js";
import { attachDesktop } from "../night-sky/ns-input.js";
import { offerLookAround } from "../night-sky/ns-orient.js";
import { forwardStudyQuery } from "../board-return.js?v=20261022a";
import { NM_CONFIG as C } from "./nm-config.js";
import * as S from "./nm-strings.js";

const $ = (id) => document.getElementById(id);
const THEME_KEY = "popboard.night-sky.theme";
let tab = "launch", app = null, cardOpen = true;

function setTheme(t) {
  document.documentElement.setAttribute("data-theme", t);
  try { localStorage.setItem(THEME_KEY, t); } catch {}
  $("themeBtn").setAttribute("aria-pressed", t === "dark" ? "true" : "false");
  $("themeLabel").textContent = t === "dark" ? "Light" : "Dark";
}
$("themeBtn").addEventListener("click", () => setTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark"));
setTheme(document.documentElement.getAttribute("data-theme") || "light");
$("studyBackBtn").addEventListener("click", (e) => { e.preventDefault(); forwardStudyQuery(location.search); location.href = "study.html" + location.search; });
$("copyBtn").addEventListener("click", async () => {
  const q = app.serialize(), url = location.origin + location.pathname + (q ? "?" + q : "");
  try { await navigator.clipboard.writeText(url); $("copyLabel").textContent = "Copied"; } catch { window.prompt("Copy this link", url); }
  setTimeout(() => { $("copyLabel").textContent = "Copy link"; }, 1600);
});

// ---- HTML control panel, built from app.model() ----
function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }
function button(label, { on = false, disabled = false, action = null, cls = "", title = "" } = {}) {
  const b = el("button", "ns-btn " + cls + (on ? " is-on" : ""), label); b.type = "button"; b.disabled = disabled; if (title) b.title = title;
  b.setAttribute("aria-pressed", on ? "true" : "false");
  if (action) b.addEventListener("click", () => app.dispatch(action)); return b;
}
function row(label) { const r = el("div", "ns-row"); if (label) r.append(el("p", "ns-row-label", label)); return r; }
function render() {
  if (!app) return;
  const m = app.model(), root = $("panel"), has = (k) => m.lock.includes(k), keep = root.scrollTop;
  const kids = [];
  const tabs = el("div", "ns-tabs"); tabs.setAttribute("role", "tablist");
  for (const [id, name] of [["launch", "Launch"], ["shots", "Shots"], ["view", "View"], ["help", "Help"]]) { const b = el("button", "ns-tab" + (tab === id ? " is-on" : ""), name); b.type = "button"; b.setAttribute("role", "tab"); b.setAttribute("aria-selected", tab === id ? "true" : "false"); b.dataset.tab = id; b.addEventListener("click", () => { tab = id; render(); }); tabs.append(b); }
  kids.push(tabs);
  if (tab === "launch") {
    const r = row("Launch speed"); const sp = el("p", "nm-speed"); sp.id = "speedRead"; sp.append(m.speed.toLocaleString("en-US") + " m/s"); const km = el("small", "", (m.speed / 1000).toFixed(2) + " km/s"); sp.append(km); r.append(sp);
    const sl = el("input", "nm-slider"); sl.type = "range"; sl.min = 0; sl.max = C.speedMax; sl.step = 1; sl.value = m.speed; sl.disabled = has("speed"); sl.setAttribute("aria-label", "Launch speed in metres per second");
    sl.addEventListener("input", () => app.dispatch({ type: "setSpeed", v: +sl.value }, { quiet: true })); r.append(sl);
    const st = el("div", "nm-steps"); for (const d of [-1000, -100, -10, -1, 1, 10, 100, 1000]) st.append(button((d > 0 ? "+" : "\u2212") + Math.abs(d), { disabled: has("speed"), action: { type: "speedStep", delta: d } }));
    r.append(st);
    const f = button("FIRE", { on: true, cls: "nm-fire", action: { type: "fire" } }); f.id = "fireBtn"; r.append(f); kids.push(r);
    const r2 = row(); const bs = el("div", "ns-btns"); bs.append(button("Clear shots", { action: { type: "clear" } }), button(m.paused ? "Play" : "Pause", { on: m.paused, action: { type: "pauseToggle" } }),
      button(m.warpAuto ? `Auto pace ${m.warpValue}x` : `Pace ${m.warpValue}x`, { on: m.warpAuto, action: { type: "warpAuto" } }), button("Slower", { action: { type: "warpStep", dir: -1 } }), button("Faster", { action: { type: "warpStep", dir: 1 } })); r2.append(bs); kids.push(r2);
    const r3 = row("Mountain height (km)"); const hs = el("div", "ns-btns"); for (const h of C.heightsKm) hs.append(button(String(h), { on: m.h === h, disabled: has("height"), action: { type: "setHeight", km: h } })); r3.append(hs); r3.append(el("p", "ns-note", S.NOT_TO_SCALE)); kids.push(r3);
  } else if (tab === "shots") {
    const r = row("Your shots"); if (!m.rows.length) r.append(el("p", "ns-note", "No shots yet. Press FIRE."));
    else { const t = el("table", "nm-table"); t.setAttribute("aria-label", "Shots"); for (const s of m.rows) { const tr = el("tr", m.selected === s.n ? "is-sel" : ""); const td0 = el("td"); const sw = el("span", "nm-sw"); sw.style.background = s.color; td0.append(sw, `${s.n}`); tr.append(td0, el("td", "", s.speed), el("td", "", s.state)); tr.addEventListener("click", () => { app.dispatch({ type: "select", n: s.n }); }); t.append(tr); } r.append(t); }
    kids.push(r);
    if (m.detailFull.length) { const d = row("Selected shot"); const o = el("div", "ns-readout"); for (const l of m.detailFull) o.append(el("p", "", l)); d.append(o); kids.push(d); }
    const b = row("Bracket"); const bb = el("div", "nm-bracket"); for (const l of m.bracket) bb.append(el("p", "", l)); b.append(bb); kids.push(b);
    if (m.between) { const bw = row(); bw.id = "betweenRow"; bw.append(...betweenEls(m.between)); kids.push(bw); }
  } else if (tab === "view") {
    const r = row("View"); const bs = el("div", "ns-btns"); bs.append(button("Mountain", { on: m.view === "mountain", disabled: has("view"), action: { type: "setView", view: "mountain" } }), button("Model (Earth as a globe)", { on: m.view === "model", disabled: has("view"), action: { type: "setView", view: "model" } })); r.append(bs); kids.push(r);
    const t = row("Show"); const ts = el("div", "ns-btns"); ts.append(button("Trail", { on: m.trail, action: { type: "toggle", key: "trail" } }), button("Velocity arrow", { on: m.velvec, disabled: has("vectors"), action: { type: "toggle", key: "velvec" } }), button("Gravity arrow", { on: m.gravec, disabled: has("vectors"), action: { type: "toggle", key: "gravec" } })); t.append(ts); kids.push(t);
    const a = row("Air"); const as = el("div", "ns-btns"); as.append(button(m.air ? "Air on" : "Air off", { on: m.air, disabled: has("air"), action: { type: "toggle", key: "air" } })); for (const kg of C.ball.massChoices) as.append(button(kg + " kg", { on: m.mass === kg, disabled: has("air"), action: { type: "setMass", kg } })); a.append(as); kids.push(a);
    const g = row("Gravity dial"); const gs = el("div", "ns-btns"); for (const p of [0, 25, 50, 75, 100]) gs.append(button(p + "%", { on: m.gdial === p, action: { type: "setGdial", pct: p } })); g.append(gs); kids.push(g);
    const rg = row("Reference rings"); const rs = el("div", "ns-btns"); for (const [id, name] of [["iss", "ISS"], ["geo", "GEO"], ["moon", "Moon"]]) rs.append(button(name, { on: m.rings.includes(id), disabled: m.help < 1, action: { type: "_ring", ring: id }, title: m.help < 1 ? "Available at help level 1" : "" })); rg.append(rs); if (m.help < 1) rg.append(el("p", "ns-note", "Rings and their labels unlock at help level 1.")); kids.push(rg);
    const sz = row("Model size (cm across)"); const ss = el("div", "ns-btns"); for (const cm of C.sizeVr) ss.append(button(String(cm), { on: m.size === cm, action: { type: "setSize", cm } })); sz.append(ss); kids.push(sz);
  } else {
    const r = row("Help level"); r.append(el("p", "ns-note", `${S.LEVELS[m.help]}${has("help") ? " (locked)" : ""}`)); kids.push(r);
    for (const l of m.helpLines) { const x = row(l.h); x.append(el("p", "ns-note", l.t)); kids.push(x); }
    const k = row("Headset controls"); for (const l of S.CONTROLS_VR) k.append(el("p", "ns-note", l)); kids.push(k);
    const kb = row("Keyboard"); kb.append(el("p", "ns-note", "F fire. Up and down arrows plus or minus 10 m/s, Shift plus or minus 100, Alt plus or minus 1. Space play or pause. C clear. M view. T trail. B velocity arrow. G gravity arrow. A air. Left and right arrows change the pace.")); kids.push(kb);
  }
  root.replaceChildren(...kids); root.scrollTop = keep;
  $("arSpeed").textContent = m.speed.toLocaleString("en-US") + " m/s";
  $("fireFab").hidden = !m.ui;
}

// "Between your shots" element: line 1, a smaller line 2, and at the Explain level the circular speed
function betweenEls(bt) { const a = [el("p", "nm-between", bt.line1), el("p", "nm-between-sub", bt.line2)]; if (bt.extra) a.push(el("p", "nm-between", bt.extra)); return a; }

// ---- shot card ----
function showCard() {
  const card = $("card"); if (!app) return;
  const m = app.model(), w = app.selectedWorld();
  if (!cardOpen || !m.selected || !w) { card.hidden = true; return; }
  $("cardTitle").textContent = `Shot ${m.selected}`;
  const key = m.detailFull.join("|") + "#" + (m.between ? [m.between.line1, m.between.extra].join("|") : ""); if (key !== card.dataset.key) { card.dataset.key = key; $("cardBody").replaceChildren(...m.detailFull.flatMap((l) => l.split(/ {3,}/)).map((l, i) => el("p", i === 0 ? "line lead" : l.length > 24 ? "line wide" : "line", i === 0 ? l.charAt(0).toUpperCase() + l.slice(1) : l)), ...(m.between ? betweenEls(m.between).map((e) => { e.classList.add("wide"); return e; }) : [])); }
  const p = app.project(w), stage = $("stage").getBoundingClientRect();
  card.hidden = false;
  if (!p.visible) { card.style.visibility = "hidden"; return; }
  card.style.visibility = "visible";
  const cw = card.offsetWidth, ch = card.offsetHeight;
  card.style.left = Math.max(6, Math.min(stage.width - cw - 6, p.x + 14)) + "px"; card.style.top = Math.max(6, Math.min(stage.height - ch - 6, p.y - ch / 2)) + "px";
}
$("cardClose").addEventListener("click", () => { cardOpen = false; $("card").hidden = true; });

(async function main() {
  try {
    app = await boot({
      canvas: $("sky"),
      onStatus: (t) => { $("status").textContent = t; },
      onState: () => { render(); cardOpen = cardOpen || false; },
      onXr: ({ supported, presenting, arSupported, mode, seeRoom }) => {
        const canEnter = !!(supported || arSupported);
        $("vrBtn").hidden = !canEnter; $("vrNote").hidden = canEnter;
        const ar = (presenting && mode === "immersive-ar") || (!presenting && seeRoom && arSupported);
        $("vrLabel").textContent = presenting ? (mode === "immersive-ar" ? "In AR" : "In VR") : (ar ? "Enter AR" : "Enter VR");
        $("arBtn").hidden = !arSupported; $("arBtn").classList.toggle("is-on", !!seeRoom); $("arBtn").setAttribute("aria-pressed", seeRoom ? "true" : "false");
        $("arOverlay").hidden = !(presenting && mode === "immersive-ar");
      },
      onFrameStats: (s) => { if (app && app.state.debug) { $("hud").hidden = false; $("hud").textContent = s.text; } else $("hud").hidden = true; },
    });
  } catch (err) { $("status").textContent = "Could not start Newton's Mountain: " + (err && err.message ? err.message : err); console.error(err); return; }
  window.__nm = app;
  attachDesktop({
    canvas: $("sky"), getView: () => app.getView(), setView: (v) => app.setView(v),
    onTap: (x, y) => { const n = app.pickAt(x, y); if (n != null) { cardOpen = true; app.dispatch({ type: "select", n }); } else { cardOpen = false; $("card").hidden = true; } },
    onKey: (e) => {
      const s = e.shiftKey ? 100 : e.altKey ? 1 : 10;
      if (/^[fF]$/.test(e.key)) app.dispatch({ type: "fire" });
      else if (e.key === "ArrowUp") { e.preventDefault(); app.dispatch({ type: "speedStep", delta: s }); } else if (e.key === "ArrowDown") { e.preventDefault(); app.dispatch({ type: "speedStep", delta: -s }); }
      else if (e.key === " ") { e.preventDefault(); app.dispatch({ type: "pauseToggle" }); }
      else if (/^[cC]$/.test(e.key)) app.dispatch({ type: "clear" }); else if (/^[mM]$/.test(e.key)) app.dispatch({ type: "toggleView" });
      else if (/^[tT]$/.test(e.key)) app.dispatch({ type: "toggle", key: "trail" }); else if (/^[bB]$/.test(e.key)) app.dispatch({ type: "toggle", key: "velvec" }); else if (/^[gG]$/.test(e.key)) app.dispatch({ type: "toggle", key: "gravec" }); else if (/^[aA]$/.test(e.key)) app.dispatch({ type: "toggle", key: "air" });
      else if (e.key === "ArrowRight") app.dispatch({ type: "warpStep", dir: 1 }); else if (e.key === "ArrowLeft") app.dispatch({ type: "warpStep", dir: -1 });
      else if (e.key === "Escape") { cardOpen = false; $("card").hidden = true; }
    },
  });
  $("sky").addEventListener("wheel", (e) => { if (app.state.view === "model") app.dolly(e.deltaY > 0 ? 1.08 : 0.92); }, { passive: true });
  $("fireFab").addEventListener("click", () => { cardOpen = true; app.dispatch({ type: "fire" }); });
  $("vrBtn").addEventListener("click", async () => { try { await app.startXR(); } catch (err) { $("vrNote").hidden = false; $("vrNote").textContent = (app.seeRoom && app.arSupported ? "Could not start AR: " : "Could not start VR: ") + (err && err.message ? err.message : err); } });
  $("arBtn").addEventListener("click", async () => { try { await app.setSeeRoom(!app.seeRoom); } catch (err) { $("vrNote").hidden = false; $("vrNote").textContent = "Could not switch mode: " + (err && err.message ? err.message : err); } });
  $("arOverlay").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; if (b.dataset.d) app.dispatch({ type: "speedStep", delta: +b.dataset.d }); else if (b.id === "arFire") app.dispatch({ type: "fire" }); else if (b.id === "arClear") app.dispatch({ type: "clear" }); else if (b.id === "arExit") app.renderer.xr.getSession() && app.renderer.xr.getSession().end(); });
  // phone look-around (Mountain view): same flow as Night Sky
  const lookOk = offerLookAround({ hasDeviceOrientation: typeof DeviceOrientationEvent !== "undefined", hasRequestPermission: typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function", touchPoints: navigator.maxTouchPoints || 0, pointerCoarse: !!(window.matchMedia && window.matchMedia("(pointer: coarse)").matches) });
  $("lookBtn").hidden = !lookOk;
  let oriListening = false;
  const onOriAbs = (e) => { app.ingestOrientation({ alpha: e.alpha, beta: e.beta, gamma: e.gamma, absolute: true, webkitCompassHeading: e.webkitCompassHeading, source: "absolute" }); syncLookUi(); };
  const onOri = (e) => { app.ingestOrientation({ alpha: e.alpha, beta: e.beta, gamma: e.gamma, absolute: !!e.absolute, webkitCompassHeading: e.webkitCompassHeading }); syncLookUi(); };
  function syncLookUi() {
    const st = app.getLookAround();
    $("lookBtn").classList.toggle("is-on", st.active); $("lookBtn").setAttribute("aria-pressed", st.active ? "true" : "false"); $("lookLabel").textContent = st.active ? "Stop looking" : "Look around";
    $("crosshair").hidden = !st.active; const note = st.active ? st.note : ""; $("lookNote").hidden = !note; $("lookNote").textContent = note;
    $("lookHint").textContent = st.active ? "Point the phone. Drag to adjust." : app.state.view === "model" ? "Drag to turn the globe. Scroll to zoom." : "Drag to look. Fire a shot, then raise the speed.";
  }
  $("lookBtn").addEventListener("click", async () => {
    if (app.getLookAround().active) { window.removeEventListener("deviceorientationabsolute", onOriAbs); window.removeEventListener("deviceorientation", onOri); oriListening = false; app.setLookAround(false); syncLookUi(); return; }
    if (typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function") {
      try { const r = await DeviceOrientationEvent.requestPermission(); if (r !== "granted") { $("lookNote").hidden = false; $("lookNote").textContent = "Motion permission was not granted."; return; } } catch { $("lookNote").hidden = false; $("lookNote").textContent = "Motion permission was not granted."; return; }
    }
    if (app.state.view !== "mountain") app.dispatch({ type: "setView", view: "mountain" });
    app.setLookAround(true);
    if (!oriListening) { window.addEventListener("deviceorientationabsolute", onOriAbs); window.addEventListener("deviceorientation", onOri); oriListening = true; }
    syncLookUi();
  });
  (function tick() { showCard(); requestAnimationFrame(tick); })();
  setInterval(() => { if (app && tab === "shots" && app.state.fired.length && document.visibilityState === "visible") render(); }, 500);
  render();
})();
