// Spaceships VR mode: support detection, scale, and how the pages wire the headset.
//   node --test tests/spaceships-vr.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as THREE from "../public/vendor/three/three.module.min.js";
import * as V from "../public/spaceships/ss-vr-model.js";
import { neighborCraft } from "../public/spaceships/ss-data.js";

const root = new URL("../", import.meta.url);
const read = (p) => readFileSync(new URL(p, root), "utf8");

const fleet = {
  craft: [
    { id: "a", listed: true, name: "A" },
    { id: "b", listed: false, name: "B" },
    { id: "c", listed: true, name: "C" },
    { id: "d", listed: true, name: "D" },
  ],
};

test("immersive-vr support is strict and fails closed", async () => {
  assert.equal(await V.immersiveVrSupported(null), false);
  assert.equal(await V.immersiveVrSupported({}), false);
  assert.equal(await V.immersiveVrSupported({ isSessionSupported: () => Promise.reject(new Error("no")) }), false);
  assert.equal(await V.immersiveVrSupported({ isSessionSupported: async () => false }), false);
  assert.equal(await V.immersiveVrSupported({ isSessionSupported: async (mode) => mode === "immersive-ar" }), false);
  assert.equal(await V.immersiveVrSupported({ isSessionSupported: async (mode) => mode === "immersive-vr" }), true);
});

test("the VR button is hidden without immersive-vr and shown when the headset can open", () => {
  const off = V.vrControlState(false);
  assert.equal(off.buttonHidden, true);
  assert.equal(off.disabled, true);
  assert.equal(off.noteHidden, false);
  assert.equal(off.note, V.VR_NOTE);
  const on = V.vrControlState(true);
  assert.equal(on.buttonHidden, false);
  assert.equal(on.disabled, false);
  assert.equal(on.noteHidden, true);
  assert.equal(on.note, "");
});

test("real size is scale 1 with no cap, and VR opens there", () => {
  assert.equal(V.DEFAULT_REAL, true);
  assert.equal(V.REAL_CAP_M, undefined);
  const wrench = V.viewScale(0.3, false);
  assert.equal(wrench.mode, "classroom");
  assert.ok(Math.abs(wrench.scale * 0.3 - V.COMFORT_SPAN_M) < 1e-9);
  for (const span of [0.3, 13, 110.6, 1.43e8]) {
    const real = V.viewScale(span, true);
    assert.equal(real.mode, "real", String(span));
    assert.equal(real.scale, 1, String(span));
  }
  assert.ok(V.COMFORT_SPAN_M < 1.2);
  assert.ok(V.VIEW_DISTANCE_M >= 1 && V.VIEW_DISTANCE_M <= 2);
  assert.equal(V.clampScale(9), V.SCALE_MAX);
  assert.equal(V.clampScale(0.01), V.SCALE_MIN);
  assert.equal(V.clampScale(2, 1.2), 1.2);
});

