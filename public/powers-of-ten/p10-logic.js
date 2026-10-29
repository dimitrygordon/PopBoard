// Powers of Ten: plate data, zoom math, detents, Size Hunt, predictions and challenge goals.
// Pure (no DOM), so Node tests can import it. Every size and threshold is TODO-TESLA
// (see docs/powers-of-ten-science.md and docs/fun-challenges.md).
export const MODULE_ID = "powers-of-ten";

// z is the base-10 log of the height of the view, in meters. Detents sit on whole numbers.
export const Z_MIN = -16, Z_MAX = 27;
export const POWERS = Array.from({ length: Z_MAX - Z_MIN + 1 }, (_, i) => Z_MIN + i); // 44 powers
// A plate fills FILL of the view when it is "in focus".
export const FILL = 0.6;

// Approximate sizes (m) from the plate manifest (cleared by Tesla 2026-10-29; TODO-TESLA recheck copy).
export const PLATES = [
  { id: "proton", file: "01-proton.webp", name: "Proton", size: 1.7e-15, caption: "Three quarks held together inside.", alt: "A proton drawn as a ball holding three quarks" },
  { id: "atom", file: "02-atom.webp", name: "Atom", size: 1e-10, caption: "Nucleus enlarged; electrons form a cloud, not orbits.", alt: "An atom: a small nucleus inside a soft electron cloud" },
  { id: "dna", file: "03-dna.webp", name: "DNA double helix", size: 2e-9, caption: "About two nanometers across.", alt: "A twisted DNA double helix" },
  { id: "virus", file: "04-virus.webp", name: "Virus", size: 1e-7, caption: "Much smaller than a cell.", alt: "A round virus particle with spikes" },
  { id: "cell", file: "05-cell.webp", name: "Animal cell", size: 1e-5, caption: "A nucleus sits inside.", alt: "An animal cell with its nucleus" },
  { id: "ant", file: "06-ant.webp", name: "Ant", size: 1e-3, caption: "Six legs, all on the thorax.", alt: "An ant seen from above" },
  { id: "person", file: "07-person.webp", name: "Person", size: 1.7, caption: "You are here.", alt: "A standing person" },
  { id: "building", file: "08-building.webp", name: "Office building", size: 1e2, caption: "About thirty floors.", alt: "A tall office building" },
  { id: "city", file: "09-city.webp", name: "City", size: 1e4, caption: "Streets, parks and a river.", alt: "A city seen from above" },
  { id: "earth", file: "10-earth.webp", name: "Earth", size: 1.27e7, caption: "Our home planet.", alt: "Planet Earth" },
  { id: "earth-moon", file: "11-earth-moon.webp", name: "Earth and Moon", size: 7.7e8, caption: "Not to scale.", alt: "Earth and the Moon" },
  { id: "solar-system", file: "12-solar-system.webp", name: "Solar system", size: 1e13, caption: "Not to scale.", alt: "The Sun and eight planets, Mercury to Neptune" },
  { id: "nearby-stars", file: "13-nearby-stars.webp", name: "Nearby stars", size: 1e17, caption: "Our Sun's neighbors.", alt: "A scatter of nearby stars" },
  { id: "milky-way", file: "14-milky-way.webp", name: "Milky Way", size: 1e21, caption: "Our galaxy, seen face on.", alt: "The spiral Milky Way galaxy" },
  { id: "local-group", file: "15-local-group.webp", name: "Local Group", size: 1e23, caption: "Our galaxy's neighborhood.", alt: "A group of galaxies" },
  { id: "cosmic-web", file: "16-cosmic-web.webp", name: "Cosmic web", size: 1e26, caption: "Galaxies strung along threads.", alt: "Threads of galaxies forming a web" }
].map((p) => ({ ...p, exp: Math.log10(p.size), focus: Math.log10(p.size / FILL) }));

export const clampZ = (z) => Math.min(Z_MAX, Math.max(Z_MIN, z));
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// Opacity of every plate at zoom z. Between two neighbors the crossfade happens in the middle
// of the log gap, so each plate owns most of its stretch. Weights sum to 1.
export function plateWeights(z) {
  const f = PLATES.map((p) => p.focus), w = new Array(PLATES.length).fill(0);
  if (z <= f[0]) { w[0] = 1; return w; }
  if (z >= f[f.length - 1]) { w[w.length - 1] = 1; return w; }
  let i = 0; while (z > f[i + 1]) i++;
  const t = (z - f[i]) / (f[i + 1] - f[i]), b = smooth(0.35, 0.65, t);
  w[i] = 1 - b; w[i + 1] = b; return w;
}
// Fraction of the view height a plate covers at zoom z. A true zoom changes size by 10x per
// power; over long gaps that would shrink a plate to a dot before it fades, so the growth is
// eased (tanh) into a 10^±SPREAD band around its focus. Monotonic: zooming out always shrinks it.
export const SPREAD = 0.9;
export function plateFraction(p, z) { const d = z - p.focus; return FILL * Math.pow(10, -SPREAD * Math.tanh(d / SPREAD)); }
export function dominantPlate(z) { const w = plateWeights(z); return w.indexOf(Math.max(...w)); }

