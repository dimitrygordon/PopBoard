// Build a Star: stellar physics for the lab.
// Pure: no DOM, no Firebase. Runs in node for tests and in the page.
// Masses in solar masses (M), luminosity in L_sun, radius in R_sun, T in K.
// Every formula, constant and simplification is listed in docs/stars-science.md.
//   node --test tests/stars-physics.test.mjs

// ---------- constants ----------
export const G = 6.67430e-11;           // m^3 kg^-1 s^-2 (CODATA 2018)
export const M_SUN = 1.98841e30;        // kg (GM_sun / G, IAU 2015)
export const R_SUN = 6.957e8;           // m (IAU 2015 nominal)
export const T_SUN = 5772;              // K, effective temperature (IAU 2015 nominal)
export const TC_SUN = 15.7e6;           // K, solar core temperature (standard solar model)
export const PC_SUN = 2.5e16;           // Pa, solar core pressure (standard solar model)
export const T_MS_SUN = 10;             // Gyr, solar main-sequence lifetime
export const Z_SUN = 0.014;             // solar metallicity (Asplund et al. 2009, present-day ~0.0134)
export const Y_SUN = 0.27;              // protosolar helium mass fraction (about 0.27)
export const AGE_UNIVERSE = 13.8;       // Gyr

export const MASS_MIN = 0.08, MASS_MAX = 100;
export const Z_MIN = 0.0001, Z_MAX = 0.04;
export const Y_MIN = 0.24, Y_MAX = 0.4;

// Thresholds (solar masses unless noted).
export const FULLY_CONVECTIVE_MAX = 0.35;  // below: convection all the way through
export const CONVECTIVE_CORE_MIN = 1.3;    // above: convective core, radiative envelope
export const CNO_CROSSOVER_T = 17e6;       // K: CNO and pp chain release equal energy (solar mix)
export const CNO_STEEPNESS = 52;           // effective exponent of (Tc / 17 MK) in the CNO/pp ratio
export const HE_IGNITION_T = 1e8;          // K: triple-alpha helium burning
export const LOW_MASS_GIANT_MIN = 0.5;     // below: no red giant or planetary nebula, slow fade to a helium white dwarf
export const SUPERNOVA_MIN = 8;            // at or above: core collapse
export const BLACK_HOLE_MIN = 20;          // at or above: black hole instead of a neutron star
export const DIRECT_COLLAPSE_MIN = 40;     // at or above with low Z: direct collapse, faint or no supernova (25 to 40: fallback)
export const DIRECT_COLLAPSE_Z = 0.1 * Z_SUN;
export const CHANDRASEKHAR = 1.44;
export const HYPOTHETICAL_MAX = 0.9;        // below: no star this small has died yet
export const ONE_WD_MIN = 7;               // oxygen-neon white dwarfs above about 7 M_sun
export const VERY_LONG_MAX = 0.35;         // below: lifetime shown as about 1 trillion years or more
export const VERY_LONG_GYR = 1000;

export const MODE_ALIASES = Object.freeze({
  build: "build", star: "build",
  sandbox: "sandbox", free: "sandbox", play: "sandbox",
  equilibrium: "equilibrium", hydrostatic: "equilibrium", balance: "equilibrium", pressure: "equilibrium",
  fusion: "fusion", pp: "fusion", cno: "fusion",
  transport: "transport", convection: "transport", energy: "transport",
  lifetime: "lifetime", hourglass: "lifetime", life: "lifetime", stages: "lifetime",
  fate: "fate", supernova: "fate", death: "fate", remnant: "fate"
});

export function modeFromSearch(search) {
  const p = new URLSearchParams(typeof search === "string" ? search : "");
  return MODE_ALIASES[(p.get("mode") || "").trim().toLowerCase()] || "build";
}

export const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

/** Read ?mass=, ?z=, ?y=, ?stage= from a query string, clamped to the lab's ranges. */
export function paramsFromSearch(search) {
  const p = new URLSearchParams(typeof search === "string" ? search : "");
  const num = (k) => { const v = parseFloat(p.get(k)); return Number.isFinite(v) ? v : null; };
  const m = num("mass"), z = num("z"), y = num("y");
  return {
    mass: m == null ? 1 : clamp(m, MASS_MIN, MASS_MAX),
    z: z == null ? Z_SUN : clamp(z, Z_MIN, Z_MAX),
    y: y == null ? null : clamp(y, Y_MIN, Y_MAX),
    stage: (p.get("stage") || "").trim().toLowerCase() || null
  };
}

// ---------- composition ----------

