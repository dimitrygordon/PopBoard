// Gravity Force Lab VR: the five scenes as pure models (teaching spec v1.2, section 4). No DOM, no three.js.
// Every number comes from gf-sim. The page (gf-main.js), the headset panel (gf-xr.js) and the tests all read
// sceneModel(), so the flat screen and the headset always say the same thing.
//   node --test tests/gravity-force-vr.test.mjs
import {
  GF, pull, surfaceG, weighN, timesEarth, worldsBySurfaceG, lbFromN, s3NewtonText, bhHorizonText,
  issAt, moonDistanceRatio, distanceFactor, accelOf, pairForce, s1ArrowLength, s2Arrows, formatSci, roundSig,
} from "./gf-sim.js";
import { formatNewtons } from "./gf-panel.js";
import { isLocked } from "./gf-state.js";

export const SCENE_ORDER = ["pull", "mass", "weigh", "iss", "well"];
export const SCENE_TITLE = {
  pull: "Pull Meter", mass: "Mass Dial", weigh: "Weigh Yourself Anywhere", iss: "Astronauts Still Have Gravity", well: "The Gravity-Well Sheet",
};
export const SCENE_SHORT = { pull: "S1 Pull", mass: "S2 Mass", weigh: "S3 Weigh", iss: "S4 Station", well: "S5 Sheet" };

const group = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
const trim = (n, d = 2) => String(+n.toFixed(d));

export const SCENE_WORLDS = ["earth", "moon", "mars", "jupiter", "ns"];

// ---------------- predictions (T18: the result shows only after a commit; a chip is never marked wrong) ----------------
export const PREDICT = {
  pull: { text: "If you pull the Moon twice as far away, what happens to the pull?", chips: ["stronger", "the same", "half as strong", "one quarter as strong"], model: "one quarter as strong" },
  massA: { text: "Double the mass of one object. What happens to the pull?", chips: ["twice as strong", "four times as strong", "the same", "half as strong"], model: "twice as strong" },
  massB: { text: "Earth and the Sun pull on each other. Which one feels the bigger pull?", chips: ["the Sun feels more", "Earth feels more", "the same"], model: "the same" },
  weigh: { text: "Put the five worlds in order, from lightest you to heaviest you. Tap them in order.", order: true, model: "Moon, Mars, Earth, Jupiter, neutron star" },
  iss: { text: "How strong is gravity at the space station?", chips: ["zero", "very weak", "about half", "almost the same"], model: "almost the same" },
  well: { text: "A marble rolls past at the same speed and distance. Will it bend more past Earth or past the Sun?", chips: ["more past Earth", "more past the Sun", "the same"], model: "more past the Sun" },
};

export const WORLD_NAME = { earth: "Earth", moon: "Moon", mars: "Mars", jupiter: "Jupiter", ns: "Neutron star" };
export const OBJ_NAME = { earth: "Earth", wd: "White dwarf", sun: "Sun", bh: "Black hole" };
export const CHIP_NAME = { ball: "Bowling ball", earth: "Earth", sun: "Sun", wd: "White dwarf" };

// ---------------- lab state ----------------
/** Fresh per-scene working state, layered on the URL state from gf-state.parseState. */
export function createLab(urlState) {
  const s = urlState;
  return {
    url: s,
    predict: {},            // key -> picked chip text (or the order array for weigh)
    order: [],              // weigh: worlds tapped so far
    pins: [],               // S1 pins: { dist, pull }
    massMode: "A", mA: 1, mB: 1, multB: { a: 1, b: 1 },
    issStep: "ride", visited: {}, sortPicks: {}, speed: "medium", marbles: [], whyCard: false, wrongCard: false, wordsSeen: false,
  };
}

export function predictKey(lab) {
  const sc = lab.url.scene;
  return sc === "mass" ? (lab.massMode === "A" ? "massA" : "massB") : sc;
}
export function committed(lab, key = predictKey(lab)) { return lab.predict[key] != null; }

/** Commit a prediction chip. Returns false when the prediction is locked and already set. */
export function commitPredict(lab, chip, key = predictKey(lab)) {
  if (isLocked(lab.url, "predict") && lab.predict[key] != null) return false;
  const P = PREDICT[key]; if (!P) return false;
  if (P.order) {
    if (!WORLD_NAME[chip] || lab.order.includes(chip)) return false;
    lab.order.push(chip);
    if (lab.order.length === 5) lab.predict.weigh = lab.order.map((w) => WORLD_NAME[w]).join(", ");
    return true;
  }
  if (!P.chips.includes(chip)) return false;
  lab.predict[key] = chip; return true;
}

