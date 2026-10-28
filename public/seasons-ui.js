// Seasons, Eclipses & Celestial Geometry: page wiring.
// Physics: seasons-physics.js. Drawing: seasons-render.js.
import { forwardStudyQuery } from "./board-return.js?v=20261022a";
import * as P from "./seasons-physics.js";
import { loadArt, readTokens, drawStage, drawDiagram } from "./seasons-render.js";

const $ = (id) => document.getElementById(id);
const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
let reducedMotion = mq.matches;
mq.addEventListener?.("change", (e) => { reducedMotion = e.matches; if (reducedMotion) setPlaying(false); });

const st = { mode: P.modeFromSearch(location.search), playing: false };
for (const [k, s] of Object.entries(P.SLIDERS)) st[k] = s.value;
Object.assign(st, P.paramsFromSearch(location.search));

const CONTROLS = {
  seasons: ["tilt", "date", "lat"], sunlight: ["tilt", "date", "lat"], daylight: ["tilt", "date", "lat"],
  eclipses: ["date", "hour"], nodes: ["incl", "date", "hour"], precession: ["year", "tilt"], sky: ["lat", "date", "hour", "tilt"], sandbox: ["tilt", "date", "hour", "lat", "incl", "year"]
};
const PLAY_RATE = { seasons: ["date", 8], sunlight: ["date", 8], daylight: ["date", 8], eclipses: ["hour", 3], nodes: ["date", 4], precession: ["year", 1200], sky: ["hour", 1.5], sandbox: ["hour", 24] };
const SPEEDS = [["1 hour/s", 1], ["1 day/s", 24], ["10 days/s", 240]];
const fmt = {
  tilt: (v) => `${P.fmtNum(v, 1)}\u00b0`, date: (v) => P.dateParts(v).label, lat: (v) => P.fmtLat(v),
  hour: (v) => `${P.fmtClock(v)} solar time`, incl: (v) => `${P.fmtNum(v, 2)}\u00b0`, year: (v) => P.fmtYear(v)
};
const userSetDate = new URLSearchParams(location.search).has("date");
let eclDefaulted = false;
// ---------- theme: saved choice, else the system setting ----------
const THEME_KEY = "seasonsTheme";
const sysDark = window.matchMedia("(prefers-color-scheme: dark)");
function savedTheme() { try { return localStorage.getItem(THEME_KEY); } catch { return null; } }
function applyTheme(t) {
  document.documentElement.setAttribute("data-theme", t);
  const b = $("themeBtn"); if (b) { b.setAttribute("aria-pressed", String(t === "dark")); b.textContent = t === "dark" ? "Light mode" : "Dark mode"; b.setAttribute("aria-label", t === "dark" ? "Switch to light mode" : "Switch to dark mode"); }
  T = readTokens(); for (const k in cache) delete cache[k]; invalidate();
}
let T = null;
document.documentElement.setAttribute("data-theme", savedTheme() || (sysDark.matches ? "dark" : "light"));
T = readTokens();
sysDark.addEventListener?.("change", (e) => { if (!savedTheme()) applyTheme(e.matches ? "dark" : "light"); });
const cache = {};
const art = loadArt(() => invalidate());
const stage = $("stage"), diagram = $("diagram");
const sctx = stage.getContext("2d"), dctx = diagram.getContext("2d");
let quality = 1, dirty = true, raf = 0;

// ---------- tabs ----------
const tabs = $("tabs");
for (const m of P.MODES) {
  const b = document.createElement("button");
  b.type = "button"; b.role = "tab"; b.dataset.mode = m; b.textContent = P.MODE_LABELS[m];
  b.addEventListener("click", () => setMode(m));
  tabs.appendChild(b);
}
function setMode(m) {
  st.mode = m;
  for (const b of tabs.children) b.setAttribute("aria-selected", String(b.dataset.mode === m));
  // First visit to Eclipses with the default date: start at the Aug 12, 2026 total solar eclipse.
  if (m === "eclipses" && !eclDefaulted && !userSetDate && st.date === P.SLIDERS.date.value) { eclDefaulted = true; jumpTo(P.nearestSyzygy(P.ECLIPSES_2026[2].t, 0)); return; }
  buildControls(); invalidate();
}

