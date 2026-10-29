# Gases & Thermodynamics: science notes

Page: `/study-gas-thermo.html`. Physics: `public/gas-thermo/gas-physics.js` (no DOM). Drawing: `gas-render.js`. Wiring: `gas-ui.js`. Theme: `gas-theme.css`. Tests: `tests/gas-thermo-physics.test.mjs` (`npm run test:gasthermo` in `tests/`).

Deep links: `?mode=kinetic|laws|speeds|energy|firstlaw|pv|engine|sandbox`. Aliases: `particles`, `box`, `kinetic-theory`, `molecules`; `law`, `gas-laws`, `pvnrt`, `ideal-gas`, `boyle`, `charles`, `gaylussac`, `gay-lussac`, `avogadro` (the law names also pick that law); `maxwell`, `maxwell-boltzmann`, `distribution`, `mb`; `ke`, `kinetic-energy`, `temperature`; `first-law`, `heat`, `heating`, `work`; `isothermal`, `adiabatic`, `pv-diagram`, `processes`; `carnot`, `cycle`, `heat-engine`; `free`, `play`, `freeplay` (all go to `sandbox`). Optional `&law=boyle|charles|gaylussac|avogadro` and `&gas=he|ne|n2|o2|ar`. Unknown values fall back to the Molecules mode, Boyle's law and nitrogen. The Back button goes to `study.html` plus the board return keys only.

## Constants

| Quantity | Value | Source |
|---|---|---|
| Boltzmann constant k | 1.380649 × 10⁻²³ J/K (exact) | SI Brochure, 9th ed. (BIPM 2019); CODATA 2018 |
| Avogadro constant N_A | 6.02214076 × 10²³ /mol (exact) | same |
| Molar gas constant R = kN_A | 8.314462618 J/(mol·K) | same |
| Atomic mass constant | 1.66053906660 × 10⁻²⁷ kg | CODATA 2018 |
| Standard atmosphere | 101 325 Pa (exact) | ISO 2533 / BIPM |
| Standard gravity g | 9.80665 m/s² (exact) | 3rd CGPM (1901) |
| Ice point | 273.15 K | definition of the Celsius scale |
| Molar masses (g/mol) | He 4.002602, Ne 20.1797, N₂ 28.0134, O₂ 31.9988, Ar 39.948 | IUPAC standard atomic weights (CIAAW) |

Molecule mass m = M × (atomic mass constant), for example He 6.646 × 10⁻²⁷ kg.

## Ideal gas law

- PV = nRT, with P in Pa, V in m³, n in mol, T in K. Equivalently PV = NkT with N = nN_A. (Serway & Jewett, *Physics for Scientists and Engineers*, ch. 19; OpenStax *University Physics* Vol. 2, sec. 2.1.)
- One mole at 273.15 K and 101 325 Pa occupies 22.414 L (tested).
- Boyle: P ∝ 1/V at fixed T and n. Charles: V ∝ T at fixed P and n. Gay-Lussac: P ∝ T at fixed V and n. Avogadro: V ∝ n at fixed P and T. All follow from PV = nRT (OpenStax Chemistry 2e, sec. 9.2).
- The straight lines for Charles and Gay-Lussac extrapolate to zero at 0 K = −273.15 °C (absolute zero). Shown as a dashed extension; real gases liquefy before that.
- Claim: real gases follow the ideal gas law well at low pressure and well above their condensation temperature (OpenStax Chemistry 2e, sec. 9.6).
- Lab settings: Boyle at n = 0.08 mol, T = 300 K, V from 1 to 4 L (P 199.5 to 49.9 kPa). Charles at n = 0.08 mol, P = nR(150 K)/(1 L) = 99.8 kPa, T 150 to 600 K (V 1 to 4 L). Gay-Lussac at n = 0.08 mol, V = 2 L, T 150 to 600 K (P 49.9 to 199.5 kPa). Avogadro at 300 K and 99.8 kPa, n 0.02 to 0.16 mol (V 0.5 to 4 L).

## Kinetic theory

