# Rocket Science & Space Mission module: science reference

Every equation, constant, number and claim the Rocket Science & Space Mission module (`public/study-rocket-mission.html`) shows to students, with sources. Code: `public/rocket-mission/rocket-physics.js`. Tests: `tests/rocket-physics.test.mjs` (`npm run test:rocket`).

## Sources

- [NASA-EARTH] NASA NSSDCA, Earth Fact Sheet (GM, mean radius, surface density, scale height). https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html
- [NASA-SUN] NASA NSSDCA, Sun Fact Sheet (GM of the Sun). https://nssdc.gsfc.nasa.gov/planetary/factsheet/sunfact.html
- [NASA-PLANETS] NASA NSSDCA, Planetary Fact Sheet (semimajor axes: Venus 108.2, Earth 149.6, Mars 227.9, Jupiter 778.5 million km). https://nssdc.gsfc.nasa.gov/planetary/factsheet/
- [IAU-2012] IAU 2012 Resolution B2: the astronomical unit is exactly 149 597 870 700 m.
- [SI] BIPM, The International System of Units, 9th ed. (standard gravity g0 = 9.80665 m/s^2, exact by definition).
- [GLENN-THRUST] NASA Glenn Research Center, Beginner's Guide to Rockets: Rocket Thrust, Newton's third law, specific impulse. https://www.grc.nasa.gov/www/k-12/rocket/rktthsum.html and https://www.grc.nasa.gov/www/k-12/rocket/specimp.html
- [OS-UP1-9.7] OpenStax University Physics Volume 1, 9.7 Rocket Propulsion (rocket equation). https://openstax.org/books/university-physics-volume-1/pages/9-7-rocket-propulsion
- [OS-UP1-13] OpenStax University Physics Volume 1, 13.3 Gravitational Potential Energy and Total Energy (escape velocity), 13.4 Satellite Orbits and Energy (orbital speed and period), 13.5 Kepler's Laws of Planetary Motion (equal areas, Hohmann transfer example). https://openstax.org/books/university-physics-volume-1/pages/13-introduction
- [NASA-SATURN] NASA Marshall, Saturn V News Reference, F-1 engine fact sheet (1,522,000 lbf = 6.77 MN sea-level thrust; Isp 263 s sea level, 304 s vacuum). Verified online: NASA NTRS, "Waking a Giant: Bringing the Saturn F-1 Engine Back to Life" (2014) lists 1,522,000 lbf sea level, 1,748,200 lbf vacuum, Isp 265.4 s sea level and 304.1 s vacuum: https://ntrs.nasa.gov/api/citations/20140011656/downloads/20140011656.pdf (the model keeps the commonly quoted 263 s sea-level value; 265.4 s is the as-measured figure in that paper).
- [NASA-RS25] NASA, RS-25 engine / Space Shuttle Main Engine (418,000 lbf = 1.86 MN sea-level thrust and 512,300 lbf = 2.28 MN vacuum thrust at 109% power; Isp 366 s sea level, 452 s vacuum). Numbers verified on the L3Harris (formerly Aerojet Rocketdyne) RS-25 engine specification page: https://www.l3harris.com/all-capabilities/rs-25-engine . Background: https://www.nasa.gov/reference/space-launch-system-rs-25-core-stage-engine/
- [NASA-SRB] NASA, Space Shuttle Solid Rocket Boosters (Isp about 242 s sea level, 268 s vacuum). Verified: B. J. Cantwell, Stanford AA283 ch. 10, Solid Rockets (Shuttle SRB: sea level 242 s, vacuum 268 s): https://web.stanford.edu/~cantwell/AA283_Course_Material/AA283_Lectures/AA283_Chapter_10_Solid_Rockets_Brian_J_Cantwell_2024.pdf
- [SPACEX-F9] SpaceX, Falcon 9 vehicle page and user's guide (Merlin 1D Isp 282 s sea level, 311 s vacuum, verified on the archived SpaceX Falcon 9 page: https://web.archive.org/web/20130501002858/http://www.spacex.com/falcon9.php ; Merlin Vacuum 981 kN, Isp 348 s; core diameter 3.7 m).
- [CURTIS] H. D. Curtis, Orbital Mechanics for Engineering Students, 4th ed.: ch. 2 (conics), 8.2 to 8.4 (Hohmann transfers, synodic period, departure from a parking orbit), 11.3 to 11.6 (gravity turn, gravity and drag losses, optimal staging).
- [SUTTON] G. P. Sutton and O. Biblarz, Rocket Propulsion Elements, 9th ed., ch. 2 and 4 (thrust, Isp, flight performance, about 9.3 to 9.5 km/s total to low Earth orbit including losses).
- [NASA-MARS] NASA Mars Exploration: launch windows to Mars open about every 26 months. https://mars.nasa.gov/mars2020/timeline/launch/
- [NASA-ISS] NASA, International Space Station facts: about 400 km up, about 7.66 km/s, an orbit about every 92 to 93 minutes. https://www.nasa.gov/reference/international-space-station-facts-and-figures/
- [NASA-MARS-FACT] NASA NSSDCA, Mars Fact Sheet (surface gravity 3.71 m/s^2, surface density about 0.020 kg/m^3). https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html (Mars Lander mode, Cleared by Tesla 2026-10-29)
- [FAI] Federation Aeronautique Internationale: 100 km (the Karman line) is the commonly used edge of space.

