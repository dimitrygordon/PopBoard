// Physics 101 Study Questions renderer, shared by the storybook's Study Questions tab and the
// Practice Questions library. Data: physics101/sq/<slug>.json (tools/physics101/build-study-questions.py,
// from "Inspire Physics Modified Questions" and "Inspire Physics Solutions"). Extra practice only:
// the lesson's own worked examples stay in the storybook.
// Motion: pencil strokes draw on scroll, steps unfold one at a time, answers sit under a pencil
// scribble that "Show answer" erases. Reduced motion shows every drawing finished.
import { reduceMotion } from "../astro-course/ac-common.js";

// course-level set (Math Skill Handbook), not tied to one lesson
export const MATH = { slug: "math-skills", title: "Math Skills", blurb: "Significant figures, rounding, scientific notation and the other math the course leans on." };
export const SETS = [["mq", "Practice", "Practice problems", "New problems like the ones in this lesson, with different numbers."],
                     ["sol", "Book", "Book questions", "The book's own questions for this lesson, worked out."]];
const ROOT = new URL("../", import.meta.url).href; // site root, so the tab and the library share paths

// ---------- pencil sound: off by default, a soft graphite scratch while strokes draw ----------
let soundOn = false, actx = null;
// A "Sound off/on" toggle button; every Study Questions surface starts silent.
export function bindSoundButton(btn) {
  btn.setAttribute("aria-pressed", "false"); btn.textContent = "Sound off";
  btn.addEventListener("click", () => { soundOn = !soundOn; btn.setAttribute("aria-pressed", soundOn); btn.textContent = soundOn ? "Sound on" : "Sound off"; });
}
function scratch(ms) {
  if (!soundOn || reduceMotion()) return;
  try {
    actx = actx || new AudioContext();
    const n = Math.round(actx.sampleRate * ms / 1000), buf = actx.createBuffer(1, n, actx.sampleRate), ch = buf.getChannelData(0);
    for (let i = 0; i < n; i++) ch[i] = (Math.random() * 2 - 1) * 0.5;
    const src = actx.createBufferSource(), f = actx.createBiquadFilter(), g = actx.createGain();
    f.type = "bandpass"; f.frequency.value = 3200; f.Q.value = 0.8; g.gain.value = 0.035;
    src.buffer = buf; src.connect(f).connect(g).connect(actx.destination); src.start();
  } catch (e) { /* no audio is fine */ }
}

// ---------- stroke drawing: any <svg data-draw> draws path by path when scrolled into view ----------
// Leo's layered pencil SVGs drop in at physics101/sq/art/<problem id>.svg; each path draws in document
// order, so his layers play stroke by stroke. Arrows marked data-grow grow from their tail; points marked
// data-plot pop in one by one, like plotting a graph.
export function drawSvg(svg, { onDone } = {}) {
  const strokes = [...svg.querySelectorAll("path, line, polyline, circle, rect, ellipse")];
  if (reduceMotion()) { svg.classList.add("drawn"); onDone && onDone(); return; }
  let t = 0;
  for (const el of strokes) {
    let len = 0; try { len = el.getTotalLength(); } catch (e) { len = 0; }
    const dur = Math.min(900, 250 + len * 2);
    if (el.hasAttribute("data-plot")) { el.style.opacity = 0; el.style.transition = `opacity .2s ${t}ms`; t += 120; requestAnimationFrame(() => (el.style.opacity = 1)); continue; }
    if (!len) continue;
    el.style.strokeDasharray = len; el.style.strokeDashoffset = el.hasAttribute("data-grow") ? -len : len;
    el.getBoundingClientRect();
    el.style.transition = `stroke-dashoffset ${dur}ms cubic-bezier(.4,.1,.3,1) ${t}ms`;
    requestAnimationFrame(() => (el.style.strokeDashoffset = 0));
    t += dur * 0.6;
  }
  scratch(Math.min(t, 1500));
  setTimeout(() => { svg.classList.add("drawn"); onDone && onDone(); }, t + 200);
}
const drawObs = new IntersectionObserver((es) => {
  for (const e of es) if (e.isIntersecting) { drawObs.unobserve(e.target); drawSvg(e.target); }
}, { threshold: 0.4 });

