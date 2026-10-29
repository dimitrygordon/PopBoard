// Rocket Science & Space Mission: drawing. Reads state and draws to a 2D
// canvas. No physics decisions here: every number comes from rocket-physics.js.
//
// Leo's art carries a thin light halo for dark backgrounds. The rocket parts
// are stacked edge to edge, so the shipped copies of the stackable parts have
// that halo removed (a light ring would show at every seam). The scene art
// (launch pad, Earth, separated stages, plume mask) is drawn alone and keeps it.

import { R_EARTH, PLANETS, transferPos, AU, DAY } from "./rocket-physics.js";

const ASSET = "rocket-mission/assets/";
export const IMAGES = ["nose-cone-ogive", "nose-cone-conical", "payload-fairing", "launch-escape-tower", "capsule-crew", "upper-stage",
  "interstage", "first-stage-tank-small", "first-stage-tank-medium", "first-stage-tank-large", "engine-single", "engine-cluster",
  "engine-vacuum", "fins-pair", "booster", "exhaust-plume-mask", "separated-first-stage", "launch-pad", "earth"];

export function loadImages(onload) {
  const out = {};
  for (const n of IMAGES) {
    const im = new Image();
    im.decoding = "async";
    im.onload = () => onload && onload(n);
    im.onerror = () => onload && onload(n);
    im.src = ASSET + n + ".webp";
    out[n] = im;
  }
  return out;
}
const ok = (im) => im && im.complete && im.naturalWidth > 0;

export function readTokens() {
  const cs = getComputedStyle(document.documentElement);
  const g = (n, d) => cs.getPropertyValue(n).trim() || d;
  return {
    sky: g("--rm-sky", "#e8eef6"), ink: g("--rm-ink", "#1c1c1c"), dim: g("--rm-ink-dim", "#4a4f5c"), grid: g("--rm-grid", "#c9d2de"),
    thrust: g("--rm-thrust", "#b04a00"), weight: g("--rm-weight", "#1f5fae"), drag: g("--rm-drag", "#7a2fc0"), path: g("--rm-path", "#1e7a3a"),
    ground: g("--rm-ground", "#b9c2b0"), air: g("--rm-air", "#bcd3ee"), sun: g("--rm-sun", "#e0a800"),
    dark: document.documentElement.getAttribute("data-theme") === "dark"
  };
}

// ---------- primitives ----------
export function text(ctx, T, str, x, y, align = "left", color = T.ink, size = 13, bold = false) {
  ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = "alphabetic";
  ctx.font = `${bold ? "600 " : ""}${size}px ui-monospace, Menlo, monospace`;
  // Shrink to fit inside the canvas so narrow screens never clip a label.
  const cw = ctx.canvas.width / (ctx.getTransform().a || 1);
  const room = align === "left" ? cw - x - 4 : align === "right" ? x - 4 : 2 * Math.min(x, cw - x) - 8;
  const w = ctx.measureText(str).width;
  if (room > 0 && w > room) ctx.font = `${bold ? "600 " : ""}${Math.max(8, Math.floor(size * room / w))}px ui-monospace, Menlo, monospace`;
  ctx.fillText(str, x, y);
}
export function line(ctx, pts, color, w = 2, dash = null) {
  ctx.strokeStyle = color; ctx.lineWidth = w; ctx.setLineDash(dash || []);
  ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); ctx.setLineDash([]);
}
export function arrow(ctx, x0, y0, x1, y1, color, w = 3, head = 10) {
  const a = Math.atan2(y1 - y0, x1 - x0);
  if (Math.hypot(x1 - x0, y1 - y0) < 2) return;
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = w;
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1 - Math.cos(a) * head * 0.6, y1 - Math.sin(a) * head * 0.6); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 - head * Math.cos(a - 0.45), y1 - head * Math.sin(a - 0.45));
  ctx.lineTo(x1 - head * Math.cos(a + 0.45), y1 - head * Math.sin(a + 0.45)); ctx.closePath(); ctx.fill();
}
export function disc(ctx, x, y, r, fill, stroke = null) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, 2 * Math.PI); ctx.fillStyle = fill; ctx.fill();
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.5; ctx.stroke(); }
}
export function stars(ctx, W, H, T) {
  if (!T.dark) return;
  let s = 7;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  for (let i = 0; i < Math.round(W * H / 6000); i++) ctx.fillRect(rnd() * W, rnd() * H, 1.5, 1.5);
}
function sprite(ctx, im, x, y, s, ax, ay, rot = 0, alpha = 1) {
  if (!ok(im) && !(im && im.width && im.getContext)) return;
  const w = im.naturalWidth || im.width, h = im.naturalHeight || im.height;
  ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y); if (rot) ctx.rotate(rot);
  ctx.drawImage(im, -ax * s, -ay * s, w * s, h * s); ctx.restore();
}

