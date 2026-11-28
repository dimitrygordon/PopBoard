// Stellar Life Cycle VR: one UI model for both renderers (the page panel on desktop and phone, and the headset panel).
import { MASSES, MASS_LABEL, fmtYears, about, splitCaption } from "./sl-data.js";
import { COMPARE_TEXT, tierChoices, lifeChoices, COLOR_WORDS, END_WORDS, cardComplete, rowFilled, sentenceText, modelRow, FRAME_TIER1, FRAME_WORDS, logPos, LOGCLOCK, ZONES } from "./sl-compare.js";

export const MASS_TEFF = { "0.2": 3229, "1": 5772, "3": 12368, "15": 31293, "40": 43704 };   // ZAMS colours for the hub orbs (LOOK-SPEC 2 table)

export function uiModel(flow, x = {}) {
  const st = flow.st; const S = flow.S;
  const M = { screen: st.screen, help: st.help, calm: !!x.calm, chips: [], buttons: [], toggles: [], readouts: [], widgets: [], reveal: [], cards: [], credit: "", question: null };
  if (st.screen === "hub") {
    M.kicker = st.runs.length ? `Runs so far: ${st.runs.map((m) => MASS_LABEL[m]).join(", ")}` : "Life of a star";
    M.title = "Pick a starting mass";
    M.masses = MASSES.map((m) => ({ id: m, label: MASS_LABEL[m], teff: MASS_TEFF[m], on: st.mass === m, done: st.runs.includes(m) }));
    if (st.hubStep === "pick") M.cards = [S.hub[0].caption];
    if (st.hubStep === "end") { const a0 = S.hub[1].act[0]; M.cards = [S.hub[1].caption]; M.question = { key: "H-End", text: S.hub[1].caption, choices: tierChoices(a0.choices, a0.answerBy && a0.answerBy[st.mass], st.tier).map((c) => ({ label: c, picked: st.answers["H-End"] === c })) }; }
    if (st.hubStep === "pins" || st.hubStep === "ready") {
      M.cards = [S.hub[2].caption];
      const pins = S.hub[2].act[0].pins; M.pinPrompt = st.pins.length < 3 ? `Tap the H-R diagram: pin ${st.pins.length + 1}, ${pins[st.pins.length]}.` : "All three pins placed.";
      if (st.pins.length) M.buttons.push({ id: "pinUndo", label: "Undo pin" });
      if (st.tier === 1 && st.pins.length < 3) M.chips.push("Tap inside a highlighted zone. Your pin snaps to the nearest one.");
    }
    if (st.hubStep === "ready") M.buttons.push({ id: "start", label: `Start: ${MASS_LABEL[st.mass]}`, primary: true });
    if (flow.canSkip()) M.toggles.push({ id: "skipForm", label: "Skip formation", on: st.skipFormation });
    M.chips.push("Mr. Dimitry's core task: run 1, 15 and 40 Suns, then COMPARE the Sun with 0.2 or 3 Suns, then fill in the Mass Card.");
    if (flow.canCompare() && st.hubStep === "pick") { M.buttons.push({ id: "compare", label: "Compare two masses" }); M.buttons.push({ id: "card", label: cardComplete(st.card) ? "Mass Card (complete)" : "Mass Card" }); M.buttons.push({ id: "ticket", label: "Exit ticket" }); }
    return M;
  }
  if (st.screen === "compare") return compareModel(flow, M, x);
  if (st.screen === "card") return cardModel(flow, M);
  if (st.screen === "ticket") { M.kicker = "Exit ticket"; M.title = "Same cloud, three stars."; M.cards = ["Print this page or answer it on paper. It ends with: What's confusing?"]; M.sheet = { kind: "ticket" };
    M.chips.push("The exit ticket is a printed page. Open it on the desktop or phone view to print it.");
    M.buttons.push({ id: "print", label: "Print" }, { id: "card", label: "Mass Card" }, { id: "hub", label: "Masses" }); return M; }
  const s = flow.stage(); const v = x.view || flow.view();
  M.kicker = `${MASS_LABEL[st.mass]}  |  ${s.id}  |  stage ${st.si + 1} of ${st.stages.length}`;
  M.title = s.id === "H2" && !v.rsg ? "Supergiant" : s.title;
  const pend = flow.pending();
  if (pend) {
    const a = pend.a; M.question = { key: `${s.id}:${pend.i}`, i: pend.i, text: a.kind === "pathOrder" ? "Pick which path to watch first. Then you watch the other." : (a.q || ""), kind: a.kind || "choice", choices: (a.kind === "pathOrder" ? (a.choices || []) : tierChoices(a.choices, a.answer, st.tier) || []).map((c) => ({ label: c })), min: a.min, max: a.max };
    if (a.kind === "massMeter") M.question.value = st.massGuess[s.id] != null ? st.massGuess[s.id] : (a.min + a.max) / 2;
    M.cards = a.kind === "pathOrder" ? splitCaption(s.caption) : [];
  } else {
    M.cards = splitCaption(s.caption);
  }
  M.cardIdx = Math.min(st.cardIdx, Math.max(0, M.cards.length - 1));
  if (st.mass === "1") M.credit = S.credit1Sun;   // the 1 Sun track credit appears only on 1 Sun frames
  // reveal: the student's choice next to the model, never marked wrong (shown once the stage has played)
  if (!pend && st.phase === "done") (s.act || []).forEach((a, i) => {
    const k = `${s.id}:${i}`; const picked = st.answers[k]; if (picked == null) return;
    const model = flow.modelAnswer(a); const extra = flow.revealText(a);
    M.reveal.push({ q: a.q, picked: a.kind === "massMeter" ? `about ${about(+picked, 2)} Suns` : picked, model, extra, optional: a.optionalReveal && st.optionalShown[k] ? a.optionalReveal : null, optionalKey: a.optionalReveal ? k : null });
  });
  if (s.act && s.act.some((a) => a.kind === "checkEnd") && st.phase === "done") M.reveal.push({ q: "What will your star become in the end?", picked: st.answers["H-End"] || "(no guess)", model: endName(st.mass) });
  // chips
  for (const c of s.chips || []) M.chips.push(c);
  if (s.notes && st.t > 0.5) for (const n of s.notes) M.chips.push(n);
  if (s.labels) for (const n of s.labels) M.chips.push(n);
  if (x.sceneChips) for (const c of x.sceneChips) M.chips.push(c);
  if (v.noDot) M.chips.push(S.noDot);
  if (v.hideDotNote) M.chips.push(v.hideDotNote);
  if (s.dashed && st.mass === "0.2") M.chips.push("Predicted: no red dwarf has lived long enough to do this.");
  if (st.mass === "40" && v.fork) M.chips.push("40 Suns: models differ from here");
  if (x.zoom) M.chips.unshift(x.zoom);
  if (x.skip) M.chips.unshift(x.skip);
  // K and C actions
  for (const a of s.act || []) {
    if (a.kind === "toggle") M.toggles.push({ id: "toggle:" + a.toggle, label: st.toggles[a.toggle] ? a.labels[1] : a.labels[0], on: !!st.toggles[a.toggle] });
    if (a.kind === "timebar") M.widgets.push({ kind: "timebar", label: "Drag between the giant peak and now", value: st.timebar == null ? 1 : st.timebar });
    if (a.kind === "speedBar") M.widgets.push({ kind: "speedBar" });
    if (a.kind === "bars") M.widgets.push({ kind: "bars", label: s.bars, level2: st.help >= 2 ? s.level2 : null, progress: v.onion || 0 });
    if (a.kind === "flashCompare") M.chips.push("Side by side: the Sun's helium ignites in a flash. This 3 Sun star's helium ignites quietly.");
    if (a.kind === "wdCompare") M.chips.push(`This white dwarf: about ${about(flow.tracks["3"].end.mass, 1)} Suns. The Sun's: about 0.5 to 0.6 Suns.`);
    if (a.kind === "ghost") M.chips.push("Compare: the faint trail is the Sun's. Both giants are cool and bright.");
    if (a.peek && st.answers[`${s.id}:0`]) M.buttons.push({ id: "peek", label: `Hold to see it ${st.answers[`${s.id}:0`]}`, hold: true });
  }
  if (s.onion && v.onion != null) M.widgets.push({ kind: "onion", layers: s.onion.layers, progress: v.onion, source: s.onion.source });
  if (v.cooling && st.mass) { const tr = flow.tracks[st.mass]; const W = tr.wd; const max = tr.end.age + W[W.length - 1].coolAge; M.widgets.push({ kind: "coolclock", age: v.cooling.age, max, predicted: st.mass === "0.2" }); }
  if (s.card2 && st.help >= 2) M.widgets.push({ kind: "card2", ...S.cards2[s.card2] });
  // readouts (help gating, teaching spec 5 and T6)
  const row = v.cooling || v.row;
  if (v.clock) M.readouts.push(["Time", `${about(v.clock.years, 2)} years ${v.clock.label}`]);
  if (v.age != null) M.readouts.push(["Age", (s.dashed ? "predicted, " : "") + fmtYears(v.age)]);
  // remnants: the remnant's own mass (Tesla F1, F5), never the star's mass before the collapse
  if (s.massLabel) M.readouts.push(["Mass", s.massLabel]);
  else if (row && row.mass != null) M.readouts.push(["Mass", `${row.mass.toFixed(row.mass < 1 ? 2 : 1)} Suns`]);
  if (st.help >= 1 && row) {
    if (!v.hideTeff) M.readouts.push(["Surface", `${Math.round(Math.pow(10, row.logT)).toLocaleString("en-US")} K`]);
    M.readouts.push(["Brightness", `${about(Math.pow(10, row.logL), 2)} Suns`]);
    M.readouts.push(["Radius", `${about(Math.pow(10, row.logR), 2)} Suns`]);
    if (v.type) M.readouts.push(["Type", v.type]);
  }
  if (st.help >= 2 && row && row.logTc) M.readouts.push(["Core", `${about(Math.pow(10, row.logTc), 2)} K`]);
  if (st.help >= 2 && x.stageSpan) M.readouts.push(["Stage lasts", x.stageSpan]);
  // controls
  const playing = st.phase === "play" && st.playing;
  if (!pend) M.buttons.push({ id: st.phase === "done" ? "replay" : "play", label: st.phase === "done" ? "Replay" : playing ? "Pause" : "Play" });
  if (st.si > 0) M.buttons.push({ id: "prev", label: "Back" });
  M.buttons.push({ id: "next", label: st.si < st.stages.length - 1 ? "Next stage" : "Finish run", primary: st.phase === "done", disabled: !!pend });
  M.buttons.push({ id: "hub", label: "Masses" });
  return M;
}
export function endName(m) { return m === "15" ? "neutron star" : m === "40" ? "black hole" : "white dwarf"; }

