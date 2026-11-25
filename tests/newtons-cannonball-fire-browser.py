#!/usr/bin/env python3
"""Playwright user checks for Newton's Cannonball Fire (desktop 1280, iPhone 390, iPhone 375).
Real touch drags (CDP touch events) on phones, real mouse on desktop.
NCF_BASE runs against a deployed site (e.g. a Pages preview). NCF_OUT sets the screenshot folder."""
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
OUT = Path(os.environ.get("NCF_OUT", "/workspace/popboard-ncf-shots/local"))
OUT.mkdir(parents=True, exist_ok=True)
REMOTE_BASE = os.environ.get("NCF_BASE", "").rstrip("/")
UA = ("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 "
      "(KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1")
DEVICES = (
    ("desktop", dict(viewport={"width": 1280, "height": 800}, device_scale_factor=1, is_mobile=False, has_touch=False)),
    ("iphone-390", dict(viewport={"width": 390, "height": 844}, device_scale_factor=3, is_mobile=True, has_touch=True, user_agent=UA)),
    ("iphone-375", dict(viewport={"width": 375, "height": 667}, device_scale_factor=3, is_mobile=True, has_touch=True, user_agent=UA)),
)
MIME = {".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
        ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp",
        ".woff2": "font/woff2"}


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


def stage_shot(page, name):
    """Canvas only, with the sticky header hidden so it cannot cover the cannon on phones."""
    page.locator("#stage").scroll_into_view_if_needed()
    page.evaluate("() => { const h = document.querySelector('.hud'); if (h) h.style.visibility = 'hidden'; }")
    dest = OUT / name
    page.locator("#stage").screenshot(path=str(dest))
    page.evaluate("() => { const h = document.querySelector('.hud'); if (h) h.style.visibility = ''; }")
    print("SHOT", dest)


def track(page):
    page.errors = []
    page.bad = []
    page.on("pageerror", lambda e: page.errors.append(str(e)))
    page.on("console", lambda m: page.errors.append(m.text) if m.type == "error" else None)
    page.on("requestfailed", lambda r: page.bad.append(r.url) if r.failure and "net::ERR_ABORTED" not in (r.failure or "") else None)


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
            self._t("touchEnd", [])
        else:
            self.page.mouse.click(x, y)

    def center(self, loc):
        box = loc.bounding_box()
        return box["x"] + box["width"] / 2, box["y"] + box["height"] / 2

    def tap(self, loc):
        x, y = self.center(loc)
        self.tap_xy(x, y)

    def drag(self, x0, y0, x1, y1, steps=12):
        if self.touch:
            self._t("touchStart", [(x0, y0)])
            for i in range(1, steps + 1):
                self._t("touchMove", [(x0 + (x1 - x0) * i / steps, y0 + (y1 - y0) * i / steps)])
            self._t("touchEnd", [])
        else:
            self.page.mouse.move(x0, y0)
            self.page.mouse.down()
            for i in range(1, steps + 1):
                self.page.mouse.move(x0 + (x1 - x0) * i / steps, y0 + (y1 - y0) * i / steps)
            self.page.mouse.up()


def js(page, expr):
    return page.evaluate(expr)


def no_overflow(page, tag, where):
    w = page.evaluate("() => [document.documentElement.scrollWidth, window.innerWidth]")
    check(w[0] <= w[1] + 1, f"{tag} {where}: no sideways scroll ({w[0]} <= {w[1]})")


def errors_ok(page, tag, where):
    errs = [e for e in page.errors if "favicon" not in e]
    check(not errs, f"{tag} {where}: no console errors {errs}")
    bad = [b for b in page.bad if "favicon" not in b]
    check(not bad, f"{tag} {where}: no failed requests {bad}")


