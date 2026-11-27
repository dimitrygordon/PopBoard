// Newton's Mountain state and URL tests (spec_v1 section 11.2) plus the strings rules.
import test from "node:test";
import assert from "node:assert/strict";
import { defaultState, parseQuery, serialize, reduce, bracket } from "../public/newtons-mountain/nm-state.js";
import * as S from "../public/newtons-mountain/nm-strings.js";
import { consts, runShot } from "../public/newtons-mountain/nm-sim.js";

test("defaults: 150 km, 2,000 m/s, help 0, mountain view, trail on, arrows off, warp auto, lesson constants, air off", () => {
  const s = parseQuery("");
  assert.deepEqual([s.h, s.vel, s.help, s.view, s.trail, s.velvec, s.gravec, s.warp, s.consts, s.air], [150, 2000, 0, "mountain", true, false, false, "auto", "lesson", false]);
  assert.equal(serialize(s), "");
});
test("every parameter round-trips", () => {
  const q = "h=400&vel=7762&help=2&view=model&trail=0&velvec=1&gravec=1&warp=50&consts=real&size=30&rings=iss,geo,moon&air=1&mass=1000&gdial=40&shots=5000,7000,7807,11500&lock=speed,height,help,air,vectors,view&lab=x1&ui=0&sound=1&debug=1&v=2";
  const s = parseQuery(q), back = parseQuery(serialize(s));
  assert.deepEqual({ ...back, extra: [] }, { ...s, extra: [] });
  assert.equal(new URLSearchParams(serialize(s)).get("shots"), "5000,7000,7807,11500");
  assert.deepEqual(s.shots, [5000, 7000, 7807, 11500]);
});
test("bad values fall back and never throw; unknown params survive", () => {
  const s = parseQuery("?h=999&vel=abc&help=7&gdial=500&view=sideways&warp=3&consts=moon&size=77&mass=5&lock=speed,bogus&zzz=1&zzz=2&shots=abc,99999,7000");
  assert.deepEqual([s.h, s.vel, s.help, s.gdial, s.view, s.warp, s.consts, s.size, s.mass], [150, 2000, 0, 100, "mountain", "auto", "lesson", null, 33]);
  assert.deepEqual(s.lock, ["speed"]); assert.deepEqual(s.shots, [7000]);
  assert.equal(serialize(s), "shots=7000&lock=speed&zzz=1&zzz=2");
  assert.doesNotThrow(() => parseQuery("%%%"));
});
test("locks block their groups", () => {
  let s = parseQuery("lock=speed,height,help,air,vectors,view");
  assert.equal(reduce(s, { type: "speedStep", delta: 100 }).vel, 2000); assert.equal(reduce(s, { type: "setSpeed", v: 5000 }).vel, 2000);
  assert.equal(reduce(s, { type: "setHeight", km: 8 }).h, 150); assert.equal(reduce(s, { type: "setHelp", level: 2 }).help, 0);
  assert.equal(reduce(s, { type: "toggle", key: "velvec" }).velvec, false); assert.equal(reduce(s, { type: "toggle", key: "air" }).air, false);
  assert.equal(reduce(s, { type: "setMass", kg: 1 }).mass, 33); assert.equal(reduce(s, { type: "toggleView" }).view, "mountain");
  s = parseQuery("");
  assert.equal(reduce(s, { type: "speedStep", delta: 100 }).vel, 2100); assert.equal(reduce(s, { type: "speedStep", delta: -99999 }).vel, 0); assert.equal(reduce(s, { type: "speedStep", delta: 99999 }).vel, 16000);
  assert.equal(reduce(s, { type: "toggleView" }).view, "model"); assert.equal(reduce(s, { type: "toggle", key: "gravec" }).gravec, true);
});
test("fire adds numbered shots, the ninth removes the oldest, height change clears and resets brackets, speed change does not", () => {
  let s = parseQuery("");
  for (let i = 0; i < 9; i++) s = reduce(s, { type: "fire" });
  assert.deepEqual(s.fired.map((f) => f.n), [2, 3, 4, 5, 6, 7, 8, 9]); assert.equal(Object.keys(s.results).length, 8);
  s = reduce(parseQuery(""), { type: "fire" }); s = reduce(s, { type: "result", n: 1, landed: true });
  assert.equal(bracket(s).highestLanded, 2000);
  assert.equal(reduce(s, { type: "speedStep", delta: 10 }).fired.length, 1);
  const t = reduce(s, { type: "setHeight", km: 400 }); assert.deepEqual([t.fired.length, bracket(t).highestLanded, t.h], [0, null, 400]);
  assert.equal(reduce(s, { type: "setHeight", km: 123 }).h, 150);
});
test("bracket lines from the sequence 7,000 / 7,761 / 7,762 / 7,900", () => {
  let s = parseQuery("");
  for (const [v, landed] of [[7000, true], [7761, true], [7762, false], [7900, false]]) { s = reduce(s, { type: "setSpeed", v }); s = reduce(s, { type: "fire" }); s = reduce(s, { type: "result", n: s.nextN - 1, landed }); }
  const b = bracket(s); assert.deepEqual([b.highestLanded, b.lowestNotLanded, b.gap], [7761, 7762, 1]);
  const l = S.bracketLines(b); assert.equal(l.landed, "Highest speed that landed: 7,761 m/s"); assert.equal(l.notLanded, "Lowest speed that did not land: 7,762 m/s"); assert.equal(l.gap, "Gap 1 m/s");
  const e = S.bracketLines(bracket(parseQuery(""))); assert.match(e.landed, /\u2013$/); assert.match(e.notLanded, /\u2013$/);
});
test("warp ladder steps turn Smart pace off; Auto turns it back on", () => {
  let s = parseQuery(""); s = reduce(s, { type: "setWarpNow", w: 50 });
  s = reduce(s, { type: "warpStep", dir: 1 }); assert.deepEqual([s.warp, s.warpNow], [100, 100]);
  s = reduce(s, { type: "warpStep", dir: -1 }); assert.equal(s.warp, 50); assert.equal(reduce(s, { type: "warpAuto" }).warp, "auto");
});

