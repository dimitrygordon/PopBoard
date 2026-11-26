// Look-around orientation: compass vs relative, smoothing, and the magic-window quaternion.
import test from "node:test";
import assert from "node:assert/strict";
import { worldToAltAz } from "../public/night-sky/ns-astro.js";
import {
  deviceQuaternion, lookDir, compassAlpha, lerpAngle, lerpSigned, slerpQuat,
  offerLookAround, createOrientationFilter,
} from "../public/night-sky/ns-orient.js";

const near = (a, b, eps = 3) => assert.ok(Math.abs(a - b) < eps, `${a} !≈ ${b} ±${eps}`);

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
});

test("offerLookAround is hidden without the API or without sensors, shown on iOS or touch", () => {
  assert.equal(offerLookAround({ hasDeviceOrientation: false, hasRequestPermission: false, touchPoints: 5 }), false);
  assert.equal(offerLookAround({ hasDeviceOrientation: true, hasRequestPermission: false, touchPoints: 0, pointerCoarse: false }), false);
  assert.equal(offerLookAround({ hasDeviceOrientation: true, hasRequestPermission: true, touchPoints: 0 }), false);
  assert.equal(offerLookAround({ hasDeviceOrientation: true, hasRequestPermission: false, touchPoints: 2 }), true);
  assert.equal(offerLookAround({ hasDeviceOrientation: true, hasRequestPermission: false, pointerCoarse: true }), true);
});

test("the orientation filter smooths a jump and does not wrap-glitch across 359 to 1", () => {
  const f = createOrientationFilter(0.4);
  let q;
  for (let i = 0; i < 8; i++) q = f.push(359, 90, 0, 0);
  const first = worldToAltAz(lookDir(q));
  for (let i = 0; i < 4; i++) q = f.push(1, 90, 0, 0);
  const mid = worldToAltAz(lookDir(q));
  let daz = Math.abs(mid.az - first.az); if (daz > 180) daz = 360 - daz;
  assert.ok(daz < 8, `wrap jump was ${daz} deg`);
  assert.ok(f.ready);
  f.reset();
  assert.equal(f.ready, false);
});
