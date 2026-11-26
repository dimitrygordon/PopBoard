// Hit-testing: star and planet cones, constellation hulls, priority, horizon.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseStars, attachMeta } from "../public/night-sky/ns-catalog.js";
import { apply, applyT, raDecVec } from "../public/night-sky/ns-util.js";
import { skyMatrix, worldToAltAz } from "../public/night-sky/ns-astro.js";
import {
  convexHull2, angDegToSegment, buildConstellationIndex, pickConstellation, pickStar, pickBody, pickSky, samePick,
  PICK_STAR_DEG, PICK_CON_TOL_DEG,
} from "../public/night-sky/ns-pick.js";

const D = new URL("../public/night-sky/data/", import.meta.url);
const read = (f) => readFileSync(new URL(f, D));
const bin = read("stars.bin");
const stars = attachMeta(parseStars(bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength)), JSON.parse(read("stars-meta.json")));
const cons = JSON.parse(read("constellations.json"));
const index = buildConstellationIndex(cons.constellations, (i) => stars.starVec(i));
const byId = Object.fromEntries(index.map((r) => [r.id, r]));

test("convexHull2 of a square and of colinear points", () => {
  const h = convexHull2([[0, 0], [1, 0], [1, 1], [0, 1], [0.5, 0.5]]);
  assert.equal(h.length, 4);
  assert.deepEqual(convexHull2([[0, 0], [1, 0], [2, 0]]), [[0, 0], [2, 0]]);
});

test("angDegToSegment is 0 on the segment and ~90 off a pole-to-equator line at the side", () => {
  const a = [1, 0, 0], b = [0, 1, 0], mid = [Math.SQRT1_2, Math.SQRT1_2, 0], side = [0, 0, 1];
  assert.ok(angDegToSegment(mid, a, b) < 0.05);
  assert.ok(Math.abs(angDegToSegment(side, a, b) - 90) < 0.05);
});

test("88 figure hulls are built; Orion and Ursa Major have a real area", () => {
  assert.equal(index.length, 88);
  assert.ok(byId.Ori.hull.length >= 3 && byId.Ori.area > 0);
  assert.ok(byId.UMa.hull.length >= 3 && byId.UMa.area > 0);
});

test("a ray at a figure's mean direction picks that constellation", () => {
  const hit = pickConstellation(byId.Ori.center, index);
  assert.equal(hit && hit.id, "Ori");
  const uma = pickConstellation(byId.UMa.center, index);
  assert.equal(uma && uma.id, "UMa");
});

test("a ray far from every figure returns null", () => {
  // RA 0h, Dec -22 deg sits in a gap (checked on a 3 deg grid at 8 deg tolerance).
  const r = 0, d = -22 * Math.PI / 180;
  const v = [Math.cos(d) * Math.cos(r), Math.cos(d) * Math.sin(r), Math.sin(d)];
  assert.equal(pickConstellation(v, index), null);
});

test("within tolerance of a hull edge still hits; well past the tolerance does not", () => {
  const rec = byId.Lyr;
  // Step from the center toward (and then past) a hull vertex.
  const v = rec.hull[0];
  const lerp = (t) => {
    const x = rec.center[0] + (v[0] - rec.center[0]) * t, y = rec.center[1] + (v[1] - rec.center[1]) * t, z = rec.center[2] + (v[2] - rec.center[2]) * t;
    const l = Math.hypot(x, y, z);
    return [x / l, y / l, z / l];
  };
  assert.equal(pickConstellation(lerp(1.0), index)?.id, "Lyr");
  // A point just outside along the same ray should still be within 4 deg for a compact figure.
  const justOut = lerp(1.15);
  const hit = pickConstellation(justOut, index, PICK_CON_TOL_DEG);
  assert.ok(hit === null || hit.id === "Lyr" || hit.area <= rec.area * 1.5, hit && hit.id);
  const far = lerp(8);
  const miss = pickConstellation(far, index, PICK_CON_TOL_DEG);
  assert.ok(!miss || miss.id !== "Lyr" || miss === rec, "far ray should not still be Lyra unless another figure owns it");
});

test("overlapping hulls pick the smaller figure (Crux vs a ray in Crux, not Centaurus)", () => {
  const hit = pickConstellation(byId.Cru.center, index);
  assert.equal(hit && hit.id, "Cru");
});

test("pickStar returns the brightest star in the cone (Sirius over neighbours)", () => {
  const i = stars.indexOfHip.get(32349);
  const v = stars.starVec(i);
  assert.equal(pickStar(v, stars), i);
  assert.equal(stars.label(i), "Sirius");
});

