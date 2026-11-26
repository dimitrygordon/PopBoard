// Night Sky: positional astronomy (pure, no DOM, no three.js). Node-testable.
// Every formula cites its source. Tesla: this file and ns-ephem.js are the science surface.
//
// Frames
//   Sky frame (J2000 equatorial): v = (cos d cos a, cos d sin a, sin d), x to the March equinox, z to the NCP.
//   World frame (three.js): x = East, y = Up, z = South (camera default looks along -z = North). Right-handed.
// Conventions: angles in degrees unless a name ends in Rad. Longitude is EAST positive (Jasper is -86.93).
// Time: UTC is treated as UT1 (|UT1-UTC| < 0.9 s, under 15 arcsec of sky rotation). TT-UT (about 69 s)
//   is ignored for precession (negligible) and handled in ns-ephem.js where it matters.

export const DEG = Math.PI / 180;
export const RAD = 180 / Math.PI;
export const J2000_JD = 2451545.0;          // JD of 2000-01-01 12:00 TT
export const UNIX_EPOCH_JD = 2440587.5;     // JD of 1970-01-01 00:00 UTC
export const MS_PER_DAY = 86400000;
export const DAYS_PER_CENTURY = 36525;
export const SIDEREAL_DAY_S = 86164.0905;   // mean sidereal day, 23 h 56 m 4.0905 s (IERS / Astronomical Almanac)
export const OBLIQUITY_J2000 = 23.43928;    // degrees, the J2000 value used by JPL's approx_pos page

const mod = (x, m) => ((x % m) + m) % m;

// ---- 7.1 Time --------------------------------------------------------------------------------
/** Julian Date (UTC treated as UT1) from Unix milliseconds. Meeus, Astronomical Algorithms 2nd ed., ch. 7. */
export function julianDate(unixMs) { return unixMs / MS_PER_DAY + UNIX_EPOCH_JD; }
/** Julian centuries since J2000.0. */
export function centuriesSinceJ2000(unixMs) { return (julianDate(unixMs) - J2000_JD) / DAYS_PER_CENTURY; }

/** Greenwich mean sidereal time in degrees. Meeus eq. 12.4 (IAU 1982 expression). */
export function gmstDeg(unixMs) {
  const d = julianDate(unixMs) - J2000_JD;
  const T = d / DAYS_PER_CENTURY;
  return mod(280.46061837 + 360.98564736629 * d + 0.000387933 * T * T - (T * T * T) / 38710000, 360);
}
/** Local mean sidereal time in degrees for an east-positive longitude. */
export function lstDeg(unixMs, lonDeg) { return mod(gmstDeg(unixMs) + lonDeg, 360); }

// ---- 7.3 Precession J2000 -> mean equator and equinox of date ---------------------------------
/** Precession angles zeta, z, theta (degrees). Meeus eq. 21.3 with t = 0 (from J2000), cubic terms dropped
 *  (under 0.1 arcsec within 50 years of 2000). T in Julian centuries. */
export function precessionAngles(T) {
  const zeta = (2306.2181 * T + 0.30188 * T * T) / 3600;
  const z = (2306.2181 * T + 1.09468 * T * T) / 3600;
  const theta = (2004.3109 * T - 0.42665 * T * T) / 3600;
  return { zeta, z, theta };
}
/** Scalar form, Meeus eq. 21.4: returns {raDeg, decDeg} of date. */
export function precessRaDec(raDeg, decDeg, T) {
  const { zeta, z, theta } = precessionAngles(T);
  const a0 = raDeg * DEG, d0 = decDeg * DEG, th = theta * DEG, ze = zeta * DEG;
  const A = Math.cos(d0) * Math.sin(a0 + ze);
  const B = Math.cos(th) * Math.cos(d0) * Math.cos(a0 + ze) - Math.sin(th) * Math.sin(d0);
  const C = Math.sin(th) * Math.cos(d0) * Math.cos(a0 + ze) + Math.cos(th) * Math.sin(d0);
  return { raDeg: mod(Math.atan2(A, B) * RAD + z, 360), decDeg: Math.asin(C) * RAD };
}
/** Same rotation as a row-major 3x3 matrix P = Rz(z) * Rxz(theta) * Rz(zeta), so v_date = P v_J2000.
 *  (Rz(a) is the active rotation +a about z; Rxz(theta) maps x' = cos th x - sin th z, z' = sin th x + cos th z,
 *  which is exactly the A, B, C of eq. 21.4.) */
