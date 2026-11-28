// Gravity Force Lab VR: headset panel grab, world-lock and hit-testing, without a headset.
import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "../public/vendor/three/three.module.min.js";
import { readFileSync } from "node:fs";
import { XRPanel, XRP, PANEL_SPAWN, panelInputAt, panelPoseReady, readPads } from "../public/gravity-force/gf-xr.js";

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

function headQuat(yaw = 0) {
  return new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0, "YXZ"));
}

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

function panelCorners(panel) {
  const hw = XRP.M / 2, hh = HM / 2;
  const pts = [[-hw, -hh, 0], [hw, -hh, 0], [-hw, hh, 0], [hw, hh, 0]];
  panel.mesh.updateMatrixWorld();
  return pts.map(([x, y, z]) => panel.mesh.localToWorld(new THREE.Vector3(x, y, z)));
}

test("hit-test follows the moved panel, and a drag of the handle does not click", () => {
  const panel = makePanel();
  const head = new THREE.Vector3(0, 1.6, 0);
  panel.spawnInView(head, headQuat(0));

  const tab = panel.hits[0];
  const before = aimAt(chipWorld(panel, tab), head);
  const first = panelInputAt(panel, before.origin, before.dir, null, "select");
  assert.equal(first.click, "tab:pull", "default pose: trigger on a tab clicks it");
  assert.equal(first.grab, undefined);

  const handleAim = aimAt(handleWorld(panel), head);
  const grab = panelInputAt(panel, handleAim.origin, handleAim.dir, null, "select");
  assert.equal(grab.grab, true, "trigger or pinch on the handle starts a grab");
  assert.equal(grab.click, undefined, "grabbing the handle does not click a button");

  const gripNear = handleWorld(panel);
  const nearButClick = panelInputAt(panel, before.origin, before.dir, gripNear, "select");
  assert.equal(nearButClick.click, "tab:pull");
  assert.equal(nearButClick.grab, undefined, "being near the handle does not steal a select on a chip");

  const gripGrab = panelInputAt(panel, before.origin, before.dir, gripNear, "grip");
  assert.equal(gripGrab.grab, true, "a grip squeeze near the handle grabs");

  const ctrl = new THREE.Group();
  ctrl.position.copy(handleWorld(panel));
  ctrl.lookAt(head);
  ctrl.updateMatrixWorld();
  panel.beginGrab(ctrl);
  ctrl.position.set(0.9, 0.45, -0.7);
  ctrl.updateMatrixWorld();
  panel.followGrab(ctrl);
  panel.pinInWorld(head);

  assert.equal(panel.userMoved, true);
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

  const tip = chipWorld(panel, panel.hits[1]);
  assert.equal(panel.poke(tip), "help:1");
  assert.equal(panel.poke(handleWorld(panel)), null, "a poke on the handle is not a button click");
});

test("the panel's world position does not change when the camera or head pose moves", () => {
  const panel = makePanel();
  const head = new THREE.Vector3(0.2, 1.62, 0.1);
  panel.spawnInView(head, headQuat(0.3));
  const pos = panel.mesh.position.clone();
  const quat = panel.mesh.quaternion.clone();

  const turned = new THREE.Vector3(0.6, 1.7, -0.4);
  // A world-locked frame does not call spawn or place when the student looks around.
  panel.mesh.updateMatrixWorld();
  assert.ok(panel.mesh.position.distanceTo(pos) < 1e-9, "looking around does not move a world-locked panel");
  assert.ok(panel.mesh.quaternion.angleTo(quat) < 1e-9, "looking around does not rotate a world-locked panel");

  panel.pinInWorld(turned);
  assert.ok(panel.mesh.position.distanceTo(pos) < 1e-9, "facing the student on pin does not change world position");
  assert.ok(faceDot(panel, turned) > 0.92);

  const main = readFileSync(new URL("../public/gravity-force/gf-main.js", import.meta.url), "utf8");
  assert.doesNotMatch(main, /if \(!panelGrab\) panel\.(place|spawn)/);
  assert.match(main, /World-locked/);
  assert.doesNotMatch(main, /camera\.add\(panel/);
  assert.match(main, /scene\.add\(panel\.mesh\)/);
});

test("the panel spawns inside the view frustum, in front and fully readable", () => {
  const panel = makePanel();
  const head = new THREE.Vector3(0.15, 1.58, -0.2);
  const yaw = 0.4;
  const hq = headQuat(yaw);
  panel.spawnInView(head, hq);

  const rel = panel.mesh.position.clone().sub(head);
  const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(hq); fwd.y = 0; fwd.normalize();
  const dist = new THREE.Vector3(rel.x, 0, rel.z).length();
  assert.ok(dist >= 0.9 && dist <= 1.1, `spawn distance ${dist}`);
  assert.ok(rel.dot(fwd) > 0.8, "spawn is in front of the head yaw, not off to the side");
  assert.ok(Math.abs(rel.dot(new THREE.Vector3(fwd.z, 0, -fwd.x))) < 0.08, "no side offset");
  assert.ok(Math.abs((head.y - panel.mesh.position.y) - PANEL_SPAWN.below) < 1e-9, "slightly below eye level");
  assert.ok(faceDot(panel, head) > 0.92, "faces the student");
  assert.equal(panel.userMoved, false);

  // A conservative single-eye frustum, tighter than a Quest 3, so "fully in view" has margin.
  const cam = new THREE.PerspectiveCamera(72, 0.9, 0.05, 20);
  cam.position.copy(head); cam.quaternion.copy(hq); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
  const frustum = new THREE.Frustum();
  frustum.setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
  for (const p of panelCorners(panel)) {
    assert.ok(frustum.containsPoint(p), `corner ${p.x.toFixed(3)},${p.y.toFixed(3)},${p.z.toFixed(3)} is in view`);
  }

  assert.equal(panelPoseReady(new THREE.Vector3(0, 0, 0), 3), false, "too early, origin pose");
  assert.equal(panelPoseReady(new THREE.Vector3(0, 0, 0), 10), false, "origin is not a settled viewer pose");
  assert.equal(panelPoseReady(head, 3), false, "wait for the first frames");
  assert.equal(panelPoseReady(head, PANEL_SPAWN.waitFrames), true);
});

test("left thumbstick press brings the panel here", () => {
  const btn = (on) => ({ pressed: !!on });
  const pad = (hand, buttons, axes = [0, 0, 0, 0]) => ({ handedness: hand, gamepad: { buttons: buttons.map(btn), axes } });
  const prev = {};
  let ev = readPads([pad("left", [0, 0, 0, 1, 0])], prev);
  assert.equal(ev.bringPanel, true);
  ev = readPads([pad("left", [0, 0, 0, 1, 0])], prev);
  assert.equal(ev.bringPanel, false, "one bring-panel event per press");
  ev = readPads([pad("right", [0, 0, 0, 1, 0])], prev);
  assert.equal(ev.bringPanel, false);
  assert.equal(ev.nextScene, true);
});
