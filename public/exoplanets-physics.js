// Exoplanet Hunter: physics and synthetic data.
// Pure: no DOM, no Firebase. Runs in node for tests and in the page.
// SI units inside; helpers convert to days, AU, solar, Jupiter and Earth units.
// Every formula and constant here is listed in docs/exoplanets-science.md.
//   node --test tests/exoplanets-physics.test.mjs

// ---------- constants (CODATA 2018 / IAU 2015 nominal) ----------
export const G = 6.67430e-11;            // m^3 kg^-1 s^-2
export const GM_SUN = 1.3271244e20;      // m^3 s^-2 (IAU 2015 nominal)
export const M_SUN = GM_SUN / G;         // kg, ~1.98841e30
export const R_SUN = 6.957e8;            // m (IAU nominal)
export const L_SUN = 3.828e26;           // W (IAU nominal)
export const T_SUN = 5772;               // K (IAU nominal)
export const M_EARTH = 5.9722e24;        // kg
export const R_EARTH = 6.3781e6;         // m (equatorial, IAU nominal)
export const M_JUP = 1.89813e27;         // kg
export const R_JUP = 7.1492e7;           // m (equatorial, IAU nominal)
export const AU = 1.495978707e11;        // m (exact)
export const DAY = 86400;                // s
export const SIGMA_SB = 5.670374419e-8;  // W m^-2 K^-4

export const MODE_ALIASES = Object.freeze({
  field: "field", hunt: "field", sandbox: "field",
  transit: "transit", "light-curve": "transit", lightcurve: "transit",
  rv: "rv", "radial-velocity": "rv", wobble: "rv",
  fold: "fold", "phase-fold": "fold",
  orbit: "orbit", hz: "orbit", "habitable-zone": "orbit",
  inclination: "inclination", tilt: "inclination",
  verdict: "verdict"
});

export function modeFromSearch(search) {
  const p = new URLSearchParams(typeof search === "string" ? search : "");
  return MODE_ALIASES[(p.get("mode") || "").trim().toLowerCase()] || "field";
}
export function seedFromSearch(search) {
  const v = new URLSearchParams(typeof search === "string" ? search : "").get("seed");
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n >>> 0 : null;
}

// ---------- seeded RNG ----------

// mulberry32: small, fast, reproducible across engines.
export function createRng(seed) {
  let a = (seed >>> 0) || 1;
  const next = () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  let spare = null;
  return {
    next,
    uniform: (lo, hi) => lo + (hi - lo) * next(),
    logUniform: (lo, hi) => Math.exp(Math.log(lo) + (Math.log(hi) - Math.log(lo)) * next()),
    int: (lo, hi) => lo + Math.floor(next() * (hi - lo + 1)),
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    // Box-Muller, caching the second deviate.
    gauss: (mu = 0, sigma = 1) => {
      if (spare !== null) { const s = spare; spare = null; return mu + sigma * s; }
      let u = 0, v = 0;
      while (u <= 1e-12) u = next();
      v = next();
      const r = Math.sqrt(-2 * Math.log(u));
      spare = r * Math.sin(2 * Math.PI * v);
      return mu + sigma * r * Math.cos(2 * Math.PI * v);
    }
  };
}

// ---------- stars ----------

// Rough main-sequence relations for a teaching generator (documented).
export function mainSequenceStar(massSun) {
  const m = massSun;
  const radius = m < 1 ? Math.pow(m, 0.8) : Math.pow(m, 0.57);           // R_sun
  const lum = m < 0.43 ? 0.23 * Math.pow(m, 2.3) : Math.pow(m, 4);         // L_sun
  const teff = T_SUN * Math.pow(lum / (radius * radius), 0.25);            // Stefan-Boltzmann
  return { mass: m, radius, lum, teff, spectral: spectralClass(teff) };
}
export function spectralClass(teff) {
  if (teff < 3900) return "M";
  if (teff < 5300) return "K";
  if (teff < 6000) return "G";
  return "F";
}

// ---------- Kepler's equation and orbits ----------

