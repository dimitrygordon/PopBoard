// Per-slide sprite placement from Leo overlays.json (1920x1080 display coords).
// left/top = % of scene; w = cqw (% of width); h = cqh (% of height) when set.
// FINAL art: do not invent positions. Arrays preserve overlay order.

export const PLACEMENTS = {
  s01: {
    cover: { left: 61.458, top: 22.222, w: 18.75 },
    marble: { left: 79.167, top: 88.889, w: 2.5 },
    gear: { left: 87.5, top: 81.481, w: 6.25 },
    notes: "# Slide 1 - Cover reveal (1920×1080)",
  },
  s02: {
    walkers: [
      { left: 33.333, top: 59.259, h: 15.0 },
      { left: 68.75, top: 57.407, h: 15.0 },
    ],
    lantern_glow: { left: 77.083, top: 21.296, w: 1.875 },
    notes: "# Slide 2 (1920×1080)",
  },
  s03: {
    footprints: { left: 57.292, top: 57.407, w: 3.646 },
    notes: "# Slide 3 (1920×1080)",
  },
  s04: {
    journal_page: { left: 68.75, top: 50.0, w: 3.646 },
    notes: "# Slide 4 (1920×1080)",
  },
  s05: {
    marble: { left: 51.042, top: 29.63, w: 2.083 },
    notes: "# Slide 5 (1920×1080)",
  },
  s06: {
    heart: { left: 51.042, top: 85.185, w: 2.5 },
    standards: { left: 66.667, top: 83.333, w: 2.396 },
    puzzle: { left: 80.208, top: 82.407, w: 2.5 },
    notes: "# Slide 6 (1920×1080)",
  },
  s07: {
    blanks: [
      { left: 55.208, top: 40.556, w: 10.417, h: 0.926 },
      { left: 56.25, top: 49.259, w: 10.417, h: 0.926 },
    ],
    checks: [
      { left: 52.344, top: 39.352, w: 1.146 },
    ],
    notes: "# Slide 7 (1920×1080)",
  },
  s08: {
    cloud: { left: 67.708, top: 8.333, w: 8.333 },
    notes: "# Slide 8 (1920×1080)",
  },
  s09: {
    cards: [
      { left: 40.625, top: 35.185, w: 7.292 },
    ],
    notes: "# Slide 9 (1920×1080)",
  },
  s10: {
    breakeven_glow: { left: 58.333, top: 39.815, w: 2.5 },
    blocks: [
      { left: 80.208, top: 59.259, w: 3.125 },
    ],
    notes: "# Slide 10 (1920×1080)",
  },
  s11: {
    tips: [
      { left: 68.75, top: 72.222, w: 5.208 },
    ],
    red_pen: { left: 52.083, top: 77.778, w: 9.375, h: 3.333 },
    notes: "# Slide 11 (1920×1080)",
  },
  s12: {
    needle: { left: 55.99, top: 47.222, w: 2.188, origin: "50% 80%" },
    notes: "# Slide 12 (1920×1080)",
  },
  s13: {
    notes: "# Slide 13 (1920×1080)",
  },
  s14: {
    bubbles: [
      { left: 73.958, top: 27.778, w: 3.646 },
      { left: 78.646, top: 22.222, w: 3.125 },
    ],
    notes: "# Slide 14 (1920×1080)",
  },
  s15: {
    block: { left: 76.302, top: 56.019, w: 2.865 },
    notes: "# Slide 15 (1920×1080)",
  },
  s16: {
    magnifier: { left: 65.104, top: 46.296, w: 5.208 },
    stylus: { left: 81.25, top: 35.185, w: 1.875, h: 11.111 },
    notes: "# Slide 16 (1920×1080)",
  },
  s17: {
    glows: [
      { left: 48.438, top: 67.593, w: 1.875 },
      { left: 57.812, top: 54.63, w: 1.875 },
      { left: 67.188, top: 41.667, w: 1.875 },
      { left: 76.562, top: 30.556, w: 1.875 },
    ],
    notes: "# Slide 17 (1920×1080)",
  },
  s18: {
    page: { left: 69.792, top: 22.222, w: 8.854 },
    notes: "# Slide 18 (1920×1080)",
  },
  keyterms: {
    flip_card: { left: 78.125, top: 44.444, w: 4.688 },
    pushpin: { left: 80.469, top: 42.13, w: 1.875, h: 3.333 },
    notes: "# Key terms (1920×1080)",
  },
  discussion: {
    note_card: { left: 77.083, top: 19.444, w: 4.167 },
    pushpin: { left: 79.427, top: 17.593, w: 1.875, h: 3.333 },
    notes: "# Discussion (1920×1080)",
  },
};

export function applyPlace(el, place) {
  if (!place) return;
  el.style.left = place.left + "%";
  el.style.top = place.top + "%";
  if (place.w != null) el.style.width = place.w + "cqw";
  if (place.h != null) el.style.height = place.h + "cqh";
  if (place.origin) el.style.transformOrigin = place.origin;
}