/** "You picked" next to "The model". Never marks the student wrong. */
export function revealOf(lab, key = predictKey(lab)) {
  const picked = lab.predict[key]; if (picked == null) return null;
  return { picked, model: PREDICT[key].model, same: picked === PREDICT[key].model };
}

// ---------------- S1 Pull Meter ----------------
export const S1 = { startM: 0.38, minRatio: 0.25, maxRatio: 4, startArrowM: 0.2 };
export function clampDist(d) { return Math.min(S1.maxRatio, Math.max(S1.minRatio, Math.round(d * 100) / 100)); }

/** "1/4 of the start", "4 times the start", "about 0.44 of the start". */
export function pullText(dist) {
  const f = distanceFactor(dist);
  const n = Math.round(dist);
  if (Math.abs(dist - n) < 0.005 && n >= 1) return n === 1 ? "the same as the start" : `1/${n * n} of the start`;
  const inv = Math.round(1 / dist);
  if (Math.abs(1 / dist - inv) < 0.005 && inv >= 2) return `${inv * inv} times the start`;
  return f >= 1 ? `about ${trim(roundSig(f, 2), 2)} times the start` : `about ${trim(roundSig(f, 2), 3)} of the start`;
}
export function distText(dist) {
  return Math.abs(dist - 1) < 0.005 ? "the starting distance" : `${trim(dist, 2)} times the start`;
}

export function s1Model(lab) {
  const { help } = lab.url; const dist = lab.url.dist;
  const f = distanceFactor(dist);
  const arrow = s1ArrowLength(dist, S1.startArrowM);
  const r = dist * GF.earthMoonM;
  const out = {
    arrowM: arrow, ghostM: S1.startArrowM, keepsGoing: S1.startArrowM * f > S1.startArrowM * 4 + 1e-9,
    moonX: dist * S1.startM, readout: { label: "Pull", main: dist === 1 ? "1" : pullText(dist).replace(/ of the start| the start/, "").replace("the same as", "1"), sub: `Distance: ${distText(dist)}` },
    lines: [`Pull: ${pullText(dist)}`, `Distance: ${distText(dist)}`],
    labels: { earth: "Pull on Earth", moon: "Pull on the Moon" },
    eq: { m1: GF.worlds.earth.massKg, m2: GF.worlds.moon.massKg, r },
    cards: ["Drag the Moon. Watch the pull."],
    notes: ["Sizes are not to scale. The Moon is drawn bigger than it should be, and the rail is a model of the real distance, 384,400 km."],
  };
  out.readout.main = s1MainNumber(dist);
  out.readout.unit = "of the start pull";
  if (help >= 1) {
    out.lines.push(`F is proportional to 1 / r^2. Double r, F is divided by 2 x 2 = 4.`);
    out.why = { text: "Picture the pull spread over a bigger and bigger area. Twice as far means four times the area, so each patch gets a quarter.", foot: "This picture helps. It is not a proof." };
  }
  if (help >= 2) out.lines.push(`Pull on the Moon from Earth: ${formatNewtons(pull(GF.worlds.earth.massKg, GF.worlds.moon.massKg, r))} at ${group(r / 1000)} km`);
  if (committed(lab, "pull")) {
    out.result = "Twice as far, one quarter the pull. Three times as far, one ninth.";
    out.followUp = "What about 3 times?";
  }
  return out;
}
/** Big readout number for S1: "1/4", "16", "0.44". */
export function s1MainNumber(dist) {
  const t = pullText(dist);
  if (t.startsWith("the same")) return "1";
  if (t.startsWith("1/")) return t.split(" ")[0];
  if (/^\d+ times/.test(t)) return t.split(" ")[0];
  return t.replace(/^about /, "").split(" ")[0];
}
export function addPin(lab) {
  if (lab.pins.length >= 12) lab.pins.shift();
  lab.pins.push({ dist: lab.url.dist, pull: distanceFactor(lab.url.dist) });
  return lab.pins.length;
}

