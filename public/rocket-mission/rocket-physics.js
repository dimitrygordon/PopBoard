// Rocket Science & Space Mission: physics and data. Pure functions, no DOM.
// SI units (m, s, kg, N) unless a name says km, t (tonnes) or deg.
// Sources for every number are in docs/rocket-mission-science.md.

// ---------- constants ----------
export const G0 = 9.80665;               // standard gravity, m/s^2 (exact, SI)
export const MU_EARTH = 3.986004418e14;  // GM of Earth, m^3/s^2 (NASA Earth fact sheet)
export const R_EARTH = 6.371e6;          // mean radius of Earth, m (NASA Earth fact sheet)
export const RHO0 = 1.217;               // surface air density, kg/m^3 (NASA Earth fact sheet)
export const SCALE_H = 8500;             // atmospheric scale height, m (NASA Earth fact sheet)
export const MU_SUN = 1.32712440018e20;  // GM of the Sun, m^3/s^2 (NASA Sun fact sheet / JPL)
export const AU = 1.495978707e11;        // astronomical unit, m (exact, IAU 2012)
export const DAY = 86400;
export const LEO_DV = 9400;              // typical total delta-v to low Earth orbit incl. losses, m/s
export const ORBIT_OK_KM = 120;          // lowest point at least this high counts as "in orbit" here

// Real engines (vacuum Isp unless noted). sl = sea level.
export const ENGINES = Object.freeze({
  srb: Object.freeze({ id: "srb", name: "Solid booster (Space Shuttle SRB)", short: "Solid (SRB)", ispSl: 242, ispVac: 268, fuel: "solid fuel" }),
  f1: Object.freeze({ id: "f1", name: "F-1 (Saturn V first stage)", short: "Kerosene (F-1)", ispSl: 263, ispVac: 304, fuel: "kerosene and liquid oxygen", thrustSl: 6.77e6 }),
  merlin: Object.freeze({ id: "merlin", name: "Merlin 1D (Falcon 9)", short: "Kerosene (Merlin)", ispSl: 282, ispVac: 311, fuel: "kerosene and liquid oxygen" }),
  rs25: Object.freeze({ id: "rs25", name: "RS-25 (Space Shuttle, SLS)", short: "Hydrogen (RS-25)", ispSl: 366, ispVac: 452, fuel: "liquid hydrogen and liquid oxygen", thrustSl: 1.86e6 })
});
export const EQ_ENGINES = Object.freeze(["srb", "f1", "rs25"]);

// ---------- thrust: F = mdot * ve ----------
export const thrust = (mdot, ve) => mdot * ve;
export const veFromIsp = (isp) => G0 * isp;
export const ispFromVe = (ve) => ve / G0;
export const weight = (massKg, g = G0) => massKg * g;
export const twr = (F, massKg) => F / (massKg * G0);

// ---------- rocket equation ----------
export const deltaV = (ve, m0, mf) => ve * Math.log(m0 / mf);
export const massRatioFor = (dv, ve) => Math.exp(dv / ve);
export const propFraction = (R) => 1 - 1 / R;

/** Single stage vs two equal stages (same ve, same structure ratio eps, same payload fraction p of liftoff mass).
 *  eps = structure / (structure + propellant) in each stage. Equal stages are the best split for identical stages. */
export function staging(ve, p, eps) {
  const r1 = 1 / (p + eps * (1 - p));
  const pi = Math.sqrt(p);                     // payload fraction of each stage
  const r2 = 1 / (pi + eps * (1 - pi));
  const dv1 = ve * Math.log(r1), dv2 = 2 * ve * Math.log(r2);
  return { r1, r2, dv1, dv2, gain: dv2 - dv1 };
}

// ---------- orbits ----------
export const gAt = (r) => MU_EARTH / (r * r);
export const vCirc = (r, mu = MU_EARTH) => Math.sqrt(mu / r);
export const vEsc = (r, mu = MU_EARTH) => Math.sqrt(2 * mu / r);
export const period = (a, mu = MU_EARTH) => 2 * Math.PI * Math.sqrt(a ** 3 / mu);
export const airDensity = (h) => (h < 0 ? RHO0 : RHO0 * Math.exp(-h / SCALE_H));

