#!/usr/bin/env python3
"""Keep worked solutions out of the question area of Physics 101 Study Questions.

Some source PDFs write a step label with a period ("Work.", "Physics idea.") or run a part's reasoning
on in the same bold line as the part ("(a) How long ...? Tess's line leaves the axis at ..."). The
extractor kept that text in the question, so it showed before "Show answer". This moves it, in source
order, into the solution steps. Wording is never changed, only where it sits. Idempotent.
usage: fix-sq-leaks.py <public dir>
"""
import json, re, sys, glob, os
LAB = r"What we know / need to find|What we know|Physics idea|Work|Check|Known|Unknown|Strategy|Solve|Claim|Evidence|Reasoning"
MARK = re.compile(r"(?:(?<=^)|(?<=[\s.>]))(" + LAB + r")[.:](?=\s|<|$)")
SHOW = {"What we know / need to find": "What we know", "Unknown": "What we know"}
PART = re.compile(r"^<b>\(([a-z])\) </b>")
def text(h): return re.sub(r"<[^>]+>", "", h)
def split_marked(h):
    """html -> (question html before the first label, [(label, html), ...])"""
    ms = list(MARK.finditer(h))
    if not ms: return h, []
    segs = [(SHOW.get(m.group(1), m.group(1)), h[m.end():ms[i + 1].start() if i + 1 < len(ms) else len(h)].strip()) for i, m in enumerate(ms)]
    return h[:ms[0].start()].strip(), segs
def fix(it):
    q, moved, after, tail = [], [], [], False  # moved: stem solution (comes before the steps); after: per-part reasoning (after them)   # tail: everything after a label in the question is solution
    for b in it["question"]:
        h = b.get("html")
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
