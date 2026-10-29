// Black Hole Explorer: drawing only. Physics comes from bh-physics.js.
// Leo's layers are 1024 x 1024, centered at (512, 512), shadow radius 150 px.
// The round shadow edge is the a = 0 capture radius 3 sqrt(3) M, which fixes
// the art scale at 150 / 5.196 = 28.9 art px per M.

import {
  iscoRadius, shadowEdges, circularEnergy,
  ergosphereEquator, rayPath, B_CRIT, tidalAtHorizon, hillsMass, G_EARTH, astronautFrame
} from "./bh-physics.js";

export const ART = 1024;
export const ART_RS = 150;               // shadow radius in art px
export const ART_PER_M = ART_RS / B_CRIT;
export const DISK_Y = 0.26;              // disk plane y-scale from MANIFEST.md
const SPIN_ART_LEFT = 137, SPIN_ART_RIGHT = 133; // measured edges of bh-spinning-shadow (px from 512)
const SPIN_ART_A = 0.9;

const FILES = [
  "starfield-lensed", "starfield-unlensed",
  "disk-outer-back", "disk-middle-back", "disk-inner-back", "disk-lensed-arc",
  "bh-shadow", "bh-photon-ring", "bh-spinning-shadow", "bh-spinning-photon-ring",
  "disk-outer-front", "disk-middle-front", "disk-inner-front", "probe-sprite",
  "spaghetti-astronaut-frame-1", "spaghetti-astronaut-frame-2", "spaghetti-astronaut-frame-3", "spaghetti-astronaut-frame-4",
  "spaghetti-star-frame-1", "spaghetti-star-frame-2", "spaghetti-star-frame-3", "spaghetti-star-frame-4", "spaghetti-star-frame-5"
];

export function loadArt(onReady) {
  const art = {};
  let left = FILES.length;
  for (const f of FILES) {
    const img = new Image();
    img.decoding = "async";
    const done = () => { if (--left === 0) { Object.defineProperty(art, "ready", { value: true }); onReady(art); } };
    img.src = "black-hole/assets/" + f + ".webp";
    img.decode().then(done, done); // decoded before first use, so cached layers never capture a blank image
    art[f] = img;
  }
  return art;
}

export function readTokens() {
  const cs = getComputedStyle(document.documentElement);
  const v = (k, d) => (cs.getPropertyValue(k) || d).trim();
  return { ink: v("--bh-ink", "#161616"), ink2: v("--bh-ink-2", "#4a4a4a"), ink3: v("--bh-ink-3", "#8a8a8a"),
    rule: v("--bh-rule", "#d6d6d6"), wash: v("--bh-wash", "#f2f2f2"), accent: v("--bh-accent", "#b8892b"),
    accentInk: v("--bh-accent-ink", "#8a6516"), hole: v("--bh-hole", "#161616"),
    sky: v("--bh-sky", "#0c0c0e"), paper: v("--bh-paper", "#fff") };
}

/** Photon ring tint (gold, the manifest's suggestion) applied once to an offscreen copy. */
const tintCache = new Map();
function tinted(img, color) {
  const key = img.src + color;
  if (tintCache.has(key)) return tintCache.get(key);
  if (!img.complete || !img.naturalWidth) return null;
  const c = document.createElement("canvas");
  c.width = c.height = ART;
  const x = c.getContext("2d");
  x.drawImage(img, 0, 0);
  x.globalCompositeOperation = "multiply";
  x.fillStyle = color; x.fillRect(0, 0, ART, ART);
  x.globalCompositeOperation = "destination-in";
  x.drawImage(img, 0, 0);
  tintCache.set(key, c);
  return c;
}

/**
 * Horizontal mapping for the shadow and ring so their left and right edges
 * land on the true equatorial shadow edges b_pro and b_retro for this spin.
 * Vertical size is left as drawn (simplification, documented).
 */
