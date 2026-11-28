// Gravity Force Lab: equation panel and the section 6.3 worked problems.
// Data and formatters are pure. renderPanel writes a container's innerHTML.
// Forces are in newtons. The spring-scale wording lives in gf-sim and is not used here.
//   node --test tests/gf-panel.test.mjs

import { canSetHelp } from "./gf-state.js";
import {
  GF, pull, weighN, issAt, surfaceG, moonDistanceRatio, distanceFactor,
  formatSci, roundSig,
} from "./gf-sim.js";

export const RATIO_RULES = Object.freeze([
  "r x2 gives F / 4.",
  "r x3 gives F / 9.",
  "r x1/2 gives F x 4.",
  "m1 x2 gives F x2.",
  "m1 x2 and m2 x2 gives F x4.",
  "m1 x3 and m2 x1/2 gives F x1.5.",
]);

export const WATCH_FOR = Object.freeze([
  "Using surface-to-surface distance",
  "Forgetting to square r",
  "Mixing km and m",
  "Adding the masses",
  "Writing 10^11 instead of 10^-11",
]);

export const TEACHER_NOTES = Object.freeze([
  "The equation treats each object as a point at its center. For round objects it works exactly outside the surface.",
  "The equation says how strong the pull is. It does not say why masses attract.",
  "Einstein's gravity replaces it when gravity is extremely strong, as near a neutron star's surface or a black hole.",
  "This lab uses g = 9.82. Newton's Mountain uses rounded lesson constants (g about 9.78), so its surface numbers can differ in the third digit. The ISS percent agrees (88.5 in both).",
]);

