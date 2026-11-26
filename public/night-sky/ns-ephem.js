// Night Sky: Sun, Moon and naked-eye planets (pure, node-testable). Tier B, design_v1 section 7.4.
// All outputs are apparent-ish geocentric (or topocentric for the Moon) RA/Dec referred to the
// mean equator and equinox OF DATE, ready for dateMatrix() in ns-astro.js.
// Accuracy targets (tests/night-sky-ephem.test.mjs vs astropy get_body): Sun 0.05 deg, planets 0.25 deg,
// Moon 0.5 deg topocentric. Valid 1900..2050 (the JPL Table 1 fit is valid 1800..2050).
import { DEG, RAD, julianDate, J2000_JD, DAYS_PER_CENTURY, precessRaDec, lstDeg, OBLIQUITY_J2000 } from "./ns-astro.js";

const mod = (x, m) => ((x % m) + m) % m;
export const DELTA_T_S = 69;            // TT - UT1 near 2026, seconds (IERS Bulletin A, about 69 s). Error under 0.01 deg for the Moon.
export const AU_KM = 149597870.7;        // IAU 2012 Resolution B2
export const EARTH_RADIUS_KM = 6378.14;  // equatorial radius used for lunar parallax (Meeus ch. 11/40)
export const LIGHT_DAYS_PER_AU = 0.0057755183; // 1 AU / c, days

function ttCenturies(unixMs) { return (julianDate(unixMs) + DELTA_T_S / 86400 - J2000_JD) / DAYS_PER_CENTURY; }
/** Mean obliquity of the ecliptic, Meeus eq. 22.2 (IAU 1980), degrees. */
export function meanObliquity(T) { return 23.4392911 - 0.0130042 * T - 1.64e-7 * T * T + 5.04e-7 * T * T * T; }
function eclToEq(lonDeg, latDeg, epsDeg) {
  const l = lonDeg * DEG, b = latDeg * DEG, e = epsDeg * DEG;
  const ra = Math.atan2(Math.sin(l) * Math.cos(e) - Math.tan(b) * Math.sin(e), Math.cos(l));
  const dec = Math.asin(Math.sin(b) * Math.cos(e) + Math.cos(b) * Math.sin(e) * Math.sin(l));
  return { raDeg: mod(ra * RAD, 360), decDeg: dec * RAD };
}

// ---- Sun: Meeus ch. 25, "low accuracy" method (about 0.01 deg) ---------------------------------
export function sunPosition(unixMs) {
  const T = ttCenturies(unixMs);
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  const M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
  const e = 0.016708634 - 0.000042037 * T - 0.0000001267 * T * T;
  const Mr = M * DEG;
  const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(Mr) + (0.019993 - 0.000101 * T) * Math.sin(2 * Mr) + 0.000289 * Math.sin(3 * Mr);
  const trueLon = L0 + C, nu = M + C;
  const R = (1.000001018 * (1 - e * e)) / (1 + e * Math.cos(nu * DEG));
  const omega = 125.04 - 1934.136 * T;
  const lambda = trueLon - 0.00569 - 0.00478 * Math.sin(omega * DEG);       // apparent longitude (eq. 25.8)
  const eps = meanObliquity(T) + 0.00256 * Math.cos(omega * DEG);             // eq. 25.8 correction
  return { ...eclToEq(lambda, 0, eps), lonDeg: mod(lambda, 360), distAu: R };
}

