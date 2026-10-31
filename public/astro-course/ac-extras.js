// Per-deck extras for the storybooks: where the sandboxes sit, which pages link out to a study
// module ("Try it" cards), and tap-to-answer choices that are not lettered A) to D).
// Page numbers are 1-based slide numbers in the deck.
export const MODULES = {
  "powers-of-ten": { file: "study-powers-of-ten.html", name: "Powers of Ten", blurb: "Zoom from a proton to the cosmic web, one power of ten at a time." },
  "em-spectrum": { file: "study-em-spectrum.html", name: "EM Spectrum", blurb: "Slide along the spectrum from radio to gamma rays." },
  "spectra": { file: "study-spectra.html", name: "Spectra", blurb: "Match emission and absorption lines to their elements." },
  "kepler": { file: "study-kepler.html", name: "Kepler's Laws", blurb: "Sweep equal areas and test P\u00b2 = a\u00b3 on real planets." },
  "seasons-eclipses": { file: "study-seasons-eclipses.html", name: "Seasons & Eclipses", blurb: "Tilt Earth and watch the seasons follow the tilt, not the distance." }
};

export const EXTRAS = {
  d01: {
    sandboxes: { 19: "kepler", 20: "kepler" },
    tryIt: { 8: "powers-of-ten", 12: "em-spectrum", 13: "spectra", 19: "kepler", 21: "seasons-eclipses" },
    choices: { 2: { options: ["across the room?", "across town?", "across the country?"], answer: "across the country?" } },
    sandboxName: "Kepler orbit sandbox"
  }
};
