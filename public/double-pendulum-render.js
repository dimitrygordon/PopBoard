/**
 * Double pendulum renderer. Draws on 2D canvases; owns no state.
 * Sprite anchors (measured from the art, see MANIFEST.md):
 *   pivot-mount 512x512, pin centre (256, 300)
 *   rod-upper / rod-lower 1024x64, holes at (32, 32) and (992, 32): 960 px apart, +x at 0 deg
 *   bob-* 256x256, centre (128, 128), radius 100
 *   lab-stand 1024x1024, arm tip measured at about (701, 243)
 * The art carries its own thin light halo for dark stages, so no edge is added in code.
 * Draw order hides halo seams at the joints: rods first, then the mount (its pin covers the
 * upper rod end), then the bobs (they cover the rod ends).
 */
"use strict";

import { DEG, wrapAngle, SATURATION } from "./double-pendulum-physics.js";

export const ASSET_DIR = "double-pendulum/assets/";
const NAMES = ["pivot-mount", "rod-upper", "rod-lower", "bob-1", "bob-2", "bob-mask",
  "bob-2-ghost-1", "bob-2-ghost-2", "bob-2-ghost-3", "bob-ghost-outline", "lab-stand"];

export const PIVOT_PIN = { x: 256, y: 300 };
export const ROD_HOLE = { x: 32, y: 32, span: 960 };
export const BOB = { c: 128, r: 100 };

export function loadSprites(onReady) {
  const sprites = {};
  let left = NAMES.length;
  for (const n of NAMES) {
    const img = new Image();
    img.decoding = "async";
    img.onload = img.onerror = () => { if (--left === 0) onReady && onReady(sprites); };
    img.src = ASSET_DIR + n + ".webp";
    sprites[n] = img;
  }
  return sprites;
}

const ok = (img) => img && img.complete && img.naturalWidth > 0;

/** Orange copy of bob-mask for the comparison run. Built once. */
let tinted = null;
function tintedBob(sprites, color) {
  if (tinted && tinted.color === color) return tinted.canvas;
  if (!ok(sprites["bob-mask"])) return null;
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const x = c.getContext("2d");
  x.drawImage(sprites["bob-mask"], 0, 0);
  x.globalCompositeOperation = "multiply";
  x.fillStyle = color;
  x.fillRect(0, 0, 256, 256);
  x.globalCompositeOperation = "destination-in";
  x.drawImage(sprites["bob-mask"], 0, 0);
  tinted = { color, canvas: c };
  return c;
}

export function bobRadius(m, scale) {
  return scale * 0.11 * Math.cbrt(m / 2);
}

function drawRod(ctx, img, px, py, theta, lenPx, alpha, fallback) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(px, py);
  ctx.rotate(Math.PI / 2 - theta);
  if (ok(img)) {
    const s = lenPx / ROD_HOLE.span;
    ctx.scale(s, s);
    ctx.drawImage(img, -ROD_HOLE.x, -ROD_HOLE.y);
  } else {
    ctx.strokeStyle = fallback; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(lenPx, 0); ctx.stroke();
  }
  ctx.restore();
}

function drawBob(ctx, img, x, y, r, alpha = 1) {
  if (!img) return;
  const k = r / BOB.r;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.drawImage(img, x - BOB.c * k, y - BOB.c * k, 256 * k, 256 * k);
  ctx.restore();
}

export function drawMount(ctx, sprites, px, py, scale) {
  const img = sprites["pivot-mount"];
  if (!ok(img)) return;
  const k = (scale * 0.42) / 434;   // mount bar is 434 px wide in the art
  ctx.save();
  ctx.drawImage(img, px - PIVOT_PIN.x * k, py - PIVOT_PIN.y * k, 512 * k, 512 * k);
  ctx.restore();
}

export function drawStand(ctx, sprites, x, bottom, height) {
  const img = sprites["lab-stand"];
  if (!ok(img)) return;
  const k = height / 941;           // drawn part spans rows 41..982
  ctx.save();
  ctx.drawImage(img, x - 321 * k, bottom - 982 * k, 1024 * k, 1024 * k);
  ctx.restore();
}

/**
 * Draw one pendulum. which: "a" (main art) or "b" (comparison, orange, lighter rods).
 * scale is pixels per metre.
 */
