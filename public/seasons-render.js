// Seasons, Eclipses & Celestial Geometry: canvas drawing.
// Art: seasons/assets/*.webp (Leo, Physics Style). Code draws every orbit,
// arc, ray, arrow, angle marker, label and graph. Anchors (checked against
// the pixels, see docs/seasons-eclipses-science.md):
//   bodies 1024 x 1024, disk center (512, 512), radius 440
//   axis rod pairs pixel for pixel with earth, 0 deg = north up
//   terminator: night on the right half, twilight band 476 to 548
//   cones 1024 x 512, body at x = 0, y = 256, base half height 150;
//   umbra tip at x = 1014; penumbra half height 150 + 100 x / 1024
//   horizon-scene 1280 x 720, horizon line at 70% of the height
//   observer-sprite 256 x 256, feet at y = 247
import * as P from "./seasons-physics.js";

const DEG = Math.PI / 180;
const ART = ["sun", "earth", "moon", "earth-axis-upright", "day-night-terminator", "shadow-umbra-cone", "shadow-penumbra-cone", "horizon-scene", "observer-sprite"];
export const A = {
  BODY_R: 440, BODY_C: 512, CONE_BASE_HALF: 150, CONE_CY: 256, UMBRA_TIP: 1014, PEN_GROW: 100,
  HORIZON_FRAC: 0.70, FEET_Y: 247, SPRITE: 256
};

export function loadArt(onReady) {
  const art = { ready: false };
  let left = ART.length;
  for (const n of ART) {
    const img = new Image();
    img.src = `seasons/assets/${n}.webp`;
    if (["sun", "earth", "moon"].includes(n)) img.dataset.body = n;
    art[n] = img;
    const done = () => { if (--left === 0) { stripLayers(art); art.ready = true; onReady(); } };
    (img.decode ? img.decode() : Promise.resolve()).then(done, done);
  }
  return art;
}

/** The art carries a thin light halo for dark backgrounds. Where a sprite is stacked on top of another
 *  layer (terminator and axis on the Earth, cones on each other, the Moon on a shadow) the halo would show
 *  as a light ring, so those layers get a copy with the halo removed: light pixels connected to the
 *  transparent outside are cleared. The ink outline stops the fill, so clouds and highlights inside stay. */
export function stripHalo(img) {
  const w = img.naturalWidth, h = img.naturalHeight, cv = document.createElement("canvas");
  cv.width = w; cv.height = h; const c = cv.getContext("2d"); c.drawImage(img, 0, 0);
  const d = c.getImageData(0, 0, w, h), px = d.data, seen = new Uint8Array(w * h), q = [];
  const light = (i) => px[i * 4 + 3] > 0 && Math.min(px[i * 4], px[i * 4 + 1], px[i * 4 + 2]) > 150;
  const clear = (i) => px[i * 4 + 3] < 20;
  for (let i = 0; i < w * h; i++) if (clear(i)) { seen[i] = 1; q.push(i); }
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
/** Halo copy when the disk stands alone on the background, bare copy when it overlaps a disk drawn under it. */
function pick(art, name, x, y, r, under) {
  const hit = under.some((u) => Math.hypot(u.x - x, u.y - y) < u.r + r + 2);
  return (hit && art[name + "Bare"]) || art[name];
}
const STACKED = [{ x: 0, y: 0, r: 1e9 }]; // always overlaps: the disk sits on a shadow cone
function earthImg(art, x, y, r, under) { return pick(art, "earth", x, y, r, under); }
function stripLayers(art) {
  for (const n of ["day-night-terminator", "earth-axis-upright", "shadow-umbra-cone", "shadow-penumbra-cone"]) if (art[n].naturalWidth) art[n] = stripHalo(art[n]);
  if (art.moon.naturalWidth) art.moonBare = stripHalo(art.moon);
  if (art.earth.naturalWidth) art.earthBare = stripHalo(art.earth);
  if (art.sun.naturalWidth) art.sunBare = stripHalo(art.sun);
}

export function readTokens(el = document.documentElement) {
  const cs = getComputedStyle(el), v = (k, d) => (cs.getPropertyValue(k).trim() || d);
  return {
    space: v("--se-space", "#151923"), paper: v("--se-paper", "#f1f1ec"), sky: v("--se-sky", "#78acd9"), night: v("--se-night", "#1b2333"),
    ink: v("--se-ink", "#1a1a1a"), inkSoft: v("--se-ink-soft", "#6b6b6b"), line: v("--se-line", "#c9ccd3"),
    light: v("--se-text", "#e8e8e8"), gold: v("--se-gold", "#e2b23f"), dim: v("--se-dim", "#9aa1ad"),
    panel: v("--se-panel", "#1c2130"), grid: v("--se-grid", "rgba(220,224,232,0.3)"), rim: v("--se-rim", "rgba(255,255,255,0.6)"),
    dark: el.getAttribute("data-theme") !== "light"
  };
}

// ---------- small helpers ----------
let RIM = null; // light edge now baked into the art (halo), so the code rim stays off
function body(ctx, img, x, y, r, rot = 0) {
  if (!img || !img.complete || !img.naturalWidth) return;
  if (RIM && img.dataset && img.dataset.body) { ctx.save(); ctx.strokeStyle = RIM; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, r + 1.2, 0, 7); ctx.stroke(); ctx.restore(); }
  const s = r / A.BODY_R;
  ctx.save(); ctx.translate(x, y); if (rot) ctx.rotate(rot);
  ctx.drawImage(img, -A.BODY_C * s, -A.BODY_C * s, 1024 * s, 1024 * s);
  ctx.restore();
}
function text(ctx, s, x, y, color, size = 12, align = "left", weight = 500) {
  ctx.font = `${weight} ${size}px Inter, system-ui, sans-serif`;
  ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = "middle"; ctx.fillText(s, x, y);
}
function arrow(ctx, x1, y1, x2, y2, color, w = 1.6, head = 8) {
  const a = Math.atan2(y2 - y1, x2 - x1);
  ctx.save(); ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = w;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2 - Math.cos(a) * head * 0.6, y2 - Math.sin(a) * head * 0.6); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 - head * Math.cos(a - 0.4), y2 - head * Math.sin(a - 0.4));
  ctx.lineTo(x2 - head * Math.cos(a + 0.4), y2 - head * Math.sin(a + 0.4)); ctx.closePath(); ctx.fill(); ctx.restore();
}
function pill(ctx, s, x, y, T, align = "left") {
  ctx.font = "500 11px Inter, system-ui, sans-serif";
  const w = ctx.measureText(s).width + 12, x0 = align === "center" ? x - w / 2 : align === "right" ? x - w : x;
  ctx.fillStyle = "rgba(21,25,35,0.72)"; ctx.beginPath(); ctx.roundRect(x0, y - 10, w, 20, 10); ctx.fill();
  text(ctx, s, x0 + 6, y, "#eef0f3", 11);
}
function starfield(cache, W, H, dpr) {
  const key = `${W}x${H}@${dpr}`;
  if (cache.stars && cache.stars.key === key) return cache.stars.cv;
  const cv = document.createElement("canvas"); cv.width = W * dpr; cv.height = H * dpr;
  const c = cv.getContext("2d"); c.scale(dpr, dpr);
  let s = 7; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < Math.round(W * H / 2600); i++) { c.fillStyle = `rgba(255,255,255,${0.15 + rnd() * 0.45})`; c.fillRect(rnd() * W, rnd() * H, 1.1, 1.1); }
  cache.stars = { key, cv };
  return cv;
}
/** Earth disk with its axis (screen angle from vertical, clockwise positive) and night side facing nightAngle. */
function earthWithAxis(ctx, art, x, y, r, axisRot, nightAngle, axisLen = 1.35, under = []) {
  body(ctx, earthImg(art, x, y, r, under), x, y, r, axisRot);
  body(ctx, art["day-night-terminator"], x, y, r, nightAngle);
  const s = r / A.BODY_R;
  ctx.save(); ctx.translate(x, y); ctx.rotate(axisRot); ctx.scale(axisLen, axisLen);
  const img = art["earth-axis-upright"];
  if (img.complete && img.naturalWidth) ctx.drawImage(img, -A.BODY_C * s, -A.BODY_C * s, 1024 * s, 1024 * s);
  ctx.restore();
}

