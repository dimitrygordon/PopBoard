// Stellar Life Cycle VR: data, stage order, caption and boundary rules (science spec v1 sections 6 and 7,
// teaching spec v1.3, LOOK-SPEC v2). Pure node: no browser, no three.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { prepareTracks, atEEP, eepAtAge, wdAt, typeLabel, isRSG, shellsStart, splitCaption, stagesFor, msRatio, about, MASSES } from "../public/stellar-life/sl-data.js";
import { createFlow } from "../public/stellar-life/sl-flow.js";
import { scaleBar, zoomText } from "../public/stellar-life/sl-scenes.js";
import { lutData, tRGB255 } from "../public/stellar-life/sl-strokes.js";
import { temperatureToSRGB } from "../public/night-sky/ns-astro.js";

const pub = new URL("../public/", import.meta.url);
const read = (p) => readFileSync(new URL(p, pub), "utf8");
const S = JSON.parse(read("stellar-life/data/stages.json"));
const J = JSON.parse(read("stellar-life/data/tracks.json"));
const T = prepareTracks(J);

test("house style: no em dashes, en dashes or curly quotes in any shipped file", () => {
  const files = ["study-stellar-life.html", ...readdirSync(new URL("stellar-life/", pub)).filter((f) => /\.(js|css)$/.test(f)).map((f) => "stellar-life/" + f), "stellar-life/data/stages.json"];
  for (const f of files) { const s = read(f); for (const ch of ["\u2014", "\u2013", "\u2018", "\u2019", "\u201C", "\u201D"]) assert.ok(!s.includes(ch), `${f} contains U+${ch.charCodeAt(0).toString(16)}`); }
});

test("five masses, no brown dwarf; stage order per mass (teaching spec section 2)", () => {
  assert.deepEqual(MASSES, ["0.2", "1", "3", "15", "40"]);
  const ids = (m) => stagesFor(S, m).map((s) => s.id).join(" ");
  assert.equal(ids("0.2"), "F1 F2 F3 F4 F5 R1 R2 R3");
  assert.equal(ids("1"), "F1 F2 F3 F4 F5 S1 S2 S3 S4 S5 S6 S7");
  assert.equal(ids("3"), "F1 F2 F3 F4 F5 T1 T2 T3 T4 T5 T6");
  assert.equal(ids("15"), "F1 F2 F3 F4 F5 H1 H2 H3 H4 H5 H6");
  assert.equal(ids("40"), "F1 F2 F3 F4 F5 V1 V2 V3 V4 V5 V6");
});

test("captions: every card is at most two sentences, every stage has a caption", () => {
  for (const m of MASSES) for (const s of stagesFor(S, m)) {
    assert.ok(s.caption && s.caption.length > 10, `${m} ${s.id} caption`);
    for (const c of splitCaption(s.caption)) assert.ok((c.match(/[.!?](\s|$)/g) || []).length <= 2, `${m} ${s.id}: ${c}`);
  }
});

test("misconceptions 1 to 15 are each tagged on at least one stage", () => {
  const ids = new Set(); for (const m of MASSES) for (const s of stagesFor(S, m)) for (const x of s.mis || []) ids.add(x);
  for (let i = 1; i <= 15; i++) assert.ok(ids.has(i), `misconception ${i}`);
});

test("1 Sun track: today's Sun matches measured values after the shift", () => {
  const r = atEEP(T["1"], eepAtAge(T["1"], 4.6e9));
  assert.ok(Math.abs(Math.pow(10, r.logT) - 5772) < 15, `Teff ${Math.pow(10, r.logT)}`);
  assert.ok(Math.abs(r.logL) < 0.01 && Math.abs(r.logR) < 0.01, `L ${r.logL} R ${r.logR}`);
  assert.ok(T["1"].shift && !T["3"].shift && !T["15"].shift, "only the 1 Sun track is shifted");
  assert.match(S.credit1Sun, /1 Sun track adjusted slightly/);
});

test("lifetimes from MIST at run time (T1 reveal, H1 reveal)", () => {
  assert.ok(msRatio(T, "3") > 20 && msRatio(T, "3") < 35);
  assert.ok(msRatio(T, "15") > 600 && msRatio(T, "15") < 1000);
  assert.ok(msRatio(T, "40") > msRatio(T, "15"));
  const f = createFlow(S, T); f.pickMass("3"); f.answerHub("white dwarf"); for (let i = 0; i < 3; i++) f.addPin({ logT: 3.7, logL: i }); f.start();
  f.enter(f.st.stages.findIndex((s) => s.id === "T1")); const a = f.stage().act.find((x) => x.code === "P");
  assert.equal(f.modelAnswer(a), "about 30");
});

test("rule T1: a stage with a prediction cannot play until the choice is committed; reveal never marks wrong", () => {
  const f = createFlow(S, T); f.pickMass("1"); f.answerHub("black hole"); for (let i = 0; i < 3; i++) f.addPin({ logT: 3.7, logL: i }); f.start();
  f.enter(f.st.stages.findIndex((s) => s.id === "S1")); assert.equal(f.st.phase, "predict"); f.tick(100); assert.equal(f.st.t, 0);
  const p = f.pending(); f.commit(p.i, p.a.choices[0]); while (f.pending()) { const q = f.pending(); f.commit(q.i, q.a.choices[0]); }
  assert.equal(f.st.phase, "play"); f.tick(1000); assert.equal(f.st.phase, "done");
  const json = JSON.stringify(S); assert.ok(!/\b(wrong|incorrect)\b/i.test(json), "no wrong or incorrect anywhere in the stage text");
});