/** Conic from a position r (m) and speed v (m/s) fired horizontally (flight path angle 0). */
export function horizontalShot(r, v, mu = MU_EARTH) {
  const eps = v * v / 2 - mu / r, hh = r * v, e = Math.sqrt(Math.max(0, 1 + 2 * eps * hh * hh / (mu * mu)));
  const p = hh * hh / mu;
  if (eps >= 0) return { e, p, a: Infinity, rp: p / (1 + e), ra: Infinity, bound: false, periodS: null, startAtPeri: true };
  const a = -mu / (2 * eps), rp = a * (1 - e), ra = a * (1 + e);
  return { e, p, a, rp, ra, bound: true, periodS: period(a, mu), startAtPeri: v >= vCirc(r, mu) };
}
/** Orbit elements from a 2D state (Earth-centered). */
export function stateOrbit(x, y, vx, vy, mu = MU_EARTH) {
  const r = Math.hypot(x, y), v2 = vx * vx + vy * vy, eps = v2 / 2 - mu / r, hh = x * vy - y * vx;
  const e = Math.sqrt(Math.max(0, 1 + 2 * eps * hh * hh / (mu * mu))), p = hh * hh / mu;
  const rp = p / (1 + e), ra = eps < 0 ? p / (1 - e) : Infinity;
  return { r, eps, e, p, rp, ra, a: eps < 0 ? -mu / (2 * eps) : Infinity };
}

// ---------- Hohmann transfer between circular, coplanar planet orbits ----------
export const PLANETS = Object.freeze({
  venus: Object.freeze({ id: "venus", name: "Venus", aAU: 0.723, color: "#c9a227" }),
  earth: Object.freeze({ id: "earth", name: "Earth", aAU: 1.000, color: "#3a78c2" }),
  mars: Object.freeze({ id: "mars", name: "Mars", aAU: 1.524, color: "#c1440e" }),
  jupiter: Object.freeze({ id: "jupiter", name: "Jupiter", aAU: 5.203, color: "#b07d48" })
});
export const TARGETS = Object.freeze(["venus", "mars", "jupiter"]);
export function hohmann(r1, r2, mu = MU_SUN) {
  const at = (r1 + r2) / 2;
  const v1 = vCirc(r1, mu), v2 = vCirc(r2, mu);
  const vp = Math.sqrt(mu * (2 / r1 - 1 / at)), va = Math.sqrt(mu * (2 / r2 - 1 / at));
  const dv1 = Math.abs(vp - v1), dv2 = Math.abs(v2 - va);
  const tTransfer = Math.PI * Math.sqrt(at ** 3 / mu);
  const n2 = Math.sqrt(mu / r2 ** 3), n1 = Math.sqrt(mu / r1 ** 3);
  const phaseRad = Math.PI - n2 * tTransfer;            // target ahead of Earth at departure (negative: behind)
  const synodic = 2 * Math.PI / Math.abs(n1 - n2);
  return { at, v1, v2, dv1, dv2, tTransfer, phaseRad, synodic, n1, n2 };
}
const wrapPi = (a) => { let x = (a + Math.PI) % (2 * Math.PI); if (x < 0) x += 2 * Math.PI; return x - Math.PI; };
/** Solve Kepler's equation M = E - e sin E. */
export function eccAnomaly(M, e) {
  let E = e < 0.8 ? M : Math.PI;
  for (let i = 0; i < 30; i++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
  return E;
}
/** Position on a Hohmann transfer t seconds after departure: radius (m) and angle swept from the departure point (rad). */
export function transferPos(r1, r2, t, mu = MU_SUN) {
  const a = (r1 + r2) / 2, e = Math.abs(r2 - r1) / (r1 + r2), n = Math.sqrt(mu / a ** 3);
  const out = r2 > r1, M = n * t + (out ? 0 : Math.PI);
  const E = eccAnomaly(M, e), nu = 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2));
  const r = a * (1 - e * Math.cos(E));
  let swept = out ? nu : nu - Math.PI;
  if (swept < -1e-9) swept += 2 * Math.PI;
  return { r, swept };
}
export function hohmannPlan(targetId, parkKm) {
  const r1 = AU * PLANETS.earth.aAU, r2 = AU * PLANETS[targetId].aAU, H = hohmann(r1, r2);
  const rPark = R_EARTH + parkKm * 1000, vPark = vCirc(rPark), vInf = H.dv1;
  const dvDepart = Math.sqrt(vInf * vInf + 2 * MU_EARTH / rPark) - vPark;  // burn from the parking orbit (Oberth)
  const phase = wrapPi(H.phaseRad);
  return { ...H, r1, r2, rPark, vPark, vInf, dvDepart, phaseDeg: phase * 180 / Math.PI, days: H.tTransfer / DAY, synodicDays: H.synodic / DAY };
}