// ---------- 3D projection (orthographic) ----------
function makeCam(yawDeg, elevDeg, scale, cx, cy) {
  const cy_ = Math.cos(yawDeg * DEG), sy = Math.sin(yawDeg * DEG), ce = Math.cos(elevDeg * DEG), se = Math.sin(elevDeg * DEG);
  return (v) => {
    const x = v.x * cy_ - v.y * sy, yv = v.x * sy + v.y * cy_;
    return { x: cx + scale * x, y: cy - scale * (v.z * ce + yv * se), depth: yv * ce - v.z * se };
  };
}
const sph = (lon, lat, r = 1) => ({ x: r * Math.cos(lat * DEG) * Math.cos(lon * DEG), y: r * Math.cos(lat * DEG) * Math.sin(lon * DEG), z: r * Math.sin(lat * DEG) });
function axisVector(tilt, year = 2000) { const p = P.poleAt(year, tilt); return sph(p.lon, p.lat); }
function screenAngle(cam, from, dir) {
  const a = cam(from), b = cam({ x: from.x + dir.x * 1e-3, y: from.y + dir.y * 1e-3, z: from.z + dir.z * 1e-3 });
  return Math.atan2(b.x - a.x, -(b.y - a.y)); // clockwise from up
}

// ---------- STAGES ----------
export function drawStage(ctx, W, H, dpr, cache, art, T, st, snap) {
  const m = st.mode;
  RIM = null;
  if (m === "eclipses") return drawEclipseStage(ctx, W, H, art, T, st, snap);
  if (m === "sky") return drawSky(ctx, W, H, art, T, st, snap);
  ctx.fillStyle = T.space; ctx.fillRect(0, 0, W, H);
  if (T.dark) ctx.drawImage(starfield(cache, W, H, dpr), 0, 0, W, H);
  if (m === "seasons" || m === "sandbox") return drawOrbit(ctx, W, H, art, T, st, snap);
  if (m === "sunlight") return drawSunlightStage(ctx, W, H, art, T, st, snap);
  if (m === "daylight") return drawDaylightMap(ctx, W, H, dpr, cache, T, st, snap);
  if (m === "nodes") return drawNodes(ctx, W, H, art, T, st, snap);
  if (m === "precession") return drawPoleSky(ctx, W, H, T, st);
}

function drawOrbit(ctx, W, H, art, T, st, snap) {
  const R = Math.min(W * 0.4, H * 0.62);
  const cam = makeCam(0, 22, R, W / 2, H * 0.5);
  // orbit path
  ctx.strokeStyle = T.grid; ctx.lineWidth = 1.2; ctx.beginPath();
  for (let i = 0; i <= 180; i++) { const p = cam(sph(i * 2, 0)); i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); } ctx.stroke();
  const axis = axisVector(st.tilt);
  const sunR = Math.max(26, R * 0.2);
  const marks = [{ d: P.dayOfYear(2, 20), l: "Mar equinox" }, { d: P.dayOfYear(5, 21), l: "Jun solstice" }, { d: P.dayOfYear(8, 22), l: "Sep equinox" }, { d: P.dayOfYear(11, 21), l: "Dec solstice" }];
  const items = [];
  for (const mk of marks) {
    const lon = P.sunAt(mk.d + 0.5).lon + 180;
    items.push({ kind: "ghost", pos: sph(lon, 0), label: mk.l });
  }
  const eLon = snap.sun.lon + 180;
  items.push({ kind: "earth", pos: sph(eLon, 0) });
  items.push({ kind: "sun", pos: { x: 0, y: 0, z: 0 } });
  items.sort((a, b) => cam(b.pos).depth - cam(a.pos).depth);
  const er = Math.max(16, R * 0.085);
  for (const it of items) {
    const p = cam(it.pos);
    if (it.kind === "sun") body(ctx, art.sun, p.x, p.y, sunR);
    else if (it.kind === "ghost") {
      const rot = screenAngle(cam, it.pos, axis);
      ctx.save(); ctx.globalAlpha = 0.38; earthWithAxis(ctx, art, p.x, p.y, er * 0.72, rot, Math.atan2(p.y - cam({ x: 0, y: 0, z: 0 }).y, p.x - cam({ x: 0, y: 0, z: 0 }).x)); ctx.restore();
      text(ctx, it.label, p.x, p.y + er + 14, T.dim, 11, "center");
    } else {
      const rot = screenAngle(cam, it.pos, axis);
      const s0 = cam({ x: 0, y: 0, z: 0 });
      earthWithAxis(ctx, art, p.x, p.y, er, rot, Math.atan2(p.y - s0.y, p.x - s0.x));
      // Moon (distance not to scale)
      const ml = snap.moon.lon, mp = cam({ x: it.pos.x + 0.16 * Math.cos(ml * DEG), y: it.pos.y + 0.16 * Math.sin(ml * DEG), z: 0 });
      body(ctx, pick(art, "moon", mp.x, mp.y, er * 0.3, [{ x: p.x, y: p.y, r: er }]), mp.x, mp.y, er * 0.3);
    }
  }
  text(ctx, "Sizes and distances not to scale. Axis direction fixed in space.", 12, H - 14, T.dim, 11);
  pill(ctx, `${P.dateParts(snap.t).label}: Sun overhead at ${P.fmtLat(snap.dec)}`, 12, 18, T);
}

