/**
 * Mechanics Playground — pure model. No DOM, no Planck, no drawing.
 *
 * SI units: meters, kilograms, seconds, newtons, joules. Angles are radians
 * inside the model. y points up. Gravity is +g downward, stored as a positive
 * magnitude; the world applies (0, −g).
 *
 * A build is a JSON document (parts, joints, settings). The simulation turns
 * that document into rigid bodies and hands the renderer a plain snapshot.
 * This file is the document, the bench formulas, and the measurements.
 */
"use strict";

export const G = 9.80665;
export const G_MOON = 1.62;
export const G_MARS = 3.71;
export const G_ZERO = 0;

/** Accumulator quantum. Each quantum is split into SUBSTEPS inside the world. */
export const FIXED_DT = 1 / 60;
export const SUBSTEPS = 4;
export const MAX_FRAME_STEPS = 5;
export const VELOCITY_ITERATIONS = 20;
export const POSITION_ITERATIONS = 10;

/** School Chromebooks and iPads: refuse builds past this. */
export const MAX_BODIES = 48;
export const MAX_JOINTS = 40;
export const MAX_UNDO = 40;
export const GRID = 0.25;
export const SAVE_KEY = "popboard.mechanics.saves";
export const BUILD_VERSION = 1;

export const MATERIALS = Object.freeze({
  ice: Object.freeze({ friction: 0.02, restitution: 0.05, label: "Ice" }),
  wood: Object.freeze({ friction: 0.45, restitution: 0.25, label: "Wood" }),
  rubber: Object.freeze({ friction: 0.95, restitution: 0.72, label: "Rubber" }),
  custom: Object.freeze({ friction: 0.3, restitution: 0.1, label: "Custom" })
});

export const PART_TYPES = Object.freeze([
  "box", "ball", "plank", "wedge", "ground", "wall", "pulley-wheel", "rocket"
]);

export const JOINT_TYPES = Object.freeze([
  "revolute", "prismatic", "distance", "rope", "spring", "weld", "wheel", "pulley"
]);

export const MODES = Object.freeze([
  { id: "sandbox", label: "Sandbox" },
  { id: "pulley", label: "Pulley" },
  { id: "incline", label: "Incline" },
  { id: "springs", label: "Springs" },
  { id: "pendulum", label: "Pendulum" },
  { id: "rocket", label: "Rocket" },
  { id: "friction", label: "Friction" },
  { id: "rube", label: "Rube" }
]);

export const MODE_ALIASES = Object.freeze({
  sandbox: "sandbox",
  empty: "sandbox",
  pulley: "pulley",
  atwood: "pulley",
  incline: "incline",
  ramp: "incline",
  plane: "incline",
  springs: "springs",
  spring: "springs",
  oscillator: "springs",
  pendulum: "pendulum",
  rocket: "rocket",
  thrust: "rocket",
  friction: "friction",
  race: "friction",
  rube: "rube",
  goldberg: "rube",
  chain: "rube"
});

export const GRAVITY_PRESETS = Object.freeze([
  { id: "earth", label: "Earth", g: G },
  { id: "moon", label: "Moon", g: G_MOON },
  { id: "mars", label: "Mars", g: G_MARS },
  { id: "zero", label: "Zero", g: G_ZERO }
]);

/** Kinds a snapshot vector may carry. The draw layer maps these to theme tokens. */
export const VECTOR_KINDS = Object.freeze([
  "gravity", "normal", "friction", "tension", "applied", "velocity"
]);

export const BENCH = Object.freeze({
  atwood: Object.freeze({ heavy: 3, light: 1, heavyId: "heavy", lightId: "light" }),
  spring: Object.freeze({
    mass: 1, stiffness: 50, damping: 0, restLength: 1.2, amplitude: 0.2,
    massId: "mass", anchorId: "anchor", anchorY: 4
  }),
  pendulum: Object.freeze({
    length: 2, degrees: 5, bobId: "bob", pivotId: "pivot", pivotY: 4
  }),
  incline: Object.freeze({
    degrees: 30, run: 6, mass: 2, blockId: "block", rampId: "ramp", mu: 0
  })
});

