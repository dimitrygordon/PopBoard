// Round 7: pencil draw-in uses Leo line/bg (no hallway flash); decor after settle;
// r6i fronds are foreground but never overlap figure text.
import { test } from "node:test";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, mkdirSync, writeFileSync } from "node:fs";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PUB = join(ROOT, "public");
const CHROME = process.env.CHROME_PATH || "/usr/bin/google-chrome";
const PUPPETEER = process.env.PUPPETEER_PATH ||
  join(ROOT, "tests/node_modules_local/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js");
const R6_PAGES = [6, 7, 10, 13, 17, 19, 21, 22, 25];
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".webp": "image/webp",
  ".png": "image/png",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".md": "text/markdown; charset=utf-8",
};

function startStatic() {
  const server = createServer((req, res) => {
    let url = decodeURIComponent((req.url || "/").split("?")[0]);
    if (url === "/study-diy-pbl-bookshare") url = "/study-diy-pbl-bookshare.html";
    const file = join(PUB, url.replace(/^\//, ""));
    if (!file.startsWith(PUB) || !existsSync(file) || !statSync(file).isFile()) {
      res.writeHead(404, { "content-type": "text/plain" });
      res.end("missing");
      return;
    }
    res.writeHead(200, { "content-type": MIME[extname(file)] || "application/octet-stream", "cache-control": "no-store" });
    res.end(readFileSync(file));
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolve({ server, base: `http://127.0.0.1:${port}` });
    });
  });
}

test("r6: draw-in may run, then settles to Leo bg with no vanishing hallway leftover", async (t) => {
  let puppeteer;
  try { puppeteer = (await import(pathToFileURL(PUPPETEER).href)).default; }
  catch (e) { t.skip("puppeteer-core not available: " + e.message); return; }
  const { server, base } = await startStatic();
  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: CHROME, headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--autoplay-policy=no-user-gesture-required"],
    });
  } catch (e) { server.close(); t.skip("Chrome launch failed: " + e.message); return; }
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
    await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);
    await page.goto(`${base}/study-diy-pbl-bookshare.html?page=1&full=1`, { waitUntil: "networkidle0", timeout: 60000 });
    await page.waitForFunction(() => window.__bs && document.querySelector(".bs-scene"), { timeout: 20000 });

    for (const n of R6_PAGES) {
      await page.evaluate((n) => {
        window.__bs.render(n - 1);
        return window.__bs.runDrawIn?.(document.querySelector(".bs-scene"));
      }, n);
      // Sample during draw-in and after settle
      const samples = [];
      const t0 = Date.now();
      for (const tms of [0, 300, 900, 1500, 2500, 3200]) {
        const wait = t0 + tms - Date.now();
        if (wait > 0) await new Promise((r) => setTimeout(r, wait));
        samples.push(await page.evaluate(() => {
          const root = document.querySelector(".bs-scene");
          const canvas = root?.querySelector("canvas.bs-drawin");
          const bg = root?.querySelector(".bs-bg");
          const decor = [...root.querySelectorAll(".bs-decor")];
          return {
            art: root?.dataset.art,
            drawing: !!root?.classList.contains("is-drawing"),
            drawn: !!root?.classList.contains("is-drawn"),
            hasCanvas: !!canvas,
            bgVis: bg ? getComputedStyle(bg).visibility : null,
            decorCount: decor.length,
            decorOpacity: decor.map((el) => getComputedStyle(el).opacity),
          };
        }));
      }
      const last = samples.at(-1);
      assert.equal(last.drawn, true, `p${n} should be drawn by 3.2s`);
      assert.equal(last.hasCanvas, false, `p${n} draw-in canvas must be gone after settle`);
      assert.equal(last.bgVis, "visible", `p${n} bg visible after settle`);
      assert.ok(last.decorCount >= 1, `p${n} should mount Leo sprites`);
      // After settle, decor should be visible (opacity 1)
      assert.ok(last.decorOpacity.every((o) => Number(o) > 0.9), `p${n} decor visible after settle: ${last.decorOpacity}`);
      // During early frames canvas may exist; that's the intentional pencil draw-in of Leo's line.webp
      // Regression: we no longer skip draw-in (drawIn:false removed)
    }
  } finally {
    await browser.close().catch(() => {});
    server.close();
  }
});

