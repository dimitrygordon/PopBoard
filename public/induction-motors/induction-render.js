// Induction & Motors: drawing. Reads state and draws to a 2D canvas. No
// physics decisions here: every number comes from induction-physics.js.
//
// The art carries a thin light halo for dark backgrounds. The bar magnet is
// drawn on top of the coil, so there its halo would show as a light ring; it
// uses a "bare" copy with the halo removed. The transformer layers were made
// with one shared outer halo, so they stack cleanly as shipped.

import {
  TAU, ART, COIL_LEN, GEN_AREA, NP, GALVO_FULL,
  rad, genEmf, omega, genPeak, motorTorque, commutatedSign, transformer, lenz, fmtNum
} from "./induction-physics.js";

const ASSET = "induction-motors/assets/";
export const ART_NAMES = ["bar-magnet", "coil-5-turns", "coil-10-turns", "coil-20-turns", "dc-motor-cutaway", "galvanometer-body",
  "generator-hand-crank", "light-bulb-off", "light-bulb-on", "transformer-core", "transformer-primary-coil",
  "transformer-secondary-coil-4", "transformer-secondary-coil-16"];
const STACKED = ["bar-magnet"];

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
    paper: g("--im-paper", "#f6f6f2"), ink: g("--im-ink", "#1c1c1c"), dim: g("--im-ink-dim", "#555"),
    field: g("--im-field", "#6a1b9a"), current: g("--im-current", "#c62828"), force: g("--im-force", "#1f5fbf"),
    north: g("--im-north", "#c62828"), south: g("--im-south", "#1f5fbf"), wire: g("--im-wire", "#8a4b1f"),
    grid: g("--im-grid", "#d9d9d4"), accent: g("--im-accent", "#e8792b"), fill: g("--im-fill", "rgba(232,121,43,0.18)"),
    dark: document.documentElement.getAttribute("data-theme") === "dark"
  };
}