/** Side view: Sun to the left, Earth tilted by the declination. Returns geometry for the overlay. */
function sideEarth(ctx, art, T, cx, cy, r, st, snap, rays = true) {
  const d = snap.dec;
  if (rays) {
    ctx.strokeStyle = "rgba(226,178,63,0.55)"; ctx.lineWidth = 1;
    for (let k = -4; k <= 4; k++) { const y = cy + k * r * 0.24; arrow(ctx, cx - r * 2.6, y, cx - r * 1.08 - Math.max(0, r * (1 - Math.sqrt(Math.max(0, 1 - (k * 0.24) ** 2)))), y, "rgba(226,178,63,0.6)", 1, 6); }
  }
  earthWithAxis(ctx, art, cx, cy, r, -d * DEG, 0, 1.3);
  // latitude lines in the tilted frame
  const lines = [{ lat: 0, c: T.light, l: "equator" }, { lat: st.tilt, c: T.gold, l: "tropic" }, { lat: -st.tilt, c: T.gold, l: "" },
    { lat: 90 - st.tilt, c: T.dim, l: "polar circle" }, { lat: -(90 - st.tilt), c: T.dim, l: "" }];
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(-d * DEG);
  for (const L of lines) {
    if (Math.abs(L.lat) > 89.5) continue;
    const y = -r * Math.sin(L.lat * DEG), hw = r * Math.cos(L.lat * DEG);
    ctx.strokeStyle = L.c; ctx.setLineDash([4, 3]); ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(-hw, y); ctx.lineTo(hw, y); ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.restore();
  // observer at latitude on the sunlit limb (noon)
  const a = (st.lat - d) * DEG; // angle above the Sun-line
  const ox = cx - r * Math.cos(a), oy = cy - r * Math.sin(a);
  ctx.fillStyle = T.gold; ctx.strokeStyle = T.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(ox, oy, 5, 0, 7); ctx.fill(); ctx.stroke();
  // subsolar point
  ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(cx - r, cy, 3.5, 0, 7); ctx.fill();
  return { ox, oy, a };
}

function drawSunlightStage(ctx, W, H, art, T, st, snap) {
  const wide = W > 560;
  const r = wide ? Math.min(H * 0.3, W * 0.17) : Math.min(W * 0.24, H * 0.17);
  const cx = wide ? W * 0.3 : W * 0.55, cy = wide ? H * 0.5 : H * 0.27;
  sideEarth(ctx, art, T, cx, cy, r, st, snap);
  text(ctx, "Sunlight", cx - r * 2.6, cy - r * 1.15, T.gold, 12);
  text(ctx, `you, ${P.fmtLat(st.lat)}`, cx - r * 1.0, cy + r * 1.25, T.light, 11, "center");
  // ground patch
  const gx = wide ? W * 0.58 : W * 0.08, gw = wide ? W * 0.38 : W * 0.84, gy = wide ? H * 0.72 : H * 0.88;
  const alt = P.noonAltitude(st.lat, snap.dec);
  ctx.fillStyle = T.dark ? "#3a3f4b" : "#c9ccd3"; ctx.fillRect(gx, gy, gw, 8);
  ctx.strokeStyle = T.light; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + gw, gy); ctx.stroke();
  if (alt > 0.3) {
    const beam = gw * 0.22, foot = Math.min(gw * 0.95, beam / Math.sin(alt * DEG));
    const x0 = gx + gw * 0.5 - foot / 2, x1 = x0 + foot;
    const L = Math.min(gy - (wide ? H * 0.12 : H * 0.55), gw);
    const dx = -Math.cos(alt * DEG) * L, dy = -Math.sin(alt * DEG) * L;
    ctx.fillStyle = "rgba(226,178,63,0.28)"; ctx.beginPath(); ctx.moveTo(x0, gy); ctx.lineTo(x1, gy); ctx.lineTo(x1 + dx, gy + dy); ctx.lineTo(x0 + dx, gy + dy); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = T.gold; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = T.gold; ctx.fillRect(x0, gy - 3, foot, 3);
    // angle marker
    ctx.strokeStyle = T.light; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(x1, gy, 34, Math.PI, Math.PI + alt * DEG, false); ctx.stroke();
    text(ctx, `${P.fmtNum(alt, 1)}\u00b0`, x1 - 40 - 22 * Math.cos(alt * DEG / 2), gy - 14 - 16 * Math.sin(alt * DEG / 2), T.light, 12, "center", 600);
    text(ctx, `same beam covers ${P.fmtNum(P.spreadFactor(alt), 2)} times the ground`, gx + gw / 2, gy + 24, T.light, 12, "center");
  } else text(ctx, "The Sun stays below the horizon at noon", gx + gw / 2, gy - 20, T.light, 12, "center");
  text(ctx, "Noon. Earth size not to scale.", 12, H - 14, T.dim, 11);
}