// Solve M = E - e sin E for E. Newton with a safe start; |error| < 1e-12.
export function solveKepler(M, e) {
  const twoPi = 2 * Math.PI;
  let Mm = ((M % twoPi) + twoPi) % twoPi;
  if (Mm > Math.PI) Mm -= twoPi;
  let E = e < 0.8 ? Mm : Math.sign(Mm || 1) * Math.PI;
  for (let k = 0; k < 50; k++) {
    const f = E - e * Math.sin(E) - Mm;
    const d = 1 - e * Math.cos(E);
    const dE = f / d;
    E -= dE;
    if (Math.abs(dE) < 1e-14) break;
  }
  return E + (M - Mm);
}
export function trueAnomaly(E, e) {
  return 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2));
}
export function semiMajorAxis(periodDays, mStarKg, mPlanetKg) {
  const P = periodDays * DAY;
  return Math.cbrt(G * (mStarKg + mPlanetKg) * P * P / (4 * Math.PI * Math.PI));
}
export function periodFromA(aM, mStarKg, mPlanetKg = 0) {
  return 2 * Math.PI * Math.sqrt(aM ** 3 / (G * (mStarKg + mPlanetKg))) / DAY;
}

// RV semi-amplitude K (m/s). P in days, masses in kg, i in radians.
export function rvSemiAmplitude(periodDays, mStarKg, mPlanetKg, inc = Math.PI / 2, e = 0) {
  const P = periodDays * DAY;
  return Math.cbrt(2 * Math.PI * G / P) * mPlanetKg * Math.sin(inc) /
    Math.pow(mStarKg + mPlanetKg, 2 / 3) / Math.sqrt(1 - e * e);
}

// Precompute derived orbit constants for a planet around a star.
// Convention (Murray & Correia / Perryman): omega is the STAR's argument of
// periastron, z points away from the observer, RV = K[cos(w+f) + e cos w].
// Planet is in front of the star (transit) near w + f = pi/2.
export function prepareOrbit(star, p) {
  const Ms = star.mass * M_SUN, Mp = p.mass;
  const a = semiMajorAxis(p.period, Ms, Mp);
  const n = 2 * Math.PI / (p.period * DAY);
  const K = rvSemiAmplitude(p.period, Ms, Mp, p.inc, p.e);
  // Time of periastron from the reference mid-transit time t0.
  const fT = Math.PI / 2 - p.omega;
  const ET = 2 * Math.atan2(Math.sqrt(1 - p.e) * Math.sin(fT / 2), Math.sqrt(1 + p.e) * Math.cos(fT / 2));
  const MT = ET - p.e * Math.sin(ET);
  const tp = p.t0 - MT / n / DAY;
  return { ...p, a, n, K, tp, Ms, Mp, Rs: star.radius * R_SUN };
}

// Full state at time t (days): relative orbit, star and planet barycentric
// positions (m) and velocities (m/s), sky separation in stellar radii, RV.
export function orbitState(o, tDays) {
  const M = o.n * (tDays - o.tp) * DAY;
  const E = solveKepler(M, o.e);
  const f = trueAnomaly(E, o.e);
  const r = o.a * (1 - o.e * Math.cos(E));
  const u = o.omega + f;
  const ci = Math.cos(o.inc), si = Math.sin(o.inc);
  // Relative vector (star minus planet direction convention below).
  const X = r * Math.cos(u), Y = r * Math.sin(u) * ci, Z = r * Math.sin(u) * si;
  const h = o.n * o.a / Math.sqrt(1 - o.e * o.e);
  const vX = -h * (Math.sin(u) + o.e * Math.sin(o.omega));
  const vInPlane = h * (Math.cos(u) + o.e * Math.cos(o.omega));
  const vY = vInPlane * ci, vZ = vInPlane * si;
  const mt = o.Ms + o.Mp, fs = o.Mp / mt, fp = o.Ms / mt;
  return {
    E, f, r,
    star: { x: fs * X, y: fs * Y, z: fs * Z, vx: fs * vX, vy: fs * vY, vz: fs * vZ },
    planet: { x: -fp * X, y: -fp * Y, z: -fp * Z, vx: -fp * vX, vy: -fp * vY, vz: -fp * vZ },
    sep: Math.hypot(X, Y) / o.Rs,       // projected separation, stellar radii
    inFront: Math.sin(u) > 0,           // planet between star and observer
    rv: o.K * (Math.cos(u) + o.e * Math.cos(o.omega)) // star radial velocity, m/s
  };
}

