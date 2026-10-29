// Quantum Physics: constants, equations and the numbers each mode shows.
// Pure functions only (no DOM), so node --test can check them.
// Sources for every number: docs/quantum-science.md.

// ---------- constants (SI 2019 exact values and CODATA 2022) ----------
export const H = 6.62607015e-34;          // Planck constant, J s (exact)
export const C = 299792458;               // speed of light, m/s (exact)
export const QE = 1.602176634e-19;        // elementary charge, C (exact); 1 eV in J
export const ME = 9.1093837139e-31;       // electron mass, kg (CODATA 2022)
export const MP = 1.67262192595e-27;      // proton mass, kg (CODATA 2022)
export const ME_C2_EV = 510998.95069;     // electron rest energy, eV (CODATA 2022)
export const H_EV = H / QE;               // 4.135667696e-15 eV s
export const HC_EV_NM = (H * C / QE) * 1e9; // 1239.84198 eV nm
export const RY_EV = 13.6;                // hydrogen ground-state binding energy used in E_n (OpenStax rounding)
export const ATOM_M = 1e-10;              // a typical atom is about 0.1 nm across

// ---------- photons ----------
export const freqOf = (lamNm) => C / (lamNm * 1e-9);
export const photonEV = (lamNm) => HC_EV_NM / lamNm;
export const photonJ = (lamNm) => (H * C) / (lamNm * 1e-9);
export const lamOfEV = (eV) => HC_EV_NM / eV;
// Region of the spectrum and visible color name (approximate boundaries).
export function bandOf(lamNm) {
  if (lamNm < 400) return "ultraviolet";
  if (lamNm > 700) return "infrared";
  return "visible";
}
export function colorName(lamNm) {
  if (lamNm < 400 || lamNm > 700) return null;
  if (lamNm < 450) return "violet";
  if (lamNm < 495) return "blue";
  if (lamNm < 570) return "green";
  if (lamNm < 590) return "yellow";
  if (lamNm < 620) return "orange";
  return "red";
}
// Approximate sRGB for a wavelength, for drawing only (not a shown number).
export function lamRGB(lamNm) {
  const l = lamNm;
  let r = 0, g = 0, b = 0;
  if (l < 380) return [150, 110, 220];
  if (l > 750) return [150, 30, 30];
  if (l < 440) { r = (440 - l) / 60; b = 1; }
  else if (l < 490) { g = (l - 440) / 50; b = 1; }
  else if (l < 510) { g = 1; b = (510 - l) / 20; }
  else if (l < 580) { r = (l - 510) / 70; g = 1; }
  else if (l < 645) { r = 1; g = (645 - l) / 65; }
  else r = 1;
  const f = l < 420 ? 0.4 + 0.6 * (l - 380) / 40 : l > 700 ? 0.4 + 0.6 * (750 - l) / 50 : 1;
  return [r, g, b].map((v) => Math.round(255 * Math.pow(v * f, 0.8)));
}

// ---------- photoelectric effect ----------
// Work functions, OpenStax University Physics Vol. 3, Table 6.1 (Ca from Example 6.6).
export const METALS = Object.freeze({
  Na: Object.freeze({ name: "Sodium", phi: 2.46 }),
  Ca: Object.freeze({ name: "Calcium", phi: 2.71 }),
  Al: Object.freeze({ name: "Aluminum", phi: 4.08 }),
  Zn: Object.freeze({ name: "Zinc", phi: 4.31 }),
  Cu: Object.freeze({ name: "Copper", phi: 4.70 }),
  Ag: Object.freeze({ name: "Silver", phi: 4.73 }),
  Pt: Object.freeze({ name: "Platinum", phi: 6.35 })
});
export const METAL_IDS = Object.freeze(Object.keys(METALS));
export const cutoffFreq = (phi) => phi / H_EV;
export const cutoffLam = (phi) => HC_EV_NM / phi;
export const keMax = (lamNm, phi) => photonEV(lamNm) - phi; // may be negative: no emission
// Below this KE the page prints words, so a shown number never nears zero.
export const KE_FLOOR = 0.1;
export const emits = (lamNm, phi) => keMax(lamNm, phi) > 0;

