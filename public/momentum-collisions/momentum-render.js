// Momentum & Collisions: drawing. Reads state, draws to 2D canvases. No
// physics decisions here: every number comes from momentum-physics.js.

import { ART, CART, PUCK_R, TRACK, cartSprite, num, sig, fmtTime } from "./momentum-physics.js";

const ASSET = "momentum-collisions/assets/";
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
const ok = (im) => im && im.complete && im.naturalWidth > 0;

export function readTokens() {
  const cs = getComputedStyle(document.documentElement);
  const g = (n, d) => cs.getPropertyValue(n).trim() || d;
  return {
    paper: g("--mc-paper", "#f0f0ec"), ink: g("--mc-ink", "#1c1c1c"), dim: g("--mc-ink-dim", "#555"),
    a: g("--mc-a", "#2463c9"), b: g("--mc-b", "#c0392b"), total: g("--mc-total", "#5b3fa8"), ke: g("--mc-ke", "#8a5a00"),
    grid: g("--mc-grid", "#ccc"), table: g("--mc-table", "#e3e7ee"), gold: g("--mc-gold", "#ffc43c"),
    dark: document.documentElement.getAttribute("data-theme") === "dark"
  };
}

// Track view: world x (m) to screen px. The rail top sits at railY.
export function trackView(w, h, x0 = TRACK.x0 - 0.05, x1 = TRACK.x1 + 0.05) {
  const s = w / (x1 - x0);
  const railY = Math.round(h * 0.72);
  return { s, w, h, railY, toX: (x) => (x - x0) * s, fromX: (px) => px / s + x0 };
}

export function arrow(ctx, x, y, dx, dy, color, width = 2.5, head = 9) {
  const len = Math.hypot(dx, dy);
  if (len < 2) return;
  const ux = dx / len, uy = dy / len;
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = width;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + dx - ux * head * 0.8, y + dy - uy * head * 0.8); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + dx, y + dy);
  ctx.lineTo(x + dx - ux * head - uy * head * 0.55, y + dy - uy * head + ux * head * 0.55);
  ctx.lineTo(x + dx - ux * head + uy * head * 0.55, y + dy - uy * head - ux * head * 0.55);
  ctx.closePath(); ctx.fill();
}

export function drawTrack(ctx, V, img) {
  const im = img["track-segment"];
  const tileW = 0.9 * V.s, tileH = tileW * ART.track.h / ART.track.w;
  const y = V.railY - tileH * ART.track.railTop / ART.track.h;
  if (ok(im)) for (let x = -tileW * 0.2; x < V.w; x += tileW - 0.5) ctx.drawImage(im, x, y, tileW, tileH);
  else { ctx.fillStyle = "#b9b9b9"; ctx.fillRect(0, V.railY, V.w, 8); }
}

// Recolor the chassis through its 1:1 mask (multiply keeps the gray shading).
const tintCache = new Map();
function tinted(mask, color) {
  const key = color;
  if (tintCache.has(key) && tintCache.get(key).src === mask) return tintCache.get(key).c;
  const c = document.createElement("canvas"); c.width = mask.naturalWidth; c.height = mask.naturalHeight;
  const x = c.getContext("2d");
  x.drawImage(mask, 0, 0); x.globalCompositeOperation = "source-in"; x.fillStyle = color; x.fillRect(0, 0, c.width, c.height);
  tintCache.set(key, { src: mask, c });
  return c;
}

