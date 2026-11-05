# Physics 101: 3D energy simulations (energy3d)

Independent three.js toon scenes inspired by the Every Joule specs (`/workspace/physics101/every_joule_art_specs.md`, `every_joule_mapping.md`), with every number checked against Tesla's fact-check (`tesla-energy-check.md`).

## Layout

- `public/physics101/scenes/energy3d/core.js`: renderer, warm key light with soft shadows, hemisphere fill, ground (#F4ECDC light, #1F1D1A dark), `toon()` ink outline, axis-constrained pointer drag, RAF loop that pauses when hidden, ResizeObserver. No orbit or pan.
- `palette.js`: energy palette from spec section 0.3.
- `physics.js`: all pure math (tested in `tests/physics101-energy3d.test.mjs`).
- `ui.js`: shared panel, predict radios (lock the test), Explain reveal, 3D jars, glowing packets.
- One scene module per sim; each page wrapper `scenes/<slug>/pNN.js` is written by `tools/physics101/energy3d-mount.py`, loads the module with a dynamic import, reads words from the slide's `sceneText` in `story.json`, and shows `sceneText.noWebgl` without WebGL.
- Every scene: predict, then test, then Explain. Reduced motion (`ctx.reduce`) drops packets and shortens animations.

## Sims and pages

| Sim | Module | Page | Mapped page | Why moved |
|---|---|---|---|---|
| 1 Energy stores | stores.js | m10-l02 p1 | same | |
| 2 Kinetic and gravitational (track, friction toggle) | track.js | m10-l03 p2 | m10-l03 p4 | p4 has a Test it |
| 3 Spring launcher (ideal spring) | spring.js | m13-l01 p2 | m13-l01 p5 | p5 has a Test it |
| 4 Bouncing ball | bounce.js | m10-l03 p8 | m10-l03 p5 | p5 has a Test it |
| 5a Kettle | heat.js mountKettle | m11-l01 p9 | m11-l01 p12 | p12 has a Test it |
| 5b Insulation jacket (calorimeters, no houses) | heat.js mountInsulation | m11-l01 p16 | m11-l01 p14 | p14 has a Test it |
| 7 Lamps at matched lumens | lamps.js | m19-l02 p3 | m19-l02 p1 | p1 has a Test it |
| 8 Power station to lamp | grid.js | m21-l02 p11 | m21-l02 p17 | p17 has a Test it |
| 9 Energy in food | food.js | m10-l02 p11 | same | |
| 10 Nothing is lost | journey.js | m10-l03 p1 | same | |

Not built: Sim 6 Power (elevator). m10-l01 p14 already controls the same force, height and trip time, so a new scene would duplicate it.

On m10-l02 p1 and m10-l03 p1, tapping Leo's cutout shows or hides the 3D layer (label in `sceneText.toggle`).

## Numbers and claims

Status: **cleared** = Tesla checked it; **held** = Tesla blocked it, so the scene shows no number; **inference** = ours, not Tesla's.

| Sim | Value or claim | Status |
|---|---|---|
| all | g = 9.8 N/kg; KE = 1/2 m v^2; GPE = mgh; E_elastic = 1/2 k x^2; Q = m C dT | cleared (C2) |
| 1, 10 | "Energy is transferred, not destroyed."; stores are accounting categories | cleared (C1) |
| 2 | Frictionless return to release height; ME equality "at display precision" | cleared (C1, C2) |
| 2 | Friction-on loss: drawn with a unitless shape factor (0.8), no coefficient or number shown | inference (drawing only) |
| 3 | k = 100 N/m, m = 0.050 kg, x max 0.080 m, 55 degrees, bell 0.90 m +/- 0.03 m, ideal-spring card | cleared as ideal model only (O1) |
| 3 | QA: 0.320 J at x max, bell x = 0.0703 m, KE_apex = 0.0721 J | cleared (spec QA references) |
| 3 | Launch height 0.600 m above the floor | inference: back-solved so the bell answer is 0.0703 m |
| 3 | Landing sound share 0.02 | held: left out (needs "illustrative" label and Tesla approval) |
| 4 | Presets: tennis 0.0577 kg, e 0.745; basketball 0.600 kg, e 0.767; table tennis 0.0027 kg, e 0.876; h_rebound/h_drop = e^2 | cleared |
| 4 | Ball radii (0.0335, 0.12, 0.02 m) | inference: typical sizes, drawing only |
| 4 | Sound share | held: pink arrow tagged "estimate", no percentage (C5) |
| 5a | 0.230 kg, 3000 W, 20 to 100 degrees C, C = 4180 J/(kg K), Q = 76912 J, 25.6 s, band 24.36 to 26.92 s | cleared (C6) |
| 5a | Half kettle 12.8 s | inference: same cleared model with half the mass |
| 5b | Jacket U-values, areas, temperatures, C_eff, loss watts, cooling times | held (O2): arrows say "values pending approval", curves have no axis numbers |
| 7 | 60 W, 800 lm, 13.3 lm/W; LED 115 lm/W; 6.96 W; 88.4 percent less input power; band 776 to 824 lm | cleared (C10) |
| 7 | LED or filament energy split (light vs heat) | held: ribbons drawn, no numbers |
| 8 | Grid retained 0.912 (28456.6/323031.1 GWh); transformer inside grid loss, no 0.99 | cleared (W1 correction) |
| 8 | Overall: gas 0.4376, coal 0.3159, nuclear 0.3574, hydro 0.8207, wind 0.4491, solar 0.2070; 7 W inputs 16.00 to 33.82 W | cleared (W1) |
| 8 | Solar "INCOMPLETE CHAIN", coal "historical (2023)", mixed-year scenario card | required by Tesla (O3) |
| 8 | Transmission voltage and I^2R | not shown here; owned by m19-l02 p9 |
| 9 | Porridge 1047 kJ, cornflakes 1044 kJ, toast 832 kJ, banana 438 kJ; 1029 J and 4116 J per flight; 823.2 kJ for 200 flights; 1 kcal = 4184 J | cleared (C8 with W2, W3) |
| 9 | 0.294 efficiency tagged "from uphill running, not a stair-climbing limit"; toast result card | required (O4) |
| 10 | v = 1.5 m/s, KE 67.5 J, food 270 J, thermal 202.5 J; closed-model card | cleared (C9) |
| 10 | Animation timings | presentation only |
