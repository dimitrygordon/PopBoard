#!/usr/bin/env python3
"""Keep worked solutions out of the question area of Physics 101 Study Questions.

Some source PDFs write a step label with a period ("Work.", "Physics idea.") or run a part's reasoning
on in the same bold line as the part ("(a) How long ...? Tess's line leaves the axis at ..."). The
extractor kept that text in the question, so it showed before "Show answer". This moves it, in source
order, into the solution steps. Wording is never changed, only where it sits. Idempotent.
usage: fix-sq-leaks.py <public dir>
"""
import json, re, sys, glob, os
LAB = r"What we know / need to find|What we know|What we read|Physics idea|Work|Check|Known|Unknown|Strategy|Solve|Claim|Evidence|Reasoning"
MARK = re.compile(r"(?:(?<=^)|(?<=[\s.>]))(" + LAB + r")(?: \([^()]{0,80}\))?[.:](?=\s|<|$)")
# some modules write the labels bare ("What we know / need to find q = ... Physics idea F = ..."): only trusted when a block opens with one
BARE_START = re.compile(r"^(What we know / need to find|Physics idea) ")
BARE = re.compile(r"(?:(?<=^)|(?<=[\s.>]))(What we know / need to find|Physics idea|Work|Check)(?= )")
# Leo's wording calls (source punctuation only, no new words)
TITLE_OVERRIDES = {
    "mq02-42": "Lesson 3, Problem 19 (Challenge): Rosa and Tess hike the same trail: Rosa's graph runs from (0, 0) to (1.60 h, 8.0 km); Tess's graph runs from (0.25 h, 0) to (2.75 h, 8.0 km).",
}
# Leo's pencil art standing in for a card's book figure: id -> (light, dark) webp in tools/physics101/sq-art/, inlined as data URIs.
# The renderer shows the dark one under PopBoard's dark theme (which follows the browser until toggled).
FIG_OVERRIDES = {"mq02-42": ("mq02-42-rosa-tess-light.webp", "mq02-42-rosa-tess-dark.webp", "Pencil position-time graph: Rosa from (0, 0) to (1.60 h, 8.0 km), Tess from (0.25 h, 0) to (2.75 h, 8.0 km)")}
ARTDIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sq-art")
def uri(f):
    import base64
    return "data:image/webp;base64," + base64.b64encode(open(os.path.join(ARTDIR, f), "rb").read()).decode()
# tables in the question area, decided card by card (see /workspace/physics101/sq-table-decisions.md):
# "keep" = data the question gives students to work from; int n = worked/computed content from question block n on, moved behind Show answer
TABLES = {
    "mq01-21": "keep", "mq01-32": "keep", "mq01-35": "keep", "mq02-33": "keep", "mq02-48": "keep", "mq03-8": "keep",
    "mq10-124": "keep", "mq11-64": "keep", "mq22-79": "keep", "sol11-58": "keep", "mq13-20": "keep",
    "mq04-41": 0, "sol19-84": 0,
    # unlabeled worked text (and the answer's own diagrams) that the source prints before "Answer:"
    "sol04-40": 0, "sol06-18": 0, "mq06-18": 1,
}
# solution sections the extractor dropped (the heading "Work (experiment):" is not a plain label); wording copied from the source PDFs
_EXP = "Toss a ball straight up above a motion sensor (or film it with a scale and a high frame rate). Plot velocity against time. If {c} at the top, the graph would show a flat piece at 𝑣 = 0. The data show a smooth straight line crossing zero with a slope of about −9.8 m/s<sup>2</sup> and no flat piece. Equivalently, measure the velocity just before and just after the peak: 𝛥𝑣 / 𝛥𝑡 ≈ −9.8 m/s<sup>2</sup>."
RESTORE = {  # id -> (insert after this label, label, html)
    "mq03-88": ("Physics idea", "Work", _EXP.format(c="gravity stopped acting")),   # mq-03.pdf p.31
    "sol03-71": ("Physics idea", "Work", _EXP.format(c="the acceleration is zero")),  # sol-03.pdf p.28
}
# equation images that hold two source lines but whose alt text kept only the first (mq-06.pdf p.21-22, sol-06.pdf p.19)
ALT_TAIL = {
    "mq06-57": "; 𝜃 = tan⁻¹(1.4 / 7.2) = 11° east of north", "sol06-57": "; 𝜃 = tan⁻¹(0.62 / 3.8) = 9.3° north of east",
    "mq06-58": "; 𝜃 = tan⁻¹(80 / 140) = 30° south of west", "sol06-58": "; 𝜃 = tan⁻¹(85 / 175) = 26° east of south",
}
SHOW = {"What we know / need to find": "What we know", "Unknown": "What we know"}
PART = re.compile(r"^<b>\(([a-z])\) </b>")
def text(h): return re.sub(r"<[^>]+>", "", h)
def split_marked(h):
    """html -> (question html before the first label, [(label, html), ...])"""
    ms = list((BARE if BARE_START.match(text(h)) and not MARK.match(text(h)) else MARK).finditer(h))
    if not ms: return h, []
    segs = [(SHOW.get(m.group(1), m.group(1)), h[m.end():ms[i + 1].start() if i + 1 < len(ms) else len(h)].strip()) for i, m in enumerate(ms)]
    return h[:ms[0].start()].strip(), segs
