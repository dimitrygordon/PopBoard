// Stellar Life Cycle VR: data, stage order, caption and boundary rules (science spec v1 sections 6 and 7,
// teaching spec v1.3, LOOK-SPEC v2). Pure node: no browser, no three.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { prepareTracks, atEEP, eepAtAge, wdAt, typeLabel, isRSG, shellsStart, splitCaption, stagesFor, msRatio, about, fmtYears, MASSES } from "../public/stellar-life/sl-data.js";
import { createFlow } from "../public/stellar-life/sl-flow.js";
import { scaleBar, zoomText } from "../public/stellar-life/sl-scenes.js";
import { lutData, tRGB255, buildDisk, KIND } from "../public/stellar-life/sl-strokes.js";
import { createCompare, cardComplete, newCard, applyFrame, tierChoices, snapToZone, inZone, ZONES, compareEnd, COMPARE_TEXT, FRAME_TIER1, TICKET, lifeChoices } from "../public/stellar-life/sl-compare.js";
import { uiModel } from "../public/stellar-life/sl-ui.js";
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
  // teaching spec v1.4: "Zoomed out N times. Watch the scale bar." Only at 2 times or more; N to 1 or 2 significant figures
  assert.equal(zoomText(695700, 69570), "Zoomed in 10 times. Watch the scale bar.");
  assert.equal(zoomText(695700, 69570000), "Zoomed out 100 times. Watch the scale bar.");
  assert.equal(zoomText(1, 1.12), "", "a 1.12 times change is not labelled");
  assert.equal(zoomText(1, 1.9), "");
  assert.equal(zoomText(1, 2), "Zoomed out 2 times. Watch the scale bar.");
  assert.equal(zoomText(1, 1 / 3.7), "Zoomed in about 4 times. Watch the scale bar.");
  assert.equal(zoomText(1, 1234), "Zoomed out about 1,200 times. Watch the scale bar.");
  assert.equal(about(26.9, 1), "30");
});

test("the gallery lists the module and the H-R Diagram and Build a Star link to it", () => {
  const study = read("study.html"); assert.match(study, /id: "stellar-life",[\s\S]*?file: "study-stellar-life.html"/);
  assert.match(read("study-hrdiagram.html"), /study-stellar-life\.html/);
  assert.match(read("study-stars.html"), /id="lifeLink"[^>]*href="study-stellar-life\.html"/);
  const page = read("study-stellar-life.html"); assert.match(page, /isSessionSupported|sl-main\.js/); assert.match(read("stellar-life/sl-main.js"), /isSessionSupported\("immersive-vr"\)/);
  assert.match(page, /Bédard/); assert.match(page, /MIST v1\.2/); assert.match(page, /Woosley, Heger and Weaver 2002/);
});

test("disk follows the v4 layout: 61 washes and 145 marks in the plane, painted frost line only with planets", () => {
  const solar = buildDisk({ teff: 4410, seed: 7, planets: "solar" });
  const flatInBand = (D, lo, hi) => { let n = 0; for (let i = 0; i < D.disk.n; i++) { if (D.disk.kinds[i] !== KIND.FLAT) continue; const r = Math.hypot(D.disk.cent[3 * i], D.disk.cent[3 * i + 2]); if (r >= lo && r < hi) n++; } return n; };
  const flat = solar.disk.kinds.filter((k) => k === KIND.FLAT).length;
  assert.equal(flat, 61 + 145 + 14 + 7, "washes + marks + rim + frost arcs");
  assert.ok(flatInBand(solar, 0, 17.5 * 1.2) === flat, "every flat stroke sits inside the disk");
  assert.equal(solar.frost, 3.1);
  const bare = buildDisk({ teff: 4410, seed: 7, planets: null });
  assert.equal(bare.frost, null);
  assert.equal(bare.disk.kinds.filter((k) => k === KIND.FLAT).length, 61 + 145 + 14);
});

test("caption splitter never breaks after a digit or an abbreviation (Tesla F4)", () => {
  const h6 = stagesFor(S, "15").find((x) => x.id === "H6").caption;
  assert.deepEqual(splitCaption(h6), [h6], "H6 stays one card with 1.4 Suns whole");
  assert.ok(splitCaption(h6)[0].includes("about 1.4 Suns in a ball about 12 km in radius"));
  assert.deepEqual(splitCaption("It has 0.7 Suns. It is small. Then 2.5 more. Mr. Dimitry says so."), ["It has 0.7 Suns. It is small.", "Then 2.5 more. Mr. Dimitry says so."]);
  assert.deepEqual(splitCaption("A cloud at 10 to 20 K. It glows."), ["A cloud at 10 to 20 K. It glows."]);
  // every caption with a decimal keeps the number whole in one card, and no card is lost
  for (const m of MASSES) for (const st of stagesFor(S, m)) {
    const cards = splitCaption(st.caption); assert.equal(cards.join(" "), st.caption.replace(/\s+/g, " ").trim(), `${m} ${st.id}: nothing dropped`);
    for (const d of st.caption.match(/\d+\.\d+/g) || []) assert.ok(cards.some((c) => c.includes(d)), `${m} ${st.id}: ${d} kept whole`);
  }
});

