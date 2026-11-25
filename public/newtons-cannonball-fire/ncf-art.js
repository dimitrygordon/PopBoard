// Newton's Cannonball Fire: isolated art layer.
// Leo's chalk (dark) and pencil (light) sprites live in ./art/.
// Layout numbers are Leo's 1600x900 stage (Earth center 800,468 r 270).
// If an image in the manifest fails to load, a code-drawn placeholder is used.

import { VISUAL, TRAIL, TRAIL_COLORS } from "./ncf-config.js";

// Design stage, in px. Everything scales by canvas.width / STAGE.w.
export const STAGE = {
  w: 1600,
  h: 900,
  cx: 800,
  cy: 468,
  earthR: 270,
  earthImg: { x: 518, y: 186, w: 564, h: 564 },
  mountain: { x: 665, y: 98, w: 270, h: 140 },
  pivotX: 808,
  pivotY: 60.28,
  muzzleX: 915.52,
  muzzleY: 60.28,
  muzzleFromPivot: 107.52,
  barrel: { w: 199.5, h: 47, pivotX: 85.12, pivotY: 23.52 },
  carriage: { x: 743.04, y: 46.84, w: 112, h: 83 },
  flash: { w: 145.5, h: 121, attachX: 6.72, attachY: 60.48 },
  ball: { w: 31.5, h: 31.5, r: 11.2 },
  tileSrc: 2400,
  tileShow: 1600,
  recoil: 13,
  carriageRecoil: 5,
};

export const ART_STEMS = {
  space: "space_tile",
  earth: "earth",
  mountain: "mountain",
  barrel: "cannon_barrel",
  carriage: "cannon_carriage",
  ball: "cannonball",
  flash1: "muzzle_flash_1",
  flash2: "muzzle_flash_2",
  flash3: "muzzle_flash_3",
};

export const ART_THEMELESS = {
  grain: "chalk_grain_tile_512.webp",
};

export const ART = { ...ART_STEMS, ...ART_THEMELESS };

export function artFile(stem, theme) {
  if (stem.endsWith(".webp") || stem.endsWith(".png")) return stem;
  return `${stem}_${theme}.webp`;
}

export function artUrl(name) {
  return new URL("./art/" + name, import.meta.url).href;
}

export function shown(img) {
  return !!(img && img.complete && img.naturalWidth > 0);
}

export function themeImg(images, key, theme) {
  const t = theme === "light" ? "light" : "dark";
  return images?.[key + "_" + t] || images?.[key];
}

function currentTheme() {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
}

function fetchOne(images, use, key, file) {
  if (!use.has(file) && !use.has(key)) { images[key] = null; return Promise.resolve(); }
  const img = new Image();
  images[key] = img;
  return new Promise((resolve) => {
    img.onload = resolve;
    img.onerror = () => { images[key] = null; resolve(); };
    img.src = artUrl(file);
  });
}

