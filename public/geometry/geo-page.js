// Geometry course page renderer, mounted by the shared storybook reader (ac-story.js, C.pageMount).
// Every page is drawn in code from slide.geo, written by tools/geometry/build.mjs:
//   { kind: "cover" | "text" | "gx", tag, title, target, body, fig, gx, cover }
// Art swap points (no rewiring needed):
//   geometry/art/manifest.json  { "pages": { "3.4/3": "art/3.4-p3.svg" }, "figs": { "slopes": "art/slopes.png" } }
//   a page entry replaces that page's figure, a figs entry replaces that figure on every page that uses it.
import { createBoard, createPanel } from "./gx-core.js";
import { FIGS, FIG_W, FIG_H } from "./geo-figures.js";

const here = (p) => new URL(p, import.meta.url).href;
let manifest = null;
const loadManifest = () => (manifest = manifest || fetch(here("art/manifest.json")).then((r) => (r.ok ? r.json() : {})).catch(() => ({})));
const gxCache = {};
const loadGx = (file) => (gxCache[file] = gxCache[file] || import(here(`gx/${file}.js`)));
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

export function mount({ stage, tools, slide, meta, reduce }) {
  const G = slide.geo;
  if (!G) return null;
  const layer = document.createElement("div");
  layer.className = `gx-layer gx-k-${G.kind}`;
  stage.appendChild(layer);
  stage.classList.add("gx-host");
  let board = null, panel = null, inner = null, dead = false;
  const key = `${meta.q}.${meta.lesson}/${slide.n}`;

  const figInto = async (host, id) => {
    const m = await loadManifest();
    if (dead) return;
    const art = (m.pages && m.pages[key]) || (id && m.figs && m.figs[id]);
    if (art) { host.innerHTML = `<img class="gx-art" src="${esc(here(art))}" alt="">`; return; }
    if (!id || !FIGS[id]) return;
    board = createBoard(host, { reduce, w: FIG_W, h: FIG_H });
    board.svg.setAttribute("role", "img");
    board.svg.setAttribute("aria-label", `Figure: ${G.title || ""}`);
    board.draw((g) => FIGS[id](g));
  };

  if (G.kind === "cover") {
    layer.innerHTML = `<div class="gx-cover-art">${G.cover ? `<img src="${esc(G.cover)}" alt="">` : ""}</div>
      <div class="gx-cover-text"><p class="gx-tag">${esc(G.tag)}</p><h1 class="gx-title">${esc(G.title)}</h1>${G.target ? `<p class="gx-target">${G.target}</p>` : ""}${G.stds ? `<p class="gx-stds">${esc(G.stds)}</p>` : ""}</div>`;
  } else if (G.kind === "gx") {
    const [file, name] = String(G.gx).split(".");
    layer.innerHTML = `<h2 class="gx-head">${esc(G.title)}</h2><div class="gx-board-host"></div>`;
    loadGx(file).then((mod) => {
      if (dead) return;
      const spec = mod.GX[name];
      if (!spec) return;
      board = createBoard(layer.querySelector(".gx-board-host"), { reduce });
      panel = createPanel(tools, { title: spec.title, how: spec.how });
      if (spec.kind === "construction") panel.el.classList.add("gx-construction");
      inner = spec.mount(board, panel, { reduce }) || null;
    }).catch((e) => console.warn("geometry interactive", e));
  } else {
    layer.innerHTML = `<div class="gx-text"><p class="gx-tag">${esc(G.tag)}</p><h2 class="gx-head">${esc(G.title)}</h2><div class="gx-body">${G.body || ""}</div></div><div class="gx-fig"></div>`;
    const fh = layer.querySelector(".gx-fig");
    if (G.fig || G.art) figInto(fh, G.fig); else layer.classList.add("gx-nofig");
  }
  return {
    destroy() {
      dead = true;
      if (inner && inner.destroy) inner.destroy();
      if (board) board.destroy();
      if (panel) panel.destroy();
      layer.remove();
      stage.classList.remove("gx-host");
    }
  };
}
