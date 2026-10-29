// Planetary Climate: constants, equations and the numbers each mode shows.
// Pure functions only (no DOM), so node --test can check them.
// Sources for every number: docs/climate-science.md.

// ---------- constants ----------
export const SIGMA = 5.670374419e-8;   // Stefan-Boltzmann constant, W m^-2 K^-4 (CODATA 2018, exact from h, c, k)
export const S0 = 1361.0;              // solar irradiance at 1 AU (total solar irradiance), W/m^2 (NASA Earth fact sheet)
export const WIEN = 2898;              // Wien displacement constant, um K (OpenStax)
export const T_FREEZE = 273.15;        // water freezes, K (at 1 atm)
export const T_BOIL = 373.15;          // water boils, K (at 1 atm)
export const toC = (K) => K - 273.15;

// ---------- planets (NASA NSSDCA planetary fact sheets) ----------
export const PLANETS = Object.freeze({
  venus: Object.freeze({ name: "Venus", d: 0.723, S: 2601.3, albedo: 0.77, Tobs: 737, pBar: 92, co2: "96.5%" }),
  earth: Object.freeze({ name: "Earth", d: 1.0, S: 1361.0, albedo: 0.294, Tobs: 288, pBar: 1.014, co2: "0.043% (427 ppm, 2025)" }),
  mars: Object.freeze({ name: "Mars", d: 1.524, S: 586.2, albedo: 0.25, Tobs: 214, pBar: 0.00636, co2: "95.1%" })
});
export const PLANET_IDS = Object.freeze(["venus", "earth", "mars"]);

// ---------- energy balance ----------
// Sunlight at distance d (AU): inverse-square law.
export const solarAt = (dAU) => S0 / (dAU * dAU);
// Average sunlight absorbed per square meter of the whole sphere: S(1 - a)/4.
export const absorbed = (S, a) => (S * (1 - a)) / 4;
export const reflected = (S, a) => (S * a) / 4;
// Equilibrium (effective) temperature: sigma T^4 = S(1 - a)/4.
export const eqTemp = (S, a) => Math.pow(absorbed(S, a) / SIGMA, 0.25);
export const emitted = (T) => SIGMA * T ** 4;
export const peakUm = (T) => WIEN / T;

// ---------- greenhouse: one gray layer ----------
// The layer absorbs a fraction eps of the surface's infrared and emits eps sigma Ta^4 both up and down.
// Balance: Ts^4 = Te^4 * 2/(2 - eps), Ta^4 = Ts^4 / 2.
export function oneLayer(Te, eps) {
  const Ts = Te * Math.pow(2 / (2 - eps), 0.25);
  const Ta = Ts / Math.pow(2, 0.25);
  return { Ts, Ta, surfUp: emitted(Ts), absorbedIR: eps * emitted(Ts), passes: (1 - eps) * emitted(Ts), atmEach: eps * emitted(Ta) };
}
// Emissivity that makes the one-layer surface temperature equal Ts.
export const epsFor = (Te, Ts) => 2 * (1 - (Te / Ts) ** 4);
// Many fully absorbing layers: Ts^4 = (1 + n) Te^4 (n can be fractional as an "equivalent" thickness).
export const layersTemp = (Te, n) => Te * Math.pow(1 + n, 0.25);
export const layersFor = (Te, Ts) => (Ts / Te) ** 4 - 1;

// Infrared absorption bands (approximate band centers, micrometers).
export const GASES = Object.freeze({
  co2: Object.freeze({ name: "Carbon dioxide", formula: "CO\u2082", bands: [4.3, 15], absorbs: true }),
  h2o: Object.freeze({ name: "Water vapor", formula: "H\u2082O", bands: [6.3, 20], absorbs: true }),
  ch4: Object.freeze({ name: "Methane", formula: "CH\u2084", bands: [3.3, 7.7], absorbs: true }),
  n2o2: Object.freeze({ name: "Nitrogen and oxygen", formula: "N\u2082, O\u2082", bands: [], absorbs: false })
});
export const GAS_IDS = Object.freeze(["co2", "h2o", "ch4", "n2o2"]);
export const WINDOW_UM = Object.freeze([8, 13]); // atmospheric window

