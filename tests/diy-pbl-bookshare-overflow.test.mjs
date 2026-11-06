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
      await page.evaluate(async () => { try { await document.fonts.ready; } catch {} });
      // Snapshot label geometry, then hide labels and sample pixels under each box.
      const meta = await page.evaluate(() => {
        const scene = document.querySelector(".bs-scene");
        const sr = scene.getBoundingClientRect();
        return [...document.querySelectorAll(".s09-genre")].map((el) => {
          const br = el.getBoundingClientRect();
          const rot = Number(el.dataset.rot || 0);
          return {
            label: el.dataset.label || el.textContent.trim().replace(/\s+/g, " "),
            // scene-local CSS px rect (unrotated AABB of the element)
            x: br.left - sr.left,
            y: br.top - sr.top,
            w: br.width,
            h: br.height,
            // center + size in scene CSS px for rotated sampling
            cx: (br.left + br.right) / 2 - sr.left,
            cy: (br.top + br.bottom) / 2 - sr.top,
            rot,
            artFs: parseFloat(el.dataset.artFs || "0"),
            fs: parseFloat(getComputedStyle(el).fontSize),
            clip: el.scrollWidth > el.clientWidth + 2 || el.scrollHeight > el.clientHeight + 2,
          };
        });
      });
      await page.evaluate(() => {
        document.querySelectorAll(".s09-genre").forEach((el) => { el.style.visibility = "hidden"; });
      });
      await new Promise((r) => setTimeout(r, 80));
      const sceneHandle = await page.$(".bs-scene");
      const shot = await sceneHandle.screenshot({ encoding: "binary" });
      await sceneHandle.dispose();
      // Decode PNG via sharp-less path: use page.evaluate with ImageData from canvas
      // Re-load screenshot into page for sampling
      const b64 = Buffer.from(shot).toString("base64");
      const pixelReport = await page.evaluate(async (b64, meta) => {
        const img = new Image();
        await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = "data:image/png;base64," + b64; });
        const canvas = document.createElement("canvas");
        canvas.width = img.width; canvas.height = img.height;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(img, 0, 0);
        const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const scene = document.querySelector(".bs-scene");
        const sw = scene.clientWidth, sh = scene.clientHeight;
        const sx = width / sw, sy = height / sh;
        function sample(cssX, cssY) {
          const px = Math.min(width - 1, Math.max(0, Math.round(cssX * sx)));
          const py = Math.min(height - 1, Math.max(0, Math.round(cssY * sy)));
          const i = (py * width + px) * 4;
          return { r: data[i], g: data[i + 1], b: data[i + 2] };
        }
        function isCream(p) {
          const lum = (p.r + p.g + p.b) / 3;
          const chroma = Math.max(Math.abs(p.r - p.g), Math.abs(p.g - p.b), Math.abs(p.r - p.b));
          return lum >= 185 && chroma <= 48;
        }
        function isInk(p) {
          return (p.r + p.g + p.b) / 3 < 120;
        }
        function isHeaderChroma(p) {
          const lum = (p.r + p.g + p.b) / 3;
          const chroma = Math.max(Math.abs(p.r - p.g), Math.abs(p.g - p.b), Math.abs(p.r - p.b));
          return chroma > 40 && lum > 130 && lum < 235;
        }
        /** Page cream is also light; require the sample be enclosed by ink (card outline). */
        function enclosed(cssX, cssY) {
          // Scale with scene: a front card can be ~250 CSS px across at 1920.
          const maxd = Math.max(220, Math.round(Math.min(sw, sh) * 0.35));
          let hits = 0;
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            for (let d = 3; d < maxd; d += 3) {
              const p = sample(cssX + dx * d, cssY + dy * d);
              if (isInk(p)) { hits++; break; }
            }
          }
          return hits >= 3;
        }
        const out = [];
        for (const m of meta) {
          const rad = (m.rot * Math.PI) / 180;
          const cos = Math.cos(rad), sin = Math.sin(rad);
          // 10% inset of the label box
          const hw = m.w * 0.40, hh = m.h * 0.40;
          let ok = 0, bad = 0, ink = 0, header = 0, open = 0;
          for (let iy = 0; iy < 10; iy++) {
            for (let ix = 0; ix < 10; ix++) {
              const lx = -hw + (2 * hw) * (ix / 9);
              const ly = -hh + (2 * hh) * (iy / 9);
              const cssX = m.cx + lx * cos - ly * sin;
              const cssY = m.cy + lx * sin + ly * cos;
              const p = sample(cssX, cssY);
              if (isInk(p)) { ink++; bad++; }
              else if (isHeaderChroma(p)) { header++; bad++; }
              else if (!isCream(p)) { bad++; }
              else if (!enclosed(cssX, cssY)) { open++; bad++; }
              else ok++;
            }
          }
          out.push({
            label: m.label,
            ok, bad, ink, header, open,
            artFs: m.artFs,
            fs: m.fs,
            clip: m.clip,
            creamFrac: ok / (ok + bad),
          });
        }
        return out;
      }, b64, meta);

      if (pixelReport.length !== 4) {
        failures.push(`${vp.name}: expected 4 labels, got ${pixelReport.length}`);
      }
      const arts = pixelReport.map((r) => r.artFs).filter((n) => n > 0);
      const minArt = arts.length ? Math.min(...arts) : 0;
      const maxArt = arts.length ? Math.max(...arts) : 0;
      const minCream = vp.height < 500 ? 0.62 : 0.85;
      for (const r of pixelReport) {
        // Allow a couple of border samples; require mostly cream body.
        if (r.creamFrac < minCream) {
          failures.push(`${vp.name}: "${r.label}" only ${(r.creamFrac * 100).toFixed(0)}% card-body under label (ink=${r.ink} header=${r.header} open=${r.open} bad=${r.bad})`);
        }
        if (r.ink > 3) {
          failures.push(`${vp.name}: "${r.label}" hits outline ink (${r.ink} samples)`);
        }
        if (r.clip) failures.push(`${vp.name}: "${r.label}" clips its box`);
        // ~14px rendered at 1280 (scale~0.59) => artFs>=14; keep floor 14 design.
        if (r.artFs && r.artFs < 14) {
          failures.push(`${vp.name}: "${r.label}" too small artFs=${r.artFs.toFixed(1)}`);
        }
      }
      // Labels should be similar sizes (Lab not tiny vs others).
      if (arts.length === 4 && maxArt > minArt * 2.2) {
        failures.push(`${vp.name}: label sizes diverge artFs ${minArt.toFixed(1)}..${maxArt.toFixed(1)}`);
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
