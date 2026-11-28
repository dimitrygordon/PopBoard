#!/usr/bin/env python3
"""Summarise Angelo's hand-placed protostellar disk (GP disk v4 / v4.1, approved by Leo) into the per-band numbers
that buildDisk() in public/stellar-life/sl-strokes.js matches: stroke counts per radial band, arc span, length, width,
height above the plane, opacity (read from strokes.json) and colour. His strokes.json and GLBs are NOT in the repo;
this script reads them from the art folder and prints a table to copy by hand.
Usage: python3 tools/stellar-life/disk-v4-stats.py [/workspace/vr-stellar/frames/angelo/gp-test/v4/strokes_v4_1.json]"""
import json, math, sys, statistics as st
path = sys.argv[1] if len(sys.argv) > 1 else "/workspace/vr-stellar/frames/angelo/gp-test/v4/strokes_v4_1.json"
d = json.load(open(path)); AU = 10.0   # 1 AU = 0.1 m in his file
def s8(c): return round(255 * (12.92 * c if c <= 0.0031308 else 1.055 * c ** (1 / 2.4) - 0.055))
BANDS = [0, 1, 2, 3, 4, 6, 8, 10, 12, 14, 17.5]
def desc(s):
    P = s["points"]; r = [AU * math.hypot(p[0], p[2]) for p in P]; ph = [math.atan2(-p[2], p[0]) for p in P]
    span = sum((ph[i] - ph[i - 1] + math.pi) % (2 * math.pi) - math.pi for i in range(1, len(ph)))
    return dict(r=st.mean(r), span=abs(span), L=AU * sum(math.dist(P[i], P[i - 1]) for i in range(1, len(P))), w=AU * max(s["widths"]), op=s["opacity"],
                y=st.mean(abs(AU * p[1]) for p in P), c=[s8(x) for x in s["colors_linear"][len(P) // 2]])
for kind in ["wash", "disk", "rim", "frost", "core", "rocky", "jet", "jet_knot"]:
    S = [desc(s) for s in d["strokes"] if s["kind"] == kind]
    print(f"// {kind}: {len(S)} strokes, opacity {min(x['op'] for x in S):.3f} to {max(x['op'] for x in S):.3f}")
    if kind in ("wash", "disk"):
        for a, b in zip(BANDS, BANDS[1:]):
            R = [x for x in S if a <= x["r"] < b]
            if R: print(f"  [{a}, {b}, {len(R)}, {st.mean(x['span'] for x in R):.2f}, {st.mean(x['w'] for x in R):.2f}, {st.mean(x['op'] for x in R):.2f}, {st.mean(x['y'] for x in R):.2f}, \"#{''.join('%02X' % round(st.mean(x['c'][i] for x in R)) for i in range(3))}\"],")
    else:
        print("  r", sorted(round(x["r"], 2) for x in S)[:20], "w", round(st.mean(x["w"] for x in S), 2), "L", round(st.mean(x["L"] for x in S), 2))
