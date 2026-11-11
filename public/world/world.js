import * as THREE from "../vendor/three/three.module.min.js";
import { GLTFLoader } from "../vendor/three/GLTFLoader.js";

const RAD = Math.PI / 180;
const CELL = 31.25;
const COLS = 1024;
const ROWS = 768;
const EXAG = 2.9;
const HERO = { px: 218, py: 509, eye: 48, pathT: 0.5 };
const BASE_M = 100;
const JASPER = { lat: 38.3914, lon: -86.9311 };
const REDUCE = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

const qs = new URLSearchParams(location.search);
const dbgSky = qs.get("sky");
const dbgWx = qs.get("wx");
const dbgSeason = qs.get("season");
const dbgAt = qs.get("at");
const SHOW_HUD = qs.get("hud") === "1" || qs.get("debug") === "1";

function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function lerp(a, b, t) { return a + (b - a) * t; }
function lerp3(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }
function hexRgb(h) {
  h = h.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function rgbCss(c, a) {
  return "rgba(" + (c[0] | 0) + "," + (c[1] | 0) + "," + (c[2] | 0) + "," + (a == null ? 1 : a) + ")";
}
function mulberry(seed) {
  let s = seed | 0 || 1;
  return function () {
    s = s + 0x6D2B79F5 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/* ---------- time, season, weather ---------- */
function parseTime() {
  if (dbgAt) {
    const t = Date.parse(dbgAt);
    if (!isNaN(t)) return t;
  }
  return Date.now();
}

function seasonOf(t) {
  if (dbgSeason === "spring" || dbgSeason === "summer" || dbgSeason === "autumn" || dbgSeason === "fall" || dbgSeason === "winter") {
    return dbgSeason === "fall" ? "autumn" : dbgSeason;
  }
  const m = new Date(t).getMonth();
  if (m >= 2 && m <= 4) return "spring";
  if (m >= 5 && m <= 7) return "summer";
  if (m >= 8 && m <= 10) return "autumn";
  return "winter";
}

/* ---------- astronomy, same method as login-sky.js ---------- */
function jd2000(t) { return t / 86400000 - 10957.5; }
function lst(d, lon) { return (280.46061837 + 360.98564736629 * d + lon) % 360; }
function altAz(raDeg, decDeg, d, lat, lon) {
  const H = (lst(d, lon) - raDeg) * RAD, de = decDeg * RAD, la = lat * RAD;
  const alt = Math.asin(Math.sin(de) * Math.sin(la) + Math.cos(de) * Math.cos(la) * Math.cos(H));
  const az = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(la) - Math.tan(de) * Math.cos(la));
  return [alt / RAD, az];
}
function sunRaDec(d) {
  const M = (357.5291 + 0.98560028 * d) * RAD;
  const C = (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M)) * RAD;
  const L = M + C + Math.PI + 102.9372 * RAD, e = 23.4397 * RAD;
  return [Math.atan2(Math.sin(L) * Math.cos(e), Math.cos(L)) / RAD, Math.asin(Math.sin(e) * Math.sin(L)) / RAD];
}
function moonRaDec(d) {
  const L = (218.316 + 13.176396 * d) * RAD, M = (134.963 + 13.064993 * d) * RAD, F = (93.272 + 13.22935 * d) * RAD;
  const l = L + 6.289 * RAD * Math.sin(M), b = 5.128 * RAD * Math.sin(F), e = 23.4397 * RAD;
  return [Math.atan2(Math.sin(l) * Math.cos(e) - Math.tan(b) * Math.sin(e), Math.cos(l)) / RAD,
    Math.asin(Math.sin(b) * Math.cos(e) + Math.cos(b) * Math.sin(e) * Math.sin(l)) / RAD];
}
function moonPhase(t) {
  const syn = 29.530588853, p = ((t - Date.UTC(2000, 0, 6, 18, 14)) / 864e5 / syn) % 1;
  return p < 0 ? p + 1 : p;
}
function sunAltAz(t, loc) {
  const d = jd2000(t), s = sunRaDec(d);
  return altAz(s[0], s[1], d, loc.lat, loc.lon);
}
function moonAltAz(t, loc) {
  const d = jd2000(t), m = moonRaDec(d);
  return altAz(m[0], m[1], d, loc.lat, loc.lon);
}

/* az from south, westward. World: +X east, +Y up, +Z north. */
function altAzDir(altDeg, azRad) {
  const alt = altDeg * RAD;
  const ca = Math.cos(alt), sa = Math.sin(alt);
  return new THREE.Vector3(-Math.sin(azRad) * ca, sa, -Math.cos(azRad) * ca);
}

const CONSTELL = {
  orion: { s: [[5.919, 7.41, .5], [5.418, 6.35, 1.6], [5.679, -1.94, 1.7], [5.603, -1.2, 1.7], [5.533, -.3, 2.2], [5.796, -9.67, 2.1], [5.242, -8.2, .1], [5.588, 9.93, 3.4]], l: [[0, 2], [1, 4], [2, 3], [3, 4], [2, 5], [4, 6], [0, 1], [0, 7], [1, 7]] },
  dipper: { s: [[11.062, 61.75, 1.8], [11.031, 56.38, 2.4], [11.897, 53.69, 2.4], [12.257, 57.03, 3.3], [12.9, 55.96, 1.8], [13.399, 54.93, 2.2], [13.792, 49.31, 1.9]], l: [[0, 1], [1, 2], [2, 3], [3, 0], [3, 4], [4, 5], [5, 6]] },
  cassiopeia: { s: [[.153, 59.15, 2.3], [.675, 56.54, 2.2], [.945, 60.72, 2.4], [1.43, 60.24, 2.7], [1.907, 63.67, 3.4]], l: [[0, 1], [1, 2], [2, 3], [3, 4]] },
  cygnus: { s: [[20.69, 45.28, 1.3], [20.37, 40.26, 2.2], [19.51, 27.96, 3.1], [20.77, 33.97, 2.5], [19.75, 45.13, 2.9]], l: [[0, 1], [1, 2], [3, 1], [1, 4]] },
  polaris: { s: [[2.53, 89.26, 2]], l: [] }
};
const FIELD = [];
(function () {
  const r = mulberry(7);
  for (let i = 0; i < 420; i++) FIELD.push([r() * 24, Math.asin(r() * 2 - 1) / RAD, 3.4 + r() * 2.6]);
})();

const SKY = [
  [-18, [6, 10, 28], [12, 18, 44], [22, 28, 62]],
  [-9, [16, 20, 56], [48, 40, 96], [120, 70, 110]],
  [-3, [40, 52, 112], [150, 96, 150], [255, 128, 96]],
  [2, [70, 110, 180], [230, 150, 170], [255, 170, 100]],
  [8, [96, 156, 226], [170, 200, 236], [255, 214, 170]],
  [25, [70, 140, 230], [140, 190, 245], [210, 230, 252]],
  [90, [50, 120, 220], [120, 175, 240], [196, 222, 250]]
];
const WXCLOUD = { clear: 0, partly: .45, cloudy: .9, fog: .6, rain: .85, storm: 1, snow: .8 };

function skyColors(alt, wxKind) {
  let i = 0;
  while (i < SKY.length - 2 && SKY[i + 1][0] <= alt) i++;
  const A = SKY[i], B = SKY[i + 1];
  let t = clamp((alt - A[0]) / (B[0] - A[0]), 0, 1);
  t = t * t * (3 - 2 * t);
  const c = [lerp3(A[1], B[1], t), lerp3(A[2], B[2], t), lerp3(A[3], B[3], t)];
  // Day uses the hazy r4 landscape gradient (muted zenith, cream-white horizon),
  // not the bright mid-blue the raw login-sky table makes in this upward camera.
  if (alt >= 8) {
    const r4 = [[168, 186, 200], [232, 222, 206], [240, 230, 210]];
    const haze = clamp((alt - 8) / 18, 0, 1);
    for (let k = 0; k < 3; k++) c[k] = lerp3(c[k], r4[k], haze * 0.88);
  }
  const gray = WXCLOUD[wxKind] * (wxKind === "partly" ? .25 : .7);
  const dim = wxKind === "storm" ? .45 : wxKind === "rain" ? .25 : 0;
  for (let k = 0; k < 3; k++) {
    const l = (c[k][0] + c[k][1] + c[k][2]) / 3;
    c[k] = lerp3(c[k], [l, l, l + 6], gray);
    c[k] = lerp3(c[k], [20, 22, 30], dim);
  }
  return c;
}

function periodFromAlt(alt, rising) {
  if (alt < -6) return "night";
  if (alt < 8) return rising ? "dawn" : "dusk";
  return "day";
}

function forcedSunAlt(period) {
  return { dawn: 1.5, day: 42, dusk: 1.5, night: -30 }[period];
}

/* ---------- season skins (Leo) ---------- */
const SKINS = {
  spring: {
    field: hexRgb("#B9C98A"), wheat: hexRgb("#B9C98A"), plowed: hexRgb("#A9A07A"),
    grass: hexRgb("#9DBA6E"), forest: hexRgb("#7FA866"), forestB: hexRgb("#5E8A4A"),
    cedar: hexRgb("#3E5A45"), water: hexRgb("#6F8F92"), hatch: 5, row: 1.0, bend: 0.45
  },
  summer: {
    field: hexRgb("#8FA85C"), wheat: hexRgb("#D9B45A"), plowed: hexRgb("#8FA85C"),
    grass: hexRgb("#6F9A52"), forest: hexRgb("#2F5D46"), forestB: hexRgb("#4E7D57"),
    cedar: hexRgb("#2A4A38"), water: hexRgb("#5E8A86"), hatch: 4, row: 1.25, bend: 0.6
  },
  autumn: {
    field: hexRgb("#C9A66B"), wheat: hexRgb("#C9A66B"), plowed: hexRgb("#A8874F"),
    grass: hexRgb("#B49A5E"), forest: hexRgb("#D9A441"), forestB: hexRgb("#B5562E"),
    cedar: hexRgb("#3E5A45"), water: hexRgb("#5C7477"), hatch: 4.5, row: 1.0, bend: 0.0
  },
  winter: {
    field: hexRgb("#DCD6C6"), wheat: hexRgb("#DCD6C6"), plowed: hexRgb("#DCD6C6"),
    grass: hexRgb("#C8C0A8"), forest: hexRgb("#C4BBA8"), forestB: hexRgb("#8A8070"),
    cedar: hexRgb("#3E5A45"), water: hexRgb("#8A9A9C"), hatch: 7, row: 0.75, bend: 0.0
  }
};
const PAPER = hexRgb("#EDE6D6");
const INK = hexRgb("#2A2118");
const INK_NIGHT = hexRgb("#EDE6D6");
const NIGHT_MUL = hexRgb("#2B3550");
const RIM = hexRgb("#D9A441");
const WINDOW = hexRgb("#F2C46B");
const SNOW = hexRgb("#F4F1EA");

const loc = { lat: JASPER.lat, lon: JASPER.lon, src: "jasper" };
const wx = { kind: dbgWx || "clear", src: dbgWx ? "debug" : "default" };

const clock = {
  now: parseTime(),
  season: "autumn",
  period: "day",
  alt: 30,
  rising: true,
  sunAz: 0,
  moonAlt: -10,
  moonAz: 0,
  phase: 0.5,
  night: 0,
  twi: 0,
  month: 10
};

function refreshClock(now) {
  clock.now = now;
  const d = new Date(now);
  clock.month = d.getMonth() + 1;
  clock.season = seasonOf(now);
  const sa = sunAltAz(now, loc);
  let alt = sa[0], rising = sunAltAz(now + 6e5, loc)[0] > alt, sunAz = sa[1];
  if (dbgSky && forcedSunAlt(dbgSky) != null) {
    alt = forcedSunAlt(dbgSky);
    rising = dbgSky === "dawn";
    sunAz = (rising ? -1.75 : 1.75) * (dbgSky === "day" ? .25 : 1);
  }
  clock.alt = alt;
  clock.rising = rising;
  clock.sunAz = sunAz;
  const mo = moonAltAz(now, loc);
  clock.moonAlt = mo[0];
  clock.moonAz = mo[1];
  clock.phase = moonPhase(now);
  clock.night = clamp((-alt - 4) / 10, 0, 1);
  clock.twi = clamp(1 - Math.abs(alt - 1) / 9, 0, 1);
  clock.period = dbgSky && forcedSunAlt(dbgSky) != null ? dbgSky : periodFromAlt(alt, rising);
}

refreshClock(parseTime());

function wmo(c) {
  if (c <= 1) return "clear";
  if (c === 2) return "partly";
  if (c === 3) return "cloudy";
  if (c === 45 || c === 48) return "fog";
  if ((c >= 51 && c <= 67) || (c >= 80 && c <= 82)) return "rain";
  if ((c >= 71 && c <= 77) || c === 85 || c === 86) return "snow";
  if (c >= 95) return "storm";
  return "clear";
}

function fetchWx() {
  if (dbgWx || !window.fetch) return;
  const u = "https://api.open-meteo.com/v1/forecast?latitude=" + loc.lat.toFixed(3) +
    "&longitude=" + loc.lon.toFixed(3) + "&current=weather_code,cloud_cover,temperature_2m";
  const ctl = window.AbortController ? new AbortController() : null;
  if (ctl) setTimeout(function () { ctl.abort(); }, 6000);
  fetch(u, ctl ? { signal: ctl.signal } : {}).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
    if (!j || !j.current) return;
    wx.kind = wmo(j.current.weather_code | 0);
    wx.src = "open-meteo";
    wx.temp = j.current.temperature_2m;
    if (window.__world) window.__world._applyWx && window.__world._applyWx();
  }).catch(function () {});
}

/* ---------- map data ---------- */
let heightData, coverData, meta, path = [];
let riverPathPx = [];
let heightF32; // meters, length COLS*ROWS

function pxIndex(px, py) {
  const x = clamp(px, 0, COLS - 1);
  const y = clamp(py, 0, ROWS - 1);
  return (y | 0) * COLS + (x | 0);
}
function heightPx(px, py) {
  const x0 = Math.floor(px), y0 = Math.floor(py);
  const x1 = Math.min(COLS - 1, x0 + 1), y1 = Math.min(ROWS - 1, y0 + 1);
  const tx = px - x0, ty = py - y0;
  const h00 = heightF32[y0 * COLS + clamp(x0, 0, COLS - 1)];
  const h10 = heightF32[y0 * COLS + x1];
  const h01 = heightF32[y1 * COLS + clamp(x0, 0, COLS - 1)];
  const h11 = heightF32[y1 * COLS + x1];
  return lerp(lerp(h00, h10, tx), lerp(h01, h11, tx), ty);
}
function coverPx(px, py) {
  const x = clamp(Math.round(px), 0, COLS - 1);
  const y = clamp(Math.round(py), 0, ROWS - 1);
  return coverData[y * COLS + x];
}
function worldToPx(x, z) {
  return { px: x / CELL + (COLS - 1) / 2, py: (ROWS - 1) / 2 - z / CELL };
}
function pxToWorld(px, py) {
  return { x: (px - (COLS - 1) / 2) * CELL, z: ((ROWS - 1) / 2 - py) * CELL };
}
function heightWorld(x, z) {
  const p = worldToPx(x, z);
  if (p.px < 0 || p.py < 0 || p.px > COLS - 1 || p.py > ROWS - 1) return heightPx(clamp(p.px, 0, COLS - 1), clamp(p.py, 0, ROWS - 1));
  return heightPx(p.px, p.py);
}
function coverWorld(x, z) {
  const p = worldToPx(x, z);
  return coverPx(p.px, p.py);
}
function yOf(hm) { return hm * EXAG; }

async function loadImageData(url) {
  const img = new Image();
  img.src = url;
  await img.decode();
  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  const g = c.getContext("2d", { willReadFrequently: true });
  g.drawImage(img, 0, 0);
  return g.getImageData(0, 0, img.width, img.height);
}

async function loadMap() {
  const [hImg, cImg, m] = await Promise.all([
    loadImageData("./data/height.png"),
    loadImageData("./data/cover.png"),
    fetch("./data/meta.json").then(function (r) { return r.json(); })
  ]);
  meta = m;
  const n = COLS * ROWS;
  heightF32 = new Float32Array(n);
  coverData = new Uint8Array(n);
  const hd = hImg.data, cd = cImg.data;
  for (let i = 0; i < n; i++) {
    heightF32[i] = (hd[i * 4] * 256 + hd[i * 4 + 1]) / 10 + BASE_M;
    coverData[i] = cd[i * 4];
  }
  riverPathPx = meta.river_path_px || [];
  carvePatoka();
  buildRidgePath();
}

function carvePatoka() {
  const pts = riverPathPx;
  if (!pts.length) return;
  const channel = 4.4;
  const bank = 6.8;
  const best = new Float32Array(ROWS * COLS);
  for (let i = 0; i < best.length; i++) best[i] = 1e9;
  for (let i = 0; i < pts.length - 1; i++) {
    const ax = pts[i][0], ay = pts[i][1], bx = pts[i + 1][0], by = pts[i + 1][1];
    const vx = bx - ax, vy = by - ay;
    const len2 = vx * vx + vy * vy || 1;
    const x0 = Math.max(0, Math.floor(Math.min(ax, bx) - bank - 1));
    const x1 = Math.min(COLS - 1, Math.ceil(Math.max(ax, bx) + bank + 1));
    const y0 = Math.max(0, Math.floor(Math.min(ay, by) - bank - 1));
    const y1 = Math.min(ROWS - 1, Math.ceil(Math.max(ay, by) + bank + 1));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        let u = ((x - ax) * vx + (y - ay) * vy) / len2;
        if (u < 0) u = 0; else if (u > 1) u = 1;
        const dx = x - (ax + vx * u), dy = y - (ay + vy * u);
        const d2 = dx * dx + dy * dy;
        const idx = y * COLS + x;
        if (d2 < best[idx]) best[idx] = d2;
      }
    }
  }
  for (let i = 0; i < best.length; i++) {
    if (best[i] > bank * bank) continue;
    const d = Math.sqrt(best[i]);
    const t = 1 - d / bank;
    heightF32[i] -= t * t * 16.0;
    if (d < channel) coverData[i] = 0;
  }
}

function buildRidgePath() {
  const church = (meta.landmarks && meta.landmarks.jasper_st_joseph) || [174.3, 444.6];
  const hw = pxToWorld(HERO.px, HERO.py);
  const cw = pxToWorld(church[0], church[1]);
  const lx = cw.x - hw.x, lz = cw.z - hw.z;
  const len = Math.hypot(lx, lz) || 1;
  const ux = lx / len, uz = lz / len;
  const rx = uz, rz = -ux;
  path = [];
  for (let t = -1800; t <= 1800; t += 60) {
    let x = hw.x + rx * t, z = hw.z + rz * t;
    let bestH = heightWorld(x, z), bx = x, bz = z;
    for (let s = -90; s <= 40; s += 20) {
      const xx = x + ux * s, zz = z + uz * s;
      const hh = heightWorld(xx, zz);
      if (hh > bestH) { bestH = hh; bx = xx; bz = zz; }
    }
    const p = worldToPx(bx, bz);
    path.push({ px: p.px, py: p.py, x: bx, z: bz, h: bestH, lookX: ux, lookZ: uz });
  }
  let acc = 0;
  path[0].s = 0;
  for (let i = 1; i < path.length; i++) {
    const dx = path[i].x - path[i - 1].x, dz = path[i].z - path[i - 1].z;
    acc += Math.hypot(dx, dz);
    path[i].s = acc;
  }
  path.len = acc;
}

