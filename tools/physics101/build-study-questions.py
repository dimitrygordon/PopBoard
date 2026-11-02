#!/usr/bin/env python3
"""Build Physics 101 Study Questions data from the parsed Inspire Physics PDFs.

Input:  items.json from the PDF extractor (both Drive folders: "Inspire Physics Modified
        Questions" = src "mq", "Inspire Physics Solutions" = src "sol") and its cropped
        book figures / equation images.
Output: public/physics101/sq/<slug>.json (one per lesson) and public/physics101/sq/img/*.webp.

Rules (Dimitry): module opener items park in the module's first lesson, wrap-up items in its
last lesson, and the Math Skill Handbook (the PDFs' back matter) is a course-level "math-skills" set.
A problem is kept only if the PDF gives an answer.
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
# lesson numbers per module, from the Physics 101 catalog (p101-catalog.js)
cat = open(os.path.join(pub, "physics101", "p101-catalog.js")).read()
mod_lessons = {}
for m, l in re.findall(r'"?slug"?:\s*"m(\d\d)-l(\d\d)"', cat): mod_lessons.setdefault(int(m), []).append(int(l))
for key, its in items.items():
    src, mod = key.split("-", 1)
    handbook = mod == "backmatter"
    if not mod.isdigit() and not handbook: continue
    for n, it in enumerate(merge_subparts(its)):
        sec = it["section"]
        if not handbook and isinstance(sec, int) and re.match(r"\s*Module Wrap-Up", it["title"], re.I): sec = "wrap"
        if not handbook and sec not in ("opener", "wrap") and not isinstance(sec, int): continue
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
        if handbook: slug, iid, where = "math-skills", f"{src}ms-{n}", "math"
        else:
            ls = mod_lessons[int(mod)]
            lesson = min(ls) if sec == "opener" else max(ls) if sec == "wrap" else sec
            slug, iid, where = f"m{int(mod):02d}-l{lesson:02d}", f"{src}{int(mod):02d}-{n}", sec if sec in ("opener", "wrap") else "lesson"
        lessons.setdefault(slug, []).append({"id": iid, "src": src, "page": it["page"], "where": where,
            "title": re.sub(r"\s+", " ", it["title"]).strip(), **blocks})
for slug, its in lessons.items():
    its.sort(key=lambda x: (x["src"] != "mq", {"opener": 0, "lesson": 1, "math": 1, "wrap": 2}[x["where"]], x["page"]))
    txt = json.dumps({"slug": slug, "items": its}, ensure_ascii=False, separators=(",", ":"))
    txt = txt.replace(" \u2014 ", ", ").replace("\u2014", ", ")  # house style: no em-dashes
    txt = txt.replace("\\u0002 ", "$").replace("\\u0002", "$")  # the PDFs' dollar sign extracts as U+0002
    txt = txt.replace(", = \\\\frac{1} {2}mv^2$", ", \u00bdmv\u00b2")  # one stray LaTeX fragment in the source text
    open(os.path.join(out, slug + ".json"), "w").write(txt)
# search index for the Practice Questions library: counts and titles per lesson
idx = json.dumps({slug: {"mq": sum(i["src"] == "mq" for i in its), "sol": sum(i["src"] == "sol" for i in its), "t": [[i["id"], i["title"]] for i in its]}
                  for slug, its in sorted(lessons.items())}, ensure_ascii=False, separators=(",", ":"))
open(os.path.join(out, "index.json"), "w").write(idx.replace(" \u2014 ", ", ").replace("\u2014", ", ").replace("\\u0002 ", "$").replace("\\u0002", "$").replace(", = \\\\frac{1} {2}mv^2$", ", \u00bdmv\u00b2"))
print(len(lessons), "lessons", sum(len(v) for v in lessons.values()), "problems", len(used), "images")
# pack loose art and images (Cloudflare Pages 20,000-file cap); see pack-sq.py
import subprocess as _sp; _sp.run([sys.executable, os.path.join(os.path.dirname(os.path.abspath(__file__)), "pack-sq.py")], check=True)
# restore full question stems from the re-extracted source (sq/extract.py -> items.stems.json); see fix-sq-stems.py
_st = os.path.join(os.path.dirname(os.path.abspath(sys.argv[1])), "items.stems.json")
if os.path.exists(_st): _sp.run([sys.executable, os.path.join(os.path.dirname(os.path.abspath(__file__)), "fix-sq-stems.py"), _st, pub], check=True)
# keep worked solutions out of the question area (step labels written "Work." etc.); see fix-sq-leaks.py
_sp.run([sys.executable, os.path.join(os.path.dirname(os.path.abspath(__file__)), "fix-sq-leaks.py"), pub], check=True)
# Socrates' step-by-step solutions (Leo's step cards); cards without them keep the solution display. See wire-step-cards.py
_steps = os.environ.get("P101_STEPS", os.path.join(os.path.dirname(os.path.abspath(__file__)), "m01-m06-steps.json"))  # copy of Socrates' file; refresh it when Tesla's corrections land
if os.path.exists(_steps): _sp.run([sys.executable, os.path.join(os.path.dirname(os.path.abspath(__file__)), "wire-step-cards.py"), _steps, pub], check=True)
