// Kepler's laws sandbox math (deck 1, pages 19 and 20). Units: AU and Earth years.
// Third law with P in years and a in AU: P^2 = a^3 (for anything orbiting the Sun).
export function periodYears(aAU) { return Math.pow(aAU, 1.5); }

// Solve Kepler's equation M = E - e sin E for the eccentric anomaly E (Newton's method).
export function eccentricAnomaly(M, e) {
  let E = e < 0.8 ? M : Math.PI;
  for (let i = 0; i < 30; i++) {
    const d = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    E -= d;
    if (Math.abs(d) < 1e-12) break;
  }
  return E;
}

// Position (AU) with the Sun at the origin (one focus); perihelion on the +x axis.
// t in years since perihelion.
export function position(aAU, e, t) {
  const P = periodYears(aAU);
  const M = 2 * Math.PI * (((t / P) % 1) + 1) % (2 * Math.PI);
  const E = eccentricAnomaly(M, e);
  const x = aAU * (Math.cos(E) - e);
  const y = aAU * Math.sqrt(1 - e * e) * Math.sin(E);
  return { x, y, r: Math.hypot(x, y) };
}

// Speed (km/s) from the vis-viva equation, v^2 = GM (2/r - 1/a).
export const GM_SUN = 1.32712440018e20; // m^3 s^-2
export const AU_M = 1.495978707e11;
export function speedKmS(aAU, rAU) { return Math.sqrt(GM_SUN * (2 / (rAU * AU_M) - 1 / (aAU * AU_M))) / 1000; }

export const PLANETS = [
  { name: "Mercury", a: 0.387, e: 0.206 },
  { name: "Venus", a: 0.723, e: 0.007 },
  { name: "Earth", a: 1.0, e: 0.017 },
  { name: "Mars", a: 1.524, e: 0.093 },
  { name: "Jupiter", a: 5.203, e: 0.048 },
  { name: "Saturn", a: 9.537, e: 0.054 },
  { name: "Uranus", a: 19.19, e: 0.047 },
  { name: "Neptune", a: 30.07, e: 0.009 }
];

export function fmtYears(P) {
  if (P < 1) return `${Math.round(P * 365.25)} days`;
  if (P < 10) return `${P.toFixed(2)} years`;
  return `${P.toFixed(1)} years`;
}