export function drawPendulum(ctx, sprites, s, px, py, scale, which, opts = {}) {
  const l1 = s.L1 * scale, l2 = s.L2 * scale;
  const x1 = px + l1 * Math.sin(s.theta1), y1 = py + l1 * Math.cos(s.theta1);
  const x2 = x1 + l2 * Math.sin(s.theta2), y2 = y1 + l2 * Math.cos(s.theta2);
  const rodAlpha = which === "b" ? 0.55 : 1;
  drawRod(ctx, sprites["rod-upper"], px, py, s.theta1, l1, rodAlpha, "#666");
  drawRod(ctx, sprites["rod-lower"], x1, y1, s.theta2, l2, rodAlpha, "#999");
  if (opts.mount) opts.mount();
  const r1 = bobRadius(s.m1, scale), r2 = bobRadius(s.m2, scale);
  if (which === "b") {
    const t = tintedBob(sprites, opts.tint || "#f59e0b");
    drawBob(ctx, t, x1, y1, r1, 0.85);
    drawBob(ctx, t, x2, y2, r2, 0.85);
  } else {
    drawBob(ctx, ok(sprites["bob-1"]) ? sprites["bob-1"] : null, x1, y1, r1);
    drawBob(ctx, ok(sprites["bob-2"]) ? sprites["bob-2"] : null, x2, y2, r2);
  }
  return { x1, y1, x2, y2, r1, r2 };
}

export function drawGhosts(ctx, sprites, pts, r) {
  // pts: newest first, up to 3 positions in canvas pixels
  for (let i = Math.min(3, pts.length) - 1; i >= 0; i--) {
    const img = sprites["bob-2-ghost-" + (i + 1)];
    if (ok(img)) drawBob(ctx, img, pts[i].x, pts[i].y, r);
  }
}

export function drawOutline(ctx, sprites, x, y, r) {
  const img = sprites["bob-ghost-outline"];
  if (ok(img)) drawBob(ctx, img, x, y, r * 1.15);
}

export function drawTrail(ctx, pts, color, px, py, scale, width = 2) {
  if (pts.length < 2) return;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineJoin = ctx.lineCap = "round";
  const n = pts.length;
  for (let i = 1; i < n; i++) {
    ctx.globalAlpha = 0.15 + 0.85 * (i / n);
    ctx.beginPath();
    ctx.moveTo(px + pts[i - 1].x * scale, py + pts[i - 1].y * scale);
    ctx.lineTo(px + pts[i].x * scale, py + pts[i].y * scale);
    ctx.stroke();
  }
  ctx.restore();
}

// ---------- graphs ----------

function frame(ctx, w, h, pad, theme) {
  ctx.fillStyle = theme.graphBg;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = theme.axis;
  ctx.lineWidth = 1;
  ctx.strokeRect(pad.l + 0.5, pad.t + 0.5, w - pad.l - pad.r, h - pad.t - pad.b);
}

function fontFor(w) { return w < 420 ? 10 : 12; }

/**
 * Log-scale divergence plot. series: [{ t: [], d: [], color, fit }]
 * Y from 1e-10 to 10, X from 0 to max(20, latest t).
 */