export function composition(z = Z_SUN, y = null) {
  const Z = clamp(z, Z_MIN, Z_MAX);
  const Y = clamp(y == null ? Y_SUN : y, Y_MIN, Y_MAX);
  const X = 1 - Y - Z;
  // Fully ionized mean molecular weight: 1/mu = 2X + 3Y/4 + Z/2.
  const mu = 1 / (2 * X + 0.75 * Y + 0.5 * Z);
  return { X, Y, Z, mu };
}
const SOLAR_MIX = composition(Z_SUN, Y_SUN);

// ---------- main sequence (zero-age-ish, solar calibrated) ----------

/** Mass-luminosity relation, piecewise power law (L_sun). */
export function baseLuminosity(m) {
  if (m < 0.43) return 0.23 * Math.pow(m, 2.3);
  if (m < 2) return Math.pow(m, 4);
  if (m < 30) return 1.4 * Math.pow(m, 3.5);
  // Flatter above 30 M_sun: log L ~5.46 at 38 and ~5.54 at 43 (Mamajek O-star table).
  return 1.4 * Math.pow(30, 3.5) * Math.pow(m / 30, 1.435);
}

/** Mass-radius relation (R_sun), piecewise power laws, continuous at the joins. */
export function baseRadius(m) {
  if (m < 0.35) return Math.pow(0.35, 0.8) * Math.pow(m / 0.35, 1.125); // 0.23 R_sun at 0.2 M_sun
  if (m < 1) return Math.pow(m, 0.8);
  if (m < 2) return Math.pow(m, 1.06);
  return 1.41 * Math.pow(m, 0.56);
}

/** Composition nudges. Homology gives L ~ mu^4; lower Z means lower opacity and a brighter star. */
export function luminosityFactor(comp) {
  return Math.pow(comp.mu / SOLAR_MIX.mu, 4) * Math.pow(comp.Z / Z_SUN, -0.15);
}

/** Base main-sequence lifetime (Gyr), piecewise power laws continuous at 1, 5 and 40 M_sun. */
export function baseLifetime(m) {
  if (m < 1) return T_MS_SUN * Math.pow(m, -2.5);
  if (m < 5) return T_MS_SUN * Math.pow(m, -2.86);
  if (m < 40) return 0.1 * Math.pow(m / 5, -1.5);
  return 0.0044 * Math.pow(m / 40, -0.45);
}

export const LIFE_RAMP_HI = 0.5;
/**
 * Smooth step-up from the power law at 0.5 M_sun to 1 trillion yr at 0.35 M_sun (log-log),
 * so the 1 trillion yr floor below 0.35 does not jump 7x. Nearly convective stars burn more of their hydrogen.
 */
export function lifetimeRamp(m) {
  if (m >= LIFE_RAMP_HI || m < VERY_LONG_MAX) return 1;
  const f = Math.log(LIFE_RAMP_HI / m) / Math.log(LIFE_RAMP_HI / VERY_LONG_MAX);
  return Math.pow(VERY_LONG_GYR / baseLifetime(VERY_LONG_MAX), f);
}

/** Lifetime as shown to students. Below 0.35 M_sun: about 1 trillion years or more (Laughlin et al. 1997). */
export function lifetimeLabel(ms) {
  return ms.mass < VERY_LONG_MAX ? "about 1 trillion years or more" : formatYears(ms.lifetime);
}

/** Core helium burning lasts t_He = min(0.15 t_MS, 110 Myr). */
export function heliumBurningTime(tMS) { return Math.min(0.15 * tMS, 0.11); }

/** Core temperature (K): fit Tc = 15.7 MK M^0.5 (M<1), M^0.3 (M>=1), scaled by mu (homology) and a small Z nudge. */
export function coreTemperature(m, comp = SOLAR_MIX) {
  const fit = m < 1 ? Math.pow(m, 0.5) : Math.pow(m, 0.3);
  return TC_SUN * fit * (comp.mu / SOLAR_MIX.mu) * Math.pow(comp.Z / Z_SUN, -0.03);
}

/**
 * Core pressure (Pa) from homology: Pc ~ G M^2 / R^4, calibrated to 2.5e16 Pa for the Sun.
 * Fully convective stars (M < 0.35) use a lower coefficient, 8.7e14 Pa (about 1.2e16 Pa at 0.2 M_sun).
 */
