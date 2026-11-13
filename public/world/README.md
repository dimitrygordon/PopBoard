# Dubois County flyover (prototype, not for merge)

A 3D engraved-atlas view of Jasper and the Patoka River valley, under a live sky. The camera sits low and looks slightly up, so the land is a band along the bottom of the frame and the sky (stars, moon, weather) fills the rest.

## Open
- Local: serve `public/` and visit `/world/`.
- Branch preview: `https://proto-dubois-flyover.popboard.pages.dev/world/`

## Controls
- The view drifts slowly east along the Patoka valley when idle.
- Drag to yaw and to move forward or back. The upward tilt stays put.
- Move the cursor over the land to part grass and wheat, ruffle trees, ripple the water, and open a gap in the clouds.

## Debug query
- `?season=spring|summer|autumn|winter`
- `?sky=dawn|day|dusk|night`
- `?wx=clear|partly|cloudy|rain|storm|snow|fog`
- `?at=` an ISO date, for example `2026-10-15T13:00:00`
- `?pathT=0.38` freezes the camera along the valley path (0 to 1)
- `?freeze=1` stops drift and wind
- `?hud=1` shows horizon share and frame time

Snow lies on the ground only when the weather is snow. Winter trees are bare branches with a few dark cedars.

## Data
`data/height.png`, `data/cover.png`, and `data/meta.json` are a 32 by 24 km USGS 3DEP / NLCD / NHD extract. See the previous commit on this branch for sources. Rebuild with `tools/world/build_world_data.py`.

Reduced motion freezes the scene. Without WebGL, a still 2D engraving of the same view is shown instead.
