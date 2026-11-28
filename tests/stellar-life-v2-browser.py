"""Stellar Life Cycle VR v2: no text overlaps on desktop (1280x800) or phone (390x844), in the page and in the 3D scene.
Checks every stage of every mass at three moments: DOM text never overlaps other DOM text, 3D labels never overlap each
other, and no 3D label sits under the page's cards (the panel, the H-R card, the top bar). Also checks that the H-R card's
in-plot labels never overlap each other or a marker (they are placed by placeLabels).
Run with a static server on public/: python3 -m http.server 8799 --bind 127.0.0.1, then python3 tests/stellar-life-v2-browser.py"""
import os, sys, json
from playwright.sync_api import sync_playwright

BASE = os.environ.get("SL_BASE", "http://127.0.0.1:8799") + "/study-stellar-life.html?manual=1&shot=1"
ARGS = ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--no-sandbox"]
CHROME = os.environ.get("CHROME", "/usr/bin/google-chrome")
fails = []

DOM_JS = r"""() => {
  const out = []; const vw = innerWidth, vh = innerHeight;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n; while ((n = walker.nextNode())) {
    if (!n.textContent.trim()) continue; const el = n.parentElement; if (!el || el.closest("canvas,script,style,noscript,[hidden],details:not([open]) > :not(summary)")) continue;
    if (el.checkVisibility && !el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
    const rg = document.createRange(); rg.selectNodeContents(n);
    for (const r of rg.getClientRects()) {
      let x0 = Math.max(r.left, 0), y0 = Math.max(r.top, 0), x1 = Math.min(r.right, vw), y1 = Math.min(r.bottom, vh);
      for (let a = el; a && a !== document.body; a = a.parentElement) { const cs = getComputedStyle(a); if (cs.overflowX !== "visible" || cs.overflowY !== "visible") { const b = a.getBoundingClientRect(); x0 = Math.max(x0, b.left); y0 = Math.max(y0, b.top); x1 = Math.min(x1, b.right); y1 = Math.min(y1, b.bottom); } }
      if (x1 - x0 > 2 && y1 - y0 > 2) out.push({ t: n.textContent.trim().slice(0, 40), x: x0, y: y0, w: x1 - x0, h: y1 - y0, id: out.length, el: el.tagName + "." + el.className });
    }
  }
  const cards = ["#slPanel", "#slHR", "#slTop", ".sl-hrcard", ".sl-top", ".sl-panel"].map((s) => document.querySelector(s)).filter((e) => e && e.checkVisibility && e.checkVisibility({ opacityProperty: true, visibilityProperty: true }))
    .map((e) => { const b = e.getBoundingClientRect(); return { t: e.id || e.className, x: b.left, y: b.top, w: b.width, h: b.height }; }).filter((b) => b.w > 0 && b.h > 0);
  return { text: out, cards };
}"""

def ov(a, b, pad=1):
    return a["x"] < b["x"] + b["w"] - pad and b["x"] < a["x"] + a["w"] - pad and a["y"] < b["y"] + b["h"] - pad and b["y"] < a["y"] + a["h"] - pad

def check_page(pg, label):
    d = pg.evaluate(DOM_JS); T = d["text"]
    for i in range(len(T)):
        for j in range(i + 1, len(T)):
            if ov(T[i], T[j], 2): fails.append(f"{label}: DOM text '{T[i]['t']}' overlaps '{T[j]['t']}'")
    L = pg.evaluate("__stellar.labelRects()")
    vw, vh = pg.evaluate("[innerWidth, innerHeight]")
    for i in range(len(L)):
        a = L[i]
        if a["x"] + a["w"] < 0 or a["x"] > vw or a["y"] + a["h"] < 0 or a["y"] > vh: continue
        for j in range(i + 1, len(L)):
            if ov(a, L[j], 2): fails.append(f"{label}: 3D label '{a['text']}' overlaps '{L[j]['text']}'")
        for c in d["cards"]:
            if ov(a, c, 4): fails.append(f"{label}: 3D label '{a['text']}' sits under {c['t']}")
    if os.environ.get("SL_DEBUG"): print(label, len(T), "texts", len(L), "labels", [l["text"] for l in L], len(d["cards"]), "cards")
    hr = pg.evaluate("window.__stellarHRLabels || []")
    for i in range(len(hr)):
        for j in range(i + 1, len(hr)):
            if ov(hr[i], hr[j], 0): fails.append(f"{label}: H-R label '{hr[i]['text']}' overlaps '{hr[j]['text']}'")

STAGES = json.loads(os.environ.get("SL_STAGES", "null") or "null")

def run(w, h, tag, mobile=False):
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=CHROME, args=ARGS)
        pg = b.new_page(viewport={"width": w, "height": h}, is_mobile=mobile, has_touch=mobile, device_scale_factor=1)
        errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.goto(BASE); pg.wait_for_function("window.__stellar && window.__stellar.flow", timeout=60000)
        n = 0
        plan = STAGES
        if not plan:
            plan = []
            for m in ["0.2", "1", "3", "15", "40"]:
                ids = pg.evaluate(f"(() => {{ __stellar.goto('{m}', 'F1', 0); return __stellar.flow.st.stages.map((s) => s.id); }})()")
                plan += [[m, s] for s in ids]
        for m, sid in plan:
            for t in (0.1, 0.6, 1.0):
                pg.evaluate(f"__stellar.goto('{m}','{sid}',{t})")
                for k in range(24): pg.evaluate(f"__stellar.renderAt({k}/20, 0.05)")
                check_page(pg, f"{tag} {m} {sid} t={t}"); n += 1
        for e in errs: fails.append(f"{tag}: page error {e}")
        b.close()
        return n

if __name__ == "__main__":
    total = run(1280, 800, "desktop") + run(390, 844, "phone", mobile=True)
    seen = []
    for f in fails:
        if f not in seen: seen.append(f)
    print(f"checked {total} states; {len(seen)} overlap(s)")
    for f in seen[:80]: print("FAIL", f)
    sys.exit(1 if seen else 0)