// ---------------- COMPARE (teaching spec 3.9) ----------------
function compareModel(flow, M, x) {
  const st = flow.st; const C = flow.cmp; const c = C.c; M.kicker = "Compare"; M.title = "Two stars, one difference: mass";
  if (c.step === "setup") {
    M.cards = [COMPARE_TEXT.setup];
    M.masses = MASSES.map((m) => ({ id: m, label: MASS_LABEL[m], teff: MASS_TEFF[m], on: c.pair.includes(m), done: st.runs.includes(m), act: "cmp:mass:" + m }));
    M.chips.push(C.coreOk() ? "Core task pair: the Sun and one of 0.2 or 3 Suns." : "Mr. Dimitry's core task: pick the Sun and one of 0.2 or 3 Suns.");
    M.buttons.push({ id: "cmp:begin", label: "Run them together", primary: true, disabled: c.pair.length !== 2 }, { id: "hub", label: "Masses" });
    return M;
  }
  const [a, b] = C.sorted();
  if (c.step === "predict") {
    const q = C.pending(); M.cards = [COMPARE_TEXT.predict];
    if (q) M.question = { key: "cmp:" + q.id, text: q.q, kind: "choice", choices: tierChoices(q.choices, q.answer, st.tier).map((l) => ({ label: l, act: `cmp:pick:${q.id}:${l}` })) };
    for (const p of C.questions()) if (c.picks[p.id] != null) M.chips.push(`${p.q} You picked: ${c.picks[p.id]}`);
    M.buttons.push({ id: "cmp:reset", label: "Pick other masses" }, { id: "hub", label: "Masses" });
    return M;
  }
  M.cards = [COMPARE_TEXT.run];
  const stars = [a, b].map((m) => C.starAt(m)); const ro = C.readOff();
  M.widgets.push({ kind: "logclock", y0: LOGCLOCK.y0, y1: LOGCLOCK.y1, ticks: LOGCLOCK.ticks.map((k) => ({ ...k, p: logPos(k.y) })),
    stars: stars.map((s, i) => ({ label: MASS_LABEL[s.m], teff: Math.round(Math.pow(10, s.row.logT)), p: logPos(s.age), life: c.step === "done" ? logPos(s.life) : null, lifeLabel: ro[i].life })) });
  for (const s of stars) M.readouts.push([MASS_LABEL[s.m], fmtYears(s.age)]);
  if (c.step === "done") {
    for (const q of C.questions()) M.reveal.push({ q: q.q, picked: c.picks[q.id] || "(no guess)", model: q.answer });
    M.widgets.push({ kind: "readoff", rows: ro });
  }
  const playing = c.step === "run" && c.playing;
  M.buttons.push({ id: c.step === "done" ? "cmp:replay" : "cmp:play", label: c.step === "done" ? "Replay" : playing ? "Pause" : "Play" });
  M.buttons.push({ id: "card", label: "Mass Card", primary: c.step === "done" }, { id: "cmp:reset", label: "Compare others" }, { id: "hub", label: "Masses" });
  return M;
}

