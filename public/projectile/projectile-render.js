// Projectile Motion: drawing. Every number comes from projectile-physics.js.
//
// The art carries a thin light halo so dark ink stays readable on the dark
// theme. Where art layers stack (cannon on a cliff, barrel on its carriage,
// a ball on the ground), that halo must not show as a light ring. So each
// asset is split once into a "core" (the original silhouette) and a "ring"
// (the halo only). A scene draws every core in order, then slides every ring
// behind them with destination-over, so a halo only shows on the outside of
// the combined outline.

import { ART, RING_FRACTIONS } from "./projectile-physics.js";

const ASSET = "projectile/assets/";
const HALO = { 1024: 4, 512: 2, 256: 3, 128: 2 };   // erosion radius, px (halo width plus its soft edge)

export function loadImages(names, onload) {
  const out = {};
  for (const n of names) {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => { out[n] = splitHalo(img); onload && onload(n); };
    img.onerror = () => onload && onload(n);
    img.src = ASSET + n + ".webp";
  }
  return out;
}

// core = image x eroded alpha, ring = image x (1 - eroded alpha)
function splitHalo(img) {
  const w = img.naturalWidth, h = img.naturalHeight;
  const r = HALO[Math.max(w, h)] || 2;
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const x = c.getContext("2d", { willReadFrequently: true });
  x.drawImage(img, 0, 0);
  const data = x.getImageData(0, 0, w, h), px = data.data;
  const a = new Float32Array(w * h), tmp = new Float32Array(w * h), m = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) a[i] = px[i * 4 + 3] / 255;
  for (let y = 0; y < h; y++) for (let i = 0; i < w; i++) {
    let v = 1; for (let k = -r; k <= r; k++) { const j = Math.min(w - 1, Math.max(0, i + k)); v = Math.min(v, a[y * w + j]); } tmp[y * w + i] = v;
  }
  for (let y = 0; y < h; y++) for (let i = 0; i < w; i++) {
    let v = 1; for (let k = -r; k <= r; k++) { const j = Math.min(h - 1, Math.max(0, y + k)); v = Math.min(v, tmp[j * w + i]); } m[y * w + i] = a[y * w + i] > 0 ? Math.min(1, v / a[y * w + i]) : 0;
  }
  const core = new ImageData(w, h), ring = new ImageData(w, h);
  for (let i = 0; i < w * h; i++) {
    for (let k = 0; k < 3; k++) { core.data[i * 4 + k] = ring.data[i * 4 + k] = px[i * 4 + k]; }
    core.data[i * 4 + 3] = Math.round(px[i * 4 + 3] * m[i]);
    ring.data[i * 4 + 3] = Math.round(px[i * 4 + 3] * (1 - m[i]));
  }
  const mk = (d) => { const cc = document.createElement("canvas"); cc.width = w; cc.height = h; cc.getContext("2d").putImageData(d, 0, 0); return cc; };
  return { w, h, core: mk(core), ring: mk(ring), full: img };
}

export function readTokens() {
  const cs = getComputedStyle(document.documentElement);
  const g = (n, d) => cs.getPropertyValue(n).trim() || d;
  return {
    sky: g("--pj-sky", "#d6e6f3"), ink: g("--pj-ink", "#1c1c1c"), dim: g("--pj-ink-dim", "#4a4a4a"), chip: g("--pj-chip", "#ffffff"),
    path: g("--pj-path", "#1c1c1c"), ideal: g("--pj-ideal", "#6b6b6b"), drag: g("--pj-drag", "#b5179e"),
    vx: g("--pj-vx", "#1f5fbf"), vy: g("--pj-vy", "#b3261e"), v: g("--pj-v", "#1c1c1c"), red: g("--pj-red", "#d32f2f"),
    gold: g("--pj-gold", "#ffc43c"), worlds: [g("--pj-w0", "#1c1c1c"), g("--pj-w1", "#1f5fbf"), g("--pj-w2", "#b3261e"), g("--pj-w3", "#1f7a4d"), g("--pj-w4", "#8a5a00")],
    dark: document.documentElement.getAttribute("data-theme") === "dark"
  };
}