export function clamp(x, a, b) {
  return Math.max(a, Math.min(b, x));
}

export function snapValue(value, grid) {
  if (!(grid > 0) || !Number.isFinite(value)) return value;
  return Math.round(value / grid) * grid;
}

/** Ideal Atwood acceleration of m1 downward. Positive when m1 > m2. */
export function atwoodAcceleration(m1, m2, g = G) {
  const denom = m1 + m2;
  if (!(denom > 0)) return NaN;
  return ((m1 - m2) * g) / denom;
}

/** Ideal Atwood string tension, ratio 1. */
export function atwoodTension(m1, m2, g = G) {
  const denom = m1 + m2;
  if (!(denom > 0)) return NaN;
  return (2 * m1 * m2 * g) / denom;
}

export function springPeriod(mass, stiffness) {
  if (!(mass > 0) || !(stiffness > 0)) return NaN;
  return 2 * Math.PI * Math.sqrt(mass / stiffness);
}

export function pendulumPeriod(length, g = G) {
  if (!(length > 0) || !(g > 0)) return NaN;
  return 2 * Math.PI * Math.sqrt(length / g);
}

/**
 * Acceleration down a straight incline. mu is kinetic friction.
 * Sticks (returns 0) when friction wins.
 */
export function inclineAcceleration(g, theta, mu = 0) {
  const slide = g * Math.sin(theta) - mu * g * Math.cos(theta);
  return slide > 0 ? slide : 0;
}

/** Signed spring-axis force. Positive pulls the ends together. */
export function springForce(stiffness, damping, extension, separationSpeed) {
  return stiffness * extension + damping * separationSpeed;
}

export function springEnergy(stiffness, extension) {
  return 0.5 * stiffness * extension * extension;
}

export function kineticEnergy(mass, speed, inertia, omega) {
  return 0.5 * mass * speed * speed + 0.5 * (inertia || 0) * omega * omega;
}

/** Gravitational potential with the zero at y = 0. */
export function gravitationalEnergy(mass, g, y) {
  return mass * g * y;
}

/**
 * Force on body 1 from body 2. dx, dy points from 2 to 1.
 * Same-sign poles repel. Magnitude is clamped.
 */
export function magnetForce(q1, q2, dx, dy, minDistance = 0.3) {
  const r = Math.max(minDistance, Math.hypot(dx, dy));
  const raw = (q1 * q2) / (r * r);
  const mag = clamp(raw, -400, 400);
  return { x: mag * dx / r, y: mag * dy / r };
}

export function inclineFrame(run, rise) {
  const length = Math.hypot(run, rise);
  const theta = Math.atan2(rise, run);
  return {
    theta,
    length,
    normal: { x: -Math.sin(theta), y: Math.cos(theta) },
    down: { x: -Math.cos(theta), y: -Math.sin(theta) },
    tangent: { x: Math.cos(theta), y: Math.sin(theta) }
  };
}

/** Center of a box sitting on the hypotenuse of a wedge whose corner is `origin`. */
export function blockOnWedge(origin, run, rise, along, halfHeight, gap = 0.002) {
  const frame = inclineFrame(run, rise);
  const lift = halfHeight + gap;
  return {
    x: origin.x + along * frame.tangent.x + frame.normal.x * lift,
    y: origin.y + along * frame.tangent.y + frame.normal.y * lift,
    angle: frame.theta
  };
}

export function wedgeAngle(part) {
  return Math.atan2(part.rise || 0, part.run || 1);
}

/**
 * Downward zero crossings of sample.value, linearly interpolated.
 * Consecutive crossings are one period apart for a sine-shaped signal.
 */
