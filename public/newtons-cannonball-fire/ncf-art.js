// Newton's Cannonball Fire: isolated art layer.
// Code-drawn chalk placeholders until Leo's art lands in ./art/ (see art/README.md).
// Swap is a file drop: if an image in ART loads, it is drawn instead of the placeholder.

import { VISUAL } from "./ncf-config.js";

export const ART = {
  space: "space.webp",
  earth: "earth.webp",
  mountain: "mountain.webp",
  cannon: "cannon.webp",
  ball: "ball.webp",
};

export function artUrl(name) {
  return new URL("./art/" + name, import.meta.url).href;
}

export function shown(img) {
  return !!(img && img.complete && img.naturalWidth > 0);
}

export function loadImages(onReady) {
  const images = {};
  // Only files listed in art/manifest.json are fetched, so missing Leo art never 404s.
  const manifestUrl = new URL("./art/manifest.json", import.meta.url).href;
  fetch(manifestUrl).then((r) => r.ok ? r.json() : { use: [] }).catch(() => ({ use: [] })).then(async (man) => {
    const use = new Set(man.use || []);
    await Promise.all(Object.entries(ART).map(async ([key, file]) => {
      if (!use.has(file) && !use.has(key)) { images[key] = null; return; }
      const img = new Image();
      images[key] = img;
      await new Promise((resolve) => { img.onload = resolve; img.onerror = () => { images[key] = null; resolve(); }; img.src = artUrl(file); });
    }));
    if (onReady) onReady(images);
  });
  return images;
}

function chalkStroke(ctx, color, width) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.globalAlpha = 0.92;
}

function wobbleCircle(ctx, x, y, r, steps, jitter) {
  ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const j = 1 + jitter * Math.sin(i * 1.7) * 0.35 + jitter * Math.cos(i * 0.9) * 0.25;
    const px = x + Math.cos(a) * r * j;
    const py = y + Math.sin(a) * r * j;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function grain(ctx, w, h) {
  const n = Math.min(1400, Math.floor((w * h) / 900));
  ctx.save();
  ctx.fillStyle = "#ffffff";
  let seed = 17;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < n; i++) {
    ctx.globalAlpha = 0.05 + rnd() * 0.06;
    ctx.fillRect(rnd() * w, rnd() * h, 1, 1);
  }
  ctx.restore();
}

/** Layout in canvas pixels: Earth centered, mountain at the top, cannon firing to the right (clockwise). */
export function layout(w, h) {
  const s = Math.min(w, h);
  const cx = w / 2, cy = h / 2;
  const earthR = s * VISUAL.earthFrac * 0.5;
  const mtnH = earthR * VISUAL.mountainFrac;
  const launchX = cx;
  const launchY = cy - earthR - mtnH * 0.82;
  return { cx, cy, earthR, mtnH, launchX, launchY, s };
}

/** Map a physical path onto the canvas: launch at the mountain, fire right.
 *  kind "falls" stretches the drop so it meets the drawn Earth (the mountain is not to scale).
 *  Bound and escape paths keep r / r_launch, so a circular shot stays at muzzle height. */
export function toCanvas(points, lay, R, kind) {
  const { cx, cy, earthR, launchX, launchY } = lay;
  if (!points?.length) return [];
  const p0 = points[0];
  const r0 = Math.hypot(p0.x, p0.y) || R;
  const erx = p0.x / r0, ery = p0.y / r0;
  const p1 = points[1] || p0;
  let tx = p1.x - p0.x, ty = p1.y - p0.y;
  const dot = tx * erx + ty * ery;
  tx -= dot * erx; ty -= dot * ery;
  let tlen = Math.hypot(tx, ty);
  if (tlen < 1e-12) { tx = -ery; ty = erx; tlen = Math.hypot(tx, ty) || 1; }
  tx /= tlen; ty /= tlen;
  const visR0 = Math.hypot(launchX - cx, launchY - cy) || (earthR + 1);
  const fall = kind === "falls" || kind === "drop" || kind === "lob";
  const out = [];
  for (const p of points) {
    const r = Math.hypot(p.x, p.y);
    const rad = p.x * erx + p.y * ery;
    const tan = p.x * tx + p.y * ty;
    const ang = Math.atan2(tan, rad);
    let visR;
    if (fall && r0 > R) visR = earthR + (r - R) / (r0 - R) * (visR0 - earthR);
    else visR = (r / r0) * visR0;
    out.push({
      x: cx + visR * Math.sin(ang),
      y: cy - visR * Math.cos(ang)
    });
  }
  return out;
}

