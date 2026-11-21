#!/usr/bin/env python3
"""Playwright user checks for the Spaceships gallery and every detail viewer."""
from __future__ import annotations

import http.server
import json
import os
import socketserver
import sys
import threading
from pathlib import Path
from urllib.parse import urlparse

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1] / "public"
OUT = Path(os.environ.get("SS_OUT", "/workspace/popboard-spaceships-shots/wave3-b1"))
OUT.mkdir(parents=True, exist_ok=True)
FLEET = json.loads((ROOT / "spaceships/fleet.json").read_text())
CRAFT_IDS = [c["id"] for c in FLEET["craft"] if c.get("listed") is not False]
LISTED_COUNT = len(CRAFT_IDS)
AR_AUTO_IDS = {c["id"] for c in FLEET["craft"] if {"planets-moons", "small-bodies"} & set(c.get("tags") or [])}
TAG_COUNTS = {}
for _c in FLEET["craft"]:
    if _c.get("listed") is not False:
        for _t in _c.get("tags") or []:
            TAG_COUNTS[_t] = TAG_COUNTS.get(_t, 0) + 1
EARTH_IDS = sorted(c["id"] for c in FLEET["craft"] if c.get("listed") is not False and "earth-observer" in (c.get("tags") or []))
# Craft whose fact rows are still verified:false (pending Tesla) show PLACEHOLDER labels by design.
UNVERIFIED_IDS = {c["id"] for c in FLEET["craft"] if any(r.get("verified") is False for r in c.get("facts", []))}
# SS_BASE runs against a deployed site (e.g. a Pages preview). SS_IDS limits the viewer pass.
REMOTE_BASE = os.environ.get("SS_BASE", "").rstrip("/")
if os.environ.get("SS_IDS"):
    CRAFT_IDS = [i for i in os.environ["SS_IDS"].replace(",", " ").split() if i]
WAVE2_IDS = {
    "gemini", "mercury-friendship-7", "apollo-soyuz", "skylab", "pioneer-10",
    "magellan", "mro", "lro", "osiris-rex", "insight", "spirit-opportunity",
    "spitzer", "fermi", "swift", "terra", "aqua", "landsat-8", "soho", "stardust",
    "deep-impact", "messenger", "mars-odyssey", "sdo", "stereo", "deep-space-1",
    "near-shoemaker", "ladee", "explorer-1", "compton", "wmap",
}

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

SHOT_ALL_ON = {"iphone-390"}
SHOT_SAMPLE = {"voyager", "iss", "chandra", "jwst", "juno", "terra", "gpm", "suomi-npp", "goes", "radarsat-1", "aura", "landsat-7"}


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
    return server, f"http://127.0.0.1:{server.server_address[1]}"


def track(page):
    page.errors = []
    page.transfers = []

    def on_response(resp):
        url = resp.url
        length = 0
        try:
            header = resp.headers.get("content-length")
            if header:
                length = int(header)
            elif resp.request.method != "HEAD":
                body = resp.body()
                length = len(body) if body is not None else 0
        except Exception:
            length = 0
        page.transfers.append({
            "url": url,
            "path": urlparse(url).path,
            "method": resp.request.method,
            "status": resp.status,
            "ok": resp.ok,
            "bytes": length,
            "type": resp.request.resource_type,
        })

    page.on("pageerror", lambda exc: page.errors.append(f"pageerror: {exc}"))
    page.on("console", lambda msg: page.errors.append(f"console:{msg.type}: {msg.text}") if msg.type == "error" else None)
    page.on("response", on_response)


def hard_errors(page):
    skip = ("Failed to load resource", "net::", "favicon", "popboard-icon")
    return [e for e in page.errors if not any(s.lower() in e.lower() for s in skip)]


def first_load_bytes(page):
    seen = {}
    usdz = 0
    other_glb = 0
    for item in page.transfers:
        if item["method"] == "HEAD" or not item["ok"]:
            continue
        path = item["path"]
        # Keep the largest body for a path (ignore tiny range/HEAD leftovers).
        prev = seen.get(path)
        if prev is None or item["bytes"] > prev:
            seen[path] = item["bytes"]
        if path.endswith(".usdz"):
            usdz += item["bytes"]
    total = sum(seen.values())
    files = sorted(((path, size) for path, size in seen.items()), key=lambda x: -x[1])
    return {"bytes": total, "files": files, "usdzBytes": usdz, "count": len(files)}


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
    return cond


