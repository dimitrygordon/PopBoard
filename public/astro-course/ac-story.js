// Astronomy Course storybook reader: one deck slide per page, same words, same order, same art.
import { DECKS } from "./ac-catalog.js";
import { renderSlide, readableHtml, noteHtml, boxText, esc } from "./ac-render.js";
import { bindThemeButton, store, BACK_ICON, reduceMotion } from "./ac-common.js";
import { EXTRAS, MODULES } from "./ac-extras.js";
import { mountOrbit } from "./ac-orbit.js";
import { mountCrater } from "./ac-sb-crater.js";
import { mountResonance } from "./ac-sb-resonance.js";
import { mountDose } from "./ac-sb-dose.js";
import { forwardStudyQuery } from "../board-return.js?v=20261022a";
import { halfUnder } from "../shared/layout/layout.js";
import { createPopup, darkInk, webglOk } from "./ac-popup.js";
import { mountFx } from "./ac-fx.js";
import { createNarrator } from "./ac-narrate.js";
import { mountPowers, mountEclipse, mountWaves, mountDoppler, mountGravity } from "./ac-sb-v2.js";

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const meta = DECKS.find((d) => d.slug === params.get("deck") && d.built) || DECKS.find((d) => d.built);
let extra = EXTRAS[meta.slug] || { sandboxes: {}, tryIt: {}, choices: {} };
const base = `astro-course/decks/${meta.slug}/`;
const PAGE_KEY = "popboard.astronomy-course.page." + meta.slug;
const story = $("story"), stage = $("stage"), panel = $("panel");
let deck = null, page = 1, mode = params.get("mode") === "sandbox" ? "sandbox" : "story", orbit = null;
const answered = new Map(); // page -> chosen option
// Sandbox kinds a deck can place on its pages (EXTRAS[deck].sandboxes maps page -> kind).
const SANDBOXES = {
  kepler: { name: "Kepler orbit sandbox", mount: (h) => mountOrbit(h) },
  crater: { name: "Crater sandbox", mount: (h) => mountCrater(h) },
  resonance: { name: "Resonance sandbox", mount: (h) => mountResonance(h, { system: "galilean" }) },
  pluto: { name: "Resonance sandbox", mount: (h) => mountResonance(h, { system: "pluto" }) },
  dose: { name: "Radiation dose sandbox", mount: (h) => mountDose(h) },
  powers: { name: "Powers of Ten sandbox", mount: (h) => mountPowers(h) },
  eclipse: { name: "Eclipse sandbox", mount: (h) => mountEclipse(h) },
  waves: { name: "Light waves sandbox", mount: (h) => mountWaves(h) },
  doppler: { name: "Doppler sandbox", mount: (h) => mountDoppler(h) },
  gravity: { name: "Gravitation sandbox", mount: (h) => mountGravity(h) }
};
// 3D set pieces that are the sandbox on their own page (no separate canvas).
const ONPAGE = { rings: "Cosmic address rings (3D)", cannon: "Newton's cannon (3D)", seasons: "Seasons orbit (3D)" };
let v2 = null, popup = null, fxh = null;
const narrator = createNarrator($("narr"), "astro-course/");
const sandboxKinds = () => [...new Set(Object.values(extra.sandboxes || {}))].filter((k) => SANDBOXES[k]);
let sbKind = null;

document.title = `${meta.title} // Astronomy Course`;
$("deckTitle").textContent = meta.title;
bindThemeButton($("themeBtn"));
document.querySelector("#studyBackBtn .back-icon").outerHTML = BACK_ICON;
$("studyBackBtn").addEventListener("click", () => {
  const qs = forwardStudyQuery(location.search).toString();
  location.href = "study-astronomy-course.html" + (qs ? "?" + qs : "");
});

function hasSandbox() { return sandboxKinds().length > 0; }