// ---- Moon: Meeus ch. 47, largest terms of tables 47.A and 47.B, plus the A1..A3 additive terms ----
// Each row: D, M, M', F, sigma_l (1e-6 deg), sigma_r (1e-3 km). Terms with M are multiplied by E^|M|.
const MOON_LR = [
  [0, 0, 1, 0, 6288774, -20905355], [2, 0, -1, 0, 1274027, -3699111], [2, 0, 0, 0, 658314, -2955968], [0, 0, 2, 0, 213618, -569925],
  [0, 1, 0, 0, -185116, 48888], [0, 0, 0, 2, -114332, -3149], [2, 0, -2, 0, 58793, 246158], [2, -1, -1, 0, 57066, -152138],
  [2, 0, 1, 0, 53322, -170733], [2, -1, 0, 0, 45758, -204586], [0, 1, -1, 0, -40923, -129620], [1, 0, 0, 0, -34720, 108743],
  [0, 1, 1, 0, -30383, 104755], [2, 0, 0, -2, 15327, 10321], [0, 0, 1, 2, -12528, 0], [0, 0, 1, -2, 10980, 79661],
  [4, 0, -1, 0, 10675, -34782], [0, 0, 3, 0, 10034, -23210], [4, 0, -2, 0, 8548, -21636], [2, 1, -1, 0, -7888, 24208],
  [2, 1, 0, 0, -6766, 30824], [1, 0, -1, 0, -5163, -8379], [1, 1, 0, 0, 4987, -16675], [2, -1, 1, 0, 4036, -12831],
  [2, 0, 2, 0, 3994, -10445], [4, 0, 0, 0, 3861, -11650], [2, 0, -3, 0, 3665, 14403], [0, 1, -2, 0, -2689, -7003],
  [2, 0, -1, 2, -2602, 0], [2, -1, -2, 0, 2390, 10056], [1, 0, 1, 0, -2348, 6322], [2, -2, 0, 0, 2236, -9884],
];
// Rows: D, M, M', F, sigma_b (1e-6 deg)
const MOON_B = [
  [0, 0, 0, 1, 5128122], [0, 0, 1, 1, 280602], [0, 0, 1, -1, 277693], [2, 0, 0, -1, 173237], [2, 0, -1, 1, 55413],
  [2, 0, -1, -1, 46271], [2, 0, 0, 1, 32573], [0, 0, 2, 1, 17198], [2, 0, 1, -1, 9266], [0, 0, 2, -1, 8822],
  [2, -1, 0, -1, 8216], [2, 0, -2, -1, 4324], [2, 0, 1, 1, 4200], [2, 1, 0, -1, -3359],
];
/** Geocentric Moon, equinox of date: {lonDeg, latDeg, distKm, raDeg, decDeg}. */
export function moonGeocentric(unixMs) {
  const T = ttCenturies(unixMs);
  const Lp = 218.3164477 + 481267.88123421 * T - 0.0015786 * T * T;
  const D = 297.8501921 + 445267.1114034 * T - 0.0018819 * T * T;
  const M = 357.5291092 + 35999.0502909 * T - 0.0001536 * T * T;
  const Mp = 134.9633964 + 477198.8675055 * T + 0.0087414 * T * T;
  const F = 93.2720950 + 483202.0175233 * T - 0.0036539 * T * T;
  const E = 1 - 0.002516 * T - 0.0000074 * T * T;
  const A1 = 119.75 + 131.849 * T, A2 = 53.09 + 479264.29 * T, A3 = 313.45 + 481266.484 * T;
  let sl = 0, sr = 0, sb = 0;
  for (const [d, m, mp, f, l, r] of MOON_LR) {
    const arg = (d * D + m * M + mp * Mp + f * F) * DEG, k = Math.pow(E, Math.abs(m));
    sl += l * k * Math.sin(arg); sr += r * k * Math.cos(arg);
  }
  for (const [d, m, mp, f, b] of MOON_B) sb += b * Math.pow(E, Math.abs(m)) * Math.sin((d * D + m * M + mp * Mp + f * F) * DEG);
  sl += 3958 * Math.sin(A1 * DEG) + 1962 * Math.sin((Lp - F) * DEG) + 318 * Math.sin(A2 * DEG);
  sb += -2235 * Math.sin(Lp * DEG) + 382 * Math.sin(A3 * DEG) + 175 * Math.sin((A1 - F) * DEG) + 175 * Math.sin((A1 + F) * DEG)
    + 127 * Math.sin((Lp - Mp) * DEG) - 115 * Math.sin((Lp + Mp) * DEG);
  const omega = 125.04452 - 1934.136261 * T;
  const lon = mod(Lp + sl / 1e6 - 0.00478 * Math.sin(omega * DEG), 360); // + nutation in longitude (main term)
  const lat = sb / 1e6, dist = 385000.56 + sr / 1000;
  const eps = meanObliquity(T) + 0.00256 * Math.cos(omega * DEG);
  return { lonDeg: lon, latDeg: lat, distKm: dist, ...eclToEq(lon, lat, eps) };
}
/** Topocentric Moon: subtract the observer's geocentric position (spherical Earth, radius 6378.14 km).
 *  Parallax is up to about 1 degree, so this is required (design 7.4). */
export function moonTopocentric(unixMs, latDeg, lonDeg) {
  const g = moonGeocentric(unixMs);
  const toVec = (ra, dec, r) => [r * Math.cos(dec * DEG) * Math.cos(ra * DEG), r * Math.cos(dec * DEG) * Math.sin(ra * DEG), r * Math.sin(dec * DEG)];
  const m = toVec(g.raDeg, g.decDeg, g.distKm);
  const o = toVec(lstDeg(unixMs, lonDeg), latDeg, EARTH_RADIUS_KM);
  const v = [m[0] - o[0], m[1] - o[1], m[2] - o[2]];
  const r = Math.hypot(...v);
  return { ...g, raDeg: mod(Math.atan2(v[1], v[0]) * RAD, 360), decDeg: Math.asin(v[2] / r) * RAD, distKm: r, geocentric: g };
}
/** Moon phase from Sun and Moon geocentric ecliptic longitudes: illuminated fraction and waxing flag.
 *  Phase angle i from elongation (Meeus eq. 48.2/48.3 simplified with the Sun-Moon distance ratio). */