export function precessionMatrix(T) {
  const { zeta, z, theta } = precessionAngles(T);
  return mul3(mul3(rotZ(z), rotXZ(theta)), rotZ(zeta));
}

// ---- small 3x3 helpers (row-major arrays of 9) ----
export function rotZ(deg) { const c = Math.cos(deg * DEG), s = Math.sin(deg * DEG); return [c, -s, 0, s, c, 0, 0, 0, 1]; }
function rotXZ(deg) { const c = Math.cos(deg * DEG), s = Math.sin(deg * DEG); return [c, 0, -s, 0, 1, 0, s, 0, c]; }
export function mul3(a, b) {
  const r = new Array(9);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) r[i * 3 + j] = a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j];
  return r;
}
export function apply3(m, v) {
  return [m[0] * v[0] + m[1] * v[1] + m[2] * v[2], m[3] * v[0] + m[4] * v[1] + m[5] * v[2], m[6] * v[0] + m[7] * v[1] + m[8] * v[2]];
}
export function transpose3(m) { return [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]]; }

/** Unit vector in the sky frame from RA and Dec in degrees. */
export function unitVector(raDeg, decDeg) {
  const a = raDeg * DEG, d = decDeg * DEG;
  return [Math.cos(d) * Math.cos(a), Math.cos(d) * Math.sin(a), Math.sin(d)];
}
export function angleBetweenDeg(ra1, dec1, ra2, dec2) {
  const a = unitVector(ra1, dec1), b = unitVector(ra2, dec2);
  return Math.acos(Math.min(1, Math.max(-1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]))) * RAD;
}

// ---- 6.4 Sky matrix --------------------------------------------------------------------------
/** W(lat): equatorial-of-date after Rz(-LST), i.e. (cos d cosH, -cos d sinH, sin d), to world (East, Up, South).
 *  world = ( v'_y, cos(lat) v'_x + sin(lat) v'_z, sin(lat) v'_x - cos(lat) v'_z ). */
export function worldFromHourFrame(latDeg) {
  const c = Math.cos(latDeg * DEG), s = Math.sin(latDeg * DEG);
  return [0, 1, 0, c, 0, s, s, 0, -c];
}
/** M = W(lat) * Rz(-LST) * P(T). Maps J2000 sky-frame vectors to world (East, Up, South).
 *  opts.precession=false drops P (used only by the test that proves P matters). */
export function skyMatrix(unixMs, latDeg, lonDeg, opts = {}) {
  const lst = lstDeg(unixMs, lonDeg);
  let m = mul3(worldFromHourFrame(latDeg), rotZ(-lst));
  if (opts.precession !== false) m = mul3(m, precessionMatrix(centuriesSinceJ2000(unixMs)));
  return m;
}
/** Date-frame matrix (no precession): for things already in equator-of-date (Sun, Moon, pole mark, RA/Dec grid of date). */
export function dateMatrix(unixMs, latDeg, lonDeg) { return mul3(worldFromHourFrame(latDeg), rotZ(-lstDeg(unixMs, lonDeg))); }

/** World vector (East, Up, South) to altitude and azimuth (from North through East), degrees. */
export function worldToAltAz(w) {
  const alt = Math.asin(Math.max(-1, Math.min(1, w[1] / Math.hypot(w[0], w[1], w[2])))) * RAD;
  const az = mod(Math.atan2(w[0], -w[2]) * RAD, 360);
  return { alt, az };
}
export function altAzToWorld(altDeg, azDeg) {
  const a = altDeg * DEG, z = azDeg * DEG;
  return [Math.cos(a) * Math.sin(z), Math.sin(a), -Math.cos(a) * Math.cos(z)];
}

// ---- 7.2 Equatorial to horizontal (explicit formulas, used by picking readouts and the tests) ----
/** Meeus eq. 13.5/13.6 rewritten with azimuth from North increasing East:
 *  H = LST - alpha; alt = asin(sin d sin phi + cos d cos phi cos H);
 *  az = atan2(-cos d sin H, sin d cos phi - cos d sin phi cos H). */
