// Stellar Life Cycle VR: COMPARE, the Mass Card, the exit ticket and the Tier 1 supports (teaching spec v1.4
// sections 2.0, 3.9, 7 and 8). Pure state and rules, no DOM or three, so node tests can drive them.
import { MASSES, MASS_LABEL, atEEP, fmtYears, about } from "./sl-data.js";

// ---------------- captions (verbatim, teaching spec 3.9) ----------------
export const COMPARE_TEXT = {
  setup: "Two stars, one difference: mass. Run them together.",
  predict: "Which one will live longer? Which will be bluer? Which ends in a white dwarf?",
  run: "Each star has its own clock. The bar at the bottom is a log clock, so each notch is 10 times longer.",
  card: "Fill in the card, then finish the sentence: Mass decides ___ because ___.",
};
export const FRAME_TIER1 = "The ___ the mass, the ___ the life, because ___.";   // section 8, Tier 1 sentence frame

export const endState = (m) => (m === "15" ? "neutron star" : m === "40" ? "black hole" : "white dwarf");
/** Color words from the stage captions (R1 orange-red, S1 white, T1, H1 and V1 blue-white), picked from the MIST
 * main-sequence midpoint temperature. */
export function colorWord(teff) { return teff < 4500 ? "orange-red" : teff < 7500 ? "white" : "blue-white"; }
export function msMid(tr) { const a = tr.zams.eep, b = tr.msEnd.eep; return atEEP(tr, (a + b) / 2); }
export const COLOR_WORDS = ["orange-red", "white", "blue-white"];
export const END_WORDS = ["white dwarf", "neutron star", "black hole"];

// ---------------- Tier 1: two choices instead of three (section 8) ----------------
/** Keep the model's answer and the first other choice, in their original order. With no known answer, keep the first two. */
export function tierChoices(choices, answer, tier, keep = null) {
  if (tier !== 1 || !choices || choices.length <= 2) return choices;
  if (keep) return choices.filter((c) => keep.includes(c) || c === answer);   // a question that names its own Tier 1 pair (COMPARE white dwarf: both, neither); the answer always stays
  const ai = answer != null ? choices.indexOf(answer) : -1; if (ai < 0) return choices.slice(0, 2);
  const other = choices.findIndex((c, i) => i !== ai); return choices.filter((c, i) => i === ai || i === other);
}

// ---------------- Tier 1: highlighted H-R zones the pins snap to (section 3.1 H-Path, section 8) ----------------
// Generic regions of the diagram, the same for every mass, so they help place a pin without giving the answer.
export const ZONES = [
  { id: "ms", label: "Main sequence", band: { a: [4.66, 5.7], b: [3.50, -2.3], half: 0.75 } },
  { id: "giants", label: "Giants", box: { t0: 3.55, t1: 3.74, l0: 1.4, l1: 3.6 } },
  { id: "supergiants", label: "Supergiants", box: { t0: 3.50, t1: 4.30, l0: 4.4, l1: 6.0 } },
  { id: "wd", label: "White dwarfs", box: { t0: 4.00, t1: 4.70, l0: -2.9, l1: -1.2 } },
];
const SC = 2.5;   // 1 dex of temperature spans about as much of the plot as 2.5 dex of brightness (8.8 vs 1.4 dex)
function bandPt(z, p) { const [ax, ay] = z.band.a, [bx, by] = z.band.b; const dx = (bx - ax) * SC, dy = by - ay; const L2 = dx * dx + dy * dy;
  let u = (((p.logT - ax) * SC) * dx + (p.logL - ay) * dy) / L2; u = Math.max(0, Math.min(1, u)); return { logT: ax + (bx - ax) * u, logL: ay + dy * u }; }
