# Waves & Interference: science notes

Module: `public/study-waves.html`, physics in `public/waves/waves-physics.js`, tests in `tests/waves-physics.test.mjs`.
Every equation, constant and claim shown to students is listed here with its source. Numbers on screen are rounded to 3 significant figures.

## 1. Wave basics (mode `basics`)

| Item | Value or equation | Notes |
|---|---|---|
| Wave speed | v = f lambda | [1] 16.2 |
| Period | T = 1/f | [1] 16.2 |
| Wavelength | lambda = v/f | rearranged from v = f lambda |
| Slider ranges | A 0.5 to 5 cm, f 0.5 to 4 Hz, v 0.5 to 4 m/s | chosen so lambda (0.125 to 8 m) fits a 4 m view |
| Travelling wave | y = A sin(2 pi (x/lambda - f t)) | [1] 16.2 |

Claims: a wave carries energy, not the material, from place to place [1] 16.1. Amplitude is the largest displacement from rest, wavelength is the crest-to-crest distance, frequency is waves per second [1] 16.2. The wave speed is set by the medium, so changing f at a fixed speed changes lambda [1] 16.2. In a transverse wave the medium moves at right angles to the wave (rope, light); in a longitudinal wave it moves along it (sound in air), making compressions and rarefactions [1] 16.1, 17.1.

## 2. Reflection (mode `reflect`)

- Fixed end: the reflected pulse is inverted. Free end: it returns upright [1] 16.5. The model uses the method of images: the reflected pulse is a mirror pulse coming from x = 2L, with sign -1 (fixed) or +1 (free). At a fixed end the displacement is always zero; at a free end it momentarily reaches 2A.
- Speed and width do not change on reflection (same medium) [1] 16.5.
- Round trip time over the 1 m string: 2 x 1 m / v. Ranges: v 0.2 to 2 m/s, pulse width 3 to 15 cm.

## 3. Superposition (mode `superpose`)

- Displacements add point by point (superposition principle) [1] 16.5.
- Pulse 1 is fixed at 2 cm; pulse 2 is 0.2 to 1.6 cm on the same side (constructive) or opposite side (destructive). Height when centered together: A1 + A2 (signed), so 2.2 to 3.6 cm or 0.4 to 1.8 cm.
- Pulses pass through each other and keep their shapes [1] 16.5.

## 4. Standing waves (mode `standing`)

| Item | Value or equation | Source |
|---|---|---|
| Wave speed on a string | v = sqrt(T/mu) | [1] 16.3 |
| Linear density | mu = 5 g/m (0.005 kg/m), a heavy demo string | chosen value |
| Allowed wavelengths, both ends fixed | lambda_n = 2L/n | [1] 16.6 |
| Harmonic frequencies | f_n = nv/(2L) = n f1 | [1] 16.6 |
| Shape | y = 2A sin(kx) cos(wt), sum of two equal waves moving opposite ways | [1] 16.6 |
| Nodes, antinodes | n + 1 nodes (including the ends), n antinodes | [1] 16.6 |
| Ranges | tension 5 to 200 N, L 0.5 to 2 m, n = 1 to 6 | v = 31.6 to 200 m/s, f1 = 7.9 to 200 Hz, f6 up to 1,200 Hz |

Claims: more tension raises v and every harmonic; the animation is slowed (about 0.6 n cycles per second on screen) because real strings at these settings vibrate about 8 to over 1,000 times a second.

## 5. Two-source interference, ripple tank (mode `ripple`)

