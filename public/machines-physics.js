/**
 * PopBoard Simple Machines — shared mechanics core.
 *
 * Each machine is one model. Ideal (frictionless, massless rope and
 * pulleys) and real (friction, rope or pulley mass) are computed together
 * and kept in separate fields. The ideal block is an overlay, not a second
 * hidden machine.
 *
 * Work of a constant force parallel to the displacement is W = F d.
 * An ideal machine conserves mechanical energy, so a smaller force acts
 * through a longer distance: F_in d_in = F_out d_out.
 *
 * SI units: newtons, meters, joules, kilograms, radians, newton-meters.
 * Efficiency is a percent. Angles passed to these functions are radians.
 *
 * Later phases plug in through MODES / LATER_PHASES. Wedge and screw labs
 * should draw flat cutaways; the screw thread unrolls into this inclined
 * plane. registerMachine() accepts an analyzer for those ids.
 */
"use strict";

export const G = 9.80665;

export const MODES = [
  { id: "workbench", label: "Workbench", phase: 1 },
  { id: "lever", label: "Lever", phase: 1 },
  { id: "pulley", label: "Pulley", phase: 1 },
  { id: "plane", label: "Inclined Plane", phase: 1 },
  { id: "wheel-axle", label: "Wheel & Axle", phase: 2 },
  { id: "wedge", label: "Wedge", phase: 2 },
  { id: "screw", label: "Screw", phase: 2 },
  { id: "build", label: "Build", phase: 3 },
  { id: "identify", label: "Identify", phase: 3 },
  { id: "guided", label: "Guided", phase: 3 }
];

export const MODE_ALIASES = {
  workbench: "workbench",
  compare: "workbench",
  machines: "workbench",
  lever: "lever",
  seesaw: "lever",
  wheelbarrow: "lever",
  tweezers: "lever",
  pulley: "pulley",
  pulleys: "pulley",
  fixed: "pulley",
  movable: "pulley",
  tackle: "pulley",
  "block-and-tackle": "pulley",
  block: "pulley",
  plane: "plane",
  incline: "plane",
  inclined: "plane",
  "inclined-plane": "plane",
  ramp: "plane",
  "wheel-axle": "wheel-axle",
  wheel: "wheel-axle",
  axle: "wheel-axle",
  wheel_axle: "wheel-axle",
  wedge: "wedge",
  screw: "screw",
  build: "build",
  "free-build": "build",
  freebuild: "build",
  identify: "identify",
  guided: "guided",
  labs: "guided"
};

/** Design notes for phases that are not built yet. The UI reserves a tab for each. */
export const LATER_PHASES = {
  "wheel-axle": {
    phase: 2,
    title: "Wheel & Axle",
    hook: "Same workbench card shape. Ideal MA = R / r. Register an analyzer with machines.registerMachine('wheel-axle', fn)."
  },
  wedge: {
    phase: 2,
    title: "Wedge",
    hook: "Draw a flat cutaway line drawing. A wedge is an inclined plane pushed under the load; ideal MA = length / thickness."
  },
  screw: {
    phase: 2,
    title: "Screw",
    hook: "Unroll the thread into an inclined plane. Pitch and circumference set the slope, then reuse the plane model."
  },
  build: {
    phase: 3,
    title: "Free-build",
    hook: "Challenge mode: assemble a machine that hits a target force, distance, and efficiency."
  },
  identify: {
    phase: 3,
    title: "Identify",
    hook: "Real-world identification activity. Students name the class, the fulcrum, and the ideal MA."
  },
  guided: {
    phase: 3,
    title: "Guided labs",
    hook: "Guided lab sequence plugs in here and reads machines.state."
  }
};

/**
 * Textbook examples. The class does not change the MA formula.
 * MA = d_in / d_out for a perpendicular effort on every class.
 */