export function downwardZeroCrossings(samples) {
  const times = [];
  for (let i = 1; i < samples.length; i++) {
    const y0 = samples[i - 1].value;
    const y1 = samples[i].value;
    if (y0 > 0 && y1 <= 0) {
      const span = y0 - y1;
      const frac = span === 0 ? 0 : y0 / span;
      times.push(samples[i - 1].t + frac * (samples[i].t - samples[i - 1].t));
    }
  }
  return times;
}

export function meanPeriod(crossings) {
  if (!crossings || crossings.length < 2) return null;
  let sum = 0;
  for (let i = 1; i < crossings.length; i++) sum += crossings[i] - crossings[i - 1];
  return sum / (crossings.length - 1);
}

export function createTimeAccumulator(fixedDt = FIXED_DT, maxSteps = MAX_FRAME_STEPS) {
  let acc = 0;
  return {
    fixedDt,
    maxSteps,
    consume(frameDt, step) {
      if (!(frameDt > 0)) return 0;
      acc += frameDt;
      const cap = fixedDt * maxSteps;
      if (acc > cap) acc = cap;
      let n = 0;
      while (acc >= fixedDt && n < maxSteps) {
        step(fixedDt);
        acc -= fixedDt;
        n += 1;
      }
      return n;
    },
    reset() {
      acc = 0;
    },
    pending() {
      return acc;
    }
  };
}

export function modeFromSearch(search) {
  const params = toParams(search);
  const raw = (params.get("mode") || "").trim().toLowerCase();
  if (!raw) return "sandbox";
  return MODE_ALIASES[raw] || "sandbox";
}

export function surfaceFriction(part, defriction) {
  if (defriction) return 0;
  const mu = Number(part && part.friction);
  return Number.isFinite(mu) ? Math.max(0, mu) : 0;
}

function toParams(search) {
  if (search && typeof search.get === "function") return search;
  let raw = String(search == null ? "" : search);
  if (raw.charAt(0) === "?") raw = raw.slice(1);
  const hash = raw.indexOf("#");
  if (hash !== -1) raw = raw.slice(0, hash);
  return new URLSearchParams(raw);
}

function finite(value, fallback, min, max) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return clamp(n, min, max);
}

function materialOf(name) {
  return MATERIALS[name] || MATERIALS.wood;
}

export function defaultPart(type, x, y) {
  const material = type === "ball" ? "rubber" : "wood";
  const mat = materialOf(material);
  const base = {
    type,
    x: x || 0,
    y: y || 0,
    angle: 0,
    mass: 1,
    static: type === "ground" || type === "wall" || type === "wedge" || type === "pulley-wheel",
    material,
    friction: mat.friction,
    restitution: mat.restitution,
    thrust: 0,
    thrustOn: false,
    magnet: 0,
    vx: 0,
    vy: 0,
    omega: 0
  };
  if (type === "box") return { ...base, width: 0.6, height: 0.4 };
  if (type === "ball") return { ...base, radius: 0.25 };
  if (type === "plank") return { ...base, width: 2.2, height: 0.12, mass: 1.4 };
  if (type === "wedge") return { ...base, run: 2.2, rise: 1.1, static: true };
  if (type === "ground") return { ...base, width: 10, height: 0.5, y: (y || 0) - 0.25, static: true };
  if (type === "wall") return { ...base, width: 0.3, height: 3.2, static: true };
  if (type === "pulley-wheel") return { ...base, radius: 0.22, static: true };
  if (type === "rocket") {
    return {
      ...base,
      width: 0.9,
      height: 0.36,
      angle: Math.PI / 2,
      material: "custom",
      friction: MATERIALS.custom.friction,
      restitution: 0.05,
      thrust: 20,
      thrustOn: false
    };
  }
  return { ...base, type: "box", width: 0.6, height: 0.4 };
}

