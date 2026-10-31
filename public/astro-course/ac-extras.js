// Per-deck extras for the storybooks: where the sandboxes sit, which pages link out to a study
// module ("Try it" cards), and tap-to-answer choices that are not lettered A) to D).
// Page numbers are 1-based slide numbers in the deck.
export const MODULES = {
  "powers-of-ten": { file: "study-powers-of-ten.html", name: "Powers of Ten", blurb: "Zoom from a proton to the cosmic web, one power of ten at a time." },
  "em-spectrum": { file: "study-em-spectrum.html", name: "EM Spectrum", blurb: "Slide along the spectrum from radio to gamma rays." },
  "spectra": { file: "study-spectra.html", name: "Spectra", blurb: "Match emission and absorption lines to their elements." },
  "kepler": { file: "study-kepler.html", name: "Kepler's Laws", blurb: "Sweep equal areas and test P\u00b2 = a\u00b3 on real planets." },
  "seasons-eclipses": { file: "study-seasons-eclipses.html", name: "Seasons & Eclipses", blurb: "Tilt Earth and watch the seasons follow the tilt, not the distance." },
  "moon": { file: "study-moon.html", name: "Moon", blurb: "Phases, orbit, and why we always see the same face." },
  "eclipses": { file: "study-eclipses.html", name: "Eclipses", blurb: "Line up the Sun, Earth, and Moon and watch shadows fall." },
  "tides": { file: "study-tides.html", name: "Tides", blurb: "Pull the oceans with the Moon and Sun: spring and neap tides." },
  "orbits": { file: "study-orbits.html", name: "Orbits", blurb: "Launch a body and watch gravity bend its path into an orbit." },
  "gravity-well-golf": { file: "study-gravity-well-golf.html", name: "Gravity Well Golf", blurb: "Curve a shot around planets using their gravity." },
  "climate": { file: "study-climate.html", name: "Climate", blurb: "Tune the greenhouse and watch the temperature respond." },
  "plate-tectonics": { file: "study-plate-tectonics.html", name: "Plate Tectonics", blurb: "Push plates together and apart and see what the crust does." },
  "stars": { file: "study-stars.html", name: "Stars", blurb: "Follow a star's life from cloud to final remnant." },
  "luminosity": { file: "study-luminosity.html", name: "Luminosity", blurb: "Size and temperature together set how bright a star shines." },
  "hrdiagram": { file: "study-hrdiagram.html", name: "H-R Diagram", blurb: "Plot stars by temperature and brightness and spot the patterns." },
  "black-hole": { file: "study-black-hole.html", name: "Black Hole", blurb: "Get close to an event horizon and watch light bend." },
  "exoplanets": { file: "study-exoplanets.html", name: "Exoplanets", blurb: "Find planets by the dips and wobbles they cause in starlight." },
  "rocket-mission": { file: "study-rocket-mission.html", name: "Rocket Mission", blurb: "Plan a launch: thrust, fuel, and staging." },
  "optics": { file: "study-optics.html", name: "Optics", blurb: "Bend light with lenses and mirrors, like a telescope." },
  "atom-builder": { file: "study-atom-builder.html", name: "Atom Builder", blurb: "Build atoms from protons, neutrons, and electrons." },
  "relativity": { file: "study-relativity.html", name: "Relativity", blurb: "Speed up and watch clocks and lengths change." },
  "quantum": { file: "study-quantum.html", name: "Quantum", blurb: "Light and matter in packets: photons and energy levels." }
};

export const EXTRAS = {
  d01: {
    sandboxes: { 19: "kepler", 20: "kepler" },
    tryIt: { 8: "powers-of-ten", 12: "em-spectrum", 13: "spectra", 19: "kepler", 21: "seasons-eclipses" },
    choices: { 2: { options: ["across the room?", "across town?", "across the country?"], answer: "across the country?" } }
  },
  d02: { tryIt: { 8: "seasons-eclipses", 15: "seasons-eclipses", 20: "moon", 22: "eclipses", 25: "tides", 26: "tides" } },
  d03: { tryIt: { 13: "kepler", 15: "kepler", 21: "orbits", 22: "tides" } },
  d04: { sandboxes: { 14: "kepler", 22: "kepler" }, tryIt: { 12: "gravity-well-golf", 22: "orbits" } },
  d05: { tryIt: { 19: "climate", 25: "plate-tectonics" } },
  d06: { sandboxes: { 18: "resonance" }, tryIt: { 14: "tides", 17: "tides", 24: "orbits" } },
  d07: { sandboxes: { 20: "pluto", 25: "crater", 27: "crater", 28: "crater", 29: "crater", 30: "crater" }, tryIt: { 16: "orbits" } },
  d08: { tryIt: { 9: "plate-tectonics", 15: "climate", 22: "exoplanets" } },
  d09: { tryIt: { 15: "plate-tectonics", 16: "plate-tectonics", 23: "plate-tectonics" } },
  d10: { tryIt: { 7: "plate-tectonics" } },
  d11: { tryIt: { 12: "climate", 15: "climate" } },
  d12: { tryIt: { 10: "seasons-eclipses", 12: "seasons-eclipses", 19: "climate" } },
  d13: { tryIt: { 4: "climate", 6: "climate" } },
  d13b: { tryIt: { 10: "climate", 12: "climate" } },
  d14: { tryIt: { 7: "stars", 8: "atom-builder", 15: "em-spectrum" } },
  d15: { tryIt: { 3: "em-spectrum", 5: "spectra", 7: "spectra", 10: "optics", 16: "luminosity", 20: "hrdiagram", 21: "hrdiagram" } },
  d16: { tryIt: { 7: "stars", 13: "stars" } },
  d17: { tryIt: { 3: "stars", 6: "stars", 19: "black-hole", 21: "black-hole" } },
  "d17-5": { tryIt: { 17: "orbits", 18: "kepler" } },
  d18: { tryIt: { 9: "black-hole", 10: "black-hole" } },
  d19: { tryIt: { 4: "spectra", 9: "powers-of-ten", 14: "em-spectrum" } },
  d20: { tryIt: { 4: "exoplanets", 5: "exoplanets", 12: "exoplanets" } },
  d21: { tryIt: { 8: "relativity", 19: "black-hole" } },
  d22: { tryIt: { 4: "quantum", 7: "relativity" } },
  d23: { tryIt: { 16: "stars", 18: "tides" } },
  d24: { tryIt: { 4: "relativity", 6: "rocket-mission", 11: "relativity" } },
  "d24-5": { sandboxes: { 5: "dose" }, tryIt: { 11: "orbits", 14: "rocket-mission" } }
};