def run_module(ctx, base, tag, touch):
    page = ctx.new_page()
    track(page)
    page.goto(base + "/study-newtons-cannonball-fire", wait_until="networkidle")
    page.wait_for_function("() => window.__ncf && __ncf.artReady", timeout=20000)
    inp = Input(page, touch)
    no_overflow(page, tag, "load")
    errors_ok(page, tag, "load")
    check(js(page, "() => document.querySelector('h1').textContent.includes(\"Newton's Cannonball Fire\")"), f"{tag} title is present")
    check(js(page, "() => __ncf.trails.length === 0 && !__ncf.playing"), f"{tag} starts with a clear board")
    check(js(page, "() => __ncf.artReady === true"), f"{tag} art loader finished")
    check(js(page, "() => __ncf.hasLeoArt === true"), f"{tag} Leo art is on the stage")
    check(js(page, "() => !__ncf.PLACEHOLDER && !__ncf.TESLA_PENDING"), f"{tag} wording and numbers are signed off")
    check(js(page, "() => document.querySelector('.ncf-marks')?.hidden === true && !document.getElementById('socratesMark').textContent && !document.getElementById('teslaMark').textContent"),
          f"{tag} tesla and socrates marks are hidden")
    for pid in ("escapeSurface", "planetX", "mountain"):
        nsteps = js(page, f"() => document.querySelectorAll('#prob-{pid} .ncf-step').length")
        check(nsteps == 4, f"{tag} problem {pid} has four reveal steps ({nsteps})")
    leftover = js(page, "() => [...document.querySelectorAll('#problems .ncf-step-body')].map(e => e.textContent).join(' ')")
    check("{" not in leftover or all(tok not in leftover for tok in ("{R}", "{GM}", "{v}", "{Tsec}", "{Tmin}", "{h}", "{r}", "{g}", "{vOrbit}", "{vEsc}", "{vSci}")),
          f"{tag} practice placeholders are filled")
    # default theme is dark (blackboard)
    if tag == "desktop":
        check(js(page, "() => document.documentElement.dataset.theme") == "dark", f"{tag} default theme is dark")
        shot(page, f"{tag}-01-sandbox-dark.png")
        stage_shot(page, f"{tag}-stage-empty-dark.png")
        inp.tap(page.locator("#themeBtn"))
        check(js(page, "() => document.documentElement.dataset.theme") == "light", f"{tag} theme toggle goes light")
        shot(page, f"{tag}-02-sandbox-light.png")
        stage_shot(page, f"{tag}-stage-empty-light.png")
        inp.tap(page.locator("#themeBtn"))
        check(js(page, "() => document.documentElement.dataset.theme") == "dark", f"{tag} theme toggle back to dark")
    else:
        shot(page, f"{tag}-01-sandbox-dark.png")
        stage_shot(page, f"{tag}-stage-empty-dark.png")
        inp.tap(page.locator("#themeBtn"))
        check(js(page, "() => document.documentElement.dataset.theme") == "light", f"{tag} theme toggle goes light")
        light_name = "iphone-390-stage-light.png" if tag == "iphone-390" else f"{tag}-stage-empty-light.png"
        stage_shot(page, light_name)
        inp.tap(page.locator("#themeBtn"))
        check(js(page, "() => document.documentElement.dataset.theme") == "dark", f"{tag} theme toggle back to dark")

    # Real drag on the launch-speed slider (scroll it fully on-screen first; on a phone the stage is tall)
    slider = page.locator("#speed")
    slider.scroll_into_view_if_needed()
    time.sleep(0.15)
    box = slider.bounding_box()
    v0 = js(page, "() => __ncf.v")
    inp.drag(box["x"] + 8, box["y"] + box["height"] / 2, box["x"] + box["width"] * 0.55, box["y"] + box["height"] / 2)
    time.sleep(0.15)
    v1 = js(page, "() => __ncf.v")
    check(v1 > v0 + 100, f"{tag} dragging the speed slider raises v ({v0} -> {v1})")

    # Fire a custom shot, then the five presets (persistent trails)
    page.locator("#fireBtn").scroll_into_view_if_needed()
    inp.tap(page.locator("#fireBtn"))
    page.wait_for_function("() => !__ncf.playing && __ncf.trails.length >= 1", timeout=12000)
    check(js(page, "() => __ncf.trails.length >= 1"), f"{tag} Fire leaves a trail")
    for pid in ("blue", "green", "red", "yellow", "escape"):
        inp.tap(page.locator(f'#presets button[data-id="{pid}"]'))
        page.wait_for_function("() => !__ncf.playing", timeout=12000)
    n = js(page, "() => __ncf.trails.length")
    check(n >= 6, f"{tag} preset shots leave persistent trails ({n})")
    kinds = js(page, "() => __ncf.trails.map(t => t.kind)")
    check("falls" in kinds and "circular" in kinds and "ellipse" in kinds and "escape" in kinds,
          f"{tag} trails include falls, circular, ellipse, escape {kinds}")
    shot(page, f"{tag}-03-trails.png")
    stage_shot(page, f"{tag}-stage-trails.png")
    no_overflow(page, tag, "after fire")
    errors_ok(page, tag, "after fire")

    # Height slider drag clears trails (new launch radius)
    h0 = js(page, "() => __ncf.h")
    page.locator("#height").scroll_into_view_if_needed()
    time.sleep(0.1)
    hbox = page.locator("#height").bounding_box()
    inp.drag(hbox["x"] + hbox["width"] * 0.2, hbox["y"] + hbox["height"] / 2,
             hbox["x"] + hbox["width"] * 0.8, hbox["y"] + hbox["height"] / 2)
    time.sleep(0.15)
    h1 = js(page, "() => __ncf.h")
    check(h1 != h0, f"{tag} dragging the height slider changes h ({h0} -> {h1})")
    check(js(page, "() => __ncf.trails.length === 0"), f"{tag} changing height clears trails")

    # Derive it and practice: tap-to-reveal, then apply a worked answer
    page.locator("#derive").scroll_into_view_if_needed()
    shot(page, f"{tag}-04-derive.png")
    first = page.locator("#deriveSteps .ncf-step").first
    inp.tap(first.locator("summary"))
    check(first.evaluate("e => e.open") is True, f"{tag} Derive it first step opens")
    page.locator("#practice").scroll_into_view_if_needed()
    shot(page, f"{tag}-05-practice.png")
    last = page.locator("#prob-mountain .ncf-step").last
    last.evaluate("e => e.open = true")
    show = last.locator(".ncf-show")
    show.scroll_into_view_if_needed()
    show.wait_for(state="visible")
    show.click()
    check(last.locator(".ncf-cover").get_attribute("data-hidden") == "0", f"{tag} Show answer reveals the last step")
    apply = page.locator("#prob-mountain .ncf-apply")
    apply.scroll_into_view_if_needed()
    apply.click()
    page.wait_for_function("() => !__ncf.playing && __ncf.trails.length >= 1", timeout=12000)
    check(js(page, "() => Math.abs(__ncf.h - 150000) < 1"), f"{tag} practice apply sets the 150 km mountain")
    check(js(page, "() => Math.abs(__ncf.v - __ncf.practiceAnswers().mountain.vOrbit) < 1e-6"), f"{tag} practice apply sets the exact v_orbit")
    check(js(page, "() => __ncf.trails.some(t => t.kind === 'circular')"), f"{tag} practice apply fires a circular shot")
    # 8 km peak note appears only at the sandbox floor
    js(page, "() => { __ncf.setH(8000); return true; }")
    check(js(page, "() => { const n = document.getElementById('peakNote'); return n && !n.hidden && n.textContent.includes('8 km peak'); }"),
          f"{tag} 8 km peak note appears at the minimum height")
    js(page, "() => { __ncf.setH(150000); return true; }")
    check(js(page, "() => document.getElementById('peakNote')?.hidden === true"), f"{tag} 8 km peak note hides at 150 km")
    errors_ok(page, tag, "practice")
    page.close()


