// Shared responsive checks for every study module.
// Used by responsive.test.mjs (phone + tablet gate) and responsive-audit.mjs (full audit with shots).
import http from "node:http";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";

export const ROOT = process.env.PB_ROOT || new URL("../public/", import.meta.url).pathname;
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".json": "application/json", ".woff2": "font/woff2", ".svg": "image/svg+xml", ".glb": "model/gltf-binary" };

export const SIZES = {
  "360x740": { width: 360, height: 740, touch: true },
  "390x844": { width: 390, height: 844, touch: true },
  "430x932": { width: 430, height: 932, touch: true },
  "844x390": { width: 844, height: 390, touch: true },
  "768x1024": { width: 768, height: 1024, touch: true },
  "1024x768": { width: 1024, height: 768, touch: true },
  "1280x800": { width: 1280, height: 800, touch: false }
};
export const MIN_TEXT_PX = 13;
export const MIN_TAP_PX = 44;

// Every study page, plus each ?mode= variant a page links to or reads.
export function listPages() {
  const files = readdirSync(ROOT).filter((f) => /^study(-[a-z0-9-]+)?\.html$/.test(f)).sort();
  const pages = [];
  for (const f of files) {
    pages.push({ name: f.replace(/\.html$/, ""), path: "/" + f });
    const src = readFileSync(join(ROOT, f), "utf8");
    const modes = new Set([...src.matchAll(/[?&]mode=([a-z][a-z0-9-]{2,})/g)].map((m) => m[1]));
    for (const m of [...src.matchAll(/get\("mode"\)\s*[!=]==?\s*"([a-z0-9-]+)"/g)]) modes.add(m[1]);
    for (const m of modes) pages.push({ name: `${f.replace(/\.html$/, "")}--${m}`, path: `/${f}?mode=${m}` });
  }
  return pages;
}

export function serve(port = 0) {
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://127.0.0.1");
      let p = decodeURIComponent(url.pathname); if (p.endsWith("/")) p += "index.html";
      let file = join(ROOT, p); if (!existsSync(file) && existsSync(file + ".html")) file += ".html";
      const body = await readFile(file);
      res.writeHead(200, { "content-type": TYPES[extname(file)] || "application/octet-stream" }); res.end(body);
    } catch { res.writeHead(404); res.end("not found"); }
  });
  return new Promise((r) => server.listen(port, "127.0.0.1", () => r({ server, base: `http://127.0.0.1:${server.address().port}` })));
}

export function chromePath() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const home = process.env.HOME || "";
  const pw = join(home, ".cache/ms-playwright");
  if (existsSync(pw)) for (const d of readdirSync(pw).filter((d) => /^chromium-\d+$/.test(d)).sort().reverse()) {
    for (const sub of ["chrome-linux64/chrome", "chrome-linux/chrome"]) if (existsSync(join(pw, d, sub))) return join(pw, d, sub);
  }
  for (const p of ["/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"]) if (existsSync(p)) return p;
  return null;
}

// Preload: force a theme for every module's own theme key before first paint.
export function themeInit(theme) {
  const v = theme === "paper" ? "light" : "dark";
  return `(() => { const v = ${JSON.stringify(v)}; const g = Storage.prototype.getItem;
    Storage.prototype.getItem = function (k) { return /theme$/.test(String(k)) ? v : g.call(this, k); }; })();`;
}

// Static checks on the page source and its CSS (safe area, 100vh, viewport).
export function staticChecks(pagePath) {
  const file = join(ROOT, pagePath.split("?")[0]);
  const html = readFileSync(file, "utf8");
  const css = [html];
  for (const m of html.matchAll(/href="([^"]+\.css)"/g)) { if (m[1].includes("shared/layout/")) continue; const f = join(ROOT, m[1]); if (existsSync(f)) css.push(readFileSync(f, "utf8")); }
  const all = css.join("\n");
  const issues = [];
  const vp = (html.match(/<meta[^>]+name="viewport"[^>]*>/) || [""])[0];
  if (!vp) issues.push({ kind: "viewport-meta", detail: "no viewport meta" });
  else if (!/viewport-fit=cover/.test(vp)) issues.push({ kind: "safe-area", detail: "viewport meta lacks viewport-fit=cover" });
  if (/position:\s*fixed/.test(all) && !/safe-area-inset/.test(all)) issues.push({ kind: "safe-area", detail: "fixed elements but no env(safe-area-inset-*) anywhere" });
  const vh = all.split("\n").filter((l) => /\b100vh\b/.test(l) && !/dvh|svh/.test(l));
  if (vh.length) issues.push({ kind: "100vh", detail: `${vh.length} rule(s) use 100vh with no dvh/svh fallback on the same line: ${vh[0].trim().slice(0, 120)}` });
  return issues;
}