// ---------- hydrogen (Bohr model energies) ----------
export const N_MAX = 6;
export const levelEV = (n) => -RY_EV / (n * n);
export const transitionEV = (nUp, nLow) => levelEV(nUp) - levelEV(nLow);
export const transitionNm = (nUp, nLow) => HC_EV_NM / transitionEV(nUp, nLow);
export const SERIES = Object.freeze({ 1: "Lyman", 2: "Balmer", 3: "Paschen", 4: "Brackett", 5: "Pfund" });
export const BALMER = Object.freeze([3, 4, 5, 6].map((n) => Object.freeze({ n, nm: transitionNm(n, 2) })));
// Measured wavelengths in air, NIST ASD (H I), for comparison in the docs and tests.
export const BALMER_NIST_AIR = Object.freeze({ 3: 656.279, 4: 486.135, 5: 434.0472, 6: 410.1734 });
// Ground-state absorption lines (n = 1 up), used by the sandbox.
export function absorbedLine(lamNm, tolFrac = 0.005) {
  for (let n = 2; n <= N_MAX; n++) {
    const l = transitionNm(n, 1);
    if (Math.abs(lamNm - l) / l <= tolFrac) return n;
  }
  return null;
}
export const ionizes = (lamNm) => photonEV(lamNm) >= RY_EV;

// ---------- de Broglie ----------
export const PARTICLES = Object.freeze({
  electron: Object.freeze({ name: "Electron", m: ME, slider: "vE" }),
  proton: Object.freeze({ name: "Proton", m: MP, slider: "vP" }),
  baseball: Object.freeze({ name: "Baseball", m: 0.145, slider: "vB" })
});
export const PARTICLE_IDS = Object.freeze(Object.keys(PARTICLES));
export const deBroglie = (m, v) => H / (m * v); // m
// Electron accelerated through K (eV), with the relativistic momentum.
export function electronLamFromKeV(keV) {
  const K = keV * 1000;
  const pc = Math.sqrt(K * K + 2 * K * ME_C2_EV); // eV
  return HC_EV_NM / pc * 1e-9; // m
}