// ---------- carbon dioxide ----------
export const C0 = 280;                       // pre-industrial CO2, ppm
export const forcing = (C) => 5.35 * Math.log(C / C0); // W/m^2 (Myhre et al. 1998, used by IPCC)
export const F2X = 5.35 * Math.log(2);        // 3.71 W/m^2 from the simple formula
export const F2X_AR6 = 3.93;                  // AR6 assessed forcing for doubled CO2, W/m^2
export const ECS = Object.freeze({ low: 2.5, best: 3, high: 4, vlow: 2, vhigh: 5 }); // AR6, K per doubling
export const warmingFor = (C, ecs) => (ecs * forcing(C)) / F2X;
// NOAA GML Mauna Loa annual mean CO2 (ppm).
export const KEELING = Object.freeze([[1959, 315.98], [1960, 316.91], [1965, 320.04], [1970, 325.68], [1975, 331.13], [1980, 338.76],
  [1985, 346.35], [1990, 354.45], [1995, 360.97], [2000, 369.71], [2005, 379.98], [2010, 390.10], [2015, 401.01], [2020, 414.21],
  [2021, 416.41], [2022, 418.53], [2023, 421.08], [2024, 424.61], [2025, 427.35]]);

// ---------- feedbacks (AR6 WG1 Table 7.10, W m^-2 K^-1) ----------
export const FEEDBACKS = Object.freeze({
  planck: Object.freeze({ name: "Planck (hotter planet glows more)", value: -3.22 }),
  wvlr: Object.freeze({ name: "Water vapor and lapse rate", value: 1.30 }),
  albedo: Object.freeze({ name: "Surface albedo (ice and snow)", value: 0.35 }),
  cloud: Object.freeze({ name: "Clouds", value: 0.42 })
});
export const AR6_NET = -1.16;
export function feedbackSum(on) {
  let s = FEEDBACKS.planck.value;
  for (const k of ["wvlr", "albedo", "cloud"]) if (on[k]) s += FEEDBACKS[k].value;
  return s;
}
export const responseTo = (F, lam) => -F / lam;

// ---------- sliders ----------
export const SLIDERS = Object.freeze({
  S: Object.freeze({ min: 401, max: 2801, steps: 240, log: false, unit: "W/m\u00b2" }),
  albedo: Object.freeze({ min: 0.05, max: 0.9, steps: 85, log: false, unit: "" }),
  eps: Object.freeze({ min: 0.05, max: 0.95, steps: 90, log: false, unit: "" }),
  ppm: Object.freeze({ min: 300, max: 1200, steps: 180, log: false, unit: "ppm" }),
  dF: Object.freeze({ min: 0.5, max: 8, steps: 150, log: true, unit: "W/m\u00b2" }),
  dAU: Object.freeze({ min: 0.3, max: 3, steps: 200, log: true, unit: "AU" }),
  layers: Object.freeze({ min: 0.02, max: 150, steps: 300, log: true, unit: "" })
});
export function fromSlider(name, step) {
  const s = SLIDERS[name], u = Math.min(s.steps, Math.max(0, Math.round(step))) / s.steps;
  const v = s.log ? s.min * (s.max / s.min) ** u : s.min + (s.max - s.min) * u;
  return Number(v.toPrecision(12));
}
export function toSlider(name, value) {
  const s = SLIDERS[name];
  const u = s.log ? Math.log(value / s.min) / Math.log(s.max / s.min) : (value - s.min) / (s.max - s.min);
  return Math.min(s.steps, Math.max(0, Math.round(u * s.steps)));
}
export function modeSliders(mode, s) {
  switch (mode) {
    case "energy": return ["S", "albedo"];
    case "greenhouse": return ["eps"];
    case "compare": return [];
    case "co2": return ["ppm"];
    case "feedbacks": return ["dF"];
    case "sandbox": return s && s.atmosphere ? ["dAU", "albedo", "layers"] : ["dAU", "albedo"];
    default: return [];
  }
}
export const SLIDER_KEY = Object.freeze({ S: "S", albedo: "albedo", eps: "eps", ppm: "ppm", dF: "dF", dAU: "dAU", layers: "layers" });

