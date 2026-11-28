// Spaceships VR mode: support detection, scale, and how the pages wire the headset.
//   node --test tests/spaceships-vr.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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

test("classroom scale fits the room, real size is true meters, and huge craft are capped", () => {
  const wrench = V.viewScale(0.3, false);
  assert.equal(wrench.mode, "classroom");
  assert.ok(Math.abs(wrench.scale * 0.3 - V.COMFORT_SPAN_M) < 1e-9);
  const wrenchReal = V.viewScale(0.3, true);
  assert.equal(wrenchReal.mode, "real");
  assert.equal(wrenchReal.scale, 1);
  assert.equal(wrenchReal.capped, false);
  const rocket = V.viewScale(110.6, true);
  assert.equal(rocket.mode, "capped");
  assert.equal(rocket.capped, true);
  assert.ok(Math.abs(rocket.scale * 110.6 - V.REAL_CAP_M) < 1e-9);
  const planet = V.viewScale(1.43e8, true);
  assert.ok(planet.scale * 1.43e8 <= V.REAL_CAP_M + 1e-6);
  assert.ok(V.COMFORT_SPAN_M < 1.2);
  assert.ok(V.REAL_CAP_M <= 3);
  assert.ok(V.VIEW_DISTANCE_M >= 1 && V.VIEW_DISTANCE_M <= 2);
  // user scale cannot push the shown craft past the cap
  assert.ok(V.userScaleLimit(V.COMFORT_SPAN_M) * V.COMFORT_SPAN_M <= V.REAL_CAP_M + 1e-9);
  assert.equal(V.userScaleLimit(V.REAL_CAP_M), 1);
  assert.equal(V.clampScale(9, 1), 1);
  assert.equal(V.clampScale(0.01, 3), V.SCALE_MIN);
});

test("thumbstick deadzone holds still, up grows, and the fleet wraps", () => {
  assert.deepEqual(V.stickDelta(0.05, -0.05, 0.5), { yaw: 0, scale: 1 });
  const right = V.stickDelta(1, 0, 0.1);
  assert.ok(right.yaw < 0, "stick right yaws");
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
  assert.match(vr, /Previous/);
  assert.match(vr, /Exit VR/);
  assert.match(vr, /VR_HINT/);
  assert.match(V.VR_HINT, /Grip turns the model/);
  assert.match(V.VR_HINT, /Trigger resets/);

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