// ---------- steps unfold: a step appears only when the reader scrolls to it, after the one above ----------
const stepObs = new IntersectionObserver((es) => {
  for (const e of es) {
    if (!e.isIntersecting) continue;
    const el = e.target, prev = el.previousElementSibling;
    if (prev && prev.classList.contains("sq-step") && !prev.classList.contains("in")) continue;
    stepObs.unobserve(el); el.classList.add("in"); scratch(300);
    const nx = el.nextElementSibling; if (nx && nx.classList.contains("sq-step")) { stepObs.unobserve(nx); stepObs.observe(nx); }
  }
}, { threshold: 0.25, rootMargin: "0px 0px -12% 0px" });

// a hand-drawn frame around each kept book figure (the figure itself is never redrawn)
const FRAME = `<svg class="sq-frame" data-draw viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path vector-effect="non-scaling-stroke" d="M2 3 C30 1.5 70 2.5 98 2 L98.5 50 C98 70 98.6 85 97.5 98 C70 98.5 30 97.5 2.5 98.4 C1.6 70 2.4 30 2 3"/></svg>`;
// the scribble that covers an answer until "Show answer" erases it
const SCRIBBLE = (() => { let d = "M2 12"; for (let i = 0; i < 26; i++) d += ` L${4 + i * 3.8} ${i % 2 ? 6 + (i % 5) : 30 + (i % 3) * 4}`; d += " M3 40"; for (let i = 0; i < 26; i++) d += ` L${5 + i * 3.7} ${i % 2 ? 34 + (i % 4) : 58 + (i % 3) * 3}`; return d; })();

function block(b, base) {
  if (b.html != null) { const p = document.createElement("p"); p.innerHTML = b.html; return p; }
  // pack-sq.py inlines images as data: URIs; plain paths still resolve against sq/
  const at = (u) => (u.startsWith("data:") ? u : base + u);
  const im = new Image(); im.loading = "lazy"; im.decoding = "async";
  if (b.eq) { im.src = at(b.eq); im.className = "sq-eq"; im.alt = b.alt || "equation"; im.style.width = `min(100%, ${Math.round(b.w * 1.35)}px)`; return im; }
  im.src = at(b.fig); im.className = "sq-fig-img"; im.alt = "Figure from the book";
  const f = document.createElement("figure"); f.className = "sq-fig"; f.innerHTML = FRAME; f.appendChild(im);
  im.style.width = `min(100%, ${Math.round(b.w * 1.4)}px)`;
  return f;
}
function fill(host, list, base) { for (const b of list) host.appendChild(block(b, base)); }

