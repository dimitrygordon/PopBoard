// Atom Builder living atom: pure decay model (no DOM). Data: ab-decay.json, built from Leo's
// IAEA LiveChart extract (ground states, ENSDF/NUBASE2020) by tools/periodic-table/convert_ab_decay.py.
// Stability itself still comes from ab-model.js isStable (Tesla-cleared table).
import { isStable, MAX_Z, MAX_N, ELEMENTS } from "./ab-model.js";

export const SYMBOLS = ["n", "H", "He", "Li", "Be", "B", "C", "N", "O", "F", "Ne", "Na", "Mg", "Al", "Si", "P", "S", "Cl", "Ar", "K", "Ca", "Sc", "Ti"];
// What each IAEA mode code throws out, for the label and the particle animation.
const BETA = { "2B-": ["two beta-minus decays", 2, "beta"], "B-": ["beta-minus decay", 1, "beta"], "EC+B+": ["electron capture / beta-plus", -1, "positron"], "EC": ["electron capture", -1, "gamma"], "B+": ["beta-plus decay", -1, "positron"] };
export function parseMode(code) {
  const m = /^(2B-|B-|EC\+B\+|EC|B\+)?(\d?)(N|P|A)?$/.exec(code || "");
  if (!m || (!m[1] && !m[3])) return null;
  const [, b, k0, em] = m, k = k0 ? +k0 : 1;
  const parts = [], particles = [];
  if (b) { parts.push(BETA[b][0]); particles.push(BETA[b][2]); }
  if (em === "A") { parts.push("alpha emission"); particles.push("alpha"); }
  if (em === "N") { parts.push(k > 1 ? `${k} neutrons emitted` : "neutron emission"); for (let i = 0; i < k; i++) particles.push("neutron"); }
  if (em === "P") { parts.push(k > 1 ? `${k} protons emitted` : "proton emission"); for (let i = 0; i < k; i++) particles.push("proton"); }
  const short = { A: "\u03b1", N: "n", P: "p" }[em] || "";
  const bs = { "2B-": "2\u03b2\u207b", "B-": "\u03b2\u207b", "EC+B+": "EC/\u03b2\u207a", "EC": "EC", "B+": "\u03b2\u207a" }[b] || "";
  return { code, label: parts.join(" then "), symbol: [bs, (k > 1 ? k : "") + short].filter(Boolean).join(" + "), particles };
}

export function createDecay(data) {
  const key = (p, n) => `${p}-${p + n}`;
  const band = (p) => data.band[p] || null;
  const known = (p, n) => p >= 1 && (isStableAny(p, n) || !!data.iso[key(p, n)]);
  function isStableAny(p, n) { return p >= 1 && p <= MAX_Z ? isStable({ p, n }) : !!band(p) && n >= band(p)[0] && n <= band(p)[1] && !data.iso[key(p, n)]; }
  // Leo's instability score (build/instability.js): 0 stable, half-life t -> 1 - log10(t+1)/18 clamped
  // to [0.05, 1]; unknown or unbound -> 0.5 + 0.1 * neutrons outside the stable band.
  function instability(p, n) {
    if (p < 1) return 0;
    if (isStableAny(p, n)) return 0;
    const iso = data.iso[key(p, n)];
    if (iso && iso[0] != null) return Math.min(1, Math.max(0.05, 1 - Math.log10(iso[0] + 1) / 18));
    let b = band(p); if (!b) { let bd = 1e9; for (const z in data.band) { const dd = Math.abs(z - p); if (dd < bd) { bd = dd; b = data.band[z]; } } }
    const d = !b ? 5 : n < b[0] ? b[0] - n : Math.max(0, n - b[1]);
    return Math.min(1, Math.max(0, 0.5 + 0.1 * d));
  }
  // Main decay route: the biggest branch; ties go to a daughter we have data for.
  function decayOf(p, n) {
    if (p < 1 || isStableAny(p, n)) return null;
    const iso = data.iso[key(p, n)];
    if (!iso) return { p, n, unbound: true, score: instability(p, n) };
    const ok = iso[3].filter((m) => m[2] != null && parseMode(m[0]));
    if (!ok.length) return { p, n, unbound: true, score: instability(p, n), hl: iso[2] };
    const best = ok.slice().sort((a, b) => (b[1] || 0) - (a[1] || 0) || known(b[2], b[3] - b[2]) - known(a[2], a[3] - a[2]))[0];
    const mode = parseMode(best[0]), dp = best[2], dn = best[3] - best[2];
    return { p, n, mode, branch: best[1], hl: iso[2], hlRaw: iso[1], hs: iso[0], score: instability(p, n),
      daughter: { p: dp, n: dn, symbol: SYMBOLS[dp] || "?", A: best[3], inBuilder: dp >= 1 && dp <= MAX_Z && dn >= 0 && dn <= MAX_N },
      others: iso[3].filter((m) => m !== best).map((m) => m[0]) };
  }
  function chain(p, n, max = 12) {
    const out = [{ p, n }];
    for (let i = 0; i < max; i++) { const d = decayOf(p, n); if (!d || !d.daughter) break; ({ p, n } = d.daughter); out.push({ p, n, via: d.mode.symbol }); if (p < 1) break; }
    return out;
  }
  return { instability, decayOf, chain, isStableAny };
}

// Ion shorthand: Ca with charge +2 -> "Ca²⁺", Cl with -1 -> "Cl⁻".
const SUP = { 0: "\u2070", 1: "\u00b9", 2: "\u00b2", 3: "\u00b3", 4: "\u2074", 5: "\u2075", 6: "\u2076", 7: "\u2077", 8: "\u2078", 9: "\u2079" };
export function ionLabel(sym, q) {
  if (!q) return sym;
  const mag = Math.abs(q) === 1 ? "" : String(Math.abs(q)).split("").map((d) => SUP[d]).join("");
  return sym + mag + (q > 0 ? "\u207a" : "\u207b");
}
export function chargeBadge(p, e) {
  const q = p - e;
  return { q, text: `Charge: ${q > 0 ? "+" + q : q < 0 ? "\u2212" + -q : "0"}`, kind: q === 0 ? "neutral" : q > 0 ? "ion-pos" : "ion-neg",
    ion: p >= 1 && p <= MAX_Z ? ionLabel(ELEMENTS[p][0], q) : "" };
}
export const meterLevel = (s) => (s === 0 ? "calm" : s < 0.5 ? "mid" : "shaky");
