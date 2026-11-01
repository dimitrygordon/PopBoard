#!/usr/bin/env python3
"""Build one Physics 101 storybook from its outline and Leo's layered mockups.

  python3 tools/physics101/build-lesson.py m01-l01 \
      --outline /workspace/physics101/outline/m01-l01_outline.md \
      --mockups /workspace/physics101/mockups/m01-l01

Writes public/physics101/decks/<slug>/ (deck.json, v2/story.json, v2/art.json, v2/art/*.webp)
and tools/physics101/narration/<slug>.md (the spoken text, one "## Slide N" per page).
The outline wording is copied exactly; nothing here rewrites it. Idempotent: same inputs, same files.
"""
import argparse, html, json, os, re, sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
# bg is kept in dark mode too (no "light" flag): the labels are baked in dark pencil and need the paper.
FG_F = 0.45  # fg holds labels drawn onto the mid art, so it moves with the mid plane and never drifts off

def parse_outline(md):
    pages = []
    for m in re.finditer(r"^## Page (\d+): (.+?)\n(.*?)(?=^## |\Z)", md, re.S | re.M):
        n, title, body = int(m.group(1)), m.group(2).strip(), m.group(3)
        d = re.search(r"\*\*On-slide definition:\*\*\s*(.+)", body).group(1).strip()
        ra = re.search(r"\*\*Read-aloud text:\*\*\s*\n(.*?)(?=\n\*\*Figures used|\n\*\*Test it)", body, re.S).group(1).strip()
        sb = re.search(r"\*\*Test it sandbox:\*\*\s*(.+)", body).group(1).strip()
        pages.append({"n": n, "title": title, "definition": d, "paras": [p.strip() for p in ra.split("\n\n") if p.strip()],
                      "sandbox": sb if sb.lower().startswith("yes") else None})
    assert [p["n"] for p in pages] == list(range(1, len(pages) + 1)), "pages must run 1..N"
    return pages

GOLD = (0xE2, 0xB6, 0x54)  # touch outline: gold pencil #E2B654 (Leo's hint files are drawn in #D4A62A)

def webp(src, dst, q=84, recolor=None):
    im = Image.open(src).convert("RGBA"); bb = im.getbbox()
    if recolor:
        a = im.getchannel("A"); im = Image.new("RGBA", im.size, recolor + (0,)); im.putalpha(a)
    if not bb: return None
    im.crop(bb).save(dst, "WEBP", quality=q, method=4)
    return list(bb)

# Test it panels: a short name and what to do, per page (the scene module is decks' scenes/<slug>/pNN.js)
TEST_IT = {
    4: ("Measuring Change", "Watch the points appear, then drag the violet ruler to predict the next value."),
    5: ("Build the flowchart", "Drag each step card into its slot, in order. Then pick a loop when the test comes back."),
    8: ("Control and test", "Change only the test ramp's height, then press Go and compare it with the control."),
    9: ("Sort the data", "Drag each measurement card onto the clipboard table. Every row plots a point."),
    13: ("Pick or average?", "Run trials one at a time. Compare picking the best trial with averaging them all."),
    15: ("Atom timeline", "Drag the knob along the timeline to see how the model of the atom changed."),
    16: ("Flight simulator", "Pick a paper airplane, fly it, and compare distance and paper used."),
    17: ("Falling objects", "Drop the ball and the feather. Turn the air off and drop them again."),
    20: ("Testable or not?", "Drag each question card into the testable or not testable crate."),
}
# Check Your Progress questions (unsolved in the source): a marker where each one goes
PROBLEMS = {5: [1], 8: [2], 13: [3], 14: [4], 20: [5], 11: [6]}

