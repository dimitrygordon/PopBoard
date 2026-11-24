# Relative Velocity Exploration (Section 6.3)

Page: `public/study-relative-velocity.html` (live path `/study-relative-velocity`).
Deep links: `?scene=river|truck|walkway|kart&frame=<viewer>`.

| File | What it holds | Owner |
| --- | --- | --- |
| `rv-config.js` | Every scene number (speeds, lengths, heights, slow motion, arrow colors) | Tesla checks |
| `rv-strings.js` | Every prompt and question (PLACEHOLDER drafts) | Socrates writes |
| `rv-art.js` | Art slots, sizes, PNG switch | Leo's art drops in |
| `rv-physics.js` | Pure 1D Galilean math (no DOM) | tested in `tests/relative-velocity.test.mjs` |
| `rv-ui.js`, `rv.css` | Page wiring and the Physics 101 look | Turing |

Structure: the River Channel Lab comes first (guided Steps 1 to 4, clipboard data table, results).
The Explore group holds three free sandboxes: Truck and basketball, Airport walkway, Kart boost road.

## Art (for Leo)

Placeholders are plain SVGs in `art/`. To swap in a finished sprite:

1. Save a transparent PNG as `art/<name>.png` (backdrops: `art/<name>-light.png` and `art/<name>-dark.png`).
2. Add the name to `PNG_READY` in `rv-art.js` (for backdrops add the base name, for example `bg-river`).
3. Optional: delete the matching placeholder SVG once the PNG is in.

Sizes are the intended pixel size; drawing at 2x is fine if the aspect ratio stays the same.
Anchor is the point (fraction of width, height) that sits on the object's position.
Tile = the left edge must meet the right edge, because the page repeats it sideways and slides it.
Sprites face right; the page mirrors the boat and walker when they head left.
No text in the art: the page draws ruler numbers, the stopwatch time and the data table as live text.
No game logos or names on the kart art.

| File | Size (px) | Anchor | Tile | Notes |
| --- | --- | --- | --- | --- |
| `bg-river-light.png`<br>`bg-river-dark.png` | 2400 x 900 | n/a | yes | tabletop under the plexi channel |
| `channel.png` | 2000 x 240 | 0, 0.5 | no | top-down plexiglass channel; x=0 px is 0 m and x=2000 px is 5 m on the ruler (400 px per m); water lane is y 40 to 200 |
| `boat.png` | 240 x 120 | 0.5, 0.5 | no | toy motor boat, top-down, bow pointing right |
| `bead.png` | 48 x 48 | 0.5, 0.5 | no | one floating bead (the leaf) |
| `stopwatch.png` | 240 x 280 | 0, 0 | no | stopwatch body; the time is drawn as live text in the face, center (120,160), face radius 80 |
| `valve-knob.png` | 200 x 200 | 0.5, 0.5 | no | flow valve knob, pointer at 12 o'clock = off; the page rotates it clockwise up to 270 degrees |
| `clipboard.png` | 640 x 820 | 0, 0 | no | pencil clipboard with an EMPTY data grid; grid box x 60 to 580, y 170 to 760; the page draws the table text on top |
| `bg-truck-light.png`<br>`bg-truck-dark.png` | 2400 x 900 | n/a | yes | street and sidewalk, road surface along the bottom 120 px |
| `truck.png` | 600 x 300 | 0.5, 1 | no | pickup truck, side view, facing right, wheels touch the bottom edge |
| `basketball.png` | 96 x 96 | 0.5, 0.5 | no | basketball |
| `bg-walkway-light.png`<br>`bg-walkway-dark.png` | 2400 x 900 | n/a | yes | terminal floor and windows |
| `walkway.png` | 1200 x 160 | 0, 1 | yes | moving walkway side view, one tile; the page slides it at the belt speed |
| `walker.png` | 160 x 320 | 0.5, 1 | no | walker with rolling bag, side view, facing right, feet on the bottom edge |
| `bg-kart-light.png`<br>`bg-kart-dark.png` | 2400 x 900 | n/a | yes | race track infield and grandstand, no logos or game branding |
| `kart.png` | 320 x 180 | 0.5, 1 | no | player kart, side view, facing right, no game branding |
| `kart-rival.png` | 320 x 180 | 0.5, 1 | no | rival kart, a different color from the player kart |
| `boost-pad.png` | 400 x 80 | 0, 0.5 | yes | boost lane chevron strip, one tile, chevrons point right |

Physics 101 Try it card (M6 L3, text-free, same 640 x 416 frame as the other Try it thumbnails):
`public/physics101/tryit/thumbs/study-relative-velocity.svg` (light) and
`public/physics101/tryit/thumbs/study-relative-velocity-dark.svg` (dark). Swap either for a PNG of the same
name stem by changing the path in `physics101/tryit.js` (`TARGETS["relative-velocity"]`).

Arrow colors: object `#6FA3E0`, medium or carrier amber `#E0A030`, sum is a bold ink stroke on cream paper
and a bold cream stroke (`#F2EAD8`) on charcoal.

Regenerate the placeholders with `python3 tools/relvel-placeholders.py`.