// ---------------- S2 Mass Dial ----------------
export const S2 = { arrowUnitA: 0.06, arrowMaxA: 0.24, rB: 1.0e10, multMin: 0.25, multMax: 4, arrowMinM: 0.06, arrowMaxM: 0.42, meterMin: -30, meterMax: 45 };
const clampMult = (m) => Math.min(S2.multMax, Math.max(S2.multMin, m));
export function massAct(lab, id) {
  const [who, op] = id.split(":");
  if (lab.massMode === "A") {
    const k = op === "x2" ? 2 : op === "half" ? 0.5 : op === "x3" ? 3 : 1;
    if (who === "A") lab.mA = clampMult(lab.mA * k); else if (who === "B") lab.mB = clampMult(lab.mB * k);
    else if (who === "reset") { lab.mA = 1; lab.mB = 1; }
    return;
  }
  if (who === "a" || who === "b") {
    if (op === "x2" || op === "half") lab.multB[who] = clampMult(lab.multB[who] * (op === "x2" ? 2 : 0.5));
    else if (CHIP_NAME[op]) { lab.url[who] = op; lab.multB[who] = 1; }
  }
}
export function multText(m) {
  if (m >= 1) return `x${trim(m, 2)}`;
  const inv = 1 / m; return Number.isInteger(inv) ? `x1/${inv}` : `x${trim(m, 3)}`;
}
/** Log power-of-ten meter position 0..1 for a force. */
export function meterPos(F) {
  const l = Math.log10(F); return Math.min(1, Math.max(0, (l - S2.meterMin) / (S2.meterMax - S2.meterMin)));
}
export function s2Model(lab) {
  const { help } = lab.url;
  if (lab.massMode === "A") {
    const mult = lab.mA * lab.mB;
    const mA = GF.worlds.earth.massKg * lab.mA, mB = GF.worlds.moon.massKg * lab.mB;
    const F = pull(mA, mB, GF.earthMoonM);
    const len = Math.max(0.015, Math.min(S2.arrowMaxA, S2.arrowUnitA * mult));
    const out = {
      mode: "A", mult, arrows: { a: len, b: len }, keepsGoing: S2.arrowUnitA * mult > S2.arrowMaxA + 1e-9, sizes: { a: Math.cbrt(lab.mA), b: Math.cbrt(lab.mB) },
      readout: { label: "Pull multiplier", main: multText(mult), unit: "times the start" },
      lines: [`Pull is now ${multText(mult).replace("x", "")} times the start.`, `A ${multText(lab.mA)}, B ${multText(lab.mB)}`],
      labels: { a: "Pull on A", b: "Pull on B", same: "Same size on both" },
      eq: { m1: mA, m2: mB, r: GF.earthMoonM },
      cards: ["Both objects feel the same size pull. Neither one 'wins'."],
    };
    if (mult === 1) out.lines[0] = "Pull is the same as the start.";
    if (help >= 1) out.lines.push("The pull depends on mass A times mass B.");
    if (help >= 2) out.lines.push(`A starts with Earth's mass and B with the Moon's, 384,400 km apart. Pull now: ${formatNewtons(F)} on each.`);
    if (committed(lab, "massA")) out.result = "Double one mass, double the pull. Double both, 4 times the pull.";
    return out;
  }
  const a = lab.url.a, b = lab.url.b;
  const ma = GF.chips[a].massKg * lab.multB.a, mb = GF.chips[b].massKg * lab.multB.b;
  const pf = pairForce(ma, mb, S2.rB);
  const lens = s2Arrows(ma, mb, S2.rB);
  const pos = meterPos(pf.on1);
  const len = S2.arrowMinM + (S2.arrowMaxM - S2.arrowMinM) * pos;
  const out = {
    mode: "B", meter: pos, power: Math.round(lens.a), arrows: { a: len, b: len }, chips: { a, b }, mult: { ...lab.multB },
    readout: { label: "Pull on A and on B", main: "Same on both", unit: `power-of-ten meter: step ${Math.floor(lens.a) - S2.meterMin} of ${S2.meterMax - S2.meterMin}` },
    lines: [`${chipLabel(a, lab.multB.a)} and ${chipLabel(b, lab.multB.b)}, 10 million km apart.`, "This meter counts in powers of ten."],
    labels: { a: "Pull on A", b: "Pull on B", same: "Same size on both" },
    eq: { m1: ma, m2: mb, r: S2.rB },
    cards: ["Both objects feel the same size pull. Neither one 'wins'."],
  };
  if (help >= 2) { out.readout.main = formatNewtons(pf.on1); out.readout.unit = "on each, the same size"; }
  if (help >= 1) out.lines.push("The pull depends on mass A times mass B.");
  if (help >= 2) {
    out.lines.push(`Pull on each: ${formatNewtons(pf.on1)}`);
    out.lines.push(`${CHIP_NAME[a]} speeds up by ${formatSci(accelOf(ma, mb, S2.rB), 2)} m/s^2, ${CHIP_NAME[b].toLowerCase()} by ${formatSci(accelOf(mb, ma, S2.rB), 2)} m/s^2.`);
    out.lines.push("The pull is the same on both. The lighter one speeds up more, because acceleration is pull divided by mass.");
  }
  if (committed(lab, "massB")) out.result = "Same size, opposite directions.";
  return out;
}
function chipLabel(id, m) { return m === 1 ? CHIP_NAME[id] : `${CHIP_NAME[id]} ${multText(m)}`; }