function pageUrl() {
  const p = forwardStudyQuery(location.search);
  p.set("deck", meta.slug);
  if (mode === "sandbox") p.set("mode", "sandbox"); else p.set("page", page);
  return "?" + p.toString();
}

// Size the 16:9 page to the room it has, and tell the text boxes their point size.
function fit() {
  const wrap = $("stageWrap");
  const phone = matchMedia("(max-width: 699px)").matches;
  let w = wrap.clientWidth, h = wrap.clientHeight;
  if (phone) h = Infinity;
  const sw = Math.max(200, Math.floor(Math.min(w, h * 16 / 9)));
  for (const el of [stage, $("sandboxStage")]) el.style.setProperty("--stage-w", sw + "px");
  if (phone) sheetStops(); else panel.style.removeProperty("--sheet-h");
}

// Phone bottom sheet: peek, a half stop right under the page caption, and full.
let snap = "half";
function sheetStops() {
  const full = innerHeight - document.querySelector(".ac-bar").getBoundingClientRect().bottom - 4;
  const peek = 96;
  const half = halfUnder(mode === "sandbox" ? $("sandboxStage") : $("stageCap"), peek, full);
  const hpx = snap === "peek" ? peek : snap === "full" ? full : half;
  panel.style.setProperty("--sheet-h", hpx + "px");
  panel.dataset.snap = snap;
  return { peek, half, full };
}
(function sheetDrag() {
  const h = $("sheetHandle");
  let y0 = 0, h0 = 0, moved = false;
  h.addEventListener("pointerdown", (e) => { y0 = e.clientY; h0 = panel.getBoundingClientRect().height; moved = false; h.setPointerCapture(e.pointerId); });
  h.addEventListener("pointermove", (e) => {
    if (!h.hasPointerCapture(e.pointerId)) return;
    const dy = e.clientY - y0; if (Math.abs(dy) > 6) moved = true;
    if (moved) panel.style.setProperty("--sheet-h", Math.max(60, h0 - dy) + "px");
  });
  h.addEventListener("pointerup", (e) => {
    const s = sheetStops();
    if (moved) {
      const cur = h0 - (e.clientY - y0);
      const opts = [["peek", s.peek], ["half", s.half], ["full", s.full]];
      snap = opts.reduce((b, o) => Math.abs(o[1] - cur) < Math.abs(b[1] - cur) ? o : b)[0];
    } else snap = snap === "peek" ? "half" : snap === "half" ? "full" : "peek";
    sheetStops();
  });
})();
document.body.classList.add("fun-sheet-on");

function toast(msg) {
  // Short notes go into the page tools (never over the page itself).
  const fb = $("tools").querySelector(".feedback");
  if (fb) fb.textContent = msg;
}

function tryItCard(key) {
  const m = MODULES[key];
  if (!m) return "";
  const p = forwardStudyQuery(location.search);
  p.set("story", `${meta.slug}-${page}`);
  return `<a class="tryit sketch" href="${esc(m.file)}?${esc(p.toString())}">
    <img src="astro-course/thumbs/${esc(key)}.webp" alt="" loading="lazy" width="320" height="200">
    <span><b>Try it: ${esc(m.name)}</b><span>${esc(m.blurb)}</span><span class="go">Open the module, then come back to this page.</span></span></a>`;
}

