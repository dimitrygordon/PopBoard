#!/usr/bin/env python3
"""Build the PopBoard Night Sky constellation art atlas.

Input : Stellarium sky culture "western" (the modern IAU set), index.json + illustrations/*.webp
        by Johan Meuris, Free Art License 1.3.
Output: constellations-atlas.png (8-bit single channel), constellations-atlas.webp,
        art-atlas.json (per-constellation atlas rect, uv rect, anchors in source and atlas space).

Modifications made to the originals (recorded in README.md as FAL 1.3 requires):
  black floor removed, grey levels re-normalized and lifted, soft glow and a bright rim added, fills dimmed, Andromeda downscaled 1024 -> 512
  to its declared size, all images repacked into one atlas, converted to PNG/WebP.

Usage: python3 build-art-atlas.py <skyculture_dir> <out_dir> <commit_hash>
"""
import json, sys, os, hashlib
import numpy as np
from PIL import Image, ImageFilter

ATLAS = 4096
GUTTER = 8

def process(img, size):
    g = img.convert("RGB").split()[0]
    if g.size != tuple(size):
        g = g.resize(tuple(size), Image.LANCZOS)
    a = np.asarray(g).astype(np.float32) / 255.0
    lit = a[a > 0.04]
    hi = np.percentile(lit, 99.5) if lit.size else 1.0
    floor = 0.03                                            # kill faint source halos/boxes (Andromeda has a 1-3 level frame)
    v = np.clip((a - floor) / max(hi - floor, 1e-3), 0, 1) ** 0.85   # lift: figures become bright ghost white
    # soft glow: wide faint halo + light softening of hard edges
    r = max(1.5, size[0] * 0.012)
    vi = Image.fromarray((v * 255).astype(np.uint8))
    halo = np.asarray(vi.filter(ImageFilter.GaussianBlur(r))).astype(np.float32) / 255.0
    soft = np.asarray(vi.filter(ImageFilter.GaussianBlur(0.6))).astype(np.float32) / 255.0
    # luminous rim: Night Sky figures read as translucent fills with brighter soft edges
    wide = np.asarray(vi.filter(ImageFilter.GaussianBlur(max(1.2, size[0] * 0.006)))).astype(np.float32) / 255.0
    rim = np.clip(np.abs(soft - wide) * 2.2, 0, 1)
    rim = np.asarray(Image.fromarray((rim * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8))).astype(np.float32) / 255.0
    out = np.clip(0.50 * soft + 0.55 * rim + 0.30 * halo, 0, 1)
    out[:2, :] = 0; out[-2:, :] = 0; out[:, :2] = 0; out[:, -2:] = 0   # clean borders, no bleed
    return Image.fromarray((out * 255 + 0.5).astype(np.uint8), "L")

def main(sc, outdir, commit):
    idx = json.load(open(os.path.join(sc, "index.json")))
    items = []
    for c in idx["constellations"]:
        im = c.get("image")
        if not im:
            continue
        items.append((c["iau"], c, im))
    # shelf pack, biggest first, then by name for stable output
    items.sort(key=lambda t: (-t[2]["size"][1], t[0]))
    atlas = Image.new("L", (ATLAS, ATLAS), 0)
    x = y = GUTTER; shelf_h = 0
    entries = {}
    for iau, c, im in items:
        w, h = im["size"]
        if x + w + GUTTER > ATLAS:
            x = GUTTER; y += shelf_h + GUTTER; shelf_h = 0
        if y + h + GUTTER > ATLAS:
            raise SystemExit("atlas overflow")
        src = Image.open(os.path.join(sc, im["file"]))
        atlas.paste(process(src, (w, h)), (x, y))
        sx, sy = w / im["size"][0], h / im["size"][1]
        anchors = []
        for a in im["anchors"]:
            px, py = a["pos"]
            ax, ay = x + px * sx, y + py * sy
            anchors.append({"hip": a["hip"], "pos": [px, py], "atlas": [round(ax, 3), round(ay, 3)],
                            "uv": [round(ax / ATLAS, 6), round(1 - ay / ATLAS, 6)]})
        entries[iau] = {
            "iau": iau,
            "latin": c["common_name"].get("native"),
            "english": c["common_name"].get("english"),
            "source": im["file"],
            "sourcePixels": list(src.size),
            "size": [w, h],
            "atlasRect": [x, y, w, h],
            "uvRect": [round(x / ATLAS, 6), round(1 - (y + h) / ATLAS, 6),
                       round((x + w) / ATLAS, 6), round(1 - y / ATLAS, 6)],
            "anchors": anchors,
        }
        x += w + GUTTER; shelf_h = max(shelf_h, h)
    used_h = y + shelf_h + GUTTER
    os.makedirs(outdir, exist_ok=True)
    png = os.path.join(outdir, "constellations-atlas.png")
    atlas.save(png, optimize=True)
    webp = os.path.join(outdir, "constellations-atlas.webp")
    atlas.convert("RGB").save(webp, "WEBP", quality=88, method=6)
    sha = lambda p: hashlib.sha256(open(p, "rb").read()).hexdigest()
    manifest = {
        "version": 1,
        "atlas": {"png": "constellations-atlas.png", "webp": "constellations-atlas.webp",
                  "width": ATLAS, "height": ATLAS, "gutter": GUTTER, "usedHeight": used_h,
                  "channels": "single channel intensity (R=G=B in WebP). Upload as THREE.RedFormat, linear filter, no mipmaps v1",
                  "colorSpace": "linear intensity, not sRGB color; tint in shader",
                  "sha256": {"png": sha(png), "webp": sha(webp)}},
        "conventions": {
            "pos": "anchor pixel in source image space, origin top-left, x right, y down, units of `size` (Stellarium index.json)",
            "atlas": "same point in atlas pixels, origin top-left, y down",
            "uv": "three.js uv with flipY=true default: u = ax/4096, v = 1 - ay/4096",
            "atlasRect": "[x, y, w, h] in atlas pixels, origin top-left",
            "uvRect": "[u0, v0, u1, v1], v0 is the bottom edge (flipY=true)",
            "pixelToUv": "u = (rect.x + px*rect.w/size.w)/4096, v = 1 - (rect.y + py*rect.h/size.h)/4096",
        },
        "look": {"blending": "additive", "tint": "#E6E6FF", "tintLinear": [0.791, 0.791, 1.0],
                 "shader": "gl_FragColor = vec4(uTint * texture2D(uAtlas, vUv).r * uArtAlpha, 1.0); AdditiveBlending, depthWrite false, depthTest false",
                 "artAlphaDefault": 0.5, "artAlphaRange": [0.15, 1.0]},
        "source": {"repo": "https://github.com/Stellarium/stellarium-skycultures", "commit": commit,
                   "path": "western/", "author": "Johan Meuris", "license": "Free Art License 1.3"},
        "skipped": [c["iau"] for c in idx["constellations"] if not c.get("image")],
        "count": len(entries),
        "entries": entries,
    }
    json.dump(manifest, open(os.path.join(outdir, "art-atlas.json"), "w"), indent=1)
    print(len(entries), "entries, used height", used_h, "webp KB", os.path.getsize(webp) // 1024,
          "png KB", os.path.getsize(png) // 1024)

if __name__ == "__main__":
    main(*sys.argv[1:4])
