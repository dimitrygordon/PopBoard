// Waves & Interference: drawing. Reads state and draws to a 2D canvas. No
// physics decisions here: every number comes from waves-physics.js.
//
// The art carries a thin light halo for dark backgrounds. Where a sprite sits
// on top of another layer (a dipper or barrier on the water, the slit plate
// over the beam, the clamp over the string, the speaker over its wavefronts)
// that halo would show as a light ring, so those layers use a "bare" copy with
// the halo removed. Sprites alone on the paper keep their halo.

import {
  TAU, travelling, pulseOnString, twoPulses, standing, nodePositions, antinodePositions, harmonicWavelength,
  rippleHeight, slitIntensity, wavelengthRGB, beatSignal, wavelength, stringSpeed, STRING_MU, RIPPLE_SPEED,
  SOUND_SPEED, BEAT_F1, SINGLE_SLIT_WIDTH, ART, orderAngle, maxOrder
} from "./waves-physics.js";

const ASSET = "waves/assets/";
export const ART_NAMES = ["laser-pointer", "barrier-double-slit", "barrier-single-slit", "screen-front", "ripple-tank",
  "wave-dipper", "ripple-barrier-double-slit", "string-end-posts", "string-vibrator", "c-clamp", "tuning-fork", "speaker"];
const STACKED = ["wave-dipper", "barrier-double-slit", "barrier-single-slit", "ripple-barrier-double-slit", "c-clamp", "speaker"];

export function loadImages(onload) {
  const out = {};
  for (const n of ART_NAMES) {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => { if (STACKED.includes(n)) out[n + "Bare"] = stripHalo(img); onload && onload(n); };
    img.onerror = () => onload && onload(n);
    img.src = ASSET + n + ".webp";
    out[n] = img;
  }
  return out;
}

/** Remove the light halo: light pixels connected to the transparent outside are cleared. */
export function stripHalo(img) {
  const w = img.naturalWidth, h = img.naturalHeight, cv = document.createElement("canvas");
  cv.width = w; cv.height = h; const c = cv.getContext("2d", { willReadFrequently: true }); c.drawImage(img, 0, 0);
  const d = c.getImageData(0, 0, w, h), px = d.data, seen = new Uint8Array(w * h), q = [];
  const light = (i) => px[i * 4 + 3] > 0 && Math.min(px[i * 4], px[i * 4 + 1], px[i * 4 + 2]) > 150;
  for (let i = 0; i < w * h; i++) if (px[i * 4 + 3] < 20) { seen[i] = 1; q.push(i); }
  while (q.length) {
    const i = q.pop(), x = i % w, y = (i / w) | 0;
    for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1]) {
      if (j < 0 || seen[j]) continue; seen[j] = 1;
      if (light(j)) { px[j * 4 + 3] = 0; q.push(j); }
    }
  }
  c.putImageData(d, 0, 0);
  cv.complete = true; cv.naturalWidth = w; cv.naturalHeight = h; cv.dataset.bare = "1";
  return cv;
}

export function readTokens() {
  const cs = getComputedStyle(document.documentElement);
  const g = (n, d) => cs.getPropertyValue(n).trim() || d;
  return {
    paper: g("--wv-paper", "#f6f6f2"), ink: g("--wv-ink", "#1c1c1c"), dim: g("--wv-ink-dim", "#555"),
    wave: g("--wv-wave", "#c62828"), wave2: g("--wv-wave2", "#1f5fbf"), sum: g("--wv-sum", "#1c1c1c"),
    node: g("--wv-node", "#6a1b9a"), water: g("--wv-water", "#cfe6f5"), waterDeep: g("--wv-water-deep", "#3b7fb0"),
    grid: g("--wv-grid", "#d9d9d4"), accent: g("--wv-accent", "#e8792b"),
    dark: document.documentElement.getAttribute("data-theme") === "dark"
  };
}

