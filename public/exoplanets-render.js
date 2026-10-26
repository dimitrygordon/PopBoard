// Exoplanet Hunter: drawing only. Every number drawn here comes from
// exoplanets-physics.js through the UI; the art pack supplies sprites and
// colours (--ex-* tokens), never data. The HZ band is drawn from computed
// bounds, not from the hz_ring sprites.

const ASSET = "exoplanets/assets/img/";
const SPRITES = ["star_M", "star_K", "star_G", "star_F", "eclipsing_binary", "planet_desert", "planet_gas_giant_banded",
  "planet_ice", "planet_lava", "planet_rocky_rust", "planet_teal_ocean", "transit_shadow", "data_point", "data_point_hollow",
  "error_bar", "barycenter_marker", "phase_handle"];

export function loadSprites(onload) {
  const out = {};
  let left = SPRITES.length;
  for (const n of SPRITES) {
    const img = new Image();
    img.decoding = "async";
    img.onload = img.onerror = () => { if (--left === 0 && onload) onload(); };
    img.src = ASSET + n + ".webp";
    out[n] = img;
  }
  return out;
}

// Pre-scaled sprite cache keyed by name and size bucket (lesson from Orbits:
// drawImage of a 256px sprite down to 8px every frame is costly on raster).
const cache = new Map();
export function scaled(img, px) {
  if (!img || !img.complete || !img.naturalWidth) return null;
  const b = Math.max(4, Math.ceil(px / 4) * 4);
  const key = img.src + "|" + b;
  let c = cache.get(key);
  if (!c) {
    c = document.createElement("canvas");
    c.width = c.height = b;
    c.getContext("2d").drawImage(img, 0, 0, b, b);
    cache.set(key, c);
  }
  return c;
}

export function readTokens() {
  const cs = getComputedStyle(document.documentElement);
  const g = (n, d) => (cs.getPropertyValue(n).trim() || d);
  return {
    gold: g("--ob-gold-300", "#f6d58e"), gold100: g("--ob-gold-100", "#fff1d0"), goldRgb: g("--ob-gold-rgb", "226,179,92"),
    dim: g("--ob-ink-dim", "rgba(226,179,92,.45)"), point: g("--ex-point", "#f6d58e"), pointR: parseFloat(g("--ex-point-r", "3")),
    errAlpha: parseFloat(g("--ex-errbar-alpha", "0.6")), fitW: parseFloat(g("--ex-fit-width", "1.5")),
    blue: g("--ex-rv-blue", "#7fb4ff"), red: g("--ex-rv-red", "#ff7a5a"), hzBand: g("--ex-hz-band", "rgba(120,220,180,.22)"),
    hzEdge: g("--ex-hz-edge", "#f6d58e"), stable: g("--ob-stable", "#9fe3c4"), danger: g("--ob-danger", "#ff7a4a"),
    star: { M: g("--ex-star-M", "#ff7846"), K: g("--ex-star-K", "#ffaf69"), G: g("--ex-star-G", "#fff6e8"), F: g("--ex-star-F", "#e8f0ff") }
  };
}

const MONO = "11px ui-monospace, Menlo, monospace";

function frame(ctx, w, h, T, pad) {
  ctx.strokeStyle = `rgba(${T.goldRgb},0.12)`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 1; i < 4; i++) { const y = pad.t + (h - pad.t - pad.b) * i / 4; ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); }
  ctx.stroke();
  ctx.strokeStyle = `rgba(${T.goldRgb},0.35)`;
  ctx.strokeRect(pad.l + 0.5, pad.t + 0.5, w - pad.l - pad.r - 1, h - pad.t - pad.b - 1);
}
function label(ctx, T, text, x, y, align = "left", color) {
  ctx.font = MONO; ctx.fillStyle = color || T.dim; ctx.textAlign = align; ctx.textBaseline = "middle";
  ctx.fillText(text, x, y);
}

// Robust y range around 1 from the data percentiles.
export function fluxRange(f) {
  const s = Array.from(f).filter(Number.isFinite).sort((a, b) => a - b);
  const lo = s[Math.floor(s.length * 0.001)], hi = s[Math.floor(s.length * 0.995)];
  const span = Math.max(hi - lo, 2e-4);
  return [lo - span * 0.1, hi + span * 0.15];
}
const ppm = (x) => (x * 1e6 >= 1000 ? (x * 100).toFixed(2) + "%" : Math.round(x * 1e6) + " ppm");

