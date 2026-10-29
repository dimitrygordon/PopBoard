// Electromagnetic Spectrum Explorer: drawing only. Every number drawn here
// comes from emspec-physics.js through the UI. Leo's art supplies the
// telescopes, band-view masks, atmosphere panel and scale icons; arrows,
// dials, graphs, waves and the spectrum bar are drawn here in code.

import { BANDS, LOG_L_MIN, LOG_L_MAX, wavelengthToSlider, bandOf, visibleColor, transmission,
  altitudeToArtY, ATMOSPHERE, LAYERS_KM, formatLength, formatEnergyEV, SCALE, IONIZING_EV } from "./emspec-physics.js";

const ASSET = "em-spectrum/assets/";

export function loadImages(names, onload) {
  const out = {};
  let left = names.length;
  for (const n of names) {
    const img = new Image();
    img.decoding = "async";
    img.onload = img.onerror = () => { if (--left === 0 && onload) onload(); else if (onload) onload(n); };
    img.src = ASSET + n + ".webp";
    out[n] = img;
  }
  return out;
}
const ok = (img) => img && img.complete && img.naturalWidth > 0;

export function readTokens() {
  const cs = getComputedStyle(document.documentElement);
  const g = (n, d) => cs.getPropertyValue(n).trim() || d;
  const band = {};
  for (const b of BANDS) band[b.id] = g("--es-" + b.id, b.color);
  const t = { ink: g("--es-ink", "#1c1c1c"), dim: g("--es-ink-dim", "#6b6b6b"), paper: g("--es-paper", "#f0f0ec"),
    gold: g("--es-gold", "#ffc43c"), text: g("--es-text", "#e8e8ea"), textDim: g("--es-dim", "#a6a8b2"), band,
    card: g("--es-card", "#fff"), shade: g("--es-shade", "rgba(0,0,0,0.06)"), shade2: g("--es-shade-2", "rgba(0,0,0,0.12)"), shade3: g("--es-shade-3", "rgba(0,0,0,0.28)") };
  INK = t.ink;
  return t;
}
let INK = "#1c1c1c";   // default text color, the current theme's ink

const FONT = (px, w = 400) => `${w} ${px}px Inter, system-ui, sans-serif`;
const MONO = (px) => `${px}px ui-monospace, Menlo, monospace`;
function text(ctx, s, x, y, { font = FONT(12), color = INK, align = "left", base = "middle" } = {}) {
  ctx.font = font; ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = base; ctx.fillText(s, x, y);
}
function arrow(ctx, x0, y0, x1, y1, color, width = 2, head = 8) {
  const a = Math.atan2(y1 - y0, x1 - x0);
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = width; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1 - Math.cos(a) * head * 0.6, y1 - Math.sin(a) * head * 0.6); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x1, y1);
  ctx.lineTo(x1 - head * Math.cos(a - 0.45), y1 - head * Math.sin(a - 0.45));
  ctx.lineTo(x1 - head * Math.cos(a + 0.45), y1 - head * Math.sin(a + 0.45));
  ctx.closePath(); ctx.fill();
}
function fitImage(ctx, img, x, y, w, h) {
  if (!ok(img)) return null;
  const s = Math.min(w / img.naturalWidth, h / img.naturalHeight);
  const dw = img.naturalWidth * s, dh = img.naturalHeight * s;
  const dx = x + (w - dw) / 2, dy = y + (h - dh) / 2;
  ctx.drawImage(img, dx, dy, dw, dh);
  return { x: dx, y: dy, w: dw, h: dh };
}

// x position on a spectrum axis: long wavelengths (radio) on the left,
// short (gamma) on the right, like the style frame.
export const posOf = (lambda) => 1 - wavelengthToSlider(lambda);
export const lambdaAt = (u) => 10 ** (LOG_L_MAX - Math.min(1, Math.max(0, u)) * (LOG_L_MAX - LOG_L_MIN));

function bandStrip(ctx, T, x, y, w, h) {
  for (const b of BANDS) {
    const x0 = x + w * posOf(Math.min(b.max, 10 ** LOG_L_MAX));
    const x1 = x + w * posOf(Math.max(b.min, 10 ** LOG_L_MIN));
    if (b.id === "visible") {
      const gr = ctx.createLinearGradient(x0, 0, x1, 0);
      for (let i = 0; i <= 6; i++) gr.addColorStop(i / 6, visibleColor(700 - i * 320 / 6));
      ctx.fillStyle = gr;
    } else ctx.fillStyle = T.band[b.id];
    ctx.fillRect(x0, y, x1 - x0 + 0.5, h);
  }
}