export function zoneCenter(z) { if (z.box) return { logT: (z.box.t0 + z.box.t1) / 2, logL: (z.box.l0 + z.box.l1) / 2 }; return bandPt(z, { logT: (z.band.a[0] + z.band.b[0]) / 2, logL: (z.band.a[1] + z.band.b[1]) / 2 }); }
function dist(a, b) { return Math.hypot((a.logT - b.logT) * SC, a.logL - b.logL); }
export function inZone(z, p) {
  if (z.box) return p.logT >= z.box.t0 && p.logT <= z.box.t1 && p.logL >= z.box.l0 && p.logL <= z.box.l1;
  const q = bandPt(z, p); return Math.abs(p.logL - q.logL) <= z.band.half && Math.abs(p.logT - q.logT) * SC <= z.band.half + 0.01;
}
/** Snap a tapped point into the nearest zone: inside a zone it stays put, outside it moves to the nearest zone's nearest point. */
export function snapToZone(p) {
  const hit = ZONES.find((z) => inZone(z, p)); if (hit) return { ...p, zone: hit.id };
  let best = null, bd = Infinity;
  for (const z of ZONES) { let q;
    if (z.box) q = { logT: Math.max(z.box.t0, Math.min(z.box.t1, p.logT)), logL: Math.max(z.box.l0, Math.min(z.box.l1, p.logL)) };
    else { const c = bandPt(z, p); const d = p.logL - c.logL; q = { logT: c.logT, logL: c.logL + Math.max(-z.band.half * 0.9, Math.min(z.band.half * 0.9, d)) }; }
    const d = dist(p, q); if (d < bd) { bd = d; best = { ...q, zone: z.id }; } }
  return best;
}

// ---------------- COMPARE ----------------
/** How far each star runs in COMPARE: its fusing life on the MIST trail (to the end of the giant branches for 1 and 3 Suns;
 * the MIST end for 0.2, 15 and 40). The remnant is named in the read-off, not drawn. */
export function compareEnd(tr) { const r = tr.rows.find((x) => x.phase >= 6 && x.eep > tr.zams.eep); return r ? r.eep : tr.eepMax; }
export function createCompare(tracks) {
  const c = { step: "setup", pair: [], picks: {}, t: 0, playing: true };
  const api = { c };
  api.toggle = (m) => { if (c.step !== "setup" || !tracks[m]) return; const i = c.pair.indexOf(m); if (i >= 0) c.pair.splice(i, 1); else if (c.pair.length < 2) c.pair.push(m); };
  /** The core task asks for the Sun and one of 0.2 or 3; any other pair still runs, with a note. */
  api.coreOk = () => c.pair.length === 2 && c.pair.includes("1") && (c.pair.includes("0.2") || c.pair.includes("3"));
  api.sorted = () => c.pair.slice().sort((a, b) => +a - +b);
  api.questions = () => {
    const [a, b] = api.sorted(); if (!b) return [];
    const L = (m) => MASS_LABEL[m]; const wdA = endState(a) === "white dwarf", wdB = endState(b) === "white dwarf";
    const longer = tracks[a].tMS > tracks[b].tMS ? a : b; const bluer = msMid(tracks[a]).logT > msMid(tracks[b]).logT ? a : b;
    return [
      { id: "longer", q: "Which one will live longer?", choices: [L(a), L(b)], answer: L(longer) },
      { id: "bluer", q: "Which will be bluer?", choices: [L(a), L(b)], answer: L(bluer) },
      { id: "wd", q: "Which ends in a white dwarf?", choices: [L(a), L(b), "both", "neither"], tier1: ["both", "neither"], answer: wdA && wdB ? "both" : wdA ? L(a) : wdB ? L(b) : "neither" },
    ];
  };
  api.pending = () => api.questions().find((q) => c.picks[q.id] == null) || null;
  api.begin = () => { if (c.pair.length !== 2) return false; c.step = "predict"; c.picks = {}; return true; };
  api.pick = (id, choice) => { c.picks[id] = choice; if (!api.pending()) { c.step = "run"; c.t = 0; c.playing = true; } };
  api.tick = (dt, dur = 24) => { if (c.step !== "run" || !c.playing) return; c.t = Math.min(1, c.t + dt / dur); if (c.t >= 1) c.step = "done"; };
  /** Each star on its own clock: its own EEP from ZAMS to the end of its fusing life. */
  // the main sequence takes the first 60 percent of the run (it is about 90 percent of fusing life), the rest the later stages
  api.starAt = (m, t = c.t) => { const tr = tracks[m]; const e0 = tr.zams.eep, e1 = compareEnd(tr), em = Math.min(e1, tr.msEnd.eep); const e = t < 0.6 ? e0 + (em - e0) * (t / 0.6) : em + (e1 - em) * ((t - 0.6) / 0.4); const row = atEEP(tr, e); return { m, row, age: row.age, life: tr.tMS, color: colorWord(Math.pow(10, msMid(tr).logT)), end: endState(m) }; };
  // two rows per star (spec v1.4): the main sequence and the end of fusion, both from MIST; the clock runs to the second
  api.readOff = () => api.sorted().map((m) => { const s = api.starAt(m, 1); return { mass: m, label: MASS_LABEL[m], life: `about ${lifeYears(s.life)}`, fusionEnd: `about ${fmtYears(s.age)}`, color: s.color, end: s.end }; });
  api.reset = () => { c.step = "setup"; c.pair = []; c.picks = {}; c.t = 0; };
  return api;
}
/** The shared log age clock: 10^5 to 10^13 years, one notch per factor of 10, with the Sun's age and the universe ticks (section 6). */
export const LOGCLOCK = { y0: 5, y1: 13, ticks: [{ y: 4.6e9, label: "Sun today: 4.6 billion years" }, { y: 13.8e9, label: "universe: 13.8 billion years" }] };
export const logPos = (years) => Math.max(0, Math.min(1, (Math.log10(Math.max(1, years)) - LOGCLOCK.y0) / (LOGCLOCK.y1 - LOGCLOCK.y0)));