function renderTools(s) {
  const out = [];
  const choice = extra.choices && extra.choices[s.n];
  const hasOpts = !!s.answer || !!choice;
  if (hasOpts) {
    const picked = answered.get(s.n);
    out.push(`<section class="tool"><h2 class="panel-h">Check for understanding</h2>
      <p class="note">${picked ? "Your pick is marked on the page." : "Tap an answer on the page."}</p>
      <p class="feedback" aria-live="polite" ${picked ? `data-ok="${picked.ok ? 1 : 0}"` : ""}>${picked ? (picked.ok ? "Yes! That's it." : "Not quite. Try another, or reveal the answer.") : ""}</p>
      ${s.reveal ? `<div class="row"><button type="button" data-reveal aria-expanded="false">Show the answer</button></div><div class="reveal" hidden>${noteHtml(s.reveal)}</div>` : ""}</section>`);
  } else if (s.reveal) {
    out.push(`<section class="tool"><h2 class="panel-h">Predict, then reveal</h2><p class="note">Make your guess first. Then check it.</p>
      <p class="feedback" aria-live="polite"></p>
      <div class="row"><button type="button" data-reveal aria-expanded="false">Show the answer</button></div><div class="reveal" hidden>${noteHtml(s.reveal)}</div></section>`);
  }
  const sb = extra.sandboxes && extra.sandboxes[s.n];
  if (SANDBOXES[sb]) out.push(`<section class="tool"><h2 class="panel-h">${esc(SANDBOXES[sb].name)}</h2><div id="sbHost" data-kind="${sb}"></div></section>`);
  const sv2 = v2 && v2.slides[String(s.n)];
  if (sv2 && ONPAGE[sv2.three]) out.push(`<section class="tool"><h2 class="panel-h">${esc(ONPAGE[sv2.three] || "3D")}</h2><p class="note">Drag the 3D scene on the page.</p><div class="pop-ctl"></div></section>`);
  const ti = extra.tryIt && extra.tryIt[s.n];
  if (ti) out.push(`<section class="tool"><h2 class="panel-h">Try it</h2>${tryItCard(ti)}</section>`);
  return out.join("");
}

function wireTools(s) {
  if (orbit) { orbit.destroy(); orbit = null; }
  const host = $("sbHost"); if (host) orbit = SANDBOXES[host.dataset.kind].mount(host);
  const rb = $("tools").querySelector("[data-reveal]");
  if (rb) rb.addEventListener("click", () => {
    const box = rb.parentElement.nextElementSibling; const open = box.hidden;
    box.hidden = !open; rb.setAttribute("aria-expanded", String(open)); rb.textContent = open ? "Hide the answer" : "Show the answer";
  });
}

function markOptions(s) {
  const picked = answered.get(s.n);
  for (const b of stage.querySelectorAll(".ac-opt")) {
    b.dataset.state = picked && picked.opt === b.dataset.opt ? (picked.ok ? "right" : "wrong") : "";
    b.setAttribute("aria-pressed", String(!!picked && picked.opt === b.dataset.opt));
  }
}

function show(n, dir = 0) {
  const total = deck.slides.length;
  page = Math.max(1, Math.min(total, n));
  const s = deck.slides[page - 1];
  const choice = extra.choices && extra.choices[s.n];
  const sv = v2 && v2.slides[String(s.n)];
  if (sv && dir && !reduceMotion()) flipSheet(dir);
  stage.style.backgroundImage = s.bg ? `url("${base}${s.bg}")` : "";
  if (sv) {
    const textOnly = { ...s, items: s.items.filter((i) => i.t !== "img") };
    stage.innerHTML = inkVars(renderSlide(textOnly, { base, options: !!s.answer, choices: choice ? choice.options : null }));
    stage.classList.add("v2");
  } else { stage.classList.remove("v2"); stage.innerHTML = renderSlide(s, { base, options: !!s.answer, choices: choice ? choice.options : null }); }
  stage.setAttribute("aria-label", `Page ${page} of ${total}: ${boxText(s.items.find((i) => i.t === "text") || { p: [] }).join(" ")}`);
  for (const b of stage.querySelectorAll(".ac-opt")) b.addEventListener("click", () => {
    const opt = b.dataset.opt, ok = choice ? opt === choice.answer : opt === s.answer;
    answered.set(s.n, { opt, ok }); markOptions(s);
    if (fxh && fxh.guess) fxh.guess();
    $("tools").innerHTML = renderTools(s); wireTools(s);
  });
  markOptions(s);
  stage.classList.remove("turn-next", "turn-prev", "pop-skip");
  if (sv) popPage(s, sv);
  else if (dir && !reduceMotion()) { void stage.offsetWidth; stage.classList.add(dir > 0 ? "turn-next" : "turn-prev"); }
  $("pageLabel").textContent = `Page ${page} of ${total}`;
  $("prevBtn").disabled = page === 1; $("nextBtn").disabled = page === total;
  $("scrub").max = total; $("scrub").value = page;
  $("readText").innerHTML = sv && sv.text ? `<div class="rich">${sv.text}</div>` : readableHtml(s);
  narrator.load(meta.slug, s.n, $("readText"));
  $("tools").innerHTML = renderTools(s); wireTools(s);
  for (const b of document.querySelectorAll("#tocList button")) b.setAttribute("aria-current", String(+b.dataset.page === page));
  store.set(PAGE_KEY, String(page));
  history.replaceState(null, "", pageUrl());
  $("panelBody").scrollTop = 0;
  // warm the next page's art
  const nx = deck.slides[page];
  if (nx) for (const it of nx.items) if (it.t === "img") { const im = new Image(); im.src = base + it.src; }
}

