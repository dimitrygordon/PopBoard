// Induction & Motors: pure physics and data. No DOM, no canvas.
// Every number shown to students comes from here (see docs/induction-motors-science.md).

export const TAU = 2 * Math.PI;
export const MU0 = 4 * Math.PI * 1e-7;   // T m/A, permeability of free space
export const COIL_R = 0.02;              // m, radius of the Faraday / Lenz coil
export const COIL_LEN = 0.09;            // m, length of the winding (matches the coil art)
export const CIRCUIT_R = 5;              // ohm, coil plus galvanometer resistance (Lenz mode)
export const TRAVEL = 0.12;              // m, magnet travels from -12 cm to +12 cm (coil center at 0)
export const GEN_AREA = 0.01;            // m^2, generator coil 10 cm x 10 cm
export const MOTOR_N = 50;               // turns on the motor armature
export const MOTOR_SIDE = 0.05;          // m, motor loop is 5 cm x 5 cm
export const MOTOR_AREA = MOTOR_SIDE * MOTOR_SIDE;
export const NP = 8;                     // primary turns (matches the art)
export const GALVO_FULL = 0.02;          // V, galvanometer full scale (+/- 20 mV)
export const NS_CHOICES = Object.freeze([4, 16]);
export const COIL_TURNS = Object.freeze([5, 10, 20]);
export const GEN_TURNS = Object.freeze([50, 100, 200]);

// ---------- magnetic flux ----------
/** Phi = B A cos(theta); theta is the angle between B and the loop's normal. */
export const flux = (B, A, thetaRad) => B * A * Math.cos(thetaRad);
export const deg = (r) => (r * 180) / Math.PI;
export const rad = (d) => (d * Math.PI) / 180;

// ---------- magnet and coil (point-dipole model) ----------
/**
 * Flux through one circular turn of radius R from a point dipole of moment m
 * on the axis, a distance x from the turn's plane. Exact for a point dipole:
 * Phi = mu0 m R^2 / (2 (R^2 + x^2)^(3/2)).
 */
export const dipoleLoopFlux = (m, R, x) => (MU0 * m * R * R) / (2 * (R * R + x * x) ** 1.5);
export const dDipoleLoopFlux = (m, R, x) => (-3 * MU0 * m * R * R * x) / (2 * (R * R + x * x) ** 2.5);
/** Turn positions: N turns spread evenly along a coil of length len centered on 0. */
export function turnPositions(N, len = COIL_LEN) {
  if (N === 1) return [0];
  return Array.from({ length: N }, (_, i) => -len / 2 + (len * i) / (N - 1));
}
/** Flux linkage (sum over turns) with the magnet's center at x. m < 0 means the S pole faces +x. */
export function linkage(m, N, x, R = COIL_R) {
  let s = 0; for (const xi of turnPositions(N)) s += dipoleLoopFlux(m, R, x - xi); return s;
}
export function dLinkage(m, N, x, R = COIL_R) {
  let s = 0; for (const xi of turnPositions(N)) s += dDipoleLoopFlux(m, R, x - xi); return s;
}
/** emf = -d(N Phi)/dt = -(d linkage/dx) v. Positive emf drives current whose field points along +x. */
export const coilEmf = (m, N, x, v, R = COIL_R) => -dLinkage(m, N, x, R) * v;
/** Largest |d linkage / dx| for a unit moment (found by sampling; the shape does not depend on m or v). */
const gradCache = new Map();
export function maxGrad(N, R = COIL_R) {
  const key = N + ":" + R;
  if (gradCache.has(key)) return gradCache.get(key);
  let best = 0, at = 0;
  for (let i = 0; i <= 4000; i++) {
    const x = -TRAVEL + (2 * TRAVEL * i) / 4000, g = Math.abs(dLinkage(1, N, x, R));
    if (g > best) { best = g; at = x; }
  }
  const out = { g: best, x: at };
  gradCache.set(key, out);
  return out;
}
export const peakEmf = (m, N, v) => Math.abs(m) * maxGrad(N).g * v;
/** Magnet position on a back-and-forth run at constant speed v (triangle wave). Returns x and velocity. */
export function magnetRun(t, v, travel = TRAVEL) {
  const leg = (2 * travel) / v, ph = ((t % (2 * leg)) + 2 * leg) % (2 * leg);
  return ph < leg ? { x: -travel + v * ph, vx: v } : { x: travel - v * (ph - leg), vx: -v };
}

// ---------- Lenz's law ----------
/**
 * pole: which pole of the magnet faces the coil ("N" or "S"). motion: "toward" or "away".
 * Lenz: the induced current makes the coil's near face the same pole when the magnet
 * approaches (repel) and the opposite pole when it leaves (attract).
 * Current sense is as seen from the magnet's side: a north face seen head-on has
 * counterclockwise current (right-hand rule).
 */
