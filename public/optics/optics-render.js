// Optics: drawing. Reads state and draws to a 2D canvas.
// Every number comes from optics-physics.js; nothing here decides physics.
import { thinEnds, BANDS } from "./optics-physics.js";

const ASSET = "optics/assets/";
export const IMAGES = ["optical-bench-rail", "bench-carrier", "lens-converging", "lens-diverging", "mirror-concave",
  "mirror-convex", "screen", "candle", "object-figure", "ray-box-lamp", "eye-cross-section"];
export function loadImages(onload) {
  const out = {};
  for (const n of IMAGES) {
    const img = new Image();
    img.decoding = "async";
    img.onload = img.onerror = () => onload && onload(n);
    img.src = ASSET + n + ".webp";
    out[n] = img;
  }
  return out;
}
export const ready = (img) => img && img.complete && img.naturalWidth > 0;
export function readTokens() {
  const cs = getComputedStyle(document.documentElement);
  const g = (n, d) => cs.getPropertyValue(n).trim() || d;
  return {
    paper: g("--op-paper", "#f6f5f0"), ink: g("--op-ink", "#1c1c1c"), dim: g("--op-ink-dim", "#555"),
    grid: g("--op-grid", "#d9d7cf"), ray: g("--op-ray", "#b45000"), normal: g("--op-normal", "#545454"),
    accent: g("--op-accent", "#1f5fae"), glass: g("--op-glass", "#9cc3e6"), mirror: g("--op-mirror", "#6b7280"),
    rod: g("--op-rod", "#8a8a8a"),
    bands: BANDS.map((b, i) => g("--op-band-" + i, "#888")),
    dark: document.documentElement.getAttribute("data-theme") === "dark"
  };
}

// ---------- view: world cm to canvas px (y up in the world) ----------
export function fitView(w, h, bounds, pad = 14) {
  const [x0, y0, x1, y1] = bounds;
  const s = Math.min((w - 2 * pad) / (x1 - x0), (h - 2 * pad) / (y1 - y0));
  const ox = (w - s * (x1 + x0)) / 2, oy = (h + s * (y1 + y0)) / 2;
  return mkView(s, s, ox, oy);
}
export function mkView(sx, sy, ox, oy) {
  return { sx, sy, ox, oy, X: (x) => ox + x * sx, Y: (y) => oy - y * sy, wx: (px) => (px - ox) / sx, wy: (py) => (oy - py) / sy };
}

