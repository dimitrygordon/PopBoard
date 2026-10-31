// Crater sandbox math (deck 7). Pi-group crater scaling after Collins, Melosh & Marcus (2005),
// "Earth Impact Effects Program": transient crater, then the final simple or complex crater.
export const G_EARTH = 9.81, G_MOON = 1.62;
export const MATERIALS = { iron: 7800, stone: 3000, ice: 1000 };
export const TARGET_DENSITY = 2500; // kg/m^3, typical rock

// Transient crater diameter (m). L impactor diameter (m), v speed (m/s), rho impactor density, g gravity, angle (deg from horizontal).
export function transientDiameter(L, v, rho, g = G_EARTH, angle = 45) {
  return 1.161 * Math.cbrt(rho / TARGET_DENSITY) * Math.pow(L, 0.78) * Math.pow(v, 0.44) * Math.pow(g, -0.22) * Math.cbrt(Math.sin(angle * Math.PI / 180));
}
// Simple-to-complex transition diameter scales with 1/g: about 3.2 km on Earth, about 19 km on the Moon.
export function transitionDiameter(g = G_EARTH) { return 3200 * (G_EARTH / g); }

export function crater(L, v, rho, g = G_EARTH) {
  const tc = transientDiameter(L, v, rho, g);
  const Dc = transitionDiameter(g);
  let D = 1.25 * tc, shape = "bowl";
  if (D > Dc) { D = 1.17 * Math.pow(tc, 1.13) / Math.pow(Dc, 0.13); shape = D > 15 * Dc ? "rings" : "peak"; } // simplified: rings above about 15 times the transition size
  // depth: simple bowls are about 1/5 as deep as wide; complex craters are much shallower,
  // about 0.4 * D^0.3 with both in km (Collins et al. 2005)
  const depth = shape === "bowl" ? D / 5 : 1000 * 0.4 * Math.pow(D / 1000, 0.3);
  const mass = rho * Math.PI / 6 * L * L * L;
  const energyJ = 0.5 * mass * v * v;
  return { D, depth, shape, mass, energyJ, megatons: energyJ / 4.184e15 };
}