## Constants

| Quantity | Value | Source |
|---|---|---|
| Standard gravity g0 | 9.80665 m/s^2 (exact) | [SI] |
| GM of Earth | 3.986004418 x 10^14 m^3/s^2 | [NASA-EARTH] |
| Earth mean radius | 6371 km | [NASA-EARTH] |
| Surface air density | 1.217 kg/m^3 | [NASA-EARTH] |
| Atmospheric scale height | 8.5 km | [NASA-EARTH] |
| GM of the Sun | 1.32712440018 x 10^20 m^3/s^2 | [NASA-SUN] |
| Astronomical unit | 149 597 870 700 m (exact) | [IAU-2012] |
| Orbit radii (circular, coplanar): Venus, Earth, Mars, Jupiter | 0.723, 1.000, 1.524, 5.203 AU | [NASA-PLANETS] |

## Engines

| Engine | Isp sea level | Isp vacuum | Thrust used | Source |
|---|---|---|---|---|
| Space Shuttle SRB (solid fuel) | 242 s | 268 s | | [NASA-SRB] |
| F-1, Saturn V first stage (kerosene and liquid oxygen) | 263 s | 304 s | 6.77 MN sea level | [NASA-SATURN] |
| RS-25, Space Shuttle and SLS (liquid hydrogen and liquid oxygen) | 366 s | 452 s | 1.86 MN sea level, 2.28 MN vacuum (109% power) | [NASA-RS25] |
| Merlin 1D-like core engine (model) | 282 s | 311 s | 2.5 MN sea level each (model, rounded) | [SPACEX-F9] for Isp |
| Merlin Vacuum-like upper stage (model) | | 348 s | 981 kN | [SPACEX-F9] |

## Equations

