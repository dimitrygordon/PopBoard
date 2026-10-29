import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import * as L from "../public/powers-of-ten/p10-logic.js";

const pub = new URL("../public/", import.meta.url);
const read = (n) => readFileSync(new URL(n, pub), "utf8");
const mem = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)) }; };

test("16 plates, ascending sizes, every WebP file present", () => {
  assert.equal(L.PLATES.length, 16);
  for (let i = 1; i < L.PLATES.length; i++) assert.ok(L.PLATES[i].size > L.PLATES[i - 1].size, L.PLATES[i].id);
  for (const p of L.PLATES) { assert.match(p.file, /\.webp$/); assert.ok(existsSync(new URL("powers-of-ten/plates/" + p.file, pub)), p.file); }
});
test("captions required by the spec are exact", () => {
  assert.equal(L.byId("atom").caption, "Nucleus enlarged; electrons form a cloud, not orbits.");
  assert.equal(L.byId("earth-moon").caption, "Not to scale.");
  assert.equal(L.byId("solar-system").caption, "Not to scale.");
  assert.equal(L.byId("solar-system").size, 1e13);
});
test("44 whole powers from 10^-16 to 10^27, all plate focus points inside", () => {
  assert.equal(L.POWERS.length, 44); assert.ok(L.POWERS.length >= 40);
  for (const p of L.PLATES) assert.ok(p.focus > L.Z_MIN && p.focus < L.Z_MAX, p.id);
});
test("crossfade weights sum to 1 and the focused plate is fully shown", () => {
  for (let z = L.Z_MIN; z <= L.Z_MAX; z += 0.07) {
    const w = L.plateWeights(z), s = w.reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(s - 1) < 1e-9, `z=${z}`); assert.ok(w.every((x) => x >= 0 && x <= 1));
  }
  L.PLATES.forEach((p, i) => { assert.equal(L.plateWeights(p.focus)[i], 1); assert.equal(L.dominantPlate(p.focus), i); });
});
test("plate size: FILL at focus and shrinks monotonically as the view grows", () => {
  for (const p of L.PLATES) {
    assert.ok(Math.abs(L.plateFraction(p, p.focus) - L.FILL) < 1e-12);
    let prev = Infinity; for (let d = -3; d <= 3; d += 0.1) { const f = L.plateFraction(p, p.focus + d); assert.ok(f < prev); prev = f; }
  }
});
test("detents: nearest whole power, momentum projection, clamped", () => {
  assert.equal(L.detentFor(2.4), 2); assert.equal(L.detentFor(2.6), 3);
  assert.equal(L.detentFor(2.4, 2), 3); // 2.4 + 2 * 0.499 = 3.40
  assert.equal(L.detentFor(26.9, 50), L.Z_MAX); assert.equal(L.detentFor(-15.9, -50), L.Z_MIN);
  assert.deepEqual(L.crossed(0.5, 3.2), [1, 2, 3]); assert.deepEqual(L.crossed(3.2, 0.5), [1, 2, 3]); assert.deepEqual(L.crossed(1.2, 1.8), []);
});
test("readout formatting", () => {
  assert.equal(L.formatPower(-16), "10\u207b\u00b9\u2076 m"); assert.equal(L.formatPower(27), "10\u00b2\u2077 m"); assert.equal(L.formatPower(0), "10\u2070 m");
  assert.equal(L.plainSize(1.27e7), "12,700 km"); assert.equal(L.plainSize(1e-3), "1 mm"); assert.equal(L.plainSize(1.7), "1.7 m"); assert.equal(L.plainSize(1e13), "10\u00b9\u00b3 m");
});
test("predictions: answers are rounded log ratios and always among the choices", () => {
  const want = { "person>earth": 7, "ant>person": 3, "atom>cell": 5, "earth>solar-system": 6 };
  for (const p of L.PREDICTIONS) {
    if (want[`${p.a}>${p.b}`] !== undefined) assert.equal(p.answer, want[`${p.a}>${p.b}`]);
    const c = L.choicesFor(p); assert.ok(c.includes(p.answer)); assert.ok(c.length >= 3 && c.every((x) => x > 0));
  }
});
test("Size Hunt: found within tolerance, next card differs", () => {
  const ant = L.byId("ant");
  assert.ok(L.huntFound(ant, Math.round(ant.focus))); assert.ok(!L.huntFound(ant, ant.focus + 1));
  for (let i = 0; i < 20; i++) assert.notEqual(L.nextHunt("ant", () => i / 20).id, "ant");
});
test("goals fire on their thresholds only", () => {
  const [b, s, g] = L.GOALS;
  assert.ok(!b.check({ type: "hunt", finds: 2 })); assert.ok(b.check({ type: "hunt", finds: L.FUN.bronzeHuntFinds }));
  assert.ok(!s.check({ type: "predict", streak: 2 })); assert.ok(s.check({ type: "predict", streak: 3 }));
  assert.ok(!g.check({ type: "stamps", count: 43 })); assert.ok(g.check({ type: "stamps", count: 44 }));
});
test("stamps persist, ignore out-of-range and count each power once", () => {
  const s = mem();
  assert.deepEqual(L.addStamps([0, 1, 1, 99, 2.5], s), { fresh: 2, count: 2 });
  assert.deepEqual(L.addStamps(L.POWERS, s), { fresh: 42, count: 44 });
  assert.equal(L.loadStamps(s).length, 44);
});
test("share schema clamps z and rejects unknown objects", async () => {
  const { sanitizeState } = await import("../public/shared/fun/fun-core.js");
  assert.deepEqual(sanitizeState({ z: 99, a: "ant", b: "dragon", ruler: true }, L.SHARE_SCHEMA), { z: 27, a: "ant", ruler: true });
});
test("page wiring: HTML, theme, study card, docs", () => {
  const html = read("study-powers-of-ten.html");
  for (const f of ["powers-of-ten/p10-ui.js", "powers-of-ten/powers-of-ten-theme.css", "shared/fun/fun.css"]) { assert.ok(html.includes(f)); }
  for (const f of ["p10-ui.js", "p10-render.js", "p10-logic.js", "powers-of-ten-theme.css"]) assert.ok(existsSync(new URL("powers-of-ten/" + f, pub)), f);
  assert.match(html, /data-mode="sandbox"/); assert.match(html, /id="themeBtn"/);
  assert.match(read("powers-of-ten/powers-of-ten-theme.css"), /\[data-theme="light"\]/);
  const study = read("study.html"); assert.match(study, /id: "powers-of-ten"/); assert.match(study, /file: "study-powers-of-ten.html"/);
  const doc = readFileSync(new URL("../docs/powers-of-ten-science.md", import.meta.url), "utf8"); assert.ok(doc.includes("TODO-TESLA"));
});
test("no em-dashes and no Jasper in module copy; no baked-in halo code", () => {
  const files = ["study-powers-of-ten.html", "powers-of-ten/p10-ui.js", "powers-of-ten/p10-logic.js", "powers-of-ten/p10-render.js", "powers-of-ten/powers-of-ten-theme.css"];
  for (const f of files) { const t = read(f); assert.ok(!t.includes("\u2014"), f + " em-dash"); assert.ok(!/jasper/i.test(t), f + " Jasper"); }
  for (const p of L.PLATES) assert.ok(!(p.caption + p.name + p.alt).includes("\u2014"));
  assert.ok(!/shadowBlur|drop-shadow/.test(read("powers-of-ten/p10-render.js") + read("powers-of-ten/powers-of-ten-theme.css")));
});
