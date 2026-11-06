// Slide transitions for DIY PBL Bookshare.
// Plain short crossfade between slides. Reduced motion: plain fade.
// Motif FLIP / Magic Move removed (Leo polish). Script panel: quiet fade only.

export const THEME_BAND = {
  1: "cream", 2: "cream",
  3: "teal", 4: "teal", 5: "teal",
  6: "amber", 7: "amber", 8: "amber",
  9: "coral", 10: "coral", 11: "coral", 12: "coral",
  13: "violet", 14: "violet", 15: "violet",
  16: "cream", 17: "cream", 18: "cream", 19: "cream", 20: "cream", 21: "cream",
};

/** Adjacent handoff table kept as empty markers for tests/theme; no motif flight. */
export const HANDOFFS = Object.fromEntries(
  Array.from({ length: 20 }, (_, i) => [`${i + 1}-${i + 2}`, { primary: null, mode: "crossfade" }])
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