// ---------- spectrum bar (dark chrome) ----------
export function drawSpectrumBar(ctx, w, h, T, { lambda }) {
  ctx.clearRect(0, 0, w, h);
  bandStrip(ctx, T, 0, 4, w, 10);
  // decade ticks
  ctx.strokeStyle = T.textDim; ctx.lineWidth = 1;
  for (let e = LOG_L_MIN; e <= LOG_L_MAX; e++) {
    const x = w * posOf(10 ** e);
    ctx.beginPath(); ctx.moveTo(x, 16); ctx.lineTo(x, e % 3 === 0 ? 24 : 20); ctx.stroke();
    if (e % 3 === 0 && w > 300) text(ctx, formatLength(10 ** e, 2), Math.min(w - 4, Math.max(4, x)), 33, { color: T.textDim, font: FONT(11), align: x < 20 ? "left" : x > w - 20 ? "right" : "center" });
  }
  const x = w * posOf(lambda);
  ctx.fillStyle = T.gold; ctx.strokeStyle = "#1c1c1c"; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(x, 14); ctx.lineTo(x - 7, 2); ctx.lineTo(x + 7, 2); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillRect(x - 1.5, 2, 3, 14);
}

// ---------- wave + size scale ----------
export function drawWave(ctx, w, h, T, { lambda, phase, icons }) {
  ctx.fillStyle = T.paper; ctx.fillRect(0, 0, w, h);
  const b = bandOf(lambda);
  const color = b.id === "visible" ? visibleColor(lambda * 1e9) : T.ink;
  const top = 16, waveH = Math.max(90, h * 0.42);
  const cy = top + 22 + waveH / 2, amp = waveH * 0.3;
  const L = Math.max(60, Math.min(w / 3, 220));      // one wavelength on screen
  text(ctx, `One wavelength, \u03bb = ${formatLength(lambda)}`, 14, top, { font: FONT(13, 600) });
  text(ctx, `${b.name}`, w - 14, top, { font: FONT(13, 600), align: "right" });
  // axis
  ctx.strokeStyle = T.dim; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
  ctx.beginPath(); ctx.moveTo(10, cy); ctx.lineTo(w - 10, cy); ctx.stroke(); ctx.setLineDash([]);
  // wave
  if (b.id === "visible") { ctx.strokeStyle = T.ink; ctx.lineWidth = 6; waveLine(ctx, w, cy, amp, L, phase); }
  ctx.strokeStyle = color; ctx.lineWidth = b.id === "visible" ? 3.5 : 2.5;
  waveLine(ctx, w, cy, amp, L, phase);
  // lambda bracket between two crests
  const k = 2 * Math.PI / L;
  let xc = ((Math.PI / 2 - phase) / k) % L; while (xc < 20) xc += L;
  const yb = cy - amp - 10;
  arrow(ctx, xc + L / 2, yb, xc, yb, T.ink, 1.5, 7); arrow(ctx, xc + L / 2, yb, xc + L, yb, T.ink, 1.5, 7);
  text(ctx, "\u03bb", xc + L / 2, yb - 9, { font: FONT(14, 600), align: "center" });
  // size scale strip (icons evenly spaced, like the style frame)
  const sy = top + waveH + 36, sh = h - sy - 10;
  const n = SCALE.length, cell = (w - 20) / n, icon = Math.min(cell - 6, sh - 34, 96);
  const near = nearestIndex(lambda);
  SCALE.forEach((s, i) => {
    const cx = 10 + cell * (i + 0.5);
    if (i === near) {
      ctx.fillStyle = T.card; ctx.strokeStyle = T.ink; ctx.lineWidth = 2;
      roundRect(ctx, cx - cell / 2 + 2, sy - 4, cell - 4, sh, 8); ctx.fill(); ctx.stroke();
    }
    if (icon > 10) fitImage(ctx, icons["scale-" + s.id], cx - icon / 2, sy, icon, icon);
    text(ctx, s.label, cx, sy + icon + 10, { font: FONT(cell < 60 ? 9 : 11, i === near ? 700 : 400), align: "center" });
    if (cell >= 60 || i === near) text(ctx, "~" + formatLength(s.size, 2), cx, sy + icon + 24, { font: MONO(cell < 60 ? 9 : 10), color: T.dim, align: "center" });
  });
  return { near };
}
function nearestIndex(lambda) {
  let best = 0, d = Infinity;
  SCALE.forEach((s, i) => { const k = Math.abs(Math.log10(lambda / s.size)); if (k < d) { d = k; best = i; } });
  return best;
}
function waveLine(ctx, w, cy, amp, L, phase) {
  ctx.beginPath();
  for (let x = 10; x <= w - 10; x += 2) {
    const y = cy - amp * Math.sin(2 * Math.PI * x / L + phase);
    if (x === 10) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();
}
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

// ---------- photon energy ladder ----------
export const E_MIN = -9, E_MAX = 7;   // log10(eV) axis range
export function drawEnergy(ctx, w, h, T, { eA, eB, marks }) {
  ctx.fillStyle = T.paper; ctx.fillRect(0, 0, w, h);
  const pad = { l: 24, r: 24 };
  const X = (eV) => pad.l + (w - pad.l - pad.r) * (Math.log10(eV) - E_MIN) / (E_MAX - E_MIN);
  const narrow = w < 520, ay = Math.round(h * (narrow ? 0.42 : 0.55));
  text(ctx, "Photon energy, E = h f (log scale)", 14, 16, { font: FONT(13, 600) });
  // ionizing region
  const xi = X(IONIZING_EV);
  ctx.fillStyle = T.shade; ctx.fillRect(xi, 30, w - pad.r - xi, ay - 30);
  ctx.strokeStyle = T.ink; ctx.setLineDash([5, 4]); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(xi, 30); ctx.lineTo(xi, ay); ctx.stroke(); ctx.setLineDash([]);
  text(ctx, "ionizing \u2192", xi + 6, 40, { font: FONT(12, 600) });
  // band strip mapped onto energy
  const hcEV = 1239.8419843320025e-9;
  for (const b of BANDS) {
    const e0 = Math.max(10 ** E_MIN, hcEV / Math.min(b.max, 1e8)), e1 = b.min > 0 ? hcEV / b.min : 10 ** E_MAX;
    ctx.fillStyle = b.id === "visible" ? "#e9c46a" : T.band[b.id];
    const x0 = Math.max(pad.l, X(e0)), x1 = Math.min(w - pad.r, X(e1));
    ctx.fillRect(x0, ay, x1 - x0, 10);
    if (x1 - x0 > 40) text(ctx, b.name, (x0 + x1) / 2, ay + 22, { font: FONT(11), align: "center" });
  }
  ctx.strokeStyle = T.ink; ctx.lineWidth = 1.5; ctx.strokeRect(pad.l, ay, w - pad.l - pad.r, 10);
  for (let e = E_MIN; e <= E_MAX; e += narrow ? 4 : 2) {
    const x = X(10 ** e);
    ctx.beginPath(); ctx.moveTo(x, ay + 10); ctx.lineTo(x, ay + 32); ctx.stroke();
    text(ctx, formatEnergyEV(10 ** e, 1), x, ay + 42, { font: MONO(10), color: T.dim, align: "center" });
  }
  // reference marks
  marks.forEach((m, i) => {
    const x = X(m.eV), y = ay + 58 + i * 16;
    ctx.strokeStyle = T.dim; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, ay + 10); ctx.lineTo(x, y - 6); ctx.stroke();
    text(ctx, `${m.label} (${formatEnergyEV(m.eV)})`, Math.min(w - 8, Math.max(8, x)), y, { font: FONT(11), align: x < w * 0.2 ? "left" : x > w * 0.8 ? "right" : "center" });
  });
  // photon markers
  const pin = (eV, label, y) => {
    const x = X(eV);
    arrow(ctx, x, y, x, ay - 2, T.ink, 2.5, 10);
    ctx.fillStyle = T.gold; ctx.strokeStyle = T.ink; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, 13, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    text(ctx, label, x, y + 1, { font: FONT(13, 700), color: "#1c1c1c", align: "center" });
    text(ctx, formatEnergyEV(eV), Math.min(w - 30, Math.max(30, x)), y - 22, { font: MONO(12), align: "center" });
  };
  pin(eA, "A", ay - 110 > 70 ? ay - 110 : 80);
  pin(eB, "B", ay - 50);
}