function shadowTransform(a, spinning) {
  const e = shadowEdges(a);
  const halfW = (e.width / 2) * ART_PER_M, shift = e.shift * ART_PER_M;
  if (!spinning) return { sx: halfW / ART_RS, dx: shift };
  const artHalf = (SPIN_ART_LEFT + SPIN_ART_RIGHT) / 2, artCenter = (SPIN_ART_RIGHT - SPIN_ART_LEFT) / 2;
  const sx = halfW / artHalf;
  return { sx, dx: shift - artCenter * sx };
}

/**
 * Cached composite: everything that only changes with spin, lensing mix or
 * canvas size. Per-frame work is one drawImage plus vector overlays.
 */
export function buildComposite(cache, art, { a, lensMix, px, ringColor }) {
  cache.width = cache.height = px;
  const ctx = cache.getContext("2d");
  ctx.clearRect(0, 0, px, px);
  if (!art.ready) return false;
  const k = px / ART;
  ctx.setTransform(k, 0, 0, k, 0, 0);
  const draw = (img, alpha = 1) => { if (img && img.naturalWidth !== 0 && alpha > 0.001) { ctx.globalAlpha = alpha; ctx.drawImage(img, 0, 0); } };
  draw(art["starfield-unlensed"], 1 - lensMix);
  draw(art["starfield-lensed"], lensMix);
  ctx.globalAlpha = 1;
  ["disk-outer-back", "disk-middle-back", "disk-inner-back"].forEach((f) => draw(art[f]));
  const w = Math.min(1, a / SPIN_ART_A);
  // The lensed arc hugs the photon ring, so it follows the round shadow's mapping.
  const ta = shadowTransform(a, false);
  ctx.setTransform(k * ta.sx, 0, 0, k, k * (512 + ta.dx - 512 * ta.sx), 0);
  draw(art["disk-lensed-arc"]);
  const ring = (img) => (img.naturalWidth ? tinted(img, ringColor) : null);
  for (const [spinning, alpha] of [[false, 1 - w], [true, w]]) {
    if (alpha <= 0.001) continue;
    const t = shadowTransform(a, spinning);
    ctx.setTransform(k * t.sx, 0, 0, k, k * (512 + t.dx - 512 * t.sx), 0);
    ctx.globalAlpha = alpha;
    const sh = art[spinning ? "bh-spinning-shadow" : "bh-shadow"], rg = art[spinning ? "bh-spinning-photon-ring" : "bh-photon-ring"];
    if (sh.naturalWidth) ctx.drawImage(sh, 0, 0);
    const rt = ring(rg); if (rt) ctx.drawImage(rt, 0, 0);
  }
  ctx.setTransform(k, 0, 0, k, 0, 0);
  ctx.globalAlpha = 1;
  ["disk-outer-front", "disk-middle-front", "disk-inner-front"].forEach((f) => draw(art[f]));
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  return true;
}