def open_page(context, url):
    page = context.new_page()
    track(page)
    page.goto(url, wait_until="domcontentloaded", timeout=30000)
    return page


def wait_model_loaded(page, craft_id, timeout=30000):
    page.wait_for_function(
        """(id) => {
          const mv = document.querySelector('model-viewer');
          if (!mv || mv.hidden || !mv.loaded) return false;
          const src = mv.src || '';
          if (src.includes('_placeholder')) return false;
          if (!src.includes(id + '.glb')) return false;
          const d = mv.getDimensions && mv.getDimensions();
          return !!(d && (d.x > 0 || d.y > 0 || d.z > 0));
        }""",
        arg=craft_id,
        timeout=timeout,
    )


def model_info(page):
    return page.evaluate(
        """() => {
          const mv = document.querySelector('model-viewer');
          if (!mv) return null;
          const d = (mv.getDimensions && mv.getDimensions()) || {};
          return {
            src: mv.src || '',
            iosSrc: mv.getAttribute('ios-src'),
            cameraOrbit: mv.getAttribute('camera-orbit'),
            ar: mv.hasAttribute('ar'),
            arModes: mv.getAttribute('ar-modes'),
            arScale: mv.getAttribute('ar-scale'),
            cameraControls: mv.hasAttribute('camera-controls'),
            touchAction: mv.getAttribute('touch-action'),
            loaded: !!mv.loaded,
            dim: [d.x || 0, d.y || 0, d.z || 0],
            bannerHidden: !!document.getElementById('fallbackBanner')?.hidden
          };
        }"""
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


def overflow_x(page):
    return page.evaluate("() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1")


def drag_model(page):
    box = page.locator("#viewer").bounding_box()
    if not box:
        return "", ""
    x = box["x"] + box["width"] * 0.55
    y = box["y"] + box["height"] * 0.45
    page.evaluate("() => { const mv = document.querySelector('model-viewer'); mv.removeAttribute('auto-rotate'); }")
    page.wait_for_timeout(150)
    before = camera_orbit(page)
    page.mouse.move(x, y)
    page.mouse.down()
    page.mouse.move(x - 80, y, steps=12)
    page.mouse.up()
    page.wait_for_timeout(300)
    after = camera_orbit(page)
    return before, after


def touch_drag_model(page):
    """Real touch drag (CDP touch events) on touch devices."""
    box = page.locator("#viewer").bounding_box()
    if not box:
        return "", ""
    x = box["x"] + box["width"] * 0.55
    y = box["y"] + box["height"] * 0.45
    page.evaluate("() => { const mv = document.querySelector('model-viewer'); mv.removeAttribute('auto-rotate'); }")
    page.wait_for_timeout(150)
    before = camera_orbit(page)
    cdp = page.context.new_cdp_session(page)
    cdp.send("Input.dispatchTouchEvent", {"type": "touchStart", "touchPoints": [{"x": x, "y": y}]})
    for step in range(1, 13):
        cdp.send("Input.dispatchTouchEvent", {"type": "touchMove", "touchPoints": [{"x": x - step * 8, "y": y}]})
        page.wait_for_timeout(16)
    cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []})
    cdp.detach()
    page.wait_for_timeout(300)
    after = camera_orbit(page)
    return before, after