// Detents: momentum projection (UIScrollView d = 0.998) then the nearest whole power.
export function projectZ(z, v, d = 0.998) { return z + (v / 1000) * d / (1 - d); }
export function detentFor(z, v = 0) { return clampZ(Math.round(projectZ(z, v))); }
// Whole powers crossed moving from a to b (for the soft tick and for stamps).
export function crossed(a, b) {
  const lo = Math.min(a, b), hi = Math.max(a, b), out = [];
  for (let n = Math.ceil(lo); n <= Math.floor(hi); n++) if (n >= Z_MIN && n <= Z_MAX && !(n === a)) out.push(n);
  return out;
}
const SUP = { "-": "\u207b", 0: "\u2070", 1: "\u00b9", 2: "\u00b2", 3: "\u00b3", 4: "\u2074", 5: "\u2075", 6: "\u2076", 7: "\u2077", 8: "\u2078", 9: "\u2079" };
export const sup = (n) => String(n).split("").map((c) => SUP[c] ?? c).join("");
export const formatPower = (n) => `10${sup(n)} m`;
// Plain-words size, e.g. 1.7 m, 1 mm, 12,700 km. Used in captions.
export function plainSize(m) {
  const units = [[1e-12, "pm"], [1e-9, "nm"], [1e-6, "\u00b5m"], [1e-3, "mm"], [1, "m"], [1e3, "km"]];
  if (m < 1e-12 || m >= 1e9) { const e = Math.floor(Math.log10(m)), c = m / 10 ** e; return `${Math.abs(c - 1) < 1e-9 ? "" : (Math.round(c * 10) / 10) + " \u00d7 "}10${sup(e)} m`; }
  let u = units[0]; for (const x of units) if (m >= x[0]) u = x;
  const v = m / u[0], r = v >= 100 ? Math.round(v) : Math.round(v * 10) / 10;
  return `${r.toLocaleString("en-US")} ${u[1]}`;
}
// How many powers of ten bigger B is than A, to the nearest whole power.
export const powersBetween = (a, b) => Math.round(Math.log10(b.size / a.size));
export const byId = (id) => PLATES.find((p) => p.id === id);

// ---------- Size Hunt ----------
// The target counts as found when the view settles on a power within HUNT_TOL of its focus.
export function huntFound(target, z, tol = FUN.huntTol) { return Math.abs(z - target.focus) <= tol; }
export function nextHunt(prevId, rand = Math.random) {
  const pool = PLATES.filter((p) => p.id !== prevId);
  return pool[Math.floor(rand() * pool.length) % pool.length];
}

// ---------- Predict, then run ----------
export const PREDICTIONS = [
  { a: "person", b: "earth", q: "From a person to the whole Earth: how many powers of ten?" },
  { a: "ant", b: "person", q: "From an ant to a person: how many powers of ten?" },
  { a: "atom", b: "cell", q: "From an atom to a cell: how many powers of ten?" },
  { a: "earth", b: "solar-system", q: "From Earth to the solar system: how many powers of ten?" },
  { a: "city", b: "earth", q: "From a city to the whole Earth: how many powers of ten?" },
  { a: "milky-way", b: "cosmic-web", q: "From the Milky Way to the cosmic web: how many powers of ten?" }
].map((p) => ({ ...p, answer: powersBetween(byId(p.a), byId(p.b)) }));
// Four choices around the answer, always including it, all positive.
export function choicesFor(pred) {
  const a = pred.answer, set = [a - 2, a - 1, a + 1, a + 2].filter((x) => x > 0);
  const pick = [a, ...set.slice(0, 3)].sort((x, y) => x - y);
  return [...new Set(pick)];
}
export const judgePrediction = (guess, actual) => guess === actual;

// ---------- challenge goals (TODO-TESLA: see docs/fun-challenges.md) ----------
export const FUN = {
  huntTol: 0.5,          // |z - plate focus| (in powers) that counts as "found"
  bronzeHuntFinds: 3,    // Bronze: find 3 objects in Size Hunt
  silverStreak: 3,       // Silver: 3 correct predictions in a row
  goldPowers: POWERS.length // Gold: visit every power from 10^-16 m to 10^27 m (44)
};
export const GOALS = [
  { tier: "bronze", title: `Find ${FUN.bronzeHuntFinds} objects in Size Hunt`, check: (e) => e.type === "hunt" && e.finds >= FUN.bronzeHuntFinds },
  { tier: "silver", title: `Get ${FUN.silverStreak} predictions right in a row`, check: (e) => e.type === "predict" && e.streak >= FUN.silverStreak },
  { tier: "gold", title: `Stamp all ${FUN.goldPowers} powers of ten`, check: (e) => e.type === "stamps" && e.count >= FUN.goldPowers }
];

// ---------- stamps (one per whole power visited) ----------
export const STAMP_KEY = "popboard.fun.powers-of-ten.stamps";
function store() { try { return globalThis.localStorage || null; } catch (e) { return null; } }
export function loadStamps(s = store()) {
  try { const v = JSON.parse(s?.getItem(STAMP_KEY) || "[]"); return Array.isArray(v) ? v.filter((n) => Number.isInteger(n) && n >= Z_MIN && n <= Z_MAX) : []; } catch (e) { return []; }
}
export function addStamps(ns, s = store()) {
  const set = new Set(loadStamps(s)); let fresh = 0;
  for (const n of ns) if (Number.isInteger(n) && n >= Z_MIN && n <= Z_MAX && !set.has(n)) { set.add(n); fresh++; }
  if (fresh) { try { s?.setItem(STAMP_KEY, JSON.stringify([...set].sort((a, b) => a - b))); } catch (e) {} }
  return { fresh, count: set.size };
}

// ---------- share link (sandbox) ----------
export const SHARE_SCHEMA = {
  z: { type: "num", min: Z_MIN, max: Z_MAX },
  a: { type: "enum", values: PLATES.map((p) => p.id) },
  b: { type: "enum", values: PLATES.map((p) => p.id) },
  ruler: { type: "bool" }
};
