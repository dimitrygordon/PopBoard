# E&M Field Sandbox: science reference

For fact-checking. Every number the page shows comes from `public/em-fields/emfields-physics.js`. The render file draws it; the art (`public/em-fields/assets/`) supplies pictures only. Tests: `tests/emfields-physics.test.mjs` (`node --test`, or `npm run test:emfields` in `tests/`).

Page: `/study-em-fields.html`. Deep links: `?mode=field|potential|magnetic|cyclotron|selector|sandbox` (aliases: `efield`, `e-field`, `charges`, `superposition`, `force`; `equipotential(s)`, `voltage`; `bfield`, `b-field`, `wires`, `currents`, `compass`; `circular`, `circle`; `velocity-selector`, `crossed`; `free`, `play`, `freeplay`). Optional `&preset=single|dipole|like|three|one|parallel|opposite` and `&particle=proton|alpha|electron`. Unknown values fall back to the E field mode, the dipole and two parallel wires, and a proton.

Theme: a Dark/Light button in the header. The first visit follows the system `prefers-color-scheme`; a click saves the choice in `localStorage["popboard.emfields.theme"]`. Text tokens meet WCAG AA (4.5:1) on the paper and button colors in both themes (checked in the tests).

## 1. Constants

| Symbol | Value | Source |
|---|---|---|
| e | 1.602 176 634e-19 C (exact) | SI 2019, CODATA 2018 [1] |
| epsilon0 | 8.854 187 8128e-12 F/m | CODATA 2018 [1] |
| mu0 | 1.256 637 062 12e-6 N/A^2 (about 4 pi x 1e-7) | CODATA 2018 [1] |
| k = 1/(4 pi epsilon0) | 8.987 551 79e9 N m^2/C^2 (derived) | [1] |
| proton mass | 1.672 621 923 69e-27 kg | CODATA 2018 [1] |
| alpha particle mass | 6.644 657 3357e-27 kg, charge +2e | CODATA 2018 [1] |
| electron mass | 9.109 383 7015e-31 kg, charge -e | CODATA 2018 [1] |

Check: 1/sqrt(mu0 epsilon0) = 299 792 458 m/s (tested).

## 2. Equations

- Point charge field (Coulomb): E = k q / r^2, pointing away from + and toward - [2].
- Superposition: net E is the vector sum of each charge's E [2].
- Force on the test charge: F = q0 E [2].
- Potential: V = sum of k q / r (a scalar sum, zero far away); E = -grad V (tested numerically); U = q0 V [3].
- Equipotentials are perpendicular to field lines; moving along one takes no work [3].
- Long straight wire: B = mu0 I / (2 pi r), circling the wire by the right-hand rule [4].
- B field lines in the page are drawn as contours of A_z = -(mu0 I / 2 pi) ln r summed over wires (B = curl A; tested numerically) [6].
- Force between parallel wires: F/L = mu0 I1 I2 / (2 pi d); same direction attracts, opposite repels. 1 A, 1 A, 1 m gives 2e-7 N/m (the old SI ampere definition) [4], [5].
- Lorentz force: F = q (E + v x B) [7].
- Circular motion in uniform B: r = m v / (|q| B); period T = 2 pi m / (|q| B), independent of speed; f = 1/T. A proton gets about 15.2 MHz per tesla [7].
- Magnetic force is perpendicular to v, so it does no work and the speed and kinetic energy stay constant [7].
- Velocity selector (crossed E and B): straight through only when q E = q v B, so v = E / B, independent of charge and mass [7].
- Kinetic energy: K = (1/2) m v^2, shown in eV (1 eV = e x 1 V).

## 3. Numerics (not shown as numbers, but they shape the pictures)

- Particle motion uses the Boris pusher [8]: exact speed in a pure magnetic field. Substeps are at most T/80, 1% of the distance to the nearest charge over v, and 2% of v/a. Tests: one full orbit returns to the start, the orbit diameter is 2r to 0.1%, and kinetic plus potential energy is conserved to 0.2% near a charge.
- Field lines: RK2 steps along the unit field from + charges (or back from - charges when there are none). Lines per charge = 6 per nC of |q|, at least 4 and at most 48.
- Equipotentials: marching squares on a 6 px grid, every 50 V from -1500 V to +1500 V, red for + and blue for -, labels at +/-100, 200 and 400 V.
- B lines: A_z contours spaced so neighboring rings around one wire differ in radius by a factor e^0.3, about 1.35.
- Field vectors and the superposition arrows are log scaled (length grows by a fixed amount per factor of 10 in field strength), so they show direction and rough size, not exact proportion. On-screen caption: "Arrow length is not to scale. Longer means stronger, but not in proportion."

## 4. Scenes and values shown