const ok = (img) => img && img.complete && img.naturalWidth;
function sprite(ctx, img, x, y, s, ax, ay, flip = false, alpha = 1) {
  if (!ok(img)) return;
  ctx.save(); ctx.globalAlpha = alpha;
  if (flip) { ctx.translate(x, y); ctx.scale(-1, 1); ctx.drawImage(img, -ax * s, -ay * s, img.naturalWidth * s, img.naturalHeight * s); }
  else ctx.drawImage(img, x - ax * s, y - ay * s, img.naturalWidth * s, img.naturalHeight * s);
  ctx.restore();
}
function text(ctx, T, str, x, y, align = "left", color = T.ink, size = 13, bold = false) {
  ctx.fillStyle = color; ctx.font = `${bold ? "600 " : ""}${size}px ui-monospace, Menlo, monospace`; ctx.textAlign = align; ctx.textBaseline = "alphabetic";
  // Shrink to fit inside the canvas so narrow screens never clip a label.
  const cw = ctx.canvas.width / (ctx.getTransform().a || 1);
  const room = align === "left" ? cw - x - 4 : align === "right" ? x - 4 : 2 * Math.min(x, cw - x) - 8;
  const w = ctx.measureText(str).width;
  if (room > 0 && w > room) ctx.font = `${bold ? "600 " : ""}${Math.max(8, Math.floor(size * room / w))}px ui-monospace, Menlo, monospace`;
  ctx.fillText(str, x, y);
}
function arrow(ctx, x0, y0, x1, y1, color, w = 2, head = 8) {
  const a = Math.atan2(y1 - y0, x1 - x0);
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = w;
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 - head * Math.cos(a - 0.4), y1 - head * Math.sin(a - 0.4));
  ctx.lineTo(x1 - head * Math.cos(a + 0.4), y1 - head * Math.sin(a + 0.4)); ctx.closePath(); ctx.fill();
}
function line(ctx, pts, color, w = 2, dash = null) {
  ctx.strokeStyle = color; ctx.lineWidth = w; if (dash) ctx.setLineDash(dash);
  ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); ctx.setLineDash([]);
}
/** Plot box with a zero line. Each series fn(u) for u in [0, 1] returns a value in [-1, 1]. */
function graph(ctx, T, x, y, w, h, series, opts = {}) {
  ctx.strokeStyle = T.grid; ctx.lineWidth = 1; ctx.strokeRect(x, y, w, h);
  line(ctx, [[x, y + h / 2], [x + w, y + h / 2]], T.grid, 1, [4, 4]);
  for (const s of series) {
    const pts = [];
    for (let i = 0; i <= 300; i++) { const u = i / 300, v = Math.max(-1, Math.min(1, s.fn(u))); pts.push([x + u * w, y + h / 2 - v * (h / 2 - 4)]); }
    line(ctx, pts, s.color, s.w || 2.5, s.dash || null);
  }
  if (opts.cursor != null) line(ctx, [[x + opts.cursor * w, y], [x + opts.cursor * w, y + h]], T.accent, 1.5);
  if (opts.title) text(ctx, T, opts.title, x + 6, y + 15, "left", T.dim, 12);
  if (opts.xlabel) text(ctx, T, opts.xlabel, x + w, y + h + 15, "right", T.dim, 12);
}
function bulb(ctx, img, x, y, h, glow) {
  const s = h / 1024;
  sprite(ctx, img["light-bulb-off"], x, y, s, 512, 1024);
  if (glow > 0.01) sprite(ctx, img["light-bulb-on"], x, y, s, 512, 1024, false, Math.min(1, glow));
}
/** Galvanometer: body sprite plus a code-drawn scale and needle. frac in [-1, 1] (pegs just past full scale). */
function galvanometer(ctx, T, img, cx, cy, size, frac, label) {
  const s = size / 1024, G = ART.galvo;
  sprite(ctx, img["galvanometer-body"], cx, cy, s, 512, 512);
  const px = cx + (G.pivot[0] - 512) * s, py = cy + (G.pivot[1] - 512) * s, L = G.needle * s;
  const span = rad(50);
  for (let k = -4; k <= 4; k++) {
    const a = -Math.PI / 2 + (k / 4) * span, r0 = L * (k % 2 ? 0.9 : 0.82);
    line(ctx, [[px + r0 * Math.cos(a), py + r0 * Math.sin(a)], [px + L * Math.cos(a), py + L * Math.sin(a)]], "#1c1c1c", 1.2);
  }
  ctx.fillStyle = "#1c1c1c"; ctx.font = `${Math.max(9, Math.round(size * 0.05))}px ui-monospace, Menlo, monospace`; ctx.textAlign = "center";
  ctx.fillText("0", px, py - L * 0.66);
  const f = Math.max(-1.08, Math.min(1.08, frac)), a = -Math.PI / 2 + f * span;
  line(ctx, [[px, py], [px + L * 0.98 * Math.cos(a), py + L * 0.98 * Math.sin(a)]], "#c62828", 2.2);
  ctx.fillStyle = "#1c1c1c"; ctx.beginPath(); ctx.arc(px, py, 3, 0, TAU); ctx.fill();
  if (label) text(ctx, T, label, cx, cy + size * 0.5 + 14, "center", T.ink, 12);
  return { t1: [cx - 165 * s, cy - 400 * s], t2: [cx + 165 * s, cy - 400 * s] };
}
function poleLabel(ctx, x, y, str, size) {
  ctx.fillStyle = "#ffffff"; ctx.font = `600 ${size}px ui-monospace, Menlo, monospace`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(str, x, y); ctx.textBaseline = "alphabetic";
}

