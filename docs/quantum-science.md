# Quantum Physics module: science reference

Every equation, constant, number and claim the Quantum Physics module (`public/study-quantum.html`) shows to students, with sources. Code: `public/quantum/quantum-physics.js`. Tests: `tests/quantum-physics.test.mjs` (`npm run test:quantum`).

## Sources

- [OS-UP3-6.2] OpenStax University Physics Volume 3, 6.2 Photoelectric Effect (Table 6.1 work functions; Examples 6.5 to 6.7). https://openstax.org/books/university-physics-volume-3/pages/6-2-photoelectric-effect
- [OS-UP3-6.4] OpenStax University Physics Volume 3, 6.4 Bohr's Model of the Hydrogen Atom (E_n = -13.6 eV / n^2, spectral series). https://openstax.org/books/university-physics-volume-3/pages/6-4-bohrs-model-of-the-hydrogen-atom
- [OS-UP3-6.5] OpenStax University Physics Volume 3, 6.5 De Broglie's Matter Waves (lambda = h/p, electron diffraction, baseball example). https://openstax.org/books/university-physics-volume-3/pages/6-5-de-broglies-matter-waves
- [OS-UP3-7.1] OpenStax University Physics Volume 3, 7.1 Wave Functions (single electrons building a double-slit pattern; detecting the slit removes the fringes). https://openstax.org/books/university-physics-volume-3/pages/7-1-wave-functions
- [OS-UP3-3.1] OpenStax University Physics Volume 3, 3.1 Young's Double-Slit Interference (bright fringes at d sin theta = m lambda, spacing y = lambda L / d). https://openstax.org/books/university-physics-volume-3/pages/3-1-youngs-double-slit-interference
- [OS-UP3-4.2] OpenStax University Physics Volume 3, 4.2 Intensity in Single-Slit Diffraction (sinc^2 envelope).
- [OS-UP3-10.1] OpenStax University Physics Volume 3, 10.1 Properties of Nuclei (nuclear radius r = r0 A^(1/3), r0 = 1.2 fm).
- [OS-UP2-16.5] OpenStax University Physics Volume 2, 16.5 The Electromagnetic Spectrum (visible light about 400 to 700 nm; ultraviolet shorter, infrared longer).
- [SI] BIPM, The International System of Units, 9th ed. (2019): h, c and e are exact.
- [CODATA] NIST CODATA 2022 recommended values: electron mass, proton mass, electron rest energy. https://physics.nist.gov/cuu/Constants/
- [NIST-ASD] NIST Atomic Spectra Database, H I lines (Balmer lines in air: 656.279, 486.135, 434.0472, 410.1734 nm; Lyman alpha 121.567 nm in vacuum). https://physics.nist.gov/asd
- [MLB] Official Baseball Rules 3.01: a baseball weighs 5 to 5.25 oz (142 to 149 g); the module uses 0.145 kg as OpenStax does.
- [TONOMURA] A. Tonomura et al., Am. J. Phys. 57, 117 (1989): single-electron buildup of an interference pattern (50 keV electrons, electron biprism). [JONSSON] C. Jonsson, Z. Phys. 161, 454 (1961): electron double-slit with micrometer slits.

## Constants

| Quantity | Value used | Shown as | Source |
|---|---|---|---|
| Planck constant h | 6.62607015 x 10^-34 J s (exact) | 6.626 x 10^-34 J s | [SI] |
| h in eV s | 4.135667696 x 10^-15 eV s | (used for f0 = phi/h) | [SI] |
| Speed of light c | 299 792 458 m/s (exact) | 3.00 x 10^8 m/s | [SI] |
| Elementary charge e, and 1 eV | 1.602176634 x 10^-19 C, J (exact) | 1.602 x 10^-19 J | [SI] |
| hc | 1239.84 eV nm | (OpenStax rounds to 1240 eV nm) | [SI], [OS-UP3-6.2] |
| Electron mass | 9.1093837139 x 10^-31 kg | 9.11 x 10^-31 kg | [CODATA] |
| Proton mass | 1.67262192595 x 10^-27 kg | 1.67 x 10^-27 kg | [CODATA] |
| Electron rest energy | 510 998.95 eV | (used for relativistic electron lambda) | [CODATA] |
| Baseball mass | 0.145 kg | 0.145 kg | [MLB], [OS-UP3-6.5] |
| Hydrogen ground state | 13.6 eV | E_n = -13.6 eV / n^2 | [OS-UP3-6.4] |
| Typical atom size | about 0.1 nm (10^-10 m) | "an atom (about 0.1 nm)" | [OS-UP3-6.5] |
| Proton size | about 1 fm (10^-15 m) | ruler mark "proton size" | [OS-UP3-10.1] |