// ---------- rocket builder (sandbox and launch) ----------
// Masses in tonnes. Numbers are rounded, Falcon-9-like where noted in the docs.
export const PARTS = Object.freeze({
  top: Object.freeze({
    ogive: Object.freeze({ name: "Ogive nose cone", t: 0.3, drop: false }),
    conical: Object.freeze({ name: "Conical nose cone", t: 0.25, drop: false }),
    fairing: Object.freeze({ name: "Payload fairing", t: 1.9, drop: true }),
    capsule: Object.freeze({ name: "Crew capsule + escape tower", t: 4.0, drop: true })
  }),
  tank: Object.freeze({
    small: Object.freeze({ name: "Small", prop: 100, dry: 7 }),
    medium: Object.freeze({ name: "Medium", prop: 200, dry: 12 }),
    large: Object.freeze({ name: "Large", prop: 395, dry: 22 })
  }),
  engine: Object.freeze({
    single: Object.freeze({ name: "One engine", n: 1, dry: 1.0 }),
    cluster: Object.freeze({ name: "Three-engine cluster", n: 3, dry: 3.0 })
  })
});
export const CORE_ENGINE = Object.freeze({ thrustSl: 2.5e6, ispSl: 282, ispVac: 311 });     // per engine (Merlin-1D-like)
export const UPPER = Object.freeze({ prop: 92, dry: 4, thrustVac: 981e3, ispVac: 348, interstage: 1.0 }); // Merlin Vacuum-like
export const BOOSTER = Object.freeze({ prop: 40, dry: 6, thrustSl: 1.5e6, ispSl: 242, ispVac: 268 });   // each; SRB-like Isp
export const FINS_T = 0.5;
export const CORE_D = 3.66, BOOSTER_D = 1.37;   // m
export const CD = 0.4;
export const DROP_KM = 110;                       // fairing or tower jettison altitude
export const LAUNCH_PRESET = Object.freeze({ top: "fairing", upper: true, tank: "large", engine: "cluster", boosters: 0, fins: false, payload: 10 });
export const TARGET_KM = 200;