// Leo's art manifest: physics101/sq/art/index.json maps problem id -> 1, or {drag: "x" | "y"} for art whose
// <g class="sq-obj" data-object data-home> can be slid along one axis.
const ART = fetch(ROOT + "physics101/sq/art/index.json").then((r) => (r.ok ? r.json() : {})).catch(() => ({}));
// pack-sq.py bundles the SVGs one JSON per module (sq/art/mNN.json, Math Skills in ms.json; id -> svg text), fetched once per module
const PACKS = new Map();
function artPack(id) {
  const m = /^(?:mq|sol)(\d\d|ms)-/.exec(id); if (!m) return Promise.resolve({});
  if (!PACKS.has(m[1])) PACKS.set(m[1], fetch(`${ROOT}physics101/sq/art/${m[1] === "ms" ? "ms" : "m" + m[1]}.json`).then((r) => (r.ok ? r.json() : {})).catch(() => ({})));
  return PACKS.get(m[1]);
}
async function art(item, host) {
  try {
    const a = (await ART)[item.id]; if (!a) return;
    const t = (await artPack(item.id))[item.id]; if (!t || !/^\s*<svg/.test(t)) return;
    host.innerHTML = t; const svg = host.querySelector("svg"); svg.setAttribute("data-draw", ""); svg.classList.add("sq-art"); drawObs.observe(svg);
    if (a.drag) liveDrag(svg, a.drag, host);
  } catch (e) { /* no art yet */ }
}
// Living object: slide the art's movable object along its axis (pointer or arrow keys); a readout shows how far.
function liveDrag(svg, axis, host) {
  const obj = svg.querySelector(".sq-obj"); if (!obj) return;
  const base = obj.getAttribute("transform") || "", vb = svg.viewBox.baseVal, lim = (axis === "x" ? vb.width : vb.height) * 0.35;
  const name = obj.dataset.object || "object";
  obj.setAttribute("tabindex", "0"); obj.setAttribute("role", "slider"); obj.setAttribute("aria-label", `Move the ${name}`);
  obj.classList.add("sq-drag");
  const note = document.createElement("p"); note.className = "sq-drag-note"; host.appendChild(note);
  let d = 0, start = null, room = null;
  const set = (v) => {
    // keep the object inside the drawing: room measured on screen at rest, converted to svg units
    let lo = -lim, hi = lim;
    if (room) { lo = Math.max(lo, Math.min(0, room[0])); hi = Math.min(hi, Math.max(0, room[1])); }
    d = Math.max(lo, Math.min(hi, v));
    obj.setAttribute("transform", `translate(${axis === "x" ? d : 0} ${axis === "y" ? d : 0}) ${base}`);
    obj.setAttribute("aria-valuenow", Math.round(d));
    note.textContent = d ? `Moved the ${name} ${Math.round(Math.abs(d))} units ${axis === "x" ? (d > 0 ? "right" : "left") : (d > 0 ? "down" : "up")}.` : `Drag the ${name} ${axis === "x" ? "left or right" : "up or down"}.`;
  };
  const measure = () => { const r = obj.getBoundingClientRect(), sr = svg.getBoundingClientRect(); if (!r.width || !sr.width) return;
    const k = axis === "x" ? vb.width / sr.width : vb.height / sr.height;
    room = axis === "x" ? [(sr.left - r.left) * k + d, (sr.right - r.right) * k + d] : [(sr.top - r.top) * k + d, (sr.bottom - r.bottom) * k + d]; };
  const toSvg = (e) => { const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; return pt.matrixTransform(svg.getScreenCTM().inverse()); };
  // Leo's art can layer shapes over the object, so hit-test its box at the svg level.
  const hit = (e) => { const r = obj.getBoundingClientRect(); return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom; };
  svg.addEventListener("pointerdown", (e) => { if (!hit(e)) return; measure(); const p = toSvg(e); start = { p: axis === "x" ? p.x : p.y, d }; svg.setPointerCapture(e.pointerId); e.preventDefault(); });
  svg.addEventListener("pointermove", (e) => { if (!start) return; const p = toSvg(e); set(start.d + (axis === "x" ? p.x : p.y) - start.p); });
  svg.addEventListener("pointerup", () => { start = null; });
  svg.addEventListener("pointercancel", () => { start = null; });
  obj.addEventListener("keydown", (e) => {
    const k = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 }[e.key]; if (!k) return; measure();
    set(d + k * 8); e.preventDefault();
  });
  set(0);
}
async function sandbox(item, host) {
  // Living objects: a problem with a drag spec (Leo, v2/drag.json format) mounts the shared drag engine.
  if (!item.drag) return;
  try {
    const dm = await import("./scenes/drag.js");
    const ctx = { stage: host, layer: host, reduce: reduceMotion(), ui: { button() {}, slider() {} }, say() {} };
    const d = dm.createDrag(ctx, item.drag); d.mount();
  } catch (e) { console.warn("study question sandbox", item.id, e); }
}

function erase(cover, done) {
  if (reduceMotion()) { cover.remove(); done(); return; }
  const path = cover.querySelector("path"), len = path.getTotalLength();
  path.style.strokeDasharray = len; path.style.strokeDashoffset = 0; path.getBoundingClientRect();
  path.style.transition = "stroke-dashoffset 700ms cubic-bezier(.5,0,.3,1)"; path.style.strokeDashoffset = -len;
  cover.classList.add("erasing"); scratch(650);
  setTimeout(() => { cover.remove(); done(); }, 720);
}

// Hand-built pages (Leo's art and motion) replace the generic card for a problem: physics101/sq/rich/<id>/
// holds body.html, leo.css and leo.js (export mount(root, {reduce, scratch})).
const RICH = fetch(ROOT + "physics101/sq/rich/index.json").then((r) => (r.ok ? r.json() : {})).catch(() => ({}));
async function richCard(item, el) {
  const dir = `${ROOT}physics101/sq/rich/${item.id}/`;
  try {
    const html = await (await fetch(dir + "body.html")).text();
    if (!document.querySelector(`link[data-rich="${item.id}"]`)) {
      const l = document.createElement("link"); l.rel = "stylesheet"; l.href = dir + "leo.css"; l.dataset.rich = item.id; document.head.appendChild(l);
    }
    el.className = "sq-rich leo"; el.innerHTML = html;
    const m = await import(`./sq/rich/${item.id}/leo.js`);
    m.mount(el, { reduce: reduceMotion(), scratch, scroller: el.closest(".panel-body") });
    return true;
  } catch (e) { console.warn("study question page", item.id, e); return false; }
}

