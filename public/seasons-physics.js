// Seasons, Eclipses & Celestial Geometry: pure physics (no DOM).
// One shared model of the Sun, Earth and Moon. Every view reads it.
//
// Reused code:
// - shadowCone, umbraRadiusAt, penumbraRadiusAt, classifySolarEclipse and
//   classifyLunarEclipse are ported unchanged in behavior from the inline
//   script in study-eclipses.html (tests compare them against that file).
// - illuminatedFraction and phaseName follow study-moon.html and
//   study-tides.html (tests compare them too).
// Sources for the low-precision Sun and Moon series: Meeus, Astronomical
// Algorithms (2nd ed.), ch. 25 and 47, truncated to the largest terms.
// Every simplification is listed in docs/seasons-eclipses-science.md.

export const DEG = Math.PI / 180;
export const REAL = {
  sunRadius: 696000, earthRadius: 6371, moonRadius: 1737,
  au: 149597871, earthMoonMean: 384400, inclinationDeg: 5.145
};
export const SYNODIC_DAYS = 29.530589;
export const DRACONIC_DAYS = 27.212221;
export const ECLIPSE_YEAR_DAYS = 346.62;
export const NODE_PERIOD_YEARS = 18.61;
export const PRECESSION_YEARS = 25772;
export const PRECESSION_YEARS_ROUNDED = 25800;
export const TROPICAL_YEAR = 365.2422;
export const TILT_NOW = 23.44;
export const SOLAR_CONSTANT = 1361;   // W/m^2 at 1 AU
export const SUNRISE_ALT = -0.833;    // deg: refraction + solar semi-diameter
export const BASE_YEAR = 2026;
// Days from J2000.0 (2000 Jan 1 12:00 TT) to 2026 Jan 1 00:00.
export const N_2026 = 9496.5;

export const norm360 = (d) => ((d % 360) + 360) % 360;
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const sin = (d) => Math.sin(d * DEG), cos = (d) => Math.cos(d * DEG);
const asinD = (x) => Math.asin(clamp(x, -1, 1)) / DEG;
const acosD = (x) => Math.acos(clamp(x, -1, 1)) / DEG;

// ---------- calendar ----------
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MDAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
/** t = days since 2026 Jan 1 00:00 (2026 is not a leap year). */
export function dateParts(t) {
  let d = Math.floor(norm365(t));
  let m = 0; while (d >= MDAYS[m]) { d -= MDAYS[m]; m++; }
  const hours = (t - Math.floor(t)) * 24;
  return { month: m, day: d + 1, hours, label: `${MONTHS[m]} ${d + 1}` };
}
function norm365(t) { return ((t % 365) + 365) % 365; }
export function dayOfYear(month, day) { let n = 0; for (let i = 0; i < month; i++) n += MDAYS[i]; return n + day - 1; }
export function fmtClock(hours) {
  if (!isFinite(hours)) return "none";
  const m = Math.round(norm24(hours) * 60);
  const h = Math.floor(m / 60) % 24, mm = m % 60;
  return String(h).padStart(2, "0") + ":" + String(mm).padStart(2, "0");
}
function norm24(h) { return ((h % 24) + 24) % 24; }

// ---------- Sun (Meeus ch. 25, low precision) ----------
/** Geocentric Sun at time t: ecliptic longitude (deg, of date) and distance (AU). */
export function sunAt(t) {
  const n = N_2026 + t;
  const L = norm360(280.46646 + 0.98564736 * n);
  const M = norm360(357.52911 + 0.98560028 * n);
  const e = 0.016708634;
  const C = (1.914602) * sin(M) + 0.019993 * sin(2 * M) + 0.000289 * sin(3 * M);
  const lon = norm360(L + C);
  const nu = M + C;
  const R = 1.000001018 * (1 - e * e) / (1 + e * cos(nu));
  return { lon, R, M };
}
/** Solar declination for a given Earth axial tilt (deg). sin(dec) = sin(tilt) sin(lon). */
export function declination(lonDeg, tiltDeg) { return asinD(sin(tiltDeg) * sin(lonDeg)); }
export function subsolarLatitude(t, tiltDeg) { return declination(sunAt(t).lon, tiltDeg); }

/** Sun's right ascension (deg) for a given tilt. */
export function rightAscension(lonDeg, latDeg, tiltDeg) {
  const y = sin(lonDeg) * cos(tiltDeg) - Math.tan(latDeg * DEG) * sin(tiltDeg);
  return norm360(Math.atan2(y, cos(lonDeg)) / DEG);
}
export function eclipticToEquatorial(lonDeg, latDeg, tiltDeg) {
  const dec = asinD(sin(latDeg) * cos(tiltDeg) + cos(latDeg) * sin(tiltDeg) * sin(lonDeg));
  return { ra: rightAscension(lonDeg, latDeg, tiltDeg), dec };
}

