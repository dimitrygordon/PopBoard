#!/usr/bin/env python3
"""Preprocess USGS 3DEP elevation and NLCD 2021 land cover for the Dubois County flyover prototype.

Raw inputs (not committed), fetched into RAW dir:
  dem5070.tif  : 3DEP ImageServer exportImage, bbox 778000,1734000,810000,1758000 EPSG:5070, 1024x768, F32
  nlcd5070.tif : MRLC WCS GetCoverage NLCD_2021_Land_Cover_L48, same bbox in EPSG:5070, native 30 m
Outputs in public/world/data:
  height.png : 1024x768 RGB, 16-bit height packed as R=high byte, G=low byte (decimeters above BASE_M)
  cover.png  : 1024x768 grayscale, simplified land cover class index (see CLASSES)
  meta.json  : bounds, scale, class table
"""
import json, sys, os
import numpy as np
from PIL import Image

RAW = sys.argv[1] if len(sys.argv) > 1 else '/workspace/world-raw'
OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'public', 'world', 'data')
W, H = 1024, 768
BASE_M = 100.0

# simplified classes used by the shader and scatter code
CLASSES = {0: 'water', 1: 'developed_open', 2: 'developed', 3: 'barren', 4: 'forest',
           5: 'evergreen', 6: 'grass', 7: 'crops', 8: 'wetland'}
NLCD_TO = {11: 0, 12: 0, 21: 1, 22: 2, 23: 2, 24: 2, 31: 3, 41: 4, 43: 4, 42: 5,
           52: 6, 71: 6, 81: 6, 82: 7, 90: 8, 95: 8}

dem = np.array(Image.open(os.path.join(RAW, 'dem5070.tif')), dtype=np.float32)
assert dem.shape == (H, W), dem.shape
dem[dem < -1000] = np.nan
if np.isnan(dem).any():
    dem = np.where(np.isnan(dem), np.nanmin(dem), dem)

nl = np.array(Image.open(os.path.join(RAW, 'nlcd5070.tif')))
# nearest-neighbour resample 30 m grid (origin 778000,1758000) to 31.25 m grid, same origin
ys = np.clip(((np.arange(H) + 0.5) * 31.25 / 30.0).astype(int), 0, nl.shape[0] - 1)
xs = np.clip(((np.arange(W) + 0.5) * 31.25 / 30.0).astype(int), 0, nl.shape[1] - 1)
nl = nl[np.ix_(ys, xs)]
cov = np.full(nl.shape, 6, np.uint8)
for k, v in NLCD_TO.items():
    cov[nl == k] = v

# Patoka River centerline from NHD (USGS, public domain): burn a 2 cell channel and build a drift path
river_path = []
nhd_file = os.path.join(RAW, 'nhd.json')
if os.path.exists(nhd_file):
    from PIL import ImageDraw
    feats = json.load(open(nhd_file))['features']
    burn = Image.new('L', (W, H), 0)
    dr = ImageDraw.Draw(burn)
    pts = []
    for f in feats:
        for path in f['geometry']['paths']:
            px = [((x - 778000) / 31.25, (1758000 - y) / 31.25) for x, y in path]
            dr.line(px, fill=255, width=2)
            pts += px
    b = np.array(burn) > 0
    cov[b & (cov != 0)] = 0
    # valley path: average river y in x bins, smoothed, west of the lake
    pts = np.array(pts)
    bins = np.linspace(20, 980, 33)
    for i in range(len(bins) - 1):
        m = (pts[:, 0] >= bins[i]) & (pts[:, 0] < bins[i + 1])
        if m.any():
            river_path.append([float((bins[i] + bins[i + 1]) / 2), float(np.median(pts[m, 1]))])
    rp = np.array(river_path)
    k = np.array([1, 2, 3, 2, 1], float); k /= k.sum()
    if len(rp) > 6:
        ys2 = np.convolve(np.pad(rp[:, 1], 2, mode='edge'), k, mode='valid')
        rp[:, 1] = ys2
    river_path = [[round(a, 1), round(b2, 1)] for a, b2 in rp.tolist()]

# flatten water surfaces to their local minimum so lake and river read as level
water = cov == 0
from scipy import ndimage
lab, n = ndimage.label(water)
for i in range(1, n + 1):
    m = lab == i
    if m.sum() > 200:
        dem[m] = np.percentile(dem[m], 10)

dm = np.clip(np.round((dem - BASE_M) * 10), 0, 65535).astype(np.uint16)
rgb = np.zeros((H, W, 3), np.uint8)
rgb[..., 0] = dm >> 8
rgb[..., 1] = dm & 255
os.makedirs(OUT, exist_ok=True)
Image.fromarray(rgb, 'RGB').save(os.path.join(OUT, 'height.png'), optimize=True)
Image.fromarray(cov, 'L').save(os.path.join(OUT, 'cover.png'), optimize=True)
meta = {
    'crs': 'EPSG:5070', 'bbox': [778000, 1734000, 810000, 1758000], 'size': [W, H], 'cell_m': 31.25,
    'height': {'encoding': 'dm = R*256+G, meters = dm/10 + base', 'base_m': BASE_M,
               'min_m': float(dem.min()), 'max_m': float(dem.max())},
    'classes': CLASSES,
    'landmarks': {'jasper_st_joseph': [round((783447.97 - 778000) / 31.25, 1), round((1758000 - 1744104.98) / 31.25, 1)]},
    'river_path_px': river_path,
    'sources': ['USGS 3DEP 1/3 arc-second via elevation.nationalmap.gov 3DEPElevation ImageServer (public domain)',
                'USGS NHD flowlines (Patoka River) via hydro.nationalmap.gov (public domain)',
                'MRLC NLCD 2021 Land Cover L48 via mrlc.gov WCS (public domain)'],
}
json.dump(meta, open(os.path.join(OUT, 'meta.json'), 'w'), indent=1)
print('ok', dem.min(), dem.max(), np.bincount(cov.ravel(), minlength=9))