export const LEVER_PRESETS = {
  seesaw: {
    name: "Seesaw",
    blurb: "First class — fulcrum between effort and load",
    leverClass: 1,
    barLength: 2.4,
    fulcrum: 1.6,
    loadMass: 10
  },
  wheelbarrow: {
    name: "Wheelbarrow",
    blurb: "Second class — load between fulcrum and effort",
    leverClass: 2,
    barLength: 1.2,
    loadAt: 0.4,
    loadMass: 20
  },
  tweezers: {
    name: "Tweezers",
    blurb: "Third class — effort between fulcrum and load",
    leverClass: 3,
    barLength: 0.8,
    effortAt: 0.2,
    loadMass: 0.5
  }
};

const analyzers = new Map();

/** Later phases register a function (input) => machine result. */
export function registerMachine(id, analyzer) {
  if (typeof analyzer !== "function") throw new Error("analyzer must be a function");
  analyzers.set(id, analyzer);
}

export function getMachine(id) {
  return analyzers.get(id) || null;
}

export function clamp(x, a, b) {
  return Math.max(a, Math.min(b, x));
}

/** W = F d for a constant force parallel to the displacement. */
export function work(force, displacement) {
  return force * displacement;
}

/** 100 * useful output work / input work. Zero when nothing is put in. */
export function efficiencyPercent(outputWork, inputWork) {
  if (!(inputWork > 0)) return 0;
  return (outputWork / inputWork) * 100;
}

/** Actual mechanical advantage from the two forces. Null if the effort is not a positive force. */
export function forceMA(outputForce, appliedForce) {
  if (!(appliedForce > 0) || !Number.isFinite(outputForce)) return null;
  return outputForce / appliedForce;
}

function requirePositive(name, value) {
  if (!(value > 0) || !Number.isFinite(value)) {
    throw new Error(name + " must be a positive number");
  }
}

function requireNonNegative(name, value) {
  if (!(value >= 0) || !Number.isFinite(value)) {
    throw new Error(name + " must be zero or positive");
  }
}

/**
 * Positions in meters along the bar, left end at 0.
 * Class 1: effort at the left end, load at the right end, fulcrum between.
 * Class 2: fulcrum at the left end, load between, effort at the right end.
 * Class 3: fulcrum at the left end, effort between, load at the right end.
 * Arms are distances from the fulcrum. The MA formula does not depend on class.
 */
export function leverGeometry(input) {
  const leverClass = input.leverClass;
  const bar = input.barLength;
  requirePositive("bar length", bar);
  const lo = bar * 0.05;
  const hi = bar * 0.95;
  if (leverClass === 1) {
    const fulcrum = clamp(input.fulcrum, lo, hi);
    return {
      leverClass: 1,
      barLength: bar,
      fulcrum,
      effort: 0,
      load: bar,
      effortArm: fulcrum,
      loadArm: bar - fulcrum
    };
  }
  if (leverClass === 2) {
    const load = clamp(input.loadAt != null ? input.loadAt : input.load, lo, hi);
    return {
      leverClass: 2,
      barLength: bar,
      fulcrum: 0,
      effort: bar,
      load,
      effortArm: bar,
      loadArm: load
    };
  }
  if (leverClass === 3) {
    const effort = clamp(input.effortAt != null ? input.effortAt : input.effort, lo, hi);
    return {
      leverClass: 3,
      barLength: bar,
      fulcrum: 0,
      effort,
      load: bar,
      effortArm: effort,
      loadArm: bar
    };
  }
  throw new Error("lever class must be 1, 2, or 3");
}

function positionsFromArms(input) {
  const leverClass = input.leverClass || 1;
  const effortArm = input.effortArm;
  const loadArm = input.loadArm;
  requirePositive("effort arm", effortArm);
  requirePositive("load arm", loadArm);
  if (leverClass === 1) {
    return {
      leverClass: 1,
      barLength: effortArm + loadArm,
      fulcrum: effortArm,
      effort: 0,
      load: effortArm + loadArm,
      effortArm,
      loadArm
    };
  }
  if (leverClass === 2 || leverClass === 3) {
    return {
      leverClass,
      barLength: Math.max(effortArm, loadArm),
      fulcrum: 0,
      effort: effortArm,
      load: loadArm,
      effortArm,
      loadArm
    };
  }
  throw new Error("lever class must be 1, 2, or 3");
}

