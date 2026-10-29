// Plate Tectonics: pure model (no DOM). A schematic cross-section of two plates meeting at one
// boundary. The left plate stays put; the student drags the right plate. Numbers are Cleared by Tesla 2026-10-29,
// see docs/plate-tectonics-science.md.

export const MODULE_ID = "plate-tectonics";
export const RIDGE_CAPTION = "Magma rises here.";
export const MANTLE_INFO = "The mantle is solid rock that flows slowly, not a sea of magma. Melting happens only in small zones, like under ridges and above sinking plates.";
export const MANTLE_LABEL = "Mantle: solid rock that flows slowly, a few centimeters a year.";
export const SCALE_LABEL = "Not to scale: heights are stretched so you can see them.";

export const MAX_RATE = 10;          // cm per year, fastest drag
export const MAX_TIME = 60;          // million years on the time scrubber
export const KM_PER_CMYR_MYR = 10;   // 1 cm/yr for 1 Myr = 10 km
export const T = {
  stillRate: 0.5,        // below this (cm/yr) the plates count as not moving
  transformRatio: 2,     // sideways at least 2x the apart/together rate = transform
  riftToOceanKm: 300,    // a continental rift opens into a new ocean after this much stretching
  volcanoSlabKm: 200,    // subducted slab length before the first volcano (slab reaches about 100 km down)
  mountainMaxKm: 8.8,    // cap on mountain height
  mountainScaleKm: 600,  // shortening scale for mountain growth
  islandMyr: 4,          // hotspot island breaks the surface after this long
  islandMaxKm: 2.1,      // hotspot island top above sea level
  quakeLoad: 5           // cm/yr x Myr of sideways slip that loads the fault to one quake (time-lapse)
};

export const BOUNDARY = {
  none: { name: "No motion", blurb: "Drag the right plate to move it." },
  divergent: { name: "Divergent", blurb: "The plates pull apart." },
  convergent: { name: "Convergent", blurb: "The plates push together." },
  transform: { name: "Transform", blurb: "The plates slide past each other." }
};
export const CRUST = { oceanic: "Oceanic crust", continental: "Continental crust" };

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

// vx > 0: the right plate moves away (apart). vy: sideways, out of the cross-section.
export function classify(vx, vy) {
  if (Math.hypot(vx, vy) < T.stillRate) return "none";
  if (Math.abs(vy) >= T.transformRatio * Math.abs(vx)) return "transform";
  return vx > 0 ? "divergent" : "convergent";
}

export const mountainHeight = (shorteningKm) => T.mountainMaxKm * (1 - Math.exp(-Math.max(0, shorteningKm) / T.mountainScaleKm));

// What the boundary looks like after t million years at a steady rate.
export function outcome({ left = "oceanic", right = "oceanic", vx = 0, vy = 0, t = 0, hotspot = false } = {}) {
  const type = classify(vx, vy), tt = clamp(t, 0, MAX_TIME);
  const out = { type, feature: "none", openKm: 0, shortenKm: 0, slipKm: 0, mountainKm: 0, volcano: false, subducting: null, islandKm: 0, newOcean: false };
  if (type === "none") return out;
  out.slipKm = Math.abs(vy) * tt * KM_PER_CMYR_MYR;
  if (type === "transform") { out.feature = "quakes"; return out; }
  if (type === "divergent") {
    out.openKm = vx * tt * KM_PER_CMYR_MYR;
    const continental = left === "continental" || right === "continental";
    out.newOcean = !continental || out.openKm >= T.riftToOceanKm;
    out.feature = out.openKm <= 0 ? "none" : out.newOcean ? "ridge" : "rift";
    if (hotspot && out.feature === "ridge" && tt > T.islandMyr) out.islandKm = Math.min(T.islandMaxKm, 0.5 * (tt - T.islandMyr));
    return out;
  }
  out.shortenKm = -vx * tt * KM_PER_CMYR_MYR;
  if (out.shortenKm <= 0) return out;
  if (left === "continental" && right === "continental") { out.feature = "mountains"; out.mountainKm = mountainHeight(out.shortenKm); return out; }
  // Denser oceanic rock sinks under continental crust. Ocean meets ocean: one plate sinks (the model does not
  // track plate age, so it draws the right plate's edge diving under; in reality the older, colder, denser plate sinks).
  out.subducting = left === "oceanic" && right === "continental" ? "left" : "right";
  out.feature = "subduction";
  out.volcano = out.shortenKm >= T.volcanoSlabKm;
  return out;
}

