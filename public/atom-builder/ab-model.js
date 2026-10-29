// Atom Builder: pure model (no DOM). Elements 1 to 20, stable-isotope table, electron shell
// filling (2, 8, 8, 2) and the challenges. Numbers are TODO-TESLA, see docs/atom-builder-science.md.

export const MODULE_ID = "atom-builder";
export const SCALE_CAPTION = "Not to scale: the real nucleus is far tinier.";
export const CLOUD_CAPTION = "Electrons are spread out in clouds: the darker the cloud, the more likely an electron is there.";
export const MAX_Z = 20, MAX_N = 30, MAX_E = 22;
export const SHELLS = [2, 8, 8, 4];  // electrons per cloud drawn, innermost first (1s, then outer bands)

// Symbol, name, stable neutron counts (TODO-TESLA).
export const ELEMENTS = [
  null,
  ["H", "Hydrogen", [0, 1]], ["He", "Helium", [1, 2]], ["Li", "Lithium", [3, 4]], ["Be", "Beryllium", [5]],
  ["B", "Boron", [5, 6]], ["C", "Carbon", [6, 7]], ["N", "Nitrogen", [7, 8]], ["O", "Oxygen", [8, 9, 10]],
  ["F", "Fluorine", [10]], ["Ne", "Neon", [10, 11, 12]], ["Na", "Sodium", [12]], ["Mg", "Magnesium", [12, 13, 14]],
  ["Al", "Aluminum", [14]], ["Si", "Silicon", [14, 15, 16]], ["P", "Phosphorus", [16]], ["S", "Sulfur", [16, 17, 18, 20]],
  ["Cl", "Chlorine", [18, 20]], ["Ar", "Argon", [18, 20, 22]], ["K", "Potassium", [20, 22]], ["Ca", "Calcium", [20, 22, 23, 24, 26, 28]]
];
// Periodic-table position (row, column of 18) for the collectible table.
export const TABLE_POS = [null, [1, 1], [1, 18], [2, 1], [2, 2], [2, 13], [2, 14], [2, 15], [2, 16], [2, 17], [2, 18],
  [3, 1], [3, 2], [3, 13], [3, 14], [3, 15], [3, 16], [3, 17], [3, 18], [4, 1], [4, 2]];

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export function sanitizeAtom(a = {}) {
  const i = (v, max) => clamp(Math.round(Number(v) || 0), 0, max);
  return { p: i(a.p, MAX_Z), n: i(a.n, MAX_N), e: i(a.e, MAX_E) };
}
export const element = (z) => (z >= 1 && z <= MAX_Z ? { z, symbol: ELEMENTS[z][0], name: ELEMENTS[z][1] } : null);
export const massNumber = ({ p, n }) => p + n;
export const charge = ({ p, e }) => p - e;
export function chargeText(q) { return q === 0 ? "0 (neutral)" : q > 0 ? `+${q}` : `\u2212${-q}`; }
export function isStable({ p, n }) { if (p < 1 || p > MAX_Z) return false; return ELEMENTS[p][2].includes(n); }
// Fill electron clouds innermost first.
export function shellCounts(e) { const out = []; let left = e; for (const cap of SHELLS) { const k = Math.min(cap, left); out.push(k); left -= k; } return out; }
export function describe(a) {
  const el = element(a.p), A = massNumber(a), q = charge(a);
  const stable = isStable(a);
  const kind = !el ? (a.n ? "Just neutrons: no element yet" : "Empty") : q === 0 ? "Neutral atom" : q > 0 ? "Positive ion" : "Negative ion";
  const nuclide = el ? `${el.name}-${A}` : "";
  return { el, A, q, stable, kind, nuclide, chargeText: chargeText(q),
    stability: !el ? "" : stable ? "Stable nucleus" : "Unstable nucleus: it would change by radioactive decay" };
}

// ---------- challenges (TODO-TESLA) ----------
export const FUN = { isotopesNeeded: 2 };
export const isCarbon12 = (a) => a.p === 6 && a.n === 6 && a.e === 6;
export const isIon = (a) => a.p >= 1 && a.e !== a.p && isStable(a);
export const GOALS = [
  { tier: "bronze", title: "Make a neutral carbon-12 atom", check: (e) => e.type === "atom" && isCarbon12(e.atom) },
  { tier: "silver", title: "Make an ion: a stable atom with extra or missing electrons", check: (e) => e.type === "atom" && isIon(e.atom) },
  { tier: "gold", title: `Make ${FUN.isotopesNeeded} stable isotopes of the same element`, check: (e) => e.type === "atom" && e.isotopesOfThis >= FUN.isotopesNeeded }
];

// Predict, then run: guess whether the nucleus will be stable after the next particle lands.
export const judgePrediction = (guess, stable) => guess === stable;

// Collectible table: map z -> list of stable mass numbers built.
export function collect(table, a) {
  if (!isStable(a) || a.e !== a.p) return { table, fresh: false }; // neutral atoms with a stable nucleus only
  const t = { ...table }, list = t[a.p] ? [...t[a.p]] : [], A = massNumber(a);
  if (list.includes(A)) return { table: t, fresh: false };
  list.push(A); list.sort((x, y) => x - y); t[a.p] = list;
  return { table: t, fresh: true };
}
export function sanitizeTable(raw) {
  const t = {};
  if (!raw || typeof raw !== "object") return t;
  for (const [k, v] of Object.entries(raw)) {
    const z = Number(k); if (!Number.isInteger(z) || z < 1 || z > MAX_Z || !Array.isArray(v)) continue;
    const ok = [...new Set(v.filter((A) => Number.isInteger(A) && ELEMENTS[z][2].includes(A - z)))].sort((x, y) => x - y);
    if (ok.length) t[z] = ok;
  }
  return t;
}

// Guided targets for Build mode.
export const TARGETS = [
  { id: "h1", label: "Hydrogen-1, neutral", hint: "One proton and one electron. No neutrons needed.", check: (a) => a.p === 1 && a.n === 0 && a.e === 1 },
  { id: "he4", label: "Helium-4, neutral", hint: "Two protons and two neutrons in the nucleus, two electrons in the 1s cloud.", check: (a) => a.p === 2 && a.n === 2 && a.e === 2 },
  { id: "c12", label: "Carbon-12, neutral", hint: "Six protons, six neutrons, six electrons.", check: isCarbon12 },
  { id: "c13", label: "Carbon-13: an isotope", hint: "Same element, one more neutron than carbon-12.", check: (a) => a.p === 6 && a.n === 7 },
  { id: "na1", label: "A sodium ion, Na\u207a", hint: "Sodium has 11 protons. Take away one electron.", check: (a) => a.p === 11 && isStable(a) && a.e === 10 },
  { id: "cl1", label: "A chloride ion, Cl\u207b", hint: "Chlorine has 17 protons. Add one extra electron.", check: (a) => a.p === 17 && isStable(a) && a.e === 18 }
];

export const SHARE_SCHEMA = {
  p: { type: "num", min: 0, max: MAX_Z }, n: { type: "num", min: 0, max: MAX_N }, e: { type: "num", min: 0, max: MAX_E }
};