def run_links(ctx, base, tag, touch):
    page = ctx.new_page()
    track(page)
    page.goto(base + "/study", wait_until="networkidle")
    card = page.locator("text=Newton's Cannonball Fire").first
    check(card.count() >= 1, f"{tag} study library lists Newton's Cannonball Fire")
    page.close()

    page = ctx.new_page()
    track(page)
    page.goto(base + "/study-physics101-story.html?lesson=m07-l02&tab=sq", wait_until="networkidle")
    link = page.locator("#sqTry a.tryit-card[href*='study-newtons-cannonball-fire']")
    # The story page can rewrite ?tab=sq to ?page=1 before sq-tab.js reads the URL,
    # which leaves the Study Questions pane hidden. Open the tab if the card is not visible.
    try:
        link.first.wait_for(timeout=15000)
    except Exception:
        page.locator("#tabSq").click()
        link.first.wait_for(timeout=20000)
    check(link.count() == 1, f"{tag} M7 L2 Study Questions shows the Try it card")
    # Primary card is first
    first_href = js(page, "() => document.querySelector('#sqTry a.tryit-card')?.getAttribute('href') || ''")
    check("study-newtons-cannonball-fire" in first_href, f"{tag} the cannonball card is first in the Try it row")
    # Keep the existing 3D cards
    three = js(page, "() => [...document.querySelectorAll('#sqTry a.tryit-card')].map(a => a.getAttribute('href')).join(' ')")
    check("study-astronomy-story" in three, f"{tag} Astronomy 3D cannon cards are still listed")
    link.first.evaluate("e => e.scrollIntoView({ block: 'center' })")
    page.wait_for_function(
        "() => [...document.querySelectorAll('#sqTry .tryit-card img')].filter(i => i.offsetParent).every(i => i.complete && i.naturalWidth > 0)",
        timeout=10000,
    )
    if not touch:
        shot(page, f"{tag}-06-m07-l02-tryit.png")
    else:
        link.first.scroll_into_view_if_needed()
        shot(page, f"{tag}-06-m07-l02-tryit.png")
    Input(page, touch).tap(link.first)
    page.wait_for_url("**/study-newtons-cannonball-fire*", timeout=15000)
    page.wait_for_function("() => window.__ncf")
    check("study-newtons-cannonball-fire" in page.url, f"{tag} tapping the Try it card opens the module")
    errors_ok(page, tag, "M7 L2 to module")
    page.locator("#studyBackBtn").click()
    page.wait_for_url("**/study*", timeout=15000)
    path = urlparse(page.url).path
    check(path.startswith("/study") and "cannonball" not in path, f"{tag} Back goes to the study library ({path})")
    page.close()