export function moonPhase(unixMs) {
  const s = sunPosition(unixMs), m = moonGeocentric(unixMs);
  const cosPsi = Math.cos(m.latDeg * DEG) * Math.cos((m.lonDeg - s.lonDeg) * DEG);
  const psi = Math.acos(cosPsi);
  const R = s.distAu * AU_KM, dm = m.distKm;
  const i = Math.atan2(R * Math.sin(psi), dm - R * Math.cos(psi));
  return { fraction: (1 + Math.cos(i)) / 2, waxing: mod(m.lonDeg - s.lonDeg, 360) < 180, elongationDeg: psi * RAD };
}

// ---- Planets: JPL "Approximate Positions of the Planets", Table 1 (1800-2050), copied verbatim to
// tools/night-sky/jpl-approx-pos-table1.txt. Rows: a, e, I, L, long.peri, long.node, then the rates per century.
export const JPL_TABLE1 = {
  mercury: [0.38709927, 0.20563593, 7.00497902, 252.25032350, 77.45779628, 48.33076593, 0.00000037, 0.00001906, -0.00594749, 149472.67411175, 0.16047689, -0.12534081],
  venus: [0.72333566, 0.00677672, 3.39467605, 181.97909950, 131.60246718, 76.67984255, 0.00000390, -0.00004107, -0.00078890, 58517.81538729, 0.00268329, -0.27769418],
  emb: [1.00000261, 0.01671123, -0.00001531, 100.46457166, 102.93768193, 0.0, 0.00000562, -0.00004392, -0.01294668, 35999.37244981, 0.32327364, 0.0],
  mars: [1.52371034, 0.09339410, 1.84969142, -4.55343205, -23.94362959, 49.55953891, 0.00001847, 0.00007882, -0.00813131, 19140.30268499, 0.44441088, -0.29257343],
  jupiter: [5.20288700, 0.04838624, 1.30439695, 34.39644051, 14.72847983, 100.47390909, -0.00011607, -0.00013253, -0.00183714, 3034.74612775, 0.21252668, 0.20469106],
  saturn: [9.53667594, 0.05386179, 2.48599187, 49.95424423, 92.59887831, 113.66242448, -0.00125060, -0.00050991, 0.00193609, 1222.49362201, -0.41897216, -0.28867794],
};
export const PLANETS = ["mercury", "venus", "mars", "jupiter", "saturn"];

/** Heliocentric J2000 ecliptic position (AU) by the JPL recipe (steps 1-5 on the approx_pos page). */
export function heliocentricEcliptic(name, T) {
  const r = JPL_TABLE1[name];
  const a = r[0] + r[6] * T, e = r[1] + r[7] * T, I = r[2] + r[8] * T, L = r[3] + r[9] * T, wbar = r[4] + r[10] * T, node = r[5] + r[11] * T;
  const w = wbar - node;
  let M = mod(L - wbar + 180, 360) - 180;
  const estar = e * RAD;
  let E = M + estar * Math.sin(M * DEG);
  for (let k = 0; k < 30; k++) {
    const dM = M - (E - estar * Math.sin(E * DEG));
    const dE = dM / (1 - e * Math.cos(E * DEG));
    E += dE; if (Math.abs(dE) <= 1e-6) break;
  }
  const xp = a * (Math.cos(E * DEG) - e), yp = a * Math.sqrt(1 - e * e) * Math.sin(E * DEG);
  const cw = Math.cos(w * DEG), sw = Math.sin(w * DEG), cO = Math.cos(node * DEG), sO = Math.sin(node * DEG), cI = Math.cos(I * DEG), sI = Math.sin(I * DEG);
  return [(cw * cO - sw * sO * cI) * xp + (-sw * cO - cw * sO * cI) * yp,
    (cw * sO + sw * cO * cI) * xp + (-sw * sO + cw * cO * cI) * yp,
    (sw * sI) * xp + (cw * sI) * yp];
}
/** Geocentric planet: J2000 equatorial (step 6, eps = 23.43928) then precessed to the equinox of date.
 *  One light-time iteration. Earth is taken as the Earth-Moon barycenter (under 0.004 deg error for Mars). */
export function planetPosition(name, unixMs) {
  const T = ttCenturies(unixMs);
  const earth = heliocentricEcliptic("emb", T);
  let p = heliocentricEcliptic(name, T), g = [p[0] - earth[0], p[1] - earth[1], p[2] - earth[2]];
  const tau = Math.hypot(...g) * LIGHT_DAYS_PER_AU / DAYS_PER_CENTURY;
  p = heliocentricEcliptic(name, T - tau); g = [p[0] - earth[0], p[1] - earth[1], p[2] - earth[2]];
  const ce = Math.cos(OBLIQUITY_J2000 * DEG), se = Math.sin(OBLIQUITY_J2000 * DEG);
  const q = [g[0], ce * g[1] - se * g[2], se * g[1] + ce * g[2]];
  const dist = Math.hypot(...q);
  const ra2000 = mod(Math.atan2(q[1], q[0]) * RAD, 360), dec2000 = Math.asin(q[2] / dist) * RAD;
  const d = precessRaDec(ra2000, dec2000, (julianDate(unixMs) - J2000_JD) / DAYS_PER_CENTURY);
  return { ...d, distAu: dist, ra2000, dec2000 };
}