- Wave speed fixed at 0.25 m/s. This is representative of a shallow classroom ripple tank: shallow-water speed v = sqrt(g h) gives 0.25 m/s at h = 6.4 mm [3]. Real ripples of 1 to 2 cm wavelength are also affected by surface tension [3], so this is a model value.
- lambda = v/f; f 2 to 20 Hz gives lambda 1.25 to 12.5 cm. Source separation d 2 to 12 cm. Tank shown 50 cm x 34 cm.
- Path difference at the probe: |r1 - r2|. Constructive (antinodal) where |r1 - r2| = m lambda, destructive (nodal) where |r1 - r2| = (m + 1/2) lambda [2] 3.1, [1] 16.5. The readout calls a point constructive or destructive when it is within 0.1 lambda of those values, otherwise "in between".
- Dashed antinodal lines follow d sin(theta) = m lambda from the midpoint; this is exact far from the sources (the true lines are hyperbolas that approach these directions) [2] 3.1.
- Circular waves fade as 1/sqrt(r) because the energy spreads over a growing circle (2D intensity falls as 1/r).
- A plane wave through two gaps acts like two in-phase sources (Huygens's principle) [2] 1.7, 3.1. The gaps in the barrier art are drawn 0.3 d wide.
- The animation runs 4 times slower than real time.

## 6. Double slit (mode `slit`)

| Item | Value or equation | Source |
|---|---|---|
| Bright fringes | d sin(theta) = m lambda | [2] 3.1 |
| Dark fringes (two slits) | d sin(theta) = (m + 1/2) lambda | [2] 3.1 |
| Fringe spacing, small angle | dy = lambda L / d | [2] 3.1 |
| Position of first bright fringe (exact) | y1 = L tan(theta1) | geometry |
| Intensity | I = cos^2(pi d sin(theta)/lambda) x [sin(beta)/beta]^2, beta = pi a sin(theta)/lambda | [2] 3.2, 4.4 |
| Slit width in the double slit | a = 0.02 mm | chosen value |
| Single slit dark fringes | a sin(theta) = m lambda, m = 1, 2, ... | [2] 4.1 |
| Central band width (single slit) | 2 L tan(theta1) | geometry from [2] 4.1 |
| Ranges | lambda 400 to 700 nm, d (or a) 0.05 to 0.5 mm, L 0.5 to 5 m | visible light is roughly 380 to 750 nm [2] 1.1 |
| Screen | 12 cm wide | chosen value |

Example at defaults (650 nm, 0.25 mm, 2 m): theta1 = 0.149 degrees, spacing 5.2 mm. Beam and fringe colors use an approximate wavelength-to-sRGB mapping; they are a guide, not a colorimetric match. Vertical slits make vertical fringe stripes, so the screen shows vertical stripes (the style frame shows horizontal bands).

## 7. Beats (mode `beats`)

- Beat frequency f_beat = |f1 - f2| [1] 17.6. Fork 1 is 440 Hz (concert A4) [1] 17.3; the difference slider runs 0.5 to 20 Hz.
- The sum of two equal tones has envelope 2|cos(pi (f1 - f2) t)|: loud when in step, silent when out of step [1] 17.6.
- Musicians tune by removing beats [1] 17.6.

## 8. Doppler effect (mode `doppler`)

- Moving source, still air and listener: ahead f' = f0 v/(v - vs), behind f' = f0 v/(v + vs) [1] 17.7.
- Wavelength ahead (v - vs)/f0, behind (v + vs)/f0; the sound itself still travels at v.
- Speed of sound in dry air at 20 C: 343 m/s [1] 17.2. Source frequency 440 Hz. Source speed 1 to 300 m/s (below the speed of sound). The animation is not to scale in time.

## 9. Sandbox (mode `sandbox`)

Two travelling waves on one rope (amplitude 0.2 to 2 cm, frequency 0.2 to 4 Hz, shared speed 0.5 to 4 m/s, each moving left or right) and their sum. Equal waves moving opposite ways make a standing wave [1] 16.6; slightly different frequencies make beats [1] 17.6.

## 10. Slider rule

Every slider is logarithmic over 200 steps with a positive minimum, and no readout can be zero or change sign as a slider moves, so no shown value jumps by 2x or more between adjacent steps. `tests/waves-physics.test.mjs` sweeps every slider in every mode and option and checks every numeric readout.

## Sources

1. OpenStax, University Physics Volume 1, chapters 16 (Waves) and 17 (Sound). https://openstax.org/books/university-physics-volume-1/pages/16-introduction and https://openstax.org/books/university-physics-volume-1/pages/17-introduction
2. OpenStax, University Physics Volume 3, chapters 1 (The Nature of Light), 3 (Interference) and 4 (Diffraction). https://openstax.org/books/university-physics-volume-3/pages/3-1-youngs-double-slit-interference
3. HyperPhysics (Georgia State University), "Water waves" and "Shallow water waves". http://hyperphysics.phy-astr.gsu.edu/hbase/Waves/watwav2.html