1. Thrust (Newton's third law): F = mdot x ve. [GLENN-THRUST]
2. Weight: W = m g0. Thrust-to-weight ratio F/W; the rocket lifts off only when F/W > 1. [GLENN-THRUST]
3. Starting acceleration: a = (F - W)/m (printed when F/W >= 1.1; between 1 and 1.1 the page says it "creeps off the pad"). Newton's second law.
4. Specific impulse: Isp = ve/g0, so ve = g0 x Isp. [GLENN-THRUST]
5. Tsiolkovsky rocket equation: delta-v = ve ln(m0/mf). [OS-UP1-9.7]
6. Fuel share of liftoff mass: 1 - mf/m0 = 1 - 1/R.
7. Mass ratio needed for a delta-v: R = exp(delta-v/ve).
8. Staging comparison (same liftoff mass, payload share p, structure share eps of each stage, same ve):
   one stage R1 = 1/(p + eps(1 - p)); two equal stages, each with payload share sqrt(p), R2 = 1/(sqrt(p) + eps(1 - sqrt(p))); delta-v1 = ve ln R1, delta-v2 = 2 ve ln R2. Equal stages are the optimum for identical stages. [CURTIS 11.6]
   Two stages beat one whenever eps > 0: (sqrt(p) + eps(1 - sqrt(p)))^2 - (p + eps(1 - p)) = eps(1 - sqrt(p))^2 (eps - 1) < 0 (tested).
9. Circular orbital speed: v = sqrt(GM/r). Period: T = 2 pi sqrt(a^3/GM). Gravity at radius r: g = GM/r^2. [OS-UP1-13]
10. Escape speed: v_esc = sqrt(2GM/r) = sqrt(2) x circular speed (about 1.41 times). [OS-UP1-13]
11. Orbit from a horizontal shot (conic): energy eps = v^2/2 - GM/r, h = r v, e = sqrt(1 + 2 eps h^2/GM^2), p = h^2/GM, r(nu) = p/(1 + e cos nu). [CURTIS ch. 2]
12. Kepler's second law: the drawn craft is timed so the line to Earth's center sweeps equal areas in equal times (dt proportional to r^2 dnu). [OS-UP1-13]
13. Hohmann transfer between circular coplanar orbits r1, r2 around the Sun: a_t = (r1 + r2)/2; delta-v1 = |sqrt(GM(2/r1 - 1/a_t)) - sqrt(GM/r1)|, delta-v2 = |sqrt(GM/r2) - sqrt(GM(2/r2 - 1/a_t))|; trip time = pi sqrt(a_t^3/GM). [CURTIS 8.2], [OS-UP1-13]
14. Phase angle at departure: target ahead of Earth by pi - n2 x t_transfer (n2 = target's angular rate). Synodic period 2 pi/|n1 - n2|. [CURTIS 8.3]
15. Burn from a circular parking orbit at r_p: delta-v = sqrt(v_inf^2 + 2GM/r_p) - sqrt(GM/r_p), with v_inf = delta-v1 above (the Oberth effect). [CURTIS 8.4]
16. Air density: rho = 1.217 exp(-h / 8.5 km) kg/m^3. Drag D = 1/2 rho v^2 Cd A. [NASA-EARTH]
17. Gravity loss: integral of g sin(gamma) dt while the engines burn (gamma = flight path angle). Drag loss: integral of D/m dt. [CURTIS 11.3]
18. Thrust changes with altitude: ve = g0 (Isp_vac - (Isp_vac - Isp_sl) rho/rho0), constant mass flow. (Engine thrust grows as outside pressure drops [GLENN-THRUST]; pressure is taken proportional to density, a simplification.)

## Launch model (Launch and Sandbox)

2D point mass over a round, non-rotating Earth with inverse-square gravity and the exponential atmosphere above; step 0.2 s.
Guidance: straight up to 60 m/s, then the velocity is tipped toward downrange by the chosen angle (0.4, 2 or 5 degrees) and thrust follows the velocity (a gravity turn). The upper stage steers to hold about 200 km, and cuts off when the lowest point of the orbit reaches 200 km (or 90% of the current height if lower). A fairing or escape tower is dropped above 110 km. "In orbit" means the lowest point is at least 120 km (a model threshold: lower orbits decay quickly from drag). [CURTIS 11.3]

Launch preset (rounded, Falcon-9-like; model values, not a specific vehicle): first stage 395 t propellant, 22 t tank structure, three 2.5 MN engines (3 t), 1 t interstage; upper stage 92 t propellant, 4 t dry, 981 kN, Isp 348 s; fairing 1.9 t; payload 10 t. Liftoff mass 528.9 t, thrust-to-weight 1.45, ideal delta-v 10.7 km/s (uses vacuum Isp for every stage; with the first stage at sea-level Isp 282 s it is about 10.3 km/s), core diameter 3.66 m, Cd 0.4.
Results shown with the medium tip (2 degrees): orbit about 198 x 208 km, top speed 7.79 km/s, gravity loss about 1.5 km/s, drag loss about 0.03 km/s (real rockets lose about 0.1 to 0.15 km/s to drag; this model is simplified, and the readout says so). Small tip (0.4 degrees): too steep, runs out of fuel before reaching orbit. Big tip (5 degrees): stays low in thick air and falls back.
Sandbox parts (model values): tanks small/medium/large 100/200/395 t propellant with 7/12/22 t structure; one 2.5 MN engine (1 t) or a three-engine cluster (3 t); two strap-on solid boosters each 40 t propellant, 6 t dry, 1.5 MN sea level, Isp 242/268 s, 1.37 m wide; fins 0.5 t and +0.1 on Cd; nose cones 0.3 t (ogive) and 0.25 t (conical); fairing 1.9 t; capsule escape tower 4.0 t; upper stage as above. In this model fins only add mass and drag (real rockets mostly steer by gimballing their engines [SUTTON]).

## Claims shown to students

- A rocket throws mass out of its nozzle; by Newton's third law the exhaust pushes the rocket with an equal and opposite force. Rockets do not push on the ground or the air, so they work in space. [GLENN-THRUST]
- As a rocket burns fuel it gets lighter, so each kilogram of exhaust speeds it up more than the last. Because of the logarithm, doubling the mass ratio adds only a fixed amount of delta-v (ve ln 2). [OS-UP1-9.7]
- Low Earth orbit needs about 9.4 km/s of delta-v including gravity and drag losses (orbital speed is about 7.8 km/s). [SUTTON] (textbook figure; no online copy verified.)
- Staging drops empty tanks and engines so the remaining fuel pushes less mass. [CURTIS 11.6]
- Gravity turn: climb fights gravity (gravity loss), the thick lower air causes drag loss; orbit is about going sideways fast enough that the ground curves away as fast as you fall. [CURTIS 11.3], [OS-UP1-13]
- 100 km is the commonly used edge of space. [FAI]
- Newton's cannonball: below circular speed it falls back; at circular speed it circles; faster gives an ellipse; at escape speed it never comes back; the craft moves fastest nearest Earth. [OS-UP1-13]
- Hohmann transfer: the cheapest common two-burn path between circular orbits; half an ellipse; you must leave when the target will be at the meeting point; the alignment repeats once per synodic period (the launch window). Real orbits are slightly tilted ellipses. [CURTIS 8], [NASA-MARS]

## Numbers students see (defaults and presets)

- Thrust default (slider-snapped): 299 kg/s x 3000 m/s = 898 kN; a 59.6 t rocket weighs 585 kN; F/W 1.53; starting acceleration 5.2 m/s^2; Isp 306 s. "Load a real engine" (sea level, snapped to slider steps): F-1 2580 m/s x 2601 kg/s = 6.71 MN (Isp 263 s); RS-25 3590 m/s x 517 kg/s = 1.86 MN (Isp 366 s). The exhaust-speed slider moves in 10 m/s steps so 3590 m/s is reachable. On-screen wording: "F-1 at sea level: about 6.7 MN (the real engine made 6.77 MN; the slider rounds it)." "RS-25 at sea level: about 3,590 m/s exhaust speed (Isp about 366 s), about 1.86 MN of thrust." "RS-25: about 1.86 MN at sea level and about 2.28 MN in space, at 109% power."
- Rocket equation default: F-1 vacuum ve 2981 m/s, mass ratio 7.98 gives 6.19 km/s and the rocket is 87% fuel.
- Launch target altitude default 400 km (the altitude slider moves in 10 km steps): circular speed 7.67 km/s, period 92.4 min (92.41 min from GM 3.986004418e14 and R 6371 km; 92.5 min would need about 402 km), gravity 8.69 m/s^2.
- Orbits default: 7.70 km/s horizontal at 400 km gives a slight ellipse with a highest point near 498 km and a 93.4 min period.
- Rocket equation: ve = 2628 (SRB), 2981 (F-1), 4433 (RS-25) m/s. Mass ratio for 9.4 km/s: 35.8 (SRB), 23.4 (F-1), 8.34 (RS-25).
- Staging default (F-1 Isp, payload 2%, structure 10%): one stage 6.37 km/s, two stages 8.83 km/s.
- Orbits: at 400 km, circular speed 7.67 km/s, escape speed 10.9 km/s, period 92.4 min, gravity 8.69 m/s^2 (matches [NASA-ISS]). Escape speed at Earth's surface 11.2 km/s.
- Hohmann Earth to Mars: delta-v1 2.95 km/s, delta-v2 2.65 km/s, 259 days (8.5 months), Mars 44.4 degrees ahead at launch, windows every 780 days (2.13 years, about 26 months, matching [NASA-MARS]); from a 300 km parking orbit 3.59 km/s. Venus: 146 days, Venus must be about 54 degrees behind Earth. Jupiter: 997 days (about 2.7 years), Jupiter 97 degrees ahead.

## Mars Lander mode (`?mode=mars-lander`)

Status: every claim and number in this section was cleared by Tesla on 2026-10-29. Code: `public/rocket-mission/lander/ml-model.js` (physics and rules), `ml-scene.js` (drawing), `ml-ui.js` (page). Tests: `tests/mars-lander.test.mjs` (`npm run test:marslander`).

### Physics
- Mars surface gravity is 3.71 m/s^2, about 38% of Earth's 9.81 m/s^2. Source: [NASA-MARS-FACT] https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html Cleared by Tesla 2026-10-29
- Mars surface air density is about 0.020 kg/m^3, about 1.6% of Earth's 1.225 kg/m^3 at sea level. Copy: "Mars air is less than 2% as dense as Earth's, so it barely slows the lander." Source: [NASA-MARS-FACT]. Cleared by Tesla 2026-10-29
- Sandbox worlds: Moon 1.62 m/s^2 with no air, Earth 9.81 m/s^2 with 1.225 kg/m^3. Cleared by Tesla 2026-10-29
- Drag is a = 0.5 rho Cd A v^2 / m, opposite the velocity, with Cd A = 12 m^2. Cleared by Tesla 2026-10-29
- Thrust points along the lander's axis: a tilt of theta sends sin(theta) of the thrust sideways and cos(theta) upward. Cleared by Tesla 2026-10-29
- Fuel use is mdot = F / (Isp g0). With F = 6,000 N and Isp = 225 s (a hydrazine engine like the ones on Viking and Phoenix), mdot is about 2.72 kg/s, so 200 kg lasts about 73.5 s of full burn. Cleared by Tesla 2026-10-29
- Lander: 600 kg dry, 200 kg of fuel, one 6,000 N engine, on or off. Thrust to weight on Mars at the start is 6,000 / (800 x 3.71) = 2.02, so the engine can stop the fall; the Sandbox shows the same lander on Earth (0.76) cannot. Cleared by Tesla 2026-10-29
- Turning is limited to 60 degrees per second and 45 degrees either way. Cleared by Tesla 2026-10-29
- Motion uses semi-implicit Euler at 120 steps per second. Cleared by Tesla 2026-10-29
- Mission start: 170 m above the ground, falling 12 m/s and drifting 5 m/s right, about 100 m left of the pad centre. Cleared by Tesla 2026-10-29

### What counts as a landing
- Safe touchdown: 3 m/s or slower going down, 1.5 m/s or slower sideways, and within 10 degrees of upright when the first footpad touches. Anything else is a crash ("too fast", "sliding sideways" or "tipped over"). For scale, Phoenix touched down at about 2.4 m/s. Cleared by Tesla 2026-10-29
- On the pad: both footpads over the 60 m slab. Cleared by Tesla 2026-10-29
- Soft: 1.5 m/s or slower going down. Cleared by Tesla 2026-10-29

### Medals (Mission tab only; see docs/fun-challenges.md)
- Bronze: land safely anywhere. Cleared by Tesla 2026-10-29
- Silver: land safely on the pad. Cleared by Tesla 2026-10-29
- Gold: soft landing (1.5 m/s or slower) on the pad with at least 60% of the fuel left (`FUN.goldFuel`). The built-in autopilot used by the tests lands at about 0.9 m/s with about 75% left. Cleared by Tesla 2026-10-29

### Display
- "Lander and pad not to scale." The lander is modelled 24 m wide and drawn 1.5 times larger (`DRAW_SCALE`, 36 m), about six times a real Mars lander; the pad is modelled 60 m wide and drawn 90 m wide, so both read on a phone. Physics and the on-pad check use the model sizes. The ground outline comes from the top edge of Leo's terrain strip, which spans the 240 m wide world. After touchdown or a crash the view pans (snaps with reduced motion) so the ground sits two thirds of the way down the stage. Cleared by Tesla 2026-10-29
- Engine glow and landing dust are drawn with radial gradients. Cleared by Tesla 2026-10-29