export function dayLengthLayer(cache, tilt) {
  const key = `dl${tilt}`;
  if (cache.dl && cache.dl.key === key) return cache.dl.cv;
  const w = 365, h = 181, cv = document.createElement("canvas"); cv.width = w; cv.height = h;
  const c = cv.getContext("2d"), img = c.createImageData(w, h);
  const decs = []; for (let d = 0; d < w; d++) decs.push(P.declination(P.sunAt(d + 0.5).lon, tilt));
  for (let j = 0; j < h; j++) {
    const lat = 90 - j;
    for (let d = 0; d < w; d++) {
      const L = P.dayLength(lat, decs[d]) / 24, g = Math.round(28 + L * 212), k = (j * w + d) * 4;
      img.data[k] = g; img.data[k + 1] = g; img.data[k + 2] = Math.min(255, g + 8); img.data[k + 3] = 255;
    }
  }
  c.putImageData(img, 0, 0);
  cache.dl = { key, cv };
  return cv;
}
function drawDaylightMap(ctx, W, H, dpr, cache, T, st, snap) {
  const l = 44, r = 14, t = 34, b = 40, w = W - l - r, h = H - t - b;
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(dayLengthLayer(cache, st.tilt), l, t, w, h);
  // 12 h contour
  const x = (d) => l + (d + 0.5) / 365 * w, y = (lat) => t + (90 - lat) / 180 * h;
  ctx.strokeStyle = T.grid; ctx.lineWidth = 1;
  for (const lat of [-66.5, -23.5, 0, 23.5, 66.5]) { ctx.beginPath(); ctx.moveTo(l, y(lat)); ctx.lineTo(l + w, y(lat)); ctx.stroke(); }
  // subsolar track
  ctx.strokeStyle = T.gold; ctx.lineWidth = 1.6; ctx.beginPath();
  for (let d = 0; d < 365; d++) { const yy = y(P.declination(P.sunAt(d + 0.5).lon, st.tilt)); d ? ctx.lineTo(x(d), yy) : ctx.moveTo(x(d), yy); } ctx.stroke();
  // cursor
  const cx = x(st.date), cy = y(st.lat);
  ctx.strokeStyle = T.ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, 7, 0, 7); ctx.stroke();
  ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(cx, cy, 7, 0, 7); ctx.stroke();
  for (const lat of [90, 66.5, 23.5, 0, -23.5, -66.5, -90]) text(ctx, lat === 0 ? "0\u00b0" : `${Math.abs(lat)}\u00b0${lat > 0 ? "N" : "S"}`, l - 4, y(lat), T.dim, 10, "right");
  const months = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
  for (let m = 0; m < 12; m++) text(ctx, W > 500 ? ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m] : months[m], x(P.dayOfYear(m, 15)), t + h + 12, T.dim, 10, "center");
  text(ctx, "Daylight hours by latitude and date: black 0 h, white 24 h. Gold: where the Sun is overhead at noon.", l, 16, T.light, 11);
  text(ctx, "Thin lines: equator, 23.5\u00b0 and 66.5\u00b0 for reference.", l, H - 12, T.dim, 10);
}

function drawNodes(ctx, W, H, art, T, st, snap) {
  const R = Math.min(W * 0.38, H * 0.7);
  const cam = makeCam(-20, 14, R, W / 2, H * 0.52);
  const EX = 3; // tilt drawn 3x
  const node = snap.moon.node, inc = st.incl * EX;
  // ecliptic plane disk
  ctx.strokeStyle = T.grid; ctx.lineWidth = 1; ctx.beginPath();
  for (let i = 0; i <= 120; i++) { const p = cam(sph(i * 3, 0)); i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); } ctx.stroke();
  // moon orbit: point at argument u from ascending node
  const orbitPt = (u) => {
    const x = Math.cos(u * DEG), y = Math.sin(u * DEG) * Math.cos(inc * DEG), z = Math.sin(u * DEG) * Math.sin(inc * DEG);
    const c = Math.cos(node * DEG), s = Math.sin(node * DEG);
    return { x: x * c - y * s, y: x * s + y * c, z };
  };
  ctx.lineWidth = 1.6;
  for (let i = 0; i < 120; i++) {
    const a = orbitPt(i * 3), b = orbitPt(i * 3 + 3), pa = cam(a), pb = cam(b);
    ctx.strokeStyle = a.z >= 0 ? T.light : T.grid;
    ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke();
  }
  // node line
  const n1 = cam(sph(node, 0, 1.12)), n2 = cam(sph(node + 180, 0, 1.12));
  ctx.setLineDash([6, 4]); ctx.strokeStyle = T.gold; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(n1.x, n1.y); ctx.lineTo(n2.x, n2.y); ctx.stroke(); ctx.setLineDash([]);
  pill(ctx, "ascending node", n1.x, n1.y - 16, T, "center"); pill(ctx, "descending node", n2.x, n2.y - 16, T, "center");
  // Sun direction
  const sp = cam(sph(snap.sun.lon, 0, 1.45)), e0 = cam({ x: 0, y: 0, z: 0 });
  arrow(ctx, sp.x, sp.y, e0.x + (sp.x - e0.x) * 0.25, e0.y + (sp.y - e0.y) * 0.25, T.gold, 2.2, 10);
  body(ctx, art.sun, sp.x, sp.y, Math.max(14, R * 0.08));
  text(ctx, "sunlight", sp.x, sp.y + Math.max(14, R * 0.08) + 12, T.gold, 11, "center");
  // Earth and Moon (by depth)
  const u = P.norm360(snap.moon.lon - node);
  const mv = orbitPt(u), mp = cam(mv);
  const er = Math.max(14, R * 0.08);
  const mr = Math.max(6, er * 0.4);
  const drawE = (under) => earthWithAxis(ctx, art, e0.x, e0.y, er, 0, Math.atan2(e0.y - sp.y, e0.x - sp.x), 1.2, under);
  const drawM = (under) => body(ctx, pick(art, "moon", mp.x, mp.y, mr, under), mp.x, mp.y, mr);
  if (mp.depth > 0) { drawM([]); drawE([{ x: mp.x, y: mp.y, r: mr }]); } else { drawE([]); drawM([{ x: e0.x, y: e0.y, r: er }]); }
  text(ctx, `${P.fmtNum(st.incl, 2)}\u00b0 tilt, drawn ${EX} times larger. Distances not to scale.`, 12, H - 14, T.dim, 11);
  pill(ctx, `${P.dateParts(snap.t).label}: Moon ${P.fmtNum(Math.abs(snap.moon.lat), 2)}\u00b0 ${snap.moon.lat >= 0 ? "above" : "below"} the Sun's path`, 12, 18, T);
}

