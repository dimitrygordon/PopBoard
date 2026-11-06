// Full-view on-stage text must never clip, scroll, ellipsize, or line-clamp.
// Requires Chrome + a local static server serving public/ (DIY_PBL_URL).
import { test } from "node:test";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

const BASE = process.env.DIY_PBL_URL || "http://127.0.0.1:8792";
const CHROME = process.env.CHROME_PATH || "/usr/bin/google-chrome";
const PUPPETEER = process.env.PUPPETEER_PATH ||
  "/workspace/PopBoard-diy-polish/tests/node_modules_local/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js";

const VIEWPORTS = [
  { name: "390x844", width: 390, height: 844, mobile: true },
  { name: "768x1024", width: 768, height: 1024, mobile: true },
  { name: "1280x720", width: 1280, height: 720, mobile: false },
  { name: "1920x1080", width: 1920, height: 1080, mobile: false },
];

const STAGE_TEXT_SELS = [
  ".bs-idea-panel",
  ".bs-idea-title",
  ".bs-idea-bullets",
  ".bs-idea-cite",
  ".bs-surface--titleblock",
  ".s01-book",
  ".s01-author",
  ".bs-takeaways",
  ".bs-discuss",
  ".bs-resources-panel",
  ".bs-term-text",
  ".s09-genre",
  ".s10-lab-rev",
  ".s10-lab-cost",
  ".s10-lab-be",
  ".s10-birac-letter",
  ".bs-dq-card",
];

async function settle(page) {
  await page.evaluate(() => {
    document.body.classList.add("fl-full");
    window.__bs?.setCollapsed?.(true);
    document.querySelectorAll(".bs-scene").forEach((s) => {
      s.classList.remove("is-drawing");
      s.classList.add("is-drawn", "is-settled");
    });
    document.querySelectorAll(".bs-drawin").forEach((c) => c.remove());
    document.querySelectorAll(".bs-bg").forEach((b) => {
      b.style.visibility = "";
      b.style.opacity = "1";
    });
    document.querySelectorAll(".bs-reveal").forEach((el) => el.classList.add("is-in"));
  });
  // Allow double-rAF fitters to finish
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  await new Promise((r) => setTimeout(r, 300));
}

function launchOpts() {
  return {
    executablePath: CHROME,
    args: ["--no-sandbox", "--disk-cache-size=1"],
    headless: "new",
  };
}

