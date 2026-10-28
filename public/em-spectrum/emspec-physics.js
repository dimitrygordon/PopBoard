// Electromagnetic Spectrum Explorer: physics and data tables.
// Pure: no DOM, no Firebase. Runs in node for tests and in the page.
// SI units inside. Every formula and value here is listed in
// docs/em-spectrum-science.md.
//   node --test tests/emspec-physics.test.mjs

// ---------- constants (SI 2019 exact values) ----------
export const C = 299792458;              // m/s, exact
export const H = 6.62607015e-34;         // J s, exact
export const EV = 1.602176634e-19;       // J per eV, exact
export const KB = 1.380649e-23;          // J/K, exact
export const HC_EV_NM = (H * C / EV) * 1e9; // ~1239.84 eV nm

// ---------- c = lambda f, E = h f ----------
export function frequencyFromWavelength(lambda) { return C / lambda; }
export function wavelengthFromFrequency(f) { return C / f; }
export function photonEnergyJ(f) { return H * f; }
export function photonEnergyEV(f) { return H * f / EV; }
export function energyFromWavelengthEV(lambda) { return photonEnergyEV(C / lambda); }
export function wavelengthFromEnergyEV(eV) { return C / (eV * EV / H); }
export function thermalEnergyEV(T) { return KB * T / EV; }

// ---------- the log slider ----------
// One slider position t in [0, 1] maps to log10(lambda) from 1e-14 m to 1e4 m.
export const LOG_L_MIN = -14;
export const LOG_L_MAX = 4;
export function sliderToWavelength(t) {
  const u = Math.min(1, Math.max(0, t));
  return 10 ** (LOG_L_MIN + u * (LOG_L_MAX - LOG_L_MIN));
}
export function wavelengthToSlider(lambda) {
  const u = (Math.log10(lambda) - LOG_L_MIN) / (LOG_L_MAX - LOG_L_MIN);
  return Math.min(1, Math.max(0, u));
}
// Frequency slider runs the other way: the right end is the highest frequency.
export function sliderToFrequency(t) { return C / sliderToWavelength(1 - t); }
export function frequencyToSlider(f) { return 1 - wavelengthToSlider(C / f); }

// ---------- bands (conventional boundaries, in vacuum) ----------
// Microwaves are folded into radio. The X-ray / gamma split is set at
// 0.01 nm (about 124 keV) here; in practice the two overlap and are often
// named by their source (electrons vs nuclei), not by energy.
export const BAND_BOUNDARY_NOTE = "Boundaries between bands are conventions, not sharp edges. X-rays and gamma rays overlap in energy and are often split by source (electrons vs atomic nuclei) rather than by wavelength.";

// Fermi-LAT angular resolution, 68% containment, P8R3_SOURCE_V3 total,
// acceptance weighted (SLAC lat_Performance page, PSF68 table).
export const GAMMA_PSF68 = Object.freeze({ at100MeV: "about 5 deg", at1GeV: "about 0.8 deg", above10GeV: "about 0.1 to 0.15 deg" });

export const BANDS = Object.freeze([
  { id: "radio", name: "Radio", min: 1e-3, max: Infinity, center: 0.21, color: "#ff785a" },
  { id: "infrared", name: "Infrared", min: 700e-9, max: 1e-3, center: 10e-6, color: "#ff5a3c" },
  { id: "visible", name: "Visible", min: 380e-9, max: 700e-9, center: 550e-9, color: "#fff0c8" },
  { id: "ultraviolet", name: "Ultraviolet", min: 10e-9, max: 380e-9, center: 150e-9, color: "#aa8cff" },
  { id: "xray", name: "X-ray", min: 1e-11, max: 10e-9, center: 1e-10, color: "#78c8ff" },
  { id: "gamma", name: "Gamma", min: 0, max: 1e-11, center: 1e-12, color: "#c878ff" }
].map(Object.freeze));
export const BAND_IDS = BANDS.map((b) => b.id);
export function bandById(id) { return BANDS.find((b) => b.id === id) || null; }
export function bandOf(lambda) {
  for (const b of BANDS) if (lambda >= b.min && lambda < b.max) return b;
  return lambda >= 1e-3 ? BANDS[0] : BANDS[BANDS.length - 1];
}