- Pressure from molecular impacts: P = N m ⟨v²⟩ / (3V) (Serway & Jewett sec. 21.1; OpenStax University Physics Vol. 2 sec. 2.2). Combined with PV = NkT this gives the mean translational kinetic energy ⟨KE⟩ = ½ m⟨v²⟩ = (3/2) kT, the same for every gas at one temperature. At 300 K, ⟨KE⟩ = 6.21 × 10⁻²¹ J.
- Temperature is a measure of the average translational kinetic energy of the molecules; doubling the kelvin temperature doubles ⟨KE⟩.
- RMS speed v_rms = √(3kT/m) = √(3RT/M). N₂ at 300 K: 517 m/s. He at 300 K: 1368 m/s. He is 9.98 times lighter than Ar, so at the same T it moves √9.98 = 3.16 times faster ("about 3.2 times" in the text).
- The Molecules mode draws 500 dots per mole (40 dots at 0.08 mol), so each dot stands for N_A/500 = 1.2 × 10²¹ molecules. The box is drawn flat; each dot carries three velocity components (the third is not drawn), sampled from the Maxwell-Boltzmann distribution (each component normal with variance kT/m). On-screen motion is slowed: 1000 m/s is drawn as 200 px of the 1024 px art frame per second. Walls are perfectly elastic and the dots do not collide with each other (an ideal gas; collisions between molecules do not change the equilibrium distribution).
- "From the dots" pressure = N m ⟨v²⟩_dots / (3V), with ⟨v²⟩ averaged over the drawn dots. With 10 to 80 dots it differs from nRT/V by a few to about 15 percent by chance; the relative spread of a mean of 3N squared normal components is √(2/(3N)).
- Heating rescales every dot's velocity by √(T₂/T₁), which keeps the distribution Maxwellian at the new T.
- Dot sizes grow with molar mass and are not to scale.

## Maxwell-Boltzmann speed distribution

- f(v) = 4π (m / (2πkT))^{3/2} v² exp(−mv² / (2kT)), normalized so ∫f dv = 1 (Serway & Jewett sec. 21.5; OpenStax University Physics Vol. 2 sec. 2.4).
- Most probable speed v_p = √(2kT/m); mean speed ⟨v⟩ = √(8kT/(πm)); RMS speed v_rms = √(3kT/m). Always v_p < ⟨v⟩ < v_rms. N₂ at 300 K: 422, 476, 517 m/s.
- Fraction faster than v: 1 − erf(x) + (2/√π) x e^{−x²}, with x = v/v_p. Example N₂ at 300 K above 1000 m/s: 1.1 percent. erf uses Abramowitz and Stegun 7.1.26 (error under 1.5 × 10⁻⁷).
- Heating moves the peak to higher speed and flattens and widens the curve; the area stays 1. Lighter gases have faster distributions.
- The graph also shows a histogram of 150 sampled dots (scaled to the same area) and a dashed 300 K reference curve.

## Internal energy, heat capacities, first law

