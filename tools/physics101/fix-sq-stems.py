#!/usr/bin/env python3
"""Restore full Study Question stems in public/physics101/sq/<slug>.json, keeping every item id.

The first extractor ended a heading at the first wrapped line that opened with a math span, so the rest
of the stem became a new "item" (e.g. "times?") and the item holding the real stem had no answer and was
dropped. sq/extract.py now joins wrapped headings and writes sq/out/items.stems.json. This script matches
each shipped item to its re-extracted source item by its first answer (or first step) text and copies the
source title and question text over. Text comes only from the source PDFs. Idempotent.
usage: fix-sq-stems.py <items.stems.json> <public dir>   (equation crops are read from img-stems/ beside the json)
"""
import json, re, sys, glob, os, collections
stems, pub = json.load(open(sys.argv[1])), sys.argv[2]
def norm(h): 
    h = h.replace(" \u2014 ", ", ").replace("\u2014", ", ").replace("\u0002 ", "$").replace("\u0002", "$")
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", h)).strip()
def house(s): return s.replace(" \u2014 ", ", ").replace("\u2014", ", ").replace("\u0002 ", "$").replace("\u0002", "$")
import base64, io
from PIL import Image
IMGD = os.path.join(os.path.dirname(os.path.abspath(sys.argv[1])), "img-stems")
def webp(name, maxw=900):
    im = Image.open(os.path.join(IMGD, name)).convert("RGB")
    if im.width > maxw: im = im.resize((maxw, round(im.height * maxw / im.width)), Image.LANCZOS)
    b = io.BytesIO(); im.save(b, "WEBP", quality=82); return "data:image/webp;base64," + base64.b64encode(b.getvalue()).decode()
prev_of = {}
for its in stems.values():
    for a, b in zip(its, its[1:]): prev_of[id(b)] = a
idx = collections.defaultdict(list)
for key, its in stems.items():
    src, mod = key.split("-", 1); mk = "ms" if mod == "backmatter" else mod
    for it in its:
        for p in it["parts"]:
            if p["f"] not in ("question", "title") and "h" in p and norm(p["h"]):
                idx[(src, mk, norm(p["h"]))].append(it); break
        for p in it["parts"]:
            if p["f"] == "answer" and "h" in p and norm(p["h"]): idx[(src, mk, "A:" + norm(p["h"]))].append(it); break