function pathSample(s) {
  const L = path.len;
  let t = s;
  if (t < 0) t = 0;
  if (t > L) t = L;
  let i = 0;
  while (i < path.length - 2 && path[i + 1].s < t) i++;
  const a = path[i], b = path[i + 1];
  const span = Math.max(1e-3, b.s - a.s);
  const u = clamp((t - a.s) / span, 0, 1);
  const x = lerp(a.x, b.x, u), z = lerp(a.z, b.z, u);
  const hx = b.x - a.x, hz = b.z - a.z;
  const heading = Math.atan2(hx, hz);
  const lookX = (a.lookX != null && b.lookX != null) ? lerp(a.lookX, b.lookX, u) : Math.sin(heading);
  const lookZ = (a.lookZ != null && b.lookZ != null) ? lerp(a.lookZ, b.lookZ, u) : Math.cos(heading);
  return { x, z, heading, h: heightWorld(x, z), u: t / L, i, f: u, lookX: lookX, lookZ: lookZ };
}

const NOISE_GLSL = /* glsl */`
float hash21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise21(vec2 p){
  vec2 i = floor(p), f = fract(p);
  f = f*f*(3.0-2.0*f);
  return mix(mix(hash21(i), hash21(i+vec2(1.0,0.0)), f.x),
             mix(hash21(i+vec2(0.0,1.0)), hash21(i+vec2(1.0,1.0)), f.x), f.y);
}
`;


const TERRAIN_VERT = /* glsl */`
varying vec3 vWorld;
varying vec3 vN;
varying vec2 vUv;
uniform sampler2D uHeight;
uniform vec2 uSize;
uniform float uExag;
uniform float uCell;
float heightM(vec2 uv){
  vec4 tex = texture2D(uHeight, uv);
  return (tex.r * 255.0 * 256.0 + tex.g * 255.0) / 10.0 + 100.0;
}
void main(){
  vUv = uv;
  vec3 p = position;
  float dx = uCell, dz = uCell;
  vec2 ts = 1.0 / uSize;
  float hl = heightM(uv + vec2(-ts.x, 0.0));
  float hr = heightM(uv + vec2( ts.x, 0.0));
  float hd = heightM(uv + vec2(0.0,  ts.y));
  float hu = heightM(uv + vec2(0.0, -ts.y));
  vec3 n = normalize(vec3((hl - hr) * uExag, 2.0 * dx, (hd - hu) * uExag));
  vN = n;
  vec4 wp = modelMatrix * vec4(p, 1.0);
  vWorld = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const TERRAIN_FRAG = /* glsl */`
