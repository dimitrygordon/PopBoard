// Newton's Cannonball Fire: page wiring.
import { forwardStudyQuery } from "../board-return.js?v=20261022a";
import {
  GM_E, R_E, H_DEFAULT, H_MIN, H_MAX, H_STEP, V_MAX, V_STEP, MOTION
} from "./ncf-config.js";
import {
  classify, samplePath, presetsAt, presetSpeed, outcomeLabel, formatKmS, formatMin,
  formatMps, formatSec, practiceAnswers, applySandbox, clamp
} from "./ncf-physics.js";
import { STRINGS, PLACEHOLDER, TESLA_PENDING } from "./ncf-strings.js";
import { layout, toCanvas, drawFrame, loadImages } from "./ncf-art.js";

const $ = (id) => document.getElementById(id);
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const THEME_KEY = "popboard.newtons-cannonball-fire.theme";

const st = {
  h: H_DEFAULT,
  v: 0,
  trails: [], // { pts, color, kind, v, h }
  ball: null, // { x, y, color }
  anim: null, // { pts, color, i, t0, dur }
  images: {},
};

const canvas = $("stage");
const ctx = canvas.getContext("2d");

$("studyBackBtn").addEventListener("click", (e) => {
  e.preventDefault();
  const qs = forwardStudyQuery(location.search).toString();
  history.replaceState(null, "", qs ? "?" + qs : location.pathname);
  location.href = "study.html" + location.search;
});

function theme() { return document.documentElement.getAttribute("data-theme") || "dark"; }
function setTheme(t) {
  document.documentElement.setAttribute("data-theme", t);
  try { localStorage.setItem(THEME_KEY, t); } catch (e) {}
  $("themeBtn").textContent = t === "dark" ? "Light" : "Dark";
  $("themeBtn").setAttribute("aria-pressed", t === "dark" ? "true" : "false");
  $("themeBtn").setAttribute("aria-label", t === "dark" ? "Switch to light mode" : "Switch to dark mode");
}
$("themeBtn").addEventListener("click", () => setTheme(theme() === "dark" ? "light" : "dark"));
setTheme(theme());

$("pageTitle").textContent = STRINGS.title;
$("intro").textContent = STRINGS.intro;
$("sandboxTitle").textContent = STRINGS.sandboxTitle;
$("scaleNote").textContent = STRINGS.scaleNote;
$("deriveTitle").textContent = STRINGS.derive.title;
$("deriveLead").textContent = STRINGS.derive.lead;
$("socratesMark").textContent = PLACEHOLDER ? STRINGS.socratesMark : "";
$("teslaMark").textContent = TESLA_PENDING ? STRINGS.teslaMark : "";
$("fireBtn").textContent = STRINGS.fire;
$("clearBtn").textContent = STRINGS.clear;

const q = new URLSearchParams(location.search);
if (q.has("h")) st.h = clamp(Number(q.get("h")), H_MIN, H_MAX);
if (q.has("v")) st.v = clamp(Number(q.get("v")), 0, V_MAX);

$("height").min = H_MIN;
$("height").max = H_MAX;
$("height").step = H_STEP;
$("height").value = st.h;
$("speed").min = 0;
$("speed").max = V_MAX;
$("speed").step = V_STEP;
$("speed").value = st.v;

function syncLabels() {
  $("speedVal").value = formatKmS(st.v);
  $("heightVal").value = `${(st.h / 1000).toFixed(0)} km`;
  const info = classify(st.v, st.h);
  $("readV").textContent = formatKmS(st.v);
  $("readOrbit").textContent = formatKmS(info.vc);
  $("readEsc").textContent = formatKmS(info.vesc);
  $("readT").textContent = info.bound ? formatMin(info.period) : "-";
  $("readOut").textContent = outcomeLabel(info.kind);
}

function fillPresets() {
  const box = $("presets");
  box.replaceChildren();
  const lab = document.createElement("span");
  lab.className = "ncf-pl";
  lab.textContent = STRINGS.presetsLabel;
  box.append(lab);
  for (const p of presetsAt(st.h)) {
    const b = document.createElement("button");
    b.type = "button";
    b.dataset.id = p.id;
    b.dataset.v = String(p.v);
    b.textContent = p.label;
    b.style.color = theme() === "dark" ? p.color : undefined;
    b.addEventListener("click", () => {
      st.v = p.v;
      $("speed").value = Math.round(st.v);
      syncLabels();
      fire(p.color);
    });
    box.append(b);
  }
}