/**
 * Lever. effortAngle is radians from the perpendicular to the bar.
 * 0 means the push is perpendicular, so the moment arm is the full arm.
 *
 *   τ_effort = F_in * d_in * cos θ
 *   τ_load   = F_out * d_out
 *   τ_net    = τ_effort − τ_load − τ_friction
 *
 * Balance is τ_net = 0. With a perpendicular push and no friction,
 * ideal MA = d_in / d_out for every class.
 *
 * A rotation that moves the load by outputDisplacement (or by loadArm * deltaPhi)
 * moves the effort by that angle times its moment arm. Both forces stay
 * parallel to those displacements, so W = F d.
 */
export function analyzeLever(input) {
  const geo = input.barLength != null ? leverGeometry(input) : positionsFromArms(input);
  const g = input.g == null ? G : input.g;
  requirePositive("g", g);
  const loadForce = input.loadMass != null ? input.loadMass * g : input.loadForce;
  requirePositive("load", loadForce);
  const effortAngle = input.effortAngle || 0;
  if (!Number.isFinite(effortAngle)) throw new Error("effort angle must be finite");
  const cosA = Math.cos(effortAngle);
  if (!(cosA > 1e-4)) throw new Error("effort angle must keep a positive moment arm");
  const frictionTorque = input.frictionTorque || 0;
  requireNonNegative("friction torque", frictionTorque);

  const effortArm = geo.effortArm;
  const loadArm = geo.loadArm;
  const effortMomentArm = effortArm * cosA;
  const loadMomentArm = loadArm;

  let phi;
  let strokeOut;
  if (input.outputDisplacement != null) {
    strokeOut = input.outputDisplacement;
    requirePositive("output displacement", strokeOut);
    phi = strokeOut / loadArm;
  } else {
    phi = input.deltaPhi == null ? 0.2 : input.deltaPhi;
    requirePositive("delta phi", phi);
    strokeOut = loadArm * phi;
  }
  const strokeIn = effortMomentArm * phi;

  const idealApplied = (loadForce * loadMomentArm) / effortMomentArm;
  const required = (loadForce * loadMomentArm + frictionTorque) / effortMomentArm;
  const applied = input.appliedForce == null ? required : input.appliedForce;
  requireNonNegative("applied force", applied);

  const tauEffort = applied * effortMomentArm;
  const tauLoad = loadForce * loadMomentArm;
  const tauFriction = frictionTorque;
  const tauNet = tauEffort - tauLoad - tauFriction;
  const lifts = applied + 1e-8 >= required;

  const idealMA = effortMomentArm / loadMomentArm;
  const packed = packMachine({
    machine: "lever",
    appliedForce: applied,
    outputForce: loadForce,
    strokeIn,
    strokeOut,
    idealAppliedForce: idealApplied,
    idealMA,
    lifts
  });

  return {
    ...geo,
    ...packed,
    dIn: effortArm,
    dOut: loadArm,
    effortAngle,
    effortMomentArm,
    loadMomentArm,
    loadForce,
    loadMass: input.loadMass == null ? loadForce / g : input.loadMass,
    frictionTorque,
    requiredForce: required,
    tauEffort,
    tauLoad,
    tauFriction,
    tauNet,
    balanced: Math.abs(tauNet) <= 1e-8 * Math.max(1, tauLoad),
    phi
  };
}

/** How many pulleys ride with the load. A single fixed pulley has none. */
export function movablePulleyCount(segments) {
  const n = Math.round(segments);
  if (n <= 1) return 0;
  return Math.floor(n / 2);
}

