# Build a Star: science reference

For fact-checking (Tesla). Every number the page shows comes from `public/stars/stars-physics.js`. The art pack (`public/stars/assets/`, by Leo) supplies grayscale masks and remnant pictures only; the page tints the star by temperature and draws all arrows, gauges, the hourglass, the H-R plot and every reaction label in code. Tests: `tests/stars-physics.test.mjs` (`node --test`).

This is a teaching model built from scaling relations, not a stellar-evolution code. Each relation is calibrated so the Sun comes out right, and each simplification is listed below.

## 1. Constants

| Symbol | Value | Source |
|---|---|---|
| G | 6.67430e-11 m³ kg⁻¹ s⁻² | CODATA 2018 |
| M☉ | 1.98841e30 kg | IAU 2015 (GM☉ / G) |
| R☉ | 6.957e8 m | IAU 2015 B3 |
| T☉ (surface) | 5772 K | IAU 2015 B3 |
| Tc☉ (core) | 15.7 MK | standard solar model |
| Pc☉ (core) | 2.5e16 Pa | standard solar model |
| t☉ (main sequence) | 10 Gyr | textbook |
| Chandrasekhar limit | 1.44 M☉ | |
| Z☉ | 0.014 | Asplund et al. 2009 (present-day value 0.0134, rounded) |
| Y☉ | 0.27 | protosolar helium, rounded |
| Age of the universe | 13.8 Gyr | Planck 2018 |

## 2. Inputs

- Initial mass M: 0.08 to 100 M☉, log slider. 0.08 M☉ is the hydrogen-burning limit.
- Metallicity Z: 0.0001 to 0.04, log slider. Default 0.014.
- Helium Y (optional): 0.24 to 0.40. Default 0.27. X = 1 − Y − Z.
- Mean molecular weight (fully ionized): 1/μ = 2X + 3Y/4 + Z/2. Solar mix gives μ ≈ 0.61.

## 3. Main-sequence relations (solar units)

Revised after Tesla's review (O-star temperatures were too hot; low-mass radius and pressure too high).

- Mass-luminosity: L = 0.23 M^2.3 (M < 0.43); M^4 (0.43 to 2); 1.4 M^3.5 (2 to 30); 1.4 × 30^3.5 × (M/30)^1.435 (30 and up). The flatter top end gives log L ≈ 5.46 at 38 M☉ and 5.54 at 43 M☉, matching the O5V row of the Mamajek table (log L about 5.44 to 5.54).
- Composition nudge on L: × (μ/μ☉)^4 × (Z/Z☉)^−0.15. The μ⁴ term is the homology result L ∝ μ⁴M³; the Z term stands in for lower opacity in metal-poor gas (brighter star). The exponent −0.15 is chosen for teaching, not fitted.
- Mass-radius (continuous at each join): R = 0.35^0.8 × (M/0.35)^1.125 (M < 0.35, giving 0.23 R☉ at 0.2 M☉); M^0.8 (0.35 to 1); M^1.06 (1 to 2); 1.41 M^0.56 (2 and up).
- Surface temperature (Stefan-Boltzmann): Teff = 5772 K × (L / R²)^(1/4). The Sun stays at 1 R☉, 1 L☉, 5772 K. 43 M☉ gives about 41,200 K (Mamajek O5V: about 41,400 K).
- Spectral class from Teff: O ≥ 30,000 K, B ≥ 10,000, A ≥ 7,500, F ≥ 6,000, G ≥ 5,200, K ≥ 3,700, else M.
- Core temperature: Tc = 15.7 MK × M^0.5 (M < 1) or M^0.3 (M ≥ 1), × (μ/μ☉) (homology Tc ∝ μM/R) × (Z/Z☉)^−0.03. A rough fit to published zero-age models (about 4 MK at 0.08 M☉, 17 MK at 1.3, 25 MK at 5, 35 MK at 15, 47 MK at 40).
- Core pressure (homology Pc ∝ M² / R⁴): Pc = 2.5e16 Pa × M² / R⁴ for M ≥ 0.35 (the Sun gives 2.5e16 Pa). For fully convective stars (M < 0.35), Pc = 8.7e14 Pa × M² / R⁴, giving about 1.2e16 Pa at 0.2 M☉. Simplification: the two coefficients make Pc jump at 0.35 M☉ (about 3e15 Pa just below, 9e16 Pa just above). The uncalibrated G M² / R⁴ gives 1.1e15 Pa for the Sun.
- Main-sequence lifetime (Gyr), continuous at each join: 10 M^−2.5 (M < 1); 10 M^−2.86 (1 to 5); 0.1 × (M/5)^−1.5 (5 to 40, i.e. 100 Myr at 5 M☉); 0.0044 × (M/40)^−0.45 (40 and up, i.e. 4.4 Myr at 40 M☉). Scaled by (X/X☉) / (L-composition factor), since lifetime ∝ fuel / burn rate. Below 0.35 M☉ the page shows "about 1 trillion years or more" (Laughlin, Bodenheimer and Adams 1997) and the model age uses at least 1,000 Gyr.
- Dynamical time for the squeeze demo: t_dyn = √(R³ / GM), about 27 minutes for the Sun. (The free-fall time, √(3π / 32 G ρ̄), is about 30 minutes.)