// ---------- observer geometry ----------
/** Altitude and azimuth (deg, azimuth from north through east) for hour angle H (deg). */
export function altAz(latDeg, decDeg, hourAngleDeg) {
  const alt = asinD(sin(latDeg) * sin(decDeg) + cos(latDeg) * cos(decDeg) * cos(hourAngleDeg));
  const y = -cos(decDeg) * sin(hourAngleDeg);
  const x = sin(decDeg) * cos(latDeg) - cos(decDeg) * sin(latDeg) * cos(hourAngleDeg);
  const az = norm360(Math.atan2(y, x) / DEG);
  return { alt, az };
}
/** Noon altitude of the Sun (deg). Above 90 would mean the Sun passes north, so fold. */
export function noonAltitude(latDeg, decDeg) { return 90 - Math.abs(latDeg - decDeg); }
/** Half-day arc H0 (deg) for altitude h0. Returns 0 (polar night) or 180 (midnight Sun) when clamped. */
export function halfDayArc(latDeg, decDeg, h0 = SUNRISE_ALT) {
  const den = cos(latDeg) * cos(decDeg);
  if (Math.abs(den) < 1e-12) return (sin(latDeg) * sin(decDeg) > sin(h0)) ? 180 : 0;
  const c = (sin(h0) - sin(latDeg) * sin(decDeg)) / den;
  if (c <= -1) return 180;
  if (c >= 1) return 0;
  return acosD(c);
}
/** Daylight length in hours: Sun's upper edge above the horizon with standard refraction. */
export function dayLength(latDeg, decDeg) { return 2 * halfDayArc(latDeg, decDeg) / 15; }
/** Sunrise and sunset in local solar time (hours), or null when the Sun never sets or rises. */
export function sunriseSunset(latDeg, decDeg) {
  const H = halfDayArc(latDeg, decDeg);
  if (H <= 0) return { rise: null, set: null, kind: "polar night" };
  if (H >= 180) return { rise: null, set: null, kind: "midnight sun" };
  return { rise: 12 - H / 15, set: 12 + H / 15, kind: "normal", riseAz: altAz(latDeg, decDeg, -H).az, setAz: altAz(latDeg, decDeg, H).az };
}
/** Sunlight on a horizontal square meter at noon, above the air (W/m^2). */
export function noonFlux(latDeg, decDeg, R = 1) {
  return Math.max(0, SOLAR_CONSTANT / (R * R) * sin(Math.max(0, noonAltitude(latDeg, decDeg))));
}
/** Same beam, spread over 1/sin(alt) times more ground. */
export function spreadFactor(altDeg) { return altDeg <= 0 ? Infinity : 1 / sin(altDeg); }
/** 24 hour average sunlight on a horizontal square meter at the top of the air (W/m^2). */
export function dailyInsolation(latDeg, decDeg, R = 1) {
  const H0 = halfDayArc(latDeg, decDeg, 0) * DEG;
  const q = (H0 * sin(latDeg) * sin(decDeg) + cos(latDeg) * cos(decDeg) * Math.sin(H0)) / Math.PI;
  return Math.max(0, SOLAR_CONSTANT / (R * R) * q);
}
export function seasonName(t, tiltDeg, hemisphere = "N") {
  if (tiltDeg < 0.5) return "no seasons";
  const lon = sunAt(t).lon;
  const north = ["spring", "summer", "autumn", "winter"][Math.floor(lon / 90) % 4];
  if (hemisphere === "N") return north;
  return { spring: "autumn", summer: "winter", autumn: "spring", winter: "summer" }[north];
}

// ---------- Moon (Meeus ch. 47, largest terms) ----------
/** Geocentric Moon: ecliptic longitude, latitude (deg) and distance (km).
 *  inclinationDeg rescales the latitude so students can flatten or steepen the orbit. */
export function moonAt(t, inclinationDeg = REAL.inclinationDeg) {
  const n = N_2026 + t;
  const T = n / 36525;
  const Lp = norm360(218.3164477 + 481267.88123421 * T);
  const D = norm360(297.8501921 + 445267.1114034 * T);
  const M = norm360(357.5291092 + 35999.0502909 * T);
  const Mp = norm360(134.9633964 + 477198.8675055 * T);
  const F = norm360(93.272095 + 483202.0175233 * T);
  const lon = norm360(Lp + 6.288774 * sin(Mp) + 1.274027 * sin(2 * D - Mp) + 0.658314 * sin(2 * D)
    + 0.213618 * sin(2 * Mp) - 0.185116 * sin(M) - 0.114332 * sin(2 * F) + 0.058793 * sin(2 * D - 2 * Mp)
    + 0.057066 * sin(2 * D - M - Mp) + 0.053322 * sin(2 * D + Mp) + 0.045758 * sin(2 * D - M));
  const latReal = 5.128122 * sin(F) + 0.280602 * sin(Mp + F) + 0.277693 * sin(Mp - F) + 0.173237 * sin(2 * D - F)
    + 0.055413 * sin(2 * D - Mp + F) + 0.046271 * sin(2 * D - Mp - F);
  const dist = 385000.56 - 20905.355 * cos(Mp) - 3699.111 * cos(2 * D - Mp) - 2955.968 * cos(2 * D) - 569.925 * cos(2 * Mp);
  const node = norm360(125.0445479 - 1934.1362891 * T);
  return { lon, lat: latReal * inclinationDeg / REAL.inclinationDeg, dist, node, F };
}
/** Sun-Earth-Moon elongation measured eastward from the Sun (deg): 0 new, 180 full. Same angle study-moon.html calls theta. */
export function moonPhaseAngle(t) { return norm360(moonAt(t).lon - sunAt(t).lon); }
/** Illuminated fraction, (1 - cos theta)/2, as in study-moon.html. */
export function illuminatedFraction(thetaDeg) { return (1 - Math.cos(norm360(thetaDeg) * DEG)) / 2; }
const PHASES = ["New Moon", "Waxing Crescent", "First Quarter", "Waxing Gibbous", "Full Moon", "Waning Gibbous", "Last Quarter", "Waning Crescent"];
export function phaseName(thetaDeg) { return PHASES[Math.floor(norm360(thetaDeg + 22.5) / 45) % 8]; }
export function moonAge(t) { return moonPhaseAngle(t) / 360 * SYNODIC_DAYS; }

