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
