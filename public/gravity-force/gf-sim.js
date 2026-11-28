// Gravity Force Lab: constants and pure physics. No DOM. Double precision.
// Every student-facing number comes from GF (teaching spec v1.2, section 3).
// Spin is ignored (N3). The neutron star uses Newton's law only (C6).
//   node --test tests/gf-sim.test.mjs

const G = 6.6743e-11;
const SUN = 1.98847e30;
const EARTH_M = 5.9722e24;
const EARTH_R = 6.371e6;
const MOON_M = 7.346e22;
const MOON_R = 1.7374e6;
const MARS_M = 6.4169e23;
const MARS_R = 3.3895e6;
const JUP_M = 1.89813e27;
const JUP_R = 7.1492e7;

function freeze(o) {
  for (const v of Object.values(o)) {
    if (v && typeof v === "object" && !Object.isFrozen(v)) freeze(v);
  }
  return Object.freeze(o);
}

// One constants object. pull() and the rest read GF.G (6.6743e-11), not GStudent.
// GStudent (6.674e-11) is the paper value in section 6.3. Answers may differ in the last digit.
// sunGmQuoted is the parenthetical GM in section 3.1. G * sunMassKg is 0.003 percent higher.
// Code multiplies G by the listed mass, which is what Tesla recomputed.
// sunRadiusM is the IAU nominal solar radius. Section 3.1 does not list it.
// It is here so "above the Sun's radius" (T16) has a length. Surface g is 274.2 m/s^2.
export const GF = freeze({
  G,
  GStudent: 6.674e-11,
  gCompare: 9.8,
  lbfN: 4.4482216152605,
  travelerKg: 50,
  issAltKm: 400,
  earthMoonM: 3.844e8,
  auM: 1.495978707e11,
  sunMassKg: SUN,
  sunRadiusM: 6.957e8,
  sunGmQuoted: 1.32712440018e20,
  twinMassKg: SUN,
  twinHorizonM: 2953,
  ballKg: 7.3,
  studentAKg: 50,
  studentBKg: 60,
  studentSeparationM: 1,
  satelliteKg: 1000,
  satelliteRM: 7.0e6,
  wdSuns: 0.6,
  wdMassKg: 0.6 * SUN,
  wdRadiusM: 9.0e6,
  nsSuns: 1.4,
  nsRadiusM: 12e3,
  bhSuns: 10,
  bhMassKg: 10 * SUN,
  schwarzschildMPerSun: 2953,
  // 10 * 2.953 km = 29.53 km. Student text is bhHorizonText(), "about 29.5 km".
  bhHorizonM: 10 * 2953,
  worlds: {
    earth: { massKg: EARTH_M, radiusM: EARTH_R },
    moon: { massKg: MOON_M, radiusM: MOON_R },
    mars: { massKg: MARS_M, radiusM: MARS_R },
    jupiter: { massKg: JUP_M, radiusM: JUP_R },
    ns: { massKg: 1.4 * SUN, radiusM: 12e3 },
  },
  chips: {
    ball: { massKg: 7.3 },
    earth: { massKg: EARTH_M },
    sun: { massKg: SUN },
    wd: { massKg: 0.6 * SUN },
  },
  sheet: {
    earth: { strength: 1 },
    wd: { strength: 5 },
    sun: { strength: 8 },
    bh: { strength: 16 },
  },
});

/** F = G m1 m2 / r^2, newtons. r is center to center, in meters.
 *  Masses multiply smaller-first so pull(a, b, r) and pull(b, a, r) match bit for bit. */
export function pull(m1, m2, r) {
  const prod = Math.abs(m1) <= Math.abs(m2) ? m1 * m2 : m2 * m1;
  return GF.G * prod / (r * r);
}

/** g = G M / R^2 for a named world: earth, moon, mars, jupiter, ns. */
export function surfaceG(world) {
  const w = GF.worlds[world];
  if (!w) return NaN;
  return pull(1, w.massKg, w.radiusM);
}

/** Pull of a world on a mass standing on its surface, in newtons. */
export function weighN(world, kg) {
  const w = GF.worlds[world];
  if (!w) return NaN;
  return pull(kg, w.massKg, w.radiusM);
}