// ---------- controls ----------
function buildControls() {
  const box = $("controls"); box.textContent = "";
  for (const k of CONTROLS[st.mode]) {
    const s = P.SLIDERS[k], row = document.createElement("div"); row.className = "se-row";
    const id = `sl-${k}`;
    row.innerHTML = `<label for="${id}">${s.label}</label><output id="${id}-out"></output>`;
    const inp = document.createElement("input");
    Object.assign(inp, { type: "range", id, min: s.min, max: s.max, step: s.step, value: st[k] });
    inp.addEventListener("input", () => { st[k] = Number(inp.value); syncOut(k); invalidate(); });
    row.appendChild(inp); box.appendChild(row); syncOut(k);
  }
  const chips = document.createElement("div"); chips.className = "se-chips";
  const chip = (label, fn, pressed) => { const b = document.createElement("button"); b.type = "button"; b.className = "se-chip"; b.textContent = label; if (pressed !== undefined) b.setAttribute("aria-pressed", String(pressed)); b.addEventListener("click", fn); chips.appendChild(b); };
  const setV = (o) => { Object.assign(st, o); buildControls(); invalidate(); };
  if (["seasons", "sunlight", "daylight"].includes(st.mode)) {
    chip("Mar 20", () => setV({ date: P.dayOfYear(2, 20) })); chip("Jun 21", () => setV({ date: P.dayOfYear(5, 21) }));
    chip("Sep 22", () => setV({ date: P.dayOfYear(8, 22) })); chip("Dec 21", () => setV({ date: P.dayOfYear(11, 21) }));
    chip("Tilt 0\u00b0", () => setV({ tilt: 0 }), st.tilt === 0); chip("Tilt 23.5\u00b0", () => setV({ tilt: 23.5 }), st.tilt === 23.5); chip("Tilt 90\u00b0", () => setV({ tilt: 90 }), st.tilt === 90);
  } else if (st.mode === "eclipses") {
    for (const e of P.ECLIPSES_2026) chip(e.label, () => jumpTo(P.nearestSyzygy(e.t, e.kind === "solar" ? 0 : 180)));
    chip("Next new Moon", () => jumpTo(nextSyzygy(0))); chip("Next full Moon", () => jumpTo(nextSyzygy(180)));
  } else if (st.mode === "nodes") {
    chip("Real tilt 5.15\u00b0", () => setV({ incl: 5.15 }), st.incl === 5.15); chip("No tilt", () => setV({ incl: 0 }), st.incl === 0);
    chip("Next new Moon", () => jumpTo(nextSyzygy(0))); chip("Next full Moon", () => jumpTo(nextSyzygy(180)));
  } else if (st.mode === "precession") {
    chip("Thuban, 2800 BC", () => setV({ year: -2800 })); chip("Today", () => setV({ year: 2000 })); chip("Vega, AD 14000", () => setV({ year: 14000 }));
  } else if (st.mode === "sandbox") {
    for (const [l, v] of SPEEDS) chip(l, () => { PLAY_RATE.sandbox[1] = v; buildControls(); }, PLAY_RATE.sandbox[1] === v);
    chip("Now: Oct 28", () => setV({ date: P.dayOfYear(9, 28) }));
  } else if (st.mode === "sky") {
    chip("Equator", () => setV({ lat: 0 })); chip("42\u00b0N", () => setV({ lat: 42 })); chip("Arctic 70\u00b0N", () => setV({ lat: 70 })); chip("34\u00b0S", () => setV({ lat: -34 }));
    chip("Jun 21", () => setV({ date: P.dayOfYear(5, 21) })); chip("Dec 21", () => setV({ date: P.dayOfYear(11, 21) }));
  }
  const play = document.createElement("button"); play.type = "button"; play.className = "se-play"; play.id = "playBtn";
  play.addEventListener("click", () => setPlaying(!st.playing)); chips.appendChild(play);
  box.appendChild(chips); syncPlay();
}
function syncOut(k) { const o = $(`sl-${k}-out`); if (o) o.textContent = fmt[k](st[k]); }
function nextSyzygy(target) {
  const t = st.date + st.hour / 24;
  let x = P.nearestSyzygy(t, target);
  if (x <= t + 0.01) x = P.nearestSyzygy(x + P.SYNODIC_DAYS, target);
  return x;
}
function jumpTo(t) {
  t = P.clamp(t, 0, 364.99);
  const q = Math.round(t * 96) / 96; // nearest 15 min
  st.date = Math.floor(q); st.hour = P.clamp(Math.round((q - st.date) * 96) / 4, 0, 23.75);
  buildControls(); invalidate();
}
function setPlaying(p) { st.playing = p; syncPlay(); if (p) loop(); }
function syncPlay() { const b = $("playBtn"); if (b) { b.textContent = st.playing ? "Pause" : "Play"; b.setAttribute("aria-label", st.playing ? "Pause animation" : "Play animation"); } }

