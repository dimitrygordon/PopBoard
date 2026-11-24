// Newton's Cannonball Fire: numbers Tesla can check in one place.
// Earth GM and radius MUST match public/orbit-lab/assets/orbits.json (Tesla-verified).
// Do not invent replacements. Unit tests compare these to that file.

export const GM_E = 398000000000000.0; // m^3 s^-2, Orbit Lab orbits.json constants.GM_E
export const R_E = 6380000.0;          // m, Orbit Lab orbits.json constants.R_E

// Textbook G used in the m07-l02 Moon-cannon Study Question work step.
// Tesla-verified (PR #190): G, Moon mass and radius, and the 75 km height.
export const G = 6.67e-11;             // N m^2 kg^-2
export const M_MOON = 7.35e22;         // kg, m07-l02 SQ "16"
export const R_MOON = 1.74e6;          // m, m07-l02 SQ "16"
export const H_MOON = 7.5e4;           // m, 75 km above the lunar surface

// Teaching mountain. Lesson 7.2 says the thought experiment ignores air, and the
// mountain would need to be more than 150 km tall to sit above most of the atmosphere.
// The drawn mountain is not to scale.
export const H_DEFAULT = 150000;       // m
export const H_MIN = 8000;             // m, Everest-scale floor (Orbit Lab's schematic height)
export const H_MAX = 1000000;          // m
export const H_STEP = 10000;           // m
export const ISS_ALTITUDE = 400000;    // m

// Slider is 0 through past escape at the surface.
export const V_MAX = 16000;            // m/s
export const V_STEP = 10;              // m/s

// A made-up planet for the v = sqrt(r g) practice item. Tesla-verified (PR #190).
export const PLANET_X = { r: 2.5e6, g: 4.0 };

// Sketch colors: blue and green fall back, red circular, yellow wider ellipse, plus escape.
export const PRESETS = [
  { id: "blue",   label: "Blue",   frac: 0.35, kind: "frac", color: "#5B9AE8" },
  { id: "green",  label: "Green",  frac: 0.72, kind: "frac", color: "#3FA86A" },
  { id: "red",    label: "Red",    frac: 1.00, kind: "frac", color: "#E23B3B" },
  { id: "yellow", label: "Yellow", frac: 1.12, kind: "frac", color: "#E0B43A" },
  { id: "escape", label: "Escape", frac: 1.05, kind: "esc",  color: "#EDE6D6" },
];

export const TRAIL = {
  width: 2.4,
  fade: 1,
};

export const VISUAL = {
  // Drawn mountain height as a fraction of the Earth radius. Physics uses H_*; this is only art.
  mountainFrac: 0.11,
  earthFrac: 0.62, // Earth radius as a fraction of the half-min canvas side
  chalk: "#F3EFE4",
  earthFill: "#0B0B0B",
  space: "#000000",
};

export const MOTION = {
  orbitDuration: 5.5, // seconds for one full bound lap, visual only
  lobDuration: 3.2,
  escapeDuration: 3.6,
};
