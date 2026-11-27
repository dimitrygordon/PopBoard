#!/usr/bin/env python3
"""Playwright checks for Newton's Mountain VR (desktop 1280, phone 390).
Defaults, FIRE, the bracket lines, view switch, URL round trip, shots= preload, help levels, the VR panel canvas,
Enter VR and AR with a mocked navigator.xr, the no-WebXR page, console errors, screenshots.
NM_BASE runs against a deployed site (a Pages preview). NM_OUT sets the screenshot folder.
Cannot test here: a real WebXR session, controllers, hands, haptics, passthrough, hit-test, headset frame rate, phone sensors.
Those need a Quest 3 (VR, AR) or an Android phone (phone AR)."""
from __future__ import annotations

import base64
import http.server
import os
import socketserver
import sys
import threading
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1] / "public"
OUT = Path(os.environ.get("NM_OUT", "/workspace/nm-shots/browser"))
OUT.mkdir(parents=True, exist_ok=True)
REMOTE_BASE = os.environ.get("NM_BASE", "").rstrip("/")
UA = ("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 "
      "(KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1")
DEVICES = (
    ("desktop", dict(viewport={"width": 1280, "height": 800}, device_scale_factor=1, is_mobile=False, has_touch=False)),
    ("phone-390", dict(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True, user_agent=UA)),
)
MIME = {".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
        ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp",
        ".woff2": "font/woff2", ".bin": "application/octet-stream", ".md": "text/markdown; charset=utf-8", ".glb": "model/gltf-binary"}
NO_XR = "Object.defineProperty(navigator, 'xr', { configurable: true, value: undefined });"
XR_MOCK = """
window.__xrCalls = [];
Object.defineProperty(navigator, 'xr', { configurable: true, value: {
  isSessionSupported: async (mode) => mode === 'immersive-vr' || (window.__arOk === true && mode === 'immersive-ar'),
  requestSession: async (mode, init) => { window.__xrCalls.push({ mode, init }); throw new Error('mock: no headset'); },
  addEventListener() {}, removeEventListener() {},
}});
"""
AR_MOCK = XR_MOCK.replace("window.__xrCalls = [];", "window.__xrCalls = []; window.__arOk = true;")


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


def open_page(browser, base, dev, query="", init=NO_XR, theme="dark"):
    ctx = browser.new_context(color_scheme=theme, **dev)
    ctx.add_init_script(init)
    page = ctx.new_page()
    errs = []
    page.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: errs.append(str(e)))
    page.on("requestfailed", lambda r: errs.append("requestfailed " + r.url))
    page.goto(f"{base}/study-newtons-mountain.html?{query}", wait_until="load")
    page.wait_for_function("window.__nm && document.getElementById('status').textContent === ''", timeout=90000)
    page.wait_for_timeout(500)
    return ctx, page, errs


def rows(page):
    return page.evaluate("window.__nm.model().rows")


def run_seconds(page, s):
    page.evaluate(f"window.__nm.stepSeconds({s})")


