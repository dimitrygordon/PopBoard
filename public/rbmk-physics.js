/**
 * PopBoard RBMK study module — classroom point-kinetics core.
 *
 * Simplifications (also shown in the module):
 * - Two axial zones (lower / upper), one delayed-neutron group.
 * - Reactivity coefficients, prompt lifetime, and the void map are game-tuned
 *   so the Chernobyl night is savable at the two real decision points and
 *   unsavable once the excursion conditions coincide. Not a licensing model.
 * - Iodine-135 / xenon-135 use real half-lives. Burnup and inert products
 *   stay frozen (the accident night is too short for them to move).
 * - Graphite is a fixed moderator. There are no moderator rods.
 *   Water is coolant and a neutron absorber. Void coefficient is positive.
 * - Noise is never applied here. Readouts call `noisy()` on the way to the screen.
 */
"use strict";

export const PARAMS = {
  beta: 0.005,
  Lambda: 0.001,
  lambdaD: 0.08,
  Pnom: 3200,
  rodTravel: 19.5,
  tipEnd: 0.2,
  tipMax: 460,
  tipLowerShare: 1.22,
  tipUpperShare: 0.78,
  rodWorth: 8200,
  xEq: 0.36,
  aVoid: 1500,
  aFuel: 1.35,
  aGraphite: 0.18,
  aXe: 2800,
  nRods: 211,
  ormSafe: 30,
  forbiddenMWt: 700,
  pressureNom: 7,
  pressureFail: 10.6,
  offscaleMWt: 20000,
  pegMWt: 6500,
  coastTau: 42,
  Tin: 270,
  psi: 5,
  xeIodineFraction: 0.94,
  couple: 0.35,
  halfLifeI: 6.6,
  halfLifeXe: 9.2
};

const LN2 = Math.LN2;
const LI = LN2 / (PARAMS.halfLifeI * 3600);
const LX = LN2 / (PARAMS.halfLifeXe * 3600);

export function clamp(x, a, b) {
  return Math.max(a, Math.min(b, x));
}

function smooth(t) {
  t = clamp(t, 0, 1);
  return t * t * (3 - 2 * t);
}

/** Positive graphite-tip shape, 1 at mid-stroke of the first ~1.4 m, else 0. */
export function tipShape(x) {
  if (x <= 0 || x >= PARAMS.tipEnd) return 0;
  return Math.sin(Math.PI * x / PARAMS.tipEnd);
}

/**
 * Absorber fraction in the core.
 * Through the graphite-tip window the absorbers are still above the fuel,
 * so ORM stays near 8 (red zone). Shutdown worth arrives only after tipEnd,
 * which is what makes AZ-5 from the night position worse before it is better.
 * ORM 30, the safe floor, is just past that window.
 */
export function rodFrac(x) {
  const plateau = 8 / PARAMS.nRods;
  if (x <= PARAMS.tipEnd) return plateau * smooth(clamp(x / 0.025, 0, 1));
  const u = (x - PARAMS.tipEnd) / (1 - PARAMS.tipEnd);
  // Mild slope through the operating band so a small rod nudge is not prompt.
  return clamp(plateau + (1 - plateau) * Math.pow(u, 1.08), 0, 1);
}

export function ormOf(x) {
  return PARAMS.nRods * rodFrac(x);
}

export function powerOf(state) {
  return state.nL + state.nU;
}

function tsat(pressure) {
  return 285.8 + 10.2 * (pressure - 7);
}

/**
 * Core-average void target from power, flow, and separator margin.
 * Nominal 3200 MWt / 100% flow / margin 0 sits on the reference void.
 * Low power + high flow is subcooled. Low power + very low flow, or a
 * low separator margin plus a coastdown, climbs the positive-void cliff.
 */