uniform vec3 uPaper, uInk, uInkUse, uNightMul, uRim, uSnowCol;
uniform vec3 uField, uWheat, uPlowed, uGrass, uForest, uForestB, uCedar, uWater;
uniform vec3 uSunDir, uMoonDir, uSkyH, uSkyM, uSkyT;
uniform float uNight, uTwi, uRising, uSnow, uFog, uTime, uHatch, uRow, uBend, uSeason;
uniform float uDawnMist, uMonth, uLightning;
uniform vec3 uCursor;
uniform sampler2D uCover;
uniform sampler2D uHeight;
uniform vec2 uSize;
varying vec3 vWorld;
varying vec3 vN;
varying vec2 vUv;
${NOISE_GLSL}
float coverAt(vec2 uv){
  float r = texture2D(uCover, uv).r;
  return floor(r * 255.0 + 0.5);
}
float coverClass(){
  return coverAt(vUv);
}
float heightM(vec2 uv){
  vec4 tex = texture2D(uHeight, uv);
  return (tex.r * 255.0 * 256.0 + tex.g * 255.0) / 10.0 + 100.0;
}
float poster(float v, float steps, float n){
  return floor(v * steps + n * 0.35 + 0.5) / steps;
}
void main(){
  float cls = coverClass();
  float h = heightM(vUv);
  vec3 N = normalize(vN);
  vec3 V = normalize(cameraPosition - vWorld);
  vec3 L = normalize(mix(uMoonDir, uSunDir, 1.0 - uNight));
  if (L.y < 0.02) L = normalize(vec3(L.x, 0.02, L.z));
  float ndl = clamp(dot(N, L), 0.0, 1.0);
  vec2 wz = vWorld.xz;
  float n1 = noise21(wz * 0.018);
  float n2 = noise21(wz * 0.07 + 17.0);
  float n3 = noise21(wz * 0.32);
  float n4 = noise21(wz * 1.1 + 4.0);

  // ruled field rectangles, slightly warped, alternating row direction
  vec2 plotUv = wz / 150.0;
  plotUv += vec2(noise21(plotUv * 0.35) - 0.5, noise21(plotUv * 0.35 + 8.0) - 0.5) * 0.18;
  vec2 plot = floor(plotUv);
  vec2 pf = fract(plotUv);
  float pid = hash21(plot);
  float isWheat = 0.0;
  if (uSeason > 0.5 && uSeason < 1.5 && uMonth >= 6.0 && uMonth <= 7.0) isWheat = step(0.55, pid);
  float isPlow = 0.0;
  if (uSeason > 1.5 && uSeason < 2.5) isPlow = step(0.48, pid);
  vec3 cropCol = mix(uField, uWheat, isWheat);
  cropCol = mix(cropCol, uPlowed, isPlow);
  vec3 sage = vec3(0.561, 0.604, 0.435);
  vec3 stubbleG = vec3(0.784, 0.612, 0.333);
  if (uSeason > 1.5 && uSeason < 2.5) {
    float varp = hash21(plot + 5.3);
    if (varp < 0.28) cropCol = stubbleG;
    else if (varp > 0.78) cropCol = mix(cropCol, sage, 0.55);
    else cropCol = mix(cropCol, uPlowed, 0.15 * varp);
  } else {
    cropCol = mix(cropCol, uGrass, 0.12 * (pid - 0.5));
  }
  vec3 grassCol = mix(uGrass, uField, 0.18 * (hash21(plot + 3.1) - 0.4));
  if (uSeason > 1.5 && uSeason < 2.5) grassCol = mix(grassCol, sage, 0.35 * step(0.5, hash21(plot + 2.2)));

  // woodland wash at a large scale, never high-frequency camouflage
  vec3 bareForest = mix(uForest, uForestB, smoothstep(0.2, 0.8, n1));
  if (uSeason > 1.5 && uSeason < 2.5) {
    float m = noise21(wz * 0.0075);
    float m2 = noise21(wz * 0.013 + 5.0);
    vec3 amber = vec3(0.851, 0.643, 0.255);
    vec3 rust = vec3(0.710, 0.337, 0.180);
    vec3 ochre = vec3(0.541, 0.392, 0.125);
    vec3 bare = mix(uPaper, vec3(0.70, 0.64, 0.50), 0.45);
    bareForest = mix(amber, ochre, smoothstep(0.25, 0.75, m));
    bareForest = mix(bareForest, rust, smoothstep(0.72, 0.92, m2) * 0.55);
    bareForest = mix(bareForest, bare, smoothstep(0.82, 0.97, m) * 0.35);
  }

  // hard class, no neighbor averaging (that read as camouflage blobs)
  vec3 wash = grassCol;
  if (cls < 0.5) wash = uWater;
  else if (cls < 1.5) wash = mix(grassCol, vec3(0.62, 0.58, 0.48), 0.4);
  else if (cls < 2.5) wash = mix(vec3(0.55, 0.45, 0.38), uPaper, 0.2 + 0.15 * n3);
  else if (cls < 3.5) wash = mix(vec3(0.64, 0.54, 0.40), uPaper, 0.2);
  else if (cls < 4.5) wash = bareForest;
  else if (cls < 5.5) wash = uCedar;
  else if (cls < 6.5) wash = grassCol;
  else if (cls < 7.5) wash = cropCol;
  else wash = mix(grassCol, uWater, 0.28 + 0.15 * n1);

  if (uSnow > 0.5 && cls > 0.5) {
    float hold = cls > 3.5 && cls < 6.5 ? 0.55 : 0.88;
    wash = mix(wash, uSnowCol, hold * (0.85 + 0.15 * n3));
  }

  // cream paper first, then watercolor wash. Water and near fields keep more pigment.
  float coverAmt = 0.62 + 0.08 * n2;
  if (cls < 0.5) coverAmt = 0.88;
  if (cls > 3.5 && cls < 6.5) coverAmt = 0.70;
  vec3 col = mix(uPaper, wash, coverAmt);
  vec3 post = vec3(poster(col.r, 7.0, n3), poster(col.g, 7.0, n3 * 0.8), poster(col.b, 7.0, n2));
  col = mix(col, post, 0.22);
  col += (n4 - 0.5) * 0.016;

  col *= mix(vec3(1.0), uNightMul * 1.15, uNight * 0.92);
  col *= mix(0.72, 1.04, ndl);
  col += uRim * uTwi * pow(clamp(dot(N, uSunDir), 0.0, 1.0), 4.0) * 0.55;

  float dist = length(vWorld - cameraPosition);
  // Five receding layers. Mid-distance and back are wash only (no patchwork).
  float layer = smoothstep(700.0, 7200.0, dist);
  float nearL = 1.0 - smoothstep(200.0, 1400.0, dist);
  float midL = smoothstep(900.0, 2000.0, dist) * (1.0 - smoothstep(2800.0, 4600.0, dist));
  float backL = smoothstep(3800.0, 5600.0, dist);
  // Drop camouflage patchwork past the near band: flatten to a single wash
  if (dist > 1100.0) {
    vec3 farWash = mix(uPaper, wash, 0.42);
    col = mix(col, farWash, smoothstep(1100.0, 2000.0, dist));
  }

  // Fields only on slopes that face the camera, ruled furrows in the near band
  float facing = clamp(dot(N, V), 0.0, 1.0);
  float slopeFace = facing * smoothstep(0.15, 0.55, 1.0 - N.y);
  if (cls > 5.5 && cls < 7.6 && uSnow < 0.5 && dist < 1700.0 && (facing > 0.32 || slopeFace > 0.08)) {
    float ang = pid > 0.5 ? 0.0 : 1.5708;
    if (pid > 0.82) ang = 0.65;
    float row = dot(wz, vec2(cos(ang), sin(ang)));
    float sp = mix(4.6, 6.2, pid);
    float g = abs(fract(row / sp) - 0.5);
    float inkA = (0.18 + 0.42 * nearL) * uRow * smoothstep(0.28, 0.55, facing);
    if (uSeason > 1.5 && uSeason < 2.5) inkA *= 0.95;
    if (uSeason > 2.5) inkA *= 0.5;
    if (cls < 6.5) inkA *= 0.55;
    col = mix(col, vec3(0.165, 0.129, 0.094), (1.0 - smoothstep(0.0, 0.16, g)) * inkA);
    float edge = min(min(pf.x, 1.0 - pf.x), min(pf.y, 1.0 - pf.y));
    col = mix(col, vec3(0.165, 0.129, 0.094), (1.0 - smoothstep(0.0, 0.028, edge)) * 0.35 * nearL);
  }

  vec2 ts = 1.0 / uSize;
  float nCls = max(coverAt(vUv + vec2(ts.x, 0.0)), max(coverAt(vUv + vec2(-ts.x, 0.0)), max(coverAt(vUv + vec2(0.0, ts.y)), coverAt(vUv + vec2(0.0, -ts.y)))));
  float forestHere = step(3.5, cls) * step(cls, 5.5);
  float forestN = step(3.5, nCls) * step(nCls, 5.5);
  if (forestHere < 0.5 && forestN > 0.5 && cls > 0.5 && dist < 2800.0) {
    col = mix(col, vec3(0.165, 0.129, 0.094), 0.28 * (1.0 - backL));
  }

  // River: one unbroken ribbon, cream glints, engraved ripple lines, never patches
  if (cls < 0.5) {
    vec3 river = vec3(0.40, 0.50, 0.52);
    col = mix(uPaper, river, 0.72);
    float rip = sin(wz.x * 0.22 + wz.y * 0.31 + uTime * 0.35) * 0.5 + sin(wz.x * 0.09 - wz.y * 0.14) * 0.5;
    float line = abs(fract((wz.x * 0.07 + wz.y * 0.09) + rip * 0.10) - 0.5);
    col = mix(col, vec3(0.165, 0.129, 0.094), (1.0 - smoothstep(0.0, 0.08, line)) * mix(0.50, 0.12, layer));
    float line2 = abs(fract((wz.x * 0.045 - wz.y * 0.06) * 1.15 + 0.3) - 0.5);
    col = mix(col, vec3(0.165, 0.129, 0.094), (1.0 - smoothstep(0.0, 0.09, line2)) * 0.14 * nearL);
    // cream glints along the ribbon
    vec3 R = reflect(-L, vec3(0.0, 1.0, 0.0));
    float spec = pow(clamp(dot(R, V), 0.0, 1.0), 40.0);
    col = mix(col, vec3(0.96, 0.92, 0.82), clamp(spec * 0.55 + (n4 - 0.35) * 0.08, 0.0, 0.45));
    if (nCls > 0.5) col = mix(col, vec3(0.165, 0.129, 0.094), 0.35 * (1.0 - layer));
  }

  // ink contours every 10 m, heavy every 50 m, with line wobble
  float hw = h + (n3 - 0.5) * 0.85 + (n4 - 0.5) * 0.3;
  float c10 = abs(fract(hw / 10.0) - 0.5);
  float fw = fwidth(hw / 10.0) + 0.001;
  float l10 = 1.0 - smoothstep(0.0, fw * 1.05, c10);
  float c50 = abs(fract(hw / 50.0) - 0.5);
  float fw5 = fwidth(hw / 50.0) + 0.001;
  float l50 = 1.0 - smoothstep(0.0, fw5 * 0.8, c50);
  float contour = max(l10 * 0.38, l50 * 0.78);
  if (cls < 0.5) contour *= 0.12;
  col = mix(col, uInkUse, contour);

  // hatching on shaded slopes; denser on the shadow side
  float hatchAmt = clamp((0.48 - ndl) / 0.48, 0.0, 1.0) * (1.0 - uSnow * 0.6);
  hatchAmt *= 0.55 + 0.45 * clamp(1.0 - N.y, 0.0, 1.0);
  if (cls > 0.5 && hatchAmt > 0.02) {
    vec2 fc = gl_FragCoord.xy + vec2(n3 * 2.4, n4 * 1.6);
    float spc = uHatch;
    float h45 = abs(fract(dot(fc, vec2(0.707, 0.707)) / spc) - 0.5);
    float hat = 1.0 - smoothstep(0.0, 0.16, h45);
    if ((uSeason > 1.5 && uSeason < 2.5 && uTwi > 0.3) || ndl < 0.18) {
      float h135 = abs(fract(dot(fc, vec2(-0.707, 0.707)) / (spc * 1.15)) - 0.5);
      hat = max(hat, (1.0 - smoothstep(0.0, 0.16, h135)) * 0.7);
    }
    col = mix(col, uInkUse, hat * hatchAmt * 0.30);
  }

  // paper grain
  col *= 0.96 + 0.08 * noise21(wz * 0.55);
  col += (n3 - 0.5) * 0.025;

  float graze = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 1.6);
  // Inked ridge crests. Front heaviest in #2A2118; each layer behind thinner and paler.
  vec2 fwd = normalize(vWorld.xz - cameraPosition.xz);
  vec2 duv = vec2(fwd.x / ((uSize.x - 1.0) * 31.25), -fwd.y / ((uSize.y - 1.0) * 31.25));
  float hF = heightM(clamp(vUv + duv * 3.0, 0.0, 1.0));
  float hB = heightM(clamp(vUv - duv * 3.0, 0.0, 1.0));
  float peak = h - max(hF, hB);
  float crest = smoothstep(0.25, 1.6, peak + (n3 - 0.5) * 0.35);
  float ridge = max(graze * smoothstep(0.10, 0.48, 1.0 - N.y), crest);
  vec3 inkFront = vec3(0.165, 0.129, 0.094);
  vec3 inkBack = vec3(0.55, 0.60, 0.64);
  vec3 inkCol = mix(inkFront, inkBack, layer);
  float ridgeAmt = ridge * mix(0.92, 0.22, layer) * (1.0 - uSnow * 0.5);

  // Back ridges: pale blue-gray silhouettes, no detail, inked tops only
  float air = smoothstep(1600.0, 9000.0, dist);
  vec3 airC = mix(uPaper, vec3(0.94, 0.88, 0.76), 0.28);
  airC = mix(airC, vec3(0.72, 0.76, 0.80), backL * 0.85);
  airC = mix(airC, uSkyH, 0.15 + 0.25 * uNight);
  col = mix(col, airC, air * mix(0.45, 0.82, backL));
  if (backL > 0.4) {
    col = mix(col, vec3(0.70, 0.75, 0.78), (backL - 0.4) * 0.7);
  }
  col = mix(col, inkCol, ridgeAmt);

  if (uDawnMist > 0.01) {
    float valley = clamp((165.0 - h) / 40.0, 0.0, 1.0);
    float mist = uDawnMist * valley * smoothstep(60.0, 700.0, dist) * exp(-dist * 0.0007) * 0.28;
    col = mix(col, uPaper * mix(1.0, 0.45, uNight), mist);
  }

  float fogH = mix(0.0, 0.00022, uFog);
  float valleyF = mix(1.0, 1.8, clamp((160.0 - h) / 50.0, 0.0, 1.0) * uFog);
  float fog = 1.0 - exp(-dist * fogH * valleyF);
  vec3 fogC = mix(uSkyH, uPaper, 0.35 + 0.3 * uFog);
  fogC = mix(fogC, uNightMul * 0.85, uNight * 0.7);
  col = mix(col, fogC, clamp(fog, 0.0, 0.75));

  col += uLightning * 0.45 * vec3(0.85, 0.9, 1.0);

  // Re-assert the river after aerial fade so it stays one unbroken blue ribbon
  if (cls < 0.5) {
    vec3 river = vec3(0.38, 0.50, 0.55);
    vec3 rib = mix(uPaper, river, 0.82);
    float rip = sin(wz.x * 0.22 + wz.y * 0.31 + uTime * 0.35) * 0.5 + sin(wz.x * 0.09 - wz.y * 0.14) * 0.5;
    float line = abs(fract((wz.x * 0.07 + wz.y * 0.09) + rip * 0.10) - 0.5);
    rib = mix(rib, vec3(0.165, 0.129, 0.094), (1.0 - smoothstep(0.0, 0.08, line)) * 0.42);
    float spec = pow(clamp(dot(reflect(-L, vec3(0.0, 1.0, 0.0)), V), 0.0, 1.0), 28.0);
    rib = mix(rib, vec3(0.97, 0.93, 0.82), clamp(spec * 0.7 + (n4 - 0.3) * 0.1, 0.0, 0.5));
    col = mix(rib, col, 0.12 * layer);
  }

  gl_FragColor = vec4(col, 1.0);
}
`;

const SKY_VERT = /* glsl */`
varying vec3 vDir;
void main(){
  vec4 cp = modelViewMatrix * vec4(position, 1.0);
  vDir = normalize((modelMatrix * vec4(position, 1.0)).xyz);
  gl_Position = projectionMatrix * cp;
  gl_Position.z = gl_Position.w;
}
`;

const SKY_FRAG = /* glsl */`
uniform vec3 uTop, uMid, uHor;
uniform vec3 uSunDir, uMoonDir;
uniform float uNight, uTwi, uSunSize, uMilky, uSeed;
varying vec3 vDir;
${NOISE_GLSL}
void main(){
  vec3 d = normalize(vDir);
  float h = d.y;
  vec3 paper = vec3(0.929, 0.902, 0.839);
  vec3 col;
  if (uNight < 0.45) {
    // Warm cream haze at the horizon, pale blue-gray at the top, light stipple.
    float zen = smoothstep(0.12, 0.72, h);
    float horB = 1.0 - smoothstep(0.0, 0.22, h);
    col = mix(uHor, uMid, 0.35);
    col = mix(col, uTop, zen * 0.85);
    col = mix(col, uHor, horB * 0.9);
    vec3 cream = vec3(0.96, 0.90, 0.78);
    col = mix(col, cream, horB * 0.45 * (1.0 - uNight));
    // light paper stipple
    float stip = hash21(gl_FragCoord.xy * 0.9 + uSeed);
    float grain = noise21(gl_FragCoord.xy * 0.22);
    col *= 0.985 + 0.03 * grain;
    col += (stip - 0.5) * 0.018;
    // Engraved cumulus: hatch only, no fill, no outline, paper shows through.
    // Unique per seed. Flatten into thin streaks toward the horizon.
    if (h > 0.03 && h < 0.58) {
      float az = atan(d.x, d.z);
      // Flatten only near the horizon so mid-sky stays as puffs, not full-width streaks.
      float flatten = mix(3.4, 1.15, smoothstep(0.06, 0.28, h));
      vec2 cuv = vec2(az * (2.4 * flatten), h * (9.0 / max(0.5, flatten * 0.35))) + vec2(uSeed * 0.19, uSeed * 0.07);
      float n = noise21(cuv);
      n = n * 0.55 + 0.45 * noise21(cuv * 2.05 + 8.4);
      float band = smoothstep(0.04, 0.11, h) * (1.0 - smoothstep(0.32, 0.52, h));
      float body = smoothstep(0.56, 0.72, n) * band;
      // undersides of each puff are denser
      float under = smoothstep(0.78, 0.64, n);
      float dens = mix(0.25, 1.0, under);
      float wob = noise21(vec2(az * 10.0, h * 22.0) + uSeed);
      float hatch = 1.0 - smoothstep(0.0, 0.22, abs(fract(gl_FragCoord.y / 3.0 + wob * 0.4) - 0.5));
      // edge of the puff fades so hatches do not run as long bars
      float edge = smoothstep(0.62, 0.70, n) * (1.0 - smoothstep(0.86, 0.96, n));
      vec3 inkC = mix(vec3(0.165, 0.129, 0.094), col, 0.2 + 0.5 * horB);
      col = mix(col, inkC, body * dens * hatch * edge * 0.58);
    }
  } else {
    if (h > 0.42) col = mix(uMid, uTop, clamp((h - 0.42) / 0.58, 0.0, 1.0));
    else if (h > 0.0) col = mix(uHor, uMid, pow(h / 0.42, 0.75));
    else col = mix(uHor, uHor * 0.75, clamp(-h * 2.0, 0.0, 1.0));
  }
  float sun = pow(clamp(dot(d, normalize(uSunDir)), 0.0, 1.0), 520.0);
  float glow = pow(clamp(dot(d, normalize(uSunDir)), 0.0, 1.0), 22.0);
  if (uSunDir.y > -0.08) {
    float sunAmt = (1.0 - uNight) * mix(0.25, 1.0, uTwi);
    col += vec3(1.0, 0.93, 0.78) * sun * 0.55 * sunAmt;
    col += vec3(1.0, 0.82, 0.55) * glow * 0.12 * sunAmt;
  }
  if (uMilky > 0.01 && uNight > 0.4) {
    vec3 mw = normalize(vec3(0.35, 0.15, 0.9));
    float band = 1.0 - abs(dot(d, mw));
    col += vec3(0.7, 0.72, 0.9) * smoothstep(0.15, 0.0, 1.0 - band) * 0.18 * uMilky * uNight;
  }
  // paper grain, screen space
  float g = noise21(gl_FragCoord.xy * 0.28);
  float fleck = hash21(gl_FragCoord.xy * 0.81 + 19.0);
  float fiber = noise21(gl_FragCoord.xy * vec2(0.07, 0.9));
  col *= 0.97 + 0.05 * g;
  col += (fleck - 0.5) * 0.016 + (fiber - 0.5) * 0.012;
  gl_FragColor = vec4(col, 1.0);
}
`;

const SPRITE_VERT = /* glsl */`
attribute vec2 iScale;
attribute float iFrame;
attribute float iFrameClump;
attribute float iPhase;
attribute float iKind;
uniform float uTime;
uniform vec3 uCursor;
uniform float uWind;
uniform float uRuffle;
uniform float uReduce;
uniform float uLodNear;
uniform float uLodMid;
varying vec2 vUv;
varying float vFrame;
varying float vKind;
varying float vShade;
varying float vLod;
void main(){
  vUv = uv;
  vKind = iKind;
  vec3 iPos = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  float dist = length(cameraPosition - iPos);
  float lod = dist < uLodNear ? 0.0 : (dist < uLodMid ? 1.0 : 2.0);
  vLod = lod;
  vFrame = lod < 0.5 ? iFrame : iFrameClump;
  if (lod > 1.5) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    return;
  }
  vec3 camR = normalize(vec3(cameraPosition.z - iPos.z, 0.0, iPos.x - cameraPosition.x));
  if (length(camR) < 0.001) camR = vec3(1.0, 0.0, 0.0);
  vec3 camU = vec3(0.0, 1.0, 0.0);
  float wind = sin(uTime * (1.1 + iPhase) + iPos.x * 0.03) * 0.08 * uWind * (1.0 - uReduce);
  float d = length(iPos.xz - uCursor.xz);
  float infl = exp(-d * d / (140.0 * 140.0)) * uCursor.y * uRuffle;
  float tilt = (wind + infl * sin(uTime * 18.0 + iPhase * 6.28) * 0.35) * uv.y;
  float close = smoothstep(40.0, 200.0, dist);
  float sx = iScale.x * (lod < 0.5 ? 1.0 : 1.18) * mix(0.5, 1.0, close);
  float sy = iScale.y * (lod < 0.5 ? 1.0 : 1.06) * mix(0.5, 1.0, close);
  // plant the trunk in the ground a little so billboards do not float on slopes
  iPos.y -= 1.8;
  // cap near-tree screen height; front-ridge crowns may break the ridgeline into the sky
  vec4 c0 = projectionMatrix * viewMatrix * vec4(iPos, 1.0);
  vec4 c1 = projectionMatrix * viewMatrix * vec4(iPos + camU * sy, 1.0);
  float ndcH = abs(c1.y / max(0.001, c1.w) - c0.y / max(0.001, c0.w));
  if (ndcH > 0.30) {
    float cap = 0.30 / ndcH;
    sx *= cap;
    sy *= cap;
  }
  vec3 p = iPos + camR * ((position.x + tilt) * sx) + camU * (position.y * sy);
  vShade = 0.86 + 0.14 * sin(iPhase * 20.0);
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}
`;

const TREE_FRAG = /* glsl */`
uniform sampler2D uAtlas;
uniform vec3 uInkUse;
uniform float uNight, uLightning;
uniform vec2 uAtlasGrid;
varying vec2 vUv;
varying float vFrame;
varying float vKind;
varying float vShade;
varying float vLod;
void main(){
  if (vLod > 1.5) discard;
  float cols = uAtlasGrid.x;
  float ix = floor(vFrame + 0.5);
  vec2 cell = vec2(mod(ix, cols), floor(ix / cols));
  vec2 uv = (vUv * 0.90 + 0.05 + cell) / uAtlasGrid;
  vec4 s = texture2D(uAtlas, uv);
  if (s.a < 0.16) discard;
  vec3 col = s.rgb * vShade;
  col = mix(col, uInkUse, 0.08 * (1.0 - uNight));
  col += uLightning * 0.3;
  gl_FragColor = vec4(col, s.a);
}
`;

const GRASS_VERT = /* glsl */`
attribute vec2 iScale;
attribute float iPhase;
attribute float iKind;
attribute vec2 iLean;
uniform float uTime;
uniform vec3 uCursor;
uniform float uWind;
uniform float uReduce;
uniform float uLodNear;
uniform float uLodMid;
varying float vKind;
varying float vY;
varying float vX;
varying float vLod;
void main(){
  vKind = iKind;
  vY = uv.y;
  vX = uv.x;
  vec3 iPos = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  float dist = length(cameraPosition - iPos);
  // kind 0,1,2 = full blades (near only); kind 3 = mid clump
  float wantMid = step(2.5, iKind);
  float lod = dist < uLodNear ? 0.0 : (dist < uLodMid ? 1.0 : 2.0);
  vLod = lod;
  if (wantMid < 0.5 && lod > 0.5) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    return;
  }
  if (wantMid > 0.5 && (lod < 0.5 || lod > 1.5)) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    return;
  }
  float d = length(iPos.xz - uCursor.xz);
  vec2 away = iPos.xz - uCursor.xz;
  if (length(away) < 0.001) away = vec2(1.0, 0.0);
  away = normalize(away);
  float infl = exp(-d * d / (90.0 * 90.0)) * uCursor.y;
  float wind = sin(uTime * 1.6 + iPhase * 6.28 + iPos.x * 0.08) * 0.14 * uWind;
  float bend = (wind + infl * 0.7 + iLean.x) * (1.0 - uReduce) * uv.y * uv.y;
  vec3 camR = normalize(vec3(cameraPosition.z - iPos.z, 0.0, iPos.x - cameraPosition.x));
  if (length(camR) < 0.001) camR = vec3(1.0, 0.0, 0.0);
  vec3 p = iPos;
  p.xz += (away * bend + iLean * uv.y) * iScale.y * 0.55;
  p += camR * (position.x * iScale.x);
  p.y += position.y * iScale.y * (1.0 - infl * 0.15);
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}
`;

const GRASS_FRAG = /* glsl */`
uniform vec3 uGrass, uWheat, uInkUse, uCorn;
varying float vKind;
varying float vY;
varying float vX;
varying float vLod;
void main(){
  if (vLod > 1.5) discard;
  vec3 col = uGrass;
  if (vKind > 0.5 && vKind < 1.5) col = uWheat;
  else if (vKind > 1.5 && vKind < 2.5) col = uCorn;
  // wash body, ink outline along the blade edge and base
  float edge = min(vX, 1.0 - vX);
  float inkA = (1.0 - smoothstep(0.0, 0.16, edge)) * 0.55 + (1.0 - vY) * 0.18;
  col = mix(col, uInkUse, inkA);
  col = mix(col, uInkUse, 0.12 * (1.0 - vY));
  gl_FragColor = vec4(col, 0.93);
}
`;

const MOON_VERT = /* glsl */`
varying vec3 vN;
varying vec3 vPos;
void main(){
  vN = normalize(normalMatrix * normal);
  vPos = (modelMatrix * vec4(position, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const MOON_FRAG = /* glsl */`
uniform vec3 uSunDir;
varying vec3 vN;
varying vec3 vPos;
${NOISE_GLSL}
void main(){
  vec3 N = normalize(vN);
  float lit = clamp(dot(N, normalize(uSunDir)), 0.0, 1.0);
  float crat = noise21(N.xy * 6.0 + N.z * 3.0);
  vec3 dark = vec3(0.12, 0.13, 0.18);
  vec3 light = vec3(0.96, 0.94, 0.85) * (0.92 + 0.08 * crat);
  vec3 col = mix(dark, light, smoothstep(0.02, 0.22, lit));
  gl_FragColor = vec4(col, 1.0);
}
`;



const BUILDING_VERT = /* glsl */`
varying vec3 vN;
varying vec3 vWorld;
void main(){
  vec3 objectNormal = normal;
#ifdef USE_INSTANCING
  vec4 mw = modelMatrix * instanceMatrix * vec4(position, 1.0);
  vN = normalize(mat3(modelMatrix * instanceMatrix) * objectNormal);
#else
  vec4 mw = modelMatrix * vec4(position, 1.0);
  vN = normalize(normalMatrix * objectNormal);
#endif
  vWorld = mw.xyz;
  gl_Position = projectionMatrix * viewMatrix * mw;
}
`;

const BUILDING_FRAG = /* glsl */`
uniform vec3 uWash, uInkUse, uPaper, uNightMul;
uniform float uNight;
varying vec3 vN;
varying vec3 vWorld;
${NOISE_GLSL}
void main(){
  vec3 N = normalize(vN);
  vec3 V = normalize(cameraPosition - vWorld);
  float ndv = abs(dot(N, V));
  float rim = pow(1.0 - ndv, 2.4);
  vec3 wash = mix(uPaper, uWash, 0.68);
  float g = noise21(vWorld.xz * 0.35 + vWorld.y * 0.25);
  wash *= 0.96 + 0.07 * g;
  wash = mix(wash, uNightMul * 1.05, uNight * 0.55);
  vec3 col = mix(wash, uInkUse, clamp(rim * 0.92, 0.0, 0.8));
  gl_FragColor = vec4(col, 1.0);
}
`;

const WINDOW_FRAG = /* glsl */`
uniform vec3 uGlow, uInkUse;
uniform float uNight;
varying vec3 vN;
varying vec3 vWorld;
void main(){
  vec3 N = normalize(vN);
  vec3 V = normalize(cameraPosition - vWorld);
  float rim = pow(1.0 - abs(dot(N, V)), 2.6);
  vec3 dark = vec3(0.12, 0.10, 0.08);
  vec3 col = mix(dark, uGlow, clamp(uNight, 0.0, 1.0));
  col = mix(col, uInkUse, rim * 0.7);
  gl_FragColor = vec4(col, 1.0);
}
`;

/* ---------- renderer and camera ---------- */
const canvas = document.getElementById("world");
const wxCanvas = document.getElementById("wx");
const hudEl = document.getElementById("hud");
const whenEl = document.getElementById("when");
const captionEl = document.getElementById("caption");
const body = document.body;

let renderer, scene, camera, glOk = true;
try {
  renderer = new THREE.WebGLRenderer({
    canvas, antialias: true, alpha: false, powerPreference: "high-performance",
    stencil: false, depth: true
  });
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.setClearColor(0x070B14, 1);
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
} catch (err) {
  glOk = false;
}

scene = new THREE.Scene();
camera = new THREE.PerspectiveCamera(50, 2, 2, 48000);
camera.rotation.order = "YXZ";

const skyGroup = new THREE.Group();
scene.add(skyGroup);

const state = {
  frozen: REDUCE || qs.get("freeze") === "1",
  ready: false,
  frameMs: [],
  lastT: 0,
  time: 0,
  lightning: 0,
  wind: 1
};

const cursor = {
  x: 0, z: 0, strength: 0,
  sx: 0, sy: 0,
  tx: 0, tz: 0, ts: 0,
  vx: 0, vz: 0, vs: 0,
  active: false
};

const rig = {
  s: 0,
  headingOff: 0,
  side: 0,
  eye: 48,
  dragging: false,
  lastX: 0, lastY: 0,
  yawVel: 0
};

function targetHorizon() {
  const aspect = camera.aspect;
  // Desktop: geometric horizon ~76% down, leaving room for front-ridge crowns.
  // Phone: about 75% down (Dimitry). Highest land pixel target 65-80%.
  if (aspect < 0.7) return 0.75;
  if (aspect < 1.1) return 0.75;
  return 0.76;
}

function applyFovAndPitch() {
  const aspect = Math.max(0.3, canvas.clientWidth / Math.max(1, canvas.clientHeight));
  camera.aspect = aspect;
  const hor = targetHorizon();
  camera.fov = aspect < 0.7 ? 58 : aspect < 1.1 ? 54 : 48;
  camera.updateProjectionMatrix();
  const half = camera.fov * RAD * 0.5;
  const phi = Math.atan(Math.tan(half) * (2 * hor - 1));
  return { horizon: hor, pitch: phi };
}

function resize() {
  const w = Math.max(1, window.innerWidth), h = Math.max(1, window.innerHeight);
  if (renderer && glOk) {
    renderer.setSize(w, h, false);
    canvas.width = Math.floor(w * renderer.getPixelRatio());
    canvas.height = Math.floor(h * renderer.getPixelRatio());
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
  }
  if (wxCanvas) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    wxCanvas.width = Math.floor(w * dpr);
    wxCanvas.height = Math.floor(h * dpr);
    wxCanvas.style.width = w + "px";
    wxCanvas.style.height = h + "px";
  }
  if (camera) applyFovAndPitch();
}

window.addEventListener("resize", resize);

function colU(rgb) { return new THREE.Color(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255); }

function makeHeightTex() {
  const data = new Uint8Array(COLS * ROWS * 4);
  for (let i = 0; i < COLS * ROWS; i++) {
    const dm = Math.max(0, Math.min(65535, Math.round((heightF32[i] - BASE_M) * 10)));
    data[i * 4] = (dm >> 8) & 255;
    data[i * 4 + 1] = dm & 255;
    data[i * 4 + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, COLS, ROWS, THREE.RGBAFormat, THREE.UnsignedByteType);
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.flipY = false;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  tex.colorSpace = THREE.NoColorSpace;
  return tex;
}
function makeCoverTex() {
  const data = new Uint8Array(COLS * ROWS * 4);
  for (let i = 0; i < COLS * ROWS; i++) {
    data[i * 4] = coverData[i];
    data[i * 4 + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, COLS, ROWS, THREE.RGBAFormat, THREE.UnsignedByteType);
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.flipY = false;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  tex.colorSpace = THREE.NoColorSpace;
  return tex;
}

let terrainMat, skyMat, treeMat, grassMat, moonMat, heightTex, coverTex;
let terrainMesh, treeMesh, grassMesh, hayMesh, windowPts, firePts, cloudMesh;
let starPts, constLines, moonMesh, sunState = {};
let churchMesh, labelMesh, landmarkGroup;
const washMats = [];
const windowMats = [];
const LAND = { church: 0, farmhouse: 0, barn: 0, silo: 0, hay: 0, fromGltf: {} };

function terrainUniforms() {
  return {
    uHeight: { value: heightTex },
    uCover: { value: coverTex },
    uSize: { value: new THREE.Vector2(COLS, ROWS) },
    uExag: { value: EXAG },
    uCell: { value: CELL },
    uPaper: { value: colU(PAPER) },
    uInk: { value: colU(INK) },
    uInkUse: { value: colU(INK) },
    uNightMul: { value: colU(NIGHT_MUL) },
    uRim: { value: colU(RIM) },
    uSnowCol: { value: colU(SNOW) },
    uField: { value: colU(SKINS.autumn.field) },
    uWheat: { value: colU(SKINS.autumn.wheat) },
    uPlowed: { value: colU(SKINS.autumn.plowed) },
    uGrass: { value: colU(SKINS.autumn.grass) },
    uForest: { value: colU(SKINS.autumn.forest) },
    uForestB: { value: colU(SKINS.autumn.forestB) },
    uCedar: { value: colU(SKINS.autumn.cedar) },
    uWater: { value: colU(SKINS.autumn.water) },
    uSunDir: { value: new THREE.Vector3(0.3, 0.8, 0.2) },
    uMoonDir: { value: new THREE.Vector3(0.2, 0.5, 0.4) },
    uSkyH: { value: new THREE.Color() },
    uSkyM: { value: new THREE.Color() },
    uSkyT: { value: new THREE.Color() },
    uNight: { value: 0 },
    uTwi: { value: 0 },
    uRising: { value: 1 },
    uSnow: { value: 0 },
    uFog: { value: 0 },
    uTime: { value: 0 },
    uHatch: { value: 4.5 },
    uRow: { value: 1 },
    uBend: { value: 0 },
    uSeason: { value: 2 },
    uDawnMist: { value: 0 },
    uMonth: { value: 10 },
    uLightning: { value: 0 },
    uCursor: { value: new THREE.Vector3() }
  };
}

function buildTerrain() {
  const wSeg = 320, dSeg = 240;
  const geo = new THREE.BufferGeometry();
  const verts = (wSeg + 1) * (dSeg + 1);
  const pos = new Float32Array(verts * 3);
  const uv = new Float32Array(verts * 2);
  let v = 0, u = 0;
  for (let j = 0; j <= dSeg; j++) {
    const py = (1 - j / dSeg) * (ROWS - 1);
    const z = ((ROWS - 1) / 2 - py) * CELL;
    for (let i = 0; i <= wSeg; i++) {
      const px = (i / wSeg) * (COLS - 1);
      const x = (px - (COLS - 1) / 2) * CELL;
      let h = heightPx(px, py);
      pos[v++] = x;
      pos[v++] = yOf(h);
      pos[v++] = z;
      uv[u++] = px / (COLS - 1);
      uv[u++] = py / (ROWS - 1);
    }
  }
  const idx = new Uint32Array(wSeg * dSeg * 6);
  let t = 0;
  for (let j = 0; j < dSeg; j++) {
    for (let i = 0; i < wSeg; i++) {
      const a = j * (wSeg + 1) + i;
      const b = a + 1;
      const c = a + (wSeg + 1);
      const d = c + 1;
      idx[t++] = a; idx[t++] = c; idx[t++] = b;
      idx[t++] = b; idx[t++] = c; idx[t++] = d;
    }
  }
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  geo.computeVertexNormals();
  terrainMat = new THREE.ShaderMaterial({
    uniforms: terrainUniforms(),
    vertexShader: TERRAIN_VERT,
    fragmentShader: TERRAIN_FRAG
  });
  terrainMesh = new THREE.Mesh(geo, terrainMat);
  terrainMesh.frustumCulled = false;
  scene.add(terrainMesh);
}

function buildSky() {
  skyMat = new THREE.ShaderMaterial({
    uniforms: {
      uSeed: { value: 19.0 },
      uTop: { value: new THREE.Color() },
      uMid: { value: new THREE.Color() },
      uHor: { value: new THREE.Color() },
      uSunDir: { value: new THREE.Vector3() },
      uMoonDir: { value: new THREE.Vector3() },
      uNight: { value: 0 },
      uTwi: { value: 0 },
      uSunSize: { value: 1 },
      uMilky: { value: 0 }
    },
    vertexShader: SKY_VERT,
    fragmentShader: SKY_FRAG,
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: false
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(9000, 32, 20), skyMat);
  dome.frustumCulled = false;
  dome.renderOrder = -100;
  skyGroup.renderOrder = -100;
  skyGroup.add(dome);

  const starPos = new Float32Array((FIELD.length + 30) * 3);
  const starCol = new Float32Array((FIELD.length + 30) * 3);
  const starSize = new Float32Array(FIELD.length + 30);
  starPts = new THREE.Points(
    new THREE.BufferGeometry(),
    new THREE.PointsMaterial({ size: 2.2, vertexColors: true, transparent: true, depthWrite: false, depthTest: true, sizeAttenuation: false })
  );
  starPts.geometry.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
  starPts.geometry.setAttribute("color", new THREE.BufferAttribute(starCol, 3));
  starPts.renderOrder = -50;
  skyGroup.add(starPts);

  constLines = new THREE.LineSegments(
    new THREE.BufferGeometry(),
    new THREE.LineBasicMaterial({ color: 0xd6cbb4, transparent: true, opacity: 0.45, depthWrite: false, depthTest: true })
  );
  constLines.renderOrder = -50;
  skyGroup.add(constLines);

  moonMat = new THREE.ShaderMaterial({
    uniforms: { uSunDir: { value: new THREE.Vector3(1, 0, 0) } },
    vertexShader: MOON_VERT,
    fragmentShader: MOON_FRAG,
    depthWrite: false,
    depthTest: true
  });
  moonMesh = new THREE.Mesh(new THREE.SphereGeometry(90, 28, 20), moonMat);
  moonMesh.renderOrder = -50;
  skyGroup.add(moonMesh);
}

function placeStars() {
  const d = jd2000(clock.now);
  const R = 8800;
  const pos = starPts.geometry.attributes.position.array;
  const col = starPts.geometry.attributes.color.array;
  let n = 0;
  function addStar(rah, dec, mag, isNamed) {
    const ra = rah * 15;
    const aa = altAz(ra, dec, d, loc.lat, loc.lon);
    if (aa[0] < -2) return;
    const dir = altAzDir(aa[0], aa[1]);
    pos[n * 3] = dir.x * R;
    pos[n * 3 + 1] = dir.y * R;
    pos[n * 3 + 2] = dir.z * R;
    const b = clamp(1.1 - mag * 0.18, 0.25, 1);
    col[n * 3] = b;
    col[n * 3 + 1] = b;
    col[n * 3 + 2] = Math.min(1, b + 0.08);
    n++;
  }
  FIELD.forEach(function (s) { addStar(s[0], s[1], s[2], false); });
  Object.keys(CONSTELL).forEach(function (k) {
    CONSTELL[k].s.forEach(function (s) { addStar(s[0], s[1], s[2], true); });
  });
  starPts.geometry.setDrawRange(0, n);
  starPts.geometry.attributes.position.needsUpdate = true;
  starPts.geometry.attributes.color.needsUpdate = true;

  const linePos = [];
  Object.keys(CONSTELL).forEach(function (k) {
    const C = CONSTELL[k];
    const dirs = C.s.map(function (s) {
      const aa = altAz(s[0] * 15, s[1], d, loc.lat, loc.lon);
      if (aa[0] < -2) return null;
      return altAzDir(aa[0], aa[1]).multiplyScalar(R);
    });
    C.l.forEach(function (e) {
      if (dirs[e[0]] && dirs[e[1]]) {
        linePos.push(dirs[e[0]].x, dirs[e[0]].y, dirs[e[0]].z, dirs[e[1]].x, dirs[e[1]].y, dirs[e[1]].z);
      }
    });
  });
  constLines.geometry.setAttribute("position", new THREE.Float32BufferAttribute(linePos, 3));
}

function makeCloudSprite() {
  const cv = document.createElement("canvas");
  cv.width = 512; cv.height = 256;
  const g = cv.getContext("2d");
  const rng = mulberry(19);
  g.clearRect(0, 0, 512, 256);
  // One tight cumulus (login-sky lobe layout, extra overlap), inked union outline, wash + hatch.
  const base = [
    [90, 120, 70], [150, 96, 86], [215, 108, 76],
    [258, 124, 60], [180, 136, 72], [120, 138, 62],
    [200, 86, 54], [230, 92, 50], [165, 88, 48]
  ];
  const sc = 1.28;
  const circles = base.map(function (b) {
    return {
      x: 256 + (b[0] - 174) * sc,
      y: 142 + (b[1] - 118) * sc,
      r: b[2] * sc
    };
  });
  function fillUnion(list) {
    g.fillStyle = "rgba(236, 224, 200, 0.94)";
    list.forEach(function (c) {
      g.beginPath();
      g.arc(c.x, c.y, c.r, 0, Math.PI * 2);
      g.fill();
    });
    const cx = 256, cy = 118;
    const grd = g.createRadialGradient(cx, cy, 8, cx, cy + 10, 150);
    grd.addColorStop(0, "rgba(247, 239, 220, 0.55)");
    grd.addColorStop(1, "rgba(247, 239, 220, 0)");
    g.fillStyle = grd;
    g.beginPath();
    g.arc(cx, cy, 150, 0, Math.PI * 2);
    g.fill();
  }
  function strokeUnion(list) {
    g.beginPath();
    list.forEach(function (c) {
      const steps = 96;
      let drawing = false;
      for (let i = 0; i <= steps; i++) {
        const a = (i / steps) * Math.PI * 2;
        const x = c.x + Math.cos(a) * c.r;
        const y = c.y + Math.sin(a) * c.r;
        let inside = false;
        for (let j = 0; j < list.length; j++) {
          const o = list[j];
          if (o === c) continue;
          if (Math.hypot(x - o.x, y - o.y) < o.r - 0.85) { inside = true; break; }
        }
        if (!inside) {
          if (!drawing) { g.moveTo(x, y); drawing = true; }
          else g.lineTo(x, y);
        } else {
          drawing = false;
        }
      }
    });
    g.stroke();
  }
  fillUnion(circles);
  g.strokeStyle = "rgba(42,33,24,0.72)";
  g.lineWidth = 1.7;
  g.lineJoin = "round";
  g.lineCap = "round";
  strokeUnion(circles);
  // engraved hatch, clipped to the wash
  g.globalCompositeOperation = "source-atop";
  g.strokeStyle = "rgba(42,33,24,0.26)";
  g.lineWidth = 1;
  for (let y = 18; y < 240; y += 6) {
    g.beginPath();
    for (let x = 10; x < 500; x += 5) {
      const yy = y + Math.sin(x * 0.045 + y * 0.2) * 2.2;
      if (x === 10) g.moveTo(x, yy); else g.lineTo(x, yy);
    }
    g.stroke();
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.NoColorSpace;
  tex.flipY = false;
  return tex;
}

const clouds = [];
function buildClouds() {
  // Pass 3: engraved cumulus live in the sky shader. No sprite billboards.
  cloudMesh = null;
  return;
  const tex = makeCloudSprite();
  const geo = new THREE.PlaneGeometry(1, 1);
  const mat = new THREE.MeshBasicMaterial({
    map: tex, transparent: true, depthWrite: false, opacity: 0.85, side: THREE.DoubleSide
  });
  cloudMesh = new THREE.InstancedMesh(geo, mat, 16);
  cloudMesh.frustumCulled = false;
  cloudMesh.renderOrder = -40;
  skyGroup.add(cloudMesh);
  const rng = mulberry(44);
  for (let i = 0; i < 16; i++) {
    clouds.push({
      az: rng() * Math.PI * 2,
      alt: 0.16 + rng() * 0.38,
      r: 2200 + rng() * 2800,
      sx: 520 + rng() * 820,
      sy: 220 + rng() * 280,
      phase: rng() * 6.28,
      part: 0
    });
  }
}

function layoutClouds(dt) {
  if (!cloudMesh) return;
  cloudMesh.visible = false;
  cloudMesh.count = 0;
  return;
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
  const look = new THREE.Vector3();
  camera.getWorldDirection(look);
  const nCloud = wx.kind === "clear" ? 6 : wx.kind === "partly" ? 9 : 16;
  const hide = wx.kind === "clear" && clock.period === "night" ? 1 : nCloud;
  cloudMesh.count = hide;
  cloudMesh.material.opacity = (clock.night > 0.5 ? 0.5 : 0.88) * (wx.kind === "storm" ? 0.92 : 0.86);
  const tint = clock.night > 0.5 ? 0x5a6480 : clock.twi > 0.4 ? 0xd9a090 : 0xf0e6d0;
  cloudMesh.material.color.setHex(tint);
  camera.getWorldDirection(look);
  const baseAz = Math.atan2(look.x, look.z);
  for (let i = 0; i < 16; i++) {
    const c = clouds[i];
    if (!state.frozen) c.phase += dt * 0.08 * (wx.kind === "storm" ? 2.2 : 1);
    const spread = (i / Math.max(1, hide - 1) - 0.5) * 1.55;
    const az = (i < hide) ? baseAz + spread + Math.sin(c.phase) * 0.08 : c.az;
    const alt = 0.18 + (i % 3) * 0.11 + Math.sin(c.phase * 0.7) * 0.03;
    p.set(Math.sin(az) * Math.cos(alt) * c.r, Math.sin(alt) * c.r, Math.cos(az) * Math.cos(alt) * c.r);
    const sp = new THREE.Vector3().copy(p).add(camera.position);
    sp.project(camera);
    const dx = sp.x - (cursor.sx * 2 - 1);
    const dy = sp.y - (1 - cursor.sy * 2);
    const dist = Math.hypot(dx, dy);
    const want = dist < 0.45 && cursor.active ? (0.45 - dist) * 1.4 : 0;
    c.part = lerp(c.part, want, 1 - Math.exp(-(dt || 0.016) * 6));
    if (c.part > 0.01) {
      p.x += dx * 280 * c.part;
      p.y += dy * 160 * c.part;
    }
    look.set(p.x, p.y, p.z).normalize();
    q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), look);
    s.set(c.sx * (1 + c.part * 0.2), c.sx * 0.5 * (1 - c.part * 0.15), 1);
    m.compose(p, q, s);
    cloudMesh.setMatrixAt(i, m);
  }
  cloudMesh.instanceMatrix.needsUpdate = true;
}

function drawWobblyCircle(ctx, cx, cy, r, rng) {
  ctx.beginPath();
  const steps = 18;
  for (let k = 0; k <= steps; k++) {
    const a = (k / steps) * Math.PI * 2;
    const rr = r * (0.86 + rng() * 0.24);
    const x = cx + Math.cos(a) * rr;
    const y = cy + Math.sin(a) * rr * 0.92;
    if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

const LOD_NEAR = 900;
const LOD_MID = 2800;
const VEG = { trees: 0, blades: 0, clumps: 0, treesPlaced: 0 };

const SPECIES = {
  oak: { id: 0, angle: 26, depth: 6, len: 0.20, shrink: 0.73, tw: 3.4, spread: 1.15, twigs: 3, leaf: 0.055, cone: 0 },
  maple: { id: 1, angle: 34, depth: 6, len: 0.18, shrink: 0.70, tw: 2.6, spread: 1.32, twigs: 3, leaf: 0.05, cone: 0 },
  sycamore: { id: 2, angle: 22, depth: 6, len: 0.22, shrink: 0.74, tw: 3.8, spread: 1.08, twigs: 3, leaf: 0.06, cone: 0 },
  cedar: { id: 3, angle: 16, depth: 6, len: 0.16, shrink: 0.78, tw: 2.4, spread: 0.5, twigs: 3, leaf: 0.055, cone: 1 }
};
const SPEC_LIST = ["oak", "maple", "sycamore", "cedar"];

function growTree(spec, seed) {
  const rng = mulberry(seed >>> 0);
  const segs = [];
  const tips = [];
  function branch(x, y, ang, len, w, depth) {
    const a = ang + (rng() - 0.5) * 0.16;
    const x1 = x + Math.cos(a) * len;
    const y1 = y + Math.sin(a) * len;
    segs.push({ x: x, y: y, x1: x1, y1: y1, w: w, depth: depth });
    if (depth <= 0 || len < 0.018) {
      tips.push({ x: x1, y: y1, a: a });
      return;
    }
    branch(x1, y1, a + (rng() - 0.5) * 0.14, len * spec.shrink * (0.9 + rng() * 0.18), w * 0.72, depth - 1);
    const sides = spec.cone ? 2 : (1 + ((rng() * spec.twigs) | 0));
    for (let i = 0; i < sides; i++) {
      const dir = i % 2 === 0 ? 1 : -1;
      const da = dir * (spec.angle * RAD) * (0.7 + rng() * 0.55) * spec.spread;
      if (spec.cone) {
        const drop = 0.08 + rng() * 0.12;
        branch(x1, y1 - drop * 0.15, a + da, len * spec.shrink * (0.55 + rng() * 0.25), w * 0.5, depth - 1);
      } else {
        branch(x1, y1, a + da, len * spec.shrink * (0.62 + rng() * 0.28), w * 0.52, depth - 1);
      }
    }
  }
  branch(0, 0, Math.PI / 2, spec.len, spec.tw, spec.depth);
  if (tips.length > 4 && !spec.cone) {
    const ys = tips.map(function (t) { return t.y; }).sort(function (a, b) { return a - b; });
    const cap = ys[Math.floor(ys.length * 0.82)] + spec.len * 0.08;
    const keep = tips.filter(function (t) { return t.y <= cap; });
    if (keep.length >= 3) {
      const segs2 = segs.filter(function (s) { return s.y1 <= cap + 0.02; });
      return { segs: segs2, tips: keep, spec: spec };
    }
  }
  return { segs: segs, tips: tips, spec: spec };
}

function drawGrownTree(ctx, S, grown, opt) {
  const rng = mulberry(opt.seed ^ 7919);
  const cx = S * 0.5, base = S * 0.96, sc = S * (opt.lod === "clump" ? 0.82 : 0.9);
  const ink = "rgba(42,33,24," + (opt.inkA == null ? 0.84 : opt.inkA) + ")";
  function tx(x, y) { return [cx + x * sc, base - y * sc]; }
  const leavesOn = grown.spec.cone ? (opt.leaves !== false) : !!opt.leaves;
  const colors = opt.colors || ["#D9A441"];

  if (grown.spec.cone) {
    const cx = S * 0.5;
    ctx.strokeStyle = ink;
    ctx.lineCap = "round";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, S * 0.96);
    ctx.lineTo(cx + (rng() - 0.5) * 3, S * 0.28);
    ctx.stroke();
    const layers = 5;
    for (let i = 0; i < layers; i++) {
      const y = S * (0.22 + i * 0.13);
      const w = S * (0.10 + i * 0.075) * (0.9 + rng() * 0.2);
      const hh = S * 0.15;
      ctx.fillStyle = colors[i % colors.length];
      ctx.globalAlpha = 0.86;
      ctx.beginPath();
      ctx.moveTo(cx + (rng() - 0.5) * 2, y - hh * 0.75);
      ctx.lineTo(cx - w, y + hh * 0.5);
      ctx.lineTo(cx + w, y + hh * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = ink;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    return;
  }

  if (opt.lod === "clump" && leavesOn) {
    ctx.strokeStyle = ink;
    ctx.lineWidth = 1.6;
    ctx.lineCap = "round";
    const t0 = tx(0, 0), t1 = tx(0, 0.22);
    ctx.beginPath();
    ctx.moveTo(t0[0] + (rng() - 0.5) * 2, t0[1]);
    ctx.lineTo(t1[0], t1[1]);
    ctx.stroke();
    const n = grown.spec.cone ? 3 : (5 + (rng() * 3 | 0));
    for (let i = 0; i < n; i++) {
      const ox = (rng() - 0.5) * S * (grown.spec.cone ? 0.18 : 0.30);
      const oy = (rng() - 0.5) * S * (grown.spec.cone ? 0.22 : 0.22) - S * 0.12;
      const r = S * (0.16 + rng() * 0.16);
      ctx.fillStyle = colors[(rng() * colors.length) | 0];
      ctx.globalAlpha = 0.82 + rng() * 0.16;
      if (grown.spec.cone) {
        ctx.beginPath();
        ctx.moveTo(cx + ox, base - S * 0.82 + oy);
        ctx.lineTo(cx + ox - r, base - S * 0.42 + oy);
        ctx.lineTo(cx + ox + r, base - S * 0.42 + oy);
        ctx.closePath();
      } else {
        drawWobblyCircle(ctx, cx + ox, S * 0.46 + oy, r, rng);
      }
      ctx.fill();
      ctx.globalAlpha = 0.88;
      ctx.strokeStyle = ink;
      ctx.lineWidth = 1 + rng() * 0.6;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    return;
  }

  // Leafy deciduous: ink-circle crowns over a short trunk, no bare twigs sticking out of the top.
  if (leavesOn && !grown.spec.cone) {
    ctx.strokeStyle = ink;
    ctx.lineWidth = 2.0;
    ctx.lineCap = "round";
    const t0 = tx(0, 0), t1 = tx(0, 0.18);
    ctx.beginPath();
    ctx.moveTo(t0[0], t0[1]);
    ctx.lineTo(t1[0], t1[1]);
    ctx.stroke();
    const n = 6 + (rng() * 4 | 0);
    for (let i = 0; i < n; i++) {
      const ox = (rng() - 0.5) * S * 0.32;
      const oy = (rng() - 0.5) * S * 0.24 - S * 0.16;
      const r = S * (0.14 + rng() * 0.16);
      ctx.fillStyle = colors[(rng() * colors.length) | 0];
      ctx.globalAlpha = 0.84 + rng() * 0.14;
      drawWobblyCircle(ctx, cx + ox, S * 0.44 + oy, r, rng);
      ctx.fill();
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = ink;
      ctx.lineWidth = 1.05;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    return;
  }

  const tips = grown.tips;
  if (leavesOn && !grown.spec.cone && tips.length) {
    let sx = 0, sy = 0;
    for (let i = 0; i < tips.length; i++) { const p = tx(tips[i].x, tips[i].y); sx += p[0]; sy += p[1]; }
    const cxC = sx / tips.length, cyC = sy / tips.length;
    ctx.fillStyle = colors[0];
    ctx.globalAlpha = 0.38;
    drawWobblyCircle(ctx, cxC, cyC, S * 0.28, rng);
    ctx.fill();
    ctx.globalAlpha = 0.22;
    drawWobblyCircle(ctx, cxC + (rng() - 0.5) * S * 0.12, cyC + (rng() - 0.5) * S * 0.1, S * 0.2, rng);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = ink;
  const segs = grown.segs;
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i];
    const a = tx(s.x, s.y), b = tx(s.x1, s.y1);
    ctx.lineWidth = Math.max(0.55, s.w * (S / 128));
    ctx.globalAlpha = 0.78 + 0.2 * (s.w / grown.spec.tw);
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  if (!leavesOn) return;
  for (let i = 0; i < tips.length; i++) {
    const p = tx(tips[i].x, tips[i].y);
    const dabs = grown.spec.cone ? 1 : 2 + (rng() * 2 | 0);
    for (let d = 0; d < dabs; d++) {
      const px = p[0] + (rng() - 0.5) * S * 0.06;
      const py = p[1] + (rng() - 0.5) * S * 0.06;
      const r = S * grown.spec.leaf * (0.7 + rng() * 0.7);
      ctx.fillStyle = colors[(rng() * colors.length) | 0];
      ctx.globalAlpha = 0.78 + rng() * 0.2;
      if (grown.spec.cone) {
        ctx.beginPath();
        ctx.moveTo(px, py - r * 1.2);
        ctx.lineTo(px - r, py + r * 0.5);
        ctx.lineTo(px + r, py + r * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 0.8;
        ctx.strokeStyle = ink;
        ctx.lineWidth = 0.7;
        ctx.stroke();
      } else {
        drawWobblyCircle(ctx, px, py, r * 1.15, rng);
        ctx.fill();
        ctx.globalAlpha = 0.85;
        ctx.strokeStyle = ink;
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }
    }
  }
  if (opt.blossom) {
    ctx.globalAlpha = 0.9;
    for (let k = 0; k < 8; k++) {
      const t = tips[(rng() * tips.length) | 0];
      const p = tx(t.x, t.y);
      ctx.fillStyle = rng() > 0.45 ? "#F2D6E0" : "#F7F4EA";
      ctx.beginPath();
      ctx.arc(p[0] + (rng() - 0.5) * 6, p[1] + (rng() - 0.5) * 6, 1.5 + rng() * 2.0, 0, 6.28);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

function leafColors(specName, season) {
  if (specName === "cedar") return ["#3E5A45", "#2F4A38", "#4A6A50"];
  if (season === "spring") return ["#7FA866", "#6E9A58", "#8BB36E", "#5E8A4A"];
  if (season === "summer") return ["#2F5D46", "#3A6B50", "#4E7D57", "#2A5340"];
  if (season === "autumn") return ["#D9A441", "#B5562E", "#8A6420", "#C9842C", "#A65A32"];
  return ["#C4BBA8"];
}

// Atlas 8x8. Rows 0-2 full leafy oak/maple/sycamore (same seeds as bare rows 6-7).
// Row 3 cedar full. Row 4 hardwood clumps. Row 5 cedar clumps + extra. Row 6 bare oak. Row 7 bare maple/sycamore.
const ATLAS_COL = 8, ATLAS_ROW = 8, ATLAS_S = 128;
const TREE_SEED0 = 44021;

function makeTreeAtlas() {
  const COL = ATLAS_COL, ROW = ATLAS_ROW, S = ATLAS_S;
  const cv = document.createElement("canvas");
  cv.width = COL * S; cv.height = ROW * S;
  const ctx = cv.getContext("2d");
  function paint(ix, iy, specName, seed, lod, leaves, blossom, season) {
    ctx.save();
    ctx.translate(ix * S, iy * S);
    ctx.clearRect(0, 0, S, S);
    ctx.beginPath();
    ctx.rect(4, 4, S - 8, S - 8);
    ctx.clip();
    const grown = growTree(SPECIES[specName], seed);
    drawGrownTree(ctx, S, grown, {
      seed: seed,
      lod: lod,
      leaves: leaves,
      blossom: !!blossom,
      colors: leafColors(specName, season || clock.season),
      inkA: 0.86
    });
    ctx.restore();
  }
  const season = clock.season;
  for (let i = 0; i < 8; i++) paint(i, 0, "oak", TREE_SEED0 + i, "full", true, false, season);
  for (let i = 0; i < 8; i++) paint(i, 1, "maple", TREE_SEED0 + 80 + i, "full", true, season === "spring", season);
  for (let i = 0; i < 8; i++) paint(i, 2, "sycamore", TREE_SEED0 + 160 + i, "full", true, false, season);
  for (let i = 0; i < 8; i++) paint(i, 3, "cedar", TREE_SEED0 + 240 + i, "full", true, true, season);
  for (let i = 0; i < 8; i++) {
    const names = ["oak", "maple", "sycamore", "oak", "maple", "sycamore", "oak", "maple"];
    paint(i, 4, names[i], TREE_SEED0 + 20 + i, "clump", true, false, season);
  }
  for (let i = 0; i < 4; i++) paint(i, 5, "cedar", TREE_SEED0 + 248 + i, "clump", true, true, season);
  for (let i = 4; i < 8; i++) paint(i, 5, i % 2 ? "oak" : "maple", TREE_SEED0 + 30 + i, "clump", true, season === "spring", season);
  for (let i = 0; i < 8; i++) paint(i, 6, "oak", TREE_SEED0 + i, "full", false, false, "winter");
  for (let i = 0; i < 4; i++) paint(i, 7, "maple", TREE_SEED0 + 80 + i, "full", false, false, "winter");
  for (let i = 4; i < 8; i++) paint(i, 7, "sycamore", TREE_SEED0 + 160 + (i - 4), "full", false, false, "winter");
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.NoColorSpace;
  tex.flipY = false;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

function framesFor(specName, seedSlot, season, cls) {
  // seedSlot 0-7
  const cedar = specName === "cedar" || cls === 5;
  let full, clump, bare;
  if (cedar) {
    full = 24 + (seedSlot % 8);
    clump = 40 + (seedSlot % 4);
    bare = full;
  } else if (specName === "oak") {
    full = 0 + (seedSlot % 8);
    clump = 32 + (seedSlot % 8);
    bare = 48 + (seedSlot % 8);
  } else if (specName === "maple") {
    full = 8 + (seedSlot % 8);
    clump = 32 + ((seedSlot + 1) % 8);
    bare = 56 + (seedSlot % 4);
  } else {
    full = 16 + (seedSlot % 8);
    clump = 32 + ((seedSlot + 2) % 8);
    bare = 60 + (seedSlot % 4);
  }
  const winterish = season === "winter";
  const autumnBare = season === "autumn" && !cedar && ((seedSlot * 17) % 10) < 2;
  if (winterish || autumnBare) return { full: bare, clump: bare };
  return { full: full, clump: clump };
}

function pickSpecies(cls, rng) {
  if (cls === 5) return "cedar";
  const r = rng();
  if (r < 0.38) return "oak";
  if (r < 0.70) return "maple";
  return "sycamore";
}

let treeRecords = [];

function scatterTrees() {
  const rng = mulberry(2026);
  const maxN = 8000;
  const pos = [], scale = [], frame = [], frameClump = [], phase = [], kind = [];
  treeRecords = [];
  // Pack stands in woods along the river corridor first, so the hero view is dense.
  let minx = 1e9, maxx = -1e9, minz = 1e9, maxz = -1e9;
  for (let i = 0; i < path.length; i++) {
    const p = path[i];
    if (p.x < minx) minx = p.x; if (p.x > maxx) maxx = p.x;
    if (p.z < minz) minz = p.z; if (p.z > maxz) maxz = p.z;
  }
  const pad = 2200;
  const a = worldToPx(minx - pad, maxz + pad);
  const b = worldToPx(maxx + pad, minz - pad);
  const px0 = Math.max(2, Math.min(a.px, b.px) | 0);
  const px1 = Math.min(COLS - 3, Math.max(a.px, b.px) | 0);
  const py0 = Math.max(2, Math.min(a.py, b.py) | 0);
  const py1 = Math.min(ROWS - 3, Math.max(a.py, b.py) | 0);
  const step = 2;
  const cands = [];
  for (let py = py0; py <= py1; py += step) {
    for (let px = px0; px <= px1; px += step) {
      const cls = coverPx(px, py);
      let chance = 0;
      if (cls === 4) chance = 0.88;
      else if (cls === 5) chance = 0.92;
      else if (cls === 8) chance = 0.22;
      else if (cls === 1) chance = 0.04;
      else if (cls === 6) chance = 0.0;
      else if (cls === 7) chance = 0.0;
      else continue;
      const hl = heightPx(px - 2, py), hr = heightPx(px + 2, py);
      const hd = heightPx(px, py + 2), hu = heightPx(px, py - 2);
      const slope = Math.abs(hl - hr) + Math.abs(hd - hu);
      if (cls === 4 && slope > 4) chance = Math.min(1, chance + 0.18);
      const wet = coverPx(px + 2, py) === 0 || coverPx(px - 2, py) === 0 || coverPx(px, py + 2) === 0 || coverPx(px, py - 2) === 0;
      if (wet && (cls === 4 || cls === 5)) chance = 1.0;
      if (rng() > chance) continue;
      const dw = pxToWorld(px, py);
      const hw0 = pxToWorld(HERO.px, HERO.py);
      if (Math.hypot(dw.x - hw0.x, dw.z - hw0.z) < 220) continue;
      // Keep the look-corridor open between the front crest and the middle ridge
      const churchP2 = (meta.landmarks && meta.landmarks.jasper_st_joseph) || [174.3, 444.6];
      const cw2 = pxToWorld(churchP2[0], churchP2[1]);
      const lx2 = cw2.x - hw0.x, lz2 = cw2.z - hw0.z;
      const llen2 = Math.hypot(lx2, lz2) || 1;
      const along0 = ((dw.x - hw0.x) * lx2 + (dw.z - hw0.z) * lz2) / llen2;
      const side0 = (dw.x - hw0.x) * (lz2 / llen2) - (dw.z - hw0.z) * (lx2 / llen2);
      if (along0 > 200 && along0 < 2000 && Math.abs(side0) < 230) continue;
      cands.push({ px: px, py: py, cls: cls, front: 0 });
    }
  }
  // Dense oaks and maples on the front ridge around the hero viewpoint
  const heroW = pxToWorld(HERO.px, HERO.py);
  const churchP = (meta.landmarks && meta.landmarks.jasper_st_joseph) || [174.3, 444.6];
  const cw = pxToWorld(churchP[0], churchP[1]);
  const lx = cw.x - heroW.x, lz = cw.z - heroW.z;
  const llen = Math.hypot(lx, lz) || 1;
  const ux = lx / llen, uz = lz / llen;
  for (let py = Math.max(2, (HERO.py - 36) | 0); py <= Math.min(ROWS - 3, (HERO.py + 12) | 0); py += 1) {
    for (let px = Math.max(2, (HERO.px - 28) | 0); px <= Math.min(COLS - 3, (HERO.px + 28) | 0); px += 1) {
      const w = pxToWorld(px, py);
      const along = (w.x - heroW.x) * ux + (w.z - heroW.z) * uz;
      const side = (w.x - heroW.x) * uz - (w.z - heroW.z) * ux;
      // Keep a clearing around the camera. Wings on the front crest; open a center
      // window so the Patoka gap and the middle ridge can be seen.
      if (along < 240 || along > 950) continue;
      if (Math.abs(side) > 520) continue;
      if (Math.abs(side) < 210) continue;
      const cls = coverPx(px, py);
      if (cls === 0) continue;
      const hm = heightPx(px, py);
      if (hm < heightPx(HERO.px, HERO.py) - 14) continue;
      const dens = cls === 4 || cls === 5 ? 0.9 : (cls === 6 || cls === 1 ? 0.5 : 0.32);
      if (rng() > dens) continue;
      cands.push({ px: px, py: py, cls: cls === 5 ? 4 : cls, front: 1 });
    }
  }
  for (let i = cands.length - 1; i > 0; i--) {
    const j = (rng() * (i + 1)) | 0;
    const tmp = cands[i]; cands[i] = cands[j]; cands[j] = tmp;
  }
  for (let ci = 0; ci < cands.length && pos.length / 3 < maxN; ci++) {
    const px = cands[ci].px, py = cands[ci].py, cls = cands[ci].cls;
    const isFront = cands[ci].front === 1;
    const stand = isFront ? 5 + ((rng() * 4) | 0) : (cls === 4 || cls === 5 ? 3 + ((rng() * 4) | 0) : 1);
    for (let s = 0; s < stand && pos.length / 3 < maxN; s++) {
      const jx = (px + (rng() - 0.5) * (isFront ? 0.85 : 1.05));
      const jy = (py + (rng() - 0.5) * (isFront ? 0.85 : 1.05));
      const w = pxToWorld(jx, jy);
      const c2 = coverPx(jx, jy);
      if (c2 === 0 || c2 === 3) continue;
      if (!isFront && (c2 === 2)) continue;
      const hm = heightPx(jx, jy);
      let specName = pickSpecies(c2 === 5 && !isFront ? 5 : cls, rng);
      if (isFront) specName = rng() < 0.48 ? "oak" : "maple";
      const slot = (rng() * 8) | 0;
      const fr = framesFor(specName, slot, clock.season, c2);
      const tall = isFront ? (16 + rng() * 12) : (specName === "cedar" ? 15 + rng() * 8 : 13 + rng() * 11);
      const wid = tall * (specName === "cedar" ? 0.48 : 0.78) * (0.85 + rng() * 0.3);
      pos.push(w.x, yOf(hm), w.z);
      scale.push(wid * (isFront ? 2.4 : 2.15), tall * (isFront ? 2.55 : 2.2));
      frame.push(fr.full);
      frameClump.push(fr.clump);
      phase.push(rng());
      kind.push(specName === "cedar" ? 1 : 0);
      treeRecords.push({ spec: specName, slot: slot, cls: c2 });
    }
  }
  // drop lone trees so woods read as stands, not orange balls
  const n0 = pos.length / 3;
  const mark = new Uint8Array(n0);
  const r2 = 48 * 48;
  const cell = 60;
  const buckets = {};
  function key(x, z) { return ((x / cell) | 0) + ":" + ((z / cell) | 0); }
  for (let i = 0; i < n0; i++) {
    const k = key(pos[i * 3], pos[i * 3 + 2]);
    if (!buckets[k]) buckets[k] = [];
    buckets[k].push(i);
  }
  for (let i = 0; i < n0; i++) {
    if (mark[i]) continue;
    const x = pos[i * 3], z = pos[i * 3 + 2];
    const gx = (x / cell) | 0, gz = (z / cell) | 0;
    for (let ox = -1; ox <= 1 && !mark[i]; ox++) {
      for (let oz = -1; oz <= 1 && !mark[i]; oz++) {
        const list = buckets[gx + ox + ":" + (gz + oz)];
        if (!list) continue;
        for (let li = 0; li < list.length; li++) {
          const j = list[li];
          if (j === i) continue;
          const dx = x - pos[j * 3], dz = z - pos[j * 3 + 2];
          if (dx * dx + dz * dz < r2) { mark[i] = 1; mark[j] = 1; break; }
        }
      }
    }
  }
  let w3 = 0;
  for (let i = 0; i < n0; i++) {
    if (!mark[i]) continue;
    if (w3 !== i) {
      pos[w3 * 3] = pos[i * 3]; pos[w3 * 3 + 1] = pos[i * 3 + 1]; pos[w3 * 3 + 2] = pos[i * 3 + 2];
      scale[w3 * 2] = scale[i * 2]; scale[w3 * 2 + 1] = scale[i * 2 + 1];
      frame[w3] = frame[i]; frameClump[w3] = frameClump[i];
      phase[w3] = phase[i]; kind[w3] = kind[i];
      treeRecords[w3] = treeRecords[i];
    }
    w3++;
  }
  pos.length = w3 * 3;
  treeRecords.length = w3;
  const n = w3;
  VEG.treesPlaced = n;
  VEG.trees = n;
  const plane = new THREE.PlaneGeometry(1, 1);
  plane.translate(0, 0.5, 0);
  plane.setAttribute("iScale", new THREE.InstancedBufferAttribute(new Float32Array(scale), 2));
  plane.setAttribute("iFrame", new THREE.InstancedBufferAttribute(new Float32Array(frame), 1));
  plane.setAttribute("iFrameClump", new THREE.InstancedBufferAttribute(new Float32Array(frameClump), 1));
  plane.setAttribute("iPhase", new THREE.InstancedBufferAttribute(new Float32Array(phase), 1));
  plane.setAttribute("iKind", new THREE.InstancedBufferAttribute(new Float32Array(kind), 1));
  treeMat = new THREE.ShaderMaterial({
    uniforms: {
      uAtlas: { value: makeTreeAtlas() },
      uAtlasGrid: { value: new THREE.Vector2(ATLAS_COL, ATLAS_ROW) },
      uTime: { value: 0 },
      uCursor: { value: new THREE.Vector3() },
      uWind: { value: 1 },
      uRuffle: { value: 1 },
      uReduce: { value: REDUCE ? 1 : 0 },
      uInkUse: { value: colU(INK) },
      uNight: { value: 0 },
      uLightning: { value: 0 },
      uLodNear: { value: LOD_NEAR },
      uLodMid: { value: LOD_MID }
    },
    vertexShader: SPRITE_VERT,
    fragmentShader: TREE_FRAG,
    transparent: true,
    depthWrite: true
  });
  treeMesh = new THREE.InstancedMesh(plane, treeMat, n);
  treeMesh.frustumCulled = false;
  const dummy = new THREE.Object3D();
  for (let i = 0; i < n; i++) {
    dummy.position.set(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    treeMesh.setMatrixAt(i, dummy.matrix);
  }
  treeMesh.instanceMatrix.needsUpdate = true;
  scene.add(treeMesh);
  return n;
}

function syncTreeFrames() {
  if (!treeMesh || !treeRecords.length) return;
  const full = treeMesh.geometry.attributes.iFrame.array;
  const clump = treeMesh.geometry.attributes.iFrameClump.array;
  for (let i = 0; i < treeRecords.length; i++) {
    const r = treeRecords[i];
    const fr = framesFor(r.spec, r.slot, clock.season, r.cls);
    full[i] = fr.full;
    clump[i] = fr.clump;
  }
  treeMesh.geometry.attributes.iFrame.needsUpdate = true;
  treeMesh.geometry.attributes.iFrameClump.needsUpdate = true;
  if (treeMat && treeMat.uniforms.uAtlas.value) {
    treeMat.uniforms.uAtlas.value.dispose();
    treeMat.uniforms.uAtlas.value = makeTreeAtlas();
  }
}

function makeBladeGeo() {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array([
    -0.46, 0.0, 0.0,
     0.46, 0.0, 0.0,
    -0.30, 0.42, 0.03,
     0.30, 0.42, 0.03,
    -0.14, 0.78, 0.05,
     0.14, 0.78, 0.05,
     0.00, 1.00, 0.07
  ]);
  const uv = new Float32Array([
    0, 0, 1, 0,
    0, 0.42, 1, 0.42,
    0, 0.78, 1, 0.78,
    0.5, 1
  ]);
  const idx = new Uint16Array([
    0, 1, 2, 1, 3, 2,
    2, 3, 4, 3, 5, 4,
    4, 5, 6
  ]);
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  return geo;
}

function makeClumpGeo() {
  // a few overlapping blades in one mesh, used as the mid-distance tuft
  const geo = new THREE.BufferGeometry();
  const pos = [], uv = [], idx = [];
  const blades = 5;
  for (let b = 0; b < blades; b++) {
    const lean = (b - 2) * 0.16;
    const base = pos.length / 3;
    const xs = [-0.5 + lean, 0.5 + lean, -0.22 + lean * 1.2, 0.22 + lean * 1.2, lean];
    const ys = [0, 0, 0.55, 0.55, 1];
    for (let k = 0; k < 5; k++) {
      pos.push(xs[k] * 0.55, ys[k], (b - 2) * 0.04);
      uv.push(k === 4 ? 0.5 : (k % 2), ys[k]);
    }
    idx.push(base, base + 1, base + 2, base + 1, base + 3, base + 2, base + 2, base + 3, base + 4);
  }
  geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(pos), 3));
  geo.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(uv), 2));
  geo.setIndex(new THREE.BufferAttribute(new Uint16Array(idx), 1));
  return geo;
}

const BLADE_N = 5200;
const CLUMP_N = 1400;
const grassState = { cx: 1e9, cz: 1e9 };
let clumpMesh, clumpMat;

function grassUniforms() {
  return {
    uTime: { value: 0 },
    uCursor: { value: new THREE.Vector3() },
    uWind: { value: 1 },
    uReduce: { value: REDUCE ? 1 : 0 },
    uGrass: { value: colU(SKINS.autumn.grass) },
    uWheat: { value: colU(SKINS.autumn.wheat) },
    uCorn: { value: colU(SKINS.summer.field) },
    uInkUse: { value: colU(INK) },
    uLodNear: { value: LOD_NEAR },
    uLodMid: { value: LOD_MID }
  };
}

function buildGrass() {
  function makeMesh(geo, N) {
    geo.setAttribute("iScale", new THREE.InstancedBufferAttribute(new Float32Array(N * 2), 2));
    geo.setAttribute("iPhase", new THREE.InstancedBufferAttribute(new Float32Array(N), 1));
    geo.setAttribute("iKind", new THREE.InstancedBufferAttribute(new Float32Array(N), 1));
    geo.setAttribute("iLean", new THREE.InstancedBufferAttribute(new Float32Array(N * 2), 2));
    const mat = new THREE.ShaderMaterial({
      uniforms: grassUniforms(),
      vertexShader: GRASS_VERT,
      fragmentShader: GRASS_FRAG,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    const mesh = new THREE.InstancedMesh(geo, mat, N);
    mesh.frustumCulled = false;
    mesh._pos = new Float32Array(N * 3);
    scene.add(mesh);
    return { mesh: mesh, mat: mat };
  }
  const near = makeMesh(makeBladeGeo(), BLADE_N);
  grassMesh = near.mesh;
  grassMat = near.mat;
  const mid = makeMesh(makeClumpGeo(), CLUMP_N);
  clumpMesh = mid.mesh;
  clumpMat = mid.mat;
}

function fillBand(mesh, maxN, cx, cz, rad, kindForce, minR) {
  if (!mesh) return 0;
  const rng = mulberry(((cx * 13 + cz * 7 + rad) | 0) >>> 0);
  const pos = mesh._pos;
  const scale = mesh.geometry.attributes.iScale.array;
  const phase = mesh.geometry.attributes.iPhase.array;
  const kind = mesh.geometry.attributes.iKind.array;
  const lean = mesh.geometry.attributes.iLean.array;
  let n = 0, tries = 0;
  const season = clock.season;
  const wheatOn = season === "summer" && clock.month >= 6 && clock.month <= 7;
  const cornOn = season === "summer";
  const limit = maxN * 3.2;
  while (n < maxN && tries < limit) {
    tries++;
    const a = rng() * 6.28, r = minR + Math.sqrt(rng()) * (rad - minR);
    const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
    const cls = coverWorld(x, z);
    if (cls !== 6 && cls !== 7 && cls !== 8) continue;
    if (season === "winter" && wx.kind !== "snow" && rng() > 0.3) continue;
    if (season === "autumn" && cls === 7) continue;
    const h = heightWorld(x, z);
    pos[n * 3] = x; pos[n * 3 + 1] = yOf(h); pos[n * 3 + 2] = z;
    let knd = 0;
    if (kindForce != null) knd = kindForce;
    else if (cornOn && cls === 7 && rng() > 0.55) knd = 2;
    else if (wheatOn && cls === 7 && rng() > 0.3) knd = 1;
    const tall = knd === 2 ? 2.4 + rng() * 0.8 : knd === 1 ? 1.6 + rng() * 0.7 : (cls === 7 ? 1.2 + rng() * 0.6 : 0.55 + rng() * 0.5);
    const wide = knd === 3 ? 1.4 + rng() * 0.8 : 0.08 + rng() * 0.1;
    scale[n * 2] = wide;
    scale[n * 2 + 1] = tall * (season === "spring" ? 0.55 : 1) * EXAG * (knd === 3 ? 0.7 : 0.55);
    phase[n] = rng();
    kind[n] = knd;
    const ang = rng() * 6.28, amt = (rng() - 0.5) * 0.35;
    lean[n * 2] = Math.cos(ang) * amt;
    lean[n * 2 + 1] = Math.sin(ang) * amt;
    n++;
  }
  const dummy = new THREE.Object3D();
  for (let i = 0; i < n; i++) {
    dummy.position.set(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.count = n;
  mesh.instanceMatrix.needsUpdate = true;
  mesh.geometry.attributes.iScale.needsUpdate = true;
  mesh.geometry.attributes.iPhase.needsUpdate = true;
  mesh.geometry.attributes.iKind.needsUpdate = true;
  mesh.geometry.attributes.iLean.needsUpdate = true;
  return n;
}

function fillGrass(cx, cz) {
  if (!grassMesh) return;
  VEG.blades = fillBand(grassMesh, BLADE_N, cx, cz, 200, null, 0);
  VEG.clumps = clumpMesh ? fillBand(clumpMesh, CLUMP_N, cx, cz, 900, 3, 200) : 0;
  grassState.cx = cx; grassState.cz = cz;
}


const washMatCache = {};
const windowMatCache = { mat: null };
function makeWashMat(rgb) {
  const key = rgb[0] + "," + rgb[1] + "," + rgb[2];
  if (washMatCache[key]) return washMatCache[key];
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uWash: { value: colU(rgb) },
      uInkUse: { value: colU(INK) },
      uPaper: { value: colU(PAPER) },
      uNightMul: { value: colU(NIGHT_MUL) },
      uNight: { value: 0 }
    },
    vertexShader: BUILDING_VERT,
    fragmentShader: BUILDING_FRAG
  });
  washMats.push(mat);
  washMatCache[key] = mat;
  return mat;
}

function makeWindowMat() {
  if (windowMatCache.mat) return windowMatCache.mat;
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uGlow: { value: colU(WINDOW) },
      uInkUse: { value: colU(INK) },
      uNight: { value: 0 }
    },
    vertexShader: BUILDING_VERT,
    fragmentShader: WINDOW_FRAG
  });
  windowMats.push(mat);
  windowMatCache.mat = mat;
  return mat;
}

function addWashMesh(group, geo, rgb, x, y, z, rx, ry, rz) {
  const mesh = new THREE.Mesh(geo, makeWashMat(rgb));
  mesh.position.set(x || 0, y || 0, z || 0);
  if (rx) mesh.rotation.x = rx;
  if (ry) mesh.rotation.y = ry;
  if (rz) mesh.rotation.z = rz;
  group.add(mesh);
  return mesh;
}

function addWindow(group, w, h, d, x, y, z, name) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), makeWindowMat());
  mesh.position.set(x, y, z);
  mesh.name = name || "window_0";
  group.add(mesh);
  return mesh;
}

function placeholderChurch() {
  const g = new THREE.Group();
  g.name = "church";
  addWashMesh(g, new THREE.BoxGeometry(9, 5, 7), hexRgb("#8A7A66"), 0, 2.5, 0);
  const roof = new THREE.ConeGeometry(6.2, 2.8, 4);
  roof.rotateY(Math.PI / 4);
  addWashMesh(g, roof, hexRgb("#5A4638"), 0, 6.4, 0);
  addWashMesh(g, new THREE.BoxGeometry(2.6, 7.5, 2.6), hexRgb("#8A7A66"), 0, 6.2, -1.4);
  addWashMesh(g, new THREE.ConeGeometry(1.9, 4.2, 4), hexRgb("#4A3A2C"), 0, 12.0, -1.4);
  addWindow(g, 0.9, 1.5, 0.25, 2.0, 2.4, 3.55, "window_nave_e");
  addWindow(g, 0.9, 1.5, 0.25, -2.0, 2.4, 3.55, "window_nave_w");
  addWindow(g, 0.8, 1.6, 0.25, 0, 8.2, -0.05, "window_tower");
  return g;
}

function placeholderFarmhouse() {
  const g = new THREE.Group();
  g.name = "farmhouse";
  addWashMesh(g, new THREE.BoxGeometry(9, 5.2, 7), hexRgb("#E8E0D0"), 0, 2.6, 0);
  const roof = new THREE.ConeGeometry(6.6, 3.2, 4);
  roof.rotateY(Math.PI / 4);
  addWashMesh(g, roof, hexRgb("#6A5344"), 0, 6.8, 0);
  addWashMesh(g, new THREE.BoxGeometry(3.2, 4.2, 3.2), hexRgb("#E8E0D0"), 5.4, 2.1, 0);
  addWindow(g, 1.3, 1.5, 0.25, -2.0, 2.8, 3.55, "window_l");
  addWindow(g, 1.3, 1.5, 0.25, 1.6, 2.8, 3.55, "window_r");
  addWindow(g, 1.0, 1.3, 0.25, 5.4, 2.4, 1.7, "window_s");
  return g;
}

function placeholderBarn() {
  const g = new THREE.Group();
  g.name = "barn";
  addWashMesh(g, new THREE.BoxGeometry(12, 6, 8), hexRgb("#8B3A2A"), 0, 3, 0);
  addWashMesh(g, new THREE.BoxGeometry(11.2, 2.4, 6.2), hexRgb("#8B3A2A"), 0, 6.8, 0);
  const cap = new THREE.ConeGeometry(7.2, 2.6, 4);
  cap.rotateY(Math.PI / 4);
  addWashMesh(g, cap, hexRgb("#3A2A22"), 0, 9.2, 0);
  addWindow(g, 1.1, 1.4, 0.25, -3.2, 4.2, 4.05, "window_loft_l");
  addWindow(g, 1.1, 1.4, 0.25, 3.2, 4.2, 4.05, "window_loft_r");
  return g;
}

function placeholderSilo() {
  const g = new THREE.Group();
  g.name = "silo";
  addWashMesh(g, new THREE.CylinderGeometry(2.2, 2.4, 6.2, 10), hexRgb("#A8A094"), 0, 3.1, 0);
  addWashMesh(g, new THREE.SphereGeometry(2.3, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), hexRgb("#8A8078"), 0, 6.2, 0);
  return g;
}

function placeholderHay() {
  const g = new THREE.Group();
  g.name = "haybale";
  const cyl = new THREE.CylinderGeometry(1.15, 1.15, 1.6, 10);
  cyl.rotateZ(Math.PI / 2);
  addWashMesh(g, cyl, hexRgb("#C9A66B"), 0, 1.15, 0);
  return g;
}

const MODEL_WASH = {
  church: {
    wall: [191, 158, 115],
    stone_dark: [140, 115, 87],
    clock: [237, 230, 214],
    metal: [217, 164, 65],
    door: [56, 41, 31],
    hand: [42, 33, 24],
    lantern: [237, 229, 214],
    roof: [82, 140, 107],
    trim: [209, 184, 143]
  },
  farmhouse: {
    wall: [242, 237, 224],
    trim: [219, 209, 189],
    door: [59, 43, 33],
    wood: [115, 87, 56],
    roof: [92, 87, 79],
    chimney: [158, 87, 61]
  },
  barn: {
    wall: [156, 56, 43],
    trim: [237, 229, 214],
    roof: [133, 128, 117],
    door: [237, 229, 214],
    stone: [158, 143, 117],
    wood: [102, 76, 46],
    earth: [158, 128, 82]
  },
  silo: {
    wall: [148, 153, 148],
    stone: [158, 148, 128],
    metal: [115, 120, 117],
    trim: [102, 102, 99],
    roof: [128, 133, 130],
    window: [64, 64, 61]
  },
  haybale: {
    hay: [201, 166, 107],
    twine: [173, 140, 82]
  }
};

function styleLoadedModel(root, kind) {
  const pal = MODEL_WASH[kind] || {};
  const fallback = {
    church: [191, 158, 115],
    farmhouse: [242, 237, 224],
    barn: [156, 56, 43],
    silo: [148, 153, 148],
    haybale: [201, 166, 107]
  }[kind] || hexRgb("#8A7A66");
  root.traverse(function (obj) {
    if (!obj.isMesh) return;
    const n = (obj.name || "").toLowerCase();
    const raw = Array.isArray(obj.material) ? obj.material : [obj.material];
    const styled = raw.map(function (src) {
      const mn = (src && src.name) ? String(src.name).toLowerCase() : "";
      const isWin = kind !== "silo" && (mn === "window" || n.indexOf("window") === 0 || n.indexOf("lancet") === 0 || n === "rose" || n.indexOf("rear_window") === 0);
      if (isWin) return makeWindowMat();
      const rgb = pal[mn] || pal[n] || fallback;
      return makeWashMat(rgb);
    });
    obj.material = styled.length === 1 ? styled[0] : styled;
  });
  return root;
}

const MODEL_FILES = {
  church: ["st_joseph_church.glb", "church.glb", "st-joseph.glb", "st_joseph.glb"],
  farmhouse: ["farmhouse.glb", "house.glb"],
  barn: ["bank_barn.glb", "barn.glb", "red-barn.glb"],
  silo: ["grain_silo.glb", "silo.glb"],
  haybale: ["hay_bale.glb", "haybale.glb", "hay-bale.glb", "hay.glb"]
};

async function tryLoadModel(kind) {
  const names = MODEL_FILES[kind] || [];
  const loader = new GLTFLoader();
  for (let i = 0; i < names.length; i++) {
    const url = "./models/" + names[i];
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const buf = await res.arrayBuffer();
      const gltf = await new Promise(function (resolve, reject) {
        loader.parse(buf, "./models/", resolve, reject);
      });
      if (gltf && gltf.scene) {
        LAND.fromGltf[kind] = names[i];
        return gltf.scene;
      }
    } catch (err) {}
  }
  return null;
}

function placeOnGround(obj, x, z, yaw) {
  const h = heightWorld(x, z);
  obj.position.set(x, yOf(h), z);
  obj.rotation.y = yaw || 0;
}

function isCropAdjacent(px, py) {
  const n = [coverPx(px + 1, py), coverPx(px - 1, py), coverPx(px, py + 1), coverPx(px, py - 1)];
  for (let i = 0; i < 4; i++) if (n[i] === 1 || n[i] === 2 || n[i] === 4) return true;
  return false;
}


function nearHero(x, z, dist) {
  const hw = pxToWorld(HERO.px, HERO.py);
  return Math.hypot(x - hw.x, z - hw.z) < (dist || 1800);
}

function scatterBuildings() {
  const rng = mulberry(91);
  const sites = [];
  let minx = 1e9, maxx = -1e9, minz = 1e9, maxz = -1e9;
  for (let i = 0; i < path.length; i++) {
    const p = path[i];
    if (p.x < minx) minx = p.x; if (p.x > maxx) maxx = p.x;
    if (p.z < minz) minz = p.z; if (p.z > maxz) maxz = p.z;
  }
  const pad = 1800;
  const a = worldToPx(minx - pad, maxz + pad);
  const b = worldToPx(maxx + pad, minz - pad);
  const px0 = Math.max(2, Math.min(a.px, b.px) | 0);
  const px1 = Math.min(COLS - 3, Math.max(a.px, b.px) | 0);
  const py0 = Math.max(2, Math.min(a.py, b.py) | 0);
  const py1 = Math.min(ROWS - 3, Math.max(a.py, b.py) | 0);
  for (let py = py0; py <= py1; py += 3) {
    for (let px = px0; px <= px1; px += 3) {
      const cls = coverPx(px, py);
      let kind = null;
      if (cls === 2 || cls === 1) {
        if (rng() < 0.22) kind = rng() < 0.55 ? "farmhouse" : (rng() < 0.7 ? "barn" : "silo");
      } else if ((cls === 7 || cls === 6) && isCropAdjacent(px, py) && rng() < 0.08) {
        kind = rng() < 0.4 ? "farmhouse" : (rng() < 0.75 ? "barn" : "silo");
      }
      if (!kind) continue;
      const w = pxToWorld(px + (rng() - 0.5), py + (rng() - 0.5));
      if (coverWorld(w.x, w.z) === 0) continue;
      if (nearHero(w.x, w.z, 2000)) continue;
      sites.push({ kind: kind, x: w.x, z: w.z, yaw: rng() * Math.PI * 2 });
    }
  }
  for (let i = sites.length - 1; i > 0; i--) {
    const j = (rng() * (i + 1)) | 0;
    const tmp = sites[i]; sites[i] = sites[j]; sites[j] = tmp;
  }
  const cap = { farmhouse: 28, barn: 18, silo: 12 };
  const used = { farmhouse: 0, barn: 0, silo: 0 };
  const makers = { farmhouse: placeholderFarmhouse, barn: placeholderBarn, silo: placeholderSilo };
  for (let i = 0; i < sites.length; i++) {
    const s = sites[i];
    if (used[s.kind] >= cap[s.kind]) continue;
    const obj = makers[s.kind]();
    const sc = s.kind === "silo" ? 0.62 : (s.kind === "barn" ? 0.78 : 0.7);
    obj.scale.setScalar(sc);
    placeOnGround(obj, s.x, s.z, s.yaw);
    landmarkGroup.add(obj);
    used[s.kind]++;
  }
  LAND.farmhouse = used.farmhouse;
  LAND.barn = used.barn;
  LAND.silo = used.silo;
}

function scatterPathFarms() {
  if (!path.length) return;
  const rng = mulberry(109);
  const step = 640;
  const added = { farmhouse: 0, barn: 0, silo: 0, haybale: 0 };
  for (let s = 480; s < path.len - 400; s += step) {
    const p = pathSample(s + (rng() - 0.5) * 70);
    const side = rng() < 0.5 ? 1 : -1;
    const right = p.heading + Math.PI / 2;
    let x, z, ok = false;
    for (let k = 0; k < 7; k++) {
      const dist = 180 + rng() * 140 + k * 28;
      x = p.x + Math.sin(right) * side * dist;
      z = p.z + Math.cos(right) * side * dist;
      const cls = coverWorld(x, z);
      if (cls !== 0 && cls !== 4 && cls !== 5) { ok = true; break; }
    }
    if (!ok) continue;
    if (nearHero(x, z, 2000)) continue;
    const yaw = p.heading + (rng() - 0.5) * 0.7;
    const house = placeholderFarmhouse();
    placeOnGround(house, x, z, yaw);
    landmarkGroup.add(house);
    added.farmhouse++;
    const bx = x + Math.sin(yaw + 1.15) * 24;
    const bz = z + Math.cos(yaw + 1.15) * 24;
    if (coverWorld(bx, bz) !== 0) {
      const barn = placeholderBarn();
      placeOnGround(barn, bx, bz, yaw + 0.05);
      landmarkGroup.add(barn);
      added.barn++;
    }
    if (rng() < 0.6) {
      const sx = x + Math.sin(yaw - 0.95) * 16;
      const sz = z + Math.cos(yaw - 0.95) * 16;
      if (coverWorld(sx, sz) !== 0) {
        const silo = placeholderSilo();
        placeOnGround(silo, sx, sz, yaw);
        landmarkGroup.add(silo);
        added.silo++;
      }
    }
    for (let hi = 0; hi < 4; hi++) {
      const hx = bx + Math.sin(yaw + 0.5 + hi * 0.7) * (9 + hi * 3);
      const hz = bz + Math.cos(yaw + 0.5 + hi * 0.7) * (9 + hi * 3);
      const cls = coverWorld(hx, hz);
      if (cls === 0 || cls === 4) continue;
      const hay = placeholderHay();
      placeOnGround(hay, hx, hz, rng() * 6.28);
      landmarkGroup.add(hay);
      added.haybale++;
    }
  }
  LAND.farmhouse += added.farmhouse;
  LAND.barn += added.barn;
  LAND.silo += added.silo;
}

function skinLandmarks() {
  const night = clock.night;
  const ink = night > 0.45 ? INK_NIGHT : INK;
  for (let i = 0; i < washMats.length; i++) {
    const u = washMats[i].uniforms;
    u.uInkUse.value.set(ink[0] / 255, ink[1] / 255, ink[2] / 255);
    u.uNight.value = night;
  }
  for (let i = 0; i < windowMats.length; i++) {
    const u = windowMats[i].uniforms;
    u.uInkUse.value.set(ink[0] / 255, ink[1] / 255, ink[2] / 255);
    u.uNight.value = night;
  }
}

async function swapInGltfModels() {
  const kinds = ["church", "farmhouse", "barn", "silo", "haybale"];
  const loaded = {};
  for (let i = 0; i < kinds.length; i++) {
    const scene = await tryLoadModel(kinds[i]);
    if (!scene) continue;
    loaded[kinds[i]] = scene;
    styleLoadedModel(scene, kinds[i]);
  }
  if (!Object.keys(loaded).length) return;
  if (loaded.church && churchMesh) {
    const xf = { p: churchMesh.position.clone(), r: churchMesh.rotation.clone() };
    while (churchMesh.children.length) churchMesh.remove(churchMesh.children[0]);
    const proto = loaded.church.clone();
    churchMesh.add(proto);
    churchMesh.position.copy(xf.p);
    churchMesh.rotation.copy(xf.r);
    // Models are authored in meters, origin at ground center.
    churchMesh.scale.set(1.9, 1.9, 1.9);
  }
  function replaceKind(kind, proto) {
    const doomed = [];
    landmarkGroup.children.forEach(function (ch) {
      if (ch.name === kind) doomed.push(ch);
    });
    doomed.forEach(function (ch) {
      const nu = proto.clone();
      nu.name = kind;
      nu.position.copy(ch.position);
      nu.rotation.copy(ch.rotation);
      nu.scale.set(1, 1, 1);
      landmarkGroup.add(nu);
      landmarkGroup.remove(ch);
    });
  }
  if (loaded.farmhouse) replaceKind("farmhouse", loaded.farmhouse);
  if (loaded.barn) replaceKind("barn", loaded.barn);
  if (loaded.silo) replaceKind("silo", loaded.silo);
  if (loaded.haybale) replaceKind("haybale", loaded.haybale);
  if (loaded.haybale && hayMesh) {
    hayMesh.visible = false;
    const n = Math.min(hayMesh.count, 90);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < n; i++) {
      hayMesh.getMatrixAt(i, dummy.matrix);
      dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);
      const b = loaded.haybale.clone();
      b.name = "haybale";
      b.position.copy(dummy.position);
      b.position.y = yOf(heightWorld(dummy.position.x, dummy.position.z));
      b.quaternion.copy(dummy.quaternion);
      b.scale.set(1, 1, 1);
      b.visible = clock.season === "autumn";
      landmarkGroup.add(b);
    }
  }
  skinLandmarks();
  if (glOk && renderer) renderer.render(scene, camera);
}

function buildTown() {
  landmarkGroup = new THREE.Group();
  scene.add(landmarkGroup);

  const church = meta.landmarks.jasper_st_joseph;
  const w = pxToWorld(church[0], church[1]);
  const h = heightPx(church[0], church[1]);
  churchMesh = placeholderChurch();
  churchMesh.position.set(w.x, yOf(h), w.z);
  churchMesh.scale.setScalar(1.9);
  const heroW = pxToWorld(HERO.px, HERO.py);
  churchMesh.rotation.y = Math.atan2(heroW.x - w.x, heroW.z - w.z) + 0.55;
  landmarkGroup.add(churchMesh);
  LAND.church = 1;

  const cv = document.createElement("canvas");
  cv.width = 256; cv.height = 64;
  const ctx = cv.getContext("2d");
  ctx.clearRect(0, 0, 256, 64);
  ctx.font = "28px Literata, Palatino, serif";
  ctx.fillStyle = "rgba(42,33,24,0.8)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("JASPER", 128, 34);
  const tex = new THREE.CanvasTexture(cv);
  tex.flipY = false;
  tex.colorSpace = THREE.NoColorSpace;
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
  labelMesh = new THREE.Mesh(new THREE.PlaneGeometry(180, 45), mat);
  labelMesh.position.set(w.x + 40, yOf(h) + 28, w.z + 20);
  labelMesh.rotation.x = -0.2;
  labelMesh.visible = false;
  scene.add(labelMesh);

  const rng = mulberry(77);
  const wpos = [], wcol = [];
  for (let i = 0; i < 400; i++) {
    const k = (rng() * path.length) | 0;
    const p = path[k];
    const x = p.x + (rng() - 0.5) * 3000, z = p.z + (rng() - 0.5) * 2400;
    const cls = coverWorld(x, z);
    if (cls !== 2 && cls !== 1) continue;
    const hh = heightWorld(x, z);
    wpos.push(x, yOf(hh) + 3 + rng() * 4, z);
    wcol.push(0.95, 0.77, 0.42);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(wpos, 3));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(wcol, 3));
  windowPts = new THREE.Points(geo, new THREE.PointsMaterial({
    size: 2.4, vertexColors: true, transparent: true, opacity: 0, depthWrite: false, sizeAttenuation: false
  }));
  scene.add(windowPts);

  const fpos = [], fcol = [];
  for (let i = 0; i < 180; i++) {
    const k = (rng() * path.length) | 0;
    const p = path[k];
    const x = p.x + (rng() - 0.5) * 1600, z = p.z + (rng() - 0.5) * 1200;
    if (coverWorld(x, z) !== 6 && coverWorld(x, z) !== 7) continue;
    fpos.push(x, yOf(heightWorld(x, z)) + 2 + rng() * 5, z);
    fcol.push(0.95, 0.77, 0.42);
  }
  const fg = new THREE.BufferGeometry();
  fg.setAttribute("position", new THREE.Float32BufferAttribute(fpos, 3));
  fg.setAttribute("color", new THREE.Float32BufferAttribute(fcol, 3));
  firePts = new THREE.Points(fg, new THREE.PointsMaterial({
    size: 2.0, vertexColors: true, transparent: true, opacity: 0, depthWrite: false, sizeAttenuation: false
  }));
  scene.add(firePts);

  scatterBuildings();
  scatterPathFarms();

  const hayN = 90;
  const hayGeo = new THREE.CylinderGeometry(2.2, 2.2, 2.4, 8, 1, false);
  hayGeo.rotateZ(Math.PI / 2);
  hayMesh = new THREE.InstancedMesh(hayGeo, makeWashMat(hexRgb("#C9A66B")), hayN);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), ps = new THREE.Vector3(), sc = new THREE.Vector3();
  let hi = 0;
  for (let tr = 0; tr < 800 && hi < hayN; tr++) {
    const k = (rng() * path.length) | 0;
    const p = path[k];
    const x = p.x + (rng() - 0.5) * 1800, z = p.z + (rng() - 0.5) * 1400;
    if (coverWorld(x, z) !== 7) continue;
    ps.set(x, yOf(heightWorld(x, z)) + 1.2, z);
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rng() * 6.28);
    sc.set(1.6, 1.6, 1.6);
    m.compose(ps, q, sc);
    hayMesh.setMatrixAt(hi++, m);
  }
  hayMesh.count = hi;
  LAND.hay = hi;
  scene.add(hayMesh);
}

