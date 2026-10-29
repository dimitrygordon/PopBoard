// Gases & Thermodynamics: drawing. Reads state and draws to 2D canvases.
// Every number comes from gas-physics.js; nothing here decides physics.

import {
  ART, L, T_MIN, T_MAX, thermoY, gaugeAngle, GAUGE_START, GAUGE_SWEEP, pistonTopFor, sig
} from "./gas-physics.js";

const ASSET = "gas-thermo/assets/";
export const IMAGES = ["cylinder-body", "cylinder-gas-fill-mask", "piston", "thermometer-body", "thermometer-liquid-mask",
  "pressure-gauge-body", "bunsen-burner", "flame-mask", "hot-plate", "ice-bath",
  "particle-xs", "particle-s", "particle-m", "particle-l", "weight-small", "weight-large"];
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
const ready = (img) => img && img.complete && img.naturalWidth > 0;

export function readTokens() {
  const cs = getComputedStyle(document.documentElement);
  const g = (n, d) => cs.getPropertyValue(n).trim() || d;
  return {
    paper: g("--gt-paper", "#f6f5f0"), ink: g("--gt-ink", "#1c1c1c"), dim: g("--gt-ink-dim", "#555"),
    grid: g("--gt-grid", "#d6d4cc"), hot: g("--gt-hot", "#b3261e"), cold: g("--gt-cold", "#1f5fae"),
    iso: g("--gt-iso", "#1f5fae"), adia: g("--gt-adia", "#b3261e"), work: g("--gt-work", "#7a4f00"),
    accent: g("--gt-accent", "#c25a00"), liquid: g("--gt-liquid", "#d0312d"),
    gasCold: g("--gt-gas-cold", "#c9dcf2"), gasHot: g("--gt-gas-hot", "#f3c09a"),
    dark: document.documentElement.getAttribute("data-theme") === "dark"
  };
}

// ---------- tinting (cached offscreen canvases) ----------
const tintCache = new Map();
// "flat": replace the color of a flat mask. "multiply": shade a gray sprite.
export function tinted(img, color, how = "flat") {
  if (!ready(img)) return null;
  const key = img.src + "|" + color + "|" + how;
  let c = tintCache.get(key);
  if (c) return c;
  c = document.createElement("canvas");
  c.width = img.naturalWidth; c.height = img.naturalHeight;
  const x = c.getContext("2d");
  x.drawImage(img, 0, 0);
  if (how === "flat") { x.globalCompositeOperation = "source-in"; x.fillStyle = color; x.fillRect(0, 0, c.width, c.height); }
  else {
    x.globalCompositeOperation = "multiply"; x.fillStyle = color; x.fillRect(0, 0, c.width, c.height);
    x.globalCompositeOperation = "destination-in"; x.drawImage(img, 0, 0);
  }
  if (tintCache.size > 300) tintCache.clear();
  tintCache.set(key, c);
  return c;
}
export function mix(a, b, u) {
  const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const A = p(a), B = p(b), k = Math.min(1, Math.max(0, u));
  return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, "0")).join("");
}

// ---------- scene layout (units = px of the 1024 cylinder frame) ----------
export const LAYOUT = Object.freeze({
  thermo: { x: -230, y: 150, s: 0.75 },
  gauge: { x: 700, y: 100, s: 0.42 },
  burner: { x: 297, y: 952, s: 0.42 },
  plate: { x: 256, y: 828, s: 0.5 },
  ice: { x: 256, y: 838, s: 0.5 },
  x0: 20, x1: 1090, bottom: 1345
});
export function sceneView(w, h, top) {
  const sw = LAYOUT.x1 - LAYOUT.x0, sh = LAYOUT.bottom - top;
  const s = Math.min(w / sw, h / sh);
  const ox = (w - sw * s) / 2 - LAYOUT.x0 * s, oy = (h - sh * s) / 2 - top * s;
  return { s, ox, oy, X: (x) => ox + x * s, Y: (y) => oy + y * s, inv: (px, py) => ({ x: (px - ox) / s, y: (py - oy) / s }) };
}
function place(ctx, V, img, fx, fy, fs) {
  if (!img) return;
  const w = (img.naturalWidth || img.width) * fs, h = (img.naturalHeight || img.height) * fs;
  ctx.drawImage(img, V.X(fx), V.Y(fy), w * V.s, h * V.s);
}