export function thermalTargets(state) {
  const P = Math.max(powerOf(state), 0);
  const flowF = Math.max(state.flow, 3) / 100;
  const r = (P / PARAMS.Pnom) / flowF;
  // Gentle saturating void at normal flow so Doppler can hold 3200 MWt.
  const base = 0.33 * Math.pow(clamp(r, 0, 2.2), 0.42);
  const subcool = Math.max(0.8, (tsat(state.pressure) - PARAMS.Tin) * (1 - 0.88 * clamp(state.margin, 0, 1)));
  const hotRise = 26 * (P / PARAMS.Pnom) / flowF;
  // Off-normal: low flow and/or a low separator margin. This is the positive-void cliff.
  const off = clamp(clamp((0.72 - flowF) / 0.48, 0, 1) * 0.7 + clamp(state.margin, 0, 1) * 0.55, 0, 1.3);
  const cliffArg = hotRise * (1 + 2.4 * off) - subcool;
  const cliff = off * 0.9 / (1 + Math.exp(-0.32 * (cliffArg - 3.5)));
  const alpha = clamp(base + cliff, 0.004, 0.95);
  const tout = PARAMS.Tin + Math.min(Math.max(hotRise, 0) * 0.5, Math.max(2, tsat(state.pressure) - PARAMS.Tin));
  const tcool = (PARAMS.Tin + tout) / 2;
  const TfEq = tcool + 420 * Math.pow(Math.max(P, 0) / PARAMS.Pnom, 0.65) / Math.pow(flowF, 0.35);
  const TgEq = 480 + 120 * clamp(P / PARAMS.Pnom, 0, 1.5) + 0.05 * ((state.Tf || 640) - 640);
  return { alpha, Tout: tout, excess: cliffArg, hotRise, subcool, TfEq, TgEq, tcool, off, base, cliff };
}

export function reactivity(state) {
  const base = -PARAMS.rodWorth * (rodFrac(state.rod) - rodFrac(PARAMS.xEq));
  const tip = PARAMS.tipMax * tipShape(state.rod);
  const voidP = PARAMS.aVoid * (state.alpha - state.alphaRef);
  const fuel = -PARAMS.aFuel * (state.Tf - state.TfRef);
  const graphite = PARAMS.aGraphite * (state.Tg - state.TgRef);
  const xenon = -PARAMS.aXe * (state.Xe - 1);
  const lower = base + tip * PARAMS.tipLowerShare + voidP + fuel + graphite + xenon;
  const upper = base + tip * PARAMS.tipUpperShare + voidP + fuel + graphite + xenon;
  const n = Math.max(powerOf(state), 1e-9);
  const total = (state.nL * lower + state.nU * upper) / n;
  return {
    rods: base,
    tip,
    void: voidP,
    fuel,
    graphite,
    xenon,
    lower,
    upper,
    total
  };
}

export function fluxes(state) {
  const fast = powerOf(state) / PARAMS.Pnom;
  const thermal = fast * (1 - 0.7 * clamp(state.alpha, 0, 1)) * (0.9 + 0.1 * clamp(state.Tg / 700, 0.5, 1.3));
  return { fast, thermal, ratio: thermal / Math.max(fast, 1e-12) };
}

export function composition(state) {
  return {
    uranium: 1,
    inert: 0.42,
    iodine: state.I,
    xenon: state.Xe,
    water: clamp(1 - state.alpha, 0, 1),
    graphite: 1
  };
}

function precursorEq(n) {
  return (PARAMS.beta / PARAMS.Lambda) / PARAMS.lambdaD * n;
}

export function nominalState() {
  const s = {
    t: 0,
    nL: PARAMS.Pnom / 2,
    nU: PARAMS.Pnom / 2,
    cL: 0,
    cU: 0,
    I: 1,
    Xe: 1,
    Tf: 640,
    Tg: 600,
    Tout: 284,
    alpha: 0.3,
    alphaRef: 0.3,
    TfRef: 640,
    TgRef: 600,
    pressure: PARAMS.pressureNom,
    flow: 100,
    pumps: [1, 1, 1, 1, 1, 1, 0, 0],
    coast: [0, 0, 0, 0, 0, 0, 0, 0],
    rod: PARAMS.xEq,
    rodTarget: PARAMS.xEq,
    scram: false,
    margin: 0,
    failed: false,
    offscale: false,
    saved: false,
    failAge: 0,
    sawHigh: false,
    events: []
  };
  s.cL = precursorEq(s.nL);
  s.cU = precursorEq(s.nU);
  const th = thermalTargets(s);
  s.alpha = th.alpha;
  s.alphaRef = th.alpha;
  s.Tout = th.Tout;
  s.Tf = th.TfEq;
  s.TfRef = th.TfEq;
  s.Tg = 600;
  s.TgRef = 600;
  return s;
}

