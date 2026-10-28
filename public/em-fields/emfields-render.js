// E&M Field Sandbox: drawing. Reads state, draws to a 2D canvas. No physics
// decisions here: every number comes from emfields-physics.js.

import {
  eField, potential, bField, vectorPotentialZ, traceFieldLines, contourSegments, equipotentialLevels,
  CHARGE_R, VIEW, VIEW_H, SELECTOR, ART, NC
} from "./emfields-physics.js";

const ASSET = "em-fields/assets/";
export function loadImages(names, onload) {
  const out = {};
  for (const n of names) {
    const img = new Image();
    img.decoding = "async";
    img.onload = img.onerror = () => onload && onload(n);
    img.src = ASSET + n + ".webp";
    out[n] = img;
  }
  return out;
}

export function readTokens() {
  const cs = getComputedStyle(document.documentElement);
  const g = (n, d) => cs.getPropertyValue(n).trim() || d;
  return {
    paper: g("--ef-paper", "#f0f0ec"), ink: g("--ef-ink", "#1c1c1c"), dim: g("--ef-ink-dim", "#555"),
    pos: g("--ef-pos", "#c0392b"), neg: g("--ef-neg", "#2463c9"), efield: g("--ef-efield", "#444"),
    bfield: g("--ef-bfield", "#1f7a4d"), equip: g("--ef-equip", "#8a5a00"), path: g("--ef-path", "#b5179e"),
    gold: g("--ef-gold", "#ffc43c"), dark: document.documentElement.getAttribute("data-theme") === "dark"
  };
}

// World (m, y up) to screen (px, y down). The view fits VIEW x VIEW_H.
export function viewOf(w, h, view = VIEW, viewH = VIEW_H, ox = 0, oy = 0) {
  const s = Math.min(w / view, h / viewH);
  const cx = w / 2 - ox * s, cy = h / 2 + oy * s;
  return {
    s, w, h,
    toX: (x) => cx + x * s, toY: (y) => cy - y * s,
    fromX: (px) => (px - cx) / s, fromY: (py) => (cy - py) / s,
    bounds: { x0: -cx / s, x1: (w - cx) / s, y0: (cy - h) / s, y1: cy / s }
  };
}

function arrow(ctx, x, y, dx, dy, color, width = 1.5, head = 6) {
  const len = Math.hypot(dx, dy);
  if (len < 1) return;
  const ux = dx / len, uy = dy / len;
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = width;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + dx - ux * head * 0.8, y + dy - uy * head * 0.8); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + dx, y + dy);
  ctx.lineTo(x + dx - ux * head - uy * head * 0.55, y + dy - uy * head + ux * head * 0.55);
  ctx.lineTo(x + dx - ux * head + uy * head * 0.55, y + dy - uy * head - ux * head * 0.55);
  ctx.closePath(); ctx.fill();
}
// Arrow length for a field magnitude: log scaled so 1 decade = `per` px.
function arrowLen(mag, ref, per, max) { return Math.max(0, Math.min(max, per * (Math.log10(mag / ref) + 1))); }

function sprite(ctx, img, x, y, r, artR, rot = 0) {
  if (!img || !img.complete || !img.naturalWidth) return false;
  if (img.canvas) img = img.canvas;
  const size = r * (ART.charge.size / artR);
  ctx.save(); ctx.translate(x, y); if (rot) ctx.rotate(rot);
  ctx.drawImage(img, -size / 2, -size / 2, size, size);
  ctx.restore();
  return true;
}

export function drawCharges(ctx, V, T, img, charges, selected) {
  const r = Math.max(22, CHARGE_R * V.s);
  for (const c of charges) {
    const x = V.toX(c.x), y = V.toY(c.y);
    if (c === selected) { ctx.strokeStyle = T.gold; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, r + 5, 0, 7); ctx.stroke(); }
    if (!sprite(ctx, img[c.q > 0 ? "charge-positive" : "charge-negative"], x, y, r, ART.charge.r)) {
      ctx.fillStyle = c.q > 0 ? T.pos : T.neg; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    }
    ctx.fillStyle = T.ink; ctx.font = "12px ui-monospace, Menlo, monospace"; ctx.textAlign = "center";
    ctx.fillText(`${c.q > 0 ? "+" : "\u2212"}${+(Math.abs(c.q) / NC).toPrecision(2)} nC`, x, y + r + 20);
  }
}

