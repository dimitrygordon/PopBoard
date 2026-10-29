# Orbits: science notes

Status: Solar System mode claims below are waiting for Tesla. Each line is marked TODO-TESLA until Tesla clears it. The playground's existing modes are not covered here.

## Solar System mode: model (`public/orbits/solar/so-model.js`)
- Units are AU, years and solar masses, so G = 4 pi^2 AU^3 / (Msun yr^2). A circular orbit at 1 AU around 1 solar mass takes 1 year at 2 pi AU/yr (about 29.8 km/s). TODO-TESLA
- Kepler's third law in these units: P^2 = a^3 / M, with P in years, a in AU, M in solar masses. TODO-TESLA
- Planet semi-major axes (AU): Mercury 0.387, Venus 0.723, Earth 1.000, Mars 1.524, Jupiter 5.203, Saturn 9.537, Uranus 19.19, Neptune 30.07. Source: NASA Planetary Fact Sheet. TODO-TESLA
- Planet masses (solar masses): Mercury 1.66e-7, Venus 2.45e-6, Earth 3.00e-6, Mars 3.23e-7, Jupiter 9.55e-4, Saturn 2.86e-4, Uranus 4.37e-5, Neptune 5.15e-5. Source: NASA Planetary Fact Sheet divided by 1.989e30 kg. TODO-TESLA
- The star is held fixed at the center; the planets pull on the star's frame only through the star and on each other directly. Leaving out the Sun's small wobble (mostly from Jupiter) is a simplification. TODO-TESLA
- Motion uses kick-drift-kick leapfrog with a step of 1/150 of the innermost planet's orbit (shorter during close passes), with 1e-4 AU softening. The real eight planets keep total energy to better than 1 part in a million over 1,000 simulated years (tested). TODO-TESLA
- "The Real solar system" button starts every planet on a circular orbit at its real distance. Real orbits are slightly elliptical (Mercury e = 0.21, the rest under 0.1). TODO-TESLA
- The Sandbox star mass runs from 0.5 to 2 solar masses. TODO-TESLA
- Speed runs from 0.25 to 100 simulated years per real second. At high speed a slow device falls behind real time rather than taking bigger, less accurate steps. TODO-TESLA

## Solar System mode: what counts as a crash, a fall or an escape
- Two planets merge when they come closer than 0.08 x r^0.6 AU (r = distance from the star). This is a display contact distance, picked so planets merge when their drawings touch; real planets are far smaller. Merges keep total mass and momentum (tested). TODO-TESLA
- A planet that comes within 0.15 AU of the star counts as falling in. The real Sun's radius is 0.00465 AU; 0.15 AU matches the drawn Sun. TODO-TESLA
- A planet that is unbound (kinetic plus potential energy above zero) and more than 80 AU out counts as thrown out of the system. TODO-TESLA
- Tap to place gives a circular orbit; a slingshot pull of 70 px launches at the local circular speed, up to twice that. Escape speed is sqrt(2) times circular speed, so a long pull can throw a planet out. TODO-TESLA

## Solar System mode: display
- "Not to scale." Distances are squeezed so the screen radius grows as r^0.4 (Mercury to Neptune is 78 times farther in reality, 5.7 times on screen), and every planet and the Sun are drawn far larger than they really are. Motion is computed in true distances. TODO-TESLA
- The Moon is drawn circling Earth on a small fixed circle; its real orbit (0.00257 AU, 27.3 days) is far too small to show at this scale. Caption: "Earth's Moon goes around once every 27.3 days." TODO-TESLA
- Faint gray rings mark the real planets' average distances for reference. TODO-TESLA
- Captions (Leo, Tesla cleared art 2026-10-29): Sun "Our star, with sunspots on its face."; Mercury "Heavily cratered, a lot like our Moon."; Venus "Thick clouds hide the surface."; Earth "Oceans, clouds and a polar cap."; Mars "Valles Marineris canyon and a polar cap."; Jupiter "The Great Red Spot is a storm wider than Earth."; Saturn "Rings of ice and rock, with gaps between them."; Uranus "Tipped on its side, rings and all."; Neptune "Dark spot as seen by Voyager 2 in 1989." TODO-TESLA
- Uranus is drawn as Leo's disk with the ring overlay on top, both centered on the disk center at the same scale. TODO-TESLA
