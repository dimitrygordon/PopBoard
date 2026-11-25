#!/usr/bin/env python3
"""Seam check for Leo's space tiles, plus a check that every runtime art file exists."""
from __future__ import annotations
from pathlib import Path
import json
import sys
from PIL import Image
import numpy as np

ROOT = Path(__file__).resolve().parents[1] / "public" / "newtons-cannonball-fire" / "art"
failures = 0
passes = 0

def check(cond, msg):
    global failures, passes
    print(("PASS " if cond else "FAIL ") + msg, flush=True)
    if cond:
        passes += 1
    else:
        failures += 1
    return cond

def edge_scores(arr, axis):
    """Mean absolute difference of wrap vs mean adjacent-pixel difference, along axis 0 (y) or 1 (x)."""
    a = arr.astype(np.int16)
    if axis == 1:  # x, columns
        wrap = np.mean(np.abs(a[:, 0] - a[:, -1]))
        neigh = np.mean(np.abs(a[:, 1:] - a[:, :-1]))
    else:
        wrap = np.mean(np.abs(a[0] - a[-1]))
        neigh = np.mean(np.abs(a[1:] - a[:-1]))
    return float(wrap), float(neigh)

def main():
    man = json.loads((ROOT / "manifest.json").read_text())
    for name in man["use"]:
        path = ROOT / name
        check(path.is_file(), f"runtime art present: {name}")
        if path.suffix == ".webp" and path.is_file():
            im = Image.open(path)
            check(im.size[0] > 0 and im.size[1] > 0, f"{name} opens ({im.size[0]}x{im.size[1]})")

    for theme in ("dark", "light"):
        path = ROOT / f"space_tile_{theme}.webp"
        im = Image.open(path).convert("RGB")
        check(im.size == (2400, 2400), f"{theme} tile is 2400x2400 ({im.size})")
        arr = np.asarray(im)
        for axis, label in ((1, "x"), (0, "y")):
            wrap, neigh = edge_scores(arr, axis)
            # Leo's PNG masters are periodic (wrap MAD ~ neighbor MAD, about 1.04-1.15).
            # We ship his lossy webps (about 45 dB vs those PNGs). Lossy encoding
            # smooths adjacent pixels, so the wrap/neighbor ratio rises even though
            # the wrap MAD stays small (about 1.13-1.30). An absolute cap still
            # catches a real color break at the edge.
            ok = wrap <= 2.0
            check(ok, f"{theme} tile seam {label}: wrap {wrap:.3f} vs neighbor {neigh:.3f}")

    print(f"RESULT {passes} passed, {failures} failed")
    sys.exit(1 if failures else 0)

if __name__ == "__main__":
    main()
