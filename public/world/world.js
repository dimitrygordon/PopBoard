import * as THREE from "../vendor/three/three.module.min.js";
import { GLTFLoader } from "../vendor/three/GLTFLoader.js";
import { MeshoptDecoder } from "../vendor/three/meshopt_decoder.mjs";

const RAD = Math.PI / 180;
const CELL = 31.25;
const COLS = 1024;
const ROWS = 1280;
// World origin stays on the original 1024 x 768 map center so Jasper
// coordinates and the hero path do not shift when the DEM grows south.
const ORIGIN_PX = 511.5;
const ORIGIN_PY = 383.5;
const EXAG = 2.9;
const HERO = { px: 218, py: 509, eye: 36, pathT: 0.5 };

// Real-world cells (EPSG:5070). Church is at St. Joseph on Kundek/Newton,
// courthouse at Courthouse Square, southern sites at published lat/lon.
const LANDMARK_SITES = {
  jasper_st_joseph:        { px: 168.49, py: 429.67, file: "st_joseph_church.glb", kind: "church", place: true, note: "38.39571, -86.932687, 1029 Kundek St" },
  jasper_courthouse:       { px: 174.34, py: 444.64, file: "jasper_courthouse.glb", kind: "courthouse", place: true, note: "38.3914, -86.9311, One Courthouse Square" },
  jasper_city_mill:        { px: 185.5, py: 458.6, file: "jasper_city_mill.glb", kind: "mill", place: true, note: "south bank of the Patoka, in the hero gap" },
  jasper_depot:            { px: 180.5, py: 456.2, file: "jasper_depot.glb", kind: "depot", place: true, note: "201 Mill St, in the hero mid-ground" },
  huntingburg_town_hall:   { px: 136.08, py: 795.64, file: "huntingburg_town_hall.glb", kind: "townhall", place: true, note: "38.2950, -86.9569, historic Town Hall at 311 Geiger St" },
  league_stadium:          { px: 170.18, py: 809.34, file: "league_stadium.glb", kind: "stadium", place: true, note: "38.290294, -86.945125, 203 S Cherry St" },
  ferdinand_monastery:     { px: 449.75, py: 1024.74, file: "ferdinand_monastery.glb", kind: "monastery", place: true, note: "38.22306, -86.85222, Monastery Immaculate Conception" },
  saint_meinrad_archabbey: { px: 577.98, py: 1214.64, file: "saint_meinrad_archabbey.glb", kind: "archabbey", place: true, note: "38.1669178, -86.8128323, 200 Hill Drive" }
};
const BASE_M = 100;
const JASPER = { lat: 38.3914, lon: -86.9311 };
const REDUCE = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

const qs = new URLSearchParams(location.search);
const dbgSky = qs.get("sky");
const dbgWx = qs.get("wx");
const dbgStrike = (qs.get("strike") || "").toLowerCase();
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

/* az from south, westward.
   World is a right-handed geographic frame: +X east, +Y up, -Z north. */
function altAzDir(altDeg, azRad) {
  const alt = altDeg * RAD;
  const ca = Math.cos(alt), sa = Math.sin(alt);
  // South (az = 0) is +Z, west (pi/2) is -X, north (pi) is -Z, east is +X.
  return new THREE.Vector3(-Math.sin(azRad) * ca, sa, Math.cos(azRad) * ca);
}
function compassFromDir(dir) {
  // 0 = north (-Z), 90 = east (+X)
  let deg = Math.atan2(dir.x, -dir.z) * 180 / Math.PI;
  if (deg < 0) deg += 360;
  return deg;
}
function offsetNorth(azRad, dist) {
  // az 0 = north (-Z), pi/2 = east (+X)
  return { x: Math.sin(azRad) * dist, z: -Math.cos(azRad) * dist };
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

function loadSkyCat() {
  if (SKY_CAT) return Promise.resolve(SKY_CAT);
  if (!window.fetch) return Promise.resolve(null);
  return fetch("/login-sky-data.json").then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
    if (j && j.s && j.s.length) {
      SKY_CAT = j;
      if (starPts) placeStars();
    }
    return SKY_CAT;
  }).catch(function () { return null; });
}
function ensureSkyFont() {
  if (!document.fonts || !document.fonts.load) return Promise.resolve();
  return Promise.all([
    document.fonts.load('italic 20px "IM Fell English"'),
    document.fonts.load('italic 14px "IM Fell English"'),
    document.fonts.load('16px "IM Fell English SC"')
  ]).catch(function () {});
}


const SKY = [
  [-18, [6, 10, 28], [12, 18, 44], [22, 28, 62]],
  [-9, [16, 20, 56], [48, 40, 96], [120, 70, 110]],
  [-3, [40, 52, 112], [150, 96, 150], [255, 128, 96]],
  [2, [70, 110, 180], [230, 150, 170], [255, 170, 100]],
  [8, [96, 156, 226], [170, 200, 236], [255, 214, 170]],
  [25, [70, 140, 230], [140, 190, 245], [210, 230, 252]],
  [90, [50, 120, 220], [120, 175, 240], [196, 222, 250]]
];
const WXCLOUD = { clear: 0, partly: .45, cloudy: .9, overcast: .9, fog: .6, rain: .85, storm: 1, snow: .8 };

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
    // Keep the horizon paler in rain so a light band can sit under the cloud base.
    const dimK = k === 2 ? dim * 0.20 : (k === 1 ? dim * 0.50 : dim);
    c[k] = lerp3(c[k], [20, 22, 30], dimK);
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
    field: hexRgb("#D2B06A"), wheat: hexRgb("#D9B45A"), plowed: hexRgb("#C4A05A"),
    grass: hexRgb("#9AAA5A"), forest: hexRgb("#D9A441"), forestB: hexRgb("#B5562E"),
    cedar: hexRgb("#3E5A45"), water: hexRgb("#5C7477"), hatch: 4.2, row: 1.15, bend: 0.0
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
function canonWx(k) {
  if (!k) return "clear";
  if (k === "overcast" || k === "cloud" || k === "clouds") return "cloudy";
  return k;
}
const wx = { kind: canonWx(dbgWx), src: dbgWx ? "debug" : "default" };

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
    // Keep the real sun azimuth so dusk/dawn light (and a visible sun) stay in the west or east.
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
  if (!window.fetch) return;
  const u = "https://api.open-meteo.com/v1/forecast?latitude=" + loc.lat.toFixed(3) +
    "&longitude=" + loc.lon.toFixed(3) +
    "&current=weather_code,cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,temperature_2m,wind_speed_10m,wind_direction_10m" +
    "&wind_speed_unit=ms";
  const ctl = window.AbortController ? new AbortController() : null;
  if (ctl) setTimeout(function () { ctl.abort(); }, 6000);
  fetch(u, ctl ? { signal: ctl.signal } : {}).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
    if (!j || !j.current) return;
    if (!dbgWx) {
      wx.kind = wmo(j.current.weather_code | 0);
      wx.src = "open-meteo";
      wx.temp = j.current.temperature_2m;
      wx.cover = (j.current.cloud_cover != null ? j.current.cloud_cover : 0) / 100;
      wx.coverLow = (j.current.cloud_cover_low != null ? j.current.cloud_cover_low : 0) / 100;
      wx.coverMid = (j.current.cloud_cover_mid != null ? j.current.cloud_cover_mid : 0) / 100;
      wx.coverHigh = (j.current.cloud_cover_high != null ? j.current.cloud_cover_high : 0) / 100;
      wx.base = wx.coverLow > 0.45 ? 700 : (wx.coverMid > 0.35 ? 1400 : (wx.coverHigh > 0.2 ? 2500 : 1400));
      if (wx.kind === "fog") wx.base = 180;
      if (wx.kind === "rain" || wx.kind === "storm") wx.base = Math.min(wx.base, 800);
    }
    if (j.current.wind_speed_10m != null) wx.windMs = +j.current.wind_speed_10m;
    if (j.current.wind_direction_10m != null) wx.windFromDeg = +j.current.wind_direction_10m;
    wx.windSrc = "open-meteo";
    if (window.__world) window.__world._applyWx && window.__world._applyWx();
  }).catch(function () {});
}

// Slow cloud/precip drift from live 10 m wind. Direction is meteorological (from).
// Default is a light SW breeze if the fetch has not landed yet.
function weatherCover() {
  if (wx.cover != null && isFinite(wx.cover)) return clamp(wx.cover, 0, 1);
  if (wx.kind === "clear") return 0.16;
  if (wx.kind === "partly") return 0.40;
  if (wx.kind === "cloudy" || wx.kind === "rain" || wx.kind === "storm" || wx.kind === "snow") return 0.9;
  return 0.22;
}

function windDrift() {
  const ms = (wx.windMs != null && isFinite(wx.windMs) ? wx.windMs : 2.8) * 0.20;
  const from = ((wx.windFromDeg != null && isFinite(wx.windFromDeg) ? wx.windFromDeg : 250) * Math.PI / 180);
  const to = from + Math.PI;
  const d = ms * (state.time || 0);
  const off = offsetNorth(to, d);
  return { x: off.x, z: off.z, ms: ms };
}

function cloudAnchor() {
  const churchP = (meta && meta.landmarks && meta.landmarks.jasper_st_joseph) || [168.49, 429.67];
  return pxToWorld(churchP[0], churchP[1]);
}

function poissonDiscXZ(rng, n, minDist, x0, z0, x1, z1) {
  const pts = [];
  const min2 = minDist * minDist;
  let guard = 0;
  while (pts.length < n && guard < n * 80) {
    guard++;
    const x = x0 + rng() * (x1 - x0);
    const z = z0 + rng() * (z1 - z0);
    let ok = true;
    for (let i = 0; i < pts.length; i++) {
      const dx = pts[i].x - x, dz = pts[i].z - z;
      if (dx * dx + dz * dz < min2) { ok = false; break; }
    }
    if (ok) pts.push({ x: x, z: z });
  }
  return pts;
}

function poissonDiscFan(rng, n, minDist, ox, oz, az0, az1, near, far) {
  const pts = [];
  const min2 = minDist * minDist;
  let guard = 0;
  while (pts.length < n && guard < n * 80) {
    guard++;
    const az = az0 + rng() * (az1 - az0);
    const dist = near + rng() * (far - near);
    const x = ox + Math.sin(az) * dist;
    const z = oz + Math.cos(az) * dist;
    let ok = true;
    for (let i = 0; i < pts.length; i++) {
      const dx = pts[i].x - x, dz = pts[i].z - z;
      if (dx * dx + dz * dz < min2) { ok = false; break; }
    }
    if (ok) pts.push({ x: x, z: z });
  }
  return pts;
}

/* ---------- map data ---------- */
let heightData, coverData, meta, path = [];
let riverPathPx = [];
let heightF32; // meters, length COLS*ROWS
let ridgeGroup = null;
let riverRibbon = null;
let riverBanks = null;


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
  // Image y = 0 is north. World -Z is north, so py grows with +Z (south).
  return { px: x / CELL + ORIGIN_PX, py: z / CELL + ORIGIN_PY };
}
function pxToWorld(px, py) {
  return { x: (px - ORIGIN_PX) * CELL, z: (py - ORIGIN_PY) * CELL };
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
  // Carve a gentle trough only. Do not expand cover class 0: that was bleeding
  // water out of the source river mask onto the adjacent fields.
  const bank = 13.0;
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
    // Wider, shallower ramp so the cut reads as a hatched slope, not a dark wall.
    heightF32[i] -= Math.pow(t, 1.85) * 1.45;
  }
}