// ---------- the rocket, stacked from parts ----------
const H_OF = { "launch-escape-tower": 260, "capsule-crew": 220, "nose-cone-ogive": 320, "nose-cone-conical": 260, "payload-fairing": 460,
  "upper-stage": 320, interstage: 120, "first-stage-tank-small": 300, "first-stage-tank-medium": 520, "first-stage-tank-large": 760,
  "engine-single": 260, "engine-cluster": 240, "engine-vacuum": 340 };
const TOPS = { ogive: ["nose-cone-ogive"], conical: ["nose-cone-conical"], fairing: ["payload-fairing"], capsule: ["launch-escape-tower", "capsule-crew"] };
/** Part list, top to bottom. which: "full" (on the pad) or "upper" (after staging). */
export function stackParts(c, which = "full") {
  const parts = [...TOPS[c.top]];
  if (which === "upper") return [...parts, "upper-stage", "engine-vacuum"];
  if (c.upper) parts.push("upper-stage", "interstage");
  parts.push("first-stage-tank-" + c.tank, "engine-" + c.engine);
  return parts;
}
const cache = new Map();
/** Compose a stack into one canvas (512 px wide art space). Returns { cv, h, exitY, tankBottom }. */
export function composeRocket(img, c, which = "full") {
  const parts = stackParts(c, which), key = JSON.stringify([parts, c.fins, c.boosters, which]) + IMAGES.filter((n) => ok(img[n])).length;
  if (cache.has(key)) return cache.get(key);
  let y = 0; const pos = [];
  for (const p of parts) { pos.push([p, y]); y += H_OF[p]; }
  const h = y, cv = document.createElement("canvas"); cv.width = 512; cv.height = h;
  const g = cv.getContext("2d");
  const tank = pos.find(([p]) => p.startsWith("first-stage-tank"));
  const tankBottom = tank ? tank[1] + H_OF[tank[0]] : h;
  if (which === "full" && c.boosters && ok(img.booster)) {
    const by = h - 900 + 20;
    g.drawImage(img.booster, -37, by); g.drawImage(img.booster, 293, by);
  }
  for (const [p, py] of pos) if (ok(img[p])) g.drawImage(img[p], 0, py);
  if (which === "full" && c.fins && ok(img["fins-pair"])) g.drawImage(img["fins-pair"], 0, tankBottom - 200);
  const out = { cv, h, exitY: h, tankBottom };
  cache.set(key, out);
  return out;
}
const plumeCache = new Map();
function plume(img, T) {
  const key = T.thrust + ok(img["exhaust-plume-mask"]);
  if (plumeCache.has(key)) return plumeCache.get(key);
  const m = img["exhaust-plume-mask"];
  if (!ok(m)) return null;
  const cv = document.createElement("canvas"); cv.width = m.naturalWidth; cv.height = m.naturalHeight;
  const g = cv.getContext("2d"); g.drawImage(m, 0, 0);
  g.globalCompositeOperation = "source-atop"; g.globalAlpha = 0.65; g.fillStyle = "#ff8a1f"; g.fillRect(0, 0, cv.width, cv.height);
  plumeCache.set(key, cv); return cv;
}
/** Draw a composed rocket with its axis at x, engine exit at y, given screen px per art px. */
export function drawRocket(ctx, img, T, c, x, y, s, opt = {}) {
  const R = composeRocket(img, c, opt.which || "full");
  if (opt.flame > 0) {
    const pl = plume(img, T);
    if (pl) {
      const exitW = (c.engine === "cluster" && (opt.which || "full") === "full") ? 300 : 200;
      const k = (exitW / 190) * s;
      ctx.save(); ctx.translate(x, y); if (opt.rot) ctx.rotate(opt.rot);
      ctx.drawImage(pl, -256 * k, -6 * s, 512 * k, 1024 * k * opt.flame); ctx.restore();
    }
  }
  sprite(ctx, R.cv, x, y, s, 256, R.h, opt.rot || 0);
  return R;
}