export function cloneState(s) {
  return {
    ...s,
    pumps: s.pumps.slice(),
    coast: s.coast.slice(),
    events: s.events.slice()
  };
}

function pumpFlowFraction(state) {
  let f = 0;
  for (let i = 0; i < 8; i++) f += (state.pumps[i] ? 1 : 0) + state.coast[i];
  return f / 6;
}

export function setPumpCount(state, n, coast) {
  n = clamp(Math.round(n), 0, 8);
  for (let i = 0; i < 8; i++) {
    const want = i < n;
    if (state.pumps[i] && !want) {
      state.pumps[i] = 0;
      state.coast[i] = coast ? 1 : 0;
    } else if (!state.pumps[i] && want) {
      state.pumps[i] = 1;
      state.coast[i] = 0;
    }
  }
}

function stepPumps(state, dt) {
  for (let i = 0; i < 8; i++) {
    if (!state.pumps[i] && state.coast[i] > 0) {
      state.coast[i] = Math.max(0, state.coast[i] * Math.exp(-dt / PARAMS.coastTau));
    }
  }
  // Coasting pumps ARE the 30–60 s flow drop. Flow follows them directly.
  state.flow = Math.max(3, pumpFlowFraction(state) * 100);
}

function stepRods(state, dt) {
  const target = state.scram ? 1 : clamp(state.rodTarget, 0, 1);
  const speed = 1 / PARAMS.rodTravel;
  const d = target - state.rod;
  if (Math.abs(d) <= speed * dt) state.rod = target;
  else state.rod += Math.sign(d) * speed * dt;
}

function stepZone(n, c, rhoPcm, dt) {
  const rho = rhoPcm * 1e-5;
  const a = (rho - PARAMS.beta) / PARAMS.Lambda;
  const b = PARAMS.lambdaD;
  const cc = PARAMS.beta / PARAMS.Lambda;
  const d = -PARAMS.lambdaD;
  const tr = a + d;
  const det = a * d - b * cc;
  const disc = tr * tr - 4 * det;
  const n0 = Math.max(n, 1e-18);
  const c0 = Math.max(c, 0);
  if (disc <= 1e-12) {
    const n1 = Math.max(0, n0 + dt * (a * n0 + b * c0));
    const c1 = Math.max(0, c0 + dt * (cc * n0 + d * c0));
    return { n: n1, c: c1 };
  }
  const sd = Math.sqrt(disc);
  const s1 = 0.5 * (tr + sd);
  const s2 = 0.5 * (tr - sd);
  const np = a * n0 + b * c0;
  const denom = s1 - s2 || 1e-9;
  const A = (np - s2 * n0) / denom;
  const B = n0 - A;
  const e1 = Math.exp(clamp(s1 * dt, -50, 40));
  const e2 = Math.exp(clamp(s2 * dt, -50, 40));
  let n1 = A * e1 + B * e2;
  const np1 = s1 * A * e1 + s2 * B * e2;
  let c1 = (np1 - a * n1) / b;
  if (!isFinite(n1) || n1 < 0) n1 = 0;
  if (!isFinite(c1) || c1 < 0) c1 = 0;
  return { n: n1, c: c1 };
}

function stepPoison(state, dt) {
  const p = clamp(powerOf(state) / PARAMS.Pnom, 0, 2.5);
  const sub = Math.max(1, Math.ceil(dt / 20));
  const h = dt / sub;
  for (let i = 0; i < sub; i++) {
    const dI = LI * (p - state.I);
    const prod = (1 - PARAMS.xeIodineFraction) * p + PARAMS.xeIodineFraction * state.I;
    const dest = state.Xe * (1 + PARAMS.psi * p) / (1 + PARAMS.psi);
    const dX = LX * (1 + PARAMS.psi) * (prod - dest);
    state.I = Math.max(0, state.I + dI * h);
    state.Xe = Math.max(0, state.Xe + dX * h);
  }
}

