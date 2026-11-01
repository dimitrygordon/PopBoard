#!/usr/bin/env python3
"""Physics 101 drag pages: a re-runnable step after build-lesson.py.

Reads Leo's layers.json fresh from the mockups folder every run (never a cached copy). For every page whose
files have sat unchanged for STABLE seconds it:
  1. re-encodes any layer, cutout or touch-hint PNG that is newer than its webp, and syncs the page's cutout
     entries in decks/<slug>/v2/art.json with layers.json (new ids, new boxes);
  2. compiles interaction.for_turing into a drag spec (draggables, snap targets, snap radius, key steps,
     one-at-a-time) in decks/<slug>/v2/drag.json. scenes/drag.js mounts it on the page; nothing per page.
Pages that are still changing keep their last build and are listed as "waiting" in the log.

  python3 tools/physics101/build-drag.py [--mockups /workspace/physics101/mockups] [--log drag-progress.md] [slug ...]
"""
import argparse, glob, importlib.util, json, os, re, sys, time
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
spec_ = importlib.util.spec_from_file_location("bl", os.path.join(os.path.dirname(__file__), "build-lesson.py"))
bl = importlib.util.module_from_spec(spec_); spec_.loader.exec_module(bl)
STABLE = 120
dump = lambda p, o: open(p, "w", encoding="utf-8").write(json.dumps(o, indent=1, ensure_ascii=False) + "\n")

def stale(src, dst): return os.path.exists(src) and (not os.path.exists(dst) or os.path.getmtime(src) > os.path.getmtime(dst))

def files_of(meta):
    fs = [L["file"] for L in meta.get("layers", [])]
    for c in meta.get("cutouts", []): fs += [c["file"]] + ([c["touch_hint_file"]] if c.get("touch_hint_file") else [])
    return fs

def trace_hint(src, dst):  # same 4 px gold ring build-lesson.py traces when Leo ships no outline
    from PIL import ImageFilter
    al = Image.open(src).convert("RGBA").getchannel("A").point(lambda v: 255 if v > 40 else 0)
    ring = Image.composite(al.filter(ImageFilter.MaxFilter(9)), Image.new("L", al.size, 0), Image.eval(al, lambda v: 255 - v))
    tmp = dst[:-5] + ".png"; im = Image.new("RGBA", al.size, bl.GOLD + (0,)); im.putalpha(ring); im.save(tmp)
    box = bl.webp(tmp, dst); os.remove(tmp); return box

def sync_art(d, pn, meta, spec, artdir):
    """Re-encode changed PNGs; rebuild the page's cutout entries from layers.json. Returns (spec, n_encoded)."""
    n = 0; out = []
    for L in spec:
        if L.get("cut"): continue
        lid = L["id"]; src = next((os.path.join(d, x["file"]) for x in meta.get("layers", []) if (x.get("id") or "") == lid), None)
        dst = os.path.join(artdir, L["src"])
        if src and stale(src, dst):
            box = bl.webp(src, dst, 80 if lid == "bg" else 86); n += 1
            if box: L["box"] = list(box)
        out.append(L)
    old = {L["id"]: L for L in spec if L.get("cut")}
    for c in meta.get("cutouts", []):
        cid = "cut-" + c["id"]; src = os.path.join(d, c["file"]); dst = os.path.join(artdir, f"{pn}-{cid}.webp")
        if not os.path.exists(src): continue
        e = dict(old.get(cid) or {"id": cid, "src": f"{pn}-{cid}.webp", "f": c.get("parallax", 0.45), "cut": True})
        if stale(src, dst) or "box" not in e: e["box"] = list(bl.webp(src, dst)); n += 1
        hsrc = os.path.join(d, c["touch_hint_file"]) if c.get("touch_hint_file") else None
        hdst = os.path.join(artdir, f"{pn}-{cid}-hint.webp")
        if hsrc and os.path.exists(hsrc):
            if stale(hsrc, hdst) or "hbox" not in e: e["hbox"] = list(bl.webp(hsrc, hdst, recolor=bl.GOLD)); n += 1
        elif stale(src, hdst) or "hbox" not in e: e["hbox"] = list(trace_hint(src, hdst)); n += 1
        e["hint"] = f"{pn}-{cid}-hint.webp"; out.append(e)
    return out, n

NUM = r"\[\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\]"
def first(s, n=4): return re.split(r"[;:(]", s, maxsplit=1)[0].strip()[:80]