function bindSlider(el, onInput, { clearTrails } = {}) {
  const apply = (raw) => {
    const min = Number(el.min), max = Number(el.max), step = Number(el.step) || 1;
    let v = Math.round(clamp(raw, min, max) / step) * step;
    el.value = String(v);
    onInput(v);
  };
  el.addEventListener("input", () => apply(Number(el.value)));
  const fromPointer = (e) => {
    const r = el.getBoundingClientRect();
    const u = clamp((e.clientX - r.left) / r.width, 0, 1);
    apply(Number(el.min) + u * (Number(el.max) - Number(el.min)));
  };
  const fromTouch = (e) => {
    if (!e.touches || !e.touches[0]) return;
    const r = el.getBoundingClientRect();
    const u = clamp((e.touches[0].clientX - r.left) / r.width, 0, 1);
    apply(Number(el.min) + u * (Number(el.max) - Number(el.min)));
  };
  el.addEventListener("pointerdown", (e) => { el.setPointerCapture?.(e.pointerId); fromPointer(e); });
  el.addEventListener("pointermove", (e) => { if (el.hasPointerCapture?.(e.pointerId)) fromPointer(e); });
  el.addEventListener("touchstart", (e) => { e.preventDefault(); fromTouch(e); }, { passive: false });
  el.addEventListener("touchmove", (e) => { e.preventDefault(); fromTouch(e); }, { passive: false });
  if (clearTrails) {
    const wipe = () => { st.trails = []; st.ball = null; stopAnim(); fillPresets(); paint(); };
    el.addEventListener("change", wipe);
  }
}

bindSlider($("speed"), (v) => { st.v = v; syncLabels(); });
bindSlider($("height"), (h) => { st.h = h; st.trails = []; st.ball = null; stopAnim(); fillPresets(); syncLabels(); paint(); }, { clearTrails: true });
// Clear trails as soon as the height starts to move, not only on change.
$("height").addEventListener("input", () => {
  if (st.trails.length || st.anim || st.ball) {
    st.trails = [];
    st.ball = null;
    stopAnim();
    fillPresets();
    paint();
  }
});

$("fireBtn").addEventListener("click", () => fire());
$("clearBtn").addEventListener("click", () => {
  st.trails = [];
  st.ball = null;
  stopAnim();
  paint();
});

function stopAnim() {
  if (st.anim?.raf) cancelAnimationFrame(st.anim.raf);
  st.anim = null;
}

function fire(color) {
  const info = samplePath(st.v, st.h, GM_E, R_E, 360);
  const lay = currentLayout();
  const pts = toCanvas(info.points, lay, R_E, info.kind);
  const col = color || colorFor(info.kind);
  if (reducedMotion) {
    st.trails.push({ pts, color: col, kind: info.kind, v: st.v, h: st.h, reduced: true });
    st.ball = pts.length ? { x: pts[pts.length - 1].x, y: pts[pts.length - 1].y, color: col } : null;
    stopAnim();
    syncLabels();
    paint();
    return;
  }
  const dur = info.kind === "escape" ? MOTION.escapeDuration
    : info.kind === "falls" || info.kind === "drop" ? MOTION.lobDuration
    : MOTION.orbitDuration;
  stopAnim();
  st.anim = { pts, color: col, kind: info.kind, v: st.v, h: st.h, i: 0, t0: performance.now(), dur };
  syncLabels();
  tick();
}

function colorFor(kind) {
  if (kind === "circular") return "#E23B3B";
  if (kind === "ellipse") return "#E0B43A";
  if (kind === "escape") return "#EDE6D6";
  if (st.v < vHalf()) return "#5B9AE8";
  return "#3FA86A";
}
function vHalf() {
  const info = classify(0, st.h);
  return info.vc * 0.55;
}

function tick() {
  const a = st.anim;
  if (!a) return;
  const t = (performance.now() - a.t0) / 1000;
  const u = Math.min(1, t / a.dur);
  const i = Math.max(1, Math.floor(u * (a.pts.length - 1)));
  a.i = i;
  const shown = a.pts.slice(0, i + 1);
  const last = shown[shown.length - 1];
  st.ball = last ? { x: last.x, y: last.y, color: a.color } : null;
  paintWith(shown, a.color);
  if (u >= 1) {
    st.trails.push({ pts: a.pts, color: a.color, kind: a.kind, v: a.v, h: a.h, reduced: false });
    st.anim = null;
    paint();
    return;
  }
  a.raf = requestAnimationFrame(tick);
}

