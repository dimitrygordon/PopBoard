#!/usr/bin/env python3
"""Wire Leo's Math Skills, Module Opener and Module Wrap-Up art packs into Study Questions.

Leo's shape: study-questions/manifest-packs-ms-ow.json {items: {id: {pack, id}}}, each pack a JSON object
{id: svg string} (packs/math-skills/<topic>.json, packs/opener-wrapup/<lesson slug>.json).
Each id must be an existing problem: opener/wrap ids in that lesson's sq/<slug>.json, Math Skills ids in
sq/math-skills.json. SVGs go through pack-sq.py (one JSON per module, ms.json for Math Skills); no loose files remain.
Usage: wire-sq-packs.py [/workspace/physics101/study-questions]
"""
import json, subprocess, sys
from pathlib import Path

SRC = Path(sys.argv[1] if len(sys.argv) > 1 else "/workspace/physics101/study-questions")
PUB = Path(__file__).resolve().parents[2] / "public/physics101/sq"
items = {i["id"]: (p.stem, i["where"]) for p in PUB.glob("*.json") if p.name != "index.json" for i in json.loads(p.read_text())["items"]}
man = json.loads((SRC / "manifest-packs-ms-ow.json").read_text())["items"]
idx_path = PUB / "art/index.json"; art = json.loads(idx_path.read_text())
cache, bad, n = {}, [], 0
for pid, e in man.items():
    pack = SRC / e["pack"]
    svg = cache.setdefault(pack, json.loads(pack.read_text()) if pack.exists() else {}).get(e["id"])
    if pid not in items: bad.append(f"{pid}: no such problem"); continue
    slug, where = items[pid]
    if where not in ("opener", "wrap", "math"): bad.append(f"{pid}: {where} item"); continue
    if pack.parent.name == "opener-wrapup" and pack.stem != slug: bad.append(f"{pid}: pack {pack.stem} but lives in {slug}"); continue
    if not svg or not svg.lstrip().startswith("<svg") or "\u2014" in svg: bad.append(f"{pid}: bad svg"); continue
    (PUB / "art" / f"{pid}.svg").write_text(svg); art[pid] = 1; n += 1
if bad:
    for f in PUB.glob("art/*.svg"): f.unlink()
    sys.exit(f"not wired, mismatches: {bad[:10]} ({len(bad)} total)")
idx_path.write_text(json.dumps(art, separators=(",", ":"), sort_keys=True))
print(f"wired {n}; index now {len(art)}")
subprocess.run([sys.executable, str(Path(__file__).resolve().parent / "pack-sq.py")], check=True)