// ---------------- S3 Weigh Yourself Anywhere ----------------
export const SCALE_FULL_N = 1500;   // spring scale full scale (Angelo: angle_Y = -45 deg - 270 deg x f)
export function needleAngleDeg(n) { const f = Math.min(1, Math.max(0, n / SCALE_FULL_N)); return -45 - 270 * f; }

const S3_RATIO = { earth: "the starting pull", moon: "about 1/6 of Earth's", mars: "about 2/5 of Earth's", jupiter: "about 2 and a half times Earth's", ns: "over a hundred billion times Earth's" };
const S3_LINE = {
  earth: () => `On Earth: the pull on you is ${s3NewtonText("earth")} (${lbFromN(weighN("earth", GF.travelerKg)).text}). That is your weight here.`,
  moon: () => `On the Moon: ${s3NewtonText("moon")} (${lbFromN(weighN("moon", GF.travelerKg)).text}), about one sixth of Earth's. Your mass is still 50 kg.`,
  mars: () => `On Mars: ${s3NewtonText("mars")} (${lbFromN(weighN("mars", GF.travelerKg)).text}), about two fifths of Earth's.`,
  jupiter: () => `Near Jupiter's cloud tops: ${s3NewtonText("jupiter")} (${lbFromN(weighN("jupiter", GF.travelerKg)).text}), about 2.5 times Earth's. Jupiter has no solid ground. This is near where the thick clouds are.`,
  ns: () => `On a neutron star: ${s3NewtonText("ns")} (${lbFromN(weighN("ns", GF.travelerKg)).text}), over 100 billion times Earth's. This star is a ball about 24 km across (about 12 km in radius), with about 1.4 Suns of mass. A 50 kg robot stands here, not you.`,
};
export const S3_TEXT = {
  words: "In this lab, 'weight' means the pull of the world on you. Mass is how much matter you are made of.",
  reveal: "Your mass stays 50 kg. The pull on you changes.",
  scaleHelp: "The scale shows newtons and pounds. Pounds here are a measure of pull, rounded. Mass stays in kilograms.",
  spin: "Real worlds spin, which makes a scale read a little less than the pull, most at the equator. This lab ignores spin.",
  einstein: "Close to a neutron star, Einstein's gravity gives a stronger pull than Newton's, about 1.2 times more. This lab uses Newton's law, so its neutron star numbers are about 20 percent low.",
  nsSign: "about 24 km across, the size of a city",
};
export function s3Model(lab) {
  const { help, world } = lab.url;
  const n = weighN(world, GF.travelerKg);
  const lb = lbFromN(n);
  const g = surfaceG(world);
  const W = GF.worlds[world];
  const out = {
    world, name: WORLD_NAME[world], figure: world === "ns" ? "robot" : "traveler",
    balance: { main: "50 kg", label: "Balance" },
    spring: { main: s3NewtonText(world), sub: lb.text, label: "Spring scale" },
    needleDeg: needleAngleDeg(n), offDial: n > SCALE_FULL_N,
    bar: timesEarth(world),
    readout: { label: "Spring scale", main: s3NewtonText(world), sub: lb.text, second: { label: "Balance", main: "50 kg" } },
    lines: [help >= 1 ? S3_LINE[world]() : `${WORLD_NAME[world]}: ${S3_RATIO[world]}.`, S3_TEXT.scaleHelp],
    eq: { m1: GF.travelerKg, m2: W.massKg, r: W.radiusM },
    cards: [S3_TEXT.words],
    notes: [S3_TEXT.spin, S3_TEXT.einstein],
    order: lab.order.slice(),
  };
  if (help >= 2) {
    out.lines.push(world === "ns"
      ? `g: about ${formatSci(g, 2)} m/s^2 by Newton's law. F = G m M / R^2 with M = ${formatSci(W.massKg, 3)} kg and R = 12 km.`
      : `g: ${trim(roundSig(g, 3), 2)} m/s^2. F = G m M / R^2 with M = ${formatSci(W.massKg, 4)} kg and R = ${group(W.radiusM / 1000)} km.`);
  }
  if (committed(lab, "weigh")) out.result = S3_TEXT.reveal;
  return out;
}

