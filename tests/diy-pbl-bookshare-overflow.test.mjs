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
      await probe.goto(`${BASE}/study-diy-pbl-bookshare.html?page=26&full=1`, {
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
      await page.goto(`${BASE}/study-diy-pbl-bookshare.html?page=26&full=1`, {
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
    for (let n = 1; n <= 30; n++) {
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
      for (let n = 1; n <= 30; n++) {
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
    ]) {
      const page = await browser.newPage();
      await page.setViewport({
        width: vp.width, height: vp.height, deviceScaleFactor: 1,
        isMobile: !!vp.mobile, hasTouch: !!vp.mobile,
      });
      await page.setCacheEnabled(false);
      await page.goto(`${BASE}/study-diy-pbl-bookshare.html?page=12&full=1`, {
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

test("s18 takeaways numerals clear binder rings", async (t) => {
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
  // Binder rings occupy ~left 12% of torn_page.webp; keep a margin.
  const RING_FRAC = 0.14;
  try {
    const failures = [];
    for (const vp of [
      { name: "1280x720", width: 1280, height: 720, mobile: false },
      { name: "1920x1080", width: 1920, height: 1080, mobile: false },
      { name: "390x844", width: 390, height: 844, mobile: true },
    ]) {
      const page = await browser.newPage();
      await page.setViewport({
        width: vp.width, height: vp.height, deviceScaleFactor: 1,
        isMobile: !!vp.mobile, hasTouch: !!vp.mobile,
      });
      await page.setCacheEnabled(false);
      await page.goto(`${BASE}/study-diy-pbl-bookshare.html?page=27&full=1`, {
        waitUntil: "networkidle0", timeout: 60000,
      });
      await settle(page);
      await page.evaluate(async () => {
        try { await document.fonts.ready; } catch {}
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      });
      await new Promise((r) => setTimeout(r, 120));

      const meta = await page.evaluate((RING_FRAC) => {
        const scene = document.querySelector(".bs-scene");
        const sr = scene.getBoundingClientRect();
        const paper = document.querySelector(".bs-paper-group");
        const box = document.querySelector(".bs-takeaways");
        if (!paper || !box) return { error: "no paper/takeaways" };
        const pr = paper.getBoundingClientRect();
        const br = box.getBoundingClientRect();
        const ring = {
          x0: pr.left - sr.left,
          y0: pr.top - sr.top,
          x1: pr.left - sr.left + pr.width * RING_FRAC,
          y1: pr.bottom - sr.top,
        };
        // Visible text box (clipping container).
        const textBox = {
          x0: br.left - sr.left,
          y0: br.top - sr.top,
          x1: br.right - sr.left,
          y1: br.bottom - sr.top,
          overflow: getComputedStyle(box).overflow,
        };
        const RING_PITCH = [0.29, 0.44, 0.58, 0.73];
        const items = [...document.querySelectorAll(".bs-takeaways li")].map((li, i) => {
          const liBr = li.getBoundingClientRect();
          const range = document.createRange();
          range.selectNodeContents(li);
          const textBr = range.getBoundingClientRect();
          const before = getComputedStyle(li, "::before");
          const beforeContent = before && before.content;
          const hasBefore = beforeContent && beforeContent !== "none" && beforeContent !== '""' && beforeContent !== "normal";
          const cy = ((liBr.top + liBr.bottom) / 2) - sr.top;
          const ringCy = (pr.top - sr.top) + pr.height * (RING_PITCH[i] ?? 0.5);
          return {
            n: i + 1,
            text: (li.textContent || "").trim().slice(0, 48),
            hasBefore,
            listStylePos: getComputedStyle(li).listStylePosition,
            marker: {
              // Include ::before numeral inside the li padding box.
              x0: liBr.left - sr.left - 2,
              y0: liBr.top - sr.top - 2,
              x1: Math.max(textBr.left - sr.left, liBr.left - sr.left + 28) + 2,
              y1: liBr.bottom - sr.top + 2,
            },
            liBox: {
              x0: liBr.left - sr.left,
              y0: liBr.top - sr.top,
              x1: liBr.right - sr.left,
              y1: liBr.bottom - sr.top,
            },
            rowCy: cy,
            ringCy,
            pitchFrac: RING_PITCH[i],
            pitchErrFrac: Math.abs(cy - ringCy) / pr.height,
            textX0: textBr.left - sr.left,
          };
        });
        return { ring, textBox, items, paperH: pr.height };
      }, RING_FRAC);

      if (meta.error) {
        failures.push(`${vp.name}: ${meta.error}`);
        await page.close();
        continue;
      }
      if (meta.items.length !== 4) {
        failures.push(`${vp.name}: expected 4 takeaways, got ${meta.items.length}`);
      }

      const sceneHandle = await page.$(".bs-scene");
      const withBuf = Buffer.from(await sceneHandle.screenshot({ encoding: "binary" }));
      await page.evaluate(() => {
        document.querySelectorAll(".bs-takeaways").forEach((el) => { el.style.visibility = "hidden"; });
      });
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      await new Promise((r) => setTimeout(r, 60));
      const withoutBuf = Buffer.from(await sceneHandle.screenshot({ encoding: "binary" }));
      await sceneHandle.dispose();

      const report = await page.evaluate(async (withB64, withoutB64, meta) => {
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
        function isGlyphDiff(i) {
          const wLum = (withData[i] + withData[i + 1] + withData[i + 2]) / 3;
          const oLum = (withoutData[i] + withoutData[i + 1] + withoutData[i + 2]) / 3;
          return wLum < 150 && (oLum - wLum) > 30;
        }
        function isRingDark(i) {
          const r = withoutData[i], g = withoutData[i + 1], b = withoutData[i + 2];
          return (r + g + b) / 3 < 130;
        }
        const PAD = 2;
        const out = [];
        const ringPx = {
          x0: Math.floor(meta.ring.x0 * sx),
          y0: Math.floor(meta.ring.y0 * sy),
          x1: Math.ceil(meta.ring.x1 * sx),
          y1: Math.ceil(meta.ring.y1 * sy),
        };
        const boxPx = {
          x0: Math.floor(meta.textBox.x0 * sx),
          y0: Math.floor(meta.textBox.y0 * sy),
          x1: Math.ceil(meta.textBox.x1 * sx),
          y1: Math.ceil(meta.textBox.y1 * sy),
        };
        for (const it of meta.items) {
          const rx0 = Math.max(0, Math.floor(it.marker.x0 * sx) - 1);
          const ry0 = Math.max(0, Math.floor(it.marker.y0 * sy) - 1);
          const rx1 = Math.min(canvas.width - 1, Math.ceil(it.marker.x1 * sx) + 1);
          const ry1 = Math.min(canvas.height - 1, Math.ceil(it.marker.y1 * sy) + 1);
          let gx0 = Infinity, gy0 = Infinity, gx1 = -1, gy1 = -1, inkN = 0;
          for (let py = ry0; py <= ry1; py++) {
            for (let px = rx0; px <= rx1; px++) {
              if (isGlyphDiff(idx(px, py))) {
                inkN++;
                if (px < gx0) gx0 = px;
                if (py < gy0) gy0 = py;
                if (px > gx1) gx1 = px;
                if (py > gy1) gy1 = py;
              }
            }
          }
          if (inkN < 4 || gx1 < gx0) {
            out.push({ n: it.n, inkN, reason: "no-numeral-ink", listStylePos: it.listStylePos, hasBefore: it.hasBefore });
            continue;
          }
          const bx0 = gx0 - PAD, by0 = gy0 - PAD, bx1 = gx1 + PAD, by1 = gy1 + PAD;
          const aabbRing = !(bx1 < ringPx.x0 || bx0 > ringPx.x1 || by1 < ringPx.y0 || by0 > ringPx.y1);
          let ringHits = 0;
          if (aabbRing) {
            const ox0 = Math.max(bx0, ringPx.x0), oy0 = Math.max(by0, ringPx.y0);
            const ox1 = Math.min(bx1, ringPx.x1), oy1 = Math.min(by1, ringPx.y1);
            for (let py = oy0; py <= oy1; py++) {
              for (let px = ox0; px <= ox1; px++) {
                if (px >= 0 && py >= 0 && px < canvas.width && py < canvas.height && isRingDark(idx(px, py))) ringHits++;
              }
            }
          }
          // Full numeral ink must sit inside the visible takeaways box (not clipped).
          const insideBox =
            gx0 >= boxPx.x0 + 1 &&
            gy0 >= boxPx.y0 + 1 &&
            gx1 <= boxPx.x1 - 1 &&
            gy1 <= boxPx.y1 - 1;
          // Left edge of numeral must not sit on the clip edge (outside markers get sliced).
          const clippedLeft = gx0 <= boxPx.x0 + 1;
          out.push({
            n: it.n, inkN, ringHits, aabbRing, insideBox, clippedLeft,
            listStylePos: it.listStylePos, hasBefore: it.hasBefore,
            glyph: { x0: gx0, y0: gy0, x1: gx1, y1: gy1 },
            boxPx, textBoxOverflow: meta.textBox.overflow,
          });
        }
        return out;
      }, withBuf.toString("base64"), withoutBuf.toString("base64"), meta);

      for (const r of report) {
        if (r.reason === "no-numeral-ink") {
          failures.push(`${vp.name}: takeaway ${r.n}. no numeral glyph ink`);
          continue;
        }
        if (r.aabbRing && r.ringHits > 0) {
          failures.push(`${vp.name}: takeaway ${r.n}. numeral overlaps binder ring area (${r.ringHits} dark px)`);
        }
        if (!r.insideBox || r.clippedLeft) {
          failures.push(
            `${vp.name}: takeaway ${r.n}. numeral ink clipped by text box ` +
            `(inside=${r.insideBox} clippedLeft=${r.clippedLeft} overflow=${r.textBoxOverflow} ` +
            `glyph=${JSON.stringify(r.glyph)} box=${JSON.stringify(r.boxPx)} listStylePos=${r.listStylePos})`
          );
        }
      }
      for (const it of meta.items) {
        if (it.pitchErrFrac > 0.04) {
          failures.push(
            `${vp.name}: takeaway ${it.n}. row center off ring pitch ` +
            `(err=${(it.pitchErrFrac * 100).toFixed(1)}% target=${it.pitchFrac} rowCy=${it.rowCy.toFixed(1)} ringCy=${it.ringCy.toFixed(1)})`
          );
        }
        if (!it.hasBefore) {
          failures.push(`${vp.name}: takeaway ${it.n}. expected ::before counter numeral`);
        }
      }
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
    const pageCount = await probe.evaluate(() => (window.__bs?.pages?.length) || 30);
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
          const scene = document.querySelector(".bs-scene");
          const sr = scene.getBoundingClientRect();
          const cardSels = [
            ".s09-genre", ".bs-term-card", ".s01-book", ".s10-birac-letter",
            ".bs-surface--titleblock", ".bs-takeaways",
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
          const capBox = {
            x0: cr.left - sr.left,
            y0: cr.top - sr.top,
            x1: cr.right - sr.left,
            y1: cr.bottom - sr.top,
          };
          const overlaps = [];
          for (let iy = 0; iy < 4; iy++) {
            for (let ix = 0; ix < 8; ix++) {
              const px = capBox.x0 + (capBox.x1 - capBox.x0) * (ix + 0.5) / 8;
              const py = capBox.y0 + (capBox.y1 - capBox.y0) * (iy + 0.5) / 4;
              for (let qi = 0; qi < quads.length; qi++) {
                if (pointInQuad(px, py, quads[qi])) overlaps.push(`s09-quad[${qi}]`);
              }
            }
          }
          for (const c of cards) {
            const ox0 = Math.max(capBox.x0, c.x0);
            const oy0 = Math.max(capBox.y0, c.y0);
            const ox1 = Math.min(capBox.x1, c.x1);
            const oy1 = Math.min(capBox.y1, c.y1);
            if (ox1 > ox0 + 4 && oy1 > oy0 + 4) {
              const area = (ox1 - ox0) * (oy1 - oy0);
              if (area > 80) overlaps.push(c.sel);
            }
          }
          return {
            page: document.body.dataset.page,
            text: text.slice(0, 80),
            overlaps: [...new Set(overlaps)],
            capBox,
            sceneH: scene.clientHeight,
          };
        });

        // Pixel check: hide caption, sample art under its box (catches baked lanterns etc.).
        // Skip when caption is fully below the stage (landscape letterbox): coords clamp
        // to the bottom art row and false-positive as "on drawn art".
        let artHit = null;
        if (hit && hit.capBox && hit.capBox.y0 < (hit.sceneH ?? 1e9) - 2) {
          await page.evaluate(() => {
            document.querySelectorAll(".fl-cap").forEach((el) => { el.style.visibility = "hidden"; });
          });
          await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
          await new Promise((r) => setTimeout(r, 40));
          const sceneHandle = await page.$(".bs-scene");
          const shot = Buffer.from(await sceneHandle.screenshot({ encoding: "binary" }));
          await sceneHandle.dispose();
          artHit = await page.evaluate(async (b64, capBox) => {
            const img = new Image();
            await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = "data:image/png;base64," + b64; });
            const canvas = document.createElement("canvas");
            canvas.width = img.width; canvas.height = img.height;
            const ctx = canvas.getContext("2d", { willReadFrequently: true });
            ctx.drawImage(img, 0, 0);
            const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const scene = document.querySelector(".bs-scene");
            const sx = width / scene.clientWidth, sy = height / scene.clientHeight;
            function sample(cssX, cssY) {
              const px = Math.min(width - 1, Math.max(0, Math.round(cssX * sx)));
              const py = Math.min(height - 1, Math.max(0, Math.round(cssY * sy)));
              const i = (py * width + px) * 4;
              return { r: data[i], g: data[i + 1], b: data[i + 2] };
            }
            // Saturated colored art (lanterns, book spines, clothing) — not cream paper.
            function isSaturatedArt(p) {
              const lum = (p.r + p.g + p.b) / 3;
              const chroma = Math.max(Math.abs(p.r - p.g), Math.abs(p.g - p.b), Math.abs(p.r - p.b));
              return chroma > 50 && lum > 55 && lum < 210;
            }
            let art = 0, total = 0;
            for (let iy = 0; iy < 5; iy++) {
              for (let ix = 0; ix < 12; ix++) {
                const px = capBox.x0 + (capBox.x1 - capBox.x0) * (ix + 0.5) / 12;
                const py = capBox.y0 + (capBox.y1 - capBox.y0) * (iy + 0.5) / 5;
                const p = sample(px, py);
                total++;
                if (isSaturatedArt(p)) art++;
              }
            }
            return { art, total, artFrac: art / total };
          }, shot.toString("base64"), hit.capBox);
        }

        if (hit && hit.overlaps.length) {
          failures.push(`${vp.name} p${n}: caption overlaps ${hit.overlaps.join(",")} — "${hit.text}"`);
        }
        // Landscape is the tight case; require mostly empty paper under the caption.
        if (vp.name === "844x390" && artHit && artHit.artFrac > 0.12) {
          failures.push(
            `${vp.name} p${n}: caption sits on drawn art ` +
            `(${(artHit.artFrac * 100).toFixed(0)}% art samples) — "${hit?.text || ""}"`
          );
        }
        await page.close();
      }
    }
    assert.equal(failures.length, 0, failures.join("\n"));
  } finally {
    await browser.close();
  }
});


test("landscape 844x390: stage fits viewport height (no bottom overflow)", async (t) => {
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
    for (const n of [2, 6, 18, 27, 28, 29, 30]) {
      const page = await browser.newPage();
      await page.setViewport({ width: 844, height: 390, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
      await page.setCacheEnabled(false);
      await page.goto(`${BASE}/study-diy-pbl-bookshare.html?page=${n}&full=1`, {
        waitUntil: "networkidle0", timeout: 60000,
      });
      await settle(page);
      const info = await page.evaluate(() => {
        const scene = document.querySelector(".bs-scene") || document.querySelector(".fl-scene");
        const frame = document.querySelector(".fl-frame");
        const art = document.querySelector(".fl-art");
        const cap = document.querySelector(".fl-cap");
        const sr = scene.getBoundingClientRect();
        const fr = frame ? frame.getBoundingClientRect() : null;
        const ar = art ? art.getBoundingClientRect() : null;
        const cs = cap ? getComputedStyle(cap) : null;
        return {
          page: document.body.dataset.page,
          kind: document.body.dataset.kind,
          sceneBottom: sr.bottom,
          sceneTop: sr.top,
          sceneLeft: sr.left,
          sceneRight: sr.right,
          frameW: fr ? fr.width : 0,
          artLeft: ar ? ar.left : -1,
          artRight: ar ? ar.right : -1,
          vh: window.innerHeight,
          vw: window.innerWidth,
          capDisplay: cs ? cs.display : null,
        };
      });
      if (!(info.sceneBottom - info.sceneTop > 100)) {
        failures.push(`p${n}: stage height too small (${(info.sceneBottom-info.sceneTop).toFixed(1)}px)`);
      }
      if (info.sceneBottom > info.vh + 1) {
        failures.push(`p${n}: stage bottom ${info.sceneBottom.toFixed(1)} > vh ${info.vh}`);
      }
      if (!(info.frameW > 100)) {
        failures.push(`p${n}: fl-frame width collapsed (${info.frameW.toFixed(1)}px)`);
      }
      if (info.sceneLeft < -2 || info.artLeft < -2) {
        failures.push(`p${n}: stage/art left off-viewport (scene=${info.sceneLeft.toFixed(1)} art=${info.artLeft.toFixed(1)})`);
      }
      if (info.sceneRight > info.vw + 2 || info.artRight > info.vw + 2) {
        failures.push(`p${n}: stage/art right off-viewport (sceneR=${info.sceneRight.toFixed(1)} artR=${info.artRight.toFixed(1)} vw=${info.vw})`);
      }
      if (["discuss", "resources"].includes(info.kind)) {
        if (info.capDisplay !== "none") {
          failures.push(`p${n}: caption should be hidden for kind=${info.kind} (display=${info.capDisplay})`);
        }
      }
      await page.close();
    }
    assert.equal(failures.length, 0, failures.join("\n"));
  } finally {
    await browser.close();
  }
});

test("landscape 844x390: captions clear idea text panels and art cards", async (t) => {
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
    const pageCount = 30;
    const failures = [];
    for (let n = 1; n <= pageCount; n++) {
      const page = await browser.newPage();
      await page.setViewport({ width: 844, height: 390, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
      await page.setCacheEnabled(false);
      await page.goto(`${BASE}/study-diy-pbl-bookshare.html?page=${n}&full=1`, {
        waitUntil: "networkidle0", timeout: 60000,
      });
      await settle(page);
      const hit = await page.evaluate(() => {
        const cap = document.querySelector(".fl-cap");
        if (!cap || getComputedStyle(cap).display === "none") return null;
        const cq = cap.querySelector(".cap-q") || cap;
        const cr = cq.getBoundingClientRect();
        const panels = [];
        document.querySelectorAll(".bs-idea-panel, .bs-takeaways, .bs-discuss, .bs-resources-panel, .s09-genre, .bs-r6-figure").forEach((el) => {
          const br = el.getBoundingClientRect();
          if (br.width < 8 || br.height < 8) return;
          panels.push({ sel: el.className.split(/\s+/)[0] || el.tagName, x0: br.left, y0: br.top, x1: br.right, y1: br.bottom });
        });
        const overlaps = [];
        for (const c of panels) {
          const ox0 = Math.max(cr.left, c.x0);
          const oy0 = Math.max(cr.top, c.y0);
          const ox1 = Math.min(cr.right, c.x1);
          const oy1 = Math.min(cr.bottom, c.y1);
          if (ox1 > ox0 + 2 && oy1 > oy0 + 2) {
            const area = (ox1 - ox0) * (oy1 - oy0);
            if (area > 40) overlaps.push(c.sel);
          }
        }
        return { page: document.body.dataset.page, overlaps: [...new Set(overlaps)], text: (cq.textContent || "").trim().slice(0, 60) };
      });
      if (hit && hit.overlaps.length) {
        failures.push(`p${n}: caption overlaps ${hit.overlaps.join(",")} — "${hit.text}"`);
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
    await portrait.goto(`${BASE}/study-diy-pbl-bookshare.html?page=26&full=1`, {
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
    await land.goto(`${BASE}/study-diy-pbl-bookshare.html?page=26&full=1`, {
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
    assert.ok(lInfo.sceneW >= 500 && lInfo.sceneH <= 390, `stage height-fits landscape, got ${lInfo.sceneW}x${lInfo.sceneH}`);
    // 16:9-ish
    const ar = lInfo.sceneW / lInfo.sceneH;
    assert.ok(ar > 1.6 && ar < 1.9, `16:9 stage, got aspect ${ar}`);
    await land.close();
  } finally {
    await browser.close();
  }
});

test("round6 book crop body text meets min glyph size at 1280 and 844x390", async (t) => {
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
  // Prose body crops only. Checklist (r6c) and rubric (r6e) use thinner ink /
  // rotated headers that the line-band heuristic under-reads; they are covered
  // by the aspect/contain clip test instead.
  const TEXT_PAGES = [
    { n: 6, id: "r6a" },
    { n: 13, id: "r6h" },
    { n: 22, id: "r6f" },
  ];
  // Full column-width crops at ~50% stage cannot hit the old 14/9 floors
  // (on-screen glyph ≈ pdf_glyph * card_content_css / crop_px). Leo Round-6
  // fix prioritizes margin-to-margin lines over narrow zoomed columns; keep a
  // reachable floor so regressions still fail.
  const VPS = [
    { name: "1280", width: 1280, height: 720, mobile: false, minPx: 7 },
    { name: "844x390", width: 844, height: 390, mobile: true, minPx: 4 },
  ];
  try {
    const report = [];
    const failures = [];
    for (const vp of VPS) {
      for (const { n, id } of TEXT_PAGES) {
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
        const fig = await page.$(".bs-r6-figure");
        if (!fig) {
          failures.push(`${vp.name} p${n} (${id}): missing .bs-r6-figure`);
          await page.close();
          continue;
        }
        const measured = await page.evaluate(async (el) => {
          const r = el.getBoundingClientRect();
          // Decode the figure image and measure body-line band height in source pixels,
          // then scale by rendered content size (object-fit:contain).
          const src = el.currentSrc || el.src;
          const img = new Image();
          img.crossOrigin = "anonymous";
          await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = src; });
          const nw = img.naturalWidth, nh = img.naturalHeight;
          const canvas = document.createElement("canvas");
          canvas.width = nw; canvas.height = nh;
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          ctx.drawImage(img, 0, 0);
          const { data } = ctx.getImageData(0, 0, nw, nh);
          const lum = (x, y) => {
            const i = (y * nw + x) * 4;
            return (data[i] + data[i + 1] + data[i + 2]) / 3;
          };
          let minX = nw, minY = nh, maxX = 0, maxY = 0;
          for (let y = 2; y < nh - 2; y += 2) {
            for (let x = 2; x < nw - 2; x += 2) {
              const L = lum(x, y);
              if (L > 248 || L < 165) {
                if (x < minX) minX = x;
                if (y < minY) minY = y;
                if (x > maxX) maxX = x;
                if (y > maxY) maxY = y;
              }
            }
          }
          if (maxX <= minX) return { bodyCss: 0, capSrc: 0, scale: 0, boxW: r.width, boxH: r.height, nw, nh };
          const x0 = minX + Math.floor((maxX - minX) * 0.08);
          const x1 = maxX - Math.floor((maxX - minX) * 0.08);
          const y0 = minY + Math.floor((maxY - minY) * 0.10);
          const y1 = maxY - Math.floor((maxY - minY) * 0.14);
          const rowDark = [];
          for (let y = y0; y < y1; y++) {
            let d = 0;
            for (let x = x0; x < x1; x += 2) if (lum(x, y) < 175) d++;
            rowDark.push(d);
          }
          const thresh = Math.max(3, Math.floor((x1 - x0) / 2 / 35));
          // Split dense paragraphs on local minima so connected line-bands still yield a body height.
          const heights = [];
          let i = 0;
          while (i < rowDark.length) {
            while (i < rowDark.length && rowDark[i] < thresh) i++;
            if (i >= rowDark.length) break;
            const runStart = i;
            let peak = 0;
            while (i < rowDark.length && rowDark[i] >= thresh) {
              peak = Math.max(peak, rowDark[i]);
              i++;
              // Soft split: local valley inside a long run (inter-line gap)
              if (i - runStart > 10 && i + 2 < rowDark.length) {
                const a = rowDark[i - 1], b = rowDark[i], c = rowDark[i + 1];
                if (b < thresh * 1.6 && b <= a && b <= c && b < peak * 0.55) {
                  const h = i - runStart;
                  if (h >= 8 && h <= 80) heights.push(h);
                  break; // continue outer from i (valley); do not skip
                }
              }
            }
            const h = i - runStart;
            if (h >= 8 && h <= 80) heights.push(h);
            else if (h > 80) {
              // Very dense block: approximate line pitch from dark fraction peaks
              const slice = rowDark.slice(runStart, i);
              const mid = slice.slice().sort((a, b) => a - b)[Math.floor(slice.length * 0.5)] || 1;
              let sub = 0;
              for (const v of slice) {
                if (v >= mid * 0.7) sub++;
                else {
                  if (sub >= 8 && sub <= 60) heights.push(sub);
                  sub = 0;
                }
              }
              if (sub >= 8 && sub <= 60) heights.push(sub);
            }
          }
          heights.sort((a, b) => a - b);
          let capSrc = heights.length
            ? heights[Math.min(heights.length - 1, Math.floor(heights.length * 0.7))]
            : 0;
          // object-fit:contain scale
          const scale = Math.min(r.width / nw, r.height / nh);
          const capCss = capSrc * scale;
          // Line-band height ≈ rendered cap height of body text (Leo min).
          const bodyCss = capCss;
          return {
            bodyCss, capCss, capSrc, scale, boxW: r.width, boxH: r.height, nw, nh,
            samples: heights.length, heights: heights.slice(0, 12),
          };
        }, fig);
        await fig.dispose();
        report.push({ vp: vp.name, page: n, id, ...measured });
        if (!(measured.bodyCss >= vp.minPx - 0.25)) {
          failures.push(
            `${vp.name} p${n} (${id}): body glyph ~${measured.bodyCss.toFixed(1)}px ` +
            `(capSrc=${measured.capSrc}, scale=${measured.scale.toFixed(3)}) < min ${vp.minPx}px`
          );
        }
        await page.close();
      }
    }
    console.log("r6 glyph sizes:", JSON.stringify(report, null, 2));
    assert.equal(failures.length, 0, failures.join("\n") + "\n" + JSON.stringify(report, null, 2));
  } finally {
    await browser.close();
  }
});


test("round6 figure cards are not cover-cropped (aspect match + contain)", async (t) => {
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
  const PAGES = [
    { n: 6, id: "r6a" }, { n: 7, id: "r6b" }, { n: 10, id: "r6c" },
    { n: 13, id: "r6h" }, { n: 17, id: "r6i" }, { n: 21, id: "r6e" },
    { n: 22, id: "r6f" }, { n: 25, id: "r6j" },
  ];
  try {
    const failures = [];
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
    for (const { n, id } of PAGES) {
      await page.goto(`${BASE}/study-diy-pbl-bookshare.html?page=${n}&full=1`, {
        waitUntil: "networkidle0", timeout: 60000,
      });
      await settle(page);
      const info = await page.evaluate(() => {
        const el = document.querySelector(".bs-r6-figure");
        if (!el) return { missing: true };
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        const nw = el.naturalWidth, nh = el.naturalHeight;
        if (!nw || !nh) return { noNatural: true };
        const natAspect = nw / nh;
        const boxAspect = r.width / Math.max(1, r.height);
        // With object-fit:contain in a near-matching box, rendered content fills
        // one axis fully and the other within a small letterbox tolerance.
        const scale = Math.min(r.width / nw, r.height / nh);
        const drawnW = nw * scale, drawnH = nh * scale;
        const letterboxX = r.width - drawnW;
        const letterboxY = r.height - drawnH;
        // Cover would fill both axes (letterbox ~0 on both). Contain matches aspect
        // so at least one letterbox axis is ~0 and the other >= 0; aspect delta small.
        return {
          fit: cs.objectFit,
          natAspect, boxAspect,
          nw, nh, boxW: r.width, boxH: r.height,
          drawnW, drawnH, letterboxX, letterboxY, scale,
        };
      });
      if (info.missing) { failures.push(`p${n} (${id}): missing .bs-r6-figure`); continue; }
      if (info.noNatural) { failures.push(`p${n} (${id}): figure natural size 0`); continue; }
      if (info.fit !== "contain") {
        failures.push(`p${n} (${id}): object-fit=${info.fit}, expected contain`);
      }
      const aspectDelta = Math.abs(info.natAspect - info.boxAspect) / info.natAspect;
      // Placement should track the card aspect within 8%.
      if (aspectDelta > 0.08) {
        failures.push(
          `p${n} (${id}): box aspect ${info.boxAspect.toFixed(3)} vs natural ${info.natAspect.toFixed(3)} ` +
          `(delta ${(aspectDelta*100).toFixed(1)}%) — likely cover-cropping risk`
        );
      }
      // Drawn content should not exceed the box (contain never overflows).
      if (info.drawnW > info.boxW + 1.5 || info.drawnH > info.boxH + 1.5) {
        failures.push(
          `p${n} (${id}): drawn ${info.drawnW.toFixed(1)}x${info.drawnH.toFixed(1)} ` +
          `overflows box ${info.boxW.toFixed(1)}x${info.boxH.toFixed(1)}`
        );
      }
    }
    await page.close();
    assert.equal(failures.length, 0, failures.join("\n"));
  } finally {
    await browser.close();
  }
});