def run_gallery(context, base, tag, measure=False):
    page = open_page(context, base + "/study-spaceships")
    page.wait_for_selector(".card", timeout=15000)
    # Wait for cards to render from fleet.json
    page.wait_for_function(f"() => document.querySelectorAll('.card').length >= {LISTED_COUNT}", timeout=15000)
    count = page.locator(".card").count()
    check(count == LISTED_COUNT, f"{tag} gallery shows {LISTED_COUNT} cards (got {count})")
    for extra in ("iss", "saturn-v", "space-shuttle", "terra", "aqua", "landsat-8", "insight", "gemini", "gpm", "suomi-npp"):
        check(page.locator(f".card[data-id='{extra}']").count() == 1, f"{tag} gallery lists {extra}")
    earth_btn = page.locator("#filters button", has_text="Earth observers")
    check(earth_btn.count() == 1, f"{tag} gallery has an Earth observers filter")
    earth_btn.click()
    page.wait_for_timeout(100)
    earth_ids = page.locator(".card").evaluate_all("els => els.map(e => e.dataset.id).sort()")
    check(earth_ids == EARTH_IDS, f"{tag} Earth observers filter shows {len(EARTH_IDS)} earth-observer craft (got {len(earth_ids)}: {earth_ids})")
    shot(page, f"gallery-earth-{tag}.png")
    labels = page.locator("#filters button").evaluate_all("els => els.map(e => e.textContent)")
    check(len(labels) == len(TAG_COUNTS) + 1, f"{tag} one filter chip per tag plus All ({len(labels)} chips, {len(TAG_COUNTS)} tags)")
    chip_counts = page.evaluate("""() => {
      const out = {};
      const btns = [...document.querySelectorAll('#filters button')];
      for (let i = 1; i < btns.length; i++) {
        const b = document.querySelectorAll('#filters button')[i];
        const label = b.textContent;
        if (b.getAttribute('aria-pressed') !== 'true') b.click();
        out[label] = document.querySelectorAll('.card').length;
        const again = [...document.querySelectorAll('#filters button')].find(x => x.textContent === label);
        if (again && again.getAttribute('aria-pressed') === 'true') again.click();
      }
      return out;
    }""")
    check(sorted(chip_counts.values()) == sorted(TAG_COUNTS.values()), f"{tag} every filter chip count matches fleet tags ({chip_counts})")
    page.locator("#filters button", has_text="All").click()
    page.wait_for_timeout(100)
    check(page.locator(".card").count() == LISTED_COUNT, f"{tag} All filter restores {LISTED_COUNT} cards")
    check(not overflow_x(page), f"{tag} gallery does not overflow horizontally")
    # Confirm the gallery did not fetch a model.
    model_gets = [t for t in page.transfers if t["method"] != "HEAD" and t["path"].endswith((".glb", ".usdz", "model-viewer.min.js"))]
    check(model_gets == [], f"{tag} gallery does not fetch GLB, USDZ, or model-viewer ({model_gets})")
    shot(page, f"gallery-{tag}.png")
    stats = first_load_bytes(page) if measure else None
    page.fill("#search", "voyager")
    page.wait_for_timeout(100)
    visible = page.locator(".card").count()
    expect_hits = sum(1 for c in FLEET["craft"] if c.get("listed") is not False and "voyager" in " ".join([c["id"], c["name"], c.get("subtitle") or "", *(c.get("tags") or [])]).lower())
    check(visible == expect_hits and page.locator(".card[data-id='voyager']").count() == 1, f"{tag} search for voyager shows the {expect_hits} matching cards incl. voyager (got {visible})")
    if tag == "iphone-390":
        shot(page, f"gallery-search-{tag}.png")
    with page.expect_navigation(timeout=20000):
        page.locator(".card[data-id='voyager']").click()
    check("id=voyager" in page.url, f"{tag} viewer opened with id=voyager")
    page.close()
    return stats