function buildRidgePath() {
  const church = (meta.landmarks && meta.landmarks.jasper_st_joseph) || [168.49, 429.67];
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
float farLift(float dist){
  float t = clamp((dist - 2000.0) / 8000.0, 0.0, 1.0);
  t = t * t * (3.0 - 2.0 * t);
  return 1.0 + 1.85 * t;
}
void main(){
  vUv = uv;
  vec3 p = position;
  float dist = length(vec2(p.x, p.z) - vec2(cameraPosition.x, cameraPosition.z));
  p.y *= farLift(dist);
  // Use the carved mesh normal so the Patoka trough reads as a channel.
  vN = normalize(normalMatrix * normal);
  vec4 wp = modelMatrix * vec4(p, 1.0);
  vWorld = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const TERRAIN_FRAG = /* glsl */`
uniform vec3 uPaper, uInk, uInkUse, uNightMul, uRim, uSnowCol;
uniform vec3 uField, uWheat, uPlowed, uGrass, uForest, uForestB, uCedar, uWater;
uniform vec3 uSunDir, uMoonDir, uSkyH, uSkyM, uSkyT;
uniform float uNight, uTwi, uRising, uSnow, uFog, uRain, uStorm, uTime, uHatch, uRow, uBend, uSeason;
uniform float uDawnMist, uMonth, uLightning;
uniform vec3 uStrikePos;
uniform float uStrikeAmt, uStrikeRad;
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
  vec3 sage = vec3(0.42, 0.50, 0.28);
  vec3 stubbleG = vec3(0.85, 0.68, 0.36);
  vec3 ochre = vec3(0.78, 0.56, 0.26);
  if (uSeason > 1.5 && uSeason < 2.5) {
    float varp = hash21(plot + 5.3);
    if (varp < 0.34) cropCol = stubbleG;
    else if (varp < 0.55) cropCol = mix(uWheat, ochre, 0.45);
    else if (varp > 0.88) cropCol = mix(cropCol, sage, 0.40);
    else cropCol = mix(uWheat, uField, 0.35 + 0.25 * varp);
  } else {
    cropCol = mix(cropCol, uGrass, 0.12 * (pid - 0.5));
  }
  vec3 grassCol = mix(uGrass, uField, 0.22 * (hash21(plot + 3.1) - 0.3));
  if (uSeason > 1.5 && uSeason < 2.5) {
    float gv = hash21(plot + 2.2);
    if (gv > 0.72) grassCol = mix(grassCol, sage, 0.45);
    else grassCol = mix(grassCol, stubbleG, 0.25);
  }

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
  else if (cls < 1.5) wash = mix(grassCol, vec3(0.78, 0.64, 0.40), 0.28);
  else if (cls < 2.5) wash = mix(vec3(0.72, 0.58, 0.40), uWheat, 0.25 + 0.15 * n3);
  else if (cls < 3.5) wash = mix(vec3(0.76, 0.60, 0.36), uPaper, 0.12);
  else if (cls < 4.5) wash = bareForest;
  else if (cls < 5.5) wash = uCedar;
  else if (cls < 6.5) wash = grassCol;
  else if (cls < 7.5) wash = cropCol;
  else if (cls < 8.5) wash = mix(grassCol, vec3(0.52, 0.50, 0.34), 0.45);
  else wash = grassCol;

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

  col *= mix(0.72, 1.04, ndl);
  col += uRim * uTwi * pow(clamp(dot(N, uSunDir), 0.0, 1.0), 4.0) * 0.55;

  float dist = length(vWorld - cameraPosition);
  // Five receding layers. Mid-distance and back are wash only (no patchwork).
  float layer = smoothstep(700.0, 7200.0, dist);
  float nearL = 1.0 - smoothstep(200.0, 1400.0, dist);
  float midL = smoothstep(900.0, 2000.0, dist) * (1.0 - smoothstep(2800.0, 4600.0, dist));
  float backL = smoothstep(3800.0, 5600.0, dist);
  // Mid fields stay warm (wheat, ochre, a little green), not a gray paper fade.
  if (dist > 1400.0) {
    vec3 farWash = mix(wash, mix(uWheat, uPaper, 0.28), 0.40);
    col = mix(col, farWash, smoothstep(1400.0, 2800.0, dist) * 0.65);
  }

  // Fields only on slopes that face the camera, ruled furrows in the near band
  float facing = clamp(dot(N, V), 0.0, 1.0);
  float slopeFace = facing * smoothstep(0.15, 0.55, 1.0 - N.y);
  if (cls > 5.5 && cls < 7.6 && uSnow < 0.5 && dist < 2200.0 && (facing > 0.34 || slopeFace > 0.10)) {
    float ang = pid > 0.5 ? 0.0 : 1.5708;
    if (pid > 0.82) ang = 0.65;
    float row = dot(wz, vec2(cos(ang), sin(ang)));
    float sp = mix(4.6, 6.2, pid);
    float g = abs(fract(row / sp) - 0.5);
    float inkA = (0.22 + 0.48 * nearL) * uRow * smoothstep(0.34, 0.62, facing);
    if (uSeason > 1.5 && uSeason < 2.5) inkA *= 1.05;
    if (uSeason > 2.5) inkA *= 0.5;
    if (cls < 6.5) inkA *= 0.50;
    col = mix(col, uInkUse, (1.0 - smoothstep(0.0, 0.16, g)) * inkA);
    float edge = min(min(pf.x, 1.0 - pf.x), min(pf.y, 1.0 - pf.y));
    col = mix(col, uInkUse, (1.0 - smoothstep(0.0, 0.028, edge)) * 0.35 * nearL);
  }

  vec2 ts = 1.0 / uSize;
  float nCls = max(coverAt(vUv + vec2(ts.x, 0.0)), max(coverAt(vUv + vec2(-ts.x, 0.0)), max(coverAt(vUv + vec2(0.0, ts.y)), coverAt(vUv + vec2(0.0, -ts.y)))));
  float forestHere = step(3.5, cls) * step(cls, 5.5);
  float forestN = step(3.5, nCls) * step(nCls, 5.5);
  if (forestHere < 0.5 && forestN > 0.5 && cls > 0.5 && dist < 2800.0) {
    col = mix(col, uInkUse, 0.28 * (1.0 - backL));
  }

  // River: one unbroken ribbon, cream glints, engraved ripple lines, never patches
  if (cls < 0.5) {
    vec3 river = vec3(0.40, 0.50, 0.52);
    float rip = sin(wz.x * 0.22 + wz.y * 0.31 + uTime * 0.35) * 0.5 + sin(wz.x * 0.09 - wz.y * 0.14) * 0.5;
    float line = abs(fract((wz.x * 0.07 + wz.y * 0.09) + rip * 0.10) - 0.5);
    float line2 = abs(fract((wz.x * 0.045 - wz.y * 0.06) * 1.15 + 0.3) - 0.5);
    // Day: cream glints. Storm: less paper, no cream sparkle (later storm dim
    // matches the land). Night: dark ink, lit only on the moon-azimuth glint band.
    vec3 R = reflect(-L, vec3(0.0, 1.0, 0.0));
    float spec = pow(clamp(dot(R, V), 0.0, 1.0), 40.0);
    vec3 glintC = vec3(0.96, 0.92, 0.82);
    col = mix(uPaper, river, mix(0.72, 0.95, uStorm));
    col = mix(col, uInkUse, (1.0 - smoothstep(0.0, 0.08, line)) * mix(0.50, 0.12, layer));
    col = mix(col, uInkUse, (1.0 - smoothstep(0.0, 0.09, line2)) * 0.14 * nearL);
    col = mix(col, glintC, clamp(spec * 0.55 + (n4 - 0.35) * 0.08, 0.0, 0.55) * (1.0 - uNight) * (1.0 - uStorm));
    if (uNight > 0.01) {
      vec3 nightRiver = vec3(0.022, 0.024, 0.028);
      vec3 moonD = normalize(uMoonDir);
      vec3 Rm = reflect(-V, vec3(0.0, 1.0, 0.0));
      float moonUp = smoothstep(-0.04, 0.10, moonD.y);
      vec2 moonAz = normalize(moonD.xz + vec2(1e-5));
      vec2 fromCam = normalize(vWorld.xz - cameraPosition.xz);
      float azBand = pow(max(0.0, dot(fromCam, moonAz)), 26.0);
      float moonSpec = pow(max(0.0, dot(normalize(Rm), moonD)), 36.0);
      float spark = mix(0.55, 1.0, hash21(floor(vWorld.xz * 0.10)));
      float moonGlint = (moonSpec * 0.95 + azBand * 0.50) * moonUp * spark;
      nightRiver = mix(nightRiver, vec3(0.93, 0.90, 0.84), clamp(moonGlint, 0.0, 0.88));
      col = mix(col, nightRiver, uNight);
    }
    // Storm close-ups: dark slate near #5A6068, slightly lighter than the
    // darkened land, no leftover day-blue. Night and clear day stay as above.
    if (uStorm > 0.01 && uNight < 0.01) {
      vec3 stormRiver = vec3(90.0, 96.0, 104.0) / 255.0;
      col = mix(col, stormRiver, 0.96 * uStorm);
    }
    if (nCls > 0.5) col = mix(col, uInkUse, 0.35 * (1.0 - layer));
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
  // Ridges separate by haze and color. At most a faint thin ink on the farthest crests.
  vec2 fwd = normalize(vWorld.xz - cameraPosition.xz);
  vec2 duv = vec2(fwd.x / ((uSize.x - 1.0) * 31.25), fwd.y / ((uSize.y - 1.0) * 31.25));
  float hF = heightM(clamp(vUv + duv * 3.0, 0.0, 1.0));
  float hB = heightM(clamp(vUv - duv * 3.0, 0.0, 1.0));
  float peak = h - max(hF, hB);
  float crest = smoothstep(0.35, 1.8, peak + (n3 - 0.5) * 0.25);
  float ridge = crest;
  vec3 inkCol = vec3(0.55, 0.60, 0.64);
  float ridgeAmt = crest * smoothstep(0.62, 0.90, layer) * 0.20 * (1.0 - uSnow * 0.5);

  // Back ridges: pale blue-gray silhouettes, no detail, inked tops only.
  // Pale haze sits between layers so each crest reads against the next.
  float air = smoothstep(2200.0, 9500.0, dist);
  vec3 airC = mix(uPaper, vec3(0.96, 0.90, 0.78), 0.22);
  airC = mix(airC, vec3(0.76, 0.80, 0.84), backL * 0.80);
  airC = mix(airC, uSkyH, 0.12 + 0.25 * uNight);
  col = mix(col, airC, air * mix(0.22, 0.80, backL));
  float between = smoothstep(1600.0, 2600.0, dist) * (1.0 - smoothstep(3200.0, 4200.0, dist));
  between = max(between, smoothstep(4000.0, 5200.0, dist) * (1.0 - smoothstep(6200.0, 8000.0, dist)));
  vec3 hazeC = mix(uPaper, vec3(0.90, 0.86, 0.78), 0.45);
  hazeC = mix(hazeC, vec3(0.80, 0.84, 0.88), backL * 0.4);
  col = mix(col, hazeC, between * 0.22 * (1.0 - ridge * 0.8));
  if (backL > 0.4) {
    col = mix(col, vec3(0.72, 0.76, 0.80), (backL - 0.4) * 0.55);
  }
  // Night last, after far wash and haze, so those cannot restore daytime cream.
  col *= mix(vec3(1.0), uNightMul * 0.72, uNight);
  vec3 nightSil = vec3(0.035, 0.048, 0.09);
  col = mix(col, nightSil, uNight * (0.28 + 0.55 * backL));
  vec3 crestInk = mix(inkCol, uInkUse, uNight);
  col = mix(col, crestInk, ridgeAmt * mix(1.0, 0.9, uNight));

  if (uRain > 0.01 && uStorm < 0.5) {
    col *= mix(1.0, 0.86, uRain);
    col = mix(col, vec3(col.r * 0.92, col.g * 0.95, col.b * 1.02), uRain * 0.20);
  }
  if (uStorm > 0.01 && cls >= 0.5) {
    // About 35% darker and cooler; autumn rust desaturates toward gray.
    // Strike lighting below still lifts the land locally around a bolt.
    // Water is already set to storm slate above and is re-asserted below,
    // so this land-only dim cannot restore a blue tint on the river.
    float luma = dot(col, vec3(0.30, 0.59, 0.11));
    vec3 desat = mix(col, vec3(luma), 0.62);
    desat = vec3(desat.r * 0.90, desat.g * 0.95, desat.b * 1.06);
    col = mix(col, desat, uStorm);
    col *= mix(1.0, 0.65, uStorm);
  }

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

  if (uStrikeAmt > 0.001) {
    float sd = length(vWorld - uStrikePos);
    float fall = exp(-sd * sd / max(1.0, uStrikeRad * uStrikeRad));
    float k = min(0.50, uStrikeAmt * fall);
    vec3 creamLt = vec3(0.965, 0.933, 0.863);
    col = mix(col, mix(col, creamLt, 0.62), k);
  }

  // Re-assert the river after aerial fade so it stays one unbroken ribbon.
  if (cls < 0.5) {
    vec3 river = vec3(0.38, 0.50, 0.55);
    vec3 rib = mix(uPaper, river, 0.82);
    float rip = sin(wz.x * 0.22 + wz.y * 0.31 + uTime * 0.35) * 0.5 + sin(wz.x * 0.09 - wz.y * 0.14) * 0.5;
    float line = abs(fract((wz.x * 0.07 + wz.y * 0.09) + rip * 0.10) - 0.5);
    rib = mix(rib, vec3(0.165, 0.129, 0.094), (1.0 - smoothstep(0.0, 0.08, line)) * 0.42);
    float spec = pow(clamp(dot(reflect(-L, vec3(0.0, 1.0, 0.0)), V), 0.0, 1.0), 28.0);
    rib = mix(rib, vec3(0.97, 0.93, 0.82), clamp(spec * 0.7 + (n4 - 0.3) * 0.1, 0.0, 0.5) * (1.0 - uStorm));
    if (uStorm > 0.01) {
      vec3 stormRiver = vec3(90.0, 96.0, 104.0) / 255.0;
      rib = mix(rib, stormRiver, 0.96 * uStorm);
      rib = mix(rib, vec3(0.165, 0.129, 0.094), (1.0 - smoothstep(0.0, 0.08, line)) * 0.28 * uStorm);
    }
    vec3 nRib = vec3(0.035, 0.045, 0.07);
    nRib = mix(nRib, uInkUse, (1.0 - smoothstep(0.0, 0.08, line)) * 0.35);
    float sparse = step(0.86, hash21(floor(wz * 0.08)));
    nRib = mix(nRib, vec3(0.93, 0.90, 0.84), clamp(spec * 0.35, 0.0, 0.4) * sparse);
    rib = mix(rib, nRib, uNight);
    if (uRain > 0.01) {
      vec2 cell = floor(wz * 0.06);
      float id = hash21(cell);
      vec2 ctr = (cell + 0.5) / 0.06;
      float rad = fract(uTime * 0.55 + id * 3.1);
      float ring = 1.0 - smoothstep(0.0, 1.15, abs(length(wz - ctr) - rad * 11.0));
      ring *= (1.0 - rad) * step(0.42, id);
      rib = mix(rib, mix(uInkUse, vec3(0.20, 0.18, 0.16), uNight), ring * 0.62 * uRain);
    }
    if (uStrikeAmt > 0.001) {
      float sd = length(vWorld - uStrikePos);
      float fall = exp(-sd * sd / max(1.0, uStrikeRad * uStrikeRad));
      vec3 toStrike = normalize(uStrikePos - vWorld);
      vec3 Rf = reflect(-V, vec3(0.0, 1.0, 0.0));
      float specS = pow(max(0.0, dot(normalize(Rf), toStrike)), 18.0);
      float k = min(0.88, uStrikeAmt * (fall * 0.50 + specS * 0.90));
      rib = mix(rib, mix(rib, vec3(0.965, 0.933, 0.863), 0.78), k);
    }
    col = mix(rib, col, 0.12 * layer);
  }

  gl_FragColor = vec4(col, 1.0);
}
`;

const SKY_VERT = /* glsl */`
varying vec3 vDir;
void main(){
  vec4 cp = modelViewMatrix * vec4(position, 1.0);
  // Direction from the camera, not from the world origin. skyGroup sits on the camera,
  // so using the world position alone biased vDir.y and smeared the milky band.
  vDir = normalize((modelMatrix * vec4(position, 1.0)).xyz - cameraPosition);
  gl_Position = projectionMatrix * cp;
  gl_Position.z = gl_Position.w;
}
`;

const SKY_FRAG = /* glsl */`
uniform vec3 uTop, uMid, uHor;
uniform vec3 uSunDir, uMoonDir;
uniform float uNight, uTwi, uSunSize, uMilky, uSeed, uLookAz;
uniform vec2 uRes;
varying vec3 vDir;
${NOISE_GLSL}

// body/wash and rel only; hatch is applied once in puff space to avoid moire.
vec3 cloudLobe(vec2 frag, vec2 c, vec2 rad, float seed) {
  vec2 p = (frag - c) / rad;
  float x = p.x;
  float y = p.y;
  if (abs(x) > 1.45 || y < -0.85 || y > 1.4) return vec3(0.0);
  float base = -0.52;
  float sc = (noise21(vec2(x * 3.4 + seed, y * 2.2)) - 0.45) * 0.26
           + (noise21(vec2(x * 7.2 + seed * 1.7, y * 5.4)) - 0.5) * 0.12;
  float top = 0.32
    + 0.30 * exp(-pow(x * 1.08, 2.0) * 2.0)
    + 0.26 * exp(-pow((x - 0.50) * 1.55, 2.0) * 2.5)
    + 0.26 * exp(-pow((x + 0.48) * 1.55, 2.0) * 2.5)
    + 0.08 * sin((x + seed) * 6.4)
    + sc;
  top = max(top, 0.14);
  if (y > top + 0.04 || y < base - 0.14) return vec3(0.0);
  float halfw = 0.70 + 0.24 * clamp((top - y) / (top - base + 0.001), 0.0, 1.0) + sc * 0.4;
  float body = (1.0 - smoothstep(halfw, halfw + 0.18, abs(x)))
    * smoothstep(base - 0.04, base + 0.09, y)
    * (1.0 - smoothstep(top - 0.06, top + 0.05, y));
  if (body < 0.02) return vec3(0.0);
  float rel = clamp((y - base) / (top - base + 0.001), 0.0, 1.0);
  float wash = body * mix(0.85, 0.28, smoothstep(0.08, 0.88, rel));
  return vec3(wash, 0.0, rel);
}
vec3 cloudPuff(vec2 frag, vec2 cUv, float scale, float seed) {
  vec2 c = cUv * uRes;
  float px = max(uRes.x * scale, 54.0);
  vec2 rad = vec2(px, px * 0.78);
  vec3 a = cloudLobe(frag, c + vec2(0.0, 0.02 * rad.y), rad * vec2(1.0, 0.80), seed);
  vec3 b = cloudLobe(frag, c + vec2(-0.42 * rad.x, 0.22 * rad.y), rad * vec2(0.64, 0.74), seed + 1.3);
  vec3 c2 = cloudLobe(frag, c + vec2(0.40 * rad.x, 0.18 * rad.y), rad * vec2(0.60, 0.72), seed + 2.1);
  float wash = max(a.x, max(b.x, c2.x));
  float rel = a.x >= b.x && a.x >= c2.x ? a.z : (b.x >= c2.x ? b.z : c2.z);
  vec2 p = (frag - c) / rad;
  float psi = (p.y + 0.50 * p.x * p.x + 0.10 * sin(p.x * 3.6 + seed) + 0.04 * sin(p.x * 7.1 + seed * 2.0)) * mix(8.5, 5.2, rel);
  float hatchLine = 1.0 - smoothstep(0.0, 0.36, abs(fract(psi) - 0.5));
  float dens = mix(0.95, 0.0, smoothstep(0.06, 0.62, rel));
  dens *= smoothstep(0.10, 0.42, clamp(wash, 0.0, 1.0));
  float hatch = wash > 0.06 ? dens * hatchLine : 0.0;
  return vec3(wash, hatch, rel);
}

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
    vec3 creamDay = vec3(0.96, 0.90, 0.78);
    col = mix(col, creamDay, horB * 0.45 * (1.0 - uNight));
    // Dusk and dawn: one continuous gradient from the sun's position, dithered,
    // with light hatching on top. No hard bands.
    if (uTwi > 0.12) {
      vec3 amber = vec3(0.949, 0.769, 0.420); // #F2C46B
      vec3 peach = vec3(0.96, 0.80, 0.62);
      vec3 rose = vec3(0.86, 0.58, 0.54);
      vec3 cream = vec3(0.945, 0.906, 0.831);
      vec3 duskBlue = vec3(0.40, 0.48, 0.62);
      vec3 S = normalize(uSunDir);
      float sunDot = dot(d, S);
      float sunAng = acos(clamp(sunDot, -1.0, 1.0));
      float aroundSun = exp(-sunAng * sunAng * 7.5);
      float sunSide = smoothstep(-0.12, 0.55, sunDot);
      float el = h;
      float hor = 1.0 - smoothstep(0.0, 0.30, max(el, 0.0));
      float zen = smoothstep(0.10, 0.78, el);
      vec3 duskCol = mix(cream, duskBlue, zen * mix(0.40, 0.88, 1.0 - sunSide));
      vec3 horSun = mix(peach, rose, 0.32 * (1.0 - aroundSun));
      duskCol = mix(duskCol, horSun, hor * sunSide * 0.88);
      duskCol = mix(duskCol, mix(cream, duskBlue, 0.38), hor * (1.0 - sunSide) * 0.42);
      duskCol = mix(duskCol, amber, clamp(aroundSun * 1.2, 0.0, 1.0));
      float wave = (noise21(vec2(d.x, d.z) * 8.0 + uSeed) - 0.5) * 1.15;
      float row = el * 26.0 + wave;
      float hatch = 1.0 - smoothstep(0.0, 0.34, abs(fract(row) - 0.5));
      float lift = step(0.30, hash21(vec2(floor(row), floor((d.x + d.z) * 20.0) + uSeed)));
      duskCol = mix(duskCol, mix(duskCol, vec3(0.22, 0.17, 0.13), 0.16), hatch * lift * 0.20 * (0.35 + 0.65 * hor));
      duskCol += (hash21(gl_FragCoord.xy + uSeed) - 0.5) * 0.04;
      col = mix(col, duskCol, clamp((uTwi - 0.12) / 0.16, 0.0, 1.0));
      if (uTwi > 0.28) col = duskCol;
    }
    // light paper stipple
    float stip = hash21(gl_FragCoord.xy * 0.9 + uSeed);
    float grain = noise21(gl_FragCoord.xy * 0.22);
    col *= 0.985 + 0.03 * grain;
    col += (stip - 0.5) * 0.018;
    // Cumulus live as world-space volumes (buildVolClouds). The sky is paper only.
    // The sun is an engraved disk mesh, not a shader glow.

  } else {
    if (h > 0.42) col = mix(uMid, uTop, clamp((h - 0.42) / 0.58, 0.0, 1.0));
    else if (h > 0.0) col = mix(uHor, uMid, pow(h / 0.42, 0.75));
    else col = mix(uHor, uHor * 0.75, clamp(-h * 2.0, 0.0, 1.0));
  }
  // No milky-way add-on: with the old vDir it smeared into a pale vertical band
  // on the right of the night and occlusion frames.
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
uniform float uCrownCap;
varying vec2 vUv;
varying float vFrame;
varying float vKind;
varying float vShade;
varying float vLod;
varying vec3 vWorld;
void main(){
  vUv = uv;
  vKind = iKind;
  vec3 iPos = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  vWorld = iPos;
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
  float isFrame = step(1.5, iKind);
  float sx = iScale.x * (lod < 0.5 ? 1.0 : 1.18);
  float sy = iScale.y * (lod < 0.5 ? 1.0 : 1.06);
  sx *= mix(mix(0.88, 1.0, close), 1.0, isFrame);
  sy *= mix(mix(0.88, 1.0, close), 1.0, isFrame);
  // Snap to the terrain and sink slightly so billboards do not float.
  iPos.y -= 1.8;
  vec4 c0 = projectionMatrix * viewMatrix * vec4(iPos, 1.0);
  vec4 c1 = projectionMatrix * viewMatrix * vec4(iPos + camU * sy, 1.0);
  float ndcH = abs(c1.y / max(0.001, c1.w) - c0.y / max(0.001, c0.w));
  float crownCap = uCrownCap > 0.01 ? uCrownCap : 0.16;
  if (isFrame < 0.5 && ndcH > crownCap) {
    float cap = crownCap / ndcH;
    sx *= cap;
    sy *= cap;
  }
  if (isFrame > 0.5) {
    // Painted crowns sit around 0.62 of the cell (atlas Y is not flipped).
    // Cap the visible crown, not the empty billboard top, at about 55% down.
    vec4 cC = projectionMatrix * viewMatrix * vec4(iPos + camU * sy * 0.88, 1.0);
    float baseNdc = c0.y / max(0.001, c0.w);
    float crNdc = cC.y / max(0.001, cC.w);
    float maxTop = -0.10;
    if (crNdc > maxTop) {
      float cap = (maxTop - baseNdc) / max(0.001, crNdc - baseNdc);
      cap = clamp(cap, 0.2, 1.0);
      sx *= cap;
      sy *= cap;
    }
  }
  vec3 p = iPos + camR * ((position.x + tilt) * sx) + camU * (position.y * sy);
  vShade = 0.86 + 0.14 * sin(iPhase * 20.0);
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}
`;

const TREE_FRAG = /* glsl */`
uniform sampler2D uAtlas;
uniform vec3 uInkUse, uNightMul;
uniform float uNight, uLightning, uStorm;
uniform vec3 uStrikePos;
uniform float uStrikeAmt, uStrikeRad;
uniform vec2 uAtlasGrid;
varying vec2 vUv;
varying float vFrame;
varying float vKind;
varying float vShade;
varying float vLod;
varying vec3 vWorld;
void main(){
  if (vLod > 1.5) discard;
  float cols = uAtlasGrid.x;
  float rows = uAtlasGrid.y;
  float ix = floor(vFrame + 0.5);
  // flipY atlas: row 0 is at the top of the canvas, which is high v. Invert the row.
  vec2 cell = vec2(mod(ix, cols), rows - 1.0 - floor(ix / cols));
  vec2 uv = (vUv * 0.90 + 0.05 + cell) / uAtlasGrid;
  vec4 s = texture2D(uAtlas, uv);
  if (s.a < 0.32) discard;
  vec3 col = s.rgb * vShade;
  float luma = dot(s.rgb, vec3(0.30, 0.50, 0.20));
  vec3 nightFill = col * uNightMul * 0.45;
  nightFill = mix(nightFill, vec3(0.03, 0.045, 0.08), 0.40);
  // Dark atlas marks were ink; at night they flip to cream.
  vec3 nightCol = mix(uInkUse * 0.85, nightFill, smoothstep(0.07, 0.32, luma));
  col = mix(col, nightCol, uNight);
  if (uStorm > 0.01) {
    float lumaT = dot(col, vec3(0.30, 0.59, 0.11));
    col = mix(col, vec3(lumaT * 0.90, lumaT * 0.95, lumaT * 1.06), 0.55 * uStorm);
    col *= mix(1.0, 0.65, uStorm);
  }
  if (uStrikeAmt > 0.001) {
    float sd = length(vWorld - uStrikePos);
    float fall = exp(-sd * sd / max(1.0, uStrikeRad * uStrikeRad));
    float k = min(0.48, uStrikeAmt * fall);
    vec3 creamLt = vec3(0.965, 0.933, 0.863);
    col = mix(col, mix(col, creamLt, 0.58), k);
  }
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
uniform vec3 uGrass, uWheat, uInkUse, uCorn, uNightMul;
uniform float uNight, uStorm;
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
  float inkA = (1.0 - smoothstep(0.0, 0.28, edge)) * 0.82 + (1.0 - vY) * 0.28;
  col = mix(col, uInkUse, inkA);
  col = mix(col, uInkUse, 0.22 * (1.0 - vY));
  col *= 0.88;
  vec3 nightFill = col * uNightMul * 0.42;
  nightFill = mix(nightFill, vec3(0.03, 0.045, 0.085), 0.55);
  vec3 nightCol = mix(nightFill, uInkUse * 0.85, inkA * 0.85);
  col = mix(col, nightCol, uNight);
  if (uStorm > 0.01) {
    float lumaG = dot(col, vec3(0.30, 0.59, 0.11));
    col = mix(col, vec3(lumaG * 0.90, lumaG * 0.95, lumaG * 1.06), 0.50 * uStorm);
    col *= mix(1.0, 0.65, uStorm);
  }
  gl_FragColor = vec4(col, 0.98);
}
`;

const MOON_VERT = /* glsl */`
varying vec3 vPos;
varying vec3 vCenter;
void main(){
  vPos = (modelMatrix * vec4(position, 1.0)).xyz;
  vCenter = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const MOON_FRAG = /* glsl */`
uniform vec3 uSunDir;
varying vec3 vPos;
varying vec3 vCenter;
${NOISE_GLSL}
void main(){
  // Normal from the sphere center in world space. uSunDir is the world
  // direction to the sun (same altAzDir as the moon's position).
  vec3 N = normalize(vPos - vCenter);
  vec3 L = normalize(uSunDir);
  float lit = clamp(dot(N, L), 0.0, 1.0);
  float crat = noise21(N.xy * 7.0 + N.z * 4.0);
  vec3 dark = vec3(0.10, 0.11, 0.16);
  vec3 light = vec3(0.96, 0.93, 0.84) * (0.86 + 0.14 * crat);
  vec3 col = mix(dark, light, smoothstep(0.015, 0.16, lit));
  // Engraved hatch on the unlit face; faint crater rings on the lit face.
  float sl = abs(fract((N.x * 8.0 + N.y * 11.0) * 1.15 + N.z * 2.0) - 0.5);
  float hatch = (1.0 - smoothstep(0.0, 0.15, sl)) * (1.0 - smoothstep(0.0, 0.22, lit));
  hatch *= step(0.2, hash21(floor(N.xy * 16.0)));
  col = mix(col, vec3(0.06, 0.07, 0.11), hatch * 0.75);
  float ring = abs(crat - 0.55);
  col = mix(col, vec3(0.22, 0.20, 0.18), (1.0 - smoothstep(0.0, 0.08, ring)) * lit * 0.28);
  // Cream ink outline at the limb, a touch heavier on the sun side.
  vec3 V = normalize(cameraPosition - vPos);
  float rim = pow(1.0 - abs(dot(N, V)), 2.6);
  vec3 cream = vec3(0.93, 0.90, 0.84);
  col = mix(col, cream, rim * (0.55 + 0.35 * lit));
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
uniform vec3 uWash, uInkUse, uPaper, uNightMul, uSunDir, uMoonDir;
uniform float uNight, uStorm;
varying vec3 vN;
varying vec3 vWorld;
${NOISE_GLSL}
void main(){
  vec3 N = normalize(vN);
  vec3 V = normalize(cameraPosition - vWorld);
  float ndv = abs(dot(N, V));
  float rim = pow(1.0 - ndv, 2.4);
  vec3 wash = mix(uPaper, uWash, 0.68);
  float g = noise21(vWorld.xz * 0.55 + vWorld.y * 0.28);
  wash *= 0.95 + 0.08 * g;
  // Posterize by luminance only. Per-channel floors snapped R, G and B
  // across different steps and painted pink and green camouflage blotches.
  float luma = dot(wash, vec3(0.30, 0.59, 0.11));
  float q = floor(luma * 6.0 + 0.5) / 6.0;
  wash *= q / max(luma, 0.001);
  vec3 nightBody = wash * uNightMul * 0.38;
  nightBody = mix(nightBody, vec3(0.035, 0.048, 0.09), 0.58);
  wash = mix(wash, nightBody, uNight);
  // Day: dark ink rims. Night: a thin cream edge only, never a flood fill.
  // uInkUse is cream after dusk, so rim and hatch stay sparse at night.
  float rimAmt = mix(0.92, 0.20, uNight);
  float rimCap = mix(0.80, 0.26, uNight);
  vec3 col = mix(wash, uInkUse, clamp(rim * rimAmt, 0.0, rimCap));
  vec3 L = normalize(mix(uMoonDir, uSunDir, 1.0 - uNight));
  if (L.y < 0.02) L = normalize(vec3(L.x, 0.02, L.z));
  float ndl = dot(N, L);
  float hatchCut = mix(0.28, 0.10, uNight);
  if (ndl < hatchCut) {
    float ang = 0.7;
    vec2 hp = vWorld.zy * vec2(1.6, 1.1);
    float sl = abs(fract((hp.x * cos(ang) + hp.y * sin(ang)) * 1.8) - 0.5);
    float hatch = (1.0 - smoothstep(0.0, 0.16, sl)) * (1.0 - smoothstep(-0.05, hatchCut, ndl));
    hatch *= step(0.22, hash21(floor(hp * 4.0)));
    col = mix(col, uInkUse, hatch * mix(0.42, 0.16, uNight));
  }
  col *= 0.97 + 0.05 * noise21(vWorld.xz * 2.4);
  if (uStorm > 0.01) {
    float lumaB = dot(col, vec3(0.30, 0.59, 0.11));
    col = mix(col, vec3(lumaB * 0.92, lumaB * 0.95, lumaB * 1.05), 0.40 * uStorm);
    col *= mix(1.0, 0.72, uStorm);
  }
  gl_FragColor = vec4(col, 1.0);
}
`;

const WINDOW_FRAG = /* glsl */`
uniform vec3 uGlow, uInkUse;
uniform float uNight;
varying vec3 vN;
varying vec3 vWorld;
float hash21w(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
void main(){
  vec3 N = normalize(vN);
  vec3 V = normalize(cameraPosition - vWorld);
  float rim = pow(1.0 - abs(dot(N, V)), 2.6);
  vec3 dark = vec3(0.08, 0.07, 0.06);
  float lit = step(0.64, hash21w(floor(vWorld.xz * 0.12 + vWorld.y * 0.18)));
  vec3 col = mix(dark, uGlow, clamp(uNight, 0.0, 1.0) * lit);
  col *= mix(1.0, 1.18, uNight * lit);
  col = mix(col, uInkUse, rim * mix(0.7, 0.22, uNight));
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
  holdCamera: false,
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
  yawVel: 0,
  zoom: 1,
  fwd: 0,
  pointers: {},
  pinch: 0
};

const tour = {
  enabled: false,
  paused: true,
  lastInput: 0,
  stop: 0,
  phase: "hold",
  holdUntil: 0,
  from: null,
  to: null,
  t: 0,
  duration: 1,
  pace: 1,
  started: false,
  manualTravel: false
};

function targetHorizon() {
  const aspect = camera.aspect;
  // Geometric aim is a bit below the visible ridge line, because far hills rise
  // into the sky. Phone is taller, so the aim sits lower to keep the ridge near 70%.
  if (aspect < 0.7) return 0.70;
  if (aspect < 1.1) return 0.70;
  return 0.70;
}

function applyFovAndPitch() {
  const aspect = Math.max(0.3, canvas.clientWidth / Math.max(1, canvas.clientHeight));
  camera.aspect = aspect;
  const hor = targetHorizon();
  const baseFov = aspect < 0.7 ? 58 : aspect < 1.1 ? 54 : 48;
  camera.fov = clamp(baseFov / (rig.zoom || 1), 28, 68);
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
let starPts, constLines, moonMesh, sunMesh, sunState = {};
let SKY_CAT = null, constNameGroup = null, snowPts = null, fogGroup = null, rainMesh = null, rainLens = null;
const skyDriftT0 = performance.now();

let churchMesh, labelMesh, landmarkGroup;
const washMats = [];
const windowMats = [];
const LAND = { church: 0, farmhouse: 0, barn: 0, silo: 0, hay: 0, mill: 0, depot: 0, fromGltf: {} };

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
    uRain: { value: 0 },
    uStorm: { value: 0 },
    uTime: { value: 0 },
    uHatch: { value: 4.5 },
    uRow: { value: 1 },
    uBend: { value: 0 },
    uSeason: { value: 2 },
    uDawnMist: { value: 0 },
    uMonth: { value: 10 },
    uLightning: { value: 0 },
    uStrikePos: { value: new THREE.Vector3() },
    uStrikeAmt: { value: 0 },
    uStrikeRad: { value: 1600 },
    uCursor: { value: new THREE.Vector3() }
  };
}

function buildTerrain() {
  const wSeg = 320, dSeg = 400;
  const geo = new THREE.BufferGeometry();
  const verts = (wSeg + 1) * (dSeg + 1);
  const pos = new Float32Array(verts * 3);
  const uv = new Float32Array(verts * 2);
  let v = 0, u = 0;
  for (let j = 0; j <= dSeg; j++) {
    const py = (1 - j / dSeg) * (ROWS - 1);
    for (let i = 0; i <= wSeg; i++) {
      const px = (i / wSeg) * (COLS - 1);
      const w = pxToWorld(px, py);
      let h = heightPx(px, py);
      pos[v++] = w.x;
      pos[v++] = yOf(h);
      pos[v++] = w.z;
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
      idx[t++] = a; idx[t++] = b; idx[t++] = c;
      idx[t++] = b; idx[t++] = d; idx[t++] = c;
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
      uLookAz: { value: 0.0 },
      uRes: { value: new THREE.Vector2(1280, 800) },
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

  const STAR_MAX = 1800;
  const starPos = new Float32Array(STAR_MAX * 3);
  const starCol = new Float32Array(STAR_MAX * 3);
  const starSize = new Float32Array(STAR_MAX);
  const starMag = new Float32Array(STAR_MAX);
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
  starGeo.setAttribute("color", new THREE.BufferAttribute(starCol, 3));
  starGeo.setAttribute("aSize", new THREE.BufferAttribute(starSize, 1));
  starGeo.setAttribute("aMag", new THREE.BufferAttribute(starMag, 1));
  const starMat = new THREE.ShaderMaterial({
    uniforms: { uPixel: { value: 1 } },
    vertexShader: /* glsl */`
      attribute float aSize;
      attribute float aMag;
      attribute vec3 color;
      varying vec3 vCol;
      varying float vMag;
      uniform float uPixel;
      void main(){
        vCol = color;
        vMag = aMag;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = aSize * uPixel;
      }
    `,
    fragmentShader: /* glsl */`
      varying vec3 vCol;
      varying float vMag;
      void main(){
        vec2 p = gl_PointCoord * 2.0 - 1.0;
        float r = length(p);
        if (r > 1.15) discard;
        float core = 1.0 - smoothstep(0.0, 0.38, r);
        float halo = 1.0 - smoothstep(0.18, 1.0, r);
        float a = max(core, halo * 0.55);
        // Tiny engraved cross-glint on the bright stars (mag ~1.8 and brighter).
        if (vMag < 1.85) {
          float arm = min(abs(p.x), abs(p.y));
          float reach = max(abs(p.x), abs(p.y));
          float spike = (1.0 - smoothstep(0.0, 0.085, arm)) * (1.0 - smoothstep(0.12, 1.08, reach));
          a = max(a, spike * clamp(1.25 - vMag * 0.28, 0.45, 1.15));
        }
        if (a < 0.04) discard;
        gl_FragColor = vec4(vCol, clamp(a, 0.0, 1.0));
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.NormalBlending
  });
  starPts = new THREE.Points(starGeo, starMat);
  starPts.frustumCulled = false;
  starPts.renderOrder = -50;
  skyGroup.add(starPts);

  constLines = new THREE.LineSegments(
    new THREE.BufferGeometry(),
    new THREE.LineBasicMaterial({
      color: 0xEDE6D6,
      transparent: true,
      opacity: 0.18,
      depthWrite: false,
      depthTest: true
    })
  );
  constLines.frustumCulled = false;
  constLines.renderOrder = -50;
  skyGroup.add(constLines);

  constNameGroup = new THREE.Group();
  constNameGroup.name = "constNames";
  constNameGroup.renderOrder = -48;
  skyGroup.add(constNameGroup);

  moonMat = new THREE.ShaderMaterial({
    uniforms: { uSunDir: { value: new THREE.Vector3(1, 0, 0) } },
    vertexShader: MOON_VERT,
    fragmentShader: MOON_FRAG,
    depthWrite: false,
    depthTest: true
  });
  moonMesh = new THREE.Mesh(new THREE.SphereGeometry(130, 32, 24), moonMat);
  moonMesh.renderOrder = -50;
  skyGroup.add(moonMesh);

  const sunMat = new THREE.ShaderMaterial({
    uniforms: {},
    vertexShader: /* glsl */`
      varying vec2 vUv;
      void main(){
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */`
      varying vec2 vUv;
      void main(){
        vec2 p = vUv * 2.0 - 1.0;
        float r = length(p);
        if (r > 1.0) discard;
        vec3 amber = vec3(0.949, 0.769, 0.420);
        vec3 hot = vec3(0.995, 0.91, 0.62);
        vec3 ink = vec3(0.165, 0.129, 0.094);
        // Soft amber disk, a little brighter than the sky glow so the disc reads. No rays.
        vec3 col = mix(amber, hot, 0.70 * (1.0 - r * r));
        float rim = smoothstep(0.82, 0.93, r) * (1.0 - smoothstep(0.980, 1.0, r));
        col = mix(col, ink, max(rim * 0.95, step(0.985, r) * 0.90));
        gl_FragColor = vec4(col, 1.0);
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: THREE.DoubleSide
  });
  sunMesh = new THREE.Mesh(new THREE.PlaneGeometry(2200, 2200), sunMat);
  sunMesh.renderOrder = -50;
  skyGroup.add(sunMesh);
}

function skyNow() {
  if (state.frozen || REDUCE) return clock.now;
  // login-sky liveliness: four extra degrees of sidereal rotation per minute.
  return clock.now + (performance.now() - skyDriftT0) / 60000 * 4 * (86400000 / 360.98564736629);
}

function dirFromRaDec(raDeg, decDeg, d) {
  const aa = altAz(raDeg, decDeg, d, loc.lat, loc.lon);
  return { alt: aa[0], az: aa[1], dir: altAzDir(aa[0], aa[1]) };
}

// Visual center of the drawn asterism (mean of line vertices), not the catalog box center.
function constCenterRaDec(C) {
  const pts = [];
  const L = C.l || [];
  for (let li = 0; li < L.length; li++) {
    const poly = L[li];
    if (!poly || !poly.length) continue;
    for (let i = 0; i + 1 < poly.length; i += 2) pts.push([poly[i], poly[i + 1]]);
  }
  if (!pts.length) return C.c || [0, 0];
  let sx = 0, sy = 0, dec = 0;
  for (let i = 0; i < pts.length; i++) {
    sx += Math.cos(pts[i][0] * RAD);
    sy += Math.sin(pts[i][0] * RAD);
    dec += pts[i][1];
  }
  let ra = Math.atan2(sy, sx) / RAD;
  if (ra < 0) ra += 360;
  return [ra, dec / pts.length];
}

function makeNameSprite(text, italic) {
  const cv = document.createElement("canvas");
  cv.width = 640;
  cv.height = 128;
  const g = cv.getContext("2d");
  g.clearRect(0, 0, 640, 128);
  g.font = (italic ? "italic " : "") + '34px "IM Fell English", Palatino, serif';
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.lineJoin = "round";
  g.miterLimit = 2;
  g.strokeStyle = "rgba(7,11,20,0.82)";
  g.lineWidth = 7;
  g.strokeText(text, 320, 68);
  g.fillStyle = "rgba(237,230,214,0.96)";
  g.fillText(text, 320, 68);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.NoColorSpace;
  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthTest: true,
    depthWrite: false,
    opacity: 0.92
  });
  const sp = new THREE.Sprite(mat);
  sp.scale.set(2000, 400, 1);
  sp.userData.text = text;
  return sp;
}

function placeStars() {
  if (!starPts) return;
  const d = jd2000(skyNow());
  const R = 8800;
  const pos = starPts.geometry.attributes.position.array;
  const col = starPts.geometry.attributes.color.array;
  const sz = starPts.geometry.attributes.aSize.array;
  const magA = starPts.geometry.attributes.aMag && starPts.geometry.attributes.aMag.array;
  const cream = [0.95, 0.92, 0.86];
  let n = 0;
  function addStar(raDeg, decDeg, mag) {
    if (n >= pos.length / 3) return;
    if (mag > 5.05) return;
    const hit = dirFromRaDec(raDeg, decDeg, d);
    if (hit.alt < -2) return;
    pos[n * 3] = hit.dir.x * R;
    pos[n * 3 + 1] = hit.dir.y * R;
    pos[n * 3 + 2] = hit.dir.z * R;
    const b = clamp(1.12 - mag * 0.12, 0.38, 1);
    col[n * 3] = cream[0] * b;
    col[n * 3 + 1] = cream[1] * b;
    col[n * 3 + 2] = cream[2] * (b * 0.98);
    sz[n] = Math.max(2.6, 11.5 * Math.pow(10, -0.14 * mag));
    if (magA) magA[n] = mag;
    n++;
  }
  if (SKY_CAT && SKY_CAT.s) {
    for (let i = 0; i < SKY_CAT.s.length; i++) {
      const s = SKY_CAT.s[i];
      addStar(s[0], s[1], s[2]);
    }
  } else {
    FIELD.forEach(function (s) { addStar(s[0] * 15, s[1], s[2]); });
    Object.keys(CONSTELL).forEach(function (k) {
      CONSTELL[k].s.forEach(function (s) { addStar(s[0] * 15, s[1], s[2]); });
    });
  }
  starPts.geometry.setDrawRange(0, n);
  starPts.geometry.attributes.position.needsUpdate = true;
  starPts.geometry.attributes.color.needsUpdate = true;
  starPts.geometry.attributes.aSize.needsUpdate = true;
  if (starPts.geometry.attributes.aMag) starPts.geometry.attributes.aMag.needsUpdate = true;

  const MAJOR_CONST = {
    Andromeda: 1, Aquila: 1, Aries: 1, Auriga: 1, "Boötes": 1, "Canis Major": 1, "Canis Minor": 1,
    Cassiopeia: 1, Cepheus: 1, Cygnus: 1, Draco: 1, Gemini: 1, Hercules: 1, Leo: 1, Lyra: 1,
    Orion: 1, Pegasus: 1, Perseus: 1, Scorpius: 1, Taurus: 1, "Ursa Major": 1, "Ursa Minor": 1,
    Triangulum: 1, "Corona Borealis": 1
  };
  function isMajorConst(name) { return !!(MAJOR_CONST[name]); }
  function snapToCatalog(ra, dec) {
    if (!SKY_CAT || !SKY_CAT.s) return [ra, dec];
    const stars = SKY_CAT.s;
    const decR = dec * RAD;
    let best = null, bestD = 0.75;
    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      let dra = Math.abs(ra - s[0]);
      if (dra > 180) dra = 360 - dra;
      const dd = Math.hypot(dra * Math.cos(decR), dec - s[1]);
      if (dd < bestD) { bestD = dd; best = s; }
    }
    return best ? [best[0], best[1]] : null;
  }

  // Fainter, thinner dashes, only for major constellations, snapped onto catalog stars.
  const linePos = [];
  function dashLine(a, b) {
    const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
    const len = Math.hypot(dx, dy, dz) || 1;
    const dash = 70, gap = 160;
    let t = 0, on = true;
    while (t < len) {
      const t1 = Math.min(len, t + (on ? dash : gap));
      if (on) {
        const k0 = t / len, k1 = t1 / len;
        linePos.push(a.x + dx * k0, a.y + dy * k0, a.z + dz * k0, a.x + dx * k1, a.y + dy * k1, a.z + dz * k1);
      }
      t = t1;
      on = !on;
    }
  }
  function placeLinePair(raA, decA, raB, decB) {
    const sa = snapToCatalog(raA, decA);
    const sb = snapToCatalog(raB, decB);
    if (!sa || !sb) return;
    const A = dirFromRaDec(sa[0], sa[1], d);
    const B = dirFromRaDec(sb[0], sb[1], d);
    if (A.alt < -1 || B.alt < -1) return;
    dashLine(A.dir.clone().multiplyScalar(R), B.dir.clone().multiplyScalar(R));
  }
  if (SKY_CAT && SKY_CAT.c) {
    SKY_CAT.c.forEach(function (C) {
      if (!isMajorConst(C.n)) return;
      const L = C.l || [];
      // l is a flat list of ra,dec polylines; breaks may be grouped as sub-arrays or a single flat run.
      if (L.length && Array.isArray(L[0])) {
        L.forEach(function (poly) {
          for (let i = 0; i + 3 < poly.length; i += 2) {
            placeLinePair(poly[i], poly[i + 1], poly[i + 2], poly[i + 3]);
          }
        });
      } else {
        for (let i = 0; i + 3 < L.length; i += 2) {
          placeLinePair(L[i], L[i + 1], L[i + 2], L[i + 3]);
        }
      }
    });
  } else {
    Object.keys(CONSTELL).forEach(function (k) {
      const C = CONSTELL[k];
      const dirs = C.s.map(function (s) {
        const hit = dirFromRaDec(s[0] * 15, s[1], d);
        if (hit.alt < -2) return null;
        return hit.dir.multiplyScalar(R);
      });
      C.l.forEach(function (e) {
        if (dirs[e[0]] && dirs[e[1]]) dashLine(dirs[e[0]], dirs[e[1]]);
      });
    });
  }
  constLines.geometry.setAttribute("position", new THREE.Float32BufferAttribute(linePos, 3));

  // IM Fell italic names at constellation centers, only when well above the horizon.
  if (constNameGroup) {
    if (!constNameGroup.userData.built && SKY_CAT && SKY_CAT.c) {
      SKY_CAT.c.forEach(function (C) {
        const sp = makeNameSprite(C.n, true);
        sp.visible = false;
        constNameGroup.add(sp);
      });
      constNameGroup.userData.built = true;
    }
    const names = constNameGroup.children;
    if (SKY_CAT && SKY_CAT.c) {
      for (let i = 0; i < names.length && i < SKY_CAT.c.length; i++) {
        const C = SKY_CAT.c[i];
        const cen = constCenterRaDec(C);
        const hit = dirFromRaDec(cen[0], cen[1], d);
        let ndc = null;
        let inFrame = false;
        if (camera && hit.alt > 0) {
          const world = hit.dir.clone().multiplyScalar(R);
          if (skyGroup) world.add(skyGroup.position);
          world.project(camera);
          ndc = { x: world.x, y: world.y, z: world.z };
          inFrame = Math.abs(world.x) < 0.88 && Math.abs(world.y) < 0.88 && world.z < 1 && world.z > -1;
        }
        const show = isMajorConst(C.n) && hit.alt > 8 && clock.night > 0.25 && inFrame;
        names[i].visible = show;
        if (show) {
          names[i].position.copy(hit.dir).multiplyScalar(R * 0.96);
        }
        if (C.n === "Cygnus" && typeof window !== "undefined") {
          window.__cygnusProbe = { ra: cen[0], dec: cen[1], alt: hit.alt, az: hit.az, ndc: ndc, show: show };
        }
      }
    }
  }
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


const VOL_CLOUD_VERT = /* glsl */`
varying vec2 vUv;
varying vec3 vWorld;
uniform float uTime;
void main(){
  vUv = uv;
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;

const VOL_CLOUD_FRAG = /* glsl */`
uniform float uSeed, uTime, uKind, uGray, uRain, uReduce, uNight, uDeck, uShaft, uCirrus, uStreak, uTwi, uEdgeFade, uAlphaMul, uStorm;
uniform vec3 uInk, uNightMul, uMoonDir, uLook, uSunDir;
uniform vec3 uStrikePos, uStrikeOrigin;
uniform float uStrikeAmt, uStrikeRad;
varying vec2 vUv;
varying vec3 vWorld;
${NOISE_GLSL}

vec2 simplexGrad(vec2 i){
  float h = hash21(i) * 6.2831853;
  return vec2(cos(h), sin(h));
}
float simplex2(vec2 p){
  const float K1 = 0.366025404;
  const float K2 = 0.211324865;
  vec2 i = floor(p + (p.x + p.y) * K1);
  vec2 a = p - i + (i.x + i.y) * K2;
  float m = step(a.y, a.x);
  vec2 o = vec2(m, 1.0 - m);
  vec2 b = a - o + K2;
  vec2 c = a - 1.0 + 2.0 * K2;
  vec3 h = max(0.5 - vec3(dot(a, a), dot(b, b), dot(c, c)), 0.0);
  vec3 n = h * h * h * h * vec3(
    dot(a, simplexGrad(i)),
    dot(b, simplexGrad(i + o)),
    dot(c, simplexGrad(i + 1.0))
  );
  return clamp(dot(n, vec3(70.0)) * 0.5 + 0.5, 0.0, 1.0);
}
float lumpNoise(vec2 p){
  float n = 0.0, a = 0.5, s = 0.0;
  vec2 q = p;
  for (int k = 0; k < 5; k++) {
    n += a * simplex2(q);
    s += a;
    q = vec2(q.x * 1.85 + q.y * 0.58, q.y * 1.85 - q.x * 0.58) + vec2(3.17, 7.41);
    a *= 0.5;
  }
  return n / max(s, 0.001);
}


float lobe(vec2 p, vec2 c, float r) {
  vec2 d = (p - c) / max(r, 0.02);
  float n = (noise21(p * 3.4 + uSeed) - 0.5) * 0.22;
  float e = length(d) - n;
  return 1.0 - smoothstep(0.86, 1.05, e);
}

void main(){
  vec2 p = (vUv - 0.5) * 2.0;
  float s = uSeed;
  float b = 0.0;
  float rel = 0.0;
  float hatch = 0.0;
  float rim = 0.0;
  float lumps = 0.0;
  float gaps = 0.0;
  vec3 col = vec3(0.0);
  float alpha = 0.0;

  if (uShaft > 0.5) {
    // Gray hatched curtain, tapering toward the ground and the sides, slanted with the wind.
    float x = vUv.x * 2.0 - 1.0;
    float y = vUv.y;
    float side = 1.0 - smoothstep(0.42 + 0.50 * y, 1.02, abs(x));
    float vert = smoothstep(0.0, 0.10, y) * smoothstep(1.0, 0.86, y);
    float rx = vUv.x * 22.0 + vUv.y * 14.0 + uTime * (1.0 - uReduce) * 0.9;
    float hatchL = 1.0 - smoothstep(0.0, 0.20, abs(fract(rx) - 0.5));
    hatchL *= step(0.16, hash21(vec2(floor(rx), s)));
    hatchL *= step(0.10, hash21(vec2(floor(rx), floor(vUv.y * 11.0) + s)));
    float body = side * vert;
    if (body < 0.04) discard;
    vec3 gray = vec3(0.50, 0.54, 0.58);
    col = mix(gray, mix(uInk, vec3(0.40, 0.44, 0.48), 0.45), hatchL * 0.50);
    alpha = body * mix(0.16, 0.42, hatchL) * (0.55 + 0.45 * y);
    b = 1.0; rel = vUv.y; rim = 0.0; hatch = hatchL;
  } else if (uDeck > 0.5) {
    // Horizontal world deck. Darkest overhead, lighter and flatter toward the ridges.
    // Small rounded lumps with thin pale gaps, uniform in world XZ so perspective
    // flattens and crowds them toward the horizon like a stratocumulus underside.
    // Hatch is horizontal (rows of constant elevation). No diagonal strokes.
    vec3 wr = normalize(vWorld - cameraPosition);
    float elev = wr.y;
    float azim = atan(wr.x, wr.z);
    float dist = length(vWorld - cameraPosition);
    rel = clamp(1.0 - dist / 14000.0, 0.0, 1.0);
    float up = smoothstep(0.02, 0.58, elev);
    vec3 pale = mix(vec3(0.70, 0.72, 0.74), vec3(0.60, 0.62, 0.65), uGray);
    vec3 midc = mix(vec3(0.50, 0.52, 0.55), vec3(0.40, 0.42, 0.46), uGray);
    vec3 dark = mix(vec3(0.34, 0.36, 0.40), vec3(0.26, 0.28, 0.32), uGray);
    vec3 wash = mix(pale, midc, up * 0.70);
    wash = mix(wash, dark, up * up * 0.85);
    vec2 q = vWorld.xz * 0.00335;
    vec2 qr = vec2(0.866 * q.x - 0.500 * q.y, 0.500 * q.x + 0.866 * q.y);
    vec2 qs = vec2(0.500 * q.x - 0.866 * q.y, 0.866 * q.x + 0.500 * q.y);
    float nA = lumpNoise(q + vec2(s, s * 0.37));
    float nB = lumpNoise(qr * 1.62 + vec2(s + 3.1, s * 0.7));
    float nC = lumpNoise(qs * 2.35 + vec2(8.2, s));
    float field = nA * 0.55 + nB * 0.30 + nC * 0.15;
    // Rounded cells with thin paler gaps; contrast falls off toward the ridges.
    lumps = smoothstep(0.36, 0.66, field);
    gaps = 1.0 - smoothstep(0.30, 0.48, field);
    float relief = mix(0.28, 1.0, up);
    float rollDark = lumps * relief;
    // Pale flecks read as a static screen in storm. Keep a little gap only in overcast.
    wash = mix(wash, pale, gaps * 0.48 * mix(0.30, 0.85, up) * (1.0 - uStorm));
    wash = mix(wash, dark, rollDark * mix(0.58, 0.82, uStorm));
    if (uStorm > 0.5) {
      wash = mix(wash, dark * 0.78, 0.28 + 0.50 * up);
      vec3 horBand = mix(pale, midc, 0.22);
      wash = mix(wash, horBand, (1.0 - up) * 0.78);
    }
    // Thin ink dashes on lump undersides, engraved by hand: row phase and
    // spacing jitter per cell, warped rows, and uneven stroke lengths. Keep
    // the stroke thin and the azimuth cells dense so the old rectangular
    // tiles (fat elev*18 bands carved into 7-13 cells) stay gone.
    float cellAz = floor(azim * mix(56.0, 102.0, up));
    float rowScale = mix(140.0, 56.0, up) * mix(0.78, 1.28, hash21(vec2(cellAz, s + 1.3)));
    float row = elev * rowScale + (nC - 0.5) * 1.35 + hash21(vec2(cellAz, s + 4.7)) * 0.95;
    float f = fract(row) - 0.5;
    float lineW = mix(0.038, 0.068, hash21(vec2(floor(row), cellAz + s)));
    float line = 1.0 - smoothstep(0.0, lineW, abs(f));
    float along = azim * mix(56.0, 108.0, hash21(vec2(floor(row), s + 2.1)));
    float segF = fract(along + hash21(vec2(floor(row) + cellAz, s + 6.0)));
    float segLen = mix(0.07, 0.55, hash21(vec2(floor(row) * 9.0, floor(along) + s)));
    float inSeg = step(0.0, segF) * step(segF, segLen);
    float taper = smoothstep(0.0, 0.06, segF) * smoothstep(segLen, segLen - 0.06, segF);
    float lift = step(0.16, hash21(vec2(floor(row) * 11.0, floor(along) + s)));
    float dens = mix(0.06, 1.0, rollDark) * mix(0.18, 0.95, up);
    dens = mix(dens, dens * 1.35, uStorm);
    hatch = dens * line * lift * inSeg * taper;
    col = mix(wash, uInk, clamp(hatch * mix(0.40, 0.62, uStorm), 0.0, 0.70));
    // Soft circular fade so the square deck edge never reads as a seam.
    float edge = 1.0 - smoothstep(0.60, 0.86, length(vUv - 0.5) * 2.0);
    // Leave a lighter band of sky between the cloud base and the far ridges.
    float gap0 = mix(0.022, 0.040, uRain);
    float gap1 = mix(0.078, 0.125, uRain);
    float skyGap = smoothstep(gap0, gap1, elev);
    float scallop = 0.5 + 0.5 * sin(azim * 10.5 + s) + 0.28 * (lumps - 0.5);
    skyGap *= smoothstep(0.0, 0.42, skyGap / max(0.12, 0.38 + scallop * 0.25));
    rim = 1.0 - smoothstep(0.0, 0.12, rel);
    b = 1.0;
    alpha = 0.96 * edge * skyGap;
  } else if (uCirrus > 0.5) {
    // A few long, fine, curved strokes. Mesh yaw follows the wind. ~30% ink.
    vec2 q = (vUv - 0.5);
    float wave = sin(q.x * 3.2 + s) * 0.10 + (noise21(vec2(q.x * 1.6, s)) - 0.5) * 0.07;
    float taper = 1.0 - smoothstep(0.32, 0.50, abs(q.x));
    float stroke = 0.0;
    for (int i = 0; i < 3; i++) {
      float off = (float(i) - 1.0) * 0.055;
      float d = abs(q.y - wave - off);
      float w = 0.016 + float(i) * 0.006;
      stroke = max(stroke, (1.0 - smoothstep(w, w + 0.034, d)) * (i == 1 ? 1.0 : 0.45));
    }
    float body = stroke * taper;
    if (body < 0.04) discard;
    // Faint soft gray, never a hard dark line.
    col = mix(vec3(0.78, 0.80, 0.82), vec3(0.88, 0.89, 0.90), 0.55);
    alpha = body * 0.045 * smoothstep(0.22, 0.50, uEdgeFade);
    b = body; rel = 0.7; rim = 0.0; hatch = stroke;
  } else if (uStreak > 0.5) {
    // Far deck of flattened streaks sitting just above the ridges.
    vec2 q = (vUv - 0.5) * vec2(1.0, 2.8);
    float wave = (noise21(vec2(q.x * 1.8, s)) - 0.5) * 0.18;
    float body = 1.0 - smoothstep(0.22, 0.62, abs(q.y + wave));
    body *= 1.0 - smoothstep(0.35, 1.02, abs(q.x) * 2.0);
    if (body < 0.05) discard;
    float toneKey = (1.0 - body) * 0.5 + (1.0 - vUv.y) * 0.35;
    vec3 paper = vec3(0.94, 0.90, 0.82);
    vec3 midc = vec3(0.78, 0.76, 0.72);
    vec3 shade = vec3(0.62, 0.61, 0.60);
    vec3 wash = paper;
    if (toneKey > 0.32) wash = midc;
    if (toneKey > 0.58) wash = shade;
    float row = q.x * 9.0 + noise21(q * 2.4 + vec2(s, 2.0)) * 0.3;
    float line = 1.0 - smoothstep(0.0, 0.2, abs(fract(row) - 0.5));
    float lift = step(0.2, hash21(vec2(floor(row * 4.0), s)));
    col = mix(wash, uInk, clamp(line * lift * 0.4, 0.0, 0.55));
    float edge = 1.0 - smoothstep(0.15, 0.45, vUv.y);
    col = mix(col, uInk, edge * lift * 0.35);
    alpha = 0.9 * body;
    b = body; rel = vUv.y; rim = edge; hatch = line;
  } else {
    // Tall lumpy cumulus: a flat base and several stacked lobes, not a thin lens.
    b = max(b, lobe(p, vec2(0.00, -0.22), 0.50));
    b = max(b, lobe(p, vec2(-0.46, -0.10), 0.34 + 0.05 * hash21(vec2(s, 1.0))));
    b = max(b, lobe(p, vec2(0.44, -0.12), 0.32 + 0.06 * hash21(vec2(s, 2.0))));
    b = max(b, lobe(p, vec2(-0.20, 0.22), 0.30 + 0.05 * hash21(vec2(s, 3.0))));
    b = max(b, lobe(p, vec2(0.24, 0.28), 0.28 + 0.05 * hash21(vec2(s, 4.0))));
    b = max(b, lobe(p, vec2(0.02, 0.52), 0.24 + 0.04 * hash21(vec2(s, 5.0))));
    b = max(b, lobe(p, vec2(-0.10, 0.74), 0.18 + 0.03 * hash21(vec2(s, 6.0))));
    // Flat underside at a common base; puffy tops stay lumpy.
    b *= smoothstep(-0.62, -0.50, p.y);
    if (b < 0.08) discard;
    rel = clamp((p.y + 0.62) / 1.55, 0.0, 1.0);
    // Mostly bare cream paper. Undersides a cool pale gray-blue, only slightly
    // darker than the sky, never brown or taupe. Light hatching.
    vec3 paper = vec3(0.97, 0.94, 0.86);
    vec3 shade = vec3(0.78, 0.82, 0.86);
    float under = 1.0 - smoothstep(0.10, 0.42, rel);
    float toneKey = under * 0.8 + (1.0 - b) * 0.12 + (noise21(p * 2.6 + vec2(s, 1.3)) - 0.5) * 0.10;
    vec3 wash = mix(paper, shade, clamp(toneKey, 0.0, 1.0));
    // Dusk and dawn: undersides amber near the sun, rose farther away. Tops stay cream.
    if (uTwi > 0.12 && uNight < 0.45) {
      vec3 amber = vec3(0.949, 0.769, 0.420);
      vec3 rose = vec3(0.831, 0.522, 0.502);
      vec3 toFrag = normalize(vWorld - cameraPosition);
      float sunNear = smoothstep(0.50, 0.92, dot(toFrag, normalize(uSunDir)));
      vec3 duskUnder = mix(rose, amber, sunNear);
      wash = mix(paper, duskUnder, under * 0.92);
    }
    float body = 1.0;
    float dens = step(0.36, toneKey);
    float ang0 = -0.08 + 0.18 * p.x * (1.0 - rel);
    float rowN = noise21(p * 1.4 + vec2(s, 2.4));
    float ang = ang0 + (hash21(vec2(floor(p.y * 9.0 + p.x * 2.0), s)) - 0.5) * 0.45;
    vec2 dir = vec2(cos(ang), sin(ang));
    vec2 nrm = vec2(-sin(ang), cos(ang));
    float sp = mix(0.085, 0.16, hash21(vec2(s, 8.0)));
    float row = dot(p, nrm) / sp + rowN * 0.35;
    float rid = floor(row);
    float f = fract(row) - 0.5;
    float along = dot(p, dir);
    float len = mix(0.30, 0.95, hash21(vec2(rid, s + 1.7)));
    float start = (hash21(vec2(rid, s + 4.2)) - 0.5) * 1.2;
    float tt = (along - start) / max(0.08, len);
    float inS = step(-0.05, tt) * step(tt, 1.05);
    float taper = smoothstep(-0.05, 0.16, tt) * smoothstep(1.05, 0.84, tt);
    float gap = step(0.38, hash21(vec2(rid * 13.0, floor(along * 5.0) + s)));
    float line = 1.0 - smoothstep(0.0, 0.18 * max(0.35, taper), abs(f));
    // Engraved hatch on the shadow side (away from the sun) and the flat base.
    float sunSx = sign(uSunDir.x + 0.0001);
    float shadow = 1.0 - smoothstep(-0.05, 0.48, p.x * sunSx + rel * 0.12);
    hatch = dens * line * taper * inS * gap * mix(0.45, 1.0, max(under, shadow));
    col = mix(wash, uInk, clamp(hatch * 0.52, 0.0, 0.62));
    // Inked outline around the lobe union, heavier on the shadow side, with pen lifts.
    rim = 1.0 - smoothstep(0.06, 0.22, b);
    float lift = step(0.22, hash21(vec2(floor(p.x * 16.0 + s), floor(p.y * 12.0))));
    col = mix(col, uInk, rim * lift * mix(0.42, 0.88, shadow));
    col = mix(col, mix(col, uInk, 0.16), shadow * 0.32 * (1.0 - rel * 0.25));
    alpha = 0.98;
  }

  if (uShaft > 0.5 && uRain > 0.5 && vUv.y < 0.72) {
    float rx = vUv.x * 70.0 + vUv.y * 36.0 + uTime * (1.0 - uReduce) * 1.1;
    float shaft = 1.0 - smoothstep(0.0, 0.07, abs(fract(rx) - 0.5));
    shaft *= step(0.18, hash21(vec2(floor(rx), s)));
    // Occasional shorter lifts so the shafts do not read as a regular screen.
    shaft *= step(0.12, hash21(vec2(floor(rx), floor(vUv.y * 14.0) + s)));
    col = mix(col, mix(uInk, vec3(0.55, 0.57, 0.60), 0.55), shaft * 0.48);
    alpha = max(alpha, shaft * 0.55 * (1.0 - vUv.y * 0.45));
  }
  // Night: indigo a touch lighter than the sky, cream rim on the moon-facing side.
  // Thin edges are translucent so stars show through.
  if (uNight > 0.01) {
    vec3 nightBody = vec3(0.085, 0.11, 0.22) * mix(1.0, 0.78, max(uGray, uDeck));
    nightBody *= 0.90 + 0.14 * noise21(vWorld.xz * 0.02 + vUv * 6.0);
    vec3 nCol = mix(nightBody * 0.92, nightBody * 1.12, step(0.5, rel));
    nCol = mix(nCol, uInk, clamp(hatch * 0.16, 0.0, 0.28));
    vec3 toFrag = normalize(vWorld - cameraPosition);
    float moonSide = clamp(dot(normalize(uMoonDir), toFrag), 0.0, 1.0);
    vec3 creamRim = vec3(0.93, 0.90, 0.82);
    nCol = mix(nCol, creamRim, rim * moonSide * 0.85);
    col = mix(col, nCol, uNight);
    if (uDeck < 0.5 && uShaft < 0.5) {
      float edgeA = mix(0.22, 0.80, smoothstep(0.08, 0.48, b));
      alpha = mix(alpha, alpha * edgeA, uNight);
    }
    if (uRain > 0.5 && vUv.y < 0.55) {
      float rxn = vUv.x * 16.0 + vUv.y * 8.0 + uTime * (1.0 - uReduce) * 1.1;
      float shaftN = 1.0 - smoothstep(0.0, 0.16, abs(fract(rxn) - 0.5));
      shaftN *= step(0.22, hash21(vec2(floor(rxn), s)));
      col = mix(col, mix(uInk * 0.55, vec3(0.16, 0.20, 0.30), 0.45), shaftN * 0.5 * uNight);
    }
  }
  if (uStrikeAmt > 0.001) {
    float sd = length(vWorld.xz - uStrikePos.xz);
    float near = exp(-sd * sd / max(1.0, uStrikeRad * uStrikeRad));
    float k = min(0.62, uStrikeAmt * near);
    vec3 creamLt = vec3(0.965, 0.933, 0.863);
    if (uDeck > 0.5) {
      col = mix(col, mix(col, creamLt, 0.58), k * (0.32 + 0.68 * lumps));
      col = mix(col, creamLt, k * gaps * 0.34);
      col = mix(col, mix(col, creamLt, 0.42), k * hatch * 0.50);
    } else {
      col = mix(col, mix(col, creamLt, 0.45), k * 0.50);
    }
    float od = length(vWorld - uStrikeOrigin);
    float oNear = exp(-od * od / (420.0 * 420.0));
    float ok = min(0.85, uStrikeAmt * oNear);
    col = mix(col, creamLt, ok * mix(0.55, 0.72, 1.0 - rel));
    vec3 toFrag = vWorld - cameraPosition;
    vec3 toBolt = uStrikePos - cameraPosition;
    float boltDist = length(toBolt);
    vec3 bdir = toBolt / max(1.0, boltDist);
    float alongB = dot(toFrag, bdir);
    float perp = length(toFrag - bdir * alongB);
    float onScreen = 1.0 - smoothstep(40.0, 380.0, perp);
    float inFront = step(-80.0, alongB) * (1.0 - smoothstep(boltDist + 180.0, boltDist + 520.0, alongB));
    float fade = onScreen * inFront * clamp(uStrikeAmt / 0.72, 0.0, 1.0);
    if (uShaft > 0.5) {
      alpha *= mix(1.0, 0.05, fade);
    }
    if (uDeck > 0.5 && uRain > 0.5) {
      // Soften deck-attached rain strokes in the same cone so they do not
      // draw a ruled screen across the bolt.
      col = mix(col, mix(col, creamLt, 0.2), fade * 0.15);
    }
  }
  alpha *= uAlphaMul;
  if (alpha < 0.06) discard;
  gl_FragColor = vec4(col, alpha);
}
`;

let volCloudGroup = null;
const volCloudItems = [];

function cloudBaseM() {
  if (wx.base) return wx.base;
  if (wx.kind === "fog") return 180;
  if (wx.kind === "rain" || wx.kind === "storm" || wx.kind === "cloudy") return 700;
  if (wx.kind === "snow") return 900;
  return 1400;
}

function makeVolCloudMat(kind, seed, gray) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uSeed: { value: seed },
      uTime: { value: 0 },
      uKind: { value: kind },
      uGray: { value: gray },
      uRain: { value: 0 },
      uReduce: { value: REDUCE ? 1 : 0 },
      uInk: { value: new THREE.Color(0x2A2118) },
      uNight: { value: 0 },
      uNightMul: { value: colU(NIGHT_MUL) },
      uMoonDir: { value: new THREE.Vector3(0.2, 0.5, 0.4) },
      uDeck: { value: 0 },
      uFlat: { value: 0 },
      uShaft: { value: 0 },
      uCirrus: { value: 0 },
      uStreak: { value: 0 },
      uTwi: { value: 0 },
      uEdgeFade: { value: 1 },
      uStorm: { value: 0 },
      uAlphaMul: { value: 1 },
      uLook: { value: new THREE.Vector3(0, 0, 1) },
      uSunDir: { value: new THREE.Vector3(0.3, 0.8, 0.2) },
      uStrikePos: { value: new THREE.Vector3() },
      uStrikeOrigin: { value: new THREE.Vector3() },
      uStrikeAmt: { value: 0 },
      uStrikeRad: { value: 1600 }
    },
    vertexShader: VOL_CLOUD_VERT,
    fragmentShader: VOL_CLOUD_FRAG,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide
  });
}

function buildVolClouds() {
  if (volCloudGroup) {
    scene.remove(volCloudGroup);
    volCloudGroup.traverse(function (o) {
      if (o.geometry) o.geometry.dispose();
      if (o.material) o.material.dispose();
    });
  }
  volCloudGroup = new THREE.Group();
  volCloudGroup.name = "volClouds";
  scene.add(volCloudGroup);
  volCloudItems.length = 0;
  const kind = wx.kind || "clear";
  const deck = (kind === "cloudy" || kind === "rain" || kind === "storm" || kind === "snow");
  const gray = deck ? (kind === "rain" || kind === "storm" ? 0.95 : kind === "snow" ? 0.72 : 0.85) : (kind === "fog" ? 0.7 : 0.0);
  // Scattered fair-weather puffs, or layered hatched bands when overcast/rain/snow.
  let puffSpec;
  // World-fixed homes, varied depths so near cards parallax faster than far ones.
  // az is world azimuth from the valley anchor (0 = north), not camera-relative.
  if (deck) {
    // Horizontal world ceilings at three altitudes so the deck parallaxes and never follows the camera.
    const deckAlt = (kind === "storm") ? 680 : 900;
    puffSpec = [
      { az: 0.0, dist: 0, alt: deckAlt, sx: 56000, sy: 56000, seed: 1.1, flat: 1 }
    ];
  } else if (kind === "fog") {
    puffSpec = [
      { az: -0.20, dist: 700, alt: 90, sx: 900, sy: 180, seed: 2.2 },
      { az: 0.18, dist: 1100, alt: 110, sx: 1100, sy: 200, seed: 7.1 },
      { az: 0.02, dist: 1700, alt: 130, sx: 1400, sy: 220, seed: 12.4 },
      { az: -0.35, dist: 2300, alt: 150, sx: 1600, sy: 240, seed: 18.0 },
      { az: 0.40, dist: 3000, alt: 170, sx: 1800, sy: 260, seed: 21.6 }
    ];
  } else {
    // 12-20 fair-weather cumulus, count from live cloud_cover. Poisson-disc on one
    // horizontal plane at a common base so they spread across the sky and never stack.
    const cover = weatherCover();
    const nFair = Math.round(12 + 8 * clamp(cover / 0.55, 0, 1));
    const rngC = mulberry(44021);
    const baseAlt = 900;
    const heroW = pxToWorld(HERO.px, HERO.py);
    const churchW = cloudAnchor();
    const lookAz = Math.atan2(churchW.x - heroW.x, churchW.z - heroW.z);
    // Wide fan in front of the hero so puffs spread left to right across the sky,
    // including a little extra for pans. One common base, none stacked.
    const pts = poissonDiscFan(rngC, nFair, 1500, heroW.x, heroW.z, lookAz - 0.95, lookAz + 0.95, 1600, 7800);
    puffSpec = [];
    // A few big puffs near the camera, many small ones far. Size follows
    // distance, not a uniform draw, so the field has a real scale gradient.
    const sized = pts.map(function (pt) {
      return { x: pt.x, z: pt.z, dist: Math.hypot(pt.x - heroW.x, pt.z - heroW.z) };
    }).sort(function (a, b) { return a.dist - b.dist; });
    for (let i = 0; i < sized.length; i++) {
      const tFar = clamp((sized[i].dist - 1600) / 6200, 0, 1);
      let sx;
      // Near puffs at ~60% of the previous size so the biggest is about 1/5 of the hero frame.
      if (i < 3 && tFar < 0.35) sx = 660 + rngC() * 300;
      else if (tFar < 0.42) sx = 400 + rngC() * 200;
      else sx = 150 + rngC() * 200;
      // Height at least ~0.6 of width so near puffs read as stacked cumulus, not saucers.
      const sy = (i < 3 && tFar < 0.35)
        ? sx * (0.72 + rngC() * 0.16)
        : sx * (0.62 + rngC() * 0.12);
      puffSpec.push({
        x: sized[i].x, z: sized[i].z, alt: baseAlt,
        sx: sx, sy: sy, seed: 2.1 + i * 9.3
      });
    }
    const nCirrus = 3 + ((rngC() * 3) | 0);
    const cirrusPts = poissonDiscFan(rngC, nCirrus, 2600, heroW.x, heroW.z, lookAz - 1.1, lookAz + 1.1, 3500, 9000);
    for (let i = 0; i < cirrusPts.length; i++) {
      puffSpec.push({
        x: cirrusPts[i].x, z: cirrusPts[i].z,
        alt: 2400 + rngC() * 700,
        sx: 2600 + rngC() * 1200,
        sy: 220 + rngC() * 120,
        seed: 80 + i * 13.1,
        cirrus: 1
      });
    }
  }
  const puffs = puffSpec.length;
  const anchor = cloudAnchor();
  const ground = yOf(heightWorld(anchor.x, anchor.z));
  for (let i = 0; i < puffs; i++) {
    const sp = puffSpec[i % puffSpec.length];
    const segs = sp.flat ? 48 : 1;
    const geo = new THREE.PlaneGeometry(1, 1, segs, segs);
    const mat = makeVolCloudMat(0, sp.seed, gray);
    mat.uniforms.uDeck.value = deck && !sp.shaft ? 1 : 0;
    mat.uniforms.uRain.value = (kind === "rain" || kind === "storm") ? 1 : 0;
    if (mat.uniforms.uStorm) mat.uniforms.uStorm.value = (kind === "storm") ? 1 : 0;
    mat.uniforms.uFlat.value = sp.flat ? 1 : 0;
    mat.uniforms.uShaft.value = sp.shaft ? 1 : 0;
    mat.uniforms.uCirrus.value = sp.cirrus ? 1 : 0;
    mat.uniforms.uStreak.value = sp.streak ? 1 : 0;
    const mesh = new THREE.Mesh(geo, mat);
    mesh.frustumCulled = false;
    mesh.renderOrder = 1;
    volCloudGroup.add(mesh);
    const off0 = (sp.x != null) ? null : offsetNorth(sp.az, sp.dist);
    const homeX = (sp.x != null) ? sp.x : (anchor.x + off0.x);
    const homeZ = (sp.z != null) ? sp.z : (anchor.z + off0.z);
    const homeY = ground + sp.alt;
    volCloudItems.push({
      mesh: mesh, kind: 0,
      homeX: homeX, homeY: homeY, homeZ: homeZ,
      sx: sp.sx, sy: sp.sy, seed: sp.seed, flat: !!sp.flat, shaft: !!sp.shaft, cirrus: !!sp.cirrus
    });
  }
  if (kind === "rain" || kind === "storm") {
    // Short veils hanging from the cloud bases, not a screen across the sky dome.
    const heroW = pxToWorld(HERO.px, HERO.py);
    const lookAz = Math.atan2(anchor.x - heroW.x, anchor.z - heroW.z);
    const base = cloudBaseM();
    // 4 curtains hanging from the cloud base down to the land, slanted with the wind.
    const curtains = [
      { side: -0.18, dist: 620, sx: 520, seed: 31.1 },
      { side: 0.10, dist: 980, sx: 680, seed: 32.4 },
      { side: 0.28, dist: 1480, sx: 820, seed: 33.8 },
      { side: -0.08, dist: 1980, sx: 960, seed: 34.6 }
    ];
    for (let i = 0; i < curtains.length; i++) {
      const sp = curtains[i];
      const mat = makeVolCloudMat(0, sp.seed, gray);
      mat.uniforms.uDeck.value = 0;
      mat.uniforms.uRain.value = 1;
      mat.uniforms.uFlat.value = 0;
      mat.uniforms.uShaft.value = 1;
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
      mesh.frustumCulled = false;
      mesh.renderOrder = 2;
      volCloudGroup.add(mesh);
      const az = lookAz + sp.side;
      volCloudItems.push({
        mesh: mesh, kind: 0,
        homeX: heroW.x + Math.sin(az) * sp.dist,
        homeY: ground + base * 0.48,
        homeZ: heroW.z + Math.cos(az) * sp.dist,
        sx: sp.sx, sy: base * 0.96, seed: sp.seed, flat: false, shaft: true
      });
    }
  }
}

function layoutVolClouds() {
  if (!volCloudGroup || !camera) return;
  const drift = windDrift();
  const cx = camera.position.x, cy = camera.position.y, cz = camera.position.z;
  for (let i = 0; i < volCloudItems.length; i++) {
    const it = volCloudItems[i];
    const x = it.homeX + drift.x;
    const y = it.homeY;
    const z = it.homeZ + drift.z;
    it.mesh.position.set(x, y, z);
    it.mesh.scale.set(it.sx, it.sy, 1);
    if (it.flat) {
      it.mesh.rotation.set(-Math.PI / 2, 0, 0);
    } else if (it.shaft) {
      const yaw = Math.atan2(cx - x, cz - z);
      const w = windToward();
      const lean = Math.atan2((w.ms || 0) * 0.28, 12.0);
      it.mesh.rotation.set(-lean, yaw, 0);
    } else if (it.cirrus) {
      // Long axis along the wind (toward). Upright, not camera-tilted.
      const yaw = Math.atan2(drift.x, drift.z);
      it.mesh.rotation.set(0, yaw, 0);
      const nx = Math.sin(yaw), nz = Math.cos(yaw);
      const vx = cx - x, vz = cz - z;
      const vlen = Math.hypot(vx, vz) || 1;
      const facing = Math.abs((vx * nx + vz * nz) / vlen);
      if (it.mesh.material && it.mesh.material.uniforms && it.mesh.material.uniforms.uEdgeFade) {
        it.mesh.material.uniforms.uEdgeFade.value = facing;
      }
    } else {
      // Upright yaw-only billboard so flat undersides stay on the common base plane.
      it.mesh.rotation.set(0, Math.atan2(cx - x, cz - z), 0);
    }
    if (it.mesh.material && it.mesh.material.uniforms) {
      it.mesh.material.uniforms.uTime.value = state.time || 0;
      const look = new THREE.Vector3();
      camera.getWorldDirection(look);
      if (it.mesh.material.uniforms.uLook) it.mesh.material.uniforms.uLook.value.copy(look);
      // Keep every cloud at least 10 deg from the moon when it is up.
      let alphaMul = 1;
      if (clock && clock.night > 0.15 && clock.moonAlt > -4 && !it.shaft) {
        const mx = x - cx, my = y - cy, mz = z - cz;
        const md = Math.hypot(mx, my, mz) || 1;
        const moon = altAzDir(clock.moonAlt, clock.moonAz);
        const cdot = (mx * moon.x + my * moon.y + mz * moon.z) / md;
        const ang = Math.acos(Math.max(-1, Math.min(1, cdot))) * 180 / Math.PI;
        alphaMul = ang <= 10 ? 0 : (ang < 13 ? (ang - 10) / 3 : 1);
      }
      if (it.mesh.material.uniforms.uAlphaMul) it.mesh.material.uniforms.uAlphaMul.value = alphaMul;
      if (!it.shaft) it.mesh.visible = alphaMul > 0.02;
    }
  }
}

function buildSnow() {
  if (snowPts) {
    scene.remove(snowPts);
    if (snowPts.geometry) snowPts.geometry.dispose();
    if (snowPts.material) snowPts.material.dispose();
  }
  const N = 3200;
  const pos = new Float32Array(N * 3);
  const ph = new Float32Array(N);
  const rng = mulberry(23);
  for (let i = 0; i < N; i++) ph[i] = rng();
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("aPhase", new THREE.BufferAttribute(ph, 1));
  snowPts = new THREE.Points(geo, new THREE.ShaderMaterial({
    uniforms: { uPixel: { value: 1 } },
    vertexShader: /* glsl */`
      attribute float aPhase;
      varying float vPhase;
      uniform float uPixel;
      void main(){
        vPhase = aPhase;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        float dist = max(40.0, -mv.z);
        float vary = 0.45 + 2.6 * pow(fract(vPhase * 5.17), 1.2);
        gl_PointSize = clamp((1400.0 / dist) * vary, 2.4, 28.0) * uPixel;
      }
    `,
    fragmentShader: /* glsl */`
      varying float vPhase;
      void main(){
        vec2 p = gl_PointCoord * 2.0 - 1.0;
        float r = length(p);
        float disc = 1.0 - smoothstep(0.28, 1.0, r);
        if (disc < 0.05) discard;
        // Cream flake with a soft ink rim so it reads on both sky and snowed ground.
        float rim = smoothstep(0.18, 0.55, r) * (1.0 - smoothstep(0.72, 1.0, r));
        vec3 cream = vec3(0.93, 0.90, 0.84);
        vec3 ink = vec3(0.28, 0.23, 0.18);
        vec3 col = mix(cream, ink, rim * 0.85);
        float a = disc * 0.95;
        gl_FragColor = vec4(col, a);
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: true
  }));
  snowPts.frustumCulled = false;
  snowPts.renderOrder = 4;
  snowPts.visible = wx.kind === "snow";
  snowPts.userData.phase = ph;
  scene.add(snowPts);
}

function layoutSnow() {
  if (!snowPts || !camera || wx.kind !== "snow") {
    if (snowPts) snowPts.visible = false;
    return;
  }
  snowPts.visible = true;
  const pos = snowPts.geometry.attributes.position.array;
  const ph = snowPts.userData.phase;
  const a = cloudAnchor();
  const drift = windDrift();
  const tt = (state.time || 0);
  const half = 2800;
  const tall = 520;
  const N = pos.length / 3;
  for (let i = 0; i < N; i++) {
    // Stable world XZ from the flake seed, plus the same slow wind as the clouds.
    const x0 = a.x + (((ph[i] * 73.17) % 1) - 0.5) * 2 * half;
    const z0 = a.z + (((ph[i] * 41.91) % 1) - 0.5) * 2 * half;
    const ground = yOf(heightWorld(x0, z0));
    const fall = (tt * (7 + ph[i] * 9) + ph[i] * 160) % tall;
    pos[i * 3] = x0 + drift.x;
    pos[i * 3 + 1] = ground + (tall - fall);
    pos[i * 3 + 2] = z0 + drift.z;
  }
  snowPts.geometry.attributes.position.needsUpdate = true;
}


function windToward() {
  const from = ((wx.windFromDeg != null && isFinite(wx.windFromDeg) ? wx.windFromDeg : 250) * Math.PI / 180);
  const to = from + Math.PI;
  const off = offsetNorth(to, 1);
  const len = Math.hypot(off.x, off.z) || 1;
  const ms = (wx.windMs != null && isFinite(wx.windMs) ? wx.windMs : 2.8);
  return { x: off.x / len, z: off.z / len, ms: ms };
}

function makeRainMat(close) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uCam: { value: new THREE.Vector3() },
      uWind: { value: new THREE.Vector3(0.3, 0, 0.8) },
      uBase: { value: 820 },
      uGround: { value: 400 },
      uPixel: { value: 1 },
      uClose: { value: close ? 1 : 0 },
      uStrikePos: { value: new THREE.Vector3() },
      uStrikeAmt: { value: 0 }
    },
    vertexShader: /* glsl */`
      attribute float aPhase;
      attribute vec2 aCorner;
      uniform float uTime, uBase, uGround, uPixel, uClose, uStrikeAmt;
      uniform vec3 uCam, uWind, uStrikePos;
      varying float vDist;
      varying float vAlong;
      varying float vOpac;
      varying float vClear;
      float hash(float n){ return fract(sin(n * 127.1) * 43758.5453); }
      void main(){
        float h1 = hash(aPhase);
        float h2 = hash(aPhase + 17.2);
        float h3 = hash(aPhase + 31.7);
        float h4 = hash(aPhase + 53.9);
        float rad, ang;
        if (uClose > 0.5) {
          rad = 4.0 + h1 * 16.0;
          ang = h2 * 6.2831853;
        } else {
          // Irregular radial bins so strokes do not sit on a ruled grid.
          rad = mix(16.0 + pow(h2, 0.72) * 460.0, 360.0 + pow(h1, 0.66) * 2100.0, step(0.58, h1));
          rad *= mix(0.82, 1.28, h4);
          ang = (h2 * 1.37 + h3 * 0.83 + h4 * 0.41) * 6.2831853;
        }
        vec3 hor = normalize(vec3(uWind.x, 0.0, uWind.z));
        if (length(hor) < 0.01) hor = vec3(0.3, 0.0, 0.8);
        vec3 right = vec3(-hor.z, 0.0, hor.x);
        vec3 origin = vec3(uCam.x, 0.0, uCam.z) + right * (cos(ang) * rad) + hor * (sin(ang) * rad);
        float drop = uBase - uGround + 40.0;
        float speed = mix(22.0, 54.0, h3);
        float fall = fract(uTime * speed / drop + aPhase);
        float y = uBase - fall * drop;
        float slant = (uBase - y) * mix(0.08, 0.22, h4) * (0.55 + 0.45 * length(uWind));
        origin.x += hor.x * slant;
        origin.z += hor.z * slant;
        origin.y = y;
        float lean = mix(0.28, 0.62, h2);
        vec3 dir = normalize(vec3(hor.x * lean, -1.0, hor.z * lean));
        vec3 side = normalize(cross(dir, vec3(0.0, 1.0, 0.0)));
        if (length(side) < 0.01) side = vec3(1.0, 0.0, 0.0);
        float dist = length(origin - uCam);
        vDist = dist;
        vAlong = aCorner.y;
        vOpac = mix(0.35, 1.0, h4);
        // Skip a fraction of strokes so the field has hand-inked gaps.
        if (h3 < 0.14) vOpac = 0.0;
        float pix = max(0.10, dist * 0.00105);
        float far = smoothstep(280.0, 1800.0, dist);
        float len = uClose > 0.5 ? mix(5.0, 16.0, h3) : mix(5.0, 26.0, pow(h3, 0.85));
        float wid = uClose > 0.5 ? pix * mix(1.3, 2.1, h2) : pix * mix(1.0, 1.85, h2);
        len *= mix(1.0, 0.55, far);
        wid *= mix(1.0, 1.25, far);
        vClear = 1.0;
        if (uStrikeAmt > 0.02) {
          vec3 toDrop = origin - uCam;
          vec3 toBolt = uStrikePos - uCam;
          float boltDist = length(toBolt);
          vec3 bdir = toBolt / max(1.0, boltDist);
          float alongB = dot(toDrop, bdir);
          float perp = length(toDrop - bdir * alongB);
          float onScreen = 1.0 - smoothstep(40.0, 380.0, perp);
          // Drops between the camera and the strike, or just behind it, are
          // the screen that hides the bolt. Clear that cone, not only a
          // depth shell around the end point.
          float inFront = step(-80.0, alongB) * (1.0 - smoothstep(boltDist + 180.0, boltDist + 520.0, alongB));
          float around = 1.0 - smoothstep(0.0, 480.0, abs(boltDist - alongB));
          float fade = onScreen * max(inFront * 0.94, around);
          vClear = mix(1.0, 0.02, clamp(fade * uStrikeAmt / 0.72, 0.0, 1.0));
        }
        vec3 p = origin + dir * (aCorner.y * len) + side * (aCorner.x * wid);
        gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: /* glsl */`
      uniform float uClose;
      varying float vDist;
      varying float vAlong;
      varying float vOpac;
      varying float vClear;
      void main(){
        float along = 1.0 - abs(vAlong) * 2.0;
        float body = smoothstep(0.0, 0.35, along);
        float alpha = body * vOpac * vClear;
        if (alpha < 0.03) discard;
        vec3 ink = vec3(0.30, 0.36, 0.42);
        vec3 veil = vec3(0.55, 0.58, 0.62);
        float far = smoothstep(280.0, 1800.0, vDist);
        vec3 col = mix(ink, veil, far);
        alpha *= mix(0.58, 0.16, far);
        if (uClose > 0.5) {
          col = ink;
          alpha = body * vOpac * vClear * 0.55;
        }
        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.NormalBlending
  });
}

function buildRainGeom(n) {
  const pos = new Float32Array(n * 4 * 3);
  const phase = new Float32Array(n * 4);
  const corner = new Float32Array(n * 4 * 2);
  const idx = new Uint32Array(n * 6);
  const corners = [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]];
  for (let i = 0; i < n; i++) {
    const ph = (i * 0.618033) % 1;
    const b = i * 4;
    for (let k = 0; k < 4; k++) {
      phase[b + k] = ph;
      corner[(b + k) * 2] = corners[k][0];
      corner[(b + k) * 2 + 1] = corners[k][1];
    }
    const o = b;
    idx[i * 6] = o; idx[i * 6 + 1] = o + 1; idx[i * 6 + 2] = o + 2;
    idx[i * 6 + 3] = o; idx[i * 6 + 4] = o + 2; idx[i * 6 + 5] = o + 3;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("aPhase", new THREE.BufferAttribute(phase, 1));
  geo.setAttribute("aCorner", new THREE.BufferAttribute(corner, 2));
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  geo.computeBoundingSphere();
  return geo;
}

function disposeRain() {
  [rainMesh, rainLens].forEach(function (m) {
    if (!m) return;
    scene.remove(m);
    if (m.geometry) m.geometry.dispose();
    if (m.material) m.material.dispose();
  });
  rainMesh = null;
  rainLens = null;
}

function buildRain() {
  disposeRain();
  if (wx.kind !== "rain" && wx.kind !== "storm") return;
  rainMesh = new THREE.Mesh(buildRainGeom(9000), makeRainMat(false));
  rainMesh.frustumCulled = false;
  rainMesh.renderOrder = 3;
  rainMesh.name = "rainVolume";
  scene.add(rainMesh);
  rainLens = new THREE.Mesh(buildRainGeom(48), makeRainMat(true));
  rainLens.frustumCulled = false;
  rainLens.renderOrder = 6;
  rainLens.name = "rainLens";
  scene.add(rainLens);
}

function layoutRain() {
  const on = wx.kind === "rain" || wx.kind === "storm";
  if (rainMesh) rainMesh.visible = on;
  if (rainLens) rainLens.visible = on;
  if (!on || !camera) return;
  if (!rainMesh) buildRain();
  const w = windToward();
  const base = (typeof cloudBaseM === "function" ? cloudBaseM() : 820);
  const ground = yOf(heightWorld(camera.position.x, camera.position.z));
  [rainMesh, rainLens].forEach(function (m) {
    if (!m || !m.material || !m.material.uniforms) return;
    const u = m.material.uniforms;
    u.uTime.value = state.time || 0;
    u.uCam.value.copy(camera.position);
    u.uWind.value.set(w.x * w.ms, 0, w.z * w.ms);
    u.uBase.value = ground + base;
    u.uGround.value = ground + 2;
    if (u.uStrikeAmt) u.uStrikeAmt.value = (strike && strike.amt) ? strike.amt : 0;
    if (u.uStrikePos && strike && strike.pos) u.uStrikePos.value.set(strike.pos.x, strike.pos.y, strike.pos.z);
  });
}

function buildFogBank() {
  if (fogGroup) {
    scene.remove(fogGroup);
    fogGroup.traverse(function (o) {
      if (o.geometry) o.geometry.dispose();
      if (o.material) o.material.dispose();
    });
  }
  fogGroup = new THREE.Group();
  fogGroup.name = "fogBank";
  const mat = new THREE.MeshBasicMaterial({
    color: 0xd8dce2,
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  for (let i = 0; i < 4; i++) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat.clone());
    mesh.rotation.x = -Math.PI / 2;
    mesh.frustumCulled = false;
    fogGroup.add(mesh);
  }
  fogGroup.visible = wx.kind === "fog";
  scene.add(fogGroup);
}

function layoutFogBank() {
  if (!fogGroup || !camera) return;
  fogGroup.visible = wx.kind === "fog";
  if (!fogGroup.visible) return;
  const a = cloudAnchor();
  const drift = windDrift();
  // Low banks parked in the valley, nearer and farther, so they parallax with the land.
  const homes = [
    { az: 0.05, dist: 400, sx: 700, sz: 360, lift: 12 },
    { az: -0.22, dist: 1100, sx: 1100, sz: 520, lift: 16 },
    { az: 0.18, dist: 2000, sx: 1600, sz: 700, lift: 20 },
    { az: 0.00, dist: 3200, sx: 2200, sz: 900, lift: 26 }
  ];
  for (let i = 0; i < fogGroup.children.length; i++) {
    const h = homes[i];
    const off = offsetNorth(h.az, h.dist);
    const x = a.x + off.x + drift.x * 0.4;
    const z = a.z + off.z + drift.z * 0.4;
    const y = yOf(heightWorld(x, z)) + h.lift;
    const m = fogGroup.children[i];
    m.position.set(x, y, z);
    m.scale.set(h.sx, 1, h.sz);
    m.material.opacity = 0.22 + i * 0.06;
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
  cedar: { id: 3, angle: 16, depth: 6, len: 0.16, shrink: 0.78, tw: 2.4, spread: 0.5, twigs: 3, leaf: 0.055, cone: 1 },
  pine: { id: 4, angle: 20, depth: 6, len: 0.17, shrink: 0.76, tw: 2.6, spread: 0.7, twigs: 3, leaf: 0.05, cone: 1, pine: 1 }
};
const SPEC_LIST = ["oak", "maple", "sycamore", "cedar", "pine"];

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

function drawBlobMass(ctx, cx, cy, rx, ry, rng) {
  const n = 7 + ((rng() * 4) | 0);
  ctx.beginPath();
  for (let i = 0; i <= n; i++) {
    const a = (i % n) / n * Math.PI * 2;
    const j = 0.72 + rng() * 0.46;
    const x = cx + Math.cos(a) * rx * j;
    const y = cy + Math.sin(a) * ry * j;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function drawGrownTree(ctx, S, grown, opt) {
  const rng = mulberry(opt.seed ^ 7919);
  const cx = S * 0.5;
  const ink = "rgba(42,33,24," + (opt.inkA == null ? 0.84 : opt.inkA) + ")";
  const colors = opt.colors || ["#6B4E2A"];
  const isPine = !!(grown.spec && grown.spec.pine);
  const isCedar = !!(grown.spec && grown.spec.cone) && !isPine;
  const leavesOn = (isCedar || isPine) ? (opt.leaves !== false) : !!opt.leaves;

  // Short trunk at the canvas bottom (atlas flipY is true, so this is the billboard base).
  const trunkBot = S * 0.96;
  const trunkTop = (isCedar || isPine) ? S * 0.78 : S * 0.78;
  ctx.strokeStyle = ink;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = S * ((isCedar || isPine) ? 0.034 : 0.036);
  ctx.globalAlpha = 0.92;
  ctx.beginPath();
  ctx.moveTo(cx + (rng() - 0.5) * 2, trunkBot);
  ctx.quadraticCurveTo(cx + (rng() - 0.5) * 4, (trunkBot + trunkTop) * 0.55, cx, trunkTop);
  ctx.stroke();
  // A hint of two short limbs, kept under the crown so they do not read as stick piles.
  if (!isCedar && !isPine) {
    ctx.lineWidth = S * 0.016;
    for (let b = 0; b < 2; b++) {
      const dir = b ? 1 : -1;
      const by = trunkTop + (trunkBot - trunkTop) * 0.12;
      ctx.beginPath();
      ctx.moveTo(cx, by);
      ctx.quadraticCurveTo(cx + dir * S * 0.04, by - S * 0.02, cx + dir * S * 0.07, by - S * 0.04);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;

  if (!leavesOn) {
    // Winter skeleton: a few more branches inside a wide, short envelope. No spike.
    ctx.lineWidth = S * 0.015;
    ctx.globalAlpha = 0.8;
    for (let b = 0; b < 5; b++) {
      const dir = (b % 2 ? 1 : -1);
      const by = trunkTop + (rng() - 0.3) * S * 0.04;
      ctx.beginPath();
      ctx.moveTo(cx, Math.min(trunkBot - 4, by + S * 0.04));
      ctx.quadraticCurveTo(
        cx + dir * S * 0.10,
        by - S * 0.08,
        cx + dir * S * (0.18 + rng() * 0.12),
        by - S * (0.16 + rng() * 0.08)
      );
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    return;
  }

  if (isCedar || isPine) {
    // One blunt rounded cone built from 8-15 soft overlapping foliage clumps.
    // No filled polygon, no stacked boxes, no faceted silhouette. Smooth
    // elliptical clumps, muted forest green, short trunk left visible at the base.
    const crownTop = S * 0.08;
    const crownBot = S * 0.80;
    const H = crownBot - crownTop;
    const baseHalf = S * (isPine ? 0.40 : 0.36);
    function coneHalf(t) {
      const blunt = 0.22 + 0.78 * Math.pow(Math.max(0, Math.min(1, t)), 0.78);
      const lump = Math.sin(t * 8.4 + (isPine ? 1.1 : 0.5)) * 0.04
        + (rng() - 0.5) * 0.03;
      return baseHalf * Math.max(0.16, blunt + lump);
    }
    function softClump(x, y, rx, ry, rot) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot || 0);
      ctx.beginPath();
      ctx.ellipse(0, 0, Math.max(1.2, rx), Math.max(1.2, ry), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    const clumps = [];
    const nClump = (opt.lod === "clump" ? 8 : 11) + ((rng() * 4) | 0);
    clumps.push({
      x: cx,
      y: crownTop + H * 0.08,
      rx: coneHalf(0.08) * (1.05 + rng() * 0.15),
      ry: S * (0.070 + rng() * 0.018),
      rot: (rng() - 0.5) * 0.25,
      col: 0
    });
    for (let i = 0; i < nClump; i++) {
      const tt = 0.16 + 0.82 * Math.pow((i + 0.4) / nClump, 0.78);
      const half = coneHalf(tt);
      const side = (i % 2 ? 1 : -1) * (0.08 + rng() * 0.78);
      clumps.push({
        x: cx + side * half * 0.86,
        y: crownTop + H * tt + (rng() - 0.5) * S * 0.012,
        rx: Math.max(S * 0.055, half * (0.42 + rng() * 0.22)),
        ry: S * (0.055 + (1.0 - tt) * 0.028 + rng() * 0.016),
        rot: side * (0.08 + rng() * 0.22),
        col: (i + 1) % colors.length
      });
    }
    clumps.sort(function (a, b) { return a.y - b.y; });
    ctx.globalAlpha = 1;
    clumps.forEach(function (c, i) {
      const lit = c.x >= cx;
      ctx.fillStyle = colors[c.col];
      ctx.globalAlpha = lit ? 0.96 : 0.90;
      softClump(c.x, c.y, c.rx, c.ry, c.rot);
      if (lit) {
        ctx.fillStyle = colors[0];
        ctx.globalAlpha = 0.22;
        softClump(c.x + c.rx * 0.12, c.y - c.ry * 0.10, c.rx * 0.62, c.ry * 0.62, c.rot);
      }
    });
    ctx.globalAlpha = 1;
    ctx.save();
    ctx.beginPath();
    clumps.forEach(function (c) {
      ctx.ellipse(c.x, c.y, Math.max(1.2, c.rx), Math.max(1.2, c.ry), c.rot || 0, 0, Math.PI * 2);
    });
    ctx.clip();
    ctx.strokeStyle = ink;
    ctx.lineCap = "round";
    ctx.lineWidth = 0.7;
    for (let y = crownTop + S * 0.06; y < crownBot; y += 2.6 + rng() * 1.2) {
      if (rng() < 0.20) continue;
      ctx.globalAlpha = 0.14 + ((y - crownTop) / H) * 0.26;
      ctx.beginPath();
      let started = false;
      for (let x = cx - baseHalf; x < cx + baseHalf * 0.08; x += 3) {
        if (rng() < 0.10) { started = false; continue; }
        const yy = y + Math.sin((x + y) * 0.06) * 0.8;
        if (!started) { ctx.moveTo(x, yy); started = true; }
        else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
    return;
  }

  // Hardwood: rounded lumpy crown, wider than tall, 3-6 overlapping masses.
  const nMass = 3 + ((rng() * 4) | 0);
  const crownCx = cx;
  const crownCy = S * 0.48;
  const crownW = S * 0.42;
  const crownH = S * 0.28;
  const masses = [];
  for (let i = 0; i < nMass; i++) {
    const ang = (i / nMass) * Math.PI * 2 + rng() * 0.6;
    const rad = (0.15 + rng() * 0.7);
    const mx = crownCx + Math.cos(ang) * crownW * rad;
    const my = crownCy + Math.sin(ang) * crownH * rad * 0.85;
    const rx = S * (0.14 + rng() * 0.10);
    const ry = rx * (0.62 + rng() * 0.22);
    const pts = [];
    const n = 7 + ((rng() * 4) | 0);
    for (let k = 0; k < n; k++) {
      const a = k / n * Math.PI * 2;
      const j = 0.72 + rng() * 0.46;
      pts.push([mx + Math.cos(a) * rx * j, my + Math.sin(a) * ry * j]);
    }
    masses.push({ x: mx, y: my, rx: rx, ry: ry, pts: pts, col: colors[(rng() * colors.length) | 0] });
  }
  masses.sort(function (a, b) { return a.y - b.y; });
  function pathMass(ctx, m) {
    ctx.beginPath();
    for (let k = 0; k < m.pts.length; k++) {
      if (k === 0) ctx.moveTo(m.pts[k][0], m.pts[k][1]);
      else ctx.lineTo(m.pts[k][0], m.pts[k][1]);
    }
    ctx.closePath();
  }
  masses.forEach(function (m) {
    ctx.fillStyle = m.col;
    ctx.globalAlpha = 0.94;
    pathMass(ctx, m);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
  // Underside hatch, clipped to the masses so sky gaps stay open.
  ctx.save();
  ctx.beginPath();
  masses.forEach(function (m) { pathMass(ctx, m); });
  ctx.clip();
  ctx.strokeStyle = ink;
  ctx.lineCap = "round";
  for (let y = crownCy - 4; y < crownCy + crownH + S * 0.16; y += 2.3 + rng() * 1.2) {
    if (rng() < 0.16) continue;
    ctx.globalAlpha = 0.16 + ((y - crownCy) / (crownH + 8)) * 0.32;
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    let started = false;
    const x0 = crownCx - crownW - S * 0.08, x1 = crownCx + crownW + S * 0.08;
    for (let x = x0; x < x1; x += 3) {
      if (rng() < 0.04) { started = false; continue; }
      const yy = y + Math.sin((x + y) * 0.05) * 1.1;
      if (!started) { ctx.moveTo(x, yy); started = true; }
      else ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }
  ctx.restore();
  // Inked outline on the shadow side of each mass, with pen lifts.
  ctx.strokeStyle = ink;
  ctx.lineWidth = 1.05;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.globalAlpha = 0.9;
  masses.forEach(function (m) {
    if (rng() < 0.12) return;
    ctx.beginPath();
    const a0 = Math.PI * (0.05 + rng() * 0.12);
    const a1 = Math.PI * (0.85 + rng() * 0.18);
    const steps = 7;
    let drawing = false;
    for (let i = 0; i <= steps; i++) {
      if (rng() < 0.12) { drawing = false; continue; }
      const a = a0 + (a1 - a0) * (i / steps);
      const px = m.x + Math.cos(a) * m.rx * 0.98;
      const py = m.y + Math.sin(a) * m.ry * 0.98;
      if (!drawing) { ctx.moveTo(px, py); drawing = true; }
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  });
  ctx.globalAlpha = 1;
  if (opt.blossom) {
    ctx.globalAlpha = 0.9;
    for (let k = 0; k < 6; k++) {
      const m = masses[(rng() * masses.length) | 0];
      ctx.fillStyle = rng() > 0.45 ? "#F2D6E0" : "#F7F4EA";
      ctx.beginPath();
      ctx.arc(m.x + (rng() - 0.5) * m.rx, m.y + (rng() - 0.5) * m.ry, 1.4 + rng() * 1.8, 0, 6.28);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

function leafColors(specName, season) {
  if (specName === "cedar" || specName === "pine") {
    return ["#3F5A45", "#4A6750", "#35543E", "#4E6B54", "#2F4C3A"];
  }
  if (season === "spring") return ["#6A8A58", "#5E7A4A", "#7A945E", "#4E6A40"];
  if (season === "summer") return ["#2F5D46", "#3A6B50", "#4E7D57", "#2A5340"];
  if (season === "autumn") return ["#C46A32", "#D4A044", "#E0B056", "#B85A28", "#C9842C", "#A84820", "#9A5A1C", "#DC8A38"];
  return ["#C4BBA8", "#B8A894", "#A89880"];
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
  for (let i = 0; i < 6; i++) paint(i, 3, "cedar", TREE_SEED0 + 240 + i, "full", true, true, season);
  for (let i = 6; i < 8; i++) paint(i, 3, "pine", TREE_SEED0 + 260 + i, "full", true, true, season);
  for (let i = 0; i < 8; i++) {
    const names = ["oak", "maple", "sycamore", "oak", "maple", "sycamore", "oak", "maple"];
    paint(i, 4, names[i], TREE_SEED0 + 20 + i, "clump", true, false, season);
  }
  for (let i = 0; i < 2; i++) paint(i, 5, "cedar", TREE_SEED0 + 248 + i, "clump", true, true, season);
  for (let i = 2; i < 4; i++) paint(i, 5, "pine", TREE_SEED0 + 268 + i, "clump", true, true, season);
  for (let i = 4; i < 8; i++) paint(i, 5, i % 2 ? "oak" : "maple", TREE_SEED0 + 30 + i, "clump", true, season === "spring", season);
  for (let i = 0; i < 8; i++) paint(i, 6, "oak", TREE_SEED0 + i, "full", false, false, "winter");
  for (let i = 0; i < 4; i++) paint(i, 7, "maple", TREE_SEED0 + 80 + i, "full", false, false, "winter");
  for (let i = 4; i < 8; i++) paint(i, 7, "sycamore", TREE_SEED0 + 160 + (i - 4), "full", false, false, "winter");
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.NoColorSpace;
  tex.flipY = true;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

function framesFor(specName, seedSlot, season, cls) {
  // seedSlot 0-7
  const cedar = specName === "cedar";
  const pine = specName === "pine";
  let full, clump, bare;
  if (pine) {
    full = 30 + (seedSlot % 2);
    clump = 42 + (seedSlot % 2);
    bare = full;
  } else if (cedar) {
    full = 24 + (seedSlot % 6);
    clump = 40 + (seedSlot % 2);
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
  // Autumn keeps leafy crowns. Bare skeletons were reading as a palisade
  // of trunks above the packed stands (atlas Y is inverted relative to the billboard).
  if (winterish) return { full: bare, clump: bare };
  return { full: full, clump: clump };
}

function isFenceOrRidgeCell(px, py) {
  const cls = coverPx(px, py);
  let edge = false;
  const nbs = [[2, 0], [-2, 0], [0, 2], [0, -2], [2, 2], [-2, 2], [2, -2], [-2, -2]];
  for (let i = 0; i < nbs.length; i++) {
    const c = coverPx(px + nbs[i][0], py + nbs[i][1]);
    if ((cls === 4 || cls === 5 || cls === 8) && (c === 7 || c === 1 || c === 2 || c === 6)) edge = true;
    if ((cls === 7 || cls === 1 || cls === 8) && (c === 4 || c === 5)) edge = true;
  }
  const slope = Math.abs(heightPx(px - 2, py) - heightPx(px + 2, py)) + Math.abs(heightPx(px, py - 2) - heightPx(px, py + 2));
  return edge || slope > 3.5;
}

function pickSpecies(cls, rng, fenceRidge) {
  // About 10% of all trees are conifers (mostly eastern red cedar, a few white pines),
  // concentrated along fencerows and ridge edges.
  const pConifer = fenceRidge ? 0.28 : (cls === 5 ? 0.18 : 0.04);
  if (rng() < pConifer) return rng() < 0.82 ? "cedar" : "pine";
  const r = rng();
  if (r < 0.40) return "oak";
  if (r < 0.72) return "maple";
  return "sycamore";
}

let treeRecords = [];

function scatterTrees() {
  const rng = mulberry(2026);
  const maxN = 14000;
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
      const churchP2 = (meta.landmarks && meta.landmarks.jasper_st_joseph) || [168.49, 429.67];
      const cw2 = pxToWorld(churchP2[0], churchP2[1]);
      const lx2 = cw2.x - hw0.x, lz2 = cw2.z - hw0.z;
      const llen2 = Math.hypot(lx2, lz2) || 1;
      const along0 = ((dw.x - hw0.x) * lx2 + (dw.z - hw0.z) * lz2) / llen2;
      const side0 = (dw.x - hw0.x) * (lz2 / llen2) - (dw.z - hw0.z) * (lx2 / llen2);
      if (along0 > 200 && along0 < 2000 && Math.abs(side0) < 230) continue;
      // Clear the mid-valley floor so stray orange blobs do not sit in the gap.
      const heroH0 = heightPx(HERO.px, HERO.py);
      if (along0 > 150 && along0 < 2200 && heightPx(px, py) < heroH0 - 6) continue;
      if (along0 > 400 && along0 < 1900 && Math.abs(side0) < 420 && heightPx(px, py) < heroH0 - 2) continue;
      cands.push({ px: px, py: py, cls: cls, front: 0 });
    }
  }
  // Mid-ground woods on the front crest and wings. They do not climb the near frame edges.
  const heroW = pxToWorld(HERO.px, HERO.py);
  const churchP = (meta.landmarks && meta.landmarks.jasper_st_joseph) || [168.49, 429.67];
  const cw = pxToWorld(churchP[0], churchP[1]);
  const lx = cw.x - heroW.x, lz = cw.z - heroW.z;
  const llen = Math.hypot(lx, lz) || 1;
  const ux = lx / llen, uz = lz / llen;
  for (let py = Math.max(2, (HERO.py - 44) | 0); py <= Math.min(ROWS - 3, (HERO.py + 24) | 0); py += 1) {
    for (let px = Math.max(2, (HERO.px - 44) | 0); px <= Math.min(COLS - 3, (HERO.px + 44) | 0); px += 1) {
      const w = pxToWorld(px, py);
      const along = (w.x - heroW.x) * ux + (w.z - heroW.z) * uz;
      const side = (w.x - heroW.x) * uz - (w.z - heroW.z) * ux;
      const absS = Math.abs(side);
      if (Math.hypot(w.x - heroW.x, w.z - heroW.z) < 80) continue;
      if (along > 80 && along < 2000 && absS < 180) continue;
      const crestWing = along >= 240 && along <= 1100 && absS >= 210 && absS <= 720;
      if (!crestWing) continue;
      const cls = coverPx(px, py);
      if (cls === 0) continue;
      const hm = heightPx(px, py);
      if (hm < heightPx(HERO.px, HERO.py) - 18) continue;
      const dens = (cls === 4 || cls === 5 ? 0.72 : 0.42);
      if (rng() > dens) continue;
      cands.push({ px: px, py: py, cls: cls === 5 ? 4 : cls, front: 1 });
    }
  }
  // Clumped woods on the middle ridge, kept off the spire and out of the river gap.
  const midPx = churchP[0], midPy = churchP[1];
  for (let py = Math.max(2, (midPy - 22) | 0); py <= Math.min(ROWS - 3, (midPy + 22) | 0); py += 1) {
    for (let px = Math.max(2, (midPx - 28) | 0); px <= Math.min(COLS - 3, (midPx + 28) | 0); px += 1) {
      const w = pxToWorld(px, py);
      const along = (w.x - heroW.x) * ux + (w.z - heroW.z) * uz;
      const side = (w.x - heroW.x) * uz - (w.z - heroW.z) * ux;
      if (along < 2000 || along > 3300) continue;
      if (Math.abs(side) < 90 || Math.abs(side) > 720) continue;
      if (Math.hypot(w.x - cw.x, w.z - cw.z) < 110) continue;
      const cls = coverPx(px, py);
      if (cls === 0 || cls === 3) continue;
      const hm = heightPx(px, py);
      if (hm < heightPx(midPx, midPy) - 16) continue;
      const dens = (cls === 4 || cls === 5) ? 0.72 : 0.28;
      if (rng() > dens) continue;
      cands.push({ px: px, py: py, cls: cls === 5 ? 4 : 4, front: 2 });
    }
  }
  for (let i = cands.length - 1; i > 0; i--) {
    const j = (rng() * (i + 1)) | 0;
    const tmp = cands[i]; cands[i] = cands[j]; cands[j] = tmp;
  }
  cands.sort(function (a, b) { return (b.front || 0) - (a.front || 0); });
  for (let ci = 0; ci < cands.length && pos.length / 3 < maxN; ci++) {
    const px = cands[ci].px, py = cands[ci].py, cls = cands[ci].cls;
    const isFront = cands[ci].front === 1;
    const isMidWood = cands[ci].front === 2;
    const stand = isFront ? 10 + ((rng() * 6) | 0) : (isMidWood ? 14 + ((rng() * 8) | 0) : (cls === 4 || cls === 5 ? 10 + ((rng() * 8) | 0) : 2));
    for (let s = 0; s < stand && pos.length / 3 < maxN; s++) {
      const jx = (px + (rng() - 0.5) * (isFront ? 0.70 : 1.05));
      const jy = (py + (rng() - 0.5) * (isFront ? 0.70 : 1.05));
      const w = pxToWorld(jx, jy);
      const c2 = coverPx(jx, jy);
      if (c2 === 0 || c2 === 3) continue;
      if (!isFront && (c2 === 2)) continue;
      const hm = heightPx(jx, jy);
      const fenceRidge = isFenceOrRidgeCell(jx, jy) || isFront || isMidWood;
      let specName = pickSpecies(c2 === 5 ? 5 : cls, rng, fenceRidge);
      if ((isFront || isMidWood) && specName !== "cedar" && specName !== "pine") {
        const r = rng();
        specName = r < 0.46 ? "oak" : (r < 0.88 ? "maple" : "sycamore");
      }
      // Keep the immediate foreground as hardwoods; conifers may stand from mid-ground out.
      if (Math.hypot(w.x - heroW.x, w.z - heroW.z) < 420 && (specName === "cedar" || specName === "pine")) {
        specName = rng() < 0.5 ? "oak" : "maple";
      }
      const slot = (rng() * 8) | 0;
      const isConifer = specName === "cedar" || specName === "pine";
      const fr = framesFor(specName, slot, clock.season, isConifer ? 5 : 4);
      // Hardwoods are a rolling canopy, wider than tall. Conifers are 1.5-2x tall
      // versus width, but never taller than the surrounding hardwoods.
      const size = (isMidWood ? 16 : (isFront ? 20 : 14)) * (0.70 + rng() * 0.60);
      let tall = size;
      let wid = size * 1.42 * (0.94 + rng() * 0.12);
      if (isConifer) {
        const aspect = specName === "pine" ? (1.50 + rng() * 0.22) : (1.62 + rng() * 0.28);
        tall = size * 0.70;
        wid = tall / aspect;
      }
      pos.push(w.x, yOf(hm), w.z);
      scale.push(wid, tall);
      frame.push(fr.full);
      frameClump.push(fr.clump);
      phase.push(rng());
      kind.push(isConifer ? 1 : 0);
      treeRecords.push({ spec: specName, slot: slot, cls: c2, x: w.x, z: w.z, y: yOf(hm) });
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
  scale.length = w3 * 2;
  frame.length = w3;
  frameClump.length = w3;
  phase.length = w3;
  kind.length = w3;
  treeRecords.length = w3;
  // Framing trees are gone; the land reads open edge to edge.
  const n = pos.length / 3;
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
      uNightMul: { value: colU(NIGHT_MUL) },
      uNight: { value: 0 },
      uStorm: { value: 0 },
      uLightning: { value: 0 },
      uStrikePos: { value: new THREE.Vector3() },
      uStrikeAmt: { value: 0 },
      uStrikeRad: { value: 1600 },
      uLodNear: { value: LOD_NEAR },
      uLodMid: { value: LOD_MID },
      uCrownCap: { value: 0.16 }
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
  buildTreeContact(pos, scale, n);
  buildFrameTrees();
  return n;
}

let frameTreeMesh = null;
let frameTreeMat = null;

// Dedicated high-res atlas for the few near corner trees (128px cells smear).
// flipY is true, so cell 0 is drawn at the canvas bottom-left (UV 0-0.5, 0-0.5).
function makeFrameTreeAtlas() {
  const S = 768, G = 2;
  const cv = document.createElement("canvas");
  cv.width = S * G;
  cv.height = S * G;
  const g = cv.getContext("2d");
  g.clearRect(0, 0, cv.width, cv.height);
  // Muted rust, ochre, forest green. No candy circles.
  const palettes = [
    ["#8B4A32", "#9A6B32", "#3F5340", "#6B4E2A", "#4A5A38", "#7A3E2A", "#5C4A28"],
    ["#7A3E2A", "#8B5A2C", "#3A4E3A", "#6E4A28", "#4A5A38", "#8B4A32", "#5C4A28"],
    ["#6B4E2A", "#8B4A32", "#3F5340", "#9A6B32", "#4A5A38", "#7A3E2A", "#5C4A28"],
    ["#3F5340", "#4A5A38", "#6B4E2A", "#8B5A2C", "#7A3E2A", "#5C4A28", "#8B4A32"]
  ];
  function makeBlobVerts(c, rng) {
    const n = 6 + ((rng() * 4) | 0);
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + (rng() - 0.5) * 0.35;
      const rr = c.r * (0.70 + rng() * 0.48);
      pts.push([c.x + Math.cos(a) * rr, c.y + Math.sin(a) * rr * 0.82]);
    }
    return pts;
  }
  function blobPath(g, pts) {
    g.beginPath();
    g.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
    g.closePath();
  }
  for (let cell = 0; cell < 4; cell++) {
    const col = cell % 2;
    const row = (cell / 2) | 0; // 0 bottom in UV
    const ox = col * S;
    const oy = (G - 1 - row) * S; // canvas y=0 is top; UV y=0 is canvas bottom
    const rng = mulberry(91 + cell * 17);
    const pals = palettes[cell];
    const pad = S * 0.08;
    const cx = ox + S * 0.50;
    // Trunk at the bottom of the cell (canvas bottom of this cell = oy+S).
    const trunkBot = oy + S - pad * 0.4;
    const trunkTop = oy + S * 0.62;
    g.save();
    g.beginPath();
    g.rect(ox + 2, oy + 2, S - 4, S - 4);
    g.clip();
    g.strokeStyle = "rgba(42,33,24,0.95)";
    g.lineCap = "round";
    g.lineJoin = "round";
    g.lineWidth = 8;
    g.beginPath();
    g.moveTo(cx + (rng() - 0.5) * 8, trunkBot);
    g.quadraticCurveTo(cx + (rng() - 0.5) * 12, (trunkBot + trunkTop) * 0.55, cx, trunkTop);
    g.stroke();
    g.lineWidth = 3.2;
    for (let b = 0; b < 5; b++) {
      const t = 0.18 + b * 0.14;
      const by = trunkBot + (trunkTop - trunkBot) * t;
      const dir = (b % 2 ? 1 : -1);
      g.beginPath();
      g.moveTo(cx, by);
      g.quadraticCurveTo(cx + dir * 28, by - 18, cx + dir * (52 + rng() * 28), by - 36 - rng() * 22);
      g.stroke();
    }
    // Clusters of small irregular leaf masses with sky gaps between them.
    const lobes = [];
    const clusters = 5 + (cell % 2);
    for (let k = 0; k < clusters; k++) {
      const angC = -0.2 + rng() * (Math.PI + 0.4);
      const radC = S * (0.08 + rng() * 0.22);
      const ccx = cx + Math.cos(angC) * radC * 1.05;
      const ccy = oy + S * 0.34 + Math.sin(angC) * radC * 0.7;
      const nL = 8 + ((rng() * 8) | 0);
      for (let i = 0; i < nL; i++) {
        const ang = rng() * Math.PI * 2;
        const rad = Math.pow(rng(), 0.7) * S * 0.09;
        const rr = S * (0.018 + rng() * 0.032);
        const lx = ccx + Math.cos(ang) * rad;
        const ly = ccy + Math.sin(ang) * rad * 0.8;
        if (lx < ox + pad || lx > ox + S - pad || ly < oy + pad || ly > oy + S * 0.70) continue;
        const lobe = { x: lx, y: ly, r: rr, col: pals[(rng() * pals.length) | 0] };
        lobe.pts = makeBlobVerts(lobe, rng);
        lobes.push(lobe);
      }
    }
    lobes.sort(function (a, b) { return a.y - b.y; });
    lobes.forEach(function (c) {
      g.fillStyle = c.col;
      g.globalAlpha = 0.94;
      blobPath(g, c.pts);
      g.fill();
    });
    g.globalAlpha = 1;
    // Underside hatch, clipped to the masses, leaving sky gaps untouched.
    g.save();
    g.beginPath();
    lobes.forEach(function (c) { blobPath(g, c.pts); });
    g.clip();
    g.strokeStyle = "rgba(42,33,24,0.40)";
    g.lineWidth = 1.0;
    g.lineCap = "round";
    for (let y = oy + S * 0.32; y < oy + S * 0.70; y += 5 + rng() * 3) {
      if (rng() < 0.18) continue;
      g.beginPath();
      let started = false;
      const x0 = ox + pad + rng() * 20, x1 = ox + S - pad - rng() * 20;
      for (let x = x0; x < x1; x += 3) {
        if (rng() < 0.04) { started = false; continue; }
        const yy = y + Math.sin((x + y) * 0.04) * 1.4;
        if (!started) { g.moveTo(x, yy); started = true; }
        else g.lineTo(x, yy);
      }
      g.stroke();
    }
    g.restore();
    // Inked outline on the shadow side of each mass, with pen lifts.
    g.strokeStyle = "rgba(42,33,24,0.9)";
    g.lineWidth = 1.55;
    g.lineJoin = "round";
    g.lineCap = "round";
    lobes.forEach(function (c) {
      if (rng() < 0.18) return;
      g.beginPath();
      const a0 = Math.PI * (0.05 + rng() * 0.12);
      const a1 = Math.PI * (0.85 + rng() * 0.18);
      const steps = 8;
      let drawing = false;
      for (let i = 0; i <= steps; i++) {
        if (rng() < 0.12) { drawing = false; continue; }
        const a = a0 + (a1 - a0) * (i / steps);
        const px = c.x + Math.cos(a) * c.r * 0.98;
        const py = c.y + Math.sin(a) * c.r * 0.82;
        if (!drawing) { g.moveTo(px, py); drawing = true; }
        else g.lineTo(px, py);
      }
      g.stroke();
    });
    g.restore();
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.NoColorSpace;
  tex.flipY = true;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  // Debug hook for capture-time inspection.
  if (typeof window !== "undefined") window.__frameAtlas = cv;
  return tex;
}

const FRAME_TREE_VERT = /* glsl */`
attribute vec2 iScale;
attribute float iFrame;
attribute float iPhase;
uniform float uTime;
uniform float uWind;
uniform float uReduce;
varying vec2 vUv;
varying float vFrame;
varying float vShade;
void main(){
  vUv = uv;
  vFrame = iFrame;
  vec3 iPos = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  iPos.y -= 1.4;
  vec3 camR = normalize(vec3(cameraPosition.z - iPos.z, 0.0, iPos.x - cameraPosition.x));
  if (length(camR) < 0.001) camR = vec3(1.0, 0.0, 0.0);
  vec3 camU = vec3(0.0, 1.0, 0.0);
  float sx = iScale.x, sy = iScale.y;
  float wind = sin(uTime * (0.9 + iPhase) + iPos.x * 0.02) * 0.05 * uWind * (1.0 - uReduce);
  // Cap the crown top at about 55% down so the mass frames the corners, not the spire.
  vec4 c0 = projectionMatrix * viewMatrix * vec4(iPos, 1.0);
  vec4 cC = projectionMatrix * viewMatrix * vec4(iPos + camU * sy, 1.0);
  float baseNdc = c0.y / max(0.001, c0.w);
  float crNdc = cC.y / max(0.001, cC.w);
  float maxTop = -0.10;
  if (crNdc > maxTop) {
    float cap = (maxTop - baseNdc) / max(0.001, crNdc - baseNdc);
    cap = clamp(cap, 0.25, 1.0);
    sx *= cap;
    sy *= cap;
  }
  vec3 p = iPos + camR * ((position.x + wind * uv.y) * sx) + camU * (position.y * sy);
  vShade = 0.94 + 0.06 * sin(iPhase * 20.0);
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}
`;

const FRAME_TREE_FRAG = /* glsl */`
uniform sampler2D uAtlas;
uniform vec3 uInkUse, uNightMul;
uniform float uNight, uStorm;
varying vec2 vUv;
varying float vFrame;
varying float vShade;
void main(){
  float ix = floor(vFrame + 0.5);
  vec2 cell = vec2(mod(ix, 2.0), floor(ix / 2.0));
  vec2 uv = (vUv * 0.96 + 0.02 + cell) / 2.0;
  vec4 s = texture2D(uAtlas, uv);
  if (s.a < 0.18) discard;
  vec3 col = s.rgb * vShade;
  float luma = dot(s.rgb, vec3(0.30, 0.50, 0.20));
  vec3 nightFill = col * uNightMul * 0.45;
  nightFill = mix(nightFill, vec3(0.03, 0.045, 0.08), 0.40);
  vec3 nightCol = mix(uInkUse * 0.9, nightFill, smoothstep(0.07, 0.32, luma));
  col = mix(col, nightCol, uNight);
  if (uStorm > 0.01) {
    float lumaT = dot(col, vec3(0.30, 0.59, 0.11));
    col = mix(col, vec3(lumaT * 0.90, lumaT * 0.95, lumaT * 1.06), 0.55 * uStorm);
    col *= mix(1.0, 0.65, uStorm);
  }
  gl_FragColor = vec4(col, s.a);
}
`;

function buildFrameTrees() {
  if (frameTreeMesh) {
    scene.remove(frameTreeMesh);
    if (frameTreeMesh.geometry) frameTreeMesh.geometry.dispose();
    if (frameTreeMat && frameTreeMat.uniforms && frameTreeMat.uniforms.uAtlas.value) {
      frameTreeMat.uniforms.uAtlas.value.dispose();
    }
    if (frameTreeMat) frameTreeMat.dispose();
  }
  frameTreeMesh = null;
  frameTreeMat = null;
  return;
  const N = 8;
  const plane = new THREE.PlaneGeometry(1, 1);
  plane.translate(0, 0.5, 0);
  plane.setAttribute("iScale", new THREE.InstancedBufferAttribute(new Float32Array(N * 2), 2));
  plane.setAttribute("iFrame", new THREE.InstancedBufferAttribute(new Float32Array(N), 1));
  plane.setAttribute("iPhase", new THREE.InstancedBufferAttribute(new Float32Array(N), 1));
  const rng = mulberry(77);
  for (let i = 0; i < N; i++) {
    plane.attributes.iFrame.array[i] = i % 4;
    plane.attributes.iPhase.array[i] = rng();
    const tall = 78 + rng() * 16;
    plane.attributes.iScale.array[i * 2] = tall * 0.72;
    plane.attributes.iScale.array[i * 2 + 1] = tall;
  }
  frameTreeMat = new THREE.ShaderMaterial({
    uniforms: {
      uAtlas: { value: makeFrameTreeAtlas() },
      uInkUse: { value: colU(INK) },
      uNightMul: { value: colU(NIGHT_MUL) },
      uNight: { value: 0 },
      uStorm: { value: 0 },
      uTime: { value: 0 },
      uWind: { value: 1 },
      uReduce: { value: REDUCE ? 1 : 0 }
    },
    vertexShader: FRAME_TREE_VERT,
    fragmentShader: FRAME_TREE_FRAG,
    transparent: true,
    depthWrite: true,
    side: THREE.DoubleSide
  });
  frameTreeMesh = new THREE.InstancedMesh(plane, frameTreeMat, N);
  frameTreeMesh.frustumCulled = false;
  frameTreeMesh.name = "frameTrees";
  frameTreeMesh.renderOrder = 2;
  scene.add(frameTreeMesh);
  layoutFrameTrees();
}

function layoutFrameTrees() {
  return;
  if (!frameTreeMesh || !camera) return;
  const fwd = new THREE.Vector3();
  camera.getWorldDirection(fwd);
  fwd.y = 0;
  if (fwd.length() < 1e-4) fwd.set(0, 0, 1);
  fwd.normalize();
  const right = new THREE.Vector3(-fwd.z, 0, fwd.x).normalize();
  const halfFovY = (camera.fov * Math.PI / 180) * 0.5;
  const aspect = Math.max(0.4, camera.aspect);
  const halfH = Math.atan(Math.tan(halfFovY) * aspect);
  const phone = aspect < 0.7;
  const perSide = phone ? 2 : 3;
  const dummy = new THREE.Object3D();
  const cx = camera.position.x, cz = camera.position.z;
  const sc = frameTreeMesh.geometry.attributes.iScale.array;
  let i = 0;
  for (let sign = -1; sign <= 1; sign += 2) {
    for (let k = 0; k < 4; k++) {
      if (k >= perSide) {
        dummy.position.set(cx, -9999, cz);
        dummy.scale.set(0, 0, 0);
        dummy.updateMatrix();
        frameTreeMesh.setMatrixAt(i, dummy.matrix);
        i++;
        continue;
      }
      const along = (phone ? 92 : 90) + k * 14;
      const edge = along * Math.tan(halfH);
      const side = sign * edge * (0.86 + k * 0.03);
      const x = cx + fwd.x * along + right.x * side;
      const z = cz + fwd.z * along + right.z * side;
      const y = yOf(heightWorld(x, z));
      // Slightly shorter than pass 6: the painted crown now fills the top of the cell.
      const tall = phone ? 68 + k * 6 : 78 + k * 6;
      const wid = phone ? 38 + k * 3 : 50 + k * 4;
      sc[i * 2] = wid;
      sc[i * 2 + 1] = tall;
      dummy.position.set(x, y, z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      frameTreeMesh.setMatrixAt(i, dummy.matrix);
      i++;
    }
  }
  frameTreeMesh.geometry.attributes.iScale.needsUpdate = true;
  frameTreeMesh.instanceMatrix.needsUpdate = true;
  frameTreeMesh.count = 8;
}

function buildTreeContact(pos, scale, n) {
  // Soft inked contact shadow under near crowns, snapped to the terrain.
  const N = Math.min(n, 4000);
  const geo = new THREE.PlaneGeometry(1, 1);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({
    color: 0x2A2118,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const mesh = new THREE.InstancedMesh(geo, mat, N);
  mesh.frustumCulled = false;
  mesh.renderOrder = 1;
  mesh.name = "treeContact";
  const dummy = new THREE.Object3D();
  const heroW = pxToWorld(HERO.px, HERO.py);
  let c = 0;
  for (let i = 0; i < n && c < N; i++) {
    const x = pos[i * 3], z = pos[i * 3 + 2];
    if (Math.hypot(x - heroW.x, z - heroW.z) > 1400) continue;
    if (treeMesh && treeMesh.geometry.attributes.iKind && treeMesh.geometry.attributes.iKind.array[i] > 1.5) continue;
    const y = pos[i * 3 + 1] + 0.2;
    const r = Math.min(11, Math.max(3.5, scale[i * 2] * 0.42));
    dummy.position.set(x, y, z);
    dummy.scale.set(r, 1, r * 0.72);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    mesh.setMatrixAt(c, dummy.matrix);
    c++;
  }
  mesh.count = c;
  mesh.instanceMatrix.needsUpdate = true;
  scene.add(mesh);
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
    uNightMul: { value: colU(NIGHT_MUL) },
    uNight: { value: 0 },
    uStorm: { value: 0 },
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

function fillFrontGrass(mesh, maxN, cx, cz) {
  // Visible ground at the bottom of the frame starts about 180 m ahead.
  // Plant a strip of instanced blades there, below the near woods, skipping water.
  if (!mesh) return 0;
  const rng = mulberry(((cx * 19 + cz * 5) | 0) >>> 0);
  const pos = mesh._pos;
  const scale = mesh.geometry.attributes.iScale.array;
  const phase = mesh.geometry.attributes.iPhase.array;
  const kind = mesh.geometry.attributes.iKind.array;
  const lean = mesh.geometry.attributes.iLean.array;
  const churchP = (meta.landmarks && meta.landmarks.jasper_st_joseph) || [168.49, 429.67];
  const cw = pxToWorld(churchP[0], churchP[1]);
  const lx = cw.x - cx, lz = cw.z - cz;
  const llen = Math.hypot(lx, lz) || 1;
  const ux = lx / llen, uz = lz / llen;
  let n = 0, tries = 0;
  const limit = maxN * 4;
  while (n < maxN && tries < limit) {
    tries++;
    // Hero camera: valley floor meets the frame around 300-500 m.
    // Zoomed (holdCamera): plant short, meter-scaled blades along the look, not a palisade.
    const close = !!state.holdCamera;
    let px = ux, pz = uz;
    if (close && camera) {
      const look = new THREE.Vector3();
      camera.getWorldDirection(look);
      const ll = Math.hypot(look.x, look.z) || 1;
      px = look.x / ll;
      pz = look.z / ll;
    }
    const along = close ? (6 + Math.pow(rng(), 0.72) * 230) : (300 + rng() * 200);
    const halfW = along * Math.tan((close ? 42 : 26) * Math.PI / 180);
    const side = (rng() - 0.5) * 2 * halfW * (close ? (0.65 + 0.35 * rng()) : (0.50 + 0.50 * rng()));
    const x = cx + px * along + pz * side;
    const z = cz + pz * along - px * side;
    const cls = coverWorld(x, z);
    if (cls === 0) continue;
    if (close) {
      const patch = Math.abs(Math.sin(x * 0.045) * Math.cos(z * 0.038));
      if (patch < 0.06 && rng() < 0.55) continue;
    }
    const h = heightWorld(x, z);
    pos[n * 3] = x; pos[n * 3 + 1] = yOf(h); pos[n * 3 + 2] = z;
    let tall, wide;
    if (close) {
      const roll = rng();
      if (roll < 0.18) { tall = 0.35 + rng() * 0.30; wide = 0.10 + rng() * 0.12; }
      else if (roll < 0.78) { tall = 0.65 + rng() * 1.05; wide = 0.18 + rng() * 0.32; }
      else { tall = 1.40 + rng() * 1.15; wide = 0.28 + rng() * 0.40; }
    } else {
      tall = 4.6 + rng() * 3.4;
      wide = 1.15 + rng() * 1.25;
    }
    scale[n * 2] = wide;
    scale[n * 2 + 1] = close ? tall : tall * EXAG;
    phase[n] = rng();
    kind[n] = (clock.season === "autumn" && rng() > (close ? 0.5 : 0.65)) ? 1 : 0;
    const ang = rng() * 6.28, amt = (rng() - 0.5) * (close ? 0.7 : 0.4);
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
  VEG.blades = fillFrontGrass(grassMesh, BLADE_N, cx, cz);
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
      uNight: { value: 0 },
      uSunDir: { value: new THREE.Vector3(0.3, 0.8, 0.2) },
      uMoonDir: { value: new THREE.Vector3(0.2, 0.5, 0.4) },
      uStorm: { value: 0 }
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
  },
  courthouse: {
    wall: [186, 176, 158],
    stone: [168, 158, 140],
    clock: [237, 230, 214],
    cupola: [176, 166, 148],
    trim: [214, 204, 184],
    metal: [130, 122, 112],
    hand: [42, 33, 24],
    door: [56, 41, 31],
    roof: [96, 92, 84]
  },
  mill: {
    wall: [186, 168, 140],
    roof: [110, 92, 74],
    metal: [120, 118, 112],
    wood: [115, 87, 56],
    door: [59, 43, 33],
    stone: [148, 138, 118],
    trim: [214, 204, 184],
    wheel: [92, 84, 72]
  },
  depot: {
    brick: [148, 96, 84],
    roof: [96, 88, 78],
    wall: [186, 168, 145],
    trim: [219, 209, 189],
    chimney: [138, 86, 66],
    door: [59, 43, 33],
    platform: [158, 148, 128]
  },
  monastery: {
    roof: [110, 92, 74],
    wall: [214, 204, 186],
    stone: [168, 158, 140],
    metal: [130, 122, 112],
    door: [56, 41, 31],
    copper: [110, 130, 112],
    trim: [219, 209, 189]
  },
  archabbey: {
    wall: [214, 206, 190],
    roof: [110, 92, 74],
    door: [56, 41, 31],
    metal: [130, 122, 112],
    trim: [219, 209, 189],
    clock: [237, 230, 214],
    hand: [42, 33, 24],
    louver: [92, 86, 76]
  },
  stadium: {
    dirt: [168, 140, 96],
    wall: [176, 168, 152],
    metal: [120, 118, 112],
    trim: [219, 209, 189],
    roof: [96, 88, 78],
    seat: [148, 86, 74],
    shadow: [92, 86, 76]
  },
  townhall: {
    chimney: [138, 86, 66],
    clock: [237, 230, 214],
    trim: [219, 209, 189],
    louver: [92, 86, 76],
    copper: [110, 130, 112],
    door: [56, 41, 31],
    wall: [186, 176, 158],
    roof: [96, 88, 78],
    hand: [42, 33, 24],
    stone: [168, 158, 140]
  }
};

function styleLoadedModel(root, kind) {
  const pal = MODEL_WASH[kind] || {};
  const fallback = {
    church: [191, 158, 115],
    farmhouse: [242, 237, 224],
    barn: [156, 56, 43],
    silo: [148, 153, 148],
    haybale: [201, 166, 107],
    courthouse: [186, 176, 158],
    mill: [186, 168, 140],
    depot: [186, 168, 145],
    monastery: [214, 204, 186],
    archabbey: [214, 206, 190],
    stadium: [176, 168, 152],
    townhall: [186, 176, 158]
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
  church: ["st_joseph_church.meshopt.glb", "st_joseph_church.glb"],
  farmhouse: ["farmhouse.meshopt.glb", "farmhouse.glb"],
  barn: ["bank_barn.meshopt.glb", "bank_barn.glb"],
  silo: ["grain_silo.meshopt.glb", "grain_silo.glb"],
  haybale: ["hay_bale.meshopt.glb", "hay_bale.glb"],
  courthouse: ["jasper_courthouse.meshopt.glb", "jasper_courthouse.glb"],
  mill: ["jasper_city_mill.meshopt.glb", "jasper_city_mill.glb"],
  depot: ["jasper_depot.meshopt.glb", "jasper_depot.glb"],
  monastery: ["ferdinand_monastery.meshopt.glb", "ferdinand_monastery.glb"],
  archabbey: ["saint_meinrad_archabbey.meshopt.glb", "saint_meinrad_archabbey.glb"],
  stadium: ["league_stadium.meshopt.glb", "league_stadium.glb"],
  townhall: ["huntingburg_town_hall.meshopt.glb", "huntingburg_town_hall.glb"]
};

async function tryLoadModel(kind) {
  const names = MODEL_FILES[kind] || [];
  const loader = new GLTFLoader();
  if (MeshoptDecoder) {
    if (MeshoptDecoder.ready) await MeshoptDecoder.ready;
    loader.setMeshoptDecoder(MeshoptDecoder);
  }
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
    if (u.uSunDir) u.uSunDir.value.copy(altAzDir(clock.alt, clock.sunAz));
    if (u.uMoonDir) u.uMoonDir.value.copy(altAzDir(clock.moonAlt, clock.moonAz));
    if (u.uStorm) u.uStorm.value = wx.kind === "storm" ? 1 : 0;
  }
  for (let i = 0; i < windowMats.length; i++) {
    const u = windowMats[i].uniforms;
    u.uInkUse.value.set(ink[0] / 255, ink[1] / 255, ink[2] / 255);
    u.uNight.value = night;
  }
}

async function swapInGltfModels() {
  const kinds = ["church", "farmhouse", "barn", "silo", "haybale", "mill", "depot", "courthouse", "townhall", "stadium", "monastery", "archabbey"];
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
  placeFixedLandmarks(loaded);
  invalidateTourStops();
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
    size: 6.0, vertexColors: true, transparent: true, opacity: 0, depthWrite: false, sizeAttenuation: false, depthTest: true
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
  placeTourFarmstead();

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
  function pushTod(un) {
    if (!un) return;
    if (un.uNight) un.uNight.value = night;
    if (un.uTwi) un.uTwi.value = clock.twi;
    if (un.uNightMul) set(un.uNightMul, NIGHT_MUL);
    if (un.uInkUse) set(un.uInkUse, ink);
    if (un.uInk) set(un.uInk, ink);
    if (un.uMoonDir) un.uMoonDir.value.copy(altAzDir(clock.moonAlt, clock.moonAz));
    if (un.uSunDir) un.uSunDir.value.copy(altAzDir(clock.alt, clock.sunAz));
    if (un.uStorm) un.uStorm.value = wx.kind === "storm" ? 1 : 0;
  }
  if (u) {
    set(u.uField, s.field); set(u.uWheat, s.wheat); set(u.uPlowed, s.plowed);
    set(u.uGrass, s.grass); set(u.uForest, s.forest); set(u.uForestB, s.forestB);
    set(u.uCedar, s.cedar); set(u.uWater, s.water);
    set(u.uInkUse, ink); set(u.uPaper, PAPER);
    u.uNight.value = night;
    u.uTwi.value = clock.twi;
    u.uRising.value = clock.rising ? 1 : 0;
    u.uSnow.value = wx.kind === "snow" ? 1 : 0;
    u.uRain.value = (wx.kind === "rain" || wx.kind === "storm") ? 1 : 0;
    if (u.uStorm) u.uStorm.value = wx.kind === "storm" ? 1 : 0;
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
    skyMat.uniforms.uMilky.value = night > 0.5 ? 0.55 : 0;
  }
  if (moonMat) {
    // Terminator uses the real sun, even when ?sky= forces a landscape sun altitude.
    const trueSun = sunAltAz(clock.now, loc);
    moonMat.uniforms.uSunDir.value.copy(altAzDir(trueSun[0], trueSun[1]));
  }
  if (treeMat) pushTod(treeMat.uniforms);
  if (frameTreeMat) pushTod(frameTreeMat.uniforms);
  for (let ci = 0; ci < volCloudItems.length; ci++) {
    const cu = volCloudItems[ci].mesh && volCloudItems[ci].mesh.material && volCloudItems[ci].mesh.material.uniforms;
    if (cu && cu.uStorm) cu.uStorm.value = wx.kind === "storm" ? 1 : 0;
  }
  if (treeMesh) syncTreeFrames();
  function tintGrass(mat) {
    if (!mat) return;
    set(mat.uniforms.uGrass, s.grass);
    set(mat.uniforms.uWheat, s.wheat);
    set(mat.uniforms.uCorn, SKINS.summer.field);
    pushTod(mat.uniforms);
  }
  tintGrass(grassMat);
  tintGrass(clumpMat);
  if (riverRibbon && riverRibbon.material) {
    pushTod(riverRibbon.material.uniforms);
    if (riverRibbon.material.uniforms.uRain) riverRibbon.material.uniforms.uRain.value = (wx.kind === "rain" || wx.kind === "storm") ? 1 : 0;
  }
  if (riverBanks && riverBanks.material) {
    pushTod(riverBanks.material.uniforms);
    if (riverBanks.material.uniforms.uRain) riverBanks.material.uniforms.uRain.value = (wx.kind === "rain" || wx.kind === "storm") ? 1 : 0;
  }
  for (let i = 0; i < volCloudItems.length; i++) {
    const m = volCloudItems[i].mesh;
    if (m && m.material) pushTod(m.material.uniforms);
  }
  if (layoutRidgeLines._stamp) layoutRidgeLines._stamp = "";
  const grassOn = clock.season !== "winter" || wx.kind === "snow";
  if (grassMesh) grassMesh.visible = grassOn;
  if (clumpMesh) clumpMesh.visible = grassOn;
  if (hayMesh) hayMesh.visible = clock.season === "autumn" && !LAND.fromGltf.haybale;
  if (landmarkGroup) {
    landmarkGroup.children.forEach(function (ch) {
      if (ch.name === "haybale") ch.visible = clock.season === "autumn";
    });
  }
  if (windowPts) { windowPts.visible = false; windowPts.material.opacity = 0; }
  if (firePts) firePts.material.opacity = (clock.season === "summer" && night > 0.5) ? 0.85 : 0;
  if (starPts) starPts.visible = night > 0.15;
  if (constLines) constLines.visible = night > 0.25;
  if (constNameGroup) constNameGroup.visible = night > 0.25;
  if (moonMesh) moonMesh.visible = clock.moonAlt > -4;
  if (snowPts) snowPts.visible = wx.kind === "snow";
  if (rainMesh) rainMesh.visible = wx.kind === "rain" || wx.kind === "storm";
  if (rainLens) rainLens.visible = wx.kind === "rain" || wx.kind === "storm";
  if (fogGroup) fogGroup.visible = wx.kind === "fog";
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

function setSunPos() {
  if (!sunMesh) return;
  const dir = altAzDir(clock.alt, clock.sunAz);
  // Farther than the terrain so the far ridge can occlude the lower half of the disc.
  sunMesh.position.copy(dir.clone().multiplyScalar(28000));
  // Face the camera (skyGroup sits on the camera). An engraved disk, not a glowing sphere.
  if (camera) sunMesh.lookAt(camera.position);
  else sunMesh.lookAt(0, 0, 0);
  sunMesh.visible = clock.alt > -3 && clock.alt < 16;
}

function sunInfo() {
  const dir = altAzDir(clock.alt, clock.sunAz);
  const compass = compassFromDir(dir);
  let ndc = null;
  if (camera && sunMesh) {
    const world = sunMesh.position.clone();
    if (skyGroup) world.add(skyGroup.position);
    world.project(camera);
    ndc = { x: +world.x.toFixed(3), y: +world.y.toFixed(3), z: +world.z.toFixed(3) };
  }
  return {
    at: clock.now, alt: clock.alt, azEngine: clock.sunAz,
    azCompass: compass, visible: !!(sunMesh && sunMesh.visible),
    period: clock.period, ndc: ndc
  };
}

function lookSun() {
  const dir = altAzDir(clock.alt, clock.sunAz);
  lookHorizonAz(Math.atan2(dir.x, dir.z));
  return sunInfo();
}


function farLiftAt(dist) {
  const t = clamp((dist - 2000) / 8000, 0, 1);
  const s = t * t * (3 - 2 * t);
  return 1 + 1.85 * s;
}
function terrainYAt(x, z) {
  const h = heightWorld(x, z);
  const dist = Math.hypot(x - camera.position.x, z - camera.position.z);
  return yOf(h) * farLiftAt(dist);
}

function placeFixedLandmarks(loaded) {
  if (!landmarkGroup) return;
  const keys = Object.keys(LANDMARK_SITES);
  for (let i = 0; i < keys.length; i++) {
    const site = LANDMARK_SITES[keys[i]];
    if (!site.place || site.kind === "church") continue;
    const proto = loaded[site.kind];
    if (!proto) continue;
    if (site.px < 0 || site.py < 0 || site.px > COLS - 1 || site.py > ROWS - 1) continue;
    const w = pxToWorld(site.px, site.py);
    let hm = heightPx(site.px, site.py);
    if (coverPx(site.px, site.py) === 0) {
      let best = hm, found = false;
      for (let dy = -3; dy <= 3; dy++) {
        for (let dx = -3; dx <= 3; dx++) {
          if (coverPx(site.px + dx, site.py + dy) === 0) continue;
          const h = heightPx(site.px + dx, site.py + dy);
          if (!found || h > best) { best = h; found = true; }
        }
      }
      if (found) hm = best;
    }
    const mesh = proto.clone();
    mesh.name = site.kind;
    mesh.position.set(w.x, yOf(hm), w.z);
    if (site.kind === "mill") {
      let nx = w.x, nz = w.z, bestD = 1e12;
      for (let r = 0; r < riverPathPx.length; r++) {
        const rw = pxToWorld(riverPathPx[r][0], riverPathPx[r][1]);
        const d = Math.hypot(rw.x - w.x, rw.z - w.z);
        if (d < bestD) { bestD = d; nx = rw.x; nz = rw.z; }
      }
      mesh.rotation.y = Math.atan2(nz - w.z, -(nx - w.x));
    } else {
      const heroW = pxToWorld(HERO.px, HERO.py);
      mesh.rotation.y = Math.atan2(heroW.x - w.x, heroW.z - w.z);
    }
    landmarkGroup.add(mesh);
    LAND[site.kind] = (LAND[site.kind] || 0) + 1;
  }
}

const RIDGE_BANDS = [
  { d0: 200, d1: 700, widthPx: 2.2, color: 0x2A2118, taper: false },
  { d0: 700, d1: 1600, widthPx: 1.55, color: 0x3A3228, taper: true },
  { d0: 1600, d1: 3400, widthPx: 1.25, color: 0x4A453C, taper: true },
  { d0: 3400, d1: 6500, widthPx: 0.45, color: 0x9AA4AC, taper: false },
  { d0: 6500, d1: 13000, widthPx: 0.35, color: 0xA8B0B6, taper: false }
];

function pixelWorldWidth(px, dist) {
  const fov = (camera.fov * Math.PI) / 180;
  const h = renderer.domElement.height || 800;
  return (px / h) * 2 * Math.tan(fov / 2) * dist;
}

function layoutRidgeLines() {
  if (!camera || !heightF32) return;
  const look = new THREE.Vector3();
  camera.getWorldDirection(look);
  const stamp = [
    camera.position.x.toFixed(1), camera.position.y.toFixed(1), camera.position.z.toFixed(1),
    look.x.toFixed(3), look.y.toFixed(3), look.z.toFixed(3),
    camera.fov.toFixed(1), renderer.domElement.width, renderer.domElement.height,
    (clock && clock.night > 0.45) ? "n" : "d"
  ].join("|");
  if (layoutRidgeLines._stamp === stamp && ridgeGroup && ridgeGroup.children.length) return;
  layoutRidgeLines._stamp = stamp;
  if (!ridgeGroup) {
    ridgeGroup = new THREE.Group();
    ridgeGroup.name = "ridgeLines";
    scene.add(ridgeGroup);
  }
  while (ridgeGroup.children.length) {
    const ch = ridgeGroup.children[0];
    ridgeGroup.remove(ch);
    if (ch.geometry) ch.geometry.dispose();
    if (ch.material) ch.material.dispose();
  }
  const cx = camera.position.x, cy = camera.position.y, cz = camera.position.z;
  const lookAz = Math.atan2(look.x, look.z);
  const fov = (camera.fov * Math.PI) / 180;
  const half = fov * 0.85;
  const nRay = 220;
  const bands = RIDGE_BANDS;
  const crests = bands.map(function () { return []; });
  const heroH = yOf(heightPx(HERO.px, HERO.py));
  for (let r = 0; r < nRay; r++) {
    const az = lookAz + (-half + (2 * half * r) / (nRay - 1));
    const dx = Math.sin(az), dz = Math.cos(az);
    let maxEl = -1e9;
    const best = [];
    for (let b = 0; b < bands.length; b++) best[b] = null;
    // Walk near to far; a new skyline (elev angle rising) is a crest candidate.
    let d = 120;
    const dMax = 13000;
    while (d <= dMax) {
      const x = cx + dx * d, z = cz + dz * d;
      const p = worldToPx(x, z);
      if (p.px < 1 || p.py < 1 || p.px > COLS - 2 || p.py > ROWS - 2) {
        d += Math.max(36, d * 0.045);
        continue;
      }
      const y = terrainYAt(x, z);
      const el = Math.atan2(y - cy, d);
      if (el > maxEl + 0.0009) {
        maxEl = el;
        for (let b = 0; b < bands.length; b++) {
          if (d >= bands[b].d0 && d < bands[b].d1) {
            best[b] = { x: x, y: y + 2.0, z: z, dist: d };
          }
        }
      }
      d += Math.max(28, d * 0.04);
    }
    for (let b = 0; b < bands.length; b++) {
      if (!best[b]) continue;
      // Skip band 0: the camera already sits on that ridge, and a line there
      // cuts the near fields. The front crest is the tree line on the wings.
      if (b === 0) continue;
      crests[b].push(best[b]);
    }
  }
  for (let b = 0; b < bands.length; b++) {
    const pts = crests[b];
    if (pts.length < 6) continue;
    const cleaned = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      const pr = cleaned[cleaned.length - 1];
      const jump = Math.hypot(pts[i].x - pr.x, pts[i].z - pr.z);
      const yJump = Math.abs(pts[i].y - pr.y);
      if (jump > 320 || yJump > 120) {
        if (cleaned.length >= 8) emitRidgeStrip(smoothCrest(cleaned, 4), bands[b]);
        cleaned.length = 0;
      }
      cleaned.push(pts[i]);
    }
    // Mid and near crests: no ink stroke. Far crests may keep a faint thin line.
    if (cleaned.length >= 8 && bands[b].d0 >= 3400) emitRidgeStrip(smoothCrest(cleaned, 4), bands[b]);
  }
}

function smoothCrest(pts, passes) {
  let cur = pts.slice();
  for (let p = 0; p < passes; p++) {
    if (cur.length < 3) break;
    const out = [cur[0]];
    for (let i = 1; i < cur.length - 1; i++) {
      const a = cur[i - 1], b = cur[i], c = cur[i + 1];
      out.push({
        x: a.x * 0.22 + b.x * 0.56 + c.x * 0.22,
        y: a.y * 0.22 + b.y * 0.56 + c.y * 0.22,
        z: a.z * 0.22 + b.z * 0.56 + c.z * 0.22,
        dist: b.dist
      });
    }
    out.push(cur[cur.length - 1]);
    cur = out;
  }
  return cur;
}


function emitRidgeStrip(pts, band) {
  const pos = [];
  const uv = [];
  const idx = [];
  const cx = camera.position.x, cy = camera.position.y, cz = camera.position.z;
  const n = pts.length;
  // Occasional small breaks so a mid crest does not read as one stray pen stroke.
  const breaks = {};
  if (band.taper && n > 16) {
    const nBreak = 1 + ((n / 28) | 0);
    for (let b = 0; b < nBreak; b++) {
      const at = (4 + ((b + 1) * (n - 8) / (nBreak + 1)) | 0);
      breaks[at] = 1;
      if (at + 1 < n - 3) breaks[at + 1] = 1;
    }
  }
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const pr = pts[Math.max(0, i - 1)];
    const nx = pts[Math.min(n - 1, i + 1)];
    const tx = nx.x - pr.x, tz = nx.z - pr.z;
    const vx = p.x - cx, vy = p.y - cy, vz = p.z - cz;
    // camera-facing sideways
    let sx = vy * tz - vz * 0, sy = vz * tx - vx * tz, sz = vx * 0 - vy * tx;
    // fallback to horizontal perp
    if (Math.hypot(sx, sy, sz) < 1e-6) { sx = -tz; sy = 0; sz = tx; }
    const sl = Math.hypot(sx, sy, sz) || 1;
    sx /= sl; sy /= sl; sz /= sl;
    let env = 1;
    if (band.taper) {
      const t = n <= 1 ? 1 : i / (n - 1);
      env = Math.sin(t * Math.PI);
      env = env * env * (3 - 2 * env);
    }
    const wpx = band.widthPx * (0.22 + 0.78 * env);
    const half = Math.max(pixelWorldWidth(wpx, p.dist || 400), 0.18) * 0.5;
    pos.push(p.x - sx * half, p.y - sy * half, p.z - sz * half);
    pos.push(p.x + sx * half, p.y + sy * half, p.z + sz * half);
    const along = n <= 1 ? 0 : i / (n - 1);
    uv.push(along, 0, along, 1);
    if (i > 0 && !breaks[i] && !breaks[i - 1]) {
      const a = (i - 1) * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const night = clock && clock.night > 0.45;
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(night ? 0xEDE6D6 : band.color) },
      uSeed: { value: (band.d0 || 700) * 0.01 }
    },
    vertexShader: /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: /* glsl */`
      uniform vec3 uColor;
      uniform float uSeed;
      varying vec2 vUv;
      float hash21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main(){
        float along = vUv.x;
        float across = abs(vUv.y - 0.5) * 2.0;
        float n = hash21(vec2(floor(along * 64.0), uSeed));
        float n2 = hash21(vec2(floor(along * 24.0), uSeed + 3.1));
        // Noise on line weight and opacity, plus short gaps like a pen lift.
        float lift = step(0.16, hash21(vec2(floor(along * 48.0), uSeed + 7.0)));
        if (lift < 0.5) discard;
        float halfw = 0.55 + 0.45 * n;
        if (across > halfw) discard;
        float edge = 1.0 - smoothstep(halfw * 0.55, halfw, across);
        float alpha = (0.22 + 0.20 * n2) * edge;
        gl_FragColor = vec4(uColor, alpha);
      }
    `,
    side: THREE.DoubleSide,
    depthTest: true,
    depthWrite: false,
    transparent: true
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = 2;
  mesh.frustumCulled = false;
  mesh.name = "ridgeCrest";
  ridgeGroup.add(mesh);
}

const RIVER_VERT = /* glsl */`
varying vec2 vUv;
uniform float uTanHalf;
uniform float uScreenH;
void main(){
  vUv = uv;
  vec3 p = position;
  vec3 toCam = cameraPosition - p;
  float dist = length(toCam);
  // Lift slightly toward the camera so a shallow view still sees a ribbon.
  p += normalize(toCam) * 4.0;
  p.y += 1.6;
  gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(p, 1.0);
}
`;

const RIVER_FRAG = /* glsl */`
varying vec2 vUv;
void main(){
  vec3 water = vec3(0.36, 0.47, 0.53);
  vec3 ink = vec3(0.165, 0.129, 0.094);
  vec3 cream = vec3(0.96, 0.92, 0.80);
  vec3 col = water;
  float rip = abs(fract(vUv.x * 36.0 + sin(vUv.y * 9.0) * 0.18) - 0.5);
  col = mix(col, ink, (1.0 - smoothstep(0.0, 0.07, rip)) * 0.42);
  float glint = abs(fract(vUv.x * 16.0 + 0.28 + sin(vUv.y * 5.0) * 0.1) - 0.5);
  float mid = 1.0 - abs(vUv.y - 0.5) * 2.0;
  col = mix(col, cream, (1.0 - smoothstep(0.0, 0.055, glint)) * 0.40 * mid);
  float bank = min(vUv.y, 1.0 - vUv.y);
  col = mix(col, ink, (1.0 - smoothstep(0.0, 0.07, bank)) * 0.55);
  gl_FragColor = vec4(col, 1.0);
}
`;

function densifyRiverPath() {
  const src = riverPathPx || [];
  const out = [];
  for (let i = 0; i < src.length; i++) {
    const a = pxToWorld(src[i][0], src[i][1]);
    out.push({ x: a.x, z: a.z });
    if (i < src.length - 1) {
      const b = pxToWorld(src[i + 1][0], src[i + 1][1]);
      const d = Math.hypot(b.x - a.x, b.z - a.z);
      const n = Math.max(1, Math.ceil(d / 28));
      for (let k = 1; k < n; k++) {
        const t = k / n;
        out.push({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t });
      }
    }
  }
  return out;
}

function layoutRiverRibbon() {
  if (!riverPathPx.length || !camera) return;
  const stamp = [
    camera.position.x.toFixed(1), camera.position.y.toFixed(1), camera.position.z.toFixed(1),
    camera.fov.toFixed(1), renderer.domElement.width, renderer.domElement.height, riverPathPx.length
  ].join("|");
  if (layoutRiverRibbon._stamp === stamp && riverRibbon) return;
  layoutRiverRibbon._stamp = stamp;
  const raw = densifyRiverPath();
  const cx = camera.position.x, cy = camera.position.y, cz = camera.position.z;
  const look = new THREE.Vector3();
  camera.getWorldDirection(look);
  const lx = look.x, lz = look.z;
  const llen = Math.hypot(lx, lz) || 1;
  const pts = [];
  for (let i = 0; i < raw.length; i++) {
    const p = raw[i];
    const along = ((p.x - cx) * lx + (p.z - cz) * lz) / llen;
    const side = (p.x - cx) * (lz / llen) - (p.z - cz) * (lx / llen);
    if (along < 160 || along > 6200 || Math.abs(side) > 2400) continue;
    pts.push(p);
  }
  if (pts.length < 3) return;
  const pos = [];
  const uv = [];
  const idx = [];
  const bankPos = [];
  const bankUv = [];
  const bankIdx = [];
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const pr = pts[Math.max(0, i - 1)];
    const nx = pts[Math.min(n - 1, i + 1)];
    let tx = nx.x - pr.x, tz = nx.z - pr.z;
    const tl = Math.hypot(tx, tz) || 1;
    tx /= tl; tz /= tl;
    const sx = -tz, sz = tx;
    const dist = Math.hypot(p.x - cx, p.z - cz);
    // Stay inside the source river mask (typical half-width ~2.4 cells). A 150 m
    // floor was flooding the adjacent fields when the camera stood close.
    const half = Math.min(2.6 * CELL, Math.max(1.6 * CELL, pixelWorldWidth(10.0, Math.max(dist, 400)) * 0.5));
    // Rim is sampled off the centerline so we use the uncarved bank, not the bed.
    const rimL = terrainYAt(p.x - sx * (half + 16), p.z - sz * (half + 16));
    const rimR = terrainYAt(p.x + sx * (half + 16), p.z + sz * (half + 16));
    const bankY = Math.max(rimL, rimR) + 0.4;
    const bedY = terrainYAt(p.x, p.z);
    // Water sits in the trough, above the carved bed, below the rim.
    const waterY = Math.max(bedY + 1.0, bankY - 3.2);
    pos.push(p.x - sx * half, waterY, p.z - sz * half);
    pos.push(p.x + sx * half, waterY, p.z + sz * half);
    bankPos.push(p.x - sx * half, waterY, p.z - sz * half);
    bankPos.push(p.x - sx * (half + 10), bankY, p.z - sz * (half + 10));
    bankPos.push(p.x + sx * half, waterY, p.z + sz * half);
    bankPos.push(p.x + sx * (half + 10), bankY, p.z + sz * (half + 10));
    const u = i / (n - 1);
    uv.push(u, 0, u, 1);
    bankUv.push(u, 0, u, 1, u, 0, u, 1);
    if (i > 0) {
      const a = (i - 1) * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      const b = (i - 1) * 4;
      bankIdx.push(b, b + 1, b + 4, b + 1, b + 5, b + 4);
      bankIdx.push(b + 2, b + 6, b + 3, b + 3, b + 6, b + 7);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  if (!riverRibbon) {
    const mat = makeRiverMat();
    riverRibbon = new THREE.Mesh(geo, mat);
    riverRibbon.name = "patokaRibbon";
    riverRibbon.renderOrder = 3;
    riverRibbon.frustumCulled = false;
    scene.add(riverRibbon);
  } else {
    if (riverRibbon.geometry) riverRibbon.geometry.dispose();
    riverRibbon.geometry = geo;
  }
  const bgeo = new THREE.BufferGeometry();
  bgeo.setAttribute("position", new THREE.Float32BufferAttribute(bankPos, 3));
  bgeo.setAttribute("uv", new THREE.Float32BufferAttribute(bankUv, 2));
  bgeo.setIndex(bankIdx);
  bgeo.computeVertexNormals();
  if (!riverBanks) {
    const bmat = new THREE.ShaderMaterial({
      uniforms: {
        uNight: { value: 0 },
        uInk: { value: new THREE.Color(0x2A2118) },
        uNightMul: { value: colU(NIGHT_MUL) },
        uStrikePos: { value: new THREE.Vector3() },
        uStrikeAmt: { value: 0 },
        uStrikeRad: { value: 1600 },
        uStorm: { value: 0 }
      },
      vertexShader: /* glsl */`varying vec2 vUv; varying vec3 vN; varying vec3 vW;
        void main(){ vUv = uv; vN = normalize(normalMatrix * normal);
          vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz;
          gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: /* glsl */`
        uniform float uNight, uStorm;
        uniform vec3 uInk, uNightMul;
        uniform vec3 uStrikePos;
        uniform float uStrikeAmt, uStrikeRad;
        varying vec2 vUv; varying vec3 vN; varying vec3 vW;
        float hash21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        void main(){
          vec3 ink = uInk;
          vec3 bank = vec3(0.76, 0.70, 0.56);
          vec3 col = bank;
          float sl = abs(fract((vW.x * 0.07 + vW.z * 0.02) * 3.4 + vUv.y * 1.2) - 0.5);
          float hatch = (1.0 - smoothstep(0.0, 0.18, sl)) * (0.22 + 0.28 * (1.0 - vUv.y));
          hatch *= step(0.22, hash21(floor(vec2(vUv.x * 36.0, vUv.y * 7.0))));
          col = mix(col, ink, hatch * 0.16);
          float shore = 1.0 - smoothstep(0.0, 0.22, 1.0 - vUv.y);
          col = mix(col, ink, shore * 0.10);
          if (uStorm > 0.01) {
            float lumaB = dot(col, vec3(0.299, 0.587, 0.114));
            col = mix(col, vec3(lumaB * 0.90, lumaB * 0.95, lumaB * 1.04), 0.70 * uStorm);
            col *= mix(1.0, 0.65, uStorm);
          }
          vec3 nightCol = mix(col * uNightMul * 0.4, vec3(0.035, 0.048, 0.09), 0.5);
          nightCol = mix(nightCol, ink, 0.25 + hatch * 0.55 + shore * 0.7);
          col = mix(col, nightCol, uNight);
          if (uStrikeAmt > 0.001) {
            float sd = length(vW - uStrikePos);
            float fall = exp(-sd * sd / max(1.0, uStrikeRad * uStrikeRad));
            float k = min(0.48, uStrikeAmt * fall);
            col = mix(col, mix(col, vec3(0.965, 0.933, 0.863), 0.58), k);
          }
          gl_FragColor = vec4(col, 1.0);
        }`,
      side: THREE.DoubleSide,
      depthWrite: true
    });
    riverBanks = new THREE.Mesh(bgeo, bmat);
    riverBanks.name = "patokaBanks";
    riverBanks.renderOrder = 2;
    riverBanks.frustumCulled = false;
    scene.add(riverBanks);
  } else {
    if (riverBanks.geometry) riverBanks.geometry.dispose();
    riverBanks.geometry = bgeo;
  }
}

function makeRiverMat() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uWind: { value: 1 },
      uReduce: { value: REDUCE ? 1 : 0 },
      uNight: { value: 0 },
      uWater: { value: new THREE.Color(0x6E9AA4) },
      uInk: { value: new THREE.Color(0x2A2118) },
      uHor: { value: new THREE.Color(0xF7F0E2) },
      uTop: { value: new THREE.Color(0xD2DEE2) },
      uTrees: { value: new THREE.Color(0xA87440) },
      uNightMul: { value: colU(NIGHT_MUL) },
      uMoonDir: { value: new THREE.Vector3(0.2, 0.5, 0.4) },
      uRain: { value: 0 },
      uStorm: { value: 0 },
      uStrikePos: { value: new THREE.Vector3() },
      uStrikeAmt: { value: 0 },
      uStrikeRad: { value: 1600 }
    },
    vertexShader: /* glsl */`
      varying vec2 vUv; varying vec3 vW; varying vec3 vN;
      void main(){
        vUv = uv;
        vec3 p = position;
        vec3 toCam = cameraPosition - p;
        p += normalize(toCam) * 5.0;
        vec4 w = modelMatrix * vec4(p, 1.0);
        vW = w.xyz;
        vN = vec3(0.0, 1.0, 0.0);
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: /* glsl */`
      uniform float uTime, uWind, uReduce, uNight, uRain, uStorm;
      uniform float uStrikeAmt, uStrikeRad;
      uniform vec3 uWater, uInk, uHor, uTop, uTrees, uNightMul, uMoonDir, uStrikePos;
      varying vec2 vUv; varying vec3 vW;
      float hash21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main(){
        vec3 V = normalize(cameraPosition - vW);
        vec3 R = reflect(-V, vec3(0.0, 1.0, 0.0));
        float skyH = R.y;
        vec3 sky = mix(uHor, uTop, smoothstep(0.0, 0.55, skyH));
        vec3 env = mix(uTrees, sky, smoothstep(-0.05, 0.22, skyH));
        vec3 col = mix(uWater, env, 0.58);
        col = mix(col, uHor, 0.16);
        col = mix(col, vec3(0.45, 0.66, 0.70), 0.18);
        float t = uTime * (1.0 - uReduce);
        // Engraved ripples travel with the current and the wind.
        float cur = vUv.x * 28.0 - t * 0.7 * (0.6 + 0.4 * uWind);
        float wind = vUv.x * 11.0 + vUv.y * 3.0 + t * 0.35 * uWind;
        float rip = abs(fract(cur + sin(vUv.y * 9.0 + t) * 0.18) - 0.5);
        col = mix(col, uInk, (1.0 - smoothstep(0.0, 0.07, rip)) * 0.22);
        float glint = abs(fract(wind) - 0.5);
        float mid = 1.0 - abs(vUv.y - 0.5) * 2.0;
        col = mix(col, uHor, (1.0 - smoothstep(0.0, 0.05, glint)) * 0.48 * mid);
        // Inked shoreline at the water edge.
        float bank = min(vUv.y, 1.0 - vUv.y);
        col = mix(col, uInk, (1.0 - smoothstep(0.0, 0.08, bank)) * 0.16);
        col = mix(col, uHor, 0.18);
        float distR = length(vW.xz - cameraPosition.xz);
        float farW = smoothstep(160.0, 820.0, distR);
        col = mix(col, mix(uHor, uWater, 0.22), farW * 0.70 * (1.0 - uStorm));
        // Storm water is a dark slate near #5A6068, only slightly lighter
        // than the storm-darkened land, with no leftover day-blue or sky
        // tint. It only brightens as a reflection while a bolt flashes.
        if (uStorm > 0.01) {
          vec3 stormRiver = vec3(90.0, 96.0, 104.0) / 255.0;
          col = mix(col, stormRiver, 0.96 * uStorm);
        }
        // Night: dark ink everywhere except a moon-glint band along the moon azimuth.
        vec3 nightCol = vec3(0.022, 0.024, 0.028);
        nightCol = mix(nightCol, uInk, (1.0 - smoothstep(0.0, 0.07, bank)) * 0.70);
        vec3 moonD = normalize(uMoonDir);
        vec3 Rm = reflect(-V, vec3(0.0, 1.0, 0.0));
        float moonUp = smoothstep(-0.04, 0.10, moonD.y);
        vec2 moonAz = normalize(moonD.xz + vec2(1e-5));
        vec2 fromCam = normalize(vW.xz - cameraPosition.xz);
        float azBand = pow(max(0.0, dot(fromCam, moonAz)), 26.0);
        float moonSpec = pow(max(0.0, dot(normalize(Rm), moonD)), 36.0);
        float midN = 1.0 - abs(vUv.y - 0.5) * 2.0;
        float spark = mix(0.55, 1.0, hash21(floor(vW.xz * 0.10)));
        float moonGlint = (moonSpec * 0.95 + azBand * midN * 0.50) * moonUp * spark;
        vec3 cream = vec3(0.93, 0.90, 0.84);
        nightCol = mix(nightCol, cream, clamp(moonGlint, 0.0, 0.88));
        col = mix(col, nightCol, uNight);
        if (uRain > 0.01) {
          vec2 cell = floor(vW.xz * 0.07);
          float id = hash21(cell);
          vec2 ctr = (cell + 0.5) / 0.07;
          float rad = fract(t * 0.65 + id * 2.7);
          float ring = 1.0 - smoothstep(0.0, 1.4, abs(length(vW.xz - ctr) - rad * 12.0));
          ring *= (1.0 - rad) * step(0.58, id);
          col = mix(col, mix(uInk, vec3(0.18, 0.16, 0.14), uNight), ring * 0.45 * uRain);
        }
        if (uStrikeAmt > 0.001) {
          float sd = length(vW - uStrikePos);
          float fall = exp(-sd * sd / max(1.0, uStrikeRad * uStrikeRad));
          vec3 toStrike = normalize(uStrikePos - vW);
          vec3 Rf = reflect(-V, vec3(0.0, 1.0, 0.0));
          float specS = pow(max(0.0, dot(normalize(Rf), toStrike)), 18.0);
          float k = min(0.88, uStrikeAmt * (fall * 0.50 + specS * 0.90));
          col = mix(col, mix(col, vec3(0.965, 0.933, 0.863), 0.78), k);
        }
        gl_FragColor = vec4(col, 1.0);
      }
    `,
    side: THREE.DoubleSide,
    depthTest: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2
  });
}

function placeCamera() {
  if (state.holdCamera) return;
  const aim = applyFovAndPitch();
  const sample = pathSample(rig.s);
  let x = sample.x, z = sample.z;
  if (rig.side) {
    const right = sample.heading + Math.PI / 2;
    x = sample.x + Math.sin(right) * rig.side;
    z = sample.z + Math.cos(right) * rig.side;
  }
  const church = (meta && meta.landmarks && meta.landmarks.jasper_st_joseph) || [168.49, 429.67];
  const cw = pxToWorld(church[0], church[1]);
  const lookX = (sample.lookX != null) ? sample.lookX : (cw.x - x);
  const lookZ = (sample.lookZ != null) ? sample.lookZ : (cw.z - z);
  const heading = Math.atan2(lookX, lookZ) + (rig.headingOff || 0);
  if (rig.fwd) {
    x += Math.sin(heading) * rig.fwd;
    z += Math.cos(heading) * rig.fwd;
  }
  let ground = heightWorld(x, z);
  // Eye is world meters above the exaggerated surface, so 40-60 m feels like 40-60 m
  // against tree and spire heights, not 40-60 m stretched by EXAG.
  let y = yOf(ground) + rig.eye;
  // Terrain collision: if a forward dolly would bury the eye, pull back.
  if (rig.fwd && y < yOf(ground) + 16) {
    y = yOf(ground) + Math.max(rig.eye, 16);
  }
  camera.position.set(x, y, z);
  const pitch = aim.pitch;
  const look = 1800;
  camera.lookAt(
    x + Math.sin(heading) * look * Math.cos(pitch),
    y + Math.sin(pitch) * look,
    z + Math.cos(heading) * look * Math.cos(pitch)
  );
  skyGroup.position.copy(camera.position);
  skyGroup.rotation.set(0, 0, 0);
  if (skyMat && skyMat.uniforms && skyMat.uniforms.uLookAz) {
    skyMat.uniforms.uLookAz.value = heading;
  }
  if (skyMat && skyMat.uniforms && skyMat.uniforms.uRes) {
    skyMat.uniforms.uRes.value.set(renderer.domElement.width, renderer.domElement.height);
  }
  setMoonPos(); setSunPos();
  layoutRidgeLines();
  layoutRiverRibbon();
  layoutVolClouds();
  layoutFrameTrees();
  layoutSnow();
  layoutRain();
  layoutFogBank();
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
  rig.pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
  const ids = Object.keys(rig.pointers);
  if (ids.length === 2) {
    const a = rig.pointers[ids[0]], b = rig.pointers[ids[1]];
    rig.pinch = Math.hypot(a.x - b.x, a.y - b.y);
    rig._fwd0 = rig.fwd || 0;
    rig.dragging = false;
    noteInput();
    return;
  }
  rig.dragging = true;
  rig.lastX = e.clientX;
  rig.lastY = e.clientY;
  noteInput();
  canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
}
function onPointerMove(e) {
  if (rig.pointers[e.pointerId]) {
    rig.pointers[e.pointerId].x = e.clientX;
    rig.pointers[e.pointerId].y = e.clientY;
  }
  const ids = Object.keys(rig.pointers);
  if (ids.length === 2 && rig.pinch) {
    const a = rig.pointers[ids[0]], b = rig.pointers[ids[1]];
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    // Spread (fingers apart) dollies forward; close dollies back.
    const scale = d / Math.max(8, rig.pinch);
    applyDollyTo((rig._fwd0 || 0) + (scale - 1) * 520);
    noteInput();
    return;
  }
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
  delete rig.pointers[e.pointerId];
  if (Object.keys(rig.pointers).length < 2) rig.pinch = 0;
  rig.dragging = false;
  try { canvas.releasePointerCapture && canvas.releasePointerCapture(e.pointerId); } catch (err) {}
}
function onPointerLeave() {
  cursor.ts = 0;
  cursor.active = false;
}

function readTouches(touches) {
  const out = [];
  for (let i = 0; i < touches.length; i++) out.push({ x: touches[i].clientX, y: touches[i].clientY });
  return out;
}

function onTouchStart(e) {
  e.preventDefault();
  const pts = readTouches(e.touches);
  if (pts.length === 2) {
    rig.pinch = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    rig._fwd0 = rig.fwd || 0;
    rig.dragging = false;
  } else if (pts.length === 1) {
    rig.dragging = true;
    rig.lastX = pts[0].x;
    rig.lastY = pts[0].y;
  }
  noteInput();
}

function onTouchMove(e) {
  e.preventDefault();
  const pts = readTouches(e.touches);
  if (pts.length === 2 && rig.pinch) {
    const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    const scale = d / Math.max(8, rig.pinch);
    applyDollyTo((rig._fwd0 || 0) + (scale - 1) * 520);
    noteInput();
    return;
  }
  if (pts.length === 1 && rig.dragging) {
    const dx = pts[0].x - rig.lastX, dy = pts[0].y - rig.lastY;
    rig.lastX = pts[0].x; rig.lastY = pts[0].y;
    rig.headingOff += dx * 0.0045;
    rig.s = clamp(rig.s - dy * 1.8, 0, path.len);
    rig.yawVel = 0;
    noteInput();
  }
}

function onTouchEnd(e) {
  if (e.touches && e.touches.length < 2) rig.pinch = 0;
  if (!e.touches || e.touches.length === 0) rig.dragging = false;
}

function mapEdgeOk() {
  // Refuse a zoom-out that would let the ground frustum hit the DEM rim.
  if (!camera || !heightF32) return true;
  const margin = 900;
  const corners = [[-1, -1], [1, -1], [-1, 0.2], [1, 0.2]];
  const ray = new THREE.Raycaster();
  for (let i = 0; i < corners.length; i++) {
    ray.setFromCamera(new THREE.Vector2(corners[i][0], corners[i][1]), camera);
    const dir = ray.ray.direction, eye = camera.position;
    if (Math.abs(dir.y) < 1e-4) continue;
    const g = yOf(heightWorld(eye.x, eye.z));
    const t = (g - eye.y) / dir.y;
    if (t < 0) continue;
    const x = eye.x + dir.x * t, z = eye.z + dir.z * t;
    const p = worldToPx(x, z);
    if (p.px < margin / CELL || p.py < margin / CELL ||
        p.px > COLS - 1 - margin / CELL || p.py > ROWS - 1 - margin / CELL) {
      return false;
    }
  }
  return true;
}

function nearPixelation() {
  // Stop zoom-in before a terrain cell or a tree atlas cell blows up on screen.
  if (!camera) return false;
  const fov = camera.fov * Math.PI / 180;
  const h = renderer.domElement.height || 800;
  const worldPerPx = (2 * Math.tan(fov / 2) * 180) / h;
  return worldPerPx < 0.55;
}

function applyZoom(next) {
  const prev = rig.zoom;
  rig.zoom = clamp(next, 0.85, 1.55);
  if (camera) applyFovAndPitch();
  if (rig.zoom < prev && !mapEdgeOk()) {
    rig.zoom = prev;
    if (camera) applyFovAndPitch();
    return;
  }
  if (rig.zoom > prev && nearPixelation()) {
    rig.zoom = prev;
    if (camera) applyFovAndPitch();
  }
}

function applyDolly(deltaM) {
  return applyDollyTo((rig.fwd || 0) + deltaM);
}

function applyDollyTo(nextM) {
  const prev = rig.fwd || 0;
  let next = clamp(nextM, -700, 2400);
  const saved = rig.fwd;
  rig.fwd = next;
  if (camera && !state.holdCamera) {
    const before = camera.position.clone();
    placeCamera();
    // Refuse a move that clips into a steep rise or walks off the DEM.
    const g = yOf(heightWorld(camera.position.x, camera.position.z));
    if (camera.position.y < g + 14 || !mapEdgeOk()) {
      rig.fwd = saved;
      placeCamera();
      return rig.fwd;
    }
    // Keep a little clearance from a wall of terrain just ahead.
    const look = new THREE.Vector3();
    camera.getWorldDirection(look);
    look.y = 0;
    if (look.lengthSq() > 1e-6) {
      look.normalize();
      const ax = camera.position.x + look.x * 36;
      const az = camera.position.z + look.z * 36;
      const ahead = yOf(heightWorld(ax, az));
      if (ahead > camera.position.y - 8) {
        rig.fwd = saved;
        placeCamera();
        return rig.fwd;
      }
    }
  }
  return rig.fwd;
}

function noteInput() {
  tour.lastInput = performance.now();
  if (tour.enabled && !tour.paused) pauseTour();
}

function onWheel(e) {
  e.preventDefault();
  noteInput();
  // Mouse wheel, trackpad pinch (often ctrl+wheel), and ctrl+wheel all dolly.
  const unit = e.deltaMode === 1 ? 16 : (e.deltaMode === 2 ? 80 : 1);
  const dy = e.deltaY * unit;
  const step = clamp(Math.abs(dy) * 0.45, 8, 90);
  // Scroll up / pinch-spread (negative deltaY) moves forward into the scene.
  applyDolly(dy > 0 ? -step : step);
}

function bindInput() {
  canvas.style.touchAction = "none";
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointerleave", onPointerLeave);
  canvas.addEventListener("contextmenu", function (e) { e.preventDefault(); });
  canvas.addEventListener("wheel", onWheel, { passive: false });
  canvas.addEventListener("touchstart", onTouchStart, { passive: false });
  canvas.addEventListener("touchmove", onTouchMove, { passive: false });
  canvas.addEventListener("touchend", onTouchEnd, { passive: false });
  canvas.addEventListener("touchcancel", onTouchEnd, { passive: false });
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

let boltGroup = null, boltCoreMesh = null, boltGlowMesh = null;
const strike = {
  nextAt: 0,
  t0: 0,
  amt: 0,
  flashes: 0,
  nFlashes: 0,
  flashTimes: [],
  inPeak: false,
  kind: "bolt",
  seed: 91771,
  pos: { x: 0, y: 0, z: 0 },
  origin: { x: 0, y: 0, z: 0 },
  rad: 1600,
  forced: false,
  holdPhase: null,
  path: null,
  visible: false
};

function lightningFlashCapOk(now, times) {
  const list = times || strike.flashTimes;
  while (list.length && now - list[0] > 1000) list.shift();
  return list.length < 3;
}

function recordLightningFlash(now) {
  strike.flashTimes.push(now);
  while (strike.flashTimes.length && now - strike.flashTimes[0] > 1000) strike.flashTimes.shift();
}

function flashEnvelope(age, nFlashes) {
  const n = Math.max(1, Math.min(3, nFlashes || 2));
  const peaks = n >= 3 ? [0.0, 0.13, 0.26] : (n === 2 ? [0.0, 0.14] : [0.0]);
  const amps = [1.0, 0.70, 0.42];
  const half = 0.018;
  let v = 0;
  let peakIdx = -1;
  for (let i = 0; i < peaks.length; i++) {
    const d = Math.abs(age - peaks[i]);
    if (d < half * 1.6) {
      const a = amps[i] * Math.max(0, 1 - d / (half * 1.5));
      if (a > v) {
        v = a;
        peakIdx = i;
      }
    }
  }
  if (age > 0 && age < 0.42) v = Math.max(v, Math.exp(-age * 7.0) * 0.12);
  if (age >= 0.42) v = 0;
  return { amt: Math.min(0.72, v), flashing: v > 0.35, peakIdx: peakIdx };
}

const BOLT_VERT = /* glsl */`
attribute vec3 aNext;
attribute float aSide;
attribute float aWidthPx;
attribute float aAlpha;
uniform vec2 uRes;
varying float vAlpha;
varying float vSide;
void main(){
  vAlpha = aAlpha;
  vSide = aSide;
  vec4 c0 = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  vec4 c1 = projectionMatrix * modelViewMatrix * vec4(aNext, 1.0);
  vec2 s0 = c0.xy / max(1e-4, c0.w);
  vec2 s1 = c1.xy / max(1e-4, c1.w);
  vec2 dir = s1 - s0;
  float len = length(dir);
  if (len < 1e-5) dir = vec2(1.0, 0.0);
  else dir /= len;
  vec2 perp = vec2(-dir.y, dir.x);
  c0.xy += perp * (aWidthPx * 0.5 * aSide) * c0.w * vec2(2.0 / max(1.0, uRes.x), 2.0 / max(1.0, uRes.y));
  gl_Position = c0;
}
`;
const BOLT_FRAG = /* glsl */`
uniform vec3 uColor;
uniform float uOpacity;
uniform float uAmt;
uniform float uSoft;
varying float vAlpha;
varying float vSide;
void main(){
  float edge = 1.0 - abs(vSide);
  float soft = mix(1.0, smoothstep(0.0, 0.85, edge), uSoft);
  float a = uOpacity * uAmt * vAlpha * soft;
  if (a < 0.01) discard;
  gl_FragColor = vec4(uColor, a);
}
`;

function makeBoltMat(color, opacity) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uOpacity: { value: opacity },
      uAmt: { value: 0 },
      uSoft: { value: 0 },
      uRes: { value: new THREE.Vector2(1280, 800) }
    },
    vertexShader: BOLT_VERT,
    fragmentShader: BOLT_FRAG,
    transparent: true,
    depthTest: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
    side: THREE.DoubleSide
  });
}

function ensureBoltGroup() {
  if (boltGroup || !scene) return;
  boltGlowMesh = new THREE.Mesh(new THREE.BufferGeometry(), makeBoltMat(0xDDE6F0, 0.52));
  boltCoreMesh = new THREE.Mesh(new THREE.BufferGeometry(), makeBoltMat(0xF6EEDC, 1.0));
  boltGlowMesh.material.uniforms.uSoft.value = 1;
  boltGlowMesh.frustumCulled = false;
  boltCoreMesh.frustumCulled = false;
  boltGlowMesh.renderOrder = 8;
  boltCoreMesh.renderOrder = 9;
  boltGroup = new THREE.Group();
  boltGroup.name = "lightningBolt";
  boltGroup.add(boltGlowMesh);
  boltGroup.add(boltCoreMesh);
  boltGroup.visible = false;
  scene.add(boltGroup);
}

function hideBoltMesh() {
  if (boltGroup) boltGroup.visible = false;
  if (boltCoreMesh && boltCoreMesh.material && boltCoreMesh.material.uniforms) {
    boltCoreMesh.material.uniforms.uAmt.value = 0;
  }
  if (boltGlowMesh && boltGlowMesh.material && boltGlowMesh.material.uniforms) {
    boltGlowMesh.material.uniforms.uAmt.value = 0;
  }
}

function setBoltAmt(amt) {
  if (!boltGroup) return;
  const on = amt > 0.02 && strike.visible;
  boltGroup.visible = on;
  if (boltCoreMesh && boltCoreMesh.material && boltCoreMesh.material.uniforms) {
    boltCoreMesh.material.uniforms.uAmt.value = amt;
    const w = canvas ? canvas.clientWidth : 1280;
    const h = canvas ? canvas.clientHeight : 800;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    boltCoreMesh.material.uniforms.uRes.value.set(w * dpr, h * dpr);
  }
  if (boltGlowMesh && boltGlowMesh.material && boltGlowMesh.material.uniforms) {
    boltGlowMesh.material.uniforms.uAmt.value = amt;
    const w = canvas ? canvas.clientWidth : 1280;
    const h = canvas ? canvas.clientHeight : 800;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    boltGlowMesh.material.uniforms.uRes.value.set(w * dpr, h * dpr);
  }
}

function polylineToRibbon(pts, widthStart, widthEnd, branch, seed) {
  const n = (pts.length / 3) | 0;
  if (n < 2) return null;
  const rng = mulberry(seed);
  const pos = [], next = [], side = [], width = [], alpha = [], idx = [];
  for (let i = 0; i < n; i++) {
    const i1 = Math.min(n - 1, i + 1);
    const t = i / (n - 1);
    const w = widthStart + (widthEnd - widthStart) * t;
    let a = 1;
    if (t > 0.10 && t < 0.88 && rng() < 0.08) a = 0;
    if (branch && t > 0.12 && t < 0.90 && rng() < 0.06) a = 0;
    if (!branch && t < 0.08) a = 0;
    const px = pts[i * 3], py = pts[i * 3 + 1], pz = pts[i * 3 + 2];
    const qx = pts[i1 * 3], qy = pts[i1 * 3 + 1], qz = pts[i1 * 3 + 2];
    pos.push(px, py, pz, px, py, pz);
    next.push(qx, qy, qz, qx, qy, qz);
    side.push(-1, 1);
    width.push(w, w);
    alpha.push(a, a);
  }
  for (let i = 0; i < n - 1; i++) {
    const a = i * 2, b = i * 2 + 1, c = (i + 1) * 2, d = (i + 1) * 2 + 1;
    idx.push(a, b, c, b, d, c);
  }
  return { pos: pos, next: next, side: side, width: width, alpha: alpha, idx: idx };
}

function mergeRibbons(parts) {
  const pos = [], next = [], side = [], width = [], alpha = [], idx = [];
  let base = 0;
  for (let p = 0; p < parts.length; p++) {
    const r = parts[p];
    if (!r) continue;
    for (let i = 0; i < r.pos.length; i++) pos.push(r.pos[i]);
    for (let i = 0; i < r.next.length; i++) next.push(r.next[i]);
    for (let i = 0; i < r.side.length; i++) side.push(r.side[i]);
    for (let i = 0; i < r.width.length; i++) width.push(r.width[i]);
    for (let i = 0; i < r.alpha.length; i++) alpha.push(r.alpha[i]);
    for (let i = 0; i < r.idx.length; i++) idx.push(r.idx[i] + base);
    base += (r.pos.length / 3) | 0;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("aNext", new THREE.Float32BufferAttribute(next, 3));
  geo.setAttribute("aSide", new THREE.Float32BufferAttribute(side, 1));
  geo.setAttribute("aWidthPx", new THREE.Float32BufferAttribute(width, 1));
  geo.setAttribute("aAlpha", new THREE.Float32BufferAttribute(alpha, 1));
  geo.setIndex(idx);
  return geo;
}

function midpointDisplace(ax, ay, az, bx, by, bz, depth, spread, rng, out) {
  if (depth <= 0) {
    out.push(ax, ay, az);
    return;
  }
  const mx = (ax + bx) * 0.5, my = (ay + by) * 0.5, mz = (az + bz) * 0.5;
  const dx = bx - ax, dy = by - ay, dz = bz - az;
  const len = Math.hypot(dx, dy, dz) || 1;
  const px = -dz / len, pz = dx / len;
  // Each level jogs 15-25% of this segment's length, so the zigzags stay
  // visible at every scale instead of collapsing toward a straight line.
  const amt = 0.15 + rng() * 0.10;
  const jag = (rng() * 2 - 1) * amt * len;
  const jy = (rng() * 2 - 1) * amt * len * 0.24;
  const x = mx + px * jag;
  const y = my + jy;
  const z = mz + pz * jag;
  midpointDisplace(ax, ay, az, x, y, z, depth - 1, spread, rng, out);
  midpointDisplace(x, y, z, bx, by, bz, depth - 1, spread, rng, out);
}

function pickStrikeTarget(rng) {
  if (!camera) return null;
  const look = new THREE.Vector3();
  camera.getWorldDirection(look);
  look.y = 0;
  if (look.lengthSq() < 1e-8) look.set(0, 0, 1);
  look.normalize();
  const cx = camera.position.x, cz = camera.position.z;
  const baseAz = Math.atan2(look.x, look.z);
  let best = null, bestScore = -1e9;
  for (let k = 0; k < 56; k++) {
    const dist = 480 + rng() * 2100;
    const az = baseAz + (rng() - 0.5) * 1.15;
    const x = cx + Math.sin(az) * dist;
    const z = cz + Math.cos(az) * dist;
    const p = worldToPx(x, z);
    if (p.px < 6 || p.py < 6 || p.px > COLS - 7 || p.py > ROWS - 7) continue;
    const cov = coverWorld(x, z);
    if (cov === 0) continue;
    const h = heightWorld(x, z);
    let peak = 0;
    for (let d = 0; d < 4; d++) {
      const ox = x + Math.cos(d * 1.5708) * 90;
      const oz = z + Math.sin(d * 1.5708) * 90;
      peak += Math.max(0, h - heightWorld(ox, oz));
    }
    const forest = (cov === 4 || cov === 5) ? 1 : 0;
    const score = forest * 8 + peak * 0.45 + rng() * 2 - Math.abs(az - baseAz) * 2.2;
    if (score > bestScore) {
      bestScore = score;
      const y = yOf(h) + (forest ? 16 : 2);
      best = { x: x, y: y, z: z, forest: forest };
    }
  }
  return best;
}

function cloudBaseWorldY(x, z) {
  const a = (typeof cloudAnchor === "function") ? cloudAnchor() : { x: x, z: z };
  const ground = yOf(heightWorld(a.x, a.z));
  return ground + cloudBaseM();
}

function buildBoltPath(seed, start, end) {
  const rng = mulberry(seed);
  const main = [];
  midpointDisplace(start.x, start.y, start.z, end.x, end.y, end.z, 6, 0.20, rng, main);
  main.push(end.x, end.y, end.z);
  const nPts = (main.length / 3) | 0;
  const nBr = 2 + ((rng() * 3) | 0);
  const branches = [];
  for (let b = 0; b < nBr; b++) {
    const i = 4 + ((rng() * Math.max(1, nPts - 10)) | 0);
    const sx = main[i * 3], sy = main[i * 3 + 1], sz = main[i * 3 + 2];
    const len = 140 + rng() * 260;
    const ang = Math.atan2(end.x - start.x, end.z - start.z) + (rng() < 0.5 ? -1 : 1) * (0.55 + rng() * 0.85);
    const dip = 0.45 + rng() * 0.45;
    let ex = sx + Math.sin(ang) * len;
    let ez = sz + Math.cos(ang) * len;
    let ey = sy - Math.abs(len * dip);
    const gy = yOf(heightWorld(ex, ez)) + 2;
    if (ey < gy) ey = gy;
    const br = [];
    midpointDisplace(sx, sy, sz, ex, ey, ez, 5, 0.2, rng, br);
    br.push(ex, ey, ez);
    branches.push(br);
  }
  return { main: main, branches: branches, start: start, end: end, seed: seed };
}

function layoutBoltMesh(path) {
  if (!path) {
    hideBoltMesh();
    return;
  }
  ensureBoltGroup();
  const coreParts = [polylineToRibbon(path.main, 2.6, 1.0, false, path.seed)];
  const glowParts = [polylineToRibbon(path.main, 2.6 * 4.0, 1.0 * 4.0, false, path.seed + 1)];
  for (let i = 0; i < path.branches.length; i++) {
    coreParts.push(polylineToRibbon(path.branches[i], 1.0, 0.15, true, path.seed + 17 + i));
    glowParts.push(polylineToRibbon(path.branches[i], 1.0 * 4.0, 0.15 * 4.0, true, path.seed + 31 + i));
  }
  if (boltCoreMesh.geometry) boltCoreMesh.geometry.dispose();
  if (boltGlowMesh.geometry) boltGlowMesh.geometry.dispose();
  boltCoreMesh.geometry = mergeRibbons(coreParts);
  boltGlowMesh.geometry = mergeRibbons(glowParts);
  boltGroup.visible = true;
}

function beginStrikeEvent(now, kind, seed) {
  const useSeed = (seed != null) ? seed : (((now * 1000) | 0) ^ 0x9e3779b9);
  const rng = mulberry(useSeed);
  const pick = kind || (rng() < 0.62 ? "cloud" : "bolt");
  const end = pickStrikeTarget(rng);
  if (!end) return false;
  const baseY = cloudBaseWorldY(end.x, end.z);
  const leanAz = Math.atan2((camera && camera.position ? camera.position.x : 0) - end.x, (camera && camera.position ? camera.position.z : 0) - end.z) + (rng() - 0.5) * 1.1;
  const lean = 260 + rng() * 520;
  const start = {
    x: end.x + Math.sin(leanAz) * lean,
    y: baseY + 40 + rng() * 80,
    z: end.z + Math.cos(leanAz) * lean
  };
  strike.t0 = now;
  strike.kind = pick;
  strike.seed = useSeed;
  strike.pos = { x: (start.x + end.x) * 0.5, y: (start.y + end.y) * 0.45, z: (start.z + end.z) * 0.5 };
  strike.origin = { x: start.x, y: start.y, z: start.z };
  strike.rad = pick === "cloud" ? 2200 : 1600;
  strike.nFlashes = 2 + ((rng() * 2) | 0);
  strike.flashes = 0;
  strike.inPeak = false;
  strike.path = pick === "bolt" ? buildBoltPath(useSeed, start, end) : null;
  strike.visible = pick === "bolt";
  if (pick === "bolt") layoutBoltMesh(strike.path);
  else hideBoltMesh();
  return true;
}

function applyStrikeEnvelope(now, age) {
  const env = flashEnvelope(age, strike.nFlashes);
  if (env.flashing && !strike.inPeak) {
    if (!lightningFlashCapOk(now)) {
      env.amt = Math.min(env.amt, 0.08);
    } else {
      recordLightningFlash(now);
      strike.flashes += 1;
    }
    strike.inPeak = true;
  }
  if (!env.flashing) strike.inPeak = false;
  strike.amt = env.amt;
  state.lightning = env.amt;
  if (strike.visible) setBoltAmt(env.amt);
  else hideBoltMesh();
  return env.amt;
}

function stepLightning(now) {
  if (REDUCE || wx.kind !== "storm") {
    strike.amt = 0;
    state.lightning = 0;
    hideBoltMesh();
    if (wx.kind !== "storm") {
      strike.nextAt = 0;
      strike.t0 = 0;
      strike.forced = false;
    }
    return 0;
  }
  if (strike.forced) {
    const phase = strike.holdPhase != null ? strike.holdPhase : 0;
    const env = flashEnvelope(phase, strike.nFlashes || 2);
    strike.amt = env.amt;
    state.lightning = env.amt;
    if (strike.visible) setBoltAmt(env.amt);
    else hideBoltMesh();
    return env.amt;
  }
  if (strike.t0 && now - strike.t0 < 450) {
    return applyStrikeEnvelope(now, (now - strike.t0) / 1000);
  }
  if (strike.t0 && now - strike.t0 >= 450) {
    strike.t0 = 0;
    strike.amt = 0;
    state.lightning = 0;
    hideBoltMesh();
  }
  if (!strike.nextAt) strike.nextAt = now + 8000 + Math.random() * 22000;
  if (now >= strike.nextAt) {
    if (!lightningFlashCapOk(now)) {
      strike.nextAt = now + 800;
      return 0;
    }
    if (beginStrikeEvent(now)) {
      strike.nextAt = now + 8000 + Math.random() * 22000;
      return applyStrikeEnvelope(now, 0);
    }
    strike.nextAt = now + 2000;
  }
  strike.amt = 0;
  state.lightning = 0;
  hideBoltMesh();
  return 0;
}

function forceStrike(kind, phase) {
  if (REDUCE) {
    strike.amt = 0;
    state.lightning = 0;
    hideBoltMesh();
    strike.forced = false;
    return { ok: false, reduce: true };
  }
  const k = kind === "cloud" ? "cloud" : "bolt";
  const phaseT = (typeof phase === "number") ? phase : 0;
  const ok = beginStrikeEvent(performance.now(), k, 91771);
  strike.forced = true;
  strike.holdPhase = phaseT;
  if (!ok) {
    strike.amt = 0;
    state.lightning = 0;
    return { ok: false };
  }
  const env = flashEnvelope(phaseT, strike.nFlashes || 2);
  strike.amt = env.amt;
  state.lightning = env.amt;
  if (strike.visible) setBoltAmt(env.amt);
  else hideBoltMesh();
  return { ok: true, kind: k, phase: phaseT, amt: env.amt, pos: strike.pos };
}

function testLightningCap() {
  const times = [];
  function tryFlash(t) {
    while (times.length && t - times[0] > 1000) times.shift();
    if (times.length >= 3) return false;
    times.push(t);
    return true;
  }
  const a = tryFlash(0), b = tryFlash(130), c = tryFlash(260), d = tryFlash(400);
  const e = tryFlash(1100);
  return { firstThree: !!(a && b && c), fourthBlocked: !d, afterWindow: !!e, ok: !!(a && b && c && !d && e) };
}


const LANDMARK_LABELS = {
  church: { desktop: "St. Joseph Church", phone: "St. Joseph Church" },
  courthouse: { desktop: "Dubois County Courthouse", phone: "Jasper Courthouse" },
  mill: { desktop: "Jasper City Mill", phone: "Jasper City Mill" },
  depot: { desktop: "Jasper Depot", phone: "Jasper Depot" },
  river: { desktop: "Patoka River", phone: "Patoka River" },
  farmstead: { desktop: "Farmstead", phone: "Farmstead" },
  townhall: { desktop: "Huntingburg Town Hall", phone: "Huntingburg Town Hall" },
  stadium: { desktop: "League Stadium", phone: "League Stadium" },
  monastery: { desktop: "Monastery Immaculate Conception", phone: "Ferdinand Monastery" },
  archabbey: { desktop: "Saint Meinrad Archabbey", phone: "Saint Meinrad Archabbey" }
};

function usePhoneLandmarkLabel() {
  return !!(window.matchMedia && window.matchMedia("(max-width: 430px)").matches);
}

let landmarkBtn = null;
let landmarkNameWrap = null;
let landmarkShown = "";

function stopLabel(stop) {
  if (!stop) return "Patoka River";
  const rec = LANDMARK_LABELS[stop.name];
  if (!rec) return stop.name || "Patoka River";
  if (typeof rec === "string") return rec;
  return usePhoneLandmarkLabel() ? rec.phone : rec.desktop;
}

function projectLandmark(stop) {
  if (!camera || !stop) return null;
  const w = pxToWorld(stop.px, stop.py);
  const y = yOf(heightWorld(w.x, w.z)) + (stop.heightM || 14);
  const v = new THREE.Vector3(w.x, y, w.z);
  v.project(camera);
  const inView = v.z < 1 && v.z > -1 && Math.abs(v.x) < 0.92 && Math.abs(v.y) < 0.92;
  return { ndcX: v.x, ndcY: v.y, ndcZ: v.z, inView: inView };
}

function mostCenteredLandmarkIndex() {
  const stops = getTourStops();
  let best = -1, bestScore = 1e9;
  for (let i = 0; i < stops.length; i++) {
    const p = projectLandmark(stops[i]);
    if (!p || !p.inView) continue;
    const score = Math.hypot(p.ndcX, p.ndcY);
    if (score < bestScore) {
      bestScore = score;
      best = i;
    }
  }
  return best;
}

function onTourStop() {
  // Mid-glide or a hold on a tour stop (auto or button). After a free pan,
  // pauseTour clears holdCamera and we fall back to the most-centered stop.
  return !!(
    tour.manualTravel ||
    (tour.enabled && !tour.paused && (tour.phase === "travel" || tour.phase === "hold")) ||
    (tour.paused && tour.phase === "hold" && state.holdCamera)
  );
}

function displayedLandmarkIndex() {
  const stops = getTourStops();
  if (!stops.length) return 0;
  if (onTourStop()) {
    return ((tour.stop % stops.length) + stops.length) % stops.length;
  }
  const c = mostCenteredLandmarkIndex();
  if (c >= 0) return c;
  return 0;
}

function targetLandmarkIndex() {
  const stops = getTourStops();
  if (!stops.length) return 0;
  if (onTourStop()) {
    return (tour.stop + 1) % stops.length;
  }
  const c = mostCenteredLandmarkIndex();
  if (c >= 0) return (c + 1) % stops.length;
  return (tour.stop + 1) % stops.length;
}

function setLandmarkLabel(text, instant) {
  if (!landmarkNameWrap) return;
  const reduce = REDUCE || instant || (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  if (text === landmarkShown) return;
  const prev = landmarkShown;
  landmarkShown = text;
  const cur = landmarkNameWrap.querySelector(".lm-name.is-current");
  if (!cur) {
    const span = document.createElement("span");
    span.className = "lm-name is-current";
    span.textContent = text;
    landmarkNameWrap.appendChild(span);
    return;
  }
  if (reduce || !prev) {
    cur.textContent = text;
    cur.className = "lm-name is-current";
    const extras = landmarkNameWrap.querySelectorAll(".lm-name:not(.is-current)");
    for (let i = 0; i < extras.length; i++) extras[i].remove();
    return;
  }
  cur.classList.remove("is-current");
  cur.classList.add("is-out");
  const incoming = document.createElement("span");
  incoming.className = "lm-name is-current";
  incoming.textContent = text;
  landmarkNameWrap.appendChild(incoming);
  setTimeout(function () {
    if (cur.parentNode) cur.parentNode.removeChild(cur);
  }, 320);
}

function updateLandmarkButton() {
  if (!landmarkBtn) return;
  const stops = getTourStops();
  if (!stops.length) return;
  const shown = displayedLandmarkIndex();
  const next = targetLandmarkIndex();
  setLandmarkLabel(stopLabel(stops[shown]), false);
  landmarkBtn.setAttribute("aria-label", "Next landmark: " + stopLabel(stops[next]));
  const moving = !!(tour.manualTravel || (tour.enabled && !tour.paused && tour.phase === "travel"));
  landmarkBtn.classList.toggle("is-moving", moving);
}

function goToLandmark(index) {
  const stops = getTourStops();
  if (!stops.length) return;
  const i = ((index % stops.length) + stops.length) % stops.length;
  tour.stop = i;
  tour.lastInput = performance.now();
  tour.paused = true;
  if (REDUCE) {
    applyTourCam(tourCameraAt(stops[i]));
    tour.phase = "hold";
    tour.manualTravel = false;
    setLandmarkLabel(stopLabel(stops[i]), true);
    if (glOk) renderer.render(scene, camera);
    updateLandmarkButton();
    return;
  }
  beginTourLeg(currentTourCam(), stops[i], "button");
  tour.manualTravel = true;
  tour.paused = true;
  setLandmarkLabel(stopLabel(stops[i]), false);
  updateLandmarkButton();
}

function onLandmarkButton(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  goToLandmark(targetLandmarkIndex());
}

function bindLandmarkButton() {
  landmarkBtn = document.getElementById("landmark-btn");
  if (!landmarkBtn) return;
  landmarkNameWrap = landmarkBtn.querySelector(".lm-names");
  landmarkBtn.addEventListener("pointerdown", function (e) { e.stopPropagation(); });
  landmarkBtn.addEventListener("click", onLandmarkButton);
  landmarkBtn.addEventListener("keydown", function (e) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onLandmarkButton(e);
    }
  });
  const stops = getTourStops();
  if (stops.length) {
    landmarkShown = "";
    setLandmarkLabel(stopLabel(stops[displayedLandmarkIndex()]), true);
  }
  updateLandmarkButton();
}

function tourArcCam(a, b, e) {
  const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
  const dist = Math.hypot(dx, dy, dz);
  // Long legs rise and bow so the camera flies an arc over the valley
  // instead of cutting a straight chord through the hills. Short hops stay flat.
  const lift = Math.min(420, Math.max(0, (dist - 600) * 0.045));
  const bow = Math.min(1800, Math.max(0, (dist - 2500) * 0.12));
  const hz = Math.hypot(dx, dz) || 1;
  const mx = (a.x + b.x) * 0.5 + (-dz / hz) * bow;
  const mz = (a.z + b.z) * 0.5 + (dx / hz) * bow;
  let my = Math.max(a.y, b.y) + lift;
  const ground = yOf(heightWorld(mx, mz));
  if (my < ground + 40) my = ground + 40 + lift * 0.25;
  const o = 1 - e;
  const cam = {
    x: o * o * a.x + 2 * o * e * mx + e * e * b.x,
    y: o * o * a.y + 2 * o * e * my + e * e * b.y,
    z: o * o * a.z + 2 * o * e * mz + e * e * b.z,
    heading: lerpAngle(a.heading, b.heading, e),
    pitch: a.pitch + (b.pitch - a.pitch) * e
  };
  const gy = yOf(heightWorld(cam.x, cam.z));
  if (cam.y < gy + 24) cam.y = gy + 24;
  return cam;
}

function advanceTourLeg(dt, now) {
  tour.t += dt;
  const u = Math.max(0, Math.min(1, tour.t / Math.max(0.01, tour.duration)));
  const e = easeInOutCubic(u);
  const a = tour.from, b = tour.to;
  const cam = tourArcCam(a, b, e);
  applyTourCam(cam);
  if (u >= 1) {
    tour.phase = "hold";
    tour.holdUntil = now + 4000;
    tour.manualTravel = false;
    tour.lastInput = now;
    applyTourCam(b);
  }
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
  // Fog, rain, and snow are world-space meshes. Do not paint them here;
  // a screen overlay would slide with pan.
  // Night-sky cartouche, same paper-and-ink plate language as #caption / login-sky.
  if (night > 0.3) {
    const x = W * 0.045, y = H * 0.055, w = 216, h = 78;
    ctx.save();
    ctx.fillStyle = "rgba(18, 20, 28, 0.48)";
    ctx.strokeStyle = "rgba(237, 230, 214, 0.55)";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "rgba(237, 230, 214, 0.28)";
    ctx.lineWidth = 0.8;
    ctx.strokeRect(x + 4, y + 4, w - 8, h - 8);
    ctx.fillStyle = "rgba(237,230,214,0.92)";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.font = 'italic 17px "IM Fell English", Palatino, serif';
    ctx.fillText("The Night Sky", x + 14, y + 10);
    ctx.font = 'italic 12px "IM Fell English", Palatino, serif';
    ctx.fillStyle = "rgba(237,230,214,0.8)";
    ctx.fillText("over Jasper, Indiana", x + 14, y + 32);
    ctx.font = '11px "IM Fell English SC", "IM Fell English", Palatino, serif';
    ctx.letterSpacing = "0.08em";
    ctx.fillText("38°23′ N    86°56′ W", x + 14, y + 52);
    ctx.restore();
  }
  // Screen-space drops removed; rain shafts and snow live in world space.

  stepLightning(now);
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
  const mid = 0.16 + (cursor.active && cursor.sy < targetHorizon() ? 0.06 : 0);
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
  [skyGroup, windowPts, firePts, cloudMesh, volCloudGroup, labelMesh, snowPts, rainMesh, rainLens, fogGroup].forEach(function (o) {
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
  const lm = document.getElementById("landmark-btn");
  if (lm) lm.hidden = true;
}

/* ---------- loop ---------- */
function setCommonUniforms(t) {
  const cur = new THREE.Vector3(cursor.x, cursor.strength, cursor.z);
  state.wind = wx.kind === "storm" ? 2.4 : wx.kind === "rain" ? 1.5 : 1;
  function applyStrike(unifs) {
    if (!unifs) return;
    if (unifs.uLightning) unifs.uLightning.value = state.lightning;
    if (unifs.uStrikeAmt) unifs.uStrikeAmt.value = strike.amt || 0;
    if (unifs.uStrikeRad) unifs.uStrikeRad.value = strike.rad || 1600;
    if (unifs.uStrikePos) unifs.uStrikePos.value.set(strike.pos.x, strike.pos.y, strike.pos.z);
    if (unifs.uStrikeOrigin && strike.origin) {
      unifs.uStrikeOrigin.value.set(strike.origin.x, strike.origin.y, strike.origin.z);
    }
  }
  if (terrainMat) {
    terrainMat.uniforms.uTime.value = t;
    terrainMat.uniforms.uCursor.value.copy(cur);
    applyStrike(terrainMat.uniforms);
  }
  if (treeMat) {
    treeMat.uniforms.uTime.value = t;
    treeMat.uniforms.uCursor.value.copy(cur);
    treeMat.uniforms.uWind.value = state.wind;
    applyStrike(treeMat.uniforms);
    if (frameTreeMat) {
      frameTreeMat.uniforms.uTime.value = t;
      frameTreeMat.uniforms.uWind.value = state.wind;
    }
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
  if (riverRibbon && riverRibbon.material && riverRibbon.material.uniforms) {
    const ru = riverRibbon.material.uniforms;
    if (ru.uTime) ru.uTime.value = t;
    if (ru.uWind) ru.uWind.value = state.wind;
    if (ru.uStorm) ru.uStorm.value = wx.kind === "storm" ? 1 : 0;
    if (ru.uNight) ru.uNight.value = clock.night;
    if (ru.uRain) ru.uRain.value = (wx.kind === "rain" || wx.kind === "storm") ? 1 : 0;
    if (ru.uMoonDir && clock) ru.uMoonDir.value.copy(altAzDir(clock.moonAlt, clock.moonAz));
    applyStrike(ru);
  }
  if (riverBanks && riverBanks.material && riverBanks.material.uniforms) {
    const bu = riverBanks.material.uniforms;
    if (bu.uStorm) bu.uStorm.value = wx.kind === "storm" ? 1 : 0;
    if (bu.uNight) bu.uNight.value = clock.night;
    applyStrike(bu);
  }
  for (let ci = 0; ci < volCloudItems.length; ci++) {
    const cm = volCloudItems[ci].mesh && volCloudItems[ci].mesh.material;
    if (cm && cm.uniforms) applyStrike(cm.uniforms);
  }
  if (rainMesh && rainMesh.material && rainMesh.material.uniforms) applyStrike(rainMesh.material.uniforms);
  if (rainLens && rainLens.material && rainLens.material.uniforms) applyStrike(rainLens.material.uniforms);
  if (strike.visible) setBoltAmt(strike.amt || 0);
  for (let i = 0; i < washMats.length; i++) {
    if (clock && washMats[i].uniforms.uSunDir) {
      washMats[i].uniforms.uSunDir.value.copy(altAzDir(clock.alt, clock.sunAz));
    }
    if (clock && washMats[i].uniforms.uMoonDir) {
      washMats[i].uniforms.uMoonDir.value.copy(altAzDir(clock.moonAlt, clock.moonAz));
    }
  }
}


function lerpAngle(a, b, t) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function riverPathPoint(i) {
  const rp = riverPathPx[i];
  if (!rp) return null;
  if (Array.isArray(rp)) return { px: rp[0], py: rp[1] };
  if (rp.px != null) return { px: rp.px, py: rp.py };
  return null;
}

let tourFarmAnchor = null;

function placeTourFarmstead() {
  if (!landmarkGroup) return;
  const hero = pxToWorld(HERO.px, HERO.py);
  const ch = (meta && meta.landmarks && meta.landmarks.jasper_st_joseph) || [168.49, 429.67];
  const church = pxToWorld(ch[0], ch[1]);
  const lx = church.x - hero.x, lz = church.z - hero.z;
  const len = Math.hypot(lx, lz) || 1;
  const ux = lx / len, uz = lz / len;
  const rx = uz, rz = -ux;
  let found = null;
  const millW = pxToWorld(185.5, 458.6);
  const alongs = [1500, 1680, 1360, 1840, 1200, 2000];
  const sides = [720, 820, 620, 920, -720, -840, 520, -560];
  for (let a = 0; a < alongs.length && !found; a++) {
    for (let s = 0; s < sides.length; s++) {
      const x = hero.x + ux * alongs[a] + rx * sides[s];
      const z = hero.z + uz * alongs[a] + rz * sides[s];
      if (Math.hypot(x - church.x, z - church.z) < 700) continue;
      if (Math.hypot(x - millW.x, z - millW.z) < 650) continue;
      let ok = true;
      const pads = [[0, 0], [22, 0], [-18, 14], [20, 18], [-12, -16], [10, 26], [-24, 8], [30, -12]];
      for (let i = 0; i < pads.length; i++) {
        const c = coverWorld(x + pads[i][0], z + pads[i][1]);
        if (c === 0 || c === 3 || c === 4) { ok = false; break; }
      }
      if (!ok) continue;
      found = { x: x, z: z };
      break;
    }
  }
  if (!found) {
    found = { x: hero.x + ux * 1600 + rx * 780, z: hero.z + uz * 1600 + rz * 780 };
  }
  const yaw = Math.atan2(ux, uz) + 0.55;
  function tag(obj) {
    obj.userData = obj.userData || {};
    obj.userData.tourFarm = true;
    landmarkGroup.add(obj);
  }
  const house = placeholderFarmhouse();
  house.scale.setScalar(1.05);
  placeOnGround(house, found.x, found.z, yaw);
  tag(house);
  const bx = found.x + Math.sin(yaw + 1.15) * 26;
  const bz = found.z + Math.cos(yaw + 1.15) * 26;
  const barn = placeholderBarn();
  barn.scale.setScalar(1.25);
  placeOnGround(barn, bx, bz, yaw + 0.04);
  tag(barn);
  const sx = bx + Math.sin(yaw - 0.95) * 16;
  const sz = bz + Math.cos(yaw - 0.95) * 16;
  const silo = placeholderSilo();
  silo.scale.setScalar(1.05);
  placeOnGround(silo, sx, sz, yaw);
  tag(silo);
  const rng = mulberry(421);
  const toHero = Math.atan2(hero.x - bx, hero.z - bz);
  for (let hi = 0; hi < 5; hi++) {
    const along = (hi - 2) * 5.2;
    const out = 16 + (hi % 2) * 5.5;
    const hx = bx + Math.sin(toHero) * out + Math.cos(toHero) * along;
    const hz = bz + Math.cos(toHero) * out - Math.sin(toHero) * along;
    const cls = coverWorld(hx, hz);
    if (cls === 0 || cls === 3) continue;
    const hay = placeholderHay();
    hay.scale.setScalar(1.55);
    placeOnGround(hay, hx, hz, rng() * 6.28);
    tag(hay);
  }
  tourFarmAnchor = worldToPx(bx, bz);
}

function findFarmsteadPx() {
  if (tourFarmAnchor) return { px: tourFarmAnchor.px, py: tourFarmAnchor.py };
  if (!landmarkGroup) return { px: 200, py: 470 };
  const spots = [];
  landmarkGroup.traverse(function (o) {
    if (o.name === "barn" || o.name === "farmhouse" || o.name === "silo" || o.name === "haybale") {
      const p = worldToPx(o.position.x, o.position.z);
      spots.push({ name: o.name, px: p.px, py: p.py, x: o.position.x, z: o.position.z });
    }
  });
  const hero = pxToWorld(HERO.px, HERO.py);
  const church = (meta && meta.landmarks && meta.landmarks.jasper_st_joseph) || [168.49, 429.67];
  const cw = pxToWorld(church[0], church[1]);
  const lx = cw.x - hero.x, lz = cw.z - hero.z;
  const llen = Math.hypot(lx, lz) || 1;
  let best = null, bestScore = 1e9;
  for (let i = 0; i < spots.length; i++) {
    if (spots[i].name !== "barn" && spots[i].name !== "farmhouse") continue;
    let nBarn = 0, nSilo = 0, nHay = 0;
    for (let j = 0; j < spots.length; j++) {
      if (i === j) continue;
      if (Math.hypot(spots[i].x - spots[j].x, spots[i].z - spots[j].z) >= 80) continue;
      if (spots[j].name === "barn" || spots[j].name === "farmhouse") nBarn++;
      if (spots[j].name === "silo") nSilo++;
      if (spots[j].name === "haybale") nHay++;
    }
    const cluster = nBarn + nSilo + nHay;
    if (cluster < 1) continue;
    const dHero = Math.hypot(spots[i].x - hero.x, spots[i].z - hero.z);
    if (dHero < 1500 || dHero > 5200) continue;
    const along = ((spots[i].x - hero.x) * lx + (spots[i].z - hero.z) * lz) / llen;
    const side = Math.abs((spots[i].x - hero.x) * (lz / llen) - (spots[i].z - hero.z) * (lx / llen));
    const score = Math.abs(dHero - 2600) + side * 0.15 + (along < 0 ? 800 : 0) - cluster * 40;
    if (score < bestScore) { bestScore = score; best = spots[i]; }
  }
  return best || (spots[0] ? spots[0] : { px: 200, py: 470 });
}

function findRiverTourPx() {
  const hero = pxToWorld(HERO.px, HERO.py);
  const ch = (meta && meta.landmarks && meta.landmarks.jasper_st_joseph) || [168.49, 429.67];
  const church = pxToWorld(ch[0], ch[1]);
  const lx = church.x - hero.x, lz = church.z - hero.z;
  const llen = Math.hypot(lx, lz) || 1;
  let best = null, bestScore = 1e9;
  for (let i = 0; i < (riverPathPx || []).length; i++) {
    const rp = riverPathPoint(i);
    if (!rp) continue;
    const w = pxToWorld(rp.px, rp.py);
    const along = ((w.x - hero.x) * lx + (w.z - hero.z) * lz) / llen;
    if (along < 400 || along > 2400) continue;
    const side = Math.abs((w.x - hero.x) * (lz / llen) - (w.z - hero.z) * (lx / llen));
    const score = Math.abs(along - 1100) + side * 0.25;
    if (score < bestScore) { bestScore = score; best = rp; }
  }
  return best || { px: 190, py: 480 };
}

function pickApproach(target, hide, dist, eye) {
  if (!camera) return null;
  const tw = pxToWorld(target[0], target[1]);
  const hw = hide ? pxToWorld(hide[0], hide[1]) : null;
  const saved = camera.position.clone();
  const savedQ = camera.quaternion.clone();
  const pitch = applyFovAndPitch().pitch;
  const targetY = yOf(heightWorld(tw.x, tw.z)) + 8;
  let bestAng = null, bestScore = 1e9;
  for (let i = 0; i < 20; i++) {
    const ang = i * Math.PI * 2 / 20;
    const x = tw.x + Math.sin(ang) * dist;
    const z = tw.z + Math.cos(ang) * dist;
    if (coverWorld(x, z) === 0) continue;
    const y = yOf(heightWorld(x, z)) + eye;
    if (y < targetY - 18) continue;
    const heading = Math.atan2(tw.x - x, tw.z - z);
    camera.position.set(x, y, z);
    camera.lookAt(
      x + Math.sin(heading) * 1800 * Math.cos(pitch),
      y + Math.sin(pitch) * 1800,
      z + Math.cos(heading) * 1800 * Math.cos(pitch)
    );
    camera.updateMatrixWorld(true);
    const m = new THREE.Vector3(tw.x, targetY, tw.z).project(camera);
    if (!(m.z > 0 && m.z < 1) || Math.abs(m.x) > 0.62 || m.y > -0.08 || m.y < -0.82) continue;
    let score = Math.abs(m.x) * 0.5 + Math.abs(m.y + 0.48) * 1.0;
    if (hw) {
      const c = new THREE.Vector3(hw.x, yOf(heightWorld(hw.x, hw.z)) + 22, hw.z).project(camera);
      const inShot = c.z > 0 && c.z < 1 && Math.abs(c.x) < 0.95 && Math.abs(c.y) < 0.95;
      if (inShot) score += 10 + (1 - Math.min(1, Math.abs(c.x))) * 8;
    }
    if (score < bestScore) { bestScore = score; bestAng = ang; }
  }
  camera.position.copy(saved);
  camera.quaternion.copy(savedQ);
  camera.updateMatrixWorld(true);
  return bestAng;
}

function landmarkHeightM(kind, fallback) {
  let h = fallback;
  if (!landmarkGroup) return h;
  landmarkGroup.traverse(function (o) {
    if (o.name !== kind) return;
    const b = new THREE.Box3().setFromObject(o);
    const hh = b.max.y - b.min.y;
    if (hh > 1 && hh < 80) h = Math.max(h, hh);
  });
  return h;
}

function projectCorners(cx, y0, y1, half, camera) {
  const pts = [
    [cx.x - half, y0, cx.z - half], [cx.x + half, y0, cx.z - half],
    [cx.x - half, y0, cx.z + half], [cx.x + half, y0, cx.z + half],
    [cx.x - half, y1, cx.z - half], [cx.x + half, y1, cx.z - half],
    [cx.x - half, y1, cx.z + half], [cx.x + half, y1, cx.z + half]
  ];
  let minX = 1, maxX = -1, minY = 1, maxY = -1, any = false;
  for (let i = 0; i < pts.length; i++) {
    const p = new THREE.Vector3(pts[i][0], pts[i][1], pts[i][2]).project(camera);
    if (!(p.z > 0 && p.z < 1)) continue;
    any = true;
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  return { ok: any, minX: minX, maxX: maxX, minY: minY, maxY: maxY, hFrac: any ? (maxY - minY) / 2 : 0 };
}

function frameShortLandmark(target, hide, heightM, opts) {
  opts = opts || {};
  if (!camera) return { dist: opts.dist0 || 110, eye: opts.eye0 || 12, approach: null };
  const tw = pxToWorld(target[0], target[1]);
  const hw = hide ? pxToWorld(hide[0], hide[1]) : null;
  const saved = camera.position.clone();
  const savedQ = camera.quaternion.clone();
  const pitch = applyFovAndPitch().pitch;
  const baseY = yOf(heightWorld(tw.x, tw.z));
  const topY = baseY + heightM;
  // Footprint half-width so eaves and porches count in the projected height.
  const half = Math.max(6, heightM * 0.45);
  let best = { dist: opts.dist0 || 110, eye: opts.eye0 || 12, approach: null, score: 1e9 };
  let bestAny = null;
  const dists = opts.dists || [80, 90, 100, 110, 122, 136, 150, 170];
  const eyes = opts.eyes || [8, 10, 12, 14, 16];
  const hMin = opts.hMin != null ? opts.hMin : 0.06;
  const hMax = opts.hMax != null ? opts.hMax : 0.18;
  const hTarget = opts.hTarget != null ? opts.hTarget : 0.11;
  const midTarget = opts.midY != null ? opts.midY : -0.62;
  const nAng = opts.nAng || 16;
  for (let di = 0; di < dists.length; di++) {
    const dist = dists[di];
    for (let ei = 0; ei < eyes.length; ei++) {
      const eye = eyes[ei];
      for (let i = 0; i < nAng; i++) {
        const ang = i * Math.PI * 2 / nAng;
        const x = tw.x + Math.sin(ang) * dist;
        const z = tw.z + Math.cos(ang) * dist;
        if (coverWorld(x, z) === 0) continue;
        const y = yOf(heightWorld(x, z)) + eye;
        if (y < topY - 8) continue;
        const heading = Math.atan2(tw.x - x, tw.z - z);
        camera.position.set(x, y, z);
        camera.lookAt(
          x + Math.sin(heading) * 1800 * Math.cos(pitch),
          y + Math.sin(pitch) * 1800,
          z + Math.cos(heading) * 1800 * Math.cos(pitch)
        );
        camera.updateMatrixWorld(true);
        const box = projectCorners(tw, baseY, topY, half, camera);
        if (!box.ok) continue;
        if (Math.abs(box.minX) > 0.85 && Math.abs(box.maxX) > 0.85) continue;
        if (box.minY < -0.98 || box.maxY > -0.12) continue;
        const hFrac = box.hFrac;
        const midY = (box.minY + box.maxY) * 0.5;
        let score = Math.abs(hFrac - hTarget) * 12 + Math.abs(midY - midTarget) * 0.9;
        // Prefer a longer, higher view so a near bank does not lift the ridge above 65%.
        if (opts.dists) score += Math.max(0, 200 - dist) * 0.012 + Math.max(0, 18 - eye) * 0.08;
        let hideSteals = false;
        if (hw) {
          const c = new THREE.Vector3(hw.x, yOf(heightWorld(hw.x, hw.z)) + 22, hw.z).project(camera);
          const hideBehind = !(c.z > 0 && c.z < 1);
          if (hideBehind) {
            score -= 1.5;
          } else {
            const inShot = Math.abs(c.x) < 0.96 && c.y < 0.20 && c.y > -0.92;
            if (inShot) {
              score += 6 + (1 - Math.min(1, Math.abs(c.x))) * 10;
              // Only drop the candidate when a neighbor sits in the same lower-third slot.
              if (Math.abs(c.x) < 0.35 && c.y < -0.15 && c.y > -0.85) hideSteals = true;
            }
          }
        }
        if (!bestAny || score < bestAny.score) {
          bestAny = { dist: dist, eye: eye, approach: ang, score: score, hFrac: hFrac };
        }
        if (hideSteals || hFrac > hMax || hFrac < hMin) continue;
        if (score < best.score) {
          best = { dist: dist, eye: eye, approach: ang, score: score, hFrac: hFrac };
        }
      }
    }
  }
  camera.position.copy(saved);
  camera.quaternion.copy(savedQ);
  camera.updateMatrixWorld(true);
  if (best.approach != null) return best;
  return bestAny || best;
}

let tourStopsCache = null;

function sitePx(key, fallback) {
  if (meta && meta.landmarks && meta.landmarks[key]) return meta.landmarks[key];
  const s = LANDMARK_SITES[key];
  if (s) return [s.px, s.py];
  return fallback;
}

function frameNamed(name, target, hide, heightM, dists, eyes, dist0, eye0) {
  const fr = frameShortLandmark(target, hide, heightM, {
    dists: dists,
    eyes: eyes,
    dist0: dist0,
    eye0: eye0,
    hMin: 0.06,
    hMax: 0.18,
    hTarget: 0.11,
    midY: -0.62,
    nAng: 16
  });
  console.info("[frame]", name, "dist", fr.dist, "eye", fr.eye, "approach", fr.approach, "hFrac", fr.hFrac, "score", fr.score);
  return fr;
}

function getTourStops() {
  if (tourStopsCache && tourStopsCache.length) return tourStopsCache;
  const church = sitePx("jasper_st_joseph", [168.49, 429.67]);
  const court = sitePx("jasper_courthouse", [174.34, 444.64]);
  const mill = sitePx("jasper_city_mill", [185.5, 458.6]);
  const depot = sitePx("jasper_depot", [180.5, 456.2]);
  const farm = findFarmsteadPx();
  const river = findRiverTourPx();
  const hall = sitePx("huntingburg_town_hall", [136.08, 795.64]);
  const stadium = sitePx("league_stadium", [170.18, 809.34]);
  const monastery = sitePx("ferdinand_monastery", [449.75, 1024.74]);
  const abbey = sitePx("saint_meinrad_archabbey", [577.98, 1214.64]);
  const churchH = landmarkHeightM("church", 36);
  const courtH = landmarkHeightM("courthouse", 28);
  const millH = landmarkHeightM("mill", 14);
  const depotH = landmarkHeightM("depot", 8);
  const hallH = landmarkHeightM("townhall", 16);
  const stadH = landmarkHeightM("stadium", 18);
  const monH = landmarkHeightM("monastery", 40);
  const abbH = landmarkHeightM("archabbey", 40);
  const churchD = [1000, 1200, 1400, 1600, 1800];
  const churchE = [40, 52, 64];
  const courtD = [280, 360, 450, 560, 700];
  const courtE = [24, 36, 48];
  const millD = [180, 240, 320, 420];
  const millE = [18, 28, 40];
  const depotD = [120, 180, 240, 320];
  const depotE = [16, 24, 36];
  const farmD = [180, 260, 360, 480];
  const farmE = [16, 26, 38];
  const hallD = [220, 320, 420, 560];
  const hallE = [20, 30, 42];
  const stadD = [500, 700, 950, 1200];
  const stadE = [28, 40, 56];
  const abbD = [700, 1000, 1300, 1600];
  const abbE = [40, 56, 72];
  const churchFr = frameNamed("church", church, court, churchH, churchD, churchE, 1400, 52);
  const courtFr = frameNamed("courthouse", court, church, courtH, courtD, courtE, 400, 36);
  const millFr = frameNamed("mill", mill, church, millH, millD, millE, 280, 28);
  const depotFr = frameNamed("depot", depot, church, depotH, depotD, depotE, 200, 24);
  const farmFr = frameNamed("farmstead", [farm.px, farm.py], church, 12, farmD, farmE, 280, 26);
  const hallFr = frameNamed("townhall", hall, stadium, hallH, hallD, hallE, 360, 30);
  const stadFr = frameNamed("stadium", stadium, hall, stadH, stadD, stadE, 800, 40);
  const monFr = frameNamed("monastery", monastery, null, monH, abbD, abbE, 1200, 56);
  const abbFr = frameNamed("archabbey", abbey, null, abbH, abbD, abbE, 1200, 56);
  tourStopsCache = [
    { name: "church", px: church[0], py: church[1], dist: churchFr.dist, eye: churchFr.eye, approach: churchFr.approach, heightM: churchH },
    { name: "courthouse", px: court[0], py: court[1], dist: courtFr.dist, eye: courtFr.eye, approach: courtFr.approach, heightM: courtH },
    { name: "mill", px: mill[0], py: mill[1], dist: millFr.dist, eye: millFr.eye, approach: millFr.approach, heightM: millH },
    { name: "depot", px: depot[0], py: depot[1], dist: depotFr.dist, eye: depotFr.eye, approach: depotFr.approach, heightM: depotH },
    { name: "river", px: river.px, py: river.py, dist: 900, eye: 52 },
    { name: "farmstead", px: farm.px, py: farm.py, dist: farmFr.dist, eye: farmFr.eye, approach: farmFr.approach, heightM: 12 },
    { name: "townhall", px: hall[0], py: hall[1], dist: hallFr.dist, eye: hallFr.eye, approach: hallFr.approach, heightM: hallH },
    { name: "stadium", px: stadium[0], py: stadium[1], dist: stadFr.dist, eye: stadFr.eye, approach: stadFr.approach, heightM: stadH },
    { name: "monastery", px: monastery[0], py: monastery[1], dist: monFr.dist, eye: monFr.eye, approach: monFr.approach, heightM: monH },
    { name: "archabbey", px: abbey[0], py: abbey[1], dist: abbFr.dist, eye: abbFr.eye, approach: abbFr.approach, heightM: abbH }
  ];
  return tourStopsCache;
}

function invalidateTourStops() {
  tourStopsCache = null;
}

function tourCameraAt(stop) {
  const w = pxToWorld(stop.px, stop.py);
  const hero = pxToWorld(HERO.px, HERO.py);
  const d = stop.dist || 240;
  let x, z;
  if (stop.approach != null && isFinite(stop.approach)) {
    x = w.x + Math.sin(stop.approach) * d;
    z = w.z + Math.cos(stop.approach) * d;
  } else {
    let bx = hero.x - w.x, bz = hero.z - w.z;
    const bl = Math.hypot(bx, bz) || 1;
    bx /= bl; bz /= bl;
    x = w.x + bx * d;
    z = w.z + bz * d;
  }
  const y = yOf(heightWorld(x, z)) + (stop.eye || 46);
  const heading = Math.atan2(w.x - x, w.z - z);
  // Always keep Dimitry's sky-up pitch so land stays in the bottom third to sixth.
  const pitch = (stop.pitch != null) ? stop.pitch : applyFovAndPitch().pitch;
  return { x: x, y: y, z: z, heading: heading, pitch: pitch };
}

function currentTourCam() {
  if (!camera) return null;
  const look = new THREE.Vector3();
  camera.getWorldDirection(look);
  const pitch = Math.asin(Math.max(-1, Math.min(1, look.y)));
  return {
    x: camera.position.x, y: camera.position.y, z: camera.position.z,
    heading: Math.atan2(look.x, look.z),
    pitch: pitch
  };
}

function applyTourCam(cam) {
  if (!camera || !cam) return;
  state.holdCamera = true;
  const aim = applyFovAndPitch();
  const pitch = cam.pitch != null ? cam.pitch : aim.pitch;
  camera.position.set(cam.x, cam.y, cam.z);
  const look = 1800;
  camera.lookAt(
    cam.x + Math.sin(cam.heading) * look * Math.cos(pitch),
    cam.y + Math.sin(pitch) * look,
    cam.z + Math.cos(cam.heading) * look * Math.cos(pitch)
  );
  layoutHeldCamera();
}

function beginTourLeg(fromCam, toStop, kind) {
  tour.from = fromCam;
  tour.to = tourCameraAt(toStop);
  const dx = tour.to.x - tour.from.x, dy = tour.to.y - tour.from.y, dz = tour.to.z - tour.from.z;
  const dist = Math.hypot(dx, dy, dz);
  // Test hook only: setTourPace still overrides. Production no longer uses
  // the 1 m/s walking pace, which made legs last 3 to 22 minutes and look stuck.
  if (tour.pace && tour.pace !== 1) {
    const minDur = (tour.minDuration > 0) ? tour.minDuration : 4;
    tour.duration = Math.max(minDur, dist / tour.pace);
  } else {
    // Button and auto: 3 s on short hops, up to 6 s on the longest legs,
    // eased at both ends by easeInOutCubic.
    const t = clamp(dist / 18000, 0, 1);
    tour.duration = 3 + t * 3;
  }
  tour.t = 0;
  tour.phase = "travel";
}

function pauseTour() {
  tour.paused = true;
  tour.lastInput = performance.now();
  if (camera) {
    const look = new THREE.Vector3();
    camera.getWorldDirection(look);
    const head = Math.atan2(look.x, look.z);
    let bestS = rig.s, bestD = 1e9;
    if (path && path.len) {
      for (let s = 0; s <= path.len; s += 30) {
        const sm = pathSample(s);
        const d = Math.hypot(sm.x - camera.position.x, sm.z - camera.position.z);
        if (d < bestD) { bestD = d; bestS = s; }
      }
      rig.s = bestS;
      const sm = pathSample(rig.s);
      const baseLookX = (sm.lookX != null) ? sm.lookX : 0;
      const baseLookZ = (sm.lookZ != null) ? sm.lookZ : 1;
      const base = Math.atan2(baseLookX, baseLookZ);
      rig.headingOff = head - base;
      const dx = camera.position.x - sm.x, dz = camera.position.z - sm.z;
      rig.fwd = dx * Math.sin(head) + dz * Math.cos(head);
      rig.eye = Math.max(20, camera.position.y - yOf(heightWorld(camera.position.x, camera.position.z)));
    }
  }
  state.holdCamera = false;
}

function resumeTour(now) {
  tour.paused = false;
  tour.hasRun = true;
  state.holdCamera = true;
  const stops = getTourStops();
  const from = currentTourCam();
  beginTourLeg(from, stops[tour.stop % stops.length], "auto");
}

function stepTour(dt, now) {
  if (state.frozen) return;
  if (tour.manualTravel && tour.phase === "travel" && !REDUCE) {
    advanceTourLeg(dt, now);
    return;
  }
  if (!tour.enabled || REDUCE) return;
  if (tour.paused) {
    const idle = tour.hasRun ? 10000 : 2000;
    if (tour.lastInput && now - tour.lastInput > idle) resumeTour(now);
    return;
  }
  const stops = getTourStops();
  if (tour.phase === "hold") {
    if (now >= tour.holdUntil) {
      tour.stop = (tour.stop + 1) % stops.length;
      beginTourLeg(currentTourCam(), stops[tour.stop]);
    } else {
      applyTourCam(tourCameraAt(stops[tour.stop % stops.length]));
    }
    return;
  }
  advanceTourLeg(dt, now);
}

function pickConifer(preferIsolated, distTarget) {
  const hero = pxToWorld(HERO.px, HERO.py);
  let best = null, bestScore = 1e9;
  for (let i = 0; i < treeRecords.length; i++) {
    const r = treeRecords[i];
    if (r.spec !== "cedar" && r.spec !== "pine") continue;
    const d = Math.hypot((r.x || 0) - hero.x, (r.z || 0) - hero.z);
    if (d < 200 || d > 1200) continue;
    let neighbors = 0, coniferN = 0;
    for (let j = 0; j < treeRecords.length; j++) {
      if (j === i) continue;
      const o = treeRecords[j];
      const dd = Math.hypot((o.x || 0) - r.x, (o.z || 0) - r.z);
      if (dd < 36) neighbors++;
      if (dd < 48 && (o.spec === "cedar" || o.spec === "pine")) coniferN++;
    }
    if (!preferIsolated && coniferN < 2) continue;
    if (preferIsolated && neighbors > 0) continue;
    const open = (r.cls === 1 || r.cls === 2 || r.cls === 6 || r.cls === 7) ? -40 : 0;
    const score = Math.abs(d - distTarget) + (preferIsolated ? neighbors * 120 + open : -coniferN * 12);
    if (score < bestScore) { bestScore = score; best = r; }
  }
  if (preferIsolated && !best) {
    for (let i = 0; i < treeRecords.length; i++) {
      const r = treeRecords[i];
      if (r.spec !== "cedar" && r.spec !== "pine") continue;
      const d = Math.hypot((r.x || 0) - hero.x, (r.z || 0) - hero.z);
      if (d < 200 || d > 1200) continue;
      let neighbors = 0;
      for (let j = 0; j < treeRecords.length; j++) {
        if (j === i) continue;
        const o = treeRecords[j];
        const dd = Math.hypot((o.x || 0) - r.x, (o.z || 0) - r.z);
        if (dd < 36) neighbors++;
      }
      const score = Math.abs(d - distTarget) + neighbors * 120;
      if (score < bestScore) { bestScore = score; best = r; }
    }
  }
  if (!best) {
    for (let i = 0; i < treeRecords.length; i++) {
      if (treeRecords[i].spec === "cedar" || treeRecords[i].spec === "pine") { best = treeRecords[i]; break; }
    }
  }
  return best;
}

function treesInFront(tx, tz, camX, camZ, dist) {
  let n = 0;
  for (let i = 0; i < treeRecords.length; i++) {
    const o = treeRecords[i];
    const dx = (o.x || 0) - camX, dz = (o.z || 0) - camZ;
    const along = dx * (tx - camX) + dz * (tz - camZ);
    const span = dist * dist;
    if (along <= 0 || along >= span) continue;
    const side2 = (dx * dx + dz * dz) - (along * along) / span;
    if (side2 < 16 * 16) n++;
  }
  return n;
}

function lookConifers() {
  if (!camera || !glOk) return null;
  if (treeMesh && treeMesh.material && treeMesh.material.uniforms && treeMesh.material.uniforms.uCrownCap) {
    treeMesh.material.uniforms.uCrownCap.value = 0.55;
  }
  const hero = pxToWorld(HERO.px, HERO.py);
  const pitch = applyFovAndPitch().pitch;
  const saved = camera.position.clone();
  const savedQ = camera.quaternion.clone();
  let pick = null, bestScore = 1e9;
  const dists = [40, 48, 56, 64];
  for (let i = 0; i < treeRecords.length; i++) {
    const r = treeRecords[i];
    if (r.spec !== "cedar" && r.spec !== "pine") continue;
    const dHero = Math.hypot((r.x || 0) - hero.x, (r.z || 0) - hero.z);
    if (dHero < 200 || dHero > 1400) continue;
    let neighbors = 0;
    for (let j = 0; j < treeRecords.length; j++) {
      if (j === i) continue;
      const dd = Math.hypot((treeRecords[j].x || 0) - r.x, (treeRecords[j].z || 0) - r.z);
      if (dd < 40) neighbors++;
    }
    const p = worldToPx(r.x, r.z);
    const baseY = r.y || yOf(heightWorld(r.x, r.z));
    const topY = baseY + 11;
    for (let di = 0; di < dists.length; di++) {
      const dist = dists[di];
      for (let k = 0; k < 16; k++) {
        const ang = k * Math.PI * 2 / 16;
        const x = r.x + Math.sin(ang) * dist;
        const z = r.z + Math.cos(ang) * dist;
        if (coverWorld(x, z) === 0) continue;
        const blocked = treesInFront(r.x, r.z, x, z, dist);
        const eye = 10;
        const y = yOf(heightWorld(x, z)) + eye;
        const heading = Math.atan2(r.x - x, r.z - z);
        camera.position.set(x, y, z);
        camera.lookAt(
          x + Math.sin(heading) * 1800 * Math.cos(pitch),
          y + Math.sin(pitch) * 1800,
          z + Math.cos(heading) * 1800 * Math.cos(pitch)
        );
        camera.updateMatrixWorld(true);
        const b = new THREE.Vector3(r.x, baseY, r.z).project(camera);
        const tpt = new THREE.Vector3(r.x, topY, r.z).project(camera);
        if (!(b.z > 0 && b.z < 1) || Math.abs(b.x) > 0.55 || b.y < -0.96 || tpt.y > 0.05) continue;
        const hFrac = Math.max(0, (tpt.y - b.y) / 2);
        const score = Math.abs(hFrac - 0.28) * 6 + Math.abs(b.x) * 0.5 + neighbors * 18 + blocked * 28 + Math.abs(dHero - 600) * 0.01;
        if (score < bestScore) {
          bestScore = score;
          pick = { r: r, p: p, dist: dist, eye: eye, approach: ang, heading: heading, blocked: blocked, neighbors: neighbors, hFrac: hFrac };
        }
      }
    }
  }
  camera.position.copy(saved);
  camera.quaternion.copy(savedQ);
  camera.updateMatrixWorld(true);
  if (!pick) {
    const fallback = pickConifer(true, 560);
    if (!fallback) return null;
    pick = { r: fallback, p: worldToPx(fallback.x, fallback.z), dist: 48, eye: 10, approach: null };
  }
  const cam = tourCameraAt({ px: pick.p.px, py: pick.p.py, dist: pick.dist, eye: pick.eye, approach: pick.approach });
  applyTourCam(cam);
  if (glOk) renderer.render(scene, camera);
  return {
    spec: pick.r.spec, px: pick.p.px, py: pick.p.py,
    dist: Math.hypot(pick.r.x - hero.x, pick.r.z - hero.z),
    view: "close", camDist: pick.dist, neighbors: pick.neighbors, hFrac: pick.hFrac
  };
}

function lookConiferStand() {
  if (!camera || !glOk) return null;
  const best = pickConifer(false, 640);
  if (!best) return null;
  if (treeMesh && treeMesh.material && treeMesh.material.uniforms && treeMesh.material.uniforms.uCrownCap) {
    treeMesh.material.uniforms.uCrownCap.value = 0.16;
  }
  const p = worldToPx(best.x, best.z);
  const hero = pxToWorld(HERO.px, HERO.py);
  const cam = tourCameraAt({ px: p.px, py: p.py, dist: 200, eye: 46 });
  applyTourCam(cam);
  if (glOk) renderer.render(scene, camera);
  return { spec: best.spec, px: p.px, py: p.py, dist: Math.hypot(best.x - hero.x, best.z - hero.z), view: "stand" };
}

function startLoop() {
  function tick(now) {
    const dt = state.lastT ? clamp((now - state.lastT) / 1000, 0, 0.08) : 0.016;
    state.lastT = now;
    if (!state.frozen && !REDUCE) {
      if (tour.enabled || tour.manualTravel) {
        stepTour(dt, now);
      } else {
        rig.s += 18 * dt;
        if (rig.s > path.len) rig.s = 0;
      }
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
    const pix = Math.min(2, window.devicePixelRatio || 1);
    if (starPts && starPts.material && starPts.material.uniforms && starPts.material.uniforms.uPixel) {
      starPts.material.uniforms.uPixel.value = pix;
    }
    if (snowPts && snowPts.material && snowPts.material.uniforms && snowPts.material.uniforms.uPixel) {
      snowPts.material.uniforms.uPixel.value = pix;
    }
    if (clock.night > 0.15 && starPts) placeStars();
    setCommonUniforms(state.frozen || REDUCE ? state.time : state.time);
    if (!state.frozen && !REDUCE) blinkFireflies(now);
    constBrighten();
    if (glOk) renderer.render(scene, camera);
    drawWxOverlay(now, dt);
    updateLandmarkButton();
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
    setPathT: function (t) { state.holdCamera = false; rig.s = clamp(t, 0, 1) * path.len; placeCamera(); if (glOk) renderer.render(scene, camera); },
    probeConsts: function () {
      const d = jd2000(skyNow());
      const R = 8800;
      const out = [];
      const heading = (function () {
        const look = new THREE.Vector3();
        camera.getWorldDirection(look);
        return Math.atan2(look.x, look.z);
      })();
      if (SKY_CAT && SKY_CAT.c && camera) {
        for (let i = 0; i < SKY_CAT.c.length; i++) {
          const C = SKY_CAT.c[i];
          if (C.n !== "Cygnus" && C.n !== "Draco" && C.n !== "Ursa Minor" && C.n !== "Ursa Major") continue;
          const cen = constCenterRaDec(C);
          const hit = dirFromRaDec(cen[0], cen[1], d);
          const world = hit.dir.clone().multiplyScalar(R);
          if (skyGroup) world.add(skyGroup.position);
          world.project(camera);
          const compass = compassFromDir(hit.dir);
          out.push({
            n: C.n, ra: +cen[0].toFixed(2), dec: +cen[1].toFixed(2),
            alt: +hit.alt.toFixed(2), compass: +compass.toFixed(1),
            ndc: [+world.x.toFixed(3), +world.y.toFixed(3), +world.z.toFixed(3)],
            inFrame: Math.abs(world.x) < 0.88 && Math.abs(world.y) < 0.88 && world.z < 1 && world.z > -1
          });
        }
      }
      return { heading: heading, headingDeg: heading * 180 / Math.PI, cygnus: window.__cygnusProbe || null, list: out };
    },
    panWorld: function (rightM, alongM) {
      if (!camera || !glOk) return null;
      state.holdCamera = true;
      const fwd = new THREE.Vector3();
      camera.getWorldDirection(fwd);
      fwd.y = 0;
      if (fwd.lengthSq() < 1e-8) fwd.set(0, 0, 1);
      fwd.normalize();
      const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
      const x = camera.position.x + right.x * (rightM || 0) + fwd.x * (alongM || 0);
      const z = camera.position.z + right.z * (rightM || 0) + fwd.z * (alongM || 0);
      const y = yOf(heightWorld(x, z)) + (rig.eye || 48);
      camera.position.set(x, y, z);
      lookHorizonAz(Math.atan2(fwd.x, fwd.z));
      return { x: x, y: y, z: z, heading: Math.atan2(fwd.x, fwd.z) };
    },
    setCursor: function (nx, ny) {
      cursor.sx = nx; cursor.sy = ny;
      const g = pointerToGround(nx * canvas.clientWidth, ny * canvas.clientHeight);
      if (g) { cursor.tx = g.x; cursor.tz = g.z; cursor.ts = 1; cursor.active = true; cursor.x = g.x; cursor.z = g.z; cursor.strength = 1; }
    },
    measure: measureGroundShare,
    dbg: function () {
      return {
        river: !!(riverRibbon),
        riverVis: !!(riverRibbon && riverRibbon.visible),
        riverVerts: riverRibbon && riverRibbon.geometry ? riverRibbon.geometry.attributes.position.count : 0,
        ridges: ridgeGroup ? ridgeGroup.children.length : 0,
        pathN: (riverPathPx || []).length,
        clouds: volCloudItems.length,
        banks: !!(riverBanks),
        zoom: rig.zoom,
        stars: SKY_CAT ? SKY_CAT.s.length : 0,
        constellations: SKY_CAT ? SKY_CAT.c.length : 0,
        wx: wx.kind,
        windMs: wx.windMs,
        windFromDeg: wx.windFromDeg,
        cloudHomes: volCloudItems.slice(0, 8).map(function (it) {
          return { x: +it.homeX.toFixed(1), y: +it.homeY.toFixed(1), z: +it.homeZ.toFixed(1), sx: it.sx, sy: it.sy };
        }),
        grassScreen: (function () {
          if (!grassMesh || !camera) return null;
          const pos = grassMesh._pos;
          if (!pos) return { n: grassMesh.count, noPos: true };
          const v = new THREE.Vector3();
          let vis = 0, minY = 1, maxY = -1, minX=9, maxX=-9, minZ=9, maxZ=-9;
          const n = Math.min(grassMesh.count, 800);
          const samples = [];
          const cx = camera.position.x, cz = camera.position.z;
          let minAlong=1e9, maxAlong=-1e9;
          for (let i = 0; i < n; i++) {
            v.set(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
            const along = Math.hypot(v.x-cx, v.z-cz);
            if (along < minAlong) minAlong = along;
            if (along > maxAlong) maxAlong = along;
            v.project(camera);
            if (v.x < minX) minX = v.x;
            if (v.x > maxX) maxX = v.x;
            if (v.y < minY) minY = v.y;
            if (v.y > maxY) maxY = v.y;
            if (v.z < minZ) minZ = v.z;
            if (v.z > maxZ) maxZ = v.z;
            if (Math.abs(v.x) < 1 && Math.abs(v.y) < 1 && v.z < 1 && v.z > -1) vis++;
            if (i < 5) samples.push({ x:+pos[i*3].toFixed(1), y:+pos[i*3+1].toFixed(1), z:+pos[i*3+2].toFixed(1), ndc:[+v.x.toFixed(2),+v.y.toFixed(2),+v.z.toFixed(2)] });
          }
          return { n: grassMesh.count, sampled: n, vis: vis,
            ndcX: [+minX.toFixed(2), +maxX.toFixed(2)],
            ndcY: [+minY.toFixed(2), +maxY.toFixed(2)],
            ndcZ: [+minZ.toFixed(2), +maxZ.toFixed(2)],
            along: [+minAlong.toFixed(1), +maxAlong.toFixed(1)],
            cam: [+cx.toFixed(1), +camera.position.y.toFixed(1), +cz.toFixed(1)],
            samples };
        })(),
        riverScreen: (function () {
          if (!riverRibbon || !camera) return null;
          const pos = riverRibbon.geometry.attributes.position;
          const v = new THREE.Vector3();
          let n = 0, vis = 0, minY = 1, maxY = -1, minX = 1, maxX = -1;
          for (let i = 0; i < pos.count; i++) {
            v.fromBufferAttribute(pos, i).project(camera);
            n++;
            if (v.z < 1 && v.z > -1 && Math.abs(v.x) < 1.4 && Math.abs(v.y) < 1.4) {
              vis++;
              if (v.y < minY) minY = v.y;
              if (v.y > maxY) maxY = v.y;
              if (v.x < minX) minX = v.x;
              if (v.x > maxX) maxX = v.x;
            }
          }
          return { n: n, vis: vis, ndcY: [+minY.toFixed(3), +maxY.toFixed(3)], ndcX: [+minX.toFixed(3), +maxX.toFixed(3)] };
        })()
      };
    },
    stats: function () {
      const f = frameStats();
      f.veg = { trees: VEG.treesPlaced, blades: VEG.blades, clumps: VEG.clumps, lodNear: LOD_NEAR, lodMid: LOD_MID };
      f.land = { church: LAND.church, farmhouse: LAND.farmhouse, barn: LAND.barn, silo: LAND.silo, hay: LAND.hay, mill: LAND.mill, depot: LAND.depot, fromGltf: LAND.fromGltf };
      return f;
    },
    state: function () { return { season: clock.season, period: clock.period, wx: wx.kind, at: clock.now, s: rig.s, pathLen: path.len, night: clock.night, alt: clock.alt, reduce: REDUCE, veg: { trees: VEG.treesPlaced, blades: VEG.blades, clumps: VEG.clumps }, land: { church: LAND.church, farmhouse: LAND.farmhouse, barn: LAND.barn, silo: LAND.silo, hay: LAND.hay, mill: LAND.mill, depot: LAND.depot, fromGltf: LAND.fromGltf } }; },
    _applyWx: function () { buildVolClouds(); buildSnow(); buildRain(); buildFogBank(); applySkin(); layoutVolClouds(); layoutSnow(); layoutRain(); layoutFogBank(); if (glOk) renderer.render(scene, camera); },
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
    },
    setZoom: function (z) { applyZoom(z); placeCamera(); if (glOk) renderer.render(scene, camera); },
    applyDolly: function (d) { const f = applyDolly(d); if (glOk) renderer.render(scene, camera); return f; },
    dollyInfo: function () {
      const look = new THREE.Vector3();
      if (camera) camera.getWorldDirection(look);
      return {
        fwd: rig.fwd || 0, eye: rig.eye,
        pos: camera ? [camera.position.x, camera.position.y, camera.position.z] : null,
        heading: camera ? Math.atan2(look.x, look.z) : 0
      };
    },
    tourStops: function () { return getTourStops(); },
    forceStrike: forceStrike,
    lightningInfo: function () {
      return {
        amt: strike.amt,
        kind: strike.kind,
        nextAt: strike.nextAt,
        t0: strike.t0,
        flashTimes: strike.flashTimes.slice(),
        nFlashes: strike.nFlashes,
        flashes: strike.flashes,
        visible: strike.visible,
        forced: strike.forced,
        reduce: REDUCE,
        pos: strike.pos,
        rad: strike.rad
      };
    },
    testLightningCap: testLightningCap,
    goToLandmark: goToLandmark,
    setTourPace: function (mps, minDur) {
      tour.pace = (mps > 0) ? mps : 1;
      if (minDur != null && minDur > 0) tour.minDuration = minDur;
      return { pace: tour.pace, minDuration: tour.minDuration || 4 };
    },
    landmarkView: function () {
      const stops = getTourStops();
      const shown = displayedLandmarkIndex();
      const next = targetLandmarkIndex();
      const projections = stops.map(function (s, i) {
        const p = projectLandmark(s);
        return {
          i: i,
          name: s.name,
          label: stopLabel(s),
          inView: !!(p && p.inView),
          ndcX: p ? +p.ndcX.toFixed(3) : null,
          ndcY: p ? +p.ndcY.toFixed(3) : null
        };
      });
      return {
        shown: shown,
        next: next,
        shownLabel: stops[shown] ? stopLabel(stops[shown]) : null,
        nextLabel: stops[next] ? stopLabel(stops[next]) : null,
        mostCentered: mostCenteredLandmarkIndex(),
        projections: projections
      };
    },
    tourState: function () { return { enabled: tour.enabled, paused: tour.paused, stop: tour.stop, phase: tour.phase, lastInput: tour.lastInput, manualTravel: !!tour.manualTravel, duration: tour.duration, t: tour.t }; },
    tourGoto: function (i) {
      const stops = getTourStops();
      const stop = stops[((i % stops.length) + stops.length) % stops.length];
      tour.stop = ((i % stops.length) + stops.length) % stops.length;
      tour.paused = true;
      tour.enabled = false;
      const cam = tourCameraAt(stop);
      applyTourCam(cam);
      tour.manualTravel = false;
      tour.phase = "hold";
      setLandmarkLabel(stopLabel(stop), true);
      updateLandmarkButton();
      if (glOk) renderer.render(scene, camera);
      return { stop: stop, cam: cam };
    },
    lookConifers: function () { return lookConifers(); },
    lookConiferStand: function () { return lookConiferStand(); },
    lookAwaySun: function () {
      const dir = altAzDir(clock.alt, clock.sunAz);
      lookHorizonAz(Math.atan2(-dir.x, -dir.z));
      return sunInfo();
    },
    lookClose: function (px, py, dist, zoom) { lookClose(px, py, dist, zoom); },
    lookMoon: function () { return lookMoon(); },
    lookSun: function () { return lookSun(); },
    lookOcclusion: function () { return lookOcclusion(); },
    moon: function () { return moonInfo(); },
    sun: function () { return sunInfo(); },
    probeFlip: function () {
      const look = new THREE.Vector3();
      camera.getWorldDirection(look);
      const heading = Math.atan2(look.x, look.z);
      function ndcOf(vec) {
        const v = vec.clone();
        v.project(camera);
        return [+v.x.toFixed(3), +v.y.toFixed(3), +v.z.toFixed(3)];
      }
      const fwd = look.clone(); fwd.y = 0;
      if (fwd.lengthSq() < 1e-8) fwd.set(0, 0, 1);
      fwd.normalize();
      const ahead = camera.position.clone().add(fwd.multiplyScalar(2500));
      ahead.y = camera.position.y;
      const east = ahead.clone().add(new THREE.Vector3(800, 0, 0));
      const west = ahead.clone().add(new THREE.Vector3(-800, 0, 0));
      const eastNdc = ndcOf(east);
      const westNdc = ndcOf(west);
      let churchNdc = null;
      if (churchMesh) {
        const p = new THREE.Vector3();
        churchMesh.getWorldPosition(p);
        churchNdc = ndcOf(p);
      }
      return {
        heading: heading,
        headingDeg: heading * 180 / Math.PI,
        headingCompass: compassFromDir(look),
        eastNdc: eastNdc,
        westNdc: westNdc,
        churchNdc: churchNdc,
        screen: (eastNdc[0] > westNdc[0]) ? "east-on-right" : "east-on-left",
        sun: sunInfo()
      };
    }
  };
}

function lookClose(px, py, dist, zoom) {
  if (!camera || !glOk) return;
  state.holdCamera = true;
  const w = pxToWorld(px, py);
  const hero = pxToWorld(HERO.px, HERO.py);
  let bx = hero.x - w.x, bz = hero.z - w.z;
  const bl = Math.hypot(bx, bz) || 1;
  bx /= bl; bz /= bl;
  const d = (dist == null ? 240 : dist);
  const x = w.x + bx * d;
  const z = w.z + bz * d;
  const eye = 34;
  const y = yOf(heightWorld(x, z)) + eye;
  const aspect = Math.max(0.3, canvas.clientWidth / Math.max(1, canvas.clientHeight));
  const baseFov = aspect < 0.7 ? 58 : aspect < 1.1 ? 54 : 48;
  if (zoom) rig.zoom = clamp(zoom, 0.85, 1.55);
  camera.aspect = aspect;
  camera.fov = clamp(baseFov / (rig.zoom || 1), 28, 68);
  camera.updateProjectionMatrix();
  camera.position.set(x, y, z);
  const ty = yOf(heightWorld(w.x, w.z)) + 6;
  camera.lookAt(w.x, ty, w.z);
  skyGroup.position.copy(camera.position);
  skyGroup.rotation.set(0, 0, 0);
  setMoonPos(); setSunPos();
  layoutRidgeLines();
  layoutRiverRibbon();
  layoutVolClouds();
  layoutFrameTrees();
  layoutSnow();
  layoutRain();
  layoutFogBank();
  fillGrass(x, z);
  if (glOk) renderer.render(scene, camera);
}

function layoutHeldCamera() {
  skyGroup.position.copy(camera.position);
  skyGroup.rotation.set(0, 0, 0);
  if (skyMat && skyMat.uniforms && skyMat.uniforms.uLookAz) {
    const look = new THREE.Vector3();
    camera.getWorldDirection(look);
    skyMat.uniforms.uLookAz.value = Math.atan2(look.x, look.z);
  }
  setMoonPos(); setSunPos();
  layoutRidgeLines();
  layoutRiverRibbon();
  layoutVolClouds();
  layoutFrameTrees();
  layoutSnow();
  layoutRain();
  layoutFogBank();
  if (starPts) placeStars();
}

function lookHorizonAz(azWorld) {
  if (!camera || !glOk) return;
  state.holdCamera = true;
  const aim = applyFovAndPitch();
  const x = camera.position.x, y = camera.position.y, z = camera.position.z;
  const look = 1800;
  const pitch = aim.pitch;
  camera.lookAt(
    x + Math.sin(azWorld) * look * Math.cos(pitch),
    y + Math.sin(pitch) * look,
    z + Math.cos(azWorld) * look * Math.cos(pitch)
  );
  layoutHeldCamera();
  if (glOk) renderer.render(scene, camera);
}

function lookMoon() {
  const dir = altAzDir(clock.moonAlt, clock.moonAz);
  lookHorizonAz(Math.atan2(dir.x, dir.z));
  return moonInfo();
}

function lookOcclusion() {
  const d = jd2000(skyNow());
  let pick = null;
  if (SKY_CAT && SKY_CAT.c) {
    for (let i = 0; i < SKY_CAT.c.length; i++) {
      if (SKY_CAT.c[i].n === "Ursa Major") { pick = SKY_CAT.c[i]; break; }
    }
  }
  if (pick && pick.c) {
    const hit = dirFromRaDec(pick.c[0], pick.c[1], d);
    lookHorizonAz(Math.atan2(hit.dir.x, hit.dir.z));
    return { name: pick.n, alt: hit.alt, az: hit.az, compass: compassFromDir(hit.dir) };
  }
  return null;
}

function moonInfo() {
  const p = clock.phase;
  const illum = (1 - Math.cos(2 * Math.PI * p)) / 2;
  const dir = altAzDir(clock.moonAlt, clock.moonAz);
  const compass = compassFromDir(dir);
  const trueSun = sunAltAz(clock.now, loc);
  const sunDir = altAzDir(trueSun[0], trueSun[1]);
  const elong = Math.acos(Math.max(-1, Math.min(1, sunDir.dot(dir)))) * 180 / Math.PI;
  // Visible lit fraction of a sphere: (1 - dot(sunDir, moonDir)) / 2
  const discLit = (1 - sunDir.dot(dir)) / 2;
  let viewSunX = null;
  if (camera) {
    const vs = sunDir.clone().transformDirection(camera.matrixWorldInverse);
    viewSunX = +vs.x.toFixed(3);
  }
  return {
    at: clock.now,
    alt: clock.moonAlt,
    azEngine: clock.moonAz,
    azCompass: compass,
    phase: p,
    illumination: illum,
    discLit: discLit,
    elong: elong,
    trueSunAlt: trueSun[0],
    trueSunCompass: compassFromDir(sunDir),
    viewSunX: viewSunX,
    visible: clock.moonAlt > -4,
    night: clock.night,
    period: clock.period,
    sunAlt: clock.alt
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
  tour.enabled = qs.get("tour") !== "0" && !qs.has("pathT") && qs.get("freeze") !== "1" && !REDUCE;
  tour.paused = true;
  tour.lastInput = performance.now();
  refreshClock(parseTime());
  if (!glOk) {
    showFallback();
    expose();
    return;
  }
  heightTex = makeHeightTex();
  coverTex = makeCoverTex();
  await Promise.all([loadSkyCat(), ensureSkyFont()]);
  buildTerrain();
  buildSky();
  buildClouds();
  buildVolClouds();
  buildSnow();
  buildRain();
  buildFogBank();
  scatterTrees();
  buildGrass();
  buildTown();
  applySkin();
  await swapInGltfModels();
  bindInput();
  bindLandmarkButton();
  placeCamera();
  fillGrass(camera.position.x, camera.position.z);
  if (dbgStrike === "bolt" || dbgStrike === "cloud") {
    wx.kind = wx.kind === "storm" ? wx.kind : (dbgWx === "storm" ? "storm" : wx.kind);
    if (wx.kind === "storm") forceStrike(dbgStrike, 0);
  }
  renderer.render(scene, camera);
  drawWxOverlay(performance.now(), 0);
  updateLandmarkButton();
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