// ---------- launch pad ----------
export const PAD = { deckY: 743, trenchX: 527, towerTop: 98 };
export function drawPad(ctx, img, x, deckY, s) { sprite(ctx, img["launch-pad"], x - (PAD.trenchX - 512) * s, deckY, s, 512, PAD.deckY); }

// ---------- graphs ----------
/** Axes box; returns mappers. xs/ys: { min, max, log }. */
export function axes(ctx, T, x, y, w, h, xs, ys, labels = {}) {
  const fx = (v) => x + w * (xs.log ? Math.log(v / xs.min) / Math.log(xs.max / xs.min) : (v - xs.min) / (xs.max - xs.min));
  const fy = (v) => y + h - h * (ys.log ? Math.log(v / ys.min) / Math.log(ys.max / ys.min) : (v - ys.min) / (ys.max - ys.min));
  ctx.strokeStyle = T.grid; ctx.lineWidth = 1; ctx.strokeRect(x, y, w, h);
  for (const t of xs.ticks || []) { line(ctx, [[fx(t), y], [fx(t), y + h]], T.grid, 1); text(ctx, T, String(t), fx(t), y + h + 15, "center", T.dim, 12); }
  for (const t of ys.ticks || []) { line(ctx, [[x, fy(t)], [x + w, fy(t)]], T.grid, 1); text(ctx, T, String(t), x - 5, fy(t) + 4, "right", T.dim, 12); }
  if (labels.x) text(ctx, T, labels.x, x + w, y + h + 32, "right", T.dim, 12);
  if (labels.y) text(ctx, T, labels.y, x, y - 8, "left", T.dim, 12);
  return { fx, fy };
}

