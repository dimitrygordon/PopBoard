/**
 * PopBoard relativity study module — pure physics, SI units.
 *
 * Special relativity uses an invariant mass m. E = γ m c² is the total
 * energy. There is no relativistic mass. Momentum is p = γ m v.
 *
 * Schwarzschild orbits are stepped in φ:
 *   u'' + u = G M / h² + 3 G M u² / c²,   u = 1/r
 *   h = r² dφ/dτ
 *   E = (1 − r_s/r) dt/dτ          (energy per unit rest energy)
 *   dt/dφ = r² E / (h (1 − r_s/r))
 * so a Newtonian comparison particle can share the same coordinate clock.
 * If u ≥ 1/r_s the step stops: the worldline crossed the horizon.
 *
 * Static hovering clocks run at √(1 − r_s/r). Orbiting clocks use
 *   dτ/dt = √[ (1−r_s/r) − (1−r_s/r)⁻¹ (dr/dt)²/c² − r² (dφ/dt)²/c² ]
 * which is √(1 − 1.5 r_s/r) on a circular orbit (zero at the photon sphere).
 * The GPS "about" numbers are the weak-field sum, not that exact rate.
 *
 * The Flamm paraboloid z = 2 √(r_s (r − r_s)) is only the exterior spatial
 * geometry of a constant-t slice. It stops at a star's surface and at a
 * black hole's horizon. Several masses use Φ = −Σ G M / r instead.
 */
"use strict";

export const C = 299792458;
export const G = 6.6743e-11;
export const M_SUN = 1.98847e30;
export const R_SUN = 6.957e8;
export const M_EARTH = 5.9722e24;
export const R_EARTH = 6.371e6;
export const AU = 1.495978707e11;
export const DAY = 86400;

/** Julian century / Mercury's sidereal period. a, e from standard elements. */
export const MERCURY = Object.freeze({
  a: 5.790905e10,
  e: 0.20563,
  periodDays: 87.9691
});

/** GPS orbit radius that reproduces the classroom weak-field offsets. */
export const GPS_RADIUS = 2.656e7;

export const GPS_ABOUT = Object.freeze({
  gravitationalUsPerDay: 45.7,
  velocityUsPerDay: -7.2,
  netUsPerDay: 38.5
});

/** Critical photon impact parameter in units of r_s: (3 √3 / 2) ≈ 2.598. */
export const CRITICAL_B_OVER_RS = (3 * Math.sqrt(3)) / 2;

export const BODY_PRESETS = Object.freeze({
  earth: { id: "earth", name: "Earth", mass: M_EARTH, surfaceRadius: R_EARTH, kind: "planet", spin: null },
  sun: { id: "sun", name: "Sun", mass: M_SUN, surfaceRadius: R_SUN, kind: "star", spin: null },
  neutron: { id: "neutron", name: "Neutron star", mass: 1.4 * M_SUN, surfaceRadius: 12000, kind: "star", spin: null },
  "black-hole": {
    id: "black-hole",
    name: "Stellar black hole",
    mass: 10 * M_SUN,
    surfaceRadius: null,
    kind: "blackhole",
    spin: "non-rotating (Schwarzschild)"
  }
});

export const MODES = Object.freeze([
  { id: "sr", label: "Special relativity" },
  { id: "gravity", label: "Gravity & orbits" },
  { id: "curvature", label: "Curvature" },
  { id: "clocks", label: "Clocks" },
  { id: "lensing", label: "Light bending" },
  { id: "guided", label: "Challenges" }
]);

export const MODE_ALIASES = Object.freeze({
  sr: "sr",
  special: "sr",
  relativity: "sr",
  gravity: "gravity",
  orbits: "gravity",
  orbit: "gravity",
  curvature: "curvature",
  embed: "curvature",
  flamm: "curvature",
  clocks: "clocks",
  time: "clocks",
  dilation: "clocks",
  gps: "clocks",
  lensing: "lensing",
  light: "lensing",
  deflection: "lensing",
  guided: "guided",
  challenges: "guided",
  challenge: "guided"
});