test("help level 2 only from the URL; lock stops changes", () => {
  const f = createFlow(S, T); assert.equal(f.setHelp(2), false); assert.equal(f.st.help, 0); assert.equal(f.setHelp(2, true), true); assert.equal(f.st.help, 2);
  const g = createFlow(S, T, { lockHelp: true }); assert.equal(g.setHelp(1), false);
});

test("boundary rules: red supergiant label, shells start at EEP 707, MIST ends", () => {
  assert.equal(typeLabel("15", { phase: 3, logT: 3.55 }), "Red supergiant");
  assert.notEqual(typeLabel("15", { phase: 3, logT: 3.61 }), "Red supergiant");
  assert.notEqual(typeLabel("15", { phase: 0, logT: 3.55 }), "Red supergiant");
  assert.ok(isRSG({ phase: 2, logT: 3.59 }) && !isRSG({ phase: 1, logT: 3.59 }));
  for (const m of ["1", "3", "15"]) assert.equal(shellsStart(T[m]), 707, m);
  assert.ok(T["40"].end.age > 4.9e6 && T["40"].end.age < 5.1e6, "40 Suns MIST ends near 4.99 million years");
  assert.ok(T["0.2"].end.phase === 0 || T["0.2"].end.xh1 > 0, "0.2 Suns MIST ends on the main sequence");
  const h3 = S.tracks["15"].find((s) => s.id === "H3"); assert.equal(h3.seg.from.eep, 707);
});

test("dashed segments come only from drawn-not-modelled pieces: 0.2 after MIST, 40 after 4.99 Myr", () => {
  const run = (m, id, t) => { const f = createFlow(S, T); f.pickMass(m); f.answerHub("white dwarf"); for (let i = 0; i < 3; i++) f.addPin({ logT: 3.7, logL: i }); f.start(); f.enter(f.st.stages.findIndex((s) => s.id === id)); while (f.pending()) { const q = f.pending(); f.commit(q.i, (q.a.choices || ["Explode first"])[0]); } f.setT(t); return f.view(); };
  for (const [m, id] of [["1", "S5"], ["3", "T4"], ["15", "H2"], ["40", "V2"]]) assert.ok(run(m, id, 0.9).trail.every((s) => !s.dashed), `${m} ${id} solid`);
  const r2 = run("0.2", "R2", 0.5); assert.ok(r2.trail.some((s) => s.dashed) && r2.predictedLabel, "0.2 predicted dashed");
  const v3 = run("40", "V3", 0.5); assert.ok(v3.fork && !v3.dot, "40 Suns fork, no dot");
  const v6 = run("40", "V6", 0.5); assert.ok(v6.noDot && !v6.dot);
  const h6 = run("15", "H6", 0.5); assert.ok(h6.noDot && !h6.dot);
});

test("white dwarf cooling: Bedard 2020 sequences per mass and the cooling clock passes 13.8 billion years", () => {
  assert.equal(J.masses["1"].wd.seq, "seq_055_thick"); assert.equal(J.masses["3"].wd.seq, "seq_065_thick"); assert.equal(J.masses["0.2"].wd.seq, "seq_020_thick");
  const w0 = wdAt(T["1"], 0), w1 = wdAt(T["1"], 1);
  assert.ok(w1.logT < w0.logT && w1.logL < w0.logL, "cools and dims");
  assert.ok(w1.age > 13.8e9, "the S7 cooling clock runs past the age of the universe");
  assert.ok(Math.pow(10, w0.logR) < 0.03, "Earth-size");
});

test("colors: the star LUT is temperatureToSRGB (Night Sky), so hue follows Teff", () => {
  const { data, N } = lutData();
  for (const Tk of [3300, 5772, 12000, 40000]) {
    const u = (Math.log10(Tk) - 3) / 3; const i = Math.round(u * (N - 1)); const c = temperatureToSRGB(Math.pow(10, 3 + 3 * i / (N - 1)));
    for (let k = 0; k < 3; k++) assert.ok(Math.abs(data[4 * i + k] / 255 - Math.max(0, Math.min(1, c[k]))) < 0.01, `${Tk} K ch ${k}`);
  }
  const sun = tRGB255(5772); assert.ok(Math.min(...sun) > 225, "the Sun is white in space, not yellow");
});

test("scale bar and zoom labels are honest", () => {
  assert.equal(scaleBar(695700, 8).label, "10 Sun radii");
  assert.equal(scaleBar(1, 20).label, "20 km");
  assert.match(zoomText(695700, 69570), /^Zoomed in: now 10 times bigger$/);
  assert.match(zoomText(695700, 6957000), /^Zoomed out: now 10 times smaller$/);
  assert.equal(about(26.9, 1), "30");
});

test("the gallery lists the module and the H-R Diagram and Build a Star link to it", () => {
  const study = read("study.html"); assert.match(study, /id: "stellar-life",[\s\S]*?file: "study-stellar-life.html"/);
  assert.match(read("study-hrdiagram.html"), /study-stellar-life\.html/);
  assert.match(read("study-stars.html"), /id="lifeLink"[^>]*href="study-stellar-life\.html"/);
  const page = read("study-stellar-life.html"); assert.match(page, /isSessionSupported|sl-main\.js/); assert.match(read("stellar-life/sl-main.js"), /isSessionSupported\("immersive-vr"\)/);
  assert.match(page, /Bédard/); assert.match(page, /MIST v1\.2/); assert.match(page, /Woosley, Heger and Weaver 2002/);
});
