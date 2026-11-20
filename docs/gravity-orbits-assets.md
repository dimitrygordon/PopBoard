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

## Shared 3D assets

Meshes and the skybox live in `public/gravity-orbits/`. A small name map, `public/gravity-orbits/asset-map.json`, points lesson kinds (`earth`, `moon`, `iss`, `cannon`, …) at Angelo's filenames (`earth_2k.glb`, `newton_cannon.glb`, …). Both modules load that map and keep procedural placeholders if a file is missing. Files are referenced by name so later Earth material updates can drop in under the same filenames; nothing is baked into the modules.

Default planet/moon maps are the 2k (mobile) variants. 4k planet GLBs and the Earth night maps are not shipped.

### Units

- Planets and moons: radius 1 = that body's radius. Scale the Moon vs Earth by 1737.4 / 6380.
- Spacecraft: meters, Y-up. Orbits are drawn to true scale; the craft meshes are enlarged and labeled not to scale.
- `newton_cannon.glb`: Earth radii, exaggerated mountain about 0.30 R_E, not to scale. The cannon GLB's own `earth_surface` is hidden in favor of `earth_2k.glb`. Teaching flight times still use the 8 km Tesla geometry.
- Comet: 1 unit = 1 km, `dust_tail` along +X (pointed away from the Sun, hidden by default).
- Stopper: 1 unit = 1 m, keep the `string_attach` empty.

### Skybox

- Desktop: `models/starmap_2020_4k.jpg` (NASA SVS Deep Star Maps 2020, 4096×2048, 3.17 MB).
- Mobile (`max-width: 600px`): `models/starmap_2020_2k.jpg`, a 2048×1024 downscale (~516 KB) generated from the 4k file.

### Skipped

- `earth_night_2k.jpg` is not used. A correct dark-side-only night shader would replace or hook Earth's material, and later Earth material updates should drop in under the same node names without a baked custom shader.
- 4k planet/moon GLBs are not shipped.
