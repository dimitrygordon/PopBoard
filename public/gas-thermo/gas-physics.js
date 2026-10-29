// Gases & Thermodynamics: pure physics and data. No DOM, no canvas.
// Every equation, value and source is listed in docs/gas-thermo-science.md.

// ---------- constants (SI 2019 exact values) ----------
export const KB = 1.380649e-23;          // Boltzmann constant, J/K (exact)
export const NA = 6.02214076e23;         // Avogadro constant, 1/mol (exact)
export const R = KB * NA;                // molar gas constant, 8.314462618 J/(mol K)
export const P_ATM = 101325;             // standard atmosphere, Pa (exact)
export const G = 9.80665;                // standard gravity, m/s^2 (exact)
export const T_ICE = 273.15;             // melting point of ice at 1 atm, K
export const DALTON = 1.66053906660e-27; // atomic mass constant, kg (CODATA 2018)

// Ideal gases. M in g/mol (IUPAC standard atomic weights), f = quadratic
// degrees of freedom near room temperature (3 for atoms, 5 for rigid diatomics).
export const GASES = Object.freeze({
  he: Object.freeze({ id: "he", name: "Helium", formula: "He", M: 4.002602, f: 3, sprite: "particle-xs" }),
  ne: Object.freeze({ id: "ne", name: "Neon", formula: "Ne", M: 20.1797, f: 3, sprite: "particle-s" }),
  n2: Object.freeze({ id: "n2", name: "Nitrogen", formula: "N\u2082", M: 28.0134, f: 5, sprite: "particle-m" }),
  o2: Object.freeze({ id: "o2", name: "Oxygen", formula: "O\u2082", M: 31.9988, f: 5, sprite: "particle-m" }),
  ar: Object.freeze({ id: "ar", name: "Argon", formula: "Ar", M: 39.948, f: 3, sprite: "particle-l" })
});
export const GAS_IDS = Object.freeze(Object.keys(GASES));

export const molarMassKg = (gas) => gas.M / 1000;
export const moleculeMass = (gas) => gas.M * DALTON;           // kg per molecule
export const cv = (gas) => (gas.f / 2) * R;                     // J/(mol K)
export const cp = (gas) => cv(gas) + R;                         // Mayer's relation
export const gamma = (gas) => cp(gas) / cv(gas);                // 5/3 or 7/5

// ---------- ideal gas law, PV = nRT (SI: Pa, m^3, mol, K) ----------
export const pressure = (n, T, V) => (n * R * T) / V;
export const volume = (n, T, P) => (n * R * T) / P;
export const temperature = (P, V, n) => (P * V) / (n * R);
export const moles = (P, V, T) => (P * V) / (R * T);
export const L = 1e-3;                                         // 1 litre in m^3

// ---------- kinetic theory ----------
// Mean translational kinetic energy per molecule, 3/2 kT, independent of the gas.
export const meanKE = (T) => 1.5 * KB * T;
export const internalEnergy = (gas, n, T) => n * cv(gas) * T;   // U = (f/2) nRT
export const vRms = (gas, T) => Math.sqrt((3 * KB * T) / moleculeMass(gas));
export const vMean = (gas, T) => Math.sqrt((8 * KB * T) / (Math.PI * moleculeMass(gas)));
export const vProbable = (gas, T) => Math.sqrt((2 * KB * T) / moleculeMass(gas));
// Maxwell-Boltzmann speed distribution (probability per m/s).
export function mbPdf(gas, T, v) {
  const m = moleculeMass(gas), a = m / (2 * KB * T);
  return 4 * Math.PI * (a / Math.PI) ** 1.5 * v * v * Math.exp(-a * v * v);
}
// Fraction of molecules faster than v (closed form with erf).
export function mbFractionAbove(gas, T, v) {
  const x = v / vProbable(gas, T);
  return 1 - erf(x) + (2 / Math.sqrt(Math.PI)) * x * Math.exp(-x * x);
}
export function erf(x) {
  // Abramowitz and Stegun 7.1.26, |error| < 1.5e-7
  const s = Math.sign(x), a = Math.abs(x), t = 1 / (1 + 0.3275911 * a);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-a * a);
  return s * y;
}
// Pressure from molecular motion: P = N m <v^2> / (3V).
export const kineticPressure = (N, m, meanV2, V) => (N * m * meanV2) / (3 * V);