// ---------- coil and magnet scene (Faraday, Lenz, sandbox) ----------
/** Layout for the coil scene. Maps physical x (m, coil center at 0) to the screen. */
export function coilGeometry(W, H) {
  const narrow = W < 620;
  const coilW = Math.min(W * (narrow ? 0.62 : 0.5), 520);
  const sc = coilW / 600;                        // art px -> screen px for the coil
  const cx = narrow ? W * 0.5 : W * 0.4, cy = narrow ? 30 + 130 * sc : H * 0.27;
  const pxPerM = (600 * sc) / COIL_LEN;
  return { narrow, sc, cx, cy, pxPerM, toX: (x) => cx + x * pxPerM, toWorld: (sx) => (sx - cx) / pxPerM };
}
function drawCoilScene(ctx, W, H, T, img, s, x, m) {
  const G = coilGeometry(W, H), C = ART.coil;
  sprite(ctx, img[`coil-${s.turns}-turns`], G.cx, G.cy, G.sc, 512, C.axisY);
  // magnet: on top of the coil with the halo-free copy; its N end faces +x when m > 0 (art has N on the left)
  const ms = G.sc * 0.5, mx = G.toX(x), mag = img["bar-magnetBare"] || img["bar-magnet"];
  sprite(ctx, mag, mx, G.cy, ms, 512, 128, m > 0);
  const half = 400 * ms * 0.5, fs = Math.max(10, Math.round(70 * ms));
  poleLabel(ctx, mx - half, G.cy, m > 0 ? "S" : "N", fs);
  poleLabel(ctx, mx + half, G.cy, m > 0 ? "N" : "S", fs);
  return G;
}
function leadPoints(G) {
  return [[G.cx + (212 - 512) * G.sc, G.cy + (486 - 256) * G.sc], [G.cx + (812 - 512) * G.sc, G.cy + (486 - 256) * G.sc]];
}
function wires(ctx, T, G, term, drop) {
  const leads = leadPoints(G);
  line(ctx, [leads[0], [leads[0][0], drop], [term.t1[0] - 10, drop], [term.t1[0] - 10, term.t1[1] - 12], [term.t1[0], term.t1[1] - 12], term.t1], T.wire, 2);
  line(ctx, [leads[1], [leads[1][0], drop - 8], [term.t2[0] + 10, drop - 8], [term.t2[0] + 10, term.t2[1] - 12], [term.t2[0], term.t2[1] - 12], term.t2], T.wire, 2);
}
/** Faraday mode and sandbox: coil, magnet, galvanometer, and emf history. */
export function drawFaraday(ctx, W, H, T, img, s, live) {
  const m = (s.pole === "N" ? 1 : -1) * s.magM;
  const G = drawCoilScene(ctx, W, H, T, img, s, live.x, m);
  const gs = G.narrow ? Math.min(150, W * 0.4) : Math.min(200, H * 0.34);
  const gx = G.narrow ? W - gs * 0.5 - 8 : W - gs * 0.55 - 12, gy = G.narrow ? G.cy + 130 * G.sc + 60 + gs * 0.5 : H * 0.36;
  const term = galvanometer(ctx, T, img, gx, gy, gs, live.emf / GALVO_FULL, `\u00b1${fmtNum(GALVO_FULL * 1000)} mV full scale`);
  wires(ctx, T, G, term, G.cy + 230 * G.sc + 16);
  if (Math.abs(live.emf) > GALVO_FULL) text(ctx, T, "OFF SCALE", gx, gy - gs * 0.5 - 4, "center", T.current, 12, true);
  const gw = G.narrow ? W - 28 : W * 0.56, gh = G.narrow ? Math.max(70, H - gy - gs * 0.5 - 70) : H * 0.26;
  const gx0 = 14, gy0 = H - gh - 34;
  const hist = live.hist || [], n = hist.length;
  graph(ctx, T, gx0, gy0, gw, gh, [{ fn: (u) => (n ? hist[Math.min(n - 1, Math.floor(u * (n - 1)))] / GALVO_FULL : 0), color: T.current }],
    { title: "emf vs time (\u00b120 mV)", xlabel: "last 6 s \u2192 now" });
}