function label(ctx, text, x, y, color, align = "left", size = 12) {
  ctx.font = `600 ${size}px Inter, system-ui, sans-serif`;
  ctx.textAlign = align; ctx.textBaseline = "middle";
  ctx.lineWidth = 3; ctx.strokeStyle = "rgba(0,0,0,0.75)"; ctx.strokeText(text, x, y);
  ctx.fillStyle = color; ctx.fillText(text, x, y);
}
function arrow(ctx, x0, y0, x1, y1, color, head = 7) {
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  const ang = Math.atan2(y1 - y0, x1 - x0);
  ctx.beginPath(); ctx.moveTo(x1, y1);
  ctx.lineTo(x1 - head * Math.cos(ang - 0.4), y1 - head * Math.sin(ang - 0.4));
  ctx.lineTo(x1 - head * Math.cos(ang + 0.4), y1 - head * Math.sin(ang + 0.4));
  ctx.closePath(); ctx.fill();
}
function ellipse(ctx, cx, cy, r, ys, color, dash) {
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.setLineDash(dash || []);
  ctx.beginPath(); ctx.ellipse(cx, cy, r, r * ys, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
}

/** Per-frame stage: composite plus code-drawn markers. st = { mode, a, r, massSun, phase, lensMix, readouts }. */
export function drawStage(ctx, W, H, dpr, cache, art, T, st) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = T.sky; ctx.fillRect(0, 0, W, H);
  const side = cache.width / dpr;
  const ox = (W - side) / 2, oy = (H - side) / 2;
  ctx.drawImage(cache, ox, oy, side, side);
  const k = side / ART, cx = ox + 512 * k, cy = oy + 512 * k, pm = ART_PER_M * k; // px per M
  const R = st.readouts, a = st.a;
  const white = "#f4f4f4", gray = "#b5b5b5";

  if (st.mode === "horizon") {
    // To-scale circles without lensing: what the shadow edge is made of.
    ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = white; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(cx, cy, R.rPlus * pm, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    label(ctx, "horizon r+ (hidden, to scale)", cx, cy + R.rPlus * pm + 12, white, "center", 11);
    const e = shadowEdges(a);
    for (const [b, name, s] of [[e.pro, "prograde edge", -1], [e.retro, "retrograde edge", 1]]) {
      const x = cx + s * b * pm;
      ctx.strokeStyle = T.accent; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x, cy - 26); ctx.lineTo(x, cy + 26); ctx.stroke();
      label(ctx, name, x + s * 4, cy - 34, T.accent, s < 0 ? "right" : "left");
    }
    if (a > 0.02) { arrow(ctx, cx + 60, 40, cx - 60, 40, gray); label(ctx, "spin: the left side moves toward you", cx, 24, gray, "center", 11); }
  }
  if (st.mode === "lensing") {
    ctx.save(); ctx.setLineDash([3, 5]); ctx.strokeStyle = gray; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, 202 * k, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    label(ctx, "Einstein ring of this star field (size is illustrative)", cx, cy + 202 * k + 14, gray, "center", 11);
  }
  if (st.mode === "disk" || st.mode === "orbits" || st.mode === "sandbox") {
    ellipse(ctx, cx, cy, R.iscoPro * pm, DISK_Y, T.accent, [6, 4]);
    ellipse(ctx, cx, cy, R.iscoRetro * pm, DISK_Y, white, [2, 4]);
    label(ctx, "prograde ISCO", cx + R.iscoPro * pm + 4, cy + 8, T.accent);
    label(ctx, "retrograde ISCO", cx + R.iscoRetro * pm + 4, cy - 10, white);
  }
  // Probe on a circle in the disk plane (or hovering, in Time and Tides).
  const pr = st.r * pm;
  const ang = st.phase;
  const hovering = st.mode === "time" || st.mode === "tides" || R.status !== "stable";
  const px = cx + pr * (hovering ? 1 : Math.cos(ang)), py = cy + pr * DISK_Y * (hovering ? 0 : Math.sin(ang));
  const behind = !hovering && Math.sin(ang) < 0 && Math.abs(px - cx) < R.shadowRetro * pm;
  if (st.mode === "orbits" || st.mode === "time" || st.mode === "tides" || st.mode === "sandbox") {
    if (!hovering) ellipse(ctx, cx, cy, pr, DISK_Y, gray, [2, 5]);
    const img = art["probe-sprite"];
    if (px < W - 4 && !behind && img.naturalWidth) {
      const s = Math.max(28, 46 * k * 1.6);
      ctx.drawImage(img, px - s / 2, py - s / 2, s, s);
    } else if (px >= W - 4) {
      arrow(ctx, W - 70, cy, W - 12, cy, white);
      label(ctx, "probe off view", W - 74, cy - 14, white, "right", 11);
    }
  }
  // Scale bar: 5 M, labelled in km for this mass (the picture is the same for every mass).
  const bar = 5 * pm, bx = 14, by = 30;
  ctx.strokeStyle = white; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + bar, by); ctx.moveTo(bx, by - 5); ctx.lineTo(bx, by + 5); ctx.moveTo(bx + bar, by - 5); ctx.lineTo(bx + bar, by + 5); ctx.stroke();
  label(ctx, "5 GM/c\u00b2 = " + st.fmtLen(5 * st.mPerM), bx, by - 14, white, "left", 11);
}

