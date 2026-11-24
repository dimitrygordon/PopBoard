#!/usr/bin/env python3
"""Playwright user checks for the Relative Velocity Exploration module (desktop, iPhone 390, iPhone 375).
Real touch drags (CDP touch events) on phones, real mouse on desktop.
RV_BASE runs against a deployed site (e.g. a Pages preview). RV_OUT sets the screenshot folder."""
from __future__ import annotations

import http.server
import os
import socketserver
import sys
import threading
import time
from pathlib import Path
from urllib.parse import urlparse

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1] / "public"
OUT = Path(os.environ.get("RV_OUT", "/workspace/popboard-relvel-shots/local"))
OUT.mkdir(parents=True, exist_ok=True)
REMOTE_BASE = os.environ.get("RV_BASE", "").rstrip("/")
UA = ("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 "
      "(KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1")
DEVICES = (
    ("desktop", dict(viewport={"width": 1280, "height": 800}, device_scale_factor=1, is_mobile=False, has_touch=False)),
    ("iphone-390", dict(viewport={"width": 390, "height": 844}, device_scale_factor=3, is_mobile=True, has_touch=True, user_agent=UA)),
    ("iphone-375", dict(viewport={"width": 375, "height": 667}, device_scale_factor=3, is_mobile=True, has_touch=True, user_agent=UA)),
)
MIME = {".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
        ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp"}


class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, fmt, *args):
        return

    def translate_path(self, path):
        rel = path.split("?", 1)[0].split("#", 1)[0].lstrip("/")
        if rel == "" or rel.endswith("/"):
            rel += "index.html"
        cand = ROOT / rel
        if cand.is_file():
            return str(cand)
        html = ROOT / (rel + ".html")
        return str(html if html.is_file() else cand)

    def guess_type(self, path):
        return MIME.get(Path(path).suffix.lower()) or super().guess_type(path)


failures = 0
passes = 0


def check(cond, msg):
    global failures, passes
    print(("PASS " if cond else "FAIL ") + msg, flush=True)
    if cond:
        passes += 1
    else:
        failures += 1
    return cond


def shot(page, name):
    dest = OUT / name
    page.screenshot(path=str(dest), full_page=False)
    print("SHOT", dest)


def track(page):
    page.errors = []
    page.bad = []
    page.on("pageerror", lambda e: page.errors.append(f"pageerror: {e}"))
    page.on("console", lambda m: page.errors.append(f"console: {m.text}") if m.type == "error" else None)
    page.on("response", lambda r: page.bad.append(f"{r.status} {r.url}") if r.status >= 400 else None)


class Input:
    """Taps and drags: CDP touch events on touch devices, mouse elsewhere."""

    def __init__(self, page, touch):
        self.page, self.touch = page, touch
        self.cdp = page.context.new_cdp_session(page) if touch else None

    def _t(self, kind, pts):
        self.cdp.send("Input.dispatchTouchEvent", {"type": kind, "touchPoints": [{"x": x, "y": y} for x, y in pts]})

    def tap_xy(self, x, y):
        if self.touch:
            self._t("touchStart", [(x, y)])
            time.sleep(0.03)
            self._t("touchEnd", [])
        else:
            self.page.mouse.click(x, y)
        time.sleep(0.12)

    def center(self, loc):
        loc.evaluate("e => e.scrollIntoView({ block: 'center', inline: 'nearest' })")
        time.sleep(0.05)
        b = loc.bounding_box()
        return b["x"] + b["width"] / 2, b["y"] + b["height"] / 2

    def tap(self, loc):
        self.tap_xy(*self.center(loc))

    def drag(self, x0, y0, x1, y1, steps=12):
        if self.touch:
            self._t("touchStart", [(x0, y0)])
            for i in range(1, steps + 1):
                self._t("touchMove", [(x0 + (x1 - x0) * i / steps, y0 + (y1 - y0) * i / steps)])
                time.sleep(0.016)
            self._t("touchEnd", [])
        else:
            m = self.page.mouse
            m.move(x0, y0)
            m.down()
            for i in range(1, steps + 1):
                m.move(x0 + (x1 - x0) * i / steps, y0 + (y1 - y0) * i / steps)
                time.sleep(0.016)
            m.up()
        time.sleep(0.15)


def js(page, expr):
    return page.evaluate(expr)


def screen_x(page, sel):
    return page.evaluate(f"() => {{ const e = document.querySelector('{sel}'); const r = e.getBoundingClientRect(); return r.left + r.width / 2; }}")


