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
def to_html(t): return OK_TAGS.sub(r"<\1\2>", html.escape(t, quote=False)).replace("\n", "<br>")
# Open-ended, museum, career, CER and project cards: Socrates' Substitute step is a placeholder there (no numbers to put in),
# so those cards keep their existing solution display even when the steps file lists them (Dimitry, Nov 2026).
SKIP = re.compile(r"museum|STEM at Work|career|Recruit|\bCER\b|\bClaim\b|Evidence and reasoning|Revisit the Phenomenon|\bProject\b|Ask Questions|"
                  r"Encounter the Phenomenon|driving question|Science & Society|Review the News|Research|Wrap-Up", re.I)
FIXES = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "sq-answer-fixes.json"), encoding="utf-8"))
def answer_html(cid, s):  # a source-restored answer (sq-answer-fixes.json) wins over the steps file's copy of the garbled one
    if s["label"].strip().lower() == "answer" and "answer" in FIXES.get(cid, {}): return "<br>".join(FIXES[cid]["answer"])
    return to_html(s["text"].strip())
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
            want = [{"label": s["label"].strip(), "kind": KINDS.get(s["label"].strip().lower(), "step"), "html": answer_html(it["id"], s)} for s in data[it["id"]]]
        if it.get("stepCards") != want:
            if want is None: it.pop("stepCards", None)
            else: it["stepCards"] = want; n += 1
            ch = True
    if ch: open(f, "w", encoding="utf-8").write(json.dumps(d, ensure_ascii=False, separators=(",", ":")))
errs += [f"{cid}: no such card" for cid in data if cid not in seen]
if errs: sys.exit("step cards: " + "; ".join(errs))
wired = sum(1 for f in glob.glob(os.path.join(pub, "physics101/sq/*.json")) if not f.endswith("index.json") for it in json.load(open(f, encoding="utf-8"))["items"] if "stepCards" in it)
print(f"step cards: {len(seen)} cards in the file, {wired} shown as step cards ({len(seen) - wired} open-ended/CER/project kept as is), {n} updated")