LABEL_ONLY = re.compile(r"^[A-Za-z &,.()]*\d+[a-z]?(, #\d+)?\)?$")
fixed, same, miss = 0, 0, []
for f in sorted(glob.glob(os.path.join(pub, "physics101/sq/*.json"))):
    if f.endswith("index.json"): continue
    d = json.load(open(f)); ch = False
    for it in d["items"]:
        mk = re.match(r"(?:mq|sol)(\d\d|ms)", it["id"]).group(1)
        cands = []
        if it["answer"] and "html" in it["answer"][0]: cands = idx.get((it["src"], mk, "A:" + norm(re.sub(r"^<b>\([a-z]\) </b>", "", it["answer"][0]["html"]))), [])
        if len(cands) == 1 and re.match(r"^(Problem\s+)?\([a-z]\)", cands[0]["title"]): cands = []  # matched a folded sub-part; use the parent
        if len(cands) != 1 and it["steps"] and "html" in it["steps"][0]["body"][0]:
            c2 = idx.get((it["src"], mk, norm(it["steps"][0]["body"][0]["html"])), [])
            if len(c2) == 1 or not cands: cands = c2
        if len(cands) != 1: miss.append(it["id"]); continue
        s = cands[0]
        title = house(re.sub(r"\s+", " ", re.sub(r"^Problem\s+", "", s["title"])).strip())
        if re.match(r"^\(([a-z])\)", title): continue  # sub-part folded into its parent by the build; parent carries the stem
        qh = [house(p["h"]) for p in s["parts"] if p["f"] == "question" and "h" in p and p["h"].strip()]
        lead = []
        if re.match(r"^[a-z]", title) and id(s) in prev_of and not any(p["f"] == "answer" for p in prev_of[id(s)]["parts"]):
            # stem broken by a displayed equation: heading and equation sit in the item above (no answer of its own)
            pv = prev_of[id(s)]
            lead = [{"html": house(p["h"])} if "h" in p else {"eq": webp(p["eqimg"]), "alt": p.get("alt", ""), "w": p["w"]}
                    for p in pv["parts"] if p["f"] == "question" and (p.get("h", "").strip() or "eqimg" in p)]
            qh = [title] + qh; title = house(re.sub(r"\s+", " ", re.sub(r"^Problem\s+", "", pv["title"])).strip())
        m = re.search(r"\s(\([a-z]\))$", title)
        if m and m.group(1) in title[:m.start()]: title = title[:m.start()]  # trailing sub-part label of the first worked step
        old_t = it["title"]
        # shipped title is the tail of a wrapped heading ("times?", "20.2 g/mol.")
        frag = bool(re.match(r"^[a-z]", old_t)) or (len(norm(title)) > len(norm(old_t)) + 15 and norm(title).endswith(norm(old_t)))
        if re.match(r"^[a-z]", title) and not lead:
            # heading wrapped onto a line the layout pass missed: take the line above it from the pdftotext copy
            src_txt = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(sys.argv[1]))), "..", "sq-src", f"{it['src']}-{'backmatter' if mk == 'ms' else mk}.txt")
            ls = [x.strip() for x in open(src_txt).read().replace("\f", "\n").split("\n")]
            hit = [i for i, x in enumerate(ls) if x and x == title.strip()]
            if len(hit) == 1:
                up = [x for x in ls[:hit[0]] if x][-1:]
                if up and not up[0].endswith((".", "?", ":")): title = house(up[0] + " " + title)
        # only repair a heading that was cut short: the source heading must extend the shipped one
        if not (frag or (title != old_t and norm(title).startswith(norm(old_t).rstrip(".:? ")[:max(12, len(norm(old_t)) - 3)]))):
            if not (LABEL_ONLY.match(old_t.strip()) and not it["question"] and qh): continue
        q = list(it["question"])
        absorbed = norm(title + " " + " ".join(qh))
        while q and "html" in q[0] and norm(q[0]["html"]) and norm(q[0]["html"]) in absorbed and not q[0]["html"].startswith("<b>("): q.pop(0)
        sub = [x for x in q if "html" in x and x["html"].startswith("<b>(")]
        if sub and re.search(r"\(b\)", title + " ".join(qh)):
            # the stem already states (a), (b)...; the folded "(a) ..." lines are worked steps, not question text
            it["steps"].append({"label": "Work", "body": sub}); q = [x for x in q if x not in sub]
        newq = lead + ([] if frag and lead else [{"html": h} for h in qh if norm(h) not in norm(" ".join(x.get("html", "") for x in q))] if (frag or not it["question"]) else []) + q
        if lead: newq = lead + [{"html": h} for h in qh] + [x for x in q if "eq" not in x]
        if title == it["title"] and newq == it["question"]: same += 1; continue
        it["title"], it["question"] = title, newq; fixed += 1; ch = True
    if ch: open(f, "w").write(json.dumps(d, ensure_ascii=False, separators=(",", ":")))
# label-only headings ("Practice Problems 14, #1"): the source states the task in the first step; show that source line as the prompt
promoted = []
for f in sorted(glob.glob(os.path.join(pub, "physics101/sq/*.json"))):
    if f.endswith("index.json"): continue
    d = json.load(open(f)); ch = False
    for it in d["items"]:
        if it["question"] or not LABEL_ONLY.match(it["title"].strip()) or not it["steps"]: continue
        b0 = it["steps"][0]["body"][0]
        if "html" in b0 and re.match(r"^(Solve|Simplify|Find|Evaluate|Write|Convert|Calculate|Combine|Express|Round|Rearrange|Use|What|How|Which)\b", norm(b0["html"])):
            it["question"] = [{"html": b0["html"]}]; promoted.append(it["id"]); ch = True
    if ch: open(f, "w").write(json.dumps(d, ensure_ascii=False, separators=(",", ":")))
print("prompt from first source step:", len(promoted), " ".join(promoted))
print("updated", fixed, "unchanged", same, "unmatched", len(miss)); print("unmatched:", " ".join(miss))
# keep the Practice Questions / Custom Quiz search index titles in step
ip = os.path.join(pub, "physics101/sq/index.json"); index = json.load(open(ip)); titles = {}
for f in glob.glob(os.path.join(pub, "physics101/sq/*.json")):
    if not f.endswith("index.json"): titles.update({i["id"]: i["title"] for i in json.load(open(f))["items"]})
for v in index.values(): v["t"] = [[i, titles.get(i, t)] for i, t in v["t"]]
open(ip, "w").write(json.dumps(index, ensure_ascii=False, separators=(",", ":")))