const ok = (img) => img && img.complete && img.naturalWidth;
/** Draw a sprite so that art pixel (ax, ay) lands at (x, y), at scale s (screen px per art px). */
function sprite(ctx, img, x, y, s, ax, ay) {
  if (!ok(img)) return;
  ctx.drawImage(img, x - ax * s, y - ay * s, img.naturalWidth * s, img.naturalHeight * s);
}
function text(ctx, T, str, x, y, align = "left", color = T.ink, size = 13) {
  ctx.fillStyle = color; ctx.font = `${size}px ui-monospace, Menlo, monospace`; ctx.textAlign = align; ctx.fillText(str, x, y);
}
function arrow(ctx, x0, y0, x1, y1, color, w = 1.5) {
  const a = Math.atan2(y1 - y0, x1 - x0);
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = w;
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 - 8 * Math.cos(a - 0.4), y1 - 8 * Math.sin(a - 0.4));
  ctx.lineTo(x1 - 8 * Math.cos(a + 0.4), y1 - 8 * Math.sin(a + 0.4)); ctx.closePath(); ctx.fill();
}
function curve(ctx, x0, x1, fn, color, w = 2.5, n = 400) {
  ctx.strokeStyle = color; ctx.lineWidth = w; ctx.beginPath();
  for (let i = 0; i <= n; i++) { const x = x0 + ((x1 - x0) * i) / n, y = fn(x); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
  ctx.stroke();
}
function axisLine(ctx, T, x0, x1, y) {
  ctx.strokeStyle = T.grid; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
  ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke(); ctx.setLineDash([]);
}

// ---------- basics ----------
export function drawBasics(ctx, W, H, T, img, s, t) {
  const L = 4, x0 = 40, x1 = W - 30, px = (x1 - x0) / L;
  const lam = wavelength(s.speed, s.freq), wv = { A: s.amp, lambda: lam, f: s.freq, dir: 1 };
  if (s.kind === "transverse") {
    const yc = H * 0.42, sc = (H * 0.2) / 5;
    axisLine(ctx, T, x0, x1, yc);
    curve(ctx, x0, x1, (X) => yc - sc * travelling((X - x0) / px, t, wv), T.wave);
    // one marked particle moves only up and down
    const mx = x0 + px * 1.0, my = yc - sc * travelling(1.0, t, wv);
    ctx.fillStyle = T.wave2; ctx.beginPath(); ctx.arc(mx, my, 7, 0, TAU); ctx.fill();
    arrow(ctx, mx + 16, yc, mx + 16, yc - sc * s.amp, T.dim); text(ctx, T, "A", mx + 22, yc - (sc * s.amp) / 2);
    if (lam < L * 0.9) {
      // wavelength bracket between two crests
      const crest = ((t * s.freq + 0.25) % 1) * lam, cx = x0 + px * (crest + lam), ty = yc - sc * s.amp - 18;
      ctx.strokeStyle = T.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(cx, ty); ctx.lineTo(cx + px * lam, ty); ctx.stroke();
      text(ctx, T, "\u03bb", cx + (px * lam) / 2, ty - 6, "center");
    }
    text(ctx, T, "Transverse: each bit of rope moves up and down; the wave moves right.", x0, H - 40, "left", T.dim);
  } else {
    sprite(ctx, img.speaker, x0 + 30, H * 0.45, 70 / 640, 512, 512);
    const yc = H * 0.45, n = 70, sx = 18 / 5, left = x0 + 80;
    const span = (x1 - left) / px;
    for (let i = 0; i < n; i++) {
      const X0 = (span * i) / n;
      for (let r = -3; r <= 3; r++) {
        ctx.fillStyle = i === 20 && r === 0 ? T.wave2 : T.ink;
        ctx.beginPath(); ctx.arc(left + px * X0 + sx * travelling(X0, t, wv), yc + r * 14, i === 20 && r === 0 ? 5 : 2.4, 0, TAU); ctx.fill();
      }
    }
    text(ctx, T, "Longitudinal: air moves back and forth along the wave's direction.", x0, H - 58, "left", T.dim);
    text(ctx, T, "Crowded spots are compressions, spread spots are rarefactions.", x0, H - 40, "left", T.dim);
  }
  arrow(ctx, W - 120, 28, W - 40, 28, T.ink); text(ctx, T, `v = ${+s.speed.toPrecision(3)} m/s`, W - 130, 32, "right");
  // 1 m scale bar
  ctx.strokeStyle = T.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0, H - 20); ctx.lineTo(x0 + px, H - 20); ctx.stroke();
  text(ctx, T, "1 m", x0 + px + 6, H - 16);
}