// ---------------- the Mass Card (teaching spec 3.9, section 8 tiers) ----------------
function cardModel(flow, M) {
  const st = flow.st; const card = st.card; M.kicker = "Mass Card"; M.title = "Mass decides ___";
  M.cards = [COMPARE_TEXT.card]; const done = cardComplete(card);
  M.sheet = { kind: "card", tier: st.tier, complete: done, frame: FRAME_TIER1, frameWords: FRAME_WORDS, sentence: sentenceText(card, st.tier),
    options: { life: lifeChoices(flow.tracks), color: COLOR_WORDS, end: END_WORDS },
    rows: MASSES.map((m) => ({ mass: m, label: MASS_LABEL[m], run: st.seen.includes(m), core: ["1", "15", "40"].includes(m), filled: rowFilled(card.rows[m]) })) };
  M.chips.push(done ? "Complete: 1, 15 and 40 plus a third mass, and both blanks of the sentence." : "Complete when 1, 15 and 40 plus a third mass are filled and the sentence has both blanks filled.");
  M.chips.push("Fill in the card on the desktop or phone view. Nothing is saved: print it or save it as a PDF.");
  M.buttons.push({ id: "print", label: "Print or save as PDF" }, { id: "ticket", label: "Exit ticket" }, { id: "hub", label: "Masses" });
  return M;
}
export { ZONES };
