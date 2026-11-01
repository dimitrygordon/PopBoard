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

# Test it panels per lesson: a short name and what to do, per page (the scene module is decks' scenes/<slug>/pNN.js)
TEST_IT = {
 "m01-l01": {
     4: ("Measuring Change", "Watch the points appear, then drag the violet ruler to predict the next value."),
     5: ("Build the flowchart", "Drag each step card into its slot, in order. Then pick a loop when the test comes back."),
     8: ("Control and test", "Change only the test ramp's height, then press Go and compare it with the control."),
     9: ("Sort the data", "Drag each measurement card onto the clipboard table. Every row plots a point."),
     13: ("Pick or average?", "Run trials one at a time. Compare picking the best trial with averaging them all."),
     15: ("Atom timeline", "Drag the knob along the timeline to see how the model of the atom changed."),
     16: ("Flight simulator", "Pick a paper airplane, fly it, and compare distance and paper used."),
     17: ("Falling objects", "Drop the ball and the feather. Turn the air off and drop them again."),
     20: ("Testable or not?", "Drag each question card into the testable or not testable crate."),
 },
 "m01-l02": {
    1: ("Pick the best model", "Tap or drag the penny to drop it. Then tap the model card whose prediction matches the measured speed."),
    5: ("Prefix slider", "Drag the gold knob from femto to tera and watch the number and the unit change together."),
    6: ("Cancel the units", "Drag the m and s tiles into the fraction. A speed has to come out in meters per second."),
    7: ("Conversion chain", "Flip each conversion factor until every unwanted unit cancels, then check the result."),
    8: ("Read the ruler", "Drag the pen along the ruler, read the certain digits, then pick your estimate for the last digit."),
    9: ("Which zeros count?", "Tap each number to step through its digits and see which ones are significant."),
    10: ("Calculator with a conscience", "The calculator shows the raw answer. Pick the correctly rounded answer before it is accepted."),
    11: ("Road trip check", "Set the distance and time, tap the car to drive, and run the step 3 check."),
 },
 "m01-l03": {
    2: ("Mass and volume", "Tap a sample, then drag the tray onto the balance and onto the cylinder. Record each sample and look for the pattern."),
    4: ("Do the dates agree?", "Drag the three error bars along the timeline. The gold box shows where all three overlap."),
    5: ("Overlap checker", "Tap a student to plot five readings. Then tap a second student to check for agreement."),
    6: ("Cylinder or beaker?", "Drag the dropper over the cylinder or the beaker to add liquid, and compare how precise each reading is."),
    8: ("Archery targets", "Tap the arrow to shoot a cluster, then label it accurate, precise, both, or neither."),
    9: ("Calibrate the scale", "Zero the empty scale, drag the standard mass onto the pan, and adjust until both checks pass."),
    10: ("Parallax", "Drag the eye sideways above the scale and watch the reading shift."),
    11: ("Car or geologist?", "Tap a receiver to see how precisely it can pin down a position."),
 },
 "m01-l04": {
    1: ("Hang the masses", "Drag the mass set up to the hook (or tap it) to hang 5 g at a time and fill the table. Then try swapping the spring too."),
    4: ("Fit the line", "Drag the line and tilt it with the slider to pass as close to all the points as you can."),
    5: ("Build the axes", "Tap an axis label to swap the axes, then pick a scale for the divisions."),
    6: ("Eyeball vs. calculator", "Drag across the graph to sketch your own line, then reveal the least-squares line."),
    7: ("Slope and intercept", "Drag the m and b knobs. Slope tilts the line; b slides it up and down."),
    8: ("Rise over run", "Drag P and Q along the spring line and watch the rise, run, and slope update."),
    10: ("Ball drop timer", "Tap the ball to drop it. Points plot every quarter second, then overlay the curve d = 5t\u00b2."),
    11: ("Speed and time", "Use the speed slider for a 300 km trip and watch the points trace the curve."),
    13: ("Predict the length", "Pick a mass and see the predicted length. Go past the data and watch out. Tap the 49 g mass for the book's example."),
    14: ("Pendulum clock", "Change the pendulum length and compare the clock with a reference clock. Tap the clock to reset."),
 },
 "m02-l01": {
    1: ("Shutter speed", "Drag the gold shutter knob from short to long, then take a photo. Only the moving train blurs."),
    4: ("Two glances", "Tap Glance to look at the cage, wait, and glance again. Compare where and when."),
    5: ("Snapshots", "Pick a time interval and tap Snap. Then flip through the frames to see what moved."),
    6: ("Stack the frames", "Drag each snapshot frame up onto the park scene. Stacked together they make a motion diagram."),
    7: ("Particle model", "Drag the dot onto the runner's waist in each frame. Then switch runners and compare the spacing."),
 },
 "m02-l02": {
    1: ("Where is zero?", "Drag the zero marker along the road, and tap it to flip which way is positive. Watch the runner's position."),
    3: ("Position and distance", "Tap the runner to move her and draw her position arrow. Try Turn around and compare distance with position."),
    4: ("Which way is positive?", "Tap the button to switch the positive direction and watch the sign of the dot's position."),
    5: ("Vector or scalar?", "Drag each quantity card into the vector bin or the scalar bin."),
    6: ("Arrows as models", "Tap a room spot to draw an arrow from where you are, then tap Label to explain each arrow."),
    7: ("Time interval", "Tap any two stopwatches. The first is t initial, the second is t final."),
    9: ("Displacement", "Drag the start and end markers along the road and read the displacement and its direction."),
    10: ("Tip to tail", "Drag B so its tail meets A's tip, or flip B to subtract, and read the resultant."),
 },
 "m02-l03": {
    2: ("Plot Table 1", "Tap the grid to plot each point from Table 1, then drag the line's ends for the best fit."),
    4: ("Path vs. graph", "Drag the time slider or press Play. The runner's path stays flat while the graph line rises."),
    6: ("Linked views", "Drag the runner along the motion diagram. The matching table row and graph point light up."),
    7: ("Read the graph", "Drag the gold guides to the line and read off the matching time or position."),
    8: ("Two runners", "Set each runner's start and pace, then press Run and find where the lines cross."),
    10: ("When does B pass A?", "Drag the point along line B until it meets line A."),
 },
 "m02-l04": {
    1: ("Two joggers", "Set each jogger's pace and press Race. Compare the distance in 3 s and the time for 100 m."),
    3: ("Slope finder", "Drag the two gold pickers onto a line to see the rise, the run, and the slope."),
    5: ("Sign of the slope", "Pick +5.0 or -5.0 m/s and a start position, then press Go and watch the line tilt."),
    7: ("Same average, different paths", "Tap Reveal to show each hidden path. They all share the same start, end and time."),
    8: ("Paintbrush cars", "Set both car speeds and press Paint. The stripes become each car's velocity arrows."),
    9: ("Speed records", "Work out each record holder's average speed, pick the right answer, then race them."),
    10: ("Skateboarder", "Tap the skater to roll, then drag the two pickers onto the line to find her average velocity."),
    12: ("The position equation", "Drag the v-bar and x-initial knobs and watch the line and the equation change."),
    13: ("Where is point C?", "Set the velocity and the time past B, then tap the motorcyclist to ride."),
 },
"m03-l01": {
    2: ("Jogger spacing", "Pick still, constant, speeding up or slowing down and watch the snapshots respace."),
    4: ("Changing arrows", "Drag the speed slider while the dot runs. It drops dots and velocity arrows that grow or shrink."),
    5: ("Build the acceleration", "Drag v_f and v_i, flip v_i, then put its tail on the tip of v_f to draw the change in velocity."),
    6: ("Speeding up or slowing down", "Tap the two sign chips, make a prediction, then press Play."),
    7: ("Slope of a v-t line", "Drag the two gold pickers along the line and read rise over run."),
    8: ("Five runners", "Tap a graph line to watch its runner move on an east-west track."),
    9: ("Average acceleration", "Drag the two gold pickers along the curve to change the interval."),
    10: ("Tangent line", "Drag the tangent along the curve and read its slope."),
    11: ("Wind sprint", "Set the running speed and the turnaround time, then tap the runner."),
    13: ("Sprinter tangents", "Drag the gold point along the curve to draw a tangent and read its slope."),
    14: ("Ball on a driveway", "Tap the ball to roll it up and back while its v-t line draws."),
    15: ("Constant speed, changing velocity", "Tap the runner to bounce between the walls at one speed."),
},
"m03-l02": {
    1: ("Tangent to a parabola", "Drag the gold point along the parabola and read the slope of the tangent."),
    3: ("Slope is acceleration", "Drag the two gold pickers along the line and read rise over run."),
    4: ("Area is displacement", "Drag the time marker to shade the triangle under the line."),
    5: ("Final velocity", "Set v_i, a and the time, then tap the car."),
    6: ("Drag racing calculator", "Set the course length and time, then tap the calculator."),
    7: ("Change only v_i", "Set v_i and tap the autofill row to add it to the table."),
    8: ("Rectangle area", "Drag the time marker along the flat line."),
    9: ("Rectangle plus triangle", "Set v_i and a, then drag the time marker."),
    11: ("Green light", "Set the acceleration, tap the car, and press Stop when it reaches 25 m/s."),
    12: ("Reaction test", "Tap the car, then press BRAKE as soon as the child appears."),
},
"m03-l03": {
    1: ("Drop tower", "Tap the air switch, pick two objects, and drop them."),
    3: ("Which way is positive?", "Tap the chip to flip the coordinate system."),
    4: ("Virtual strobe", "Set the flash interval and tap the ball to drop it."),
    5: ("Step through the toss", "Pick a launch speed, then tap the ball to step one second."),
    6: ("Time cursor", "Drag the cursor along the graph and watch the ball beside it."),
    7: ("Ball in a tube", "Tap the ball to toss it while the graph draws."),
    8: ("What if a = 0?", "Tap the switch at the top to turn gravity off and on."),
    10: ("Free-fall timer", "Set the fall time and tap the timer."),
    11: ("Probe", "Drag the probe away from Earth or the Moon."),
    12: ("Ride builder", "Pick a drop height and a braking distance, then tap the builder."),
},

}