export const PC_LOW = 8.7e14;
export const PC_BLEND_LO = 0.3;
export const PC_BLEND_HI = 0.8;
/** Pressure coefficient: 8.7e14 Pa at M <= 0.3, 2.5e16 Pa at M >= 0.8, log-log interpolation between (no jump). */
export function pressureCoefficient(m) {
  if (m <= PC_BLEND_LO) return PC_LOW;
  if (m >= PC_BLEND_HI) return PC_SUN;
  const f = Math.log10(m / PC_BLEND_LO) / Math.log10(PC_BLEND_HI / PC_BLEND_LO);
  return Math.pow(10, Math.log10(PC_LOW) + f * (Math.log10(PC_SUN) - Math.log10(PC_LOW)));
}
export function corePressure(m, r = baseRadius(m)) { return pressureCoefficient(m) * (m * m) / Math.pow(r, 4); }

/** Rough order-of-magnitude scale: Pc ~ G M^2 / R^4 in SI (no calibration), for the docs comparison. */
export function rawPressureScale(m, r = baseRadius(m)) {
  return G * Math.pow(m * M_SUN, 2) / Math.pow(r * R_SUN, 4);
}

export function effectiveTemperature(L, R) { return T_SUN * Math.pow(L / (R * R), 0.25); }

/**
 * Fraction of core energy from the CNO cycle on the main sequence.
 * ratio CNO/pp = (Z/Z_sun) (X_sun/X) (Tc / 17 MK)^52.
 * The 52 is a calibration, not a rate law (Sun's CNO share ~1%, Borexino 2020).
 */
export function cnoFraction(tc, comp = SOLAR_MIX) {
  const ratio = (comp.Z / Z_SUN) * (SOLAR_MIX.X / comp.X) * Math.pow(tc / CNO_CROSSOVER_T, CNO_STEEPNESS);
  return ratio / (1 + ratio);
}

/** Energy transport on the main sequence. */
export function transport(m) {
  if (m < FULLY_CONVECTIVE_MAX) return { kind: "fully-convective", cutaway: "low-mass", core: "convective", envelope: "convective" };
  if (m < CONVECTIVE_CORE_MIN) return { kind: "radiative-core", cutaway: "sun-like", core: "radiative", envelope: "convective" };
  return { kind: "convective-core", cutaway: "massive", core: "convective", envelope: "radiative" };
}

/** Spectral class from effective temperature (Harvard boundaries, rounded). */
export function spectralClass(t) {
  if (t >= 30000) return "O"; if (t >= 10000) return "B"; if (t >= 7500) return "A";
  if (t >= 6000) return "F"; if (t >= 5200) return "G"; if (t >= 3700) return "K"; return "M";
}

export function mainSequence(m, z = Z_SUN, y = null) {
  const M = clamp(m, MASS_MIN, MASS_MAX);
  const comp = composition(z, y);
  const lf = luminosityFactor(comp);
  const L = baseLuminosity(M) * lf;
  const R = baseRadius(M);
  const Tc = coreTemperature(M, comp);
  const Pc = corePressure(M, R);
  // Lifetime ~ fuel / burn rate: hydrogen supply X M, burn rate L.
  let lifetime = baseLifetime(M) * lifetimeRamp(M) * (comp.X / SOLAR_MIX.X) / lf;
  if (M < VERY_LONG_MAX) lifetime = Math.max(lifetime, VERY_LONG_GYR);
  const teff = effectiveTemperature(L, R);
  return {
    mass: M, comp, L, R, teff, spectral: spectralClass(teff), Tc, Pc, lifetime,
    cno: cnoFraction(Tc, comp), transport: transport(M)
  };
}

// ---------- fate ----------

export function fate(m, z = Z_SUN) {
  const hypothetical = m < HYPOTHETICAL_MAX;
  if (m < LOW_MASS_GIANT_MIN) return { id: "white-dwarf", path: "low", remnant: "white-dwarf", nebula: false, supernova: false, wdKind: "helium", hypothetical };
  if (m < SUPERNOVA_MIN) return { id: "white-dwarf", path: "low", remnant: "white-dwarf", nebula: true, supernova: false, wdKind: m < ONE_WD_MIN ? "carbon-oxygen" : "oxygen-neon", hypothetical };
  if (m < BLACK_HOLE_MIN) return { id: "neutron-star", path: "high", remnant: "neutron-star", nebula: false, supernova: true };
  const direct = m >= DIRECT_COLLAPSE_MIN && z <= DIRECT_COLLAPSE_Z;
  return { id: "black-hole", path: "high", remnant: "black-hole", nebula: false, supernova: !direct, direct, fallback: !direct };
}

/** White dwarf mass from the initial-final mass relation (Kalirai et al. 2008), capped below Chandrasekhar. */
export function whiteDwarfMass(m) {
  if (m < LOW_MASS_GIANT_MIN) return Math.min(m, 0.45);
  return Math.min(0.109 * m + 0.394, 1.35);
}

