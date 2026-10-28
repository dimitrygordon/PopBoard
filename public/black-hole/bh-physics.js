/**
 * Black Hole Explorer: pure physics, no DOM.
 *
 * Lengths are in geometric units of M = G M / c^2 unless a name ends in
 * Km, M (meters) or Seconds. Spin is the dimensionless a* = J c / (G M^2),
 * 0 <= a* < 1. "dir" is +1 for prograde (with the spin) and -1 for retrograde.
 *
 * Shared Schwarzschild pieces (constants, clock rates, the null-ray tracer,
 * weak-field deflection) are imported from the Relativity Sandbox so the two
 * modules can never disagree at a* = 0. Kerr formulas are Bardeen, Press and
 * Teukolsky (1972), equatorial plane only. See docs/black-hole-science.md.
 */
"use strict";

import {
  C, G, M_SUN, R_SUN, schwarzschildRadius, staticClockRate as schwStaticRate,
  circularOrbitClockRate, deflectionAngle, traceNullRay, CRITICAL_B_OVER_RS
} from "../relativity-physics.js";

export { C, G, M_SUN, R_SUN };

export const G_EARTH = 9.80665;          // m/s^2, standard gravity
export const ASTRONAUT_LENGTH = 2;        // m, head to foot
export const SPIN_MAX = 0.998;            // Thorne (1974) limit for an accreting hole

/** Meters per geometric unit M for a mass in solar masses (G M / c^2). */
export function meterPerM(massSun) {
  return schwarzschildRadius(massSun * M_SUN) / 2;
}
/** Seconds per geometric unit M (G M / c^3). */
export function secondPerM(massSun) {
  return meterPerM(massSun) / C;
}

// ---------- sliders (shared with the tests so the 2x check sees the real steps) ----------

export const SLIDERS = Object.freeze({
  mass: { min: 0.5, max: 10, step: 0.01, value: 1 },          // log10(M / M_sun)
  spin: { min: 0, max: SPIN_MAX, step: 0.002, value: 0 },
  dist: { min: Math.log10(2.1), max: Math.log10(200), step: 0.005, value: Math.log10(12) } // log10(r / M)
});

export const MASS_PRESETS = Object.freeze([
  { id: "stellar", label: "Stellar, 10 Msun", massSun: 10 },
  { id: "sgra", label: "Sgr A*, 4.3 million Msun", massSun: 4.3e6 },
  { id: "m87", label: "M87*, 6.5 billion Msun", massSun: 6.5e9 }
]);

export function sliderSteps(key) {
  const s = SLIDERS[key];
  const n = Math.round((s.max - s.min) / s.step);
  const out = [];
  for (let i = 0; i <= n; i++) out.push(Math.min(s.max, s.min + i * s.step));
  if (out[out.length - 1] < s.max) out.push(s.max);
  return out;
}

// ---------- modes ----------

export const MODES = Object.freeze([
  { id: "horizon", label: "Horizon" },
  { id: "lensing", label: "Lensing" },
  { id: "disk", label: "Disk & ISCO" },
  { id: "orbits", label: "Orbits" },
  { id: "time", label: "Time" },
  { id: "tides", label: "Tides" }
]);
export const MODE_ALIASES = Object.freeze({
  horizon: "horizon", anatomy: "horizon", photon: "horizon", shadow: "horizon", kerr: "horizon",
  lensing: "lensing", lens: "lensing", light: "lensing",
  disk: "disk", isco: "disk", accretion: "disk",
  orbits: "orbits", orbit: "orbits", stability: "orbits",
  time: "time", clocks: "time", dilation: "time",
  tides: "tides", tidal: "tides", spaghetti: "tides", spaghettification: "tides"
});
export function modeFromSearch(search) {
  const v = new URLSearchParams(search || "").get("mode");
  return (v && MODE_ALIASES[String(v).toLowerCase()]) || "horizon";
}

// ---------- Kerr geometry (equatorial) ----------

function spinOk(a) {
  if (!(a >= 0 && a < 1)) throw new RangeError("spin must be in [0, 1)");
  return a;
}

