#!/usr/bin/env python3
"""Build Physics 101 Study Questions data from the parsed Inspire Physics PDFs.

Input:  items.json from the PDF extractor (both Drive folders: "Inspire Physics Modified
        Questions" = src "mq", "Inspire Physics Solutions" = src "sol") and its cropped
        book figures / equation images.
Output: public/physics101/sq/<slug>.json (one per lesson) and public/physics101/sq/img/*.webp.

Rules: lesson sections only (module opener, wrap-up and Math Skill Handbook stay out until
Dimitry decides), and a problem is kept only if the PDF gives an answer.
usage: build-study-questions.py <items.json> <img dir> <public dir>
"""
import json, os, re, sys
from PIL import Image, ImageOps
items_path, img_dir, pub = sys.argv[1:4]
out = os.path.join(pub, "physics101", "sq"); os.makedirs(os.path.join(out, "img"), exist_ok=True)
items = json.load(open(items_path))
STEP = {"known": "What we know", "what": "What we know", "physics": "Physics idea", "work": "Work",
        "claim": "Claim", "evidence": "Evidence", "reasoning": "Reasoning", "strategy": "Strategy", "solve": "Solve"}
used = set()
def img(name, maxw):
    stem = name[:-4] + ".webp"
    if stem not in used:
        im = Image.open(os.path.join(img_dir, name)).convert("RGB")
        if im.width > maxw: im = im.resize((maxw, round(im.height * maxw / im.width)), Image.LANCZOS)
        im.save(os.path.join(out, "img", stem), quality=82); used.add(stem)
    return "img/" + stem
def merge_subparts(its):
    """'(b) ...' headings are sub-parts of the problem above: fold them in as labeled parts."""
    out = []
    for it in its:
        m = re.match(r"^\(([a-z])\)\s*(.*)", it["title"])
        if m and out and out[-1]["section"] == it["section"]:
            prev = out[-1]; tag = "(" + m.group(1) + ") "
            prev["parts"].append({"f": "question", "h": "<b>" + tag + "</b>" + m.group(2)})
            for p in it["parts"]:
                q = dict(p)
                if q["f"] == "question": q["f"] = "work"
                if q["f"] == "answer" and "h" in q: q["h"] = "<b>" + tag + "</b>" + q["h"]
                prev["parts"].append(q)
        else: out.append({**it, "parts": list(it["parts"])})
    return out
lessons = {}
for key, its in items.items():
    src, mod = key.split("-", 1)
    if not mod.isdigit(): continue
    for n, it in enumerate(merge_subparts(its)):
        if not isinstance(it["section"], int): continue
        parts = it["parts"]
        if not any(p["f"] == "answer" for p in parts): continue
        blocks = {"question": [], "steps": [], "answer": [], "check": []}
        for p in parts:
            f = p["f"]
            b = {"html": p["h"]} if "h" in p else {"eq": img(p["eqimg"], 900), "alt": p.get("alt", ""), "w": p["w"]} if "eqimg" in p else {"fig": img(p["fig"], 900), "w": p["w"]}
            if "html" in b and not b["html"].strip(): continue
            if f in ("question", "title"): blocks["question"].append(b)
            elif f == "answer": blocks["answer"].append(b)
            elif f == "check": blocks["check"].append(b)
            else:
                lab = STEP.get(f, f.capitalize())
                if "label" in p or not blocks["steps"] or blocks["steps"][-1]["label"] != lab: blocks["steps"].append({"label": lab, "body": [b]})
                else: blocks["steps"][-1]["body"].append(b)
        if re.match(r"\s*(Module Opener|Module Wrap-Up|Math Skill Handbook)", it["title"], re.I): continue  # held until Dimitry confirms placement
        slug = f"m{int(mod):02d}-l{it['section']:02d}"
        lessons.setdefault(slug, []).append({"id": f"{src}{int(mod):02d}-{n}", "src": src, "page": it["page"],
            "title": re.sub(r"\s+", " ", it["title"]).strip(), **blocks})
for slug, its in lessons.items():
    its.sort(key=lambda x: (x["src"] != "mq", x["page"]))
    txt = json.dumps({"slug": slug, "items": its}, ensure_ascii=False, separators=(",", ":"))
    txt = txt.replace(" \u2014 ", ", ").replace("\u2014", ", ")  # house style: no em-dashes
    open(os.path.join(out, slug + ".json"), "w").write(txt)
print(len(lessons), "lessons", sum(len(v) for v in lessons.values()), "problems", len(used), "images")