function pushEvent(state, msg) {
  const last = state.events[state.events.length - 1];
  if (last && last.msg === msg) return;
  state.events.push({ t: state.t, msg });
  if (state.events.length > 80) state.events.shift();
}

function latchFailure(state, why) {
  if (state.failed) return;
  state.failed = true;
  state.offscale = true;
  state.saved = false;
  state.peakKnown = false;
  pushEvent(state, why);
}

function stepOnce(state, dt) {
  if (state.failed) {
    state.failAge += dt;
    state.t += dt;
    const cap = PARAMS.offscaleMWt;
    const p = powerOf(state);
    if (p > cap) {
      const s = cap / p;
      state.nL *= s;
      state.nU *= s;
    }
    return;
  }
  stepRods(state, dt);
  stepPumps(state, dt);
  const rho = reactivity(state);
  const L = stepZone(state.nL, state.cL, rho.lower, dt);
  const U = stepZone(state.nU, state.cU, rho.upper, dt);
  state.nL = L.n;
  state.cL = L.c;
  state.nU = U.n;
  state.cU = U.c;
  const xfer = clamp(PARAMS.couple * dt * (state.nU - state.nL), -0.2 * Math.max(state.nL, state.nU, 0), 0.2 * Math.max(state.nL, state.nU, 0));
  state.nL = Math.max(0, state.nL + xfer);
  state.nU = Math.max(0, state.nU - xfer);

  const th = thermalTargets(state);
  const tauA = 1.15;
  state.alpha = clamp(state.alpha + (th.alpha - state.alpha) * (1 - Math.exp(-dt / tauA)), 0, 0.96);
  state.Tout = state.Tout + (th.Tout - state.Tout) * (1 - Math.exp(-dt / 2.5));
  state.Tf = state.Tf + (th.TfEq - state.Tf) * (1 - Math.exp(-dt / 6.5));
  state.Tg = state.Tg + (th.TgEq - state.Tg) * (1 - Math.exp(-dt / 110));
  const steam = (powerOf(state) / PARAMS.Pnom) * (0.3 + 0.7 * clamp(state.alpha / Math.max(state.alphaRef, 0.05), 0, 4));
  const pTarget = PARAMS.pressureNom + 0.85 * (steam - 1) + 2.4 * Math.max(0, state.alpha - state.alphaRef - 0.18) * Math.max(powerOf(state) / 400, 0.2);
  state.pressure = Math.max(0.4, state.pressure + (pTarget - state.pressure) * (1 - Math.exp(-dt / 5.5)));

  stepPoison(state, dt);
  state.t += dt;

  const P = powerOf(state);
  if (P > PARAMS.pegMWt) state.sawHigh = true;
  if (P > PARAMS.offscaleMWt || (state.pressure > PARAMS.pressureFail && P > 1200 && state.alpha > 0.45)) {
    latchFailure(state, "Pressure failure — power instruments OFF SCALE. Steam explosion. Not a nuclear detonation.");
  }
}

export function driveStory(state, mode) {
  if (mode === "to1600") followPower(state, 1600);
  else if (mode === "drop") {
    if (powerOf(state) > 45) state.rodTarget = clamp(state.rod + 0.01, 0, 0.95);
    else followPower(state, 30);
  } else if (mode === "recover" || mode === "hold200") withdrawToFloor(state, 8, 260);
  else if (mode === "waitxe") state.scram = true;
}

export function tripCoastingPumps(state, n = 4) {
  let tripped = 0;
  for (let i = 0; i < 8 && tripped < n; i++) {
    if (state.pumps[i]) {
      state.pumps[i] = 0;
      state.coast[i] = 1;
      tripped++;
    }
  }
  return tripped;
}

