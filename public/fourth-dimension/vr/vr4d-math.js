// Beyond 3D VR storybook: pure geometry on top of fd-math.js.
// No DOM, no Three.js. The scene 5 dial and the slice readouts both call this.
import * as M from "../fd-math.js";

export const EYE_Y = 1.35;
export const ROT_CAP_DPS = 20;
export const HALF_TURN_SEC = 180 / ROT_CAP_DPS; // 9 seconds at the cap
export const W_PLANES = ["XW", "YW", "ZW"];

// Storyboard constants. Scene code and tests share these so the pictures cannot drift.
export const BALL_R = 0.6;
export const BALL_Z = -1.6;
export const BEAD_RANGE = 0.75; // metres the ball centre travels either side of the sheet
export const HYPER_R = 0.75;
export const HYPER_Z = -1.7;
export const OUTER_M = 3.0;
export const INNER_M = 1.5;
export const PROJ_D = 3;
export const PROJ_K = 2;
// Unrotated w=+1 face projects to width 2 (k/(d-1) = 1 on each side). 3 m / 2 = 1.5 m per unit.
export const SHADOW_SCALE = OUTER_M / (2 * (PROJ_K / (PROJ_D - 1)));

export const SCENE3 = {
  lamp: [-0.7, 2.05, 0.2],
  screenZ: -2.4,
  cubeCenter: [0, 1.28, -0.75],
  edge: 0.30,
};

export function cyclePlane(plane) {
  const i = Math.max(0, W_PLANES.indexOf(plane));
  return W_PLANES[(i + 1) % W_PLANES.length];
}

// Ball through a plane, seen edge-on: the cut is a segment, not a disk.
export function segmentLength(R, h) { return 2 * M.sliceRadius(R, h); }
// 4D ball through 3D space: the cut is a sphere of this radius.
export function sphereSliceRadius(R, c) { return M.sliceRadius(R, c); }

export function segmentAngleDeg(R, h, distance) {
  const half = segmentLength(R, h) / 2;
  return 2 * Math.atan2(half, distance) * 180 / Math.PI;
}

export function capDelta(deltaRad, dt, capDegPerSec = ROT_CAP_DPS) {
  const cap = (capDegPerSec * Math.PI) / 180 * Math.max(0, dt);
  if (deltaRad > cap) return cap;
  if (deltaRad < -cap) return -cap;
  return deltaRad;
}

let _gold = null;
export function goldCellIds() {
  if (!_gold) _gold = M.tesseractCells().find((c) => c.axis === 3 && c.sign === -1).ids.slice();
  return _gold;
}

export function rotatedPoints(plane, angleRad) {
  const R = M.rot(plane, angleRad);
  return M.hypercube(4).V.map((p) => M.apply(R, p));
}

function spanOf(pts, axis) {
  let lo = Infinity, hi = -Infinity;
  for (const p of pts) { lo = Math.min(lo, p[axis]); hi = Math.max(hi, p[axis]); }
  return { lo, hi, span: hi - lo, mean: (lo + hi) / 2 };
}

// Where the starting inner cell (w = -1, the gold cell) sits after a turn.
// "inner" all w = -1, "outer" all w = +1, "side" one of x,y,z is constant.
export function goldCellPose(plane, angleRad) {
  const pts = goldCellIds().map((i) => rotatedPoints(plane, angleRad)[i]);
  const w = spanOf(pts, 3);
  const EPS = 1e-6;
  if (w.span < EPS && w.mean < -0.5) return { role: "inner", w: w.mean };
  if (w.span < EPS && w.mean > 0.5) return { role: "outer", w: w.mean };
  for (let a = 0; a < 3; a++) {
    const s = spanOf(pts, a);
    if (s.span < EPS && w.span > 1) return { role: "side", axis: a, sign: Math.sign(s.mean) || 1, wMean: w.mean };
  }
  return { role: "mixed", wMean: w.mean };
}