// Dark paper recolors the words (cream ink, gold and blue accents); the art is never recolored.
function inkVars(html) {
  return html.replace(/color:(#[0-9a-fA-F]{6})/g, (m, c) => `--lc:${c};--dc:${darkInk(c) || c}`);
}
// Labels write on letter by letter after the art (0.2s stagger order: background, main object, labels).
function writeOn(start) {
  let i = 0;
  const walk = (el) => {
    for (const n of [...el.childNodes]) {
      if (n.nodeType === 3 && n.nodeValue.trim()) {
        const f = document.createDocumentFragment();
        for (const w of n.nodeValue.split(/(\s+)/)) {
          if (!w) continue;
          if (/^\s+$/.test(w)) { f.appendChild(document.createTextNode(w)); continue; }
          const sp = document.createElement("span"); sp.className = "wo"; sp.textContent = w; sp.style.setProperty("--wi", i); i += w.length; f.appendChild(sp);
        }
        n.replaceWith(f);
      } else if (n.nodeType === 1) walk(n);
    }
  };
  for (const tb of stage.querySelectorAll(".ac-tb")) walk(tb);
  // keep the whole write-on under about 1.2s however long the page text is, then pin every word visible
  const step = Math.min(14, 1200 / Math.max(1, i));
  stage.style.setProperty("--wo0", start + "s"); stage.style.setProperty("--wstep", step + "ms");
  stage.classList.remove("wo-done"); clearTimeout(writeOn.t);
  writeOn.t = setTimeout(() => stage.classList.add("wo-done"), (start * 1000) + i * step + 400);
}
// The curling sheet is opaque paper, so the next page never shows through the turning one.
function paperColor() {
  if (document.documentElement.dataset.theme === "dark") return "#1e2433";
  for (let el = stage; el; el = el.parentElement) { const c = getComputedStyle(el).backgroundColor; if (c && !/rgba\([^)]*,\s*0\)$|transparent/.test(c)) return c; }
  return "#fbf6ea";
}
function flipSheet(dir) {
  const old = $("stageWrap").querySelector(".flip-sheet"); if (old) old.remove();
  const sh = document.createElement("div");
  sh.className = "flip-sheet " + (dir > 0 ? "fwd" : "back");
  sh.setAttribute("aria-hidden", "true");
  sh.style.cssText = `background-color:${paperColor()};width:${stage.offsetWidth}px;height:${stage.offsetHeight}px;left:${stage.offsetLeft}px;top:${stage.offsetTop}px;background-image:${getComputedStyle(stage).backgroundImage};--u:${getComputedStyle(stage).getPropertyValue("--u")}`;
  const inner = stage.cloneNode(true); inner.removeAttribute("id"); inner.classList.add("flip-face"); inner.classList.remove("pop-entering");
  for (const c of inner.querySelectorAll("canvas")) c.remove();
  const snap = document.createElement("canvas"); snap.width = stage.offsetWidth; snap.height = stage.offsetHeight; snap.className = "flip-snap";
  if (popup) popup.snapshot(snap.getContext("2d"), snap.width, snap.height);
  for (const c of stage.querySelectorAll("canvas.pop-fx")) snap.getContext("2d").drawImage(c, 0, 0, snap.width, snap.height);
  inner.appendChild(snap); sh.appendChild(inner);
  $("stageWrap").appendChild(sh);
  // only the sheet's own curl ends it; the cloned page's write-on and sketch animations bubble up too
  sh.addEventListener("animationend", (e) => { if (e.target === sh) sh.remove(); });
  setTimeout(() => sh.remove(), 900);
}
function popPage(s, sv) {
  if (fxh) { fxh.destroy(); fxh = null; }
  const special = sv.three && webglReady() ? sv.three : null;
  const layers = special ? sv.layers.filter((l) => !l.replaced3d) : sv.layers;
  popup.show({ ...sv, layers }, { special, hero: webglReady() ? sv.hero : null, controls: specialControls(sv.three) });
  const nPop = sv.layers.filter((l) => !l.flat).length;
  const labelsAt = reduceMotion() ? 0 : Math.min(2.4, 0.2 * (nPop + 1) + 0.6);
  writeOn(labelsAt);
  fxh = mountFx(stage, sv.fx, sv.layers, reduceMotion() ? 0 : labelsAt);
  // a sketched Try it tab on pages with a sandbox
  const kind = sv.sandbox;
  if (kind && (SANDBOXES[kind] || ONPAGE[kind])) {
    const tab = document.createElement("button");
    tab.type = "button"; tab.className = "tryit-tab sketch";
    tab.textContent = ONPAGE[kind] ? "Try it: touch the 3D" : "Try it";
    tab.setAttribute("aria-label", ONPAGE[kind] ? `Try it: ${ONPAGE[kind]} on this page` : `Try it: open the ${SANDBOXES[kind].name}`);
    tab.addEventListener("click", (e) => { e.stopPropagation(); if (ONPAGE[kind]) { popup.skipEntry(); $("tools").querySelector(".pop-ctl input, .pop-ctl button")?.focus(); } else { sbKind = kind; setMode("sandbox"); } });
    stage.appendChild(tab);
  }
}
const webglReady = () => webglOk();
let ctlHtml = "";
function specialControls(kind) {
  const box = () => $("tools").querySelector(".pop-ctl");
  if (kind === "rings") return {
    onLevel(names, set) { setTimeout(() => { const b = box(); if (!b) return; b.innerHTML = `<label>Pull back: <b data-o="lv">${names[0]}</b><input type="range" min="0" max="5" step="0.01" value="0" data-k="lv"></label>`; const i = b.querySelector("input"); i.addEventListener("input", () => { set(+i.value); b.querySelector("b").textContent = names[Math.round(+i.value)]; }); this.setLevel = (v) => { i.value = v; b.querySelector("b").textContent = names[Math.round(v)]; }; }, 0); }
  };
  if (kind === "cannon") return {
    onCannon(setSpeed, fire) { setTimeout(() => { const b = box(); if (!b) return; b.innerHTML = `<label>Launch speed: <b>slow</b><input type="range" min="0.3" max="1" step="0.01" value="0.6"></label><div class="row"><button type="button">Launch</button></div>`; const i = b.querySelector("input"); i.addEventListener("input", () => { setSpeed(+i.value); b.querySelector("b").textContent = +i.value >= 0.99 ? "orbital" : +i.value > 0.7 ? "fast" : "slow"; }); b.querySelector("button").addEventListener("click", fire); }, 0); }
  };
  if (kind === "seasons") return { onAngle() {} };
  return null;
}
function buildSbMenu() {
  const btn = $("sbMenuBtn"), list = $("sbMenu");
  if (!v2) { btn.hidden = true; return; }
  const rows = [];
  for (const [n, sv] of Object.entries(v2.slides)) {
    if (sv.sandbox && (SANDBOXES[sv.sandbox] || ONPAGE[sv.sandbox])) rows.push(`<li><button type="button" data-go="${n}" data-sb="${SANDBOXES[sv.sandbox] && !ONPAGE[sv.sandbox] ? sv.sandbox : ""}"><span class="n">${n}</span>${esc(SANDBOXES[sv.sandbox] ? SANDBOXES[sv.sandbox].name : ONPAGE[sv.sandbox])}</button></li>`);
  }
  for (const [n, key] of Object.entries(extra.tryIt || {})) if (MODULES[key]) {
    const p = forwardStudyQuery(location.search); p.set("story", `${meta.slug}-${n}`);
    rows.push(`<li><a href="${esc(MODULES[key].file)}?${esc(p.toString())}"><span class="n">${n}</span>Try it: ${esc(MODULES[key].name)}</a></li>`);
  }
  list.innerHTML = `<h2 class="panel-h">Sandboxes and Try it</h2><ol>${rows.join("")}</ol>`;
  btn.hidden = !rows.length;
  btn.addEventListener("click", () => { const open = list.hidden; list.hidden = !open; btn.setAttribute("aria-expanded", String(open)); });
  list.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-go]"); if (!b) return;
    list.hidden = true; btn.setAttribute("aria-expanded", "false");
    if (mode === "sandbox") setMode("story");
    const n = +b.dataset.go; show(n, Math.sign(n - page));
    if (b.dataset.sb) { sbKind = b.dataset.sb; setMode("sandbox"); }
  });
  addEventListener("keydown", (e) => { if (e.key === "Escape" && !list.hidden) { list.hidden = true; btn.setAttribute("aria-expanded", "false"); btn.focus(); } });
}