def no_overflow(page, tag, where):
    w = page.evaluate("() => [document.documentElement.scrollWidth, window.innerWidth]")
    check(w[0] <= w[1] + 1, f"{tag} {where}: no sideways scroll ({w[0]} <= {w[1]})")


def errors_ok(page, tag, where):
    errs = [e for e in page.errors if "favicon" not in e]
    check(not errs, f"{tag} {where}: no console errors {errs}")
    bad = [b for b in page.bad if "favicon" not in b]
    check(not bad, f"{tag} {where}: no failed requests {bad}")


# Is the stopwatch clear of every piece of River panel text and control? Returns the overlaps.
SW_CLEAR = """() => {
  const sw = document.getElementById('stopwatch').getBoundingClientRect();
  const hit = (r) => r.width && r.height && !(r.right <= sw.left || r.left >= sw.right || r.bottom <= sw.top || r.top >= sw.bottom);
  const sel = '#knownBox, #lenSlider, [data-heading], #valve, #valveLabel, #steps .rv-step-h, #steps .rv-step-b, #steps button, #steps input, #steps label, #undoTrial, #clearLab, .rv-panel-h, #stage, #playBtn, #actionBtn, #resetBtn, #slowNote, #readout .rv-eq, #readout h2, #frameBar button';
  const out = [...document.querySelectorAll(sel)].filter((e) => e.offsetParent && hit(e.getBoundingClientRect())).map((e) => e.id || e.className || e.tagName);
  if (sw.left < 0 || sw.right > innerWidth + 0.5) out.push('off screen');
  return out;
}"""
# Bow tip vs the start gate, in screen px (Leo's bow tip is 7 px in from the image edge of 480).
BOW_GATE = """() => {
  const img = document.querySelector('[data-drag=boat] image').getBoundingClientRect();
  const g = document.querySelector('[data-gate=start]').getBoundingClientRect();
  const bow = __rv.lab.heading > 0 ? img.right - img.width * 7 / 480 : img.left + img.width * 7 / 480;
  return [bow, g.left + g.width / 2];
}"""
# Leo's boat sprite inside the channel's water (0 to 5 m), with 3 px of slack for the outline.
BOAT_IN_WATER = """() => {
  const img = document.querySelector('[data-drag=boat] image').getBoundingClientRect();
  const s = document.getElementById('sceneSvg').getBoundingClientRect(), k = s.width / 1600;
  const w0 = s.left + (223 - __rv.st.shift * __rv.river.ppm) * k, w1 = w0 + 5 * __rv.river.ppm * k;
  const stern = __rv.lab.heading > 0 ? img.left + img.width * 6 / 480 : img.right - img.width * 6 / 480;
  const bow = __rv.lab.heading > 0 ? img.right - img.width * 7 / 480 : img.left + img.width * 7 / 480;
  return [Math.min(stern, bow) >= w0 - 3 * k, Math.max(stern, bow) <= w1 + 3 * k, Math.min(stern, bow) - w0, w1 - Math.max(stern, bow)];
}"""
# Stage-coordinate boxes (viewBox units) of every arrow piece of a class, from getBBox.
ARROW_BOXES = """(cls) => [...document.querySelectorAll('#sceneSvg .' + cls)].map((g) => { const b = g.getBBox(); return [b.x, b.y, b.x + b.width, b.y + b.height]; })"""
INSIDE = """(sel) => {
  const s = document.getElementById('sceneSvg').getBoundingClientRect(), r = document.querySelector(sel + ' image').getBoundingClientRect();
  return r.left >= s.left - 0.5 && r.right <= s.right + 0.5;
}"""


def frame_btn(page, label):
    return page.locator("#frameBar button", has_text=label)


