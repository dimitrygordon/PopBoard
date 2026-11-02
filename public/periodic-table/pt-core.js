// Periodic Table: pure data helpers (no DOM). Data: pt-elements.json, built from PubChem,
// Periodic-Table-JSON (Wikipedia) and IAEA LiveChart (see docs/periodic-table.md).
export const CATS = [
  ["Alkali metal", "alkali"], ["Alkaline earth metal", "alkaline"], ["Transition metal", "transition"],
  ["Post-transition metal", "post"], ["Metalloid", "metalloid"], ["Nonmetal", "nonmetal"],
  ["Halogen", "halogen"], ["Noble gas", "noble"], ["Lanthanide", "lanthanide"], ["Actinide", "actinide"]
];
export const catKey = (c) => (CATS.find((x) => x[0] === c) || [0, "unknown"])[1];
export const PRESETS = [["Absolute Zero", 0], ["Water Freezes", 273], ["Room Temp", 293], ["Water Boils", 373], ["Iron Melts", 1811], ["Sun Surface", 5778]];
export const T_MAX = 6000;
// [key, label, unit, field, general trend caption]
export const TRENDS = [
  ["radius", "Atomic Radius", "pm", "radius", "General trend: decreases left to right across a period, increases down a group."],
  ["ie1", "Ionization Energy", "kJ/mol", "ie1kj", "General trend: increases left to right across a period, decreases down a group."],
  ["en", "Electronegativity", "", "en", "General trend: increases toward the top right (fluorine is highest); noble gases usually left out."],
  ["ea", "Electron Affinity", "eV", "ea", "General trend: tends to increase toward the top right (halogens have very high electron affinity)."],
  ["density", "Density", "g/cm\u00b3", "density", "General trend: highest in the middle of the transition metals of period 6 (osmium, iridium)."],
  ["mp", "Melting Point", "K", "mp", "General trend: peaks in the middle of each period (carbon, tungsten); lowest for noble gases."],
  ["bp", "Boiling Point", "K", "bp", "General trend: like melting point, high in the middle of the transition metals, low for gases."],
  ["mass", "Atomic Mass", "u", "mass", "General trend: increases with atomic number."],
  ["cov", "Covalent Radius", "pm", "cov", "General trend: decreases across a period, increases down a group."],
  ["vdw", "Van der Waals Radius", "pm", "vdw", "General trend: decreases across a period, increases down a group."],
  ["ip", "Ionization Potential", "eV", "ie", "General trend: same as ionization energy, shown in electronvolts per atom."]
];
export const DECAY = [["stable", "Stable (no radioactive isotopes)"], ["alpha", "\u03b1 Alpha decay"], ["beta-", "\u03b2\u207b Beta decay"], ["ec", "EC / \u03b2\u207a Electron capture"], ["sf", "SF Spontaneous fission"], ["unknown", "Unknown"]];
export const YEAR_MIN = 1400, YEAR_MAX = 2010;

export async function loadElements(url = new URL("./pt-elements.json", import.meta.url)) {
  const r = await fetch(url); if (!r.ok) throw new Error("elements " + r.status);
  return (await r.json()).elements;
}
// Phase at temperature T (kelvin, 1 atm). Unknown when the data has no melting point.
// Sublimers (boiling point listed below melting point, e.g. arsenic) go straight from solid to gas.
export function stateAt(e, T) {
  const { mp, bp } = e;
  if (mp == null && bp == null) return "unknown";
  if (bp != null && mp != null && bp < mp) return T >= bp ? "gas" : "solid";
  if (bp != null && T >= bp) return "gas";
  if (mp == null) return "unknown";
  if (T >= mp) return bp == null ? "unknown" : "liquid";
  return "solid";
}
export const knownBy = (e, y) => e.ancient || (e.year != null && e.year <= y);
export function trendRange(els, field) {
  const v = els.map((e) => e[field]).filter((x) => x != null);
  return [Math.min(...v), Math.max(...v)];
}
export function trendLevel(e, field, [lo, hi]) { const v = e[field]; if (v == null || hi === lo) return null; return Math.min(4, Math.floor(((v - lo) / (hi - lo)) * 5)); }
export const kToC = (k) => k - 273.15, kToF = (k) => (k - 273.15) * 9 / 5 + 32;
// Subshells from the full configuration, e.g. "1s2 2s2 2p6" -> [{n:1,l:"s",e:2},...]
export function subshells(cfg) { return (cfg || "").split(/\s+/).map((t) => t.match(/^(\d)([spdf])(\d+)$/)).filter(Boolean).map((m) => ({ n: +m[1], l: m[2], e: +m[3] })); }
export const ORBITALS = {
  s: [["s", () => 1]],
  p: [["px", (x) => x], ["py", (x, y) => y], ["pz", (x, y, z) => z]],
  d: [["dxy", (x, y) => x * y], ["dyz", (x, y, z) => y * z], ["dxz", (x, y, z) => x * z], ["dx\u00b2\u2212y\u00b2", (x, y) => (x * x - y * y) / 2], ["dz\u00b2", (x, y, z) => (3 * z * z - 1) / (2 * Math.sqrt(3))]],
  f: [["fz\u00b3", (x, y, z) => z * (5 * z * z - 3) / 2], ["fxz\u00b2", (x, y, z) => x * (5 * z * z - 1) / 2.4], ["fyz\u00b2", (x, y, z) => y * (5 * z * z - 1) / 2.4], ["fz(x\u00b2\u2212y\u00b2)", (x, y, z) => z * (x * x - y * y)], ["fxyz", (x, y, z) => 2 * x * y * z], ["fx(x\u00b2\u22123y\u00b2)", (x, y) => x * (x * x - 3 * y * y) / 1.3], ["fy(3x\u00b2\u2212y\u00b2)", (x, y) => y * (3 * x * x - y * y) / 1.3]]
};
// Sample a cloud of points for one real orbital's angular shape; deterministic per seed.
export function orbitalCloud(l, m, count = 1600, seed = 7) {
  let s = seed; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const f = ORBITALS[l][m][1], pts = [];
  let guard = 0;
  while (pts.length < count && guard++ < count * 60) {
    const u = rnd() * 2 - 1, t = rnd() * Math.PI * 2, r = Math.sqrt(1 - u * u);
    const x = r * Math.cos(t), y = r * Math.sin(t), z = u, v = f(x, y, z), a = Math.abs(v);
    if (l !== "s" && rnd() > a * a * 1.2) continue;
    const k = (l === "s" ? 0.9 : a) * Math.cbrt(rnd());
    pts.push([x * k, y * k, z * k, v >= 0 ? 1 : -1]);
  }
  return pts;
}