export function clamp(x, a, b) {
  return Math.max(a, Math.min(b, x));
}

export function betaOf(v, c = C) {
  return v / c;
}

export function gamma(beta) {
  const b2 = beta * beta;
  if (!(b2 < 1)) return Infinity;
  return 1 / Math.sqrt(1 - b2);
}

/**
 * γ − 1 without cancellation at small β.
 *   γ − 1 = β² / [√(1−β²) (1 + √(1−β²))]
 */
export function gammaMinusOne(beta) {
  const b2 = beta * beta;
  if (!(b2 < 1)) return Infinity;
  if (b2 === 0) return 0;
  const s = Math.sqrt(1 - b2);
  return b2 / (s * (1 + s));
}

export function gammaFromVelocity(v, c = C) {
  return gamma(v / c);
}

/** Speed parameter for a chosen gamma. gamma = 2 → √(3)/2 ≈ 0.866. */
export function betaForGamma(g) {
  if (!(g >= 1) || !Number.isFinite(g)) return NaN;
  return Math.sqrt(1 - 1 / (g * g));
}

/** Keep |v| strictly below c so addition stays inside the domain. */
export function clampSpeed(v, c = C) {
  const lim = c * (1 - 1e-15);
  if (v >= lim) return lim;
  if (v <= -lim) return -lim;
  return v;
}

/**
 * Station frame → ship frame. The ship moves at +v along x.
 *   x' = γ (x − v t),  t' = γ (t − v x / c²)
 */
export function lorentz(x, t, v, c = C) {
  const g = gammaFromVelocity(v, c);
  return { x: g * (x - v * t), t: g * (t - (v * x) / (c * c)) };
}

export function inverseLorentz(xp, tp, v, c = C) {
  const g = gammaFromVelocity(v, c);
  return { x: g * (xp + v * tp), t: g * (tp + (v * xp) / (c * c)) };
}

/** s² = (c t)² − x². Same in every inertial frame. */
export function interval(x, t, c = C) {
  return (c * t) * (c * t) - x * x;
}

export function velocityAddition(u, v, c = C) {
  const uu = clampSpeed(u, c);
  const vv = clampSpeed(v, c);
  const w = (uu + vv) / (1 + (uu * vv) / (c * c));
  return clampSpeed(w, c);
}

export function galileanAddition(u, v) {
  return u + v;
}

export function restEnergy(m, c = C) {
  return m * c * c;
}

/** Total energy E = γ m c². m is the invariant mass. */
export function totalEnergy(m, v, c = C) {
  return gammaFromVelocity(v, c) * m * c * c;
}

/** KE = (γ − 1) m c², with γ − 1 evaluated so a slow particle matches ½mv². */
export function kineticEnergy(m, v, c = C) {
  return gammaMinusOne(v / c) * m * c * c;
}

export function newtonianKineticEnergy(m, v) {
  return 0.5 * m * v * v;
}

/** p = γ m v. */
export function momentum(m, v, c = C) {
  return gammaFromVelocity(v, c) * m * v;
}

/** Only the length parallel to the motion contracts. */
export function lengthContraction(properLength, beta) {
  const g = gamma(beta);
  return { parallel: properLength / g, transverse: properLength, gamma: g };
}

/**
 * Light clock of proper height L. The ship sees a vertical round trip.
 * The station sees a diagonal. Both path-length / time results equal c.
 */
export function lightClock(length, v, c = C) {
  const g = gammaFromVelocity(v, c);
  const properTime = (2 * length) / c;
  const coordinateTime = g * properTime;
  const halfHorizontal = Math.abs(v) * coordinateTime / 2;
  const leg = Math.hypot(length, halfHorizontal);
  const pathStation = 2 * leg;
  return {
    properTime,
    coordinateTime,
    pathShip: 2 * length,
    pathStation,
    cShip: (2 * length) / properTime,
    cStation: pathStation / coordinateTime,
    halfHorizontal,
    leg
  };
}