function partShape(part) {
  if (part.type === "ball" || part.type === "pulley-wheel") {
    return { shape: "circle", radius: finite(part.radius, 0.25, 0.04, 4) };
  }
  if (part.type === "wedge") {
    const run = finite(part.run, 2, 0.2, 20);
    const rise = finite(part.rise, 1, 0.05, 20);
    return { shape: "polygon", run, rise };
  }
  const width = finite(part.width, 0.6, 0.05, 30);
  const height = finite(part.height, 0.4, 0.05, 20);
  return { shape: "box", width, height };
}

export function normalizePart(input, index) {
  const src = input || {};
  const type = PART_TYPES.includes(src.type) ? src.type : "box";
  const seed = defaultPart(type, 0, 1);
  const material = MATERIALS[src.material] ? src.material : seed.material;
  const mat = materialOf(material);
  const shape = partShape({ ...seed, ...src, type });
  const isStatic = type === "ground" || type === "wall" || type === "pulley-wheel"
    ? src.static !== false
    : !!src.static;
  const part = {
    id: typeof src.id === "string" && src.id.trim() ? src.id.trim().slice(0, 40) : "p" + (index + 1),
    type,
    x: finite(src.x, seed.x, -80, 80),
    y: finite(src.y, seed.y, -80, 80),
    angle: finite(src.angle, seed.angle || 0, -20, 20),
    mass: finite(src.mass, seed.mass || 1, 0.05, 500),
    static: isStatic || type === "ground",
    material,
    friction: finite(src.friction, mat.friction, 0, 2),
    restitution: finite(src.restitution, mat.restitution, 0, 1),
    thrust: finite(src.thrust, 0, 0, 400),
    thrustOn: !!src.thrustOn,
    magnet: finite(src.magnet, 0, -80, 80),
    vx: finite(src.vx, 0, -40, 40),
    vy: finite(src.vy, 0, -40, 40),
    omega: finite(src.omega, 0, -40, 40)
  };
  if (shape.shape === "circle") part.radius = shape.radius;
  if (shape.shape === "box") {
    part.width = shape.width;
    part.height = shape.height;
  }
  if (shape.shape === "polygon") {
    part.run = shape.run;
    part.rise = shape.rise;
  }
  if (part.static) {
    part.vx = 0;
    part.vy = 0;
    part.omega = 0;
    part.thrustOn = false;
  }
  return part;
}

function anchor(value) {
  const src = value || {};
  return {
    x: finite(src.x, 0, -20, 20),
    y: finite(src.y, 0, -20, 20)
  };
}

export function normalizeJoint(input, index) {
  const src = input || {};
  const type = JOINT_TYPES.includes(src.type) ? src.type : "revolute";
  return {
    id: typeof src.id === "string" && src.id.trim() ? src.id.trim().slice(0, 40) : "j" + (index + 1),
    type,
    bodyA: String(src.bodyA || ""),
    bodyB: String(src.bodyB || ""),
    anchorA: anchor(src.anchorA),
    anchorB: anchor(src.anchorB),
    groundAnchorA: src.groundAnchorA ? anchor(src.groundAnchorA) : null,
    groundAnchorB: src.groundAnchorB ? anchor(src.groundAnchorB) : null,
    ratio: finite(src.ratio, 1, 0.2, 5),
    restLength: finite(src.restLength, 1, 0.05, 40),
    stiffness: finite(src.stiffness, 40, 0, 800),
    damping: finite(src.damping, 1, 0, 80),
    maxLength: finite(src.maxLength, 1, 0.05, 40),
    length: finite(src.length, 1, 0.05, 40),
    motor: !!src.motor,
    motorSpeed: finite(src.motorSpeed, 0, -30, 30),
    maxMotorTorque: finite(src.maxMotorTorque, 25, 0, 400),
    axis: anchor(src.axis || { x: 1, y: 0 }),
    frequencyHz: finite(src.frequencyHz, 3, 0, 20),
    dampingRatio: finite(src.dampingRatio, 0.7, 0, 2)
  };
}