def run_module(ctx, base, tag, touch):
    page = ctx.new_page()
    track(page)
    page.goto(base + "/study-relative-velocity", wait_until="networkidle")
    page.wait_for_function("() => window.__rv && document.querySelector('#sceneSvg image')")
    inp = Input(page, touch)
    # set the light theme first for a predictable baseline
    if js(page, "() => document.documentElement.dataset.theme") == "dark":
        inp.tap(page.locator("#themeBtn"))

    # structure: lab first and labeled, three sandboxes under Explore
    groups = js(page, "() => [...document.querySelectorAll('.rv-tabgroup')].map(g => [g.querySelector('.rv-group-h').textContent, [...g.querySelectorAll('.rv-tab')].map(b => b.dataset.scene)])")
    check(groups == [["Lab", ["river"]], ["Explore", ["truck", "walkway", "kart"]]], f"{tag} Lab first, Explore holds 3 sandboxes {groups}")
    check(js(page, "() => document.querySelector('[data-scene=river] .rv-badge').textContent") == "Lab", f"{tag} river tab carries the Lab badge")
    imgs = js(page, "() => [...document.querySelectorAll('#sceneSvg image')].map(i => i.getAttribute('href'))")
    check(all(h.startswith("relative-velocity/art/") for h in imgs) and len(imgs) >= 4, f"{tag} river art from the art folder ({len(imgs)})")
    no_overflow(page, tag, "river")
    # the stopwatch starts docked beside the valve, clear of the step text
    page.locator("#steps").evaluate("e => e.scrollIntoView({ block: 'start' })")
    over = js(page, SW_CLEAR)
    check(over == [], f"{tag} stopwatch starts clear of the step text {over}")
    page.locator("#sceneSvg").evaluate("e => e.scrollIntoView({ block: 'center' })")
    bow, gate = js(page, BOW_GATE)
    check(abs(bow - gate) < 1.5, f"{tag} boat bow sits on the start gate at t=0 ({bow:.1f} vs {gate:.1f})")
    w = js(page, BOAT_IN_WATER)
    check(w[0] and w[1], f"{tag} the whole boat starts inside the channel water {w}")
    # no stray dot under the ruler in still water: the water arrow at the leaf only shows when it moves
    low = page.evaluate(ARROW_BOXES, "rv-a-med")
    check(not [b for b in low if b[1] > 600], f"{tag} still water: no water-arrow dot under the ruler {[b for b in low if b[1] > 600]}")
    # valve off: the wheel stays red (no fade), a grey ring and an Off tag
    v = js(page, "() => { const v = document.getElementById('valve'); return [getComputedStyle(v).opacity, getComputedStyle(v.querySelector('img')).opacity, v.dataset.state, document.getElementById('valveTag').textContent, getComputedStyle(v).boxShadow]; }")
    check(v[0] == "1" and v[1] == "1" and v[2] == "off" and v[3] == "Off" and "142, 138, 132" in v[4], f"{tag} valve off: full-color wheel, grey ring, Off tag {v}")
    # ruler readable: at least 24 px tall; on phones the channel scrolls sideways and the boat is in view
    rh = js(page, "() => document.querySelector('[data-art=ruler]').getBoundingClientRect().height")
    check(rh >= 23.9 or tag == "desktop", f"{tag} ruler is {rh:.1f} px tall (phones need 24 or more)")
    if tag != "desktop":
        sc = js(page, "() => { const s = document.getElementById('stageScroll'), b = document.querySelector('[data-drag=boat]').getBoundingClientRect(), r = s.getBoundingClientRect(); return [s.scrollWidth > s.clientWidth, b.left >= r.left - 1 && b.right <= r.right + 1]; }")
        check(sc[0] and sc[1], f"{tag} the channel scrolls sideways and starts with the boat in view {sc}")
        lb = js(page, "() => { const s = document.getElementById('stageScroll').getBoundingClientRect(), l = __rv.river.label.getBoundingClientRect(); return [l.left >= s.left - 1 && l.right <= s.right + 1, l.width > 20]; }")
        check(lb[0] and lb[1], f"{tag} the River status label stays in view while the channel scrolls {lb}")
    shot(page, f"{tag}-01-river-lab.png")

    # draggables: bead (leaf) and boat
    def svg_center(sel):
        page.evaluate(f"() => {{ const s = document.getElementById('stageScroll'), r = document.querySelector('{sel}').getBoundingClientRect(), b = s.getBoundingClientRect(); if (r.left < b.left || r.right > b.right) s.scrollLeft += (r.left + r.width / 2) - (b.left + b.width / 2); }}")
        return page.evaluate(f"() => {{ const r = document.querySelector('{sel}').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }}")
    page.locator("#sceneSvg").evaluate("e => e.scrollIntoView({ block: 'center' })")
    bx, by = svg_center("[data-drag=bead1]")
    before = js(page, "() => __rv.river.beads[1].x")
    inp.drag(bx, by, bx + 40, by)
    after = js(page, "() => __rv.river.beads[1].x")
    check(after > before + 0.05, f"{tag} drag a bead along the channel ({before:.2f} -> {after:.2f} m)")
    bx, by = svg_center("[data-drag=boat]")
    b0 = js(page, "() => __rv.river.boat.x")
    inp.drag(bx, by, bx + 50, by)
    check(js(page, "() => __rv.river.boat.x") > b0 + 0.1, f"{tag} drag the idle boat")

    # stopwatch: time a still-water trial, then drag it
    sw = page.locator("#swStart")
    inp.tap(sw)
    time.sleep(1.0)
    inp.tap(sw)
    trials = js(page, "() => __rv.lab.trials.still")
    check(len(trials) == 1 and 0.8 < trials[0] < 2.0, f"{tag} stopwatch start and stop records a still trial {trials}")
    check(js(page, "() => document.querySelector('[data-avg=still]').textContent") != "", f"{tag} data table shows the still average")
    box = page.locator("#stopwatch").bounding_box()
    sx, sy = box["x"] + box["width"] / 2, box["y"] + 14
    inp.drag(sx, sy, sx - 60, sy - 80)
    box2 = page.locator("#stopwatch").bounding_box()
    check(abs(box2["x"] - box["x"]) > 30 and abs(box2["y"] - box["y"]) > 40, f"{tag} drag the stopwatch ({box['x']:.0f},{box['y']:.0f}) -> ({box2['x']:.0f},{box2['y']:.0f})")
    js(page, "() => __rv.dockStopwatch()")  # park it back so it cannot sit on the next tap target
    check(js(page, SW_CLEAR) == [], f"{tag} docked stopwatch is clear of the step text again")

    # frame switch on the river: Boat view keeps the boat at rest while it runs
    inp.tap(frame_btn(page, "Boat"))
    check(js(page, "() => __rv.st.frame.river") == "boat", f"{tag} tap Boat frame")
    inp.tap(page.locator("#actionBtn"))
    time.sleep(0.6)
    x1, c1 = screen_x(page, "[data-drag=boat]"), screen_x(page, "[data-art=channel]")
    time.sleep(0.6)
    x2, c2 = screen_x(page, "[data-drag=boat]"), screen_x(page, "[data-art=channel]")
    check(abs(x2 - x1) < 1.5, f"{tag} Boat frame: boat stays put on screen ({x1:.1f} -> {x2:.1f})")
    check(c2 < c1 - 5, f"{tag} Boat frame: the channel slides back ({c1:.1f} -> {c2:.1f})")
    check(js(page, "() => !!document.querySelector('[data-eq=frame]')"), f"{tag} readout adds the boat-frame line")
    inp.tap(frame_btn(page, "Shore"))
    page.wait_for_function("() => !__rv.river.boat.running", timeout=15000)
    # gate timing: the run started with the bow on the start gate and stopped with it on the finish gate
    still = js(page, "() => __rv.lab.trials.still")
    L = js(page, "() => __rv.lab.length")
    check(len(still) == 2 and abs(still[-1] - L / 0.5) < 0.011, f"{tag} gates time the still run: {still[-1] if still else None} s for {L} m at 0.50 m/s")
    fin = js(page, "() => [__rv.river.boat.x, __rv.river.gates()[1]]")
    check(abs(fin[0] - fin[1]) < 1e-9, f"{tag} the boat stops with its bow on the finish gate {fin}")
    w = js(page, BOAT_IN_WATER)
    check(w[0] and w[1], f"{tag} the whole boat is inside the channel at the finish {w}")
    inp.tap(page.locator("[data-heading='-1']"))
    bow, gate = js(page, BOW_GATE)
    check(abs(bow - gate) < 1.5, f"{tag} upstream: bow (facing left) on the start gate at the right ({bow:.1f} vs {gate:.1f})")
    w = js(page, BOAT_IN_WATER)
    check(w[0] and w[1], f"{tag} upstream: the whole boat starts inside the channel {w}")
    inp.tap(page.locator("[data-heading='1']"))

    # Lab steps: predict box gates Step 3, valve turns the water on, then compare
    inp.tap(page.locator("[data-next='2']"))
    check(js(page, "() => __rv.lab.step") == 2, f"{tag} step 2 opens after a still trial")
    check(page.locator("#lockPred").is_disabled(), f"{tag} lock is disabled until both predictions are in")
    check(js(page, "() => document.getElementById('valve').getAttribute('aria-disabled')") == "true", f"{tag} valve locked before predictions")
    page.locator("#predDown").fill("0.7")
    page.locator("#predUp").fill("0.3")
    inp.tap(page.locator("#lockPred"))
    check(js(page, "() => __rv.lab.step") == 3, f"{tag} predictions lock and open step 3")
    inp.tap(page.locator("#valve"))
    check(abs(js(page, "() => __rv.river.flow") - 0.2) < 1e-9, f"{tag} tap the valve: water on at the known 0.20 m/s")
    v = js(page, "() => [document.getElementById('valve').dataset.state, document.getElementById('valveTag').textContent]")
    check(v == ["on", "On"], f"{tag} valve on: On tag and the amber ring {v}")
    for heading in ("1", "-1"):
        inp.tap(page.locator(f"[data-heading='{heading}']"))
        inp.tap(sw)
        time.sleep(0.5)
        inp.tap(sw)
    t = js(page, "() => __rv.lab.trials")
    check(len(t["down"]) == 1 and len(t["up"]) == 1, f"{tag} downstream and upstream trials recorded {t}")
    inp.tap(page.locator("[data-next='4']"))
    check(js(page, "() => __rv.lab.complete && !document.getElementById('results').hidden"), f"{tag} step 4 shows the results summary")
    rows = js(page, "() => [...document.querySelectorAll('#results tr[data-row]')].map(r => [...r.cells].map(c => c.textContent))")
    check(len(rows) == 3 and rows[1][1] == "0.70" and rows[1][3] == "0.70" and rows[2][3] == "0.30", f"{tag} results: predicted vs measured vs exact {rows}")
    page.locator("#results").evaluate("e => e.scrollIntoView({ block: 'center' })")
    shot(page, f"{tag}-02-lab-results.png")
    # valve rotates on drag once the lab is done (free run)
    page.locator("#valve").evaluate("e => e.scrollIntoView({ block: 'center' })")
    time.sleep(0.1)
    vb = page.locator("#valve").bounding_box()
    cx, cy = vb["x"] + vb["width"] / 2, vb["y"] + vb["height"] / 2
    inp.drag(cx + vb["width"] * 0.42, cy, cx, cy + vb["height"] * 0.42, steps=10)
    ang = js(page, "() => __rv.lab.valveAngle")
    check(150 < ang < 200, f"{tag} drag rotates the valve knob (angle {ang:.0f})")

    # Truck: ground frame shows the drop straight down, truck frame the backward flight
    inp.tap(page.locator("[data-scene=truck]"))
    inp.tap(page.locator("#resetBtn"))
    check(page.evaluate(INSIDE, "[data-drag=truck]"), f"{tag} truck starts fully in frame")
    ab = page.evaluate(ARROW_BOXES, "rv-a-med") + page.evaluate(ARROW_BOXES, "rv-a-obj") + page.evaluate(ARROW_BOXES, "rv-a-sum")
    check(ab and max(b[3] for b in ab) < 300, f"{tag} truck arrows ride in the sky band above the trees (lowest y {max(b[3] for b in ab) if ab else -1:.0f}, tree tops at about 336)")
    page.wait_for_function("() => __rv.truck.released && __rv.truck.ball().landed", timeout=20000)
    xs = js(page, "() => [...document.querySelectorAll('#sceneSvg .rv-trail')].map(c => +c.getAttribute('cx'))")
    check(len(xs) > 5 and max(xs) - min(xs) < 1.0, f"{tag} truck, ground frame: trail is a vertical drop (spread {max(xs) - min(xs) if xs else -1:.2f} px over {len(xs)} dots)")
    eq = js(page, "() => document.querySelector('[data-eq=ground] .s').textContent")
    check(eq.startswith("0.0 mph"), f"{tag} truck readout: ball/ground = 0 mph ({eq})")
    page.locator("#sceneSvg").evaluate("e => e.scrollIntoView({ block: 'center' })")
    shot(page, f"{tag}-03-truck-ground.png")
    inp.tap(frame_btn(page, "Truck"))
    time.sleep(0.9)
    xs2 = js(page, "() => [...document.querySelectorAll('#sceneSvg .rv-trail')].map(c => +c.getAttribute('cx'))")
    check(len(xs2) > 5 and max(xs2) - min(xs2) > 20, f"{tag} truck frame: same trail flies backward (spread {max(xs2) - min(xs2) if xs2 else -1:.0f} px)")
    n, bad = js(page, NO_MIRROR)
    check(n == 1 and not bad, f"{tag} truck frame (moving camera): backdrop repeats directly, no mirror ({n}, {bad})")
    t1 = screen_x(page, "[data-drag=truck]"); time.sleep(0.5); t2 = screen_x(page, "[data-drag=truck]")
    check(abs(t2 - t1) < 1.5, f"{tag} truck frame: truck at rest on screen ({t1:.1f} -> {t2:.1f})")
    shot(page, f"{tag}-04-truck-frame.png")

    # Walkway: walker frame keeps the walker still; drag the walker
    inp.tap(page.locator("[data-scene=walkway]"))
    inp.tap(frame_btn(page, "Walker"))
    time.sleep(0.9)  # let the camera glide settle
    w1 = screen_x(page, "[data-drag=walker]"); time.sleep(0.5); w2 = screen_x(page, "[data-drag=walker]")
    check(abs(w2 - w1) < 1.5, f"{tag} walkway, Walker frame: walker at rest ({w1:.1f} -> {w2:.1f})")
    rail = js(page, "() => { const t = document.querySelector('#walkTile image').getBBox(), w = document.querySelector('[data-drag=walker] image').getBBox(); return [(245 - 10) * t.height / 390, w.height * 720 / 741]; }")
    fl = js(page, "() => [__rv.walkway.baseY, __rv.walkway.floorY, __rv.walkway.tileTop, document.querySelector('#walkTile').getAttribute('y')]")
    check(fl[0] == 760 and fl[0] > fl[1] and abs(float(fl[3]) - fl[2]) < 0.01, f"{tag} walkway base on y 760, on the airport floor (from y 510), tile at y {fl[2]:.1f}")
    check(0.95 < rail[0] / rail[1] * 1.75 < 1.1, f"{tag} handrail is about 1 m above the belt: {rail[0]:.0f} px against a {rail[1]:.0f} px (1.75 m) walker = {rail[0] / rail[1] * 1.75:.2f} m")
    inp.tap(frame_btn(page, "Floor"))
    inp.tap(page.locator("[data-walk='-1']"))
    eqw = js(page, "() => document.querySelector('[data-eq=ground] .s').textContent")
    check(eqw.startswith("\u22120.75 m/s"), f"{tag} walkway against the belt: -1.40 + 0.65 = -0.75 m/s ({eqw})")
    page.locator("#sceneSvg").evaluate("e => e.scrollIntoView({ block: 'center' })")
    shot(page, f"{tag}-05-walkway.png")

    # Kart: rival frame and a kart drag
    inp.tap(page.locator("[data-scene=kart]"))
    inp.tap(frame_btn(page, "Rival"))
    time.sleep(0.9)
    r1 = screen_x(page, "[data-drag=rival]"); time.sleep(0.5); r2 = screen_x(page, "[data-drag=rival]")
    check(abs(r2 - r1) < 1.5, f"{tag} kart, Rival frame: rival at rest ({r1:.1f} -> {r2:.1f})")
    inp.tap(page.locator("#playBtn"))  # pause so the drag target holds still
    kx, ky = svg_center("[data-drag=kart]")
    k0 = js(page, "() => __rv.kart.k0")
    inp.drag(kx, ky, kx + 50, ky)
    check(abs(js(page, "() => __rv.kart.k0") - k0) > 0.5, f"{tag} drag the kart")
    ka = [b for b in page.evaluate(ARROW_BOXES, "rv-a-obj") + page.evaluate(ARROW_BOXES, "rv-a-med") + page.evaluate(ARROW_BOXES, "rv-a-sum") if b[1] > 600]
    check(ka and min(b[1] for b in ka) > 777, f"{tag} kart arrows clear of the boost chevrons and the curb (top y {min(b[1] for b in ka) if ka else -1:.0f}; chevrons end at 739, curb at 777)")
    # Reset and Start over in the Rival view put the player kart back inside the view
    inp.tap(page.locator("#resetBtn"))
    check(page.evaluate(INSIDE, "[data-drag=kart]") and page.evaluate(INSIDE, "[data-drag=rival]"), f"{tag} kart, Rival view: after Reset both karts start inside the view")
    inp.tap(page.locator("#actionBtn"))
    check(page.evaluate(INSIDE, "[data-drag=kart]"), f"{tag} kart, Rival view: after Start over the kart starts inside the view")
    inp.tap(page.locator("#playBtn"))
    for fr in ("Track", "Kart", "Rival"):
        inp.tap(frame_btn(page, fr))
        inp.tap(page.locator("#resetBtn"))
        time.sleep(0.05)
        check(page.evaluate(INSIDE, "[data-drag=kart]") and page.evaluate(INSIDE, "[data-drag=rival]"), f"{tag} kart, {fr} view: both karts inside after Reset")
    page.locator("#sceneSvg").evaluate("e => e.scrollIntoView({ block: 'center' })")
    shot(page, f"{tag}-06-kart-rival.png")

    # dark mode
    inp.tap(page.locator("#themeBtn"))
    check(js(page, "() => document.documentElement.dataset.theme") == "dark", f"{tag} dark mode toggles")
    check(js(page, "() => getComputedStyle(document.body).backgroundColor") == "rgb(31, 29, 26)", f"{tag} dark paper is #1F1D1A")
    check(js(page, "() => [...document.querySelectorAll('[data-art^=bg-]')].every(i => i.getAttribute('href').includes('-dark.'))"), f"{tag} dark backdrops load")
    inp.tap(page.locator("[data-scene=river]"))
    page.locator("#sceneSvg").evaluate("e => e.scrollIntoView({ block: 'center' })")
    shot(page, f"{tag}-07-river-dark.png")
    no_overflow(page, tag, "after all scenes")
    # Art review shots: each scene in both themes, play paused and the viewer fixed.
    js(page, "() => __rv.dockStopwatch()")
    for dark in (False, True):
        if (js(page, "() => document.documentElement.dataset.theme") == "dark") != dark:
            inp.tap(page.locator("#themeBtn"))
        for scene in ("river", "truck", "walkway", "kart"):
            inp.tap(page.locator(f"[data-scene={scene}]"))
            inp.tap(page.locator("#resetBtn"))
            if js(page, "() => __rv.st.playing"):
                inp.tap(page.locator("#playBtn"))
            page.locator("#sceneSvg").evaluate("e => e.scrollIntoView({ block: 'center' })")
            page.wait_for_function("() => [...document.querySelectorAll('#sceneSvg image')].every(i => i.getAttribute('href').endsWith('.webp'))")
            n, bad = js(page, NO_MIRROR)
            check(n == 1 and not bad, f"{tag} {scene} {'dark' if dark else 'light'}: one backdrop, repeated directly, no mirrored copy ({n}, {bad})")
            time.sleep(0.2)
            shot(page, f"{tag}-art-{scene}-{'dark' if dark else 'light'}.png")
        no_overflow(page, tag, "art review " + ("dark" if dark else "light"))
    errors_ok(page, tag, "module")
    page.close()