// Impact parameter (stellar radii) at conjunction, general e.
export function impactParameter(o) {
  return (o.a * Math.cos(o.inc) / o.Rs) * (1 - o.e * o.e) / (1 + o.e * Math.sin(o.omega));
}
export function transits(o) {
  const k = o.radius / o.Rs;
  return impactParameter(o) < 1 + k;
}
// Total transit duration T14 (days), Winn (2010) eq. 14 with the eccentric factor.
export function transitDuration(o) {
  const k = o.radius / o.Rs, b = impactParameter(o);
  const aR = o.a / o.Rs;
  const arg = Math.sqrt(Math.max(0, (1 + k) ** 2 - b * b)) / (aR * Math.sin(o.inc));
  if (arg <= 0 || b >= 1 + k) return 0;
  const ecc = Math.sqrt(1 - o.e * o.e) / (1 + o.e * Math.sin(o.omega));
  return (o.period / Math.PI) * Math.asin(Math.min(1, arg)) * ecc;
}

// ---------- transit model ----------

// Quadratic limb darkening I(mu)/I(1) = 1 - u1(1-mu) - u2(1-mu)^2.
export function limbIntensity(r, u1, u2) {
  if (r >= 1) return 0;
  const mu = Math.sqrt(1 - r * r);
  return 1 - u1 * (1 - mu) - u2 * (1 - mu) ** 2;
}
// Area of overlap between unit disc and disc radius k at separation z, over pi k^2.
export function overlapFraction(z, k) {
  if (z >= 1 + k) return 0;
  if (z <= 1 - k) return 1;
  if (z <= k - 1) return 1 / (k * k); // planet bigger than star, star fully covered
  const k2 = k * k, z2 = z * z;
  const a1 = Math.acos(Math.min(1, Math.max(-1, (z2 + k2 - 1) / (2 * z * k))));
  const a2 = Math.acos(Math.min(1, Math.max(-1, (z2 + 1 - k2) / (2 * z))));
  const area = k2 * a1 + a2 - 0.5 * Math.sqrt(Math.max(0, (-z + k + 1) * (z + k - 1) * (z - k + 1) * (z + k + 1)));
  return area / (Math.PI * k2);
}
// Fractional flux drop for a disc of radius ratio k at separation z (stellar radii).
// Small-planet approximation (Mandel & Agol 2002 sec. 5): the blocked flux is
// overlap area times the local intensity, evaluated at the centre of the
// overlapping region. Exact for u1 = u2 = 0.
export function transitDeficit(z, k, u1 = 0.4, u2 = 0.25) {
  const frac = overlapFraction(z, k);
  if (frac <= 0) return 0;
  const norm = 1 - u1 / 3 - u2 / 6;                // integral of I over the disc / pi
  let rEval = z;
  if (z > 1 - k) rEval = Math.min(1, (z - k + 1) / 2);  // middle of the covered annulus
  const I = Math.max(0, limbIntensity(Math.min(rEval, 0.999999), u1, u2));
  return k * k * frac * I / norm;
}

// Flux of the whole system at time t (days), without noise. Multi-planet
// deficits add. Eclipsing binaries include the secondary eclipse.
export function modelFlux(target, tDays) {
  let f = 1;
  const { u1, u2 } = target.star;
  for (const o of target.orbits) {
    const s = orbitState(o, tDays);
    const k = o.radius / o.Rs;
    const share = o.secondaryFlux ? 1 - o.secondaryFlux : 1;
    if (s.inFront) f -= share * transitDeficit(s.sep, k, u1, u2);
    else if (o.secondaryFlux) {
      // Secondary eclipse: the primary covers part of the companion. The
      // overlap area is symmetric, so overlapFraction gives the covered share
      // of the companion's disc (companion treated as uniform).
      f -= o.secondaryFlux * overlapFraction(s.sep, k);
    }
  }
  if (target.variability) {
    const v = target.variability;
    f *= 1 + v.amp * Math.sin(2 * Math.PI * tDays / v.period + v.phase);
  }
  return f;
}

