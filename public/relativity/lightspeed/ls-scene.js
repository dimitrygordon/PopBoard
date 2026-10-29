// Relativity "Lightspeed Ride" view: an aberrated, Doppler-colored starfield seen through
// Leo's cockpit frame. The view through the panes is black space in both themes; only the
// frame, page and panel follow Paper. All three window panes in the art are transparent, so the stars are
// drawn first and the frame is laid on top.
import { view, brightness, tempToRGB, CONE_DEG } from "./ls-model.js";
export const CAPTION_GAP = 12;
export const ART_W = 1920, ART_H = 1080;
// The windshield's middle in art pixels, and the focal length that puts about 60 degrees
// at the windshield's left and right edges.
const AIM = { x: 960, y: 480 }, FOCAL = 430;
const ART = "relativity/assets/lightspeed/cockpit-frame.webp";

export function palettes(theme) {
  return theme === "light"
    ? { page: "#f3efe4", sky: "#03050b", ink: "#1f2328", dim: "#50575e", accent: "#5fb3ad", dust: "rgba(220,232,240,0.45)", light: true }
    : { page: "#0b0f17", sky: "#03050b", ink: "#e9eef0", dim: "#a3afb5", accent: "#5fb3ad", dust: "rgba(220,232,240,0.45)", light: false };
}

export function createScene(canvas) {
  const ctx = canvas.getContext("2d");
  const img = new Image();
  const ready = new Promise((res) => { img.onload = img.onerror = () => res(); img.src = ART; });
  let pal = palettes("dark"), dpr = 1;
  const art = { x: 0, y: 0, w: 0, h: 0, s: 1 };
  const dust = [];
  function resize() { dpr = Math.min(2, devicePixelRatio || 1); canvas.width = Math.round(canvas.clientWidth * dpr); canvas.height = Math.round(canvas.clientHeight * dpr); }
  // Fit the cockpit art inside the box, keeping capRoom free underneath for the caption.
  function setBox(box, capRoom) {
    const s = Math.max(0.05, Math.min(box.w / ART_W, (box.h - capRoom) / ART_H));
    const w = ART_W * s, h = ART_H * s;
    Object.assign(art, { s, w, h, x: Math.round(box.x + (box.w - w) / 2), y: Math.round(box.y) });
    return art;
  }
  // Draw one field of stars at speed beta, aimed at (cx, cy) with focal length f, clipped to rect.
  function field(stars, beta, opt, cx, cy, f, rect) {
    ctx.save(); ctx.beginPath(); ctx.rect(rect.x, rect.y, rect.w, rect.h); ctx.clip();
    ctx.fillStyle = pal.sky; ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    if (opt.cone) {
      ctx.setLineDash([5, 6]); ctx.strokeStyle = pal.accent; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.8;
      ctx.beginPath(); ctx.arc(cx, cy, f * Math.tan(CONE_DEG * Math.PI / 180), 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
    }
    const seen = view(stars, beta, opt), s = Math.max(0.5, art.s * 1.6);
    for (const p of seen) {
      if (p.z < 0.12) continue;
      const x = cx + (f * p.x) / p.z, y = cy - (f * p.y) / p.z;
      if (x < rect.x - 4 || x > rect.x + rect.w + 4 || y < rect.y - 4 || y > rect.y + rect.h + 4) continue;
      const b = opt.dopplerOn ? brightness(p.D) : 1, a = Math.min(1, 0.25 + 0.75 * p.mag * Math.min(1, b));
      const r = Math.min(4.2, (0.7 + 1.5 * p.mag) * Math.sqrt(Math.min(b, 4)) * s);
      let [R, G, B] = opt.dopplerOn ? tempToRGB(p.T) : [255, 255, 255];
      ctx.globalAlpha = a; ctx.fillStyle = `rgb(${R},${G},${B})`;
      ctx.beginPath(); ctx.arc(x, y, Math.max(0.6, r), 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1; ctx.restore();
    return seen;
  }
  // Illustrative speed dust: specks streaming out from the middle, faster at higher rapidity.
  function drawDust(rate, dt, cx, cy, rect) {
    if (dust.length < 70) for (let i = dust.length; i < 70; i++) dust.push({ a: Math.random() * Math.PI * 2, d: Math.random() });
    ctx.save(); ctx.beginPath(); ctx.rect(rect.x, rect.y, rect.w, rect.h); ctx.clip();
    ctx.strokeStyle = pal.dust; ctx.lineWidth = 1;
    const R = Math.hypot(rect.w, rect.h) / 2;
    for (const p of dust) {
      p.d += dt * rate * (0.25 + p.d); if (p.d > 1) { p.d = 0.02 + Math.random() * 0.05; p.a = Math.random() * Math.PI * 2; }
      const r0 = R * p.d * p.d, r1 = R * Math.min(1, p.d + 0.02 + 0.05 * rate) ** 2;
      ctx.beginPath(); ctx.moveTo(cx + r0 * Math.cos(p.a), cy + r0 * Math.sin(p.a)); ctx.lineTo(cx + r1 * Math.cos(p.a), cy + r1 * Math.sin(p.a)); ctx.stroke();
    }
    ctx.restore();
  }
  function label(text, x, y) {
    ctx.font = `600 ${Math.max(11, Math.round(15 * Math.min(1, art.s * 2)))}px system-ui, sans-serif`;
    const w = ctx.measureText(text).width + 14, h = 22;
    ctx.fillStyle = "rgba(11,15,23,0.85)"; ctx.fillRect(x - w / 2, y, w, h);
    ctx.fillStyle = "#e9eef0"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(text, x, y + h / 2 + 1);
  }
  // o: { beta, aberration, dopplerOn, cone, dust, rapidity, dt, compare }
  function draw(stars, o) {
    const W = canvas.width / dpr, H = canvas.height / dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = pal.page; ctx.fillRect(0, 0, W, H);
    const rect = { x: art.x, y: art.y, w: art.w, h: art.h };
    const cx = art.x + AIM.x * art.s, cy = art.y + AIM.y * art.s, f = FOCAL * art.s;
    const opt = { aberration: o.aberration, dopplerOn: o.dopplerOn, cone: o.cone };
    let seen;
    if (o.compare) {
      // Reduced motion: still before and after views, side by side, each through half the windshield.
      const half = { ...rect, w: rect.w / 2 }, right = { ...half, x: rect.x + rect.w / 2 };
      field(stars, 0, opt, half.x + half.w / 2, cy, f / 2, half);
      seen = field(stars, o.beta, opt, right.x + right.w / 2, cy, f / 2, right);
      ctx.strokeStyle = pal.accent; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(right.x, rect.y); ctx.lineTo(right.x, rect.y + rect.h); ctx.stroke();
    } else {
      seen = field(stars, o.beta, opt, cx, cy, f, rect);
      if (o.dust && o.rapidity > 0.01) drawDust(o.rapidity, o.dt, cx, cy, rect);
    }
    if (img.naturalWidth) ctx.drawImage(img, art.x, art.y, art.w, art.h);
    if (o.compare) { const ly = art.y + 235 * art.s; label("Before: at rest", art.x + art.w * 0.25, ly); label(`After: ${o.beta.toFixed(3)} c`, art.x + art.w * 0.75, ly); }
    return seen;
  }
  return { resize, setBox, draw, art, ready, setTheme(t) { pal = palettes(t); }, get pal() { return pal; } };
}