function timeOrder(tRear, tFront) {
  const d = tFront - tRear;
  if (Math.abs(d) <= 1e-12 * (1 + Math.abs(tFront) + Math.abs(tRear))) return "simultaneous";
  return d > 0 ? "rear-first" : "front-first";
}

/**
 * Flashes at the two ends of a ship of proper length L0.
 * simultaneousIn is "ship" or "station".
 * Rear is the −x end, front is the +x end, ship velocity +v.
 * Returns coordinate times of each flash in both frames.
 */
export function endFlashTimes(L0, v, simultaneousIn = "ship", c = C) {
  const g = gammaFromVelocity(v, c);
  if (simultaneousIn === "ship") {
    const rear = inverseLorentz(-L0 / 2, 0, v, c);
    const front = inverseLorentz(L0 / 2, 0, v, c);
    return {
      simultaneousIn: "ship",
      ship: { tRear: 0, tFront: 0, order: "simultaneous" },
      station: { tRear: rear.t, tFront: front.t, order: timeOrder(rear.t, front.t) }
    };
  }
  const L = L0 / g;
  const rear = lorentz(-L / 2, 0, v, c);
  const front = lorentz(L / 2, 0, v, c);
  return {
    simultaneousIn: "station",
    station: { tRear: 0, tFront: 0, order: "simultaneous" },
    ship: { tRear: rear.t, tFront: front.t, order: timeOrder(rear.t, front.t) }
  };
}

/**
 * Out-and-back trip, instantaneous turnaround.
 * The age gap is the difference of Minkowski path lengths.
 * simultaneityJump is how far the traveler's "now" on Earth leaps at the turn.
 */
export function twinParadox(v, stationTime, c = C) {
  const beta = v / c;
  const g = gamma(beta);
  const tTurn = stationTime / 2;
  const tBefore = tTurn * (1 - beta * beta);
  const tAfter = tTurn * (1 + beta * beta);
  const travelerProper = stationTime / g;
  return {
    stationTime,
    travelerProper,
    ageGap: stationTime - travelerProper,
    turnaround: { t: tTurn, x: v * tTurn },
    simultaneityBefore: tBefore,
    simultaneityAfter: tAfter,
    simultaneityJump: tAfter - tBefore,
    cause: "different spacetime path"
  };
}

export function energySamples(mass, count = 48, c = C) {
  const samples = [];
  const n = Math.max(2, count);
  for (let i = 0; i < n; i++) {
    const beta = (i / (n - 1)) * 0.999;
    const v = beta * c;
    samples.push({
      beta,
      v,
      rest: restEnergy(mass, c),
      total: totalEnergy(mass, v, c),
      kinetic: kineticEnergy(mass, v, c),
      newtonian: newtonianKineticEnergy(mass, v)
    });
  }
  return samples;
}

export function schwarzschildRadius(mass, g = G, c = C) {
  return (2 * g * mass) / (c * c);
}

export function photonSphereRadius(mass, g = G, c = C) {
  return 1.5 * schwarzschildRadius(mass, g, c);
}

/** Innermost stable circular orbit, 6 G M / c² = 3 r_s. */
export function iscoRadius(mass, g = G, c = C) {
  return 3 * schwarzschildRadius(mass, g, c);
}

export function criticalImpactParameter(rs) {
  return CRITICAL_B_OVER_RS * rs;
}

export function presetBody(id, x = 0, y = 0) {
  const src = BODY_PRESETS[id];
  if (!src) throw new Error("unknown body preset " + id);
  const rs = schwarzschildRadius(src.mass);
  return {
    id: src.id,
    name: src.name,
    mass: src.mass,
    surfaceRadius: src.surfaceRadius,
    kind: src.kind,
    spin: src.spin,
    x,
    y,
    rs,
    photonSphere: 1.5 * rs,
    isco: 3 * rs
  };
}