// ---------- primitives ----------
export function line(ctx, V, a, b, color, width = 2, dash = null, alpha = 1) {
  ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = "round";
  if (dash) ctx.setLineDash(dash);
  ctx.beginPath(); ctx.moveTo(V.X(a[0]), V.Y(a[1])); ctx.lineTo(V.X(b[0]), V.Y(b[1])); ctx.stroke(); ctx.restore();
}
export function text(ctx, s, x, y, color, align = "left", size = 13, weight = 500) {
  ctx.save(); ctx.fillStyle = color; ctx.font = `${weight} ${size}px Inter, system-ui, sans-serif`;
  ctx.textAlign = align; ctx.textBaseline = "middle"; ctx.fillText(s, x, y); ctx.restore();
}
// Arc between two world directions (degrees, counterclockwise from +x), with a label.
export function angleArc(ctx, V, c, a0, a1, rPx, color, label) {
  const lo = Math.min(a0, a1), hi = Math.max(a0, a1);
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.beginPath();
  ctx.arc(V.X(c[0]), V.Y(c[1]), rPx, -hi * Math.PI / 180, -lo * Math.PI / 180); ctx.stroke(); ctx.restore();
  if (label) {
    const m = ((lo + hi) / 2) * Math.PI / 180, r = rPx + 16;
    text(ctx, label, V.X(c[0]) + r * Math.cos(m), V.Y(c[1]) - r * Math.sin(m), color, "center", 13, 600);
  }
}
// Arrow tip on a ray, to show its direction.
function arrowHead(ctx, V, a, b, color, alpha) {
  const ax = V.X(a[0]), ay = V.Y(a[1]), bx = V.X(b[0]), by = V.Y(b[1]);
  const L = Math.hypot(bx - ax, by - ay);
  if (L < 40) return;
  const mx = ax + (bx - ax) * 0.5, my = ay + (by - ay) * 0.5, ux = (bx - ax) / L, uy = (by - ay) / L;
  ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = color; ctx.beginPath();
  ctx.moveTo(mx + ux * 6, my + uy * 6); ctx.lineTo(mx - ux * 5 - uy * 5, my - uy * 5 + ux * 5); ctx.lineTo(mx - ux * 5 + uy * 5, my - uy * 5 - ux * 5);
  ctx.closePath(); ctx.fill(); ctx.restore();
}
export function drawRays(ctx, V, T, segs, opts = {}) {
  const width = opts.width ?? 2.5;
  ctx.save();
  if (!T.dark) ctx.globalCompositeOperation = "multiply"; else ctx.globalCompositeOperation = "lighter";
  for (const s of segs) {
    const color = s.band == null ? T.ray : T.bands[s.band];
    const alpha = Math.max(0.12, Math.min(1, s.w));
    line(ctx, V, s.a, s.b, color, s.band == null ? width : width * 0.8, null, alpha);
    if (opts.arrows !== false && s.band == null) arrowHead(ctx, V, s.a, s.b, color, alpha);
  }
  ctx.restore();
}
export function fillPoly(ctx, V, pts, color, alpha, stroke) {
  ctx.save(); ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(V.X(x), V.Y(y)) : ctx.moveTo(V.X(x), V.Y(y))));
  ctx.closePath(); ctx.globalAlpha = alpha; ctx.fillStyle = color; ctx.fill();
  if (stroke) { ctx.globalAlpha = 1; ctx.strokeStyle = stroke; ctx.lineWidth = 1.5; ctx.stroke(); }
  ctx.restore();
}
// A medium tint grows with its index of refraction.
export const mediumAlpha = (n) => Math.min(0.55, 0.1 + (n - 1) * 0.3);
// Plane mirror: a silver line with hatching on the back.
export function planeMirror(ctx, V, T, el) {
  const [a, b] = thinEnds(el);
  const bx = -Math.cos(el.ang), by = -Math.sin(el.ang); // the back side
  ctx.save(); ctx.strokeStyle = T.mirror; ctx.lineWidth = 1.5;
  const n = Math.max(4, Math.round(el.half * 2 * Math.abs(V.sx) / 10));
  for (let i = 0; i <= n; i++) {
    const u = i / n, x = a[0] + (b[0] - a[0]) * u, y = a[1] + (b[1] - a[1]) * u;
    ctx.beginPath(); ctx.moveTo(V.X(x), V.Y(y));
    ctx.lineTo(V.X(x) + bx * 9 + (b[0] - a[0]) / (2 * el.half) * 6, V.Y(y) - by * 9 - (b[1] - a[1]) / (2 * el.half) * 6); ctx.stroke();
  }
  ctx.restore();
  line(ctx, V, a, b, T.ink, 4);
}
// Draw a sprite rotated about an anchor (sprite px) placed at a canvas point.
export function sprite(ctx, img, ax, ay, k, rot, px, py, flipX = false, flipY = false, alpha = 1) {
  if (!ready(img)) return;
  ctx.save(); ctx.globalAlpha = alpha; ctx.translate(px, py); ctx.rotate(rot); ctx.scale(flipX ? -k : k, flipY ? -k : k);
  ctx.drawImage(img, -ax, -ay); ctx.restore();
}
// Ray box lamp: the aperture ring is centered near (520, 495) in the
// 1024 px art. The beam leaves along d.
export const LAMP = { ax: 520, ay: 495, w: 916 };
export function lamp(ctx, V, img, p, d, lenCm = 7) {
  const k = (lenCm * V.sx) / LAMP.w;
  const rot = Math.atan2(-d[1], d[0]);
  sprite(ctx, img["ray-box-lamp"], LAMP.ax, LAMP.ay, k, rot, V.X(p[0]), V.Y(p[1]));
}