export function drawWires(ctx, V, T, wires, selected) {
  const r = 22;
  for (const w of wires) {
    const x = V.toX(w.x), y = V.toY(w.y);
    if (w === selected) { ctx.strokeStyle = T.gold; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, r + 5, 0, 7); ctx.stroke(); }
    // copper cross-section of a wire seen end-on
    ctx.fillStyle = "#c27a45"; ctx.strokeStyle = T.dark ? "#f3e2d4" : "#3a2414"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#1c1c1c"; ctx.strokeStyle = "#1c1c1c"; ctx.lineWidth = 3;
    if (w.I > 0) { ctx.beginPath(); ctx.arc(x, y, 5, 0, 7); ctx.fill(); }
    else { ctx.beginPath(); ctx.moveTo(x - 8, y - 8); ctx.lineTo(x + 8, y + 8); ctx.moveTo(x + 8, y - 8); ctx.lineTo(x - 8, y + 8); ctx.stroke(); }
    ctx.fillStyle = T.ink; ctx.font = "12px ui-monospace, Menlo, monospace"; ctx.textAlign = "center";
    ctx.fillText(`${+Math.abs(w.I).toPrecision(2)} A ${w.I > 0 ? "out" : "in"}`, x, y + r + 15);
  }
}

export function drawFieldLines(ctx, V, T, charges) {
  if (!charges.length) return;
  const lines = traceFieldLines(charges, V.bounds, { r0: CHARGE_R, step: Math.max(0.0015, 3 / V.s) });
  const dir = charges.some((c) => c.q > 0) ? 1 : -1;
  ctx.strokeStyle = T.efield; ctx.lineWidth = 1.2; ctx.globalAlpha = 0.85;
  for (const pts of lines) {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(V.toX(x), V.toY(y)) : ctx.moveTo(V.toX(x), V.toY(y))));
    ctx.stroke();
    // a direction mark partway along each line
    const k = Math.min(pts.length - 2, Math.floor(pts.length * 0.35));
    if (k > 1) {
      const [x0, y0] = pts[k], [x1, y1] = pts[k + 1];
      const sx = V.toX(x0), sy = V.toY(y0), dx = (V.toX(x1) - sx) * dir, dy = (V.toY(y1) - sy) * dir;
      const l = Math.hypot(dx, dy) || 1;
      arrow(ctx, sx - dx / l * 4, sy - dy / l * 4, dx / l * 8, dy / l * 8, T.efield, 1.2, 6);
    }
  }
  ctx.globalAlpha = 1;
}

export function drawVectorGrid(ctx, V, T, fieldFn, color, ref) {
  const gap = 46;
  for (let py = gap / 2; py < V.h; py += gap) for (let px = gap / 2; px < V.w; px += gap) {
    const f = fieldFn(V.fromX(px), V.fromY(py));
    const m = Math.hypot(f.x, f.y);
    if (!m || !Number.isFinite(m)) continue;
    const L = arrowLen(m, ref, 9, 20);
    if (L < 3) continue;
    ctx.globalAlpha = 0.75;
    arrow(ctx, px - f.x / m * L / 2, py + f.y / m * L / 2, f.x / m * L, -f.y / m * L, color, 1.2, 5);
  }
  ctx.globalAlpha = 1;
}

function sampleGrid(V, fn, cell = 6) {
  const nx = Math.ceil(V.w / cell) + 1, ny = Math.ceil(V.h / cell) + 1;
  const g = new Float64Array(nx * ny);
  const x0 = V.fromX(0), y0 = V.fromY(0), dx = cell / V.s, dy = -cell / V.s;
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) g[j * nx + i] = fn(x0 + i * dx, y0 + j * dy);
  return { g, nx, ny, x0, y0, dx, dy };
}
function strokeSegs(ctx, V, segs) {
  ctx.beginPath();
  for (const [[ax, ay], [bx, by]] of segs) { ctx.moveTo(V.toX(ax), V.toY(ay)); ctx.lineTo(V.toX(bx), V.toY(by)); }
  ctx.stroke();
}

export function drawEquipotentials(ctx, V, T, charges, labels = true) {
  if (!charges.length) return;
  const G = sampleGrid(V, (x, y) => potential(charges, x, y));
  ctx.lineWidth = 1.4;
  for (const lv of equipotentialLevels()) {
    const segs = contourSegments(G.g, G.nx, G.ny, G.x0, G.y0, G.dx, G.dy, lv);
    if (!segs.length) continue;
    ctx.strokeStyle = lv > 0 ? T.pos : T.neg;
    ctx.globalAlpha = Math.abs(lv) % 100 === 0 ? 0.95 : 0.5;
    strokeSegs(ctx, V, segs);
    if (labels && [100, 200, 400].includes(Math.abs(lv))) {
      const [[ax, ay]] = segs[Math.floor(segs.length / 3)];
      ctx.globalAlpha = 1; ctx.fillStyle = T.ink; ctx.font = "11px ui-monospace, Menlo, monospace"; ctx.textAlign = "center";
      ctx.fillText(`${lv > 0 ? "+" : "\u2212"}${Math.abs(lv)} V`, V.toX(ax), V.toY(ay) - 3);
    }
  }
  ctx.globalAlpha = 1;
}