// ---------- reflection ----------
export function drawReflect(ctx, W, H, T, img, s, t) {
  const x0 = 40, x1 = W - 90, L = 1, px = (x1 - x0) / L, yc = H * 0.45, sc = (H * 0.18) / 2;
  const p = { A: 2, w: s.pulseWidth / 100, v: s.pulseSpeed, L, x0: 0.2, end: s.end };
  curve(ctx, x0, x1, (X) => yc - sc * pulseOnString((X - x0) / px, t, p), T.wave);
  ctx.fillStyle = T.ink; ctx.fillRect(x0 - 10, yc - 30, 10, 60); // hand end at left
  if (s.end === "fixed") {
    sprite(ctx, img["c-clampBare"] || img["c-clamp"], x1 + 8, yc, 110 / 1024, 640, 512);
    text(ctx, T, "Fixed end", x1 - 10, yc + 90, "center");
  } else {
    ctx.strokeStyle = T.ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x1 + 8, yc - 90); ctx.lineTo(x1 + 8, yc + 90); ctx.stroke();
    const yEnd = yc - sc * pulseOnString(L, t, p);
    ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(x1 + 8, yEnd, 9, 5, 0, 0, TAU); ctx.stroke();
    text(ctx, T, "Free end (ring slides on a rod)", x1 - 10, yc + 110, "center");
  }
  const back = t * p.v > 2 * L - 0.2;
  text(ctx, T, back ? "" : (t * p.v > L - 0.2 ? "Reflected pulse" : "Incoming pulse"), x0, 30);
}

// ---------- superposition ----------
export function drawSuperpose(ctx, W, H, T, img, s, t) {
  const x0 = 40, x1 = W - 40, L = 1, px = (x1 - x0) / L, yc = H * 0.5, sc = (H * 0.12) / 2;
  const A2 = (s.side === "same" ? 1 : -1) * s.amp2, p = { A1: 2, A2, w: 0.06, v: s.pulseSpeed, L };
  axisLine(ctx, T, x0, x1, yc);
  ctx.setLineDash([6, 5]);
  curve(ctx, x0, x1, (X) => yc - sc * twoPulses((X - x0) / px, t, p).p1, T.wave, 1.8);
  curve(ctx, x0, x1, (X) => yc - sc * twoPulses((X - x0) / px, t, p).p2, T.wave2, 1.8);
  ctx.setLineDash([]);
  curve(ctx, x0, x1, (X) => yc - sc * twoPulses((X - x0) / px, t, p).sum, T.sum, 3);
  text(ctx, T, "dashed: each pulse alone", x0, 28, "left", T.dim);
  text(ctx, T, "solid: the rope (their sum)", x0, 46, "left", T.dim);
}

