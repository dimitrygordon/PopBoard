import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import * as M from "../public/fourth-dimension/fd-math.js";
import { CHAPTERS, PAGES as BOOK } from "../public/fourth-dimension/pages.js";
import * as V from "../public/fourth-dimension/vr/vr4d-math.js";
import { PAGES, buildSteps, handbackFor, DECK } from "../public/fourth-dimension/vr/vr4d-book.js";

const root = new URL("../", import.meta.url);
const read = (n) => readFileSync(new URL(n, root), "utf8");
const close = (a, b, t = 1e-6) => Math.abs(a - b) <= t;

test("segment length is 2*sqrt(R^2-h^2); sphere slice is sqrt(R^2-c^2)", () => {
  assert.equal(V.segmentLength(0.6, 0), 1.2);
  assert.ok(close(V.segmentLength(0.6, 0), 2 * Math.sqrt(0.6 * 0.6 - 0)));
  assert.equal(V.segmentLength(0.6, 0.6), 0);
  assert.equal(V.segmentLength(0.6, 0.75), 0, "bead range past R shows nothing");
  assert.equal(V.segmentLength(0.6, -0.3), V.segmentLength(0.6, 0.3));
  assert.ok(close(V.segmentAngleDeg(0.6, 0, 1.6), 41.112, 0.02), "about 41 degrees at 1.6 m");
  assert.equal(V.sphereSliceRadius(0.75, 0), 0.75);
  assert.ok(close(V.sphereSliceRadius(0.75, 0.45), Math.sqrt(0.75 * 0.75 - 0.45 * 0.45)));
  assert.equal(V.sphereSliceRadius(0.75, 0.75), 0);
  assert.equal(V.sphereSliceRadius(0.75, 0.9), 0);
  assert.equal(V.sphereSliceRadius(1.5, 0), M.sliceRadius(1.5, 0));
});

test("a quarter turn slides the inner cell out to one side; a half turn swaps inner and outer", () => {
  const sideAxis = { XW: 0, YW: 1, ZW: 2 };
  for (const plane of ["XW", "YW", "ZW"]) {
    assert.equal(V.goldCellPose(plane, 0).role, "inner", plane);
    const q = V.goldCellPose(plane, Math.PI / 2);
    assert.equal(q.role, "side", `${plane} 90`);
    assert.equal(q.axis, sideAxis[plane], `${plane} side axis`);
    assert.equal(q.sign, 1);
    assert.equal(V.goldCellPose(plane, Math.PI).role, "outer", `${plane} 180`);
    assert.equal(V.goldCellPose(plane, 3 * Math.PI / 2).role, "side", `${plane} 270`);
    assert.equal(V.goldCellPose(plane, 2 * Math.PI).role, "inner", `${plane} 360`);
    // the cell stays rigid: an edge of the gold cell is still length 2
    const ids = V.goldCellIds();
    const edge = M.hypercube(4).E.find(([a, b]) => ids.includes(a) && ids.includes(b));
    for (const a of [0, Math.PI / 2, Math.PI]) {
      const P = V.rotatedPoints(plane, a);
      assert.ok(close(M.dist(P[edge[0]], P[edge[1]]), 2, 1e-9), `${plane} rigid at ${a}`);
    }
  }
  // projected shadow: inner width 1, outer width 2, and at 90° the gold cell sits off to the side
  const at0 = V.goldProjected("XW", 0);
  const at90 = V.goldProjected("XW", Math.PI / 2);
  const at180 = V.goldProjected("XW", Math.PI);
  assert.ok(close(at0.width, 1, 1e-9), "inner cell projects half as wide");
  assert.ok(close(at180.width, 2, 1e-9), "after a half turn it projects as the outer cell");
  assert.ok(at90.c[0] > 0.5, "at a quarter turn the cell has moved out to the positive x side");
  assert.ok(Math.abs(at0.c[0]) < 1e-9, "it starts centered");
  // display scale: outer 3.0 m, inner 1.5 m
  assert.ok(close(at0.width * V.SHADOW_SCALE, V.INNER_M));
  assert.ok(close(at180.width * V.SHADOW_SCALE, V.OUTER_M));
  assert.equal(V.HALF_TURN_SEC, 9);
  assert.ok(close(V.capDelta(1, 0.1), (20 * Math.PI / 180) * 0.1));
  assert.ok(close(V.capDelta(0.01, 0.1), 0.01));
  assert.ok(close(V.capDelta(-1, 0.5), -(20 * Math.PI / 180) * 0.5));
});