export function drawBLines(ctx, V, T, wires) {
  if (!wires.length) return;
  const G = sampleGrid(V, (x, y) => vectorPotentialZ(wires, x, y));
  const Imax = Math.max(...wires.map((w) => Math.abs(w.I)));
  // contours of A_z every fixed step; denser where B is stronger
  const step = 0.3 * 2e-7 * Imax;   // radii of drawn rings grow by about e^0.3 = 1.35x
  let lo = Infinity, hi = -Infinity;
  for (const v of G.g) { if (v < lo) lo = v; if (v > hi) hi = v; }
  ctx.strokeStyle = T.bfield; ctx.lineWidth = 1.3; ctx.globalAlpha = 0.85;
  let n = 0;
  for (let lv = Math.ceil(lo / step) * step; lv <= hi && n < 80; lv += step, n++) {
    strokeSegs(ctx, V, contourSegments(G.g, G.nx, G.ny, G.x0, G.y0, G.dx, G.dy, lv));
  }
  ctx.globalAlpha = 1;
}

export function drawCompasses(ctx, V, T, img, wires, extraB) {
  const gap = 92, r = 24;
  for (let py = gap / 2; py < V.h; py += gap) for (let px = gap / 2; px < V.w; px += gap) {
    const x = V.fromX(px), y = V.fromY(py);
    if (wires.some((w) => Math.hypot(V.toX(w.x) - px, V.toY(w.y) - py) < 40)) continue;
    const b = bField(wires, x, y);
    if (extraB) { b.x += extraB.x; b.y += extraB.y; }
    const rot = Math.atan2(b.x, b.y);   // needle art points up at 0
    if (!sprite(ctx, img["compass-housing"], px, py, r, 120)) { ctx.strokeStyle = T.ink; ctx.beginPath(); ctx.arc(px, py, r, 0, 7); ctx.stroke(); }
    if (!sprite(ctx, img["compass-needle"], px, py, r, 120, rot)) arrow(ctx, px, py, Math.sin(rot) * r, -Math.cos(rot) * r, T.pos);
    // tint the north half so the north end reads clearly
    const m = tinted(img["compass-needle-north-mask"], T.pos);
    if (m) sprite(ctx, m, px, py, r, 120, rot);
  }
}

// A white mask recolored once per color on an offscreen canvas.
const tintCache = new Map();
export function tinted(mask, color) {
  if (!mask || !mask.complete || !mask.naturalWidth) return null;
  const key = mask.src + color;
  if (tintCache.has(key)) return tintCache.get(key);
  const c = document.createElement("canvas");
  c.width = mask.naturalWidth; c.height = mask.naturalHeight;
  const x = c.getContext("2d");
  x.drawImage(mask, 0, 0);
  x.globalCompositeOperation = "source-in"; x.fillStyle = color; x.fillRect(0, 0, c.width, c.height);
  const out = { complete: true, naturalWidth: c.width, canvas: c };
  tintCache.set(key, out);
  return out;
}

export function drawTestCharge(ctx, V, T, img, tc, parts) {
  const x = V.toX(tc.x), y = V.toY(tc.y), r = 14;
  if (parts) for (const p of parts.list) {
    const m = Math.hypot(p.x, p.y); if (!m) continue;
    const L = arrowLen(m, parts.ref, 22, 70);
    ctx.setLineDash([4, 3]); arrow(ctx, x, y, p.x / m * L, -p.y / m * L, p.color, 1.6, 7); ctx.setLineDash([]);
  }
  if (parts && parts.net) {
    const m = Math.hypot(parts.net.x, parts.net.y);
    if (m) { const L = arrowLen(m, parts.ref, 22, 70); arrow(ctx, x, y, parts.net.x / m * L, -parts.net.y / m * L, T.path, 3, 10); }
  }
  ctx.strokeStyle = T.gold; ctx.lineWidth = 2; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.arc(x, y, 22, 0, 7); ctx.stroke(); ctx.setLineDash([]);
  if (!sprite(ctx, img["test-charge"], x, y, r, ART.testCharge.r)) { ctx.fillStyle = T.pos; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }
}