test("Tesla fixes: remnant masses, V5 and T5 wording, no 'Suns wide', no solar system claim", () => {
  const st = (m, id) => stagesFor(S, m).find((x) => x.id === id);
  assert.equal(st("40", "V6").massLabel, "about 10 Suns (example)");
  assert.equal(st("15", "H6").massLabel, "about 1.4 Suns");
  assert.ok(st("40", "V5").caption.endsWith("A few candidates have been seen, such as N6946-BH1, but none is confirmed yet."));
  assert.equal(st("3", "T5").caption, "A second swelling with strong winds, lasting several million years.");
  const all = [read("study-stellar-life.html"), read("stellar-life/data/stages.json"), ...readdirSync(new URL("stellar-life/", pub)).filter((f) => /\.js$/.test(f)).map((f) => read("stellar-life/" + f))].join("\n");
  assert.ok(!/suns wide/i.test(all), "no 'Suns wide' anywhere");
  assert.ok(!/solar system/i.test(read("stellar-life/data/stages.json")), "no caption calls the 3-core disk our solar system");
  for (const id of ["S7", "R3"]) { const c = st(id === "S7" ? "1" : "0.2", id).caption; assert.ok(!/(stops cooling|becomes a black dwarf|turns into a black dwarf)/i.test(c), id); }
  // the mass readout at a remnant is the remnant's, not the star's before collapse
  for (const [m, id, want] of [["40", "V6", "about 10 Suns (example)"], ["15", "H6", "about 1.4 Suns"]]) {
    const f = createFlow(S, T); f.pickMass(m); f.answerHub("black hole"); for (let i = 0; i < 3; i++) f.addPin({ logT: 3.8, logL: i }); f.start();
    f.enter(f.st.stages.findIndex((x) => x.id === id)); const M = uiModel(f); const mass = M.readouts.find((r) => r[0] === "Mass"); assert.equal(mass && mass[1], want);
  }
});

test("0.2 Suns R2: the late-life radius never exceeds its main-sequence size, and R2 holds one zoom with a same-scale ring", () => {
  const f = createFlow(S, T); f.pickMass("0.2"); f.answerHub("white dwarf"); for (let i = 0; i < 3; i++) f.addPin({ logT: 3.6, logL: -2 }); f.start();
  f.enter(f.st.stages.findIndex((x) => x.id === "R2")); const R0 = Math.pow(10, T["0.2"].end.logR);
  for (let t = 0; t <= 1; t += 0.05) { const v = f.view({ t }); assert.ok(Math.pow(10, v.row.logR) <= R0 * 1.0001, `t ${t}`); assert.ok(Math.abs(v.refR - R0) < 1e-9); }
  const r2 = stagesFor(S, "0.2").find((x) => x.id === "R2"); assert.equal(r2.ref, "msRing"); assert.equal(r2.zoomLock, true);
});

test("formation skip: none on the first track, offered after it, F4 fast version for massive stars, never past the HUB prediction", () => {
  const ready = (f, m) => { f.pickMass(m); f.answerHub("white dwarf"); for (let i = 0; i < 3; i++) f.addPin({ logT: 3.8, logL: i }); };
  const f = createFlow(S, T);
  assert.equal(f.canSkip(), false); f.st.skipFormation = true; ready(f, "1"); f.start();
  assert.equal(f.st.stages[0].id, "F1", "first track always plays formation, even if skip was set");
  assert.equal(uiModel({ ...f, st: { ...f.st, screen: "hub", hubStep: "pick" } }).toggles.some((t) => t.id === "skipForm"), false);
  f.finishRun(); assert.equal(f.canSkip(), true);
  const hubM = uiModel(f); assert.ok(hubM.toggles.some((t) => t.id === "skipForm"), "Skip is offered after the first track");
  // never past the HUB prediction: start refuses until H-End and all three pins are in
  f.st.skipFormation = true; f.pickMass("3"); assert.equal(f.start(), false); assert.equal(f.st.screen, "hub");
  f.answerHub("white dwarf"); assert.equal(f.start(), false); for (let i = 0; i < 2; i++) f.addPin({ logT: 3.8, logL: i }); assert.equal(f.start(), false);
  f.addPin({ logT: 3.8, logL: 2 }); assert.equal(f.start(), true);
  assert.equal(f.st.stages[0].id, "T1", "low mass skip drops F1 to F5");
  for (const m of ["15", "40"]) { f.finishRun(); ready(f, m); f.start(); const s0 = f.st.stages[0]; assert.equal(s0.id, "F4"); assert.equal(s0.dur, 20); assert.ok(s0.fast); assert.ok(!f.pending(), "the fast F4 has no prediction to hold it"); assert.equal(f.st.stages[1].id, m === "15" ? "H1" : "V1"); }
  f.finishRun(); f.st.skipFormation = false; ready(f, "1"); f.start(); assert.equal(f.st.stages[0].id, "F1", "Skip off plays formation again");
});

