// U.S. Standard Atmosphere 1976 density (B1). Table: data/ussa76-density-5km.json, 0 to 1000 km in 5 km steps,
// from Table 1 of the 1976 tables as printed at pdas.com (NASA TM X-74335). U.S. Government work.
// Log-linear interpolation between rows. Above the last row, and below 0 km, density clamps (0 above 1000 km).

/** table: [[z_km, rho_kg_m3], ...] ascending in z. Returns rho(altitudeMetres). */
export function makeDensity(table) {
  const n = table.length, lg = table.map((r) => Math.log(r[1]));
  return function rho(altM) {
    const z = altM / 1e3;
    if (!(z > 0)) return table[0][1];
    if (z >= table[n - 1][0]) return 0;
    const i = Math.min(n - 2, Math.floor((z - table[0][0]) / (table[1][0] - table[0][0])));
    const z0 = table[i][0], z1 = table[i + 1][0], f = (z - z0) / (z1 - z0);
    return Math.exp(lg[i] + f * (lg[i + 1] - lg[i]));
  };
}
export async function loadDensity(url) {
  const j = await (await fetch(url)).json();
  return makeDensity(j.table);
}
/** m / (Cd A): drag acceleration is 0.5 rho v |v| / beta. */
export function ballistic({ diameterM, cd, massKg }) { return massKg / (cd * Math.PI * (diameterM / 2) ** 2); }