def inline(t):
    t = html.escape(t, quote=False)
    t = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", t)
    return re.sub(r"(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?!\w)", r"<em>\1</em>", t)

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("slug"); ap.add_argument("--outline", required=True); ap.add_argument("--mockups", required=True)
    a = ap.parse_args()
    pages = parse_outline(open(a.outline, encoding="utf-8").read())
    out = os.path.join(ROOT, "public/physics101/decks", a.slug); artdir = os.path.join(out, "v2/art")
    os.makedirs(artdir, exist_ok=True)
    art, deck, story, narr = {}, {"key": a.slug.upper(), "ptw": 960.0, "slides": []}, {"slug": a.slug, "popupSpec": "v2", "immersive": False, "slides": {}}, []
    for p in pages:
        n, pn = p["n"], "p%02d" % p["n"]; d = os.path.join(a.mockups, pn)
        meta = json.load(open(os.path.join(d, "layers.json")))
        spec = []
        for L in meta["layers"]:
            lid = L["id"] if "id" in L else os.path.basename(L["file"]).split("-")[-1].split(".")[0]
            box = webp(os.path.join(d, L["file"]), os.path.join(artdir, f"{pn}-{lid}.webp"), 80 if lid == "bg" else 86)
            if not box: continue
            f = {"bg": 0.15, "mid": 0.45, "fg": FG_F}[lid]
            spec.append({"id": lid, "src": f"{pn}-{lid}.webp", "box": box, "f": f, **({} if lid == "bg" else {"draw": True} if lid == "mid" else {"late": True})})
        for c in meta.get("cutouts", []):
            cid = "cut-" + c["id"]
            box = webp(os.path.join(d, c["file"]), os.path.join(artdir, f"{pn}-{cid}.webp"))
            hbox = webp(os.path.join(d, c["touch_hint_file"]), os.path.join(artdir, f"{pn}-{cid}-hint.webp"), recolor=GOLD) if c.get("touch_hint_file") else None
            spec.append({"id": cid, "src": f"{pn}-{cid}.webp", "box": box, "f": c.get("parallax", 0.45), "cut": True,
                         **({"hint": f"{pn}-{cid}-hint.webp", "hbox": hbox} if hbox else {})})
        art[pn] = spec
        items = []
        for i, s in enumerate(meta.get("text_slots", [])):
            x0, y0, x1, y1 = s["box_px"]
            x0, y0, x1, y1 = x0 + 28, y0 + 18, x1 - 28, y1 - 18  # inset from the drawn frame
            items.append({"t": "text", "box": [round(x0 / 16, 3), round(y0 / 9, 3), round((x1 - x0) / 16, 3), round((y1 - y0) / 9, 3)], "anchor": "m", "slot": i + 1,
                          "p": [{"al": "l", "lh": 1.0, "r": [{"x": s["text"], "sz": 0, "c": "#3D3D3D", "f": "Patrick Hand"}]}]})
        deck["slides"].append({"n": n, "title": p["title"], "items": items})
        body = [f"<h3>{inline(p['title'])}</h3>", f"<p class=\"p101-def\">{inline(p['definition'])}</p>"] + [f"<p>{inline(x)}</p>" for x in p["paras"]]
        for q in PROBLEMS.get(n, []):
            body.append(f"<p class=\"p101-problem\" data-problem=\"{q}\">Check Your Progress question {q} goes here.</p>")
        if meta.get("text_slots"):  # the on-page boxes, repeated large for small screens (after the spoken text)
            body.append("<ol class=\"p101-slots\">" + "".join(f"<li>{inline(t['text'])}</li>" for t in meta["text_slots"]) + "</ol>")
        sv = {"layers": [], "title": p["title"], "text": "".join(body)}
        if p["sandbox"]:
            assert n in TEST_IT, f"page {n} has a sandbox note but no Test it entry"
            sv["testIt"] = {"name": TEST_IT[n][0], "how": TEST_IT[n][1]}
        story["slides"][str(n)] = sv
        narr.append(f"## Slide {n}\n\n{p['title']}{'' if p['title'][-1] in '.?!' else '.'}\n\n{p['definition']}\n\n" + "\n\n".join(p["paras"]) + "\n")
    # text slots share one size per page: the largest that fits every slot at every stage size (fit.json,
    # measured in a browser; tests/physics101-m01-l01.test.mjs checks it)
    fit = json.load(open(os.path.join(os.path.dirname(__file__), "fit.json"))) if os.path.exists(os.path.join(os.path.dirname(__file__), "fit.json")) else {}
    for s in deck["slides"]:
        for it in s["items"]:
            it["p"][0]["r"][0]["sz"] = fit.get(a.slug, {}).get("p%02d" % s["n"], 19.0)
    dump = lambda path, obj: open(path, "w", encoding="utf-8").write(json.dumps(obj, indent=1, ensure_ascii=False) + "\n")
    dump(os.path.join(out, "deck.json"), deck); dump(os.path.join(out, "v2/story.json"), story); dump(os.path.join(out, "v2/art.json"), art)
    nd = os.path.join(ROOT, "tools/physics101/narration"); os.makedirs(nd, exist_ok=True)
    open(os.path.join(nd, f"{a.slug}.md"), "w", encoding="utf-8").write(f"# {a.slug} narration (generated from the outline; do not edit)\n\n" + "\n".join(narr))
    print(f"{a.slug}: {len(pages)} pages, {sum(len(v) for v in art.values())} art layers, Test it on {sorted(TEST_IT)}")

if __name__ == "__main__": main()