test("rockets stand on the floor, craft fit in view, and planets show a horizon", () => {
  const wrench = { id: "wrench", name: "Wrench", tags: ["tools"] };
  const rocket = { id: "saturn-v", name: "Saturn V", tags: ["crewed"], subtitle: "The rocket that launched astronauts to the Moon" };
  const station = { id: "iss", name: "International Space Station", tags: ["crewed"] };
  const planet = { id: "jupiter", name: "Jupiter", tags: ["planets-moons"] };
  assert.equal(V.placementKind(wrench, 0.3), "fit");
  assert.equal(V.placementKind(station, 109), "fit");
  assert.equal(V.placementKind(rocket, 110.6), "ground");
  assert.equal(V.isRocket({ id: "spacex-falcon-9", tags: ["rockets"] }), true);
  assert.equal(V.placementKind(planet, 1.43e8), "horizon");
  assert.equal(V.placementKind({ id: "bennu", tags: ["small-bodies"] }, 500), "fit");
  assert.equal(V.placementKind({ id: "vesta", tags: ["small-bodies"] }, 500000), "horizon");

  const small = V.initialPlacement(0.3, { x: 0.05, y: 0.3, z: 0.08 }, "fit", 1.35);
  assert.ok(small.nearest >= V.MIN_CLEAR_M - 1e-9, small.nearest);
  assert.equal(small.floor, false);
  assert.ok(small.distance > 0.3 / 2);

  const rocketPose = V.initialPlacement(110.6, { x: 10, y: 110.6, z: 10 }, "ground", 1.35);
  assert.equal(rocketPose.floor, true);
  assert.ok(Math.abs(rocketPose.centerY - (110.6 / 2 + 0.02)) < 1e-9);
  assert.ok(rocketPose.side > 5);
  assert.ok(rocketPose.distance > 5);

  const moon = V.initialPlacement(3474000, { x: 3474000, y: 3474000, z: 3474000 }, "horizon", 1.35);
  const radius = 3474000 / 2;
  const limb = Math.asin(radius / moon.distance) * 180 / Math.PI;
  assert.ok(Math.abs(limb - V.HORIZON_LIMB_DEG) < 0.05, limb);
  assert.ok(moon.nearest > 1000, "the surface is not in the student's face");
  assert.equal(V.viewScale(3474000, true).scale, 1);

  const limits = V.distanceLimits(110.6, { x: 10, y: 110.6, z: 10 }, "ground");
  assert.ok(limits.max > rocketPose.distance, "Farther can back up enough to see the rocket");
  assert.ok(limits.min < rocketPose.distance);
  assert.ok(V.stepDistance(rocketPose.distance, -1, limits) < rocketPose.distance);
  assert.ok(V.stepDistance(rocketPose.distance, 1, limits) > rocketPose.distance);
  assert.equal(V.stepDistance(limits.min, -1, limits), limits.min);
  assert.equal(V.stepDistance(limits.max, 1, limits), limits.max);
  const eased = V.easeDistance(10, 20, 0.05);
  assert.ok(eased > 10 && eased < 20);
  assert.equal(V.easeDistance(10, 20, 0), 10);

  const depth = V.depthRange(1.43e8);
  assert.ok(depth.near < 0.2);
  assert.ok(depth.far > 1.43e8);
  assert.equal(V.placementNote("horizon").includes("horizon"), true);
  assert.equal(V.realSizeLine({ facts: [{ label: "Real size", value: "3,474 km across" }] }), "Real size: 3,474 km across");
  const room = V.classroomPlacement(1.6);
  assert.equal(room.distance, V.VIEW_DISTANCE_M);
  assert.equal(room.floor, false);
});

test("thumbstick deadzone holds still, up grows, and the fleet wraps", () => {
  assert.deepEqual(V.stickDelta(0.05, -0.05, 0.5), { yaw: 0, scale: 1 });
  const right = V.stickDelta(1, 0, 0.1);
  assert.ok(right.yaw > 0, "stick right spins the near face to the student's right");
  assert.equal(right.scale, 1);
  const up = V.stickDelta(0, -1, 0.1);
  assert.ok(up.scale > 1, "stick up grows");
  const down = V.stickDelta(0, 1, 0.1);
  assert.ok(down.scale < 1, "stick down shrinks");
  assert.deepEqual(V.stickDelta(1, -1, 0), { yaw: 0, scale: 1 });
  assert.equal(neighborCraft(fleet, "a", 1).id, "c");
  assert.equal(neighborCraft(fleet, "c", -1).id, "a");
  assert.equal(neighborCraft(fleet, "d", 1).id, "a");
  assert.equal(neighborCraft(fleet, "missing", 1).id, "c");
});

