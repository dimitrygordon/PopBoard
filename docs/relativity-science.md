# Relativity: science notes

Status: Cleared by Tesla 2026-10-29. This file starts with the Lightspeed Ride mode (`?mode=lightspeed-ride` of `study-relativity.html`). Every claim and number below has Tesla's sign-off. Source: `public/relativity/lightspeed/ls-model.js`.

## Lightspeed Ride: model
- The ship moves at a steady speed beta = v/c straight ahead. The pilot looks along the direction of motion. Cleared by Tesla 2026-10-29
- The throttle adds equal rapidity for equal pushes: beta = tanh(3.80 s) for slider position s from 0 to 1, so the top speed is 0.999 c (gamma about 22.4). The ship can never reach c. Cleared by Tesla 2026-10-29
- gamma = 1 / sqrt(1 - beta^2). The speedometer shows beta, the fraction of c. Cleared by Tesla 2026-10-29
- The sky is 900 made-up stars spread evenly over the whole sphere, with temperatures from 3,200 K to 12,000 K. They are so far away that the ship's motion does not move them (no parallax). Cleared by Tesla 2026-10-29

## Aberration (stars bunch forward)
- A star at angle theta from straight ahead in the stars' rest frame appears at theta' with cos(theta') = (cos(theta) + beta) / (1 + beta cos(theta)). Cleared by Tesla 2026-10-29
- A star straight off to the side in the rest frame (theta = 90 degrees) appears at cos(theta') = beta, so sin(theta') = 1/gamma. At 0.9 c it sits about 26 degrees from straight ahead. Cleared by Tesla 2026-10-29
- For an even sky, the share of stars seen within a cone of half angle a around straight ahead is (1 - c0)/2 with c0 = (cos(a) - beta) / (1 - beta cos(a)). For a = 45 degrees it is about 15% at rest and reaches half at beta = cos(45 degrees), about 0.707. Cleared by Tesla 2026-10-29
- Even at speeds close to c, stars from behind the ship move forward and some appear in the side windows and windshield; nothing is lost from the sky, it is only squeezed toward the front. Cleared by Tesla 2026-10-29

## Doppler shift (colors change)
- The Doppler factor is D = gamma (1 + beta cos(theta)) = 1 / (gamma (1 - beta cos(theta'))). Seen frequencies are multiplied by D. Cleared by Tesla 2026-10-29
- Ahead of the ship D > 1 (blueshift); the boundary where D = 1 is at cos(theta') = (1 - 1/gamma) / beta; behind it D < 1 (redshift). Cleared by Tesla 2026-10-29
- A blackbody spectrum at temperature T, Doppler shifted by D, is again a blackbody spectrum at temperature D T. Star colors use T' = D T, clamped to 1,000 K to 40,000 K, through an approximate blackbody-to-sRGB fit (Tanner Helland). Real very hot shifted stars move most of their light into the ultraviolet; the clamp hides that. Cleared by Tesla 2026-10-29
- Brightness on screen scales as D^2 (the energy flux from a point-like star), capped between 0.02 and 6 so the picture stays readable. Sources: McKinley & Doherty, Am. J. Phys. 47, 309 (1979); Rybicki & Lightman, Radiative Processes in Astrophysics, ch. 4. Cleared by Tesla 2026-10-29

## Display (not physics)
- The speed dust streaming out of the middle is illustrative only. Real space would show nothing like it. It is off in reduced motion and can be switched off in Sandbox. Cleared by Tesla 2026-10-29
- About 60 degrees from straight ahead fits across the windshield. Stars farther out than about 83 degrees from straight ahead are not drawn. Cleared by Tesla 2026-10-29
- Reduced motion shows still before and after views (rest on the left, current speed on the right). In both themes the view through the window panes is black space with true star colors; only the cockpit frame, page and panel follow the Paper theme. Cleared by Tesla 2026-10-29