/** Lenz's law: magnet near one face, induced pole, current sense in an end view, force on the magnet. */
export function drawLenz(ctx, W, H, T, img, s, live) {
  const m = (s.pole === "N" ? 1 : -1) * s.magM;
  const G = drawCoilScene(ctx, W, H, T, img, s, live.x, m);
  const L = lenz(s.pole, s.motion), C = ART.coil;
  const face = G.cx + (C.x0 - 512) * G.sc, py = G.cy - 130 * G.sc - 18;
  ctx.fillStyle = L.face === "N" ? T.north : T.south; ctx.beginPath(); ctx.arc(face, py, 13, 0, TAU); ctx.fill();
  poleLabel(ctx, face, py, L.face, 13);
  text(ctx, T, "induced pole", face + 20, py + 4, "left", T.dim, 12);
  // motion and the opposing force on the magnet
  const mx = G.toX(live.x), top = G.cy + 40 * G.sc + 22, dir = s.motion === "toward" ? 1 : -1;
  arrow(ctx, mx - 26 * dir, top, mx + 26 * dir, top, T.ink, 2);
  text(ctx, T, "motion", mx, top + 16, "center", T.dim, 12);
  const fdir = L.force === "repel" ? -1 : 1;
  arrow(ctx, mx - 22 * fdir, top + 32, mx + 22 * fdir, top + 32, T.force, 3);
  text(ctx, T, `force (${L.force})`, mx, top + 48, "center", T.force, 12, true);
  // end view of the coil as seen from the magnet
  const r = G.narrow ? 40 : 56;
  const ex = G.narrow ? W * 0.27 : W * 0.24, ey = G.narrow ? H * 0.66 : H * 0.72;
  ctx.strokeStyle = T.wire; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(ex, ey, r, 0, TAU); ctx.stroke();
  const ccw = L.sense === "counterclockwise", R = r + 12, a0 = -Math.PI * 0.9, a1 = Math.PI * 0.6;
  ctx.strokeStyle = T.current; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(ex, ey, R, a0, a1, false); ctx.stroke();
  // canvas angles grow clockwise on screen: the head goes at a1 (clockwise) or a0 (counterclockwise)
  const ae = ccw ? a0 : a1, hx = ex + R * Math.cos(ae), hy = ey + R * Math.sin(ae), tg = ae + (ccw ? -Math.PI / 2 : Math.PI / 2);
  arrow(ctx, hx - 8 * Math.cos(tg), hy - 8 * Math.sin(tg), hx + 4 * Math.cos(tg), hy + 4 * Math.sin(tg), T.current, 2.5, 11);
  ctx.fillStyle = L.face === "N" ? T.north : T.south; ctx.beginPath(); ctx.arc(ex, ey, 14, 0, TAU); ctx.fill();
  poleLabel(ctx, ex, ey, L.face, 13);
  text(ctx, T, "coil seen from the magnet", ex, ey + R + 20, "center", T.dim, 12);
  text(ctx, T, L.sense, ex, ey + R + 36, "center", T.current, 12, true);
  const gs = G.narrow ? Math.min(140, W * 0.36) : Math.min(180, H * 0.32);
  const gx = G.narrow ? W * 0.74 : W * 0.62, gy = G.narrow ? H * 0.66 : H * 0.72;
  const term = galvanometer(ctx, T, img, gx, gy, gs, live.emf / GALVO_FULL, "");
  wires(ctx, T, G, term, Math.min(term.t1[1] - 24, G.cy + 230 * G.sc + 70));
}