def fix(it):
    ch = False
    if it["id"] in TITLE_OVERRIDES and it["title"] != TITLE_OVERRIDES[it["id"]]: it["title"] = TITLE_OVERRIDES[it["id"]]; ch = True
    if it["id"] in FIG_OVERRIDES:
        lf, df, alt = FIG_OVERRIDES[it["id"]]; nb = {"fig": uri(lf), "dark": uri(df), "alt": alt, "w": 350}
        figs = [i for i, b in enumerate(it["question"]) if "fig" in b]
        if figs and it["question"][figs[0]] != nb: it["question"][figs[0]] = nb; ch = True
    r = RESTORE.get(it["id"])
    if r and not any(b.get("html") == r[2] for st in it["steps"] for b in st["body"]):
        i = next((k + 1 for k, st in enumerate(it["steps"]) if st["label"] == r[0]), 0)
        it["steps"].insert(i, {"label": r[1], "body": [{"html": r[2]}]}); ch = True
    t = ALT_TAIL.get(it["id"])
    if t:
        for st in it["steps"]:
            for b in st["body"]:
                if "eq" in b and "=" in b.get("alt", "") and not b["alt"].endswith(t) and "𝜃" not in b["alt"]: b["alt"] += t; ch = True
    n = TABLES.get(it["id"])
    if isinstance(n, int) and len(it["question"]) > n:
        it["steps"] = [{"label": "Work", "body": it["question"][n:]}] + it["steps"]; it["question"] = it["question"][:n]; ch = True
    ch = leaks(it) or ch
    lone = [b for b in it["question"] if "html" in b and re.fullmatch(r"\s*(?:" + LAB + r")(?: \([^()]{0,80}\))?[.:]\s*", text(b["html"]))]
    if lone: it["question"] = [b for b in it["question"] if b not in lone]; ch = True  # a bare label heading whose content is already under Show answer
    return ch
def leaks(it):
    q, moved, after, tail = [], [], [], False  # moved: stem solution (comes before the steps); after: per-part reasoning (after them)   # tail: everything after a label in the question is solution
    for b in it["question"]:
        h = b.get("html")
        if h is not None and PART.match(h) and tail:  # a lettered line after the solution has begun is part of that solution
            moved.append(("Work", b)); continue
        if h is not None and PART.match(h):
            tag = PART.match(h).group(0); body = h[len(tag):]
            head, segs = split_marked(body)
            m = re.search(r"\?\s+(?=\S)", head)
            if m:  # "(b) Question? reasoning ..." -> the question, then the reasoning as that part's work
                segs = [("Work", head[m.end():])] + segs; head = head[:m.end()].rstrip()
            if not m and not segs and "=" in text(head) and "?" not in head:
                segs, head = [("Work", head)], ""
            if head: q.append({"html": tag + head})
            after += [(lab, {"html": tag + s}) for lab, s in segs if text(s).strip()]
            tail = False; continue
        if tail: moved.append((moved[-1][0] if moved else "Work", b)); continue
        if h is None: q.append(b); continue
        head, segs = split_marked(h)
        if head: q.append({"html": head})
        if segs: moved += [(lab, {"html": s}) for lab, s in segs if text(s).strip()]; tail = True
    if not moved and not after: return False
    # a part's reasoning cut mid-sentence ("... smaller than Rosa's (") continues in the first step line that starts lowercase or with a digit
    for lab, b in moved + after:
        h = b.get("html", "")
        if h and re.search(r"(\(|=|\b(and|or|the|of|to|so|is|a|an|than|with|by|at|in))\s*$", text(h)):
            for st in it["steps"]:
                for i, x in enumerate(st["body"]):
                    if "html" in x and re.match(r"^\s*[a-z0-9]", text(x["html"])):
                        b["html"] = h.rstrip() + x["html"].lstrip() if h.rstrip().endswith("(") else h.rstrip() + " " + x["html"].lstrip()
                        del st["body"][i]; break
                else: continue
                break
    # leftover continuation lines ("gives t = ...") finish the last unterminated parts, in order
    orph = [(st, x) for st in it["steps"] if st["label"] == "Work" for x in st["body"] if "html" in x and re.match(r"^\s*[a-z]", text(x["html"]))]
    open_ = [b for _, b in after if "html" in b and not re.search(r"[.?!]\s*$", text(b["html"]))]
    if orph and after and len(orph) <= len(open_):
        for (st, x), b in zip(orph, open_[len(open_) - len(orph):]):
            b["html"] = b["html"].rstrip() + " " + x["html"].lstrip(); st["body"].remove(x)
    it["steps"] = [s for s in it["steps"] if s["body"]]
    def group(pairs):
        steps = []
        for lab, b in pairs:
            if lab == "Check": it["check"] = it.get("check", []) + [b]; continue
            if steps and steps[-1]["label"] == lab: steps[-1]["body"].append(b)
            else: steps.append({"label": lab, "body": [b]})
        return steps
    st = []
    for x in group(moved) + it["steps"] + group(after):
        if st and st[-1]["label"] == x["label"]: st[-1]["body"] += x["body"]
        else: st.append(x)
    it["question"], it["steps"] = q, st
    return True
pub = sys.argv[1]; n = 0
for f in sorted(glob.glob(os.path.join(pub, "physics101/sq/*.json"))):
    if f.endswith("index.json"): continue
    d = json.load(open(f)); ch = [fix(it) for it in d["items"]]
    if any(ch): open(f, "w").write(json.dumps(d, ensure_ascii=False, separators=(",", ":"))); n += sum(ch)
print("moved solution text out of the question:", n)
ip = os.path.join(pub, "physics101/sq/index.json"); ix = json.load(open(ip)); ic = False
for v in ix.values():
    for t in v["t"]:
        if t[0] in TITLE_OVERRIDES and t[1] != TITLE_OVERRIDES[t[0]]: t[1] = TITLE_OVERRIDES[t[0]]; ic = True
if ic: open(ip, "w").write(json.dumps(ix, ensure_ascii=False, separators=(",", ":")))