// ---------- standing waves ----------
export function drawStanding(ctx, W, H, T, img, s, t, slow) {
  const pw = Math.min(W - 40, 900), sc = pw / ART.posts.w, ox = (W - pw) / 2, oy = H * 0.42 - ART.posts.left[1] * sc;
  sprite(ctx, img["string-end-posts"], ox, oy, sc, 0, 0);
  const xa = ox + ART.posts.left[0] * sc, xb = ox + ART.posts.right[0] * sc, yc = oy + ART.posts.left[1] * sc;
  const v = stringSpeed(s.tension, STRING_MU), amp = Math.min(H * 0.16, 70);
  const tShow = t * slow; // display time, slowed so the shape is visible
  const n = s.n;
  ctx.globalAlpha = 0.25;
  curve(ctx, xa, xb, (X) => yc - amp * Math.sin((n * Math.PI * (X - xa)) / (xb - xa)), T.wave, 1.5);
  curve(ctx, xa, xb, (X) => yc + amp * Math.sin((n * Math.PI * (X - xa)) / (xb - xa)), T.wave, 1.5);
  ctx.globalAlpha = 1;
  curve(ctx, xa, xb, (X) => yc - (amp / 2) * standing(((X - xa) / (xb - xa)) * s.length, tShow, { A: 1, n, L: s.length, v: 2 * s.length }), T.wave, 3);
  for (const xN of nodePositions(n, 1)) {
    const X = xa + xN * (xb - xa);
    ctx.fillStyle = T.node; ctx.beginPath(); ctx.arc(X, yc, 6, 0, TAU); ctx.fill();
  }
  text(ctx, T, "● node (no motion)", W - 12, H - 40, "right", T.node);
  for (const xA of antinodePositions(n, 1)) text(ctx, T, "A", xa + xA * (xb - xa), yc - amp - 10, "center", T.dim);
  text(ctx, T, "A  antinode (biggest swing)", W - 12, H - 20, "right", T.dim);
  sprite(ctx, img["string-vibrator"], 16, H - 12, 90 / 1024, 54, 977);
  text(ctx, T, "driver", 62, H - 98, "center", T.dim);
  text(ctx, T, `L = ${+s.length.toPrecision(3)} m, \u03bb = ${+harmonicWavelength(n, s.length).toPrecision(3)} m`, W / 2, 28, "center");
  void v;
}