// ---------- life stages ----------

export const STAGE_INFO = Object.freeze({
  "main-sequence": { name: "Main sequence", core: "Hydrogen fuses to helium in the core." },
  "red-giant": { name: "Red giant", core: "Core hydrogen is gone. Hydrogen fuses in a shell; the inert helium core contracts and heats." },
  "helium-burning": { name: "Helium burning", core: "At about 100 MK the core fuses helium into carbon and oxygen (triple-alpha)." },
  "agb": { name: "Asymptotic giant", core: "Inert carbon-oxygen core, helium and hydrogen burn in shells. The star swells and sheds mass." },
  "planetary-nebula": { name: "Planetary nebula", core: "The outer layers drift away; the hot core lights them up." },
  "red-supergiant": { name: "Red supergiant", core: "Helium, then carbon, neon, oxygen and silicon burn in nested shells until the core is iron." },
  "supernova": { name: "Core-collapse supernova", core: "The iron core cannot release energy by fusion. It collapses in under a second and the rebound blows the star apart. About 3 billion K in silicon burning, about 10 billion K in the collapsing core, about 100 billion K in the newborn neutron star." },
  "white-dwarf": { name: "White dwarf", core: "No fusion. An Earth-sized ember held up by electron degeneracy pressure. It starts near 100,000 K and cools for billions of years." },
  "neutron-star": { name: "Neutron star", core: "About 1.4 solar masses packed into a ball about 24 km across (radius 11 to 13 km), held up by neutron degeneracy." },
  "black-hole": { name: "Black hole", core: "Gravity wins completely. Not even light escapes." }
});

/** Ordered stages with durations in Gyr (the last stage is open-ended). */
export function lifeStages(m, z = Z_SUN, y = null) {
  const ms = mainSequence(m, z, y);
  const t = ms.lifetime, f = fate(ms.mass, z);
  const s = [{ id: "main-sequence", dur: t }];
  if (ms.mass < LOW_MASS_GIANT_MIN) {
    s.push({ id: "white-dwarf", dur: Infinity });
  } else if (ms.mass < SUPERNOVA_MIN) {
    s.push({ id: "red-giant", dur: 0.1 * t }, { id: "helium-burning", dur: heliumBurningTime(t) }, { id: "agb", dur: 0.002 * t },
      { id: "planetary-nebula", dur: 2e-5 }, { id: "white-dwarf", dur: Infinity });
  } else {
    s.push({ id: "red-supergiant", dur: heliumBurningTime(t) });
    if (f.supernova) s.push({ id: "supernova", dur: 1e-9 });
    s.push({ id: f.remnant, dur: Infinity });
  }
  let start = 0;
  for (const st of s) { st.start = start; start += Number.isFinite(st.dur) ? st.dur : 0; }
  return s;
}

/** Scrubber u in [0,1] -> { stage, index, frac, age }. Main sequence gets the first half; later stages share the rest. */
export function stageAt(stages, u) {
  const U = clamp(u, 0, 1);
  const n = stages.length;
  const width = (i) => (i === 0 ? 0.5 : 0.5 / (n - 1));
  let acc = 0;
  for (let i = 0; i < n; i++) {
    const w = width(i);
    if (U < acc + w || i === n - 1) {
      const frac = clamp((U - acc) / w, 0, 1);
      const st = stages[i];
      const age = st.start + (Number.isFinite(st.dur) ? frac * st.dur : 0);
      return { stage: st, index: i, frac, age };
    }
    acc += w;
  }
}
export function stageStartU(stages, index) { return index === 0 ? 0 : 0.5 + (index - 1) * 0.5 / (stages.length - 1); }