/** Main-sequence time rounded the way the stage captions round it: one significant figure when that is within 15 percent
 * (about 1 trillion, 10 billion, 400 million, 5 million years), otherwise two (about 13 million years). */
export function lifeYears(y) {
  const unit = y >= 1e12 ? [1e12, "trillion years"] : y >= 1e9 ? [1e9, "billion years"] : y >= 1e6 ? [1e6, "million years"] : null;
  if (!unit) return fmtYears(y); const v = y / unit[0]; const r1 = +about(v, 1).replace(/,/g, "");
  return `${Math.abs(r1 / v - 1) <= 0.15 ? about(v, 1) : about(v, 2)} ${unit[1]}`;
}

// ---------------- the Mass Card (section 3.9; completion rule T9, the same function for every tier) ----------------
export function lifeChoices(tracks) { return MASSES.map((m) => `about ${lifeYears(tracks[m].tMS)}`); }
export function newCard() { const rows = {}; for (const m of MASSES) rows[m] = { life: "", color: "", end: "" }; return { rows, decides: "", because: "", frame: ["", "", ""] }; }
export const rowFilled = (r) => !!(r && r.life && r.color && r.end);
/** Complete when the 1, 15 and 40 rows plus a third mass (0.2 or 3) are filled and both blanks of "Mass decides ___ because ___" are filled. */
export function cardComplete(card) {
  const f = (m) => rowFilled(card.rows[m]);
  return f("1") && f("15") && f("40") && (f("0.2") || f("3")) && !!String(card.decides || "").trim() && !!String(card.because || "").trim();
}
/** Tier 1 frame "The ___ the mass, the ___ the life, because ___." fills the same two blanks the open sentence has. */
export function applyFrame(card) {
  const [a, b, c] = card.frame.map((x) => String(x || "").trim());
  card.decides = a && b ? `the ${a} the mass, the ${b} the life` : ""; card.because = c; return card;
}
export function sentenceText(card, tier = 2) {
  if (tier === 1) { const [a, b, c] = card.frame.map((x) => String(x || "").trim() || "___"); return `The ${a} the mass, the ${b} the life, because ${c}.`; }
  return `Mass decides ${String(card.decides || "").trim() || "___"} because ${String(card.because || "").trim() || "___"}.`;
}
// Tier 1 word choices for the first two blanks of the frame (they may also type their own)
export const FRAME_WORDS = [["bigger", "smaller"], ["shorter", "longer"]];
/** The model values for a row, for the reveal after the student fills it (never marked wrong). */
export function modelRow(tracks, m) { return { life: `about ${lifeYears(tracks[m].tMS)}`, color: colorWord(Math.pow(10, msMid(tracks[m]).logT)), end: endState(m) }; }

// ---------------- exit ticket (section 7, verbatim) ----------------
export const TICKET = {
  title: "Same cloud, three stars.",
  stars: [{ key: "A", mass: "0.2", label: "A", note: "0.2 Suns" }, { key: "B", mass: "1", label: "B", note: "1 Sun" }, { key: "C", mass: "15", label: "C", note: "15 Suns" }],
  clock: "Color in how long each star lives.",
  hr: "Mark where each star spends most of its life.",
  ends: "Draw a line from each star to its ending.",
  endsPics: ["a tiny glowing white ball next to Earth", "a city next to a glowing ball", "a bright burst with a ring of shells"],
  line: "Mass decides ____",
  bank: ["a clock", "a color swatch", "a pair of endings"],
  last: "What's confusing?",
};
export { about };
