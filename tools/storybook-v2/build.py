#!/usr/bin/env python3
"""Build decks/<slug>/v2/story.json for the pop-up storybook engine.
Inputs: v2/layers.json (from split.py), text/dNN.md or dNN_wendell.md, motion/dNN.json (authored from dNN-spec.md).
Usage: python3 build.py d01"""
import json, re, sys, os
import numpy as np
from PIL import Image
ROOT = "/workspace/astro-course"; PUB = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../../public/astro-course/decks")
slug = sys.argv[1]; key = slug.upper()
deck = os.path.join(PUB, slug)
layers = json.load(open(os.path.join(deck, "v2/layers.json")))

def md_inline(s):
    s = s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    s = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", s)
    s = re.sub(r"\*(.+?)\*", r"<i>\1</i>", s)
    s = re.sub(r"\^\(?(-?[0-9]+)\)?", r"<sup>\1</sup>", s)
    return s

def text_html():
    alt = re.sub(r"[-.]", "_", slug)
    for name in (f"{slug}_wendell.md", f"{slug}.md", f"{alt}_wendell.md", f"{alt}.md"):
        p = os.path.join(ROOT, "text", name)
        if os.path.exists(p): break
    else: return {}
    out, cur = {}, None
    for block in re.split(r"\n\s*\n", open(p).read()):
        for line in block.strip().split("\n"):
            m = re.match(r"## Slide (\d+)", line)
            if m: cur = m.group(1); out[cur] = []; continue
            if cur is None or not line.strip() or line.startswith("# "): continue
            if line.startswith("### "): out[cur].append(f"<h3>{md_inline(line[4:])}</h3>"); continue
            if out[cur] and out[cur][-1].startswith("<p>") and not block.strip().startswith(line):
                out[cur][-1] = out[cur][-1][:-4] + " " + md_inline(line) + "</p>"
            else: out[cur].append(f"<p>{md_inline(line)}</p>")
    return {k: "".join(v) for k, v in out.items()}

def spec_path():
    for name in (f"{slug}-spec.md", f"{slug.replace('-', '.')}-spec.md", f"{slug.upper()}-spec.md"):
        p = os.path.join(ROOT, "motion", name)
        if os.path.exists(p): return p

cfg_p = os.path.join(ROOT, "motion", f"{slug}.json")
cfg_p_exists = os.path.exists(cfg_p)
cfg = json.load(open(cfg_p)) if cfg_p_exists else {"layers": {}, "fx": {}, "sandboxes": {}, "three": {}}
# The repo copy (tools/storybook-v2/motion/<slug>.json) can carry deck flags such as "immersive" on its own.
repo_cfg = os.path.join(os.path.dirname(os.path.abspath(__file__)), "motion", f"{slug}.json")
if os.path.exists(repo_cfg) and "immersive" in json.load(open(repo_cfg)): cfg["immersive"] = json.load(open(repo_cfg))["immersive"]
sp = spec_path(); popup_v2 = bool(sp and open(sp).read().lstrip().startswith("## Pop-up v2"))
texts = text_html()
# Without an authored motion/dNN.json, read the spec line for each page and give its main (largest
# popped) drawing the motion the line names; the rest float. Spec 'Touch:' parts map to interactions.
spec_lines = {}
if sp:
    for line in open(sp):
        m = re.match(r"^(\d+)\s+(.*)", line.strip())
        if m: spec_lines[m.group(1)] = m.group(2).lower()
def guess(line):
    for kw, mo in (("twinkl", "twinkle"), ("star field", "twinkle"), ("orbit", "orbit"), ("spin", "spin"), ("rotat", "spin"),
                   ("launch", "launch"), ("rocket", "launch"), ("drift", "drift"), ("comet", "drift"), ("glow", "pulse"), ("pulse", "pulse")):
        if kw in line: return mo
    return "float"
def touch(line):
    t = line.split("touch:", 1)[1] if "touch:" in line else ""
    for kw, it in (("launch", "launch"), ("spin", "spin"), ("orbit", "orbit"), ("tap", "pulse"), ("drag", "toss"), ("toss", "toss")):
        if kw in t: return it
    return None
# Every page gets one real 3D object that sketches in and spins on drag; the spec line and page text pick it.
def hero_for(n, line, text):
    t = (line + " " + re.sub(r"<[^>]+>", " ", text)).lower()
    has = lambda *ks: any(re.search(r"\b" + k, t) for k in ks)
    if has("moon", "lunar", "eclipse", "tide") and has("sun", "earth"): return "sem"
    for kws, kind in ((("galax", "milky way", "universe", "cosmic", "big bang", "nebula"), "galaxy"),
                      (("saturn", "jupiter", "uranus", "neptune", "gas giant", r"rings?\b"), "ringed"),
                      (("mars", "red planet", "rover"), "mars"),
                      (("rocket", "spacecraft", "probe", "satellite", "station", "voyager", "astronaut", "shuttle", "telescope"), "probe"),
                      ((r"sun\b", r"stars?\b", "solar", "light-year", "fusion"), "sun"),
                      (("moon", "lunar", "crater"), "moon"),
                      (("earth", "season", "planet", "orbit", "gravity"), "earth")):
        if has(*kws): return kind
    return "sem"
QUIET = {"d24-5": {"17", "18", "19", "20"}}  # remembrance pages: a quiet star field and nothing else
slides = {}
for n, ls in layers.items():
    out = []
    for l in ls:
        a = np.asarray(Image.open(os.path.join(deck, l["src"])).convert("RGBA"))[:, :, 3]
        fill = float((a > 128).mean())
        x, y, w, h = l["box"]
        o = cfg["layers"].get(f"{n}:{l['order']}", {})
        # thin strokes and open outlines (text cards, underlines) stay flat on the paper so text lines up
        flat = h < 6 or fill < 0.12 or o.get("flat", False)
        d = {"src": l["src"], "box": [round(v, 3) for v in l["box"]], "flat": flat,
             "kind": o.get("kind", "prop"), "motion": o.get("motion", "none" if flat else "float")}
        for k in ("enter", "interact", "replaced3d"):
            if o.get(k): d[k] = o[k]
        if n in cfg.get("static", []): d["flat"] = True; d["motion"] = "none"
        out.append(d)
    if not cfg_p_exists and n in spec_lines:
        line = spec_lines[n]; big = sorted([d for d in out if not d["flat"]], key=lambda d: -d["box"][2] * d["box"][3])
        if big:
            big[0]["motion"] = guess(line)
            it = touch(line)
            if it: big[0]["interact"] = it
    three = cfg["three"].get(n)
    if n in QUIET.get(slug, ()):
        for d in out: d["flat"] = True; d["motion"] = "none"; d.pop("interact", None)
        three = "starfield"
    scene = cfg.get("scene", {}).get(n)
    hero = None if (three or scene) else (cfg.get("hero", {}).get(n) or hero_for(n, spec_lines.get(n, ""), texts.get(n, "")))
    slides[n] = {"layers": out, "text": texts.get(n, ""), "fx": [] if scene else cfg["fx"].get(n, []), "scene": scene,
                 "sandbox": cfg["sandboxes"].get(n), "three": three, "hero": hero}
json.dump({"slug": slug, "popupSpec": "v2" if popup_v2 else "v1", "immersive": bool(cfg.get("immersive")), "slides": slides},
          open(os.path.join(deck, "v2/story.json"), "w"), separators=(",", ":"))
print(slug, "slides", len(slides), "text", len(texts), "spec", "v2" if popup_v2 else "v1",
      "popped", sum(1 for s in slides.values() for l in s["layers"] if not l["flat"]))