export function lenz(pole, motion) {
  const approaching = motion === "toward";
  const face = approaching ? pole : pole === "N" ? "S" : "N";
  return {
    fluxChange: approaching ? "increasing" : "decreasing",
    face, force: approaching ? "repel" : "attract",
    sense: face === "N" ? "counterclockwise" : "clockwise"
  };
}
/** Peak current and peak drag force for resistance Rc: F v = emf I, so F = v (dLinkage/dx)^2 / Rc. */
export const peakCurrent = (emf, Rc = CIRCUIT_R) => emf / Rc;
export const peakForce = (m, N, v, Rc = CIRCUIT_R) => (v * (Math.abs(m) * maxGrad(N).g) ** 2) / Rc;

// ---------- generator ----------
export const omega = (f) => TAU * f;
export const genPeak = (N, B, A, w) => N * B * A * w;                  // emf0 = N B A omega
export const genEmf = (N, B, A, w, t) => N * B * A * w * Math.sin(w * t); // emf = N B A omega sin(omega t)
export const genLinkage = (N, B, A, w, t) => N * B * A * Math.cos(w * t);
export const rms = (peak) => peak / Math.SQRT2;

// ---------- DC motor ----------
export const sideForce = (N, I, L, B) => N * I * L * B;               // F = N I L B on each side
export const maxTorque = (N, I, A, B) => N * I * A * B;               // tau_max = N I A B
/** Torque at angle theta between the loop normal and B. With a commutator the current flips every half turn. */
export function motorTorque(N, I, A, B, theta, commutator) {
  const s = Math.sin(theta);
  return N * I * A * B * (commutator ? Math.abs(s) : s);
}
/** Current direction in the loop after the commutator: +1 or -1. */
export const commutatedSign = (theta, commutator) => (!commutator || Math.sin(theta) >= 0 ? 1 : -1);

// ---------- transformer (ideal) ----------
export const secondaryVoltage = (Vp, Np, Ns) => (Vp * Ns) / Np;       // Vs / Vp = Ns / Np
export function transformer(Vp, Np, Ns, Rload) {
  const Vs = secondaryVoltage(Vp, Np, Ns), Is = Vs / Rload, P = Vs * Is;
  return { Vs, Is, P, Ip: P / Vp, ratio: Ns / Np };
}

// ---------- sliders ----------
// Log sliders over STEPS steps with a positive minimum, and one linear angle
// slider that stays between 5 and 85 degrees, so no shown value can reach
// zero, change sign, or jump 2x or more between adjacent steps.
export const STEPS = 200;
export const SLIDERS = Object.freeze({
  fluxB: Object.freeze({ min: 0.01, max: 1, unit: "T", label: "Field strength B", def: 0.5 }),
  area: Object.freeze({ min: 10, max: 1000, unit: "cm\u00b2", label: "Loop area A", def: 200 }),
  angle: Object.freeze({ min: 5, max: 85, unit: "\u00b0", label: "Angle \u03b8 (B to the normal)", def: 30, lin: true }),
  magM: Object.freeze({ min: 0.2, max: 5, unit: "A\u00b7m\u00b2", label: "Magnet strength m", def: 2 }),
  speed: Object.freeze({ min: 0.2, max: 2, unit: "m/s", label: "Magnet speed v", def: 1 }),
  genF: Object.freeze({ min: 1, max: 60, unit: "Hz", label: "Turns per second f", def: 10 }),
  genB: Object.freeze({ min: 0.05, max: 1, unit: "T", label: "Field strength B", def: 0.2 }),
  motorI: Object.freeze({ min: 0.1, max: 5, unit: "A", label: "Current I", def: 1 }),
  motorB: Object.freeze({ min: 0.05, max: 1, unit: "T", label: "Field strength B", def: 0.3 }),
  vp: Object.freeze({ min: 1, max: 240, unit: "V", label: "Primary voltage V\u209a (AC)", def: 120 }),
  load: Object.freeze({ min: 10, max: 1000, unit: "\u03a9", label: "Load resistance R", def: 100 })
});
export function fromSlider(name, step) {
  const s = SLIDERS[name], u = Math.min(STEPS, Math.max(0, Math.round(step))) / STEPS;
  return s.lin ? s.min + (s.max - s.min) * u : s.min * (s.max / s.min) ** u;
}
export function toSlider(name, value) {
  const s = SLIDERS[name];
  const u = s.lin ? (value - s.min) / (s.max - s.min) : Math.log(value / s.min) / Math.log(s.max / s.min);
  return Math.min(STEPS, Math.max(0, Math.round(u * STEPS)));
}

