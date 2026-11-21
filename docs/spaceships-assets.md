# Spaceships assets

Wave 3 batch 1 is on `feat/spaceships-wave3-b1`, based on the shipped wave 2 module (49 craft). Do not merge until Tesla's batch 1 fact check clears.

This file is the contract for Angelo's handoff in `/workspace/angelo/spaceships/`. Drop files under `public/spaceships/` using the paths below. The gallery and viewer load `fleet.json` and resolve every asset path relative to that folder. Models are fetched only on the detail page (`study-spaceship.html`). The gallery never loads a GLB or USDZ.

## Pages and deep links

Paths are relative to the site root (for example a local `http://127.0.0.1:PORT/`).

| Page | URL |
|---|---|
| Gallery | `study-spaceships.html` |
| Detail | `study-spaceship.html?id=<id>` |

Example: `study-spaceship.html?id=voyager`. Unknown ids show a not-found state and a link back to the gallery. Query keys forwarded by `board-return.js` (`board`, `student`, `name`, `teacher`, `pbreturn`, `emulators`, and `story`) are preserved.

## Folder layout

All of this lives in `public/spaceships/`.

```
public/spaceships/
  fleet.json
  spaceships.css
  ss-data.js
  ss-gallery.js
  ss-viewer.js
  models/
    _placeholder.glb          # 1 m Y-up PBR box, scaffold fallback only
    <id>.glb                  # Angelo: compressed GLB, meters, Y-up, PBR
    <id>.usdz                 # Angelo: iOS Quick Look, meters
  stills/
    _placeholder.webp         # scaffold fallback still / poster
    <id>.webp                 # Angelo: gallery card and viewer poster
```

Vendor code is not in this folder. `<model-viewer>` is pinned at `@google/model-viewer@4.4.0` in `public/vendor/model-viewer/model-viewer.min.js`. The NASA GLBs use `EXT_meshopt_compression`. The detail page sets `self.ModelViewerElement.meshoptDecoderLocation` to `vendor/model-viewer/meshopt_decoder.js` (meshoptimizer 1.2, MIT) before loading model-viewer. Without that hook the GLBs will not decode.

## Units and files

- GLB: real-world meters, Y-up, PBR materials, meshopt + WebP. One file per craft at `models/<id>.glb`.
- USDZ: same scale and orientation as the GLB, for iOS Quick Look (`ios-src`). One file per craft at `models/<id>.usdz`. JWST's USDZ is about 11.17 MB, still the largest file (InSight 10.22 MB, Fermi 9.90 MB, Spirit/Opportunity 9.49 MB). Test those on a real iPhone before this ships; this environment cannot run Quick Look.
- Still: a single still image per craft, at `stills/<id>.webp`. Used as the gallery card and as the model-viewer poster. Width around 960 px is plenty. PNG is acceptable if you change the `still` field to match.
- If a GLB is missing, the viewer keeps the poster, shows a "3D model not in yet" banner, and loads `models/_placeholder.glb` so students can still rotate a box. If a USDZ is missing, `ios-src` is left unset. Do not replace `_placeholder.glb` with a NASA mesh.

## fleet.json

`schemaVersion` is `1`. `placeholderGlb` and `placeholderStill` are the fallback paths above. `craft` is an array of objects with these fields:

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | yes | URL slug. Letters, numbers, and hyphens only. Matches the filename stem. |
| `name` | string | yes | Display name on the card and the detail title. |
| `subtitle` | string | no | One short line under the name. Use labelled placeholder text until Tesla verifies. |
| `tags` | string[] | no | Gallery filters only. Not science facts. Current buckets: `crewed`, `probe`, `observatory`, `earth-observer`, `rover`, `rotorcraft`, `lander`. The `earth-observer` chip is labelled Earth observers. |
| `listed` | boolean | no | Default `true`. If `false`, the craft is omitted from the gallery but still opens by deep link. |
| `placeholder` | boolean | no | `true` while the GLB or still is still a stand-in. `false` once those files exist. Fact values can still be unverified. |
| `still` | string | yes | Path relative to `public/spaceships/`, e.g. `stills/voyager.webp`. |
| `glb` | string | yes | Path relative to `public/spaceships/`, e.g. `models/voyager.glb`. |
| `usdz` | string | no | Path relative to `public/spaceships/`, e.g. `models/voyager.usdz`. |
| `credit` | string | yes | Shown on the detail page. Use `3D model courtesy NASA`. |
| `sourceUrl` | string | yes | Per-model source link. Until a per-model URL is known, `https://science.nasa.gov/3d-resources/` is fine. |
| `sourceLabel` | string | no | Link text. Default `NASA 3D Resources`. |
| `cameraOrbit` | string | no | model-viewer `camera-orbit`, e.g. `45deg 70deg auto`. Used for ISS and Chandra, whose long axis runs along Z. |
| `facts` | object[] | yes | Shown in the fact panel. Each item is `{ "label": string, "value": string, "verified": boolean }`, with optional `sources` (URL list) and `recheckBeforePublish`. Per-craft source notes and scale notes are in `docs/spaceships-fleet-meta.json`. |