// ---------- flux ----------
export function drawFlux(ctx, W, H, T, img, s) {
  const narrow = W < 620, th = rad(s.angle), A = s.area * 1e-4;
  // main view: looking along B, so field lines come toward you (dots)
  const vw = narrow ? W : W * 0.6, vh = narrow ? H * 0.6 : H - 30, cx = vw / 2, cy = 46 + (vh - 46) / 2;
  const rMax = Math.min(vw, vh - 46) * 0.44, r = rMax * Math.sqrt(A / 0.1);
  const spacing = 14 / Math.sqrt(s.fluxB), rx = Math.max(1, r * Math.cos(th)), ry = r;
  const hw = vw * 0.46, hh = (vh - 46) * 0.48;
  ctx.fillStyle = T.fill; ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU); ctx.fill();
  for (let y = cy - Math.floor(hh / spacing) * spacing; y <= cy + hh; y += spacing)
    for (let x = cx - Math.floor(hw / spacing) * spacing; x <= cx + hw; x += spacing) {
      const inside = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 < 1;
      ctx.fillStyle = inside ? T.field : T.dim; ctx.globalAlpha = inside ? 1 : 0.5;
      ctx.beginPath(); ctx.arc(x, y, inside ? 3 : 2, 0, TAU); ctx.fill();
    }
  ctx.globalAlpha = 1;
  ctx.strokeStyle = T.wire; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU); ctx.stroke();
  text(ctx, T, "Looking along B: each dot is a field line", 12, 20, "left", T.dim, 12);
  text(ctx, T, "coming toward you. Tilted, the loop shows A cos \u03b8.", 12, 36, "left", T.dim, 12);
  // side view inset
  const sx = narrow ? 12 : vw + 8, sy = narrow ? vh + 6 : 50, sw = narrow ? W - 24 : W - vw - 20, sh = narrow ? H - vh - 40 : Math.min(280, H * 0.55);
  ctx.strokeStyle = T.grid; ctx.lineWidth = 1; ctx.strokeRect(sx, sy, sw, sh);
  text(ctx, T, "Side view", sx + 6, sy + 15, "left", T.dim, 12);
  text(ctx, T, "B \u2192", sx + sw - 8, sy + 15, "right", T.field, 12, true);
  const scx = sx + sw / 2, scy = sy + sh / 2 + 8, lr = Math.min(sw, sh) * 0.32;
  for (let k = -2; k <= 2; k++) arrow(ctx, sx + 10, scy + k * (sh / 6.5), sx + sw - 10, scy + k * (sh / 6.5), T.field, 1.2, 7);
  // loop edge-on: a line perpendicular to its normal; the normal is at theta from B (+x)
  const nx = Math.cos(th), ny = -Math.sin(th);
  line(ctx, [[scx - lr * ny, scy + lr * nx], [scx + lr * ny, scy - lr * nx]], T.wire, 5);
  arrow(ctx, scx, scy, scx + lr * 1.1 * nx, scy + lr * 1.1 * ny, T.ink, 2.5);
  text(ctx, T, "normal", scx + lr * 1.12 * nx + 4, scy + lr * 1.12 * ny - 4, "left", T.ink, 12, true);
  ctx.strokeStyle = T.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(scx, scy, lr * 0.5, -th, 0); ctx.stroke();
  text(ctx, T, "\u03b8", scx + lr * 0.6, scy - 4, "left", T.ink, 14, true);
}

// ---------- end view of a loop between two poles (generator and motor) ----------
function poles(ctx, T, cx, cy, gap, h) {
  const w = Math.max(26, gap * 0.26);
  ctx.fillStyle = T.north; ctx.fillRect(cx - gap - w, cy - h / 2, w, h);
  ctx.fillStyle = T.south; ctx.fillRect(cx + gap, cy - h / 2, w, h);
  poleLabel(ctx, cx - gap - w / 2, cy, "N", 18); poleLabel(ctx, cx + gap + w / 2, cy, "S", 18);
  for (let k = -2; k <= 2; k++) arrow(ctx, cx - gap + 6, cy + k * (h / 5.5), cx + gap - 6, cy + k * (h / 5.5), T.field, 1, 6);
}
/** The loop seen end-on. theta is the angle between its normal and B (+x); sign is the current in side A (+1 out of the page). */
function endLoop(ctx, T, cx, cy, r, theta, sign, forceLen) {
  const ax = cx - r * Math.sin(theta), ay = cy - r * Math.cos(theta), bx = cx + r * Math.sin(theta), by = cy + r * Math.cos(theta);
  line(ctx, [[ax, ay], [bx, by]], T.wire, 5);
  arrow(ctx, cx, cy, cx + r * 0.8 * Math.cos(theta), cy - r * 0.8 * Math.sin(theta), T.ink, 2);
  const mark = (x, y, out) => {
    ctx.fillStyle = T.paper; ctx.strokeStyle = T.current; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(x, y, 11, 0, TAU); ctx.fill(); ctx.stroke();
    if (sign === 0) return;
    if (out) { ctx.fillStyle = T.current; ctx.beginPath(); ctx.arc(x, y, 3.5, 0, TAU); ctx.fill(); }
    else { line(ctx, [[x - 6, y - 6], [x + 6, y + 6]], T.current, 2.5); line(ctx, [[x + 6, y - 6], [x - 6, y + 6]], T.current, 2.5); }
  };
  mark(ax, ay, sign > 0); mark(bx, by, sign < 0);
  if (forceLen && sign !== 0) {
    // F = I L x B: current out of the page with B to the right is pushed up the screen
    const up = sign > 0 ? -1 : 1;
    arrow(ctx, ax, ay + 14 * up, ax, ay + (14 + forceLen) * up, T.force, 3);
    arrow(ctx, bx, by - 14 * up, bx, by - (14 + forceLen) * up, T.force, 3);
  }
}