// ---------- atmosphere ----------
export function drawAtmosphere(ctx, w, h, T, { img, bandId }) {
  ctx.fillStyle = T.paper; ctx.fillRect(0, 0, w, h);
  const r = fitImage(ctx, img, 34, 26, w - 40, h - 32) || { x: 34, y: 26, w: w - 40, h: h - 32 };
  text(ctx, "How far each band gets", 10, 13, { font: FONT(13, 600) });
  // altitude scale (km) on the left, from the art's measured layer lines
  for (const km of [0, LAYERS_KM.troposphere, LAYERS_KM.stratosphere, LAYERS_KM.mesosphere]) {
    const y = r.y + r.h * altitudeToArtY(km);
    text(ctx, `${km} km`, r.x - 4, y, { font: MONO(10), align: "right" });
  }
  const n = BANDS.length;
  BANDS.forEach((b, i) => {
    const x = r.x + r.w * (i + 0.5) / n;
    const a = ATMOSPHERE[b.id];
    const sel = b.id === bandId;
    const y0 = r.y + 28, y1 = r.y + r.h * altitudeToArtY(a.stopKm);
    const col = b.id === "visible" ? "#d9a400" : T.band[b.id];
    ctx.globalAlpha = sel ? 1 : 0.75;
    // ink under-stroke so light colors read on the pale art
    arrow(ctx, x, y0, x, y1 - 2, T.ink, sel ? 7 : 5, sel ? 14 : 11);
    arrow(ctx, x, y0, x, y1 - 4, col, sel ? 4 : 2.5, sel ? 10 : 8);
    if (a.reaches === "partly") {
      ctx.setLineDash([3, 5]); ctx.strokeStyle = T.ink; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x, y1); ctx.lineTo(x, r.y + r.h * altitudeToArtY(0) - 2); ctx.stroke(); ctx.setLineDash([]);
    }
    if (a.reaches !== true) burst(ctx, x, y1, sel ? 10 : 7, T.ink);
    ctx.globalAlpha = 1;
    text(ctx, short(b), x, r.y + 16, { font: FONT(sel ? 12 : 11, sel ? 700 : 500), align: "center" });
  });
}
const short = (b) => ({ radio: "Radio", infrared: "IR", visible: "Vis", ultraviolet: "UV", xray: "X-ray", gamma: "Gamma" })[b.id];
function burst(ctx, x, y, r, color) {
  ctx.strokeStyle = color; ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; ctx.moveTo(x + Math.cos(a) * r * 0.4, y + Math.sin(a) * r * 0.4); ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
  ctx.stroke();
}