function currentLayout() {
  const w = canvas.width, h = canvas.height;
  return layout(w, h);
}

function sizeCanvas() {
  const wrap = canvas.parentElement;
  const css = Math.min(wrap.clientWidth || 900, 900);
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const px = Math.max(320, Math.round(css * dpr));
  if (canvas.width !== px) {
    canvas.width = px;
    canvas.height = px;
  }
  canvas.style.width = css + "px";
  canvas.style.height = css + "px";
}

function remapTrails(lay) {
  for (const t of st.trails) {
    const path = samplePath(t.v, t.h, GM_E, R_E, 360);
    t.pts = toCanvas(path.points, lay, R_E, t.kind);
  }
  if (st.anim) {
    const path = samplePath(st.anim.v, st.anim.h, GM_E, R_E, 360);
    st.anim.pts = toCanvas(path.points, lay, R_E, st.anim.kind);
  }
}

function paintWith(partial, color) {
  sizeCanvas();
  const lay = currentLayout();
  const trails = st.trails.map((t) => t);
  if (partial) trails.push({ pts: partial, color, reduced: false });
  drawFrame(ctx, canvas.width, canvas.height, lay, st.images, trails, st.ball);
}

function paint() {
  sizeCanvas();
  const lay = currentLayout();
  remapTrails(lay);
  if (st.anim) {
    const shown = st.anim.pts.slice(0, (st.anim.i || 0) + 1);
    const last = shown[shown.length - 1];
    st.ball = last ? { x: last.x, y: last.y, color: st.anim.color } : st.ball;
    paintWith(shown, st.anim.color);
    return;
  }
  drawFrame(ctx, canvas.width, canvas.height, lay, st.images, st.trails, st.ball);
}

addEventListener("resize", () => paint());

function fill(template, map) {
  return String(template || "").replace(/\{(\w+)\}/g, (_, k) => (map[k] != null ? map[k] : "{" + k + "}"));
}

function stepList(steps, map, withAnswer) {
  const ol = document.createElement("ol");
  ol.className = "ncf-steps";
  steps.forEach((s, i) => {
    const li = document.createElement("details");
    li.className = "ncf-step";
    if (i === 0) li.open = false;
    const sum = document.createElement("summary");
    sum.textContent = s.title;
    const body = document.createElement("div");
    body.className = "ncf-step-body";
    if (s.body) {
      const p = document.createElement("p");
      p.textContent = fill(s.body, map);
      body.append(p);
    }
    if (s.eq) {
      const eq = document.createElement("p");
      eq.className = "ncf-eq";
      eq.textContent = s.eq;
      body.append(eq);
    }
    const isLast = i === steps.length - 1 && withAnswer;
    if (isLast) {
      const wrap = document.createElement("div");
      wrap.className = "ncf-cover";
      wrap.dataset.hidden = "1";
      const lastP = body.querySelector("p:last-child") || body;
      lastP.classList.add("ncf-answer");
      wrap.append(...body.childNodes);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "ncf-show";
      btn.textContent = "Show answer";
      btn.addEventListener("click", () => {
        wrap.dataset.hidden = "0";
        btn.hidden = true;
      });
      wrap.append(btn);
      body.append(wrap);
    }
    li.append(sum, body);
    ol.append(li);
  });
  return ol;
}

function fillDerive() {
  const ol = $("deriveSteps");
  ol.replaceChildren();
  STRINGS.derive.steps.forEach((s) => {
    const li = document.createElement("details");
    li.className = "ncf-step";
    const sum = document.createElement("summary");
    sum.textContent = s.title;
    const body = document.createElement("div");
    body.className = "ncf-step-body";
    if (s.body) {
      const p = document.createElement("p");
      p.textContent = s.body;
      body.append(p);
    }
    if (s.eq) {
      const eq = document.createElement("p");
      eq.className = "ncf-eq";
      eq.textContent = s.eq;
      body.append(eq);
    }
    li.append(sum, body);
    ol.append(li);
  });
}