export function gravitationalField(x, y, bodies) {
  let gx = 0;
  let gy = 0;
  for (let i = 0; i < bodies.length; i++) {
    const b = bodies[i];
    const dx = x - b.x;
    const dy = y - b.y;
    const r2 = dx * dx + dy * dy;
    const r = Math.sqrt(r2);
    if (!(r > 1e-6)) continue;
    const a = (G * b.mass) / r2;
    gx -= (a * dx) / r;
    gy -= (a * dy) / r;
  }
  return { gx, gy, g: Math.hypot(gx, gy) };
}

export function gravitationalPotential(x, y, bodies) {
  let phi = 0;
  for (let i = 0; i < bodies.length; i++) {
    const b = bodies[i];
    const r = Math.hypot(x - b.x, y - b.y);
    if (!(r > 1e-6)) continue;
    phi -= (G * b.mass) / r;
  }
  return phi;
}

export function specificMechanicalEnergy(x, y, vx, vy, bodies) {
  return 0.5 * (vx * vx + vy * vy) + gravitationalPotential(x, y, bodies);
}

export function rk4Newtonian(p, dt, bodies) {
  function acc(x, y) {
    return gravitationalField(x, y, bodies);
  }
  const a1 = acc(p.x, p.y);
  const v2x = p.vx + 0.5 * dt * a1.gx;
  const v2y = p.vy + 0.5 * dt * a1.gy;
  const a2 = acc(p.x + 0.5 * dt * p.vx, p.y + 0.5 * dt * p.vy);
  const v3x = p.vx + 0.5 * dt * a2.gx;
  const v3y = p.vy + 0.5 * dt * a2.gy;
  const a3 = acc(p.x + 0.5 * dt * v2x, p.y + 0.5 * dt * v2y);
  const v4x = p.vx + dt * a3.gx;
  const v4y = p.vy + dt * a3.gy;
  const a4 = acc(p.x + dt * v3x, p.y + dt * v3y);
  return {
    x: p.x + (dt / 6) * (p.vx + 2 * v2x + 2 * v3x + v4x),
    y: p.y + (dt / 6) * (p.vy + 2 * v2y + 2 * v3y + v4y),
    vx: p.vx + (dt / 6) * (a1.gx + 2 * a2.gx + 2 * a3.gx + a4.gx),
    vy: p.vy + (dt / 6) * (a1.gy + 2 * a2.gy + 2 * a3.gy + a4.gy)
  };
}

/** Velocity Verlet. Stores ax, ay so the next call reuses the new acceleration. */
export function verletNewtonian(p, dt, bodies) {
  const a0 = p.ax == null ? gravitationalField(p.x, p.y, bodies) : { gx: p.ax, gy: p.ay };
  const x = p.x + p.vx * dt + 0.5 * a0.gx * dt * dt;
  const y = p.y + p.vy * dt + 0.5 * a0.gy * dt * dt;
  const a1 = gravitationalField(x, y, bodies);
  return {
    x,
    y,
    vx: p.vx + 0.5 * (a0.gx + a1.gx) * dt,
    vy: p.vy + 0.5 * (a0.gy + a1.gy) * dt,
    ax: a1.gx,
    ay: a1.gy
  };
}

export function integrateNewtonian(p, dt, bodies, substep) {
  if (!(dt > 0)) return { x: p.x, y: p.y, vx: p.vx, vy: p.vy };
  const h = substep > 0 ? substep : dt;
  let left = dt;
  let cur = { x: p.x, y: p.y, vx: p.vx, vy: p.vy };
  let guard = 0;
  while (left > 1e-15 && guard < 2000000) {
    const step = Math.min(h, left);
    cur = rk4Newtonian(cur, step, bodies);
    left -= step;
    guard += 1;
  }
  return cur;
}

/** u'' for the Schwarzschild orbit equation, derivative with respect to φ. */
export function orbitEquationAccel(u, h, mass, c = C) {
  const mu = G * mass;
  return -u + mu / (h * h) + (3 * mu * u * u) / (c * c);
}

export function coordinateDtDphi(r, E, h, rs) {
  const f = 1 - rs / r;
  if (!(f > 0) || !(h !== 0)) return Infinity;
  return (r * r * E) / (h * f);
}