// ---------- ripple tank ----------
let rippleCanvas = null;
export function rippleGeometry(W, H) {
  const TW = 0.5, TH = 0.34, s = Math.min((W - 40) / TW, (H - 90) / TH), w = TW * s, h = TH * s;
  const x0 = (W - w) / 2, y0 = 40;
  return { s, x0, y0, w, h, srcX: x0 + 0.08 * s, cy: y0 + h / 2,
    toWorld: (X, Y) => ({ x: (X - (x0 + 0.08 * s)) / s, y: (y0 + h / 2 - Y) / s }),
    toScreen: (x, y) => ({ X: x0 + 0.08 * s + x * s, Y: y0 + h / 2 - y * s }) };
}
export function drawRipple(ctx, W, H, T, img, s, t) {
  const G = rippleGeometry(W, H), lam = wavelength(RIPPLE_SPEED, s.rippleF), d = s.sep / 100;
  const res = 3, cw = Math.max(2, Math.round(G.w / res)), ch = Math.max(2, Math.round(G.h / res));
  if (!rippleCanvas || rippleCanvas.width !== cw || rippleCanvas.height !== ch) { rippleCanvas = document.createElement("canvas"); rippleCanvas.width = cw; rippleCanvas.height = ch; }
  const rc = rippleCanvas.getContext("2d"), id = rc.createImageData(cw, ch), px = id.data;
  const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  const lo = hex(T.water), hi = hex(T.waterDeep);
  const sources = [{ x: 0, y: d / 2 }, { x: 0, y: -d / 2 }];
  const barrier = s.source === "barrier";
  for (let j = 0; j < ch; j++) for (let i = 0; i < cw; i++) {
    const w = G.toWorld(G.x0 + (i + 0.5) * res, G.y0 + (j + 0.5) * res);
    let h;
    if (barrier && w.x < 0) h = Math.cos(TAU * (s.rippleF * t - (w.x + 0.08) / lam)) * 1.2;
    else if (!barrier || w.x >= 0) h = rippleHeight(w.x, w.y, barrier ? t - 0.08 / RIPPLE_SPEED : t, sources, lam, s.rippleF) * (barrier ? 1.2 : 1);
    if (barrier && w.x < 0 && s.rippleF * t - (w.x + 0.08) / lam < 0) h = 0;
    const u = Math.max(0, Math.min(1, 0.5 + 0.28 * h)), k = (j * cw + i) * 4;
    for (let c = 0; c < 3; c++) px[k + c] = lo[c] + (hi[c] - lo[c]) * u;
    px[k + 3] = 255;
  }
  rc.putImageData(id, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(rippleCanvas, G.x0, G.y0, G.w, G.h);
  ctx.strokeStyle = T.ink; ctx.lineWidth = 2; ctx.strokeRect(G.x0, G.y0, G.w, G.h);
  const S = (x, y) => G.toScreen(x, y);
  ctx.save(); ctx.beginPath(); ctx.rect(G.x0, G.y0, G.w, G.h); ctx.clip();
  if (barrier) {
    // ripple barrier art: gaps 200 art px apart, scaled so they sit at +-d/2
    const sc = (d * G.s) / 200, A = ART.rippleBarrier, c = S(0, 0);
    const bx = c.X - 512 * sc, by = c.Y - 512 * sc;
    ctx.fillStyle = "#6e6e6e"; // same gray as the bar art
    ctx.fillRect(c.X - 20 * sc, G.y0, 40 * sc, by + A.y0 * sc - G.y0 + 1);
    ctx.fillRect(c.X - 20 * sc, by + A.y1 * sc - 1, 40 * sc, G.y0 + G.h - (by + A.y1 * sc) + 1);
    sprite(ctx, img["ripple-barrier-double-slitBare"] || img["ripple-barrier-double-slit"], bx, by, sc, 0, 0);
  } else {
    for (const so of sources) { const p = S(so.x, so.y); sprite(ctx, img["wave-dipperBare"] || img["wave-dipper"], p.X, p.Y, 120 / 1024, 512, 960); }
  }
  // antinodal lines (dashed) and the probe
  if (s.showLines) {
    const m = maxOrder(d, lam), o = S(0, 0);
    ctx.strokeStyle = T.ink; ctx.globalAlpha = 0.55; ctx.lineWidth = 1.2; ctx.setLineDash([6, 6]);
    for (let k = -m; k <= m; k++) {
      const th = orderAngle(k, d, lam); if (!Number.isFinite(th)) continue;
      ctx.beginPath(); ctx.moveTo(o.X, o.Y); ctx.lineTo(o.X + Math.cos(th) * 2000, o.Y - Math.sin(th) * 2000); ctx.stroke();
    }
    ctx.setLineDash([]); ctx.globalAlpha = 1;
  }
  const p = S(s.probe.x, s.probe.y);
  ctx.strokeStyle = T.wave; ctx.lineWidth = 1.5;
  for (const so of sources) { const q = S(so.x, so.y); ctx.beginPath(); ctx.moveTo(q.X, q.Y); ctx.lineTo(p.X, p.Y); ctx.stroke(); }
  ctx.strokeStyle = T.accent; ctx.lineWidth = 3; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.arc(p.X, p.Y, 16, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
  ctx.restore();
  if (W > 520) sprite(ctx, img["ripple-tank"], W - 10, 30, 80 / 1024, 973, 769);
  const sbx = G.x0 + G.w - 0.1 * G.s;
  ctx.strokeStyle = T.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sbx, G.y0 + G.h + 14); ctx.lineTo(G.x0 + G.w, G.y0 + G.h + 14); ctx.stroke();
  text(ctx, T, "10 cm", sbx - 6, G.y0 + G.h + 18, "right", T.ink, 12);
  text(ctx, T, "Top view of the water. Bright = crest, dark = trough.", G.x0, 26, "left", T.dim);
}

// ---------- double slit ----------
export function drawSlit(ctx, W, H, T, img, s) {
  const nm = s.lambdaNm, [r, g, b] = wavelengthRGB(nm), col = `rgb(${r},${g},${b})`;
  const lam = nm * 1e-9, d = s.slitD * 1e-3, L = s.screenL;
  const sceneH = H * 0.62, u = Math.min(W / 1024, sceneH / 520);
  const yc = 30 + 260 * u;
  const lx = 10, ls = (200 * u) / 922;
  sprite(ctx, img["laser-pointer"], lx, yc, ls, 51, 512);
  const beamX0 = lx + 922 * ls, bS = (300 * u) / 1024, bx = 300 * u, by = yc - 512 * bS;
  ctx.strokeStyle = col; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(beamX0, yc); ctx.lineTo(bx + 512 * bS, yc); ctx.stroke();
  const bar = s.slits === 1 ? "barrier-single-slit" : "barrier-double-slit";
  sprite(ctx, img[bar + "Bare"] || img[bar], bx, by, bS, 0, 0);
  const sS = (380 * u) / 1024, sx = W - 420 * u, sy = yc - 432 * sS;
  // wavefront arcs between the plate and the screen
  ctx.save(); ctx.beginPath(); ctx.rect(bx + 720 * bS, 0, sx + 200 * sS - (bx + 720 * bS), H); ctx.clip();
  ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.8;
  for (let k = 1; k <= 7; k++) { ctx.beginPath(); ctx.arc(bx + 512 * bS, yc, k * 28 * u, -1.1, 1.1); ctx.stroke(); }
  ctx.restore();
  sprite(ctx, img["screen-front"], sx, sy, sS, 0, 0);
  // paint the fringe pattern onto the panel: slits are vertical, so fringes are vertical stripes
  const [px0, py0, px1, py1] = ART.screen.panel, X0 = sx + px0 * sS, X1 = sx + px1 * sS, Y0 = sy + py0 * sS + 4, Y1 = sy + py1 * sS - 4;
  const halfW = 0.06; // half width of the panel in meters (12 cm wide screen)
  const opts = { lambda: lam, d, a: s.slits === 1 ? d : SINGLE_SLIT_WIDTH, slits: s.slits };
  for (let X = Math.ceil(X0) + 3; X < X1 - 3; X++) {
    const y = ((X - (X0 + X1) / 2) / ((X1 - X0) / 2)) * halfW, I = slitIntensity(Math.atan(y / L), opts);
    ctx.fillStyle = `rgba(${r},${g},${b},${Math.min(1, I).toFixed(3)})`; ctx.fillRect(X, Y0, 1, Y1 - Y0);
  }
  // intensity graph with mm scale
  const gy0 = sceneH + 20, gy1 = H - 30, gx0 = 40, gx1 = W - 30;
  ctx.strokeStyle = T.ink; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(gx0, gy1); ctx.lineTo(gx1, gy1); ctx.stroke();
  curve(ctx, gx0, gx1, (X) => { const y = ((X - (gx0 + gx1) / 2) / ((gx1 - gx0) / 2)) * halfW; return gy1 - (gy1 - gy0) * slitIntensity(Math.atan(y / L), opts); }, col, 2, 800);
  for (const mm of [-60, -30, 0, 30, 60]) { const X = (gx0 + gx1) / 2 + (mm / 60) * ((gx1 - gx0) / 2); text(ctx, T, `${mm}`, X, gy1 + 16, "center", T.dim, 11); }
  text(ctx, T, "position on screen (mm)", gx1, gy0 - 4, "right", T.dim, 12);
}

// ---------- beats ----------
export function drawBeats(ctx, W, H, T, img, s, t) {
  const f2 = BEAT_F1 + s.beatDf, x0 = 110, x1 = W - 20;
  sprite(ctx, img["tuning-fork"], 30, H * 0.3, 90 / 1024, 512, 512);
  sprite(ctx, img["tuning-fork"], 70, H * 0.3, 90 / 1024, 512, 512);
  const y1 = H * 0.22, y2 = H * 0.66, amp = H * 0.1;
  axisLine(ctx, T, x0, x1, y1); axisLine(ctx, T, x0, x1, y2);
  const win = 0.01; // 10 ms close-up
  curve(ctx, x0, x1, (X) => y1 - amp * beatSignal(((X - x0) / (x1 - x0)) * win, BEAT_F1, f2).a, T.wave, 2);
  curve(ctx, x0, x1, (X) => y1 - amp * beatSignal(((X - x0) / (x1 - x0)) * win, BEAT_F1, f2).b, T.wave2, 2);
  text(ctx, T, "First 10 ms: the two tones look almost the same", x0, y1 - amp - 12, "left", T.dim);
  const span = 2 / s.beatDf; // two beat periods
  ctx.fillStyle = T.sum; ctx.globalAlpha = 0.85;
  const N = Math.round(x1 - x0);
  for (let i = 0; i < N; i++) {
    const tt = (i / N) * span, e = beatSignal(tt, BEAT_F1, f2).env;
    ctx.fillRect(x0 + i, y2 - (amp / 2) * e, 1, amp * e);
  }
  ctx.globalAlpha = 1;
  const cur = x0 + ((t % span) / span) * (x1 - x0);
  ctx.strokeStyle = T.accent; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cur, y2 - amp * 1.2); ctx.lineTo(cur, y2 + amp * 1.2); ctx.stroke();
  text(ctx, T, `Sum over ${+span.toPrecision(3)} s: loud, soft, loud`, x0, y2 - amp * 1.2 - 8, "left", T.dim);
}