def run_viewer(context, base, tag, craft_id, measure=False, take_shot=False, take_drag=False):
    page = open_page(context, base + f"/study-spaceship?id={craft_id}")
    wait_model_loaded(page, craft_id, timeout=45000)
    info = model_info(page)
    check(info is not None and info["loaded"], f"{tag} {craft_id} model-viewer loaded")
    if info:
        check("_placeholder" not in info["src"], f"{tag} {craft_id} is not the placeholder box ({info['src']})")
        check(f"{craft_id}.glb" in info["src"], f"{tag} {craft_id} src is the craft GLB")
        check(info["bannerHidden"], f"{tag} {craft_id} fallback banner is hidden")
        check(info["ar"] and info["cameraControls"], f"{tag} {craft_id} ar and camera-controls")
        check(info["arModes"] == "webxr scene-viewer quick-look", f"{tag} {craft_id} ar-modes")
        want_scale = "auto" if craft_id in AR_AUTO_IDS else "fixed"
        check(info["arScale"] == want_scale, f"{tag} {craft_id} ar-scale {info['arScale']} (want {want_scale})")
        check(info["touchAction"] == "pan-y", f"{tag} {craft_id} touch-action")
        check(info["iosSrc"] and f"{craft_id}.usdz" in info["iosSrc"], f"{tag} {craft_id} ios-src set")
        if craft_id in ("iss", "chandra"):
            check(info["cameraOrbit"] == "45deg 70deg auto", f"{tag} {craft_id} camera-orbit {info['cameraOrbit']}")
        # Placeholder box is 1x1x1 m. Real models should not all be 1 m on every axis.
        dim = info["dim"]
        is_unit_cube = all(abs(v - 1) < 0.02 for v in dim)
        check(not is_unit_cube, f"{tag} {craft_id} dimensions are not the 1 m box {dim}")
    check(page.locator("#craftName").inner_text() != "", f"{tag} {craft_id} fact panel has a name")
    credit_text = page.locator("#credit").inner_text()
    craft_row = next(c for c in FLEET["craft"] if c["id"] == craft_id)
    expected_credit = craft_row.get("credit") or "3D model courtesy NASA"
    check(expected_credit in credit_text, f"{tag} {craft_id} credit matches fleet")
    if "commercial" in (craft_row.get("tags") or []):
        check("3D model courtesy NASA" not in credit_text, f"{tag} {craft_id} has no NASA credit")
        check("Angelo" in credit_text and "not an official SpaceX model" in credit_text, f"{tag} {craft_id} Angelo commercial credit")
    else:
        check("3D model courtesy NASA" in credit_text, f"{tag} {craft_id} NASA credit")
    facts_text = page.locator("#facts").inner_text()
    if craft_id in UNVERIFIED_IDS:
        n_rows = page.locator("#facts dt").count()
        check(page.locator("#facts .ph-label").count() == n_rows, f"{tag} {craft_id} unverified rows are labelled PLACEHOLDER pending Tesla")
    else:
        check("PLACEHOLDER" not in facts_text, f"{tag} {craft_id} facts are not placeholders")
        check(page.locator("#facts .ph-label").count() == 0, f"{tag} {craft_id} has no placeholder labels")
    check(len(facts_text.strip()) > 0, f"{tag} {craft_id} fact panel has text")
    if craft_id == "juno":
        dim = info["dim"] if info else [0, 0, 0]
        check(max(dim) > 19.5, f"{tag} juno array span is about 20.1 m (dims {dim})")
    if craft_id == "mars-odyssey":
        check("one of the spinning wheels" in facts_text, f"{tag} mars-odyssey status uses Tesla wording")
    if craft_id == "aqua":
        check("out of fuel for orbit boosts" in facts_text, f"{tag} aqua status uses Tesla wording")
    if craft_id == "spirit-opportunity":
        check("until Perseverance passed it in October 2026" in facts_text, f"{tag} spirit-opportunity fun fact uses Tesla wording")
    if craft_id == "soho":
        sub = page.locator("#subtitle").inner_text()
        check(sub == "Has watched the Sun for three decades", f"{tag} soho subtitle uses Tesla wording ({sub!r})")
    if craft_id == "voyager":
        check("Voyager 1 has sent only a basic radio signal" in facts_text, f"{tag} voyager status uses Tesla wording")
        check("about 722 kg each at launch" in facts_text, f"{tag} voyager mass uses Tesla wording")
    if craft_id == "iss":
        check("about 420,000 kg" in facts_text, f"{tag} iss mass uses Tesla wording")
    if craft_id == "perseverance":
        check("Science is paused while engineers fix a radio problem" in facts_text, f"{tag} perseverance status uses Tesla wording")

    check(not overflow_x(page), f"{tag} {craft_id} does not overflow horizontally")
    if take_shot:
        shot(page, f"viewer-{craft_id}-{tag}.png")
    touch = page.evaluate("() => navigator.maxTouchPoints > 0")
    before, after = touch_drag_model(page) if touch else drag_model(page)
    moved = before != after and before != "" and after != ""
    check(moved, f"{tag} {craft_id} {'touch' if touch else 'mouse'} drag-rotate changed camera ({before} -> {after})")
    if take_drag:
        shot(page, f"viewer-after-drag-{craft_id}-{tag}.png")
    errs = hard_errors(page)
    check(errs == [], f"{tag} {craft_id} no console errors {errs}")
    stats = first_load_bytes(page) if measure else None
    if measure:
        check(stats["usdzBytes"] == 0, f"{tag} {craft_id} first load does not fetch USDZ ({stats['usdzBytes']})")
    page.close()
    return stats


def run_not_found(context, base, tag):
    page = open_page(context, base + "/study-spaceship?id=does-not-exist")
    page.wait_for_selector("#missing:visible", timeout=10000)
    check(page.locator("#missing").is_visible(), f"{tag} unknown id shows a not-found state")
    shot(page, f"viewer-missing-{tag}.png")
    errs = hard_errors(page)
    check(errs == [], f"{tag} not-found has no console errors {errs}")
    page.close()


