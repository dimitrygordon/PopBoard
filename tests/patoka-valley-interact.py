#!/usr/bin/env python3
"""Home-page weight and Patoka Valley module interaction checks."""
from __future__ import annotations

import json
import math
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

OUT = Path("/workspace/popboard-valley-shots")
OUT.mkdir(parents=True, exist_ok=True)
BASELINE = Path("/tmp/valley-baseline.json")

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

WORLD_HINTS = (
    "/world/world.js",
    "/world/data/",
    "/world/models/",
    "hidden-world",
    "three.module",
    "GLTFLoader",
    "meshopt_decoder",
)


def origin():
    return sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8766"


def is_noise(text: str) -> bool:
    t = text.lower()
    # Firebase / third-party chatter on the login page is pre-existing.
    return any(
        s in t
        for s in (
            "firebase",
            "gapi",
            "accounts.google",
            "net::err",
            "failed to load resource",
            "cdn.jsdelivr",
        )
    )


def attach_logging(page):
    errors = []
    reqs = []
    total = [0]

    def on_resp(resp):
        try:
            n = resp.headers.get("content-length")
            if n and n.isdigit():
                size = int(n)
            else:
                try:
                    size = len(resp.body() or b"")
                except Exception:
                    size = 0
        except Exception:
            size = 0
        total[0] += size
        reqs.append((resp.status, size, resp.url))

    def on_console(msg):
        if msg.type == "error" and not is_noise(msg.text):
            errors.append("console.error: " + msg.text)

    def on_pageerror(exc):
        if not is_noise(str(exc)):
            errors.append("pageerror: " + str(exc))

    page.on("response", on_resp)
    page.on("console", on_console)
    page.on("pageerror", on_pageerror)
    return errors, reqs, total


def worldish(reqs):
    out = []
    for status, size, url in reqs:
        if any(h in url for h in WORLD_HINTS):
            out.append((status, size, url.split("?")[0]))
    return out


def pose_distance(a, b):
    if not a or not b:
        return 1e9
    return math.hypot(a["x"] - b["x"], a["y"] - b["y"], a["z"] - b["z"]) + abs(
        (a.get("rotY") or 0) - (b.get("rotY") or 0)
    )


def wait_world(page, timeout_ms=90000):
    page.wait_for_function(
        "() => !!(window.__world && window.__world.ready && window.__world.cameraPose && window.__world.cameraPose())",
        timeout=timeout_ms,
    )


def drag_canvas(page, device):
    canvas = page.locator("#world")
    box = canvas.bounding_box()
    assert box, "canvas has no box"
    x = box["x"] + box["width"] * 0.5
    y = box["y"] + box["height"] * 0.62
    # Drag mostly sideways so yaw changes headingOff.
    page.mouse.move(x, y)
    page.mouse.down()
    page.mouse.move(x + 180, y, steps=12)
    page.mouse.up()
    page.wait_for_timeout(250)


def main():
    base = origin().rstrip("/")
    results = {"origin": base, "home": {}, "module": {}, "ok": True, "failures": []}
    baseline = json.loads(BASELINE.read_text()) if BASELINE.exists() else {}

    devices = [("desktop", DESKTOP), ("iphone390", IPHONE), ("iphone375", IPHONE_SE)]

    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome", headless=True)

        for name, dev in devices:
            ctx = browser.new_context(**dev)
            page = ctx.new_page()
            errors, reqs, total = attach_logging(page)
            page.goto(base + "/", wait_until="networkidle", timeout=60000)
            page.wait_for_timeout(1200)
            # Login form still present.
            login_ok = page.locator("#login").count() > 0 and page.locator("#usernameInput").count() > 0
            shot = OUT / f"home-{name}.png"
            page.screenshot(path=str(shot), full_page=False)
            w = worldish(reqs)
            before = (baseline.get(name) or {}).get("bytes")
            rec = {
                "bytes": total[0],
                "n": len(reqs),
                "bytes_before": before,
                "worldish": w,
                "errors": errors[:],
                "login_ok": login_ok,
                "shot": str(shot),
            }
            results["home"][name] = rec
            print(
                f"HOME {name}: {total[0]} bytes (before {before}) reqs={len(reqs)} "
                f"worldish={len(w)} errors={len(errors)} login={login_ok}"
            )
            if w:
                results["ok"] = False
                results["failures"].append(f"home {name} loaded 3D/valley assets: {w}")
            if errors:
                results["ok"] = False
                results["failures"].append(f"home {name} errors: {errors}")
            if not login_ok:
                results["ok"] = False
                results["failures"].append(f"home {name} missing login form")
            ctx.close()

        for name, dev in devices:
            ctx = browser.new_context(**dev)
            page = ctx.new_page()
            errors, reqs, total = attach_logging(page)
            url = base + "/study-patoka-valley?freeze=1&wx=clear"
            page.goto(url, wait_until="domcontentloaded", timeout=60000)
            try:
                wait_world(page, 90000)
            except Exception as exc:
                results["ok"] = False
                results["failures"].append(f"module {name} did not become ready: {exc}")
                page.screenshot(path=str(OUT / f"module-{name}-FAIL.png"))
                ctx.close()
                continue
            page.wait_for_timeout(400)
            before = page.evaluate("() => window.__world.cameraPose()")
            drag_canvas(page, dev)
            page.wait_for_timeout(300)
            after = page.evaluate("() => window.__world.cameraPose()")
            moved = pose_distance(before, after)
            page.locator("#resetViewBtn").click()
            page.wait_for_timeout(300)
            reset = page.evaluate("() => window.__world.cameraPose()")
            back = pose_distance(before, reset)
            labels = page.locator("#landmark-btn").is_visible()
            title = page.locator(".valley-title").inner_text()
            shot = OUT / f"module-{name}.png"
            page.screenshot(path=str(shot), full_page=False)
            rec = {
                "bytes": total[0],
                "errors": errors[:],
                "before": before,
                "after": after,
                "reset": reset,
                "moved": moved,
                "reset_delta": back,
                "landmark": labels,
                "title": title,
                "shot": str(shot),
            }
            results["module"][name] = rec
            print(
                f"MODULE {name}: moved={moved:.3f} reset_delta={back:.3f} "
                f"landmark={labels} errors={len(errors)} title={title!r}"
            )
            if errors:
                results["ok"] = False
                results["failures"].append(f"module {name} errors: {errors}")
            if moved < 1.0:
                results["ok"] = False
                results["failures"].append(f"module {name} drag did not change camera ({moved})")
            if back > 2.0:
                results["ok"] = False
                results["failures"].append(f"module {name} Reset view did not restore camera ({back})")
            if not labels:
                results["ok"] = False
                results["failures"].append(f"module {name} landmark button missing")
            ctx.close()

        browser.close()

    out = OUT / "interact-results.json"
    out.write_text(json.dumps(results, indent=2))
    print("wrote", out)
    if not results["ok"]:
        print("FAILURES:")
        for f in results["failures"]:
            print(" -", f)
        sys.exit(1)
    print("ALL CHECKS PASSED")


if __name__ == "__main__":
    main()
