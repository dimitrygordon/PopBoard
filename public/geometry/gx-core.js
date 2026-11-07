// Geometry course interactives: a 1600 x 900 SVG board on the storybook page with draggable points,
// compass and straightedge drawing helpers, a step-by-step construction player, and panel controls.
// Mouse, touch and pen all use pointer events; arrow keys move a focused point. Line weights stay
// 1, 2 and 3 screen pixels at any size, and labels never drop under 13px on a phone or 22px on desktop.
import * as M from "./geo-math.js";
import * as S from "./geo-svg.js";
import { makeCtx } from "./geo-ctx.js";

export const VW = 1600, VH = 900;
const phone = () => matchMedia("(max-width: 699px)").matches;

export function createBoard(layer, { reduce = false, w: BW = VW, h: BH = VH } = {}) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${BW} ${BH}`);
  svg.setAttribute("class", "gx-board");
  svg.setAttribute("role", "application");
  svg.setAttribute("aria-label", "Interactive figure. Drag the hollow points, or focus one and use the arrow keys.");
  layer.appendChild(svg);
  const art = document.createElementNS(svg.namespaceURI, "g"), handles = document.createElementNS(svg.namespaceURI, "g");
  svg.append(art, handles);
  const pts = [];
  let drawFn = () => "", k = 2, fs = 40, raf = 0;
  const listeners = [];
  const B = {
    svg, reduce, pts,
    W: BW, H: BH, get k() { return k; }, get fs() { return fs; },
    // a draggable point: opts.label, opts.constrain(p) -> p, opts.free (false = shown but fixed)
    point(x, y, opts = {}) {
      const p = { x, y, x0: x, y0: y, label: opts.label || "", constrain: opts.constrain || null, drag: opts.drag !== false, hidden: !!opts.hidden };
      pts.push(p); mountHandle(p); return p;
    },
    draw(fn) { drawFn = fn; B.update(); },
    update() { cancelAnimationFrame(raf); raf = requestAnimationFrame(render); },
    now() { render(); },
    onChange(fn) { listeners.push(fn); },
    reset() { for (const p of pts) { p.x = p.x0; p.y = p.y0; } B.update(); listeners.forEach((f) => f()); },
    destroy() { cancelAnimationFrame(raf); ro.disconnect(); svg.remove(); }
  };
  function render() {
    const w = svg.getBoundingClientRect().width || 800;
    k = BW / w; fs = (phone() ? 14 : 22) * k;
    const g = makeCtx(k, fs, BW, BH);
    try { drawFn(g); } catch (e) { console.warn("gx draw", e); }
    art.innerHTML = g.out;
    for (const p of pts) placeHandle(p);
  }
  function mountHandle(p) {
    const h = document.createElementNS(svg.namespaceURI, "g");
    h.setAttribute("class", "gx-pt" + (p.drag ? " gx-drag" : ""));
    if (p.drag) { h.setAttribute("tabindex", "0"); h.setAttribute("role", "slider"); h.setAttribute("aria-label", `Point ${p.label || ""}`.trim()); }
    h.innerHTML = `<circle class="hit" r="1" fill="transparent"/><circle class="ring" r="1" fill="var(--gx-paper, #fff)" stroke="currentColor"/><circle class="core" r="1" fill="currentColor"/>`;
    handles.appendChild(h); p.el = h;
    if (!p.drag) return;
    h.addEventListener("pointerdown", (e) => {
      e.preventDefault(); e.stopPropagation(); h.setPointerCapture(e.pointerId); p.grab = true; h.classList.add("on");
      layer.closest(".stage") && (layer.closest(".stage").dataset.dragging = "1");
    });
    h.addEventListener("pointermove", (e) => {
      if (!p.grab) return;
      const q = toSvg(e); move(p, q.x, q.y);
    });
    const up = () => { if (!p.grab) return; p.grab = false; h.classList.remove("on"); const st = layer.closest(".stage"); if (st) setTimeout(() => delete st.dataset.dragging, 0); listeners.forEach((f) => f("end")); };
    h.addEventListener("pointerup", up); h.addEventListener("pointercancel", up);
    h.addEventListener("keydown", (e) => {
      const step = e.shiftKey ? 40 : 10, d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
      if (!d) return; e.preventDefault(); e.stopPropagation(); move(p, p.x + d[0], p.y + d[1]); listeners.forEach((f) => f("end"));
    });
  }
  function move(p, x, y) {
    let q = M.P(M.clamp(x, 30, BW - 30), M.clamp(y, 30, BH - 30));
    if (p.constrain) q = p.constrain(q) || q;
    p.x = q.x; p.y = q.y; B.update(); listeners.forEach((f) => f("move"));
  }
  function placeHandle(p) {
    const h = p.el; h.style.display = p.hidden ? "none" : "";
    h.setAttribute("transform", `translate(${p.x} ${p.y})`);
    const [hit, ring, core] = h.children;
    hit.setAttribute("r", String((phone() ? 24 : 18) * k));
    ring.setAttribute("r", String((p.drag ? 9 : 5) * k)); ring.setAttribute("stroke-width", String(2 * k));
    core.setAttribute("r", String((p.drag ? 3.5 : 5) * k));
  }
  function toSvg(e) {
    const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
    const m = svg.getScreenCTM(); return m ? pt.matrixTransform(m.inverse()) : pt;
  }
  const ro = new ResizeObserver(() => B.update()); ro.observe(svg);
  return B;
}

// Panel controls for one interactive: a "tool" section in the page tools (bottom sheet on phones).
export function createPanel(tools, { title, how }) {
  const sec = document.createElement("section");
  sec.className = "tool gx-tool";
  sec.innerHTML = `<h2 class="panel-h">${title}</h2>${how ? `<p class="note">${how}</p>` : ""}<div class="gx-ctl"></div><div class="gx-read" aria-live="polite"></div>`;
  tools.prepend(sec);
  const ctl = sec.querySelector(".gx-ctl"), read = sec.querySelector(".gx-read");
  let row = null;
  const U = {
    el: sec,
    row() { row = document.createElement("div"); row.className = "row gx-row"; ctl.appendChild(row); return U; },
    button(label, fn, opts = {}) {
      if (!row) U.row();
      const b = document.createElement("button"); b.type = "button"; b.textContent = label;
      if (opts.pressed != null) b.setAttribute("aria-pressed", String(!!opts.pressed));
      b.addEventListener("click", () => fn(b)); row.appendChild(b); return b;
    },
    slider({ label, min, max, step = 1, value, fmt = (v) => v }, fn) {
      const l = document.createElement("label"); l.className = "gx-slider";
      l.innerHTML = `<span>${label}: <b></b></span><input type="range" min="${min}" max="${max}" step="${step}" value="${value}">`;
      const i = l.querySelector("input"), b = l.querySelector("b");
      const set = () => { b.textContent = fmt(+i.value); fn(+i.value); };
      i.addEventListener("input", set); ctl.appendChild(l); row = null; b.textContent = fmt(+value);
      return { input: i, set(v) { i.value = v; b.textContent = fmt(+v); } };
    },
    choice(label, options, value, fn) {
      const wrap = document.createElement("div"); wrap.className = "row gx-row"; wrap.setAttribute("role", "group"); wrap.setAttribute("aria-label", label);
      const bs = options.map(([v, t]) => { const b = document.createElement("button"); b.type = "button"; b.textContent = t; b.setAttribute("aria-pressed", String(v === value)); b.addEventListener("click", () => { bs.forEach((o) => o.setAttribute("aria-pressed", String(o === b))); fn(v); }); wrap.appendChild(b); return b; });
      ctl.appendChild(wrap); row = null; return bs;
    },
    read(html) { read.innerHTML = html; },
    destroy() { sec.remove(); }
  };
  return U;
}

// Step-by-step construction player. steps: [{ say, draw(g, t) }]; earlier steps draw with t = 1.
// The board's own draw(g) runs first (givens), then the steps.
export function createSteps(B, U, steps, base, { done = "", notice = null } = {}) {
  let n = 0, t = 1, anim = 0;
  const cap = document.createElement("p"); cap.className = "gx-step"; cap.setAttribute("aria-live", "polite");
  U.el.querySelector(".gx-ctl").before(cap);
  const say = () => { cap.innerHTML = (notice && notice()) || (n === 0 ? `Start: ${steps.intro || "the givens are drawn. Tap Next step."}` : `Step ${n} of ${steps.length}: ${steps[n - 1].say}${n === steps.length && done ? ` <b>${done}</b>` : ""}`); };
  B.draw((g) => { base(g, n); if(notice && notice()){say();return;} for (let i = 0; i < n; i++) steps[i].draw(g, i === n - 1 ? t : 1); if(notice)say(); });
  const play = () => {
    cancelAnimationFrame(anim);
    if (B.reduce) { t = 1; B.update(); return; }
    const t0 = performance.now(), dur = 900;
    const tick = (now) => { t = Math.min(1, (now - t0) / dur); B.now(); if (t < 1) anim = requestAnimationFrame(tick); };
    t = 0; anim = requestAnimationFrame(tick);
  };
  U.row();
  const back = U.button("Back", () => { if (n > 0) { n--; t = 1; cancelAnimationFrame(anim); B.update(); sync(); } });
  const next = U.button("Next step", () => { if (n < steps.length) { n++; play(); sync(); } });
  U.button("Show all", () => { n = steps.length; t = 1; cancelAnimationFrame(anim); B.update(); sync(); });
  U.button("Start over", () => { n = 0; t = 1; cancelAnimationFrame(anim); B.reset(); sync(); });
  function sync() { back.disabled = n === 0; next.disabled = n === steps.length; say(); }
  sync();
  return { get n() { return n; }, sync };
}
export { M, S };