export function drawLightCurve(ctx, w, h, T, d) {
  const pad = { l: 46, r: 8, t: 8, b: 20 };
  ctx.clearRect(0, 0, w, h);
  frame(ctx, w, h, T, pad);
  const [y0, y1] = d.yRange;
  const X = (t) => pad.l + (t - d.x0) / (d.x1 - d.x0) * (w - pad.l - pad.r);
  const Y = (f) => pad.t + (y1 - f) / (y1 - y0) * (h - pad.t - pad.b);
  ctx.save();
  ctx.beginPath(); ctx.rect(pad.l, pad.t, w - pad.l - pad.r, h - pad.t - pad.b); ctx.clip();
  ctx.fillStyle = T.point;
  ctx.globalAlpha = 0.75;
  const r = Math.max(1, T.pointR * 0.55);
  const { t, f } = d.lc;
  for (let i = 0; i < t.length; i++) {
    if (t[i] < d.x0 || t[i] > d.x1) continue;
    ctx.fillRect(X(t[i]) - r / 2, Y(f[i]) - r / 2, r, r);
  }
  ctx.globalAlpha = 1;
  if (d.model) {
    ctx.strokeStyle = T.stable; ctx.lineWidth = T.fitW; ctx.beginPath();
    const n = Math.min(1600, Math.ceil(w * 2));
    for (let i = 0; i <= n; i++) { const tt = d.x0 + (d.x1 - d.x0) * i / n; const yy = Y(d.model(tt)); i ? ctx.lineTo(X(tt), yy) : ctx.moveTo(X(tt), yy); }
    ctx.stroke();
  }
  if (d.marks) {   // predicted transit times at the student's period
    ctx.strokeStyle = `rgba(${T.goldRgb},0.35)`; ctx.setLineDash([2, 4]); ctx.beginPath();
    for (const m of d.marks) if (m > d.x0 && m < d.x1) { ctx.moveTo(X(m), pad.t); ctx.lineTo(X(m), h - pad.b); }
    ctx.stroke(); ctx.setLineDash([]);
  }
  ctx.restore();
  label(ctx, T, (1).toFixed(4), pad.l - 4, Y(1), "right");
  label(ctx, T, (y0 + (y1 - y0) * 0.1).toFixed(4), pad.l - 4, Y(y0 + (y1 - y0) * 0.1), "right");
  label(ctx, T, `${d.x0.toFixed(1)} d`, pad.l, h - 9);
  label(ctx, T, `${d.x1.toFixed(1)} d`, w - pad.r, h - 9, "right");
  return { pad, X, Y };
}