/** Outer event horizon r+ = 1 + sqrt(1 - a^2). 2 at a = 0. */
export function horizonRadius(a) {
  spinOk(a);
  return 1 + Math.sqrt(1 - a * a);
}
/** Ergosphere (static limit) in the equatorial plane: always 2 M. */
export function ergosphereEquator() {
  return 2;
}
/** Circular photon orbit: 2 [1 + cos(2/3 arccos(-dir a))]. 3 at a = 0. */
export function photonOrbitRadius(a, dir = 1) {
  spinOk(a);
  return 2 * (1 + Math.cos((2 / 3) * Math.acos(-dir * a)));
}
/** Innermost stable circular orbit (Bardeen et al. 1972). 6 at a = 0. */
export function iscoRadius(a, dir = 1) {
  spinOk(a);
  const z1 = 1 + Math.cbrt(1 - a * a) * (Math.cbrt(1 + a) + Math.cbrt(1 - a));
  const z2 = Math.sqrt(3 * a * a + z1 * z1);
  return 3 + z2 - dir * Math.sqrt((3 - z1) * (3 + z1 + 2 * z2));
}
/** Marginally bound circular orbit (E = 1): 2 - dir a + 2 sqrt(1 - dir a). 4 at a = 0. */
export function marginallyBoundRadius(a, dir = 1) {
  spinOk(a);
  return 2 - dir * a + 2 * Math.sqrt(1 - dir * a);
}
/**
 * Impact parameter of the equatorial circular photon orbit, |b| in M.
 * Prograde -a + 6 cos(arccos(-a)/3), retrograde a + 6 cos(arccos(a)/3).
 * 3 sqrt(3) at a = 0. These are the shadow's left and right edges for an
 * observer in the equatorial plane.
 */
export function photonImpactParameter(a, dir = 1) {
  spinOk(a);
  return -dir * a + 6 * Math.cos(Math.acos(-dir * a) / 3);
}
export function shadowEdges(a) {
  const pro = photonImpactParameter(a, 1), retro = photonImpactParameter(a, -1);
  return { pro, retro, width: pro + retro, shift: (retro - pro) / 2 };
}

/** x = r^(-3/2) helper; Bardeen circular-orbit denominator 1 - 3/r + 2 dir a r^(-3/2). */
function circDen(r, a, dir) {
  return 1 - 3 / r + 2 * dir * a * Math.pow(r, -1.5);
}

/** Specific energy E (per unit rest energy) of a circular equatorial orbit, or null if none. */
export function circularEnergy(r, a, dir = 1) {
  spinOk(a);
  const d = circDen(r, a, dir);
  if (!(d > 0) || !(r > horizonRadius(a))) return null;
  return (1 - 2 / r + dir * a * Math.pow(r, -1.5)) / Math.sqrt(d);
}
/** Radiative efficiency of a thin disk, 1 - E(ISCO). 5.72% at a = 0. */
export function diskEfficiency(a, dir = 1) {
  return 1 - circularEnergy(iscoRadius(a, dir), a, dir);
}
export function orbitStatus(r, a, dir = 1) {
  if (!(r > horizonRadius(a))) return "inside";
  if (!(r > photonOrbitRadius(a, dir))) return "none";
  if (r < iscoRadius(a, dir)) return "unstable";
  return "stable";
}

/** Coordinate-time period of a circular equatorial orbit, 2 pi (r^1.5 + dir a) G M / c^3. */
export function orbitalPeriodSeconds(r, a, massSun, dir = 1) {
  if (orbitStatus(r, a, dir) === "none" || orbitStatus(r, a, dir) === "inside") return null;
  return 2 * Math.PI * (Math.pow(r, 1.5) + dir * a) * secondPerM(massSun);
}

// ---------- clocks ----------

/**
 * Hovering clock in the equatorial plane: sqrt(1 - 2/r). In Kerr this is exact
 * at the equator (g_tt = -(1 - 2 M r / Sigma), Sigma = r^2) and reuses the
 * Relativity Sandbox's Schwarzschild function. Zero inside the ergosphere,
 * where nothing can hover.
 */
