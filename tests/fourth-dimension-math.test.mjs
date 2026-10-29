import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import * as M from "../public/fourth-dimension/fd-math.js";
import { PAGES, CHAPTERS } from "../public/fourth-dimension/pages.js";
import { GOALS, FUN, SHARE_SCHEMA, earnStamp, loadStamps, lastPageOfChapter } from "../public/fourth-dimension/fd-fun.js";

const pub = new URL("../public/", import.meta.url);
const read = (n) => readFileSync(new URL(n, pub), "utf8");
const close = (a, b, t = 1e-9) => Math.abs(a - b) <= t;
const isOrthonormal = (R) => {
  const P = M.mul(R, M.transpose(R));
  return P.every((r, i) => r.every((v, j) => close(v, i === j ? 1 : 0, 1e-9)));
};

test("every 4D plane rotation is orthonormal with determinant +1", () => {
  for (const plane of Object.keys(M.PLANES)) for (const a of [0, 0.3, Math.PI / 2, 2.1, -1.4]) {
    const R = M.rot(plane, a);
    assert.ok(isOrthonormal(R), `${plane} ${a}`);
    assert.ok(close(M.det(R), 1, 1e-9));
  }
});
test("compositions stay orthonormal; orthonormalize repairs drift", () => {
  let R = M.identity(4);
  for (let i = 0; i < 500; i++) R = M.mul(M.rot(["XW", "YW", "ZW", "XY"][i % 4], 0.037), R);
  assert.ok(isOrthonormal(M.orthonormalize(R)));
  const drift = R.map((r) => r.map((v) => v * 1.01));
  assert.ok(!isOrthonormal(drift)); assert.ok(isOrthonormal(M.orthonormalize(drift)));
});
test("XW rotation by 90 degrees sends x to w and keeps y, z", () => {
  const p = M.apply(M.rot("XW", Math.PI / 2), [1, 2, 3, 0]);
  assert.ok(close(p[0], 0) && close(p[1], 2) && close(p[2], 3) && close(p[3], 1));
  assert.ok(close(M.dist(M.apply(M.rot("ZW", 1.1), [1, -1, 1, -1]), [0, 0, 0, 0]), 2), "lengths kept");
});
test("perspective projection k/(d-w); orthographic drops w", () => {
  assert.deepEqual(M.projectPerspective([1, 1, 1, 0], 3, 2), [2 / 3, 2 / 3, 2 / 3]);
  assert.deepEqual(M.projectPerspective([1, 0, 0, 1], 3, 2), [1, 0, 0]);
  assert.deepEqual(M.projectPerspective([1, 0, 0, -1], 3, 2), [0.5, 0, 0]);
  assert.deepEqual(M.projectOrtho([1, 2, 3, 4]), [1, 2, 3]);
  // tesseract: the w = +1 cell projects twice as large as the w = -1 cell with d = 3
  assert.ok(close(M.projectPerspective([1, 1, 1, 1])[0] / M.projectPerspective([1, 1, 1, -1])[0], 2));
  // flat light: unrotated tesseract shows only 8 distinct corners (a plain cube)
  assert.equal(M.distinctCount(M.hypercube(4).V.map(M.projectOrtho)), 8);
  assert.equal(M.distinctCount(M.hypercube(4).V.map((p) => M.projectPerspective(p))), 16);
});
test("point-light shadow lands on the floor along the light ray", () => {
  const L = [0, 4, 0], s = M.shadowOnFloor([1, 2, 0], L, 0);
  assert.deepEqual(s, [2, 0, 0]);
});
test("counting formulas: vertices 2^n, edges n*2^(n-1), faces C(n,k)*2^(n-k)", () => {
  const want = [[1, 0, 0, 0], [2, 1, 0, 0], [4, 4, 1, 0], [8, 12, 6, 1], [16, 32, 24, 8]];
  for (let n = 0; n <= 4; n++) {
    assert.deepEqual([M.vertices(n), M.edges(n), M.squares(n), M.cubes(n)], want[n]);
    assert.equal(M.vertices(n), 2 ** n); assert.equal(M.edges(n), n * 2 ** (n - 1));
    assert.equal(M.euler(n), 1);
    const h = M.hypercube(n);
    assert.equal(h.V.length, M.vertices(n)); assert.equal(h.E.length, M.edges(n)); assert.equal(h.F.length, M.squares(n));
  }
  assert.equal(M.cubeFaces(4, 4), 1);
  assert.equal(M.tesseractCells().length, 8);
  for (const c of M.tesseractCells()) assert.equal(c.ids.length, 8);
});
test("16-cell and 24-cell counts", () => {
  const a = M.cell16(), b = M.cell24();
  assert.deepEqual([a.V.length, a.E.length, a.F.length], [8, 24, 32]);
  assert.deepEqual([b.V.length, b.E.length, b.F.length], [24, 96, 96]);
});
test("slices: cube gives squares, triangles and a regular hexagon; tesseract at w=c gives a cube", () => {
  const cube = M.hypercube(3);
  assert.equal(M.slice(cube.V, cube.F, 2, 0.3).points.length, 4);
  // corner-first: slice perpendicular to the main diagonal via a rotation that sends (1,1,1) to z
  const R = M.mul(M.planeRotation(0, 2, Math.atan2(Math.SQRT2, 1), 3), M.planeRotation(0, 1, -Math.PI / 4, 3));
  const V = cube.V.map((p) => M.apply(R, p.slice(0, 3)));
  assert.ok(close(Math.max(...V.map((p) => p[2])), Math.sqrt(3), 1e-9));
  assert.equal(M.slice(V, cube.F, 2, 1.2).points.length, 3);
  const hex = M.slice(V, cube.F, 2, 0).points;
  assert.equal(hex.length, 6);
  const r = hex.map((p) => Math.hypot(p[0], p[1]));
  assert.ok(r.every((x) => close(x, r[0], 1e-9)), "regular hexagon");
  const t = M.hypercube(4), s = M.slice(t.V, t.F, 3, 0.4);
  assert.equal(s.points.length, 8); assert.equal(s.segments.length, 12);
  assert.equal(M.slice(t.V, t.F, 3, 1.5).points.length, 0);
});
test("hypersphere and sphere slice radius sqrt(R^2 - h^2)", () => {
  assert.equal(M.sliceRadius(1.5, 0), 1.5);
  assert.ok(close(M.sliceRadius(5, 3), 4));
  assert.equal(M.sliceRadius(1, 1), 0); assert.equal(M.sliceRadius(1, -2), 0);
});
test("hull and area", () => {
  const h = M.hull2([[0, 0], [2, 0], [2, 2], [0, 2], [1, 1]]);
  assert.equal(h.length, 4); assert.equal(M.polyArea(h), 4);
});
test("nets: cube unfolds to 6 unit squares in z=-1, tesseract to Dali's cross of 8 cubes in w=-1", () => {
  for (const n of [3, 4]) {
    const cells = M.unfoldCells(n, 1), L = n - 1;
    assert.equal(cells.length, 2 * n);
    for (const c of cells) for (const p of c.points) assert.ok(close(p[L], -1, 1e-9), `${c.key} flat`);
    // all cells distinct, each the same size as the original cell
    const centers = cells.map((c) => c.points[0].map((_, i) => c.points.reduce((s, p) => s + p[i], 0) / c.points.length));
    for (let i = 0; i < centers.length; i++) for (let j = i + 1; j < centers.length; j++) assert.ok(M.dist(centers[i], centers[j]) > 1.9, "no overlap");
    for (const c of cells) for (const [i, j] of c.edges) assert.ok(close(M.dist(c.points[i], c.points[j]), 2, 1e-9), "rigid");
    // cross shape: a column of 4 cells along y (base, y+, y-, top), the rest around the base
    const ys = centers.filter((c) => close(c[0], 0, 1e-9) && (n === 3 || close(c[2], 0, 1e-9))).map((c) => Math.round(c[1])).sort((a, b) => a - b);
    assert.deepEqual(ys, [-4, -2, 0, 2]);
  }
  // t = 0 is the folded shape: rigid motions only, vertices back on the n-cube
  for (const c of M.unfoldCells(4, 0)) for (const p of c.points) assert.ok(p.every((x) => close(Math.abs(x), 1, 1e-9)));
  // halfway: still rigid
  for (const c of M.unfoldCells(4, 0.5)) for (const [i, j] of c.edges) assert.ok(close(M.dist(c.points[i], c.points[j]), 2, 1e-9));
});

