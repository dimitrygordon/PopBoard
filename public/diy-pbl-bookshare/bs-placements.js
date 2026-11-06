// Per-slide sprite placement + motion config. Easy to retune when Leo updates loop.md.
// Positions are % of the 16:9 scene (left/top of sprite). Sizes in cqw of the scene.
// Source notes: current loop.md in art/sNN/ as of Round-2 wiring. Leo may redraw helpers
// (s07 check/blank, s09 doc_card, s11 tip_card, s14 q_bubble); same filenames, edit here.

export const PLACEMENTS = {
  s01: {
    cover: { left: 58, top: 18, w: 22 },
    marble: { left: 52, top: 86, w: 3.2 },
    gear: { left: 88, top: 78, w: 5 },
    titleblock: { left: 4, top: 22, w: 48 },
    notes: "loop.md: cover drift+bob, marble LTR desk edge, gear spin. Left half clear.",
  },
  s02: {
    w1: { left: 38, top: 62, w: 3.2 },
    w2: { left: 62, top: 58, w: 3.2 },
    glow: { left: 78, top: 28, w: 4 },
    notes: "loop.md: walkers on each queue, lantern glow flicker themed side only.",
  },
  s03: {
    footprints: { left: 48, top: 70, w: 5 },
    notes: "loop.md: footprints step along path toward lightbulb.",
  },
  s04: {
    journal_page: { left: 62, top: 38, w: 10 },
    notes: "loop.md: page-flip over open journal.",
  },
  s05: {
    marble: { left: 52, top: 22, w: 3.5 },
    notes: "loop.md FINAL: fall off near top of loop (not stall). Path is keyframe translate.",
  },
  s06: {
    heart: { left: 48, top: 42, w: 7 },
    standards: { left: 62, top: 40, w: 6 },
    puzzle: { left: 76, top: 42, w: 6 },
    notes: "loop.md: light heart→standards→puzzle on pedestals.",
  },
  s07: {
    // checks fill bottom-up; blank rows shimmer mid-list. Leo may retune table coords.
    checks: [
      { left: 70, top: 68, w: 3.2 },
      { left: 70, top: 60, w: 3.2 },
      { left: 70, top: 52, w: 3.2 },
      { left: 70, top: 44, w: 3.2 },
      { left: 70, top: 36, w: 3.2 },
    ],
    blanks: [
      { left: 52, top: 48, w: 16 },
      { left: 52, top: 56, w: 16 },
    ],
    notes: "loop.md: checks bottom→up; two blank rows shimmer. Placement provisional for table list.",
  },
  s08: {
    cloud: { left: 42, top: 18, w: 12 },
    notes: "loop.md: cloud drifts LTR across amber sky.",
  },
  s09: {
    cards: [
      { left: 55, top: 40, w: 7 },
      { left: 64, top: 38, w: 7 },
      { left: 73, top: 40, w: 7 },
    ],
    notes: "loop.md: fan ±8°. Leo may redraw doc_card resting on table  -  edit cards[].",
  },
  s10: {
    glow: { left: 62, top: 48, w: 5 },
    blocks: [
      { left: 82, top: 70, w: 5 },
      { left: 82, top: 62, w: 5 },
      { left: 82, top: 54, w: 5 },
      { left: 82, top: 46, w: 5 },
      { left: 82, top: 38, w: 5 },
    ],
    birac: { left: 82, top: 34, w: 6 },
    eq: { left: 48, top: 78, w: 28 },
    notes: "loop.md FINAL: glow at cross; BIRAC letters in code; C=vx+F R=px.",
  },
  s11: {
    // tip cards currently stacked; Leo redraw may put them on the table  -  edit tips[].
    tips: [
      { left: 52, top: 70, w: 8 },
      { left: 60, top: 66, w: 8 },
      { left: 68, top: 62, w: 8 },
      { left: 76, top: 58, w: 8 },
      { left: 84, top: 54, w: 8 },
    ],
    pen: { left: 48, top: 78, w: 12 },
    notes: "loop.md: tip flip sequence; pen capped wobble. Placement provisional (table redo pending).",
  },
  s12: {
    needle: { left: 72, top: 42, w: 7, origin: "50% 80%" },
    notes: "loop.md: needle sway ±20° on gauge.",
  },
  s13: {
    barbell: { left: 60, top: 48, w: 16 },
    notes: "loop.md: huge barbell wobble, never lifts.",
  },
  s14: {
    bubbles: [
      { left: 55, top: 70, w: 6 },
      { left: 62, top: 72, w: 6 },
      { left: 70, top: 68, w: 6 },
      { left: 78, top: 74, w: 6 },
    ],
    notes: "loop.md: bubbles float into shared doc. Leo may redraw q_bubble  -  edit bubbles[].",
  },
  s15: {
    block: { left: 58, top: 32, w: 10 },
    notes: "loop.md FINAL: friction block slides down ramp, resets.",
  },
  s16: {
    magnifier: { left: 52, top: 40, w: 8 },
    stylus: { left: 78, top: 50, w: 2.5 },
    notes: "loop.md: magnifier ping-pong; stylus swaps in.",
  },
  s17: {
    glows: [
      { left: 48, top: 55, w: 5 },
      { left: 58, top: 48, w: 5 },
      { left: 68, top: 42, w: 5 },
      { left: 80, top: 38, w: 5 },
    ],
    notes: "loop.md: four lanterns light in teal/amber/coral/violet sequence.",
  },
  s18: {
    page: { left: 60, top: 28, w: 11 },
    notes: "loop.md: slow page turn in front of center book.",
  },
};

export function applyPlace(el, place) {
  if (!place) return;
  el.style.left = place.left + "%";
  el.style.top = place.top + "%";
  if (place.w != null) el.style.width = place.w + "cqw";
  if (place.origin) el.style.transformOrigin = place.origin;
}
