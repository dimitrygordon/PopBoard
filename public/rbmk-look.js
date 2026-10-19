// Camera, walking, and the automatic-rod command for the RBMK study module.
// None of this writes reactor state. autoRodCommand returns a rod target; the page applies it.

export const LOOK_SENS = 0.004;
export const WALK_SPEED = 2;
export const SPRINT_SPEED = 3.5;
export const EYE_HEIGHT = 1.6;
export const DOLLY_MAX = 0.3;
export const GLIDE_MS = 600;
export const DESK_DISTANCE = 1.5;

export const DESK_POSE = { x: 0, y: 1.28, z: 0.62, yaw: 0, pitch: 0, dolly: 0 };
export const DESK_ANCHOR = { x: 0, z: -0.35 };

// Short technical words for the approved list. The Da Vinci brief's exact
// strings were not in the v2 upload; these are the standard terms for those meanings.
export const RU_LABELS = {
  reactor: "РБМК-1000",
  power: "МОЩНОСТЬ",
  pressure: "ДАВЛЕНИЕ",
  temperature: "ТЕМПЕРАТУРА",
  rods: "СТЕРЖНИ",
  plant: "АЭС",
  attention: "ВНИМАНИЕ",
  panel: "ЩИТ"
};

// Decorative lookalikes only. Never a translation and never a control label.
export const FAUX_MARKS = ["ЯБМК"];

export const ROOM_BOUNDS = { minX: -3.55, maxX: 3.55, minZ: -5.35, maxZ: 1.35 };

export const COLLIDERS = [
  { name: "desk", minX: -2.8, maxX: 2.8, minZ: -1.1, maxZ: 0.42 },
  { name: "panel", minX: -1.15, maxX: 1.15, minZ: -1.45, maxZ: -1.05 },
  { name: "rear", minX: -2.5, maxX: 3.2, minZ: -3.85, maxZ: -2.95 },
  { name: "door", minX: 3.25, maxX: 4.3, minZ: -0.7, maxZ: 0.35 },
  { name: "back", minX: -4.2, maxX: 4.2, minZ: -6.4, maxZ: -5.4 },
  { name: "left", minX: -4.6, maxX: -3.6, minZ: -6.4, maxZ: 2.2 }
];

const DEG = Math.PI / 180;
const SEATED_YAW = 40 * DEG;
const SEATED_PITCH = 18 * DEG;
const WALK_YAW = 170 * DEG;
const WALK_PITCH = 55 * DEG;

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

export function lookLimits(walking) {
  return walking
    ? { yaw: WALK_YAW, pitch: WALK_PITCH }
    : { yaw: SEATED_YAW, pitch: SEATED_PITCH };
}

// Drag right (dx > 0) increases yaw. Drag up (dy < 0) increases pitch.
// Wheel up (deltaY < 0) increases pitch, then dollies at the pitch clamp.
// invertY flips the drag only. One pixel sensitivity for x and y.
export function applyLookGesture(pose, g = {}) {
  const sens = g.sens ?? LOOK_SENS;
  const limits = {
    yaw: g.yawLimit ?? WALK_YAW,
    pitch: g.pitchLimit ?? WALK_PITCH
  };
  const invert = g.invertY ? 1 : -1;
  const yaw = clamp((pose.yaw || 0) + (g.dx || 0) * sens, -limits.yaw, limits.yaw);
  let pitch = (pose.pitch || 0) + (g.dy || 0) * sens * invert;
  let dolly = pose.dolly || 0;
  const wheelUp = -(g.wheel || 0) * sens * 0.5;
  if (wheelUp > 0) {
    pitch += wheelUp;
    if (pitch > limits.pitch) {
      dolly = clamp(dolly + (pitch - limits.pitch) * 2, -DOLLY_MAX, DOLLY_MAX);
      pitch = limits.pitch;
    }
  } else if (wheelUp < 0) {
    let back = -wheelUp;
    if (dolly > 0) {
      const take = Math.min(dolly, back * 2);
      dolly -= take;
      back -= take / 2;
    }
    pitch -= back;
    if (pitch < -limits.pitch) {
      dolly = clamp(dolly - (-limits.pitch - pitch) * 2, -DOLLY_MAX, DOLLY_MAX);
      pitch = -limits.pitch;
    }
  }
  pitch = clamp(pitch, -limits.pitch, limits.pitch);
  return {
    x: pose.x || 0,
    y: pose.y || 0,
    z: pose.z || 0,
    yaw,
    pitch,
    dolly
  };
}

