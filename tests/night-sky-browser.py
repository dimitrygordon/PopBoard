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
AR_MOCK = """
window.__xrCalls = [];
Object.defineProperty(navigator, 'xr', { configurable: true, value: {
  isSessionSupported: async (mode) => mode === 'immersive-ar',
  requestSession: async (mode, init) => { window.__xrCalls.push({ mode, init }); throw new Error('mock: no ar'); },
  addEventListener() {}, removeEventListener() {},
}});
"""
BOTH_XR_MOCK = """
window.__xrCalls = [];
Object.defineProperty(navigator, 'xr', { configurable: true, value: {
  isSessionSupported: async (mode) => mode === 'immersive-vr' || mode === 'immersive-ar',
  requestSession: async (mode, init) => { window.__xrCalls.push({ mode, init }); throw new Error(mode === 'immersive-ar' ? 'mock: no ar' : 'mock: no headset'); },
  addEventListener() {}, removeEventListener() {},
}});
"""
LOOK_PERM = """
window.__lookPerm = [];
if (typeof DeviceOrientationEvent !== 'undefined') {
  DeviceOrientationEvent.requestPermission = async () => { window.__lookPerm.push('ask'); return 'granted'; };
}
"""


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



FIND_ORI = """() => {
  const a = window.__nightSky;
  const rec = a.catalog.constellations.constellations.find((c) => c.id === 'Ori');
  const ra = rec.labelRa * 15 * Math.PI / 180, dec = rec.labelDec * Math.PI / 180;
  const v0 = [Math.cos(dec) * Math.cos(ra), Math.cos(dec) * Math.sin(ra), Math.sin(dec)];
  const M = a.frame.M;
  const local = (v) => [M[0]*v[0]+M[1]*v[1]+M[2]*v[2], M[3]*v[0]+M[4]*v[1]+M[5]*v[2], M[6]*v[0]+M[7]*v[1]+M[8]*v[2]];
  const tryV = (v) => {
    const loc = local(v), info = a.pickLocal(loc);
    if (info && info.kind === 'constellation' && info.id === 'Ori') return { loc, info };
    return null;
  };
  let hit = tryV(v0);
  for (let k = 0; k < 16 && !hit; k++) {
    const ang = k * Math.PI / 8, off = 3 * Math.PI / 180;
    const axis = [Math.cos(ang), Math.sin(ang), 0];
    const n = [v0[1]*axis[2]-v0[2]*axis[1], v0[2]*axis[0]-v0[0]*axis[2], v0[0]*axis[1]-v0[1]*axis[0]];
    const nl = Math.hypot(...n) || 1, nn = [n[0]/nl, n[1]/nl, n[2]/nl];
    const ca = Math.cos(off), sa = Math.sin(off);
    const cr = [nn[1]*v0[2]-nn[2]*v0[1], nn[2]*v0[0]-nn[0]*v0[2], nn[0]*v0[1]-nn[1]*v0[0]];
    hit = tryV([v0[0]*ca+cr[0]*sa, v0[1]*ca+cr[1]*sa, v0[2]*ca+cr[2]*sa]);
  }
  if (!hit) return { ok: false };
  const loc = hit.loc, alt = Math.asin(Math.max(-1, Math.min(1, loc[1]))) * 180 / Math.PI;
  const az = (Math.atan2(loc[0], -loc[2]) * 180 / Math.PI + 360) % 360;
  a.setView({ yaw: -az * Math.PI / 180, pitch: alt * Math.PI / 180 });
  return { ok: true };
}"""