| Item | Value |
|---|---|
| Point charge presets | One charge: +2 nC at the center. Dipole: +2 nC and -2 nC, 12 cm apart. Like pair: +2 nC and +2 nC, 12 cm apart. Three: +2 nC, +2 nC and -3 nC. |
| Test charge q0 | starts at +1 nC, 5 cm above the center |
| Wire presets | One wire: 10 A out of the page. Same way: two 10 A wires 10 cm apart. Opposite: 10 A out and 10 A in, 10 cm apart. |
| Earth's field (caption only) | roughly 25 to 65 microtesla at the surface, left out of the compasses [9] |
| Cyclotron mode | proton or alpha, B 0.05 to 0.5 T (start 0.05 T, into the page), v 1e5 to 5e5 m/s (start 3e5 m/s; proton r = 6.26 cm, T = 1.31 microseconds). Proton at 2e5 m/s and 0.2 T: r = 1.04 cm, T = 0.328 microseconds. Slow motion: 1 s on screen = 1 microsecond. |
| Velocity selector | plates 30 cm long, 6 cm apart, exit slit 4 mm, wall 5 cm past the plates. E 1 to 100 kV/m (start 20 kV/m, pointing from the + top plate to the - bottom plate), B 0.01 to 0.5 T into the page (start 0.1 T), v 1e4 to 1e6 m/s (start 1.5e5 m/s; balanced speed 2e5 m/s). Slow motion: 1 s on screen = 10 microseconds. Electrons are left out here: their gyration radius is about 1/1836 of a proton's, so at these settings they drift through with wiggles too small to see. |
| Sandbox | charges 0.1 to 10 nC, wire currents 0.5 to 50 A, uniform E 100 V/m to 100 kV/m in 4 directions, uniform B 1 mT to 1 T into or out of the page, launch speed 1e4 to 1e6 m/s in 8 directions, proton, alpha or electron, slow motion 1 s on screen = 10 ns to 10 microseconds. Start: +2 nC and -2 nC charges, a 10 A wire, 20 mT into the page, a proton at 2e5 m/s. The run stops when the particle reaches a charge (within 1.2 cm) or leaves the view. |
| Sandbox caption | The wires' magnetic field lies in the page. For a particle moving in the page, v x B then points into or out of the page, so this flat view (which follows motion in the page only) leaves the wires out of the particle's motion. Only the uniform B perpendicular to the page bends it. |

## 5. Sliders

Every slider is logarithmic with 200 steps. Adjacent steps differ by (max/min)^(1/200): at most 1.035 (1 mT to 1 T), and any value up to the square of a slider value (kinetic energy) changes by under 1.1x per step. No shown value jumps by 2x or more between adjacent steps (tested for every slider and for r, T and E/B).

## 6. Captions (claims shown to students)

- Each charge makes its own field E = kq/r^2, pointing away from + and toward -. The net field is the vector sum (superposition).
- Field lines start on + charges and end on - charges, or run off to far away. Where they crowd together the field is stronger.
- Potential adds as plain numbers, V = sum kq/r, with no directions. The field points from high to low potential and crosses every equipotential at a right angle. Moving a charge along an equipotential takes no work.
- A long straight wire's field circles the wire (right-hand rule) with B = mu0 I/(2 pi r). Compass needles line up with the net field; the red end points along B. Parallel currents attract; opposite currents repel.
- A magnetic force is always at right angles to the motion, so it bends the path into a circle but never changes the speed. Faster particles make bigger circles, but the time for one lap does not depend on speed. That is the idea behind the cyclotron [10].
- In a velocity selector the electric and magnetic forces cancel only when v = E/B, so only particles at that speed go straight through the slit, whatever their charge or mass.

## Sources

1. NIST, CODATA 2018 recommended values of the fundamental physical constants. https://physics.nist.gov/cuu/Constants/
2. OpenStax, University Physics Volume 2, ch. 5 (Electric Charges and Fields). https://openstax.org/books/university-physics-volume-2/pages/5-introduction
3. OpenStax, University Physics Volume 2, ch. 7 (Electric Potential). https://openstax.org/books/university-physics-volume-2/pages/7-introduction
4. OpenStax, University Physics Volume 2, ch. 12 (Sources of Magnetic Fields), 12.2 and 12.3. https://openstax.org/books/university-physics-volume-2/pages/12-introduction
5. BIPM, The International System of Units (SI Brochure, 8th ed., 2006), ampere definition. https://www.bipm.org/en/publications/si-brochure
6. D. J. Griffiths, Introduction to Electrodynamics, 4th ed., sec. 5.4 (vector potential).
7. OpenStax, University Physics Volume 2, ch. 11 (Magnetic Forces and Fields), 11.3 and 11.4. https://openstax.org/books/university-physics-volume-2/pages/11-introduction
8. J. P. Boris, "Relativistic plasma simulation: optimization of a hybrid code," Proc. 4th Conf. on Numerical Simulation of Plasmas (1970); see also Birdsall and Langdon, Plasma Physics via Computer Simulation.
9. NOAA NCEI / BGS, World Magnetic Model: surface field strength ranges from about 25 000 nT to 65 000 nT. https://www.ncei.noaa.gov/products/world-magnetic-model
10. OpenStax, University Physics Volume 2, 11.6 (Applications of magnetic forces: the cyclotron).