def inline(t):
    t = html.escape(t, quote=False)
    t = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", t)
    return re.sub(r"(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?!\w)", r"<em>\1</em>", t)

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("slug"); ap.add_argument("--outline", required=True); ap.add_argument("--mockups", required=True)
    a = ap.parse_args()
    TI = TEST_IT.get(a.slug, {})
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
            if not box and lid == "mid":  # Leo left this page's mid empty (all art on bg and fg): keep a 1 px placeholder so fg and cutouts still ride the mid plane
                Image.new("RGBA", (1, 1), (0, 0, 0, 0)).save(os.path.join(artdir, f"{pn}-{lid}.webp"), "WEBP", lossless=True); box = [0, 0, 1, 1]
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
        if meta.get("text_slots"):  # the on-page boxes, repeated large for small screens (after the spoken text)
            body.append("<ol class=\"p101-slots\">" + "".join(f"<li>{inline(t['text'])}</li>" for t in meta["text_slots"]) + "</ol>")
        sv = {"layers": [], "title": p["title"], "text": "".join(body)}
        if p["sandbox"]:
            assert n in TI, f"page {n} has a sandbox note but no Test it entry"
            sv["testIt"] = {"name": TI[n][0], "how": TI[n][1]}
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
    print(f"{a.slug}: {len(pages)} pages, {sum(len(v) for v in art.values())} art layers, Test it on {sorted(TI)}")

if __name__ == "__main__": main()