| M (M☉) | log L | R (R☉) | Teff (K) | Pc (Pa) | Lifetime |
|---|---|---|---|---|---|
| 0.2 | −2.25 | 0.230 | 3,303 | 1.2e16 | about 1 trillion yr or more |
| 1 | 0.00 | 1.000 | 5,772 | 2.5e16 | 10 Gyr |
| 5 | 2.59 | 3.47 | 13,776 | 4.3e15 | 100 Myr |
| 15 | 4.26 | 6.42 | 26,486 | 3.3e15 | 19 Myr |
| 40 | 5.50 | 11.1 | 40,924 | 2.6e15 | 4.4 Myr |
| 100 | 6.07 | 18.6 | 43,986 | 2.1e15 | 2.9 Myr |

## 4. Fusion

- pp chain (ppI only, the main branch in the Sun): p + p → ²H + e⁺ + ν; ²H + p → ³He + γ; ³He + ³He → ⁴He + 2p. Net: 4p → ⁴He + 2e⁺ + 2ν + energy. The ppII and ppIII branches are not shown.
- CNO cycle steps shown: ¹²C + p → ¹³N + γ; ¹³N → ¹³C + e⁺ + ν; ¹³C + p → ¹⁴N + γ; ¹⁴N + p → ¹⁵O + γ; ¹⁵O → ¹⁵N + e⁺ + ν; ¹⁵N + p → ¹²C + ⁴He.
- Energy split: CNO / pp = (Z/Z☉)(X☉/X)(Tc / 17 MK)^52, CNO share = ratio / (1 + ratio). The exponent 52 is a calibration, not a rate law: it puts the crossover at 17 MK (about 1.3 M☉) and keeps the Sun's CNO share small. The local rate exponents are about T⁴ (pp) and T¹⁸ (CNO) near 15 MK. Measured solar CNO share: about 1% (Borexino Collaboration 2020, Nature 587, 577). With the 52 calibration the model gives 1.6% for the Sun.
- Helium burning (triple-alpha): ⁴He + ⁴He ⇌ ⁸Be; ⁸Be + ⁴He → ¹²C + γ; then ¹²C + ⁴He → ¹⁶O + γ. Needs about 100 MK.

## 5. Energy transport (main sequence)