// Visible wavelength to an approximate sRGB hue for drawing (display only).
export function visibleColor(lambdaNm) {
  const l = lambdaNm;
  let r = 0, g = 0, b = 0;
  if (l >= 380 && l < 440) { r = (440 - l) / 60; b = 1; }
  else if (l < 490) { g = (l - 440) / 50; b = 1; }
  else if (l < 510) { g = 1; b = (510 - l) / 20; }
  else if (l < 580) { r = (l - 510) / 70; g = 1; }
  else if (l < 645) { r = 1; g = (645 - l) / 65; }
  else if (l <= 700) { r = 1; }
  const to = (v) => Math.round(255 * v);
  return `rgb(${to(r)},${to(g)},${to(b)})`;
}

// ---------- size scale (one wave is about as long as...) ----------
// Typical sizes, order of magnitude. Icons are Leo's scale-* sprites.
export const SCALE = Object.freeze([
  { id: "building", label: "building", size: 100 },
  { id: "human", label: "person", size: 1.7 },
  { id: "bee", label: "bee", size: 0.012 },
  { id: "pinhead", label: "pinhead", size: 1.5e-3 },
  { id: "cell", label: "cell", size: 1e-5 },
  { id: "molecule", label: "molecule", size: 3e-10 },
  { id: "atom", label: "atom", size: 1e-10 },
  { id: "nucleus", label: "nucleus", size: 1e-14 }
].map(Object.freeze));
export function nearestScale(lambda) {
  let best = SCALE[0], d = Infinity;
  for (const s of SCALE) {
    const k = Math.abs(Math.log10(lambda / s.size));
    if (k < d) { d = k; best = s; }
  }
  return best;
}

// ---------- energy reference marks (eV) ----------
export const ENERGY_MARKS = Object.freeze([
  { id: "thermal", label: "kT at 300 K", eV: thermalEnergyEV(300) },
  { id: "red", label: "red light, 700 nm", eV: HC_EV_NM / 700 },
  { id: "violet", label: "violet light, 380 nm", eV: HC_EV_NM / 380 },
  { id: "hydrogen", label: "ionize hydrogen", eV: 13.6 },
  { id: "electron", label: "electron rest energy", eV: 510998.95 }
].map(Object.freeze));
// Photons above about 10 eV can ionize atoms and molecules.
export const IONIZING_EV = 10;
export function isIonizing(eV) { return eV >= IONIZING_EV; }

// ---------- atmospheric transmission (schematic) ----------
// Fraction of light from straight overhead that reaches sea level through
// clear, dry air, as control points [wavelength in m, fraction]. Linear
// interpolation in log10(wavelength) between points. Approximate, for teaching.
export const TRANSMISSION = Object.freeze([
  [1e-14, 0], [295e-9, 0],             // gamma, X-ray, UV-C, most UV-B: absorbed
  [310e-9, 0.2], [340e-9, 0.5],        // UV-B tail and UV-A
  [400e-9, 0.75], [550e-9, 0.85],      // visible
  [1.1e-6, 0.85], [1.3e-6, 0.8], [1.4e-6, 0.1], [1.5e-6, 0.8],   // water band near 1.4 um
  [1.8e-6, 0.75], [1.9e-6, 0.1], [2.0e-6, 0.75], [2.4e-6, 0.75], // water band near 1.9 um
  [2.7e-6, 0.05], [3.0e-6, 0.1], [3.4e-6, 0.7], [4.1e-6, 0.7],   // L window
  [4.3e-6, 0.05], [4.6e-6, 0.5], [5.0e-6, 0.5],                  // CO2 at 4.3 um, M window
  [5.5e-6, 0], [7.5e-6, 0],                                      // water band 5.5 to 7.5 um
  [8e-6, 0.6], [13e-6, 0.6],                                     // N window
  [15e-6, 0], [300e-6, 0],                                       // CO2 at 15 um, then water: opaque
  [350e-6, 0.15], [400e-6, 0],                                   // weak submillimeter window (dry sites)
  [800e-6, 0.2], [1e-3, 0.3], [3e-3, 0.7], [1e-2, 0.95],         // millimeter
  [15, 0.95], [30, 0], [1e4, 0]                                  // ionosphere reflects long waves
].map(Object.freeze));
export function transmission(lambda) {
  const T = TRANSMISSION;
  if (lambda <= T[0][0]) return T[0][1];
  if (lambda >= T[T.length - 1][0]) return T[T.length - 1][1];
  const x = Math.log10(lambda);
  for (let i = 1; i < T.length; i++) {
    if (lambda <= T[i][0]) {
      const x0 = Math.log10(T[i - 1][0]), y0 = T[i - 1][1], x1 = Math.log10(T[i][0]), y1 = T[i][1];
      return y0 + (y1 - y0) * (x - x0) / (x1 - x0);
    }
  }
  return 0;
}
export function opacity(lambda) { return 1 - transmission(lambda); }