// ---------- flight plot (launch and sandbox) ----------
/** Downrange vs altitude, altitude stretched so the climb is visible. Returns the view. */
export function flightView(W, H, pts) {
  const maxD = Math.max(300, ...pts.map((p) => p.d / 1000)), maxH = Math.max(120, ...pts.map((p) => p.h / 1000));
  const padL = 52, padR = 16, padT = 26, padB = 44;
  const w = W - padL - padR, h = H - padT - padB;
  const dMax = Math.min(maxD * 1.05, 6000), hMax = Math.min(maxH * 1.15, 1500);
  const sx = w / dMax, sy = h / hMax, stretch = sy / sx;
  return { padL, padT, w, h, dMax, hMax, X: (d) => padL + d / 1000 * sx, Y: (hh) => padT + h - hh / 1000 * sy, stretch };
}
const niceStep = (span) => { const r = span / 5, p = 10 ** Math.floor(Math.log10(r)); return [1, 2, 5, 10].map((k) => k * p).find((k) => k >= r); };
export function drawFlight(ctx, W, H, T, img, c, sim, upto, opt = {}) {
  const V = flightView(W, H, sim.pts);
  // atmosphere band and the ground
  const g = ctx.createLinearGradient(0, V.Y(100e3), 0, V.Y(0));
  g.addColorStop(0, "rgba(120,170,230,0)"); g.addColorStop(1, T.dark ? "rgba(70,120,190,0.35)" : "rgba(120,170,230,0.45)");
  ctx.fillStyle = g; ctx.fillRect(V.padL, V.Y(100e3), V.w, V.Y(0) - V.Y(100e3));
  ctx.fillStyle = T.ground; ctx.fillRect(V.padL, V.Y(0), V.w, 4);
  const dx = niceStep(V.dMax), dy = niceStep(V.hMax);
  const xt = [], yt = [];
  for (let v = 0; v <= V.dMax + 1e-6; v += dx) xt.push(v);
  for (let v = 0; v <= V.hMax + 1e-6; v += dy) yt.push(v);
  axes(ctx, T, V.padL, V.padT, V.w, V.h, { min: 0, max: V.dMax, ticks: xt }, { min: 0, max: V.hMax, ticks: yt },
    { x: "distance along the ground (km)", y: `altitude (km), stretched \u00d7${Math.round(V.stretch)}` });
  line(ctx, [[V.padL, V.Y(100e3)], [V.padL + V.w, V.Y(100e3)]], T.dim, 1, [5, 5]);
  text(ctx, T, "100 km: edge of space", V.padL + V.w - 4, V.Y(100e3) - 5, "right", T.dim, 12);
  // path so far
  const shownPts = sim.pts.filter((p) => p.t <= upto && p.d / 1000 <= V.dMax && p.h / 1000 <= V.hMax && p.h > -1);
  for (let i = 1; i < shownPts.length; i++) {
    const a = shownPts[i - 1], b = shownPts[i];
    line(ctx, [[V.X(a.d), V.Y(a.h)], [V.X(b.d), V.Y(b.h)]], b.burning ? T.thrust : T.path, b.burning ? 3 : 2, b.burning ? null : [6, 4]);
  }
  for (const e of sim.events) {
    if (e.t > upto) continue;
    const p = sim.pts.reduce((best, q) => (Math.abs(q.t - e.t) < Math.abs(best.t - e.t) ? q : best), sim.pts[0]);
    const label = { meco: "first stage out", staging: "stage separation", fairing: c.top === "capsule" ? "tower off" : "fairing off", cutoff: "engine cutoff: in orbit", seco: "upper stage empty", boosters: "boosters off", upper: "" }[e.k];
    if (!label || p.h / 1000 > V.hMax) continue;
    disc(ctx, V.X(p.d), V.Y(p.h), 4, T.ink);
    text(ctx, T, label, V.X(p.d) + 7, V.Y(p.h) + (e.k === "staging" ? 16 : -7), "left", T.ink, 12);
  }
  // the rocket at the current point, pointing along its (stretched) path
  const cur = shownPts[shownPts.length - 1];
  if (cur) {
    const rot = Math.PI / 2 - Math.atan(Math.tan(cur.ang) * V.stretch);
    const s = Math.min(0.05, H / 4000);
    drawRocket(ctx, img, T, c, V.X(cur.d), V.Y(cur.h), s, { which: cur.stage === 2 ? "upper" : "full", flame: cur.burning ? 0.5 : 0, rot });
    const sep = sim.events.find((e) => e.k === "staging");
    if (sep && upto > sep.t && upto < sep.t + 40) {
      const p = sim.pts.find((q) => q.t >= sep.t) || cur;
      sprite(ctx, img["separated-first-stage"], V.X(p.d) - (upto - sep.t) * 1.2, V.Y(p.h) + (upto - sep.t) * 1.5, s * 1.4, 512, 512, 0, Math.max(0, 1 - (upto - sep.t) / 40));
    }
  }
  return V;
}

// ---------- orbits (cannonball) ----------
export function drawOrbitScene(ctx, W, H, T, img, k, phase) {
  const cx = W / 2, viewR = Math.min(Math.max(k.r * 1.25, k.kind === "orbit" && !k.far ? k.o.ra * 1.08 : k.r * 2.2), 4.2 * R_EARTH);
  const sc = Math.min(W, H) * 0.46 / viewR, cy = H / 2 + (k.kind === "orbit" && !k.far ? (k.o.ra - k.r) * sc * 0.5 : 0);
  const cyy = Math.min(H - 10 - R_EARTH * sc, Math.max(cy, 10 + k.r * sc));
  sprite(ctx, img.earth, cx, cyy, (2 * R_EARTH * sc) / 1014, 512, 512);
  if (!ok(img.earth)) disc(ctx, cx, cyy, R_EARTH * sc, "#3a78c2");
  // circle at the launch height (circular-orbit speed reference)
  ctx.setLineDash([4, 6]); ctx.strokeStyle = T.dim; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cyy, k.r * sc, 0, 2 * Math.PI); ctx.stroke(); ctx.setLineDash([]);
  const { e, p } = k.o, nu0 = k.o.startAtPeri ? 0 : Math.PI;
  const pts = []; let hit = null;
  const maxPhi = k.kind === "escape" || !k.o.bound ? Math.acos(-1 / e) - nu0 - 0.02 : 2 * Math.PI;
  for (let i = 0; i <= 720; i++) {
    const phi = (maxPhi * i) / 720, r = p / (1 + e * Math.cos(phi + nu0));
    if (r < R_EARTH) { hit = phi; break; }
    if (r > viewR * 3 || r < 0) break;
    pts.push([cx + r * sc * Math.sin(phi), cyy - r * sc * Math.cos(phi), phi, r]);
  }
  line(ctx, pts.map((q) => [q[0], q[1]]), T.path, 2.5);
  const lx = cx, ly = cyy - k.r * sc;
  disc(ctx, lx, ly, 5, T.ink);
  arrow(ctx, lx, ly, lx + 50, ly, T.thrust, 3);
  if (hit !== null) { const r = R_EARTH; disc(ctx, cx + r * sc * Math.sin(hit), cyy - r * sc * Math.cos(hit), 5, T.thrust); }
  // a moving craft: equal areas in equal times (faster when closer)
  if (phase !== null && pts.length > 2) {
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + pts[i][3] * pts[i][3] * (pts[i][2] - pts[i - 1][2]));
    const goal = phase * cum[cum.length - 1];
    let idx = 0; while (idx < cum.length - 1 && cum[idx] < goal) idx++;
    disc(ctx, pts[idx][0], pts[idx][1], 6, T.thrust, T.ink);
  }
  return { cx, cy: cyy, sc };
}