test("keyterms: no clip/ellipsis/line-clamp; scroll fits at 390/768/1280/1920", async (t) => {
  let puppeteer;
  try {
    puppeteer = (await import(pathToFileURL(PUPPETEER).href)).default;
  } catch (e) {
    t.skip("puppeteer-core not available: " + e.message);
    return;
  }
  let browser;
  try {
    browser = await puppeteer.launch(launchOpts());
  } catch (e) {
    t.skip("Chrome launch failed: " + e.message);
    return;
  }
  try {
    const probe = await browser.newPage();
    try {
      await probe.goto(`${BASE}/study-diy-pbl-bookshare.html?page=17&full=1`, {
        waitUntil: "domcontentloaded", timeout: 8000,
      });
    } catch (e) {
      t.skip(`server not reachable at ${BASE}: ${e.message}`);
      return;
    }
    await probe.close();

    const failures = [];
    for (const vp of VIEWPORTS) {
      const page = await browser.newPage();
      await page.setViewport({
        width: vp.width, height: vp.height, deviceScaleFactor: 1,
        isMobile: !!vp.mobile, hasTouch: !!vp.mobile,
      });
      await page.setCacheEnabled(false);
      await page.goto(`${BASE}/study-diy-pbl-bookshare.html?page=17&full=1`, {
        waitUntil: "networkidle0", timeout: 60000,
      });
      await settle(page);
      const rows = await page.evaluate(() => {
        const out = [];
        for (const card of document.querySelectorAll(".bs-term-card")) {
          const text = card.querySelector(".bs-term-text");
          const pin = card.querySelector(".bs-paper-pin");
          if (!text || !pin) { out.push({ bad: "missing text/pin" }); continue; }
          const cs = getComputedStyle(text);
          const cr = card.getBoundingClientRect();
          const tr = text.getBoundingClientRect();
          const pr = pin.getBoundingClientRect();
          const pad = 1;
          const textInside =
            tr.left >= cr.left - pad && tr.right <= cr.right + pad &&
            tr.top >= cr.top - pad && tr.bottom <= cr.bottom + pad;
          const overlap = !(pr.right < tr.left || pr.left > tr.right || pr.bottom < tr.top || pr.top > tr.bottom);
          out.push({
            id: card.dataset.cardId || "",
            text: (text.textContent || "").trim(),
            scrollW: text.scrollWidth,
            clientW: text.clientWidth,
            scrollH: text.scrollHeight,
            clientH: text.clientHeight,
            overflowX: text.scrollWidth > text.clientWidth + 0.5,
            overflowY: text.scrollHeight > text.clientHeight + 0.5,
            ellipsis: cs.textOverflow === "ellipsis",
            lineClamp: cs.webkitLineClamp && cs.webkitLineClamp !== "none" && cs.webkitLineClamp !== "unset" && Number(cs.webkitLineClamp) > 0,
            textInside,
            overlap,
            fontSize: cs.fontSize,
          });
        }
        return out;
      });
      if (!rows.length) failures.push(`${vp.name}: no term cards`);
      for (const r of rows) {
        if (r.bad) failures.push(`${vp.name}: ${r.bad}`);
        if (r.overflowX) failures.push(`${vp.name}: scrollWidth>clientWidth (${r.id} "${r.text}" ${r.scrollW}>${r.clientW})`);
        if (r.overflowY) failures.push(`${vp.name}: scrollHeight>clientHeight (${r.id} "${r.text}" ${r.scrollH}>${r.clientH})`);
        if (r.ellipsis) failures.push(`${vp.name}: text-overflow:ellipsis (${r.id})`);
        if (r.lineClamp) failures.push(`${vp.name}: line-clamp truncation (${r.id})`);
        if (r.textInside === false) failures.push(`${vp.name}: text outside card (${r.id} "${r.text}")`);
        if (r.overlap) failures.push(`${vp.name}: pin overlaps text (${r.id} "${r.text}")`);
      }
      await page.close();
    }
    assert.equal(failures.length, 0, failures.join("\n"));
  } finally {
    await browser.close();
  }
});

test("all on-stage text at 390: no vertical/horizontal clip", async (t) => {
  let puppeteer;
  try {
    puppeteer = (await import(pathToFileURL(PUPPETEER).href)).default;
  } catch (e) {
    t.skip("puppeteer-core not available: " + e.message);
    return;
  }
  let browser;
  try {
    browser = await puppeteer.launch(launchOpts());
  } catch (e) {
    t.skip("Chrome launch failed: " + e.message);
    return;
  }
  try {
    const probe = await browser.newPage();
    try {
      await probe.goto(`${BASE}/study-diy-pbl-bookshare.html?page=1&full=1`, {
        waitUntil: "domcontentloaded", timeout: 8000,
      });
    } catch (e) {
      t.skip(`server not reachable at ${BASE}: ${e.message}`);
      return;
    }
    await probe.close();

    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    await page.setCacheEnabled(false);
    const report = [];
    const failures = [];
    for (let n = 1; n <= 21; n++) {
      await page.goto(`${BASE}/study-diy-pbl-bookshare.html?page=${n}&full=1`, {
        waitUntil: "networkidle0", timeout: 60000,
      });
      await settle(page);
      const rows = await page.evaluate((sels) => {
        const out = [];
        const seen = new Set();
        for (const sel of sels) {
          for (const el of document.querySelectorAll(sel)) {
            if (!el.closest(".fl-art, .bs-scene, .fl-scene")) continue;
            if (seen.has(el)) continue;
            seen.add(el);
            const cs = getComputedStyle(el);
            if (cs.display === "none" || cs.visibility === "hidden" || Number(cs.opacity) === 0) continue;
            const txt = (el.innerText || el.textContent || "").trim();
            if (!txt) continue;
            const sh = el.scrollHeight, ch = el.clientHeight, sw = el.scrollWidth, cw = el.clientWidth;
            const clipY = ch >= 4 && sh > ch + 2;
            const clipX = cw >= 4 && sw > cw + 2;
            const ellipsis = cs.textOverflow === "ellipsis";
            const lineClamp = cs.webkitLineClamp && cs.webkitLineClamp !== "none" && cs.webkitLineClamp !== "unset" && Number(cs.webkitLineClamp) > 0;
            out.push({
              sel: sel + (el.className ? `/${String(el.className).split(" ")[0]}` : ""),
              clipY, clipX, ellipsis, lineClamp,
              sh, ch, sw, cw,
              sample: txt.replace(/\s+/g, " ").slice(0, 48),
            });
          }
        }
        return out;
      }, STAGE_TEXT_SELS);
      let pass = true;
      for (const r of rows) {
        if (r.clipY || r.clipX || r.ellipsis || r.lineClamp) {
          pass = false;
          failures.push({ page: n, ...r });
        }
      }
      report.push({ page: n, pass, count: rows.length });
    }
    await page.close();
    // Attach per-slide summary for the parent report
    globalThis.__bsOverflow390 = report;
    console.log("390 on-stage pass/fail:", JSON.stringify(report));
    assert.deepEqual(
      failures,
      [],
      "clipped/ellipsized on-stage text at 390:\n" + failures.map((f) => JSON.stringify(f)).join("\n")
    );
  } finally {
    await browser.close();
  }
});