test("dial notches: 90° is the waypoint, 180° is the swap, and the start is silent", () => {
  const kinds = (a, b) => V.notchEvents(a, b).map((e) => e.kind);
  assert.deepEqual(kinds(0, 0.01), []);
  assert.deepEqual(kinds(0, Math.PI / 2), ["waypoint"]);
  assert.deepEqual(kinds(0, Math.PI), ["waypoint", "swap"]);
  assert.deepEqual(kinds(Math.PI / 2, Math.PI), ["swap"]);
  assert.deepEqual(kinds(Math.PI, 3 * Math.PI / 2), ["waypoint"]);
  assert.deepEqual(kinds(Math.PI, 2 * Math.PI), ["waypoint"]);
  assert.deepEqual(kinds(2 * Math.PI, 2 * Math.PI + Math.PI), ["waypoint", "swap"]);
  // turning back across 180° fires the swap once, not a second waypoint
  assert.deepEqual(kinds(Math.PI + 0.2, Math.PI - 0.2), ["swap"]);
  assert.equal(V.cyclePlane("XW"), "YW");
  assert.equal(V.cyclePlane("ZW"), "XW");
});

test("near-head clip keeps the outer cube and only cuts what enters the eye ball", () => {
  const head = [0, 1.35, 0];
  // an outer-cube edge beside and behind the seat misses the clip ball entirely
  const rear = V.clipSegmentOutsideSphere([1.5, 2.1, -1.5], [1.5, 2.1, 1.5], head, V.HEAD_CLIP_M);
  assert.ok(rear);
  assert.ok(close(rear[2], -1.5) && close(rear[5], 1.5), "rear edge is kept, both ends");
  // a wire that runs through the head is cut so the mesh does not cross the eye
  const through = V.clipSegmentOutsideSphere([-2, 1.35, 0], [2, 1.35, 0], head, V.HEAD_CLIP_M);
  assert.ok(through);
  const mid = [(through[0] + through[3]) / 2, (through[1] + through[4]) / 2, (through[2] + through[5]) / 2];
  const midDist = Math.hypot(mid[0] - head[0], mid[1] - head[1], mid[2] - head[2]);
  assert.ok(midDist >= V.HEAD_CLIP_M - 1e-6, "the kept piece stays outside the clip ball");
  assert.equal(V.clipSegmentOutsideSphere([-0.05, 1.35, 0], [0.05, 1.35, 0], head, V.HEAD_CLIP_M), null);
  assert.equal(V.wireFade(0), 0);
  assert.equal(V.wireFade(V.HEAD_FADE_M), 1);
  assert.ok(close(V.wireFade(0.25), 0.5));
  assert.equal(V.HEAD_FADE_M, 0.5);
});

test("scene 3 lamp throws a shadow about three times the cube", () => {
  const { lamp, screenZ, cubeCenter, edge } = V.SCENE3;
  const zFront = cubeCenter[2] - edge / 2, zBack = cubeCenter[2] + edge / 2;
  const front = V.shadowScaleAt(zFront), back = V.shadowScaleAt(zBack);
  assert.ok(front > 2.2 && front < 3.4, `front scale ${front}`);
  assert.ok(back > 2.6 && back < 4.2, `back scale ${back}`);
  const mid = (front + back) / 2;
  assert.ok(Math.abs(mid - 3) < 0.6, `mean scale ${mid}`);
  const p = [cubeCenter[0] + edge / 2, cubeCenter[1], cubeCenter[2]];
  const s = V.shadowOnPlane(p, lamp, 2, screenZ);
  assert.ok(s && close(s[2], screenZ));
  assert.equal(V.shadowOnPlane(p, lamp, 2, lamp[2] + 1), null, "ray going the other way misses");
});

