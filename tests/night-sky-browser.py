#!/usr/bin/env python3
"""Playwright checks for Night Sky VR (desktop 1280, phone 390, light and dark).
Drag-to-look, tap a star, toggles and URL sync, presets, Enter VR with a mocked navigator.xr, console errors, screenshots.
NS_BASE runs against a deployed site (a Pages preview). NS_OUT sets the screenshot folder.
Cannot test here: a real WebXR session, controllers, hands, haptics, headset frame rate. Those need a Quest 3."""
from __future__ import annotations

import http.server
import os
import socketserver
import sys
import threading
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1] / "public"
OUT = Path(os.environ.get("NS_OUT", "/workspace/vr-planetarium/shots/local"))
OUT.mkdir(parents=True, exist_ok=True)
REMOTE_BASE = os.environ.get("NS_BASE", "").rstrip("/")
UA = ("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 "
      "(KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1")
DEVICES = (
    ("desktop", dict(viewport={"width": 1280, "height": 800}, device_scale_factor=1, is_mobile=False, has_touch=False)),
    ("phone-390", dict(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True, user_agent=UA)),
)
MIME = {".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
        ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp",
        ".woff2": "font/woff2", ".bin": "application/octet-stream", ".md": "text/markdown; charset=utf-8"}
T1 = "loc=jasper&utc=2026-12-21T03:00Z&speed=0"
PRESETS = {
    "off-south": f"{T1}&look=south",
    "on-south": f"{T1}&look=south&lines=1&art=1&names=1",
    "polaris-grid": f"{T1}&look=polaris&hl=polaris&lines=1&names=1&grid=altaz",
    "sydney-planets": "loc=sydney&date=2026-06-21&time=21:00&speed=0&look=south&lines=1&art=1&names=1&planets=1",
    "twilight": "loc=jasper&utc=2026-12-20T22:25Z&speed=0&look=west&sky=real",
    "ecliptic-planets": "loc=jasper&utc=2026-12-21T03:00Z&speed=0&look=south&planets=1&grid=ecl&starnames=1",
}
XR_MOCK = """
window.__xrCalls = [];
Object.defineProperty(navigator, 'xr', { configurable: true, value: {
  isSessionSupported: async (mode) => mode === 'immersive-vr',
  requestSession: async (mode, init) => { window.__xrCalls.push({ mode, init }); throw new Error('mock: no headset'); },
  addEventListener() {}, removeEventListener() {},
}});
"""
NO_XR = "Object.defineProperty(navigator, 'xr', { configurable: true, value: undefined });"


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


def open_page(browser, base, dev, theme, query, init=NO_XR):
    ctx = browser.new_context(color_scheme=theme, **dev)
    ctx.add_init_script(init)
    page = ctx.new_page()
    errs = []
    page.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: errs.append(str(e)))
    page.on("requestfailed", lambda r: errs.append("requestfailed " + r.url))
    page.goto(f"{base}/study-night-sky.html?{query}", wait_until="load")
    page.wait_for_function("window.__nightSky && document.getElementById('status').textContent === ''", timeout=60000)
    page.wait_for_timeout(600)
    return ctx, page, errs


def star_xy(page, hip):
    return page.evaluate("""(hip) => { const a = window.__nightSky, s = a.catalog.stars, i = s.indexOfHip.get(hip), M = a.frame.M, v = s.starVec(i);
      const d = [M[0]*v[0]+M[1]*v[1]+M[2]*v[2], M[3]*v[0]+M[4]*v[1]+M[5]*v[2], M[6]*v[0]+M[7]*v[1]+M[8]*v[2]];
      const p = a.project(d), r = document.getElementById('sky').getBoundingClientRect(); return { x: r.left + p.x, y: r.top + p.y, visible: p.visible }; }""", hip)


def bright_pixels(png_path):
    from PIL import Image
    im = Image.open(png_path).convert("L")
    return sum(im.histogram()[121:])