// ---------- 3D positions (heliocentric ecliptic, km; z = ecliptic north) ----------
const vec = (x, y, z) => ({ x, y, z });
const vSub = (a, b) => vec(a.x - b.x, a.y - b.y, a.z - b.z);
const vLen = (a) => Math.hypot(a.x, a.y, a.z);
const vDot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
const vNeg = (a) => vec(-a.x, -a.y, -a.z);
function angleBetween(a, b) { return Math.acos(clamp(vDot(a, b) / ((vLen(a) || 1) * (vLen(b) || 1)), -1, 1)); }
function sph(lonDeg, latDeg, r) { return vec(r * cos(latDeg) * cos(lonDeg), r * cos(latDeg) * sin(lonDeg), r * sin(latDeg)); }

export function geometryAt(t, opts = {}) {
  const inc = opts.inclinationDeg ?? REAL.inclinationDeg;
  const s = sunAt(t), m = moonAt(t, inc);
  const dEM = opts.moonDistanceKm ?? m.dist;
  const earthPos = sph(s.lon + 180, 0, s.R * REAL.au);
  const moonPos = (() => { const r = sph(m.lon, m.lat, dEM); return vec(earthPos.x + r.x, earthPos.y + r.y, earthPos.z + r.z); })();
  return {
    sunRadius: REAL.sunRadius, earthRadius: REAL.earthRadius, moonRadius: REAL.moonRadius,
    earthSunDistance: s.R * REAL.au, earthMoonDistance: dEM,
    sunPos: vec(0, 0, 0), earthPos, moonPos, sun: s, moon: m
  };
}

// ---------- shadow cones (ported from study-eclipses.html) ----------
export function shadowCone(rLight, rOcc, lightOccluderDistance) {
  return { tanUmbra: (rLight - rOcc) / lightOccluderDistance, tanPenumbra: (rLight + rOcc) / lightOccluderDistance };
}
export function umbraRadiusAt(cone, rOcc, x) { return rOcc - x * cone.tanUmbra; }
export function penumbraRadiusAt(cone, rOcc, x) { return rOcc + x * cone.tanPenumbra; }
export function umbraLength(rLight, rOcc, d) { return rOcc * d / (rLight - rOcc); }

export function classifySolarEclipse(p) {
  const sunMoonDistance = vLen(vSub(p.sunPos, p.moonPos));
  const cone = shadowCone(p.sunRadius, p.moonRadius, sunMoonDistance);
  const distMoonToEarth = p.earthMoonDistance;
  const rUmbraAtEarth = umbraRadiusAt(cone, p.moonRadius, distMoonToEarth);
  const rPenumbraAtEarth = penumbraRadiusAt(cone, p.moonRadius, distMoonToEarth);
  const sunFromMoon = vSub(p.sunPos, p.moonPos);
  const earthFromMoon = vSub(p.earthPos, p.moonPos);
  const deltaFromAxis = angleBetween(earthFromMoon, vNeg(sunFromMoon));
  const earthOffsetFromAxis = distMoonToEarth * Math.sin(deltaFromAxis);
  let type = "none";
  if (deltaFromAxis < Math.PI / 2) {
    const apexDistance = cone.tanUmbra !== 0 ? (p.moonRadius / cone.tanUmbra) : Infinity;
    const hybridBand = p.earthRadius;
    if (Math.abs(apexDistance - distMoonToEarth) <= hybridBand && earthOffsetFromAxis < Math.abs(rUmbraAtEarth) + p.earthRadius) type = "hybrid";
    else if (rUmbraAtEarth > 0 && earthOffsetFromAxis < rUmbraAtEarth + p.earthRadius) type = "total";
    else if (rUmbraAtEarth <= 0 && earthOffsetFromAxis < -rUmbraAtEarth + p.earthRadius) type = "annular";
    if (type === "none" && earthOffsetFromAxis < rPenumbraAtEarth + p.earthRadius) type = "partial";
  }
  return { type, earthOffsetFromAxisKm: earthOffsetFromAxis, umbraRadiusAtEarthKm: rUmbraAtEarth, penumbraRadiusAtEarthKm: rPenumbraAtEarth, deltaFromAxisDeg: deltaFromAxis / DEG };
}
export function classifyLunarEclipse(p) {
  const cone = shadowCone(p.sunRadius, p.earthRadius, p.earthSunDistance);
  const distEarthToMoon = p.earthMoonDistance;
  const rUmbraAtMoon = umbraRadiusAt(cone, p.earthRadius, distEarthToMoon);
  const rPenumbraAtMoon = penumbraRadiusAt(cone, p.earthRadius, distEarthToMoon);
  const sunFromEarth = vSub(p.sunPos, p.earthPos);
  const moonFromEarth = vSub(p.moonPos, p.earthPos);
  const deltaFromAntiSun = angleBetween(moonFromEarth, vNeg(sunFromEarth));
  const impactParam = distEarthToMoon * Math.sin(deltaFromAntiSun);
  let type = "none";
  if (deltaFromAntiSun < Math.PI / 2) {
    if (impactParam + p.moonRadius <= rUmbraAtMoon) type = "total";
    else if (impactParam < rUmbraAtMoon + p.moonRadius) type = "partial";
    else if (impactParam < rPenumbraAtMoon + p.moonRadius) type = "penumbral";
  }
  return { type, impactParamKm: impactParam, umbraRadiusAtMoonKm: rUmbraAtMoon, penumbraRadiusAtMoonKm: rPenumbraAtMoon, deltaFromAntiSunDeg: deltaFromAntiSun / DEG };
}
export const SOLAR_LABELS = { total: "Total solar eclipse", annular: "Annular solar eclipse", hybrid: "Hybrid solar eclipse", partial: "Partial solar eclipse", none: "No solar eclipse" };
export const LUNAR_LABELS = { total: "Total lunar eclipse", partial: "Partial lunar eclipse", penumbral: "Penumbral lunar eclipse", none: "No lunar eclipse" };