/**
 * Tensions in the n supporting segments. Segment 0 is farthest from the hand.
 * Segment n-1 is the free end, so the pull equals tensions[n-1].
 *
 * r = 1: every segment carries W / n.
 * r > 1: tension grows by r toward the hand (pulley friction).
 *   T_i = T_0 * r^i
 *   sum T_i = W
 */
export function pulleyTensions(segments, supportedWeight, frictionRatio) {
  const n = Math.round(segments);
  requirePositive("supporting segments", n);
  requirePositive("supported weight", supportedWeight);
  const r = frictionRatio == null ? 1 : frictionRatio;
  if (!(r >= 1) || !Number.isFinite(r)) throw new Error("friction ratio must be >= 1");
  const tensions = new Array(n);
  if (Math.abs(r - 1) < 1e-12) {
    const t = supportedWeight / n;
    for (let i = 0; i < n; i++) tensions[i] = t;
    return tensions;
  }
  const t0 = supportedWeight * (r - 1) / (Math.pow(r, n) - 1);
  for (let i = 0; i < n; i++) tensions[i] = t0 * Math.pow(r, i);
  return tensions;
}

/**
 * Pulley system. ideal MA equals the number of supporting rope segments.
 * Pull distance = (supporting segments) × lift height, friction or not.
 * Useful output is the load weight times the lift. Pulley weight and rope
 * weight are extra load, not useful output. Pulley friction raises the
 * tension in the free end above the ideal T = W / n.
 */
export function analyzePulley(input) {
  const segments = Math.round(input.segments);
  if (segments < 1 || segments > 12) throw new Error("supporting segments must be from 1 to 12");
  const g = input.g == null ? G : input.g;
  requirePositive("g", g);
  const loadMass = input.loadMass;
  requirePositive("load mass", loadMass);
  const liftHeight = input.liftHeight;
  requirePositive("lift height", liftHeight);

  const frictionOn = !!input.pulleyFriction;
  const ratio = frictionOn ? (input.frictionRatio == null ? 1 : input.frictionRatio) : 1;
  if (!(ratio >= 1) || !Number.isFinite(ratio)) throw new Error("friction ratio must be >= 1");

  const movables = movablePulleyCount(segments);
  const span = input.span == null ? liftHeight : input.span;
  requireNonNegative("rope span", span);
  const pulleyMass = input.includePulleyMass ? (input.pulleyMass || 0) : 0;
  const linearDensity = input.includeRopeMass ? (input.linearDensity || 0) : 0;
  requireNonNegative("pulley mass", pulleyMass);
  requireNonNegative("linear density", linearDensity);

  const extraMass = movables * pulleyMass + linearDensity * span * segments * 0.5;
  const supportedWeight = (loadMass + extraMass) * g;
  const useful = loadMass * g;
  const tensions = pulleyTensions(segments, supportedWeight, ratio);
  const applied = tensions[segments - 1];
  const idealApplied = useful / segments;
  const strokeIn = segments * liftHeight;
  const strokeOut = liftHeight;

  const idealTensions = pulleyTensions(segments, useful, 1);
  const packed = packMachine({
    machine: "pulley",
    appliedForce: applied,
    outputForce: useful,
    strokeIn,
    strokeOut,
    idealAppliedForce: idealApplied,
    idealMA: segments,
    lifts: true
  });

  return {
    ...packed,
    segments,
    supportingSegments: segments,
    movablePulleys: movables,
    tensions,
    idealTensions,
    frictionRatio: ratio,
    pulleyFriction: frictionOn && ratio > 1,
    extraMass,
    supportedWeight,
    loadMass,
    liftHeight,
    pullDistance: strokeIn
  };
}

/**
 * Inclined plane.
 *   height h = L sin θ
 *   ideal MA = L / h = 1 / sin θ
 *   F_parallel = mg sin θ
 *   F_perpendicular = mg cos θ
 *   F_friction = μ mg cos θ   (kinetic, opposing the slide up the ramp)
 *   F_real = mg sin θ + μ mg cos θ
 *
 * Output force is the weight mg — the force of lifting the same load
 * straight up through height h. Output displacement is h. Input
 * displacement is the ramp length L.
 *
 * Pass height (and angle) to fit the ramp to a workbench lift. Otherwise
 * height is L sin θ.
 */