- Equipartition: U = (f/2) nRT with f = 3 for monatomic gases (He, Ne, Ar) and f = 5 for diatomic N₂ and O₂ near room temperature (vibration frozen out). C_v = (f/2)R, C_p = C_v + R (Mayer's relation), γ = C_p/C_v = 5/3 or 7/5 (Serway & Jewett sec. 21.2 to 21.3).
- First law: ΔU = Q − W, with Q the heat added to the gas and W the work done by the gas (sign convention of Serway & Jewett and OpenStax).
- Fixed volume: W = 0, Q = nC_vΔT, ΔU = Q.
- Fixed pressure: Q = nC_pΔT, W = PΔV = nRΔT, so W/Q = R/C_p (2/5 for monatomic, 2/7 for diatomic) and T rises less than at fixed volume for the same Q.
- Fixed temperature (large bath): ΔU = 0, Q = W = nRT ln(V₂/V₁).
- First-law lab: start 300 K, 2 L, 0.08 mol; |Q| from 5 to 150 J, heat in (hot plate) or out (ice bath).

## Isothermal and adiabatic processes

- Isothermal: PV = constant, W = nRT ln(V₂/V₁), Q = W, ΔU = 0.
- Adiabatic, quasi-static (insulated, Q = 0): PV^γ = constant and TV^{γ−1} = constant; W = (P₁V₁ − P₂V₂)/(γ − 1) = −ΔU (Serway & Jewett sec. 21.4). The adiabat is steeper than the isotherm through the same point, compressing heats the gas and expanding cools it.
- Work by the gas equals the area under the path on the PV diagram (tested numerically).
- Lab: start 300 K, 2 L, 0.08 mol; volume change factor 1.05 to 2, compress or expand. Example He compressed 2× adiabatically: T₂ = 300 × 2^{2/3} = 476 K, P₂ = 317 kPa.

## Carnot engine

- Cycle A→B isothermal expansion at T_h (takes in Q_h = nRT_h ln(V_B/V_A)), B→C adiabatic expansion to T_c, C→D isothermal compression at T_c (gives out Q_c = nRT_c ln(V_C/V_D)), D→A adiabatic compression. V_C/V_B = V_D/V_A = (T_h/T_c)^{1/(γ−1)}.
- Net work W = Q_h − Q_c = enclosed area; efficiency η = W/Q_h = 1 − T_c/T_h, the largest possible for any engine between the same two temperatures (Carnot's theorem; Serway & Jewett sec. 22.3 to 22.4; OpenStax University Physics Vol. 2 sec. 4.5).
- Lab: helium, 0.08 mol, V_A = 1 L, V_B = 1.5 L, T_h 450 to 600 K, T_c 300 to 400 K (η 11 to 50 percent). Example T_h = 600 K, T_c = 300 K: Q_h = 162 J, Q_c = 80.9 J, W = 80.9 J, η = 50 percent.

## Sandbox model

- Heat flows by Newton's law of cooling, dQ/dt = H (T_s − T), H = 0.25 W/K, solved exactly over each frame. Sources: Bunsen burner T_s = 600 K (the thermometer top; a real flame is much hotter, so this is a stand-in for a regulated heater), hot plate 450 K, ice bath 273.15 K, insulated (no flow). Heating uses C_v when the piston is locked or on a stop, C_p when it floats.
- Free piston: the gas pressure equals the outside pressure, 101.325 kPa plus mg/A for the weights, with A = 0.01 m² (11.3 cm bore). Small weight 10.2 kg adds 10.0 kPa, large 25.5 kg adds 25.0 kPa, up to 3 weights. The piston itself is treated as massless and frictionless. Stops at 0.5 L and 4.5 L; on a stop, P = nRT/V.
- Temperatures are held between 100 and 600 K (the thermometer scale). At 600 K, 0.16 mol and 1 L the gauge reads its 798 kPa maximum, inside its 800 kPa scale.

## Instruments and sliders

- Thermometer scale: 100 K at the bottom of the bore (y 842) to 600 K at y 283 of the 1024 art frame; ticks every 50 K, labels every 100 K, drawn in code. The liquid column fills the bore (x 504 to 513) and the bulb mask is tinted with the same color.
- Pressure gauge: 270 degree sweep, 0 to 400 kPa (laws, speeds, energy, first law, PV, engine) or 0 to 800 kPa (Molecules, Sandbox).
- Piston: 1 L of gas = 115.6 px of bore height in the art frame (4.5 L at the top stop).
- Every slider is logarithmic over 200 steps; adjacent steps differ by at most 1.4 percent, and the tests check that no shown value (P, V, T, n, speeds, energies, Q, W, ΔU, efficiencies) changes by 2× or more between adjacent steps.

## Simplifications stated to students

- Ideal gas: point molecules, no forces between them, no condensation.
- Dot motion is slowed down and drawn in two dimensions.
- Processes in the first-law and PV modes are quasi-static (slow enough to stay in equilibrium).
- Sizes of dots are not to scale.

## Sources

1. BIPM, *The International System of Units (SI)*, 9th edition, 2019. Exact k, N_A.
2. E. Tiesinga et al., "CODATA recommended values of the fundamental physical constants: 2018", Rev. Mod. Phys. 93, 025010 (2021).
3. CIAAW / IUPAC, Standard atomic weights (ciaaw.org).
4. R. A. Serway and J. W. Jewett, *Physics for Scientists and Engineers*, 10th ed., chapters 19 to 22.
5. OpenStax, *University Physics Volume 2*, chapters 1 to 4 (openstax.org/details/books/university-physics-volume-2).
6. OpenStax, *Chemistry 2e*, chapter 9 (gas laws, kinetic molecular theory, non-ideal behavior).
7. M. Abramowitz and I. A. Stegun, *Handbook of Mathematical Functions*, formula 7.1.26.
8. ISO 2533:1975, Standard Atmosphere (101 325 Pa).