test("storybook has 27 pages, help 0 skips the six answers, hand-backs match the book", () => {
  assert.equal(PAGES.length, 27);
  assert.deepEqual(PAGES.map((p) => p.n), Array.from({ length: 27 }, (_, i) => i + 1));
  const ids = PAGES.map((p) => p.id);
  assert.equal(new Set(ids).size, 27);
  for (const p of PAGES) {
    const sentences = p.text.split(/(?<=[.!?])\s+/).filter(Boolean);
    assert.ok(sentences.length >= 1 && sentences.length <= 5, p.id);
    assert.ok(p.text.length < 320, p.id);
  }
  const answers = ["s4", "s8", "s12", "s17", "s21", "s25"];
  const observe = buildSteps(0).filter((s) => s.kind === "page").map((s) => s.page.id);
  for (const id of answers) assert.ok(!observe.includes(id), id);
  const reasons = buildSteps(1).filter((s) => s.kind === "page").map((s) => s.page.id);
  for (const id of answers) assert.ok(reasons.includes(id), id);
  assert.ok(buildSteps(1).some((s) => s.page?.id === "s26"));
  assert.ok(!buildSteps(1, { exitTicket: false }).some((s) => s.page?.id === "s26"));
  // hand-back labels are the flat module's chapter titles and first page of that chapter
  const expect = [
    ["flick", 2, "Flatland", "flatland", "black"],
    ["flatland", 2, "Flatland", "flatland", "leaf"],
    ["shadow", 3, "Shadows", "shadow", "leaf"],
    ["build", 4, "Up to 4D", "counting", "leaf"],
    ["tesseract", 5, "Tesseract shadow", "tesseract", "leaf"],
    ["hyper", 6, "Slicing", "slice-tesseract", "leaf"],
  ];
  for (const [scene, n, title, pageId, transition] of expect) {
    const h = handbackFor(scene);
    assert.equal(h.chapter, n);
    assert.equal(h.title, title);
    assert.equal(h.title, CHAPTERS.find((c) => c.n === n).title);
    assert.equal(h.pageId, pageId);
    assert.equal(BOOK.find((p) => p.chapter === n).id, pageId);
    assert.equal(h.transition, transition);
    assert.equal(h.text, `Continue in the book: Chapter ${n}, ${title}.`);
  }
  const steps = buildSteps(1);
  const cards = steps.filter((s) => s.kind === "handback");
  assert.equal(cards.length, 6);
  assert.equal(steps.at(-1).page.id, "s27");
  assert.match(steps.at(-1).page.text, /Chapter 7, Unfolding/);
  // scene 1 hands back, then the black fade, then Flatland. The card sits before s5.
  const iFlick = steps.findIndex((s) => s.kind === "handback" && s.scene === "flick");
  assert.equal(steps[iFlick + 1].page.id, "s5");
  assert.equal(DECK, "vr4d");
});

test("placeholder narration has a clip and word times for all 27 pages", () => {
  const manifest = JSON.parse(read("public/fourth-dimension/audio/manifest.json"));
  assert.deepEqual(manifest.vr4d, PAGES.map((p) => p.n));
  assert.equal(manifest.score, null);
  for (const p of PAGES) {
    const json = JSON.parse(read(`public/fourth-dimension/audio/vr4d/s${p.n}.json`));
    assert.equal(json.words.map((w) => w.w).join(" "), p.text);
    assert.ok(json.words.every((w) => w.end > w.start && w.start >= 0));
    assert.ok(existsSync(new URL(`public/fourth-dimension/audio/vr4d/s${p.n}.mp3`, root)));
  }
});

test("claim 9 records Tesla's quarter-turn correction", () => {
  const doc = read("docs/fourth-dimension-science.md");
  assert.match(doc, /quarter turn \(90°\)/);
  assert.match(doc, /out to one side as a side cell/);
  assert.match(doc, /Only a half turn \(180°\) swaps the inner and outer cells/);
  assert.doesNotMatch(doc, /inner cell becomes an outer one/);
});

test("the flat module links into the storybook and the storybook does not replace the 22-plus pages", () => {
  const html = read("public/study-fourth-dimension.html");
  assert.match(html, /Enter VR storybook/);
  assert.match(html, /study-fourth-dimension-vr\.html/);
  assert.match(html, /fourth-dimension\/fd-ui\.js/);
  const book = read("public/fourth-dimension/pages.js");
  assert.match(book, /export const PAGES/);
  assert.equal(BOOK.length >= 22, true);
  const vr = read("public/study-fourth-dimension-vr.html");
  assert.match(vr, /fourth-dimension\/vr\/vr4d-main\.js/);
  assert.match(vr, /Enter headset|Enter VR/);
  for (const f of ["vr4d-main.js", "vr4d-world.js", "vr4d-audio.js", "vr4d-book.js", "vr4d-math.js"]) {
    assert.doesNotMatch(read("public/fourth-dimension/vr/" + f), /https?:\/\/(cdn|unpkg|esm\.sh)/);
  }
});
