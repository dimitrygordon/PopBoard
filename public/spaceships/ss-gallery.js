import { forwardStudyQuery } from "../board-return.js?v=20261022a";
import { loadFleet, listedCraft, assetUrl, galleryQuery, matchesQuery } from "./ss-data.js";

const $ = (id) => document.getElementById(id);

$("studyBackBtn").addEventListener("click", (e) => {
  e.preventDefault();
  const qs = forwardStudyQuery(location.search).toString();
  location.href = "study.html" + (qs ? "?" + qs : "");
});

$("searchForm").addEventListener("submit", (e) => e.preventDefault());

const TAG_ORDER = ["crewed", "observatory", "probe", "rover", "lander", "rotorcraft"];
const fleet = await loadFleet();
const all = listedCraft(fleet);
const tags = TAG_ORDER.filter((t) => all.some((c) => (c.tags || []).includes(t)));

let activeTag = "";
let query = "";

const stillFallback = assetUrl(fleet.placeholderStill || "stills/_placeholder.webp");
const detailSearch = galleryQuery(location.search);

function cardHref(id) {
  const params = new URLSearchParams(detailSearch.startsWith("?") ? detailSearch.slice(1) : detailSearch);
  params.set("id", id);
  return "study-spaceship.html?" + params.toString();
}

function renderFilters() {
  const bar = $("filters");
  bar.replaceChildren();
  const make = (value, label) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = label;
    btn.setAttribute("aria-pressed", value === activeTag ? "true" : "false");
    btn.addEventListener("click", () => {
      activeTag = value === activeTag ? "" : value;
      render();
    });
    return btn;
  };
  bar.append(make("", "All"));
  for (const tag of tags) bar.append(make(tag, tag));
}

function render() {
  renderFilters();
  const grid = $("grid");
  grid.replaceChildren();
  const rows = all.filter((c) => {
    if (activeTag && !(c.tags || []).includes(activeTag)) return false;
    return matchesQuery(c, query);
  });
  $("empty").hidden = rows.length > 0;
  for (const craft of rows) {
    const a = document.createElement("a");
    a.className = "card";
    a.href = cardHref(craft.id);
    a.dataset.id = craft.id;
    const img = document.createElement("img");
    img.src = assetUrl(craft.still) || stillFallback;
    img.alt = craft.name;
    img.loading = "lazy";
    img.decoding = "async";
    img.width = 960;
    img.height = 720;
    img.addEventListener("error", () => { img.src = stillFallback; }, { once: true });
    const meta = document.createElement("div");
    meta.className = "meta";
    const h2 = document.createElement("h2");
    h2.textContent = craft.name;
    meta.append(h2);
    if (craft.tags && craft.tags[0]) {
      const tag = document.createElement("p");
      tag.className = "tag";
      tag.textContent = craft.tags[0];
      meta.append(tag);
    }
    if (craft.placeholder) {
      const ph = document.createElement("p");
      ph.className = "ph";
      ph.textContent = "Placeholder";
      meta.append(ph);
    }
    a.append(img, meta);
    grid.append(a);
  }
}

$("search").addEventListener("input", (e) => {
  query = e.target.value;
  render();
});

render();
