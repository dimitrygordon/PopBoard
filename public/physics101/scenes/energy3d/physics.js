// Pure bouncing-ball physics for the energy3d scenes. No DOM, no three.js.
export const g = 9.8;

// Reference-test presets cleared by Tesla (every_joule_art_specs.md Sim 4, tesla-energy-check.md C4).
// Mass in kg, drop and rebound in m, e = coefficient of restitution, h_rebound / h_drop = e^2.
export const BALLS = Object.freeze({
  tennis: Object.freeze({ m: 0.0577, drop: 2.54, rebound: 1.41, e: 0.745, r: 0.0335 }),
  basketball: Object.freeze({ m: 0.6, drop: 1.8, rebound: 1.06, e: 0.767, r: 0.12 }),
  tableTennis: Object.freeze({ m: 0.0027, drop: 0.3, rebound: 0.23, e: 0.876, r: 0.02 }),
});
// Radii (r) are typical regulation sizes, not from Tesla; they only set the drawn size.

// Heights h0, e^2 h0, e^4 h0, ... (n + 1 values: the drop and n rebounds).
export function bounceHeights(h0, e, n) {
  const out = [h0];
  for (let i = 0; i < n; i++) out.push(out[i] * e * e);
  return out;
}

// Mechanical energy split for mass m at height h with speed v.
export function energyAt(m, h, v) {
  const gpe = m * g * h, ke = 0.5 * m * v * v;
  return { gpe, ke, total: gpe + ke };
}

// Mechanical energy lost in one impact when dropped from h: m g h (1 - e^2).
export function lossPerBounce(m, h, e) {
  return m * g * h * (1 - e * e);
}

// Height and speed at time t of a ball bouncing from h0 with restitution e (floor at 0).
export function ballState(h0, e, t) {
  let h = h0, v0 = 0, start = 0, bounces = 0;
  let fall = Math.sqrt((2 * h) / g);
  if (t < fall) return { y: h0 - 0.5 * g * t * t, v: g * t, bounces, peak: h0 };
  start = fall;
  for (;;) {
    h *= e * e;
    v0 = Math.sqrt(2 * g * h);
    const dur = (2 * v0) / g;
    bounces++;
    if (h < 1e-3 || bounces > 60) return { y: 0, v: 0, bounces, peak: 0, rest: true };
    if (t < start + dur) { const s = t - start; return { y: v0 * s - 0.5 * g * s * s, v: Math.abs(v0 - g * s), bounces, peak: h }; }
    start += dur;
  }
}

// ---------- Grid chain (Every Joule Sim 8), Tesla W1 correction applied ----------
// Only Tesla-cleared values (tesla-energy-check.md W1, C11, O3). The transformer has NO separate factor:
// its heating is inside the aggregate grid loss, so the old 0.99 multiplier is gone and nothing is counted twice.
export const GRID_RETAINED = 1 - 28456.6 / 323031.1; // 0.911907553, DUKES losses / supply
export const LAMP_W = 7;
// plant: station efficiencies already include the generator (C11), so no second generator factor.
export const SOURCES = Object.freeze({
  gas: Object.freeze({ stages: [["plant", 0.4799]], badge: null }),
  coal: Object.freeze({ stages: [["plant", 0.3464]], badge: "historical" }),
  nuclear: Object.freeze({ stages: [["plant", 0.3919]], badge: null }),
  hydro: Object.freeze({ stages: [["plant", 0.9]], badge: null }),
  wind: Object.freeze({ stages: [["rotor", 0.5], ["generator", 0.985]], badge: null }),
  solar: Object.freeze({ stages: [["module", 0.227]], badge: "incomplete" }), // no inverter: Tesla O3
});

// Every stage once: plant (or rotor, generator, module), then the single aggregate grid stage.
export function gridChain(source, input = 1) {
  const s = SOURCES[source];
  const stages = [...s.stages, ["grid", GRID_RETAINED]];
  let e = input; const out = [];
  for (const [name, eff] of stages) { const kept = e * eff; out.push({ name, eff, in: e, out: kept, loss: e - kept }); e = kept; }
  const overall = e / input;
  return { stages: out, delivered: e, losses: out.reduce((a, x) => a + x.loss, 0), overall, input, badge: s.badge };
}
export const overallEfficiency = (src) => gridChain(src).overall;
export const sourceInputFor = (src, pLamp = LAMP_W) => pLamp / overallEfficiency(src);


