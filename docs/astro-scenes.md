# Astronomy storybook: per-page 3D scene modules

Each storybook page can have a hand-built 3D scene in which the camera sits inside the slide. The slide text stays in the side panel (the bottom sheet on phones), so a scene only needs geometry, art and short labels.

## Where the files go

```
public/js/astro-scenes/<deck>/pNN.js     e.g. d02/p03.js, d13b/p01.js, d17-5/p12.js
public/js/astro-scenes/manifest.json     { "d01": ["p01"], "d02": ["p03", "p04"] }
```

- Use the deck ids from the deck folders (`public/astro-course/decks/`).
- `NN` is the page number with two digits.
- **Add every new module to `manifest.json`.** The engine only loads pages that are listed there, so missing files never cause 404s. `tests/astro-scenes.test.mjs` fails if the manifest and the files on disk disagree.
- Load order: the page's module if it's listed, then the built-in scene from `ac-scenes.js` if there is one, then the generic depth-plane scene. If a module throws, the page falls back too.
- The deck has to be immersive (`"immersive": true` in `tools/storybook-v2/motion/<deck>.json`, then rebuild with `build.py <deck>`). D01 is immersive now.

## Contract

```js
export default function build(ctx) {
  // add things to ctx.layers / ctx.scene
  return { update(t, dt) {}, dispose() {} }; // both optional
}
```

`t` is seconds since the page opened (the sketch-in runs during the first ~2 s). `dt` is the frame delta in seconds. `dt` is 0 under reduced motion.

