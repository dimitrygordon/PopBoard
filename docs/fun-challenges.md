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

## Gravity Well Golf

Source: `public/gravity-well-golf/gwg-physics.js` (`FUN`, `GOALS`, `P`). All rows TODO-TESLA.

| Key | Value | Where it's used | Status |
|---|---|---|---|
| Bronze | any sink | Bronze: sink a ball in any cup (course or sandbox). | TODO-TESLA |
| `silverParHoles` | 3 | Silver: par or better on 3 different course holes (saved across visits, `popboard.fun.gravity-well-golf.parHoles`). | TODO-TESLA |
| `goldMinHole` | 2 | Gold: a hole in one on course hole 2 or later (hole 1 has no masses, so it does not count). Every hole 1 to 9 has at least one hole-in-one line (tests check this). | TODO-TESLA |
| `cupR` | 0.36 units (ball radius 0.25) | Cup capture radius (game rule, not gravity). | TODO-TESLA |
| `cupMaxSpeed` | 2.6 units/s | Faster than this and the ball lips out (game rule). | TODO-TESLA |
| Pars | 1, 2, 2, 2, 2, 3, 3, 3, 4 | Par for holes 1 to 9 (`COURSE`). | TODO-TESLA |
| Predict | Yes / No | Predict, then run: "Will the next putt go in?"; slow motion (0.35x) within 1.4 units of the cup while a guess is waiting. | TODO-TESLA |

Share link (sandbox): `SHARE_SCHEMA` clamps tee and cup to the field; masses are packed as `k,x,y` (up to 12) and clamped.

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
