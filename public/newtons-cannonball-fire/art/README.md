# Newton's Cannonball Fire art

Leo is drawing chalk art into `/workspace/ncf/art/` against a SPEC.md. Until those files land, the module draws a chalk-on-black placeholder in `ncf-art.js`.

To swap in Leo's art, drop the files below into this folder (same names) and add each file name to `manifest.json` under `use`. The art layer loads only listed files and falls back to the placeholder otherwise. No other code change is required.

| File | Role | Notes |
| --- | --- | --- |
| `space.webp` | Black space backdrop, full stage | Stretched to the square canvas. |
| `earth.webp` | Round Earth | Drawn as a circle over the backdrop. A transparent center or a filled disk both work; the code scales it to the Earth radius. |
| `mountain.webp` | Tall mountain / mesa on the limb | Anchored at the top of the Earth. Not to scale with the 150 km teaching height. |
| `cannon.webp` | Cannon on the mountain, barrel pointing right | Sits at the launch point. |
| `ball.webp` | Cannonball | A small sprite, centered on the path. |

Reference: `/workspace/ncf/ref/dimitry-sketch.png` (round Earth, mountain and cannon at the top, blue and green falling trails, red near-circular, yellow wider orbit, black space, chalk stroke).

The drawn mountain is visually exaggerated. Physics uses the height slider (default 150 km). Trails are drawn in code (colored chalk strokes) and are not part of the still art.
