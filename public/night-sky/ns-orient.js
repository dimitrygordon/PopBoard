// Night Sky look-around ("magic window"): DeviceOrientation math, compass vs relative heading, and smoothing.
// Quaternion convention matches three.js DeviceOrientationControls (Euler YXZ, then -PI/2 about X, then
// minus the screen orientation about Z). The camera looks out the back of the phone. World frame is
// x East, y Up, z South, so a camera at identity looks north along -Z.

const D2R = Math.PI / 180, R2D = 180 / Math.PI;
const Q_TILT = { x: -Math.SQRT1_2, y: 0, z: 0, w: Math.SQRT1_2 }; // -90 deg about X

export function quatMul(a, b) {
  return {
    x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
    y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
    z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
    w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
  };
}
/** three.js Euler order YXZ: q = qy * qx * qz. */
export function quatFromEulerYXZ(x, y, z) {
  const cx = Math.cos(x / 2), sx = Math.sin(x / 2), cy = Math.cos(y / 2), sy = Math.sin(y / 2), cz = Math.cos(z / 2), sz = Math.sin(z / 2);
  return {
    x: sx * cy * cz + cx * sy * sz,
    y: cx * sy * cz - sx * cy * sz,
    z: cx * cy * sz - sx * sy * cz,
    w: cx * cy * cz + sx * sy * sz,
  };
}
export function quatFromAxisAngle(ax, ay, az, ang) {
  const h = ang / 2, s = Math.sin(h);
  return { x: ax * s, y: ay * s, z: az * s, w: Math.cos(h) };
}
export function rotateVec(q, v) {
  const x = q.x, y = q.y, z = q.z, w = q.w;
  const ux = y * v[2] - z * v[1], uy = z * v[0] - x * v[2], uz = x * v[1] - y * v[0];
  const vx = w * ux + y * uz - z * uy, vy = w * uy + z * ux - x * uz, vz = w * uz + x * uy - y * ux;
  return [v[0] + 2 * vx, v[1] + 2 * vy, v[2] + 2 * vz];
}
export function lookDir(q) { return rotateVec(q, [0, 0, -1]); }

/** Device orientation to a camera quaternion. alpha/beta/gamma/screen in degrees. */
export function deviceQuaternion(alphaDeg, betaDeg, gammaDeg, screenDeg = 0) {
  const q = quatFromEulerYXZ(betaDeg * D2R, alphaDeg * D2R, -gammaDeg * D2R);
  return quatMul(quatMul(q, Q_TILT), quatFromAxisAngle(0, 0, 1, -screenDeg * D2R));
}

/**
 * Best compass alpha (degrees) and mode from a DeviceOrientation-like event.
 * iOS: webkitCompassHeading is clockwise from north; the quaternion wants the W3C alpha
 * (0 when the top of the device points north, increasing counterclockwise), so 360 - heading.
 * Elsewhere: deviceorientationabsolute (or ev.absolute) is compass-aligned; otherwise relative.
 */
export function compassAlpha(ev) {
  if (!ev) return { alpha: null, mode: "relative", heading: null };
  const heading = ev.webkitCompassHeading;
  if (heading != null && Number.isFinite(heading)) {
    return { alpha: (360 - heading) % 360, mode: "compass", heading };
  }
  if (ev.alpha == null || !Number.isFinite(ev.alpha)) return { alpha: null, mode: "relative", heading: null };
  const abs = ev.absolute === true || ev.source === "absolute";
  return { alpha: ev.alpha, mode: abs ? "compass" : "relative", heading: abs ? (360 - ev.alpha) % 360 : null };
}

/** Shortest-path interpolation of degrees in [0, 360). */
export function lerpAngle(a, b, t) {
  let d = ((b - a + 540) % 360) - 180;
  return (a + d * t + 360) % 360;
}
/** Signed-degree lerp (beta/gamma), wrapping at +/-180. */
export function lerpSigned(a, b, t) {
  let d = b - a;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return a + d * t;
}
export function slerpQuat(a, b, t) {
  let dot = a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w;
  let bx = b.x, by = b.y, bz = b.z, bw = b.w;
  if (dot < 0) { dot = -dot; bx = -bx; by = -by; bz = -bz; bw = -bw; }
  if (dot > 0.9995) {
    const x = a.x + (bx - a.x) * t, y = a.y + (by - a.y) * t, z = a.z + (bz - a.z) * t, w = a.w + (bw - a.w) * t;
    const l = Math.hypot(x, y, z, w) || 1;
    return { x: x / l, y: y / l, z: z / l, w: w / l };
  }
  const th = Math.acos(dot), st = Math.sin(th), sA = Math.sin((1 - t) * th) / st, sB = Math.sin(t * th) / st;
  return { x: a.x * sA + bx * sB, y: a.y * sA + by * sB, z: a.z * sA + bz * sB, w: a.w * sA + bw * sB };
}

/** True if we should offer the Look around button. Hidden when there is no orientation API or no reason to think sensors exist. */
export function offerLookAround({ hasDeviceOrientation, hasRequestPermission, touchPoints = 0, pointerCoarse = false } = {}) {
  // requestPermission exists on some desktop Chromes that have no sensors; only offer the button
  // on a touch/coarse device (phones and tablets), or iOS where the permission API is paired with touch.
  if (!hasDeviceOrientation) return false;
  return touchPoints > 0 || pointerCoarse;
}

/** Filter that holds the latest smoothed sample. k is the blend toward each new reading (0.25-0.4 tames noise without much lag). */
export function createOrientationFilter(k = 0.32) {
  let a = null, b = null, g = null, q = null;
  return {
    get quaternion() { return q; },
    get ready() { return q != null; },
    reset() { a = b = g = q = null; },
    push(alphaDeg, betaDeg, gammaDeg, screenDeg = 0) {
      if (a == null) { a = alphaDeg; b = betaDeg; g = gammaDeg; }
      else { a = lerpAngle(a, alphaDeg, k); b = lerpSigned(b, betaDeg, k); g = lerpSigned(g, gammaDeg, k); }
      const next = deviceQuaternion(a, b, g, screenDeg);
      q = q ? slerpQuat(q, next, Math.min(1, k + 0.15)) : next;
      return q;
    },
  };
}

export function screenAngleDeg() {
  if (typeof screen !== "undefined" && screen.orientation && Number.isFinite(screen.orientation.angle)) return screen.orientation.angle;
  if (typeof window !== "undefined" && Number.isFinite(window.orientation)) return window.orientation;
  return 0;
}