/** Stage breakdown of a build. */
export function buildRocket(c) {
  const top = PARTS.top[c.top], tank = PARTS.tank[c.tank], eng = PARTS.engine[c.engine];
  const nb = c.boosters || 0;
  const core = { prop: tank.prop * 1000, dry: (tank.dry + eng.dry + (c.fins ? FINS_T : 0) + (c.upper ? UPPER.interstage : 0)) * 1000,
    mdot: eng.n * CORE_ENGINE.thrustSl / (G0 * CORE_ENGINE.ispSl), ispSl: CORE_ENGINE.ispSl, ispVac: CORE_ENGINE.ispVac };
  const boost = nb ? { n: nb, prop: nb * BOOSTER.prop * 1000, dry: nb * BOOSTER.dry * 1000, mdot: nb * BOOSTER.thrustSl / (G0 * BOOSTER.ispSl), ispSl: BOOSTER.ispSl, ispVac: BOOSTER.ispVac } : null;
  const upper = c.upper ? { prop: UPPER.prop * 1000, dry: UPPER.dry * 1000, mdot: UPPER.thrustVac / (G0 * UPPER.ispVac), ispSl: UPPER.ispVac, ispVac: UPPER.ispVac } : null;
  const topKg = top.t * 1000, payload = c.payload * 1000;
  const m0 = core.prop + core.dry + (boost ? boost.prop + boost.dry : 0) + (upper ? upper.prop + upper.dry : 0) + topKg + payload;
  const F0 = core.mdot * G0 * core.ispSl + (boost ? boost.mdot * G0 * boost.ispSl : 0);
  const area = Math.PI * (CORE_D / 2) ** 2 + nb * Math.PI * (BOOSTER_D / 2) ** 2;
  const cd = CD + (c.fins ? 0.1 : 0);
  return { core, boost, upper, topKg, topDrops: top.drop, payload, m0, F0, twr0: F0 / (m0 * G0), area, cd };
}
/** Ideal (vacuum, no gravity or drag) delta-v of a build, stage by stage. */
export function idealDv(c) {
  const b = buildRocket(c);
  let m = b.m0, dv = 0;
  const veC = G0 * b.core.ispVac;
  let coreProp = b.core.prop;
  if (b.boost) {
    const tb = b.boost.prop / b.boost.mdot;
    const coreUsed = Math.min(coreProp, b.core.mdot * tb);
    const mdotSum = b.boost.mdot + b.core.mdot;
    const veEff = (b.boost.mdot * G0 * b.boost.ispVac + b.core.mdot * G0 * b.core.ispVac) / mdotSum;
    const burnt = b.boost.prop + coreUsed;
    dv += veEff * Math.log(m / (m - burnt)); m -= burnt + b.boost.dry; coreProp -= coreUsed;
  }
  dv += veC * Math.log(m / (m - coreProp)); m -= coreProp + b.core.dry;
  if (b.upper) { const veU = G0 * b.upper.ispVac; dv += veU * Math.log(m / (m - b.upper.prop)); }
  return dv;
}

/** Fly a build: 2D, point mass, non-rotating spherical Earth, exponential atmosphere.
 *  Gravity turn: straight up to 60 m/s, tip over by kickDeg, then thrust along the velocity.
 *  The upper stage steers to level off near TARGET_KM and cuts off at circular speed. */
