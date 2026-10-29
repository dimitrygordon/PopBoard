// Quantum Physics: drawing helpers. Reads tokens and draws to a 2D canvas.
// Every number comes from quantum-physics.js; nothing here decides physics.
import { lamRGB } from "./quantum-physics.js";

const ASSET = "quantum/assets/";
export const IMAGES = ["atom-energy-rings", "atom-nucleus", "detector-screen-front", "double-slit-plate", "electron-gun",
  "light-source-lamp", "metal-plate", "detector", "measurement-eye-icon-small", "electron-blue", "electron-wave-fuzzy",
  "photon-red", "photon-green", "photon-violet", "photon-uv"];
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
    paper: g("--qu-paper", "#f6f5f0"), ink: g("--qu-ink", "#1c1c1c"), dim: g("--qu-ink-dim", "#555"),
    grid: g("--qu-grid", "#e2e0d8"), accent: g("--qu-accent", "#1f5fae"), warn: g("--qu-warn", "#b45000"),
    hit: g("--qu-hit-dot", "#6fb6ff"), face: g("--qu-face", "#454545"), level: g("--qu-level", "#545454"),
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
export function arrow(ctx, x0, y0, x1, y1, color, width = 2) {
  line(ctx, x0, y0, x1, y1, color, width);
  const a = Math.atan2(y1 - y0, x1 - x0), h = 8 + width;
  ctx.save(); ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(x1, y1);
  ctx.lineTo(x1 - h * Math.cos(a - 0.4), y1 - h * Math.sin(a - 0.4)); ctx.lineTo(x1 - h * Math.cos(a + 0.4), y1 - h * Math.sin(a + 0.4));
  ctx.closePath(); ctx.fill(); ctx.restore();
}
// Draw an image so that its anchor (art px) lands at (px, py), scaled by k.
export function sprite(ctx, img, ax, ay, k, px, py, alpha = 1, flipX = false) {
  if (!ready(img)) return;
  ctx.save(); ctx.globalAlpha = alpha; ctx.translate(px, py); ctx.scale(flipX ? -k : k, k);
  ctx.drawImage(img, -ax, -ay); ctx.restore();
}
export const rgb = (lam, a = 1) => { const [r, g, b] = lamRGB(lam); return `rgba(${r},${g},${b},${a})`; };
// Photon sprite preset nearest the wavelength (no tinting needed).
export function photonArt(img, lam) {
  if (lam < 400) return img["photon-uv"];
  if (lam < 480) return img["photon-violet"];
  if (lam < 590) return img["photon-green"];
  return img["photon-red"];
}
export function photon(ctx, img, lam, x, y, size) { sprite(ctx, photonArt(img, lam), 128, 128, size / 256, x, y); }
export function electron(ctx, img, x, y, size, fuzzy = false) {
  sprite(ctx, img[fuzzy ? "electron-wave-fuzzy" : "electron-blue"], 128, 128, size / 256, x, y);
}
// A sine wave packet of the given pixel wavelength between x0 and x1.
export function wave(ctx, x0, x1, y, lamPx, amp, color, phase = 0, width = 2.5) {
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath();
  for (let x = x0; x <= x1; x += 1) {
    const yy = y - amp * Math.sin((2 * Math.PI * (x - x0)) / lamPx - phase);
    if (x === x0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
  }
  ctx.stroke(); ctx.restore();
}
// Horizontal spectrum strip from lo to hi nm with optional marks.
export function spectrum(ctx, T, x, y, w, h, lo, hi, marks = [], log = false) {
  const X = (l) => x + w * (log ? Math.log(l / lo) / Math.log(hi / lo) : (l - lo) / (hi - lo));
  ctx.save();
  for (let i = 0; i < w; i++) {
    const l = log ? lo * (hi / lo) ** (i / w) : lo + ((hi - lo) * i) / w;
    ctx.fillStyle = l >= 380 && l <= 750 ? rgb(l) : T.dark ? "#2a2e3b" : "#d9d7cf";
    ctx.fillRect(x + i, y, 1.5, h);
  }
  ctx.strokeStyle = T.ink; ctx.lineWidth = 1; ctx.strokeRect(x, y, w, h);
  ctx.restore();
  for (const m of marks) {
    const mx = X(m.nm);
    if (mx < x - 1 || mx > x + w + 1) continue;
    line(ctx, mx, y - 4, mx, y + h + 4, m.color || T.ink, m.width || 2);
    if (m.label) text(ctx, m.label, mx, y + h + 14, m.labelColor || T.ink, "center", 12, 600);
  }
  return X;
}