| ctx | What it is |
| --- | --- |
| `THREE` | The vendored three.js module. Don't import three yourself. |
| `scene` | The module's root Group. The engine removes it and disposes everything under it on page change. |
| `camera` | The PerspectiveCamera (FOV 30, 16:9 frame; the page plane at z=0 is 16 x 9 units seen from z ≈ 16.8). Read it, but don't move it directly. |
| `setCamera(pos, look)` | Sets the base camera (arrays `[x,y,z]`). Call it every frame to fly the camera. The engine adds the viewer's drag-look (capped yaw and pitch), pinch or scroll dolly (clamped) and a small head-tracking parallax on top. |
| `layers.fg / .mid / .bg` | Groups at z = 2.2, 0 and -6. Labels and small marks go in fg, the main object in mid, big backdrops in bg. Aim for those 3 depth layers. |
| `sketch(obj, {delay})` | Pencil sketch-in for `obj` and its children: lines draw on, meshes go wireframe then hatched, and sprites fade or write on starting at `delay` seconds. Returns `obj`. |
| `label(text, [x,y,z], {layer, color, h})` | A camera-facing billboard label (Patrick Hand font). `h` is its height in world units. Returns the Sprite. |
| `art(src, {layer, z, box, opacity, ink})` | A cut-out art plane. `src` is relative to the deck folder (e.g. `"v2/L05-2.webp"`) and `box` is `[x,y,w,h]` in page percent, the same as `story.json` layers. Split hand-drawn art into fg, mid and bg planes; never a single flat card. In dark mode graphite and black ink are redrawn as light pencil; pass `ink: false` for full-color drawings (a globe, Moons, trees). |
| `pencil(base, accent)` | The shared pencil-hatch texture (CSS colors) for spheres and solids, e.g. `new T.MeshLambertMaterial({ map: ctx.pencil("#5b88b8", "#3f6b3a") })`. |
| `palette` | Theme-aware colors: `{dark, paper, ink, gold, blue, red}` as hex numbers plus `inkCss`, `goldCss` and `blueCss` strings for labels. |
| `reducedMotion` | `true` when the user asked for reduced motion: show the finished state and skip drift. |
| `phone` | `true` on small screens: keep segment and particle counts low. |
| `controls` | The page's slider hooks, if it has any (e.g. `onLevel`). Otherwise `null`. |
| `touchable(obj, {r, at})` | Marks a grabbable object with the shared touch hint. A wobbly, hand-drawn gold (#E2B654) pencil outline, `r` world units in radius, breathes around `obj` (or at offset `at` inside it). It is never a soft glow. It fades out after the first interaction on the page. Under reduced motion it holds still at a faint opacity. **Call it on every object students can drag, spin or tap.** The module test fails if a scene uses `onDrag` without one. Returns the halo Sprite. |
| `onDrag(fn)` | `fn({dx, dy, x, y})` runs on look-drags. Values are fractions of the stage, `dx` and `dy` are measured from the drag start. The camera still looks around. |
| `at(px, py, layer)` | Page px (the slide's own 1600 x 900 coordinates) to local `[x, y]` on a layer, so meshes line up with the drawing at rest. |
| `onPointer(fn)` | `fn({phase, x, y, ndc})` for direct drags: `phase` is `"down"`, `"move"` or `"up"`, `x, y` are page px on the z = 0 plane and `ndc` is the pointer in normalized device coordinates (for picking in a tilted 3D group with `camera`). Return `true` on `"down"` to take the drag: the camera then does not look around. Pair it with `touchable` (the module test checks). |
| `paint(box, {layer, z})` | A live pencil drawing on a plane covering `box` = `[x0, y0, x1, y1]` page px. `redraw(fn)` clears it and calls `fn(g)` with a 2D context already in page px. Use it for anything that changes with the simulation (a wedge, an angle label, trails) instead of the static PNG. Load hand fonts with `document.fonts.load` and redraw. |
| `text` | The slide's `sceneText` object from `deck.json`. Student-facing words a scene adds go there, word for word, never in the module. |
| `ui` | Side-panel controls for module pages, or `null`. `ui.slider({label, min, max, step, value, fmt}, fn)` and `ui.button(label, fn)` each return `{ set }` so the control follows page drags. The page needs `three` and `sandbox` set to its kind in `story.json` and the kind listed in `ONPAGE` (ac-story.js). |

The same helper is built into the engine's own pieces. In D01 those are the p5 address rings, the p17 masses, the p18 cannonball, the p21 seasons Earth and every drag-to-spin object.

Rules (from Leo's review):
- Diagram elements are real geometry: orbits are rings, planets are spheres, arrows are 3D shafts, charts are 3D bars and curves.
- Everything sketches in.
- Glows only with radial gradients.
- No em-dashes in labels.
- Keep labels readable under the capped parallax.

## Example: D01 p1

`public/js/astro-scenes/d01/p01.js` puts the camera on Earth's orbit facing the Sun. The camera drifts slowly along the orbit, the Moon passes close in front, and the "1 AU ≈ 8.3 light-minutes" label rides along the light path.

```js
export default function build(ctx) {
  const { THREE: T, layers, palette: P, reducedMotion } = ctx;
  const SUN = new T.Vector3(0, 0, -16), R = 16;
  const sun = ctx.sketch(new T.Mesh(new T.SphereGeometry(2.2, 32, 16), new T.MeshBasicMaterial({ color: 0xf2c45a })));
  sun.position.copy(SUN); layers.mid.add(sun);
  const earth = ctx.sketch(new T.Mesh(new T.SphereGeometry(0.45, 32, 16), new T.MeshLambertMaterial({ color: 0x5b88b8 })), { delay: 0.4 });
  layers.mid.add(earth);
  ctx.label("Sun", [0, 3.2, -16], { layer: "mid", h: 1.1 });
  ctx.touchable(earth, { r: 0.45 });                 // dragging spins Earth
  ctx.onDrag(({ dx }) => { earth.rotation.y += dx; });
  const C = new T.Vector3();
  return {
    update(t, dt) {
      const a = Math.PI / 2 + (reducedMotion ? 0 : t * 0.006);        // slow drift along the orbit
      C.set(Math.cos(a) * R, 0.35, SUN.z + Math.sin(a) * R);
      ctx.setCamera([C.x, C.y, C.z], [SUN.x, SUN.y, SUN.z]);
      earth.position.copy(C).lerp(SUN, 0.3).setY(-0.7);
    },
  };
}
```

See the full file for the Moon, the dashed light path and the label turned to follow the path on screen.

## Testing

`cd tests && node --test astro-scenes.test.mjs` imports every module and builds it against the ctx above (using the real three.js). It then runs 30 frames, fires a drag and calls `dispose()`. For a visual check, serve `public/` and open `study-astronomy-story.html?deck=<deck>&page=<n>`.

## Hand-drawn first (October 2026 direction)

Hand-drawn art is the default on every page. 3D is used only where it fits (scene-setting or simulation).

- **Non-custom pages** show the original slide art with its pop-up depth planes. They get no generic immersive mode and no procedural hero objects.
- **Layered art pages** (`public/astro-course/ac-artscene.js`, the `ART` table): the original drawing, split into depth planes by Leo, lives in `decks/<deck>/v2/art/`.
  - Parallax factors: bg 0.15, mid 0.45, fg 0.8. The cap is 14 px of a 1600 px page. Reduced motion turns it off.
  - Reveal order: pencil lines wipe on, then the colored hatching fills in, then labels.
  - Labels stay live text from deck.json.
  - D01 p1 and p5 use this. Their entry in `ART` wins over any scene module, so `d01/p01.js` stays only as the contract example.
- **3D scenes** (D01 p8 and p17) follow `mockups/style-kit/style-notes.md`:
  - Drawings are cutouts of the slide's own art (`opts.art`).
  - Lines are wobbly pencil strokes, built from the `pencil()` and `sheet()` helpers in ac-scenes.js and drawn in palette graphite.
  - Fills use the kit hatch tile (`v2/art/hatch-tile-512.webp`) with mipmaps and anisotropy ON.
  - No lit or glossy meshes.

## D02 scenes (p8, p10, p20, p23)

- Art: Leo's layers in `decks/d02/v2/art/` (`pNN-*.webp`, trimmed; boxes in the module are the trimmed bounds in page px). The paper `bg` and the merged `mid`/`fg` layers are not shipped: the stage is the paper and each piece is placed on its own.
- The moving parts the drawings had baked in (p10 wedge, sightline, 39° and globe marks; p08 trails) are drawn live with `paint`, so they follow the simulation.
- `decks/d02/v2/story.json` has `"immersive": true` and `three` / `sandbox` set to `diurnal`, `latitude`, `phases` and `eclipses` on those four pages, by hand (D02 has no `motion/d02.json`). Re-add them if `build.py` regenerates the file. Every other D02 page keeps its original drawing.
- On scene-module pages the Try it tab sits bottom left (the top right holds Polaris and labels); on phones it is hidden and the controls sit under the stage in the sheet.
- Science (Tesla): p8 turns 15.04° per sim hour counterclockwise about Polaris; p10 Polaris altitude equals latitude, starting at 39°; p20 counterclockwise from above, lit half toward the Sun, new on the left; p23 tilt 5.1° (drawn ×3), eclipse only at a node with new or full Moon (true tilt used for the test), nodes regress clockwise once per 18.6 years, sped up ×6.

## D03 scenes (p11, p14, p18, p21)

- Art: Leo's layers in `decks/d03/v2/art/`, trimmed the same way as D02. The p14 and p21 `fg-art` keep only the title rule and squiggle; the ellipse, wedges, trajectories, orbit and arrows are drawn live.
- p11 Copernicus's way: Position slider 1 to 7, drag Earth, Play. Earth's angular speed is 1.881 times Mars's; the sight line from Earth through Mars sets Mars's spot on the star wall, which moves backward from 3 to 5. Drawn dots stay at 30 percent.
- p14 Kepler's 2nd law: true Kepler timing (`trueAnomaly` solves M = E - e sin E), 8 s orbit, one wedge per sim month; Month and Eccentricity (0 to 0.8, drawn 0.68) sliders, drag the planet, Play. `sweptArea` checks equal areas in the tests.
- p18 Venus's phases: one date drives both boards; drag Venus in either panel or the Venus slider. `litFraction` gives the Earth-view phase: Ptolemy's never passes about 20 percent lit, Galileo's runs new to full. No claim that Earth's motion is proven.
- p21 Newton's cannonball: pull the ball back from the cannon (150 px = 7.9 km/s) or use Launch speed (1 to 7.9 km/s) and Launch. Velocity Verlet under an inverse-square pull; 7.9 km/s is the circle through the cannon. F_g always points at Earth's center. No 11 km/s label.
- `decks/d03/v2/story.json` has `"immersive": true` and `three` / `sandbox` = `retrograde`, `kepler2`, `venus`, `cannonball` on those pages, by hand.