// A cart centered at world x. bumperSide: +1 right, -1 left, 0 none.
// bumper: "spring" | "velcro" | "crumple"; squeeze 0..1 compresses it.
export function drawCart(ctx, V, T, img, o) {
  const im = img[cartSprite(o.m)], mask = img["cart-body-mask"];
  const chassisW = 2 * CART.half * V.s;
  const sw = chassisW * ART.cart.w / (ART.cart.bodyX[1] - ART.cart.bodyX[0]);
  const sh = sw * ART.cart.h / ART.cart.w;
  const cx = V.toX(o.x);
  const left = cx - sw / 2, top = V.railY - sh * ART.cart.contactY / ART.cart.h;
  const mountY = top + sh * ART.cart.mountY / ART.cart.h;
  const bodyTop = top + sh * ART.cart.bodyY[0] / ART.cart.h;
  if (o.bumperSide) drawBumper(ctx, V, T, cx + o.bumperSide * chassisW / 2, mountY, o.bumperSide, o.bumper, o.squeeze || 0, sh);
  ctx.save();
  // clip at the rail top so the halo under the wheels never lies over the rail
  ctx.beginPath(); ctx.rect(0, 0, V.w, V.railY + 0.5); ctx.clip();
  if (ok(im)) {
    ctx.drawImage(im, left, top, sw, sh);
    if (ok(mask) && o.tint) {
      ctx.globalCompositeOperation = "multiply";
      ctx.drawImage(tinted(mask, o.tint), left, top, sw, sh);
      ctx.globalCompositeOperation = "source-over";
    }
  } else {
    ctx.fillStyle = o.tint || "#999"; ctx.fillRect(cx - chassisW / 2, bodyTop, chassisW, sh * 0.3);
  }
  ctx.restore();
  const labY = top + sh * (o.m < 0.75 ? 0.3 : o.m < 1.75 ? 0.1 : -0.06);
  ctx.fillStyle = T.ink; ctx.textAlign = "center"; ctx.font = "600 13px Inter, system-ui, sans-serif";
  ctx.fillText(`${o.label} ${num(o.m)} kg`, cx, labY - 6);
  if (o.v !== undefined && Math.abs(o.v) > 1e-6) {
    const len = Math.max(14, Math.min(V.w * 0.18, Math.abs(o.v) * 0.12 * V.s * 2.2)) * Math.sign(o.v);
    const ay = labY - 34;
    arrow(ctx, cx - len / 2, ay, len, 0, o.tint || T.ink);
    ctx.fillStyle = T.ink; ctx.font = "12px ui-monospace, Menlo, monospace";
    ctx.fillText(`${num(o.v)} m/s`, cx, ay - 10);
  } else if (o.v !== undefined) {
    ctx.fillStyle = T.dim; ctx.font = "12px ui-monospace, Menlo, monospace"; ctx.fillText("at rest", cx, labY - 30);
  }
  return { left, top, sw, sh, chassisW };
}

// Bumpers are drawn in code (ink lines), not stacked sprites, so no halo
// edges overlap the cart art.
function drawBumper(ctx, V, T, x, y, side, kind, squeeze, sh) {
  const full = CART.bumper * V.s, len = full * (1 - 0.7 * squeeze);
  ctx.strokeStyle = T.ink; ctx.fillStyle = T.dim; ctx.lineWidth = 1.5;
  const hh = Math.max(4, sh * 0.07);
  if (kind === "velcro") {
    ctx.fillRect(side > 0 ? x : x - full * 0.5, y - hh * 1.6, full * 0.5, hh * 3.2);
    ctx.strokeRect(side > 0 ? x : x - full * 0.5, y - hh * 1.6, full * 0.5, hh * 3.2);
    return;
  }
  if (kind === "crumple") {
    const n = 5;
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const px = x + side * (len * i) / n, up = i % 2 ? -1 : 1;
      if (i === 0) ctx.moveTo(px, y - hh * 2); else ctx.lineTo(px, y + up * hh * 2);
    }
    ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y + hh * 2.2); ctx.lineTo(x + side * len, y + hh * 2.2); ctx.moveTo(x, y - hh * 2.2); ctx.lineTo(x + side * len, y - hh * 2.2); ctx.stroke();
    return;
  }
  const n = 8;
  ctx.beginPath(); ctx.moveTo(x, y);
  for (let i = 1; i < n; i++) ctx.lineTo(x + side * (len * i) / n, y + (i % 2 ? -hh : hh));
  ctx.lineTo(x + side * len, y); ctx.stroke();
  ctx.fillRect(side > 0 ? x + len - 2 : x - len - 1, y - hh * 1.3, 3, hh * 2.6);
}