/** How many times Earth's surface g this world has. */
export function timesEarth(world) {
  return surfaceG(world) / surfaceG("earth");
}

/** Worlds ordered from weakest surface g to strongest. */
export function worldsBySurfaceG() {
  return Object.keys(GF.worlds).sort((a, b) => surfaceG(a) - surfaceG(b));
}

function pow10Fix(a) {
  let exp = Math.floor(Math.log10(a));
  let mant = a / 10 ** exp;
  if (mant >= 10) { mant /= 10; exp += 1; }
  if (mant < 1) { mant *= 10; exp -= 1; }
  return { mant, exp };
}

/** Round to `sig` significant figures. */
export function roundSig(n, sig) {
  if (!Number.isFinite(n) || n === 0) return 0;
  const sign = Math.sign(n);
  const { mant, exp } = pow10Fix(Math.abs(n));
  const f = 10 ** (sig - 1);
  let m = Math.round(mant * f) / f;
  let e = exp;
  if (m >= 10) { m /= 10; e += 1; }
  return sign * m * 10 ** e;
}

/** Scientific notation with a straight x, trailing zeros kept: "1.98 x 10^20". */
export function formatSci(n, sig = 3) {
  if (!Number.isFinite(n)) return "";
  if (n === 0) return "0";
  const sign = n < 0 ? "-" : "";
  const fixed = pow10Fix(Math.abs(n));
  const f = 10 ** (sig - 1);
  let m = Math.round(fixed.mant * f) / f;
  let e = fixed.exp;
  if (m >= 10) { m /= 10; e += 1; }
  return `${sign}${m.toFixed(sig - 1)} x 10^${e}`;
}

// Two significant figures once the pound-force is huge (the neutron star).
// Everyday scale readings round to the nearest pound.
const HUGE_LBF = 1e6;

function poundsText(pounds, huge) {
  if (!huge) return `about ${pounds} lb`;
  const abs = Math.abs(pounds);
  if (abs >= 1e12 && abs < 1e15) {
    const tr = Math.round((pounds / 1e12) * 100) / 100;
    const shown = Math.abs(tr - Math.round(tr)) < 1e-6 ? String(Math.round(tr)) : String(tr);
    return `about ${shown} trillion pounds`;
  }
  return `about ${formatSci(pounds, 2)} lb`;
}

/**
 * Pound-force for the S3 spring scale only. Scenes call this. The equation panel does not.
 * lbf is the exact quotient. pounds is the rounded display number. text is the label.
 */
export function lbFromN(n) {
  if (!Number.isFinite(n)) return { lbf: NaN, pounds: NaN, text: "" };
  const lbf = n / GF.lbfN;
  const huge = Math.abs(lbf) >= HUGE_LBF;
  const pounds = huge ? roundSig(lbf, 2) : Math.round(lbf);
  return { lbf, pounds, text: poundsText(pounds, huge) };
}

/**
 * Student newton caption for an S3 platform (section 4.3), without the pound half.
 * Nearest newton, except Jupiter at three significant figures (1,240)
 * and the neutron star at two (about 6.5 x 10^13 N).
 */
export function s3NewtonText(world) {
  const n = weighN(world, GF.travelerKg);
  if (!Number.isFinite(n)) return "";
  if (world === "ns") return `about ${formatSci(n, 2)} N`;
  if (world === "jupiter") return `${groupInt(roundSig(n, 3))} N`;
  return `${groupInt(Math.round(n))} N`;
}