export function defaultSettings(over) {
  const src = over || {};
  return {
    gravity: finite(src.gravity, G, 0, 30),
    timeScale: finite(src.timeScale, 1, 0.25, 1),
    airDrag: !!src.airDrag,
    dragCoeff: finite(src.dragCoeff, 0.35, 0, 4),
    defriction: !!src.defriction,
    showVectors: src.showVectors !== false,
    showFbd: src.showFbd !== false,
    showTrails: !!src.showTrails,
    snap: !!src.snap,
    paused: !!src.paused
  };
}

function blankRuntime() {
  return {
    ruler: null,
    stopwatch: { running: false, elapsed: 0 }
  };
}

export function nextId(prefix, items) {
  const used = new Set((items || []).map((item) => item.id));
  let n = 1;
  while (used.has(prefix + n)) n += 1;
  return prefix + n;
}

export function validateBuild(input) {
  let data = input;
  if (typeof data === "string") {
    if (data.length > 500000) return { ok: false, error: "That file is too large." };
    try {
      data = JSON.parse(data);
    } catch (e) {
      return { ok: false, error: "That file is not JSON." };
    }
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return { ok: false, error: "A build has to be an object." };
  }
  if (data.version != null && data.version !== BUILD_VERSION) {
    return { ok: false, error: "This build uses a different version." };
  }
  if (!Array.isArray(data.parts)) return { ok: false, error: "A build needs a parts list." };
  if (data.parts.length > MAX_BODIES) return { ok: false, error: "That build has too many parts." };
  const jointsIn = Array.isArray(data.joints) ? data.joints : [];
  if (jointsIn.length > MAX_JOINTS) return { ok: false, error: "That build has too many joints." };
  const mode = MODE_ALIASES[String(data.mode || "sandbox").toLowerCase()] || "sandbox";
  const parts = data.parts.map((part, i) => normalizePart(part, i));
  const ids = new Set();
  for (const part of parts) {
    if (ids.has(part.id)) return { ok: false, error: "Two parts share an id." };
    ids.add(part.id);
  }
  const joints = [];
  for (let i = 0; i < jointsIn.length; i++) {
    const joint = normalizeJoint(jointsIn[i], i);
    if (!ids.has(joint.bodyA) || !ids.has(joint.bodyB)) {
      return { ok: false, error: "A joint points at a missing part." };
    }
    if (joint.bodyA === joint.bodyB) return { ok: false, error: "A joint needs two different parts." };
    if (ids.has(joint.id)) return { ok: false, error: "A joint id collides with another id." };
    ids.add(joint.id);
    joints.push(joint);
  }
  const doc = {
    version: BUILD_VERSION,
    mode,
    settings: defaultSettings(data.settings),
    parts,
    joints,
    ruler: normalizeRuler(data.ruler),
    stopwatch: {
      running: !!(data.stopwatch && data.stopwatch.running),
      elapsed: finite(data.stopwatch && data.stopwatch.elapsed, 0, 0, 86400)
    }
  };
  if (data.built && Array.isArray(data.built.parts)) {
    const built = validateBuild({ ...data, built: undefined, parts: data.built.parts, joints: data.built.joints || joints });
    if (built.ok) doc.built = { parts: built.doc.parts, joints: built.doc.joints };
  }
  return { ok: true, doc };
}

function normalizeRuler(ruler) {
  if (!ruler || typeof ruler !== "object") return null;
  const x1 = Number(ruler.x1);
  const y1 = Number(ruler.y1);
  const x2 = Number(ruler.x2);
  const y2 = Number(ruler.y2);
  if (![x1, y1, x2, y2].every(Number.isFinite)) return null;
  return { x1, y1, x2, y2 };
}

export function parseBuild(input) {
  const result = validateBuild(input);
  return result.ok ? result.doc : null;
}