// Barrier with its impact face at world x.
export function drawBarrier(ctx, V, T, img, xFace) {
  const im = img["crash-barrier"], st = img["crash-barrier-stripes-mask"];
  const h = Math.min(V.railY - 20, 0.55 * V.s * 1.4);
  const w = h * ART.barrier.w / ART.barrier.h;
  const left = V.toX(xFace) - w * ART.barrier.face / ART.barrier.w, top = V.railY - h * ART.barrier.base / ART.barrier.h;
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, V.w, V.railY + 0.5); ctx.clip();
  if (ok(im)) {
    ctx.drawImage(im, left, top, w, h);
    if (ok(st)) { ctx.globalCompositeOperation = "multiply"; ctx.drawImage(tinted(st, "#f2c230"), left, top, w, h); ctx.globalCompositeOperation = "source-over"; }
  } else { ctx.fillStyle = "#999"; ctx.fillRect(V.toX(xFace), top, w * 0.8, h); }
  ctx.restore();
}

export function drawCM(ctx, V, T, x, label) {
  const px = V.toX(x), y = V.railY + 22;
  ctx.strokeStyle = T.total; ctx.fillStyle = T.total; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(px, V.railY + 4); ctx.lineTo(px - 7, y); ctx.lineTo(px + 7, y); ctx.closePath(); ctx.fill();
  ctx.fillStyle = T.ink; ctx.font = "12px ui-monospace, Menlo, monospace"; ctx.textAlign = "center";
  ctx.fillText(label, px, y + 16);
}

export function drawScale(ctx, V, T) {
  const x = 12, y = V.h - 14, len = V.s * 0.5;
  ctx.strokeStyle = T.ink; ctx.lineWidth = 2; ctx.beginPath();
  ctx.moveTo(x, y - 5); ctx.lineTo(x, y); ctx.lineTo(x + len, y); ctx.lineTo(x + len, y - 5); ctx.stroke();
  ctx.fillStyle = T.ink; ctx.font = "12px ui-monospace, Menlo, monospace"; ctx.textAlign = "left";
  ctx.fillText("0.5 m", x + len + 6, y);
}

// ---------- bar charts: momentum and kinetic energy, before and after ----------
export function drawBars(ctx, w, h, T, s, names = ["A", "B"]) {
  const stack = w < 480, pad = 10;   // narrow screens: one chart above the other
  const groups = [
    { title: "Momentum p (kg\u00b7m/s)", signed: true, before: [...s.pBefore, s.pTotBefore], after: [...s.pAfter, s.pTotAfter] },
    { title: "Kinetic energy KE (J)", signed: false, before: [...s.keBefore, s.keTotBefore], after: [...s.keAfter, s.keTotAfter] }
  ];
  groups.forEach((g, gi) => {
    const gwFull = stack ? w : w / 2, gh = stack ? h / 2 : h, y0 = stack ? gi * gh : 0;
    const x0 = (stack ? 0 : gi * gwFull) + pad, gw = gwFull - 2 * pad;
    ctx.save(); ctx.translate(0, y0); const h0 = h; h = gh;
    ctx.fillStyle = T.ink; ctx.font = "600 13px Inter, system-ui, sans-serif"; ctx.textAlign = "left";
    ctx.fillText(g.title, x0, 18);
    const all = [...g.before, ...g.after].map(Math.abs), max = Math.max(1e-9, ...all);
    const top = stack ? 36 : 44, bottom = h - 36, mid = g.signed ? (top + bottom) / 2 : bottom;
    const scale = (g.signed ? (bottom - top) / 2 - 14 : bottom - top) / max;
    ctx.strokeStyle = T.grid; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0, mid); ctx.lineTo(x0 + gw, mid); ctx.stroke();
    const cols = [T.a, T.b, T.total], bw = gw / 9;
    ["Before", "After"].forEach((lab, k) => {
      const vals = k ? g.after : g.before, bx = x0 + k * gw / 2;
      vals.forEach((v, i) => {
        const x = bx + bw * (0.4 + i * 1.25), hgt = v * scale;
        ctx.fillStyle = cols[i];
        ctx.fillRect(x, hgt >= 0 ? mid - hgt : mid, bw, Math.abs(hgt));
        ctx.fillStyle = T.ink; ctx.font = "11px ui-monospace, Menlo, monospace"; ctx.textAlign = "center";
        ctx.fillText(num(v), x + bw / 2, hgt >= 0 ? mid - hgt - 4 : mid - hgt + 12);
        ctx.fillStyle = T.dim; ctx.fillText(i < 2 ? names[i] : "Tot", x + bw / 2, h - 20);
      });
      ctx.fillStyle = T.ink; ctx.font = "12px Inter, system-ui, sans-serif"; ctx.fillText(lab, bx + gw / 4, h - 5);
    });
    h = h0; ctx.restore();
  });
}

