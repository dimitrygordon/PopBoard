# Optics module: science reference

Every equation, constant, number and claim the Optics module (`public/study-optics.html`) shows to students, with sources. Code: `public/optics/optics-physics.js`. Tests: `tests/optics-physics.test.mjs` (`npm run test:optics`).

## Sources

- [OS-25.2] OpenStax College Physics 2e, 25.2 The Law of Reflection. https://openstax.org/books/college-physics-2e/pages/25-2-the-law-of-reflection
- [OS-25.3] OpenStax College Physics 2e, 25.3 The Law of Refraction (Table 25.1, index of refraction at 589 nm). https://openstax.org/books/college-physics-2e/pages/25-3-the-law-of-refraction
- [OS-25.4] OpenStax College Physics 2e, 25.4 Total Internal Reflection. https://openstax.org/books/college-physics-2e/pages/25-4-total-internal-reflection
- [OS-25.5] OpenStax College Physics 2e, 25.5 Dispersion: The Rainbow and Prisms (Table 25.2, index by color). https://openstax.org/books/college-physics-2e/pages/25-5-dispersion-the-rainbow-and-prisms
- [OS-25.6] OpenStax College Physics 2e, 25.6 Image Formation by Lenses. https://openstax.org/books/college-physics-2e/pages/25-6-image-formation-by-lenses
- [OS-25.7] OpenStax College Physics 2e, 25.7 Image Formation by Mirrors. https://openstax.org/books/college-physics-2e/pages/25-7-image-formation-by-mirrors
- [HECHT] E. Hecht, Optics, 5th ed., sec. 4.6 (Fresnel equations) and 5.5 (prisms, minimum deviation).
- [SI] BIPM, The International System of Units, 9th ed. (c is exact).

## Constants

| Quantity | Value shown | Source |
|---|---|---|
| Speed of light in vacuum c | 2.99792458 x 10^8 m/s (shown as 3.00 x 10^8 m/s) | [SI] |
| Air, n | 1.000293 | [OS-25.3] Table 25.1 |
| Water, n | 1.333 | [OS-25.3] Table 25.1 |
| Crown glass, n | 1.52 | [OS-25.3] Table 25.1 |
| Flint glass, n | 1.66 | [OS-25.3] Table 25.1 |
| Diamond, n | 2.419 | [OS-25.3] Table 25.1 |

Index by color, [OS-25.5] Table 25.2 (red 660 nm, orange 610 nm, yellow 580 nm, green 550 nm, blue 470 nm, violet 410 nm):

| Material | Red | Orange | Yellow | Green | Blue | Violet |
|---|---|---|---|---|---|---|
| Water | 1.331 | 1.332 | 1.333 | 1.335 | 1.338 | 1.342 |
| Crown glass | 1.512 | 1.514 | 1.518 | 1.519 | 1.524 | 1.530 |
| Flint glass | 1.662 | 1.665 | 1.667 | 1.674 | 1.684 | 1.698 |
| Diamond | 2.410 | 2.415 | 2.417 | 2.426 | 2.444 | 2.458 |

Air is treated as non-dispersive (n = 1.000293 for every color).

## Equations

1. Law of reflection: theta_r = theta_i, angles measured from the normal. [OS-25.2]
2. Snell's law: n1 sin(theta1) = n2 sin(theta2). [OS-25.3]
3. Speed in a material: v = c / n. [OS-25.3]
4. Critical angle: theta_c = sin^-1(n2 / n1), for n1 > n2. Past it, no refracted ray and 100% reflection. [OS-25.4]
5. Reflected fraction (unpolarized light, average of s and p Fresnel reflectances): R = (Rs + Rp) / 2, Rs = ((n1 cos t1 - n2 cos t2) / (n1 cos t1 + n2 cos t2))^2, Rp = ((n1 cos t2 - n2 cos t1) / (n1 cos t2 + n2 cos t1))^2. Example: air to water at 40 degrees gives about 2.4%. [HECHT]
6. Thin lens and mirror equation: 1/f = 1/d_o + 1/d_i. Magnification m = -d_i / d_o. Sign convention: f > 0 converging lens or concave mirror, f < 0 diverging lens or convex mirror; d_i > 0 real image, d_i < 0 virtual image; m < 0 inverted. [OS-25.6], [OS-25.7]
7. Mirror focal length: f = R / 2. [OS-25.7]
8. Prism (apex A = 60 degrees): r2 = A - r1, deviation delta = theta1 + theta_exit - A. Minimum deviation: n = sin((A + delta_min)/2) / sin(A/2), so delta_min = 2 sin^-1(n sin(A/2)) - A (with air index applied). Shown for yellow. [HECHT], [OS-25.5]

## Claims shown in text

- Angles are measured from the normal, the line at right angles to the surface. [OS-25.2]
- Light changes speed in a new material and bends at the boundary; into larger n it slows and bends toward the normal, into smaller n it bends away. [OS-25.3]
- Some light is always reflected at a boundary between different materials. [HECHT]
- Same material on both sides: no boundary, no bending, no reflection (R = 0, theta2 = theta1).
- A ray aimed at the center of a half-disc meets the curved face along the normal and does not bend there. [OS-25.4]
- Optical fibers and the sparkle of diamonds use total internal reflection. [OS-25.4]
- A converging lens brings parallel rays to the focal point F; three principal rays locate the image. [OS-25.6]
- A real image can be caught on a screen; a virtual image is found by tracing rays back and is seen by looking through the lens or into the mirror. [OS-25.6], [OS-25.7]
- A convex mirror always makes a smaller, upright, virtual image (car side mirrors). [OS-25.7]
- The index is slightly larger for violet than for red, so violet bends more and white light spreads into a spectrum. [OS-25.5]
- Diamond in a 60 degree prism traps the light: the internal angle at the second face always exceeds diamond's critical angle (about 24.4 degrees) for any incidence, since r1 <= 24.4 degrees means r2 >= 35.6 degrees. Derived from equations 2, 4 and 8.

## Model limits (also stated in the UI)

- Lenses and curved mirrors are ideal thin elements (paraxial, no aberration). Ray tracing uses the thin element rule: slope after = slope before - height / f.
- The lens and mirror bench draws the vertical axis stretched (3x to 6x, labeled in the corner). Numbers are not affected.
- Images farther than 150 cm are shown in words ("very far away"), not as a number.
- Slider ranges: angles 5 to 85 degrees (0.5 degree steps); prism incidence 20 to 85 degrees; object distance 5 to 80 cm; focal length 5 to 40 cm (both log scaled).