/**
 * RK4 step in φ. E is dimensionless energy per unit rest energy.
 * Coordinate time advances by dt/dφ = r² E / (h (1 − r_s/r)).
 * A step that reaches u ≥ 1/r_s is marked crossed and is not continued.
 */
export function stepSchwarzschild(state, dphi, c = C, pnFactor = 1) {
  if (state.crossed) return state;
  const accel = (u) => {
    const mu = G * state.mass;
    return -u + mu / (state.h * state.h) + pnFactor * (3 * mu * u * u) / (c * c);
  };
  const u1 = state.u;
  const p1 = state.up;
  const a1 = accel(u1);
  const p2 = p1 + 0.5 * dphi * a1;
  const u2 = u1 + 0.5 * dphi * p1;
  const a2 = accel(u2);
  const p3 = p1 + 0.5 * dphi * a2;
  const u3 = u1 + 0.5 * dphi * p2;
  const a3 = accel(u3);
  const p4 = p1 + dphi * a3;
  const u4 = u1 + dphi * p3;
  const a4 = accel(u4);
  const u = u1 + (dphi / 6) * (p1 + 2 * p2 + 2 * p3 + p4);
  const up = p1 + (dphi / 6) * (a1 + 2 * a2 + 2 * a3 + a4);
  const phi = state.phi + dphi;
  const rs = state.rs;
  if (!(u > 0) || u >= 1 / rs) {
    return {
      u: Math.max(u, 1 / rs),
      up,
      phi,
      t: state.t,
      tau: state.tau,
      h: state.h,
      E: state.E,
      mass: state.mass,
      rs,
      crossed: true,
      r: rs
    };
  }
  const r = 1 / u;
  const f = 1 - rs / r;
  const dt = ((r * r * state.E) / (state.h * f)) * dphi;
  const dtau = (r * r / state.h) * dphi;
  return {
    u,
    up,
    phi,
    t: state.t + dt,
    tau: state.tau + dtau,
    h: state.h,
    E: state.E,
    mass: state.mass,
    rs,
    crossed: false,
    r
  };
}

/**
 * Advance coordinate time by dtTarget, stepping in φ.
 * Newtonian and Schwarzschild particles that start together can then
 * be compared at the same t. Stops with crossed = true at the horizon.
 */
export function advanceSchwarzschild(state, dtTarget, c = C) {
  if (state.crossed || !(dtTarget > 0)) return state;
  const tGoal = state.t + dtTarget;
  let s = state;
  let guard = 0;
  while (s.t < tGoal && !s.crossed && guard < 200000) {
    const r = 1 / s.u;
    if (!(r > s.rs * 1.0000001)) {
      return { ...s, crossed: true, r: s.rs, u: 1 / s.rs };
    }
    const slope = coordinateDtDphi(r, s.E, s.h, s.rs);
    const remain = tGoal - s.t;
    let dphi = 0.004;
    if (Number.isFinite(slope) && slope > 0) dphi = remain / slope;
    if (dphi > 0.02) dphi = 0.02;
    if (dphi < 1e-7) dphi = 1e-7;
    const next = stepSchwarzschild(s, dphi, c);
    if (!next.crossed && next.t > tGoal && next.t > s.t) {
      const frac = (tGoal - s.t) / (next.t - s.t);
      return {
        ...next,
        u: s.u + (next.u - s.u) * frac,
        up: s.up + (next.up - s.up) * frac,
        phi: s.phi + (next.phi - s.phi) * frac,
        t: tGoal,
        tau: s.tau + (next.tau - s.tau) * frac,
        r: 1 / (s.u + (next.u - s.u) * frac)
      };
    }
    s = next;
    guard += 1;
  }
  return s;
}

/**
 * Circular timelike geodesic. Returns null at and inside the photon sphere,
 * where no circular massive orbit exists. stable is false inside the ISCO.
 */