// Fold panel: folded points, binned means, depth line, phase handle,
// and the BLS periodogram strip along the bottom.
export function drawFold(ctx, w, h, T, S, d) {
  const strip = Math.max(36, Math.min(64, h * 0.22));
  const pad = { l: 46, r: 8, t: 22, b: strip + 22 };
  ctx.clearRect(0, 0, w, h);
  frame(ctx, w, h, T, pad);
  const [y0, y1] = d.yRange;
  const W = w - pad.l - pad.r;
  const X = (ph) => pad.l + (ph + 0.5) * W;
  const Y = (f) => pad.t + (y1 - f) / (y1 - y0) * (h - pad.t - pad.b);
  ctx.save(); ctx.beginPath(); ctx.rect(pad.l, pad.t, W, h - pad.t - pad.b); ctx.clip();
  ctx.fillStyle = T.point; ctx.globalAlpha = 0.35;
  for (let i = 0; i < d.phase.length; i++) ctx.fillRect(X(d.phase[i]) - 0.75, Y(d.flux[i]) - 0.75, 1.5, 1.5);
  ctx.globalAlpha = 1;
  const hol = scaled(S.data_point_hollow, 9);
  for (const b of d.bins) if (b.n && hol) ctx.drawImage(hol, X(b.phase) - 4.5, Y(b.value) - 4.5, 9, 9);
  // depth line
  const yd = Y(1 - d.depth);
  ctx.strokeStyle = T.gold; ctx.lineWidth = T.fitW; ctx.setLineDash([6, 4]);
  ctx.beginPath(); ctx.moveTo(pad.l, yd); ctx.lineTo(pad.l + W, yd); ctx.stroke(); ctx.setLineDash([]);
  ctx.restore();
  ctx.fillStyle = T.gold; ctx.beginPath(); ctx.arc(pad.l + W - 14, yd, 7, 0, 7); ctx.fill();
  label(ctx, T, "depth " + ppm(d.depth), pad.l + W - 26, yd - 12, "right", T.gold100);
  // phase handle (drag sideways = period)
  const hs = scaled(S.phase_handle, 30);
  if (hs) ctx.drawImage(hs, pad.l + W / 2 - 15, 0, 30, 30);
  label(ctx, T, "phase −0.5", pad.l, h - pad.b + 10);
  label(ctx, T, "+0.5", pad.l + W, h - pad.b + 10, "right");
  // periodogram strip
  const sy = h - strip - 4, sh = strip - 8;
  ctx.strokeStyle = `rgba(${T.goldRgb},0.35)`; ctx.strokeRect(pad.l + 0.5, sy + 0.5, W - 1, sh);
  const pg = d.periodogram;
  if (pg) {
    const lp0 = Math.log(pg.pMin), lp1 = Math.log(pg.pMax);
    const PX = (P) => pad.l + (Math.log(P) - lp0) / (lp1 - lp0) * W;
    ctx.strokeStyle = T.gold; ctx.globalAlpha = 0.8; ctx.lineWidth = 1; ctx.beginPath();
    for (let i = 0; i < pg.periods.length; i++) {
      const x = PX(pg.periods[i]), y = sy + sh - pg.power[i] / pg.max * (sh - 4);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke(); ctx.globalAlpha = 1;
    const xp = PX(d.period);
    ctx.fillStyle = T.gold100; ctx.fillRect(xp - 1, sy, 2, sh);
    label(ctx, T, pg.pMin.toFixed(1) + " d", pad.l + 2, sy + sh + 8);
    label(ctx, T, pg.pMax.toFixed(0) + " d", pad.l + W - 2, sy + sh + 8, "right");
    label(ctx, T, pg.label, pad.l + W / 2, sy + sh + 8, "center");
    d.stripRect = { x: pad.l, y: sy, w: W, h: sh, lp0, lp1 };
  }
  return { pad, X, Y };
}

export function drawRV(ctx, w, h, T, S, d) {
  const pad = { l: 52, r: 8, t: 10, b: 20 };
  ctx.clearRect(0, 0, w, h);
  frame(ctx, w, h, T, pad);
  const vmax = d.vmax;
  const W = w - pad.l - pad.r;
  const X = (ph) => pad.l + (ph + 0.5) * W;
  const Y = (v) => pad.t + (vmax - v) / (2 * vmax) * (h - pad.t - pad.b);
  ctx.strokeStyle = `rgba(${T.goldRgb},0.25)`; ctx.beginPath(); ctx.moveTo(pad.l, Y(0)); ctx.lineTo(pad.l + W, Y(0)); ctx.stroke();
  // model: v(phase) = -K sin(2 pi phase) (circular, transit at phase 0)
  ctx.strokeStyle = T.gold; ctx.lineWidth = T.fitW; ctx.beginPath();
  for (let i = 0; i <= 200; i++) { const ph = -0.5 + i / 200; const y = Y(d.model(ph)); i ? ctx.lineTo(X(ph), y) : ctx.moveTo(X(ph), y); }
  ctx.stroke();
  const err = S.error_bar, dot = scaled(S.data_point, 10);
  for (let i = 0; i < d.phase.length; i++) {
    const x = X(d.phase[i]), y = Y(d.v[i]), e = Math.abs(Y(0) - Y(d.sigma));
    ctx.globalAlpha = T.errAlpha;
    if (err && err.complete && err.naturalWidth) ctx.drawImage(err, x - 3, y - e, 6, 2 * e);
    else { ctx.strokeStyle = T.point; ctx.beginPath(); ctx.moveTo(x, y - e); ctx.lineTo(x, y + e); ctx.stroke(); }
    ctx.globalAlpha = 1;
    // tint: blue approaching (v < 0), red receding
    ctx.fillStyle = d.v[i] < 0 ? T.blue : T.red;
    ctx.beginPath(); ctx.arc(x, y, T.pointR + 1, 0, 7); ctx.fill();
    if (dot) { ctx.globalAlpha = 0.5; ctx.drawImage(dot, x - 5, y - 5, 10, 10); ctx.globalAlpha = 1; }
  }
  // K handle
  ctx.fillStyle = T.gold; ctx.beginPath(); ctx.arc(X(-0.25), Y(d.K), 7, 0, 7); ctx.fill();
  label(ctx, T, `+${fmtV(vmax)}`, pad.l - 4, pad.t + 6, "right");
  label(ctx, T, `−${fmtV(vmax)}`, pad.l - 4, h - pad.b - 6, "right");
  label(ctx, T, "0", pad.l - 4, Y(0), "right");
  label(ctx, T, "toward you", pad.l + 4, h - pad.b - 8, "left", T.blue);
  label(ctx, T, "away", pad.l + 4, pad.t + 8, "left", T.red);
  return { pad, X, Y };
}
const fmtV = (v) => (v >= 1000 ? (v / 1000).toFixed(1) + " km/s" : v.toFixed(0) + " m/s");

// Top-down orbit view. sys: { starClass, starR (px-ish AU), planets:[{aAU, e, omega, f, sprite, rEarth}],
// hz:{inner,outer}, wobble:{x,y} in AU (already exaggerated), auPx }
export function drawOrbit(ctx, w, h, T, S, sys) {
  ctx.clearRect(0, 0, w, h);
  const cx = w / 2, cy = h / 2;
  const s = sys.auPx;
  // HZ band from computed Kopparapu bounds
  if (sys.hz) {
    ctx.fillStyle = T.hzBand;
    ctx.beginPath(); ctx.arc(cx, cy, sys.hz.outer * s, 0, 2 * Math.PI); ctx.moveTo(cx + sys.hz.inner * s, cy); ctx.arc(cx, cy, sys.hz.inner * s, 0, 2 * Math.PI, true); ctx.fill();
    ctx.strokeStyle = T.hzEdge; ctx.globalAlpha = 0.5; ctx.lineWidth = 1; ctx.setLineDash([2, 5]);
    ctx.beginPath(); ctx.arc(cx, cy, sys.hz.inner * s, 0, 7); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, sys.hz.outer * s, 0, 7); ctx.stroke();
    ctx.setLineDash([]); ctx.globalAlpha = 1;
  }
  for (const p of sys.planets) {
    // orbit ellipse (focus at barycentre, close enough to star at this scale)
    const a = p.aAU * s, b = a * Math.sqrt(1 - p.e * p.e), c = a * p.e;
    ctx.strokeStyle = `rgba(${T.goldRgb},0.4)`; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(cx - c * Math.cos(p.omega), cy - c * Math.sin(p.omega), a, b, p.omega, 0, 7); ctx.stroke();
  }
  // star at its wobble position
  const sx = cx + sys.wobble.x * s, sy = cy + sys.wobble.y * s;
  const starPx = Math.max(10, Math.min(40, sys.starPx));
  const st = scaled(S[sys.binary ? "eclipsing_binary" : "star_" + sys.starClass], starPx * 1.6);
  ctx.globalCompositeOperation = "lighter";
  if (st) ctx.drawImage(st, sx - starPx * 0.8, sy - starPx * 0.8, starPx * 1.6, starPx * 1.6);
  else { ctx.fillStyle = T.star[sys.starClass]; ctx.beginPath(); ctx.arc(sx, sy, starPx / 2, 0, 7); ctx.fill(); }
  ctx.globalCompositeOperation = "source-over";
  const bc = scaled(S.barycenter_marker, 18);
  if (bc) { ctx.globalAlpha = 0.6 + 0.4 * sys.pulse; ctx.drawImage(bc, cx - 9, cy - 9, 18, 18); ctx.globalAlpha = 1; }
  for (const p of sys.planets) {
    const r = p.aAU * (1 - p.e * p.e) / (1 + p.e * Math.cos(p.f));
    const ang = p.omega + p.f;
    const px = cx + r * s * Math.cos(ang) - sys.wobble.x * s * 0, py = cy + r * s * Math.sin(ang);
    const sz = Math.max(8, Math.min(22, 6 + 2.2 * Math.sqrt(p.rEarth)));
    const sp = scaled(S[p.sprite], sz);
    if (sp) ctx.drawImage(sp, px - sz / 2, py - sz / 2, sz, sz);
  }
  // line of sight from the right
  ctx.strokeStyle = `rgba(${T.goldRgb},0.5)`; ctx.setLineDash([3, 5]);
  ctx.beginPath(); ctx.moveTo(w - 40, cy); ctx.lineTo(w - 8, cy); ctx.stroke(); ctx.setLineDash([]);
  label(ctx, T, "to Earth →", w - 8, cy - 10, "right");
  if (sys.hz) label(ctx, T, `HZ ${sys.hz.inner.toFixed(2)}–${sys.hz.outer.toFixed(2)} AU`, 10, h - 22, "left", T.stable);
  label(ctx, T, sys.caption || "", 10, h - 8);
  label(ctx, T, `${(sys.scaleBarAU).toFixed(sys.scaleBarAU < 0.1 ? 2 : 1)} AU`, w - 10, h - 8, "right");
  ctx.fillStyle = T.dim; ctx.fillRect(w - 10 - sys.scaleBarAU * s, h - 18, sys.scaleBarAU * s, 2);
}