// ---------- generator ----------

export const BINARY_CAPTION = "V-shaped dips can also come from grazing planets; the shallow secondary eclipse and huge RV are the real giveaway.";
export const KINDS = ["planet", "none", "binary", "multi"];
const PLANET_TYPES = [
  { name: "hot Jupiter", rMin: 0.8 * R_JUP, rMax: 1.6 * R_JUP, mMin: 0.3 * M_JUP, mMax: 3 * M_JUP, pMin: 1.2, pMax: 6 },
  { name: "warm Neptune", rMin: 2.5 * R_EARTH, rMax: 5 * R_EARTH, mMin: 8 * M_EARTH, mMax: 30 * M_EARTH, pMin: 3, pMax: 25 },
  { name: "super-Earth", rMin: 1.2 * R_EARTH, rMax: 2 * R_EARTH, mMin: 2 * M_EARTH, mMax: 8 * M_EARTH, pMin: 1, pMax: 15 },
  { name: "warm Jupiter", rMin: 0.8 * R_JUP, rMax: 1.2 * R_JUP, mMin: 0.5 * M_JUP, mMax: 5 * M_JUP, pMin: 8, pMax: 25 }
];

// Draw a target. kind forces a class; otherwise ~45% one planet, 20% none,
// 15% eclipsing binary, 20% multi-planet. Planets usually transit (the
// survey picked them from transit alerts), but some are RV-only.
export function generateTarget(seed, opts = {}) {
  const rng = createRng(seed);
  const roll = rng.next();
  const kind = opts.kind || (roll < 0.45 ? "planet" : roll < 0.65 ? "none" : roll < 0.8 ? "binary" : "multi");
  const star = mainSequenceStar(rng.uniform(0.45, 1.35));
  // Quadratic limb darkening, Kepler band (close to Claret 2011 solar ~0.40, 0.26).
  star.u1 = Math.max(0, 0.65 - 0.25 * (star.teff - 4000) / 2000); // cooler stars darken more
  star.u2 = 0.25;
  const baseline = opts.baseline || 40;     // days of photometry
  const cadence = opts.cadence || 1 / 48;   // 30 min
  const noise = opts.noise != null ? opts.noise : rng.logUniform(2e-4, 1.5e-3);
  const rvNoise = opts.rvNoise != null ? opts.rvNoise : rng.uniform(1.5, 4);
  const target = {
    seed, kind, star, baseline, cadence, noise, rvNoise,
    name: targetName(rng),
    planets: [], orbits: [],
    variability: rng.next() < 0.4 ? { amp: rng.uniform(2e-4, 2e-3), period: rng.uniform(8, 30), phase: rng.uniform(0, 6.283) } : null
  };
  const addPlanet = (type, periodDays, forceTransit) => {
    const radius = rng.uniform(type.rMin, type.rMax);
    const mass = rng.uniform(type.mMin, type.mMax);
    const e = periodDays < 5 ? 0 : Math.min(0.4, Math.abs(rng.gauss(0, 0.12)));
    const omega = rng.uniform(0, 2 * Math.PI);
    const aGuess = semiMajorAxis(periodDays, star.mass * M_SUN, mass);
    const bMax = forceTransit ? 0.85 : 2.5;
    const b = rng.uniform(0, bMax);
    const inc = Math.acos(Math.min(1, b * star.radius * R_SUN / aGuess));
    const p = { name: type.name, radius, mass, period: periodDays, e, omega, inc, t0: rng.uniform(0.5, Math.min(periodDays, baseline - 1)) };
    target.planets.push(p);
    target.orbits.push(prepareOrbit(star, p));
  };
  if (kind === "planet") {
    const type = rng.pick(PLANET_TYPES);
    addPlanet(type, rng.uniform(type.pMin, Math.min(type.pMax, baseline / 3)), rng.next() < 0.85);
  } else if (kind === "multi") {
    const n = rng.int(2, 3);
    let P = rng.uniform(1.5, 4);
    for (let i = 0; i < n; i++) {
      const type = rng.pick(PLANET_TYPES.slice(1));
      addPlanet(type, P, true);
      P *= rng.uniform(1.6, 2.6);
      if (P > baseline / 2.5) break;
    }
  } else if (kind === "binary") {
    // Grazing eclipsing binary: a low-mass star companion. V-shaped, deep,
    // with a secondary eclipse and an RV amplitude in km/s.
    const comp = mainSequenceStar(rng.uniform(0.15, 0.4));
    const period = rng.uniform(1.5, 8);
    const mass = comp.mass * M_SUN, radius = comp.radius * R_SUN;
    const aGuess = semiMajorAxis(period, star.mass * M_SUN, mass);
    const k = radius / (star.radius * R_SUN);
    // About a third are full eclipses (b < 1 - k): flat or U-shaped bottoms, a deep
    // primary and a flat, shallow secondary. The rest graze (V-shaped).
    const full = rng.next() < 1 / 3;
    const b = full ? rng.uniform(0, 0.9 * (1 - k)) : rng.uniform(0.95, 1 + 0.8 * k);
    const inc = Math.acos(b * star.radius * R_SUN / aGuess);
    const p = { name: "eclipsing binary", radius, mass, period, e: 0, omega: Math.PI / 2, inc, t0: rng.uniform(0.5, period), stellar: true, eclipse: full ? "full" : "grazing" };
    target.planets.push(p);
    const o = prepareOrbit(star, p);
    o.secondaryFlux = comp.lum / (comp.lum + star.lum);
    target.orbits.push(o);
  }
  target.lightCurve = sampleLightCurve(target, rng);
  target.rv = sampleRV(target, rng, opts.rvEpochs || 28);
  return target;
}

