/**
 * PopBoard double pendulum study module: pure physics, no DOM.
 *
 * Two point bobs on massless rigid rods, frictionless pivots.
 *   theta1, theta2: angles from the downward vertical (rad), positive toward +x.
 *   omega1, omega2: angular velocities (rad/s).
 * Bob positions with the pivot at the origin and +y downward:
 *   x1 = L1 sin th1,          y1 = L1 cos th1
 *   x2 = x1 + L2 sin th2,     y2 = y1 + L2 cos th2
 *
 * Equations of motion (Lagrangian, d = th1 - th2, M = m1 + m2,
 * D = 2 m1 + m2 - m2 cos 2d):
 *   a1 = [-g(2m1+m2) sin th1 - m2 g sin(th1 - 2 th2)
 *         - 2 sin d m2 (w2^2 L2 + w1^2 L1 cos d)] / (L1 D)
 *   a2 = [2 sin d (w1^2 L1 M + g M cos th1 + w2^2 L2 m2 cos d)] / (L2 D)
 *
 * Integrator: classical RK4 at a fixed step H, independent of the frame
 * rate, the same scheme as pendulum-physics.js. RK4 is not symplectic, so
 * total energy drifts very slowly; energyDrift() reports that honestly.
 */
"use strict";

import { clamp, linearFit } from "./pendulum-physics.js";

export { clamp, linearFit };

export const H = 1 / 2000;          // fixed integration step, s
export const G = 9.81;              // m/s^2
export const DEG = Math.PI / 180;

export const DEFAULTS = {
  theta1: 120 * DEG,
  theta2: -10 * DEG,
  omega1: 0,
  omega2: 0,
  m1: 2,
  m2: 1,
  L1: 1,
  L2: 1,
  g: G
};

/** Offset slider: log scale from 1e-6 deg to 1 deg, 120 steps (x1.12 per step). */
export const OFFSET_MIN_DEG = 1e-6;
export const OFFSET_MAX_DEG = 1;
export const OFFSET_STEPS = 120;
export function offsetFromStep(i) {
  const k = clamp(Math.round(i), 0, OFFSET_STEPS);
  const lg = Math.log10(OFFSET_MIN_DEG) + (k / OFFSET_STEPS) * (Math.log10(OFFSET_MAX_DEG) - Math.log10(OFFSET_MIN_DEG));
  return 10 ** lg;
}
export function stepFromOffset(deg) {
  const lo = Math.log10(OFFSET_MIN_DEG), hi = Math.log10(OFFSET_MAX_DEG);
  return clamp(Math.round(((Math.log10(deg) - lo) / (hi - lo)) * OFFSET_STEPS), 0, OFFSET_STEPS);
}

export function createDouble(opts = {}) {
  const d = { ...DEFAULTS, ...opts, t: 0 };
  d.E0 = totalEnergy(d);
  return d;
}

export function cloneDouble(s) {
  return { ...s };
}

/** Angular accelerations [a1, a2] for the state values given. */
export function accelerations(th1, th2, w1, w2, p) {
  const { m1, m2, L1, L2, g } = p;
  const d = th1 - th2;
  const sd = Math.sin(d), cd = Math.cos(d);
  const D = 2 * m1 + m2 - m2 * Math.cos(2 * d);
  const M = m1 + m2;
  const a1 = (-g * (2 * m1 + m2) * Math.sin(th1) - m2 * g * Math.sin(th1 - 2 * th2)
    - 2 * sd * m2 * (w2 * w2 * L2 + w1 * w1 * L1 * cd)) / (L1 * D);
  const a2 = (2 * sd * (w1 * w1 * L1 * M + g * M * Math.cos(th1) + w2 * w2 * L2 * m2 * cd)) / (L2 * D);
  return [a1, a2];
}

