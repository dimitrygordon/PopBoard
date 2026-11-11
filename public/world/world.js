import * as THREE from "../vendor/three/three.module.min.js";

const RAD = Math.PI / 180;
const CELL = 31.25;
const COLS = 1024;
const ROWS = 768;
const EXAG = 2.5;
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
  path = (meta.river_path_px || []).map(function (p, i, arr) {
    const w = pxToWorld(p[0], p[1]);
    return { px: p[0], py: p[1], x: w.x, z: w.z, h: heightPx(p[0], p[1]) };
  });
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
  return { x, z, heading, h: heightWorld(x, z), u: t / L, i, f: u };
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
float coverClass(){
  float r = texture2D(uCover, vUv).r;
  return floor(r * 255.0 + 0.5);
}
float heightM(vec2 uv){
  vec4 tex = texture2D(uHeight, uv);
  return (tex.r * 255.0 * 256.0 + tex.g * 255.0) / 10.0 + 100.0;
}
void main(){
  float cls = coverClass();
  float h = heightM(vUv);
  vec3 N = normalize(vN);
  vec3 V = normalize(cameraPosition - vWorld);
  vec3 L = normalize(mix(uMoonDir, uSunDir, 1.0 - uNight));
  if (L.y < 0.02) L = normalize(vec3(L.x, 0.02, L.z));
  float ndl = clamp(dot(N, L), 0.0, 1.0);
  float shade = mix(0.45, 1.0, ndl);
  vec2 wz = vWorld.xz;
  float n1 = noise21(wz * 0.02);
  float n2 = noise21(wz * 0.08 + 17.0);
  float n3 = noise21(wz * 0.35);

  vec2 plot = floor(wz / 140.0);
  float pid = hash21(plot);
  float isWheat = 0.0;
  if (uSeason > 0.5 && uSeason < 1.5 && uMonth >= 6.0 && uMonth <= 7.0) isWheat = step(0.55, pid);
  float isPlow = 0.0;
  if (uSeason > 1.5 && uSeason < 2.5) isPlow = step(0.5, pid);
  vec3 cropCol = mix(uField, uWheat, isWheat);
  cropCol = mix(cropCol, uPlowed, isPlow);

  vec3 bareForest = mix(uForest, uForestB, smoothstep(0.3, 0.8, n1));
  if (uSeason > 1.5 && uSeason < 2.5) {
    float m = n2;
    if (m < 0.35) bareForest = vec3(0.851, 0.643, 0.255);
    else if (m < 0.60) bareForest = vec3(0.710, 0.337, 0.180);
    else if (m < 0.80) bareForest = vec3(0.541, 0.392, 0.125);
    else bareForest = vec3(0.72, 0.66, 0.52);
  }
  vec2 ts = 1.0 / uSize;
  float c1 = floor(texture2D(uCover, vUv + vec2(ts.x * 2.0, 0.0)).r * 255.0 + 0.5);
  float c2 = floor(texture2D(uCover, vUv + vec2(0.0, ts.y * 2.0)).r * 255.0 + 0.5);
  if (cls > 0.5 && c1 > 0.5 && c2 > 0.5) cls = mix(cls, (cls + c1 + c2) / 3.0, 0.45);

  vec3 col = uGrass;
  if (cls < 0.5) col = uWater;
  else if (cls < 1.5) col = mix(uGrass, vec3(0.62, 0.58, 0.48), 0.55);
  else if (cls < 2.5) col = mix(vec3(0.55, 0.45, 0.38), uPaper, 0.15 + 0.2 * n3);
  else if (cls < 3.5) col = vec3(0.66, 0.53, 0.38);
  else if (cls < 4.5) col = bareForest;
  else if (cls < 5.5) col = uCedar;
  else if (cls < 6.5) col = uGrass;
  else if (cls < 7.5) col = cropCol;
  else col = mix(uGrass, uWater, 0.35 + 0.2 * n1);

  if (uSnow > 0.5 && cls > 0.5) {
    float hold = cls > 3.5 && cls < 6.5 ? 0.55 : 0.88;
    col = mix(col, uSnowCol, hold * (0.85 + 0.15 * n3));
  }

  col = mix(uPaper, col, 0.92);
  col *= mix(vec3(1.0), uNightMul * 1.15, uNight * 0.92);
  col *= shade;
  col += uRim * uTwi * pow(clamp(dot(N, uSunDir), 0.0, 1.0), 4.0) * 0.55;

  // crop rows
  if (cls > 6.5 && cls < 7.5 && uSnow < 0.5) {
    float ang = pid > 0.5 ? 0.0 : 1.5708;
    float row = dot(wz, vec2(cos(ang), sin(ang)));
    float sp = 5.5;
    float g = abs(fract(row / sp) - 0.5);
    float inkA = 0.28 * uRow;
    if (uSeason > 1.5 && uSeason < 2.5) inkA *= step(0.2, fract(row * 0.15 + pid));
    if (uSeason > 2.5) inkA *= 0.55;
    col = mix(col, uInkUse, (1.0 - smoothstep(0.0, 0.18, g)) * inkA);
  }

  // water ripples and glint
  if (cls < 0.5) {
    float rip = sin(wz.x * 0.35 + uTime * 1.6) * 0.5 + sin(wz.y * 0.5 + uTime * 1.1) * 0.5;
    float cd = length(wz - uCursor.xz);
    rip += 0.8 * sin(cd * 0.25 - uTime * 3.0) * exp(-cd * 0.012) * uCursor.y;
    float line = abs(fract((wz.x + wz.y) * 0.12 + rip * 0.15) - 0.5);
    col = mix(col, uInkUse, (1.0 - smoothstep(0.0, 0.08, line)) * 0.28);
    vec3 R = reflect(-L, N);
    float spec = pow(clamp(dot(R, V), 0.0, 1.0), 80.0);
    float fres = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 3.0);
    col += mix(uRim, uPaper, 1.0 - uNight) * (spec * 2.2 + fres * 0.35);
  }

  // contours every 10 m, heavier every 50 m
  float hw = h + (n3 - 0.5) * 0.6;
  float c10 = abs(fract(hw / 10.0) - 0.5);
  float fw = fwidth(hw / 10.0) + 0.001;
  float l10 = 1.0 - smoothstep(0.0, fw * 0.9, c10);
  float c50 = abs(fract(hw / 50.0) - 0.5);
  float fw5 = fwidth(hw / 50.0) + 0.001;
  float l50 = 1.0 - smoothstep(0.0, fw5 * 0.7, c50);
  float contour = max(l10 * 0.35, l50 * 0.7);
  if (cls < 0.5) contour *= 0.15;
  col = mix(col, uInkUse, contour);

  // hatching on shaded slopes
  float hatchAmt = clamp((0.42 - ndl) / 0.42, 0.0, 1.0) * (1.0 - uSnow * 0.6);
  if (cls > 0.5 && hatchAmt > 0.02) {
    vec2 fc = gl_FragCoord.xy + vec2(n3 * 2.0);
    float spc = uHatch;
    float h45 = abs(fract(dot(fc, vec2(0.707, 0.707)) / spc) - 0.5);
    float hat = 1.0 - smoothstep(0.0, 0.16, h45);
    if (uSeason > 1.5 && uSeason < 2.5 && uTwi > 0.3) {
      float h135 = abs(fract(dot(fc, vec2(-0.707, 0.707)) / (spc * 1.15)) - 0.5);
      hat = max(hat, 1.0 - smoothstep(0.0, 0.16, h135));
    }
    col = mix(col, uInkUse, hat * hatchAmt * 0.28);
  }

  // paper grain
  col *= 0.96 + 0.08 * noise21(wz * 0.6);
  col += (n3 - 0.5) * 0.03;

  // keep land darker than the sky so the horizon reads as a silhouette band
  float dist = length(vWorld - cameraPosition);
  float graze = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 1.8);
  col *= 0.78 + 0.22 * ndl;
  col = mix(col, uInkUse * mix(0.55, 1.2, uNight), graze * 0.22 * (1.0 - uSnow * 0.5));

  // dawn valley mist, close range only
  if (uDawnMist > 0.01) {
    float valley = clamp((165.0 - h) / 40.0, 0.0, 1.0);
    float mist = uDawnMist * valley * smoothstep(60.0, 700.0, dist) * exp(-dist * 0.0007) * 0.28;
    col = mix(col, uPaper * mix(1.0, 0.45, uNight), mist);
  }

  // weather fog only (valleys first). Clear air keeps the engraved land sharp.
  float fogH = mix(0.0, 0.00022, uFog);
  float valleyF = mix(1.0, 1.8, clamp((160.0 - h) / 50.0, 0.0, 1.0) * uFog);
  float fog = 1.0 - exp(-dist * fogH * valleyF);
  vec3 fogC = mix(uSkyH, uPaper, 0.35 + 0.3 * uFog);
  fogC = mix(fogC, uNightMul * 0.85, uNight * 0.7);
  col = mix(col, fogC, clamp(fog, 0.0, 0.75));

  col += uLightning * 0.45 * vec3(0.85, 0.9, 1.0);

  // developed rooftops: tiny ink rectangles
  if (cls > 1.5 && cls < 2.5) {
    vec2 room = fract(wz / 18.0);
    float roof = step(0.25, room.x) * step(room.x, 0.78) * step(0.3, room.y) * step(room.y, 0.8);
    col = mix(col, mix(vec3(0.42, 0.32, 0.26), uInkUse, 0.3), roof * 0.7);
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
uniform float uNight, uTwi, uSunSize, uMilky;
varying vec3 vDir;
void main(){
  vec3 d = normalize(vDir);
  float h = d.y;
  float t = clamp(h * 0.5 + 0.5, 0.0, 1.0);
  vec3 col;
  if (h > 0.15) col = mix(uMid, uTop, clamp((h - 0.15) / 0.85, 0.0, 1.0));
  else if (h > 0.0) col = mix(uHor, uMid, h / 0.15);
  else col = mix(uHor, uHor * 0.7, clamp(-h * 2.0, 0.0, 1.0));
  float sun = pow(clamp(dot(d, normalize(uSunDir)), 0.0, 1.0), 400.0);
  float glow = pow(clamp(dot(d, normalize(uSunDir)), 0.0, 1.0), 16.0);
  if (uSunDir.y > -0.08) {
    col += vec3(1.0, 0.92, 0.75) * sun * 1.4 * (1.0 - uNight);
    col += vec3(1.0, 0.7, 0.4) * glow * 0.35 * (1.0 - uNight * 0.6);
  }
  if (uMilky > 0.01 && uNight > 0.4) {
    vec3 mw = normalize(vec3(0.35, 0.15, 0.9));
    float band = 1.0 - abs(dot(d, mw));
    col += vec3(0.7, 0.72, 0.9) * smoothstep(0.15, 0.0, 1.0 - band) * 0.18 * uMilky * uNight;
  }
  gl_FragColor = vec4(col, 1.0);
}
`;

const SPRITE_VERT = /* glsl */`
attribute vec2 iScale;
attribute float iFrame;
attribute float iPhase;
attribute float iKind;
uniform float uTime;
uniform vec3 uCursor;
uniform float uWind;
uniform float uRuffle;
uniform float uReduce;
varying vec2 vUv;
varying float vFrame;
varying float vKind;
varying float vShade;
void main(){
  vUv = uv;
  vFrame = iFrame;
  vKind = iKind;
  vec3 iPos = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  vec3 camR = normalize(vec3(cameraPosition.z - iPos.z, 0.0, iPos.x - cameraPosition.x));
  if (length(camR) < 0.001) camR = vec3(1.0, 0.0, 0.0);
  vec3 camU = vec3(0.0, 1.0, 0.0);
  float wind = sin(uTime * (1.1 + iPhase) + iPos.x * 0.03) * 0.08 * uWind * (1.0 - uReduce);
  float d = length(iPos.xz - uCursor.xz);
  float infl = exp(-d * d / (140.0 * 140.0)) * uCursor.y * uRuffle;
  float tilt = (wind + infl * sin(uTime * 18.0 + iPhase * 6.28) * 0.35) * uv.y;
  vec3 p = iPos + camR * ((position.x + tilt) * iScale.x) + camU * (position.y * iScale.y);
  vShade = 0.85 + 0.15 * sin(iPhase * 20.0);
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
void main(){
  float cols = uAtlasGrid.x;
  float fx = fract(vFrame);
  float ix = floor(vFrame);
  vec2 cell = vec2(mod(ix, cols), floor(ix / cols));
  vec2 uv = (vUv + cell) / uAtlasGrid;
  vec4 s = texture2D(uAtlas, uv);
  if (s.a < 0.18) discard;
  vec3 col = s.rgb * vShade;
  col = mix(col, uInkUse, 0.12 * (1.0 - uNight));
  col += uLightning * 0.3;
  gl_FragColor = vec4(col, s.a);
}
`;

const GRASS_VERT = /* glsl */`
attribute vec2 iScale;
attribute float iPhase;
attribute float iKind;
uniform float uTime;
uniform vec3 uCursor;
uniform float uWind;
uniform float uReduce;
uniform float uK;
varying float vKind;
varying float vY;
void main(){
  vKind = iKind;
  vY = uv.y;
  vec3 iPos = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  float d = length(iPos.xz - uCursor.xz);
  vec2 away = iPos.xz - uCursor.xz;
  if (length(away) < 0.001) away = vec2(1.0, 0.0);
  away = normalize(away);
  float infl = exp(-d * d / (90.0 * 90.0)) * uCursor.y;
  float wind = sin(uTime * 1.6 + iPhase * 6.28 + iPos.x * 0.08) * 0.12 * uWind;
  float bend = (wind + infl * 0.7) * (1.0 - uReduce) * uv.y * uv.y;
  vec3 camR = normalize(vec3(cameraPosition.z - iPos.z, 0.0, iPos.x - cameraPosition.x));
  if (length(camR) < 0.001) camR = vec3(1.0, 0.0, 0.0);
  vec3 p = iPos;
  p.xz += away * bend * iScale.y * 0.6;
  p += camR * (position.x * iScale.x);
  p.y += position.y * iScale.y * (1.0 - infl * 0.15);
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}
`;

const GRASS_FRAG = /* glsl */`
uniform vec3 uGrass, uWheat, uInkUse;
varying float vKind;
varying float vY;
void main(){
  vec3 col = mix(uGrass, uWheat, step(0.5, vKind));
  col = mix(col, uInkUse, 0.25 * (1.0 - vY));
  gl_FragColor = vec4(col, 0.92);
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
  side: 120,
  eye: 34,
  dragging: false,
  lastX: 0, lastY: 0,
  yawVel: 0
};

function targetHorizon() {
  const aspect = camera.aspect;
  if (aspect < 0.7) return 0.72;
  if (aspect < 1.1) return 0.76;
  return 0.80;
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
let churchMesh, labelMesh;

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
      const cls = coverPx(px, py);
      if (cls === 4 || cls === 5) {
        const n = Math.sin(px * 1.7) * Math.cos(py * 1.3) * 0.5 + 0.5;
        h += (cls === 5 ? 11 : 8) + n * 8;
      }
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
  for (let i = 0; i < 9; i++) {
    const cx = 80 + rng() * 350, cy = 80 + rng() * 100, rx = 50 + rng() * 90, ry = 28 + rng() * 40;
    const grd = g.createRadialGradient(cx, cy, 8, cx, cy, rx);
    grd.addColorStop(0, "rgba(255,255,255,0.95)");
    grd.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grd;
    g.beginPath();
    g.ellipse(cx, cy, rx, ry, (rng() - 0.5) * 0.5, 0, Math.PI * 2);
    g.fill();
  }
  g.globalCompositeOperation = "source-atop";
  g.strokeStyle = "rgba(42,33,24,0.22)";
  g.lineWidth = 1;
  for (let y = 20; y < 240; y += 7) {
    g.beginPath();
    for (let x = 10; x < 500; x += 6) {
      const yy = y + Math.sin(x * 0.04 + y) * 2;
      if (x === 10) g.moveTo(x, yy); else g.lineTo(x, yy);
    }
    g.stroke();
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.NoColorSpace;
  return tex;
}

const clouds = [];
function buildClouds() {
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
      alt: 0.12 + rng() * 0.35,
      r: 1800 + rng() * 3200,
      sx: 420 + rng() * 700,
      sy: 180 + rng() * 260,
      phase: rng() * 6.28,
      part: 0
    });
  }
}