// Inclination: left = side view (orbit plane tilted, observer at right),
// right = what the observer sees (star disc, planet track at height b).
export function drawInclination(ctx, w, h, T, S, d) {
  ctx.clearRect(0, 0, w, h);
  const half = w * 0.42;
  // side view
  const cx = half / 2 + 6, cy = h / 2, L = Math.min(half / 2 - 8, h / 2 - 10);
  const tilt = Math.PI / 2 - d.inc;   // 0 = edge-on
  ctx.strokeStyle = `rgba(${T.goldRgb},0.6)`; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(cx - L * Math.cos(tilt), cy + L * Math.sin(tilt)); ctx.lineTo(cx + L * Math.cos(tilt), cy - L * Math.sin(tilt)); ctx.stroke();
  ctx.fillStyle = T.star[d.starClass] || T.gold; ctx.beginPath(); ctx.arc(cx, cy, 5, 0, 7); ctx.fill();
  ctx.strokeStyle = `rgba(${T.goldRgb},0.35)`; ctx.setLineDash([2, 4]);
  ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(half, cy); ctx.stroke(); ctx.setLineDash([]);
  label(ctx, T, `i = ${(d.inc * 180 / Math.PI).toFixed(2)}°`, 8, 12, "left", T.gold100);
  label(ctx, T, "eye →", half - 2, cy - 10, "right");
  // observer's view, star radius fixed; track offset b in stellar radii
  const ox = half + (w - half) / 2, R = Math.min((w - half) / 2 - 10, h / 2 - 22) * 0.6;
  const st = scaled(S["star_" + d.starClass], R * 1.6 * 2);
  ctx.globalCompositeOperation = "lighter";
  if (st) ctx.drawImage(st, ox - R * 1.6, cy - R * 1.6, R * 3.2, R * 3.2);
  ctx.globalCompositeOperation = "source-over";
  const yb = cy - Math.max(-3, Math.min(3, d.b)) * R;
  const pr = Math.max(2, d.k * R);
  ctx.strokeStyle = d.transits ? T.stable : T.danger; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(half + 4, yb); ctx.lineTo(w - 4, yb); ctx.stroke(); ctx.setLineDash([]);
  const sh = scaled(S.transit_shadow, pr * 2);
  ctx.save(); ctx.beginPath(); ctx.arc(ox, cy, R, 0, 7); ctx.clip();
  ctx.globalAlpha = 0.85;
  if (sh) ctx.drawImage(sh, ox - pr, yb - pr, pr * 2, pr * 2); else { ctx.fillStyle = "#000"; ctx.beginPath(); ctx.arc(ox, yb, pr, 0, 7); ctx.fill(); }
  ctx.restore();
  label(ctx, T, `b = ${d.b.toFixed(2)}`, w - 8, 12, "right", T.gold100);
  label(ctx, T, d.transits ? "transits" : "misses the star", w - 8, h - 10, "right", d.transits ? T.stable : T.danger);
}
