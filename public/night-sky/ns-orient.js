// Night Sky look-around ("magic window"): DeviceOrientation math, compass vs relative heading, and smoothing.
// Quaternion convention matches three.js DeviceOrientationControls (Euler YXZ, then -PI/2 about X, then
// minus the screen orientation about Z). The camera looks out the back of the phone. World frame is
// x East, y Up, z South, so a camera at identity looks north along -Z.
//
// Attitude is built as a quaternion from alpha/beta/gamma plus the screen angle, then slerp-smoothed
// once per animation frame with a 1-euro-style adaptive cutoff (steady when still, follows a turn).
// Compass heading is a separate, slow yaw offset — it is not written into the pose every event.

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

/**
 * Fold a DeviceOrientation event into the look-around sample. Attitude always uses the event's
 * own alpha/beta/gamma (gyro). A compass reading is stored separately as compassAlpha and must
 * not replace the attitude alpha. A relative event does not clear an earlier compass solution.
 */
export function mergeOrientationSample(prev, ev, screenDeg = 0) {
  const empty = { alpha: null, beta: null, gamma: null, screen: screenDeg, compassAlpha: null, mode: "relative", note: "" };
  if (!ev || ev.alpha == null || ev.beta == null || ev.gamma == null || !Number.isFinite(ev.alpha) || !Number.isFinite(ev.beta) || !Number.isFinite(ev.gamma)) {
    return prev || empty;
  }
  const c = compassAlpha(ev);
  const out = {
    alpha: ev.alpha, beta: ev.beta, gamma: ev.gamma, screen: screenDeg,
    compassAlpha: prev && prev.compassAlpha != null ? prev.compassAlpha : null,
    mode: (prev && prev.mode) || "relative",
    note: (prev && prev.note) || "",
  };
  if (c.mode === "compass") {
    out.mode = "compass";
    out.note = "";
    out.compassAlpha = c.alpha;
  } else if (out.mode !== "compass") {
    out.mode = "relative";
    out.note = "Sky is not aligned to north. Drag to adjust.";
    out.compassAlpha = null;
  }
  return out;
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
  const th = Math.acos(Math.min(1, dot)), st = Math.sin(th), sA = Math.sin((1 - t) * th) / st, sB = Math.sin(t * th) / st;
  return { x: a.x * sA + bx * sB, y: a.y * sA + by * sB, z: a.z * sA + bz * sB, w: a.w * sA + bw * sB };
}

/** Angle in radians between two quaternions (0..PI). */
export function quatAngle(a, b) {
  let dot = a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w;
  if (dot < 0) dot = -dot;
  return 2 * Math.acos(Math.min(1, Math.max(-1, dot)));
}

/** 1-euro smoothing factor for a cutoff in Hz and a timestep in seconds. */
export function oneEuroAlpha(dt, cutoff) {
  const te = 1 / (2 * Math.PI * Math.max(1e-6, cutoff));
  return 1 / (1 + te / Math.max(1e-6, dt));
}

/** Angle in degrees between two look directions (unit vectors). */
export function dirAngleDeg(a, b) {
  const d = Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
  return Math.acos(d) * R2D;
}

/** True if we should offer the Look around button. Hidden when there is no orientation API or no reason to think sensors exist. */
export function offerLookAround({ hasDeviceOrientation, hasRequestPermission, touchPoints = 0, pointerCoarse = false } = {}) {
  // requestPermission exists on some desktop Chromes that have no sensors; only offer the button
  // on a touch/coarse device (phones and tablets), or iOS where the permission API is paired with touch.
  if (!hasDeviceOrientation) return false;
  return touchPoints > 0 || pointerCoarse;
}

/**
 * Adaptive orientation filter. push() only stashes the latest sample; tick(dt) must run once
 * per animation frame. compassAlphaDeg, when set, is leaked in as a slow world-Y yaw offset
 * and is not used as the per-frame attitude alpha.
 * The first argument may be a number (the old blend k); it is ignored.
 */
export function createOrientationFilter(optsOrK = {}) {
  const opts = typeof optsOrK === "number" ? {} : (optsOrK || {});
  const minCutoff = opts.minCutoff ?? 0.7;     // Hz when still
  const beta = opts.beta ?? 0.7;              // raises cutoff with angular speed (rad/s)
  const dCutoff = opts.dCutoff ?? 1.0;         // Hz for the speed estimate
  const compassCutoff = opts.compassCutoff ?? 0.12; // Hz: compass yaw only, much slower than the pose
  let raw = null, q = null, speed = 0, yawOff = 0, hasYaw = false;
  function targetOf(s) {
    let t = deviceQuaternion(s.alphaDeg, s.betaDeg, s.gammaDeg, s.screenDeg);
    if (s.compassAlphaDeg != null && Number.isFinite(s.compassAlphaDeg)) {
      // Complementary: gyro delta stays on the device quat; compass is a slow offset on world Y.
      let want = (((s.compassAlphaDeg - s.alphaDeg + 540) % 360) - 180) * D2R;
      if (!hasYaw) { yawOff = want; hasYaw = true; }
      t = quatMul(quatFromAxisAngle(0, 1, 0, yawOff), t);
    }
    return t;
  }
  return {
    get quaternion() { return q; },
    get ready() { return q != null; },
    get yawOffset() { return yawOff; },
    reset() { raw = q = null; speed = 0; yawOff = 0; hasYaw = false; },
    push(alphaDeg, betaDeg, gammaDeg, screenDeg = 0, compassAlphaDeg = null) {
      raw = { alphaDeg, betaDeg, gammaDeg, screenDeg, compassAlphaDeg };
    },
    tick(dt) {
      if (!raw) return q;
      dt = Math.max(1e-4, Math.min(0.1, dt || 1 / 60));
      if (raw.compassAlphaDeg != null && Number.isFinite(raw.compassAlphaDeg)) {
        let want = (((raw.compassAlphaDeg - raw.alphaDeg + 540) % 360) - 180) * D2R;
        if (!hasYaw) { yawOff = want; hasYaw = true; }
        else {
          let err = Math.atan2(Math.sin(want - yawOff), Math.cos(want - yawOff));
          yawOff += err * oneEuroAlpha(dt, compassCutoff);
        }
      }
      const target = targetOf(raw);
      if (!q) { q = target; speed = 0; return q; }
      const ang = quatAngle(q, target);
      const aD = oneEuroAlpha(dt, dCutoff);
      speed += (ang / dt - speed) * aD;
      q = slerpQuat(q, target, oneEuroAlpha(dt, minCutoff + beta * Math.abs(speed)));
      return q;
    },
  };
}

export function screenAngleDeg() {
  if (typeof screen !== "undefined" && screen.orientation && Number.isFinite(screen.orientation.angle)) return screen.orientation.angle;
  if (typeof window !== "undefined" && Number.isFinite(window.orientation)) return window.orientation;
  return 0;
}

/** WebXR environmentBlendMode: only alpha-blend and additive actually show the room. */
export function isPassthroughBlend(mode) {
  return mode === "alpha-blend" || mode === "additive";
}
/** Which WebXR session mode to request. VR is the default when both are available and the toggle is off. */
export function preferredXrMode(seeRoom, vrSupported, arSupported) {
  if (seeRoom && arSupported) return "immersive-ar";
  if (vrSupported) return "immersive-vr";
  if (arSupported) return "immersive-ar";
  return null;
}
