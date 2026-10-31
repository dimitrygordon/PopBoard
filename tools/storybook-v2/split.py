# Storybook v2: cut each slide's art into separate drawing layers on transparent backgrounds.
# Paper and white card backgrounds touching a drawing's edge are keyed out via alpha; the pencil
# art itself is never recolored or inverted. Writes decks/<slug>/v2/L<slide>-<k>.webp + layers.json.
import json, sys, os
import numpy as np
from PIL import Image
from scipy import ndimage
slug = sys.argv[1] if len(sys.argv) > 1 else "d01"
D = f"/workspace/pb-astro/public/astro-course/decks/{slug}"
OUT = D + "/v2"; os.makedirs(OUT, exist_ok=True)
for f in os.listdir(OUT):
  if f.startswith("L") and f.endswith(".webp"): os.remove(os.path.join(OUT, f))
deck = json.load(open(D + "/deck.json"))
res = {}
for s in deck["slides"]:
  img = next((it for it in s["items"] if it["t"] == "img"), None)
  if not img: continue
  im = Image.open(f"{D}/{img['src']}").convert("RGBA"); a = np.array(im); H, W = a.shape[:2]
  al = a[..., 3].astype(int)
  m = al > 30
  grp = ndimage.binary_dilation(m, iterations=max(4, W // 240))
  lab, n = ndimage.label(grp)
  layers = []
  for i, sl in enumerate(ndimage.find_objects(lab)):
    y0, y1, x0, x1 = sl[0].start, sl[0].stop, sl[1].start, sl[1].stop
    comp = np.zeros((H, W), bool); comp[sl] = (lab[sl] == i + 1) & m[sl]
    if comp[sl].sum() < W * H * 0.0004: continue
    pad = 3; y0 = max(0, y0 - pad); x0 = max(0, x0 - pad); y1 = min(H, y1 + pad); x1 = min(W, x1 + pad)
    crop = a[y0:y1, x0:x1].copy()
    keep = ndimage.binary_dilation(comp[y0:y1, x0:x1], iterations=2)
    crop[..., 3] = np.where(keep, crop[..., 3], 0)
    # key out paper/white background connected to the crop edge (soft edge, no inversion)
    rgb = crop[..., :3].astype(int)
    light = (rgb.min(-1) > 222) & (rgb.max(-1) - rgb.min(-1) < 26) & (crop[..., 3] > 0)
    lab2, _ = ndimage.label(light)
    edge = set(np.unique(np.concatenate([lab2[0], lab2[-1], lab2[:, 0], lab2[:, -1]]))) - {0}
    sizes = ndimage.sum(light, lab2, range(1, lab2.max() + 1)) if lab2.max() else []
    big = {j + 1 for j, z in enumerate(sizes) if z > max(400, light.size * 0.004)}
    bgm = np.isin(lab2, list(edge | big))  # paper at the edge, and white cards/labels inside
    if bgm.any():
      lum = rgb.min(-1)
      fade = np.clip((lum - 222) / 18.0, 0, 1)
      ring = ndimage.binary_dilation(bgm, iterations=1) & ~bgm & (lum > 205)
      newa = crop[..., 3].astype(float)
      newa[bgm] = 0
      newa[ring] *= (1 - np.clip((lum[ring] - 205) / 35.0, 0, 1) * 0.7)
      crop[..., 3] = newa.astype(np.uint8)
    if (crop[..., 3] > 30).sum() < 40: continue
    k = len(layers) + 1
    name = f"L{s['n']:02d}-{k}.webp"
    Image.fromarray(crop).save(f"{OUT}/{name}", "WEBP", quality=88, method=6)
    layers.append({"id": f"{s['n']}-{k}", "src": "v2/" + name,
                   "box": [round(x0 / W * 100, 3), round(y0 / H * 100, 3), round((x1 - x0) / W * 100, 3), round((y1 - y0) / H * 100, 3)]})
  layers.sort(key=lambda l: (l["box"][0], l["box"][1]))
  for j, l in enumerate(layers): l["order"] = j
  res[s["n"]] = layers
json.dump(res, open(OUT + "/layers.json", "w"), indent=1)
print({k: len(v) for k, v in res.items()})
