// XRInput is shared by Night Sky VR and Newton's Mountain VR. Night Sky must behave exactly as before (defaults), and
// Newton's Mountain turns the time scrub off and listens to buttons, axes and squeeze. Plus the pick helpers.
import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "../public/vendor/three/three.module.min.js";
import { XRInput } from "../public/night-sky/ns-input.js";
import { pickNearest, angleDeg, rayPointDistance } from "../public/newtons-mountain/nm-pick.js";

function rig(cb, opts) {
  const make = () => new THREE.Group();
  const ctrls = [make(), make()], grips = [make(), make()], hands = [make(), make()];
  const renderer = { xr: { getController: (i) => ctrls[i], getControllerGrip: (i) => grips[i], getHand: (i) => hands[i] } };
  const scene = new THREE.Scene();
  const input = opts === undefined ? new XRInput(THREE, renderer, scene, cb) : new XRInput(THREE, renderer, scene, cb, opts);
  const gp = { axes: [0, 0, 0, 0], buttons: Array.from({ length: 6 }, () => ({ pressed: false })) };
  ctrls[0].dispatchEvent({ type: "connected", data: { gamepad: gp } });
  ctrls[0].updateMatrixWorld(true);
  return { input, ctrls, gp };
}
const base = () => ({ scrubs: 0, toggles: 0, onSelectStart() {}, onSelectEnd() {}, onHover() {}, onScrubHours() { this.scrubs++; }, onTogglePanel() { this.toggles++; } });

test("defaults: thumbstick scrubs time and B/Y toggles the panel, exactly as in Night Sky", () => {
  const cb = base(); const { input, gp } = rig(cb);
  assert.equal(input.scrub, true);
  gp.axes[2] = 0.8; input.update(0.1); assert.equal(cb.scrubs, 1, "thumbstick scrub on");
  gp.axes[2] = 0; gp.buttons[5].pressed = true; input.update(0.1); input.update(0.1); assert.equal(cb.toggles, 1, "B toggles once per press");
});
test("defaults: grip drag scrubs time", () => {
  const cb = base(); const { input, ctrls } = rig(cb);
  ctrls[0].dispatchEvent({ type: "squeezestart" });
  ctrls[0].rotation.y = 0.3; ctrls[0].updateMatrixWorld(true); input.update(0.1);
  assert.ok(cb.scrubs >= 1, "grip drag scrub on");
});
test("scrub:false turns both scrubs off; optional callbacks fire", () => {
  const cb = base(); const log = [];
  cb.onButton = (i, b, d) => log.push(["b", i, b, d]); cb.onAxes = (i, axes, dt) => log.push(["a", i, axes.length, dt]); cb.onSqueeze = (i, d) => log.push(["s", i, d]);
  const { input, ctrls, gp } = rig(cb, { scrub: false });
  assert.equal(input.scrub, false);
  gp.axes[2] = 1; ctrls[0].dispatchEvent({ type: "squeezestart" }); ctrls[0].rotation.y = 0.5; ctrls[0].updateMatrixWorld(true);
  gp.buttons[4].pressed = true; input.update(0.05); input.update(0.05); gp.buttons[4].pressed = false; input.update(0.05); ctrls[0].dispatchEvent({ type: "squeezeend" });
  assert.equal(cb.scrubs, 0, "no scrubbing");
  assert.deepEqual(log.filter((l) => l[0] === "b"), [["b", 0, 4, true], ["b", 0, 4, false]], "buttons are edge detected");
  assert.equal(log.filter((l) => l[0] === "a").length, 3, "axes every frame");
  assert.deepEqual(log.filter((l) => l[0] === "s"), [["s", 0, true], ["s", 0, false]]);
  gp.buttons[5].pressed = true; input.update(0.05); assert.equal(cb.toggles, 1, "B/Y still toggles the panel");
});
test("pick helpers", () => {
  const o = [0, 0, 0], d = [0, 0, -1];
  assert.equal(pickNearest([{ n: 1, p: [0.1, 0, -5] }, { n: 2, p: [0.01, 0, -5] }], o, d), 2);
  assert.equal(pickNearest([{ n: 1, p: [3, 0, -1] }], o, d), null);
  assert.ok(Math.abs(angleDeg(o, d, [1, 0, -1]) - 45) < 1e-9);
  assert.ok(Math.abs(rayPointDistance(o, d, [0.3, 0.4, -2]) - 0.5) < 1e-9);
});