// ---------- opacity curve ----------
export function drawOpacity(ctx, w, h, T, { lambda }) {
  ctx.fillStyle = T.paper; ctx.fillRect(0, 0, w, h);
  const pad = { l: 44, r: 14, t: 30, b: 50 };
  const pw = w - pad.l - pad.r, ph = h - pad.t - pad.b;
  const X = (l) => pad.l + pw * posOf(l), Y = (op) => pad.t + ph * (1 - op);
  text(ctx, "Atmospheric opacity (sea level, looking straight up)", 10, 14, { font: FONT(13, 600) });
  ctx.strokeStyle = T.shade2; ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) { ctx.beginPath(); ctx.moveTo(pad.l, Y(i / 4)); ctx.lineTo(pad.l + pw, Y(i / 4)); ctx.stroke(); }
  for (const [op, s] of [[0, "0%"], [0.5, "50%"], [1, "100%"]]) text(ctx, s, pad.l - 6, Y(op), { font: MONO(10), align: "right" });
  text(ctx, "opaque", pad.l + 4, Y(1) + 9, { font: FONT(10), color: T.dim });
  text(ctx, "clear", pad.l + 4, Y(0) - 9, { font: FONT(10), color: T.dim });
  // curve
  ctx.beginPath(); ctx.moveTo(pad.l, Y(0));
  for (let i = 0; i <= pw; i++) ctx.lineTo(pad.l + i, Y(1 - transmission(lambdaAt(i / pw))));
  ctx.lineTo(pad.l + pw, Y(0)); ctx.closePath();
  ctx.fillStyle = T.shade3; ctx.fill();
  ctx.strokeStyle = T.ink; ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i <= pw; i++) { const y = Y(1 - transmission(lambdaAt(i / pw))); if (i) ctx.lineTo(pad.l + i, y); else ctx.moveTo(pad.l, y); }
  ctx.stroke();
  // window labels
  text(ctx, "radio window", X(0.05), Y(0) - 16, { font: FONT(11, 600), align: "center" });
  for (const [l, s, dy] of [[550e-9, "optical window", -1], [10e-6, "IR windows", -2]]) {
    const x = X(l);
    ctx.strokeStyle = T.ink; ctx.lineWidth = 1; const ly = Y(1) + 14 + (-dy - 1) * 18, lx = Math.min(pad.l + pw - 44, Math.max(pad.l + 44, x));
    ctx.beginPath(); ctx.moveTo(x, ly + 7); ctx.lineTo(x, Y(1 - transmission(l)) - 4); ctx.stroke();
    ctx.fillStyle = T.paper; ctx.font = FONT(11, 600); const tw = ctx.measureText(s).width; ctx.fillRect(lx - tw / 2 - 3, ly - 7, tw + 6, 14);
    text(ctx, s, lx, ly, { font: FONT(11, 600), align: "center" });
  }
  bandStrip(ctx, T, pad.l, pad.t + ph + 4, pw, 10);
  ctx.strokeStyle = T.ink; ctx.lineWidth = 1; ctx.strokeRect(pad.l, pad.t + ph + 4, pw, 10);
  for (let e = LOG_L_MIN; e <= LOG_L_MAX; e += 3) {
    const x = pad.l + pw * posOf(10 ** e);
    text(ctx, formatLength(10 ** e, 2), x, pad.t + ph + 26, { font: MONO(10), align: "center" });
  }
  text(ctx, "\u2190 longer wavelength      shorter wavelength \u2192", pad.l + pw / 2, pad.t + ph + 42, { font: FONT(11), color: T.dim, align: "center" });
  // marker
  const x = X(lambda), op = 1 - transmission(lambda);
  ctx.strokeStyle = T.ink; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]);
  ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, pad.t + ph); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = T.gold; ctx.strokeStyle = T.ink; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x, Y(op), 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
}