test("COMPARE: verbatim captions, two clocks, one shared log clock, lifetimes equal the MIST main sequence (T13)", () => {
  assert.equal(COMPARE_TEXT.setup, "Two stars, one difference: mass. Run them together.");
  assert.equal(COMPARE_TEXT.predict, "Which one will live longer? Which will be bluer? Which ends in a white dwarf?");
  assert.equal(COMPARE_TEXT.run, "Each star has its own clock. The bar at the bottom is a log clock, so each notch is 10 times longer.");
  const f = createFlow(S, T); assert.equal(f.openCompare(), false, "COMPARE comes after one track"); f.st.runs.push("1"); assert.equal(f.openCompare(), true);
  const C = f.cmp; C.toggle("1"); C.toggle("3"); assert.ok(C.coreOk()); assert.equal(C.begin(), true);
  const qs = C.questions(); assert.deepEqual(qs.map((q) => q.answer), ["1 Sun", "3 Suns", "both"]);
  assert.equal(f.cmp.c.step, "predict"); for (const q of qs) C.pick(q.id, q.choices[0]); assert.equal(C.c.step, "run", "the run waits for all three picks");
  C.tick(100); assert.equal(C.c.step, "done");
  const ro = C.readOff(); assert.deepEqual(ro.map((r) => r.end), ["white dwarf", "white dwarf"]);
  // spec v1.4: two rows per star, both from MIST; the Sun reads about 10 and about 11.5 billion years
  assert.equal(ro[0].life, "about 10 billion years"); assert.equal(ro[0].fusionEnd, "about 11.5 billion years");
  assert.equal(ro[1].life, "about 400 million years"); assert.equal(ro[1].fusionEnd, "about 470 million years");
  // the clock and the table agree: at the end of the run each star's clock reads its fusion end
  for (const [i, m] of ["1", "3"].entries()) assert.equal("about " + fmtYears(C.starAt(m, 1).age), ro[i].fusionEnd);
  assert.deepEqual(ro.map((r) => r.color), ["white", "blue-white"]);
  const M = uiModel(f); const lc = M.widgets.find((w) => w.kind === "logclock"); assert.ok(lc && lc.stars.length === 2 && lc.y1 - lc.y0 === 8);
  assert.equal(M.readouts.length, 2, "each star shows its own clock");
  // the 0.2 Sun runs to the MIST end, 1 and 3 to the end of their giant branches
  assert.equal(compareEnd(T["0.2"]), T["0.2"].eepMax); assert.ok(compareEnd(T["1"]) < T["1"].eepMax);
});

test("Mass Card: complete only with 1, 15, 40, a third mass and both blanks; same rule for every tier (T9)", () => {
  const card = newCard(); const fill = (m) => Object.assign(card.rows[m], { life: lifeChoices(T)[0], color: "white", end: "white dwarf" });
  ["1", "15", "40"].forEach(fill); card.decides = "how long it lives"; card.because = "heavy stars fuse fast";
  assert.equal(cardComplete(card), false, "needs a third mass"); fill("3"); assert.equal(cardComplete(card), true);
  card.because = "  "; assert.equal(cardComplete(card), false, "both blanks"); card.because = "x";
  card.rows["15"].end = ""; assert.equal(cardComplete(card), false, "every field of a core row");
  card.rows["15"].end = "neutron star"; card.rows["3"] = { life: "", color: "", end: "" }; fill("0.2"); assert.equal(cardComplete(card), true, "0.2 also counts as the third mass");
  // Tier 1 frame fills the same two blanks
  const c1 = newCard(); ["1", "15", "40", "3"].forEach((m) => Object.assign(c1.rows[m], { life: "a", color: "b", end: "c" }));
  c1.frame = ["bigger", "", "they fuse faster"]; applyFrame(c1); assert.equal(cardComplete(c1), false);
  c1.frame[1] = "shorter"; applyFrame(c1); assert.equal(cardComplete(c1), true);
  assert.equal(FRAME_TIER1, "The ___ the mass, the ___ the life, because ___.");
});