function applySkin() {
  const s = SKINS[clock.season];
  const night = clock.night;
  const ink = night > 0.45 ? INK_NIGHT : INK;
  const u = terrainMat && terrainMat.uniforms;
  function set(un, rgb) { un.value.set(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255); }
  if (u) {
    set(u.uField, s.field); set(u.uWheat, s.wheat); set(u.uPlowed, s.plowed);
    set(u.uGrass, s.grass); set(u.uForest, s.forest); set(u.uForestB, s.forestB);
    set(u.uCedar, s.cedar); set(u.uWater, s.water);
    set(u.uInkUse, ink); set(u.uPaper, PAPER);
    u.uNight.value = night;
    u.uTwi.value = clock.twi;
    u.uRising.value = clock.rising ? 1 : 0;
    u.uSnow.value = wx.kind === "snow" ? 1 : 0;
    u.uFog.value = wx.kind === "fog" ? 1 : wx.kind === "rain" ? 0.35 : wx.kind === "storm" ? 0.25 : wx.kind === "snow" ? 0.2 : 0;
    u.uHatch.value = s.hatch;
    u.uRow.value = s.row;
    u.uBend.value = s.bend;
    u.uSeason.value = { spring: 0, summer: 1, autumn: 2, winter: 3 }[clock.season];
    u.uDawnMist.value = (clock.period === "dawn" || (clock.twi > 0.4 && clock.rising)) ? 1 : 0;
    u.uMonth.value = clock.month;
    const cols = skyColors(clock.alt, wx.kind);
    u.uSkyT.value.set(cols[0][0] / 255, cols[0][1] / 255, cols[0][2] / 255);
    u.uSkyM.value.set(cols[1][0] / 255, cols[1][1] / 255, cols[1][2] / 255);
    u.uSkyH.value.set(cols[2][0] / 255, cols[2][1] / 255, cols[2][2] / 255);
    u.uSunDir.value.copy(altAzDir(clock.alt, clock.sunAz));
    u.uMoonDir.value.copy(altAzDir(clock.moonAlt, clock.moonAz));
  }
  if (skyMat) {
    const cols = skyColors(clock.alt, wx.kind);
    skyMat.uniforms.uTop.value.set(cols[0][0] / 255, cols[0][1] / 255, cols[0][2] / 255);
    skyMat.uniforms.uMid.value.set(cols[1][0] / 255, cols[1][1] / 255, cols[1][2] / 255);
    skyMat.uniforms.uHor.value.set(cols[2][0] / 255, cols[2][1] / 255, cols[2][2] / 255);
    skyMat.uniforms.uSunDir.value.copy(altAzDir(clock.alt, clock.sunAz));
    skyMat.uniforms.uMoonDir.value.copy(altAzDir(clock.moonAlt, clock.moonAz));
    skyMat.uniforms.uNight.value = night;
    skyMat.uniforms.uTwi.value = clock.twi;
    skyMat.uniforms.uMilky.value = (clock.season === "summer" && night > 0.5) ? 1 : 0;
  }
  if (moonMat) moonMat.uniforms.uSunDir.value.copy(altAzDir(clock.alt, clock.sunAz));
  if (treeMat) {
    set(treeMat.uniforms.uInkUse, ink);
    treeMat.uniforms.uNight.value = night;
  }
  if (treeMesh) syncTreeFrames();
  function tintGrass(mat) {
    if (!mat) return;
    set(mat.uniforms.uGrass, s.grass);
    set(mat.uniforms.uWheat, s.wheat);
    set(mat.uniforms.uCorn, SKINS.summer.field);
    set(mat.uniforms.uInkUse, ink);
  }
  tintGrass(grassMat);
  tintGrass(clumpMat);
  const grassOn = clock.season !== "winter" || wx.kind === "snow";
  if (grassMesh) grassMesh.visible = grassOn;
  if (clumpMesh) clumpMesh.visible = grassOn;
  if (hayMesh) hayMesh.visible = clock.season === "autumn" && !LAND.fromGltf.haybale;
  if (landmarkGroup) {
    landmarkGroup.children.forEach(function (ch) {
      if (ch.name === "haybale") ch.visible = clock.season === "autumn";
    });
  }
  if (windowPts) windowPts.material.opacity = night > 0.45 ? clamp((night - 0.45) / 0.4, 0, 0.95) : 0;
  if (firePts) firePts.material.opacity = (clock.season === "summer" && night > 0.5) ? 0.85 : 0;
  if (starPts) starPts.visible = night > 0.15;
  if (constLines) constLines.visible = night > 0.25;
  if (moonMesh) moonMesh.visible = clock.moonAlt > -4;
  if (labelMesh) labelMesh.visible = false;
  skinLandmarks();
  body.setAttribute("data-sky", clock.period);
  body.setAttribute("data-season", clock.season);
  body.setAttribute("data-wx", wx.kind);
  const tc = colsOrTheme();
  document.querySelector('meta[name="theme-color"]').setAttribute("content", tc);
  captionEl.style.color = night > 0.4 || clock.period === "dusk" || clock.period === "night" ? "#EDE6D6" : "#2A2118";
  const dtf = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", month: "long", hour: "numeric", minute: "2-digit", hour12: true });
  const parts = dtf.formatToParts(new Date(clock.now));
  const get = (t) => (parts.find((p) => p.type === t) || {}).value || "";
  whenEl.textContent = get("month") + "  " + get("hour") + ":" + get("minute") + " " + get("dayPeriod").toLowerCase();
  if (starPts) placeStars();
}

