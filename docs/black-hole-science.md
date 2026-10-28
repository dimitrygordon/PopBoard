# Black Hole Explorer: science reference

For fact-checking. Every number the page prints comes from `public/black-hole/bh-physics.js` (formatting in `bh-format.js`). The Schwarzschild pieces are imported from the Relativity Sandbox (`public/relativity-physics.js`), so the two modules agree exactly at zero spin. Leo's art (`public/black-hole/assets/`) supplies the pictures only. Tests: `tests/black-hole-physics.test.mjs` (`node --test`).

## 1. Units and constants

Lengths are printed in units of GM/c² (written "GM/c²", often called M; GM/c² is half the Schwarzschild radius 2GM/c²). Every radius or impact parameter on the page (r, b, r+, ISCO, photon orbit, shadow edges) is labeled "in units of GM/c²" and converted to m, km or AU for the chosen mass. Spin is the dimensionless a* = Jc/(GM²), 0 ≤ a* ≤ 0.998.

| Symbol | Value | Source |
|---|---|---|
| c | 299 792 458 m/s | exact (from relativity-physics.js) |
| G | 6.6743e-11 m³ kg⁻¹ s⁻² | CODATA 2018 (from relativity-physics.js) |
| M☉ | 1.98847e30 kg | from relativity-physics.js |
| R☉ | 6.957e8 m | IAU 2015 nominal (from relativity-physics.js) |
| GM☉/c² | 1476.6 m | derived |
| g | 9.80665 m/s² | standard gravity |
| L (astronaut) | 2 m | chosen body length |
| a* max | 0.998 | Thorne (1974) limit for a hole spun up by a disk |
| 1 AU | 1.495978707e11 m | IAU 2012 |

Mass slider: log10(M/M☉) from 0.5 to 10 in steps of 0.01 (3.16 M☉ to 10 billion M☉). Presets: 10 M☉ (stellar), 4.3 million M☉ (Sgr A*, GRAVITY Collaboration 2019 to 2022 range is about 4.0 to 4.3 million), 6.5 billion M☉ (M87*, EHT 2019). Spin slider: 0 to 0.998 in steps of 0.002. Probe distance slider: log10(r/M) from log10 2.1 to log10 200 in steps of 0.005. Deep links: `?mode=horizon|lensing|disk|orbits|time|tides` (aliases in `MODE_ALIASES`), plus optional `?mass=` (M☉), `?spin=`, `?r=` (GM/c²), clamped to the sliders.

## 2. Kerr geometry (equatorial plane, Boyer-Lindquist r)

All from Bardeen, Press and Teukolsky (1972), ApJ 178, 347. "Prograde" means orbiting with the spin; retrograde formulas are the prograde ones with a → −a.

| Quantity | Formula | a* = 0 | a* = 0.998 |
|---|---|---|---|
| Outer horizon r+ | 1 + √(1 − a²) | 2 | 1.063 |
| Ergosphere (equator) | 2 | 2 | 2 |
| Photon orbit | 2[1 + cos((2/3) arccos(∓a))] | 3 | 1.074 pro, 3.998 retro |
| Marginally bound orbit | 2 ∓ a + 2√(1 ∓ a) | 4 | 1.091 pro, 5.825 retro |
| ISCO | 3 + Z₂ ∓ √((3 − Z₁)(3 + Z₁ + 2Z₂)) | 6 | 1.237 pro, 8.994 retro |
| | Z₁ = 1 + (1 − a²)^(1/3)[(1 + a)^(1/3) + (1 − a)^(1/3)], Z₂ = √(3a² + Z₁²) | | |
| Circular-orbit energy E | (1 − 2/r ± a r^(−3/2)) / √(1 − 3/r ± 2a r^(−3/2)) | √(8/9) at ISCO | |
| Disk efficiency η | 1 − E(ISCO) | 5.72% | 32.1% pro, 3.78% retro |
| Orbit period (far clock) | 2π (r^(3/2) ± a) GM/c³ | 4.55 ms at ISCO for 10 M☉ | |
| Shadow edge seen edge-on, i.e. for a viewer in the plane of the disk (equatorial photon orbit impact parameter) | b = ∓a + 6 cos(arccos(∓a)/3) | 3√3 = 5.196 | 2.111 pro, 6.997 retro |

Orbit status at the probe distance (prograde): "inside horizon" if r ≤ r+, "impossible" if r ≤ photon orbit, "unstable" if r < ISCO, else "stable". Period and energy are only printed for stable orbits.

## 3. Clocks

- Hovering clock: dτ/dt = √(1 − 2/r). This is the Relativity Sandbox's `staticClockRate`; in Kerr it is exact in the equatorial plane because g_tt = −(1 − 2Mr/Σ) and Σ = r² there. It is zero at the ergosphere (r = 2), so the distance slider starts at 2.1.
- Orbiting clock (prograde circular, Bardeen et al.): dτ/dt = √(1 − 3/r + 2a r^(−3/2)) / (1 + a r^(−3/2)). At a* = 0 this is the sandbox's `circularOrbitClockRate`, √(1 − 3/r). Printed only where the orbit is stable.
- "60 min hovering = X min far away" uses X = 60 / (dτ/dt). Worked example at r = 2.5: dτ/dt = √(1 − 2/2.5) = √0.2 = 0.4472, so 60 min hovering = 134 min (2 h 14 min) far away.
- Clock dials: the hovering clock is the reference. It advances 6 minutes per real second when motion is allowed (starting at 60 min, so with reduced motion it stays at 60 min). The far clock shows hovering / √(1 − 2/r) and the orbiting clock shows far × its rate, so the dials agree with the readout for any r.

## 4. Lensing