export function simulate(c, kickDeg, opt = {}) {
  const b = buildRocket(c), dt = opt.dt || 0.2;
  const out = { pts: [], events: [], twr0: b.twr0 };
  if (b.twr0 <= 1) { out.result = { kind: "pad", maxKm: 0, vMax: 0 }; out.pts.push({ t: 0, d: 0, h: 0, v: 0, ang: 0, stage: 1, burning: false }); return out; }
  let x = 0, y = R_EARTH, vx = 0, vy = 0, t = 0;
  let coreProp = b.core.prop, bProp = b.boost ? b.boost.prop : 0, uProp = b.upper ? b.upper.prop : 0;
  let mass = b.m0, stage = 1, kicked = false, topOn = b.topKg > 0 && b.topDrops, coast = 0, cut = false;
  let gravLoss = 0, dragLoss = 0, maxQ = 0, vMax = 0, hMax = 0, ignitedUpper = false, landed = false;
  const event = (k) => out.events.push({ t, k, km: (Math.hypot(x, y) - R_EARTH) / 1000 });
  const push = (burning) => {
    const r = Math.hypot(x, y), th = Math.atan2(x, y), ur = [x / r, y / r], ut = [ur[1], -ur[0]];
    const vr = vx * ur[0] + vy * ur[1], vt = vx * ut[0] + vy * ut[1];
    out.pts.push({ t, d: R_EARTH * th, h: r - R_EARTH, v: Math.hypot(vx, vy), ang: Math.atan2(vr, vt), stage, burning });
  };
  push(true);
  const tMaxPowered = 2000;
  while (t < tMaxPowered) {
    const r = Math.hypot(x, y), h = r - R_EARTH, ur = [x / r, y / r], ut = [ur[1], -ur[0]];
    const vr = vx * ur[0] + vy * ur[1], vt = vx * ut[0] + vy * ut[1], v = Math.hypot(vx, vy);
    if (h < -1 && t > 5) { landed = true; break; }
    const rho = airDensity(h), q = 0.5 * rho * v * v; if (q > maxQ) maxQ = q;
    const frac = rho / RHO0;
    let F = 0, mdot = 0, dir = null;
    if (stage === 1) {
      if (coreProp > 0) { const isp = b.core.ispVac - (b.core.ispVac - b.core.ispSl) * frac; F += b.core.mdot * G0 * isp; mdot += b.core.mdot; }
      if (bProp > 0) { const isp = b.boost.ispVac - (b.boost.ispVac - b.boost.ispSl) * frac; F += b.boost.mdot * G0 * isp; mdot += b.boost.mdot; }
      if (!kicked && v >= 60) { kicked = true; const a = kickDeg * Math.PI / 180, nr = v * Math.cos(a), nt = v * Math.sin(a); vx = ur[0] * nr + ut[0] * nt; vy = ur[1] * nr + ut[1] * nt; }
      dir = !kicked || v < 1 ? ur : [vx / v, vy / v];
    } else if (stage === 2 && !cut) {
      if (coast > 0) coast -= dt;
      else if (uProp > 0) {
        if (!ignitedUpper) { ignitedUpper = true; event("upper"); }
        F = b.upper.mdot * G0 * b.upper.ispVac; mdot = b.upper.mdot;
        // Hold altitude near the target: cancel gravity minus the "centrifugal" term, then nudge the climb rate.
        const gEff = MU_EARTH / (r * r) - vt * vt / r, acc = F / mass;
        const vrDes = Math.max(-100, Math.min(100, (TARGET_KM * 1000 - h) / 100));
        const aR = gEff + (vrDes - vr) / 40;
        const pitch = Math.asin(Math.max(-0.7, Math.min(0.9, aR / acc)));
        dir = [ur[0] * Math.sin(pitch) + ut[0] * Math.cos(pitch), ur[1] * Math.sin(pitch) + ut[1] * Math.cos(pitch)];
        if (stateOrbit(x, y, vx, vy).rp - R_EARTH >= Math.min(TARGET_KM * 1000, 0.9 * h)) { cut = true; F = 0; mdot = 0; event("cutoff"); }
      }
    }
    if (F === 0 && (stage === 1 || cut || uProp <= 0 || !b.upper) && !(stage === 2 && coast > 0)) {
      if (stage === 1 && b.upper) { stage = 2; coast = 3; mass -= b.core.dry + Math.max(0, coreProp); coreProp = 0; event("staging"); continue; }
      break;
    }
    const gr = MU_EARTH / (r * r), D = q * b.cd * (stage === 1 ? b.area : Math.PI * (CORE_D / 2) ** 2);
    const ax = (dir ? F * dir[0] : 0) / mass - gr * ur[0] - (v > 0 ? D / mass * vx / v : 0);
    const ay = (dir ? F * dir[1] : 0) / mass - gr * ur[1] - (v > 0 ? D / mass * vy / v : 0);
    if (F > 0) { gravLoss += gr * (v > 1 ? vr / v : 1) * dt; dragLoss += D / mass * dt; }
    vx += ax * dt; vy += ay * dt; x += vx * dt; y += vy * dt; t += dt;
    const used = mdot * dt; mass -= used;
    if (stage === 1) {
      if (bProp > 0) { bProp -= b.boost.mdot * dt; if (bProp <= 0) { mass -= b.boost.dry; event("boosters"); } }
      if (coreProp > 0) { coreProp -= b.core.mdot * dt; if (coreProp <= 0) event("meco"); }
    } else if (F > 0) { uProp -= mdot * dt; if (uProp <= 0) event("seco"); }
    if (topOn && h > DROP_KM * 1000) { topOn = false; mass -= b.topKg; event("fairing"); }
    vMax = Math.max(vMax, Math.hypot(vx, vy)); hMax = Math.max(hMax, h);
    if (Math.round(t / dt) % 5 === 0) push(F > 0);
  }
  push(false);
  const orb = stateOrbit(x, y, vx, vy);
  const periKm = (orb.rp - R_EARTH) / 1000, apoKm = (orb.ra - R_EARTH) / 1000;
  // ballistic coast for the picture (and the impact point when it falls back)
  let tc = 0;
  const coastS = opt.coastS ?? (orb.rp > R_EARTH ? 300 : 4000);
  while (!landed && tc < coastS) {
    const r = Math.hypot(x, y), h = r - R_EARTH; if (h < 0) { landed = true; break; }
    const v = Math.hypot(vx, vy), gr = MU_EARTH / (r * r), D = 0.5 * airDensity(h) * v * v * b.cd * Math.PI * (CORE_D / 2) ** 2;
    const m = Math.max(mass, 1);
    vx += (-gr * x / r - D / m * vx / v) * dt * 5; vy += (-gr * y / r - D / m * vy / v) * dt * 5;
    x += vx * dt * 5; y += vy * dt * 5; tc += dt * 5; t += dt * 5;
    hMax = Math.max(hMax, h);
    if (Math.round(tc / dt) % 25 === 0) push(false);
  }
  push(false);
  const kind = !isFinite(orb.ra) ? "escape" : periKm >= ORBIT_OK_KM ? "orbit" : periKm > 0 ? "low" : "suborbital";
  out.result = { kind, periKm, apoKm, maxKm: kind === "orbit" ? apoKm : Math.max(hMax / 1000, isFinite(apoKm) ? apoKm : 0), vMax, gravLoss, dragLoss, maxQ, ideal: idealDv(c), escape: !isFinite(orb.ra) };
  return out;
}
export const KICKS = Object.freeze({ small: 0.4, medium: 2, big: 5 });