// Where each band is stopped (rough representative altitude, km; 0 = reaches
// the ground) and by what. The atmosphere art maps altitude to its layers.
export const ATMOSPHERE = Object.freeze({
  radio: { stopKm: 0, reaches: true, by: "Reaches the ground. Waves longer than about 10 to 30 m bounce off the ionosphere." },
  infrared: { stopKm: 5, reaches: "partly", by: "Mostly absorbed by water vapor and carbon dioxide low in the troposphere. A few windows reach high, dry mountaintops." },
  visible: { stopKm: 0, reaches: true, by: "Reaches the ground. Air scatters blue light more than red." },
  ultraviolet: { stopKm: 30, reaches: "partly", by: "Ozone in the stratosphere absorbs most UV shorter than about 300 nm. Some UV-A reaches the ground." },
  xray: { stopKm: 80, reaches: false, by: "Absorbed high in the atmosphere by nitrogen and oxygen atoms." },
  gamma: { stopKm: 25, reaches: false, by: "Absorbed in the upper atmosphere, where each photon starts a shower of particles. Gamma rays are more penetrating, so they reach lower before the air stops them." }
});
// Layer tops (km) for the art: troposphere, stratosphere, mesosphere, top of panel.
export const LAYERS_KM = Object.freeze({ troposphere: 12, stratosphere: 50, mesosphere: 85, top: 150 });
// Altitude (km) to y fraction on atmosphere-cross-section (measured on the
// art: ground line ~0.91, layer lines at 0.72, 0.50, 0.30).
export const ART_Y = Object.freeze({ ground: 0.91, troposphere: 0.72, stratosphere: 0.50, mesosphere: 0.30, top: 0.02 });
export function altitudeToArtY(km) {
  const pts = [[0, ART_Y.ground], [LAYERS_KM.troposphere, ART_Y.troposphere], [LAYERS_KM.stratosphere, ART_Y.stratosphere],
    [LAYERS_KM.mesosphere, ART_Y.mesosphere], [LAYERS_KM.top, ART_Y.top]];
  const k = Math.min(LAYERS_KM.top, Math.max(0, km));
  for (let i = 1; i < pts.length; i++) {
    if (k <= pts[i][0]) { const [a, ya] = pts[i - 1], [b, yb] = pts[i]; return ya + (yb - ya) * (k - a) / (b - a); }
  }
  return ART_Y.top;
}