export function analyzePlane(input) {
  const g = input.g == null ? G : input.g;
  requirePositive("g", g);
  const mass = input.mass;
  requirePositive("mass", mass);
  const angle = input.angle;
  if (!(angle > 0) || !(angle < Math.PI / 2) || !Number.isFinite(angle)) {
    throw new Error("ramp angle must be between 0 and 90 degrees");
  }
  const mu = input.mu || 0;
  requireNonNegative("friction coefficient", mu);

  let length;
  let height;
  if (input.height != null) {
    height = input.height;
    requirePositive("height", height);
    length = height / Math.sin(angle);
  } else {
    length = input.length;
    requirePositive("ramp length", length);
    height = length * Math.sin(angle);
  }

  const weight = mass * g;
  const parallel = weight * Math.sin(angle);
  const perpendicular = weight * Math.cos(angle);
  const friction = mu * perpendicular;
  const idealApplied = parallel;
  const required = parallel + friction;
  const applied = input.appliedForce == null ? required : input.appliedForce;
  requireNonNegative("applied force", applied);
  const lifts = applied + 1e-8 >= required;

  const idealMA = length / height;
  const packed = packMachine({
    machine: "plane",
    appliedForce: applied,
    outputForce: weight,
    strokeIn: length,
    strokeOut: height,
    idealAppliedForce: idealApplied,
    idealMA,
    lifts
  });

  return {
    ...packed,
    length,
    height,
    angle,
    mu,
    mass,
    weight,
    parallel,
    perpendicular,
    normal: perpendicular,
    friction,
    requiredForce: required,
    verticalLift: {
      force: weight,
      distance: height,
      work: weight * height
    }
  };
}

/**
 * Side-by-side comparison: every machine raises the same mass through the
 * same height. Geometry and losses come from each machine's own settings.
 */
export function analyzeWorkbench(input) {
  const g = input.g == null ? G : input.g;
  requirePositive("g", g);
  requirePositive("mass", input.mass);
  requirePositive("height", input.height);
  const leverIn = input.lever || {};
  const pulleyIn = input.pulley || {};
  const planeIn = input.plane || {};
  const lever = analyzeLever({
    leverClass: leverIn.leverClass || 1,
    effortArm: leverIn.effortArm == null ? 1.6 : leverIn.effortArm,
    loadArm: leverIn.loadArm == null ? 0.8 : leverIn.loadArm,
    effortAngle: leverIn.effortAngle || 0,
    frictionTorque: leverIn.frictionTorque || 0,
    loadMass: input.mass,
    g,
    outputDisplacement: input.height
  });
  const pulley = analyzePulley({
    segments: pulleyIn.segments == null ? 4 : pulleyIn.segments,
    loadMass: input.mass,
    liftHeight: input.height,
    g,
    pulleyFriction: !!pulleyIn.pulleyFriction,
    frictionRatio: pulleyIn.frictionRatio,
    includePulleyMass: !!pulleyIn.includePulleyMass,
    includeRopeMass: !!pulleyIn.includeRopeMass,
    pulleyMass: pulleyIn.pulleyMass,
    linearDensity: pulleyIn.linearDensity,
    span: pulleyIn.span
  });
  const plane = analyzePlane({
    mass: input.mass,
    height: input.height,
    angle: planeIn.angle == null ? Math.PI / 6 : planeIn.angle,
    mu: planeIn.mu || 0,
    g
  });
  const outputForce = input.mass * g;
  const outputWork = outputForce * input.height;
  return {
    machine: "workbench",
    mass: input.mass,
    height: input.height,
    outputForce,
    outputDisplacement: input.height,
    outputWork,
    inputWork: null,
    appliedForce: null,
    idealMA: null,
    actualMA: null,
    efficiency: null,
    lever,
    pulley,
    plane
  };
}