function buildToc() {
  const rows = [];
  deck.slides.forEach((s, i) => {
    const words = boxText(s.items.find((it) => it.t === "text") || { p: [] }).join(" ").trim();
    const second = s.items.filter((it) => it.t === "text")[1];
    const head = /^(PART|HOOK|CHECK|EXIT|LEARNING|EARTH)/.test(words) && second ? `${words}: ${boxText(second).join(" ")}` : words;
    rows.push(`<li><button type="button" data-page="${i + 1}"><span class="n">${i + 1}</span>${esc(head.slice(0, 70))}</button></li>`);
  });
  $("tocList").innerHTML = rows.join("");
  $("tocList").addEventListener("click", (e) => { const b = e.target.closest("button[data-page]"); if (b) { const n = +b.dataset.page; show(n, Math.sign(n - page)); } });
}

function setMode(m) {
  mode = m;
  story.dataset.mode = m; document.body.classList.toggle("sbmode", m === "sandbox");
  $("sandboxBtn").setAttribute("aria-pressed", String(m === "sandbox"));
  const sb = $("sandboxBtn");
  if (m === "sandbox") {
    sb.innerHTML = '<span class="sb-long">Back to the story</span><span class="sb-short" aria-hidden="true">\u2190 Story</span>';
    sb.setAttribute("aria-label", "Back to the story");
  } else { sb.textContent = "Sandbox"; sb.removeAttribute("aria-label"); }
  const sbs = $("sandboxStage");
  if (m === "sandbox") {
    if (orbit) { orbit.destroy(); orbit = null; }
    if (popup) popup.dispose();
    narrator.stop();
    if (fxh) { fxh.destroy(); fxh = null; }
    const kinds = sandboxKinds();
    if (!kinds.includes(sbKind)) sbKind = kinds[0];
    sbs.hidden = false;
    $("readBox").hidden = true;
    const pick = kinds.length > 1 ? `<div class="row" role="group" aria-label="Sandbox">${kinds.map((k) => `<button type="button" data-sb="${k}" aria-pressed="${k === sbKind}">${esc(SANDBOXES[k].name.replace(/ sandbox$/, ""))}</button>`).join("")}</div>` : "";
    $("tools").innerHTML = `<section class="tool"><h2 class="panel-h">${esc(SANDBOXES[sbKind].name)}</h2><p class="note">Free play. The sandboxes from this storybook, without the pages.</p>${pick}<div id="sbHost"></div></section>`;
    for (const b of $("tools").querySelectorAll("[data-sb]")) b.addEventListener("click", () => { sbKind = b.dataset.sb; setMode("sandbox"); });
    orbit = SANDBOXES[sbKind].mount($("sbHost"));
    const cv = $("sbHost").querySelector("canvas");
    sbs.innerHTML = ""; sbs.appendChild(cv);
    history.replaceState(null, "", pageUrl());
  } else {
    sbs.hidden = true; sbs.innerHTML = "";
    $("readBox").hidden = false;
    show(page);
  }
  fit();
}

