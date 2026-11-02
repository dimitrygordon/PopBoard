import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import * as Q from "../public/physics101/cq-core.js";

const INDEX = JSON.parse(readFileSync(new URL("../public/physics101/sq/index.json", import.meta.url)));
const { DECKS } = await import("../public/physics101/p101-catalog.js");
const mem = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)) }; };

test("weights always total 100", () => {
  const u = ["m01-l01", "m01-l02", "m2"];
  assert.equal(Object.values(Q.balance(u)).reduce((a, b) => a + b), 100);
  let w = Q.balance(u);
  for (const v of [0, 7, 55, 100, 33]) { w = Q.setWeight(w, "m2", v); assert.equal(Object.values(w).reduce((a, b) => a + b), 100); assert.equal(w.m2, v); }
});
test("whole module replaces its lesson ticks", () => {
  assert.deepEqual(Q.normalizeScope(["m01-l01", "m1", "m02-l01"], DECKS).sort(), ["m02-l01", "m1"]);
});
test("allocation clamps to what exists and moves the rest", () => {
  const r = Q.allocate(["a", "b"], { a: 90, b: 10 }, 20, { a: 6, b: 40 });
  assert.equal(r.take.a, 6); assert.equal(r.take.b, 14); assert.deepEqual(r.notes, [{ unit: "a", available: 6 }]);
  assert.equal(Q.allocate(["a"], { a: 100 }, 99, { a: 5 }).total, 5);
});
test("draw uses existing Study Questions ids only, no repeats, reproducible", () => {
  const units = ["m03-l01", "m5"], take = { "m03-l01": 4, m5: 8 };
  const a = Q.draw(units, take, INDEX, DECKS, 42), b = Q.draw(units, take, INDEX, DECKS, 42);
  assert.deepEqual(a, b); assert.equal(a.length, 12); assert.equal(new Set(a.map((x) => x.id)).size, 12);
  const all = new Set(Object.values(INDEX).flatMap((v) => v.t.map(([id]) => id)));
  for (const x of a) { assert.ok(all.has(x.id)); assert.ok(INDEX[x.slug].t.some(([id]) => id === x.id)); }
  const c = Q.draw(units, take, INDEX, DECKS, 43, new Set(a.map((x) => x.id)));
  assert.ok(c.filter((x) => a.some((y) => y.id === x.id)).length < 12);
});
test("grading never claims a key it lacks", () => {
  assert.equal(Q.answerKey({ id: "x" }), null);
  assert.equal(Q.autoCheck({ type: "number", value: 9.8, tol: 0.02 }, "9.75"), true);
  assert.equal(Q.autoCheck({ type: "number", value: 9.8 }, "12"), false);
  assert.equal(Q.autoCheck({ type: "choice", value: "B" }, " b "), true);
  const s = Q.score([{ id: "a", result: "right" }, { id: "b", result: "wrong", flag: true }, { id: "c", result: "skipped" }]);
  assert.deepEqual([s.right, s.total, s.missed, s.flagged], [1, 3, ["b", "c"], ["b"]]);
});
test("presets: save, last-used star, delete", () => {
  const st = mem();
  Q.savePreset(st, { name: "Forces", units: ["m4"], weights: { m4: 100 }, count: 10 });
  let l = Q.savePreset(st, { name: "Waves", units: ["m14"], weights: { m14: 100 }, count: 5 });
  assert.deepEqual(l.map((p) => [p.name, p.last]), [["Waves", true], ["Forces", false]]);
  l = Q.markUsed(st, "Forces"); assert.equal(l.find((p) => p.last).name, "Forces");
  assert.deepEqual(Q.deletePreset(st, "Waves").map((p) => p.name), ["Forces"]);
});
test("session record and profile feed weak areas and the teacher summary", () => {
  const ans = [{ id: "a", slug: "m04-l01", result: "wrong", how: "self", flag: true, viewed: true, interacted: true },
               { id: "b", slug: "m04-l01", result: "skipped", viewed: true }, { id: "c", slug: "m05-l01", result: "right", how: "self", viewed: true }];
  const p = Q.mergeProfile(null, Q.sessionRecord({ units: ["m4", "m5"] }, ans, 1));
  assert.deepEqual(p.modules, [4, 5]); assert.equal(p.viewed, 3); assert.equal(p.interacted, 1); assert.deepEqual(p.flagged, ["a"]);
  assert.deepEqual(Q.weakAreas(p).map((w) => w.slug), ["m04-l01"]);
  assert.match(Q.teacherSummary(p), /1 quiz session, modules 4, 5; 3 questions viewed, 1 interacted; 1 flagged; struggling: M04-L01/);
  assert.equal(Q.teacherSummary(null), "No Custom Quiz sessions yet.");
  let big = p; for (let i = 0; i < 30; i++) big = Q.mergeProfile(big, Q.sessionRecord({ units: ["m4"] }, ans, i));
  assert.equal(big.sessions.length, 20);
});
test("library wiring: button next to Practice Questions, no new art packs, no rules touched", () => {
  const h = readFileSync(new URL("../public/study-physics101.html", import.meta.url), "utf8");
  assert.ok(h.indexOf('id="cqBtn"') > h.indexOf('id="pqBtn"')); assert.match(h, /cq-app\.js/); assert.match(h, /physics101\/cq\.css/);
  const ui = readFileSync(new URL("../public/physics101/cq-app.js", import.meta.url), "utf8");
  assert.match(ui, /renderItem/); assert.doesNotMatch(ui, /sq\/art\//);
  const css = readFileSync(new URL("../public/physics101/cq.css", import.meta.url), "utf8");
  assert.match(css, /\.cq-quizzing \.sq-answer/); assert.match(css, /prefers-reduced-motion/);
  assert.ok(existsSync(new URL("../docs/physics101-custom-quiz.md", import.meta.url)));
});
test("Leo's studio pack: 27 assets, one JSON + one CSS, every id the app uses exists", () => {
  const dir = new URL("../public/physics101/custom-quiz/", import.meta.url);
  assert.deepEqual(readdirSync(dir).sort(), ["custom-quiz-ui.css", "custom-quiz-ui.json"]);
  const pack = JSON.parse(readFileSync(new URL("custom-quiz-ui.json", dir)));
  assert.equal(Object.keys(pack).length, 27);
  for (const v of Object.values(pack)) assert.match(v.light, /^<svg/);
  const app = readFileSync(new URL("../public/physics101/cq-app.js", import.meta.url), "utf8");
  for (const [, id] of app.matchAll(/art\("(cq-[a-z-]+)"/g)) assert.ok(pack[id], id);
});