export const DOT_R = Object.freeze({ "particle-xs": 5, "particle-s": 6.5, "particle-m": 8, "particle-l": 10 });
export const GAS_COLORS = Object.freeze({ he: "#e0a21b", ne: "#e0553d", n2: "#4f7fd6", o2: "#43a26b", ar: "#9a62d1" });

// The whole apparatus. s: { V, T, P, gaugeFull, parts: [{x,y,gas}], gases, source, heat, locked, weights, flashes }
export function drawApparatus(ctx, V, T, img, s) {
  const top = pistonTopFor(s.V), dy = top - ART.piston.top;
  const gasTop = top + ART.piston.height;
  const u = (s.T - T_MIN) / (T_MAX - T_MIN);
  // 1. heat source under the cylinder
  drawSource(ctx, V, img, s.source, s.heat || 0, s.flicker || 0);
  // 2. gas fill (clipped below the piston head), 3. particles, 4. cylinder body
  const fill = tinted(img["cylinder-gas-fill-mask"], mix(T.gasCold, T.gasHot, u));
  if (fill) {
    ctx.save();
    ctx.beginPath(); ctx.rect(V.X(0), V.Y(gasTop), 1024 * V.s, (ART.bore.floor + 4 - gasTop) * V.s); ctx.clip();
    place(ctx, V, fill, 0, 0, 1);
    ctx.restore();
  }
  for (const f of s.flashes || []) {
    ctx.fillStyle = T.accent; ctx.globalAlpha = Math.max(0, f.life);
    ctx.beginPath(); ctx.arc(V.X(f.x), V.Y(f.y), 5 * V.s + 2, 0, 7); ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (const p of s.parts || []) {
    const g = s.gases[p.gas];
    const sp = tinted(img[g.sprite], GAS_COLORS[g.id], "multiply");
    const r = DOT_R[g.sprite], size = 256 * r / ART.particleR[g.sprite];
    if (sp) ctx.drawImage(sp, V.X(p.x - size / 2), V.Y(p.y - size / 2), size * V.s, size * V.s);
    else { ctx.fillStyle = GAS_COLORS[g.id]; ctx.beginPath(); ctx.arc(V.X(p.x), V.Y(p.y), r * V.s, 0, 7); ctx.fill(); }
  }
  if (ready(img["cylinder-body"])) place(ctx, V, img["cylinder-body"], 0, 0, 1);
  // 5. piston, moved only along y
  if (ready(img.piston)) place(ctx, V, img.piston, 0, dy, 1);
  if (s.locked) {
    // two pins through the wall just above the piston head
    ctx.fillStyle = T.ink;
    for (const x of [ART.bore.x0 - 30, ART.bore.x1 + 6]) ctx.fillRect(V.X(x), V.Y(top - 14), 24 * V.s, 12 * V.s);
  }
  // 6. weights stacked on the handle (handle top at y 24 in the piston frame)
  let wy = ART.piston.handleTop + dy;
  for (const w of s.weights || []) {
    const im = img[w === "large" ? "weight-large" : "weight-small"];
    if (!ready(im)) continue;
    const sz = 200, bottom = w === "large" ? 186 : 166;  // ink bottom in the 256 frame
    const topY = w === "large" ? 48 : 68;
    place(ctx, V, im, 512 - sz / 2, wy - bottom * sz / 256 + 2, sz / 256);
    wy -= (bottom - topY) * sz / 256 - 2;
  }
  drawThermometer(ctx, V, T, img, s.T);
  drawGauge(ctx, V, T, img, s.P, s.gaugeFull || 400e3);
}

function drawSource(ctx, V, img, source, heat, flicker) {
  if (source === "burner" && ready(img["bunsen-burner"])) {
    const b = LAYOUT.burner;
    place(ctx, V, img["bunsen-burner"], b.x, b.y, b.s);
    const fm = img["flame-mask"];
    if (ready(fm) && heat > 0) {
      // tinted flame over the built-in one; height shows the heat level
      const f = ART.burnerFlame, cx = b.x + (f.x0 + f.x1) / 2 * b.s, base = b.y + f.bottom * b.s;
      const w = (f.x1 - f.x0) * b.s * 1.5, h = (f.bottom - f.top) * b.s * (0.7 + 0.8 * heat) * (1 + 0.04 * flicker);
      const t = tinted(fm, heat > 0.6 ? "#f08a24" : "#4a8fe0", "multiply");
      // flame-mask content spans x 66 to 190, y 26 to 234 of 256
      const kx = w / 124, ky = h / 208;
      ctx.globalAlpha = 0.9;
      ctx.drawImage(t, V.X(cx - 128 * kx), V.Y(base - 234 * ky), 256 * kx * V.s, 256 * ky * V.s);
      ctx.globalAlpha = 1;
    }
  } else if (source === "plate" && ready(img["hot-plate"])) {
    const p = LAYOUT.plate;
    place(ctx, V, img["hot-plate"], p.x, p.y, p.s);
    if (heat > 0) {
      // the dark plate glows: an ellipse over the top surface
      ctx.save();
      ctx.globalAlpha = 0.25 + 0.5 * heat; ctx.fillStyle = "#e8541e";
      ctx.beginPath(); ctx.ellipse(V.X(p.x + 470 * p.s), V.Y(p.y + 360 * p.s), 250 * p.s * V.s, 62 * p.s * V.s, 0, 0, 7); ctx.fill();
      ctx.restore();
    }
  } else if (source === "ice" && ready(img["ice-bath"])) {
    const p = LAYOUT.ice;
    place(ctx, V, img["ice-bath"], p.x, p.y, p.s);
  }
}

export function drawThermometer(ctx, V, T, img, temp) {
  const t = LAYOUT.thermo, a = ART.thermo;
  const fx = (x) => t.x + x * t.s, fy = (y) => t.y + y * t.s;
  if (ready(img["thermometer-body"])) place(ctx, V, img["thermometer-body"], t.x, t.y, t.s);
  // ticks every 50 K, labels every 100 K, drawn left of the tube
  ctx.strokeStyle = T.ink; ctx.fillStyle = T.ink; ctx.lineWidth = Math.max(1, 2 * V.s);
  ctx.font = `${Math.max(10, Math.round(30 * V.s))}px ui-monospace, Menlo, monospace`;
  ctx.textAlign = "right"; ctx.textBaseline = "middle";
  for (let k = T_MIN; k <= T_MAX; k += 50) {
    const y = fy(thermoY(k)), major = k % 100 === 0;
    const xr = fx(a.boreX0 - 6), xl = xr - (major ? 28 : 16) * t.s;
    ctx.beginPath(); ctx.moveTo(V.X(xl), V.Y(y)); ctx.lineTo(V.X(xr), V.Y(y)); ctx.stroke();
    if (major) ctx.fillText(String(k), V.X(fx(440)), V.Y(y));
  }
  ctx.textAlign = "center";
  ctx.fillText("K", V.X(fx(509)), V.Y(fy(20)));
  // liquid column in the bore, same color as the tinted bulb mask
  const yTop = fy(thermoY(temp)), yBot = fy(a.boreBottom + 4);
  ctx.fillStyle = T.liquid;
  ctx.fillRect(V.X(fx(a.boreX0)), V.Y(yTop), (a.boreX1 - a.boreX0 + 1) * t.s * V.s, (yBot - yTop) * V.s);
  const m = tinted(img["thermometer-liquid-mask"], T.liquid);
  if (m) place(ctx, V, m, t.x, t.y, t.s);
}

export function drawGauge(ctx, V, T, img, P, full) {
  const g = LAYOUT.gauge, a = ART.gauge;
  if (ready(img["pressure-gauge-body"])) place(ctx, V, img["pressure-gauge-body"], g.x, g.y, g.s);
  const cx = V.X(g.x + a.cx * g.s), cy = V.Y(g.y + a.cy * g.s), r = a.r * g.s * V.s;
  // The face is opaque white in both themes, so its marks stay dark.
  const faceInk = "#1c1c1c";
  ctx.strokeStyle = faceInk; ctx.fillStyle = faceInk;
  const major = full / 4, minor = full / 20;
  ctx.font = `${Math.max(9, Math.round(r * 0.16))}px ui-monospace, Menlo, monospace`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  for (let i = 0; i <= 20; i++) {
    const v = i * minor, ang = gaugeAngle(v, full), isMajor = i % 5 === 0;
    const r0 = r * (isMajor ? 0.78 : 0.85), r1 = r * 0.93;
    ctx.lineWidth = isMajor ? 2 : 1;
    ctx.beginPath(); ctx.moveTo(cx + r0 * Math.cos(ang), cy + r0 * Math.sin(ang)); ctx.lineTo(cx + r1 * Math.cos(ang), cy + r1 * Math.sin(ang)); ctx.stroke();
    if (isMajor) ctx.fillText(String(Math.round(v / 1000)), cx + r * 0.62 * Math.cos(ang), cy + r * 0.62 * Math.sin(ang));
  }
  ctx.font = `${Math.max(9, Math.round(r * 0.14))}px system-ui, sans-serif`;
  ctx.fillText("kPa", cx, cy + r * 0.66);
  const ang = gaugeAngle(P, full);
  ctx.strokeStyle = "#c0261b"; ctx.lineWidth = Math.max(2, r * 0.035); ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(cx - r * 0.12 * Math.cos(ang), cy - r * 0.12 * Math.sin(ang)); ctx.lineTo(cx + r * 0.8 * Math.cos(ang), cy + r * 0.8 * Math.sin(ang)); ctx.stroke();
  ctx.lineCap = "butt"; ctx.fillStyle = faceInk;
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.06, 0, 7); ctx.fill();
}