function layoutClouds(dt) {
  if (!cloudMesh) return;
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
  const look = new THREE.Vector3();
  camera.getWorldDirection(look);
  const nCloud = wx.kind === "clear" ? 2 : wx.kind === "partly" ? 7 : 16;
  const hide = wx.kind === "clear" && clock.period === "night" ? 1 : nCloud;
  cloudMesh.count = hide;
  cloudMesh.material.opacity = (clock.night > 0.5 ? 0.55 : 0.82) * (wx.kind === "storm" ? 0.92 : 0.8);
  const tint = clock.night > 0.5 ? 0x5a6480 : clock.twi > 0.4 ? 0xd9a090 : 0xf4f6fa;
  cloudMesh.material.color.setHex(tint);
  for (let i = 0; i < 16; i++) {
    const c = clouds[i];
    if (!state.frozen) c.az += dt * 0.012 * (wx.kind === "storm" ? 2.2 : 1);
    const alt = c.alt, az = c.az;
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
    s.set(c.sx * (1 + c.part * 0.2), c.sy * (1 - c.part * 0.15), 1);
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

function makeTreeAtlas() {
  const COL = 8, ROW = 4, S = 128;
  const cv = document.createElement("canvas");
  cv.width = COL * S; cv.height = ROW * S;
  const ctx = cv.getContext("2d");
  function cell(i, j, draw) {
    ctx.save();
    ctx.translate(i * S, j * S);
    draw(ctx, S, mulberry(101 + i * 13 + j * 91));
    ctx.restore();
  }
  function trunk(ctx, s, rng, cx, top) {
    ctx.strokeStyle = "rgba(42,33,24,0.9)";
    ctx.lineWidth = 1.3 + rng() * 0.8;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(cx + (rng() - 0.5) * 2, s * 0.96);
    ctx.quadraticCurveTo(cx + (rng() - 0.5) * 5, s * 0.78, cx + (rng() - 0.5) * 3, top);
    ctx.stroke();
  }
  function leafy(ctx, s, rng, fill, blossom) {
    const cx = s * 0.5, cy = s * 0.46;
    trunk(ctx, s, rng, cx, cy + s * 0.16);
    const n = 3 + (rng() * 3 | 0);
    for (let i = 0; i < n; i++) {
      const ox = (rng() - 0.5) * s * 0.24, oy = (rng() - 0.5) * s * 0.2;
      const r = s * (0.15 + rng() * 0.15);
      ctx.fillStyle = fill;
      ctx.globalAlpha = 0.72 + rng() * 0.22;
      drawWobblyCircle(ctx, cx + ox, cy + oy, r, rng);
      ctx.fill();
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = "rgba(42,33,24,0.72)";
      ctx.lineWidth = 1 + rng() * 0.7;
      ctx.stroke();
    }
    if (blossom) {
      ctx.globalAlpha = 0.9;
      for (let k = 0; k < 10; k++) {
        ctx.fillStyle = rng() > 0.45 ? "#F2D6E0" : "#F7F4EA";
        ctx.beginPath();
        ctx.arc(cx + (rng() - 0.5) * s * 0.4, cy + (rng() - 0.5) * s * 0.32, 1.6 + rng() * 2.2, 0, 6.28);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }
  function bare(ctx, s, rng) {
    const cx = s * 0.5;
    ctx.strokeStyle = "rgba(42,33,24,0.92)";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(cx, s * 0.96);
    ctx.lineTo(cx + (rng() - 0.5) * 4, s * 0.38);
    ctx.stroke();
    const branches = 5 + (rng() * 4 | 0);
    for (let i = 0; i < branches; i++) {
      const y = s * (0.4 + rng() * 0.42);
      const len = s * (0.12 + rng() * 0.22);
      const dir = rng() > 0.5 ? 1 : -1;
      const a = (0.3 + rng() * 0.7) * dir;
      ctx.lineWidth = 0.7 + rng() * 0.7;
      ctx.beginPath();
      ctx.moveTo(cx, y);
      ctx.quadraticCurveTo(cx + dir * len * 0.5, y - len * 0.3, cx + Math.cos(a) * len, y - Math.sin(Math.abs(a)) * len);
      ctx.stroke();
      if (rng() > 0.4) {
        const bx = cx + Math.cos(a) * len * 0.7, by = y - Math.sin(Math.abs(a)) * len * 0.7;
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(bx + dir * len * 0.35, by - len * 0.25);
        ctx.stroke();
      }
    }
  }
  function cedar(ctx, s, rng) {
    const cx = s * 0.5;
    trunk(ctx, s, rng, cx, s * 0.22);
    ctx.fillStyle = "#3E5A45";
    ctx.strokeStyle = "rgba(42,33,24,0.75)";
    const layers = 4 + (rng() * 2 | 0);
    for (let i = 0; i < layers; i++) {
      const y = s * (0.22 + i * 0.14);
      const w = s * (0.12 + i * 0.07) * (0.85 + rng() * 0.25);
      const h = s * 0.16;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.moveTo(cx + (rng() - 0.5) * 3, y - h * 0.7);
      ctx.lineTo(cx - w, y + h * 0.5);
      ctx.lineTo(cx + w, y + h * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.strokeStyle = "rgba(42,33,24,0.35)";
      for (let x = -w; x < w; x += 4) {
        ctx.beginPath();
        ctx.moveTo(cx + x, y + h * 0.4);
        ctx.lineTo(cx + x * 0.3, y - h * 0.2);
        ctx.stroke();
      }
      ctx.strokeStyle = "rgba(42,33,24,0.75)";
    }
  }
  const springFill = ["#7FA866", "#6E9A58", "#8BB36E", "#5E8A4A"];
  const summerFill = ["#2F5D46", "#3A6B50", "#4E7D57", "#2A5340"];
  const autumnFill = ["#D9A441", "#B5562E", "#8A6420", "#C9842C", "#A65A32", "#D9A441", "#8A6420", "#B5562E"];
  const leaf0 = clock.season === "spring" ? springFill : summerFill;
  for (let i = 0; i < 8; i++) cell(i, 0, function (c, s, r) { leafy(c, s, r, leaf0[i % 4], false); });
  for (let i = 0; i < 8; i++) cell(i, 1, function (c, s, r) { leafy(c, s, r, autumnFill[i], false); });
  for (let i = 0; i < 8; i++) cell(i, 2, function (c, s, r) { bare(c, s, r); });
  for (let i = 0; i < 4; i++) cell(i, 3, function (c, s, r) { cedar(c, s, r); });
  for (let i = 4; i < 8; i++) cell(i, 3, function (c, s, r) { leafy(c, s, r, springFill[i % 4], true); });
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.NoColorSpace;
  tex.flipY = false;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

function pickTreeFrame(cls, season, rng) {
  if (cls === 5) return 24 + (rng() * 4 | 0);
  if (season === "winter") return cls === 5 ? 24 + (rng() * 4 | 0) : (rng() < 0.18 ? 24 + (rng() * 4 | 0) : 16 + (rng() * 8 | 0));
  if (season === "autumn") {
    if (rng() < 0.20) return 16 + (rng() * 8 | 0);
    return 8 + (rng() * 8 | 0);
  }
  if (season === "spring") return rng() < 0.08 ? 28 + (rng() * 4 | 0) : (rng() * 8 | 0);
  return rng() * 8 | 0;
}

function scatterTrees() {
  const rng = mulberry(2026);
  const maxN = 5200;
  const pos = [], scale = [], frame = [], phase = [], kind = [];
  const half = 1500;
  for (let k = 0; k < path.length; k++) {
    const p = path[k];
    const tries = 520;
    for (let t = 0; t < tries && pos.length / 3 < maxN; t++) {
      const ox = (rng() - 0.5) * 2 * half, oz = (rng() - 0.5) * 2 * half;
      const x = p.x + ox, z = p.z + oz;
      const wp = worldToPx(x, z);
      if (wp.px < 2 || wp.py < 2 || wp.px > COLS - 3 || wp.py > ROWS - 3) continue;
      const cls = coverPx(wp.px, wp.py);
      if (cls === 0 || cls === 2 || cls === 3) continue;
      if (cls === 1 && rng() > 0.12) continue;
      if (cls === 6 && rng() > 0.08) continue;
      if (cls === 7 && rng() > 0.03) continue;
      if (cls === 8 && rng() > 0.2) continue;
      if (cls === 4 && rng() > 0.85) continue;
      const h = heightPx(wp.px, wp.py);
      const tall = cls === 5 ? 16 + rng() * 8 : 11 + rng() * 9;
      pos.push(x, yOf(h), z);
      const w = tall * (0.55 + rng() * 0.25) * (cls === 5 ? 0.7 : 1);
      scale.push(w * 2.4, tall * 2.6);
      frame.push(pickTreeFrame(cls, clock.season, rng));
      phase.push(rng());
      kind.push(cls === 5 ? 1 : 0);
    }
  }
  const n = pos.length / 3;
  const plane = new THREE.PlaneGeometry(1, 1);
  plane.translate(0, 0.5, 0);
  plane.setAttribute("iScale", new THREE.InstancedBufferAttribute(new Float32Array(scale), 2));
  plane.setAttribute("iFrame", new THREE.InstancedBufferAttribute(new Float32Array(frame), 1));
  plane.setAttribute("iPhase", new THREE.InstancedBufferAttribute(new Float32Array(phase), 1));
  plane.setAttribute("iKind", new THREE.InstancedBufferAttribute(new Float32Array(kind), 1));
  treeMat = new THREE.ShaderMaterial({
    uniforms: {
      uAtlas: { value: makeTreeAtlas() },
      uAtlasGrid: { value: new THREE.Vector2(8, 4) },
      uTime: { value: 0 },
      uCursor: { value: new THREE.Vector3() },
      uWind: { value: 1 },
      uRuffle: { value: 1 },
      uReduce: { value: REDUCE ? 1 : 0 },
      uInkUse: { value: colU(INK) },
      uNight: { value: 0 },
      uLightning: { value: 0 }
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

const grassState = { cx: 1e9, cz: 1e9 };
function buildGrass() {
  const N = 2800;
  const plane = new THREE.PlaneGeometry(1, 1);
  plane.translate(0, 0.5, 0);
  plane.setAttribute("iScale", new THREE.InstancedBufferAttribute(new Float32Array(N * 2), 2));
  plane.setAttribute("iPhase", new THREE.InstancedBufferAttribute(new Float32Array(N), 1));
  plane.setAttribute("iKind", new THREE.InstancedBufferAttribute(new Float32Array(N), 1));
  grassMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uCursor: { value: new THREE.Vector3() },
      uWind: { value: 1 },
      uReduce: { value: REDUCE ? 1 : 0 },
      uK: { value: 40 },
      uGrass: { value: colU(SKINS.autumn.grass) },
      uWheat: { value: colU(SKINS.autumn.wheat) },
      uInkUse: { value: colU(INK) }
    },
    vertexShader: GRASS_VERT,
    fragmentShader: GRASS_FRAG,
    transparent: true,
    depthWrite: false
  });
  grassMesh = new THREE.InstancedMesh(plane, grassMat, N);
  grassMesh.frustumCulled = false;
  scene.add(grassMesh);
  grassMesh._pos = new Float32Array(N * 3);
}

function fillGrass(cx, cz) {
  if (!grassMesh) return;
  const rng = mulberry((cx * 13 + cz * 7) | 0);
  const pos = grassMesh._pos;
  const scale = grassMesh.geometry.attributes.iScale.array;
  const phase = grassMesh.geometry.attributes.iPhase.array;
  const kind = grassMesh.geometry.attributes.iKind.array;
  let n = 0, tries = 0;
  const rad = 220;
  const season = clock.season;
  const wheatOn = season === "summer" && clock.month >= 6 && clock.month <= 7;
  while (n < 2800 && tries < 9000) {
    tries++;
    const a = rng() * 6.28, r = Math.sqrt(rng()) * rad;
    const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
    const cls = coverWorld(x, z);
    if (cls !== 6 && cls !== 7 && cls !== 8) continue;
    if (season === "winter" && wx.kind !== "snow" && rng() > 0.35) continue;
    if (season === "autumn" && cls === 7) continue;
    const h = heightWorld(x, z);
    pos[n * 3] = x; pos[n * 3 + 1] = yOf(h); pos[n * 3 + 2] = z;
    const isWheat = wheatOn && cls === 7 && rng() > 0.3;
    const tall = isWheat ? 1.6 + rng() * 0.8 : (cls === 7 ? 1.3 + rng() * 0.7 : 0.6 + rng() * 0.5);
    scale[n * 2] = 0.12 + rng() * 0.1;
    scale[n * 2 + 1] = tall * (season === "spring" ? 0.55 : 1) * EXAG * 0.55;
    phase[n] = rng();
    kind[n] = isWheat ? 1 : 0;
    n++;
  }
  const dummy = new THREE.Object3D();
  for (let i = 0; i < n; i++) {
    dummy.position.set(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    grassMesh.setMatrixAt(i, dummy.matrix);
  }
  grassMesh.count = n;
  grassMesh.instanceMatrix.needsUpdate = true;
  grassMesh.geometry.attributes.iScale.needsUpdate = true;
  grassMesh.geometry.attributes.iPhase.needsUpdate = true;
  grassMesh.geometry.attributes.iKind.needsUpdate = true;
  grassState.cx = cx; grassState.cz = cz;
}

function buildTown() {
  const church = meta.landmarks.jasper_st_joseph;
  const w = pxToWorld(church[0], church[1]);
  const h = heightPx(church[0], church[1]);
  const g = new THREE.Group();
  const ink = new THREE.MeshBasicMaterial({ color: 0x2A2118 });
  const base = new THREE.Mesh(new THREE.BoxGeometry(9, 14, 9), ink);
  base.position.y = 7;
  const spire = new THREE.Mesh(new THREE.ConeGeometry(3.2, 22, 4), ink);
  spire.position.y = 25;
  g.add(base); g.add(spire);
  g.position.set(w.x, yOf(h), w.z);
  g.scale.setScalar(2.2);
  churchMesh = g;
  scene.add(g);

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

  const hayN = 90;
  const hayGeo = new THREE.CylinderGeometry(2.2, 2.2, 2.4, 8, 1, false);
  hayGeo.rotateZ(Math.PI / 2);
  const hayMat = new THREE.MeshBasicMaterial({ color: 0xC9A66B });
  hayMesh = new THREE.InstancedMesh(hayGeo, hayMat, hayN);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), ps = new THREE.Vector3(), sc = new THREE.Vector3();
  let hi = 0;
  for (let t = 0; t < 800 && hi < hayN; t++) {
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
  if (grassMat) {
    set(grassMat.uniforms.uGrass, s.grass);
    set(grassMat.uniforms.uWheat, s.wheat);
    set(grassMat.uniforms.uInkUse, ink);
    const show = !(clock.season === "winter" && wx.kind !== "snow") || clock.season !== "winter";
    grassMesh.visible = clock.season !== "winter" || wx.kind === "snow";
  }
  if (hayMesh) hayMesh.visible = clock.season === "autumn";
  if (windowPts) windowPts.material.opacity = night > 0.45 ? clamp((night - 0.45) / 0.4, 0, 0.95) : 0;
  if (firePts) firePts.material.opacity = (clock.season === "summer" && night > 0.5) ? 0.85 : 0;
  if (starPts) starPts.visible = night > 0.15;
  if (constLines) constLines.visible = night > 0.25;
  if (moonMesh) moonMesh.visible = clock.moonAlt > -4;
  if (labelMesh) {
    const nightInk = night > 0.5;
    labelMesh.material.color.set(nightInk ? 0xEDE6D6 : 0xffffff);
    labelMesh.material.opacity = nightInk ? 0.7 : 0.9;
  }
  if (churchMesh) {
    churchMesh.children.forEach(function (ch) {
      ch.material.color.set(night > 0.5 ? 0xEDE6D6 : 0x2A2118);
    });
  }
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
  const right = sample.heading + Math.PI / 2;
  let x = sample.x + Math.sin(right) * rig.side;
  let z = sample.z + Math.cos(right) * rig.side;
  if (coverWorld(x, z) === 0) {
    x = sample.x - Math.sin(right) * rig.side;
    z = sample.z - Math.cos(right) * rig.side;
  }
  const ground = heightWorld(x, z);
  const y = yOf(ground + rig.eye);
  camera.position.set(x, y, z);
  const heading = sample.heading + rig.headingOff;
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
    stats: frameStats,
    state: function () { return { season: clock.season, period: clock.period, wx: wx.kind, at: clock.now, s: rig.s, pathLen: path.len, night: clock.night, alt: clock.alt, reduce: REDUCE }; },
    _applyWx: function () { applySkin(); },
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
  rig.s = isFinite(qT) ? clamp(qT, 0, 1) * (path.len || 1) : (path.len * 0.38);
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
  console.error(e);
  showFallback();
});