// ---------- Kettle (Every Joule Sim 5, Page 12), Tesla C6 cleared ----------
export const C_WATER = 4180; // J/(kg K), rounded course value
export const KETTLE = Object.freeze({ m: 0.23, P: 3000, T0: 20, T1: 100, eta: 1 });
export const heatQ = (m, C, dT) => m * C * dT;
// Ideal minimum heating time in this model: t = m C dT / (eta P).
export const kettleTime = (m = KETTLE.m, P = KETTLE.P, dT = KETTLE.T1 - KETTLE.T0, eta = KETTLE.eta, C = C_WATER) => heatQ(m, C, dT) / (eta * P);
export const band5 = (t) => [t * 0.95, t * 1.05];

// ---------- Insulation (Page 14): Tesla O2 holds every number ----------
// Qualitative only: relative loss shape for drawing. No U-values, areas, watts or times may be shown.
// thickness in 0..1; returns a unitless 0..1 drawing scale that only says "less with more insulation".
export const relativeLossShape = (thickness) => 1 / (1 + 3 * Math.max(0, Math.min(1, thickness)));

// ---------- Energy stores (Sim 1), Tesla C1: transferred, not destroyed ----------
export const STORES = Object.freeze(["kinetic", "gravitational", "elastic", "thermal", "chemical", "magnetic", "electrostatic", "nuclear"]);
// Book-Earth system from height h (page scale, declared zero height). Shares at fraction s of the fall, then after rest.
export function bookFall(s) {
  s = Math.max(0, Math.min(1, s));
  return s < 1 ? { gravitational: 1 - s, kinetic: s, dissipated: 0 } : { gravitational: 0, kinetic: 0, dissipated: 1 };
}

// ---------- Energy in food (Sim 9), Tesla C8 with W2, W3, O4 applied ----------
export const KCAL = 4184; // J
export const FOODS = Object.freeze({ porridge: 1047e3, cornflakes: 1044e3, toast: 832e3, banana: 438e3 }); // J, corrected labels
export const CLIMB = Object.freeze({ m: 60, h: 1.75, eff: 0.25, flights: 200 });
export const flightGPE = (m = CLIMB.m, h = CLIMB.h) => m * g * h;
export const flightFood = (m = CLIMB.m, h = CLIMB.h, eff = CLIMB.eff) => flightGPE(m, h) / eff;
export const flightsFrom = (foodJ, m, h, eff) => foodJ / flightFood(m, h, eff);
// Least-energy listed food that still pays for n flights.
export function leastSufficient(n = CLIMB.flights, m, h, eff) {
  const need = n * flightFood(m, h, eff);
  return Object.entries(FOODS).filter(([, J]) => J >= need).sort((a, b) => a[1] - b[1])[0]?.[0] ?? null;
}

// ---------- Nothing is lost (Sim 10), Tesla C9 + C1, declared closed model ----------
export const JOURNEY = Object.freeze({ m: 60, v: 1.5, food: 270 }); // kg, m/s, J removed from the food store
export const ledger = (E_initial, E_in, E_out) => E_initial + E_in - E_out; // E_final
// Phase 0..1 walking (KE held), 1..2 stopping. Returns the closed-model stores in J; total is always food.
export function journey(phase) {
  const { m, v, food } = JOURNEY, ke = 0.5 * m * v * v; // 67.5 J
  const p = Math.max(0, Math.min(2, phase));
  if (p <= 1) return { food: food * (1 - p), kinetic: ke * p, thermal: (food - ke) * p };
  const s = p - 1; return { food: 0, kinetic: ke * (1 - s), thermal: food - ke * (1 - s) };
}

// ---------- Kinetic and gravitational (Sim 2), Tesla C1, C2 ----------
// Frictionless: ME = KE + GPE fixed, so the return maximum equals the release height.
export const speedAt = (h0, h) => Math.sqrt(2 * g * Math.max(0, h0 - h));
export const mechanical = (m, h, v) => energyAt(m, h, v).total;
// Friction on: no coefficient is cleared, so the drawing uses a unitless shape factor and the scene shows no number for it.
export const FRICTION_DRAW = 0.8;
