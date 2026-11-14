// Geometry course page renderer, mounted by the shared storybook reader (ac-story.js, C.pageMount).
// Every page is drawn in code from slide.geo, written by tools/geometry/build.mjs:
//   { kind: "cover" | "text" | "gx", tag, title, target, body, fig, gx, cover }
// Art swap points (no rewiring needed):
//   geometry/art/manifest.json  { "pages": { "3.4/3": "art/3.4-p3.svg" }, "figs": { "slopes": "art/slopes.png" } }
//   a page entry replaces that page's figure, a figs entry replaces that figure on every page that uses it.
import { createBoard, createPanel } from "./gx-core.js";
import { mountActivity } from "./geo-activities.js";
import { FIGS, FIG_W, FIG_H } from "./geo-figures.js";
import { drawStrokes, prepareFigure, revealFigure, playCover, TICK } from "./geo-draw.js";

const here = (p) => new URL(p, import.meta.url).href;
let manifest = null;
const loadManifest = () => (manifest = manifest || fetch(here("art/manifest.json")).then((r) => (r.ok ? r.json() : {})).catch(() => ({})));
const gxCache = {};
const loadGx = (file) => (gxCache[file] = gxCache[file] || import(here(`gx/${file}.js`)));
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

// Mark segment names and equations without treating lesson prose as markup.
const mathInto = (root) => {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); const nodes = [];
  while (walker.nextNode()) if (!walker.currentNode.parentElement.closest("svg, .m, button, .gx-tag")) nodes.push(walker.currentNode);
  const math = /\b(?:[A-Z]{1,4}|[0-9]+(?:\.[0-9]+)?[a-z]?|[a-z])(?:\s*[+−=≠×÷-]\s*(?:[A-Z]{1,4}|[0-9]+(?:\.[0-9]+)?[a-z]?|[a-z]))+\b|\b[A-Z][A-Z′]{1,5}\b|\b[0-9]+(?:\.[0-9]+)?°?/g;
  for (const node of nodes) {
    const parts = node.textContent.split(new RegExp(`(${math.source})`, "g"));
    if (parts.length < 2) continue;
    const frag = document.createDocumentFragment();
    parts.forEach((part,i) => { if (i%2) { const span=document.createElement("span");span.className="m";span.textContent=part;frag.append(span); } else frag.append(document.createTextNode(part)); });
    node.replaceWith(frag);
  }
};

