"""Stellar Life Cycle VR in headless Chromium (software GL).
Checks: loads at 1280x800 and 390x844 with no console errors; per mass screenshots at the end of the main sequence,
the giant peak and the remnant; star centre colours lie on the temperatureToSRGB hue (tint plus white only); Enter VR
hidden without navigator.xr and calling requestSession("immersive-vr") with a mocked navigator.xr; links in and out.
Cannot test here: a real WebXR session, controllers, hands, the headset panel in use, Quest frame rate.
Usage: python3 stellar-life-browser.py [base_url] (default http://localhost:8765). Shots: /workspace/vr-stellar/build-shots/."""
import sys, json, math, pathlib, urllib.request
from playwright.sync_api import sync_playwright
from PIL import Image

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8765"
OUT = pathlib.Path("/workspace/vr-stellar/build-shots"); OUT.mkdir(parents=True, exist_ok=True)
ARGS = ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--no-sandbox"]
CHROME = "/usr/bin/google-chrome"
FRAMES = {   # mass: [(label, stage, t)]
    "0.2": [("end-ms", "R1", 1.0), ("giant-peak", "R2", 0.45), ("remnant", "R3", 1.0)],
    "1": [("end-ms", "S1", 1.0), ("giant-peak", "S5", 0.97), ("remnant", "S7", 1.0)],
    "3": [("end-ms", "T1", 1.0), ("giant-peak", "T5", 0.97), ("remnant", "T6", 1.0)],
    "15": [("end-ms", "H1", 1.0), ("giant-peak", "H2", 1.0), ("remnant", "H6", 1.0)],
    "40": [("end-ms", "V1", 1.0), ("giant-peak", "V2", 1.0), ("remnant", "V6", 1.0)],
}
HUE = {("0.2", "R1"), ("1", "S1"), ("1", "S5"), ("3", "T1"), ("3", "T5"), ("15", "H1"), ("15", "H2"), ("40", "V1"), ("40", "V2")}
XR_MOCK = """window.__xrCalls = []; Object.defineProperty(navigator, 'xr', { configurable: true, value: {
  isSessionSupported: async (mode) => mode === 'immersive-vr',
  requestSession: async (mode, init) => { window.__xrCalls.push({ mode, init }); throw new Error('mock: no headset'); },
  addEventListener() {}, removeEventListener() {} } });"""
NO_XR = "Object.defineProperty(navigator, 'xr', { configurable: true, value: undefined });"
fails = []; notes = []
def check(ok, msg):
    print(("PASS " if ok else "FAIL ") + msg)
    if not ok: fails.append(msg)

def dec(c): c = c / 255; return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

def hue_residual(rgb, tint):
    """Fit linear rgb = a*tint + b*white (a, b >= 0); return the residual relative to the brightest channel."""
    x = [dec(v) for v in rgb]; t = [dec(v) for v in tint]
    best = (1e9, 0, 0)
    for i in range(0, 201):
        b = max(x) * i / 200
        r = [x[k] - b for k in range(3)]
        a = max(0.0, sum(r[k] * t[k] for k in range(3)) / (sum(tk * tk for tk in t) or 1))
        e = math.sqrt(sum((r[k] - a * t[k]) ** 2 for k in range(3)))
        if e < best[0]: best = (e, a, b)
    return best[0] / (max(x) or 1), best

def open_page(br, w, h, init, query="manual=1&shot=1", mobile=False):
    ctx = br.new_context(viewport={"width": w, "height": h}, device_scale_factor=1, is_mobile=mobile, has_touch=mobile)
    ctx.add_init_script(init); pg = ctx.new_page(); errs = []
    pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(f"{BASE}/study-stellar-life.html?{query}"); pg.wait_for_function("window.__stellar && window.__stellar.flow", timeout=30000)
    pg.evaluate("__stellar.renderAt(1)"); return ctx, pg, errs

