/**
 * PopBoard pendulum study module — full nonlinear damped pendulum.
 *
 *   θ'' = -(g/L) sin(θ) − b θ'
 *
 * θ is measured from the downward vertical, positive toward +x.
 * Bob position with the pivot at the origin and +y downward:
 *   x = L sin θ,  y = L cos θ.
 *
 * b is an angular damping rate in s⁻¹. It is not a force, and mass does
 * not appear in the equation. Undamped motion is therefore independent of mass.
 *
 * If the classroom model is linear drag, F = −c v with c in N·s/m, the
 * torque on a point bob is −c L² θ' and I = m L², so
 *   b = c / m.
 * Mass then slows the decay of a heavier bob. Use dragToAngularRate() and
 * label that choice in the UI. Do not hide it inside an undamped run.
 *
 * Integrator: classical RK4 at a fixed substep (SUBSTEP seconds), independent
 * of the caller's frame dt. A short remainder step lands the clock exactly.
 *
 * The small-angle period T = 2π√(L/g) is not what the engine integrates.
 * smallAngleSolution() is a theory overlay: the exact solution of
 * θ'' = -(g/L) θ from the same release.
 */
"use strict";

export const SUBSTEP = 1 / 4000;

export const G_PRESETS = [
  { id: "moon", name: "Moon", g: 1.62 },
  { id: "mercury", name: "Mercury", g: 3.7 },
  { id: "mars", name: "Mars", g: 3.71 },
  { id: "venus", name: "Venus", g: 8.87 },
  { id: "earth", name: "Earth", g: 9.81 },
  { id: "saturn", name: "Saturn", g: 10.44 },
  { id: "jupiter", name: "Jupiter", g: 24.79 }
];

export const DEFAULTS = {
  L: 1,
  m: 1,
  g: 9.81,
  b: 0,
  theta: Math.PI / 180 * 50,
  omega: 0
};

export function clamp(x, a, b) {
  return Math.max(a, Math.min(b, x));
}

export function smallAnglePeriod(L, g) {
  return 2 * Math.PI * Math.sqrt(L / g);
}

/** θ'' at the current state. */
export function angularAccel(theta, omega, L, g, b) {
  return -(g / L) * Math.sin(theta) - b * omega;
}

/**
 * Angular rate b (s⁻¹) equivalent to linear drag F = −c v.
 * c is in N·s/m, m in kg. Heavier bobs get a smaller b.
 */
export function dragToAngularRate(c, m) {
  if (!(m > 0)) throw new Error("mass must be positive");
  return c / m;
}

/** Pivot at origin, +y down, θ = 0 at the bottom. */
export function bobPosition(theta, L) {
  return { x: L * Math.sin(theta), y: L * Math.cos(theta) };
}

/** KE + gravitational PE, joules. PE is zero at the bottom. */
export function mechanicalEnergy(theta, omega, m, L, g) {
  const v = L * omega;
  return 0.5 * m * v * v + m * g * L * (1 - Math.cos(theta));
}

/**
 * Exact undamped small-angle solution from (θ₀, ω₀) at τ = 0.
 * θ(τ) = θ₀ cos(Ωτ) + (ω₀/Ω) sin(Ωτ), Ω = √(g/L).
 */
export function smallAngleSolution(theta0, omega0, L, g, tau) {
  const Omega = Math.sqrt(g / L);
  if (!(Omega > 0)) return theta0;
  return theta0 * Math.cos(Omega * tau) + (omega0 / Omega) * Math.sin(Omega * tau);
}

/**
 * Complete elliptic integral of the first kind, K(k), modulus k (0 ≤ k < 1).
 * K(k) = π/2 / AGM(1, √(1−k²)).
 */
export function completeEllipticK(k) {
  const m = k * k;
  if (m >= 1) return Infinity;
  let a = 1;
  let g = Math.sqrt(1 - m);
  for (let i = 0; i < 40; i++) {
    const nextA = 0.5 * (a + g);
    const nextG = Math.sqrt(a * g);
    if (Math.abs(a - g) <= 1e-15 * a) {
      a = nextA;
      break;
    }
    a = nextA;
    g = nextG;
  }
  return (Math.PI / 2) / a;
}

/**
 * T / T_small for a release from rest at theta0.
 * T = 4 √(L/g) K(k), k = sin(|θ₀|/2), so T/T_small = 2K/π.
 */
export function ellipticPeriodRatio(theta0) {
  const k = Math.sin(Math.abs(theta0) / 2);
  return (2 * completeEllipticK(k)) / Math.PI;
}

