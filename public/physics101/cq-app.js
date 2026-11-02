// Physics 101 Custom Quiz: builder (side panel on desktop, bottom sheet on mobile, over the library),
// player (one question per page) and results (marked paper). Questions are the existing Study Questions
// cards by id (sq-core renderItem): same art packs, draggables and worked-solution expander.
// Answers stay hidden while quizzing; the review pass shows them, Show answer scribble and all.
import { DECKS } from "./p101-catalog.js";
import { renderItem } from "./sq-core.js";
import { reduceMotion } from "../astro-course/ac-common.js";
import * as Q from "./cq-core.js";
import { accountProfile, saveSession } from "./cq-account.js";

const ROOT = new URL("../", import.meta.url).href;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const LS = localStorage, PROFILE_KEY = "p101.customQuiz.profile";
// Leo's Custom Quiz studio art: one pack (custom-quiz/custom-quiz-ui.json, {id: {light, dark}}), fetched once.
// Dark falls back to light for currentColor icons. <text> slots are filled with live labels and numbers.
const PACK = await fetch(ROOT + "physics101/custom-quiz/custom-quiz-ui.json").then((r) => (r.ok ? r.json() : {})).catch(() => ({}));
let uid = 0;
function art(id, texts = [], cls = "") {
  const a = PACK[id]; if (!a) return "";
  const dark = document.documentElement.getAttribute("data-theme") === "dark";
  let k = 0, svg = (dark && a.dark) || a.light;
  svg = svg.replace(/<title>[^<]*<\/title>/, "").replace(/ role="img" aria-label="[^"]*"/, ` aria-hidden="true" focusable="false" class="cq-art art-${id} ${cls}"`)
    .replace(/(<text[^>]*>)([^<]*)(<\/text>)/g, (m, o, t, c) => (k < texts.length ? o + esc(texts[k++] ?? t) + c : (k++, m)));
  const u = ++uid; return svg.replace(/id="([^"]+)"/g, `id="$1-u${u}"`).replace(/url\(#([^)]+)\)/g, `url(#$1-u${u})`);
}
const INDEX = await (await fetch(ROOT + "physics101/sq/index.json")).json();
const MODS = [...new Set(DECKS.map((d) => d.q))].sort((a, b) => a - b).map((q) => ({ q, name: DECKS.find((d) => d.q === q).module, lessons: DECKS.filter((d) => d.q === q) }));
const avail = (u) => Q.unitIds(u, INDEX, DECKS).length;
const short = (u) => { const m = /^m(\d+)$/.exec(u); if (m) return `Module ${m[1]}`; const d = DECKS.find((x) => x.slug === u); return d ? d.title : u; };
const local = () => { try { return JSON.parse(LS.getItem(PROFILE_KEY) || "null"); } catch (e) { return null; } };

let st = { units: [], weights: {}, count: 10, all: false, name: "" };
let panel, scrim, opener, quiz = null;

export function open(btn) {
  opener = btn;
  if (!panel) build();
  scrim.hidden = false; requestAnimationFrame(() => scrim.classList.add("on"));
  document.body.classList.add("cq-lock");
  builder(); panel.focus();
}
function close() {
  scrim.classList.remove("on"); document.body.classList.remove("cq-lock");
  setTimeout(() => { scrim.hidden = true; }, reduceMotion() ? 0 : 220);
  opener && opener.focus();
}
function build() {
  scrim = document.createElement("div"); scrim.className = "cq-scrim"; scrim.hidden = true;
  scrim.innerHTML = `<aside class="cq-panel" role="dialog" aria-modal="true" aria-labelledby="cqTitle" tabindex="-1">
    <header class="cq-top"><span class="cq-grip" aria-hidden="true"></span><h2 id="cqTitle">Custom Quiz</h2><button type="button" class="cq-x" aria-label="Close Custom Quiz">\u2715</button></header>
    <div class="cq-body"></div><footer class="cq-foot"></footer></aside>`;
  document.body.appendChild(scrim);
  panel = scrim.querySelector(".cq-panel");
  scrim.querySelector(".cq-x").addEventListener("click", close);
  scrim.addEventListener("click", (e) => { if (e.target === scrim) close(); });
  scrim.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
}
const body = () => panel.querySelector(".cq-body"), foot = () => panel.querySelector(".cq-foot");
const title = (t) => { panel.querySelector("#cqTitle").textContent = t; };