export function circularGeodesic(r, mass, c = C) {
  const rs = schwarzschildRadius(mass);
  if (!(r > 1.5 * rs)) return null;
  const denom = r - 1.5 * rs;
  const h = Math.sqrt((G * mass * r * r) / denom);
  const E = (1 - rs / r) / Math.sqrt(1 - (1.5 * rs) / r);
  return {
    r,
    u: 1 / r,
    up: 0,
    phi: 0,
    t: 0,
    tau: 0,
    h,
    E,
    mass,
    rs,
    crossed: false,
    stable: r >= 3 * rs - rs * 1e-9
  };
}

export function schwarzschildPosition(state, cx = 0, cy = 0) {
  const r = state.r || 1 / state.u;
  return {
    x: cx + r * Math.cos(state.phi),
    y: cy + r * Math.sin(state.phi),
    r
  };
}

/** Coordinate velocity matching dt, so a Newtonian particle can share the clock. */
export function schwarzschildCoordinateVelocity(state) {
  const r = 1 / state.u;
  const f = 1 - state.rs / r;
  const dphidt = (state.h * f) / (r * r * state.E);
  const drdtau = -state.h * state.up;
  const dtdtau = state.E / f;
  const drdt = drdtau / dtdtau;
  const vx = drdt * Math.cos(state.phi) - r * dphidt * Math.sin(state.phi);
  const vy = drdt * Math.sin(state.phi) + r * dphidt * Math.cos(state.phi);
  return { vx, vy, drdt, dphidt };
}

/** Hovering observer. Zero at and inside the horizon. */
export function staticClockRate(r, rs) {
  if (!(r > rs)) return 0;
  return Math.sqrt(1 - rs / r);
}

/**
 * Exact Schwarzschild rate for a coordinate trajectory.
 * Returns 0 if the expression under the square root is not positive
 * (horizon, or a null/spacelike path such as the photon sphere).
 */
export function orbitingClockRate(r, rs, drdt, dphidt, c = C) {
  if (!(r > rs)) return 0;
  const f = 1 - rs / r;
  const inside = f - (drdt * drdt) / (f * c * c) - (r * r * dphidt * dphidt) / (c * c);
  if (!(inside > 0)) return 0;
  return Math.sqrt(inside);
}

/** Circular-orbit reduction: √(1 − 1.5 r_s/r). Zero at r = 1.5 r_s. */
export function circularOrbitClockRate(r, rs) {
  if (!(r > 0)) return 0;
  const x = 1 - (1.5 * rs) / r;
  if (!(x > 0)) return 0;
  return Math.sqrt(x);
}

export function circularCoordinateAngularSpeed(r, mass) {
  const geo = circularGeodesic(r, mass);
  if (!geo) return null;
  const f = 1 - geo.rs / r;
  return (geo.h * f) / (r * r * geo.E);
}

/** 1PN periapsis advance, radians per revolution: 6 π G M / (c² a (1−e²)). */
export function precessionPerOrbit(a, e, mass, g = G, c = C) {
  return (6 * Math.PI * g * mass) / (c * c * a * (1 - e * e));
}

export function mercuryPrecession() {
  const radiansPerOrbit = precessionPerOrbit(MERCURY.a, MERCURY.e, M_SUN);
  const orbitsPerCentury = (100 * 365.25) / MERCURY.periodDays;
  const arcsecPerCentury = radiansPerOrbit * (180 / Math.PI) * 3600 * orbitsPerCentury;
  return { radiansPerOrbit, orbitsPerCentury, arcsecPerCentury };
}

/**
 * Integrate the orbit equation from Newtonian periapsis and return the
 * advance of the next periapsis past 2π. Useful for a tight orbit where
 * the 1PN formula is still a good check. Mercury itself is too small to
 * measure this way in a short test; use mercuryPrecession() for 43″/cy.
 */
