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

Source: `public/plate-tectonics/pt-model.js` (`FUN`, `GOALS`, `T`). All rows Cleared by Tesla 2026-10-29.

| Key | Value | Where it's used | Status |
|---|---|---|---|
| Bronze | 1 quake | Bronze: trigger a quake on a transform fault (sideways motion, run time until the fault stress meter fills). | Cleared by Tesla 2026-10-29 |
| `islandKm` | 0.5 km | Silver, "Make Iceland": two oceanic plates pulling apart, hotspot on, island top at least 0.5 km above sea level (island breaks the surface after `T.islandMyr` = 4 Myr, grows 0.5 km per Myr, cap 2.1 km). | Cleared by Tesla 2026-10-29 |
| `himalayaKm` | 8 km | Gold, "Build the Himalaya": continent meets continent, mountains at least 8 km high (needs about 1,440 km of shortening). | Cleared by Tesla 2026-10-29 |
| `T.quakeLoad` | 5 (cm/yr x Myr) | Sideways slip that fills the fault stress meter once (time-lapse; real faults load in tens to hundreds of years). | Cleared by Tesla 2026-10-29 |
| `T.transformRatio` | 2 | Sideways rate at least twice the apart/together rate counts as a transform boundary. | Cleared by Tesla 2026-10-29 |
| `T.stillRate` | 0.5 cm/yr | Below this the boundary reads "No motion". | Cleared by Tesla 2026-10-29 |
| Predict | 4 choices | Predict, then run: "What will form?" (a ridge, a trench and volcano, mountains, earthquakes). Time runs at 1.5 Myr/s instead of 6 Myr/s while a guess is waiting, until the feature appears. A rift valley counts as "a ridge". | Cleared by Tesla 2026-10-29 |
| Fossil match | 4 box units | Africa snaps home when within `FIT_TOLERANCE` of the fit; not a medal, saved as `popboard.fun.plate-tectonics.pangaea`. | Cleared by Tesla 2026-10-29 |

Share link (sandbox): `SHARE_SCHEMA` keeps the crust types (enum), rates clamped to plus or minus 10 cm/yr, time to 0 to 60 Myr, and the hotspot flag.

## Gravity Well Golf

Source: `public/gravity-well-golf/gwg-physics.js` (`FUN`, `GOALS`, `P`). All rows Cleared by Tesla 2026-10-29.

| Key | Value | Where it's used | Status |
|---|---|---|---|
| Bronze | any sink | Bronze: sink a ball in any cup (course or sandbox). | Cleared by Tesla 2026-10-29 |
| `silverParHoles` | 3 | Silver: par or better on 3 different course holes (saved across visits, `popboard.fun.gravity-well-golf.parHoles`). | Cleared by Tesla 2026-10-29 |
| `goldMinHole` | 2 | Gold: a hole in one on course hole 2 or later (hole 1 has no masses, so it does not count). Every hole 1 to 9 has at least one hole-in-one line (tests check this). | Cleared by Tesla 2026-10-29 |
| `cupR` | 0.36 units (ball radius 0.25) | Cup capture radius (game rule, not gravity). | Cleared by Tesla 2026-10-29 |
| `cupMaxSpeed` | 2.6 units/s | Faster than this and the ball lips out (game rule). | Cleared by Tesla 2026-10-29 |
| Pars | 1, 2, 2, 2, 2, 3, 3, 3, 4 | Par for holes 1 to 9 (`COURSE`). | Cleared by Tesla 2026-10-29 |
| Predict | Yes / No | Predict, then run: "Will the next putt go in?"; slow motion (0.35x) within 1.4 units of the cup while a guess is waiting. | Cleared by Tesla 2026-10-29 |

Share link (sandbox): `SHARE_SCHEMA` clamps tee and cup to the field; masses are packed as `k,x,y` (up to 12) and clamped.

## Powers of Ten

Source: `public/powers-of-ten/p10-logic.js` (`FUN`, `GOALS`). All rows cleared by Tesla 2026-10-29.

| Key | Value | Where it's used | Status |
|---|---|---|---|
| `huntTol` | 0.5 powers | Size Hunt: the target counts as found when the view comes to rest within 0.5 of a power of the plate's focus (log10(size / 0.6)). | Cleared by Tesla 2026-10-29 |
| `bronzeHuntFinds` | 3 | Bronze: find 3 objects in Size Hunt (one session). | Cleared by Tesla 2026-10-29 |
| `silverStreak` | 3 | Silver: 3 correct "how many powers of ten" predictions in a row. | Cleared by Tesla 2026-10-29 |
| `goldPowers` | 44 | Gold: stamp every whole power from 10⁻¹⁶ m to 10²⁷ m (spec: "visit all 40+ powers"). A power is stamped when the view passes through it. | Cleared by Tesla 2026-10-29 |

Stamps: `popboard.fun.powers-of-ten.stamps`. Share link (sandbox): `SHARE_SCHEMA` clamps z to −16…27; objects are enums.

## Ripple Tank

All thresholds Cleared by Tesla 2026-10-29. A goal only counts once the pattern has formed: the waves must have run for `settleTime()` = 0.8 x 40 cm / 24 cm/s = 1.33 s of tank time since the last change (Cleared by Tesla 2026-10-29).

| Tier | Goal | Threshold |
| --- | --- | --- |
| Bronze | Exactly 2 dark lines with two dippers | 2 floor(d/lambda + 1/2) = 2, so 0.5 <= d/lambda < 1.5 (Cleared by Tesla 2026-10-29) |
| Silver | One-slit diffraction | Straight dipper, one slit, a/lambda <= 1 (`FUN.slitMax`, Cleared by Tesla 2026-10-29) |
| Gold | Double-slit pattern | Straight dipper, two slits, a/lambda <= 1 and d/lambda >= 2 (`FUN.dMin`, Cleared by Tesla 2026-10-29) |

- Prediction: with two dippers, "Next change: more or fewer dark lines?" resolves when the frequency slider is released or a dipper is dropped (Cleared by Tesla 2026-10-29).

## Atom Builder

All thresholds Cleared by Tesla 2026-10-29.

| Tier | Goal | Threshold |
| --- | --- | --- |
| Bronze | Make a neutral carbon-12 atom | 6 protons, 6 neutrons, 6 electrons (Cleared by Tesla 2026-10-29) |
| Silver | Make an ion | Stable nucleus with electrons != protons (Cleared by Tesla 2026-10-29) |
| Gold | Make stable isotopes of one element | 2 neutral stable isotopes of the same element collected (`FUN.isotopesNeeded`, Cleared by Tesla 2026-10-29) |

- Prediction: "Next particle: will the nucleus be stable?" resolves on the next nucleus change (Cleared by Tesla 2026-10-29).
- Table: a neutral atom with a stable nucleus is collected once per mass number (Cleared by Tesla 2026-10-29).

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
