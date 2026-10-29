import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import * as M from "../public/atom-builder/ab-model.js";
import { ART, CLOUD_RADII } from "../public/atom-builder/ab-scene.js";

const pub = new URL("../public/", import.meta.url);
const read = (n) => readFileSync(new URL(n, pub), "utf8");
const FILES = ["study-atom-builder.html", "atom-builder/ab-ui.js", "atom-builder/ab-model.js", "atom-builder/ab-scene.js", "atom-builder/atom-builder-theme.css"];

test("element, mass number and charge follow from the counts", () => {
  const d = M.describe({ p: 6, n: 6, e: 6 });
  assert.equal(d.el.symbol, "C"); assert.equal(d.A, 12); assert.equal(d.q, 0); assert.equal(d.nuclide, "Carbon-12"); assert.equal(d.kind, "Neutral atom");
  assert.equal(M.describe({ p: 11, n: 12, e: 10 }).chargeText, "+1");
  assert.equal(M.describe({ p: 17, n: 18, e: 18 }).chargeText, "\u22121");
  assert.equal(M.describe({ p: 0, n: 2, e: 0 }).el, null);
  assert.equal(M.element(20).name, "Calcium"); assert.equal(M.element(21), null);
});
test("stability table: known stable nuclides only", () => {
  for (const [p, n] of [[1, 0], [1, 1], [2, 2], [6, 6], [6, 7], [8, 8], [11, 12], [17, 18], [17, 20], [20, 20]]) assert.ok(M.isStable({ p, n }), `${p},${n}`);
  for (const [p, n] of [[1, 2], [2, 4], [4, 4], [6, 8], [11, 11], [0, 1]]) assert.ok(!M.isStable({ p, n }), `${p},${n}`);
});
test("unstable nucleus line shown to students (Tesla wording)", () => {
  assert.equal(M.describe({ p: 6, n: 9, e: 6 }).stability, "Unstable nucleus: it would change by radioactive decay (some take seconds, some take billions of years).");
  assert.equal(M.describe({ p: 6, n: 6, e: 6 }).stability, "Stable nucleus");
  assert.ok(M.isStable({ p: 20, n: 28 })); // Ca-48: observationally stable, listed as stable
});
test("Leo: nucleus stays within 35% of the cloud diameter, electrons stay in their cloud and off the nucleus", () => {
  assert.equal(M.CLOUD_1S, CLOUD_RADII[0]);
  for (const R of [60, 90, 120, 180, 260, 400]) { const S = Math.max(26, Math.min(56, R * 0.22));
    const radii = CLOUD_RADII.map((k) => k * R);
    for (let n = 1; n <= M.MAX_Z + M.MAX_N; n++) {
      const s = M.nucleonSize(n, S, R), nucR = M.nucleusRadius(n, s);
      assert.ok(s <= S && s > 0); assert.ok(2 * nucR <= M.NUCLEUS_FRAC * 2 * R + 1e-9, `n=${n} R=${R}`);
      if (n <= 12 && S * 0.36 * Math.sqrt(n) + S * 0.5 <= M.NUCLEUS_FRAC * R) assert.equal(s, S); // small nuclei keep full-size tokens
      for (let k = 0; k < radii.length; k++) { const [a, b] = M.electronBand(k, nucR, radii, S); assert.ok(a > nucR && b > a && b <= radii[k], `n=${n} R=${R} shell ${k}: ${a}..${b}`); }
    }
  }
  const ui = read("atom-builder/ab-ui.js"); assert.match(ui, /electronBand\(shell, nucleusRadius\(nuc\.length, nS\(\)\)/);
});
test("Leo: toasts sit in the header band, not over the atom", () => {
  const ui = read("atom-builder/ab-ui.js"), css = read("atom-builder/atom-builder-theme.css");
  assert.match(ui, /top: hud\.top \+ "px"/); assert.ok(!/\.toast \{[^}]*\+ 120px/.test(css));
});
test("sanitizing clamps and rounds", () => {
  assert.deepEqual(M.sanitizeAtom({ p: 99, n: -3, e: "4" }), { p: M.MAX_Z, n: 0, e: 4 });
  assert.deepEqual(M.sanitizeAtom({ p: NaN }), { p: 0, n: 0, e: 0 });
});
test("cloud filling 2, 8, 8 then the next", () => {
  assert.deepEqual(M.shellCounts(0), [0, 0, 0, 0]); assert.deepEqual(M.shellCounts(3), [2, 1, 0, 0]);
  assert.deepEqual(M.shellCounts(19), [2, 8, 8, 1]); assert.equal(M.SHELLS.length, CLOUD_RADII.length);
});
test("challenges: neutral carbon-12, an ion, an isotope", () => {
  const ev = (atom, iso = 0) => ({ type: "atom", atom, isotopesOfThis: iso });
  const [b, s, g] = M.GOALS; assert.deepEqual(M.GOALS.map((x) => x.tier), ["bronze", "silver", "gold"]);
  assert.ok(b.check(ev({ p: 6, n: 6, e: 6 }))); assert.ok(!b.check(ev({ p: 6, n: 7, e: 6 })));
  assert.ok(s.check(ev({ p: 11, n: 12, e: 10 }))); assert.ok(!s.check(ev({ p: 11, n: 12, e: 11 }))); assert.ok(!s.check(ev({ p: 11, n: 11, e: 10 })));
  assert.ok(g.check(ev({ p: 6, n: 7, e: 6 }, 2))); assert.ok(!g.check(ev({ p: 6, n: 7, e: 6 }, 1)));
});
test("collectible table only takes neutral stable atoms, once each", () => {
  let r = M.collect({}, { p: 6, n: 6, e: 6 }); assert.ok(r.fresh); assert.deepEqual(r.table[6], [12]);
  r = M.collect(r.table, { p: 6, n: 6, e: 6 }); assert.ok(!r.fresh);
  r = M.collect(r.table, { p: 6, n: 7, e: 6 }); assert.deepEqual(r.table[6], [12, 13]);
  assert.ok(!M.collect({}, { p: 6, n: 8, e: 6 }).fresh); assert.ok(!M.collect({}, { p: 6, n: 6, e: 5 }).fresh);
  assert.deepEqual(M.sanitizeTable({ 6: [12, 12, 99, "x"], 99: [1], foo: 3 }), { 6: [12] });
});
test("targets are reachable and the predictions judge stability", () => {
  const solve = { h1: { p: 1, n: 0, e: 1 }, he4: { p: 2, n: 2, e: 2 }, c12: { p: 6, n: 6, e: 6 }, c13: { p: 6, n: 7, e: 6 }, na1: { p: 11, n: 12, e: 10 }, cl1: { p: 17, n: 18, e: 18 } };
  for (const t of M.TARGETS) assert.ok(t.check(solve[t.id]), t.id);
  assert.ok(M.judgePrediction(true, true)); assert.ok(!M.judgePrediction(false, true));
});
test("Leo: clouds not orbits, no shell art, tiny electron, scale caption live", () => {
  assert.equal(M.SCALE_CAPTION, "Not to scale: the real nucleus is far tinier.");
  const ui = read("atom-builder/ab-ui.js"), scene = read("atom-builder/ab-scene.js");
  assert.match(ui, /\$\("scaleCap"\)\.textContent = SCALE_CAPTION/);
  assert.ok(!ART.includes("electron-cloud-shell")); assert.ok(!existsSync(new URL("atom-builder/art/electron-cloud-shell.webp", pub)));
  for (const f of FILES) assert.ok(!/electron-cloud-shell|\borbit(s|ing)?\b(?! ring| path)/i.test(read(f).replace(/never (travel|an orbit)[^\n]*/gi, "")), f);
  assert.ok(!/\.arc\([^)]*\)[^\n]*electron/i.test(scene)); // no rings drawn for electrons
  assert.match(scene, /token\("electron", [^)]*g\.S,/); // same draw box as protons: art dot is ~1/4 width
  assert.match(ui, /CAPTION_GAP = 12/); assert.match(ui, /artBottom \+ CAPTION_GAP/); assert.match(ui, /t\.y \+ t\.h \+ CAPTION_GAP/);
});
test("art: every asset ships as webp", () => { for (const n of ART) assert.ok(existsSync(new URL(`atom-builder/art/${n}.webp`, pub)), n); });
test("page wiring: modes, themes, phone sheet at half, study card, docs", () => {
  const html = read("study-atom-builder.html"), ui = read("atom-builder/ab-ui.js");
  for (const m of ["build", "sandbox", "table"]) assert.match(html, new RegExp(`data-mode="${m}"`));
  assert.match(html, /popboard\.atom-builder\.theme/); assert.match(read("atom-builder/atom-builder-theme.css"), /\[data-theme="light"\]/);
  assert.match(ui, /start: 1/); assert.match(ui, /dataset\.snap = "half"/);
  const study = read("study.html"); assert.match(study, /id: "atom-builder"/); assert.match(study, /file: "study-atom-builder.html"/);
  assert.ok(existsSync(new URL("../docs/atom-builder-science.md", import.meta.url)));
  assert.match(readFileSync(new URL("../docs/fun-challenges.md", import.meta.url), "utf8"), /## Atom Builder/);
});
test("no em-dashes and no Jasper in module copy", () => {
  const card = read("study.html").split('id: "atom-builder"')[1].split("}")[0];
  for (const t of [...FILES.map(read), card]) { assert.ok(!t.includes("\u2014")); assert.ok(!/jasper/i.test(t)); }
});