// Seeded random numbers so the particle box is repeatable (mulberry32).
export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function gauss(rand) {
  const u = Math.max(1e-12, rand()), v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
// Sample velocity components for a gas at T: each component is normal with
// variance kT/m, so the speeds follow the Maxwell-Boltzmann distribution.
export function sampleVelocity(gas, T, rand) {
  const s = Math.sqrt((KB * T) / moleculeMass(gas));
  return { vx: s * gauss(rand), vy: s * gauss(rand), vz: s * gauss(rand) };
}

// ---------- the particle box (screen units, slowed down) ----------
// Positions are in the art frame (px of the 1024 cylinder frame). Speeds are
// real speeds times SIM_SPEED, so 1000 m/s moves 200 frame px per second.
export const SIM_SPEED = 0.2;
export const DOTS_PER_MOL = 500;      // dots drawn per mole of gas
export const dotCount = (n) => Math.max(1, Math.round(n * DOTS_PER_MOL));
export function makeParticles(gas, T, count, box, rand, r = 6) {
  const out = [];
  for (let i = 0; i < count; i++) out.push(newParticle(gas, T, box, rand, r));
  return out;
}
export function newParticle(gas, T, box, rand, r = 6) {
  const v = sampleVelocity(gas, T, rand);
  return { x: box.x0 + r + rand() * (box.x1 - box.x0 - 2 * r), y: box.y0 + r + rand() * (box.y1 - box.y0 - 2 * r), ...v };
}
// Scale every velocity so the sample keeps its shape at a new temperature.
export function rescale(parts, T0, T1) {
  const k = Math.sqrt(T1 / T0);
  for (const p of parts) { p.vx *= k; p.vy *= k; p.vz *= k; }
}
// Move the dots for dt seconds; elastic bounces on the walls. Returns the
// impulse (real momentum units per molecule mass, m/s) given to each wall.
export function stepParticles(parts, box, dt, r = 6) {
  const hits = { top: 0, bottom: 0, left: 0, right: 0, events: [] };
  for (const p of parts) {
    p.x += p.vx * SIM_SPEED * dt; p.y -= p.vy * SIM_SPEED * dt;   // vy up is screen y down
    if (p.x < box.x0 + r) { p.x = 2 * (box.x0 + r) - p.x; p.vx = Math.abs(p.vx); hits.left += 2 * p.vx; hits.events.push({ x: box.x0, y: p.y }); }
    if (p.x > box.x1 - r) { p.x = 2 * (box.x1 - r) - p.x; p.vx = -Math.abs(p.vx); hits.right += -2 * p.vx; hits.events.push({ x: box.x1, y: p.y }); }
    if (p.y < box.y0 + r) { p.y = 2 * (box.y0 + r) - p.y; p.vy = -Math.abs(p.vy); hits.top += -2 * p.vy; hits.events.push({ x: p.x, y: box.y0 }); }
    if (p.y > box.y1 - r) { p.y = 2 * (box.y1 - r) - p.y; p.vy = Math.abs(p.vy); hits.bottom += 2 * p.vy; hits.events.push({ x: p.x, y: box.y1 }); }
    // keep inside even after a large step or a moving piston
    p.x = Math.min(box.x1 - r, Math.max(box.x0 + r, p.x));
    p.y = Math.min(box.y1 - r, Math.max(box.y0 + r, p.y));
  }
  return hits;
}
export const speedOf = (p) => Math.hypot(p.vx, p.vy, p.vz);
export const meanSquare = (parts) => parts.reduce((s, p) => s + p.vx * p.vx + p.vy * p.vy + p.vz * p.vz, 0) / Math.max(1, parts.length);

// ---------- processes (W is work done BY the gas; first law dU = Q - W) ----------
// Heat Q at constant volume: all of it raises U.
export function isochoricHeat(gas, n, T1, V, Q) {
  const T2 = T1 + Q / (n * cv(gas));
  return { T2, V2: V, P1: pressure(n, T1, V), P2: pressure(n, T2, V), Q, W: 0, dU: Q };
}
// Heat Q at constant pressure (free piston): part raises U, part pushes the piston.
export function isobaricHeat(gas, n, T1, V1, Q) {
  const T2 = T1 + Q / (n * cp(gas));
  const P = pressure(n, T1, V1), V2 = volume(n, T2, P);
  return { T2, V2, P1: P, P2: P, Q, W: P * (V2 - V1), dU: n * cv(gas) * (T2 - T1) };
}
// Heat Q at constant temperature (in a big bath): it all becomes work.
export function isothermalHeat(gas, n, T, V1, Q) {
  const V2 = V1 * Math.exp(Q / (n * R * T));
  return { T2: T, V2, P1: pressure(n, T, V1), P2: pressure(n, T, V2), Q, W: Q, dU: 0 };
}
export function isothermalTo(gas, n, T, V1, V2) {
  const W = n * R * T * Math.log(V2 / V1);
  return { T2: T, V2, P1: pressure(n, T, V1), P2: pressure(n, T, V2), Q: W, W, dU: 0 };
}
// Insulated (adiabatic, quasi-static): Q = 0, PV^gamma and TV^(gamma-1) stay constant.
export function adiabaticTo(gas, n, T1, V1, V2) {
  const g = gamma(gas), T2 = T1 * (V1 / V2) ** (g - 1);
  const P1 = pressure(n, T1, V1), P2 = pressure(n, T2, V2);
  return { T2, V2, P1, P2, Q: 0, W: (P1 * V1 - P2 * V2) / (g - 1), dU: n * cv(gas) * (T2 - T1) };
}
// Points along a curve for the PV diagram: [{V (m^3), P (Pa)}].
export function isothermCurve(n, T, Va, Vb, k = 64) {
  const out = [];
  for (let i = 0; i <= k; i++) { const V = Va + (Vb - Va) * i / k; out.push({ V, P: pressure(n, T, V) }); }
  return out;
}
export function adiabatCurve(gas, n, T1, V1, Va, Vb, k = 64) {
  const out = [], g = gamma(gas), C = pressure(n, T1, V1) * V1 ** g;
  for (let i = 0; i <= k; i++) { const V = Va + (Vb - Va) * i / k; out.push({ V, P: C / V ** g }); }
  return out;
}

// ---------- Carnot engine (two isotherms, two adiabats) ----------
export function carnotCycle(gas, n, Th, Tc, VA, VB) {
  const e = 1 / (gamma(gas) - 1);
  const VC = VB * (Th / Tc) ** e, VD = VA * (Th / Tc) ** e;
  const Qh = n * R * Th * Math.log(VB / VA);
  const Qc = n * R * Tc * Math.log(VC / VD);    // heat given out to the cold side
  const W = Qh - Qc;
  return {
    A: { V: VA, P: pressure(n, Th, VA), T: Th }, B: { V: VB, P: pressure(n, Th, VB), T: Th },
    C: { V: VC, P: pressure(n, Tc, VC), T: Tc }, D: { V: VD, P: pressure(n, Tc, VD), T: Tc },
    Qh, Qc, W, eff: W / Qh, carnot: 1 - Tc / Th
  };
}
// State along the cycle for u in [0, 4): 0-1 A to B (hot isotherm), 1-2 B to C
// (adiabat), 2-3 C to D (cold isotherm), 3-4 D to A (adiabat).
export function carnotState(gas, n, cyc, u) {
  const leg = Math.floor(((u % 4) + 4) % 4), s = (((u % 4) + 4) % 4) - leg;
  const pts = [cyc.A, cyc.B, cyc.C, cyc.D, cyc.A], a = pts[leg], b = pts[leg + 1];
  const V = a.V * (b.V / a.V) ** s;                // geometric so motion is even on a log scale
  let T;
  if (leg === 0) T = cyc.A.T; else if (leg === 2) T = cyc.C.T;
  else T = a.T * (a.V / V) ** (gamma(gas) - 1);
  return { leg, V, T, P: pressure(n, T, V) };
}

// ---------- sandbox: heat flow from a source, weights on the piston ----------
// Source temperatures (K) and a fixed thermal conductance (W/K): heat flows
// at Qdot = H (Ts - T) (Newton's law of cooling). "none" means insulated.
export const SOURCES = Object.freeze({
  none: Object.freeze({ id: "none", name: "Insulated", Ts: null }),
  burner: Object.freeze({ id: "burner", name: "Bunsen burner", Ts: 600 }),
  plate: Object.freeze({ id: "plate", name: "Hot plate", Ts: 450 }),
  ice: Object.freeze({ id: "ice", name: "Ice bath", Ts: T_ICE })
});
export const CONDUCTANCE = 0.25;          // W/K
export const PISTON_AREA = 0.01;          // m^2 (bore of 11.3 cm diameter)
export const WEIGHTS = Object.freeze({ small: 10.2, large: 25.5 });   // kg
export const MAX_WEIGHTS = 3;
export const weightPressure = (masses) => masses.reduce((s, m) => s + m, 0) * G / PISTON_AREA;
export const T_MIN = 100, T_MAX = 600;    // thermometer scale, K
export const V_MIN = 0.5 * L, V_MAX = 4.5 * L;  // piston stops
// One step of the sandbox: returns the new state. Locked piston: V fixed.
// Free piston: the gas pressure matches the outside pressure unless the
// piston rests on a stop. Heating at fixed V uses Cv; at fixed P uses Cp.
export function sandboxStep(gas, s, source, dt) {
  const src = SOURCES[source] || SOURCES.none;
  let T = s.T;
  if (src.Ts != null) {
    const free = !s.locked && s.V > V_MIN * 1.0001 && s.V < V_MAX * 0.9999;
    const C = s.n * (free ? cp(gas) : cv(gas));
    // exact solution of dT/dt = H (Ts - T) / C over dt
    T = src.Ts + (T - src.Ts) * Math.exp(-CONDUCTANCE * dt / C);
  }
  T = Math.min(T_MAX, Math.max(T_MIN, T));
  return settle({ ...s, T });
}
export function settle(s) {
  let V = s.V;
  if (!s.locked) V = Math.min(V_MAX, Math.max(V_MIN, volume(s.n, s.T, s.Pext)));
  return { ...s, V, P: pressure(s.n, s.T, V) };
}

// ---------- art (1024 frame unless noted, from MANIFEST.md) ----------
export const ART = Object.freeze({
  frame: 1024,
  bore: Object.freeze({ x0: 340, x1: 684, top: 110, floor: 880, wall: 22 }),
  piston: Object.freeze({ top: 420, height: 62, handleTop: 24 }),
  thermo: Object.freeze({ boreX0: 504, boreX1: 513, boreTop: 263, boreBottom: 842, bulb: [457, 887, 567, 957] }),
  gauge: Object.freeze({ cx: 511, cy: 427, r: 315 }),
  burnerFlame: Object.freeze({ x0: 474, x1: 550, top: 58, bottom: 256 }),
  sprite: 256,
  particleR: Object.freeze({ "particle-xs": 34, "particle-s": 52, "particle-m": 74, "particle-l": 100 })
});
// Piston travel: gas height in frame px for a volume. 1 L = 115.6 px.
export const PX_PER_L = 520 / 4.5;
export const gasHeightPx = (V) => (V / L) * PX_PER_L;
export const pistonTopFor = (V) => ART.bore.floor - gasHeightPx(V) - ART.piston.height;
// Thermometer: T_MIN at the bottom of the bore, T_MAX 20 px under its top.
export function thermoY(T) {
  const t = ART.thermo, top = t.boreTop + 20;
  const u = (Math.min(T_MAX, Math.max(T_MIN, T)) - T_MIN) / (T_MAX - T_MIN);
  return t.boreBottom - u * (t.boreBottom - top);
}
// Gauge: 0 to full scale over a 270 degree sweep, starting at lower left.
export const GAUGE_SWEEP = 1.5 * Math.PI, GAUGE_START = 0.75 * Math.PI;
export function gaugeAngle(P, full) {
  return GAUGE_START + GAUGE_SWEEP * Math.min(1, Math.max(0, P / full));
}

// ---------- sliders: logarithmic over STEPS steps ----------
// Each step multiplies the value by (max/min)^(1/STEPS), well under 2x, and
// the tests check every derived readout too.
export const STEPS = 200;
export const SLIDERS = Object.freeze({
  T: Object.freeze({ min: 150, max: 600, unit: "K" }),
  V: Object.freeze({ min: 1 * L, max: 4 * L, unit: "m3" }),
  n: Object.freeze({ min: 0.02, max: 0.16, unit: "mol" }),
  Q: Object.freeze({ min: 5, max: 150, unit: "J" }),
  ratio: Object.freeze({ min: 1.05, max: 2, unit: "" }),
  Th: Object.freeze({ min: 450, max: 600, unit: "K" }),
  Tc: Object.freeze({ min: 300, max: 400, unit: "K" })
});
export function fromSlider(name, step) {
  const s = SLIDERS[name], u = Math.min(STEPS, Math.max(0, Math.round(step))) / STEPS;
  return s.min * (s.max / s.min) ** u;
}
export function toSlider(name, value) {
  const s = SLIDERS[name];
  const u = Math.log(value / s.min) / Math.log(s.max / s.min);
  return Math.min(STEPS, Math.max(0, Math.round(u * STEPS)));
}

// ---------- the gas laws lab ----------
// Each law holds two of P, V, T, n fixed and drives one; the fourth follows.
export const BASE = Object.freeze({ n: 0.08, T: 300, V: 2 * L });
export const P_BASE = pressure(0.08, 150, 1 * L);      // 99.8 kPa, used for Charles and Avogadro
export const LAWS = Object.freeze({
  boyle: Object.freeze({ id: "boyle", name: "Boyle", drive: "V", follow: "P", hold: ["T", "n"], rule: "P \u221d 1/V (T, n fixed)" }),
  charles: Object.freeze({ id: "charles", name: "Charles", drive: "T", follow: "V", hold: ["P", "n"], rule: "V \u221d T (P, n fixed)" }),
  gaylussac: Object.freeze({ id: "gaylussac", name: "Gay-Lussac", drive: "T", follow: "P", hold: ["V", "n"], rule: "P \u221d T (V, n fixed)" }),
  avogadro: Object.freeze({ id: "avogadro", name: "Avogadro", drive: "n", follow: "V", hold: ["P", "T"], rule: "V \u221d n (P, T fixed)" })
});
export const LAW_IDS = Object.freeze(Object.keys(LAWS));
export function lawState(law, x) {
  const b = BASE;
  if (law === "boyle") return { n: b.n, T: b.T, V: x, P: pressure(b.n, b.T, x) };
  if (law === "charles") return { n: b.n, T: x, P: P_BASE, V: volume(b.n, x, P_BASE) };
  if (law === "gaylussac") return { n: b.n, T: x, V: b.V, P: pressure(b.n, x, b.V) };
  // Avogadro at 300 K and P_BASE: n from 0.02 to 0.16 mol gives 0.5 to 4 L
  return { n: x, T: b.T, P: P_BASE, V: volume(x, b.T, P_BASE) };
}

// ---------- modes and deep links ----------
export const MODES = Object.freeze(["kinetic", "laws", "speeds", "energy", "firstlaw", "pv", "engine", "sandbox"]);
export const MODE_ALIASES = Object.freeze({
  kinetic: "kinetic", particles: "kinetic", box: "kinetic", "kinetic-theory": "kinetic", molecules: "kinetic",
  laws: "laws", law: "laws", "gas-laws": "laws", pvnrt: "laws", "ideal-gas": "laws",
  boyle: "laws", charles: "laws", gaylussac: "laws", "gay-lussac": "laws", avogadro: "laws",
  speeds: "speeds", maxwell: "speeds", "maxwell-boltzmann": "speeds", distribution: "speeds", mb: "speeds",
  energy: "energy", ke: "energy", "kinetic-energy": "energy", temperature: "energy",
  firstlaw: "firstlaw", "first-law": "firstlaw", heat: "firstlaw", heating: "firstlaw", work: "firstlaw",
  pv: "pv", isothermal: "pv", adiabatic: "pv", "pv-diagram": "pv", processes: "pv",
  engine: "engine", carnot: "engine", cycle: "engine", "heat-engine": "engine",
  sandbox: "sandbox", free: "sandbox", play: "sandbox", freeplay: "sandbox"
});
const LAW_ALIASES = { boyle: "boyle", charles: "charles", gaylussac: "gaylussac", "gay-lussac": "gaylussac", avogadro: "avogadro" };
export function parseQuery(search) {
  const p = new URLSearchParams(typeof search === "string" ? search : "");
  const raw = (p.get("mode") || "").trim().toLowerCase();
  const mode = MODE_ALIASES[raw] || "kinetic";
  let law = LAW_ALIASES[(p.get("law") || "").trim().toLowerCase()] || LAW_ALIASES[raw] || null;
  let gas = (p.get("gas") || "").trim().toLowerCase();
  if (!GASES[gas]) gas = null;
  return { mode, law, gas };
}

// ---------- formatting ----------
export function sig(x, d = 3) {
  if (!isFinite(x)) return "\u2013";
  if (x === 0) return "0";
  const s = Number(x.toPrecision(d));
  return Math.abs(s) >= 1e5 || Math.abs(s) < 1e-3 ? s.toExponential(d - 1) : String(s);
}
export const fmtSigned = (x, unit, d = 3) => `${x < 0 ? "\u2212" : x > 0 ? "+" : ""}${sig(Math.abs(x), d)} ${unit}`;
export const kPa = (P) => `${sig(P / 1000)} kPa`;
export const litres = (V) => `${sig(V / L)} L`;
export const kelvin = (T) => `${sig(T)} K`;
export const celsius = (T) => `${(T - 273.15).toFixed(0).replace("-", "\u2212")} \u00b0C`;
export function sci(x, d = 3) {
  const e = Math.floor(Math.log10(Math.abs(x)));
  const m = (x / 10 ** e).toFixed(d - 1);
  const sup = String(e).replace(/[-0-9]/g, (c) => "\u207b\u2070\u00b9\u00b2\u00b3\u2074\u2075\u2076\u2077\u2078\u2079"["-0123456789".indexOf(c)]);
  return `${m} \u00d7 10${sup}`;
}