test("a miss on controller 1 does not hide controller 0's cursor", () => {
  const shown = [{ ray: true, cursor: true }, { ray: true, cursor: true }];
  const miss = V.aimFrame(shown, 1, { tracked: true, panel: false });
  assert.equal(miss[0].cursor, true);
  assert.equal(miss[0].ray, true);
  assert.equal(miss[1].cursor, false);
  assert.equal(miss[1].ray, true);
  assert.equal(shown[1].cursor, true, "the previous frame is not mutated");
  const dropped = V.aimFrame(miss, 0, { tracked: false });
  assert.equal(dropped[0].ray, false);
  assert.equal(dropped[0].cursor, false);
  assert.equal(dropped[1].ray, true);
  assert.equal(dropped[1].cursor, false);
});

test("panel buttons are raycast targets and a trigger on them does not rotate", () => {
  const rects = V.panelButtons(true);
  for (const id of ["closer", "farther", "prev", "next", "real", "reset", "exit"]) {
    const r = rects.find((x) => x.id === id);
    assert.ok(r, id);
    assert.equal(V.buttonAt(r.x + r.w / 2, r.y + r.h / 2, rects), id);
    const decision = V.resolveSelect({ button: id, panel: true });
    assert.equal(decision.action, id);
    assert.equal(decision.rotate, false);
  }
  assert.equal(V.resolveSelect({ button: null, panel: true }).action, null);
  assert.equal(V.resolveSelect({ button: null, panel: true }).rotate, false);
  assert.equal(V.resolveSelect({ button: null, panel: false }).action, "reset");
  assert.equal(V.buttonAt(10, 10, rects), null);
});

test("grab turn follows the hand: tip down lowers the near face, yaw right swings it right", () => {
  const id = new THREE.Quaternion();
  const down = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -0.5);
  const turned = V.grabTurn(id, down);
  const q = new THREE.Quaternion(turned.x, turned.y, turned.z, turned.w);
  const near = new THREE.Vector3(0, 0, 1).applyQuaternion(q);
  const pointer = new THREE.Vector3(0, 0, -1).applyQuaternion(down);
  assert.ok(pointer.y < -0.2, "controller forward tipped down");
  assert.ok(near.y < -0.2, "near face tips down with the hand");
  const yawRight = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -0.5);
  const spun = new THREE.Quaternion().copy(V.grabTurn(id, yawRight));
  const swung = new THREE.Vector3(0, 0, 1).applyQuaternion(spun);
  assert.ok(swung.x > 0.2, "near face swings to the student's right");
});

test("the fact panel prefers a fun fact and keeps the real-size line", () => {
  const craft = {
    name: "Voyager",
    facts: [
      { label: "About", value: "A long about line that should lose to the fun fact." },
      { label: "Fun fact", value: "The record is still playing." },
      { label: "Real size", value: "high-gain antenna 3.7 m across" },
    ],
  };
  assert.equal(V.shortFact(craft), "The record is still playing.");
  assert.equal(V.realSizeFact(craft), "high-gain antenna 3.7 m across");
  const long = { facts: [{ label: "About", value: "word ".repeat(80) }] };
  const cut = V.shortFact(long, 80);
  assert.ok(cut.length <= 80);
  assert.ok(cut.endsWith("..."));
  assert.equal(V.shortFact({ facts: [] }), "");
});

