# Spaceships assets

Scaffold on `feat/spaceships`. Local only. Do not push, open a PR, or merge until Dimitry OKs a single production ship.

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

Vendor code is not in this folder. `<model-viewer>` is pinned at `@google/model-viewer@4.4.0` in `public/vendor/model-viewer/model-viewer.min.js`.

## Units and files

- GLB: real-world meters, Y-up, PBR materials. meshopt + WebP is fine. One file per craft at `models/<id>.glb`.
- USDZ: same scale and orientation as the GLB, for iOS Quick Look (`ios-src`). One file per craft at `models/<id>.usdz`.
- Still: a single still image per craft, at `stills/<id>.webp`. Used as the gallery card and as the model-viewer poster. Width around 960 px is plenty. PNG is acceptable if you change the `still` field to match.
- If a GLB is missing, the viewer keeps the poster, shows a "3D model not in yet" banner, and loads `models/_placeholder.glb` so students can still rotate a box. If a USDZ is missing, `ios-src` is left unset. Do not replace `_placeholder.glb` with a NASA mesh.

## fleet.json

`schemaVersion` is `1`. `placeholderGlb` and `placeholderStill` are the fallback paths above. `craft` is an array of objects with these fields:

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | yes | URL slug. Letters, numbers, and hyphens only. Matches the filename stem. |
| `name` | string | yes | Display name on the card and the detail title. |
| `subtitle` | string | no | One short line under the name. Use labelled placeholder text until Tesla verifies. |
| `tags` | string[] | no | Gallery filters only. Not science facts. Current buckets: `crewed`, `probe`, `observatory`, `rover`, `rotorcraft`, `lander`. |
| `listed` | boolean | no | Default `true`. If `false`, the craft is omitted from the gallery but still opens by deep link. |
| `placeholder` | boolean | no | `true` while assets or facts are still stand-ins. |
| `still` | string | yes | Path relative to `public/spaceships/`, e.g. `stills/voyager.webp`. |
| `glb` | string | yes | Path relative to `public/spaceships/`, e.g. `models/voyager.glb`. |
| `usdz` | string | no | Path relative to `public/spaceships/`, e.g. `models/voyager.usdz`. |
| `credit` | string | yes | Shown on the detail page. Use `3D model courtesy NASA`. |
| `sourceUrl` | string | yes | Per-model source link. Until a per-model URL is known, `https://science.nasa.gov/3d-resources/` is fine. |
| `sourceLabel` | string | no | Link text. Default `NASA 3D Resources`. |
| `facts` | object[] | yes | Shown in the fact panel. Each item is `{ "label": string, "value": string, "verified": boolean }`. |

Do not invent numeric or historical facts. Until Tesla verifies a row, keep `verified` as `false` and put labelled placeholder text in `value`, for example `[PLACEHOLDER: Tesla will verify]`.

## Scaffold ids

These sixteen ids are reserved so files can land without a rename. You may add, remove, or rename entries later, as long as each `id` stays unique and matches the file stem.

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

## Viewer behavior Angelo can rely on

- `<model-viewer>` is loaded only on the detail page, from the vendored file, never a CDN.
- Attributes: `camera-controls`, `touch-action="pan-y"`, `ar`, `ar-modes="webxr scene-viewer quick-look"`, `ar-scale="fixed"`.
- `auto-rotate` is set only when the user has not asked for reduced motion.
- `ios-src` is set only when the USDZ file is present.
- Custom AR button label: `View in your space`.
- Credit line plus the per-model `sourceUrl`.