export function advance(state, dt) {
  const prevP = powerOf(state);
  let left = Math.max(0, dt);
  let guard = 0;
  while (left > 1e-9 && guard < 200000) {
    guard++;
    if (state.failed) {
      const h = Math.min(left, 0.25);
      stepOnce(state, h);
      left -= h;
      continue;
    }
    const rho = reactivity(state);
    const hot = Math.max(Math.abs(rho.lower), Math.abs(rho.upper), Math.abs(rho.total));
    const Pnow = powerOf(state);
    const rodGoal = state.scram ? 1 : state.rodTarget;
    const moving = Math.abs(rodGoal - state.rod) > 2e-4;
    let h = left;
    // Shut down: xenon moves on an hour scale, and the analytic kinetics step
    // stays accurate over tens of seconds while power is already ~0.
    if (Pnow < 1.5 && !moving) h = Math.min(left, 30);
    else if (moving || Pnow > 9000 || (hot > 220 && Pnow > 15)) h = Math.min(h, 0.025);
    else if (hot > 45 && Pnow > 15) h = Math.min(h, 0.15);
    else if (Pnow > 8) h = Math.min(h, 2);
    else h = Math.min(h, 30);
    stepOnce(state, h);
    left -= h;
  }
  state._prevP = prevP;
  return state;
}

export function solveXeForCritical(state) {
  state.Xe = 1;
  const r0 = reactivity(state).total;
  state.Xe = clamp(1 + r0 / PARAMS.aXe, 0.02, 6);
  state.cL = precursorEq(state.nL);
  state.cU = precursorEq(state.nU);
  return state.Xe;
}

export function rodForOrm(target) {
  let best = 0;
  let bestD = 1e9;
  for (let i = 0; i <= 1000; i++) {
    const x = i / 1000;
    const d = Math.abs(ormOf(x) - target);
    if (d < bestD) {
      bestD = d;
      best = x;
    }
  }
  return best;
}

function setPowerSplit(state, p) {
  state.nL = p * 0.5;
  state.nU = p * 0.5;
  state.cL = precursorEq(state.nL);
  state.cU = precursorEq(state.nU);
}

/** Critical low-power, low-ORM state before the turbine test. Save point 1. */
export function stateSavePoint1() {
  const s = nominalState();
  setPowerSplit(s, 200);
  s.rod = rodForOrm(8);
  s.rodTarget = s.rod;
  s.margin = 0;
  setPumpCount(s, 6, false);
  s.flow = 100;
  s.Tf = 340;
  s.Tg = 590;
  const th = thermalTargets(s);
  s.alpha = th.alpha;
  s.Tout = th.Tout;
  s.I = 1.35;
  solveXeForCritical(s);
  s.saved = false;
  s.failed = false;
  s.offscale = false;
  return s;
}

/** Test-prep: 8 pumps, low separator margin, still low ORM, void not yet runaway. */
export function stateSavePoint2() {
  const s = stateSavePoint1();
  s.margin = 0.55;
  setPumpCount(s, 8, false);
  s.flow = (8 / 6) * 100;
  s.Tf = 330;
  const th = thermalTargets(s);
  s.alpha = th.alpha;
  s.Tout = th.Tout;
  solveXeForCritical(s);
  return s;
}

/**
 * Low power + high void + withdrawn rods, flow already down.
 * Criticality is NOT restored — void has made the core supercritical.
 * AZ-5 from here is the unsurvivable branch.
 */
export function stateExcursion() {
  const s = stateSavePoint1();
  s.margin = 0.88;
  s.pumps = [0, 0, 0, 0, 0, 0, 0, 0];
  s.coast = [0.2, 0.2, 0.2, 0.2, 0, 0, 0, 0];
  s.flow = 12;
  s.Tf = 380;
  const th = thermalTargets(s);
  s.alpha = th.alpha;
  s.Tout = th.Tout;
  s.pressure = 7.6;
  s.cL = precursorEq(s.nL);
  s.cU = precursorEq(s.nU);
  return s;
}