export function drawDivergence(ctx, w, h, series, theme) {
  const fs = fontFor(w);
  const pad = { l: fs * 3.6, r: 10, t: 10, b: fs * 2.8 };
  frame(ctx, w, h, pad, theme);
  const yMin = -10, yMax = 1;
  let tMax = 20;
  for (const s of series) if (s.t.length) tMax = Math.max(tMax, Math.ceil(s.t[s.t.length - 1] / 10) * 10);
  const X = (t) => pad.l + (t / tMax) * (w - pad.l - pad.r);
  const Y = (lg) => pad.t + (1 - (lg - yMin) / (yMax - yMin)) * (h - pad.t - pad.b);
  ctx.font = `${fs}px Inter, system-ui, sans-serif`;
  ctx.fillStyle = theme.text;
  ctx.textAlign = "right"; ctx.textBaseline = "middle";
  const yStep = h < 200 ? 4 : 2;
  for (let e = yMin; e <= yMax; e += 1) {
    ctx.strokeStyle = theme.grid; ctx.beginPath(); ctx.moveTo(pad.l, Y(e)); ctx.lineTo(w - pad.r, Y(e)); ctx.stroke();
    if ((e - yMin) % yStep === 0 || e === 0) ctx.fillText(e === 0 ? "1" : "1e" + e, pad.l - 4, Y(e));
  }
  ctx.textAlign = "center"; ctx.textBaseline = "top";
  const tStep = tMax <= 20 ? 5 : tMax <= 60 ? 10 : 20;
  for (let t = 0; t <= tMax; t += tStep) ctx.fillText(String(t), X(t), h - pad.b + 4);
  ctx.fillText("time (s)", (pad.l + w - pad.r) / 2, h - fs - 4);
  // saturation line
  ctx.setLineDash([4, 4]); ctx.strokeStyle = theme.sat;
  ctx.beginPath(); ctx.moveTo(pad.l, Y(Math.log10(SATURATION))); ctx.lineTo(w - pad.r, Y(Math.log10(SATURATION))); ctx.stroke();
  ctx.setLineDash([]);
  for (const s of series) {
    ctx.strokeStyle = s.color; ctx.lineWidth = 2; ctx.beginPath();
    let started = false;
    for (let i = 0; i < s.t.length; i++) {
      const d = s.d[i];
      const lg = d > 0 ? Math.max(yMin, Math.min(yMax, Math.log10(d))) : yMin;
      if (!started) { ctx.moveTo(X(s.t[i]), Y(lg)); started = true; } else ctx.lineTo(X(s.t[i]), Y(lg));
    }
    ctx.stroke();
    if (s.fit && s.fit.lambda > 0.05) {
      ctx.setLineDash([6, 4]); ctx.strokeStyle = theme.fit; ctx.lineWidth = 1.5; ctx.beginPath();
      const f = (t) => (s.fit.b + s.fit.lambda * t) / Math.LN10;
      ctx.moveTo(X(s.fit.t0), Y(f(s.fit.t0))); ctx.lineTo(X(s.fit.t1), Y(Math.min(yMax, f(s.fit.t1)))); ctx.stroke();
      ctx.setLineDash([]);
    }
  }
  ctx.save();
  ctx.translate(fs, (pad.t + h - pad.b) / 2); ctx.rotate(-Math.PI / 2);
  ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = theme.text;
  ctx.fillText("separation (log)", 0, 0);
  ctx.restore();
}

/** Two phase portraits side by side: theta1 vs omega1 and theta2 vs omega2. */
export function drawPhase(ctx, w, h, runs, theme) {
  const fs = fontFor(w);
  const gap = 10, half = (w - gap) / 2;
  const W = 15;
  for (let k = 0; k < 2; k++) {
    const ox = k * (half + gap);
    const pad = { l: ox + fs * 2.2, r: w - (ox + half) + 6, t: fs + 8, b: fs * 2.4 };
    ctx.fillStyle = theme.graphBg; ctx.fillRect(ox, 0, half, h);
    ctx.strokeStyle = theme.axis; ctx.strokeRect(pad.l + 0.5, pad.t + 0.5, w - pad.l - pad.r, h - pad.t - pad.b);
    const X = (a) => pad.l + ((a + Math.PI) / (2 * Math.PI)) * (w - pad.l - pad.r);
    const Y = (om) => pad.t + (1 - (Math.max(-W, Math.min(W, om)) + W) / (2 * W)) * (h - pad.t - pad.b);
    ctx.strokeStyle = theme.grid;
    ctx.beginPath(); ctx.moveTo(X(0), pad.t); ctx.lineTo(X(0), h - pad.b); ctx.moveTo(pad.l, Y(0)); ctx.lineTo(w - pad.r, Y(0)); ctx.stroke();
    ctx.font = `${fs}px Inter, system-ui, sans-serif`; ctx.fillStyle = theme.text;
    ctx.textAlign = "left"; ctx.textBaseline = "top";
    ctx.fillText(k === 0 ? "Upper rod" : "Lower rod", ox + 4, 2);
    ctx.textAlign = "center";
    ctx.fillText("-180", X(-Math.PI) + fs, h - pad.b + 3);
    ctx.fillText("0", X(0), h - pad.b + 3);
    ctx.fillText("180", X(Math.PI) - fs, h - pad.b + 3);
    ctx.fillText(k === 0 ? "angle 1 (deg)" : "angle 2 (deg)", (pad.l + w - pad.r) / 2, h - fs - 2);
    ctx.textAlign = "right"; ctx.textBaseline = "middle";
    ctx.fillText("+" + W, pad.l - 3, Y(W - 1.5));
    ctx.fillText("-" + W, pad.l - 3, Y(-W + 1.5));
    ctx.fillText("0", pad.l - 3, Y(0));
    for (const r of runs) {
      const th = k === 0 ? r.th1 : r.th2, om = k === 0 ? r.om1 : r.om2;
      ctx.fillStyle = r.color;
      const n = th.length;
      for (let i = 0; i < n; i++) {
        ctx.globalAlpha = 0.25 + 0.75 * (i / n);
        ctx.fillRect(X(wrapAngle(th[i])) - 1, Y(om[i]) - 1, 2, 2);
      }
      ctx.globalAlpha = 1;
      if (n) { ctx.beginPath(); ctx.arc(X(wrapAngle(th[n - 1])), Y(om[n - 1]), 4, 0, 7); ctx.fill(); }
    }
  }
  ctx.save(); ctx.fillStyle = theme.text; ctx.font = `${fs}px Inter, system-ui, sans-serif`;
  ctx.textAlign = "right"; ctx.textBaseline = "top";
  ctx.fillText("rad/s", w - 8, 2);
  ctx.restore();
}

