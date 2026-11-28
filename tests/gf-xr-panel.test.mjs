// Gravity Force Lab VR: headset panel grab and hit-testing, without a headset.
// A mocked session (controller and hand poses, no IWER) moves the panel and then clicks chips on it.
import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "../public/vendor/three/three.module.min.js";
import { XRPanel, XRP, panelInputAt } from "../public/gravity-force/gf-xr.js";

function stubCanvas() {
  if (globalThis.document) return;
  const ctx = {
    fillStyle: "", strokeStyle: "", lineWidth: 1, font: "", textAlign: "left", textBaseline: "alphabetic", globalAlpha: 1,
    clearRect() {}, fillRect() {}, fill() {}, stroke() {}, beginPath() {}, closePath() {},
    rect() {}, roundRect() {}, fillText() {}, moveTo() {}, lineTo() {},
    measureText: (t) => ({ width: String(t).length * 20 }),
    createLinearGradient: () => ({ addColorStop() {} }),
  };
  globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ctx }) };
}

const HM = XRP.M * XRP.H / XRP.W;

function makePanel() {
  stubCanvas();
  const panel = new XRPanel(THREE);
  panel.mesh.visible = true;
  panel.hits = [
    { id: "tab:pull", x: 32, y: 24, w: 130, h: 64 },
    { id: "help:1", x: 120, y: 1444, w: 200, h: 62 },
    { id: "world:moon", x: 40, y: 1200, w: 160, h: 56 },
  ];
  return panel;
}

/** World point on the panel face for a canvas-pixel centre of a hit rect. */
function chipWorld(panel, hit) {
  const cx = (hit.x + hit.w / 2) / XRP.W, cy = (hit.y + hit.h / 2) / XRP.H;
  const local = new THREE.Vector3((cx - 0.5) * XRP.M, (0.5 - cy) * HM, 0.002);
  panel.mesh.updateMatrixWorld();
  return panel.mesh.localToWorld(local);
}

function handleWorld(panel) {
  panel.mesh.updateMatrixWorld();
  return panel.handle.getWorldPosition(new THREE.Vector3());
}

/** Ray from a point in front of a world target, aimed at it. */
function aimAt(target, from = null) {
  const origin = from ? from.clone() : target.clone().add(new THREE.Vector3(0, 0, 0.4));
  const dir = target.clone().sub(origin).normalize();
  return { origin, dir };
}

function faceDot(panel, head) {
  panel.mesh.updateMatrixWorld();
  const z = new THREE.Vector3(0, 0, 1).transformDirection(panel.mesh.matrixWorld);
  return z.dot(head.clone().sub(panel.mesh.position).normalize());
}

test("hit-test follows the moved panel, and a drag of the handle does not click", () => {
  const panel = makePanel();
  const head = new THREE.Vector3(0, 1.6, 0);
  panel.place(head, 0);

  const tab = panel.hits[0];
  const before = aimAt(chipWorld(panel, tab), head);
  const first = panelInputAt(panel, before.origin, before.dir, null, "select");
  assert.equal(first.click, "tab:pull", "default pose: trigger on a tab clicks it");
  assert.equal(first.grab, undefined);

  const handleAim = aimAt(handleWorld(panel), head);
  const grab = panelInputAt(panel, handleAim.origin, handleAim.dir, null, "select");
  assert.equal(grab.grab, true, "trigger or pinch on the handle starts a grab");
  assert.equal(grab.click, undefined, "grabbing the handle does not click a button");

  // A controller sitting near the handle, but aiming at a tab, must still click (not grab).
  const gripNear = handleWorld(panel);
  const nearButClick = panelInputAt(panel, before.origin, before.dir, gripNear, "select");
  assert.equal(nearButClick.click, "tab:pull");
  assert.equal(nearButClick.grab, undefined, "being near the handle does not steal a select on a chip");

  const gripGrab = panelInputAt(panel, before.origin, before.dir, gripNear, "grip");
  assert.equal(gripGrab.grab, true, "a grip squeeze near the handle grabs");

  // Mocked XR session: grab the handle, move the panel low and to the right, out of the way.
  const ctrl = new THREE.Group();
  ctrl.position.copy(handleWorld(panel));
  ctrl.lookAt(head);
  ctrl.updateMatrixWorld();
  panel.beginGrab(ctrl);
  ctrl.position.set(0.9, 0.45, -0.7);
  ctrl.updateMatrixWorld();
  panel.followGrab(ctrl);
  panel.captureOffset(head, 0);
  panel.place(head, 0);

  assert.ok(panel.mesh.position.x > 0.4, "panel can sit off to the side");
  assert.ok(panel.mesh.position.y < 1.0, "panel can sit low");
  assert.ok(faceDot(panel, head) > 0.92, "after a move the panel faces the student");

  const oldRay = panelInputAt(panel, before.origin, before.dir, null, "select");
  assert.equal(oldRay.click, undefined, "the old ray no longer hits the tab");
  assert.ok(!oldRay.grab);

  const movedTab = aimAt(chipWorld(panel, tab), head);
  const after = panelInputAt(panel, movedTab.origin, movedTab.dir, null, "select");
  assert.equal(after.click, "tab:pull", "hit-test follows the moved panel");

  const moon = panel.hits[2];
  const moonRay = aimAt(chipWorld(panel, moon), head);
  assert.equal(panelInputAt(panel, moonRay.origin, moonRay.dir, null, "select").click, "world:moon");

  const movedHandle = aimAt(handleWorld(panel), head);
  const stillGrab = panelInputAt(panel, movedHandle.origin, movedHandle.dir, null, "select");
  assert.equal(stillGrab.grab, true);
  assert.equal(stillGrab.click, undefined, "after the move, a handle drag still does not click");

  // Fingertip poke on a chip of the moved panel, and a poke on the handle does not click.
  const tip = chipWorld(panel, panel.hits[1]);
  assert.equal(panel.poke(tip), "help:1");
  assert.equal(panel.poke(handleWorld(panel)), null, "a poke on the handle is not a button click");
});

test("a mocked XR session can park the panel fully out of the way and keep chips clickable", () => {
  const panel = makePanel();
  const head = new THREE.Vector3(0, 1.6, 0);
  panel.resetOffset();
  panel.place(head, 0);
  const start = panel.mesh.position.clone();

  // Squeeze-grip path: near the handle, no precise aim required.
  const gripPt = handleWorld(panel);
  const ev = panelInputAt(panel, null, null, gripPt, "grip");
  assert.equal(ev.grab, true);

  const ctrl = new THREE.Object3D();
  ctrl.position.copy(gripPt);
  ctrl.updateMatrixWorld();
  panel.beginGrab(ctrl);
  // Park it far left, low, and closer to the student than the default 1.2 m.
  ctrl.position.set(-1.4, 0.35, -0.4);
  ctrl.updateMatrixWorld();
  panel.followGrab(ctrl);
  panel.captureOffset(head, 0);
  panel.place(head, 0);

  const parked = panel.mesh.position;
  assert.ok(parked.distanceTo(start) > 0.8, "the parked pose is well away from the default slot");
  assert.ok(parked.x < -0.8 && parked.y < 0.9);
  assert.ok(faceDot(panel, head) > 0.92);

  const help = aimAt(chipWorld(panel, panel.hits[1]), head);
  assert.equal(panelInputAt(panel, help.origin, help.dir, null, "select").click, "help:1");
});