export function classify(state) {
  const P = powerOf(state);
  const rho = reactivity(state);
  const orm = ormOf(state.rod);
  const betaPcm = PARAMS.beta * 1e5;
  let stage = "S0";
  let banner = "Stable";
  if (state.failed || state.offscale) {
    stage = "S5";
    banner = "Pressure failure";
  } else if (state.saved) {
    stage = "S0";
    banner = "Reactor saved";
  } else if (rho.total > 0.92 * betaPcm && P > 50) {
    stage = "S2";
    banner = "Prompt risk";
  } else if (state.scram && state.rod < 0.98) {
    stage = "S4";
    banner = rho.tip > 80 ? "Prompt risk" : "Stable";
  } else if (state.pressure > 8.15 || (state.alpha > 0.5 && P > 900 && state.pressure > 7.5)) {
    stage = "S3";
    banner = "Pressure failure";
  } else if (rho.void > 120 && rho.total > 40) {
    stage = "S2";
    banner = "Void driven rise";
  } else if (P > state._prevP * 1.004 + 2 && rho.total > 25) {
    stage = "S1";
    banner = rho.void > rho.rods && rho.void > 60 ? "Void driven rise" : "Stable";
  } else if (state.Xe > 1.18 && P < 1100) {
    stage = "S0";
    banner = "Xenon limited";
  }
  if (!state.failed && !state.saved && banner === "Stable" && rho.void > 180 && rho.total > 80) banner = "Void driven rise";
  return {
    stage,
    banner,
    orm,
    forbidden: P < PARAMS.forbiddenMWt && P > 5 && !state.failed && !state.saved,
    rho
  };
}

export function lidPose(state) {
  if (!state.failed) {
    const over = Math.max(0, state.pressure - 7.45);
    return { lift: 0, tilt: 0, debris: 0, lost: 0, wisps: clamp(over / 1.6, 0, 1), shake: clamp(over / 2.2, 0, 1) };
  }
  const k = clamp(state.failAge / 2.4, 0, 1);
  const lost = state.failAge > 0.15 ? clamp((state.failAge - 0.15) / 0.7, 0, 1) : 0;
  const room = state.failAge > 0.45 ? clamp((state.failAge - 0.45) / 1.2, 0, 1) : 0;
  return {
    lift: smooth(k),
    tilt: smooth(k) * 0.42,
    debris: clamp((k - 0.2) / 0.6, 0, 1),
    lost,
    wisps: 1,
    shake: room
  };
}

/** Sensor noise only. Do not feed this back into `advance`. */
export function noisy(value, rel, rand) {
  const u = Math.max(rand(), 1e-12);
  const v = rand();
  const g = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  return value + rel * g * (Math.abs(value) + 1e-3);
}

export function displayPower(state) {
  if (state.offscale || state.failed) return { known: false, text: "OFF SCALE" };
  const p = powerOf(state);
  return { known: true, text: p.toFixed(p >= 100 ? 0 : 1), value: p };
}

function followPower(state, target) {
  const P = powerOf(state);
  const rho = reactivity(state).total;
  if (rho > 70) {
    state.rodTarget = clamp(Math.max(state.rodTarget, state.rod) + 0.004, 0, 0.95);
    return;
  }
  if (Math.abs(state.rod - state.rodTarget) > 0.01) return;
  // Power above the target → insert (step > 0). Withdrawing while rho is already up is how a student blows the core.
  const err = (P - target) / Math.max(target, 50);
  const step = clamp(err * 0.0035, -0.0025, 0.0025);
  if (step < 0 && rho > 12) return;
  state.rodTarget = clamp(state.rod + step, 0.02, 0.92);
}

function withdrawToFloor(state, ormFloor, powerCap) {
  const P = powerOf(state);
  const rho = reactivity(state).total;
  const xFloor = rodForOrm(ormFloor);
  if (P > powerCap || rho > 90) {
    state.rodTarget = clamp(state.rod + 0.01, 0, 0.95);
    return;
  }
  if (state.rod > xFloor + 0.008 && P < powerCap * 0.92) {
    state.rodTarget = Math.max(xFloor, state.rod - 0.01);
  }
}

