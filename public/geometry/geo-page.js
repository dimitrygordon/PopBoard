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
  const reading = ["worked-example", "common-mistake", "practice", "exit-ticket"].includes(G.kind) || (G.v2 && G.kind === "text");
  stage.classList.toggle("gx-reading", reading);
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
      <div class="gx-cover-text"><p class="gx-tag">${esc(G.tag)}</p><h1 class="gx-title">${esc(G.title)}</h1>${G.target ? `<p class="gx-target">${G.target}</p>` : ""}${G.stds ? `<p class="gx-stds">${esc(G.stds)}</p>` : ""}${G.jacobs ? `<p class="gx-citation">${G.jacobs.references.length ? `Jacobs ${esc(G.jacobs.section)}, pp. ${esc(G.jacobs.pages)}${G.jacobs.relationship ? ` (${esc(G.jacobs.relationship)})` : ""}` : "Supplement, beyond the textbook. No direct Jacobs section."}</p>` : ""}</div>`;
  } else if (reading) {
    layer.innerHTML = `<div class="gx-lesson"><p class="gx-tag">${esc(G.tag)}</p><h2 class="gx-head">${esc(G.title)}</h2><div class="gx-content"></div></div>`;
    let content = layer.querySelector(".gx-content");
    if (["worked-example", "practice", "common-mistake"].includes(G.kind)) {
      content.classList.add("gx-figure-layout");
      const figure = document.createElement("figure"); figure.className = "gx-figure-slot";
      const alt = G.figure?.alt || `Figure for lesson ${meta.q}.${meta.lesson}`;
      if (G.figure?.svg) { figure.innerHTML = G.figure.svg; const svg = figure.querySelector("svg"); svg?.setAttribute("role", "img"); svg?.setAttribute("aria-label", alt); }
      else if (G.figure?.src) figure.innerHTML = `<img src="${esc(G.figure.src)}" alt="${esc(alt)}">`;
      else { figure.classList.add("gx-figure-placeholder"); figure.innerHTML = `<span>Figure coming</span><small>Lesson ${esc(meta.q)}.${esc(meta.lesson)}</small>`; }
      const text = document.createElement("div"); text.className = "gx-learner-text";
      content.append(figure, text); content = text;
    }
    const para = (text) => { const p = document.createElement("p"); p.textContent = text; content.append(p); return p; };
    const actions = document.createElement("div"); actions.className = "gx-actions";
    const button = (label, fn) => { const b = document.createElement("button"); b.type = "button"; b.textContent = label; b.onclick = fn; actions.append(b); return b; };
    if (G.kind === "worked-example") {
      para(G.prompt); content.append(actions);
      const status = para(""); status.className = "gx-step-status"; status.setAttribute("aria-live", "polite");
      const table = document.createElement("table"); table.className = "gx-proof"; content.append(table);
      let count = 0;
      const draw = () => {
        table.innerHTML = `<thead><tr><th scope="col">Statement</th><th scope="col">Reason</th></tr></thead><tbody>${G.steps.slice(0,count).map((s,i)=>`<tr><td><span class="gx-step-number">${i+1}</span> ${esc(s.step)}</td><td>${esc(s.reason)}</td></tr>`).join("")}</tbody>${count < G.steps.length ? '<tfoot><tr class="gx-prediction"><td>What comes next? Decide, then tap.</td><td></td></tr></tfoot>' : ''}`;
        status.textContent = `${G.optional ? "Optional extension. " : ""}${count} of ${G.steps.length} steps shown.`;
        back.disabled = count===0; next.disabled=count===G.steps.length;
      };
      const back = button("Back",()=>{count=Math.max(0,count-1);draw();});
      const next = button("Next step",()=>{count=Math.min(G.steps.length,count+1);draw();});
      button("Show all",()=>{count=G.steps.length;draw();}); draw();
    } else if (G.kind === "practice") {
      para(G.prompt); para("Try it on paper first, then reveal."); content.append(actions);
      const solution = para(""); solution.className = "gx-solution";
      const check = para(""); check.className = "gx-second-check";
      solution.hidden = check.hidden = true;
      const first = button("Reveal solution",()=>{solution.textContent=G.solution; solution.hidden=false; first.disabled=true; first.setAttribute("aria-expanded","true"); second.hidden=false;});
      const second = button("Reveal second check",()=>{check.textContent=G.check;check.hidden=false;second.disabled=true;second.setAttribute("aria-expanded","true");});
      first.setAttribute("aria-expanded","false"); second.setAttribute("aria-expanded","false"); second.hidden=true;
    } else if (G.kind === "common-mistake") {
      para(G.prompt).className = "gx-wrong"; para("Try it on paper first, then reveal."); content.append(actions);
      const correction=document.createElement("div"); correction.hidden=true; correction.className="gx-correction";content.append(correction);
      const reveal=button("Reveal correction",()=>{correction.innerHTML=G.correction;correction.hidden=false;reveal.disabled=true;reveal.setAttribute("aria-expanded","true");});reveal.setAttribute("aria-expanded","false");
    } else content.innerHTML=G.body;
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
      stage.classList.remove("gx-host", "gx-reading");
    }
  };
}
