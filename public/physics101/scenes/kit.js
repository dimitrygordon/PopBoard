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
