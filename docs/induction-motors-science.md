# Induction & Motors: science notes

Module: `public/study-induction-motors.html`, physics in `public/induction-motors/induction-physics.js`, tests in `tests/induction-physics.test.mjs`.
Every equation, constant, number and claim shown to students is listed here with its source. Numbers on screen are rounded to 3 significant figures.

## 1. Magnetic flux (mode `flux`)

| Item | Value or equation | Source |
|---|---|---|
| Flux through a flat loop in a uniform field | Phi = B A cos(theta), theta between B and the loop's normal | [1] 13.1 |
| Unit | 1 Wb = 1 T m^2 (shown as 1 Wb = 1 T·m²); 1 mWb = 0.001 Wb | [1] 13.1 |
| Largest flux | theta = 0 (loop faces the field): Phi = B A | [1] 13.1 |
| Zero flux | theta = 90 degrees (field runs along the loop) | [1] 13.1 |
| Ranges | B 0.01 to 1 T, A 10 to 1000 cm^2, theta 5 to 85 degrees | chosen values |

The angle slider stops at 5 and 85 degrees so the readout never reaches zero (slider rule, section 8); the 0 and 90 degree cases are stated in words. The picture is a view along B: each dot is a field line and the dot spacing is proportional to 1/sqrt(B), so the dot density is proportional to B. The tilted loop is drawn with its width times cos(theta), so the field lines inside it show B A cos(theta). Example at defaults (0.5 T, 200 cm^2, 30 degrees): Phi = 8.66 mWb, B A = 10 mWb.

## 2. Faraday's law, magnet and coil (modes `faraday` and `sandbox`)

| Item | Value or equation | Source |
|---|---|---|
| Faraday's law | emf = -N dPhi/dt (shown as -N ΔΦ/Δt) | [1] 13.1 |
| Permeability of free space | mu0 = 4 pi x 10^-7 T m/A | [1] 12.1 |
| Flux of a point dipole m through one circular turn of radius R, a distance x along the axis | Phi = mu0 m R^2 / (2 (R^2 + x^2)^(3/2)) | derived from the dipole vector potential A = mu0 m sin(theta) / (4 pi r^2), Phi = 2 pi R A [2] |
| Flux through one turn with the magnet centered in it | mu0 m / (2R) | x = 0 in the line above |
| Coil | 2 cm radius, 9 cm long, 5, 10 or 20 turns spread evenly along it | chosen to match the coil art |
| Flux linkage | N Phi = sum of Phi over every turn | [1] 13.1 |
| emf of the moving magnet | emf = -v d(N Phi)/dx | chain rule on Faraday's law |
| Magnet run | from -12 cm to +12 cm and back (each 24 cm pass at speed v) | chosen value |
| Galvanometer | full scale +/- 20 mV (shown as ±20 mV); "OFF SCALE" past that | chosen value |
| Ranges | magnet strength m 0.2 to 5 A m^2, speed 0.2 to 2 m/s | a 1 cm^3 neodymium magnet has m of about 1 A m^2 (Br about 1.2 T, m = Br V / mu0) [3] |
| Time scale | the magnet is shown 4 times slower than real time | display choice |

Claims shown: a changing flux induces an emf; a magnet held still gives no emf however strong it is; faster motion, a stronger magnet or more turns give a bigger emf; the emf changes sign as the magnet leaves because the flux is then decreasing [1] 13.1, 13.2. The emf is zero at the instant the magnet is centered (flux at its maximum, not changing). The magnet is modeled as a point dipole (a real bar magnet is longer, so the real pulse is broader). Example at defaults (m = 2 A m^2, 10 turns, 1 m/s): flux through one turn with the magnet centered 62.8 μWb, peak emf 6.46 mV, a pass takes 0.24 s. Peak emf over all slider settings: 0.0703 mV (5 turns, 0.2 A m^2, 0.2 m/s) to 66.2 mV (20 turns, 5 A m^2, 2 m/s).

Sandbox: the same coil and magnet. Dragging counts as 4 times slower than real (like the auto run), so a drag at 0.25 m/s on screen counts as 1 m/s. The readout shows the magnet position (coil center at 0), the flux linkage N Phi and the emf now.

## 3. Lenz's law (mode `lenz`)

- The induced current flows in the direction that opposes the change in flux that caused it [1] 13.2.
- Approaching north pole: the near face of the coil becomes a north pole (repels). Leaving north pole: the near face becomes a south pole (attracts). Same with S and N swapped [1] 13.2.
- Right-hand rule: seen head-on, a north face has counterclockwise current; a south face has clockwise current [1] 12.4, 13.2.
- Energy: the work done moving the magnet against the force becomes electrical energy, F v = emf x I, so the peak drag force is F = v (d(N Phi)/dx)^2 / R [1] 13.2, 13.3.
- Circuit resistance R = 5 ohm (coil plus galvanometer, chosen value). Peak current I = emf / R.
- The magnet moves 4 cm (center from -12 cm to -8 cm, or back) and is shown 20 times slower than real time.

Example at defaults: peak emf 6.46 mV, peak current 1.29 mA, peak force 8.35 μN.

## 4. Generator (mode `generator`)

