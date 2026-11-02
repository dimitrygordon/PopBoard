import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const pub = new URL("../public/", import.meta.url);
const D = await import(new URL("atom-builder/ab-decay.js", pub));
const data = JSON.parse(readFileSync(new URL("atom-builder/ab-decay.json", pub)));
const dk = D.createDecay(data);

test("decay routes and daughters come from the IAEA data", () => {
  const c14 = dk.decayOf(6, 8); assert.equal(c14.mode.code, "B-"); assert.deepEqual([c14.daughter.p, c14.daughter.A], [7, 14]);
  const k40 = dk.decayOf(19, 21, { rand: () => 0 }); assert.equal(k40.mode.code, "B-"); assert.equal(k40.branch, 89.28); assert.equal(k40.daughter.symbol, "Ca");
  const be8 = dk.decayOf(4, 4); assert.equal(be8.mode.code, "A"); assert.deepEqual([be8.daughter.p, be8.daughter.n], [2, 2]);
  assert.equal(dk.decayOf(11, 11).daughter.symbol, "Ne");
  assert.equal(dk.decayOf(6, 6), null); assert.equal(dk.decayOf(20, 28), null); // Ca-48 observationally stable (Tesla)
  assert.deepEqual(dk.chain(6, 8).map((x) => x.p), [6, 7]);
});
test("instability score: 0 stable, rises as half-life shrinks", () => {
  assert.equal(dk.instability(6, 6), 0);
  assert.ok(dk.instability(19, 21) < dk.instability(6, 8) && dk.instability(6, 8) < dk.instability(4, 4));
  assert.equal(D.meterLevel(0), "calm"); assert.equal(D.meterLevel(0.9), "shaky");
});
test("charge badge and ion shorthand", () => {
  assert.equal(D.chargeBadge(20, 18).ion, "Ca\u00b2\u207a"); assert.equal(D.chargeBadge(17, 18).ion, "Cl\u207b");
  assert.equal(D.chargeBadge(6, 6).kind, "neutral"); assert.equal(D.chargeBadge(20, 18).text, "Charge: +2");
});
test("natural chains match Tesla's counts (from ENSDF-based data, not hand typed)", () => {
  const n = (k, m) => data.chains[k].filter((x) => x[3] === m).length;
  assert.deepEqual([n("U-238", "A"), n("U-238", "B-")], [8, 6]); assert.equal(data.chains["U-238"].at(-1)[2], "Pb-206");
  assert.deepEqual([n("Th-232", "A"), n("Th-232", "B-")], [6, 4]); assert.equal(data.chains["Th-232"].at(-1)[2], "Pb-208");
  assert.deepEqual([n("U-235", "A"), n("U-235", "B-")], [7, 4]); assert.equal(data.chains["U-235"].at(-1)[2], "Pb-207");
});
test("decay is student-initiated only and wired in the page", () => {
  const ui = readFileSync(new URL("atom-builder/ab-ui.js", pub), "utf8");
  assert.match(ui, /btn\(d\.branches\.length > 1 \? "Allow decay" : `Allow decay/); assert.equal((ui.match(/allowDecay\(\)/g) || []).length, 2); // the definition and Replay; nothing calls it on a timer
  assert.match(readFileSync(new URL("study-atom-builder.html", pub), "utf8"), /ab-living\.css[^]*abCharge[^]*abMeter[^]*abLocator/);
  for (const f of ["atom-builder/ab-ui.js", "atom-builder/ab-decay.js", "atom-builder/ab-living.css"]) assert.doesNotMatch(readFileSync(new URL(f, pub), "utf8"), /\u2014/);
});

test("Leo pack: meter thresholds, Pa-234m chain, ion stubs, step back, dashed slots", async () => {
  const { meterLevel } = await import("../public/atom-builder/ab-decay.js");
  assert.deepEqual([0, 0.34, 0.35, 0.69, 0.7, 1].map(meterLevel), ["calm", "calm", "mid", "mid", "shaky", "shaky"]);
  const D = JSON.parse(readFileSync(new URL("../public/atom-builder/ab-decay.json", import.meta.url)));
  assert.ok(D.chains["U-238"].some((x) => x[2] === "Pa-234m"));
  assert.equal(D.chains["U-238"].at(-1)[2], "Pb-206");
  const skin = JSON.parse(readFileSync(new URL("../public/atom-builder/ab-skin-assets.json", import.meta.url)));
  for (const id of ["na-p1", "k-p1", "mg-p2", "ca-p2", "al-p3", "f-m1", "cl-m1", "o-m2", "s-m2"]) for (const t of ["light", "dark"]) assert.match(skin.svg[t]["ab-stub-" + id], /^<svg/);
  for (const k of ["alpha", "beta", "gamma", "ec"]) assert.ok(skin.svg.dark["ab-particle-" + k]);
  const ui = readFileSync(new URL("../public/atom-builder/ab-ui.js", import.meta.url), "utf8"), sc = readFileSync(new URL("../public/atom-builder/ab-scene.js", import.meta.url), "utf8");
  assert.match(ui, /function stepBack\(\)/); assert.match(ui, /slots: shellCounts/); assert.match(sc, /st\.slots/);
});

test("Tesla re-stamp: Be-6, Ca-48, Pa-234m, Bi-214 hidden, K-40 random by %, unmeasured branches", () => {
  const DD = JSON.parse(readFileSync(new URL("atom-builder/ab-decay.json", pub))), dc = D.createDecay(DD);
  const be6 = dc.decayOf(4, 2); assert.equal(be6.branches.length, 1); assert.equal(be6.mode.label, "breaks into helium-4 + 2 protons"); assert.deepEqual([be6.daughter.p, be6.daughter.A], [2, 4]);
  assert.equal(dc.decayOf(4, 4).mode.label, "splits into two helium-4 nuclei in about 1e-16 s");
  assert.deepEqual(DD.iso["20-48"][3], [["2B-", null, 22, 48]]); assert.match(DD.notes["20-48"], /NEMO-3/);
  const u = DD.chains["U-238"]; assert.equal(u[u.findIndex((x) => x[2] === "Th-234") + 1][2], "Pa-234m");
  const k = (r) => dc.decayOf(19, 21, { rand: () => r }).daughter.p; assert.equal(k(0.5), 20); assert.equal(k(0.95), 18);
  assert.equal(dc.decayOf(19, 21, { pick: 1 }).daughter.p, 18); assert.equal(dc.decayOf(19, 21).branches.length, 2);
  const ui = readFileSync(new URL("atom-builder/ab-ui.js", pub), "utf8");
  assert.match(ui, /y\[1\] >= 0\.01/); assert.match(ui, /branch not measured/); assert.match(ui, /not a bound nucleus, falls apart almost instantly/i); assert.match(ui, /You picked it; nature picks randomly/);
});

test("Tesla final stamp: tiny branches hidden, Ca-48 caption, proton/neutron emission charge notes", () => {
  const ui = readFileSync(new URL("atom-builder/ab-ui.js", pub), "utf8");
  assert.match(ui, /b\.pct >= 0\.01/); assert.match(ui, /Observationally stable here: it decays by double beta decay with t1\/2 about 6\.4e19 y \(NEMO-3\)/);
  const c = D.chargeNote;
  assert.equal(c("2P", 0, -2), "2 protons flew off, so the atom now has charge -2.");
  assert.equal(c("N", 0, 0), "A neutron flew off; the charge stays 0.");
  assert.match(c("B-A", 0, -1), /^A neutron turned into a proton .*, then an alpha particle .* flew off, so the atom now has charge -1\.$/);
  const EC = "A proton captured one of the atom's own electrons and turned into a neutron (electron capture), so the atom lost one proton and one electron together";
  assert.equal(c("EC", 0, 0), EC + "; the charge stays 0.");
  assert.equal(c("ECP", 0, -1), EC + ", then a proton flew off, so the atom now has charge -1.");
  assert.match(c("ECA", 0, -2, true), /electron together, then an alpha particle .* charge -2\. \(a rare route, under 0\.01 %\)$/);
  assert.equal(c("B+", 0, -1), "A proton turned into a neutron (a positron and a neutrino fly off), so the atom now has charge -1.");
  assert.match(c("EC+B+", 0, -1), /charge -1\. \(If this was electron capture instead, the atom used up one of its own electrons and stays at charge 0\.\)$/);
  assert.match(ui, /e2 = \/\^EC\(\\d\?\[PA\]\)\?\$\/\.test\(d\.mode\.code\) \? Math\.max\(0, a\.e - 1\) : a\.e/);
  assert.match(c("B-P", 0, 0), /antineutrino fly off\), then a proton flew off; the charge stays 0\./);
  assert.match(ui, /chargeNote\(d\.mode\.code, a\.p - a\.e, q, d\.branch != null && d\.branch < 0\.01\)/);
});