export function mount({ stage, tools, slide, meta, reduce }) {
  const G = slide.geo;
  if (!G) return null;
  const layer = document.createElement("div");
  layer.className = `gx-layer gx-unit-${meta.q} gx-k-${G.kind}${reduce ? " gx-reduce" : ""}`;
  stage.appendChild(layer);
  stage.classList.add("gx-host");
  stage.classList.toggle("gx-exit-host",G.kind === "exit-ticket");
  stage.classList.toggle("gx-we-host", G.kind === "worked-example");
  stage.classList.toggle("gx-cover-host", G.kind === "cover");
  const hookPage = G.kind === "text" && !!(G.figure || (Array.isArray(G.figures) && G.figures.length));
  stage.classList.toggle("gx-hook-host", hookPage);
  stage.classList.toggle("gx-fill-host", hookPage || G.kind === "practice" || G.kind === "common-mistake");
  const reading = ["worked-example", "common-mistake", "practice", "exit-ticket", "activity"].includes(G.kind) || (G.v2 && G.kind === "text");
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

  const inlineSvg = (host, url, alt, { cover = false } = {}) => fetch(url).then((r) => { if (!r.ok) throw new Error(r.status); return r.text(); }).then((text) => {
    if (dead) return;
    if (!/<svg/i.test(text)) throw new Error("not svg");
    host.innerHTML = text;
    const svg = host.querySelector("svg");
    if (!svg) throw new Error("no svg");
    svg.removeAttribute("width"); svg.removeAttribute("height");
    svg.setAttribute("role", "img");
    if (alt) svg.setAttribute("aria-label", alt);
    if (cover) playCover(svg, { reduce });
    else { prepareFigure(svg); revealFigure(svg, { count: 0, all: false, reduce }); }
    return svg;
  }).catch(() => { if (!dead) host.innerHTML = `<img src="${esc(url)}" alt="${esc(alt || "")}">`; });

  if (G.kind === "cover") {
    const coverAlt = `Cover art for ${G.title || "this lesson"}`;
    layer.innerHTML = `<div class="gx-cover-art"><div class="gx-cover-safe">${G.cover && !String(G.cover).endsWith(".svg") ? `<img src="${esc(G.cover)}" alt="${esc(coverAlt)}">` : ""}</div></div>
      <div class="gx-cover-text"><p class="gx-tag">${esc(G.tag)}</p><h1 class="gx-title">${esc(G.title)}</h1>${G.target ? `<p class="gx-target">${G.target}</p>` : ""}${G.stds ? `<p class="gx-stds">${esc(G.stds)}</p>` : ""}${G.jacobs ? `<p class="gx-citation">${G.jacobs.references.length ? `Jacobs ${esc(G.jacobs.section)}, pp. ${esc(G.jacobs.pages)}${G.jacobs.relationship ? ` (${esc(G.jacobs.relationship)})` : ""}` : "Supplement, beyond the textbook. No direct Jacobs section."}</p>` : ""}</div>`;
    const safe = layer.querySelector(".gx-cover-safe");
    if (G.cover && String(G.cover).endsWith(".svg")) inlineSvg(safe, G.cover, coverAlt, { cover: true });
  } else if (reading) {
    layer.innerHTML = `<div class="gx-lesson"><p class="gx-tag">${esc(G.tag)}</p><h2 class="gx-head">${esc(G.title)}</h2><div class="gx-content"></div></div>`;
    let content = layer.querySelector(".gx-content");
    if (G.optional) {
      const details=document.createElement("details"),summary=document.createElement("summary");
      summary.textContent="Optional extension: open the proof";details.className="gx-optional";details.append(summary);
      const body=document.createElement("div");details.append(body);content.append(details);content=body;
    }
    if (["worked-example", "practice", "common-mistake", "text"].includes(G.kind) && (G.figure?.svg || G.figure?.src)) {
      content.classList.add("gx-figure-layout");
      if (G.kind === "text") content.classList.add("gx-hook-layout");
      const figs = Array.isArray(G.figures) && G.figures.length ? G.figures : [G.figure];
      if (figs.length > 1) content.classList.add("gx-hook-gallery");
      const figure = document.createElement("figure"); figure.className = "gx-figure-slot";
      const place = (host, fig) => {
        const alt = fig?.alt || `Figure for lesson ${meta.q}.${meta.lesson}`;
        if (fig?.svg) {
          host.innerHTML = fig.svg;
          const svg = host.querySelector("svg");
          svg?.removeAttribute("width"); svg?.removeAttribute("height");
          svg?.setAttribute("role", "img"); if (alt) svg?.setAttribute("aria-label", alt);
          if (svg) { prepareFigure(svg); if (G.kind === "text") playCover(svg, { reduce }); }
        } else if (fig?.src) {
          if (String(fig.src).endsWith(".svg")) inlineSvg(host, fig.src, alt, { cover: G.kind === "text" });
          else host.innerHTML = `<img src="${esc(fig.src)}" alt="${esc(alt)}">`;
        }
      };
      if (figs.length === 1) place(figure, figs[0]);
      else figs.forEach((fig) => { const frame = document.createElement("div"); frame.className = "gx-hook-frame"; figure.append(frame); place(frame, fig); });
      const text = document.createElement("div"); text.className = "gx-learner-text";
      content.append(figure, text); content = text;
    } else if (["worked-example", "practice", "common-mistake"].includes(G.kind)) content.classList.add("gx-learner-text");
    const para = (text) => { const p = document.createElement("p"); p.textContent = text; content.append(p); return p; };
    const actions = document.createElement("div"); actions.className = "gx-actions";
    const figSvg = () => layer.querySelector(".gx-figure-slot svg");
    const syncFig = (count=0, all=false) => revealFigure(figSvg(), { count, all, reduce });
    if (G.kind !== "text") syncFig(0, false);
    const used = (b) => { b.disabled=true;b.classList.remove("gx-primary");b.classList.add("gx-used");const mark=document.createElement("span");mark.className="gx-used-check";mark.textContent="✓";mark.setAttribute("aria-hidden","true");b.append(" ",mark); };
    const button = (label, fn) => { const b = document.createElement("button"); b.type = "button"; b.textContent = label; b.onclick = fn; actions.append(b); return b; };
    if (G.kind === "activity") {
      inner=mountActivity(content,G.activity,G.task);
    } else if (G.kind === "worked-example") {
      para(G.prompt); content.append(actions);
      const status = para(""); status.className = "gx-step-status"; status.setAttribute("aria-live", "polite");
      const scroller = document.createElement("div"); scroller.className = "gx-steps-scroll";
      const table = document.createElement("table"); table.className = "gx-proof"; scroller.append(table); content.append(scroller);
      let count = 0, previousCount = 0;
      const scrollCurrent = () => {
        const row = table.querySelector("tr.gx-new-step") || table.querySelector("tbody tr:last-of-type");
        if (!row || !scroller.clientHeight) return;
        const s = scroller.getBoundingClientRect(), r = row.getBoundingClientRect();
        if (r.top < s.top || r.bottom > s.bottom) {
          const pad = 8;
          const shift = r.height > s.height - pad * 2
            ? r.top - s.top - pad
            : r.top - s.top - Math.max(pad, (s.height - r.height) / 2);
          scroller.scrollTo({ top: scroller.scrollTop + shift, behavior: reduce ? "auto" : "smooth" });
        }
      };
      const draw = () => {
        table.innerHTML = `<thead><tr><th scope="col">Statement</th><th scope="col">Reason</th></tr></thead><tbody>${G.steps.slice(0,count).map((s,i)=>`<tr${i >= previousCount ? ' class="gx-new-step"' : ""}><td><span class="gx-step-number">${TICK}<span class="gx-step-n">${i+1}</span></span> ${esc(s.step)}</td><td>${esc(s.reason)}</td></tr>`).join("")}</tbody>${count < G.steps.length ? '<tfoot><tr class="gx-prediction"><td>What comes next? Decide, then tap.</td><td></td></tr></tfoot>' : ''}`;
        status.textContent = `${G.optional ? "Optional extension. " : ""}${count} of ${G.steps.length} steps shown.`;
        syncFig(count, count===G.steps.length); back.disabled = count===0; next.disabled=count===G.steps.length; previousCount=count; mathInto(table);
        table.querySelectorAll("tr.gx-new-step .gx-tick").forEach((tick)=>drawStrokes(tick,{reduce}));
        requestAnimationFrame(() => requestAnimationFrame(scrollCurrent));
      };
      const back = button("Back",()=>{count=Math.max(0,count-1);draw();});
      const next = button("Next step",()=>{count=Math.min(G.steps.length,count+1);draw();});
      button("Show all",()=>{count=G.steps.length;draw();}); next.classList.add("gx-primary"); draw();
    } else if (G.kind === "practice") {
      para(G.prompt); para("Try it on paper first, then reveal."); content.append(actions);
      const solution = para(""); solution.className = "gx-solution";
      const check = para(""); check.className = "gx-second-check";
      solution.hidden = check.hidden = true;
      const first = button("Reveal solution",()=>{solution.textContent=G.solution; mathInto(solution); solution.hidden=false; syncFig(0,true); used(first); first.setAttribute("aria-expanded","true"); second.hidden=false;});
      const second = button("Reveal second check",()=>{check.textContent=G.check; mathInto(check);check.hidden=false;syncFig(0,true);used(second);second.setAttribute("aria-expanded","true");});
      first.classList.add("gx-primary"); first.setAttribute("aria-expanded","false"); second.setAttribute("aria-expanded","false"); second.hidden=true;
    } else if (G.kind === "common-mistake") {
      const prompt=para("");prompt.className="gx-mistake-prompt";
      const parts=String(G.prompt).match(/^((?:A student|Jordan)(?: says| writes| claims| calls)?(?::\s*|\s+))(.*)$/s);
      if(parts)prompt.append(document.createTextNode(parts[1]));
      const claim=document.createElement("span");claim.className="gx-wrong";claim.textContent=parts?parts[2]:G.prompt;prompt.append(claim); para("Try it on paper first, then reveal."); content.append(actions);
      const correction=document.createElement("div"); correction.hidden=true; correction.className="gx-correction";content.append(correction);
      const reveal=button("Reveal correction",()=>{correction.innerHTML=G.correction; mathInto(correction);correction.hidden=false;syncFig(0,true);used(reveal);reveal.setAttribute("aria-expanded","true");});reveal.setAttribute("aria-expanded","false");
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
  mathInto(layer);
  return {
    destroy() {
      dead = true;
      if (inner && inner.destroy) inner.destroy();
      if (board) board.destroy();
      if (panel) panel.destroy();
      layer.remove();
      stage.classList.remove("gx-host", "gx-reading", "gx-exit-host", "gx-we-host");
    }
  };
}