// ---------- render ----------
function size(cv, ctx, q) {
  const r = cv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1) * q;
  const w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr));
  if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { W: r.width, H: r.height, dpr };
}
function render() {
  dirty = false;
  const t0 = performance.now();
  const snap = P.snapshot(st);
  const a = size(stage, sctx, quality), b = size(diagram, dctx, quality);
  drawStage(sctx, a.W, a.H, a.dpr, cache, art, T, st, snap);
  drawDiagram(dctx, b.W, b.H, art, T, st, snap, cache);
  const rows = P.readouts(st.mode, st, snap), dl = $("readouts"); dl.textContent = "";
  for (const r of rows) { const dt = document.createElement("dt"), dd = document.createElement("dd"); dt.textContent = r.label; dd.textContent = r.text; dl.append(dt, dd); }
  $("caption").textContent = P.CAPTIONS[st.mode];
  stage.setAttribute("aria-label", `${P.MODE_LABELS[st.mode]} view. ${rows.map((r) => `${r.label}: ${r.text}`).join(". ")}`);
  // adaptive resolution while animating
  const ms = performance.now() - t0;
  if (st.playing) { if (ms > 24 && quality > 0.55) quality = Math.max(0.55, quality - 0.1); else if (ms < 10 && quality < 1) quality = Math.min(1, quality + 0.05); }
  else quality = 1;
}
function invalidate() { dirty = true; if (!raf) raf = requestAnimationFrame(tick); }
let last = 0;
function tick(now) {
  raf = 0;
  if (st.playing) {
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 0; last = now;
    const [k, rate] = PLAY_RATE[st.mode], s = P.SLIDERS[k];
    let v = st[k] + rate * dt;
    if (k === "hour") { while (v >= 24) { v -= 24; st.date = (Math.floor(st.date) + 1) % 365; } syncOut("date"); const di = $("sl-date"); if (di) di.value = st.date; }
    if (v > s.max) v = k === "hour" ? v : s.min;
    if (k === "date") v = v % 365;
    st[k] = v; // continuous while playing
    const inp = $(`sl-${k}`); if (inp) inp.value = st[k]; syncOut(k);
    dirty = true;
  } else last = 0;
  if (dirty) render();
  if (st.playing) raf = requestAnimationFrame(tick);
}
function loop() { if (!raf) raf = requestAnimationFrame(tick); }

$("themeBtn").addEventListener("click", () => {
  const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
  try { localStorage.setItem(THEME_KEY, next); } catch {}
  applyTheme(next);
});
applyTheme(document.documentElement.getAttribute("data-theme"));
$("studyBackBtn").addEventListener("click", (e) => {
  e.preventDefault();
  forwardStudyQuery(location.search);
  location.href = "study.html" + location.search;
});
window.addEventListener("resize", () => { T = readTokens(); invalidate(); });
new ResizeObserver(() => invalidate()).observe(stage);
new ResizeObserver(() => invalidate()).observe(diagram);
setMode(st.mode);
// Read-only hook for the Playwright checks.
window.__seasons = { state: st, physics: P };