// ---------- double slit ----------
// Model setups (fixed in the double-slit mode; d is a slider in the sandbox).
export const SLIT_LIGHT = Object.freeze({ d: 0.25e-3, L: 1.0, halfScreen: 10e-3 });   // m
export const SLIT_ELECTRON = Object.freeze({ d: 1.0e-6, L: 1.0, halfScreen: 25e-6 }); // m
export const SLIT_WIDTH_FRAC = 0.25; // slit width a = d / 4
export const fringeSpacing = (lamM, d, L) => (lamM * L) / d;
// Relative probability at screen position y (m). Which-slit detector on: no fringes.
export function intensity(y, lamM, d, L, watched = false) {
  const a = d * SLIT_WIDTH_FRAC, s = y / Math.sqrt(y * y + L * L);
  const beta = (Math.PI * a * s) / lamM;
  const env = beta === 0 ? 1 : (Math.sin(beta) / beta) ** 2;
  if (watched) return env;
  const al = (Math.PI * d * s) / lamM;
  return env * Math.cos(al) ** 2;
}
// One hit position by rejection sampling; rng returns [0, 1).
export function sampleHit(lamM, d, L, half, watched, rng) {
  for (let k = 0; k < 10000; k++) {
    const y = (2 * rng() - 1) * half;
    if (rng() < intensity(y, lamM, d, L, watched)) return y;
  }
  return 0;
}
// Small seeded generator so tests are repeatable.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- sliders ----------
export const SLIDERS = Object.freeze({
  lam: Object.freeze({ min: 100, max: 1000, steps: 300, log: true, unit: "nm" }),
  lamPE: Object.freeze({ min: 150, max: 700, steps: 275, log: true, unit: "nm" }),
  inten: Object.freeze({ min: 10, max: 100, steps: 90, log: false, unit: "%" }),
  vE: Object.freeze({ min: 1e5, max: 1e7, steps: 200, log: true, unit: "m/s" }),
  vP: Object.freeze({ min: 1e2, max: 1e6, steps: 200, log: true, unit: "m/s" }),
  vB: Object.freeze({ min: 1, max: 45, steps: 160, log: true, unit: "m/s" }),
  lamDS: Object.freeze({ min: 400, max: 700, steps: 150, log: false, unit: "nm" }),
  keV: Object.freeze({ min: 10, max: 100, steps: 180, log: true, unit: "keV" }),
  lamSB: Object.freeze({ min: 90, max: 1000, steps: 480, log: true, unit: "nm" }),
  dL: Object.freeze({ min: 0.05, max: 1, steps: 150, log: true, unit: "mm" }),
  dE: Object.freeze({ min: 0.2, max: 5, steps: 150, log: true, unit: "um" })
});
export function fromSlider(name, step) {
  const s = SLIDERS[name], u = Math.min(s.steps, Math.max(0, Math.round(step))) / s.steps;
  return s.log ? s.min * (s.max / s.min) ** u : s.min + (s.max - s.min) * u;
}
export function toSlider(name, value) {
  const s = SLIDERS[name];
  const u = s.log ? Math.log(value / s.min) / Math.log(s.max / s.min) : (value - s.min) / (s.max - s.min);
  return Math.min(s.steps, Math.max(0, Math.round(u * s.steps)));
}
// Which sliders each mode shows, given its state.
export function modeSliders(mode, s) {
  switch (mode) {
    case "photon": return ["lam"];
    case "photoelectric": return ["lamPE", "inten"];
    case "hydrogen": return [];
    case "debroglie": return [PARTICLES[s.particle].slider];
    case "doubleslit": return [s.source === "electron" ? "keV" : "lamDS"];
    case "sandbox":
      if (s.source === "electron") return ["keV", "dE"];
      return s.target === "slits" ? ["lamSB", "inten", "dL"] : ["lamSB", "inten"];
    default: return [];
  }
}
// State key a slider writes to.
export const SLIDER_KEY = Object.freeze({ lam: "lam", lamPE: "lam", inten: "inten", vE: "v", vP: "v", vB: "v", lamDS: "lam", keV: "keV", lamSB: "lam", dL: "dL", dE: "dE" });

// ---------- what each mode shows ----------
// Numbers the page prints for a state; null means the page prints words.
function peShown(lam, phi, inten) {
  const E = photonEV(lam), ke = E - phi, on = ke >= KE_FLOOR;
  return { lam, E, f: freqOf(lam), ke: on ? ke : null, vStop: on ? ke : null, rate: ke > 0 ? inten : null, inten };
}
export function slitSetup(s) {
  if (s.source === "electron") {
    const d = s.dE != null ? s.dE * 1e-6 : SLIT_ELECTRON.d;
    return { lamM: electronLamFromKeV(s.keV), d, L: SLIT_ELECTRON.L, half: SLIT_ELECTRON.halfScreen };
  }
  const d = s.dL != null ? s.dL * 1e-3 : SLIT_LIGHT.d;
  return { lamM: s.lam * 1e-9, d, L: SLIT_LIGHT.L, half: SLIT_LIGHT.halfScreen };
}
export function shown(mode, s) {
  switch (mode) {
    case "photon": return { lam: s.lam, f: freqOf(s.lam), eV: photonEV(s.lam), J: photonJ(s.lam) };
    case "photoelectric": return peShown(s.lam, METALS[s.metal].phi, s.inten);
    case "hydrogen": return { eUp: levelEV(s.nUp), eLow: levelEV(s.nLow), dE: transitionEV(s.nUp, s.nLow), lam: transitionNm(s.nUp, s.nLow) };
    case "debroglie": {
      const m = PARTICLES[s.particle].m;
      return { v: s.v, p: m * s.v, lam: deBroglie(m, s.v), ke: 0.5 * m * s.v * s.v };
    }
    case "doubleslit": {
      const k = slitSetup(s);
      return { lam: k.lamM, dy: fringeSpacing(k.lamM, k.d, k.L) };
    }
    case "sandbox": {
      if (s.source === "electron") { const k = slitSetup(s); return { lam: k.lamM, d: k.d, dy: fringeSpacing(k.lamM, k.d, k.L) }; }
      if (s.target === "metal") return peShown(s.lam, METALS[s.metal].phi, s.inten);
      if (s.target === "slits") { const k = slitSetup(s); return { lam: s.lam, E: photonEV(s.lam), d: k.d, dy: fringeSpacing(k.lamM, k.d, k.L), inten: s.inten }; }
      return { lam: s.lam, E: photonEV(s.lam), inten: s.inten };
    }
    default: return {};
  }
}