export function analyzeMachine(id, input) {
  if (id === "lever") return analyzeLever(input);
  if (id === "pulley") return analyzePulley(input);
  if (id === "plane") return analyzePlane(input);
  if (id === "workbench") return analyzeWorkbench(input);
  const custom = analyzers.get(id);
  if (custom) return custom(input);
  return null;
}

function packMachine({
  machine,
  appliedForce,
  outputForce,
  strokeIn,
  strokeOut,
  idealAppliedForce,
  idealMA,
  lifts
}) {
  const inputDisplacement = lifts ? strokeIn : 0;
  const outputDisplacement = lifts ? strokeOut : 0;
  const inputWork = work(appliedForce, inputDisplacement);
  const outputWork = work(outputForce, outputDisplacement);
  const idealInputWork = work(idealAppliedForce, strokeIn);
  const idealOutputWork = work(outputForce, strokeOut);
  return {
    machine,
    appliedForce,
    outputForce,
    inputDisplacement,
    outputDisplacement,
    inputWork,
    outputWork,
    idealMA,
    actualMA: forceMA(outputForce, appliedForce),
    efficiency: efficiencyPercent(outputWork, inputWork),
    lifts,
    lostWork: lifts ? Math.max(0, inputWork - outputWork) : 0,
    ideal: {
      appliedForce: idealAppliedForce,
      outputForce,
      inputDisplacement: strokeIn,
      outputDisplacement: strokeOut,
      inputWork: idealInputWork,
      outputWork: idealOutputWork,
      idealMA,
      actualMA: forceMA(outputForce, idealAppliedForce),
      efficiency: efficiencyPercent(idealOutputWork, idealInputWork),
      lostWork: Math.max(0, idealInputWork - idealOutputWork)
    }
  };
}

const UNITS = {
  appliedForce: "N",
  outputForce: "N",
  inputDisplacement: "m",
  outputDisplacement: "m",
  inputWork: "J",
  outputWork: "J",
  idealMA: "ratio",
  actualMA: "ratio",
  efficiency: "%",
  tauNet: "N*m",
  angle: "rad",
  mass: "kg",
  height: "m"
};

/** Flat SI snapshot for window.machines.state. */
export function snapshot(result, mode) {
  if (!result) {
    return { machine: mode, mode, units: UNITS };
  }
  if (result.machine === "workbench") {
    return {
      machine: "workbench",
      mode,
      mass: result.mass,
      height: result.height,
      outputForce: result.outputForce,
      outputDisplacement: result.outputDisplacement,
      outputWork: result.outputWork,
      lever: snapshot(result.lever, mode),
      pulley: snapshot(result.pulley, mode),
      plane: snapshot(result.plane, mode),
      units: UNITS
    };
  }
  const state = {
    machine: result.machine,
    mode,
    appliedForce: result.appliedForce,
    outputForce: result.outputForce,
    inputDisplacement: result.inputDisplacement,
    outputDisplacement: result.outputDisplacement,
    inputWork: result.inputWork,
    outputWork: result.outputWork,
    idealMA: result.idealMA,
    actualMA: result.actualMA,
    efficiency: result.efficiency,
    idealAppliedForce: result.ideal ? result.ideal.appliedForce : null,
    idealInputWork: result.ideal ? result.ideal.inputWork : null,
    idealOutputWork: result.ideal ? result.ideal.outputWork : null,
    idealEfficiency: result.ideal ? result.ideal.efficiency : null,
    units: UNITS
  };
  if (result.tauNet != null) state.tauNet = result.tauNet;
  if (result.supportingSegments != null) state.supportingSegments = result.supportingSegments;
  if (result.angle != null) state.angle = result.angle;
  if (result.balanced != null) state.balanced = result.balanced;
  if (result.lifts != null) state.lifts = result.lifts;
  return state;
}
