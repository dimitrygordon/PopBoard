// Storybook course library (Astronomy Course, Physics 101): one card per storybook, searchable by title and page words.
import { course, loadCatalog, pageKey, standardsLine } from "./ac-courses.js";
import { searchDeck, esc } from "./ac-render.js";
import { bindThemeButton, store, BACK_ICON } from "./ac-common.js";
import { forwardStudyQuery } from "../board-return.js?v=20261022a";

const C = course();
const DECKS = await loadCatalog(C);
const $ = (id) => document.getElementById(id);
bindThemeButton($("themeBtn"));
document.querySelector("#studyBackBtn .back-icon").outerHTML = BACK_ICON;
$("studyBackBtn").addEventListener("click", (e) => {
  e.preventDefault();
  location.href = "study.html" + location.search;
});

const params = new URLSearchParams(location.search);
let quarter = 0;
const q = $("q");
q.value = params.get("q") || "";

function storyHref(d, page) {
  const p = forwardStudyQuery(location.search); p.set(C.param, d.slug); if (page) p.set("page", page); else p.delete("page");
  return C.story + "?" + p.toString();
}

function card(d, hit) {
  const last = +store.get(pageKey(C, d.slug)) || 0;
  const page = hit && hit.page ? hit.page : (last > 1 ? last : 0);
  const tag = d.built ? "a" : "div";
  const attrs = d.built ? `href="${esc(storyHref(d, page))}"` : `aria-disabled="true"`;
  const meta = d.built
    ? (hit && hit.page ? `Opens on page ${hit.page}` : last > 1 ? `Pick up on page ${last} of ${d.slides}` : `${d.slides} pages`)
    : d.slides ? `${d.slides} pages \u00b7 being drawn` : "Coming soon";
  return `<li><${tag} class="lib-card" data-q="${d.q}" ${attrs}>
    <span class="strip"><span>${esc(C.strip ? C.strip(d) : `${C.group(d)} \u00b7 ${C.label(d)}`)}</span><span class="badge">${d.built ? "Storybook" : "Coming soon"}</span></span>
    ${C.covers ? `<img class="cover" src="${C.root}covers/${d.slug}.webp" alt="" loading="lazy" decoding="async" width="960" height="540">` : `<span class="cover cover-soon" aria-hidden="true"><span>${esc(d.key)}</span></span>`}
    <div class="body"><h2>${esc(d.title)}</h2>${standardsLine(d) ? `<span class="stds">${esc(standardsLine(d))}</span>` : ""}<span class="sub">${esc(d.sub)}</span>
    ${hit && hit.snippet ? `<span class="hit">Page ${hit.page}: ${esc(hit.snippet)}</span>` : ""}
    <span class="meta">${esc(meta)}</span></div></${tag}></li>`;
}

function render() {
  const query = q.value;
  const rows = [];
  for (const d of DECKS) {
    if (quarter && d.q !== quarter) continue;
    const hit = searchDeck(d, query);
    if (hit) rows.push(card(d, hit));
  }
  $("grid").innerHTML = rows.join("");
  $("empty").hidden = rows.length > 0;
  $("count").textContent = query.trim() ? `${rows.length} of ${DECKS.length} ${C.unit} match` : `${rows.length} ${C.unit}`;
}
q.addEventListener("input", render);
// Course libraries that mark their filter row data-auto get one button per module in the catalog, so the row never drifts from the lessons.
const filterRow = document.querySelector('.lib-filters[data-auto="module"]');
if (filterRow) filterRow.insertAdjacentHTML("beforeend", [...new Set(DECKS.map((d) => d.q))].sort((a, b) => a - b)
  .map((m) => `<button type="button" class="mod-pill" data-q="${m}" aria-pressed="false" aria-label="Module ${m}" style="--pill:var(--p101-m${m})">M${m}</button>`).join(""));
// Selected pill text: dark ink on light accents, white on deep ones, whichever reads better (WCAG contrast).
for (const b of document.querySelectorAll(".mod-pill")) {
  const hex = getComputedStyle(b).getPropertyValue("--pill").trim().replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(hex)) continue;
  const lin = (i) => { const c = parseInt(hex.slice(i, i + 2), 16) / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const L = 0.2126 * lin(0) + 0.7152 * lin(2) + 0.0722 * lin(4);
  b.style.setProperty("--pill-ink", (L + 0.05) / 0.0607 >= 1.05 / (L + 0.05) ? "#1f1c18" : "#ffffff");
}
for (const b of document.querySelectorAll(".lib-filters button")) b.addEventListener("click", () => {
  quarter = +b.dataset.q;
  for (const o of document.querySelectorAll(".lib-filters button")) o.setAttribute("aria-pressed", String(o === b));
  render();
});
render();