// Runs inside the page. Returns a list of { kind, detail, rect }.
export function pageChecks({ minText, minTap, touch }) {
  const vw = document.documentElement.clientWidth, vh = innerHeight, out = [];
  const add = (kind, el, detail) => { const r = el?.getBoundingClientRect?.(); out.push({ kind, detail, sel: el ? describe(el) : "", rect: r ? [r.left, r.top, r.width, r.height].map(Math.round) : null }); };
  function describe(el) { let s = el.tagName.toLowerCase(); if (el.id) s += "#" + el.id; else if (el.classList.length) s += "." + [...el.classList].slice(0, 2).join("."); const t = (el.innerText || el.value || el.getAttribute("aria-label") || "").trim().replace(/\s+/g, " ").slice(0, 30); return t ? `${s} "${t}"` : s; }
  function visible(el) {
    if (el.closest(".sr-only,[hidden],[aria-hidden=true],template,noscript")) return false;
    const cs = getComputedStyle(el); if (cs.visibility === "hidden" || cs.display === "none" || +cs.opacity === 0) return false;
    const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false;
    if (r.bottom <= 0 || r.top >= vh) return false; // only what is on screen now
    for (let p = el; p && p !== document.body; p = p.parentElement) { const c = getComputedStyle(p); if (+c.opacity === 0 || c.visibility === "hidden") return false; if (c.clipPath && c.clipPath !== "none" && /inset\(50%|rect\(0/.test(c.clipPath)) return false; }
    return true;
  }
  function ownText(e) { return [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 0); }
  // A container that paints nothing (no background, border or shadow) does not hide what is under it.
  function transparentBox(t) {
    if (t.matches("canvas,img,svg,video,input,select,textarea,button,iframe")) return false;
    const c = getComputedStyle(t);
    const bg = c.backgroundColor, clear = bg === "transparent" || /rgba\([^)]*,\s*0\)$/.test(bg);
    if (!clear || c.backgroundImage !== "none" || c.boxShadow !== "none" || c.backdropFilter && c.backdropFilter !== "none") return false;
    return !ownText(t);
  }
  function modalLayer(t) { for (let p = t; p && p !== document.body; p = p.parentElement) { const c = getComputedStyle(p); if (c.position === "fixed") { const r = p.getBoundingClientRect(); if (r.width >= vw * 0.95 && r.height >= vh * 0.9) return true; } } return false; }
  function pinned(t) { for (let p = t; p && p !== document.body; p = p.parentElement) { const c = getComputedStyle(p).position; if (c === "fixed" || c === "sticky") return true; } return false; }
  function scrollParent(t) { for (let p = t.parentElement; p && p !== document.body; p = p.parentElement) { const o = getComputedStyle(p).overflowY; if ((o === "auto" || o === "scroll") && p.scrollHeight > p.clientHeight + 1) return p; } return document.scrollingElement; }
  function inScroller(el) { for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) { const o = getComputedStyle(p).overflowX; if ((o === "auto" || o === "scroll" || o === "hidden") && p.scrollWidth > p.clientWidth + 1) return p; } return null; }
  const de = document.documentElement;
  // elementFromPoint skips pointer-events:none, so turn hit testing on for everything while checking.
  const pe = document.createElement("style"); pe.textContent = "*,*::before,*::after{pointer-events:auto!important}"; document.head.appendChild(pe);
  try { return run(); } finally { pe.remove(); }
  function run() {
  if (de.scrollWidth > de.clientWidth + 1) out.push({ kind: "overflow-x", detail: `scrollWidth ${de.scrollWidth} > clientWidth ${de.clientWidth}`, sel: "html", rect: null });

  const all = [...document.body.querySelectorAll("*")].filter((e) => !/^(SCRIPT|STYLE|LINK|META|BR|OPTION|svg|g|path)$/.test(e.tagName));
  const vis = all.filter(visible);
  const controls = vis.filter((e) => e.matches("button,a[href],input:not([type=hidden]),select,textarea,[role=button],[role=tab],[role=slider],summary,label:has(input[type=checkbox]),label:has(input[type=radio])"));
  const texts = vis.filter((e) => ownText(e) && !/^(CANVAS)$/.test(e.tagName));
  const toasts = vis.filter((e) => /toast/i.test(e.id + " " + e.className));
  const subjects = [...new Set([...texts, ...controls, ...toasts])];

  for (const e of subjects) {
    const r = e.getBoundingClientRect();
    if ((r.right > vw + 1 || r.left < -1) && !inScroller(e) && getComputedStyle(e).position !== "fixed" || (getComputedStyle(e).position === "fixed" && (r.right > vw + 1 || r.left < -1))) add("offscreen-x", e, `spans ${Math.round(r.left)}..${Math.round(r.right)} of ${vw}`);
  }
  // Overlap: sample points across each text/control; the top element there must be it, inside it, or its ancestor.
  const seen = new Set();
  for (const e of subjects) {
    const r = e.getBoundingClientRect(); const pts = [];
    const x0 = Math.max(r.left + 2, 1), x1 = Math.min(r.right - 2, vw - 1), y0 = Math.max(r.top + 2, 1), y1 = Math.min(r.bottom - 2, vh - 1);
    if (x1 <= x0 || y1 <= y0) continue;
    for (const fx of [0.15, 0.5, 0.85]) pts.push([x0 + (x1 - x0) * fx, y0 + (y1 - y0) * 0.5]);
    let hits = 0, by = null;
    for (const [x, y] of pts) {
      const top = document.elementFromPoint(x, y); if (!top) continue;
      if (top === e || e.contains(top) || top.contains(e)) continue;
      // label wrapping its input, or a sibling text inside the same control, is fine
      if (transparentBox(top)) continue;
      if (modalLayer(top) && !modalLayer(e)) continue;
      if (top.closest("dialog[open],[role=dialog],[role=alertdialog],[aria-modal=true]") && !e.closest("dialog[open],[role=dialog],[role=alertdialog],[aria-modal=true]")) continue; // a modal is meant to cover the page
      // Page content scrolling under a fixed bar is fine unless it is stuck there at the end of the scroll.
      // A bar at the bottom is a problem only at the end of the scroll; a bar at the top only at the start.
      if (pinned(top) && !pinned(e)) {
        const sc = scrollParent(e), tr = top.getBoundingClientRect(), atBottom = tr.top + tr.height / 2 > vh / 2;
        if (atBottom ? sc.scrollTop + sc.clientHeight < sc.scrollHeight - 2 : sc.scrollTop > 2) continue;
      }
      const ctl = e.closest("button,label,a,[role=button]"); if (ctl && ctl.contains(top)) continue;
      hits++; by = top;
    }
    if (hits >= 2) { const key = describe(e) + "|" + describe(by); if (!seen.has(key)) { seen.add(key); add("overlap", e, `covered by ${describe(by)}`); } }
  }
  if (touch) for (const e of controls) {
    if (e.matches("a") && e.closest("p,li,dd,td") && getComputedStyle(e).display === "inline") continue; // inline links exempt
    if (e.matches("input[type=checkbox],input[type=radio]") && e.closest("label")) continue; // label is the target
    if (e.matches("label") ) continue;
    const r = e.getBoundingClientRect();
    if (r.width < minTap - 0.5 || r.height < minTap - 0.5) add("tap-target", e, `${Math.round(r.width)}x${Math.round(r.height)}px`);
  }
  for (const e of texts) {
    const cs = getComputedStyle(e), fs = parseFloat(cs.fontSize);
    if (fs < minText - 0.05) add("small-text", e, `${fs}px`);
    if ((cs.textOverflow === "ellipsis" || cs.overflow === "hidden" || cs.overflowX === "hidden") && e.scrollWidth > e.clientWidth + 1 && e.clientWidth > 0) add("clipped-label", e, `${e.scrollWidth}px of text in ${e.clientWidth}px`);
  }
  if (touch) for (const e of vis.filter((e) => e.matches("input:not([type=range]):not([type=checkbox]):not([type=radio]):not([type=button]):not([type=color]),select,textarea"))) {
    const fs = parseFloat(getComputedStyle(e).fontSize); if (fs < 16) add("input-zoom", e, `${fs}px font (iOS zooms under 16px)`);
  }
  // Sheet vs stage and caption.
  const sheet = document.querySelector(".fun-sheet-on, .fun-sheet");
  const canvases = [...document.querySelectorAll("canvas")].filter(visible).sort((a, b) => b.clientWidth * b.clientHeight - a.clientWidth * a.clientHeight);
  const stage = canvases[0];
  if (sheet && visible(sheet) && stage) {
    const s = sheet.getBoundingClientRect(), c = stage.getBoundingClientRect();
    const visTop = Math.max(c.top, 0), visBot = Math.min(c.bottom, vh), stageH = visBot - visTop;
    const cover = Math.max(0, visBot - Math.max(s.top, visTop));
    const snap = sheet.dataset.snap || "";
    if (stageH > 0 && snap !== "full" && cover / stageH > 0.5) add("sheet-covers-stage", sheet, `sheet (${snap || "?"}) covers ${Math.round(100 * cover / stageH)}% of the stage`);
    if (snap === "half") {
      const cap = [...document.querySelectorAll("[id*=Cap],[id*=cap],[class*=caption],figcaption,[class*=stage-cap]")].filter(visible).filter((x) => !sheet.contains(x)).sort((a, b) => b.getBoundingClientRect().bottom - a.getBoundingClientRect().bottom)[0];
      if (cap) { const cb = cap.getBoundingClientRect().bottom; const gap = s.top - cb; if (gap < -1 || gap > 48) add("sheet-half-stop", sheet, `half stop top ${Math.round(s.top)} vs caption bottom ${Math.round(cb)} (gap ${Math.round(gap)}px)`); }
    }
  }
  if (stage) {
    const c = stage.getBoundingClientRect();
    if (c.width < vw * 0.72 && c.height > vh * 0.35) {
      const band = c.left > vw - c.right ? [0, c.left] : [c.right, vw];
      if (band[1] - band[0] > vw * 0.2) {
        let empty = 0; for (const fy of [0.3, 0.5, 0.7]) { const t = document.elementFromPoint((band[0] + band[1]) / 2, c.top + c.height * fy); if (!t || t === document.body || t === de || (!ownText(t) && !t.matches("button,input,canvas,svg,img") && t.children.length > 0 && !t.innerText?.trim())) empty++; }
        if (empty === 3) add("stage-gap", stage, `stage ${Math.round(c.width)}px wide leaves an empty ${Math.round(band[1] - band[0])}px band`);
      }
    }
  }
  return out;
  }
}

// Try to put the page in its busiest state: sheet fully open, a toast showing, details open.
export async function makeBusy(page) {
  await page.evaluate(async () => {
    for (const d of document.querySelectorAll("details")) d.open = true;
    const h = document.querySelector(".fun-sheet-on [id*=andle], .fun-sheet-on [class*=andle], [id$=Handle], #sheetHandle");
    if (h) { h.focus(); for (let i = 0; i < 3; i++) h.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true })); }
    const t = [...document.querySelectorAll("[id*=oast],[class*=toast]")][0];
    // scroll page and every scroller to the end so content stuck under fixed bars shows up
    for (const el of [document.scrollingElement, ...document.querySelectorAll("*")]) { const o = el === document.scrollingElement ? "auto" : getComputedStyle(el).overflowY; if ((o === "auto" || o === "scroll") && el.scrollHeight > el.clientHeight + 1) el.scrollTop = el.scrollHeight; }
    if (t) { t.hidden = false; t.removeAttribute("hidden"); if (!t.textContent.trim()) t.textContent = "Link copied. Paste it anywhere to share this exact setup."; t.classList.add("show", "on", "visible"); }
  });
  await new Promise((r) => setTimeout(r, 900));
}