/** Both classifications at time t. */
export function eclipseState(t, opts = {}) {
  const g = geometryAt(t, opts);
  return { g, solar: classifySolarEclipse(g), lunar: classifyLunarEclipse(g) };
}

/** Time of the nearest new (target 0) or full (180) Moon to t, by Newton steps on the elongation. */
export function nearestSyzygy(t, target) {
  let x = t;
  for (let i = 0; i < 8; i++) {
    let d = norm360(moonPhaseAngle(x) - target); if (d > 180) d -= 360;
    x -= d / 360 * SYNODIC_DAYS * 0.98;
    if (Math.abs(d) < 1e-5) break;
  }
  return x;
}
/** Every new and full Moon between t0 and t1 with its eclipse type. */
export function syzygies(t0, t1, opts = {}) {
  const out = [];
  for (const target of [0, 180]) {
    let x = nearestSyzygy(t0, target);
    if (x < t0 - 0.5) x = nearestSyzygy(x + SYNODIC_DAYS, target);
    while (x <= t1) {
      if (x >= t0) {
        const e = eclipseState(x, opts);
        out.push({ t: x, kind: target === 0 ? "new" : "full", type: target === 0 ? e.solar.type : e.lunar.type, sunNode: sunNodeAngle(x) });
      }
      x = nearestSyzygy(x + SYNODIC_DAYS, target);
    }
  }
  return out.sort((a, b) => a.t - b.t);
}
/** Angular distance (deg, 0 to 90) from the Sun to the nearer node of the Moon's orbit. */
export function sunNodeAngle(t) {
  const d = norm360(sunAt(t).lon - moonAt(t).node) % 180;
  return d > 90 ? 180 - d : d;
}
/** Ecliptic limits from the cone geometry: Sun-node angle inside which an eclipse can happen at syzygy. */
export function eclipseLimits(inclinationDeg = REAL.inclinationDeg, dEM = REAL.earthMoonMean, dES = REAL.au) {
  const tp = (REAL.sunRadius + REAL.moonRadius) / dES;         // Moon's penumbra flare
  const rPenEarth = REAL.moonRadius + dEM * tp;
  const coneE = shadowCone(REAL.sunRadius, REAL.earthRadius, dES);
  const rUmbMoon = umbraRadiusAt(coneE, REAL.earthRadius, dEM);
  const rPenMoon = penumbraRadiusAt(coneE, REAL.earthRadius, dEM);
  const toNode = (offsetKm) => {
    const beta = Math.asin(clamp(offsetKm / dEM, -1, 1));
    const s = Math.sin(beta) / Math.sin(Math.max(1e-9, inclinationDeg * DEG));
    return s >= 1 ? 90 : Math.asin(s) / DEG;
  };
  return {
    solar: toNode(rPenEarth + REAL.earthRadius),
    lunarUmbral: toNode(rUmbMoon + REAL.moonRadius),
    lunarPenumbral: toNode(rPenMoon + REAL.moonRadius)
  };
}