function card(item, n) {
  const base = ROOT + "physics101/sq/";
  const el = document.createElement("article"); el.className = "sq-card sketch"; el.id = item.id;
  el.innerHTML = `<h3 class="sq-q-title"><span class="sq-num">${n}</span><span></span></h3><div class="sq-q"></div><div class="sq-art-slot"></div><div class="sq-live"></div>`;
  el.querySelector(".sq-q-title span:last-child").textContent = item.title;
  // opener items park in a module's first lesson, wrap-up items in its last (Dimitry); tag them
  const where = { opener: "Module opener", wrap: "Module wrap-up" }[item.where];
  if (where) { const t = document.createElement("span"); t.className = "sq-where"; t.textContent = where; el.querySelector(".sq-q-title").after(t); }
  fill(el.querySelector(".sq-q"), item.question, base);
  if (item.steps.length) {
    const ol = document.createElement("ol"); ol.className = "sq-steps"; ol.setAttribute("aria-label", "Worked steps");
    for (const s of item.steps) {
      const li = document.createElement("li"); li.className = "sq-step";
      li.innerHTML = `<svg class="sq-tick" data-draw viewBox="0 0 24 24" aria-hidden="true"><path d="M4 13c2 2 3.5 3.6 5 5.5C12 12 15.5 7.5 20 4"/></svg><h4></h4>`;
      li.querySelector("h4").textContent = s.label; fill(li, s.body, base); ol.appendChild(li);
    }
    el.appendChild(ol);
  }
  const ans = document.createElement("section"); ans.className = "sq-answer"; ans.setAttribute("aria-label", "Answer");
  ans.innerHTML = `<div class="sq-ans-body" hidden><h4>Answer</h4></div><div class="sq-cover"><svg viewBox="0 0 104 64" preserveAspectRatio="none" aria-hidden="true"><path d="${SCRIBBLE}"/></svg><button type="button" class="sq-show">Show answer</button></div>`;
  const body = ans.querySelector(".sq-ans-body"); fill(body, item.answer, base);
  if (item.check.length) { const h = document.createElement("h4"); h.textContent = "Check"; body.appendChild(h); fill(body, item.check, base); }
  ans.querySelector(".sq-show").addEventListener("click", () => {
    body.hidden = false; erase(ans.querySelector(".sq-cover"), () => { const h = body.querySelector("h4"); h.tabIndex = -1; h.focus({ preventScroll: true }); });
  });
  el.appendChild(ans);
  art(item, el.querySelector(".sq-art-slot")); sandbox(item, el.querySelector(".sq-live"));
  return el;
}


// Render one lesson's problems into host. filter: "all" | "mq" | "sol". Returns {mq, sol} counts.
export async function renderLesson(host, slug, { filter = "all" } = {}) {
  host.innerHTML = "";
  let data;
  try { data = await (await fetch(`${ROOT}physics101/sq/${slug}.json`)).json(); }
  catch (e) { host.innerHTML = `<p class="sq-empty">Study Questions for this lesson are not ready yet.</p>`; return { mq: 0, sol: 0 }; }
  const counts = { mq: 0, sol: 0 }; for (const it of data.items) counts[it.src]++;
  const rich = await RICH;
  for (const [src, , name, blurb] of SETS) {
    if (filter !== "all" && filter !== src) continue;
    const items = data.items.filter((it) => it.src === src); if (!items.length) continue;
    const sec = document.createElement("section"); sec.className = "sq-set"; sec.dataset.set = src;
    sec.innerHTML = `<h2 class="sq-set-h"></h2><p class="sq-set-blurb"></p>`;
    sec.querySelector("h2").textContent = `${name} (${items.length})`; sec.querySelector("p").textContent = blurb;
    host.appendChild(sec);
    for (const [i, it] of items.entries()) {
      const c = card(it, i + 1); sec.appendChild(c);
      if (rich[it.id]) { const h = document.createElement("article"); if (await richCard(it, h)) { c.replaceWith(h); h.id = it.id; } }
    }
  }
  for (const s of host.querySelectorAll(".sq-steps")) { const first = s.firstElementChild; if (first) stepObs.observe(first); }
  for (const svg of host.querySelectorAll(".sq-card svg[data-draw]:not(.sq-tick)")) drawObs.observe(svg);
  if (reduceMotion()) for (const s of host.querySelectorAll(".sq-step")) s.classList.add("in");
  return counts;
}