function colsOrTheme() {
  const c = skyColors(clock.alt, wx.kind)[0];
  return rgbCss(c);
}

function setMoonPos() {
  if (!moonMesh) return;
  const dir = altAzDir(clock.moonAlt, clock.moonAz);
  moonMesh.position.copy(dir.multiplyScalar(6200));
  moonMesh.visible = clock.moonAlt > -4;
}

function placeCamera() {
  const aim = applyFovAndPitch();
  const sample = pathSample(rig.s);
  let x = sample.x, z = sample.z;
  if (rig.side) {
    const right = sample.heading + Math.PI / 2;
    x = sample.x + Math.sin(right) * rig.side;
    z = sample.z + Math.cos(right) * rig.side;
  }
  const ground = heightWorld(x, z);
  // Eye is world meters above the exaggerated surface, so 40-60 m feels like 40-60 m
  // against tree and spire heights, not 40-60 m stretched by EXAG.
  const y = yOf(ground) + rig.eye;
  camera.position.set(x, y, z);
  const church = (meta && meta.landmarks && meta.landmarks.jasper_st_joseph) || [174.3, 444.6];
  const cw = pxToWorld(church[0], church[1]);
  const lookX = (sample.lookX != null) ? sample.lookX : (cw.x - x);
  const lookZ = (sample.lookZ != null) ? sample.lookZ : (cw.z - z);
  const heading = Math.atan2(lookX, lookZ) + (rig.headingOff || 0);
  const pitch = aim.pitch;
  const look = 1800;
  camera.lookAt(
    x + Math.sin(heading) * look * Math.cos(pitch),
    y + Math.sin(pitch) * look,
    z + Math.cos(heading) * look * Math.cos(pitch)
  );
  skyGroup.position.copy(camera.position);
  setMoonPos();
  if (Math.hypot(x - grassState.cx, z - grassState.cz) > 80) fillGrass(x, z);
  return { x, y, z, heading, pitch, horizon: aim.horizon, ground };
}

