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
 * Wheel, wedge, screw, and compound builds register through
 * registerMachine(). A wedge is an inclined plane driven under the load.
 * A screw unrolls into that same plane: one turn of the handle is the
 * run 2πR and one pitch is the rise. Ideal MA multiplies across stages.
 * Ideal efficiency multiplies across stages too, as a fraction, so the
 * percent stays at or below 100 whenever any stage has friction.
 */
"use strict";

export const G = 9.80665;

export const MODES = [
  { id: "workbench", label: "Workbench", phase: 1 },
  { id: "lever", label: "Lever", phase: 1 },
  { id: "pulley", label: "Pulley", phase: 1 },
  { id: "plane", label: "Inclined Plane", phase: 1 },
  { id: "wheel-axle", label: "Wheel & Axle", phase: 1 },
  { id: "wedge", label: "Wedge", phase: 1 },
  { id: "screw", label: "Screw", phase: 1 },
  { id: "build", label: "Build", phase: 1 },
  { id: "identify", label: "Identify", phase: 1 },
  { id: "guided", label: "Guided", phase: 1 }
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

/** One-line hooks for the labs. Analyzers are registered at the bottom of this file. */
export const LATER_PHASES = {
  "wheel-axle": {
    phase: 1,
    title: "Wheel & Axle",
    hook: "Ideal MA = R / r. The rim and the axle turn through the same angle, so the distances are Rθ and rθ."
  },
  wedge: {
    phase: 1,
    title: "Wedge",
    hook: "A wedge is an inclined plane pushed into the load. Ideal MA = L / t."
  },
  screw: {
    phase: 1,
    title: "Screw",
    hook: "Unroll one turn: the handle travels 2πR and the load rises one pitch. Ideal MA = 2πR / p."
  },
  build: {
    phase: 1,
    title: "Free-build",
    hook: "Overall ideal MA is the product of the stage MAs. Overall efficiency is the product of the stage efficiencies."
  },
  identify: {
    phase: 1,
    title: "Identify",
    hook: "Name the machine, and the lever class when there is a fulcrum."
  },
  guided: {
    phase: 1,
    title: "Guided labs",
    hook: "Predict, measure, read the work graph, then justify. The prediction stays beside the measurement."
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

/**
 * Presets only change the two radii (and a suggested load). The drawing
 * swaps a faint silhouette behind that same geometry.
 */
export const WHEEL_PRESETS = {
  steering: {
    name: "Steering wheel",
    blurb: "Big rim, thin column",
    wheelRadius: 0.18,
    axleRadius: 0.015,
    loadMass: 4
  },
  doorknob: {
    name: "Doorknob",
    blurb: "Knob and spindle",
    wheelRadius: 0.03,
    axleRadius: 0.006,
    loadMass: 0.4
  },
  winch: {
    name: "Winch",
    blurb: "Crank and drum",
    wheelRadius: 0.2,
    axleRadius: 0.05,
    loadMass: 12
  }
};

/**
 * Free-build goals. Starters are deliberately short of the goal when friction
 * is off, so the product of the stage MAs is the thing to change.
 * Stage order is effort → load. Plane angles in starters are radians.
 */
export const BUILD_CHALLENGES = [
  {
    id: "lift-200",
    title: "Lift 200 kg using under 150 N",
    detail: "The load rises 0.25 m. A lever pulling a pulley is one way there.",
    loadMass: 200,
    outputDisplacement: 0.25,
    maxForce: 150,
    minEfficiency: 0,
    starter: [
      { machine: "lever", leverClass: 1, effortArm: 1, loadArm: 0.5, effortAngle: 0, frictionTorque: 0 },
      { machine: "pulley", segments: 4, pulleyFriction: false, frictionRatio: 1 }
    ]
  },
  {
    id: "ramp-winch",
    title: "Haul 80 kg up 0.5 m using under 40 N",
    detail: "Put the winch on the left and the ramp on the right. The ramp's along-slope distance is what the axle has to reel in.",
    loadMass: 80,
    outputDisplacement: 0.5,
    maxForce: 40,
    minEfficiency: 0,
    starter: [
      { machine: "wheel-axle", wheelRadius: 0.2, axleRadius: 0.05, reversed: false, frictionTorque: 0 },
      { machine: "plane", angle: 30 * Math.PI / 180, mu: 0 }
    ]
  },
  {
    id: "screw-jack",
    title: "Jack 500 kg using under 100 N",
    detail: "The load rises 4 cm. A longer handle or a finer pitch multiplies the screw's MA.",
    loadMass: 500,
    outputDisplacement: 0.04,
    maxForce: 100,
    minEfficiency: 0,
    starter: [
      { machine: "screw", handleRadius: 0.08, pitch: 0.02, mu: 0 }
    ]
  },
  {
    id: "keep-efficient",
    title: "Lift 30 kg using under 80 N and stay above 70%",
    detail: "Ideal MA multiplies, and so do the losses. Friction on a pulley can spend the efficiency budget.",
    loadMass: 30,
    outputDisplacement: 0.4,
    maxForce: 80,
    minEfficiency: 70,
    starter: [
      { machine: "pulley", segments: 4, pulleyFriction: true, frictionRatio: 1.35 }
    ]
  }
];

export const MACHINE_TYPES = [
  { id: "lever", label: "Lever" },
  { id: "pulley", label: "Pulley" },
  { id: "plane", label: "Inclined plane" },
  { id: "wheel-axle", label: "Wheel & axle" },
  { id: "wedge", label: "Wedge" },
  { id: "screw", label: "Screw" }
];

/**
 * Everyday objects for the identification lab. `types` is the full answer.
 * `tint` is the part that lights in that machine's color.
 */
export const IDENTIFY_ITEMS = [
  {
    id: "scissors",
    name: "Scissors",
    types: ["lever", "wedge"],
    leverClass: 1,
    badge: "Class 1 lever and wedge",
    tint: "lever",
    explanation: "The handles and blades are two class-1 levers sharing a fulcrum at the pivot. The blades are also wedges that split what you cut. Ideal lever MA = d_in / d_out. Longer handles and shorter blades make that ratio larger."
  },
  {
    id: "doorknob",
    name: "Doorknob",
    types: ["wheel-axle"],
    leverClass: null,
    badge: "Wheel and axle",
    tint: "wheel",
    explanation: "Your hand turns the knob (the wheel) and the spindle is the axle that pulls the latch. Ideal MA = R / r. A larger knob or a thinner spindle increases it."
  },
  {
    id: "ramp",
    name: "Ramp",
    types: ["plane"],
    leverClass: null,
    badge: "Inclined plane",
    tint: "incline",
    explanation: "A ramp is an inclined plane. You push along the slope instead of lifting straight up. Ideal MA = L / h = 1 / sinθ. A gentler ramp is a larger MA and a longer push."
  },
  {
    id: "jar-lid",
    name: "Jar lid",
    types: ["screw"],
    leverClass: null,
    badge: "Screw",
    tint: "screw",
    explanation: "The thread is an inclined plane wrapped around a cylinder. One turn of the lid moves your hand 2πR and advances the lid by one pitch. Ideal MA = 2πR / p."
  },
  {
    id: "axe",
    name: "Axe",
    types: ["wedge"],
    leverClass: null,
    badge: "Wedge",
    tint: "wedge",
    explanation: "The head is a wedge, a moving inclined plane. Ideal MA = L / t. A long, thin bit needs less force to open the wood than a short, thick one, and the wood has to split farther apart."
  },
  {
    id: "flagpole",
    name: "Flagpole",
    types: ["pulley"],
    leverClass: null,
    badge: "Pulley",
    tint: "pulley",
    explanation: "The rope runs over a fixed pulley at the top. It changes the direction of the effort so you can pull down. A single fixed pulley has one supporting segment, so ideal MA = 1."
  },
  {
    id: "bottle-opener",
    name: "Bottle opener",
    types: ["lever"],
    leverClass: 2,
    badge: "Class 2 lever",
    tint: "lever",
    explanation: "The lip on the cap is the fulcrum, the cap edge being pried is the load, and your hand is the effort at the end of the handle. The load sits between the fulcrum and the effort, which makes it class 2. Ideal MA = d_in / d_out."
  },
  {
    id: "tweezers",
    name: "Tweezers",
    types: ["lever"],
    leverClass: 3,
    badge: "Class 3 lever",
    tint: "lever",
    explanation: "The joined end is the fulcrum, your fingers are the effort in the middle, and the tips are the load. That is class 3, so ideal MA = d_in / d_out is less than 1. You give up force to move the tips with control."
  },
  {
    id: "screwdriver",
    name: "Screwdriver",
    types: ["wheel-axle"],
    leverClass: null,
    badge: "Wheel and axle",
    tint: "wheel",
    explanation: "The handle is the wheel and the shaft is the axle. Ideal MA = R / r. A thicker handle multiplies the torque on the shaft. The screw you drive is a separate machine."
  },
  {
    id: "wheelbarrow",
    name: "Wheelbarrow",
    types: ["lever"],
    leverClass: 2,
    badge: "Class 2 lever",
    tint: "lever",
    explanation: "The wheel is the fulcrum, the load sits in the tray between the wheel and your hands, and the handles are the effort. Class 2. Ideal MA = d_in / d_out, and it is greater than 1 because your hands are farther from the wheel than the load is."
  },
  {
    id: "knife",
    name: "Knife",
    types: ["wedge"],
    leverClass: null,
    badge: "Wedge",
    tint: "wedge",
    explanation: "The blade is a wedge. Ideal MA = L / t. Pressing the edge a short distance sideways is what separates the cut, and a thinner edge is a larger MA."
  },
  {
    id: "stairs",
    name: "Stairs",
    types: ["plane"],
    leverClass: null,
    badge: "Inclined plane",
    tint: "incline",
    explanation: "Stairs are an inclined plane broken into steps. Ideal MA = L / h. A longer flight spreads the same rise over more distance, so each step needs less force."
  },
  {
    id: "seesaw",
    name: "Seesaw",
    types: ["lever"],
    leverClass: 1,
    badge: "Class 1 lever",
    tint: "lever",
    explanation: "The fulcrum is between the two riders, so it is class 1. Ideal MA = d_in / d_out. Moving the fulcrum closer to the heavier rider lengthens the lighter rider's arm."
  },
  {
    id: "crowbar",
    name: "Crowbar",
    types: ["lever"],
    leverClass: 1,
    badge: "Class 1 lever",
    tint: "lever",
    explanation: "The bend rests on the fulcrum, the short end takes the load, and the long handle is the effort. The fulcrum is between them: class 1. Ideal MA = d_in / d_out is large because the handle is the long arm."
  },
  {
    id: "nutcracker",
    name: "Nutcracker",
    types: ["lever"],
    leverClass: 2,
    badge: "Class 2 lever",
    tint: "lever",
    explanation: "The hinge is the fulcrum, the nut is the load between the hinge and your hand, and the handles are the effort. Class 2. Ideal MA = d_in / d_out is greater than 1."
  }
];

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
  const wheelIn = input.wheel || {};
  const wedgeIn = input.wedge || {};
  const screwIn = input.screw || {};
  const wheel = analyzeWheelAxle({
    wheelRadius: wheelIn.wheelRadius == null ? 0.2 : wheelIn.wheelRadius,
    axleRadius: wheelIn.axleRadius == null ? 0.05 : wheelIn.axleRadius,
    reversed: !!wheelIn.reversed,
    frictionTorque: wheelIn.frictionTorque || 0,
    loadMass: input.mass,
    outputDisplacement: input.height,
    g
  });
  const wedge = analyzeWedge({
    length: wedgeIn.length == null ? 0.24 : wedgeIn.length,
    thickness: wedgeIn.thickness == null ? 0.06 : wedgeIn.thickness,
    mu: wedgeIn.mu || 0,
    deformation: wedgeIn.deformation || 0,
    loadForce: input.mass * g,
    outputDisplacement: input.height,
    g
  });
  const screw = analyzeScrew({
    handleRadius: screwIn.handleRadius == null ? 0.12 : screwIn.handleRadius,
    pitch: screwIn.pitch == null ? 0.008 : screwIn.pitch,
    mu: screwIn.mu || 0,
    loadMass: input.mass,
    outputDisplacement: input.height,
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
    plane,
    wheel,
    wedge,
    screw
  };
}

/**
 * Wheel and axle. Both circles turn through the same angle θ.
 * Effort on the rim, load on the axle:
 *   ideal MA = R / r
 *   s_in = R θ,  s_out = r θ
 *   τ_net = F_in R − F_out r − τ_bearing
 * Reversed puts the effort on the axle and the load on the rim, so
 * ideal MA = r / R. Bearing friction is an optional opposing torque.
 * The distance ratio s_in / s_out equals the ideal MA.
 */
export function analyzeWheelAxle(input) {
  const wheelRadius = input.wheelRadius != null ? input.wheelRadius : input.R;
  const axleRadius = input.axleRadius != null ? input.axleRadius : input.r;
  requirePositive("wheel radius", wheelRadius);
  requirePositive("axle radius", axleRadius);
  const reversed = !!input.reversed;
  const effortRadius = reversed ? axleRadius : wheelRadius;
  const loadRadius = reversed ? wheelRadius : axleRadius;
  const g = input.g == null ? G : input.g;
  requirePositive("g", g);
  const loadForce = input.loadForce != null ? input.loadForce : input.loadMass * g;
  requirePositive("load", loadForce);
  const frictionTorque = input.frictionTorque || 0;
  requireNonNegative("friction torque", frictionTorque);

  let phi;
  let strokeOut;
  if (input.outputDisplacement != null) {
    strokeOut = input.outputDisplacement;
    requirePositive("output displacement", strokeOut);
    phi = strokeOut / loadRadius;
  } else {
    const turns = input.revolutions == null ? 1 : input.revolutions;
    requirePositive("revolutions", turns);
    phi = turns * 2 * Math.PI;
    strokeOut = loadRadius * phi;
  }
  const strokeIn = effortRadius * phi;
  const idealMA = effortRadius / loadRadius;
  const idealApplied = (loadForce * loadRadius) / effortRadius;
  const required = (loadForce * loadRadius + frictionTorque) / effortRadius;
  const applied = input.appliedForce == null ? required : input.appliedForce;
  requireNonNegative("applied force", applied);
  const tauEffort = applied * effortRadius;
  const tauLoad = loadForce * loadRadius;
  const tauNet = tauEffort - tauLoad - frictionTorque;
  const lifts = applied + 1e-9 >= required;
  const packed = packMachine({
    machine: "wheel-axle",
    appliedForce: applied,
    outputForce: loadForce,
    strokeIn,
    strokeOut,
    idealAppliedForce: idealApplied,
    idealMA,
    lifts
  });
  return {
    ...packed,
    wheelRadius,
    axleRadius,
    reversed,
    effortRadius,
    loadRadius,
    phi,
    revolutions: phi / (2 * Math.PI),
    distanceRatio: strokeIn / strokeOut,
    frictionTorque,
    requiredForce: required,
    tauEffort,
    tauLoad,
    tauFriction: frictionTorque,
    tauNet,
    balanced: Math.abs(tauNet) <= 1e-8 * Math.max(1, tauLoad),
    loadForce,
    loadMass: input.loadMass == null ? loadForce / g : input.loadMass
  };
}

/**
 * Wedge. Textbook ideal MA = L / t.
 *
 * Simplification: the reported MA is that ratio, modeled as one inclined
 * plane with sinθ = t / L (so θ = asin(t/L) and t must be less than L).
 * A two-face statics diagram would report 2L/t. The picture still draws
 * both faces. Driving the wedge a distance d separates the block by
 * d · t / L. Friction matches the plane: μ · F · cosθ. Deformation is an
 * extra resistive force k · F that does not add to the separation, so it
 * only shows up as lost work.
 */
export function analyzeWedge(input) {
  const length = input.length;
  const thickness = input.thickness;
  requirePositive("length", length);
  requirePositive("thickness", thickness);
  if (!(thickness < length)) throw new Error("thickness must be less than length");
  const mu = input.mu || 0;
  const deformation = input.deformation || 0;
  requireNonNegative("friction coefficient", mu);
  requireNonNegative("deformation", deformation);
  const g = input.g == null ? G : input.g;
  requirePositive("g", g);
  const loadForce = input.loadForce != null ? input.loadForce : input.loadMass * g;
  requirePositive("load", loadForce);

  const idealMA = length / thickness;
  const sinT = thickness / length;
  const cosT = Math.sqrt(Math.max(0, 1 - sinT * sinT));
  const angle = Math.asin(sinT);
  let strokeIn;
  let strokeOut;
  if (input.outputDisplacement != null) {
    strokeOut = input.outputDisplacement;
    requirePositive("output displacement", strokeOut);
    strokeIn = strokeOut * idealMA;
  } else {
    const penetration = input.penetration == null ? length : input.penetration;
    requirePositive("penetration", penetration);
    strokeIn = penetration;
    strokeOut = penetration / idealMA;
  }
  const idealApplied = loadForce / idealMA;
  const friction = mu * loadForce * cosT;
  const deformationForce = deformation * loadForce;
  const required = idealApplied + friction + deformationForce;
  const applied = input.appliedForce == null ? required : input.appliedForce;
  requireNonNegative("applied force", applied);
  const lifts = applied + 1e-9 >= required;
  const packed = packMachine({
    machine: "wedge",
    appliedForce: applied,
    outputForce: loadForce,
    strokeIn,
    strokeOut,
    idealAppliedForce: idealApplied,
    idealMA,
    lifts
  });
  const faceAngle = Math.atan2(thickness / 2, length);
  return {
    ...packed,
    length,
    thickness,
    angle,
    faceAngle,
    mu,
    deformation,
    friction,
    deformationForce,
    splitForce: loadForce / 2,
    penetration: strokeIn,
    separation: strokeOut,
    requiredForce: required,
    loadForce
  };
}

/**
 * Screw. One revolution moves the hand along an arc 2πR and lifts the
 * load by one pitch p. Ideal MA = 2πR / p.
 *
 * The unrolled thread is the inclined plane whose run is 2πR and whose
 * rise is p, so sinθ = p / (2πR). Friction uses that same plane:
 * F = F_load (sinθ + μ cosθ). Pitch must be shorter than the handle
 * circumference so the equivalent angle stays defined.
 */
export function analyzeScrew(input) {
  const pitch = input.pitch;
  const handleRadius = input.handleRadius != null ? input.handleRadius : input.R;
  requirePositive("pitch", pitch);
  requirePositive("handle radius", handleRadius);
  const circumference = 2 * Math.PI * handleRadius;
  if (!(pitch < circumference)) throw new Error("pitch must be shorter than the handle circumference");
  const mu = input.mu || 0;
  requireNonNegative("friction coefficient", mu);
  const g = input.g == null ? G : input.g;
  requirePositive("g", g);
  const loadForce = input.loadForce != null ? input.loadForce : input.loadMass * g;
  requirePositive("load", loadForce);

  const idealMA = circumference / pitch;
  const sinT = pitch / circumference;
  const cosT = Math.sqrt(Math.max(0, 1 - sinT * sinT));
  const angle = Math.asin(sinT);
  let revolutions;
  let strokeOut;
  if (input.outputDisplacement != null) {
    strokeOut = input.outputDisplacement;
    requirePositive("output displacement", strokeOut);
    revolutions = strokeOut / pitch;
  } else {
    revolutions = input.revolutions == null ? 1 : input.revolutions;
    requirePositive("revolutions", revolutions);
    strokeOut = revolutions * pitch;
  }
  const strokeIn = revolutions * circumference;
  const idealApplied = loadForce / idealMA;
  const friction = mu * loadForce * cosT;
  const required = idealApplied + friction;
  const applied = input.appliedForce == null ? required : input.appliedForce;
  requireNonNegative("applied force", applied);
  const lifts = applied + 1e-9 >= required;
  const packed = packMachine({
    machine: "screw",
    appliedForce: applied,
    outputForce: loadForce,
    strokeIn,
    strokeOut,
    idealAppliedForce: idealApplied,
    idealMA,
    lifts
  });
  return {
    ...packed,
    pitch,
    handleRadius,
    circumference,
    revolutions,
    angle,
    mu,
    friction,
    requiredForce: required,
    loadForce,
    loadMass: input.loadMass == null ? loadForce / g : input.loadMass
  };
}

function runStage(spec, outputForce, outputDisplacement, g) {
  const type = spec.machine || spec.type || spec.id;
  if (type === "lever") {
    const leverInput = {
      leverClass: spec.leverClass || 1,
      effortAngle: spec.effortAngle || 0,
      frictionTorque: spec.frictionTorque || 0,
      loadForce: outputForce,
      g,
      outputDisplacement
    };
    if (spec.barLength != null) {
      leverInput.barLength = spec.barLength;
      if (spec.fulcrum != null) leverInput.fulcrum = spec.fulcrum;
      if (spec.loadAt != null) leverInput.loadAt = spec.loadAt;
      if (spec.effortAt != null) leverInput.effortAt = spec.effortAt;
    } else {
      leverInput.effortArm = spec.effortArm;
      leverInput.loadArm = spec.loadArm;
    }
    return analyzeLever(leverInput);
  }
  if (type === "pulley") {
    return analyzePulley({
      segments: spec.segments,
      loadMass: outputForce / g,
      liftHeight: outputDisplacement,
      g,
      pulleyFriction: !!spec.pulleyFriction,
      frictionRatio: spec.frictionRatio,
      includePulleyMass: !!spec.includePulleyMass,
      includeRopeMass: !!spec.includeRopeMass,
      pulleyMass: spec.pulleyMass,
      linearDensity: spec.linearDensity,
      span: spec.span
    });
  }
  if (type === "plane") {
    return analyzePlane({
      mass: outputForce / g,
      height: outputDisplacement,
      angle: spec.angle,
      mu: spec.mu || 0,
      g
    });
  }
  if (type === "wheel-axle") {
    return analyzeWheelAxle({
      wheelRadius: spec.wheelRadius,
      axleRadius: spec.axleRadius,
      reversed: !!spec.reversed,
      frictionTorque: spec.frictionTorque || 0,
      loadForce: outputForce,
      outputDisplacement,
      g
    });
  }
  if (type === "wedge") {
    return analyzeWedge({
      length: spec.length,
      thickness: spec.thickness,
      mu: spec.mu || 0,
      deformation: spec.deformation || 0,
      loadForce: outputForce,
      outputDisplacement,
      g
    });
  }
  if (type === "screw") {
    return analyzeScrew({
      pitch: spec.pitch,
      handleRadius: spec.handleRadius,
      mu: spec.mu || 0,
      loadForce: outputForce,
      outputDisplacement,
      g
    });
  }
  throw new Error("unknown stage " + type);
}

/**
 * Compound machine. Stages run from the effort (index 0) to the load.
 * The output motion of one stage is the input motion of the next, and the
 * output force of one stage is the input force of the next.
 *
 * Overall ideal MA = product of the stage ideal MAs.
 * Overall efficiency percent = 100 × product of (stage efficiency / 100).
 */
export function analyzeBuild(input) {
  const stages = input.stages;
  if (!stages || stages.length < 1) throw new Error("a build needs at least one stage");
  const g = input.g == null ? G : input.g;
  requirePositive("g", g);
  let outputForce = input.loadForce != null ? input.loadForce : input.loadMass * g;
  requirePositive("load", outputForce);
  let outputDisplacement = input.outputDisplacement;
  requirePositive("output displacement", outputDisplacement);
  const solved = new Array(stages.length);
  for (let i = stages.length - 1; i >= 0; i--) {
    const result = runStage(stages[i], outputForce, outputDisplacement, g);
    solved[i] = result;
    outputForce = result.appliedForce;
    outputDisplacement = result.inputDisplacement;
  }
  const final = solved[solved.length - 1];
  const first = solved[0];
  const idealMA = solved.reduce((product, stage) => product * stage.idealMA, 1);
  const efficiency = 100 * solved.reduce((product, stage) => product * (stage.efficiency / 100), 1);
  const idealApplied = final.outputForce / idealMA;
  const lifts = solved.every((stage) => stage.lifts);
  const packed = packMachine({
    machine: "build",
    appliedForce: first.appliedForce,
    outputForce: final.outputForce,
    strokeIn: first.inputDisplacement,
    strokeOut: final.outputDisplacement,
    idealAppliedForce: idealApplied,
    idealMA,
    lifts
  });
  // The chained efficiencies are the source of truth. packMachine recomputes
  // efficiency from the end-to-end works, which matches the product when the
  // stages share force and distance at each joint. Keep the product explicit
  // so a caller can see both.
  return {
    ...packed,
    stages: solved,
    stageEfficiency: efficiency,
    loadMass: input.loadMass == null ? final.outputForce / g : input.loadMass,
    loadForce: final.outputForce
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

registerMachine("wheel-axle", analyzeWheelAxle);
registerMachine("wedge", analyzeWedge);
registerMachine("screw", analyzeScrew);
registerMachine("build", analyzeBuild);

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
      wheel: result.wheel ? snapshot(result.wheel, mode) : null,
      wedge: result.wedge ? snapshot(result.wedge, mode) : null,
      screw: result.screw ? snapshot(result.screw, mode) : null,
      units: UNITS
    };
  }
  if (result.machine === "build") {
    return {
      machine: "build",
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
      idealEfficiency: result.ideal ? result.ideal.efficiency : null,
      stages: (result.stages || []).map((stage) => snapshot(stage, mode)),
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
  if (result.distanceRatio != null) state.distanceRatio = result.distanceRatio;
  if (result.wheelRadius != null) state.wheelRadius = result.wheelRadius;
  if (result.axleRadius != null) state.axleRadius = result.axleRadius;
  if (result.pitch != null) state.pitch = result.pitch;
  if (result.length != null) state.length = result.length;
  if (result.thickness != null) state.thickness = result.thickness;
  return state;
}
