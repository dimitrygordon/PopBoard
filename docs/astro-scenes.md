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
| `art(src, {layer, z, box, opacity})` | A cut-out art plane. `src` is relative to the deck folder (e.g. `"v2/L05-2.webp"`) and `box` is `[x,y,w,h]` in page percent, the same as `story.json` layers. Split hand-drawn art into fg, mid and bg planes; never a single flat card. |
| `pencil(base, accent)` | The shared pencil-hatch texture (CSS colors) for spheres and solids, e.g. `new T.MeshLambertMaterial({ map: ctx.pencil("#5b88b8", "#3f6b3a") })`. |
| `palette` | Theme-aware colors: `{dark, paper, ink, gold, blue, red}` as hex numbers plus `inkCss`, `goldCss` and `blueCss` strings for labels. |
| `reducedMotion` | `true` when the user asked for reduced motion: show the finished state and skip drift. |
| `phone` | `true` on small screens: keep segment and particle counts low. |
| `controls` | The page's slider hooks, if it has any (e.g. `onLevel`). Otherwise `null`. |
| `touchable(obj, {r, at})` | Marks a grabbable object with the shared touch hint. A soft gold (#E2B654) radial-gradient halo, `r` world units in radius, breathes around `obj` (or at offset `at` inside it). It fades out after the first interaction on the page. Under reduced motion it is a static faint ring. **Call it on every object students can drag, spin or tap.** The module test fails if a scene uses `onDrag` without one. Returns the halo Sprite. |
| `onDrag(fn)` | `fn({dx, dy, x, y})` runs on look-drags. Values are fractions of the stage, `dx` and `dy` are measured from the drag start. The camera still looks around. |

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