function targetName(rng) {
  const cat = rng.pick(["KIC", "TIC", "EPIC", "HD"]);
  return `${cat} ${rng.int(100000, 9999999)}`;
}

export function sampleLightCurve(target, rng) {
  const n = Math.floor(target.baseline / target.cadence);
  const t = new Float64Array(n), f = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    t[i] = i * target.cadence;
    f[i] = modelFlux(target, t[i]) + rng.gauss(0, target.noise);
  }
  return { t, f, sigma: target.noise };
}

// Uneven cadence: observable nights with weather gaps and jittered times.
export function sampleRV(target, rng, epochs) {
  const t = [], v = [];
  let day = rng.uniform(0, 1);
  const span = Math.max(target.baseline, 60);
  while (t.length < epochs && day < span * 3) {
    if (rng.next() > 0.35) {                       // clear night
      const ti = Math.floor(day) + 0.3 + rng.uniform(0, 0.4);
      t.push(ti);
      let rv = 0;
      for (const o of target.orbits) rv += orbitState(o, ti).rv;
      v.push(rv + rng.gauss(0, target.rvNoise));
    }
    day += rng.next() < 0.15 ? rng.uniform(3, 8) : 1;  // occasional runs of bad weather
  }
  return { t: Float64Array.from(t), v: Float64Array.from(v), sigma: target.rvNoise };
}

// The star field: deterministic list of targets from one field seed.
export function generateField(fieldSeed, count = 12) {
  const rng = createRng(fieldSeed);
  const out = [];
  for (let i = 0; i < count; i++) {
    const seed = (rng.next() * 4294967295) >>> 0 || i + 1;
    out.push({ seed, x: rng.uniform(0.06, 0.94), y: rng.uniform(0.1, 0.9), mag: rng.uniform(9, 13) });
  }
  return out;
}

// ---------- inference ----------

// Phase in [-0.5, 0.5) with transit at 0.
export function phaseFold(times, period, t0 = 0) {
  const out = new Float64Array(times.length);
  for (let i = 0; i < times.length; i++) {
    let ph = ((times[i] - t0) / period) % 1;
    if (ph < -0.5) ph += 1; else if (ph >= 0.5) ph -= 1;
    out[i] = ph;
  }
  return out;
}

// Binned phase curve for display and depth fits.
export function binPhase(phase, values, nBins = 100) {
  const sum = new Float64Array(nBins), cnt = new Float64Array(nBins);
  for (let i = 0; i < phase.length; i++) {
    const b = Math.min(nBins - 1, Math.floor((phase[i] + 0.5) * nBins));
    sum[b] += values[i]; cnt[b]++;
  }
  return Array.from(sum, (s, i) => ({ phase: (i + 0.5) / nBins - 0.5, value: cnt[i] ? s / cnt[i] : NaN, n: cnt[i] }));
}