export function goldProjected(plane, angleRad) {
  const P = goldCellIds().map((i) => M.projectPerspective(rotatedPoints(plane, angleRad)[i], PROJ_D, PROJ_K));
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity], c = [0, 0, 0];
  for (const p of P) for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k], p[k]); max[k] = Math.max(max[k], p[k]); c[k] += p[k]; }
  for (let k = 0; k < 3; k++) c[k] /= P.length;
  return { min, max, c, width: max[0] - min[0], height: max[1] - min[1], depth: max[2] - min[2] };
}

// Notch crossings between two dial angles. 90° + 180°·k is the side-cell waypoint.
// 180° + 360°·k is the inner/outer swap. The start angle 0 is not a notch.
export function notchEvents(prev, next) {
  const out = [];
  if (prev === next) return out;
  const step = Math.PI / 2;
  const k0 = Math.floor(Math.min(prev, next) / step) - 1;
  const k1 = Math.ceil(Math.max(prev, next) / step) + 1;
  for (let k = k0; k <= k1; k++) {
    if (k === 0) continue;
    const a = k * step;
    if (!((prev < a && next >= a) || (prev > a && next <= a))) continue;
    const m = ((k % 4) + 4) % 4;
    if (m === 1 || m === 3) out.push({ kind: "waypoint", angle: a, k });
    else if (m === 2) out.push({ kind: "swap", angle: a, k });
  }
  return out;
}

// Perspective shadow of point p from lamp L onto the plane coord[axis] = value.
// Returns null when the point is on the lamp or the ray does not hit the plane in front.
export function shadowOnPlane(p, L, axis, value) {
  const denom = L[axis] - p[axis];
  if (Math.abs(denom) < 1e-8) return null;
  const t = (L[axis] - value) / denom;
  if (t < 0) return null;
  return L.map((l, i) => (i === axis ? value : l + (p[i] - l) * t));
}

export function shadowScaleAt(z) {
  const L = SCENE3.lamp;
  return (L[2] - SCENE3.screenZ) / (L[2] - z);
}

// Wires within this distance of the head fade out, so one never pokes the eye.
export const HEAD_FADE_M = 0.5;
// Geometry is cut only inside this ball. Anything farther, including the outer
// cube behind and beside the seat, stays in the model.
export const HEAD_CLIP_M = 0.12;

export function wireFade(dist, radius = HEAD_FADE_M) {
  if (!(dist > 0) || !(radius > 0)) return 0;
  return dist >= radius ? 1 : dist / radius;
}

// Keep the longer part of a segment that lies outside a sphere.
// A segment that only passes beside the sphere is returned whole, so the
// outer cube's rear and side edges are not discarded.
// Returns [ax, ay, az, bx, by, bz] or null when nothing is outside.
export function clipSegmentOutsideSphere(a, b, center, radius) {
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
  const fx = a[0] - center[0], fy = a[1] - center[1], fz = a[2] - center[2];
  const dd = dx * dx + dy * dy + dz * dz;
  if (dd < 1e-12) return null;
  const fd = fx * dx + fy * dy + fz * dz;
  const ff = fx * fx + fy * fy + fz * fz;
  const r2 = radius * radius;
  const disc = fd * fd - dd * (ff - r2);
  const full = () => [a[0], a[1], a[2], b[0], b[1], b[2]];
  if (disc < 0) return ff > r2 ? full() : null;
  const s = Math.sqrt(disc);
  let tA = (-fd - s) / dd, tB = (-fd + s) / dd;
  if (tA > tB) { const swap = tA; tA = tB; tB = swap; }
  if (tB < 0 || tA > 1) return ff > r2 ? full() : null;
  const pieces = [];
  if (tA > 1e-4) pieces.push([0, Math.min(1, tA)]);
  if (tB < 1 - 1e-4) pieces.push([Math.max(0, tB), 1]);
  if (!pieces.length) return null;
  pieces.sort((p, q) => (q[1] - q[0]) - (p[1] - p[0]));
  const [t0, t1] = pieces[0];
  if (t1 - t0 < 1e-4) return null;
  return [
    a[0] + dx * t0, a[1] + dy * t0, a[2] + dz * t0,
    a[0] + dx * t1, a[1] + dy * t1, a[2] + dz * t1,
  ];
}
