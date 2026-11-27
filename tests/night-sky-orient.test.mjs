// Look-around orientation: compass vs relative, smoothing, and the magic-window quaternion.
import test from "node:test";
import assert from "node:assert/strict";
import { worldToAltAz } from "../public/night-sky/ns-astro.js";
import {
  deviceQuaternion, lookDir, compassAlpha, lerpAngle, lerpSigned, slerpQuat,
  offerLookAround, createOrientationFilter, mergeOrientationSample,
  quatAngle, dirAngleDeg, oneEuroAlpha, isPassthroughBlend, preferredXrMode,
} from "../public/night-sky/ns-orient.js";
import { lineWidthPx, starMinPx, passthroughArtAlpha } from "../public/night-sky/ns-lines.js";

const near = (a, b, eps = 3) => assert.ok(Math.abs(a - b) < eps, `${a} !≈ ${b} ±${eps}`);

// The pre-fix filter: Euler lerp, then a second slerp, applied per event, with compass
// heading used as the attitude alpha. Kept here so the jitter/lag tests can print before/after.
function createLegacyFilter(k = 0.32) {
  let a = null, b = null, g = null, q = null;
  return {
    get quaternion() { return q; },
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

function mulberry32(seed) {
  let t = seed >>> 0;
  return () => { t += 0x6D2B79F5; let r = Math.imul(t ^ (t >>> 15), 1 | t); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; };
}
function gauss(rng) { // Box-Muller
  const u = Math.max(1e-12, rng()), v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** High-frequency still jitter: RMS look-direction change per frame (deg), after warmup.
 *  This is the shake you see; a slow compass leak would inflate RMS-from-the-mean. */
function stillJitter(run, { frames = 180, warmup = 60 } = {}) {
  let prev = null, acc = 0, n = 0;
  for (let i = 0; i < warmup + frames; i++) {
    const d = lookDir(run(i));
    if (i >= warmup && prev) { acc += dirAngleDeg(prev, d) ** 2; n++; }
    prev = d;
  }
  return Math.sqrt(acc / Math.max(1, n));
}

/** Frames (at 60 Hz) to reach 63% of a yaw step, after a still hold. */
function stepLagFrames(make, stepFrom, stepTo) {
  const dt = 1 / 60;
  const f = make();
  for (let i = 0; i < 45; i++) {
    f.push(stepFrom.a, stepFrom.b, stepFrom.g, 0, stepFrom.c);
    if (f.tick) f.tick(dt);
  }
  const q0 = f.quaternion;
  const target = deviceQuaternion(stepTo.a, stepTo.b, stepTo.g, 0);
  // If a compass offset is in play, compare against the post-step target the filter itself seeks
  // by running a long settle in a clone — we measure against the true device quat of stepTo
  // plus the same compass used at the step.
  const want = stepTo.c != null
    ? (function () {
      const off = (((stepTo.c - stepTo.a + 540) % 360) - 180) * Math.PI / 180;
      // After a long settle the yaw offset equals compass-alpha, so the look matches compass-aligned Euler.
      return deviceQuaternion(stepTo.c, stepTo.b, stepTo.g, 0);
    })()
    : target;
  const start = lookDir(q0), end = lookDir(want);
  const total = Math.max(1e-6, dirAngleDeg(start, end));
  for (let i = 0; i < 180; i++) {
    f.push(stepTo.a, stepTo.b, stepTo.g, 0, stepTo.c);
    if (f.tick) f.tick(dt);
    const moved = dirAngleDeg(start, lookDir(f.quaternion));
    if (moved >= 0.63 * total) return i + 1;
  }
  return 180;
}

test("upright phone facing north looks at the northern horizon", () => {
  // beta=90: upright; alpha=0: top of the device points north (W3C absolute).
  const d = lookDir(deviceQuaternion(0, 90, 0, 0));
  const a = worldToAltAz(d);
  near(a.alt, 0, 4);
  near(Math.min(a.az, 360 - a.az), 0, 4);
});

test("upright phone facing south looks south", () => {
  const d = lookDir(deviceQuaternion(180, 90, 0, 0));
  const a = worldToAltAz(d);
  near(a.alt, 0, 4);
  near(a.az, 180, 4);
});

test("phone lying flat (screen up) looks at the nadir; face-down looks at the zenith; tilting back looks up", () => {
  // Magic window looks out the back of the phone: screen-up points the back at the ground.
  const flat = worldToAltAz(lookDir(deviceQuaternion(0, 0, 0, 0)));
  assert.ok(flat.alt < -80, `flat alt ${flat.alt}`);
  const zen = worldToAltAz(lookDir(deviceQuaternion(0, 180, 0, 0)));
  assert.ok(zen.alt > 80, `face-down alt ${zen.alt}`);
  const up = worldToAltAz(lookDir(deviceQuaternion(0, 135, 0, 0)));
  near(up.alt, 45, 4);
  near(Math.min(up.az, 360 - up.az), 0, 4);
});

test("compassAlpha: iOS heading, absolute alpha, and relative fallback", () => {
  const ios = compassAlpha({ webkitCompassHeading: 90, alpha: 12, absolute: false });
  assert.equal(ios.mode, "compass");
  near(ios.alpha, 270, 0.01);
  const abs = compassAlpha({ alpha: 45, absolute: true });
  assert.equal(abs.mode, "compass");
  assert.equal(abs.alpha, 45);
  const rel = compassAlpha({ alpha: 10, absolute: false });
  assert.equal(rel.mode, "relative");
  assert.equal(rel.alpha, 10);
  const empty = compassAlpha({ alpha: null });
  assert.equal(empty.mode, "relative");
  assert.equal(empty.alpha, null);
});

test("mergeOrientationSample keeps gyro alpha and stores compass heading separately", () => {
  const ios = mergeOrientationSample(null, { alpha: 12, beta: 90, gamma: 0, webkitCompassHeading: 90 }, 0);
  assert.equal(ios.mode, "compass");
  assert.equal(ios.alpha, 12);
  near(ios.compassAlpha, 270, 0.01);
  const relAfter = mergeOrientationSample(ios, { alpha: 18, beta: 91, gamma: 1, absolute: false }, 0);
  assert.equal(relAfter.mode, "compass");
  assert.equal(relAfter.alpha, 18);
  near(relAfter.compassAlpha, 270, 0.01);
  const onlyAbs = mergeOrientationSample(null, { alpha: 180, beta: 90, gamma: 0, absolute: true }, 0);
  assert.equal(onlyAbs.mode, "compass");
  assert.equal(onlyAbs.alpha, 180);
  assert.equal(onlyAbs.compassAlpha, 180);
  const onlyRel = mergeOrientationSample(null, { alpha: 10, beta: 90, gamma: 0, absolute: false }, 0);
  assert.equal(onlyRel.mode, "relative");
  assert.equal(onlyRel.compassAlpha, null);
  assert.match(onlyRel.note, /not aligned to north/);
});

test("lerpAngle takes the short wrap from 350 to 10", () => {
  near(lerpAngle(350, 10, 0.5), 0, 0.01);
  near(lerpSigned(-170, 170, 0.5), -180, 0.01);
});

test("slerpQuat of a quaternion with itself is itself; halfway is unit", () => {
  const a = { x: 0, y: 0, z: 0, w: 1 }, b = deviceQuaternion(90, 90, 0, 0);
  const s = slerpQuat(a, a, 0.4);
  near(s.x, 0, 1e-9); near(s.w, 1, 1e-9);
  const m = slerpQuat(a, b, 0.5);
  near(Math.hypot(m.x, m.y, m.z, m.w), 1, 1e-9);
  near(quatAngle(a, a), 0, 1e-9);
});

test("offerLookAround is hidden without the API or without sensors, shown on iOS or touch", () => {
  assert.equal(offerLookAround({ hasDeviceOrientation: false, hasRequestPermission: false, touchPoints: 5 }), false);
  assert.equal(offerLookAround({ hasDeviceOrientation: true, hasRequestPermission: false, touchPoints: 0, pointerCoarse: false }), false);
  assert.equal(offerLookAround({ hasDeviceOrientation: true, hasRequestPermission: true, touchPoints: 0 }), false);
  assert.equal(offerLookAround({ hasDeviceOrientation: true, hasRequestPermission: false, touchPoints: 2 }), true);
  assert.equal(offerLookAround({ hasDeviceOrientation: true, hasRequestPermission: false, pointerCoarse: true }), true);
});

test("the orientation filter smooths a jump and does not wrap-glitch across 359 to 1", () => {
  const f = createOrientationFilter();
  let q;
  for (let i = 0; i < 8; i++) { f.push(359, 90, 0, 0); q = f.tick(1 / 60); }
  const first = worldToAltAz(lookDir(q));
  for (let i = 0; i < 4; i++) { f.push(1, 90, 0, 0); q = f.tick(1 / 60); }
  const mid = worldToAltAz(lookDir(q));
  let daz = Math.abs(mid.az - first.az); if (daz > 180) daz = 360 - daz;
  assert.ok(daz < 8, `wrap jump was ${daz} deg`);
  assert.ok(f.ready);
  f.reset();
  assert.equal(f.ready, false);
});

test("one-euro alpha grows with cutoff and shrinks as dt falls", () => {
  assert.ok(oneEuroAlpha(1 / 60, 1.2) < oneEuroAlpha(1 / 60, 6));
  assert.ok(oneEuroAlpha(1 / 120, 1.2) < oneEuroAlpha(1 / 60, 1.2));
});

test("noisy still pose: new filter cuts jitter vs the legacy Euler+compass-every-frame path", () => {
  const rng = mulberry32(20261127);
  const trueA = 180, trueB = 90, trueG = 0, trueHeading = 180; // heading 180 => compass alpha 180
  const gyroSigma = 0.35;     // degrees, typical raw gyro/AHRS noise
  const compassSigma = 2.4;   // degrees, iOS webkitCompassHeading is jumpier
  function sample(i) {
    // Compass updates ~15 Hz, gyro every 60 Hz frame; two events can arrive in one frame.
    const a = trueA + gauss(rng) * gyroSigma;
    const b = trueB + gauss(rng) * gyroSigma;
    const g = trueG + gauss(rng) * gyroSigma;
    const heading = (i % 4 === 0) ? trueHeading + gauss(rng) * compassSigma : trueHeading + gauss(rng) * compassSigma * 0.3;
    const compassA = (360 - heading) % 360;
    return { a, b, g, compassA };
  }
  const legacy = createLegacyFilter(0.32);
  const jLegacy = stillJitter((i) => {
    // Old path: replace attitude alpha with the noisy compass heading every event, twice per frame.
    const s = sample(i);
    legacy.push(s.compassA, s.b, s.g, 0);
    legacy.push(s.compassA, s.b + gauss(rng) * gyroSigma * 0.5, s.g, 0);
    return legacy.quaternion;
  });
  const neu = createOrientationFilter();
  const jNew = stillJitter((i) => {
    const s = sample(i);
    // New path: stash (possibly twice), tick once per frame; compass is the slow offset.
    neu.push(s.a, s.b, s.g, 0, s.compassA);
    const s2 = sample(i);
    neu.push(s2.a, s2.b, s2.g, 0, s2.compassA);
    return neu.tick(1 / 60);
  });
  console.log(`JITTER_STILL_HF legacy=${jLegacy.toFixed(3)} deg/frame (${(jLegacy * 60).toFixed(1)} deg/s)  new=${jNew.toFixed(3)} deg/frame (${(jNew * 60).toFixed(1)} deg/s)`);
  assert.ok(jNew < 0.15, `new still jitter ${jNew.toFixed(3)} deg/frame should be under 0.15`);
  assert.ok(jNew < jLegacy * 0.25, `new jitter ${jNew.toFixed(3)} should be well below legacy ${jLegacy.toFixed(3)}`);
});

test("a 30 degree yaw step stays responsive (lag under 200 ms) and faster motion is not stuck", () => {
  const from = { a: 180, b: 90, g: 0, c: null };
  const to = { a: 210, b: 90, g: 0, c: null };
  const lagLegacy = stepLagFrames(() => createLegacyFilter(0.32), from, to);
  const lagNew = stepLagFrames(() => createOrientationFilter(), from, to);
  console.log(`LAG_STEP_30DEG legacy=${lagLegacy} frames (${(lagLegacy / 60 * 1000).toFixed(0)} ms)  new=${lagNew} frames (${(lagNew / 60 * 1000).toFixed(0)} ms)`);
  assert.ok(lagNew <= 12, `new lag ${lagNew} frames should be <= 12 (200 ms)`);
  // Adaptive cutoff should not be much slower than the old fixed k on a clean step.
  assert.ok(lagNew <= lagLegacy + 6, `new lag ${lagNew} should stay in the same range as legacy ${lagLegacy}`);
});

test("compass heading is corrected slowly and does not inject a 15 deg hop into a still pose", () => {
  const f = createOrientationFilter();
  const dt = 1 / 60;
  for (let i = 0; i < 60; i++) { f.push(10, 90, 0, 0, 10); f.tick(dt); } // already aligned
  const before = worldToAltAz(lookDir(f.quaternion));
  // A sudden 15 deg compass jump (typical heading glitch) with a still gyro.
  for (let i = 0; i < 6; i++) { f.push(10, 90, 0, 0, 25); f.tick(dt); }
  const mid = worldToAltAz(lookDir(f.quaternion));
  let daz = Math.abs(mid.az - before.az); if (daz > 180) daz = 360 - daz;
  assert.ok(daz < 3, `compass hop moved the view ${daz.toFixed(2)} deg in 100 ms; should leak slowly`);
  // After a couple of seconds it should have taken most of the correction.
  for (let i = 0; i < 180; i++) { f.push(10, 90, 0, 0, 25); f.tick(dt); }
  const later = worldToAltAz(lookDir(f.quaternion));
  let d2 = Math.abs(later.az - before.az); if (d2 > 180) d2 = 360 - d2;
  assert.ok(d2 > 8, `after 3 s the compass offset should have moved the view, got ${d2.toFixed(2)} deg`);
});

test("preferredXrMode defaults to VR; See my room selects AR when it is supported", () => {
  assert.equal(preferredXrMode(false, true, true), "immersive-vr");
  assert.equal(preferredXrMode(true, true, true), "immersive-ar");
  assert.equal(preferredXrMode(false, false, true), "immersive-ar");
  assert.equal(preferredXrMode(true, false, true), "immersive-ar");
  assert.equal(preferredXrMode(true, true, false), "immersive-vr");
  assert.equal(preferredXrMode(false, false, false), null);
  assert.equal(isPassthroughBlend("opaque"), false);
  assert.equal(isPassthroughBlend("alpha-blend"), true);
  assert.equal(isPassthroughBlend("additive"), true);
  assert.equal(isPassthroughBlend(undefined), false);
});

test("lines and stars are a little thicker in XR, and thicker still in passthrough", () => {
  assert.ok(lineWidthPx({ xr: false }) > 1);
  assert.ok(lineWidthPx({ xr: true }) > lineWidthPx({ xr: false }));
  assert.ok(lineWidthPx({ xr: true, passthrough: true }) > lineWidthPx({ xr: true }));
  assert.ok(starMinPx({ xr: true }) > starMinPx({ xr: false }));
  assert.ok(starMinPx({ xr: true, passthrough: true }) > starMinPx({ xr: true }));
  assert.ok(passthroughArtAlpha(0.40) > 0.40 && passthroughArtAlpha(0.40) <= 1);
  assert.equal(passthroughArtAlpha(0.9), 1);
});
