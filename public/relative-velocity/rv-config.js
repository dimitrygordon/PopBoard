// Relative Velocity Exploration: every scene number lives here so Tesla can check them in one place.
// Units: SI (m, s, m/s) unless a key ends in Mph. 1D only: +x points right (downstream, forward).
// Exact conversion: 1 mph = 0.44704 m/s (1 mile = 1609.344 m, 1 h = 3600 s).

export const MPH_TO_MS = 0.44704;
export const G = 9.80665; // m/s^2, standard gravity (truck scene fall only)

export const CONFIG = {
  river: {
    // Toy motor boat speed relative to the water (its still-water speed).
    boatSpeed: 0.50,          // m/s
    // Known flow rate of the channel water when the valve is on (beads move at this speed).
    flowRate: 0.20,           // m/s
    flowRateMax: 0.40,        // m/s, top of the valve dial after the lab (free run)
    flowRateStep: 0.01,       // m/s, valve dial detent in free run
    // Channel length on the 0 to 5 m ruler.
    lengthDefault: 2.0,       // m
    lengthMin: 1.0,           // m
    lengthMax: 5.0,           // m
    lengthStep: 0.5,          // m
    beadCount: 4,
    trialsPerCondition: 3,    // suggested timed trials per condition (still, downstream, upstream)
    timeScale: 1,             // real time: students time it with the stopwatch
  },
  truck: {
    truckSpeedMph: 25,        // default truck speed relative to the ground
    throwSpeedMph: 25,        // default ball speed relative to the truck
    speedMinMph: 0,
    speedMaxMph: 40,
    speedStepMph: 1,
    throwDir: -1,             // -1 backward, +1 forward, 0 just let go
    releaseHeight: 1.5,       // m above the road (truck bed plus arm)
    timeScale: 0.25,          // slow motion so the fall is visible
    viewWidth: 24,            // m of road across the stage
  },
  walkway: {
    beltSpeed: 0.65,          // m/s, belt relative to the floor
    walkSpeed: 1.40,          // m/s, walker relative to the belt
    speedMin: 0,
    speedMax: 2.0,
    speedStep: 0.05,
    walkDir: 1,               // +1 with the belt, -1 against it, 0 stand still
    beltLength: 30,           // m
    timeScale: 1,
    viewWidth: 14,            // m across the stage
  },
  kart: {
    kartSpeedMph: 40,         // kart relative to the boost lane surface
    boostSpeedMph: 20,        // boost lane surface relative to the track when the boost is on
    rivalSpeedMph: 50,        // rival kart relative to the track (normal lane)
    speedMinMph: 0,
    speedMaxMph: 80,
    speedStepMph: 1,
    boostOn: true,
    trackLength: 200,         // m, one lap shown as a looping straight
    timeScale: 0.25,
    viewWidth: 60,            // m across the stage
  },
};

export const FRAMES = {
  river: ["shore", "leaf", "boat"],
  truck: ["ground", "truck", "ball"],
  walkway: ["floor", "belt", "walker"],
  kart: ["track", "rival", "kart"],
};

// Arrow colors (Leo's spec). The sum arrow is ink on cream paper and cream on charcoal.
export const ARROW = {
  object: "#6FA3E0",
  medium: "#E0A030",
  sumLight: "#1F1D1A",
  sumDark: "#F2EAD8",
};
