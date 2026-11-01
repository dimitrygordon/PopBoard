// Shared helpers for Physics 101 Test it scenes. Everything is in 1600x900 page px, the same space as
// Leo's layers, so a scene can line up with the art at any stage size.
export const W = 1600, H = 900;
const pct = (v, of) => (v / of) * 100 + "%";

export function place(el, [x0, y0, x1, y1]) {
  Object.assign(el.style, { left: pct(x0, W), top: pct(y0, H), width: pct(x1 - x0, W), height: pct(y1 - y0, H) });
  return el;
}
// font size given in page px (the stage's --u is one deck point; a deck is 960 points across 1600 page px)
export const fontPx = (el, px) => { el.style.fontSize = `calc(var(--u, 1px) * ${(px * 960) / W})`; return el; };

export function add(layer, tag, cls, box, text) {
  const el = document.createElement(tag); if (cls) el.className = cls; if (box) place(el, box);
  if (text != null) el.textContent = text; layer.appendChild(el); return el;
}
export function toPage(stage, e) {
  const r = stage.getBoundingClientRect();
  return [((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H];
}
// An invisible, focusable handle over a cutout. Drag with a pointer, or use the arrow keys (Enter drops).
export function handle(ctx, box, label, { start, move, end } = {}) {
  const b = add(ctx.layer, "button", "hit", box); b.type = "button"; b.setAttribute("aria-label", label);
  let p0 = null, kx = 0, ky = 0;
  b.addEventListener("pointerdown", (e) => { e.preventDefault(); e.stopPropagation(); b.setPointerCapture(e.pointerId); p0 = toPage(ctx.stage, e); b.classList.add("dragging"); start && start(); });
  b.addEventListener("pointermove", (e) => { if (!p0) return; const p = toPage(ctx.stage, e); move && move(p[0] - p0[0], p[1] - p0[1], p); });
  const up = (e) => { if (!p0) return; const p = toPage(ctx.stage, e); const d = [p[0] - p0[0], p[1] - p0[1]]; p0 = null; b.classList.remove("dragging"); end && end(d[0], d[1], p); };
  b.addEventListener("pointerup", up); b.addEventListener("pointercancel", up);
  b.addEventListener("click", (e) => e.stopPropagation());
  b.addEventListener("keydown", (e) => {
    const step = e.shiftKey ? 80 : 25, k = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (k) { e.preventDefault(); if (!kx && !ky) start && start(); kx += k[0]; ky += k[1]; move && move(kx, ky, null); }
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (kx || ky) { end && end(kx, ky, null); kx = ky = 0; } }
  });
  return b;
}
export const center = (b) => [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2];
export const inside = ([x, y], b) => x >= b[0] && x <= b[2] && y >= b[1] && y <= b[3];
export function svg(layer, viewBox = `0 0 ${W} ${H}`) {
  const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  s.setAttribute("viewBox", viewBox); s.setAttribute("preserveAspectRatio", "none"); place(s, [0, 0, W, H]); s.setAttribute("aria-hidden", "true");
  layer.appendChild(s); return s;
}
export function path(s, d, attrs = {}) {
  const p = document.createElementNS("http://www.w3.org/2000/svg", "path"); p.setAttribute("d", d);
  for (const [k, v] of Object.entries({ fill: "none", "stroke-linecap": "round", ...attrs })) p.setAttribute(k, v);
  s.appendChild(p); return p;
}
// requestAnimationFrame tween; reduced motion jumps to the end
export function tween(ms, step, reduce) {
  return new Promise((done) => {
    if (reduce) { step(1); return done(); }
    const t0 = performance.now(); const f = (now) => { const t = Math.min(1, (now - t0) / ms); step(t); if (t < 1) requestAnimationFrame(f); else done(); }; requestAnimationFrame(f);
  });
}
export const ease = (t) => t * t * (3 - 2 * t);
export const shift = (b, dx, dy) => [b[0] + dx, b[1] + dy, b[2] + dx, b[3] + dy];
// Keep a handle over its cutout after a move: home box shifted by (dx, dy) page px.
export function follow(h, home, dx = 0, dy = 0) { h.style.left = pct(home[0] + dx, W); h.style.top = pct(home[1] + dy, H); return h; }
// A tappable area that reports the page px of each tap (for plotting on a grid or drawing on a plan).
export function tapArea(ctx, box, label, fn) {
  const b = add(ctx.layer, "button", "hit", box); b.type = "button"; b.setAttribute("aria-label", label);
  b.addEventListener("click", (e) => { e.stopPropagation(); fn(e.detail === 0 ? [(box[0] + box[2]) / 2, (box[1] + box[3]) / 2] : toPage(ctx.stage, e)); });
  return b;
}
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
// Leo's grid_graph mapping: plot area (x0, y0) to (x1, y1) in page px, t from 0 to xmax, v from ymin to ymax.
export function graphMap(x0, y0, x1, y1, xmax, ymax, ymin = 0) {
  const fx = (t) => x0 + (t * (x1 - x0)) / xmax, fy = (v) => y1 - ((v - ymin) * (y1 - y0)) / (ymax - ymin);
  return { fx, fy, tx: (X) => ((X - x0) * xmax) / (x1 - x0), vy: (Y) => ymin + ((y1 - Y) * (ymax - ymin)) / (y1 - y0) };
}
// A cutout that slides along v = f(t) on a graph. It starts at t0 (where Leo drew it) and calls onMove(t, done).
export function onCurve(ctx, id, g, f, t0, [ta, tb], label, onMove, snap = 0.01) {
  const { art } = ctx, home = art.box(id); let t = t0, c0;
  const put = () => { const dx = g.fx(t) - g.fx(t0), dy = g.fy(f(t)) - g.fy(f(t0)); art.set(id, { dx, dy }); return [dx, dy]; };
  const h = handle(ctx, home, label, {
    start: () => { art.touched(id); c0 = g.fx(t); },
    move: (dx) => { t = clamp(Math.round(g.tx(c0 + dx) / snap) * snap, ta, tb); put(); onMove(t, false); },
    end: () => { const [dx, dy] = put(); follow(h, home, dx, dy); onMove(t, true); },
  });
  return { get t() { return t; }, set(v) { t = clamp(v, ta, tb); const [dx, dy] = put(); follow(h, home, dx, dy); onMove(t, false); } };
}
// A cutout you tap (or press Enter on) to run fn.
export function tapCut(ctx, id, label, fn) {
  const b = handle(ctx, ctx.art.box(id), label, {}); b.addEventListener("click", () => { ctx.art.touched(id); fn(); }); return b;
}
export const f2 = (x, d = 2) => (Math.abs(x) < 0.5 * 10 ** -d ? 0 : x).toFixed(d).replace("-", "\u2212");
// SVG path data for an arrow from (x1, y1) to (x2, y2) with an open head of size hd.
export function arrowD(x1, y1, x2, y2, hd = 16) {
  const L = Math.hypot(x2 - x1, y2 - y1); if (L < 1) return "";
  const ux = (x2 - x1) / L, uy = (y2 - y1) / L, h = Math.min(hd, L * 0.6);
  return `M ${x1} ${y1} L ${x2} ${y2} M ${x2 - h * ux - h * 0.6 * uy} ${y2 - h * uy + h * 0.6 * ux} L ${x2} ${y2} L ${x2 - h * ux + h * 0.6 * uy} ${y2 - h * uy - h * 0.6 * ux}`;
}
export function caption(layer, box, px = 26, text = "") { const c = fontPx(add(layer, "div", "cap", box, text), px); c.style.whiteSpace = "pre-line"; return c; }
export const RED = "#B5473A", VIOLET = "#7A5FA8", NAVY = "#1F2F5C", GOLD = "#E2B654", SKY = "#5E8CC2";
// A tangent tool on v = f(t): drag the cutout along the curve; once touched, the cutout is replaced by a
// drawn tangent (slope df(t)) through a gold point. onMove(t, slope, done).
export function tangentTool(ctx, id, g, f, df, t0, range, label, onMove, half = 1.2, snap = 0.05) {
  const s = svg(ctx.layer), ln = path(s, "", { stroke: VIOLET, "stroke-width": 5 }), pt = path(s, "", { stroke: GOLD, "stroke-width": 26 });
  const draw = (t) => {
    const m = df(t), a = Math.max(range[0] - 0.5, t - half), b = t + half;
    ln.setAttribute("d", `M ${g.fx(a)} ${g.fy(f(t) + m * (a - t))} L ${g.fx(b)} ${g.fy(f(t) + m * (b - t))}`); pt.setAttribute("d", `M ${g.fx(t)} ${g.fy(f(t))} h 0.1`);
  };
  let first = true;
  return onCurve(ctx, id, g, f, t0, range, label, (t, done) => { if (first) { first = false; ctx.art.show(id, false); } draw(t); onMove(t, df(t), done); }, snap);
}