// ---------- graphs ----------
export function axes(ctx, w, h, T, o) {
  const pad = { l: 58, r: 14, t: 26, b: 42 };
  const G = {
    x0: pad.l, x1: w - pad.r, y0: h - pad.b, y1: pad.t, ...o,
    X(v) { return this.x0 + (v - this.xmin) / (this.xmax - this.xmin) * (this.x1 - this.x0); },
    Y(v) { return this.y0 - (v - this.ymin) / (this.ymax - this.ymin) * (this.y0 - this.y1); }
  };
  ctx.fillStyle = T.paper; ctx.fillRect(0, 0, w, h);
  ctx.font = "12px ui-monospace, Menlo, monospace"; ctx.fillStyle = T.dim; ctx.strokeStyle = T.grid; ctx.lineWidth = 1;
  ctx.textAlign = "center"; ctx.textBaseline = "top";
  for (const v of o.xticks) {
    const x = G.X(v); ctx.beginPath(); ctx.moveTo(x, G.y0); ctx.lineTo(x, G.y1); ctx.stroke();
    ctx.fillText(o.xfmt ? o.xfmt(v) : String(v), x, G.y0 + 4);
  }
  ctx.textAlign = "right"; ctx.textBaseline = "middle";
  for (const v of o.yticks) {
    const y = G.Y(v); ctx.beginPath(); ctx.moveTo(G.x0, y); ctx.lineTo(G.x1, y); ctx.stroke();
    ctx.fillText(o.yfmt ? o.yfmt(v) : String(v), G.x0 - 6, y);
  }
  ctx.strokeStyle = T.ink; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(G.x0, G.y1); ctx.lineTo(G.x0, G.y0); ctx.lineTo(G.x1, G.y0); ctx.stroke();
  ctx.fillStyle = T.ink; ctx.font = "13px system-ui, sans-serif";
  ctx.textAlign = "center"; ctx.textBaseline = "bottom"; ctx.fillText(o.xlabel, (G.x0 + G.x1) / 2, h - 4);
  ctx.textAlign = "left"; ctx.textBaseline = "top"; ctx.fillText(o.ylabel, 6, 6);
  return G;
}
export function line(ctx, G, pts, color, width = 2, dash = null) {
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.setLineDash(dash || []);
  ctx.beginPath();
  pts.forEach((p, i) => { const x = G.X(p[0]), y = G.Y(p[1]); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
  ctx.stroke(); ctx.setLineDash([]);
}
export function dot(ctx, G, x, y, color, r = 6) {
  ctx.fillStyle = color; ctx.beginPath(); ctx.arc(G.X(x), G.Y(y), r, 0, 7); ctx.fill();
  ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 1.5; ctx.stroke();
}
export function label(ctx, G, x, y, text, color, align = "left", dx = 8, dy = -8) {
  ctx.fillStyle = color; ctx.font = "13px system-ui, sans-serif"; ctx.textAlign = align; ctx.textBaseline = "middle";
  ctx.fillText(text, G.X(x) + dx, G.Y(y) + dy);
}
export function legend(ctx, w, T, items) {
  ctx.font = "13px system-ui, sans-serif"; ctx.textBaseline = "middle"; ctx.textAlign = "left";
  let x = w - 14;
  for (const it of [...items].reverse()) {
    const tw = ctx.measureText(it.text).width;
    x -= tw; ctx.fillStyle = T.ink; ctx.fillText(it.text, x, 14);
    x -= 22; ctx.strokeStyle = it.color; ctx.lineWidth = 3; ctx.setLineDash(it.dash || []);
    ctx.beginPath(); ctx.moveTo(x, 14); ctx.lineTo(x + 16, 14); ctx.stroke(); ctx.setLineDash([]);
    x -= 14;
  }
}
// Bars that may be negative: [{label, value, color}]
export function bars(ctx, w, h, T, items, unit, lim) {
  const pad = { l: 58, r: 14, t: 30, b: 40 };
  ctx.fillStyle = T.paper; ctx.fillRect(0, 0, w, h);
  const y0 = pad.t, y1 = h - pad.b, mid = lim.min < 0 ? y0 + (y1 - y0) * lim.max / (lim.max - lim.min) : y1;
  const Y = (v) => mid - (v / lim.max) * (mid - y0);
  const bw = Math.min(90, (w - pad.l - pad.r) / items.length * 0.55);
  ctx.strokeStyle = T.ink; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(pad.l, mid); ctx.lineTo(w - pad.r, mid); ctx.stroke();
  items.forEach((it, i) => {
    const cx = pad.l + (i + 0.5) * (w - pad.l - pad.r) / items.length;
    const yv = Y(it.value);
    ctx.fillStyle = it.color; ctx.fillRect(cx - bw / 2, Math.min(mid, yv), bw, Math.abs(yv - mid));
    ctx.fillStyle = T.ink; ctx.font = "13px system-ui, sans-serif"; ctx.textAlign = "center";
    ctx.textBaseline = "top"; ctx.fillText(it.label, cx, h - pad.b + 6);
    ctx.textBaseline = it.value >= 0 ? "bottom" : "top";
    ctx.fillText(`${it.value < 0 ? "\u2212" : ""}${sig(Math.abs(it.value))} ${unit}`, cx, yv + (it.value >= 0 ? -3 : 3));
  });
}
export { L };