// ---------- Hohmann ----------
export function drawHohmann(ctx, W, H, T, img, plan, target, tSec, phaseRad) {
  const cx = W / 2, cy = H / 2 + 6, rMax = Math.max(plan.r1, plan.r2), sc = (Math.min(W, H) * 0.44) / rMax;
  const sunR = Math.max(6, Math.min(16, 0.25 * plan.r1 * sc * (plan.r2 < plan.r1 ? 0.5 : 0.3)));
  disc(ctx, cx, cy, sunR, T.sun);
  for (const [r, col] of [[plan.r1, PLANETS.earth.color], [plan.r2, PLANETS[target].color]]) {
    ctx.strokeStyle = T.grid; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(cx, cy, r * sc, 0, 2 * Math.PI); ctx.stroke();
  }
  // transfer half-ellipse (departure point at angle 0, to the right; motion counterclockwise on screen)
  const pts = [];
  for (let i = 0; i <= 200; i++) {
    const q = transferPos(plan.r1, plan.r2, (plan.tTransfer * i) / 200);
    pts.push([cx + q.r * sc * Math.cos(q.swept), cy - q.r * sc * Math.sin(q.swept)]);
  }
  line(ctx, pts, T.path, 2.5, [7, 5]);
  const t = Math.min(tSec, plan.tTransfer);
  const aE = plan.n1 * t, aT = phaseRad + plan.n2 * t;
  const eX = cx + plan.r1 * sc * Math.cos(aE), eY = cy - plan.r1 * sc * Math.sin(aE);
  const tX = cx + plan.r2 * sc * Math.cos(aT), tY = cy - plan.r2 * sc * Math.sin(aT);
  sprite(ctx, img.earth, eX, eY, 16 / 1014, 512, 512);
  if (!ok(img.earth)) disc(ctx, eX, eY, 8, PLANETS.earth.color);
  disc(ctx, tX, tY, 7, PLANETS[target].color, T.ink);
  text(ctx, T, "Earth", eX + 11, eY - 9, "left", T.ink, 12, true);
  text(ctx, T, PLANETS[target].name, tX + 10, tY + 16, "left", T.ink, 12, true);
  const q = transferPos(plan.r1, plan.r2, t);
  disc(ctx, cx + q.r * sc * Math.cos(q.swept), cy - q.r * sc * Math.sin(q.swept), 5, T.thrust, T.ink);
  text(ctx, T, "Sun", cx, cy + sunR + 15, "center", T.dim, 12);
  text(ctx, T, `Day ${Math.round(t / DAY)} of ${Math.round(plan.tTransfer / DAY)}`, 12, 22, "left", T.ink, 14, true);
  text(ctx, T, `Orbits to scale: 1 AU = ${Math.round(AU * sc)} px`, 12, H - 12, "left", T.dim, 12);
}