export function equatorialToHorizontal(raDeg, decDeg, latDeg, lstDegValue) {
  const H = (lstDegValue - raDeg) * DEG, d = decDeg * DEG, p = latDeg * DEG;
  const alt = Math.asin(Math.sin(d) * Math.sin(p) + Math.cos(d) * Math.cos(p) * Math.cos(H)) * RAD;
  const az = mod(Math.atan2(-Math.cos(d) * Math.sin(H), Math.sin(d) * Math.cos(p) - Math.cos(d) * Math.sin(p) * Math.cos(H)) * RAD, 360);
  return { alt, az };
}
/** J2000 RA (hours) / Dec (deg) to alt/az at an instant. Precession on by default. */
export function raDecToAltAz(raHours, decDeg, unixMs, latDeg, lonDeg, opts = {}) {
  let ra = raHours * 15, dec = decDeg;
  if (opts.precession !== false) ({ raDeg: ra, decDeg: dec } = precessRaDec(ra, dec, centuriesSinceJ2000(unixMs)));
  const out = equatorialToHorizontal(ra, dec, latDeg, lstDeg(unixMs, lonDeg));
  if (opts.refraction) out.alt += refractionDeg(out.alt);
  return out;
}

// ---- 7.2 / 7.5 Atmosphere (optional) -----------------------------------------------------------
/** Saemundsson (1986) refraction, Meeus eq. 16.4, for a TRUE altitude; returns degrees to add. Off by default. */
export function refractionDeg(altDeg) {
  if (altDeg < -1) return 0;
  return Math.max(0, 1.02 / Math.tan((altDeg + 10.3 / (altDeg + 5.11)) * DEG) / 60);
}
/** Lift a local-frame direction to apparent altitude (Saemundsson). Used in Real Sky mode. Off leaves the vector unchanged. */
export function refractDir(dir, on = true) {
  if (!on) return dir;
  const a = worldToAltAz(dir), r = refractionDeg(a.alt);
  return r ? altAzToWorld(a.alt + r, a.az) : dir;
}
/** Inverse of refractDir, two iterations (picking a geometric catalogue against an apparent ray). */
export function unrefractDir(dir, on = true) {
  if (!on) return dir;
  const app = worldToAltAz(dir);
  let t = app.alt - refractionDeg(app.alt);
  t = app.alt - refractionDeg(t);
  return altAzToWorld(t, app.az);
}
/** GLSL twin of refractionDeg + refractDir, for layer shaders. uRefract is 1 in Real Sky mode, else 0. wp is a world/local-frame position. */
export const REFRACT_GLSL = /* glsl */`
uniform float uRefract;
vec3 nsRefractWorld(vec3 wp) {
  if (uRefract < 0.5) return wp;
  float R = length(wp);
  if (R < 1e-3) return wp;
  vec3 d = wp / R;
  float alt = degrees(asin(clamp(d.y, -1.0, 1.0)));
  if (alt < -1.0) return wp;
  float ref = 1.02 / tan(radians(alt + 10.3 / (alt + 5.11))) / 60.0;
  if (ref <= 0.0) return wp;
  float a = radians(alt + ref), az = atan(d.x, -d.z), ca = cos(a);
  return vec3(ca * sin(az), sin(a), -ca * cos(az)) * R;
}
`;

/** Kasten and Young (1989) relative airmass, altitude in degrees. */
export function airmass(altDeg) {
  if (altDeg <= -6.07995 + 1e-9) return 40;
  return 1 / (Math.sin(Math.max(altDeg, 0) * DEG) + 0.50572 * Math.pow(altDeg + 6.07995, -1.6364));
}
/** Extinction dimming in magnitudes, k = 0.25 mag per airmass (a good site, design section 7.5). */
export const EXTINCTION_K = 0.25;
export function extinctionMag(altDeg) { return EXTINCTION_K * (airmass(altDeg) - 1); }

