// Radiation dose sandbox math (deck 24.5). Rates from the deck's own numbers, which match
// Curiosity RAD measurements: about 1.8 mSv/day in deep space (330 mSv per 6-month leg),
// about 0.64 mSv/day on the Martian surface (320 mSv in 500 days), and 2.4 mSv/yr on Earth.
export const RATE = { transit: 330 / 180, surface: 320 / 500, earth: 2.4 / 365.25 };
// Simplified: a few meters of rock (a lava tube) is taken to block about 90% of the surface dose.
export const UNDERGROUND_FACTOR = 0.1;
export const WORKER_LIMIT = 20; // mSv per year

export function missionDose({ transitDays = 360, surfaceDays = 500, undergroundShare = 0 } = {}) {
  const transit = transitDays * RATE.transit;
  const surface = surfaceDays * RATE.surface * ((1 - undergroundShare) + undergroundShare * UNDERGROUND_FACTOR);
  const total = transit + surface;
  return { transit, surface, total, earthYears: total / 2.4 };
}