def constellation_card(browser, base, dev, tag):
    ctx, page, errs = open_page(browser, base, dev, "dark", f"{T1}&look=south&art=0&lines=0")
    found = page.evaluate(FIND_ORI)
    check(bool(found and found.get("ok")), f"{tag}: found a direction that picks Orion")
    page.wait_for_timeout(250)
    xy = page.evaluate("""() => { const r = document.getElementById('sky').getBoundingClientRect(); return { x: r.left + r.width/2, y: r.top + r.height/2 }; }""")
    kind = page.evaluate("([x,y]) => { const i = window.__nightSky.pickAt(x,y); return i && { kind: i.kind, title: i.title, id: i.id }; }", [xy["x"], xy["y"]])
    check(kind and kind.get("kind") == "constellation" and kind.get("id") == "Ori", f"{tag}: view center is a constellation pick of Orion ({kind})")
    if dev["has_touch"]:
        page.touchscreen.tap(xy["x"], xy["y"])
    else:
        page.mouse.click(xy["x"], xy["y"])
    page.wait_for_timeout(350)
    title = page.locator("#cardTitle").text_content() if page.locator("#card").is_visible() else ""
    check(title == "Orion", f"{tag}: selecting Orion opens a constellation card ({title!r})")
    common = page.locator("#cardCommon").text_content() if page.locator("#cardCommon").is_visible() else ""
    check(common == "Hunter", f"{tag}: Orion card shows the common name ({common!r})")
    page.wait_for_function("window.__nightSky.focusArtAlpha() > 0.25 || window.__nightSky.artStatus() === 'error'", timeout=30000)
    page.wait_for_timeout(400)
    check(page.evaluate("window.__nightSky.focusId()") == "Ori", f"{tag}: selected figure is focused")
    check(page.evaluate("window.__nightSky.focusArtAlpha()") > 0.25, f"{tag}: constellation art faded in with the art layer off")
    check(not page.evaluate("window.__nightSky.state.art"), f"{tag}: global art toggle stays off")
    page.screenshot(path=str(OUT / f"{tag}-dark-card-orion.png"))
    page.locator("#stage").screenshot(path=str(OUT / f"{tag}-dark-card-orion-stage.png"))
    check(not errs, f"{tag}: no console errors in constellation pick {errs[:3]}")
    ctx.close()


def look_around_mode(browser, base, dev, tag):
    ctx, page, errs = open_page(browser, base, dev, "dark", f"{T1}&look=south", init=NO_XR + "\n" + LOOK_PERM)
    check(page.locator("#lookBtn").is_visible(), f"{tag}: Look around is shown when orientation permission API is present")
    page.locator("#lookBtn").click()
    page.wait_for_timeout(200)
    perms = page.evaluate("window.__lookPerm")
    check(isinstance(perms, list) and "ask" in perms, f"{tag}: Look around asks DeviceOrientationEvent.requestPermission from the tap ({perms})")
    check(page.evaluate("window.__nightSky.getLookAround().active") and page.locator("#crosshair").is_visible(), f"{tag}: Look around starts and shows the crosshair")
    page.evaluate("""() => { const a = window.__nightSky; for (let i = 0; i < 16; i++) a.ingestOrientation({ alpha: 180, beta: 90, gamma: 0, absolute: true }); }""")
    page.wait_for_timeout(250)
    pose = page.evaluate("""() => {
      const a = window.__nightSky, d = new a.THREE.Vector3(0,0,-1).transformDirection(a.camera.matrixWorld);
      const alt = Math.asin(Math.max(-1, Math.min(1, d.y))) * 180 / Math.PI;
      const az = (Math.atan2(d.x, -d.z) * 180 / Math.PI + 360) % 360;
      return { alt, az, mode: a.getLookAround().mode, note: a.getLookAround().note };
    }""")
    daz = min(abs(pose["az"] - 180), 360 - abs(pose["az"] - 180))
    check(pose["mode"] == "compass" and not pose["note"] and daz < 8 and abs(pose["alt"]) < 8, f"{tag}: absolute orientation faces south ({pose})")
    box = page.locator("#sky").bounding_box()
    cx, cy = box["x"] + box["width"] / 2, box["y"] + box["height"] / 2
    yaw0 = page.evaluate("window.__nightSky.getView().yaw")
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
    yaw1 = page.evaluate("window.__nightSky.getView().yaw")
    check(abs(yaw1 - yaw0) > 0.05, f"{tag}: drag still works in look-around ({yaw0:.3f} -> {yaw1:.3f})")
    page.screenshot(path=str(OUT / f"{tag}-dark-look-around.png"))
    page.locator("#lookBtn").click()
    page.wait_for_timeout(150)
    page.locator("#lookBtn").click()
    page.wait_for_timeout(150)
    page.evaluate("""() => { const a = window.__nightSky; for (let i = 0; i < 8; i++) a.ingestOrientation({ alpha: 20, beta: 90, gamma: 0, absolute: false }); }""")
    page.wait_for_timeout(150)
    rel = page.evaluate("window.__nightSky.getLookAround()")
    check(rel["mode"] == "relative" and "not aligned to north" in (rel["note"] or ""), f"{tag}: relative orientation shows a note ({rel})")
    check(page.locator("#lookNote").is_visible(), f"{tag}: relative-mode note is visible")
    check(not errs, f"{tag}: no console errors in look-around {errs[:3]}")
    ctx.close()