export function serializeBuild(doc) {
  const parsed = parseBuild(doc);
  if (!parsed) return "";
  return JSON.stringify(parsed);
}

export function cloneBuild(doc) {
  return JSON.parse(JSON.stringify(doc));
}

function part(partial) {
  return normalizePart(partial, 0);
}

function joint(partial) {
  return normalizeJoint(partial, 0);
}

export function buildPreset(mode) {
  const id = MODE_ALIASES[mode] || "sandbox";
  if (id === "pulley") return pulleyPreset();
  if (id === "incline") return inclinePreset();
  if (id === "springs") return springPreset();
  if (id === "pendulum") return pendulumPreset();
  if (id === "rocket") return rocketPreset();
  if (id === "friction") return frictionPreset();
  if (id === "rube") return rubePreset();
  return sandboxPreset();
}

function doc(mode, settings, parts, joints) {
  return {
    version: BUILD_VERSION,
    mode,
    settings: defaultSettings(settings),
    parts,
    joints: joints || [],
    ruler: null,
    stopwatch: { running: false, elapsed: 0 }
  };
}

function ground(id, x, width) {
  return part({
    id, type: "ground", x, y: -0.25, width: width || 16, height: 0.5,
    static: true, material: "wood"
  });
}

function sandboxPreset() {
  return doc("sandbox", { paused: false }, [
    ground("ground", 0, 16),
    part({ id: "wallL", type: "wall", x: -8, y: 1.6, static: true }),
    part({ id: "wallR", type: "wall", x: 8, y: 1.6, static: true })
  ]);
}

function pulleyPreset() {
  const bench = BENCH.atwood;
  return doc("pulley", { showFbd: true, showVectors: true }, [
    ground("ground", 0, 12),
    part({ id: "wheelA", type: "pulley-wheel", x: -1.2, y: 7, radius: 0.2, static: true, material: "wood" }),
    part({ id: "wheelB", type: "pulley-wheel", x: 1.2, y: 7, radius: 0.2, static: true, material: "wood" }),
    part({
      id: bench.heavyId, type: "box", x: -1.2, y: 3.2, width: 0.42, height: 0.42,
      mass: bench.heavy, material: "wood"
    }),
    part({
      id: bench.lightId, type: "box", x: 1.2, y: 3.2, width: 0.36, height: 0.36,
      mass: bench.light, material: "wood"
    })
  ], [
    joint({
      id: "string",
      type: "pulley",
      bodyA: bench.heavyId,
      bodyB: bench.lightId,
      anchorA: { x: 0, y: 0 },
      anchorB: { x: 0, y: 0 },
      groundAnchorA: { x: -1.2, y: 7 },
      groundAnchorB: { x: 1.2, y: 7 },
      ratio: 1
    })
  ]);
}

function inclinePreset() {
  const bench = BENCH.incline;
  const rise = bench.run * Math.tan(bench.degrees * Math.PI / 180);
  const halfHeight = 0.16;
  const pose = blockOnWedge({ x: 0, y: 0 }, bench.run, rise, 4.2, halfHeight, 0.002);
  return doc("incline", { showFbd: true }, [
    part({
      id: bench.rampId, type: "wedge", x: 0, y: 0, run: bench.run, rise,
      static: true, material: "custom", friction: bench.mu, restitution: 0
    }),
    part({
      id: bench.blockId, type: "box", x: pose.x, y: pose.y, angle: pose.angle,
      width: 0.46, height: halfHeight * 2, mass: bench.mass,
      material: "custom", friction: bench.mu, restitution: 0
    })
  ]);
}