// Box Least Squares (Kovacs, Zucker & Mazeh 2002), binned. Returns the best
// period with its depth, epoch, duration, and the power spectrum.
export function bls(times, flux, opts = {}) {
  const n = times.length;
  const pMin = opts.pMin || 0.8, pMax = opts.pMax || (times[n - 1] - times[0]) / 2;
  const nP = opts.nPeriods || 3000, nb = opts.nBins || 300;
  const qMin = opts.qMin || 0.005, qMax = opts.qMax || 0.12;
  let mean = 0;
  for (let i = 0; i < n; i++) mean += flux[i];
  mean /= n;
  const y = new Float64Array(n);
  for (let i = 0; i < n; i++) y[i] = flux[i] - mean;
  const t0 = times[0];
  const periods = new Float64Array(nP), power = new Float64Array(nP);
  const fMin = 1 / pMax, fMax = 1 / pMin;     // uniform in frequency
  const sb = new Float64Array(nb), cb = new Float64Array(nb);
  let best = { power: -1 };
  for (let k = 0; k < nP; k++) {
    const P = 1 / (fMin + (fMax - fMin) * k / (nP - 1));
    periods[k] = P;
    sb.fill(0); cb.fill(0);
    for (let i = 0; i < n; i++) {
      const ph = ((times[i] - t0) / P) % 1;
      const b = Math.floor(ph * nb);
      sb[b] += y[i]; cb[b]++;
    }
    const wMin = Math.max(1, Math.floor(qMin * nb)), wMax = Math.max(wMin, Math.ceil(qMax * nb));
    let bestK = 0, bestS = 0, bestR = 0, bestStart = 0, bestW = 0;
    for (let s = 0; s < nb; s++) {
      let S = 0, R = 0;
      for (let w = 1; w <= wMax; w++) {
        const j = (s + w - 1) % nb;
        S += sb[j]; R += cb[j];
        if (w < wMin || R === 0 || R === n) continue;
        const r = R / n;
        const sr = (S * S) / (R * (1 - r)) / n;      // SR^2 from KZM eq. 5, dips give S < 0
        if (S < 0 && sr > bestK) { bestK = sr; bestS = S; bestR = R; bestStart = s; bestW = w; }
      }
    }
    power[k] = bestK;
    if (bestK > best.power) {
      const depth = -bestS / bestR * (n / (n - bestR));
      best = { power: bestK, period: P, depth, duration: bestW / nb * P, t0: t0 + (bestStart + bestW / 2) / nb * P };
    }
  }
  return { ...best, periods, power };
}

// Generalised Lomb-Scargle (floating mean) for uneven RV data.
export function lombScargle(times, values, opts = {}) {
  const n = times.length;
  const span = times[n - 1] - times[0];
  const pMin = opts.pMin || 0.8, pMax = opts.pMax || span;
  const nP = opts.nPeriods || 4000;
  const periods = new Float64Array(nP), power = new Float64Array(nP);
  let best = { power: -1 };
  for (let k = 0; k < nP; k++) {
    const P = 1 / (1 / pMax + (1 / pMin - 1 / pMax) * k / (nP - 1));
    periods[k] = P;
    const fit = fitSinusoid(times, values, P);
    power[k] = fit.r2;
    if (fit.r2 > best.power) best = { power: fit.r2, period: P, K: fit.K, phase: fit.phase };
  }
  return { ...best, periods, power };
}

