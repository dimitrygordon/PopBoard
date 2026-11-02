#!/usr/bin/env python3
"""Rebuild public/fonts/sq-math-fallback.woff2: the characters in the Study Questions text that Patrick Hand lacks, cut from
Noto Sans Math (SIL OFL 1.1). Usage: sq-math-font.py /path/NotoSansMath-Regular.ttf  (prints the unicode-range for sq-page.css)."""
import glob, json, os, subprocess, sys
from fontTools.ttLib import TTFont
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../..")
ph = TTFont(os.path.join(root, "public/fonts/patrick-hand.woff2")).getBestCmap(); nm = TTFont(sys.argv[1]).getBestCmap(); cps = set()
def walk(o):
    if isinstance(o, str):
        if not o.startswith("data:"): cps.update(ord(c) for c in o)
    elif isinstance(o, dict): [walk(v) for k, v in o.items() if k not in ("eq", "fig", "src")]
    elif isinstance(o, list): [walk(v) for v in o]
for f in glob.glob(os.path.join(root, "public/physics101/sq/m*.json")): walk(json.load(open(f, encoding="utf-8")))
rng = ",".join("U+%04X" % c for c in sorted(cps) if c > 0x7F and c not in ph and c in nm)
subprocess.run(["pyftsubset", sys.argv[1], "--unicodes=" + rng, "--flavor=woff2", "--layout-features=*", "--output-file=" + os.path.join(root, "public/fonts/sq-math-fallback.woff2")], check=True)
print(rng)