export function rk4Step(s, h = H) {
  const t1 = s.theta1, t2 = s.theta2, w1 = s.omega1, w2 = s.omega2;
  const [k1a, k1b] = accelerations(t1, t2, w1, w2, s);
  const v1a = w1 + 0.5 * h * k1a, v1b = w2 + 0.5 * h * k1b;
  const [k2a, k2b] = accelerations(t1 + 0.5 * h * w1, t2 + 0.5 * h * w2, v1a, v1b, s);
  const v2a = w1 + 0.5 * h * k2a, v2b = w2 + 0.5 * h * k2b;
  const [k3a, k3b] = accelerations(t1 + 0.5 * h * v1a, t2 + 0.5 * h * v1b, v2a, v2b, s);
  const v3a = w1 + h * k3a, v3b = w2 + h * k3b;
  const [k4a, k4b] = accelerations(t1 + h * v2a, t2 + h * v2b, v3a, v3b, s);
  s.theta1 = t1 + (h / 6) * (w1 + 2 * v1a + 2 * v2a + v3a);
  s.theta2 = t2 + (h / 6) * (w2 + 2 * v1b + 2 * v2b + v3b);
  s.omega1 = w1 + (h / 6) * (k1a + 2 * k2a + 2 * k3a + k4a);
  s.omega2 = w2 + (h / 6) * (k1b + 2 * k2b + 2 * k3b + k4b);
  s.t += h;
  return s;
}

/** Advance by n whole fixed steps. The UI keeps a time accumulator so the step never changes. */
export function stepN(s, n, h = H) {
  for (let i = 0; i < n; i++) rk4Step(s, h);
  return s;
}

export function positions(s) {
  const x1 = s.L1 * Math.sin(s.theta1), y1 = s.L1 * Math.cos(s.theta1);
  return { x1, y1, x2: x1 + s.L2 * Math.sin(s.theta2), y2: y1 + s.L2 * Math.cos(s.theta2) };
}

/** Kinetic + potential energy, J. Potential is zero with both rods hanging straight down. */
export function totalEnergy(s) {
  const { m1, m2, L1, L2, g, theta1: a, theta2: b, omega1: w1, omega2: w2 } = s;
  const ke = 0.5 * m1 * L1 * L1 * w1 * w1
    + 0.5 * m2 * (L1 * L1 * w1 * w1 + L2 * L2 * w2 * w2 + 2 * L1 * L2 * w1 * w2 * Math.cos(a - b));
  const pe = (m1 + m2) * g * L1 * (1 - Math.cos(a)) + m2 * g * L2 * (1 - Math.cos(b));
  return ke + pe;
}

/** Energy scale used for relative drift: the energy to lift both rods from straight down to straight up. */
export function energyScale(s) {
  return 2 * ((s.m1 + s.m2) * s.g * s.L1 + s.m2 * s.g * s.L2);
}

/** (E - E0) / energyScale. Exact physics gives 0; anything else is integrator error. */
export function energyDrift(s) {
  return (totalEnergy(s) - s.E0) / energyScale(s);
}

export function wrapAngle(a) {
  const tau = 2 * Math.PI;
  let r = ((a + Math.PI) % tau + tau) % tau - Math.PI;
  if (r === -Math.PI) r = Math.PI;
  return r;
}

/**
 * Phase-space separation between two runs (dimensionless). Angle gaps are
 * wrapped; angular velocity gaps are scaled by sqrt(L1/g) so both terms are
 * in radians.
 */
export function separation(a, b) {
  const k = Math.sqrt(a.L1 / a.g);
  const d1 = wrapAngle(a.theta1 - b.theta1), d2 = wrapAngle(a.theta2 - b.theta2);
  const e1 = (a.omega1 - b.omega1) * k, e2 = (a.omega2 - b.omega2) * k;
  return Math.sqrt(d1 * d1 + d2 * d2 + e1 * e1 + e2 * e2);
}

/** Largest angle gap between two runs, degrees. */
export function angleGapDeg(a, b) {
  return Math.max(Math.abs(wrapAngle(a.theta1 - b.theta1)), Math.abs(wrapAngle(a.theta2 - b.theta2))) / DEG;
}

export const SATURATION = 0.3;   // separation where exponential growth stops being the story
export const FIT_START = 0.5;    // s, skip the first transient