/** Prediction horizon against starting error. rows: [{ offsetDeg, horizon|null }] */
export function drawHorizon(ctx, w, h, rows, current, fit, theme) {
  const fs = fontFor(w);
  const pad = { l: fs * 3, r: 12, t: 10, b: fs * 2.8 };
  frame(ctx, w, h, pad, theme);
  const xMin = -8, xMax = 0, tMax = 30;
  const X = (lg) => pad.l + ((xMax - lg) / (xMax - xMin)) * (w - pad.l - pad.r);
  const Y = (t) => pad.t + (1 - t / tMax) * (h - pad.t - pad.b);
  ctx.font = `${fs}px Inter, system-ui, sans-serif`; ctx.fillStyle = theme.text;
  ctx.textAlign = "center"; ctx.textBaseline = "top";
  for (let e = xMin; e <= xMax; e += (w < 420 ? 2 : 1)) {
    ctx.strokeStyle = theme.grid; ctx.beginPath(); ctx.moveTo(X(e), pad.t); ctx.lineTo(X(e), h - pad.b); ctx.stroke();
    ctx.fillText(e === 0 ? "1" : "1e" + e, X(e), h - pad.b + 4);
  }
  ctx.fillText("starting error (deg), smaller to the right", (pad.l + w - pad.r) / 2, h - fs - 4);
  ctx.textAlign = "right"; ctx.textBaseline = "middle";
  for (let t = 0; t <= tMax; t += 10) {
    ctx.strokeStyle = theme.grid; ctx.beginPath(); ctx.moveTo(pad.l, Y(t)); ctx.lineTo(w - pad.r, Y(t)); ctx.stroke();
    ctx.fillText(t + " s", pad.l - 4, Y(t));
  }
  if (fit) {
    ctx.setLineDash([6, 4]); ctx.strokeStyle = theme.fit; ctx.beginPath();
    ctx.moveTo(X(xMin), Y(fit.intercept + fit.slope * xMin)); ctx.lineTo(X(xMax), Y(fit.intercept + fit.slope * xMax)); ctx.stroke();
    ctx.setLineDash([]);
  }
  for (const r of rows) {
    const lg = Math.log10(r.offsetDeg);
    ctx.fillStyle = r.horizon == null ? theme.sat : theme.a;
    const t = r.horizon == null ? tMax : Math.min(tMax, r.horizon);
    ctx.beginPath(); ctx.arc(X(lg), Y(t), 5, 0, 7); ctx.fill();
  }
  if (current && current.horizon != null) {
    ctx.strokeStyle = theme.b; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(X(Math.log10(current.offsetDeg)), Y(Math.min(tMax, current.horizon)), 8, 0, 7); ctx.stroke();
  }
}

export { DEG };