// ---------------- S4 Astronauts Still Have Gravity ----------------
export const S4 = { rulerM: 2.0, rulerKm: 400 };   // the ruler is to scale up to 400 km: 2.0 m stands for 400 km
export const ALT_NAME = { 0: "Ground", 100: "100 km", 400: "Space station, 400 km", 35786: "35,786 km", 384400: "The Moon's distance" };
export function s4Height(alt) { return Math.min(alt, S4.rulerKm) / S4.rulerKm * S4.rulerM; }
export function s4Model(lab) {
  const { help, alt } = lab.url;
  const st = issAt(alt);
  const ground = issAt(0).pull;
  const out = {
    alt, step: lab.issStep, ratio: st.ratio, ghost: 1, arrow: st.ratio, overScale: alt > S4.rulerKm,
    readout: { label: "Pull compared with the ground", main: alt === 0 ? "100" : ratioOutOf100(st.ratio), unit: "out of 100" },
    lines: [], eq: { m1: GF.travelerKg, m2: GF.worlds.earth.massKg, r: GF.worlds.earth.radiusM + alt * 1000 },
    cards: ["Ride the elevator up. Watch the pull arrow."],
    tryLink: { href: "study-newtons-cannonball-fire.html", label: "Try it yourself" },
  };
  if (alt === 0) out.lines.push("On the ground. The ghost arrow shows the pull here.");
  else if (alt === 400) {
    out.lines.push("Almost as long as on the ground.");
    if (help >= 1) out.lines.push("About 89 out of every 100.");
    if (help >= 2) out.lines.push(`${trim(st.ratio * 100, 1)} percent at 400 km. ${trim(st.g, 2)} m/s^2. ${group(st.pull)} N on the traveler.`, "To stay up, the station moves sideways at about 7.7 km/s, so the ground curves away as fast as it falls. One lap takes about 92 minutes.");
  } else if (alt === 100) out.lines.push(`At 100 km: about ${Math.round(st.ratio * 100)} out of 100.`);
  else if (alt === 35786) out.lines.push(`At 35,786 km, where some satellites stay over one spot: about ${Math.round(st.ratio * 100)} out of 100. Smaller, and not zero.`, `The ruler is not long enough. To scale, this stop would be about ${Math.round(35786 / S4.rulerKm * S4.rulerM)} m up.`);
  else if (alt === 384400) out.lines.push("Gravity weakens with height, but slowly. At the Moon's distance, Earth's pull on 1 kg is about 1/3,600 of what it is on the ground. It is small, and it is not zero.");
  if (help >= 2 && alt !== 400 && alt !== 0) out.lines.push(`${trim(roundSig(st.g, 3), 6)} m/s^2. ${formatNewtons(st.pull)} on the traveler.`);
  if (alt === 0 && help >= 2) out.lines.push(`9.82 m/s^2. ${group(ground)} N on the traveler.`);
  if (lab.issStep === "cut") {
    out.cutLabels = { pull: `Pull from Earth: ${group(issAt(400).pull)} N`, scale: "Scale reading: 0 N" };
    out.cards = ["Cut the cable and you float, because you are falling. But you would fall straight down."];
    out.readout = { label: "Scale reading", main: "0 N", sub: `Pull from Earth: ${group(issAt(400).pull)} N` };
  } else if (lab.issStep === "station") {
    out.cards = ["The station floats for the same reason, falling, but it also moves sideways at about 7.7 km/s, so it keeps missing Earth.", "The traveler, the scale and the station are all falling together, so the scale is not pushed."];
    out.readout = { label: "Scale reading", main: "0 N", sub: `Pull from Earth: ${group(issAt(400).pull)} N` };
  }
  if (committed(lab, "iss")) out.result = help >= 2 ? "Almost as strong as on the ground, about 89 out of 100. 88.5 percent at 400 km." : "Almost as strong as on the ground, about 89 out of 100.";
  return out;
}
export function ratioOutOf100(r) { const v = r * 100; return v >= 1 ? String(Math.round(v)) : trim(roundSig(v, 2), 4); }
export function moonDistanceText() { return `about 1/${group(Math.round(1 / moonDistanceRatio() / 10) * 10)}`; }