function groupInt(n) {
  const sign = n < 0 ? "-" : "";
  const s = String(Math.abs(Math.round(n)));
  return sign + s.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/** A force for the live readout. Hundreds and thousands round to the nearest newton. */
export function formatNewtons(n, sig = 3) {
  if (!Number.isFinite(n)) return "";
  const a = Math.abs(n);
  if (a >= 100 && a < 10000) return `${groupInt(Math.round(n))} N`;
  if (a >= 0.1 && a < 100) return `${trimNum(roundSig(n, 3))} N`;
  return `${formatSci(n, sig)} N`;
}

function trimNum(n) {
  if (!Number.isFinite(n)) return "";
  const r = Math.round(n * 1e6) / 1e6;
  return String(r);
}

/** Tile text. Up to 5 significant figures, trailing zeros stripped. */
export function formatValue(n) {
  if (!Number.isFinite(n)) return "";
  const a = Math.abs(n);
  if (a === 0) return "0";
  if (a >= 0.001 && a < 10000) return trimNum(n);
  return formatSci(n, 5).replace(/(\.\d*?)0+( x )/, "$1$2").replace(/\. x /, " x ");
}

function trimFactor(k) {
  if (!Number.isFinite(k)) return "";
  return trimNum(Math.round(k * 1000) / 1000);
}

/** Bubbles for a live change. "m1 x2", "r x2 so r^2 x4". */
export function changeNotes(prev, next) {
  if (!prev || !next) return [];
  const notes = [];
  if (isFactor(prev.m1, next.m1)) notes.push({ tile: "m1", text: `m1 x${trimFactor(next.m1 / prev.m1)}` });
  if (isFactor(prev.m2, next.m2)) notes.push({ tile: "m2", text: `m2 x${trimFactor(next.m2 / prev.m2)}` });
  if (isFactor(prev.r, next.r)) {
    const k = next.r / prev.r;
    notes.push({ tile: "r", text: `r x${trimFactor(k)} so r^2 x${trimFactor(k * k)}` });
  }
  return notes;
}

function isFactor(before, after) {
  return Number.isFinite(before) && before !== 0 && Number.isFinite(after) && after !== before;
}

function helpLevel(help) {
  return help === 1 || help === 2 ? help : 0;
}

/**
 * Live equation model. help 0 hides it. help 1 is the ratio form.
 * help 2 is F = G m1 m2 / r^2 with numbers.
 * Pass previous: { m1, m2, r } to get change bubbles.
 */
export function equationModel(input = {}) {
  const help = helpLevel(input.help);
  if (help === 0) return { help: 0, visible: false, text: "", tiles: [], notes: [], force: null };
  const m1 = input.m1;
  const m2 = input.m2;
  const r = input.r;
  const notes = changeNotes(input.previous, { m1, m2, r });
  if (help === 1) {
    return {
      help: 1,
      visible: true,
      form: "proportional",
      text: "F is proportional to m1 x m2 / r^2.",
      tiles: [
        { id: "m1", label: "m1" },
        { id: "m2", label: "m2" },
        { id: "r", label: "r^2" },
      ],
      notes,
      force: null,
    };
  }
  const force = pull(m1, m2, r);
  return {
    help: 2,
    visible: true,
    form: "full",
    text: `F = G x m1 x m2 / r^2 = ${formatNewtons(force)}`,
    tiles: [
      { id: "G", label: "G", value: GF.G, unit: "N m^2/kg^2", text: formatSci(GF.G, 5) },
      { id: "m1", label: "m1", value: m1, unit: "kg", text: formatValue(m1) },
      { id: "m2", label: "m2", value: m2, unit: "kg", text: formatValue(m2) },
      { id: "r", label: "r", value: r, unit: "m", text: formatValue(r) },
    ],
    notes,
    force,
  };
}

/** Help-tab buttons. enabled comes from canSetHelp(..., "tab", state). */
export function helpButtons(state) {
  const st = state || { help: 0, lock: [] };
  return [0, 1, 2].map((level) => ({
    level,
    label: level === 0 ? "0 Observe" : level === 1 ? "1 Reasons" : "2 Explain",
    selected: st.help === level,
    enabled: canSetHelp(level, "tab", st),
  }));
}

/** Set A, Set B, and the exit-ticket force. Numeric fields are gf-sim values. */
export function workedProblems() {
  const earth = GF.worlds.earth;
  const moon = GF.worlds.moon;
  const b1 = pull(GF.travelerKg, earth.massKg, earth.radiusM);
  const mg = GF.travelerKg * GF.gCompare;
  const b2 = pull(earth.massKg, moon.massKg, GF.earthMoonM);
  const b3 = pull(GF.studentAKg, GF.studentBKg, GF.studentSeparationM);
  const b3ratio = b1 / b3;
  const b4 = pull(GF.sunMassKg, earth.massKg, GF.auM);
  const iss = issAt(GF.issAltKm);
  const aMoon = b2 / moon.massKg;
  const aEarth = b2 / earth.massKg;
  const b7 = weighN("ns", GF.travelerKg);
  const quarter = b1 / 4;
  const distRatio = moonDistanceRatio();
  const radii = GF.earthMoonM / earth.radiusM;
  const exitN = pull(GF.satelliteKg, earth.massKg, GF.satelliteRM);
  const speckMg = (b3 / surfaceG("earth")) * 1e6;
  const massRatio = earth.massKg / moon.massKg;
  const pct = (100 * iss.pull) / b1;

  return [
    {
      id: "A1", set: "A",
      prompt: "The distance between two planets doubles. What happens to the pull? Triples? Halves?",
      values: [distanceFactor(2), distanceFactor(3), distanceFactor(0.5)],
      ratioText: "1/4. 1/9. 4 times.",
      fullText: "1/4. 1/9. 4 times.",
    },
    {
      id: "A2", set: "A",
      prompt: "One mass doubles. Both masses double. One triples and the other halves.",
      values: [2, 4, 1.5],
      ratioText: "x2. x4. x1.5.",
      fullText: "x2. x4. x1.5.",
    },
    {
      id: "A3", set: "A",
      prompt: "A traveler on the ground climbs until she is one Earth radius above the ground (twice as far from Earth's center). How does the pull change?",
      values: [0.25, quarter],
      ratioText: "1/4 of the ground value.",
      fullText: `1/4 of the ground value. (${Math.round(b1)} N becomes about ${Math.round(quarter)} N.)`,
    },
    {
      id: "A4", set: "A",
      prompt: "The Moon is about 60 Earth radii from Earth's center. Roughly how strong is Earth's pull on 1 kg at the Moon, compared with on the ground?",
      values: [distRatio, radii],
      ratioText: "About 1/3,600.",
      fullText: `About 1/3,600 (1/${groupInt(Math.round(1 / distRatio))} using ${radii.toFixed(2)} radii).`,
    },
    {
      id: "A5", set: "A",
      prompt: "Why does a bowling ball not pull the whole room toward it?",
      values: [],
      ratioText: "Its mass is tiny compared with Earth's, so its pull is tiny.",
      fullText: "Its mass is tiny compared with Earth's, so its pull is tiny.",
    },
    {
      id: "B1", set: "B",
      prompt: "Pull between the 50 kg traveler and Earth at Earth's surface. Compare with m g, g = 9.8.",
      setup: "F = G m M / R^2",
      value: b1,
      mg,
      ratioText: "",
      fullText: `${Math.round(b1)} N. m g = ${Math.round(mg)} N. They match because weight is this pull. Accept 485 to 492 N depending on rounding.`,
    },
    {
      id: "B2", set: "B",
      prompt: "Pull between Earth and the Moon.",
      setup: "F = G m1 m2 / r^2",
      value: b2,
      ratioText: "",
      fullText: `${formatSci(b2, 3)} N`,
    },
    {
      id: "B3", set: "B",
      prompt: "Two students, 50 kg and 60 kg, 1.0 m apart (center to center). Compare with Earth's pull on the 50 kg student.",
      setup: "F = G m1 m2 / r^2",
      value: b3,
      ratio: b3ratio,
      ratioText: "",
      fullText: `${formatSci(b3, 2)} N. Earth's pull on the student (${Math.round(b1)} N) is ${formatSci(b3ratio, 3)} times as large. That is why you do not feel a student next to you. ${formatSci(b3, 2)} N is the weight of a ${Number(speckMg.toPrecision(2))} mg speck.`,
    },
    {
      id: "B4", set: "B",
      prompt: "Pull between the Sun and Earth.",
      setup: "F = G m1 m2 / r^2",
      value: b4,
      ratioText: "",
      fullText: `${formatSci(b4, 3)} N`,
    },
    {
      id: "B5", set: "B",
      prompt: "Pull on the 50 kg traveler at the ISS, 400 km up. Compare with the ground.",
      setup: "F = G m M / r^2",
      value: iss.pull,
      ratio: iss.ratio,
      ratioText: "",
      fullText: `${Math.round(iss.pull)} N, which is ${pct.toFixed(1)} percent of ${Math.round(b1)} N.`,
    },
    {
      id: "B6", set: "B",
      prompt: "Acceleration of the Moon and of Earth from the pull between them.",
      setup: "a = F / m",
      value: aMoon,
      earthAccel: aEarth,
      massRatio,
      ratioText: "",
      fullText: `Moon: ${formatSci(aMoon, 3)} m/s^2. Earth: ${formatSci(aEarth, 3)} m/s^2. Same force, but the Moon accelerates about ${Math.round(massRatio)} times as much (${massRatio.toFixed(1)}) because its mass is that many times smaller.`,
    },
    {
      id: "B7", set: "B",
      prompt: "A 50 kg robot stands on a neutron star (1.4 Suns, 12 km in radius, about 24 km across). Find the pull by Newton's law.",
      setup: "F = G m M / R^2",
      value: b7,
      ratioText: "",
      fullText: `About ${formatSci(b7, 2)} N. Einstein's gravity gives somewhat more.`,
    },
    {
      id: "E1", set: "exit",
      prompt: "Find the pull between Earth and a 1,000 kg satellite 7.0 x 10^6 m from Earth's center.",
      setup: "F = G m M / r^2",
      value: exitN,
      ratioText: "",
      fullText: `${formatSci(exitN, 3)} N`,
    },
  ];
}

export function problemById(id) {
  return workedProblems().find((p) => p.id === id) || null;
}

/** Answer string for a help level. Empty when that level does not show it. */
export function formatAnswer(id, help) {
  const p = problemById(id);
  if (!p) return "";
  const h = helpLevel(help);
  if (p.set === "A") {
    if (h < 1) return "";
    return h === 1 ? p.ratioText : p.fullText;
  }
  return h < 2 ? "" : p.fullText;
}

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function readoutHtml(eq) {
  if (!eq.visible) return `<div class="gf-readout" data-visible="false"></div>`;
  const tiles = eq.tiles.map((t) => {
    const body = t.text != null ? `<span class="gf-tile-value">${esc(t.text)}</span>` : "";
    const unit = t.unit ? `<span class="gf-tile-unit">${esc(t.unit)}</span>` : "";
    return `<div class="gf-tile" data-tile="${esc(t.id)}"><span class="gf-tile-label">${esc(t.label)}</span>${body}${unit}</div>`;
  }).join("");
  const notes = (eq.notes || []).map((n) => `<p class="gf-bubble" data-tile="${esc(n.tile)}">${esc(n.text)}</p>`).join("");
  return `<div class="gf-readout" data-visible="true" data-form="${esc(eq.form)}"><p class="gf-formula">${esc(eq.text)}</p><div class="gf-tiles">${tiles}</div>${notes}</div>`;
}

function rulesHtml() {
  const items = RATIO_RULES.map((r) => `<li>${esc(r)}</li>`).join("");
  return `<ul class="gf-rules">${items}</ul>`;
}

function problemsHtml(help) {
  const blocks = workedProblems().filter((p) => (p.set === "A" ? help >= 1 : help >= 2));
  const cards = blocks.map((p) => {
    const answer = formatAnswer(p.id, help);
    const setup = help >= 2 && p.setup ? `<p class="gf-setup">${esc(p.setup)}</p>` : "";
    const ans = answer ? `<p class="gf-answer">${esc(answer)}</p>` : "";
    return `<article class="gf-problem" data-id="${esc(p.id)}" data-set="${esc(p.set)}"><p class="gf-prompt">${esc(p.prompt)}</p>${setup}${ans}</article>`;
  }).join("");
  return `<div class="gf-problems">${cards}</div>`;
}

function helpTabHtml(buttons) {
  const html = buttons.map((b) => {
    const on = b.selected ? ` aria-pressed="true"` : ` aria-pressed="false"`;
    const dis = b.enabled ? "" : " disabled";
    return `<button type="button" data-help-level="${b.level}"${on}${dis}>${esc(b.label)}</button>`;
  }).join("");
  return `<div class="gf-help">${html}</div>`;
}

/** Student panel markup for a help level. Pass m1, m2, r, help, lock, previous. */
export function panelMarkup(opts = {}) {
  const help = helpLevel(opts.help);
  const eq = equationModel({ ...opts, help });
  const buttons = helpButtons({ help, lock: opts.lock || [] });
  return `<section class="gf-panel" data-help="${help}">${readoutHtml(eq)}${help >= 1 ? rulesHtml() : ""}${help >= 1 ? problemsHtml(help) : ""}${helpTabHtml(buttons)}</section>`;
}

/** Teacher answer key. Every Set A and Set B answer, plus the exit ticket. */
export function answerKeyMarkup() {
  const cards = workedProblems().map((p) => {
    const setup = p.setup ? `<p class="gf-setup">${esc(p.setup)}</p>` : "";
    return `<article class="gf-problem" data-id="${esc(p.id)}" data-set="${esc(p.set)}"><p class="gf-prompt">${esc(p.prompt)}</p>${setup}<p class="gf-answer">${esc(p.fullText)}</p></article>`;
  }).join("");
  const watch = WATCH_FOR.map((w) => `<li>${esc(w)}</li>`).join("");
  const notes = TEACHER_NOTES.map((w) => `<li>${esc(w)}</li>`).join("");
  return `<section class="gf-key"><div class="gf-problems">${cards}</div><ul class="gf-watch">${watch}</ul><ul class="gf-teacher">${notes}</ul></section>`;
}

export function renderPanel(container, opts) {
  const html = panelMarkup(opts);
  if (container != null) container.innerHTML = html;
  return html;
}

export function renderAnswerKey(container) {
  const html = answerKeyMarkup();
  if (container != null) container.innerHTML = html;
  return html;
}
