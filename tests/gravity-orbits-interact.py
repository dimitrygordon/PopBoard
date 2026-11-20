#!/usr/bin/env python3
"""Interactive Playwright checks for Orbit Lab and Kepler and Circles."""
from __future__ import annotations

import json
import math
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright, TimeoutError as PwTimeout

OUT = Path("/workspace/popboard-gravity-orbits-shots/v4")
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

AUDIO_LOG = []
AUDIT = []  # {control, before, now, ok, notes}


def origin():
    return sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8765"


def new_context(browser, device, video_name=None):
    kwargs = dict(device)
    if video_name:
        kwargs["record_video_dir"] = str(OUT / "video-tmp" / video_name)
        kwargs["record_video_size"] = {
            "width": device["viewport"]["width"],
            "height": device["viewport"]["height"],
        }
    ctx = browser.new_context(**kwargs)
    errors = []
    page_errors = []

    def on_console(msg):
        if msg.type == "error":
            text = msg.text
            # Benign in headless: optional assets, stale listeners
            if any(s in text for s in ("favicon", "net::ERR_ABORTED", "Failed to load resource")):
                return
            errors.append(text)

    def on_page_error(err):
        page_errors.append(str(err))

    ctx.on("console", on_console)
    ctx.on("pageerror", on_page_error)
    page = ctx.new_page()
    transferred = []
    try:
        cdp = ctx.new_cdp_session(page)
        cdp.send("Network.setCacheDisabled", {"cacheDisabled": True})
        cdp.send("Network.enable")
        pending = {}

        def on_resp(params):
            pending[params["requestId"]] = {
                "url": params["response"]["url"],
                "status": params["response"]["status"],
            }

        def on_fin(params):
            rec = pending.get(params["requestId"])
            if rec:
                transferred.append((rec["url"], rec["status"], params.get("encodedDataLength") or 0, "cdp"))

        cdp.on("Network.responseReceived", on_resp)
        cdp.on("Network.loadingFinished", on_fin)
    except Exception:
        def on_response(resp):
            try:
                transferred.append((resp.url, resp.status, resp.headers.get("content-length") or 0, resp.request.resource_type))
            except Exception:
                pass
        page.on("response", on_response)
    return ctx, page, errors, page_errors, transferred


def bytes_for(transferred, path_substr=None):
    total = 0
    seen = set()
    sums = {}
    for url, status, clen, _rt in transferred:
        if status >= 400:
            continue
        if str(url).startswith("blob:"):
            continue
        if path_substr and path_substr not in url:
            continue
        key = url.split("?")[0]
        try:
            n = int(clen)
        except (TypeError, ValueError):
            n = 0
        sums[key] = sums.get(key, 0) + n
        seen.add(key)
    total = sum(sums.values())
    return total, seen, sums


def snapshot_weight(transferred, results, key, *, mobile=False, forbid=(), require=()):
    total, urls, sums = bytes_for(transferred)
    names = [u.split("/")[-1] for u in urls]
    rec = {
        "bytes": total,
        "mb": round(total / 1e6, 2),
        "files": len(urls),
        "has2k": any("starmap_2020_2k" in u for u in urls),
        "has4k": any("starmap_2020_4k" in u for u in urls),
        "glbs": sorted(n for n in names if n.endswith(".glb")),
    }
    results["weights"][key] = rec
    if mobile and total > 7_000_000:
        results["ok"] = False
        results["failures"].append({"where": f"{key} first-load weight", "mb": rec["mb"]})
    if mobile and rec["has4k"]:
        results["ok"] = False
        results["failures"].append({"where": f"{key} loaded 4k skybox on mobile", "rec": rec})
    for name in forbid:
        if any(name in u for u in urls):
            results["ok"] = False
            results["failures"].append({"where": f"{key} lazy-load", "unexpected": name, "glbs": rec["glbs"]})
    for name in require:
        if not any(name in u for u in urls):
            results["ok"] = False
            results["failures"].append({"where": f"{key} missing asset", "expected": name, "glbs": rec["glbs"]})
    return rec


def wait_ol(page, timeout=45000, cannon=False):
    page.wait_for_function(
        "() => window.__orbitLab && window.__orbitLab.ready",
        timeout=timeout,
    )
    page.wait_for_function(
        "() => window.__orbitLab && window.__orbitLab.loaded && window.__orbitLab.loaded.earth",
        timeout=timeout,
    )
    if cannon:
        page.wait_for_function(
            "() => window.__orbitLab && window.__orbitLab.loaded && window.__orbitLab.loaded.cannon",
            timeout=timeout,
        )
    page.wait_for_timeout(500)