// ---------- deep links ----------
export const MODES = Object.freeze(["photon", "photoelectric", "hydrogen", "debroglie", "doubleslit", "sandbox"]);
export const MODE_ALIASES = Object.freeze({
  photon: "photon", photons: "photon", "photon-energy": "photon", energy: "photon", planck: "photon",
  photoelectric: "photoelectric", "photoelectric-effect": "photoelectric", "work-function": "photoelectric", pe: "photoelectric",
  hydrogen: "hydrogen", bohr: "hydrogen", atom: "hydrogen", spectrum: "hydrogen", balmer: "hydrogen", "energy-levels": "hydrogen",
  debroglie: "debroglie", "de-broglie": "debroglie", duality: "debroglie", "wave-particle": "debroglie", matter: "debroglie",
  doubleslit: "doubleslit", "double-slit": "doubleslit", slits: "doubleslit", interference: "doubleslit",
  sandbox: "sandbox", free: "sandbox", play: "sandbox"
});
export function parseQuery(search) {
  const p = new URLSearchParams(typeof search === "string" ? search : "");
  const raw = (p.get("mode") || "").trim().toLowerCase();
  return { mode: MODE_ALIASES[raw] || "photon" };
}

// ---------- formatting ----------
const SUP = { "-": "\u207b", 0: "\u2070", 1: "\u00b9", 2: "\u00b2", 3: "\u00b3", 4: "\u2074", 5: "\u2075", 6: "\u2076", 7: "\u2077", 8: "\u2078", 9: "\u2079" };
export function sig(x, d = 3) {
  if (!isFinite(x)) return "\u2013";
  if (x === 0) return "0";
  return String(Number(x.toPrecision(d))).replace("-", "\u2212");
}
// 3 significant figures in scientific notation, e.g. 4.74 x 10^14 with superscripts.
export function sci(x, d = 3) {
  if (!isFinite(x)) return "\u2013";
  if (x === 0) return "0";
  let e = Math.floor(Math.log10(Math.abs(x)));
  let m = Number((x / 10 ** e).toPrecision(d));
  if (Math.abs(m) >= 10) { m /= 10; e += 1; }
  if (e >= -2 && e <= 3) return sig(x, d);
  const ms = m.toFixed(d - 1).replace("-", "\u2212");
  return `${ms} \u00d7 10${String(e).split("").map((ch) => SUP[ch]).join("")}`;
}
// A length in m with a friendly unit.
export function len(m, d = 3) {
  const a = Math.abs(m);
  if (a >= 1e-3) return sig(m * 1e3, d) + " mm";
  if (a >= 1e-6) return sig(m * 1e6, d) + " \u00b5m";
  if (a >= 1e-10) return sig(m * 1e9, d) + " nm";
  if (a >= 1e-12) return sig(m * 1e12, d) + " pm";
  return sci(m, d) + " m";
}
