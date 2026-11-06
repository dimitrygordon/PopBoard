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
  ".s09-word",
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


test("s09 labels sit on card-body pixels (no ink / neighbour); readable size", async (t) => {
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
  const LAB_ICON = { x0: 1270, y0: 148, x1: 1338, y1: 218 };
  try {
    const failures = [];
    for (const vp of [
      { name: "1280x720", width: 1280, height: 720, mobile: false },
      { name: "1920x1080", width: 1920, height: 1080, mobile: false },
      { name: "844x390", width: 844, height: 390, mobile: true },
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
      // Final paint after fonts + fitters (two rAFs beyond settle).
      await page.evaluate(async () => {
        try { await document.fonts.ready; } catch {}
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      });
      await new Promise((r) => setTimeout(r, 120));

      const meta = await page.evaluate((LAB_ICON) => {
        const scene = document.querySelector(".bs-scene");
        const layer = document.querySelector(".bs-design-layer");
        const sr = scene.getBoundingClientRect();
        const lr = layer.getBoundingClientRect();
        const iconScene = {
          x0: (LAB_ICON.x0 / 1920) * lr.width + (lr.left - sr.left),
          y0: (LAB_ICON.y0 / 1080) * lr.height + (lr.top - sr.top),
          x1: (LAB_ICON.x1 / 1920) * lr.width + (lr.left - sr.left),
          y1: (LAB_ICON.y1 / 1080) * lr.height + (lr.top - sr.top),
        };
        const labels = [...document.querySelectorAll(".s09-genre")].map((el) => {
          const label = el.dataset.label || "";
          const wordEls = [...document.querySelectorAll(`.s09-word[data-label="${CSS.escape(label)}"]`)];
          const words = wordEls.map((w) => {
            const br = w.getBoundingClientRect();
            return {
              word: (w.textContent || "").trim(),
              x0: br.left - sr.left,
              y0: br.top - sr.top,
              x1: br.right - sr.left,
              y1: br.bottom - sr.top,
              artFs: parseFloat(w.dataset.artFs || el.dataset.artFs || "0"),
            };
          });
          // Fallback for legacy single-node labels (pre-word-split).
          if (!words.length) {
            const raw = (el.textContent || "").replace(/\r/g, "");
            const parts = raw.split("\n").map((s) => s.trim()).filter(Boolean);
            const tn = [...el.childNodes].find((n) => n.nodeType === 3);
            if (tn) {
              let searchFrom = 0;
              const full = tn.textContent || "";
              for (const word of parts) {
                const idx = full.indexOf(word, searchFrom);
                if (idx < 0) continue;
                const range = document.createRange();
                range.setStart(tn, idx);
                range.setEnd(tn, idx + word.length);
                const br = range.getBoundingClientRect();
                words.push({
                  word,
                  x0: br.left - sr.left,
                  y0: br.top - sr.top,
                  x1: br.right - sr.left,
                  y1: br.bottom - sr.top,
                  artFs: parseFloat(el.dataset.artFs || "0"),
                });
                searchFrom = idx + word.length;
              }
            }
          }
          return {
            label,
            band: el.dataset.band === "1",
            rot: Number(el.dataset.rot || 0),
            artFs: parseFloat(el.dataset.artFs || "0"),
            words,
          };
        });
        return { iconScene, labels, sceneW: sr.width, sceneH: sr.height };
      }, LAB_ICON);

      for (const m of meta.labels) {
        if (!m.band && m.label !== "Lab report") continue;
        const words = m.words || [];
        if (!words.length) continue;
        const ax0 = Math.min(...words.map((w) => w.x0));
        const ay0 = Math.min(...words.map((w) => w.y0));
        const ax1 = Math.max(...words.map((w) => w.x1));
        const ay1 = Math.max(...words.map((w) => w.y1));
        const ic = meta.iconScene;
        const overlap = !(ax1 < ic.x0 || ax0 > ic.x1 || ay1 < ic.y0 || ay0 > ic.y1);
        if (overlap) failures.push(`${vp.name}: "Lab report" overlaps flask icon AABB`);
      }

      const sceneHandle = await page.$(".bs-scene");
      const withBuf = Buffer.from(await sceneHandle.screenshot({ encoding: "binary" }));
      await page.evaluate(() => {
        document.querySelectorAll(".s09-genre, .s09-word").forEach((el) => { el.style.visibility = "hidden"; });
      });
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      await new Promise((r) => setTimeout(r, 60));
      const withoutBuf = Buffer.from(await sceneHandle.screenshot({ encoding: "binary" }));
      await sceneHandle.dispose();

      const wordReport = await page.evaluate(async (withB64, withoutB64, labels) => {
        function load(b64) {
          return new Promise((res, rej) => {
            const img = new Image();
            img.onload = () => res(img);
            img.onerror = rej;
            img.src = "data:image/png;base64," + b64;
          });
        }
        const withImg = await load(withB64);
        const withoutImg = await load(withoutB64);
        const canvas = document.createElement("canvas");
        canvas.width = withImg.width; canvas.height = withImg.height;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(withImg, 0, 0);
        const withData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        ctx.drawImage(withoutImg, 0, 0);
        const withoutData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        const scene = document.querySelector(".bs-scene");
        const sw = scene.clientWidth, sh = scene.clientHeight;
        const sx = canvas.width / sw, sy = canvas.height / sh;
        function idx(px, py) { return (py * canvas.width + px) * 4; }
        function isOutlineInk(r, g, b) {
          // Dark navy card outlines / icon strokes (not soft hatching).
          const lum = (r + g + b) / 3;
          return lum < 115 && b >= r - 25 && b >= g - 15;
        }
        function isGlyphDiff(wi, wo) {
          // Label ink is dark navy; require a clear darkening vs without-label shot.
          const wLum = (withData[wi] + withData[wi + 1] + withData[wi + 2]) / 3;
          const oLum = (withoutData[wo] + withoutData[wo + 1] + withoutData[wo + 2]) / 3;
          return wLum < 140 && (oLum - wLum) > 35;
        }
        const PAD = 4;
        const out = [];
        for (const lab of labels) {
          for (const w of lab.words) {
            const rx0 = Math.max(0, Math.floor(w.x0 * sx) - 2);
            const ry0 = Math.max(0, Math.floor(w.y0 * sy) - 2);
            const rx1 = Math.min(canvas.width - 1, Math.ceil(w.x1 * sx) + 2);
            const ry1 = Math.min(canvas.height - 1, Math.ceil(w.y1 * sy) + 2);
            let gx0 = Infinity, gy0 = Infinity, gx1 = -1, gy1 = -1, inkN = 0;
            for (let py = ry0; py <= ry1; py++) {
              for (let px = rx0; px <= rx1; px++) {
                const i = idx(px, py);
                if (isGlyphDiff(i, i)) {
                  inkN++;
                  if (px < gx0) gx0 = px;
                  if (py < gy0) gy0 = py;
                  if (px > gx1) gx1 = px;
                  if (py > gy1) gy1 = py;
                }
              }
            }
            if (inkN < 8 || gx1 < gx0) {
              out.push({
                label: lab.label, word: w.word, band: !!lab.band,
                artFs: w.artFs || lab.artFs,
                inkN, outlineHits: -1, reason: "no-glyph-ink",
              });
              continue;
            }
            const px0 = Math.max(0, gx0 - PAD);
            const py0 = Math.max(0, gy0 - PAD);
            const px1 = Math.min(canvas.width - 1, gx1 + PAD);
            const py1 = Math.min(canvas.height - 1, gy1 + PAD);
            let outlineHits = 0;
            for (let py = py0; py <= py1; py++) {
              for (let px = px0; px <= px1; px++) {
                const i = idx(px, py);
                if (isOutlineInk(withoutData[i], withoutData[i + 1], withoutData[i + 2])) {
                  outlineHits++;
                }
              }
            }
            out.push({
              label: lab.label,
              word: w.word,
              band: !!lab.band,
              artFs: w.artFs || lab.artFs,
              inkN,
              outlineHits,
              glyph: { x0: gx0, y0: gy0, x1: gx1, y1: gy1 },
              padded: { x0: px0, y0: py0, x1: px1, y1: py1 },
            });
          }
        }
        return out;
      }, withBuf.toString("base64"), withoutBuf.toString("base64"), meta.labels);

      const expectedWords = meta.labels.reduce((n, l) => n + Math.max(1, (l.words || []).length), 0);
      if (wordReport.length < 6) {
        failures.push(`${vp.name}: expected ≥6 words, got ${wordReport.length} (labels=${meta.labels.length})`);
      }
      for (const r of wordReport) {
        if (r.reason === "no-glyph-ink") {
          failures.push(`${vp.name}: "${r.label}"/"${r.word}" no glyph ink in diff`);
          continue;
        }
        if (r.outlineHits > 0) {
          failures.push(`${vp.name}: "${r.label}"/"${r.word}" outline ink under glyph+4px (${r.outlineHits} px)`);
        }
        if (vp.width === 1280 && r.artFs && r.artFs < 26.5) {
          failures.push(`${vp.name}: "${r.label}"/"${r.word}" too small artFs=${r.artFs.toFixed(1)} (need ≥27 for ≥18px)`);
        }
        if (r.artFs && r.artFs < 14) {
          failures.push(`${vp.name}: "${r.label}"/"${r.word}" too small artFs=${r.artFs.toFixed(1)}`);
        }
      }
      void expectedWords;
      await page.close();
    }
    assert.equal(failures.length, 0, failures.join("\n"));
  } finally {
    await browser.close();
  }
});

test("full-view captions clear on-art cards at 1280 and 844x390", async (t) => {
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
    const pageCount = await probe.evaluate(() => (window.__bs?.pages?.length) || 21);
    await probe.close();

    const failures = [];
    for (const vp of [
      { name: "1280x720", width: 1280, height: 720, mobile: false },
      { name: "844x390", width: 844, height: 390, mobile: true },
    ]) {
      for (let n = 1; n <= pageCount; n++) {
        const page = await browser.newPage();
        await page.setViewport({
          width: vp.width, height: vp.height, deviceScaleFactor: 1,
          isMobile: !!vp.mobile, hasTouch: !!vp.mobile,
        });
        await page.setCacheEnabled(false);
        await page.goto(`${BASE}/study-diy-pbl-bookshare.html?page=${n}&full=1`, {
          waitUntil: "networkidle0", timeout: 60000,
        });
        await settle(page);
        const hit = await page.evaluate(() => {
          const cap = document.querySelector(".fl-cap");
          if (!cap || getComputedStyle(cap).display === "none") return null;
          const cq = cap.querySelector(".cap-q") || cap;
          const text = (cq.textContent || "").trim();
          if (!text) return null;
          const cr = cq.getBoundingClientRect();
          // Sample glyph boxes via Range for each word — fall back to cap rect.
          const scene = document.querySelector(".bs-scene");
          const sr = scene.getBoundingClientRect();
          // Art cards / on-art chips captions must clear (not full-bleed content panels).
          const cardSels = [
            ".s09-genre", ".bs-term-card", ".s01-book", ".s10-birac-letter",
            ".bs-surface--titleblock",
          ];
          const cards = [];
          for (const sel of cardSels) {
            document.querySelectorAll(sel).forEach((el) => {
              const br = el.getBoundingClientRect();
              if (br.width < 8 || br.height < 8) return;
              cards.push({
                sel,
                x0: br.left - sr.left, y0: br.top - sr.top,
                x1: br.right - sr.left, y1: br.bottom - sr.top,
              });
            });
          }
          // Also detect opaque ink card outlines near the bottom via pixel walk on
          // caption AABB against Leo quads when present (s09).
          const quads = [];
          document.querySelectorAll(".s09-genre").forEach((el) => {
            try {
              const q = JSON.parse(el.dataset.quad || "null");
              if (Array.isArray(q) && q.length >= 4) quads.push(q);
            } catch {}
          });
          const layer = document.querySelector(".bs-design-layer");
          const lr = layer ? layer.getBoundingClientRect() : null;
          function designToScene(dx, dy) {
            if (!lr) return [dx, dy];
            return [
              (dx / 1920) * lr.width + (lr.left - sr.left),
              (dy / 1080) * lr.height + (lr.top - sr.top),
            ];
          }
          function pointInQuad(px, py, quad) {
            let inside = false;
            for (let i = 0, j = quad.length - 1; i < quad.length; j = i++) {
              const [xi, yi] = designToScene(quad[i][0], quad[i][1]);
              const [xj, yj] = designToScene(quad[j][0], quad[j][1]);
              if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi + 1e-9) + xi)) {
                inside = !inside;
              }
            }
            return inside;
          }
          // Caption text rect in scene coords (use the visible text box).
          const capBox = {
            x0: cr.left - sr.left,
            y0: cr.top - sr.top,
            x1: cr.right - sr.left,
            y1: cr.bottom - sr.top,
          };
          const overlaps = [];
          // Sample a grid across the caption text box; flag if inside any s09 quad.
          for (let iy = 0; iy < 4; iy++) {
            for (let ix = 0; ix < 8; ix++) {
              const px = capBox.x0 + (capBox.x1 - capBox.x0) * (ix + 0.5) / 8;
              const py = capBox.y0 + (capBox.y1 - capBox.y0) * (iy + 0.5) / 4;
              for (let qi = 0; qi < quads.length; qi++) {
                if (pointInQuad(px, py, quads[qi])) {
                  overlaps.push(`s09-quad[${qi}]`);
                }
              }
            }
          }
          // Generic: caption bottom strip vs DOM card AABBs (only when cards sit low).
          for (const c of cards) {
            const ox0 = Math.max(capBox.x0, c.x0);
            const oy0 = Math.max(capBox.y0, c.y0);
            const ox1 = Math.min(capBox.x1, c.x1);
            const oy1 = Math.min(capBox.y1, c.y1);
            if (ox1 > ox0 + 4 && oy1 > oy0 + 4) {
              // Ignore tiny edge grazes; require meaningful overlap area.
              const area = (ox1 - ox0) * (oy1 - oy0);
              if (area > 80) overlaps.push(c.sel);
            }
          }
          return {
            page: document.body.dataset.page,
            text: text.slice(0, 80),
            overlaps: [...new Set(overlaps)],
            capBox,
          };
        });
        if (hit && hit.overlaps.length) {
          failures.push(`${vp.name} p${n}: caption overlaps ${hit.overlaps.join(",")} — "${hit.text}"`);
        }
        await page.close();
      }
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