Work functions, [OS-UP3-6.2] Table 6.1 (calcium from Example 6.6):

| Metal | phi (eV) | Cut-off wavelength hc/phi (nm) | Cut-off frequency phi/h (Hz) |
|---|---|---|---|
| Sodium | 2.46 | 504 | 5.95 x 10^14 |
| Calcium | 2.71 | 458 | 6.55 x 10^14 |
| Aluminum | 4.08 | 304 | 9.87 x 10^14 |
| Zinc | 4.31 | 288 | 1.04 x 10^15 |
| Copper | 4.70 | 264 | 1.14 x 10^15 |
| Silver | 4.73 | 262 | 1.14 x 10^15 |
| Platinum | 6.35 | 195 | 1.54 x 10^15 |

Hydrogen levels (E_n = -13.6/n^2): n=1 -13.6 eV, n=2 -3.40, n=3 -1.51, n=4 -0.850, n=5 -0.544, n=6 -0.378 eV.

Lines computed by the module (lambda = hc / Delta E) vs measured [NIST-ASD]:

| Transition | Delta E (eV) | Module lambda | NIST | Region |
|---|---|---|---|---|
| 3 to 2 (H-alpha) | 1.89 | 656 nm | 656.28 nm (air) | visible, red |
| 4 to 2 (H-beta) | 2.55 | 486 nm | 486.13 nm (air) | visible, blue |
| 5 to 2 (H-gamma) | 2.86 | 434 nm | 434.05 nm (air) | visible, violet |
| 6 to 2 (H-delta) | 3.02 | 410 nm | 410.17 nm (air) | visible, violet |
| 2 to 1 (Lyman alpha) | 10.2 | 122 nm | 121.57 nm (vacuum) | ultraviolet |
| 3 to 1, 4 to 1, 5 to 1, 6 to 1 | 12.1, 12.8, 13.1, 13.2 | 103, 97.3, 95.0, 93.8 nm | 102.57, 97.25, 94.97, 93.78 nm | ultraviolet |

The module's values (with 13.6 eV) agree with NIST to better than 0.1%. All other transitions (Paschen and beyond) are infrared.

## Equations

1. Photon frequency: f = c / lambda. [OS-UP3-6.2]
2. Photon energy: E = hf = hc / lambda; 1 eV = 1.602 x 10^-19 J. [OS-UP3-6.2]
3. Photoelectric energy balance: K_max = hf - phi. [OS-UP3-6.2] Eq. 6.14
4. Cut-off frequency f0 = phi / h and cut-off wavelength lambda0 = hc / phi. [OS-UP3-6.2] Eq. 6.15, 6.16
5. Stopping voltage: K_max = e V_s, so V_s in volts equals K_max in eV. [OS-UP3-6.2] Eq. 6.12
6. Graph: K_max vs f is a straight line of slope h starting at f0, the same slope for every metal. [OS-UP3-6.2] Fig. 6.10
7. Photoelectron rate is proportional to light intensity (number of photons per second); K_max does not depend on intensity. [OS-UP3-6.2]
8. Hydrogen levels: E_n = -13.6 eV / n^2. Emitted photon: Delta E = E_upper - E_lower, lambda = hc / Delta E. Series: Lyman (to n=1), Balmer (to n=2), Paschen (3), Brackett (4), Pfund (5). [OS-UP3-6.4]
9. de Broglie wavelength: lambda = h / p, p = mv; kinetic energy (1/2) m v^2. Speeds are at most 1.0 x 10^7 m/s (3.3% of c), where the relativistic correction to lambda is under 0.1%. [OS-UP3-6.5]
10. Electron accelerated to kinetic energy K (double slit): p c = sqrt(K^2 + 2 K m_e c^2), lambda = hc / (pc). 50 keV gives 5.36 pm (the nonrelativistic formula would give 5.48 pm). [OS-UP3-6.5], [CODATA]
11. Double-slit fringe spacing: Delta y = lambda L / d (small angles). [OS-UP3-3.1]
12. Probability on the screen (drawn curve and dot sampling): I = cos^2(pi d sin(theta) / lambda) x sinc^2(pi a sin(theta) / lambda) with slit width a = d/4 and sin(theta) = y / sqrt(y^2 + L^2). With the which-slit detector on, the cos^2 interference factor is dropped (the two slits add as probabilities), leaving the single-slit envelope. [OS-UP3-3.1], [OS-UP3-4.2], [OS-UP3-7.1]