/**
 * Power series in sin²(θ₀/2). Useful as a second check on the elliptic value.
 * a₀ = 1, aₙ = aₙ₋₁ [(2n−1)/(2n)]².
 */
export function seriesPeriodRatio(theta0, nTerms = 12) {
  const s2 = Math.sin(Math.abs(theta0) / 2) ** 2;
  let term = 1;
  let sum = 1;
  for (let n = 1; n <= nTerms; n++) {
    term *= ((2 * n - 1) / (2 * n)) ** 2;
    sum += term * s2 ** n;
  }
  return sum;
}

export function createPendulum(opts = {}) {
  return {
    theta: opts.theta ?? DEFAULTS.theta,
    omega: opts.omega ?? 0,
    t: opts.t ?? 0,
    L: opts.L ?? DEFAULTS.L,
    m: opts.m ?? DEFAULTS.m,
    g: opts.g ?? DEFAULTS.g,
    b: opts.b ?? 0
  };
}

export function rk4Step(state, dt) {
  const { L, g, b } = state;
  const deriv = (theta, omega) => angularAccel(theta, omega, L, g, b);
  const th0 = state.theta;
  const w0 = state.omega;
  const a0 = deriv(th0, w0);

  const w1 = w0 + 0.5 * dt * a0;
  const th1 = th0 + 0.5 * dt * w0;
  const a1 = deriv(th1, w1);

  const w2 = w0 + 0.5 * dt * a1;
  const th2 = th0 + 0.5 * dt * w1;
  const a2 = deriv(th2, w2);

  const w3 = w0 + dt * a2;
  const th3 = th0 + dt * w2;
  const a3 = deriv(th3, w3);

  state.theta = th0 + (dt / 6) * (w0 + 2 * w1 + 2 * w2 + w3);
  state.omega = w0 + (dt / 6) * (a0 + 2 * a1 + 2 * a2 + a3);
  state.t += dt;
  return state;
}

/**
 * Advance simulation time by dt seconds using fixed substeps.
 * substep defaults to SUBSTEP and does not follow the display frame rate.
 */
export function integrate(state, dt, substep = SUBSTEP) {
  if (!(dt > 0) || !(state.L > 0) || !(state.g >= 0)) return state;
  const h = substep > 0 ? substep : SUBSTEP;
  const n = Math.floor(dt / h);
  for (let i = 0; i < n; i++) rk4Step(state, h);
  const rem = dt - n * h;
  if (rem > 1e-12) rk4Step(state, rem);
  return state;
}

/**
 * Zero-crossing period meter. A cycle is a crossing of θ = 0 in the
 * positive direction only (θ going from ≤ 0 to > 0), with the crossing
 * time linearly interpolated between samples.
 */
export function createCycleCounter() {
  let prevTheta = null;
  let prevT = null;
  let lastCross = null;
  let lastPeriod = null;
  let count = 0;
  const periods = [];
  return {
    reset() {
      prevTheta = null;
      prevT = null;
      lastCross = null;
      lastPeriod = null;
      count = 0;
      periods.length = 0;
    },
    push(theta, t) {
      if (prevTheta !== null && prevT !== null && prevTheta <= 0 && theta > 0) {
        const denom = theta - prevTheta;
        const frac = denom !== 0 ? (0 - prevTheta) / denom : 0;
        const tc = prevT + frac * (t - prevT);
        if (lastCross !== null) {
          lastPeriod = tc - lastCross;
          periods.push(lastPeriod);
          count++;
        }
        lastCross = tc;
      }
      prevTheta = theta;
      prevT = t;
    },
    get period() { return lastPeriod; },
    get cycles() { return count; },
    get periods() { return periods.slice(); },
    mean(n) {
      if (!periods.length) return null;
      const slice = n ? periods.slice(-n) : periods;
      let s = 0;
      for (let i = 0; i < slice.length; i++) s += slice[i];
      return s / slice.length;
    }
  };
}

/**
 * Release from rest and measure the period with the cycle counter.
 * Returns the mean of the recorded cycles (null if the bob never completed one).
 */
