import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import * as P from "../public/periodic-table/pt-core.js";

const pub = new URL("../public/", import.meta.url);
const read = (n) => readFileSync(new URL(n, pub), "utf8");
const data = JSON.parse(read("periodic-table/pt-elements.json"));
const els = data.elements, Z = (z) => els[z - 1];

test("data loads: 118 elements in order, sourced, on an 18-column grid with f-block rows apart", () => {
  assert.equal(els.length, 118);
  els.forEach((e, i) => { assert.equal(e.z, i + 1); assert.ok(e.sym && e.name && e.x >= 1 && e.x <= 18 && e.y >= 1 && e.y <= 10 && e.y !== 8, e.sym); assert.equal(e.shells.reduce((a, b) => a + b, 0), e.z, e.sym); });
  assert.equal(new Set(els.map((e) => `${e.x},${e.y}`)).size, 118);
  assert.ok(els.filter((e) => e.y >= 9).length === 30);
  for (const k of ["properties", "isotopes"]) assert.match(data.sources[k], /https:\/\//);
  assert.ok(existsSync(new URL("../docs/periodic-table.md", import.meta.url)));
});
test("spot values match the sources (PubChem, IAEA)", () => {
  assert.equal(Z(32).sym, "Ge"); assert.equal(Z(32).mass, 72.63); assert.equal(Z(32).mp, 1211.4); assert.equal(Z(32).bp, 3106);
  assert.equal(Z(1).config, "1s1"); assert.equal(Z(79).name, "Gold"); assert.equal(Z(80).mp, 234.32);
  assert.equal(Z(33).iso.find((i) => i.A === 75).ab, 100);
  assert.equal(Z(43).decay, "ec"); assert.equal(Z(92).decay, "alpha"); assert.equal(Z(26).decay, "stable");
  assert.equal(els.filter((e) => e.decay === "stable").length, 80);
});
test("Sn has 10 stable isotopes (CIAAW); Leo's data counts only the 8 listed", { todo: "Leo: apply_tesla.py recounts stable from the capped isotope list" }, () => { assert.equal(Z(50).nStable, 10); });
test("Tesla rulings: phases, sublimation, EA classes, observationally stable", () => {
  assert.equal(P.stateAt(Z(2), 0), "liquid"); assert.equal(P.stateAt(Z(6), 4000), "solid"); assert.equal(P.stateAt(Z(6), 4100), "gas");
  for (let z = 100; z <= 118; z++) assert.equal(P.stateAt(Z(z), 293), "unknown", Z(z).sym);
  assert.equal(P.stateAt(Z(99), 293), "solid");
  assert.equal(Z(103).config.replace(/ \(predicted\)/, ""), "[Rn]5f14 7s2 7p1"); assert.equal(Z(103).configPredicted, true);
  assert.equal(Z(4).ea, null); assert.equal(P.eaMissing(Z(4)), "no stable anion"); assert.equal(P.eaMissing(Z(118)), "not well measured");
  assert.ok(els.every((e) => e.ea !== 0));
  assert.equal(Z(32).iso.find((i) => i.A === 76).st, "effectively_stable"); assert.equal(Z(32).nStable, 4); assert.equal(Z(82).nStable, 4);
  assert.equal(Z(82).iso.find((i) => i.A === 204).st, "observationally_stable");
  const ea = els.filter((e) => e.eakj != null).sort((a, b) => b.eakj - a.eakj)[0]; assert.equal(ea.sym, "Cl");
  assert.match(P.TRENDS.find((t) => t[0] === "ea")[4], /chlorine highest/); assert.equal(P.TRENDS[0][0], "cov");
  const n = (k) => els.filter((e) => e.decay === k).length; assert.deepEqual([n("stable"), n("alpha"), n("sf"), n("ec"), n("beta-")], [80, 27, 5, 4, 2]);
  assert.deepEqual(els.filter((e) => e.decay === "ec").map((e) => e.sym), ["Tc", "Pm", "At", "Fl"]);
  assert.equal(Z(108).mass, 278.15375); assert.equal(Z(107).mass, 278.15499); assert.equal(Z(109).mass, 282.16689); assert.equal(Z(111).mass, 286.17876);
  assert.match(Z(108).labels.atomic_mass, /Hs-278.*estimated \(AME2020 systematics\)/); assert.equal(Z(58).eaStatus, "approximate");
  assert.equal(Z(97).iso.find((i) => i.A === 248)?.st ?? "radioactive", "radioactive");
  assert.equal(Z(29).config, "[Ar]4s1 3d10"); assert.equal(Z(33).config, "[Ar]4s2 3d10 4p3");
});
test("temperature: phase at T follows melting and boiling points", () => {
  const room = els.map((e) => P.stateAt(e, 293));
  assert.deepEqual(els.filter((e, i) => room[i] === "liquid").map((e) => e.sym), ["Br", "Hg"]);
  assert.deepEqual(els.filter((e, i) => room[i] === "gas").map((e) => e.sym).sort(), ["Ar", "Cl", "F", "H", "He", "Kr", "N", "Ne", "O", "Rn", "Xe"]);
  assert.equal(P.stateAt(Z(80), 0), "solid"); assert.equal(P.stateAt(Z(26), 1811), "liquid"); assert.equal(P.stateAt(Z(26), 5778), "gas");
  assert.equal(P.stateAt(Z(74), 5778), "liquid"); // tungsten boils above the Sun's surface temperature
  assert.equal(P.stateAt(Z(33), 900), "gas"); assert.equal(P.stateAt(Z(33), 800), "solid"); // arsenic sublimes
  assert.equal(P.stateAt(Z(118), 293), "unknown");
  assert.deepEqual(P.PRESETS.map((p) => p[1]), [0, 273, 293, 373, 1811, 5778]);
});
test("trends, years and orbitals", () => {
  const r = P.trendRange(els, "en"); assert.equal(r[1], 3.98); assert.equal(P.trendLevel(Z(9), "en", r), 4); assert.equal(P.trendLevel(Z(2), "en", r), null);
  assert.ok(P.TRENDS.length >= 11 && P.TRENDS.every((t) => /^General trend/.test(t[4])));
  assert.ok(P.knownBy(Z(79), 1400)); assert.ok(!P.knownBy(Z(8), 1770)); assert.ok(P.knownBy(Z(8), 1774)); assert.equal(els.filter((e) => P.knownBy(e, 2010)).length, 118);
  assert.equal(P.defaultOrbital(Z(29).orbs).label, "4s"); assert.equal(P.defaultOrbital(Z(33).orbs).label, "4p"); assert.equal(P.defaultOrbital(Z(10).orbs).label, "2p");
  assert.ok(Z(33).orbs.at(-1).status === "empty");
  assert.deepEqual(P.subshells("1s2 2s2 2p3"), [{ n: 1, l: "s", e: 2 }, { n: 2, l: "s", e: 2 }, { n: 2, l: "p", e: 3 }]);
  assert.deepEqual(Object.values(P.ORBITALS).map((o) => o.length), [1, 3, 5, 7]);
  const pz = P.orbitalCloud("p", 2, 500); assert.equal(pz.length, 500);
  assert.ok(pz.every(([x, y, z, s]) => Math.hypot(x, y, z) <= 1.0001 && s === (z >= 0 ? 1 : -1))); // pz lobes split by sign along z
});
test("page: own library module, linked both ways with Atom Builder, light and dark, modes and drawer views", () => {
  const html = read("study-periodic-table-studio.html"), app = read("periodic-table/pt-app.js"), css = read("periodic-table/pt.css"), lib = read("study.html");
  assert.match(lib, /id: "periodic-table-studio"[^]*?file: "study-periodic-table-studio\.html"/);
  assert.match(read("study-atom-builder.html"), /id="ptLink"[^>]*href="study-periodic-table-studio\.html"/);
  assert.match(html, /id="atomLink"/); assert.match(html, /popboard\.periodic-table\.theme/);
  assert.match(read("periodic-table/pts-skin.css"), /\[data-theme="dark"\]\{[^}]*--pts-paper:#1F1D1A/); assert.match(html, /pts-skin\.css[^]*pt\.css/);
  assert.doesNotMatch(app + read("periodic-table/pt-core.js"), /electrical conductivity/i); // Turing: hidden until sourced
  for (const m of ["temperature", "trends", "year", "isotopes", "filters"]) assert.match(app, new RegExp(`\\["${m}",`));
  for (const v of ["bohr2d", "bohr3d", "qm"]) assert.match(app, new RegExp(`\\["${v}",`));
  assert.match(read("periodic-table/pt-three.js"), /vendor\/three\/three\.module\.min\.js/);
  assert.match(app, /prefers-reduced-motion/); assert.doesNotMatch(app + html + css + read("periodic-table/pt-core.js"), /\u2014|—/);
});