export function drawSpace(ctx, w, h, images) {
  if (shown(images?.space)) {
    ctx.drawImage(images.space, 0, 0, w, h);
    return;
  }
  ctx.fillStyle = VISUAL.space;
  ctx.fillRect(0, 0, w, h);
  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = "#F7F3E8";
  const s = Math.min(w, h);
  const stars = Math.floor(s * 0.35);
  // Deterministic faint stars so the frame does not sparkle every tick.
  let seed = 1;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < stars; i++) {
    const x = rnd() * w, y = rnd() * h, r = rnd() < 0.15 ? 1.2 : 0.7;
    ctx.globalAlpha = 0.25 + rnd() * 0.55;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function drawEarth(ctx, lay, images) {
  const { cx, cy, earthR } = lay;
  if (shown(images?.earth)) {
    const d = earthR * 2;
    ctx.drawImage(images.earth, cx - earthR, cy - earthR, d, d);
    return;
  }
  ctx.save();
  ctx.fillStyle = VISUAL.earthFill;
  wobbleCircle(ctx, cx, cy, earthR, 96, 0.006);
  ctx.fill();
  chalkStroke(ctx, VISUAL.chalk, Math.max(2, earthR * 0.018));
  wobbleCircle(ctx, cx, cy, earthR, 96, 0.006);
  ctx.stroke();
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = Math.max(1, earthR * 0.008);
  wobbleCircle(ctx, cx, cy, earthR * 0.992, 96, 0.004);
  ctx.stroke();
  ctx.restore();
}

export function drawMountain(ctx, lay, images) {
  const { cx, cy, earthR, mtnH, launchX, launchY } = lay;
  if (shown(images?.mountain) && shown(images?.cannon)) {
    const w = mtnH * 2.8, h = mtnH * 1.4;
    ctx.drawImage(images.mountain, cx - w / 2, cy - earthR - h * 0.85, w, h);
    const cw = mtnH * 0.9, ch = mtnH * 0.55;
    ctx.drawImage(images.cannon, launchX - cw * 0.2, launchY - ch * 0.55, cw, ch);
    return;
  }
  if (shown(images?.mountain)) {
    const w = mtnH * 2.8, h = mtnH * 1.4;
    ctx.drawImage(images.mountain, cx - w / 2, cy - earthR - h * 0.85, w, h);
    drawCannonPlaceholder(ctx, launchX, launchY, mtnH);
    return;
  }
  ctx.save();
  chalkStroke(ctx, VISUAL.chalk, Math.max(1.8, mtnH * 0.08));
  ctx.beginPath();
  // A chalk mesa on the limb, like the sketch: a raised platform with sloped sides.
  const half = mtnH * 1.15;
  const top = cy - earthR - mtnH;
  const foot = earthR * 0.08;
  ctx.moveTo(cx - half - foot, cy - earthR + mtnH * 0.05);
  ctx.lineTo(cx - half * 0.55, top + mtnH * 0.18);
  ctx.lineTo(cx + half * 0.55, top + mtnH * 0.18);
  ctx.lineTo(cx + half + foot, cy - earthR + mtnH * 0.05);
  ctx.stroke();
  // Platform top
  ctx.beginPath();
  ctx.moveTo(cx - half * 0.5, top + mtnH * 0.18);
  ctx.lineTo(cx + half * 0.5, top + mtnH * 0.18);
  ctx.stroke();
  drawCannonPlaceholder(ctx, launchX, launchY, mtnH);
  ctx.restore();
}

function drawCannonPlaceholder(ctx, x, y, mtnH) {
  const s = mtnH * 0.42;
  chalkStroke(ctx, VISUAL.chalk, Math.max(1.6, s * 0.18));
  ctx.beginPath();
  ctx.moveTo(x - s * 0.35, y + s * 0.15);
  ctx.lineTo(x + s * 0.85, y - s * 0.05);
  ctx.lineTo(x + s * 0.85, y + s * 0.22);
  ctx.lineTo(x - s * 0.2, y + s * 0.32);
  ctx.closePath();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x - s * 0.05, y + s * 0.38, s * 0.16, 0, Math.PI * 2);
  ctx.stroke();
}

export function drawBall(ctx, x, y, lay, images, color) {
  const r = Math.max(3, lay.mtnH * 0.09);
  if (shown(images?.ball)) {
    ctx.drawImage(images.ball, x - r, y - r, r * 2, r * 2);
    return;
  }
  ctx.save();
  ctx.fillStyle = color || VISUAL.chalk;
  ctx.globalAlpha = 0.95;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawTrail(ctx, pts, color, reduced) {
  if (!pts || pts.length < 2) return;
  ctx.save();
  chalkStroke(ctx, color, reduced ? 2 : TRAIL_WIDTH(ctx));
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.stroke();
  ctx.restore();
}

function TRAIL_WIDTH(ctx) {
  return Math.max(2, Math.min(ctx.canvas.width, ctx.canvas.height) * 0.0045);
}

export function drawFrame(ctx, w, h, lay, images, trails, ball) {
  drawSpace(ctx, w, h, images);
  for (const t of trails) drawTrail(ctx, t.pts, t.color, t.reduced);
  drawEarth(ctx, lay, images);
  drawMountain(ctx, lay, images);
  if (ball) drawBall(ctx, ball.x, ball.y, lay, images, ball.color);
  grain(ctx, w, h);
}

export function hasLeoArt(images) {
  return shown(images?.earth) || shown(images?.mountain) || shown(images?.cannon);
}