/**
 * Lyapunov-style estimate from a separation history: least-squares slope of
 * ln(separation) against time over the growth stretch, from FIT_START until
 * the separation first reaches SATURATION.
 * Returns { lambda, t0, t1, b, saturated } or null when there is too little data.
 */
export function lyapunovFit(ts, ds, opts = {}) {
  const sat = opts.saturation ?? SATURATION;
  const t0 = opts.start ?? FIT_START;
  const xs = [], ys = [];
  let saturated = false;
  for (let i = 0; i < ts.length; i++) {
    if (ds[i] >= sat) { saturated = true; break; }
    if (ts[i] < t0 || !(ds[i] > 0)) continue;
    xs.push(ts[i]); ys.push(Math.log(ds[i]));
  }
  if (xs.length < 10 || xs[xs.length - 1] - xs[0] < 1) return null;
  const { slope, intercept } = linearFit(xs, ys);
  return { lambda: slope, b: intercept, t0: xs[0], t1: xs[xs.length - 1], saturated };
}

/**
 * Run a pair from the same start except theta1 offset by offsetDeg and
 * return the time when the largest angle gap first exceeds tolDeg (or null).
 */
export function predictionHorizon(start, offsetDeg, opts = {}) {
  const tol = opts.tolDeg ?? 10;
  const tMax = opts.tMax ?? 40;
  const h = opts.h ?? H;
  const a = createDouble(start);
  const b = createDouble({ ...start, theta1: start.theta1 + offsetDeg * DEG });
  const sampleEvery = Math.max(1, Math.round(0.01 / h));
  const n = Math.round(tMax / h);
  for (let i = 1; i <= n; i++) {
    rk4Step(a, h); rk4Step(b, h);
    if (i % sampleEvery === 0 && angleGapDeg(a, b) > tol) return a.t;
  }
  return null;
}

/** Small-angle normal-mode angular frequencies (rad/s) of the linearised system. */
export function normalModeFrequencies(p) {
  const { m1, m2, L1, L2, g } = p;
  const M = m1 + m2;
  const A = m1 * L1 * L2;
  const B = -M * g * (L1 + L2);
  const C = M * g * g;
  const disc = Math.sqrt(B * B - 4 * A * C);
  return [Math.sqrt((-B - disc) / (2 * A)), Math.sqrt((-B + disc) / (2 * A))].sort((x, y) => x - y);
}

export const MODES = [
  { id: "sensitivity", label: "Butterfly effect" },
  { id: "phase", label: "Phase space" },
  { id: "determinism", label: "Same start" },
  { id: "regimes", label: "Small vs large" },
  { id: "prediction", label: "Prediction" },
  { id: "sandbox", label: "Sandbox" }
];

/** Sandbox slider ranges. Every neighbouring step changes a value by less than 2x. */
export const SANDBOX_RANGES = {
  L: { min: 0.5, max: 2, step: 0.05 },
  g: { min: 1, max: 25, step: 0.1 },
  m: { min: 0.5, max: 5, step: 0.1 },
  angle: { min: 5, max: 175, step: 1 },
  speed: { min: 0.5, max: 2, step: 0.25 }
};

export const MODE_ALIASES = {
  sensitivity: "sensitivity", butterfly: "sensitivity", divergence: "sensitivity", chaos: "sensitivity",
  phase: "phase", "phase-space": "phase",
  determinism: "determinism", same: "determinism", deterministic: "determinism",
  regimes: "regimes", small: "regimes", compare: "regimes",
  prediction: "prediction", horizon: "prediction", forecast: "prediction",
  sandbox: "sandbox", free: "sandbox", play: "sandbox"
};

export const THEME_KEY = "popboard-dp-theme";
/** Stored choice wins; otherwise follow the system preference. */
export function resolveTheme(stored, prefersDark) {
  if (stored === "dark" || stored === "light") return stored;
  return prefersDark ? "dark" : "light";
}

export function modeFromSearch(search) {
  const v = new URLSearchParams(search || "").get("mode");
  return MODE_ALIASES[(v || "").toLowerCase()] || "sensitivity";
}