// ---------- axial precession ----------
// Pole of the equator circles the ecliptic pole once per PRECESSION_YEARS,
// westward. At J2000 the north celestial pole sits at ecliptic longitude 90.
const STARS = [
  { name: "Polaris", ra: 37.954, dec: 89.264 },
  { name: "Vega", ra: 279.235, dec: 38.784 },
  { name: "Thuban", ra: 211.097, dec: 64.376 },
  { name: "Deneb", ra: 310.358, dec: 45.280 },
  { name: "Alderamin", ra: 319.645, dec: 62.585 },
  { name: "Kochab", ra: 222.676, dec: 74.155 }
];
const OBLIQ_J2000 = 23.4393;
function equToEcl(raDeg, decDeg, eps) {
  const lat = asinD(sin(decDeg) * cos(eps) - cos(decDeg) * sin(eps) * sin(raDeg));
  const lon = norm360(Math.atan2(sin(raDeg) * cos(eps) + Math.tan(decDeg * DEG) * sin(eps), cos(raDeg)) / DEG);
  return { lon, lat };
}
export const POLE_STARS = STARS.map((s) => ({ ...s, ...equToEcl(s.ra, s.dec, OBLIQ_J2000) }));
/** Pole direction in ecliptic coordinates for calendar year (AD, negative = BC) and tilt. */
export function poleAt(year, tiltDeg = OBLIQ_J2000) {
  return { lon: norm360(90 - 360 * (year - 2000) / PRECESSION_YEARS), lat: 90 - tiltDeg };
}
export function angularSeparation(a, b) {
  return acosD(sin(a.lat) * sin(b.lat) + cos(a.lat) * cos(b.lat) * cos(a.lon - b.lon));
}
export function nearestPoleStar(year, tiltDeg = OBLIQ_J2000) {
  const p = poleAt(year, tiltDeg);
  let best = null;
  for (const s of POLE_STARS) { const sep = angularSeparation(p, s); if (!best || sep < best.sep) best = { name: s.name, sep }; }
  return best;
}
export function precessionAngle(year) { return norm360(-360 * (year - 2000) / PRECESSION_YEARS); }
// Perihelion longitude moves about 61.9 arcsec/yr against the equinox
// (precession plus apsidal motion), so its calendar date drifts.
export const PERIHELION_DRIFT_DEG_PER_YEAR = 61.9 / 3600;
let _peri2026 = null;
/** Day of the 2026 calendar when the Earth is closest to the Sun (scan of sunAt). */
export function perihelion2026() {
  if (_peri2026 !== null) return _peri2026;
  let best = 0, bestR = 9;
  for (let t = -20; t <= 20; t += 0.01) { const R = sunAt(t).R; if (R < bestR) { bestR = R; best = t; } }
  return (_peri2026 = best);
}
/** Perihelion date for another year: the 2026 date shifted by the drift (Sun moves about 0.9856 deg per day). */
export function perihelionDayOfYear(year) {
  return norm365(perihelion2026() + PERIHELION_DRIFT_DEG_PER_YEAR * (year - BASE_YEAR) / 0.9856);
}

// ---------- sliders, modes, deep links ----------
export const SLIDERS = {
  tilt: { min: 0, max: 90, step: 0.5, value: 23.5, label: "Axial tilt" },
  date: { min: 0, max: 364, step: 1, value: 171, label: "Date" },
  lat: { min: -90, max: 90, step: 1, value: 42, label: "Latitude" },
  hour: { min: 0, max: 23.75, step: 0.25, value: 12, label: "Local solar time" },
  incl: { min: 0, max: 10, step: 0.05, value: 5.15, label: "Moon orbit tilt" },
  year: { min: -13000, max: 15000, step: 100, value: 2000, label: "Year" }
};
export function sliderSteps(key) {
  const s = SLIDERS[key], out = [];
  for (let v = s.min; v <= s.max + 1e-9; v += s.step) out.push(+v.toFixed(6));
  return out;
}
export const MODES = ["seasons", "sunlight", "daylight", "eclipses", "nodes", "precession", "sky", "sandbox"];
export const MODE_LABELS = { seasons: "Seasons", sunlight: "Sunlight angle", daylight: "Daylight", eclipses: "Eclipses", nodes: "Moon tilt", precession: "Precession", sky: "Sky view", sandbox: "Sandbox" };
export const MODE_ALIASES = { season: "seasons", tilt: "seasons", orbit: "seasons", angle: "sunlight", light: "sunlight", day: "daylight", daylength: "daylight", eclipse: "eclipses", solar: "eclipses", lunar: "eclipses", node: "nodes", moon: "nodes", "eclipse-seasons": "nodes", precess: "precession", observer: "sky", horizon: "sky", free: "sandbox", play: "sandbox", simulator: "sandbox" };
export function modeFromSearch(search) {
  const q = new URLSearchParams(search || "");
  const m = (q.get("mode") || "").toLowerCase();
  if (MODES.includes(m)) return m;
  return MODE_ALIASES[m] || "seasons";
}
export function paramsFromSearch(search) {
  const q = new URLSearchParams(search || "");
  const out = {};
  for (const k of Object.keys(SLIDERS)) {
    if (!q.has(k)) continue;
    const v = Number(q.get(k));
    if (isFinite(v)) out[k] = clamp(v, SLIDERS[k].min, SLIDERS[k].max);
  }
  return out;
}

// 2026 eclipses (NASA GSFC catalog) for presets. Times are UTC day fractions.
export const ECLIPSES_2026 = [
  { id: "feb17", label: "Feb 17 annular solar", t: dayOfYear(1, 17) + 12.2 / 24, kind: "solar", expect: "annular" },
  { id: "mar3", label: "Mar 3 total lunar", t: dayOfYear(2, 3) + 11.6 / 24, kind: "lunar", expect: "total" },
  { id: "aug12", label: "Aug 12 total solar", t: dayOfYear(7, 12) + 17.8 / 24, kind: "solar", expect: "total" },
  { id: "aug28", label: "Aug 28 partial lunar", t: dayOfYear(7, 28) + 4.2 / 24, kind: "lunar", expect: "partial" }
];