// ---------- telescopes ----------
// Diffraction limit: theta = 1.22 lambda / D (radians), shown in arcseconds.
export const ARCSEC_PER_RAD = 180 / Math.PI * 3600;
export function diffractionLimitArcsec(lambda, D) { return 1.22 * lambda / D * ARCSEC_PER_RAD; }
export const TELESCOPES = Object.freeze([
  { id: "radio", band: "radio", art: "telescope-radio-dish", name: "Radio dish", where: "ground",
    D: 100, lambda: 0.21, optics: "dish", how: "A curved metal dish reflects radio waves to a receiver at the focus. The surface only needs to be smooth to a small fraction of the wavelength, so mesh or panels work." },
  { id: "infrared", band: "infrared", art: "telescope-infrared-space", name: "Infrared space telescope", where: "space",
    D: 6.5, lambda: 2e-6, optics: "mirror", how: "Gold-coated mirrors reflect infrared well. A sunshield keeps the telescope very cold so its own heat does not swamp the faint infrared it collects." },
  { id: "visible", band: "visible", art: "telescope-optical-reflector", alt: "telescope-optical-refractor", name: "Optical telescope", where: "ground",
    D: 2.4, lambda: 550e-9, optics: "mirror", how: "A lens (refractor) or a curved mirror (reflector) brings light to a focus. Big research telescopes use mirrors." },
  { id: "ultraviolet", band: "ultraviolet", art: "telescope-ultraviolet", name: "Ultraviolet space telescope", where: "space",
    D: 2.4, lambda: 150e-9, optics: "mirror", how: "Ozone blocks most UV, so UV telescopes fly above the atmosphere. Mirrors still work, with special coatings." },
  { id: "xray", band: "xray", art: "telescope-xray-grazing", name: "X-ray telescope (grazing incidence)", where: "space",
    D: 1.2, lambda: 1e-10, optics: "grazing", grazeDeg: 1, how: "X-rays pass into a normal mirror instead of bouncing. They only reflect when they skim the surface at under about 1 degree, so nested barrel-shaped mirrors guide them to a focus." },
  { id: "gamma", band: "gamma", art: "telescope-gamma-ray", name: "Gamma-ray space telescope", where: "space",
    D: null, lambda: 1e-12, optics: "pair", how: "Gamma rays are too energetic to focus. Each photon turns into an electron and a positron in the detector, and their tracks point back to the source." }
].map(Object.freeze));
export function telescopeFor(bandId) { return TELESCOPES.find((t) => t.band === bandId) || null; }

// ---------- band views of astronomical objects ----------
export const OBJECTS = Object.freeze([
  { id: "crab", art: "crab-nebula", name: "Crab Nebula", views: {
    radio: "Fast electrons spiral in magnetic fields (synchrotron light) across the whole nebula.",
    infrared: "Warm dust and gas trace the filaments.",
    visible: "Glowing filaments of hot gas thrown out by the supernova seen in 1054.",
    ultraviolet: "A smaller inner nebula of the most energetic electrons.",
    xray: "A spinning neutron star (pulsar) powers a ring and jets of very hot, fast particles.",
    gamma: "A compact point at the pulsar: the highest-energy particles." } },
  { id: "galaxy", art: "spiral-galaxy", name: "Spiral galaxy", views: {
    radio: "Cold hydrogen gas (21 cm line) spreads far beyond the stars.",
    infrared: "Dust warmed by starlight glows, and the old stars of the bulge shine.",
    visible: "Starlight in spiral arms, with dark lanes where dust blocks it.",
    ultraviolet: "Hot, young, massive stars light up knots along the arms.",
    xray: "Scattered points: gas falling onto neutron stars and black holes, plus the nucleus.",
    gamma: "Only a faint core: cosmic rays striking gas, or the central black hole." } },
  { id: "sun", art: "sun", name: "Sun", views: {
    radio: "Radio comes from the hot corona above the surface, so the disk looks bigger and blotchy.",
    infrared: "A smooth, low-contrast disk.",
    visible: "The photosphere, darker toward the edge (limb darkening), with sunspots.",
    ultraviolet: "Hot gas above active regions (plage) and loops at the edge.",
    xray: "In X-rays the Sun's visible surface is dark; we see the million-degree corona as bright loops over active regions, with dark coronal holes.",
    gamma: "Usually dark. Gamma rays appear during strong solar flares." } }
].map(Object.freeze));
export function objectById(id) { return OBJECTS.find((o) => o.id === id) || null; }