// yaw 0, pitch 0 looks down -Z. Positive yaw turns toward +X (the viewer's right).
// Positive pitch raises the forward vector.
export function lookForward(yaw, pitch) {
  return {
    x: Math.sin(yaw) * Math.cos(pitch),
    y: Math.sin(pitch),
    z: -Math.cos(yaw) * Math.cos(pitch)
  };
}

export function poseSnapshot(pose) {
  return {
    x: pose.x || 0,
    y: pose.y || 0,
    z: pose.z || 0,
    yaw: pose.yaw || 0,
    pitch: pose.pitch || 0,
    dolly: pose.dolly || 0
  };
}

export function glidePose(from, to, t) {
  const u = t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
  const mix = (a, b) => a + (b - a) * u;
  return {
    x: mix(from.x, to.x),
    y: mix(from.y, to.y),
    z: mix(from.z, to.z),
    yaw: mix(from.yaw, to.yaw),
    pitch: mix(from.pitch, to.pitch),
    dolly: mix(from.dolly || 0, to.dolly || 0)
  };
}

export function restorePose(from, elapsedMs, reduced = false) {
  if (reduced || elapsedMs >= GLIDE_MS) return poseSnapshot(DESK_POSE);
  const t = Math.max(0, elapsedMs) / GLIDE_MS;
  return glidePose(poseSnapshot(from), poseSnapshot(DESK_POSE), t);
}

function blocked(x, z, colliders) {
  for (const box of colliders) {
    if (x > box.minX && x < box.maxX && z > box.minZ && z < box.maxZ) return true;
  }
  return false;
}

export function walkStep(pose, input = {}, dt = 0, opts = {}) {
  const slices = Math.max(1, Math.ceil((dt || 0) / 0.05));
  const h = (dt || 0) / slices;
  let next = pose;
  for (let i = 0; i < slices; i++) next = walkSlice(next, input, h, opts);
  return next;
}

function walkSlice(pose, input, dt, opts) {
  const bounds = opts.bounds || ROOM_BOUNDS;
  const colliders = opts.colliders || COLLIDERS;
  const speed = input.sprint ? SPRINT_SPEED : WALK_SPEED;
  const yaw = pose.yaw || 0;
  const fx = Math.sin(yaw);
  const fz = -Math.cos(yaw);
  const rx = Math.cos(yaw);
  const rz = Math.sin(yaw);
  let forward = input.forward || 0;
  let strafe = input.strafe || 0;
  const mag = Math.hypot(forward, strafe);
  if (mag > 1) {
    forward /= mag;
    strafe /= mag;
  }
  const dx = (fx * forward + rx * strafe) * speed * dt;
  const dz = (fz * forward + rz * strafe) * speed * dt;
  let x = pose.x || 0;
  let z = pose.z || 0;
  const nx = x + dx;
  if (nx >= bounds.minX && nx <= bounds.maxX && !blocked(nx, z, colliders)) x = nx;
  const nz = z + dz;
  if (nz >= bounds.minZ && nz <= bounds.maxZ && !blocked(x, nz, colliders)) z = nz;
  return {
    x,
    y: EYE_HEIGHT,
    z,
    yaw,
    pitch: pose.pitch || 0,
    dolly: pose.dolly || 0
  };
}

export function awayFromDesk(pose) {
  return Math.hypot((pose.x || 0) - DESK_ANCHOR.x, (pose.z || 0) - DESK_ANCHOR.z) > DESK_DISTANCE;
}

// Smoothed macro power only. deadband is percent power. speed is rod fraction per second.
// A neutron count is not an input.
export function autoRodCommand({ rod, powerPct, setpointPct, dt, deadband = 3, speed = 0.05 }) {
  const err = powerPct - setpointPct;
  if (Math.abs(err) <= deadband) return rod;
  const dir = err > 0 ? 1 : -1;
  const step = Math.min(Math.abs(speed) * dt, Math.abs(err) / 100);
  return clamp(rod + dir * step, 0, 1);
}

export function rodDriveStatus(failed) {
  return failed ? "rod drive lost, core damaged (exact sequence uncertain)" : "";
}

export function neutronDisplayMap(count) {
  const band = count >= 40 ? "40" : count >= 20 ? "20–40" : "below 20";
  return {
    illustrative: count,
    band,
    note: "illustrative neutron population, not to scale"
  };
}