function drawPoleSky(ctx, W, H, T, st) {
  const cx = W / 2, cy = H / 2 + 6, rMax = Math.min(W, H) * 0.46;
  const range = Math.max(30, st.tilt + 12);
  const toXY = (lon, lat) => { const rr = (90 - lat) / range * rMax; return { x: cx + rr * Math.cos((lon - 90) * DEG), y: cy - rr * Math.sin((lon - 90) * DEG) }; };
  ctx.strokeStyle = T.grid; ctx.lineWidth = 1;
  for (let k = 10; k <= range; k += 10) { ctx.beginPath(); ctx.arc(cx, cy, k / range * rMax, 0, 7); ctx.stroke(); }
  // pole path
  ctx.strokeStyle = T.gold; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(cx, cy, st.tilt / range * rMax, 0, 7); ctx.stroke(); ctx.setLineDash([]);
  for (const y of [-12000, -8000, -4000, 0, 4000, 8000, 12000]) {
    const p = P.poleAt(y, st.tilt), q = toXY(p.lon, p.lat);
    ctx.fillStyle = T.gold; ctx.beginPath(); ctx.arc(q.x, q.y, 2.5, 0, 7); ctx.fill();
    const out = toXY(p.lon, p.lat - 5);
    text(ctx, P.fmtYear(y), out.x, out.y, T.dim, 10, "center");
  }
  for (const s of P.POLE_STARS) {
    const q = toXY(s.lon, s.lat);
    if (Math.hypot(q.x - cx, q.y - cy) > rMax) continue;
    ctx.fillStyle = T.light; ctx.beginPath(); ctx.arc(q.x, q.y, s.name === "Polaris" || s.name === "Vega" ? 3.5 : 2.6, 0, 7); ctx.fill();
    text(ctx, s.name, q.x + 7, q.y - 7, T.light, 11);
  }
  const p = P.poleAt(st.year, st.tilt), q = toXY(p.lon, p.lat);
  ctx.strokeStyle = T.gold; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(q.x - 9, q.y); ctx.lineTo(q.x + 9, q.y); ctx.moveTo(q.x, q.y - 9); ctx.lineTo(q.x, q.y + 9); ctx.stroke();
  ctx.fillStyle = T.light; ctx.beginPath(); ctx.arc(cx, cy, 2, 0, 7); ctx.fill();
  text(ctx, "ecliptic pole", cx, cy + 12, T.dim, 10, "center");
  pill(ctx, `${P.fmtYear(st.year)}: the north pole points at the gold cross`, 12, 18, T);
  text(ctx, "Northern sky around the ecliptic pole. Rings every 10\u00b0. Star motions ignored.", 12, H - 14, T.dim, 11);
}

// ---------- eclipses (paper panel, like the mockup) ----------
function drawCone(ctx, art, x0, cy, r0, tipX, kind) {
  const img = art[kind === "umbra" ? "shadow-umbra-cone" : "shadow-penumbra-cone"];
  if (!img.complete || !img.naturalWidth) return;
  const sy = r0 / A.CONE_BASE_HALF;
  if (kind === "umbra") {
    const len = tipX - x0; if (len <= 1) return;
    const sx = len / A.UMBRA_TIP;
    ctx.drawImage(img, x0, cy - A.CONE_CY * sy, 1024 * sx, 512 * sy);
  }
}
function penumbraCone(ctx, art, x0, cy, r0, x1, r1) {
  // Use the art when its built-in flare (150 to 250 half height) can match; otherwise draw in code with the art's tone.
  const img = art["shadow-penumbra-cone"], sy = r0 / A.CONE_BASE_HALF, need = (r1 - r0) / sy;
  const D = x1 - x0;
  if (img.complete && img.naturalWidth && need > 0) {
    const Wd = A.PEN_GROW * D / need;
    if (Wd >= D) { ctx.drawImage(img, x0, cy - A.CONE_CY * sy, Wd, 512 * sy); return; }
  }
  ctx.fillStyle = "rgba(110,110,110,0.55)"; ctx.beginPath(); ctx.moveTo(x0, cy - r0); ctx.lineTo(x1, cy - r1); ctx.lineTo(x1, cy + r1); ctx.lineTo(x0, cy + r0); ctx.closePath(); ctx.fill();
}
function drawEclipseStage(ctx, W, H, art, T, st, snap) {
  ctx.fillStyle = T.paper; ctx.fillRect(0, 0, W, H);
  const solar = snap.theta < 90 || snap.theta > 270;
  const g = snap.ecl.g, cy = H * 0.5;
  const Rpx = Math.min(H * 0.2, W * 0.1); // Earth radius in px; widths use this scale
  const k = Rpx / P.REAL.earthRadius;
  const sunR = Math.min(H * 0.32, W * 0.14);
  body(ctx, art.sunBare || art.sun, -sunR * 0.15, cy, sunR);
  const clampY = (y) => Math.max(18, Math.min(H - 18, y));
  if (solar) {
    const so = snap.ecl.solar, xm = W * 0.36, xe = W * 0.84, D = xe - xm;
    const mr = P.REAL.moonRadius * k;
    const Lu = P.umbraLength(P.REAL.sunRadius, P.REAL.moonRadius, Math.hypot(g.moonPos.x, g.moonPos.y, g.moonPos.z));
    const tip = xm + D * Lu / g.earthMoonDistance;
    const off = Math.sign(-snap.moon.lat || 1) * so.earthOffsetFromAxisKm * k; // Earth relative to the shadow axis
    const ey = clampY(cy + off);
    penumbraCone(ctx, art, xm, cy, mr, xe + Rpx, mr + (so.penumbraRadiusAtEarthKm - P.REAL.moonRadius) * (D + Rpx) / D * k);
    drawCone(ctx, art, xm, cy, mr, Math.min(tip, W + 400), "umbra");
    if (tip < xe + Rpx) { // antumbra beyond the tip
      ctx.fillStyle = "rgba(25,25,25,0.35)"; const w2 = (xe + Rpx - tip) * mr / (tip - xm);
      ctx.beginPath(); ctx.moveTo(tip, cy); ctx.lineTo(xe + Rpx, cy - w2); ctx.lineTo(xe + Rpx, cy + w2); ctx.closePath(); ctx.fill();
    }
    earthWithAxis(ctx, art, xe, ey, Rpx, 0, 0, 1.0, STACKED);
    body(ctx, art.moonBare || art.moon, xm, cy, mr);
    lab(ctx, "Moon", xm, cy - mr - 14, T); lab(ctx, "Earth", xe, ey - Rpx - 14, T);
    lab(ctx, so.umbraRadiusAtEarthKm >= 0 ? "umbra" : "umbra ends: antumbra", xm + (Math.min(tip, xe) - xm) * 0.45, cy + 2, T, "#f1f1ec");
    lab(ctx, "penumbra", xm + D * 0.45, cy + mr + (so.penumbraRadiusAtEarthKm - P.REAL.moonRadius) * k * 0.45 + 12, T);
    if (Math.abs(off) > H / 2 - 18) lab(ctx, `Earth is ${P.fmtKm(so.earthOffsetFromAxisKm)} off the shadow line`, xe - Rpx, off > 0 ? H - 30 : 30, T, T.ink, "right");
    lab(ctx, P.SOLAR_LABELS[so.type], 14, 18, T, T.ink, "left", 600);
  } else {
    const lu = snap.ecl.lunar, xe = W * 0.36, xm = W * 0.84, D = xm - xe;
    const mr = P.REAL.moonRadius * k;
    const Lu = P.umbraLength(P.REAL.sunRadius, P.REAL.earthRadius, g.earthSunDistance);
    const tip = xe + D * Lu / g.earthMoonDistance;
    penumbraCone(ctx, art, xe, cy, Rpx, xm + mr * 2, Rpx + (lu.penumbraRadiusAtMoonKm - P.REAL.earthRadius) * (D + mr * 2) / D * k);
    drawCone(ctx, art, xe, cy, Rpx, tip, "umbra");
    const off = Math.sign(snap.moon.lat || 1) * lu.impactParamKm * k;
    const my = clampY(cy - off);
    earthWithAxis(ctx, art, xe, cy, Rpx, 0, 0, 1.0, STACKED);
    body(ctx, art.moonBare || art.moon, xm, my, mr);
    if (lu.type === "total" || lu.type === "partial") { ctx.fillStyle = "rgba(120,40,20,0.35)"; ctx.beginPath(); ctx.arc(xm, my, mr, 0, 7); ctx.fill(); }
    lab(ctx, "Earth", xe, cy - Rpx - 14, T); lab(ctx, "Moon", xm, my - mr - 14, T);
    lab(ctx, "umbra", xe + D * 0.5, cy, T, "#f1f1ec");
    lab(ctx, "penumbra", xe + D * 0.5, cy + (Rpx + (lu.penumbraRadiusAtMoonKm - P.REAL.earthRadius) * 0.5 * k) + 12, T);
    if (Math.abs(off) > H / 2 - 18) lab(ctx, `Moon is ${P.fmtKm(lu.impactParamKm)} off the shadow line`, xm, off > 0 ? 30 : H - 30, T, T.ink, "right");
    lab(ctx, P.LUNAR_LABELS[lu.type], 14, 18, T, T.ink, "left", 600);
  }
  lab(ctx, "Widths to scale; distances squeezed. Sun not to scale.", 14, H - 14, T, T.inkSoft);
}
function lab(ctx, s, x, y, T, color, align = "center", weight = 500) { text(ctx, s, x, y, color || T.ink, 12, align, weight); }