test("pages wire VR beside AR and 3D, and the session does not drive the camera", () => {
  const html = read("public/study-spaceship.html");
  const galleryHtml = read("public/study-spaceships.html");
  const viewer = read("public/spaceships/ss-viewer.js");
  const gallery = read("public/spaceships/ss-gallery.js");
  const vr = read("public/spaceships/ss-vr.js");
  const css = read("public/spaceships/spaceships.css");

  assert.match(html, /View in your space/);
  assert.match(html, /id="vrBtn"/);
  assert.match(html, /View in VR/);
  assert.match(html, /id="vrNote"/);
  assert.match(html, /aria-current="true">3D/);
  assert.match(html, /id="modes"/);
  assert.match(galleryHtml, /id="modes"/);
  assert.match(viewer, /immersiveVrSupported/);
  assert.match(viewer, /vrControlState/);
  assert.match(viewer, /startSpaceshipVR/);
  assert.match(viewer, /import\("\.\/ss-vr\.js"\)/);
  assert.match(viewer, /activateAR/);
  assert.match(viewer, /canActivateAR/);
  assert.match(gallery, /ss-vr-model\.js/);
  assert.doesNotMatch(gallery, /ss-vr\.js/);
  assert.doesNotMatch(galleryHtml + gallery, /model-viewer/);

  assert.match(vr, /from "\.\.\/vendor\/three\/three\.module\.min\.js"/);
  assert.match(vr, /from "\.\.\/vendor\/three\/GLTFLoader\.js"/);
  assert.match(vr, /from "\.\.\/vendor\/three\/meshopt_decoder\.mjs"/);
  assert.match(vr, /from "\.\.\/night-sky\/ns-input\.js"/);
  assert.match(vr, /new GLTFLoader/);
  assert.match(vr, /setMeshoptDecoder/);
  assert.match(vr, /loadAsync\(url\)/);
  assert.match(vr, /requestSession\("immersive-vr"/);
  assert.match(vr, /local-floor/);
  assert.match(vr, /hand-tracking/);
  assert.match(vr, /setReferenceSpaceType\("local-floor"\)/);
  assert.match(vr, /setFramebufferScaleFactor\(1\)/);
  assert.match(vr, /logarithmicDepthBuffer: true/);
  assert.match(vr, /real = true/);
  assert.match(vr, /panelButtons/);
  assert.match(vr, /buttonAt/);
  assert.match(vr, /resolveSelect/);
  assert.match(vr, /freshRay/);
  assert.match(vr, /updateMatrixWorld\(true\)/);
  assert.match(vr, /grabTurn/);
  assert.match(vr, /DoubleSide/);
  assert.match(vr, /pointingAtPanel/);
  assert.match(vr, /showAim\(i,/);
  assert.match(vr, /aimFrame/);
  assert.match(vr, /_rayO\.clone\(\)/);
  assert.doesNotMatch(vr, /REAL_CAP|capped at/);
  assert.match(vr, /new XRInput/);
  assert.doesNotMatch(vr, /USDZLoader/);
  assert.doesNotMatch(vr, /\.usdz/);
  assert.doesNotMatch(vr, /https?:\/\/(cdn|unpkg|esm\.sh)/);
  assert.match(css, /ss-vr-canvas/);

  const frame = vr.slice(vr.indexOf("function sessionFrame"), vr.indexOf("function renderStereo"));
  assert.ok(frame.length > 80, "session frame missing");
  assert.doesNotMatch(frame, /camera\.position/);
  assert.doesNotMatch(frame, /camera\.quaternion/);
  assert.doesNotMatch(frame, /camera\.rotation/);
  assert.match(vr, /setAnimationLoop\(sessionFrame\)/);
  assert.ok(V.panelButtons(true).some((b) => b.label === "Previous"));
  assert.ok(V.panelButtons(true).some((b) => b.label === "Exit VR"));
  assert.match(vr, /VR_HINT/);
  assert.match(V.VR_HINT, /Grip turns the model/);
  assert.match(V.VR_HINT, /Thumbstick turns and scales/);
  assert.match(V.VR_HINT, /Closer and Farther/);
  assert.match(V.VR_HINT, /Trigger resets to real size/);
  assert.equal(V.DEFAULT_REAL, true);

  for (const file of [
    "public/spaceships/ss-vr.js",
    "public/spaceships/ss-vr-model.js",
    "public/spaceships/ss-viewer.js",
    "public/spaceships/ss-gallery.js",
    "public/study-spaceship.html",
    "public/study-spaceships.html",
  ]) {
    assert.equal(read(file).includes("\u2014"), false, file);
    assert.equal(read(file).includes("\u2013"), false, file);
  }
  assert.match(read("docs/spaceships-assets.md"), /immersive-vr/);
  assert.match(read("docs/spaceships-assets.md"), /GLTFLoader/);
});