test("Tier 1 supports: two choices that keep the answer, highlighted zones pins snap to", () => {
  assert.deepEqual(tierChoices(["fusion", "gravity squeezing the gas", "a chemical fire"], "gravity squeezing the gas", 1), ["fusion", "gravity squeezing the gas"]);
  assert.deepEqual(tierChoices(["white dwarf", "neutron star", "black hole"], "black hole", 1), ["white dwarf", "black hole"]);
  assert.equal(tierChoices(["a", "b", "c"], "c", 2).length, 3, "tier 2 keeps three");
  // COMPARE white dwarf question: Tier 1 gets both and neither (the answer always stays)
  assert.deepEqual(tierChoices(["1 Sun", "3 Suns", "both", "neither"], "both", 1, ["both", "neither"]), ["both", "neither"]);
  assert.deepEqual(tierChoices(["1 Sun", "15 Suns", "both", "neither"], "1 Sun", 1, ["both", "neither"]), ["1 Sun", "both", "neither"]);
  const f = createFlow(S, T, { tier: 1 }); f.pickMass("40"); const M = uiModel(f); assert.deepEqual(M.question.choices.map((c) => c.label), ["white dwarf", "black hole"]);
  for (const p of [{ logT: 4.3, logL: 0 }, { logT: 3.3, logL: 5.5 }, { logT: 4.7, logL: -2.8 }, { logT: 3.65, logL: 2.5 }]) { const q = snapToZone(p); assert.ok(ZONES.some((z) => inZone(z, q)), JSON.stringify(q)); }
  f.answerHub("black hole"); f.addPin({ logT: 4.3, logL: 0 }); assert.ok(f.st.pins[0].zone, "tier 1 pin snapped"); 
  const g = createFlow(S, T); g.pickMass("1"); g.answerHub("white dwarf"); g.addPin({ logT: 4.3, logL: 0 }); assert.equal(g.st.pins[0].logT, 4.3, "tier 2 pins do not snap");
});

test("exit ticket wording is verbatim from teaching spec section 7", () => {
  assert.equal(TICKET.title, "Same cloud, three stars."); assert.equal(TICKET.clock, "Color in how long each star lives.");
  assert.equal(TICKET.hr, "Mark where each star spends most of its life."); assert.equal(TICKET.ends, "Draw a line from each star to its ending.");
  assert.equal(TICKET.line, "Mass decides ____"); assert.equal(TICKET.last, "What's confusing?");
  assert.deepEqual(TICKET.stars.map((s) => s.mass), ["0.2", "1", "15"]);
});

test("S7 (1 Sun) pauses at 13.8 billion years: Bedard radius 0.0132 Suns (9,180 km), about 5,800 K (Tesla B, Leo frame 2c)", () => {
  const f = createFlow(S, T); f.pickMass("1"); f.answerHub("white dwarf"); for (let i = 0; i < 3; i++) f.addPin({ logT: 3.8, logL: i }); f.start();
  f.enter(f.st.stages.findIndex((s) => s.id === "S7")); const h = f.holdT(); assert.ok(h > 0 && h < 1);
  const r = wdAt(T["1"], h); assert.equal(fmtYears(r.age), "13.8 billion years");
  assert.equal(about(Math.pow(10, r.logR), 3), "0.0132"); assert.equal(about(Math.pow(10, r.logR) * 695700, 3), "9,180"); assert.equal(about(Math.pow(10, r.logT), 2), "5,800");
  // the clock dwells at the hold, then keeps cooling
  f.setT(h - 1e-4); f.st.playing = true; f.st.phase = "play"; f.tick(0.1); assert.equal(f.st.t, h); f.tick(1); assert.equal(f.st.t, h); f.tick(2.5); f.tick(0.1); assert.ok(f.st.t > h);
  // other masses never hold
  const g = createFlow(S, T); g.pickMass("3"); g.answerHub("white dwarf"); for (let i = 0; i < 3; i++) g.addPin({ logT: 3.8, logL: i }); g.start(); g.enter(g.st.stages.length - 1); assert.equal(g.holdT(), null);
});

test("zoom labels name billions and trillions (H5 debris at 250 years to the 12 km neutron star)", () => {
  assert.equal(zoomText(0.5 * 9.4607e12, 1), "Zoomed in about 4.7 trillion times. Watch the scale bar.");
  assert.equal(zoomText(1, 3e9), "Zoomed out 3 billion times. Watch the scale bar.");
  assert.equal(zoomText(4e7, 1), "Zoomed in 40 million times. Watch the scale bar.");
});