// ---------- telescope optics diagrams ----------
export function drawOptics(ctx, w, h, T, { optics, color }) {
  ctx.fillStyle = T.paper; ctx.fillRect(0, 0, w, h);
  const col = color;
  const ray = (pts) => {
    for (const [c, lw] of [[T.ink, 4], [col, 2]]) {
      ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length - 1; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.stroke();
      const [ax, ay] = pts[pts.length - 2], [bx, by] = pts[pts.length - 1];
      arrow(ctx, ax, ay, bx, by, c, lw, lw === 4 ? 11 : 8);
    }
  };
  const cx = w / 2;
  if (optics === "dish" || optics === "mirror") {
    // parabola y = yv - x^2/(4f), focus at (cx, yv - f)
    const half = Math.min(w * 0.36, h * 0.55), yv = h - 30, f = half * 0.55;
    const yOf = (x) => yv - (x * x) / (4 * f);
    ctx.strokeStyle = T.ink; ctx.lineWidth = optics === "dish" ? 4 : 6;
    ctx.beginPath(); for (let x = -half; x <= half; x += 2) { const y = yOf(x); if (x === -half) ctx.moveTo(cx + x, y); else ctx.lineTo(cx + x, y); } ctx.stroke();
    const fy = yv - f;
    for (const xr of [-0.85, -0.5, 0.5, 0.85]) {
      const x = xr * half;
      ray([[cx + x, 24], [cx + x, yOf(x)], [cx, fy]]);
    }
    ctx.fillStyle = T.ink; ctx.beginPath(); ctx.arc(cx, fy, 5, 0, Math.PI * 2); ctx.fill();
    text(ctx, optics === "dish" ? "receiver at focus" : "focus (camera)", cx + 10, fy - 12, { font: FONT(12, 600) });
    text(ctx, optics === "dish" ? "curved metal dish" : "curved mirror", cx, yv + 16, { font: FONT(12, 600), align: "center" });
  } else if (optics === "grazing") {
    const x0 = w * 0.12, x1 = w * 0.55, fx = w - 30, cy = h / 2;
    // two nested shells, top and bottom (drawn as lines)
    for (const [r0, r1] of [[h * 0.30, h * 0.24], [h * 0.20, h * 0.155]]) {
      for (const s of [-1, 1]) {
        ctx.strokeStyle = T.ink; ctx.lineWidth = 5; ctx.beginPath();
        ctx.moveTo(x0, cy + s * r0); ctx.lineTo(x1, cy + s * r1); ctx.stroke();
        const xm = (x0 + x1) / 2, ym = cy + s * (r0 + r1) / 2 - s * 3;
        ray([[16, ym], [xm, ym], [fx, cy]]);
      }
    }
    ctx.fillStyle = T.ink; ctx.beginPath(); ctx.arc(fx, cy, 5, 0, Math.PI * 2); ctx.fill();
    text(ctx, "detector", fx, cy + 18, { font: FONT(12, 600), align: "right" });
    text(ctx, "nested mirror shells (cut in half)", (x0 + x1) / 2, h - 16, { font: FONT(12, 600), align: "center" });
    text(ctx, "X-rays skim the mirror at under about 1\u00b0 (angle exaggerated here)", w / 2, 16, { font: FONT(12), align: "center" });
  } else if (optics === "pair") {
    const top = h * 0.22, bot = h * 0.72, lw = Math.min(w * 0.5, 260);
    ctx.strokeStyle = T.ink; ctx.lineWidth = 1.5;
    for (let i = 0; i < 7; i++) { const y = top + (bot - top) * i / 6; ctx.beginPath(); ctx.moveTo(cx - lw / 2, y); ctx.lineTo(cx + lw / 2, y); ctx.stroke(); }
    ctx.fillStyle = "#c9c9c4"; ctx.fillRect(cx - lw / 2, bot + 10, lw, h * 0.14); ctx.strokeRect(cx - lw / 2, bot + 10, lw, h * 0.14);
    ray([[cx - 30, 14], [cx - 10, top + (bot - top) / 6]]);
    const vx = cx - 10, vy = top + (bot - top) / 6;
    for (const [s, lab] of [[-1, "e\u207b"], [1, "e\u207a"]]) {
      ctx.strokeStyle = T.ink; ctx.lineWidth = 2.5; ctx.setLineDash([2, 0]);
      ctx.beginPath(); ctx.moveTo(vx, vy); ctx.lineTo(vx + s * lw * 0.28, bot + 10); ctx.stroke();
      text(ctx, lab, vx + s * lw * 0.3 + s * 10, bot - 4, { font: FONT(14, 700), align: "center" });
    }
    text(ctx, "tracker layers", cx + lw / 2 + 8, (top + bot) / 2, { font: FONT(12, 600) });
    text(ctx, "calorimeter (measures energy)", cx, bot + 10 + h * 0.07, { font: FONT(12, 600), align: "center" });
    text(ctx, "gamma ray", cx - 34, 20, { font: FONT(12, 600), align: "right" });
  }
}