test("r6i fronds stay at edges and clear of figure text at both sway extremes", async (t) => {
  let puppeteer;
  try { puppeteer = (await import(pathToFileURL(PUPPETEER).href)).default; }
  catch (e) { t.skip("puppeteer-core not available: " + e.message); return; }
  const { server, base } = await startStatic();
  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: CHROME, headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  } catch (e) { server.close(); t.skip("Chrome launch failed: " + e.message); return; }
  try {
    const page = await browser.newPage();
    await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
    for (const viewport of [{ width: 1280, height: 720 }, { width: 844, height: 390 }]) {
      await page.setViewport(viewport);
      await page.goto(`${base}/study-diy-pbl-bookshare.html?page=17&full=1`, { waitUntil: "networkidle0", timeout: 60000 });
      await page.waitForFunction(() => window.__bs, { timeout: 20000 });
      await page.evaluate(async () => {
        window.__bs.render(16);
        await window.__bs.runDrawIn?.(document.querySelector(".bs-scene"));
        await Promise.all([...document.querySelectorAll(".bs-scene img")].map((img) => img.decode()));
      });
      await new Promise((r) => setTimeout(r, 400));
      for (const extreme of [-1, 1]) {
        const info = await page.evaluate((extreme) => {
          const root = document.querySelector(".bs-scene");
          const fig = root.querySelector(".bs-r6-figure");
          const fronds = ["leaves_left", "leaves_right"].map((name) =>
            [...root.querySelectorAll(".bs-decor")].find((el) => el.src.includes(name)));
          const stage = root.getBoundingClientRect();
          const fr = fig?.getBoundingClientRect();
          // placeFigureCard renders ONE image, not DOM caption/cite elements.
          // These conservative source-pixel regions include the baked-in text in
          // art/r6i/figure.webp (1558x1626), including padding around each line.
          const textRegions = {
            caption: [20, 135, 610, 205],
            signature: [1218, 1405, 1358, 1438],
            cite: [70, 1530, 300, 1585],
          };
          const scale = fig ? Math.min(fr.width / fig.naturalWidth, fr.height / fig.naturalHeight) : 0;
          const imageLeft = fr ? fr.left + (fr.width - fig.naturalWidth * scale) / 2 : 0;
          const imageTop = fr ? fr.top + (fr.height - fig.naturalHeight * scale) / 2 : 0;
          const protectedRects = Object.entries(textRegions).map(([name, [x0, y0, x1, y1]]) => ({
            name, left: imageLeft + x0 * scale, top: imageTop + y0 * scale,
            right: imageLeft + x1 * scale, bottom: imageTop + y1 * scale,
          }));
          // Test the live text, not the empty lower portion of the idea panel.
          const ideaElements = [...root.querySelectorAll(".bs-idea-title, .bs-idea-bullets, .bs-idea-cite")];
          const ideaRects = ideaElements.flatMap((el) => {
            const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
            const rects = [];
            while (walker.nextNode()) {
              if (!walker.currentNode.textContent.trim()) continue;
              const range = document.createRange();
              range.selectNodeContents(walker.currentNode);
              rects.push(...range.getClientRects());
            }
            return rects;
          });
          const overlap = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
          return {
            stage: stage.toJSON(),
            protectedRects,
            ideaRects: ideaRects.map((r) => r.toJSON()),
            hasFig: !!fig,
            imageSize: fig ? [fig.naturalWidth, fig.naturalHeight] : [],
            figZ: fig ? Number(getComputedStyle(fig).zIndex) : null,
            ideaCount: ideaElements.length,
            fronds: fronds.map((el, index) => {
              if (!el) return { missing: true };
              el.getAnimations().forEach((a) => a.cancel());
              const d = el._bsDecor;
              const angle = (d.motion.start ?? d.rot ?? 0) + extreme * Math.abs(d.motion.amp);
              el.style.transform = `rotate(${angle}deg)`;
              const rect = el.getBoundingClientRect();
              return {
                rect: rect.toJSON(),
                z: Number(getComputedStyle(el).zIndex),
                overlaps: protectedRects.filter((r) => overlap(rect, r)).map((r) => r.name),
                overIdea: ideaRects.some((r) => overlap(rect, r)),
                nearEdge: index === 0 ? rect.left <= stage.left + 8 : rect.right >= stage.right - 8,
              };
            }),
          };
        }, extreme);
        const context = `${viewport.width}x${viewport.height}, sway ${extreme}: ${JSON.stringify(info)}`;
        assert.ok(info.hasFig, context);
        assert.deepEqual(info.imageSize, [1558, 1626], "update baked text regions if figure changes");
        assert.ok(info.figZ >= 10, "figure z10: " + context);
        assert.equal(info.ideaCount, 3, "idea text must exist: " + context);
        for (const frond of info.fronds) {
          assert.ok(!frond.missing, context);
          assert.equal(frond.z, 20, "fronds z20: " + context);
          assert.deepEqual(frond.overlaps, [], "frond must clear signature, caption and Fig 3.4 cite: " + context);
          assert.equal(frond.overIdea, false, "frond must not overlap idea text: " + context);
          assert.ok(frond.nearEdge, "frond at slide edge: " + context);
        }
      }
    }
  } finally {
    await browser.close().catch(() => {});
    server.close();
  }
});

test("decor reduced-motion: static start pose, no running animations", async (t) => {
  let puppeteer;
  try { puppeteer = (await import(pathToFileURL(PUPPETEER).href)).default; }
  catch (e) { t.skip("puppeteer-core not available: " + e.message); return; }
  const { server, base } = await startStatic();
  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: CHROME, headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  } catch (e) { server.close(); t.skip("Chrome launch failed: " + e.message); return; }
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
    await page.goto(`${base}/study-diy-pbl-bookshare.html?page=6&full=1`, { waitUntil: "networkidle0", timeout: 60000 });
    await page.waitForFunction(() => window.__bs, { timeout: 20000 });
    await page.evaluate(async () => {
      window.__bs.render(5);
      await window.__bs.runDrawIn?.(document.querySelector(".bs-scene"));
    });
    await new Promise((r) => setTimeout(r, 500));
    const info = await page.evaluate(() => {
      const els = [...document.querySelectorAll(".bs-decor")];
      return els.map((el) => ({
        src: (el.getAttribute("src") || "").split("/").pop(),
        anims: el.getAnimations?.().filter((a) => a.playState === "running").length || 0,
        opacity: getComputedStyle(el).opacity,
      }));
    });
    assert.ok(info.length >= 1, "pinwheel mounted");
    assert.ok(info.every((i) => i.anims === 0), JSON.stringify(info));
    assert.ok(info.every((i) => Number(i.opacity) > 0.9), JSON.stringify(info));
  } finally {
    await browser.close().catch(() => {});
    server.close();
  }
});