// ---------- sky view (horizon panel, like the mockup) ----------
export function skyProjector(W, H, lat) {
  const horizonY = H * 0.74, top = 26;
  const center = lat >= 0 ? 180 : 0; // face the equator
  return {
    horizonY, top, center,
    x: (az) => { let d = P.norm360(az - center + 180) - 180; return W / 2 + d / 180 * (W / 2 - 10); },
    y: (alt) => horizonY - alt / 90 * (horizonY - top)
  };
}
function drawSky(ctx, W, H, art, T, st, snap) {
  const pj = skyProjector(W, H, st.lat);
  const sunAlt = snap.sunSky.alt;
  const f = Math.max(0, Math.min(1, (sunAlt + 8) / 10));
  ctx.fillStyle = mix(T.night, T.sky, f); ctx.fillRect(0, 0, W, H);
  // altitude guides
  ctx.strokeStyle = "rgba(255,255,255,0.25)"; ctx.lineWidth = 1;
  for (const a of [30, 60]) { const y = pj.y(a); ctx.setLineDash([3, 5]); ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); text(ctx, `${a}\u00b0`, 6, y - 8, "rgba(255,255,255,0.8)", 10); }
  ctx.setLineDash([]);
  // Sun path for the day
  ctx.strokeStyle = T.gold; ctx.lineWidth = 2.2; ctx.beginPath();
  let pen = false, prevX = 0;
  for (let h = 0; h <= 24.001; h += 0.1) {
    const s = P.altAz(st.lat, snap.dec, 15 * (h - 12));
    const x = pj.x(s.az), y = pj.y(s.alt);
    if (s.alt < -1 || (pen && Math.abs(x - prevX) > W / 2)) { pen = false; prevX = x; continue; }
    pen ? ctx.lineTo(x, y) : ctx.moveTo(x, y); pen = true; prevX = x;
  }
  ctx.stroke();
  // Polaris
  if (st.lat > 0) { const x = pj.x(0), y = pj.y(st.lat); if (x > 0 && x < W) { ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(x, y, 2.5, 0, 7); ctx.fill(); text(ctx, "pole star", x + 6, y - 8, "#fff", 10); } }
  // Moon
  const mr = Math.max(9, Math.min(W, H) * 0.035);
  if (snap.moonSky.alt > -2) drawMoonPhase(ctx, art, pj.x(snap.moonSky.az), pj.y(snap.moonSky.alt), mr, snap.theta);
  // Sun
  if (sunAlt > -2) body(ctx, art.sun, pj.x(snap.sunSky.az), pj.y(sunAlt), Math.max(14, Math.min(W, H) * 0.05));
  // ground art, tiled
  const img = art["horizon-scene"];
  if (img.complete && img.naturalWidth) {
    const s = (H - pj.horizonY) / (img.naturalHeight * (1 - A.HORIZON_FRAC));
    const w = img.naturalWidth * s, y0 = pj.horizonY - img.naturalHeight * A.HORIZON_FRAC * s;
    for (let x = -((W / 2) % w) - w / 2; x < W; x += w - 2) ctx.drawImage(img, x, y0, w, img.naturalHeight * s);
    const tint = Math.min(0.7, 0.55 * (1 - f) + (T.dark ? 0.18 : 0));
    if (tint > 0) { ctx.fillStyle = `rgba(10,14,24,${tint})`; ctx.fillRect(0, y0, W, H - y0); }
  }
  // observer
  const ob = art["observer-sprite"];
  if (ob.complete && ob.naturalWidth) { const s = Math.min(1.1, H / 600) * 0.75; const sz = A.SPRITE * s; ctx.drawImage(ob, W * 0.5 - sz * 0.62, pj.horizonY + (H - pj.horizonY) * 0.55 - A.FEET_Y * s, sz, sz); }
  // compass
  for (const [az, l] of [[0, "N"], [90, "E"], [180, "S"], [270, "W"]]) { const x = pj.x(az); if (x > 8 && x < W - 8) { ctx.strokeStyle = "rgba(255,255,255,0.7)"; ctx.beginPath(); ctx.moveTo(x, pj.horizonY - 6); ctx.lineTo(x, pj.horizonY); ctx.stroke(); text(ctx, l, x, pj.horizonY - 14, "#fff", 12, "center", 700); } }
  pill(ctx, `${P.dateParts(snap.t).label} ${P.fmtClock(st.hour)} at ${P.fmtLat(st.lat)}: Sun ${P.fmtNum(sunAlt, 1)}\u00b0 high`, 12, 16, T);
}
function mix(a, b, f) {
  const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const A_ = p(a), B = p(b);
  return `rgb(${A_.map((v, i) => Math.round(v + (B[i] - v) * f)).join(",")})`;
}
/** Moon disk with phase: same lit shape as study-moon.html drawMoonFace
 *  (limb half-circle on the lit side plus a half-ellipse terminator of signed width R cos theta). */