// ---------- force-time graph ----------
export function drawForceTime(ctx, w, h, T, pulse, tNow, extra) {
  const L = 54, R = 12, top = 26, bottom = h - 34;
  const tMax = pulse.dt * 1.25, fMax = pulse.Fpk * 1.15;
  const X = (t) => L + (t / tMax) * (w - L - R), Y = (f) => bottom - (f / fMax) * (bottom - top);
  ctx.fillStyle = T.ink; ctx.font = "600 13px Inter, system-ui, sans-serif"; ctx.textAlign = "left";
  ctx.fillText("Force on the cart from the barrier, F(t)", L, 16);
  ctx.strokeStyle = T.grid; ctx.lineWidth = 1; ctx.beginPath();
  ctx.moveTo(L, top); ctx.lineTo(L, bottom); ctx.lineTo(w - R, bottom); ctx.stroke();
  // shaded area = impulse
  ctx.fillStyle = T.dark ? "rgba(255,196,92,0.25)" : "rgba(138,90,0,0.18)";
  ctx.beginPath(); ctx.moveTo(X(0), Y(0));
  for (let i = 0; i <= 80; i++) { const t = (pulse.dt * i) / 80; ctx.lineTo(X(t), Y(pulse.force(t))); }
  ctx.lineTo(X(pulse.dt), Y(0)); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = T.ke; ctx.lineWidth = 2.5; ctx.beginPath();
  for (let i = 0; i <= 80; i++) { const t = (pulse.dt * i) / 80; i ? ctx.lineTo(X(t), Y(pulse.force(t))) : ctx.moveTo(X(t), Y(pulse.force(t))); }
  ctx.stroke();
  // average force line
  ctx.setLineDash([5, 4]); ctx.strokeStyle = T.ink; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(X(0), Y(pulse.Favg)); ctx.lineTo(X(pulse.dt), Y(pulse.Favg)); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = T.ink; ctx.font = "12px ui-monospace, Menlo, monospace"; ctx.textAlign = "left";
  ctx.fillText(`peak ${sig(pulse.Fpk, "N")}`, X(pulse.dt / 2) + 6, Y(pulse.Fpk) + 4);
  ctx.fillText(`average ${sig(pulse.Favg, "N")}`, X(pulse.dt) + 4 > w - 140 ? w - 150 : X(pulse.dt) + 4, Y(pulse.Favg) - 6);
  ctx.fillText(`area = impulse J = ${num(pulse.J)} N\u00b7s`, X(pulse.dt * 0.12), Y(pulse.Fpk * 0.2));
  ctx.textAlign = "right"; ctx.fillText(sig(fMax / 1.15, "N"), L - 4, Y(pulse.Fpk) + 4); ctx.fillText("0", L - 4, bottom + 4);
  ctx.textAlign = "center"; ctx.fillText("0", X(0), bottom + 16); ctx.fillText(fmtTime(pulse.dt), X(pulse.dt), bottom + 16);
  ctx.fillText("time in contact", (L + w) / 2, h - 4);
  if (tNow !== null && tNow >= 0) {
    ctx.strokeStyle = T.ink; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(X(Math.min(tNow, tMax)), top); ctx.lineTo(X(Math.min(tNow, tMax)), bottom); ctx.stroke();
  }
  if (extra) { ctx.textAlign = "right"; ctx.fillStyle = T.dim; ctx.fillText(extra, w - R, 16); }
}

