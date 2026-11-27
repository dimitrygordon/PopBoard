// Newton's Mountain: every word a student reads, in one place (spec_v1 section 7.2). Tesla and Mr. Dimitry review this file.
// Rules from the spec: level 0 and 1 never say "orbit" or "escape" and never show circular speed, escape speed or a period.
// Nothing here goes beyond the spec's wording and Tesla's fact-check fixes.
import { outcomeOf, classify } from "./nm-sim.js";
import { horizonDipDeg, horizonStraightM } from "./nm-frames.js";

export const TITLE = "Newton's Mountain VR";
export const ARRIVE = "Newton's Mountain. The mountain is imaginary and not to scale. The air up here is very thin, so the cannon ignores it unless you turn Air on.";
export const NOT_TO_SCALE = "The mountain is imaginary and not to scale. The ball is drawn larger than real so you can see it.";
export const SIM_NOTES = [
  "The model ignores air unless you turn Air on.",
  "Earth does not spin and the Sun does not move.",
  "The ball is a point mass, and it leaves exactly level.",
  "The Moon, the Sun, Earth's shape and terrain are not modeled.",
];
// Tesla claim 12 (fix 4): the Physics 101 sentence is about being above most of the air. At 150 km the air is thin, not absent.
export const AIR_NOTE = "At 150 km there is very thin air, but not zero.";
export const LEVELS = ["Observe", "Forces", "Numbers"];

const grp = (n) => Math.round(n).toLocaleString("en-US");
export const fmtSpeed = (v) => `${grp(v)} m/s`;
export const fmtKmS = (v) => `${(v / 1000).toFixed(2)} km/s`;
export const fmtKm = (m) => `${grp(m / 1e3)} km`;
export function fmtDuration(t) {
  const s = Math.round(t);
  if (s < 60) return `${s} s`;
  if (s >= 172800) return `${(s / 86400).toFixed(1)} days`;
  if (s >= 7200) { const h = Math.floor(s / 3600), m = Math.round((s % 3600) / 60); return m ? `${h} h ${m} min` : `${h} h`; }
  if (s >= 600) return `${Math.round(s / 60)} min`; // 10 minutes and over: whole minutes ("11 min")
  const m = Math.floor(s / 60), r = s % 60;
  return r ? `${m} min ${r} s` : `${m} min`;
}
export const launchCard = (v) => `Launch speed ${fmtSpeed(v)} (${(v / 1000).toFixed(2)} km/s)`;
export const flagText = (n, v, rangeM, t) => `${n}: ${fmtSpeed(v)}, ${fmtKm(rangeM)}, ${fmtDuration(t)}`;
export const bracketLines = (b) => ({
  landed: `Highest speed that landed: ${b.highestLanded === null ? "\u2013" : fmtSpeed(b.highestLanded)}`,
  notLanded: `Lowest speed that did not land: ${b.lowestNotLanded === null ? "\u2013" : fmtSpeed(b.lowestNotLanded)}`,
});
/** The distance between the student's own two nearest shots. Shown only when one shot landed and one did not.
 * Levels 0 and 1 never say "gap", "orbit speed" or "target" here. Level 2 (Explain) adds the circular speed. */
export const BETWEEN_SUB = "highest that landed vs. lowest that didn't";
export function betweenShots(b, level, vCircMps) {
  if (b.highestLanded === null || b.lowestNotLanded === null) return null;
  return { line1: `Between your shots: ${grp(b.gap)} m/s`, line2: BETWEEN_SUB, extra: level >= 2 ? `Circular speed here: ${fmtSpeed(vCircMps)}` : null };
}

/** Plain facts about a shot. Level 2 adds the outcome words from the analytic classifier. */
export function resultLine(sh, shot, level, c) {
  const o = outcomeOf(shot), laps = shot.swept / (2 * Math.PI);
  if (o === "landed") return `landed ${fmtKm(shot.landing.range)} away after ${fmtDuration(shot.landing.t)}`;
  const word = level >= 2 && c ? classify(c, sh.h * 1e3, sh.v) : null;
  if (o === "left") return word === "escapes" ? "left Earth's neighbourhood (escape)" : "left Earth's neighbourhood";
  const base = `still flying after ${laps.toFixed(1)} laps`;
  return word === "bound" ? `${base} (in orbit)` : base;
}

/** Help-tab lines. help=0 shows no circular or escape numbers anywhere, including here. */
export function helpLines(level, c, hM) {
  const dip = horizonDipDeg(c.R, hM).toFixed(1), straight = fmtKm(horizonStraightM(c.R, hM));
  const out = [
    { h: "Where you are", t: `The horizon is ${dip} degrees below level. Straight-line distance to the horizon: ${straight}.` },
    { h: "What is modeled", t: SIM_NOTES.join(" ") },
    { h: "Air", t: AIR_NOTE },
    { h: "Not to scale", t: NOT_TO_SCALE },
  ];
  return out;
}
export const CONTROLS_VR = [
  "Trigger: press a button or pick a flag",
  "Right A: FIRE",
  "Left stick: speed +/-100 m/s. Right stick: +/-1 m/s",
  "Hold left X: clear shots",
  "Left stick press: pause or play",
  "Right stick press: Mountain or Model view",
  "Hold a grip: freeze time",
  "B or Y: show or hide this panel",
];
export const CREDITS = [
  "three.js r170, MIT.",
  "Stars: HYG database v4.4, astronexus (David Nash), CC BY-SA 4.0. Filtered to magnitude 6.5 and repacked (shared with Night Sky VR).",
  "Air density: U.S. Standard Atmosphere, 1976 (NASA TM X-74335), U.S. Government work.",
  "Earth constants: the lesson pair (GM 3.98e14, R 6.38e6).",
  "Font: Inter, SIL Open Font License 1.1.",
  "Earth, cannon and mountain are drawn by code in this version, with no outside art. Full list: THIRD-PARTY-NOTICES.md.",
];

// Headset credits at 56 px: short, full text stays on the page (Credits and licenses) and in THIRD-PARTY-NOTICES.md.
export const CREDITS_VR = [
  "three.js, MIT.",
  "Stars: HYG v4.4, CC BY-SA 4.0.",
  "Air: US Standard Atmosphere 1976.",
  "Font: Inter, SIL OFL 1.1.",
  "Earth, cannon and mountain are drawn by code. Full list: Credits and licenses on the page.",
];