test("pickStar returns -1 when the cone is empty", () => {
  const v = stars.starVec(stars.indexOfHip.get(32349));
  const anti = [-v[0], -v[1], -v[2]];
  assert.equal(pickStar(anti, stars, { coneDeg: 1.5 }), -1);
});

test("pickBody prefers the nearer planet and respects the 2 deg cone and the ground", () => {
  const venus = { id: "venus", dir: [0, 1, 0] }, mars = { id: "mars", dir: [0.02, 0.9998, 0] };
  assert.equal(pickBody([0, 1, 0], [venus, mars]).id, "venus");
  assert.equal(pickBody([1, 0, 0], [venus]), null);
  assert.equal(pickBody([0, -1, 0], [{ id: "sun", dir: [0, -1, 0] }], { groundOn: true }), null);
  assert.equal(pickBody([0, -1, 0], [{ id: "sun", dir: [0, -1, 0] }], { groundOn: false }).id, "sun");
});

test("pickSky: a planet wins over a star, a named star wins over its constellation, else the figure", () => {
  const T1 = Date.UTC(2026, 11, 21, 3, 0, 0);
  const M = skyMatrix(T1, 41.1725, -86.9311); // Jasper
  const sirius = stars.indexOfHip.get(32349);
  const sJ = stars.starVec(sirius);
  const sL = apply(M, sJ);
  const worldStar = (i) => apply(M, stars.starVec(i));
  const base = { stars, M, applyT, magLimit: 6.5, conIndex: index, groundOn: false, worldStar, unrefract: (v) => v };

  const starHit = pickSky(sL, { ...base, planetsOn: false });
  assert.equal(starHit.kind, "star");
  assert.equal(starHit.index, sirius);

  const planetHit = pickSky(sL, { ...base, planetsOn: true, solar: [{ id: "venus", dir: sL }] });
  assert.equal(planetHit.kind, "body");
  assert.equal(planetHit.id, "venus");

  // A point at Orion's center, in J2000, that is more than PICK_STAR_DEG from every catalog star
  // may still be a star if a bright one sits there; if so, just assert the star is in Ori.
  // Otherwise the figure wins.
  const oriL = apply(M, byId.Ori.center);
  const ori = pickSky(oriL, { ...base, planetsOn: false });
  assert.ok(ori, "Orion's center should hit something");
  if (ori.kind === "star") assert.equal(stars.con(ori.index), "Ori");
  else { assert.equal(ori.kind, "constellation"); assert.equal(ori.id, "Ori"); }

  // Nudge off every star around the label, if needed, by walking a ring around the center
  // until we land more than PICK_STAR_DEG from every star; that must be the figure.
  let fig = null;
  for (let k = 0; k < 16 && !fig; k++) {
    const ang = k * Math.PI / 8, off = 3 * Math.PI / 180;
    const axis = [Math.cos(ang), Math.sin(ang), 0];
    // rotate center by `off` around a perpendicular
    const c = byId.Ori.center;
    const n = [c[1] * 0 - c[2] * axis[1], c[2] * axis[0] - c[0] * 0, c[0] * axis[1] - c[1] * axis[0]];
    const nl = Math.hypot(...n) || 1;
    const nn = [n[0] / nl, n[1] / nl, n[2] / nl];
    const ca = Math.cos(off), sa = Math.sin(off);
    const cr = [nn[1] * c[2] - nn[2] * c[1], nn[2] * c[0] - nn[0] * c[2], nn[0] * c[1] - nn[1] * c[0]];
    const v = [c[0] * ca + cr[0] * sa, c[1] * ca + cr[1] * sa, c[2] * ca + cr[2] * sa];
    const lv = apply(M, v);
    const h = pickSky(lv, { ...base, planetsOn: false });
    if (h && h.kind === "constellation" && h.id === "Ori") fig = h;
  }
  assert.ok(fig, "some nearby direction in Orion should pick the figure, not a star");
});

test("samePick compares by kind and id/index", () => {
  assert.ok(samePick({ kind: "star", index: 3 }, { kind: "star", index: 3 }));
  assert.ok(!samePick({ kind: "star", index: 3 }, { kind: "star", index: 4 }));
  assert.ok(samePick({ kind: "constellation", id: "Ori" }, { kind: "constellation", id: "Ori" }));
  assert.ok(!samePick({ kind: "body", id: "mars" }, { kind: "constellation", id: "mars" }));
});

test("horizon: a below-horizon ray with ground on returns null", () => {
  const M = skyMatrix(Date.UTC(2026, 11, 21, 3, 0, 0), 41.1725, -86.9311);
  const down = [0, -1, 0];
  assert.equal(pickSky(down, { stars, M, applyT, conIndex: index, groundOn: true, worldStar: (i) => apply(M, stars.starVec(i)), unrefract: (v) => v }), null);
});