// ---------- formatting (shared by the UI and the tests) ----------
export function fmtNum(x, digits = 1) {
  if (!isFinite(x)) return "none";
  return Number(x.toFixed(digits)).toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}
export function fmtLat(d) { const r = Math.round(d * 10) / 10; return r === 0 ? "0.0\u00b0" : fmtNum(Math.abs(r), 1) + "\u00b0" + (r > 0 ? "N" : "S"); }
export function fmtHours(h) {
  if (!isFinite(h)) return "none";
  const m = Math.round(h * 60); return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")} min`;
}
export function fmtKm(km) { return Math.round(km).toLocaleString("en-US") + " km"; }
export function fmtYear(y) { return y < 0 ? `${Math.abs(y).toLocaleString("en-US")} BC` : `AD ${y}`; }
const COMPASS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
export function compass(az) { return COMPASS[Math.round(norm360(az) / 22.5) % 16]; }

// ---------- derived state for one instant ----------
/** st: { tilt, date, hour, lat, incl, year }. t = days since 2026 Jan 1 00:00 UTC.
 *  The observer stands on the prime meridian, so local solar time = UTC. */
export function snapshot(st) {
  const t = st.date + st.hour / 24;
  const sun = sunAt(t);
  const dec = declination(sun.lon, st.tilt);
  const sunEq = eclipticToEquatorial(sun.lon, 0, st.tilt);
  const moon = moonAt(t, st.incl);
  const moonEq = eclipticToEquatorial(moon.lon, moon.lat, st.tilt);
  const H = 15 * (st.hour - 12);
  const sunSky = altAz(st.lat, dec, H);
  const moonH = H + (sun.lon - moonEq.ra); // mean-Sun clock (equation of time ignored), stays smooth even when the Sun sits at the pole at tilt 90
  const moonSky = altAz(st.lat, moonEq.dec, moonH);
  const theta = norm360(moon.lon - sun.lon);
  const ecl = eclipseState(t, { inclinationDeg: st.incl });
  return { t, sun, dec, sunEq, moon, moonEq, sunSky, moonSky, theta, ecl };
}