def main():
    global failures
    server = None
    if REMOTE_BASE:
        base = REMOTE_BASE
    else:
        socketserver.TCPServer.allow_reuse_address = True
        server = socketserver.ThreadingTCPServer(("127.0.0.1", 0), Handler)
        threading.Thread(target=server.serve_forever, daemon=True).start()
        base = f"http://127.0.0.1:{server.server_address[1]}"
    with sync_playwright() as p:
        browser = p.chromium.launch(args=["--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist", "--enable-unsafe-swiftshader"])
        for name, dev in DEVICES:
            ctx, page, errs = open_page(browser, base, dev)
            check(page.evaluate("window.__nm.model().speed") == 2000, f"{name}: default speed 2,000 m/s")
            check(page.evaluate("window.__nm.state.h") == 150 and page.evaluate("window.__nm.state.view") == "mountain", f"{name}: default 150 km, Mountain view")
            check(page.evaluate("document.documentElement.scrollWidth") <= dev["viewport"]["width"], f"{name}: no horizontal scroll")
            check(page.locator("#panel .ns-tab").count() == 4, f"{name}: four tabs")
            page.wait_for_function("window.__nm.debug().assets.earth !== 'none'", timeout=30000)
            check(page.evaluate("window.__nm.debug().assets.earth") == "earth_2k.glb", f"{name}: Earth map loaded from the Gravity and Orbits model")
            page.screenshot(path=str(OUT / f"{name}-default.png"))
            # FIRE, then a landing
            page.click("#fireBtn")
            check(len(rows(page)) == 1, f"{name}: FIRE adds one shot")
            run_seconds(page, 2000)
            r = rows(page)[0]
            check(r["state"] == "landed", f"{name}: 2,000 m/s lands")
            page.screenshot(path=str(OUT / f"{name}-landed.png"))
            # bracket: 7,000 lands, 7,807 does not
            page.evaluate("window.__nm.dispatch({type:'setSpeed', v:7000}); window.__nm.dispatch({type:'fire'})")
            page.evaluate("window.__nm.dispatch({type:'setSpeed', v:7807}); window.__nm.dispatch({type:'fire'})")
            run_seconds(page, 7000)
            rs = rows(page)
            check([x["state"] for x in rs[1:]] == ["landed", "lapped"], f"{name}: 7,000 lands, 7,807 does not ({[x['state'] for x in rs[1:]]})")
            br = page.evaluate("window.__nm.model().bracket")
            check(any("7,000" in l for l in br) and any("7,807" in l for l in br) and not any("gap" in l.lower() for l in br), f"{name}: bracket lines {br}")
            check(page.evaluate("window.__nm.model().between.line1") == "Between your shots: 807 m/s", f"{name}: Between your shots 807 m/s")
            # clear and the ninth shot
            page.evaluate("window.__nm.dispatch({type:'clear'})")
            check(len(rows(page)) == 0, f"{name}: Clear removes every shot")
            page.evaluate("for (let i=0;i<9;i++) window.__nm.dispatch({type:'fire'})")
            check(len(rows(page)) == 8, f"{name}: the ninth shot removes the oldest (8 kept)")
            page.evaluate("window.__nm.dispatch({type:'clear'})")
            # keyboard
            page.evaluate("window.__nm.dispatch({type:'setSpeed', v:2000})")
            page.keyboard.press("ArrowUp")
            check(page.evaluate("window.__nm.model().speed") == 2010, f"{name}: Up arrow adds 10 m/s")
            page.keyboard.press("f")
            check(len(rows(page)) == 1, f"{name}: F fires")
            page.keyboard.press("c")
            # view switch and URL round trip
            page.keyboard.press("m")
            check(page.evaluate("window.__nm.state.view") == "model", f"{name}: M switches to Model view")
            page.wait_for_timeout(400)
            page.screenshot(path=str(OUT / f"{name}-model.png"))
            q = page.evaluate("window.__nm.serialize()")
            check("view=model" in q, f"{name}: serialize keeps view ({q})")
            check(not errs, f"{name}: no console errors ({errs[:3]})")
            ctx.close()
        # shots= preload, help levels, constants
        dev = DEVICES[0][1]
        ctx, page, errs = open_page(browser, base, dev, "shots=7000,7807,9000&view=model&help=2&h=400&rings=iss,geo&mass=1000&air=1&lock=speed")
        check(len(rows(page)) == 3, "preload: shots= creates 3 shots")
        check(page.evaluate("window.__nm.state.view") == "model" and page.evaluate("window.__nm.state.h") == 400, "preload: view and height from the link")
        check(page.evaluate("window.__nm.state.lock.includes('speed')"), "lock=speed is kept")
        page.evaluate("window.__nm.dispatch({type:'speedStep', delta: 100})")
        check(page.evaluate("window.__nm.model().speed") == 2000, "lock=speed blocks speed changes")
        q = page.evaluate("window.__nm.serialize()")
        check(all(k in q for k in ("shots=7000,7807,9000", "h=400", "rings=iss,geo", "mass=1000", "air=1", "lock=speed")), f"URL round trip ({q})")
        page.wait_for_timeout(500)
        page.screenshot(path=str(OUT / "desktop-model-rings.png"))
        check(not errs, f"preload page: no console errors ({errs[:3]})")
        ctx.close()
        ctx, page, errs = open_page(browser, base, dev, "shots=11100,7807&help=0")
        txt = " ".join(page.evaluate("window.__nm.model().rows.map(r => r.state)")) + " " + " ".join(page.evaluate("window.__nm.model().detailFull"))
        check("escape" not in txt.lower() and "in orbit" not in txt.lower(), "help=0 hides the escape and orbit words")
        page.evaluate("window.__nm.dispatch({type:'select', n:1})")
        d0 = " ".join(page.evaluate("window.__nm.model().detailFull")).lower()
        check("escape" not in d0 and "in orbit" not in d0, "help=0 card has no circular or escape labels")
        ctx.close()
        ctx, page, errs = open_page(browser, base, dev, "shots=11100,7807&help=2")
        page.evaluate("window.__nm.dispatch({type:'select', n:1})")
        d2 = " ".join(page.evaluate("window.__nm.model().detailFull")).lower()
        check("escape" in d2 or "left" in d2 or "in orbit" in d2, "help=2 adds the orbit or escape label")
        ctx.close()
        # Between your shots: the card and the model, hide and show rule, banned words at help 0 and 1, circular speed at help 2
        for level in (0, 1, 2):
            ctx, page, errs = open_page(browser, base, dev, f"shots=7000&help={level}")
            check(page.evaluate("window.__nm.model().between") is None, f"help={level}: Between your shots hidden with only a landed shot")
            page.evaluate("window.__nm.dispatch({type:'select', n:1})")
            page.wait_for_timeout(400)
            check("Between your shots" not in page.inner_text("#card"), f"help={level}: card hides it with only a landed shot")
            page.evaluate("window.__nm.dispatch({type:'setSpeed', v:7807}); window.__nm.dispatch({type:'fire'})")
            run_seconds(page, 60)  # past one lap, still flying
            page.evaluate("window.__nm.dispatch({type:'select', n:2})")
            page.wait_for_timeout(500)
            bt = page.evaluate("window.__nm.model().between")
            check(bt is not None and bt["line1"] == "Between your shots: 807 m/s" and bt["line2"] == "highest that landed vs. lowest that didn't", f"help={level}: Between your shots shows once one landed and one did not ({bt})")
            card = page.text_content("#card") or ""
            check("Between your shots: 807 m/s" in card and "highest that landed vs. lowest that didn't" in card, f"help={level}: the shot card shows both lines")
            page.click("#panel .ns-tab[data-tab=shots]")
            panel_text = page.inner_text("#panel")
            check("Between your shots: 807 m/s" in panel_text, f"help={level}: the Shots tab shows it")
            scope = card + " " + page.inner_text("#betweenRow")
            if level < 2:
                check(not any(w in scope.lower() for w in ("gap", "orbit speed", "target", "circular")), f"help={level}: no banned words in the element")
            else:
                check("Circular speed here: 7,807 m/s" in scope, "help=2: circular speed shown next to it")
            lt = page.evaluate("window.__nm.model().levelTwo"); page.evaluate("window.__nm.panelImage('shots', 0)"); pc = page.evaluate("window.__nm.panel.pageCount('shots')")
            check((len(lt) == 2 and pc == 3) if level == 2 else (lt == [] and pc == 2), f"help={level}: Shots VR pages {pc}, Explain-level fall check lines {len(lt)}")
            for pg in range(pc):
                data = page.evaluate(f"window.__nm.panelImage('shots', {pg})")
                f = OUT / f"vr-panel-shots{pg}-help{level}.png"; f.write_bytes(base64.b64decode(data.split(",", 1)[1]))
            ctx.close()
        # Model view: the marker is hidden behind the globe and the surface under it is the cannon longitude
        ctx, page, errs = open_page(browser, base, dev, "view=model&h=150")
        res = page.evaluate("""async () => { const a = window.__nm, out = {};
          for (const yaw of [Math.PI / 2, -Math.PI / 2]) { a.setView({ yaw, pitch: 0.3 }); await new Promise((r) => setTimeout(r, 500)); out[yaw] = { vis: a.world.marker.visible, glow: a.world.markerGlow.visible, cam: a.camera.position.x - a.debug().centre[0] }; }
          return out; }""")
        vis = [v for v in res.values() if v["vis"]]
        check(len(vis) == 1 and vis[0]["cam"] > 0 and all(v["glow"] == v["vis"] for v in res.values()), f"marker is visible only when the camera is on its side ({res})")
        a_tex = page.evaluate("""async () => { const a = window.__nm, u = a.world.earth.material.uniforms; await a.world.assetsReady; const img = u.uDay.value.image; const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const g = c.getContext('2d'); g.drawImage(img, 0, 0);
          const px = (lon, lat) => { const d = g.getImageData(Math.floor((lon / 360 + 0.5) * (c.width - 1)), Math.floor((0.5 - lat / 180) * (c.height - 1)), 1, 1).data; return [d[0], d[1], d[2]]; };
          return { atlantic: px(-40, 30), africa: px(20, 5), pacific: px(-150, 0), sahara: px(15, 23) }; }""")
        ocean = lambda p: p[2] > p[0] + 25
        check(ocean(a_tex["atlantic"]) and ocean(a_tex["pacific"]) and not ocean(a_tex["africa"]) and not ocean(a_tex["sahara"]), f"texture u = 0.5 + lon/360: Atlantic at the cannon longitude is ocean, Africa is land ({a_tex})")
        # Model scale: the Earth shader's edge anti-aliasing must not leak a ghost Earth across the sky (it did when the AA floor was in metres squared)
        page.evaluate("window.__nm.setView({ yaw: -Math.PI / 2, pitch: 0.3 })"); page.wait_for_timeout(600)
        from PIL import Image
        import io
        im = Image.open(io.BytesIO(page.screenshot(clip={"x": 0, "y": 60, "width": 200, "height": 180}))).convert("L")
        mean = sum(i * c for i, c in enumerate(im.histogram())) / (im.width * im.height)
        check(mean < 12, f"Model view: the sky beside the globe is black (mean {mean:.1f})")
        ctx.close()
        # VR panel canvas (what the headset shows), every tab
        ctx, page, errs = open_page(browser, base, dev, "shots=7000,7807,9000&help=2&rings=iss")
        for tab, pg in (("launch", 0), ("shots", 0), ("view", 0), ("view", 1), ("help", 1)):
            data = page.evaluate(f"window.__nm.panelImage('{tab}', {pg})")
            f = OUT / f"vr-panel-{tab}{pg}.png"
            f.write_bytes(base64.b64decode(data.split(",", 1)[1]))
            check(f.stat().st_size > 20000, f"VR panel canvas draws {tab} page {pg}")
        ctx.close()
        # XR: none, VR only, VR + AR
        ctx, page, errs = open_page(browser, base, dev, "", NO_XR)
        check(page.is_hidden("#vrBtn") and page.is_hidden("#arBtn"), "no WebXR: Enter VR and AR hidden, page still works")
        check(page.is_visible("#vrNote"), "no WebXR: headset note shown")
        ctx.close()
        ctx, page, errs = open_page(browser, base, dev, "", XR_MOCK)
        check(page.is_visible("#vrBtn") and page.is_hidden("#arBtn"), "VR only: Enter VR visible, AR hidden")
        page.click("#vrBtn")
        page.wait_for_timeout(500)
        calls = page.evaluate("window.__xrCalls")
        check(len(calls) == 1 and calls[0]["mode"] == "immersive-vr", f"Enter VR requests immersive-vr ({calls})")
        check(page.is_visible("#vrNote") and "mock: no headset" in page.inner_text("#vrNote"), "a failed session shows the reason")
        check(page.evaluate("window.__nm.hitTestOk") is False, "no hit-test source without a session (reticle hidden, globe goes 0.6 m ahead)")
        ctx.close()
        ctx, page, errs = open_page(browser, base, dev, "", AR_MOCK)
        check(page.is_visible("#arBtn"), "AR supported: See my room visible")
        page.click("#arBtn")
        page.wait_for_timeout(300)
        page.click("#vrBtn")
        page.wait_for_timeout(500)
        calls = page.evaluate("window.__xrCalls")
        check(any(c["mode"] == "immersive-ar" for c in calls), f"AR requests immersive-ar ({[c['mode'] for c in calls]})")
        ar = [c for c in calls if c["mode"] == "immersive-ar"]
        feats = (ar[0]["init"].get("optionalFeatures") or []) + (ar[0]["init"].get("requiredFeatures") or []) if ar else []
        check("hit-test" in feats and "dom-overlay" in feats, f"AR asks for hit-test and dom-overlay ({feats})")
        check("hit-test" not in ((ar[0]["init"].get("requiredFeatures") or []) if ar else []), "hit-test is optional, so unsupported devices still get AR")
        ctx.close()
        browser.close()
    if server:
        server.shutdown()
    print(f"{passes} passed, {failures} failed")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