Do not invent numeric or historical facts. Tesla fact-checked wave 1 (19 craft, 151 rows) and wave 2 (30 craft, 240 rows) on Nov 20, 2026 (America/New_York). All 391 fact rows are `verified: true`. Wave 1 keeps Tesla's student wording on 11 rows. Wave 2 applies his student wording and source URLs for 1 Must fix and 16 Should fixes (including Juno's `scale_note` of 20.13 m and the `fleet_meta` source fixes in `docs/spaceships-fleet-meta.json`). Time-sensitive status lines that must be rechecked before publish: `voyager`, `perseverance`, `aqua`, `mars-odyssey`, and `terra`. Unverified fact rows, if any are added later, still get a PLACEHOLDER label in the viewer. Skylab, SDO, and STEREO have no science.nasa.gov model page; their `sourceUrl` is the NASA 3D Resources GitHub folder for that model. Wave 3 batch 1 (30 craft, 239 rows) is not yet checked: every batch 1 row is `verified: false` (the viewer shows a PLACEHOLDER label) and carries Angelo's per-row `sources`. Every batch 1 Status row has `recheckBeforePublish: true`.

## Listed ids

Seventy-nine listed craft: the original sixteen reserved ids, Angelo's three wave 1 extras (`iss`, `saturn-v`, `space-shuttle`), thirty wave 2 craft, and thirty wave 3 batch 1 Earth observers. GPM, a wave 2 spare, ships in wave 3 batch 1 re-anchored to 13 m. Rosetta is held for wave 3 batch 2. You may add, remove, or rename entries later, as long as each `id` stays unique and matches the file stem.

Wave 1:

| id | Display name |
|---|---|
| `apollo-lunar-module` | Apollo Lunar Module |
| `cassini-huygens` | Cassini-Huygens |
| `chandra` | Chandra X-ray Observatory |
| `curiosity` | Curiosity Rover |
| `dawn` | Dawn |
| `galileo` | Galileo |
| `hubble` | Hubble Space Telescope |
| `ingenuity` | Ingenuity Mars Helicopter |
| `jwst` | James Webb Space Telescope |
| `juno` | Juno |
| `kepler` | Kepler |
| `parker-solar-probe` | Parker Solar Probe |
| `perseverance` | Perseverance Rover |
| `tess` | TESS |
| `viking-lander` | Viking Lander |
| `voyager` | Voyager |
| `iss` | International Space Station |
| `saturn-v` | Saturn V |
| `space-shuttle` | Space Shuttle Orbiter |

Wave 2:

| id | Display name |
|---|---|
| `gemini` | Gemini |
| `mercury-friendship-7` | Mercury Friendship 7 |
| `apollo-soyuz` | Apollo-Soyuz |
| `skylab` | Skylab |
| `pioneer-10` | Pioneer 10 |
| `magellan` | Magellan |
| `mro` | Mars Reconnaissance Orbiter |
| `lro` | Lunar Reconnaissance Orbiter |
| `osiris-rex` | OSIRIS-REx |
| `insight` | InSight Mars Lander |
| `spirit-opportunity` | Spirit and Opportunity |
| `spitzer` | Spitzer Space Telescope |
| `fermi` | Fermi Gamma-ray Space Telescope |
| `swift` | Neil Gehrels Swift Observatory |
| `terra` | Terra |
| `aqua` | Aqua |
| `landsat-8` | Landsat 8 |
| `soho` | SOHO |
| `stardust` | Stardust |
| `deep-impact` | Deep Impact |
| `messenger` | MESSENGER |
| `mars-odyssey` | 2001 Mars Odyssey |
| `sdo` | Solar Dynamics Observatory |
| `stereo` | STEREO |
| `deep-space-1` | Deep Space 1 |
| `near-shoemaker` | NEAR Shoemaker |
| `ladee` | LADEE |
| `explorer-1` | Explorer 1 |
| `compton` | Compton Gamma Ray Observatory |
| `wmap` | WMAP |

Wave 3 batch 1 (all tagged `earth-observer`):

| id | Display name |
|---|---|
| `aquarius` | Aquarius / SAC-D |
| `aura` | Aura |
| `calipso` | CALIPSO |
| `cloudsat` | CloudSat |
| `cygnss` | CYGNSS |
| `dscovr` | DSCOVR |
| `eo-1` | Earth Observing-1 |
| `goes` | GOES weather satellite |
| `grace` | GRACE |
| `icesat` | ICESat |
| `icesat-2` | ICESat-2 |
| `jason-1` | Jason-1 |
| `jason-2` | OSTM/Jason-2 |
| `sentinel-6` | Sentinel-6 Michael Freilich |
| `landsat-1` | Landsat 1 |
| `landsat-4` | Landsat 4 |
| `landsat-7` | Landsat 7 |
| `oco-2` | OCO-2 |
| `poes` | POES weather satellite |
| `quikscat` | QuikSCAT |
| `radarsat-1` | RADARSAT-1 |
| `sac-c` | SAC-C |
| `seastar` | SeaStar (SeaWiFS) |
| `suomi-npp` | Suomi NPP |
| `topex-poseidon` | TOPEX/Poseidon |
| `toms-ep` | TOMS Earth Probe |
| `trmm` | TRMM |
| `acrimsat` | ACRIMSAT |
| `aim` | AIM |
| `gpm` | GPM Core Observatory |

ISS and Chandra use `cameraOrbit` `45deg 70deg auto`. Juno's GLB, USDZ, and still were replaced in wave 2 so the solar-array span is 20.1 m; Tesla's size line ("more than 20 m across the solar arrays") is still accurate and stays verified.

## Viewer behavior Angelo can rely on

- `<model-viewer>` is loaded only on the detail page, from the vendored file, never a CDN.
- Attributes: `camera-controls`, `touch-action="pan-y"`, `ar`, `ar-modes="webxr scene-viewer quick-look"`, `ar-scale="fixed"`.
- `auto-rotate` is set only when the user has not asked for reduced motion.
- `ios-src` is set only when the USDZ file is present.
- Custom AR button label: `View in your space`.
- Credit line plus the per-model `sourceUrl`.
