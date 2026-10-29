// Relativity "Lightspeed Ride" model: what a pilot sees out the window at speed beta = v/c.
// Pure functions, no DOM. Every number is Cleared by Tesla 2026-10-29 (see docs/relativity-science.md).
//
// Angles: theta is a star's angle from the direction of motion as measured in the rest frame
// of the distant stars; thetaShip is the same star's angle as seen from the ship.

export const MODULE_ID = "relativity-lightspeed";
export const MODE_PARAM = "lightspeed-ride";
export const BETA_MAX = 0.999; // top of the throttle (gamma about 22.4), Cleared by Tesla 2026-10-29
export const RAPIDITY_MAX = Math.atanh(BETA_MAX);
export const CONE_DEG = 45; // half angle of the forward "view cone" the readout and Silver use, Cleared by Tesla 2026-10-29
export const STAR_COUNT = 900;
export const TEMP_RANGE = { min: 1000, max: 40000 }; // color lookup clamp in kelvin, Cleared by Tesla 2026-10-29
export const PRESETS = [0, 0.5, 0.9, 0.99, 0.999];

export const FUN = { bronzeBeta: 0.5, silverFraction: 0.5, goldGamma: 10, goldTol: 0.25, goldHoldS: 3 };
export const GOALS = [
  { tier: "bronze", title: "Ride at half the speed of light", check: (e) => e.type === "ride" && e.beta >= FUN.bronzeBeta },
  { tier: "silver", title: "Squeeze half of all the stars into the forward 45 degree cone", check: (e) => e.type === "ride" && e.fraction >= FUN.silverFraction },
  { tier: "gold", title: "Hold the ship at gamma 10 for 3 seconds", check: (e) => e.type === "ride" && e.holdGold >= FUN.goldHoldS }
];

export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const gamma = (beta) => 1 / Math.sqrt(1 - beta * beta);

// Throttle: equal pushes of the slider add equal rapidity, so the needle crawls as it nears c
// and never reaches it. s is the slider position from 0 to 1.
export const sliderToBeta = (s) => Math.tanh(RAPIDITY_MAX * clamp(s, 0, 1));
export const betaToSlider = (beta) => Math.atanh(clamp(beta, 0, BETA_MAX)) / RAPIDITY_MAX;

// Relativistic aberration: cos(thetaShip) = (cos(theta) + beta) / (1 + beta cos(theta)).
export const aberrateCos = (cosTheta, beta) => (cosTheta + beta) / (1 + beta * cosTheta);
// Doppler factor seen on the ship, D = nu_seen / nu_emitted = gamma (1 + beta cos(theta)).
// Same value as 1 / (gamma (1 - beta cos(thetaShip))).
export const doppler = (cosTheta, beta) => gamma(beta) * (1 + beta * cosTheta);
export const dopplerShip = (cosThetaShip, beta) => 1 / (gamma(beta) * (1 - beta * cosThetaShip));

// Fraction of an even sky that the pilot sees within halfDeg of straight ahead.
export function coneFraction(beta, halfDeg = CONE_DEG) {
  const c = Math.cos(halfDeg * Math.PI / 180);
  const c0 = (c - beta) / (1 - beta * c); // rest-frame cosine that lands on the cone edge
  return clamp((1 - c0) / 2, 0, 1);
}
// Ship-frame angle (degrees) of a star at 90 degrees in the rest frame: sin(thetaShip) = 1 / gamma.
export const sideStarDeg = (beta) => Math.acos(beta) * 180 / Math.PI;

// A blackbody of temperature T shifted by D looks like a blackbody at D T (Cleared by Tesla 2026-10-29).
export const shiftedTemp = (T, D) => clamp(T * D, TEMP_RANGE.min, TEMP_RANGE.max);

// Approximate sRGB of a blackbody (Tanner Helland's fit), good to a few percent from 1000 K to 40000 K.
export function tempToRGB(T) {
  const t = clamp(T, TEMP_RANGE.min, TEMP_RANGE.max) / 100;
  let r, g, b;
  if (t <= 66) { r = 255; g = 99.4708025861 * Math.log(t) - 161.1195681661; }
  else { r = 329.698727446 * Math.pow(t - 60, -0.1332047592); g = 288.1221695283 * Math.pow(t - 60, -0.0755148492); }
  if (t >= 66) b = 255; else if (t <= 19) b = 0; else b = 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  return [r, g, b].map((v) => Math.round(clamp(v, 0, 255)));
}

// Seeded even sky. Each star: rest-frame unit vector (z = forward), temperature, base brightness.
export function makeSky(n = STAR_COUNT, seed = 7) {
  let s = seed >>> 0;
  const rnd = () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const temps = [3200, 3800, 4600, 5200, 5800, 6500, 7500, 9500, 12000];
  const stars = [];
  for (let i = 0; i < n; i++) {
    const z = 2 * rnd() - 1, ph = 2 * Math.PI * rnd(), r = Math.sqrt(1 - z * z);
    stars.push({ x: r * Math.cos(ph), y: r * Math.sin(ph), z, T: temps[Math.floor(rnd() * temps.length)], mag: 0.35 + 0.65 * rnd() * rnd() });
  }
  return stars;
}

// Where each star appears from the ship. Toggles let the sandbox switch effects off one by one.
// Returns ship-frame unit vectors plus the Doppler factor and seen temperature.
export function view(stars, beta, { aberration = true, dopplerOn = true } = {}) {
  return stars.map((st) => {
    const ct = st.z, cs = aberration ? aberrateCos(ct, beta) : ct;
    const sOld = Math.sqrt(Math.max(0, 1 - ct * ct)), sNew = Math.sqrt(Math.max(0, 1 - cs * cs));
    const k = sOld > 1e-9 ? sNew / sOld : 0;
    const D = dopplerOn ? doppler(ct, beta) : 1;
    return { x: st.x * k, y: st.y * k, z: cs, D, T: shiftedTemp(st.T, D), mag: st.mag };
  });
}
export const fractionInCone = (seen, halfDeg = CONE_DEG) => {
  const c = Math.cos(halfDeg * Math.PI / 180);
  return seen.length ? seen.filter((s) => s.z >= c).length / seen.length : 0;
};
// Brightness factor on screen: D^2, the energy flux from a point-like star (McKinley & Doherty,
// Am. J. Phys. 47, 309 (1979); Rybicki & Lightman ch. 4), capped so the picture stays readable.
// Off when Doppler is off.
export const BRIGHTNESS_POWER = 2;
export const brightness = (D) => clamp(Math.pow(D, BRIGHTNESS_POWER), 0.02, 6);
