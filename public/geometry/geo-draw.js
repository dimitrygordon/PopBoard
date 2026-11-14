// Stroke draw-in and step-layer reveals for Geometry figures, in the same spirit as
// Physics 101 / Study Questions (public/physics101/sq-core.js drawSvg).
// Black line art only. Respects prefers-reduced-motion and the storybook `reduce` flag.
//
// Layer convention for supplied SVGs (Leo) and any generator figure that opts in:
//   <g class="given"> or data-step="0"   visible when the page opens, then draws in
//   <g data-step="N">                    N is 1-based and matches the student step table;
//                                        hidden until that step is revealed, then draws in
//   <g class="conclusion">               hidden until Show all / Reveal, then draws in
//   Strokes must be path/line/circle/ellipse/rect/polyline with fill="none" and a black stroke.
//   Small filled circles (point marks) may use data-plot; they pop in. Arrow tails may use data-grow.
//   Live <text> labels fade in after their group's strokes. Do not outline labels. No color coding.
import { reduceMotion } from "../astro-course/ac-common.js";

const quiet = (reduce) => reduce || reduceMotion();
const STROKE = "path, line, polyline, circle, rect, ellipse";

const fillOf = (el) => (el.getAttribute("fill") || "").trim().toLowerCase();
const isPlotPoint = (el) => {
  if (el.hasAttribute("data-plot")) return true;
  if (el.tagName.toLowerCase() !== "circle") return false;
  const fill = fillOf(el);
  const r = Number(el.getAttribute("r") || 0);
  return fill !== "none" && fill !== "transparent" && r > 0 && r <= 8;
};
const isStroke = (el) => {
  if (isPlotPoint(el)) return false;
  const fill = fillOf(el);
  const stroke = (el.getAttribute("stroke") || "").trim().toLowerCase();
  if (fill === "none" || fill === "transparent") return stroke !== "none";
  return false;
};
const hidden = (el, root) => {
  let n = el;
  while (n) {
    if (n.nodeType === 1 && n.style && n.style.display === "none") return true;
    if (n === root) break;
    n = n.parentElement;
  }
  return false;
};

export const TICK = `<svg class="gx-tick" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 13c2 2 3.5 3.6 5 5.5C12 12 15.5 7.5 20 4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

export function drawStrokes(root, { reduce = false, onDone, together = false } = {}) {
  if (!root) { onDone && onDone(); return; }
  const strokes = [...root.querySelectorAll(STROKE)].filter((el) => !el.closest(".gx-tick") && !hidden(el, root));
  const labels = [...root.querySelectorAll("text")].filter((el) => !hidden(el, root));
  if (quiet(reduce)) {
    root.classList.add("gx-drawn");
    for (const el of strokes) {
      el.style.opacity = "";
      el.style.strokeDasharray = "";
      el.style.strokeDashoffset = "";
    }
    for (const t of labels) t.style.opacity = "";
    onDone && onDone();
    return;
  }
  let t = 0;
  for (const el of strokes) {
    if (isPlotPoint(el)) {
      el.style.opacity = "0";
      el.style.transition = `opacity 180ms ease-out ${t}ms`;
      t += 110;
      requestAnimationFrame(() => { el.style.opacity = "1"; });
      continue;
    }
    if (!isStroke(el)) {
      el.style.opacity = "0";
      el.style.transition = `opacity 220ms ease-out ${t}ms`;
      t += 80;
      requestAnimationFrame(() => { el.style.opacity = "1"; });
      continue;
    }
    let len = 0;
    try { len = el.getTotalLength(); } catch (e) { len = 0; }
    if (!len) continue;
    const dur = Math.min(together ? 900 : 900, 280 + len * 1.8);
    el.style.strokeDasharray = String(len);
    el.style.strokeDashoffset = el.hasAttribute("data-grow") ? String(-len) : String(len);
    el.getBoundingClientRect();
    const delay = together ? 0 : t;
    el.style.transition = `stroke-dashoffset ${dur}ms cubic-bezier(.4,.1,.3,1) ${delay}ms`;
    requestAnimationFrame(() => { el.style.strokeDashoffset = "0"; });
    if (!together) t += dur * 0.55;
    else t = Math.max(t, dur);
  }
  for (const label of labels) {
    label.style.opacity = "0";
    label.style.transition = `opacity 280ms ease-out ${t}ms`;
    requestAnimationFrame(() => { label.style.opacity = "1"; });
    t += 60;
  }
  setTimeout(() => { root.classList.add("gx-drawn"); onDone && onDone(); }, t + 200);
}

function layerKind(el) {
  if (el.classList.contains("conclusion")) return { kind: "conclusion", step: Number(el.getAttribute("data-step") || Number.POSITIVE_INFINITY) };
  if (el.hasAttribute("data-step")) return { kind: "step", step: Number(el.getAttribute("data-step")) };
  if (el.classList.contains("step")) return { kind: "step", step: 1 };
  if (el.classList.contains("given")) return { kind: "given", step: 0 };
  return null;
}

// Topmost marked layers only, so a data-step path inside an unmarked group is itself a layer.
export function figureLayers(svg) {
  if (!svg) return [];
  const found = [...svg.querySelectorAll("[data-step], g.step, g.given, g.conclusion")];
  return found.filter((el) => !found.some((other) => other !== el && other.contains(el)));
}

const hasLeoDraw = (root) => !!(root && root.querySelector && root.querySelector(".draw, .fade"));

export function prepareFigure(svg) {
  if (!svg) return;
  for (const el of figureLayers(svg)) {
    const info = layerKind(el);
    if (!info) continue;
    if (info.kind === "given" || info.step === 0) continue;
    el.style.display = "none";
    el.classList.remove("gx-layer-on", "on");
  }
  svg.classList.remove("gx-given-drawn", "play");
}

export function revealFigure(svg, { count = 0, all = false, reduce = false } = {}) {
  if (!svg) return;
  const first = !svg.classList.contains("gx-given-drawn");
  const toDraw = [];
  for (const el of figureLayers(svg)) {
    const info = layerKind(el);
    if (!info) continue;
    const show = info.kind === "given" || info.step === 0 || (info.kind === "step" && info.step <= count) || (info.kind === "conclusion" && all);
    if (!show) {
      el.style.display = "none";
      el.classList.remove("gx-layer-on", "on");
      continue;
    }
    const wasHidden = el.style.display === "none" || !el.classList.contains("gx-layer-on");
    el.style.display = "";
    if (info.kind !== "given" && info.step !== 0 && wasHidden) {
      el.classList.add("gx-layer-on", "on");
      if (!hasLeoDraw(el)) toDraw.push(el);
    }
  }
  if (first) {
    svg.classList.add("gx-given-drawn");
    if (hasLeoDraw(svg) || svg.hasAttribute("data-steps")) svg.classList.add("play");
    else drawStrokes(svg, { reduce });
  }
  for (const el of toDraw) drawStrokes(el, { reduce });
}

export function playCover(svg, { reduce = false } = {}) {
  if (!svg) return;
  prepareFigure(svg);
  if (hasLeoDraw(svg) || svg.hasAttribute("data-steps")) {
    for (const el of figureLayers(svg)) {
      el.style.display = "";
      el.classList.add("gx-layer-on", "on");
    }
    svg.classList.add("play", "gx-given-drawn");
    return;
  }
  svg.classList.add("gx-given-drawn");
  drawStrokes(svg, { reduce, together: true });
}