- M < 0.35 M☉: fully convective (low-mass cutaway).
- 0.35 to 1.3 M☉: radiative core, convective envelope (Sun-like cutaway: core to 0.25 R, radiative to 0.70 R, convective to the surface; the Sun's convection zone starts near 0.71 R).
- M ≥ 1.3 M☉: convective core, radiative envelope (massive cutaway). The real transition is gradual between about 1.1 and 1.5 M☉.
- Zone radii come from the art (fixed per variant), not computed per mass.

## 6. Life stages (durations; t = main-sequence lifetime)

- M < 0.5 M☉: main sequence, then a helium white dwarf (no red giant or planetary nebula in this model).
- 0.5 to 8 M☉: main sequence (t); red giant, hydrogen shell burning (0.1 t); core helium burning, t_He = min(0.15 t, 110 Myr); asymptotic giant branch (0.002 t); planetary nebula (about 20,000 yr); white dwarf.
- M ≥ 8 M☉: main sequence (t); red supergiant, helium then heavier burning, t_He = min(0.15 t, 110 Myr); core-collapse supernova (unless direct collapse); neutron star or black hole.
- The time slider gives the main sequence half its length and splits the rest evenly between later stages, so short stages are visible. The age readout is the real model age.
- H-R positions for late stages are representative values, not tracks: red giant Teff 4,300 K, L = max(2 L_MS, 100 M²) × (0.3 to 1.7 across the stage); helium burning 4,800 K, max(1.5 L_MS, 50 M^1.5); AGB 3,200 K, max(3 L_MS, 3,000 M^0.8); planetary nebula nucleus 100,000 K, 3,000 M^0.5; red supergiant 3,600 K at main-sequence L.
- White dwarf: starts near 100,000 K and cools; the slider runs it down to 10,000 K (log-spaced). L = R² (T/5772)⁴ with R = 0.012 R☉ (about Earth-sized), so about 13 L☉ when new and about 0.001 L☉ at 10,000 K.
- Core temperatures shown: red giant 40 to 100 MK, helium burning 100 MK, AGB and red supergiant 200 MK, white dwarf 10 MK, supernova 10 billion K. Supernova text: about 3 billion K in silicon burning, about 10 billion K in the collapsing core, about 100 billion K in the newborn neutron star.
- Massive stars are always shown as red supergiants; real ones above about 30 M☉ can lose their envelopes and die as blue supergiants or Wolf-Rayet stars.

## 7. Fates

| Initial mass | Fate |
|---|---|
| < 0.5 M☉ | helium white dwarf |
| 0.5 to 8 M☉ | planetary nebula, then a carbon-oxygen white dwarf (oxygen-neon above about 7 M☉) |
| 8 to 20 M☉ | core-collapse supernova, then a neutron star (about 1.4 M☉, about 24 km across, radius 11 to 13 km) |
| ≥ 20 M☉ | black hole. At solar Z: supernova with fallback. At low Z (Z ≤ 0.0014, 0.1 Z☉): 25 to 40 M☉ still a black hole by fallback; direct collapse with a faint or no supernova needs about 40 M☉ or more |

- Below about 0.9 M☉ the fate is labeled "hypothetical: no star this small has died yet" (main-sequence life longer than the 13.8 Gyr age of the universe).
- White dwarf mass (Kalirai et al. 2008): M_WD = 0.109 M + 0.394, capped at 1.35 M☉, below the Chandrasekhar limit of 1.44 M☉. The Sun gives 0.50 M☉.
- The real boundaries depend on metallicity, rotation, mass loss and binary companions; the page says so.

## 8. Hydrostatic equilibrium demo

- At equilibrium the inward gravity arrow and outward pressure arrow are equal. Arrow length grows with log Pc.
- Squeeze: radius set to (1 + x) of equilibrium with x(t) = −0.12 e^(−0.35 t) cos(2πt / 1.6) (t in arbitrary dynamical-time units). Gravity per area ∝ R⁻⁴; adiabatic pressure (γ = 5/3) ∝ ρ^γ ∝ R⁻⁵. Compressed: pressure wins and pushes out; expanded: gravity wins. The damping is illustrative. The caption gives the dynamical time (about 27 minutes for the Sun).

## 9. Color

Star tint by surface temperature, interpolated in log T: 2,500 K deep red, 3,500 K red-orange, 4,500 K orange, 5,772 K gold, 7,500 K white, 10,000 K pale blue, 30,000 K blue. Artistic, not a blackbody conversion. The supernova art uses a fixed 4,400 K orange tint.