def run_reduced(browser, base):
    ctx = browser.new_context(reduced_motion="reduce", viewport={"width": 390, "height": 844}, has_touch=True, is_mobile=True, user_agent=UA)
    page = ctx.new_page()
    track(page)
    page.goto(base + "/study-newtons-cannonball-fire", wait_until="networkidle")
    page.wait_for_function("() => window.__ncf && __ncf.artReady", timeout=20000)
    check(js(page, "() => __ncf.reduced === true"), "reduced motion: flag is on")
    check(js(page, "() => !__ncf.playing && __ncf.trails.length === 0"), "reduced motion: nothing plays until asked")
    page.locator("#fireBtn").click()
    # Paths should appear immediately, not animate
    time.sleep(0.2)
    check(js(page, "() => !__ncf.playing && __ncf.trails.length >= 1"), "reduced motion: Fire draws the trail at once")
    errors_ok(page, "reduced", "fire")
    shot(page, "reduced-01-fire.png")
    ctx.close()


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
            for tag, opts in DEVICES:
                ctx = browser.new_context(**opts)
                run_module(ctx, base, tag, opts["has_touch"])
                run_links(ctx, base, tag, opts["has_touch"])
                ctx.close()
            run_reduced(browser, base)
            browser.close()
    finally:
        if server:
            server.shutdown()
    print(f"RESULT {passes} passed, {failures} failed")
    sys.exit(1 if failures else 0)


if __name__ == "__main__":
    main()