// ---------------- S5 The Gravity-Well Sheet ----------------
export const SHEET = { radiusM: 0.75, e: 0.12, eTwin: 0.03, k: 0.015, sunSurface: 0.07, capture: 0.035, startX: -0.95, startY: 0.42, speeds: { slow: 0.2, medium: 0.4, fast: 0.85 } };
export const S5_TEXT = {
  opening: "This stretchy sheet is a model, not the real thing. In the model, the ball rolls into the dents because Earth's gravity pulls it down. Real gravity has no 'down' to roll toward: mass curves space and time themselves, and objects follow those curves.",
  wrong: [
    "It uses gravity to explain gravity. The marble rolls into the dent because something below the table pulls it down. In space there is no table and no 'below'.",
    "It is a flat sheet. Space has three dimensions, and time bends too. The sheet shows only one slice.",
    "The dents here are drawn so the steepness matches the pull. A real rubber sheet makes a different shape.",
    "Sizes and dents are not to scale.",
    "Close to a black hole, Newton's rule is not enough. This lab only trusts it far from the hole.",
  ],
  notToScale: "Not to scale. Real masses differ much more than the sheet can show.",
  bhLabel: "Newton's rule is not enough close to here",
  twin: "From far away, a black hole pulls just like a star of the same mass. This is a pretend swap: the Sun will not become a black hole.",
  twinLink: "See the full black hole pull test in Life of a Star.",
  result: "Heavier means more bending at the same speed and distance.",
};
export function objCard(obj) {
  if (obj === "earth") return `Earth: 5.97 x 10^24 kg. Strength 1.`;
  if (obj === "wd") return `White dwarf: about 0.6 Suns, about 9,000 km in radius (a little bigger than Earth). Strength 5.`;
  if (obj === "sun") return `Sun: 1 Sun. Strength 8.`;
  return `Black hole: 10 Suns (an example), horizon ${bhHorizonText()} in radius. Strength 16.`;
}
export const SORT_CARDS = [
  { id: "c1", text: "The closer to the mass, the stronger the pull.", bin: "real", why: "Real: S1 showed it, twice as far gives a quarter of the pull." },
  { id: "c2", text: "A heavier object pulls harder.", bin: "real", why: "Real: S2 showed it, double a mass and the pull doubles." },
  { id: "c3", text: "A marble's path bends toward the object.", bin: "real", why: "Real: paths near a mass bend, like the station falling around Earth." },
  { id: "c4", text: "Space is a stretchy rubber sheet.", bin: "model", why: "Model: the sheet is a picture. Space is not made of rubber." },
  { id: "c5", text: "Marbles roll because Earth is pulling them down under the table.", bin: "model", why: "Model: that is the sheet using gravity to explain gravity." },
  { id: "c6", text: "The sheet is flat, so space only has two dimensions.", bin: "model", why: "Model: space has three dimensions. The sheet shows one slice." },
];
export function sortPick(lab, id, bin) {
  if (!SORT_CARDS.some((c) => c.id === id) || !["real", "model"].includes(bin)) return false;
  lab.sortPicks[id] = bin; return true;
}
export function sortReveal(lab) {
  return SORT_CARDS.filter((c) => lab.sortPicks[c.id]).map((c) => ({ id: c.id, text: c.text, picked: lab.sortPicks[c.id], model: c.bin, why: c.why }));
}
/** Sheet strength in sim units. The twin is the Sun's mass (strength 8), never the 10 Sun black hole's 16. */
export function sheetStrength(obj, twin) { return SHEET.k * GF.sheet[twin && obj === "sun" ? "sun" : obj].strength; }
export function sheetSoft(obj, twin) { return twin && obj === "sun" ? SHEET.eTwin : SHEET.e; }
export function launchMarble(lab, speed = lab.speed, opts = {}) {
  const v = SHEET.speeds[speed] || SHEET.speeds.medium;
  const y = opts.y != null ? opts.y : SHEET.startY;
  const m = { x: SHEET.startX, y, vx: v, vy: 0, s: sheetStrength(lab.url.obj, lab.url.twin), e: sheetSoft(lab.url.obj, lab.url.twin), mass: opts.mass || 0.005, trail: [[SHEET.startX, y]], t: 0, done: null, speed, ghost: !!opts.ghost };
  lab.marbles.push(m); if (lab.marbles.length > 8) lab.marbles.shift();
  return m;
}
export function s5Model(lab) {
  const { help, obj, twin } = lab.url;
  const out = {
    obj, twin: !!twin && obj === "sun", name: twin && obj === "sun" ? "Same mass twin" : OBJ_NAME[obj], strength: GF.sheet[obj].strength,
    readout: { label: "Sheet strength", main: String(twin && obj === "sun" ? 8 : GF.sheet[obj].strength), unit: "not to scale" },
    lines: [objCard(obj), S5_TEXT.notToScale], cards: [S5_TEXT.opening], wrong: S5_TEXT.wrong,
    eq: { m1: obj === "earth" ? GF.worlds.earth.massKg : obj === "wd" ? GF.wdMassKg : obj === "sun" ? GF.sunMassKg : GF.bhMassKg, m2: 1, r: GF.auM },
    eqNote: "Equation tiles: the center object and 1 kg at 1 AU (Earth's distance from the Sun).",
    sort: SORT_CARDS.map((c) => ({ id: c.id, text: c.text, picked: lab.sortPicks[c.id] || null })), sortReveal: sortReveal(lab),
  };
  if (obj === "bh") out.label = S5_TEXT.bhLabel;
  if (out.twin) { out.lines.unshift(S5_TEXT.twin); out.link = { href: "study-stellar-life.html", label: S5_TEXT.twinLink }; out.lines[1] = `Same mass twin: a pretend black hole of 1 Sun, horizon about 3 km. Strength 8.`; }
  if (help >= 1) out.lines.push("Faint path: the same flick at twice the distance.");
  const last = lab.marbles.filter((m) => !m.ghost).slice(-1)[0];
  if (help >= 2 && last) {
    const r = Math.hypot(last.x, last.y), r0 = Math.hypot(SHEET.startX, last.trail[0][1]);
    out.lines.push(`Marble distance from the center: ${trim(r / SHEET.radiusM * SHEET.radiusM, 2)} sheet units. Pull compared with the launch point: ${trim(roundSig((r0 / Math.max(r, 1e-3)) ** 2, 2), 2)} times.`);
  }
  if (committed(lab, "well")) out.result = S5_TEXT.result;
  return out;
}
/** Advance marbles. Stops at the Sun's surface (not for the twin) and inside the capture radius. */
export function stepSheet(lab, dt, stepFn) {
  const sun = lab.url.obj === "sun" && !lab.url.twin;
  for (const m of lab.marbles) {
    if (m.done) continue;
    const n = Math.max(1, Math.ceil(dt / 0.004)); const h = dt / n;
    for (let i = 0; i < n; i++) {
      const nx = stepFn(m, h); m.x = nx.x; m.y = nx.y; m.vx = nx.vx; m.vy = nx.vy; m.t += h;
      const r = Math.hypot(m.x, m.y);
      if (sun && r < SHEET.sunSurface) { m.done = "surface"; break; }
      if (r < SHEET.capture * (lab.url.obj === "bh" ? 1.4 : 1) && !sun) { m.done = "fell in"; break; }
      if (r > 1.35 || m.t > 14) { m.done = "left"; break; }
    }
    m.trail.push([m.x, m.y]); if (m.trail.length > 600) m.trail.shift();
  }
}