def wait_kc(page, timeout=45000):
    page.wait_for_function("() => window.__keplerCircles && window.__keplerCircles.ready", timeout=timeout)
    page.wait_for_timeout(800)


def cam(page, ns="__orbitLab"):
    return page.evaluate(f"() => ({{...window.{ns}.camera}})")


def proj(page):
    return page.evaluate("() => ({...window.__orbitLab.projectile})")


def dist(a, b):
    return math.hypot(a["x"] - b["x"], a["y"] - b["y"], a["z"] - b["z"])


def audit(control, worked_before, works_now, notes=""):
    AUDIT.append({
        "control": control,
        "worked_before": worked_before,
        "works_now": works_now,
        "notes": notes,
    })


def drag_rotate(page, ns="__orbitLab"):
    before = cam(page, ns)
    box = page.locator("#scene").bounding_box()
    assert box, "no canvas"
    cx = box["x"] + box["width"] * 0.5
    cy = box["y"] + box["height"] * 0.42
    page.mouse.move(cx, cy)
    page.mouse.down()
    page.mouse.move(cx + 140, cy + 10, steps=16)
    page.mouse.up()
    page.wait_for_timeout(350)
    after = cam(page, ns)
    return before, after, dist(before, after)


def wheel_zoom(page, ns="__orbitLab"):
    before = cam(page, ns)
    box = page.locator("#scene").bounding_box()
    cx = box["x"] + box["width"] * 0.5
    cy = box["y"] + box["height"] * 0.42
    page.mouse.move(cx, cy)
    page.mouse.wheel(0, 400)
    page.wait_for_timeout(350)
    after = cam(page, ns)
    d0 = math.hypot(before["x"], before["y"], before["z"])
    d1 = math.hypot(after["x"], after["y"], after["z"])
    return before, after, abs(d1 - d0)


def click_and_assert(page, selector, predicate, label, before_note=""):
    page.locator(selector).click()
    page.wait_for_function(predicate, timeout=8000)
    return True


