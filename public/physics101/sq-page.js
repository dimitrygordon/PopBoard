// Physics 101 Study Questions: extra practice for one lesson, worked step by step.
// Data: physics101/sq/<slug>.json, built by tools/physics101/build-study-questions.py from the
// "Inspire Physics Modified Questions" and "Inspire Physics Solutions" PDFs.
// Motion: pencil strokes draw on scroll, steps unfold one at a time, answers sit under a pencil
// scribble that is erased by "Show answer". Reduced motion shows every drawing finished.
import { bindThemeButton, BACK_ICON, reduceMotion } from "../astro-course/ac-common.js";
import { forwardStudyQuery } from "../board-return.js?v=20261022a";
import { DECKS } from "./p101-catalog.js";

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const slug = params.get("lesson") || "m01-l01";
const deck = DECKS.find((d) => d.slug === slug);
const SETS = [["mq", "Practice problems", "New problems like the ones in this lesson, with different numbers."],
              ["sol", "Book questions", "The book's own questions for this lesson, worked out."]];

bindThemeButton($("themeBtn"));
document.querySelector("#sqBack .back-icon").outerHTML = BACK_ICON;
const back = forwardStudyQuery(location.search); back.set("lesson", slug);
$("sqBack").href = "study-physics101-story.html?" + back.toString();

// ---------- pencil sound: off by default, a soft graphite scratch while strokes draw ----------
let soundOn = false, actx = null;
$("soundBtn").addEventListener("click", () => {
  soundOn = !soundOn; $("soundBtn").setAttribute("aria-pressed", soundOn); $("soundBtn").textContent = soundOn ? "Sound on" : "Sound off";
});
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
  const im = new Image(); im.loading = "lazy"; im.decoding = "async"; im.src = base + b.eq || base + b.fig;
  if (b.eq) { im.src = base + b.eq; im.className = "sq-eq"; im.alt = b.alt || "equation"; im.style.width = `min(100%, ${Math.round(b.w * 1.35)}px)`; return im; }
  im.src = base + b.fig; im.className = "sq-fig-img"; im.alt = "Figure from the book";
  const f = document.createElement("figure"); f.className = "sq-fig"; f.innerHTML = FRAME; f.appendChild(im);
  im.style.width = `min(100%, ${Math.round(b.w * 1.4)}px)`;
  return f;
}
function fill(host, list, base) { for (const b of list) host.appendChild(block(b, base)); }

// Leo's art manifest: physics101/sq/art/index.json lists the problem ids that have an SVG yet.
const ART = fetch("physics101/sq/art/index.json").then((r) => (r.ok ? r.json() : [])).then((a) => new Set(a)).catch(() => new Set());
async function art(item, host) {
  // Leo's pencil art for this problem, if it exists yet
  try {
    if (!(await ART).has(item.id)) return;
    const r = await fetch(`physics101/sq/art/${item.id}.svg`); if (!r.ok) return;
    const t = await r.text(); if (!/^\s*<svg/.test(t)) return;
    host.innerHTML = t; const svg = host.querySelector("svg"); svg.setAttribute("data-draw", ""); svg.classList.add("sq-art"); drawObs.observe(svg);
  } catch (e) { /* no art yet */ }
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
const RICH = fetch("physics101/sq/rich/index.json").then((r) => (r.ok ? r.json() : {})).catch(() => ({}));
async function richCard(item, el) {
  const dir = `physics101/sq/rich/${item.id}/`;
  try {
    const html = await (await fetch(dir + "body.html")).text();
    if (!document.querySelector(`link[data-rich="${item.id}"]`)) {
      const l = document.createElement("link"); l.rel = "stylesheet"; l.href = dir + "leo.css"; l.dataset.rich = item.id; document.head.appendChild(l);
    }
    el.className = "sq-rich leo"; el.innerHTML = html;
    const m = await import(`./sq/rich/${item.id}/leo.js`);
    m.mount(el, { reduce: reduceMotion(), scratch });
    return true;
  } catch (e) { console.warn("study question page", item.id, e); return false; }
}

function card(item, n) {
  const base = "physics101/sq/";
  const el = document.createElement("article"); el.className = "sq-card sketch"; el.id = item.id;
  el.innerHTML = `<h3 class="sq-q-title"><span class="sq-num">${n}</span><span></span></h3><div class="sq-q"></div><div class="sq-art-slot"></div><div class="sq-live"></div>`;
  el.querySelector(".sq-q-title span:last-child").textContent = item.title;
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

async function main() {
  if (!deck) { $("sqIntro").textContent = "This lesson was not found."; return; }
  document.title = `Study Questions: ${deck.title} // Physics 101`;
  document.documentElement.dataset.module = deck.q;
  $("sqTitle").textContent = `Study Questions`;
  let data;
  try { data = await (await fetch(`physics101/sq/${slug}.json`)).json(); } catch (e) { $("sqIntro").textContent = "Study Questions for this lesson are not ready yet."; return; }
  $("sqIntro").innerHTML = `<span class="sq-crumb">Module ${deck.q} \u00b7 Lesson ${deck.lesson}</span><b></b><span>Extra practice for this lesson. Work each step, then show the answer.</span>`;
  $("sqIntro").querySelector("b").textContent = deck.title;
  const list = $("sqList");
  for (const [src, name, blurb] of SETS) {
    const items = data.items.filter((it) => it.src === src); if (!items.length) continue;
    const sec = document.createElement("section"); sec.className = "sq-set"; sec.id = "set-" + src;
    sec.innerHTML = `<h2 class="sq-set-h"></h2><p class="sq-set-blurb"></p>`;
    sec.querySelector("h2").textContent = `${name} (${items.length})`; sec.querySelector("p").textContent = blurb;
    const rich = await RICH;
    for (const [i, it] of items.entries()) {
      const c = card(it, i + 1); sec.appendChild(c);
      if (rich[it.id]) { const host = document.createElement("article"); host.id = it.id; if (await richCard(it, host)) c.replaceWith(host); }
    }
    list.appendChild(sec);
    const a = document.createElement("a"); a.className = "btn"; a.href = "#set-" + src; a.textContent = `${name} (${items.length})`; $("sqJump").appendChild(a);
  }
  for (const s of document.querySelectorAll(".sq-steps")) { const first = s.firstElementChild; if (first) stepObs.observe(first); }
  for (const svg of document.querySelectorAll("svg[data-draw]:not(.sq-tick)")) drawObs.observe(svg);
  if (reduceMotion()) for (const s of document.querySelectorAll(".sq-step")) s.classList.add("in");
  if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
}
main();
