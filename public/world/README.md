# Dubois County flyover: data prototype (not for merge)

Status: data stage only. No 3D scene has been built yet. Work stopped here at Dimitry's request so he can review the style idea first.

## What is here
- `data/height.png` 1024 x 768, 31.25 m cells, EPSG:5070 bbox 778000,1734000 to 810000,1758000 (about 32 x 24 km: Jasper in the west, Patoka Lake in the east). Height is 16-bit packed in an 8-bit RGB PNG (meters = (R*256+G)/10 + 100) so a browser canvas can decode it without precision loss. Range 128.9 m to 262.4 m. Water bodies are flattened to a level surface.
- `data/cover.png` 1024 x 768 grayscale, simplified land cover class per cell: 0 water, 1 developed open, 2 developed, 3 barren, 4 deciduous forest, 5 evergreen, 6 grass and pasture, 7 crops, 8 wetland. The Patoka River centerline from NHD is burned in as a 2 cell water channel.
- `data/meta.json` bounds, encoding, class table, the St. Joseph church landmark cell, and a smoothed Patoka valley drift path (pixel coords, west to east).
- `../../tools/world/build_world_data.py` rebuilds all three from the raw downloads.

Total size: about 0.9 MB.

## Sources (all public domain, US Government works)
- USGS 3D Elevation Program (3DEP), 1/3 arc-second DEM, via the 3DEPElevation ImageServer exportImage endpoint at elevation.nationalmap.gov.
- MRLC National Land Cover Database (NLCD) 2021, Land Cover L48, via the mrlc.gov WCS.
- USGS National Hydrography Dataset (NHD) flowlines named Patoka River, via hydro.nationalmap.gov.

Raw downloads are kept out of the repo.

## Not done yet
Three.js scene, contour shader, tree and wheat instancing, water, sky, weather, season and time of day skins, fallbacks, frames. See /workspace/home-redesign/WORLD.md for Leo's spec.