export function hoverClockRate(r) {
  return schwStaticRate(r, 2);
}
/** Circular-orbit clock, d tau / dt = sqrt(1 - 3/r + 2 dir a r^-1.5) / (1 + dir a r^-1.5). */
export function orbitClockRate(r, a, dir = 1) {
  spinOk(a);
  if (a === 0) return circularOrbitClockRate(r, 2);
  const d = circDen(r, a, dir);
  if (!(d > 0)) return 0;
  return Math.sqrt(d) / (1 + dir * a * Math.pow(r, -1.5));
}

// ---------- lensing (Schwarzschild ray tracer from the Relativity Sandbox) ----------

/** Capture impact parameter at a = 0: 3 sqrt(3) M. */
export const B_CRIT = 2 * CRITICAL_B_OVER_RS;

/** Closest approach u1 = 1/r_min: smallest positive root of 1/b^2 - u^2 + 2u^3 = 0 (M = 1). */
function closestU(b) {
  const f = (u) => 1 / (b * b) - u * u + 2 * u * u * u;
  let lo = 0, hi = 1 / 3;
  for (let i = 0; i < 80; i++) { const mid = 0.5 * (lo + hi); if (f(mid) > 0) lo = mid; else hi = mid; }
  return { u1: lo, f };
}

/**
 * Exact Schwarzschild bending angle (radians) for impact parameter b (in M),
 * or null when the ray is captured (b <= 3 sqrt 3). Spin is ignored here
 * (documented). alpha = 2 * integral_0^u1 du / sqrt(1/b^2 - u^2 + 2u^3) - pi,
 * with u = u1 (1 - t^2) to remove the turning-point singularity. The test
 * suite checks it against the Relativity Sandbox's traceNullRay.
 */
export function bendingAngle(b, n = 20000) {
  if (!(b > B_CRIT)) return null;
  const { u1, f } = closestU(b);
  let s = 0;
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    s += (2 * u1 * t) / Math.sqrt(f(u1 * (1 - t * t)));
  }
  return (2 * s) / n - Math.PI;
}
/** Sandbox tracer result for the same ray, used by the tests as an independent check. */
export function tracedClosestApproach(b) {
  const res = traceNullRay(M_SUN, b * meterPerM(1));
  return res.captured ? null : res.closest / meterPerM(1);
}
export function closestApproach(b) {
  if (!(b > B_CRIT)) return null;
  return 1 / closestU(b).u1;
}
/** Weak-field (Einstein) angle 4 G M / (c^2 b) = 4 / b in M units. */
export function weakBendingAngle(b) {
  return deflectionAngle(M_SUN, b * meterPerM(1));
}

// ---------- tides ----------

/** Head-to-foot tidal stretch 2 G M L / r^3 (m/s^2), Newtonian radial tidal term. */
export function tidalStretch(massSun, rM, length = ASTRONAUT_LENGTH) {
  const rm = rM * meterPerM(massSun);
  return (2 * G * massSun * M_SUN * length) / (rm * rm * rm);
}
export function tidalAtHorizon(massSun, a, length = ASTRONAUT_LENGTH) {
  return tidalStretch(massSun, horizonRadius(a), length);
}
/** Tidal disruption radius of a Sun-like star, r_t = R* (M / M*)^(1/3), in M units. */
export function disruptionRadius(massSun, starMassSun = 1, starRadiusM = R_SUN) {
  return (starRadiusM * Math.cbrt(massSun / starMassSun)) / meterPerM(massSun);
}
/** Hills mass: the hole mass (Msun) at which r_t equals the horizon. */
export function hillsMass(a, starMassSun = 1, starRadiusM = R_SUN) {
  const k = starRadiusM / (horizonRadius(a) * meterPerM(1) * Math.cbrt(1 / starMassSun));
  return Math.pow(k, 1.5);
}
/** Illustrative art bins for the astronaut (in g): <1, 1-10, 10-100, >100. */
export function astronautFrame(stretchG) {
  if (stretchG < 1) return 1;
  if (stretchG < 10) return 2;
  if (stretchG < 100) return 3;
  return 4;
}