def main():
    with sync_playwright() as pw:
        browser = pw.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"])
        httpd = None
        if REMOTE_BASE:
            base = REMOTE_BASE
        else:
            httpd = socketserver.ThreadingTCPServer(("127.0.0.1", 0), Handler)
            threading.Thread(target=httpd.serve_forever, daemon=True).start()
            base = f"http://127.0.0.1:{httpd.server_address[1]}"
        print("base", base)
        for tag, dev in DEVICES:
            for theme in ("light", "dark"):
                for name, q in PRESETS.items():
                    if theme == "light" and name not in ("off-south", "on-south"):
                        continue
                    ctx, page, errs = open_page(browser, base, dev, theme, q)
                    st = page.evaluate("(() => { const s = window.__nightSky.state; return { lines: s.lines, art: s.art, names: s.names, theme: document.documentElement.dataset.theme }; })()")
                    check(st["theme"] == theme, f"{tag}/{theme}/{name}: theme {st['theme']}")
                    if name == "off-south":
                        check(not (st["lines"] or st["art"] or st["names"]), f"{tag}/{theme}: constellation toggles all off by default")
                    if name in ("off-south", "on-south", "ecliptic-planets"):
                        pitch = page.evaluate("window.__nightSky.getView().pitch") * 180 / 3.141592653589793
                        expect = 30 if tag == "phone-390" else 20
                        check(abs(pitch - expect) < 1, f"{tag}/{theme}/{name}: named look pitch {pitch:.1f} (want {expect})")
                    if name == "off-south" and tag == "desktop":
                        lab = page.evaluate("[...document.querySelectorAll('.ns-row-label')].map(e=>e.textContent).join('|')")
                        check("Season (about 10 PM)" in lab and "about, 10" not in lab, f"desktop Time sidebar label: {lab!r}")
                    if "art=1" in q:
                        page.wait_for_function("window.__nightSky.artStatus() === 'ready'", timeout=30000)
                        page.wait_for_timeout(400)
                    p = OUT / f"{tag}-{theme}-{name}.png"
                    page.screenshot(path=str(p))
                    sp = OUT / f"{tag}-{theme}-{name}-stage.png"
                    page.locator("#stage").screenshot(path=str(sp))
                    check(bright_pixels(sp) > 200, f"{tag}/{theme}/{name}: sky renders ({bright_pixels(sp)} bright px)")
                    ov = page.evaluate("document.documentElement.scrollWidth <= innerWidth + 1")
                    check(ov, f"{tag}/{theme}/{name}: no sideways overflow")
                    check(not errs, f"{tag}/{theme}/{name}: no console errors {errs[:3]}")
                    ctx.close()

            # interactions (dark)
            ctx, page, errs = open_page(browser, base, dev, "dark", f"{T1}&look=110,25")
            check(page.locator("#vrBtn").is_hidden() and page.locator("#vrNote").is_visible(), f"{tag}: no navigator.xr -> Enter VR hidden, note shown")
            pitch0 = page.evaluate("window.__nightSky.getView().pitch") * 180 / 3.141592653589793
            check(abs(pitch0 - 25) < 1, f"{tag}: explicit look=110,25 keeps pitch 25 (got {pitch0:.1f})")
            v0 = page.evaluate("window.__nightSky.getView().yaw")
            box = page.locator("#sky").bounding_box()
            cx, cy = box["x"] + box["width"] / 2, box["y"] + box["height"] / 2
            if dev["has_touch"]:
                cdp = ctx.new_cdp_session(page)
                def touch(kind, x, y):
                    cdp.send("Input.dispatchTouchEvent", {"type": kind, "touchPoints": [] if kind == "touchEnd" else [{"x": x, "y": y}]})
                touch("touchStart", cx, cy)
                for k in range(1, 11):
                    touch("touchMove", cx + 12 * k, cy)
                touch("touchEnd", 0, 0)
            else:
                page.mouse.move(cx, cy); page.mouse.down()
                for k in range(1, 11):
                    page.mouse.move(cx + 12 * k, cy)
                page.mouse.up()
            v1 = page.evaluate("window.__nightSky.getView().yaw")
            check(abs(v1 - v0) > 0.05, f"{tag}: drag-to-look turns the view ({v0:.3f} -> {v1:.3f} rad)")
            # tap Betelgeuse (HIP 27989): look toward it first
            page.evaluate("""(() => { const a = window.__nightSky, hor = a.altAzOf(5.9195, 7.407); a.setView({ yaw: -hor.az * Math.PI / 180, pitch: hor.alt * Math.PI / 180 }); })()""")
            page.wait_for_timeout(200)
            xy = star_xy(page, 27989)
            check(xy["visible"], f"{tag}: Betelgeuse on screen")
            if dev["has_touch"]:
                page.touchscreen.tap(xy["x"], xy["y"])
            else:
                page.mouse.click(xy["x"], xy["y"])
            page.wait_for_timeout(250)
            title = page.locator("#cardTitle").text_content() if page.locator("#card").is_visible() else ""
            check(title == "Betelgeuse", f"{tag}: tap a star opens its card ({title!r})")
            page.screenshot(path=str(OUT / f"{tag}-dark-card-betelgeuse.png"))
            if not dev["has_touch"]:
                page.keyboard.press("l")
                page.wait_for_timeout(150)
                check(page.evaluate("window.__nightSky.state.lines") and "lines=1" in page.url, f"{tag}: L key turns lines on and the URL follows")
            page.locator('[data-bid="tab-sky"]').click()
            page.locator('[data-bid="names"]').click()
            page.wait_for_timeout(150)
            check(page.evaluate("window.__nightSky.state.names") and "names=1" in page.url, f"{tag}: Names button toggles names and the URL follows")
            page.screenshot(path=str(OUT / f"{tag}-dark-sky-tab.png"))
            ser = page.evaluate("window.__nightSky.serialize()")
            check("names=1" in ser and "utc=2026-12-21T03:00Z" in ser, f"{tag}: share link carries the state ({ser[:80]})")
            check(not errs, f"{tag}: no console errors in interactions {errs[:3]}")
            ctx.close()

            # mocked WebXR
            ctx, page, errs = open_page(browser, base, dev, "dark", T1, init=XR_MOCK)
            check(page.locator("#vrBtn").is_visible() and page.locator("#vrNote").is_hidden(), f"{tag}: mocked immersive-vr support -> Enter VR shown")
            page.locator("#vrBtn").click()
            page.wait_for_timeout(300)
            calls = page.evaluate("window.__xrCalls")
            ok = calls and calls[0]["mode"] == "immersive-vr" and "local-floor" in calls[0]["init"]["optionalFeatures"] and "hand-tracking" in calls[0]["init"]["optionalFeatures"]
            check(bool(ok), f"{tag}: Enter VR calls requestSession('immersive-vr', local-floor + hand-tracking) {calls}")
            check("mock: no headset" in (page.locator("#vrNote").text_content() or "") and page.locator("#vrNote").is_visible(), f"{tag}: a failed session shows a note, not a crash")
            if tag == "desktop":
                page.screenshot(path=str(OUT / f"{tag}-dark-xr-mock.png"))
            ctx.close()

        # VR panel canvas (drawn off-headset for a look; the same draw path runs in the headset)
        ctx, page, errs = open_page(browser, base, DEVICES[0][1], "dark", f"{T1}&lines=1")
        for tab, pg in (("time", 0), ("time", 1), ("sky", 0), ("sky", 1), ("place", 0), ("help", 0), ("help", 1)):
            url = page.evaluate("""async ([tab, pg]) => { const m = await import('./night-sky/ns-vrpanel.js'); const a = window.__nightSky;
              const assets = await m.loadPanelAssets(new URL('./night-sky/', location.href)); const p = new m.VRPanel(a.THREE, assets);
              p.tab = tab; if (p.page[tab] !== undefined) p.page[tab] = pg; p.draw(a.state, { simMs: a.frame.simMs, artStatus: 'ready' });
              return p.canvas.toDataURL('image/png'); }""", [tab, pg])
            import base64
            (OUT / f"vrpanel-{tab}-{pg}.png").write_bytes(base64.b64decode(url.split(",", 1)[1]))
        check(not errs, f"vr panel draws without errors {errs[:3]}")
        ctx.close()

        # link check: every same-origin href/src on the page answers 200; external links are listed, not fetched
        ctx, page, errs = open_page(browser, base, DEVICES[0][1], "dark", T1)
        urls = page.evaluate("[...new Set([...document.querySelectorAll('[href],[src]')].map((e) => e.href || e.src).filter(Boolean))]")
        bad = []
        for u in urls:
            if not u.startswith(base):
                print("  external:", u)
                continue
            r = page.request.get(u)
            if r.status != 200:
                bad.append((u, r.status))
        check(not bad, f"links: {len(urls)} on the page, same-origin all 200 {bad}")
        ctx.close()

        # study library lists the module
        ctx = browser.new_context(); page = ctx.new_page()
        page.goto(f"{base}/study.html", wait_until="load")
        card = page.locator(".module-card", has_text="Night Sky VR")
        try:
            card.first.wait_for(timeout=15000)
            card.first.scroll_into_view_if_needed(); card.first.screenshot(path=str(OUT / "study-library-card.png"))
            has = True
        except Exception:
            has = False
        check(has, "study.html lists the Night Sky VR module card")
        ctx.close()
        browser.close()
        if httpd:
            httpd.shutdown()
    print(f"\n{passes} passed, {failures} failed. Shots in {OUT}")
    sys.exit(1 if failures else 0)


if __name__ == "__main__":
    main()