/**
 * Runs the night up to a decision point on the real kinetics.
 * `save1` is the recovered ~200 MWt / low ORM state.
 * `save2` is that state after test prep (8 pumps), before rundown.
 */
export function simulateStoryTo(which) {
  const s = nominalState();
  s.rodTarget = s.rod;
  const hour = 3600;
  const schedule = [
    { dur: 30 * 60, target: 1600, margin: 0, pumps: 6 },
    { dur: 9 * hour, target: 1600, margin: 0, pumps: 6 },
    { dur: 40 * 60, target: 30, margin: 0, pumps: 6, error: true },
    { dur: 25 * 60, target: 200, margin: 0, pumps: 6, floorOrm: 8 }
  ];
  if (which === "save2" || which === "excursion") {
    schedule.push({ dur: 18 * 60, target: 200, margin: 0.55, pumps: 8, floorOrm: 8 });
  }
  for (const seg of schedule) {
    let left = seg.dur;
    setPumpCount(s, seg.pumps, false);
    s.margin = seg.margin;
    while (left > 0) {
      const h = Math.min(left, 8);
      if (seg.error && powerOf(s) > Math.max(seg.target * 1.4, 50)) {
        s.rodTarget = clamp(s.rod + 0.01, 0, 0.95);
      } else if (seg.floorOrm) {
        withdrawToFloor(s, seg.floorOrm, seg.target * 1.25);
      } else {
        followPower(s, seg.target);
      }
      advance(s, h);
      left -= h;
      if (s.failed) return s;
    }
  }
  if (which === "excursion") {
    s.margin = 0.82;
    tripCoastingPumps(s, 4);
    let left = 50;
    while (left > 0 && !s.failed) {
      advance(s, 0.5);
      left -= 0.5;
      if (powerOf(s) > 800 && s.alpha > 0.35) {
        s.scram = true;
        advance(s, 8);
        break;
      }
    }
    if (!s.failed) {
      s.scram = true;
      advance(s, 12);
    }
  }
  return s;
}

export function shutdownAndWait(state, hours) {
  const s = cloneState(state);
  s.scram = true;
  s.saved = false;
  advance(s, 180);
  if (s.failed || s.offscale) return s;
  const remain = Math.max(0, hours * 3600 - 180);
  advance(s, remain);
  if (!s.failed && powerOf(s) < 15 && s.rod > 0.9) {
    s.saved = true;
    pushEvent(s, "REACTOR SAVED — shut down, xenon waited out.");
  }
  return s;
}

export function abortTest(state) {
  const s = cloneState(state);
  s.scram = false;
  s.rodTarget = rodForOrm(48);
  s.margin = 0.1;
  setPumpCount(s, 6, true);
  advance(s, 240);
  if (!s.failed && !s.offscale && ormOf(s.rod) >= PARAMS.ormSafe && powerOf(s) < PARAMS.forbiddenMWt) {
    s.saved = true;
    pushEvent(s, "REACTOR SAVED — test aborted, ORM restored, pumps reduced.");
  }
  return s;
}

export function scramExcursion(state) {
  const s = cloneState(state);
  s.scram = true;
  advance(s, 25);
  return s;
}

export const SIMPLIFICATIONS = [
  "Two axial zones and one delayed-neutron group. A real RBMK needs a full spatial kinetics model.",
  "Prompt lifetime, rod worth, void map, and separator margin are tuned so the classroom night matches the known decision points. Timescales of the neutronics are not plant data.",
  "Eight pumps are represented as one flow. Rods move as a single bank (real RBMK: manual, automatic, and shortened bottom rods).",
  "Iodine-135 (6.6 h) and xenon-135 (9.2 h) use real half-lives. Burnup and inert products stay frozen on the accident night.",
  "Graphite is a fixed moderator stack. There are no moderator rods. Water is the coolant and a neutron absorber.",
  "The second explosion's mechanism is disputed. This module shows a steam explosion and an exposed core, not a nuclear detonation, and it never invents a precise peak power."
];