// ---------- sliders ----------
export const SLIDERS = Object.freeze({
  mdot: Object.freeze({ min: 10, max: 3000, steps: 240, log: true }),        // kg/s
  ve: Object.freeze({ min: 1000, max: 4600, steps: 360, log: false }),       // m/s, 10 m/s steps
  mass: Object.freeze({ min: 5, max: 3000, steps: 240, log: true }),         // t
  ratio: Object.freeze({ min: 1.1, max: 20, steps: 240, log: true }),
  payloadFrac: Object.freeze({ min: 0.005, max: 0.1, steps: 120, log: true }),
  struct: Object.freeze({ min: 0.04, max: 0.2, steps: 80, log: false }),
  altLaunch: Object.freeze({ min: 160, max: 2000, steps: 184, log: false }), // km, 10 km steps
  speed: Object.freeze({ min: 6, max: 12, steps: 300, log: false }),        // km/s
  altOrbit: Object.freeze({ min: 200, max: 2000, steps: 180, log: false }), // km
  park: Object.freeze({ min: 200, max: 1000, steps: 80, log: false }),      // km
  payload: Object.freeze({ min: 0.1, max: 30, steps: 240, log: true })      // t
});
export function fromSlider(name, step) {
  const s = SLIDERS[name], u = Math.min(s.steps, Math.max(0, Math.round(step))) / s.steps;
  return s.log ? s.min * (s.max / s.min) ** u : s.min + (s.max - s.min) * u;
}
export function toSlider(name, value) {
  const s = SLIDERS[name];
  const u = s.log ? Math.log(value / s.min) / Math.log(s.max / s.min) : (value - s.min) / (s.max - s.min);
  return Math.min(s.steps, Math.max(0, Math.round(u * s.steps)));
}

