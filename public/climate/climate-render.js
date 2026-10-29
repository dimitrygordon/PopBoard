// Planetary Climate: drawing helpers. Reads tokens and draws to a 2D canvas.
// Every number comes from climate-physics.js; nothing here decides physics.

const ASSET = "climate/assets/";
export const IMAGES = ["sun-mask", "earth", "venus", "mars", "atmosphere-haze-disc", "atmosphere-shell-1", "atmosphere-shell-2",
  "atmosphere-shell-3", "atmosphere-shell-4", "ice-cap-north", "ice-cap-south", "cloud-1", "cloud-2", "cloud-3", "ground-strip",
  "molecule-co2", "molecule-h2o", "molecule-ch4", "molecule-co2-mask", "molecule-h2o-mask", "molecule-ch4-mask"];
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
    paper: g("--cl-paper", "#f6f5f0"), ink: g("--cl-ink", "#1c1c1c"), dim: g("--cl-ink-dim", "#555"), grid: g("--cl-grid", "#e2e0d8"),
    accent: g("--cl-accent", "#1f5fae"), warn: g("--cl-warn", "#b45000"), sun: g("--cl-sun", "#8f6100"), ir: g("--cl-ir", "#c0392b"),
    cool: g("--cl-cool", "#1f5fae"), sky: g("--cl-sky", "#e9eef5"),
    dark: document.documentElement.getAttribute("data-theme") === "dark"
  };
}
export function text(ctx, s, x, y, color, align = "left", size = 13, weight = 500, base = "middle") {
  ctx.save(); ctx.fillStyle = color; ctx.font = `${weight} ${size}px Inter, system-ui, sans-serif`;
  ctx.textAlign = align; ctx.textBaseline = base; ctx.fillText(s, x, y); ctx.restore();
}
export function line(ctx, x0, y0, x1, y1, color, width = 2, dash = null, alpha = 1) {
  ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = "round";
  if (dash) ctx.setLineDash(dash);
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); ctx.restore();
}
export function arrow(ctx, x0, y0, x1, y1, color, width = 2, wavy = false, phase = 0) {
  const a = Math.atan2(y1 - y0, x1 - x0), h = 8 + width, L = Math.hypot(x1 - x0, y1 - y0);
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = "round"; ctx.beginPath();
  const ex = x1 - (h * 0.8) * Math.cos(a), ey = y1 - (h * 0.8) * Math.sin(a);
  if (wavy) {
    const n = Math.max(2, Math.floor((L - h) / 3));
    for (let i = 0; i <= n; i++) {
      const f = i / n, w = Math.sin(f * (L - h) / 7 - phase) * 4;
      const x = x0 + (ex - x0) * f - Math.sin(a) * w, y = y0 + (ey - y0) * f + Math.cos(a) * w;
      if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    }
  } else { ctx.moveTo(x0, y0); ctx.lineTo(ex, ey); }
  ctx.stroke(); ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(x1, y1);
  ctx.lineTo(x1 - h * Math.cos(a - 0.45), y1 - h * Math.sin(a - 0.45)); ctx.lineTo(x1 - h * Math.cos(a + 0.45), y1 - h * Math.sin(a + 0.45));
  ctx.closePath(); ctx.fill(); ctx.restore();
}
// Draw an image so that its anchor (art px) lands at (px, py), scaled by k.
export function sprite(ctx, img, ax, ay, k, px, py, alpha = 1) {
  if (!ready(img)) return;
  ctx.save(); ctx.globalAlpha = alpha; ctx.translate(px, py); ctx.scale(k, k); ctx.drawImage(img, -ax, -ay); ctx.restore();
}
// Tint a grayscale mask by multiplying with a color, keeping the mask's alpha (cached per image and color).
const tintCache = new Map();
export function tinted(img, color) {
  if (!ready(img)) return null;
  const key = img.src + "|" + color;
  if (tintCache.has(key)) return tintCache.get(key);
  const c = document.createElement("canvas"); c.width = img.naturalWidth; c.height = img.naturalHeight;
  const x = c.getContext("2d");
  x.drawImage(img, 0, 0); x.globalCompositeOperation = "multiply"; x.fillStyle = color; x.fillRect(0, 0, c.width, c.height);
  x.globalCompositeOperation = "destination-in"; x.drawImage(img, 0, 0);
  c.complete = true; c.naturalWidth = c.width;
  tintCache.set(key, c); return c;
}
export function sun(ctx, img, x, y, r, color = "#ffc43c") {
  const t = tinted(img["sun-mask"], color); if (!t) return;
  sprite(ctx, t, 512, 512, (2 * r) / 1024, x, y);
}
// Molecule: grayscale art, with its tint mask drawn over it in a color when it glows (absorbs infrared).
export function molecule(ctx, img, id, x, y, size, glow = null, alpha = 1) {
  sprite(ctx, img["molecule-" + id], 128, 128, size / 256, x, y, alpha);
  if (glow) { const t = tinted(img["molecule-" + id + "-mask"], glow); if (t) sprite(ctx, t, 128, 128, size / 256, x, y, alpha); }
}
// Planet with atmosphere: shell frame 1024 with the planet disc (radius 505.5 in its own frame) at radius 360.
const SHELL_TINT = { venus: "#f0d27a", earth: "#7fb2ff", mars: "#e8a07a" };
export function planet(ctx, img, id, x, y, R, o = {}) {
  // R is the planet disc radius in px. Shell frame px per art px:
  const k = R / 360;
  sprite(ctx, img[id], 511.5, 511.5, R / 505.5, x, y);
  if (o.ice > 0) for (const c of ["ice-cap-north", "ice-cap-south"]) sprite(ctx, img[c], 511.5, 511.5, R / 505.5, x, y, Math.min(1, o.ice));
  if (o.haze > 0) { const t = tinted(img["atmosphere-haze-disc"], o.hazeColor || SHELL_TINT[id]); if (t) sprite(ctx, t, 511.5, 511.5, R / 505.5, x, y, Math.min(0.92, o.haze)); }
  const n = o.shells || 0;
  for (let i = 1; i <= Math.min(4, Math.ceil(n)); i++) {
    const t = tinted(img["atmosphere-shell-" + i], SHELL_TINT[id] || "#7fb2ff");
    if (t) sprite(ctx, t, 512, 512, k, x, y, Math.max(0.15, Math.min(1, n - i + 1)));
  }
}
export function cloud(ctx, img, i, x, y, w, alpha = 1) { sprite(ctx, img["cloud-" + i], 256, 256, w / 512, x, y, alpha); }
// Ground strip tiled across the width, bottom edge at y, height h.
export function ground(ctx, img, x0, x1, yBottom, h) {
  const g = img["ground-strip"]; if (!ready(g)) return;
  const k = h / g.naturalHeight, w = g.naturalWidth * k;
  for (let x = x0; x < x1; x += w - 1) ctx.drawImage(g, x, yBottom - h, w, h);
}
// Thermometer: vertical tube from lo to hi K with a fill to T and optional marks.
export function thermometer(ctx, T, x, y, h, Tval, lo, hi, color, marks = []) {
  const f = (v) => y + h - (h * (Math.min(hi, Math.max(lo, v)) - lo)) / (hi - lo);
  ctx.save(); ctx.strokeStyle = T.ink; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x - 7, y - 4, 14, h + 4, 7) : ctx.rect(x - 7, y - 4, 14, h + 4); ctx.stroke();
  ctx.fillStyle = color; ctx.fillRect(x - 4, f(Tval), 8, y + h - f(Tval));
  ctx.beginPath(); ctx.arc(x, y + h + 9, 11, 0, 2 * Math.PI); ctx.fill(); ctx.stroke(); ctx.restore();
  for (const m of marks) { line(ctx, x + 8, f(m.v), x + 16, f(m.v), T.dim, 1.5); text(ctx, m.label, x + 20, f(m.v), m.color || T.dim, "left", 12, 600); }
}
// Horizontal bar with a label.
export function bar(ctx, T, x, y, w, h, frac, color, label, value) {
  ctx.save(); ctx.fillStyle = color; ctx.fillRect(x, y, Math.max(1, w * Math.min(1, frac)), h);
  ctx.strokeStyle = T.ink; ctx.lineWidth = 1; ctx.strokeRect(x, y, w, h); ctx.restore();
  if (label) text(ctx, label, x, y - 9, T.ink, "left", 12, 600);
  if (value) text(ctx, value, x + w, y - 9, T.ink, "right", 12, 600);
}