// ---------- deep links ----------
export const MODES = Object.freeze(["wave", "energy", "atmosphere", "telescopes", "sky"]);
export const MODE_ALIASES = Object.freeze({
  wave: "wave", wavelength: "wave", frequency: "wave", slider: "wave",
  energy: "energy", photon: "energy", photons: "energy",
  atmosphere: "atmosphere", absorption: "atmosphere", opacity: "atmosphere",
  telescopes: "telescopes", telescope: "telescopes", detect: "telescopes",
  sky: "sky", views: "sky", objects: "sky", bands: "sky"
});
const BAND_ALIASES = Object.freeze({ ir: "infrared", uv: "ultraviolet", "x-ray": "xray", optical: "visible", microwave: "radio" });
export function parseQuery(search) {
  const p = new URLSearchParams(typeof search === "string" ? search : "");
  const mode = MODE_ALIASES[(p.get("mode") || "").trim().toLowerCase()] || "wave";
  let band = (p.get("band") || "").trim().toLowerCase();
  band = BAND_ALIASES[band] || band;
  if (!BAND_IDS.includes(band)) band = null;
  let object = (p.get("object") || "").trim().toLowerCase();
  if (!objectById(object)) object = null;
  return { mode, band, object };
}

// ---------- number formatting (pure, shared by UI and tests) ----------
const SUP = { "-": "\u207b", 0: "\u2070", 1: "\u00b9", 2: "\u00b2", 3: "\u00b3", 4: "\u2074", 5: "\u2075", 6: "\u2076", 7: "\u2077", 8: "\u2078", 9: "\u2079" };
export function sci(x, digits = 3) {
  if (!Number.isFinite(x)) return String(x);
  if (x === 0) return "0";
  const e = Math.floor(Math.log10(Math.abs(x)));
  let m = x / 10 ** e;
  let ee = e;
  if (Math.abs(+m.toPrecision(digits)) >= 10) { m /= 10; ee += 1; }
  if (ee === 0) return (+m.toPrecision(digits)).toString();
  const sup = String(ee).split("").map((ch) => SUP[ch]).join("");
  return `${(+m.toPrecision(digits)).toString()} \u00d7 10${sup}`;
}
function withUnit(x, units, digits) {
  for (const [scale, name] of units) {
    if (Math.abs(x) >= scale) {
      const v = x / scale;
      return `${Math.abs(v) >= 1000 ? sci(v, digits) : (+v.toPrecision(digits)).toString()} ${name}`;
    }
  }
  const [scale, name] = units[units.length - 1];
  return `${sci(x / scale, digits)} ${name}`;
}
export function formatLength(m, digits = 3) {
  return withUnit(m, [[1e3, "km"], [1, "m"], [1e-2, "cm"], [1e-3, "mm"], [1e-6, "\u00b5m"], [1e-9, "nm"], [1e-12, "pm"], [1e-15, "fm"]], digits);
}
export function formatFrequency(f, digits = 3) {
  return withUnit(f, [[1e21, "ZHz"], [1e18, "EHz"], [1e15, "PHz"], [1e12, "THz"], [1e9, "GHz"], [1e6, "MHz"], [1e3, "kHz"], [1, "Hz"]], digits);
}
export function formatEnergyEV(eV, digits = 3) {
  return withUnit(eV, [[1e9, "GeV"], [1e6, "MeV"], [1e3, "keV"], [1, "eV"], [1e-3, "meV"], [1e-6, "\u00b5eV"], [1e-9, "neV"]], digits);
}

// ---------- art anchors (from assets/MANIFEST.md, 1024 px art space) ----------
export const ART_ANCHORS = Object.freeze({
  sun: Object.freeze({ center: [512, 512], diskR: 300, radioMedianR: 366, xrayCoronaMedianR: 321, gammaFlare: [608, 578] }),
  galaxy: Object.freeze({ center: [512, 512], halfAxes: [447, 284], radioHalfAxes: [479, 312] }),
  crab: Object.freeze({ center: [512, 512], halfAxes: [416, 288], radioHalfAxes: [416, 300], tiltDeg: -20 }),
  reflector: Object.freeze({ center: [476, 511], focuserBase: [296, 253], eyepieceTip: [249, 312] })
});
// CSS transform that recenters art whose object is not centered in its square.
export function artRecenter(art) {
  if (art !== "telescope-optical-reflector") return "";
  const [cx, cy] = ART_ANCHORS.reflector.center;
  return `translate(${((512 - cx) / 1024 * 100).toFixed(2)}%, ${((512 - cy) / 1024 * 100).toFixed(2)}%)`;
}
