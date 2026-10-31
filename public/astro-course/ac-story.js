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

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const meta = DECKS.find((d) => d.slug === params.get("deck") && d.built) || DECKS.find((d) => d.built);
const extra = EXTRAS[meta.slug] || { sandboxes: {}, tryIt: {}, choices: {} };
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
  dose: { name: "Radiation dose sandbox", mount: (h) => mountDose(h) }
};
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
  stage.style.backgroundImage = s.bg ? `url("${base}${s.bg}")` : "";
  stage.innerHTML = renderSlide(s, { base, options: !!s.answer, choices: choice ? choice.options : null });
  stage.setAttribute("aria-label", `Page ${page} of ${total}: ${boxText(s.items.find((i) => i.t === "text") || { p: [] }).join(" ")}`);
  for (const b of stage.querySelectorAll(".ac-opt")) b.addEventListener("click", () => {
    const opt = b.dataset.opt, ok = choice ? opt === choice.answer : opt === s.answer;
    answered.set(s.n, { opt, ok }); markOptions(s);
    $("tools").innerHTML = renderTools(s); wireTools(s);
  });
  markOptions(s);
  stage.classList.remove("turn-next", "turn-prev");
  if (dir && !reduceMotion()) { void stage.offsetWidth; stage.classList.add(dir > 0 ? "turn-next" : "turn-prev"); }
  $("pageLabel").textContent = `Page ${page} of ${total}`;
  $("prevBtn").disabled = page === 1; $("nextBtn").disabled = page === total;
  $("scrub").max = total; $("scrub").value = page;
  $("readText").innerHTML = readableHtml(s);
  $("tools").innerHTML = renderTools(s); wireTools(s);
  for (const b of document.querySelectorAll("#tocList button")) b.setAttribute("aria-current", String(+b.dataset.page === page));
  store.set(PAGE_KEY, String(page));
  history.replaceState(null, "", pageUrl());
  $("panelBody").scrollTop = 0;
  // warm the next page's art
  const nx = deck.slides[page];
  if (nx) for (const it of nx.items) if (it.t === "img") { const im = new Image(); im.src = base + it.src; }
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
  story.dataset.mode = m;
  $("sandboxBtn").setAttribute("aria-pressed", String(m === "sandbox"));
  const sb = $("sandboxBtn");
  if (m === "sandbox") {
    sb.innerHTML = '<span class="sb-long">Back to the story</span><span class="sb-short" aria-hidden="true">\u2190 Story</span>';
    sb.setAttribute("aria-label", "Back to the story");
  } else { sb.textContent = "Sandbox"; sb.removeAttribute("aria-label"); }
  const sbs = $("sandboxStage");
  if (m === "sandbox") {
    if (orbit) { orbit.destroy(); orbit = null; }
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
  if (sx == null) return; const dx = e.clientX - sx, dy = e.clientY - sy; sx = null;
  if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) go(dx < 0 ? 1 : -1);
});
addEventListener("resize", fit);

(async function init() {
  const res = await fetch(base + "deck.json");
  deck = await res.json();
  $("sandboxBtn").hidden = !hasSandbox();
  if (!hasSandbox() && mode === "sandbox") mode = "story";
  buildToc();
  const want = +params.get("page") || +store.get(PAGE_KEY) || 1;
  page = Math.max(1, Math.min(deck.slides.length, want));
  setMode(mode);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
})();
