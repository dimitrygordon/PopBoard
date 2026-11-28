import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as THREE from "../public/vendor/three/three.module.min.js";

// CaptionPanel draws on a canvas; give it a recording 2D context so node can run it.
globalThis.document = {
  createElement: () => ({
    width: 0, height: 0,
    getContext: () => new Proxy({}, { get: (_, k) => (k === "measureText" ? () => ({ width: 10 }) : () => {}), set: () => true }),
  }),
};
const { CaptionPanel, buttonAt } = await import("../public/fourth-dimension/vr/vr4d-captions.js");

const { freshRay, resolveSelect } = await import("../public/fourth-dimension/vr/vr4d-input.js");

const BUTTONS = [{ id: "prev", label: "Back" }, { id: "next", label: "Next", gold: true }, { id: "recenter", label: "Recenter" }];
const W = 2048, H = 512;

function seatedPanel() {
  const panel = new CaptionPanel(THREE);
  panel.draw({ text: "One two three", word: -1, paper: false, scale: 1, buttons: BUTTONS });
  panel.place(new THREE.Vector3(0, 1.2, 0), 0);
  panel.mesh.updateMatrixWorld(true);
  return panel;
}
// World point at the centre of a button, so a test can aim straight at it.
function buttonWorld(panel, id) {
  const h = panel.hits.find((x) => x.id === id);
  const u = h.x + h.w / 2, v = h.y + h.h / 2;
  return panel.mesh.localToWorld(new THREE.Vector3((u / W - 0.5) * 1.6, (0.5 - v / H) * 0.4, 0));
}
// A Quest controller as three.js has it at select time: the pose sits in .matrix (set from the
// XR frame), but matrixWorld is rebuilt only during render, so it still holds last frame's value.
function staleController(scene, from, to) {
  const c = new THREE.Group();
  c.matrixAutoUpdate = false;
  scene.add(c);
  const m = new THREE.Matrix4().lookAt(from, to, new THREE.Vector3(0, 1, 0));
  m.setPosition(from);
  c.matrix.copy(m);
  return c; // matrixWorld is still identity
}

test("panel.hit accepts a three.js Ray ({origin, direction}); it used to throw on the missing .dir", () => {
  const panel = seatedPanel();
  const target = buttonWorld(panel, "next");
  const origin = new THREE.Vector3(0.1, 1.15, 0.2);
  const raycaster = new THREE.Raycaster(origin, target.clone().sub(origin).normalize());
  assert.equal(panel.hit(raycaster.ray), "next");
  assert.equal(panel.hit({ origin, dir: raycaster.ray.direction }), "next");
});

test("a controller whose matrixWorld is stale hits the panel only through freshRay", () => {
  const panel = seatedPanel();
  const scene = new THREE.Scene();
  const from = new THREE.Vector3(0.25, 1.05, 0.15);
  const c = staleController(scene, from, buttonWorld(panel, "next"));
  // The old path: read matrixWorld directly. It is still identity, so the ray starts at the origin.
  const stale = { origin: new THREE.Vector3().setFromMatrixPosition(c.matrixWorld), dir: new THREE.Vector3(0, 0, -1).transformDirection(c.matrixWorld) };
  assert.notEqual(panel.hit(stale), "next", "stale pose cannot press Next");
  const ray = freshRay(THREE, c);
  assert.ok(ray.origin.distanceTo(from) < 1e-6);
  assert.equal(panel.hit(ray), "next");
});

test("each button is reachable from a mocked pose, and a miss returns null", () => {
  const panel = seatedPanel();
  const scene = new THREE.Scene();
  for (const id of ["prev", "next", "recenter"]) {
    const c = staleController(scene, new THREE.Vector3(-0.2, 1.0, 0.3), buttonWorld(panel, id));
    assert.equal(panel.hit(freshRay(THREE, c)), id);
  }
  const away = staleController(scene, new THREE.Vector3(0, 1.2, 0), new THREE.Vector3(0, 1.2, 5));
  assert.equal(panel.hit(freshRay(THREE, away)), null, "pointing behind the viewer");
  const above = staleController(scene, new THREE.Vector3(0, 1.2, 0), new THREE.Vector3(0, 3, -1));
  assert.equal(panel.hit(freshRay(THREE, above)), null, "pointing over the panel");
});

test("hitInfo gives the distance and point used for the aim dot", () => {
  const panel = seatedPanel();
  const c = staleController(new THREE.Scene(), new THREE.Vector3(0, 1.2, 0), buttonWorld(panel, "next"));
  const info = panel.hitInfo(freshRay(THREE, c));
  assert.equal(info.id, "next");
  assert.ok(info.t > 1.2 && info.t < 1.7);
  assert.ok(info.point.distanceTo(buttonWorld(panel, "next")) < 1e-5);
});

test("the hidden panel on the flat screen never takes a hit", () => {
  const panel = seatedPanel();
  const target = buttonWorld(panel, "next");
  const origin = new THREE.Vector3(0, 1.2, 0);
  panel.mesh.visible = false;
  assert.equal(panel.hit({ origin, dir: target.sub(origin).normalize() }), null);
});

test("pressing the caption area is consumed so it cannot cycle the tesseract plane", () => {
  assert.deepEqual(resolveSelect({ id: "next" }), { consumed: true, button: "next" });
  assert.deepEqual(resolveSelect({ id: "panel" }), { consumed: true, button: null });
  assert.deepEqual(resolveSelect(null), { consumed: false, button: null });
});

test("buttonAt is a canvas-pixel hit test", () => {
  const hits = [{ id: "a", x: 10, y: 10, w: 100, h: 50 }];
  assert.equal(buttonAt(hits, 50, 30), "a");
  assert.equal(buttonAt(hits, 5, 30), null);
});

test("the controller rig is built before the session starts, never inside enterVR", () => {
  const src = readFileSync(new URL("../public/fourth-dimension/vr/vr4d-main.js", import.meta.url), "utf8");
  const build = src.indexOf("xrInput = new XRInput(");
  const enter = src.indexOf("async function enterVR()");
  const enterEnd = src.indexOf("function vrDown(");
  assert.ok(build > 0 && enter > 0 && enterEnd > enter);
  assert.ok(build < enter, "XRInput is created at module load");
  assert.ok(!src.slice(enter, enterEnd).includes("new XRInput"), "three only binds input sources to controllers that exist when the session opens");
  assert.ok(!/raycaster\.ray\.dir\b/.test(src), "THREE.Ray has .direction, not .dir");
});
