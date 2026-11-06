// Slide transitions for DIY PBL Bookshare.
// Plain short crossfade between slides. Reduced motion: plain fade.
// Motif FLIP / Magic Move removed (Leo polish). Script panel: quiet fade only.

export const THEME_BAND = {
  1: "cream", 2: "cream",
  // Idea 1 (+ r6a/r6b)
  3: "teal", 4: "teal", 5: "teal", 6: "teal", 7: "teal",
  // Idea 2 (+ r6c)
  8: "amber", 9: "amber", 10: "amber", 11: "amber",
  // Idea 3 (+ r6h/r6i)
  12: "coral", 13: "coral", 14: "coral", 15: "coral", 16: "coral", 17: "coral",
  // Idea 4 (+ r6d/e/f)
  18: "violet", 19: "violet", 20: "violet", 21: "violet", 22: "violet", 23: "violet",
  // critique + r6j + closing
  24: "cream", 25: "cream", 26: "cream", 27: "cream", 28: "cream", 29: "cream", 30: "cream",
};

/** Adjacent handoff table kept as empty markers for tests/theme; no motif flight. */
export const HANDOFFS = Object.fromEntries(
  Array.from({ length: 29 }, (_, i) => [`${i + 1}-${i + 2}`, { primary: null, mode: "crossfade" }])
);

export function handoffKey(from1, to1) {
  return `${from1}-${to1}`;
}

export function captureMagic() { return {}; }
export function resolvePrimary() { return null; }
export function clearFlipClones() {
  document.querySelectorAll(".bs-flip-clone, .bs-bg-xfade").forEach((n) => n.remove());
}
export async function runFlip() { /* removed */ }

export async function fadeScript(side, ms = 180) {
  if (!side) return;
  side.style.transition = `opacity ${ms}ms ease`;
  side.style.opacity = "0";
  await new Promise((r) => setTimeout(r, ms));
}

export async function restoreScript(side, ms = 180) {
  if (!side) return;
  side.style.transition = `opacity ${ms}ms ease`;
  side.style.opacity = "1";
  await new Promise((r) => setTimeout(r, ms));
}
