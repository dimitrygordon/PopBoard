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

Leo's finished set (SPEC.md in `/workspace/relvel/art/`) ships as webp in `art/`, converted from the PNGs
with no visible loss (16.3 MB of PNG down to about 1.6 MB). Every scene is a 1600 x 900 stage that matches the
backdrops. Sprites are shared by both themes; only backdrops (and the Try it card) have -light and -dark files.
The channel is always shown 1200 px wide (5 m); the chosen length L is marked with start and finish gates.

To replace a file: export it at the same pixel size and save it over `art/<name>.webp`
(backdrops: `art/<name>-light.webp` and `art/<name>-dark.webp`). Geometry lives in `rv-art.js`.

| File | Leo's source | PNG size | Shown at | Anchor (PNG px) | Notes |
| --- | --- | --- | --- | --- | --- |
| `bg-river-light.webp`<br>`bg-river-dark.webp` | `bg_lab_{theme}.png` | 1600 x 900 | 1600 x 900 | n/a | lab bench, empty tabletop (y 204 to 795) |
| `channel.webp` | `channel_topdown.png` | 2400 x 355 | 1200 x 178 | 0, 0 | water interior x 46 to 2353, y 47 to 306; placed at x 200, y 392 |
| `ruler.webp` | `channel_ruler_0-5m.png` | 2400 x 110 | 1200 x 55 | 0, 0 | 0 m at x 46, 5 m at x 2353; placed at x 200, y 584 |
| `boat.webp` | `boat_topdown_right.png` | 480 x 158 | 200 x 66 | 240, 79 | bow right |
| `bead-yellow.webp` | `bead_yellow.png` | 80 x 80 | 40 x 40 | 40, 40 | the leaf |
| `bead-green.webp` | `bead_green.png` | 80 x 80 | 40 x 40 | 40, 40 |  |
| `bead-violet.webp` | `bead_violet.png` | 80 x 80 | 40 x 40 | 40, 40 |  |
| `bead-red.webp` | `bead_red.png` | 80 x 80 | 40 x 40 | 40, 40 |  |
| `valve-knob.webp` | `flow_valve_knob.png` | 200 x 199 | 100 x 100 | 100, 100 | rotates when the flow is on |
| `clipboard.webp` | `clipboard_datatable.png` | 640 x 969 | 320 x 485 | 0, 0 | columns x 64 185 313 443 563, rows y 231 304 409 518 625 737 855 |
| `stopwatch.webp` | `stopwatch.png` | 240 x 334 | 120 x 167 | 0, 0 | dial center (120, 203) |
| `bg-truck-light.webp`<br>`bg-truck-dark.webp` | `bg_road_{theme}.png` | 1600 x 900 | 1600 x 900 | n/a | asphalt y 590 to 740, wheels on y 700 |
| `truck.webp` | `truck_side_right.png` | 1100 x 447 | 550 x 224 | 550, 436 | wheels y 436, bed rail top y 171, bed x 10 to 470 |
| `basketball.webp` | `basketball.png` | 160 x 158 | 56 x 55 | 80, 79 |  |
| `bg-walkway-light.webp`<br>`bg-walkway-dark.webp` | `bg_airport_{theme}.png` | 1600 x 900 | 1600 x 900 | n/a | walkway base on y 760 |
| `walkway.webp` | `walkway_tile.png` | 554 x 390 | 277 x 195 | 0, 245 | tiles sideways, belt surface y 245 |
| `walker.webp` | `walker_side_right.png` | 400 x 741 | 200 x 371 | 200, 730 | feet at (200, 730) |
| `bg-kart-light.webp`<br>`bg-kart-dark.webp` | `bg_kart_{theme}.png` | 1600 x 900 | 1600 x 900 | n/a | asphalt y 588 to 768, wheels on y 720 |
| `kart.webp` | `kart_blue_side_right.png` | 800 x 420 | 300 x 158 | 400, 410 | wheels y 410 |
| `kart-rival.webp` | `kart_rival_red_side_right.png` | 800 x 420 | 300 x 158 | 400, 410 | wheels y 410 |
| `boost-pad.webp` | `boost_pad_right.png` | 640 x 285 | 240 x 36 | 320, 142 | squashed to lie on the road |

Not shipped: the walkway end caps (the belt runs edge to edge with moving treads) and the
`bg_lab_*_with_channel` backdrops (the channel is its own sprite so the ruler and gates line up).

Physics 101 Try it card (M6 L3, text-free, 640 x 360, from `link_card_light` / `link_card_dark`):
`public/physics101/tryit/thumbs/study-relative-velocity.webp` (light) and
`public/physics101/tryit/thumbs/study-relative-velocity-dark.webp` (dark), set in
`physics101/tryit.js` (`TARGETS["relative-velocity"]`).

Arrow colors (`rv-config.js` ARROW): object `#6FA3E0`, medium amber `#E0A33A` (dark `#E8B04A`),
sum is a bold ink stroke `#2B3A55` on cream paper and a bold cream stroke `#EDE6D6` on charcoal.
