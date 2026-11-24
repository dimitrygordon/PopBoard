# Newton's Cannonball Fire art

Leo's chalk (dark) and pencil (light) set. The module picks the theme suffix (`_dark` or `_light`) from the page theme. List every runtime file in `manifest.json` under `use`; the loader fetches only those names, so a missing file never 404s.

Final runtime files are webp. PNG masters, mocks, contact sheets, and 3x3 seam checks stay in Leo's art drop, not in this folder.

Layout is Leo's 1600x900 stage, scaled to the canvas width:

| Thing | Stage px |
| --- | --- |
| Earth center | (800, 468) |
| Earth radius | 270 |
| Mountain top left | (665, 98), size 270x140 |
| Barrel pivot | (808, 60.28) |
| Muzzle, barrel level | (915.52, 60.28) |
| Elevation | -5 to +20 deg (default 0, level fire) |
| Recoil | 13 px or less, carriage 5 px |

Draw order: space tile, earth, trails, mountain, barrel (with flash), carriage, cannonball. Trails are drawn in code, not baked into sprites. Falls use a radial stretch so they land on Leo's Earth disc; bound paths keep r / r_launch so a circular shot stays at the muzzle.

| File | Role |
| --- | --- |
| `space_tile_{dark,light}.webp` | 2400 px seamless tile, shown at 1600 |
| `earth_{dark,light}.webp` | Round Earth, Atlantic continents |
| `mountain_{dark,light}.webp` | Rocky butte on the limb, not to scale |
| `cannon_barrel_{dark,light}.webp` | Barrel, rotates about the pivot |
| `cannon_carriage_{dark,light}.webp` | Carriage, drawn after the barrel |
| `cannonball_{dark,light}.webp` | Ball on the path |
| `muzzle_flash_{1,2,3}_{dark,light}.webp` | Flash frames |
| `panel_chalkboard_{dark,light}.webp` | 9-slice chalkboard for Derive it and Practice |
| `chalk_grain_tile_512.webp` | Optional trail grain mask |

Try it thumbnails (640x360) live in `public/physics101/tryit/thumbs/study-newtons-cannonball-fire.webp` and `-dark.webp`.
