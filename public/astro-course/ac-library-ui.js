// Astronomy Course library: one storybook card per ESS deck series, searchable by title and page words.
import { DECKS } from "./ac-catalog.js";
import { searchDeck, esc } from "./ac-render.js";
import { bindThemeButton, store, BACK_ICON } from "./ac-common.js";
import { forwardStudyQuery } from "../board-return.js?v=20261022a";

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
  const p = forwardStudyQuery(location.search); p.set("deck", d.slug); if (page) p.set("page", page); else p.delete("page");
  return "study-astronomy-story.html?" + p.toString();
}
function label(d) { return d.key.replace(/^D0?/, "Deck "); }

function card(d, hit) {
  const last = +store.get("popboard.astronomy-course.page." + d.slug) || 0;
  const page = hit && hit.page ? hit.page : (last > 1 ? last : 0);
  const tag = d.built ? "a" : "div";
  const attrs = d.built ? `href="${esc(storyHref(d, page))}"` : `aria-disabled="true"`;
  const meta = d.built
    ? (hit && hit.page ? `Opens on page ${hit.page}` : last > 1 ? `Pick up on page ${last} of ${d.slides}` : `${d.slides} pages`)
    : `${d.slides} pages \u00b7 being drawn`;
  return `<li><${tag} class="lib-card" data-q="${d.q}" ${attrs}>
    <span class="strip"><span>Q${d.q} \u00b7 ${esc(label(d))}</span><span class="badge">${d.built ? "Storybook" : "Coming soon"}</span></span>
    <img class="cover" src="astro-course/covers/${d.slug}.webp" alt="" loading="lazy" decoding="async" width="960" height="540">
    <div class="body"><h2>${esc(d.title)}</h2><span class="sub">${esc(d.sub)}</span>
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
  $("count").textContent = query.trim() ? `${rows.length} of ${DECKS.length} storybooks match` : `${rows.length} storybooks`;
}
q.addEventListener("input", render);
for (const b of document.querySelectorAll(".lib-filters button")) b.addEventListener("click", () => {
  quarter = +b.dataset.q;
  for (const o of document.querySelectorAll(".lib-filters button")) o.setAttribute("aria-pressed", String(o === b));
  render();
});
render();