// Transform faults stick, load up, then slip all at once. Time-lapse: one quake per T.quakeLoad of slip.
export function stepFault(fault, vy, dMyr) {
  const f = { stress: fault.stress || 0, quakes: fault.quakes || 0 };
  if (dMyr <= 0) return { ...f, quake: false };
  f.stress += Math.abs(vy) * dMyr / T.quakeLoad;
  let quake = false;
  if (f.stress >= 1) { f.stress %= 1; f.quakes++; quake = true; }
  return { ...f, quake };
}

// ---------- predict, then run ----------
export const PREDICT = [
  { id: "ridge", label: "A ridge" }, { id: "subduction", label: "A trench and volcano" },
  { id: "mountains", label: "Mountains" }, { id: "quakes", label: "Earthquakes" }
];
export const judgePrediction = (guess, feature) => guess === (feature === "rift" ? "ridge" : feature);

// ---------- challenges (Cleared by Tesla 2026-10-29 thresholds) ----------
export const FUN = { himalayaKm: 8, islandKm: 0.5 };
export const isIceland = (s, o) => s.left === "oceanic" && s.right === "oceanic" && s.hotspot && o.feature === "ridge" && o.islandKm >= FUN.islandKm;
export const GOALS = [
  { tier: "bronze", title: "Trigger a quake on a transform fault", check: (e) => e.type === "quake" },
  { tier: "silver", title: "Make Iceland: a hotspot island on a mid-ocean ridge", check: (e) => e.type === "state" && e.iceland },
  { tier: "gold", title: `Build the Himalaya: mountains ${FUN.himalayaKm} km high`, check: (e) => e.type === "state" && e.mountainKm >= FUN.himalayaKm }
];

// ---------- fossil match (Pangaea reassembly) ----------
// Pieces are cut from one supercontinent outline along a jagged seam, so they fit exactly at offset (0, 0).
// Coordinates are in a 100 x 100 box. Fossil bands cross the seam and only line up when the pieces fit.
export const FOSSILS = [
  { id: "mesosaurus", name: "Mesosaurus", note: "a small freshwater reptile", y0: 30, y1: 40 },
  { id: "glossopteris", name: "Glossopteris", note: "a seed fern", y0: 55, y1: 66 },
  { id: "cynognathus", name: "Cynognathus", note: "a land reptile", y0: 78, y1: 86 }
];
export const SEAM = [[52, 4], [57, 14], [54, 24], [60, 34], [56, 46], [62, 58], [58, 70], [63, 82], [57, 96]];
export const PIECES = {
  west: { name: "South America", outline: [[10, 8], [30, 2], ...SEAM, [40, 98], [22, 88], [14, 64], [6, 36]] },
  east: { name: "Africa", outline: [[72, 2], [90, 20], [96, 50], [92, 80], [76, 98], ...SEAM.slice().reverse()] }
};
export const FIT_TOLERANCE = 4; // box units
export const fossilFit = (dx, dy) => Math.hypot(dx, dy) <= FIT_TOLERANCE;

// ---------- sandbox share link ----------
export const SHARE_SCHEMA = {
  left: { type: "enum", values: ["oceanic", "continental"] }, right: { type: "enum", values: ["oceanic", "continental"] },
  vx: { type: "num", min: -MAX_RATE, max: MAX_RATE }, vy: { type: "num", min: -MAX_RATE, max: MAX_RATE },
  t: { type: "num", min: 0, max: MAX_TIME }, hotspot: { type: "bool" }
};

// Guided scenes: each sets the crust types; the student still does the dragging.
export const SCENES = [
  { id: "iceland", name: "Make Iceland", left: "oceanic", right: "oceanic", hotspot: true, hint: "Pull the plates apart, then run time." },
  { id: "himalaya", name: "Build the Himalaya", left: "continental", right: "continental", hotspot: false, hint: "Push India (south) north into Asia. On screen, drag the right plate left, then run time." },
  { id: "sanandreas", name: "Quake on a transform fault", left: "continental", right: "continental", hotspot: false, hint: "Drag the right plate sideways (up or down), then run time." }
];