def disk_weights():
    models = ROOT / "spaceships/models"
    stills = ROOT / "spaceships/stills"
    def sized(paths):
        rows = []
        for path in paths:
            rows.append((path.name, path.stat().st_size))
        return rows
    glbs = sized(sorted(p for p in models.glob("*.glb") if p.name != "_placeholder.glb"))
    usdz = sized(sorted(models.glob("*.usdz")))
    webp = sized(sorted(p for p in stills.glob("*.webp") if p.name != "_placeholder.webp"))
    return {
        "glbBytes": sum(s for _, s in glbs),
        "usdzBytes": sum(s for _, s in usdz),
        "stillBytes": sum(s for _, s in webp),
        "glbCount": len(glbs),
        "usdzCount": len(usdz),
        "stillCount": len(webp),
        "glbs": glbs,
        "usdz": usdz,
        "stills": webp,
        "jwstUsdzBytes": (models / "jwst.usdz").stat().st_size,
        "meshoptBytes": (ROOT / "vendor/model-viewer/meshopt_decoder.js").stat().st_size,
        "modelViewerBytes": (ROOT / "vendor/model-viewer/model-viewer.min.js").stat().st_size,
    }


def main():
    if REMOTE_BASE:
        server, base = None, REMOTE_BASE
    else:
        server, base = start_server()
    print("SERVER", base)
    print("CRAFT", len(CRAFT_IDS), CRAFT_IDS)
    weights = {"disk": disk_weights(), "firstLoad": {}}
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(channel="chrome", headless=True, args=["--no-sandbox", "--disable-dev-shm-usage"])
            for tag, opts in (("iphone-390", IPHONE), ("iphone-375", IPHONE_SE), ("desktop", DESKTOP)):
                # Fresh context for gallery first-load measurement.
                context = browser.new_context(**opts)
                stats = run_gallery(context, base, tag, measure=(tag == "iphone-390"))
                if stats:
                    weights["firstLoad"]["gallery-iphone-390"] = stats
                    print(f"FIRST-LOAD gallery-iphone-390 {stats['bytes']} bytes, {stats['count']} files")
                if tag == "iphone-390":
                    run_not_found(context, base, tag)
                context.close()

                for craft_id in CRAFT_IDS:
                    context = browser.new_context(**opts)
                    take_shot = tag in SHOT_ALL_ON or craft_id in SHOT_SAMPLE
                    take_drag = take_shot and craft_id in {"voyager", "iss", "chandra"}
                    measure = tag == "iphone-390" and craft_id in {"voyager", "jwst", "iss", "ingenuity"}
                    stats = run_viewer(
                        context, base, tag, craft_id,
                        measure=measure, take_shot=take_shot, take_drag=take_drag,
                    )
                    if stats:
                        key = f"viewer-{craft_id}-{tag}"
                        weights["firstLoad"][key] = stats
                        print(f"FIRST-LOAD {key} {stats['bytes']} bytes, {stats['count']} files, usdz {stats['usdzBytes']}")
                    context.close()
            browser.close()
    finally:
        if server:
            server.shutdown()

    # Drop bulky file lists from the saved report after printing the headline numbers.
    slim = {
        "disk": {
            "glbBytes": weights["disk"]["glbBytes"],
            "usdzBytes": weights["disk"]["usdzBytes"],
            "stillBytes": weights["disk"]["stillBytes"],
            "totalCraftAssets": weights["disk"]["glbBytes"] + weights["disk"]["usdzBytes"] + weights["disk"]["stillBytes"],
            "glbCount": weights["disk"]["glbCount"],
            "usdzCount": weights["disk"]["usdzCount"],
            "stillCount": weights["disk"]["stillCount"],
            "jwstUsdzBytes": weights["disk"]["jwstUsdzBytes"],
            "meshoptBytes": weights["disk"]["meshoptBytes"],
            "modelViewerBytes": weights["disk"]["modelViewerBytes"],
            "glbs": weights["disk"]["glbs"],
            "usdz": weights["disk"]["usdz"],
            "stills": weights["disk"]["stills"],
        },
        "firstLoad": {
            key: {"bytes": val["bytes"], "count": val["count"], "usdzBytes": val["usdzBytes"],
                  "top": val["files"][:8]}
            for key, val in weights["firstLoad"].items()
        },
    }
    (OUT / "weights.json").write_text(json.dumps(slim, indent=2) + "\n")
    print("DISK", {kk: vv for kk, vv in slim["disk"].items() if not isinstance(vv, list)})
    print("FIRST-LOAD-SUMMARY", {k2: v2["bytes"] for k2, v2 in slim["firstLoad"].items()})
    print("FAILURES", failures)
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