// Linear least squares y = A sin(wt) + B cos(wt) + C at fixed period.
// Returns K = sqrt(A^2 + B^2) (circular-orbit amplitude) and R^2.
export function fitSinusoid(times, values, period) {
  const w = 2 * Math.PI / period;
  let Sss = 0, Scc = 0, Ssc = 0, Ss = 0, Sc = 0, Sy = 0, Sys = 0, Syc = 0, Syy = 0;
  const n = times.length;
  for (let i = 0; i < n; i++) {
    const s = Math.sin(w * times[i]), c = Math.cos(w * times[i]), y = values[i];
    Sss += s * s; Scc += c * c; Ssc += s * c; Ss += s; Sc += c; Sy += y; Sys += y * s; Syc += y * c; Syy += y * y;
  }
  const M = [[Sss, Ssc, Ss], [Ssc, Scc, Sc], [Ss, Sc, n]];
  const sol = solve3(M, [Sys, Syc, Sy]);
  if (!sol) return { K: 0, phase: 0, offset: 0, r2: 0 };
  const [A, B, C] = sol;
  const mean = Sy / n;
  let ssRes = 0;
  for (let i = 0; i < n; i++) {
    const m = A * Math.sin(w * times[i]) + B * Math.cos(w * times[i]) + C;
    ssRes += (values[i] - m) ** 2;
  }
  const ssTot = Syy - n * mean * mean;
  return { K: Math.hypot(A, B), phase: Math.atan2(B, A), offset: C, A, B, r2: ssTot > 0 ? 1 - ssRes / ssTot : 0 };
}
function solve3(M, b) {
  const a = M.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < 3; c++) {
    let p = c;
    for (let r = c + 1; r < 3; r++) if (Math.abs(a[r][c]) > Math.abs(a[p][c])) p = r;
    if (Math.abs(a[p][c]) < 1e-14) return null;
    [a[c], a[p]] = [a[p], a[c]];
    for (let r = 0; r < 3; r++) if (r !== c) {
      const f = a[r][c] / a[c][c];
      for (let k = c; k < 4; k++) a[r][k] -= f * a[c][k];
    }
  }
  return [a[0][3] / a[0][0], a[1][3] / a[1][1], a[2][3] / a[2][2]];
}

// Depth -> planet radius (m). Optional limb-darkening correction: the dip at
// the centre of a central transit is k^2 * I(0)/<I>, so divide that back out.
export function radiusFromDepth(depth, starRadiusSun, u1 = 0, u2 = 0) {
  const ld = 1 / (1 - u1 / 3 - u2 / 6);
  return Math.sqrt(Math.max(0, depth) / ld) * starRadiusSun * R_SUN;
}

// Mp sin i (kg) from K (m/s), P (days), M* (solar), e. Iterates the
// (M* + Mp)^(2/3) term; converges in a few steps for Mp << M*.
export function massFromK(K, periodDays, starMassSun, e = 0, inc = Math.PI / 2) {
  const Ms = starMassSun * M_SUN;
  const P = periodDays * DAY;
  const c = K * Math.sqrt(1 - e * e) / Math.cbrt(2 * Math.PI * G / P);
  const si = Math.sin(inc);
  let mp = c * Math.pow(Ms, 2 / 3) / si;
  for (let i = 0; i < 30; i++) mp = c * Math.pow(Ms + mp, 2 / 3) / si;
  return mp;  // true mass if inc is known (transiting), else Mp sin i for inc = 90 deg
}

export function bulkDensity(massKg, radiusM) {
  return massKg / (4 / 3 * Math.PI * radiusM ** 3);   // kg m^-3
}

// Inclination from a transit fit: cos i = b R* / a (circular).
export function inclinationFromImpact(b, aM, starRadiusSun) {
  return Math.acos(Math.min(1, b * starRadiusSun * R_SUN / aM));
}

// ---------- habitable zone ----------