export function measurePrecession(a, e, mass, opts = {}) {
  const rs = schwarzschildRadius(mass);
  const rp = a * (1 - e);
  if (!(rp > 1.5 * rs)) return { crossed: true, precession: null };
  const h = Math.sqrt(G * mass * a * (1 - e * e));
  const f = 1 - rs / rp;
  const E = Math.sqrt(f * (1 + (h * h) / (C * C * rp * rp)));
  let s = { u: 1 / rp, up: 0, phi: 0, t: 0, tau: 0, h, E, mass, rs, crossed: false, r: rp };
  const dphi = opts.dphi || 2.5e-4;
  const maxSteps = opts.maxSteps || 120000;
  let passedApo = false;
  for (let i = 0; i < maxSteps; i++) {
    const prev = s;
    s = stepSchwarzschild(s, dphi);
    if (s.crossed) return { crossed: true, precession: null, phi: s.phi };
    if (!passedApo && prev.phi > 0.4 && prev.up <= 0 && s.up > 0) passedApo = true;
    if (passedApo && prev.up > 0 && s.up <= 0) {
      const frac = prev.up / (prev.up - s.up);
      const phi = prev.phi + frac * (s.phi - prev.phi);
      return { phi, precession: phi - 2 * Math.PI, crossed: false };
    }
  }
  return { precession: null, phi: s.phi, crossed: false };
}

/** Weak-field GPS split. Reported to students as "about" the classic values. */
export function gpsWeakField(opts = {}) {
  const mass = opts.mass == null ? M_EARTH : opts.mass;
  const ground = opts.groundRadius == null ? R_EARTH : opts.groundRadius;
  const orbit = opts.orbitRadius == null ? GPS_RADIUS : opts.orbitRadius;
  const c = opts.c == null ? C : opts.c;
  const mu = (opts.g == null ? G : opts.g) * mass;
  const gravFrac = (mu / (c * c)) * (1 / ground - 1 / orbit);
  const velFrac = -(mu / orbit) / (2 * c * c);
  const scale = DAY * 1e6;
  return {
    gravitationalUsPerDay: gravFrac * scale,
    velocityUsPerDay: velFrac * scale,
    netUsPerDay: (gravFrac + velFrac) * scale,
    about: GPS_ABOUT,
    approximation: "weak-field product (gravitational + special-relativistic)"
  };
}

/** α = 4 G M / (c² b), radians. Valid for b ≫ r_s. */
export function deflectionAngle(mass, b, g = G, c = C) {
  return (4 * g * mass) / (c * c * b);
}

export function solarLimbDeflection() {
  const radians = deflectionAngle(M_SUN, R_SUN);
  return { radians, arcsec: radians * (180 / Math.PI) * 3600 };
}

/** θ± = (β ± √(β² + 4 θ_E²)) / 2. Weak field only. */
export function pointLensImages(beta, thetaE) {
  const s = Math.sqrt(beta * beta + 4 * thetaE * thetaE);
  return { plus: 0.5 * (beta + s), minus: 0.5 * (beta - s) };
}

/** The point-lens formula is not used once the ray skims inside about 10 r_s. */
export function weakDeflectionApplies(b, rs) {
  return b > 10 * rs;
}

/** u'' + u = 3 G M u² / c² for a null geodesic. */
export function photonAccel(u, mass, c = C) {
  return -u + (3 * G * mass * u * u) / (c * c);
}

/**
 * Inbound null ray with impact parameter b.
 * Captured when u reaches 1/r_s. Scattered when u turns over and falls
 * back below the starting value.
 */