// ---------- Doppler ----------
export function drawDoppler(ctx, W, H, T, img, s, t) {
  const cy = H * 0.48, pxPerM = W / (SOUND_SPEED * 3.2), period = 0.25; // a front every 0.25 display s
  const vs = s.srcSpeed, loopT = Math.min((SOUND_SPEED * 2.4) / vs, 3), tt = t % loopT;
  const sx = (x) => W / 2 + x * pxPerM, pos = (time) => vs * (time - loopT / 2);
  const srcX = pos(tt);
  ctx.strokeStyle = T.wave2; ctx.lineWidth = 1.6;
  for (let k = 0; k * period <= tt; k++) {
    const te = k * period, ex = pos(te), r = SOUND_SPEED * (tt - te);
    ctx.beginPath(); ctx.arc(sx(ex), cy, r * pxPerM, 0, TAU); ctx.stroke();
  }
  sprite(ctx, img.speakerBare || img.speaker, sx(srcX), cy, 100 / 1024, 512, 512);
  arrow(ctx, sx(srcX) + 30, cy - 62, sx(srcX) + 30 + 20 + 60 * (vs / SOUND_SPEED), cy - 62, T.ink);
  text(ctx, T, "behind: lower pitch", 12, H - 20, "left", T.ink);
  text(ctx, T, "ahead: higher pitch", W - 12, H - 20, "right", T.ink);
  text(ctx, T, "Wavefronts bunch up ahead of the moving source and spread out behind it.", 12, 26, "left", T.dim);
}