test("full view desktop: stage containers fit at 1280/1920", async (t) => {
  let puppeteer;
  try {
    puppeteer = (await import(pathToFileURL(PUPPETEER).href)).default;
  } catch (e) {
    t.skip("puppeteer-core not available: " + e.message);
    return;
  }
  let browser;
  try {
    browser = await puppeteer.launch(launchOpts());
  } catch (e) {
    t.skip("Chrome launch failed: " + e.message);
    return;
  }
  try {
    const failures = [];
    for (const vp of [
      { name: "1280x720", width: 1280, height: 720 },
      { name: "1920x1080", width: 1920, height: 1080 },
    ]) {
      const page = await browser.newPage();
      await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 1 });
      await page.setCacheEnabled(false);
      for (let n = 1; n <= 21; n++) {
        await page.goto(`${BASE}/study-diy-pbl-bookshare.html?page=${n}&full=1`, {
          waitUntil: "networkidle0", timeout: 60000,
        });
        await settle(page);
        const rows = await page.evaluate((sels) => {
          const out = [];
          for (const sel of sels) {
            for (const el of document.querySelectorAll(sel)) {
              if (!el.closest(".fl-art, .bs-scene, .fl-scene")) continue;
              const cs = getComputedStyle(el);
              if (cs.display === "none") continue;
              const sh = el.scrollHeight, ch = el.clientHeight, sw = el.scrollWidth, cw = el.clientWidth;
              out.push({
                sel,
                clipY: ch >= 4 && sh > ch + 2,
                clipX: cw >= 4 && sw > cw + 2,
                sample: (el.innerText || "").replace(/\s+/g, " ").slice(0, 40),
              });
            }
          }
          return out;
        }, [".bs-idea-panel", ".bs-term-text", ".s09-genre", ".bs-takeaways", ".bs-discuss", ".bs-resources-panel", ".bs-surface--titleblock"]);
        for (const r of rows) {
          if (r.clipY || r.clipX) failures.push({ vp: vp.name, page: n, ...r });
        }
      }
      await page.close();
    }
    assert.deepEqual(failures, [], "desktop clip:\n" + failures.map((f) => JSON.stringify(f)).join("\n"));
  } finally {
    await browser.close();
  }
});