export function drawGenerator(ctx, W, H, T, img, s, theta) {
  const narrow = W < 620, w = omega(s.genF);
  const gap = narrow ? Math.min(100, W * 0.26) : Math.min(140, W * 0.12), r = gap * 0.62;
  const cx = narrow ? W * 0.42 : W * 0.28, cy = narrow ? 24 + gap * 0.75 : H * 0.3;
  poles(ctx, T, cx, cy, gap, gap * 1.5);
  // emf = N B A w sin(theta): side A current out of the page while sin(theta) > 0
  endLoop(ctx, T, cx, cy, r, theta, Math.sign(Math.sin(theta)), 0);
  text(ctx, T, "End view of the turning coil", cx, cy + gap * 0.75 + 18, "center", T.dim, 12);
  const e0 = genPeak(s.genN, s.genB, GEN_AREA, w), e = genEmf(s.genN, s.genB, GEN_AREA, w, theta / w);
  const glow = (Math.abs(e) / e0) * Math.min(1, e0 / 10);
  if (!narrow) {
    sprite(ctx, img["generator-hand-crank"], W * 0.64, H * 0.3, Math.min(W * 0.26, H * 0.42) / 1024, 512, 512);
    bulb(ctx, img, W * 0.9, H * 0.5, Math.min(H * 0.34, 170), glow);
  } else bulb(ctx, img, W * 0.86, cy + gap * 0.5, Math.min(gap * 1.4, 120), glow);
  const gx = 14, gw = W - 28, gh = narrow ? H * 0.4 : H * 0.34, gy = H - gh - 30;
  graph(ctx, T, gx, gy, gw, gh, [
    { fn: (u) => Math.cos(TAU * 2 * u), color: T.field, w: 1.8, dash: [6, 4] },
    { fn: (u) => Math.sin(TAU * 2 * u), color: T.current }
  ], { cursor: ((theta % TAU) / TAU) / 2, title: `emf (solid, peak ${fmtNum(e0)} V), flux (dashed)`, xlabel: `two turns: 0 to ${fmtNum(2000 / s.genF)} ms` });
}