function go(d) { const n = page + d; if (n >= 1 && n <= deck.slides.length) show(n, d); }
$("prevBtn").addEventListener("click", () => go(-1));
$("nextBtn").addEventListener("click", () => go(1));
$("scrub").addEventListener("input", (e) => { const n = +e.target.value; show(n, Math.sign(n - page)); });
$("sandboxBtn").addEventListener("click", () => setMode(mode === "sandbox" ? "story" : "sandbox"));
addEventListener("keydown", (e) => {
  if (mode !== "story" || e.target.closest("input, select, textarea")) return;
  if (e.key === "ArrowRight" || e.key === "PageDown") { go(1); e.preventDefault(); }
  else if (e.key === "ArrowLeft" || e.key === "PageUp") { go(-1); e.preventDefault(); }
  else if (e.key === "Home") show(1, -1);
  else if (e.key === "End") show(deck.slides.length, 1);
});
// swipe to turn pages
let sx = null, sy = 0;
stage.addEventListener("pointerdown", (e) => { if (e.pointerType !== "mouse") { sx = e.clientX; sy = e.clientY; } });
stage.addEventListener("pointerup", (e) => {
  if (sx == null || stage.dataset.dragging) { sx = null; return; } const dx = e.clientX - sx, dy = e.clientY - sy; sx = null;
  if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4 && mode === "story") go(dx < 0 ? 1 : -1);
});
addEventListener("resize", fit);

