# Ripple Tank: science notes

Status: Cleared by Tesla 2026-10-29. Every number and claim below has Tesla's sign-off.

## Model
- The water surface follows the 2D wave equation, solved on a grid with leapfrog finite differences and a 9-point Laplacian (rings stay round on a coarse grid). Cleared by Tesla 2026-10-29
- Wave speed is fixed at 24 cm/s, a typical value for shallow-water ripples a few mm deep. Real ripple speed depends on depth and, at short wavelengths, on surface tension; we hold it fixed so only frequency changes the wavelength (the "About" note says so). Source: Lighthill, Waves in Fluids (Cambridge University Press), gravity-capillary dispersion: ripple phase speed has a minimum of about 23 cm/s, and the shallow-water speed sqrt(gh) is about 22 cm/s at 5 mm depth, so 24 cm/s sits just above both. Cleared by Tesla 2026-10-29
- lambda = v / f. Frequency runs 3 to 10 Hz, so lambda runs 8 cm to 2.4 cm. Cleared by Tesla 2026-10-29
- The tank is 40 cm long; its short side follows the screen shape (0.45 to 0.8 of the long side). Cleared by Tesla 2026-10-29
- A soft "sponge" border about 5 cm wide soaks up waves so they do not bounce back, like the sloped beaches in a real tank. Only this outer border absorbs. Slit walls and blocks are hard edges that hold the water still, so waves reflect off them as they do off a real barrier (tested in `tests/ripple-tank.test.mjs`). Cleared by Tesla 2026-10-29
- Dippers are point sources driven in step (same frequency and phase). The straight dipper makes a plane wave. Cleared by Tesla 2026-10-29
- An auto gain scales the shading to the overall wave height in the tank, so ripples stay visible at any frequency. Ripples from a dipper still get smaller with distance, as in a real tank. Cleared by Tesla 2026-10-29

## Interference (two dippers)
- Dark (nodal) lines sit where the path difference is (m + 1/2) lambda. Since a path difference can never be more than the dipper spacing d, the number of dark lines is 2 floor(d/lambda + 1/2). Cleared by Tesla 2026-10-29
- Bright (antinodal) lines: path difference m lambda, count 2 ceil(d/lambda) - 1. Cleared by Tesla 2026-10-29
- The "Nodal lines" view tints places where the time-averaged wave energy is below 5% of twice the tank average. This is a display threshold, not a physical one. With a slit wall, the water past the wall is compared with its own average (and shaded with its own gain), so the weaker diffracted ripples stay visible. Student wording: "Dark lines: here a crest from one dipper always meets a trough from the other, so the water stays almost still." Cleared by Tesla 2026-10-29

## Diffraction
- A gap narrower than about one wavelength makes the wave spread out widely behind it; a wide gap lets it pass mostly straight. The Silver goal uses a/lambda <= 1. Cleared by Tesla 2026-10-29
- Two narrow slits act as two in-phase sources, giving the double-slit fan of bright and dark bands; d sin(theta) = m lambda for the bright bands. Gold needs a/lambda <= 1 and d/lambda >= 2. Cleared by Tesla 2026-10-29

## Display
- Slow motion shows the tank 4 times slower than real time. Cleared by Tesla 2026-10-29
- Light bands are crests and dark bands are troughs (the shading of a real ripple tank's projected light, simplified). The accent marks the highest crests, or the nodal lines when that view is on. Cleared by Tesla 2026-10-29

## Performance
- The grid has 200 cells along the long side (0.2 cm per cell). If frames stay slower than about 24 ms for 45 frames in a row it drops to 150, 110, then 80 cells, and steps back up after a long run of fast frames. At 80 cells the shortest wavelength is about 5 cells, so patterns get blurrier. At most 8 steps run per frame, so a slow device runs the tank slower instead of freezing. Cleared by Tesla 2026-10-29