test("s09 labels sit inside visible (unoccluded) card body; readable size", async (t) => {
  let puppeteer;
  try {
    puppeteer = (await import(pathToFileURL(PUPPETEER).href)).default;
  } catch (e) {
    t.skip("puppeteer-core not available: " + e.message);
    return;
  }
  let browser;
  try {
    browser = await puppeteer.launch(launchOpts());
  } catch (e) {
    t.skip("Chrome launch failed: " + e.message);
    return;
  }
  try {
    const failures = [];
    for (const vp of [
      { name: "390x844", width: 390, height: 844, mobile: true },
      { name: "1280x720", width: 1280, height: 720, mobile: false },
    ]) {
      const page = await browser.newPage();
      await page.setViewport({
        width: vp.width, height: vp.height, deviceScaleFactor: 1,
        isMobile: !!vp.mobile, hasTouch: !!vp.mobile,
      });
      await page.setCacheEnabled(false);
      await page.goto(`${BASE}/study-diy-pbl-bookshare.html?page=9&full=1`, {
        waitUntil: "networkidle0", timeout: 60000,
      });
      await settle(page);
      const rows = await page.evaluate(() => {
        function rotate(px, py, cx, cy, deg) {
          const r = (deg * Math.PI) / 180;
          const dx = px - cx, dy = py - cy;
          return {
            x: cx + dx * Math.cos(r) - dy * Math.sin(r),
            y: cy + dx * Math.sin(r) + dy * Math.cos(r),
          };
        }
        function pointInPoly(pt, poly) {
          // ray cast
          let inside = false;
          for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
            const xi = poly[i].x, yi = poly[i].y;
            const xj = poly[j].x, yj = poly[j].y;
            const inter = ((yi > pt.y) !== (yj > pt.y))
              && (pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi + 1e-9) + xi);
            if (inter) inside = !inside;
          }
          return inside;
        }
        const scene = document.querySelector(".bs-scene");
        const sw = scene.clientWidth, sh = scene.clientHeight;
        const scale = Math.min(sw / 1920, sh / 1080);
        // design layer may use cover sync; map art -> CSS via label rects themselves
        const out = [];
        for (const el of document.querySelectorAll(".s09-genre")) {
          const label = el.dataset.label || el.textContent.trim();
          let bodyArt;
          if (el.dataset.bodyQuad) {
            bodyArt = JSON.parse(el.dataset.bodyQuad).map(([x, y]) => ({ x, y }));
          } else {
            const cx = Number(el.dataset.cardCx);
            const cy = Number(el.dataset.cardCy);
            const w = Number(el.dataset.cardW);
            const h = Number(el.dataset.cardH);
            const rot = Number(el.dataset.rot);
            const headerFrac = Number(el.dataset.headerFrac || 0.3);
            const pad = Number(el.dataset.bodyInset || 0.1);
            const local = [
              { x: (-0.5 + pad) * w, y: (-0.5 + headerFrac) * h },
              { x: (0.5 - pad) * w, y: (-0.5 + headerFrac) * h },
              { x: (0.5 - pad) * w, y: (0.5 - pad) * h },
              { x: (-0.5 + pad) * w, y: (0.5 - pad) * h },
            ];
            bodyArt = local.map((p) => rotate(cx + p.x, cy + p.y, cx, cy, rot));
          }
          const br = el.getBoundingClientRect();
          const sr = scene.getBoundingClientRect();
          const layer = document.querySelector(".bs-design-layer");
          const inv = new DOMMatrix(getComputedStyle(layer).transform).inverse();
          // Label center must sit in the visible (unoccluded) body region.
          const art = inv.transformPoint({
            x: (br.left + br.right) / 2 - sr.left,
            y: (br.top + br.bottom) / 2 - sr.top,
          });
          let inside = pointInPoly(art, bodyArt);
          // Also require center within the computed visible rect when present
          if (el.dataset.visCx) {
            const vc = Number(el.dataset.visCx), vy = Number(el.dataset.visCy);
            const vw = Number(el.dataset.visW), vh = Number(el.dataset.visH);
            const rot = Number(el.dataset.rot) * Math.PI / 180;
            const dx = art.x - vc, dy = art.y - vy;
            const lx = dx * Math.cos(rot) + dy * Math.sin(rot);
            const ly = -dx * Math.sin(rot) + dy * Math.cos(rot);
            if (Math.abs(lx) > vw / 2 || Math.abs(ly) > vh / 2) inside = false;
          }
          // Must not sit inside a higher-z sibling body
          const myZ = Number(el.dataset.z || 0);
          for (const other of document.querySelectorAll(".s09-genre")) {
            if (other === el) continue;
            if (Number(other.dataset.z || 0) <= myZ) continue;
            if (!other.dataset.bodyQuad) continue;
            const ob = JSON.parse(other.dataset.bodyQuad);
            if (pointInPoly(art, ob.map(([x, y]) => ({ x, y })))) inside = false;
          }
          const fs = parseFloat(getComputedStyle(el).fontSize);
          const clip = el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1;
          out.push({
            label,
            inside,
            clip,
            fs,
            artFs: el.dataset.artFs,
            overflowX: el.scrollWidth > el.clientWidth + 0.5,
            overflowY: el.scrollHeight > el.clientHeight + 0.5,
          });
        }
        return out;
      });
      if (rows.length !== 4) failures.push(`${vp.name}: expected 4 s09 labels, got ${rows.length}`);
      for (const r of rows) {
        if (!r.inside) failures.push(`${vp.name}: label outside visible body / occluded ("${r.label}")`);
        if (r.clip || r.overflowX || r.overflowY) failures.push(`${vp.name}: label clips ("${r.label}")`);
        // ~2x prior 16px design size; allow fit down to 18px
        const art = parseFloat(r.artFs || "0");
        if (art && art < 14) failures.push(`${vp.name}: label too small artFs=${art} ("${r.label}")`);
      }
      await page.close();
    }
    assert.equal(failures.length, 0, failures.join("\n"));
  } finally {
    await browser.close();
  }
});