// ---------- sky views ----------
const tintCache = new Map();
export function tinted(img, color, size) {
  if (!ok(img)) return null;
  const key = img.src + "|" + color + "|" + size;
  let c = tintCache.get(key);
  if (c) return c;
  c = document.createElement("canvas"); c.width = c.height = size;
  const x = c.getContext("2d");
  x.drawImage(img, 0, 0, size, size);
  x.globalCompositeOperation = "multiply"; x.fillStyle = color; x.fillRect(0, 0, size, size);
  x.globalCompositeOperation = "destination-in"; x.drawImage(img, 0, 0, size, size);
  if (tintCache.size > 40) tintCache.delete(tintCache.keys().next().value);
  tintCache.set(key, c);
  return c;
}
// glow: draw a soft halo behind small sources (Leo's note on the gamma masks)
export function drawSky(ctx, w, h, T, { layers }) {
  ctx.fillStyle = "#0d0e13"; ctx.fillRect(0, 0, w, h);
  const size = Math.min(w, h - 30) * 0.94;
  const px = Math.max(64, Math.min(1024, Math.ceil(size * (window.devicePixelRatio || 1) / 64) * 64));
  const x = (w - size) / 2, y = (h - 30 - size) / 2 + 4;
  for (const L of layers) {
    if (L.alpha <= 0) continue;
    ctx.globalAlpha = L.alpha;
    if (L.glow) {
      const g = ctx.createRadialGradient(x + size / 2, y + size / 2, 0, x + size / 2, y + size / 2, size * L.glow);
      g.addColorStop(0, L.color); g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.globalAlpha = L.alpha * 0.55; ctx.fillStyle = g; ctx.fillRect(x, y, size, size); ctx.globalAlpha = L.alpha;
    }
    const t = tinted(L.img, L.color, px);
    if (t) ctx.drawImage(t, x, y, size, size);
  }
  ctx.globalAlpha = 1;
}
