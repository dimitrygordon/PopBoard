# Projectile Motion: science notes

Every equation, number and claim shown to students in `public/study-projectile.html`, with sources. Code: `public/projectile/projectile-physics.js` (no DOM). Tests: `tests/projectile-physics.test.mjs` (`npm run test:projectile` in `tests/`).

## Model and conventions

- Launch point at x = 0, height h above the flat ground where the ball lands. y is up. Angle theta is measured above the horizontal.
- h is the height of the muzzle (where the ball leaves). From "Ground", h = 0 and the cannon is drawn in a pit with its muzzle at ground level. The art (cannon, balls, cliff, tower, cart) is not to scale; the trajectory, ruler, height bars, bullseye size (1.5 m outer radius) and cart catch zone (plus or minus 1.5 m) are to scale.
- Uniform gravity g, flat ground, no wind, no spin, no Earth rotation or curvature.

## Ideal motion (no air)

Sources: OpenStax, *University Physics Volume 1*, section 4.3 "Projectile Motion" (https://openstax.org/books/university-physics-volume-1/pages/4-3-projectile-motion); Halliday, Resnick and Walker, *Fundamentals of Physics*, ch. 4.

| Quantity | Equation |
|---|---|
| Horizontal component | v_x = v cos theta (constant) |
| Vertical component at launch | v_y0 = v sin theta |
| Position | x = v_x t, y = h + v_y0 t - (1/2) g t^2 |
| Vertical velocity | v_y = v_y0 - g t |
| Speed | sqrt(v_x^2 + v_y^2) |
| Time to peak | t_peak = v_y0 / g |
| Peak height above ground | H = h + v_y0^2 / (2 g) |
| Time of flight (y back to 0) | T = (v_y0 + sqrt(v_y0^2 + 2 g h)) / g |
| Range | R = v_x T |
| Level ground (h = 0) | R = v^2 sin(2 theta) / g, H = v^2 sin^2(theta) / (2 g), T = 2 v sin(theta) / g |
| Landing speed | sqrt(v^2 + 2 g h) (energy conservation) |

Claims in the captions, all checked in tests:
- With no air the horizontal speed never changes and the vertical speed drops by g each second; the path is a parabola.
- On level ground 45 degrees gives the longest range, and complementary angles (for example 30 and 60 degrees) give the same range (sin 2 theta = sin(180 - 2 theta)).
- Launching from a height makes the best angle lower than 45 degrees (for 20 m/s from 20 m the best whole-degree angle is 35 degrees).
- At the peak the velocity is horizontal (v_y = 0), not zero.
- Strobe dots at equal time steps stay equally spaced horizontally and bunch up vertically near the peak.
- Range, peak height and flight time all scale as 1/g for the same launch, so the shape is the same parabola stretched. Moon: 9.81 / 1.6 = about 6.1 times Earth's range. Jupiter: 9.81 / 23.1 = about 0.42 times.

Example shown by default: 20 m/s at 45 degrees on Earth from the ground gives v_x = v_y0 = 14.1 m/s, t_peak = 1.44 s, T = 2.88 s, H = 10.2 m, R = 40.8 m.

## Air drag

Quadratic drag (high Reynolds number), opposite the velocity:

- F_drag = (1/2) rho C_d A v^2, A = pi d^2 / 4
- a = -g y_hat - (k/m) |v| v, with k = (1/2) rho C_d A
- Terminal speed v_t = sqrt(m g / k)
- Integrated with fixed-step 4th order Runge-Kutta (step = T_ideal / 2000), with linear interpolation to y = 0 at landing. With drag off it matches the closed form to 1e-4 (test).

Sources: NASA Glenn Research Center, "The Drag Equation" (https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/drag-equation/) and "Terminal Velocity" (https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/termvel/); Taylor, *Classical Mechanics*, ch. 2.

| Value | Used | Source |
|---|---|---|
| Sea-level air density | 1.225 kg/m^3 | International Standard Atmosphere, ICAO Doc 7488; NASA Glenn "Earth Atmosphere Model" |
| Sphere drag coefficient | 0.47 | Smooth sphere, subcritical Reynolds number. NASA Glenn "Shape Effects on Drag" (https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/shape-effects-on-drag/); Hoerner, *Fluid-Dynamic Drag* |
| Mars surface air density | about 0.020 kg/m^3 (caption only) | NASA NSSDCA Mars Fact Sheet |
| Venus surface air density | about 65 kg/m^3 (caption only) | NASA NSSDCA Venus Fact Sheet |

Claims in the captions, checked in tests for a basketball at 20 m/s and 45 degrees:
- With drag the path is not a parabola: it lands shorter (25.5 m versus 40.8 m), peaks lower, falls for longer than it rises and comes down steeper (about 56 degrees) than it went up.
- The best angle drops below 45 degrees (41 degrees for the basketball and the soccer ball at 20 m/s).
- Light, large balls feel drag most; the 6 lb iron cannonball keeps more than 97 percent of its ideal range at 20 m/s (40.0 m versus 40.8 m).
- Terminal speeds with these values: basketball 21.7 m/s, soccer ball 19.6 m/s, cannonball 125 m/s.

## Projectiles

| Ball | Mass | Diameter | Source |
|---|---|---|---|
| Cannonball (6 lb iron shot) | 2.72 kg (6 lb = 2.722 kg) | 8.71 cm, from d = (6 m / (pi rho_iron))^(1/3) with rho_iron = 7870 kg/m^3 | Iron density: CRC Handbook of Chemistry and Physics |
| Basketball (size 7) | 620 g | 23.9 cm | FIBA Official Basketball Rules, equipment: 567 to 650 g, circumference 749 to 780 mm |
| Soccer ball (size 5) | 430 g | 22 cm | IFAB Laws of the Game, Law 2: 410 to 450 g, circumference 68 to 70 cm |

## Gravity on each world

Earth uses standard gravity g_n = 9.80665 m/s^2 (shown as 9.81 m/s^2), the defined value (3rd CGPM, 1901; NIST, https://physics.nist.gov/cgi-bin/cuu/Value?gn). The others are the "Gravity" row of the NASA NSSDCA Planetary Fact Sheet (https://nssdc.gsfc.nasa.gov/planetary/factsheet/, updated 18 March 2025), equatorial surface gravity; for the gas and ice giants it is at the 1 bar pressure level because they have no solid surface.

| World | g (m/s^2) |
|---|---|
| Mercury | 3.7 |
| Venus | 8.9 |
| Earth | 9.81 (9.80665) |
| Moon | 1.6 |
| Mars | 3.7 |
| Jupiter | 23.1 |
| Saturn | 9.0 |
| Uranus | 8.7 |
| Neptune | 11.0 |
| Pluto | 0.7 |

In the Planets mode there is no air. In the sandbox, choosing a world other than Earth, Venus or Mars turns drag off (no meaningful surface air); drag can be turned back on and the density set by hand.

## Target challenge

- Bullseye: a vertical board at distance X, center height Y. The ball scores where its path crosses x = X. Outer radius 1.5 m; ring radii in proportion to the art (440, 360, 280, 200, 120, 50 of 440). Points from outer to inner: 1, 2, 3, 5, 8, 10. A ball that lands before reaching the board misses.
- Cart: caught if the landing point is within 1.5 m of the cart center.
- Targets are placed at a whole-meter distance from 12 m to 60 m, bullseye centers from 1.5 m to 7.5 m up. No drag in this mode; the hint shows R = v^2 sin 2 theta / g with g = 9.81 m/s^2.

## Sliders

Angle: 5 to 85 degrees in 1 degree steps. Everything else is logarithmic over 200 steps: speed 2 to 60 m/s, height 0.5 to 100 m (plus a Ground button for h = 0), g 0.5 to 30 m/s^2, C_d 0.1 to 1.5, air density 0.01 to 70 kg/m^3, mass 50 g to 10 kg, diameter 2 to 50 cm. A test sweeps every slider and checks that no shown value (the slider value, v_x, v_y, range, peak height, flight time, time to peak, landing speed, and the drag results) changes by 2x or more between adjacent steps.

## Limits of the model

- Flat ground and uniform g: fine for ranges much smaller than a planet's radius.
- Constant C_d: real balls show a drag crisis near Re of about 3 x 10^5 (C_d falls to about 0.1 to 0.2) and spin adds Magnus lift; both are ignored.
- No wind.