export function measurePeriod(opts) {
  const theta = opts.theta;
  const L = opts.L;
  const g = opts.g;
  const state = createPendulum({
    theta,
    omega: opts.omega ?? 0,
    L,
    m: opts.m ?? 1,
    g,
    b: opts.b ?? 0,
    t: 0
  });
  const meter = createCycleCounter();
  const sub = opts.substep ?? SUBSTEP;
  const sample = opts.sample ?? 1 / 200;
  const T0 = smallAnglePeriod(L, g);
  const ratio = ellipticPeriodRatio(theta);
  const Texp = T0 * (Number.isFinite(ratio) ? Math.max(ratio, 1) : 1);
  const cycles = opts.cycles ?? 6;
  const total = opts.seconds ?? Texp * (cycles + 2.5);
  let elapsed = 0;
  meter.push(state.theta, state.t);
  while (elapsed < total - 1e-12) {
    const h = Math.min(sample, total - elapsed);
    integrate(state, h, sub);
    meter.push(state.theta, state.t);
    elapsed += h;
  }
  return { state, meter, period: meter.mean(), T0, Texp };
}

/** Ordinary least squares. xs and ys are equal-length number arrays. */
export function linearFit(xs, ys) {
  const n = xs.length;
  if (n < 2) throw new Error("linearFit needs at least two points");
  let sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (let i = 0; i < n; i++) {
    sx += xs[i];
    sy += ys[i];
    sxx += xs[i] * xs[i];
    sxy += xs[i] * ys[i];
  }
  const d = n * sxx - sx * sx;
  const slope = (n * sxy - sx * sy) / d;
  const intercept = (sy - slope * sx) / n;
  return { slope, intercept };
}

/**
 * Shared time buffer. Every motion graph should read this object so the
 * playhead index stays on the same samples as the bob.
 *
 * Fields: t, angle, angularVelocity, angularAcceleration, ghostAngle (SI),
 * playhead (index into those arrays), sampleDt, capacity.
 */
export function createTimeBuffer(sampleDt = 1 / 60, capacity = 2400) {
  const buf = {
    sampleDt,
    capacity,
    t: [],
    angle: [],
    angularVelocity: [],
    angularAcceleration: [],
    ghostAngle: [],
    playhead: -1,
    get length() { return buf.t.length; },
    clear() {
      buf.t.length = 0;
      buf.angle.length = 0;
      buf.angularVelocity.length = 0;
      buf.angularAcceleration.length = 0;
      buf.ghostAngle.length = 0;
      buf.playhead = -1;
    },
    push(sample, follow = true) {
      buf.t.push(sample.t);
      buf.angle.push(sample.angle);
      buf.angularVelocity.push(sample.angularVelocity);
      buf.angularAcceleration.push(sample.angularAcceleration);
      buf.ghostAngle.push(sample.ghostAngle);
      const extra = buf.t.length - capacity;
      if (extra > 0) {
        buf.t.splice(0, extra);
        buf.angle.splice(0, extra);
        buf.angularVelocity.splice(0, extra);
        buf.angularAcceleration.splice(0, extra);
        buf.ghostAngle.splice(0, extra);
        if (buf.playhead >= 0) buf.playhead = Math.max(0, buf.playhead - extra);
      }
      if (follow || buf.playhead < 0) buf.playhead = buf.t.length - 1;
      else if (buf.playhead > buf.t.length - 1) buf.playhead = buf.t.length - 1;
    },
    /** Drop samples after the playhead and return the playhead sample. */
    truncateToPlayhead() {
      if (buf.playhead < 0) return null;
      const i = buf.playhead;
      const sample = {
        t: buf.t[i],
        angle: buf.angle[i],
        angularVelocity: buf.angularVelocity[i],
        angularAcceleration: buf.angularAcceleration[i],
        ghostAngle: buf.ghostAngle[i]
      };
      buf.t.length = i + 1;
      buf.angle.length = i + 1;
      buf.angularVelocity.length = i + 1;
      buf.angularAcceleration.length = i + 1;
      buf.ghostAngle.length = i + 1;
      buf.playhead = i;
      return sample;
    }
  };
  return buf;
}

/**
 * Future study modes plug in as tabs. Phase 1 ships sandbox and period.
 * Later phases replace the placeholder panel; the ids stay stable for ?mode=.
 */
export const MODES = [
  { id: "sandbox", label: "Sandbox", phase: 1 },
  { id: "period", label: "Period Lab", phase: 1 },
  { id: "forces", label: "Forces", phase: 2 },
  { id: "amplitude", label: "Amplitude", phase: 3 },
  { id: "foucault", label: "Foucault", phase: 4 }
];

export const MODE_ALIASES = {
  sandbox: "sandbox",
  period: "period",
  lab: "period",
  variables: "period",
  forces: "forces",
  energy: "forces",
  amplitude: "amplitude",
  nonlinear: "amplitude",
  driven: "amplitude",
  foucault: "foucault",
  compare: "foucault",
  comparison: "foucault"
};