// ---------------- builder ----------------
async function builder() {
  title("Custom Quiz"); panel.dataset.view = "builder"; body().className = "cq-body cq-card";
  const presets = Q.loadPresets(LS), prof = (await accountProfile()) || local();
  const weak = Q.weakAreas(prof), flagged = prof?.flagged || [];
  body().innerHTML = `
    ${presets.length ? `<section class="cq-sec"><h3>Saved quizzes</h3><ul class="cq-stubs">${presets.map((p) => `<li class="cq-stub${p.last ? " last" : ""}" data-name="${esc(p.name)}" style="--acc:var(--p101-m${(p.units[0] || "m1").match(/\d+/)[0] * 1})">
      <span class="cq-eraser">${art("cq-eraser-swipe")}</span><button type="button" class="cq-stub-go" aria-label="${esc(p.name)}${p.last ? ", last used" : ""}">${art("cq-stub", [p.name.length > 16 ? p.name.slice(0, 15) + "\u2026" : p.name, `${p.all ? "All" : p.count} Qs, ${p.units.length} pick${p.units.length === 1 ? "" : "s"}`, p.last ? "last" : ""], p.last ? "last" : "")}${p.last ? `<span class="cq-star">${art("cq-star-lastused")}</span>` : ""}</button>
      <button type="button" class="cq-stub-del" aria-label="Erase ${esc(p.name)}">erase</button></li>`).join("")}</ul></section>` : ""}
    ${weak.length || flagged.length ? `<section class="cq-sec cq-mine"><h3>For you</h3>
      ${weak.length ? `<p class="cq-note">Weak areas:</p><div class="cq-badges">${weak.map((w) => `<button type="button" class="cq-badge" data-unit="${w.slug}">${art("cq-badge-weak")}<span>${esc(short(w.slug))}</span></button>`).join("")}</div>` : ""}
      ${heatRows(prof)}
      ${flagged.length ? `<button type="button" class="cq-flagged cq-artbtn" aria-label="Return to ${flagged.length} flagged question${flagged.length === 1 ? "" : "s"}">${art("cq-stub-flagged", ["Return later", titleOf(flagged[0]).slice(0, 18), String(flagged.length), "left"])}</button>` : ""}</section>` : ""}
    <div class="cq-empty" id="cqEmpty">${art("cq-empty-pick")}</div><section class="cq-sec"><h3>1. Pick modules or lessons</h3><ul class="cq-mods">${MODS.map((m) => `<li class="cq-mod" style="--acc:var(--p101-m${m.q})">
      <label class="cq-pick cq-whole"><input type="checkbox" data-unit="m${m.q}"><span class="cq-box">${art("cq-tickbox")}</span><span>M${m.q} ${esc(m.name)} <em>whole module</em></span></label>
      <ul>${m.lessons.map((d) => `<li><label class="cq-pick"><input type="checkbox" data-unit="${d.slug}"><span class="cq-box">${art("cq-tickbox")}</span><span>L${d.lesson} ${esc(d.title)} <em>${avail(d.slug)}</em></span></label></li>`).join("")}</ul></li>`).join("")}</ul></section>
    <section class="cq-sec"><h3>2. How many</h3><div class="cq-size"><span class="cq-slide">${art("cq-slider")}<input type="range" id="cqCount" min="1" max="50" aria-label="Number of questions"></span><output id="cqCountOut"></output>
      <label class="cq-pick cq-useall"><input type="checkbox" id="cqAll"><span class="cq-toggle">${art("cq-toggle-useall")}</span><span>Use all</span></label></div></section>
    <section class="cq-sec"><h3>3. Mix</h3><button type="button" class="cq-artbtn" id="cqBal" aria-label="Balance evenly">${art("cq-balance-btn")}</button><ul class="cq-weights" id="cqWeights"></ul><div class="cq-notes" id="cqNotes" aria-live="polite"></div></section>`;
  foot().innerHTML = `<label class="cq-name"><span class="sr-only">Quiz name</span><input id="cqName" placeholder="Name this quiz" maxlength="40"></label><button type="button" class="cq-btn" id="cqSave">Save ticket</button><button type="button" class="cq-startbar" id="cqStart"></button>`;
  const B = body();
  for (const i of B.querySelectorAll(".cq-mods input")) i.addEventListener("change", () => {
    let u = st.units.filter((x) => x !== i.dataset.unit); if (i.checked) u.push(i.dataset.unit);
    setUnits(Q.normalizeScope(u, DECKS));
  });
  B.querySelector("#cqCount").addEventListener("input", (e) => { st.count = +e.target.value; refresh(); });
  B.querySelector("#cqAll").addEventListener("change", (e) => { st.all = e.target.checked; refresh(); });
  B.querySelector("#cqBal").addEventListener("click", () => { st.weights = Q.balance(st.units); refresh(); });
  for (const b of B.querySelectorAll(".cq-badge")) b.addEventListener("click", () => setUnits(Q.normalizeScope([...st.units, b.dataset.unit], DECKS)));
  B.querySelector(".cq-flagged")?.addEventListener("click", () => startIds(flagged));
  for (const li of B.querySelectorAll(".cq-stub")) {
    const name = li.dataset.name, p = presets.find((x) => x.name === name);
    li.querySelector(".cq-stub-go").addEventListener("click", () => { st = { ...st, ...p }; Q.markUsed(LS, name); setUnits(p.units, p.weights); });
    const del = () => { li.classList.add("erasing"); setTimeout(() => { Q.deletePreset(LS, name); builder(); }, reduceMotion() ? 0 : 300); };
    li.querySelector(".cq-stub-del").addEventListener("click", del);
    let x0 = null; // swipe left to erase
    li.addEventListener("pointerdown", (e) => { x0 = e.clientX; });
    li.addEventListener("pointerup", (e) => { if (x0 != null && x0 - e.clientX > 70) del(); x0 = null; });
  }
  $("cqName").value = st.name || "";
  $("cqSave").addEventListener("click", () => {
    if (!st.units.length) return note("Pick at least one module or lesson first.");
    const name = $("cqName").value.trim() || `Quiz ${new Date().toLocaleDateString()}`;
    st.name = name; Q.savePreset(LS, { name, units: st.units, weights: st.weights, count: st.count, all: st.all }); builder();
  });
  $("cqStart").addEventListener("click", () => start());
  setUnits(st.units, st.weights);
}
const $ = (id) => panel.querySelector("#" + id);
function note(t) { $("cqNotes").innerHTML = `<p class="cq-pencil">${esc(t)}</p>`; }
function setUnits(units, weights) {
  st.units = units;
  st.weights = weights && units.every((u) => u in weights) ? Q.normalizeWeights(weights, units) : Q.balance(units);
  for (const i of body().querySelectorAll(".cq-mods input")) {
    const u = i.dataset.unit, m = /^m(\d+)$/.test(u) ? null : "m" + DECKS.find((d) => d.slug === u).q;
    i.checked = units.includes(u) || (m && units.includes(m)); i.disabled = !!(m && units.includes(m));
  }
  refresh();
}
// Leo's slider: the .cq-knob pencil rides the rail from x=14 to x=306 under a transparent native range.
function knob(sl) {
  const r = sl.querySelector("input"), k = sl.querySelector(".cq-knob"); if (!k) return;
  const base = k.getAttribute("data-base") || k.getAttribute("transform"); k.setAttribute("data-base", base);
  const move = () => { const f = (r.value - r.min) / ((r.max - r.min) || 1), x = 14 + f * 292; k.setAttribute("transform", base.replace(/translate\(([\d.]+) /, `translate(${x.toFixed(1)} `)); };
  r.addEventListener("input", move); move();
}
function plan() {
  const av = Object.fromEntries(st.units.map((u) => [u, avail(u)])), cap = Object.values(av).reduce((t, x) => t + x, 0);
  return { ...Q.allocate(st.units, st.weights, st.all ? cap : st.count, av), cap, av };
}
function refresh() {
  if (!$("cqWeights")) return;
  const p = plan(), c = $("cqCount");
  c.max = Math.max(1, Math.min(60, p.cap || 50)); c.value = Math.min(st.count, +c.max); c.disabled = st.all; st.count = +c.value;
  $("cqCountOut").textContent = st.all ? `all ${p.cap}` : `${st.count}`; $("cqAll").checked = st.all;
  $("cqWeights").innerHTML = st.units.map((u) => `<li style="--acc:var(--p101-m${+(u.match(/\d+/)[0])})"><label><span class="cq-w-name">${esc(short(u))}</span>
    <span class="cq-slide">${art("cq-slider")}<input type="range" min="0" max="100" value="${st.weights[u]}" data-unit="${u}" aria-label="${esc(short(u))} share"></span><output>${st.weights[u]}%</output></label>
    <span class="cq-tally">${p.take[u] || 0} question${p.take[u] === 1 ? "" : "s"}</span></li>`).join("") || "";
  $("cqEmpty").hidden = st.units.length > 0;
  for (const sl of panel.querySelectorAll(".cq-slide")) knob(sl);
  for (const r of $("cqWeights").querySelectorAll("input")) r.addEventListener("change", () => { st.weights = Q.setWeight(st.weights, r.dataset.unit, +r.value); refresh(); $("cqWeights").querySelector(`[data-unit="${r.dataset.unit}"]`)?.focus(); });
  $("cqNotes").innerHTML = p.notes.map((n) => `<div class="cq-clamp" role="note"><span class="sr-only">${esc(short(n.unit))}: only ${n.available} available.</span>${art("cq-clamp-note", ["!", `Only ${n.available} in ${short(n.unit).length > 20 ? short(n.unit).slice(0, 19) + "\u2026" : short(n.unit)}`, "The rest went to your other picks."])}</div>`).join("")
    + (!st.all && p.cap && st.count > p.cap ? `<p class="cq-pencil">Only ${p.cap} questions in this pick.</p>` : "");
  $("cqStart").innerHTML = art("cq-btn-start", [`Start quiz (${p.total})`]); $("cqStart").setAttribute("aria-label", `Start quiz (${p.total})`); $("cqStart").disabled = !p.total;
}

// ---------------- player ----------------
function start(seed = Date.now(), avoid) {
  const p = plan(); if (!p.total) return;
  const list = Q.draw(st.units, p.take, INDEX, DECKS, seed, avoid);
  run(list, { units: st.units, name: st.name });
}
function startIds(ids) {
  const where = {}; for (const [slug, v] of Object.entries(INDEX)) for (const [id] of v.t || []) where[id] = slug;
  run(ids.filter((id) => where[id]).map((id) => ({ id, slug: where[id], unit: where[id] })), { units: ["flagged"], name: "Flagged" });
}
function run(list, meta) {
  quiz = { list, meta, i: 0, answers: list.map((x) => ({ id: x.id, slug: x.slug, result: "skipped", how: null, flag: false, viewed: false, interacted: false })), review: false };
  page();
}
function dots() {
  return `<ol class="cq-dots" aria-label="Progress">${quiz.answers.map((a, k) => `<li><button type="button" class="cq-dot ${k === quiz.i ? "now" : ""} ${a.result}${a.flag ? " flag" : ""}" data-k="${k}" aria-label="Question ${k + 1}${a.flag ? ", flagged" : ""}${k === quiz.i ? ", current" : ""}"></button></li>`).join("")}</ol>`;
}
async function page() {
  const q = quiz, a = q.answers[q.i], x = q.list[q.i];
  body().className = "cq-body"; title(q.review ? "Review" : `Question ${q.i + 1} of ${q.list.length}`); panel.dataset.view = q.review ? "review" : "player";
  body().innerHTML = `${dots()}<div class="cq-corner"><button type="button" class="cq-icon-btn" id="cqFlag" aria-pressed="${a.flag}">${art("cq-icon-flag")}<span>${a.flag ? "Flagged" : "Flag"}</span></button>${q.review ? "" : `<button type="button" class="cq-icon-btn" id="cqSkip">${art("cq-icon-skip")}<span>Skip</span></button>`}</div><div class="cq-card ${q.review ? "cq-reviewing" : "cq-quizzing"}" id="cqCard"><p class="cq-note">Loading\u2026</p></div>`;
  for (const d of body().querySelectorAll(".cq-dot")) d.addEventListener("click", () => { q.i = +d.dataset.k; page(); });
  $("cqFlag").addEventListener("click", () => { a.flag = !a.flag; page(); });
  $("cqSkip")?.addEventListener("click", () => { a.result = "skipped"; a.how = null; next(); });
  const r = await renderItem(x.slug, x.id, q.i + 1, { rich: q.review }), host = $("cqCard"); if (!host || q.list[q.i] !== x) return;
  host.innerHTML = ""; a.viewed = true;
  if (!r) { host.innerHTML = `<p class="cq-note">This question could not load.</p>`; }
  else {
    host.appendChild(r.el);
    host.addEventListener("pointerdown", () => { a.interacted = true; }, { once: true });
    host.addEventListener("keydown", () => { a.interacted = true; }, { once: true });
    if (q.review) { const cv = host.querySelector(".sq-cover svg"); if (cv && PACK["cq-reveal-scribble"]) cv.outerHTML = art("cq-reveal-scribble", [""]); host.insertAdjacentHTML("afterbegin", `<p class="cq-mark ${a.result}">${a.result === "right" ? "\u2713 Got it" : a.result === "wrong" ? "\u2717 Missed" : "Skipped"}${a.how === "self" ? " (self-graded)" : a.how === "auto" ? " (checked)" : ""}</p>`); }
  }
  grader(r && r.item, a);
}
function grader(item, a) {
  const q = quiz, key = Q.answerKey(item), last = q.i === q.list.length - 1;
  if (q.review) {
    foot().innerHTML = `<button type="button" class="cq-btn" id="cqPrev" ${q.i ? "" : "disabled"}>Back</button><button type="button" class="cq-btn cq-go" id="cqNext">${reviewNext() == null ? "Results" : "Next"}</button>`;
    $("cqPrev").addEventListener("click", () => { q.i--; page(); });
    $("cqNext").addEventListener("click", () => { const n = reviewNext(); if (n == null) results(); else { q.i = n; page(); } });
    return;
  }
  foot().innerHTML = key
    ? `<label class="cq-resp"><span>Your answer</span><input id="cqResp" inputmode="${key.type === "number" ? "decimal" : "text"}" autocomplete="off"></label><button type="button" class="cq-btn cq-go" id="cqCheck">Check</button>`
    : `<span class="cq-self-tag" title="No answer key for this question yet, so you mark it yourself">${art("cq-badge-selfgrade")}<span class="sr-only">Self-graded: no answer key yet, you mark it</span></span><button type="button" class="cq-btn ${a.result === "wrong" ? "on" : ""}" id="cqNo">Not yet</button><button type="button" class="cq-btn cq-go ${a.result === "right" ? "on" : ""}" id="cqYes">${art("cq-mark-check", [], "cq-chk")}I got it</button>`;
  const mark = (res, how) => { a.result = res; a.how = how; a.interacted = true; last ? results() : next(); };
  if (key) $("cqCheck").addEventListener("click", () => { const ok = Q.autoCheck(key, $("cqResp").value); if (ok == null) return; mark(ok ? "right" : "wrong", "auto"); });
  else { $("cqNo").addEventListener("click", () => mark("wrong", "self")); $("cqYes").addEventListener("click", () => mark("right", "self")); }
}
function next() { if (quiz.i < quiz.list.length - 1) { quiz.i++; page(); } else results(); }
function reviewNext() { const q = quiz; for (let k = q.i + 1; k < q.list.length; k++) if (!q.reviewOnly || q.reviewOnly.has(k)) return k; return null; }

// ---------------- results ----------------
let saved = null;
async function results() {
  const q = quiz, s = Q.score(q.answers); q.review = false; body().className = "cq-body"; title("Results"); panel.dataset.view = "results";
  if (!q.recorded) {
    q.recorded = true; const rec = Q.sessionRecord(q.meta, q.answers);
    LS.setItem(PROFILE_KEY, JSON.stringify(Q.mergeProfile(local(), rec)));
    saved = saveSession(rec);
  }
  const C = 389.6, frac = q.answers.length ? s.right / q.answers.length : 0;
  body().innerHTML = `<div class="cq-paper"><div class="cq-paper-art">${art("cq-marked-paper", [q.meta.name || "Custom Quiz", `${s.right}/${s.total}`, s.missed.length ? "Check the missed ones in review." : "Clean sheet!"])}</div>
    <div class="cq-score" role="img" aria-label="${s.right} of ${s.total} right"><svg viewBox="0 0 160 160" aria-hidden="true"><circle cx="80" cy="80" r="62" class="cq-ring"/><circle cx="80" cy="80" r="62" class="cq-ring-on" style="stroke-dasharray:${C};stroke-dashoffset:${(C * (1 - frac)).toFixed(1)}"/></svg>
      <span class="cq-score-n">${s.right}/${s.total}<small>${s.pct}%</small></span></div>
    <p class="cq-note">${s.pct}%${s.flagged.length ? ` \u00b7 ${s.flagged.length} flagged` : ""}${q.answers.some((a) => a.how === "self") ? " \u00b7 self-graded questions marked by you" : ""}</p>
    <p class="cq-note" id="cqSaved"></p>
    <ol class="cq-marks">${q.answers.map((a, k) => `<li><button type="button" data-k="${k}" class="${a.result}"><span class="cq-pen">${a.result === "right" ? art("cq-mark-check") : art("cq-mark-x")}</span><span class="sr-only">${a.result === "right" ? "Right" : a.result === "wrong" ? "Missed" : "Skipped"}: </span><span>${k + 1}. ${esc(titleOf(a.id))}</span>${a.flag ? `<span class="cq-flagmark">flagged</span>` : ""}</button></li>`).join("")}</ol></div>`;
  foot().innerHTML = `<button type="button" class="cq-btn" id="cqBuild">Edit quiz</button><button type="button" class="cq-artbtn" id="cqTicket" aria-label="Save as ticket">${art("cq-btn-save")}</button><button type="button" class="cq-artbtn" id="cqRetry" aria-label="Retry with new mix">${art("cq-btn-retry")}</button><button type="button" class="cq-artbtn" id="cqMissed" aria-label="Review missed" ${s.missed.length ? "" : "disabled"}>${art("cq-btn-review")}</button>`;
  for (const b of body().querySelectorAll(".cq-marks button")) b.addEventListener("click", () => { q.review = true; q.reviewOnly = null; q.i = +b.dataset.k; page(); });
  $("cqMissed").addEventListener("click", () => { const ks = q.answers.map((a, k) => (a.result !== "right" ? k : -1)).filter((k) => k >= 0); q.review = true; q.reviewOnly = new Set(ks); q.i = ks[0]; page(); });
  $("cqRetry").addEventListener("click", () => (q.meta.units[0] === "flagged" ? startIds(q.list.map((x) => x.id)) : start(Date.now(), new Set(q.list.map((x) => x.id)))));
  $("cqBuild").addEventListener("click", builder);
  $("cqTicket").addEventListener("click", () => { if (q.meta.units[0] === "flagged") return; const name = st.name || `Quiz ${new Date().toLocaleDateString()}`; Q.savePreset(LS, { name, units: st.units, weights: st.weights, count: st.count, all: st.all }); $("cqTicket").innerHTML = art("cq-btn-save", ["Saved"]); });
  const ok = await saved; const el = $("cqSaved"); if (el) el.textContent = ok ? "Saved to your PopBoard account." : "Saved on this device.";
}
// Student heat notebook: Leo's cq-heat-notebook rebuilt as HTML rows (readable on mobile), heat level 0-4 from struggle score.
export function heatRows(prof) {
  const ls = Object.entries(prof?.lessons || {}).sort((a, b) => b[1].score - a[1].score).slice(0, 8); if (!ls.length) return "";
  return `<ol class="cq-heat" aria-label="Your lessons, most practice needed first">${ls.map(([slug, l]) => `<li style="--heat:var(--cq-heat-${Math.min(4, Math.round(l.score * 4))})"><span>${esc(short(slug))}</span><span>${l.seen} seen \u00b7 ${l.missed} missed${l.flagged ? ` \u00b7 ${l.flagged} flagged` : ""}</span></li>`).join("")}</ol>`;
}
const TITLES = {}; for (const v of Object.values(INDEX)) for (const [id, t] of v.t || []) TITLES[id] = t;
const titleOf = (id) => (TITLES[id] || id).replace(/^Lesson \d+, /, "").slice(0, 90);
