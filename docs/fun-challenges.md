# Fun layer: challenge numbers (TODO-TESLA)

Every number here is a placeholder. Tesla must check it before it ships.
Source: `public/projectile/projectile-fun.js` (`FUN` and `GOALS`).

## Projectile Motion

| Key | Value | Where it's used | Status |
|---|---|---|---|
| `bronzeHitsInARow` | 3 | Bronze: hit 3 targets in a row in Target mode (bullseye with points > 0, or a cart catch) | Cleared by Tesla 2026-10-29 |
| `silverMaxRangeAngleTol` | 1° | Silver: Launch mode, from the ground on Earth, with \|angle − 45°\| ≤ 1° | Cleared by Tesla 2026-10-29 |
| `silverMinRange` | 40 m | Silver: the range has to be at least 40 m (20 m/s at 45° gives about 40.79 m with g = 9.80665) | Cleared by Tesla 2026-10-29 |
| `goldMinPoints` | 8 | Gold: Sandbox with air drag and Target on, a bullseye hit worth at least 8 points (rings score 1, 2, 3, 5, 8, 10) | Cleared by Tesla 2026-10-29 |
| `predictLine` | 30 m | Predict-then-run (Launch mode): "Will it land past 30 m?" | Cleared by Tesla 2026-10-29 |

Copy to check: "Max range: about 45° from the ground". This holds only from level ground with no air drag.

## Beyond 3D (fourth-dimension)

Source: `public/fourth-dimension/fd-fun.js` (`FUN`, `GOALS`). All rows Cleared by Tesla 2026-10-29.

| Key | Value | Where it's used | Status |
|---|---|---|---|
| `bronzeHiddenFacing` | −0.2 | Bronze ("hide the gold face"), page `shadow-gold`: the gold face's outward normal · unit vector to the camera must be below −0.2 after the student drags (face turned away, about 102° or more). | Cleared by Tesla 2026-10-29 |
| `silverMaxCorners` | 8 | Silver ("make the tesseract look like one plain cube"), page `tesseract-ortho` (flat light = orthographic 4D→3D). Counts as done when the 16 projected corners collapse onto ≤ 8 distinct points. The page starts tilted (XW 0.6 rad, YW 0.45 rad) so the student has to find it. | Cleared by Tesla 2026-10-29 |
| `silverMergeFrac` | 0.02 of an edge | Two projected corners closer than 2% of the scaled edge length count as one point (`silverMergeTol(edge)`; the tesseract page draws edge 2 × 1.35 = 2.7, so 0.054 world units). | Cleared by Tesla 2026-10-29 |
| `goldUnfold` | 0.995 | Gold ("unfold the tesseract all the way"), pages `net-tesseract` / `net-tesseract-turn`: unfold fraction t ≥ 0.995 (90° hinge = 1). | Cleared by Tesla 2026-10-29 |

Ideas from the brief not wired as medals yet (the engine has one goal per tier; candidates for a later swap):
- "Rotate until the inner gold cube becomes the outer cube": the `tesseract-4d` readout already says when the gold cell's center has w > 0.7.
- "Find a slice of the tesseract that is a cube": the `slice4` readout says "a cube" when the slice has 8 corners and 12 edges.

Chapter stamps: one per chapter, earned on reaching the chapter's last page (`popboard.fun.fourth-dimension.stamps`). No numbers to check.
Share link (sandbox): `SHARE_SCHEMA` clamps knife position c to −1.8…1.8; shape and projection are enums.

## Shared layer constants (`public/shared/fun/`)
These are feel constants from Leo's spec, not physics, but they're listed here for completeness:
- press scale 0.97 over 100 ms
- spring damping 1.0, response 0.35 s
- deceleration 0.998
- sheet blur 20 px, saturate 180%
- theme ease 250 ms
- vibrate 10 ms
- tick 880 Hz, 80 ms, gain 0.06
- share-link clamps in `SHARE_SCHEMA`: angle 0–90°, speed 0–200 m/s, h 0–500 m, g 0.1–30 m/s², m 0.001–100 kg, d 0.001–2 m, Cd 0–2, ρ 0–100 kg/m³
