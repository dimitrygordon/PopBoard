#!/usr/bin/env python3
"""Playwright user checks for the Spaceships gallery and detail viewer."""
from __future__ import annotations

import http.server
import os
import socketserver
import sys
import threading
from functools import partial
from pathlib import Path

from playwright.sync_api import TimeoutError as PwTimeout
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1] / "public"
OUT = Path("/workspace/popboard-spaceships-shots")
OUT.mkdir(parents=True, exist_ok=True)

IPHONE = dict(
    viewport={"width": 390, "height": 844},
    device_scale_factor=3,
    is_mobile=True,
    has_touch=True,
    user_agent=(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) "
        "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
    ),
)
IPHONE_SE = dict(
    viewport={"width": 375, "height": 667},
    device_scale_factor=3,
    is_mobile=True,
    has_touch=True,
    user_agent=IPHONE["user_agent"],
)
DESKTOP = dict(
    viewport={"width": 1280, "height": 800},
    device_scale_factor=1,
    is_mobile=False,
    has_touch=False,
)

MIME = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".mjs": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".webp": "image/webp",
    ".jpg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".woff2": "font/woff2",
    ".glb": "model/gltf-binary",
    ".usdz": "model/vnd.usdz+zip",
}


class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, fmt, *args):
        return

    def translate_path(self, path):
        raw = path.split("?", 1)[0].split("#", 1)[0]
        rel = raw.lstrip("/")
        if rel == "" or rel.endswith("/"):
            rel = rel + "index.html"
        candidate = ROOT / rel
        if candidate.is_file():
            return str(candidate)
        html = ROOT / (rel + ".html")
        if html.is_file():
            return str(html)
        return str(candidate)

    def guess_type(self, path):
        ext = Path(path).suffix.lower()
        if ext in MIME:
            return MIME[ext]
        return super().guess_type(path)


