// Geometry course: the plan, the generated catalog and decks, every figure, and all 44 interactives in a browser.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createServer } from "node:http";
import { join, dirname, extname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PUB = join(ROOT, "public");
const imp = (p) => import(pathToFileURL(join(ROOT, p)).href);

test("generated files are current (node tools/geometry/build.mjs --check)", () => {
  execFileSync(process.execPath, [join(ROOT, "tools/geometry/build.mjs"), "--check"], { stdio: "pipe" });
});

test("catalog: 180 lessons in 12 units, 44 interactives, covers and decks exist", async () => {
  const { DECKS, UNITS } = await imp("public/geometry/geo-catalog.js");
  assert.equal(DECKS.length, 180);
  assert.equal(UNITS.length, 12);
  assert.deepEqual([...new Set(DECKS.map((d) => d.q))], [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  const gx = DECKS.filter((d) => d.gx).map((d) => d.gx);
  assert.equal(gx.length, 44);
  assert.equal(new Set(gx).size, 44);
  for (const d of DECKS) {
    assert.ok(existsSync(join(PUB, "geometry", d.cover)), d.cover);
    const deck = JSON.parse(readFileSync(join(PUB, "geometry/decks", d.slug, "deck.json"), "utf8"));
    assert.equal(deck.slides.length, d.slides, d.slug);
    assert.ok(deck.slides.every((s) => s.geo && s.title), d.slug);
  }
});

test("every interactive and every figure a deck names exists", async () => {
  const { DECKS } = await imp("public/geometry/geo-catalog.js");
  const { FIGS } = await imp("public/geometry/geo-figures.js");
  for (const d of DECKS) {
    if (d.gx) { const [f, n] = d.gx.split("."); const m = await imp(`public/geometry/gx/${f}.js`); assert.ok(m.GX[n] && typeof m.GX[n].mount === "function", d.gx); }
    const deck = JSON.parse(readFileSync(join(PUB, "geometry/decks", d.slug, "deck.json"), "utf8"));
    for (const s of deck.slides) if (s.geo.fig) assert.ok(FIGS[s.geo.fig], `${d.slug} ${s.geo.fig}`);
  }
});

test("course is registered as text only with a page renderer", async () => {
  const { COURSES } = await imp("public/astro-course/ac-courses.js");
  const g = COURSES.geometry;
  assert.equal(g.narration, false);
  assert.equal(g.library, "study-geometry.html");
  for (const f of ["study-geometry.html", "study-geometry-story.html"]) assert.match(readFileSync(join(PUB, f), "utf8"), /data-course="geometry"/);
});

test("no em or en dashes and no Jasper mascot art in any Geometry file", () => {
  const files = [];
  const walk = (d) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else files.push(p); } };
  walk(join(PUB, "geometry")); walk(join(ROOT, "tools/geometry")); walk(join(ROOT, "docs/geometry"));
  files.push(join(PUB, "study-geometry.html"), join(PUB, "study-geometry-story.html"));
  for (const f of files) {
    const s = readFileSync(f, "utf8");
    assert.ok(!/[\u2013\u2014]/.test(s), `dash in ${f}`);
    // "Jasper HS" is the school in the plan's hooks; the mascot never appears
    assert.ok(!/jasper[\s_-]*(wildcat|mascot|cat)|jasper_/i.test(s), `Jasper mascot in ${f}`);
  }
});

// ---- browser: open every interactive, check it draws, drag a point, and check for errors ----
const CHROME = process.env.CHROME || "/usr/bin/google-chrome";
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp", ".woff2": "font/woff2" };
test("all 44 interactives mount, draw and respond to a drag", { skip: !existsSync(CHROME) && "no Chrome", timeout: 240000 }, async () => {
  const { default: puppeteer } = await import("puppeteer-core");
  const srv = createServer((req, res) => {
    const p = join(PUB, decodeURIComponent(req.url.split("?")[0]));
    if (!p.startsWith(PUB) || !existsSync(p) || statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { "content-type": TYPES[extname(p)] || "application/octet-stream" }); res.end(readFileSync(p));
  });
  await new Promise((r) => srv.listen(0, r));
  const base = `http://localhost:${srv.address().port}`;
  const { DECKS } = await imp("public/geometry/geo-catalog.js");
  const b = await puppeteer.launch({ executablePath: CHROME, args: ["--no-sandbox"] });
  try {
    const page = await b.newPage();
    const errs = [];
    page.on("pageerror", (e) => errs.push(e.message));
    page.on("console", (m) => { if (/gx draw|geometry interactive|page mount/.test(m.text())) errs.push(m.text()); });
    await page.setViewport({ width: 1280, height: 800 });
    for (const d of DECKS.filter((x) => x.gx)) {
      const deck = JSON.parse(readFileSync(join(PUB, "geometry/decks", d.slug, "deck.json"), "utf8"));
      const n = deck.slides.findIndex((s) => s.geo.kind === "gx") + 1;
      await page.goto(`${base}/study-geometry-story.html?lesson=${d.slug}&page=${n}`, { waitUntil: "networkidle0" });
      await page.waitForSelector(".gx-board-host svg.gx-board", { timeout: 5000 });
      await page.waitForFunction(() => document.querySelector(".gx-board-host svg g").children.length > 0);
      const before = await page.evaluate(() => document.querySelector(".gx-board-host svg g").innerHTML.length);
      assert.ok(before > 50, `${d.gx} draws`);
      assert.ok(await page.$(".gx-tool"), `${d.gx} panel`);
      // constructions: show every step; sandboxes: drag the first point
      const showAll = await page.$$eval(".gx-tool button", (bs) => { const b = bs.find((x) => x.textContent === "Show all"); if (b) b.click(); return !!b; });
      const h = await page.$(".gx-pt.gx-drag:not([style*='none'])");
      const pressed = !h && !showAll && await page.$$eval(".gx-tool button, .gx-tool input", (bs) => { bs.slice(0, 4).forEach((x) => { if (x.type === "range") { x.value = x.max; x.dispatchEvent(new Event("input", { bubbles: true })); } else x.click(); }); return bs.length > 0; });
      if (h) {
        const box = await h.boundingBox();
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down();
        await page.mouse.move(box.x + box.width / 2 + 25, box.y + box.height / 2 + 15, { steps: 4 }); await page.mouse.up();
      }
      await new Promise((r) => setTimeout(r, 80));
      const after = await page.evaluate(() => document.querySelector(".gx-board-host svg g").innerHTML);
      assert.ok(!/NaN|undefined/.test(after), `${d.gx} has NaN or undefined in its drawing`);
      assert.ok(showAll || h || pressed, `${d.gx} is interactive`);
      assert.deepEqual(errs, [], `${d.gx}: ${errs.join("; ")}`);
    }
  } finally { await b.close(); srv.close(); }
});
