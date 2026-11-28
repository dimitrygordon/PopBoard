// Equation panel and worked problems. Forces stay in newtons.
//   node --test tests/gf-panel.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  GF, pull, weighN, issAt, surfaceG, moonDistanceRatio, accelOf,
} from "../public/gravity-force/gf-sim.js";
import {
  workedProblems, formatAnswer, equationModel, panelMarkup, renderPanel, renderAnswerKey,
  answerKeyMarkup, helpButtons, formatNewtons,
} from "../public/gravity-force/gf-panel.js";
import { flags } from "../public/gravity-force/gf-state.js";

const byId = () => Object.fromEntries(workedProblems().map((p) => [p.id, p]));
const earth = GF.worlds.earth;
const moon = GF.worlds.moon;

test("worked-problem numbers are the gf-sim values", () => {
  const p = byId();
  const b1 = weighN("earth", GF.travelerKg);
  assert.equal(p.B1.value, b1);
  assert.equal(p.B1.mg, GF.travelerKg * GF.gCompare);
  assert.equal(p.B2.value, pull(earth.massKg, moon.massKg, GF.earthMoonM));
  assert.equal(p.B3.value, pull(50, 60, 1));
  assert.equal(p.B3.ratio, b1 / p.B3.value);
  assert.equal(p.B4.value, pull(GF.sunMassKg, earth.massKg, GF.auM));
  assert.equal(p.B5.value, issAt(400).pull);
  assert.equal(p.B6.value, accelOf(moon.massKg, earth.massKg, GF.earthMoonM));
  assert.equal(p.B6.earthAccel, accelOf(earth.massKg, moon.massKg, GF.earthMoonM));
  assert.equal(p.B7.value, weighN("ns", 50));
  assert.equal(p.A3.values[1], b1 / 4);
  assert.equal(p.A4.values[0], moonDistanceRatio());
  assert.equal(p.E1.value, pull(GF.satelliteKg, earth.massKg, GF.satelliteRM));
  assert.deepEqual(p.A1.values, [1 / 4, 1 / 9, 4]);
  assert.deepEqual(p.A2.values, [2, 4, 1.5]);
});