def start_server():
    socketserver.TCPServer.allow_reuse_address = True
    server = socketserver.TCPServer(("127.0.0.1", 0), Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    port = server.server_address[1]
    return server, f"http://127.0.0.1:{port}"


def track(page):
    page.errors = []
    page.on("pageerror", lambda exc: page.errors.append(f"pageerror: {exc}"))
    page.on("console", lambda msg: page.errors.append(f"console:{msg.type}: {msg.text}") if msg.type == "error" else None)


def hard_errors(page):
    skip = ("Failed to load resource", "net::", "favicon", "popboard-icon")
    return [e for e in page.errors if not any(s.lower() in e.lower() for s in skip)]


def shot(page, name):
    dest = OUT / name
    page.screenshot(path=str(dest), full_page=False)
    print("SHOT", dest)
    return dest


failures = 0


def check(cond, msg):
    global failures
    print(("PASS " if cond else "FAIL ") + msg)
    if not cond:
        failures += 1


def open_page(context, url):
    page = context.new_page()
    track(page)
    page.goto(url, wait_until="networkidle", timeout=30000)
    return page


def wait_model_loaded(page):
    page.wait_for_function(
        """() => {
          const mv = document.querySelector('model-viewer');
          return !!(mv && mv.loaded && !mv.hidden);
        }""",
        timeout=20000,
    )


def camera_orbit(page):
    return page.evaluate(
        """() => {
          const mv = document.querySelector('model-viewer');
          if (!mv || typeof mv.getCameraOrbit !== 'function') return '';
          const o = mv.getCameraOrbit();
          return [o.theta, o.phi, o.radius].join(' ');
        }"""
    )


def ar_attrs(page):
    return page.evaluate(
        """() => {
          const mv = document.querySelector('model-viewer');
          if (!mv) return null;
          return {
            ar: mv.hasAttribute('ar'),
            arModes: mv.getAttribute('ar-modes'),
            arScale: mv.getAttribute('ar-scale'),
            cameraControls: mv.hasAttribute('camera-controls'),
            touchAction: mv.getAttribute('touch-action'),
            autoRotate: mv.hasAttribute('auto-rotate'),
            iosSrc: mv.getAttribute('ios-src'),
            src: mv.src || '',
            canActivateAR: !!mv.canActivateAR,
            arButtonHidden: document.getElementById('arBtn')?.hidden ?? null
          };
        }"""
    )


def overflow_x(page):
    return page.evaluate("() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1")


def drag_model(page):
    box = page.locator("#viewer").bounding_box()
    if not box:
        return False
    x = box["x"] + box["width"] * 0.55
    y = box["y"] + box["height"] * 0.45
    # Pause auto-rotate so a drag is measurable.
    page.evaluate("() => { const mv = document.querySelector('model-viewer'); mv.removeAttribute('auto-rotate'); }")
    page.wait_for_timeout(150)
    before = camera_orbit(page)
    if page.context.browser is None:
        pass
    # Prefer touch on mobile contexts, mouse otherwise.
    try:
        page.mouse.move(x, y)
        page.mouse.down()
        page.mouse.move(x - 80, y, steps=12)
        page.mouse.up()
    except Exception as exc:
        print("drag mouse failed", exc)
    page.wait_for_timeout(300)
    after = camera_orbit(page)
    return before, after


def run_gallery(context, base, tag):
    page = open_page(context, base + "/study-spaceships.html")
    page.wait_for_selector(".card[data-id='voyager']", timeout=15000)
    count = page.locator(".card").count()
    check(count == 16, f"{tag} gallery shows 16 cards (got {count})")
    check(page.locator("text=Spaceships").first.is_visible(), f"{tag} gallery title visible")
    check(not overflow_x(page), f"{tag} gallery does not overflow horizontally")
    shot(page, f"gallery-{tag}.png")
    # Search
    page.fill("#search", "voyager")
    page.wait_for_timeout(100)
    visible = page.locator(".card").count()
    check(visible == 1, f"{tag} search for voyager leaves 1 card (got {visible})")
    shot(page, f"gallery-search-{tag}.png")
    # Open the card
    with page.expect_navigation(timeout=15000):
        page.locator(".card[data-id='voyager']").click()
    check("id=voyager" in page.url, f"{tag} viewer opened with id=voyager ({page.url})")
    wait_model_loaded(page)
    page.wait_for_selector("#fallbackBanner:visible", timeout=10000)
    check(page.locator("#fallbackBanner").is_visible(), f"{tag} missing-GLB banner is shown")
    check(page.locator("#craftName").inner_text() == "Voyager", f"{tag} fact panel names Voyager")
    check("3D model courtesy NASA" in page.locator("#credit").inner_text(), f"{tag} NASA credit visible")
    check("PLACEHOLDER" in page.locator("#facts").inner_text(), f"{tag} facts stay labelled placeholders")
    attrs = ar_attrs(page)
    check(attrs is not None, f"{tag} model-viewer present")
    if attrs:
        check(attrs["ar"] and attrs["cameraControls"], f"{tag} ar and camera-controls are set")
        check(attrs["arModes"] == "webxr scene-viewer quick-look", f"{tag} ar-modes {attrs['arModes']}")
        check(attrs["arScale"] == "fixed", f"{tag} ar-scale fixed")
        check(attrs["touchAction"] == "pan-y", f"{tag} touch-action pan-y")
        check(attrs["iosSrc"] is None, f"{tag} ios-src unset when USDZ is missing")
        check("_placeholder.glb" in attrs["src"], f"{tag} src falls back to placeholder GLB")
        # Button is hidden when AR is unsupported; attributes still count.
        check(page.locator("#arBtn").count() == 1, f"{tag} View in your space button exists")
        check(page.locator("#arBtn").inner_text() == "View in your space", f"{tag} AR button label")
    check(not overflow_x(page), f"{tag} viewer does not overflow horizontally")
    shot(page, f"viewer-voyager-{tag}.png")
    before, after = drag_model(page)
    moved = before != after and before != "" and after != ""
    check(moved, f"{tag} drag-rotate changed camera orbit ({before} -> {after})")
    shot(page, f"viewer-after-drag-{tag}.png")
    errs = hard_errors(page)
    check(errs == [], f"{tag} no console errors {errs}")
    page.close()


def run_not_found(context, base, tag):
    page = open_page(context, base + "/study-spaceship.html?id=does-not-exist")
    page.wait_for_selector("#missing:visible", timeout=10000)
    check(page.locator("#missing").is_visible(), f"{tag} unknown id shows a not-found state")
    shot(page, f"viewer-missing-{tag}.png")
    errs = hard_errors(page)
    check(errs == [], f"{tag} not-found has no console errors {errs}")
    page.close()


def main():
    server, base = start_server()
    print("SERVER", base)
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(channel="chrome", headless=True, args=["--no-sandbox", "--disable-dev-shm-usage"])
            for tag, opts in (("iphone-390", IPHONE), ("iphone-375", IPHONE_SE), ("desktop", DESKTOP)):
                context = browser.new_context(**opts)
                run_gallery(context, base, tag)
                if tag == "iphone-390":
                    run_not_found(context, base, tag)
                context.close()
            browser.close()
    finally:
        server.shutdown()
    print("FAILURES", failures)
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