test("pages.js is well-formed: 20-30 pages, unique ids, known scenes, 2-4 sentences, every chapter present", () => {
  assert.ok(PAGES.length >= 20 && PAGES.length <= 30, `${PAGES.length} pages`);
  const ids = new Set(); const scenes = read("fourth-dimension/fd-scene.js");
  for (const p of PAGES) {
    assert.ok(/^[a-z0-9-]+$/.test(p.id) && !ids.has(p.id), p.id); ids.add(p.id);
    assert.match(scenes, new RegExp(`SCENES\\.${p.scene} =`), `scene ${p.scene}`);
    assert.ok(CHAPTERS.some((c) => c.n === p.chapter), `chapter ${p.chapter}`);
    const sentences = p.text.split(/(?<=[.!?])\s+/).filter(Boolean).length;
    assert.ok(sentences >= 2 && sentences <= 4, `${p.id}: ${sentences} sentences`);
  }
  for (const c of CHAPTERS) assert.ok(lastPageOfChapter(PAGES, c.n) >= 0, `chapter ${c.n} has pages`);
  assert.equal(PAGES[0].id, "point"); assert.equal(PAGES.at(-1).scene, "sandbox");
});
test("module card, page file and vendored Three.js are present and wired", () => {
  const study = read("study.html");
  assert.match(study, /id: "fourth-dimension",\s*kind: "builtin",\s*name: "Beyond 3D"/);
  assert.match(study, /file: "study-fourth-dimension.html"/);
  const html = read("study-fourth-dimension.html");
  assert.match(html, /fourth-dimension\/fd-ui\.js/); assert.match(html, /data-theme="dark"/);
  assert.ok(existsSync(new URL("vendor/three/three.module.min.js", pub)));
  assert.match(read("fourth-dimension/fd-scene.js"), /from "\.\.\/vendor\/three\/three\.module\.min\.js"/);
  for (const f of ["fd-ui.js", "fd-scene.js", "fd-math.js", "fd-fun.js", "pages.js"]) assert.doesNotMatch(read("fourth-dimension/" + f), /https?:\/\/(cdn|unpkg|esm\.sh)/);
  assert.match(read("fourth-dimension/fd-ui.js"), /shared\/fun\/fun-ui\.js/);
  assert.match(read("fourth-dimension/fd-scene.js"), /lowEnd \? 1\.5 : 2/, "DPR cap");
});
test("fun: three medal goals with TODO-TESLA numbers, stamps, share schema", () => {
  assert.deepEqual(GOALS.map((g) => g.tier), ["bronze", "silver", "gold"]);
  assert.ok(GOALS[0].check({ type: "goldface", user: true, facing: -0.5 }));
  assert.ok(!GOALS[0].check({ type: "goldface", user: false, facing: -0.5 }));
  assert.ok(GOALS[1].check({ type: "tesseract", user: true, proj: "ortho", distinct: 8 }));
  assert.ok(!GOALS[1].check({ type: "tesseract", user: true, proj: "perspective", distinct: 8 }));
  assert.ok(GOALS[2].check({ type: "unfold", n: 4, t: 1 })); assert.ok(!GOALS[2].check({ type: "unfold", n: 3, t: 1 }));
  const doc = readFileSync(new URL("../docs/fun-challenges.md", import.meta.url), "utf8");
  for (const k of Object.keys(FUN)) assert.match(doc, new RegExp("`" + k + "`"));
  assert.match(doc, /Beyond 3D[\s\S]*TODO-TESLA/);
  const mem = new Map(), s = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };
  assert.equal(earnStamp(3, s), true); assert.equal(earnStamp(3, s), false); assert.deepEqual(loadStamps(s), [3]);
  assert.deepEqual(SHARE_SCHEMA.shape.values, ["cube", "tesseract", "16-cell", "24-cell"]);
});