test("printed answer key matches the section 6.3 lines", () => {
  const p = byId();
  assert.equal(p.A1.fullText, "1/4. 1/9. 4 times.");
  assert.equal(p.A2.fullText, "x2. x4. x1.5.");
  assert.match(p.A3.fullText, /^1\/4 of the ground value\. \(491 N becomes about 123 N\.\)$/);
  assert.match(p.A4.fullText, /About 1\/3,600 \(1\/3,640 using 60\.34 radii\)/);
  assert.match(p.B1.fullText, /^491 N\. m g = 490 N\./);
  assert.equal(p.B2.fullText, "1.98 x 10^20 N");
  assert.match(p.B3.fullText, /^2\.0 x 10\^-7 N\. Earth's pull on the student \(491 N\) is 2\.45 x 10\^9 times as large\./);
  assert.match(p.B3.fullText, /0\.02 mg speck/);
  assert.equal(p.B4.fullText, "3.54 x 10^22 N");
  assert.match(p.B5.fullText, /^435 N, which is 88\.5 percent of 491 N\.$/);
  assert.match(p.B6.fullText, /Moon: 2\.70 x 10\^-3 m\/s\^2\. Earth: 3\.32 x 10\^-5 m\/s\^2\./);
  assert.match(p.B6.fullText, /81\.3/);
  assert.match(p.B7.fullText, /About 6\.5 x 10\^13 N/);
  assert.match(p.B7.prompt, /12 km in radius, about 24 km across/);
  assert.equal(p.E1.fullText, "8.13 x 10^3 N");
});

test("help level gates equation strings", () => {
  const input = {
    m1: GF.travelerKg,
    m2: earth.massKg,
    r: earth.radiusM,
    previous: { m1: GF.travelerKg, m2: earth.massKg, r: earth.radiusM / 2 },
  };
  const hidden = equationModel({ ...input, help: 0 });
  assert.equal(hidden.visible, false);
  assert.equal(hidden.text, "");
  assert.equal(hidden.force, null);
  assert.deepEqual(hidden.tiles, []);

  const ratio = equationModel({ ...input, help: 1 });
  assert.equal(ratio.visible, true);
  assert.match(ratio.text, /proportional to m1 x m2 \/ r\^2/);
  assert.equal(ratio.force, null);
  assert.equal(ratio.tiles.some((t) => t.id === "G"), false);
  assert.ok(ratio.notes.some((n) => n.tile === "r" && /r\^2 x/.test(n.text)));

  const full = equationModel({ ...input, help: 2 });
  assert.match(full.text, /F = G x m1 x m2 \/ r\^2 = 491 N/);
  assert.equal(full.force, weighN("earth", 50));
  assert.equal(full.tiles[0].id, "G");

  const z = panelMarkup({ ...input, help: 0 });
  const one = panelMarkup({ ...input, help: 1 });
  const two = panelMarkup({ ...input, help: 2 });
  assert.doesNotMatch(z, /equation/i);
  assert.doesNotMatch(z, /newton/i);
  assert.doesNotMatch(z, /\bG\b/);
  assert.doesNotMatch(z, /\bN\b/);
  assert.match(one, /proportional/);
  assert.doesNotMatch(one, /newton/i);
  assert.doesNotMatch(one, /\bG\b/);
  assert.doesNotMatch(one, /\bN\b/);
  assert.match(one, /1\/4\. 1\/9\. 4 times\./);
  assert.doesNotMatch(one, /123 N/);
  assert.match(two, /\bG\b/);
  assert.match(two, /\bN\b/);
  assert.match(two, /491 N/);
  assert.match(two, /1\.98 x 10\^20 N/);

  assert.equal(formatAnswer("B1", 0), "");
  assert.equal(formatAnswer("B1", 1), "");
  assert.match(formatAnswer("B1", 2), /491 N/);
  assert.match(formatAnswer("A3", 1), /1\/4 of the ground value/);
  assert.doesNotMatch(formatAnswer("A3", 1), /\bN\b/);
  assert.match(formatAnswer("A3", 2), /123 N/);

  const el = { innerHTML: "" };
  const html = renderPanel(el, { ...input, help: 2 });
  assert.equal(el.innerHTML, html);
  assert.match(el.innerHTML, /data-help="2"/);
});

test("Jupiter's traveler pull prints as 1,240 N on the panel", () => {
  const n = weighN("jupiter", GF.travelerKg);
  assert.equal(formatNewtons(n), "1,240 N");
  const html = panelMarkup({
    help: 2,
    m1: GF.travelerKg,
    m2: GF.worlds.jupiter.massKg,
    r: GF.worlds.jupiter.radiusM,
  });
  assert.match(html, /1,240 N/);
  const shown = [
    html,
    answerKeyMarkup(),
    ...workedProblems().flatMap((p) => [p.prompt, p.fullText, p.ratioText, p.setup || ""]),
  ].join("\n");
  assert.equal(shown.includes("1,239"), false);
});

test("the Help tab follows the help flag and lock", () => {
  const open = helpButtons({ help: 0, lock: [] });
  assert.deepEqual(open.map((b) => b.enabled), [true, true, true]);
  const locked = helpButtons({ help: 1, lock: ["help"] });
  assert.deepEqual(locked.map((b) => [b.level, b.enabled]), [[0, false], [1, true], [2, false]]);
  flags.HELP2_REQUIRES_URL = true;
  try {
    const gated = helpButtons({ help: 0, lock: [] });
    assert.equal(gated.find((b) => b.level === 2).enabled, false);
    assert.equal(gated.find((b) => b.level === 1).enabled, true);
    assert.match(panelMarkup({ help: 0 }), /data-help-level="2"[^>]*disabled/);
  } finally {
    flags.HELP2_REQUIRES_URL = false;
  }
});

test("no pound wording in the panel, the key, or the module source", () => {
  const src = readFileSync(fileURLToPath(new URL("../public/gravity-force/gf-panel.js", import.meta.url)), "utf8");
  const blobs = [
    src,
    panelMarkup({ help: 0, m1: 50, m2: 60, r: 1 }),
    panelMarkup({ help: 1, m1: 50, m2: 60, r: 1 }),
    panelMarkup({ help: 2, m1: 50, m2: earth.massKg, r: earth.radiusM }),
    answerKeyMarkup(),
    renderAnswerKey({ innerHTML: "" }),
    ...workedProblems().flatMap((p) => [p.prompt, p.fullText, p.ratioText, p.setup || ""]),
  ];
  for (const blob of blobs) {
    assert.equal(/pound/i.test(blob), false);
    assert.equal(/\blb\b/i.test(blob), false);
  }
});