export function loadImages(onReady) {
  const images = {};
  const manifestUrl = new URL("./art/manifest.json", import.meta.url).href;
  fetch(manifestUrl).then((r) => r.ok ? r.json() : { use: [] }).catch(() => ({ use: [] })).then(async (man) => {
    const use = new Set(man.use || []);
    const first = currentTheme();
    const rest = first === "dark" ? "light" : "dark";
    const batch = (theme) => {
      const jobs = [];
      for (const [key, stem] of Object.entries(ART_STEMS)) {
        jobs.push(fetchOne(images, use, key + "_" + theme, artFile(stem, theme)));
      }
      return jobs;
    };
    const grainJobs = Object.entries(ART_THEMELESS).map(([key, file]) => fetchOne(images, use, key, file));
    await Promise.all([...batch(first), ...grainJobs]);
    if (onReady) onReady(images);
    await Promise.all(batch(rest));
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

/** Layout in canvas pixels, scaled from Leo's 1600x900 stage. */
export function layout(w, h) {
  const s = w / STAGE.w;
  const cx = STAGE.cx * s, cy = STAGE.cy * s;
  const earthR = STAGE.earthR * s;
  const launchX = STAGE.muzzleX * s;
  const launchY = STAGE.muzzleY * s;
  const visR0 = Math.hypot(launchX - cx, launchY - cy) || (earthR + 1);
  return {
    s, w, h, cx, cy, earthR, launchX, launchY, visR0,
    pivotX: STAGE.pivotX * s,
    pivotY: STAGE.pivotY * s,
    muzzleFromPivot: STAGE.muzzleFromPivot * s,
  };
}

/** Map a physical path onto Leo's Earth disc and muzzle.
 *  kind "falls" stretches r in [R, r_launch] onto [earthR, visR0] so landings
 *  meet the drawn limb (the mountain is not to scale). Bound and escape paths
 *  keep r / r_launch, so a circular shot stays at muzzle height. */
export function toCanvas(points, lay, R, kind) {
  const { cx, cy, earthR, launchX, launchY, visR0 } = lay;
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
    // Launch is at the muzzle, slightly right of 12 o'clock; +ang follows the barrel to the right.
    const launchAng = Math.atan2(launchX - cx, cy - launchY);
    const a = launchAng + ang;
    out.push({
      x: cx + visR * Math.sin(a),
      y: cy - visR * Math.cos(a)
    });
  }
  return out;
}

export function drawSpace(ctx, w, h, images, theme, lay) {
  const img = themeImg(images, "space", theme);
  if (shown(img)) {
    const pat = ctx.createPattern(img, "repeat");
    if (pat) {
      const s = (lay?.s || w / STAGE.w) * (STAGE.tileShow / STAGE.tileSrc);
      if (pat.setTransform && typeof DOMMatrix === "function") {
        pat.setTransform(new DOMMatrix().scale(s, s));
      }
      ctx.fillStyle = pat;
      ctx.fillRect(0, 0, w, h);
      return;
    }
  }
  ctx.fillStyle = theme === "light" ? "#FCF7EB" : (VISUAL.space || "#181A19");
  ctx.fillRect(0, 0, w, h);
  if (theme === "light") return;
  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = "#F7F3E8";
  const side = Math.min(w, h);
  const stars = Math.floor(side * 0.35);
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

export function drawEarth(ctx, lay, images, theme) {
  const { s, cx, cy, earthR } = lay;
  const img = themeImg(images, "earth", theme);
  if (shown(img)) {
    ctx.drawImage(img, STAGE.earthImg.x * s, STAGE.earthImg.y * s, STAGE.earthImg.w * s, STAGE.earthImg.h * s);
    return;
  }
  ctx.save();
  ctx.fillStyle = theme === "light" ? "#F7F0E0" : VISUAL.earthFill;
  wobbleCircle(ctx, cx, cy, earthR, 96, 0.006);
  ctx.fill();
  chalkStroke(ctx, theme === "light" ? "#2B2622" : VISUAL.chalk, Math.max(2, earthR * 0.018));
  wobbleCircle(ctx, cx, cy, earthR, 96, 0.006);
  ctx.stroke();
  ctx.restore();
}

export function drawMountain(ctx, lay, images, theme) {
  const { s, cx, cy, earthR } = lay;
  const img = themeImg(images, "mountain", theme);
  if (shown(img)) {
    ctx.drawImage(img, STAGE.mountain.x * s, STAGE.mountain.y * s, STAGE.mountain.w * s, STAGE.mountain.h * s);
    return;
  }
  const mtnH = earthR * (VISUAL.mountainFrac || 0.28);
  ctx.save();
  chalkStroke(ctx, theme === "light" ? "#2B2622" : VISUAL.chalk, Math.max(1.8, mtnH * 0.08));
  const half = mtnH * 1.15;
  const top = cy - earthR - mtnH;
  const foot = earthR * 0.08;
  ctx.beginPath();
  ctx.moveTo(cx - half - foot, cy - earthR + mtnH * 0.05);
  ctx.lineTo(cx - half * 0.55, top + mtnH * 0.18);
  ctx.lineTo(cx + half * 0.55, top + mtnH * 0.18);
  ctx.lineTo(cx + half + foot, cy - earthR + mtnH * 0.05);
  ctx.stroke();
  ctx.restore();
}

export function drawCannon(ctx, lay, images, theme, fx = {}) {
  const { s, pivotX, pivotY, muzzleFromPivot } = lay;
  const elev = fx.elevation || 0;
  const d = (fx.recoil || 0) * s;
  const dc = (fx.carriageRecoil || 0) * s;
  const barrel = themeImg(images, "barrel", theme);
  const carriage = themeImg(images, "carriage", theme);
  const flash = fx.flash ? themeImg(images, "flash" + fx.flash, theme) : null;
  if (shown(barrel)) {
    ctx.save();
    ctx.translate(pivotX, pivotY);
    ctx.rotate(-elev);
    ctx.translate(-d, 0);
    ctx.drawImage(barrel, -STAGE.barrel.pivotX * s, -STAGE.barrel.pivotY * s, STAGE.barrel.w * s, STAGE.barrel.h * s);
    if (shown(flash) && (fx.flashAlpha ?? 1) > 0) {
      ctx.globalAlpha = fx.flashAlpha ?? 1;
      ctx.drawImage(
        flash,
        muzzleFromPivot - STAGE.flash.attachX * s,
        -STAGE.flash.attachY * s,
        STAGE.flash.w * s,
        STAGE.flash.h * s
      );
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  } else {
    drawCannonPlaceholder(ctx, lay, theme, elev);
  }
  if (shown(carriage)) {
    ctx.drawImage(carriage, STAGE.carriage.x * s - dc, STAGE.carriage.y * s, STAGE.carriage.w * s, STAGE.carriage.h * s);
  }
}

function drawCannonPlaceholder(ctx, lay, theme, elev) {
  const { pivotX, pivotY, muzzleFromPivot, s } = lay;
  ctx.save();
  ctx.translate(pivotX, pivotY);
  ctx.rotate(-elev);
  chalkStroke(ctx, theme === "light" ? "#2B2622" : VISUAL.chalk, Math.max(2, 4 * s));
  ctx.beginPath();
  ctx.moveTo(-20 * s, 0);
  ctx.lineTo(muzzleFromPivot, 0);
  ctx.stroke();
  ctx.restore();
}

export function drawBall(ctx, x, y, lay, images, theme, color) {
  const s = lay.s;
  const img = themeImg(images, "ball", theme);
  const w = STAGE.ball.w * s, h = STAGE.ball.h * s;
  if (shown(img)) {
    ctx.drawImage(img, x - w / 2, y - h / 2, w, h);
    return;
  }
  ctx.save();
  ctx.fillStyle = color || VISUAL.chalk;
  ctx.globalAlpha = 0.95;
  ctx.beginPath();
  ctx.arc(x, y, STAGE.ball.r * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function trailWidth(lay) {
  return TRAIL.width * (lay?.s || 1);
}

export function trailColor(idOrKind, theme) {
  const t = theme === "light" ? "light" : "dark";
  const pal = TRAIL_COLORS[t];
  if (idOrKind === "blue") return pal.blue;
  if (idOrKind === "green") return pal.green;
  if (idOrKind === "red" || idOrKind === "circular") return pal.red;
  if (idOrKind === "yellow" || idOrKind === "ellipse" || idOrKind === "ellipseApo") return pal.yellow;
  if (idOrKind === "escape") return pal.escape;
  if (idOrKind === "falls" || idOrKind === "drop" || idOrKind === "lob") return pal.blue;
  return pal.yellow;
}

function strokePts(ctx, pts) {
  if (!pts || pts.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.stroke();
}

export function drawTrail(ctx, pts, color, lay, images, reduced) {
  if (!pts || pts.length < 2) return;
  const width = trailWidth(lay);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.globalAlpha = 0.6;
  strokePts(ctx, pts);
  ctx.restore();
  const grain = images?.grain;
  if (shown(grain) && !reduced) {
    try {
      const oc = typeof OffscreenCanvas === "function" ? new OffscreenCanvas(lay.w, lay.h) : Object.assign(document.createElement("canvas"), { width: lay.w, height: lay.h });
      if (!oc.getContext) return;
      const octx = oc.getContext("2d");
      if (!octx) return;
      octx.strokeStyle = color;
      octx.lineWidth = width;
      octx.lineCap = "round";
      octx.lineJoin = "round";
      strokePts(octx, pts);
      octx.globalCompositeOperation = "destination-in";
      const pat = octx.createPattern(grain, "repeat");
      if (pat) {
        octx.fillStyle = pat;
        octx.fillRect(0, 0, lay.w, lay.h);
        ctx.drawImage(oc, 0, 0);
      }
    } catch (e) { /* grain is optional */ }
  }
}

export function drawFrame(ctx, w, h, lay, images, trails, ball, opt = {}) {
  const theme = opt.theme === "light" ? "light" : "dark";
  drawSpace(ctx, w, h, images, theme, lay);
  drawEarth(ctx, lay, images, theme);
  for (const t of trails) drawTrail(ctx, t.pts, t.color, lay, images, t.reduced);
  drawMountain(ctx, lay, images, theme);
  drawCannon(ctx, lay, images, theme, opt);
  if (ball) drawBall(ctx, ball.x, ball.y, lay, images, theme, ball.color);
}

export function hasLeoArt(images, theme = "dark") {
  return shown(themeImg(images, "earth", theme)) || shown(themeImg(images, "mountain", theme)) || shown(themeImg(images, "barrel", theme));
}

export function muzzleTip(lay, elevation = 0, recoil = 0) {
  const d = recoil * lay.s;
  const e = elevation || 0;
  const reach = lay.muzzleFromPivot - d;
  return {
    x: lay.pivotX + reach * Math.cos(e),
    y: lay.pivotY - reach * Math.sin(e),
  };
}