function springPreset() {
  const bench = BENCH.spring;
  const extension = (bench.mass * G) / bench.stiffness + bench.amplitude;
  const y = bench.anchorY - bench.restLength - extension;
  return doc("springs", { showFbd: true }, [
    part({
      id: bench.anchorId, type: "box", x: 0, y: bench.anchorY, width: 0.7, height: 0.28,
      static: true, material: "wood"
    }),
    part({
      id: bench.massId, type: "box", x: 0, y, width: 0.36, height: 0.36,
      mass: bench.mass, material: "wood", friction: 0, restitution: 0
    })
  ], [
    joint({
      id: "coil",
      type: "spring",
      bodyA: bench.anchorId,
      bodyB: bench.massId,
      anchorA: { x: 0, y: 0 },
      anchorB: { x: 0, y: 0 },
      restLength: bench.restLength,
      stiffness: bench.stiffness,
      damping: bench.damping
    })
  ]);
}

function pendulumPreset() {
  const bench = BENCH.pendulum;
  const theta = bench.degrees * Math.PI / 180;
  const x = bench.length * Math.sin(theta);
  const y = bench.pivotY - bench.length * Math.cos(theta);
  return doc("pendulum", { showFbd: true, showTrails: true }, [
    part({
      id: bench.pivotId, type: "ball", x: 0, y: bench.pivotY, radius: 0.08,
      static: true, material: "wood"
    }),
    part({
      id: bench.bobId, type: "ball", x, y, radius: 0.07, mass: 1,
      material: "wood", friction: 0.2, restitution: 0
    })
  ], [
    joint({
      id: "rod",
      type: "distance",
      bodyA: bench.pivotId,
      bodyB: bench.bobId,
      anchorA: { x: 0, y: 0 },
      anchorB: { x: 0, y: 0 },
      length: bench.length
    })
  ]);
}

function rocketPreset() {
  return doc("rocket", { showVectors: true, showFbd: true }, [
    ground("pad", 0, 8),
    part({
      id: "rocket", type: "rocket", x: 0, y: 0.52, angle: Math.PI / 2,
      width: 0.9, height: 0.34, mass: 1, thrust: 22, thrustOn: true,
      material: "custom", friction: 0.4, restitution: 0.05
    })
  ]);
}

function frictionPreset() {
  const degrees = 35;
  const run = 3.2;
  const rise = run * Math.tan(degrees * Math.PI / 180);
  const halfHeight = 0.14;
  const materials = ["ice", "wood", "rubber"];
  const parts = [
    part({
      id: "tray",
      type: "ground",
      x: 5.2,
      y: -0.27,
      width: 18,
      height: 0.5,
      static: true,
      material: "wood",
      friction: 0.6,
      restitution: 0
    }),
    part({
      id: "stop",
      type: "wall",
      x: -2.4,
      y: 1.4,
      width: 0.4,
      height: 2.8,
      static: true,
      material: "wood",
      restitution: 0
    })
  ];
  materials.forEach((material, index) => {
    const origin = { x: index * 4.4, y: 0 };
    const pose = blockOnWedge(origin, run, rise, 2.35, halfHeight, 0.002);
    parts.push(part({
      id: "ramp" + material,
      type: "wedge",
      x: origin.x,
      y: 0,
      run,
      rise,
      static: true,
      material: "custom",
      friction: 1,
      restitution: 0
    }));
    parts.push(part({
      id: "block" + material,
      type: "box",
      x: pose.x,
      y: pose.y,
      angle: pose.angle,
      width: 0.4,
      height: halfHeight * 2,
      mass: 1,
      material,
      friction: MATERIALS[material].friction,
      restitution: 0
    }));
  });
  return doc("friction", { showFbd: true }, parts);
}