def run():
    base = origin()
    results = {"ok": True, "failures": [], "weights": {}, "videos": {}, "shots": []}

    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome", headless=True)

        # ---- Video: L1 Fire Slow then Faster at 390, with mid-flight and landing frames ----
        ctx, page, errors, page_errors, transferred = new_context(browser, IPHONE, video_name="l1-slow-then-faster")
        page.goto(f"{base}/study-orbit-lab.html?preset=l1-s8", wait_until="domcontentloaded", timeout=60000)
        wait_ol(page, cannon=True)
        snapshot_weight(transferred, results, "l1-mobile", mobile=True, require=("starmap_2020_2k.jpg", "earth_2k.glb", "newton_cannon.glb"))
        if errors or page_errors:
            results["failures"].append({"where": "L1 load (slow-then-faster)", "console": errors, "page": page_errors})
        page.screenshot(path=str(OUT / "l1-390-before.png"), full_page=False)
        results["shots"].append("l1-390-before.png")
        home_cam = cam(page)
        shot0 = page.evaluate("() => window.__orbitLab.shotCam")
        if shot0 != "globe":
            results["ok"] = False
            results["failures"].append({"where": "L1 starts on the globe", "shotCam": shot0})

        page.locator("#fireBtn").click()
        page.wait_for_timeout(1700)
        if page.evaluate("() => window.__orbitLab.shotCam") != "lob":
            results["ok"] = False
            results["failures"].append({"where": "L1 Slow close-up camera", "shotCam": page.evaluate("() => window.__orbitLab.shotCam"), "cam": cam(page)})
            audit("Fire close-up (Slow)", "no", False, "camera did not cut to the lob view")
        else:
            audit("Fire close-up (Slow)", "no", True, "camera flew to the mountain close-up")
        page.screenshot(path=str(OUT / "l1-390-slow-midflight.png"), full_page=False)
        results["shots"].append("l1-390-slow-midflight.png")
        page.wait_for_function("() => window.__orbitLab && window.__orbitLab.projectile && window.__orbitLab.projectile.flying === false", timeout=8000)
        page.wait_for_timeout(250)
        s_slow = page.locator("#status").inner_text()
        page.screenshot(path=str(OUT / "l1-390-slow-landed.png"), full_page=False)
        results["shots"].append("l1-390-slow-landed.png")
        if "Lands after" not in s_slow or "12.2" not in s_slow:
            results["ok"] = False
            results["failures"].append({"where": "L1 Slow landing readout", "status": s_slow})

        page.locator('#shots button[data-v]').nth(1).click()
        page.wait_for_timeout(1700)
        page.screenshot(path=str(OUT / "l1-390-faster-midflight.png"), full_page=False)
        results["shots"].append("l1-390-faster-midflight.png")
        page.wait_for_function("() => window.__orbitLab && window.__orbitLab.projectile && window.__orbitLab.projectile.flying === false", timeout=8000)
        page.wait_for_timeout(250)
        s_fast = page.locator("#status").inner_text()
        hist = page.evaluate("() => window.__orbitLab.pathHistory")
        page.screenshot(path=str(OUT / "l1-390-faster-landed.png"), full_page=False)
        results["shots"].append("l1-390-faster-landed.png")
        if "Lands after" not in s_fast or "24.4" not in s_fast:
            results["ok"] = False
            results["failures"].append({"where": "L1 Faster landing readout", "status": s_fast})
        if not hist:
            results["ok"] = False
            results["failures"].append({"where": "L1 kept previous trail", "pathHistory": hist})
            audit("Slow then Faster trails", "no", False, f"history={hist}")
        else:
            audit("Slow then Faster trails", "no", True, f"{s_slow} | {s_fast}; history={hist}")

        lob_cam = cam(page)
        page.locator("#resetViewBtn").click()
        page.wait_for_timeout(1000)
        shot_home = page.evaluate("() => window.__orbitLab.shotCam")
        home2 = cam(page)
        if shot_home != "globe" or dist(lob_cam, home2) < 0.4:
            results["ok"] = False
            results["failures"].append({"where": "Reset view back to the globe", "shotCam": shot_home, "lob": lob_cam, "home": home2})
            audit("Reset view after Fire", "no", False, f"shotCam={shot_home}")
        else:
            audit("Reset view after Fire", "no", True, "returned to the globe")

        if errors or page_errors:
            results["ok"] = False
            results["failures"].append({"where": "L1 slow-then-faster console", "console": errors, "page": page_errors})
        ctx.close()
        tmp = OUT / "video-tmp" / "l1-slow-then-faster"
        vids = list(tmp.glob("*.webm")) if tmp.exists() else []
        if vids:
            dest = OUT / "l1-390-slow-then-faster.webm"
            vids[0].replace(dest)
            results["videos"]["l1-slow-then-faster"] = str(dest)

        # ---- Video + screenshots: L1 fire and drag at iPhone size ----
        ctx, page, errors, page_errors, transferred = new_context(browser, IPHONE, video_name="l1-fire-and-rotate")
        page.goto(f"{base}/study-orbit-lab.html?preset=l1-s8", wait_until="domcontentloaded", timeout=60000)
        wait_ol(page, cannon=True)
        if errors or page_errors:
            results["failures"].append({"where": "L1 load", "console": errors, "page": page_errors})
        page.screenshot(path=str(OUT / "l1-390-after-load.png"), full_page=False)
        results["shots"].append("l1-390-after-load.png")

        # Drag rotate
        b, a, d = drag_rotate(page)
        if d < 0.02:
            results["ok"] = False
            results["failures"].append({"where": "L1 drag-rotate", "delta": d, "before": b, "after": a})
            audit("Orbit Lab drag-rotate (mobile)", "no", False, f"camera delta {d}")
        else:
            audit("Orbit Lab drag-rotate (mobile)", "no", True, f"camera moved {d:.3f}")
        page.screenshot(path=str(OUT / "l1-390-after-rotate.png"), full_page=False)
        results["shots"].append("l1-390-after-rotate.png")

        # Reset view restores a different pose than the dragged one (back toward framing)
        cam_dragged = cam(page)
        page.locator("#resetViewBtn").click()
        page.wait_for_timeout(1000)
        cam_reset = cam(page)
        if dist(cam_dragged, cam_reset) < 0.01:
            results["ok"] = False
            results["failures"].append({"where": "Reset view", "dragged": cam_dragged, "reset": cam_reset})
            audit("Reset view (Orbit Lab)", "no", False, "camera did not restore")
        else:
            audit("Reset view (Orbit Lab)", "no", True, "camera restored after drag")

        # Wheel zoom
        _, _, zd = wheel_zoom(page)
        if zd < 0.01:
            results["ok"] = False
            results["failures"].append({"where": "L1 wheel-zoom", "delta": zd})
            audit("Orbit Lab zoom", "no", False, f"distance delta {zd}")
        else:
            audit("Orbit Lab zoom", "no", True, f"distance changed {zd:.3f}")

        page.locator("#resetViewBtn").click()
        page.wait_for_timeout(250)

        # Fire
        p0 = proj(page)
        page.locator("#fireBtn").click()
        moved = False
        samples = [p0]
        deadline = time.time() + 3.0
        while time.time() < deadline:
            page.wait_for_timeout(80)
            p1 = proj(page)
            samples.append(p1)
            if dist(p0, p1) > 1e-4:
                moved = True
                break
        status = page.locator("#status").inner_text()
        landed = "Lands after" in status or "never lands" in status or "does not come back" in status
        if not moved or not landed:
            results["ok"] = False
            results["failures"].append({
                "where": "L1 Fire",
                "moved": moved,
                "status": status,
                "samples": samples[:6],
            })
            audit("Fire", "no", False, f"moved={moved} status={status!r}")
        else:
            audit("Fire", "no", True, f"ball moved; {status}")
        page.wait_for_timeout(2200)
        page.screenshot(path=str(OUT / "l1-390-after-fire.png"), full_page=False)
        results["shots"].append("l1-390-after-fire.png")

        # Slow / Faster
        page.locator('#shots button[data-v]').nth(0).click()
        page.wait_for_timeout(200)
        s_slow = page.locator("#status").inner_text()
        page.locator('#shots button[data-v]').nth(1).click()
        page.wait_for_function(
            """(prev) => document.getElementById('status').textContent !== prev""",
            arg=s_slow,
            timeout=4000,
        )
        s_fast = page.locator("#status").inner_text()
        # Both lobs read 41 s; range should differ (12.2 vs 24.4 km)
        if "Lands after" not in s_fast:
            results["ok"] = False
            results["failures"].append({"where": "Faster", "status": s_fast})
            audit("Slow / Faster", "yes (speed set)", False, s_fast)
        else:
            audit("Slow / Faster", "yes (speed set; flight hard to see)", True, f"{s_slow} | {s_fast}")

        # Slider (Faster leaves the thumb at the cap, so move it to mid-range first)
        page.locator("#speed").evaluate(
            """el => { el.value = String(Math.round((Number(el.min)+Number(el.max))/2)); el.dispatchEvent(new Event('input', {bubbles:true})); }"""
        )
        before_val = page.locator("#speedVal").inner_text()
        page.locator("#speed").evaluate(
            """el => { el.value = String(Math.min(Number(el.max), Number(el.value) + 80)); el.dispatchEvent(new Event('input', {bubbles:true})); }"""
        )
        after_val = page.locator("#speedVal").inner_text()
        if after_val == before_val:
            results["ok"] = False
            results["failures"].append({"where": "slider", "before": before_val, "after": after_val})
            audit("Launch speed slider", "partial (green missing earlier)", False, after_val)
        else:
            audit("Launch speed slider", "yes (after #179 style fix)", True, f"{before_val} -> {after_val}")

        # About + Credits
        page.locator("#about summary").click()
        page.wait_for_function("() => document.getElementById('about').open === true")
        note = page.locator("#note").inner_text()
        if "slow lobs" not in note.lower() and "mountain" not in note.lower():
            results["ok"] = False
            results["failures"].append({"where": "About this view", "note": note})
            audit("About this view", "no", False, note)
        else:
            audit("About this view", "no", True, "sheet opens with full lesson note")

        page.locator(".credits summary").click()
        page.wait_for_function("() => document.querySelector('.credits').open === true")
        cred = page.locator(".credits p").inner_text()
        if "Solar System Scope" not in cred:
            results["ok"] = False
            results["failures"].append({"where": "Credits", "text": cred})
            audit("Credits", "yes", False, cred)
        else:
            audit("Credits", "yes", True, "opens; exclusive with About")
        page.wait_for_function("() => document.getElementById('about').open === false")

        # Back is present
        if not page.locator("#studyBackBtn[data-study-back]").count():
            results["ok"] = False
            audit("Back", "yes", False, "missing")
        else:
            audit("Back", "yes", True, "present with data-study-back")

        if errors or page_errors:
            results["ok"] = False
            results["failures"].append({"where": "L1 console after interact", "console": errors, "page": page_errors})

        # first-load weight was snapped in the Slow-then-Faster session

        # dock height
        dock = page.evaluate(
            """() => {
              const d = document.querySelector('.dock');
              const r = d.getBoundingClientRect();
              return {h: r.height, vh: window.innerHeight, ratio: r.height / window.innerHeight};
            }"""
        )
        results["weights"]["l1-390-dock"] = dock
        if dock["ratio"] > 0.40:
            results["ok"] = False
            results["failures"].append({"where": "L1 dock height", "dock": dock})

        ctx.close()
        # move video
        tmp = OUT / "video-tmp" / "l1-fire-and-rotate"
        vids = list(tmp.glob("*.webm")) if tmp.exists() else []
        if vids:
            dest = OUT / "l1-390-fire-and-rotate.webm"
            vids[0].replace(dest)
            results["videos"]["l1-fire-and-rotate"] = str(dest)

        # ---- L4 mobile ----
        ctx, page, errors, page_errors, transferred = new_context(browser, IPHONE)
        page.goto(f"{base}/study-orbit-lab.html?preset=l4-s6", wait_until="domcontentloaded", timeout=60000)
        wait_ol(page)
        page.wait_for_timeout(1500)
        snapshot_weight(transferred, results, "l4-mobile", mobile=True, require=("starmap_2020_2k.jpg", "earth_2k.glb", "iss.glb"), forbid=("hubble.glb", "moon_2k.glb"))
        page.screenshot(path=str(OUT / "l4-390-before.png"), full_page=False)
        results["shots"].append("l4-390-before.png")
        b, a, d = drag_rotate(page)
        if d < 0.02:
            results["ok"] = False
            results["failures"].append({"where": "L4 drag", "delta": d})
            audit("L4 drag-rotate", "no", False, f"delta {d}")
        else:
            audit("L4 drag-rotate", "no", True, f"delta {d:.3f}")
        # Hubble / Moon / ISS
        for label, sel in [("Hubble", 'button[data-sat="Hubble"]'), ("Moon", 'button[data-sat="Moon"]'), ("ISS", 'button[data-sat="ISS"]')]:
            page.locator(sel).scroll_into_view_if_needed()
            page.locator(sel).click()
            page.wait_for_function(
                "(lab) => document.getElementById('status').textContent.toLowerCase().includes(lab.toLowerCase())",
                arg=label,
                timeout=15000,
            )
            text = page.locator("#status").inner_text()
            audit(f"{label} preset", "yes (static, no motion)", True, text)
        # Show g and period
        hidden = page.locator("#readouts").is_hidden()
        page.locator("#readoutToggle").evaluate("el => el.click()")
        page.wait_for_function("() => document.getElementById('readouts').hidden === false", timeout=5000)
        now_hidden = page.locator("#readouts").is_hidden()
        pressed = page.locator("#readoutToggle").get_attribute("aria-pressed")
        if hidden == now_hidden or pressed != "true":
            results["ok"] = False
            results["failures"].append({"where": "Show g and period", "hidden": hidden, "now": now_hidden, "pressed": pressed})
            audit("Show g and period", "yes", False, f"hidden {hidden}->{now_hidden}")
        else:
            audit("Show g and period", "yes", True, "panel toggled")
            gtxt = page.locator("#readG").inner_text()
            if "N/kg" not in gtxt:
                results["ok"] = False
                results["failures"].append({"where": "g readout", "text": gtxt})
        page.screenshot(path=str(OUT / "l4-390-after.png"), full_page=False)
        results["shots"].append("l4-390-after.png")
        if errors or page_errors:
            results["ok"] = False
            results["failures"].append({"where": "L4 console", "console": errors, "page": page_errors})
        ctx.close()

        # ---- L5 mobile ----
        ctx, page, errors, page_errors, transferred = new_context(browser, IPHONE)
        page.goto(f"{base}/study-orbit-lab.html?preset=l5-s8", wait_until="domcontentloaded", timeout=60000)
        wait_ol(page, cannon=True)
        snapshot_weight(transferred, results, "l5-mobile", mobile=True, require=("starmap_2020_2k.jpg", "earth_2k.glb", "newton_cannon.glb"), forbid=("iss.glb", "hubble.glb", "gps.glb", "geo_comsat.glb", "moon_2k.glb"))
        page.screenshot(path=str(OUT / "l5-390-before.png"), full_page=False)
        results["shots"].append("l5-390-before.png")
        # A short lob should cut to the mountain close-up.
        page.locator("#shots button[data-v]").nth(0).click()
        page.wait_for_timeout(200)
        page.locator("#fireBtn").click()
        page.wait_for_timeout(900)
        if page.evaluate("() => window.__orbitLab.shotCam") != "lob":
            results["ok"] = False
            results["failures"].append({"where": "L5 lob close-up", "shotCam": page.evaluate("() => window.__orbitLab.shotCam")})
            audit("L5 lob close-up", "no", False, "did not cut to the mountain view")
        else:
            audit("L5 lob close-up", "no", True, "close-up on a short lob")
        page.wait_for_function("() => window.__orbitLab && window.__orbitLab.projectile && window.__orbitLab.projectile.flying === false", timeout=8000)
        shots = page.locator("#shots button[data-v]")
        n = shots.count()
        if n != 5:
            results["ok"] = False
            results["failures"].append({"where": "L5 shot count", "n": n})
            audit("L5 five speeds", "yes", False, f"count {n}")
        else:
            last = ""
            for i in range(n):
                shots.nth(i).click()
                page.wait_for_timeout(300)
                last = page.locator("#status").inner_text()
            if "never lands" not in last and "Lands after" not in last and "does not come back" not in last:
                results["ok"] = False
                results["failures"].append({"where": "L5 last shot status", "status": last})
                audit("L5 five speeds", "partial", False, last)
            else:
                audit("L5 five speeds", "yes (path drawn; flight hard to see)", True, last)
        # Fire at current (circular) - should keep orbiting, status never lands
        p0 = proj(page)
        page.locator("#fireBtn").click()
        moved = False
        deadline = time.time() + 3.0
        while time.time() < deadline:
            page.wait_for_timeout(80)
            if dist(p0, proj(page)) > 1e-4:
                moved = True
                break
        st = page.locator("#status").inner_text()
        if not moved or "never lands" not in st:
            results["ok"] = False
            results["failures"].append({"where": "L5 Fire orbit", "moved": moved, "status": st, "p0": p0, "p1": proj(page)})
            audit("L5 Fire (orbit speed)", "no", False, st)
        else:
            audit("L5 Fire (orbit speed)", "no", True, st)
        # Orbit-speed shots should pull back to the globe as the ball goes around.
        shot_orbit = page.evaluate("() => window.__orbitLab.shotCam")
        if shot_orbit != "globe":
            results["ok"] = False
            results["failures"].append({"where": "L5 orbit pull-back", "shotCam": shot_orbit})
            audit("L5 orbit pull-back", "no", False, f"shotCam={shot_orbit}")
        else:
            audit("L5 orbit pull-back", "no", True, "camera back on the globe")
        for key in ("ISS", "GPS", "GEO"):
            page.locator(f'button[data-sat="{key}"]').scroll_into_view_if_needed()
            page.locator(f'button[data-sat="{key}"]').click()
            page.wait_for_function(
                "(k) => document.getElementById('status').textContent.toUpperCase().includes(k)",
                arg=key,
                timeout=15000,
            )
            st = page.locator("#status").inner_text()
            audit(f"L5 {key}", "yes (static)", True, st)
        page.screenshot(path=str(OUT / "l5-390-after.png"), full_page=False)
        results["shots"].append("l5-390-after.png")
        dock = page.evaluate(
            """() => { const d=document.querySelector('.dock'); const r=d.getBoundingClientRect(); return {h:r.height, vh:innerHeight, ratio:r.height/innerHeight}; }"""
        )
        results["weights"]["l5-390-dock"] = dock
        if dock["ratio"] > 0.40:
            results["ok"] = False
            results["failures"].append({"where": "L5 dock height", "dock": dock})
        if errors or page_errors:
            results["ok"] = False
            results["failures"].append({"where": "L5 console", "console": errors, "page": page_errors})
        ctx.close()

        # ---- L2 / L3 Kepler ----
        ctx, page, errors, page_errors, transferred = new_context(browser, IPHONE, video_name="l2-rotate")
        page.goto(f"{base}/study-kepler-circles.html?preset=l2-s5", wait_until="domcontentloaded", timeout=60000)
        wait_kc(page)
        snapshot_weight(transferred, results, "l2-mobile", mobile=True, require=("starmap_2020_2k.jpg",), forbid=("jupiter_2k.glb", "earth_2k.glb", "io.glb", "europa.glb"))
        page.screenshot(path=str(OUT / "l2-390-before.png"), full_page=False)
        results["shots"].append("l2-390-before.png")
        b, a, d = drag_rotate(page, "__keplerCircles")
        if d < 0.02:
            results["ok"] = False
            results["failures"].append({"where": "L2 drag", "delta": d})
            audit("Kepler drag-rotate (mobile)", "no", False, f"delta {d}")
        else:
            audit("Kepler drag-rotate (mobile)", "no", True, f"delta {d:.3f}")
        page.screenshot(path=str(OUT / "l2-390-after-rotate.png"), full_page=False)
        results["shots"].append("l2-390-after-rotate.png")
        page.locator("#resetViewBtn").click()
        page.wait_for_timeout(300)
        if dist(a, cam(page, "__keplerCircles")) < 0.01:
            results["ok"] = False
            audit("Reset view (Kepler)", "no", False, "no restore")
        else:
            audit("Reset view (Kepler)", "no", True, "restored")

        page.locator("#cutBtn").click()
        page.wait_for_function("() => /inward pull is gone/i.test(document.getElementById('status').textContent)")
        disabled = page.locator("#cutBtn").is_disabled()
        if not disabled:
            results["ok"] = False
            audit("Cut the inward pull", "yes", False, "button not disabled")
        else:
            audit("Cut the inward pull", "yes", True, page.locator("#status").inner_text())
        page.locator("#resetBtn").click()
        page.wait_for_timeout(800)
        if page.locator("#cutBtn").is_disabled():
            results["ok"] = False
            audit("Reset (circles)", "yes", False, "cut still disabled")
        else:
            audit("Reset (circles)", "yes", True, "cut re-enabled")

        # Ellipses
        page.locator("#modeEllipses").click()
        page.wait_for_function("() => document.getElementById('modeEllipses').getAttribute('aria-pressed') === 'true'")
        page.wait_for_function("() => /Earth/.test(document.getElementById('status').textContent)", timeout=20000)
        st = page.locator("#status").inner_text()
        audit("Ellipses", "yes", True, st)
        # Full comet
        page.locator("#zoomFull").click()
        page.wait_for_function("() => document.getElementById('zoomFull').getAttribute('aria-pressed') === 'true'")
        st = page.locator("#status").inner_text()
        if "comet" not in st.lower() and "focus" not in st.lower():
            results["ok"] = False
            results["failures"].append({"where": "Full comet orbit", "status": st})
            audit("Full comet orbit", "yes", False, st)
        else:
            audit("Full comet orbit", "yes", True, st)
        page.locator("#zoomInner").click()
        page.wait_for_function("() => document.getElementById('zoomInner').getAttribute('aria-pressed') === 'true'")
        audit("Earth and Mars", "yes", True, page.locator("#status").inner_text())

        # Moons
        page.locator("#modeMoons").click()
        page.wait_for_function("() => document.getElementById('modeMoons').getAttribute('aria-pressed') === 'true'")
        page.wait_for_function("() => /Galilean|moons/i.test(document.getElementById('status').textContent)", timeout=25000)
        st = page.locator("#status").inner_text()
        audit("Jupiter's moons", "yes", True, st)
        page.locator("#modeCircles").click()
        page.wait_for_function("() => document.getElementById('modeCircles').getAttribute('aria-pressed') === 'true'")
        audit("Circles", "yes", True, page.locator("#status").inner_text())

        if errors or page_errors:
            results["ok"] = False
            results["failures"].append({"where": "L2 console", "console": errors, "page": page_errors})
        page.screenshot(path=str(OUT / "l2-390-after.png"), full_page=False)
        results["shots"].append("l2-390-after.png")
        ctx.close()
        tmp = OUT / "video-tmp" / "l2-rotate"
        vids = list(tmp.glob("*.webm")) if tmp.exists() else []
        if vids:
            dest = OUT / "l2-390-drag-rotate.webm"
            vids[0].replace(dest)
            results["videos"]["l2-drag-rotate"] = str(dest)

        # L3
        ctx, page, errors, page_errors, transferred = new_context(browser, IPHONE)
        page.goto(f"{base}/study-kepler-circles.html?preset=l3-s6", wait_until="domcontentloaded", timeout=60000)
        wait_kc(page)
        page.screenshot(path=str(OUT / "l3-390-before.png"), full_page=False)
        results["shots"].append("l3-390-before.png")
        # wait a bit for GLBs
        page.wait_for_timeout(2500)
        snapshot_weight(transferred, results, "l3-mobile", mobile=True, require=("starmap_2020_2k.jpg",), forbid=("jupiter_2k.glb", "io.glb", "europa.glb", "ganymede.glb", "callisto.glb"))
        page.screenshot(path=str(OUT / "l3-390-after-load.png"), full_page=False)
        results["shots"].append("l3-390-after-load.png")
        st = page.locator("#status").inner_text()
        if "Earth" not in st:
            results["ok"] = False
            results["failures"].append({"where": "L3 status", "status": st})
        if errors or page_errors:
            results["ok"] = False
            results["failures"].append({"where": "L3 console", "console": errors, "page": page_errors})
        # dock at 375 later
        ctx.close()

        # ---- 375x667 layout ----
        ctx, page, errors, page_errors, transferred = new_context(browser, IPHONE_SE)
        page.goto(f"{base}/study-orbit-lab.html?preset=l1-s8", wait_until="domcontentloaded", timeout=60000)
        wait_ol(page, cannon=True)
        page.screenshot(path=str(OUT / "l1-375-before.png"), full_page=False)
        results["shots"].append("l1-375-before.png")
        dock = page.evaluate(
            """() => { const d=document.querySelector('.dock'); const r=d.getBoundingClientRect(); return {h:r.height, vh:innerHeight, ratio:r.height/innerHeight}; }"""
        )
        results["weights"]["l1-375-dock"] = dock
        if dock["ratio"] > 0.40:
            results["ok"] = False
            results["failures"].append({"where": "L1 375 dock height", "dock": dock})
        if errors or page_errors:
            results["ok"] = False
            results["failures"].append({"where": "L1 375 console", "console": errors, "page": page_errors})
        ctx.close()

        # ---- Desktop L1 ----
        ctx, page, errors, page_errors, transferred = new_context(browser, DESKTOP)
        page.goto(f"{base}/study-orbit-lab.html?preset=l1-s8", wait_until="domcontentloaded", timeout=60000)
        wait_ol(page, cannon=True)
        page.screenshot(path=str(OUT / "l1-1280-before.png"), full_page=False)
        results["shots"].append("l1-1280-before.png")
        b, a, d = drag_rotate(page)
        if d < 0.02:
            results["ok"] = False
            results["failures"].append({"where": "desktop drag", "delta": d})
            audit("Orbit Lab drag-rotate (desktop)", "no", False, f"delta {d}")
        else:
            audit("Orbit Lab drag-rotate (desktop)", "no", True, f"delta {d:.3f}")
        _, _, zd = wheel_zoom(page)
        if zd < 0.01:
            results["ok"] = False
            results["failures"].append({"where": "desktop zoom", "delta": zd})
            audit("Orbit Lab zoom (desktop)", "no", False, f"delta {zd}")
        else:
            audit("Orbit Lab zoom (desktop)", "no", True, f"delta {zd:.3f}")
        p0 = proj(page)
        page.locator("#fireBtn").click()
        moved = False
        deadline = time.time() + 3.0
        while time.time() < deadline:
            page.wait_for_timeout(80)
            if dist(p0, proj(page)) > 1e-4:
                moved = True
                break
        st = page.locator("#status").inner_text()
        if not moved or "Lands after" not in st:
            results["ok"] = False
            results["failures"].append({"where": "desktop Fire", "moved": moved, "status": st})
            audit("Fire (desktop)", "no", False, st)
        else:
            audit("Fire (desktop)", "no", True, st)
        page.wait_for_timeout(2000)
        page.screenshot(path=str(OUT / "l1-1280-after-fire.png"), full_page=False)
        results["shots"].append("l1-1280-after-fire.png")
        if errors or page_errors:
            results["ok"] = False
            results["failures"].append({"where": "desktop console", "console": errors, "page": page_errors})
        snapshot_weight(transferred, results, "l1-desktop", mobile=False)
        ctx.close()

        browser.close()

    results["audit"] = AUDIT
    (OUT / "interact-report.json").write_text(json.dumps(results, indent=2))
    print(json.dumps(results, indent=2))
    if not results["ok"]:
        sys.exit(1)


if __name__ == "__main__":
    run()