/** Readouts for a mode. num is the value the tests sweep; zeroOk marks rows whose value can legitimately be 0 or cross 0. */
export function readouts(mode, st, snap = snapshot(st)) {
  const s = snap, rows = [];
  const add = (label, text, num, extra = {}) => rows.push({ label, text, num, ...extra });
  const dl = dayLength(st.lat, s.dec);
  const noon = noonAltitude(st.lat, s.dec);
  const date = dateParts(s.t).label;
  if (mode === "seasons") {
    add("Date", date, null);
    add("Sun overhead at noon at", fmtLat(s.dec), s.dec, { zeroOk: true });
    add("Season, north / south", `${seasonName(s.t, st.tilt, "N")} / ${seasonName(s.t, st.tilt, "S")}`, null);
    add("Earth to Sun", `${fmtNum(s.sun.R, 4)} AU = ${fmtNum(s.sun.R * REAL.au / 1e6, 2)} million km`, s.sun.R);
    add("Tropics at", `${fmtNum(st.tilt, 1)}\u00b0 N and S`, st.tilt, { zeroOk: true });
    add("Polar circles at", `${fmtNum(90 - st.tilt, 1)}\u00b0 N and S`, 90 - st.tilt, { zeroOk: true });
    add(`Noon Sun height at ${fmtLat(st.lat)}`, noon > 0 ? `${fmtNum(noon, 1)}\u00b0` : "below the horizon", noon, { zeroOk: true });
    add(`Daylight at ${fmtLat(st.lat)}`, fmtHours(dl), dl, { zeroOk: true });
  } else if (mode === "sunlight") {
    const flux = noonFlux(st.lat, s.dec, s.sun.R), q = dailyInsolation(st.lat, s.dec, s.sun.R), sp = spreadFactor(noon);
    add("Date", date, null);
    add("Noon Sun height", noon > 0 ? `${fmtNum(noon, 1)}\u00b0` : "below the horizon", noon, { zeroOk: true });
    add("1 m\u00b2 of sunlight covers", !isFinite(sp) ? "no ground (Sun down)" : sp > 28.6 ? "more than 28 m\u00b2 (Sun skimming the horizon)" : `${fmtNum(sp, 2)} m\u00b2 of ground`, sp > 28.6 ? null : sp, { zeroOk: true });
    add("Noon sunlight on flat ground", `${Math.round(flux)} W/m\u00b2`, flux, { zeroOk: true, noSweep: noon < 3 });
    add("24 h average sunlight", `${Math.round(q)} W/m\u00b2`, q, { zeroOk: true });
    add(`Daylight at ${fmtLat(st.lat)}`, fmtHours(dl), dl, { zeroOk: true });
  } else if (mode === "daylight") {
    const rs = sunriseSunset(st.lat, s.dec);
    let mx = 0, mn = 24;
    for (let d = 0; d < 365; d += 1) { const v = dayLength(st.lat, declination(sunAt(d + 0.5).lon, st.tilt)); mx = Math.max(mx, v); mn = Math.min(mn, v); }
    add("Date", date, null);
    add("Daylight", rs.kind === "normal" ? fmtHours(dl) : (rs.kind === "midnight sun" ? "24 h (midnight Sun)" : "0 h (polar night)"), dl, { zeroOk: true });
    add("Sunrise / sunset (solar time)", rs.kind === "normal" ? `${fmtClock(rs.rise)} / ${fmtClock(rs.set)}` : rs.kind, null);
    add("Sunrise direction", rs.kind === "normal" ? `${Math.round(rs.riseAz)}\u00b0 (${compass(rs.riseAz)})` : "none", rs.kind === "normal" ? rs.riseAz : null, { noSweep: true }); // a compass bearing: 0 is due north, so a ratio test does not apply
    add("Longest day this year", fmtHours(mx), mx, { zeroOk: true });
    add("Shortest day this year", fmtHours(mn), mn, { zeroOk: true });
  } else if (mode === "eclipses") {
    const g = s.ecl.g, so = s.ecl.solar, lu = s.ecl.lunar;
    const sunAng = 2 * Math.asin(REAL.sunRadius / g.earthSunDistance) / DEG * 60;
    const moonAng = 2 * Math.asin(REAL.moonRadius / g.earthMoonDistance) / DEG * 60;
    add("Moon phase", `${phaseName(s.theta)}, ${fmtNum(s.theta / 360 * SYNODIC_DAYS, 1)} days old`, null);
    add("Result", s.theta < 90 || s.theta > 270 ? SOLAR_LABELS[so.type] : LUNAR_LABELS[lu.type], null);
    add("Moon above or below the Sun's path", `${fmtNum(Math.abs(s.moon.lat), 2)}\u00b0 ${s.moon.lat >= 0 ? "north" : "south"}`, s.moon.lat, { zeroOk: true });
    add("Sun to nearest node", `${fmtNum(sunNodeAngle(s.t), 1)}\u00b0`, sunNodeAngle(s.t), { zeroOk: true });
    add("Earth to Moon", fmtKm(g.earthMoonDistance), g.earthMoonDistance);
    add("Sun / Moon size in the sky", `${fmtNum(sunAng, 1)}\u2032 / ${fmtNum(moonAng, 1)}\u2032`, moonAng / sunAng);
    const ur = so.umbraRadiusAtEarthKm;
    add(ur >= 0 ? "Moon's umbra at Earth, width" : "Moon's antumbra at Earth, width", fmtKm(2 * Math.abs(ur)), ur, { zeroOk: true, noSweep: Math.abs(ur) < 60 }); // near the cone tip the width really does shrink to 0
    add("Moon's penumbra at Earth, width", fmtKm(2 * so.penumbraRadiusAtEarthKm), so.penumbraRadiusAtEarthKm);
    add("Earth's umbra at the Moon, width", fmtKm(2 * lu.umbraRadiusAtMoonKm), lu.umbraRadiusAtMoonKm);
  } else if (mode === "nodes") {
    const lim = eclipseLimits(st.incl, s.ecl.g.earthMoonDistance, s.ecl.g.earthSunDistance);
    add("Moon orbit tilt", `${fmtNum(st.incl, 2)}\u00b0`, st.incl, { zeroOk: true });
    add("Sun to nearest node", `${fmtNum(sunNodeAngle(s.t), 1)}\u00b0`, sunNodeAngle(s.t), { zeroOk: true });
    add("Solar eclipse possible within", lim.solar >= 90 ? "every new Moon" : `${fmtNum(lim.solar, 1)}\u00b0 of a node`, lim.solar);
    add("Lunar (umbral) eclipse within", lim.lunarUmbral >= 90 ? "every full Moon" : `${fmtNum(lim.lunarUmbral, 1)}\u00b0 of a node`, lim.lunarUmbral);
    add("Moon above or below the Sun's path", `${fmtNum(Math.abs(s.moon.lat), 2)}\u00b0 ${s.moon.lat >= 0 ? "north" : "south"}`, s.moon.lat, { zeroOk: true });
    add("Nodes circle the sky every", `${NODE_PERIOD_YEARS} years (westward)`, null);
    add("Eclipse seasons repeat every", `about ${fmtNum(ECLIPSE_YEAR_DAYS / 2, 1)} days`, null);
  } else if (mode === "precession") {
    const ps = nearestPoleStar(st.year, st.tilt);
    const pol = angularSeparation(poleAt(st.year, st.tilt), POLE_STARS[0]);
    add("Year", fmtYear(st.year), null);
    add("Closest bright star to the pole", `${ps.name}, ${fmtNum(ps.sep, 1)}\u00b0 away`, ps.sep, { zeroOk: true });
    add("Polaris to the pole", `${fmtNum(pol, 1)}\u00b0`, pol, { zeroOk: true });
    add("Axis has turned", `${fmtNum(norm360(-precessionAngle(st.year)), 0)}\u00b0 of a ${PRECESSION_YEARS_ROUNDED.toLocaleString("en-US")} year circle`, null);
    add("Earth closest to the Sun", dateParts(perihelionDayOfYear(st.year)).label, null);
    add("Axial tilt", `${fmtNum(st.tilt, 1)}\u00b0`, st.tilt, { zeroOk: true });
  } else if (mode === "sandbox") {
    const solar = s.theta < 90 || s.theta > 270;
    const ps = nearestPoleStar(st.year, st.tilt);
    add("Date and solar time", `${date}, ${fmtClock(st.hour)}`, null);
    add("Sun overhead at noon at", fmtLat(s.dec), s.dec, { zeroOk: true });
    add(`Season at ${fmtLat(st.lat)}`, seasonName(s.t, st.tilt, st.lat >= 0 ? "N" : "S"), null);
    add(`Daylight at ${fmtLat(st.lat)}`, fmtHours(dl), dl, { zeroOk: true });
    add("Sun height now", `${fmtNum(s.sunSky.alt, 1)}\u00b0`, s.sunSky.alt, { zeroOk: true });
    add("Moon phase", `${phaseName(s.theta)}, ${Math.round(illuminatedFraction(s.theta) * 100)}% lit`, illuminatedFraction(s.theta), { zeroOk: true });
    add("Eclipse now", solar ? SOLAR_LABELS[s.ecl.solar.type] : LUNAR_LABELS[s.ecl.lunar.type], null);
    add("Pole star", `${ps.name}, ${fmtNum(ps.sep, 1)}\u00b0 from the pole (${fmtYear(st.year)})`, ps.sep, { zeroOk: true });
  } else if (mode === "sky") {
    const rs = sunriseSunset(st.lat, s.dec);
    add("Date and solar time", `${date}, ${fmtClock(st.hour)}`, null);
    add("Sun height / direction", `${fmtNum(s.sunSky.alt, 1)}\u00b0 / ${Math.round(s.sunSky.az)}\u00b0 ${compass(s.sunSky.az)}`, s.sunSky.alt, { zeroOk: true });
    add("Noon Sun height", `${fmtNum(noon, 1)}\u00b0`, noon, { zeroOk: true });
    add("Sunrise / sunset", rs.kind === "normal" ? `${fmtClock(rs.rise)} / ${fmtClock(rs.set)}` : rs.kind, null);
    add("Moon height / direction", `${fmtNum(s.moonSky.alt, 1)}\u00b0 / ${Math.round(s.moonSky.az)}\u00b0 ${compass(s.moonSky.az)}`, s.moonSky.alt, { zeroOk: true });
    add("Moon phase", `${phaseName(s.theta)}, ${Math.round(illuminatedFraction(s.theta) * 100)}% lit`, illuminatedFraction(s.theta), { zeroOk: true });
    add("Pole star height", st.lat >= 0 ? `${fmtNum(st.lat, 0)}\u00b0 (equals your latitude)` : "below the horizon (south of the equator)", st.lat, { zeroOk: true });
  }
  return rows;
}