// ---------- everything the page prints ----------

export function readouts({ massSun, a, r }) {
  const m = meterPerM(massSun);
  const edges = shadowEdges(a);
  const status = orbitStatus(r, a, 1);
  const stable = status === "stable";
  const hover = hoverClockRate(r);
  const orbit = stable ? orbitClockRate(r, a, 1) : null;
  const rt = disruptionRadius(massSun);
  const rp = horizonRadius(a);
  return {
    rPlus: rp,
    rPlusKm: (rp * m) / 1000,
    rsKm: (2 * m) / 1000,
    ergo: ergosphereEquator(),
    photonPro: photonOrbitRadius(a, 1),
    photonRetro: photonOrbitRadius(a, -1),
    shadowPro: edges.pro,
    shadowRetro: edges.retro,
    shadowWidthKm: (edges.width * m) / 1000,
    iscoPro: iscoRadius(a, 1),
    iscoRetro: iscoRadius(a, -1),
    iscoProKm: (iscoRadius(a, 1) * m) / 1000,
    iscoRetroKm: (iscoRadius(a, -1) * m) / 1000,
    etaPro: diskEfficiency(a, 1),
    etaRetro: diskEfficiency(a, -1),
    iscoPeriod: orbitalPeriodSeconds(iscoRadius(a, 1), a, massSun, 1),
    r,
    rKm: (r * m) / 1000,
    status,
    period: stable ? orbitalPeriodSeconds(r, a, massSun, 1) : null,
    energy: stable ? circularEnergy(r, a, 1) : null,
    hover,
    hoverFactor: hover > 0 ? 1 / hover : null,
    orbit,
    orbitFactor: orbit ? 1 / orbit : null,
    bend: bendingAngle(r),
    weakBend: weakBendingAngle(r),
    stretchG: tidalStretch(massSun, r) / G_EARTH,
    horizonStretchG: tidalAtHorizon(massSun, a) / G_EARTH,
    rt,
    rtOverRp: rt / rp,
    hills: hillsMass(a),
    swallowedWhole: rt <= rp
  };
}

/**
 * Photon path for the ray diagram, from the Relativity Sandbox tracer
 * (Schwarzschild, a = 0). Returns [{x, y}] in M, hole at the origin,
 * ray arriving from -x travelling +x at height b. Captured rays stop at r = 2.
 */
export function rayPath(b, viewR = 16) {
  const m = meterPerM(1);
  const res = traceNullRay(M_SUN, b * m, { recordEvery: 6, dphi: 0.0015 });
  const pts = res.points.map((p) => ({ r: p.r / m, phi: p.phi }));
  if (pts.length < 2) return { captured: res.captured, points: [] };
  const r0 = Math.max(160 * 2, 24 * b);
  // Start position is (r0, phi = 0). Rotate so the incoming asymptote points along +x at y = b.
  const rot = Math.PI - Math.asin(b / r0);
  const out = [];
  for (const p of pts) {
    const ang = p.phi + rot;
    const x = p.r * Math.cos(ang), y = p.r * Math.sin(ang);
    if (p.r < viewR * 1.6) out.push({ x, y: -y });
  }
  return { captured: res.captured, points: out };
}

/** Deep-link values: ?mass= (Msun), ?spin=, ?r= (GM/c^2), clamped to the sliders. */
export function paramsFromSearch(search) {
  const q = new URLSearchParams(search || "");
  const num = (k) => { const v = parseFloat(q.get(k)); return isFinite(v) ? v : null; };
  const clampLog = (v, s) => Math.min(s.max, Math.max(s.min, Math.log10(v)));
  const mass = num("mass"), spin = num("spin"), r = num("r");
  return {
    massSun: mass > 0 ? Math.pow(10, clampLog(mass, SLIDERS.mass)) : Math.pow(10, SLIDERS.mass.value),
    a: spin == null ? SLIDERS.spin.value : Math.min(SLIDERS.spin.max, Math.max(0, spin)),
    r: r > 0 ? Math.pow(10, clampLog(r, SLIDERS.dist)) : Math.pow(10, SLIDERS.dist.value)
  };
}