export function drawMotor(ctx, W, H, T, img, s, theta) {
  const narrow = W < 620;
  const gap = narrow ? Math.min(100, W * 0.26) : Math.min(140, W * 0.12), r = gap * 0.62;
  const cx = narrow ? W * 0.5 : W * 0.28, cy = narrow ? 24 + gap * 0.75 : H * 0.32;
  poles(ctx, T, cx, cy, gap, gap * 1.5);
  const sign = commutatedSign(theta, s.commutator);
  endLoop(ctx, T, cx, cy, r, theta, sign, 10 + 30 * Math.sqrt((s.motorI * s.motorB) / 5));
  text(ctx, T, "\u2299 current out of the page, \u2297 into it", cx, cy + gap * 0.75 + 18, "center", T.dim, 12);
  text(ctx, T, "blue arrows: force F on each side", cx, cy + gap * 0.75 + 34, "center", T.force, 12);
  if (!narrow) sprite(ctx, img["dc-motor-cutaway"], W * 0.74, H * 0.32, Math.min(W * 0.28, H * 0.44) / 1024, 512, 512);
  const gx = 14, gw = W - 28, gh = narrow ? H * 0.36 : H * 0.3, gy = H - gh - 30;
  const a = ((theta % TAU) + TAU) % TAU;
  graph(ctx, T, gx, gy, gw, gh, [{ fn: (u) => motorTorque(1, 1, 1, 1, u * TAU, s.commutator), color: T.force }],
    { cursor: a / TAU, title: s.commutator ? "torque vs angle: never reverses" : "torque vs angle: reverses each half turn", xlabel: "angle \u03b8, 0 to 360\u00b0" });
}

export function drawTransformer(ctx, W, H, T, img, s) {
  const narrow = W < 620, r = transformer(s.vp, NP, s.ns, s.load);
  const size = narrow ? Math.min(W * 0.6, H * 0.44) : Math.min(W * 0.4, H * 0.6), sc = size / 1024;
  const cx = narrow ? W * 0.47 : W * 0.4, cy = narrow ? 26 + size * 0.5 : H * 0.38;
  for (const n of ["transformer-core", "transformer-primary-coil", `transformer-secondary-coil-${s.ns}`]) sprite(ctx, img[n], cx, cy, sc, 512, 512);
  const X = (ax) => cx + (ax - 512) * sc, Y = (ay) => cy + (ay - 512) * sc;
  const srcX = Math.max(28, X(60)), lampX = Math.min(W - 30, X(1000));
  line(ctx, [[X(180), Y(372)], [srcX, Y(372)], [srcX, Y(470)]], T.wire, 2);
  line(ctx, [[X(180), Y(652)], [srcX, Y(652)], [srcX, Y(554)]], T.wire, 2);
  const sr = Math.max(14, 42 * sc);
  ctx.strokeStyle = T.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(srcX, Y(512), sr, 0, TAU); ctx.stroke();
  line(ctx, Array.from({ length: 21 }, (_, i) => [srcX - sr * 0.6 + (1.2 * sr * i) / 20, Y(512) - 0.35 * sr * Math.sin((TAU * i) / 20)]), T.ink, 2);
  text(ctx, T, "AC", srcX, Y(512) + sr + 14, "center", T.ink, 12, true);
  const bh = Math.max(60, size * 0.3);
  line(ctx, [[X(850), Y(372)], [lampX, Y(372)], [lampX, Y(640) - bh]], T.wire, 2);
  line(ctx, [[X(850), Y(652)], [lampX - 8, Y(652)]], T.wire, 2);
  bulb(ctx, img, lampX, Y(700), bh, Math.min(1, Math.log10(1 + r.P) / 3));
  text(ctx, T, `N\u209a = ${NP}`, X(252), Y(212) - 8, "center", T.ink, 12, true);
  text(ctx, T, `N\u209b = ${s.ns}`, X(772), Y(212) - 8, "center", T.ink, 12, true);
  text(ctx, T, `${fmtNum(s.vp)} V`, X(252), Y(812) + 18, "center", T.force, 12, true);
  text(ctx, T, `${fmtNum(r.Vs)} V`, X(772), Y(812) + 18, "center", T.current, 12, true);
  const big = Math.max(s.vp, r.Vs), gx = 14, gw = W - 28, gh = narrow ? Math.max(80, H - Y(812) - 80) : H * 0.22, gy = H - gh - 30;
  graph(ctx, T, gx, gy, gw, gh, [
    { fn: (u) => (s.vp / big) * Math.sin(TAU * 3 * u), color: T.force },
    { fn: (u) => (r.Vs / big) * Math.sin(TAU * 3 * u), color: T.current }
  ], { title: "primary (blue), secondary (red), same scale", xlabel: "0 to 50 ms at 60 Hz" });
}