function mapsFor(id, a) {
  const GM = formatSciPlain(GM_E) + " m³/s²";
  const R = formatSciPlain(R_E) + " m";
  if (id === "surface") {
    return { R, GM, v: formatKmS(a.surface.vOrbit), Tsec: formatSec(a.surface.period, 0), Tmin: formatMin(a.surface.period) };
  }
  if (id === "iss") {
    return {
      h: formatSciPlain(a.iss.h) + " m", r: formatSciPlain(a.iss.r) + " m", GM,
      g: a.iss.g.toFixed(2) + " m/s²", v: formatKmS(a.iss.vOrbit),
      Tsec: formatSec(a.iss.period, 0), Tmin: formatMin(a.iss.period)
    };
  }
  if (id === "escapeSurface") {
    return {
      R, vOrbit: formatKmS(a.escapeSurface.vOrbit), vEsc: formatKmS(a.escapeSurface.vEsc)
    };
  }
  if (id === "moon") {
    return {
      r: formatSciPlain(a.moon.r) + " m", v: formatKmS(a.moon.vOrbit, 3),
      vSci: formatMps(a.moon.vOrbit), Tsec: formatSec(a.moon.period, 0), Tmin: formatMin(a.moon.period, 0)
    };
  }
  if (id === "planetX") {
    return {
      r: formatSciPlain(a.planetX.r) + " m", g: a.planetX.g.toFixed(2) + " m/s²",
      v: formatKmS(a.planetX.vOrbit), Tsec: formatSec(a.planetX.period, 0), Tmin: formatMin(a.planetX.period)
    };
  }
  if (id === "mountain") {
    return {
      h: (a.mountain.h / 1000).toFixed(0) + " km", r: formatSciPlain(a.mountain.r) + " m",
      v: formatKmS(a.mountain.vOrbit), Tsec: formatSec(a.mountain.period, 0), Tmin: formatMin(a.mountain.period)
    };
  }
  return {};
}

function formatSciPlain(x) {
  const exp = Math.floor(Math.log10(Math.abs(x)));
  const mant = x / 10 ** exp;
  return `${mant.toFixed(2)} × 10${expToSup(exp)}`;
}
function expToSup(exp) {
  const sup = { "-": "⁻", "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹" };
  return String(exp).split("").map((c) => sup[c] ?? c).join("");
}

function fillProblems() {
  const host = $("problems");
  host.replaceChildren();
  const a = practiceAnswers();
  for (const p of STRINGS.problems) {
    const sec = document.createElement("section");
    sec.className = "ncf-problem";
    sec.id = "prob-" + p.id;
    const h = document.createElement("h3");
    h.className = "ncf-h";
    h.textContent = p.title;
    const prompt = document.createElement("p");
    prompt.className = "ncf-prompt";
    prompt.textContent = p.prompt;
    sec.append(h, prompt, stepList(p.steps, mapsFor(p.id, a), true));
    if (p.apply) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "ncf-apply";
      btn.textContent = STRINGS.applyFire;
      btn.addEventListener("click", () => {
        const next = applySandbox(p.apply);
        if (!next) return;
        st.h = next.h;
        st.v = next.v;
        $("height").value = st.h;
        $("speed").value = Math.round(st.v);
        fillPresets();
        syncLabels();
        $("sandbox").scrollIntoView({ block: "start" });
        fire();
      });
      sec.append(btn);
    } else if (p.applyNote) {
      const note = document.createElement("p");
      note.className = "ncf-scale";
      note.textContent = STRINGS[p.applyNote] || "";
      sec.append(note);
    }
    host.append(sec);
  }
}

st.images = loadImages(() => paint());
fillPresets();
fillDerive();
fillProblems();
syncLabels();
paint();

if (q.get("fire") === "1") fire();

window.__ncf = {
  get v() { return st.v; },
  get h() { return st.h; },
  get trails() { return st.trails; },
  get playing() { return !!st.anim; },
  get reduced() { return reducedMotion; },
  get theme() { return theme(); },
  st,
  classify, practiceAnswers, STRINGS, PLACEHOLDER, TESLA_PENDING,
  fire, clear() { $("clearBtn").click(); },
  setV(v) { st.v = clamp(v, 0, V_MAX); $("speed").value = st.v; syncLabels(); },
  setH(h) { st.h = clamp(h, H_MIN, H_MAX); $("height").value = st.h; fillPresets(); syncLabels(); paint(); },
  paint,
};