/** HR-diagram position, core temperature and fusion state for one stage. */
export function stageState(m, z, y, stageId, frac = 0) {
  const ms = mainSequence(m, z, y);
  const M = ms.mass;
  let L = ms.L, teff = ms.teff, Tc = ms.Tc, fusion = "hydrogen", where = "core", onHR = true;
  switch (stageId) {
    case "main-sequence": break;
    case "red-giant": L = Math.max(ms.L * 2, 100 * M * M) * (0.3 + 1.4 * frac); teff = 4300; Tc = 4e7 + 6e7 * frac; fusion = "hydrogen"; where = "shell"; break;
    case "helium-burning": L = Math.max(ms.L * 1.5, 50 * Math.pow(M, 1.5)); teff = 4800; Tc = HE_IGNITION_T; fusion = "helium"; where = "core"; break;
    case "agb": L = Math.max(ms.L * 3, 3000 * Math.pow(M, 0.8)); teff = 3200; Tc = 2e8; fusion = "helium"; where = "shell"; break;
    case "planetary-nebula": L = 3000 * Math.pow(M, 0.5); teff = 100000; Tc = 2e8; fusion = "none"; where = "none"; break;
    case "red-supergiant": L = ms.L; teff = 3600; Tc = 2e8; fusion = "helium"; where = "core"; break;
    case "supernova": L = 1e9; teff = ms.teff; Tc = 1e10; fusion = "none"; where = "none"; onHR = false; break;
    case "white-dwarf": teff = 100000 * Math.pow(0.1, frac); L = 0.012 * 0.012 * Math.pow(teff / T_SUN, 4); Tc = 1e7; fusion = "none"; where = "none"; break;
    default: L = 0; teff = 0; Tc = 0; fusion = "none"; where = "none"; onHR = false;
  }
  const R = teff > 0 ? Math.sqrt(L) / Math.pow(teff / T_SUN, 2) : 0;
  return { L, teff, R, Tc, fusion, where, onHR };
}

// ---------- hydrostatic equilibrium perturbation ----------

/**
 * Squeeze the star to radius (1 + x) of equilibrium. Gravity's inward push per area
 * scales as R^-4; adiabatic gas pressure (gamma = 5/3) as rho^gamma ~ R^-5.
 * Returns both relative to their equilibrium value (1).
 */
export function perturbedForces(x, gamma = 5 / 3) {
  const s = 1 + x;
  return { gravity: Math.pow(s, -4), pressure: Math.pow(s, -3 * gamma) };
}

/** Damped oscillation of the radius after a squeeze, in units of the dynamical time. */
export function perturbationRadius(t, x0 = -0.12, damping = 0.35, omega = 2 * Math.PI / 1.6) {
  return x0 * Math.exp(-damping * t) * Math.cos(omega * t);
}

/** Free-fall (dynamical) time ~ sqrt(R^3 / G M) in minutes; about 27 min for the Sun. */
export function dynamicalTimeMinutes(m, r) {
  return Math.sqrt(Math.pow(r * R_SUN, 3) / (G * m * M_SUN)) / 60;
}

// ---------- color by temperature ----------

const TINT_STOPS = [
  [2500, [196, 64, 40]], [3500, [226, 104, 52]], [4500, [238, 150, 64]], [5772, [237, 188, 88]],
  [7500, [250, 240, 214]], [10000, [206, 222, 255]], [30000, [140, 172, 255]]
];
/** Star tint for a temperature: red, orange, gold, white, blue. Returns [r,g,b]. */
export function tintForTemperature(t) {
  const lt = Math.log(clamp(t, TINT_STOPS[0][0], TINT_STOPS[TINT_STOPS.length - 1][0]));
  for (let i = 1; i < TINT_STOPS.length; i++) {
    const [t1, c1] = TINT_STOPS[i];
    if (lt <= Math.log(t1)) {
      const [t0, c0] = TINT_STOPS[i - 1];
      const k = (lt - Math.log(t0)) / (Math.log(t1) - Math.log(t0));
      return c0.map((v, j) => Math.round(v + (c1[j] - v) * k));
    }
  }
  return TINT_STOPS[TINT_STOPS.length - 1][1].slice();
}

// ---------- slider mappings ----------
export const massToSlider = (m) => Math.log(m / MASS_MIN) / Math.log(MASS_MAX / MASS_MIN);
export const sliderToMass = (u) => MASS_MIN * Math.pow(MASS_MAX / MASS_MIN, clamp(u, 0, 1));
export const zToSlider = (z) => Math.log(z / Z_MIN) / Math.log(Z_MAX / Z_MIN);
export const sliderToZ = (u) => Z_MIN * Math.pow(Z_MAX / Z_MIN, clamp(u, 0, 1));

// ---------- formatting ----------
export function formatYears(gyr) {
  if (!Number.isFinite(gyr)) return "forever";
  const f = (v) => (v >= 10 ? Math.round(v).toLocaleString("en-US") : String(+v.toPrecision(2)));
  if (gyr >= 1000) return f(gyr / 1000) + " trillion yr";
  if (gyr >= 1) return f(gyr) + " Gyr";
  if (gyr >= 1e-3) return f(gyr * 1e3) + " Myr";
  if (gyr >= 1e-6) return f(gyr * 1e6) + " yr";
  return "seconds";
}
export function formatSci(x, digits = 2) {
  const e = Math.floor(Math.log10(x));
  const mant = x / Math.pow(10, e);
  return mant.toFixed(digits - 1) + " \u00d7 10^" + e;
}
