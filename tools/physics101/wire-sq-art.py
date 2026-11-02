#!/usr/bin/env python3
"""Wire Leo's cleared Study Questions art for one or more modules.

Usage: python3 tools/physics101/wire-sq-art.py m07 [m08 ...]
Reads /workspace/physics101/study-questions/<mNN>/manifest.json (id -> {lesson, svg, drag_hint}),
copies each SVG to public/physics101/sq/art/<id>.svg and merges sq/art/index.json
(id -> 1, or {"drag": "x"|"y"}). Fails if an id is unknown or sits in a different lesson.
"""
import json, shutil, sys
from pathlib import Path

SRC = Path("/workspace/physics101/study-questions")
PUB = Path(__file__).resolve().parents[2] / "public/physics101/sq"
idx_path = PUB / "art/index.json"
art = json.loads(idx_path.read_text())
lesson_of = {i: slug for slug, v in json.loads((PUB / "index.json").read_text()).items() for i, _ in v["t"]}
bad, added = [], 0
for mod in sys.argv[1:]:
    for pid, e in json.loads((SRC / mod / "manifest.json").read_text()).items():
        svg = SRC / e["svg"]
        if lesson_of.get(pid) != e["lesson"] or not svg.is_file():
            bad.append((pid, e["lesson"], lesson_of.get(pid), svg.is_file())); continue
        shutil.copyfile(svg, PUB / "art" / f"{pid}.svg")
        h = e.get("drag_hint")
        art[pid] = {"drag": h} if h in ("x", "y") else 1
        added += 1
if bad:
    sys.exit(f"not wired, mismatches: {bad[:10]} ({len(bad)} total)")
idx_path.write_text(json.dumps(art, separators=(",", ":"), sort_keys=True))
print(f"wired {added}; index now {len(art)}")