(async function init() {
  const res = await fetch(base + "deck.json");
  deck = await res.json();
  try { const r2 = await fetch(base + "v2/story.json"); if (r2.ok) v2 = await r2.json(); } catch (e) { v2 = null; }
  if (v2) {
    // v2 sandboxes come from the deck's spec (story.json); Try it link-outs stay from EXTRAS.
    const sbs = {}; for (const [n, sv] of Object.entries(v2.slides)) if (sv.sandbox && SANDBOXES[sv.sandbox]) sbs[n] = sv.sandbox;
    extra = { ...extra, sandboxes: sbs };
    popup = createPopup({ stage, base });
    story.dataset.v2 = "1"; document.body.classList.add("v2");
    const tilt = $("tiltBtn");
    if (matchMedia("(pointer: coarse)").matches && "DeviceOrientationEvent" in window && !reduceMotion()) {
      tilt.hidden = false;
      tilt.addEventListener("click", async () => { const ok = await popup.enableTilt(); tilt.setAttribute("aria-pressed", String(ok)); tilt.textContent = ok ? "Tilt on" : "Tilt off"; });
    }
    stage.addEventListener("pop-pulse", () => fxh && fxh.pulse());
  }
  buildSbMenu();
  $("sandboxBtn").hidden = !hasSandbox();
  if (!hasSandbox() && mode === "sandbox") mode = "story";
  buildToc();
  const want = +params.get("page") || +store.get(PAGE_KEY) || 1;
  page = Math.max(1, Math.min(deck.slides.length, want));
  setMode(mode);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
})();