export function drawParticle(ctx, V, T, img, p, trail, part) {
  if (trail && trail.length > 1) {
    ctx.strokeStyle = T.path; ctx.lineWidth = 2; ctx.beginPath();
    trail.forEach((q, i) => (i ? ctx.lineTo(V.toX(q.x), V.toY(q.y)) : ctx.moveTo(V.toX(q.x), V.toY(q.y))));
    ctx.stroke();
  }
  if (!p) return;
  const x = V.toX(p.x), y = V.toY(p.y);
  const neg = part.q < 0;
  if (!sprite(ctx, img[neg ? "electron" : "test-charge"], x, y, neg ? 10 : 12, neg ? ART.electron.r : ART.testCharge.r)) {
    ctx.fillStyle = neg ? T.neg : T.pos; ctx.beginPath(); ctx.arc(x, y, 10, 0, 7); ctx.fill();
  }
  const v = Math.hypot(p.vx, p.vy);
  if (v) arrow(ctx, x, y, p.vx / v * 34, -p.vy / v * 34, T.ink, 2, 8);
}

// Uniform B shown as a grid of dots (out of page) or crosses (into page).
export function drawUniformB(ctx, V, T, Bz) {
  if (!Bz) return;
  ctx.strokeStyle = T.bfield; ctx.fillStyle = T.bfield; ctx.lineWidth = 1.4; ctx.globalAlpha = 0.6;
  const gap = 40;
  for (let py = gap / 2; py < V.h; py += gap) for (let px = gap / 2; px < V.w; px += gap) {
    if (Bz > 0) { ctx.beginPath(); ctx.arc(px, py, 2.4, 0, 7); ctx.fill(); }
    else { ctx.beginPath(); ctx.moveTo(px - 4, py - 4); ctx.lineTo(px + 4, py + 4); ctx.moveTo(px + 4, py - 4); ctx.lineTo(px - 4, py + 4); ctx.stroke(); }
  }
  ctx.globalAlpha = 1;
}

export function drawScaleBar(ctx, V, T, meters, label) {
  const L = meters * V.s, x = 14, y = V.h - 40;
  ctx.strokeStyle = T.ink; ctx.fillStyle = T.ink; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x, y - 4); ctx.lineTo(x, y + 4); ctx.moveTo(x, y); ctx.lineTo(x + L, y); ctx.moveTo(x + L, y - 4); ctx.lineTo(x + L, y + 4); ctx.stroke();
  ctx.font = "12px ui-monospace, Menlo, monospace"; ctx.textAlign = "left"; ctx.fillText(label, x, y - 8);
}

export function drawSelector(ctx, V, T, img, s) {
  const { L, gap, slit } = SELECTOR;
  const plateH = 10;
  const wire = img["wire-segment-copper"];
  for (const [sign, yy] of [[1, gap / 2], [-1, -gap / 2]]) {
    const x0 = V.toX(0), x1 = V.toX(L), y = V.toY(yy) - (sign > 0 ? plateH : 0);
    if (wire && wire.complete && wire.naturalWidth) ctx.drawImage(wire, 0, ART.wire.centerY - ART.wire.thick / 2, ART.wire.w, ART.wire.thick, x0, y, x1 - x0, plateH);
    else { ctx.fillStyle = "#c27a45"; ctx.fillRect(x0, y, x1 - x0, plateH); }
    ctx.fillStyle = T.ink; ctx.font = "bold 16px ui-monospace, Menlo, monospace"; ctx.textAlign = "center";
    for (let k = 1; k < 6; k++) ctx.fillText(sign > 0 ? "+" : "\u2212", x0 + (x1 - x0) * k / 6, sign > 0 ? y - 4 : y + plateH + 16);
  }
  // E arrows between the plates (pointing down) and B crosses (into page)
  for (let k = 1; k < 6; k++) {
    const px = V.toX(L * k / 6);
    arrow(ctx, px - 10, V.toY(gap / 2) + 6, 0, (gap * V.s) - 14, T.efield, 1.2, 6);
    ctx.strokeStyle = T.bfield; ctx.lineWidth = 1.6;
    const cx = px + 12, cy = V.toY(0);
    ctx.beginPath(); ctx.moveTo(cx - 4, cy - 4); ctx.lineTo(cx + 4, cy + 4); ctx.moveTo(cx + 4, cy - 4); ctx.lineTo(cx - 4, cy + 4); ctx.stroke();
  }
  // exit wall with a slit
  const wx = V.toX(L + 0.05);
  ctx.fillStyle = T.ink;
  ctx.fillRect(wx - 3, V.toY(gap), 6, V.toY(slit / 2) - V.toY(gap));
  ctx.fillRect(wx - 3, V.toY(-slit / 2), 6, V.toY(-gap) - V.toY(-slit / 2));
  ctx.fillStyle = T.dim; ctx.font = "12px system-ui, sans-serif"; ctx.textAlign = "center";
  ctx.fillText("slit", wx, V.toY(gap) - 6);
}