# Seams: every backdrop is repeated directly (one image per 1600 px pattern, nothing mirrored), and each
# served webp wraps: in every one of 30 horizontal bands the step from its right edge to its left edge is no
# bigger than the 99.5th percentile of the image's own column-to-column steps in that band. Leo's old
# non-tiling backdrops score 2 to 9 on this ratio; the seamless set scores under 1.5.
SEAM_MAX = 1.6
NO_MIRROR = """() => {
  const pats = [...document.querySelectorAll('#sceneSvg pattern[data-backdrop]')];
  const bad = [];
  for (const p of pats) {
    const imgs = p.querySelectorAll('image');
    if (p.getAttribute('width') !== '1600' || imgs.length !== 1) bad.push(p.id + ' width ' + p.getAttribute('width') + ' images ' + imgs.length);
    for (const i of imgs) if (i.getAttribute('transform')) bad.push(p.id + ' transform ' + i.getAttribute('transform'));
  }
  for (const i of document.querySelectorAll('#sceneSvg image[data-art^="bg-"]')) if (!i.closest('pattern[data-backdrop]') || (i.getAttribute('transform') || '').includes('-1')) bad.push('loose or flipped ' + i.dataset.art);
  return [pats.length, bad];
}"""


def seam_ratio(data):
    import io
    import numpy as np
    from PIL import Image
    b = np.asarray(Image.open(io.BytesIO(data)).convert("RGB")).astype(float)
    worst = 0.0
    for i in range(30):
        s = b[i * b.shape[0] // 30:(i + 1) * b.shape[0] // 30]
        steps = np.abs(s[:, 1:] - s[:, :-1]).mean(axis=(0, 2))
        worst = max(worst, float(np.abs(s[:, 0] - s[:, -1]).mean() / np.percentile(steps, 99.5)))
    return worst


def run_seams(base):
    import urllib.request
    for scene in ("river", "truck", "walkway", "kart"):
        for theme in ("light", "dark"):
            name = f"relative-velocity/art/bg-{scene}-{theme}.webp"
            req = urllib.request.Request(f"{base}/{name}?seam=1", headers={"User-Agent": UA})
            data = urllib.request.urlopen(req).read()
            r = seam_ratio(data)
            check(r <= SEAM_MAX, f"seam: {name} wraps left to right with no visible step (ratio {r:.2f}, limit {SEAM_MAX})")


def run_links(ctx, base, tag, touch):
    # Study library card
    page = ctx.new_page()
    track(page)
    page.goto(base + "/study", wait_until="networkidle")
    card = page.locator("text=Relative Velocity Exploration").first
    check(card.count() == 1, f"{tag} study library lists Relative Velocity Exploration")
    page.close()
    # Physics 101 M6 L3 Try it card opens the module
    page = ctx.new_page()
    track(page)
    page.goto(base + "/study-physics101-story.html?lesson=m06-l03&tab=sq", wait_until="networkidle")
    link = page.locator("#sqTry a.tryit-card[href*='study-relative-velocity']")
    link.first.wait_for(timeout=15000)
    check(link.count() == 1, f"{tag} M6 L3 Study Questions shows the Try it card")
    link.first.evaluate("e => e.scrollIntoView({ block: 'center' })")
    page.wait_for_function("() => [...document.querySelectorAll('#sqTry .tryit-card img')].some(i => i.offsetParent && i.complete && i.naturalWidth > 0)", timeout=10000)
    thumbs = js(page, "() => [...document.querySelectorAll('#sqTry .tryit-card img')].filter(i => i.offsetParent).map(i => i.getAttribute('src').split('/').pop() + ':' + (i.complete && i.naturalWidth > 0))")
    want = "study-relative-velocity-dark.webp" if js(page, "() => document.documentElement.dataset.theme") == "dark" else "study-relative-velocity.webp"
    check(any(t.startswith(want + ":true") for t in thumbs), f"{tag} Try it thumbnail matches the theme ({want})")
    check(thumbs and all(t.endswith(":true") for t in thumbs), f"{tag} visible Try it thumbnails load {thumbs}")
    if not touch:
        shot(page, f"{tag}-08-m06-l03-tryit.png")
    else:
        link.first.scroll_into_view_if_needed()
        shot(page, f"{tag}-08-m06-l03-tryit.png")
    Input(page, touch).tap(link.first)
    page.wait_for_url("**/study-relative-velocity*", timeout=15000)
    page.wait_for_function("() => window.__rv")
    check("study-relative-velocity" in page.url, f"{tag} tapping the Try it card opens the module")
    errors_ok(page, tag, "M6 L3 to module")
    # Back returns to the study library
    page.locator("#studyBackBtn").click()
    page.wait_for_url("**/study*", timeout=15000)
    path = urlparse(page.url).path
    check(path.startswith("/study") and "relative-velocity" not in path, f"{tag} Back goes to the study library ({path})")
    page.close()
    # Missing art is a real 404, not the SPA shell
    if REMOTE_BASE:
        page = ctx.new_page()
        r = page.goto(base + "/relative-velocity/art/no-such-file.png")
        check(r.status == 404, f"{tag} missing art returns 404 ({r.status})")
        page.close()


def main():
    server = None
    base = REMOTE_BASE
    if not base:
        socketserver.TCPServer.allow_reuse_address = True
        server = socketserver.TCPServer(("127.0.0.1", 0), Handler)
        threading.Thread(target=server.serve_forever, daemon=True).start()
        base = f"http://127.0.0.1:{server.server_address[1]}"
    print("SERVER", base)
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(channel="chrome", headless=True, args=["--no-sandbox", "--disable-dev-shm-usage"])
            run_seams(base)
            for tag, opts in DEVICES:
                ctx = browser.new_context(**opts)
                run_module(ctx, base, tag, opts["has_touch"])
                run_links(ctx, base, tag, opts["has_touch"])
                ctx.close()
            # reduced motion: nothing plays until asked
            ctx = browser.new_context(reduced_motion="reduce", viewport={"width": 390, "height": 844}, has_touch=True, is_mobile=True)
            page = ctx.new_page()
            page.goto(base + "/study-relative-velocity?scene=walkway", wait_until="networkidle")
            page.wait_for_function("() => window.__rv")
            time.sleep(0.5)
            check(page.evaluate("() => !__rv.st.playing && __rv.walkway.t === 0"), "reduced motion: scene waits for Play")
            check(page.locator("#playBtn").text_content() == "Play", "reduced motion: button reads Play")
            ctx.close()
            browser.close()
    finally:
        if server:
            server.shutdown()
    print(f"RESULT {passes} passed, {failures} failed")
    sys.exit(1 if failures else 0)


if __name__ == "__main__":
    main()
