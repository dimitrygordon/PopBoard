# Plate Tectonics module: science reference

Every number and science claim the Plate Tectonics module (`public/study-plate-tectonics.html`, slug `plate-tectonics`) shows to students. Model: `public/plate-tectonics/pt-model.js`. View: `public/plate-tectonics/pt-scene.js`. Tests: `tests/plate-tectonics.test.mjs` (`npm run test:platetectonics`). Art is Tesla-cleared (MANIFEST.md, 2026-10-29); Leo's notes are followed as written.

Status: every row is Cleared by Tesla 2026-10-29.

## Leo's rules (checked by tests)

- Terracotta is the one accent color (UI accent, velocity arrow, ridge caption border, melt and hotspot tint). The shared layer's `--fun-gold` is mapped to terracotta.
- Ridge caption "Magma rises here." is live HTML text over the ridge art, shown whenever a ridge is on screen.
- The mantle is solid rock that flows slowly, not a sea of magma: drawn with the solid mantle texture, labeled "Mantle: solid rock that flows slowly, a few centimeters a year." (phone: "Mantle: solid rock that flows slowly. Not to scale."). The about card says "The mantle is solid rock that flows slowly, not a sea of magma. Melting happens only in small zones, like under ridges and above sinking plates." (`MANTLE_INFO`)
- No glow on the sinking slab: the slab is the Tesla-cleared gray trench art, drawn with no glow, blur or additive blending. The only glow sprite (lava-glow) is drawn at the volcano crater during a puff.

## Claims

| # | Where | Claim | Code | Status |
|---|---|---|---|---|
| 1 | Readout, drag | Plates move a few cm per year; the drag range is 0 to 10 cm/yr. | `MAX_RATE` | Cleared by Tesla 2026-10-29 |
| 2 | Readout | 1 cm/yr for 1 million years = 10 km. New crust and shortening are rate x time at a steady rate. | `KM_PER_CMYR_MYR`, `outcome()` | Cleared by Tesla 2026-10-29 |
| 3 | Boundary label | Divergent = pulling apart, convergent = pushing together, transform = sliding past. Mixed motion is labeled by the larger part; sideways counts as transform when at least 2x the apart/together rate. | `classify()` | Cleared by Tesla 2026-10-29 |
| 4 | Ridge | Ocean plates pulling apart make a mid-ocean ridge with new oceanic crust; "Magma rises here." | `outcome()` | Cleared by Tesla 2026-10-29 |
| 5 | Rift | Continents pulling apart first make a rift valley; after 300 km of stretching a new ocean and ridge open. | `T.riftToOceanKm` | Cleared by Tesla 2026-10-29 |
| 6 | Make Iceland | A hotspot under a ridge builds an island that breaks the surface after 4 Myr and tops out 2.1 km above sea level (Iceland's highest point is about 2.1 km). | `T.islandMyr`, `T.islandMaxKm` | Cleared by Tesla 2026-10-29 |
| 7 | Subduction | Where oceanic meets continental crust, the denser oceanic plate sinks; ocean meets ocean, one plate sinks (in reality the older, colder, denser plate; the model does not track plate age, so the copy says "one plate sinks" and the drawing shows the right plate's edge diving). A trench forms at the boundary. | `outcome()` | Cleared by Tesla 2026-10-29 |
| 8 | Volcano | Volcanoes appear once about 200 km of slab has gone down (enough to reach about 100 km depth, where melt forms in the mantle wedge above the slab). | `T.volcanoSlabKm` | Cleared by Tesla 2026-10-29 |
| 9 | Mountains | Continent meets continent: neither sinks; the crust folds into mountains. Height = 8.8 x (1 - e^(-shortening / 600 km)) km, so it levels off near Everest's 8.8 km. | `mountainHeight()` | Cleared by Tesla 2026-10-29 |
| 10 | Transform / quakes | Transform faults stick, load up and slip all at once in a quake. Time-lapse: one quake per 5 cm/yr x Myr of slip (real recurrence is tens to hundreds of years). | `stepFault()`, `T.quakeLoad` | Cleared by Tesla 2026-10-29 |
| 11 | Model label, about card | "Mantle: solid rock that flows slowly, a few centimeters a year." About card: "The mantle is solid rock that flows slowly, not a sea of magma. Melting happens only in small zones, like under ridges and above sinking plates." Flow chevrons drift slowly in the mantle. | `MANTLE_LABEL` | Cleared by Tesla 2026-10-29 |
| 12 | Model label | "Not to scale: heights are stretched so you can see them." | `SCALE_LABEL` | Cleared by Tesla 2026-10-29 |
| 13 | Fossil match | Mesosaurus (a small freshwater reptile), Glossopteris (a seed fern) and Cynognathus (a land reptile) are found on both South America and Africa (Lystrosaurus is not used: it is not found in South America); the bands only line up when the coasts fit. The outlines are simplified shapes, not real coastlines, and the band positions are schematic. Source: USGS, *This Dynamic Earth*, "Historical perspective" (https://pubs.usgs.gov/gip/dynamic/historical.html). | `FOSSILS`, `PIECES` | Cleared by Tesla 2026-10-29 |
| 14 | Guided text | "Push India (south) north into Asia. On screen, drag the right plate left, then run time." for the Himalaya scene (India is the right plate). | `SCENES` | Cleared by Tesla 2026-10-29 |
| 15 | Study library card | "ridges open where magma rises, trenches swallow cold ocean floor, volcanoes erupt, mountains fold up and stuck faults snap in quakes"; "The mantle is solid rock that flows slowly, not a sea of magma. Melting happens only in small zones, like under ridges and above sinking plates." | `public/study.html` | Cleared by Tesla 2026-10-29 |