// ---------------- the whole scene, for the page and the headset ----------------
export function sceneModel(lab) {
  const sc = lab.url.scene;
  const m = sc === "pull" ? s1Model(lab) : sc === "mass" ? s2Model(lab) : sc === "weigh" ? s3Model(lab) : sc === "iss" ? s4Model(lab) : s5Model(lab);
  const key = predictKey(lab); const P = PREDICT[key];
  m.scene = sc; m.title = SCENE_TITLE[sc]; m.kicker = `Gravity Lab | S${SCENE_ORDER.indexOf(sc) + 1}`;
  m.help = lab.url.help;
  m.predict = { key, text: P.text, chips: P.order ? SCENE_WORLDS.map((w) => WORLD_NAME[w]) : P.chips, ids: P.order ? SCENE_WORLDS : P.chips, order: !!P.order, picked: lab.predict[key] ?? null, progress: P.order ? lab.order.map((w) => WORLD_NAME[w]) : null };
  m.reveal = revealOf(lab, key);
  if (!m.reveal) delete m.result;   // T18: nothing about the answer before a commit
  m.showEq = lab.url.help >= 1;
  return m;
}

// ---------------- controls and actions (the same list on the page and on the headset panel) ----------------
export function controlsFor(lab) {
  const u = lab.url; const b = (id, label, o = {}) => ({ id, label, ...o });
  const out = [];
  if (u.scene === "pull") {
    out.push(b("dist:closer", "Closer"), b("dist:farther", "Farther"), b("dist:x2", "x2 distance"), b("dist:half", "Half distance"), b("pin", "Pin it", { primary: true }));
    if (u.help >= 1) out.push(b("why", "Why?", { on: lab.whyCard }));
  } else if (u.scene === "mass") {
    if (lab.massMode === "A") out.push(b("A:x2", "A x2"), b("A:half", "A half"), b("B:x2", "B x2"), b("B:half", "B half"), b("A:x3", "A x3"), b("mode:B", "Real bodies", { primary: true }));
    else {
      for (const w of ["a", "b"]) for (const c of ["ball", "earth", "sun", "wd"]) out.push(b(`${w}:${c}`, `${w.toUpperCase()}: ${CHIP_NAME[c]}`, { on: u[w] === c && lab.multB[w] === 1, group: w }));
      out.push(b("a:x2", "A x2"), b("a:half", "A half"), b("b:x2", "B x2"), b("b:half", "B half"), b("mode:A", "Doubling"));
    }
  } else if (u.scene === "weigh") {
    for (const w of SCENE_WORLDS) out.push(b(`world:${w}`, WORLD_NAME[w], { on: u.world === w }));
  } else if (u.scene === "iss") {
    for (const a of [0, 100, 400, 35786, 384400]) out.push(b(`alt:${a}`, a === 0 ? "Ground" : a === 384400 ? "Moon's distance" : `${group(a)} km`, { on: u.alt === a && lab.issStep === "ride" }));
    out.push(b("cut", "Cut the cable", { disabled: u.alt !== 400 || lab.issStep !== "ride", on: lab.issStep === "cut" }));
    out.push(b("station", "Now ride the station", { disabled: lab.issStep !== "cut", on: lab.issStep === "station" }));
  } else {
    for (const o of ["earth", "wd", "sun", "bh"]) out.push(b(`obj:${o}`, OBJ_NAME[o], { on: u.obj === o && !(o === "sun" && u.twin) }));
    out.push(b("twin", "Same mass twin", { on: !!u.twin, disabled: u.obj !== "sun" }));
    for (const sp of ["slow", "medium", "fast"]) out.push(b(`speed:${sp}`, sp[0].toUpperCase() + sp.slice(1), { on: lab.speed === sp }));
    out.push(b("flick", "Flick a marble", { primary: true }), b("clear", "Clear marbles"), b("wrong", "What the picture gets wrong", { on: lab.wrongCard }));
  }
  out.push(b("reset", "Reset scene"), b("next", "Next"));
  return out;
}