- Images: each star shows two main images, plus fainter ones ever closer to the shadow edge (light that loops the hole once or more).
- Shadow size (a* = 0): 3√3 GM/c² ≈ 5.2 GM/c², about 2.6 times the horizon radius 2 GM/c², because light bends around it.

- Capture impact parameter (a* = 0): b_c = 3√3 GM/c² (sandbox `CRITICAL_B_OVER_RS` × 2).
- Exact Schwarzschild bending angle: α = 2∫₀^{u₁} du / √(1/b² − u² + 2u³) − π, with u₁ the smallest positive root (closest approach r_min = 1/u₁) and the substitution u = u₁(1 − t²); 20 000-point midpoint rule. Checked in the tests against the sandbox's `traceNullRay` closest approach (agree to 1e-6) and against the weak-field series 4/b + 15π/(4b²) + 401/(12b³) at b = 200.
- Weak-field (Einstein) comparison: α = 4GM/(c²b), the sandbox's `deflectionAngle`. Sun's limb: 1.75 arcsec.
- Ray diagram: sandbox `traceNullRay` paths for b = 2.5, 4, 5.0, 5.6, 7, 10, 14 and the slider value (capped at 40), a* = 0.

## 5. Tides

- Head-to-foot stretch on a body of length L at radius r: Δa = 2GML/r³ (Newtonian radial tidal term). At a* = 0 and r = r_s this is c⁶L/(4G²M²), so it falls as 1/M².
- Tidal disruption radius: in general r_t = R_star (M_bh/M_star)^(1/3). The page uses a Sun-like star, r_t = R☉ (M/M☉)^(1/3).
- Hills mass (star crosses the horizon before it is torn apart): r_t = r+, giving M_H = [R☉ / (r+ · GM☉/c²)]^(3/2) ≈ 1.14e8 M☉ at a* = 0 and 2.95e8 M☉ at a* = 0.998. So the Hills mass of about 1e8 M☉ applies to a Sun-like star and a non-spinning hole; rapid spin raises it.
- Values: 10 M☉ at r = 12: 9.7e4 g; at the 10 M☉ horizon: 2.1e7 g; at the Sgr A* horizon (a* = 0): 1.1e-4 g.

## 6. What the pictures do (and every simplification)

1. Art scale: the round shadow (radius 150 px in a 1024 px layer) is drawn at the a* = 0 capture radius 3√3 GM/c², fixing 28.9 art px per GM/c². The code-drawn horizon circle, ISCO ellipses, probe orbit and 5 GM/c² scale bar use that scale.
2. The picture is identical for every mass; only the km scale bar changes. This is physical: every length scales with M.
3. Shadow with spin: the round and the spinning (D-shaped) shadow and ring layers are crossfaded by min(1, a*/0.9) and stretched horizontally so their left and right edges sit on the exact equatorial edges b_pro and b_retro above. The top and bottom of the shadow are the art, not a ray-traced Kerr shadow. The edges (2.11 and 7 GM/c² at a* = 0.998) apply only seen edge-on, meaning for a viewer in the plane of the disk; the art views the disk from about 15° above edge-on.
4. The lensed arc of the disk's far side follows the round shadow's horizontal mapping. Its shape is the art's.
5. The accretion disk layers are not to scale (art inner edge 200 px ≈ 6.9 GM/c², whatever the spin). The code draws the prograde and retrograde ISCO to scale in the disk plane (y-scale 0.26) without lensing.
6. Doppler beaming and gravitational redshift of the disk are not drawn. The left side is the approaching side, matching the art's brighter left ring.
7. Lensed starfield: Leo's precomputed point-lens map β = θ − θ_E²/θ with a fixed θ_E = 202 px. The size of a real Einstein ring depends on the distances to the lens and the stars, so this size is illustrative. "Lensing off" crossfades to the unlensed copy.
8. Bending angles and ray paths ignore spin.
9. Tides use the Newtonian tidal formula 2GML/r³. For an observer falling radially into a non-spinning hole this is also the exact general-relativistic radial tidal acceleration (r is the areal radius). For a spinning hole the exact value differs by a factor of order one near r+; here spin only enters through r+.
10. Astronaut frames are illustrative bins of the stretch at the probe: under 1 g, 1 to 10 g, 10 to 100 g, over 100 g. They are not injury thresholds.
11. Star frames: one round star if r_t ≤ r+ (swallowed whole); otherwise frame 2, 3, 4 or 5 for r_t/r+ up to 3, 10, 100, or above 100. This shows how far outside the horizon the star is disrupted, not a simulation of the disruption.
12. The probe's on-screen orbit speed is slowed for viewing (period 2.5 s × (r/6)^1.5). The printed period is the physical one.
13. The probe always hovers (sits at r on the right) in Time and Tides, and whenever its circular orbit is not stable.

## 7. Art anchors checked against the files

Measured from the alpha channel of the WebP layers (center 512, 512):

| Manifest claim | Measured | Verdict |
|---|---|---|
| Shadow radius 150 | 151 (ink rim included) | matches |
| Photon ring r ≈ 156 | 148 to 164, centered 156 | matches |
| Inner disk r 200 to 285, y-scale 0.26 | 197 to 285.5, top at 75 px = 0.263 | matches |
| Middle 285 to 375, outer 375 to 465 | 376, 465.5 | matches |
| Lensed arc upper r 168 to 218, lower 165 to 188 | top 219, bottom 188 | matches |
| Lensed starfield empty inside Rs | empty inside r = 149.5 | matches |
| Spinning shadow "shifted 18 px left, left side flattened" | edges at −137 and +133 (center about 2 px left), 270 px wide instead of 303, only mildly flattened | does not match; the code measures the real edges (137, 133) and maps them to the physics |
| Spinning ring "left side brighter" | left 255, right 170 | matches |
| Astronaut frame 1 about 330 px wide | 327 px | matches |
