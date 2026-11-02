#!/usr/bin/env python3
"""Pack Physics 101 Study Questions assets so public/ stays under Cloudflare Pages' 20,000-file cap.

Idempotent. Run after build-study-questions.py or wire-sq-art.py (both call it at the end).
- art: loose sq/art/<id>.svg files merge into one pack per module, sq/art/mNN.json ({id: svg text}),
  then the loose files are removed. Course-level Math Skills art (mqms-N, solms-N) packs into sq/art/ms.json. sq/art/index.json (id -> 1 or {drag}) is untouched.
- img: every "eq"/"fig" path "img/x.webp" in sq/<slug>.json becomes an inline data:image/webp URI,
  then sq/img/*.webp is removed except files a sq/rich/ page links to directly.
"""
import base64, json, re, sys
from pathlib import Path

SQ = Path(__file__).resolve().parents[2] / "public/physics101/sq"
ART, IMG = SQ / "art", SQ / "img"

# Tesla re-stamp 2 Nov 2026: carry the unrounded intercept 28.875 km (30.0 - 4.5 x 0.25) in the diagram titles
ART_FIXES = {"mq02-32": [["x C = 28.9 -4.5(0.806)", "x C = 28.875 -4.5(0.806)"]], "mq02-30": [["= 28.9 -4.5t", "= 28.875 -4.5t"]]}

def pack_art():
    packs = {}
    for p in [*ART.glob("m[0-9][0-9].json"), *ART.glob("ms.json")]: packs[p.stem] = json.loads(p.read_text())
    loose = sorted(ART.glob("*.svg"))
    for f in loose:
        m = re.match(r"(mq|sol)(\d\d|ms)-", f.stem)
        if not m: sys.exit(f"pack-sq: cannot place {f.name}")
        key = "ms" if m.group(2) == "ms" else f"m{m.group(2)}"
        packs.setdefault(key, {})[f.stem] = f.read_text()
    for pid, pairs in ART_FIXES.items():  # Tesla rulings on diagram <title> text; idempotent
        v = next((pk[pid] for pk in packs.values() if pid in pk), None)
        if v is None: sys.exit(f"pack-sq: ART_FIXES id {pid} not found")
        for a, b in pairs:
            t0, t1 = v.find("<title>"), v.find("</title>")
            v = v[:t0] + v[t0:t1].replace(a, b) + v[t1:]
        for pk in packs.values():
            if pid in pk: pk[pid] = v
    for k, v in packs.items():
        (ART / f"{k}.json").write_text(json.dumps(dict(sorted(v.items())), ensure_ascii=False, separators=(",", ":")))
    for f in loose: f.unlink()
    return len(loose), sum(len(v) for v in packs.values())

def inline(node, used):
    if isinstance(node, list): return [inline(x, used) for x in node]
    if isinstance(node, dict):
        for k, v in node.items():
            if k in ("eq", "fig") and isinstance(v, str) and v.startswith("img/"):
                f = SQ / v
                if not f.exists(): sys.exit(f"pack-sq: missing {v}")
                used.add(f.name); node[k] = "data:image/webp;base64," + base64.b64encode(f.read_bytes()).decode()
            else: node[k] = inline(v, used)
    return node

def pack_img():
    used = set()
    for p in sorted(SQ.glob("*.json")):
        if p.name == "index.json": continue
        t = p.read_text()
        if '"img/' not in t: continue
        p.write_text(json.dumps(inline(json.loads(t), used), ensure_ascii=False, separators=(",", ":")))
    keep = {n for h in (SQ / "rich").rglob("*.html") for n in re.findall(r"sq/img/([\w.-]+)", h.read_text())}
    gone = 0
    for f in IMG.glob("*.webp"):
        if f.name not in keep: f.unlink(); gone += 1
    return len(used), gone, len(keep)

if __name__ == "__main__":
    a = pack_art(); i = pack_img()
    print(f"art: {a[0]} loose svgs packed, {a[1]} ids in module packs; img: {i[0]} inlined, {i[1]} files removed, {i[2]} kept for rich pages")
