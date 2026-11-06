// Full-view text must never clip or scroll on any of the 21 slides.
// Requires Chrome + a local static server serving public/ (DIY_PBL_URL).
import { test } from "node:test";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

const BASE = process.env.DIY_PBL_URL || "http://127.0.0.1:8792";
const CHROME = process.env.CHROME_PATH || "/usr/bin/google-chrome";
const PUPPETEER = process.env.PUPPETEER_PATH ||
  "/workspace/PopBoard/tests/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js";

const VIEWPORTS = [
  { name: "1280x720", width: 1280, height: 720 },
  { name: "1920x1080", width: 1920, height: 1080 },
  { name: "1366x768", width: 1366, height: 768 },
];

const TEXT_SELS = [
  ".bs-discuss",
  ".bs-resources-panel",
  ".bs-takeaways",
  ".bs-idea-panel",
  ".bs-surface--titleblock",
  ".bs-kt-grid",
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
  await new Promise((r) => setTimeout(r, 250));
}

test("full view: every stage text container fits with no scroll at 1280/1920/1366", async (t) => {
  let puppeteer;
  try {
    puppeteer = (await import(pathToFileURL(PUPPETEER).href)).default;
  } catch (e) {
    t.skip("puppeteer-core not available: " + e.message);
    return;
  }
  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: CHROME,
      args: ["--no-sandbox", "--disk-cache-size=1"],
      headless: "new",
    });
  } catch (e) {
    t.skip("Chrome launch failed: " + e.message);
    return;
  }
  try {
    // Probe server
    const probe = await browser.newPage();
    try {
      await probe.goto(`${BASE}/study-diy-pbl-bookshare.html?page=1&full=1`, {
        waitUntil: "domcontentloaded",
        timeout: 8000,
      });
    } catch (e) {
      t.skip(`server not reachable at ${BASE}: ${e.message}`);
      return;
    }
    await probe.close();

    const failures = [];
    for (const vp of VIEWPORTS) {
      const page = await browser.newPage();
      await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 1 });
      await page.setCacheEnabled(false);
      for (let n = 1; n <= 21; n++) {
        await page.goto(`${BASE}/study-diy-pbl-bookshare.html?page=${n}&full=1`, {
          waitUntil: "networkidle0",
          timeout: 60000,
        });
        await settle(page);
        const rows = await page.evaluate((sels) => {
          const out = [];
          for (const sel of sels) {
            for (const el of document.querySelectorAll(sel)) {
              if (!el.closest(".fl-art, .bs-scene, .fl-scene")) continue;
              const cs = getComputedStyle(el);
              const oy = cs.overflowY;
              const ox = cs.overflowX;
              const sh = el.scrollHeight;
              const ch = el.clientHeight;
              const sw = el.scrollWidth;
              const cw = el.clientWidth;
              out.push({
                sel: (el.className && el.className.toString()) || sel,
                oy,
                ox,
                sh,
                ch,
                sw,
                cw,
                badOverflow: /auto|scroll/i.test(oy) || /auto|scroll/i.test(ox),
                clipY: sh > ch + 1,
                clipX: sw > cw + 1,
              });
            }
          }
          // Content presence for paper slides
          const qCount = document.querySelectorAll(".bs-dq-card").length;
          const refCount = document.querySelectorAll(".bs-apa li").length;
          const kind = document.body.dataset.kind || "";
          return { out, qCount, refCount, kind };
        }, TEXT_SELS);

        if (rows.kind === "discuss") {
          assert.ok(rows.qCount >= 3, `s${n} discuss should show all questions`);
        }
        if (n === 20) {
          assert.equal(rows.refCount, 8, "s20 must render all 8 APA references");
        }
        for (const r of rows.out) {
          if (r.badOverflow || r.clipY || r.clipX) {
            failures.push({ vp: vp.name, page: n, ...r });
          }
        }
      }
      await page.close();
    }
    assert.deepEqual(
      failures,
      [],
      "clipped or scrollable stage text:\n" + failures.map((f) => JSON.stringify(f)).join("\n")
    );
  } finally {
    await browser.close();
  }
});