/** Apply one control. Returns true when something changed. canHelp is gf-state.canSetHelp. */
export function act(lab, id, canHelp) {
  const u = lab.url; const [k, v, w] = id.split(":");
  if (k === "predict") return commitPredict(lab, id.slice(8));
  if (k === "scene") { if (isLocked(u, "scene") || !SCENE_ORDER.includes(v)) return false; u.scene = v; return true; }
  if (k === "next") { if (isLocked(u, "scene")) return false; u.scene = SCENE_ORDER[(SCENE_ORDER.indexOf(u.scene) + 1) % SCENE_ORDER.length]; return true; }
  if (k === "help") { const lv = +v; if (!canHelp || !canHelp(lv, "tab", u)) return false; u.help = lv; return true; }
  if (k === "reset") { resetScene(lab); return true; }
  if (u.scene === "pull") {
    if (k === "dist") { const d = u.dist; u.dist = clampDist(v === "x2" ? d * 2 : v === "half" ? d / 2 : v === "closer" ? d - 0.25 : v === "farther" ? d + 0.25 : +v); return true; }
    if (k === "pin") { addPin(lab); return true; }
    if (k === "why") { lab.whyCard = !lab.whyCard; return true; }
  }
  if (u.scene === "mass") {
    if (k === "mode") { lab.massMode = v === "B" ? "B" : "A"; return true; }
    massAct(lab, id); return true;
  }
  if (u.scene === "weigh" && k === "world" && WORLD_NAME[v]) { u.world = v; lab.visited[v] = true; return true; }
  if (u.scene === "iss") {
    if (k === "alt") { u.alt = +v; lab.issStep = "ride"; return true; }
    if (k === "cut" && u.alt === 400) { lab.issStep = "cut"; return true; }
    if (k === "station" && lab.issStep === "cut") { lab.issStep = "station"; return true; }
  }
  if (u.scene === "well") {
    if (k === "obj" && OBJ_NAME[v]) { u.obj = v; if (v !== "sun") u.twin = false; lab.marbles = []; return true; }
    if (k === "twin") { if (u.obj !== "sun") return false; u.twin = !u.twin; lab.marbles = []; return true; }
    if (k === "speed" && SHEET.speeds[v]) { lab.speed = v; return true; }
    if (k === "flick") { launchMarble(lab); if (u.help >= 1) launchMarble(lab, lab.speed, { y: SHEET.startY * 2, ghost: true }); return true; }
    if (k === "clear") { lab.marbles = []; return true; }
    if (k === "wrong") { lab.wrongCard = !lab.wrongCard; return true; }
    if (k === "sort") return sortPick(lab, v, w);
  }
  return false;
}
export function resetScene(lab) {
  const u = lab.url;
  if (u.scene === "pull") { u.dist = 1; lab.pins = []; lab.whyCard = false; }
  else if (u.scene === "mass") { lab.mA = 1; lab.mB = 1; lab.multB = { a: 1, b: 1 }; u.a = "earth"; u.b = "sun"; lab.massMode = "A"; }
  else if (u.scene === "weigh") { u.world = "earth"; lab.order = []; if (!isLocked(u, "predict")) delete lab.predict.weigh; }
  else if (u.scene === "iss") { u.alt = 0; lab.issStep = "ride"; }
  else { u.obj = "earth"; u.twin = false; lab.marbles = []; lab.speed = "medium"; lab.wrongCard = false; lab.sortPicks = {}; }
}