test("portrait rotate note and landscape toolbar tuck", async (t) => {
  let puppeteer;
  try {
    puppeteer = (await import(pathToFileURL(PUPPETEER).href)).default;
  } catch (e) {
    t.skip("puppeteer-core not available: " + e.message);
    return;
  }
  let browser;
  try {
    browser = await puppeteer.launch(launchOpts());
  } catch (e) {
    t.skip("Chrome launch failed: " + e.message);
    return;
  }
  try {
    // Portrait phone
    const portrait = await browser.newPage();
    await portrait.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    await portrait.goto(`${BASE}/study-diy-pbl-bookshare.html?page=17&full=1`, {
      waitUntil: "networkidle0", timeout: 60000,
    });
    const pInfo = await portrait.evaluate(() => {
      const note = document.getElementById("bsRotateNote");
      const cs = note ? getComputedStyle(note) : null;
      const text = note ? (note.querySelector(".bs-rotate-text") || {}).textContent : "";
      return {
        display: cs && cs.display,
        text: (text || "").trim(),
        color: cs && getComputedStyle(note.querySelector(".bs-rotate-text")).color,
        hasPaper: !!(note && note.querySelector(".bs-rotate-paper")),
        hasTape: !!(note && note.querySelector(".bs-rotate-tape")),
      };
    });
    assert.equal(pInfo.text, "Turn your phone sideways");
    assert.ok(pInfo.display !== "none", "rotate note visible in portrait");
    assert.ok(pInfo.hasPaper && pInfo.hasTape, "sticky_note + tape_a sprites present");
    await portrait.close();

    // Landscape phone
    const land = await browser.newPage();
    await land.setViewport({ width: 844, height: 390, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    await land.goto(`${BASE}/study-diy-pbl-bookshare.html?page=17&full=1`, {
      waitUntil: "networkidle0", timeout: 60000,
    });
    await land.evaluate(() => {
      document.body.classList.add("fl-full");
      document.querySelectorAll(".bs-scene").forEach((s) => {
        s.classList.remove("is-drawing");
        s.classList.add("is-drawn", "is-settled");
      });
    });
    await new Promise((r) => setTimeout(r, 300));
    const lInfo = await land.evaluate(() => {
      const bar = document.getElementById("flBar");
      const toggle = document.getElementById("bsBarToggle");
      const scene = document.querySelector(".bs-scene");
      const note = document.getElementById("bsRotateNote");
      const bcs = getComputedStyle(bar);
      return {
        toggleHidden: toggle ? toggle.hidden : true,
        barClipped: bcs.clipPath.includes("inset") || bcs.height === "1px" || bcs.position === "absolute",
        noteDisplay: note ? getComputedStyle(note).display : "none",
        sceneW: scene.clientWidth,
        sceneH: scene.clientHeight,
        open: document.body.classList.contains("bs-bar-open"),
      };
    });
    assert.equal(lInfo.toggleHidden, false, "Controls toggle shown in landscape");
    assert.ok(lInfo.barClipped || !lInfo.open, "toolbar tucked when closed");
    assert.equal(lInfo.noteDisplay, "none", "rotate note hidden in landscape");
    assert.ok(lInfo.sceneW >= 800, `stage fills width, got ${lInfo.sceneW}`);
    // 16:9-ish
    const ar = lInfo.sceneW / lInfo.sceneH;
    assert.ok(ar > 1.6 && ar < 1.9, `16:9 stage, got aspect ${ar}`);
    await land.close();
  } finally {
    await browser.close();
  }
});
