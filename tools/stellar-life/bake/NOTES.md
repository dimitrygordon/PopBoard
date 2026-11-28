# Baking the style B red supergiant (H2) and red giant (S2) discs

Source: Leo's generator, /workspace/vr-stellar/frames/src (LOOK-SPEC.md v2.4 polish, one folder up).

## What renders what
| Look | Entry point | Scene | Output |
|---|---|---|---|
| H2 style B (the standard, frame3a-red-supergiant-styleB.png) | render_b.py -> ui/styleb.html | `f3a` | out/f3a_styleB_scene.png, out/f3a_styleB_params.json |
| S2 style B (frame2b-red-giant-styleB.png) | render_b2.py -> ui/styleb2.html (built by build2.py) | `rg` | out/rg_styleB_scene.png, out/rg_styleB_params.json |
| H2 smooth photoreal plate (the OLD, wrong frame) | rsg.py | numpy | out/rsg_scene.png |

`rsg.py` renders the smooth photoreal supergiant (frame3a-red-supergiant.png), which Leo says is the wrong standard. The style B stroke engine is JavaScript (ui/strokes.js plus the scene code in ui/styleb.html and ui/scenes_rg.js), driven by Playwright and headless Chrome. LOOK-SPEC.md sits in frames/, not frames/src/.

## Step 1 run log (2026-11-28, run from a copy in /workspace/vr-stellar/round12/gen/src, Leo's folder untouched)
- `python3 render_b.py f3a`: wrote f3a, 2.4 s. Output is byte-identical (sha256) to Leo's out/f3a_styleB_scene.png.
- `python3 render_b2.py rg`: wrote rg, 2.3 s. Byte-identical to Leo's out/rg_styleB_scene.png.
- `python3 rsg.py`: ran, 7 s, wrote out/rsg_scene.png (meta: au_px 94.62, R_km 600,806,520).
- Errors: none. (Only path edit: ROOT in render_b.py and render_b2.py pointed at the copy.)
- Deterministic: the same seeds reproduce Leo's frames exactly, so layout is reproducible for the bake.
- The scene PNG is the frame minus UI: 1920 x 1080, disc R = 380 px at (700, 560) for f3a; R = 300 px at (700, 500) for rg.

## Step 2: offline masters (run_masters.sh)
Leo's scene code runs unchanged in its own 1920 x 1080 virtual px space with the same seeded RNG, inside a patched COPY of ui/styleb.html (scene f3a) and ui/styleb2.html (scene rg), made by patch_bake.py from bake-prelude.js. Leo's files are only read. What the harness changes (the sink, not the look):
- a canvas transform scales virtual px to texture px (disc R = 1024 px, so 2,048 px across); Leo's scene-local addBleed is replaced by the same maths in texture px
- the painted sky background, the Jupiter / planet orbit lines and the labels are not drawn; their RNG draws still happen, so every stroke lands exactly where it does in frame3a-red-supergiant-styleB.png / frame2b styleB
- layer A = the disc, ring glow, flares, prominences and limb dabs (opaque disc interior, black outside), 2704 px square = +-1.32 R. Layer B = Leo's halo glow dabs only, 512 px square = +-2.0 R
- variants: v0 is Leo's frame. v1 and v2 re-jitter every stroke: new bristle alpha/length/colour jitter from a per-stroke seed, per-stroke offset 2 px (virtual), point wobble 1 px, width pulse 7%. Offsets are relative to v0 and periodic in v/3, so v0 to v1 to v2 to v0 closes without a jump. The main RNG stream is advanced by the same count as Leo's code, so layout never moves
- checks: layer A interior is pixel-identical to a full render (mean abs diff 0.0); A + B added in linear light with the equal-bleed rule matches the full render outside the limb to under 1.1 of 255 (an encoded-sRGB add would be 20 off, so the shader adds in linear)
Timings: all 8 renders run in parallel in under 6 s. No errors (only a favicon 404 from the local test server).