// World (m, y up) to screen. Fits [0 .. xMax] x [0 .. yMax] with margins for the launch site.
export function viewOf(w, h, xMax, yMax, padL = 110) {
  const padR = 28, padT = 44, padB = 54;
  const s = Math.min((w - padL - padR) / xMax, (h - padT - padB) / yMax);
  const ox = padL, oy = h - padB;
  return { s, w, h, padL, padB, toX: (x) => ox + x * s, toY: (y) => oy - y * s, fromX: (px) => (px - ox) / s, fromY: (py) => (oy - py) / s };
}
// A round number at or above x (1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6 or 8 x 10^n).
export function niceCeil(x) {
  const e = 10 ** Math.floor(Math.log10(x)), m = x / e;
  for (const n of [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (m <= n + 1e-9) return n * e;
  return 10 * e;
}

// ---------- art scene (stacked layers, no halo seams) ----------
// layers: [{ a: asset, x, y, w, h, rot, ox, oy, tint }] in screen px, bottom first.
// x, y is where the art point (ox, oy) in asset px lands; rot in radians.
let layerCanvas = null;
export function drawArt(ctx, layers) {
  const W = ctx.canvas.width, H = ctx.canvas.height;
  if (!layerCanvas) layerCanvas = document.createElement("canvas");
  if (layerCanvas.width !== W || layerCanvas.height !== H) { layerCanvas.width = W; layerCanvas.height = H; }
  const L = layerCanvas.getContext("2d");
  L.setTransform(1, 0, 0, 1, 0, 0); L.clearRect(0, 0, W, H);
  L.setTransform(ctx.getTransform());
  const put = (ly, which) => {
    const a = ly.a; if (!a) return;
    const src = which === "full" ? a.full : a[which];
    const k = ly.w / a.w, hh = ly.h ?? a.h * k;
    L.save(); L.translate(ly.x, ly.y); if (ly.rot) L.rotate(ly.rot); L.scale(k, hh / (ly.srcRect ? ly.srcRect[3] : a.h));
    if (ly.srcRect) L.drawImage(src, ...ly.srcRect, -(ly.ox || 0), -(ly.oy || 0), ly.srcRect[2], ly.srcRect[3]);
    else L.drawImage(src, -(ly.ox || 0), -(ly.oy || 0));
    L.restore();
  };
  L.globalCompositeOperation = "source-over";
  for (const ly of layers) { put(ly, "core"); if (ly.tint) put({ ...ly, a: ly.tint }, "full"); }
  L.globalCompositeOperation = "destination-over";
  for (let i = layers.length - 1; i >= 0; i--) put(layers[i], "ring");
  L.globalCompositeOperation = "source-over";
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(layerCanvas, 0, 0); ctx.restore();
}

// A tinted copy of a mask asset (keeps the asset shape {w, h, full}).
export function tinted(a, color) {
  if (!a) return null;
  const c = document.createElement("canvas"); c.width = a.w; c.height = a.h;
  const x = c.getContext("2d"); x.drawImage(a.full, 0, 0); x.globalCompositeOperation = "source-in"; x.fillStyle = color; x.fillRect(0, 0, a.w, a.h);
  return { w: a.w, h: a.h, full: c, core: c, ring: c };
}

// Ground: tile the strip so its walking surface sits on y = 0, and stretch its last row below.
export function groundLayers(img, V, stripH = 40) {
  const a = img["ground-strip"]; if (!a) return [];
  const k = stripH / ART.ground.h, tileW = ART.ground.w * k, y0 = V.toY(0) - ART.ground.surfaceY * k, out = [];
  for (let x = -((V.toX(0) % tileW) + tileW) % tileW - tileW; x < V.w + tileW; x += tileW) {
    out.push({ a, x, y: y0, w: tileW + 0.5, h: stripH });
    out.push({ a, x, y: y0 + stripH - 1, w: tileW + 0.5, h: V.h - y0 - stripH + 2, srcRect: [0, ART.ground.h - 2, ART.ground.w, 1] });
  }
  return out;
}

// Cannon with its muzzle at screen (mx, my), elevated angleDeg. Returns layers and the contact line y.
export function cannonLayers(img, mx, my, angleDeg, barrelPx = 74) {
  const k = barrelPx / (ART.barrel.muzzle[0] - ART.barrel.pivot[0]);
  const t = -angleDeg * Math.PI / 180;
  const px = mx - Math.cos(t) * barrelPx, py = my - Math.sin(t) * barrelPx;
  const groundY = py + (ART.base.ground - ART.base.socket[1]) * k;
  return {
    groundY, pivot: [px, py], width: ART.base.w * k,
    layers: [
      { a: img["cannon-base"], x: px, y: py, w: ART.base.w * k, ox: ART.base.socket[0], oy: ART.base.socket[1] },
      { a: img["cannon-barrel"], x: px, y: py, w: ART.barrel.w * k, rot: t, ox: ART.barrel.pivot[0], oy: ART.barrel.pivot[1] }
    ]
  };
}
// Cliff or tower whose top is at screen y `topY`, its ground at `groundY`, with its edge at screen x `edgeX`.
export function siteLayers(img, kind, edgeX, topY, groundY) {
  const span = Math.max(4, groundY - topY);
  if (kind === "tower") {
    const a = img["launch-tower"]; const k = span / (ART.tower.feetY - ART.tower.topY);
    return [{ a, x: edgeX - 40, y: topY, w: ART.tower.size * k, ox: 512, oy: ART.tower.topY }];
  }
  const a = img.cliff; const k = span / (ART.cliff.size - ART.cliff.ledgeY);
  // the cliff art is left-anchored: stretch it horizontally so the edge lands at edgeX
  const kx = Math.max(k, (edgeX + 10) / ART.cliff.edgeX);
  return [{ a, x: edgeX - ART.cliff.edgeX * kx, y: topY - ART.cliff.ledgeY * k, w: ART.cliff.size * kx, h: ART.cliff.size * k }];
}
export function ballLayer(img, art, x, y, r, rot = 0) {
  const a = img[art]; const k = r / ART.ball.r;
  return { a, x, y, w: ART.ball.size * k, rot, ox: 128, oy: 128 };
}
export function bullseyeLayers(img, tint, x, y, r) {
  const k = r / ART.bullseye.r;
  return [{ a: img["target-bullseye"], x, y, w: ART.bullseye.size * k, ox: 512, oy: 512, tint }];
}
export function cartLayer(img, x, groundY, w) {
  const a = img["target-cart"]; const k = w / 907;   // box spans 58..965 px
  return { a, x, y: groundY, w: 1024 * k, ox: 512, oy: 800 };
}

// ---------- vector overlays ----------
export function polyline(ctx, V, path, color, width = 2, dash = null, upTo = Infinity) {
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineJoin = "round"; if (dash) ctx.setLineDash(dash);
  ctx.beginPath(); let started = false;
  for (const p of path) { if (p.t > upTo) break; const X = V.toX(p.x), Y = V.toY(p.y); if (!started) { ctx.moveTo(X, Y); started = true; } else ctx.lineTo(X, Y); }
  ctx.stroke(); ctx.restore();
}
export function arrow(ctx, x, y, dx, dy, color, width = 2.5, head = 9) {
  const len = Math.hypot(dx, dy); if (len < 2) return;
  const ux = dx / len, uy = dy / len;
  ctx.save(); ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = width; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + dx - ux * head * 0.8, y + dy - uy * head * 0.8); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + dx, y + dy);
  ctx.lineTo(x + dx - ux * head - uy * head * 0.55, y + dy - uy * head + ux * head * 0.55);
  ctx.lineTo(x + dx - ux * head + uy * head * 0.55, y + dy - uy * head - ux * head * 0.55);
  ctx.closePath(); ctx.fill(); ctx.restore();
}
// Text on a paper chip so it reads on sky, rock or ground in both themes.
export function label(ctx, T, text, x, y, align = "center", color = null, size = 13) {
  ctx.save(); ctx.font = `600 ${size}px Inter, system-ui, sans-serif`; ctx.textBaseline = "middle";
  const w = ctx.measureText(text).width + 10, h = size + 8;
  const x0 = align === "center" ? x - w / 2 : align === "right" ? x - w : x;
  ctx.fillStyle = T.chip; ctx.globalAlpha = 0.92; ctx.beginPath(); ctx.roundRect(x0, y - h / 2, w, h, 5); ctx.fill(); ctx.globalAlpha = 1;
  ctx.fillStyle = color || T.ink; ctx.textAlign = "left"; ctx.fillText(text, x0 + 5, y + 0.5); ctx.restore();
}
export function ruler(ctx, V, T, xMax) {
  const step = niceCeil(xMax / 6), y = V.toY(0) + 30;
  for (let x = 0; x <= xMax + 1e-9; x += step) label(ctx, T, `${+x.toPrecision(4)} m`, V.toX(x), y, "center", T.ink, 12);
}
export function heightBar(ctx, V, T, x, y0, y1, text) {
  const X = V.toX(x);
  ctx.save(); ctx.strokeStyle = T.dim; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]);
  ctx.beginPath(); ctx.moveTo(X, V.toY(y0)); ctx.lineTo(X, V.toY(y1)); ctx.stroke(); ctx.restore();
  label(ctx, T, text, X, (V.toY(y0) + V.toY(y1)) / 2);
}
export function angleArc(ctx, T, x, y, angleDeg, r = 34) {
  ctx.save(); ctx.strokeStyle = T.ink; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + r + 14, y); ctx.stroke();
  ctx.beginPath(); ctx.arc(x, y, r, -angleDeg * Math.PI / 180, 0); ctx.stroke(); ctx.restore();
}
export { RING_FRACTIONS };
