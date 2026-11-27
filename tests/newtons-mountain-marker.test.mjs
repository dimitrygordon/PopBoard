// Model view: the cannon marker and the Earth texture agree on longitude. cannonLatLon [30, -40] is the mid Atlantic.
// Root cause of "the marker sits over the western Pacific": the texture mapping is right (the marker direction maps to lon -40,
// lat 30 through the same formula the Earth shader uses). The marker is an ordinary mesh and the Earth is an analytic shader that
// writes no depth, so seen from the far side of the globe the marker was drawn on top of the planet at the near-side longitude
// (lon + 180 = 140 E, over Asia and Australia). The fix hides the marker with the same ray-sphere test as the trails.
import test from "node:test";
import assert from "node:assert/strict";
import { NM_CONFIG as C } from "../public/newtons-mountain/nm-config.js";
import { modelFrame, texRotation, planeAxes, mat3vec, raySphere } from "../public/newtons-mountain/nm-frames.js";
import { hiddenByEarth } from "../public/newtons-mountain/nm-trails.js";
import { consts } from "../public/newtons-mountain/nm-sim.js";

const R = consts("lesson").R, h = 150e3, size = 0.5;
const frame = modelFrame([0, 1.25, -1.0], size, R);
// the shader's mapping: texture-frame direction -> (lon, lat, u)
const shaderLonLat = (nt) => { const lon = (Math.atan2(nt[0], nt[2]) * 180) / Math.PI; return { lon, lat: (Math.asin(nt[1]) * 180) / Math.PI, u: lon / 360 + 0.5 }; };
const norm = (a) => { const l = Math.hypot(...a); return a.map((x) => x / l); };
const sub = (a, b) => a.map((x, i) => x - b[i]);

test("the marker direction maps to the config longitude and latitude through the shader's formula", () => {
  const tr = texRotation(frame, C.cannonLatLon[0], C.cannonLatLon[1]), { u } = planeAxes(frame);
  const g = shaderLonLat(mat3vec(tr, u));
  assert.ok(Math.abs(g.lon - C.cannonLatLon[1]) < 1e-9, "lon " + g.lon);
  assert.ok(Math.abs(g.lat - C.cannonLatLon[0]) < 1e-9, "lat " + g.lat);
  assert.ok(Math.abs(g.u - (0.5 + C.cannonLatLon[1] / 360)) < 1e-12, "texture u " + g.u); // u = 0.5 + lon/360 on an equirectangular map centred on Greenwich
});

test("seen from the marker's side, the surface behind the marker is the cannon longitude; from the far side it is lon + 180", () => {
  const tr = texRotation(frame, C.cannonLatLon[0], C.cannonLatLon[1]), { u } = planeAxes(frame);
  const k = frame.scale, c = frame.earthCentre, rw = R * k;
  const marker = [0, 1, 2].map((i) => c[i] + u[i] * (R + h) * k);
  const surfaceLon = (cam) => { const rd = norm(sub(marker, cam)), oc = sub(cam, c), b = oc[0] * rd[0] + oc[1] * rd[1] + oc[2] * rd[2], disc = b * b - (oc[0] ** 2 + oc[1] ** 2 + oc[2] ** 2 - rw * rw), t = -b - Math.sqrt(disc);
    return shaderLonLat(mat3vec(tr, norm([0, 1, 2].map((i) => oc[i] + rd[i] * t)))); };
  const near = [0, 1, 2].map((i) => c[i] + u[i] * 0.9), far = [0, 1, 2].map((i) => c[i] - u[i] * 0.9); // camera on the marker side, and exactly opposite
  const n = surfaceLon(near), f = surfaceLon(far);
  assert.ok(Math.abs(n.lon - C.cannonLatLon[1]) < 1e-6 && Math.abs(n.lat - C.cannonLatLon[0]) < 1e-6, "marker side: " + JSON.stringify(n));
  assert.ok(Math.abs(f.lon - (C.cannonLatLon[1] + 180)) < 1e-6 && Math.abs(f.lat + C.cannonLatLon[0]) < 1e-6, "far side shows lon + 180, lat negated (140 E, 30 S): " + JSON.stringify(f));
});

test("the marker is hidden when it is behind the globe and visible when it faces the camera", () => {
  const { u } = planeAxes(frame), k = frame.scale, c = frame.earthCentre, rw = R * k;
  const marker = [0, 1, 2].map((i) => c[i] + u[i] * (R + h) * k);
  const farU = (cam) => { const oc = sub(cam, c); return { uHead: { value: { x: cam[0], y: cam[1], z: cam[2] } }, uOC: { value: { x: oc[0], y: oc[1], z: oc[2] } }, uOC2mR2: { value: Math.hypot(...oc) ** 2 - rw * rw }, uTol: { value: 30 * k }, uEarthOn: { value: 1 } }; };
  const facing = [0, 1, 2].map((i) => c[i] + u[i] * 0.9), behind = [0, 1, 2].map((i) => c[i] - u[i] * 0.9);
  assert.equal(hiddenByEarth(farU(facing), marker), false, "facing: visible");
  assert.equal(hiddenByEarth(farU(behind), marker), true, "behind the globe: hidden");
});