export function traceNullRay(mass, b, opts = {}) {
  const rs = schwarzschildRadius(mass);
  const rStart = opts.rStart || Math.max(160 * rs, 24 * Math.abs(b));
  const u0 = 1 / rStart;
  const disc = 1 / (b * b) - u0 * u0 + rs * u0 * u0 * u0;
  if (!(disc >= 0)) return { captured: false, reason: "invalid", closest: rStart, points: [] };
  let u = u0;
  let up = Math.sqrt(disc);
  const dphi = opts.dphi == null ? 0.0015 : opts.dphi;
  const maxSteps = opts.maxSteps == null ? 40000 : opts.maxSteps;
  const recordEvery = opts.recordEvery || 0;
  const points = [];
  let maxU = u;
  let turned = false;
  for (let i = 0; i < maxSteps; i++) {
    if (u >= 1 / rs) {
      return { captured: true, reason: "horizon", closest: rs, steps: i, points };
    }
    const a1 = photonAccel(u, mass);
    const up2 = up + 0.5 * dphi * a1;
    const u2 = u + 0.5 * dphi * up;
    const a2 = photonAccel(u2, mass);
    const up3 = up + 0.5 * dphi * a2;
    const u3 = u + 0.5 * dphi * up2;
    const a3 = photonAccel(u3, mass);
    const up4 = up + dphi * a3;
    const u4 = u + dphi * up3;
    const a4 = photonAccel(u4, mass);
    const nu = u + (dphi / 6) * (up + 2 * up2 + 2 * up3 + up4);
    const nup = up + (dphi / 6) * (a1 + 2 * a2 + 2 * a3 + a4);
    u = nu;
    up = nup;
    if (u > maxU) maxU = u;
    if (up < 0) turned = true;
    if (recordEvery && i % recordEvery === 0 && u > 0) {
      points.push({ r: 1 / u, phi: (i + 1) * dphi, u });
    }
    if (turned && u < u0) {
      return { captured: false, reason: "scattered", closest: 1 / maxU, steps: i, points };
    }
    if (!(u > 0)) {
      return { captured: false, reason: "escaped", closest: 1 / maxU, steps: i, points };
    }
  }
  return {
    captured: !turned,
    reason: turned ? "still-out" : "unresolved-inbound",
    closest: 1 / maxU,
    steps: maxSteps,
    points
  };
}

/** Exterior Flamm height. Null on the horizon and inside it. */
export function flammZ(r, rs) {
  if (!(r > rs)) return null;
  return 2 * Math.sqrt(rs * (r - rs));
}

/**
 * Single-body embedding. Stars and planets are capped flat inside the
 * surface. A black hole stops at r_s (vertical throat); nothing is returned
 * below it.
 */
export function embeddingHeight(r, body) {
  const rs = body.rs == null ? schwarzschildRadius(body.mass) : body.rs;
  const hole = body.kind === "blackhole" || !(body.surfaceRadius > rs);
  if (hole) {
    if (!(r > rs)) return { z: null, region: "inside-horizon", rs };
    return { z: flammZ(r, rs), region: "exterior", rs };
  }
  const R = body.surfaceRadius;
  if (r < R) return { z: flammZ(R, rs), region: "interior-cap", rs };
  return { z: flammZ(r, rs), region: "exterior", rs };
}

/** Φ = −Σ G M_i / r_i. Linear superposition, weak field only. */
export function weakFieldPotential(x, y, bodies) {
  return gravitationalPotential(x, y, bodies);
}

/** ≈ √(1 + 2 Φ / c²) for slow clocks in a weak field. */
export function weakFieldClockRate(phi, c = C) {
  const x = 1 + (2 * phi) / (c * c);
  if (!(x > 0)) return 0;
  return Math.sqrt(x);
}

/**
 * Two Schwarzschild black holes a few r_s apart do not have a Flamm-style
 * picture. The curvature view should say so and mention LIGO.
 */
export function needsNumericalRelativity(bodies) {
  const holes = [];
  for (let i = 0; i < bodies.length; i++) {
    if (bodies[i].kind === "blackhole") holes.push(bodies[i]);
  }
  for (let i = 0; i < holes.length; i++) {
    for (let j = i + 1; j < holes.length; j++) {
      const rsi = holes[i].rs == null ? schwarzschildRadius(holes[i].mass) : holes[i].rs;
      const rsj = holes[j].rs == null ? schwarzschildRadius(holes[j].mass) : holes[j].rs;
      const d = Math.hypot(holes[i].x - holes[j].x, holes[i].y - holes[j].y);
      if (d < 5 * Math.max(rsi, rsj)) return true;
    }
  }
  return false;
}

export function modeFromQuery(value) {
  if (value == null) return "sr";
  const id = MODE_ALIASES[String(value).toLowerCase()];
  return id || "sr";
}
