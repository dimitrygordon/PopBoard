#!/usr/bin/env python3
"""Wire Socrates' step-by-step solutions into the Study Questions data.

usage: wire-step-cards.py <steps.json> <public dir>
steps.json: {cardId: [{"label": "Givens" | "Equation" | "Substitute" | "Answer" | ..., "text": "..."}]}
Each listed card gets item["stepCards"] = [{label, kind, html}]; sq-core.js renders those as Leo's step cards.
Cards not in the file lose any old stepCards and fall back to the existing solution display. Idempotent.
Text is plain (HTML-escaped); <sup> <sub> <b> <i> are allowed. Em-dashes are rejected.
"""
import glob, html, json, os, re, sys
steps_path, pub = sys.argv[1:3]
data = json.load(open(steps_path, encoding="utf-8"))
KINDS = {"givens": "givens", "given": "givens", "equation": "equation", "substitute": "substitute", "answer": "answer"}
OK_TAGS = re.compile(r"&lt;(/?)(sup|sub|b|i)&gt;")
def to_html(t):  # Tesla: exponents render as superscripts (x^2 -> x<sup>2</sup>), sqrt(...) as the root sign
    h = OK_TAGS.sub(r"<\1\2>", html.escape(t, quote=False)).replace("\n", "<br>")
    return re.sub(r"\bsqrt\(", "√(", re.sub(r"\^(-?\w+)", r"<sup>\1</sup>", h))
OVR = {k: v for k, v in json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "step-overrides.json"), encoding="utf-8")).items() if not k.startswith("_")}
# Open-ended, museum, career, CER and project cards: Socrates' Substitute step is a placeholder there (no numbers to put in),
# so those cards keep their existing solution display even when the steps file lists them (Dimitry, Nov 2026).
SKIP = re.compile(r"museum|STEM at Work|career|Recruit|\bCER\b|\bClaim\b|Evidence and reasoning|Revisit the Phenomenon|\bProject\b|Ask Questions|"
                  r"Encounter the Phenomenon|driving question|Science & Society|Review the News|Research|Wrap-Up", re.I)
FIXES = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "sq-answer-fixes.json"), encoding="utf-8"))
def plain(h): return re.sub(r"\s+", "", html.unescape(re.sub(r"<[^>]+>", "", h)))
def answer_html(it, s):
    """The Answer step shows the card's own answer html (run after fix-sq-leaks.py, so source fixes and the book's superscripts
    carry over; the steps file flattened t<sup>2</sup> to t2). Other steps: Tesla's overrides, then the steps file."""
    lab = s["label"].strip()
    if lab.lower() == "answer":
        own = "<br>".join(b["html"] for b in it["answer"] if "html" in b)
        if it["id"] in FIXES and ("answer" in FIXES[it["id"]] or "replace" in FIXES[it["id"]]) or own and plain(own) == plain(to_html(s["text"])): return own
        return to_html(s["text"].strip())
    return to_html(OVR.get(it["id"], {}).get(lab, s["text"]).strip())
errs = []
for cid, steps in data.items():
    if not isinstance(steps, list) or not steps: errs.append(f"{cid}: no steps")
    for s in steps or []:
        if not str(s.get("text", "")).strip() or not str(s.get("label", "")).strip(): errs.append(f"{cid}: empty label or text")
        if "\u2014" in s.get("text", "") + s.get("label", ""): errs.append(f"{cid}: em-dash in step text")
seen, n = set(), 0
for f in sorted(glob.glob(os.path.join(pub, "physics101/sq/*.json"))):
    if f.endswith("index.json"): continue
    d = json.load(open(f, encoding="utf-8")); ch = False
    for it in d["items"]:
        want = None
        if it["id"] in data: seen.add(it["id"])
        if it["id"] in data and not SKIP.search(it["title"]):
            want = [{"label": s["label"].strip(), "kind": KINDS.get(s["label"].strip().lower(), "step"), "html": answer_html(it, s)} for s in data[it["id"]]]
        if it.get("stepCards") != want:
            if want is None: it.pop("stepCards", None)
            else: it["stepCards"] = want; n += 1
            ch = True
    if ch: open(f, "w", encoding="utf-8").write(json.dumps(d, ensure_ascii=False, separators=(",", ":")))
errs += [f"{cid}/{lab}: override for a missing step" for cid, o in OVR.items() for lab in o if cid in data and lab not in [s["label"] for s in data[cid]]]
errs += [f"{cid}: no such card" for cid in data if cid not in seen]
if errs: sys.exit("step cards: " + "; ".join(errs))
wired = sum(1 for f in glob.glob(os.path.join(pub, "physics101/sq/*.json")) if not f.endswith("index.json") for it in json.load(open(f, encoding="utf-8"))["items"] if "stepCards" in it)
print(f"step cards: {len(seen)} cards in the file, {wired} shown as step cards ({len(seen) - wired} open-ended/CER/project kept as is), {n} updated")