with sync_playwright() as p:
    br = p.chromium.launch(executable_path=CHROME, args=ARGS)
    counts = {}
    for (w, h, mobile) in [(1280, 800, False), (390, 844, True)]:
        tag = f"{w}x{h}"
        ctx, pg, errs = open_page(br, w, h, NO_XR, mobile=mobile)
        check(pg.locator("#slVR").is_hidden() and pg.locator("#slVRNote").is_visible(), f"{tag}: no navigator.xr, Enter VR hidden and the note shown")
        pg.screenshot(path=str(OUT / f"{tag}-hub.png"))
        sw = pg.evaluate("document.documentElement.scrollWidth"); check(sw <= w, f"{tag}: no sideways scroll ({sw})")
        for m, frames in FRAMES.items():
            for (lab, sid, t) in frames:
                pg.evaluate(f"__stellar.goto('{m}', '{sid}', {t})"); pg.evaluate("__stellar.renderAt(3)"); pg.evaluate("__stellar.renderAt(3.05)")
                f = OUT / f"{tag}-{m.replace('.', 'p')}-{lab}-{sid}.png"; pg.screenshot(path=str(f))
                counts[f"{m} {sid}"] = pg.evaluate("__stellar.info()")
                if w == 1280 and (m, sid) in HUE:
                    c = pg.evaluate("__stellar.centerOf()"); im = Image.open(f).convert("RGB")
                    px = [im.getpixel((int(c["x"]) + dx, int(c["y"]) + dy)) for dx in range(-4, 5, 2) for dy in range(-4, 5, 2)]
                    rgb = [sum(q[k] for q in px) / len(px) for k in range(3)]
                    tint = pg.evaluate(f"import('/night-sky/ns-astro.js').then(m => m.temperatureToSRGB({c['teff']}).map(v => Math.round(Math.max(0, Math.min(1, v)) * 255)))")
                    res, fit = hue_residual(rgb, tint)
                    notes.append(f"hue {m} {sid}: Teff {c['teff']:.0f} K, centre rgb {[round(v) for v in rgb]}, temperatureToSRGB {tint}, residual {res:.3f}")
                    check(res < 0.06, f"{m} {sid}: centre colour lies on the temperatureToSRGB({c['teff']:.0f} K) hue plus white (residual {res:.3f})")
        check(not errs, f"{tag}: no console errors ({errs[:3]})")
        ctx.close()
    # mocked WebXR: Enter VR visible and asks for immersive-vr with local-floor
    ctx, pg, errs = open_page(br, 1280, 800, XR_MOCK)
    pg.wait_for_timeout(300)
    check(pg.locator("#slVR").is_visible() and pg.locator("#slVRNote").is_hidden(), "mocked XR: Enter VR shown")
    pg.click("#slVR"); pg.wait_for_timeout(300)
    calls = pg.evaluate("window.__xrCalls")
    check(len(calls) == 1 and calls[0]["mode"] == "immersive-vr" and "local-floor" in calls[0]["init"]["optionalFeatures"], f"mocked XR: requestSession immersive-vr with local-floor ({calls})")
    check(pg.locator("#slStatus").is_visible() and "Could not start VR" in pg.inner_text("#slStatus"), "mocked XR: a failed session shows a message")
    check(not errs, f"mocked XR: no console errors ({errs[:3]})")
    pg.screenshot(path=str(OUT / "1280x800-xr-mock.png")); ctx.close()
    # flow by clicks: hub -> pick 1 Sun -> end guess -> pins -> start
    ctx, pg, errs = open_page(br, 1280, 800, NO_XR, query="manual=1")
    pg.click("[data-act='mass:1']"); pg.evaluate("__stellar.renderAt(1.1)")
    pg.click("[data-act='end:white dwarf']"); pg.evaluate("__stellar.renderAt(1.2)")
    box = pg.locator("#slHR").bounding_box()
    for i, (fx, fy) in enumerate([(0.62, 0.62), (0.75, 0.4), (0.5, 0.5)]):
        pg.mouse.click(box["x"] + box["width"] * fx, box["y"] + box["height"] * fy); pg.evaluate(f"__stellar.renderAt({1.3 + i * 0.1})")
    pins = pg.evaluate("__stellar.flow.st.pins.length"); check(pins == 3, f"H-Path: three pins placed by tapping the H-R card ({pins})")
    pg.click("[data-act='start']"); pg.evaluate("__stellar.renderAt(2)")
    check(pg.evaluate("__stellar.flow.stage().id") == "F1", "Start opens F1")
    pg.click("[data-act='next']"); pg.evaluate("__stellar.renderAt(2.1)")
    check(pg.evaluate("__stellar.flow.stage().id") == "F2", "Next stage moves on")
    pg.click("#slCalm"); check(pg.evaluate("__stellar.uni.uBoil.value") == 0, "Calm lines stops the boil")
    check(not errs, f"click flow: no console errors ({errs[:3]})"); ctx.close()
    br.close()

for path in ["study-stellar-life.html", "study-hrdiagram.html", "study-stars.html", "study.html", "stellar-life/data/tracks.json", "stellar-life/data/stages.json", "vendor/three/three.module.min.js", "night-sky/ns-input.js", "night-sky/ui/fonts/inter-latin-var.woff2", "board-return.js", "stellar-life/sl-page-ui.js", "stellar-life/sl.css"]:
    try: code = urllib.request.urlopen(f"{BASE}/{path}").status
    except Exception as e: code = str(e)
    check(code == 200, f"link {path}: {code}")
print("\n".join(notes))
print(json.dumps(counts))
print(f"{len(fails)} failures")
sys.exit(1 if fails else 0)