def compile_drag(meta):
    """interaction.for_turing -> drag spec, or None when the page has no drag spec."""
    it = meta.get("interaction") or {}; ft = it.get("for_turing") or ""
    cuts = {c["id"]: c for c in meta.get("cutouts", [])}
    if not cuts or not re.search(r"\bdrag", ft, re.I): return None
    items = []
    m = re.search(r"Manipulables, each its own cutout:(.*?)(?:Behaviou?r:|$)", ft, re.S)
    if m:  # Leo's template: 'id' (what it is; home bbox [...], grab ...)
        for cid, desc in re.findall(r"'([\w.-]+)' \((.*?)home bbox", m.group(1), re.S):
            if cid in cuts: items.append({"id": cid, "label": first(desc)})
    if not items:  # free-form spec: cutouts the spec or their own note says to drag
        for cid, c in cuts.items():
            if re.search(r"\bdrag", c.get("desc", ""), re.I): items.append({"id": cid, "label": first(c["desc"])})
    if not items: return None
    mv = {i["id"] for i in items}
    text = ft + " " + " ".join(c.get("desc", "") for c in cuts.values())
    targets = []
    for cid, c in cuts.items():  # snap targets: other cutouts the spec drops things onto
        if cid in mv or cid == "try": continue
        names = {cid, cid.replace("-", " "), cid.replace("obj-", "")}
        if any(re.search(rf"\b(?:onto|into|on|to|toward|over|at)\s+(?:the\s+)?(?:'?){re.escape(nm)}\b", text, re.I) for nm in names):
            b = c["bbox_px"]; bottom = bool(re.search(rf"(?:hook|bottom)[^.]*'{re.escape(cid)}'|'{re.escape(cid)}'[^.]*bottom", ft))
            targets.append({"id": cid, "label": first(c.get("desc", cid)), "box": b,
                            "at": [round((b[0] + b[2]) / 2), b[3] if bottom else round((b[1] + b[3]) / 2)], "anchor": "top" if bottom else "center"})
    g = lambda pat, dflt: int(m.group(1)) if (m := re.search(pat, ft)) else dflt
    sp = {"items": items, "targets": targets, "snap": g(r"within (\d+)\s*px", 40), "lift": g(r"lifted (\d+)\s*px", 6),
          "step": g(r"arrow keys move (\d+)\s*px", 10), "bigStep": g(r"Shift (\d+)\s*px", 40), "ease": g(r"\((\d+)\s*ms ease", 300),
          "oneAtATime": bool(re.search(r"one (?:\w+ )?at a time", ft, re.I)) and bool(targets),
          "stayWhereDropped": not re.search(r"swaps the old one back|returns? home on miss", ft, re.I)}
    return sp

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("slugs", nargs="*"); ap.add_argument("--mockups", default="/workspace/physics101/mockups")
    ap.add_argument("--log", default="/workspace/physics101/drag-progress.md"); a = ap.parse_args()
    now = time.time(); built, waiting, nospec, enc, nosandbox = [], [], [], 0, 0
    slugs = a.slugs or sorted(os.path.basename(p) for p in glob.glob(os.path.join(ROOT, "public/physics101/decks/m*-l*")))
    for slug in slugs:
        deckdir = os.path.join(ROOT, "public/physics101/decks", slug); artp = os.path.join(deckdir, "v2/art.json"); dragp = os.path.join(deckdir, "v2/drag.json")
        if not os.path.exists(artp): continue
        art = json.load(open(artp)); story = json.load(open(os.path.join(deckdir, "v2/story.json")))
        drag = json.load(open(dragp)) if os.path.exists(dragp) else {}
        art0, drag0 = json.dumps(art), json.dumps(drag)
        for pn in sorted(art):
            d = os.path.join(a.mockups, slug, pn); lp = os.path.join(d, "layers.json")
            if not os.path.exists(lp): continue
            try: meta = json.load(open(lp))
            except ValueError: waiting.append((slug, pn, "layers.json mid-write")); continue
            paths = [lp] + [os.path.join(d, f) for f in files_of(meta)]
            if any(os.path.exists(p) and now - os.path.getmtime(p) < STABLE for p in paths):
                waiting.append((slug, pn, "changed in the last 2 minutes")); continue
            art[pn], n = sync_art(d, pn, meta, art[pn], os.path.join(deckdir, "v2/art")); enc += n
            has_scene = "testIt" in story["slides"].get(str(int(pn[1:])), {})
            sp = compile_drag(meta)
            if sp and has_scene: drag[pn] = sp; built.append((slug, pn, sp))
            else:
                drag.pop(pn, None)
                if meta.get("sandbox") or has_scene: nospec.append((slug, pn))
                else: nosandbox += 1
        if json.dumps(art) != art0: dump(artp, art)
        if drag and json.dumps(drag) != drag0: dump(dragp, dict(sorted(drag.items())))
        elif not drag and os.path.exists(dragp): os.remove(dragp)
    # scenes that still name a cutout id the new art no longer has (their old moves become no-ops)
    gone = []
    for slug, pn, _ in built:
        sc = os.path.join(ROOT, "public/physics101/scenes", slug, pn + ".js"); ids = {L["id"][4:] for L in json.load(open(os.path.join(ROOT, "public/physics101/decks", slug, "v2/art.json")))[pn] if L.get("cut")}
        if os.path.exists(sc):
            used = set(re.findall(r"art\.(?:box|set|show|touched|el)\(\s*\"([\w.-]+)\"", open(sc).read()))
            if used - ids: gone.append((slug, pn, sorted(used - ids)))
    L = [f"# Physics 101 drag pages\n", f"Last run: {time.strftime('%Y-%m-%d %H:%M %Z')}. Re-run: `python3 tools/physics101/build-drag.py` (reads layers.json fresh; skips files changed in the last 2 minutes).\n",
         f"- built (drag spec mounted by scenes/drag.js): {len(built)}", f"- sandbox pages with no drag spec yet: {len(nospec)}", f"- waiting (Leo still writing): {len(waiting)}", f"- PNGs re-encoded this run: {enc}\n",
         "## Built\n"] + [f"- {s} {p}: drag {', '.join(i['id'] for i in sp['items'])}" + (f" onto {', '.join(t['id'] for t in sp['targets'])}" if sp["targets"] else " (free drop)") for s, p, sp in built] + \
        ["\n## No drag spec yet\n"] + [f"- {s} {p}" for s, p in nospec] + ["\n## Waiting (changed in the last 2 minutes)\n"] + [f"- {s} {p}: {w}" for s, p, w in waiting] + \
        ["\n## Scenes naming cutouts the new art dropped (old moves are no-ops; drag.js handles the new cutouts)\n"] + [f"- {s} {p}: {', '.join(g)}" for s, p, g in gone]
    open(a.log, "w").write("\n".join(L) + "\n")
    print(f"built {len(built)}, no spec {len(nospec)}, waiting {len(waiting)}, re-encoded {enc}, stale scene ids {len(gone)}")

if __name__ == "__main__": main()