// ---------- what each mode shows ----------
export const EARTH_TE = eqTemp(PLANETS.earth.S, PLANETS.earth.albedo);
export function shown(mode, s) {
  switch (mode) {
    case "energy": {
      const T = eqTemp(s.S, s.albedo);
      return { S: s.S, albedo: s.albedo, absorbed: absorbed(s.S, s.albedo), reflected: reflected(s.S, s.albedo), T };
    }
    case "greenhouse": {
      const g = oneLayer(EARTH_TE, s.eps);
      return { eps: s.eps, Te: EARTH_TE, Ts: g.Ts, Ta: g.Ta, surfUp: g.surfUp, absorbedIR: g.absorbedIR, passes: g.passes, atmEach: g.atmEach, warming: g.Ts - EARTH_TE };
    }
    case "compare": {
      const p = PLANETS[s.planet], Te = eqTemp(p.S, p.albedo);
      return { S: p.S, albedo: p.albedo, Te, Tobs: p.Tobs, warming: p.Tobs - Te };
    }
    case "co2": {
      const F = forcing(s.ppm);
      return { ppm: s.ppm, ratio: s.ppm / C0, F, low: warmingFor(s.ppm, ECS.low), best: warmingFor(s.ppm, ECS.best), high: warmingFor(s.ppm, ECS.high) };
    }
    case "feedbacks": {
      const lam = feedbackSum(s.on), lam0 = FEEDBACKS.planck.value;
      const dT = responseTo(s.dF, lam), dT0 = responseTo(s.dF, lam0);
      return { dF: s.dF, lam, dT, dT0, gain: dT / dT0 };
    }
    case "sandbox": {
      const S = solarAt(s.dAU), Te = eqTemp(S, s.albedo), Ts = s.atmosphere ? layersTemp(Te, s.layers) : Te;
      return { dAU: s.dAU, S, albedo: s.albedo, Te, Ts };
    }
    default: return {};
  }
}
// What water would do at this surface temperature (at about 1 atm).
export const waterState = (Ts) => (Ts < T_FREEZE ? "ice" : Ts < T_BOIL ? "liquid" : "steam");

// ---------- deep links ----------
export const MODES = Object.freeze(["energy", "greenhouse", "compare", "co2", "feedbacks", "sandbox"]);
export const MODE_ALIASES = Object.freeze({
  energy: "energy", "energy-balance": "energy", balance: "energy", albedo: "energy", equilibrium: "energy",
  greenhouse: "greenhouse", "greenhouse-effect": "greenhouse", infrared: "greenhouse", ir: "greenhouse", layer: "greenhouse",
  compare: "compare", planets: "compare", "compare-planets": "compare", venus: "compare", mars: "compare",
  co2: "co2", "carbon-dioxide": "co2", carbon: "co2", warming: "co2", keeling: "co2", forcing: "co2",
  feedbacks: "feedbacks", feedback: "feedbacks", "ice-albedo": "feedbacks", "water-vapor": "feedbacks",
  sandbox: "sandbox", free: "sandbox", play: "sandbox", build: "sandbox"
});
export function parseQuery(search) {
  const p = new URLSearchParams(typeof search === "string" ? search : "");
  const raw = (p.get("mode") || "").trim().toLowerCase();
  return { mode: MODE_ALIASES[raw] || "energy" };
}

// ---------- formatting ----------
export function sig(x, d = 3) {
  if (!isFinite(x)) return "\u2013";
  if (x === 0) return "0";
  return String(Number(x.toPrecision(d))).replace("-", "\u2212");
}
export const fix = (x, d) => (Object.is(Number(x.toFixed(d)), -0) ? 0 : x).toFixed(d).replace("-", "\u2212");
export const degC = (K) => fix(toC(K), 0) + " \u00b0C";
