# Third-party notices

## d3-celestial star and constellation data

`public/login-sky-data.json` is derived from the `stars.6.json`, `constellations.lines.json` and `constellations.json` data files of [d3-celestial](https://github.com/ofrohn/d3-celestial) (filtered to magnitude <= 5 and reformatted). Used under the BSD 3-Clause License:

```
Copyright (c) 2015, Olaf Frohn
All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.

3. Neither the name of the copyright holder nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
```

## Fredoka font

`public/fonts/fredoka-latin.woff2` is Fredoka by Milena Brandao, licensed under the SIL Open Font License 1.1 (https://openfontlicense.org).

## three.js r170

`public/vendor/three/three.module.min.js` is three.js 0.170.0 (https://github.com/mrdoob/three.js), vendored unmodified from the npm package `three@0.170.0` (`build/three.module.min.js`). MIT License; full text in `public/vendor/three/three.LICENSE`. `public/vendor/three/OrbitControls.js` is the r170 `examples/jsm/controls/OrbitControls.js` file from the same three.js tree, with only the `three` import rewritten to the vendored module. Same MIT License.

## Astronomy Course storybook fonts

These subsets (Latin, Greek, and arrows) in `public/fonts/` come from Google Fonts and are licensed under the SIL Open Font License 1.1 (https://openfontlicense.org):

- `cabin-sketch.woff2`, `cabin-sketch-bold.woff2`: Cabin Sketch by Impallari Type.
- `architects-daughter.woff2`: Architects Daughter by Kimberly Geswein.
- `patrick-hand.woff2`: Patrick Hand by Patrick Wagesreiter.
- `gochi-hand.woff2`: Gochi Hand by Huerta Tipografica.
- `itim.woff2`: Itim by Cadson Demak.

## Jost font

`public/fonts/jost-latin-400.woff2`, `jost-latin-500.woff2`, `jost-latin-600.woff2`, and `jost-latin-700.woff2` are Latin subsets of Jost by indestructible type (Owen Earl), from Fontsource (`jost@5`). Licensed under the SIL Open Font License 1.1 (https://openfontlicense.org).

## Gravity and Orbits 3D assets

Planet and moon maps in `public/gravity-orbits/models/` (Earth, Moon, Mars, Jupiter, and related bodies) use textures by Solar System Scope, licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). https://www.solarsystemscope.com/textures/

ISS and Hubble 3D models, and Galilean moon maps, are NASA media. Credit NASA. No NASA insignia or endorsement.

Star map `starmap_2020_4k.jpg` (and the mobile downscale `starmap_2020_2k.jpg`) is NASA SVS "Deep Star Maps 2020." Credit NASA / Ernie Wright.

Orbital facts in `orbits.json` and `kepler.json` cite NSSDC Earth, Moon, Mars, Jupiter, Jovian Satellite, and Comet Fact Sheets, and NASA Science 1P/Halley.

Satellite surface detail in the GPS and GEO teaching models uses Poly Haven and TextureCan material, CC0.

## @google/model-viewer 4.4.0

`public/vendor/model-viewer/model-viewer.min.js` is @google/model-viewer 4.4.0 (https://github.com/google/model-viewer), vendored unmodified from the npm package `@google/model-viewer@4.4.0` (`dist/model-viewer.min.js`). Apache License 2.0; full text in `public/vendor/model-viewer/LICENSE`. Do not load this from a CDN.

## Spaceships placeholder and NASA credit

Placeholder stills in `public/spaceships/stills/` and the 1 m box `public/spaceships/models/_placeholder.glb` are PopBoard scaffold stand-ins, not NASA models. Official spacecraft meshes, USDZ files, and stills will be NASA media. Credit NASA. No NASA insignia or endorsement. Source: https://science.nasa.gov/3d-resources/

## meshoptimizer meshopt decoder 1.2

`public/vendor/model-viewer/meshopt_decoder.js` is the meshopt decoder from meshoptimizer 1.2 (https://github.com/zeux/meshoptimizer), copied from Angelo's Spaceships handoff. MIT License (Copyright (c) 2016-2026 Arseny Kapoulkine); full text in `public/vendor/model-viewer/meshopt.LICENSE`. model-viewer loads it only when `ModelViewerElement.meshoptDecoderLocation` is set, which the Spaceships detail page does so the meshopt-compressed NASA GLBs can decode. Do not load this from a CDN.

## Night Sky (public/night-sky)

- **HYG database v4.4** by astronexus (David Nash), https://codeberg.org/astronexus/hyg . CC BY-SA 4.0. Filtered (V <= 6.5 plus constellation stars) and repacked into `public/night-sky/data/stars.bin` and `stars-meta.json`; those derived files are published under CC BY-SA 4.0. Details in `public/night-sky/data/CREDITS.md`.
- **Stellarium modern sky culture** ("western" in https://github.com/Stellarium/stellarium-skycultures, commit 2d80ce70), constellation lines and names by the Stellarium team. CC BY-SA. Reindexed into `public/night-sky/data/constellations.json`, published under CC BY-SA 4.0.
- **Constellation illustrations by Johan Meuris** (Stellarium project), Free Art License 1.3. Restyled and repacked by Leo into `public/night-sky/data/art/constellations-atlas.webp` (modifications listed in `public/night-sky/data/art/README.md`), distributed under FAL 1.3; license text in `public/night-sky/data/art/LICENSE-FAL.txt`, changes in `public/night-sky/data/art/README.md`.
- **JPL Approximate Positions of the Planets**, Table 1 (Standish and Williams), https://ssd.jpl.nasa.gov/planets/approx_pos.html . US Government work, cited; copied to `tools/night-sky/jpl-approx-pos-table1.txt`.
- Formulas from Jean Meeus, *Astronomical Algorithms* (2nd ed., 1998); B-V to temperature from Ballesteros (2012); CIE colour-matching fit from Wyman, Sloan and Shirley (2013). Cited in `public/night-sky/ns-astro.js` and `ns-ephem.js`.
- **Inter** font (`public/night-sky/ui/fonts/inter-latin-var.woff2`, Latin subset) by The Inter Project Authors, https://github.com/rsms/inter . SIL Open Font License 1.1; full text in `public/night-sky/ui/fonts/OFL-Inter.txt`.
- Night Sky panel icons (sources in `tools/night-sky/icons-src/*.svg`, packed unchanged into `public/night-sky/ui/icons.json`) are PopBoard originals by Leo.

## Stellar Life Cycle VR (public/stellar-life)

`public/stellar-life/data/tracks.json` holds values derived from two published model sets (resampled and reformatted by `tools/stellar-life/build-data.py`; the raw files are not redistributed):

- MIST v1.2 stellar evolution tracks ([Fe/H] = 0, v/vcrit = 0.4, EEP files; Choi et al. 2016, ApJ 823, 102; Dotter 2016, ApJS 222, 8), from https://waps.cfa.harvard.edu/MIST/. Credited in the module's Sources and credits panel.
- White dwarf cooling sequences of Bédard, Bergeron, Brassard and Fontaine 2020 (ApJ 901, 93), thick hydrogen models seq_020_thick, seq_055_thick and seq_065_thick, from the Montreal White Dwarf Database (https://www.astro.umontreal.ca/~bergeron/CoolingModels/). Used with acknowledgement as the authors ask; only derived values ship.

The late fuel stage times on the core cutaway cards quote Woosley, Heger and Weaver 2002 (Reviews of Modern Physics 74, 1015). The painted-stroke shaders are PopBoard's own (ported from the painted-stroke tech test). The page reuses Night Sky's Inter font and `temperatureToSRGB` colour function.