// ---------- sandbox ----------
export function drawSandbox(ctx, W, H, T, img, s, t) {
  const x0 = 30, x1 = W - 30, L = 4, px = (x1 - x0) / L, sc = (H * 0.1) / 2;
  const w1 = { A: s.a1, lambda: wavelength(s.boxV, s.f1), f: s.f1, dir: s.dir1 }, w2 = { A: s.a2, lambda: wavelength(s.boxV, s.f2), f: s.f2, dir: s.dir2 };
  const rows = [[H * 0.2, "wave 1", (X) => travelling(X, t, w1), T.wave], [H * 0.42, "wave 2", (X) => travelling(X, t, w2), T.wave2],
    [H * 0.72, "sum", (X) => travelling(X, t, w1) + travelling(X, t, w2), T.sum]];
  for (const [yc, label, fn, color] of rows) {
    axisLine(ctx, T, x0, x1, yc);
    curve(ctx, x0, x1, (X) => yc - sc * fn((X - x0) / px), color, label === "sum" ? 3 : 2);
    text(ctx, T, label, x0, yc - sc * (label === "sum" ? 4.4 : 2.4), "left", T.dim);
  }
  ctx.strokeStyle = T.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0, H - 20); ctx.lineTo(x0 + px, H - 20); ctx.stroke();
  text(ctx, T, "1 m", x0 + px + 6, H - 16);
}