// ---- Star color -------------------------------------------------------------------------------
/** B-V to effective temperature, Ballesteros (2012), EPL 97, 34008, eq. 14. */
export function bvToTemperature(bv) { return 4600 * (1 / (0.92 * bv + 1.7) + 1 / (0.92 * bv + 0.62)); }
// CIE 1931 2-degree colour matching functions, multi-lobe Gaussian fit of Wyman, Sloan and Shirley (2013),
// JCGT 2(2), "Simple Analytic Approximations to the CIE XYZ Color Matching Functions", eq. 2.
function g(l, mu, s1, s2) { const t = (l - mu) / (l < mu ? s1 : s2); return Math.exp(-0.5 * t * t); }
function cmf(l) {
  return [1.056 * g(l, 599.8, 37.9, 31.0) + 0.362 * g(l, 442.0, 16.0, 26.7) - 0.065 * g(l, 501.1, 20.4, 26.2),
    0.821 * g(l, 568.8, 46.9, 40.5) + 0.286 * g(l, 530.9, 16.3, 31.1),
    1.217 * g(l, 437.0, 11.8, 36.0) + 0.681 * g(l, 459.0, 26.0, 13.8)];
}
/** Planck blackbody at T kelvin -> sRGB (gamma encoded, brightest channel = 1). Approximation of what the eye sees. */
export function temperatureToSRGB(T) {
  let X = 0, Y = 0, Z = 0;
  for (let l = 380; l <= 780; l += 5) {
    const m = l * 1e-9; const B = 1 / (Math.pow(m, 5) * (Math.exp(1.4387769e-2 / (m * T)) - 1)); // c2 = hc/k
    const c = cmf(l); X += B * c[0]; Y += B * c[1]; Z += B * c[2];
  }
  // XYZ (D65) -> linear sRGB, IEC 61966-2-1
  let r = 3.2406 * X - 1.5372 * Y - 0.4986 * Z, gg = -0.9689 * X + 1.8758 * Y + 0.0415 * Z, b = 0.0557 * X - 0.2040 * Y + 1.0570 * Z;
  r = Math.max(r, 0); gg = Math.max(gg, 0); b = Math.max(b, 0);
  const mx = Math.max(r, gg, b) || 1;
  const enc = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);
  return [enc(r / mx), enc(gg / mx), enc(b / mx)];
}
/** Color class words for the label card, by B-V (rough Johnson boundaries for O/B, A, F/G, K, M). */
export function colorClass(bv) {
  if (!Number.isFinite(bv)) return "unknown";
  if (bv < 0.0) return "blue-white";
  if (bv < 0.3) return "white";
  if (bv < 0.8) return "yellow-white";
  if (bv < 1.4) return "orange";
  return "red";
}
export const LY_PER_PC = 3.26156; // IAU 2015: 1 pc = 648000/pi au, 1 ly = 63241.077 au

// ---- 7.1 Local time <-> UTC via Intl (time zone database) -------------------------------------
/** Offset of a time zone from UTC in ms at a given instant (positive east of Greenwich). */
export function tzOffsetMs(unixMs, timeZone) {
  const dtf = new Intl.DateTimeFormat("en-US", { timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const p = Object.fromEntries(dtf.formatToParts(new Date(unixMs)).map((x) => [x.type, x.value]));
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
  return asUtc - Math.floor(unixMs / 1000) * 1000;
}
/** Local wall time in a zone -> Unix ms. Gaps (spring forward) move forward by the gap; repeated times
 *  (fall back) take the first (daylight) instance. */
export function localToUtcMs(y, mo, d, H, Mi, timeZone) {
  const g = Date.UTC(y, mo - 1, d, H, Mi);
  const o1 = tzOffsetMs(g - tzOffsetMs(g, timeZone), timeZone);
  const cands = [...new Set([tzOffsetMs(g - 3 * 3600000, timeZone), tzOffsetMs(g + 3 * 3600000, timeZone), o1])]
    .map((o) => g - o).filter((u) => localPartsMs(u, timeZone) === g);
  if (cands.length) return Math.min(...cands);
  // Non-existent local time: use the offset in force before the gap, which lands after the jump.
  return g - tzOffsetMs(g - 6 * 3600000, timeZone);
}
function localPartsMs(unixMs, timeZone) { return unixMs + tzOffsetMs(unixMs, timeZone); }
/** Unix ms -> local wall-clock parts in a zone. */
export function utcToLocalParts(unixMs, timeZone) {
  const t = new Date(unixMs + tzOffsetMs(unixMs, timeZone));
  return { y: t.getUTCFullYear(), mo: t.getUTCMonth() + 1, d: t.getUTCDate(), H: t.getUTCHours(), Mi: t.getUTCMinutes(), S: t.getUTCSeconds(), offsetMin: tzOffsetMs(unixMs, timeZone) / 60000 };
}