function geometricHorizon() {
  const aim = applyFovAndPitch();
  return aim.horizon;
}

function pointerToGround(cx, cy) {
  const rect = canvas.getBoundingClientRect();
  const ndc = new THREE.Vector2((cx / rect.width) * 2 - 1, 1 - (cy / rect.height) * 2);
  const ray = new THREE.Raycaster();
  ray.setFromCamera(ndc, camera);
  const hit = terrainMesh ? ray.intersectObject(terrainMesh, false) : [];
  if (hit.length) return hit[0].point;
  const eye = camera.position;
  const dir = ray.ray.direction;
  if (Math.abs(dir.y) < 1e-4) return null;
  const g = yOf(heightWorld(eye.x, eye.z));
  const t = (g - eye.y) / dir.y;
  if (t < 0) return null;
  return new THREE.Vector3(eye.x + dir.x * t, g, eye.z + dir.z * t);
}

function onPointerDown(e) {
  rig.dragging = true;
  rig.lastX = e.clientX;
  rig.lastY = e.clientY;
  canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
}
function onPointerMove(e) {
  const rect = canvas.getBoundingClientRect();
  cursor.sx = e.clientX / rect.width;
  cursor.sy = e.clientY / rect.height;
  const g = pointerToGround(e.clientX, e.clientY);
  if (g) {
    cursor.tx = g.x; cursor.tz = g.z; cursor.ts = 1;
    cursor.active = true;
  } else {
    cursor.ts = 0;
    cursor.active = cursor.sy > targetHorizon() - 0.05;
  }
  if (!rig.dragging) return;
  const dx = e.clientX - rig.lastX, dy = e.clientY - rig.lastY;
  rig.lastX = e.clientX; rig.lastY = e.clientY;
  rig.headingOff += dx * 0.0045;
  rig.s = clamp(rig.s - dy * 1.8, 0, path.len);
  rig.yawVel = 0;
}
function onPointerUp(e) {
  rig.dragging = false;
  try { canvas.releasePointerCapture && canvas.releasePointerCapture(e.pointerId); } catch (err) {}
}
function onPointerLeave() {
  cursor.ts = 0;
  cursor.active = false;
}

