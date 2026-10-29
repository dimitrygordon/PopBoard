import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  createStreak, createPrediction, createChallenges, saveMedal, loadMedals, medalsFor, bestMedal, MEDAL_KEY,
  encodeState, decodeState, sanitizeState
} from "../public/shared/fun/fun-core.js";
import { GOALS, SHARE_SCHEMA } from "../public/projectile/projectile-fun.js";

const memStore = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), m }; };

test("streak counts up, resets gently to 0, keeps best", () => {
  const store = memStore();
  const s = createStreak({ moduleId: "x", store });
  s.record(true); s.record(true); s.record(true);
  assert.equal(s.count, 3);
  const r = s.record(false);
  assert.deepEqual(r, { count: 0, best: 3, correct: false });
  s.record(true);
  assert.equal(s.count, 1); assert.equal(s.best, 3);
  assert.equal(createStreak({ moduleId: "x", store }).best, 3, "best streak persists");
});

test("predict-then-run resolves once and feeds the streak", () => {
  const streak = createStreak({ store: memStore() });
  const p = createPrediction({ judge: (g, a) => g === a > 30, streak });
  assert.equal(p.resolve(50), null, "no guess, no judgement");
  p.predict(true); assert.equal(p.resolve(50).correct, true);
  p.predict(true); const r = p.resolve(10);
  assert.equal(r.correct, false); assert.equal(r.streak.count, 0);
  assert.equal(p.pending, false);
});

test("medals persist, dedupe, order by tier, survive bad JSON", () => {
  const store = memStore();
  assert.equal(saveMedal("projectile", "gold", store), true);
  assert.equal(saveMedal("projectile", "bronze", store), true);
  assert.equal(saveMedal("projectile", "gold", store), false);
  assert.deepEqual(medalsFor("projectile", store), ["bronze", "gold"]);
  assert.equal(bestMedal("projectile", store), "gold");
  assert.deepEqual(JSON.parse(store.getItem(MEDAL_KEY)), { projectile: ["bronze", "gold"] });
  assert.throws(() => saveMedal("projectile", "platinum", store));
  store.setItem(MEDAL_KEY, "{not json"); assert.deepEqual(loadMedals(store), {});
});

test("challenge engine earns each tier once and persists it", () => {
  const store = memStore(); const earnedCb = [];
  const goals = [{ tier: "bronze", check: (e) => e.v > 1 }, { tier: "silver", check: () => { throw new Error("bad"); } }];
  const eng = createChallenges({ moduleId: "m", goals, store, onEarn: (g) => earnedCb.push(g.tier) });
  assert.deepEqual(eng.report({ v: 0 }), []);
  assert.deepEqual(eng.report({ v: 2 }), ["bronze"]);
  assert.deepEqual(eng.report({ v: 2 }), [], "not re-earned");
  assert.deepEqual(earnedCb, ["bronze"]);
  assert.deepEqual(createChallenges({ moduleId: "m", goals, store }).earned(), ["bronze"]);
});

test("projectile goals: bronze needs hits in a row", () => {
  const eng = createChallenges({ moduleId: "projectile", goals: GOALS, store: memStore() });
  const hit = { mode: "target", hit: true }, miss = { mode: "target", hit: false };
  eng.report(hit); eng.report(hit); eng.report(miss); eng.report(hit); eng.report(hit);
  assert.deepEqual(eng.earned(), []);
  eng.report(hit); assert.deepEqual(eng.earned(), ["bronze"]);
  eng.report({ mode: "launch", h: 0, angle: 45, range: 40.79 });
  assert.ok(eng.earned().includes("silver"));
});

test("share link round trip, URL-safe, sanitized", () => {
  const st = { angle: 37.5, speed: 25, h: 15, ground: false, drag: true, g: 3.7, site: "tower", note: "é✓" };
  const hash = encodeState(st);
  assert.match(hash, /^#s=[A-Za-z0-9_-]+$/);
  assert.deepEqual(decodeState(hash), st);
  const clean = sanitizeState(decodeState(encodeState({ ...st, angle: 999, speed: "x", evil: 1, site: "moon" })), SHARE_SCHEMA);
  assert.deepEqual(clean, { angle: 90, h: 15, ground: false, drag: true, g: 3.7 });
  assert.equal(decodeState("#s=%%%"), null); assert.equal(decodeState(""), null); assert.equal(decodeState("#other"), null);
});

test("shared layer has no halos/outlines and wires into projectile + hub", () => {
  const css = readFileSync(new URL("../public/shared/fun/fun.css", import.meta.url), "utf8");
  assert.doesNotMatch(css, /outline|drop-shadow|box-shadow|text-shadow/);
  const html = readFileSync(new URL("../public/study-projectile.html", import.meta.url), "utf8");
  assert.match(html, /projectile\/projectile-fun\.js/);
  const hub = readFileSync(new URL("../public/study.html", import.meta.url), "utf8");
  assert.match(hub, /shared\/fun\/fun-badges\.js/);
});
