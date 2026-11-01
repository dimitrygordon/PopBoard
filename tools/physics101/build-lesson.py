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
"m04-l01": {
    1: ("Push the book", "Drag the push arrow longer, shorter or backward and watch the book respond."),
    2: ("Push and watch", "Tap push and watch the dots spread as the speed climbs."),
    4: ("Pick the system", "Tap the ring to circle a different object as the system."),
    5: ("Contact or field?", "Drag each force chip into the contact bin or the field bin."),
    9: ("Free-body builder", "Pick the ball's situation, then tap the dot to add its force arrows."),
    10: ("Cut the string", "Tap cut the string and watch the free-body diagram and the motion change."),
    11: ("Tug-of-war cart", "Set the two pulls and tap the cart to run a trial."),
    12: ("Net force", "Set each pusher's force and direction and read the net force."),
    13: ("Spring scale", "Choose a force and tap the spring scale to plot the v-t line."),
    14: ("a-F graph", "Tap the slope chip three times to plot each run, then read the line's slope."),
    15: ("Stack the carts", "Tap stack carts to use one, two or three carts with the same pull."),
    16: ("Force scale", "Slide from a nickel to a rocket engine and compare forces."),
    17: ("Sled team", "Set a dog's direction and strength, then tap add a dog."),
    18: ("Pillow tug-of-war", "Set each pull and the pillow's mass, then tap to pull."),
    19: ("Roll the ball", "Pick a surface and tap the ball to roll it."),
    20: ("Seatbelt", "Tap the seatbelt chip, then crash the car into the box."),
},
"m04-l02": {
    1: ("Weight grows with mass", "Tap the mass picker to change the mass and watch the weight arrow."),
    2: ("Scale on other worlds", "Tap Earth, the Moon or Mars and read the scale."),
    4: ("Two hands, two masses", "Tap each mass to change it, then tap drop."),
    5: ("Elevator scale", "Drag the acceleration slider up, to zero, or down and read the scale."),
    6: ("Cut the cable", "Tap the cable to cut it and watch the scale."),
    8: ("Elevator calculator", "Set a mass and an acceleration, then tap the inputs to compare."),
    9: ("Wind tunnel", "Change the speed, size, shape and fluid and watch the drag arrow."),
    10: ("Skydiver", "Tap a pose and watch the speed level off."),
},
"m04-l03": {
    1: ("Rope toy", "Drag the toy chip to pull harder and watch both arrows grow together."),
    2: ("Push the wall", "Set how hard to push; the wall always pushes back just as hard."),
    4: ("Match the pairs", "Tap the chip to connect each force with its interaction partner."),
    5: ("Same force, tiny acceleration", "Tap the ball to change its mass and watch Earth's bar move on the log scale."),
    7: ("Earth's acceleration", "Tap the ball mass chip and compare the force and Earth's acceleration."),
    8: ("Hang a mass", "Tap a mass to hang it and read the rope tension."),
    9: ("Tug-of-war tension", "Set each team's pull and read the rope's tension."),
    10: ("Hoist the bucket", "Set the bucket's mass and final speed and watch the tension against the 525 N limit."),
    11: ("Normal force", "Tap to pull up or push down on the box and read the normal force."),
    12: ("Sliding rocks", "Tap wind only or wind plus ice and see whether the rock moves."),
},
"m05-l01": {
    2: ("Vectors Revisited", "Drag two force arrows tip to tail along a line and watch the resultant arrow form from the first tail to the last tip."),
    4: ("Adding Vectors in Two Dimensions", "Slide vector B around the screen and snap its tail to A's tip; the resultant R appears, with ruler and protractor readouts."),
    5: ("Perpendicular Vectors and Other Angles", "Set two vector lengths and the angle between them; the sandbox computes R with the law of cosines and shows the Pythagorean case at 90 degrees."),
    6: ("Example Problem 1", "Set the angle between a 25 kilometer and a 15 kilometer displacement and watch the resultant length update from 29 to 37 kilometers and beyond."),
    7: ("Coordinate Systems and Vector Components", "Drag the tip of a vector on a grid and watch its x and y components update, including the case where the y-component is zero."),
    11: ("Direction in Coordinate Systems", "Spin a vector around the origin and watch the angle, quadrant, and the signs of A sub x and A sub y change."),
    12: ("Algebraic Addition of Vectors", "Build three vectors, then press \"resolve\" to watch the components line up and combine into R with its magnitude and angle."),
    14: ("Example Problem 2", "Set the camp's distance and direction and how far the path runs north, and the sandbox draws the remaining vector B with its length and heading."),
},
"m05-l02": {
    1: ("Kinetic Friction", "Flick a book across a desk and watch the kinetic friction arrow, pointing opposite the motion, slow it to a stop."),
    2: ("Static Friction", "Slowly increase your push on a couch and watch static friction grow to match it until it hits its limit and the couch breaks free."),
    4: ("What Affects Friction?", "Change the contact area, sliding speed, surface material, and normal force on a block and see which ones actually change the friction readout."),
    5: ("Measuring Kinetic Friction", "Stack blocks one at a time, pull at constant speed, and record each spring-scale reading into a table like Table 1."),
    6: ("The Coefficient of Kinetic Friction", "Drag a block over three surfaces, plot friction against normal force, and read each line's slope as mu sub k."),
    7: ("Static Friction", "Set mu sub s and the normal force, then ramp up a push; a gauge shows static friction rising until it hits mu sub s times F sub N."),
    9: ("Coefficients of Friction", "Pick two surfaces from Table 2 and add oil or dust, then try to slide one across the other and compare the forces needed."),
    10: ("Example Problem 3", "Push a box at constant speed with different masses and coefficients and see that the needed push always equals mu sub k times the weight."),
    11: ("Example Problem 4", "Set the push on a box above, equal to, or below the friction force and watch it speed up, cruise, or slow down, with a 3 second distance readout."),
},
"m05-l03": {
    2: ("The Ring in Equilibrium", "Adjust the two spring scales holding a ring and see when the three force vectors close into a triangle, meaning equilibrium."),
    4: ("Resultants and Equilibrants", "Set two forces, see your resultant, and then drag in a third force until the object stops accelerating; the sandbox labels it the equilibrant."),
    5: ("Forces on an Incline", "Tilt a slide from flat to steep and watch the component of the girl's weight along the slide grow, along with her acceleration."),
    6: ("Choosing axes on an incline", "Rotate the coordinate axes on an incline and see how many forces must be split into components; the tilted-axis choice needs only one."),
    7: ("Example Problem 5", "Set the crate's weight and the incline angle, and the sandbox splits the weight arrow into its parallel and perpendicular parts with values."),
    8: ("Example Problem 6", "Set the slide angle, the rider's mass, and mu sub k and watch the speed after 1 second; changing the mass alone leaves the result the same."),
    9: ("Engineering and Technology", "Drag a block over a smooth surface, a clingfish-style hairy surface, and a shark-skin surface and compare the friction readouts."),
},
"m06-l01": {
    1: ("Path of a Projectile", "A virtual hose: you set the launch angle and speed and watch the water stream trace a parabola."),
    3: ("Independence of Motion", "A three-camera view of a tossed ball: you switch between behind, overhead, and sideline cameras to see up-and-down, straight-line, and parabolic motion."),
    4: ("Comparing Motion Diagrams", "Release two balls at once, one dropped and one launched sideways at a chosen speed, and see that you always hit the floor together."),
    5: ("Horizontally Launched Projectiles", "Kick a pebble off a cliff and toggle the x and y motion diagrams to compare equal-length horizontal vectors with growing vertical ones."),
    6: ("The Parabolic Path", "Step through time and watch the horizontal and vertical velocity arrows combine into the total velocity arrow, tangent to the curve."),
    8: ("Patterns in Projectile Motion", "A launcher with an angle dial: you fire at several angles, overlay the traces, and look for the shared pattern."),
    9: ("Example Problem 1", "Set the counter height and the plate's sliding speed and see where the plate lands; changing the speed changes the distance but not the fall time."),
    10: ("Angled Launches", "Launch a ball at an angle and tap any height on the way up and down to compare the matching vertical velocity arrows."),
    11: ("Maximum Height", "Change launch speed and angle and read the maximum height, range, and flight time from labeled markers on the path."),
    12: ("Example Problem 2", "Launch a ball at 4.5 meters per second, vary the angle, and watch the maximum height and flight time change, checking 66 degrees against the worked answer."),
    13: ("Forces from Air", "Add tailwind, headwind, or an updraft to a water stream or a basketball shot and compare how far it travels."),
},
"m06-l02": {
    1: ("Describing Circular Motion", "A carousel: you spin it at a constant speed and watch the horse's velocity arrow keep changing direction even though its length stays the same."),
    3: ("Velocity in a Circle", "Pick two points on a circle and see the displacement arrow delta r, then shrink the time interval until it lines up with the tangent velocity."),
    4: ("Centripetal Acceleration", "Watch an object circle and see the acceleration arrow, always aimed at the center, rotate along with it."),
    5: ("How Big Is Centripetal Acceleration?", "Change the speed and radius of an object's circle and watch the centripetal acceleration readout follow v squared over r."),
    6: ("Period of Revolution", "Set a period with a stopwatch-style slider and see the speed and centripetal acceleration update for a chosen radius."),
    7: ("Centripetal Force", "Swing a ball on a chain and adjust the mass, speed, and radius, watching the tension needed, m a sub c, change."),
    8: ("Direction of Acceleration and the Hammer", "Release a spinning hammer at any point in its swing and see it fly off along the tangent line from that point."),
    9: ("Example Problem 3", "Swing a virtual stopper, set its mass, string length, and period, and read the string tension."),
    10: ("Centrifugal \"Force\"", "Drive a car around a curve with a loose passenger, then add a door and seat; with no inward force, the passenger keeps going straight."),
},
"m06-l03": {
    1: ("Relative Motion on a Bus", "Ride a bus and switch between the bus view and the roadside view to see your own speed change."),
    2: ("Reference Frames", "Set the bus speed and your walking speed and direction and see the roadside speed as a sum or difference of the two arrows."),
    4: ("Combining Velocity Vectors", "A flea on a dog on a road: you set each velocity and watch the subscripts chain together into the flea's velocity relative to the road."),
    6: ("Relative Motion in Two Dimensions", "Drag a moving-frame vector and an object-in-frame vector tip to tail and watch the ground-frame resultant form."),
    7: ("Airplanes and Boats", "Fly a plane with an adjustable wind and steer to reach a target airport, then hold a boat still against a river current."),
    8: ("Combining Velocities with Components", "Set a moving frame's velocity and an object's velocity at any angles and see the x and y components add into the ground-frame velocity."),
    9: ("Example Problem 4", "Roll a marble across a moving ferry and toggle between the deck view and the water view to see its straight and slanted paths."),
    10: ("STEM at Work", "Set a plane's speed, release height, and wind and drop a supply package, trying to land it in a safe zone."),
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