function bindInput() {
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointerleave", onPointerLeave);
  canvas.addEventListener("contextmenu", function (e) { e.preventDefault(); });
}

function stepCursor(dt) {
  const k = 40, damp = 6;
  const ax = k * (cursor.tx - cursor.x) - damp * cursor.vx;
  const az = k * (cursor.tz - cursor.z) - damp * cursor.vz;
  const as = k * (cursor.ts - cursor.strength) - damp * cursor.vs;
  cursor.vx += ax * dt; cursor.vz += az * dt; cursor.vs += as * dt;
  cursor.x += cursor.vx * dt; cursor.z += cursor.vz * dt; cursor.strength += cursor.vs * dt;
  cursor.strength = clamp(cursor.strength, 0, 1.4);
}

let strike = null, nextStrike = 0;
function stepLightning(now) {
  if (REDUCE || wx.kind !== "storm") { state.lightning = 0; return 0; }
  if (!nextStrike) nextStrike = now + 1400;
  if (!strike && now > nextStrike) {
    strike = { t: now, x: 0.2 + Math.random() * 0.6, y: 0.08 + Math.random() * 0.18 };
    nextStrike = now + 3200 + Math.random() * 5000;
  }
  if (!strike) { state.lightning = 0; return 0; }
  const e = (now - strike.t) / 1000;
  let v = e < 0.05 ? e / 0.05 : Math.exp(-(e - 0.05) * 11);
  if (e > 0.6) { strike = null; v = 0; }
  state.lightning = v;
  return v;
}