export const CAPTIONS = {
  seasons: "Seasons come from the tilt of Earth's axis, not from distance. The axis keeps pointing the same way in space, so in June the north half leans toward the Sun and in December the south half does. Earth is actually closest to the Sun in early January. Set the tilt to 0 and the seasons vanish; set it near 90 and the poles take turns facing the Sun.",
  sunlight: "When the Sun is low, the same beam of sunlight is spread over more ground, so each square meter gets less energy. Long summer days add to this. Together they make summer warm and winter cold.",
  daylight: "On the equinoxes daylight is close to 12 hours everywhere (a few minutes more, because the air bends sunlight and the Sun is a disk, not a point), and it stays near 12 hours all year at the equator. Toward the poles the days stretch in summer and shrink in winter, until the Sun never sets (midnight Sun) or never rises (polar night) inside the polar circles.",
  eclipses: "A solar eclipse happens when the Moon's shadow falls on Earth at new Moon. Inside the dark umbra the Sun is fully hidden; in the lighter penumbra it is partly hidden. When the umbra ends before reaching Earth, the Moon looks smaller than the Sun and leaves a ring: an annular eclipse. A lunar eclipse happens when the full Moon moves into Earth's shadow. Shadow drawing: sizes and widths are true, distances are squeezed.",
  nodes: "The Moon's orbit is tilted about 5.1\u00b0 to Earth's orbit, so most new and full Moons pass above or below the shadow. Eclipses can only happen near the two nodes, where the orbits cross. The Sun lines up with a node about every 173 days, giving two eclipse seasons a year. Set the tilt to 0 and there would be an eclipse every new and full Moon. Tilt drawn 3 times larger.",
  precession: "Earth's axis wobbles like a spinning top, tracing a circle in the sky about every 25,800 years. Today it points close to Polaris. About 4,800 years ago Thuban was the pole star, and in about 12,000 years Vega will be near the pole. The tilt stays about the same, and the seasons stay in the same months; what changes is the pole star and the time of year when Earth is closest to the Sun.",
  sandbox: "Free play: set any tilt, date, time, latitude, Moon tilt and year, then press Play to run the model forward at the speed you pick. The orbit view, the sky view and every readout use the same model as the other modes.",
  sky: "From the ground, the Sun rises in the east, peaks due south at noon (north of the equator) and sets in the west. In summer its path is higher and longer, in winter lower and shorter. The pole star sits at a height equal to your latitude."
};