// ---------- what each mode shows ----------
// Numbers the page prints for a state (SI). null means the page prints words instead.
export function orbitShot(altKm, speedKms) {
  const r = R_EARTH + altKm * 1000, v = speedKms * 1000, o = horizontalShot(r, v);
  const vc = vCirc(r), ve = vEsc(r);
  let kind = "escape";
  if (v >= ve) kind = "escape";
  else if (v >= vc) kind = "orbit";
  else kind = o.rp < R_EARTH ? "falls" : "lower";
  const far = v >= 0.97 * ve;
  return { r, v, vc, ve, o, kind, far };
}
export function shown(mode, s) {
  switch (mode) {
    case "thrust": {
      const F = thrust(s.mdot, s.ve), m = s.mass * 1000;
      const r = twr(F, m);
      // starting acceleration is printed only once it is clearly above zero (words below that)
      return { mdot: s.mdot, ve: s.ve, F, W: weight(m), twr: r, mass: s.mass, isp: ispFromVe(s.ve), accel: r >= 1.1 ? (F - weight(m)) / m : null };
    }
    case "equation": {
      const ve = veFromIsp(ENGINES[s.engine].ispVac);
      return { ratio: s.ratio, ve, dv: deltaV(ve, s.ratio, 1), propPct: 100 * propFraction(s.ratio) };
    }
    case "staging": {
      const ve = veFromIsp(ENGINES[s.engine].ispVac), S = staging(ve, s.payloadFrac, s.struct);
      return { payloadPct: 100 * s.payloadFrac, structPct: 100 * s.struct, dv1: S.dv1, dv2: S.dv2, gain: S.gain, gainPct: 100 * S.gain / S.dv1, r1: S.r1, r2: S.r2 };
    }
    case "launch": {
      const r = R_EARTH + s.alt * 1000;
      return { alt: s.alt, vOrb: vCirc(r), periodMin: period(r) / 60, g: gAt(r) };
    }
    case "orbits": {
      const k = orbitShot(s.alt, s.speed);
      const showApo = k.kind === "orbit" && !k.far, showPeri = k.kind === "lower" && k.o.rp - R_EARTH > 100e3;
      return {
        v: k.v, vc: k.vc, ve: k.ve, alt: s.alt,
        apoKm: showApo ? (k.o.ra - R_EARTH) / 1000 : null,
        periKm: showPeri ? (k.o.rp - R_EARTH) / 1000 : null,
        periodMin: (showApo || showPeri) ? k.o.periodS / 60 : null
      };
    }
    case "hohmann": {
      const P = hohmannPlan(s.target, s.park);
      return { park: s.park, dvDepart: P.dvDepart, vPark: P.vPark, dv1: P.dv1, dv2: P.dv2, days: P.days, synodicDays: P.synodicDays, phase: Math.abs(P.phaseDeg) };
    }
    default: {
      const b = buildRocket(s);
      return { payload: s.payload, m0: b.m0 / 1000, twr0: b.twr0, ideal: idealDv(s) };
    }
  }
}

export const MODES = Object.freeze(["thrust", "equation", "staging", "launch", "orbits", "hohmann", "sandbox"]);
export const MODE_ALIASES = Object.freeze({
  thrust: "thrust", newton: "thrust", "third-law": "thrust", "newtons-third-law": "thrust",
  equation: "equation", "rocket-equation": "equation", tsiolkovsky: "equation", "delta-v": "equation", isp: "equation",
  staging: "staging", stages: "staging",
  launch: "launch", ascent: "launch", "gravity-turn": "launch", "launch-to-orbit": "launch",
  orbits: "orbits", orbit: "orbits", escape: "orbits", "escape-velocity": "orbits", cannonball: "orbits",
  hohmann: "hohmann", mars: "hohmann", transfer: "hohmann", "launch-window": "hohmann",
  sandbox: "sandbox", free: "sandbox", play: "sandbox", build: "sandbox", builder: "sandbox"
});
export function parseQuery(search) {
  const p = new URLSearchParams(typeof search === "string" ? search : "");
  const raw = (p.get("mode") || "").trim().toLowerCase();
  return { mode: MODE_ALIASES[raw] || "thrust" };
}

// ---------- formatting ----------
export function sig(x, d = 3) {
  if (!isFinite(x)) return "\u2013";
  if (x === 0) return "0";
  return String(Number(x.toPrecision(d)));
}
const minus = (s) => s.replace("-", "\u2212");
export const kms = (v, d = 3) => minus(sig(v / 1000, d)) + " km/s";
export const kmF = (km, d = 3) => minus(sig(km, d)) + " km";
export function force(F) {
  if (F >= 1e6) return sig(F / 1e6) + " MN";
  if (F >= 1e3) return sig(F / 1e3) + " kN";
  return sig(F) + " N";
}
export function tonnes(t) { return t >= 1 ? sig(t) + " t" : sig(t * 1000) + " kg"; }
export const days = (d) => sig(d) + " days";