function rubePreset() {
  const length = 1.55;
  const theta = 58 * Math.PI / 180;
  const pivot = { x: 0, y: 2.05 };
  const bob = {
    x: pivot.x - length * Math.sin(theta),
    y: pivot.y - length * Math.cos(theta)
  };
  return doc("rube", { showTrails: true }, [
    ground("ground", 2, 12),
    part({ id: "pivot", type: "ball", x: pivot.x, y: pivot.y, radius: 0.08, static: true }),
    part({ id: "bob", type: "ball", x: bob.x, y: bob.y, radius: 0.14, mass: 1.4, material: "rubber", restitution: 0.05 }),
    part({
      id: "cargo", type: "box", x: 0.34, y: 0.22, width: 0.4, height: 0.4,
      mass: 0.45, material: "ice", friction: 0.05, restitution: 0.02
    }),
    part({ id: "bumper", type: "box", x: 2.15, y: 0.22, width: 0.36, height: 0.4, mass: 0.6, material: "wood" }),
    part({ id: "wall", type: "wall", x: 3.55, y: 1.4, static: true })
  ], [
    joint({
      id: "rod", type: "distance", bodyA: "pivot", bodyB: "bob",
      anchorA: { x: 0, y: 0 }, anchorB: { x: 0, y: 0 }, length
    }),
    joint({
      id: "coil", type: "spring", bodyA: "bumper", bodyB: "wall",
      anchorA: { x: 0, y: 0 }, anchorB: { x: 0, y: 0 },
      restLength: 1.15, stiffness: 28, damping: 1.2
    })
  ]);
}

export function localPoint(body, x, y) {
  const dx = x - body.x;
  const dy = y - body.y;
  const c = Math.cos(body.angle || 0);
  const s = Math.sin(body.angle || 0);
  return { x: c * dx + s * dy, y: -s * dx + c * dy };
}

function pointInPolygon(local, vertices) {
  let inside = false;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const xi = vertices[i].x;
    const yi = vertices[i].y;
    const xj = vertices[j].x;
    const yj = vertices[j].y;
    const hit = (yi > local.y) !== (yj > local.y)
      && local.x < ((xj - xi) * (local.y - yi)) / ((yj - yi) || 1e-12) + xi;
    if (hit) inside = !inside;
  }
  return inside;
}

export function hitBody(bodies, x, y) {
  if (!Array.isArray(bodies)) return null;
  for (let i = bodies.length - 1; i >= 0; i--) {
    const body = bodies[i];
    const local = localPoint(body, x, y);
    if (body.shape === "circle") {
      if (local.x * local.x + local.y * local.y <= body.radius * body.radius) return body.id;
    } else if (body.shape === "polygon" && body.localVertices) {
      if (pointInPolygon(local, body.localVertices)) return body.id;
    } else if (Math.abs(local.x) <= body.hx && Math.abs(local.y) <= body.hy) {
      return body.id;
    }
  }
  return null;
}

export function readSaves(storage) {
  if (!storage || typeof storage.getItem !== "function") return {};
  try {
    const raw = storage.getItem(SAVE_KEY);
    if (!raw) return {};
    const data = JSON.parse(raw);
    if (!data || typeof data !== "object" || Array.isArray(data)) return {};
    const out = {};
    for (const name of Object.keys(data)) {
      if (!name || name.length > 60) continue;
      const parsed = parseBuild(data[name]);
      if (parsed) out[name] = parsed;
    }
    return out;
  } catch (e) {
    return {};
  }
}

export function writeSave(storage, name, doc) {
  const cleanName = String(name || "").trim().slice(0, 60);
  if (!cleanName) return { ok: false, error: "Name the build first." };
  const parsed = parseBuild(doc);
  if (!parsed) return { ok: false, error: "This build could not be stored." };
  const all = {};
  try {
    const raw = storage.getItem(SAVE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (data && typeof data === "object" && !Array.isArray(data)) Object.assign(all, data);
    }
  } catch (e) { /* replace a corrupt store */ }
  all[cleanName] = parsed;
  const keys = Object.keys(all);
  while (keys.length > 24) delete all[keys.shift()];
  storage.setItem(SAVE_KEY, JSON.stringify(all));
  return { ok: true, name: cleanName };
}

export function deleteSave(storage, name) {
  const all = readSaves(storage);
  delete all[name];
  storage.setItem(SAVE_KEY, JSON.stringify(all));
}