## Model setups (stated in the UI)

- Double slit, light: d = 0.25 mm, L = 1.00 m, screen 20 mm wide. At 550 nm, Delta y = 2.2 mm.
- Double slit, electrons: d = 1 um, L = 1 m, screen 50 um wide, 10 to 100 keV. This is a model; [JONSSON] used micrometer slits and [TONOMURA] used an electron biprism.
- Sandbox slit spacing: light 0.05 to 1 mm; electrons 0.2 to 5 um.
- Sandbox hydrogen gas: atoms start on n = 1 (room temperature), so only n = 1 upward jumps are absorbed. A photon counts as a match within 0.5% of a line's wavelength (a sim tolerance; real lines are far narrower). Photons with E >= 13.6 eV ionize the atom.
- Slider ranges: photon wavelength 100 to 1000 nm; photoelectric 150 to 700 nm; intensity 10 to 100%; electron speed 1 x 10^5 to 1 x 10^7 m/s; proton 100 to 1 x 10^6 m/s; baseball 1 to 45 m/s; double-slit light 400 to 700 nm; electron energy 10 to 100 keV; sandbox wavelength 90 to 1000 nm.
- Below K_max = 0.1 eV the page says "just above the cut-off" in words instead of a number.

## Claims shown in text

- Light comes in packets of energy called photons; a photon's energy depends only on its frequency. [OS-UP3-6.2]
- Shorter wavelength means higher frequency and more energy; an ultraviolet photon carries more than a red one. (Eq. 2)
- Brighter light means more photons, not bigger ones. [OS-UP3-6.2]
- Regions: ultraviolet below 400 nm, visible 400 to 700 nm, infrared above 700 nm; color names violet < 450, blue < 495, green < 570, yellow < 590, orange < 620, red to 700 nm (conventional approximate bands). [OS-UP2-16.5]
- Each photon gives all its energy to one electron; the electron needs at least phi to escape and keeps the rest as kinetic energy. [OS-UP3-6.2]
- Below the cut-off frequency no electrons come out however bright the light. [OS-UP3-6.2]
- Brighter light above the cut-off frees more electrons per second, each with the same K_max. [OS-UP3-6.2]
- The stopping voltage is the reverse voltage that just stops the fastest electrons. [OS-UP3-6.2]
- The hydrogen electron can only have certain energies; a drop gives off one photon carrying exactly the energy difference. [OS-UP3-6.4]
- Drops to n = 2 (Balmer) give hydrogen's four visible lines, at 656, 486, 434 and 410 nm, from red to violet. Drops to n = 1 give ultraviolet light. [OS-UP3-6.4], [NIST-ASD]
- The atom drawing's rings show the order of the levels, not their true sizes (Bohr radii grow as n^2). [OS-UP3-6.4]
- Every moving particle has a wavelength lambda = h/p. Electron wavelengths can be atom-sized, which is why electrons diffract off crystals (Davisson-Germer). A thrown baseball's wavelength is far too small to measure. [OS-UP3-6.5]
- Particles go through the slits one at a time and land as single dots; after many dots the interference fringes appear. Knowing which slit each particle used removes the fringes. [OS-UP3-7.1], [TONOMURA]
- Hydrogen gas at room temperature has its electrons on n = 1 and absorbs only photons matching a jump up from n = 1 (Lyman lines 122, 103, 97.3, 95.0, 93.8 nm); photons of 13.6 eV or more ionize it. [OS-UP3-6.4], [NIST-ASD]

## Drawing notes (not physics)

- The photon wave on the Photons tab is drawn with its on-screen wavelength proportional to lambda (relative scale only). The de Broglie wave packet is not to scale; the log ruler below it is.
- The photon energy bar spans 0 to 12.4 eV (hc / 100 nm).
- Visible colors use an approximate wavelength to sRGB mapping.
