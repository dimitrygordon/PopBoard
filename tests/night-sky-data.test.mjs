// Night Sky data files (design_v1 section 11.3) and art alignment (T9).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { parseStars, attachMeta } from "../public/night-sky/ns-catalog.js";
import { artMesh, artMapping } from "../public/night-sky/ns-artmap.js";

const D = new URL("../public/night-sky/data/", import.meta.url);
const read = (f) => readFileSync(new URL(f, D));
const bin = read("stars.bin");
const stars = attachMeta(parseStars(bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength)), JSON.parse(read("stars-meta.json")));
const manifest = JSON.parse(read("manifest.json"));
const cons = JSON.parse(read("constellations.json"));

test("stars.bin is 24 * N bytes, N matches the manifest, 8920 at V <= 6.5, magnitudes ascending", () => {
  assert.equal(bin.length, 24 * manifest.stars); assert.equal(stars.n, manifest.stars);
  assert.equal(manifest.starsAtLimit, 8920);
  let atLimit = 0;
  for (let i = 1; i < stars.n; i++) assert.ok(stars.mag[i] >= stars.mag[i - 1]);
  for (let i = 0; i < stars.n; i++) if (stars.mag[i] <= 6.5) atLimit++;
  assert.equal(atLimit, 8920);
});

test("Polaris V within 0.05 of 1.97 and within 0.75 deg of the pole; Sirius V within 0.05 of -1.44", () => {
  const p = stars.indexOfHip.get(11767), s = stars.indexOfHip.get(32349);
  assert.ok(Math.abs(stars.mag[p] - 1.97) < 0.05); assert.ok(90 - stars.dec[p] * 180 / Math.PI < 0.75);
  assert.ok(Math.abs(stars.mag[s] + 1.44) < 0.05);
  assert.equal(stars.label(s), "Sirius"); assert.equal(stars.con(s), "CMa");
});

test("88 constellations, 674 line segments (integer-only; spec said 695 for the older modern culture), every line index valid, 85 with art (Pup, Ser, Vel without)", () => {
  assert.equal(cons.constellations.length, 88);
  let segs = 0;
  for (const c of cons.constellations) for (const l of c.lines) { segs += l.length - 1; for (const i of l) assert.ok(Number.isInteger(i) && i >= 0 && i < stars.n, c.id); }
  assert.equal(segs, 674);
  const noArt = cons.constellations.filter((c) => !c.art).map((c) => c.id).sort();
  assert.deepEqual(noArt, ["Pup", "Ser", "Vel"]);
});

test("atlas rectangles do not overlap and stay inside 4096 x 4096; atlas file exists", () => {
  const R = cons.constellations.filter((c) => c.art).map((c) => c.art.atlasRect);
  for (const [x, y, w, h] of R) assert.ok(x >= 0 && y >= 0 && x + w <= 4096 && y + h <= 4096);
  for (let i = 0; i < R.length; i++) for (let j = i + 1; j < R.length; j++) {
    const [a, b] = [R[i], R[j]];
    assert.ok(a[0] + a[2] <= b[0] || b[0] + b[2] <= a[0] || a[1] + a[3] <= b[1] || b[1] + b[3] <= a[1], `overlap ${i} ${j}`);
  }
  assert.ok(statSync(new URL("art/constellations-atlas.webp", D)).size > 100000);
});

test("T9: every art entry maps its three anchor pixels back onto its anchor stars within 0.05 deg; determinant non-zero", () => {
  let worst = 0;
  for (const c of cons.constellations.filter((x) => x.art)) {
    const m = artMapping(c.art, stars.starVec);
    assert.ok(Math.abs(m.det) > 1e-12, c.id);
    for (const a of c.art.anchors) {
      const v = m.toSky(a.px, a.py), s = stars.starVec(a.star);
      const d = Math.asin(Math.min(1, Math.hypot(v[1] * s[2] - v[2] * s[1], v[2] * s[0] - v[0] * s[2], v[0] * s[1] - v[1] * s[0]))) * 180 / Math.PI; // |v x s|, precise for small angles
      worst = Math.max(worst, d);
      assert.ok(d < 0.05, `${c.id}: ${d}`);
    }
    const mesh = artMesh(c.art, stars.starVec, cons.atlas.size);
    assert.equal(mesh.pos.length, 81 * 3); assert.equal(mesh.idx.length, 64 * 6);
    // the grid's UV at each anchor pixel equals Leo's manifest anchor uv
    const [u0, v0, u1, v1] = c.art.uvRect, [W, H] = c.art.size;
    for (const a of c.art.anchors) { assert.ok(Math.abs(u0 + a.px / W * (u1 - u0) - a.uv[0]) < 2e-5 && Math.abs(v1 - a.py / H * (v1 - v0) - a.uv[1]) < 2e-5, `${c.id} uv`); }
  }
  console.log("T9 worst anchor error (deg):", worst.toExponential(2));
});

test("credits mention HYG, Stellarium, Johan Meuris, CC BY-SA 4.0 and Free Art License 1.3; FAL text ships next to the atlas", () => {
  const c = read("CREDITS.md").toString();
  for (const s of ["HYG", "Stellarium", "Johan Meuris", "CC BY-SA 4.0", "Free Art License 1.3"]) assert.ok(c.includes(s), s);
  assert.match(read("art/LICENSE-FAL.txt").toString(), /Free Art License 1\.3/);
  assert.match(read("art/README.md").toString(), /Johan Meuris/);
  const notices = readFileSync(new URL("../THIRD-PARTY-NOTICES.md", import.meta.url), "utf8");
  for (const s of ["HYG database v4.4", "Stellarium modern sky culture", "Johan Meuris", "approx_pos"]) assert.ok(notices.includes(s), s);
});

test("payload budget: stars.bin under 250 KB; first-load data under 450 KB raw", () => {
  const first = ["stars.bin", "stars-meta.json", "constellations.json", "bv-lut.json", "manifest.json"].reduce((s, f) => s + statSync(new URL(f, D)).size, 0);
  assert.ok(statSync(new URL("stars.bin", D)).size < 250e3);
  assert.ok(first < 450e3, String(first));
});
