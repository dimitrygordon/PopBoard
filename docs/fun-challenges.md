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

## Plate Tectonics

Source: `public/plate-tectonics/pt-model.js` (`FUN`, `GOALS`, `T`). All rows TODO-TESLA.

| Key | Value | Where it's used | Status |
|---|---|---|---|
| Bronze | 1 quake | Bronze: trigger a quake on a transform fault (sideways motion, run time until the fault stress meter fills). | TODO-TESLA |
| `islandKm` | 0.5 km | Silver, "Make Iceland": two oceanic plates pulling apart, hotspot on, island top at least 0.5 km above sea level (island breaks the surface after `T.islandMyr` = 4 Myr, grows 0.5 km per Myr, cap 2.1 km). | TODO-TESLA |
| `himalayaKm` | 8 km | Gold, "Build the Himalaya": continent meets continent, mountains at least 8 km high (needs about 1,440 km of shortening). | TODO-TESLA |
| `T.quakeLoad` | 5 (cm/yr x Myr) | Sideways slip that fills the fault stress meter once (time-lapse; real faults load in tens to hundreds of years). | TODO-TESLA |
| `T.transformRatio` | 2 | Sideways rate at least twice the apart/together rate counts as a transform boundary. | TODO-TESLA |
| `T.stillRate` | 0.5 cm/yr | Below this the boundary reads "No motion". | TODO-TESLA |
| Predict | 4 choices | Predict, then run: "What will form?" (a ridge, a trench and volcano, mountains, earthquakes). Time runs at 1.5 Myr/s instead of 6 Myr/s while a guess is waiting, until the feature appears. A rift valley counts as "a ridge". | TODO-TESLA |
| Fossil match | 4 box units | Africa snaps home when within `FIT_TOLERANCE` of the fit; not a medal, saved as `popboard.fun.plate-tectonics.pangaea`. | TODO-TESLA |

Share link (sandbox): `SHARE_SCHEMA` keeps the crust types (enum), rates clamped to plus or minus 10 cm/yr, time to 0 to 60 Myr, and the hotspot flag.

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