export function drawMoonPhase(ctx, art, cx, cy, R, thetaDeg) {
  const t = P.norm360(thetaDeg), k = P.illuminatedFraction(t);
  ctx.save(); ctx.globalAlpha = 0.22; body(ctx, art.moon, cx, cy, R); ctx.restore();
  if (k < 0.001) return;
  if (k > 0.999) { body(ctx, art.moon, cx, cy, R); return; }
  const waxing = t < 180, side = waxing ? 1 : -1, cosT = Math.cos(t * DEG), tf = waxing ? cosT : -cosT;
  ctx.save(); ctx.beginPath();
  const N = 48;
  for (let i = 0; i <= N; i++) { const a = -Math.PI / 2 + (i / N) * Math.PI; const x = cx + side * R * Math.cos(a), y = cy + R * Math.sin(a); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
  for (let i = 0; i <= N; i++) { const u = 1 - (i / N) * 2; ctx.lineTo(cx + R * tf * Math.sqrt(Math.max(0, 1 - u * u)), cy + R * u); }
  ctx.closePath(); ctx.clip(); body(ctx, art.moon, cx, cy, R); ctx.restore();
}

// ---------- DIAGRAMS (second canvas) ----------
function frame(ctx, W, H, T, title) {
  ctx.fillStyle = T.panel; ctx.fillRect(0, 0, W, H);
  text(ctx, title, 12, 14, T.light, 12, "left", 600);
}
function graph(ctx, box, xr, yr, T, opts = {}) {
  const { l, t, w, h } = box;
  ctx.strokeStyle = T.grid; ctx.lineWidth = 1; ctx.strokeRect(l, t, w, h);
  const X = (v) => l + (v - xr[0]) / (xr[1] - xr[0]) * w, Y = (v) => t + h - (v - yr[0]) / (yr[1] - yr[0]) * h;
  for (const v of opts.yTicks || []) { ctx.strokeStyle = T.grid; ctx.beginPath(); ctx.moveTo(l, Y(v)); ctx.lineTo(l + w, Y(v)); ctx.stroke(); text(ctx, opts.yFmt ? opts.yFmt(v) : String(v), l - 4, Y(v), T.dim, 10, "right"); }
  if (opts.months) { const ab = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"]; for (let m = 0; m < 12; m++) text(ctx, ab[m], X(P.dayOfYear(m, 15)), t + h + 10, T.dim, 10, "center"); }
  return { X, Y };
}
function line(ctx, pts, color, w = 1.8) { ctx.strokeStyle = color; ctx.lineWidth = w; ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke(); }
function cursorX(ctx, x, box, T) { ctx.strokeStyle = T.gold; ctx.lineWidth = 1.2; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(x, box.t); ctx.lineTo(x, box.t + box.h); ctx.stroke(); ctx.setLineDash([]); }

export function drawDiagram(ctx, W, H, art, T, st, snap, cache) {
  const m = st.mode, box = { l: 46, t: 30, w: W - 60, h: H - 54 };
  RIM = null;
  if (m === "sandbox") { RIM = null; return drawSky(ctx, W, H, art, T, st, snap); }
  if (m === "seasons") {
    frame(ctx, W, H, T, "Side view at noon: Sun to the left");
    const r = Math.min(H * 0.3, W * 0.17);
    const g = sideEarth(ctx, art, T, W * 0.58, H * 0.55, r, st, snap);
    text(ctx, `you, ${P.fmtLat(st.lat)}`, g.ox - 12, g.oy - 12, T.light, 11, "right");
    text(ctx, "dashed: equator, gold tropics, gray polar circles", 12, H - 12, T.dim, 10);
    return;
  }
  if (m === "sunlight") {
    frame(ctx, W, H, T, `24 h average sunlight at ${P.fmtLat(st.lat)} through the year (W/m\u00b2, top of the air)`);
    const pts = [], mx = 600; const gr = graph(ctx, box, [0, 365], [0, mx], T, { yTicks: [0, 200, 400, 600], months: true });
    for (let d = 0; d < 365; d += 2) { const s = P.sunAt(d + 0.5); pts.push([gr.X(d), gr.Y(Math.min(mx, P.dailyInsolation(st.lat, P.declination(s.lon, st.tilt), s.R)))]); }
    line(ctx, pts, T.gold); cursorX(ctx, gr.X(st.date), box, T);
    return;
  }
  if (m === "daylight") {
    frame(ctx, W, H, T, `Daylight at ${P.fmtLat(st.lat)} through the year`);
    const gr = graph(ctx, box, [0, 365], [0, 24], T, { yTicks: [0, 6, 12, 18, 24], yFmt: (v) => v + " h", months: true });
    const pts = []; for (let d = 0; d < 365; d += 1) pts.push([gr.X(d), gr.Y(P.dayLength(st.lat, P.declination(P.sunAt(d + 0.5).lon, st.tilt)))]);
    line(ctx, pts, T.gold); cursorX(ctx, gr.X(st.date), box, T);
    return;
  }
  if (m === "eclipses") return drawEclipseView(ctx, W, H, art, T, st, snap);
  if (m === "nodes") {
    frame(ctx, W, H, T, "2026: Sun's distance from a node, with every new and full Moon");
    const key = `syz${st.incl}`;
    if (!cache.syz || cache.syz.key !== key) cache.syz = { key, list: P.syzygies(0, 365, { inclinationDeg: st.incl }) };
    const lim = P.eclipseLimits(st.incl);
    const gr = graph(ctx, box, [0, 365], [0, 90], T, { yTicks: [0, 30, 60, 90], yFmt: (v) => v + "\u00b0", months: true });
    ctx.fillStyle = "rgba(226,178,63,0.18)"; ctx.fillRect(box.l, gr.Y(Math.min(90, lim.solar)), box.w, gr.Y(0) - gr.Y(Math.min(90, lim.solar)));
    ctx.fillStyle = "rgba(226,178,63,0.22)"; ctx.fillRect(box.l, gr.Y(Math.min(90, lim.lunarUmbral)), box.w, gr.Y(0) - gr.Y(Math.min(90, lim.lunarUmbral)));
    const pts = []; for (let d = 0; d <= 365; d += 1) pts.push([gr.X(d), gr.Y(P.sunNodeAngle(d))]); line(ctx, pts, T.light, 1.4);
    for (const s of cache.syz.list) {
      const x = gr.X(s.t), y = gr.Y(s.sunNode), hit = s.type !== "none";
      ctx.beginPath(); ctx.arc(x, y, hit ? 5 : 3, 0, 7);
      if (s.kind === "new") { ctx.fillStyle = hit ? T.ink : T.panel; ctx.fill(); ctx.strokeStyle = hit ? T.gold : T.dim; ctx.lineWidth = 1.5; ctx.stroke(); }
      else { ctx.fillStyle = hit ? T.gold : T.dim; ctx.fill(); }
    }
    cursorX(ctx, gr.X(snap.t), box, T);
    text(ctx, "band: eclipse possible. Hollow dot new Moon, filled dot full Moon, big dot eclipse.", 12, H - 8, T.dim, 10);
    return;
  }
  if (m === "precession") {
    frame(ctx, W, H, T, "The axis sweeps a cone, like a spinning top (side view)");
    const cx = W / 2, cy = H * 0.56, r = Math.min(H * 0.28, W * 0.18);
    const psi = P.precessionAngle(st.year) * DEG;
    const ax = { x: Math.sin(st.tilt * DEG) * Math.cos(psi), y: Math.sin(st.tilt * DEG) * Math.sin(psi), z: Math.cos(st.tilt * DEG) };
    const cam = makeCam(0, 12, 1, 0, 0);
    const rot = screenAngle(cam, { x: 0, y: 0, z: 0 }, ax);
    // cone rim
    ctx.strokeStyle = T.gold; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.2; ctx.beginPath();
    for (let i = 0; i <= 72; i++) { const a = i * 5 * DEG; const v = { x: Math.sin(st.tilt * DEG) * Math.cos(a), y: Math.sin(st.tilt * DEG) * Math.sin(a), z: Math.cos(st.tilt * DEG) }; const p = cam(v); const X = cx + p.x * r * 1.55, Y = cy + p.y * r * 1.55; i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }
    ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = T.dim; ctx.beginPath(); ctx.moveTo(cx, cy - r * 1.8); ctx.lineTo(cx, cy + r * 1.3); ctx.stroke();
    text(ctx, "perpendicular to Earth's orbit", cx + 6, cy - r * 1.8, T.dim, 10);
    earthWithAxis(ctx, art, cx, cy, r, rot, 0, 1.5);
    return;
  }
  if (m === "sky") {
    frame(ctx, W, H, T, "Height in the sky over the day (solar time)");
    const gr = graph(ctx, box, [0, 24], [-90, 90], T, { yTicks: [-90, -45, 0, 45, 90], yFmt: (v) => v + "\u00b0" });
    for (let h = 0; h <= 24; h += 6) text(ctx, P.fmtClock(h % 24 === 0 && h ? 23.999 : h).replace("23:59", "24:00"), gr.X(h), box.t + box.h + 10, T.dim, 10, "center");
    const ps = [], pm = [];
    for (let h = 0; h <= 24.001; h += 0.25) {
      const s = P.snapshot({ ...st, hour: h, date: st.date });
      ps.push([gr.X(h), gr.Y(s.sunSky.alt)]); pm.push([gr.X(h), gr.Y(s.moonSky.alt)]);
    }
    ctx.strokeStyle = T.grid; ctx.beginPath(); ctx.moveTo(box.l, gr.Y(0)); ctx.lineTo(box.l + box.w, gr.Y(0)); ctx.stroke();
    line(ctx, ps, T.gold); line(ctx, pm, T.light, 1.3);
    cursorX(ctx, gr.X(st.hour), box, T);
    text(ctx, "gold: Sun, white: Moon, line at 0\u00b0: horizon", 12, H - 8, T.dim, 10);
  }
}

function drawEclipseView(ctx, W, H, art, T, st, snap) {
  const solar = snap.theta < 90 || snap.theta > 270, g = snap.ecl.g;
  const cx = W / 2, cy = H / 2 + 8;
  if (solar) {
    frame(ctx, W, H, T, "View from the best spot on Earth");
    const so = snap.ecl.solar;
    const sunA = Math.asin(P.REAL.sunRadius / g.earthSunDistance);
    const dObs = g.earthMoonDistance - P.REAL.earthRadius;
    const moonA = Math.asin(P.REAL.moonRadius / dObs);
    const s = Math.max(0, so.earthOffsetFromAxisKm - P.REAL.earthRadius);
    const sep = s / dObs;
    const px = Math.min(H, W) * 0.28 / sunA;
    body(ctx, art.sunBare || art.sun, cx, cy, sunA * px);
    const dx = Math.min(W, sep * px);
    if (so.deltaFromAxisDeg < 90) { ctx.fillStyle = "#11141c"; ctx.beginPath(); ctx.arc(cx + dx * 0.0 + dx, cy + 0, moonA * px, 0, 7); ctx.fill(); }
    text(ctx, `Moon looks ${P.fmtNum(moonA / sunA * 100, 0)}% as wide as the Sun`, 12, H - 10, T.dim, 10);
  } else {
    frame(ctx, W, H, T, "Earth's shadow at the Moon's distance");
    const lu = snap.ecl.lunar, sc = Math.min(H, W) * 0.36 / lu.penumbraRadiusAtMoonKm;
    ctx.fillStyle = "rgba(110,110,110,0.55)"; ctx.beginPath(); ctx.arc(cx, cy, lu.penumbraRadiusAtMoonKm * sc, 0, 7); ctx.fill();
    ctx.fillStyle = "rgba(25,25,25,0.88)"; ctx.beginPath(); ctx.arc(cx, cy, lu.umbraRadiusAtMoonKm * sc, 0, 7); ctx.fill();
    const off = Math.min(W, lu.impactParamKm * sc) * (snap.moon.lat >= 0 ? -1 : 1);
    if (lu.deltaFromAntiSunDeg < 90) {
      body(ctx, art.moonBare || art.moon, cx, cy + off, P.REAL.moonRadius * sc);
      if (lu.type === "total" || lu.type === "partial") { ctx.fillStyle = "rgba(120,40,20,0.35)"; ctx.beginPath(); ctx.arc(cx, cy + off, P.REAL.moonRadius * sc, 0, 7); ctx.fill(); }
    }
    text(ctx, "dark: umbra, gray: penumbra, to scale", 12, H - 10, T.dim, 10);
  }
}