test("strings: wording from the spec, Tesla fixes, and no numbers hidden at level 0", () => {
  assert.equal(S.launchCard(7760), "Launch speed 7,760 m/s (7.76 km/s)");
  assert.equal(S.flagText(1, 2000, 366.7e3, 184.8), "1: 2,000 m/s, 367 km, 3 min 5 s");
  assert.equal(S.flagText(3, 7500, 4906.4e3, 659.1), "3: 7,500 m/s, 4,906 km, 11 min");
  const c = consts("lesson"), sh = { h: 150, v: 7762 };
  const fly = runShot({ ...c, h: 150e3, v: 7807 }, { stop: (q) => q.swept >= 2 * Math.PI * 1.4 });
  assert.match(S.resultLine({ h: 150, v: 7807 }, fly, 0, c), /^still flying after 1\.4 laps$/);
  assert.doesNotMatch(S.resultLine({ h: 150, v: 7807 }, fly, 1, c), /orbit|escape/i);
  assert.match(S.resultLine({ h: 150, v: 7807 }, fly, 2, c), /in orbit/);
  const lnd = runShot({ ...c, h: 150e3, v: 4000 }); assert.equal(S.resultLine({ h: 150, v: 4000 }, lnd, 0, c), "landed 826 km away after 3 min 28 s");
  const text = [...S.helpLines(0, c, 150e3).map((l) => l.h + " " + l.t), S.ARRIVE, S.NOT_TO_SCALE, ...S.CONTROLS_VR, ...S.CREDITS].join(" ");
  assert.doesNotMatch(text, /7[,.]?8\d\d|11[,.]?0\d\d|7\.9 km|11\.2 km|\borbit\b(?! Lab)|\bescape\b/i);
  const help = S.helpLines(0, c, 150e3).map((l) => l.t).join(" ");
  assert.match(help, /Straight-line distance to the horizon: 1,392 km/); assert.doesNotMatch(help, /little or none/);
  assert.match(S.AIR_NOTE, /very thin air, but not zero/);
  assert.doesNotMatch(Object.values(S).flat().filter((x) => typeof x === "string").join(" "), /[\u2014\u2013]\s/ ); // no spaced dashes in prose
});

import { TrailBuffer } from "../public/newtons-mountain/nm-trailbuf.js";
import { makeShot, stepShot } from "../public/newtons-mountain/nm-sim.js";
test("trail buffer: stays within 4,096 points, keeps the whole path, and thins by half when full", () => {
  const c = consts("lesson"), r0 = c.R + 150e3, vc = Math.sqrt(c.GM / r0);
  const s = makeShot({ ...c, h: 150e3, v: vc }), tb = new TrailBuffer(); let rebuilds = 0;
  tb.push(s.x, s.y, true);
  for (let i = 0; i < 5255 * 2 * 20; i++) { stepShot(s); if (tb.push(s.x, s.y) === "rebuild") rebuilds++; }
  assert.ok(tb.n <= 4096 && tb.n > 1000, "points " + tb.n); assert.ok(rebuilds >= 2, "rebuilds " + rebuilds);
  assert.ok(Math.hypot(tb.x(0), tb.y(0)) > 0 && Math.abs(tb.x(0) - r0) < 1e-6, "first point kept");
  let maxGap = 0; for (let i = 1; i < tb.n; i++) maxGap = Math.max(maxGap, Math.hypot(tb.x(i) - tb.x(i - 1), tb.y(i) - tb.y(i - 1)));
  assert.ok(maxGap < 0.05 * r0, "no big gaps: " + maxGap);
  const low = new TrailBuffer(); low.push(r0, 0, true); const lob = makeShot({ ...c, h: 150e3, v: 2000 }); while (lob.status === "flying") { stepShot(lob); low.push(lob.x, lob.y); }
  assert.ok(low.n > 20, "a 367 km lob still has " + low.n + " points");
});