| Item | Value or equation | Source |
|---|---|---|
| Flux linkage of a coil turning at omega | N Phi = N B A cos(omega t) | [1] 13.5 |
| emf | emf = N B A omega sin(omega t) | [1] 13.5 |
| Peak emf | N B A omega | [1] 13.5 |
| Angular frequency | omega = 2 pi f | [1] 13.5 |
| rms emf | peak/sqrt(2) (shown as peak/√2) | [4] 15.1 |
| Coil | area 100 cm^2 (10 cm x 10 cm, shown as 0.01 m²), 50, 100 or 200 turns | chosen values |
| Ranges | f 1 to 60 Hz, B 0.05 to 1 T | peak emf 0.157 V to 754 V |
| Grid frequency | 60 Hz in North America | [4] 15.1 |

Claims: the emf is largest when the coil is level with the field (flux changing fastest) and zero when the coil faces the field (flux largest); turning faster raises both the peak emf and the frequency [1] 13.5. The picture is slowed to half a turn per second. The bulb's brightness is only a visual cue. Example at defaults (100 turns, 0.2 T, 10 Hz): omega = 62.8 rad/s, period 100 ms, peak 12.6 V, rms 8.89 V, peak N B A = 0.2 Wb.

## 5. DC motor (mode `motor`)

| Item | Value or equation | Source |
|---|---|---|
| Force on a straight wire | F = I L B (wire at right angles to B), at right angles to both | [1] 11.4 |
| Force on each side of the coil | F = N I L B | [1] 11.5 |
| Torque on a current loop | tau = N I A B sin(theta), theta between the normal and B | [1] 11.5 |
| Coil | 50 turns, 5 cm x 5 cm (A = 25 cm^2) | chosen values |
| Ranges | I 0.1 to 5 A, B 0.05 to 1 T | F 0.0125 to 12.5 N, tau max 0.000625 to 0.625 N m |

Claims: a motor is a generator run backwards [1] 13.6; the two sides are pushed opposite ways, making a torque; the torque is largest when the coil is level with the field; without a commutator the torque reverses every half turn and the coil rocks and settles facing the field; a split-ring commutator reverses the current every half turn so the torque always turns the coil the same way [1] 11.5, [5]. The end view shows current out of the page with a dot and into the page with a cross, and the force arrows follow F = I L x B. Rotation is a visual model with friction, not to scale. Example at defaults (1 A, 0.3 T): F = 0.75 N, tau max = 0.0375 N m.

## 6. Transformer (mode `transformer`)

| Item | Value or equation | Source |
|---|---|---|
| Turns rule | Vs/Vp = Ns/Np | [1] 13.6 / [4] 15.6 |
| Ideal (no losses) | Vp Ip = Vs Is, so Ip/Is = Ns/Np | [4] 15.6 |
| Secondary current | Is = Vs / R (resistive load) | Ohm's law [6] 9.4 |
| Turns | primary 8 turns, secondary 4 (step-down) or 16 (step-up) | match the art |
| Ranges | Vp 1 to 240 V AC (rms), load 10 to 1000 ohm | chosen values |
| Graph | primary and secondary voltage at 60 Hz, same scale, 0 to 50 ms | display |

Claims: alternating current in the primary makes a changing flux in the iron core, which induces an emf in the secondary; stepping the voltage up steps the current down; steady DC makes no changing flux, so no output; real transformers have many more turns and lose a little energy as heat [4] 15.6. Example at defaults (120 V, 16 turns, 100 ohm): Vs = 240 V, Is = 2.4 A, P = 576 W, Ip = 4.8 A.

## 7. Colors and conventions

North poles are red and south poles blue (common classroom convention, from the art). Field arrows and dots are purple, current red, force blue. The galvanometer needle moves right for positive emf, defined as the emf that drives current whose field points along +x (to the right, away from the magnet's starting side).

## 8. Slider rule

Every slider except the angle is logarithmic over 200 steps with a positive minimum; the angle is linear from 5 to 85 degrees. No readout can be zero or change sign as a slider moves, so no shown value jumps by 2x or more between adjacent steps. `tests/induction-physics.test.mjs` sweeps every slider in every mode and option and checks every numeric readout. Values that depend on time (emf now, magnet position) are not slider readouts.

## Sources

1. OpenStax, University Physics Volume 2, chapters 11 (Magnetic Forces and Fields), 12 (Sources of Magnetic Fields) and 13 (Electromagnetic Induction). https://openstax.org/books/university-physics-volume-2/pages/13-1-faradays-law and https://openstax.org/books/university-physics-volume-2/pages/11-5-force-and-torque-on-a-current-loop
2. D. J. Griffiths, Introduction to Electrodynamics, 4th ed., section 5.4 (magnetic dipole vector potential). Also HyperPhysics, "Magnetic dipole moment". http://hyperphysics.phy-astr.gsu.edu/hbase/magnetic/magmom.html
3. K&J Magnetics, "Magnet grades" (N42 remanence about 1.3 T). https://www.kjmagnetics.com/magnet-grades.asp
4. OpenStax, University Physics Volume 2, chapter 15 (Alternating-Current Circuits), sections 15.1 and 15.6. https://openstax.org/books/university-physics-volume-2/pages/15-6-transformers
5. OpenStax, College Physics 2e, section 22.8 (Torque on a current loop: motors and meters). https://openstax.org/books/college-physics-2e/pages/22-8-torque-on-a-current-loop-motors-and-meters
6. OpenStax, University Physics Volume 2, section 9.4 (Resistance and resistivity, Ohm's law). https://openstax.org/books/university-physics-volume-2/pages/9-4-ohms-law