def ar_and_sensorless(browser, base):
    # AR only: the See my room toggle is shown, Enter starts immersive-ar even with the toggle off (no VR to default to).
    ctx, page, errs = open_page(browser, base, DEVICES[0][1], "dark", T1, init=AR_MOCK)
    check(page.locator("#arBtn").is_visible(), "mocked immersive-ar support -> See my room toggle shown")
    check(page.locator("#vrBtn").is_visible(), "AR-only: Enter button is shown so a session can start")
    page.locator("#arBtn").click()
    page.wait_for_timeout(200)
    check(page.evaluate("window.__nightSky.seeRoom") is True, "See my room toggle turns the flag on")
    check((page.locator("#arBtn").get_attribute("aria-pressed") == "true"), "See my room is pressed")
    check(page.evaluate("window.__xrCalls") == [], "the toggle itself does not start a session")
    page.locator("#vrBtn").click()
    page.wait_for_timeout(300)
    calls = page.evaluate("window.__xrCalls")
    check(bool(calls and calls[0]["mode"] == "immersive-ar"), f"Enter with See my room (or AR-only) requests immersive-ar {calls}")
    check("mock: no ar" in (page.locator("#vrNote").text_content() or ""), "a failed AR session shows a note, not a crash")
    ctx.close()

    # Both modes: VR stays the default; the toggle selects AR, then Enter requests immersive-ar.
    ctx, page, errs = open_page(browser, base, DEVICES[0][1], "dark", T1, init=BOTH_XR_MOCK)
    check(page.locator("#vrLabel").text_content() == "Enter VR", "both modes, toggle off: Enter VR is the default")
    check(page.locator("#arBtn").is_visible() and page.locator("#arBtn").get_attribute("aria-pressed") == "false", "See my room starts off")
    page.locator("#vrBtn").click()
    page.wait_for_timeout(250)
    calls = page.evaluate("window.__xrCalls")
    check(bool(calls and calls[0]["mode"] == "immersive-vr"), f"default Enter requests immersive-vr {calls}")
    page.evaluate("window.__xrCalls = []")
    page.locator("#arBtn").click()
    page.wait_for_timeout(200)
    check(page.evaluate("window.__nightSky.seeRoom") is True and page.locator("#vrLabel").text_content() == "Enter AR", "toggle on relabels the enter button to Enter AR")
    # The Sky tab also lists the toggle.
    page.locator('[data-bid="tab-sky"]').click()
    check(page.locator('[data-bid="seeRoom"]').is_visible(), "Sky panel lists See my room when AR is supported")
    check(page.locator('[data-bid="ground0"]').inner_text() == "Faded", "ground option is labelled Faded")
    check(page.locator('[data-bid="ground1"]').is_disabled() and page.locator('[data-bid="ground0"]').is_disabled(), "Ground is locked while See my room is on")
    check(page.locator('[data-bid="sky-real"]').is_disabled() and page.locator('[data-bid="sky-night"]').is_disabled(), "Night and Daylight are locked while See my room is on")
    page.locator("#vrBtn").click()
    page.wait_for_timeout(300)
    calls = page.evaluate("window.__xrCalls")
    check(bool(calls and calls[-1]["mode"] == "immersive-ar"), f"Enter after See my room requests immersive-ar {calls}")
    page.screenshot(path=str(OUT / "desktop-dark-see-my-room.png"))
    ctx.close()

    ctx, page, errs = open_page(browser, base, DEVICES[0][1], "dark", T1, init=NO_XR)
    check(page.locator("#lookBtn").is_hidden(), "desktop without orientation sensors: Look around hidden")
    check(page.locator("#arBtn").is_hidden(), "no immersive-ar: See my room hidden")
    ctx.close()


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
            common = page.locator("#cardCommon").text_content() if page.locator("#cardCommon").is_visible() else ""
            check("Ori" in (common or ""), f"{tag}: Betelgeuse card shows the catalog name ({common!r})")
            page.screenshot(path=str(OUT / f"{tag}-dark-card-betelgeuse.png"))
            # The card sits next to the star, so a second pointer event can hit the card instead of the canvas.
            page.evaluate("([x,y]) => window.__nsSelectAt(x,y)", [xy["x"], xy["y"]])
            page.wait_for_timeout(150)
            check(page.locator("#card").is_hidden(), f"{tag}: second tap on the same star closes the card")
            page.evaluate("([x,y]) => window.__nsSelectAt(x,y)", [xy["x"], xy["y"]])
            page.wait_for_timeout(150)
            check(page.locator("#card").is_visible() and page.locator("#cardTitle").text_content() == "Betelgeuse", f"{tag}: tap again reopens the card")
            page.locator("#cardClose").click()
            page.wait_for_timeout(150)
            check(page.locator("#card").is_hidden(), f"{tag}: the card close button hides it")
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
            check(page.locator("#arBtn").is_hidden(), f"{tag}: See my room hidden when immersive-ar is unsupported")
            page.locator("#vrBtn").click()
            page.wait_for_timeout(300)
            calls = page.evaluate("window.__xrCalls")
            ok = calls and calls[0]["mode"] == "immersive-vr" and "local-floor" in calls[0]["init"]["optionalFeatures"] and "hand-tracking" in calls[0]["init"]["optionalFeatures"]
            check(bool(ok), f"{tag}: Enter VR calls requestSession('immersive-vr', local-floor + hand-tracking) {calls}")
            check("mock: no headset" in (page.locator("#vrNote").text_content() or "") and page.locator("#vrNote").is_visible(), f"{tag}: a failed session shows a note, not a crash")
            if tag == "desktop":
                page.screenshot(path=str(OUT / f"{tag}-dark-xr-mock.png"))
            ctx.close()

            constellation_card(browser, base, dev, tag)
            if tag == "phone-390":
                look_around_mode(browser, base, dev, tag)

        ar_and_sensorless(browser, base)

        # VR panel canvas (drawn off-headset for a look; the same draw path runs in the headset).
        # Sky pages always pass arSupported so See my room is visible (Leo art pass AR-1).
        ctx, page, errs = open_page(browser, base, DEVICES[0][1], "dark", f"{T1}&lines=1")
        import base64

        def draw_panel(tab, pg, info, fname):
            out = page.evaluate("""async ([tab, pg, info]) => { const m = await import('./night-sky/ns-vrpanel.js'); const a = window.__nightSky;
              const assets = await m.loadPanelAssets(new URL('./night-sky/', location.href)); const p = new m.VRPanel(a.THREE, assets);
              p.tab = tab; if (p.page[tab] !== undefined) p.page[tab] = pg;
              p.draw(a.state, Object.assign({ simMs: a.frame.simMs, artStatus: 'ready' }, info));
              return { png: p.canvas.toDataURL('image/png'), hits: p.hits.map((h) => ({ id: h.id, x: h.x, y: h.y, w: h.w, h: h.h })) };
            }""", [tab, pg, info])
            (OUT / fname).write_bytes(base64.b64decode(out["png"].split(",", 1)[1]))
            return out["hits"]

        for tab, pg in (("time", 0), ("time", 1), ("sky", 0), ("sky", 1), ("place", 0), ("help", 0), ("help", 1)):
            info = {"arSupported": True, "seeRoom": False} if tab == "sky" else {}
            draw_panel(tab, pg, info, f"vrpanel-{tab}-{pg}.png")

        hits0 = draw_panel("sky", 0, {"arSupported": True, "seeRoom": True}, "vrpanel-sky-0-ar.png")
        by_id = {h["id"]: h for h in hits0}
        check(by_id.get("helpoff") == {"id": "helpoff", "x": 40, "y": 736, "w": 944, "h": 112}, f"Help off at 40,736 944x112 {by_id.get('helpoff')}")
        check(by_id.get("seeRoom") == {"id": "seeRoom", "x": 40, "y": 860, "w": 800, "h": 112}, f"See my room at 40,860 800x112 {by_id.get('seeRoom')}")
        check(by_id.get("next") == {"id": "next", "x": 856, "y": 870, "w": 128, "h": 92}, f"next arrow at 856,870 128x92 {by_id.get('next')}")

        hits1 = draw_panel("sky", 1, {"arSupported": True, "seeRoom": True}, "vrpanel-sky-1-ar.png")
        by_id = {h["id"]: h for h in hits1}
        check(by_id.get("reset") and by_id["reset"]["x"] == 40 and by_id["reset"]["w"] == 330, f"Reset is 330 px at x 40 {by_id.get('reset')}")
        check(by_id.get("vignette") and by_id["vignette"]["x"] == 382 and by_id["vignette"]["w"] == 330, f"Vignette is 330 px at x 382 {by_id.get('vignette')}")
        check("seeRoom" not in by_id, "See my room is not on Sky page 2")
        check("ground1" not in by_id and "ground0" not in by_id and "sky-real" not in by_id, f"Ground and Daylight have no hits when See my room is on {[k for k in by_id if k in ('ground1','ground0','sky-real','planets')]}")
        check("planets" in by_id, "Planets stays enabled in passthrough")
        check(not errs, f"vr panel draws without errors {errs[:3]}")
        ctx.close()

        # Passthrough over a light/cream background (test hook; no real XR session)
        ctx, page, errs = open_page(browser, base, DEVICES[0][1], "dark", PRESETS["on-south"])
        page.wait_for_function("window.__nightSky.artStatus() === 'ready'", timeout=30000)
        page.evaluate("window.__nightSky.setPassthroughPreview(true, '#f3ead8')")
        page.wait_for_timeout(600)
        check(page.evaluate("window.__nightSky.frame.passthrough") is True, "passthrough preview flag is on")
        check(page.evaluate("window.__nightSky.frame.starMinPx") == 3.6, "passthrough min star size is 3.6")
        check(page.evaluate("window.__nightSky.frame.lineWidthPx") == 3.2, "passthrough line width is 3.2")
        page.screenshot(path=str(OUT / "passthrough-over-light.png"))
        page.locator("#stage").screenshot(path=str(OUT / "passthrough-over-light-stage.png"))
        check(bright_pixels(OUT / "passthrough-over-light-stage.png") > 200, f"passthrough-over-light renders ({bright_pixels(OUT / 'passthrough-over-light-stage.png')} bright px)")
        check(not errs, f"passthrough-over-light: no console errors {errs[:3]}")
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