// ---------- modes and deep links ----------
export const MODES = Object.freeze(["flux", "faraday", "lenz", "generator", "motor", "transformer", "sandbox"]);
export const MODE_LABELS = Object.freeze({
  flux: "Magnetic flux", faraday: "Faraday's law", lenz: "Lenz's law", generator: "Generator",
  motor: "DC motor", transformer: "Transformer", sandbox: "Sandbox"
});
export const MODE_ALIASES = Object.freeze({
  flux: "flux", "magnetic-flux": "flux", phi: "flux",
  faraday: "faraday", "faradays-law": "faraday", induction: "faraday", emf: "faraday", coil: "faraday",
  lenz: "lenz", "lenzs-law": "lenz",
  generator: "generator", ac: "generator", dynamo: "generator", alternator: "generator",
  motor: "motor", "dc-motor": "motor", torque: "motor",
  transformer: "transformer", transformers: "transformer",
  sandbox: "sandbox", free: "sandbox", play: "sandbox", freeplay: "sandbox"
});
export function parseQuery(search) {
  const p = new URLSearchParams(typeof search === "string" ? search : "");
  const mode = MODE_ALIASES[(p.get("mode") || "").trim().toLowerCase()] || "flux";
  return { mode };
}

// ---------- defaults and readouts ----------
export function defaults() {
  const d = {};
  for (const k of Object.keys(SLIDERS)) d[k] = SLIDERS[k].def;
  return Object.assign(d, { turns: 10, pole: "N", motion: "toward", genN: 100, commutator: true, ns: 16 });
}
/** Numbers shown in each mode's readout. Pure, so tests can sweep every slider. */
export function readouts(mode, s) {
  switch (mode) {
    case "flux": {
      const A = s.area * 1e-4, th = rad(s.angle);
      return { B_T: s.fluxB, A_m2: A, theta_deg: s.angle, cos: Math.cos(th),
        phi_mWb: flux(s.fluxB, A, th) * 1000, phiMax_mWb: s.fluxB * A * 1000 };
    }
    case "faraday": case "sandbox": {
      const e = peakEmf(s.magM, s.turns, s.speed);
      return { center_uWb: dipoleLoopFlux(s.magM, COIL_R, 0) * 1e6, peak_mV: e * 1000, pass_s: (2 * TRAVEL) / s.speed };
    }
    case "lenz": {
      const e = peakEmf(s.magM, s.turns, s.speed);
      return { peak_mV: e * 1000, I_mA: peakCurrent(e) * 1000, F_uN: peakForce(s.magM, s.turns, s.speed) * 1e6 };
    }
    case "generator": {
      const w = omega(s.genF), e0 = genPeak(s.genN, s.genB, GEN_AREA, w);
      return { omega: w, peak_V: e0, rms_V: rms(e0), T_ms: 1000 / s.genF, linkage_Wb: s.genN * s.genB * GEN_AREA };
    }
    case "motor":
      return { F_N: sideForce(MOTOR_N, s.motorI, MOTOR_SIDE, s.motorB), tau_Nm: maxTorque(MOTOR_N, s.motorI, MOTOR_AREA, s.motorB) };
    case "transformer": {
      const r = transformer(s.vp, NP, s.ns, s.load);
      return { Vp_V: s.vp, Vs_V: r.Vs, Is_A: r.Is, Ip_A: r.Ip, P_W: r.P };
    }
    default: return {};
  }
}
export const MODE_SLIDERS = Object.freeze({
  flux: ["fluxB", "area", "angle"], faraday: ["magM", "speed"], lenz: ["magM", "speed"], generator: ["genF", "genB"],
  motor: ["motorI", "motorB"], transformer: ["vp", "load"], sandbox: ["magM", "speed"]
});

export function fmtNum(x, digits = 3) {
  if (!Number.isFinite(x)) return "n/a";
  const s = String(+x.toPrecision(digits));
  return s.length > 8 ? x.toPrecision(digits) : s;
}

// ---------- art anchors (from the assets MANIFEST.md) ----------
export const ART = Object.freeze({
  magnet: Object.freeze({ w: 1024, h: 256, body: [112, 88, 912, 168] }),
  coil: Object.freeze({ w: 1024, h: 512, x0: 212, x1: 812, axisY: 256, r: 130 }),
  transformer: Object.freeze({ size: 1024, outer: [192, 212, 832, 812], win: [312, 332, 712, 692], primaryX: 252, secondaryX: 772 }),
  galvo: Object.freeze({ size: 1024, win: [245, 360, 780, 620], pivot: [512, 612], needle: 210 })
});