// ---------- side diagram ----------

function frame(ctx, W, H, T, dpr) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = T.paper; ctx.fillRect(0, 0, W, H);
}
function text(ctx, s, x, y, color, align = "left", size = 12, weight = 500) {
  ctx.font = `${weight} ${size}px Inter, system-ui, sans-serif`;
  ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = "middle"; ctx.fillText(s, x, y);
}

/** Top-down equatorial map, linear, 10 M radius. */
function drawMap(ctx, W, H, T, st) {
  const R = st.readouts, cx = W / 2, cy = H / 2 + 6, view = 10, s = (Math.min(W, H) / 2 - 18) / view;
  const circle = (r, color, dash, lw = 1.5) => { ctx.save(); ctx.setLineDash(dash || []); ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.beginPath(); ctx.arc(cx, cy, r * s, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); };
  ctx.fillStyle = T.hole; ctx.beginPath(); ctx.arc(cx, cy, R.rPlus * s, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = T.ink2; ctx.lineWidth = 1; ctx.stroke();
  circle(ergosphereEquator(), T.ink2, [5, 4]);
  circle(R.photonPro, T.ink3); circle(R.photonRetro, T.ink3, [1, 3]);
  circle(R.iscoPro, T.accentInk, [], 2); circle(R.iscoRetro, T.accentInk, [6, 4], 2);
  const rows = [["horizon r+", T.ink, []], ["ergosphere (equator)", T.ink2, [5, 4]], ["photon orbit pro / retro", T.ink3, []], ["ISCO pro / retro", T.accentInk, []]];
  rows.forEach(([n, c, d], i) => { ctx.save(); ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.setLineDash(d); ctx.beginPath(); ctx.moveTo(10, 14 + i * 16); ctx.lineTo(28, 14 + i * 16); ctx.stroke(); ctx.restore(); text(ctx, n, 34, 14 + i * 16, T.ink2, "left", 11); });
  if (st.a > 0.02) {
    ctx.save(); ctx.strokeStyle = T.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(cx, cy, (view - 0.6) * s, -2.2, -0.9); ctx.stroke(); ctx.restore();
    const ex = cx + (view - 0.6) * s * Math.cos(-0.9), ey = cy + (view - 0.6) * s * Math.sin(-0.9);
    arrow(ctx, ex - 6, ey - 7, ex, ey, T.ink);
    text(ctx, "spin", ex + 6, ey - 8, T.ink, "left", 11);
  }
  if (st.showProbe) {
    if (st.r <= view) { ctx.fillStyle = T.ink; ctx.beginPath(); ctx.arc(cx + st.r * s, cy, 4, 0, Math.PI * 2); ctx.fill(); text(ctx, "probe", cx + st.r * s, cy - 11, T.ink, "center", 11); }
    else { arrow(ctx, cx + (view - 1.5) * s, cy, cx + view * s, cy, T.ink); text(ctx, "probe", cx + (view - 1.5) * s, cy - 11, T.ink, "center", 11); }
  }
  text(ctx, "equatorial plane from above, to scale: 10 GM/c\u00b2 to the edge", W / 2, H - 9, T.ink3, "center", 10);
}

const rayCache = new Map();
function cachedRay(b) {
  const key = b.toFixed(3);
  if (!rayCache.has(key)) { if (rayCache.size > 60) rayCache.clear(); rayCache.set(key, rayPath(b)); }
  return rayCache.get(key);
}
function drawRays(ctx, W, H, T, st) {
  const view = 16, s = W / (2 * view), cx = W / 2, cy = H / 2;
  const X = (x) => cx + x * s, Y = (y) => cy - y * s;
  ctx.fillStyle = T.hole; ctx.beginPath(); ctx.arc(cx, cy, 2 * s, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = T.ink2; ctx.lineWidth = 1; ctx.stroke();
  ctx.save(); ctx.setLineDash([3, 3]); ctx.strokeStyle = T.ink3; ctx.beginPath(); ctx.arc(cx, cy, 3 * s, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  const path = (pts, color, lw) => { ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(X(p.x), Y(p.y)) : ctx.moveTo(X(p.x), Y(p.y)))); ctx.stroke(); };
  for (const b of [2.5, 4, 5.0, 5.6, 7, 10, 14]) path(cachedRay(b).points, T.ink3, 1);
  const cur = cachedRay(Math.min(st.r, 40));
  path(cur.points, T.accentInk, 2.5);
  text(ctx, "photon sphere 3M", X(0), Y(3.6), T.ink2, "center", 11);
  text(ctx, "light arrives from the left; gold ray uses b = probe distance", W / 2, 12, T.ink2, "center", 11);
  text(ctx, "a = 0 ray tracing (spin not included)", W / 2, H - 9, T.ink3, "center", 10);
}

/** E(r) for circular orbits, prograde and retrograde. ISCO is the minimum. */
function drawEnergy(ctx, W, H, T, st) {
  const L = 36, Rr = W - 12, Tp = 26, B = H - 30;
  const lx0 = 0, lx1 = Math.log10(40);
  const E0 = 0.55, E1 = 1.12;
  const X = (r) => L + ((Math.log10(r) - lx0) / (lx1 - lx0)) * (Rr - L), Y = (E) => B - ((E - E0) / (E1 - E0)) * (B - Tp);
  ctx.strokeStyle = T.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(L, Tp); ctx.lineTo(L, B); ctx.lineTo(Rr, B); ctx.stroke();
  for (const r of [1, 2, 3, 6, 10, 20, 40]) { text(ctx, String(r), X(r), B + 10, T.ink2, "center", 10); }
  text(ctx, "r in units of GM/c\u00b2 (log)", Rr, B + 22, T.ink2, "right", 10);
  for (const E of [0.6, 0.8, 1.0]) text(ctx, E.toFixed(1), L - 4, Y(E), T.ink2, "right", 10);
  ctx.save(); ctx.setLineDash([2, 3]); ctx.strokeStyle = T.ink3; ctx.beginPath(); ctx.moveTo(L, Y(1)); ctx.lineTo(Rr, Y(1)); ctx.stroke(); ctx.restore();
  text(ctx, "E = 1: just unbound", Rr - 2, Y(1) - 8, T.ink3, "right", 10);
  for (const [dir, dash] of [[1, []], [-1, [6, 4]]]) {
    ctx.save(); ctx.setLineDash(dash); ctx.strokeStyle = T.ink; ctx.lineWidth = 1.8; ctx.beginPath();
    let on = false;
    for (let i = 0; i <= 400; i++) {
      const r = Math.pow(10, lx0 + (i / 400) * (lx1 - lx0));
      const E = circularEnergy(r, st.a, dir);
      if (E == null || E > E1) { on = false; continue; }
      on ? ctx.lineTo(X(r), Y(E)) : ctx.moveTo(X(r), Y(E)); on = true;
    }
    ctx.stroke(); ctx.restore();
    const ri = iscoRadius(st.a, dir), Ei = circularEnergy(ri, st.a, dir);
    ctx.fillStyle = T.accentInk; ctx.beginPath(); ctx.arc(X(ri), Y(Ei), 5, 0, Math.PI * 2); ctx.fill();
    text(ctx, dir > 0 ? "prograde ISCO" : "retrograde ISCO", X(ri), Y(Ei) + 14, T.ink, "center", 10, 600);
  }
  const xr = X(Math.min(st.r, 40));
  ctx.strokeStyle = T.accentInk; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(xr, Tp); ctx.lineTo(xr, B); ctx.stroke();
  text(ctx, "probe", xr + 4, Tp + 6, T.accentInk, "left", 11, 600);
  text(ctx, "energy per unit rest energy of circular orbits (solid prograde, dashed retrograde)", W / 2, 10, T.ink2, "center", 10);
}

function dial(ctx, x, y, rad, frac, T, title, sub) {
  ctx.fillStyle = T.paper; ctx.strokeStyle = T.ink; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  for (let i = 0; i < 12; i++) { const t = (i / 12) * Math.PI * 2; ctx.lineWidth = i % 3 ? 1 : 2; ctx.beginPath(); ctx.moveTo(x + Math.sin(t) * rad * 0.82, y - Math.cos(t) * rad * 0.82); ctx.lineTo(x + Math.sin(t) * rad * 0.95, y - Math.cos(t) * rad * 0.95); ctx.stroke(); }
  if (frac == null) { text(ctx, "cannot", x, y - 7, T.ink2, "center", 11, 600); text(ctx, "exist here", x, y + 8, T.ink2, "center", 11, 600); }
  else {
    const t = frac * Math.PI * 2;
    ctx.strokeStyle = T.accentInk; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.sin(t) * rad * 0.75, y - Math.cos(t) * rad * 0.75); ctx.stroke();
    ctx.fillStyle = T.ink; ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
  }
  text(ctx, title, x, y + rad + 14, T.ink, "center", 12, 600);
  text(ctx, sub, x, y + rad + 29, T.ink2, "center", 11);
}
function drawClocks(ctx, W, H, T, st) {
  const R = st.readouts, rad = Math.min(W / 7.5, H / 3.4), y = H / 2 - 12;
  // Reference: the hovering clock reads st.clockMinutes; far = hovering / rate, rate = sqrt(1 - 2/r).
  const hov = st.clockMinutes, far = R.hover > 0 ? hov / R.hover : 0;
  const orb = R.orbit ? far * R.orbit : null;
  dial(ctx, W * 0.18, y, rad, (far / 60) % 1, T, "far away", far.toFixed(0) + " min");
  dial(ctx, W * 0.5, y, rad, (hov / 60) % 1, T, "hovering probe", hov.toFixed(0) + " min");
  dial(ctx, W * 0.82, y, rad, orb == null ? null : (orb / 60) % 1, T, "orbiting probe", orb == null ? "no stable orbit" : orb.toFixed(1) + " min");
  text(ctx, "one minute hand turn = 60 minutes on that clock", W / 2, 12, T.ink2, "center", 11);
}