function groupInt(n) {
  const sign = n < 0 ? "-" : "";
  const s = String(Math.abs(Math.round(n)));
  return sign + s.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/** Student line for the 10 Sun example. The stored radius is 29.53 km. */
export function bhHorizonText() {
  return "about 29.5 km";
}

/**
 * Circular-orbit numbers at `altKm` above Earth's surface.
 * pull is the pull on the 50 kg traveler. speedKms and periodMin assume a circular path.
 */
export function issAt(altKm) {
  const R = GF.worlds.earth.radiusM;
  const M = GF.worlds.earth.massKg;
  const r = R + altKm * 1000;
  const g = pull(1, M, r);
  const speed = Math.sqrt(GF.G * M / r);
  return {
    ratio: (R / r) ** 2,
    g,
    pull: pull(GF.travelerKg, M, r),
    speedKms: speed / 1000,
    periodMin: (2 * Math.PI * r / speed) / 60,
  };
}

/** (Earth radius / Earth-Moon distance)^2. Earth's pull on 1 kg at the Moon, compared with the ground. */
export function moonDistanceRatio() {
  const ratio = GF.worlds.earth.radiusM / GF.earthMoonM;
  return ratio * ratio;
}

/** Pull multiplier when the distance is multiplied by `times`. */
export function distanceFactor(times) {
  return 1 / (times * times);
}

/** Pull multiplier when the masses are multiplied by these factors. */
export function massFactor(aTimes, bTimes = 1) {
  return aTimes * bTimes;
}

/** Acceleration of `mass` from the mutual pull, meters per second squared. */
export function accelOf(mass, otherMass, r) {
  return pull(mass, otherMass, r) / mass;
}

/** The pull on each body. The two numbers are always equal (Newton's third law). */
export function pairForce(m1, m2, r) {
  const f = pull(m1, m2, r);
  return { on1: f, on2: f };
}

/** S2 arrow length. Both ends share it, because both feel the same pull. Log scale, so a power-of-ten meter. */
export function s2ArrowLength(m1, m2, r) {
  const f = pull(m1, m2, r);
  if (!(f > 0) || !Number.isFinite(f)) return 0;
  return Math.log10(f);
}

export function s2Arrows(m1, m2, r) {
  const length = s2ArrowLength(m1, m2, r);
  return { a: length, b: length };
}

/** S1 arrow length in meters. startLength defaults to 0.2 m. Capped at 4 times the start. */
export function s1ArrowLength(distanceRatio, startLength = 0.2) {
  const len = startLength * distanceFactor(distanceRatio);
  if (!Number.isFinite(len)) return 0;
  return Math.min(Math.max(len, 0), startLength * 4);
}

/**
 * Point-mass pull of the Sun and of a 1 Sun black hole (the same-mass twin).
 * Equal at every r. The scene, not this function, stops a marble at the Sun's surface.
 */
export function sameMassTwin(r, kg = 1) {
  return {
    sun: pull(GF.sunMassKg, kg, r),
    twin: pull(GF.twinMassKg, kg, r),
    aboveSurface: r > GF.sunRadiusM,
  };
}

/** Drawn well depth. Spec: -s / sqrt(r^2 + e^2). r is the distance from the center. */
export function wellDepth(s, r, e) {
  return -s / Math.sqrt(r * r + e * e);
}

/**
 * Softened acceleration in the sheet plane. The spec writes the inward magnitude
 * a = s r / (r^2 + e^2)^1.5. These components point toward the origin.
 * Independent of marble mass.
 */
export function marbleAccel(x, y, s, e) {
  const soft = x * x + y * y + e * e;
  const denom = soft ** 1.5;
  if (!(denom > 0) || !Number.isFinite(denom) || !Number.isFinite(s)) return { ax: 0, ay: 0 };
  const k = -s / denom;
  return { ax: k * x, ay: k * y };
}

/**
 * One velocity-Verlet step of length dt. Does not subdivide. Does not read state.mass.
 * state: { x, y, vx, vy, s, e, mass? }. Returns a new object.
 */
export function stepMarble(state, dt) {
  const x = Number(state?.x);
  const y = Number(state?.y);
  const vx = Number(state?.vx);
  const vy = Number(state?.vy);
  const s = Number(state?.s);
  const e = Number(state?.e);
  const h = Number(dt);
  if (![x, y, vx, vy, s, e, h].every(Number.isFinite)) return { ...state };
  const a0 = marbleAccel(x, y, s, e);
  const x1 = x + vx * h + 0.5 * a0.ax * h * h;
  const y1 = y + vy * h + 0.5 * a0.ay * h * h;
  const a1 = marbleAccel(x1, y1, s, e);
  return {
    ...state,
    x: x1,
    y: y1,
    vx: vx + 0.5 * (a0.ax + a1.ax) * h,
    vy: vy + 0.5 * (a0.ay + a1.ay) * h,
  };
}