// Kopparapu et al. (2013, ApJ 765, 131), Table 3 coefficients, Seff in
// units of the present solar constant; T* = Teff - 5780 K; valid 2600-7200 K.
export const KOPPARAPU_2013 = Object.freeze({
  recentVenus:      [1.7753, 1.4316e-4, 2.9875e-9, -7.5702e-12, -1.1635e-15],
  runawayGreenhouse:[1.0512, 1.3242e-4, 1.5418e-8, -7.9895e-12, -1.8328e-15],
  moistGreenhouse:  [1.0140, 8.1774e-5, 1.7063e-9, -4.3241e-12, -6.6462e-16],
  maximumGreenhouse:[0.3438, 5.8942e-5, 1.6558e-9, -3.0045e-12, -5.2983e-16],
  earlyMars:        [0.3179, 5.4513e-5, 1.5313e-9, -2.7786e-12, -4.8997e-16]
});
export function seff(limit, teff) {
  const c = KOPPARAPU_2013[limit];
  const T = Math.min(7200, Math.max(2600, teff)) - 5780;
  return c[0] + c[1] * T + c[2] * T ** 2 + c[3] * T ** 3 + c[4] * T ** 4;
}
// Distances in AU. conservative = moist greenhouse to maximum greenhouse,
// optimistic = recent Venus to early Mars. simple = 0.95-1.67 AU (Kasting 1993
// water-loss to maximum-greenhouse limits), scaled by sqrt(L). Not the conservative zone.
export function habitableZone(lumSun, teff = T_SUN) {
  const d = (limit) => Math.sqrt(lumSun / seff(limit, teff));
  return {
    conservative: { inner: d("moistGreenhouse"), outer: d("maximumGreenhouse") },
    optimistic: { inner: d("recentVenus"), outer: d("earlyMars") },
    simple: { inner: 0.95 * Math.sqrt(lumSun), outer: 1.67 * Math.sqrt(lumSun), label: "0.95-1.67 AU (Kasting 1993 water-loss to maximum-greenhouse limits)" }
  };
}
// Insolation relative to Earth's (S = L / d^2 in solar units and AU).
export function insolation(lumSun, aAU) { return lumSun / (aAU * aAU); }

// ---------- verdicts and scoring ----------

export function truthSummary(target) {
  const main = target.orbits[0];
  if (target.kind === "none") return { kind: "none" };
  if (target.kind === "binary") return { kind: "binary", period: main.period, eclipse: main.eclipse };
  const s = target.star;
  return {
    kind: "planet",
    multi: target.orbits.length > 1,
    period: main.period,
    radiusEarth: main.radius / R_EARTH,
    massEarth: main.mass / M_EARTH,
    msiniEarth: main.mass * Math.sin(main.inc) / M_EARTH,
    transits: transits(main),
    aAU: main.a / AU,
    hz: habitableZone(s.lum, s.teff).conservative,
    planets: target.orbits.map((o) => ({ period: o.period, radiusEarth: o.radius / R_EARTH, massEarth: o.mass / M_EARTH, msiniEarth: o.mass * Math.sin(o.inc) / M_EARTH, aAU: o.a / AU, transits: transits(o), b: impactParameter(o), e: o.e }))
  };
}

// Score out of 100: 40 for the right class, then up to 20 each for period,
// radius and mass. A quantity earns full marks within 10% and nothing beyond
// a factor of 2 (log scale). For multis, estimates match the closest planet.
export function scoreVerdict(target, guess) {
  const truth = truthSummary(target);
  const guessKind = guess.kind === "multi" ? "planet" : guess.kind;
  const out = { truth, classCorrect: guessKind === truth.kind, parts: {}, score: 0 };
  if (out.classCorrect) out.score += 40;
  const rel = (est, tru) => {
    if (!(est > 0) || !(tru > 0)) return 0;
    const err = Math.abs(Math.log(est / tru));
    if (err <= Math.log(1.1)) return 1;
    return Math.max(0, 1 - (err - Math.log(1.1)) / (Math.log(2) - Math.log(1.1)));
  };
  if (truth.kind === "planet" && out.classCorrect) {
    const pl = truth.planets.slice().sort((a, b) => Math.abs(Math.log(a.period / (guess.period || 1))) - Math.abs(Math.log(b.period / (guess.period || 1))))[0];
    const massTruth = pl.transits ? pl.massEarth : pl.msiniEarth;  // RV alone gives Mp sin i
    out.parts.period = 20 * rel(guess.period, pl.period);
    out.parts.radius = pl.transits ? 20 * rel(guess.radiusEarth, pl.radiusEarth) : (guess.radiusEarth ? 0 : 20);
    out.parts.mass = 20 * rel(guess.massEarth, massTruth);
    out.score += out.parts.period + out.parts.radius + out.parts.mass;
  } else if (truth.kind === "binary" && out.classCorrect) {
    out.parts.period = 20 * rel(guess.period, truth.period);
    out.score += out.parts.period + 40;  // no planet properties to estimate
  } else if (truth.kind === "none" && out.classCorrect) out.score += 60;
  out.score = Math.round(out.score);
  return out;
}