function drawTides(ctx, W, H, T, st, art) {
  const R = st.readouts, band = Math.round(H * 0.42);
  ctx.fillStyle = T.sky; ctx.fillRect(0, 0, W, band);
  const af = astronautFrame(R.stretchG);
  const aimg = art["spaghetti-astronaut-frame-" + af];
  const half = W / 2;
  const sz = Math.min(half * 1.05, band * 1.6);
  if (aimg.naturalWidth) ctx.drawImage(aimg, half / 2 - sz / 2, band / 2 - sz / 2, sz, sz);
  let sf = 1;
  if (!R.swallowedWhole) sf = R.rtOverRp > 100 ? 5 : R.rtOverRp > 10 ? 4 : R.rtOverRp > 3 ? 3 : 2;
  const simg = art["spaghetti-star-frame-" + sf];
  if (simg.naturalWidth) ctx.drawImage(simg, half + half / 2 - sz / 2, band / 2 - sz / 2, sz, sz);
  ctx.fillStyle = "#e6e6e6"; ctx.font = "600 11px Inter, system-ui, sans-serif"; ctx.textAlign = "center";
  ctx.fillText("2 m astronaut at the probe", half / 2, 12);
  ctx.fillText(R.swallowedWhole ? "Sun-like star: swallowed whole" : "Sun-like star: torn apart outside r+", half * 1.5, 12);
  arrow(ctx, W - 44, band - 14, W - 8, band - 14, "#e6e6e6"); ctx.fillText("hole", W - 26, band - 26);
  // Graph: stretch at the horizon versus mass (log-log), 2 m body.
  const L = 44, Rr = W - 12, Tp = band + 24, B = H - 26;
  const x0 = 0, x1 = 10, y0 = -6, y1 = 12;
  const X = (lm) => L + ((lm - x0) / (x1 - x0)) * (Rr - L), Y = (lg) => B - ((lg - y0) / (y1 - y0)) * (B - Tp);
  ctx.strokeStyle = T.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(L, Tp); ctx.lineTo(L, B); ctx.lineTo(Rr, B); ctx.stroke();
  for (let lm = 0; lm <= 10; lm += 2) text(ctx, "10" + sup(lm), X(lm), B + 10, T.ink2, "center", 10);
  for (let lg = -6; lg <= 12; lg += 6) text(ctx, "10" + sup(lg), L - 4, Y(lg), T.ink2, "right", 10);
  text(ctx, "mass (Msun)", Rr, B + 20, T.ink2, "right", 10);
  ctx.save(); ctx.setLineDash([2, 3]); ctx.strokeStyle = T.ink3; ctx.beginPath(); ctx.moveTo(L, Y(0)); ctx.lineTo(Rr, Y(0)); ctx.stroke(); ctx.restore();
  text(ctx, "1 g", Rr - 2, Y(0) - 8, T.ink3, "right", 10);
  ctx.strokeStyle = T.ink; ctx.lineWidth = 2; ctx.beginPath();
  for (let i = 0; i <= 50; i++) { const lm = x0 + (i / 50) * (x1 - x0); const g = Math.log10(tidalAtHorizon(Math.pow(10, lm), st.a) / G_EARTH); i ? ctx.lineTo(X(lm), Y(g)) : ctx.moveTo(X(lm), Y(g)); }
  ctx.stroke();
  const hm = Math.log10(hillsMass(st.a));
  ctx.save(); ctx.setLineDash([5, 4]); ctx.strokeStyle = T.ink2; ctx.beginPath(); ctx.moveTo(X(hm), Tp); ctx.lineTo(X(hm), B); ctx.stroke(); ctx.restore();
  const hl = X(hm) > W - 110;
  text(ctx, "Sun-like stars", X(hm) + (hl ? -4 : 4), Tp + 8, T.ink2, hl ? "right" : "left", 10);
  text(ctx, "swallowed whole " + (hl ? "→" : ""), X(hm) + (hl ? -4 : 4), Tp + 20, T.ink2, hl ? "right" : "left", 10);
  const lm = Math.log10(st.massSun), lg = Math.log10(R.horizonStretchG);
  ctx.fillStyle = T.accentInk; ctx.beginPath(); ctx.arc(X(lm), Y(Math.max(y0, Math.min(y1, lg))), 5, 0, Math.PI * 2); ctx.fill();
  text(ctx, "stretch on a 2 m body at the horizon (g)", L + 4, Tp - 10, T.ink2, "left", 10);
}
function sup(n) {
  const m = { "-": "\u207b", 0: "\u2070", 1: "\u00b9", 2: "\u00b2", 3: "\u00b3", 4: "\u2074", 5: "\u2075", 6: "\u2076", 7: "\u2077", 8: "\u2078", 9: "\u2079" };
  return String(n).split("").map((c) => m[c]).join("");
}

export function drawDiagram(ctx, W, H, dpr, T, st, art) {
  frame(ctx, W, H, T, dpr);
  if (st.mode === "lensing") drawRays(ctx, W, H, T, st);
  else if (st.mode === "orbits") drawEnergy(ctx, W, H, T, st);
  else if (st.mode === "time") drawClocks(ctx, W, H, T, st);
  else if (st.mode === "tides") drawTides(ctx, W, H, T, st, art);
  else drawMap(ctx, W, H, T, { ...st, showProbe: st.mode !== "horizon" });
}
