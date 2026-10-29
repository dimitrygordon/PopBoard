// Beyond 3D: challenge goals, chapter stamps and share schema. Pure (Node-testable).
export const MODULE_ID = "fourth-dimension";
// Cleared by Tesla 2026-10-29 (see docs/fun-challenges.md).
export const FUN = {
  bronzeHiddenFacing: -0.2,   // gold face normal . (direction to camera) must be below this (face turned away)
  silverMaxCorners: 8,        // flat (orthographic) light: 16 tesseract corners collapse onto <= 8 visible points
  silverMergeFrac: 0.02,      // two projected corners closer than 2% of one (scaled) edge count as one
  goldUnfold: 0.995           // tesseract net unfold fraction counted as "fully unfolded"
};
// Merge tolerance in world units for a shape drawn with edge length `edge` (tesseract edge = 2 * display scale).
export const silverMergeTol = (edge) => FUN.silverMergeFrac * edge;
export const GOALS = [
  { tier: "bronze", title: "Spin the cube until the gold face is hidden from you",
    check: (e) => e.type === "goldface" && e.user && e.facing < FUN.bronzeHiddenFacing },
  { tier: "silver", title: "In flat light, make the tesseract look like one plain cube",
    check: (e) => e.type === "tesseract" && e.user && e.proj === "ortho" && e.distinct <= FUN.silverMaxCorners },
  { tier: "gold", title: "Unfold the tesseract all the way into its 3D cross",
    check: (e) => e.type === "unfold" && e.n === 4 && e.t >= FUN.goldUnfold }
];
export const SHARE_SCHEMA = {
  shape: { type: "enum", values: ["cube", "tesseract", "16-cell", "24-cell"] },
  proj: { type: "enum", values: ["perspective", "ortho"] },
  knife: { type: "bool" },
  c: { type: "num", min: -1.8, max: 1.8 }
};
export const STAMP_KEY = "popboard.fun.fourth-dimension.stamps";
function store() { try { return globalThis.localStorage || null; } catch (e) { return null; } }
export function loadStamps(s = store()) {
  try { const v = JSON.parse(s?.getItem(STAMP_KEY) || "[]"); return Array.isArray(v) ? v.filter((n) => Number.isInteger(n)) : []; } catch (e) { return []; }
}
// A chapter's stamp is earned on reaching its last page. Returns true if new.
export function earnStamp(chapter, s = store()) {
  const list = new Set(loadStamps(s)); if (list.has(chapter)) return false;
  list.add(chapter); try { s?.setItem(STAMP_KEY, JSON.stringify([...list].sort((a, b) => a - b))); } catch (e) {}
  return true;
}
export function lastPageOfChapter(pages, chapter) { let idx = -1; pages.forEach((p, i) => { if (p.chapter === chapter) idx = i; }); return idx; }
