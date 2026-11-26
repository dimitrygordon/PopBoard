# Night Sky data credits and licenses

These data files are separate from the PopBoard code and keep their own licenses.

## Stars: `stars.bin`, `stars-meta.json`, `bv-lut.json`, `manifest.json`
- Source: **HYG database v4.4** (Hipparcos, Yale Bright Star and Gliese catalogs combined) by **astronexus (David Nash)**,
  https://codeberg.org/astronexus/hyg (file `data/hyg/CURRENT/hyg_v44.csv.gz`, sha256 in `tools/night-sky/sources.json`).
- License: **Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)**, https://creativecommons.org/licenses/by-sa/4.0/
- Changes: removed the Sun; kept stars with V magnitude 6.5 or brighter plus 4 fainter stars used by constellation lines;
  sorted by magnitude; repacked RA, Dec, magnitude, B-V, distance and Hipparcos ID to a binary file; names and designations
  moved to `stars-meta.json`; HYG's 100000 pc "unknown distance" placeholder stored as NaN. `bv-lut.json` is a color table
  computed from B-V (not HYG data).
- These derived files are published under **CC BY-SA 4.0**.

## Constellations: `constellations.json`
- Source: **Stellarium "western" sky culture** (the modern IAU constellations; lines and names) by the **Stellarium team**,
  https://github.com/Stellarium/stellarium-skycultures/tree/2d80ce70984c14bba7da2d31a0f9b27e292861c9/western
- License: **CC BY-SA** ("Text and data: CC BY-SA" in the sky culture's description.md; the older copy of the same culture in
  Stellarium/stellarium skycultures/modern states CC BY-SA 4.0).
- Changes: Hipparcos IDs replaced by indices into `stars.bin`; line style tokens ("thin") dropped; added label positions
  (mean of line stars) and the art atlas rectangles and anchors from `art/art-atlas.json`.
- This derived file is published under **CC BY-SA 4.0**.

## Constellation art: `art/constellations-atlas.webp`
- Source: constellation illustrations by **Johan Meuris**, from the **Stellarium project** (western sky culture, same commit as above),
  https://github.com/Stellarium/stellarium-skycultures/tree/2d80ce70984c14bba7da2d31a0f9b27e292861c9/western/illustrations
- License: **Free Art License 1.3** (FAL 1.3). Full text: `art/LICENSE-FAL.txt` and https://artlibre.org/licence/lal/en/
- Modified (grey levels re-normalized and lifted, glow and rim added, repacked into one atlas, WebP): see `art/README.md`. The modified atlas is distributed under the Free Art License 1.3.

## Planet positions (code, not data files)
- JPL Solar System Dynamics, "Approximate Positions of the Planets", Table 1 (E.M. Standish and J.G. Williams),
  https://ssd.jpl.nasa.gov/planets/approx_pos.html . Sun and Moon formulas from Jean Meeus, *Astronomical Algorithms*, 2nd ed. (1998).

## Panel font: `../ui/fonts/inter-latin-var.woff2`
- **Inter** by The Inter Project Authors (https://github.com/rsms/inter), SIL Open Font License 1.1 (`../ui/fonts/OFL-Inter.txt`).