// ---------- 2D glancing: top view and momentum vectors ----------
export function tableView(w, h) {
  const s = Math.min(w / 1.0, h / 0.5);
  return { s, w, h, toX: (x) => w / 2 + x * s, toY: (y) => h / 2 - y * s };
}
export function drawTable(ctx, V, T) {
  ctx.fillStyle = T.table; ctx.fillRect(0, 0, V.w, V.h);
}
export function drawPuck(ctx, V, T, img, p, name, label, color) {
  const r = PUCK_R * V.s, x = V.toX(p.x), y = V.toY(p.y);
  const im = img[name];
  if (ok(im)) { const size = 2 * r * ART.puck.size / (2 * ART.puck.r); ctx.drawImage(im, x - size / 2, y - size / 2, size, size); }
  else { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }
  ctx.fillStyle = T.ink; ctx.font = "600 13px Inter, system-ui, sans-serif"; ctx.textAlign = "center";
  ctx.fillText(label, x, y - r - 8);
}
export function drawTrail(ctx, V, pts, color) {
  if (pts.length < 2) return;
  ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(V.toX(p.x), V.toY(p.y)) : ctx.moveTo(V.toX(p.x), V.toY(p.y))));
  ctx.stroke(); ctx.setLineDash([]);
}
// p1' + p2' drawn tip to tail next to p before.
export function drawVectorSum(ctx, w, h, T, g, m1, m2) {
  ctx.fillStyle = T.ink; ctx.font = "600 13px Inter, system-ui, sans-serif"; ctx.textAlign = "left";
  ctx.fillText("Momentum vectors (kg\u00b7m/s)", 10, 18);
  const maxp = Math.max(g.p0, 1e-9), ox = 30, oy = h - 52;
  const up = Math.max(0.1 * maxp, Math.abs(m1 * g.v1.y));
  const s = Math.min((w - 90) / maxp, (oy - 40) / up);
  const p1 = { x: m1 * g.v1.x, y: m1 * g.v1.y }, p2 = { x: m2 * g.v2.x, y: m2 * g.v2.y };
  arrow(ctx, ox, oy, g.p0 * s, 0, T.total, 3);
  arrow(ctx, ox, oy, p1.x * s, -p1.y * s, T.b);
  arrow(ctx, ox + p1.x * s, oy - p1.y * s, p2.x * s, -p2.y * s, T.a);
  ctx.font = "12px Inter, system-ui, sans-serif"; ctx.fillStyle = T.ink; ctx.textAlign = "left";
  ctx.fillText("red p\u2081'", ox + p1.x * s / 2 + 6, oy - p1.y * s / 2 - 6);
  ctx.fillText("blue p\u2082'", ox + p1.x * s + p2.x * s / 2 + 6, oy - p1.y * s - p2.y * s / 2 + 14);
  ctx.fillText("p before", ox + g.p0 * s - 50, oy + 18);
  ctx.font = "12px ui-monospace, Menlo, monospace"; ctx.fillStyle = T.ink;
  ctx.fillText(`before: ${num(g.p0)} along x`, 10, h - 26);
  ctx.fillText(`after: p\u2081' + p\u2082' = (${num(g.p.x)}, ${num(g.p.y)})`, 10, h - 8);
}
