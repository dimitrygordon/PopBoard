# Orbit Lab and Kepler and Circles

Scaffold on `feat/gravity-orbits`. Not pushed. Merge only after Dimitry OKs a single production ship.

## Deep links

These are the five unit "Explore in 3D" starting states. Paths are relative to the site root (for example `https://popboard.us/` or a local `http://127.0.0.1:PORT/`).

| Lesson | Module | URL |
|---|---|---|
| L1 S8 | Orbit Lab | `study-orbit-lab.html?preset=l1-s8` |
| L2 S5 | Kepler and Circles | `study-kepler-circles.html?preset=l2-s5` |
| L3 S6 | Kepler and Circles | `study-kepler-circles.html?preset=l3-s6` |
| L4 S6 | Orbit Lab | `study-orbit-lab.html?preset=l4-s6` |
| L5 S8 | Orbit Lab | `study-orbit-lab.html?preset=l5-s8` |

Optional, not one of the five lesson links: `study-orbit-lab.html?preset=l5-s12` (ISS, GPS, GEO after the S12 calculations) and `study-kepler-circles.html?preset=jupiter-moons`. Aliases `l1`, `l2`, `l3`, `l4`, and `l5` are accepted.

## L1 speed cap (Tesla)

On a curved inverse-square Earth, a faster horizontal lob stays up slightly longer than a slower one, which would fight the Lesson 1 key (equal fall times). The L1 slider is therefore capped so both demonstration shots are short lobs that land near the mountain.

Constants from Tesla-verified `orbits.json`: `GM_E = 3.98e14 m^3/s^2`, `R_E = 6.38e6 m`. Teaching cannon height `h = 8 km` (schematic mountain, not a measured summit). The cap still keeps the time gap well under 1% for heights from 1 km to 1000 km.

Method: exact Kepler transfer from apoapsis at `r = R_E + h` to the first intersection with the spherical Earth.

| Shot | Speed | Flight time | Range | Arc | Fraction of circumference |
|---|---|---|---|---|---|
| Slow | 300 m/s | 40.523 s | 12.152 km | 0.109 deg | 0.030% |
| Faster (cap) | 600 m/s | 40.612 s | 24.357 km | 0.219 deg | 0.061% |

Time difference: 0.088 s, or **0.218%**. With `GM_E` and `R_E` each shifted by 0.5% (and with the deck product `G M = 6.67e-11 * 5.97e24`), the gap stays between 0.216% and 0.220%. At a 1000 km cannon height it is 0.258%. Orbit and escape are locked out of this preset.

## Asset paths the scaffold already looks for

Copy Angelo's files into the matching folder. Meshopt GLBs are preferred; a plain `.glb` is a fallback. The existing vendor loader is `public/vendor/three/GLTFLoader.js` plus `meshopt_decoder.mjs`. A procedural globe, stars, and markers stand in until the files arrive.

### Orbit Lab (`public/orbit-lab/assets/`)

- `orbits.json` (already copied from `/workspace/angelo/gravity-orbits/orbits.json`)
- `lesson-presets.json`
- Skybox, first match: `skybox.webp`, `skybox.jpg`, `skybox.png`, `skybox.hdr`
- `models/earth.meshopt.glb` or `earth.glb` (1 unit = 1 Earth radius)
- `models/newton_cannon.meshopt.glb` or `newton_cannon.glb`
- `models/iss.meshopt.glb`, `hubble.meshopt.glb`, `gps.meshopt.glb`, `geo_comsat.meshopt.glb` (meters, Y-up)
- `models/moon.meshopt.glb` (radius 1 = 1 lunar radius; scale by 1737.4 / 6380 against Earth)

### Kepler and Circles (`public/kepler-circles/assets/`)

- `kepler.json` (already copied)
- `lesson-presets.json`
- Same skybox names as above
- `models/sun.glb` (radius 1 = 1 solar radius)
- `models/earth.glb`, `mars.glb`, `comet.glb` (comet: 1 unit = 1 km)
- `models/stopper.glb` (1 unit = 1 m) for L2
- `models/jupiter.glb`, `io.glb`, `europa.glb`, `ganymede.glb`, `callisto.glb`

Earth GLB units and satellite units follow Angelo's `orbits.json` `units` field. Kepler body units follow `kepler.json` `units`.