function drawWxOverlay(now, dt) {
  const cv = wxCanvas, ctx = cv.getContext("2d");
  if (!ctx) return;
  const dpr = cv.width / Math.max(1, cv.clientWidth);
  const W = cv.clientWidth, H = cv.clientHeight;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  const kind = wx.kind;
  const night = clock.night;
  if (kind === "fog") {
    const g = ctx.createLinearGradient(0, H * 0.45, 0, H);
    g.addColorStop(0, "rgba(220,224,230,0)");
    g.addColorStop(1, rgbCss([220, 224, 230], 0.55 - night * 0.25));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
  if (!drawWxOverlay.drops) {
    const rng = mulberry(3);
    drawWxOverlay.drops = [];
    for (let i = 0; i < 420; i++) drawWxOverlay.drops.push({ x: rng(), y: rng(), z: 0.4 + rng(), ph: rng() * 6.28 });
  }
  const drops = drawWxOverlay.drops;
  if (kind === "rain" || kind === "storm") {
    ctx.strokeStyle = night > 0.5 ? "rgba(170,190,220,0.35)" : "rgba(200,215,235,0.5)";
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    for (let i = 0; i < drops.length; i++) {
      const r = drops[i];
      if (!state.frozen && !REDUCE) {
        r.y += (1.4 + r.z) * dt;
        r.x -= 0.12 * dt;
        if (r.y > 1.05) { r.y = -0.05; r.x = Math.random() * 1.2; }
      }
      const px = r.x * W, py = r.y * H;
      const dx = (px - cursor.sx * W), dy = (py - cursor.sy * H);
      const dist = Math.hypot(dx, dy);
      const part = dist < 140 ? (140 - dist) / 140 : 0;
      const len = 14 * r.z + 6;
      const sx = -len * 0.18 + (px - cursor.sx * W) * part * 0.08;
      ctx.moveTo(px, py);
      ctx.lineTo(px + sx, py + len);
    }
    ctx.stroke();
  }
  if (kind === "snow") {
    const dl = clamp((clock.alt + 2) / 14, 0, 1);
    const sn = dl < 0.5 ? lerp3([150, 166, 196], [255, 214, 196], dl * 2) : lerp3([255, 214, 196], [255, 255, 255], (dl - 0.5) * 2);
    ctx.fillStyle = rgbCss(sn, lerp(0.42, 0.85, dl));
    for (let i = 0; i < drops.length; i++) {
      const q = drops[i];
      if (!state.frozen && !REDUCE) {
        q.y += 0.06 * q.z * dt;
        q.ph += dt;
        if (q.y > 1.02) q.y = -0.02;
      }
      const nx = q.x * W + Math.sin(q.ph) * 12 * q.z;
      const ny = q.y * H;
      const dist = Math.hypot(nx - cursor.sx * W, ny - cursor.sy * H);
      const part = dist < 130 ? (130 - dist) / 130 : 0;
      ctx.beginPath();
      ctx.arc(nx + (nx - cursor.sx * W) * part * 0.12, ny, 1.2 + q.z * 1.8, 0, 6.28);
      ctx.fill();
    }
  }
  const lit = stepLightning(now);
  if (lit > 0.005) {
    ctx.fillStyle = "rgba(205,215,255," + (lit * 0.22 * (0.45 + night * 0.55)).toFixed(3) + ")";
    ctx.fillRect(0, 0, W, H);
    if (strike) {
      const R = Math.max(W, H) * 0.5;
      const g = ctx.createRadialGradient(strike.x * W, strike.y * H, 0, strike.x * W, strike.y * H, R);
      g.addColorStop(0, "rgba(225,232,255," + (lit * 0.5).toFixed(3) + ")");
      g.addColorStop(1, "rgba(150,165,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }
  }
}

function blinkFireflies(now) {
  if (!firePts || clock.season !== "summer" || clock.night < 0.5) return;
  const arr = firePts.geometry.attributes.color.array;
  for (let i = 0; i < arr.length; i += 3) {
    const on = 0.25 + 0.75 * (0.5 + 0.5 * Math.sin(now * 0.004 + i * 0.37));
    arr[i] = 0.95 * on;
    arr[i + 1] = 0.77 * on;
    arr[i + 2] = 0.42 * on * 0.6;
  }
  firePts.geometry.attributes.color.needsUpdate = true;
}

function constBrighten() {
  if (!constLines || !constLines.visible) return;
  const mid = 0.45 + (cursor.active && cursor.sy < targetHorizon() ? 0.25 : 0);
  constLines.material.opacity = mid;
}

/* ---------- measure ground share ---------- */
const _mask = { rt: null, buf: null };

function measureGroundShare() {
  if (!glOk || !renderer) return { ok: false };
  const w = 640, h = Math.max(8, Math.round(640 * canvas.clientHeight / Math.max(1, canvas.clientWidth)));
  if (!_mask.rt || _mask.rt.width !== w || _mask.rt.height !== h) {
    if (_mask.rt) _mask.rt.dispose();
    _mask.rt = new THREE.WebGLRenderTarget(w, h, { depthBuffer: true, stencilBuffer: false });
    _mask.buf = new Uint8Array(w * h * 4);
  }
  const hide = [];
  [skyGroup, windowPts, firePts, cloudMesh, labelMesh].forEach(function (o) {
    if (o) { hide.push([o, o.visible]); o.visible = false; }
  });
  const oldFog = terrainMat.uniforms.uFog.value;
  const oldMist = terrainMat.uniforms.uDawnMist.value;
  terrainMat.uniforms.uFog.value = 0;
  terrainMat.uniforms.uDawnMist.value = 0;
  const clear = renderer.getClearColor(new THREE.Color()).clone();
  const clearA = renderer.getClearAlpha();
  renderer.setClearColor(0x000000, 1);
  renderer.setRenderTarget(_mask.rt);
  renderer.render(scene, camera);
  renderer.setRenderTarget(null);
  renderer.readRenderTargetPixels(_mask.rt, 0, 0, w, h, _mask.buf);
  renderer.setClearColor(clear, clearA);
  terrainMat.uniforms.uFog.value = oldFog;
  terrainMat.uniforms.uDawnMist.value = oldMist;
  hide.forEach(function (p) { p[0].visible = p[1]; });

  const buf = _mask.buf;
  const tops = new Float32Array(w);
  for (let x = 0; x < w; x++) {
    let top = h;
    for (let y = 0; y < h; y++) {
      const i = ((h - 1 - y) * w + x) * 4;
      if (buf[i] + buf[i + 1] + buf[i + 2] > 18) { top = y; break; }
    }
    tops[x] = top / h;
  }
  const mid0 = Math.floor(w * 0.2), mid1 = Math.floor(w * 0.8);
  const slice = [];
  for (let x = mid0; x < mid1; x++) if (tops[x] < 0.999) slice.push(tops[x]);
  slice.sort(function (a, b) { return a - b; });
  const med = slice.length ? slice[slice.length >> 1] : targetHorizon();
  let groundPixels = 0;
  for (let i = 0; i < buf.length; i += 4) if (buf[i] + buf[i + 1] + buf[i + 2] > 18) groundPixels++;
  return {
    ok: true,
    horizon: +med.toFixed(4),
    geometric: +geometricHorizon().toFixed(4),
    groundShare: +(1 - med).toFixed(4),
    pixelShare: +(groundPixels / (w * h)).toFixed(4),
    width: canvas.clientWidth,
    height: canvas.clientHeight
  };
}

/* ---------- 2D fallback ---------- */
function renderStill(cv) {
  const ctx = cv.getContext("2d");
  const W = cv.width, H = cv.height;
  const cols = skyColors(clock.alt, wx.kind);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, rgbCss(cols[0]));
  g.addColorStop(0.55, rgbCss(cols[1]));
  g.addColorStop(targetHorizon(), rgbCss(cols[2]));
  g.addColorStop(1, rgbCss(lerp3(cols[2], SKINS[clock.season].grass, 0.35)));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const hor = targetHorizon();
  const sample = path.length ? pathSample(rig.s) : { x: 0, z: 0, heading: Math.PI / 2, h: 150 };
  const heading = sample.heading + (rig.headingOff || 0);
  const fov = 48 * RAD;
  for (let sx = 0; sx < W; sx++) {
    const ang = heading + ((sx / W) - 0.5) * fov * 1.4;
    let maxE = -1, col = null;
    for (let dist = 20; dist < 8000; dist += 24 + dist * 0.04) {
      const x = sample.x + Math.sin(ang) * dist;
      const z = sample.z + Math.cos(ang) * dist;
      const h = heightWorld(x, z);
      const elev = Math.atan2((h - (sample.h + rig.eye)) * EXAG, dist);
      const ndc = (targetHorizon() * 2 - 1) - (Math.tan(elev) / Math.tan((48 * RAD) / 2)) * 0; // unused
      const yFrac = hor - (elev / (fov)) * 0.9;
      if (yFrac < maxE) continue;
      maxE = yFrac;
      const cls = coverWorld(x, z);
      const s = SKINS[clock.season];
      col = cls === 0 ? s.water : cls === 4 ? s.forest : cls === 5 ? s.cedar : cls === 7 ? s.field : s.grass;
    }
    if (col) {
      const y0 = clamp(maxE, 0, 1) * H;
      ctx.strokeStyle = rgbCss(col, 0.95);
      ctx.beginPath();
      ctx.moveTo(sx, y0);
      ctx.lineTo(sx, H);
      ctx.stroke();
    }
  }
}

function showFallback() {
  const wrap = document.getElementById("fallback");
  wrap.hidden = false;
  const cv = document.getElementById("still");
  cv.width = window.innerWidth;
  cv.height = window.innerHeight;
  if (heightF32) renderStill(cv);
  canvas.style.display = "none";
  wxCanvas.style.display = "none";
}

/* ---------- loop ---------- */
function setCommonUniforms(t) {
  const cur = new THREE.Vector3(cursor.x, cursor.strength, cursor.z);
  state.wind = wx.kind === "storm" ? 2.4 : wx.kind === "rain" ? 1.5 : 1;
  if (terrainMat) {
    terrainMat.uniforms.uTime.value = t;
    terrainMat.uniforms.uCursor.value.copy(cur);
    terrainMat.uniforms.uLightning.value = state.lightning;
  }
  if (treeMat) {
    treeMat.uniforms.uTime.value = t;
    treeMat.uniforms.uCursor.value.copy(cur);
    treeMat.uniforms.uWind.value = state.wind;
    treeMat.uniforms.uLightning.value = state.lightning;
  }
  if (grassMat) {
    grassMat.uniforms.uTime.value = t;
    grassMat.uniforms.uCursor.value.copy(cur);
    grassMat.uniforms.uWind.value = state.wind;
  }
  if (clumpMat) {
    clumpMat.uniforms.uTime.value = t;
    clumpMat.uniforms.uCursor.value.copy(cur);
    clumpMat.uniforms.uWind.value = state.wind;
  }
}

function startLoop() {
  function tick(now) {
    const dt = state.lastT ? clamp((now - state.lastT) / 1000, 0, 0.08) : 0.016;
    state.lastT = now;
    if (!state.frozen && !REDUCE) {
      rig.s += 18 * dt;
      if (rig.s > path.len) rig.s = 0;
      state.time += dt;
    }
    if (!dbgAt && now - (state._clk || 0) > 30000) {
      state._clk = now;
      refreshClock(Date.now());
      applySkin();
    }
    stepCursor(dt);
    placeCamera();
    layoutClouds(dt);
    setCommonUniforms(state.frozen || REDUCE ? state.time : state.time);
    if (!state.frozen && !REDUCE) blinkFireflies(now);
    constBrighten();
    if (glOk) renderer.render(scene, camera);
    drawWxOverlay(now, dt);
    if (state.ready) {
      state.frameMs.push(dt * 1000);
      if (state.frameMs.length > 240) state.frameMs.shift();
    }
    if (SHOW_HUD) {
      hudEl.hidden = false;
      const m = measureGroundShare();
      const avg = state.frameMs.length ? state.frameMs.reduce(function (a, b) { return a + b; }, 0) / state.frameMs.length : 0;
      hudEl.textContent = clock.season + " " + clock.period + "  " + wx.kind + "\n" +
        "horizon " + (m.horizon * 100).toFixed(1) + "%  ground " + (m.groundShare * 100).toFixed(1) + "%\n" +
        "geom " + (m.geometric * 100).toFixed(1) + "%   " + avg.toFixed(1) + " ms";
    }
    if (state.frozen && REDUCE) return;
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function frameStats() {
  const a = state.frameMs.slice();
  if (!a.length) return { n: 0 };
  a.sort(function (x, y) { return x - y; });
  const sum = a.reduce(function (p, c) { return p + c; }, 0);
  return {
    n: a.length,
    mean: +(sum / a.length).toFixed(2),
    p50: +a[a.length >> 1].toFixed(2),
    p95: +a[Math.min(a.length - 1, Math.floor(a.length * 0.95))].toFixed(2),
    min: +a[0].toFixed(2),
    max: +a[a.length - 1].toFixed(2)
  };
}

function expose() {
  window.__world = {
    ready: true,
    freeze: function (v) { state.frozen = v !== false; },
    unfreeze: function () { state.frozen = false; },
    setPathT: function (t) { rig.s = clamp(t, 0, 1) * path.len; placeCamera(); if (glOk) renderer.render(scene, camera); },
    setCursor: function (nx, ny) {
      cursor.sx = nx; cursor.sy = ny;
      const g = pointerToGround(nx * canvas.clientWidth, ny * canvas.clientHeight);
      if (g) { cursor.tx = g.x; cursor.tz = g.z; cursor.ts = 1; cursor.active = true; cursor.x = g.x; cursor.z = g.z; cursor.strength = 1; }
    },
    measure: measureGroundShare,
    stats: function () {
      const f = frameStats();
      f.veg = { trees: VEG.treesPlaced, blades: VEG.blades, clumps: VEG.clumps, lodNear: LOD_NEAR, lodMid: LOD_MID };
      f.land = { church: LAND.church, farmhouse: LAND.farmhouse, barn: LAND.barn, silo: LAND.silo, hay: LAND.hay, fromGltf: LAND.fromGltf };
      return f;
    },
    state: function () { return { season: clock.season, period: clock.period, wx: wx.kind, at: clock.now, s: rig.s, pathLen: path.len, night: clock.night, alt: clock.alt, reduce: REDUCE, veg: { trees: VEG.treesPlaced, blades: VEG.blades, clumps: VEG.clumps }, land: { church: LAND.church, farmhouse: LAND.farmhouse, barn: LAND.barn, silo: LAND.silo, hay: LAND.hay, fromGltf: LAND.fromGltf } }; },
    _applyWx: function () { applySkin(); },
    hide: function (name, v) {
      const on = v !== false;
      const map = { trees: treeMesh, grass: grassMesh, clumps: clumpMesh, moon: moonMesh, clouds: cloudMesh, church: churchMesh, hay: hayMesh, label: labelMesh, landmarks: landmarkGroup };
      if (map[name]) map[name].visible = !on ? true : false;
      if (name === "moonoff" && moonMesh) moonMesh.visible = false;
    },
    refresh: function (iso) {
      if (iso) { const t = Date.parse(iso); if (!isNaN(t)) refreshClock(t); }
      else refreshClock(parseTime());
      applySkin();
      placeCamera();
      if (glOk) renderer.render(scene, camera);
    }
  };
}

async function init() {
  resize();
  try {
    await loadMap();
  } catch (e) {
    console.error(e);
    showFallback();
    return;
  }
  const qT = parseFloat(qs.get("pathT"));
  rig.s = isFinite(qT) ? clamp(qT, 0, 1) * (path.len || 1) : (path.len * HERO.pathT);
  refreshClock(parseTime());
  if (!glOk) {
    showFallback();
    expose();
    return;
  }
  heightTex = makeHeightTex();
  coverTex = makeCoverTex();
  buildTerrain();
  buildSky();
  buildClouds();
  scatterTrees();
  buildGrass();
  buildTown();
  applySkin();
  await swapInGltfModels();
  bindInput();
  placeCamera();
  fillGrass(camera.position.x, camera.position.z);
  renderer.render(scene, camera);
  drawWxOverlay(performance.now(), 0);
  state.ready = true;
  expose();
  if (!dbgWx) setTimeout(fetchWx, 400);
  startLoop();
}

init().catch(function (e) {
  window.__bootErr = (e && e.message ? e.message : String(e)) + (e && e.stack ? ("\n" + e.stack) : "");
  console.error(e);
  showFallback();
});
